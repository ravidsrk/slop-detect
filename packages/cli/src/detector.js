// Detector orchestrator. Serializes lib helpers + pattern extract functions
// into a single page-side IIFE, runs once via page.evaluate(), aggregates
// results, computes a 0-100 score.

import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
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
  extractTextContext,
  scoreCopy,
  combineAxes
} from 'slop-detect-core';

// Lazy-install Chromium on first run. We skip the eager `postinstall` so that
// `npm i -g slop-detect` (or `npx`) doesn't burn ~150 MB on every CI cache miss.
// Set SKIP_PLAYWRIGHT_DOWNLOAD=1 to short-circuit (useful if you've already
// installed Chromium via your system playwright, or you're bringing your own).
let chromiumReady = false;
async function ensureChromium() {
  if (chromiumReady) return;
  if (process.env.SKIP_PLAYWRIGHT_DOWNLOAD) { chromiumReady = true; return; }
  // Try a cheap launch first. If the browser binary is missing, Playwright
  // throws a recognisable error — only then do we spawn the installer.
  try {
    const b = await chromium.launch({ headless: true });
    await b.close();
    chromiumReady = true;
    return;
  } catch (err) {
    const msg = String(err && err.message);
    if (!/Executable doesn't exist|browserType\.launch/i.test(msg)) {
      throw err;
    }
    process.stderr.write('slop-detect: first run — downloading Chromium (~150 MB, one-time)…\n');
    const r = spawnSync('npx', ['--yes', 'playwright', 'install', 'chromium'], {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });
    if (r.status !== 0) {
      throw new Error(
        'Failed to install Chromium. Run `npx playwright install chromium` manually, ' +
        'or set SKIP_PLAYWRIGHT_DOWNLOAD=1 if you have it installed elsewhere.'
      );
    }
    chromiumReady = true;
  }
}

// ── Anti-bot / dead-page heuristics (mirrored from packages/web/functions/api/scan.js) ──
function detectBlocked(data) {
  const title = (data?.title || '').trim();
  const h1 = (data?.h1Text || '').trim();
  const visibleCount = data?.visibleCount || 0;

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
      hint: 'Try a different URL, or run the CLI with a fresh non-headless browser session.'
    };
  }
  if (/access denied|forbidden|akamai/i.test(title) && visibleCount < 20) {
    return {
      code: 'access_blocked',
      reason: `Site refused the scan (title: "${title.slice(0, 80)}")`,
      hint: 'The target is blocking automated requests.'
    };
  }
  const signals = data?.signals || {};
  const patternsWithEvidence = Object.values(signals).filter(s => {
    if (!s || typeof s !== 'object') return false;
    const keys = Object.keys(s).filter(k => k !== 'triggered' && k !== 'error');
    return keys.length > 0;
  }).length;
  const noContent = !title && !h1;
  const sparseDom = visibleCount < 10 || patternsWithEvidence < 4;
  if (noContent || sparseDom) {
    return {
      code: 'empty_page',
      reason: 'Target page rendered no scannable content (no title, no H1, or empty DOM).',
      hint: 'The site likely requires sign-in, uses heavy client-side hydration, or blocks headless browsers.'
    };
  }
  return null;
}

// Normalize the requested axes into a deduped, valid list. Default: design only.
// Accepts an array (['design','copy']), 'all', or undefined.
function normalizeAxes(axes) {
  const VALID = ['design', 'copy'];
  if (axes === 'all') return [...VALID];
  if (!Array.isArray(axes) || axes.length === 0) return ['design'];
  const out = axes.filter(a => VALID.includes(a));
  if (!out.includes('design')) out.unshift('design'); // design always present
  return [...new Set(out)];
}

function buildPageScript() {
  const patternCalls = PATTERNS.map(p => `
    try {
      signals[${JSON.stringify(p.id)}] = (${p.extract.toString()})(ctx);
    } catch (e) {
      signals[${JSON.stringify(p.id)}] = { triggered: false, error: e.message };
    }`).join('\n');

  return `(() => {
    ${createColorHelpers.toString()}
    ${createVisibilityHelpers.toString()}
    ${isSlopFont.toString()}
    ${isAccentSerif.toString()}
    const SLOP_FONT_PREFIXES = ${JSON.stringify(SLOP_FONT_PREFIXES)};
    const ACCENT_SERIF_PREFIXES = ${JSON.stringify(ACCENT_SERIF_PREFIXES)};

    const colorHelpers = createColorHelpers();
    const visHelpers = createVisibilityHelpers();
    const visible = visHelpers.getVisible(document.body, 4000);

    // Find the dominant H1 — first visible H1 in document order.
    let h1 = null;
    for (const el of document.querySelectorAll('h1')) {
      if (visHelpers.isVisible(el)) { h1 = el; break; }
    }

    const ctx = {
      visible,
      h1,
      parseColor: colorHelpers.parseColor,
      rgbToHsl: colorHelpers.rgbToHsl,
      isPurple: colorHelpers.isPurple,
      isDark: colorHelpers.isDark,
      isMidGrey: colorHelpers.isMidGrey,
      isSlopFont,
      isAccentSerif,
      SLOP_FONT_PREFIXES,
      ACCENT_SERIF_PREFIXES,
      isVisible: visHelpers.isVisible,
      inHero: visHelpers.inHero,
      inViewport: visHelpers.inViewport
    };

    const signals = {};
    ${patternCalls}

    // Copy axis: extract page text in-DOM (scored Node-side by scoreCopy).
    const extractTextContext = ${extractTextContext.toString()};
    let textContext = null;
    try { textContext = extractTextContext(); } catch (e) { textContext = { error: e.message }; }

    return {
      title: document.title,
      url: location.href,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      docHeight: document.documentElement.scrollHeight,
      h1Text: h1 ? h1.textContent.trim().slice(0, 120) : null,
      h1Font: h1 ? getComputedStyle(h1).fontFamily : null,
      visibleCount: visible.length,
      signals,
      textContext
    };
  })();`;
}

export async function scanUrl(url, opts = {}) {
  await ensureChromium();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 SlopDetector/1.0 (+https://github.com/yourname/slop-detector)',
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  let result;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: opts.timeout || 30000 });
    // Give CSS / fonts / above-fold images a moment to settle
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);

    const data = await page.evaluate(buildPageScript());

    // Anti-bot / dead-page detection — don't silently return Clean 0.
    const blocked = detectBlocked(data);
    if (blocked) {
      result = {
        url,
        finalUrl: data.url,
        title: data.title,
        h1: data.h1Text,
        blocked: true,
        error: blocked.reason,
        code: blocked.code,
        hint: blocked.hint,
        score: null,
        tier: null,
        patternsFlagged: 0,
        patternsTotal: PATTERNS.length,
        patterns: []
      };
      return result;
    }

    // Build the structured result on the Node side.
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

    // Always extract every pattern (one cheap page eval), but score against the
    // selected preset's subset so the number — and the displayed pattern list —
    // reflect exactly what the caller asked for.
    const preset = opts.preset || 'full';
    const scored = applyPreset(patterns, preset);
    const scoring = scorePatterns(scored);

    // Which axes to compute. Default = design only (fully backward-compatible:
    // top-level score/grade/patterns stay exactly as before). Opt into copy via
    // opts.axes = ['design','copy'] or 'all'.
    const reqAxes = normalizeAxes(opts.axes);

    result = {
      url,
      finalUrl: data.url,
      title: data.title,
      h1: data.h1Text,
      h1Font: data.h1Font,
      preset,
      ...scoring,        // top-level = DESIGN axis (backward-compatible)
      patterns: scored
    };

    // Multi-axis: attach per-axis summaries + a unified score when >1 axis asked.
    if (reqAxes.length > 1 || reqAxes.includes('copy')) {
      const axes = {
        design: {
          axis: 'design',
          score: scoring.score,
          tier: scoring.tier,
          grade: scoring.grade,
          patternsFlagged: scoring.patternsFlagged,
          patternsTotal: scoring.patternsTotal,
          patterns: scored
        }
      };
      if (reqAxes.includes('copy')) {
        axes.copy = scoreCopy(data.textContext || {});
      }
      result.axes = axes;
      const summaries = {};
      for (const a of reqAxes) if (axes[a]) summaries[a] = axes[a];
      Object.assign(result, combineAxes(summaries));
    }

    if (opts.screenshot) {
      const buf = await page.screenshot({ fullPage: false });
      result.screenshot = buf.toString('base64');
    }
  } finally {
    await browser.close();
  }
  return result;
}
