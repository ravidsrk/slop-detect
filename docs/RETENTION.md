# RETENTION.md — what we keep, for how long, and why (G-35)

The compliance view of stored data. The ops view (namespace layout, TTL
mechanics) is `docs/KV_TTL.md`; the TTL constants below all live in
`apps/web/functions/_data.ts` and are pinned by `test/kv-ttl.test.js` and
`test/legal.test.js`. Lawful basis for email storage is consent (double
opt-in, `consentAt` + `policyVersion` stamped per record).

## Email-bound records (erasable self-serve via `/api/me/*`)

| Key | Content | TTL | Erase path |
|---|---|---|---|
| `w:<domain>` | Watch: email, baselines, last scores, consent stamp | 1y rolling (`WATCH_TTL`), refreshed on each scan/alert | `/api/me/erase`, one-click, or API unsubscribe |
| `e:<sha256>` | Email → domains index (hash key, no plaintext) | 1y (`WATCH_TTL`); deleted when emptied | Same (index entry drops with the last watch) |
| `l:<domain>` | Public directory row (domain, score — never email) | 1y (`LISTING_TTL`) | Same (delist is part of every unsubscribe) |
| `sup:<sha256>` | Bounce/complaint suppression (reason + time) | 1y (`SUPPRESSION_TTL`) | Same (erasure re-arms; next bounce re-suppresses) |
| `wv:<token>` | Double-opt-in confirmation token → domain | 7d (`VERIFY_TTL`), single-use | Burns on use; expires alone |
| `dt:<token>` | Dashboard magic-link token → email | 15min (`DASHBOARD_TOKEN_TTL`), single-use | Burns on use; expires alone |
| `sd_session` cookie | Stateless HMAC session (email + expiry, server holds nothing) | 30d / sign-out | Sign out, or erase clears it |

## Anonymous records (not attributable — no per-person erase possible)

| Key | Content | TTL | Notes |
|---|---|---|---|
| `r:<id>` / `d:<domain>` | Slim scan result (score, patterns, title/H1 — never page content) | 90d (`RESULT_TTL`/`DOMAIN_TTL`) | `share:false` skips storage entirely |
| `h:<domain>` | Per-domain score history (public on `/score/<domain>`) | 1y rolling (`WATCH_TTL`) | One point per stored scan |
| aggregates | Score distribution, category averages (no URLs, no emails) | Indefinite; one contribution per domain per year (`STATS_CONTRIB_TTL`) | Anonymous by construction |
| ops stats | Per-route counters | 30d (`OPS_TTL`) | No PII |
| rate-limit counters | Per-IP (60s), per-email verify (1h), global scan budget (48h) | 60s–48h | Anti-abuse only |

Removal of a specific public scan artifact (permalink, badge, history
point) stays maintainer-mediated: open an issue (see `privacy.md`), as
anonymous keys can't be mapped to a requester for self-serve deletion.
