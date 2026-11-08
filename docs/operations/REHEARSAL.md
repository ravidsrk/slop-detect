# REHEARSAL.md — S4 rehearsal environments (T-40)

S4 (the stranger test) can begin without setup work against any of these
three targets. Pick one, run one command.

## 1. Local (`wrangler pages dev` + local KV) — the default rehearsal env

No Cloudflare account, no secrets, no H-01. Boots the full site with
simulator KV namespaces and a local Chromium for the scan browser.

```bash
cd apps/web
./node_modules/.bin/wrangler pages dev public --port 8788 --persist-to .wrangler/s4-local
# wait for "Ready on http://localhost:8788" (first scan downloads a browser)

# in another shell, from the repo root:
S4_SEED_URL=https://slop-detect.com/ bun run s4 -- --target http://localhost:8788
```

Notes:

- `S4_SEED_URL` is required locally: the default seed (the target's own
  homepage) is loopback, which the SSRF guard rejects by design. Any
  public scannable page works as the seed.
- Local KV persists under `apps/web/.wrangler/s4-local` (gitignored).
  Delete it for a clean-slate rehearsal.
- First scan is slow (Chromium download); the suite takes ~7 minutes.
- Verified 2026-09-15 on the T-40 branch (which includes the local-dev
  scan fix): **22 pass, 6 skip (owner-named), 0 fail** — identical to
  production.

## 2. PR preview (post-H-01)

Until H-01 lands (`CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` secrets
and live `preview_id` lines — see `docs/STAGING.md`), `preview.yml`
self-skips and no previews deploy. Once wired, every PR gets:

- a hash deployment `<hash>.slop-detector.pages.dev`, and
- (per Cloudflare docs) a branch alias `<git-branch>.slop-detector.pages.dev`
  tracking the branch's latest commit (lowercased, non-alphanumerics
  replaced) — see [preview deployments](https://developers.cloudflare.com/pages/platform/preview-deployments/#preview-aliases).
  Confirm the alias shape on the first H-01 preview; the dashboard
  deployments list is authoritative until then.

The workflow comments the PR with a pointer to the deployment
(dashboard deployments list). Run S4 against the alias:

```bash
bun run s4 -- --target https://<branch-alias>.slop-detector.pages.dev
```

Preview traffic binds preview KV only — it can neither read nor pollute
production data (the STAGING.md interlock).

## 3. Production (validated fallback)

```bash
bun run s4 -- --target https://slop-detect.com
```

Validated 2026-09-15: 22 pass, 6 skip, 0 fail — full transcript in
`docs/completion/evidence/T-39-s4scripts.run.txt`. Production currently
fail-closes dashboard sign-in (503, no mail config per H-02); those
steps skip honestly and are owned by `dashboard.test.js`.
