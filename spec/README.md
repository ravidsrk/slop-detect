# Slop Detector specification

Machine-readable reference for the slop-detect scoring model. Downstream tools (linters, CI gates, alternate scanners) can implement compatible checks or interpret scan output without reading `packages/core/src/`.

## Versioning

`spec_version` and `definitions_version` track `DEFINITIONS_VERSION` in `packages/core/src/index.ts`. Bump the spec when patterns are added, removed, or re-weighted so historical scores remain comparable.

Current version: **2026.09**

## Axes

| Axis | Module | Score polarity | Tier bands |
|------|--------|----------------|------------|
| Design | `patterns.ts` | Lower is better | Clean 0–9, Mild 10–27, Heavy 28+ |
| Copy | `copyPatterns.ts` | Lower is better | Clean 0–7, Mild 8–19, Heavy 20+ |
| AEO | `aeo.ts` | Higher is better | AI-Ready ≥80%, Partial ≥50%, Invisible &lt;50% |

Design and copy slop scores sum triggered pattern weights (clamped 0–100). AEO scores sum passed check weights (max 100). Unified slop score (when copy is enabled) uses `combineAxes()` — see [copy-axis.md](./copy-axis.md).

## File index

| File | Contents |
|------|----------|
| [patterns.md](./patterns.md) | 27 design-slop patterns (CSS/DOM tells) |
| [copy-axis.md](./copy-axis.md) | 9 copy-slop patterns and multi-axis aggregation |
| [aeo.md](./aeo.md) | 8 AEO ladder checks, AI-bot registry, graded tiers |
| [conformance.md](./conformance.md) | Producer expectations, AEO pass thresholds, CLI `--fail-on` |
| [config.json](./config.json) | Machine-readable manifest |

## Score computation (design axis)

Each design pattern exposes `extract(ctx)` inside headless Chromium. A pattern returns `{ triggered, evidence, weight }`. The orchestrator sums weights of triggered patterns:

```
design_score = min(100, Σ weight for triggered patterns)
design_tier  = Heavy if score ≥ 28, Mild if score ≥ 10, else Clean
```

Pattern catalogue: `PATTERNS` in `packages/core/src/patterns.ts`.

## Consumption

```bash
# Human-readable scan
npx slop-detect https://example.com

# JSON for tooling
npx slop-detect https://example.com --json

# CI gate (design tier)
npx slop-detect https://example.com --fail-on heavy
```

HTTP API: `POST https://slop-detect.com/api/scan` with `{"url":"..."}`. Pattern count is served dynamically from `GET /api/patterns` (derived from `PATTERNS.length`).