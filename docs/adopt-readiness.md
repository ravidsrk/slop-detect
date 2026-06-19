# Adopt-readiness: "Slop Detect" design, full adoption verified

Final verification for adopting the claude.ai/design project 644611bf ("Slop Detect", the
score-hub direction: Landing, Leaderboard, Result, Docs, Brand) across the slop-detect web
product, both visually and feature-wise. Verified on `main` at the merge of PR #63
(commit 8a25159).

This complements docs/parity-readiness.md (the capstone for the original re-skin, PRs
#39-62) with the one full-parity addition built afterward (PR #63).

## Verdict

Full adoption. Every screen in the live "Slop Detect" design is implemented on main and
matches it visually and feature-wise; every prior product capability is preserved (the
28-point must-not-regress floor in docs/parity-readiness.md); and the one element the
shipped product had deliberately omitted is now built honestly. No half-migrated screens,
no placeholders, no dead links. The dogfood guardrail holds.

## Design-adoption matrix (live design 644611bf → product)

| Design screen        | Product surface                         | Status   | Evidence |
|----------------------|-----------------------------------------|----------|----------|
| Landing.dc.html      | apps/web/public/index.html              | COMPLETE | re-skinned in place; live canvas diffed 1:1 (tokens, fonts, hero, stats strip, leaderboard preview, 4-axis explainer, dark continuity layer, research, CTA); PR #50 |
| Leaderboard.dc.html  | functions/leaderboard.tsx + directory.tsx | COMPLETE | distribution histogram, cleanest-overall, by-category boards, opt-in dofollow directory; PRs #48, #53 |
| Result.dc.html       | functions/score/[domain].tsx + _result.tsx | COMPLETE | DomainHeader, BigScore, CategoryBars, Breakdown, AxisStrip, System/AEO, Analytics (now incl. rank-avg overlay + neighbors), Fixes, Share/Embed, Claim, Monitor; PRs #51, #56, #63 |
| Docs.dc.html         | functions/docs.tsx (/docs, alias /methodology) | COMPLETE | sticky sidebar, tier table, definitions version; PR #47 |
| Brand.dc.html        | functions/brand.tsx (/brand)            | COMPLETE | numbered ledger, the 0/100 A+ dogfood proof; PR #49 |

Supporting capabilities (badge, OG card, favicon, dashboard, blog, printable report, aux
pages, SEO/sitemap, scan-contract test) shipped in PRs #42-#60 and are covered in
docs/parity-readiness.md.

## The full-parity addition (PR #63)

The live Result design draws two peer-comparison elements the product previously omitted
(documented in parity-readiness.md as a deliberate, dogfood-driven omission). Built here
from real data per docs/gap-analytics-spec.md:

- Rank-average radar overlay: a new durable KV aggregate `stats:catclean` accumulates the
  per-pattern-category clean-fraction on every `recordScan`, via a shared
  `categoryCleanFractions` helper that is the SAME source of truth as `buildResultView`'s
  per-category fraction (record-time and render-time cannot drift). The dashed average
  polygon + legend render only when the aggregate has >= 5 scans, else omitted.
- Category-neighbors tile: sourced from the curated `leaderboard.json` corpus; shows the
  domain's category siblings cleanest-first with the "you" row highlighted at its true
  rank (windowed so the current domain is always included). Omitted when the domain is not
  in the corpus or its category has < 2 members.

Neither element fabricates data; both omit honestly when data is insufficient. The served
page still passes slop-detect's own detector (no AI-default fonts, no purple CTA, no
gradient/clip text).

## Gates (main at 8a25159)

| Gate      | Command             | Result                                            |
|-----------|---------------------|---------------------------------------------------|
| Install   | `bun install`       | clean                                             |
| Typecheck | `bun run typecheck` | 7/7 turbo tasks, exit 0                            |
| Lint      | `bun run lint`      | 3/3, no ESLint warnings or errors                 |
| Test      | `bun run test`      | 6/6 turbo; web 24 files / 264 tests passed        |

CLI golden suite (7 tests) stays gated behind `RUN_GOLDEN=1` (needs a Chromium binary; run
in CI's smoke job), as documented in parity-readiness.md. PR #63 added 8 web tests
(263 -> 264 includes the rank>6 neighbors regression test); coverage did not regress.

## Residual risks / documented limitations

- The rank-average overlay and neighbors tile only render once their data thresholds are
  met (catAvg count >= 5; domain in the curated corpus). On a sparse corpus they omit
  rather than fabricate — by design, per the dogfood guardrail.
- The earlier limitation noted in parity-readiness.md (radar drew 3 charts, not 4, because
  per-category corpus averages were not persisted) is now closed: the rank-average polygon
  is the 4th element, drawn from the real `stats:catclean` aggregate.
- CLI golden suite remains an environment gate (Chromium), not a coverage gap.

## Merged PRs

Original re-skin: #39-#62 (see docs/parity-readiness.md).
Full-parity addition: #63 (result peer-analytics — rank-average radar overlay +
category-neighbors tile, both from real data).
