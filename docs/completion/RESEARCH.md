# RESEARCH.md — S2-A (run 20260914-S1)

## Track A — Internal archaeology (parent-verified core + child detail)

- **Velocity:** 297 commits total. Active days: 05-26(7) 05-28(1) 05-29(15) 06-05(9) 06-10(6)
  06-13(13) 06-14(46) 06-17(56) 06-19(85 peak) 06-28(14) 08-29(45). Gaps: Jun 20–27,
  Jun 29–Aug 28 (61d), Aug 30–Sep 14 idle. Last coherent milestone: Aug 29 batch (#105–118, 12 closes).
- **Branches (all fully merged, 0 ahead — DELETE):** adversarial-fresh 60/0, adversarial-release-review 49/0,
  final-shipping 144/0, scan-to-result-page 130/0, ui-ux-audit 46/0. Salvage: none.
  Evidence: docs/completion/evidence/S2-archaeology.txt.
- **Open issues: 11, all `needs-human`, all 08-29.** 4 launch-blockers. Clusters:
  phase-0 (92 goldens), phase-1 ops (95 npm publish, 96 monitor secrets, 97 obs guards),
  phase-2 calibration (99 corpus, 100 over-flagging, 101 leaderboard),
  phase-3 launch (103 HN, 104 PH/Reddit), phase-4 (102 Stripe post-launch), 109 OG atomicity.
  Almost-done per child: 92, 101; hard: 99, 100, 102, 95–97 need secrets.
- **Prior-plan reconciliation:** P1/P2ab/P4 phases ok; P2c→#102; P3 launch zero (VALID-Jul05 lost);
  parity review d4d89f1 adopted #63; adversarial 15/15 with 1 wontfix, residue #109;
  divergence: docs deleted #88, leaderboard open, UX/AGENT docs miss, API web-only,
  spec==27+9+8 (drift claim needs recheck — T-21).
- **Intent delta:** original 16 rules/3 surfaces → current 27 rules + copy axis + AEO + system-check
  + monitor/MCP/leaderboard/OG. Scope creep = breadth of surfaces; each is shippable, none cut yet.

## Track B — External research (fetched 2026-09-14)

Parent-fetched (full text in tool record; relied-on passages paraphrased below):

- **R-01 Pages rollback.** URL https://developers.cloudflare.com/pages/configuration/rollbacks/ —
  any successful production deployment is a valid rollback target; rollback is instant via the
  Deployments list; preview deployments are NOT valid targets. **Effect: CORRECTS S1 F-7-05
  (capability exists); gap narrows to "never rehearsed" → G-12.**
- **R-02 KV bulk export.** URL https://developers.cloudflare.com/kv/reference/kv-commands/ —
  `wrangler kv bulk get/put` move key-sets via files; no native snapshot primitive, DIY via
  key-list + bulk get. **Effect: new gap G-13 (backup script + rehearsal).**
- **R-03 Resend verified domains.** URL https://resend.com/docs/dashboard/domains/introduction —
  must add+verify ≥1 owned domain to send; DMARC/BIMI after verification; subdomains recommended
  for reputation split. **Effect: confirms F-6-05/F-15-04; H-03 (domain verify) gates CF-04.**
- **R-04 CAN-SPAM.** URL https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business —
  commercial mail needs valid postal address + conspicuous opt-out honored ≤10 business days,
  mechanism live ≥30 days; transactional/relationship mail excepted. **Effect: new gap G-16
  (footer + List-Unsubscribe + honor path).**

Child-fetched (compressed refs; full URLs in child transcripts, re-fetch at task time if load-bearing):

- **L1 CalOPPA/ToS** (leginfo+termsfeed): conspicuous PII/share/review/DNT notice; ToS recommended.
  Effect: confirms F-15-02 → G-15.
- **L2 CAN-SPAM** (ftc+google): postal + 10-day opt-out + SPF/1-click. Effect: → G-16 (parent-anchored by R-04).
- **L3/L7 DPDP Act+Rules** (indiankanoon + MeitY; Act 182k/21p, Rules GSR846 13Nov25): consent/withdrawal,
  principal rights, breach notification. Effect: → G-17/G-34/G-35; task-time re-verify exact text (T-30/T-32).
- **L4 CERT-In** (PIB/IR): 6h reporting + PoC + 180d logs apply to providers/intermediaries classes we are
  not in. Effect: **no effect** for 6h sprint (stated reason: SaaS-over-cloud, not a provider/VPS/VDA);
  incident-reporting stance documented in runbook (T-28).
- **L5 GDPR Art 3** (youreu/gdprinfo): free/monitored-user scope + EU-rep question. Effect: confirms G-17
  (rights path covers exposure); no EU-rep action at this scale — re-check if EU paid users exist (T-30).
- **L6 MIT/npm** (opensource+npmterms): copyright notice + LICENSE + CoC hygiene. Effect: → G-36.
- **C1–C16 lifecycle:** node 24 ok (no effect); eslint 9 EOL/v10 current → G-53 DEFER;
  bun 1.4.2/1.3.5 confirms S1 drift → G-37; CF image API v1→v3 deprecation → G-29 verify-first;
  vitest 4/5 vs pinned 2.1 → G-53 DEFER; KV eventual-consistency/stale-reads + limits
  (per-key write rate, bulk caps) → G-27/G-28; Pages/Workers/Turnstile/Resend-audit/pw/npm: no effect or → noted gaps.
- **T1–T4/R1–R12 table-stakes+readiness:** PSI/lab+28d confirms CF-01/CF-03 shape; Mozilla-observatory-style
  UI/CLI/API confirms CF-01/02/06/07; OWASP Top10-2025 + SSRF cheat-sheets confirm SSRF layering (keeps A5=3);
  SRE workbook confirms A7/A8/A9 gaps; CF preview+branch-controls confirm staging story (→ G-10);
  CF WAF notes → G-40; security-headers/UA → G-39. ASVS 5.0: no effect beyond current posture.
- **O1–O12 ops baselines:** KV DIY backup (→ G-13, parent-anchored R-02); KV list/bulk/limits (→ G-28);
  Pages instant rollback (→ G-12, parent-anchored R-01); Workers logs 200k/3d (confirms A9);
  Logpush paid (→ G-56 ACCEPT); alerts email-only (→ G-06 design input); Resend DKIM/DMARC/sandbox
  (→ H-03/G-43); bounce webhook (→ G-46).

## Track C — Synthesis

- **F-R gaps → G mapping:** 01→G-15, 02→G-16, 03→G-17/G-34/G-35, 04→no-effect, 05→G-17,
  06→G-36, 07→G-53, 08→G-29, 09→H-03/G-43/G-46, 10→G-53, 11→G-27, 12→G-28, 13→G-13, 14→G-39, 15→G-40.
- **Definition inputs (must be true in-domain):** scan accuracy credible on canonical sites (G-03);
  SSRF-layered public scan API; instant rollback rehearsed; preview-based staging; 3d logs + proven alert;
  SPF/DKIM/opt-out mail; conspicuous privacy + Terms; consent/withdrawal + export/delete; MIT hygiene;
  runtime current (node ok; lint/test majors deferred, not ignored); merged branches deleted;
  launch-blocker issues closed or human-filed.
- **Confidentiality log:** parent external access = 4 vendor/doc URL fetches, zero query terms, zero product
  internals. Child queries were category-only per prompt (summaries: SaaS-ToS, CAN-trans, DPDP-text,
  CERT-cloud, GDPR-nonEU, npm-MIT, lifecycle, table-stakes, ops-baselines); full strings in child transcripts.

## S2-A exit

- [x] Every Track-B item has an explicit plan effect (incl. "no effect" with reason).
- [x] Confidentiality firewall log present. Second look: added the no-effect reason for CERT-In and the
  child-URL caveat rather than letting compressed refs look citable. No change to findings.
