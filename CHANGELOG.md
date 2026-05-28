# Changelog

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
