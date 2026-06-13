// slop-detect-core — public entry point.
//
// This package is the pure, runtime-agnostic detection engine. It does NOT
// know how to fetch a page (no Playwright, no Puppeteer, no fetch). Callers
// (`slop-detect`, `slop-detect-web`, or your own integration) are
// responsible for opening the page in a browser, running the per-pattern
// `detect()` callback inside that page's context, then assembling a result.
//
// See packages/cli/src/detector.js and packages/web/functions/api/scan.js
// for the two reference runners.

export { PATTERNS } from './patterns.js';
export { COPY_PATTERNS } from './copyPatterns.js';
export { extractTextContext } from './text.js';
export { createColorHelpers } from './color.js';
export { createVisibilityHelpers } from './visibility.js';
export { isSlopFont, isAccentSerif, SLOP_FONT_PREFIXES, ACCENT_SERIF_PREFIXES } from './fonts.js';
export { FIXES, buildFixPrompt } from './fixes.js';
export { gradeForScore, verdictFor, GRADE_BANDS } from './verdict.js';
export { compileRule, compileRules, validateRule } from './rules.js';
export { PRESETS, applyPreset, isPreset } from './presets.js';
export {
  AI_BOTS,
  AEO_CHECKS,
  detectAIBot,
  aiBotsBlockedByRobots,
  toMarkdownUrl,
  runAeoChecks,
} from './aeo.js';
export {
  parseDesignMd,
  extractFrontMatter,
  extractSystemContext,
  flattenDesignTokens,
  scoreSystemCompliance,
  primaryFamily,
  parseCssColor,
  SYSTEM_CHECKS,
} from './system.js';

import { gradeForScore, verdictFor } from './verdict.js';
import { COPY_PATTERNS } from './copyPatterns.js';

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
export const DEFINITIONS_VERSION = '2026.09';

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
