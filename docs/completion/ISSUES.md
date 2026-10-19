# ISSUES.md — issue-filing & reconciliation ledger (S5-C)

Reconciled against live `gh issue list` (0 open PRs, 8 open issues, 4 closed in S5-C / post-provisioning). No duplicate issues filed.

| Candidate / Mapping | Action | URL / Issue |
|---|---|---|---|
| `H-01` — Cloudflare API token (KV backup + staging/preview + rollback live rehearsal) | Provisioned, verified (`docs/completion/evidence/H-01-cloudflare-kv-live.txt`), & closed | https://github.com/ravidsrk/slop-detect/issues/193 (`#193`) |
| `H-02` + `H-03` — Monitoring pipeline secrets (`CRON_SECRET`, `RESEND_API_KEY`, `SESSION_SECRET`) & Resend DNS (`SPF`/`DKIM`/`DMARC`) | Provisioned, verified (`docs/completion/evidence/H-02-pages-secrets-live.txt`, `docs/completion/evidence/H-03-email-auth-live.txt`), & closed | https://github.com/ravidsrk/slop-detect/issues/96 (`#96`) |
| `H-04` — npm publish (`@slop-detect/core` → `slop-detect` → `slop-detect-mcp`) & `NPM_TOKEN` | Mapped to existing open issue | https://github.com/ravidsrk/slop-detect/issues/95 (`#95`) |
| `H-05` / `G-47` — Calibration corpus human labeling (50–100 URLs + second rater) | Mapped to existing open issue | https://github.com/ravidsrk/slop-detect/issues/99 (`#99`) |
| `G-03` (partial, blocked on `H-05`) — Class-2/3 over-flagging calibration tuning | Mapped to existing open issue | https://github.com/ravidsrk/slop-detect/issues/100 (`#100`) |
| `H-06` — Launch posts (Show HN + Product Hunt / Reddit, post-GO) | Mapped to existing open issues | https://github.com/ravidsrk/slop-detect/issues/103 (`#103`), https://github.com/ravidsrk/slop-detect/issues/104 (`#104`) |
| `H-07` — Observability & cost guardrails (`SCAN_DAILY_CAP`, `SLOP_API_KEY` provisioned; `ERROR_WEBHOOK` + Logpush optional) | Updated on existing open issue (`docs/completion/evidence/H-02-pages-secrets-live.txt`) | https://github.com/ravidsrk/slop-detect/issues/97 (`#97`) |
| `G-27` / `T-11` — OG render cap cross-isolate KV atomicity (accepted bounded residual) | Mapped to existing open issue | https://github.com/ravidsrk/slop-detect/issues/109 (`#109`) |
| `G-50` (`DEFER`) — Stripe billing for agency tier | Mapped to existing open issue | https://github.com/ravidsrk/slop-detect/issues/102 (`#102`) |
| `F-5-06` (`T-06`) — `extract-zip` transitive advisory (unreachable in Cloudflare Pages Functions) | Triaged & closed in S5-C | https://github.com/ravidsrk/slop-detect/issues/129 (`#129`) |
| `S5-A bis` — `deploy.yml` `--branch main` production delivery fix | Fixed in PR #190 & verified live | https://github.com/ravidsrk/slop-detect/issues/152 (`#152`) |
