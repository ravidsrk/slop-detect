# Copy axis

The copy axis scores page prose for LLM-default writing tells. It runs as pure text analysis — no DOM, no browser — on text extracted by `extractTextContext()` from the scanned page.

Module: `packages/core/src/copyPatterns.ts`. Scoring: `scoreCopy()` in `packages/core/src/index.ts`.

## Why a separate axis

Design-slop patterns (`patterns.ts`) execute inside Chromium via `page.evaluate()` because they need `getComputedStyle`, geometry, and layout. Copy-slop patterns are ordinary functions over `{ text, headings, paragraphs, wordCount }` and run in Node or a Worker at near-zero marginal cost. They are unit-testable without a browser.

Copy patterns do not appear in the 27-pattern design catalogue. The design axis and copy axis are scored independently, then optionally combined.

## Copy pattern catalogue

9 patterns. Each exposes `match(textCtx)` returning evidence with a boolean `triggered`.

| ID | Name | Weight | Detection summary |
|----|------|--------|-------------------|
| `buzzword_density` | AI buzzword density | 7 | ≥4 distinct buzzwords OR ≥3 hits with density ≥6 per 1000 words |
| `em_dash_overload` | Em-dash overload | 5 | ≥4 dashes with density ≥7/1000 words OR ≥8 em-dashes (U+2014) |
| `antithesis_construction` | "Not just X — it's Y" antithesis | 6 | ≥2 matches of "it's not just", "not only … but also", etc. |
| `filler_openers` | Generic filler openers | 5 | ≥1 match ("In today's fast-paced world", "When it comes to", etc.) |
| `formulaic_closers` | Essay-style closers | 4 | ≥1 match ("In conclusion", "Ultimately,", etc.) |
| `rule_of_three` | Rule-of-three adjective tricolons | 4 | ≥3 "word, word, and word" constructions |
| `whether_youre` | "Whether you're X or Y" | 3 | ≥1 audience-spanning whether/or construction |
| `unicode_artifacts` | Invisible Unicode + smart-quote artifacts | 4 | Zero-width chars, narrow no-break space, or ≥4 math-alphanumeric fake-bold letters |
| `emoji_bullet_headers` | Emoji-prefixed bullet/headers | 3 | ≥3 lines starting with marketing emoji (🚀 ✅ ✨ etc.) |

Calibration uses density thresholds, not single occurrences. One em-dash is fine; one per 40 words is a machine. Buzzword lexicon is a flat list in `copyPatterns.ts` (delve, leverage, seamless, robust, elevate, etc.).

## Copy tier thresholds

| Tier | Score range |
|------|-------------|
| Clean | 0–7 |
| Mild | 8–19 |
| Heavy | 20+ |

Score = sum of triggered copy-pattern weights, clamped to 100.

## Thin content

If `wordCount < 40`, all copy patterns are forced non-triggered and the axis returns `thin: true` with tier **Clean**. Too little prose to judge reliably.

## Multi-axis combination

When both design and copy are scanned (`--copy` or `--axes design,copy`), `combineAxes()` produces a unified result:

```
unified_score = min(100, max(design_score, copy_score) + penalty)
penalty       = max(0, dirty_axes - 1) × 6
```

- **dirty axis:** any axis with tier ≠ Clean
- **+6 per additional dirty axis** beyond the first (slop on multiple axes is worse than on one)
- **unified tier** uses design bands: Clean 0–9, Mild 10–27, Heavy 28+

Example: design score 5 (Clean), copy score 22 (Heavy) → unified = min(100, 22 + 0) = 22 → **Mild**.

Example: design score 15 (Mild), copy score 18 (Mild) → unified = min(100, 18 + 6) = 24 → **Mild**.

## CLI flags

```bash
# Design only (default)
npx slop-detect https://example.com

# Design + copy
npx slop-detect https://example.com --copy
npx slop-detect https://example.com --axes design,copy
```

When copy is enabled, `--fail-on` gates on `unifiedTier` (not design tier alone). See [conformance.md](./conformance.md).

## Example copy result shape

```json
{
  "axis": "copy",
  "score": 12,
  "tier": "Mild",
  "patternsFlagged": 2,
  "patternsTotal": 9,
  "wordCount": 842,
  "thin": false,
  "patterns": [ "...per-pattern evidence..." ]
}
```