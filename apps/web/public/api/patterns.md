# Slop Detector — Pattern Catalogue

> The deterministic patterns the engine checks. Version 2026.11, live catalogue. Live JSON: https://slop-detect.com/api/patterns

Weight 0 rules stay in the catalogue and add no points (`review` or `retired`). Craft-floor checks never feed Clean, Mild, or Heavy. Leaderboard rows were measured under definitions 2026.10 and are not re-scored here.

## Design (45)

### fonts

| id | label | weight | status |
| --- | --- | --- | --- |
| `slop_fonts` | AI-default font stack (Inter / Geist / Space Grotesk / Instrument Serif) | 8 | decaying |
| `slop_fonts_2026` | Expanded 2026 default font stack (Syne / Fraunces / Outfit / Sora / Playfair / Lora / JetBrains Mono) | 0 | review |
| `all_caps_labels` | All-caps section labels (retired — replaced by eyebrow_label) | 0 | retired |
| `eyebrow_label` | Tracked or uppercase eyebrow labels above ≥60% of section headings | 0 | review |
| `crushed_tracking` | Crushed letter-spacing on display type | 5 | active |
| `oversized_hero_h1` | Oversized hero headline (long sentence at display size) | 4 | active |
| `flat_type_hierarchy` | Flat type hierarchy (sizes too close together) | 3 | active |
| `hero_accent_word` | Single inline accent span/italic/color word inside H1 | 0 | review |
| `display_mono_heading` | Monospace H1/H2 heading at display size (≥24px) outside devtool context | 0 | review |

### colors

| id | label | weight | status |
| --- | --- | --- | --- |
| `purple_accent` | VibeCode Purple — filled indigo/violet CTAs | 4 | decaying |
| `gradient_text` | Hero gradient text (background-clip:text) | 6 | active |
| `gradient_backgrounds` | Gradient-heavy backgrounds (≥15% viewport across ≥2 sections) | 4 | active |
| `perma_dark_mode` | Perma dark mode + medium-grey body text | 4 | active |
| `cream_default_bg` | Cream / beige default page background | 7 | active |
| `low_contrast_text` | Washed-out grey body text (below WCAG AA contrast floor) | 7 | active |
| `editorial_cream_kit` | Warm-editorial cream + serif + terracotta/brass or broadsheet hairline kit | 0 | review |
| `chip_rainbow` | Multi-hue badge/pill/tag rainbow (≥6 chips across ≥4 hues separated by >30°) | 0 | review |

### layout

| id | label | weight | status |
| --- | --- | --- | --- |
| `accent_stripe` | Colored top/left card borders (the AI em-dash) | 6 | active |
| `accent_stripe_2026` | Broadened 2px or bottom colored card borders (D-07) | 0 | review |
| `centered_hero` | Centered hero in generic sans (Inter-style) | 4 | active |
| `hero_eyebrow_pill` | Eyebrow pill above hero ("Now in beta" / "New") | 5 | active |
| `icon_card_grid` | Identical feature cards with icon on top | 4 | active |
| `numbered_steps` | Numbered "1 · 2 · 3" step sequences | 3 | active |
| `stat_banner` | Big-number stat banner ("10k+", "99.9%", "$2M+") | 3 | active |
| `faq_accordion` | FAQ accordion in the lower half | 2 | active |
| `bento_grid` | Bento-grid wall — mixed-span rounded card grid | 4 | active |
| `nested_cards` | Cards nested inside cards | 4 | active |
| `scaffold_defaults_unedited` | Unfinished page — scaffold defaults left unedited | 0 | review |
| `template_chrome_2026` | 2026 template micro-chrome bundle (≥3 of 6 sub-signals) | 0 | review |
| `template_page_order` | Canonical 8-section landing-page sequence order | 0 | review |
| `fake_macos_terminal` | Decorative macOS traffic-light window chrome above a code/text block | 0 | review |
| `section_template_repetition` | Repeated top-level section structural template signature (≥3 identical sections) | 0 | review |

### css

| id | label | weight | status |
| --- | --- | --- | --- |
| `glassmorphism` | Glassmorphism (backdrop-filter blur on translucent layers) | 4 | active |
| `colored_glows` | Big colored box-shadow glows (purple/blue/pink) | 4 | active |
| `aurora_mesh_gradient` | Aurora / mesh gradient blobs (blurred glowing backdrop) | 5 | active |
| `uniform_radius_shadow` | Single border-radius (≥12px) and identical neutral shadow across ≥3 size classes | 0 | review |
| `pulsing_status_badge` | Infinite pulsing "Live / Active / Beta" status dot on marketing copy | 0 | review |
| `infinite_marquee_ticker` | Infinite linear horizontal marquee ticker with duplicated child sequence | 0 | review |
| `fade_up_monoculture` | At-rest fade-up entrance monoculture (≥6 below-fold elements at opacity 0 + translateY) | 0 | review |
| `cursor_spotlight_gradient` | Cursor-tracking radial-gradient spotlight overlay (--mouse-x / --mouse-y) | 0 | review |
| `uniform_card_hover` | Identical transform/box-shadow hover transition tuple across ≥4 cards | 0 | review |
| `unthemed_browser_surfaces` | Dark page missing color-scheme: dark or dynamic counters missing tabular-nums | 0 | review |

### images

| id | label | weight | status |
| --- | --- | --- | --- |
| `gradient_letter_avatars` | Gradient-letter avatars (testimonial slop) | 5 | active |
| `ai_sparkle_badges` | AI-sparkle badges (✨ / Sparkles "magic" tells) | 3 | active |
| `fake_logo_bar` | Placeholder or duplicate-asset logo bar ("Trusted by" generic SVG/text row) | 0 | review |

## Copy (26)

| id | label | weight | status |
| --- | --- | --- | --- |
| `buzzword_density` | AI buzzword density (leverage / seamless / robust / elevate …) | 7 | active |
| `em_dash_overload` | Em-dash overload (— used as the default connective) | 2 | decaying |
| `antithesis_construction` | "It's not just X — it's Y" / "not only … but also" antithesis | 6 | rising |
| `filler_openers` | Generic filler openers ("In today's fast-paced world …") | 5 | decaying |
| `formulaic_closers` | Essay-style closers ("In conclusion", "In summary", "Ultimately") | 4 | historical |
| `rule_of_three` | Rule-of-three adjective tricolons ("fast, reliable, and scalable") | 4 | decaying |
| `whether_youre` | "Whether you're X or Y" audience-spanning construction | 3 | active |
| `unicode_artifacts` | Invisible Unicode or mathematical fake-bold characters in text | 0 | retired |
| `emoji_bullet_headers` | Emoji-prefixed bullet/headers (🚀 ✅ ✨ as list markers) | 3 | active |
| `hidden_tag_characters` | Hidden instruction characters (prompt-injection or smuggling vector) | 0 | review |
| `invisible_characters` | Invisible characters in text (often humanizer or paste residue) | 0 | review |
| `fake_bold_math_alnum` | Mathematical Alphanumeric Symbols used as fake bold/italic in prose | 4 | active |
| `chatbot_markup_leak` | Leaked chatbot citation or internal UI markup (oaicite / attributableIndex /grok-card) | 0 | review |
| `chatbot_reply_residue` | Chatbot turn framing, refusal, or UI Chrome pasted into page copy | 0 | review |
| `ai_referral_utm_links` | Links copied from an AI assistant (utm_source=chatgpt.com / openai / copilot.com) | 0 | review |
| `unfilled_placeholders` | Unfinished copy (unfilled placeholders) | 0 | review |
| `leaked_markdown` | Unrendered raw Markdown syntax in visible non-code text | 0 | review |
| `structural_fake_social_proof` | Placeholder avatar services, duplicated avatar assets, or unattributed testimonials | 0 | review |
| `bare_antithesis` | Bare contrastive frames ("It's not X, it's Y" / "No X, no Y, just Z") | 0 | review |
| `emoji_heading_ratio` | Lead emoji ratio ≥30% across ≥6 headings or list items | 0 | review |
| `announced_structure` | Announced essay structure in opening prose ("In this post, we'll explore …") | 0 | review |
| `restated_thesis_closer` | Closing paragraph restates H1/opening thesis with ≥50% content-word overlap | 0 | review |
| `context_leak_copy` | Context-inappropriate dev/privacy boilerplate ("never leaves your browser") | 0 | review |
| `trailing_participial_clauses` | Trailing participial clauses (", ensuring / unlocking / enabling …") | 0 | review |
| `sentence_length_uniformity` | Paragraph sentence-length dispersion statistics (mean, SD, CV, IQR) | 0 | review |
| `excess_vocabulary_log_odds` | Corpus-derived Fightin' Words excess vocabulary log-odds score | 0 | review |

## AEO (16)

Higher is better. Tiers: Eligible ≥80, Partially Eligible ≥50, Restricted <50. The scanner identifies itself as `SlopDetector-AEO/1.0 (+https://slop-detect.com/bot)` and does not impersonate another crawler.

| id | label | weight | severity |
| --- | --- | --- | --- |
| `html.reachable` | Page is reachable over HTTP (HTML 2xx) | 10 | required |
| `edge.access` | Edge/WAF allows automated retrieval without challenge or block | 20 | required |
| `robots.searchAllowed` | robots.txt permits AI search & citation crawlers (RFC 9309) | 20 | required |
| `html.indexable` | Page is indexable (no global noindex directive) | 12 | required |
| `ai.previewControls` | Snippet & preview controls permit quoting across Google, Bing, and Apple | 8 | required |
| `html.serverTextCoverage` | Server-rendered HTML contains primary page prose without JS | 15 | required |
| `md.twin` | Validated Markdown twin served via negotiation or .md route | 6 | recommended |
| `html.linkAlternate` | HTML advertises a valid Markdown twin (Link rel=alternate) | 3 | recommended |
| `site.llmsTxt` | Valid /llms.txt published at site root (H1 + links, non-HTML) | 2 | recommended |
| `html.vary` | Negotiated responses send Vary: Accept | 4 | recommended |
| `ai.manipulation` | No prompt injection, hidden instructions, or AI manipulation links | 0 | info |
| `agent.operability` | Interactive controls have accessible names and no blocking overlays | 0 | info |
| `agent.discovery` | Agent discovery endpoints (ARD, Agentmap, A2A agent-card, WebMCP) | 0 | info |
| `ai.usagePolicy` | Machine-readable AI usage preferences (AIPREF Content-Usage, Content-Signal, TDMRep) | 0 | info |
| `content.dates` | Publication and modification dates are valid and consistent across signals | 0 | info |
| `jsonld.hygiene` | JSON-LD structured data parses cleanly and matches visible text | 0 | info |

## System (9)

| id | label | weight |
| --- | --- | --- |
| `fonts.declared` | Fonts in use are declared in the system | 25 |
| `colors.cta` | CTA / button colors come from the palette (Oklab ΔE ≤ 0.02) | 20 |
| `colors.surface` | Page surface color comes from the palette (Oklab ΔE ≤ 0.02) | 10 |
| `colors.headings` | Heading colors come from the palette (Oklab ΔE ≤ 0.02) | 10 |
| `radii.scale` | Corner radii across all 4 corners follow the declared scale (±2px) | 10 |
| `spacing.scale` | Rendered spacing values follow the declared spacing scale (±1px) | 10 |
| `typography.scale` | Rendered font sizes follow the declared type scale (±0.5px) | 10 |
| `typography.styles` | Composite typography tuples match declared style definitions | 5 |
| `contrast.componentPairs` | Component foreground/background pairs meet ≥ 4.5:1 WCAG contrast | 0 |

## Craft floor (11)

These checks score a separate craft floor. They do not change the design score, the copy score, or Clean / Mild / Heavy.

| id | label | weight | status |
| --- | --- | --- | --- |
| `gray_on_color` | Neutral grey text on a colored background | 10 | active |
| `wide_body_tracking` | Wide letter-spacing on body text (>0.05em) | 8 | active |
| `viewport_meta_missing` | Missing responsive <meta name="viewport"> with width=device-width | 15 | active |
| `zoom_disabled` | Pinch-to-zoom disabled via user-scalable=no or maximum-scale < 2 | 15 | active |
| `mobile_reflow_failure` | Horizontal overflow, protrusion, or text box collision (RLF taxonomy) | 20 | active |
| `focus_indicator_missing` | Interactive elements missing a visible keyboard focus indicator | 12 | active |
| `content_stuck_hidden` | Page content stuck at opacity 0 or visibility:hidden after load/scroll | 10 | active |
| `dead_cta_controls` | Primary or repeated CTA controls produce no navigation or state change | 10 | active |
| `reduced_motion_ignored` | Continuous decorative animations remain active under prefers-reduced-motion: reduce | 0 | review |
| `generic_control_labels` | Ambiguous generic link/button accessible names ("learn more", "click here") or filename alt text | 10 | active |
| `form_no_failure_feedback` | Form submits empty with no invalid state or visible error feedback | 10 | active |

## Scoring

Design and copy: weighted sum of triggered rules, clamped 0–100. Lower means fewer default-template patterns. Design tiers: Clean 0–9, Mild 10–27, Heavy 28+. Copy tiers: Clean 0–7, Mild 8–19, Heavy 20+.

Full API: https://slop-detect.com/openapi.json
