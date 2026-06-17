# Slop Detector

> Does your landing page look generated? Paste a URL, get a deterministic 0–100
> slop score in about eight seconds: a weighted fingerprint of the CSS and copy
> tells that Cursor, v0, Lovable and Bolt all converged on.

Slop Detector is open source and runs on real Chromium. It ships as a web app, a
command-line tool, and an MCP server, so humans and coding agents can both use it.

## Does your landing page look generated?

Generated pages converge. They reach for the same fonts, the same gradient hero
text, the same glassmorphism, the same eyebrow pill and big-number stat band.
Slop Detector measures how far a page sits along that fingerprint. Slop is a
fingerprint, not a verdict: a high score means "this looks machine-made," not
"this is bad." Premium sites score Mild too.

## The fingerprint: what it measures

- **Type, fonts & tracking.** Geist / Inter defaults, crushed display tracking,
  wide body tracking, flat size hierarchy.
- **Color, gradients & glow.** Gradient hero text, gradient-heavy backgrounds,
  aurora blobs, colored glows, vibe-purple.
- **Layout, the convention stack.** Centered hero, eyebrow pill, glassmorphism,
  bento grids, nested cards, icon-card rows.
- **Copy, AI phrasing.** An optional second axis scores the words: the hedge-y,
  em-dash-heavy register LLMs default to.

## AEO axis: can AI engines read & cite this page?

A complementary axis scores network readability rather than design: whether
ChatGPT, Claude, Perplexity and Google AI Overviews can actually fetch, read and
cite a page. It checks AI-crawler access (GPTBot gets a 2xx), robots.txt rules,
indexability, a markdown twin, `/llms.txt`, and content-negotiation headers. Its
score polarity is inverted relative to the slop score: higher AEO is better.

## How it works

1. **Headless Chromium opens the page.** Cloudflare Browser Rendering loads it
   exactly as a browser would: JavaScript, fonts, computed styles and all.
2. **Up to 4,000 visible DOM nodes** are inspected. Every pattern detector is a
   pure function that runs against the live computed styles in a single pass.
3. **Weighted 0–100, deterministic.** Each triggered pattern adds its weight.
   Same page in, same score out. No model, no randomness.
4. **Clean / Mild / Heavy.** Clean 0–9, Mild 10–27, Heavy 28+.

## System axis: does the page honor its own design system?

The relative axis: declare your tokens in a DESIGN.md (Google Labs' open spec:
colors, typography, radii, components) and Slop Detector reports **drift**
against *your own* system: fonts in use that aren't declared, CTA or surface
colors off the palette, radii off the scale. Higher is better (Aligned ≥80 ·
Drifting ≥50 · Off-system <50). A bespoke site checked against its own tokens
can never false-positive as "slop."

## Keep it clean: monitoring

A score is a snapshot; drift is the disease. Monitor a domain
(`POST /api/watch` with a domain and email, or the form at
https://slop-detect.com/#monitor) and the daily sweep re-scans it, emailing you
on slop regression, and, with `system: true`, on design-system drift. Double
opt-in: nothing is emailed until you confirm. Every monitored domain gets a
print-friendly client report at `https://slop-detect.com/report/<domain>`, and
the dashboard (https://slop-detect.com/dashboard, magic-link sign-in) shows
every domain on your email in one view.

## Use it

- Web: paste a URL at https://slop-detect.com
- CLI: `npx slop-detect <url>`. Gate CI with `--fail-on heavy`, add `--aeo` for
  the AEO axis, `--design-md auto` for the system axis, `--remote` to scan via
  the API with no local browser.
- MCP: the `slop-detect-mcp` server exposes `scan_page`, `check_aeo`,
  `check_design_system` and `fix_prompt` tools to any MCP client (Claude Code,
  Cursor, Windsurf).

## Links

- Web app: https://slop-detect.com
- Source: https://github.com/ravidsrk/slop-detect
- Pattern catalogue: https://slop-detect.com/api/patterns
- Directory of scored sites (opt-in): https://slop-detect.com/directory
- The State of AI Design Slop: https://slop-detect.com/leaderboard
- Privacy: https://slop-detect.com/privacy.md
