# How Slop Detector compares

> Where Slop Detector sits among design-quality and AI-detection tools — and why its
> methodology is different. HTML version: https://slop-detect.com/compare

## The short version

Most "is this AI?" tools are probabilistic ML classifiers: they output a confidence
that something was machine-generated, and that confidence shifts as the model is
retrained. Slop Detector is the opposite — a deterministic fingerprint: a fixed
catalogue of CSS and copy tells, each with a fixed weight, evaluated against a page's
live computed styles in real headless Chromium. Same page in, same score out. No
model, no randomness — auditable, reproducible, safe to gate CI on.

## Methodology comparison

| Dimension | Slop Detector | Typical ML AI-detectors | Generic Lighthouse / a11y |
|---|---|---|---|
| Output | Deterministic 0–100 weighted fingerprint | Probabilistic % confidence | Perf / a11y / SEO scores |
| Reproducible | Yes — same page, same score | No — drifts with retraining | Mostly |
| What it measures | AI-design + copy slop tells | Generated-vs-human likelihood | Technical quality, not aesthetics |
| Engine | Real Chromium, computed styles | Text / pixel models | Real Chromium |
| Auditable rules | Yes — open catalogue at /api/patterns | Opaque weights | Documented audits |
| AEO axis | Yes — built in | No | Partial (SEO only) |
| License | Open source (MIT) | Usually closed | Mixed |
| Agent interfaces | API + CLI + MCP | Rare | Rare |

## Why deterministic matters

- **CI gating** — fail a build at `--fail-on heavy` and trust the threshold won't move.
- **Auditability** — every point traces to a named pattern with a documented weight.
- **Comparability** — two designs measured on the same fixed yardstick.
- **No false-confidence** — a high score means "looks machine-made," not "an AI wrote this."

## The research behind it

Pattern weights derive from Adrian Krebs's April 2026 study of 1,400 Show HN
submissions, plus Meng To's gradient-avatar tell. The catalogue is versioned
(`DEFINITIONS_VERSION`) and served live at https://slop-detect.com/api/patterns

## When to use which

- **Slop Detector** — reproducible, explainable read on how templated/AI-generated a landing page looks; CI gating.
- **ML AI-detector** — probabilistic "was this generated?" verdict on arbitrary text/images.
- **Lighthouse/axe** — performance, accessibility, technical SEO (orthogonal to slop).

## Try it

- Web: https://slop-detect.com
- CLI: `npx slop-detect <url>`
- MCP: `slop-detect-mcp`
- API: https://slop-detect.com/openapi.json
- Source: https://github.com/ravidsrk/slop-detect
