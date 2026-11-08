# EMAIL_AUTH.md — sending-domain authentication procedure (T-37, G-43)

Alert mail must authenticate (SPF + DKIM + DMARC) or providers bulk it and
Resend flags the account. DNS + the Resend dashboard are owner-side (H-03);
this page is the procedure, and `scripts/email-auth-check.ts` is the
post-verify gate the owner re-runs until green.

## Procedure (owner, ~15 min + DNS propagation)

1. Resend dashboard → Domains → Add `slop-detect.com` (apex; the From is
   `Slop Detect <alerts@slop-detect.com>`).
2. Publish the three TXT records Resend shows (values are tenant-specific —
   copy them from the dashboard, not from memory):
   - `slop-detect.com` TXT `v=spf1 …` (must keep an `include:` covering Resend)
   - `resend._domainkey.slop-detect.com` TXT `v=DKIM1; …` (the public key)
   - `_dmarc.slop-detect.com` TXT `v=DMARC1; p=quarantine; …` (start at
     `quarantine`; move to `reject` after a week of clean reports)
3. In Resend, click Verify on each record. Then set the Pages env:
   `ALERT_FROM="Slop Detect <alerts@slop-detect.com>"` (+ the H-02 mail vars).
4. Run the gate: `bun scripts/email-auth-check.ts` → all three PASS.
5. Send one real alert (register a watch, force a regression sweep) and
   confirm arrival + headers show `dkim=pass`, `spf=pass`, `dmarc=pass`.

## The gate (what PASS means)

`checkEmailAuth` (`apps/web/functions/_emailauth.ts`, tested in
`test/email-auth.test.js` with a stub resolver):

- **spf**: a `v=spf1` record with `include:amazonses.com` exists (Resend
  sends via SES — see the Resend domain-setup docs). Any other include or
  a bare `-all` FAILS on purpose — it would reject every Resend send.
- **dkim**: `resend._domainkey` resolves a `v=DKIM1` record.
- **dmarc**: `_dmarc` resolves `v=DMARC1` with a `p=` policy. Any policy
  passes; the policy is reported so hardening (`none` → `quarantine` →
  `reject`) is deliberate.

Exit 0 = all pass. DNS failures (ENOTFOUND etc.) fail with the reason, so a
half-propagated change reads as FAIL + which record, not a crash.

## Current state

Pre-H-03 the gate FAILs (no records published) — that is the expected
red baseline, captured in `evidence/T-37-emailauth.txt`. H-03 closes when
the owner pastes gate-PASS output + the received-headers confirmation.
