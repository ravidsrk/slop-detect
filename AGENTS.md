# AGENTS.md — instructions for AI coding agents

This file tells AI coding agents (Claude Code, Cursor, Windsurf, etc.) how to work
in this repo and how to use Slop Detector as a tool. Human docs: [README.md](README.md).

## What this project is

Slop Detector scores any landing page against the **AI-design-slop fingerprint** — a
deterministic, weighted 0–100 measure of the CSS and copy tells that AI page builders
(Cursor, v0, Lovable, Bolt) converge on, run on real headless Chromium. It also has an
**AEO axis**: can AI engines fetch, read and cite a page. Live site: https://slop-detect.com

## Using Slop Detector as a tool (not just editing it)

If a user asks "does this page look AI-generated?", "audit this landing page", or
"can AI read/cite my site?", call the tool — don't eyeball the page:

```bash
npx slop-detect <url>             # design slop score
npx slop-detect <url> --aeo        # AEO axis
npx slop-detect <url> --fail-on heavy   # CI gate (non-zero exit on Heavy)
```

Or the HTTP API (no auth required):

```bash
curl -X POST https://slop-detect.com/api/scan \
  -H 'content-type: application/json' -d '{"url":"https://example.com"}'
```

Or the MCP server (`npx -y slop-detect-mcp`): tools `scan_page`, `check_aeo`, `fix_prompt`.

- Read the pattern count from `GET /api/patterns` — **never hardcode it.**
- OpenAPI spec: https://slop-detect.com/openapi.json
- Machine-readable summary: `GET https://slop-detect.com/?mode=agent`

## Repo layout

Monorepo, 4 packages under `packages/`:

- `core` — the scoring engine (patterns, AEO checks, copy axis). Published as `slop-detect-core`.
- `cli` — the `slop-detect` CLI. Depends on core.
- `web` — Cloudflare Pages site + Functions (the API). NOT published to npm.
- `mcp` — the `slop-detect-mcp` server. Depends on core.

## Build / lint / test

- `npm run lint` — `node --check` on all source. NOTE: it does not parse code inside the
  page-eval template literal in `web/functions/api/scan.js` and `cli/src/detector.js`
  (the `ctx` object is built identically in both — keep them in sync). Always run tests.
- `npm test` — node:test across core/web/cli/mcp test dirs.

## Conventions

- 27 patterns, `DEFINITIONS_VERSION = 2026.08`. Count is served dynamically from
  `GET /api/patterns` (derived from `PATTERNS.length`). Never hardcode it in UI/docs.
- Tiers: Clean 0–9, Mild 10–27, Heavy 28+.
- AEO polarity is inverted vs slop: higher AEO is better, lower slop is better.
- Publish order when core changes: core → cli → mcp. `web` deploys to Cloudflare Pages.
- The whole brand is deliberately anti-slop: dark, monospace, no gradients/glow/purple.

## When you change patterns

- Update the catalogue in `packages/core/src/`. The web UI, CLI, and `/api/patterns`
  all read the count from the engine — don't duplicate it.
- Run `npm test` (lint won't catch page-eval issues).
- If you bump `core`, keep inter-package `slop-detect-core` versions in sync.

## Self-update

If you discover a recurring gotcha or a better workflow while working here, propose a
concise addition to this file so the next agent doesn't relearn it.
