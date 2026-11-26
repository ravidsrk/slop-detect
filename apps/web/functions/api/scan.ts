// POST /api/scan  { url, preset?, axes? }  →  { score, tier, patterns, axes?, ... }
//
// Runs the design-slop detector against a URL inside Cloudflare's Browser
// Rendering Chromium. Requires a BROWSER binding on the Pages project. Opt into
// the copy-slop axis with { axes: ['design','copy'] } (or 'all').

import { acquireBrowser, releaseBrowser } from '../_browser.js';
import {
  buildPageScript,
  detectBlocked,
  assemblePatternResults,
  scorePatterns,
  applyPreset,
  isPreset,
  presetCoverage,
  parseDesignMd,
  generateDesignMd,
  scoreSystemCompliance,
  scoreCopy,
  scoreCraft,
  measureMobileReflowOnPage,
  combineAxes,
  applyDeclaredDesignWaivers,
  evaluateDefaultKits,
  evaluateExperimentalWatchlist,
  applyConfigAndInlineWaivers,
  SCAN_PAGE_WAIT,
  waitFontsReadyInPage,
  readCapped,
  DEFINITIONS_VERSION,
  SCANNER_USER_AGENT,
  stampScanResult,
} from '@slop-detect/core';
import {
  newId,
  slimResult,
  saveResult,
  recordScan,
  validateScanUrl,
  isAllowedUrl,
  isSameSiteRedirect,
  fetchAllowedUrl,
  recordScanForWatch,
  domainOf,
  bumpOpsStats,
  bumpFlowStats,
} from '../_shared.js';
import { report } from '../_report.js';
import { requestIdFor } from '../_request-id.js';

// Flow classifier (T-35, exported pure for tests): every deferOps patch maps
// to exactly one funnel event. Blocked (bot-wall/dead, incl. 422s) is its own
// event because it's a targeting/deliverability signal, not a failure.
export function scanFlowEvent(patch) {
  if (patch && patch.blocked) return 'blocked';
  return patch && patch.status === 200 ? 'completed' : 'failed';
}

// Normalize requested axes. Default: design only (backward-compatible).
const VALID_AXES = ['design', 'copy', 'craft'];
function normalizeAxes(axes) {
  if (axes === 'all') return [...VALID_AXES];
  if (!Array.isArray(axes) || axes.length === 0) return ['design'];
  const out = axes.filter((a) => VALID_AXES.includes(a));
  if (!out.includes('design')) out.unshift('design');
  return [...new Set(out)];
}

// CORS + Turnstile + rate-limit are handled by functions/api/_middleware.js.
// This handler just returns JSON; the middleware merges Access-Control-* headers.
function json(data, status = 200) {
  return new Response(JSON.stringify(stampScanResult(data)), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestPost({ request, env, waitUntil }) {
  // Traceability (G-04): prefer the middleware-forwarded ID so the error body,
  // the report() log line, and the X-Request-Id response header all agree.
  // requestIdFor re-derives deterministically when the middleware is absent
  // (tests, other runtimes) — cf-ray, echoed x-request-id, else fresh UUID.
  const requestId = request.headers?.get?.('x-request-id') || requestIdFor(request);
  // Declared early: deferOps reads it, and the BROWSER-missing bump below runs
  // before the body parse (TDZ would swallow that bump into the catch).
  let body;
  // Ops metrics (G-05), single-writer: scan.ts owns EVERY scan-route bump
  // (status + detail in one read-modify-write per request); the middleware
  // skips scan pass-throughs so the two never race on the daily blob.
  // share:false skips even anonymous bumps (privacy promise: no KV writes).
  const deferOps = (patch) => {
    if (body && body.share === false) return;
    try {
      const p = bumpOpsStats(env.RESULTS, 'scan', patch);
      // Flow event rides the same call (T-35): completed / blocked / failed
      // derived from the patch, so every exit above is classified exactly
      // once. share:false skips this too (privacy promise: no KV writes).
      const f = bumpFlowStats(env.RESULTS, 'scan', scanFlowEvent(patch));
      const all = Promise.all([p, f]);
      if (typeof waitUntil === 'function') waitUntil(all);
      else void Promise.resolve(all).catch(() => {});
    } catch {
      /* metrics must never break the request */
    }
  };
  if (!env.BROWSER) {
    // Honor share:false here too: this branch runs before the body parse, so
    // check the flag inline (safe to consume: we return immediately after).
    // Matters: fix-prompt{url} mode reuses this handler with share:false.
    let shareFalse = false;
    try {
      const peek = await request.json();
      shareFalse = peek && peek.share === false;
    } catch {
      shareFalse = false;
    }
    if (!shareFalse) deferOps({ status: 500 });
    return json({ error: 'BROWSER binding missing — check wrangler.toml', requestId }, 500);
  }

  try {
    body = await request.json();
  } catch {
    deferOps({ status: 400 });
    return json({ error: 'Invalid JSON body', requestId }, 400);
  }

  // Validate + SSRF-guard the target (blocks private/loopback/metadata hosts).
  const checked = validateScanUrl(body?.url);
  if (checked.error) {
    deferOps({ status: checked.status });
    return json({ error: checked.error, requestId }, checked.status);
  }
  const url = checked.url;
  const requestedHost = new URL(url).hostname.toLowerCase();

  // System axis (DESIGN.md compliance) — opt in via { designMd: true | "auto" }
  // (looks for <origin>/DESIGN.md next to the scanned page) or { designMd: "<url>" }.
  const rawDesignMd = body.designMd === 'auto' ? true : body.designMd;
  const wantsSystem = rawDesignMd === true || typeof rawDesignMd === 'string';
  let validatedDesignMdUrl: string | null = null;
  if (typeof rawDesignMd === 'string') {
    const dv = validateScanUrl(rawDesignMd);
    if (dv.error) {
      deferOps({ status: dv.status || 400 });
      return json({ error: `designMd: ${dv.error}`, requestId }, dv.status || 400);
    }
    validatedDesignMdUrl = dv.url;
  }

  // Short-lived result cache: launch traffic repeats the same URLs (everyone
  // scans linear.app), and each uncached scan costs a full browser session.
  // 10 minutes keeps scores fresh while collapsing bursts. Bypassed by
  // share:false (privacy: no KV reads serve a no-write caller stale shared
  // state), screenshots, the system axis, and explicit { refresh:true }
  // (the monitoring sweep sends it so daily re-scans are always live).
  const presetForCache = isPreset(body?.preset) ? body.preset : 'full';
  const cacheKey =
    env.RESULTS && body.share !== false && !body.screenshot && !wantsSystem && body.refresh !== true
      ? `scancache:v1:${DEFINITIONS_VERSION}:${url}|${presetForCache}|${normalizeAxes(body?.axes).join(',')}`
      : null;
  if (cacheKey) {
    try {
      const raw = await env.RESULTS.get(cacheKey);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached && typeof cached.score === 'number') {
          if (cached.id) cached.resultUrl = `${new URL(request.url).origin}/r/${cached.id}`;
          deferOps({ status: 200, tier: cached.tier });
          return json({ ...cached, cached: true });
        }
      }
    } catch {
      /* a cache hiccup must never break a scan */
    }
  }

  // Build the page-side IIFE that runs all detectors in one round-trip.
  const pageScript = buildPageScript({
    includeSystem: wantsSystem,
    includeExperimental: Boolean(body?.experimental),
  });

  let browser;
  let page;
  let navMs;
  let patternsErrored = 0;
  const scanStart = Date.now();
  try {
    ({ browser } = await acquireBrowser(env.BROWSER));
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(SCANNER_USER_AGENT);

    // SSRF defense-in-depth at the network layer: block private/loopback/metadata
    // subresources and redirects BEFORE Chromium fetches them, and reject
    // cross-site top-level navigations (including <meta refresh> / location.href).
    if (typeof page.setRequestInterception === 'function' && typeof page.on === 'function') {
      try {
        await page.setRequestInterception(true);
        page.on('request', (req: any) => {
          try {
            const reqUrl = typeof req.url === 'function' ? req.url() : '';
            if (
              !reqUrl ||
              reqUrl.startsWith('data:') ||
              reqUrl.startsWith('blob:') ||
              reqUrl === 'about:blank'
            ) {
              req.continue();
              return;
            }
            if (!isAllowedUrl(reqUrl)) {
              req.abort('blockedbyclient');
              return;
            }
            const isTopNav =
              typeof req.isNavigationRequest === 'function' &&
              req.isNavigationRequest() &&
              typeof req.frame === 'function' &&
              req.frame() === page.mainFrame?.();
            if (isTopNav && !isSameSiteRedirect(requestedHost, reqUrl)) {
              req.abort('blockedbyclient');
              return;
            }
            req.continue();
          } catch {
            try {
              req.abort('failed');
            } catch {
              /* ignore */
            }
          }
        });
      } catch {
        /* mock pages or runtimes without interception still hit boundary checks below */
      }
    }

    const validateDestination = (destUrl: string) => {
      let destHost = '';
      try {
        destHost = new URL(destUrl).hostname.toLowerCase();
      } catch {
        deferOps({ status: 400 });
        return json(
          {
            error: 'Scan refused: navigation ended on an invalid URL.',
            code: 'blocked_redirect',
            url,
            finalUrl: destUrl,
            requestId,
          },
          400
        );
      }
      if (!isAllowedUrl(destUrl)) {
        deferOps({ status: 400 });
        return json(
          {
            error: 'Scan refused: the URL redirected to a disallowed (private/internal) host.',
            code: 'blocked_redirect',
            url,
            finalUrl: destUrl,
            requestId,
          },
          400
        );
      }
      if (!isSameSiteRedirect(requestedHost, destHost)) {
        deferOps({ status: 400 });
        return json(
          {
            error: `Scan refused: the URL redirected to a different site (${destHost}). Scan that address directly.`,
            code: 'blocked_redirect',
            url,
            finalUrl: destUrl,
            requestId,
          },
          400
        );
      }
      return null;
    };

    const navStart = Date.now();
    const navResponse = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    const navUrl = navResponse?.url() ?? url;
    const initialRefusal = validateDestination(navUrl);
    if (initialRefusal) return initialRefusal;

    // Soft wait for CSS/above-fold images — shared budget with the CLI runner.
    await Promise.race([
      page
        .waitForNetworkIdle({
          idleTime: SCAN_PAGE_WAIT.networkIdleMs,
          timeout: SCAN_PAGE_WAIT.networkIdleTimeoutMs,
        })
        .catch(() => {}),
      new Promise((r) => setTimeout(r, SCAN_PAGE_WAIT.totalWaitCapMs)),
    ]);
    await new Promise((r) => setTimeout(r, SCAN_PAGE_WAIT.postNetworkSettleMs));
    // Re-check the real Chromium frame URL AFTER settling so client-side
    // navigations (<meta refresh>, location.href) cannot escape to private or
    // cross-site origins before page.evaluate() or page.screenshot() run.
    // Browser SOP prevents history.pushState from ever changing origin/host.
    const settledUrl =
      typeof page.url === 'function' && page.url() && page.url() !== 'about:blank'
        ? page.url()
        : navUrl;
    const finalNavUrl = settledUrl || navUrl;
    const settledRefusal = validateDestination(finalNavUrl);
    if (settledRefusal) return settledRefusal;

    // REL-3: wait for web fonts before scoring (mirrors og/[id].ts).
    await page.evaluate(waitFontsReadyInPage, SCAN_PAGE_WAIT.fontsReadyTimeoutMs);
    navMs = Date.now() - navStart;

    const browserVersion = await browser.version();
    const data = await page.evaluate(pageScript);

    // Anti-bot challenge / dead-page detection — refuse to score these so we
    // don't silently return a fake "Clean 0".
    const blocked = detectBlocked(data, { url, finalUrl: finalNavUrl });
    if (blocked) {
      deferOps({ status: 422, blocked: blocked.code });
      return json(
        {
          error: blocked.reason,
          code: blocked.code,
          url,
          finalUrl: finalNavUrl,
          title: data.title,
          hint: blocked.hint,
          requestId,
        },
        422
      );
    }

    if (normalizeAxes(body?.axes).includes('craft') && data.craftSignals) {
      data.craftSignals.mobile_reflow_failure = await measureMobileReflowOnPage(page);
    }

    let screenshot = null;
    if (body.screenshot) {
      try {
        const buf = await page.screenshot({ type: 'jpeg', quality: 70, fullPage: false });
        screenshot = `data:image/jpeg;base64,${Buffer.from(buf).toString('base64')}`;
      } catch (_) {}
    }

    // Score on the Worker side (patterns metadata lives here, not on the page).
    const assembled = assemblePatternResults(data.signals);
    const { patterns } = assembled;
    patternsErrored = assembled.patternsErrored;
    if (patternsErrored > 0) {
      report(env, 'warn', 'pattern_errors', { url, navMs, patternsErrored, requestId }, waitUntil);
    }

    // Optional scoring preset (full|strict|marketing|minimal). All patterns are
    // always extracted (one page eval); the preset only narrows what's scored
    // and reported, so the number matches the caller's intent.
    const preset = isPreset(body?.preset) ? body.preset : 'full';
    const scored = applyPreset(patterns, preset);
    const scoring = scorePatterns(scored);
    const kitMatches = evaluateDefaultKits(data.signals || {}, { preset });

    const result: any = {
      url,
      finalUrl: finalNavUrl,
      title: data.title,
      h1: data.h1Text,
      h1Font: data.h1Font,
      preset,
      calibration: 'uncalibrated-beta',
      ...scoring, // top-level = DESIGN axis (backward-compatible)
      patterns: scored,
      patternsErrored,
      browserVersion,
      madeWith: data.madeWith ?? null,
      kitMatch: kitMatches[0] || null,
      kitMatches,
      environment: browserVersion ? { chromium: browserVersion } : undefined,
      screenshot,
      navMs,
    };

    if (body?.experimental) {
      result.experimental = evaluateExperimentalWatchlist(
        data.experimentalSignals || {},
        data.textContext || {}
      );
    }

    // Multi-axis: opt into copy and craft via { axes:['design','copy','craft'] } or 'all'.
    // Craft is reported beside the design score and never feeds Clean/Mild/Heavy.
    const reqAxes = normalizeAxes(body?.axes);
    if (reqAxes.includes('copy') || reqAxes.includes('craft')) {
      const axes: Record<string, any> = {
        design: {
          axis: 'design',
          score: scoring.score,
          tier: scoring.tier,
          grade: scoring.grade,
          patternsFlagged: scoring.patternsFlagged,
          patternsTotal: scoring.patternsTotal,
          patterns: scored,
        },
      };
      if (reqAxes.includes('copy')) axes.copy = scoreCopy(data.textContext || {});
      if (reqAxes.includes('craft') && data.craftSignals) {
        axes.craft = scoreCraft(data.craftSignals);
        result.craft = axes.craft;
      }
      result.axes = axes;
      const summaries: Record<string, any> = {};
      for (const a of reqAxes) {
        if (a === 'craft') continue;
        if (axes[a]) summaries[a] = axes[a];
      }
      Object.assign(result, combineAxes(summaries));
    }

    // System axis: fetch the DESIGN.md (explicit URL or <origin>/DESIGN.md next
    // to the final page), SSRF-guarded + size-capped, and score drift against
    // what the page actually rendered. Reported separately from the slop score
    // (it measures alignment with the site's OWN system; higher is better).
    if (wantsSystem) {
      const mdUrl = validatedDesignMdUrl || new URL('/DESIGN.md', finalNavUrl).toString();
      let mdText = null;
      if (isAllowedUrl(mdUrl)) {
        const res = await fetchAllowedUrl(
          mdUrl,
          { headers: { Accept: 'text/markdown,text/plain,*/*' } },
          { timeoutMs: 8000 }
        );
        if (res?.ok) mdText = await readCapped(res, 200_000);
      }
      const parsedMd = mdText ? parseDesignMd(mdText) : null;
      result.system = scoreSystemCompliance(parsedMd, data.systemContext);
      result.system.source = mdText ? mdUrl : null;
      if (parsedMd) Object.assign(result, applyDeclaredDesignWaivers(result, parsedMd));
      // The observed tokens, as the CLI returns them: MCP extract_design_system
      // turns them into a starter DESIGN.md / tokens.json (#361). Not persisted:
      // slimResult() keeps only the scored fields.
      if (data.systemContext) {
        result.systemContext = data.systemContext;
        if (!parsedMd) {
          let host = 'Site';
          try {
            host = new URL(finalNavUrl).hostname.replace(/^www\./, '');
          } catch {}
          result.starterDesignMd = generateDesignMd(data.systemContext, {
            name: result.title || host,
            url: finalNavUrl,
          });
        }
      }
    }

    // A non-full preset filters design patterns only. fullScore is that
    // unfiltered design score. Copy, craft, AEO, and system are not rescored.
    if (preset !== 'full') {
      result.fullScore = scorePatterns(patterns).score;
      const coverageAxes = [...reqAxes];
      if (wantsSystem) coverageAxes.push('system');
      const coverage = presetCoverage(preset, coverageAxes);
      if (coverage.warning) {
        result.presetWarning = coverage.warning;
        result.presetNotApplied = coverage.notApplied;
      }
    }

    if (
      Array.isArray(data.inlineWaivers) &&
      data.inlineWaivers.length > 0 &&
      !body?.noInlineIgnores
    ) {
      Object.assign(
        result,
        applyConfigAndInlineWaivers(result, {
          inlineWaivers: data.inlineWaivers,
          noInlineIgnores: false,
        })
      );
    }

    // Persist a slim snapshot so the scan gets a shareable permalink (/r/:id),
    // a cached OG card (/og/:id.png), and feeds the per-domain badge.
    // Skip persistence when the caller opts out (e.g. CI dry-runs).
    if (env.RESULTS && body.share !== false) {
      try {
        const id = newId();
        const slim = slimResult(result, id);
        await saveResult(env.RESULTS, slim);
        result.id = id;
        result.resultUrl = `${new URL(request.url).origin}/r/${id}`;
        // Record every scan into the per-domain timeline + global score stats
        // (not just monitored domains) so /score/<domain> can chart history and
        // rank against peers. Best-effort: persistence must never break a scan.
        await recordScan(env.RESULTS, slim);
        // If this domain is being monitored, refresh baseline/regression on top.
        // A same-site redirect (example.com → app.example.com) records the
        // result under the FINAL host, but the watch lives under the REQUESTED
        // domain (the sweep scans `https://<watch.domain>`), so update that
        // watch too — finalUrl stays untouched in the result and slim.
        const requestedDomain = domainOf(url);
        let monitoring = null;
        if (requestedDomain && requestedDomain !== slim.domain) {
          monitoring = await recordScanForWatch(env.RESULTS, {
            ...slim,
            domain: requestedDomain,
          });
        }
        const finalMonitoring = await recordScanForWatch(env.RESULTS, slim);
        monitoring = monitoring || finalMonitoring;
        if (monitoring) result.monitoring = monitoring;
      } catch (e) {
        // Sharing/monitoring is best-effort; never fail a scan over it — but do
        // surface the KV error so a silent storage outage is visible.
        report(
          env,
          'warn',
          'persist_failed',
          {
            url,
            navMs,
            patternsErrored,
            message: e && e.message ? e.message : String(e),
            requestId,
          },
          waitUntil
        );
      }
    }

    stampScanResult(result);
    if (cacheKey) {
      try {
        await env.RESULTS.put(cacheKey, JSON.stringify(result), { expirationTtl: 600 });
      } catch {
        /* cache write is best-effort */
      }
    }
    deferOps({ status: 200, tier: result.tier, navMs });
    return json(result);
  } catch (err) {
    // Surface scan failures instead of swallowing them (no PII: url only).
    report(
      env,
      'error',
      'scan_failed',
      {
        url,
        message: err && err.message ? err.message : String(err),
        navMs: navMs ?? Date.now() - scanStart,
        patternsErrored,
        requestId,
      },
      waitUntil
    );
    // Null-safe: binding-level failures can reject with no error value, and
    // reading .message off that threw a TypeError out of the handler (live:
    // bare Cloudflare edge 502 instead of this JSON contract). Non-null
    // rejections without .message (strings, plain objects) keep their
    // stringified detail; only null/undefined fall back to generic.
    const message =
      err && err.message ? err.message : err == null ? 'Scan failed (browser error)' : String(err);
    // Browser-capacity failures are transient overload, not a bad scan: say
    // so with a retryable 503 instead of leaking a raw binding error as 502.
    if (/session|browser.*(limit|capacity|busy)|too many|429|concurrent/i.test(message)) {
      deferOps({ status: 503 });
      return json(
        {
          error: 'The scanner is at capacity right now. Please retry in a minute.',
          code: 'scanner_busy',
          retryAfter: 60,
          requestId,
        },
        503
      );
    }
    deferOps({ status: 502 });
    return json({ error: message, requestId }, 502);
  } finally {
    // Close the tab before releasing the session: releaseBrowser disconnects
    // (keeps the session warm for reuse), so an unclosed page would leak into
    // the next scan that reuses this session.
    try {
      await page?.close?.();
    } catch {
      /* already gone */
    }
    await releaseBrowser(browser);
  }
}
