# slop-detect

> **Score any landing page against the versioned design-slop fingerprint, copy axis, `DESIGN.md` system compliance, craft floor, and AEO readiness — then keep it clean.**
> Audit live pages in real headless Chromium, verify rendered tokens against your own `DESIGN.md`, check if AI answer engines can read and cite your site, and generate a copy-paste remediation prompt for your coding agent.

<p>
  <a href="https://github.com/ravidsrk/slop-detect/actions"><img alt="CI" src="https://github.com/ravidsrk/slop-detect/workflows/ci/badge.svg" /></a>
  <a href="https://www.npmjs.com/package/slop-detect"><img alt="npm: slop-detect" src="https://img.shields.io/npm/v/slop-detect.svg?label=slop-detect" /></a>
  <a href="https://www.npmjs.com/package/slop-detect-core"><img alt="npm: slop-detect-core" src="https://img.shields.io/npm/v/slop-detect-core.svg?label=slop-detect-core" /></a>
  <a href="https://www.npmjs.com/package/slop-detect-mcp"><img alt="npm: slop-detect-mcp" src="https://img.shields.io/npm/v/slop-detect-mcp.svg?label=slop-detect-mcp" /></a>
  <a href="https://slop-detect.com"><img alt="Live demo" src="https://img.shields.io/badge/live-slop--detect.com-22c55e" /></a>
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-blue.svg" /></a>
  <img alt="Node" src="https://img.shields.io/badge/node-%3E%3D20-339933" />
</p>

<p>
  <a href="#try-it-now">Quickstart</a> ·
  <a href="#the-five-axes">The 5 Axes</a> ·
  <a href="#ai-coding-agents-mcp--skills">MCP &amp; Agents</a> ·
  <a href="#ci-gates--github-action">CI &amp; GitHub Action</a> ·
  <a href="#programmatic-sdk-slop-detect-core">JavaScript SDK</a> ·
  <a href="#share-badges--domain-monitoring">Badges &amp; Monitoring</a> ·
  <a href="#developer-documentation">Docs</a>
</p>

<p align="center">
  <img src="apps/web/public/media/hero-optical-instrument.png" alt="Optical DOM Spectrometer — 5-Layer Inspection Plane Architecture" width="100%" />
</p>

```text
$ npx slop-detect https://bolt.new https://www.aura.build https://news.ycombinator.com

https://bolt.new
What will you build today?
  🟡 Mild  ·  score 24/100  ·  5 patterns triggered
  ✗ AI-default font stack (Inter / Geist / Space Grotesk)       (+8)
  ✗ Gradient-heavy backgrounds (5+ elements)                    (+4)
  ✗ Big colored box-shadow glows (purple/blue/pink)             (+4)
  ✗ Centered hero in generic sans (Inter-style)                 (+4)
  ✗ Perma dark mode + medium-grey body text                     (+4)

https://www.aura.build
Create beautiful designs
  🟡 Mild  ·  score 20/100  ·  4 patterns triggered
  ✗ AI-default font stack (Inter / Geist / Space Grotesk)       (+8)
  ✗ Glassmorphism (backdrop-filter blur on translucent layers)  (+4)
  ✗ Big colored box-shadow glows (purple/blue/pink)             (+4)
  ✗ Centered hero in generic sans (Inter-style)                 (+4)

https://news.ycombinator.com
  🟢 Clean  ·  score 3/100  ·  1 pattern triggered
```

---

## Why this exists

By April 2026, default-template landing pages had converged on a measurable visual and prose fingerprint: Inter/Geist font stacks, purple-to-blue gradient heroes, "Now in Beta" eyebrow pills, gradient-letter testimonial avatars, identical icon-topped feature cards, and formulaic antithesis copy. [Adrian Krebs's study](https://www.adriankrebs.ch/blog/design-slop/) scored ~1,400 Show HN submissions with Playwright and found **67% carried detectable default-template fingerprints**.

`slop-detect` reproduces Krebs's methodology, adds the signals from [Meng To's May 2026 Aura study](https://x.com/MengTo/status/2058893181740359863), integrates typography and contrast checks from [Impeccable](https://github.com/pbakaus/impeccable), and packages the deterministic engine (`definitions@2026.11`) across every surface developers use:

- **`slop-detect` (CLI)** — Local Playwright runner, static HTML directory auditor, `DESIGN.md` linter, and SARIF/JUnit/agent reporter
- **`slop-detect-mcp` (MCP Server)** — Stdio (`--local`) and stateless Streamable HTTP (`https://slop-detect.com/mcp`) server with 7 tools for Claude Code, Cursor, Windsurf, v0, and Lovable
- **`ravidsrk/slop-detect` (GitHub Action)** — PR gate with sticky scorecards, SARIF Code Scanning upload, and baseline regression ratcheting
- **`slop-detect-core` (SDK)** — Pure, zero-dependency TypeScript engine for Node, Cloudflare Workers, or custom browser pipelines
- **[`slop-detect.com`](https://slop-detect.com) (Web & REST API)** — Interactive X-Ray DOM spectrometer, shareable permalinks, live SVG badges, and domain regression monitoring

---

## Try it now

```bash
# 1. Terminal CLI (runs real headless Chromium locally)
npx slop-detect https://your-site.com
npx slop-detect https://your-site.com --copy --craft --aeo --design-md auto

# 2. Terminal CLI without a local browser (delegates to the hosted API)
npx slop-detect https://your-site.com --copy --remote

# 3. Generate a remediation prompt for Claude Code, Cursor, or v0
npx slop-detect https://your-site.com --copy --fix-prompt > fix.md

# 4. Bootstrap MCP + Agent Skill + PostToolUse hooks in your project
npx slop-detect init

# 5. Public HTTP REST API (zero auth required)
curl -s -X POST https://slop-detect.com/api/scan \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://your-site.com","axes":["design","copy"],"designMd":true}' | jq
```

---

## The five axes

<p align="center">
  <img src="apps/web/public/media/five-axis-model.svg" alt="Figure 01 · Five-Axis Orthogonal Telemetry Model" width="100%" />
</p>

All surfaces run the **exact same engine** (`definitions@2026.11`). Notice the **score polarity**: for Design and Copy slop, **lower is better (`0` = cleanest)**; for System, Craft, and AEO, **higher is better (`100` = best)**.

| Axis | Catalogue (`2026.11`) | Polarity | Tier Bands | Spec & Guide |
| --- | --- | --- | --- | --- |
| **1. Design Slop** | 45 CSS & DOM patterns (weight 0 review rules add no points) | **Lower is better** | `Clean` (`0–9`) · `Mild` (`10–27`) · `Heavy` (`28+`) | [`spec/patterns.md`](spec/patterns.md) |
| **2. Copy Slop** | 26 prose, vocabulary & chatbot-artifact rules | **Lower is better** | `Clean` (`0–7`) · `Mild` (`8–19`) · `Heavy` (`20+`) | [`spec/copy-axis.md`](spec/copy-axis.md) |
| **3. System (`DESIGN.md`)** | 9 live DOM token compliance checks (`DESIGN.md` & DTCG `2025.10`) | **Higher is better** | `Aligned` (`80–100`) · `Drifting` (`50–79`) · `Off-system` (`<50`) | [`docs/DESIGN_SYSTEMS.md`](docs/DESIGN_SYSTEMS.md) |
| **4. Craft Floor** | 11 rendering & accessibility hygiene checks (orthogonal floor) | **Higher is better** | Never inflates or alters Design/Copy tiers | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| **5. AEO Readiness** | 16 HTTP, RFC 9309 `robots.txt`, SSR text, `.md` twin & discovery checks | **Higher is better** | `Eligible` (`80–100`) · `Partially Eligible` (`50–79`) · `Restricted` (`<50`) | [`docs/AEO_GUIDE.md`](docs/AEO_GUIDE.md) |

---

### Axis 1: The 45 patterns (Design Slop)

The design axis evaluates computed styles and DOM geometry in a `1280×800` headless Chromium viewport after `document.fonts.ready`. Browse all rules interactively at [`slop-detect.com/docs`](https://slop-detect.com/docs), [`spec/patterns.md`](spec/patterns.md), or `GET /api/patterns`.

#### Scoring presets (`--preset`)

Score against a curated subset of the catalogue:

```bash
slop-detect https://example.com --preset strict      # Only high-weight tells (weight >= 5, lowest false positives)
slop-detect https://example.com --preset marketing   # Fonts, colors, gradients, and hero treatment
slop-detect https://example.com --preset minimal     # The 3 signature tells: slop fonts + purple accent + gradient text
slop-detect https://example.com --preset editorial   # Editorial & publication layout focus
slop-detect https://example.com --preset devtool     # Developer tool & documentation focus
```

---

### Axis 2: Multi-axis slop (Design + Copy)

The same page that wears a default CSS template often carries default LLM prose. Pass `--copy` (or `--axes all`) to score 26 prose, vocabulary, and artifact patterns on the page's extracted text at near-zero marginal cost:

```bash
slop-detect https://example.com --copy
slop-detect --copy-dir ./dist           # Or audit built HTML files on disk without a browser
```

```text
  🟡 Mild  ·  B-  ·  unified 22/100  (2 axes)

  🟢 design  Clean   A-   score   8/100   2 flagged
  🟡 copy    Mild    B-   score  18/100   4 flagged

Copy slop:
  ✗ AI buzzword density (leverage / seamless / robust …)  (+7)
  ✗ Em-dash overload                                       (+2)
  ✗ "It's not just X — it's Y" antithesis                  (+6)
  ✗ Generic filler openers ("In today's fast-paced world") (+5)
```

Scored tells include **buzzword density**, **em-dash overload**, **"not just X, it's Y" antithesis**, **filler openers**, **formulaic closers**, **rule-of-three tricolons**, **"whether you're X or Y"**, **emoji bullet headers**, and **fake-bold Unicode math characters** (`fake_bold_math_alnum`), plus review rules for leaked chatbot markup (`data-start`/`data-end`), `utm_source=chatgpt.com` links, unfilled placeholders, and Monroe et al. Fightin' Words log-odds vocabulary.

---

### Axis 3: The system axis (`DESIGN.md` & W3C DTCG `2025.10` compliance)

<p align="center">
  <img src="apps/web/public/media/docs-design-md-drift.png" alt="DESIGN.md System Compliance vs. Live DOM Drift" width="100%" />
</p>

The absolute slop score measures how many default-template patterns a page matches. The **system axis** asks the durable question: **"Does this page honor its own declared design system?"**

Declare your tokens in a [Google Labs `DESIGN.md`](https://github.com/google-labs-code/design.md) or W3C DTCG `2025.10` `tokens.json`, and `slop-detect` reports **named token drift**: undeclared fonts, CTA/surface colors outside perceptual OKLab $\Delta E_{\text{OK}} \le 0.03$, and corner radii or spacing off your scale. When your `DESIGN.md` intentionally declares a brand token (such as `Space Grotesk` or a violet primary), `slop-detect` automatically records a `waivedByDesignMd` waiver so intentional brand choices are never penalized as slop.

```bash
# Check live DOM compliance against <origin>/DESIGN.md or a local file
slop-detect https://your-site.com --design-md auto
slop-detect http://localhost:3000 --design-md ./DESIGN.md

# Bootstrap a W3C DTCG 2025.10 tokens.json from any live URL
slop-detect https://your-site.com --init-tokens > tokens.json

# Static lint DESIGN.md (contrast >= 4.5:1, broken refs, orphaned tokens) & diff in CI
slop-detect --lint-design-md ./DESIGN.md
slop-detect --diff-design-md main-DESIGN.md pr-DESIGN.md
```

See [**`docs/DESIGN_SYSTEMS.md`**](docs/DESIGN_SYSTEMS.md) for the complete authoring and waiver guide.

---

### Axis 4: The AEO axis — Answer Engine Optimization (16 checks)

<p align="center">
  <img src="apps/web/public/media/docs-aeo-crawler-pipeline.png" alt="AEO (Answer Engine Optimization) — agent-readable verification pipeline" width="100%" />
</p>

Can AI search engines (`OAI-SearchBot`, `ChatGPT-User`, `Claude-SearchBot`, `PerplexityBot`, `Applebot`) fetch, parse, and cite your page without a headless browser?

The **AEO axis** runs **16 HTTP, HTML, and discovery checks** using the transparent `SlopDetector-AEO/1.0 (+https://slop-detect.com/bot)` user-agent (never spoofing vendor crawlers):
- **6 Required Checks (85 pts):** `html.reachable`, `edge.access` (WAF/challenge detection), `robots.searchAllowed` (RFC 9309 search vs. training crawler split—blocking `GPTBot` or `CCBot` for training is **not** penalized), `html.indexable`, `ai.previewControls`, and `html.serverTextCoverage`.
- **4 Recommended Checks (15 pts):** `md.twin` (validated Markdown twin), `html.linkAlternate`, `site.llmsTxt`, and `html.vary` (`Vary: Accept`).
- **6 Informational Checks (weight 0):** `ai.manipulation` (prompt-injection scan), `agent.operability`, `agent.discovery` (`/.well-known/ard.json`, MCP server card, A2A agent card), `ai.usagePolicy` (AIPREF `Content-Usage` & `Content-Signal`), `content.dates`, and `jsonld.hygiene`.

```bash
# Audit AEO readiness
npx slop-detect https://your-site.com --aeo

# Auto-generate starter RFC 9309 robots.txt and /llms.txt files
npx slop-detect --emit-aeo-fixes ./public --origin https://your-site.com
```

See [**`docs/AEO_GUIDE.md`**](docs/AEO_GUIDE.md) for copy-paste `robots.txt`, `/llms.txt`, and Markdown twin recipes.

---

## AI coding agents (MCP, Skills & Fix Prompts)

<p align="center">
  <img src="apps/web/public/media/docs-ci-mcp-loop.png" alt="Closed-Loop Anti-Slop Engineering Workflow (MCP + CI Gate + Continuity Sweep)" width="100%" />
</p>

[`slop-detect-mcp`](packages/mcp) is a Model Context Protocol server that lets Claude Code, Cursor, Windsurf, v0, and Lovable scan pages **before** shipping and pull a targeted remediation prompt back into the editing loop.

```json
{
  "mcpServers": {
    "slop-detect": { "command": "npx", "args": ["-y", "slop-detect-mcp"] }
  }
}
```

- **Scanning `localhost` or `file://`:** Start with `--local` (`"args": ["-y", "slop-detect-mcp", "--local"]`) so scans run on your machine via Playwright with zero network egress.
- **Cloud & Web Agents (`v0`, `Lovable`, `claude.ai`, `ChatGPT`):** Connect directly to the stateless Streamable HTTP endpoint at **`https://slop-detect.com/mcp`** (supports `2025-11-25` and `2026-07-28` MCP discovery + inline `ui://slop-detect/scorecard.html` MCP App cards).
- **7 MCP Tools:** `scan_page`, `check_aeo`, `check_design_system`, `fix_prompt`, `lint_design_md`, `diff_design_md`, and `extract_design_system`.
- **Portable Agent Skill ([`skills/slop-detect/SKILL.md`](skills/slop-detect/SKILL.md)):** Follows the [agentskills.io](https://agentskills.io) spec for Claude Code, Cursor, GitHub Copilot, Gemini CLI, Codex, Roo Code, and JetBrains Junie.

### The "fix prompt" feature (`--fix-prompt` & `--brief`)

```bash
curl -s -X POST https://slop-detect.com/api/fix-prompt \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://your-site.com"}' > fix.md
```

Each triggered pattern returns:
1. **Why this reads as default-template slop** (with the specific DOM/CSS evidence)
2. **Fix recipe** (the senior designer's prescription)
3. **Better alternatives** (3–5 concrete directions with real brand references)
4. **Hard rule** (a testable constraint the coding agent verifies on rescan)

See [**`docs/AGENT_INTEGRATIONS.md`**](docs/AGENT_INTEGRATIONS.md), [**`docs/GENERATOR_RECIPES.md`**](docs/GENERATOR_RECIPES.md), and [**`docs/BUILDER_RECIPES.md`**](docs/BUILDER_RECIPES.md).

---

## CI gates & GitHub Action

[`ravidsrk/slop-detect`](packages/action) scans a deploy-preview URL (`mode: api`) or a local static build (`mode: local`), posts a **sticky PR comment**, uploads **SARIF 2.1.0** findings to GitHub Code Scanning, and fails the check when a page breaches your threshold or regresses against a baseline:

```yaml
- uses: ravidsrk/slop-detect@v0.8.0
  with:
    url: ${{ steps.preview.outputs.url }} # Vercel / Netlify / Cloudflare preview URL
    axes: 'design,copy'
    design-md: 'auto'
    aeo: 'true'
    fail-under: 'B' # Or a max numeric slop score like '27'
```

Also included in the monorepo:
- **Netlify Build Plugin:** [`packages/netlify-plugin-slop-detect`](packages/netlify-plugin-slop-detect) (`onPostBuild` gate)
- **Lighthouse Plugin:** [`packages/lighthouse-plugin-slop-copy`](packages/lighthouse-plugin-slop-copy) (Copy + HTML AEO audits)
- **Vale Prose Linter Style:** [`styles/SlopDetect/`](styles/SlopDetect) (exported via `node scripts/export-vale.mjs`)

See [**`docs/CI_AND_DEPLOY_GATES.md`**](docs/CI_AND_DEPLOY_GATES.md) and [**`docs/DEPLOY_GATES.md`**](docs/DEPLOY_GATES.md).

---

## Programmatic SDK (`slop-detect-core`)

Embed the pure, zero-dependency engine inside your own Playwright, Puppeteer, or Cloudflare Browser Rendering pipeline:

```ts
// npm install slop-detect-core   (monorepo workspace name: @slop-detect/core)
import { PATTERNS, buildPageEvaluateScript, assembleScanResult } from 'slop-detect-core';

// 1) Execute the self-contained page-evaluate script inside your browser runner:
const script = buildPageEvaluateScript(PATTERNS, { includeSystem: true });
const raw = await page.evaluate(script);

// 2) Assemble the scored multi-axis result (validated against schemas/scan-result.v1.json):
const result = assembleScanResult(raw, {
  url: 'https://example.com',
  finalUrl: page.url(),
  axes: ['design', 'copy'],
  includeCraft: true,
  patterns: PATTERNS,
});

console.log(
  result.blocked ? result.error : `${result.score}/100 ${result.tier} (${result.grade})`
);
```

See [**`docs/SDK_AND_API.md`**](docs/SDK_AND_API.md) and [**`apps/web/API.md`**](apps/web/API.md).

---

## Share badges & domain monitoring

Every scan on [`slop-detect.com`](https://slop-detect.com) produces a shareable permalink, an auto-generated `1200×630` social card, a canonical domain hub, and a live SVG badge:

```markdown
[![slop](https://slop-detect.com/badge/your-site.com.svg)](https://slop-detect.com/score/your-site.com)
```

| Endpoint | What It Returns |
| --- | --- |
| `GET /r/<id>` | Server-rendered scan result permalink (OG card unfurls on X, LinkedIn, Slack) |
| `GET /score/<domain>` | Canonical per-domain telemetry hub with 5-axis breakdown, history & fix prompt |
| `GET /report/<domain>` | Print-friendly agency audit report (`@media print` ready) |
| `GET /og/<id>.png` | `1200×630` PNG share card (`grade · score · tier · verdict`) |
| `GET /badge/<domain>.svg` | Live tier-colored shields badge (`slop · A · 6`) |
| `POST /api/watch` | Opt-in continuity monitoring for score regressions & `DESIGN.md` drift (free during validation; see [`pricing.md`](apps/web/public/pricing.md)) |

---

## Developer documentation

All developer guides are organized in [**`docs/`**](docs/README.md):

| Guide | Topics |
| --- | --- |
| [**`docs/GETTING_STARTED.md`**](docs/GETTING_STARTED.md) | 5-minute quickstart across CLI, Web, API, fix prompts, and `npx slop-detect init` |
| [**`docs/CLI_GUIDE.md`**](docs/CLI_GUIDE.md) | Complete CLI flags, `--copy-dir`, `--site`, SARIF/JUnit/GitLab/agent reporters, baselines, and exit codes |
| [**`docs/AGENT_INTEGRATIONS.md`**](docs/AGENT_INTEGRATIONS.md) | Claude Code plugin & hooks, Cursor, Windsurf, Copilot, Codex, Agent Skills, and Remote MCP (`/mcp`) |
| [**`docs/GENERATOR_RECIPES.md`**](docs/GENERATOR_RECIPES.md) | Pairing with Anthropic `frontend-design`, Google Stitch `DESIGN.md`, Cursor, and Impeccable |
| [**`docs/BUILDER_RECIPES.md`**](docs/BUILDER_RECIPES.md) | Connecting Lovable, Vercel `v0`, claude.ai, and ChatGPT Developer Mode via `https://slop-detect.com/mcp` |
| [**`docs/CI_AND_DEPLOY_GATES.md`**](docs/CI_AND_DEPLOY_GATES.md) | GitHub Action (`api` & `local` modes + SARIF), [Vercel & Netlify gates](docs/DEPLOY_GATES.md), Lighthouse, and Vale |
| [**`docs/DESIGN_SYSTEMS.md`**](docs/DESIGN_SYSTEMS.md) | `DESIGN.md` & W3C DTCG `2025.10` `tokens.json`: authoring, `--init-tokens`, `--lint-design-md`, `--diff-design-md`, and waivers |
| [**`docs/AEO_GUIDE.md`**](docs/AEO_GUIDE.md) | All 16 AEO checks, RFC 9309 `robots.txt` search vs. training split, `/llms.txt`, `.md` twins, and `--emit-aeo-fixes` |
| [**`docs/SDK_AND_API.md`**](docs/SDK_AND_API.md) | Programmatic `slop-detect-core` usage, custom `compileRule()`, JSON Schema v1, and [REST API (`apps/web/API.md`)](apps/web/API.md) |
| [**`docs/ARCHITECTURE.md`**](docs/ARCHITECTURE.md) | Monorepo package graph, page-eval serialization, 5-axis math, [`spec/`](spec/README.md), and [`CALIBRATION.md`](CALIBRATION.md) |
| [**`docs/operations/README.md`**](docs/operations/README.md) | Self-hosting `apps/web` on Cloudflare Pages, Workers Browser Rendering, KV runbooks, and [`REHEARSAL.md`](docs/operations/REHEARSAL.md) |

---

## Repository layout & contributing

```text
slop-detect/
├── packages/
│   ├── core/                            ← pure 5-axis detection engine (npm: slop-detect-core)
│   ├── cli/                             ← Playwright runner, static auditor & reporters (npm: slop-detect)
│   ├── mcp/                             ← Model Context Protocol server (npm: slop-detect-mcp)
│   ├── action/                          ← Composite GitHub Action (api + local Chromium + SARIF)
│   ├── netlify-plugin-slop-detect/      ← Netlify onPostBuild deploy gate plugin
│   └── lighthouse-plugin-slop-copy/     ← Lighthouse copy + HTML AEO plugin
├── apps/
│   └── web/                             ← Cloudflare Pages app, REST API (/api/*) & remote MCP (/mcp)
├── docs/                                ← Developer guides, generator/builder recipes & ops runbooks
├── skills/slop-detect/                  ← Portable agentskills.io skill for 20+ coding agents
├── plugins/slop-detect/                 ← Claude Code & Cursor marketplace plugin manifests
├── styles/SlopDetect/                   ← Vale prose linter rules exported from COPY_PATTERNS
├── examples/                            ← Astro 5 & Next.js 15 reference integrations
├── schemas/                             ← JSON Schema v1 (scan-result.v1.json)
└── spec/                                ← Versioned pattern, copy, system, AEO & conformance specs
```

```bash
git clone https://github.com/ravidsrk/slop-detect.git
cd slop-detect
bun install && bun run build && bun run test
bun run web:dev                          # Local Cloudflare Pages workbench at http://localhost:8788
```

- **Contributing & Roadmap:** See [`CONTRIBUTING.md`](CONTRIBUTING.md), [`CALIBRATION.md`](CALIBRATION.md), and [`ROADMAP.md`](ROADMAP.md).
- **Support & Security:** GitHub issues only ([`docs/SUPPORT.md`](docs/SUPPORT.md)). Report security vulnerabilities privately per [`docs/SECURITY.md`](docs/SECURITY.md).
- **Acknowledgments:** [Adrian Krebs](https://www.adriankrebs.ch/blog/design-slop/) (#1–14), [Meng To](https://x.com/MengTo) (Aura study), and [Paul Bakaus / Impeccable](https://github.com/pbakaus/impeccable) (typography & contrast rules).
- **License:** [MIT](LICENSE) © Ravindra Kumar

> "Empty is better than fake. Show the product, don't decorate around it."
