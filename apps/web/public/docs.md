# How the scan works · slop-detect methodology

> Canonical URL: https://slop-detect.com/docs
> Definitions version: `2026.11` · 45 design rules · 26 copy rules · 16 AEO checks · 9 DESIGN.md checks · MIT

`slop-detect` scores a landing page against a fixed, weighted catalogue of the CSS and copy tells that Cursor, v0, Lovable, and Bolt converged on. It runs in real headless Chromium against the page's own computed styles. Same page in, same score out: no model, no randomness, auditable, reproducible, safe to gate CI on.

![Optical DOM Spectrometer — 5-Plane Inspection](https://slop-detect.com/media/hero-optical-instrument.png)

---

## 01 · The four axes

| Axis | What it measures | Polarity |
|---|---|---|
| **design slop** | 45 CSS/DOM tells. Weight 0 review rules add no points. | Lower is better (`0–9` Clean, `10–27` Mild, `28+` Heavy) |
| **copy slop** | 26 prose tells on the page's own text. Weight 0 review rules add no points. | Lower is better (`0–7` Clean, `8–19` Mild, `20+` Heavy) |
| **system · DESIGN.md** | Relative compliance against the site's own declared `DESIGN.md` tokens (colors, typography, corner radii). | Higher is better (`80–100` Aligned, `50–79` Drifting, `0–49` Off-system) |
| **AEO · agent-readable** | 16 checks of whether a page can be fetched and read. The scanner does not impersonate vendor crawlers. | Higher is better (`80–100` Eligible, `50–79` Partially Eligible, `0–49` Restricted) |

![Four-axis telemetry architecture](https://slop-detect.com/media/docs-four-axes-architecture.png)

### The 45 design patterns (`definitions@2026.11`)

Weight 0 rules are listed and add no points. Craft-floor checks are not in this table.

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

### The 26 copy patterns (`definitions@2026.11`)

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


---

## 02 · Install

```bash
# one-off scan, zero install
npx slop-detect https://your-site.com

# or install the CLI globally
npm i -g slop-detect
slop-detect https://your-site.com
```

---

## 03 · The CLI

```bash
slop-detect <url> [...urls]        # score one or many pages
  --copy                           # also score the copy axis
  --axes all                       # design + copy together
  --aeo                            # score the 16-check AEO axis
  --design-md auto                 # check against <origin>/DESIGN.md
  --preset strict                  # score a curated subset
  --remote                         # scan via the API, no local browser
  --json                           # machine-readable output
  --fail-on heavy                  # exit non-zero to gate CI
```

---

## 04 · AEO · agent-readable

![AEO crawler verification pipeline](https://slop-detect.com/media/docs-aeo-crawler-pipeline.png)

| Check ID | Label | Weight | Severity |
| --- | --- | --- | --- |
| `html.reachable` | Page is reachable over HTTP (HTML 2xx) | 10 | required |
| `edge.access` | Edge/WAF allows automated retrieval without challenge or block | 20 | required |
| `robots.searchAllowed` | robots.txt permits AI search & citation crawlers (RFC 9309) | 20 | required |
| `html.indexable` | Page is indexable (no global noindex directive) | 12 | required |
| `ai.previewControls` | Snippet & preview controls permit quoting across Google, Bing, and Apple | 8 | required |
| `html.serverTextCoverage` | Server-rendered HTML contains primary page prose without JS | 15 | required |
| `md.twin` | Validated Markdown twin served via negotiation or .md route | 6 | recommended |
| `html.linkAlternate` | HTML advertises a valid Markdown twin (Link rel=alternate) | 3 | recommended |
| `site.llmsTxt` | Valid /llms.txt published at site root (H1 + links, non-HTML) | 2 | recommended |
| `html.vary` | Negotiated responses send Vary: Accept | 4 | recommended |
| `ai.manipulation` | No prompt injection, hidden instructions, or AI manipulation links | 0 | info |
| `agent.operability` | Interactive controls have accessible names and no blocking overlays | 0 | info |
| `agent.discovery` | Agent discovery endpoints (ARD, Agentmap, A2A agent-card, WebMCP) | 0 | info |
| `ai.usagePolicy` | Machine-readable AI usage preferences (AIPREF Content-Usage, Content-Signal, TDMRep) | 0 | info |
| `content.dates` | Publication and modification dates are valid and consistent across signals | 0 | info |
| `jsonld.hygiene` | JSON-LD structured data parses cleanly and matches visible text | 0 | info |

---

## 05 · The system axis · DESIGN.md

![DESIGN.md compliance and drift](https://slop-detect.com/media/docs-design-md-drift.png)

```bash
slop-detect https://your-site.com --design-md auto
```

---

## 06 · Web & REST API

- `POST /api/scan` — Score a URL on the design (and optional copy) axis, with optional `designMd: true` and `preset`.
- `POST /api/aeo` — Score whether AI engines can fetch, read, and cite a page.
- `GET /api/patterns` — Live pattern catalogue (`definitions@2026.11`).
- `POST /api/fix-prompt` — Assemble a paste-ready remediation prompt scoped to triggered tells.
- `GET /?mode=agent` — Machine-readable capability document.
- `GET /api/health` — Live readiness probe.

---

## 07 · Continuity & directory

- `POST /api/watch` — Register a daily re-scan with regression + `DESIGN.md` drift alerts (double opt-in).
- `GET /api/watch/confirm` — Confirm the emailed opt-in link.
- `GET /api/watch/unsubscribe` — One-click unsubscribe.
- `GET /api/sites` — Public owner-gated directory dataset (`/directory`).
- `GET /api/stats` — Aggregate scan telemetry.
- `POST /api/dashboard/link` — Request a single-use magic sign-in link for `/dashboard`.
- `GET /api/me/export` & `POST /api/me/erase` — Self-serve GDPR/DPDP data export and erasure.

---

## 08 · Programmatic (`slop-detect-core`)

```bash
npm install slop-detect-core
```

```javascript
import { scorePatterns, PATTERNS, DEFINITIONS_VERSION } from 'slop-detect-core';

const summary = scorePatterns(results);
console.log(summary.score, summary.grade, summary.tier);
console.log(PATTERNS.length, DEFINITIONS_VERSION); // 45 2026.11
```

---

## 09 · Presets & agents (`slop-detect-mcp`)

![Closed-loop MCP and CI workflow](https://slop-detect.com/media/docs-ci-mcp-loop.png)

```json
{
  "mcpServers": {
    "slop-detect": { "command": "npx", "args": ["-y", "slop-detect-mcp"] }
  }
}
```

Tools: `scan_page`, `check_aeo`, `check_design_system`, `fix_prompt`.

---

## 10 · CI gate · GitHub Action

```yaml
- uses: ravidsrk/slop-detect/packages/action@v0.8.0
  with:
    url: ${{ steps.preview.outputs.url }}
    fail-under: 'B'
```

---

## 11 · Tiers & grades

- **Clean (`0–9`)**: `A+` (`0–2`), `A` (`3–5`), `A-` (`6–9`)
- **Mild (`10–27`)**: `B+` (`10–14`), `B` (`15–19`), `B-` (`20–23`), `C` (`24–27`)
- **Heavy (`28+`)**: `D+` (`28–33`), `D` (`34–39`), `F` (`40–100`)
