# GAPS.md — gap register (frozen with DEFINITION.md)

## Above the line — FINISH (in PLAN.md)

| ID | Source | Angle | Flow | Sev | Tasks | One-line rationale |
|---|---|---|---|---|---|---|
| G-01 | F-4-02/CF-04 partial | 2 | CF-04 | S0 | T-15 | Monitor flow unverified; agent part + H-02/H-03 |
| G-02 | CF-02 partial | 2 | CF-02 | S0 | T-14 | CLI partial uncharacterized; fix or re-scope |
| G-03 | #100 over-flagging | 2 | CF-01 | S1 | T-17 | Canonical sites mis-scored; bounded fix-or-BLOCKED |
| G-04 | F-9-01 | 9 | CF-01 | S1 | T-22 | No request IDs = untraceable failures |
| G-05 | F-9-02 | 9 | CF-01 | S1 | T-24 | No metrics on critical flows |
| G-06 | F-9-03 | 9 | CF-01 | S1 | T-25 | No proven alert on CF failure |
| G-07 | F-8-01 | 8 | CF-01 | S1 | T-23 | No health/readiness endpoint |
| G-08 | F-8-03 | 8 | CF-01 | S1 | T-26 | No retry/backoff on external calls |
| G-09 | F-8-05/06 | 8 | — | S1 | T-28 | No runbooks/capacity/incident lines |
| G-10 | F-7-03 | 7 | — | S1 | T-29 | No staging story (preview-based) |
| G-11 | F-7-04 | 7 | — | S1 | T-29 | KV namespaces manual; script + doc |
| G-12 | F-7-05 + R-01 | 7 | — | S1 | T-27 | Rollback exists, never rehearsed |
| G-13 | F-6-06 + R-02 | 6 | — | S1 | T-08 | Backup never performed; script + local rehearsal |
| G-14 | F-6-02/03 | 6 | — | S1 | T-10 | TTL map missing; stats keys unbounded |
| G-15 | F-15-02 + L1 | 15 | — | S1 | T-30 | No Terms of Service |
| G-16 | F-15-04 + R-04 | 15 | CF-04 | S1 | T-31 | Mail lacks postal + 1-click unsub + honor path |
| G-17 | F-6-04 + L3/L5 | 6 | CF-05 | S1 | T-32 | No export/delete path for user data |
| G-20 | F-5 hist | 5 | — | S1 | T-07 | Secret-history scan never run (verify-first) |
| G-21 | F-5-06 | 5 | — | S1 | T-06 | No dependency-audit baseline |
| G-22 | F-5 authz | 5 | CF-04/05 | S1 | T-09 | AuthZ matrix unverified in tests |
| G-23 | F-11-02 | 11 | — | S1 | T-09 | Secret/env matrix undocumented |
| G-18 | #92 goldens | 4 | CF-01 | S2 | T-18a/b/c | Extractor goldens thin; 3 S-sized chunks |
| G-19 | #101 leaderboard | 16 | CF-07 | S2 | T-19a/b | leaderboard.json ungenerated |
| G-24 | F-3-01 | 3 | — | S2 | T-04 | CI gates format only |
| G-25 | F-4-03 | 4 | CF-02 | S2 | T-05 | 10 CLI skips unexplained |
| G-26 | F-4-02 | 4 | all | S2 | T-39 | No E2E suite; S4 scripts become it |
| G-27 | #109 + F-R-11 | 10 | CF-07 | S2 | T-11 | Counter atomicity unverified; bounded |
| G-28 | F-R-12 | 10 | — | S2 | T-11 | KV limits vs usage undocumented |
| G-29 | F-R-08 | 11 | CF-07 | S2 | T-12 | Image API version exposure (verify-first) |
| G-30 | F-13-03 | 13 | CF-01 | S2 | T-20 | Modal focus-trap missing |
| G-31 | F-14-04 | 14 | — | S2 | T-21 | Spec-vs-engine drift |
| G-32 | F-16-03 | 16 | all | S2 | T-35 | No analytics on critical flows |
| G-33 | F-17-01/02 | 17 | — | S2 | T-28 | No inventory/recovery doc |
| G-34 | F-15-05 + L3 | 15 | — | S2 | T-30 | Privacy notice vs DPDP/GDPR |
| G-35 | F-15 ret | 15 | — | S2 | T-32 | Retention policy unwritten |
| G-39 | F-R-14 | 5 | CF-01 | S2 | T-13 | Headers review + security.txt |
| G-40 | F-R-15 | 5 | CF-01 | S2 | T-13 | Edge/WAF posture undocumented |
| G-41 | F-16-04 | 16 | — | S3 | T-36 | Support channel undefined (doc GH-only) |
| G-42 | F-16-01 | 16 | — | S2 | T-38 | Landing/pricing truthfulness pass |
| G-43 | F-R-09 | 16 | CF-04 | S2 | T-37 | Email-auth procedure + post-verify check |
| G-44 | F-9-05 | 9 | all | S2 | T-24 | No flow dashboards (stats surface) |
| G-46 | F-R-09 | 11 | CF-04 | S2 | T-31 | Bounce handling missing |
| G-47 | #99 tooling | 4 | CF-01 | S2 | T-19c | Calibration harness runnable + documented |
| G-36 | F-R-06 | 14 | — | S3 | T-03 | LICENSE/notice hygiene (trivial, P1) |
| G-37 | bun drift | 3 | — | S3 | T-02 | Pin 1.3.5 vs running 1.4.2 |
| G-38 | branches | 3 | — | S3 | T-01 | 5 merged remotes unpruned |
| G-48 | F-2-05 301 | 2 | — | S2 | T-16 | CUT: stub route removed, not hidden |

## Below the line

| ID | Source | Sev | Decision | Note |
|---|---|---|---|---|
| G-50 | #102 billing | S3 | DEFER | Owner-gated post-launch; S5-C issue |
| G-51 | F-4-01 coverage | S3 | DEFER | No coverage gate; post-launch issue |
| G-52 | F-3-03 big files | S3 | DEFER | Refactor; post-launch issue |
| G-53 | F-R-07/10 majors | S3 | DEFER | eslint-10/vitest-4+; verify EOL at pickup |
| G-54 | F-6-04 enc | S3 | DEFER | App-layer email encryption; post-launch |
| G-45 | F-9-04 Logpush | S2 | ACCEPT | Paid; webhook suffices. Expiry 2027-03-14 |
| G-57 | F-16-04 support | S3 | ACCEPT | GitHub-issues-as-support, documented (T-36). No expiry (model, not risk) |
| (—) | F-R-04 CERT 6h | — | NO-EFFECT | Not a provider/VPS/VDA; stance in runbook |

Cut line: everything FINISH above + gate proofs are the plan. Counts: S0 2 · S1 19 · S2 22 · S3 5 · CUT 1 · DEFER 5 · ACCEPT 2.
