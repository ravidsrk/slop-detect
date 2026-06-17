# Slop Detect old-product inventory

Audit date: 2026-06-17. Branch: ravidsrk/old-product-audit. Scope: the existing web product at apps/web, end to end.

This document is the FLOOR. It records every screen, route, flow, feature, and state the current product serves, so the new-design rebuild can be checked against it and nothing is dropped. It is descriptive, not aspirational: status is called honestly. The "MUST-NOT-REGRESS" section at the end is the explicit checklist the rebuild has to satisfy.

Positioning note for the rebuild: the per-domain score page (/score/:domain) plus the re-scan and backlink loop is the spine of this product. Almost every other surface exists to feed traffic into that hub or to convert a scan into a monitored, listed domain.

## How the app is built

Stack: bun + turbo monorepo. apps/web is a Cloudflare Pages project named "slop-detector". The UI is two layers:

1. Static assets under apps/web/public/ (served as-is by Pages).
2. Server-rendered Pages Functions under apps/web/functions/, written in TSX with hono/jsx (tsconfig: jsxImportSource "hono/jsx"). These render HTML strings; there is no client framework. The landing page is plain HTML with inline vanilla JS.

The detection engine is the workspace package @slop-detect/core. The web app is a thin shell over it: every score, pattern, axis, and fix-prompt comes from core. The rebuild reuses core unchanged; only the UI changes.

Build and test commands (use bun, never npm):

```
bun install                              # repo root
bun run --filter slop-detect-web dev     # wrangler pages dev public  (http://localhost:8788)
bun run --filter slop-detect-web test    # vitest run
bun run --filter slop-detect-web deploy  # wrangler pages deploy public --project-name=slop-detector
```

Cloudflare bindings (wrangler.toml plus Pages env vars):

| Binding            | Type            | Purpose                                                                 |
| ------------------ | --------------- | ----------------------------------------------------------------------- |
| `BROWSER`          | Browser Render  | Headless Chromium for /api/scan and /og/:id.png (Workers Paid tier)     |
| `RATE_LIMIT`       | KV              | Per-IP rate counters, global daily cap, API-key records (`key:` prefix) |
| `RESULTS`          | KV              | Scans, watches, tokens, history, score distribution, listings, caches   |
| `TURNSTILE_SITEKEY`| var (public)    | Turnstile widget sitekey, committed                                     |

Operational env (set in Pages, not committed): `TURNSTILE_SECRET`, `SCAN_DAILY_CAP` (default 10000), `SCAN_DISABLED` (kill switch), `ERROR_WEBHOOK`, `RESEND_API_KEY`, `ALERT_FROM`, `CRON_SECRET`, `INTERNAL_API_KEY` (unlimited tier for sweep), `SWEEP_MAX` (default 50), `SESSION_SECRET` (dashboard sessions).

There is no Cloudflare Cron Trigger. The monitoring sweep is driven by an external scheduler calling POST /api/cron/sweep with the `CRON_SECRET` bearer token. That is a deploy-time setup the rebuild must remember to keep.

Scoring model (from core, surfaced everywhere): slop score 0-100, lower is better. Tiers: Clean 0-9, Mild 10-27, Heavy 28+. Letter grade A+ through F derived from the score. System and AEO axes are 0-100 where higher is better (alignment / readability).

## Route map

Every URL the app serves. Status legend: works = exercised, no known breakage; partial = works but with a caveat noted; stub = present but minimal; artifact = depends on a generated file. Test column names the file under apps/web/test that pins the behavior (none = no direct test).

| Path                       | Kind                | Renders / returns                                          | Status   | Test                  |
| -------------------------- | ------------------- | ---------------------------------------------------------- | -------- | --------------------- |
| `/`                        | static + function   | index.html hub; index.ts serves agent JSON on negotiation | works    | landing               |
| `/index.md`                | static              | Markdown twin of the homepage                              | works    | none                  |
| `/score/:domain`           | function (TSX)      | Per-domain score hub (the centerpiece)                     | works    | score                 |
| `/r/:id`                   | function (TSX)      | Shareable scan permalink, OG unfurl                        | works    | inline-scripts        |
| `/report/:domain`          | function (TSX)      | Printable client report (noindex)                          | works    | drift                 |
| `/leaderboard`             | function (TSX)      | "State of AI Design Slop" research page                    | artifact | leaderboard           |
| `/directory`               | function (TSX)      | Opt-in catalogue with dofollow backlinks                   | works    | sites, landing        |
| `/dashboard`               | function (TSX)      | Agency multi-domain view, magic-link session               | works    | dashboard             |
| `/blog`                    | function (TSX)      | Blog index                                                 | works    | blog                  |
| `/blog/:slug`              | function (TSX)      | Blog post HTML                                             | works    | blog                  |
| `/blog/:slug.md`           | function (TSX)      | Blog post raw Markdown twin                                | works    | blog                  |
| `/badge/:domain.svg`       | function            | Self-rendered shields-style SVG badge                      | works    | none                  |
| `/og/:id.png`              | function            | 1200x630 PNG share card (cached, static fallback)          | works    | none                  |
| `/api/scan`                | function (POST)     | Headless scan, returns score + patterns + axes             | works    | none (needs BROWSER)  |
| `/api/aeo`                 | function (POST)     | AEO readability score (fetch-based, no browser)            | works    | none                  |
| `/api/fix-prompt`          | function (POST)     | De-slop prompt from result or URL                          | works    | none                  |
| `/api/patterns`            | function (GET)      | Live pattern catalogue JSON                                | works    | none                  |
| `/api/stats`               | function (GET)      | Aggregate score distribution stats                         | works    | api-stats             |
| `/api/sites`               | function (GET)      | Directory as JSON, sortable                                 | works    | sites                 |
| `/api/watch`               | function (POST/GET) | Subscribe/unsubscribe/status for monitoring                | works    | watch, sites, drift   |
| `/api/watch/confirm`       | function (GET)      | Double-opt-in token confirmation                           | works    | alerts                |
| `/api/dashboard/link`      | function (POST)     | Magic-link email request (anti-enumeration)                | works    | dashboard             |
| `/api/cron/sweep`          | function (POST)     | Re-scan verified watches, send alerts                      | works    | alerts, drift         |
| `/api/*`                   | middleware          | CORS, rate limit, Turnstile, cost guard for all /api       | works    | middleware            |
| `/landing/*`               | static (redirect)   | 301 to `/` (retired light landing page)                    | works    | none                  |
| `/compare`, `/compare/index.md` | static         | Positioning / methodology page plus Markdown twin          | works    | none                  |
| `/openapi.json`            | static              | OpenAPI 3.1 spec                                           | works    | none                  |
| `/pricing.md`, `/privacy.md`, `/auth.md` | static  | Policy and access docs                                     | works    | none                  |
| `/llms.txt`, `/llms-full.txt`, `/api/llms.txt`, `/developers/llms.txt`, `/api/patterns.md` | static | Agent-facing docs | works | landing (partial) |
| `/robots.txt`, `/sitemap.xml`, `/schema-map.xml` | static    | Crawl and schema discovery                                 | works    | none                  |
| `/.well-known/*`           | static (5 files)    | Agent, A2A, MCP, skills, oauth-protected-resource          | works    | landing (partial)     |
| `/leaderboard.json`        | generated artifact  | Corpus dataset for /leaderboard (NOT committed)            | artifact | leaderboard           |
| `/favicon.svg`, `/favicon.png`, `/favicon-512.png`, `/og.png` | static | Icons and default OG image                              | works    | none                  |

## Homepage and scan flow (public/index.html plus functions/index.ts)

The homepage is the primary entry. functions/index.ts intercepts GET / when the request asks for the agent view (query `?mode=agent` or Accept: application/json) and returns a structured JSON document (capabilities, endpoints, auth, discovery links, version 0.7.0). Otherwise it falls through to the static index.html.

index.html is a single self-contained dark-theme page with inline CSS and inline vanilla JS. Sections: fixed topbar nav (fingerprint, monitoring, dashboard, leaderboard, directory), hero with the scan form, a sample readout, the fingerprint explainer, how-it-works, the live 27-pattern catalogue (loaded from /api/patterns), the monitoring opt-in (#monitor), and a footer.

Scan flow (the core loop):

1. User pastes a URL and submits. The button shows "Scanning...", status shows "Loading page in headless Chromium...".
2. A Turnstile token is fetched invisibly (ensureTurnstileToken). The form POSTs /api/scan with the URL and `X-Turnstile-Token`.
3. On success, render() draws the result: final URL, title, H1, big letter grade colored by tier, score/100 with "slop, lower is better" note, tier pill, patterns flagged count and elapsed time, a score bar, the verdict line, a fix-prompt CTA, the share/embed panel, a "monitor this domain" nudge, and a link to the /score/:domain hub. Triggered and clean patterns are listed; each row expands to show evidence JSON.
4. The URL bar is rewritten to /r/:id (history.replaceState), so the result is instantly shareable.

States handled in the scan flow:

- Loading: button disabled, status line, spinner-free text updates.
- Rate limited (429): friendly "Too many requests, try again in a minute" from the API message.
- Anti-bot / dead page (422 with code): renders the API error plus hint inline (cloudflare_challenge, access_blocked, empty_page), does not crash.
- Generic error or `data.error`: status flips to error style with the message.
- Sharing unavailable (no resultUrl, KV off or share:false): the share panel and badge are omitted gracefully.

Share and embed panel: copy link, share on X (prefilled intent), share on LinkedIn, and embed snippets in Markdown / HTML / URL tabs with a live badge preview. Clipboard copy has a textarea fallback.

Fix-prompt: the CTA opens a modal that calls /api/fix-prompt with the last result and shows the generated prompt. One-click handoff deep-links the prompt into ChatGPT (chatgpt.com/?q=), Claude (claude.ai/new?q=), or Cursor (cursor:// deeplink). Prompts longer than ~6000 chars are copied to clipboard and a blank chat is opened instead of producing a truncated URL.

Monitor form (#monitor): POSTs /api/watch with domain and email, plus optional `system` and `list` flags that are only sent when their checkboxes are checked (additive opt-in; an unchecked box means "leave as-is", not "disable"). The response renders honestly: registration note, "check your inbox to confirm", and links to the client report, the dashboard, and the directory.

Homepage live data: fetches /api/stats to show an aggregate headline (grade, avg score, slop share) and /api/patterns to populate the rule catalogue, both non-fatal if they fail.

Engine deps: index.ts imports PATTERNS and DEFINITIONS_VERSION from core for the agent view. The scan itself runs entirely through /api/scan.

Notable: there are two landing pages in the tree. public/index.html (dark, interactive, the live hub) and public/landing/index.html (light, marketing, with self-hosted Hanken and Martian woff2 fonts). The light one is retired: _redirects 301s /landing/* to /. The rebuild should consolidate to one landing and can drop the light page and its assets, but should preserve the live scan form, the agent JSON view, and the JSON-LD graph.

## Server-rendered pages (functions/)

`/score/:domain` (score/[domain].tsx) is the canonical per-domain hub and the most important page in the product.

- Renders: brand header, latest grade (large, tier-colored), score/100, tier pill, patterns-flagged count, verdict, peer percentile ("Cleaner than X% of N scans") shown only when at least 5 sites are scored, axis chips (design always; copy and system when those axes ran), a score-over-time SVG chart drawn when at least 2 history points exist, action buttons (Re-scan to /?url=, This scan to /r/:id, Printable report to /report/:domain, Share to X), the triggered-patterns list, the claim block, and an embed-badge block with copyable Markdown.
- Claim model: a claimed domain (has a directory listing) shows a dofollow backlink to the site and a "Listed in the directory" note. An unclaimed domain shows a claim form that POSTs /api/watch with list:true and no dofollow link, so SEO juice is never handed to an unverified URL.
- States: invalid domain returns 400; unknown domain returns 404 with an empty state ("No scan recorded") and a Scan CTA; scanned domain renders fully. Works with no RESULTS binding by treating everything as empty.
- SEO: canonical to /score/:domain, OG and Twitter meta pointing at /og/:id.png, WebPage JSON-LD. This is the page the rebuild's positioning is built on.
- Engine/data deps: normalizeDomain, getLatestForDomain, getWatch, getHistory, getListing, publicWatch, percentileForScore, tierColors, jsonForScript (from _shared / _data / _render); BRAND from _brand.
- Test: score.test.js (domain validation, unknown 404 + CTA, score render, claim vs listed, peer percentile threshold, related links). Inline script safety: inline-scripts.test.js.

`/r/:id` (r/[id].tsx) is the shareable scan permalink.

- Renders: full result card (radial-gradient background tinted by tier), grade, score, tier, flagged count, verdict, triggered patterns, CTAs (Scan your own site, domain history to /score/:domain, Share on X), embed-badge block with copy.
- States: missing or expired id returns 404 with a "results kept 90 days" notice and a new-scan CTA; otherwise renders.
- SEO: OG and Twitter meta to /og/:id.png. There is no rel=canonical on this page (see SEO concerns).
- Deps: getResult, tierColors, jsonForScript. Test: inline-scripts.test.js only (no rendering test).

`/report/:domain` (report/[domain].tsx) is the print-friendly agency deliverable.

- Renders: brand header, two cards (design-slop fingerprint grade/score/tier; design-system compliance score/tier when monitored), a "what drifted" list, triggered patterns, and a history table (date, grade, slop score, tier, system reading). A print button triggers window.print(); a @media print stylesheet styles it for PDF export.
- States: invalid domain 400; no data renders an honest empty state; never leaks the subscriber email (uses publicWatch). Marked noindex.
- Deps: normalizeDomain, getLatestForDomain, getWatch, getHistory, publicWatch, tierColors; BRAND. Test: drift.test.js (renders score, system baseline/current/drift, history, no-data state, anti-slop self-check).

`/leaderboard` (leaderboard.tsx) is the research page "The State of AI Design Slop".

- Renders: headline corpus stat (slop share, avg, Clean/Mild/Heavy counts), an optional live counter across all scans (shown only when at least 50 scans exist), a CTA, category rankings (AI builders, SaaS and dev tools, Big tech, Classic) cleanest-first with each name linking to its score hub, a by-builder average table, and a methodology paragraph.
- Data dependency: reads /leaderboard.json at request time (fetched, not imported), produced by leaderboard/build.mjs from leaderboard/corpus.json. That JSON is NOT committed. When absent or missing `.scored`, the page shows a "being generated, check back shortly" state. The rebuild must keep the generate-then-serve split or change it deliberately.
- Live aggregate comes from getStats(RESULTS). Test: leaderboard.test.js (headline, category and builder rankings, score-hub links, generating state, live counter threshold, anti-slop checks, framing caveat).

`/directory` (directory.tsx) is the opt-in catalogue.

- Renders: rows of listed sites with tier-colored grade, score, system tier, the domain as a dofollow backlink, title, and a link to the scan; ItemList JSON-LD for SEO; sort clean-first (default) or `?sort=slop`. Pending (unscored) entries sink to the end in both sorts.
- States: empty state ("No sites listed yet... claim it") when no listings; works with no RESULTS binding (empty). Labels listed-but-unscored domains "Pending".
- Deps: listAllSites, tierColors, jsonForScript; BRAND. Test: sites.test.js (dofollow, ItemList, empty state, pending label, anti-slop) and landing.test.js (brand marks).

`/dashboard` (dashboard.tsx) is the agency multi-domain view.

- Renders: a login form when signed out; when signed in, the list of the email's monitored domains with slop grade, system tier, flags (regressed, drifted, unconfirmed, listed), last-checked date, and a report link. Noindex, no-store.
- States: no SESSION_SECRET returns a 503 "not configured" page; `?logout=1` clears the cookie and shows login; `?token=` exchanges a single-use magic-link token for a 30-day HMAC session cookie and 302-redirects to a clean /dashboard; bad or expired token shows login with an expiry note; signed-in shows only that email's domains (strict ownership isolation); empty state when the email has no watches.
- Deps: listWatchesByEmail, consumeDashboardToken, tierColors (data); signSession, sessionEmail, sessionCookie, clearSessionCookie (_session); BRAND. Test: dashboard.test.js (session round-trip, cookie flags, single-use tokens, ownership isolation, logout, not-configured). Inline script safety: inline-scripts.test.js.

`/blog`, `/blog/:slug`, `/blog/:slug.md` (blog.tsx, blog/[slug].tsx).

- Index lists posts newest-first with BlogPosting/Blog JSON-LD. A post renders Markdown to HTML via _posts mdToHtml, includes BlogPosting JSON-LD and a rel=alternate link to its .md twin. The .md route serves raw Markdown with Content-Type text/markdown. Unknown slug returns 404.
- Content lives in _posts.ts (POSTS array): currently two posts, "How the slop score works" and "Why detectors decay". Deps: POSTS, getPost, mdToHtml, jsonForScript; BRAND. Test: blog.test.js (index links, JSON-LD, post HTML, .md twin headers, 404, mdToHtml escaping).

`/badge/:domain.svg` (badge/[domain].ts) returns a self-rendered shields-style SVG (no shields.io dependency). Tier-colored value bar with grade and score, or a neutral "no scan" badge when the domain has no result. Cached 3 hours (BADGE_TTL). Strips `.svg` and `www.`. No test.

`/og/:id.png` (og/[id].ts) renders the 1200x630 share card. It serves a cached PNG from KV (`og:<id>`) when present, else launches Chromium, screenshots cardHtml, caches 30 days, and returns it. Falls back to the static /og.png on any error or when RESULTS/BROWSER are missing. No test.

## API endpoints (functions/api/)

`POST /api/scan` (api/scan.ts) is the engine entry.

- Flow: requires BROWSER (else 500). Parses JSON body, SSRF-validates the URL (validateScanUrl), launches Chromium, navigates (domcontentloaded, 25s timeout, soft network-idle wait), runs all pattern extractors plus optional copy and system context in one page eval, re-validates the final URL after redirects (isAllowedUrl), detects bot/dead pages, scores Worker-side via PATTERNS + scorePatterns + applyPreset, optionally runs the copy axis (scoreCopy + combineAxes) and system axis (fetch DESIGN.md, parseDesignMd, scoreSystemCompliance), persists a slim snapshot (saveResult), records the scan into history and the global distribution (recordScan), and refreshes the watch baseline/regression if monitored (recordScanForWatch).
- Body options: `url` (required), `preset` (full/strict/marketing/minimal), `axes` (["design"] default, or ["design","copy"] or "all"), `designMd` (true or a URL for the system axis), `screenshot` (bool), `share` (default true; false skips persistence).
- Errors: 400 invalid JSON/URL or blocked redirect; 422 cloudflare_challenge / access_blocked / empty_page with a hint; 500 missing BROWSER; 502 scan/navigation failure. Persistence failures are reported but never fail a scan.
- Engine deps (core): PATTERNS, scorePatterns, applyPreset, isPreset, createColorHelpers, createVisibilityHelpers, isSlopFont, isAccentSerif, SLOP_FONT_PREFIXES, ACCENT_SERIF_PREFIXES, extractTextContext, scoreCopy, combineAxes, extractSystemContext, parseDesignMd, scoreSystemCompliance. No direct test (needs BROWSER); the SSRF guard it calls is tested by ssrf.test.js and persistence by stats/watch/drift tests.

`POST /api/aeo` (api/aeo.ts): fetch-based AEO axis (no browser). SSRF-guarded, runs runAeoChecks from core (HTML, GPTBot UA, robots.txt, .md twin, llms.txt), returns the report. 400 invalid/blocked URL, 502 on fetch failure. Gated as a scan by the middleware (fan-out abuse risk). No test.

`POST /api/fix-prompt` (api/fix-prompt.ts): two modes. With `{ result }` it assembles a prompt from an existing scan (cheap). With `{ url }` it re-runs scan internally then assembles (expensive; the middleware gates this mode as a scan). Output is text/plain by default, JSON with `?format=json` or Accept: application/json. 400 when neither result nor url is given, 502 when the internal scan fails. Engine dep: buildFixPrompt. No test.

`GET /api/patterns` (api/patterns.ts): returns the live catalogue (version, count, patterns with id/label/short/category/weight). Pure export of PATTERNS + DEFINITIONS_VERSION from core. Cached 1 hour. This is the source the UI and integrations read so the pattern count is never hardcoded. No test.

`GET /api/stats` (api/stats.ts): returns count, avgScore, slopShare, clean, mild, heavy from the global distribution. Returns all-zero defaults when RESULTS is absent. Test: api-stats.test.js.

`GET /api/sites` (api/sites.ts): the directory as JSON. `?sort=clean|slop`, `?limit` (default 500, max 1000). Pending entries sink to the end. 503 without RESULTS. Test: sites.test.js.

`POST/GET /api/watch` (api/watch.ts): the monitoring core.

- POST subscribe: validates domain (normalizeDomain) and email (isValidEmail), creates a watch with a baseline from the latest scan, issues a verification token, and sends a double-opt-in email if the provider is configured. Returns 201 new or 200 existing.
- Flags: `list:true` lists the domain in the directory (only if a scan exists); `list:false` delists but keeps monitoring; `system:true` enables design-system drift monitoring; omitting a flag preserves its current state. A domain claimed by one email cannot be listed or hijacked by another (403).
- POST unsubscribe: requires the matching email (403 otherwise), delists then deletes the watch.
- GET `?domain=`: public status (monitoring bool, history, scores) with the email never in the response.
- Errors: 400 invalid domain/email; 503 no storage. Deps: normalizeDomain, isValidEmail, getWatch, putWatch, deleteWatch, getHistory, getLatestForDomain, publicWatch, setListing, deleteListing, issueWatchToken (data); emailConfigured, sendEmail (_email); buildVerificationEmail (_alerts). Tests: watch.test.js, sites.test.js, drift.test.js.

`GET /api/watch/confirm` (api/watch/confirm.tsx): the double-opt-in gate. Consumes a single-use token (7-day TTL), sets verified:true on the watch, renders an HTML "you're all set" page. 503 no storage, 400 missing token, 410 expired/used, 404 watch gone. Test: alerts.test.js.

`POST /api/dashboard/link` (api/dashboard/link.ts): magic-link request. Anti-enumeration: identical response and timing whether or not the email owns watches; the actual email (with a single-use 15-minute token) is sent out-of-band only to addresses that do. 503 when the email provider or SESSION_SECRET is missing, 400 invalid email. Deps: isValidEmail, listWatchesByEmail, issueDashboardToken; emailConfigured, sendEmail; buildDashboardLinkEmail. Test: dashboard.test.js.

`POST /api/cron/sweep` (api/cron/sweep.ts): the monitoring sweep. Requires `Authorization: Bearer CRON_SECRET` (401 otherwise, constant-time compare) and INTERNAL_API_KEY (500 otherwise). Lists up to 1000 watches, processes up to SWEEP_MAX (default 50, cap 200) verified ones, re-scans each via /api/scan with the internal key (bypassing limits, Turnstile, cost cap; adds designMd when system monitoring is on), then sends one regression alert and/or one drift alert per event (notified flags prevent repeats; recovery re-arms). Returns counts: considered, scanned, alerted, driftAlerted, skippedUnverified, errors. 503 when CRON_SECRET or RESULTS is missing. Deps: listWatches, getWatch, putWatch; monitorSweep (_sweep); sendEmail (_email); buildRegressionAlert, buildDriftAlert (_alerts); report (_report). Tests: alerts.test.js, drift.test.js.

`/api/*` middleware (api/_middleware.ts): the gate in front of every API route.

- CORS: allowlist (slop-detect.com, www, the two pages.dev hosts, localhost:8788/3000); foreign browser origins are rejected (403 origin_not_allowed) unless they present a valid API key; no-origin callers (CLI/curl) pass.
- Rate limit: per-IP rolling 60s window (scan 6/min trusted, 3/min no-origin; fix-prompt 20/min). API-key tiers free (10/20), pro (60/120), unlimited (no limit), bucketed by key, skipping Turnstile. KV outage fails closed on scan (in-memory ceiling of 3) and fails open on cheap routes. fix-prompt {url} and aeo are gated as scans so they cannot borrow looser limits to drive the browser.
- Turnstile: required on scan from trusted browser origins without a key; verified before the cost guard so a failed captcha never burns the daily budget.
- Cost guard: global daily cap (SCAN_DAILY_CAP, 503 daily_capacity_reached) and a kill switch (SCAN_DISABLED, 503 scanning_paused). OPTIONS preflight returns 204.
- Response headers added: X-RateLimit-Tier, X-RateLimit-Limit. Test: middleware.test.js.

## Shared modules and the brand system

| Module        | Role                                                                                  |
| ------------- | ------------------------------------------------------------------------------------- |
| `_brand.ts`   | BRAND_FONTS_HEAD (Hanken Grotesk + Martian Mono via Google Fonts) and BRAND_CSS tokens |
| `_render.tsx` | escapeHtml, escapeXml, jsonForScript (XSS-safe script embedding), tierColors, badgeSvg, cardHtml |
| `_shared.ts`  | Barrel re-exporting _util, _ssrf, _data, _render                                       |
| `_util.ts`    | newId, domainOf, normalizeDomain, isValidEmail, tierRank                               |
| `_ssrf.ts`    | validateScanUrl, isAllowedUrl (private/loopback/metadata/IPv6 blocking)               |
| `_data.ts`    | All RESULTS-KV access: results, watches, tokens, history, distribution, listings       |
| `_alerts.ts`  | Email body builders: verification, regression, drift, dashboard-link                   |
| `_sweep.ts`   | monitorSweep pure orchestration (I/O injected)                                         |
| `_email.ts`   | emailConfigured, sendEmail (Resend), graceful no-provider degradation                  |
| `_session.ts` | signSession, verifySession, cookie helpers (HMAC, HttpOnly, 30-day)                    |
| `_report.ts`  | report() structured log plus optional ERROR_WEBHOOK, email-redacting                  |
| `_posts.ts`   | POSTS content, getPost, mdToHtml                                                       |

Brand system (_brand.ts) is the single styling source for the server-rendered pages. It applies to /score, /report, /leaderboard, /directory, /dashboard, and /blog (each imports BRAND_FONTS_HEAD and BRAND_CSS). Tokens: dark background (#0a0b0e family), cold-blue accent (#5b9dff), blue-tinted neutrals, Hanken Grotesk for prose, Martian Mono for readouts and labels, the section-registration eyebrow marks (the `.reg` / `.reg-label` chips). The homepage (index.html) and the retired light landing carry their own inline styling rather than _brand, but use the same two typefaces.

Shared UI primitives the rebuild should treat as a vocabulary, not just CSS:

- Header / brand mark: "slop-detect / <section>" wordmark with a non-breaking hyphen, plus the eyebrow registration chip (for example "section score, domain record").
- Score gauge: the large tier-colored letter grade next to score/100, the tier pill (bordered, tier-colored), and the "lower is better" note. Repeated on index.html, /r/:id, /score, /report, and the OG card.
- tierColors mapping: Clean green (#4ade80), Mild yellow (#fbbf24), Heavy red (#f87171), unknown grey. System tiers map Aligned green, Drifting yellow, Off-system red.
- Badge: shields-style SVG, "slop" label plus "grade . score" value, tier-colored.
- Score-over-time chart: inline SVG line on /score, no dependencies, no gradients, dashed Clean<=10 guide.
- Tables: history table (/report), by-builder and category ranking tables (/leaderboard), directory rows.
- Footer: the recurring "a fingerprint, not a verdict" framing plus "Reproduce: npx slop-detect <domain>" line.

Dogfood guardrail: served surfaces must pass the product's own detector. Tests assert no Inter/Geist/Space Grotesk fonts and no gradient text on /directory, /leaderboard, /report, and the landing. The rebuild must keep this. One thing to reconcile: the /r/:id result card and the OG card (cardHtml) use a radial-gradient background, which is the kind of pattern the engine can flag (gradient backgrounds). It is an accent on share surfaces, not the audited pages, but the rebuild should decide deliberately rather than inherit it.

## KV data model (RESULTS)

The rebuild reuses this storage shape. Keys:

| Key              | Value                                                              | TTL        |
| ---------------- | ----------------------------------------------------------------- | ---------- |
| `r:<id>`         | Slim scan snapshot (score, tier, grade, verdict, triggered, axes) | 90 days    |
| `d:<domain>`     | Latest scan id for the domain                                     | 90 days    |
| `h:<domain>`     | Capped history array (last 50 points, with system reading)        | 1 year     |
| `w:<domain>`     | Watch record (email, baseline, last, regressed, system, listed)   | 1 year     |
| `wv:<token>`     | Verification token to domain (single-use)                         | 7 days     |
| `dt:<token>`     | Dashboard magic-link token to email (single-use)                  | 15 minutes |
| `l:<domain>`     | Directory listing record, with display summary in KV metadata     | 1 year     |
| `og:<id>`        | Cached share-card PNG                                              | 30 days    |
| `badge:<domain>` | Cached badge SVG                                                  | 3 hours    |
| `stats:dist`     | 101-bucket global score histogram                                 | none       |

Rate-limit KV (RATE_LIMIT) holds `rl:<route>:<bucket>` counters, `rl:global:scan:<day>` for the daily cap, and `key:<apikey>` records for API tiers.

Derived rules worth preserving: regression fires on a tier drop or a score increase of at least 8; system drift fires when no longer Aligned and either it fell from an Aligned baseline or dropped at least 15 points; baselines are sticky once set; history de-dupes by scan id; the directory row is derived from the watch and reconciled on every scan.

## Test coverage map and gaps

Covered: landing content and brand unification (landing), score hub (score), directory and listings (sites), dashboard sessions and isolation (dashboard), leaderboard (leaderboard), stats math and distribution (stats), /api/stats (api-stats), email builders and sweep and confirm (alerts), blog (blog), watch lifecycle and regression (watch), system drift and report and sweep (drift), API middleware gating (middleware), inline-script syntax and XSS escaping on dashboard/score/r (inline-scripts), and the SSRF guard (ssrf).

Direct-test gaps (work as a floor but unverified by a test): /api/scan (needs the BROWSER binding; its SSRF guard and persistence side effects are tested, the scan path itself is not), /api/aeo, /api/fix-prompt, /api/patterns, /og/:id.png, /badge/:domain.svg rendering, /directory rendering beyond sites/landing assertions, and the index.ts agent JSON view. The rebuild should add coverage here, especially for /api/scan contract shape, since it is the engine seam.

## Copy, SEO, meta, and discovery concerns

OG and unfurl: per-result cards at /og/:id.png (1200x630, cached 30 days, static /og.png fallback); /score, /r, and /leaderboard set OG and Twitter tags. The homepage and /score carry the canonical pattern. Keep the dynamic OG card; it is a real distribution driver.

Sitemap gap: sitemap.xml lists the static and index pages (/, index.md, compare, blog and posts, directory, leaderboard, api/patterns, openapi.json, the policy and llms files) but does NOT include any /score/:domain hub pages. Since the score hub is the rebuild's positioning centerpiece, the absence of a dynamic sitemap (or sitemap index) for scored domains is a discovery gap to close.

Canonical gap on /r/:id: the permalink has no rel=canonical. A domain accrues many /r/:id pages over time, all showing a similar score, which can dilute against the single /score/:domain hub. Consider canonicalizing /r/:id to /score/:domain or marking older permalinks appropriately.

Version drift risk: the version string 0.7.0 is hardcoded in several places (index.html JSON-LD softwareVersion, openapi.json, .well-known/agent-card.json, .well-known/mcp/server-card.json, functions/index.ts agentView). landing.test enforces JSON-LD softwareVersion equals package.json, but the others are manual. The pattern definitions version is similarly split: api/patterns.md header says 2026.08 while leaderboard.tsx defaults to 2026.09. The live source of truth is /api/patterns (DEFINITIONS_VERSION from core); the rebuild should derive versions from one place rather than copy them.

Agent and AEO surface (a real asset, do not drop): the agent JSON view at /?mode=agent, the five .well-known files (agent.json, agent-card.json, agent-skills/index.json, mcp/server-card.json, oauth-protected-resource), the llms.txt family (llms.txt, llms-full.txt, api/llms.txt, developers/llms.txt), api/patterns.md, openapi.json, robots.txt (Content-Signal: ai-train=no while allowing AI search crawlers), schema-map.xml (NLWeb feeds), and the Markdown twins (index.md, compare/index.md, blog .md, the policy .md files with text/markdown content types via _headers). The homepage JSON-LD graph (Organization, WebSite, SoftwareApplication, FAQPage, BreadcrumbList) is part of this.

Security headers (_headers): nosniff, strict-origin Referrer-Policy, HSTS, a restrictive Permissions-Policy, X-Frame-Options SAMEORIGIN, and a CSP scoped to Google Fonts and Turnstile with unsafe-inline for the existing inline script/style. The rebuild should keep equivalent headers; if it moves off inline scripts it can tighten the CSP.

Consistent framing to preserve: "a fingerprint, not a verdict", "lower is better", opt-in directory (never publish an unrequested verdict on a company), positive "Hall of Clean" framing on the leaderboard rather than a named hall of shame, and double opt-in before any monitoring email.

## MUST-NOT-REGRESS capability list

The rebuild has to preserve all of the following. Grouped by area; each is a capability the current product ships.

Scanning and scoring:

1. Scan any public URL in headless Chromium and return a 0-100 slop score, tier (Clean/Mild/Heavy), letter grade, verdict line, and per-pattern triggered/clean breakdown with weights and evidence.
2. SSRF protection on the scan target and on redirect hops and on the DESIGN.md fetch (block private, loopback, metadata, internal, and IPv6-mapped hosts; allow only http/https public hosts).
3. Anti-bot and dead-page detection returning a friendly 422 with a hint rather than a fake Clean 0.
4. Scoring presets (full, strict, marketing, minimal).
5. Copy axis (scoreCopy, unified score/tier/grade) and system axis (DESIGN.md compliance with named drift, tiers Aligned/Drifting/Off-system/No system/No data) and AEO axis (separate fetch-based endpoint).
6. Optional screenshot and an opt-out of persistence (share:false) for CI use.

Distribution loop:

7. Shareable scan permalink /r/:id (90-day retention) with a friendly expired state.
8. Dynamic OG share card /og/:id.png (1200x630, cached, static fallback) and per-domain badge /badge/:domain.svg (cached, self-rendered, no-scan fallback).
9. Share to X and LinkedIn, copy link, and embed snippets in Markdown / HTML / URL.
10. Fix-prompt generation and one-click handoff into ChatGPT, Claude, and Cursor (with the long-prompt clipboard fallback).

Per-domain hub and claim:

11. The /score/:domain canonical hub: latest grade, axis chips, score-over-time chart, peer percentile, triggered patterns, re-scan, this-scan link, printable report link, share, embed badge.
12. The claim model: dofollow backlink only after an email-verified claim; unclaimed shows a claim CTA and no backlink. The empty (never-scanned) state with a scan CTA.

Monitoring and continuity:

13. Subscribe / unsubscribe / re-subscribe with additive list and system flags, double opt-in via verification email and /api/watch/confirm, baseline and regression detection, and system drift detection.
14. Public watch status with no email leakage.
15. The cron sweep that re-scans verified watches and sends one regression and/or drift email per event, re-arming on recovery; driven by an external scheduler with CRON_SECRET and INTERNAL_API_KEY.
16. The printable /report/:domain client deliverable (screen plus print stylesheet, noindex, email-free).
17. The agency dashboard: magic-link login, HMAC session cookie, multi-domain view, strict ownership isolation, logout; plus the anti-enumeration link endpoint.
18. Email via Resend with graceful no-provider degradation and email-redacting logs.

Directory, leaderboard, stats:

19. The opt-in /directory with dofollow backlinks, ItemList JSON-LD, sort modes, pending handling, and empty state; plus the /api/sites JSON mirror.
20. The /leaderboard research page with corpus aggregate, category and by-builder rankings linking to score hubs, a live counter, and the generate-then-serve dataset model.
21. The global score distribution, /api/stats aggregate, peer percentile, and homepage live headline.

Content, agent surface, security:

22. The blog (index, posts, Markdown twins) and its content.
23. The live /api/patterns catalogue and the /api/aeo endpoint.
24. The full agent and AEO surface: agent JSON view, the five .well-known files, the llms.txt family, openapi.json, robots/sitemap/schema-map, Markdown twins, the security headers, and the homepage JSON-LD graph.
25. The protection stack: per-IP and API-key rate limiting, Turnstile, foreign-origin rejection, fail-closed scan behavior on KV outage, the global daily cost cap, and the kill switch.

Brand and framing:

26. The shared brand system (Hanken Grotesk plus Martian Mono, cold-blue accent, no gradients/glows on audited pages) and the dogfood guardrail that every served surface passes the product's own detector.
27. The product framing: "a fingerprint, not a verdict", "lower is better", opt-in only, double opt-in, and the positive leaderboard framing.

28. The RESULTS KV data model (keys and TTLs above) and the derived rules (regression at +8 or tier drop, drift at +15 or fell-from-Aligned, sticky baselines, history de-dup, directory reconciliation).
