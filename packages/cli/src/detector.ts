// Detector orchestrator. Serializes lib helpers + pattern extract functions
// into a single page-side IIFE, runs once via page.evaluate(), aggregates
// results, computes a 0-100 score.

import { spawnSync } from 'node:child_process';
import {
  PATTERNS,
  buildPageScript,
  detectBlocked,
  scorePatterns,
  applyPreset,
  parseDesignMd,
  scoreSystemCompliance,
  scoreCopy,
  combineAxes,
} from '@slop-detect/core';

// Options accepted by the scan entry points. All optional — the CLI fills in
// whatever flags were passed. Shared with bin/slop.ts so the flag object and the
// scanners agree on shape.
export interface ScanOptions {
  preset?: string;
  axes?: string[];
  screenshot?: boolean;
  timeout?: number;
  designMd?: string;
  api?: string;
  apiKey?: string;
  includeSystem?: boolean;
}

// Playwright is heavy (pulls in a ~150 MB browser) and is ONLY needed for an
// actual scan. Import it lazily so `--help`, flag validation, error paths, and
// the `--remote` API mode all work without it installed. A top-level import here
// used to crash the whole binary (even `--help`) when Playwright was absent.
let _chromium = null;
async function loadChromium() {
  if (_chromium) return _chromium;
  try {
    ({ chromium: _chromium } = await import('playwright'));
  } catch (_) {
    throw new Error(
      "Playwright isn't installed, so local scanning is unavailable. " +
        'Run `npm i -D playwright` (or `npm i -g playwright`), or use `--remote` ' +
        'to scan via the slop-detect.com API instead.'
    );
  }
  return _chromium;
}

// Lazy-install Chromium on first run. We skip the eager `postinstall` so that
// `npm i -g slop-detect` (or `npx`) doesn't burn ~150 MB on every CI cache miss.
// Set SKIP_PLAYWRIGHT_DOWNLOAD=1 to short-circuit (useful if you've already
// installed Chromium via your system playwright, or you're bringing your own).
let chromiumReady = false;
async function ensureChromium() {
  if (chromiumReady) return;
  const chromium = await loadChromium();
  if (process.env.SKIP_PLAYWRIGHT_DOWNLOAD) {
    chromiumReady = true;
    return;
  }
  // Try a cheap launch first. If the browser binary is missing, Playwright
  // throws a recognisable error — only then do we spawn the installer.
  try {
    const b = await chromium.launch({ headless: true });
    await b.close();
    chromiumReady = true;
    return;
  } catch (err) {
    const msg = String(err && err.message);
    // Only auto-install when the failure is specifically a missing browser
    // binary. Other launch failures (sandbox, missing OS libs, perms) must
    // surface as-is — re-running the installer won't fix them and would mask
    // the real error behind a 150 MB download.
    const missingBinary =
      /Executable doesn't exist/i.test(msg) ||
      /playwright install/i.test(msg) ||
      /Failed to launch.*because executable doesn't exist/i.test(msg);
    if (!missingBinary) {
      throw err;
    }
    process.stderr.write('slop-detect: first run — downloading Chromium (~150 MB, one-time)…\n');
    const r = spawnSync('npx', ['--yes', 'playwright', 'install', 'chromium'], {
      // Pipe stdout so a `--json` redirect never captures download progress.
      stdio: ['ignore', 'pipe', 'inherit'],
      shell: process.platform === 'win32',
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

// Normalize the requested axes into a deduped, valid list. Default: design only.
// Accepts an array (['design','copy']), 'all', or undefined.
function normalizeAxes(axes) {
  const VALID = ['design', 'copy'];
  if (axes === 'all') return [...VALID];
  if (!Array.isArray(axes) || axes.length === 0) return ['design'];
  const out = axes.filter((a) => VALID.includes(a));
  if (!out.includes('design')) out.unshift('design'); // design always present
  return [...new Set(out)];
}

// ── DESIGN.md loading (system axis) ──────────────────────────────────────────
// Resolve the --design-md value to raw text. `auto` looks for <origin>/DESIGN.md
// next to the scanned page; a 404 in auto mode returns null ("no system
// declared") rather than an error, since absence is a normal state.
export async function loadDesignMd(source, pageUrl) {
  if (source === 'auto') {
    const url = new URL('/DESIGN.md', pageUrl).toString();
    try {
      const res = await fetch(url, { headers: { Accept: 'text/markdown,text/plain,*/*' } });
      if (!res.ok) return null;
      return { text: await res.text(), from: url };
    } catch {
      return null;
    }
  }
  if (/^https?:\/\//i.test(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`Could not fetch DESIGN.md from ${source} (HTTP ${res.status})`);
    return { text: await res.text(), from: source };
  }
  const { readFile } = await import('node:fs/promises');
  return { text: await readFile(source, 'utf8'), from: source };
}

// ── Remote mode ──────────────────────────────────────────────────────────────
// Scan via the public slop-detect.com API instead of a local browser. This is
// the zero-install path: `npx slop-detect <url> --remote` needs no Playwright /
// Chromium download. Returns the same result shape as scanUrl().
const DEFAULT_API = 'https://slop-detect.com';

export async function scanRemote(url, opts: ScanOptions = {}) {
  const base = opts.api || process.env.SLOP_API || DEFAULT_API;
  const headers = { 'content-type': 'application/json' };
  const key = opts.apiKey || process.env.SLOP_API_KEY;
  if (key) headers['x-api-key'] = key;
  let res;
  try {
    res = await fetch(new URL('/api/scan', base), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        url,
        preset: opts.preset || 'full',
        axes: opts.axes || ['design'],
        screenshot: !!opts.screenshot,
      }),
    });
  } catch (e) {
    throw new Error(`Could not reach ${base} (${e.message}). Drop --remote to scan locally.`);
  }
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) {
    // Surface the API's structured errors (rate_limited, cloudflare_challenge…).
    const err: any = new Error(data.error || `scan failed (HTTP ${res.status})`);
    if (data.code) err.code = data.code;
    throw err;
  }
  return data;
}

export async function aeoRemote(url, opts: ScanOptions = {}) {
  const base = opts.api || process.env.SLOP_API || DEFAULT_API;
  const headers = { 'content-type': 'application/json' };
  const key = opts.apiKey || process.env.SLOP_API_KEY;
  if (key) headers['x-api-key'] = key;
  let res;
  try {
    res = await fetch(new URL('/api/aeo', base), {
      method: 'POST',
      headers,
      body: JSON.stringify({ url }),
    });
  } catch (e) {
    throw new Error(`Could not reach ${base} (${e.message}). Drop --remote to scan locally.`);
  }
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error(data.error || `AEO check failed (HTTP ${res.status})`);
  return data;
}

export async function scanUrl(url, opts: ScanOptions = {}) {
  await ensureChromium();
  const chromium = await loadChromium();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 SlopDetector/1.0 (+https://github.com/ravidsrk/slop-detect)',
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  let result;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: opts.timeout || 30000 });
    // Give CSS / fonts / above-fold images a moment to settle
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);

    const data = await page.evaluate(buildPageScript({ includeSystem: !!opts.designMd }));

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
        patterns: [],
      };
      return result;
    }

    // Build the structured result on the Node side.
    const patterns = PATTERNS.map((p) => {
      const sig = data.signals[p.id] || { triggered: false };
      return {
        id: p.id,
        label: p.label,
        short: p.short,
        category: p.category,
        weight: p.weight,
        triggered: !!sig.triggered,
        evidence: sig,
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
      ...scoring, // top-level = DESIGN axis (backward-compatible)
      patterns: scored,
    };

    // Multi-axis: attach per-axis summaries + a unified score when >1 axis asked.
    if (reqAxes.length > 1 || reqAxes.includes('copy')) {
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
      if (reqAxes.includes('copy')) {
        axes.copy = scoreCopy(data.textContext || {});
      }
      result.axes = axes;
      const summaries = {};
      for (const a of reqAxes) if (axes[a]) summaries[a] = axes[a];
      Object.assign(result, combineAxes(summaries));
    }

    // System axis: opts.designMd carries the raw DESIGN.md text (the caller
    // handles loading from file/URL). Scored Node-side against the observed
    // fonts/colors/radii. Reported separately from the slop score — it measures
    // alignment with the site's OWN system (higher is better), not slop.
    if (opts.designMd) {
      result.system = scoreSystemCompliance(parseDesignMd(opts.designMd), data.systemContext);
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
