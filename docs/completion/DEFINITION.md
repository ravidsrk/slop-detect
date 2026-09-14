# DEFINITION.md — Definition of Complete (FROZEN)

`frozen_at: 6770c58` (freeze commit; content immutable after this line — changes need a new run, not an edit).

## Critical flows (final; each needs happy + one failure path E2E-evidenced)

- CF-01 Web scan: index → POST /api/scan → /r/:id. Failure: invalid/unreachable URL → clean 4xx + UI error state.
- CF-02 CLI scan: `slop <url>` → terminal/JSON verdict. Failure: bad input/offline target → non-zero exit + message.
- CF-03 Fix prompt: endpoint → markdown remediation. Failure: unknown pattern id → 4xx, no stack trace.
- CF-04 Watch/monitor: register → confirm → sweep → Resend alert. Failure: unknown domain/key-missing → fail-closed + log.
- CF-05 Dashboard: magic link → session → domain list. Failure: expired/bad token → clean re-auth prompt.
- CF-06 MCP tools: 4 tools + Skill + Action respond. Failure: bad args → typed MCP error.
- CF-07 Share surfaces: /r /og /badge /score /report /dir /api. Failure: missing id → 404 page, not 500.

## Sign-off gate (mechanical)

1. Every S0 closed (G-01 agent part + H-02/H-03 filed minimum; G-02 closed).
2. Every critical flow E2E-evidenced (happy + one failure). CF-04 production E2E may rest on
   launch-gating Human Actions → then verdict is CONDITIONAL GO, never GO.
3. Backup restored once (local-KV rehearsal evidenced; production execution filed as H-01 or done).
4. Rollback rehearsed once on preview/staging with runbook.
5. One alert proven to fire (mechanism proof counts; production webhook URL may be H-07).
6. Stranger Test passed (clone → first CF-01 scan via README alone, ≤15 min).
7. No ACCEPT at S0 (holds: accepts are S2/S3 only). Launch-gating H: H-01, H-02, H-03, H-04, H-05.
8. Minimum scores: ≥3 on angles 1–9, ≥2 on 10–17 (no deviation).

## Out of scope (CUT/DEFER/ACCEPT — not re-litigated)

- CUT: 301 stub route + dead surfaces P3 finds (code deleted, not flagged).
- DEFER (post-launch issues): Stripe billing (owner-gated #102), coverage gate, big-file refactor,
  eslint-10/vitest-4+ majors, app-layer email encryption.
- ACCEPT: Logpush absent (webhook suffices; expiry 2027-03-14), GitHub-issues-as-support.
- Human-owned events: HN/PH/Reddit posts, npm tag cut, DNS/secret provisioning, corpus labeling.
