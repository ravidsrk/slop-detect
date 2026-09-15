# KV counters: atomicity + limits vs usage (T-11)

G-27 (counter atomicity) and G-28 (limits vs usage). Companions: KV_TTL.md
(every key + TTL), AUTHZ_MATRIX.md (who can tick which counter).

## Counter inventory

Every limiter is KV get→put (not atomic) with an in-isolate mem cap, so a
burst inside one isolate cannot overshoot; the KV key is the eventually
consistent cross-isolate backstop. Misconfigured/absent bindings fail per
the last column.

| Key | Gate fn | Isolate cap | Cross-isolate residual | Missing KV |
|---|---|---|---|---|
| `rl:<route>:<bucket>` (scan) | middleware checkRateLimit | memIncrement, hard | stale-read overshoot across isolates | fail closed (ceiling 3) |
| `rl:<route>:<bucket>` (cheap) | middleware checkRateLimit | none (no browser cost) | same, cheaper blast radius | fail open |
| `rl:global:scan:<day>` | middleware cost guard | memIncrement (daily) | slight cap overshoot | 503 (fail closed) |
| `rl:dashlink:<hash>` | dashLinkAllowed (T-11) | dashMem, hard | extra link sends per race window | fail open (endpoint still IP-limited) |
| `rl:watchverify:<hash>` | watchVerifyAllowed (T-11) | wvMem, hard | extra confirm mails per race window | fail closed (don't mail) |
| `rl:ogrender:<ip>` | ogRenderAllowed | ogMem, hard | extra Chromium launches/race (#109) | isolate cap only |

Proven: COST-1 (scan burst), the T-11 dashlink/watchverify burst tests
(10 parallel vs slow KV → exactly 3; the watchverify test fails 10-vs-3
on the pre-T-11 code), the dashlink budget-leak test (KV denies return
their isolate unit).

What stays racy (accepted, not fixed — fix needs a Durable Object or the
Rate Limiting API, parked on #109 `needs-human`):

- Cross-isolate counter overshoot on every row above. Blast radius: a few
  extra emails/renders/scans per race window — cost-bounded, not
  correctness-breaking.
- Single-use tokens (`wv:`, `dt:`): get-then-delete races double-confirm.
  Benign by design — re-confirm is idempotent, a raced dashboard token
  mints a second session for the SAME owner email.
- Global aggregates (`stats:dist`, `stats:catclean`, `gs:` markers):
  read-modify-write loses/duplicates counts under concurrency. Fine for
  percentiles; re-scans can't skew them (one contribution per domain).

## Platform limits vs our usage (G-28)

Platform numbers: Cloudflare KV Limits doc (fetched 2026-09-15). Binding
constraints on the free tier: **1,000 writes/day**, 100,000 reads/day,
1 write/sec to the same key, 1 GB storage. Paid: unlimited reads/writes.

Per-flow KV ops, counted from the code (scan exact; others ≈):

| Flow | Writes | Reads | Notes |
|---|---|---|---|
| POST /api/scan, first scan of domain | 8 | 7 | rl + global cap + r: + d: + gs: + h: + dist + catclean (+1W watched) |
| POST /api/scan, re-scan | 5 | 5 | no gs:/dist/catclean bumps (+1W watched) |
| POST /api/watch subscribe | 5 | 4 | rl + w: + e: + wv: + rl:wv |
| POST /api/dashboard/link (send) | 3 | 3 | rl + dt: + rl:dashlink |
| Sweep, per domain | ≈ re-scan + 1 | ≈ re-scan + 2 | internal scan dominates; +watch get/put, list amortized |
| GET /og/:id uncached render | 2 | 4 | rl:ogrender + og: (+ BROWSER session) |
| Confirm / dashboard token burn | 0 (+1 delete) | 1 | get-then-delete |

Headroom on the free tier: writes bind first. 1,000 writes/day ≈ **125
first-scans/day or ~200 re-scans/day** — far below SCAN_DAILY_CAP=10000
(the cap guards browser spend, not KV quota) and far below the 100k
reads/day. Past validation scale this project needs the paid Workers
plan; watch the KV dashboard, not just the scan cap.

Hot keys (1 write/sec same-key limit): `rl:global:scan:<day>`,
`stats:dist`, `stats:catclean`. A sustained burst above 1 scan/sec drops
increments (last-write-wins): stats stay approximate (fine), the daily
cap can undercount by the race window (slight cost-guard overshoot).
Exactness needs the same DO decision as #109.

Storage: per-scan snapshot + history ≈ single-digit KB × 90d TTL;
`og:` PNGs ≈ hundreds of KB × 30d. 10k scans ≈ tens of MB — 1 GB is not
the binding constraint; TTLs (KV_TTL.md) bound growth.
