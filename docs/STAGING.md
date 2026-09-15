# STAGING.md — environments, branch controls, preview KV (T-29)

The staging story: what deploys where, what data it touches, and the
exact steps that finish wiring it once H-01 lands.

## Environments

| Environment | Trigger | Workflow | Data | Promotion |
|---|---|---|---|---|
| Production | `main` (CI-gated) | `deploy.yml` | Prod KV (`id`) | — (it IS prod) |
| PR preview | any PR (open/sync/reopen) | `preview.yml` | Preview KV (`preview_id`) | Merge to main |
| Local | `wrangler pages dev` | — | Local simulator | — |

Production deploys only after the `ci` workflow succeeds on `main`
(`workflow_run` gate in `deploy.yml`); tag pushes (`v*`) and manual
dispatches also deploy. Previews supersede per branch
(`cancel-in-progress`), build + test before publishing, and comment
the PR with a pointer.

## Branch controls

- `main` is the only production branch. Never commit to it directly —
  every change rides a PR (repo rule), so every production deploy has
  CI + review behind it.
- PR branches deploy previews only, and only when staging is wired
  (see the interlock below). A preview can never promote except by
  merging to `main`.
- Preview deployments bind `preview_id` namespaces (below) — preview
  traffic can neither read nor pollute production KV, rate limits,
  watches, or stats.

## The safety interlock (why previews can't touch prod)

`preview.yml` self-skips with a notice (never red, never deploys)
unless BOTH hold:

1. `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` repo secrets (H-01).
2. At least one live (uncommented) `preview_id` line in
   `apps/web/wrangler.toml` — checked by `grep -qE
   '^[[:space:]]*preview_id[[:space:]]*='` (template lines start with
   `#`, so they can't satisfy it).

Without `preview_id`, a branch deployment would bind production `id` —
that must be impossible, not merely undocumented.

## KV namespace strategy (G-11)

| Binding | Production `id` | Preview `preview_id` | Preview title |
|---|---|---|---|
| `RESULTS` | `f8bbc9…` (wrangler.toml) | TBD (H-01) | `slop-detector-RESULTS-preview` |
| `RATE_LIMIT` | `c5aad4…` (wrangler.toml) | TBD (H-01) | `slop-detector-RATE_LIMIT-preview` |

Tooling: `apps/web/scripts/kv-namespaces.mjs` (no deps):

```bash
bun apps/web/scripts/kv-namespaces.mjs list                                  # read-only
bun apps/web/scripts/kv-namespaces.mjs ensure --binding RESULTS              # dry-run
bun apps/web/scripts/kv-namespaces.mjs ensure --binding RESULTS --apply      # create if missing (idempotent)
bun apps/web/scripts/kv-namespaces.mjs check                                 # wrangler.toml prod IDs exist
```

`ensure` is idempotent (finds by title, prints the id) and dry-runs
unless `--apply` — mirroring `kv-backup.mjs` restore safety. Tested
against a mocked API (`kv-namespaces.test.js`); the live run is H-01.

## Finishing checklist (H-01 holder)

1. Export `CLOUDFLARE_API_TOKEN` (Pages: Write + KV edit) +
   `CLOUDFLARE_ACCOUNT_ID`; set the same pair as repo secrets.
2. `… ensure --binding RESULTS --apply` and `… --binding RATE_LIMIT
   --apply`; record the printed IDs.
3. Add the two `preview_id` lines to `wrangler.toml` (template is in
   the file comments), commit via PR.
4. Open any PR — `preview.yml` should go green and comment the
   preview pointer. Verify the preview's `/api/health` and one scan,
   then confirm ZERO new keys in production KV (bindings isolated).
5. `… check` to confirm prod IDs resolve.

## Secrets map (staging-relevant)

Same repo secrets as production (`CLOUDFLARE_API_TOKEN`,
`CLOUDFLARE_ACCOUNT_ID`); the token needs Pages: Write for deploys
plus KV edit for `ensure`. Preview Functions inherit Pages env vars
per the dashboard's preview environment — set non-secret vars to
staging-safe values there (notably: no `ERROR_WEBHOOK`, no
`RESEND_API_KEY`, unless testing alerts; `SCAN_DAILY_CAP` low).
