# slop-detect-web

> Cloudflare Pages app powering [slop-detect.com](https://slop-detect.com).

Static HTML + two Pages Functions:

- `POST /api/scan` — scans a URL using Cloudflare Browser Rendering, returns score + per-pattern evidence
- `POST /api/fix-prompt` — assembles a markdown prompt for AI agents based on triggered patterns

## Local dev

```bash
# From the repo root:
bun install
bun run build              # required before first run (builds @slop-detect/core)
bun run web:dev            # http://localhost:8788 (add -- --port <n> if busy)

# Or from this package:
cd apps/web
bunx wrangler pages dev public
```

Local `wrangler pages dev` scans for real: wrangler provisions a local
Chromium for the `BROWSER` binding (first scan downloads it), with
simulator KV namespaces. Production and previews use Cloudflare's edge
Browser Rendering instead; verdicts match (verified parity on reference
URLs — see `docs/REHEARSAL.md`).

Local env: copy the root `.env.example` to `apps/web/.dev.vars` (gitignored) and fill in values. Production values live as Cloudflare Pages env vars / secrets, never in the repo.

## Deploy

```bash
bun run web:deploy
```

Requires a Cloudflare account with **Workers Paid** enabled (Browser Rendering is gated on the paid tier in 2026).

## Required Cloudflare bindings

```toml
# wrangler.toml
[browser]
binding = "BROWSER"
```

That's the only binding. The scan handler accesses it as `env.BROWSER`.

## API

### POST /api/scan

```bash
curl -X POST -H 'Content-Type: application/json' \
  https://slop-detect.com/api/scan \
  -d '{"url":"https://example.com"}'
```

Returns:

```json
{
  "url": "https://example.com",
  "score": 24,
  "tier": "Mild",
  "patternsFlagged": 5,
  "patternsTotal": 27,
  "patterns": [ /* per-pattern { id, label, weight, triggered, evidence } */ ],
  "screenshot": "<base64 viewport PNG>",
  "navMs": 4231
}
```

### POST /api/fix-prompt

```bash
# Mode 1: pass an existing scan result (no second browser call):
curl -X POST -H 'Content-Type: application/json' \
  https://slop-detect.com/api/fix-prompt \
  -d "{\"result\": $(cat scan.json) }"

# Mode 2: pass a URL — server scans then assembles:
curl -X POST -H 'Content-Type: application/json' \
  https://slop-detect.com/api/fix-prompt \
  -d '{"url":"https://example.com"}'

# Add ?format=json or `accept: application/json` for structured output.
```

## License

MIT
