// Detector orchestrator. Serializes lib helpers + pattern extract functions
// into a single page-side IIFE, runs once via page.evaluate(), aggregates
// results, computes a 0-100 score.

import { spawnSync } from 'node:child_process';
import {
  PATTERNS,
  buildPageScript,
  detectBlocked,
  assemblePatternResults,
  scorePatterns,
  applyPreset,
  parseDesignMd,
  scoreSystemCompliance,
  scoreCopy,
  scoreCraft,
  combineAxes,
  SCAN_PAGE_WAIT,
  waitFontsReadyInPage,
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
  // Kept on the public options object so existing TS call sites that pass
  // includeSystem: true keep typechecking. Runtime equivalent: inject the
  // system extractor (also implied by designMd).
  includeSystem?: boolean;
}

export function shouldIncludeSystem(opts: ScanOptions = {}) {
  return !!(opts.designMd || opts.includeSystem);
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
  const VALID = ['design', 'copy', 'craft'];
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
  const body: Record<string, any> = {
    url,
    preset: opts.preset || 'full',
    axes: opts.axes || ['design'],
    screenshot: !!opts.screenshot,
  };
  if (opts.designMd) {
    body.designMd = opts.designMd === 'auto' ? true : opts.designMd;
  }
  let res;
  try {
    res = await fetch(new URL('/api/scan', base), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
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

export function buildSarifReport(results: any[]) {
  const list = Array.isArray(results) ? results : [results];
  const rulesMap = new Map<string, any>();
  const sarifResults: any[] = [];

  for (const r of list) {
    if (!r || r.error || r.blocked) continue;
    const uri = r.finalUrl || r.url || 'https://example.com';
    const designPatterns = Array.isArray(r.patterns) ? r.patterns : [];
    const copyPatterns = Array.isArray(r.axes?.copy?.patterns) ? r.axes.copy.patterns : [];
    for (const p of [...designPatterns, ...copyPatterns]) {
      if (!rulesMap.has(p.id)) {
        rulesMap.set(p.id, {
          id: p.id,
          name: p.short || p.id,
          shortDescription: { text: p.label || p.id },
          defaultConfiguration: {
            level: p.weight >= 6 ? 'error' : 'warning',
          },
          properties: {
            axis: p.axis || 'design',
            category: p.category || 'design',
            weight: p.weight,
          },
        });
      }
      if (p.triggered) {
        sarifResults.push({
          ruleId: p.id,
          level: p.weight >= 6 ? 'error' : 'warning',
          message: {
            text: `${p.label} (+${p.weight}) triggered on ${uri}`,
          },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri },
              },
            },
          ],
          properties: {
            weight: p.weight,
            axis: p.axis || 'design',
            evidence: p.evidence || {},
          },
        });
      }
    }
    if (Array.isArray(r.system?.drift)) {
      for (const d of r.system.drift) {
        const ruleId = `system.${d.id}`;
        if (!rulesMap.has(ruleId)) {
          rulesMap.set(ruleId, {
            id: ruleId,
            name: d.id,
            shortDescription: { text: `DESIGN.md compliance: ${d.id}` },
            defaultConfiguration: { level: 'warning' },
          });
        }
        sarifResults.push({
          ruleId,
          level: 'warning',
          message: { text: d.message },
          locations: [{ physicalLocation: { artifactLocation: { uri } } }],
        });
      }
    }
  }

  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'slop-detect',
            informationUri: 'https://slop-detect.com',
            rules: [...rulesMap.values()],
          },
        },
        results: sarifResults,
      },
    ],
  };
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
  const browserVersion = browser.version();
  let result;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: opts.timeout || 30000 });
    // Shared settle budget with the web runner (SCAN_PAGE_WAIT).
    await Promise.race([
      page
        .waitForLoadState('networkidle', { timeout: SCAN_PAGE_WAIT.networkIdleTimeoutMs })
        .catch(() => {}),
      new Promise((r) => setTimeout(r, SCAN_PAGE_WAIT.totalWaitCapMs)),
    ]);
    await page.waitForTimeout(SCAN_PAGE_WAIT.postNetworkSettleMs);
    await page.evaluate(waitFontsReadyInPage, SCAN_PAGE_WAIT.fontsReadyTimeoutMs);

    const data = await page.evaluate(buildPageScript({ includeSystem: shouldIncludeSystem(opts) }));

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
    const { patterns, patternsErrored } = assemblePatternResults(data.signals);
    if (patternsErrored > 0) {
      console.warn(`slop-detect: ${patternsErrored} pattern extractor(s) failed`);
    }

    // Always extract every pattern (one cheap page eval), but score against the
    // selected preset's subset so the number — and the displayed pattern list —
    // reflect exactly what the caller asked for.
    const preset = opts.preset || 'full';
    const scored = applyPreset(patterns, preset);
    const scoring = scorePatterns(scored);

    // Which axes to compute. Default = design only (fully backward-compatible:
    // top-level score/grade/patterns stay exactly as before). Opt into copy or
    // craft via opts.axes. Craft never feeds the unified design/copy score.
    const reqAxes = normalizeAxes(opts.axes);

    result = {
      url,
      finalUrl: data.url,
      title: data.title,
      h1: data.h1Text,
      h1Font: data.h1Font,
      preset,
      calibration: 'uncalibrated-beta',
      ...scoring, // top-level = DESIGN axis (backward-compatible)
      patterns: scored,
      patternsErrored,
      browserVersion,
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
      if (reqAxes.includes('craft') && data.craftSignals) {
        axes.craft = scoreCraft(data.craftSignals);
        result.craft = axes.craft;
      }
      result.axes = axes;
      const summaries = {};
      for (const a of reqAxes) {
        if (a === 'craft') continue;
        if (axes[a]) summaries[a] = axes[a];
      }
      Object.assign(result, combineAxes(summaries));
    }

    // System axis: opts.designMd carries the raw DESIGN.md text (the caller
    // handles loading from file/URL). Scored Node-side against the observed
    // fonts/colors/radii. Reported separately from the slop score — it measures
    // alignment with the site's OWN system (higher is better), not slop.
    if (opts.designMd) {
      result.system = scoreSystemCompliance(parseDesignMd(opts.designMd), data.systemContext);
    }
    if (shouldIncludeSystem(opts) && data.systemContext) {
      result.systemContext = data.systemContext;
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
