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
- Coordinator terminal: piddock worktree, branch BASE
- Review doc (frozen source of truth): docs/adversarial-review-fresh.md
- Decisions: docs/DECISIONS.md (2026-06-19 section)

## Live workers / branches / handles

(none yet)

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
