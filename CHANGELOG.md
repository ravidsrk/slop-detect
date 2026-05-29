# Changelog

## 0.3.0 — Phase 3: keep the ruleset current

### Added
- **Declarative rule format** (`compileRule` / `compileRules` / `validateRule`)
  — describe a pattern as `{ id, label, weight, detect: { scope, when, trigger } }`
  and it compiles to a self-contained, injectable detector. Lowers the cost of
  contributing the 20th/21st pattern. Imperative patterns still supported. (`#05`)
- **Named scoring presets** — `full` (default), `strict` (weight ≥ 5),
  `marketing` (brand surface), `minimal` (3 dead-giveaways). Selectable via the
  CLI `--preset` flag and the API `{ preset }` field; `applyPreset` exported.
- **Public API key tiers** — `Authorization: Bearer` / `X-API-Key` keys with
  `free` / `pro` / `unlimited` tiers (key-bucketed limits, Turnstile bypass).
  Fully documented in [packages/web/API.md](packages/web/API.md).

### Definitions `2026.07`
- **+3 emerging patterns** (max raw weight 73 → 85): `bento_grid` (w4),
  `aurora_mesh_gradient` (w5), `ai_sparkle_badges` (w3). Each with a fix recipe
  and evidence formatter. Verified for no false positives on Hacker News (Clean).

## 0.2.x — Phase 2: embed into the workflow (CI + agents)

### Added
- **`slop-detect-mcp`** — Model Context Protocol server (stdio) exposing
  `scan_page` and `fix_prompt` tools so Cursor / Claude Code / Windsurf agents
  can self-audit a page before shipping. Thin wrapper over the public API,
  `SLOP_DETECT_API` configurable. (`#07`)
- **`slop-detect-action`** — composite GitHub Action that scans a deploy-preview
  URL, posts a **sticky PR comment** (grade · score · triggered patterns · OG
  card), sets a pass/fail status via `fail-under` (numeric or letter grade), and
  exposes `score`/`grade`/`tier`/`verdict`/`result-url` outputs. (`#04`)
- Example consumer workflow at `.github/workflows/slop-check.example.yml`.

## 0.2.0 — Phase 1: distribution primitives

Make the score travel. Every scan now produces something shareable and embeddable.
See [ROADMAP.md](ROADMAP.md) and [packages/web/UX.md](packages/web/UX.md).

### Added
- **Letter grades** (A+→F) layered on the 0–100 score, on every surface (core,
  CLI, web, API, badge). `gradeForScore()` + `GRADE_BANDS` exported from core.
- **Verdict one-liners** — deterministic, page-not-person, tier-keyed. `verdictFor()`.
- **Versioned slop definitions** — every result carries `definitionsVersion`
  (`2026.06`) so historical scores stay comparable. `DEFINITIONS_VERSION` exported.
- **Shareable result permalinks** — `POST /api/scan` returns `id` + `resultUrl`;
  `GET /r/<id>` server-renders the result with OG/Twitter meta.
- **OG share cards** — `GET /og/<id>.png` renders a 1200×630 card (grade · score ·
  tier · verdict · tells) via Browser Rendering, cached in KV.
- **Embeddable badge** — `GET /badge/<domain>.svg` returns a live, tier-colored
  shields-style badge for a domain's latest scan. Copy-paste Markdown/HTML/URL
  snippets in the UI.
- **Share + embed UX** — share panel (copy link, X, LinkedIn) and badge embed
  panel on the result view; `/?url=` deep-link prefill for the re-scan loop.

### Infra
- New `RESULTS` KV namespace (results, OG cache, domain→latest, badge cache).

### Definitions `2026.06`
- Baseline: the original 16 patterns (Krebs 15 + Meng To 1). No pattern changes;
  establishes the versioning scheme going forward.

## 0.1.2
- fix-prompt rewrite: concrete per-page evidence + anti-regression list.
- Tightened empty-page detection for sparse-DOM sites.

## 0.1.1
- Detector tuning, anti-bot guard, rate limiting, branding.

## 0.1.0
- Initial monorepo — core + cli + web. 16-pattern engine.
