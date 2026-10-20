# Code status audit: roadmap v4 items vs the actual code

Audit date: 2026-10-20. Read-only.

**Baselines**
- **main:** `/tmp/wt-roadmap-final` at `3e57392`. `git diff d37e91c..HEAD -- packages apps spec .github` is empty, so the code is byte-identical to the commit the v4 report audited. All `main` line numbers below are therefore also valid at `d37e91c`.
- **PR #217:** `/tmp/wt-launch-fixes`, one commit `34a4da1` on top of main, branch `fix/launch-readiness`. It is OPEN and MERGEABLE, and every check is green (lint, typecheck, unit, CLI smoke, preview).

**Status legend**
- **DONE-main:** shipped on main.
- **DONE-#217:** lands when PR #217 merges.
- **PARTIAL:** some of the item exists; the notes say what.
- **NOT STARTED:** nothing found.

**Effort:** S is up to about 1 day, M is a few days, L is a week or more.

**Path abbreviations**
- `core/` = `packages/core/src/`
- `cli/` = `packages/cli/`
- `mcp/` = `packages/mcp/src/`
- `web/` = `apps/web/`
- `wf/` = `.github/workflows/`

**Note on PR #217 line numbers:** they refer to the PR checkout. PR #217 adds 5 lines above `icon_card_grid` and roughly 17 lines across the two detectors, so later `patterns.ts` lines shift by about +20 there.

---

## 1. v3 issues #196–#213

None of the issues has been relabelled. `gh issue view` shows all 18 OPEN, last edited 2026-10-19, and 14 of them still carry `research:backed`. The `evidence:*`, `roadmap:v4`, `rule:weight-0`, `axis:craft` and `priority:P*` labels exist in the repo but are not applied to any issue.

| ID | Status | Evidence (file:line) | Effort | Depends on | Notes |
|---|---|---|---|---|---|
| #196 Potemkin UI | NOT STARTED (prerequisite in #217) | `core/patterns.ts:515-548` (`icon_card_grid`, grouped by parent *tag* at `:539`); PR #217 regroups by parent identity (`patterns.ts:520-555` in the PR); `ai_sparkle_badges` `:802` | M | FIX-02, K-03/K-04 (weight-0 plumbing), K-05 | No terminal, logo-bar or `href="#"` code. The issue body still cites Sketch2Code and the "Sarah Chen"-era framing. |
| #197 Motion | NOT STARTED | No `getAnimations`, marquee or reduced-motion code anywhere in `core/` | M | K-04, D-01 (`madeWith` gets the class signatures), F-04/F-06 | Detection needs live animation state, so the shared `ctx` must change in both runners. |
| #198 Layout entropy | NOT STARTED | – | M | K-04, F-00 (for `text_overflow_collision`) | – |
| #199a Dark-bg contrast | NOT STARTED | `core/patterns.ts:967` (`if (bgLum < 0.6) continue`) | S | FIX-05 (gradient stops in `effectiveBackground`, `core/color.ts:118-131`) | Same item as FIX-08. |
| #199b Browser surfaces | NOT STARTED | – | S-M | K-04 | – |
| #200 Stylometric copy | NOT STARTED | Nearest code: `rule_of_three` `core/copyPatterns.ts:246`, `antithesis_construction` `:174` | M | C-01 (length/lang gate), K-01 (marketing corpus) | – |
| #201 Lexicon weights | NOT STARTED | Flat 59-word list `core/copyPatterns.ts:46-106`, trigger `:141` | L | K-01 corpus (pre-2022 control and builder set), C-01 | Needs a committed script and corpus manifest. |
| #202 Fake proof | NOT STARTED | Only `gradient_letter_avatars` `core/patterns.ts:656` | M | K-04, D-01 (logo-bar overlap with #196) | – |
| #203 Oklab ΔE | NOT STARTED | `core/system.ts:171-216` parses hex/rgb/hsl only; `:218-230` L∞ ±10 tolerance with exact-string fallback; `packages/core/test/system.test.js:89` *asserts* `parseCssColor('oklch(...)') === null`; `spec/system.md:22-24` claims "CIELAB ΔE ≤ 12/14" | M | FIX-05 (shared parser) | The test that pins the oklch blind spot must be inverted. Spacing is parsed (`system.ts:128`) but no check uses it (`:348-354`). |
| #204 DTCG + extraction | PARTIAL | `generateDesignMd()` `core/system.ts:541-647`; `--init-design-md` in `cli/bin/slop.ts` | a: M, b: M | #203/FIX-05; b also needs W-01 | No `tokens.json` input, no `--extract-tokens`, no MCP `extract_design_system`. |
| #205a Server text coverage | NOT STARTED | – | M | A-02 (same item) | – |
| #205b JSON-LD hygiene | NOT STARTED | No `ld+json` handling in `core/` | S-M | A-02 (needs no-JS text) | README claims it exists (FIX-03). |
| #206 AEO hardening | NOT STARTED | `core/aeo.ts:573` (llms 2xx), `:303-350` (robots), `:513-530` (`.md` only), `:585` (Vary) | M | FIX-14, FIX-15, A-05 | All four of the issue's bugs are still present. |
| #207 Confidence/presets/waivers | PARTIAL | `core/presets.ts:15-44` (4 filter-only presets); applied only to the design axis, `cli/src/detector.ts:348` | a: M, b: S, c: M | a: K-01 (lift); c: S-03, W-01 (`waivedPatterns[]` in schema) | No `.sloprc.json`, `data-slop-ignore`, confidence or co-occurrence code. |
| #208 Locations / annotate | NOT STARTED | `--screenshot` adds only a base64 PNG (`cli/src/detector.ts` ~`:402`) | M (locations), M (overlay) | W-01 | Locations then feed #211. |
| #209 Baseline ratchet | NOT STARTED | Only watch "regression" logic, `web/functions/_data.ts` ~`:923` | M | K-10, W-01 | – |
| #210 Static dist / crawl | NOT STARTED | `cli/bin/slop.ts:201-207` rejects `file:` and other schemes; `./dist` becomes `https://./dist` (`:208`) | M | – | Core `scanUrl` already handles `file://` (`cli/test/pattern-coverage.test.js` and the golden fixtures use it). |
| #211 SARIF | PARTIAL | `buildSarifReport` `cli/src/detector.ts:204-290`; `--sarif` `cli/bin/slop.ts:83` | M | #208 locations, W-01 | Has a schema URL, rules and URI locations. No `partialFingerprints`, no `help.markdown` from `FIXES`, no AEO results, no category per URL. The Action has no SARIF path. |
| #212 MCP v2 | PARTIAL (largely shipped) | Annotations `mcp/server.ts:45,89,116,142`; prompts `:179,:191`; resources `slop://spec/patterns` `:232`, `slop://spec/design-md-template` `:239`; stdio only `:393`; SDK `^1.29.0` (`packages/mcp/package.json:48`); resource listing tested at `packages/mcp/test/server.test.js:37-38` | M | W-01 (outputSchema), W-03 | Missing: `slop://spec/aeo`, `outputSchema`/`structuredContent`, icons, prompt tests, `--init-hooks`, local mode. |
| #213a Calibration v2 | PARTIAL (harness only) | `cli/calibration/run.mjs`, `corpus.json` (13 labelled); `wf/calibrate.yml` monthly, report-only; PR #217 adds failure counting, pacing and 10 unlabelled candidates | L | K-01 | – |
| #213b Webhooks + version | NOT STARTED (webhooks) | History point has no version: `web/functions/_data.ts:536-546` | M | K-10 | Multi-domain dashboard ships (`web/functions/dashboard.tsx`). |

## 2. FIX items

| ID | Status | Evidence (file:line) | Effort | Depends on | Notes |
|---|---|---|---|---|---|
| FIX-01 Publishing security | PARTIAL in #217 | main: `wf/publish.yml:11,44-47,77,83,89` (NPM_TOKEN), `:33` `environment: production`. #217: `permissions: {contents: read, id-token: write}` and `--provenance` (`publish.yml:41-43`, mode step), but still `NODE_AUTH_TOKEN: secrets.NPM_TOKEN` | S (workflow) plus manual npm/GitHub settings | – | The `production` environment has **no protection rules and no branch policy** (`gh api .../environments` returns `protection_rules: []`, `deployment_branch_policy: null`). Any branch's `workflow_dispatch` with `dry_run: false` can publish. Other gaps: no OIDC trusted publishing, `setup-node` 22 (npm 10, below 11.5.1), `bun install` without `--frozen-lockfile` or ignore-scripts, no immutable releases. |
| FIX-02 Unmerged detector/web fixes | DONE-#217 (minus deltas) | PR: `core/patterns.ts:520-555` (`icon_card_grid` by parent identity), `:565-597` (`numbered_steps` table/nav exclusion plus the >6 guard); `packages/core/test/patterns-grouping.test.js`; `core/index.ts:92` `2026.10`; `web/functions/_ssrf.ts:122-152` `isSameSiteRedirect`; `api/scan.ts` KV cache (`scancache:v1`, TTL 600); `api/_middleware.ts` JSON 404 | S (remaining) | – | Not done: the changelog has no leaderboard score deltas, and `web/public/leaderboard.json` is still `definitionsVersion 2026.09` (generated 2026-09-15). |
| FIX-03 False/stale claims | PARTIAL | Guards exist: `web/test/truth.test.js:55-70`, `packages/core/test/spec-sync.test.js:20-60`. Still wrong: README `:430` (JSON-LD/SSR AEO), ROADMAP `:21` (Accept negotiation; `web/public/_headers:25,29,56` send `Vary: Accept` without negotiating), `spec/system.md:22-24`, unqualified 74/76/90% (`core/patterns.ts:30-32,855,990`; `spec/patterns.md:121,129`; `core/fixes.ts:386`), `@slop-detect/core` in README `:9,52,397` (npm: `@slop-detect/core` is 404, `slop-detect-core@0.8.0` exists), `web/public/index.html:737` "(9 tells)", `:798` "10/27" | S-M | – | PR #217 fixes none of these. `truth.test.js:66-68` itself hardcodes `27/9/8`, which breaks the AGENTS.md rule and will fail on every pattern addition. The docs-claims test should derive counts, not pin them. |
| FIX-04 Third-party grades | NOT STARTED | `web/functions/leaderboard.tsx:123`, `score/[domain].tsx:66` (reads `leaderboard.json`); same-category peers `web/functions/_result.tsx:970` | M | K-06 copy | The directory is already opt-in (MNR-27). PR #217 makes it email-verified only with `rel="ugc nofollow"` (`_data.ts:1041`, `directory.tsx:100`). The leaderboard is not opt-in. |
| FIX-05 CSS Color 4 | NOT STARTED | Regex extractors: `core/patterns.ts:104` (purple gradient stops), `:175` (gradient opacity), `:279` (glow shadows), `core/color.ts:126` (`effectiveBackground` stops); Node: `core/system.ts:173-216` | M-L | – (foundation) | **Nuance (see §3):** solid colours go through the canvas `parseColor` (`core/color.ts:12-27`), which accepts oklch in Chromium, so solid oklch fills are already classified. Only gradient stops, shadows and `system.ts` are blind. |
| FIX-06 Purple window | NOT STARTED | `core/color.ts:60-64` (HSL 240–295°) | S-M | FIX-05 (OKLCH math shared), K-03 (`decaying`), #207a (co-signal) | – |
| FIX-07 Font double count | NOT STARTED | `core/patterns.ts:368-370` (`centered && big && slopFont`); `slop_fonts` `:77` | S | – | Patterns are scored independently (`core/index.ts:97-99` sums weights), so a post-pass (cross-pattern rule) is needed. A hook for that will also serve FIX-06, C-07 and #207a. |
| FIX-08 Dark contrast | NOT STARTED | `core/patterns.ts:967` | S | FIX-05 (gradient backgrounds) | Same item as #199a. Later moves to F-00. |
| FIX-09 `eyebrow_label` | NOT STARTED | `core/patterns.ts:432` (`textTransform !== 'uppercase'`) | M | – | D-04 depends on it. |
| FIX-10 Gradient salience | NOT STARTED | `core/patterns.ts:161-194` (`n >= 5`; an unparsed stop counts as opaque, `:176`) | S-M | FIX-05 | – |
| FIX-11 Unicode false positives | NOT STARTED | `core/copyPatterns.ts:298-321` (`zeroWidth >= 1 \|\| narrowNbsp >= 1`) | S | C-01 (`lang` for U+202F) | – |
| FIX-12 Live-DOM text | NOT STARTED | `core/text.ts:15,24` (`innerText` on a detached clone, so it behaves like `textContent`) | M | – | This is the core of C-01. Both runners serialize it, so `bun run test` is mandatory (AGENTS.md). |
| FIX-13 `edge.access` | NOT STARTED | `core/aeo.ts:202` (`GPTBot/1.2` UA), `:437-462`, `:454` (`bot.ok`); no `cf-mitigated` read anywhere | M | A-08 (`/bot` page first), weights row | The challenge heuristics in `core/page-script.ts:56-67` (`cloudflare_challenge`) can be reused. |
| FIX-14 Robots RFC 9309 | NOT STARTED | `core/aeo.ts:303-350` (no Allow, no precedence, prefix-only), `:466-494` (non-OK or error treated as allow-all), `:483` | M | – | The registry already has `purpose` (`core/aeo.ts:23-150`) but the check ignores it. |
| FIX-15 llms/twin/Vary | NOT STARTED | `core/aeo.ts:563-578` (any 2xx llms), `:513-538` (`.md` only, content-type gate `:530`), `:582-591` (Vary) | M | Applicability scoring (weights row) | – |
| AEO v0.9 weights (table) | NOT STARTED | `core/aeo.ts:160-198` (10/25/20/15/10/8/7/5) and `:599-602` (earned ÷ total; no N/A) | S | FIX-13/14/15, A-01, A-02 | Unreachable HTML currently also fails `indexable`, `linkAlternate` and `vary` (`:509,554,594`): 28 extra points lost, 38 counting `html.reachable`. |
| FIX-16 Overclaiming copy | NOT STARTED | `core/aeo.ts:370-374` (`AI-Ready`), `web/public/index.html:100,147,950` ("read & cite"), `skills/slop-detect/SKILL.md:16,95`, `web/functions/docs.tsx:741`, `web/functions/_posts.ts` ("major AI crawlers"), `web/public/robots.txt` comment calls GPTBot and ClaudeBot "SEARCH / ANSWER crawlers" | S | – | – |
| FIX-17 Self-assessment / discovery | PARTIAL | `web/public/.well-known/mcp/server-card.json` exists (stdio transport); `/.well-known/mcp.json` still published; no `ard.json`; no self-scan report | S-M | K-05, A-05 | – |

## 3. Design (D), craft floor (F), copy (C), DESIGN.md (S), AEO (A)

| ID | Status | Evidence | Effort | Depends on | Notes |
|---|---|---|---|---|---|
| D-01 `madeWith[]` | NOT STARTED | No generator, `data-framer` or Lovable markers in `core/`, `cli/` or `web/functions` | M | W-01 (field in schema) | Prerequisite for K-01 stratum (c), #207a covariate, #197 class signatures. `leaderboard.json` `builtWith` is hand-tagged. |
| D-02 `scaffold_defaults_unedited` | NOT STARTED | – | S | C-01 tiers (Warning) | – |
| D-03 `hero_accent_word` | NOT STARTED (seed exists) | `accentSerifItalicCount` `core/patterns.ts:63-65,76` | S-M | FIX-05 (ΔE_OK), K-04 | See new gap G-07. |
| D-04 `template_chrome_2026` | NOT STARTED | – | M | FIX-09, K-04, K-05 | – |
| D-05 `uniform_radius_shadow` | NOT STARTED | – | M | FIX-05 (shadow alpha parse), K-04 | – |
| D-06 `editorial_cream_kit` | NOT STARTED (overlap) | `cream_default_bg` `core/patterns.ts:858` (weight 7, scored) | M | FIX-05, #207b presets, K-01 | – |
| D-07 `accent_stripe` amend | PARTIAL | `core/patterns.ts:205-231` already flags **top** stripes (≥3 px, thicker than the other sides, ≥2 cards) | S | – | Missing: the ≥2 px threshold, bottom borders, colour-difference test, rounded-card requirement, `role=alert/note/status` exclusion. |
| D-08 rendered font face | NOT STARTED | `core/fonts.ts:28-33` (first declared family only) | M | – | List changes need K-03 (`decaying`). |
| D-09 `template_page_order` | NOT STARTED | – | M | #198 section signature, #196 logo bar | – |
| D-10 watchlist | NOT STARTED | No `--experimental` flag (`cli/bin/slop.ts` flag set: `--aeo --api --axes --copy --design-md --fail-on --fail-under --fix --fix-prompt --init-design-md --json --preset --remote --sarif --screenshot --timeout --verbose`) | S each | K-03/K-04 | – |
| F-00 craft axis | NOT STARTED | `AXES = ['design','copy']` `core/index.ts:75` | M | W-01, K-03 | `gray_on_color` `:1032`, `wide_body_tracking` `:1208` and `low_contrast_text` `:922` would move here. |
| F-01 viewport/zoom | NOT STARTED | – | S | F-00 | – |
| F-02 mobile reflow | NOT STARTED | – | M | F-00 | Needs a second viewport pass in both runners. The web runner fixes 1280×800 (`web/functions/api/scan.ts`, `setViewport`). |
| F-03 focus indicator | NOT STARTED | – | L | F-00 | – |
| F-04 stuck hidden content | NOT STARTED | – | M | F-00 | – |
| F-05 dead CTAs | NOT STARTED | – | L | F-00 | Request interception must be proven side-effect-free on the Cloudflare runner. |
| F-06 reduced motion | NOT STARTED | – | M | F-00, #197 animation capture | – |
| F-07 axe | NOT STARTED | – | M | F-00 | Shares integration with A-04. |
| C-01 gating + tiers | NOT STARTED | Only a `< 40` words "thin" gate, `core/index.ts:123`; no `lang` read in `core/` | M-L | FIX-12 (same extractor) | Prerequisite for C-02…C-09, FIX-11, #200. |
| C-02 `chatbot_markup_leak` | NOT STARTED | – | M | C-01 (attribute scan plus tiers), spec registry | Must not fire on slop-detect's own spec pages. |
| C-03 `chatbot_reply_residue` | NOT STARTED | – | S-M | C-01 | – |
| C-04 `ai_referral_utm_links` | NOT STARTED | – | S | C-01 (needs `href` collection in `extractTextContext`) | – |
| C-05 `unfilled_placeholders` | NOT STARTED | – | S | C-01 | – |
| C-06 `leaked_markdown` | NOT STARTED | – | S-M | C-01 | – |
| C-07 decay re-weighting | NOT STARTED | `em_dash_overload` `core/copyPatterns.ts:148`, `formulaic_closers` `:230`, `rule_of_three` `:246` | S | C-01 tiers, K-03 status, FIX-07-style post-pass | – |
| C-08 antithesis forms | NOT STARTED | `core/copyPatterns.ts:174-200` | S | – | – |
| C-09 emoji refresh | NOT STARTED | `core/copyPatterns.ts:329-350` (count ≥ 3, no ratio) | S | – | – |
| C-10 watchlist | NOT STARTED | – | S | D-10 `--experimental` | – |
| C-11 model detector | Deferred (correctly absent) | – | – | – | – |
| S-01 `coverage.<class>` | NOT STARTED | 5 checks only, `core/system.ts:348-354` | L | #203/FIX-05 | – |
| S-02 `@google/design.md` | NOT STARTED | Hand-rolled front-matter parser in `core/system.ts` (top of file to `:131`) | M | – | – |
| S-03 waivers from intent | NOT STARTED | – | M | #207c (`waivedPatterns[]`), FIX-05, W-01 | – |
| S-04 type styles | NOT STARTED | – | M | S-01 | – |
| S-05 component contrast | NOT STARTED | – | S-M | S-01, FIX-08 | – |
| S-06 shadow/motion tokens | NOT STARTED | – | M | #204a | – |
| A-01 `ai.previewControls` | NOT STARTED (seed) | `htmlHasNoindex` `core/aeo.ts:352-359` (noindex only; no `none`, no `googlebot`/`bingbot` meta, and a `botname:`-prefixed X-Robots-Tag is applied to everyone) | S-M | Weights row | – |
| A-02 server text coverage | NOT STARTED | – | M | C-01 main-text extractor | Needs a JS-disabled render in both runners. |
| A-03 `ai.manipulation` | NOT STARTED | – | M | C-01 (visibility filtering) | – |
| A-04 accessibility tree | NOT STARTED | – | M | F-07 (axe) | – |
| A-05 discovery parity | PARTIAL (site side only) | `web/public/.well-known/{agent-card.json, agent.json, mcp.json, mcp/server-card.json, agent-skills/index.json}` | M | – | The site publishes cards, but `core/aeo.ts` probes none of them, and there is no ARD. |
| A-06 usage policy panel | NOT STARTED | – | M | FIX-14 robots parser | slop-detect.com's own `robots.txt` would be flagged (see new gap G-10). |
| A-07 freshness | NOT STARTED | – | S-M | A-02 (visible text) | – |
| A-08 scanner identity | NOT STARTED | AEO UA `core/aeo.ts:201` (`+https://slop-detect.com`, no `/bot`); web design scan UA `web/functions/api/scan.ts:146` (`+slop-detector.pages.dev`, stale host); CLI UA `cli/src/detector.ts:297` (GitHub URL); no `web/public/bot*` | S | – | Must ship before FIX-13. |

## 4. Calibration (K), workflow (W), distribution (R)

| ID | Status | Evidence | Effort | Depends on | Notes |
|---|---|---|---|---|---|
| K-01 protocol v2 | PARTIAL (v1 harness) | `cli/calibration/run.mjs`, `corpus.json`; `wf/calibrate.yml` (monthly, report-only; PR #217 adds `pipefail`) | L | D-01 (stratum c), FIX-05…FIX-12 (calibrating before the fixes tunes against a moving target) | No strata, raters, held-out split or likelihood ratios. |
| K-02 evidence grades | PARTIAL | Labels exist (`evidence:measured/standard/practitioner/hypothesis`); 14 issues still `research:backed`; `ROADMAP.md:7` adds an "under review" banner only | S | – | Issue bodies are unchanged (#206 still cites `aeo.ts:557` and `mcp.json`). |
| K-03 lifecycle metadata | PARTIAL | Only `since` (`web/functions/api/patterns.ts:24,33`; `core/rules.ts:163`) | M | – | Prerequisite for K-04, FIX-06, C-07, D-08, F-00. |
| K-04 experimental gate | NOT STARTED | `scorePatterns` sums every triggered weight, `core/index.ts:97-99` | S | K-03 | – |
| K-05 pioneer suite + dogfood | NOT STARTED | Golden tests use synthetic fixtures only (`cli/test/golden.test.js`, `cli/test/fixtures/`). Linear, Vercel and Stripe are in `corpus.json` labelled Clean but scored Heavy, Heavy and Mild, and calibrate is report-only | M | FIX-02, FIX-07, FIX-10 (otherwise it starts red) | – |
| K-06 harm-avoiding language | NOT STARTED | `core/verdict.ts:40,52-55` ("Crafted, not generated", "Straight off the AI assembly line", "Cursor/v0/Bolt starter kit"); `skills/slop-detect/SKILL.md` ("detect AI-generated design") | S-M | – | – |
| K-07 craft covariate | NOT STARTED | – | M | K-01 | – |
| K-08 crosswalk | NOT STARTED | `spec/patterns.md:39` gives only coarse attribution | M | – | – |
| K-09 quarterly re-validation | NOT STARTED (cron exists) | `wf/calibrate.yml` monthly schedule | M recurring | K-01 | – |
| K-10 definitions integrity | NOT STARTED | `web/functions/_data.ts:536-546` (no `definitionsVersion` on the history point) | S-M | – | Becomes urgent once PR #217 bumps to 2026.10. Watch history will then mix versions silently. |
| W-01 scan-result schema | NOT STARTED | No `schemas/` directory | M | – | Foundation for #208, #209, #211, #212, F-00, D-01. |
| W-02 universal CI surfaces | PARTIAL | `packages/action/scan.mjs:66-90` (per-pattern `::warning`), `:102` (`GITHUB_STEP_SUMMARY`), `:475` (`::error`), `fail-under` `action.yml:30` | S | – | Missing: `--min-score` alias, check run, optional SARIF upload. |
| W-03 local MCP scanning | NOT STARTED | MCP is an HTTP client of the API (`mcp/api.ts`), stdio only (`mcp/server.ts:10,393`) | L | W-01, FIX-01 (publish path) | – |
| W-04 AEO fix-file generator | NOT STARTED | – | M | FIX-14 (purpose map), A-05 | – |
| W-05 Vale export | NOT STARTED | – | S-M | C-01…C-07 | – |
| R-01 skills.sh | PARTIAL | `skills/slop-detect/SKILL.md` (valid name, description about 560 chars, but says `definitions@2026.09` and "detect AI-generated"); `web/public/.well-known/agent-skills/index.json` | S | K-06/FIX-16 copy | No CI frontmatter validation. Install not verified. |
| R-02 MCP Registry | NOT STARTED | No `packages/mcp/server.json`; no `mcpName` (`npm view slop-detect-mcp mcpName` is empty) | S | FIX-01 | – |
| R-03 Claude Code plugin | NOT STARTED | No `.claude-plugin/`, no `plugins/` | S | R-01 | – |
| R-04 remote MCP | NOT STARTED | No `/mcp` function in `web/functions` | L | W-01 | – |
| R-05 Marketplace Action repo | NOT STARTED | Action lives at `packages/action/action.yml` | S-M | FIX-01 (immutable releases) | – |
| R-06 Agent Plugins / Cursor | NOT STARTED | – | S-M | R-03 | – |
| R-07 MCP Apps card | NOT STARTED | – | M | R-04, W-01 | – |
| R-08 OpenAI plugin | NOT STARTED | – | M | R-01, R-04 | – |
| R-09 positioning | NOT STARTED | – | S | K-01 results, FIX-04, K-05 | – |

---

## Claims that are now wrong, or need qualifying

Every claim below was checked against `3e57392` (code identical to `d37e91c`).

**Verified true**
- `isPurple` is HSL 240–295° (`core/color.ts:64`). Tailwind v3 indigo-500 `#6366f1` comes out at 238.7°.
- The GPTBot UA is `GPTBot/1.2` (`core/aeo.ts:202`), and any 2xx passes (`:454`).
- A non-OK or failed robots.txt fetch counts as allow-all (`:478-484`).
- The robots parser ignores Allow lines and group precedence.
- `centered_hero` is gated on a slop font (`core/patterns.ts:370`).
- `low_contrast_text` skips backgrounds with luminance below 0.6 (`:967`). zinc-500 on zinc-950 is 4.12:1.
- The DESIGN.md matcher uses ±10 L∞ with an exact-string oklch fallback (`core/system.ts:218-230`). rgb(10,10,10) vs black is ΔE_OK 0.145.
- Text extraction uses a detached clone (`core/text.ts:24`).
- The unicode rule fires on a single ZWJ/ZWNJ/NNBSP (`core/copyPatterns.ts:321`).
- `CALIBRATION.md:123` reports 5/13 (38.5%) with no Heavy labels (`:126`).
- `leaderboard.json` (2026-09-15) has cal.com 31/D+, resend.com 34/D and clerk.com 36/D, all Heavy.
- README `:430`, `index.html:737/798` and `spec/system.md:22-24` are as described.
- `slop-detect-core` is the name on npm, and `@slop-detect/core` is 404.

**Wrong or overstated**
1. **"Tailwind v4 `oklch()` colours fall through to exact-string matching … the regex extractors read only rgb() and hex … hides purple."** This is true for `system.ts` and for regex-scanned gradient stops and shadows (`core/patterns.ts:104,175,279`; `core/color.ts:126`). It is **not** true for solid fills and borders.
   - `parseColor` paints the computed string onto a canvas (`core/color.ts:12-27`). Chromium's canvas accepts CSS Color 4 (`oklch`, `oklab`, `color()`), so a solid `bg-indigo-500` in v4 is converted to sRGB and classified.
   - Tailwind v4 indigo-500 (≈ rgb(97,95,255)) has an HSL hue of about 240.7°, so it **already fires** `purple_accent`, while v3's `#6366f1` (238.7°) does not. The v3/v4 asymmetry is therefore the reverse of the one the report implies.
   - FIX-05's acceptance test ("v4 fixtures trigger exactly like their v3 hex twins") would currently be satisfied by *breaking* v4, unless FIX-06 lands at the same time.
   - This was established by reading the code. Chromium could not be launched in this sandbox (missing `libatk`), so it should be confirmed with a real-browser fixture, as FIX-05 already requires.
2. **D-07 implies `accent_stripe` misses top stripes.** It already flags them: `core/patterns.ts:221-223` flags a top border of ≥3 px that is thicker than the other sides. The real gaps are the 2 px threshold, bottom borders, colour difference, rounded cards and alert exclusion.
3. **"The site also publishes a non-standard `/.well-known/mcp.json`" (FIX-17), with A-05 framed as greenfield.** The site *also* already publishes `/.well-known/mcp/server-card.json`, which A-05 lists as a target, plus `agent-card.json` and `agent-skills/index.json`. A-05's site-side half is partly done. Only the probe in `aeo.ts` and ARD are missing.
4. **FIX-02 "sits only on commit 355f588".** This is now stale: the fixes are rebased into PR #217 (`34a4da1`), and its CI is green.
5. **FIX-03 "Add a docs-claims CI test" as if none exists.** `web/test/truth.test.js:55-70` and `packages/core/test/spec-sync.test.js` already pin counts and IDs for some surfaces. The work is extending them to package names, check IDs and `index.html:737/798`, and removing their own hardcoded `27/9/8`.
6. **W-02 is framed as new work.** The Action already writes a step summary and per-pattern `::warning`/`::error` (`packages/action/scan.mjs:66-102,475`). Only the alias, the check run and SARIF are missing.
7. **#211 is framed as an "upgrade" from nothing.** A basic SARIF 2.1.0 emitter and `--sarif` already exist (`cli/src/detector.ts:204-290`). Code-wise the report's scope is correct, but the effort is smaller than "new".
8. **The report quotes "aeo.ts:557" (via the #206 issue body) and "fix to 573 and 303".** 573 and 303 are correct. The issue body still says 557 and 333.
9. **The FIX-01 assumption that a `production` environment gates releases.** The environment exists (`publish.yml:33`) but has zero protection rules and no branch policy, so it currently gates nothing.

## New gaps the report missed

| # | Gap | Evidence | Fold into |
|---|---|---|---|
| G-01 | **Publish environment is unprotected.** Any branch's manual dispatch with `dry_run: false` (PR #217) or any dispatch on main's workflow publishes with `NPM_TOKEN`. | `gh api repos/ravidsrk/slop-detect/environments`: `protection_rules: []`, `deployment_branch_policy: null`; `wf/publish.yml:33` | FIX-01 (P0) |
| G-02 | **PR #217's publish comments contradict the package name.** It says "the `slop-detect` npm ORG must exist so the scoped @slop-detect/core package can be published", but `prepack` renames core to `slop-detect-core` (`packages/core/package.json:60-61`). `bun pm pack` names the tarball `slop-detect-core-*.tgz` *either way*, so the glob cannot tell whether the rename ran, and a run with lifecycle scripts skipped would publish the scoped name. | PR `wf/publish.yml` header and pack step | FIX-01 / FIX-03: assert `package/package.json` `.name` in the tarball |
| G-03 | **Pages over 2 MB by Content-Length get an empty body.** `noindex` is then never seen, so `html.indexable` passes falsely, and in-document `rel=alternate` is missed. | `core/aeo.ts:244-250` (`readBodyCapped` returns `''`), used at `:423` | FIX-15 / A-01 |
| G-04 | **Unreachable HTML cascades.** `html.indexable`, `html.linkAlternate` and `html.vary` all *fail* (not N/A) when the page is unreachable, so one network failure costs 38 of 100 (28 beyond `html.reachable` itself). | `core/aeo.ts:509,554,594` | AEO weights (applicability) |
| G-05 | **Three different scanner identities, one with a stale host.** | `core/aeo.ts:201`; `web/functions/api/scan.ts:146` (`slop-detector.pages.dev`); `cli/src/detector.ts:297` | A-08 |
| G-06 | **KV result cache key omits `DEFINITIONS_VERSION`.** After a definitions deploy, up to 10 minutes of results scored under the old version are served. | PR `web/functions/api/scan.ts` `scancache:v1:${url}\|…` | K-10 (add the version to the key) |
| G-07 | **`slop_fonts` fires 8 points on a single italic accent-serif element** (one Fraunces/Playfair italic word), independent of the Inter/Geist logic. This is a larger false-positive source than FIX-07 and overlaps D-03. | `core/patterns.ts:62-64,77` | D-03 / D-08 (move to weight-0 `hero_accent_word`) |
| G-08 | **The oklch blind spot is pinned by a test.** | `packages/core/test/system.test.js:89` expects `parseCssColor('oklch(...)')` to be `null` | #203 / FIX-05 |
| G-09 | **Leaderboard and engine versions diverge after PR #217.** The engine is 2026.10, while `leaderboard.json` and the peers on `/r/:id` stay 2026.09 data. | `web/public/leaderboard.json` `definitionsVersion`; `_result.tsx:970` | FIX-02 / FIX-04 / K-10 |
| G-10 | **slop-detect.com's own robots.txt is self-contradictory.** It sets `Content-Signal: ai-train=no` but explicitly `Allow`s GPTBot, ClaudeBot and Anthropic-AI (training crawlers), and its comment calls them "SEARCH / ANSWER crawlers". `/.well-known/oauth-protected-resource` advertises scopes with `authorization_servers: []` for an unauthenticated API. | `web/public/robots.txt:5-30`; `web/public/.well-known/oauth-protected-resource` | FIX-16, A-06, FIX-17 dogfooding |
| G-11 | **`html.vary` is satisfied by the site's own non-negotiating `Vary: Accept`.** This shows the check rewards a header, not behaviour. | `web/public/_headers:25,29,56` | FIX-15 |
| G-12 | **Presets silently do nothing for copy, AEO and system.** The API and CLI accept `preset` with all axes, but it is only applied to design. | `cli/src/detector.ts:348`; also the web scan path | #207b |

## Dependency graph (what must land before what)

```
FIX-01 (OIDC + protected env, G-01/G-02) ──► R-02 MCP Registry ──► R-04 remote MCP ──► R-07, R-08
                                         └─► R-05 Action repo (immutable releases), W-03 publish path
PR #217 merge (= FIX-02) ──► K-05 pioneer suite ──► FIX-17 self-scan, D-04, #196
                         └─► FIX-02 deltas + leaderboard regen (G-09) ──► FIX-04
K-02 relabel ── independent, do first (docs/process only)
K-06 copy ──► FIX-04, R-01, R-09
A-08 /bot page ──► FIX-13 edge.access
FIX-05 shared CSS Color 4 parser
   ├─► #203 Oklab ΔE ──► S-01 ──► S-03 (+#207c), S-04, S-05
   │                 └─► #204a ──► S-06
   ├─► FIX-06 purple (ship together with FIX-05, see claim 1)
   ├─► FIX-08 / #199a dark contrast ──► S-05
   ├─► FIX-10 gradient salience
   └─► D-03, D-05, D-06
cross-pattern post-pass hook ──► FIX-07, FIX-06 co-signal, C-07, #207a
FIX-12 live-DOM text ══ C-01 gate/tiers ──► FIX-11, C-02…C-09, #200, A-02, A-03, A-07
FIX-14 robots RFC 9309 ──► A-06, W-04
FIX-13 + FIX-14 + FIX-15 + A-01 + A-02 ──► AEO v0.9 weights (applicability, G-04) ──► FIX-16 tier rename
K-03 lifecycle metadata ──► K-04 weight-0 gate ──► every weight-0 item (#196 #197 #199b #200 #202 D-03…D-07 D-10 C-08…C-10)
W-01 scan-result schema ──► F-00 ──► F-01…F-07 (F-07 ══ A-04 axe)
                        ├─► #208 locations ──► #211 SARIF, #208 annotate
                        ├─► #209 ratchet (also needs K-10)
                        ├─► #212 outputSchema, W-03
                        └─► D-01 madeWith ──► K-01 stratum (c), #207a, #197 signatures
FIX-05…FIX-12 (correctness) ──► K-01 calibration results ──► K-04 promotions, #201 lexicons, #207a, K-07, K-09, R-09 launch
K-10 definitionsVersion on history (+ cache key, G-06) ──► #209, #213b webhooks
```

**Critical path to v0.9.0:**
1. Merge PR #217.
2. FIX-01 with G-01/G-02.
3. K-02/K-06 in parallel.
4. FIX-05 + FIX-06 together.
5. The post-pass hook, then FIX-07.
6. FIX-12/C-01.
7. A-08, then FIX-13/14/15 + A-01/A-02 + weights.
8. K-03, then K-04.
9. K-05.

W-01 is the gating item for almost everything in v0.10.0 and should start during v0.9.0.
