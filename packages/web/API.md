# slop-detect Public API

Public REST API for [slop-detect.com](https://slop-detect.com) — scan a URL for
the 16 "AI slop" design patterns, get a remediation prompt, and embed live
badges.

- **Base URL:** `https://slop-detect.com` (also `https://slop-detector-8by.pages.dev`)
- **Auth:** optional API key (see [Authentication](#authentication)). No key = anonymous tier.
- **CORS:** browser calls are restricted to slop-detect.com origins; CLI/server
  callers (no `Origin` header) are allowed.
- **Score semantics:** `score` is **0–100, lower is better** (0 = clean, 100 = maximum slop).

---

## Endpoints

### `POST /api/scan`

Run the detector against a URL inside a headless Chromium and return the score
+ per-pattern breakdown.

**Request body** (`application/json`):

| Field        | Type    | Required | Notes                                                        |
|--------------|---------|----------|--------------------------------------------------------------|
| `url`        | string  | yes      | Target URL. `https://` is prepended if no scheme is present. |
| `preset`     | string  | no       | `full` (default), `strict`, `marketing`, `minimal`.          |
| `axes`       | array \| `"all"` | no | Axes to score: `["design"]` (default), `["design","copy"]`, or `"all"`. |
| `screenshot` | boolean | no       | If `true`, includes a base64 JPEG of the above-fold render.  |
| `share`      | boolean | no       | Default `true`. Set `false` to skip persistence/permalink.   |

**Response** `200` (abridged):

```json
{
  "url": "https://example.com",
  "finalUrl": "https://example.com/",
  "title": "Example",
  "h1": "Welcome",
  "score": 42,
  "tier": "...",
  "patternsFlagged": 5,
  "patterns": [
    { "id": "purple-gradient", "label": "...", "category": "...", "weight": 3, "triggered": true, "evidence": { } }
  ],
  "screenshot": null,
  "navMs": 5231,
  "id": "ab12cd34",
  "resultUrl": "https://slop-detect.com/r/ab12cd34"
}
```

- `score`: **0–100, lower is better.** Top-level fields are always the **design**
  axis (backward-compatible).
- `id` / `resultUrl`: present only when the result was persisted (`share !== false` and KV available).

**Multi-axis** — when `axes` includes `copy`, the response also carries:

```json
{
  "axes": {
    "design": { "score": 8,  "tier": "Clean", "grade": "A-", "patternsFlagged": 2, "patterns": [] },
    "copy":   { "score": 18, "tier": "Mild",  "grade": "B-", "patternsFlagged": 4, "wordCount": 540, "patterns": [] }
  },
  "unifiedScore": 18,
  "unifiedTier": "Mild",
  "unifiedGrade": "B-",
  "axesScored": ["design", "copy"],
  "dirtyAxes": 1
}
```

`unifiedScore` = max axis score + 6 per additional dirty (non-Clean) axis, clamped
to 100. The copy axis flags a `thin: true` when there's too little prose (<40 words)
to judge, and stays Clean rather than guessing.

**Error responses:**

| Status | Body                                            | Meaning                                            |
|--------|-------------------------------------------------|----------------------------------------------------|
| `400`  | `{ "error": "url is required" }` / `Invalid URL`| Bad request body.                                  |
| `422`  | `{ "error": "...", "code": "cloudflare_challenge" \| "access_blocked" \| "empty_page" }` | Target couldn't be scored (bot wall / dead page).  |
| `500`  | `{ "error": "BROWSER binding missing ..." }`    | Server misconfiguration.                           |
| `502`  | `{ "error": "<message>" }`                      | Browser/navigation failure.                        |

Plus the middleware errors: `401 invalid_api_key`, `403 key_disabled`,
`403 turnstile_required`, `429 rate_limited` (see [Error codes](#error-codes)).

---

### `POST /api/fix-prompt`

Build a copy-paste remediation prompt (for an LLM / coding agent) from a scan.

**Request body** (`application/json`) — one of:

| Field    | Type   | Notes                                                       |
|----------|--------|-------------------------------------------------------------|
| `result` | object | A full result object from `/api/scan` (no re-scan).         |
| `url`    | string | A URL to scan first, then build the prompt. (CLI mode.)     |
| `format` | string | `"json"` for a JSON envelope; otherwise returns plain text. |

Also honors `Accept: application/json` to switch to the JSON envelope.

**Response** `200`:

- Default: `text/plain` — the prompt.
- JSON mode: `{ url, score, tier, patternsFlagged, prompt }`.

**Errors:** `400` (missing `result`/`url`), `502` (`Scan failed: ...`), plus the
shared middleware errors.

---

### `GET /r/:id`

Server-rendered shareable permalink for a stored scan result (full HTML, OG/Twitter
meta for link unfurls). Returns `404` HTML if the id is unknown. Public, no key,
not rate-limited (GET).

### `GET /og/:id.png`

1200×630 PNG share card for a stored result. Cached in KV for 30 days; falls back
to the static `/og.png` on error. Public.

### `GET /badge/:domain.svg`

Live, embeddable shields-style SVG badge reflecting the latest stored scan for a
domain. Returns a neutral "no scan" badge if the domain was never scanned. Public,
short-cached. Embed:

```md
[![slop](https://slop-detect.com/badge/example.com.svg)](https://slop-detect.com)
```

---

## Authentication

API keys are **optional**. Without one you get the anonymous tier (and, in a
browser, a Turnstile captcha challenge). A valid key:

- buckets your rate limit **by key** (not by IP — so shared-IP CI runners aren't
  throttled by neighbors),
- raises your per-minute limits per [tier](#tiers),
- counts as proof-of-human, so it **skips Turnstile** regardless of origin.

Supply the key via **either** header (Bearer takes precedence if both present):

```
Authorization: Bearer sk_live_xxx
```
```
X-API-Key: sk_live_xxx
```

---

## Tiers

These are **defaults**. A key record may override `scanPerMin` / `fixPerMin`.

| Tier         | `/api/scan` limit | `/api/fix-prompt` limit | Turnstile | Rate-limit bucket |
|--------------|-------------------|--------------------------|-----------|-------------------|
| **anonymous** (no key) | 6/min (browser) · 3/min (no-origin CLI) | 20/min | Required for browser scans | per IP |
| **free**     | 10/min            | 20/min                   | Skipped   | per key           |
| **pro**      | 60/min            | 120/min                  | Skipped   | per key           |
| **unlimited**| no limit          | no limit                 | Skipped   | per key           |

The anonymous limits are exactly the pre-existing behavior — keys are purely additive.

---

## Rate-limit headers

Successful API responses include:

| Header               | Example     | Meaning                                            |
|----------------------|-------------|----------------------------------------------------|
| `X-RateLimit-Tier`   | `pro`       | The tier applied (`anonymous`, `free`, `pro`, `unlimited`). |
| `X-RateLimit-Limit`  | `60`        | The per-minute limit applied (or `unlimited`).     |

The rate-limit window is a rolling 60 seconds.

---

## Error codes

| HTTP | `error`             | When                                                                 |
|------|---------------------|----------------------------------------------------------------------|
| 401  | `invalid_api_key`   | A key was presented but not found in the keystore (typo / revoked).  |
| 403  | `key_disabled`      | The key exists but is marked `disabled`.                             |
| 403  | `turnstile_required`| Browser scan without a key and the captcha token was missing/invalid.|
| 429  | `rate_limited`      | Per-minute limit exceeded. Body includes `tier`, `limit`, `retryAfter:60`. |

429 body shape:

```json
{
  "error": "rate_limited",
  "message": "Too many requests. Limit is 60/min for your API key for /api/scan (tier: pro).",
  "tier": "pro",
  "limit": 60,
  "retryAfter": 60
}
```

---

## Examples

**Anonymous (CLI, no key)** — gets the harder no-origin scan limit, skips Turnstile:

```bash
curl -s https://slop-detect.com/api/scan \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com"}'
```

**With an API key** — keyed rate bucket, tier limits, no Turnstile:

```bash
curl -s https://slop-detect.com/api/scan \
  -H 'content-type: application/json' \
  -H 'Authorization: Bearer sk_live_xxx' \
  -d '{"url":"https://example.com"}'

# or with the X-API-Key header style:
curl -s https://slop-detect.com/api/scan \
  -H 'content-type: application/json' \
  -H 'X-API-Key: sk_live_xxx' \
  -d '{"url":"https://example.com"}'
```

**Multi-axis (design + copy)** — adds `axes` + `unifiedScore` to the response:

```bash
curl -s https://slop-detect.com/api/scan \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com","axes":["design","copy"]}'
```

**Fix-prompt from a URL (JSON envelope):**

```bash
curl -s https://slop-detect.com/api/fix-prompt \
  -H 'content-type: application/json' \
  -H 'X-API-Key: sk_live_xxx' \
  -d '{"url":"https://example.com","format":"json"}'
```

---

## Minting an API key (operators)

There is no admin UI. Keys are JSON records stored in the **`RATE_LIMIT`** KV
namespace under a `key:<apikey>` prefix. Record shape:

```json
{
  "tier": "free | pro | unlimited",
  "label": "optional human label",
  "scanPerMin": 60,
  "fixPerMin": 120,
  "disabled": false
}
```

`label`, `scanPerMin`, `fixPerMin`, `disabled` are all optional. If
`scanPerMin`/`fixPerMin` are omitted, the tier defaults apply. Choose an
unguessable key string (e.g. `sk_live_` + 32 random chars).

Use Wrangler (v4.x; `wrangler kv key put` is the current subcommand). Run from
`packages/web/`. The `--binding` form resolves the namespace from `wrangler.toml`:

```bash
npx wrangler kv key put --remote --binding=RATE_LIMIT \
  "key:sk_live_xxx" \
  '{"tier":"pro","label":"acme-ci","scanPerMin":60,"fixPerMin":120}'
```

Equivalent using the namespace id directly (from `wrangler.toml`,
`RATE_LIMIT.id = c5aad4cb07e7405e86c3cf1aebcae772`):

```bash
npx wrangler kv key put --remote \
  --namespace-id=c5aad4cb07e7405e86c3cf1aebcae772 \
  "key:sk_live_xxx" \
  '{"tier":"pro","label":"acme-ci","scanPerMin":60,"fixPerMin":120}'
```

> `--remote` targets the production KV (Pages runs against remote KV). Drop it
> only when testing against `--local` storage.

**Disable / revoke a key** — overwrite with `disabled: true` (→ `403 key_disabled`)
or delete it entirely (→ `401 invalid_api_key`):

```bash
# disable
npx wrangler kv key put --remote --binding=RATE_LIMIT \
  "key:sk_live_xxx" '{"tier":"pro","disabled":true}'

# delete
npx wrangler kv key delete --remote --binding=RATE_LIMIT "key:sk_live_xxx"
```

**Inspect a key:**

```bash
npx wrangler kv key get --remote --binding=RATE_LIMIT "key:sk_live_xxx"
```
