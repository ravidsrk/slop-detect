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
# Click confirm in the inbox (this mail already proves Resend end-to-end),
# then scan once to set the baseline:
curl -s -X POST $BASE/api/scan -H 'content-type: application/json' \
  -d '{"url":"https://<test-domain>"}'                       # → 200, baseline set
# CONTROLLED REGRESSION: drop the staging baseline below the live score so
# the next sweep has a genuine regression to report (staging KV only —
# never production). Find the preview namespace id first:
#   wrangler kv namespace list   (preview_id of the preview deploy)
NS=<staging-preview-namespace-id>
wrangler kv:key get "w:<test-domain>" --namespace-id=$NS > /tmp/watch.json
jq '.baselineScore = 1 | .baselineTier = "Clean"' /tmp/watch.json > /tmp/watch-low.json
wrangler kv:key put "w:<test-domain>" --namespace-id=$NS --path=/tmp/watch-low.json
curl -s -X POST $BASE/api/cron/sweep \
  -H "authorization: Bearer $STAGING_CRON"                    # → alerted:1, ONE mail
curl -s -X POST $BASE/api/cron/sweep \
  -H "authorization: Bearer $STAGING_CRON"                    # → alerted:0 (once only)
# Then unsubscribe the test domain and delete /tmp/watch*.json.
```
If staging KV is unreachable from your shell, skip the surgery: the sweep
still proves scheduler auth + re-scan + listing, the confirm mail proves
delivery, and the regression-decision leg stays covered by Level 0.

This is the H-02 verify procedure: watch-register → forced sweep →
single alert observed, no spam. DNS/SPF/DKIM (H-03) gates real delivery.
