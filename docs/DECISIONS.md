# DECISIONS

Append-only. Each run gets its own dated section. Never edit prior entries.

## 2026-06-19 — Adversarial fresh review-and-fix run (orchestration)

Self-orientation (discovered, not asked):

- REPO_ROOT: `/Users/ravindra/orca/workspaces/slop-detect/piddock` (slop-detect monorepo).
  Orca repoId: `54ec0c56-dce7-404f-8e5e-e6ca2e8bd004`. Canonical main worktree:
  `/Users/ravindra/projects/slop-detect`.
- PRODUCT: Slop Detector. Scores a landing page against a deterministic, weighted 0–100
  AI-design-slop fingerprint (27 CSS/copy rules) run on headless Chromium; plus an AEO axis
  (can AI engines fetch/read/cite a page), a domain-drift monitor, CLI, MCP server, GitHub
  Action, and a Cloudflare-Workers web app. Stack: TypeScript, bun 1.3.5, turbo, vitest,
  eslint, prettier. Packages: `packages/{core,cli,mcp,action}`; apps: `apps/{web,docs}`.
- MAINTAINER (commit authorship): Ravindra Kumar <ravidsrk@gmail.com> (from repo git config).
- DEFAULT BRANCH: main (HEAD 07fe6db at run start).
- BASE (this run's integration branch): `ravidsrk/adversarial-fresh`, cut from main @07fe6db.

Environment / preconditions:

- Orca runtime: ready + reachable. Orchestration experimental flag: ENABLED (task-list
  responds). NOTE: orchestration state is runtime-global and currently busy with OTHER
  projects (marketintell, praxis, krawl). Never `orca orchestration reset`; isolate by task ID.
- gh auth: logged in as ravidsrk (ssh, scopes incl. repo). PRs go to origin against BASE.
- gitleaks: installed at /opt/homebrew/bin/gitleaks. No repo gitleaks config → workers
  self-check diffs for secrets and run `gitleaks protect --staged` / `gitleaks detect` ad hoc.
- Worker CLIs present: claude (/Users/ravindra/.local/bin/claude),
  codex (/opt/homebrew/bin/codex), grok (/Users/ravindra/.grok/bin/grok).

Roles (this run):

- PHASE 0: @claude REVIEWER (code-grounded findings) → @codex SKEPTIC (narrow/refute vs code) → FREEZE.
- PHASE 1: @grok codes fixes; @codex fresh build-blind PR reviewer; @claude integrator opens+merges.
  @grok never reviews its own work; @codex never writes code; @claude never authors fixes.

Worker launch flags:

- codex: this build is codex-cli 0.141.0 which has NO `--full-auto` flag. Correct autonomous
  launch: `codex --ask-for-approval never --sandbox danger-full-access` (full auto, no prompts,
  network for gh). The directive's `codex --full-auto` is obsolete for this version.
- grok / claude: auto / skip-permissions, max reasoning tier.
- All workers fully autonomous; coordinator answers blocking `ask` from DECISION DEFAULTS.

Safety mapping (this is NOT a money/custody/infra-prod system, but rails still bind):

- No deploy/promote. `web:deploy` (Cloudflare) and npm publish via a `v*` tag
  (`.github/workflows/publish.yml`) are OPS, never run by the swarm. Merges land on BASE only; BASE→main is a human meta-PR (out of scope).
- Acceptance demonstrated via vitest unit/integration tests + local CLI/fixture harnesses only.
  No live network scans against third-party sites required for acceptance; use fixtures/local.
- Secrets: never commit keys/tokens/.env. Web app reads secrets from env/wrangler bindings.

Merge policy: `gh pr merge --merge` (merge commit, never squash/rebase-collapse). Clean
MAINTAINER authorship, no tool trailers. One in-flight task per hot file; parallel across files.

Coordinator mode: manual orchestration loop (not `orchestration run`). Coordinator terminal lives
in the piddock worktree on BASE; pulls BASE after each merge; ledger = docs/arch-build-progress.md.

### Update (2026-06-19, mid-run): self-review block + verdict channel

All fix PRs are authored by the same GitHub account (ravidsrk), so a @codex reviewer running
`gh pr review <n> --approve|--request-changes` is REJECTED by GitHub ("can't review your own PR").
Therefore the authoritative review verdict is the reviewer's `worker_done` payload
(`verdict: approve|request-changes`) PLUS a posted PR COMMENT with the findings — NOT the gh review
state. The integrator (coordinator) merges on a worker_done `approve`; routes the PR comment's findings
back to the same-worktree grok on `request-changes` (max 3 rounds). Codex `--inject` does not submit into
its TUI; reviewers are driven by `terminal send` of a /tmp spec file. Grok `--inject` works.
