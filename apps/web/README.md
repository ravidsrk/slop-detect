# slop-detect-web (`apps/web`)

> Cloudflare Pages application, Hono/JSX routes, REST API (`/api/*`), and stateless Streamable HTTP MCP server (`/mcp`) powering [**slop-detect.com**](https://slop-detect.com).

---

## Surface Overview

### Web Pages & Interactive Routes
- `GET /` (`public/index.html` + `functions/index.ts`) — Interactive 5-axis DOM spectrometer, X-Ray pattern overlay, and machine-readable `?mode=agent` capability endpoint.
- `GET /docs` (`functions/docs.tsx`, alias `/methodology`, markdown twin `/docs.md`) — Live engine-derived methodology reference and interactive rule explorer.
- `GET /compare` (`functions/compare.tsx`, markdown twin `/compare.md`) — Positioning comparison against ML detectors, Lighthouse, and static linters.
- `GET /leaderboard` (`functions/leaderboard.tsx`) — Aggregate research telemetry ("The State of AI Design Slop").
- `GET /directory` (`functions/directory.tsx`) — Opt-in owner-verified directory of scored domains.
- `GET /r/:id` (`functions/r/[id].tsx`) — Immutable scan result permalink with `GET /og/:id.png` social card.
- `GET /score/:domain` (`functions/score/[domain].tsx`) — Canonical per-domain telemetry hub and history.
- `GET /report/:domain` (`functions/report/[domain].tsx`) — Print-friendly (`@media print`) agency audit report.
- `GET /badge/:domain.svg` (`functions/badge/[domain].ts`) — Live tier-colored shields-style SVG badge.
- `GET /dashboard` (`functions/dashboard.tsx`) — Passwordless magic-link dashboard for monitored domains, with GDPR/DPDP self-serve export (`/api/me/export`) and erasure (`/api/me/erase`).

### Public API & Agent Protocol Endpoints
- `POST /api/scan` — Headless Chromium scan across Design, Copy, Craft Floor, and `DESIGN.md` System compliance.
- `POST /api/aeo` — 16-check Answer Engine Optimization (AEO) audit.
- `POST /api/fix-prompt` — Paste-ready remediation prompt generator.
- `GET /api/patterns` — Live rule catalogue (`PATTERNS`, `COPY_PATTERNS`, `AEO_CHECKS`, `SYSTEM_CHECKS`, `CRAFT_CHECKS`, `DEFINITIONS_VERSION`).
- `POST /mcp` & `GET /mcp/server-card` — Stateless Streamable HTTP MCP server (`2025-11-25` / `2026-07-28`) and MCP App scorecard resource (`ui://slop-detect/scorecard.html`).
- `GET /api/health` — Live readiness probe.

See [**`API.md`**](./API.md) for full request/response schemas, authentication headers, and rate-limit tiers.

---

## Local Development

```bash
# From the repository root:
bun install
bun run build              # Builds @slop-detect/core
bun run web:dev            # Starts wrangler pages dev at http://localhost:8788
```

Local `wrangler pages dev` executes real scans: Wrangler provisions a local Chromium instance for the `BROWSER` binding (downloaded on first scan) and local simulator KV namespaces (`RESULTS`, `RATE_LIMIT`).

Copy `.env.example` from the repo root to `apps/web/.dev.vars` (gitignored) for local secrets. For end-to-end verification and production operations, see [**`../../docs/operations/ README.md`**](../../docs/operations/README.md) and [**`../../docs/operations/REHEARSAL.md`**](../../docs/operations/REHEARSAL.md).

## License

MIT
