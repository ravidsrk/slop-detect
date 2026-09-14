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
