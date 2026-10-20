# GitHub ecosystem, competitors and distribution (deep pass, 2026-10-20)

This pass builds on `docs/research/roadmap-v4/github_ecosystem_distribution.md` (retrieved 2026-10-19) and `REPORT.md` (R-01 to R-09, W-01 to W-05, S-01 to S-06). It does not repeat that work. It refreshes the numbers, closes the gaps that file listed (Impeccable's live-URL capability, Glama mechanics, skills.sh install counts), and adds tools and needs that appeared between July and October 2026.

**Legend**
- **[V]**: verified on **2026-10-20** against a primary source: `gh api`, the npm registry or downloads API, the official MCP Registry API, the skills.sh page, the VS Code Marketplace or Open VSX API, or the vendor's own docs.
- **[U]**: unverified. The figure comes from a secondary source or could not be confirmed.
- **[P]**: verified by the previous pass on 2026-10-19 and not re-fetched here.

**How numbers were collected**
- npm downloads are for the "last-month" window **2026-09-19 to 2026-10-18** (`api.npmjs.org/downloads/point/last-month/<pkg>`).
- Stars come from `gh api repos/OWNER/REPO` (`stargazers_count`).
- No figure here is estimated.

---

## 0. What is new since the 10-19 pass

1. **Impeccable's detector scans live URLs.** This closes a gap the 10-19 pass left open. `npx impeccable detect https://example.com` "scan[s] a URL (uses an installed Chrome, Chromium, or Edge)". URL scans "inspect the rendered DOM, computed layout, and accessible linked stylesheets". There is a `--viewport` flag, defaulting to 1280×800. A new `--cdp 9222 --target` flag scans desktop and webview apps. Exit codes are `0` (clean), `2` (findings) and `1` (scan failure). [V] ([README](https://github.com/pbakaus/impeccable), [cli-v4.7.0 release](https://github.com/pbakaus/impeccable/releases/tag/cli-v4.7.0), [impeccable.style/docs/detector](https://impeccable.style/docs/detector))
   - **What Impeccable does not have:** a 0–100 score, SARIF, a GitHub Action, an MCP server, an AEO axis, a crawl or sitemap mode, or a published calibration. [V] ([docs/detector](https://impeccable.style/docs/detector) says "Not mentioned" for score, SARIF, Action, MCP and multi-URL. It is also absent from the MCP Registry: `search=impeccable` returns 0.)
   - **Consequence:** "real Chromium, computed styles" no longer sets slop-detect apart from Impeccable. What still does is the **calibrated score with tiers, the AEO axis, the CI and API surface, and a hosted no-install scanner**.
2. **Our skill is already listed on skills.sh.** `skills.sh/ravidsrk/slop-detect` shows **2 total installs**, "First Seen Aug 22, 2026". Its security audits read **Gen Agent Trust Hub: Pass, Socket: Pass, Snyk: Warn**. [V] The reason for the Snyk warning is [U]; the skill sends user URLs to `slop-detect.com` with `curl`, which is the likely trigger.
3. **New entrants since July 2026:**
   - **FixMySlop**: a GitHub Marketplace Action, npm and PyPI package, MCP server and Claude hook, with `baseline` and `--changed`.
   - **slop-eval**: an LLM-judge UI genericness scorer, listed in the MCP Registry.
   - **evilmartians/design-lint**: Oxlint and ESLint design-token rules for Tailwind v4.
   - **DefiTanjiro/ai-slop-detector**: a skill.
   - Several remote "slop" MCP servers.
   - Detail in §1.
4. **Unmet needs surfaced in public threads.** Each points at a feature slop-detect can ship (§5):
   - google/design.md #181 asks for a **rendered-page DESIGN.md conformance checker** and whether it "should live outside".
   - Hallmark #74 and the `ktlesr/skill-trigger-measurements` repo show people running **deterministic ablations of design skills**.
   - Impeccable #522 asks for **diff-scoped, pre-existing-aware findings**.

---

## 1. Competitor and adjacent-tool table (retrieved 2026-10-20)

Column key:
- **URL scan**: scans a rendered live URL.
- **Score**: produces a numeric 0–100 score.
- **Calib.**: publishes calibration or accuracy data.
- **↓ npm/mo**: npm downloads for 2026-09-19 to 2026-10-18.
- **skills.sh installs**: total installs on the skills.sh page.

All cells are [V] unless marked otherwise.

| Tool | Stars | Created / last push | Latest release | License | Rules | URL scan | CI / exit | MCP | SARIF | Score | Calib. | ↓ npm/mo | skills.sh installs |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **ravidsrk/slop-detect** (us) | 14 | 2026-05-26 / 2026-10-20 | tag v0.8.0 (no GH Release objects) | MIT | 27 design + 9 copy + 8 AEO | yes (Playwright) | Action (`fail-under`), CLI `--fail-on` | stdio, calls hosted API | basic, in CLI `detector.ts` | yes, plus tiers | 38.5% tier accuracy on 13 sites (CALIBRATION.md, per REPORT) | `slop-detect` 705; `slop-detect-core` 721; `slop-detect-mcp` 29 | 2 |
| pbakaus/impeccable | 83,409 (5,045 forks) | 2025-11-16 / 2026-10-20 | skill-v4.7.0, cli-v4.7.0, engine-v0.1.16 (all 2026-10-19) | Apache-2.0 | 61 deterministic + LLM critique | **yes** (local Chrome) | exit 0/2/1, `--json`, `--quiet` (#238) | no | no | no (finding counts only) | no | `impeccable` **771,577** | 1.9M total across 24 skills; `impeccable` skill 345.9K |
| Leonxlnx/taste-skill | 99,544 | 2026-02-19 / 2026-10-19 | v2.1.3 (2026-10-19) | MIT | agent rubric (LLM) | agent opens a browser | no | no | no | no | no | n/a | 5.5M total, 16 skills |
| Nutlope/hallmark | 30,416 | 2026-04-27 / 2026-08-06 | none | MIT | 57 gates (LLM self-critique) | `study URL` | no | no | no | no | third-party ablation (#74) | n/a (npm `hallmark` is an unrelated vweevers package) | 64.6K |
| anthropics/skills `frontend-design` | 182,333 (repo) | path last changed 2026-09-03 (#1713) | n/a | see repo | guidance only | no | no | no | no | no | no | n/a | **1.0M** (frontend-design skill) |
| AdrianKrebs/design-slop-cop | 18 | 2026-04-28 / 2026-07-07 | none | MIT | 14 DOM/CSS | yes (headless) | `node check.js URL --json` | no | no | yes | about 150 labelled sites, 5–10% FP [P] | not on npm | n/a |
| yetone/kill-ai-slop | 1,372 | 2026-07-10 / 2026-09-15 | none | Apache-2.0 | 33 tells (README) | no (source scan) | `scan.mjs --json`, `--only/--skip`, `--rules=extra.mjs` | no | no | no | no | not on npm | 3.2K |
| Gesso-Build/skills (`@gessobuild/anti-slop`) | 91 | 2026-07-28 / 2026-10-18 | npm 0.4.3 | MIT | 73 thresholds | no (static HTML/CSS) | `check dist/ --json`, exit 1; `fix --write` | no | no | no | field report in #2 | 198 | 34 |
| miqdadbadjuber/anti-slop | 6,606 | 2026-08-07 / 2026-10-16 | npm `antislop-ai` 3.2.21 | MIT | 38 rules (rulebook) | no | no | no | no | no | no | 9,897 (installer) | 32.9K over 6 skills |
| funboy322/avoid-ai-design | 119 | 2026-05-30 / 2026-09-24 | none | MIT | 67 tells, `detect.mjs` | no | PostToolUse recipe | no | no | no | no | n/a | 532 |
| Laith0003/ux-skill | 84 | 2026-05-24 / 2026-10-02 | npm `uxskill` 3.2.0 | MIT | 152 (Python) | [U] | score ≥ 90 loop | 18 tools [P] | [U] | yes | no | 219 | n/a |
| **MrSpideyNihal/FixMySlop** (new) | 44 | 2026-03-13 / 2026-10-19 | npm `fixmyslop` 0.6.7 | MIT | UI + code + security + deps rules | no (repo/source; web app scans GitHub repos) | **Marketplace Action** "FixMySlop AI Slop Linter"; `--fail-on medium`; **`baseline`**, **`--changed`** | yes (`init --all` writes MCP + Claude hook + CI + pre-commit) | [U] | yes ("slop score 100, grade F") + **README grade badge** | no | 1,588 | n/a |
| **RudrenduPaul/slop-eval** (new) | 0 | 2026-07-13 / 2026-10-18 | npm `slop-eval-cli` 0.1.6 | Apache-2.0 | LLM-judge rubric v1 (3 × 0–10) | `--url` fetches raw HTML only | Action posts a PR comment; `--fail-below`; content-hash cache | **in the MCP Registry** (`io.github.RudrenduPaul/slop-eval`) | no | yes | no | 222 | n/a |
| **evilmartians/design-lint** (new) | 13 | 2026-09-16 / 2026-10-13 | n/a | none declared | token rules for Tailwind v4 (Oxlint/ESLint) | no | via oxlint/eslint | no | via oxlint `--format sarif` | no | no | [U] | n/a |
| **DefiTanjiro/ai-slop-detector** (new) | 2 | 2026-09-20 / 2026-09-22 | none | MIT | about 100 patterns, 20 categories (LLM checklist) | no | no | no | no | no | no | n/a | 1 |
| Yuve21/slop-scorer (pivoted) | 0 | 2026-08-24 / 2026-09-12 | n/a | none | **retired its 0–99 score on 2026-09-11**; every finding must carry a locator; "abstention is a first-class status" | site checks | n/a | yes | n/a | **no, by design** | n/a | n/a | n/a |
| sloppatterns.com (`com.sloppatterns/slop-patterns`) | 1 | 2026-09-27 / 2026-10-16 | registry 1.2.1 (2026-10-12) | MIT | UI-code patterns | no | n/a | **remote MCP, registry-listed** | n/a | n/a | n/a | n/a | n/a |
| `io.github.0design/unslop` (registry) | n/a | registry 0.1.0, 2026-10-12 | — | — | "read-only canon of design and copy rules … served as resources" | no | n/a | remote MCP | n/a | n/a | n/a | n/a | n/a |
| `app.openkrill/design-md` (registry) | n/a | — | — | — | "Lint and diff DESIGN.md … or write one from a web page" | from a page | n/a | remote MCP | n/a | n/a | n/a | n/a | n/a |
| dembrandt/dembrandt | 3,745 | 2025-11-22 / 2026-10-11 | v0.39.2 (2026-10-11) | MIT | design-system extraction | yes | n/a | registry-listed; on Glama (200) | n/a | n/a | n/a | 19,967 | n/a |
| google-labs-code/design.md | 28,433 | 2026-04-10 / 2026-10-16 | 0.4.0 (2026-07-27) | Apache-2.0 | lint + diff | no (asked for in #181/#158) | CLI | no | no | n/a | n/a | `@google/design.md` **1,307,503** | n/a |
| scanaislop/aislop (code, not UI) | 694 | 2026-03-06 / 2026-10-20 | — | MIT | 50+ regex/AST rules (per slop-eval README [U]) | n/a | CI | n/a | n/a | n/a | n/a | n/a | n/a |
| VibeCheck (vibecheck.fail) | repo still not found | site returns 200 | — | — | 45+ heuristics [P] | yes | [U] | [U] | [U] | yes | [U] | n/a | n/a |
| febbhav/signs-of-ai-design | 27 | 2026-07-22 / 2026-07-31 | — | NOASSERTION (content CC BY-SA [P]) | field guide | — | — | — | — | — | — | — | — |

**Copy-axis neighbours that matter for distribution.** These are listed for their channel footprint, not as rivals.
- `io.github.dcadolph/slop-chop` publishes **cross-platform MCPB bundles** to the MCP Registry on almost every release: 0.40 to 0.53 between 2026-09-20 and 2026-10-20. It also has a VS Code extension with 5,610 Open VSX downloads.
- Open VSX also has `editnori.toneguard` (6,268 downloads) and `thias-se.llm-slop-detector` (5,040).
- No design-slop VS Code or Open VSX extension exists apart from Impeccable's skill-installer `renaissance-geek.impeccable` (1,464 installs, v4.2.2, updated 2026-09-07).
- All of the above is [V].

**Adoption signals for the category** [V]:
- **Respira**, an MCP layer for live WordPress, "wrote independent detection against my own rendered-check pipeline" from Impeccable's craft-floor list (Impeccable #587). Rendered-page checking of agent output is being rebuilt independently by downstream vendors.
- `yar-malik/ai-design-slop-before-after` uses `npx impeccable detect` as a PR gate. It notes 45 findings locally against 43 on GitHub Actions: "The number is environment-specific". This is a determinism complaint that slop-detect's pinned-Chromium API can answer.

**Takeaways**
- Impeccable is the gravity well: about 770k npm downloads a month, 1.9M skill installs, and now live-URL scanning.
- Slop-detect's reach is near zero: 705 CLI downloads a month, 29 MCP, 2 skill installs, 14 stars.
- Repo traffic for the 14 days to 2026-10-20 was **37 views (19 unique)** and **285 clones (109 unique)**, with one referrer (github.com). [V, `gh api …/traffic`]
- Monthly CLI downloads were: May 1,232 (launch), Jun 168, Jul 123, Aug 129, Sep 474, Oct (to the 18th) 304. Last week: 39. [V, npm range API]

---

## 2. Our traction (2026-10-20) [V]

| Metric | Value |
|---|---|
| GitHub stars / forks / watchers | 14 / 0 / 1 |
| Open issues | 19, including #196–#213 from roadmap v3 |
| Star history | 13 of the 14 stars are dated, spread one or two a month from 2026-06-18 to 2026-10-07; no launch spike |
| npm `slop-detect` 0.8.0 | 705 last month; 39 last week; 2,430 since 2026-05-26 |
| npm `slop-detect-core` 0.8.0 | 721 last month |
| npm `slop-detect-mcp` 0.8.0 | 29 last month; 918 since 2026-05-26 |
| npm `@slop-detect/core` | **does not exist** (404). AGENTS.md and the docs call the core package `@slop-detect/core`, but it is published as `slop-detect-core`. |
| skills.sh | listed; 2 installs; Snyk "Warn" |
| Official MCP Registry | **not listed** (search `slop` returns 50+ entries, none ours). No `server.json`; no `mcpName` in `packages/mcp/package.json`. |
| Glama | `glama.ai/mcp/servers/ravidsrk/slop-detect` returns **404** (dembrandt returns 200) |
| awesome-mcp-servers (punkpeye), awesome-claude-skills (ComposioHQ, travisvn), awesome-claude-code, VoltAgent/awesome-agent-skills | 0 mentions of slop-detect, and also 0 of Impeccable |
| GitHub Marketplace | not listed. Searching "slop" lists 15+ Actions, including FixMySlop's design-tells action. |
| Remote MCP | `POST https://slop-detect.com/mcp` returns **405**. `/.well-known/mcp/server-card.json` returns 200 but declares only `stdio` via `npx -y slop-detect-mcp`. |
| Claude plugin | no `.claude-plugin/` in the repo. The official directory has 315 plugins; none is a design-slop detector (Impeccable ships its own `.claude-plugin/marketplace.json`). |

---

## 3. Distribution checklist: exact requirements and our status

Ordered by reach × effort. Each row maps to the existing R-xx items.

| # | Surface | Requirements (source) | Our status (2026-10-20) | Next step | Maps to |
|---|---|---|---|---|---|
| D1 | **skills.sh / `npx skills`** (`skills` CLI 22,913,466 downloads/month [V]) | Listing is automatic from install telemetry for public repos [P]. The page shows three security audits: Gen Agent Trust Hub, Socket, Snyk ([skills.sh/audits](https://skills.sh/audits)). SKILL.md `name` ≤ 64 characters, `description` ≤ 1,024 [P]. | Listed; 2 installs; **Snyk Warn**. The SKILL.md body still credits a "1,400 Show HN" study and "Meng To's Aura study". The v4 audit flags these provenance claims. | Clear the Snyk warning: make the offline CLI path the default, and state what data leaves the machine. Add the badge `https://skills.sh/b/ravidsrk/slop-detect`. Re-check the provenance wording against citation_audit.md. | R-01 |
| D2 | **Official MCP Registry** (feeds the GitHub MCP Registry and VS Code `@mcp`) [P] | `packages/mcp/server.json` (schema 2025-12-11). `mcpName` in package.json must equal the server name. Auth via GitHub OIDC (`io.github.ravidsrk/*`) or HTTP `/.well-known/mcp-registry-auth` (`com.slop-detect/*`). Run `mcp-publisher publish` after npm publish ([docs](https://github.com/modelcontextprotocol/registry/tree/main/docs/modelcontextprotocol-io)) [P]. | Not listed; no `server.json` or `mcpName`. Competing "slop" entries already rank (sloppatterns, slop-eval, slop-chop, desloppy, zero-slop). | Ship R-02 as written. Consider also publishing **MCPB bundles**, as slop-chop does; the bundle URL must contain "mcp" [P]. | R-02 |
| D3 | **Glama** (106,856 servers indexed [V]) | Sign in with GitHub OAuth plus write access to the repo; "Servers cannot be submitted on behalf of someone who does not control the source". Glama builds from a checked-in or inferred **Dockerfile**: "Listings only become discoverable once a reproducible build succeeds". It sandboxes the server and captures tool, resource and prompt schemas. Tools are scored with **TDQS**: 70% tool-definition quality, 30% coherence ([methodology](https://glama.ai/mcp/methodology), [TDQS](https://github.com/glama-ai/tool-definition-quality-score)). [V] | 404 | Claim the listing. Add `packages/mcp/Dockerfile` (node:22-slim, `npx slop-detect-mcp`). Tune tool descriptions against the TDQS rubric. | **new (G-03)** |
| D4 | **punkpeye/awesome-mcp-servers** (96,640 stars) | Public GitHub repo; remote-only servers go to awesome-remote-mcp-servers. One line, alphabetical within its category, link to the repo, short description. Agent PRs append `🤖🤖🤖` to the title to be fast-tracked ([CONTRIBUTING](https://github.com/punkpeye/awesome-mcp-servers/blob/main/CONTRIBUTING.md)). De facto rule: **3,097 of 4,382 entries carry a Glama score badge** [V]. | absent | After D3: open a PR with `📇 ☁️` (TypeScript, calls a cloud API) and the Glama badge, under a design or testing category. | G-03 |
| D5 | **Claude Code plugin + official directory** | `.claude-plugin/marketplace.json` (`name`, `owner`, `plugins[]`) plus `plugins/<name>/.claude-plugin/plugin.json`, `.mcp.json`, `skills/`. Check with `claude plugin validate .` [P]. Submit through [clau.de/plugin-directory-submission](https://clau.de/plugin-directory-submission): "External plugins must meet quality and security standards" [V]. Example: Impeccable's marketplace.json uses `"source": "./plugin"`, `"category": "design"` [V]. | absent | Ship R-03 and **bundle a hook** (`PostToolUse` or `Stop` running a local scan) as well as the skill and MCP server; Impeccable's install leads with hooks. | R-03, W-03 |
| D6 | **Remote MCP** at slop-detect.com/mcp | Stateless Streamable HTTP per the 2026-07-28 spec [P]. Prerequisite for Smithery URL publishing, OpenAI plugins, claude.ai, Lovable and v0 (below). | 405; the server card advertises stdio only | R-04. Then add `remotes` to server.json and server-card.json. | R-04 |
| D7 | **Lovable chat connectors** | "Open Connectors → Chat connectors → New MCP server", giving a name and URL. OAuth is the default; bearer and API-key are allowed. "available on all plans … never part of your published app" ([docs.lovable.dev/integrations/custom-mcp](https://docs.lovable.dev/integrations/custom-mcp)) [V via search snippet; page not opened] | impossible without D6 | Document a "Use slop-detect inside Lovable" recipe once R-04 ships. No auth is needed because the API is anonymous. | **new (G-05)** |
| D8 | **v0 MCP connections** | Bring-your-own MCP servers through the prompt form or the MCP Connections settings page; custom headers, bearer or OAuth. "MCP servers only provide tools for v0 to use during generation" ([v0 docs mirror](https://atlas-signatures.v0.build/docs/MCP)) [U: mirror domain] | impossible without D6 | Same recipe as D7. | G-05 |
| D9 | **GitHub Marketplace Action** | `action.yml` at the **repository root**; publishing needs 2FA and acceptance of the Marketplace agreement [P]. | Action lives at `packages/action/` (composite, calls the hosted API). Branding is `eye`/`gray-dark`. Not listed. | R-05 (`ravidsrk/slop-detect-action`). Add a local-Chromium mode so private previews behind auth can be scanned; today the Action POSTs the URL to the public API. | R-05, W-02 |
| D10 | **Vercel Deployment Checks** | Integrations receive `deployment.created`, register checks with the Checks API (OAuth2), and conclude after `deployment.ready`. Production promotion is held "until all required checks pass". Conclusions: `canceled`, `failed`, `neutral`, `succeeded`, `skipped` ([docs](https://vercel.com/docs/deployment-checks), [Checks API](https://docs.vercel.com/docs/checks/checks-api)) [V via search snippets]. Simpler route: deployment checks can **require selected GitHub Actions** ([changelog](https://vercel.com/changelog/block-vercel-deployment-promotions-with-github-actions)). | none | Phase 1: a docs recipe that makes the R-05 Action a required check for Vercel promotion. Phase 2 (optional): a Vercel Marketplace integration. | **new (G-06)** |
| D11 | **Netlify build plugin** | `@netlify/plugin-lighthouse` precedent: runs `onSuccess` against the live deploy, or `onPostBuild` when thresholds should fail the deploy; configured in `netlify.toml`; cannot audit pages behind login ([netlify-plugin-lighthouse](https://github.com/netlify/netlify-plugin-lighthouse)) [V via search snippet] | none | `netlify-plugin-slop-detect` wrapping the CLI against `DEPLOY_PRIME_URL`. | G-06 |
| D12 | **Cloudflare Pages** | No first-party checks hook was found [U]. | — | Covered by the Action recipe. | — |
| D13 | **Lighthouse plugin** | A node module named `lighthouse-plugin-*` with Lighthouse as a peerDependency. Plugins **cannot gather custom artifacts**; only `MainDocumentContent`, `ImageElements`, `LinkElements`, `MetaElements`, `Scripts`, `Trace`, `DevtoolsLog` and similar are available ([plugins.md](https://github.com/GoogleChrome/lighthouse/blob/main/docs/plugins.md)) [V]. | — | A plugin **cannot compute styles**, so the design axis is impossible. Only copy-axis and HTML-level AEO audits could ship as `lighthouse-plugin-slop-copy`. This gives reach into LHCI (7.1M downloads/month) and unlighthouse (178,847/month) [V], but is low priority. | **new (G-08, P3)** |
| D14 | **Microsoft APM** (microsoft/apm, 4,071 stars [V]) | `apm.yml` lists `dependencies.apm` (skills, e.g. `anthropics/skills/skills/frontend-design`) and `dependencies.mcp`. A lockfile pins content hashes. Install-time Unicode scanning; transitive MCP servers are blocked unless declared ([README](https://cdn.jsdelivr.net/gh/microsoft/apm@main/README.md)) [U: secondary summary]. Impeccable users asked for it (#289, closed) [V]. | — | Add an "Install with APM" snippet. Repo layout already resolves (`ravidsrk/slop-detect/skills/slop-detect`). | G-03 |
| D15 | **Cursor / Agent Plugins / OpenAI** | As verified in the 10-19 pass [P]. | — | — | R-06, R-08 |
| D16 | **VS Code / Open VSX extension** | No design-slop extension exists. Copy-slop extensions reach 5–6k Open VSX downloads [V]. | — | Out of scope until W-03 exists; an extension would wrap local scanning of a dev-server URL. | later |

---

## 4. Copyable features from mature adjacent tools

| Feature | Source (verified 2026-10-20) | Why it fits slop-detect | Lands in |
|---|---|---|---|
| **`--format agent`**: terse, one-line-per-finding output for AI agents, auto-selected under agents or in CI by Nx | Oxlint CLI formats list "checkstyle, default, agent, github, gitlab, json, junit, sarif, stylish, unix" ([oxc CLI](https://oxc.rs/docs/guide/usage/linter/cli.html)). Oxc's coding-agent guide: "Before finishing, run `npx oxlint --deny-warnings --format=agent`" ([coding-agents](https://oxc.rs/docs/guide/usage/coding-agents.html)). [V] | The skill and MCP fix loop re-reads output and pays tokens for it. One format can serve the CLI, the hooks and the MCP text content. | **G-02** |
| **Multi-reporter matrix**: github, gitlab, junit, checkstyle, rdjson, sarif | Biome reporters ([biomejs.dev/reference/reporters](https://biomejs.dev/reference/reporters/)) [V] | `github` (workflow annotations) is W-02; `sarif` is #211; `gitlab` and `junit` are cheap once W-01 fixes the schema. | G-02, W-02, #211 |
| **ESLint-style assertion grammar + presets + `aggregationMethod`** (`median-run`, `pessimistic`) **+ `assertMatrix`** per URL pattern | LHCI configuration.md: "eslint-style format of `level \| [level, options]`"; presets `lighthouse:all`, `lighthouse:recommended`, `lighthouse:no-pwa`; aggregation `pessimistic` / `median-run`; `assertMatrix` ([LHCI docs](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md)) [V] | #207c already adopts the grammar. Add `assertMatrix` so marketing pages and app pages get different budgets, and N-run aggregation to absorb the "environment-specific number" complaint seen with Impeccable. | #207c, #210 |
| **`temporary-public-storage` report links** | LHCI `--upload.target=temporary-public-storage` [V] | Slop-detect already hosts reports, so give permalinks to CI scans (#209 asks for "stable report permalinks"). | #209 |
| **"Needs review" tier and `reviewOnFail`** | axe-core API: `reviewOnFail` overrides a failed rule to "Needs Review" rather than "Violation" ([axe API.md](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md)) [V]. Yuve21/slop-scorer: "abstention is a first-class status" [V]. Impeccable separates primary findings from non-failing advisories [V]. | Zero-weight tells (REPORT: new tells enter at weight 0) need a visible non-scoring status. Unmeasurable cases (cross-origin CSS, image backgrounds) should report `unknown`, not pass, matching design.md #181's proposal. | **G-04**, K-04 |
| **`runOnly` by tag** | axe `runOnly: ['wcag2a','wcag2aa']` [V] | Maps to `--only/--skip` and presets by axis (`design`, `copy`, `aeo`, `provenance`). | #207c |
| **Baseline + `--changed`** | FixMySlop: `fixmyslop baseline` ("accept today's issues, report only new ones") and `scan --changed` ("only what changed vs main") [V]. Impeccable #522: "don't report findings my session didn't cause"; the Stop pass "suppresses confirmed pre-existing findings when a verified before-edit baseline is available" [V]. | #209 covers branch baselines. Add a **session or hook baseline** for W-03 hooks, so an agent sees only regressions it introduced. | #209, W-03 |
| **Inline waivers with reason + `--no-inline-ignores`** | Impeccable: `<!-- impeccable-disable overused-font: exported brand doc -->`, `-line` / `-next-line` variants, `ignores add-value overused-font Inter --reason "Brand font"`; `--no-config` gives a raw scan [V] | #207c plans `data-slop-ignore`. Copy the **reason field**, and an audit flag that shows the raw score. | #207c |
| **README grade badge for repos** | FixMySlop shows `fix-my-slop.vercel.app/badge/<owner>/<repo>` [V]. Slop-detect already serves URL badges. | Promote the existing badge in the README and Action summary as a growth loop. | R-09 |
| **One-command multi-harness install with hooks** | `npx impeccable install --providers=claude,codex,cursor,grok,hermes,veto --scope=project\|global`; writes provider-native hook manifests (Claude `.claude/settings.local.json`, Copilot `.github/hooks/impeccable.json`, Cursor `.cursor/hooks.json`, Codex `.codex/hooks.json`) [V]. FixMySlop: `init --all` writes "config + agent rules + skill + MCP + Claude hook + CI + pre-commit" [V]. | This is the distribution mechanic behind Impeccable's numbers. `slop-detect init` is cheaper than a marketplace listing and works today. | **G-01**, W-03, #212 `--init-hooks` |
| **Content-hash cache so a gate cannot flap** | slop-eval caches by input hash: "an unchanged PR can't flap a CI gate" [V] | Cache by (URL, rendered-HTML hash, definitionsVersion) and return the same score. Supports K-10 "never compare across versions". | #209 |
| **Exit-code contract 0 / findings / operational error** | Impeccable 0/2/1 [V]; slop-eval 0/1/2 [V]; ora/ax `--min-score` [P] | Document ours explicitly in W-01. Use a distinct code for "scan could not run" (WAF, 422 empty page) so CI does not treat an outage as clean. | W-01, W-02 |
| **Viewport flag + desktop/webview via CDP** | Impeccable `--viewport 390x844`, `--cdp 9222 --target` [V] | Mobile-viewport scoring is a natural axis extension. CDP attach lets W-03 reuse an already-running dev browser. | W-03 |
| **Tailwind-token lint at source** | evilmartians/design-lint (Oxlint/ESLint): hard-coded colours, palette colours, typography and radius outside tokens, with `strict`/`basic` presets [V] | Complements S-01 rendered coverage. Recommend it in docs as the "source-side" pair rather than building it. | S-01 docs |

---

## 5. Unmet needs in competitor and neighbour threads

| Thread | Need (quoted or paraphrased) | What slop-detect can offer |
|---|---|---|
| google-labs-code/design.md **#181** (2026-10-07, open, 0 comments) | `lint` "can't tell whether a page generated from that DESIGN.md actually uses the tokens". The author proposes a Playwright checker reporting pass, fail or `unknown`, and asks whether "checking implementations [is] in scope for this repo, or should it live outside?" [V] | `check_design_system` already does rendered-page DESIGN.md conformance. Answer #181 with a link and align output with design.md's rule names (S-02). This is the most direct acquisition channel found: `@google/design.md` has 1.31M npm downloads a month. |
| design.md **#158** (open, 3 comments) | "static parsing a DESIGN from website" [V] | #204's `--extract-tokens` (or point to dembrandt). |
| Impeccable **#522** (closed) | Scope Stop-pass findings to lines changed in the session [V] | A session baseline in hooks (G-01 + #209). |
| Impeccable **#238** (closed) | `--quiet` "for CI / pre-commit use" [V] | `--format agent` / `github` (G-02). |
| Impeccable **#289** (closed) | APM distribution [V] | APM snippet (D14). |
| Impeccable false-positive bugs **#963, #988** (open), #882, #881, #867 (closed) | cramped-padding on wrapper chains; **mixing mutually exclusive `@media` values**; closed `<details>` counted as occluder; gradient contrast composited over black [V] | Fixture ideas for slop-detect's own craft-floor checks (REPORT's F-xx). They also show that the rendered (computed-style) approach avoids the static `@media` mixing class of bug. |
| Hallmark **#74** (open) and `ktlesr/skill-trigger-measurements` (1 star, reports for Impeccable 4.2.2/4.5.2, Hallmark, better-typography, animate) | Third parties run **deterministic ablations** ("same four landing-page tasks, once with the skill installed and once without… No LLM judge") to test whether design skills work [V] | **G-07 skill-efficacy benchmark**: a published harness that scores skill-on and skill-off outputs with slop-detect. It positions slop-detect as "the verifier generators call" (R-09). |
| Hallmark **#28** (open) | "Cross-Generation Design Similarity Detection": generations converge structurally even when each passes the gates [V] | Overlaps #198 (layout entropy and similarity). A corpus-level "convergence vs. your last N scans" view fits the watch and history feature. |
| Hallmark **#12** (open PR) | "Add eval-driven quality harness for Hallmark outputs" [V] | Same opportunity as G-07. |
| design-slop-cop **#2, #3** (open) | New patterns: "Fake demo UI", "Hover cards" [V] | "Fake demo UI" equals #196 Potemkin UI. Coordinate with Krebs on shared fixtures and calibration (#213). |
| kill-ai-slop **#3** (closed) | "SKILL.md description exceeds the Agent Skills specification limit" [V] | Validates R-01's CI check on frontmatter length. |
| Hallmark **#76** (open) | "Relative links in skills/hallmark/SKILL.md break after `npx skills add`" [V] | Test that our SKILL.md links resolve after installation; add to R-01 CI. |

---

## 6. Candidate roadmap items

These are new items, prefixed **G-**. Each states its relation to #209–#212 and R/W/S items. Priorities follow the REPORT scale.

### G-01 · `slop-detect init`: one-command multi-harness setup with hooks · P1 · v0.10.0
- **Build:** `npx slop-detect init [--providers=claude,cursor,codex,copilot] [--scope=project|global] [--ci github] [--no-hooks]`. It writes:
  - the skill;
  - an MCP entry, local-mode stdio (W-03);
  - provider-native hook manifests (Claude `PostToolUse`/`Stop`, Cursor `hooks.json`, Codex `.codex/hooks.json` with the trust-approval notice, Copilot `.github/hooks/*.json`);
  - optionally `.github/workflows/slop-detect.yml`.
  The hooks scan the dev-server URL from config and report **only regressions against a session baseline**.
- **Evidence:** Impeccable's install and hooks flow and its #522 diff-scoping need. FixMySlop's `init --all`. Impeccable's npm figure is 771,577 a month against our 705. [V]
- **Acceptance:**
  - Fixture repos for Claude Code and Cursor get working hooks from one command.
  - Re-running `init` is idempotent.
  - A hook run with no design change produces zero output.
  - `--no-hooks` writes no hook files.
- **Relation:** Implements #212's `--init-hooks` and depends on W-03. Supersedes the "recipes" half of R-09.

### G-02 · Reporter matrix with `--format agent|github|sarif|junit|gitlab|json` · P1 · v0.10.0
- **Build:**
  - A single reporter layer over the W-01 schema.
  - `agent` prints one line per finding, as `pattern-id selector: message → fix`, with no banners.
  - `agent` is the default when `CI` is unset and an agent is detected (`CLAUDECODE`, `CURSOR_AGENT` and similar env vars, to be verified per harness).
  - `github` emits `::warning`/`::error` (W-02). `sarif` is #211.
- **Evidence:** Oxlint `--format agent` plus the Oxc coding-agent guide; Biome's 11 reporters; Impeccable #238. [V]
- **Acceptance:**
  - Golden-file tests for each format.
  - `agent` output for a Heavy page is ≤ 25% of the default output's bytes.
  - The SARIF validates against 2.1.0.
- **Relation:** Merges W-02 and the reporter half of #211. Leaves #211's source-mapping work separate.

### G-03 · Directory hygiene: Glama, awesome lists, APM, skills.sh audit · P1 · v0.9.0
- **Build:**
  - A Dockerfile for `slop-detect-mcp` and a Glama claim.
  - TDQS-guided tool descriptions: every tool states its inputs, side effects (a network call to slop-detect.com), rate limits and output.
  - A PR to punkpeye/awesome-mcp-servers with the Glama badge.
  - PRs to awesome-claude-skills and VoltAgent/awesome-agent-skills.
  - An APM snippet in the README.
  - Clear the skills.sh **Snyk Warn** by stating data egress in SKILL.md and offering the offline CLI first.
  - Fix the `@slop-detect/core` vs `slop-detect-core` naming in AGENTS.md and the docs.
- **Evidence:** §2 and §3 (D1, D3, D4, D14). [V]
- **Acceptance:**
  - The Glama page returns 200 and is "discoverable" (the build succeeds).
  - The awesome-mcp-servers PR is merged.
  - skills.sh shows Snyk "Pass".
  - No doc references `@slop-detect/core` unless that package is published.
- **Relation:** Sits beside R-01 and R-02 in v0.9.0; it is not a code feature.

### G-04 · "Needs review" and `unknown` result status · P1 · v0.10.0
- **Build:** Add `status ∈ {fail, review, unknown, pass}` per pattern in the W-01 schema.
  - Zero-weight tells and low-confidence matches report `review`. These never move the score.
  - Unmeasurable checks report `unknown`: cross-origin CSS, translucent or gradient backgrounds, bot-blocked fetches. They are excluded from the denominator, and the scan reports coverage.
- **Evidence:** axe `reviewOnFail`; Yuve21's abstention model; Impeccable's split between primary findings and advisories; design.md #181 "reported as `unknown`, never `pass`". [V]
- **Acceptance:**
  - A WAF-challenge fixture yields `unknown` with exit code "could not scan", never Clean.
  - A zero-weight pattern appears under `review` with score delta 0.
- **Relation:** Required by REPORT's "new tells enter at zero weight" and K-04. Feeds #208, since locations are attached to review items too.

### G-05 · Remote-MCP builder recipes: Lovable, v0, claude.ai, ChatGPT · P2 · v0.10.0 (after R-04)
- **Build:** Docs and a landing section titled "Add slop-detect to Lovable / v0" with the connector URL `https://slop-detect.com/mcp`, no auth. Optionally, a Lovable workspace skill text that calls `scan_page` on the preview URL before publishing.
- **Evidence:** Lovable custom MCP connectors ("available on all plans") [V via search]; v0 bring-your-own MCP [U]. The category's target users build in these tools (repo topics already include `lovable` and `v0`).
- **Acceptance:** A tested walkthrough per builder in which the connector lists all 4 tools, and a scan of a generated preview succeeds.
- **Relation:** Depends on R-04. Extends R-09.

### G-06 · Deploy-gate recipes: Vercel Deployment Checks, Netlify plugin · P2 · v0.11.0
- **Build:**
  - (a) A docs recipe making the R-05 Action a **required check** for Vercel production promotion.
  - (b) `netlify-plugin-slop-detect`, which scans `DEPLOY_PRIME_URL` `onSuccess`, or `onPostBuild` with a threshold, and is configured in `netlify.toml`.
  - (c) Optional later: a Vercel Marketplace integration using the Checks API.
- **Evidence:** Vercel deployment-checks docs and changelog; the `@netlify/plugin-lighthouse` precedent. [V via search snippets]
- **Acceptance:**
  - A demo Vercel project blocks promotion on a Heavy page.
  - The Netlify plugin fails a deploy above its threshold.
- **Relation:** Builds on R-05, #209 (compare to production) and #210 (static dist on Netlify `onPostBuild`).

### G-07 · Skill-efficacy benchmark (`slop-detect bench`) and public leaderboard · P2 · v0.11.0
- **Build:**
  - A harness that takes N briefs × {skill on, skill off} output directories (or URLs).
  - It scores each with pinned definitions and reports per-pattern deltas with confidence intervals.
  - Publish results for frontend-design, Impeccable, Hallmark and taste-skill with method and raw data, in the style of `ktlesr/skill-trigger-measurements`.
- **Evidence:** Hallmark #74, the ktlesr reports and Hallmark PR #12 show demand for deterministic skill evaluation. The skills involved have 1.0M, 345.9K and 64.6K installs. [V]
- **Acceptance:**
  - The harness is reproducible from a lockfile (definitionsVersion and Chromium version pinned).
  - The first report is published with raw TSV.
  - Re-running gives byte-identical scores.
- **Relation:** Gives R-09 ("the verifier generators call") a data-led launch. Reuses the K-01 calibration harness and #213 corpus tooling.

### G-08 · `lighthouse-plugin-slop-copy` (copy + HTML-level AEO only) · P3 · after v1.0
- **Build:** A Lighthouse plugin category built from `MainDocumentContent`, `MetaElements` and `LinkElements`: the copy axis, chatbot artifacts (C-02, C-03, C-05) and HTML-level AEO.
- **Constraint:** The plugin must state that the design axis is unavailable because plugins cannot gather computed styles.
- **Evidence:** Lighthouse plugin handbook's artifact list [V]; LHCI at 7.1M and unlighthouse at 178,847 downloads a month [V].
- **Acceptance:** It runs under `lighthouse --plugins=` and in LHCI with assertions.
- **Relation:** Distribution only. It must not diverge from core: it imports `slop-detect-core` rules.

### G-09 · Determinism and env-pinning statement · P2 · v0.10.0
- **Build:**
  - Every result records `definitionsVersion`, Chromium version, viewport and UA.
  - `--runs N --aggregate median|pessimistic`, as in LHCI.
  - Publish the hosted API's pinned environment so "local vs CI" deltas are explainable.
- **Evidence:** The `yar-malik` repo saw 45 findings locally against 43 on GitHub Actions with Impeccable ("The number is environment-specific") [V]. LHCI offers `aggregationMethod` [V].
- **Acceptance:**
  - The same URL scanned by the CLI in CI and by the API returns an identical score, or a documented env diff.
  - The `--runs 3` variance is reported.
- **Relation:** Supports #209 (no false deltas) and K-10.

### Notes on existing items
- **#209 baseline ratcheting**:
  - Add a **content-hash cache** (slop-eval precedent) and LHCI `assertMatrix` per URL pattern.
  - Add a session baseline for hooks (G-01).
- **#210 static dist + crawl**: Gesso's `check dist/` and Impeccable's `detect src/` are the competing UX. Ours should accept a directory and serve it, not read raw HTML, to keep the computed-style advantage.
- **#211 SARIF**: basic SARIF output already exists in `packages/cli/src/detector.ts` (`$schema: sarif-2.1.0`). Re-scope #211 to fingerprints, categories and source mapping, and move reporter plumbing to G-02.
- **#212 MCP v2**: priority order:
  1. registry publish (R-02);
  2. remote endpoint (R-04);
  3. `--init-hooks` (G-01);
  4. resources and prompts, which Copilot's cloud agent ignores [P].
  The current server card advertises stdio only; update it when R-04 ships.

---

## 7. Gaps and caveats
- **skills.sh audit detail:** the reason behind Snyk's "Warn" could not be retrieved; no audit detail page was found [U]. Install counts are skills.sh's own telemetry and are not independently verifiable.
- **Not opened directly:**
  - The Lovable, v0 and Vercel Checks pages were read through search-result snippets only.
  - The v0 source is a mirror domain [U].
  - The Microsoft APM details come from a README summary [U].
- **VibeCheck:** the repo is still not found.
- **Glama:** the submission UI flow was not exercised (it needs an authenticated session).
- **Rule overlap:** rule lists for Hallmark (57) and Gesso (73) were still not diffed against our 27 + 9.
- **FixMySlop:** whether its SARIF output exists is [U]. Its design-rule count was not extracted.
- **Registry search:** the MCP Registry search for `slop-detect` timed out. Absence is established by the `search=slop` result set (50 entries returned, none ours) and the empty `search=ravidsrk` result.
- **Traffic data:** GitHub traffic covers a rolling 14 days only.
