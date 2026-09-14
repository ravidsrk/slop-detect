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
- Review: greptile local (see below).
- second look: left the stale `npm test` wording in the golden header alone (cosmetic; S4 owns docs).
- resume_pointer: P1/T-01
