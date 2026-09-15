# KV backup & restore runbook

Tool: `apps/web/scripts/kv-backup.mjs` (no deps; runs on bun or node 20+).
Namespaces come from `apps/web/wrangler.toml`; credentials from env only.

## Prereqs (H-01)

```bash
export CLOUDFLARE_API_TOKEN='...'   # Account: Workers KV Storage (read+write)
export CLOUDFLARE_ACCOUNT_ID='...'  # dash.cloudflare.com → account ID
```

Token scope is KV-only and short-lived (30d). Never commit it; prefer
`op://Dev/slop-detect/cf-token`.

## Backup (read-only, safe any time)

```bash
bun apps/web/scripts/kv-backup.mjs backup --out kv-backup-$(date +%F)
# per-namespace: --namespace RESULTS | RATE_LIMIT | <id>
```

Writes `<out>/<BINDING>/manifest.json` (keys, expirations, sha256, base64
values). Copy the dir off-machine; it contains user emails in hashed form
plus scan snapshots — treat as production data.

## Verify (read-only)

```bash
bun apps/web/scripts/kv-backup.mjs verify --in kv-backup-2026-09-14
```

Compares live bytes vs the manifest by sha256. Exit 1 on any mismatch.

## Restore (upsert-only — never deletes)

```bash
# 1. Always dry-run first:
bun apps/web/scripts/kv-backup.mjs restore --in kv-backup-2026-09-14
# 2. Then apply:
bun apps/web/scripts/kv-backup.mjs restore --in kv-backup-2026-09-14 --apply
```

Semantics: the manifest is fully validated first (schema, per-entry sha256,
binding/namespace match) and restore aborts before any write on damage.
Every valid entry is re-put (binary-safe); recorded expirations are restored
as TTLs; entries already expired — or expiring within 60s — are skipped, never
resurrected. Keys created after the backup are untouched. An input dir with no
usable manifests fails loudly (exit 1). There is no delete path — if you need
a key gone, delete it explicitly with `wrangler kv key delete`.

## Cadence

- Before any KV-touching migration or bulk operation: take a backup, verify it.
- Quarterly (or after any restore): rehearse restore `--apply` against a
  scratch namespace and verify — the T-08 suite only proves the logic, not
  the live credentials path.

## Recovery order after KV data loss

1. Re-run `backup` first (captures whatever survived).
2. `restore --apply` the newest good manifest, then `verify`.
3. Check `/api/stats` + dashboard for the affected flows (T-28 runbooks).
