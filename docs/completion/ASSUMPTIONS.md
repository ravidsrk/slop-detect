# ASSUMPTIONS.md — decision ledger

- **A-01 (S1):** MODE=drive (default); REPO_PATH=/Users/ravindra/projects/slop-detect;
  PRODUCT inferred as AI-slop scanner from README/package/landing. Rejected: evaluate/plan modes.
- **A-02 (S1):** Keep provisional 3s on angles 5/10/11/13 flagged; S2 must anchor or downgrade.
  Rejected: silent accept, blanket downgrade. Reason: inspection happened, pointers were compressed.
- **A-03 (S1):** A12 N/A recorded as score 4 in status.json for schema compat but EXCLUDED from
  completion math (weight redistributed → 59.7%). Rejected: score 0 (would punish unfairly).
- **A-04 (S1):** Cold start = frozen-lockfile install + build + full test in-place, not rm+reclone.
  Rejected: destructive fresh clone (reserved for S4). Reversible, same signal.
- **A-05 (S2):** #100 over-flagging is S1 not S0. Rejected: S0 (flow completes; would force NO-GO on BLOCKED).
- **A-06 (S2):** A10 downgraded 3→2; completion 59.7→58.4. Rejected: keeping an unanchored 3.
- **A-07 (S2):** P6 billing E2E dropped (G-50 DEFER per owner #102). Rejected: building billing in this run.
- **A-08 (S2):** H-blocked tasks → CONDITIONAL-GO conditions, never halt phases. Rejected: halt on H-block.
- **A-09 (S3/T-04):** .astro files outside the eslint gate accepted: example builds compile .astro
  in CI; eslint-plugin-astro disproportionate for demos. Rejected: new parser dep for examples.
- **A-10 (S3/review):** Correcting wrong summary arithmetic (counts, pins) to match frozen register
  rows preserves the S2 freeze; rows/decisions/scopes unchanged (G-53 note broadened to name the
  astro major it already covered by class). Rejected: leaving known-wrong summaries frozen.
- **A-11 (2026-10-19 R4 delta resume):** `SHIPLOG.md` existed with `6770c58` ancestor of `HEAD` (`cdd58e1`)
  and 74/433 tracked files (`17.09% < 20%`) modified since last completion commit (`48cb3cb`). Resumed
  per R4 without resetting the frozen `DEFINITION.md`, audited the 2026 UI/UX + 4-axis feature completion
  delta across `core`/`cli`/`mcp`/`action`/`web`/`spec`, ran `review: manual` (R11, no external review CLI
  in container), and re-executed S1 cold-start + S4 E2E & dogfood verification (`646/646` unit tests,
  `24 pass / 4 skip / 0 fail` S4 suite, `0/100 Clean A+` design+copy, `100/100 Aligned` `DESIGN.md`,
  `100/100 AI-Ready` AEO).

