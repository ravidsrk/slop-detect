# Slop Detector

> Does your landing page wear a default template? Paste a URL, get a deterministic
> 5-axis Chromium verification report: default-template design patterns, copy/paste
> artifacts, craft floor defects, rendered `DESIGN.md` token compliance, and AEO
> technical crawler eligibility.

Slop Detector is open source (MIT) and runs on real Chromium. It ships as a web
workbench, a command-line verifier (`npx slop-detect verify`), a GitHub Action,
and a local-first MCP server (`slop-detect-mcp --local`), so humans and coding
agents verify the same rendered DOM.

## Why deterministic verification matters

Default templates converge on the same fonts, gradient hero text, glassmorphism,
eyebrow pills, and big-number stat bands. Slop Detector measures how many of
those patterns a page matches alongside its own declared `DESIGN.md` tokens and
objective craft checks. It is a fingerprint, not an authorship verdict: a score
never claims who wrote a page.

## The five axes

- **Design (lower is better · Clean 0–9 · Mild 10–27 · Heavy 28+).** 45 CSS/DOM
  rules across typography, color, layout, and effects (weight-0 review rules add
  no points).
- **Copy (lower is better · Clean 0–7 · Mild 8–19 · Heavy 20+).** 26 prose and
  paste-artifact rules, including leaked chatbot citation markup, turn residue,
  unfilled placeholders, and unrendered Markdown.
- **Craft floor (higher is better · separate).** 11 objective rendering, WCAG
  contrast, 390px mobile reflow, broken media, and interaction checks. Never
  feeds Clean/Mild/Heavy.
- **System · `DESIGN.md` (higher is better · Aligned 80+ · Drifting 50–79 · Off-system <50).**
  Verifies live rendered DOM against your own declared `DESIGN.md` or W3C DTCG
  tokens, automatically waiving declared brand choices.
- **AEO · crawler eligibility (higher is better · Eligible 80+ · Partially Eligible 50–79 · Restricted <50).**
  16 HTTP checks verifying whether search and AI answer crawlers can fetch,
  index, and read your page without JavaScript.

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
