# Slop Detector

> Score any landing page against the AI-design fingerprint. Paste a URL, get a
> deterministic 0–100 slop score in about five seconds — a weighted fingerprint
> of the CSS and copy tells that Cursor, v0, Lovable and Bolt all converged on.

Slop Detector is open source and runs on real Chromium. It ships as a web app, a
command-line tool, and an MCP server, so humans and coding agents can both use it.

## How AI-generated does your landing page look?

Generated pages converge. They reach for the same fonts, the same gradient hero
text, the same glassmorphism, the same eyebrow pill and big-number stat band.
Slop Detector measures how far a page sits along that fingerprint. Slop is a
fingerprint, not a verdict — a high score means "this looks machine-made," not
"this is bad."

## The fingerprint — what it measures

- **Type — fonts & tracking.** Geist / Inter defaults, crushed display tracking,
  wide body tracking, flat size hierarchy.
- **Color — gradients & glow.** Gradient hero text, gradient-heavy backgrounds,
  aurora blobs, colored glows, vibe-purple.
- **Layout — the convention stack.** Centered hero, eyebrow pill, glassmorphism,
  bento grids, nested cards, icon-card rows.
- **Copy — AI phrasing.** An optional second axis scores the words: the hedge-y,
  em-dash-heavy register LLMs default to.

## AEO axis — can AI engines read & cite this page?

A complementary axis scores network readability rather than design: whether
ChatGPT, Claude, Perplexity and Google AI Overviews can actually fetch, read and
cite a page. It checks AI-crawler access (GPTBot gets a 2xx), robots.txt rules,
indexability, a markdown twin, `/llms.txt`, and content-negotiation headers. Its
score polarity is inverted relative to the slop score: higher AEO is better.

## How it works

1. **Headless Chromium opens the page.** Cloudflare Browser Rendering loads it
   exactly as a browser would — JavaScript, fonts, computed styles and all.
2. **Up to 4,000 visible DOM nodes** are inspected. Every pattern detector is a
   pure function that runs against the live computed styles in a single pass.
3. **Weighted 0–100, deterministic.** Each triggered pattern adds its weight.
   Same page in, same score out. No model, no randomness.
4. **Clean / Mild / Heavy.** Clean 0–9, Mild 10–27, Heavy 28+.

## Use it

- Web: paste a URL at https://slop-detect.com
- CLI: `npx slop-detect <url>` — gate CI with `--fail-on heavy`, add `--aeo` for
  the AEO axis.
- MCP: the `slop-detect-mcp` server exposes `scan_page`, `check_aeo` and
  `fix_prompt` tools to any MCP client (Claude Code, Cursor, Windsurf).

## Links

- Web app: https://slop-detect.com
- Source: https://github.com/ravidsrk/slop-detect
- Pattern catalogue: https://slop-detect.com/api/patterns
