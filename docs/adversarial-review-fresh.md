# Adversarial Architecture Review (code-grounded, fresh)

Reviewer stance: hostile. Every finding below is formed from the source code only,
with public `file:line` evidence. No existing review, spec, parity, or design doc in
the repo was read as input or cited. Severity is calibrated to a detector + CLI + web
product where the unauthenticated, browser-driving `/api/scan` surface is the highest
stake. Findings are deliberately few and high-confidence: a long speculative list is
worse than a short list you can act on.

Scope walked end to end: `packages/core` (scoring engine, AEO axis, DESIGN.md system
axis, rules compiler), `packages/cli` (Playwright runner), `packages/mcp` (stdio
proxy), `packages/action` (composite GitHub Action), `apps/web/functions` (the
Cloudflare Pages Functions: scan, aeo, watch, cron sweep, fix-prompt, dashboard, og,
badge, middleware, persistence, SSRF guard, sessions, reporting).

Two structural facts drive most findings:

1. The web app runs on Cloudflare Workers, where you cannot DNS-resolve a hostname
   before navigating to it. The SSRF guard is therefore hostname-shape-only by
   necessity (`functions/_ssrf.ts:6-9`).
2. `functions/api/_middleware.ts` is scoped to `/api/*`. The browser-launching
   `GET /og/:id.png` lives under `/og/`, so it is outside every rate-limit, cost-cap,
   Turnstile, and kill-switch control the team built.

## Severity summary

| ID      | Sev | Area        | One line                                                                                  | Tag       |
| ------- | --- | ----------- | ----------------------------------------------------------------------------------------- | --------- |
| SEC-1   | P1  | security    | Residual SSRF: DNS-rebind + spoofable page-reported final URL (acknowledged in code)      | CODE+OPS  |
| REL-1   | P1  | reliability | No browser session reuse: a fresh `puppeteer.launch` per request on a capacity-capped pool | CODE      |
| SEC-2   | P2  | security    | Unbounded fetched-body reads (AEO bot/robots/md/llms + scan DESIGN.md) exhaust the isolate | CODE      |
| REL-2   | P2  | reliability | `/og/:id.png` launches a browser outside the cost-guard middleware (no cap, no kill switch) | CODE+OPS  |
| REL-3   | P2  | reliability | Score depends on a render-timing race; scan.ts never waits for `document.fonts.ready`     | CODE      |
| COST-1  | P2  | cost/abuse  | Daily cost cap + per-IP limit are non-atomic KV read-modify-write: cap overshoots on bursts | CODE+OPS  |
| DM-1    | P2  | data model  | Per-pattern eval errors are swallowed to `triggered:false`; scores silently drift low      | CODE      |
| DM-2    | P2  | data model  | "Deterministic" score is not pinned to a Chromium engine version; CLI vs web vs time drift | CODE+OPS  |
| COU-1   | P2  | coupling    | `buildPageScript` + `detectBlocked` duplicated verbatim across web + CLI, no parity test   | CODE      |
| OPS-1   | P2  | operational | Error-webhook alert uses a detached fetch without `waitUntil`; the page-a-human path is lossy | CODE+OPS  |
| OPS-2   | P2  | operational | CI gates deploy on a live scan of news.ycombinator.com with a hard `score<12` threshold     | CODE+OPS  |
| SEC-3   | P3  | security    | Turnstile is bypassed by omitting the Origin header (by design; document the real floor)   | CODE+OPS  |
| COST-2  | P3  | cost/abuse  | `/api/dashboard/link` runs `listWatchesByEmail` = O(all watches) KV reads per anon POST    | CODE      |
| CONC-1  | P3  | concurrency | Non-atomic KV RMW on stats/history counters loses increments (percentile/stat drift)       | CODE      |
| DEP-1   | P3  | dependency  | Deploy-path GitHub Actions pinned to mutable major tags, not SHAs (token-holding workflow) | CODE+OPS  |
| SEC-4   | P3  | security    | Action accepts `pull_request_target`; example workflow lacks a least-trust warning         | CODE+OPS  |

No clean P0 is provable from the code alone. The two P1s are the residual SSRF (whose
real-world severity depends on Cloudflare Browser Rendering egress, which the source
cannot confirm) and the launch-per-request browser model (whose failure threshold
depends on the platform's concurrency cap). Both are stated with that contingency.

---

## Findings

### SEC-1 — Residual SSRF: DNS-rebind and spoofable final URL (P1, CODE+OPS)

Problem. `/api/scan` loads an arbitrary user URL in a real headless Chromium and
returns reconstructed page content (title, h1, text, optional screenshot). The guard
`validateScanUrl` blocks by hostname shape only because the Workers runtime cannot
resolve DNS before navigation (`functions/_ssrf.ts:6-9`). So a public hostname whose
A record points at `169.254.169.254` or an RFC-1918 address (classic DNS rebinding)
passes the pre-flight and is navigated. The post-navigation re-check
(`functions/api/scan.ts:111`) compares `data.url`, which is the page-reported
`location.href` and is spoofable by the target via `history.pushState`. The code says
this itself: "data.url is the page-reported location.href, which a hostile page can
spoof... this is NOT a hard boundary" (`functions/api/scan.ts:104-110`). The only true
guard left is Cloudflare Browser Rendering's own egress, which the source cannot
verify.

Evidence. `functions/_ssrf.ts:6-9`, `functions/api/scan.ts:87-121`.

Fix. Do not trust `data.url` for the boundary. Re-validate on the navigation host, not
the page-reported href: capture the final response URL from the puppeteer navigation
(`response.url()` / the request chain) rather than from in-page JS, and refuse when it
differs from the pre-validated host or fails `isAllowedUrl`. Reuse the existing
`isAllowedUrl` primitive (`functions/_ssrf.ts:109`). The DNS-rebind leg cannot be fully
closed inside Workers, so pair the code fix with an operational note that the deploy
relies on Cloudflare Browser Rendering blocking RFC-1918 and metadata egress.

Acceptance. Extend `apps/web/test/scan-contract.test.js` (or a new test that drives
`onRequestPost` with a mocked browser): a page object whose in-page `location.href`
reports a public host but whose navigation response URL is on a private host must
return `code:'blocked_redirect'`. A second case: a same-host `pushState` to a private
href must not change the verdict because the check no longer reads `data.url`. No live
network: mock the `env.BROWSER` launch + `page.evaluate`.

CODE+OPS.

### REL-1 — No browser session reuse; one `launch` per request (P1, CODE)

Problem. Both browser entry points cold-launch a fresh browser per request and close
it: `browser = await puppeteer.launch(env.BROWSER)` in `functions/api/scan.ts:87` and
`functions/og/[id].ts:40`. Cloudflare Browser Rendering enforces an account-level
concurrent-browser cap; cold-launching per request is the slowest and most
failure-prone mode, and under modest concurrency launches start failing, surfacing as
the generic 502 at `functions/api/scan.ts:259`. `@cloudflare/puppeteer` (already a
dependency, `apps/web/package.json`) exposes session reuse (`sessions()` / `connect()`)
precisely so a Worker reuses a warm browser instead of launching one per request.

Evidence. `functions/api/scan.ts:85-88,260-264`, `functions/og/[id].ts:38-41`,
`apps/web/wrangler.toml` (`[browser] binding = "BROWSER"`, no concurrency config).

Fix. Add one shared helper in `apps/web/functions` that connects to a free existing
session via `puppeteer.sessions(env.BROWSER)` + `puppeteer.connect(...)` and only
`launch`es when none is free, with a short keep-alive. Call it from both `scan.ts` and
`og/[id].ts`. This composes with REL-2 (the same helper is the natural place to put the
shared cost-guard).

Acceptance. Contract test with a mock `env.BROWSER` whose `sessions()` returns an
idle session id: assert the helper calls `connect` and does not call `launch`; when
`sessions()` is empty it does call `launch`. No live binding needed.

Severity note. P1 is contingent on the platform concurrency cap, which the source
cannot read. The code-level fact (no reuse, launch-per-request) is certain and is the
central reliability and cost bottleneck of the paid surface.

CODE.

### SEC-2 — Unbounded fetched-body reads exhaust the isolate (P2, CODE)

Problem. The AEO axis caps only the main HTML body with the streaming `readCapped`
helper (`packages/core/src/aeo.ts:212-241`). Every other fetched body is read with an
unbounded `.text()`: the GPTBot probe (`aeo.ts:440`), robots.txt (`aeo.ts:469`), the
markdown twin (`aeo.ts:515`), and `/llms.txt` (`aeo.ts:559`). Separately, the scan
endpoint fetches a user-controllable DESIGN.md and reads the entire body before
slicing: `mdText = (await res.text()).slice(0, 200_000)` (`functions/api/scan.ts:219`),
so the 200 KB cap is applied after buffering the whole response. Both `/api/aeo` and
`/api/scan` with `{ designMd: "<url>" }` are reachable unauthenticated (gated as scan
by the middleware). A hostile public target that serves a few hundred MB on robots.txt,
llms.txt, or DESIGN.md forces the worker to buffer it, blowing the isolate memory/CPU
budget and wasting egress per request.

Evidence. `packages/core/src/aeo.ts:212-241,440,469,515,559`,
`functions/api/scan.ts:213-219`.

Fix. Reuse the existing streaming-cap primitive: apply `readCapped` to every body the
AEO axis reads (it already exists in the same file), and stream-cap the DESIGN.md fetch
in `scan.ts` instead of `.text().slice()`. Optionally short-circuit on an oversized
`Content-Length` header before reading.

Acceptance. Mirror `packages/core/test/aeo.test.js`: a mocked `fetchImpl` whose
response `body` stream yields more than the cap; assert the decoded length is <= cap
and the reader was cancelled. For scan, a `fetchAllowedUrl` mock returning an oversized
body must not buffer beyond the cap.

CODE.

### REL-2 — `/og/:id.png` launches a browser outside the cost-guard middleware (P2, CODE+OPS)

Problem. `functions/api/_middleware.ts` runs only on `/api/*` (Cloudflare Pages
middleware is path-scoped to its directory). `GET /og/:id.png` lives under `/og/` and
launches a headless browser (`functions/og/[id].ts:40`) with NONE of the controls the
team built for `/api/scan`: no rate limit, no Turnstile, no `SCAN_DAILY_CAP`, and
critically no `SCAN_DISABLED` kill switch. Browser spend here is ungoverned. It is
bounded by "the id must already exist in RESULTS KV" and a 30-day cache
(`functions/og/[id].ts:26-31,55-58`), but: the kill switch cannot stop `/og` browser
spend during an incident; a KV cache-read failure or eviction makes repeated GETs
re-launch a browser per hit with no ceiling; and there is no edge-cache key control, so
KV is the only cache of record.

Evidence. `functions/og/[id].ts:14-68`; route map shows `_middleware.ts` only under
`functions/api/`.

Fix. Extract the cost-guard checks (`SCAN_DISABLED`, daily cap) into a shared helper
and call it from both `scan.ts` and `og/[id].ts`, or at minimum honor `SCAN_DISABLED`
in `og/[id].ts` (serve the static `/og.png` fallback when paused). This pairs with the
REL-1 shared browser helper.

Acceptance. Vitest driving `og.onRequestGet` with `env.SCAN_DISABLED='1'`: assert it
serves the fallback/redirect and never calls `launch` on the mock `env.BROWSER`. A
second case with a valid id and a cache-miss asserts at most one launch.

CODE+OPS.

### REL-3 — Render-timing race makes the score non-deterministic across runs and runners (P2, CODE)

Problem. The score is the sum of triggered pattern weights, deterministic given the
DOM, but the DOM is captured after a fixed wait budget, not after fonts/CSS settle. The
web runner waits `waitForNetworkIdle({idleTime:500,timeout:6000})` raced against a 7 s
cap plus 400 ms (`functions/api/scan.ts:93-99`) and then evaluates, with no
`document.fonts.ready`. The CLI runner uses a different profile:
`waitForLoadState('networkidle',{timeout:8000})` + 500 ms (`packages/cli/src/detector.ts:338-341`).
A page whose web fonts apply after the wait window is scored against fallback fonts, so
font/contrast/tracking patterns (`slop_fonts`, `crushed_tracking`, `low_contrast_text`)
misfire, producing a different score for the same page run to run, and a systematically
different score between CLI and web. Notably, `functions/og/[id].ts:47` already does the
right thing (`document.fonts.ready`) for the card, but the scoring path does not.

Evidence. `functions/api/scan.ts:93-102`, `packages/cli/src/detector.ts:338-343`,
`functions/og/[id].ts:46-48`.

Fix. Await `document.fonts.ready` (bounded by a timeout) before `page.evaluate` in both
runners, and unify the wait profile between `scan.ts` and `detector.ts` (a single
shared constant once COU-1 lands).

Acceptance. A local fixture HTML that swaps in a web font after a delay; assert the
font-dependent signal is stable when the fonts.ready wait is present and unstable
without it. No third-party network: serve the fixture from the test.

CODE.

### COST-1 — Daily cost cap and per-IP limit are non-atomic and overshoot on bursts (P2, CODE+OPS)

Problem. The account-level daily browser budget is a KV read-modify-write:
`used = parseInt(await env.RATE_LIMIT.get(gkey))` then `put(gkey, String(used+1))`
(`functions/api/_middleware.ts:431-461`). The per-IP scan limit is the same shape in
`checkRateLimit` (`functions/api/_middleware.ts:178-203`). Under concurrent in-flight
requests, many read the same counter value and all pass, so both the per-IP limit and
`SCAN_DAILY_CAP` can be overshot by the concurrency factor. For ordinary stats this is
fine and the code says so, but here it is the actual cost ceiling on a billed
browser-rendering surface, so a parallel burst can run the bill past the cap before any
write lands.

Evidence. `functions/api/_middleware.ts:174-219,426-464`.

Fix. KV has no atomic counter, and the codebase already names the correct primitive for
hard guarantees: a Durable Object (see the same reasoning at `functions/_data.ts:170-173`
for tokens). Short of that, the in-tree `memIncrement` per-isolate ceiling already
exists for the KV-outage path (`functions/api/_middleware.ts:138-160`); make it also
tick on the happy path so a single isolate cannot burst past the limit even when KV is
up, accepting KV as the eventually-consistent cross-isolate backstop.

Acceptance. `apps/web/test/middleware.test.js` already drives `onRequest` with a KV
mock. Add a mock whose `get` returns a fixed/stale count across K parallel `onRequest`
calls; assert no more than `limit` return 200 (fails today).

CODE+OPS.

### DM-1 — Per-pattern eval failures are swallowed; scores silently drift low (P2, CODE)

Problem. Each pattern's `extract` is serialized and injected, wrapped in a try/catch
that converts any failure into `{ triggered: false, error: e.message }`
(`functions/api/scan.ts:326-332`, `packages/cli/src/detector.ts:162-169`). A pattern
that throws (for example a contributor adds a rule using a helper not wired into `ctx`,
or a Chromium API changes) therefore never triggers, lowering the score, and the page
reads cleaner than it is. The overall result is still returned as a valid score; there
is no `patternsErrored` count surfaced to the API consumer and nothing logs it. The
only related guard, `detectBlocked`, treats `patternsWithEvidence < 4` as an empty page
(`functions/api/scan.ts:311`), which catches a wholesale render failure but not one or
two broken patterns out of 27. A scoring regression can ship without failing a test
unless a golden fixture happens to cover that exact pattern.

Evidence. `functions/api/scan.ts:149-160,275-279,326-332`,
`packages/cli/src/detector.ts:162-169,366-378`.

Fix. Count patterns whose evidence carries an `error` and surface it: add
`patternsErrored` to the result and `report(env,'warn','pattern_errors',...)` when it is
nonzero. This reuses the existing `report` shim (`functions/_report.ts`). Optionally
fail a scan whose error count exceeds a small threshold rather than returning a
falsely-clean number.

Acceptance. Unit test (no browser) that feeds `scorePatterns` / the result assembler a
synthetic `data.signals` where one pattern carries `{ error: '...' }`; assert
`patternsErrored === 1` is present in the assembled result.

CODE.

### DM-2 — Score determinism is not pinned to a rendering engine version (P2, CODE+OPS)

Problem. The product is marketed as deterministic
(`packages/cli/package.json` description: "deterministic"), and `DEFINITIONS_VERSION`
captures rule changes (`packages/core/src/index.ts:63`). But the score is produced by
running getComputedStyle-based detectors inside a browser, and the browser engine
version is not pinned and differs across runners. The CLI uses Playwright at a floating
caret (`packages/cli/package.json`: `playwright ^1.49.0`) and lazily downloads whatever
Chromium that version ships (`packages/cli/src/detector.ts:62-103`). The web uses
Cloudflare Browser Rendering's Chromium, a different engine entirely. Same page, two
engines, plus drift over time as either updates: `getComputedStyle` rounding,
font-fallback, and gradient serialization changes all move signals. Nothing records the
engine version alongside `DEFINITIONS_VERSION`, so a score change cannot be attributed
to "rule change vs site change vs engine change."

Evidence. `packages/cli/package.json` (`playwright ^1.49.0`), `packages/cli/src/detector.ts:42-103`,
`packages/core/src/index.ts:63-86`, `apps/web/wrangler.toml` (`[browser]`).

Fix. Record the engine identity in the result next to `definitionsVersion` (capture
`browser.version()` on each runner and include it in the slim record and the API
response). Pin the CLI's Playwright to an exact version so the downloaded Chromium is
reproducible. This does not make the two engines identical, but it makes drift
explainable and lets the golden corpus assert "scored on engine X."

Acceptance. Assert the assembled result includes a non-null `engine`/`browserVersion`
field; a golden test pins the field so a Playwright bump that changes it is visible.
No live network.

CODE+OPS.

### COU-1 — Two hand-copied scan runners with no parity test (P2, CODE)

Problem. `buildPageScript` and `detectBlocked` exist twice, copied verbatim, bound only
by a comment. The CLI's `detectBlocked` is literally annotated "mirrored from
packages/web/functions/api/scan.js" (`packages/cli/src/detector.ts:105`), and
`buildPageScript` is duplicated at `functions/api/scan.ts:324-404` and
`packages/cli/src/detector.ts:161-244` with the same ctx wiring and the same comment
about omitted helpers. There is no shared module and no test asserting the two produce
the same page script, so they can silently diverge: a fix to one runner's blocked
heuristics or ctx surface does not reach the other, and that divergence is exactly what
makes DM-2's cross-runner score gap worse and DM-1's silent-failure surface twice as
large.

Evidence. `functions/api/scan.ts:324-404` vs `packages/cli/src/detector.ts:161-244`;
`functions/api/scan.ts:267-321` vs `packages/cli/src/detector.ts:105-148`.

Fix. Hoist `buildPageScript`, the `ctx` assembly, and `detectBlocked` into
`@slop-detect/core` (the package already owns the pure detection contract,
`packages/core/src/index.ts:1-10`). Both runners import one implementation; the only
runner-specific code is launch + navigate + evaluate. This is the foundation other
fixes build on (REL-3 wait unification, DM-1 error surfacing, DM-2 engine capture all
touch these functions).

Acceptance. A core unit test that snapshots the generated page-script string and is
imported by both runners; if either runner's wiring drifts, the snapshot test fails.

CODE.

### OPS-1 — Error-webhook alerts are lossy; the page-a-human path is the least reliable (P2, CODE+OPS)

Problem. `report()` fires the out-of-band error webhook as a detached promise with an
explicit comment that "ctx.waitUntil would be ideal, but report() is called from places
without ctx; a detached promise still flushes on Workers within the request budget"
(`functions/_report.ts:30-40`). On Cloudflare Workers a promise not registered with
`ctx.waitUntil` is not guaranteed to run after the response is returned; the runtime may
cancel pending I/O once the response is sent. So the one path designed to page a human on
`scan_failed` / `persist_failed` (`functions/api/scan.ts:248,255`) is the most likely to
silently drop. The same handlers that call `report` do receive the full context with
`waitUntil` (see `functions/api/dashboard/link.ts:39,84` using it correctly).

Evidence. `functions/_report.ts:25-41`, `functions/api/scan.ts:248-258`,
contrast `functions/api/dashboard/link.ts:78-85`.

Fix. Thread `ctx.waitUntil` into `report(env, level, event, data, waitUntil)` and
register the webhook fetch with it, exactly as `dashboard/link.ts` already does. While
there, emit scan-duration (`navMs` already computed at `functions/api/scan.ts:100`) and
the DM-1 `patternsErrored` count so failures are observable, not just alertable.

Acceptance. Unit test: call `report` with a `waitUntil` spy and `ERROR_WEBHOOK` set;
assert `waitUntil` was invoked with the fetch promise (no real network: stub
`globalThis.fetch`).

CODE+OPS.

### OPS-2 — CI gates production deploys on a live third-party scan (P2, CODE+OPS)

Problem. The `smoke-cli` job in `.github/workflows/ci.yml` runs the CLI against
`https://news.ycombinator.com` and fails the job if `score > 12`. Deploy is chained to
this: `.github/workflows/deploy.yml` triggers on `workflow_run` of `ci` completing
`success` on main. So a Hacker News redesign, an HN outage, or a transient bot wall
fails the `ci` workflow and blocks production deploys on something entirely outside the
team's control, with a hard numeric threshold and no fixture fallback.

Evidence. `.github/workflows/ci.yml` (smoke-cli job, `if [ "$score" -gt 12 ]`),
`.github/workflows/deploy.yml` (`workflow_run: workflows:['ci'] ... branches:[main]`).

Fix. Move the live scan out of the deploy-gating path: either make `smoke-cli` a
non-blocking informational job, or scan a fixture HTML served locally from the repo
(the test corpus and `assets-raw/` fixtures already exist) so the smoke test is
hermetic. Keep a live scan as a scheduled canary that pages but does not gate deploys.

Acceptance. CI passes with the upstream site unreachable (simulate by pointing the
smoke target at a local fixture file); deploy is no longer reachable from a third-party
outage.

CODE+OPS.

### SEC-3 — Turnstile is bypassed by omitting the Origin header (P3, CODE+OPS)

Problem. Turnstile is enforced only for `trusted` browser origins:
`if (effectiveRoute === 'scan' && trusted && env.TURNSTILE_SECRET && !skipTurnstile)`
(`functions/api/_middleware.ts:391`). A no-origin caller (curl, CLI, any client that
omits `Origin`) is classified not-foreign and passes through with only the per-IP limit
(`Math.max(2, floor(6/2)) = 3`/min, `functions/api/_middleware.ts:336-343`). This is
intentional so the CLI works without a captcha, but it means the human-proof gate
protects only the web UI: the endpoint's real anti-abuse floor is the per-IP KV limit
plus the global cap, both weakened by COST-1.

Evidence. `functions/api/_middleware.ts:312-322,336-343,384-405`.

Fix. Treat this as the documented design and lean on the cost cap as the true ceiling
(fix COST-1 first). If tighter is wanted, require a (free-tier) API key or a small
proof-of-work for no-origin scan callers rather than a captcha.

Acceptance. Documented expectation, plus a middleware test asserting a no-origin scan
is allowed only up to the anon no-origin limit.

CODE+OPS.

### COST-2 — `/api/dashboard/link` does an O(all-watches) KV scan per anonymous POST (P3, CODE)

Problem. The unauthenticated magic-link endpoint calls `listWatchesByEmail`
(`functions/api/dashboard/link.ts:71`), which calls `listWatches(kv,{limit:1000})` and
then does a per-record `kv.get` for every watch before filtering by email
(`functions/_data.ts:208-231`). So each login attempt drives up to ~1000 KV reads
regardless of whether the email owns anything. Gated only by the cheap per-IP limit
(20/min), that is up to ~20k KV reads per minute per IP, a read-amplification and cost
lever on an endpoint that returns a constant anti-enumeration response anyway.

Evidence. `functions/api/dashboard/link.ts:70-86`, `functions/_data.ts:208-231`.

Fix. Maintain an email-to-domains index key (`e:<emailhash> -> [domains]`) written on
subscribe in `watch.ts`, so the lookup is one `kv.get` instead of a full scan. Reuse
the existing `newId`/KV helpers; no new infra.

Acceptance. Unit test that subscribing writes the index key and that the dashboard-link
path reads exactly one index key (spy on the KV mock's `get` call count).

CODE.

### CONC-1 — Non-atomic KV counters lose increments under concurrency (P3, CODE)

Problem. The global score distribution and per-category clean stats are read-modify-write
(`bumpScoreStats` `functions/_data.ts:336-342`, `bumpCategoryStats` `functions/_data.ts:310-321`),
as is the per-domain history append (`functions/_data.ts:250-259`). Concurrent persisted
scans read the same array/object and overwrite each other, losing increments. The code
acknowledges this for the distribution ("counts are approximate under heavy
concurrency, which is fine for a percentile", `functions/_data.ts:280`). Impact is
limited to slightly-off stats and percentiles, not correctness of a single scan, so this
is low severity; it is listed for completeness as the same non-atomic-KV pattern that is
material in COST-1.

Evidence. `functions/_data.ts:250-259,310-321,336-342`.

Fix. Accept as-is for stats (the tradeoff is reasonable), or move the hot counters to a
Durable Object if exactness ever matters. No change recommended beyond COST-1.

Acceptance. None required; documented as accepted.

CODE.

### DEP-1 — Deploy-path Actions pinned to mutable tags, not SHAs (P3, CODE+OPS)

Problem. The workflows that hold `CLOUDFLARE_API_TOKEN` use third-party actions at
floating major tags: `actions/checkout@v4`, `oven-sh/setup-bun@v2`,
`cloudflare/wrangler-action@v3` (`.github/workflows/deploy.yml`, `.github/workflows/ci.yml`).
A tag is mutable, so a compromised upstream tag runs in a job that can read the
Cloudflare deploy secret. The application's npm dependencies are reproducible (a
`bun.lock` is committed, 271 KB), so the gap is specifically the unpinned Actions, which
the lockfile does not cover.

Evidence. `.github/workflows/deploy.yml`, `.github/workflows/ci.yml`; `bun.lock` present
at repo root.

Fix. Pin each third-party action to a full commit SHA (with the version in a trailing
comment). Optionally add Dependabot for the actions ecosystem so pins stay current.

Acceptance. Workflows reference `@<40-char-sha>` for non-first-party actions; a lint or
review check enforces it.

CODE+OPS.

### SEC-4 — Action accepts `pull_request_target` without a least-trust warning (P3, CODE+OPS)

Problem. The composite Action reads a PR number from both `pull_request` and
`pull_request_target` events (`packages/action/scan.mjs:206`). `pull_request_target`
runs with a write-scoped token even for fork PRs. The action itself does not check out
or execute PR code and only forwards the `url` input to the public API and posts a
sticky comment, so the direct risk is low. But the example workflow does not warn
downstream users away from wiring it on `pull_request_target` with a PR-controlled URL,
which is the configuration where the elevated token plus an untrusted input becomes a
footgun.

Evidence. `packages/action/scan.mjs:203-216`, `.github/workflows/slop-check.example.yml`
(uses `workflow_dispatch`, no `pull_request_target` guidance).

Fix. Add a comment in `action.yml` / the README that `pull_request_target` should be
used only with a trusted, workflow-derived deploy-preview URL, and recommend least
privilege (`permissions: pull-requests: write` only, which the example already sets).
Treat the `url` input as untrusted (it already is; it only reaches `fetch`).

Acceptance. Documentation change; optionally the action logs a notice when it detects
`GITHUB_EVENT_NAME=pull_request_target`.

CODE+OPS.

---

## Dependency-ordered ranking (what lands before what)

Land in this order so foundation work is not redone and hot files are touched once.

Tier 0, P1 on the highest-stakes surface, independent, do first:

1. SEC-1 (residual SSRF) — change the boundary to the navigation response host. Self-contained in `scan.ts`.
2. REL-1 (browser session reuse) — add the shared connect-or-launch helper. Self-contained, unblocks REL-2.

Tier 1, FOUNDATION refactors other fixes build on:

3. COU-1 (single shared runner module) — hoist `buildPageScript` + `ctx` + `detectBlocked` into core. This must precede REL-3, DM-1, and DM-2 because all three edit those functions; doing it first turns three double-edits into single-edits.
4. Shared cost-guard helper (the `SCAN_DISABLED` + daily-cap check) — extracted once, consumed by REL-2.

Tier 2, P2 correctness and cost, after the foundation:

5. REL-2 (`/og` under the cost guard) — depends on 2 and 4.
6. SEC-2 (cap all fetched bodies) — `aeo.ts` + `scan.ts`, independent.
7. COST-1 (burst-proof the cost cap) — `_middleware.ts`, independent.
8. REL-3 (fonts.ready + unified wait) — depends on 3.
9. DM-1 (surface `patternsErrored`) — depends on 3, feeds 11.
10. DM-2 (record engine version, pin Playwright) — depends on 3.

Tier 3, P2/P3 operational and hygiene, independent, any order:

11. OPS-1 (waitUntil on the webhook; emit navMs + patternsErrored) — pairs with 9.
12. OPS-2 (de-gate deploy from the live HN scan).
13. COST-2 (email-to-domains index).
14. DEP-1 (SHA-pin Actions). 15. SEC-3 and SEC-4 (documentation + the COST-1 dependency). CONC-1 is accepted as-is.

Foundation set, explicitly: COU-1 and the shared cost-guard/browser helpers (items 3, 4)
plus REL-1. Everything in Tier 2 is cheaper and safer once those exist.

## Hot-file collision map (serialize these in Phase 1)

Files touched by two or more findings. Edit each in one pass, in the ranking order
above, to avoid merge churn and re-review.

| File                                          | Findings that touch it             | Note                                                                 |
| --------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| `apps/web/functions/api/scan.ts`              | SEC-1, SEC-2, REL-1, REL-3, DM-1, DM-2, COU-1, OPS-1 | The single hottest file. Land COU-1 (extract) first, then the rest against the slimmed runner. |
| `packages/cli/src/detector.ts`                | REL-3, DM-1, DM-2, COU-1           | Mirror of scan.ts; COU-1 removes the duplication so the others edit core once. |
| `apps/web/functions/api/_middleware.ts`       | COST-1, SEC-3                       | Cost cap + Turnstile origin logic; one pass.                          |
| `apps/web/functions/og/[id].ts`               | REL-1, REL-2                       | Shared browser helper + cost guard land together here.               |
| `packages/core/src/aeo.ts`                    | SEC-2                              | Apply `readCapped` to all bodies; single finding but central file.   |
| `apps/web/functions/_report.ts`               | OPS-1                             | Add `waitUntil` param; callers in scan.ts updated in the same pass.  |
| `.github/workflows/ci.yml`                    | OPS-2, DEP-1                      | De-gate live scan + SHA-pin actions.                                 |
| `.github/workflows/deploy.yml`                | OPS-2, DEP-1                      | Same two changes on the deploy path.                                 |
| `apps/web/functions/api/watch.ts`             | COST-2                            | Write the email-to-domains index on subscribe (paired with _data.ts).|
| `apps/web/functions/_data.ts`                 | COST-2, CONC-1                    | Index helper + the accepted stat-race note.                          |

## Validated strengths — do not touch, do not refactor

These are correct and load-bearing. Leave them as they are.

1. IPv6 SSRF decode. `embeddedIPv4` (`functions/_ssrf.ts:53-63`) decodes the
   hex-normalized form `new URL()` produces (`[::ffff:169.254.169.254]` ->
   `[::ffff:a9fe:a9fe]`) and re-applies the v4 rules, closing a real metadata-read
   bypass. The regression cases are locked in `apps/web/test/ssrf.test.js`. Keep both.

2. Fail-closed scan limit during KV outage. `memIncrement` + `SCAN_FALLBACK_CEILING`
   (`functions/api/_middleware.ts:138-160,188-196`) keep the expensive browser route
   capped when KV is unavailable while letting cheap routes fail open. Correct asymmetry.

3. effectiveRoute gating. `fix-prompt {url}` and `/api/aeo` are gated AS scan
   (`functions/api/_middleware.ts:261-274`), closing the bypass where a looser limit
   would drive the browser/fan-out. This is a subtle, correct defense.

4. detectBlocked refuses to fake a Clean 0. Bot-wall and dead-page detection returns
   422 instead of a falsely-clean score (`functions/api/scan.ts:122-138,267-321`). This
   is the right product call and protects the score's credibility.

5. Double-opt-in + anti-enumeration dashboard. Constant response body and latency,
   `waitUntil`-deferred send, fail-closed per-email cap (`functions/api/dashboard/link.ts`),
   single-use tokens with the honest get-then-delete race note (`functions/_data.ts:166-204`).
   Well-reasoned. (COST-2 is only about the lookup cost, not this design.)

6. Ownership + ordering on /api/watch. Email-matched modify/unsubscribe, watch persisted
   before the derived directory row, self-healing reconcile (`functions/api/watch.ts:73-196`).
   The "source of truth before derived state" ordering is correct.

7. Stateless HMAC sessions. `_session.ts` uses Web Crypto HMAC-SHA256 with a
   constant-time compare and `HttpOnly; Secure; SameSite=Lax` (`functions/_session.ts`),
   secret from env, no accounts table. Clean indie-auth.

8. Pure, runtime-agnostic core. `@slop-detect/core` has no fetch/puppeteer/playwright
   (`packages/core/src/index.ts:1-10`); `scorePatterns`, `scoreCopy`, `combineAxes`,
   `gradeForScore`, `verdictFor` are pure and directly unit-tested. The clean boundary is
   what makes most acceptance tests above possible without a browser. (COU-1 asks to move
   MORE into core, consistent with this boundary, not to break it.)

9. CRON sweep auth. Bearer secret with a constant-time compare and an unlimited-tier
   internal key for the re-scans (`functions/api/cron/sweep.ts:29-53`). Disabled by
   default when `CRON_SECRET` is absent. Correct.

10. Reproducible app dependencies. `bun.lock` is committed, so npm-level supply chain is
    pinned. (DEP-1 is only about the Actions, which the lockfile does not cover.)

11. `readCapped` streaming cap. The primitive itself (`packages/core/src/aeo.ts:212-241`)
    is the right design. SEC-2 is not "fix readCapped"; it is "apply it everywhere."

12. No committed secrets. A scan of the source for live keys/tokens found none; secrets
    are read from env throughout (`wrangler.toml` documents them as Pages env vars, only
    the public Turnstile sitekey is committed, which is correct).
