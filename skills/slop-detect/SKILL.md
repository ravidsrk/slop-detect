---
name: slop-detect
description: Score any landing page against the 27-pattern AI-design-slop fingerprint, 9-pattern copy axis, DESIGN.md system compliance, and 8-check AEO readiness, then generate a deterministic fix prompt. Use when the user asks to detect AI-generated design or copy, audit a landing page for slop, check if a site looks like Cursor/v0/Lovable/Bolt output, verify DESIGN.md compliance, check if AI answer engines can read/cite a site (AEO), or get specific feedback to clean up a generic site.
license: MIT
metadata:
  author: ravidsrk
  version: "0.8.0"
  homepage: "https://slop-detect.com"
  repository: "https://github.com/ravidsrk/slop-detect"
compatibility: Requires internet access. Uses the public slop-detect.com API (no auth, rate-limited per-IP) or the slop-detect-mcp MCP server. Falls back to the slop-detect npm CLI when offline or when scanning behind auth.
---

# slop-detect

Score any landing page against the versioned four-axis telemetry engine (`definitions@2026.10`):
1. **Design Slop (27 CSS/DOM patterns)** — deterministic live-DOM inspection derived from Adrian Krebs's study of 1,400 Show HN submissions, Meng To's Aura study, and Impeccable typography/contrast rules.
2. **Copy Slop (9 prose patterns)** — density-calibrated text analysis catching LLM buzzwords, em-dash overload, "not just X — it's Y" antithesis, tricolons, and formulaic openers/closers.
3. **System Axis (`DESIGN.md` compliance)** — relative per-site audit checking whether the live DOM honors the site's own declared `DESIGN.md` tokens (fonts, palette, corner radii).
4. **AEO Axis (8 crawler & citation checks)** — verifies whether AI answer engines (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`) can crawl, parse, and cite the page.

This skill is the **fast path**. When the user pastes a URL and asks anything about its design quality, AI-generated appearance, copywriting tells, `DESIGN.md` drift, AEO readiness, or how to clean it up, call the tool rather than eyeballing the page yourself.

## When to use this skill

Trigger phrases (non-exhaustive):

- "is this AI-generated?", "does this look like v0/Cursor/Lovable/Bolt?"
- "audit my landing page", "score my landing page"
- "why does this site look generic", "this looks slop-y"
- "fix my landing page", "make my hero look less AI"
- "does my site honor its DESIGN.md?", "check for design system drift"
- "can ChatGPT / Claude / Perplexity read and cite my site?", "check AEO"
- "detect design slop", "v0 detector", "slop score"
- Any URL pasted with a vague "what do you think of this?" — run a scan first

## Four-axis catalogue (`definitions@2026.10`)

### Axis 1: The 27 design patterns (lower score = cleaner)

| # | ID | Pattern | Weight | Tell |
|---|---|---|---|---|
| 1 | `slop_fonts` | Slop fonts | 8 | Inter / Geist / Space Grotesk / Plus Jakarta Sans / Outfit / Instrument Serif italic accent |
| 2 | `purple_accent` | VibeCode Purple | 8 | Indigo–violet (HSL 240–295°, ≥35% sat) filled CTAs (`indigo-600`, `violet-600`) |
| 3 | `gradient_text` | Hero gradient text | 6 | H1/H2 with `background-clip: text` + gradient |
| 4 | `gradient_backgrounds` | Gradient backgrounds | 4 | ≥5 visible elements with CSS gradient backgrounds |
| 5 | `accent_stripe` | Accent stripe | 6 | Cards with thick colored top/left border only |
| 6 | `glassmorphism` | Glassmorphism | 4 | `backdrop-filter: blur()` on ≥2 non-nav translucent layers |
| 7 | `colored_glows` | Colored glows | 4 | Box-shadows with ≥24px blur + chromatic color |
| 8 | `centered_hero` | Centered hero | 4 | H1 centered, ≥28px, in a slop font |
| 9 | `hero_eyebrow_pill` | Eyebrow pill | 5 | Rounded pill badge above H1 ("Now in beta", "New", "Introducing") |
| 10 | `all_caps_labels` | All-caps labels | 3 | `text-transform: uppercase` section labels |
| 11 | `perma_dark_mode` | Perma-dark mode | 4 | Dark canvas with mid-grey body text and no theme toggle |
| 12 | `icon_card_grid` | Icon card grid | 4 | ≥3 identical feature cards with icon-on-top |
| 13 | `numbered_steps` | Numbered steps | 3 | "1 · 2 · 3" step sequences |
| 14 | `stat_banner` | Stat banner | 3 | Big-number vanity stat row ("10k+", "99.9%") |
| 15 | `faq_accordion` | FAQ accordion | 2 | ≥3 accordion items in the lower half |
| 16 | `gradient_letter_avatars` | Gradient avatars | 5 | Letter-only testimonial avatars on gradient fills |
| 17 | `bento_grid` | Bento grid | 4 | Mixed-span rounded feature card wall |
| 18 | `aurora_mesh_gradient` | Aurora blobs | 5 | Large blurred absolute/fixed radial/conic gradient backdrops |
| 19 | `ai_sparkle_badges` | AI sparkles | 3 | ≥2 ✨ characters or `lucide-sparkles` SVGs |
| 20 | `cream_default_bg` | Cream bg | 7 | Warm off-white / beige default page surface |
| 21 | `low_contrast_text` | Low contrast | 7 | Body copy contrast below WCAG AA (4.5:1) on light surface |
| 22 | `crushed_tracking` | Crushed tracking | 5 | Display headings tracked tighter than `-0.05em` |
| 23 | `gray_on_color` | Gray-on-color | 4 | Neutral grey text sitting on a chromatic surface |
| 24 | `oversized_hero_h1` | Oversized H1 | 4 | Long headline (≥40 chars) set at ≥72px |
| 25 | `nested_cards` | Nested cards | 4 | Card-like element nested inside a card-like ancestor |
| 26 | `wide_body_tracking` | Wide tracking | 3 | Body copy letter-spacing above `0.05em` |
| 27 | `flat_type_hierarchy` | Flat hierarchy | 3 | ≥3 font sizes with max/min ratio below `2.0×` |

**Design Tiers:** `Clean` (0–9) · `Mild` (10–27) · `Heavy` (≥28).

### Axis 2: The 9 copy patterns (lower score = cleaner)

| # | ID | Pattern | Weight | Tell |
|---|---|---|---|---|
| 1 | `buzzword_density` | AI buzzword density | 7 | High density of *leverage, seamless, robust, elevate, delve, tapestry, unleash* |
| 2 | `em_dash_overload` | Em-dash overload | 5 | Excess `—` clauses per 1,000 words |
| 3 | `antithesis_construction` | "Not just X — it's Y" | 6 | Negative-parallelism antithesis framing |
| 4 | `filler_openers` | Generic filler openers | 5 | *"In today's fast-paced world…"* throat-clearing |
| 5 | `formulaic_closers` | Formulaic closers | 4 | *"In conclusion"*, *"In summary"*, *"Ultimately"* sign-offs |
| 6 | `rule_of_three` | Rule-of-three tricolons | 4 | Repeated *"fast, reliable, and scalable"* adjective cadence |
| 7 | `whether_youre` | "Whether you're X or Y" | 3 | *"Whether you're a solo founder or Fortune 500…"* |
| 8 | `unicode_artifacts` | Invisible Unicode artifacts | 4 | Zero-width spaces, narrow no-break spaces, or math-alnum fake-bold letters |
| 9 | `emoji_bullet_headers` | Emoji bullet headers | 3 | Feature lists/headings led by 🚀 ✅ ✨ ⚡ 💡 |

**Copy Tiers:** `Clean` (0–7) · `Mild` (8–19) · `Heavy` (≥20).

### Axis 3: System compliance (`DESIGN.md`) (higher score = better)

Compares live DOM tokens against `<origin>/DESIGN.md` (`Aligned` ≥80 · `Drifting` 50–79 · `Off-system` <50).

### Axis 4: AEO readiness (8 checks, higher score = better)

`html.reachable` (10 pts, required) · `bot.notBlocked` (25 pts, required) · `robots.aiAllowed` (20 pts, required) · `html.indexable` (15 pts, required) · `md.twin` (10 pts, recommended) · `html.linkAlternate` (8 pts, recommended) · `site.llmsTxt` (7 pts, recommended) · `html.vary` (5 pts, recommended).
**AEO Tiers:** `AI-Ready` (≥80) · `Partial` (50–79) · `Invisible` (<50).

## How to use it

### 1. Hosted HTTP API (preferred — zero install, ~5–8s per scan)

```bash
# Multi-axis scan (design + copy + optional DESIGN.md system check)
curl -s -X POST -H 'Content-Type: application/json' \
  https://slop-detect.com/api/scan \
  -d '{"url":"https://example.com","axes":["design","copy"],"designMd":true}'

# AEO crawler & citation readiness audit
curl -s -X POST -H 'Content-Type: application/json' \
  https://slop-detect.com/api/aeo \
  -d '{"url":"https://example.com"}'

# Generate a copy-pasteable remediation prompt
curl -s -X POST -H 'Content-Type: application/json' \
  https://slop-detect.com/api/fix-prompt \
  -d '{"url":"https://example.com"}' > fix.md
```

### 2. MCP Server (`slop-detect-mcp`)

Exposes tools (`scan_page`, `check_aeo`, `check_design_system`, `fix_prompt`), workflow prompts (`audit_landing_page`, `deslop_and_verify`), and spec resources (`slop://spec/patterns`, `slop://spec/design-md-template`) directly to MCP-capable agents:

```bash
npx -y slop-detect-mcp
```

### 3. CLI (`slop-detect`)

```bash
npx slop-detect https://example.com
npx slop-detect https://example.com --copy --aeo --design-md auto
npx slop-detect https://example.com --fail-on heavy --fail-under B
npx slop-detect https://example.com --sarif > slop.sarif
npx slop-detect https://example.com --init-design-md > DESIGN.md
npx slop-detect https://example.com --fix-prompt > fix.md
npx slop-detect https://example.com --remote --json
```

### 4. Programmatic embed (`slop-detect-core`)

```bash
npm install slop-detect-core
```

```js
import { PATTERNS, scorePatterns, generateDesignMd, buildFixPrompt } from 'slop-detect-core';
```

## Output format the user wants to see

After a scan, present results in this shape:

1. **One-line verdict** with tier indicator and letter grade:
   - 🔴 Heavy (≥28) — "Heavy slop — looks AI-generated"
   - 🟡 Mild (10–27) — "Some slop signals — needs cleanup"
   - 🟢 Clean (0–9) — "Clean — no major AI-design tells"
2. **Triggered patterns** (only `triggered: true`), each with weight + literal DOM/CSS evidence
3. **Copy, System (`DESIGN.md`), and AEO readouts** when requested
4. **Always offer the fix prompt** if score ≥ 10: "Want a copy-pasteable prompt to fix these in your editor? Run `/api/fix-prompt`."

## Don't replace one slop pattern with another

When advising fixes, never recommend:

- Inter → Geist or Plus Jakarta Sans (all three are in the slop font list)
- Indigo-600 → Violet-600 (both trigger `purple_accent`)
- Linear-gradient text → Radial-gradient text (still triggers `gradient_text`)

Trust `/api/fix-prompt` recipes rather than improvising.

## Reference

- Live web UI: https://slop-detect.com
- Methodology & interactive catalogue: https://slop-detect.com/docs (Markdown twin: https://slop-detect.com/docs.md)
- Live pattern catalogue JSON: https://slop-detect.com/api/patterns
- OpenAPI 3.1 spec: https://slop-detect.com/openapi.json
- Design patterns in code: https://github.com/ravidsrk/slop-detect/blob/main/packages/core/src/patterns.ts
- Copy patterns in code: https://github.com/ravidsrk/slop-detect/blob/main/packages/core/src/copyPatterns.ts
- AEO checks in code: https://github.com/ravidsrk/slop-detect/blob/main/packages/core/src/aeo.ts
- DESIGN.md system checker: https://github.com/ravidsrk/slop-detect/blob/main/packages/core/src/system.ts
- Fix recipes: https://github.com/ravidsrk/slop-detect/blob/main/packages/core/src/fixes.ts

## License

MIT
