# Production launch checklist

Tracks the deep-review findings and what's done vs. what needs a human (secrets,
data, decisions). Reviewed at code level on 2026-06-05; this file is the source
of truth for "are we launch-ready?".

Legend: ✅ done in-repo · 🔧 needs you (secret/decision/data) · ⏳ follow-up

## 🔴 Blockers

- ✅ **CI runs the unit tests.** Added a `test` job (`npm ci && npm test`); was
  lint + smoke only. Make it a required check in branch protection → 🔧.
- ✅ **CLI works without a browser.** Playwright is lazy-loaded; `--help`/flags/
  errors no longer crash. Added `--remote` (scan via API, zero install).
- ✅ **SSRF redirect bypass closed.** `scan` re-validates the final URL; `aeo`
  re-validates every redirect hop.
- ✅ **Email feature made honest + lawful.** Consent recorded; `/privacy.md`
  added; response no longer implies alerts it can't send.
- ✅ **Alert pipeline built** (was the open follow-up): double-opt-in
  verification (`/api/watch/confirm` + single-use tokens; no email to an
  unverified address), a provider-agnostic sender (`_email.js`, Resend),
  pure alert/verification copy builders, a tested monitoring sweep
  (`_sweep.js`), the `/api/cron/sweep` endpoint, and a daily `monitor-sweep`
  workflow. **Safe-off by default** — no keys ⇒ no-ops.
  - 🔧 **To turn alerts ON:** set Pages env `RESEND_API_KEY` + `ALERT_FROM`,
    `CRON_SECRET`, and `INTERNAL_API_KEY` (an `unlimited`-tier key for the
    internal re-scans); set the matching repo secret `CRON_SECRET`; verify a
    sending domain in Resend. The flow then runs itself.

## 🟠 High

- ✅ **Cost ceiling.** `SCAN_DAILY_CAP` (default 10000/day) + `SCAN_DISABLED`
  kill switch on the browser path.
  - 🔧 Set `SCAN_DAILY_CAP` in Pages env to match your billing comfort.
- ✅ **Observability shim.** Structured logs + optional `ERROR_WEBHOOK`.
  - 🔧 Set `ERROR_WEBHOOK` (Slack/Discord/Sentry ingest) and turn on **Logpush**.
  - 🔧 Add an external **uptime check** (e.g. on `/api/patterns`).
- ✅ **Deploy/release workflow** (`.github/workflows/deploy.yml`), test-gated.
  - 🔧 Set `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` repo secrets.
  - 🔧 Tag a release (`v0.6.0`) and publish the npm packages so `slop-detect` /
    `-core` / `-mcp` resolve at 0.6.0; cut a matching Action tag for `@v0.6.0`.
- ✅ **Engine has real tests now** (scoring/grades/presets/combine + catalogue
  integrity, 92 total). ⏳ Still no DOM-level golden tests of the 27 design
  patterns — see below.

## 🟡 Medium / follow-up

- ✅ Version drift fixed (all 0.6.0, lockfile synced).
- ✅ Security headers + CSP (scoped to Google Fonts + Turnstile). ⏳ Graduate CSP
  from `'unsafe-inline'` to nonces once index.html inline scripts are audited.
- 🟡 **Calibrate detection — harness shipped, data pending.** Added deterministic
  golden fixtures (`packages/cli/test/golden.test.js`, run in CI with Chromium), a
  seed labeled corpus (`packages/cli/calibration/corpus.json`), and a runner
  (`npm run calibrate`) that reports accuracy + a confusion matrix. 🔧 Grow the
  corpus to 50–100 human-labeled URLs and tune the single-occurrence thresholds
  (glassmorphism/glows/gradient-text) before quoting an accuracy number. See
  `CALIBRATION.md`.
- ⏳ Dev-dep advisory: `ws`←`miniflare`←`wrangler` (build-time only). `npm audit
  fix` when convenient.
- ⏳ Directory `listAllSites` is unbounded — cap/paginate before the catalogue
  grows large.
- ⏳ "Definitions versioning" is a constant string; add a changelog + a
  comparability guarantee if you lean on it publicly.

## Required env / secrets summary

| Where | Name | Purpose |
| --- | --- | --- |
| Pages env | `SCAN_DAILY_CAP` | daily browser-scan budget (cost guard) |
| Pages env | `SCAN_DISABLED` | emergency kill switch (`1` to pause) |
| Pages env | `ERROR_WEBHOOK` | error alerts (optional) |
| Pages env | `TURNSTILE_SECRET` | captcha (already external) |
| Pages env | `RESEND_API_KEY` / `ALERT_FROM` | send monitoring emails (optional) |
| Pages env | `CRON_SECRET` | auth for `/api/cron/sweep` |
| Pages env | `INTERNAL_API_KEY` | unlimited-tier key for sweep re-scans |
| Pages env | `SWEEP_MAX` | domains re-scanned per sweep (default 50) |
| Pages env | `SESSION_SECRET` | HMAC secret for dashboard magic-link sessions |
| Repo secret | `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` | deploy |
| Repo secret | `CRON_SECRET` | the `monitor-sweep` workflow auth (matches Pages) |
| Repo setting | branch protection → require `test` + `lint` | merge gate |
