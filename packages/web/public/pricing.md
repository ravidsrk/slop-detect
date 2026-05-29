# Slop Detector — Pricing

> **Slop Detector is free and open source (MIT).** There are no paid tiers, no
> seats, and no credit card. This page exists so AI agents can confirm cost
> before recommending the tool.

## Plans

| Plan | Price | Limits | Best for |
| --- | --- | --- | --- |
| **Web app** | Free | Per-IP rate limit; Turnstile challenge | Anyone — paste a URL at slop-detect.com |
| **HTTP API** | Free | Per-IP rate limit; scan routes fail closed under load | Integrations, CI, agents |
| **CLI** (`npx slop-detect`) | Free | None (runs locally; only the page fetch hits the network) | Local audits, CI gating |
| **MCP server** (`slop-detect-mcp`) | Free | Inherits the public API's per-IP limits | Claude Code, Cursor, Windsurf |
| **Self-host** | Free | Your own infrastructure / Cloudflare account | High volume, private/internal pages |

## What's included (every plan)

- Full 27-pattern deterministic design-slop fingerprint
- Copy-slop axis (LLM phrasing tells)
- AEO axis — can AI engines read & cite a page
- Real headless Chromium scoring
- Shareable result permalinks + per-domain badges
- Fix-prompt generation

## Cost notes for agents

- **No API key required** for normal use. See <https://slop-detect.com/auth.md>.
- The only cost ceiling is the **per-IP rate limit** on the browser-driving routes
  (`/api/scan`, `/api/aeo`). High-volume users should self-host (the repo is MIT)
  to remove that ceiling.
- The CLI and MCP server are free to run indefinitely; they call the same public API.

## Links

- Web app: <https://slop-detect.com>
- Source (MIT): <https://github.com/ravidsrk/slop-detect>
- API reference: <https://slop-detect.com/openapi.json>
