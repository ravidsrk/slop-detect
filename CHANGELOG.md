# Changelog

## 0.5.1 — Security hardening + CI gating (post-review)

From a full end-to-end review. Resyncs npm with the source tree (published 0.5.0
core shipped 26 patterns; the tree had 27) and ships security + DX fixes.

### Security
- **SSRF guard on `/api/scan`** (`validateScanUrl`): blocks cloud-metadata
  (169.254.169.254), loopback, RFC-1918, CGNAT, link-local/unique-local IPv6,
  IPv4-mapped loopback, and internal hostnames (`localhost`, `*.internal`, `*.local`);
  rejects non-http(s) schemes. The scan endpoint loaded arbitrary user URLs in a
  headless browser and returned page content — this closes the SSRF primitive.
- **fix-prompt `{url}` bypass closed**: mode-2 fix-prompt (which re-runs a scan
  in-process) is now gated by the middleware *as a scan* — same rate limit, shared
  bucket, and Turnstile — instead of fix-prompt's looser limits.

### Added
- **`GET /api/patterns`** — serves the live pattern catalogue from core. The web UI
  and CLI now render the rule count + list dynamically (no more hardcoded "16 rules").
- **CLI `--fail-on <tier>`** (`mild`|`heavy`) — exits non-zero to gate CI; blocked/errored
  scans also fail. Replaces the manual `jq`-based gate in the docs.

### Fixed
- CLI now normalizes bare hostnames (`slop-detect example.com`) and rejects non-http(s)
  schemes with exit 2.
- MCP server reports its real version from package.json (was hardcoded `0.2.0`).
- MCP API client has a 45s fetch timeout (`SLOP_DETECT_TIMEOUT_MS`); timeouts surface
  as a clean `ApiError`.
- Tightened the Chromium-missing detection regex (was matching any launch failure).
- Corrected the CLI User-Agent repo URL and the CLI README tier thresholds (Clean <10,
  Mild ≥10, Heavy ≥28).

### Tests
- +3 SSRF suites, +5 CLI subprocess tests, +5 MCP api tests (28 total, all green).

## 0.5.0 — Phase 5: Impeccable adoption (Tranche A)

`definitions@2026.08` — the design fingerprint grows from 19 → 27 patterns.

### Added
- **8 new design patterns** ported from [Impeccable](https://github.com/pbakaus/impeccable)
  (Apache-2.0), targeting high-prevalence AI tells we were missing:
  - `cream_default_bg` (w7) — warm off-white / beige default page surface (~74% of
    generated pages per Impeccable's launch data)
  - `low_contrast_text` (w7) — washed-out grey body text below WCAG AA on a light
    background. Deliberately narrowed to the *pervasive grey-on-light* signature
    (not generic WCAG failure) so premium sites with intentional brand color stay clean
  - `crushed_tracking` (w5) — display headings tracked tighter than -0.05em
  - `gray_on_color` (w4) — neutral mid-grey text on a chromatic background
  - `oversized_hero_h1` (w4) — long headline (≥40 chars) blown up to ≥72px
  - `nested_cards` (w4) — card-like element inside a card-like ancestor (excludes
    3D-tilted product-screenshot mockups)
  - `wide_body_tracking` (w3) — body copy letter-spacing above 0.05em
  - `flat_type_hierarchy` (w3) — ≥3 font sizes with a max/min ratio below 2×
- **WCAG color primitives** in `createColorHelpers()`: `relativeLuminance`,
  `contrastRatio`, `channelSpread`, `isNeutral`, `effectiveBackground` (ancestor
  background-color walker). Unit-tested against known WCAG reference pairs.
- Fix recipes + evidence formatters for all 8 new patterns.
- Second unit-test suite (`color.test.js`) — 7 tests on the contrast math.

### Calibration
- Validated against premium reference sites (Stripe, Linear, Notion, Vercel) to
  confirm the new rules do **not** false-fire, and against a synthetic slop
  fixture to confirm they **do** fire. Contrast/gray rules required narrowing to
  the true AI signature after initial false positives on branded CTAs and
  white-on-dark text.

### Attribution
- Patterns #20–27 adapted from Impeccable by Paul Bakaus (Apache-2.0). See `NOTICE`.

### Backward compatibility
- Existing pattern IDs, weights, and the design/copy axis split are unchanged.
  New patterns are additive; the tier bands (Clean/Mild/Heavy) are unchanged.

## 0.4.0 — Phase 4: multi-axis slop (design + copy)

### Added
- **Copy-slop axis (#08)** — 9 deterministic text patterns scored on the page's
  own prose at near-zero marginal cost (one in-DOM text extraction, no extra page
  load): `buzzword_density`, `em_dash_overload`, `antithesis_construction`,
  `filler_openers`, `formulaic_closers`, `rule_of_three`, `whether_youre`,
  `unicode_artifacts`, `emoji_bullet_headers`. Each with its own fix recipe.
- **Multi-axis scoring** — `scoreCopy()`, `combineAxes()`, `extractTextContext()`,
  `AXES` exported from core. Per-axis summaries (`axes.{design,copy}`) plus a
  `unifiedScore` / `unifiedTier` (max axis score + penalty when >1 axis dirty).
- **CLI**: `--copy` and `--axes design,copy|all` flags, with a per-axis pretty
  breakdown. **API**: `{ axes: ['design','copy'] }` on `/api/scan` and
  `/api/fix-prompt`. Permalinks persist a compact copy-axis summary.
- **`buildFixPrompt`** now spans both axes when the copy axis was scored.
- First **unit-test suite** (`node --test`) covering the copy axis + aggregator;
  `npm test` wired at the root.

### Backward compatibility
- Top-level `score` / `grade` / `tier` / `patterns` remain **design-only** by
  default. The copy axis is strictly opt-in; existing integrations are unchanged.

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
