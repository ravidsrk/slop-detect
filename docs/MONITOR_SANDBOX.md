# CF-04 monitor sandbox (T-15)

How to run the watch → confirm → sweep → alert flow without production
secrets. Three levels, from hermetic to staging. What each level CANNOT
prove is stated — a sandbox that pretends to prove more is a liar.

## Level 0 — vitest E2E (no secrets, runs in CI)

`test/monitor-flow.test.js` drives the real handlers (subscribe, confirm,
sweep) with only the network faked: Resend delivery is captured, and the
sweep's internal POST /api/scan is stubbed to replay the scan path's
`recordScanForWatch` side effect with scripted scores.

```bash
cd apps/web && bunx vitest run test/monitor-flow.test.js
```

Proves: subscribe 201 + token issue, confirm flips verified, baseline
seeding, regression → exactly-once alert with baseline-vs-now, recovery
re-arms, re-regression re-alerts, and the fail-closed matrix (no
provider → honest 201/200 with zero mails; no storage → 503s).
Cannot prove: real Resend delivery, real browser re-scans, DNS/SPF/DKIM.

## Level 1 — local pages dev (test values, mails held)

```bash
cp .env.example apps/web/.dev.vars   # gitignored; fill TEST values only
# .dev.vars: CRON_SECRET=test-local-cron  (leave RESEND_* empty: mails no-op)
cd apps/web && bun run dev            # wrangler pages dev → localhost:8788
```

```bash
# Subscribe (201; verificationSent:false — honest, no provider configured).
curl -s -X POST localhost:8788/api/watch \
  -H 'content-type: application/json' \
  -d '{"domain":"sandbox.test","email":"owner@sandbox.test"}'
# Watch state is publicly readable (email never leaks).
curl -s 'localhost:8788/api/watch?domain=sandbox.test'
# Sweep exercises auth + listing (live-verified: 200 + skippedUnverified;
# wrong secret → handler 401). Verified watches' re-scans 500 WITHOUT a
# BROWSER binding (local pages dev has no Browser Rendering) and land in
# summary.errors per the scanDomain throw path. No crash, no mail.
curl -s -X POST localhost:8788/api/cron/sweep \
  -H 'authorization: Bearer test-local-cron'
```

Cannot prove: confirm-link delivery (no mailer — the token only exists in
local KV), real re-scans, alert rendering. Those are Level 0 (logic) and
Level 2 (delivery).

## Level 2 — preview deployment (H-02 staging secrets, one test domain)

Needs: a Pages preview deploy + H-02 staging values (CRON_SECRET,
INTERNAL_API_KEY unlimited-tier, SESSION_SECRET, Resend TEST key or a
verified test sender). Exactly one test domain; delete the watch after.

```bash
BASE=https://<preview>.pages.dev
curl -s -X POST $BASE/api/watch -H 'content-type: application/json' \
  -d '{"domain":"<test-domain>","email":"<owner>"}'          # → 201, mail out
# Click confirm in the inbox (or fetch the token from staging KV), then:
curl -s -X POST $BASE/api/cron/sweep \
  -H "authorization: Bearer $STAGING_CRON"                    # → alerted per state
# Expect: first sweep after a regressing scan delivers ONE alert; a repeat
# sweep delivers none. Then unsubscribe the test domain.
```

This is the H-02 verify procedure: watch-register → forced sweep →
single alert observed, no spam. DNS/SPF/DKIM (H-03) gates real delivery.
