# Slop Detector Example — Astro 5

Reference integration demonstrating how to wire `slop-detect` (Design, Copy, Craft Floor, `DESIGN.md` System compliance, and AEO readiness) into an Astro 5 site.

---

## 1. Run Locally

```bash
bun install
bun run dev
# Dev server starts at http://localhost:4321
```

## 2. Audit Against All 5 Axes

With the Astro server running on `http://localhost:4321`:

```bash
# Score Design + Copy + Craft Floor + public/DESIGN.md + AEO
npx slop-detect http://localhost:4321 \
  --copy \
  --craft \
  --aeo \
  --design-md ./public/DESIGN.md

# Static lint public/DESIGN.md (no browser required)
npx slop-detect --lint-design-md ./public/DESIGN.md

# Audit the static dist/ directory for copy-axis tells
bun run build
npx slop-detect --copy-dir ./dist
```

## 3. Connect Your AI Coding Agent

Bootstrap Claude Code and Cursor with local MCP + PostToolUse hooks:

```bash
npx slop-detect init
```

See [**`../../docs/README.md`**](../../docs/README.md) for the complete developer documentation hub.
