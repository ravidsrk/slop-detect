# slop-detect Public API

Public REST API for [slop-detect.com](https://slop-detect.com) — scan a URL for
AI-design-slop patterns (live catalogue: [`/api/patterns`](/api/patterns)), get a
remediation prompt, and embed live badges.

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
| `designMd`   | boolean \| string | no | **System axis** — check the page against its declared design system ([DESIGN.md spec](https://github.com/google-labs-code/design.md)). `true` looks for `<origin>/DESIGN.md`; a URL fetches that file (SSRF-guarded). Adds a `system` block to the response. |
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

**System axis** — when `designMd` is set, the response carries a separate
`system` block (it measures alignment with the site's *own* declared system,
so **higher is better** and it is *not* folded into the slop score):

```json
{
  "system": {
    "axis": "system", "declared": true, "name": "Heritage",
    "score": 65, "tier": "Drifting",
    "checksEvaluated": 5, "checksSkipped": 0,
    "drift": [
      { "id": "fonts.declared", "message": "font(s) in use but not in the system: inter" },
      { "id": "colors.cta", "message": "2/6 CTA color(s) not in the palette" }
    ],
    "checks": [],
    "source": "https://example.com/DESIGN.md"
  }
}
```

Tiers: `Aligned` (≥80) · `Drifting` (≥50) · `Off-system` (<50) · `No system`
(no parseable DESIGN.md tokens) · `No data` (nothing observable to check).
Missing data is always *skipped*, never reported as drift.

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

## Monitored domains

The continuity layer: scanning is free and stateless, but `POST /api/scan`
already persists each result, so we can **remember a domain** and flag when it
**regresses** to slop between scans (the score gets ≥8 points worse, or the tier
drops a band: Clean → Mild → Heavy). This is the paid layer in spirit — detection
stays free forever; see [pricing.md](public/pricing.md) and
[VALIDATION.md](../../VALIDATION.md).

### `POST /api/watch`

Start (or stop) monitoring a domain. Goes through the shared middleware, but is
gated on the **cheap** (non-scan) rate limit and **does not require Turnstile**,
so a signup form works without a captcha.

**Subscribe** — body `{ "domain": "example.com", "email": "dev@startup.io" }`:

| Field         | Type    | Required | Notes                                                        |
|---------------|---------|----------|--------------------------------------------------------------|
| `domain`      | string  | yes      | Bare domain. A scheme/`www.`/path is stripped; must be a real hostname. |
| `email`       | string  | yes      | Where regression alerts will go (validation phase: captured, not yet sent). |
| `list`        | boolean | no       | `true` lists the domain in the public [directory](#public-directory) (dofollow backlink); `false` delists it; omit to keep the current state. |
| `system`      | boolean | no       | `true` enables **design-system monitoring**: the daily sweep also checks the domain against its `<origin>/DESIGN.md` and emails on drift (Aligned → Drifting/Off-system, or a ≥15-point compliance drop). Omit to preserve; `false` disables. |
| `unsubscribe` | boolean | no       | If `true`, stops monitoring **and** delists (requires the matching `email`). |

The response echoes `listed` (+ `directoryUrl` when listed), `systemMonitoring`,
and — once the sweep has a reading — a `system` block (`score`, `tier`,
`baseline`, `drifted`, named `drift` items). History points gain a compact
`system` entry alongside the slop score. Drift alerts follow the same
once-per-event / recovery-re-arms rule as slop-regression alerts, and only ever
go to a verified (double-opt-in) address.

**Response** `201` (new) / `200` (already monitored):

```json
{
  "domain": "example.com",
  "monitoring": true,
  "plan": "trial",
  "baseline": { "score": 6, "grade": "A", "tier": "Clean", "id": "r0", "at": "..." },
  "last": { "score": 6, "grade": "A", "tier": "Clean", "id": "r0", "at": "..." },
  "regressed": false,
  "history": [],
  "alreadyMonitored": false,
  "note": "Monitoring active — we recorded the current score as your baseline."
}
```

The baseline is seeded from the domain's most recent scan if one exists;
otherwise it's set on the next scan. **Subscribe is idempotent** — re-posting
preserves an established baseline and updates the email.

**Errors:** `400` (invalid `domain`/`email`), `403` (`unsubscribe` email doesn't
match the subscriber), `503` (monitoring storage unavailable).

### `GET /api/watch?domain=<domain>`

Public monitoring status + score history for a domain. **Never returns the
subscriber's email.** Returns `{ "domain": "...", "monitoring": false }` if the
domain isn't watched. Public, no key (GET — not rate-limited by the middleware).

```json
{
  "domain": "example.com", "monitoring": true, "plan": "trial",
  "baseline": { "score": 6, "grade": "A", "tier": "Clean" },
  "last": { "score": 30, "grade": "C", "tier": "Heavy" },
  "regressed": true,
  "history": [ { "score": 6, "grade": "A", "tier": "Clean", "at": "..." } ]
}
```

When a watched domain is scanned, the scan response also carries a compact
`monitoring` block (`{ watched, regressed, baseline, delta }`) so a dashboard can
react in-line.

### `GET /api/watch/confirm?token=…`

Double-opt-in confirmation. The link in the verification email carries a
single-use token; visiting it sets the watch to `verified: true` (the only state
in which alert emails are sent) and returns a small HTML page. Tokens expire
after 7 days. `410` if unknown/expired.

### `POST /api/cron/sweep`

Internal: re-scans verified watches and emails owners on a **new** regression
(once per regression; a recovery re-arms it). Requires
`Authorization: Bearer <CRON_SECRET>`; `503` if `CRON_SECRET` isn't set. Meant to
be hit by a scheduler (the bundled `monitor-sweep` GitHub Action), not users.
Returns a summary `{ considered, scanned, alerted, skippedUnverified, errors }`.

> **Alerts are off until configured.** With no `RESEND_API_KEY`/`ALERT_FROM` the
> sender no-ops (logs only), so subscribing still works and simply doesn't email.
> Once a provider + `CRON_SECRET` + an `unlimited`-tier `INTERNAL_API_KEY` are
> set, the verify → sweep → alert pipeline runs end to end. The subscribe
> response reflects this via `alertsActive` / `verified` / `verificationSent`.

---

## Public directory

An **opt-in** catalogue of scanned sites. A domain appears **only** when its
owner lists it via `POST /api/watch { list: true }` — never from an anonymous
scan — so we never publish a verdict on a company that didn't ask to be there.
Listed sites get a real (dofollow) backlink from the directory page; that
backlink is the incentive that pulls owners into the claim + monitor funnel.
A listed domain's entry auto-refreshes whenever it's re-scanned.

### `GET /directory`

Server-rendered, crawlable HTML page listing every opt-in site (grade · score ·
tier · dofollow link out · link to its scan). `?sort=slop` ranks sloppiest-first
(default: cleanest-first). Emits `ItemList` JSON-LD and is in the sitemap. Public.

### `POST /api/dashboard/link`

Request a **magic sign-in link** for the agency dashboard. Body
`{ "email": "you@company.com" }`. The response is identical whether or not the
address monitors anything (anti-enumeration); a single-use, 15-minute link is
only actually emailed when it does. `503 dashboard_unavailable` until the email
provider **and** `SESSION_SECRET` are configured (safe-off, like alerts).

### `GET /dashboard`

One view across every domain monitored by the signed-in email: slop grade,
design-system tier, drift/regression flags, verification state, and a link to
each domain's client report. Auth = the magic link (`?token=` exchanges the
single-use token for a 30-day HMAC-signed HttpOnly cookie; `?logout=1` clears
it). Shows only the owner's own domains and email — never anyone else's.
`noindex`.

### `GET /report/:domain`

A **print-friendly client report** for a domain (the agency deliverable): latest
slop grade/score, design-system compliance (when monitored), named drift items,
triggered patterns, and score history — with an `@media print` stylesheet so
"print / save PDF" produces a clean hand-off document without server-side PDF
infrastructure. Public data only (never the subscriber's email); `noindex`;
honest empty state for unscanned domains.

### `GET /api/sites`

JSON view of the same directory, **globally sorted** so it matches `/directory`
exactly (the whole catalogue is enumerated and ordered before slicing).

| Query   | Notes                                                |
|---------|------------------------------------------------------|
| `sort`  | `clean` (default) or `slop`.                         |
| `limit` | Cap rows returned after sorting (1–1000, default 500). |

**Response** `200`:

```json
{
  "count": 2,
  "returned": 2,
  "sort": "clean",
  "sites": [
    { "domain": "example.com", "url": "https://example.com", "score": 8, "grade": "A-", "tier": "Clean", "id": "ab12cd34", "title": "Example", "listedAt": "..." }
  ]
}
```

`count` is the full directory size; `returned` is how many rows this response
carries (after `limit`). `score`/`grade`/`tier` are `null` for a domain that was
listed but not yet scored (filled in on its next scan). Public, no key,
short-cached.

> **Ownership:** once a domain is claimed (first `POST /api/watch`), only the
> same `email` may modify it — change the alert address, list/delist, or
> re-baseline. A different email gets `403`. (A brand-new domain can be claimed
> by anyone with an email; verified ownership via a DNS TXT / meta tag is a
> documented follow-up.)

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
`apps/web/`. The `--binding` form resolves the namespace from `wrangler.toml`:

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
