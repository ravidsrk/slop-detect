# @slop-detect/web

> Cloudflare Pages app powering [slop-detect.com](https://slop-detect.com).

Static HTML + two Pages Functions:

- `POST /api/scan` — scans a URL using Cloudflare Browser Rendering, returns score + per-pattern evidence
- `POST /api/fix-prompt` — assembles a markdown prompt for AI agents based on triggered patterns

## Local dev

```bash
# From the repo root:
npm install
npm run web:dev          # http://localhost:8788

# Or from this package:
cd packages/web
npx wrangler pages dev public
```

Note: Browser Rendering only runs on Cloudflare's edge — local `wrangler pages dev` won't be able to actually scan URLs. Deploy to a preview environment to test the scanner.

## Deploy

```bash
npm run web:deploy
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
  "patternsTotal": 16,
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
