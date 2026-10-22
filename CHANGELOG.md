# Changelog

## Unreleased — definitions@2026.11 engine (not a v1.0)

The engine catalogue is `DEFINITIONS_VERSION` `2026.11`. New and broadened rules ship at weight 0 (`status: review`) and add no points. Craft-floor findings do not change Clean / Mild / Heavy. Leaderboard rows and calibration accuracy stay the measured `2026.10` corpus (`rescored: false`). No likelihood ratios, Heavy false-positive rate, or live self-scan deltas are published for `2026.11`, because that re-score has not been run. Package versions stay `0.8.0`. This is not a v1.0.0 release.

- **DESIGN.md lint and diff are callable.** `slop-detect --lint-design-md <file>` and `--diff-design-md <base> <head>` run the engine checks with no browser. The MCP server adds local tools `lint_design_md` and `diff_design_md`. `--init-tokens` writes a DTCG `tokens.json` from the live DOM.
- **Declared tokens waive matching design patterns.** A scan that is given a parseable DESIGN.md keeps `rawScore` and reports the waived score as `score`. Craft is not waived.
- **`--a11y` is optional and off by default.** It needs the separate `axe-core` package, runs only in the local browser, and never changes a score or the fail-under gate.
- **Scan documents carry `schemaVersion` 1.** `schemas/scan-result.v1.json` is the draft 2020-12 contract for CLI `--json`, `POST /api/scan`, `POST /api/aeo`, and MCP `structuredContent`. A blocked or errored scan exits 2. That code means the scan could not run. `--fail-on` and `--fail-under` still exit 1 only when a page was scored and is over the gate. This schema is not a v1.0 release.
- **`slop-detect-mcp --local` scans on this machine.** `scan_page`, `check_aeo`, `check_design_system`, and `fix_prompt` use the Playwright runner and do not call slop-detect.com. The default server still uses the hosted API, which refuses `localhost` and `file://`. A Claude Code hook recipe scores `SLOP_LOCAL_URL` the same way. Package versions stay `0.8.0`.
- **Site copy aggregation is callable.** `slop-detect --copy-dir <dir>` and `--site-copy <n>` call `scoreMultiPageCopy`. The report sets `rendered: false` and `pre2022HeavyRate: null`. Fewer than 5 qualifying English pages is `insufficient_pages` with no site score. `--site <n>` renders same-origin pages when a browser is available, reports the median beside the homepage, and dedupes shared template selectors. The 50-word gate is not applied on that rendered path, because scan results do not carry a visible-word count. This does not change `DEFINITIONS_VERSION`.
- **`--brief` prints a short avoid list.** It names each triggered pattern and stays at or under 120 words. `--fix-prompt` is still the long remediation prompt. `--diff-scan` lists removed patterns and kit matches. `fix_prompt` with `brief: true` uses the short list. The default tool result does not.
- **`--format` prints agent, github, sarif, junit, gitlab, or json.** Review findings are warnings. A blocked scan is not a passing case. `agent` is selected when `CLAUDECODE` or `CURSOR_AGENT` is set and `CI` is unset.
- **`slop-detect init` writes project files.** Skill, MCP config, and optional hook recipes stay in the directory you pass. `--scope=global` is refused. Re-running does not duplicate a hook command. `--no-hooks` writes no hook files. Nothing is submitted to a registry.
- **`--emit-aeo-fixes` writes starter files.** `robots.txt`, `llms.txt`, `ard.json`, and link headers are byte-stable and written without a model. The training list is the installed registry, not a live mirror. Search crawlers do not get per-bot Allow lines.
- **`slop://spec/aeo` lists the installed AEO checks.** Likelihood ratios and the pre-2022 Heavy rate stay null.
- **SARIF reports fingerprint each pattern and URL.** One run per page. The category is the page URL. Remediation help comes from the existing fix text. Failed AEO checks are included. A selector already on the finding is a logical location. Source lines are not invented. A blocked page is a `scan` error, not a pass.
- **`compareScans` refuses a definitions-version mismatch.** That mismatch is not a score delta. `--compare-to` compares two saved scans offline, or one saved scan against a URL. `--fail-on-regression` exits 1 when the score rises above the allowed delta or a new pattern appears. A definitions change on the session baseline is a rescore, not a regression. `--save-baseline` writes one scored scan.
- **`--runs` aggregates median or pessimistic scores beside the last scan.** The page score and patterns stay the last run. `runSummary` holds the aggregate. This is not a measured CLI-versus-API identity proof. Both paths use a 1280×800 viewport. Chromium versions are recorded and are not asserted equal.
- **A non-full preset reports `fullScore`.** That field is the unfiltered design score. Copy, craft, AEO, and system are not rescored. The result names those axes when they were requested. The `full` preset leaves the JSON shape unchanged.
- **MCP tools, prompts, and resources list the public favicon.** Text tools return `{ text }`. The SDK v2 plan is `packages/mcp/SDK-V2.md`. Nothing is published.
- **Watch webhook payload builders exist for Slack, Discord, and JSON.** A definitions change is `rescored`, not a regression. The sweep still sends email. Live delivery, retries, and disable-after-failure are not wired.
- **Corrections inside unpublished 2026.11.** Init merges each hook list and keeps existing commands. A declared color waives a rule only when it matches the observed surface or accent, and the score is recomputed with those rules excluded. Waived rows stay out of `--brief`, SARIF, and the fix prompt. A definitions rescore replaces the session baseline. `--runs` exits 2 when any attempt could not score. A saved `--format` file uses the same exit gate as a live scan. Mobile reflow runs at a phone width and is unknown when that pass cannot run. Off-screen text and unrelated focus rules are not craft failures. AEO uses the parsed preview points, splits combined `X-Robots-Tag` scopes, keeps the most restrictive `max-snippet`, requires server text or reports unknown, and judges the advertised markdown URL on its own response. A later valid markdown twin replaces an earlier HTML 200. A malformed alternate URL fails that check and does not abort the report. Robots `*` rules match without a backtracking expression. Multi-page copy strips shared headings and paragraphs with the body. List items keep their own text, and the blocks list is capped. Static HTML copy keeps links and image sources. Site discovery follows a redirect and stops reading after 200,000 characters. `em` line-height stays a ratio of that style's font size. Composite token aliases resolve, and an extended group keeps its type. The named binomial interval is Clopper-Pearson. A centered Inter hero keeps the capped typography points. The MCP package depends on the published `slop-detect-core` name and ships the scan schema beside the bundle. No new measured score deltas are published.

## Unreleased — launch-readiness pass (2026-10-15)

Decisions: launch without live monitoring (waitlist), directory listings are
verified-only with `rel="ugc nofollow"`, tuning waits for a blind-labeled corpus.

### Fixed

- **Core package name in the docs.** The engine is published to npm as
  **`slop-detect-core`** (core's `prepack` renames the `@slop-detect/core`
  workspace before packing; the scoped name does not exist on npm). The v0.8.0
  note below that told consumers to switch to `@slop-detect/core` was wrong —
  keep depending on `slop-detect-core`.
- **Documented core embed API works as written.** `assembleScanResult(raw, opts)`
  now scores the `page.evaluate` payload (score/tier/grade/verdict, optional
  copy axis + unified score, blocked-page detection) instead of returning only
  pattern rows; `buildPageEvaluateScript(patterns, opts)` honours both
  arguments; `getPatterns('strict')` returns the filtered catalogue. The old
  call shapes still work. `scoreAeo` is documented as the async, fetching
  `runAeoChecks(url, opts)` it is.
- **`generateDesignMd` keeps the whole observed palette** (every CTA fill,
  heading colour, font and radius), so a page always passes against the
  `DESIGN.md` generated from it. `spec/system.md` now describes the comparator
  the engine actually runs (per-channel RGB tolerance, distinct-radii majority).
- **Fix prompt AEO gaps** use each check's `message` and `severity` (it read
  non-existent `detail` / `required` fields and printed generic advice).
- **GitHub Action:** a requested AEO audit (`aeo: true`) that cannot run now
  emits a `::warning` instead of silently dropping the AEO row.
- **Lockfile** synced with the CLI's core-as-devDependency (bundled) layout.
- **Apex→www redirects scan again.** The scan endpoint refused any redirect to a
  different hostname as "private/internal" (a plain `apple.com` failed). Same-site
  redirects (apex/www/subdomain) are now accepted and recorded under the final
  host; genuinely private destinations and cross-site hops get distinct errors.
- **npm release can no longer publish an uninstallable CLI.** `publish.yml` packs
  with `bun pm pack` (rewrites `workspace:*`), asserts tarballs are workspace-free,
  install-smokes them, and publishes the tarballs with provenance. Manual runs
  are dry-runs by default.
- **Detector grouping bugs** (`definitions@2026.10`): `icon_card_grid` grouped
  cards by parent tag name across unrelated sections; `numbered_steps` fired on
  ranked lists (HN). Both now group by real parent/sibling structure.
- **Ops metrics growth capped:** unknown `/api/*` route labels fold into `other`
  instead of adding a key per bot probe; unknown API paths return a JSON 404 and
  unknown pages a real `404.html` (was: homepage with 200). Bare `/pricing`,
  `/terms`, `/privacy` serve their documents.
- **Unverified claims can't squat domains or publish links.** A claim locks a
  domain and appears in `/directory` only after email verification; directory
  links are `rel="ugc nofollow"`.
- **Monitoring copy is honest:** homepage, FAQ, README and `llms.txt` now say
  waitlist (baselines recorded, alerts at launch); the sweep workflow shows
  Skipped instead of a green no-op; the README watch example sends `domain`
  (it sent `url` and got a 400).
- **Workflows:** leaderboard job installs + builds core (it crashed monthly);
  calibration runs under `pipefail` (it "passed" while failing).
- **Scan capacity:** 10-minute KV result cache for repeat scans (`refresh:true`
  bypasses; the sweep sends it), browser tabs are closed before session reuse,
  and browser-capacity failures return a friendly retryable 503.
- **Calibration harness:** paced scans, failed scans counted in accuracy, JSON
  rows carry fired pattern ids, `--check` treats a labeled ERROR as a miss, and
  10 hand-crafted reference candidates await blind labeling.
- **Docs:** `@slop-detect/core` README and the Agent Skill updated to the current
  API, 27 patterns, and tiers (Clean 0–9 · Mild 10–27 · Heavy ≥28).

## definitions@2026.10 — detector grouping precision & corpus re-score (2026-10-20)

Published score deltas for `DEFINITIONS_VERSION = "2026.10"` (shipped in #217,
re-scored in #222 / FIX-02) across the 24-site leaderboard corpus
(`apps/web/leaderboard/corpus.json`) and the 23-entry calibration corpus
(`packages/cli/calibration/corpus.json`).

### Detector rule changes in `2026.10`

- **`icon_card_grid` (weight 4):** now groups candidate cards by actual
  `parentElement` identity and then by width bucket within that parent, instead
  of keying by `parent.tagName + ':' + Math.round(r.width / 20)`. Same-sized
  cards in unrelated sections across the page no longer merge into one phantom
  grid.
- **`numbered_steps` (weight 3):** now skips elements inside `<table>` or `<nav>`
  and ignores sibling groups with more than 6 numbered items, so ranked content
  lists (e.g. Hacker News story ranks, directory tables, nav breadcrumbs) no
  longer fire as marketing "1 · 2 · 3" step sequences.

### Leaderboard corpus deltas (`2026.09` → `2026.10`)

The **Before (`2026.09`)** column comes from the previous committed
`apps/web/public/leaderboard.json` (generated `2026-09-15T07:08:35.691Z`, with
per-pattern baselines recovered from its `/r/<id>` snapshots). The **After
(`2026.10`)** column comes from a local Playwright Chromium re-score under this
tree's `2026.10` engine (`2026-10-20T12:08:59.687Z`). Because these are live
marketing URLs re-scanned a month later, deltas reflect the `2026.10` grouping
fixes (`icon_card_grid`, `numbered_steps`), the `centered_hero` geometry/transform
fix (T-17), and live-DOM changes on the target sites since `2026-09-15`.

- **Aggregate (`leaderboard.json`):** `20/24` scored → `22/24` scored · mean
  score `15.7` → `14.9` · tier counts `7 Clean / 9 Mild / 4 Heavy` →
  `7 Clean / 14 Mild / 1 Heavy` · `slopShare` `65%` → `68%` (two previously
  unscored sites, `vercel.com` and `replit.com`, now scored in `Mild`).

| Site (`domain`) | Category | Before (`2026.09`, 2026-09-15) | After (`2026.10`, 2026-10-20) | Δ | Pattern changes (`-` stopped firing, `+` started firing) |
|---|---|---|---|---|---|
| `notion.so` | bigtech | 0 · Clean (A+) | 0 · Clean (A+) | 0 | none (0 patterns) |
| `anthropic.com` | bigtech | 0 · Clean (A+) | 0 · Clean (A+) | 0 | none (0 patterns) |
| `motherfuckingwebsite.com` | classic | 0 · Clean (A+) | 0 · Clean (A+) | 0 | none (0 patterns) |
| `craigslist.org` | classic | 3 · Clean (A) | 0 · Clean (A+) | -3 | `-numbered_steps (-3)` |
| `figma.com` | bigtech | 3 · Clean (A) | 3 · Clean (A) | 0 | unchanged (`all_caps_labels`) |
| `berkshirehathaway.com` | classic | 3 · Clean (A) | 3 · Clean (A) | 0 | unchanged (`flat_type_hierarchy`) |
| `news.ycombinator.com` | classic | 6 · Clean (A-) | 3 · Clean (A) | -3 | `-numbered_steps (-3)`; kept `flat_type_hierarchy` |
| `gnu.org` | classic | 10 · Mild (B+) | 10 · Mild (B+) | 0 | unchanged (`gradient_backgrounds`, `accent_stripe`) |
| `bolt.new` | ai-builder | 31 · Heavy (D+) | 15 · Mild (B) | -16 | `-slop_fonts (-8)`, `-centered_hero (-4)`, `-nested_cards (-4)`; kept `glassmorphism`, `all_caps_labels`, `perma_dark_mode`, `bento_grid` |
| `linear.app` | saas | 23 · Mild (B-) | 16 · Mild (B) | -7 | `-centered_hero (-4)`, `-numbered_steps (-3)`; kept `slop_fonts`, `perma_dark_mode`, `nested_cards` |
| `vercel.com` | saas | unscored (`HTTP 502`) | 17 · Mild (B) | — | newly scored: `+slop_fonts (+8)`, `+gradient_backgrounds (+4)`, `+crushed_tracking (+5)` |
| `stripe.com` | saas | 19 · Mild (B) | 19 · Mild (B) | 0 | unchanged (`purple_accent`, `gradient_backgrounds`, `icon_card_grid`, `stat_banner`) |
| `supabase.com` | saas | 20 · Mild (B-) | 20 · Mild (B-) | 0 | unchanged (`slop_fonts`, `gradient_backgrounds`, `icon_card_grid`, `bento_grid`) |
| `posthog.com` | saas | 19 · Mild (B) | 20 · Mild (B-) | +1 | `-numbered_steps (-3)`, `+gradient_backgrounds (+4)`; kept `purple_accent`, `glassmorphism`, `nested_cards` |
| `v0.dev` | ai-builder | 17 · Mild (B) | 22 · Mild (B-) | +5 | `+hero_eyebrow_pill (+5)`; kept `slop_fonts`, `centered_hero`, `crushed_tracking` |
| `resend.com` | saas | 34 · Heavy (D) | 22 · Mild (B-) | -12 | `-icon_card_grid (-4)`, `-numbered_steps (-3)`, `-gradient_letter_avatars (-5)`; kept `purple_accent`, `gradient_text`, `gradient_backgrounds`, `perma_dark_mode` |
| `framer.com` | ai-builder | 10 · Mild (B+) | 23 · Mild (B-) | +13 | `+gradient_backgrounds (+4)`, `+glassmorphism (+4)`, `+gradient_letter_avatars (+5)`; kept `gradient_text`, `perma_dark_mode` |
| `replit.com` | ai-builder | unscored (`cloudflare_challenge`) | 23 · Mild (B-) | — | newly scored: `+gradient_backgrounds (+4)`, `+glassmorphism (+4)`, `+all_caps_labels (+3)`, `+stat_banner (+3)`, `+crushed_tracking (+5)`, `+nested_cards (+4)` |
| `railway.app` | saas | 24 · Mild (C) | 24 · Mild (C) | 0 | unchanged (`slop_fonts`, `purple_accent`, `perma_dark_mode`, `icon_card_grid`) |
| `aura.build` | ai-builder | 25 · Mild (C) | 25 · Mild (C) | 0 | unchanged (`slop_fonts`, `glassmorphism`, `colored_glows`, `centered_hero`, `crushed_tracking`) |
| `cal.com` | saas | 31 · Heavy (D+) | 27 · Mild (C) | -4 | `-centered_hero (-4)`; kept `slop_fonts`, `gradient_backgrounds`, `hero_eyebrow_pill`, `numbered_steps`, `low_contrast_text` |
| `clerk.com` | saas | 36 · Heavy (D) | 36 · Heavy (D) | 0 | `-all_caps_labels (-3)`, `-centered_hero (-4)`, `+low_contrast_text (+7)`; kept `slop_fonts`, `gradient_backgrounds`, `glassmorphism`, `icon_card_grid`, `aurora_mesh_gradient`, `nested_cards` |
| `lovable.dev` | ai-builder | unscored (`cloudflare_challenge`) | unscored (`cloudflare_challenge`) | — | unscored (`cloudflare_challenge`) |
| `openai.com` | bigtech | unscored (`cloudflare_challenge`) | unscored (`cloudflare_challenge`) | — | unscored (`cloudflare_challenge`) |

### Calibration corpus tier-accuracy (`2026.09` → `2026.10`)

The **Before (`2026.09`)** column is the `2026-09-15` local calibration run
recorded in `CALIBRATION.md`. The **After (`2026.10`)** column is the
`2026-10-20` local calibration run (`bun run calibrate -- --local`) under
`DEFINITIONS_VERSION = "2026.10"`.

- **Tier accuracy over the 13 confirmed-label rows (0 Heavy labels in seed):**
  - **Before (`definitions@2026.09`, 2026-09-15):** **5/13 (38.5%)** — confusion
    `Clean → {Clean: 3, Mild: 6, Heavy: 0, null: 1}`,
    `Mild → {Clean: 0, Mild: 2, Heavy: 1}`, `Heavy → {0}`.
  - **After (`definitions@2026.10`, 2026-10-20):** **7/13 (53.8%)** — confusion
    `Clean → {Clean: 4, Mild: 5, Heavy: 0, null: 1}`,
    `Mild → {Clean: 0, Mild: 3, Heavy: 0}`, `Heavy → {0}`.

| URL | Expected tier | Before (`2026.09`) | After (`2026.10`) | Δ | Pattern changes / triggered in `2026.10` |
|---|---|---|---|---|---|
| `news.ycombinator.com` | Clean | Clean (6) ✓ | Clean (3) ✓ | -3 | `-numbered_steps (-3)`; fired `flat_type_hierarchy` |
| `example.com` | Clean | `null` (`empty_page`) ✗ | Clean (0) ✓ | — | IANA `/s.js` now renders ≥10 visible elements; 0 patterns fired |
| `motherfuckingwebsite.com` | Clean | Clean (0) ✓ | Clean (0) ✓ | 0 | 0 patterns fired |
| `berkshirehathaway.com` | Clean | Clean (3) ✓ | Clean (3) ✓ | 0 | `flat_type_hierarchy` |
| `www.gnu.org` | Clean | Mild (10) ✗ | Mild (10) ✗ | 0 | `gradient_backgrounds`, `accent_stripe` |
| `supabase.com` | Clean | Mild (20) ✗ | Mild (20) ✗ | 0 | `slop_fonts`, `gradient_backgrounds`, `icon_card_grid`, `bento_grid` |
| `bolt.new` | Mild | Heavy (31) ✗ | Mild (15) ✓ | -16 | `-slop_fonts (-8)`, `-centered_hero (-4)`, `-nested_cards (-4)`; fired `glassmorphism`, `all_caps_labels`, `perma_dark_mode`, `bento_grid` |
| `www.aura.build` | Mild | Mild (25) ✓ | Mild (25) ✓ | 0 | `slop_fonts`, `glassmorphism`, `colored_glows`, `centered_hero`, `crushed_tracking` |
| `v0.dev` | Mild | Mild (17) ✓ | Mild (22) ✓ | +5 | `+hero_eyebrow_pill (+5)`; fired `slop_fonts`, `centered_hero`, `hero_eyebrow_pill`, `crushed_tracking` |
| `lovable.dev` | Clean | Mild (15) ✗ | `null` (`cloudflare_challenge`) ✗ | — | unscored (`cloudflare_challenge`), counted as a miss (`Clean → null: 1`) |
| `stripe.com` | Clean | Mild (19) ✗ | Mild (19) ✗ | 0 | `purple_accent`, `gradient_backgrounds`, `icon_card_grid`, `stat_banner` |
| `linear.app` | Clean | Mild (19) ✗ | Mild (16) ✗ | -3 | `-numbered_steps (-3)`; fired `slop_fonts`, `perma_dark_mode`, `nested_cards` |
| `vercel.com` | Clean | Mild (17) ✗ | Mild (17) ✗ | 0 | `slop_fonts`, `gradient_backgrounds`, `crushed_tracking` |

Unlabeled candidate predictions in `packages/cli/calibration/corpus.json` under `2026.10` (`label: null`, not counted in accuracy):
`www.apple.com` Clean (4: `gradient_backgrounds`), `clerk.com` Heavy (36: `slop_fonts`, `gradient_backgrounds`, `glassmorphism`, `icon_card_grid`, `aurora_mesh_gradient`, `low_contrast_text`, `nested_cards`), `resend.com` Mild (22: `purple_accent`, `gradient_text`, `gradient_backgrounds`, `perma_dark_mode`), `cal.com` Mild (27: `slop_fonts`, `gradient_backgrounds`, `hero_eyebrow_pill`, `numbered_steps`, `low_contrast_text`), `www.raycast.com` Heavy (37: `slop_fonts`, `gradient_backgrounds`, `glassmorphism`, `centered_hero`, `all_caps_labels`, `perma_dark_mode`, `icon_card_grid`, `stat_banner`, `ai_sparkle_badges`), `www.notion.com` Clean (0), `www.figma.com` Clean (3: `all_caps_labels`), `cursor.com` Mild (17: `gradient_text`, `gradient_backgrounds`, `numbered_steps`, `nested_cards`), `replit.com` Mild (23: `gradient_backgrounds`, `glassmorphism`, `all_caps_labels`, `stat_banner`, `crushed_tracking`, `nested_cards`), `www.framer.com` Mild (23: `gradient_text`, `gradient_backgrounds`, `glassmorphism`, `perma_dark_mode`, `gradient_letter_avatars`).

## v0.8.0 — monorepo restructure: bun + turbo + apps/docs + spec/

A structural refactor. No detector behavior changed; tooling, layout, and the
core package's npm name did.

### Tooling

- **bun** replaces npm for install + script running (`bun install`,
  `bun run build|test|typecheck|format|lint`).
- **turborepo** orchestrates per-package build / test / typecheck via
  `dependsOn: ["^build"]` (no more handwritten chains in root scripts).
- **vitest** replaces `node:test` everywhere (core, cli, mcp, apps/web —
  132 tests total, all green).
- **tsup** is the per-package bundler (dual ESM + CJS, `.d.ts` emit) for
  publishable libs.
- **changesets** for versioned releases (`.changeset/` + `bun run changeset`
  → `bun run version-packages` → `bun run release`).
- **CI** rewritten on `oven-sh/setup-bun@v2`: lint (`format:check`),
  typecheck, unit tests, smoke (build + Playwright + scan HN). Deploy +
  publish + calibrate + leaderboard workflows likewise on bun.

### Layout

- `packages/web` → **`apps/web`** (history preserved via `git mv`).
- New **`apps/docs`** — Next.js 15 + React 19 + Tailwind v4 docs site
  (`bun run docs:dev`).
- New **`examples/{astro-blog, nextjs-app-router}`** — reference framework
  integrations.
- New **`spec/`** — versioned scoring spec (`patterns.md`, `copy-axis.md`,
  `aeo.md`, `conformance.md`, `config.json`). Downstream tools should read
  the spec, not the source.
- Per-package: composite `tsconfig.json` (project refs), `tsup.config.ts`,
  `vitest.config.ts` for every publishable lib.

### Breaking

- **The core workspace is renamed to `@slop-detect/core`** inside the monorepo.
  _Correction:_ this is a workspace-only name. The npm package is still
  **`slop-detect-core`** (core's `prepack` renames it before publishing) and
  `@slop-detect/core` is not published. Consumers should keep:
  ```diff
  +    "slop-detect-core": "^0.8.0"
  ```
  ```js
  import { PATTERNS } from 'slop-detect-core';
  ```
- Root scripts now require **bun** (1.3+). `npm install` will fail because
  the lockfile is `bun.lock`. Install bun first: https://bun.sh.

### Internal

- Apache-2.0 attribution for upstream AEO logic moved from inline
  `packages/core/src/aeo.ts` comments to `NOTICE` (matches how the
  Impeccable attribution is handled).
- `prepack` / `pretest` scripts removed from `cli` + `mcp` packages —
  turbo's `dependsOn: ["^build"]` handles build ordering.

## v0.7.0 — the system axis & the continuity product

Strategy v2 implemented end to end ("slop is the hook, not the product").

### Added
- **System axis** — DESIGN.md compliance: core parser/scorer (zero-dep), CLI
  `--design-md`, API `designMd`, MCP `check_design_system`. Relative,
  higher-is-better, named drift; structurally immune to the premium-site
  false-positive class.
- **Drift alerts** — `watch { system: true }`: the daily sweep checks each
  domain against its own DESIGN.md and emails once per drift event.
- **Agency dashboard** (`/dashboard`) — magic-link sign-in (HMAC sessions,
  anti-enumeration link endpoint), one view across every domain on an email.
- **Client report** (`/report/<domain>`) — print-friendly (PDF via print).
- **Leaderboard** (`/leaderboard`) + opt-in **directory** (`/directory`,
  dofollow backlinks) + monitor conversion section on the landing page.
- Calibration harness: golden fixtures, labeled corpus, `npm run calibrate`.

### Changed
- Landing page: §04 monitoring conversion bridge, post-scan nudge, nav/footer
  to all surfaces; sub-pages unified on the forensic-instrument brand.
- All discovery surfaces (openapi.json — incl. fixing a wrong `preset` enum —
  llms.txt family, .well-known cards, agent view) synced to the full tool
  surface and version.

### Fixed
- Detector calibration: eyebrow-pill no longer fires on CTA/nav buttons;
  glassmorphism requires >=2 elements (evidence: Stripe/Linear/Vercel scans).
- Monitor form could silently delist a domain on resubmit (opt-ins now additive).


## definitions@2026.09 — calibration: fewer premium-site false positives

Driven by real evidence from the `/leaderboard` corpus scan (linear.app scored
36/Heavy, stripe.com 23/Mild — clear over-flagging of carefully-crafted sites).

- **`hero_eyebrow_pill`**: dropped the over-broad "weak" catch-all that fired on
  ANY rounded element above the hero — it misfired on pill-shaped CTA/nav buttons
  ("Sign up", "Log in"). Now requires the actual "Now in beta / Introducing …"
  keyword/emoji content tell.
- **`glassmorphism`**: now requires ≥2 frosted layers (was ≥1). A single frosted
  panel is common in otherwise-clean premium design; the tell is glass everywhere.
- Bumped `DEFINITIONS_VERSION` → `2026.09` (scores shift, so they stay comparable
  only within a version). Golden fixtures pin that real slop still trips both
  patterns while a clean page with a CTA pill no longer does.

NOTE: the font (Inter) and VibeCode-purple weights are unchanged — those are
deliberate product opinions, not bugs, and re-weighting them is a separate
labeled-corpus calibration decision (see CALIBRATION.md).

## v0.6.0 — production-readiness pass

Monitoring + directory features plus a deep security/ops hardening pass toward a
public launch. See `PRODUCTION.md` for the full launch checklist.

### Added
- **Monitored domains** (`/api/watch`) — opt-in continuity layer: remember a
  domain and flag regressions; with consent recording + a privacy policy.
- **Public directory** (`/directory`, `/api/sites`) — opt-in, owner-gated
  catalogue of scanned sites with dofollow backlinks.
- **CLI `--remote` mode** — scan via the API with zero Playwright/Chromium
  install (fixes the `npx slop-detect` first-run cliff).
- **Account-level cost guard** — `SCAN_DAILY_CAP` + `SCAN_DISABLED` kill switch
  on the browser path; **observability** shim (`_report.js`, `ERROR_WEBHOOK`).
- **Privacy policy** (`/privacy.md`) + **security headers** (CSP, HSTS, nosniff…).
- **Deploy workflow** + a CI `test` job that actually runs the unit suite.

### Fixed
- **CI never ran the unit tests** (lint + smoke only); now gated on `npm test`.
- **CLI crashed on `--help`** when Playwright was absent — Playwright is now
  lazy-loaded; the browser-free unit suite is 92/92 green.
- **SSRF redirect bypass** — `scan` + `aeo` re-validate every redirect hop /
  the final URL instead of trusting only the first.
- **Version drift** — all packages aligned to 0.6.0 (+ lockfile in sync).
- Deduped the design tier thresholds to a single source of truth.

### Notes
- Regression-alert **emails are not active yet** (no sender wired): the trial
  captures consent only. Set up a provider + double-opt-in before enabling.

## Web polish — impeccable-skill audit fixes + forensic-instrument typography (deployed)

Audited the landing page against the `impeccable` brand-design skill (shared
design laws + brand register + audit rubric) and `landing-copy`, then fixed every
finding. Web package only; still self-scans 4/100 Clean, Grade A.

### Absolute / brand bans fixed
- Removed both side-stripe `border-left` accents (an absolute ban) on `.step` and
  `.fix-cta`; replaced with full borders + a registration-chip marker and an
  accent-tinted panel.
- Stripped every em dash from rendered copy (title, OG/Twitter meta, hero lead,
  body, pipeline, footer, and the JS rules-list separator). Colons/periods now.
- Replaced pure `#000` (button ink) with a tinted near-black token.

### Escaped the editorial-typographic reflex lane
- Killed the `// ` comment-prefix eyebrows. Sections now carry a numbered
  lab-report registration system (`§01 / §02 / §03`) with lowercase labels.
- Real font pairing via the brand font-selection procedure (reflex picks Inter /
  Geist / IBM Plex Mono are exactly what this tool flags, so they're rejected):
  **Hanken Grotesk** for prose, **Martian Mono** for instrument readouts. Mono
  tracking pulled in hard (Martian ships wide) so it reads as precision, not
  decoration.
- Fluid `clamp()` type scale (>=1.25 ratio); neutrals retinted toward the brand
  blue hue (no pure greys); accent-soft tint token introduced.
- Catalogue (§03) rebuilt from a plain collapsed `<ol>` into a dense 2-column
  numbered grid (still driven by the live `/api/patterns` count, never hardcoded).
  Disclosure toggle is now a `+ / −` chip matching the registration marks.

### Dogfooding (the important part)
- The first redesign pass scored 10/100 Mild because two new moves tripped the
  tool's OWN detectors: numbered `01/02/03` marks fired `numbered_steps`, and
  wide-tracked uppercase labels fired `all_caps_labels`. Rather than game the
  detector, the fix eats its own dogfood: labels went lowercase, and the marks
  became `§`-prefixed section sigils (no longer a 1·2·3 sequence). Back to Clean.
- Sticky nav made fully opaque (no `backdrop-filter` blur — the engine flags glass)
  and section anchors got `scroll-margin-top` so jump-links never clip under it.

## Web redesign — "editorial terminal" landing page (deployed)

Full redesign of the slop-detect.com landing page (web package only; not an npm
release). The old page was a single left-drifting column that trailed off into
dead space and read as an unfinished prototype.

### Design
- New structure: sticky topbar, two-column hero (headline + scan form left, a
  static "sample scan" readout card right), an editorial two-column "fingerprint"
  section, a carded "how it works" pipeline, the live rules disclosure, and a real
  multi-column footer. The void is now filled with intentional sections + rhythm.
- Single restrained cold-blue accent (`#5b9dff`); monospace used for data/labels.
- Strong, non-flat type hierarchy; raised body/label contrast for AA legibility.
- Score count-up animation; result card reveal; "browse every rule" now wired.

### Anti-slop by construction
- The page is scored by its own engine, so it deliberately avoids every tell it
  detects: no gradient text, no gradient/aurora backgrounds, no glassmorphism, no
  colored glows, no centered hero, no eyebrow pill, no numbered-step circles, no
  icon-card grid, no big-number stat banner, no crushed/wide tracking.
- **Self-scan result: 4/100, Clean, Grade A** (only the unavoidable perma-dark +
  grey-body tell fires). The landing page passes its own detector.

### Safety
- The entire 370-line core script (Turnstile, /api/patterns, render, share/embed,
  fix-prompt modal) is preserved byte-for-byte; every element ID is retained. The
  redesign is HTML structure + CSS only. New gutter mirror labels stay dynamic by
  observing the live count (never hardcoded). Verified live + on mobile.

## 0.5.2 — Rate-limit fail-closed, foreign-origin rejection, dead-code sweep

Second post-review batch. Web changes deployed to slop-detect.com; CLI republished
to keep npm in sync with source (core + mcp unchanged at 0.5.1).

### Security (web — deployed)
- **Rate-limit now fails CLOSED on the scan route (#5).** Previously a missing
  `RATE_LIMIT` KV binding, or a KV read/write outage, let the expensive headless-
  browser scan route through unthrottled. Now: when KV is unavailable, the scan
  route enforces a tight in-memory per-isolate ceiling (3/window). Cheap routes
  (fix-prompt assemble) still fail open — they don't touch the browser.
- **Foreign browser origins are now rejected (#6).** The middleware comment claimed
  it "blocks third-party origins" but only down-bucketed them. It now returns
  `403 origin_not_allowed` for any browser Origin outside the allowlist — unless the
  caller presents a valid API key. No-origin callers (CLI/curl) are unaffected.

### Cleanup
- Removed 3 dead ctx helpers (`isVisible`, `inViewport`, `isNeutral`) that were
  wired into the page-eval context but consumed by no pattern. `inHero` is kept
  (the declarative rules engine uses it). Affects CLI + web scan context.

### Tests
- +7 middleware tests (foreign-origin rejection, scan fail-closed under missing /
  broken KV, cheap-route fail-open, OPTIONS preflight). 35 total, all green.

## 0.5.1 — Security hardening + CI gating (post-review)

From a full end-to-end review. Resyncs npm with the source tree (published 0.5.0
core shipped 26 patterns; the tree had 27) and ships security + DX fixes.

### Security
- **SSRF guard on `/api/scan`** (`validateScanUrl`): blocks cloud-metadata
  (169.254.169.254), loopback, RFC-1918, CGNAT, link-local/unique-local IPv6,
  IPv4-mapped loopback, and internal hostnames (`localhost`, `*.internal`, `*.local`);
  rejects non-http(s) schemes. The scan endpoint loaded arbitrary user URLs in a
  headless browser and returned page content — this closes the SSRF primitive.
- **fix-prompt `{url}` bypass closed**: mode-2 fix-prompt (which re-runs a scan
  in-process) is now gated by the middleware *as a scan* — same rate limit, shared
  bucket, and Turnstile — instead of fix-prompt's looser limits.

### Added
- **`GET /api/patterns`** — serves the live pattern catalogue from core. The web UI
  and CLI now render the rule count + list dynamically (no more hardcoded "16 rules").
- **CLI `--fail-on <tier>`** (`mild`|`heavy`) — exits non-zero to gate CI; blocked/errored
  scans also fail. Replaces the manual `jq`-based gate in the docs.

### Fixed
- CLI now normalizes bare hostnames (`slop-detect example.com`) and rejects non-http(s)
  schemes with exit 2.
- MCP server reports its real version from package.json (was hardcoded `0.2.0`).
- MCP API client has a 45s fetch timeout (`SLOP_DETECT_TIMEOUT_MS`); timeouts surface
  as a clean `ApiError`.
- Tightened the Chromium-missing detection regex (was matching any launch failure).
- Corrected the CLI User-Agent repo URL and the CLI README tier thresholds (Clean <10,
  Mild ≥10, Heavy ≥28).

### Tests
- +3 SSRF suites, +5 CLI subprocess tests, +5 MCP api tests (28 total, all green).

## 0.5.0 — Phase 5: Impeccable adoption (Tranche A)

`definitions@2026.08` — the design fingerprint grows from 19 → 27 patterns.

### Added
- **8 new design patterns** ported from [Impeccable](https://github.com/pbakaus/impeccable)
  (Apache-2.0), targeting high-prevalence AI tells we were missing:
  - `cream_default_bg` (w7) — warm off-white / beige default page surface (~74% of
    generated pages per Impeccable's launch data)
  - `low_contrast_text` (w7) — washed-out grey body text below WCAG AA on a light
    background. Deliberately narrowed to the *pervasive grey-on-light* signature
    (not generic WCAG failure) so premium sites with intentional brand color stay clean
  - `crushed_tracking` (w5) — display headings tracked tighter than -0.05em
  - `gray_on_color` (w4) — neutral mid-grey text on a chromatic background
  - `oversized_hero_h1` (w4) — long headline (≥40 chars) blown up to ≥72px
  - `nested_cards` (w4) — card-like element inside a card-like ancestor (excludes
    3D-tilted product-screenshot mockups)
  - `wide_body_tracking` (w3) — body copy letter-spacing above 0.05em
  - `flat_type_hierarchy` (w3) — ≥3 font sizes with a max/min ratio below 2×
- **WCAG color primitives** in `createColorHelpers()`: `relativeLuminance`,
  `contrastRatio`, `channelSpread`, `isNeutral`, `effectiveBackground` (ancestor
  background-color walker). Unit-tested against known WCAG reference pairs.
- Fix recipes + evidence formatters for all 8 new patterns.
- Second unit-test suite (`color.test.js`) — 7 tests on the contrast math.

### Calibration
- Validated against premium reference sites (Stripe, Linear, Notion, Vercel) to
  confirm the new rules do **not** false-fire, and against a synthetic slop
  fixture to confirm they **do** fire. Contrast/gray rules required narrowing to
  the true AI signature after initial false positives on branded CTAs and
  white-on-dark text.

### Attribution
- Patterns #20–27 adapted from Impeccable by Paul Bakaus (Apache-2.0). See `NOTICE`.

### Backward compatibility
- Existing pattern IDs, weights, and the design/copy axis split are unchanged.
  New patterns are additive; the tier bands (Clean/Mild/Heavy) are unchanged.

## 0.4.0 — Phase 4: multi-axis slop (design + copy)

### Added
- **Copy-slop axis (#08)** — 9 deterministic text patterns scored on the page's
  own prose at near-zero marginal cost (one in-DOM text extraction, no extra page
  load): `buzzword_density`, `em_dash_overload`, `antithesis_construction`,
  `filler_openers`, `formulaic_closers`, `rule_of_three`, `whether_youre`,
  `unicode_artifacts`, `emoji_bullet_headers`. Each with its own fix recipe.
- **Multi-axis scoring** — `scoreCopy()`, `combineAxes()`, `extractTextContext()`,
  `AXES` exported from core. Per-axis summaries (`axes.{design,copy}`) plus a
  `unifiedScore` / `unifiedTier` (max axis score + penalty when >1 axis dirty).
- **CLI**: `--copy` and `--axes design,copy|all` flags, with a per-axis pretty
  breakdown. **API**: `{ axes: ['design','copy'] }` on `/api/scan` and
  `/api/fix-prompt`. Permalinks persist a compact copy-axis summary.
- **`buildFixPrompt`** now spans both axes when the copy axis was scored.
- First **unit-test suite** (`node --test`) covering the copy axis + aggregator;
  `npm test` wired at the root.

### Backward compatibility
- Top-level `score` / `grade` / `tier` / `patterns` remain **design-only** by
  default. The copy axis is strictly opt-in; existing integrations are unchanged.

## 0.3.0 — Phase 3: keep the ruleset current

### Added
- **Declarative rule format** (`compileRule` / `compileRules` / `validateRule`)
  — describe a pattern as `{ id, label, weight, detect: { scope, when, trigger } }`
  and it compiles to a self-contained, injectable detector. Lowers the cost of
  contributing the 20th/21st pattern. Imperative patterns still supported. (`#05`)
- **Named scoring presets** — `full` (default), `strict` (weight ≥ 5),
  `marketing` (brand surface), `minimal` (3 dead-giveaways). Selectable via the
  CLI `--preset` flag and the API `{ preset }` field; `applyPreset` exported.
- **Public API key tiers** — `Authorization: Bearer` / `X-API-Key` keys with
  `free` / `pro` / `unlimited` tiers (key-bucketed limits, Turnstile bypass).
  Fully documented in [apps/web/API.md](apps/web/API.md).

### Definitions `2026.07`
- **+3 emerging patterns** (max raw weight 73 → 85): `bento_grid` (w4),
  `aurora_mesh_gradient` (w5), `ai_sparkle_badges` (w3). Each with a fix recipe
  and evidence formatter. Verified for no false positives on Hacker News (Clean).

## 0.2.x — Phase 2: embed into the workflow (CI + agents)

### Added
- **`slop-detect-mcp`** — Model Context Protocol server (stdio) exposing
  `scan_page` and `fix_prompt` tools so Cursor / Claude Code / Windsurf agents
  can self-audit a page before shipping. Thin wrapper over the public API,
  `SLOP_DETECT_API` configurable. (`#07`)
- **`slop-detect-action`** — composite GitHub Action that scans a deploy-preview
  URL, posts a **sticky PR comment** (grade · score · triggered patterns · OG
  card), sets a pass/fail status via `fail-under` (numeric or letter grade), and
  exposes `score`/`grade`/`tier`/`verdict`/`result-url` outputs. (`#04`)
- Example consumer workflow at `.github/workflows/slop-check.example.yml`.

## 0.2.0 — Phase 1: distribution primitives

Make the score travel. Every scan now produces something shareable and embeddable.
See [ROADMAP.md](ROADMAP.md) and [apps/web/UX.md](apps/web/UX.md).

### Added
- **Letter grades** (A+→F) layered on the 0–100 score, on every surface (core,
  CLI, web, API, badge). `gradeForScore()` + `GRADE_BANDS` exported from core.
- **Verdict one-liners** — deterministic, page-not-person, tier-keyed. `verdictFor()`.
- **Versioned slop definitions** — every result carries `definitionsVersion`
  (`2026.06`) so historical scores stay comparable. `DEFINITIONS_VERSION` exported.
- **Shareable result permalinks** — `POST /api/scan` returns `id` + `resultUrl`;
  `GET /r/<id>` server-renders the result with OG/Twitter meta.
- **OG share cards** — `GET /og/<id>.png` renders a 1200×630 card (grade · score ·
  tier · verdict · tells) via Browser Rendering, cached in KV.
- **Embeddable badge** — `GET /badge/<domain>.svg` returns a live, tier-colored
  shields-style badge for a domain's latest scan. Copy-paste Markdown/HTML/URL
  snippets in the UI.
- **Share + embed UX** — share panel (copy link, X, LinkedIn) and badge embed
  panel on the result view; `/?url=` deep-link prefill for the re-scan loop.

### Infra
- New `RESULTS` KV namespace (results, OG cache, domain→latest, badge cache).

### Definitions `2026.06`
- Baseline: the original 16 patterns (Krebs 15 + Meng To 1). No pattern changes;
  establishes the versioning scheme going forward.

## 0.1.2
- fix-prompt rewrite: concrete per-page evidence + anti-regression list.
- Tightened empty-page detection for sparse-DOM sites.

## 0.1.1
- Detector tuning, anti-bot guard, rate limiting, branding.

## 0.1.0
- Initial monorepo — core + cli + web. 16-pattern engine.
