---
name: slop-detect
description: Score any landing page against the versioned design-slop fingerprint, copy axis, DESIGN.md system compliance, craft floor, and AEO readiness, then generate a deterministic fix prompt. Use when the user asks to audit a landing page for default-template design or copy patterns, verify DESIGN.md compliance, check if answer engines can read a site (AEO), or get specific feedback to clean up a generic site.
license: MIT
metadata:
  author: ravidsrk
  version: "0.8.0"
  homepage: "https://slop-detect.com"
  repository: "https://github.com/ravidsrk/slop-detect"
compatibility: Requires internet access. Uses the public slop-detect.com API (no auth, rate-limited per-IP) or the slop-detect-mcp MCP server. Falls back to the slop-detect npm CLI when offline or when scanning behind auth.
---

# slop-detect

Score any landing page against the versioned telemetry engine (`definitions@2026.11`):
1. **Design Slop (45 CSS/DOM patterns)** — deterministic live-DOM inspection derived from Adrian Krebs's study of 1,400 Show HN submissions, Meng To's Aura study, and Impeccable typography/contrast rules. Weight 0 review rules add no points.
2. **Copy Slop (26 prose patterns)** — density-calibrated text analysis. Weight 0 review rules add no points.
3. **System Axis (`DESIGN.md` compliance)** — relative per-site audit checking whether the live DOM honors the site's own declared `DESIGN.md` or DTCG tokens.
4. **AEO Axis (16 checks)** — whether a page can be fetched and read. The scanner uses its own user agent and does not impersonate vendor crawlers. Tiers are Eligible, Partially Eligible, and Restricted.
5. **Craft floor (11 checks)** — a separate score. It never feeds design, copy, or Clean / Mild / Heavy.

This skill is the **fast path**. When the user pastes a URL and asks anything about its design quality, default-template pattern overlap, copywriting tells, `DESIGN.md` drift, AEO readiness, or how to clean it up, call the tool rather than eyeballing the page yourself.

## When to use this skill

Trigger phrases (non-exhaustive):

- "does this match default-template patterns?", "does this have template tells?"
- "audit my landing page", "score my landing page"
- "why does this site look generic", "this looks slop-y"
- "fix my landing page", "make my hero look less generic"
- "does my site honor its DESIGN.md?", "check for design system drift"
- "can ChatGPT / Claude / Perplexity read and cite my site?", "check AEO"
- "design slop audit", "slop score"
- Any URL pasted with a vague "what do you think of this?" — run a scan first

## Four-axis catalogue (`definitions@2026.11`)

The live counts below come from the engine. Weight 0 rules are listed and add no points. Published leaderboard scores stay on definitions 2026.10 until a re-score.

### Axis 1: The 45 design patterns (lower score = cleaner)

Weight 0 rows are in the catalogue and add no points until a measured promotion. Gray-on-color and wide body tracking are craft-floor checks, not design patterns.

| # | ID | Pattern | Weight | Status |
| --- | --- | --- | --- | --- |
| 1 | `slop_fonts` | Slop fonts | 8 | decaying |
| 2 | `slop_fonts_2026` | 2026 slop fonts | 0 | review |
| 3 | `purple_accent` | Vibe purple | 4 | decaying |
| 4 | `gradient_text` | Gradient text | 6 | active |
| 5 | `gradient_backgrounds` | Gradient bgs | 4 | active |
| 6 | `accent_stripe` | Accent stripe | 6 | active |
| 7 | `accent_stripe_2026` | Accent stripe 2026 | 0 | review |
| 8 | `glassmorphism` | Glass | 4 | active |
| 9 | `colored_glows` | Colored glows | 4 | active |
| 10 | `centered_hero` | Centered hero | 4 | active |
| 11 | `hero_eyebrow_pill` | Eyebrow pill | 5 | active |
| 12 | `all_caps_labels` | All-caps (retired) | 0 | retired |
| 13 | `eyebrow_label` | Eyebrow labels | 0 | review |
| 14 | `perma_dark_mode` | Perma dark | 4 | active |
| 15 | `icon_card_grid` | Icon cards | 4 | active |
| 16 | `numbered_steps` | Numbered steps | 3 | active |
| 17 | `stat_banner` | Stat banner | 3 | active |
| 18 | `faq_accordion` | FAQ | 2 | active |
| 19 | `gradient_letter_avatars` | Letter avatars | 5 | active |
| 20 | `bento_grid` | Bento grid | 4 | active |
| 21 | `aurora_mesh_gradient` | Aurora blobs | 5 | active |
| 22 | `ai_sparkle_badges` | AI sparkles | 3 | active |
| 23 | `cream_default_bg` | Cream bg | 7 | active |
| 24 | `low_contrast_text` | Low contrast | 7 | active |
| 25 | `crushed_tracking` | Crushed tracking | 5 | active |
| 26 | `oversized_hero_h1` | Oversized H1 | 4 | active |
| 27 | `nested_cards` | Nested cards | 4 | active |
| 28 | `flat_type_hierarchy` | Flat hierarchy | 3 | active |
| 29 | `scaffold_defaults_unedited` | Scaffold defaults | 0 | review |
| 30 | `hero_accent_word` | Hero accent word | 0 | review |
| 31 | `template_chrome_2026` | 2026 chrome | 0 | review |
| 32 | `uniform_radius_shadow` | Uniform radius/shadow | 0 | review |
| 33 | `editorial_cream_kit` | Editorial kit | 0 | review |
| 34 | `template_page_order` | Page order | 0 | review |
| 35 | `pulsing_status_badge` | Pulsing badge | 0 | review |
| 36 | `display_mono_heading` | Mono heading | 0 | review |
| 37 | `chip_rainbow` | Chip rainbow | 0 | review |
| 38 | `fake_macos_terminal` | Fake terminal | 0 | review |
| 39 | `fake_logo_bar` | Fake logo bar | 0 | review |
| 40 | `infinite_marquee_ticker` | Marquee ticker | 0 | review |
| 41 | `fade_up_monoculture` | Fade-up monoculture | 0 | review |
| 42 | `cursor_spotlight_gradient` | Cursor spotlight | 0 | review |
| 43 | `uniform_card_hover` | Uniform hover | 0 | review |
| 44 | `section_template_repetition` | Section repetition | 0 | review |
| 45 | `unthemed_browser_surfaces` | Unthemed surfaces | 0 | review |

**Design Tiers:** `Clean` (0–9) · `Mild` (10–27) · `Heavy` (≥28).

### Axis 2: The 26 copy patterns (lower score = cleaner)

| # | ID | Pattern | Weight | Status |
| --- | --- | --- | --- | --- |
| 1 | `buzzword_density` | Buzzwords | 7 | active |
| 2 | `em_dash_overload` | Em-dashes | 2 | decaying |
| 3 | `antithesis_construction` | Not-just-X | 6 | rising |
| 4 | `filler_openers` | Filler opener | 5 | decaying |
| 5 | `formulaic_closers` | Closers | 4 | historical |
| 6 | `rule_of_three` | Rule of three | 4 | decaying |
| 7 | `whether_youre` | Whether-you | 3 | active |
| 8 | `unicode_artifacts` | Unicode tells | 0 | retired |
| 9 | `emoji_bullet_headers` | Emoji bullets | 3 | active |
| 10 | `hidden_tag_characters` | Hidden tag chars | 0 | review |
| 11 | `invisible_characters` | Invisible chars | 0 | review |
| 12 | `fake_bold_math_alnum` | Fake-bold Unicode | 4 | active |
| 13 | `chatbot_markup_leak` | Chatbot markup | 0 | review |
| 14 | `chatbot_reply_residue` | Reply residue | 0 | review |
| 15 | `ai_referral_utm_links` | AI UTM links | 0 | review |
| 16 | `unfilled_placeholders` | Placeholders | 0 | review |
| 17 | `leaked_markdown` | Raw Markdown | 0 | review |
| 18 | `structural_fake_social_proof` | Fake social proof | 0 | review |
| 19 | `bare_antithesis` | Bare antithesis | 0 | review |
| 20 | `emoji_heading_ratio` | Emoji ratio | 0 | review |
| 21 | `announced_structure` | Announced structure | 0 | review |
| 22 | `restated_thesis_closer` | Restated thesis | 0 | review |
| 23 | `context_leak_copy` | Context leak | 0 | review |
| 24 | `trailing_participial_clauses` | Participial tails | 0 | review |
| 25 | `sentence_length_uniformity` | Sentence uniformity | 0 | review |
| 26 | `excess_vocabulary_log_odds` | Log-odds vocab | 0 | review |

**Copy Tiers:** `Clean` (0–7) · `Mild` (8–19) · `Heavy` (≥20).

### Axis 3: System compliance (`DESIGN.md`) (higher score = better)

Compares live DOM tokens against `<origin>/DESIGN.md` or a DTCG `tokens.json` (9 checks). `Aligned` ≥80 · `Drifting` 50–79 · `Off-system` <50.

### Axis 4: AEO readiness (16 checks, higher score = better)

`html.reachable` (10 pts, required) · `edge.access` (20 pts, required) · `robots.searchAllowed` (20 pts, required) · `html.indexable` (12 pts, required) · `ai.previewControls` (8 pts, required) · `html.serverTextCoverage` (15 pts, required) · `md.twin` (6 pts, recommended) · `html.linkAlternate` (3 pts, recommended) · `site.llmsTxt` (2 pts, recommended) · `html.vary` (4 pts, recommended) · `ai.manipulation` (0 pts, info) · `agent.operability` (0 pts, info) · `agent.discovery` (0 pts, info) · `ai.usagePolicy` (0 pts, info) · `content.dates` (0 pts, info) · `jsonld.hygiene` (0 pts, info).
**AEO Tiers:** `Eligible` (≥80) · `Partially Eligible` (50–79) · `Restricted` (<50). The scanner uses its own user agent and does not pretend to be Googlebot, GPTBot, or any other vendor crawler.

### Craft floor (11 checks)

A separate 0–100 floor. Findings never feed design, copy, or Clean / Mild / Heavy. Opt in with `--craft`. Weight 0 review checks add nothing.

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

Exposes tools (`scan_page`, `check_aeo`, `check_design_system`, `fix_prompt`, `lint_design_md`, `diff_design_md`), workflow prompts (`audit_landing_page`, `deslop_and_verify`), and spec resources (`slop://spec/patterns`, `slop://spec/design-md-template`, `slop://spec/aeo`) directly to MCP-capable agents:

```bash
npx -y slop-detect-mcp
npx -y slop-detect-mcp --local
```

`--local` scores `localhost` and `file://` with Playwright and does not call slop-detect.com. It needs the `slop-detect` package installed. The default server still uses the hosted API. `packages/mcp/hooks/scan-local.mjs` is the matching Claude Code PostToolUse / Stop command. Set `SLOP_LOCAL_URL` to the dev server.

### 3. CLI (`slop-detect`)

```bash
npx slop-detect https://example.com
npx slop-detect https://example.com --copy --craft --aeo --design-md auto
npx slop-detect https://example.com --fail-on heavy --fail-under B
npx slop-detect https://example.com --sarif > slop.sarif
npx slop-detect https://example.com --init-design-md > DESIGN.md
npx slop-detect https://example.com --init-tokens > tokens.json
npx slop-detect --lint-design-md ./DESIGN.md
npx slop-detect --diff-design-md ./base/DESIGN.md ./head/DESIGN.md
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
   - 🔴 Heavy (≥28) — "Heavy slop — matches many default-template patterns"
   - 🟡 Mild (10–27) — "Some slop signals — matches a few default-template patterns"
   - 🟢 Clean (0–9) — "Clean — few default-template patterns"
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
