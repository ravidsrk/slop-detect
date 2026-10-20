// @slop-detect/core — public entry point.
//
// This package is the pure, runtime-agnostic detection engine. It does NOT
// know how to fetch a page (no Playwright, no Puppeteer, no fetch). Callers
// (`slop-detect`, `slop-detect-web`, or your own integration) are
// responsible for opening the page in a browser, running the per-pattern
// `detect()` callback inside that page's context, then assembling a result.
//
// See packages/cli/src/detector.ts and apps/web/functions/api/scan.ts
// for the two reference runners.

export { PATTERNS } from './patterns.js';
export { COPY_PATTERNS } from './copyPatterns.js';
export { extractTextContext } from './text.js';
export { createColorHelpers } from './color.js';
export { createVisibilityHelpers } from './visibility.js';
export { isSlopFont, isAccentSerif, SLOP_FONT_PREFIXES, ACCENT_SERIF_PREFIXES } from './fonts.js';
export { FIXES, buildFixPrompt, formatEvidence } from './fixes.js';
export {
  gradeForScore,
  verdictFor,
  GRADE_BANDS,
  gradeForScore as scoreToGrade,
  verdictFor as buildVerdict,
} from './verdict.js';
export { compileRule, compileRules, validateRule } from './rules.js';
export { PRESETS, applyPreset, isPreset } from './presets.js';
export {
  AI_BOTS,
  AEO_CHECKS,
  detectAIBot,
  aiBotsBlockedByRobots,
  toMarkdownUrl,
  runAeoChecks,
  runAeoChecks as scoreAeo,
  readCapped,
  MAX_HTML_BYTES,
} from './aeo.js';
export {
  parseDesignMd,
  extractFrontMatter,
  extractSystemContext,
  flattenDesignTokens,
  scoreSystemCompliance,
  scoreSystemCompliance as checkDesignSystem,
  scoreSystemCompliance as scoreSystem,
  generateDesignMd,
  primaryFamily,
  parseCssColor,
  SYSTEM_CHECKS,
} from './system.js';
export {
  buildPageScript,
  esbuildNamePolyfills,
  detectBlocked,
  type PageScriptData,
  type BlockedResult,
  type BuildPageScriptOptions,
  type DetectBlockedContext,
} from './page-script.js';
export { SCAN_PAGE_WAIT, waitFontsReadyInPage } from './runner-wait.js';
export {
  assemblePatternResults,
  type PatternSignal,
  type AssembledPatternResults,
} from './result-assembly.js';

import { gradeForScore, verdictFor } from './verdict.js';
import { COPY_PATTERNS } from './copyPatterns.js';
import { PATTERNS } from './patterns.js';
import { applyPreset } from './presets.js';
import { buildPageScript, detectBlocked, type BuildPageScriptOptions } from './page-script.js';
import { assemblePatternResults } from './result-assembly.js';

// Known axes. `design` is the original fingerprint; `copy` is the text axis
// (#08). `code` is reserved for a future repo/view-source hook.
export const AXES = ['design', 'copy'];

// Per-axis tier thresholds. design keeps its historical bands. copy is scored on
// its own 0-100 scale (sum of triggered copy-pattern weights, clamped).
const AXIS_TIERS = {
  design: { mild: 10, heavy: 28 },
  copy: { mild: 8, heavy: 20 },
};

function tierFor(axis, score) {
  const t = AXIS_TIERS[axis] || AXIS_TIERS.design;
  return score >= t.heavy ? 'Heavy' : score >= t.mild ? 'Mild' : 'Clean';
}

// Versioned "slop definitions". Bump when patterns are added / removed /
// re-weighted so historical scores stay comparable and a re-score drift is
// explainable (rule change vs. site change). See ROADMAP.md issue #06.
export const DEFINITIONS_VERSION = '2026.10';

// Convenience: turn a triggered-pattern array into a scoring summary.
// Pure function so it's safe to call from any runtime.
export function scorePatterns(patternResults) {
  const score = patternResults.filter((p) => p.triggered).reduce((sum, p) => sum + p.weight, 0);

  const clamped = Math.min(100, score);
  // Single source of truth for the design bands (AXIS_TIERS.design):
  //   Heavy ≥ 28 · Mild ≥ 10 · Clean < 10. Computed on the clamped score so it
  //   can never diverge from the number we report.
  const tier = tierFor('design', clamped);
  const triggered = patternResults.filter((p) => p.triggered);

  return {
    score: clamped,
    tier,
    grade: gradeForScore(clamped),
    verdict: verdictFor(clamped, tier, triggered),
    patternsFlagged: triggered.length,
    patternsTotal: patternResults.length,
    definitionsVersion: DEFINITIONS_VERSION,
  };
}

// ── Copy axis ────────────────────────────────────────────────────────────────
// Run the copy-slop patterns over an extracted text context. Pure: no DOM, no
// browser. `textCtx` is what extractTextContext() returns.
export function scoreCopy(textCtx) {
  const ctx = textCtx || { text: '', headings: [], paragraphs: [], wordCount: 0 };
  // Too little prose to judge — return Clean with a flag rather than a false 0.
  const thin = (ctx.wordCount || 0) < 40;

  const patterns = COPY_PATTERNS.map((p) => {
    let evidence;
    try {
      evidence = p.match(ctx);
    } catch (e) {
      evidence = { triggered: false, error: e.message };
    }
    return {
      id: p.id,
      label: p.label,
      short: p.short,
      axis: 'copy',
      category: p.category,
      weight: p.weight,
      triggered: !thin && !!evidence.triggered,
      evidence,
    };
  });

  const raw = patterns.filter((p) => p.triggered).reduce((s, p) => s + p.weight, 0);
  const score = Math.min(100, raw);
  const tier = tierFor('copy', score);
  const triggered = patterns.filter((p) => p.triggered);

  return {
    axis: 'copy',
    score,
    tier,
    grade: gradeForScore(score),
    patternsFlagged: triggered.length,
    patternsTotal: patterns.length,
    wordCount: ctx.wordCount || 0,
    thin,
    patterns,
  };
}

// ── Multi-axis aggregator ─────────────────────────────────────────────────────
// Combine per-axis scoring summaries into one unified result. The unified score
// is the max of the axis scores (a page that's clean design but slop copy is
// still slop) plus a small penalty when MULTIPLE axes are dirty — being sloppy
// on every axis is worse than on one. Kept monotonic and clamped to 0-100.
export function combineAxes(axisSummaries) {
  const present = Object.keys(axisSummaries).filter((k) => axisSummaries[k]);
  const scores = present.map((k) => axisSummaries[k].score || 0);
  if (scores.length === 0) {
    return {
      unifiedScore: 0,
      unifiedTier: 'Clean',
      unifiedGrade: gradeForScore(0),
      axesScored: [],
    };
  }
  const max = Math.max(...scores);
  const dirtyAxes = present.filter((k) => (axisSummaries[k].tier || 'Clean') !== 'Clean').length;
  // +6 per additional dirty axis beyond the first.
  const penalty = Math.max(0, dirtyAxes - 1) * 6;
  const unified = Math.min(100, max + penalty);

  // Unified tier uses the design bands (the canonical 0-9 / 10-27 / 28+ scale).
  const unifiedTier = tierFor('design', unified);

  return {
    unifiedScore: unified,
    unifiedTier,
    unifiedGrade: gradeForScore(unified),
    axesScored: present,
    dirtyAxes,
  };
}

// ── Programmatic convenience wrappers ────────────────────────────────────────
// The documented embed API (README / packages/core/README.md). These used to be
// bare aliases of lower-level helpers with different signatures; they now do
// what the docs advertise while still accepting the old call shapes.

/**
 * Pattern subset for a preset. `getPatterns('strict')` filters the built-in
 * PATTERNS; the legacy `getPatterns(patterns, 'strict')` form (= applyPreset)
 * still works.
 */
export function getPatterns(presetOrPatterns?: any, preset?: any) {
  if (Array.isArray(presetOrPatterns)) return applyPreset(presetOrPatterns, preset);
  return applyPreset(PATTERNS, presetOrPatterns);
}

/**
 * Build the page-evaluate script. Accepts `(patterns, opts)` as documented, or
 * the legacy `(opts)` form. The copy-axis text context is always extracted;
 * `includeSystem` adds the DESIGN.md observation pass.
 */
export function buildPageEvaluateScript(
  patternsOrOpts?: any[] | (BuildPageScriptOptions & { includeCopy?: boolean }),
  opts: BuildPageScriptOptions & { includeCopy?: boolean } = {}
): string {
  if (Array.isArray(patternsOrOpts)) {
    return buildPageScript({ ...opts, patterns: patternsOrOpts });
  }
  return buildPageScript(patternsOrOpts || {});
}

function normalizeAxes(axes) {
  const VALID = ['design', 'copy'];
  if (axes === 'all') return [...VALID];
  if (!Array.isArray(axes) || axes.length === 0) return ['design'];
  const out = axes.filter((a) => VALID.includes(a));
  if (!out.includes('design')) out.unshift('design');
  return [...new Set(out)];
}

export interface AssembleScanResultOptions {
  url?: string;
  finalUrl?: string;
  /** `['design']` (default), `['design','copy']`, or `'all'`. */
  axes?: string[] | 'all';
  /** Pattern subset to score against (defaults to every built-in pattern). */
  patterns?: Array<{ id: string }>;
  /** Named preset applied after `patterns` (default `full`). */
  preset?: string;
}

/**
 * Turn the object returned by `page.evaluate(buildPageEvaluateScript(...))`
 * into a scored scan result: top-level design score/tier/grade/verdict,
 * per-pattern rows, optional copy axis + unified score, and a `blocked`
 * result (score null) when the page looks like a bot wall / empty render —
 * mirroring the CLI and `POST /api/scan` shapes.
 *
 * Legacy form: passing a bare `signals` map (the old alias of
 * `assemblePatternResults`) still works and is scored the same way.
 */
export function assembleScanResult(raw: any, opts: AssembleScanResultOptions = {}) {
  const isPageData = !!raw && typeof raw === 'object' && 'signals' in raw;
  const data = isPageData ? raw : { signals: raw || {} };
  const url = opts.url || data.url;

  if (isPageData) {
    const blocked = detectBlocked(data);
    if (blocked) {
      return {
        url,
        finalUrl: opts.finalUrl || data.url,
        title: data.title,
        h1: data.h1Text,
        blocked: true,
        error: blocked.reason,
        code: blocked.code,
        hint: blocked.hint,
        score: null,
        tier: null,
        grade: null,
        patternsFlagged: 0,
        patternsTotal: PATTERNS.length,
        patterns: [],
        patternsErrored: 0,
        definitionsVersion: DEFINITIONS_VERSION,
      };
    }
  }

  const { patterns: all, patternsErrored } = assemblePatternResults(data.signals || {});
  let selected = all;
  if (Array.isArray(opts.patterns)) {
    const ids = new Set(opts.patterns.map((p) => p && p.id));
    selected = all.filter((p) => ids.has(p.id));
  }
  const preset = opts.preset || 'full';
  const scored = applyPreset(selected, preset);
  const scoring = scorePatterns(scored);

  const result: Record<string, any> = {
    url,
    finalUrl: opts.finalUrl || data.url,
    title: data.title,
    h1: data.h1Text,
    h1Font: data.h1Font,
    preset,
    ...scoring,
    patterns: scored,
    patternsErrored,
  };

  const reqAxes = normalizeAxes(opts.axes);
  if (reqAxes.includes('copy')) {
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
      copy: scoreCopy(data.textContext || {}),
    };
    result.axes = axes;
    Object.assign(result, combineAxes({ design: axes.design, copy: axes.copy }));
  }
  if (data.systemContext) result.systemContext = data.systemContext;
  return result;
}
