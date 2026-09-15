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
  parseDesignMd,
  scoreSystemCompliance,
  scoreCopy,
  combineAxes,
  SCAN_PAGE_WAIT,
  waitFontsReadyInPage,
  readCapped,
} from '@slop-detect/core';
import {
  newId,
  slimResult,
  saveResult,
  recordScan,
  validateScanUrl,
  isAllowedUrl,
  fetchAllowedUrl,
  recordScanForWatch,
  bumpOpsStats,
} from '../_shared.js';
import { report } from '../_report.js';
import { requestIdFor } from '../_request-id.js';

// Normalize requested axes. Default: design only (backward-compatible).
const VALID_AXES = ['design', 'copy'];
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
  return new Response(JSON.stringify(data), {
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
      if (typeof waitUntil === 'function') waitUntil(p);
      else void Promise.resolve(p).catch(() => {});
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

  // System axis (DESIGN.md compliance) — opt in via { designMd: true } (looks
  // for <origin>/DESIGN.md next to the scanned page) or { designMd: "<url>" }.
  const wantsSystem = body.designMd === true || typeof body.designMd === 'string';
  if (typeof body.designMd === 'string') {
    const dv = validateScanUrl(body.designMd);
    if (dv.error) {
      deferOps({ status: dv.status || 400 });
      return json({ error: `designMd: ${dv.error}`, requestId }, dv.status || 400);
    }
  }

  // Build the page-side IIFE that runs all detectors in one round-trip.
  const pageScript = buildPageScript({ includeSystem: wantsSystem });

  let browser;
  let navMs;
  let patternsErrored = 0;
  const scanStart = Date.now();
  try {
    ({ browser } = await acquireBrowser(env.BROWSER));
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 SlopDetector/1.0 (+slop-detector.pages.dev)');

    const navStart = Date.now();
    const navResponse = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    const finalNavUrl = navResponse?.url() ?? url;
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
    // REL-3: wait for web fonts before scoring (mirrors og/[id].ts).
    await page.evaluate(waitFontsReadyInPage, SCAN_PAGE_WAIT.fontsReadyTimeoutMs);
    navMs = Date.now() - navStart;

    const browserVersion = await browser.version();
    const data = await page.evaluate(pageScript);

    // SSRF (defense-in-depth): re-validate on the navigation response URL, not
    // page-reported location.href (spoofable via history.pushState). DNS-rebind
    // cannot be fully closed inside Workers — that leg relies on Cloudflare
    // Browser Rendering egress blocking RFC-1918/metadata; this closes the
    // code/boundary part only.
    let finalNavHost = '';
    try {
      finalNavHost = new URL(finalNavUrl).hostname.toLowerCase();
    } catch {
      deferOps({ status: 400 });
      return json(
        {
          error: 'Scan refused: navigation ended on an invalid URL.',
          code: 'blocked_redirect',
          url,
          finalUrl: finalNavUrl,
          requestId,
        },
        400
      );
    }
    if (!isAllowedUrl(finalNavUrl) || finalNavHost !== requestedHost) {
      deferOps({ status: 400 });
      return json(
        {
          error: 'Scan refused: the URL redirected to a disallowed (private/internal) host.',
          code: 'blocked_redirect',
          url,
          finalUrl: finalNavUrl,
          requestId,
        },
        400
      );
    }

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

    const result: any = {
      url,
      finalUrl: finalNavUrl,
      title: data.title,
      h1: data.h1Text,
      h1Font: data.h1Font,
      preset,
      ...scoring, // top-level = DESIGN axis (backward-compatible)
      patterns: scored,
      patternsErrored,
      browserVersion,
      screenshot,
      navMs,
    };

    // Multi-axis (#08): opt into copy via { axes:['design','copy'] } or 'all'.
    const reqAxes = normalizeAxes(body?.axes);
    if (reqAxes.includes('copy')) {
      const axes = {
        design: {
          axis: 'design',
          score: scoring.score,
          tier: scoring.tier,
          grade: scoring.grade,
          patternsFlagged: scoring.patternsFlagged,
          patternsTotal: scoring.patternsTotal,
          patterns: scored,
        },
        copy: scoreCopy(data.textContext || {}),
      };
      result.axes = axes;
      const summaries = {};
      for (const a of reqAxes) if (axes[a]) summaries[a] = axes[a];
      Object.assign(result, combineAxes(summaries));
    }

    // System axis: fetch the DESIGN.md (explicit URL or <origin>/DESIGN.md next
    // to the final page), SSRF-guarded + size-capped, and score drift against
    // what the page actually rendered. Reported separately from the slop score
    // (it measures alignment with the site's OWN system; higher is better).
    if (wantsSystem) {
      const mdUrl =
        typeof body.designMd === 'string'
          ? body.designMd
          : new URL('/DESIGN.md', finalNavUrl).toString();
      let mdText = null;
      if (isAllowedUrl(mdUrl)) {
        const res = await fetchAllowedUrl(
          mdUrl,
          { headers: { Accept: 'text/markdown,text/plain,*/*' } },
          { timeoutMs: 8000 }
        );
        if (res?.ok) mdText = await readCapped(res, 200_000);
      }
      result.system = scoreSystemCompliance(
        mdText ? parseDesignMd(mdText) : null,
        data.systemContext
      );
      result.system.source = mdText ? mdUrl : null;
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
        const monitoring = await recordScanForWatch(env.RESULTS, slim);
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
    deferOps({ status: 502 });
    return json({ error: message, requestId }, 502);
  } finally {
    await releaseBrowser(browser);
  }
}
