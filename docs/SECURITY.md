# Security posture

Three layers, each tested. Report issues via
`/.well-known/security.txt` (private GitHub reporting is enabled).

## Headers (tested by `security-headers.test.js`)

- Static assets: `public/_headers` (`/*` block). Function-rendered HTML: root
  `functions/_middleware.ts` — a parity test fails if the two CSPs drift.
- Set: CSP (self + Fonts + Turnstile, `form-action 'self'`), HSTS
  (1y + includeSubDomains), nosniff, `SAMEORIGIN` framing, strict referrer,
  locked-down Permissions-Policy. Badges/OG intentionally `cross-origin`.
- Deliberately absent: `upgrade-insecure-requests` (would break local
  `http://localhost` Pages dev), HSTS `preload` (one-way commitment),
  CSP nonces (needs inline-script refactor — a follow-up, not this run).

## Application (see [AUTHZ_MATRIX.md](AUTHZ_MATRIX.md), T-07 secret scan)

- Sessions: stateless HMAC cookies (30d), `__Host-` prefix, Secure/HttpOnly/SameSite.
- SSRF boundary around every server-side fetch (redirect + metadata guards).
- No secrets in history/config; `.env.example` is the complete key list.

## Edge / Cloudflare dashboard (verify by hand — H-08)

The repo cannot assert dashboard state, so confirm once and re-check yearly:

- [ ] TLS mode Full (strict); Always Use HTTPS on; HSTS dashboard toggle matches
      the header (or off, since the header carries it).
- [ ] WAF: managed ruleset on; custom rule throttling `POST /api/scan`
      (e.g. >20/min/IP → challenge) as backstop to the in-code limiter.
- [ ] Bots: Bot Fight Mode (or better) on; Turnstile widget key matches
      `TURNSTILE_SITEKEY` in `wrangler.toml`.
- [ ] Private vulnerability reporting stays enabled
      (repo Settings → Security → Private vulnerability reporting).
- [ ] `security.txt` Expires stays >30d out — the suite fails otherwise.
