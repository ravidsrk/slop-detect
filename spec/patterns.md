# Design-slop pattern catalogue

27 deterministic patterns scored inside headless Chromium. Each pattern returns `{ triggered, evidence, weight }`. Triggered weights are summed (clamped 0–100) to produce the design-axis score.

**Tier impact:** each pattern contributes its **Weight** toward the aggregate tier. Tiers are not per-pattern; they apply to the summed score.

## Summary table

| ID | Name | Weight | Category | Detection summary |
|----|------|--------|----------|-------------------|
| `slop_fonts` | AI-default font stack (Inter / Geist / Space Grotesk) | 8 | fonts | Hero or ≥60% of visible text uses Inter, Geist, Space Grotesk, or accent-serif italic |
| `purple_accent` | VibeCode Purple — filled indigo/violet CTAs | 8 | colors | ≥1 filled CTA/button with indigo/violet background or gradient |
| `gradient_text` | Hero gradient text (background-clip:text) | 6 | colors | Any element uses `background-clip: text` with a CSS gradient |
| `gradient_backgrounds` | Gradient-heavy backgrounds (5+ elements) | 4 | colors | ≥5 visible elements with opaque CSS gradient backgrounds |
| `accent_stripe` | Colored top/left card borders (the AI em-dash) | 6 | layout | ≥2 card-sized elements with thick colored top or left border stripe |
| `glassmorphism` | Glassmorphism (backdrop-filter blur on translucent layers) | 4 | css | ≥2 elements with `backdrop-filter: blur()` and translucent background |
| `colored_glows` | Big colored box-shadow glows (purple/blue/pink) | 4 | css | ≥1 element with large (≥24px blur) colored box-shadow |
| `centered_hero` | Centered hero in generic sans (Inter-style) | 4 | layout | H1 centered, ≥28px, in a slop font stack |
| `hero_eyebrow_pill` | Eyebrow pill above hero ("Now in beta" / "New") | 5 | layout | Rounded pill above H1 with launch/beta keywords or sparkle/rocket emoji |
| `all_caps_labels` | All-caps section labels (text-transform:uppercase) | 3 | fonts | ≥2 short uppercase labels with positive letter-spacing |
| `perma_dark_mode` | Perma dark mode + medium-grey body text | 4 | colors | Dark page surface with ≥30% mid-grey body paragraphs (or dark with ≥5 paras) |
| `icon_card_grid` | Identical feature cards with icon on top | 4 | layout | ≥3 sibling cards with top-positioned icon (SVG/img) |
| `numbered_steps` | Numbered "1 · 2 · 3" step sequences | 3 | layout | Sibling group contains steps 1, 2, and 3 |
| `stat_banner` | Big-number stat banner ("10k+", "99.9%", "$2M+") | 3 | layout | ≥3 large-font numeric tokens clustered on one row |
| `faq_accordion` | FAQ accordion in the lower half | 2 | layout | ≥3 `<details>` below 40% page height, or FAQ heading + details |
| `gradient_letter_avatars` | Gradient-letter avatars (testimonial slop) | 5 | images | ≥2 round gradient/solid elements with 1–3 letter initials, no photo |
| `bento_grid` | Bento-grid wall — mixed-span rounded card grid | 4 | layout | CSS grid with ≥5 rounded children and ≥2 distinct column spans |
| `aurora_mesh_gradient` | Aurora / mesh gradient blobs (blurred glowing backdrop) | 5 | css | ≥2 large blurred radial/conic gradient blobs (hero backdrop tell) |
| `ai_sparkle_badges` | AI-sparkle badges (✨ / Sparkles "magic" tells) | 3 | images | Sparkle emoji or Sparkles SVG/icon near AI/magic copy |
| `cream_default_bg` | Cream / beige default page background | 7 | colors | Warm off-white page surface (light, R≥G≥B, warmth gap 6–48) |
| `low_contrast_text` | Washed-out grey body text (below WCAG AA on a light background) | 7 | colors | ≥4 body blocks fail 4.5:1 contrast on light bg, ≥25% of measured text |
| `crushed_tracking` | Crushed letter-spacing on display type | 5 | fonts | Display text (≥28px) with letter-spacing ≤ −0.05em |
| `gray_on_color` | Gray text on a colored background | 4 | colors | ≥3 instances of mid-grey text on chromatic (saturated) background |
| `oversized_hero_h1` | Oversized hero headline (long sentence at display size) | 4 | fonts | H1 ≥72px and ≥40 characters |
| `nested_cards` | Cards nested inside cards | 4 | layout | ≥3 innermost card-like elements inside card-like ancestors |
| `wide_body_tracking` | Wide letter-spacing on body text | 3 | fonts | Body copy with letter-spacing > 0.05em (non-uppercase) |
| `flat_type_hierarchy` | Flat type hierarchy (sizes too close together) | 3 | fonts | ≥3 distinct font sizes with max/min ratio < 2.0 |

Definitions version: **2026.09**. Patterns 1–15 from Adrian Krebs's April 2026 study; 16 from Meng To; 17–19 added 2026.07; 20–27 added 2026.08 (ported from Impeccable, Apache-2.0).

## Pattern detail

### slop_fonts (weight 8)

Detects the default AI-builder font stack: Inter, Space Grotesk, Geist, and Instrument Serif used as accent italic. Triggers when the hero H1 uses a slop font, ≥60% of visible text elements use slop fonts, or accent-serif italic appears anywhere. These typefaces dominate Cursor/v0/Lovable output and signal template convergence rather than deliberate brand typography.

### purple_accent (weight 8)

Flags filled indigo/violet CTA buttons — the "VibeCode Purple" tell. Scans visible links and buttons for purple backgrounds, borders, or gradients on non-outline controls. A single filled purple CTA is enough to trigger; outline/ghost buttons are excluded.

### gradient_text (weight 6)

Detects `background-clip: text` (or `-webkit-background-clip`) combined with a CSS gradient on visible text. Hero H1 gradient text is the canonical AI landing-page headline treatment. Any matching element triggers the pattern.

### gradient_backgrounds (weight 4)

Counts visible elements with opaque CSS gradient backgrounds (linear, radial, or conic). Requires ≥5 qualifying elements. Near-transparent gradient stacks are skipped to avoid false positives on subtle overlays.

### accent_stripe (weight 6)

Finds card-sized elements (≥100×60px) with a thick (≥3px) colored top or left border and thin other borders — the "AI em-dash" card accent. Requires ≥2 such cards. Mimics the colored stripe feature-card pattern common in generated UIs.

### glassmorphism (weight 4)

Detects `backdrop-filter: blur()` on elements with translucent backgrounds (alpha 0–0.8). Requires ≥2 instances; a single frosted nav bar is excluded because premium sites use one panel deliberately. The tell is glass used repeatedly across a page.

### colored_glows (weight 4)

Finds large colored box-shadows (blur radius ≥24px) in purple, blue, or other non-grey hues. One glow is sufficient. Matches the soft neon shadow aesthetic common on AI-builder hero sections and cards.

### centered_hero (weight 4)

Triggers when the page H1 is centered (via `text-align`, parent alignment, or geometric centering), at least 28px, and set in a slop font. Combines the generic centered-hero layout with the Inter-style sans stack that AI tools default to.

### hero_eyebrow_pill (weight 5)

Looks for a small rounded pill element within 250px above the H1, horizontally aligned with it, containing launch/beta keywords ("Now in beta", "Introducing", etc.) or sparkle/rocket emoji. Deliberately requires keyword content — rounded nav CTAs alone do not trigger (avoids false positives on sites like linear.app).

### all_caps_labels (weight 3)

Counts short (3–40 char) `text-transform: uppercase` labels with letter-spacing ≥0.5px. Requires ≥2 matches. Section-label typography repeated across a page is a recurring AI template convention.

### perma_dark_mode (weight 4)

Samples page background from `html`, `body`, large wrappers, and viewport center. If the surface is dark, checks paragraph/span text for mid-grey body copy. Triggers on dark bg with ≥30% grey paragraphs, or on very dark pages with ≥5 measured paragraphs. Dark-mode-as-default is itself a strong slop signal.

### icon_card_grid (weight 4)

Groups sibling elements that are card-sized (150–600px wide, 100–600px tall) with a small SVG or image icon in the top 40% of the card. Triggers when any parent group has ≥3 matching siblings — the standard three-column feature grid with icons on top.

### numbered_steps (weight 3)

Finds sibling groups whose text starts with incrementing step numbers (1, 2, 3) or "Step N" prefixes. Requires a run of at least 3 consecutive steps. Matches the "How it works" numbered sequence sections AI builders ship by default.

### stat_banner (weight 3)

Detects clusters of ≥3 large-font (≥28px) numeric tokens matching stat patterns like `10k+`, `99.9%`, `$2M+` aligned on the same row. The social-proof number banner is a near-universal AI landing-page block.

### faq_accordion (weight 2)

Counts `<details>` elements in the lower 60% of the page (≥3), or an FAQ heading plus at least one `<details>`. FAQ accordions in the page footer are a low-weight but common template tell.

### gradient_letter_avatars (weight 5)

Finds small (28–96px) round elements with gradient or solid backgrounds containing 1–3 letter initials and no photo child. Requires ≥2 instances. Testimonial sections with gradient initial avatars instead of real photos are a Meng To–documented AI-builder pattern.

### bento_grid (weight 4)

Inspects CSS `display: grid` containers with ≥2 columns and ≥5 sized children. Requires ≥4 rounded children (border-radius ≥12px) and ≥2 distinct column spans. Distinguishes the Apple-keynote bento wall from uniform icon-card grids.

### aurora_mesh_gradient (weight 5)

Detects large (≥25% viewport width, ≥20% height) radial/conic gradient elements with heavy blur (≥24px) or absolutely positioned orbs. Requires ≥2 blobs. Keys on the v0/Lovable hero backdrop treatment, distinct from counting any gradient background.

### ai_sparkle_badges (weight 3)

Matches sparkle emoji (✨ etc.) in short text nodes, or SVG/class/aria-label references to "sparkles" near AI/magic copy. At least one emoji or sparkles-icon hit required. Labels generative features as "AI magic" — near-universal on AI-builder landings in 2026.

### cream_default_bg (weight 7)

Detects warm off-white page surfaces: light colours (min channel ≥209), warm ordering R≥G≥B, warmth gap 6–48. Checks `body`, `html`, and full-bleed wrappers. The reflexive "tasteful" cream/beige default (~74% prevalence in generated pages per Impeccable data).

### low_contrast_text (weight 7)

Measures body elements (`p`, `li`, `span`, etc.) with ≥20 chars of direct text, font-size <24px, on light backgrounds (luminance ≥0.6). Skips interactive/nav context and strongly coloured text. Triggers when ≥4 blocks fail WCAG AA 4.5:1 contrast and failures are ≥25% of measured body text. Targets washed-out grey-on-white, not generic accessibility failure.

### crushed_tracking (weight 5)

Detects display-size text (≥28px) with em-relative letter-spacing ≤ −0.05. One instance triggers. Display type crushed tighter than −0.04em is deliberate in some brands; ≤ −0.05em is the generated-page tell (~76% prevalence per Impeccable).

### gray_on_color (weight 4)

Finds mid-grey foreground text (neutral, lightness 0.3–0.75) on chromatic backgrounds (channel spread ≥40). Requires ≥3 instances outside interactive elements. Neutral grey on saturated panels reads washed-out — a recurring generated-UI mistake.

### oversized_hero_h1 (weight 4)

Triggers when H1 font-size ≥72px and headline text ≥40 characters. Short punchy headlines at display size are fine; the tell is a long full-sentence headline blown up to dominate the viewport.

### nested_cards (weight 4)

Identifies card-like elements (shadow/border + radius/background, ≥10 chars text) nested inside other card-like ancestors. Counts innermost cards only; skips transformed product-mockup frames. Requires ≥3 nested cards — one nested card is often legitimate.

### wide_body_tracking (weight 3)

Finds body elements (`p`, `li`, `td`, etc.) with ≥40 chars, non-uppercase, letter-spacing > 0.05em relative to font size. One instance triggers. Wide tracking on body copy disrupts reading; it belongs on short uppercase labels only.

### flat_type_hierarchy (weight 3)

Collects distinct font sizes (8–199px) from text-bearing elements. Requires ≥3 sizes with max/min ratio < 2.0. Font sizes too close together produce no clear visual hierarchy — a flat typographic scale common in generated layouts.

## Tier thresholds (design axis)

| Tier | Score range |
|------|-------------|
| Clean | 0–9 |
| Mild | 10–27 |
| Heavy | 28+ |

Score = sum of triggered pattern weights, clamped to 100. Letter grades (A+ through F) are derived from the same scale via `GRADE_BANDS` in `verdict.ts`.