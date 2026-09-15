# SHIPLOG.md — append-only execution log (run 20260914-S1)

## 2026-09-14 S1-A baseline freeze
- commit 6770c58 main CLEAN; 5 remote ravidsrk/* branches (Jun 17–28); tags stale (v0.5.2 vs root 0.8.0).
- toolchain: bun 1.4.2 vs pin 1.3.5, node v24.20.0, gh 2.100.0, turbo 2.9.18, greptile present.
- cold start PASS: INSTALL 0 / BUILD 0 (5/5) / TEST 0 (7/7; 407 passed, 10 cli-skipped, 0 failed).
- evidence: evidence/S1-coldstart-run.txt, evidence/S1-corroboration.txt.
- artifacts: (none outside docs/completion/ — no scratch created)

## 2026-09-14 S1-B 360° audit
- 6-agent fan-out (baseline + 5 angle groups) + critic + 1 gap follow-up + synthesis. All read-only.
- scores: 1:2 2:2 3:2 4:3 5:3* 6:2 7:2 8:2 9:1 10:3* 11:3* 12:N/A 13:3* 14:2 15:2 16:1 17:1 (*=provisional).
- completion 59.7% (56.75 raw, A12 weight redistributed). RAG: 5G/8A/3R/1N.
- parent-corroborated: git/toolchain/lockfile/layout/CI/KV/single-env/privacy-no-terms/no-analytics/
  free-pricing/zero-tags/48-files/suite-green/log-shape/A12-N/A. gh PR/issue counts pending.
- second look: fixed self-matching tag line; resolved 0-vs-4 count; corrected 56.75%→59.7%.
- resume_pointer: S2-A

## 2026-09-14 S2-A research
- 5-agent fan-out (archaeology + 4 external tracks) + critic + 1 follow-up + synthesis. Read-only.
- Track A parent-verified: 297 commits, velocity map, all 5 branches 0-ahead (DELETE), 11 open issues
  (4 launch-blockers, all needs-human 08-29) — evidence/S2-archaeology.txt.
- Parent-fetched R-01..R-04 (Pages rollback, KV bulk, Resend domains, CAN-SPAM). Key corrections:
  rollback capability EXISTS (F-7-05 narrows to rehearsal); $29 = #102 post-launch plan, not live price.
- A10 downgraded 3→2 (unanchored); completion 59.7→58.4.
- resume_pointer: S2-B

## 2026-09-14 S2-B definition + gaps
- DEFINITION.md frozen at 6770c58. 7 flows final, gate mechanical, out-of-scope listed.
- 56 gaps: S0 2 · S1 19 · S2 24 (22 FINISH + 1 CUT + 1 ACCEPT) · S3 11 (5 FINISH + 5 DEFER + 1 ACCEPT).
- #100 = S1 (A-05). CERT-6h = no-effect with reason.
- resume_pointer: S2-C

## 2026-09-14 S2-C plan
- 42 tasks P1–P7 (23 S / 19 M / 0 L), each with acceptance evidence. 7 human actions (5 launch-gating).
- P6 billing E2E dropped per #102 (A-07). H-blocked tasks → CONDITIONAL-GO conditions (A-08).
- second look: rechecked every above-line G-NN has ≥1 T-NN (yes); T-24/T-25 depend on T-22;
  T-27/T-40 depend on T-29; T-19b on T-19a; T-35 on T-24. No L tasks. No change needed.
- S2 exit: MET. resume_pointer: P1/T-04

## 2026-09-14 S3/P1 T-04 gate lint+typecheck (G-24) — DONE
- branch ravidsrk/p1-gate-lint-typecheck → PR #120 → merge 395e661 (merge commit, no squash).
- Finding: typecheck was ALREADY gated; the real gap was eslint never running (no lint scripts).
  Wired `eslint .` into all 7 workspaces + CI step; cleared 12 warnings; snapshot updated for 3
  behavior-preserving serialized-extract edits (dist-diff verified, 14 lines; vitest terminal
  reindent display was an alignment artifact — snapshot file diff is exactly the 3 hunks).
- Evidence: evidence/T-04-gate.txt (format/lint/typecheck/test exit 0; forced lint 7/7 zero problems).
- Review: greptile local. P2 examples-noop → fixed (real scripts + generated-tree ignores).
  .astro-parser note → ACCEPTED with reason: example builds compile .astro in CI's build step;
  eslint-plugin-astro is disproportionate for demos (A-09).
- second look: re-verified the snapshot file diff hunk-by-hunk before accepting -u; also confirmed
  the mid-task "1 problem" was stale turbo cache (forced run clean). No further change.
- resume_pointer: P1/T-06

## 2026-09-14 S3/P1 T-06 dep-audit baseline (G-21) — DONE
- branch ravidsrk/p1-dep-audit → PR #121 → merge 744f1f6.
- `bun audit fix` in-range: 94 → 39 (next.js RCEs fixed); ws ^8.21.0 override: 39 → 38.
  Remaining 2 criticals unreachable in prod (astro example-only major; vitest-UI dev-only → G-53).
- Evidence: evidence/T-06-audit.txt (before), T-06-audit-after.txt, T-06-gate.txt (all exits 0).
- Review: greptile local, 1 P2 (stale FORMAT_EXIT=1 in gate file) → fixed by regenerating evidence.
- artifacts: /tmp/dist-clean.js + /tmp/dist-edited.js (T-04 bundle diff; DELETE in S6),
  /tmp/audit-before.txt (T-06 audit copy; DELETE in S6), /tmp/T-06-gate-new.txt (consumed by mv; GONE).
  (Late-manifested: created before I started the manifest habit; no more unmanifested artifacts.)
- second look: lesson learned — regenerate gate evidence instead of appending corrections; applied
  immediately in this same task. Also folded the floating T-04 record updates into this branch as
  their own commit; henceforth record updates ride the task branch that produced them.
- resume_pointer: P1/T-07

## 2026-09-14 S3/P1 T-07 secret scan (G-20) — DONE
- branch ravidsrk/p1-secret-scan → PR (see status.json) → merge commit, no squash.
- History sweep: private-key pickaxe empty; provider-key hits all benign (test fixtures, doc
  name-references, redacted bearer). No tracked/local .env. Created root .env.example (14 runtime
  keys from env.* grep) + README pointer. Clean cert, no rotation.
- Evidence: evidence/T-07-secrets.txt, evidence/T-07-gate.txt (all exits 0).
- Review: greptile local, 1 P2 (record-not-updated) → fixed by writing the record on this branch
  pre-push (new pattern: record rides its task branch; PR URL added in a follow-up commit).
  Also avoided the `.dev.vars.*` gitignore trap by using root .env.example.
- second look: READMEs never mentioned env setup → added the .dev.vars pointer (stranger angle).
  Noticed web README says npm while repo uses bun — left for S4 Stranger Test (owns README truth).
- CI red herring on PR 122: dashboard.test.js:93 flaked (1/256: sig ended in `ff`, tamper was a no-op).
  Root-caused with rate demo (5/2048) in evidence/T-07-flake.txt; fixed test to flip the last nibble
  deterministically. R13-allowed test fix with reasoning logged here + in the test comment.
- artifacts: /tmp/flake-demo.mjs, /tmp/flake-hist.mjs, /tmp/flake-rate.mjs (flake demos; DELETE in S6).
- resume_pointer: P1/T-05

## 2026-09-14 S3/P1 T-05 golden skips (G-25) — DONE
- branch ravidsrk/p1-golden-tests → PR (see status.json) → merge commit, no squash.
- Finding: header claimed smoke-CI runs goldens — FALSE (ci.yml never did). Ran all 10 gated tests
  locally with pinned-playwright Chromium: 11/11 green (incl. 1 always-on). Wired RUN_GOLDEN=1 step
  into the smoke job so the claim is now true. Note: install via the workspace playwright binary;
  bare `bunx playwright` may resolve a newer rev (learned the hard way).
- Evidence: evidence/T-05-golden.txt (11/11), evidence/T-05-gate.txt (default gate all 0).
- Review: greptile local, 1 P2 (TBD PR ref) resolved by PR-link commit.
- CI fix (attempt 2): smoke failed — bare `bunx playwright install` fetched a newer rev's browsers
  that 1.60.0 refuses. Pinned the installer to playwright@1.60.0 with engine-pin sync comment.
- second look: left the stale `npm test` wording in the golden header alone (cosmetic; S4 owns docs).
- resume_pointer: P1/T-01

## 2026-09-14 S3/P1 T-01 prune branches (G-38) — DONE
- branch ravidsrk/p1-prune-branches → PR (see status.json) → merge commit, no squash.
- Re-verified all 5 as ancestors of current main, then deleted remotely. Branch list now main only.
- Evidence: evidence/T-01-branches.txt. Review: greptile local.
- second look: deletion is unrecoverable-by-name but content lives on main (ancestor check);
  also confirmed no open PRs reference the deleted branches (PR count 0 open — checked pre-delete
  via gh; the only opens were mine, since merged).
- resume_pointer: P1/T-02

## 2026-09-14 S3/P1 T-02 bun pin (G-37) — DONE
- branch ravidsrk/p1-bun-pin → PR (see status.json) → merge commit, no squash.
- Decision: adopt 1.4.2 (running locally + green) rather than downgrade. Bumped 10 pins:
  packageManager + setup-bun in ci×4, publish, deploy, leaderboard, calibrate, smoke-live-canary.
  Zero 1.3.5 references remain. Frozen install clean, full gate green.
- Evidence: evidence/T-02-bun.txt. Review: greptile local.
- second look: no change (mechanical bump, verified by grep + frozen install + CI on 1.4.2).
- resume_pointer: P1/T-03

## 2026-09-14 S3/P1 T-03 release hygiene (G-36) — DONE
- branch ravidsrk/p1-release-hygiene → PR (see status.json) → merge commit, no squash.
- Versions in sync (0.8.0 ×3, fixed group, cli→core workspace:*). MCP verified API-only (no NOTICE
  duty). Fixed stale `color.js`→`color.ts` path in core+cli NOTICE; added license field to action.
  Tag cut stays with H-04.
- Evidence: evidence/T-03-versions.txt, evidence/T-03-gate.txt (all 0). Review: greptile local.
- second look: checked the NOTICE-testing angle (only an unrelated ::notice:: match) — no change.
- P1 exit: cold start passes (frozen 0) · CI green on main (per-PR greens) · branches main-only.
  P1 COMPLETE. resume_pointer: P2/T-10

## 2026-09-14 Review follow-ups PRs 119–126 (10 threads)
- Gap counts corrected (bot was right): 54 gaps {S0:2, S1:19, S2:23, S3:10}; FINISH 46 {2/19/21/4}.
  SHIPLOG S2-B "56" and GAPS.md "S2 22/S3 5" were arithmetic errors; register rows unchanged (A-10).
- T-06 contract clarified in PLAN (fix or H/DEFER-disposition); G-53 broadened to astro-7.2.8+;
  undici 7.24.8 corrected to REMAINS/dev-only (wrangler is a devDep) in T-06-gate.txt correction block.
- T-01 evidence: recovered all 5 deleted tip SHAs from git log subjects, re-verified ancestors
  of main@8582b8f, appended to T-01-branches.txt.
- "Zero 1.3.5 references" qualified: zero EXECUTABLE pins (historical refs remain in
  STATUS/RESEARCH/PLAN/GAPS audit prose + docs/DECISIONS.md, as they should).
- P1 "CI green on main" re-evidenced with push run 34868596276 (merge #126, success).
- Threads answered in-thread: 119/4006362109 fixed, 120/4006605725 declined (A-09),
  121/4006740270 fixed, 121/4006740284 fixed, 121/4006740301 covered (#122),
  122/4006808659 covered (1f87861), 124/4007124419 fixed, 125/4007198149 covered (c8d1f1a),
  125/4007198161 fixed, 126/4007277838 fixed.

## 2026-09-14 S3/P2 T-10 KV TTLs (G-14) — DONE
- branch ravidsrk/p2-kv-ttl → PR (see status.json) → merge commit, no squash.
- Email index (e:) now shadows 1y WATCH_TTL (was immortal); gs: markers 1y (was immortal,
  the real unbounded growth — one key per scanned domain). stats:dist/catclean confirmed
  durable-by-design (2 fixed bounded keys). Full map in docs/KV_TTL.md; 5-test guard added.
- Evidence: evidence/T-10-gate.txt (all 0; web 315 with 12 TTL tests). Review: greptile local
  + 2 bot threads on #128: P1 gs:-drift → declined with stated tradeoff (drift is second-order on
  approximate aggregates; unbounded keys the worse failure; comment now says so); P2 guard-misses-
  routes → fixed (9 data-layer + og/dashlink/middleware route TTL tests; header points at suites).
- second look: verified e: prefix from source (not guessed) and BADGE_TTL is HTTP cache, not KV.
- resume_pointer: P2/T-13

## 2026-09-14 S3/P2 T-13 security headers (G-39, G-40) — DONE
- branch ravidsrk/p2-sec-headers → PR (see status.json) → merge commit, no squash.
- Added form-action 'self' to both CSPs (all forms verified same-origin); CSP parity test locks
  _headers == middleware; security.txt + rule + validity test (fails <30d to expiry); enabled
  private vuln reporting (was off); docs/SECURITY.md posture + edge checklist; H-08 filed.
  Skipped upgrade-insecure-requests (breaks local http Pages dev) — logged in SECURITY.md.
- Evidence: evidence/T-13-gate.txt (reporting true, all 0; web 318). Review: greptile local.
- second look: no change (scope held: SSRF/authz stay in T-09 per skill boundary split).
- Note: bot issue #129 (extract-zip Zip-Slip, no fix) corroborates the T-06 triage (transitive via
  @puppeteer/browsers, dev/CI-time, vendor archives → LOW); its yauzl-replace suggestion is
  inapplicable (not a direct dep). S5-C dedup candidate for the G-53 filing. No action now (R17).
- resume_pointer: P2/T-08

## 2026-09-14 S3/P2 T-08 KV backup (G-13) — DONE (agent part; prod run = H-01)
- branch ravidsrk/p2-kv-backup → PR #131 → merged 382d0f6, no squash.
- New apps/web/scripts/kv-backup.mjs: backup/restore(dry-run default)/verify over a
  backend-agnostic core; CF API backend (paginated list, raw bytes, TTL restore, 60s floor).
  8-test rehearsal: memory round-trip, dry-run safety, TTL preservation, expiry skip,
  mismatch detection, pagination + error paths, wrangler namespace parsing. Runbook docs/KV_BACKUP.md.
- Evidence: evidence/T-08-restore.txt (all 0; web 331 with 13 backup tests). Review: greptile
  local, 5 P1s — ALL fixed in-branch: 404-safe backup counting; pre-write manifest validation
  (schema+checksum+target); per-write expiry with short-TTL skip (no resurrection); strict arg
  parsing; empty-input failure. Tests added for each.
- Greptile PR review, 3 more (2 P1 + 1 P2) — ALL fixed in 2816d6e, replied in-thread:
  required manifest identity fields (no bypass by omission); finite-number expiration
  validation (no NaN permanent restore); owner-only modes 0700/0600 + usage note;
  binary test seeds raw Buffer with byte assertion. 16/16 tests, all CI green.
- artifacts: /tmp/kvbu-empty (CLI guard probe; DELETE in S6).
- second look: single-key PUT loop chosen over bulk endpoint for binary certainty at our
  scale; restore is upsert-only (no delete path) — both stated in the runbook.
- resume_pointer: P2/T-09 (T-08 merged 382d0f6)

## 2026-09-14 S3/P2 T-09 authz matrix (G-22, G-23) — DONE
- branch ravidsrk/p2-authz → PR #132 → merged 70edc0e, no squash.
- 16 new tests in apps/web/test/authz-matrix.test.js: sweep Bearer auth (was zero
  coverage: 503-off, 401 x2, 500, happy path, middleware→handler chain), API-key
  paths (401/403, foreign-origin+key, Turnstile skip, unlimited cap bypass),
  aeo/fix-prompt scan-gating with shared-bucket 429s, fix-prompt 20/min 429,
  patterns GET, tampered dashboard cookie. Full auth surface: 76 green.
- docs/AUTHZ_MATRIX.md: route x credential matrix (gate-vs-handler scope marked)
  + env behavior matrix for all 14 keys/bindings, every row cited to its test.
- Finding (documented, not fixed — out of verify/doc scope): TURNSTILE_SITEKEY is
  write-only; rotating the var alone does nothing (widget uses hardcoded fallback).
- Evidence: evidence/T-09-authz.txt (all 0; web 348 at capture, 350 after the 2
  review-fix tests; merge-commit CI green). Greptile 3 P2s on doc accuracy —
  ALL fixed in 301bcd1, replied in-thread.
- second look: no scope creep into fixing the sitekey injection; filed as follow-up.
- resume_pointer: P2/T-11 (T-09 merged 70edc0e)

## 2026-09-14 S3/P2 T-11 KV counters (G-27, G-28) — DONE
- branch ravidsrk/p2-kv-limits → PR #133 → merged ea676ab, no squash.
- Fix: dashLinkAllowed + watchVerifyAllowed get in-isolate mem counters (ogMem
  pattern) — same-isolate bursts hold 3/hour on stale KV reads; over-cap and
  KV denies both release budget (mem tracks admissions). 5 new tests: 2 burst,
  1 sequential leak, 2 concurrent full-budget regression. Negative controls:
  burst fails 10-vs-3 on pre-T-11 code; race test fails without the release.
- docs/KV_LIMITS.md: counter inventory, accepted cross-isolate residual (#109
  stays open, commented), platform limits (cited) vs per-flow usage. Key
  finding: free tier write-bound ≈125 first-scans/day; SCAN_DAILY_CAP=10000
  unreachable without paid plan.
- Evidence: evidence/T-11-kv.txt (all 0; web 353+2 at merge). Greptile 1 P1
  (over-cap budget leak) — fixed in f3f98d3, replied in-thread.
- second look: 60s-gate attempt-counting (middleware/og) left as-is, documented
  as fail-closed/verdict-neutral; hot path untouched.
- resume_pointer: P2/T-12 (T-11 merged ea676ab)

## 2026-09-14 S3/P2 T-12 image version (G-29) — DONE (verify-first: no issue)
- branch ravidsrk/p2-img-version → PR #134 → merged 6095067, no squash.
- Verdict: NO exposure. Sweep finds zero version identifiers in badge/og
  handlers + badge renderer; sole token anywhere is the intentional,
  already-tested OG `defs <DEFINITIONS_VERSION>` label (mirrors public
  /api/patterns); cardHtml screenshot-only. No prod change; 2 tripwires.
- F-R-08 finding text unrecoverable (gap title only) — verified from title.
- Evidence: evidence/T-12-img.txt (all 0; web 357). Greptile 1 P2 (evidence
  wording) — fixed, replied in-thread.
- P2 COMPLETE (T-10, T-13, T-08, T-09, T-11, T-12).
- resume_pointer: P3/T-14 (T-12 merged 6095067; P2 COMPLETE)

## 2026-09-14 S3/P3 T-14 CF-02 CLI (G-02, S0) — DONE
- branch ravidsrk/p3-cli → PR #135 → merged 38a2af8, no squash.
- Live matrix, all green: local design/copy/AEO/system(file+auto)/screenshot/
  strict/multi/fail-on; remote design/copy/AEO with local parity on
  design+copy (AEO env-divergence stated, not a bug). S1 'remote rejects'
  stale; transient 502 + rate limits are correctly-surfaced server behavior.
- Fix: empty_page reasons split 3 ways (nothing / thin-but-titled /
  dense-but-uncharacterizable); code unchanged; 2 core tests; live-verified.
- Evidence: evidence/T-14-cli.txt (all 0; core 73). Greptile 2 P2s —
  fixed in 8767b80, replied in-thread. PR body corrected for parity scope.
- resume_pointer: P3/T-15 (T-14 merged 38a2af8)

## 2026-09-14 S3/P3 T-15 CF-04 monitor (G-01, S0) — DONE (agent part; prod E2E = H-02/H-03)
- branch ravidsrk/p3-monitor → PR #136 → merged e4efb52, no squash.
- S0 FIX: sweep Bearer vs API-key collision — every scheduled run 401d.
  Middleware exempts cron/sweep from key resolution; handler judges Bearer.
  Found + re-verified live on pages dev (200/consent-gate/handler-401).
- 5-test monitor-flow E2E (full lifecycle + sans-secrets fail-closed) +
  2 sweep-chain regression tests (fail 401 pre-fix) + 1 scan→watch
  contract test + stub contract enforcement (key + payload asserted).
- docs/MONITOR_SANDBOX.md (L0/L1/L2; L2 = H-02 verify with controlled
  regression via staging KV surgery). AUTHZ_MATRIX sweep row updated.
- Evidence: evidence/T-15-watch.txt (all 0; web 365). Greptile 2 P2s —
  fixed in 81ce6ea, replied in-thread.
- second look: local .wrangler/.dev.vars junk broke lint mid-task —
  deleted; tree clean. Both S0s now closed at agent level.
- resume_pointer: P3/T-17 (T-15 merged e4efb52)

## 2026-09-14 S3/P3 T-17 calibration repro (G-03) — DONE (agent part; re-weight = H-05)
- branch ravidsrk/p3-calibration → PR #137 → merged 137fd6d, no squash.
- Repro #100 on current defs: Linear 23→19, Vercel 21→17, Stripe 19 (all
  Mild; Class-1 already cleared Heavy). Pixel truth exposed centered_hero
  firing on Linear's LEFT-aligned hero: geometric fallback vs full-width
  blocks. Fix: content-box gaps (padding/border subtracted) + abstain
  under ancestor transform/zoom. 3 fixtures + golden test, 8/8 RUN_GOLDEN.
- No defs bump (rule set + weights unchanged — precision fix). #100 stays
  OPEN (launch-blocker + needs-human), commented; residual = class-2/3
  corpus re-weighting. Chose fixture regression over live goldens (flaky).
- Evidence: evidence/T-17-calibration.txt (all 0; goldens 8/8). Greptile
  2 P1s (padded defeat, transform skew) — fixed in d590c8d/7f2cda8,
  replied in-thread. TDZ slip caught by tsc DTS, fixed same commit.
- resume_pointer: P3/T-16 (T-17 merged 137fd6d)

## 2026-09-15 S3/P3 T-16 CUT landing stub (G-48) — DONE
- branch ravidsrk/p3-cut → PR #138 → merged 52cf1df, no squash.
- Cut 100K of 301-hidden dead weight: deleted old-theme og.svg/og.png,
  git-moved design/ → apps/web/design/ (history preserved, out of the
  redirect shadow). Kept /landing/* → / 301 as backlink tombstone.
  Repointed _card comment + live design-doc paths; deleted-OG mentions in
  historical spec prose intentionally left as audit trail.
- CUT-pin test (tombstone + dir-absent). No other dead surfaces found.
- Evidence: evidence/T-16-cut.txt (all 0; web 366). Zero review threads.
- resume_pointer: P3/T-20 (T-16 merged 52cf1df)

## 2026-09-15 S3/P3 T-20 focus trap (G-30) — DONE
- branch ravidsrk/p3-focus-trap → PR #139 → merged 2eabc1a, no squash.
- access-it scoped run (CONFORMANT-WITH-MANUAL-PARKED): aria-modal, Tab
  trap + outside-focus pullback, initial focus, invoker return with #go
  fallback, stray-Escape guard. Playwright oracle: 8/8 trapped, wrap +
  return verified, revert control 8/8 escapes. axe unchanged (4 pre-
  existing page issues, none modal).
- Committed cli/test/modal-trap.test.js (RUN_GOLDEN + CI golden line);
  fails on reverted code. Parks: SR announcement, focus visibility,
  page axe issues. Presence pin in landing.test.js.
- Evidence: evidence/T-20-trap.txt (all 0; web 367). Greptile 2 P1 + 2
  P2s — all fixed, replied in-thread.
- resume_pointer: P3/T-21

## 2026-09-15 S3/P3 T-21 spec-vs-engine drift (G-31) — DONE
- branch ravidsrk/p3-spec-drift → PR #140 → merged ac361f6, no squash.
- Audit diffed every machine-checkable spec claim vs the engine: 2 real
  drifts fixed (bento summary-row wording; conformance flagship-clean
  claim now target + #100 pointer). New core spec-sync guard pins
  counts, versions, tiers, catalogue id-sets (bidirectional), weights.
- Teeth-checked: drifted-copy + stale-row negatives fail, restored
  green (core 77; all gates 0 after one prettier fixup).
- Evidence: evidence/T-21-spec.txt. Greptile P2 (one-directional
  guard) + P2 (this entry's structure) — both fixed, replied in-thread.
- resume_pointer: P3/T-18a (T-21 merged ac361f6)

## 2026-09-15 S3/P3 T-18a per-pattern goldens batch 1 (G-18/gh-92) — DONE
- branch ravidsrk/p3-goldens-a → PR #142 → merged a3efb70, no squash.
- New pattern-coverage.test.js registry: every design ID fires on a
  positive fixture (triggered + non-empty evidence, scans cached).
  Batch 1: 8 reuse slop-vibecode, 1 new pat-accent_stripe fixture,
  clean-artisan negative anchor (fires 0). Wired into required smoke.
- Teeth-checked: thinned stripes fail exactly that case; skip-gate
  holds (10 skipped without RUN_GOLDEN). Local 10/10; CI smoke ran
  the new file (23 passed incl. 10 new). Zero review threads.
- Evidence: evidence/T-18a-goldens.txt.
- resume_pointer: P3/T-18b

## 2026-09-15 S3/P3 T-18b per-pattern goldens batch 2 (G-18/gh-92) — DONE
- branch ravidsrk/p3-goldens-b → PR #144 → merged 0f458fc, no squash.
- Registry grows to 18 IDs: 8 new pat-* fixtures (perma_dark reuses
  slop-vibecode); clean-artisan anchor still 0 fired. Fixture rule:
  >=10 visible elements or the scan blocks as empty_page.
- Teeth-checked: uniform-span bento fails exactly its case. Local
  19/19; CI smoke green. Greptile P2 (missing pr link) fixed in-thread.
- Evidence: evidence/T-18b-goldens.txt.
- resume_pointer: P3/T-18c

## 2026-09-15 S3/P3 T-18c per-pattern goldens batch 3 (G-18/gh-92) — DONE
- branch ravidsrk/p3-goldens-c → PR #146 → merged 66f653b, no squash.
- Registry complete: all 27 IDs with positive fixtures + unskipped
  completeness pin (a 28th pattern fails the default suite until
  covered). Clean-artisan anchor: 0/27. gh-92/G-18 CLOSED.
- Teeth-checked: white bg fails exactly the cream case. Local 29/29;
  CI smoke ran the file (42 passed incl. 29 new). Zero threads.
- Evidence: evidence/T-18c-goldens.txt.
- resume_pointer: P3/T-19a

## 2026-09-15 S3/P3 T-19c calibration harness (G-47/gh-99 agent part) — DONE
- branch ravidsrk/p3-cal-harness → PR #148 → merged 9a5e745, no squash.
- Harness ran zero scans (phantom tsx dep); now bun-native. Seed
  re-run: 5/13 (38.5%), recorded in CALIBRATION.md with June-vs-Sept
  deltas; no thresholds touched. corpus.json unchanged.
- Greptile P2 (matrix omitted null outcome) fixed in-thread.
  Human 50-100 labels + second rater stay on H-05 (gates launch).
- Evidence: evidence/T-19c-harness.txt.
- resume_pointer: P3/T-19a (leaderboard build running)

## 2026-09-15 S3/P3 T-19a+b leaderboard dataset (G-19/gh-101) — DONE
- branch ravidsrk/p3-leaderboard-data → PR #150 → merged cfdaf63, no squash.
- First leaderboard.json: 20/24 scored via live API (7/9/4, avg 15.7),
  4 honest skips; verified shape/defs/sort/stats/consumers; monthly
  refresh made PR-based (unique run-id branch). gh-101/G-19 CLOSED.
- Greptile P1 (same-day branch collision) fixed in-thread.
- Evidence: evidence/T-19a-leaderboard.txt + T-19b-leaderboard.txt.
- resume_pointer: P3 exit (T-19a+b merged cfdaf63)

## 2026-09-15 S3/P3 T-33 nullish-502 fix + P3 EXIT (G-58) — DONE
- branch ravidsrk/p3-exit-502 → PR #153 → merged f0f1d33, no squash.
- Live bare edge 502 on DNS failure: nullish rejection crashed the
  catch (TypeError escape). Null-safe 3-way message + 2 contract
  tests (nullish + string detail). Greptile P2 fixed in-thread.
- P3 EXIT: all 7 flows happy+failure evidenced (P3-exit.txt); CUT
  criterion met (T-16). #152 production freshness filed (human,
  gates S5 GO). P3 status done.
- Evidence: evidence/P3-exit.txt.
- resume_pointer: P4/T-22

## 2026-09-15 S4/P4 T-22 request IDs (G-04) — DONE
- branch ravidsrk/p4-request-ids → PR #155 → merged f747ed5, no squash.
- X-Request-Id on every /api/* response (cf-ray > echo > UUID),
  forwarded to handlers; scan error bodies + logs stamped; thrown
  handlers become traced JSON 500s; CORS allows+exposes the header.
- 13 new tests (middleware 9, contract 4); teeth-checked unfixed.
  Greptile 2 P2s fixed in-thread. G-04 CLOSED.
- Evidence: evidence/T-22-reqids.txt.
- resume_pointer: P4/T-23

## 2026-09-15 S4/P4 T-23 health endpoint + ping (G-07) — DONE
- branch ravidsrk/p4-health → PR #157 → merged d3fb0cd, no squash.
- GET /api/health: 200/503 readiness (browser+KVs+kill-switch),
  redacted KV errors; 30-min ping workflow fails the run when down.
- 6 endpoint tests green; ping logic validated offline. Greptile
  P1+P2+P2 (kill-switch, redaction, evidence staleness) fixed in-thread.
- Evidence: evidence/T-23-health.txt.
- resume_pointer: P4/T-24

## 2026-09-15 S4/P4 T-24 ops metrics + surface (G-05/G-44) — DONE
- branch ravidsrk/p4-ops-metrics → PR #159 → merged 280429e, no squash.
- Daily ops blobs (per-route req/status, tiers, nav buckets, 30d
  TTL) via waitUntil; single-writer per route; /api/stats ops
  surface; share:false skips all bumps; peek-first + bounded
  pre-admission parse. 18 new tests (stats 5, middleware 8,
  scan-contract 3, api-stats 2, incl. greptile-fix additions).
  G-05/G-44 CLOSED.
- Greptile 4 P1/P2 + 1 follow-up P1 (race, opt-out×2, peek
  bound, parallel reads) — all fixed, replied in-thread.
- Evidence: evidence/T-24-ops.txt.
- resume_pointer: P4/T-25

## 2026-09-15 S4/P4 T-25 alert proof (G-06) — DONE
- branch ravidsrk/p4-alert-proof → PR #161 → merged e15c398, no squash.
- scan_failed proven end-to-end: induced failure POSTs to a live stub
  webhook (Slack {text} envelope, requestId, POST+JSON transport, all
  riding waitUntil); console-line contract locked. docs/ALERTS.md
  runbook inventories every report() event + severity + wiring.
  Zero prod-code changes. 4 new tests. G-06 CLOSED (code side).
- Greptile 2 P2 (invalid trigger, transport unchecked) — both valid,
  fixed + replied in-thread. Negative control: anchored waitUntil
  sabotage fails 2→1, restore green (first blind sabotage hit the
  wrong line — lesson recorded in evidence).
- Prod remainder: H-07 (owner sets ERROR_WEBHOOK value in Pages).
- Evidence: evidence/T-25-alert.txt.
- resume_pointer: P4/T-26
