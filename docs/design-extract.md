# slop-detect design extract (new landing)

This document is the faithful extraction of the new slop-detect visual identity
from the Claude Design export `slop-detect-branding-project` (share id
`9c9FkIQuv1YVP0tSPtW-yQ`). The export is the visual and UX source of truth. Where
the export is silent, this doc says so explicitly under "Gaps", so the mapping
pass can flag GAP-FILLs rather than invent values.

Source files read, in the order the export's README prescribes (chat first, then
the primary file, then every companion):

| File                         | Role                                                        |
|------------------------------|-------------------------------------------------------------|
| `chats/chat1.md`             | Intent. Where the user landed after two redesigns.          |
| `project/Landing.dc.html`    | Primary screen. Scan-first hero + leaderboard + axes.       |
| `project/Result.dc.html`     | Centerpiece. Per-domain report (the backlink page).         |
| `project/Leaderboard.dc.html`| Directory + distribution + opt-in listing.                  |
| `project/Docs.dc.html`       | Methodology reference with sticky TOC.                      |
| `project/Brand.dc.html`      | Identity system: mark, color, type, voice, badge, do/don't. |
| `project/scandata.js`        | Shared mock engine: grade bands, tier logic, color maps.    |
| `project/llms.txt`           | Product facts (axes, endpoints, tiers).                     |

The export loads fonts from Google Fonts and writes every style inline. There are
no CSS files, no design tokens file, and no `@media` queries in the source. The
token names below are this doc's invention for the rebuild; the values are the
export's, verbatim.

## What this is: a full re-skin, not a tweak

The committed direction (from the chat) is the editorial instrument: a serif
display, a grotesque body, a monospace data voice, near-black ink on cool paper,
and the verdict scale (green / amber / red) carrying every score. The page itself
is designed to score 0/100 Clean, which is the product's proof.

This is a different system from what `apps/web/functions/_brand.ts` currently
ships. The current theme is dark-first forensic: `#0a0b0e` background, Hanken
Grotesk + Martian Mono, a cold-blue `#5b9dff` accent. The new design is
light-first editorial. The builder must replace the token set and the font links,
not layer on top. The current `landing/fonts/*.woff2` (Hanken, Martian) belong to
the old theme and are not used by this design.

Mapping at a glance:

| Concept        | Current `_brand.ts`            | New design                                  |
|----------------|--------------------------------|---------------------------------------------|
| Page surface   | `#0a0b0e` dark                 | `#F4F5F2` cool paper (light-first)          |
| Ink            | `#f2f4f8` on dark              | `#181815` on light                          |
| Accent         | cold blue `#5b9dff`            | verdict green `#1FA85E` / text `#15824A`    |
| Display font   | Hanken Grotesk                 | Newsreader (serif)                          |
| Body font      | Hanken Grotesk                 | Libre Franklin (grotesque)                  |
| Mono font      | Martian Mono                   | JetBrains Mono                              |
| Dark surface   | the whole page                 | only footer / teams band / code blocks      |
| `color-scheme` | `dark`                         | `light` (with dark sections)                |

# Design system

## Fonts and loading

Three families, from Google Fonts. The export's `<link>` is:

```
https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=Libre+Franklin:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap
```

| Family         | Role                  | Weights loaded                 | Notes                                              |
|----------------|-----------------------|--------------------------------|----------------------------------------------------|
| Newsreader     | display, voice        | 400, 500, 600; italic 400, 500 | Optical size axis `6..72`. Serif with a viewpoint. |
| Libre Franklin | body, UI              | 400, 500, 600, 700             | Grotesque workhorse, explicitly "pointedly not Inter". |
| JetBrains Mono | data, code, labels    | 400, 500, 700                  | The terminal voice: wordmark, scores, captions, code. |

Global font setup (from every file's `<style>`):

```css
html { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
body { background:#F4F5F2; color:#181815; font-family:'Libre Franklin',sans-serif; }
* { box-sizing:border-box; margin:0; padding:0; }
a { color:inherit; text-decoration:none; }
input { outline:none; font-family:inherit; }
::selection { background:#1FA85E; color:#fff; }
```

Family fallbacks to use in the rebuild: `'Newsreader',serif`,
`'Libre Franklin',sans-serif`, `'JetBrains Mono',monospace`.

## Type scale

Newsreader is always weight 500 for display, italic 400/500 for voice. It is never
used for body. Libre Franklin carries all prose. JetBrains Mono carries anything
that reads as data, a label, a score, or code. Display uses fluid `clamp()` sizing,
no media queries.

Display (Newsreader 500, unless noted):

| Token            | Size                         | Line height | Tracking | Seen on                              |
|------------------|------------------------------|-------------|----------|--------------------------------------|
| `display-hero`   | `clamp(44px,6.2vw,88px)`     | 0.98        | -0.02em  | Landing H1                           |
| `display-1`      | `clamp(40px,5.4vw,76px)`     | 0.98        | -0.02em  | Brand H1                             |
| `display-2`      | `clamp(38px,5vw,64px)`       | 1.0         | -0.02em  | Leaderboard H1                       |
| `display-3`      | `clamp(38px,5vw,60px)`       | 1.0         | -0.02em  | Docs H1                              |
| `score-numeral`  | `120px`                      | 0.8         | -0.03em  | Result big score; `/100` is 42px     |
| `h2-fluid-a`     | `clamp(30px,4vw,52px)`       | 1.02-1.04   | -0.02em  | Landing teams + CTA H2               |
| `h2-fluid-b`     | `clamp(28px,3.6vw,42px)`     | 1.02        | -0.02em  | Landing section H2                   |
| `h2-fluid-c`     | `clamp(26px,3.2vw,38px)`     | 1.05        | -0.02em  | Landing "what we measure" H2         |
| `h2-static`      | `32px`                       | ~1.1        | -0.01em  | Docs H2 (with top rule), monitor H3  |
| `h3`             | `28px`                       | 1.1         | -0.01em  | Research card title, voice heading   |
| `serif-row`      | `21px`                       | 1.0         | -0.01em  | Result category name, research links |
| `quote-lg`       | `clamp(20px,2.4vw,26px)`     | 1.3         | italic   | Landing manifesto blockquote         |
| `quote`          | `22px`                       | 1.3         | italic   | Result verdict line                  |
| `quote-sm`       | `18px-20px`                  | ~1.3        | italic   | Voice samples, docs closer           |

Body (Libre Franklin):

| Token        | Size      | Line height | Color     | Seen on                          |
|--------------|-----------|-------------|-----------|----------------------------------|
| `lead`       | 19px      | 1.6         | `#3A3B33` | Hero subhead, docs intro         |
| `body`       | 16-17px   | 1.6         | `#3A3B33` | Standard prose                   |
| `body-sm`    | 14-15px   | 1.5-1.6     | `#3A3B33` | Card copy, captions in prose     |
| `body-xs`    | 13-14px   | 1.5         | `#46473F` | Dense rows, descriptions         |

Mono (JetBrains Mono):

| Token          | Size        | Weight | Seen on                                            |
|----------------|-------------|--------|----------------------------------------------------|
| `wordmark`     | 15px        | 700    | Nav logo (38px/700 on the Brand specimen)          |
| `mono-nav`     | 13px        | 400    | Nav links, footer links, sample chips              |
| `mono-eyebrow` | 13px        | 400    | Section eyebrow (`/brand`, `/methodology`)         |
| `mono-label`   | 11-12px     | 400-700| Section ledger labels (`01 · the mark`), captions  |
| `mono-data`    | 13-15px     | 400-700| Scores, stats, axis names, endpoint paths          |
| `mono-code`    | 12.5-13px   | 400    | Code blocks (line height 1.8-1.9)                  |

## Color tokens

The palette is the product. Five named brand colors plus ink and paper carry the
identity; everything else is a tint of ink for hierarchy or a darkened verdict hue
for AA text. No purple appears as brand or CTA anywhere. Values below are exact
from the export.

Core (named on the Brand page):

| Token   | Hex       | Role                                                  |
|---------|-----------|-------------------------------------------------------|
| `paper` | `#F4F5F2` | Page surface. Cool neutral, never cream.              |
| `ink`   | `#181815` | Text and the mark on light. Near-black, not pure.     |
| `clean` | `#1FA85E` | Clean tier, the reticle dot, the primary accent.      |
| `mild`  | `#D89A2E` | Mild tier, warnings (amber).                          |
| `heavy` | `#C9402E` | Heavy tier, "the slop" (red).                         |

Surfaces and dark register:

| Token        | Hex       | Role                                                       |
|--------------|-----------|------------------------------------------------------------|
| `surface`    | `#FBFBF9` | Cards, inputs. A hair lighter than paper.                  |
| `surface-2`  | `#EEF0EB` | Stats strip band, row hover.                               |
| `ink-deep`   | `#16170F` | Dark sections: footer, teams band, code blocks, dark mark. |
| `ink-deeper` | `#0F0F0B` | Email input on the dark monitor card.                      |

Ink tints (text on light, high contrast first):

| Token       | Hex       | Role                                                      |
|-------------|-----------|-----------------------------------------------------------|
| `text`      | `#181815` | Primary text.                                             |
| `text-2`    | `#3A3B33` | Body prose.                                               |
| `text-3`    | `#46473F` | Secondary, nav links, dense-row labels.                   |
| `text-4`    | `#6E6F63` | Tertiary, mono captions, section numbers, code comments.  |
| `text-5`    | `#7E7F72` | Evidence text, faint code comment.                        |
| `text-6`    | `#9A9B8E` | Quaternary, placeholders, faint mono, chart axis labels.  |

Verdict text colors (darkened hues that pass AA on paper; use these for type, the
core hues for fills and dots):

| Token         | Hex       | Pairs with | Role                               |
|---------------|-----------|------------|------------------------------------|
| `clean-text`  | `#15824A` | `clean`    | Green links, eyebrows, "Clean".    |
| `mild-text`   | `#9A6B12` | `mild`     | Amber text, `https://` prefix.     |
| `heavy-text`  | `#B23A2A` | `heavy`    | Red text, "+weight" numerals.      |
| `system-text` | `#2C6E8F` | n/a        | System (DESIGN.md) axis accent.    |

Ink tints (text on the dark `#16170F` register):

| Token         | Hex       | Role                                            |
|---------------|-----------|-------------------------------------------------|
| `d-text`      | `#F4F5F2` | Primary text on dark.                           |
| `d-text-2`    | `#C9CABF` | Body and code text on dark.                     |
| `d-text-3`    | `#B6B7AC` | Footer text, muted on dark.                     |
| `d-text-4`    | `#8A8B7E` | Faint on dark.                                  |
| `d-dim`       | `#6E6F63` | Dim labels on dark (same as `text-4`).          |
| `clean-dark`  | `#3FBE7A` | Clean green on dark (brighter, the footer dot). |

Borders and hairlines (light):

| Token        | Hex       | Role                                                     |
|--------------|-----------|----------------------------------------------------------|
| `border`     | `#DBDDD6` | Standard border: nav, cards, section dividers.           |
| `border-2`   | `#E4E6DF` | Lighter divider (axis rows, breakdown).                  |
| `row`        | `#E7E8E2` | Table row divider (lightest).                            |
| `row-inner`  | `#EDEEE8` | Inner divider inside an expanded breakdown row.          |
| `border-btn` | `#C9CBC3` | Outline-button border, middot separators.                |
| `border-chip`| `#D7D9D2` | Sample-chip border, dashed chart guide stroke.           |
| `track`      | `#E2E4DD` | Progress-bar track behind category bars.                 |
| `neutral`    | `#CDCFC8` | Non-highlighted distribution bar, loading dot.           |

Borders on dark:

| Token       | Hex       | Role                                       |
|-------------|-----------|--------------------------------------------|
| `d-border`  | `#2A2B22` | Dividers in the teams band.                |
| `d-border-2`| `#3A3B30` | Monitor form border.                       |

Tinted callout pairs (background + border):

| Pair          | Background | Border    | Role                                 |
|---------------|------------|-----------|--------------------------------------|
| do / aligned  | `#E9F4EE`  | `#A9D8BD` | "Do" card, AEO "eating our cooking". |
| don't         | `#F7E9E5`  | `#E0B6AE` | "Don't" card.                        |

Do/don't list ink: `#1f3a2b` (green) and `#5a2b24` (red).

Status pill tints (behind a tier label, `chipBg` in the engine):

| Tier  | Tint                       |
|-------|----------------------------|
| Clean | `rgba(31,168,94,0.12)`     |
| Mild  | `rgba(216,154,46,0.14)`    |
| Heavy | `rgba(201,64,46,0.12)`     |

Chart fills:

| Use                | Value                                                  |
|--------------------|--------------------------------------------------------|
| Area under line    | `rgba(31,168,94,0.10)` / `(216,154,46,0.10)` / `(201,64,46,0.10)` by tier |
| Radar "you" polygon| `rgba(31,168,94,0.14)`, stroke is the tier text color  |
| Chart guides       | `#D7D9D2` (mid), `#E2E4DD` (inner), `#9A9B8E` (avg, dashed) |

Letter-avatar chip palette (deterministic per name, `chips[]` in the engine):

```
['#C9402E','#9A6B12','#15824A','#46473F','#2C6E8F','#7A4D9A']
```

Note: `#7A4D9A` (a muted purple) appears only here, as one of six data-avatar
backgrounds. It is never a CTA, accent, or brand color. The brand explicitly
forbids purple on CTAs; this single data use is deliberate and bounded.

## Tier, grade, and verdict logic

This is the heart of the system: color encodes the score. From `scandata.js`.

Grade bands (score is 0-100, lower is cleaner):

```
[[2,'A+'],[5,'A'],[9,'A-'],[14,'B+'],[19,'B'],[23,'B-'],[27,'C'],[33,'D+'],[39,'D'],[100,'F']]
```

Tiers: `Clean` if score < 10, `Mild` if 10-27, `Heavy` if >= 28.

Grade to color bucket: grade starting `A` -> clean; `B` or `C` -> mild; `D` or
`F` -> heavy.

Color resolvers (use these everywhere a tier or grade is shown):

| Resolver        | Clean       | Mild        | Heavy       |
|-----------------|-------------|-------------|-------------|
| dot / fill      | `#1FA85E`   | `#D89A2E`   | `#C9402E`   |
| text (`Fg`)     | `#15824A`   | `#9A6B12`   | `#B23A2A`   |
| status pill bg  | clean tint  | mild tint   | heavy tint  |

Badge colors (the embeddable SVG badge, dark left segment + tier-colored right):

| Tier  | Right bg   | Right ink |
|-------|------------|-----------|
| Clean | `#1FA85E`  | `#0A2A18` |
| Mild  | `#D89A2E`  | `#3A2705` |
| Heavy | `#C9402E`  | `#FFFFFF` |

System axis (DESIGN.md): `Aligned` >= 80 -> `#15824A`; `Drifting` >= 50 ->
`#9A6B12`; `Off-system` < 50 -> `#B23A2A`; no system declared -> `#6E6F63`.

AEO axis: `AI-Ready` >= 80 -> `#15824A`; `Partial` >= 50 -> `#9A6B12`;
`Invisible` < 50 -> `#B23A2A`. Pass mark `✓` is `#15824A`, fail `✗` is `#C9402E`.

## Spacing scale

The system is loosely 4px-based but uses a wide set of literal values. Observed
values, in px: `2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28,
30, 32, 34, 36, 40, 44, 46, 48, 56, 60, 64, 70, 72, 80, 90, 96`.

Conventions that recur:

- Section horizontal padding is always `32px`.
- Section vertical padding runs `56px` to `96px` on top, tapering toward the
  footer. The hero is the most generous (`96px 32px 60px` on Landing).
- Gaps inside grids: `12-14px` tight (axis cards, charts), `24px` cards,
  `36-48px` wide editorial columns.
- Inline gaps in rows: `8-12px`. Nav link gap `22-26px`.

There is no single modular ratio. Treat the list above as the allowed set; the
mapping pass can quantize to an 8px scale with named steps if it wants stricter
tokens (note this as a GAP-FILL, the export does not declare one).

## Radii

| Radius   | Used for                                                          |
|----------|------------------------------------------------------------------|
| `2px`    | Nav github button, small score/sample square chips.              |
| `3px`    | Primary and outline buttons, rescan input, share buttons.        |
| `4px`    | Hero scan form, badge corners, 18px letter-avatar, status pill, progress bar. |
| `5px`    | 20px letter-avatar, dark code block inside the badge card.       |
| `6px`    | Mark frames, dark code blocks, axis cards, system/AEO cards, domain pill. |
| `8px`    | Brand cards, research cards, the breakdown container.            |
| `10px`   | Fixes card, share/embed cards, monitor card.                     |
| `999px`  | Sample chips (full pill).                                        |
| `50%`    | Tier dots and all circular dots.                                 |

Pattern: the larger and more "panel-like" the surface, the larger the radius
(6px data cards, 10px feature panels). Buttons stay tight (3px).

## Borders and rules

- Standard border is `1px solid #DBDDD6`.
- The signature editorial device is the section ledger rule: `border-top: 1.5px
  solid #181815` with `padding-top: 14px` above a mono label like `01 · the mark`
  or `competitive analytics`. This appears on Brand, Result, Leaderboard, and Docs
  section headers. It is the "print-grade hierarchy" the chat describes.
- Docs H2 headers also carry the 1.5px ink top rule.
- Tier reference columns use `border-top: 2px solid <tier fill>`.
- Voice samples use `border-left: 3px solid <tier fill>` with a mono tier label.
- Row dividers step lighter as they nest: `#E4E6DF` -> `#E7E8E2` -> `#EDEEE8`.

## Shadows

The system is shadow-averse by principle (the "don't" list forbids glows). Cards
get a 1px border, not a shadow. The only shadow in the export:

```
box-shadow: 0 1px 2px rgba(0,0,0,0.1)   /* the live badge only */
```

Do not introduce colored or large-blur shadows; that is pattern `colored_glows`
(+4) in the detector.

## Layout, grid, and containers

Centered max-width containers, `32px` side padding, CSS grid for structure.

| Screen      | Container max-width | Notes                                              |
|-------------|---------------------|----------------------------------------------------|
| Landing     | `1120px`            | Hero centered; rest left-aligned.                  |
| Brand       | `1120px`            |                                                    |
| Leaderboard | `1080px`            |                                                    |
| Result      | `1040px`            | Densest screen.                                    |
| Docs        | `1240px`            | `212px` sticky sidebar + `1fr` content, gap `56px`; content max `760px`. |

Form widths: hero scan `620px`, leaderboard CTA scan `520px`, monitor email
`440px`, result nav rescan `380px`.

Recurring grid templates (desktop, as authored):

- Leaderboard preview on Landing: `repeat(3,1fr)`, gap `36px 40px`.
- Leaderboard "by category": `repeat(2,1fr)`, gap `40px`.
- Editorial two-column (heading left, list right): `0.8fr 1.2fr` or `0.9fr 1.1fr`
  or `1fr 1fr`, gap `40-48px`.
- Result 4-axis strip: `repeat(4,1fr)`, gap `12px`.
- Result category overview bars: `repeat(5,1fr)`, gap `14px`.
- Result analytics: `1fr 1fr`, gap `28px`.
- Brand color swatches: `repeat(5,1fr)`, gap `14px`.
- A leaderboard row: `grid-template-columns:16px 1fr auto` (rank, name, score).
- A directory row: `26px 22px 1fr auto auto` (rank, chip, name, listed, score).

## Responsive

The export ships no `@media` queries. Fluidity comes only from `clamp()` on
display type and from `flex-wrap:wrap` on the nav, the stats strip, the footer,
button rows, and chip rows. The multi-column CSS grids (3-up leaderboard, 2-up
teams, the docs sidebar, the 4-axis and 5-category strips) have no authored mobile
fallback and will not reflow on their own.

This is a real gap. The mapping pass should define breakpoints and stacking. A
reasonable, anti-slop default to propose (flag as GAP-FILL):

- `<= 900px`: docs sidebar collapses; 3-up and 2-up grids drop to 1 column;
  4-axis strip becomes 2x2.
- `<= 640px`: hero type pins to the low end of its `clamp`; 5-category bar grid
  becomes 2 or 3 wide; the analytics `1fr 1fr` stacks; nav condenses (the chat
  notes the wordmark and labels are prone to wrapping, so keep `white-space:nowrap`
  on the wordmark, buttons, and score cells, which the export already does).

## Motion and interaction states

Hover is the only state the export defines, via a `style-hover` attribute. Map it
to `:hover` transitions in the rebuild.

| Element                | Hover                                          |
|------------------------|-------------------------------------------------|
| Text link (light)      | color -> `#181815`                              |
| Text link (dark)       | color -> `#F4F5F2`                              |
| Secondary text link    | `opacity: 0.7`                                  |
| Primary button         | background -> `#15824A` (ink to green)          |
| Monitor CTA (on dark)  | background `#1FA85E` -> `#3FBE7A`                |
| Outline / github button| border-color -> `#181815`                       |
| Leaderboard / dir row  | background -> `#EEF0EB`                          |
| Card (research, etc.)  | border-color -> `#181815`                       |
| Docs sidebar link      | `border-left-color` -> `#1FA85E`                |

States the export does define, beyond hover:

- Loading: the Result page renders a placeholder before scan data resolves:
  domain `…`, dot `#CDCFC8`, tier text `#46473F`, verdict text `scanning…`. All
  metric slots render empty strings, not zeros.
- Empty / clean: Fixes section shows an italic green line "Nothing to fix, this
  page is already Clean. Keep it that way." Each clean category shows
  "✓ clean, no tells in this category." Aligned system shows "✓ aligned with its
  declared DESIGN.md, no drift."
- Expanded vs collapsed: breakdown rows toggle a caret `▾` (open) / `▸` (closed);
  the first dirty category opens by default.
- Confirmation micro-states (button label swaps, ~1.6-1.8s): "Share" ->
  "link copied ✓"; "Copy the full fix prompt" -> "copied the fix prompt ✓";
  "Copy markdown" -> "copied ✓"; monitor form -> "✓ confirm the double-opt-in
  link we just emailed".

States the export does NOT define (gaps, flag as GAP-FILL):

- Focus / focus-visible: inputs set `outline:none` and no replacement ring is
  drawn. A keyboard focus style must be added (an ink or `#1FA85E` ring) for
  accessibility. Do not ship `outline:none` alone.
- Active / pressed button state.
- Disabled button or input state.
- Web error state: a blocked, timed-out, or unreachable scan has no designed
  screen (the CLI exits non-zero, but the web Result page assumes success). Needs
  a designed error / retry state.
- Transition durations and easing are unspecified. Propose a single subtle token
  (for example 120-160ms ease) rather than per-element values.

# Components

Every reusable component in the export, with its anatomy and states. Build these
once and share them across screens.

## Navigation bar

Sticky (`top:0; z-index:50`), translucent paper background
`rgba(244,245,242,0.88-0.92)`, `border-bottom:1px solid #DBDDD6`, padding
`13-14px 32px`, inner row is `max-width` container with
`display:flex; justify-content:space-between`. Left: the logo lockup. Right: mono
nav links (13px `#46473F`, hover `#181815`) and a github outline button
(`border:1px #C9CBC3; padding:6px 12px; radius:2px; "github ↗"`, hover border
`#181815`). The current page's link is set to `#181815` (no hover). The Result
nav also holds a compact "scan another domain" input between logo and links.

## Footer

Dark band `#16170F`, text `#B6B7AC`, padding `40-46px 32px`. Left: dark-variant
reticle (paper strokes, `#3FBE7A` dot) + wordmark `#F4F5F2` + a mono meta string
(`© 2026 · MIT` or `definitions·2026.09 · MIT`) in `#6E6F63`. Right: mono links,
hover `#F4F5F2`.

## Logo lockup (mark + wordmark)

Reticle SVG (22px in nav, scales freely) + the string `slop-detect` in JetBrains
Mono 700, `letter-spacing:-0.01em`, `white-space:nowrap`. Always lowercase, always
hyphenated, always monospace: "it's a command you type." Clear space equals one
bracket length. Light variant: ink `#181815` brackets, `#1FA85E` dot. Dark
variant: `#F4F5F2` brackets, `#3FBE7A` dot. Assets in
`apps/web/public/landing/design/` (`mark.svg`, `mark-dark.svg`, `favicon.svg`).

## Scan input (the primary action)

A single bordered row, `border:1px solid #181815`, `radius:4px`,
`overflow:hidden`, background `#FBFBF9`. A non-interactive `https://` prefix in
mono `#9A6B12`, then a transparent text input (mono 15px, placeholder
`yourdomain.com`), then an attached submit button (`background:#181815`, text
`#F4F5F2`, mono, hover background `#15824A`, `white-space:nowrap`, label "Scan").
Submitting routes to `Result` with the cleaned domain. Compact variants: the
result-nav rescan (`border:1px #C9CBC3; radius:3px`, 13px) and the leaderboard CTA
(14px). The monitor variant inverts for the dark card (below).

## Buttons

- Primary: `background:#181815; color:#F4F5F2`, mono 14px weight 500, radius 3px,
  hover background `#15824A`. Padding varies by context (`14px 24px` CTA,
  `13px 24px` fixes, `0 30px` inside a form).
- Outline / secondary: `border:1px solid #C9CBC3; color:#181815`, mono, radius 3px,
  hover border `#181815`.
- Monitor CTA (on dark): `background:#1FA85E; color:#0A2A18`, mono 13px weight
  700, hover `#3FBE7A`.

## Sample chip

A pill (`radius:999px; border:1px solid #D7D9D2`, padding `5px 13px`, mono 12.5px)
with a 7px tier dot then a label like `bolt.new · D+`. Hover border `#181815`.
`white-space:nowrap`. Links to a Result.

## Stats strip

A full-width band, `border-top` + `border-bottom: 1px #DBDDD6`, background
`#EEF0EB`, padding `18px 32px`, centered mono 13px inline stats separated by a
`#C9CBC3` middot: "12,067 pages scanned · median slop score 31 · 18% score Clean".
The numerals are colored: median in `mild-text`, clean percent in `clean-text`.

## Letter-avatar chip

A rounded square (18px nav / 20px lists / 30px on the Result header), background
chosen deterministically from the six-color chip palette by name hash, the name's
initial in `#FBFBF9` mono 700. Radius `4-6px`.

## Leaderboard row

A grid link, columns `16px 1fr auto` (rank in mono `#9A9B8E`; name with a
letter-avatar and ellipsis truncation; score in mono `#46473F` followed by the
grade in its tier text color, weight 700). Padding `9px 4px`, bottom border
`#E7E8E2`, hover background `#EEF0EB`. Category columns group rows under a mono
header with a `#DBDDD6` underline.

## Score-tier badge pill (compact readout)

A bordered chip (`#DBDDD6`, radius 6px, background `#FBFBF9`) holding a tier dot +
`TIER` (uppercase, in tier text color) and `score grade`. Used on the Result
domain header.

## Big score display

The Result hero: a `120px` Newsreader 500 numeral in the tier text color, line
height 0.8, tracking -0.03em, with a `42px` `/100` in `#9A9B8E` beside it. Below:
a mono `grade · tier` line, a mono `rank #N of M`, then the verdict as a `22px`
Newsreader italic line. A right-aligned mono action column: "Fix with AI ->",
"Share ->", "Rescan ->", "Get the badge ->".

## Category overview bars

Five-up grid. Each: an 8px track (`#E2E4DD`, radius 4px) with a fill (width =
clean percentage, color = category status tier color), a mono category name, and a
mono sub-line ("clean" or "+points · N flagged").

## Expandable breakdown

A list of category rows. Each row header: the category name in `21px` Newsreader,
a status pill (tinted background, tier text color), a count label, and a caret.
Tapping toggles. Expanded body lists flagged patterns; each pattern is a
`20px 1fr 44px` grid: a red `✗`, then the pattern label (15px weight 600), its
evidence in mono `#7E7F72`, and a `why` line in `#46473F`, then the weight as
`+N` in `heavy-text` weight 700, right-aligned. Clean categories show a green
"✓ clean" line instead.

## Four-axis strip

Four equal cards (`#DBDDD6` border, radius 6px, `#FBFBF9`). Each: a mono caption
(`design slop`, `copy slop`, `system · DESIGN.md`, `AEO · agent-readable`), a
17px weight-700 value in the axis tier color, and a mono sub-value (`score/100`,
or tier label). A header line above reminds polarity: "slop: lower is better ·
system & AEO: higher is better."

## System (DESIGN.md) drift card and AEO checklist card

Side by side (`1fr 1fr`, gap 14px), both `#DBDDD6` / radius 6px / `#FBFBF9`,
padding `18px 20px`. System card: a header with the tier in its color, then either
"✓ aligned" (clean), a list of `drift` items (mono `drift` tag in `#9A6B12` +
text), or an "absent" prompt to declare a DESIGN.md. AEO card: a header with
`tier · score`, then eight check rows (`16px 1fr 30px`: a `✓`/`✗` mark in
green/red, the check label in mono `#3A3B33`, the weight in `#9A9B8E`).

## Charts (all inline SVG, no chart library)

- Score over time: a `320x110` viewBox, a dashed mid guide (`#D7D9D2`), a tier-fill
  area, and a 2px line in the tier text color. A delta label ("−N pts since first
  scan") colored green if improved, red if worse.
- Cleanliness radar: a `220x150` pentagon. Outer/mid guides (`#D7D9D2`, `#E2E4DD`),
  a dashed rank-average polygon (`#9A9B8E`), and the "you" polygon filled
  `rgba(31,168,94,0.14)` with a tier-color stroke. Five mono axis labels.
- Neighbors: a small ranked list of same-category domains; the current domain row
  is tinted `rgba(31,168,94,0.08)` and tagged "you".
- Slop distribution: a 10-bucket histogram, bars `#CDCFC8` except the user's
  bucket in the tier fill color, with a "cleaner than X% of pages" caption.

## Fix card

Inside the Fixes panel (`#DBDDD6` / radius 10px / `#FBFBF9`, padding `38px 36px`,
centered heading). Each fix: a sub-card (`#E4E6DF` / radius 8px / `#F4F5F2`) with a
`✗ label` (mono, the `✗` in `#C9402E`) and a `+weight` in `heavy-text`, then a
`60px 1fr` grid of three labeled rows: `why` (mono `#9A6B12`), `fix` (mono
`#15824A`), `rule` (mono `#6E6F63`, value in mono). Below the list: a primary
"Copy the full fix prompt" button and a mono terminal hint
(`npx slop-detect <domain> --fix`).

## Share + embed card

Two panels (`1fr 1fr`, radius 10px). Share: copy-link button + "post on X" and
"LinkedIn" outline buttons. Embed: a live badge preview (two-segment pill, dark
"slop" + tier-colored `grade · score`), a dark code block (`#16170F`, mono 11.5px,
`word-break:break-all`) holding the markdown snippet, and a "Copy markdown"
button.

## Live badge

`display:inline-flex`, mono 12-13px weight 700, radius 4px, `overflow:hidden`, the
only element with a shadow (`0 1px 2px rgba(0,0,0,0.1)`). Left segment
`background:#16170F; color:#F4F5F2; "slop"`. Right segment tier-colored per the
badge table above, showing `grade · score`.

## Monitor / continuity card

A dark panel (`#16170F`, text `#C9CABF`, radius 10px, padding `40px 36px`,
centered). A `#3FBE7A` mono eyebrow, a 32px Newsreader heading
(`Keep <domain> on-system...`), body in `#B6B7AC`, then the email form (dark:
`background:#0F0F0B; border:1px #3A3B30`, green CTA). A mono benefits row and a
fine-print line (`double opt-in · $29-$149/mo · engine stays MIT & free forever`).
After submit, swaps to a `#3FBE7A` confirmation line.

## Teams / continuity section (Landing)

Full-dark band `#16170F`. Left column: `#3FBE7A` mono eyebrow, a fluid Newsreader
heading ("Slop is the hook. Staying on-system is the product."), two body
paragraphs. Right column: a list of continuity items, each a `26px 1fr` row with a
mono glyph tag (`↻ ◳ ⎙ ⊘ ↗`) and a title + description, divided by `#2A2B22`.

## Research / article cards (Landing)

A `1.3fr 1fr` grid: a large feature card (border `#DBDDD6`, radius 8px, `#FBFBF9`,
hover border `#181815`) with a 28px Newsreader title and a mono "methodology · N
min read" footer, beside a stack of plain article links (Newsreader 19px + a mono
reference tag, divided by `#DBDDD6`, hover opacity 0.7).

## Voice samples (Brand)

Three quotes, each `border-left:3px solid <tier fill>`, a mono tier label in the
tier text color, and the quote in Newsreader italic 18px.

## Do / Don't cards (Brand)

Two cards: "do" (`background:#E9F4EE; border:1px #A9D8BD`) and "don't"
(`background:#F7E9E5; border:1px #E0B6AE`), radius 8px, padding `26px 28px`. A mono
header (`do` in `#15824A`, `don't` in `#B23A2A`), then a list with green `→` or red
`✗` leads.

## Color swatch card (Brand)

`repeat(5,1fr)`. Each: a 96px color block, then `name` (mono 700), `hex` (mono
`#6E6F63`), and a role line (13px `#46473F`), all on a `#FBFBF9` card with a
`#DBDDD6` border, radius 8px.

## Type specimen card (Brand)

`160px 1fr` grid: a mono meta column (role, family name, weights) beside a live
specimen set in the family.

## Docs sidebar (sticky TOC)

`position:sticky; top:84px`, mono 13px. Links with a transparent 2px left border
that turns `#1FA85E` on hover, plus a meta block at the bottom
(`definitions·2026.09 · 27 design · 9 copy · 8 AEO · MIT · v0.6.0`).

## Code block

Dark `#16170F`, radius 6px, padding `18px 20px`, JetBrains Mono 12.5-13px, line
height 1.8-1.9, base text `#C9CABF`. Syntax accent colors used in the export:
comments `#6E6F63` / `#7E7F72`, command/identifier green `#3FBE7A`, string/number
amber `#E5B05A`, yaml keys / function calls blue `#7FB5E6`, keywords (`import`,
`const`, `from`) magenta `#C77DBB`. Inline mono inside prose uses the same family
at a slightly smaller size, no background.

## Reference tables (Docs)

Grid rows with a colored path/name column and a description column: endpoints and
continuity endpoints (`248px 1fr`, path in `#15824A`), presets (`130px 1fr`), axes
(`130px 1fr 70px` with a polarity column), AEO checks (`1fr 60px 90px` with weight
in the severity color + a severity column). Rows divided by `#E4E6DF`, headers by
the 1.5px ink rule.

## CTA section

Centered. A fluid Newsreader heading, a body line, a primary + outline button row,
and (on Landing) a manifesto blockquote in Newsreader italic
(`clamp(20px,2.4vw,26px)`, color `#46473F`): "Empty is better than fake. Show the
product, don't decorate around it."

# Screen and section inventory

Five screens. Routes in the export are `.dc.html` files; the production routes are
noted from the product's own URL scheme (`/`, `/r/<domain>`, `/leaderboard`,
`/docs`, plus a brand page).

## 1. Landing (`Landing.dc.html`, route `/`)

The primary screen. Centered hero (a deliberate exception: centered is safe
because the headline is a serif, and the slop tell requires a centered sans),
everything below it left-aligned editorial.

1. Nav (home is implicit; links: leaderboard, methodology, brand, github).
2. Hero: mono eyebrow ("the ai-design-slop fingerprint · definitions·2026.09"), a
   `clamp(44,6.2vw,88)` Newsreader H1 ("Does your landing page look generated?"
   with "generated?" in italic `#46473F`), the scan form, a mono reassurance
   line ("...~8s"), and three sample chips (bolt.new, linear.app,
   news.ycombinator.com, each with a tier dot).
3. Stats strip: pages scanned · median · % Clean.
4. Leaderboard preview: an H2 + "view full leaderboard ->" link, a positioning
   paragraph, a "signal, not a verdict" disclaimer, then a 3-column board (Dev
   Tools, Design, Fintech, etc.), each row a backlink to its Result.
5. What the score measures: a `0.8fr 1.2fr` split, heading + intro on the left, a
   four-axis ledger (design, copy, system, aeo, each with its accent color and a
   one-line description) on the right.
6. Teams / continuity: full-dark band, "Slop is the hook. Staying on-system is the
   product.", two paragraphs, and the five continuity items.
7. Research: a ledger-ruled section with a feature card and three article links.
8. CTA: "Not where you want to be?", scan + how-scoring buttons, and the manifesto
   blockquote.
9. Footer.

## 2. Result (`Result.dc.html`, route `/r/<domain>`)

The centerpiece and the backlink engine. Reads `?d=<domain>`. Densest layout
(`1040px`). Loading placeholder resolves into the report.

1. Nav with an inline "scan another domain" rescan input.
2. Domain header: letter-avatar + domain (mono 20px) + a "scanned <date> · <ms>s ·
   <category>" line, and a compact tier badge pill on the right.
3. Big score block: the 120px numeral, grade · tier, rank, the italic verdict, and
   the right-aligned action column (Fix with AI, Share, Rescan, Get the badge).
4. Category overview: five status bars (Type, Color, Layout, Effects, Imagery).
5. Expandable breakdown: "<flagged> of <total> patterns flagged", category rows
   that open to per-pattern evidence + weights. First dirty category opens by
   default.
6. Four-axis strip: design slop, copy slop, system, AEO, with the polarity note.
7. System + AEO detail: the drift card and the eight-check AEO card.
8. Competitive analytics (ledger-ruled): score-over-time, cleanliness radar,
   category neighbors, slop distribution.
9. Fixes: "You've seen the score. Now fix it." The heaviest tells as fix cards
   (why / fix / rule), a copy-prompt button, and the CLI hint. Clean pages show
   the empty state.
10. Share + embed: share buttons and the live badge + markdown snippet.
11. Monitor: the dark continuity card scoped to this domain.
12. Footer.

## 3. Leaderboard (`Leaderboard.dc.html`, route `/leaderboard`)

The directory and "state of slop". `1080px`.

1. Nav (leaderboard active).
2. Header: mono eyebrow ("/leaderboard · the directory"), H1 "The state of AI
   design slop", a positioning paragraph, the "signal, not a verdict" +
   "owner-gated" disclaimer, and an inline stats row (scanned · median · Clean% ·
   Mild% · Heavy%).
3. Distribution: a 10-bucket histogram over 12,067 pages, labeled clean -> heavy.
4. Cleanest overall: a 2-column ranked list (top 10), each row a backlink with its
   category tag.
5. By category: a 2-column set of category boards (Dev Tools, Design & Creative,
   Fintech, Indie & Startups, AI builders, Generic templates), each row showing
   name + domain + score/grade.
6. Directory (opt-in only): a header with a listed-count and "dofollow backlinks"
   note, an explainer, then owner-listed rows (rank, chip, name, domain, "listed
   <date>", score/grade).
7. CTA: "Don't see your site?" with a scan form.
8. Footer.

## 4. Docs (`Docs.dc.html`, route `/docs` or `/methodology`)

Methodology reference. `1240px`, sticky sidebar + `760px` content.

1. Nav (methodology active).
2. Sidebar: the 11-item TOC + a meta block.
3. Intro: mono "/methodology", H1 "How the scan works", a lead paragraph, and a
   "credibility model" note.
4. The four axes: a ledger table (name, description, polarity).
5. Install: dark code block (npx / npm).
6. The CLI: a dark code block of flags, plus a "tip" callout.
7. AEO: an explainer + the eight-check weighted table + a "eating our own cooking"
   green callout.
8. The system axis (DESIGN.md): explainer + a drift-output code block.
9. Web & REST API: a curl block + an endpoints table + an auth-tiers line.
10. Continuity & directory: explainer + a continuity-endpoints table.
11. Programmatic (core): a JS usage code block.
12. Presets & agents: a presets table + the MCP config block.
13. CI gate (GitHub Action): explainer + a YAML block.
14. Tiers & grades: three tier columns (Clean 0-9, Mild 10-27, Heavy 28+) with
    grades, each under a 2px tier-colored top rule.
15. Closer: "Empty is better than fake." + a scan button.

## 5. Brand (`Brand.dc.html`, route `/brand`)

The identity system, the page that proves the thesis. `1120px`. Numbered ledger
sections.

1. Nav (brand active).
2. Hero: "A detector that refuses to look like the thing it detects.", with the
   "this page scores 0/100 · A+ · Clean" line.
3. `01 · the mark`: the reticle on light and on dark, with usage notes.
4. `02 · the wordmark`: the lockup and the "always lowercase, hyphenated,
   monospace" rule.
5. `03 · color`: the five-swatch palette ("no purple anywhere").
6. `04 · typography`: the three type specimens.
7. `05 · voice`: "Critique the page, never the person." + three tier voice
   samples.
8. `06 · the badge`: three live badge examples + the markdown embed.
9. `07 · principles`: the do / don't cards.
10. Footer.

# Why this design passes its own detector

The dogfood guardrail is a hard downstream constraint: every served slop-detect
surface must itself score Clean (design axis, and copy axis 0). This design was
built as the proof. The specific, non-generic choices that keep it clean, mapped
to the patterns they dodge:

| Slop pattern (weight)            | How this design avoids it                                                                 |
|----------------------------------|-------------------------------------------------------------------------------------------|
| AI-default fonts (8)             | Newsreader serif + Libre Franklin (a grotesque, chosen for being "pointedly not Inter") + JetBrains Mono. No Inter/Geist/Space Grotesk. |
| VibeCode purple CTAs (8)         | Primary button is ink `#181815` going to green `#15824A` on hover. Purple `#7A4D9A` exists only as 1 of 6 data-avatar chips, never on a CTA. |
| Hero gradient text (6)           | All headings solid ink. No `background-clip:text`.                                        |
| Gradient-heavy backgrounds (4)   | Flat surfaces only: `#F4F5F2`, `#FBFBF9`, `#16170F`. No gradient layers.                  |
| Accent-stripe cards (6)          | Cards differentiate by type and spacing, not a colored top border. The only ruled device is the 1.5px ink ledger rule, which is structural, not decorative. |
| Cream / beige surface (7)        | `#F4F5F2` is a cool neutral, explicitly "never cream".                                    |
| Washed-out grey body (7)         | Near-black `#181815` ink on paper; verdict text uses AA-darkened hues (`#15824A`, `#9A6B12`, `#B23A2A`). |
| Aurora / mesh blobs (5)          | No blurred backdrops anywhere.                                                            |
| Colored glows (4)                | Cards use a 1px border. The only shadow is a `0 1px 2px rgba(0,0,0,0.1)` on the badge.    |
| Eyebrow pill (5)                 | Eyebrows are plain mono strings (`/methodology`, `01 · the mark`), not a rounded "Now in Beta" pill. |
| Centered hero, generic sans (4)  | The one centered hero (Landing) is set in a serif on purpose; the tell requires a sans. All other screens are left-aligned. |
| Icon-top feature cards (4)       | No row of identical icon-topped cards. The four-axis and continuity lists are typographic ledgers. |
| AI sparkle badges (3)            | No `✨`/Sparkles. The only custom glyph is the scan reticle; the rest are Unicode text glyphs, not an icon font. |
| Crushed display tracking (5)     | Display tracking is `-0.02em` (`-0.03em` only on the 120px numeral), never below `-0.04em`. |
| Flat type hierarchy (3)          | A 120px serif numeral against 11-13px mono labels is a dramatic ratio, far past 2x.       |
| Big-number stat banner (3)       | Stats are real and singular ("12,067 pages scanned"), not an invented 4-up banner.        |

Copy axis (must be 0): the voice is dry, exact, and a little funny, "a senior
designer reading a page back to you." No buzzwords, no "not just X, it's Y"
antithesis, no filler openers, no em-dash overload. The manifesto, "Empty is
better than fake. Show the product, don't decorate around it," is the rule the
copy follows. Keep all rebuilt and CMS-entered copy to this register; a marketing
rewrite that adds buzzwords would fail the product's own copy axis.

When the builder substitutes or extends anything (new section, new component,
gap-fill), re-run the detector on the result. The design only stays the proof if
every addition also scores Clean.

# How the tokens and components should land in code

The product UI is Cloudflare Pages: server-rendered TSX functions plus static
HTML, with shared styling centralized in `apps/web/functions/_brand.ts`. That file
is the single source of truth; pages interpolate `BRAND_FONTS_HEAD` and
`BRAND_CSS` rather than hand-rolling tokens (see `_render.tsx`, and the consumers
`leaderboard.tsx`, `directory.tsx`, `report/`, etc.).

To adopt this design, rewrite `_brand.ts`, do not add to it:

- Replace `BRAND_FONTS_HEAD` with the Google Fonts link for Newsreader + Libre
  Franklin + JetBrains Mono (above). Drop the Hanken/Martian link. The
  `landing/fonts/*.woff2` binaries can be removed once nothing references them.
- Flip `:root { color-scheme: dark }` to `light`. The page is light-first; the
  dark register (`#16170F`) is a section treatment, not the base.
- Replace the custom properties with the new token set. A suggested mapping onto
  the existing variable names so downstream interpolation keeps working:

```css
:root{
  color-scheme:light;
  --bg:#F4F5F2; --bg-2:#EEF0EB; --panel:#FBFBF9; --panel-2:#FBFBF9;
  --ink-deep:#16170F; --ink-deeper:#0F0F0B;
  --border:#DBDDD6; --border-2:#E4E6DF; --row:#E7E8E2; --row-inner:#EDEEE8;
  --border-btn:#C9CBC3; --track:#E2E4DD; --neutral:#CDCFC8;
  --text:#181815; --text-2:#3A3B33; --text-3:#46473F; --text-4:#6E6F63;
  --text-5:#7E7F72; --text-6:#9A9B8E;
  --clean:#1FA85E; --mild:#D89A2E; --heavy:#C9402E;
  --clean-text:#15824A; --mild-text:#9A6B12; --heavy-text:#B23A2A;
  --system-text:#2C6E8F; --clean-dark:#3FBE7A;
  --serif:'Newsreader',serif;
  --sans:'Libre Franklin',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  --mono:'JetBrains Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace;
}
```

- Centralize the tier/grade/verdict color resolvers (the maps in this doc) so the
  TSX pages, the OG card generator (`og/`), and the badge generator (`badge/`) all
  read the same source. The engine already has `gradeFor`, `tierFor`, and
  `gradeColor`; the color resolvers should live beside them.
- Build the components above as shared TSX (or shared style strings) so Landing,
  Result, Leaderboard, Directory, Report, and Docs render the same nav, footer,
  scan input, leaderboard row, badge, and cards. The export duplicates them inline;
  the rebuild should not.
- Replace the favicon: the current `apps/web/public/favicon.svg` is the old dark
  scan-line mark. Swap to the new reticle (`landing/design/favicon.svg`) and
  regenerate `favicon.png` / `favicon-512.png` from it.
- Regenerate the OG card (`landing/og.svg` / `og.png` and the `og/` function) in
  the new palette and type, since the existing ones match the old theme.

# Gaps: where the design is silent

For the mapping pass to flag as GAP-FILLs. The export does not specify these, so
any value chosen downstream is an addition, not an extraction:

1. Responsive breakpoints and grid stacking. No `@media` queries exist. Every
   multi-column grid needs a defined mobile fallback (see "Responsive").
2. Focus / focus-visible styling. Inputs use `outline:none` with no replacement.
   An accessible keyboard focus ring must be designed (do not ship bare
   `outline:none`).
3. Active and disabled states for buttons and inputs.
4. A web error / blocked-scan / timeout state for the Result page.
5. Transition durations and easing (only hover end-states are given).
6. A formal spacing scale. The export uses a wide literal set; no modular ratio or
   named steps are declared.
7. Reduced-motion handling for the animated charts and label swaps.
8. Dark-mode-by-preference. The design is light-first with intentional dark
   sections; it does not define a full dark theme of the whole UI. If one is
   wanted, it is net-new design.
9. The wordmark is not provided as a vector; it is mark + live text. If a flat
   logo file is needed (favicons aside), it must be produced.
10. Asset coverage: only the reticle mark and favicon are real vector assets. OG
    cards, the live badge SVG, and any social/share imagery are generated
    server-side and must be re-themed, not extracted.

# Asset manifest

Committed under `apps/web/public/landing/design/` so the build can reach them:

| Path                                          | Description                                  |
|-----------------------------------------------|----------------------------------------------|
| `apps/web/public/landing/design/mark.svg`     | Scan-reticle mark, light surfaces.           |
| `apps/web/public/landing/design/mark-dark.svg`| Scan-reticle mark, dark surfaces.            |
| `apps/web/public/landing/design/favicon.svg`  | Reticle in a rounded paper tile.             |
| `apps/web/public/landing/design/README.md`    | Asset notes for the builder.                 |

Not committed, by design: the export's `uploads/*.png` are screenshots of a
third-party reference product, not slop-detect assets. The three families
(Newsreader, Libre Franklin, JetBrains Mono) load from Google Fonts in the export,
so there are no font binaries to commit here; self-hosting them is a build choice,
not an extraction.
