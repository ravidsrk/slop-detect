# ROLLBACK.md — rollback runbook + rehearsal (T-27)

How to un-ship. Read the decision first: most incidents want the kill
switch, not a rollback.

## Decide: mitigate, roll back, or forward-fix

| Situation | Action | Time |
|---|---|---|
| Scans failing NOW, cause unknown | Mitigate: set `SCAN_DISABLED=1` in Pages env (kill switch). Callers get 503 `scanning_paused`, nothing half-works | < 1 min |
| Bad deploy identified, fix not immediate | Roll back (paths below) | ~1 min (API) / ~10 min (rebuild) |
| Bad deploy, fix is a one-liner already reviewed | Forward-fix: merge to `main`, auto-deploys | CI + deploy (~5 min) |
| Data shape changed (never so far — KV has no migrations) | Roll back code AND assess data (see below) | varies |

The kill switch first, always: it stops the bleeding while you pick a
path. Unset it after the rollback verifies (or the ping keeps failing
as a reminder — see [RUNBOOKS.md](RUNBOOKS.md) RB-1).

## Trigger conditions (roll back immediately if)

Adapted to what this stack can observe (`/api/health`, `/api/stats`
→ `ops`, `wrangler tail`):

- `ops.byStatus` 5xx share doubles vs the same hour yesterday
- Every scan 502s/503s for > 5 minutes (not a KV blip — RB-1/RB-4 first)
- A deploy just landed and any of the above started with it
- Security vulnerability discovered in shipped code

## Rollback paths (project: `slop-detector`)

### Path A — instant re-promote (preferred, ~1 min, no rebuild)

Re-points production at a previous deployment. Dashboard: Pages
project → Deployments → `⋯` on the last good deployment → Rollback.
API equivalent (token needs Pages: Edit — H-01):

```bash
export CLOUDFLARE_API_TOKEN='...' CLOUDFLARE_ACCOUNT_ID='...'
# List, newest first; pick the last GOOD production deployment id
# (eyeball environment + branch + time — shapes drift, ids don't).
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/slop-detector/deployments?per_page=20" \
  | bun -e 'console.log(JSON.parse(await Bun.stdin.text()).result.map(d => `${d.id} ${d.created_on} ${JSON.stringify(d.deployment_trigger)}`).join("\n"))'
# Promote it (verified endpoint: POST .../deployments/{id}/rollback).
curl -s -X POST -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/slop-detector/deployments/<DEPLOYMENT_ID>/rollback"
```

### Path B — tag the old SHA (~10 min, rebuilds via CI path)

When the API/dashboard is unavailable but GitHub Actions works:

```bash
git tag v0.0.0-rb1 <last-good-sha> && git push origin v0.0.0-rb1
```

Any `v*` tag triggers `deploy.yml`, which checks out the tag and
deploys it like a release. Tag hygiene: `v0.0.0-rbN` sorts below all
real versions; delete the tag after (`git push --delete`) — deletion
never un-deploys. Verified from `deploy.yml` triggers + checkout-ref
fallback (not yet executed live — part of the rehearsal).

### Path C — revert-merge (CI + deploy time, preserves history)

`git revert` the offending commit(s) on a branch, PR, merge to `main`
→ auto-deploys. Slowest, but the only path that leaves history
truthful. Prefer it once the bleeding stopped (kill switch) and the
revert is clean.

## Data considerations

Deployments don't migrate data: KV (`RESULTS`, `RATE_LIMIT`) is
untouched by every path above. A rollback never needs a data rollback
— but it also never UNDOES writes the bad deploy made (bad snapshots,
polluted stats). After rollback, assess: poisoned `h:` timelines and
`stats:*` markers stay until TTL'd; watches (`w:`) are append-only
state, safe. If the bad deploy WROTE garbage at scale, that's a
[RECOVERY.md](RECOVERY.md) incident, not just a rollback.

## Post-rollback verification (do all six)

1. `GET /api/health` → 200, all checks ok.
2. `ops.byStatus` 5xx back to baseline.
3. One manual scan of a known page returns 200 with a sane tier.
4. `wrangler tail` shows normal traffic, no new error types.
5. Unset `SCAN_DISABLED` if you set it; confirm the ping goes green.
6. Post the incident 3-liner resolution ([RUNBOOKS.md](RUNBOOKS.md)).

## Rehearsal script (H-01 holder, on preview — zero prod impact)

Never rehearsed — this script is the rehearsal. Run it end to end,
then record the date + result in `SHIPLOG.md`.

```bash
export CLOUDFLARE_API_TOKEN='...' CLOUDFLARE_ACCOUNT_ID='...'
P=slop-detector
# 1. Deploy a canary marker to a scratch preview branch.
git checkout -qb rehearse/rollback-$(date +%F) && \
  echo "<!-- rollback rehearsal $(date -u +%FT%TZ) -->" >> apps/web/public/index.html && \
  git commit -am "rehearse: rollback marker (reverted same session)" && \
  git push -u origin HEAD
# 2. Confirm preview.yml goes green and loads the marker; record URL + time.
# 3. Roll the PREVIEW back via API: list branch deployments, rollback to the
#    previous one, confirm the marker is gone and /api/health is 200.
# 4. Delete the branch (gh + git), confirm production /api/health + one scan
#    untouched throughout (compare ops.byStatus before/after: zero delta).
```

Pass criteria: marker deployed → rolled back → gone; preview health
green throughout; production `ops` shows zero rehearsal keys; total
time recorded. Any step failing means the runbook is wrong — fix the
runbook, not the rehearsal.
