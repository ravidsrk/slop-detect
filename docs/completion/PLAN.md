# PLAN.md — phased implementation (frozen with DEFINITION.md)

Order rule: deps first, then S0→S1→S2, smallest-first. H-blocked tasks convert to CONDITIONAL-GO
conditions (S3 exit allows BLOCKED-with-H); they never halt a phase (A-08).

## P1 Green baseline — exit: cold start passes; CI green on main; branch list clean

Order: T-04, T-06, T-07, T-05, T-01, T-02, T-03.

- **T-01** (S): Delete 5 merged remote branches. Gaps G-38. Acceptance: evidence/T-01-branches.txt (`git branch -r` clean).
- **T-02** (S): Resolve bun drift (adopt 1.4.2 pin or re-pin 1.3.5 + verify). Gaps G-37. Acceptance: evidence/T-02-bun.txt (frozen install 0).
- **T-03** (S): Release hygiene: version-sync check core/cli/mcp + LICENSE/notice pass. Gaps G-36. Acceptance: evidence/T-03-versions.txt.
- **T-04** (S): Gate lint + typecheck in CI (not format-only). Gaps G-24. Acceptance: evidence/T-04-ci.txt (CI run green w/ new jobs).
- **T-05** (S): CLI 10 skips: unskip or document each. Gaps G-25. Acceptance: evidence/T-05-skips.txt (0 unexplained skips).
- **T-06** (S): Dependency-audit baseline; fix criticals or disposition via H/DEFER with reachability analysis. Gaps G-21. Acceptance: evidence/T-06-audit.txt (before), evidence/T-06-audit-after.txt, evidence/T-06-gate.txt (triage).
- **T-07** (S): Secret-history scan (`git log -p` patterns). Gaps G-20. Acceptance: evidence/T-07-secrets.txt (clean cert or S0 escalation).

## P2 Safety & kill switches — exit: backup rehearsed; secrets clean; authz closed; criticals fixed or dispositioned

Order: T-10, T-13, T-08, T-09, T-11, T-12.

- **T-08** (M): KV backup script + restore rehearsal (local KV; prod run = H-01). Gaps G-13. Acceptance: evidence/T-08-restore.txt.
- **T-09** (M): AuthZ matrix verify + tests; secret/env matrix doc. Gaps G-22, G-23. Acceptance: evidence/T-09-authz.txt.
- **T-10** (S): TTL map doc + TTL on stats keys. Gaps G-14. Acceptance: evidence/T-10-ttl.txt.
- **T-11** (M): KV counter atomicity + limits review (#109); fix-or-document bounded. Gaps G-27, G-28. Acceptance: evidence/T-11-kv.txt.
- **T-12** (S): Image-API version exposure check (verify-first). Gaps G-29. Acceptance: evidence/T-12-img.txt.
- **T-13** (S): Security-headers review + security.txt + edge/WAF note. Gaps G-39, G-40. Acceptance: evidence/T-13-headers.txt.

## P3 Critical flows — exit: each flow happy+failure evidenced; CUTs deleted

Order: T-14, T-15, T-17, T-16, T-20, T-21, T-18a, T-18b, T-18c, T-19a, T-19b, T-19c.

- **T-14** (M): CF-02 CLI partial: characterize; fix or re-scope + tests. Gaps G-02. Acceptance: evidence/T-14-cli.txt.
- **T-15** (M): CF-04 fail-closed verify + tests sans secrets; sandbox guide. Gaps G-01. Acceptance: evidence/T-15-watch.txt.
- **T-16** (S): CUT 301 stub (+ dead surfaces found). Gaps G-48. Acceptance: evidence/T-16-cut.txt (routes gone, tests green).
- **T-17** (M): #100 over-flagging repro + bounded fix-or-BLOCKED. Gaps G-03. Acceptance: evidence/T-17-calibration.txt.
- **T-18a/b/c** (S×3): Golden coverage thirds (extractors 1–9/10–18/19–27). Gaps G-18. Acceptance: evidence/T-18a/b/c-goldens.txt.
- **T-19a** (S): leaderboard.json generator. Gaps G-19. Acceptance: evidence/T-19a-leaderboard.txt.
- **T-19b** (S): Commit leaderboard + verify /dir + launch-data note. Gaps G-19. Acceptance: evidence/T-19b-leaderboard.txt.
- **T-19c** (S): Calibration harness runnable + documented (#99 agent part). Gaps G-47. Acceptance: evidence/T-19c-harness.txt.
- **T-20** (S): Modal focus-trap fix. Gaps G-30. Acceptance: evidence/T-20-trap.txt.
- **T-21** (S): Spec-vs-engine drift fix. Gaps G-31. Acceptance: evidence/T-21-spec.txt (counts match).

## P4 Operability — exit: alert proven; rollback rehearsed; runbooks top-5; health wired

Order: T-23, T-22, T-24, T-25, T-26, T-28, T-29, T-27.

- **T-22** (M): Request IDs + JSON log standard across functions. Gaps G-04. Acceptance: evidence/T-22-reqid.txt.
- **T-23** (S): Health/readiness endpoint + test. Gaps G-07. Acceptance: evidence/T-23-health.txt.
- **T-24** (M): Metrics on critical flows via stats surface (+ dashboard). Gaps G-05, G-44. Acceptance: evidence/T-24-metrics.txt.
- **T-25** (M): ERROR_WEBHOOK alert path + prove it fires (local catcher; prod URL = H-07). Gaps G-06. Acceptance: evidence/T-25-alert.txt.
- **T-26** (M): Retry/backoff on external calls (Resend, fetch, browser). Gaps G-08. Acceptance: evidence/T-26-retry.txt.
- **T-27** (M): Rollback rehearsal on preview + runbook (needs H-01). Gaps G-12. Acceptance: evidence/T-27-rollback.txt.
- **T-28** (M): Runbooks top-5 + capacity doc + incident 3-liner + inventory/recovery. Gaps G-09, G-33. Acceptance: evidence/T-28-runbooks.txt.
- **T-29** (M): Staging story: preview deploys + branch controls + KV namespaces (needs H-01). Gaps G-10, G-11. Acceptance: evidence/T-29-staging.txt.

## P5 Compliance & legal — exit: legal pages live; export/delete works; retention set; H filed

Order: T-30, T-31, T-32.

- **T-30** (M): Terms page + privacy review (DPDP/GDPR task-time verify). Gaps G-15, G-34. Acceptance: evidence/T-30-terms.txt.
- **T-31** (M): Mail footer (postal + unsub) + List-Unsubscribe + bounce path. Gaps G-16, G-46. Acceptance: evidence/T-31-mail.txt.
- **T-32** (M): Data export/delete path + retention doc. Gaps G-17, G-35. Acceptance: evidence/T-32-rights.txt.

## P6 Launch surfaces — exit: analytics fire; email auth passes; support + pricing truthful

(Billing E2E dropped — G-50 DEFERRED per owner #102 gating. Deviation A-07.)

Order: T-36, T-37, T-38, T-35.

- **T-35** (M): Analytics events on every critical flow + verify. Gaps G-32. Acceptance: evidence/T-35-analytics.txt.
- **T-36** (S): Support channel doc (GH-issues model). Gaps G-41, G-57. Acceptance: evidence/T-36-support.txt.
- **T-37** (S): Email-auth procedure + post-verify check (needs H-03). Gaps G-43. Acceptance: evidence/T-37-emailauth.txt.
- **T-38** (S): Landing/pricing truthfulness pass. Gaps G-42. Acceptance: evidence/T-38-truth.txt.

## P7 Rehearsal prep — exit: S4 can begin without setup work

Order: T-39, T-40.

- **T-39** (M): S4 flow scripts (happy + failure × 7 flows) + evidence harness. Gaps G-26. Acceptance: evidence/T-39-scripts.txt.
- **T-40** (S): Rehearsal env ready (local KV + preview pointers). Gaps gate. Acceptance: evidence/T-40-env.txt.

## Plan summary

- 42 tasks: P1 7 · P2 6 · P3 12 · P4 8 · P5 3 · P6 4 · P7 2. Sizes: 23 S · 19 M · 0 L.
- Severity (FINISH gaps): S0 2 (T-14, T-15) · S1 19 · S2 21 · S3 4 (T-01/02/03/36).
- Longest chain: T-04 → … → T-39 → S4 (phases strictly sequential; ~7 serial gates).
- Human Actions gating launch: H-01..H-05. No TARGET_DATE → dependency order, no dates invented.
- S2 exit: every above-line G-NN → ≥1 T-NN ✓ · every T-NN has acceptance evidence ✓ · no L ✓ ·
  H filed ✓ · resume pointer P1/T-04 (first in P1 order).

