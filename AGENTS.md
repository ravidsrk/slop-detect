# AGENTS.md — instructions for AI coding agents

This file tells AI coding agents (Claude Code, Cursor, Windsurf, etc.) how to work
in this repo and how to use Slop Detector as a tool. Human docs: [README.md](README.md).

## What this project is

Slop Detector scores any landing page against the **AI-design-slop fingerprint** — a
deterministic, weighted 0–100 measure of the CSS and copy tells that AI page builders
(Cursor, v0, Lovable, Bolt) converge on, run on real headless Chromium. It also checks
**`DESIGN.md` system compliance** and **AEO technical crawler eligibility** (`robots.txt`,
indexability, server HTML text, Markdown twins, `/llms.txt`). Live site: https://slop-detect.com

## Using Slop Detector as a tool (not just editing it)

If a user asks "does this page match default-template patterns?", "audit this landing page", or
"can AI read/cite my site?", call the tool — don't eyeball the page:

```bash
npx slop-detect <url>             # design slop score
npx slop-detect <url> --aeo        # AEO axis
npx slop-detect <url> --fail-on heavy   # CI gate (non-zero exit on Heavy)
```

Or the HTTP API (no auth required; `"share": false` keeps the result off the public permalink and per-domain history):

```bash
curl -X POST https://slop-detect.com/api/scan \
  -H 'content-type: application/json' -d '{"url":"https://example.com","share":false}'
```

Or the MCP server: `npx -y slop-detect-mcp` (hosted API) or, for `localhost` and `file://`,
`npx -y -p slop-detect -p slop-detect-mcp slop-detect-mcp --local` (the `slop-detect`
Playwright runner is an optional peer, so name it). Tools: `scan_page`, `check_aeo`,
`check_design_system`, `fix_prompt`, `lint_design_md`, `diff_design_md`,
`extract_design_system`. The contract lives in `packages/core/src/mcp-tools.ts` and is shared
by the npm server and `https://slop-detect.com/mcp`.

- Read the pattern count from `GET /api/patterns` — **never hardcode it.**
- OpenAPI spec: https://slop-detect.com/openapi.json
- Machine-readable summary: `GET https://slop-detect.com/?mode=agent`

## Repo layout

Bun + Turborepo monorepo. Publishable libraries under `packages/`, deployable apps
under `apps/`, framework demos under `examples/`, versioned scoring spec under `spec/`.

```
packages/
├── core/    slop-detect-core       ← scoring engine (workspace @slop-detect/core)
├── cli/     slop-detect            ← Playwright runner, the `slop-detect` bin
├── mcp/     slop-detect-mcp        ← Model Context Protocol server
└── action/                         ← GitHub Action wrapper (not on npm)

apps/
├── web/     slop-detect-web        ← Cloudflare Pages site + Functions (the API)

examples/
├── astro-blog/                     ← Astro 5 reference integration
└── nextjs-app-router/              ← Next 15 reference integration

spec/                               ← versioned pattern + AEO + conformance spec
```

## Build / lint / test

Bun + Turborepo handles all task orchestration; turbo's `dependsOn: ["^build"]`
takes care of inter-package build order.

```bash
bun install               # workspace + lockfile (CI uses --frozen-lockfile)
bun run verify            # format:check + lint + typecheck + build + test: what CI checks (~40 s)
bun run typecheck         # turbo run typecheck — every package
bun run lint              # turbo run lint — eslint, every package
bun run build             # turbo run build — tsup across the publishable libs
bun run test              # turbo run test — vitest; skips the real-Chromium tests
bun run test:golden       # the real-Chromium detector tests (RUN_GOLDEN=1), ~40 s
bun run smoke:mcp-npx     # packs the packages and runs the plugin's npx MCP + hook commands
bun run format            # prettier --write
bun run format:check      # prettier --check
```

To filter to a single package:

```bash
bun run --filter @slop-detect/core build
bun run --filter slop-detect test
```

Page-eval note: both runners (`apps/web/functions/api/scan.ts` and
`packages/cli/src/detector.ts`) get their browser script from `buildPageScript` in
`packages/core/src/page-script.ts`, which serializes the pattern extractors into one
`page.evaluate(...)` string. Prettier and tsc can't see inside that string, and
`bun run test` skips the real-Chromium tests — after touching page-eval code, run
`bun run test:golden` (CI runs it in the "Smoke test CLI" job).

## Conventions

- 45 design patterns + 26 copy patterns + 16 AEO checks. `DEFINITIONS_VERSION` is
  exported from `@slop-detect/core` (currently `2026.11`). Count is served
  dynamically from `GET /api/patterns` (derived from `PATTERNS.length`). Never
  hardcode it in UI/docs.
- Tiers (design): Clean 0–9, Mild 10–27, Heavy 28+.
- AEO polarity is inverted vs slop: higher AEO is better, lower slop is better.
- Publish order when core changes: `slop-detect-core` (npm name of the
  `@slop-detect/core` workspace — the scoped name is not on npm) → `slop-detect`
  (CLI) → `slop-detect-mcp`, on a `v*.*.*` tag. `apps/web` deploys to Cloudflare
  Pages after every green `ci` run on `main` (and on `v*` tags), so merging to main
  ships production.
- The whole brand is deliberately anti-slop: light editorial-instrument paper (`#F4F5F2`), carbon ink (`#181815`), calibration green (`#1FA85E`), `Newsreader` + `Libre Franklin` + `JetBrains Mono` (with a dark `#16170F` continuity band), flat 1px borders, no gradients/glow/purple CTAs.

## Roadmap and issues

- The roadmap is [ROADMAP.md](ROADMAP.md) (v4). Every item is an issue labelled
  `roadmap:v4` with one `evidence:*` grade (`measured` means lift measured on our
  own calibration corpus — nothing else qualifies), one `priority:*` and a release
  milestone; the tracking issue is #336. `research:backed` is retired.
- New rules, and changes that broaden what an existing rule fires on, ship at
  weight 0 (`rule:weight-0`); weight only goes up through the K-04 gate on the
  held-out calibration set. Correctness fixes (parser fixes, colour-syntax
  parity, false-positive exclusions) and weight reductions or demotions may ship at a definitions bump
  with re-scored deltas published. Never write UI or
  API copy that calls a page "AI-generated" (K-06).
- Cite only sources you opened; quote numbers exactly. See
  `docs/research/roadmap-v4/REPORT.md` for why (v3 shipped fabricated citations).

## When you change patterns

- Update the catalogue in `packages/core/src/`. The web UI, CLI, and `/api/patterns`
  all read the count from the engine — don't duplicate it.
- Update `spec/patterns.md` (and `spec/config.json`) to match — the spec is the
  contract downstream tools read.
- Run `bun run test` and `bun run test:golden` (format/typecheck won't catch page-eval issues).
- If you bump `core`, the version stays in sync across cli/mcp via changesets +
  `workspace:*` dep links; no manual version edits needed across packages.

## Self-update

If you discover a recurring gotcha or a better workflow while working here, propose a
concise addition to this file so the next agent doesn't relearn it.

## Learned (2026-09 completion run)

- E2E verification: `bun run s4 -- --target <url>` runs the stranger-test suite
  (`scripts/s4/`, see `docs/operations/REHEARSAL.md`). No-origin callers get 3 scan-bucket
  hits/60s and every hit resets the counter TTL — `lib.paceScan()` already
  mirrors this; don't re-tune it from the "6/min" shorthand.
- Against localhost, set `S4_SEED_URL` to a public page with real content: the
  default seed (the target homepage) is loopback and the SSRF guard rejects it by
  design. Near-empty pages such as `example.com` score nothing useful and can trip
  the empty-page guard (422).
- Local `wrangler pages dev` scans for real (local Chromium, first scan
  downloads it). Page-eval polyfills must derive bundler-helper names from
  serialized source (`esbuildNamePolyfills`) — dev bundles dedup `__name` to
  `__name2` and hardcoded names 500 local scans while prod works by luck.
- `deploy.yml` needs `--branch main` (bare `pages deploy` ships previews, not
  production) with the ref guards intact. If health-ping is red while CI is
  green, suspect stale prod first — probe `/api/health` + a known scan directly.
- Native Rust engine (`crates/`, see `docs/ENGINE.md`): run `bun run oracle:generate`
  and `bun run probe:build` whenever `@slop-detect/core` scoring/extractors change,
  then verify with `bun run rust:test`, `bun run rust:build`, and `bun run rust:wasm`.
