# AGENTS.md — instructions for AI coding agents

This file tells AI coding agents (Claude Code, Cursor, Windsurf, etc.) how to work
in this repo and how to use Slop Detector as a tool. Human docs: [README.md](README.md).

## What this project is

Slop Detector scores any landing page against the **AI-design-slop fingerprint** — a
deterministic, weighted 0–100 measure of the CSS and copy tells that AI page builders
(Cursor, v0, Lovable, Bolt) converge on, run on real headless Chromium. It also has an
**AEO axis**: can AI engines fetch, read and cite a page. Live site: https://slop-detect.com

## Using Slop Detector as a tool (not just editing it)

If a user asks "does this page look AI-generated?", "audit this landing page", or
"can AI read/cite my site?", call the tool — don't eyeball the page:

```bash
npx slop-detect <url>             # design slop score
npx slop-detect <url> --aeo        # AEO axis
npx slop-detect <url> --fail-on heavy   # CI gate (non-zero exit on Heavy)
```

Or the HTTP API (no auth required):

```bash
curl -X POST https://slop-detect.com/api/scan \
  -H 'content-type: application/json' -d '{"url":"https://example.com"}'
```

Or the MCP server (`npx -y slop-detect-mcp`): tools `scan_page`, `check_aeo`, `check_design_system`, `fix_prompt`.

- Read the pattern count from `GET /api/patterns` — **never hardcode it.**
- OpenAPI spec: https://slop-detect.com/openapi.json
- Machine-readable summary: `GET https://slop-detect.com/?mode=agent`

## Repo layout

Bun + Turborepo monorepo. Publishable libraries under `packages/`, deployable apps
under `apps/`, framework demos under `examples/`, versioned scoring spec under `spec/`.

```
packages/
├── core/    @slop-detect/core      ← scoring engine (patterns, AEO checks, copy axis)
├── cli/     slop-detect            ← Playwright runner, the `slop-detect` bin
├── mcp/     slop-detect-mcp        ← Model Context Protocol server
└── action/                         ← GitHub Action wrapper (not on npm)

apps/
├── web/     slop-detect-web        ← Cloudflare Pages site + Functions (the API)
└── docs/    slop-detect-docs       ← Next.js 15 docs site

examples/
├── astro-blog/                     ← Astro 5 reference integration
└── nextjs-app-router/              ← Next 15 reference integration

spec/                               ← versioned pattern + AEO + conformance spec
```

## Build / lint / test

Bun + Turborepo handles all task orchestration; turbo's `dependsOn: ["^build"]`
takes care of inter-package build order.

```bash
bun install               # workspace + lockfile
bun run typecheck         # turbo run typecheck — every package
bun run build             # turbo run build — tsup across the publishable libs
bun run test              # turbo run test — vitest across every package
bun run format            # prettier --write
bun run format:check      # prettier --check
```

To filter to a single package:

```bash
bun run --filter @slop-detect/core build
bun run --filter slop-detect test
```

Page-eval template literal note: the `ctx` object is built identically in
`apps/web/functions/api/scan.ts` and `packages/cli/src/detector.ts`. Prettier/tsc
don't parse code inside the `page.evaluate(...)` string — always run `bun run test`,
which exercises both runners end-to-end.

## Conventions

- 27 design patterns + 9 copy patterns + 8 AEO checks. `DEFINITIONS_VERSION` is
  exported from `@slop-detect/core` (currently `2026.09`). Count is served
  dynamically from `GET /api/patterns` (derived from `PATTERNS.length`). Never
  hardcode it in UI/docs.
- Tiers (design): Clean 0–9, Mild 10–27, Heavy 28+.
- AEO polarity is inverted vs slop: higher AEO is better, lower slop is better.
- Publish order when core changes: `@slop-detect/core` → `slop-detect` (CLI) →
  `slop-detect-mcp`. `apps/web` deploys to Cloudflare Pages on tag.
- The whole brand is deliberately anti-slop: dark, monospace, no gradients/glow/purple.

## When you change patterns

- Update the catalogue in `packages/core/src/`. The web UI, CLI, and `/api/patterns`
  all read the count from the engine — don't duplicate it.
- Update `spec/patterns.md` (and `spec/config.json`) to match — the spec is the
  contract downstream tools read.
- Run `bun run test` (format/typecheck won't catch page-eval issues).
- If you bump `core`, the version stays in sync across cli/mcp via changesets +
  `workspace:*` dep links; no manual version edits needed across packages.

## Self-update

If you discover a recurring gotcha or a better workflow while working here, propose a
concise addition to this file so the next agent doesn't relearn it.
