# Slop Detector — Pattern Catalogue

> The deterministic patterns the engine checks. Version 2026.08, 27 patterns. Live JSON: https://slop-detect.com/api/patterns

## fonts

| id | label | weight | since |
|---|---|---|---|
| `slop_fonts` | AI-default font stack (Inter / Geist / Space Grotesk) | 8 | baseline |
| `all_caps_labels` | All-caps section labels (text-transform:uppercase) | 3 | baseline |
| `crushed_tracking` | Crushed letter-spacing on display type | 5 | 2026.08 |
| `oversized_hero_h1` | Oversized hero headline (long sentence at display size) | 4 | 2026.08 |
| `wide_body_tracking` | Wide letter-spacing on body text | 3 | 2026.08 |
| `flat_type_hierarchy` | Flat type hierarchy (sizes too close together) | 3 | 2026.08 |

## colors

| id | label | weight | since |
|---|---|---|---|
| `purple_accent` | VibeCode Purple — filled indigo/violet CTAs | 8 | baseline |
| `gradient_text` | Hero gradient text (background-clip:text) | 6 | baseline |
| `gradient_backgrounds` | Gradient-heavy backgrounds (5+ elements) | 4 | baseline |
| `perma_dark_mode` | Perma dark mode + medium-grey body text | 4 | baseline |
| `cream_default_bg` | Cream / beige default page background | 7 | 2026.08 |
| `low_contrast_text` | Washed-out grey body text (below WCAG AA on a light background) | 7 | 2026.08 |
| `gray_on_color` | Gray text on a colored background | 4 | 2026.08 |

## layout

| id | label | weight | since |
|---|---|---|---|
| `accent_stripe` | Colored top/left card borders (the AI em-dash) | 6 | baseline |
| `centered_hero` | Centered hero in generic sans (Inter-style) | 4 | baseline |
| `hero_eyebrow_pill` | Eyebrow pill above hero ("Now in beta" / "New") | 5 | baseline |
| `icon_card_grid` | Identical feature cards with icon on top | 4 | baseline |
| `numbered_steps` | Numbered "1 · 2 · 3" step sequences | 3 | baseline |
| `stat_banner` | Big-number stat banner ("10k+", "99.9%", "$2M+") | 3 | baseline |
| `faq_accordion` | FAQ accordion in the lower half | 2 | baseline |
| `bento_grid` | Bento-grid wall — mixed-span rounded card grid | 4 | 2026.07 |
| `nested_cards` | Cards nested inside cards | 4 | 2026.08 |

## css

| id | label | weight | since |
|---|---|---|---|
| `glassmorphism` | Glassmorphism (backdrop-filter blur on translucent layers) | 4 | baseline |
| `colored_glows` | Big colored box-shadow glows (purple/blue/pink) | 4 | baseline |
| `aurora_mesh_gradient` | Aurora / mesh gradient blobs (blurred glowing backdrop) | 5 | 2026.07 |

## images

| id | label | weight | since |
|---|---|---|---|
| `gradient_letter_avatars` | Gradient-letter avatars (testimonial slop) | 5 | baseline |
| `ai_sparkle_badges` | AI-sparkle badges (✨ / Sparkles "magic" tells) | 3 | 2026.07 |

## Scoring

Weighted sum, deterministic. Tiers: Clean 0–9, Mild 10–27, Heavy 28+. Higher = more machine-made.

Full API: https://slop-detect.com/openapi.json
