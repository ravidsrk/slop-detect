// Fix recipes — one per pattern. Loaded by both the Pages Function (for the
// /api/fix-prompt endpoint) and the frontend (for the "Copy fix prompt"
// button). Written as opinionated designer-grade remediation, not generic
// advice. Goal: paste the assembled prompt into Claude/Cursor/v0 and have it
// produce a measurably less-sloppy page on the next scan.

export const FIXES = {
  slop_fonts: {
    problem:
      'Inter, Geist, Space Grotesk, and Instrument Serif are the four default fonts modern page templates converge on. Shipping them unexamined blends the page into thousands of identical starter kits.',
    fix: "Replace the body and heading typefaces with choices anchored to your brand. Pick a distinct foundry sans (Söhne, Aeonik, GT America, Untitled Sans, Suisse Int'l, Public Sans, IBM Plex Sans, Libre Franklin) or a crisp system stack (`-apple-system, BlinkMacSystemFont, Segoe UI`) paired with an intentional display face for H1.",
    alternatives: [
      'Editorial: Newsreader or Tiempos display + Libre Franklin or Söhne body',
      'Modern brand: Aeonik / GT America / Public Sans / IBM Plex Sans',
      'System-only: -apple-system with deliberate weight and size contrast',
      'Distinct display H1 (e.g. Newsreader, Migra, Reckless) + neutral non-default body',
    ],
    rule: 'Do not default to Inter, Geist, Space Grotesk, or Instrument Serif without declaring them intentionally in DESIGN.md.',
  },

  purple_accent: {
    problem:
      "Tailwind's `indigo-600` (#6366f1) and `violet-500` (#8b5cf6) are the default primary CTA colors across modern starter kits. Saturated purple/indigo CTAs in OKLCH hue 268–310° (L 0.35–0.80, C ≥ 0.10) match that template default.",
    fix: 'Pick a primary accent anchored to your actual brand rather than default indigo/violet. Avoid OKLCH hue 268–310° for filled CTAs unless declared in DESIGN.md. High-contrast ink neutrals (near-black on crisp white/cool-paper, or off-white on dark) or a deliberate brand color (forest green, vermilion, cobalt blue outside 268–310°) reset the palette immediately.',
    alternatives: [
      'Carbon ink CTA (#181815) on crisp cool paper (#F4F5F2) or white (#FFFFFF)',
      'Signal vermilion / orange-red accent on neutral surface',
      'Deep calibration green (#1FA85E / #15803D) with WCAG AA text contrast',
      'High-contrast off-white CTA on a verified dark surface',
      'Your existing brand color, explicitly declared in DESIGN.md',
    ],
    rule: 'No #6366f1, #8b5cf6, or saturated OKLCH hue 268–310° on filled CTAs unless declared in DESIGN.md.',
  },

  gradient_text: {
    problem:
      'Hero H1 with `background-clip: text` + linear gradient is one of the most repeated hero defaults in starter templates, and it lowers contrast across varied backgrounds.',
    fix: 'Replace the gradient fill with a single solid high-contrast color. If you need emphasis inside the headline, use weight contrast (400 + 700), color one word in your brand accent, or add a crisp hairline/mark.',
    alternatives: [
      'Solid high-contrast H1 — most strong headlines need no effect at all',
      'Solid H1 with weight contrast inside the headline',
      'Solid H1 with one phrase in your solid brand accent color',
      'Solid H1 with a clean underline or rule below the key term',
    ],
    rule: 'No `background-clip: text` gradient fills on headings.',
  },

  gradient_backgrounds: {
    problem:
      'Gradient backgrounds covering ≥15% of the viewport across ≥2 sections create decorative glow wash and match common default-template chrome.',
    fix: 'Replace decorative gradients with solid color blocks, crisp hairline dividers, real product UI screenshots, or intentional negative space. Keep any structural gradient confined to a single low-area surface.',
    alternatives: [
      'Solid section backgrounds with clear contrast and 1px hairline dividers',
      'One real product screenshot or interactive specimen as the hero visual',
      'Intentional negative space — let typography and one artifact carry the page',
      'Flat brand-tinted section bands using declared palette tokens',
    ],
    rule: 'Keep opaque gradient background area below 15% of the viewport and avoid spreading gradients across multiple sections.',
  },

  accent_stripe: {
    problem:
      'Cards with a thick colored top or left border (≥3px on one side) are a heavily repeated starter-kit card convention.',
    fix: 'Remove the decorative thick single-side border. Differentiate cards through type hierarchy, real imagery, subtle background tint, or uniform 1px hairline borders — or replace the card grid with a comparison table or annotated screenshot.',
    alternatives: [
      'No stripe, no heavy border — just type hierarchy and spacing',
      'Uniform 1px hairline border on all four sides (8–12% ink opacity)',
      'Subtle flat background tint per surface level',
      'Replace the card grid with a comparison table or real UI screenshot',
    ],
    rule: 'No thick single-side colored borders (border-top / border-left ≥3px) on decorative cards (semantic role="alert"/"note" callouts excluded).',
  },

  glassmorphism: {
    problem:
      '`backdrop-filter: blur()` on translucent layers blurs underlying content, lowers legibility, and matches default starter-kit card chrome.',
    fix: 'Remove `backdrop-filter: blur()` from cards and panels. Use opaque surfaces with strong contrast and crisp hairline borders.',
    alternatives: [
      'Opaque cards with clear type hierarchy',
      'Flat surface separation with 1px hairline borders',
      'Subtle neutral shadow (0 1px 2px rgba(0,0,0,0.05)) only where elevation matters',
      'No panel chrome at all — flat sections separated by generous spacing',
    ],
    rule: 'No `backdrop-filter: blur()` on translucent cards or panels.',
  },

  colored_glows: {
    problem:
      'Large saturated `box-shadow` glows (≥24px blur) under buttons, cards, or hero containers add visual haze without improving hierarchy.',
    fix: 'Remove colored glows entirely. Use flat borders or subtle neutral grey elevation (≤8% opacity) at most. Replace hero glow backdrops with real product UI.',
    alternatives: [
      'No box-shadow at all — rely on 1px borders and surface contrast',
      'Neutral grey elevation at ≤8% opacity',
      'Replace glow-behind-hero with a real product screenshot or live demo',
    ],
    rule: 'No box-shadow blur ≥24px with a saturated color. Keep shadows neutral grey and restrained.',
  },

  centered_hero: {
    problem:
      'A centered hero stack set in a default sans font is the standard landing-page starter layout.',
    fix: 'Switch to a left-aligned asymmetric layout: hero copy on the left (40–55% width) paired with a live product UI, specimen, or real screenshot on the right — or a sharp editorial layout with an intentionally chosen non-default typeface.',
    alternatives: [
      'Left-aligned text + live interactive tool or real product screenshot on the right',
      'Editorial asymmetric grid: large display H1 left, supporting proof right',
      'Two-column split with real code/UI artifact above the fold',
    ],
    rule: 'Avoid centered hero H1 + subhead + CTA stacks paired with default sans fonts.',
  },

  hero_eyebrow_pill: {
    problem:
      'A rounded pill (`border-radius >= 999px`) above the H1 ("Now in beta", "New: v2") is a common starter-template ornament.',
    fix: 'Remove the decorative pill if there is no specific dated milestone. If you have real dated news, place it in plain inline text, a flat rectangular badge, or a single text link below the primary CTA.',
    alternatives: [
      'Delete the pill above the H1',
      'Include concrete scope directly in the H1 or subhead',
      'Use a single plain text link below the CTA for a dated release note',
      'If a status label is needed, use plain monospace text without pill chrome',
    ],
    rule: 'No decorative full-pill (border-radius ≥ 999px) badge above the H1.',
  },

  all_caps_labels: {
    problem:
      'Repeated UPPERCASE section labels with wide positive letter-spacing clutter the page without adding real hierarchy.',
    fix: 'Use sentence-case headings and let H2 carry the section directly. If a small kicker is genuinely helpful, keep it sentence-case with normal tracking.',
    alternatives: [
      'Delete all-caps section labels and let the H2 lead',
      "Use a concise sentence-case sub-label ('How checks run')",
      'Use a clean monospace label in sentence case without wide tracking',
    ],
    rule: 'No repeated `text-transform: uppercase` labels with positive letter-spacing.',
  },

  eyebrow_label: {
    problem:
      'Small uppercase or widely tracked eyebrow labels placed directly above ≥60% of H2/H3 section headings add repetitive scaffold chrome without hierarchy.',
    fix: 'Remove repetitive section eyebrows and let the H2/H3 heading carry each section. If a label is needed on one key section, keep it sentence-case with normal tracking.',
    alternatives: [
      'Delete eyebrows above section headings and let H2 carry the hierarchy',
      'Keep labels sentence-case without wide letter-spacing on at most one section',
      'Differentiate sections through layout and spacing instead of repeated kickers',
    ],
    rule: 'Do not place tracked or uppercase eyebrow labels above ≥60% of section headings.',
  },

  perma_dark_mode: {
    problem:
      'A dark page background paired with mid-grey body text (≥30% of paragraphs in mid-grey) degrades reading contrast and matches generic dark-mode starter kits.',
    fix: 'Either switch to a crisp light palette (white `#FFFFFF` or cool paper `#F4F5F2` with `#181815` ink), or if dark mode is deliberate, declare it in DESIGN.md and raise body text contrast to ≥`#D4D4D8` (WCAG AA ≥4.5:1).',
    alternatives: [
      'Light mode: crisp #FFFFFF or cool #F4F5F2 paper surface with #181815 carbon ink',
      'High-contrast dark mode: dark surface + #E4E4E7 body text (declared in DESIGN.md)',
      'Honor `prefers-color-scheme` and ship both verified themes',
    ],
    rule: 'On dark surfaces, keep body text contrast ≥4.5:1 (avoid mid-grey paragraphs) and declare dark surfaces explicitly in DESIGN.md.',
  },

  icon_card_grid: {
    problem:
      'Three or more identical feature cards, each with a small icon on top, a short title, and a one-sentence blurb, is the single most repeated default-template section.',
    fix: 'Replace the uniform icon-card grid with real product evidence: an annotated screenshot with callouts, a compact comparison table, a live interactive demo, or an asymmetric vertical list pairing each capability with actual UI/output.',
    alternatives: [
      'One annotated product screenshot with numbered callouts',
      'A crisp data/comparison table (features, outputs, guarantees)',
      'Alternating vertical rows: explanation on one side, real output or code on the other',
      'A flat typographic list with 1px hairline rules instead of boxed icon tiles',
    ],
    rule: 'No grid of ≥3 identical sibling cards each topped with a decorative icon.',
  },

  numbered_steps: {
    problem:
      'Numbered 1·2·3 "How it works" sections with generic verbs ("Sign up / Connect / Launch") occupy space without showing real product behavior.',
    fix: 'Show the actual workflow using real UI, concrete CLI commands, or a real input→output specimen. If steps are required, attach real code or screenshots to each step and drop generic placeholder verbs.',
    alternatives: [
      'Show the real command and its exact output side-by-side',
      'One annotated screenshot or short demo showing the actual flow',
      'Skip the generic 1-2-3 section entirely and link straight to docs or a live sandbox',
    ],
    rule: 'No generic numbered 1-2-3 steps section with placeholder verbs.',
  },

  stat_banner: {
    problem:
      'Rows of unverified oversized vanity stats ("10k+ users", "99.9% uptime") read as placeholder marketing when not tied to named, checkable sources.',
    fix: 'Replace unverified big-number banners with specific, checkable evidence (links to benchmarks, open data, real counts derived from live endpoints). If you do not have verifiable figures yet, remove the stat banner.',
    alternatives: [
      'Link directly to verifiable benchmark data or live telemetry with source dates',
      'One concrete, named customer outcome with linkable proof',
      'Remove the stat banner — empty space beats unverified numbers',
    ],
    rule: 'No big-number stat banner unless every number links to a verifiable source.',
  },

  faq_accordion: {
    problem:
      'Long `<details>` FAQ accordions packed with generic questions at the bottom of a landing page act as filler instead of real documentation.',
    fix: 'Remove the generic FAQ accordion and link to clear documentation, or keep ≤4 concrete questions real users actually ask and weave core answers directly into the relevant page sections.',
    alternatives: [
      'Delete the FAQ section and link to focused /docs',
      'Weave key answers directly into pricing, security, and methodology sections',
      'Keep at most 3–4 genuinely asked technical questions in plain prose',
    ],
    rule: 'Avoid generic FAQ `<details>` accordions with ≥5 entries at the page footer.',
  },

  gradient_letter_avatars: {
    problem:
      'Circular badges showing 1–3 initials on gradient or solid colored backgrounds in testimonial strips read as placeholder social proof.',
    fix: 'Use real photographs of real people with verifiable names, roles, and links — or remove the testimonial section until you have real attributed quotes.',
    alternatives: [
      'Real photographs + verifiable names and companies (with permission)',
      'One detailed, linkable quote from a real user rather than a row of generic avatars',
      'Remove the testimonials section until real proof exists',
    ],
    rule: 'No circular initials avatars on gradient or colored fills in testimonials.',
  },

  bento_grid: {
    problem:
      'A mixed-span grid of heavily rounded cards (`border-radius >= 12px`) is a recognizable starter-template layout cliché.',
    fix: 'Choose the simplest layout that serves the content: a clean uniform grid with crisp corners, a structured comparison table, or a vertical narrative pairing prose with real artifacts. Drop uniform heavy rounding.',
    alternatives: [
      'A crisp uniform 2- or 3-column layout with tight radii (0–6px) and 1px rules',
      'One primary interactive workbench or real screenshot + concise supporting notes',
      'A plain vertical stack separated by hairline rules and whitespace',
    ],
    rule: 'No mixed-span heavily-rounded card "bento" walls.',
  },

  aurora_mesh_gradient: {
    problem:
      'Large blurred radial or conic gradient blobs glowing behind sections add visual haze and match default starter-kit hero backdrops.',
    fix: 'Remove blurred gradient backdrop blobs completely. Use a flat solid surface and let typography, structured layout, or real product UI carry the hero.',
    alternatives: [
      'Flat solid surface + real product UI or live specimen',
      'High-contrast editorial typography on a clean paper or white canvas',
      'Intentional negative space with crisp hairline geometry',
    ],
    rule: 'No blurred radial/conic gradient blobs as decorative backdrops.',
  },

  ai_sparkle_badges: {
    problem:
      'The ✨ sparkle glyph (or generic Sparkles SVG icon) used as an "AI" label is vague and overused across template interfaces.',
    fix: 'Delete the sparkle glyph and state the exact capability in plain words (e.g., "Checks 45 CSS rules in Chromium", not "✨ Smart Analysis").',
    alternatives: [
      'Plain verb phrase naming the concrete action, with no icon',
      'An action-specific functional icon (terminal, diff, check) only when it clarifies UI',
      'A plain primary CTA button without decorative emoji',
    ],
    rule: 'No ✨/Sparkles glyphs as decorative badges or CTA icons.',
  },

  // ── COPY AXIS (#08) ───────────────────────────────────────────────────────
  buzzword_density: {
    problem:
      'Clusters of vague marketing buzzwords (leverage, seamless, robust, elevate, unlock, harness, cutting-edge, transformative) substitute abstract filler for concrete product facts.',
    fix: 'Replace abstract verbs and adjectives with what the product literally does. Name real nouns, real limits, and checkable outcomes (e.g., "Imports CSV in <2s" instead of "Seamlessly unlocks workflows").',
    alternatives: [
      "State the literal action: 'runs in headless Chromium', not 'seamlessly analyzes'",
      "Use a concrete measurement: 'flags 5 CSS rules', not 'unlocks insights'",
      'Delete filler adjectives that add no falsifiable claim',
    ],
    rule: 'Keep buzzword density below 6 per 1,000 words and fewer than 4 distinct terms per page.',
  },

  em_dash_overload: {
    problem:
      'High density of em-dashes (U+2014 `—`, ≥4 hits at ≥7 per 1,000 words) flattens prose rhythm when used as the default clause connector.',
    fix: 'Replace most em-dashes with periods (splitting long clauses into crisp sentences), commas, colons, or parentheses. Keep at most one or two where a real break improves clarity.',
    alternatives: [
      'Split into two clear sentences with a period',
      'Use a comma or colon for routine clause transitions',
      'Use parentheses for brief technical asides',
    ],
    rule: 'Keep em-dash (U+2014) density well below 7 per 1,000 words.',
  },

  antithesis_construction: {
    problem:
      'Repeated "It\'s not just X — it\'s Y" / "not only … but also" rhetorical scaffolds add dramatic padding without stating a concrete fact.',
    fix: 'Delete the "not just" setup and state the actual claim directly. If a contrast matters, prove it with a concrete before/after or specific technical difference.',
    alternatives: [
      'State the direct claim in one plain sentence',
      'Show a concrete technical difference instead of rhetorical negation',
      'Cut the framing sentence entirely',
    ],
    rule: "Avoid repeated 'not just X, it's Y' and 'not only … but also' constructions.",
  },

  filler_openers: {
    problem:
      'Scene-setting openers ("In today\'s fast-paced world", "when it comes to", "in the realm of", "at the end of the day") waste the opening sentence without conveying information.',
    fix: 'Delete the throat-clearing clause and open with the concrete problem, fact, or capability.',
    alternatives: [
      'Open directly with the user problem or concrete constraint',
      'Open with a specific number, artifact, or command',
      'Delete the opening clause and start at the second sentence',
    ],
    rule: 'No generic scene-setting openers. Every opening sentence must carry concrete information.',
  },

  formulaic_closers: {
    problem:
      'Essay-style wrap-up phrases ("In conclusion", "In summary", "Ultimately,", "When all is said and done") pad the end of a page instead of giving the reader a clear next step.',
    fix: 'Delete the summary cue and end on a concrete takeaway, verifiable proof, or direct next step.',
    alternatives: [
      'End with a specific next action (command, link, or doc section)',
      'End on the sharpest concrete technical claim',
      'Stop as soon as the final point is made',
    ],
    rule: "No 'In conclusion / In summary / Ultimately,' essay closers.",
  },

  rule_of_three: {
    problem:
      'Repeated three-adjective tricolons ("fast, reliable, and scalable") fill sentences with interchangeable abstractions instead of verifiable specifics.',
    fix: 'Replace each adjective trio with one measurable fact or concrete behavior.',
    alternatives: [
      'One verifiable number or behavior instead of three adjectives',
      'Concrete product nouns rather than abstract modifiers',
      'Two crisp contrasting specifics',
    ],
    rule: 'Avoid repeated abstract adjective tricolons ("X, Y, and Z").',
  },

  whether_youre: {
    problem:
      '"Whether you\'re X or Y" audience-spanning constructions dilute positioning by trying to speak to everyone at once.',
    fix: 'Name your actual primary audience and describe their concrete scenario directly.',
    alternatives: [
      'Address one specific role and workflow directly',
      'Use a real example instead of a broad spectrum',
      'Cut the spanning clause and state what the product does',
    ],
    rule: "Avoid 'whether you're X or Y' audience-spanning fillers.",
  },

  unicode_artifacts: {
    problem:
      'Hidden Unicode characters or mathematical fake-bold glyphs break search, screen readers, anchor links, and copy-paste.',
    fix: 'Normalize page copy to plain UTF-8 text: strip invisible characters and replace mathematical-alphanumeric glyphs with real semantic HTML/CSS (`<strong>`, `<em>`, `font-weight`).',
    alternatives: [
      'Paste copy as plain text and style with semantic HTML/CSS',
      'Run a Unicode hygiene check in CI before publishing',
    ],
    rule: 'No invisible control/tag Unicode or mathematical fake-bold glyphs in published copy.',
  },

  fake_bold_math_alnum: {
    problem:
      'Mathematical Alphanumeric Symbols (U+1D400–U+1D7FF, e.g. 𝗯𝗼𝗹𝗱 / 𝘪𝘵𝘢𝘭𝘪𝘤) used as fake bold/italic break screen readers, ctrl-F search, and copy-paste.',
    fix: 'Replace all mathematical-alphanumeric letters with normal ASCII/Unicode letters and apply styling via `<strong>`, `<em>`, or CSS `font-weight` / `font-style`.',
    alternatives: [
      'Use semantic `<strong>` or `<em>` tags',
      'Use CSS `font-weight: 600` or `font-style: italic` on plain text',
    ],
    rule: 'Never use Unicode Mathematical Alphanumeric Symbols as visual bold/italic styling.',
  },

  hidden_tag_characters: {
    problem:
      'Unicode Tags-block characters (U+E0000–U+E007F) are invisible to human readers and are a known prompt-injection / text-smuggling vector.',
    fix: 'Strip all U+E0000–U+E007F codepoints from HTML and content sources immediately and audit the pipeline that introduced them.',
    alternatives: [
      'Strip Tags-block codepoints in your build/CMS sanitizer',
      'Inspect raw source files for invisible non-ASCII sequences',
    ],
    rule: 'Zero Unicode Tags-block (U+E0000–U+E007F) characters in published pages.',
  },

  invisible_characters: {
    problem:
      'In-word zero-width characters (ZWSP/ZWNJ/ZWJ outside valid scripts/emoji, BOM) corrupt search indexing, word selection, and copy-paste.',
    fix: 'Strip stray zero-width characters (U+200B, U+FEFF, stray U+200C/U+200D) from source copy.',
    alternatives: [
      'Normalize text sources with a pre-commit or build-time linter',
      'Re-paste affected paragraphs as plain text',
    ],
    rule: 'No stray in-word invisible characters in published prose.',
  },

  chatbot_markup_leak: {
    problem:
      'Unstripped chat citation or internal UI markers (`oaicite`, `attributableIndex`, `grok-card`, `turn0search`) leaked directly into live page copy or DOM attributes.',
    fix: 'Remove all leaked citation markup tokens and replace them with proper HTML `<a href>` links to verified primary sources.',
    alternatives: [
      'Replace leaked citation tokens with real `<a href>` references',
      'Add a build-time or CI copy check (`slop-detect --copy`) to catch paste artifacts before deploy',
    ],
    rule: 'Zero leaked chat citation or internal markup tokens in visible copy or attributes.',
  },

  chatbot_reply_residue: {
    problem:
      'Conversational turn framing ("Certainly! Here\'s…", "Let me know if you\'d like…", "As an AI…") leaked unedited into published copy.',
    fix: 'Delete all conversational wrapper text and edit the remaining copy so it reads directly as your product documentation or landing page.',
    alternatives: [
      'Remove the framing sentence and lead directly with the page content',
      'Gate publishing with `slop-detect --copy` in CI',
    ],
    rule: 'Zero conversational turn-framing or assistant-refusal residue in live pages.',
  },

  ai_referral_utm_links: {
    problem:
      'Outbound `<a href>` links still carry chat referral parameters (`utm_source=chatgpt.com`, `utm_source=perplexity`, `referrer=grok.com`) left over from copy-pasting URLs.',
    fix: 'Strip chat referral `utm_source` / `referrer` query parameters from outbound links so URLs are clean canonical links.',
    alternatives: [
      'Use clean canonical destination URLs without pasted referral parameters',
      'Check outbound hrefs in CI before publishing',
    ],
    rule: 'Strip pasted assistant `utm_source` and `referrer` query params from outbound links.',
  },

  unfilled_placeholders: {
    problem:
      'Unfilled template placeholders (`[Insert Company Name]`, `[Your Industry]`, `{{variable}}`, `2026-XX-XX`) shipped to production.',
    fix: 'Replace every placeholder token with real, verified copy or remove the incomplete section before deploy.',
    alternatives: [
      'Fill in the real value from verified product facts',
      'Delete unfinished sections instead of shipping bracketed placeholders',
    ],
    rule: 'Zero unfilled bracketed or mustache placeholder tokens on live pages.',
  },

  leaked_markdown: {
    problem:
      'Raw unrendered Markdown syntax (`**bold**`, `### Heading`, `[text](https://...)`) is visible in rendered page prose.',
    fix: 'Render the Markdown to semantic HTML (`<strong>`, `<h3>`, `<a href>`) or remove raw Markdown punctuation from plain text nodes.',
    alternatives: [
      'Pass content through your Markdown parser before rendering',
      'Replace stray `**` or `[label](url)` with proper HTML elements',
    ],
    rule: 'No unrendered raw Markdown syntax in visible non-code text.',
  },

  emoji_bullet_headers: {
    problem:
      'Three or more bullets or headings prefixed with decorative emoji (🚀, ✅, ✨, 💡) clutter scannability and read as unedited chat list output.',
    fix: 'Remove leading decorative emoji from headings and list items. Use clean typographic hierarchy or a single restrained icon system if icons truly aid scanning.',
    alternatives: [
      'Plain text headings with clear weight and size hierarchy',
      'Bold lead-in phrases on plain list items',
      'A restrained monochrome SVG icon set only where visual scanning benefits',
    ],
    rule: 'No decorative emoji prefixes across headings or bullet lists.',
  },

  cream_default_bg: {
    problem:
      'An unexamined warm cream/beige page background (`#faf8f3`-style) has become a common template default.',
    fix: 'Use a deliberate surface token declared in DESIGN.md — either crisp white (`#FFFFFF`), cool archival paper (`#F4F5F2`), or an intentional brand palette surface.',
    alternatives: [
      'Pure white (#FFFFFF) with carbon ink (#181815)',
      'Cool archival neutral (#F4F5F2) with strong contrast',
      'Declare your exact intentional surface color in DESIGN.md',
    ],
    rule: 'Use an intentional, declared surface color rather than an unexamined warm cream default.',
  },

  low_contrast_text: {
    problem:
      'Body text below WCAG AA contrast (4.5:1 for normal text, 3:1 for large text) hurts legibility and fails accessibility standards.',
    fix: 'Raise text contrast to ≥4.5:1 (body) and ≥3:1 (large/bold) against the effective rendered background. Darken light-mode muted text toward `#4A4A44` or darker; lighten dark-mode text to ≥`#D4D4D8`.',
    alternatives: [
      'Near-black body ink (#181815–#222222) on light surfaces',
      '≥#D4D4D8 body text on dark surfaces',
      'Verify every text/surface token pair with `lint_design_md` before shipping',
    ],
    rule: 'Every readable text block must clear WCAG AA (4.5:1 body, 3:1 large) against its actual background.',
  },

  crushed_tracking: {
    problem:
      'Display headings pulled tighter than `-0.04em` compress glyph spacing until letters collide and reduce legibility.',
    fix: 'Back off negative letter-spacing to between `-0.02em` and `0` (normal), or choose a display optical size designed for tight headlines.',
    alternatives: [
      '-0.01em to -0.02em maximum on large display headings',
      'Zero letter-spacing (`normal`) trusting the typeface metrics',
      'Enable `font-optical-sizing: auto` on variable display fonts',
    ],
    rule: 'Keep display heading `letter-spacing` looser than `-0.04em`.',
  },

  gray_on_color: {
    problem:
      'Neutral grey text placed directly on a saturated chromatic background looks washed out and muddy.',
    fix: 'On colored surfaces, use crisp white/near-black for primary text or a high-contrast shade tinted with the background hue instead of flat neutral grey.',
    alternatives: [
      'High-contrast white or near-black text on colored surfaces',
      'A darker/lighter shade sharing the background hue',
      'Move secondary copy onto a neutral surface',
    ],
    rule: 'No flat neutral grey text on saturated chromatic backgrounds.',
  },

  oversized_hero_h1: {
    problem:
      'A long full-sentence headline set at display size (≥72px, ≥40 characters) pushes supporting copy, CTA, and product proof below the fold.',
    fix: 'Either tighten the H1 to a short, punchy headline (≤35 chars) or reduce its font size to 44–60px so the hero communicates cleanly above the fold.',
    alternatives: [
      'Tighten the headline to 3–6 crisp words if keeping ≥72px',
      'Keep the full sentence and set it at 44–60px',
      'Move supporting detail into the subhead below the H1',
    ],
    rule: 'Keep headlines ≥72px concise (<40 chars), or size longer headlines at ≤60px.',
  },

  nested_cards: {
    problem:
      'Card containers nested inside other bordered/rounded/shadowed cards add redundant chrome and visual clutter.',
    fix: 'Flatten card nesting to a single level of container elevation. Separate inner items with whitespace, typography, or 1px hairline dividers.',
    alternatives: [
      'One outer panel with inner rows separated by 1px hairline rules',
      'Whitespace and typographic hierarchy instead of inner bordered boxes',
      'Remove outer card chrome and let sections sit directly on the page surface',
    ],
    rule: 'Maximum one level of card elevation — no bordered/rounded cards inside cards.',
  },

  wide_body_tracking: {
    problem:
      'Body copy with `letter-spacing > 0.05em` disrupts natural word recognition and slows reading.',
    fix: 'Reset body copy `letter-spacing` to `normal` (`0`). Keep positive tracking confined to short metadata tags if needed at all.',
    alternatives: [
      '`letter-spacing: normal` on all body paragraphs',
      'Adjust `line-height` (1.5–1.65) for breathing room instead of tracking',
    ],
    rule: 'Keep body text `letter-spacing <= 0.05em`.',
  },

  flat_type_hierarchy: {
    problem:
      'Multiple distinct font sizes clustered within less than a 2× min-to-max spread leave no clear visual hierarchy between headings and body.',
    fix: 'Use fewer size steps with clearer contrast: establish a ≥2× jump from body (e.g., 16px) to primary display heading (e.g., 36–56px) and use weight/color for sub-levels.',
    alternatives: [
      'Clear 3-step scale: 14–16px body, 24–28px H2, 40–56px H1',
      'Consolidate near-duplicate intermediate sizes',
    ],
    rule: 'Maintain a ≥2× display-to-body font size ratio.',
  },

  // ── REVIEW / ADVISORY RECIPES (weight 0, actionable guidance) ────────────
  slop_fonts_2026: {
    problem:
      'Secondary starter-kit font defaults (Syne, Fraunces, Outfit, Sora, Playfair, Lora, JetBrains Mono as body) are converging as common template picks.',
    fix: 'Keep monospace fonts for code/data labels, and declare intentional display/body families in DESIGN.md.',
    alternatives: [
      'Declare your exact font pairings in DESIGN.md',
      'Reserve monospace strictly for technical labels, code, and tabular numbers',
    ],
    rule: 'Declare intentional typography in DESIGN.md rather than relying on template pairings.',
  },

  hero_accent_word: {
    problem:
      'Styling a single hero H1 word in an italic contrasting serif (`<em>`) is a widely repeated headline ornament.',
    fix: 'Set the full headline cleanly in one consistent display face, or use crisp weight/color hierarchy without mixed-family italic accent words.',
    alternatives: [
      'Uniform upright display headline with clear copy',
      'Weight contrast within the same typeface family',
    ],
    rule: 'Avoid single-word contrasting italic serif accents inside the hero H1.',
  },

  fake_macos_terminal: {
    problem:
      'Decorative red/yellow/green macOS traffic-light dots above a static code block add fake window chrome without utility.',
    fix: 'Remove decorative traffic-light circles. Label the code block with the actual filename, command, or language tag plus a real Copy button.',
    alternatives: [
      'Plain monospace header bar with filename + Copy button',
      'Clean bordered `<pre><code>` block with no faux OS chrome',
    ],
    rule: 'Use functional labels and copy controls instead of fake macOS traffic-light dots.',
  },

  fake_logo_bar: {
    problem:
      'Placeholder ("Acme", "Logo 1") or duplicate-image logo strips read as fabricated social proof.',
    fix: 'Replace placeholder or duplicate logos with verified customer logos (with permission) or remove the logo bar.',
    alternatives: [
      'Real customer logos with distinct assets',
      'Remove the logo strip until real customers can be named',
    ],
    rule: 'Never ship placeholder or duplicated logo strip entries.',
  },

  pulsing_status_badge: {
    problem:
      'Animated pulsing status dots (`animate-pulse`/`animate-ping`) on marketing badges create constant motion distraction without representing live telemetry.',
    fix: 'Use a static dot or plain text label unless it reflects real live system status, and disable motion under `prefers-reduced-motion: reduce`.',
    alternatives: [
      'Static indicator paired with a real timestamp or status link',
      'Plain text status without pulsing animation',
    ],
    rule: 'No decorative pulsing dots on static marketing badges.',
  },

  display_mono_heading: {
    problem:
      'Large monospace display headings mimic terminal clichés when the page is not a terminal UI.',
    fix: 'Use a readable display sans or serif for H1/H2 headings and reserve monospace for code, IDs, and tabular metrics.',
    alternatives: [
      'Display serif or geometric sans for H1/H2, monospace for code and tables',
      'Declare monospace headings explicitly in DESIGN.md if core to the brand',
    ],
    rule: 'Reserve monospace for code/data unless declared as the display face in DESIGN.md.',
  },

  scaffold_defaults_unedited: {
    problem:
      'Unedited framework starter defaults (`Create Next App`, `Vite + React`, default starter favicons/meta) were left in the live page.',
    fix: 'Set a real `<title>`, `<meta name="description">`, Open Graph metadata, and custom favicon for your product.',
    alternatives: [
      'Set product-specific `<title>` and `<meta name="description">` in your root layout',
      'Ship a custom SVG favicon',
    ],
    rule: 'Replace all framework scaffold titles, descriptions, and default icons before shipping.',
  },

  structural_fake_social_proof: {
    problem:
      'Placeholder avatar hosts (`pravatar.cc`, `dicebear`, `ui-avatars`), duplicated avatar images, or unattributed testimonials erode trust.',
    fix: 'Use real, unique photos and real attributed names/companies, or remove the testimonial block.',
    alternatives: ['Verified customer quotes with real links', 'Remove unattributed testimonials'],
    rule: 'Never ship placeholder avatar APIs or duplicate avatar assets in testimonials.',
  },

  uniform_radius_shadow: {
    problem:
      'Identical heavy corner radius and drop shadows applied across many unrelated elements flatten visual distinction.',
    fix: 'Define a disciplined radius scale in DESIGN.md (e.g., 0–4px structural, 6–8px controls) and use shadows sparingly for genuinely elevated layers like popovers.',
    alternatives: [
      'Tight structural corners (0–4px) with 1px hairline borders',
      'Declare a deliberate `rounded` scale in DESIGN.md',
    ],
    rule: 'Vary surface treatments by role instead of applying one heavy card radius/shadow everywhere.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Per-pattern evidence formatters. Each takes the pattern's `evidence` blob
// (extracted by the detector in patterns.js) and returns a short, concrete
// "Here's what we found on YOUR page" line. The point is to stop the consuming
// LLM from re-discovering the problem and possibly fixing the wrong thing.
// Returns null when there's no useful evidence to surface.
// ─────────────────────────────────────────────────────────────────────────────
// Evidence samples are strings for most patterns and small objects for a few
// (e.g. purple_accent's { tag, bg }). Render objects by their fields instead of
// "[object Object]".
function sampleText(sample) {
  if (sample == null) return '';
  if (typeof sample !== 'object') return String(sample);
  for (const key of ['text', 'value', 'sample']) {
    if (typeof sample[key] === 'string') return sample[key];
  }
  const parts = Object.entries(sample)
    .filter(([, value]) => value != null && typeof value !== 'object')
    .map(([key, value]) => `${key} ${value}`);
  return parts.length ? parts.join(', ') : JSON.stringify(sample);
}

function fmtList(arr, n = 3) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const slice = arr.slice(0, n).map((s) => `"${sampleText(s).slice(0, 60)}"`);
  return slice.join(', ') + (arr.length > n ? `, … (+${arr.length - n} more)` : '');
}

const EVIDENCE_FORMATTERS = {
  slop_fonts: (e) => {
    const lines = [];
    if (typeof e.ratio === 'number' && e.total) {
      lines.push(
        `${e.slopCount}/${e.total} elements (${Math.round(e.ratio * 100)}%) use an AI-default font.`
      );
    }
    if (e.heroFam) {
      lines.push(
        `Hero/H1 font is \`${e.heroFam}\` — ${e.heroIsSlop ? '⚠️ on the slop list, replace it.' : '✓ not on the slop list, **keep it**.'}`
      );
    }
    if (e.accentSerifItalicCount > 0) {
      lines.push(
        `${e.accentSerifItalicCount} italic-serif accents (Instrument Serif-style) detected.`
      );
    }
    return lines.length ? lines.join(' ') : null;
  },
  purple_accent: (e) => {
    const parts = [];
    if (e.purpleEls != null)
      parts.push(`${e.purpleEls} elements painted in the OKLCH 268–310° purple/indigo range`);
    if (e.filledCtas != null) parts.push(`${e.filledCtas} filled CTAs use it`);
    const sam = fmtList(e.samples);
    if (sam) parts.push(`samples: ${sam}`);
    return parts.length ? parts.join('; ') + '.' : null;
  },
  gradient_text: (e) => {
    const parts = [];
    if (e.count != null) parts.push(`${e.count} \`background-clip: text\` gradients found`);
    if (e.heroHasGradient) parts.push('including the hero H1 itself');
    return parts.length ? parts.join(' — ') + '.' : null;
  },
  gradient_backgrounds: (e) => {
    const parts = [];
    if (e.bgElements != null) parts.push(`${e.bgElements} elements have gradient backgrounds`);
    if (e.conic) parts.push(`${e.conic} are conic gradients (rainbow swirls)`);
    return parts.length ? parts.join('; ') + '.' : null;
  },
  accent_stripe: (e) =>
    e.stripeCards
      ? `${e.stripeCards} cards have a thick colored top or left border (Tailwind UI "accent stripe").`
      : null,
  glassmorphism: (e) =>
    e.glassCount
      ? `${e.glassCount} elements use \`backdrop-filter: blur()\` on translucent surfaces.`
      : null,
  colored_glows: (e) =>
    e.glowCount
      ? `${e.glowCount} elements have saturated colored \`box-shadow\` glows (red/orange/blue/purple/etc.).`
      : null,
  centered_hero: (e) => {
    const parts = [];
    if (e.fontSize) parts.push(`hero is ${e.fontSize}px`);
    if (e.centered) parts.push('text-aligned center');
    if (e.family) parts.push(`font \`${e.family}\``);
    if (e.slopFont) parts.push('on the slop font list');
    return parts.length ? `H1 fingerprint: ${parts.join(', ')}.` : null;
  },
  hero_eyebrow_pill: () => `A rounded pill (border-radius ≥ 999px) sits above the H1.`,
  all_caps_labels: (e) => {
    const parts = [];
    if (e.count != null) parts.push(`${e.count} all-caps labels detected`);
    const sam = fmtList(e.samples);
    if (sam) parts.push(`including ${sam}`);
    return parts.length ? parts.join(' — ') + '.' : null;
  },
  eyebrow_label: (e) => {
    const parts = [];
    if (e.eyebrowCount != null && e.headingCount != null) {
      parts.push(`${e.eyebrowCount}/${e.headingCount} section headings have an eyebrow label`);
    }
    const sam = fmtList(
      Array.isArray(e.samples) ? e.samples.map((s) => (typeof s === 'string' ? s : s.text)) : []
    );
    if (sam) parts.push(`including ${sam}`);
    return parts.length ? parts.join(' — ') + '.' : null;
  },
  perma_dark_mode: (e) => {
    const parts = [];
    if (e.bodyDark) parts.push('body background is dark');
    if (e.greyParas != null && e.totalParas) {
      parts.push(
        `${e.greyParas}/${e.totalParas} paragraphs (${Math.round((e.ratio || 0) * 100)}%) use mid-grey text below the WCAG-AA contrast threshold`
      );
    }
    return parts.length ? parts.join('; ') + '.' : null;
  },
  icon_card_grid: (e) =>
    e.maxGroupSize
      ? `Largest sibling card group: ${e.maxGroupSize} identical icon-on-top cards in a row.`
      : null,
  numbered_steps: (e) =>
    e.bestRun ? `Found a run of ${e.bestRun} numbered "1 · 2 · 3" steps with generic verbs.` : null,
  stat_banner: (e) =>
    e.clusterSize
      ? `${e.clusterSize} oversized big-number stats clustered in one banner (likely unverified).`
      : null,
  faq_accordion: (e) => {
    if (!e.detailsCount) return null;
    return `${e.detailsCount} \`<details>\` accordion entries${e.hasFaqHeading ? ' under an explicit FAQ heading' : ''}.`;
  },
  gradient_letter_avatars: (e) => {
    const parts = [];
    if (e.count != null) parts.push(`${e.count} initials-on-gradient avatars found`);
    const sam = fmtList(e.samples);
    if (sam) parts.push(`labels: ${sam}`);
    return parts.length ? parts.join(' — ') + '.' : null;
  },
  bento_grid: (e) =>
    e.children
      ? `A grid of ${e.children} rounded cards with ${e.spanVariety} distinct column spans (the "bento" tell).`
      : null,
  aurora_mesh_gradient: (e) =>
    e.blobs ? `${e.blobs} large blurred gradient blobs behind the fold.` : null,
  ai_sparkle_badges: (e) => {
    const parts = [];
    if (e.emojiHits) parts.push(`${e.emojiHits} ✨-style emoji`);
    if (e.svgHits) parts.push(`${e.svgHits} "Sparkles" icon hit(s)`);
    const sam = fmtList(e.samples);
    if (sam) parts.push(`e.g. ${sam}`);
    return parts.length ? `AI-magic tells: ${parts.join(', ')}.` : null;
  },
  cream_default_bg: (e) =>
    e.surface
      ? `Page surface is \`${e.surface}\` — a warm off-white / cream (the default AI 'tasteful' background).`
      : null,
  low_contrast_text: (e) => {
    if (!e.fails) return null;
    const parts = [
      `${e.fails}/${e.checked} text blocks (${Math.round((e.ratioFail || 0) * 100)}%) fall below the WCAG AA contrast floor`,
    ];
    if (Array.isArray(e.samples) && e.samples.length) {
      const s = e.samples.map((x) => `"${x.text}" (${x.ratio}:1, needs ${x.floor}:1)`).join('; ');
      parts.push(`e.g. ${s}`);
    }
    return parts.join(' — ') + '.';
  },
  crushed_tracking: (e) => {
    if (!e.count) return null;
    const parts = [`${e.count} display heading(s) tracked tighter than -0.04em`];
    if (Array.isArray(e.samples) && e.samples.length) {
      parts.push('e.g. ' + e.samples.map((x) => `"${x.text}" (${x.em}em)`).join('; '));
    }
    return parts.join(' — ') + '.';
  },
  gray_on_color: (e) => {
    if (!e.count) return null;
    const sam = fmtList((e.samples || []).map((s) => s.text));
    return `${e.count} block(s) of neutral grey text sit on a chromatic background${sam ? ` — e.g. ${sam}` : ''}.`;
  },
  oversized_hero_h1: (e) =>
    e.fontSize
      ? `Hero H1 is ${e.fontSize}px and ${e.chars} characters long ("${(e.text || '').slice(0, 50)}…") — a long headline blown up to display size.`
      : null,
  nested_cards: (e) => {
    if (!e.nested) return null;
    const sam = fmtList(e.samples);
    return `${e.nested} card(s) sit inside another card-like container${sam ? ` — e.g. ${sam}` : ''}.`;
  },
  wide_body_tracking: (e) => {
    if (!e.count) return null;
    const parts = [`${e.count} body block(s) use letter-spacing above 0.05em`];
    if (Array.isArray(e.samples) && e.samples.length) {
      parts.push('e.g. ' + e.samples.map((x) => `${x.em}em on "${x.text}"`).join('; '));
    }
    return parts.join(' — ') + '.';
  },
  flat_type_hierarchy: (e) =>
    e.ratio
      ? `${e.distinct} distinct font sizes spanning only ${e.min}px→${e.max}px (${e.ratio}× ratio) — too flat for a clear hierarchy.`
      : null,
  unicode_artifacts: (e) => {
    const parts = [];
    if (e.zeroWidth) parts.push(`${e.zeroWidth} invisible zero-width character(s)`);
    if (e.narrowNbsp) parts.push(`${e.narrowNbsp} narrow no-break space(s)`);
    if (e.mathAlnum)
      parts.push(
        `${e.mathAlnum} mathematical "fake-bold/italic" letter(s) (𝗯𝗼𝗹𝗱-style, U+1D400 block)`
      );
    if (e.nbsp > 6) parts.push(`${e.nbsp} non-breaking spaces`);
    return parts.length
      ? `Found ${parts.join(', ')} in the page text — invisible to readers, and a copy-paste hygiene defect.`
      : null;
  },
  fake_bold_math_alnum: (e) =>
    e.mathAlnum
      ? `${e.mathAlnum} mathematical alphanumeric fake-bold/italic characters (U+1D400 block) found in prose.`
      : null,
  buzzword_density: (e) => {
    if (!e.total) return null;
    const words = Array.isArray(e.topWords)
      ? e.topWords.map((w) => `"${w.word}" (×${w.count})`).join(', ')
      : '';
    return `${e.total} buzzword hit(s) across ${e.distinct || 0} distinct terms (${e.density || 0} per 1,000 words)${words ? ` — top hits: ${words}` : ''}.`;
  },
  em_dash_overload: (e) =>
    e.total
      ? `${e.emDashes || 0} em-dash(es) U+2014 (${e.density || 0} per 1,000 words; threshold ≥7/1,000 words).`
      : null,
  antithesis_construction: (e) => {
    if (!e.total) return null;
    const sam = fmtList(e.samples);
    return `${e.total} "not just X, it's Y" / "not only … but also" construction(s) found${sam ? ` — e.g. ${sam}` : ''}.`;
  },
  filler_openers: (e) => {
    if (!e.total) return null;
    const sam = fmtList(e.samples);
    return `${e.total} generic throat-clearing opener(s) found${sam ? ` — e.g. ${sam}` : ''}.`;
  },
  formulaic_closers: (e) => {
    if (!e.total) return null;
    const sam = fmtList(e.samples);
    return `${e.total} essay-style closer(s) found${sam ? ` — e.g. ${sam}` : ''}.`;
  },
  rule_of_three: (e) => {
    if (!e.total) return null;
    const sam = fmtList(e.samples);
    return `${e.total} adjective tricolon(s) ("X, Y, and Z") found${sam ? ` — e.g. ${sam}` : ''}.`;
  },
  whether_youre: (e) => {
    if (!e.total) return null;
    const sam = fmtList(e.samples);
    return `${e.total} "whether you're X or Y" audience-spanning phrase(s) found${sam ? ` — e.g. ${sam}` : ''}.`;
  },
  emoji_bullet_headers: (e) => {
    if (!e.count) return null;
    const sam = fmtList(e.samples);
    return `${e.count} emoji-prefixed bullet/header line(s) found${sam ? ` — e.g. ${sam}` : ''}.`;
  },
};

export function formatEvidence(pattern) {
  if (!pattern) return null;
  const formatter = EVIDENCE_FORMATTERS[pattern.id];
  if (!formatter) {
    if (pattern.triggered && pattern.evidence) {
      const sam = fmtList(pattern.evidence.samples);
      if (sam) return `Detected ${pattern.label || pattern.id}: ${sam}.`;
      return `Detected ${pattern.label || pattern.id} (${JSON.stringify(pattern.evidence).slice(0, 80)}).`;
    }
    return null;
  }
  try {
    return formatter(pattern.evidence || {});
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier thresholds (kept in sync with packages/core/src/index.js).
// Clean < 10 · Mild 10–27 · Heavy ≥ 28
// ─────────────────────────────────────────────────────────────────────────────
const CLEAN_THRESHOLD = 10;

// How many currently-passing patterns the prompt names explicitly. The rest are
// summarised in one line: a 70-item prohibition list buries the actual fixes.
export const FIX_PROMPT_PASSING_LIST_CAP = 8;

const CATALOGUE_POINTER =
  'the full catalogue is at https://slop-detect.com/api/patterns (MCP resource `slop://spec/patterns`)';

function knownUrl(result) {
  const raw = result && (result.finalUrl || result.url);
  if (typeof raw !== 'string' || !raw.trim() || raw === 'page') return null;
  return raw.trim();
}

// Build the assembled fix prompt from a scan result. `result` can also be a
// pattern-only object ({ patterns: [...] }) when the caller has the triggered
// pattern IDs but no scan; score and tier lines are then left out instead of
// printing "undefined".
export function buildFixPrompt(result) {
  // Design patterns are at result.patterns. When the copy axis was scored,
  // merge its patterns in too so the fix prompt covers BOTH axes (#08).
  const designPatterns = result.patterns || [];
  const copyPatterns = (result.axes && result.axes.copy && result.axes.copy.patterns) || [];
  const allPatterns = [...designPatterns, ...copyPatterns];
  const triggered = allPatterns.filter((p) => p.triggered && !p.waived);
  const passing = allPatterns.filter((p) => !p.triggered && !p.waived && p.status !== 'unknown');
  const totalCount = allPatterns.length;
  const scoreKnown = typeof result.score === 'number' && Number.isFinite(result.score);
  const tierLabel = typeof result.tier === 'string' && result.tier ? result.tier : null;
  const isClean = scoreKnown && result.score < CLEAN_THRESHOLD;
  const url = knownUrl(result);
  const rescanTarget = url || '<url>';

  const systemDrift =
    (result.system && Array.isArray(result.system.drift) && result.system.drift) || [];
  const craftChecks =
    (result.axes?.craft && Array.isArray(result.axes.craft.checks) && result.axes.craft.checks) ||
    (result.craft && Array.isArray(result.craft.checks) && result.craft.checks) ||
    [];
  const craftFailed = craftChecks.filter((c) => c && c.triggered && c.status === 'fail');
  const aeoFailed =
    (result.aeo && Array.isArray(result.aeo.failed) && result.aeo.failed) ||
    (result.aeo && Array.isArray(result.aeo.checks)
      ? result.aeo.checks.filter((c) => c.passed === false || c.status === 'fail')
      : []);

  if (
    triggered.length === 0 &&
    systemDrift.length === 0 &&
    craftFailed.length === 0 &&
    aeoFailed.length === 0
  ) {
    if (!scoreKnown) {
      return `No triggered patterns were provided, so there's nothing to fix yet. Scan the page first (MCP \`scan_page\`, or \`npx slop-detect ${rescanTarget}\`) and build the prompt from that result.`;
    }
    return `Your landing page (${url || 'this page'}) scored ${result.score}/100${tierLabel ? ` — tier "${tierLabel}"` : ''} — and triggered 0 of ${totalCount} slop patterns. There's nothing to fix on the slop dimension. Move on to conversion or content quality.`;
  }

  const h1FontIsSlop = triggered.find((p) => p.id === 'slop_fonts')?.evidence?.heroIsSlop === true;
  const axesNote = copyPatterns.length ? ' (design + copy axes)' : '';

  let intro;
  if (!scoreKnown) {
    intro = `This prompt was built from ${triggered.length} pattern ID${triggered.length === 1 ? '' : 's'} without a page scan, so there's no score yet. Address each pattern below, then scan the page to confirm.`;
  } else if (isClean) {
    intro = `Your landing page scores **${result.score}/100** on the Slop Detector${tierLabel ? ` — tier **${tierLabel}**` : ''}, which is already under the Clean threshold (< ${CLEAN_THRESHOLD}). It still matches **${triggered.length} of ${totalCount}** default-template patterns${axesNote}. Treat the items below as optional polish, not required fixes, and don't trade them for a riskier redesign.`;
  } else {
    intro = `Your landing page scored **${result.score}/100** on the Slop Detector${tierLabel ? ` — tier **${tierLabel}**` : ''} — triggering **${triggered.length} of ${totalCount}** slop patterns${axesNote}. The goal of this prompt is to reduce that score to **< ${CLEAN_THRESHOLD} (Clean tier)** by addressing each triggered pattern with specific, opinionated remediation.`;
  }

  const contextLines = [
    `- URL: ${url || '(not scanned)'}`,
    result.title ? `- Title: ${result.title}` : null,
    result.h1 ? `- H1: "${result.h1}"` : null,
    result.h1Font
      ? `- H1 font: ${result.h1Font}${h1FontIsSlop ? ' ⚠️ on the slop list' : ' ✓ not on the slop list — **keep this font**'}`
      : null,
  ].filter(Boolean);

  const header = `# Landing page slop fix prompt

${intro}

## Page context
${contextLines.join('\n')}

## ${isClean ? 'Optional polish' : 'Issues to fix'} (in priority order — highest weight first)
`;

  const sorted = triggered.slice().sort((a, b) => (b.weight || 0) - (a.weight || 0));
  const scoredIssues = sorted.filter((p) => p.status !== 'review' && (p.weight ?? 1) > 0);
  const advisoryIssues = sorted.filter((p) => p.status === 'review' || p.weight === 0);

  const renderIssue = (p, i) => {
    const fix = FIXES[p.id];
    const label = p.label || p.id;
    const weight = typeof p.weight === 'number' ? p.weight : '?';
    const selectors = Array.isArray(p.locations)
      ? p.locations
          .map((l) => l?.selector)
          .filter(Boolean)
          .slice(0, 3)
      : [];
    const whereLine = selectors.length
      ? `\n**Where on YOUR page:** ${selectors.map((s) => `\`${s}\``).join(', ')}\n`
      : '';
    if (!fix)
      return `### ${i + 1}. ${label} (+${weight})${whereLine}\n_No fix recipe available for this pattern._`;
    const alts = fix.alternatives.map((a) => `   - ${a}`).join('\n');
    const evidence = formatEvidence(p);
    const evidenceBlock = evidence ? `\n**What we found on YOUR page:**\n${evidence}\n` : '';
    return `### ${i + 1}. ${label}  *(weight: +${weight})*
${whereLine}${evidenceBlock}
**Why this matches default-template patterns:**
${fix.problem}

**Fix:**
${fix.fix}

**Better alternatives:**
${alts}

**Hard rule:** ${fix.rule}`;
  };

  const issues = scoredIssues.length
    ? scoredIssues.map(renderIssue).join('\n\n---\n\n')
    : advisoryIssues.length
      ? '_No scored design or copy patterns triggered._'
      : '_No design or copy slop patterns triggered._';

  const advisoryBlock = advisoryIssues.length
    ? `\n\n---\n\n## Review / advisory findings (weight 0 — informational, do not affect score)\n\n` +
      advisoryIssues
        .map((p) => {
          const fix = FIXES[p.id];
          const selectors = Array.isArray(p.locations)
            ? p.locations
                .map((l) => l?.selector)
                .filter(Boolean)
                .slice(0, 2)
            : [];
          const where = selectors.length ? ` (${selectors.map((s) => `\`${s}\``).join(', ')})` : '';
          const tip = fix ? fix.rule : p.label || p.id;
          return `- **\`${p.id}\`**${where}: ${tip}`;
        })
        .join('\n')
    : '';

  const craftScore = result.axes?.craft?.score ?? result.craft?.score;
  const craftBlock = craftFailed.length
    ? `\n\n---\n\n## Craft floor defects${typeof craftScore === 'number' ? ` (${craftScore}/100)` : ''}\n\nThese objective rendering, contrast, media, and interaction defects sit outside the slop score and should be fixed first:\n\n` +
      craftFailed
        .map((c) => {
          const samples = Array.isArray(c.evidence?.samples)
            ? c.evidence.samples
                .slice(0, 2)
                .map((s) => (typeof s === 'string' ? s : JSON.stringify(s)))
                .join(', ')
            : '';
          return `- **\`${c.id}\`** (${c.label || c.id}): fix the underlying DOM/CSS defect${samples ? ` — e.g. ${samples}` : ''}.`;
        })
        .join('\n')
    : '';

  const systemBlock = systemDrift.length
    ? `\n\n---\n\n## Design system drift (\`DESIGN.md\` — ${result.system.score}/100 · ${result.system.tier})\n\nThe page drifted from its declared \`DESIGN.md\` tokens on ${systemDrift.length} check(s). Bring the rendered DOM back into alignment:\n\n` +
      systemDrift.map((d) => `- **\`${d.id}\`**: ${d.message}`).join('\n')
    : '';

  const aeoBlock = aeoFailed.length
    ? `\n\n---\n\n## Agent-readiness (AEO) gaps (${result.aeo.score}/${result.aeo.maxScore || 100} · ${result.aeo.tier})\n\nThe following AEO eligibility checks failed or are missing. Fix them so search and agent crawlers can fetch, index, and read your page without JavaScript:\n\n` +
      aeoFailed
        .map(
          (c) =>
            `- **\`${c.id}\`** (${c.label || c.id}, ${c.weight} pts${c.severity === 'required' || c.required ? ', required' : ''}): ${c.fix || c.message || c.detail || 'Add the missing signal.'}`
        )
        .join('\n')
    : '';

  // Anti-regression: name the heaviest patterns that currently pass so the
  // agent doesn't "fix" the page by introducing one of them (very common:
  // removing the icon-card grid and replacing it with a gradient-text hero).
  const passingSorted = passing.slice().sort((a, b) => (b.weight || 0) - (a.weight || 0));
  const named = passingSorted.slice(0, FIX_PROMPT_PASSING_LIST_CAP);
  const remaining = passingSorted.length - named.length;
  let passingSection;
  if (passingSorted.length) {
    const lines = named.map((p) => `- **${p.label || p.id}** (\`${p.id}\`)`).join('\n');
    const more = remaining
      ? `\n- …and ${remaining} more currently-passing pattern${remaining === 1 ? '' : 's'} (${CATALOGUE_POINTER}).`
      : '';
    passingSection = `## Currently passing — do NOT introduce these patterns

${passingSorted.length} pattern${passingSorted.length === 1 ? ' is' : 's are'} not triggered on your page right now. Any change that introduces one raises the score. The heaviest ones:

${lines}${more}`;
  } else {
    passingSection = `## Don't introduce new patterns

This prompt only knows the patterns listed above. Don't add other default-template patterns while fixing them (${CATALOGUE_POINTER}).`;
  }

  const passingRule = isClean
    ? `✅ **Passing**: the score stays \`< ${CLEAN_THRESHOLD}\`, no currently-passing pattern is introduced, and the items you polished no longer trigger.
❌ **Failing**: the score rises to ${CLEAN_THRESHOLD} or more, OR any previously-passing pattern now triggers.`
    : `✅ **Passing**: \`score < ${CLEAN_THRESHOLD}\` AND none of the ${triggered.length} pattern${triggered.length === 1 ? '' : 's'} above still trigger${triggered.length === 1 ? 's' : ''}.
❌ **Failing**: score didn't drop below ${CLEAN_THRESHOLD}, OR any previously-passing pattern now triggers.`;

  const footer = `

---

${passingSection}

---

## General guidance

1. **Don't replace one default-template pattern with another.** Swapping Inter for Geist is not progress — both are default fonts. Swapping indigo-600 for violet-500 is not progress — the whole OKLCH 268–310° indigo/violet range triggers unless declared in DESIGN.md.
2. **Preserve what's already clean.** Anything not flagged above is, by definition, working. Don't rewrite untriggered fonts, colors, or layouts "for consistency".
3. **Look at brands with distinct personality** for inspiration: Posthog (intentionally weird), Are.na, Cabin, Manual, Hash, Linear (pre-2024), Stripe docs. The common thread is *editorial restraint and real product imagery*, not decoration.
4. **Show the product, don't decorate around it.** Every gradient, glow, glass panel, and icon card is space that could have been a real product screenshot.
5. **Empty is better than fake.** Empty stat banner > "10k+ users". Empty testimonials section > "JD" on a purple gradient. Empty FAQ > five invented questions.

## Acceptance criterion

After your changes, scan the page again where your changes are actually running:

- MCP: call \`scan_page\` on the page. For a local dev server, run the npm server with \`--local\`; a deployed URL only shows your changes after you deploy.
- CLI: \`npx slop-detect ${rescanTarget}\` (scans locally in headless Chromium and works for localhost).

${passingRule}

## Output format

When you make the changes:
- Show each file you're modifying (full path + unified diff if possible)
- For each change, name the pattern ID it addresses (e.g. \`slop_fonts\`, \`perma_dark_mode\`)
- After all changes, list the triggered patterns that should now be resolved AND confirm none of the "currently passing" patterns were introduced.`;

  return header + '\n' + issues + advisoryBlock + craftBlock + systemBlock + aeoBlock + footer;
}
