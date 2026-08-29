# Parity readiness: the new-landing redesign

This is the capstone verification for the full re-skin of the slop-detect web product
to the light editorial-instrument design system. It confirms that every item in the
frozen build plan (docs/parity-spec.md Part D, tasks 00 through 17) shipped, that the
28-point must-not-regress floor (docs/old-product-inventory.md) is intact, and that the
served surfaces still pass slop-detect's own detector. Verified on `main` at commit
d4d89f1, the merge of PR #60.

## Final verdict

Full design fidelity, zero feature regressions. All 17 required build tasks plus the
optional task 17 are implemented and merged. All 28 must-not-regress capabilities are
preserved. Every gate is green. The dogfood guardrail holds: no slop fonts, no purple
CTA, no gradient or background-clip text on any served surface, and /brand is the strict
proof page. There is one documented design limitation (the score-hub competitive
analytics renders 3 charts, not 4, because the 4th needs corpus data the slim record
does not persist, and fabricating it is barred by the dogfood rule). It is a deliberate
spec decision, not a regression.

## Gate results

Run on the whole monorepo with bun + turbo. Every gate exits 0 with no failures.

| Gate                  | Command            | Result                                              |
|-----------------------|--------------------|-----------------------------------------------------|
| Install               | `bun install`      | clean, exit 0                                       |
| Build (all workspaces)| `bun run build`    | 6 tasks successful, exit 0                          |
| Lint                  | `bun run lint`     | exit 0, no warnings                                 |
| Typecheck             | `bun run typecheck`| exit 0                                              |
| Test (all workspaces) | `bun run test`     | 6 tasks successful, exit 0                          |

Test counts per workspace (vitest):

| Workspace             | Files                  | Tests                                       |
|-----------------------|------------------------|---------------------------------------------|
| @slop-detect/core     | 7 passed               | 56 passed                                   |
| slop-detect-mcp       | 2 passed               | 9 passed                                    |
| slop-detect (cli)     | 2 (1 passed, 1 gated)  | 12 (5 passed, 7 RUN_GOLDEN-gated)           |
| slop-detect-web       | 23 passed              | 253 passed                                  |
| Total executed        | 32 (browser-free)      | 323 passed                                  |

The CLI golden suite (packages/cli/test/golden.test.js, 7 tests) is gated behind
`RUN_GOLDEN=1` because it scans HTML fixtures in a real Chromium binary; the browser-free
unit run skips it by design and the CI "Smoke test CLI" job runs it with Chromium. To
make the verdict airtight it was run here with `RUN_GOLDEN=1` and a Chromium binary:
all 7 pass (12 passed total in the CLI workspace, exit 0). So the skips are an
environment gate, not a coverage gap. With the golden suite included the suite total is
330 tests, all green.

The turbo test graph covers the real vitest suites plus the two examples
(astro-blog, nextjs-app-router), which declare no test command and pass as no-ops.

## Parity matrix: build tasks 00 to 17

Every build task in docs/parity-spec.md Part D is implemented on main. Treatment is the
spec's own label. Each row cites a primary file confirmed to exist and match its
acceptance criteria.

| Task | Slug                     | Treatment            | PR  | Status   | Evidence |
|------|--------------------------|----------------------|-----|----------|----------|
| 00   | foundation-tokens-theme  | REDESIGN + GAP-FILL  | #42 | COMPLETE | functions/_brand.ts light tokens (paper #F4F5F2, accent #1FA85E), `:focus-visible`, `prefers-reduced-motion`, responsive breakpoints; _theme.ts resolvers; _badge.tsx + _card.tsx relocated; brand-tokens.test.js |
| 01   | shared-ui-library        | REDESIGN             | #46 | COMPLETE | functions/_ui.tsx exports Nav, Footer, LogoLockup, ScanInput, Button, StatsStrip, LeaderboardRow, LiveBadge, MonitorCard, CodeBlock, SectionLedger, Cta; ui.test.js (27 tests) |
| 02   | home-landing             | REDESIGN + PRESERVE + GAP-FILL | #50 | COMPLETE | public/index.html re-skinned in place; Google Fonts loads only Newsreader/Libre Franklin/JetBrains Mono; functions/index.ts agent JSON negotiation; landing.test.js (16) |
| 03   | score-hub                | REDESIGN + GAP-FILL  | #51 | COMPLETE | functions/score/[domain].tsx composes functions/_result.tsx (BigScore, CategoryBars, Breakdown, AxisStrip, Analytics) with inline-SVG charts, no chart library; score.test.js (12) |
| 04   | result-permalink         | REDESIGN + GAP-FILL  | #56 | COMPLETE | functions/r/[id].tsx reuses _result; rel=canonical to /score hub; friendly 90-day expired 404; inline-scripts.test.js |
| 05   | printable-report         | REDESIGN + GAP-FILL  | #57 | COMPLETE | functions/report/[domain].tsx buildResultView; `@media print`; noindex; publicWatch (email-free); drift.test.js (15) |
| 06   | leaderboard              | REDESIGN             | #48 | COMPLETE | functions/leaderboard.tsx "the state of AI design slop", Hall of Clean, getStats, 10-bucket distribution; leaderboard.test.js |
| 07   | directory                | REDESIGN             | #53 | COMPLETE | functions/directory.tsx dofollow backlink, ItemList JSON-LD, sort modes, pending label; sites.test.js (15) |
| 08   | dashboard                | GAP-FILL             | #52 | COMPLETE | functions/dashboard.tsx magic-link session, listWatchesByEmail isolation, 503 when no SESSION_SECRET, noindex/nofollow, logout; dashboard.test.js (13) |
| 09   | blog                     | GAP-FILL             | #54 | COMPLETE | functions/blog.tsx BlogPosting JSON-LD; functions/blog/[slug].tsx text/markdown twin; blog.test.js (8) |
| 10   | docs-methodology         | NEW + GAP-FILL       | #47 | COMPLETE | functions/docs.tsx route /docs (alias /methodology), sticky sidebar, tier table, DEFINITIONS_VERSION; docs.test.js (13); in sitemap |
| 11   | brand-page               | NEW                  | #49 | COMPLETE | functions/brand.tsx route /brand, numbered ledger sections, the 0/100 A+ Clean dogfood manifesto; brand.test.js (18); in sitemap |
| 12   | badge-generator          | REDESIGN             | #44 | COMPLETE | functions/_badge.tsx two-segment pill, tier colors from _theme.ts, no linearGradient, role="img" + aria-label; badge.test.js (8) |
| 13   | og-card                  | REDESIGN             | #45 | COMPLETE | functions/_card.tsx flat paper background, zero gradients, tier color from _theme; functions/og/[id].ts KV cache + static /og.png fallback; og-card.test.js (9) |
| 14   | favicon-assets           | REDESIGN             | #43 | COMPLETE | public/favicon.svg reticle in rounded paper tile; favicon.png + favicon-512.png present; favicon.test.js (6) |
| 15   | aux-rendered-pages       | GAP-FILL             | #55 | COMPLETE | functions/api/watch/confirm.tsx new shell, 200/503/400/410/404 contract; public/compare re-skinned; alerts.test.js (13) |
| 16   | seo-version-consistency  | PRESERVE             | #58 | COMPLETE | public/sitemap.xml adds /docs, /brand and per-domain /score hubs; version strings driven from one source; seo-version.test.js (6) |
| 17   | api-scan-contract-test   | PRESERVE (optional)  | #59 | COMPLETE | test/scan-contract.test.js (16) locks the scan response + error contract (MNR-1, MNR-3) |

No gaps. Every primary file exists, every spot-checked acceptance claim holds, and each
task's tests are green.

## Must-not-regress floor: all 28 confirmed

Every capability in docs/old-product-inventory.md (mapped in parity-spec.md A7) is
preserved. Routes are present and functions hold their contract. No regressions.

| MNR | Capability                                                  | Status | Evidence |
|-----|-------------------------------------------------------------|--------|----------|
| 1   | Scan to score/tier/grade/verdict/pattern breakdown          | OK     | functions/api/scan.ts; scan-contract.test.js |
| 2   | SSRF guard (target, redirect hops, DESIGN.md)               | OK     | functions/_ssrf.ts validateScanUrl; scan.ts pre-flight + redirect + designMd |
| 3   | Anti-bot / dead-page 422 with hint (no fake Clean)          | OK     | scan.ts cloudflare_challenge / access_blocked / empty_page + hint |
| 4   | Scoring presets (full/strict/marketing/minimal)             | OK     | scan.ts isPreset / applyPreset |
| 5   | Copy axis + system axis + AEO axis                          | OK     | scan.ts copy/system; functions/api/aeo.ts runAeoChecks |
| 6   | Optional screenshot + share:false no-persist                | OK     | scan.ts screenshot path, `body.share !== false` |
| 7   | Shareable /r/:id (90 day) + expired state                   | OK     | functions/r/[id].tsx getResult, "kept 90 days" 404; RESULT_TTL 90d |
| 8   | Dynamic OG card + per-domain badge (cached, fallback)       | OK     | functions/og/[id].ts cached + /og.png fallback; functions/_badge.tsx self-rendered, no-scan fallback |
| 9   | Share X/LinkedIn, copy link, embed MD/HTML/URL              | OK     | public/index.html share + embed tabs; _result.tsx ShareEmbed |
| 10  | Fix-prompt + one-click handoff (ChatGPT/Claude/Cursor)      | OK     | index.html handoff links; functions/api/fix-prompt.ts two modes |
| 11  | /score/:domain hub (grade, axes, chart, percentile)         | OK     | functions/score/[domain].tsx BigScore, AxisStrip, Analytics, rank |
| 12  | Claim model (dofollow only after verified) + empty state    | OK     | score/[domain].tsx 404 empty + CTA, ClaimPanel; directory.tsx dofollow only when listed |
| 13  | Subscribe/unsub + additive flags + double opt-in + drift    | OK     | functions/api/watch.ts omit-preserves-flags, ownership 403, verification email; confirm.tsx 200/400/410/404 |
| 14  | Public watch status, no email leakage                       | OK     | functions/_data.ts publicWatch (no email field); api/watch.ts GET |
| 15  | Cron sweep (regression + drift alerts, re-arm)              | OK     | functions/api/cron/sweep.ts const-time secret, monitorSweep, capped |
| 16  | Printable /report/:domain (print CSS, noindex, email-free)  | OK     | functions/report/[domain].tsx @media print, noindex, publicWatch |
| 17  | Agency dashboard (magic-link, HMAC session, isolation, logout) | OK  | functions/dashboard.tsx signSession, listWatchesByEmail, 503 no secret, logout; api/dashboard/link.ts anti-enumeration |
| 18  | Email via Resend with graceful degradation + redacting logs | OK     | functions/_email.ts no-provider no-op, redact() |
| 19  | Opt-in directory (dofollow, ItemList, sorts, pending) + API mirror | OK | functions/directory.tsx; functions/api/sites.ts |
| 20  | Leaderboard (corpus, rankings, counter, generate-then-serve)| OK     | functions/leaderboard.tsx fetch /leaderboard.json, generating state, live counter >=50 |
| 21  | Global distribution, /api/stats, percentile, headline       | OK     | functions/_data.ts bumpScoreStats, percentileFromDistribution; functions/api/stats.ts |
| 22  | Blog (index, posts, .md twins) + content                    | OK     | functions/blog.tsx; functions/blog/[slug].tsx text/markdown twin, rel=alternate, 404 |
| 23  | Live /api/patterns + /api/aeo                               | OK     | functions/api/patterns.ts (PATTERNS + DEFINITIONS_VERSION); functions/api/aeo.ts |
| 24  | Full agent + AEO + SEO + security headers + JSON-LD          | OK     | index.ts agent view; 5 .well-known files keep check_design_system; llms.txt family; openapi.json; robots Content-Signal; sitemap; _headers CSP/HSTS |
| 25  | Protection stack (rate limit, Turnstile, origin, fail-closed, cap, kill) | OK | functions/api/_middleware.ts foreign-origin 403, fail-closed ceiling, daily cap, SCAN_DISABLED, Turnstile |
| 26  | Shared brand system + dogfood guardrail                     | OK     | _brand.ts / _theme.ts / _ui.tsx; brand.test.js + landing.test.js assert no slop fonts, no gradient text |
| 27  | Framing (fingerprint not verdict, lower is better, opt-in, positive leaderboard) | OK | index.html framing copy; leaderboard.tsx Hall of Clean (no named shame); directory.tsx opt-in only |
| 28  | RESULTS KV model (keys, TTLs) + derived rules               | OK     | functions/_data.ts keys + TTLs, isRegression, isSystemDrift, sticky baseline, history de-dup, directory reconcile |

Two intentional redesign decisions, flagged so they are not mistaken for regressions:

- Brand typefaces moved from the floor's Hanken Grotesk + Martian Mono to Newsreader +
  Libre Franklin + JetBrains Mono. This is the intended light editorial-instrument
  system and is test-locked (brand-tokens.test.js asserts the old faces are gone). The
  brand-system-plus-dogfood capability (MNR-26) is intact; the typefaces were always
  expected to change in the rebuild.
- The /r/:id permalink now carries rel=canonical to /score/:domain, closing the SEO gap
  the floor noted. Human sharing and copy still use the permalink URL, so MNR-7 is
  unaffected.

## Dogfood, naming, responsive, a11y, new routes

Dogfood guardrail. The served surfaces pass slop-detect's own detector. A grep of
apps/web/public and apps/web/functions finds no slop font stack (no Inter, Geist, or
Space Grotesk) in any font-family declaration or Google Fonts request; the only mentions
are explanatory comments. There is no purple CTA: the only "purple" strings are comments
stating the brand forbids it, plus the single bounded letter-avatar palette color
(#7A4D9A in _theme.ts), which the spec explicitly permits as an avatar chip and never as
a CTA or accent. There is no background-clip:text, no gradient text, and no
linear/radial-gradient on the home page, the badge, or the OG card. The /brand page is
the strict proof surface; brand.test.js encodes "this page scores 0/100, A+, Clean" by
asserting the five swatches, the do/don't cards, three badge examples, no slop fonts, no
gradient text, and no purple as a CTA or accent. The engine's own golden suite,
re-run here against its clean and slop fixtures, confirms the detector still scores a
clean page Clean and trips the canonical tells on a slop page.

Naming (parity-spec D11). Consistent. "Slop Detector" is the proper noun in prose and
SEO (index.html <title>, og:title and meta description, and across functions/blog.tsx,
directory.tsx, index.ts, score/[domain].tsx, report/[domain].tsx, plus pricing.md,
privacy.md and llms.txt). Lowercase "slop-detect" appears only as the wordmark, the CLI
(`npx slop-detect`), and the domain (slop-detect.com); brand.tsx states the rule
directly ("Always lowercase. Always hyphenated"). No violations found.

Responsive and a11y basics. _brand.ts ships `:focus-visible` focus rings,
`prefers-reduced-motion` handling, and named responsive breakpoints. Charts and the badge
expose `role="img"` and an `aria-label`; brand color swatches expose their hex as text,
not color only. Dashboard and report are noindex. Ledger sections stack at mobile width.

New routes. The two NEW routes exist and are crawlable: /docs (functions/docs.tsx) and
/brand (functions/brand.tsx) are both listed in public/sitemap.xml, and
seo-version.test.js asserts their presence in the sitemap.

## Residual risks and documented limitations

- Score-hub competitive analytics renders 3 charts, not 4. The Analytics section in
  functions/_result.tsx draws score-over-time (when history has 2+ points), the
  cleanliness radar, and the slop distribution (when 5+ scans exist). The 4th chart, a
  per-category corpus-average overlay on the radar (the "rank-average polygon"), is
  omitted because per-category corpus averages are not in the persisted slim record, and
  the dogfood rule bars fabricating a number (_result.tsx: "No rank-average polygon,
  per-category corpus averages are not persisted, so it is omitted rather than faked").
  This is a frozen spec decision, not a regression. The radar still renders the domain's
  own per-category cleanliness, and the slop distribution still gives the corpus-relative
  percentile, so the competitive context is present, just without the peer-average
  overlay.
- The CLI golden suite needs a Chromium binary and is gated behind RUN_GOLDEN=1. It
  passes when run with a browser (verified here) but is skipped in the default
  browser-free unit run. This is the intended split between the unit job and the CI smoke
  job, not a coverage gap.

No other broken served residuals (dead links, placeholders, console-error patterns) were
found while walking the served files.

## Step 1 residual fixes

The residual named in the build plan (the stale "2026.08" defs-version example near line
782 of apps/web/public/openapi.json) was already corrected to "2026.09" by PR #58
(seo-version-consistency), so no change was needed. The only other "2026.08" strings in
served files are the per-pattern `since` provenance column in
apps/web/public/api/patterns.md, which records the defs version each pattern was first
added in (the engine's `p.since`); those are historical and correct, not a stale
catalogue label, and seo-version.test.js explicitly bans only the "Version 2026.08,"
header form (the header already reads "Version 2026.09, 27 patterns"). Changing the
`since` values would have been a regression, so they were left intact. The 2026.08
strings in apps/web/test fixtures are legitimate past-scan data and were not touched, per
the build plan. No served residual required a code change.

## Merged PRs (#39 to #60)

| PR  | Title                                                                   |
|-----|-------------------------------------------------------------------------|
| #39 | docs: extract the editorial-instrument design system + landing assets   |
| #40 | docs: inventory the existing web product (the 28-point parity floor)    |
| #41 | docs: parity map + frozen build spec for the new landing                |
| #42 | feat(web): foundation, light theme + _theme/_ui groundwork (task 00)    |
| #43 | feat(web): swap favicon to the new reticle paper tile (task 14)         |
| #44 | feat(web): restyle badge to the two-segment editorial pill (task 12)    |
| #45 | feat(web): re-theme OG share card + static OG assets (task 13)          |
| #46 | feat(web): shared UI component library, _ui.tsx (task 01)               |
| #47 | feat(web): new /docs methodology route (task 10)                        |
| #48 | feat(web): leaderboard (task 06)                                        |
| #49 | feat(web): brand page, the dogfood proof (task 11)                      |
| #50 | feat(web): home landing (task 02)                                       |
| #51 | feat(web): score hub, the spine (task 03)                               |
| #52 | feat(web): dashboard (task 08)                                          |
| #53 | feat(web): directory (task 07)                                          |
| #54 | feat(web): blog (task 09)                                               |
| #55 | feat(web): aux rendered pages, watch-confirm + compare (task 15)        |
| #56 | feat(web): result permalink (task 04)                                   |
| #57 | feat(web): printable report (task 05)                                   |
| #58 | feat(web): seo + version consistency, sitemap + defs drift (task 16)    |
| #59 | feat(web): api/scan contract-shape test (task 17)                       |
| #60 | feat(web): residual cleanup                                             |
