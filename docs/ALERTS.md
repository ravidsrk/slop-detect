# ALERTS.md — error alerting + on-call runbook

One alert path, proven to fire (T-25): `report()` in
`apps/web/functions/_report.ts` writes a structured console line (picked up
by `wrangler tail` / Logpush) and — when `ERROR_WEBHOOK` is set — POSTs a
Slack-compatible `{ text }` envelope via `waitUntil`, so the alert survives
the response in the Workers runtime. Only `error` and `warn` levels POST;
`info` is log-only.

## Wiring (one dashboard step)

Set `ERROR_WEBHOOK` on the Pages project to a Slack/Discord incoming-webhook
URL (or any endpoint that accepts a JSON `{ text }` POST). The production
value is tracked as **H-07** in `docs/completion/HUMAN_ACTIONS.md` — the
code side is proven; only the secret value needs a human.

Envelope shape (asserted byte-for-byte by the E2E test):

```json
{ "text": "slop-detect error: scan_failed {\"url\":\"…\",\"requestId\":\"…\"}" }
```

## Events (what fires, what to do)

| Event | Level | Source | Meaning | First response |
|---|---|---|---|---|
| `scan_failed` | error | `api/scan.ts` | Browser/scan threw; caller got a 502 + `requestId` | `wrangler tail` the `requestId`; if every scan fails, check Browser Rendering binding / `SCAN_DISABLED` via `/api/health` |
| `handler_threw` | error | `api/_middleware.ts` | Uncaught throw in another handler; traced 500 | Same `requestId` in the 500 body; fix forward, the route is in the line |
| `health_kv_probe_failed` | error | `api/health.ts` | Readiness probe couldn't read a KV namespace | Check the named binding in the Pages dashboard; `/api/health` will be 503 meanwhile |
| `persist_failed` | warn | `api/scan.ts` | Scan succeeded but the KV share/monitoring write failed | Storage outage, not a scan outage; check KV, results still returned to callers |
| `pattern_errors` | warn | `api/scan.ts` | Scan completed with `patternsErrored > 0` | Degraded fidelity, not downtime; check which patterns errored |
| `email_send_failed` / `email_send_error` | error | `_email.ts` | Resend send failed | Check Resend key/domain; **known gap:** these two are detached promises (no `waitUntil` at the call site), so delivery is best-effort — the console line is the reliable record |
| `email_skipped_no_provider`, `monitor_sweep` | info | `_email.ts`, `cron/sweep.ts` | Routine; log-only, never POSTs | None unless volume spikes |
| `email_retry` | info | `_email.ts` | Resend attempt failed, backing off (attempt/delay/status) | None — only the final outcome pages; a burst means Resend is flaky |
| `email_suppressed`, `email_suppressed_skip` | info | `api/email/webhook.ts`, `_email.ts` | Recipient suppressed after bounce/complaint; later sends skipped | None — working as designed; a burst of suppressions means a bad import or blocklist |
| `email_webhook_bad_sig` | warn | `api/email/webhook.ts` | Webhook POST failed Svix verification (forgery, clock skew, wrong secret) | If persistent, check `RESEND_WEBHOOK_SECRET`; occasional hits are scanners |
| `mail_postal_missing` | warn | `cron/sweep.ts`, `api/watch.ts`, `api/dashboard/link.ts` | Sweep SKIPS the alert (fail-closed, `not_configured`, notified stays false); transactional mails send with a degraded footer | Set `MAIL_POSTAL_ADDRESS` (H-02); every sweep skip self-heals on the next configured run |
| `email_suppression_error` | error | `_email.ts` | Suppression lookup threw (KV blip); mail skipped fail-closed (`suppression_unknown`), never sent blind | Transient KV; if persistent, check the RESULTS binding. Sweep alerts self-heal (notified only sets on sent:true, next run retries); verification + dashboard-link sends need the user to re-request (both routes stay 200, so retry is just another POST) |

Severity rule: `error` = a request failed or a dependency is down (page
someone); `warn` = degraded but serving (ticket, next business day).

## Proof it fires

- `apps/web/test/report-e2e.test.js` — induces a real scan failure through
  `onRequestPost` and asserts the POST bytes a live stub webhook receives,
  including the `requestId` and the requirement that the POST rides
  `waitUntil` (a detached POST can die with the response).
- `apps/web/test/scan-failure-alert.test.js` — locks the `scan_failed` line
  contract (`url`, `message`, `navMs`, `patternsErrored`, `requestId`).
- Negative control: dropping the `scan_failed` `waitUntil` makes the E2E
  test fail (`pending` drops 2 → 1); restoring it goes green. Evidence:
  `docs/completion/evidence/T-25-alert.txt`.

To trigger a test alert against a deployed preview: set `ERROR_WEBHOOK` to a
request-catcher URL on the preview, then POST a target that passes SSRF
validation but fails navigation — e.g. `https://example.com:81/` (public
host, closed port: `goto` throws connection-refused, or times out past the
25s navigation budget — either way `scan_failed` fires). Private/loopback
IPs will NOT work as triggers: `_ssrf.ts` rejects them with 400 before the
browser is ever reached. The deterministic trigger remains the E2E test
above (no deployment needed).
