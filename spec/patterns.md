# Design-slop pattern catalogue

Deterministic patterns evaluated inside headless Chromium. Each pattern returns `{ triggered, status, evidence, weight }`. Active patterns (`status: "fail"`) contribute their weight (adjusted by cross-pattern post-pass rules and clamped 0–100) to produce the design-axis score. Patterns in `review` or `retired` status ship at weight 0 (`status: "review"`) and never add points until promoted through the K-04 calibration gate.

**Tier impact:** each active pattern contributes its **Weight** toward the aggregate tier. Craft-floor checks (`CRAFT_CHECKS`) live in a separate catalogue (`packages/core/src/craft.ts`) and never feed the design score or tier.

## Summary table

| ID | Name | Weight | Category | Detection summary |
|----|------|--------|----------|-------------------|
| `slop_fonts` | AI-default font stack (Inter / Geist / Space Grotesk / Instrument Serif) | 8 | fonts | Hero or ≥60% of visible text uses legacy primary/secondary slop fonts (confirmed via `document.fonts`) |
| `slop_fonts_2026` | Expanded 2026 default font stack (Syne / Fraunces / Outfit / Sora / Playfair / Lora / JetBrains Mono) | 0 | fonts | Hero or ≥45% of visible text uses expanded 2026 default font families (review) |
| `purple_accent` | VibeCode Purple — filled indigo/violet CTAs | 4 | colors | ≥1 filled CTA/button in OKLCH hue 268–310°, C ≥ 0.10, L 0.35–0.80 (co-occurrence gated) |
| `gradient_text` | Hero gradient text (background-clip:text) | 6 | colors | Any element uses `background-clip: text` with a CSS gradient |
| `gradient_backgrounds` | Gradient-heavy backgrounds (area ≥15%, ≥2 sections) | 4 | colors | Gradient elements cover ≥15% of viewport area across ≥2 sections |
| `accent_stripe` | Colored top/left card borders (the AI em-dash) | 6 | layout | ≥2 card-sized elements with ≥3px distinct colored top/left stripe (callouts and uniform borders excluded) |
| `accent_stripe_2026` | Broadened 2px or bottom colored card borders (D-07) | 0 | layout | ≥2 card-sized elements with 2px top/left or ≥2px bottom colored stripe (review) |
| `glassmorphism` | Glassmorphism (backdrop-filter blur on translucent layers) | 4 | css | ≥2 elements with `backdrop-filter: blur()` and translucent background |
| `colored_glows` | Big colored box-shadow glows (purple/blue/pink) | 4 | css | ≥1 element with large (≥24px blur) colored box-shadow |
| `centered_hero` | Centered hero in generic sans (Inter-style) | 4 | layout | H1 centered, ≥28px, in a slop font stack (combined cap ≤8 with `slop_fonts`) |
| `hero_eyebrow_pill` | Eyebrow pill above hero ("Now in beta" / "New") | 5 | layout | Rounded pill above H1 with launch/beta keywords or sparkle/rocket emoji |
| `all_caps_labels` | All-caps section labels (retired — superseded by eyebrow_label) | 0 | fonts | ≥2 short uppercase labels with positive letter-spacing (retired at weight 0) |
| `eyebrow_label` | Uppercase / tracked eyebrow labels above section headings | 0 | fonts | ≥60% of H2/H3 section headings preceded by a small tracked/uppercase eyebrow (review) |
| `perma_dark_mode` | Perma dark mode + medium-grey body text | 4 | colors | Dark page surface with ≥30% mid-grey body paragraphs (or dark with ≥5 paras) |
| `icon_card_grid` | Identical feature cards with icon on top | 4 | layout | ≥3 sibling cards with top-positioned icon (SVG/img) |
| `numbered_steps` | Numbered "1 · 2 · 3" step sequences | 3 | layout | Sibling group contains steps 1, 2, and 3 |
| `stat_banner` | Big-number stat banner ("10k+", "99.9%", "$2M+") | 3 | layout | ≥3 large-font numeric tokens clustered on one row |
| `faq_accordion` | FAQ accordion in the lower half | 2 | layout | ≥3 `<details>` below 40% page height, or FAQ heading + details |
| `gradient_letter_avatars` | Gradient-letter avatars (testimonial slop) | 5 | images | ≥2 round gradient/solid elements with 1–3 letter initials, no photo |
| `bento_grid` | Bento-grid wall — mixed-span rounded card grid | 4 | layout | CSS grid (≥2 cols) with ≥5 sized children, ≥4 rounded (r≥12px), ≥2 distinct column spans |
| `aurora_mesh_gradient` | Aurora / mesh gradient blobs (blurred glowing backdrop) | 5 | css | ≥2 large blurred radial/conic gradient blobs (hero backdrop tell) |
| `ai_sparkle_badges` | AI-sparkle badges (✨ / Sparkles "magic" tells) | 3 | images | Sparkle emoji or Sparkles SVG/icon near AI/magic copy |
| `cream_default_bg` | Cream / beige default page background | 7 | colors | Warm off-white page surface (light, R≥G≥B, warmth gap 6–48) |
| `low_contrast_text` | Washed-out body text (below WCAG AA on light or dark background) | 7 | colors | ≥4 body blocks fail 4.5:1 contrast on light or dark bg, ≥25% of measured text, with APCA Lc note |
| `crushed_tracking` | Crushed letter-spacing on display type | 5 | fonts | Display text (≥28px) with letter-spacing ≤ −0.05em |
| `oversized_hero_h1` | Oversized hero headline (long sentence at display size) | 4 | fonts | H1 ≥72px and ≥40 characters |
| `nested_cards` | Cards nested inside cards | 4 | layout | ≥3 innermost card-like elements inside card-like ancestors |
| `flat_type_hierarchy` | Flat type hierarchy (sizes too close together) | 3 | fonts | ≥3 distinct font sizes with max/min ratio < 2.0 |
| `scaffold_defaults_unedited` | Unedited scaffold defaults (Vite / Next / CRA / Lovable) | 0 | layout | Default scaffold title, boilerplate text, or default favicon left in production (review) |
| `hero_accent_word` | Hero headline with single styled accent span | 0 | fonts | H1 wraps 1–3 words in an inline span with distinct color, italic serif, or gradient (review) |
| `template_chrome_2026` | 2026 template chrome (floating glass nav / avatar stack / 3-tier pricing) | 0 | layout | ≥2 of floating pill glass nav, overlapping avatar stack, or 3-tier middle-highlighted pricing (review) |
| `uniform_radius_shadow` | Uniform card radius and shadow across page | 0 | css | ≥6 card containers share identical border-radius and box-shadow (review) |
| `editorial_cream_kit` | Editorial cream + serif H1 + warm accent co-occurrence kit | 0 | colors | Co-occurrence of warm cream surface, serif display H1, and terracotta/amber/olive accent (review) |
| `template_page_order` | Canonical AI landing page section sequence | 0 | layout | Top-level sections follow ≥5 of Hero → Logo Bar → Features → How It Works → Testimonials → Pricing → FAQ → CTA (review) |
| `pulsing_status_badge` | Pulsing status dot badge above the fold | 0 | css | Small green/amber/purple dot with pulse/ping animation inside a badge (review) |
| `display_mono_heading` | Monospace display heading (H1/H2) | 0 | fonts | H1/H2 set in JetBrains Mono, Fira Code, Geist Mono, or Space Mono outside devtool preset (review) |
| `chip_rainbow` | Multi-hue pastel chip / badge rainbow | 0 | colors | ≥4 sibling badges/pills with ≥4 distinct pastel hues separated by ≥25° in OKLCH (review) |
| `fake_macos_terminal` | Fake macOS traffic-light window chrome | 0 | layout | 3 small red/yellow/green circles (`8–16px`, `border-radius >= 50%`) in top-left of a frame (review) |
| `fake_logo_bar` | Generic / placeholder "Trusted by" logo strip | 0 | images | "Trusted by" strip with ≥4 uniform greyscale/monochrome inline SVG/text logos (review) |
| `infinite_marquee_ticker` | Infinite CSS marquee ticker | 0 | css | Keyframe animation translating horizontally by ~50%/100% with duplicate children (review) |
| `fade_up_monoculture` | Monoculture fade-up entrance animations | 0 | css | ≥6 elements share identical `translateY` + `opacity` entrance transition/animation (review) |
| `cursor_spotlight_gradient` | Mouse-tracking radial spotlight gradient | 0 | css | Radial gradient driven by `--mouse-x`/`--mouse-y` or `--x`/`--y` CSS variables (review) |
| `uniform_card_hover` | Uniform card hover lift across sibling cards | 0 | css | ≥4 sibling cards share identical hover transform/transition rules (review) |
| `section_template_repetition` | Repeated identical section layout templates | 0 | layout | ≥3 consecutive top-level sections share identical child tag signature and column count (review) |
| `unthemed_browser_surfaces` | Dark page with unthemed `color-scheme` or form controls | 0 | css | Dark page surface without `color-scheme: dark` on `:root`/`body` (review) |

Definitions version: **2026.11**.

## Pattern detail

### slop_fonts (weight 8)

Detects the legacy default AI-builder font stack (Inter, Geist, Space Grotesk, Plus Jakarta Sans, DM Sans, General Sans, Satoshi, Cal Sans, Switzer, Clash Display, Manrope, Instrument Serif) and confirms loaded webfont faces via `document.fonts`. Inter or Geist alone, or secondary slop fonts alone, require at least one co-occurring design signal to add points.

### slop_fonts_2026 (weight 0)

Broadened 2026 default font stack rule (`status: "review"`, weight 0 under K-04) covering Syne, Fraunces, Outfit, Sora, Playfair Display, Lora, DM Serif, JetBrains Mono, and Fira Code when confirmed loaded via `document.fonts`.

### purple_accent (weight 4)

Flags filled indigo/violet CTA buttons in OKLCH (`L ∈ [0.35, 0.80]`, `C ≥ 0.10`, `h ∈ [268°, 310°]`), cleanly separating Tailwind `blue-500/600` (`h ≈ 260–263°`) from `indigo-500` (`277°`) and `violet-500` (`293°`). Marked decaying; requires at least one co-occurring design pattern to contribute points.

### gradient_text (weight 6)

Detects `background-clip: text` (or `-webkit-background-clip`) combined with a CSS gradient on visible text.

### gradient_backgrounds (weight 4)

Measures the viewport area covered by opaque CSS gradient backgrounds across sections. Triggers when gradient elements cover ≥15% of the viewport area across ≥2 distinct sections (or conic swirls).

### accent_stripe (weight 6)

Finds card-sized elements (≥100×60px) with a ≥3px colored top or left border stripe distinct from the other card borders, excluding alert/note/status callouts (`role="alert"|"note"|"status"`) and cards whose four borders share one colour.

### accent_stripe_2026 (weight 0)

Broadened card border stripe rule (`status: "review"`, weight 0 under K-04) covering 2px top/left stripes and ≥2px bottom border stripes (`accent_stripe_2026`), with the same callout and uniform-border exclusions.

### glassmorphism (weight 4)

Detects `backdrop-filter: blur()` on elements with translucent backgrounds (alpha 0–0.8). Requires ≥2 instances.

### colored_glows (weight 4)

Finds large colored box-shadows (blur radius ≥24px) in non-grey hues.

### centered_hero (weight 4)

Triggers when the page H1 is centered, at least 28px, and set in a slop font. Combined score contribution with `slop_fonts` is capped at ≤8 points via the `slop_fonts_centered_hero_cap` post-pass rule.

### hero_eyebrow_pill (weight 5)

Looks for a small rounded pill element within 250px above the H1, horizontally aligned with it, containing launch/beta keywords or sparkle/rocket emoji.

### all_caps_labels (weight 0)

Retired rule superseded by `eyebrow_label`. Kept in catalogue at weight 0 (`status: "retired"`) for schema continuity.

### eyebrow_label (weight 0)

Finds small (`≤14px`) uppercase or widely tracked (`≥0.06em`) short labels placed immediately above ≥60% of H2/H3 section headings, excluding buttons and standalone dates. Ships at weight 0 (`status: "review"`) under K-04.

### perma_dark_mode (weight 4)

Samples page background from `html`, `body`, large wrappers, and viewport center. Triggers on dark surfaces with ≥30% mid-grey body paragraphs.

### icon_card_grid (weight 4)

Groups sibling elements that are card-sized with a small SVG or image icon in the top 40% of the card. Triggers when any parent group has ≥3 matching siblings.

### numbered_steps (weight 3)

Finds sibling groups whose text starts with incrementing step numbers (1, 2, 3) or "Step N" prefixes. Emits `nodeIds` for cross-pattern overlap deduplication.

### stat_banner (weight 3)

Detects clusters of ≥3 large-font (≥28px) numeric tokens matching stat patterns like `10k+`, `99.9%`, `$2M+` aligned on the same row.

### faq_accordion (weight 2)

Counts `<details>` elements in the lower 60% of the page (≥3), or an FAQ heading plus at least one `<details>`.

### gradient_letter_avatars (weight 5)

Finds small (28–96px) round elements with gradient or solid backgrounds containing 1–3 letter initials and no photo child. Requires ≥2 instances.

### bento_grid (weight 4)

Inspects CSS `display: grid` containers with ≥2 columns and ≥5 sized children. Requires ≥4 rounded children (border-radius ≥12px) and ≥2 distinct column spans.

### aurora_mesh_gradient (weight 5)

Detects large radial/conic gradient elements with heavy blur (≥24px) or absolutely positioned orbs. Requires ≥2 blobs.

### ai_sparkle_badges (weight 3)

Matches sparkle emoji (✨ etc.) in short text nodes, or SVG/class/aria-label references to "sparkles" near AI/magic copy.

### cream_default_bg (weight 7)

Detects warm off-white page surfaces: light colours (min channel ≥209), warm ordering R≥G≥B, warmth gap 6–48.

### low_contrast_text (weight 7)

Measures body elements (`p`, `li`, `span`, etc.) with ≥20 chars of direct text, font-size <24px, on both light backgrounds (luminance ≥0.6) and dark backgrounds (luminance ≤0.18). Triggers when ≥4 blocks fail WCAG AA 4.5:1 contrast and failures are ≥25% of measured body text. Records informational APCA Lc values (`apcaLc`, `apcaNote`) alongside WCAG contrast.

### crushed_tracking (weight 5)

Detects display-size text (≥28px) with em-relative letter-spacing ≤ −0.05.

### oversized_hero_h1 (weight 4)

Triggers when H1 font-size ≥72px and headline text ≥40 characters.

### nested_cards (weight 4)

Identifies card-like elements nested inside other card-like ancestors. Requires ≥3 innermost nested cards.

### flat_type_hierarchy (weight 3)

Collects distinct font sizes (8–199px) from text-bearing elements. Requires ≥3 sizes with max/min ratio < 2.0.

### scaffold_defaults_unedited (weight 0)

Detects unedited framework/builder scaffold defaults left in production (`Vite + React`, `Create Next App`, `Edit src/App.tsx and save to reload`, default Vite/Lovable favicons). Ships in `review` at weight 0.

### hero_accent_word (weight 0)

Detects H1 headlines that wrap 1–3 words in an inline `<span>`/`<em>` with a different color, italic serif font, or gradient text clip. Ships in `review` at weight 0.

### template_chrome_2026 (weight 0)

Detects co-occurrence of ≥2 of 3 2026 template chrome patterns: (1) floating centered rounded glass navbar, (2) overlapping circular avatar stack with social-proof rating text, (3) 3-column pricing grid with a highlighted middle "Most Popular" card. Ships in `review` at weight 0.

### uniform_radius_shadow (weight 0)

Detects when ≥6 card containers across ≥2 sections share the exact same non-zero `border-radius` and `box-shadow` signature (monotony ≥85%). Ships in `review` at weight 0.

### editorial_cream_kit (weight 0)

Detects the co-occurring editorial kit: warm cream page surface (`cream_default_bg`), serif display H1, and warm terracotta/amber/olive CTA or accent colour. Excluded under the `editorial` preset. Ships in `review` at weight 0.

### template_page_order (weight 0)

Classifies top-level sections into canonical landing archetypes (`hero`, `logos`, `features`, `steps`, `testimonials`, `pricing`, `faq`, `cta`) and triggers when ≥5 appear in strictly increasing canonical order. Ships in `review` at weight 0.

### pulsing_status_badge (weight 0)

Detects small (`4–16px`) circular green/amber/purple status dots with a `pulse`/`ping` animation inside a pill/badge above the fold. Ships in `review` at weight 0.

### display_mono_heading (weight 0)

Detects H1/H2 display headings (`≥28px`) set in a monospace typeface (`JetBrains Mono`, `Fira Code`, `Geist Mono`, `Space Mono`, `IBM Plex Mono`). Excluded under the `devtool` preset. Ships in `review` at weight 0.

### chip_rainbow (weight 0)

Detects groups of ≥4 small badge/chip elements whose background or text colours span ≥4 distinct pastel hues separated by ≥25° in OKLCH. Ships in `review` at weight 0.

### fake_macos_terminal (weight 0)

Detects decorative macOS window headers composed of 3 small circular dots (`4–18px`, `border-radius >= 50%`) painted in red, yellow, and green aligned on a horizontal row. Ships in `review` at weight 0.

### fake_logo_bar (weight 0)

Detects "Trusted by / Backed by" logo strips containing ≥4 uniform greyscale/monochrome inline SVG or placeholder company logos. Emits `nodeIds` for overlap deduplication. Ships in `review` at weight 0.

### infinite_marquee_ticker (weight 0)

Detects horizontal ticker containers using infinite CSS `@keyframes` marquee animations or duplicated child runs inside an `overflow-x: hidden` track. Ships in `review` at weight 0.

### fade_up_monoculture (weight 0)

Detects when ≥6 visible elements share identical `fade-up` entrance animation names or `transform`/`opacity` transition durations. Ships in `review` at weight 0.

### cursor_spotlight_gradient (weight 0)

Detects interactive cursor-following radial spotlight overlays driven by `--mouse-x`/`--mouse-y` or `--spotlight-x`/`--spotlight-y` CSS custom properties. Ships in `review` at weight 0.

### uniform_card_hover (weight 0)

Detects groups of ≥4 sibling cards sharing identical hover transition/transform declarations. Ships in `review` at weight 0.

### section_template_repetition (weight 0)

Detects ≥3 consecutive top-level sections with the exact same structural child-tag signature and grid column count. Ships in `review` at weight 0.

### unthemed_browser_surfaces (weight 0)

Detects dark-themed pages that omit `color-scheme: dark` on `html`/`body`, leaving native scrollbars, form inputs, and selection highlights in default light browser chrome. Ships in `review` at weight 0.

## Tier thresholds (design axis)

| Tier | Score range |
|------|-------------|
| Clean | 0–9 |
| Mild | 10–27 |
| Heavy | 28+ |

Score = sum of active triggered pattern weights after cross-pattern post-pass adjustments, clamped to 100. Letter grades (A+ through F) are derived from the same scale via `GRADE_BANDS` in `verdict.ts`.

## Crosswalk to External Rule Sets (K-08)

The table below maps every design pattern (`PATTERNS`), copy pattern (`COPY_PATTERNS`), and craft-floor check (`CRAFT_CHECKS`) to its closest equivalent in Adrian Krebs' field taxonomy (`krebs-2025`), Paul Bakaus' Impeccable (`impeccable`), yetone's `kill-ai-slop`, Gesso's `@gessobuild/anti-slop` (`gesso`), and Anthropic's `frontend-design` / Opus 5.5 prompting guide, or marks the rule `unique` where only Slop Detector evaluates it. External visual reference: [febbhav/signs-of-ai-design](https://github.com/febbhav/signs-of-ai-design) (CC BY-SA 4.0).

| Axis | Rule ID | Krebs (`krebs-2025`) | Impeccable (`impeccable`) | `kill-ai-slop` | Gesso (`gesso`) | Anthropic `frontend-design` |
|------|---------|----------------------|---------------------------|----------------|-----------------|-----------------------------|
| design | `slop_fonts` | `inter-geist-default-sans` | `reflex-fonts` | `ai-font-stack` | `font-family-default` | `avoid-inter-roboto-arial` |
| design | `slop_fonts_2026` | `instrument-serif-editorial` | `2026-editorial-reflex-fonts` | `syne-outfit-sora-stack` | `font-family-2026` | `avoid-playfair-fraunces-reflex` |
| design | `purple_accent` | `vibecode-purple-cta` | `purple-indigo-gradient` | `indigo-violet-accent` | `color-indigo-violet` | `purple-gradient-on-white` |
| design | `gradient_text` | `hero-gradient-text-clip` | `gradient-text-heading` | `bg-clip-text-gradient` | `text-gradient-clip` | `gradient-text-headline` |
| design | `gradient_backgrounds` | `gradient-wash-sections` | `gratuitous-gradient-bg` | `multi-section-gradient` | `bg-gradient-excess` | `purple-gradient-surface` |
| design | `accent_stripe` | `colored-card-border-stripe` | `card-left-top-accent-border` | `border-l-4-accent-card` | `card-accent-border` | `unique` |
| design | `accent_stripe_2026` | `colored-card-border-stripe` | `card-border-accent-2px` | `border-b-accent-card` | `card-accent-border-thin` | `unique` |
| design | `glassmorphism` | `glassmorphism-cards` | `backdrop-blur-overuse` | `backdrop-blur-translucent` | `glassmorphism-layer` | `glassmorphism-chrome` |
| design | `colored_glows` | `neon-colored-box-shadow` | `colored-glow-shadow` | `shadow-indigo-glow` | `box-shadow-colored-glow` | `glowing-accent-shadow` |
| design | `centered_hero` | `centered-sans-hero` | `centered-hero-stack` | `centered-hero-layout` | `hero-centered-generic` | `predictable-centered-hero` |
| design | `hero_eyebrow_pill` | `beta-announcement-pill` | `hero-announcement-badge` | `eyebrow-pill-badge` | `hero-pill-badge` | `pill-badge-above-h1` |
| design | `all_caps_labels` | `uppercase-tracked-eyebrow` | `all-caps-section-kicker` | `uppercase-tracking-widest` | `label-uppercase-tracked` | `mono-uppercase-labels` |
| design | `eyebrow_label` | `uppercase-tracked-eyebrow` | `section-eyebrow-kicker` | `eyebrow-heading-prefix` | `section-eyebrow-ratio` | `small-mono-section-labels` |
| design | `perma_dark_mode` | `slate-950-dark-mode` | `default-dark-slate-grey` | `dark-bg-muted-text` | `dark-surface-mid-grey` | `dark-mode-neon-accents` |
| design | `icon_card_grid` | `three-up-icon-cards` | `icon-in-circle-card-grid` | `lucide-icon-feature-grid` | `feature-grid-icon-top` | `three-column-icon-cards` |
| design | `numbered_steps` | `numbered-1-2-3-steps` | `how-it-works-123` | `step-1-2-3-sequence` | `numbered-step-cards` | `numbered-01-02-03-labels` |
| design | `stat_banner` | `vanity-stat-row` | `three-up-stat-strip` | `big-number-stat-bar` | `stat-counter-row` | `metrics-strip-banner` |
| design | `faq_accordion` | `unique` | `boilerplate-faq-accordion` | `bottom-faq-accordion` | `faq-details-stack` | `template-faq-section` |
| design | `gradient_letter_avatars` | `unique` | `initials-avatar-circle` | `gradient-initial-avatar` | `avatar-letter-circle` | `unique` |
| design | `bento_grid` | `bento-grid-cards` | `bento-box-feature-wall` | `bento-grid-spans` | `grid-bento-rounded` | `bento-grid-layout` |
| design | `aurora_mesh_gradient` | `blurred-gradient-blobs` | `aurora-blob-backdrop` | `blur-3xl-gradient-orb` | `backdrop-aurora-orb` | `mesh-gradient-blobs` |
| design | `ai_sparkle_badges` | `sparkle-emoji-ai-badge` | `sparkle-icon-magic` | `sparkles-lucide-badge` | `icon-sparkle-ai` | `sparkle-badge-tell` |
| design | `cream_default_bg` | `warm-cream-editorial-bg` | `editorial-cream-surface` | `bg-faf8f5-cream` | `surface-warm-cream` | `opus-55-cream-ground` |
| design | `low_contrast_text` | `washed-out-muted-copy` | `low-contrast-grey-body` | `text-slate-400-low-contrast` | `contrast-aa-body-fail` | `unique` |
| design | `crushed_tracking` | `tight-display-tracking` | `crushed-heading-tracking` | `tracking-tighter-display` | `letter-spacing-crushed` | `unique` |
| design | `oversized_hero_h1` | `giant-hero-sentence` | `oversized-display-h1` | `text-7xl-long-headline` | `h1-oversized-long` | `unique` |
| design | `nested_cards` | `card-inside-card` | `nested-card-containers` | `card-in-card-nesting` | `container-nested-cards` | `nested-card-boxes` |
| design | `flat_type_hierarchy` | `compressed-type-scale` | `flat-typographic-scale` | `uniform-font-size-scale` | `type-scale-ratio-low` | `weak-typographic-hierarchy` |
| design | `scaffold_defaults_unedited` | `unique` | `unedited-framework-scaffold` | `vite-next-default-title` | `scaffold-boilerplate-left` | `unique` |
| design | `hero_accent_word` | `serif-italic-accent-word` | `single-word-headline-accent` | `h1-span-gradient-italic` | `hero-inline-accent-span` | `opus-55-italic-accent-word` |
| design | `template_chrome_2026` | `floating-pill-navbar` | `2026-saas-template-chrome` | `floating-nav-pricing-stack` | `chrome-pill-nav-3tier` | `opus-55-pill-buttons-mono` |
| design | `uniform_radius_shadow` | `identical-card-radius-shadow` | `monotonous-card-elevation` | `rounded-xl-shadow-sm-all` | `card-radius-shadow-uniform` | `uniform-rounded-cards` |
| design | `editorial_cream_kit` | `cream-serif-terracotta-kit` | `warm-editorial-2026-kit` | `cream-serif-warm-accent` | `kit-editorial-cream-serif` | `opus-55-default-kit` |
| design | `template_page_order` | `canonical-saas-page-flow` | `predictable-section-sequence` | `hero-logos-features-pricing-faq` | `section-order-canonical` | `cookie-cutter-page-order` |
| design | `pulsing_status_badge` | `pulsing-green-status-dot` | `animate-ping-status-pill` | `ping-dot-hero-badge` | `badge-pulsing-dot` | `unique` |
| design | `display_mono_heading` | `monospace-display-h1` | `mono-heading-reflex` | `font-mono-display-heading` | `heading-monospace-face` | `opus-55-monospace-labels` |
| design | `chip_rainbow` | `pastel-badge-rainbow` | `multi-hue-category-pills` | `pastel-chip-rainbow` | `badge-pastel-hue-spread` | `unique` |
| design | `fake_macos_terminal` | `macos-traffic-light-chrome` | `decorative-window-dots` | `red-yellow-green-window-dots` | `window-chrome-traffic-lights` | `unique` |
| design | `fake_logo_bar` | `placeholder-trusted-by-strip` | `generic-monochrome-logo-bar` | `trusted-by-placeholder-logos` | `logo-strip-placeholder` | `unique` |
| design | `infinite_marquee_ticker` | `infinite-marquee-strip` | `continuous-ticker-animation` | `animate-marquee-duplicate` | `marquee-infinite-scroll` | `unique` |
| design | `fade_up_monoculture` | `uniform-fade-up-reveal` | `monoculture-scroll-fade-up` | `translate-y-opacity-reveal` | `animation-fade-up-uniform` | `predictable-fade-up-motion` |
| design | `cursor_spotlight_gradient` | `mouse-radial-spotlight` | `cursor-tracking-glow-card` | `mouse-x-y-radial-gradient` | `spotlight-cursor-vars` | `unique` |
| design | `uniform_card_hover` | `hover-translate-y-cards` | `identical-card-hover-lift` | `hover-translate-y-1-all` | `card-hover-lift-uniform` | `unique` |
| design | `section_template_repetition` | `repeated-section-skeleton` | `monotonous-section-rhythm` | `identical-section-grid` | `section-dom-signature-repeat` | `repetitive-section-layout` |
| design | `unthemed_browser_surfaces` | `missing-color-scheme-dark` | `unthemed-dark-scrollbars` | `dark-without-color-scheme` | `color-scheme-dark-missing` | `unique` |
| copy | `buzzword_density` | `llm-buzzword-lexicon` | `ai-slop-vocabulary` | `delve-tapestry-seamless` | `copy-buzzword-density` | `unique` |
| copy | `em_dash_overload` | `em-dash-connective-overuse` | `em-dash-saturation` | `em-dash-frequency` | `copy-em-dash-density` | `unique` |
| copy | `antithesis_construction` | `not-just-x-its-y` | `contrastive-antithesis-frame` | `not-just-but-also` | `copy-antithesis-frame` | `unique` |
| copy | `bare_antithesis` | `bare-not-x-its-y` | `staccato-contrast-frame` | `no-x-no-y-just-z` | `copy-bare-antithesis` | `unique` |
| copy | `filler_openers` | `in-todays-fast-paced-world` | `throat-clearing-opener` | `generic-opening-cliche` | `copy-filler-opener` | `unique` |
| copy | `formulaic_closers` | `in-conclusion-summary` | `formulaic-sign-off` | `in-conclusion-ultimately` | `copy-formulaic-closer` | `unique` |
| copy | `rule_of_three` | `adjective-tricolon-lists` | `rule-of-three-cadence` | `tricolon-adjective-triplet` | `copy-tricolon-density` | `unique` |
| copy | `whether_youre` | `whether-youre-x-or-y` | `audience-spanning-whether` | `whether-youre-a-or-b` | `copy-whether-youre` | `unique` |
| copy | `unicode_artifacts` | `unique` | `unicode-paste-artifacts` | `zero-width-unicode-tells` | `copy-unicode-legacy` | `unique` |
| copy | `hidden_tag_characters` | `unique` | `unique` | `unicode-tag-smuggling` | `copy-unicode-tags` | `unique` |
| copy | `invisible_characters` | `unique` | `zero-width-space-residue` | `zwsp-zwnj-in-word` | `copy-invisible-chars` | `unique` |
| copy | `fake_bold_math_alnum` | `unique` | `unicode-math-bold-prose` | `math-alphanumeric-fake-bold` | `copy-math-bold` | `unique` |
| copy | `emoji_bullet_headers` | `rocket-sparkle-bullet-list` | `emoji-prefixed-headings` | `emoji-list-markers` | `copy-emoji-bullets` | `unique` |
| copy | `emoji_heading_ratio` | `emoji-heading-saturation` | `emoji-heading-overuse` | `heading-lead-emoji-ratio` | `copy-emoji-heading-ratio` | `unique` |
| copy | `chatbot_markup_leak` | `unique` | `leaked-citation-tokens` | `oaicite-turn0search-leak` | `copy-chatbot-citation-leak` | `unique` |
| copy | `chatbot_reply_residue` | `certainly-heres-your-copy` | `conversational-wrapper-leak` | `as-an-ai-hope-this-helps` | `copy-chatbot-turn-residue` | `unique` |
| copy | `ai_referral_utm_links` | `unique` | `utm-source-chatgpt-links` | `ai-referral-utm-query` | `copy-utm-chatgpt` | `unique` |
| copy | `unfilled_placeholders` | `unique` | `unfilled-bracket-placeholder` | `insert-company-name-token` | `copy-template-placeholder` | `unique` |
| copy | `leaked_markdown` | `unique` | `unrendered-markdown-syntax` | `raw-double-asterisk-bold` | `copy-raw-markdown` | `unique` |
| copy | `structural_fake_social_proof` | `fake-testimonial-cards` | `unverified-social-proof` | `pravatar-dicebear-testimonials` | `social-proof-placeholder` | `unique` |
| copy | `announced_structure` | `unique` | `meta-structural-signposting` | `in-this-article-we-will` | `copy-announced-structure` | `unique` |
| copy | `restated_thesis_closer` | `unique` | `repetitive-summary-closer` | `restated-opening-thesis` | `copy-restated-thesis` | `unique` |
| copy | `context_leak_copy` | `never-leaves-your-browser` | `prompt-context-bleed` | `built-with-written-in-tells` | `copy-context-leak` | `unique` |
| copy | `trailing_participial_clauses` | `comma-ensuring-unlocking` | `trailing-ing-participle` | `participial-tail-clause` | `copy-participial-clause` | `unique` |
| copy | `sentence_length_uniformity` | `flat-sentence-rhythm` | `low-burstiness-cadence` | `uniform-sentence-length` | `copy-sentence-cv` | `unique` |
| copy | `excess_vocabulary_log_odds` | `unique` | `unique` | `unique` | `unique` | `unique` |
| craft | `gray_on_color` | `grey-text-on-colored-fill` | `muddy-grey-on-color` | `neutral-grey-on-tinted-bg` | `contrast-grey-on-color` | `unique` |
| craft | `wide_body_tracking` | `tracked-out-body-copy` | `wide-body-letter-spacing` | `body-tracking-wide` | `typography-body-tracking` | `unique` |
| craft | `viewport_meta_missing` | `unique` | `missing-viewport-meta` | `unique` | `viewport-meta-present` | `unique` |
| craft | `zoom_disabled` | `unique` | `disabled-pinch-zoom` | `user-scalable-no` | `viewport-zoom-enabled` | `unique` |
| craft | `mobile_reflow_failure` | `unique` | `horizontal-scroll-overflow` | `mobile-overflow-collision` | `responsive-reflow-390` | `unique` |
| craft | `focus_indicator_missing` | `unique` | `missing-focus-visible-ring` | `focus-outline-none-unreplaced` | `a11y-focus-indicator` | `unique` |
| craft | `content_stuck_hidden` | `unique` | `broken-scroll-reveal-opacity` | `opacity-0-stuck-visible` | `motion-stuck-hidden` | `unique` |
| craft | `dead_cta_controls` | `dead-href-hash-buttons` | `non-functional-cta-links` | `href-hash-dead-button` | `interactive-dead-cta` | `unique` |
| craft | `reduced_motion_ignored` | `unique` | `missing-reduced-motion-query` | `infinite-anim-no-reduced-motion` | `motion-prefers-reduced` | `unique` |
| craft | `generic_control_labels` | `unique` | `ambiguous-link-text` | `click-here-learn-more-links` | `a11y-generic-control-name` | `unique` |
| craft | `form_no_failure_feedback` | `unique` | `silent-empty-form-submit` | `unique` | `form-error-feedback` | `unique` |

