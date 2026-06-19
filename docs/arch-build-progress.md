# arch-build-progress (ledger) — adversarial fresh run

This file is the coordinator's external brain. A fresh coordinator must be able to resume from
it alone. Source of truth for phase, finding close-index, task rows, PRs, OPS/verify queue.

## PHASE

PHASE=REVIEW

(REVIEW → REVIEW_FROZEN → FIXING → VERIFY)

## Run constants

- REPO_ROOT: /Users/ravindra/orca/workspaces/slop-detect/piddock
- Orca repoId: 54ec0c56-dce7-404f-8e5e-e6ca2e8bd004
- BASE: ravidsrk/adversarial-fresh (off main @07fe6db)
- MAINTAINER: Ravindra Kumar <ravidsrk@gmail.com>
- Coordinator terminal HANDLE: term_38635af5-64d4-468e-82a2-37022c1016fa (piddock worktree, branch BASE)
  ALWAYS scope `check --wait --terminal term_38635af5-64d4-468e-82a2-37022c1016fa` — runtime is shared with
  other projects (marketintell/krawl/praxis); an unscoped wait catches THEIR worker_done and wakes falsely.
- Review doc (frozen source of truth): docs/adversarial-review-fresh.md
- Decisions: docs/DECISIONS.md (2026-06-19 section)

## Live workers / branches / handles

- P0-REVIEW: task_f334ea4f48fe → @claude term_deffec33. DONE: docs/adversarial-review-fresh.md (f0eaed4),
  16 findings. Task status=completed.
- P0-SKEPTIC: task_7fb0f46ea2bc / dispatch 9492926a-dba0-4def-83ac-dfd116cb4cf2 → worker
  term_1a124df4-3893-42a0-96c3-495c933ca009 (@codex) SAME worktree adv-review / branch ravidsrk/adv-review.
  Verifying 16 findings inline. STATUS: in-flight (working).
  NOTE: codex 0.141.0 has no --full-auto; launched `codex --ask-for-approval never --sandbox danger-full-access`;
  dispatch --inject did NOT submit into codex TUI — sent task directly via terminal send referencing
  /tmp/p0-skeptic-spec.txt. For future codex workers, prefer the direct-send pattern.

(NOTE: runtime-global task_31647a2df39c "P0-REVIEW" is a KRAWL review on term_a590f933 — NOT mine, do not touch.)

## FINDING CLOSE-INDEX

(populated at BOOTSTRAP from the frozen review's CONFIRMED set, grouped by wave)

## TASK ROWS

(one row per dispatched fix task; populated in Phase 1)

Schema:
`TASK <slug> | WAVE=<n> | FILE=<hot-file|indep> | LANE=<CODE|CODE+OPS> | CLOSES=[ids] | CODED=<t/f> PR_OPEN=<t/f> REVIEWED=<t/f> MERGED=<t/f> ACCEPT=<t/f> | OPS=<none|action> | PR#<n|-> | WT=<id|active> | WORKER=<handle> | NOTE=<…>`

## HOT-FILE COLLISION MAP

(populated at BOOTSTRAP)

## OPS / VERIFY-AT-SCALE QUEUE (recorded, not executed)

(none yet)

## RECORDED ARCHITECTURE DECISIONS

- See docs/DECISIONS.md 2026-06-19 section.

## NEXT READY WAVE

- Phase 0: dispatch P0-REVIEW (@claude, fresh worktree off BASE) → P0-SKEPTIC (@codex) → freeze.
