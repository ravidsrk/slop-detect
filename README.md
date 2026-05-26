# slop-detect

> **Score any landing page against the 16-rule AI-design-slop fingerprint.**
> Detect Cursor / v0 / Lovable / Bolt templates in the wild — and get a copy-pasteable fix prompt to clean them up.

<p>
  <a href="https://github.com/ravidsrk/slop-detect/actions"><img alt="CI" src="https://github.com/ravidsrk/slop-detect/workflows/ci/badge.svg" /></a>
  <a href="https://www.npmjs.com/package/slop-detect"><img alt="npm" src="https://img.shields.io/npm/v/slop-detect.svg?label=%40slop-detect%2Fcli" /></a>
  <a href="https://slop-detect.com"><img alt="Live demo" src="https://img.shields.io/badge/live-slop--detect.com-22c55e" /></a>
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-blue.svg" /></a>
  <img alt="Node" src="https://img.shields.io/badge/node-%3E%3D20-339933" />
</p>

```
URL: https://www.aura.build
SCORE: 36 / 100   →   tier: Heavy
PATTERNS: 8 / 16 triggered

  ✓ Slop fonts (Inter / Geist / Space Grotesk)        (+8)
  ✓ VibeCode Purple — filled indigo/violet CTAs       (+8)
  ✓ Hero gradient text (background-clip:text)         (+6)
  ✓ Gradient-heavy backgrounds (5+ elements)          (+4)
  ✓ Eyebrow pill above hero ("Now in beta")           (+5)
  ✓ All-caps section labels                           (+3)
  ✓ Identical feature cards with icon on top          (+4)
  ✓ Big-number stat banner ("10k+", "99.9%")          (+3)
```

## Why this exists

By April 2026, AI-generated landing pages had collapsed onto a measurable visual fingerprint. Inter font, purple-to-blue gradient hero, "Now in Beta" pill badge, gradient-letter testimonial avatars, identical icon-topped feature cards. [Adrian Krebs's study](https://www.adriankrebs.ch/blog/design-slop/) scored ~1,400 Show HN submissions with Playwright and found **67% carried detectable AI-design fingerprints**.

`slop-detect` reproduces Krebs's methodology, adds the signals Meng To identified in his [May 2026 Aura tutorial](https://x.com/MengTo/status/2058893181740359863), and packages it three ways:

- 🟢 **`slop-detect`** — Playwright-based, run from your terminal or CI
- 🟢 **`slop-detect.com`** — drop-in web UI, scan any URL in 8 seconds
- 🟢 **`slop-detect-core`** — pure detection engine, embed it in your own pipeline

All three share the **same 16-rule scoring engine** so a Heavy from the CLI is a Heavy from the web is a Heavy from the API.

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

# Agent Skill — drop into Claude Code / Cursor / Copilot / Codex / Junie
git clone --depth 1 https://github.com/ravidsrk/slop-detect /tmp/sd \
  && cp -r /tmp/sd/skills/slop-detect ~/.claude/skills/
```

The repo also ships an [Agent Skill](skills/slop-detect/SKILL.md) following the [agentskills.io](https://agentskills.io) open spec — any compatible agent (Claude Code, Cursor, GitHub Copilot, Gemini CLI, Codex, Roo Code, Junie, and 20+ others) will autonomously invoke the scanner when you ask it to audit a landing page.

## The 16 patterns

| # | Pattern | Weight | What it detects |
|---|---|---|---|
| 1 | **Slop fonts** | 8 | Inter / Geist / Space Grotesk / Instrument Serif italic accent |
| 2 | **VibeCode Purple** | 8 | Indigo-violet (HSL 240–295°, ≥35% sat) on filled CTAs |
| 3 | **Hero gradient text** | 6 | H1 with `background-clip: text` + gradient |
| 4 | **Gradient backgrounds** | 4 | ≥5 visible elements with CSS gradient backgrounds |
| 5 | **Accent stripe** | 6 | Cards with thick colored top/left border only |
| 6 | **Glassmorphism** | 4 | `backdrop-filter: blur()` on translucent layers |
| 7 | **Colored glows** | 4 | Box-shadows with ≥24px blur and non-grey color |
| 8 | **Centered hero** | 4 | H1 centered, ≥36px, in a slop font |
| 9 | **Eyebrow pill** | 5 | Rounded pill above H1 ("Now in beta", "New") |
| 10 | **All-caps labels** | 3 | `text-transform: uppercase` section labels |
| 11 | **Perma-dark mode** | 3 | Hard-coded dark background with no toggle |
| 12 | **Icon card grid** | 4 | ≥3 identical feature cards with icon on top |
| 13 | **Numbered steps** | 3 | "1 · 2 · 3" step sequences |
| 14 | **Stat banner** | 3 | Big-number stat row ("10k+", "99.9%") |
| 15 | **FAQ accordion** | 2 | Generic accordion with no schema markup |
| 16 | **Gradient avatars** | 5 | Letter-only testimonial avatars on gradient backgrounds |

**Tiers:** Clean (0–11) · Mild (12–29) · Heavy (≥30)

Source: Krebs (Apr 2026) + Meng To (May 2026 Aura tutorial). See [`packages/core/src/patterns.js`](packages/core/src/patterns.js) for the full detection logic with weighted heuristics.

## What's in this repo

```
slop-detect/
├── packages/
│   ├── core/    slop-detect-core   ← pure detection engine (Node, Workers, browser)
│   ├── cli/     slop-detect    ← Playwright runner for terminal + CI
│   └── web/     slop-detect-web    ← Cloudflare Pages app powering slop-detect.com
```

A monorepo with npm workspaces. The `core` package is the single source of truth for the 16 rules — `cli` and `web` are thin runtime adapters around it.

## Quickstart — contributing

```bash
git clone https://github.com/ravidsrk/slop-detect.git
cd slop-detect
npm install                     # installs all 3 workspaces

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

Plus cross-cutting guidance ("don't replace one slop pattern with another", "empty is better than fake") and a built-in acceptance criterion: rescan and target score < 12.

## Programmatic use

```js
import { PATTERNS, scorePatterns } from 'slop-detect-core';

// PATTERNS is the array of 16 rule definitions.
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

- [ ] Public REST API at `slop-detect.com/api/*` with rate-limited free tier
- [ ] SVG badge endpoint (`![Slop: Clean 3/100](.../badge?url=...)`) for README embedding
- [ ] GitHub Action — auto-comment fix prompts on PRs that deploy preview URLs
- [ ] 17th, 18th, ... patterns as new slop trends emerge (Cursor v3, v0 v2, etc.)
- [ ] Historical scoring — track how `stripe.com` drifted across 5 years
- [ ] Multilingual patterns (Japanese/Chinese landing pages have different slop signatures)

## Acknowledgments

- **[Adrian Krebs](https://www.adriankrebs.ch/blog/design-slop/)** — original AI-design-slop study and 12-pattern fingerprint
- **[Meng To](https://x.com/MengTo)** — Aura tutorial that codified the gradient-letter avatar pattern
- All the **AI tools we're detecting** — Cursor, v0, Lovable, Bolt — which generated the corpus that taught us what slop looks like

## License

[MIT](LICENSE) © Ravindra Kumar

> "Empty is better than fake. Show the product, don't decorate around it."
