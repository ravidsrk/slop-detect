# slop-detect

> **Score any landing page against the 27-rule AI-design-slop fingerprint — then keep it clean.**
> Detect Cursor / v0 / Lovable / Bolt templates in the wild, check a page against its own `DESIGN.md`, and get a copy-pasteable fix prompt. Monitor a domain and get emailed when it drifts.

<p>
  <a href="https://github.com/ravidsrk/slop-detect/actions"><img alt="CI" src="https://github.com/ravidsrk/slop-detect/workflows/ci/badge.svg" /></a>
  <a href="https://www.npmjs.com/package/slop-detect"><img alt="npm: slop-detect" src="https://img.shields.io/npm/v/slop-detect.svg?label=slop-detect" /></a>
  <a href="https://www.npmjs.com/package/slop-detect-core"><img alt="npm: slop-detect-core" src="https://img.shields.io/npm/v/slop-detect-core.svg?label=slop-detect-core" /></a>
  <a href="https://slop-detect.com"><img alt="Live demo" src="https://img.shields.io/badge/live-slop--detect.com-22c55e" /></a>
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-blue.svg" /></a>
  <img alt="Node" src="https://img.shields.io/badge/node-%3E%3D20-339933" />
</p>

```
$ npx slop-detect https://bolt.new https://www.aura.build https://news.ycombinator.com

https://bolt.new
What will you build today?
  🟡 Mild  ·  score 24/100  ·  5/27 patterns triggered
  ✗ AI-default font stack (Inter / Geist / Space Grotesk)       (+8)
  ✗ Gradient-heavy backgrounds (5+ elements)                    (+4)
  ✗ Big colored box-shadow glows (purple/blue/pink)             (+4)
  ✗ Centered hero in generic sans (Inter-style)                 (+4)
  ✗ Perma dark mode + medium-grey body text                     (+4)

https://www.aura.build
Create beautiful designs
  🟡 Mild  ·  score 20/100  ·  4/27 patterns triggered
  ✗ AI-default font stack (Inter / Geist / Space Grotesk)       (+8)
  ✗ Glassmorphism (backdrop-filter blur on translucent layers)  (+4)
  ✗ Big colored box-shadow glows (purple/blue/pink)             (+4)
  ✗ Centered hero in generic sans (Inter-style)                 (+4)

https://news.ycombinator.com
  🟢 Clean  ·  score 3/100  ·  1/27 patterns triggered
```

## Why this exists

By April 2026, AI-generated landing pages had collapsed onto a measurable visual fingerprint. Inter font, purple-to-blue gradient hero, "Now in Beta" pill badge, gradient-letter testimonial avatars, identical icon-topped feature cards. [Adrian Krebs's study](https://www.adriankrebs.ch/blog/design-slop/) scored ~1,400 Show HN submissions with Playwright and found **67% carried detectable AI-design fingerprints**.

`slop-detect` reproduces Krebs's methodology, adds the signals Meng To identified in his [May 2026 Aura tutorial](https://x.com/MengTo/status/2058893181740359863), and packages it three ways:

- 🟢 **`slop-detect`** — Playwright-based, run from your terminal or CI
- 🟢 **`slop-detect.com`** — drop-in web UI, scan any URL in about 5 seconds
- 🟢 **`slop-detect-core`** — pure detection engine, embed it in your own pipeline

All three share the **same 27-rule scoring engine** so a Heavy from the CLI is a Heavy from the web is a Heavy from the API.

## Try it now

```bash
# Web UI — fastest
open https://slop-detect.com

# API — one curl away
curl -s -X POST -H 'Content-Type: application/json' \
  https://slop-detect.com/api/scan \
  -d '{"url":"https://your-site.com"}' | jq

# CLI — for CI, batch scans, or air-gapped work
npx slop-detect https://your-site.com

# CLI without a local browser — scan via the API (zero Playwright install)
npx slop-detect https://your-site.com --remote

# Agent Skill — drop into Claude Code / Cursor / Copilot / Codex / Junie
git clone --depth 1 https://github.com/ravidsrk/slop-detect /tmp/sd \
  && cp -r /tmp/sd/skills/slop-detect ~/.claude/skills/
```

## Share & embed

Every scan now gets a **shareable permalink** with an auto-generated social card,
and any domain gets a **live badge** you can drop in a README or site footer.

```md
<!-- Live slop badge — re-scans periodically, colored by tier -->
[![slop](https://slop-detect.com/badge/your-site.com.svg)](https://slop-detect.com)
```

| Endpoint | What it returns |
|---|---|
| `GET /r/<id>` | Server-rendered result permalink (OG card unfurls on X / LinkedIn / Slack) |
| `GET /og/<id>.png` | 1200×630 PNG share card (grade · score · tier · verdict) |
| `GET /badge/<domain>.svg` | Live tier-colored badge (`slop · A · 6`) for the last scan of that domain |

The `POST /api/scan` response includes `grade`, `verdict`, `definitionsVersion`,
plus an `id` and `resultUrl` for the shareable permalink.

## Use it in your agent (MCP)

[`slop-detect-mcp`](packages/mcp) is a Model Context Protocol server that lets
Cursor / Claude Code / Windsurf agents scan a page **before** they ship it — and
pull the fix prompt back into the editing loop. Four tools: `scan_page`,
`check_aeo` (can AI engines read & cite the page?), `check_design_system`
(does the page honor its own `DESIGN.md`?), and `fix_prompt`.

```json
{
  "mcpServers": {
    "slop-detect": { "command": "npx", "args": ["-y", "slop-detect-mcp"] }
  }
}
```

## Gate it in CI (GitHub Action)

[`slop-detect-action`](packages/action) scans a deploy-preview URL, posts a
**sticky PR comment** with the grade + triggered patterns, and **fails the check**
when slop creeps above your threshold.

```yaml
- uses: ravidsrk/slop-detect/packages/action@v0.2.0
  with:
    url: ${{ steps.preview.outputs.url }}   # your Vercel/Netlify preview URL
    fail-under: 'B'                          # fail if the grade drops below B
```

`fail-under` accepts a number (fail if the slop score exceeds it) or a letter
grade (fail if the grade is worse). Leave it empty for report-only mode.

The repo also ships an [Agent Skill](skills/slop-detect/SKILL.md) following the [agentskills.io](https://agentskills.io) open spec — any compatible agent (Claude Code, Cursor, GitHub Copilot, Gemini CLI, Codex, Roo Code, Junie, and 20+ others) will autonomously invoke the scanner when you ask it to audit a landing page.

## Monitor a domain + the directory

Detection is free and stateless. The optional **continuity** layer remembers a
domain and emails you when it regresses to slop between redesigns:

```bash
# Start monitoring (double opt-in: you confirm via an emailed link)
curl -s -X POST -H 'Content-Type: application/json' \
  https://slop-detect.com/api/watch \
  -d '{"url":"https://your-site.com","email":"you@example.com","list":true}'
```

Add `"system": true` and the daily sweep also checks the domain against its own
`DESIGN.md`, emailing you when the page **drifts off its declared design
system** — the check that catches what an agent or a non-designer quietly broke.
Every monitored domain gets a print-friendly client report at
`slop-detect.com/report/<domain>`, and the [dashboard](https://slop-detect.com/dashboard)
(magic-link sign-in, no password) shows every domain on your email in one view.

`list: true` also opts the domain into the public, crawlable
[**directory**](https://slop-detect.com/directory) of scored sites — an
owner-gated catalogue with a real backlink to each listed site. See also
[**The State of AI Design Slop**](https://slop-detect.com/leaderboard) — a
reproducible scan of well-known landing pages (how much of the web now reads as
AI-generated, and who's still clean). We only store
your email to send the alerts you asked for, only after you confirm, and never
sell it — see the [privacy policy](https://slop-detect.com/privacy.md). Engine
stays MIT and free forever; only continuity (history + alerts) is the paid layer.

## The 27 patterns

`definitions@2026.09` — versioned ruleset. Scores from a given definition
version are comparable; the version ships in every result (`definitionsVersion`).

| # | Pattern | Weight | What it detects |
|---|---|---|---|
| 1 | **Slop fonts** | 8 | Inter / Geist / Space Grotesk / Instrument Serif italic accent |
| 2 | **VibeCode Purple** | 8 | Indigo-violet (HSL 240–295°, ≥35% sat) on filled CTAs |
| 3 | **Hero gradient text** | 6 | H1 with `background-clip: text` + gradient |
| 4 | **Gradient backgrounds** | 4 | ≥5 visible elements with CSS gradient backgrounds |
| 5 | **Accent stripe** | 6 | Cards with thick colored top/left border only |
| 6 | **Glassmorphism** | 4 | `backdrop-filter: blur()` on translucent layers |
| 7 | **Colored glows** | 4 | Box-shadows with ≥24px blur and non-grey color |
| 8 | **Centered hero** | 4 | H1 centered (or in a centered container), ≥28px, in a slop font |
| 9 | **Eyebrow pill** | 5 | Rounded pill above H1 ("Now in beta", "New") |
| 10 | **All-caps labels** | 3 | `text-transform: uppercase` section labels |
| 11 | **Perma-dark mode** | 4 | Dark page background (body / html / wrapper) with mid-grey body text |
| 12 | **Icon card grid** | 4 | ≥3 identical feature cards with icon on top |
| 13 | **Numbered steps** | 3 | "1 · 2 · 3" step sequences |
| 14 | **Stat banner** | 3 | Big-number stat row ("10k+", "99.9%") |
| 15 | **FAQ accordion** | 2 | Generic accordion with no schema markup |
| 16 | **Gradient avatars** | 5 | Letter-only testimonial avatars on gradient backgrounds |
| 17 | **Bento grid** | 4 | Apple-keynote mixed-span rounded card wall |
| 18 | **Aurora blobs** | 5 | Blurred radial/conic gradient "aurora" backdrop |
| 19 | **AI sparkles** | 3 | ✨ / lucide "Sparkles" "AI magic" tells |
| 20 | **Cream bg** | 7 | Warm off-white / beige default page surface |
| 21 | **Low contrast** | 7 | Washed-out grey body text below WCAG AA on a light background |
| 22 | **Crushed tracking** | 5 | Display headings tracked tighter than -0.05em |
| 23 | **Gray-on-color** | 4 | Neutral mid-grey text on a chromatic background |
| 24 | **Oversized H1** | 4 | Long headline (≥40 chars) set at ≥72px |
| 25 | **Nested cards** | 4 | Card-like element inside a card-like ancestor |
| 26 | **Wide tracking** | 3 | Body copy letter-spacing above 0.05em |
| 27 | **Flat hierarchy** | 3 | ≥3 font sizes with a max/min ratio below 2× |

**Tiers:** Clean (0–9) · Mild (10–27) · Heavy (≥28)

Source: Krebs (Apr 2026) + Meng To (May 2026 Aura tutorial) + 2026.07 emerging
tells (#17–19) + 2026.08 patterns (#20–27) ported from
[Impeccable](https://github.com/pbakaus/impeccable) (Apache-2.0). See
[`packages/core/src/patterns.js`](packages/core/src/patterns.js) for the full
detection logic with weighted heuristics.

### Scoring presets

Score against a curated subset instead of the full fingerprint:

```bash
slop-detect https://example.com --preset marketing   # brand-surface tells only
slop-detect https://example.com --preset strict       # high-signal smoking guns
slop-detect https://example.com --preset minimal       # the 3 dead-giveaways
```

| Preset | Scores |
|---|---|
| `full` (default) | all 27 patterns |
| `strict` | only weight ≥ 5 (fewest false positives — good CI gate) |
| `marketing` | fonts, colours, gradients, hero treatment |
| `minimal` | slop fonts + VibeCode purple + gradient text |

The API accepts `{ "url": "...", "preset": "strict" }`. New patterns can be added
declaratively — see [CONTRIBUTING.md](CONTRIBUTING.md#the-low-friction-path-declarative-rules).

## The system axis — DESIGN.md compliance

The absolute slop score asks "does this look AI-generated?" The **system axis**
asks the durable question: **"does this page honor its own declared design
system?"** Declare your tokens in a [DESIGN.md](https://github.com/google-labs-code/design.md)
(Google Labs' open spec — colors, typography, radii, components), and
slop-detect reports **drift**: fonts in use that aren't declared, CTA/surface
colors off the palette, radii off the scale. Relative, per-site, and immune to
the false-positive trap — a bespoke site checked against its own system scores
*Aligned*, never "slop."

```bash
slop-detect https://your-site.com --design-md auto        # <origin>/DESIGN.md
slop-detect https://your-site.com --design-md ./DESIGN.md  # local file

curl -s -X POST -H 'Content-Type: application/json' \
  https://slop-detect.com/api/scan \
  -d '{"url":"https://your-site.com","designMd":true}' | jq .system
```

Higher is better: `Aligned` (≥80) · `Drifting` (≥50) · `Off-system` (<50).
Every drift item is a named, contestable signal — never a verdict.

## Multi-axis slop — design + copy

Slop isn't only visual. The same page that wears a v0 template usually has
GPT-default *prose* too. slop-detect scores a second **copy axis** on the page's
own text at near-zero marginal cost (one text extraction, no extra page load):

```bash
slop-detect https://example.com --copy          # design + copy
slop-detect https://example.com --axes all       # same thing
```

```
  🟡 Mild  ·  B-  ·  unified 22/100  (2 axes)

  🟢 design  Clean   A-   score   8/100   2/27 flagged
  🟡 copy    Mild    B-   score  18/100   4/9 flagged

Copy slop:
  ✗ AI buzzword density (leverage / seamless / robust …)  (+7)
  ✗ Em-dash overload                                       (+5)
  ✗ "It's not just X — it's Y" antithesis                  (+6)
  ✗ Generic filler openers ("In today's fast-paced world") (+5)
```

The 9 copy patterns: **buzzword density** (leverage/seamless/robust/elevate…),
**em-dash overload**, **"not just X, it's Y" antithesis**, **filler openers**,
**formulaic closers**, **rule-of-three tricolons**, **"whether you're X or Y"**,
**invisible Unicode artifacts**, **emoji bullet headers**. Each has its own fix
recipe, so `fix-prompt` covers both axes.

Top-level `score`/`grade`/`patterns` stay **design-only** for backward
compatibility. Multi-axis adds `axes.{design,copy}` plus `unifiedScore` /
`unifiedTier`. The unified score = max axis score + a small penalty when more
than one axis is dirty. API: `{ "url": "...", "axes": ["design","copy"] }`.

## What's in this repo

```
slop-detect/
├── packages/
│   ├── core/    slop-detect-core   ← pure detection engine (Node, Workers, browser)
│   ├── cli/     slop-detect    ← Playwright runner for terminal + CI
│   ├── web/     slop-detect-web    ← Cloudflare Pages app powering slop-detect.com
│   ├── mcp/     slop-detect-mcp    ← Model Context Protocol server for agents
│   └── action/                     ← GitHub Action wrapper (not published to npm)
```

A monorepo with four npm workspaces (plus the Action). The `core` package is the single source of truth for the 27 rules — `cli`, `web`, and `mcp` are thin runtime adapters around it.

## Quickstart — contributing

```bash
git clone https://github.com/ravidsrk/slop-detect.git
cd slop-detect
npm install                     # installs all 4 workspaces

# Run the CLI locally
npm run demo                    # scans 3 example sites
npm run scan -- https://your-url.com

# Run the web app locally
npm run web:dev                 # http://localhost:8788
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contributor guide, including how to propose a 17th pattern or improve a fix recipe.

## The "fix prompt" feature

After scanning, the web app generates a markdown prompt you can paste into Claude, Cursor, or v0 to clean up the page:

```bash
curl -s -X POST -H 'Content-Type: application/json' \
  https://slop-detect.com/api/fix-prompt \
  -d '{"url":"https://your-site.com"}' > fix.md
```

Each triggered pattern comes back with:

- **Why this reads as AI-slop** (the tell — `Tailwind indigo-600`, `background-clip: text`, etc.)
- **Fix recipe** (the senior designer's prescription)
- **Better alternatives** (3–5 concrete directions with brand references)
- **Hard rule** (a testable constraint the agent self-checks against)

Plus cross-cutting guidance ("don't replace one slop pattern with another", "empty is better than fake") and a built-in acceptance criterion: rescan and target score < 10 (Clean tier).

## Programmatic use

```js
import { PATTERNS, scorePatterns } from 'slop-detect-core';

// PATTERNS is the array of 27 rule definitions.
// Each has { id, label, weight, extract, detect } where:
//   extract(ctx) runs in the page's DOM context and returns signals
//   detect(signals) is a pure function deciding triggered: true/false

const patternResults = PATTERNS.map(p => {
  const signals = runInPage(p.extract);  // your browser runner
  return { ...p, triggered: p.detect(signals), evidence: signals };
});

const { score, tier, patternsFlagged } = scorePatterns(patternResults);
```

The runner is yours — Playwright, Puppeteer, Cloudflare Browser Rendering, Browserless, whatever you have. The `core` package never touches a browser.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full strategic plan. Phase 1 (distribution
primitives) shipped in v0.2.0:

- [x] **Shareable result permalinks** — every scan gets `slop-detect.com/r/<id>`
- [x] **OG share cards** — auto-generated 1200×630 image per result (`/og/<id>.png`)
- [x] **Letter grades + verdict** — A+→F grade and a one-liner on every score
- [x] **Embeddable SVG badge** — `slop-detect.com/badge/<domain>.svg` + copy-paste snippets
- [x] **Versioned slop definitions** — scores tagged with `definitionsVersion`
- [x] **GitHub Action** — sticky PR comment + pass/fail status check on preview URLs
- [x] **MCP server** (`slop-detect-mcp`) so agents self-audit before shipping
- [x] **Public REST API** with key-based rate-limit tiers ([API.md](packages/web/API.md))
- [x] **Declarative rule format** + named presets (strict / marketing / minimal)
- [x] **New 2026.07 patterns** — bento walls, aurora gradients, AI sparkles
- [x] **Multi-axis slop score** — design + copy axes, unified score, both-axis fix prompts
- [ ] Community rule registry + web rule authoring UI
- [ ] AI-builder provenance signal ("likely built with v0 / Lovable / Bolt")
- [ ] Code-slop axis (repo / view-source hook)
- [ ] Historical scoring + team dashboards (Pro)

## Acknowledgments

- **[Adrian Krebs](https://www.adriankrebs.ch/blog/design-slop/)** — original AI-design-slop study and 12-pattern fingerprint
- **[Meng To](https://x.com/MengTo)** — Aura tutorial that codified the gradient-letter avatar pattern
- All the **AI tools we're detecting** — Cursor, v0, Lovable, Bolt — which generated the corpus that taught us what slop looks like

## License

[MIT](LICENSE) © Ravindra Kumar

> "Empty is better than fake. Show the product, don't decorate around it."
