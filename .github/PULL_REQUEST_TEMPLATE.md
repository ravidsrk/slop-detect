## Summary

<!-- Describe what this PR changes and link the tracking issue (e.g. Closes #...). -->

## Verification

- [ ] `bun run test` passes across all workspaces
- [ ] `bun run typecheck` and `bun run format:check` pass
- [ ] Copy and UI strings follow **K-06** (never claim a page is "AI-generated"; report matched default-template patterns and evidence)
- [ ] Pattern counts are read dynamically from `/api/patterns` / `@slop-detect/core` (never hardcoded)

## K-04 Rule & Weight Gate (Required if adding a rule or changing a rule weight)

- [ ] **New rule or broadened matcher:** Enters at `weight: 0` with `status: 'review'` (`rule:weight-0`)
- [ ] **Weight promotion (`weight > 0`):**
  - Held-out Likelihood Ratio (`LR >= 3.0`): `___`
  - 95% Clopper-Pearson CI: `[___, ___]`
  - Pre-2022 human control FPR: `___`
  - Heavy FPR delta on held-out set (`<= 0`): `___`
  - Pioneer regression suite (`K-05`) passes with zero Heavy verdicts
  - `DEFINITIONS_VERSION` bumped and corpus score deltas published
