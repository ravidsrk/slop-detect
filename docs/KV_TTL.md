# KV TTL map

Every key written to Cloudflare KV, its TTL, and why. RESULTS holds product data;
RATE_LIMIT holds counters + operator-minted API-key records. Anything missing from
this table is a bug — add the key here when you add a `kv.put`.

## RESULTS namespace

| Key | TTL | Rationale |
|---|---|---|
| `r:<scanid>` | 90d (`RESULT_TTL`) | Scan snapshots back `/r/:id` permalinks |
| `d:<domain>` | 90d (`DOMAIN_TTL`) | Latest-scan pointer per domain |
| `h:<domain>` | 1y (`WATCH_TTL`) | Score history timeline |
| `w:<domain>` | 1y (`WATCH_TTL`) | Monitored watches |
| `wv:<token>` | 7d (`VERIFY_TTL`) | Watch confirmation tokens |
| `dt:<token>` | 15m (`DASHBOARD_TOKEN_TTL`) | Single-use magic-link tokens |
| `e:<hash>` | 1y (`WATCH_TTL`) | Email→domains index; shadows watch TTL so it cannot outlive entries (T-10) |
| `gs:<domain>` | 1y (`STATS_CONTRIB_TTL`) | Stats dedup marker; 1y bounds growth while keeping re-contribution negligible (T-10) |
| `stats:dist`, `stats:catclean` | durable (no TTL, by design) | Two fixed bounded keys (101-bucket histogram; per-category sums) |
| `l:<domain>` | 1y (`LISTING_TTL`) | Public directory listings |
| `og:<id>` | 30d (`OG_TTL`) | Rendered OG images |
| `rl:dashlink:<hash>` | 1h (`DASHLINK_WINDOW_SEC`) | Magic-link send cap (3/hour/email) |
| `rl:watchverify:<hash>` | 1h (`WATCH_VERIFY_WINDOW_SEC`) | Watch confirmation cap |
| `rl:ogrender:<ip>` | 60s (`OG_RENDER_WINDOW_SEC`) | OG render cap (see #109 for atomicity limits) |

## RATE_LIMIT namespace

| Key | TTL | Rationale |
|---|---|---|
| `rl:<route>:<bucket>` | 60s rolling | Per-IP/keyed per-route counters |
| `rl:global:scan:<day>` | 2d (172800) | Global daily browser-scan budget |
| `key:<apikey>` | durable (operator-managed) | API-key records minted via wrangler (see API.md) |

## Not KV (for the avoidance of doubt)

- `BADGE_TTL` (3h) is an HTTP `Cache-Control` max-age, not a KV TTL.
- Dashboard sessions are stateless HMAC cookies (30d), no KV state.
