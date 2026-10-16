# How the scan works · slop-detect methodology

> Canonical URL: https://slop-detect.com/docs
> Definitions version: `2026.10` · 27 design rules · 9 copy rules · 8 AEO checks · `DESIGN.md` system compliance · MIT

`slop-detect` scores a landing page against a fixed, weighted catalogue of the CSS and copy tells that Cursor, v0, Lovable, and Bolt converged on. It runs in real headless Chromium against the page's own computed styles. Same page in, same score out: no model, no randomness, auditable, reproducible, safe to gate CI on.

![Optical DOM Spectrometer — 5-Plane Inspection](https://slop-detect.com/media/hero-optical-instrument.png)

---

## 01 · The four axes

| Axis | What it measures | Polarity |
|---|---|---|
| **design slop** | 27 weighted CSS/DOM tells AI builders converged on: slop fonts, purple CTAs, gradient text, glassmorphism, bento grids, cream surfaces, low contrast. | Lower is better (`0–9` Clean, `10–27` Mild, `28+` Heavy) |
| **copy slop** | 9 prose tells on the page's own text: buzzword density, em-dash overload, antithesis constructions, filler openers, formulaic closers. | Lower is better (`0–7` Clean, `8–19` Mild, `20+` Heavy) |
| **system · DESIGN.md** | Relative compliance against the site's own declared `DESIGN.md` tokens (colors, typography, corner radii). | Higher is better (`80–100` Aligned, `50–79` Drifting, `0–49` Off-system) |
| **AEO · agent-readable** | 8 weighted checks verifying whether AI engines (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`) can fetch, read, and cite the page. | Higher is better (`80–100` AI-Ready, `50–79` Partial, `0–49` Invisible) |

![Four-axis telemetry architecture](https://slop-detect.com/media/docs-four-axes-architecture.png)

### The 27 design patterns (`definitions@2026.10`)

| # | ID | Label | Category | Weight |
|---|---|---|---|---|
| 1 | `slop_fonts` | AI-default font stack (Inter / Geist / Space Grotesk) | fonts | 8 |
| 2 | `purple_accent` | VibeCode Purple — filled indigo/violet CTAs | colors | 8 |
| 3 | `gradient_text` | Hero gradient text (`background-clip: text`) | colors | 6 |
| 4 | `gradient_backgrounds` | Gradient-heavy backgrounds (5+ elements) | colors | 4 |
| 5 | `accent_stripe` | Colored top/left card borders (the AI em-dash) | layout | 6 |
| 6 | `glassmorphism` | Glassmorphism (`backdrop-filter: blur` on translucent layers) | css | 4 |
| 7 | `colored_glows` | Big colored box-shadow glows (purple/blue/pink) | css | 4 |
| 8 | `centered_hero` | Centered hero in generic sans (Inter-style) | layout | 4 |
| 9 | `hero_eyebrow_pill` | Eyebrow pill above hero ("Now in beta" / "New") | layout | 5 |
| 10 | `all_caps_labels` | All-caps section labels (`text-transform: uppercase`) | fonts | 3 |
| 11 | `perma_dark_mode` | Perma dark mode + medium-grey body text | colors | 4 |
| 12 | `icon_card_grid` | Identical feature cards with icon on top | layout | 4 |
| 13 | `numbered_steps` | Numbered "1 · 2 · 3" step sequences | layout | 3 |
| 14 | `stat_banner` | Big-number stat banner ("10k+", "99.9%") | layout | 3 |
| 15 | `faq_accordion` | FAQ accordion in the lower half | layout | 2 |
| 16 | `gradient_letter_avatars` | Gradient-letter avatars (testimonial slop) | images | 5 |
| 17 | `bento_grid` | Bento-grid wall — mixed-span rounded card grid | layout | 4 |
| 18 | `aurora_mesh_gradient` | Aurora / mesh gradient blobs (blurred glowing backdrop) | css | 5 |
| 19 | `ai_sparkle_badges` | AI-sparkle badges (✨ / Sparkles "magic" tells) | images | 3 |
| 20 | `cream_default_bg` | Cream / beige default page background | colors | 7 |
| 21 | `low_contrast_text` | Washed-out grey body text (below WCAG AA on a light background) | colors | 7 |
| 22 | `crushed_tracking` | Crushed letter-spacing on display type | fonts | 5 |
| 23 | `gray_on_color` | Gray text on a colored background | colors | 4 |
| 24 | `oversized_hero_h1` | Oversized hero headline (long sentence at display size) | fonts | 4 |
| 25 | `nested_cards` | Cards nested inside cards | layout | 4 |
| 26 | `wide_body_tracking` | Wide letter-spacing on body text | fonts | 3 |
| 27 | `flat_type_hierarchy` | Flat type hierarchy (sizes too close together) | fonts | 3 |

### The 9 copy patterns (`definitions@2026.10`)

| # | ID | Label | Weight |
|---|---|---|---|
| 1 | `buzzword_density` | AI buzzword density (leverage / seamless / robust / elevate …) | 7 |
| 2 | `em_dash_overload` | Em-dash overload (— used as the default connective) | 5 |
| 3 | `antithesis_construction` | "It's not just X — it's Y" / "not only … but also" antithesis | 6 |
| 4 | `filler_openers` | Generic filler openers ("In today's fast-paced world …") | 5 |
| 5 | `formulaic_closers` | Essay-style closers ("In conclusion", "In summary", "Ultimately") | 4 |
| 6 | `rule_of_three` | Rule-of-three adjective tricolons ("fast, reliable, and scalable") | 4 |
| 7 | `whether_youre` | "Whether you're X or Y" audience-spanning construction | 3 |
| 8 | `unicode_artifacts` | Invisible Unicode + smart-quote artifacts (copy-pasted from an LLM) | 4 |
| 9 | `emoji_bullet_headers` | Emoji-prefixed bullet/headers (🚀 ✅ ✨ as list markers) | 3 |

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
  --aeo                            # score the 8-check AEO axis
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
|---|---|---|---|
| `html.reachable` | Page is reachable (HTML 2xx) | 10 | required |
| `bot.notBlocked` | AI crawlers are not blocked (GPTBot gets 2xx) | 25 | required |
| `robots.aiAllowed` | robots.txt does not Disallow AI crawlers | 20 | required |
| `html.indexable` | Page is indexable (no noindex) | 15 | required |
| `md.twin` | Markdown twin served at `<url>.md` | 10 | recommended |
| `html.linkAlternate` | HTML advertises the markdown twin (Link rel=alternate) | 8 | recommended |
| `site.llmsTxt` | `/llms.txt` published at the site root | 7 | recommended |
| `html.vary` | HTML sends Vary: Accept (content-negotiation aware) | 5 | recommended |

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
- `GET /api/patterns` — Live pattern catalogue (`definitions@2026.10`).
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

## 08 · Programmatic (`@slop-detect/core`)

```javascript
import { scorePatterns, PATTERNS, DEFINITIONS_VERSION } from '@slop-detect/core';

const summary = scorePatterns(results);
console.log(summary.score, summary.grade, summary.tier);
console.log(PATTERNS.length, DEFINITIONS_VERSION); // 27 2026.10
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

- **Clean (`0–9`)**: `A+` (`0–3`), `A` (`4–6`), `A-` (`7–9`)
- **Mild (`10–27`)**: `B+` (`10–14`), `B` (`15–19`), `B-` (`20–23`), `C+` (`24–27`)
- **Heavy (`28+`)**: `C` (`28–33`), `C-` (`34–39`), `D` (`40–49`), `F` (`50–100`)
