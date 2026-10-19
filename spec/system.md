# System Axis Specification (`DESIGN.md` Compliance)

Version: **2026.09** · Polarity: **Higher is better (0–100)**

The System axis evaluates whether a rendered page honors its own declared design system — a Google Labs / Stitch-style `DESIGN.md` file placed at `<origin>/DESIGN.md` or supplied via `--design-md <path|url|auto>`.

Unlike the Design and Copy axes (which measure generic AI-builder convergence across all sites), the System axis measures **per-site token drift**. A site that deliberately uses `Space Grotesk` or a `#7c3aed` brand accent will be flagged on the universal Design axis, but if those tokens are declared in its `DESIGN.md`, the System axis scores `100/100 (Aligned)`.

## Scoring & Tier Bands

The System axis evaluates 5 weighted token checks (totalling 100 points). Checks that cannot be evaluated (because a section was omitted in `DESIGN.md` or no matching DOM elements were observed) are skipped and excluded from the denominator:

- **Aligned**: `80–100` ( ratio `≥ 0.80` )
- **Drifting**: `50–79` ( ratio `0.50–0.79` )
- **Off-system**: `< 50` ( ratio `< 0.50` )

## System Checks Catalogue

| ID | Label | Weight | Detection & Tolerance |
|----|-------|--------|-----------------------|
| `fonts.declared` | Fonts in use are declared in the system | 35 | Every non-generic `font-family` accounting for `≥ 10%` of text elements must appear in `DESIGN.md`'s Typography section. |
| `colors.cta` | CTA / button colors come from the palette | 30 | Primary CTA and button background colors must sit within CIELAB `ΔE ≤ 12` of a hex/RGB/HSL color declared in `DESIGN.md`. |
| `colors.surface` | Page surface color comes from the palette | 15 | The primary `body`/`html` surface background color must sit within CIELAB `ΔE ≤ 14` of a color declared in `DESIGN.md`. |
| `colors.headings` | Heading colors come from the palette | 10 | At least half of observed `h1`–`h3` heading text colors must sit within CIELAB `ΔE ≤ 14` of a color declared in `DESIGN.md`. |
| `radii.scale` | Corner radii follow the declared scale | 10 | Non-zero, non-pill (`< 100px`) `border-radius` values accounting for `≥ 15%` of rounded elements must sit within `±2px` of a `px` value declared in `DESIGN.md`. |

## Bootstrapping a `DESIGN.md`

You can bootstrap a valid `DESIGN.md` directly from any clean reference page using the CLI or `@slop-detect/core`:

```bash
npx slop-detect https://your-site.com --init-design-md > DESIGN.md
```
