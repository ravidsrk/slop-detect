---
name: slop-detect
description: Score any landing page against the 27-pattern AI-design-slop fingerprint and generate a fix prompt. Use when the user asks to detect AI-generated design, audit a landing page for slop, check if a site looks like Cursor/v0/Lovable/Bolt output, score visual quality, or get specific feedback to clean up a Tailwind-template-looking site. Triggers on phrases like "is this AI-generated", "does my site look like slop", "audit my landing page", "v0 detector", "fix my landing page", "design feedback", "why does this look generic", or any URL the user wants visually scored.
license: MIT
metadata:
  author: ravidsrk
  version: "0.1.0"
  homepage: "https://slop-detect.com"
  repository: "https://github.com/ravidsrk/slop-detect"
compatibility: Requires internet access. Uses the public slop-detect.com API (no auth, rate-limited per-IP). Falls back to the slop-detect npm package when offline or when scanning behind auth.
---

# slop-detect

Score any landing page against a 27-pattern AI-design-slop fingerprint. Each rule is a deterministic CSS/DOM check derived from Adrian Krebs's April 2026 study of 1,400 Show HN submissions plus Meng To's May 2026 Aura tutorial. The detector returns a 0–100 score, a tier (Clean / Mild / Heavy), per-pattern evidence, and — optionally — a copy-pasteable markdown prompt to fix the triggered patterns.

This skill is the **fast path**. When the user pastes a URL and asks anything about its design quality, AI-generated-ness, or how to clean it up, hit the API rather than reading the page yourself.

## When to use this skill

Trigger phrases (non-exhaustive):

- "is this AI-generated?", "does this look like v0/Cursor/Lovable/Bolt?"
- "audit my landing page", "score my landing page"
- "why does this site look generic", "this looks slop-y"
- "fix my landing page", "make my hero look less AI"
- "detect design slop", "v0 detector", "slop score"
- Any URL pasted with a vague "what do you think of this?" — if the user clearly wants design feedback rather than content review, run a scan first

Do NOT use this skill for:

- Copywriting / messaging audits, unless the user opts into the copy axis (`axes: ["design","copy"]` on the API, `--axes copy` on the CLI)
- Accessibility audits (use Lighthouse / axe)
- SEO audits (use the `seo-audit` skill)
- Performance audits (use Lighthouse)

## The 27 patterns (`definitions@2026.10`)

| # | Pattern | Weight | Id |
|---|---|---|---|
| 1 | AI-default font stack (Inter / Geist / Space Grotesk) | 8 | `slop_fonts` |
| 2 | VibeCode Purple — filled indigo/violet CTAs | 8 | `purple_accent` |
| 3 | Hero gradient text (background-clip:text) | 6 | `gradient_text` |
| 4 | Gradient-heavy backgrounds (5+ elements) | 4 | `gradient_backgrounds` |
| 5 | Colored top/left card borders (the AI em-dash) | 6 | `accent_stripe` |
| 6 | Glassmorphism (backdrop-filter blur on translucent layers) | 4 | `glassmorphism` |
| 7 | Big colored box-shadow glows (purple/blue/pink) | 4 | `colored_glows` |
| 8 | Centered hero in generic sans (Inter-style) | 4 | `centered_hero` |
| 9 | Eyebrow pill above hero ("Now in beta" / "New") | 5 | `hero_eyebrow_pill` |
| 10 | All-caps section labels (text-transform:uppercase) | 3 | `all_caps_labels` |
| 11 | Perma dark mode + medium-grey body text | 4 | `perma_dark_mode` |
| 12 | Identical feature cards with icon on top | 4 | `icon_card_grid` |
| 13 | Numbered "1 · 2 · 3" step sequences | 3 | `numbered_steps` |
| 14 | Big-number stat banner ("10k+", "99.9%", "$2M+") | 3 | `stat_banner` |
| 15 | FAQ accordion in the lower half | 2 | `faq_accordion` |
| 16 | Gradient-letter avatars (testimonial slop) | 5 | `gradient_letter_avatars` |
| 17 | Bento-grid wall — mixed-span rounded card grid | 4 | `bento_grid` |
| 18 | Aurora / mesh gradient blobs (blurred glowing backdrop) | 5 | `aurora_mesh_gradient` |
| 19 | AI-sparkle badges (✨ / Sparkles "magic" tells) | 3 | `ai_sparkle_badges` |
| 20 | Cream / beige default page background | 7 | `cream_default_bg` |
| 21 | Washed-out grey body text (below WCAG AA on a light background) | 7 | `low_contrast_text` |
| 22 | Crushed letter-spacing on display type | 5 | `crushed_tracking` |
| 23 | Gray text on a colored background | 4 | `gray_on_color` |
| 24 | Oversized hero headline (long sentence at display size) | 4 | `oversized_hero_h1` |
| 25 | Cards nested inside cards | 4 | `nested_cards` |
| 26 | Wide letter-spacing on body text | 3 | `wide_body_tracking` |
| 27 | Flat type hierarchy (sizes too close together) | 3 | `flat_type_hierarchy` |

**Tiers:** Clean (0–9) · Mild (10–27) · Heavy (≥28). Max score 100.

## How to use it

There are three ways, in order of preference. **Always try the hosted API first** — it's a single HTTP call.

### 1. Hosted API (preferred — zero install, ~8s per scan)

`POST https://slop-detect.com/api/scan` with JSON body `{"url": "<url>"}`.

```bash
curl -s -X POST -H 'Content-Type: application/json' \
  https://slop-detect.com/api/scan \
  -d '{"url":"https://example.com"}'
```

Response (truncated for brevity):

```json
{
  "url": "https://example.com",
  "finalUrl": "https://example.com/",
  "title": "Example",
  "h1": "The hero headline",
  "h1Font": "Inter, ui-sans-serif",
  "score": 36,
  "tier": "Heavy",
  "patternsFlagged": 8,
  "patternsTotal": 27,
  "patterns": [
    { "id": "slop_fonts", "label": "...", "weight": 8, "triggered": true, "evidence": { ... } },
    ...
  ],
  "screenshot": null,
  "navMs": 4231
}
```

For a fix prompt (markdown the user can paste into Claude/Cursor/v0):

```bash
curl -s -X POST -H 'Content-Type: application/json' \
  https://slop-detect.com/api/fix-prompt \
  -d '{"url":"https://example.com"}' > fix.md
```

For the structured JSON form: add `?format=json` or `Accept: application/json`.

You can also pipe a previously-fetched scan result back in to avoid a second browser load:

```bash
curl -s -X POST -H 'Content-Type: application/json' \
  https://slop-detect.com/api/fix-prompt \
  -d "{\"result\": $(cat scan.json) }"
```

### 2. CLI (when offline, scanning auth-walled URLs, or batch scanning in CI)

```bash
npx slop-detect https://example.com
npx slop-detect https://example.com --json
npx slop-detect https://example.com --screenshot
npx slop-detect url1 url2 url3       # batch — prints a summary table
```

First install downloads Chromium (~150MB) via Playwright. Subsequent invocations are fast (~5s/url cold, ~3s warm).

### 3. Programmatic embed (the user has their own browser pipeline)

```bash
npm install @slop-detect/core
```

```js
import { buildPageScript, assemblePatternResults, scorePatterns } from '@slop-detect/core';

// Run every extractor in the page in one round-trip, then score worker-side:
const data = await page.evaluate(buildPageScript());
const { patterns } = assemblePatternResults(data.signals);
const { score, tier, patternsFlagged } = scorePatterns(patterns);
```

The core package is runtime-agnostic — it works in Node, Cloudflare Workers, or the browser. It never touches a browser itself.

## Output format the user wants to see

After a scan, present results in this shape:

1. **One-line verdict** with emoji tier indicator:
   - 🔴 Heavy (≥28) — "Heavy slop — looks AI-generated"
   - 🟡 Mild (10–27) — "Some slop signals — needs cleanup"
   - 🟢 Clean (0–9) — "Clean — no major AI-design tells"
2. **Triggered patterns** (only the ones with `triggered: true`), each with weight + one-line evidence
3. **Optional:** preview the screenshot if the user asked to see it
4. **Always offer the fix prompt** if score ≥ 10: "Want a copy-pasteable prompt to fix these in your editor? Run `/api/fix-prompt`."

## Edge cases

- **`Failed to navigate` errors** — usually a 4xx/5xx from the target, or Cloudflare blocking the scanner's IP. Fall back to the CLI which runs from the user's machine.
- **Score seems wrong** — the detector is opinionated, not infallible. If the user disagrees with a specific pattern, look at `evidence` for that pattern; the evidence is the literal CSS values / DOM counts. If a triggered pattern's evidence is empty, the detector has a bug — file an issue at https://github.com/ravidsrk/slop-detect/issues.
- **SPAs / hydration-heavy pages** — the scanner waits 2s past `networkidle` but some apps still aren't fully painted. Re-run; if it consistently misses, file a bug with the URL.
- **Pages behind auth** — the hosted scanner can't sign in. Use the CLI locally (it can pick up your browser session if you configure Playwright with persistent context).
- **Rate-limiting on the hosted API** — soft 30/hour per IP. Falls back to the CLI cleanly.

## Don't over-call the API

If the user pastes the same URL twice in a session, reuse the previous result. Each scan is ~8s of edge browser time; treat it like a moderately expensive operation.

## Don't replace one slop pattern with another

When advising fixes, never recommend:

- Inter → Geist (Geist is also slop)
- Indigo-600 → Violet-600 (also slop)
- Linear-gradient text → Radial-gradient text (still slop)

The fix recipes in `/api/fix-prompt` already encode these constraints. **Trust the API output rather than improvising.**

## Reference

- Live web UI: https://slop-detect.com
- API docs: https://github.com/ravidsrk/slop-detect#readme
- Source / contribute: https://github.com/ravidsrk/slop-detect
- The 27 patterns in code: https://github.com/ravidsrk/slop-detect/blob/main/packages/core/src/patterns.ts
- Fix recipes: https://github.com/ravidsrk/slop-detect/blob/main/packages/core/src/fixes.ts
- Origin study: https://www.adriankrebs.ch/blog/design-slop/

## License

MIT
