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
- wf-ops2-dep1: PR#69 | review FAIL round1 (codex caught schedule->prod-deploy path). grok term_3ad5de70
  FIXING round1 (task_2245f9241a09/ctx_ddedae7f401e). SHAs+hermetic smoke already validated.
- sec1-ssrf-boundary: PR#70 | codex review term_46b9493d task_c0e46c3a613a/ctx_aa88d0ae6075 | REVIEWING
  (CRITICAL PATH — rel1 + whole scan.ts chain unblocks on this MERGE)
- mw-cost1-sec3: PR#71 | codex review term_1e34b9aa task_e3484a999d87/ctx_7312d0d726a7 | REVIEWING
- watch-cost2-index: PR#72 | codex review term_001ff625 task_7116c1318fde/ctx_1a72888428e0 | REVIEWING
Action lane (SEC-4) HELD until a slot frees + chain moving. NOTE: gh self-review blocked → verdict via
worker_done + PR comment (see DECISIONS). Merge policy: gh pr merge --merge after worker_done verdict=approve.
PR-open + merge done by me (integrator). Codex reviewer lives in the coder's worktree (node_modules + branch there).
NOT STARTED: scan.ts chain T2 rel1 (after sec1 MERGES — collides on scan.ts), T3 cou1, T4 rel3-dm1-dm2,
sec2, ops1; parallel lane action-sec4 (spec ready /tmp/spec-action.txt).
Review spec files: /tmp/spec-review-wf-final.txt (template /tmp/spec-review-wf.txt has __REVIEW_TASK__/__DISPATCH__).

## FINDING CLOSE-INDEX (15 confirmed; CONC-1 = do-not-fix)

Serial chain on hot file scan.ts (one in-flight at a time, dependency order):
- WAVE 1 (P1, highest stakes): SEC-1 OPEN | REL-1 OPEN (REL-1 bundled with REL-2)
- WAVE 2 (FOUNDATION): COU-1 OPEN
- WAVE 3 (P2 on slimmed runner, after COU-1): REL-3 OPEN | DM-1 OPEN | DM-2 OPEN
- WAVE 4 (P2 remaining scan.ts/coupled): SEC-2 OPEN | OPS-1 OPEN | REL-2 OPEN (bundled into REL-1 task)

Parallel independent lanes (run concurrently from t0, no scan.ts collision):
- LANE-MW: COST-1 OPEN | SEC-3 OPEN  (apps/web/functions/api/_middleware.ts)
- LANE-WF: OPS-2 OPEN | DEP-1 OPEN  (.github/workflows/ci.yml + deploy.yml)
- LANE-WATCH: COST-2 OPEN  (apps/web/functions/api/watch.ts + _data.ts)
- LANE-ACTION: SEC-4 OPEN  (packages/action + README)

DO-NOT-FIX: CONC-1 (stats-only KV RMW; code treats stats as approximate; no scan-correctness path depends).

## TASK ROWS

Schema: TASK <slug> | WAVE | FILE | LANE | CLOSES=[ids] | CODED PR_OPEN REVIEWED MERGED ACCEPT | OPS | PR# | WT | WORKER | NOTE

- TASK sec1-ssrf-boundary | WAVE=1 | FILE=scan.ts(HOT) | LANE=CODE | CLOSES=[SEC-1] | CODED=t PR_OPEN=t REVIEWED=f MERGED=f ACCEPT=f | OPS=dns-rebind-egress-note | PR#70 | WT=fix-sec1 | WORKER=grok term_983afb42 | NOTE=24de26c; codex review task_c0e46c3a613a/ctx_aa88d0ae6075 term_46b9493d IN PROGRESS
- TASK rel1-browser-reuse | WAVE=1 | FILE=scan.ts(HOT)+og | LANE=CODE | CLOSES=[REL-1,REL-2] | CODED=f PR_OPEN=f REVIEWED=f MERGED=f ACCEPT=f | OPS=verify-at-scale(concurrency-cap) | PR#- | WT=- | WORKER=- | NOTE=new functions/_browser.ts connect-or-launch (VERIFY @cloudflare/puppeteer sessions()/connect() exists first); og honors SCAN_DISABLED; depends sec1 merged
- TASK cou1-core-runner | WAVE=2 | FILE=scan.ts(HOT)+detector.ts | LANE=CODE | CLOSES=[COU-1] | CODED=f PR_OPEN=f REVIEWED=f MERGED=f ACCEPT=f | OPS=none | PR#- | WT=- | WORKER=- | NOTE=hoist buildPageScript+ctx+detectBlocked to @slop-detect/core; snapshot parity test; depends rel1 merged
- TASK rel3-dm1-dm2-runner | WAVE=3 | FILE=scan.ts(HOT)+detector.ts+core | LANE=CODE | CLOSES=[REL-3,DM-1,DM-2] | CODED=f PR_OPEN=f REVIEWED=f MERGED=f ACCEPT=f | OPS=dm2-engine-pin | PR#- | WT=- | WORKER=- | NOTE=fonts.ready+unified wait; patternsErrored; engine/browserVersion in result; depends cou1 merged
- TASK sec2-body-caps | WAVE=4 | FILE=aeo.ts+scan.ts(HOT) | LANE=CODE | CLOSES=[SEC-2] | CODED=f PR_OPEN=f REVIEWED=f MERGED=f ACCEPT=f | OPS=none | PR#- | WT=- | WORKER=- | NOTE=readCapped on all aeo bodies + scan DESIGN.md stream-cap; depends rel3-dm1-dm2 merged (scan.ts)
- TASK ops1-report-waituntil | WAVE=4 | FILE=_report.ts+scan.ts(HOT) | LANE=CODE | CLOSES=[OPS-1] | CODED=f PR_OPEN=f REVIEWED=f MERGED=f ACCEPT=f | OPS=none | PR#- | WT=- | WORKER=- | NOTE=thread ctx.waitUntil into report(); emit navMs+patternsErrored; depends sec2 merged (scan.ts)
- TASK mw-cost1-sec3 | WAVE=P | FILE=_middleware.ts | LANE=CODE+OPS | CLOSES=[COST-1,SEC-3] | CODED=t PR_OPEN=t REVIEWED=f MERGED=f ACCEPT=f | OPS=durable-object-hard-cap(record) | PR#71 | WT=fix-mw | WORKER=grok term_1d62134e | NOTE=6b959e4+aaa0855; codex review task_e3484a999d87/ctx_7312d0d726a7 term_1e34b9aa IN PROGRESS
- TASK wf-ops2-dep1 | WAVE=P | FILE=ci.yml+deploy.yml | LANE=CODE+OPS | CLOSES=[OPS-2,DEP-1] | CODED=t PR_OPEN=t REVIEWED=f MERGED=f ACCEPT=f | OPS=canary-schedule+dependabot(record) | PR#69 | WT=fix-wf | WORKER=grok term_3ad5de70 | NOTE=2 commits, 40-char SHA pins+hermetic smoke; codex reviewing
- TASK watch-cost2-index | WAVE=P | FILE=watch.ts+_data.ts | LANE=CODE | CLOSES=[COST-2] | CODED=f PR_OPEN=f REVIEWED=f MERGED=f ACCEPT=f | OPS=none | PR#- | WT=- | WORKER=- | NOTE=email->domains index key written on subscribe; one get on lookup; PARALLEL
- TASK action-sec4-doc | WAVE=P | FILE=packages/action | LANE=CODE+OPS | CLOSES=[SEC-4] | CODED=f PR_OPEN=f REVIEWED=f MERGED=f ACCEPT=f | OPS=none | PR#- | WT=- | WORKER=- | NOTE=pull_request_target least-trust warning in action.yml/README; optional notice log; PARALLEL

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
