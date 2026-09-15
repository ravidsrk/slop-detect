# AuthZ + env matrix (T-09)

Who can call what, what credential each route needs, and what config gates
it. Every row is proven by the cited test file — no eyeball claims. Scope:
rows marked (gate) prove the middleware's allow/deny decision with a
synthetic downstream (the gate is what's under test); all other rows drive
the real handler.

## Route matrix

Credential kinds: **none** (public) · **token** (single-use capability URL)
· **cookie** (HMAC dashboard session) · **Bearer** (shared secret) ·
**key** (optional API key — raises limits, never required) ·
**captcha** (Turnstile, trusted-origin browsers only).

| Route | Method | Credential | Wrong/missing credential | Proven by |
|---|---|---|---|---|
| /api/scan | POST | none¹ | 429/503/403 per gate below | middleware.test.js, scan-contract.test.js |
| /api/aeo | POST | none¹, gated AS scan | same as scan | authz-matrix.test.js (gate) |
| /api/fix-prompt {result} | POST | none, cheap limit | 429 past 20/min | authz-matrix.test.js (gate) |
| /api/fix-prompt {url} | POST | none, gated AS scan | same as scan | authz-matrix.test.js (gate) |
| /api/watch | POST | none, cheap limit | 429; unsubscribe needs matching email | watch.test.js |
| /api/dashboard/link | POST | none, cheap limit | 429; 503 unconfigured; always generic 200 | dashboard.test.js |
| /api/cron/sweep | POST | Bearer [REDACTED] | 401; 503 unconfigured; 500 no INTERNAL_API_KEY | authz-matrix.test.js |
| /api/patterns, /api/stats, /api/sites | GET | none (public) | n/a | authz-matrix.test.js (patterns), api-stats.test.js, sites.test.js |
| /api/watch?domain= | GET | none (public, email stripped) | n/a | watch.test.js |
| /api/watch/confirm?token= | GET | token (single-use, 7d) | login-safe invalid page | alerts.test.js |
| /dashboard | GET | cookie, or ?token= once | login form (200, leaks nothing); 503 unconfigured | dashboard.test.js, authz-matrix.test.js |
| /dashboard?logout=1 | GET | none | clears cookie | dashboard.test.js |
| /r/:id, /og/:id, /badge/:d, /score/:d, /report/:d | GET | none (public) | n/a | og-route, badge, score, report tests |

¹ POST /api/* passes `api/_middleware.ts` first. The gate matrix:

| Gate | Anonymous | With valid API key |
|---|---|---|
| Foreign Origin | 403 origin_not_allowed | passes (key = explicit authorization) |
| No Origin (curl/CLI) | passes, tighter scan limit (3/min vs 6) | n/a (keyed buckets by key) |
| Rate limit | 429 past limit; scan fails closed w/o KV | tier limit (free 10 / pro 60 / unlimited ∞) |
| Turnstile (scan/gated-as-scan, trusted origin) | 403 without token | skipped (key = proof-of-human) |
| Daily cap / SCAN_DISABLED | 503 | unlimited tier bypasses; others 503 |

Invalid key → 401 invalid_api_key; disabled key → 403 key_disabled.
Gated-as-scan: /api/aeo always; /api/fix-prompt iff body has `url` without
`result` (shares the scan rate bucket — an exhausted scan counter 429s it).

Scheduler chain: POST /api/cron/sweep is a cheap middleware route (no-origin
scheduler passes even with no RATE_LIMIT binding); the handler enforces
Bearer [REDACTED] — proven end-to-end in authz-matrix.test.js.

Kill switch (two layers): middleware 503s scan-routed POSTs; `og/[id]`
302-redirects renders to the static fallback when SCAN_DISABLED=1.

## Env / secret matrix (G-23)

`.env.example` is the complete key list; this table is what each key DOES.
Bindings (wrangler.toml) vs Pages env vars are marked. Absent = unset/empty
unless noted.

| Key | Kind | Required for | Absent behavior (verified) |
|---|---|---|---|
| RESULTS | KV binding | all persistence | NOT a uniform 503 — per route: /api/scan 200 but silently skips persistence (no id/permalink, no watch baseline); /og 302 to the static fallback; /api/stats zeros; /r friendly 404; /badge unscored SVG; /score explicit unavailable state; /report renders empty; /api/watch + /api/sites + /api/dashboard/link + /api/cron/sweep 503 (/dashboard renders, empty) |
| RATE_LIMIT | KV binding | rate limits, API keys | scan POSTs fail closed (tight in-memory ceiling); cheap routes open |
| BROWSER | browser binding | /api/scan, OG render | scan 500; OG serves cached/static fallback |
| CRON_SECRET | secret | /api/cron/sweep | 503 sweep_disabled (feature off by default) |
| INTERNAL_API_KEY | secret value | sweep re-scans | sweep 500 misconfigured (even with valid Bearer) |
| SESSION_SECRET | secret | dashboard + link endpoint | both 503 dashboard_unavailable |
| RESEND_API_KEY + ALERT_FROM | secret + var | all email | sends no-op (no_provider); watch/sweep flows still 200 — EXCEPT /api/dashboard/link, which is 503 configured-off without a provider (+ SESSION_SECRET); /dashboard renders but sign-in can't email |
| TURNSTILE_SECRET | secret | browser-scan captcha | no captcha check (rate limits remain the floor) |
| TURNSTILE_SITEKEY | public var | browser widget | **write-only**: nothing reads it server-side and nothing sets `window.__TURNSTILE_SITEKEY`; the widget always uses the hardcoded fallback in public/index.html (same value today). Rotating the var alone silently does nothing — follow-up: inject it or drop the var. |
| SCAN_DAILY_CAP | var | cost guard | default 10000/day |
| SCAN_DISABLED | var | kill switch | unset = scanning on; `1`/`true` = 503/redirect |
| SWEEP_MAX | var | sweep size | default 50, clamped 1–200 |
| ERROR_WEBHOOK | var | error alerts | console-only structured log line |

Secrets never touch disk: Pages env vars in prod, `.dev.vars` (gitignored)
locally. The sweep compares Bearer [REDACTED] constant-time; dashboard
sessions are stateless HMAC (30d, HttpOnly/Secure/SameSite).
