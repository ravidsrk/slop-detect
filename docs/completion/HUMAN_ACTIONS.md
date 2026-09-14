# HUMAN_ACTIONS.md — things only Ravindra can do

- **H-01 — Cloudflare API token (KV + Pages preview scope).** Unblocks T-08 prod run, T-27, T-29.
  Gates launch: YES. Instruction: create token at dash.cloudflare.com (Account: Workers KV edit,
  Pages edit; ttl 30d), paste via 1Password `op://Dev/slop-detect/cf-token`. Verify: `wrangler kv
  namespace list` + backup script dry-run output captured by agent.
- **H-02 — Monitoring secrets (#96).** Unblocks CF-04 prod E2E. Gates launch: YES. Instruction: set
  CRON_SECRET, Resend API key, INTERNAL_API_KEY, SESSION_SECRET in Pages project env. Verify: agent
  runs watch-register → forced sweep → confirms alert path (no spam: single test domain).
- **H-03 — Resend domain + DNS (SPF/DKIM/DMARC).** Unblocks CF-04 mail, T-37. Gates launch: YES.
  Instruction: add+verify sending (sub)domain in Resend; add SPF/DKIM/DMARC records. Verify: agent
  runs T-37 post-verify check (DNS + test send to owner).
- **H-04 — npm publish v0.8.0 (#95).** Gates launch: YES. Instruction: set NPM_TOKEN, cut v0.8.0 tag
  after T-03 green; confirm publish.yml core→cli→mcp order completed. Verify: agent checks npm
  registry versions match repo.
- **H-05 — Calibration labeling (#99).** Gates launch: YES. Instruction: label 50–100 corpus URLs +
  recruit second rater; drop labels per T-19c harness format. Verify: agent runs harness + commits corpus.
- **H-06 — Launch posts (#103 HN, #104 PH/Reddit).** Gates launch: NO (event, not product).
  Instruction: post when gate is GO/CONDITIONAL. Verify: agent links threads in ISSUES.md.
- **H-07 — Observability values (#97).** Unblocks prod alert wiring. Gates launch: NO. Instruction:
  provide ERROR_WEBHOOK URL, confirm uptime-check target, set SCAN_DAILY_CAP number, SLOP_API_KEY value.
  Verify: agent triggers test alert + cap-key check in staging.
