# HUMAN_ACTIONS.md — things only Ravindra can do

- **H-01 — Cloudflare API token (KV + Pages preview scope).** DONE (2026-10-19). Minted scoped token
  (`slop-detector-ops-token`), set `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in GitHub Actions,
  provisioned preview KV namespaces (`be2494e78b8e40bcbe42757f2a3ac1e7`, `cda8560802c04fe6b4ba356a6115a478`),
  wired `preview_id` in `apps/web/wrangler.toml`, ran live KV backup/verify/restore dry-run (`T-08`), and
  executed live production rollback + roll-forward rehearsal (`T-27`). Evidence:
  `docs/completion/evidence/H-01-cloudflare-kv-live.txt`.
- **H-02 — Monitoring secrets (#96).** DONE (2026-10-19). Provisioned `CRON_SECRET`, `RESEND_API_KEY`,
  `ALERT_FROM`, `INTERNAL_API_KEY` (plus `key:<INTERNAL_API_KEY>` in prod & preview `RATE_LIMIT` KV),
  `SESSION_SECRET`, `RESEND_WEBHOOK_SECRET`, and `MAIL_POSTAL_ADDRESS` on Cloudflare Pages project
  `slop-detector` (production + preview) and `CRON_SECRET` in GitHub Actions; registered Resend webhook
  `https://slop-detect.com/api/email/webhook` (`c2a9b11c-1bd7-4192-b014-9991cdf37967`). Evidence:
  `docs/completion/evidence/H-02-pages-secrets-live.txt`.
- **H-03 — Resend domain + DNS (SPF/DKIM/DMARC).** DONE (2026-10-19). Added & verified `slop-detect.com`
  (`badb6232-19aa-4cbd-9fec-32369d1097b9`, status `verified`) in Resend; published SPF, DKIM
  (`resend._domainkey`), and DMARC (`_dmarc`) DNS records on Cloudflare zone `75eb1f3de83e49bc675fb38cb22a27d5`;
  verified `bun scripts/email-auth-check.ts slop-detect.com` → `PASS`. Evidence:
  `docs/completion/evidence/H-03-email-auth-live.txt`.
- **H-04 — npm publish v0.8.0 (#95).** DONE (2026-10-19). Set `NPM_TOKEN` in GitHub Actions secrets,
  bundled `@slop-detect/core` into `slop-detect` CLI (`noExternal`) and configured `prepack`/`postpack`
  so all three packages publish under the individual account (`slop-detect-core@0.8.0`,
  `slop-detect@0.8.0`, `slop-detect-mcp@0.8.0`), and pushed tag `v0.8.0`. Evidence:
  `docs/completion/evidence/H-04-npm-publish-live.txt`.
- **H-05 — Calibration labeling (#99).** Gates launch: YES. Instruction: label 50–100 corpus URLs +
  recruit second rater; drop labels per T-19c harness format. Verify: agent runs harness + commits corpus.
- **H-06 — Launch posts (#103 HN, #104 PH/Reddit).** Gates launch: NO (event, not product).
  Instruction: post when gate is GO/CONDITIONAL. Verify: agent links threads in ISSUES.md.
- **H-07 — Observability values (#97).** DONE (2026-10-19; `ERROR_WEBHOOK` optional). Configured
  `SCAN_DAILY_CAP=10000` in Cloudflare Pages (`production` + `preview`), provisioned `SLOP_API_KEY` in
  GitHub Actions secrets (`key:<INTERNAL_API_KEY>` unlimited tier in `RATE_LIMIT` KV), and verified
  30-min `/api/health` uptime ping workflow. Evidence: `docs/completion/evidence/H-02-pages-secrets-live.txt`.
- **H-08 — Edge checklist (docs/SECURITY.md).** DONE (2026-10-19). Verified TLS `strict`,
  `always_use_https: on`, Cloudflare WAF Managed + DDoS L7 rulesets, Turnstile widget
  `0x4AAAAAADWirXpm1gXBhB5E`, GitHub Private Vulnerability Reporting `{"enabled":true}`, and
  `security.txt` `Expires: 2027-09-14T00:00:00.000Z`. Evidence:
  `docs/completion/evidence/H-08-edge-security-live.txt`.
