# Build spec (FROZEN): Result peer-analytics — rank-average radar overlay + neighbors tile

Closes the only remaining divergence between the live "Slop Detect" design (project
644611bf, Result.dc.html) and the shipped product. The design's competitive-analytics
block draws two peer-comparison elements the product currently omits. User chose
"Build both, real data" (full parity, dogfood-honest). This spec is the frozen contract;
the reviewer grades against it.

Branch: ravidsrk/result-peer-analytics · base: origin/main · one PR, commits preserved.

## Non-negotiable: dogfood guardrail

Both elements depend on data the backend does NOT currently persist. The mock
(scandata.js) fabricates them (a flat `ringPts(0.58)`, a static neighbors array). That is
BARRED. Every number rendered must come from real persisted/curated data. When the data
is insufficient, OMIT the element (or show an honest empty state) — never fabricate. The
served page must still pass slop-detect's own detector: no AI-default fonts, no purple
CTA, no gradient/background-clip text, flat 1px surfaces, reuse `_theme.ts` tokens and
`_ui.tsx`/`_result.tsx` components.

## Element 1 — rank-average polygon (cleanliness radar overlay)

Design: a dashed pentagon overlaid on the existing "you" radar, plus legend
"— you · --- rank avg". Source today: none (see `_result.tsx:710-712`, the documented
omission). Build a real rolling corpus average per PATTERN category.

Data model (`apps/web/functions/_data.ts`):

- New durable KV key `stats:catclean` (no TTL), parallel to `stats:dist`. Stores, per
  pattern category, the running sum of clean-fractions and the count, e.g.
  `{ <catId>: { sum: number, n: number }, ... }`.
- `getCategoryCleanAverages(kv)` → `{ averages: Record<catId, number 0..1>, count: number }`
  (count = number of scans contributing; per-category average = sum/n).
- `bumpCategoryStats(kv, slim)` accumulates one scan's per-category clean-fractions.
- Call `bumpCategoryStats` from `recordScan` (alongside `appendHistory` + `bumpScoreStats`),
  so every persisted scan contributes. Read-modify-write, approximate under concurrency —
  fine for an average, same as `stats:dist`.
- The per-category clean-fraction MUST be computed from the SAME source of truth that
  `buildResultView` uses to reconstruct radar categories (engine pattern catalogue +
  `slim.triggered`). Extract a single pure helper (e.g. `categoryCleanFractions(slim)`)
  and use it BOTH in `bumpCategoryStats` and wherever `buildResultView` derives
  `categories[].cleanFraction`, so record-time and render-time can never drift. Key the
  aggregate by the engine's stable category id; align order with `buildResultView`.

Render (`apps/web/functions/_result.tsx` `Radar` + `Analytics`):

- `Analytics`/`Radar` accept an optional `catAvg: number[] | null` aligned 1:1 with
  `categories` (same order). When present AND the aggregate count >= 5, draw a second
  polygon from `catAvg` using `stroke="#9A9B8E" stroke-dasharray="3 3" fill="none"`
  (match the mock), and render the two-item legend. When absent or count < 5, render the
  radar exactly as today (no overlay, no legend) — omit, don't fake.
- Update the `:710-712` comment to describe the real overlay + its gate.

Wire-in (`apps/web/functions/score/[domain].tsx`): load `getCategoryCleanAverages`, map
to the `view.categories` order, pass `catAvg` (+ count gate) into `Analytics`.

## Element 2 — category-neighbors tile

Design: a "{category} neighbors" tile — a ranked list of sibling domains in the same
BUSINESS category, "you" highlighted, each linking to its `/score` hub. Source: the
curated corpus only (`leaderboard.json`, the same dataset `leaderboard.tsx` reads).

Build:

- In `score/[domain].tsx`, load `/leaderboard.json` (reuse the leaderboard's `loadData`
  fetch pattern; fail soft to null). Find the current domain's corpus entry.
- If found: neighbors = the domain's corpus siblings (same `category`), cleanest-first,
  capped (~6), each `{ rank, name/domain, score, grade, tier, you }`, "you" row marked.
  Pass into `Analytics`.
- If the domain is NOT in the curated corpus, OR the category has < 2 members: omit the
  tile (no invented category, no invented peers).
- New `Neighbors` component in `_result.tsx`, rendered inside `Analytics` when neighbors
  are present. Rows reuse the result token system; "you" row highlighted
  (`rgba(31,168,94,0.08)` bg, matching the mock). Each domain links to `${origin}/score/<domain>`.

## Acceptance criteria (reviewer grades against these)

Visual parity with Result.dc.html competitive-analytics: dashed rank-avg overlay + legend;
neighbors tile with ranks, letter-chips, name+domain, score+grade, "you" highlight.
Feature parity, honest: both render from REAL data; both correctly OMIT (not fabricate)
when data is insufficient (catAvg count < 5; domain not in corpus / < 2 siblings).
No regressions: existing Analytics charts (score-over-time, radar base, distribution)
unchanged; `recordScan` still records history + distribution; all existing tests green.
Dogfood: page still passes the guardrail (assert no slop fonts / gradient text / purple
CTA on the new markup).
Tests (real, behavior-exercising; coverage must not regress):

- `_data`: `bumpCategoryStats` accumulates; `getCategoryCleanAverages` returns correct
  per-category averages + count; `recordScan` calls the bump; record-time clean-fraction
  matches `buildResultView`'s for the same slim.
- `_result`/analytics: radar draws the avg polygon + legend only when catAvg present AND
  count >= 5; neighbors tile renders siblings, marks "you", links to /score; both omitted
  when data absent.
- `score/[domain]`: full result passes catAvg + neighbors; renders both when data present,
  neither when absent; no fabricated values.

Engine reuse, not rewrite: use the existing pattern catalogue + corpus; do NOT change the
scoring engine or the slim record shape beyond the new aggregate. Commits authored
Ravindra Kumar <ravidsrk@gmail.com>; no co-author / "Generated with" / agent trailers.
