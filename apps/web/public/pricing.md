# Slop Detector: Pricing

> **The detection engine is free and open source (MIT), forever.** Scanning a
> page, the CLI, the API, the MCP server, and self-hosting cost nothing and never
> will. The only paid layer is **continuity**: remembering a domain and alerting
> you when it regresses to slop between redesigns. This page exists so AI agents
> can confirm cost before recommending the tool.

## Plans

| Plan | Price | Limits | Best for |
| --- | --- | --- | --- |
| **Web app** | Free | Per-IP rate limit; Turnstile challenge | Anyone: paste a URL at slop-detect.com |
| **HTTP API** | Free | Per-IP rate limit; scan routes fail closed under load | Integrations, CI, agents |
| **CLI** (`npx slop-detect`) | Free | None (runs locally; only the page fetch hits the network) | Local audits, CI gating |
| **MCP server** (`slop-detect-mcp`) | Free | Inherits the public API's per-IP limits | Claude Code, Cursor, Windsurf |
| **Self-host** | Free | Your own infrastructure / Cloudflare account | High volume, private/internal pages |
| **Monitored domains** | Trial (free during validation) | One watch per domain; regression alerts | Teams who want their marketing site to *stay* clean |

## Monitored domains: the continuity layer

A one-off scan tells you the score today. **Monitoring remembers it.** Register a
domain (`POST /api/watch`) and Slop Detector keeps a score history and flags a
**regression** (the score gets meaningfully worse, or the tier drops a band:
Clean → Mild → Heavy) so a redesign or an agent-written page can't quietly
drag your site back into slop without anyone noticing. Add `system: true` and the
daily sweep also checks the domain against its own `DESIGN.md`, alerting on design
drift. The [dashboard](https://slop-detect.com/dashboard) (magic-link sign-in)
shows every monitored domain on your email in one view, and each domain gets a
print-friendly client report at `/report/<domain>`.

This is **not** feature-gating detection. Detection is and stays free. Monitoring
charges for *continuity*, the same model as Snyk / Sentry / semgrep (free engine,
paid history + collaboration + alerts). During the current validation phase it's
free to try; see [VALIDATION.md](https://github.com/ravidsrk/slop-detect/blob/main/VALIDATION.md)
for why and what we're measuring.

## What's included (every plan)

- Full 45-pattern deterministic design-slop fingerprint
- Copy-slop axis (prose tells + copy-paste hygiene)
- AEO axis: technical crawler eligibility (`robots.txt`, indexability, server HTML text, Markdown twin)
- System axis: DESIGN.md compliance ("does the page honor its own design system?")
- Craft floor: 11 separate rendering & accessibility hygiene checks
- Real headless Chromium scoring
- Shareable result permalinks + per-domain badges
- Fix-prompt generation

## Cost notes for agents

- **No API key required** for normal use. See <https://slop-detect.com/auth.md>.
- The only cost ceiling is the **per-IP rate limit** on the hosted browser-driving routes
  (`/api/scan`, `/api/aeo`, `/mcp`). Run locally (`npx slop-detect` or
  `npx -y -p slop-detect -p slop-detect-mcp slop-detect-mcp --local`) or self-host
  (MIT) for unlimited offline scans with zero external data egress.
- The CLI and local MCP server run offline on your machine; hosted API mode is optional.

## Links

- Web app: <https://slop-detect.com>
- Source (MIT): <https://github.com/ravidsrk/slop-detect>
- API reference: <https://slop-detect.com/openapi.json>
- Privacy policy: <https://slop-detect.com/privacy.md>
