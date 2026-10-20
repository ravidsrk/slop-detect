# System Axis Specification (`DESIGN.md` Compliance)

Version: **2026.10** · Polarity: **Higher is better (0–100)**

The System axis evaluates whether a rendered page honors its own declared design system — a Google Labs / Stitch-style `DESIGN.md` file placed at `<origin>/DESIGN.md` or supplied via `--design-md <path|url|auto>`.

Unlike the Design and Copy axes (which measure generic AI-builder convergence across all sites), the System axis measures **per-site token drift**. A site that deliberately uses `Space Grotesk` or a `#7c3aed` brand accent will be flagged on the universal Design axis, but if those tokens are declared in its `DESIGN.md`, the System axis scores `100/100 (Aligned)`.

## Scoring & Tier Bands

The System axis evaluates 5 weighted token checks (totalling 100 points). Checks that cannot be evaluated (because a section was omitted in `DESIGN.md` or no matching DOM elements were observed) are skipped and excluded from the denominator. `score = round(100 × passedWeight / evaluatedWeight)`.

- **Aligned**: `80–100` ( ratio `≥ 0.80` )
- **Drifting**: `50–79` ( ratio `0.50–0.79` )
- **Off-system**: `< 50` ( ratio `< 0.50` )
- **No data**: every check skipped (score reported as `100`, tier `No data`)
- **No system**: no parseable `DESIGN.md` front matter / tokens (score `null`)

## Declared tokens

- **Palette**: every string leaf under `colors` (nested maps included), plus `backgroundColor` and `textColor` of each entry under `components`. `{path.to.token}` references are resolved first.
- **Fonts**: the primary family of each `typography.*.fontFamily` (or a bare string value) and each `components.*.typography.fontFamily`.
- **Radii**: `parseFloat()` of each value under `rounded` (e.g. `8px` → `8`).

## Observation

Taken in-page over the first **2,500 visible elements** under `body` (elements with no client rects or a box `≤ 1px` are skipped, as are `script`, `style`, `noscript`, `meta`, `link`, `svg`, `path`):

- **Fonts**: computed `font-family` tallied per element that has its own text node longer than 1 character.
- **CTAs**: up to 30 visible `a` / `button` elements whose computed `background-color` is not `transparent` and has alpha `≥ 0.5`.
- **Headings**: computed `color` of up to 12 visible `h1`–`h3` elements.
- **Radii**: the set of **distinct** computed `border-top-left-radius` values between `3px` and `64px` inclusive (pills/circles excluded).
- **Surface**: computed `body` background, or `html` background when the body's is `rgba(0, 0, 0, 0)`.

## Color comparison

Colors are parsed to sRGB channels from hex (3/4/6/8 digits, alpha ignored), `rgb()/rgba()`, and `hsl()/hsla()`. Two colors **match at tolerance `t`** when every channel differs by at most `t` (`max(|ΔR|, |ΔG|, |ΔB|) ≤ t`, 0–255 scale — a per-channel L∞ distance). Colors that cannot be parsed (e.g. `oklch()`, named colors) match only by exact, case-insensitive string equality. A perceptual (Oklab) comparator is planned; see [ROADMAP.md](../ROADMAP.md).

Font families compare by **primary family**: the first entry in the stack that is not a generic/system keyword (`sans-serif`, `serif`, `monospace`, `system-ui`, `ui-*`, `-apple-system`, `BlinkMacSystemFont`, emoji families, …), lower-cased with quotes stripped.

## System Checks Catalogue

| ID | Label | Weight | Pass rule (as implemented) |
|----|-------|--------|----------------------------|
| `fonts.declared` | Fonts in use are declared in the system | 35 | Every primary family accounting for `≥ 10%` of tallied text elements is a declared font. |
| `colors.cta` | CTA / button colors come from the palette | 30 | **Every** observed CTA background matches some palette color at tolerance `10`. One off-palette CTA fails the check. |
| `colors.surface` | Page surface color comes from the palette | 15 | The surface color matches some palette color at tolerance `14`. |
| `colors.headings` | Heading colors come from the palette | 10 | Fails when **more than half** of observed heading colors match no palette color at tolerance `14` (i.e. passes when at least half match). |
| `radii.scale` | Corner radii follow the declared scale | 10 | Fails when **more than half** of the distinct observed radii are not within `±2px` of a declared radius. |

## Bootstrapping a `DESIGN.md`

You can bootstrap a valid `DESIGN.md` directly from any clean reference page using the CLI or `generateDesignMd()` from `slop-detect-core`. The generated file declares every observed CTA fill, heading color, meaningful font and radius, so the source page scores `100 (Aligned)` against it:

```bash
npx slop-detect https://your-site.com --init-design-md > DESIGN.md
```
