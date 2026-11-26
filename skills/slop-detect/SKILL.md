---
name: slop-detect
description: Audit a landing page in headless Chromium for DESIGN.md token compliance, zero-taste production hygiene (copy-paste artifacts, broken craft), default-template design and copy overlap, and AEO crawler eligibility, then generate a deterministic fix prompt. Use when auditing a page, checking DESIGN.md drift, verifying AEO eligibility, or running a local verify loop while editing UI.
license: MIT
metadata:
  author: ravidsrk
  version: "0.9.1"
  homepage: "https://slop-detect.com"
  repository: "https://github.com/ravidsrk/slop-detect"
compatibility: Runs offline by default via the local slop-detect CLI (Playwright Chromium) or slop-detect-mcp --local with zero external data egress. Optional hosted API mode (slop-detect.com/api/scan) sends only the target URL.
---

# slop-detect

Deterministic landing-page auditor and rendered-DOM `DESIGN.md` conformance gate (`definitions@2026.11`).

- **Offline default local runner:** `npx slop-detect <url>` (Playwright Chromium) and `npx -y -p slop-detect -p slop-detect-mcp slop-detect-mcp --local` run offline on this machine with zero data egress.
- **Optional hosted API:** Only when you explicitly call `https://slop-detect.com/api/*` does data leave the machine, and only the target `url` and scan options are transmitted. Pass `"share": false` (the MCP default) to keep scans off public permalinks.
- **Live catalogue authority:** Never hardcode counts in UI or reports — fetch live counts, weights, and lifecycle status from `GET https://slop-detect.com/api/patterns` or MCP resource `slop://spec/patterns`.

## Five axes and polarity

- **Axis 1: The 45 design patterns** — *lower is better* (`Clean` 0–9 · `Mild` 10–27 · `Heavy` ≥28). Deterministic computed-style checks for default-template patterns. Weight 0 review rules add 0 points.
- **Axis 2: The 26 copy patterns** — *lower is better* (`Clean` 0–7 · `Mild` 8–19 · `Heavy` ≥20). Prose density tells plus zero-taste paste hygiene (leaked chatbot markup, reply residue, unfilled placeholders, raw Markdown, hidden Unicode).
- **Axis 3: System (`DESIGN.md` / DTCG `tokens.json`)** — *higher is better* (`Aligned` ≥80 · `Drifting` 50–79 · `Off-system` <50). Compares live rendered DOM tokens against declared tokens in Oklab ΔE and waives intentionally declared brand choices.
- **Axis 4: AEO readiness (16 checks)** — *higher is better* (`Eligible` ≥80 · `Partially Eligible` 50–79 · `Restricted` <50). Technical eligibility for search and user-action crawlers using an honest scanner User-Agent (never spoofs vendor bots).
- **Axis 5: Craft floor** — *higher is better* (separate 0–100 defect floor; never feeds Design, Copy, or Clean/Mild/Heavy).

All scores measure overlap with common template defaults or declared tokens — never claim a page was written or built by a human or machine.

## Recommended local edit-and-verify loop

1. Run `scan_page` (or `npx slop-detect http://localhost:3000 --format agent --copy --design-md auto`).
2. Call `fix_prompt` with the returned `scan_id` (or `brief: true` for a ≤120-word avoid list) so you do not run a second browser scan.
3. Apply targeted fixes using the returned CSS selectors and recipes — do not swap one template default for another (e.g., Inter → Geist, indigo-600 → violet-500).
4. Re-scan the local dev server until `score < 10` (`Clean`) and `DESIGN.md` compliance is `Aligned` (≥80). If a scan cannot run, report the error; it is never a Clean score.

## MCP tools (`slop-detect-mcp`)

All 7 tools are shared by the local stdio server (`npx -y -p slop-detect -p slop-detect-mcp slop-detect-mcp --local`) and hosted endpoint (`https://slop-detect.com/mcp`):

- `scan_page` — Design, Copy, Craft, and optional `DESIGN.md` check (returns compact summary + `scan_id` + DOM selectors).
- `check_design_system` — Check rendered DOM drift against `<origin>/DESIGN.md` or a supplied URL.
- `extract_design_system` — Bootstrap a `DESIGN.md` and/or DTCG 2025.10 `tokens.json` from a live page.
- `lint_design_md` — Static linter for broken refs, WCAG `<4.5:1` pairs, and orphaned tokens (offline, instant).
- `diff_design_md` — Detect breaking token removals/changes between two `DESIGN.md` files (offline, instant).
- `check_aeo` — Technical AEO eligibility checks (robots.txt RFC 9309, indexability, preview directives, server text, Markdown twin, `llms.txt`).
- `fix_prompt` — Targeted fix prompt or ≤120-word avoid list from `scan_id`, `patterns`, or `url`.

## CLI quick reference

```bash
npx slop-detect http://localhost:3000 --format agent --copy --design-md auto
npx slop-detect https://example.com --aeo --craft --fix-prompt
npx slop-detect https://example.com --init-design-md > DESIGN.md
npx slop-detect --lint-design-md ./DESIGN.md
npx slop-detect https://example.com --fail-on heavy --sarif > slop.sarif
npx slop-detect init --providers claude,cursor --ci github
```

## Reference

- Live workbench: https://slop-detect.com
- Live pattern catalogue: https://slop-detect.com/api/patterns · MCP resource `slop://spec/patterns`
- OpenAPI 3.1: https://slop-detect.com/openapi.json
- Docs (Markdown twin): https://slop-detect.com/docs.md
