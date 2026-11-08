# Product Overview — Slop Detector (`slop-detect`)

## Purpose

Slop Detector is a deterministic, open-source auditing instrument that scores landing pages against the default-template patterns that AI page builders and coding agents converge on, run on real headless Chromium.

## Five-Axis Architecture

1. **Design Axis (`0–100`, lower is better)**: 45 computed-style and DOM layout checks (default fonts, purple/indigo accents, gradient text, glassmorphism, neon glow shadows, uniform bento grids, stock placeholder avatars, and cookie-cutter hero layouts).
2. **Copy Axis (`0–100`, lower is better)**: 26 prose, vocabulary, and artifact checks with 150-word and English language gates, Monroe et al. Fightin' Words log-odds scoring, and chatbot markup artifact detection (`data-start`/`data-end`, `utm_source=chatgpt.com`).
3. **System Axis (`DESIGN.md` / W3C DTCG `2025.10`, `0–100`, higher is better)**: 9 live DOM compliance checks verifying that rendered fonts, OKLab colors, corner radii, shadows, and spacing match the site's declared design system.
4. **Craft Floor (`0–100`, higher is better, orthogonal)**: 9 baseline rendering and accessibility checks (broken images, console errors, clipped overflow, 320px mobile reflow, focus indicators, dead CTAs) that never inflate or alter the design/copy tier.
5. **AEO Eligibility (`0–100`, higher is better)**: 16 network and protocol checks evaluating whether AI search and user-action crawlers can fetch, parse, and quote the page (`robots.txt` RFC 9309, edge WAF classification, server-rendered HTML coverage, Markdown twins, `/llms.txt`, and prompt-manipulation guards).

## Distribution Surfaces

- **Core Engine (`slop-detect-core`)**: Zero-dependency runtime-agnostic TypeScript library.
- **CLI (`slop-detect`)**: Local Playwright runner, static directory scanner, SARIF/JUnit/GitLab/GitHub/agent reporters, and `DESIGN.md` linter/extractor.
- **MCP Server (`slop-detect-mcp` & `https://slop-detect.com/mcp`)**: Stdio and stateless Streamable HTTP MCP server with MCP App scorecard resource (`ui://slop-detect/scorecard.html`).
- **GitHub Action (`ravidsrk/slop-detect`)**: PR gate with sticky comments, SARIF Code Scanning upload, and baseline regression ratcheting.
- **Web App (`https://slop-detect.com`)**: Cloudflare Pages application and API with live X-Ray pattern inspection, shareable permalinks, and domain regression monitoring.
