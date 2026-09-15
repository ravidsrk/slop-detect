# CAPACITY.md — budgets, timeouts, and what happens at the edge

Every number here is traced to code (file:line in parens) or named as a
platform limit. If a number has no source, it's a bug in this doc.

## Per-request gates (middleware, `api/_middleware.ts`)

| Budget | Value | Source | At the edge |
|---|---|---|---|
| Scan rate | 6/min per IP | `:36` | 429 + `Retry-After` |
| Fix-prompt rate | 20/min per IP | `:37` | 429 |
| AEO cost weight | 3 units/scan vs 1 | `:215` | Counts 3× against scan bucket |
| KV-down fallback ceiling | 3/min (scan) | `:190` | Fail-closed scan cap when KV unreadable |
| Global daily browser budget | `SCAN_DAILY_CAP`, default 10000 | `:551` | 503 `scanning_paused`; resets UTC midnight |
| Kill switch | `SCAN_DISABLED=1` | `:541` | 503 `scanning_paused` for every scan |
| `unlimited` tier (sweep's `INTERNAL_API_KEY`) | skips per-IP limits, kill switch, AND daily cap | `:46`, `:467`, `:540` | Sweep rescans always run |

KV-down daily-cap read also 503s (`:562`) — a KV outage pauses scans
even with a healthy browser (see RB-4 in [RUNBOOKS.md](RUNBOOKS.md)).

## Per-scan time budget (stages sum to ~40s worst case)

| Stage | Budget | Source |
|---|---|---|
| Navigation (`goto`, `domcontentloaded`) | 25s | `api/scan.ts:135` |
| Settle (`networkIdleTimeoutMs`) | 6s | `core/src/runner-wait.ts:11` |
| DESIGN.md fetch (SSRF-guarded, 1 retry, shared deadline) | 8s total | `api/scan.ts:282`, `_ssrf.ts` |
| Browser cold-launch retry | 1 retry, 500ms base + jitter | `_browser.ts`, `_retry.ts` |
| Resend (watch verification only; sweep/link are background) | 3 attempts, ~250/500ms + jitter, one `Idempotency-Key` | `_email.ts`, `_retry.ts` |

Known limitation (follow-up candidate, not fixed in T-26): the Resend
POST has retries but no request timeout — a hung connection holds the
caller until the Workers request wall clock. Cron/`waitUntil` callers
don't care; the in-request watch-verification send does (failure path
only, still bounded by the platform).

## Subrequests per scan (Cloudflare's documented 50/request limit)

Fetch is the only subrequest burner here (KV and Browser Rendering
bindings don't count). Worst case per scan:

- DESIGN.md: ≤6 hops × 2 attempts = 12
- `ERROR_WEBHOOK` POST: 1
- Resend: 0 (never in the scan path)

≈13 worst-case vs the 50 fence — comfortable margin. Retries were
sized for this (see `_retry.ts` header).

## KV writes per scan (single-digit)

A successful scan writes: result snapshot + per-domain pointer
(`saveResult`), timeline/history (`recordScan`), monitoring refresh
(`recordScanForWatch`), one ops blob bump (`bumpOpsStats`), plus
limiter buckets (per-IP + daily counter). All puts carry TTLs — the
full key map is [KV_TTL.md](KV_TTL.md); counter atomicity is
[KV_LIMITS.md](KV_LIMITS.md).

## Caches (stale-while-operating)

| Surface | TTL | Source |
|---|---|---|
| `GET /api/stats` | 120s (`Cache-Control`) | `api/stats.ts:19` |
| Badge SVG | 3h HTTP max-age (NOT KV) | `KV_TTL.md` |
| OG images | 30d KV (`og:<id>`) | `KV_TTL.md` |
| Dashboard sessions | 30d stateless HMAC cookies | `_session.ts:14` |

## Scheduled load

| Workflow | Schedule | Cost per run |
|---|---|---|
| `health-ping.yml` | every 30 min | 1 readiness probe; fails the run when down |
| `smoke-live-canary.yml` | daily 06:00 UTC, non-gating | 1 CLI scan of news.ycombinator.com |
| `monitor-sweep.yml` | daily 08:17 UTC (+ dispatch) | ≤`SWEEP_MAX` full rescans (default 50, clamp 200), outside the daily cap |
| `leaderboard.yml` | monthly 1st 06:00 UTC | static rebuild (`leaderboard/build.mjs`) |
| `calibrate.yml` | monthly 1st 07:00 UTC | calibration |

## Platform ceilings we don't control (no numbers asserted)

Browser Rendering concurrent sessions and KV throughput are
account/plan-bounded — this doc asserts no figures. Watch for
session-limit launch errors in `scan_failed` messages (after the 1
launch retry) as the signal we're near the browser ceiling.
