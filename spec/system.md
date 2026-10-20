# System Axis Specification (`DESIGN.md` & DTCG `tokens.json` Compliance)

Version: **2026.11** · `DESIGN.md` Spec Version: **alpha** · Polarity: **Higher is better (0–100)**

The System axis evaluates whether a rendered page honors its own declared design system — either a Google Labs / Stitch-style `DESIGN.md` file (YAML frontmatter between `---` fences or a ```` ```yaml ... ``` ```` fenced block) or a W3C DTCG 2025.10 `tokens.json` file (`parseDtcgTokens()`).

Unlike the Design and Copy axes (which measure generic AI-builder convergence across all sites), the System axis measures **per-site token drift** and provides **token-scoped waivers** (`applyDesignSystemWaivers()`) when a pattern matches tokens explicitly declared in the site's own design system.

## Scoring & Tier Bands

The System axis evaluates weighted token checks (active checks total 100 points) plus per-class count-ratio and area-weighted coverage across 9 token classes (`textColor`, `backgroundColor`, `borderColor`, `fontSize`, `lineHeight`, `letterSpacing`, `spacing`, `borderRadius`, `boxShadow`). Checks that cannot be evaluated (because a section was omitted in `DESIGN.md` or no matching DOM elements were observed) are skipped and excluded from the denominator. `score = round(100 × passedWeight / evaluatedWeight)`.

- **Aligned**: `80–100` (ratio `≥ 0.80`, or `countRatio ≥ 0.85` and `areaRatio ≥ 0.80`)
- **Drifting**: `50–79` (ratio `0.50–0.79`, or `countRatio ≥ 0.60` and `areaRatio ≥ 0.55`)
- **Off-system**: `< 50` (ratio `< 0.50`)
- **No data**: every check skipped (score reported as `100`, tier `No data`)
- **No system**: no parseable `DESIGN.md` or `tokens.json` tokens (score `null`)

## Perceptual Color Comparison in Oklab (#203)

All declared and observed colors are parsed through the shared CSS Color 4 parser (`parseColor()`, supporting hex 3/4/6/8, `rgb()`/`rgba()`, `hsl()`/`hsla()`, `hwb()`, `oklab()`, `oklch()`, `lab()`, `lch()`, `color(srgb|srgb-linear|display-p3|a98-rgb|rec2020|prophoto-rgb|xyz-d65|xyz-d50)`, `color-mix()`, and named CSS colors) and compared using perceptual Euclidean distance in Oklab (`deltaEOklab`):

- **Match**: `ΔE_OK ≤ 0.02` and `|Δalpha| ≤ 0.02`
- **Near-miss**: `0.02 < ΔE_OK ≤ 0.05` and `|Δalpha| ≤ 0.05` (tracked in `nearMisses[]`)
- **Off-palette drift**: `ΔE_OK > 0.05` or `|Δalpha| > 0.05`

## System Checks Catalogue

| ID | Label | Weight | Pass rule (as implemented) |
|----|-------|--------|----------------------------|
| `fonts.declared` | Fonts in use are declared in the system | 25 | Every primary family accounting for `≥ 10%` of tallied text elements is a declared font. |
| `colors.cta` | CTA / button colors come from the palette (Oklab ΔE ≤ 0.02) | 20 | **Every** observed CTA background matches or near-misses a declared palette color in Oklab (`ΔE_OK ≤ 0.05`; strict matches `≤ 0.02`). Any off-palette CTA (`ΔE_OK > 0.05`) fails the check. |
| `colors.surface` | Page surface color comes from the palette (Oklab ΔE ≤ 0.02) | 10 | The page surface color is within Oklab `ΔE_OK ≤ 0.05` of a declared palette color. |
| `colors.headings` | Heading colors come from the palette (Oklab ΔE ≤ 0.02) | 10 | Fails when **more than half** of observed heading colors are off-palette (`ΔE_OK > 0.05`). |
| `radii.scale` | Corner radii across all 4 corners follow the declared scale (±2px) | 10 | Reads all 4 corners (`px`, `rem`, `em`, unitless) and fails when **more than half** of distinct observed radii are not within `±2px` of a declared radius. |
| `spacing.scale` | Rendered spacing values follow the declared spacing scale (±1px) | 10 | Parses unitless numbers, `px`, `rem`, and `em` spacing tokens and fails when **more than half** of observed padding/gap values are not within `±1px` of a declared token. |
| `typography.scale` | Rendered font sizes follow the declared type scale (±0.5px) | 10 | Compares rendered text `fontSize` against declared `typography.*.fontSize` tokens within `±0.5px` and reports `typeScaleInflation`. |
| `typography.styles` | Composite typography tuples match declared style definitions | 5 | Matches `(fontFamily, fontSize ±0.5px, lineHeight ratio ±0.05, letterSpacing ±0.25px)` tuples, skipping fluid `clamp()` and viewport-unit elements. |
| `contrast.componentPairs` | Component foreground/background pairs meet ≥ 4.5:1 WCAG contrast | 0 | Evaluates component foreground/background contrast (`≥ 4.5:1`), returning `status: "unknown"` on image backgrounds (`review`, weight 0). |

## Static Linter (`lintDesignMd`) and PR Diff (`diffDesignMd`)

`lintDesignMd()` statically checks a `DESIGN.md` document for:
1. `broken-ref`: unresolved `{path.to.token}` references or reference cycles.
2. `contrast-ratio`: component foreground/background token pairs below `4.5:1` WCAG contrast.
3. `orphaned-tokens`: declared palette tokens never referenced by any component when components are defined.
4. `spec-version-mismatch`: warns when `specVersion` differs from `"alpha"`.
