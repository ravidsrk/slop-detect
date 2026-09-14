# STATUS.md — S1 360° audit (run 20260914-S1)

Product: Slop Detector — AI-design-slop fingerprint scanner (CLI + HTTP API + MCP + web app).
Mode: drive. Stage: S1 COMPLETE. Source: 6-agent workflow fan-out + parent corroboration.

## Baseline freeze (parent-verified 2026-09-14)

- HEAD: `6770c58` (6770c5827946a25a58fdc3d131e57bc6d0fc87e3), branch `main`, tree CLEAN.
- Remote: git@github.com:ravidsrk/slop-detect.git. Default: origin/main.
- Last commits: #118 review-followups, includeSystem pin, #117 publish-unify, #116/#115 (all 2026-08-29).
- Branches: local `main` only; 5 remote `ravidsrk/*` (Jun 17–28, ~2.5mo old):
  adversarial-fresh, adversarial-release-review, final-shipping, scan-to-result-page, ui-ux-audit.
- Open PRs/issues: child-reported 0 open PRs / 11 open issues; parent `gh` query pending (reconcile pre-S5-C).
- Tags: latest v0.5.2 behind root version 0.8.0 (version drift noted).
- Toolchain: bun 1.4.2 (repo pins bun@1.3.5 — drift), node v24.20.0, gh 2.100.0,
  turbo 2.9.18, tsup 8.5.1, vitest 2.1.9, greptile present (/opt/homebrew/bin/greptile).
- Lockfile: bun.lock 215522B, Aug 29; `bun install --frozen-lockfile` exits 0 (fresh).
- Layout: packages/{core,cli,mcp,action}, apps/web, examples/{astro-blog,nextjs-app-router}, spec/*.md.
- Entry points: CLI `slop`→dist/bin/slop.js, MCP server, 8 Pages Functions api routes, action scan.mjs.
- Providers in config: Cloudflare (Pages/Browser/KV/Turnstile), Resend, npm. IaC: wrangler.toml only.
- CI: 8 workflows (ci, deploy, publish, calibrate, leaderboard, monitor-sweep, slop-check.example, smoke-live-canary).
- No prior docs/completion/ → FRESH run (R4 resume N/A).

## Cold start (S1-A) — PASS

Fresh-deps-equivalent install → build → full suite, captured verbatim:
evidence/S1-coldstart-run.txt. INSTALL_EXIT=0, BUILD_EXIT=0 (turbo 5/5), TEST_EXIT=0 (turbo 7/7).
Totals: action 7, core 71, mcp 14, cli 12 passed +10 skipped, web 303 → **407 passed, 10 skipped, 0 failed**.
Error-shaped lines in the log are expected test log-output (email_send_failed, scan_failed fixtures), not failures.

## Critical flows (child-reported, ship-shape TBD in S3)

| ID | Flow | Entry → exit | Money | Observed |
|---|---|---|---|---|
| CF-01 | Web scan | index → POST /api/scan → /r/:id | free, KV 90d | works (500 w/o BROWSER binding) |
| CF-02 | CLI scan | `slop <url>` → terminal/JSON | free, local | partial (design+remote rejects) |
| CF-03 | Fix prompt | fix endpoint → markdown | free, static | works |
| CF-04 | Watch/monitor | POST /api/watch → confirm → daily sweep → Resend alert | trial | partial (KV writes off w/o keys) |
| CF-05 | Dashboard | magic link (44?) → SESSION → dashboard | free, KV 30d | works |
| CF-06 | MCP tools | MCP server, 4 tools + Skill + Action | free | works |
| CF-07 | Share surfaces | /r /og /badge /score /report /dir /api | free | works (leaderboard artifact?) |

## Angles

### 1. Product definition & critical flows — 2/4 A
- F-1-01..08 (compressed): fingerprint = 27 design + 9 copy patterns + 8 AEO checks; engine free/MIT.
- Flows CF-01..07 derived from README/routes; no E2E walk evidenced yet → score 2.
- Evidence: child code-read; parent: pricing.md (free engine + trial monitoring), wrangler KV bindings.

### 2. Functional completeness — 2/4 A
- F-2-01: zero task-tag markers (todo/fixme/hack/xxx, case-sensitive rg) in source
  (parent-verified count 0 excluding docs/completion/**; this file self-matches otherwise).
- F-2-02: feature flags default safe. F-2-03: 422-series error taxonomy present; some omission noted (re-verify).
- F-2-04: no hard-coded credentials/URLs. F-2-05: a 301 route is a CUT candidate. F-2-06: leaderboard/npm-version/calibration gaps.
- Score 2: half-built surfaces (CF-02/04 partials, F-2-05/06) unlisted precisely → S2 promotes to G-NN.

### 3. Code quality & architecture — 2/4 A
- F-3-01: lint/type/format configs exist but CI gates format-only (gap). F-3-02: no circular deps.
- F-3-03: 4 oversized files. F-3-04: grade-duplication acceptable. F-3-05: playwright ~1.60.
- F-3-06: no deprecated APIs. F-3-07: tree matches README description.

### 4. Testing — 3/4 G
- 48 test files; suite green: 407 passed, 10 skipped (cli), 0 failed. Scan-contract 19 tests incl.
  SSRF/redirect/pushState-spoof guards (parent-observed in cold-start log).
- F-4-01: no coverage gate (cov 0). F-4-02: no E2E suite. F-4-03: cli skips 10 tests unexplained.
- F-4-04: suite ran twice-equivalent (build+test turbos) with no flakes observed this run.
- Evidence: evidence/S1-coldstart-run.txt (TEST_EXIT=0). Score 3: critical-flow parts covered by contract tests.

### 5. Security — 3/4 G (provisional; child-reported internals)
- F-5-01: tiered per-IP rate limits; scan routes fail closed under load.
- F-5-02: monitor sweep behind bearer auth; session TTL 30d. F-5-03: secret-stripping in logs.
- F-5-04: SSRF boundary tested (private-host redirect 400, location-spoof guard) — parent-observed test names.
- F-5-05: output escaping present. F-5-06: no dependency-audit baseline captured (gap).
- F-5-07: no LLM prompt-injection surface (no LLM calls — see angle 12).
- No money paths in the classic sense (free engine; trial monitoring) → idempotency N/A for now.
- Evidence: cold-start log (ssrf/contract test names); internals re-verify in S2/S3.

### 6. Data — 2/4 A
- F-6-01: KV-backed (RATE_LIMIT, RESULTS bindings — parent-verified in wrangler.toml); schema doc `_data` partial.
- F-6-02: no migrations story (KV TTLs: 90d results / 365d? / 7d / 15m / 3h — re-verify exact map).
- F-6-03: stats keys without TTL (unbounded growth risk). F-6-04: emails stored plain, no export path.
- F-6-05: unsubscribe flow exists (~79 lines?) but header-based one-click missing (see angle 15).
- F-6-06: no backup/restore rehearsal (KV snapshots manual?). Score 2: works, safety unproven.

### 7. Infra & deploy — 2/4 A
- F-7-01: deploy path documented; CI gate ok. F-7-02: Turnstile sitekey-only config noted.
- F-7-03: NO staging environment (parent-verified: zero `[env.*]` in wrangler.toml).
- F-7-04: no IaC for KV/namespaces (manual creation). F-7-05: rollback never rehearsed.
- Score 2: prod deploy works; parity/rollback/repeatability gaps.

### 8. Reliability & operability — 2/4 A
- F-8-01: no health/readiness endpoint. F-8-02: timeouts present (25/8/10/15s per surface) — ok.
- F-8-03: no retries/backoff/circuit-breaking on external calls. F-8-04: graceful degradation ok.
- F-8-05: capacity assumptions unwritten. F-8-06: no runbooks (2 a.m. test fails).
- Score 2.

### 9. Observability — 1/4 R
- F-9-01: structured JSON logs (`[slop-detect] {"ts"...}` — parent-observed) but NO request IDs.
- F-9-02: no metrics on critical flows. F-9-03: alert webhook hook-off/disabled.
- F-9-04: Logpush TODO. F-9-05: no dashboards. Score 1: operational blindness on critical flows.

### 10. Performance & cost — 3/4 G (provisional; unanchored numbers)
- Child-reported: scan latency ~8s (unmeasured by parent), no k6/load test.
- F-10-01: bounds exist (list 5k, cap 50, sequential sweep, OG 30d cache, 10k cap + kill switch).
- F-10-02: cost caps claimed ($75 cap, $6.7/1k scans) — source unverified, re-verify in S2.
- Score 3 is WEAK: kept provisionally on bounding/kill-switch evidence; S2 must anchor or downgrade.

### 11. Third-party integrations — 3/4 G (provisional)
- 7 providers: Cloudflare Pages/KV/Browser/Turnstile, Resend, alert webhook, sweep cron, npm.
- F-11-01: fail-closed under load/keys-missing (safe-off). F-11-02: secrets missing in some env (which? re-verify).
- F-11-03: no staging keys (follows F-7-03). Bus factor 1 on all provider accounts (see angle 17).

### 12. AI/LLM layer — N/A (parent-verified)
- Checkable reason: zero LLM provider SDKs in bun.lock + all package.jsons (SDK_GREP_EXIT=1);
  zero api.openai.com/api.anthropic.com call sites (CALLS_GREP_EXIT=1); keyword hits are AEO-subject
  content only (packages/core/src/aeo.ts measures citability; robots/sitemap/llms.txt/docs).
- Weight 5 redistributed proportionally. Evidence: evidence/S1-corroboration.txt.

### 13. UX & frontend — 3/4 G (provisional; code-only)
- F-13-01: loading/error/empty states present on critical flows (child code-read).
- F-13-02: responsive (900/640 breakpoints), focus/sr a11y basics.
- F-13-03 (gap): modal focus-trap missing (~line 1256, file TBD — re-verify).
- No stranger-walk performed yet → S4 Stranger Test is the real evidence.

### 14. Documentation — 2/4 A
- F-14-01: README clone-to-scan path ok (S4 will prove). F-14-02: API.md + openapi.json present.
- F-14-03: runbooks partial, ADRs weak, arch sketch partial.
- F-14-04: spec drift suspected (spec counts vs engine 27+9+8 — re-verify exact delta in S2).
- Score 2.

### 15. Legal & compliance — 2/4 A
- F-15-01: privacy.md exists (v0.6 per child). F-15-02: NO Terms of Service (parent-verified:
  public/*.md = auth/index/pricing/privacy only). F-15-03: refund policy N/A (free+trial).
- F-15-04: double opt-in present; one-click unsubscribe header missing; SPF/DKIM/DMARC TODO (unverified DNS).
- F-15-05: retention/sub-processor documented per child (re-verify). Score 2.

### 16. Business / GTM readiness — 1/4 R
- F-16-01: pricing page exists (free engine + trial monitoring — parent-read); child-cited $29 price NOT found by parent.
- F-16-02: billing E2E absent (bill-0). F-16-03: analytics absent (parent-verified: no plausible/posthog/umami/gtag in index.html).
- F-16-04: support = GitHub-only; transactional email off/sandbox. F-16-05: HSTS present (child). Score 1.

### 17. Ownership & operations — 1/4 R
- F-17-01: no account/key/domain/service inventory. F-17-02: no OWNERS/recovery doc; bus factor 1.
- F-17-03: no incident process (3 lines or otherwise). F-17-04: only a kill switch exists.
- Score 1: a 6-months-away Ravindra could not recover this from the repo alone.

## Completion score

Scores: 1:2 2:2 3:2 4:3 5:3 6:2 7:2 8:2 9:1 10:3 11:3 12:N/A 13:3 14:2 15:2 16:1 17:1.
Raw sum (N/A=0): 4+7+2+6+10.5+4+3+2.5+1+3.75+3.75+0+3.75+1.5+2.5+1+0.5 = 56.75.
Per Appendix B (redistribute angle-12 weight 5): 56.75/95*100 = **59.7%**.
RAG: 5 G (4,5,10,11,13 — four provisional) · 8 A · 3 R (9,16,17) · 1 N/A.
Informational only; the DEFINITION.md gate (S2) is binding.

## Corroboration & honesty ledger

Parent-independently-verified: HEAD/branch/clean-tree/remote, toolchain + bun drift,
lockfile freshness (frozen install 0), layout, CI count, entry points, KV bindings, single wrangler env,
privacy-no-terms, no-analytics, free-engine pricing, zero task-tags, 48 test files, full suite green
(407+10skip/0fail), JSON-log-no-ID shape, A12 N/A (SDK+call-site greps).
Child-reported, parent NOT yet re-verified: per-angle F-* file:line internals, timeout values,
TTL map, cost figures ($75/$6.7), $29 price (pricing.md contradicts — treat as UNVERIFIED),
provider-secret gaps, modal-trap location, spec-drift delta, open PR/issue counts (gh pending).
Rule: every S3 task re-opens the bodies it touches; nothing ships on child word alone.

## S1 exit

- [x] No angle unscored (16 scored, 1 N/A with checkable reason).
- [x] Cold start captured (pass). Baseline recorded. Provisional scores flagged, none hidden.
- Second look: caught self-matching task-tag line (fixed by rephrase) and a todo-count wobble
  (0 vs 4 — resolved: my own STATUS line; source count 0 excl. docs/completion/**).
  Also corrected synthesis arithmetic (59.7% redistributed, not 56.75%).
- Stage 1 exit: MET. Resume pointer → S2-A.

