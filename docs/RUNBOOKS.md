# RUNBOOKS.md — top-5 incident runbooks + incident 3-liner

Symptom-driven: find what you see, do the numbered steps. Event-level
detail (what each `report()` line means) lives in [ALERTS.md](ALERTS.md);
storage recovery in [RECOVERY.md](RECOVERY.md); budgets in
[CAPACITY.md](CAPACITY.md). Rollback procedure + rehearsal is T-27
(G-12) — until it lands, "roll back" below means "redeploy the previous
good Pages deployment from the dashboard" with no rehearsed script.

## Where to look first (every incident)

1. `GET /api/health` — 200/503 readiness: browser binding, KV probes,
   kill switch. Tells you which system is down in one call.
2. `GET /api/stats` (120s cache) → `ops` — per-route req/byStatus for
   today + yesterday. Tells you when it started and how wide it is.
3. `wrangler tail` filtered by event (`scan_failed`, `handler_threw`,
   …) — the structured lines carry `requestId`s that match the error
   bodies callers saw.

## Incident 3-liner (paste in the incident channel, update every 30 min)

```
STATUS: <investigating|mitigating|monitoring|resolved> — <one line>
IMPACT: <who can't do what, since when, e.g. "POST /api/scan 502s since 14:20 UTC; /api/health browser=missing">
NEXT: <next step + owner + next update time>
```

Severity follows [ALERTS.md](ALERTS.md): `error` = request failed or a
dependency is down (page someone); `warn` = degraded but serving
(ticket, next business day).

## RB-1 — All scans failing (5xx on POST /api/scan)

Distinguish by shape — each cause has a different signature:

| Symptom | Cause | Fix |
|---|---|---|
| 503 `scanning_paused`, health `scans.paused=true` | `SCAN_DISABLED` kill switch on | Intended pause? If not, unset it in Pages env |
| 503 `scanning_paused`, health `scans.paused=false` | KV down: daily-cap read failed (fail-closed, `_middleware.ts`) | RB-4 |
| 500, no `scan_failed` line | `BROWSER` binding missing | Check Pages Functions bindings |
| 502 + `scan_failed` lines, every scan | Browser Rendering down or bad deploy | `wrangler tail` the message; if it started at a deploy, roll back (T-27 procedure pending — dashboard redeploy meanwhile) |
| 429s | Legit overload or abuse | Check `ops.byStatus`; daily cap (`SCAN_DAILY_CAP`, default 10000) resets at UTC midnight; per-IP 6/min |

Sweep rescans bypass all of this (`unlimited` tier skips limits,
kill switch, and daily cap) — if user scans fail but the sweep
succeeds, the browser is fine and the gate is the cause.

## RB-2 — Scans degraded (slow, timeouts, partial results)

1. `ops` nav-latency buckets (`lt1s…ge15s`) — confirms slowness and when.
2. `pattern_errors` (warn) with `patternsErrored > 0` — which scan stage
   is erroring; page still returns, fidelity reduced.
3. Timeouts to compare against: navigation 25s (`domcontentloaded`),
   settle 6s (`networkIdleTimeoutMs`), DESIGN.md 8s total with 1 retry.
   A scan slower than ~40s is a target problem, not ours, unless every
   target is slow — then suspect Browser Rendering session limits
   (launch errors in `scan_failed` messages after the 1 launch retry).
4. Fix-forward; no kill switch needed. If Browser Rendering is the
   cause, there is no failover — page the provider status, post the
   3-liner, wait.

## RB-3 — Alerts silent (no webhook posts, no mail)

1. Webhook: is `ERROR_WEBHOOK` set on the Pages project? (Value = H-07.)
   Only `error`/`warn` POST; `info` never does. Check the receiver's
   own logs. Proved-working trigger: `POST /api/scan` with
   `https://example.com:81/` (see [ALERTS.md](ALERTS.md)).
2. Mail: `email_send_failed` (status in line) vs `email_send_error`
   (exception). 4xx = Resend rejecting (key/domain — H-02/H-03);
   `email_retry` bursts = Resend flaky, retries handling it.
3. Sweep: `POST /api/cron/sweep` returns 503 `sweep_disabled` when
   `CRON_SECRET` is unset, 401 on wrong secret. The
   `monitor-sweep.yml` workflow skips with a notice when the repo
   secret is missing — alerts can't fire if the sweep never runs.
4. Known gap (no fix yet): `_email.ts` reports are detached promises
   (no `waitUntil`), so a missing mail alert may have no log line —
   check Resend's dashboard as the source of truth for sends.

## RB-4 — Storage down (`persist_failed`, health 503 on KV)

1. `/api/health` names the failing namespace (`RATE_LIMIT`/`RESULTS`).
   Check provider status; most KV blips self-heal in minutes.
2. Blast radius while down (fail-closed/open per [KV_LIMITS.md](KV_LIMITS.md)):
   scans 503 (`scanning_paused` — daily-cap read is fail-closed);
   rate limiting falls back to per-isolate ceilings (scan: 3/min);
   share/monitoring writes fail (`persist_failed`, warn — scans still
   return); watch verify/dashboard links fail closed (no mail sent).
3. If data was LOST (not just unreachable): [RECOVERY.md](RECOVERY.md)
   + [KV_BACKUP.md](KV_BACKUP.md). Counters rebuild from traffic;
   `key:*` API records are operator-minted and must be restored.
4. Honesty note: no verified backup exists yet (T-08 pending H-01) —
   until the first backup + verify run, "restore" is aspirational.

## RB-5 — Watch/cron broken (no regression alerts, sweep failing)

1. `monitor-sweep.yml` runs daily 08:17 UTC (+ manual dispatch). Check
   recent runs first — red run = scheduler/auth, green run + no mail =
   downstream (RB-3 step 2).
2. Auth: 401 = repo secret `CRON_SECRET` ≠ Pages env var (they must
   match); 503 = Pages var unset (sweep disabled by design).
3. Volume: `SWEEP_MAX` (default 50, clamped 1–200) bounds rescans per
   run; each rescan is a full browser scan on the `unlimited` tier.
4. Semantics: alerts fire once per event (`regressed && !notified`,
   recovery re-arms); `notified` persists only after `sendEmail`
   reports `sent` — a Resend outage means re-alert next run, by design.
