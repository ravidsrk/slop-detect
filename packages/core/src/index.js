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
export { createColorHelpers } from './color.js';
export { createVisibilityHelpers } from './visibility.js';
export {
  isSlopFont,
  isAccentSerif,
  SLOP_FONT_PREFIXES,
  ACCENT_SERIF_PREFIXES
} from './fonts.js';
export { FIXES, buildFixPrompt } from './fixes.js';
export { gradeForScore, verdictFor, GRADE_BANDS } from './verdict.js';

import { gradeForScore, verdictFor } from './verdict.js';

// Versioned "slop definitions". Bump when patterns are added / removed /
// re-weighted so historical scores stay comparable and a re-score drift is
// explainable (rule change vs. site change). See ROADMAP.md issue #06.
export const DEFINITIONS_VERSION = '2026.06';

// Convenience: turn a triggered-pattern array into a scoring summary.
// Pure function so it's safe to call from any runtime.
export function scorePatterns(patternResults) {
  const score = patternResults
    .filter(p => p.triggered)
    .reduce((sum, p) => sum + p.weight, 0);

  // Tier thresholds:
  //   Heavy ≥ 28   — clearly AI-coded; the page wears Cursor/v0/Bolt aesthetics with multiple smoking guns
  //   Mild  ≥ 10   — at least one strong + one supporting slop signal
  //   Clean < 10   — premium-feeling, custom-crafted, or genuinely minimal
  const tier =
    score >= 28 ? 'Heavy' :
    score >= 10 ? 'Mild'  :
                  'Clean';

  const clamped = Math.min(100, score);
  const triggered = patternResults.filter(p => p.triggered);

  return {
    score: clamped,
    tier,
    grade: gradeForScore(clamped),
    verdict: verdictFor(clamped, tier, triggered),
    patternsFlagged: triggered.length,
    patternsTotal:   patternResults.length,
    definitionsVersion: DEFINITIONS_VERSION
  };
}
