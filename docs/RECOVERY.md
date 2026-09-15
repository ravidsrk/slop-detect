# RECOVERY.md — store inventory + recovery (G-33)

What state exists, where it lives, what losing it costs, and how to get
it back. Key-level TTL map: [KV_TTL.md](KV_TTL.md). Backup/restore
commands: [KV_BACKUP.md](KV_BACKUP.md). Counter semantics under
concurrency: [KV_LIMITS.md](KV_LIMITS.md).

## Inventory

| Store | Binding | Namespace ID | Contents (key map) |
|---|---|---|---|
| KV | `RESULTS` | `f8bbc9f7a16948a2995215321e679115` | Product data: scan snapshots `r:`, domain pointers `d:`, history `h:`, watches `w:` + email index `e:`, tokens `wv:`/`dt:`, stats `stats:*` + `gs:`, ops `stats:ops:`, listings `l:`, OG `og:`, mail gates `rl:dashlink`/`rl:watchverify`/`rl:ogrender` |
| KV | `RATE_LIMIT` | `c5aad4cb07e7405e86c3cf1aebcae772` | Counters `rl:*` + operator-minted API-key records `key:*` |
| None (stateless) | — | — | Dashboard sessions: HMAC cookies, 30d, need only `SESSION_SECRET` |

IDs from `apps/web/wrangler.toml` (namespace IDs, safe to reference —
not secrets). Secrets themselves live in Pages env / repo secrets, never
in docs (see the env inventory in `wrangler.toml` comments).

## Loss impact + recovery, by class

| Class | If lost | Recovery |
|---|---|---|
| Per-IP 60s buckets (`rl:<route>:<bucket>`) | Benign: windows reset, limits permissive for ≤60s | None needed — traffic rebuilds them within the minute |
| Daily budget key (`rl:global:scan:<day>`) | Prior usage FORGOTTEN — traffic restarts the counter from 0, so the affected day can admit up to one extra full cap (e.g. 8k used + key lost → up to ~18k vs the 10k cap). The 2d key TTL is NOT an admission bound | None possible (usage unreconstructable) — note the over-admission day in `ops` and move on |
| Scan snapshots/history (`r:`, `d:`, `h:`, `og:`, `l:`, `stats:*`, `gs:`, `stats:ops:`) | Broken permalinks/badges, gapped timelines/stats | Restore from backup ([KV_BACKUP.md](KV_BACKUP.md)); re-scans organically refill `h:`/`d:` going forward |
| Watches + tokens (`w:`, `e:`, `wv:`, `dt:`) | Monitoring silently stops; pending confirmations/logins die | Restore from backup; unwatched users must re-subscribe (no secondary record — this is the highest-value backup content) |
| API-key records (`key:*`) | All keyed API access invalid | Restore from backup, else re-mint via wrangler (see API.md) and redistribute out-of-band |
| `SESSION_SECRET` rotation | All dashboard sessions die (30d cookies unverifiable) | Expected: users re-login via magic link. Rotate by setting the new Pages env value |
| `CRON_SECRET` rotation | Sweep 401s until both sides match | Set Pages env var AND repo secret `CRON_SECRET` to the same value (workflow + `sweep.ts` compare them) |

## Backup status (read this before promising a restore)

`apps/web/scripts/kv-backup.mjs` exists with backup/verify/restore, but
**no backup has been performed or verified yet** (T-08/G-13, blocked on
H-01 Cloudflare credentials). Until the first verified backup lands,
every "restore from backup" row above is a plan, not a capability —
say so in the incident channel (see the 3-liner in
[RUNBOOKS.md](RUNBOOKS.md)).

## Recovery order after a total loss

1. Re-mint or restore `key:*` (API access) — only operator action that
   unblocks others.
2. Restore `w:`/`e:` (watches) — the only user data with no secondary
   record.
3. Restore `r:`/`h:`/`stats:*` (history) — nice-to-have; rescans refill.
4. Counters need nothing (but note a lost daily-budget day in `ops` — usage is forgotten, not rebuilt). Sessions need nothing (users re-login).
