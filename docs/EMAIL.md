# EMAIL.md — mail compliance (CAN-SPAM + RFC 8058 + bounces)

Every monitoring email must carry a physical postal address (CAN-SPAM) and a
working one-click unsubscribe (RFC 8058 / Gmail bulk-sender rules). Bounces
and spam complaints must silence the address. This page is the operator map.

## The four mails

| Mail | Builder (`_alerts.ts`) | Sent from | Footer | One-click |
|---|---|---|---|---|
| Double-opt-in confirmation | `buildVerificationEmail` | `api/watch.ts` | postal + privacy | n/a (transactional, nothing to stop) |
| Regression alert | `buildRegressionAlert` | `api/cron/sweep.ts` | postal + unsub + privacy | yes |
| Design-drift alert | `buildDriftAlert` | `api/cron/sweep.ts` | postal + unsub + privacy | yes |
| Dashboard magic link | `buildDashboardLinkEmail` | `api/dashboard/link.ts` | postal + privacy | n/a (transactional) |

Footer builder: `mailFooter({ postal, unsubUrl })`. Alerts also get
`List-Unsubscribe: <url>` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
headers, forwarded to Resend via the `headers` field in `sendEmail`.

## One-click flow

1. Sweep signs a token per recipient: `signUnsubscribe(domain, email,
   SESSION_SECRET)` — stateless HMAC-SHA256, domain-separated from session
   cookies (`unsub-v1` prefix), binding exactly one (domain, email) pair.
2. `POST /api/watch/unsubscribe?token=…` verifies and runs
   `performUnsubscribe` (delist → drop email index → delete watch — the same
   function the API unsubscribe uses, so the two can't diverge).
3. GET renders a confirm page and **never performs** (prefetchers GET links).
4. A token whose email no longer matches the watch is refused (403), so a
   stale link can't stop the new subscriber's alerts. Replays are harmless
   no-ops (200 "already off").

## Bounce / complaint path (G-46)

`POST /api/email/webhook` ← Resend (Svix-signed). `email.bounced` and
`email.complained` write `sup:<sha256(email)>` (1y TTL); `sendEmail`
checks `isSuppressed` and returns `{ sent: false, reason: 'suppressed' }`.
All other events are acked and ignored. Signature failures log
`email_webhook_bad_sig` (warn) and return 401.

## Operator setup (human)

1. `MAIL_POSTAL_ADDRESS` — the CAN-SPAM street address in every footer.
   Until set, each mail logs `mail_postal_missing` (warn). (H-02)
2. `RESEND_WEBHOOK_SECRET` — from Resend dashboard → Webhooks → Add Endpoint
   `https://slop-detect.com/api/email/webhook`, subscribe to
   `email.bounced` + `email.complained`. Until set, the route is 503 and
   Resend retries. (H-02)
3. `SESSION_SECRET` already covers one-click signing (no new secret).

Verify: `bun run --filter slop-detect-web test test/mail-compliance.test.js`
(sign/verify roundtrip + tamper/wrong-secret/stale-email rejection, Svix
accept/reject/replay-window, suppression gate, header forwarding, footer
content, GET-never-performs, honor-path immediacy).
