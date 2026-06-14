# Migration plan: TypeScript + Hono/JSX

Status: **proposed** — design for review before code lands.
Owner: code-quality pass. Builds on PR #23 (lint/format gate + `_shared.js` split).

This document is the agreed checkpoint ("plan/design doc first") for the two
remaining large pieces of the quality pass:

1. Migrate the whole monorepo to **TypeScript**.
2. Move the `web` package onto **Hono + `hono/jsx`**, replacing template-literal
   HTML with real JSX views.

Nothing here is committed as code yet. Read the **Open questions** at the bottom
first — a couple of choices are worth confirming before Phase 3 starts.

---

## 1. Goals & non-goals

**Goals**

- Static type safety across `core`, `cli`, `mcp`, `web`.
- Kill "HTML inside the code": route handlers return JSX components, not
  `` `<div>${escapeHtml(x)}</div>` `` template strings.
- Keep the published `slop-detect-core` npm package consumable as plain JS + types.
- Stay green and deployable at **every** commit. No big-bang rewrite.

**Non-goals (this plan)**

- No behavior changes to detection or scoring. Types and views only.
- No change to the public HTTP API surface (routes, payloads) — Hono is an
  internal refactor, not a redesign.
- No new runtime dependencies in `core` (it must stay runtime-agnostic).

---

## 2. Sequencing (and why)

```
✅ Phase 1  lint + format gate            (PR #23)
✅ Phase 2  split _shared.js god-file     (PR #23)
✅ Phase 3  core  → TypeScript            (tsc build → dist) — PR #24
✅ Phase 4  cli + mcp → TypeScript        (bin+src → dist) — this PR
   Phase 5  web   → Hono + JSX + TS       (combined, last)
```

**Resolved decisions** (were open questions): PRs are landed **separately per
slice**; the TS migration **starts with `core`**; the test runner is **`tsx`**
(fast `.ts` tests against source — consumer tests still hit the built `dist`).

Decision (sequencing was left to me):

- **TypeScript before Hono.** Types are incremental and verifiable with the
  existing test suite at each step. Hono is the riskiest, least-locally-verifiable
  change (needs a real Cloudflare deploy — see §5.5), so it goes **last**, onto an
  already-typed, already-reorganized base.
- **`core` first** because it's the dependency root and the source-of-truth API
  surface — typing it gives `cli`/`mcp`/`web` their types for free.
- **`web` does JS→TS and Hono/JSX in one combined phase**, not two. A separate
  "web to TS" step would be largely throwaway: the route handlers get rewritten
  as Hono routes + JSX anyway. Doing it once avoids churning the same files twice.

Each phase is one reviewable PR (per the "merge #23, then separate PRs" model, if
that's chosen — see Open questions).

---

## 3. Phase 3 — `core` to TypeScript

`core` is a **published library** (`files: ["src", …]`, repo + keywords set) with
subpath exports (`./patterns`, `./fonts`, `./color`, …). npm consumers need plain
JS + `.d.ts`, so we compile with `tsc` to `dist/` rather than relying on Node's
type-stripping (which `engines.node >= 20` doesn't support anyway).

### 3.1 The serialization constraint (the one real risk)

Several `core` modules export functions that are **serialized with `.toString()`
and executed inside the headless browser** via `page.evaluate()` —
`createColorHelpers`, `createVisibilityHelpers`, and every `detect()` in
`patterns.js`. This already imposes a rule today: *a serialized function must be
self-contained* (it can't close over module-level helpers, because `.toString()`
drops them).

TypeScript does **not** change this **as long as** the compiler doesn't inject
runtime helpers into those function bodies:

- `target: "ES2022"` (no downleveling of `async`/spread/optional-chaining).
- `importHelpers: false`, no `tslib`.
- No TS features that emit code: **no `enum`, no `namespace`, no parameter
  properties, no decorators, no legacy `using`** in serialized modules.
  Type annotations are erased and the emitted function body stays byte-identical
  to the JS we have now.

Guardrail: a unit test that `.toString()`s a representative detector after build
and asserts it contains no `__awaiter`/`__spreadArray`/`tslib` markers. Cheap,
and it fails loudly if someone later flips a compiler option.

### 3.2 Mechanics

- Root: add `typescript` devDep; root `tsconfig.base.json` with the strict, no-emit-helpers settings above.
- `packages/core/tsconfig.json` → `extends` base, `outDir: dist`, `rootDir: src`,
  `declaration: true`, `declarationMap: true`, `sourceMap: true`.
- Rename `src/*.js` → `src/*.ts`, add types module-by-module (start with the
  leaves: `verdict`, `fonts`, `fixes`; finish with `patterns`/`index`).
- `packages/core/package.json`:
  ```jsonc
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".":          { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./patterns": { "types": "./dist/patterns.d.ts", "default": "./dist/patterns.js" },
    "./fonts":    { "types": "./dist/fonts.d.ts", "default": "./dist/fonts.js" }
    // …one per existing subpath
  },
  "files": ["dist", "README.md", "LICENSE", "NOTICE"],
  "scripts": { "build": "tsc", "typecheck": "tsc --noEmit" }
  ```

### 3.3 Tests & CI

- Test files move to `.ts` and run via **`tsx`** (`node --import tsx --test …`) so
  they execute against `src` types without a pre-build. (Alternative: keep tests
  in JS, run against `dist` after `npm run build`. `tsx` keeps the fast inner loop.)
- CI: add a `build` + `typecheck` step. The existing `test` and `smoke-cli` jobs
  gain a `npm run build -w slop-detect-core` prereq (cli/web import the built `dist`).

### 3.4 Rollback

`dist` is generated; reverting the package.json `main`/`exports` to `./src/*.js`
and the `.ts`→`.js` renames restores the old state. No data or API changes.

---

## 4. Phase 4 — `cli` + `mcp` to TypeScript

Both depend only on `core`, so they consume its emitted `.d.ts` directly. Same
`tsc → dist` pattern. The `cli` bin keeps its `#!/usr/bin/env node` shebang on the
compiled `dist/bin/slop.js`; `package.json#bin` points at `dist`.

`cli/src/detector.js` also serializes functions into the page (it's the Puppeteer
reference runner) — same §3.1 guardrails apply. Lower risk than `core` because it's
not a published library; consumers are the bin + tests.

---

## 5. Phase 5 — `web` to Hono + JSX + TypeScript

The largest phase and the one that directly fixes "HTML inside the code."

### 5.1 Today

Cloudflare **Pages Functions** with **file-based routing**: every file under
`functions/` maps to a route (`functions/badge/[domain].js` → `/badge/:domain`),
and `functions/api/_middleware.js` wraps `/api/*` with rate-limit + CORS +
Turnstile. HTML is built with template literals + `escapeHtml`.

### 5.2 Target

A single **Hono app** mounted as a Pages catch-all, with typed bindings and JSX
views:

```
functions/
  [[path]].ts            // export const onRequest = handle(app)
src/
  app.ts                 // new Hono<{ Bindings: Env }>() + route mounts
  routes/                // badge.ts, score.ts, report.ts, api/scan.ts, …
  views/                 // Layout.tsx, ScoreCard.tsx, BadgeSvg.tsx, …
  middleware/            // rateLimit.ts, cors.ts, turnstile.ts (ports of _middleware)
  lib/                   // the Phase-2 modules: _data, _ssrf, _util (now .ts)
```

- `wrangler` compiles TS/JSX for Pages Functions natively (esbuild) — **no separate
  build step** for `web`, unlike `core`.
- `tsconfig`: `"jsx": "react-jsx"`, `"jsxImportSource": "hono/jsx"`.
- Bindings typed once: `type Env = { RESULTS: KVNamespace; RATE_LIMIT: KVNamespace;
  BROWSER: Fetcher; TURNSTILE_SECRET: string; … }` — replaces the untyped
  `env.RESULTS` access everywhere.
- Static `public/` assets are unchanged (Pages serves them; Hono handles the rest).
- `_middleware.js` → `app.use('/api/*', rateLimit, cors, turnstile)`.

### 5.3 Before / after (the `badge/:domain` route)

**Before** — `functions/badge/[domain].js`:

```js
import { getLatestForDomain, badgeSvg, BADGE_TTL } from '../_shared.js';

export async function onRequestGet({ params, env }) {
  let domain = String(params.domain || '').replace(/\.svg$/i, '')
    .replace(/^www\./, '').toLowerCase().slice(0, 253);
  const slim = await getLatestForDomain(env.RESULTS, domain).catch(() => null);
  return new Response(badgeSvg(domain, slim), {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': `public, max-age=${BADGE_TTL}, s-maxage=${BADGE_TTL}` },
  });
}
```

**After** — `src/routes/badge.ts` (typed `env`, typed params; behavior identical):

```ts
import { Hono } from 'hono';
import { getLatestForDomain, BADGE_TTL } from '../lib/data';
import { BadgeSvg } from '../views/BadgeSvg';
import type { Env } from '../env';

export const badge = new Hono<{ Bindings: Env }>();

badge.get('/badge/:domain', async (c) => {
  const domain = c.req.param('domain').replace(/\.svg$/i, '')
    .replace(/^www\./, '').toLowerCase().slice(0, 253);
  const slim = await getLatestForDomain(c.env.RESULTS, domain).catch(() => null);
  return c.body(BadgeSvg({ domain, slim }), 200, {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    'Cache-Control': `public, max-age=${BADGE_TTL}, s-maxage=${BADGE_TTL}`,
  });
});
```

The page routes benefit most: `score/[domain].js`, `report/[domain].js`,
`directory.js`, `dashboard.js`, `blog/[slug].js` stop concatenating HTML and
return `<Layout><ScoreCard …/></Layout>`. JSX auto-escapes children, so most
manual `escapeHtml` calls disappear (and the ones that remain — raw SVG/XML — keep
using `_render`'s helpers).

### 5.4 Migration order within Phase 5 (incremental, not big-bang)

1. Scaffold Hono via `npm create hono@latest` (cloudflare-pages template) into a
   side path; wire `[[path]].ts` to handle **only** routes already ported, and let
   unported requests fall through to the existing file-based functions
   (`app.notFound` → `c.env.ASSETS`/next). This keeps the site fully working while
   routes move one at a time.
2. Port middleware first (`/api/*`), then leaf GET pages (`badge`, `score`,
   `report`), then `/api/scan` (the Browser-binding one) last.
3. Delete each old `functions/<route>.js` as its Hono route lands.
4. When the last file route is ported, the catch-all owns everything.

### 5.5 Verification gap (important)

This sandbox **cannot fully verify** Phase 5: `wrangler pages dev` doesn't provide
the **Browser Rendering** binding locally, and there's no Cloudflare deploy here.
Proposed verification plan for that PR:

- Unit-test routes by invoking `app.fetch(new Request(...))` with **mocked
  bindings** (KV/Browser fakes) — this runs in CI, no Cloudflare needed, and
  covers routing + view rendering + middleware.
- Snapshot-test the JSX output of `ScoreCard`/`BadgeSvg`/share-card against the
  current template-literal output to prove byte-parity where it matters (the OG
  card is rasterized — visual diffs matter).
- A **Cloudflare preview deploy** (Pages preview URL) for the human smoke pass of
  `/api/scan` + the Browser binding, before merge. This needs your CF env.

### 5.6 Rollback

Because Phase 5 is route-by-route with the old functions still present until each
is ported, rollback at any point is "stop porting / revert the last route." The
big cutover (deleting the final file routes) is the only one-way door, gated on the
preview-deploy smoke pass in §5.5.

---

## 6. Risk register

| Risk | Phase | Likelihood | Mitigation |
|---|---|---|---|
| tsc injects helpers into serialized detector fns | 3 | low | `target ES2022`, no helper-emitting TS; `.toString()` guard test (§3.1) |
| Build step breaks cli/web import of core | 3 | med | CI builds core before test/deploy; `dist` in `exports` |
| Published-package consumers break (`exports`/types) | 3 | low | Keep every existing subpath; add `types` conditions; `npm pack` diff in CI |
| Hono routing parity (trailing slash, `.svg` suffixes, redirects) | 5 | med | Port route-by-route with fallback; `app.fetch` tests per route |
| Browser binding unverifiable locally | 5 | high | Mocked-binding tests in CI + CF preview deploy before cutover (§5.5) |
| OG card pixel drift from JSX | 5 | med | Snapshot card HTML against current output |

---

## 7. Open questions (please confirm before Phase 3)

1. **PR structure** — merge #23 first and run Phases 3–5 as separate stacked PRs
   (cleanest review; needs OK to push new branches), or keep stacking on the
   current branch? (Raised in thread; defaulting to *separate PRs* unless told
   otherwise.)
2. **Test runner for TS** — add `tsx` for fast `.ts` tests against source
   (recommended), or compile-then-test against `dist`?
3. **Cloudflare preview deploy** for Phase 5 verification — can you provide a
   Pages preview environment / confirm the `CLOUDFLARE_*` secrets are usable for a
   non-production preview? Phase 5 can't be fully signed off without it.
4. **`mcp` scope** — migrate it in Phase 4 as written, or is it low-priority enough
   to defer?
