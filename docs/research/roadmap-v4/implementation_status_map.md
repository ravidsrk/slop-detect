# Implementation status map: codebase vs roadmap v3 items (read-only code investigation, 2026-10-19)

> Produced by a read-only codebase investigation of the slop-detect worktree at commit d37e91c (main). It maps what is already shipped, partially implemented, or missing for each roadmap v3 item (#196-#213), plus defects found in shipped code. File/line references are to that commit.

## Investigation brief

Very thorough, READ-ONLY codebase investigation. Work only in the git worktree at /home/repos/users/mDn3vRscxATUnCmKRdQLXELIVrl1/ffa263b3-eb3d-4ac9-96d8-7baa3bb156d2/.worktrees/7b63e35f-114a-4e8f-a5c1-9e1026b5c6b0 using absolute paths (do not cd into the original repo root). Do NOT modify, commit, checkout, switch branches, stash, or delete anything — use only read commands such as git log / git diff / git show / git branch, cat, grep, find.

Context: Slop Detector is a Bun + Turborepo monorepo (packages/core = scoring engine, packages/cli = Playwright CLI `slop-detect`, packages/mcp = MCP server, packages/action = GitHub composite action, apps/web = Cloudflare Pages site + Functions API, spec/ = versioned scoring spec). The worktree is on origin/main at d37e91c (v0.8.0, DEFINITIONS_VERSION 2026.09). There are 18 open roadmap issues #196–#213; their full bodies are in /tmp/roadmap-v4/issue-196.json … /tmp/roadmap-v4/issue-213.json (JSON, text in the "body" field; read with `jq -r .body`).

Produce an implementation-status map:

1. For each issue #196–#213, determine whether any part is already implemented on main — cite file:line evidence — or exists on an unmerged branch. Inspect these local branches read-only with `git log --oneline main..<branch> | head`, `git diff --stat main...<branch> | tail -40`, and `git show <branch>:<path>` where needed: feat/0.9-modernize, ws/aeo, ws/fingerprint, ws/mcp, ws/platform, subagent-AEO-v2-Engineer-self-65ab541f, subagent-Fingerprint-2026-Engineer-self-61457a67, subagent-MCP-Distribution-Engineer-self-e18215e6, subagent-Platform-Modernization-Engineer-self-8d8a3ab4, workspace/4bf6cb7d-draft, workspace/686b7e09-complete-product-review-and-launch-plann, workspace/7b63e35f-conduct-comprehensive-app-audit-and-rede, workspace/971b605d-draft, completion/roadmap-v3, completion/roadmap-v3-fixes. For each branch report: commits ahead of main, a one-line summary of what it contains, whether it is merged / superseded / stale / has unique unmerged work, and which roadmap issue(s) it relates to.

2. Report these facts with file:line evidence:
   a. npm publishing: .github/workflows/publish.yml (and any other release workflows) — NPM_TOKEN vs OIDC trusted publishing, `--provenance`, `permissions: id-token: write`, npm CLI version; changesets config; package names/versions in packages/*/package.json (core is published as `slop-detect-core` via prepack/postpack — confirm how).
   b. MCP: does packages/mcp have an MCP Registry `server.json` and `mcpName` in package.json? Which tools/resources/prompts exist, which @modelcontextprotocol/sdk version, transports (stdio/HTTP)? Is there a /.well-known/mcp.json on apps/web?
   c. `skills/` directory: contents and format (Agent Skills SKILL.md frontmatter?), any Claude Code plugin manifest (.claude-plugin/).
   d. CLI features: flags supported (look at the CLI arg parser) — SARIF output? JSON schema? --preset? compare/diff/baseline? multi-page crawl or sitemap? static directory scanning? screenshot output? exit codes / --fail-on.
   e. packages/core/src/presets.ts content and how presets affect scoring; packages/core/src/verdict.ts and rules.ts scoring/weights/tier model; any confidence or co-occurrence logic.
   f. Copy axis: how copy text is extracted (which DOM text, min length, language detection, non-English handling) — packages/core/src/copyPatterns.ts and text.ts.
   g. AEO: exact logic summary of each of the 8 checks in packages/core/src/aeo.ts — which user-agents are probed, the AI-bot list used for robots.txt, how llms.txt is validated (any HTML soft-404 rejection?), markdown twin detection, whether training vs search bots are separated, any Content-Signal / JSON-LD / agent-card handling.
   h. DESIGN.md axis: packages/core/src/system.ts — supported DESIGN.md format, color distance method (sRGB? Oklab?), tolerance, any DTCG tokens.json support.
   i. Calibration: CALIBRATION.md and VALIDATION.md — current corpus size, labeling method, metrics reported, any pre-2022 human baseline; assets-raw/ or scripts/ calibration data (leaderboard.json size).
   j. spec/ contents and versioning (spec/config.json fields), conformance suite.
   k. apps/web: list of routes/functions (apps/web/functions/**), watch/monitoring features, webhooks, rate limits, any i18n.
   l. Tests: layout and rough counts (vitest files per package), e2e fixtures.

3. List concrete gaps or inconsistencies you notice (docs claiming features that don't exist, pattern counts that disagree across README/spec/AGENTS.md/web UI, stale definitions versions, roadmap items that are already done, ROADMAP.md statements that are inaccurate).

Return a structured report (aim for under ~1,800 words) with file:line citations. Be precise; say "not found" rather than guessing.




























































































## Findings

# Implementation-status map: Slop Detector roadmap issues #196–#213 (origin/main d37e91c)

All paths are relative to `/home/repos/users/mDn3vRscxATUnCmKRdQLXELIVrl1/ffa263b3-eb3d-4ac9-96d8-7baa3bb156d2/.worktrees/7b63e35f-114a-4e8f-a5c1-9e1026b5c6b0/`.

**Caveat:** local `main` is cdd58e1 (2026-09-16), which is 8 commits behind origin/main d37e91c (= HEAD). Because of that, `main..<branch>` overstates how far ahead each branch is. Below, ahead/behind counts are against origin/main, with the count against local main in brackets.

## 1. Issues #196–#213

| # | Status on main (evidence) |
|---|---|
| 196 | **Not done.** Only nearby code: `icon_card_grid` (`packages/core/src/patterns.ts:515`). It still groups cards by the parent's tag name (`:539`), which is a cross-section bug; 355f588 fixes it. Lucide "sparkles" is detected (`:799-837`). Nothing for terminals, `href="#"` links or logo bars. |
| 197 | **Not done.** No marquee, animation, translateY or reduced-motion code in `core/src`. |
| 198 | **Not done.** |
| 199 | **Not done.** `low_contrast_text` uses the WCAG-2 ratio and skips dark backgrounds entirely (`patterns.ts:967-970`). No color-scheme, tabular-nums or APCA checks. |
| 200 | **Not done.** Only nearby: `rule_of_three` and `antithesis_construction` (`copyPatterns.ts:246`, `:174`). |
| 201 | **Not done.** The buzzword list is flat (59 words, `copyPatterns.ts:46-106`), every hit counts the same, trigger at `:141`. 18 of the issue's tier words are missing (intricate, commendable, garner, nuanced, paramount, scalable, …). |
| 202 | **Not done.** The only testimonial check is `gradient_letter_avatars` (`patterns.ts:656`). |
| 203 | **Not done.** `parseCssColor` handles hex, rgb() and hsl() only (`system.ts:171-216`); oklch falls back to exact string match (`:228`). `spacing` is parsed (`:128`) but no check uses it (`:348-354`). |
| 204 | **Partial.** `generateDesignMd()` (`system.ts:541-647`) and `--init-design-md` (`packages/cli/bin/slop.ts:85, 538-550`) emit YAML front matter for colors, typography, rounded and components (no spacing). No DTCG tokens.json, no `--extract-*`/`--tokens`, no MCP `extract_design_system`. |
| 205 | **Not done.** No JSON-LD, token-efficiency or citation checks. |
| 206 | **Not done; all four bugs confirmed.** llms.txt passes on any 2xx (`aeo.ts:573`). Each bot has a `purpose` field but the robots check ignores it (`:333-336`). The markdown-twin check only fetches `<url>.md` (`:513-530`). No agent-card or mcp.json probe. The 2026 bots the issue lists are absent. |
| 207 | **Partial.** Presets full/strict/marketing/minimal exist (`presets.ts:15-44`), but they only filter patterns and only apply to the design axis (`packages/cli/src/detector.ts:347-349`). No confidence score, `.sloprc.json` or waivers (searched: nothing found). |
| 208 | **Not done.** `--screenshot` only adds a base64 viewport PNG to the JSON (`detector.ts:402-405`). |
| 209 | **Not done.** `/compare` is a static A-vs-B page (`apps/web/public/compare/index.html:425-437`). The only "regression" logic is in the watch feature (`apps/web/functions/_data.ts:923-927`). |
| 210 | **Not done.** The CLI rejects non-http(s) schemes (`slop.ts:201-207`) and prefixes anything else with `https://`, so `./dist` becomes `https://./dist` (`:208`). It launches one browser per URL (`detector.ts:294, 407`). Note: the library's `scanUrl` already accepts `file://` (tests use it: `pattern-coverage.test.js:16-21`). |
| 211 | **Partial.** `--sarif` exists (`detector.ts:204-289`), but `artifactLocation.uri` is the scanned https URL (`:240`). No region, logicalLocations or help.markdown, and AEO results are not included. |
| 212 | **Mostly done.** All 4 tools have `readOnlyHint`/`destructiveHint`/`idempotentHint`/`openWorldHint` (`packages/mcp/src/server.ts:45-51` etc.). Prompts `audit_landing_page` and `deslop_and_verify` exist (`:177-202`), as do resources `slop://spec/patterns` and `slop://spec/design-md-template` (`:230-245`). **Missing:** `slop://spec/aeo`, the three prompt names the issue asks for, tests for prompts/resources (MCP tests cover tools only), and `--init-hooks`. |
| 213 | **Partial.** Already shipped: `/dashboard` with magic-link sign-in over many domains (`dashboard.tsx:1-20`), `/report/:domain`, and email alerts for both regressions and DESIGN.md drift (`_sweep.ts:11-14`). These run from a daily GitHub Actions cron (`monitor-sweep.yml:13`). **Missing:** webhookUrl, definitions-version in history points (`_data.ts:536-546`), and the 200-URL corpus (there are 13 rows). `scripts/calibrate.ts` and `functions/_scheduled.ts` do not exist. |

### Branches

The 9 feature branches all point at the same commit, 355f588.

| Branch | Ahead/behind origin [vs local main] | Status |
|---|---|---|
| feat/0.9-modernize | 1/8 [1/0] | **Unique unmerged work** (355f588, details below). |
| subagent-{AEO-v2, Fingerprint-2026, MCP-Distribution, Platform-Modernization}-* | 1/8 [1/0] | Created from feat/0.9-modernize at 05:50:51 with no commits of their own. Same content. |
| ws/aeo, ws/fingerprint, ws/mcp, ws/platform | 1/8 [1/0] | Same commit, no own commits. Checked out in `~/.gemini/antigravity-cli/worktrees/…`; I did not inspect their uncommitted state (outside this worktree). By name they target #205/206, #196–202, #212 and #210, but nothing was committed. |
| workspace/4bf6cb7d-draft, workspace/686b7e09-…, workspace/971b605d-draft | 0/8 [0/0] | Stale at cdd58e1. |
| workspace/7b63e35f-… | 0/4 [4/0] | Merged (bb73653, PR #195, H-04 release). |
| completion/roadmap-v3 | 0/3 [5/0] | Merged (PR #214). |
| completion/roadmap-v3-fixes | 0/1 [7/0] | Merged (PR #215). |

**What 355f588 contains** (45 files, +929/−211):
- **Publish pipeline:** `bun pm pack`, a guard against leftover `workspace:` deps, an install smoke test, dry-run by default, `id-token: write`, and `--provenance`.
- **Detector precision:** `icon_card_grid` groups by the actual parent element; `numbered_steps` skips table/nav and lists with more than 6 items; new `patterns-grouping.test.js`; `DEFINITIONS_VERSION` and spec bumped to 2026.10.
- **Web:** accepts same-site redirects (`isSameSiteRedirect` in `_ssrf.ts`), 10-minute KV result cache, retryable 503, JSON 404 for unknown `/api/*`, `404.html`, `_redirects`, directory listing only after verification.
- **Workflows and calibration:** fixes to `leaderboard.yml` and `calibrate.yml` (pipefail), harness pacing, and 10 unlabeled candidate URLs.

Most of these files are untouched on main. However:
- The "waitlist" monitoring copy is superseded: main turned monitoring on (H-02).
- The publish changes conflict with main's H-04 approach (unscoped package plus CLI bundling core), so they need reworking rather than a straight merge.

It relates to #196, #207, #213 and release provenance.

## 2. Facts

**a. npm publishing**
- `publish.yml` uses an `NPM_TOKEN` secret (`:10-14`, `:44-49`, `:77/83/89`) and runs on `v*` tags or manual dispatch (`:19-23`).
- It has no `permissions:` block, no `id-token: write`, and no `--provenance` (`:75/81/87`).
- It uses Node 22, so the bundled npm 10.x, with no npm upgrade (`:36-39`). OIDC trusted publishing is not set up.
- It runs in `environment: production` (`:33`). It is the only release workflow.
- Changesets: one fixed group for core/cli/mcp (`.changeset/config.json:5`) and one pending changeset. It is not wired into publishing; the root `release` script just exits 1 (`package.json:32`).
- Packages:
  - **Core:** named `@slop-detect/core` 0.8.0 in the repo. `prepack`/`postpack` temporarily rename it to `slop-detect-core` while packing (`core/package.json:60-61`, added in d8819ab).
  - **CLI:** `slop-detect` 0.8.0 bundles core through tsup `noExternal` (`cli/tsup.config.ts:18`), with core only as a `workspace:*` devDependency (`cli/package.json:53-55`).
  - **MCP:** `slop-detect-mcp` 0.8.0 depends only on the MCP SDK (`:47-49`).
  - **Action:** private.
- The H-04 evidence records `slop-detect-core`, `slop-detect` and `slop-detect-mcp` @0.8.0 as published (`docs/completion/evidence/H-04-npm-publish-live.txt:3-6`).

**b. MCP**
- No `server.json` and no `mcpName`.
- SDK `^1.29.0`, resolved to 1.29.0 (`bun.lock:322`). Uses the low-level `Server` API.
- Stdio transport only (`server.ts:10`, `:391-397`). No HTTP transport.
- It is a thin client of slop-detect.com and does not import core.
- Undocumented environment variables: `SLOP_DETECT_TIMEOUT_MS` and `SLOP_API_KEY` (`api.ts:62`, `:83`).
- The web app does publish `/.well-known/mcp.json` (`apps/web/public/.well-known/mcp.json:1-62`, server-card 0.1.0 schema, stdio, lists tools/prompts/resources). Alongside it: `mcp/server-card.json`, `agent-card.json`, `agent.json`, `agent-skills/index.json`.

**c. skills/**
- Contains `skills/README.md` and `skills/slop-detect/SKILL.md`, in Agent Skills (agentskills.io) format.
- Frontmatter fields: name, description, license, metadata, compatibility (`SKILL.md:1-11`).
- The sha256 in `agent-skills/index.json:13` matches the current `SKILL.md`.
- No `.claude-plugin/`, `plugin.json` or `marketplace.json`. The `.claude/`, `.agents/`, `.cursor/` and `.codex/` folders are gitignored (`.gitignore:46-51`) and only hold a local install of the third-party Impeccable skill.

**d. CLI** (parser at `slop.ts:80-177`)
- Flags:
  - Output: `--json`/`-j`, `--sarif`, `--fix-prompt`/`--fix`, `--init-design-md`, `--screenshot`, `--verbose`
  - Axes and scoring: `--copy`, `--axes`, `--aeo`, `--preset`/`-p`, `--design-md`
  - Remote mode: `--remote`, `--api`
  - CI gate and misc: `--fail-on mild|heavy`, `--fail-under <grade|0-100>`, `--timeout`, `--version`, `--help`
- No JSON Schema for CLI output; the only schemas are OpenAPI components in `openapi.json`.
- No compare/baseline, crawl/sitemap, static-directory scanning or annotated screenshots.
- Exit codes: 0 = pass; 1 = gate failed, an error/blocked page under a gate, or a fatal error (`:568-586`, `:626-628`); 2 = usage error.

**e. Scoring**
- **Design score:** the sum of triggered pattern weights, capped at 100 (`index.ts:96-115`). Tiers: design Clean <10, Mild 10–27, Heavy ≥28; copy thresholds 8 and 20 (`:79-87`).
- **Grades and verdicts:** grade bands at `verdict.ts:14-25`; the verdict line is picked by a hash of the triggered patterns (`:59-77`).
- **Unified score:** the highest axis score plus 6 for each extra "dirty" axis (`index.ts:181`).
- **Pattern set:** 27 patterns, total weight 122. Categories are only fonts, colors, layout, css and images.
- **Presets:** filter only (`presets.ts:46-67`); the code comment at `:7` mentions weighting, but none exists.
- **Declarative rules:** `rules.ts` has a rule compiler (`:113-166`) that is exported but used by no shipped pattern.
- **Confidence/co-occurrence:** none.

**f. Copy text extraction**
- Takes `main`, `article` or `[role=main]`, otherwise `body` (`text.ts:20`). Clones it and strips nav, footer, header, script, style, noscript, svg, code, pre and `aria-hidden` elements (`:25-27`).
- It calls `innerText` on the detached clone (`:15`, `:24`, `:32`). On a detached node that behaves like `textContent`, so hidden text is included and block line breaks are lost, despite the comment at `:14`.
- Headings = h1–h4, li, dt; paragraphs = p (≤400 characters); total text capped at 200k characters.
- Pages under 40 words are marked "thin" and nothing triggers (`index.ts:123`).
- No language detection: English lexicons and regexes run on every page.

**g. AEO** (`aeo.ts`; weights in brackets, total 100)
1. `html.reachable` [10]: fetch with the `SlopDetector-AEO/1.0` user agent; pass on 2xx.
2. `bot.notBlocked` [25]: fetch with the GPTBot user agent only (`:202`, `:436-463`).
3. `robots.aiAllowed` [20]: fails if the `*` group or any of 27 `AI_BOTS` disallows the path. Prefix matching only; `Allow` lines are ignored (`:303-349`).
4. `html.indexable` [15]: noindex in the X-Robots-Tag header or meta robots.
5. `md.twin` [10]: fetch `<path>.md` (or `/index.md`) with `Accept: text/markdown`; needs 2xx plus a `text/markdown` content type. No negotiation on the canonical URL.
6. `html.linkAlternate` [8]: a markdown alternate link in the header or HTML.
7. `site.llmsTxt` [7]: any 2xx passes. No HTML soft-404 rejection, no grammar check, no llms-full.txt.
8. `html.vary` [5]: `Vary` includes `Accept`.

The bot list has 16 training, 5 search and 6 user-action bots (`:23-138`), but `purpose` is never used in scoring. No Content-Signal, JSON-LD or agent-card handling.

**h. DESIGN.md (`system.ts`)**
- Format: Google Labs DESIGN.md YAML front matter, read with a subset parser that skips arrays (`:11-131`).
- Color matching: per-channel sRGB difference (max of the three channels, not Manhattan), with tolerance 10 for CTAs and 14 for surface/headings (`:218-230`). No Oklab and no DTCG tokens.json.
- Checks and weights: fonts 35, CTA colors 30, surface 15, headings 10, radii 10 (±2px, only radii between 3 and 64px are observed).

**i. Calibration**
- `packages/cli/calibration/corpus.json` has 13 rows (10 Clean, 3 Mild, 0 Heavy), definitions 2026.08, captured 2026-06-05. Labels are single-rater, "by eye".
- `run.mjs` reports accuracy and a confusion matrix only (`:35-78`); no precision, recall, F1 or ROC. Last result: 5/13 = 38.5% (`CALIBRATION.md:123`).
- No pre-2022 human baseline found.
- `VALIDATION.md` is a buyer-validation plan, not accuracy data.
- Leaderboard: `leaderboard.json` is 7,842 bytes, 24 sites, definitions 2026.09.

**j. spec/**
- `config.json`: spec and definitions version 2026.09, counts 27/9/8/5, tier bands, file map.
- No runnable conformance suite. `conformance.md` is prose; `spec-sync.test.js:20-69` only pins versions, counts, IDs and weights.

**k. apps/web**
- **API routes:** scan, aeo, fix-prompt, watch (+confirm/unsubscribe), dashboard/link, email/webhook (Resend bounces), cron/sweep, patterns, sites, stats, health, me/export, me/erase.
- **Pages:** /score(/:domain), /r/:id, /og/:id, /badge/:domain, /report/:domain, /dashboard, /directory, /leaderboard, /docs, /blog(/:slug), /brand.
- **Watch:** regression = tier gets worse or score rises by ≥8 (`_data.ts:142`, `:923-927`). Alerts are email only; `ERROR_WEBHOOK` is for ops errors, not users.
- **Rate limits:** 6 scans/min from the site, 3/min for callers with no Origin header (CLI/MCP), 20/min for fix-prompt; API-key tiers 10/60/unlimited (`api/_middleware.ts:36-46`, `:456-462`); daily cap defaults to 10,000 (`:551`).
- **i18n:** none (hard-coded `lang="en"`).

**l. Tests**
- Vitest across five packages: core 11 files (~82 cases), cli 7 (~33), mcp 3 (~15), action 2 (~10), web 44 (~520).
- Fixtures: 28 files in `packages/cli/test/fixtures` (18 `pat-*.html`), loaded as `file://` in real Chromium when `RUN_GOLDEN=1` (`ci.yml:62-69`). All 27 pattern IDs have a positive-fixture case.

## 3. Gaps and inconsistencies
1. `spec/system.md:22-25` claims "CIELAB ΔE ≤12/14" and radii rules (≥15%, <100px). There is no ΔE code anywhere; the code uses sRGB per-channel tolerance, fails when >50% are off-scale, and only observes 3–64px radii.
2. `README.md:430` says the AEO axis checks "JSON-LD, SSR prose". Neither exists (that is #205).
3. ROADMAP is out of date:
   - `ROADMAP.md:100` and #212 list MCP resources, prompts and annotations as future work, but they already shipped.
   - `ROADMAP.md:19` claims `Accept: text/markdown` negotiation. The site only serves `.md` URLs (`functions/index.ts:119` negotiates JSON only).
4. npm naming conflicts with what was actually published:
   - Docs telling users core is now `@slop-detect/core`, the old unscoped name is frozen, or to `npm install @slop-detect/core`: `CHANGELOG.md:38-49`, `PRODUCTION.md:42-47`, `packages/core/README.md:10`, `SKILL.md:141`. But H-04 published unscoped `slop-detect-core@0.8.0`.
   - The step label at `publish.yml:73` ("Publish @slop-detect/core") is misleading for the same reason.
   - `AGENTS.md:93-94` and `:104-105` describe runtime `workspace:*` links and a publish order that no longer apply.
5. Issue bodies point at things that don't exist:
   - `src/__tests__/*.test.ts`; tests are actually `packages/core/test/*.test.js`.
   - `FIX_RECIPES`; the export is `FIXES` (`fixes.ts:7`).
   - `scripts/calibrate.ts` and `_scheduled.ts`.
   - Categories `component`, `visual` and `typography`; valid categories are listed at `rules.ts:109`.
   - Separately, #203 calls the tolerance "Manhattan"; it is actually a per-channel max.
6. GitHub issue #99 is closed, but H-05 is still open in `HUMAN_ACTIONS.md:25` and the corpus is still 13 rows.
7. Krebs' corpus size is given as 1,400 (`SKILL.md:16`, `compare/index.md:37`) but 1,590 in `ROADMAP.md:45` and #196.
8. `AGENTS.md:95` describes the brand as "dark, monospace"; the web UI has been re-skinned light (`dashboard.tsx:1-2`).
9. `VALIDATION.md:44` references `apps/web/src`, which does not exist.
10. `SKILL.md:19` implies multiple bots are probed; only GPTBot is fetched.
11. The MCP server card (`server-card.json`) lacks the prompts and resources that `mcp.json` lists, and the MCP README documents neither them nor the extra environment variables.
12. Main still has the `icon_card_grid` tag-name grouping bug (`patterns.ts:539`); the fix exists only in 355f588.
13. Counts are hard-coded in the UI despite `AGENTS.md:89-90` saying never to (`index.html:737` "(9 tells)", `:798` "10/27 rules flagged").
14. The exit-code table in `conformance.md` omits `--fail-under` and fatal errors.
15. Likely: Tailwind v4 pages report computed colors as `oklch()`, which hits the exact-string fallback (`system.ts:228`) and produces false DESIGN.md drift. This strengthens #203.
