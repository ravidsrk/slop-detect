# arch-build-progress (ledger) — adversarial fresh run

This file is the coordinator's external brain. A fresh coordinator must be able to resume from
it alone. Source of truth for phase, finding close-index, task rows, PRs, OPS/verify queue.

## PHASE

PHASE=FIXING

(REVIEW → REVIEW_FROZEN → FIXING → VERIFY)

## Run constants

- REPO_ROOT: /Users/ravindra/orca/workspaces/slop-detect/piddock
- Orca repoId: 54ec0c56-dce7-404f-8e5e-e6ca2e8bd004
- BASE: ravidsrk/adversarial-fresh (off main @07fe6db); HEAD after review merge = ce4409e
- MAINTAINER: Ravindra Kumar <ravidsrk@gmail.com>
- Coordinator terminal HANDLE: term_38635af5-64d4-468e-82a2-37022c1016fa (piddock worktree, branch BASE)
  ALWAYS scope `check --wait --terminal term_38635af5-64d4-468e-82a2-37022c1016fa` — runtime shared with
  other projects (marketintell/krawl/praxis); unscoped waits catch THEIR worker_done.
- Review doc (FROZEN source of truth): docs/adversarial-review-fresh.md (on BASE)
- Decisions: docs/DECISIONS.md (2026-06-19 section)
- Worker launch: grok → `grok` (auto/skip-permissions). codex → `codex --ask-for-approval never
  --sandbox danger-full-access` (NO --full-auto on 0.141.0). codex `--inject` does NOT submit into the
  TUI — after tui-idle, SEND the task directly via `orca terminal send ... --enter`.
- INTEGRATOR = coordinator (me, @claude): I run `gh pr create` and `gh pr merge` directly (mechanical
  integration, preserves independence since @grok codes and @codex reviews). @grok never reviews own work;
  @codex never writes code.

## Live workers / branches / handles

- P0-REVIEW task_f334ea4f48fe (@claude) DONE → f0eaed4. P0-SKEPTIC task_7fb0f46ea2bc (@codex) DONE → d308509.
  Both merged into BASE @ce4409e. adv-review worktree + skeptic terminal: to retire.

PHASE 1 LIVE STATE (grok --inject WORKS; codex needs direct terminal-send of the spec file):
CLOSED so far (6/15): SEC-1 (#70), COST-1 (#71), SEC-3 (#71), OPS-2 (#69), DEP-1 (#69), SEC-4 (#73). BASE @c103e95.
IN-FLIGHT:
- rel1-browser-reuse [REL-1,REL-2]: PR#74 | grok term_40669fad FIXING round1 — codex confirmed REL-1 +
  session API + all tests, but caught REL-2 gap (SCAN_DISABLED checked AFTER /og cache lookup → disabled
  cache-hit serves rendered image). Fix = move kill-switch above cache lookup. (CRITICAL PATH → cou1.)
- watch-cost2-index [COST-2]: PR#72 | codex term_001ff625 RE-REVIEW round2 (grok moved rate-limit/send into
  waitUntil to equalize latency; reviewer re-checking timing oracle is gone).
QUEUED (scan.ts chain, serial, after rel1 #74 merges): cou1 (foundation) → rel3-dm1-dm2 → sec2 → ops1.
All 4 parallel lanes done/closing; remaining work is mostly the serial scan.ts chain (inherent critical path).
NOTE: gh self-review blocked → verdict via worker_done + PR comment (see DECISIONS). Merge: gh pr merge --merge
after worker_done verdict=approve; conflict-check via git merge-tree first; retire worktree after merge.
PR-open + merge done by me (integrator). Codex reviewer lives in the coder's worktree (node_modules + branch there).
NOT STARTED: scan.ts chain T2 rel1 (after sec1 MERGES — collides on scan.ts), T3 cou1, T4 rel3-dm1-dm2,
sec2, ops1; parallel lane action-sec4 (spec ready /tmp/spec-action.txt).
Review spec files: /tmp/spec-review-wf-final.txt (template /tmp/spec-review-wf.txt has __REVIEW_TASK__/__DISPATCH__).

## FINDING CLOSE-INDEX (15 confirmed; CONC-1 = do-not-fix)

Serial chain on hot file scan.ts (one in-flight at a time, dependency order):
- WAVE 1 (P1, highest stakes): SEC-1 CLOSED via PR#70 | REL-1 IN-FLIGHT (bundled w/ REL-2, fix-rel1)
- WAVE 2 (FOUNDATION): COU-1 OPEN (starts after rel1 merges — scan.ts collision)
- WAVE 3 (P2 on slimmed runner, after COU-1): REL-3 OPEN | DM-1 OPEN | DM-2 OPEN
- WAVE 4 (P2 remaining scan.ts/coupled): SEC-2 OPEN | OPS-1 OPEN | REL-2 IN-FLIGHT (bundled into rel1)

Parallel independent lanes (run concurrently from t0, no scan.ts collision):
- LANE-MW: COST-1 CLOSED via PR#71 | SEC-3 CLOSED via PR#71
- LANE-WF: OPS-2 CLOSED via PR#69 | DEP-1 CLOSED via PR#69
- LANE-WATCH: COST-2 IN-FLIGHT (PR#72, round2 review — timing-oracle fix)
- LANE-ACTION: SEC-4 CLOSED via PR#73

DO-NOT-FIX: CONC-1 (stats-only KV RMW; code treats stats as approximate; no scan-correctness path depends).

## TASK ROWS

Schema: TASK <slug> | WAVE | FILE | LANE | CLOSES=[ids] | CODED PR_OPEN REVIEWED MERGED ACCEPT | OPS | PR# | WT | WORKER | NOTE

- TASK sec1-ssrf-boundary | WAVE=1 | FILE=scan.ts(HOT) | LANE=CODE | CLOSES=[SEC-1] | CODED=t PR_OPEN=t REVIEWED=t MERGED=t ACCEPT=t | OPS=dns-rebind-egress-note | PR#70 | WT=retired | WORKER=grok | NOTE=MERGED 6ca6efa; SEC-1 CLOSED; ACCEPT=scan-contract tests pass (codex re-demonstrated)
- TASK rel1-browser-reuse | WAVE=1 | FILE=scan.ts(HOT)+og | LANE=CODE | CLOSES=[REL-1,REL-2] | CODED=f PR_OPEN=f REVIEWED=f MERGED=f ACCEPT=f | OPS=verify-at-scale(concurrency-cap) | PR#- | WT=fix-rel1 | WORKER=grok term_40669fad task_5cfa387a0926 | NOTE=CODING off BASE@8827957; verifying @cloudflare/puppeteer session API first
- TASK action-sec4-doc | WAVE=P | FILE=packages/action | LANE=CODE+OPS | CLOSES=[SEC-4] | CODED=t PR_OPEN=t REVIEWED=t MERGED=t ACCEPT=t | OPS=none | PR#73 | WT=retired | WORKER=grok | NOTE=MERGED c103e95; SEC-4 CLOSED; ACCEPT=notice-on-pr_target test passes; dep add reviewed OK
- TASK cou1-core-runner | WAVE=2 | FILE=scan.ts(HOT)+detector.ts | LANE=CODE | CLOSES=[COU-1] | CODED=f PR_OPEN=f REVIEWED=f MERGED=f ACCEPT=f | OPS=none | PR#- | WT=- | WORKER=- | NOTE=hoist buildPageScript+ctx+detectBlocked to @slop-detect/core; snapshot parity test; depends rel1 merged
- TASK rel3-dm1-dm2-runner | WAVE=3 | FILE=scan.ts(HOT)+detector.ts+core | LANE=CODE | CLOSES=[REL-3,DM-1,DM-2] | CODED=f PR_OPEN=f REVIEWED=f MERGED=f ACCEPT=f | OPS=dm2-engine-pin | PR#- | WT=- | WORKER=- | NOTE=fonts.ready+unified wait; patternsErrored; engine/browserVersion in result; depends cou1 merged
- TASK sec2-body-caps | WAVE=4 | FILE=aeo.ts+scan.ts(HOT) | LANE=CODE | CLOSES=[SEC-2] | CODED=f PR_OPEN=f REVIEWED=f MERGED=f ACCEPT=f | OPS=none | PR#- | WT=- | WORKER=- | NOTE=readCapped on all aeo bodies + scan DESIGN.md stream-cap; depends rel3-dm1-dm2 merged (scan.ts)
- TASK ops1-report-waituntil | WAVE=4 | FILE=_report.ts+scan.ts(HOT) | LANE=CODE | CLOSES=[OPS-1] | CODED=f PR_OPEN=f REVIEWED=f MERGED=f ACCEPT=f | OPS=none | PR#- | WT=- | WORKER=- | NOTE=thread ctx.waitUntil into report(); emit navMs+patternsErrored; depends sec2 merged (scan.ts)
- TASK mw-cost1-sec3 | WAVE=P | FILE=_middleware.ts | LANE=CODE+OPS | CLOSES=[COST-1,SEC-3] | CODED=t PR_OPEN=t REVIEWED=t MERGED=t ACCEPT=t | OPS=durable-object-hard-cap(record) | PR#71 | WT=retired | WORKER=grok | NOTE=MERGED 8827957; COST-1+SEC-3 CLOSED; ACCEPT=middleware tests pass (codex re-demonstrated burst case)
- TASK wf-ops2-dep1 | WAVE=P | FILE=ci.yml+deploy.yml | LANE=CODE+OPS | CLOSES=[OPS-2,DEP-1] | CODED=t PR_OPEN=t REVIEWED=t MERGED=t ACCEPT=t | OPS=canary-schedule+dependabot(record) | PR#69 | WT=retired | WORKER=grok | NOTE=MERGED 81e8c9e; OPS-2+DEP-1 CLOSED; round1 fix removed schedule->prod-deploy path; SHAs verified real
- TASK watch-cost2-index | WAVE=P | FILE=watch.ts+_data.ts | LANE=CODE | CLOSES=[COST-2] | CODED=t PR_OPEN=t REVIEWED=f MERGED=f ACCEPT=f | OPS=none | PR#72 | WT=fix-watch | WORKER=grok term_7278cb4c | NOTE=b22ef97; codex review task_7116c1318fde/ctx_1a72888428e0 term_001ff625 IN PROGRESS

## HOT-FILE COLLISION MAP (serialize)

- apps/web/functions/api/scan.ts (HOTTEST): SEC-1, REL-1, REL-3, DM-1, DM-2, COU-1, OPS-1, SEC-2 →
  serial chain T1→T2→T3→T4→T5→T6 in that order; next starts only after prior PR merges.
- packages/cli/src/detector.ts: COU-1, REL-3, DM-1, DM-2 (coupled to scan.ts via core) → same chain.
- apps/web/functions/og/[id].ts: REL-1, REL-2 → bundled in rel1 task.
- apps/web/functions/api/_middleware.ts: COST-1, SEC-3 → LANE-MW (one task).
- .github/workflows/ci.yml + deploy.yml: OPS-2, DEP-1 → LANE-WF (one task).
- apps/web/functions/_data.ts: COST-2 (+CONC-1 do-not-fix) → LANE-WATCH.
- aeo.ts (SEC-2), _report.ts (OPS-1): single-finding, inside the chain.

## OPS / VERIFY-AT-SCALE QUEUE (recorded, not executed)

- SEC-1: DNS-rebind leg cannot close inside Workers → deploy relies on Cloudflare Browser Rendering blocking
  RFC-1918 + metadata egress. CODE fix (nav-response boundary) is testable; DNS-rebind = OPS note. → arch-ops-actions.
- REL-1: code fix (connect-or-launch helper) testable via mock; real reliability under the platform
  concurrent-browser cap = VERIFY_AT_SCALE (load/prod telemetry the swarm can't see).
- COST-1: same-isolate memIncrement is a mitigation; true hard cross-isolate cap = Durable Object (record as
  future OPS); cap-overshoot-on-burst residual = VERIFY_AT_SCALE.
- DM-2: record engine version (code, testable); actually pinning/validating cross-engine parity = OPS.
- OPS-2: de-gate deploy (code); standing live canary schedule = OPS. DEP-1: SHA-pin (code); Dependabot = OPS.
- SEC-3/SEC-4: documentation of the real floor / least-trust guidance (code/docs); comms = OPS.

## RECORDED ARCHITECTURE DECISIONS

- See docs/DECISIONS.md 2026-06-19 section. Integrator-is-coordinator; 6 serial scan.ts tasks + 4 parallel
  lanes; REL-1+REL-2 bundled; REL-3+DM-1+DM-2 bundled (all in core post-COU-1); CONC-1 do-not-fix.

## NEXT READY WAVE

- START concurrently: sec1-ssrf-boundary (scan.ts chain head) + the 4 parallel lanes (mw, wf, watch, action).
  Cap my concurrency ~3-4 (machine already busy with other projects). Feed scan.ts chain T2.. as PRs merge.
