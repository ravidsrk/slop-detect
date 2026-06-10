// POST /api/scan  { url, preset?, axes? }  →  { score, tier, patterns, axes?, ... }
//
// Runs the design-slop detector against a URL inside Cloudflare's Browser
// Rendering Chromium. Requires a BROWSER binding on the Pages project. Opt into
// the copy-slop axis with { axes: ['design','copy'] } (or 'all').

import puppeteer from '@cloudflare/puppeteer';
import {
  PATTERNS,
  createColorHelpers,
  createVisibilityHelpers,
  isSlopFont,
  isAccentSerif,
  SLOP_FONT_PREFIXES,
  ACCENT_SERIF_PREFIXES,
  scorePatterns,
  applyPreset,
  isPreset,
  extractTextContext,
  extractSystemContext,
  parseDesignMd,
  scoreSystemCompliance,
  scoreCopy,
  combineAxes
} from 'slop-detect-core';
import { newId, slimResult, saveResult, validateScanUrl, isAllowedUrl, recordScanForWatch } from '../_shared.js';
import { report } from '../_report.js';

// Normalize requested axes. Default: design only (backward-compatible).
const VALID_AXES = ['design', 'copy'];
function normalizeAxes(axes) {
  if (axes === 'all') return [...VALID_AXES];
  if (!Array.isArray(axes) || axes.length === 0) return ['design'];
  const out = axes.filter(a => VALID_AXES.includes(a));
  if (!out.includes('design')) out.unshift('design');
  return [...new Set(out)];
}

// CORS + Turnstile + rate-limit are handled by functions/api/_middleware.js.
// This handler just returns JSON; the middleware merges Access-Control-* headers.
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.BROWSER) {
    return json({ error: 'BROWSER binding missing — check wrangler.toml' }, 500);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }

  // Validate + SSRF-guard the target (blocks private/loopback/metadata hosts).
  const checked = validateScanUrl(body?.url);
  if (checked.error) return json({ error: checked.error }, checked.status);
  const url = checked.url;

  // System axis (DESIGN.md compliance) — opt in via { designMd: true } (looks
  // for <origin>/DESIGN.md next to the scanned page) or { designMd: "<url>" }.
  const wantsSystem = body.designMd === true || typeof body.designMd === 'string';
  if (typeof body.designMd === 'string') {
    const dv = validateScanUrl(body.designMd);
    if (dv.error) return json({ error: `designMd: ${dv.error}` }, dv.status || 400);
  }

  // Build the page-side IIFE that runs all detectors in one round-trip.
  const pageScript = buildPageScript({ includeSystem: wantsSystem });

  let browser;
  try {
    browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 SlopDetector/1.0 (+slop-detector.pages.dev)');

    const navStart = Date.now();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    // Soft wait for fonts/CSS/above-fold images. Don't fail if it stays busy.
    await Promise.race([
      page.waitForNetworkIdle({ idleTime: 500, timeout: 6000 }).catch(() => {}),
      new Promise(r => setTimeout(r, 7000))
    ]);
    await new Promise(r => setTimeout(r, 400));
    const navMs = Date.now() - navStart;

    const data = await page.evaluate(pageScript);

    // SSRF: the navigation may have followed redirects to a different host. The
    // pre-flight guard only saw the originally-requested URL — so re-validate the
    // FINAL url before we hand back its title/h1/text/screenshot. Refuse to
    // return content scraped from a private/internal host reached via redirect.
    if (data.url && !isAllowedUrl(data.url)) {
      return json({
        error: 'Scan refused: the URL redirected to a disallowed (private/internal) host.',
        code: 'blocked_redirect',
        url,
        finalUrl: data.url
      }, 400);
    }

    // Anti-bot challenge / dead-page detection — refuse to score these so we
    // don't silently return a fake "Clean 0".
    const blocked = detectBlocked(data, { url, finalUrl: data.url });
    if (blocked) {
      return json({
        error: blocked.reason,
        code: blocked.code,
        url,
        finalUrl: data.url,
        title: data.title,
        hint: blocked.hint
      }, 422);
    }

    let screenshot = null;
    if (body.screenshot) {
      try {
        const buf = await page.screenshot({ type: 'jpeg', quality: 70, fullPage: false });
        screenshot = `data:image/jpeg;base64,${Buffer.from(buf).toString('base64')}`;
      } catch (_) {}
    }

    // Score on the Worker side (patterns metadata lives here, not on the page).
    const patterns = PATTERNS.map(p => {
      const sig = data.signals[p.id] || { triggered: false };
      return {
        id: p.id,
        label: p.label,
        short: p.short,
        category: p.category,
        weight: p.weight,
        triggered: !!sig.triggered,
        evidence: sig
      };
    });

    // Optional scoring preset (full|strict|marketing|minimal). All patterns are
    // always extracted (one page eval); the preset only narrows what's scored
    // and reported, so the number matches the caller's intent.
    const preset = isPreset(body?.preset) ? body.preset : 'full';
    const scored = applyPreset(patterns, preset);
    const scoring = scorePatterns(scored);

    const result = {
      url,
      finalUrl: data.url,
      title: data.title,
      h1: data.h1Text,
      h1Font: data.h1Font,
      preset,
      ...scoring,        // top-level = DESIGN axis (backward-compatible)
      patterns: scored,
      screenshot,
      navMs
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
          patterns: scored
        },
        copy: scoreCopy(data.textContext || {})
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
      const mdUrl = typeof body.designMd === 'string'
        ? body.designMd
        : new URL('/DESIGN.md', data.url || url).toString();
      let mdText = null;
      if (isAllowedUrl(mdUrl)) {
        try {
          const ctl = new AbortController();
          const t = setTimeout(() => ctl.abort(), 8000);
          const res = await fetch(mdUrl, {
            signal: ctl.signal,
            headers: { Accept: 'text/markdown,text/plain,*/*' }
          });
          clearTimeout(t);
          if (res.ok) mdText = (await res.text()).slice(0, 200_000);
        } catch (_) { /* unreachable DESIGN.md → reported as "no system" below */ }
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
        // If this domain is being monitored, append the point to its history and
        // recompute regression. Best-effort: monitoring must never break a scan.
        const monitoring = await recordScanForWatch(env.RESULTS, slim);
        if (monitoring) result.monitoring = monitoring;
      } catch (e) {
        // Sharing/monitoring is best-effort; never fail a scan over it — but do
        // surface the KV error so a silent storage outage is visible.
        report(env, 'warn', 'persist_failed', { message: e && e.message ? e.message : String(e) });
      }
    }

    return json(result);
  } catch (err) {
    // Surface scan failures instead of swallowing them (no PII: url only).
    report(env, 'error', 'scan_failed', { url, message: err && err.message ? err.message : String(err) });
    return json({ error: err.message || String(err) }, 502);
  } finally {
    try { await browser?.close(); } catch (_) {}
  }
}

// ── Anti-bot / dead-page heuristics ─────────────────────────────────────────
function detectBlocked(data, _ctx) {
  const title = (data?.title || '').trim();
  const h1 = (data?.h1Text || '').trim();
  const visibleCount = data?.visibleCount || 0;
  const signals = data?.signals || {};
  // Count how many patterns returned ANY non-empty evidence — proxy
  // for "did the page actually render meaningful DOM?".
  const patternsWithEvidence = Object.values(signals).filter(s => {
    if (!s || typeof s !== 'object') return false;
    const keys = Object.keys(s).filter(k => k !== 'triggered' && k !== 'error');
    return keys.length > 0;
  }).length;

  // Cloudflare's interstitial keeps an empty <title> long enough that we
  // sometimes capture it, but more commonly the title is "Just a moment...".
  const cfMarkers = [
    'Just a moment...',
    'Attention Required! | Cloudflare',
    'Please Wait... | Cloudflare',
    'Access denied | Cloudflare',
    'Sorry, you have been blocked'
  ];
  if (cfMarkers.some(m => title.includes(m))) {
    return {
      code: 'cloudflare_challenge',
      reason: 'Site is behind a Cloudflare bot challenge — cannot score automatically.',
      hint: 'Try a different URL, or use the `slop-detect` CLI locally with a real browser session.'
    };
  }

  // Other anti-bot vendors
  if (/access denied|forbidden|akamai/i.test(title) && visibleCount < 20) {
    return {
      code: 'access_blocked',
      reason: `Site refused the scan (title: "${title.slice(0, 80)}")`,
      hint: 'The target is blocking automated requests. Try the CLI from your machine.'
    };
  }

  // Empty / dead page (no title, no h1, no visible content) — usually means
  // the page never finished rendering inside the headless runtime, OR the site
  // is gating content behind a JS auth wall. ChatGPT/Cursor/etc do this.
  const noContent = !title && !h1;
  const sparseDom = visibleCount < 10 || patternsWithEvidence < 4;
  if (noContent || sparseDom) {
    return {
      code: 'empty_page',
      reason: 'Target page rendered no scannable content (no title, no H1, or empty DOM).',
      hint: 'The site likely requires sign-in, uses heavy client-side hydration, or blocks headless browsers. Try a public marketing URL instead.'
    };
  }

  return null;
}

// ── Page-side script assembler ──────────────────────────────────────────────
function buildPageScript(opts = {}) {
  const patternCalls = PATTERNS.map(p => `
    try {
      signals[${JSON.stringify(p.id)}] = (${p.extract.toString()})(ctx);
    } catch (e) {
      signals[${JSON.stringify(p.id)}] = { triggered: false, error: e.message };
    }`).join('\n');

  return `(() => {
    // Polyfill esbuild's __name helper (wrangler bundles named fns wrapped with it).
    const __name = (fn) => fn;
    ${createColorHelpers.toString()}
    ${createVisibilityHelpers.toString()}
    ${isSlopFont.toString()}
    ${isAccentSerif.toString()}
    const SLOP_FONT_PREFIXES = ${JSON.stringify(SLOP_FONT_PREFIXES)};
    const ACCENT_SERIF_PREFIXES = ${JSON.stringify(ACCENT_SERIF_PREFIXES)};

    const colorHelpers = createColorHelpers();
    const visHelpers = createVisibilityHelpers();
    const visible = visHelpers.getVisible(document.body, 4000);

    let h1 = null;
    for (const el of document.querySelectorAll('h1')) {
      if (visHelpers.isVisible(el)) { h1 = el; break; }
    }

    const ctx = {
      visible, h1,
      parseColor: colorHelpers.parseColor,
      rgbToHsl: colorHelpers.rgbToHsl,
      isPurple: colorHelpers.isPurple,
      isDark: colorHelpers.isDark,
      isMidGrey: colorHelpers.isMidGrey,
      relativeLuminance: colorHelpers.relativeLuminance,
      contrastRatio: colorHelpers.contrastRatio,
      channelSpread: colorHelpers.channelSpread,
      effectiveBackground: colorHelpers.effectiveBackground,
      isSlopFont, isAccentSerif,
      SLOP_FONT_PREFIXES, ACCENT_SERIF_PREFIXES,
      // inHero is consumed by the declarative rules engine for heroOnly specs.
      // isVisible / inViewport / isNeutral were never consumed by any pattern,
      // so they are omitted (the visible array is already pre-filtered).
      inHero: visHelpers.inHero
    };

    const signals = {};
    ${patternCalls}

    // Copy axis: extract page text in-DOM (scored Worker-side by scoreCopy).
    const extractTextContext = ${extractTextContext.toString()};
    let textContext = null;
    try { textContext = extractTextContext(); } catch (e) { textContext = { error: e.message }; }

    // System axis: observe fonts/colors/radii (scored Worker-side).
    let systemContext = null;
    ${opts.includeSystem ? `
    const extractSystemContext = ${extractSystemContext.toString()};
    try { systemContext = extractSystemContext(); } catch (e) { systemContext = { error: e.message }; }
    ` : ''}

    return {
      title: document.title,
      url: location.href,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      docHeight: document.documentElement.scrollHeight,
      h1Text: h1 ? h1.textContent.trim().slice(0, 120) : null,
      h1Font: h1 ? getComputedStyle(h1).fontFamily : null,
      visibleCount: visible.length,
      signals,
      textContext,
      systemContext
    };
  })();`;
}
