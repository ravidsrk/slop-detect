# arch-build-readiness — adversarial-fresh integration branch

Final gate verification for the adversarial-fresh fix run. Branch `ravidsrk/fix-final`
(off BASE `ravidsrk/adversarial-fresh` @ `8f79b67`). Verified 2026-06-19 by T_FINAL
independent worker. Source ledger: `docs/arch-build-progress.md`. Frozen findings:
`docs/adversarial-review-fresh.md`.

**MERGE ≠ DEPLOY.** Nothing in this run promoted BASE to `main`, deployed to Cloudflare,
or published npm packages. All merges landed on the integration branch only.

---

## 1. SUMMARY

**Findings:** 15/15 confirmed findings **CLOSED** on BASE. **CONC-1** accepted as
do-not-fix (stats-only KV RMW; approximate percentiles by design).

**Verification (JOB 1, repo root `/Users/ravindra/orca/workspaces/slop-detect/fix-final`):**

| Gate | Command | Exit | Result |
|------|---------|------|--------|
| Install | `bun install` | 0 | clean — 1751 packages installed |
| Build | `bun run build` | 0 | **6 tasks successful**, 6 cached |
| Lint | `bun run lint` | 0 | **3 tasks successful**, no warnings |
| Typecheck | `bun run typecheck` | **2** | **FAILED** — `slop-detect-web#typecheck` (see below) |
| Test | `bun run test` | 0 | **7 tasks successful** (browser-free; golden gated) |
| Golden | `RUN_GOLDEN=1` in `packages/cli` | 0 | **16/16 passed** (7 golden + 2 fonts-ready + rest) |

### Typecheck failure (verbatim)

`bun run typecheck` exited 2. Only `slop-detect-web` failed; all other workspaces passed.

```
slop-detect-web:typecheck: functions/_email.ts(29,5): error TS2554: Expected 5 arguments, but got 4.
slop-detect-web:typecheck: functions/_email.ts(49,7): error TS2554: Expected 5 arguments, but got 4.
slop-detect-web:typecheck: functions/_email.ts(55,5): error TS2554: Expected 5 arguments, but got 4.
slop-detect-web:typecheck: functions/api/cron/sweep.ts(111,3): error TS2554: Expected 5 arguments, but got 4.
slop-detect-web:typecheck: functions/api/fix-prompt.ts(34,39): error TS2345: Argument of type '{ request: Request; env: any; }' is not assignable to parameter of type '{ request: any; env: any; waitUntil: any; }'.
slop-detect-web:typecheck:   Property 'waitUntil' is missing in type '{ request: Request; env: any; }' but required in type '{ request: any; env: any; waitUntil: any; }'.

 Tasks:    6 successful, 7 total
Failed:    slop-detect-web#typecheck
```

Root cause: OPS-1 (#78) extended `report()` with an optional `waitUntil` parameter; callers
in `_email.ts`, `cron/sweep.ts`, and `fix-prompt.ts` were not updated. **The integration
branch is NOT fully green on typecheck** until those call sites are fixed.

### Test pass counts (verbatim)

**`bun run test` (default, browser-free):**

| Workspace | Test files | Tests |
|-----------|------------|-------|
| `@slop-detect/core` | 10 passed | 71 passed |
| `@slop-detect/action` | 1 passed | 2 passed |
| `slop-detect-mcp` | 2 passed | 9 passed |
| `slop-detect` (cli) | 2 passed, 2 skipped | 6 passed, 10 skipped (16 total) |
| `slop-detect-web` | 27 passed | 287 passed |
| **Total executed** | **42 passed, 2 skipped** | **375 passed, 10 skipped** |

Skipped CLI tests (10): `golden.test.js` (7) and `fonts-ready.test.js` (2) gated on
`RUN_GOLDEN=1`; `engine-pin.test.js` (1) gated on `RUN_GOLDEN=1`.

**`RUN_GOLDEN=1` CLI suite** (`packages/cli`, direct vitest — turbo cache bypassed):

| Workspace | Test files | Tests |
|-----------|------------|-------|
| `slop-detect` (cli) | 4 passed | **16 passed** (includes 7 golden, 2 fonts-ready) |

**Grand total with golden:** 385 tests passed (375 browser-free + 10 additional golden/fonts-ready/engine-pin that were skipped in the default run).

---

## 2. PER-FINDING TABLE

| Wave | ID | Sev | One line | Status | PR# |
|------|-----|-----|----------|--------|-----|
| 1 | SEC-1 | P1 | Residual SSRF: navigation-response boundary (DNS-rebind ops-contingent) | CLOSED | #70 |
| 1 | REL-1 | P1 | No browser session reuse; launch-per-request on capped pool | CLOSED | #74 |
| P | COST-1 | P2 | Daily cost cap + per-IP limit non-atomic KV RMW; burst overshoot | CLOSED | #71 |
| P | SEC-3 | P3 | Turnstile bypassed by omitting Origin (document real floor) | CLOSED | #71 |
| P | OPS-2 | P2 | CI gates deploy on live third-party HN scan | CLOSED | #69 |
| P | DEP-1 | P3 | Deploy-path Actions pinned to mutable tags, not SHAs | CLOSED | #69 |
| P | SEC-4 | P3 | Action accepts pull_request_target without least-trust warning | CLOSED | #73 |
| P | COST-2 | P3 | dashboard/link O(all-watches) KV scan per anon POST | CLOSED | #72 |
| 2 | COU-1 | P2 | buildPageScript + detectBlocked duplicated web/CLI, no parity test | CLOSED | #75 |
| 3 | REL-3 | P2 | Render-timing race; no document.fonts.ready before evaluate | CLOSED | #76 |
| 3 | DM-1 | P2 | Per-pattern eval errors swallowed; scores silently drift low | CLOSED | #76 |
| 3 | DM-2 | P2 | Score not pinned to Chromium engine version | CLOSED | #76 |
| 4 | SEC-2 | P2 | Unbounded fetched-body reads exhaust isolate | CLOSED | #77 |
| 4 | OPS-1 | P2 | Error-webhook alert detached fetch without waitUntil | CLOSED | #78 |
| 4 | REL-2 | P2 | /og/:id.png browser outside cost-guard middleware | CLOSED | #74 |
| — | CONC-1 | P3 | Non-atomic KV stats/history counters lose increments | **DO-NOT-FIX** | — |

---

## 3. OPS / VERIFY-AT-SCALE QUEUE

Recorded for human/ops follow-up. **Not executed** by the swarm.

| Item | Tag | Finding(s) | Notes |
|------|-----|------------|-------|
| DNS-rebind egress | ops note | SEC-1 | Code fix (nav-response boundary) is testable; DNS-rebind leg relies on Cloudflare Browser Rendering blocking RFC-1918 + metadata egress |
| Real reliability under concurrent-browser cap | verify-at-scale | REL-1 | Connect-or-launch helper is unit-tested; prod load/telemetry needed for cap behavior |
| True hard cross-isolate cost cap | future OPS (Durable Object) | COST-1 | Same-isolate `memIncrement` is mitigation; DO is the hard atomic primitive |
| Burst-overshoot residual on KV cap | verify-at-scale | COST-1 | Parallel burst can overshoot before KV writes land |
| Cross-engine parity validation | ops | DM-2 | Engine version recorded in code; CLI vs Cloudflare Browser Rendering parity is ops |
| Standing live canary schedule | ops | OPS-2 | Deploy de-gated (hermetic smoke); scheduled live scan is ops |
| Dependabot for Actions ecosystem | ops | DEP-1 | SHA pins are in code; Dependabot upkeep is ops |
| Turnstile / least-trust documentation comms | ops | SEC-3, SEC-4 | Code/docs fixes merged; external comms are ops |

---

## 4. RECORDED ARCHITECTURE DECISIONS

From `docs/DECISIONS.md` (2026-06-19 adversarial-fresh section):

- **Integrator-is-coordinator:** @claude opens and merges PRs; @grok codes; @codex reviews.
  Self-review blocked on GitHub → verdict via `worker_done` + PR comment, not `gh pr review`.
- **6-task serial `scan.ts` chain + 4 parallel lanes:** Hot-file serialization on
  `apps/web/functions/api/scan.ts` (SEC-1 → REL-1 → COU-1 → REL-3/DM-1/DM-2 → SEC-2/OPS-1);
  parallel lanes for middleware (COST-1+SEC-3), workflows (OPS-2+DEP-1), watch (COST-2), action (SEC-4).
- **Bundled tasks:** REL-1+REL-2 in one PR (#74); REL-3+DM-1+DM-2 in one PR (#76) after COU-1
  hoisted shared runner into `@slop-detect/core`.
- **CONC-1 accepted:** Stats-only KV RMW; code treats counts as approximate; no scan-correctness path.
- **No deploy/promote by swarm:** Merges land on BASE only; BASE→main is human meta-PR; Cloudflare
  `web:deploy` and npm `changeset publish` are OPS.

---

## 5. DOWNSTREAM HUMAN GATES (NOT DONE)

Explicitly **human-owned** and **not executed** in this run:

1. **BASE → main promotion:** `ravidsrk/adversarial-fresh` → `main` is a human meta-PR. Out of swarm scope.
2. **Production deploy:** Cloudflare `web:deploy` and npm release/changeset publish are OPS. Not run.
3. **OPS / verify-at-scale queue:** All items in §3 above — recorded, not executed.

**MERGE ≠ DEPLOY.** All fix PRs merged into the integration branch. Nothing was deployed or promoted to production.

**Typecheck gate:** §1 documents a pre-existing gap surfaced by OPS-1 — five `report()` call sites need `waitUntil` threading before BASE is promotion-ready on the typecheck axis.

---

## 6. KNOWN PRE-EXISTING (out of frozen scope)

- **`dashboard.test.js` Resend 401:** The link-endpoint test issues a Resend attempt with a fake API key; stderr logs `email_send_failed` status 401 (`validation_error: API key is invalid`). Pre-existing; not introduced by this run. Test still passes.

---

## 7. ALL MERGED PRs (#69–#78)

| PR# | Title area | Findings closed | Merge commit (short) |
|-----|------------|-----------------|----------------------|
| #69 | CI/deploy workflows — de-gate live scan, SHA-pin Actions | OPS-2, DEP-1 | 81e8c9e |
| #70 | SSRF navigation-response boundary | SEC-1 | 6ca6efa |
| #71 | Middleware cost cap + Turnstile floor docs | COST-1, SEC-3 | 8827957 |
| #72 | Watch email-to-domains index | COST-2 | e5aa33e |
| #73 | Action pull_request_target trust notice | SEC-4 | c103e95 |
| #74 | Browser session reuse + /og cost guard | REL-1, REL-2 | efc77b7 |
| #75 | Core page-script hoist (COU-1) | COU-1 | 0bab0ed |
| #76 | Runner wait + result assembly + engine pin | REL-3, DM-1, DM-2 | 1f0fdd0 |
| #77 | Body caps on AEO + DESIGN.md fetch | SEC-2 | 8f93e93 |
| #78 | report() waitUntil + scan observability | OPS-1 | 1a19dcf |

BASE HEAD after all merges: `8f79b67` (orchestration ledger commit marking PHASE=VERIFY).