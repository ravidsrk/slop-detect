// Fix recipes — one per pattern. Loaded by both the Pages Function (for the
// /api/fix-prompt endpoint) and the frontend (for the "Copy fix prompt"
// button). Written as opinionated designer-grade remediation, not generic
// advice. Goal: paste the assembled prompt into Claude/Cursor/v0 and have it
// produce a measurably less-sloppy page on the next scan.

export const FIXES = {
  slop_fonts: {
    problem:
      "Inter, Geist, Space Grotesk, and Instrument Serif (italic) are the four fonts LLMs default to because Stripe/Linear/Vercel standardized them and training data is saturated with them. Using any of these signals 'AI-built' to anyone who's looked at more than 10 landing pages in 2026.",
    fix:
      "Replace the body and heading typefaces with something that actually reflects your brand. Pick from foundry sans (Söhne, Aeonik, GT America, Untitled Sans, Suisse Int'l, Pangea, Telegraf, Object Sans) OR a system-font stack (`-apple-system, BlinkMacSystemFont, Segoe UI`) for body + a single distinctive display face for H1.",
    alternatives: [
      "Editorial: Tiempos / Söhne / system serif",
      "Modern brand: Aeonik / GT America / Pangea",
      "System-only: -apple-system + bold weight contrast",
      "Distinctive display H1 + neutral body (e.g. Romie + Inter Tight is fine; Migra + Untitled Sans is fine)"
    ],
    rule: "If you can't name the foundry, don't ship the font. Inter/Geist/Space Grotesk are banned for this site."
  },

  purple_accent: {
    problem:
      "Tailwind's `indigo-600` (#6366f1) and `violet-500` (#8b5cf6) became the de-facto primary color for v0.dev, Cursor, Bolt, and Lovable templates. Any saturated purple/indigo CTA in the HSL 240–295° range reads as 'AI-coded'.",
    fix:
      "Pick a primary color anchored to your actual brand, not the LLM default. Avoid HSL hue 240–295 entirely for filled CTAs. High-contrast neutrals (pure black, off-white, rich brown) are the safest reset. If you want color, pick one saturated accent that has *meaning* (Stripe purple has a 10-year story; yours probably doesn't yet).",
    alternatives: [
      "Pure black CTA on cream/off-white background (Linear-era 2021)",
      "Bright orange/red (Notion early days, Cabin, Posthog)",
      "Deep green (Manual, Vercel docs)",
      "Off-white CTA on black background (Apple)",
      "Your existing brand color, applied consistently"
    ],
    rule: "No #6366f1, #8b5cf6, or any HSL hue in 240–295° on filled CTAs."
  },

  gradient_text: {
    problem:
      "Hero H1 with `background-clip: text` + linear gradient (usually purple→pink) is the most-copied 'make the headline pop' trick in AI templates. It signals 'I asked Cursor to make my hero look cool' more than any other single decision.",
    fix:
      "Replace the gradient with a single solid color. If you need emphasis, use one of: (a) italicize one word in a serif accent, (b) change one word to your brand color, (c) use weight contrast (300 + 700 in the same line), (d) add a small mark/underline behind one phrase.",
    alternatives: [
      "Solid H1, one italicized word in a contrasting serif",
      "Solid H1, weight contrast inside the headline",
      "Solid H1, one word boxed/marked",
      "Just a solid H1 — most great pages do nothing"
    ],
    rule: "No `background-clip: text` on H1. The headline either earns attention through copy or it doesn't."
  },

  gradient_backgrounds: {
    problem:
      "5+ gradient-background elements means decorative blobs, glows, conic rainbow swirls, or 'aurora' panels everywhere. This is the AI template equivalent of a 2008 MySpace page.",
    fix:
      "Aim for zero decorative gradients. At most ONE subtle gradient if it has structural purpose (a section background that aids hierarchy). Replace decorative gradients with: solid color blocks, a single tasteful photograph, real product UI screenshots, or negative space.",
    alternatives: [
      "Solid section backgrounds with strong contrast between sections",
      "One real product screenshot as the hero visual",
      "Negative space — let copy and one image carry the page",
      "Geometric pattern that has actual brand meaning"
    ],
    rule: "≤1 gradient element total on the page."
  },

  accent_stripe: {
    problem:
      "Cards with a thick colored top or left border are the most-copied Tailwind UI / shadcn pattern. Used in every 'features grid' AI generates.",
    fix:
      "Remove the colored stripe. Differentiate cards through type hierarchy, a small icon at top, real imagery, or background tint — not a decorative border. Better: question whether you need cards at all (most 'feature grids' work better as a comparison table or a single annotated screenshot).",
    alternatives: [
      "No stripe, no border — just type hierarchy and spacing",
      "Single hairline border (1px, 8% opacity)",
      "Subtle background tint per card",
      "Replace the card grid entirely with a comparison table or real UI screenshot"
    ],
    rule: "No `border-top: 4px solid <color>` or `border-left: 4px solid <color>` on cards."
  },

  glassmorphism: {
    problem:
      "`backdrop-filter: blur()` on translucent layers is a 2021 trend that AI templates kept reproducing. It always reads as decorative-for-the-sake-of-it and signals 'theme.css from a Bolt starter'.",
    fix:
      "Remove all backdrop-filter blur. Use opaque surfaces with strong contrast. If you need depth, a single subtle box-shadow (0 1px 2px rgba(0,0,0,0.05)) does more with less.",
    alternatives: [
      "Opaque cards with type hierarchy",
      "Single subtle shadow",
      "Hairline border at 10% opacity",
      "Just no surface at all — flat sections separated by spacing"
    ],
    rule: "No `backdrop-filter: blur()` anywhere on the page."
  },

  colored_glows: {
    problem:
      "Big colored `box-shadow` glows under hero buttons / behind product images / inside cards are the AI template's idea of 'futuristic'. They never have brand justification.",
    fix:
      "Remove colored glows entirely. If you need shadow, use neutral grey (0 4px 12px rgba(0,0,0,0.08)) at most. If you want visual interest behind your hero, use a real product screenshot or video, not a glow.",
    alternatives: [
      "No shadow at all",
      "Neutral grey shadow at <8% opacity",
      "Replace glow-behind-hero with real product UI screenshot"
    ],
    rule: "No box-shadow with a saturated color (red/orange/yellow/green/blue/purple/pink). Greys only, ≤8% opacity."
  },

  centered_hero: {
    problem:
      "Centered hero text + large H1 + slop font is the combined fingerprint of 'Vercel template starter, copy-pasted, hero customized in 30s'. It's not wrong — it's just instantly recognizable as default.",
    fix:
      "Switch to left-aligned text in an asymmetric layout. The classic move: hero copy on the left (40-50% width), real product UI/video on the right. Or: editorial layout with a big H1, a single supporting paragraph, no CTA buttons above the fold (force the scroll).",
    alternatives: [
      "Left-aligned text + product UI on the right",
      "Editorial: huge H1, one paragraph, scroll for more",
      "Off-center with a real photograph dominating the hero",
      "Two-column with text left, real screenshot right (Linear, Stripe, Vercel before 2023)"
    ],
    rule: "No `text-align: center` on the H1 + subhead + CTA stack."
  },

  hero_eyebrow_pill: {
    problem:
      "The 'Now in beta' / 'New: AI-powered' / 'Backed by Y Combinator' rounded pill above the H1 is the most-copied AI template element after the gradient hero. Almost every AI-generated page has one, regardless of whether there's actual news.",
    fix:
      "Remove the pill if you don't have specific, time-bound news. If you DO have real news (launch, funding, milestone), integrate it into the H1 itself or use a single text link below the CTA — not a decorative pill.",
    alternatives: [
      "Just remove it",
      "Bake the news into the H1: 'X — now with Y'",
      "Single text link below CTA: 'Read our $5M Series A announcement →'",
      "If you must keep it: no background, no border, just `★ New: X` in small text"
    ],
    rule: "No rounded pill (border-radius ≥ 999px) above the H1 unless it announces real, specific, dated news."
  },

  all_caps_labels: {
    problem:
      "UPPERCASE section labels with positive letter-spacing ('DESIGNED FOR DEVELOPERS', 'MORE FEATURES', 'WHY US') are AI's idea of editorial chic. They appear above every section in v0/Cursor output and add zero information.",
    fix:
      "Use sentence-case section titles, or skip section labels entirely. The H2 should do the work. If a label is genuinely useful, write it as a normal sentence in a smaller, dimmed sans.",
    alternatives: [
      "Just delete every all-caps label",
      "Sentence-case smaller label: 'Why teams choose us'",
      "Number the sections (01, 02, 03) with editorial restraint",
      "Skip labels — let H2 carry"
    ],
    rule: "No `text-transform: uppercase` with `letter-spacing` > 0 on section labels."
  },

  perma_dark_mode: {
    problem:
      "Dark background + mid-grey body text (#a0a0a0 region, HSL saturation <15%, L 0.35–0.75) is the AI default for 'premium' feel. The mid-grey body text fails WCAG AA and signals 'I let v0 pick the colors'.",
    fix:
      "Either: (a) go full light mode with crisp dark text on cream/white, OR (b) keep dark but increase body text contrast to at least #d4d4d8 (L 0.85+). Better: ship both themes and respect `prefers-color-scheme`.",
    alternatives: [
      "Light mode: #fafafa background, #111 body, #555 muted",
      "Dark mode done right: #0a0a0b background, #f5f5f7 body, #8a8a92 muted (this site's own scheme)",
      "Honor `prefers-color-scheme` and ship both"
    ],
    rule: "Body text on dark backgrounds must have L ≥ 0.85. No defaulting to dark — the user's system preference is the default."
  },

  icon_card_grid: {
    problem:
      "3+ identical feature cards, each with a small icon on top, then a 2-3 word title, then a one-sentence description. This is the single most-copied component from Tailwind UI and shadcn. Every AI-generated landing page has one.",
    fix:
      "Replace the grid with something that shows the actual product. Options: (a) one large annotated product screenshot with callouts, (b) a comparison table, (c) a vertical scrolling list with one row = one feature + real screenshot, (d) a single demo video. If you must keep cards, vary their sizes and use real product imagery instead of generic icons.",
    alternatives: [
      "One annotated product screenshot with feature callouts",
      "Bento grid with varied card sizes and real screenshots",
      "Comparison table (you vs alternatives)",
      "Vertical alternating layout: feature 1 with screenshot left, feature 2 with screenshot right, ..."
    ],
    rule: "No grid of ≥3 sibling cards each with a top-aligned icon. If you have a feature grid, ≥1 card must contain a real product screenshot, not a generic icon."
  },

  numbered_steps: {
    problem:
      "Numbered 1·2·3 'How it works' sections are AI's go-to filler. They almost never describe an actual product flow — they describe a generic 'sign up / use it / love it' loop.",
    fix:
      "Replace the numbered steps with the actual product flow shown in real UI. A single annotated screenshot or 15-second video tells the user more than 1-2-3 generic verbs. If steps are essential (e.g. an actual checkout flow), make them visual — show the screen at each step.",
    alternatives: [
      "One annotated screenshot showing the full flow",
      "A short looping demo video (no audio)",
      "Real screen-by-screen flow with actual UI",
      "Skip the section entirely — most pages don't need it"
    ],
    rule: "No numbered steps section with generic verbs like 'Sign up / Connect / Get started'. If you keep numbered steps, each must include a real product screenshot."
  },

  stat_banner: {
    problem:
      "'10k+ users', '99.9% uptime', '$2M+ saved' — when these aren't backed by named customers, dated sources, or third-party verification, they read as fabricated. AI templates love them because they make the page feel substantive without effort.",
    fix:
      "Replace vanity stats with one specific, verifiable, named claim. 'Used by Stripe, Linear, and Vercel' (with real logos and links) beats '10,000+ companies'. If you don't have named customers yet, REMOVE the stat banner entirely — empty space is more honest than fake numbers.",
    alternatives: [
      "Customer logo row with 5-8 real, recognized brands",
      "One specific named case study: '\"X cut our onboarding time by 67%\" — Jane Doe, CTO at Real Company'",
      "Remove the section entirely if you don't have proof yet"
    ],
    rule: "No big-number stat banner unless every stat is backed by a verifiable source on the page or one click away."
  },

  faq_accordion: {
    problem:
      "A `<details>` accordion with 5-10 generic FAQs at the bottom of every page is AI filler. The questions are usually invented to look comprehensive, not because real users asked them.",
    fix:
      "Either remove the FAQ section entirely (link to docs or a help center instead), or rewrite it as 3-5 real questions you actually get from users. Better: weave the answers into the main page copy where the question would naturally arise.",
    alternatives: [
      "Delete the FAQ section, link to a real /docs or /help page",
      "Keep 3-5 real questions with full conversational answers",
      "Replace with a 'Common objections' section written as a candid Q&A",
      "Weave FAQ answers into the main page copy"
    ],
    rule: "FAQ section may exist only if every question is one a real user has actually asked, and the section has ≤5 entries."
  },

  gradient_letter_avatars: {
    problem:
      "Small circular avatars with 1-2 initials on a solid or gradient background, used in a testimonial row, signal 'I have no real testimonials'. Meng To called this out specifically in May 2026: 'the AI often will generate these generic letters and backgrounds or gradient to express the customer.'",
    fix:
      "Use real photographs of real people with real names, real job titles, and real company logos. If you don't have real testimonials yet, REMOVE the testimonial section entirely. An empty section is infinitely more honest than fake initials-on-gradient avatars.",
    alternatives: [
      "Real photos + real names + real company logos (with permission)",
      "One long-form named quote from one real customer, not a row of three short ones",
      "Quotes from public Twitter posts (with screenshots and links)",
      "Remove the testimonials section until you have real ones"
    ],
    rule: "No avatars showing initials on a gradient or solid colored background. Either real photos or no avatars."
  },

  bento_grid: {
    problem:
      "A wall of heavily-rounded cards at mixed column/row spans — the Apple-keynote 'bento box'. Every AI builder ships this section now, so a varied-span rounded grid reads as a template default rather than a considered layout.",
    fix:
      "Decide what the section is actually for, then pick the simplest layout that serves it. If the cards are equal in importance, use a plain uniform grid or a list. If one thing matters most, make it big and the rest small — but justify the asymmetry with content hierarchy, not decoration. Drop the uniform 16px+ corner radius; tighten spacing.",
    alternatives: [
      "A simple uniform 2- or 3-column grid with real content in each cell",
      "One large feature block + a short supporting list (asymmetry that means something)",
      "A plain vertical stack of sections — bento is rarely the clearest choice",
      "A single annotated product screenshot instead of N abstract cards"
    ],
    rule: "No mixed-span rounded-card 'bento' wall unless each span maps to real content priority."
  },

  aurora_mesh_gradient: {
    problem:
      "Large blurred radial/conic gradient 'blobs' glowing behind the hero — the v0/Lovable default backdrop. Soft aurora orbs add zero information and instantly date the page to the 2026 AI-template era.",
    fix:
      "Remove the blurred gradient blobs. Let the background be a solid color or honest negative space. If the hero feels empty, fill it with something real: product UI, a photograph, or stronger copy — not ambient glow.",
    alternatives: [
      "Solid background + real product screenshot",
      "Flat brand color with strong type contrast",
      "Negative space — confident pages don't need a glow",
      "A single subtle texture with actual brand meaning"
    ],
    rule: "No blurred radial/conic gradient blobs as decorative hero backdrop."
  },

  ai_sparkle_badges: {
    problem:
      "The ✨ sparkle emoji (or a lucide 'Sparkles' icon) used to label a feature as 'AI-powered'. It's the single most overused generative-UI tell of 2026 — it says 'AI' without saying what the AI does.",
    fix:
      "Delete the sparkle glyph. Describe the actual capability in plain words ('drafts replies in your voice', not '✨ AI magic'). If you need an icon, pick one that depicts the specific action, and let the verb carry the meaning.",
    alternatives: [
      "A concrete verb phrase describing what happens, no icon",
      "An action-specific icon (pencil, wand only if it truly fits) over a generic sparkle",
      "A 5-second before/after that shows the capability instead of labeling it",
      "Nothing — most 'AI' buttons read better as a plain primary CTA"
    ],
    rule: "No ✨/Sparkles glyph as an 'AI magic' label. Name the capability instead."
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Per-pattern evidence formatters. Each takes the pattern's `evidence` blob
// (extracted by the detector in patterns.js) and returns a short, concrete
// "Here's what we found on YOUR page" line. The point is to stop the consuming
// LLM from re-discovering the problem and possibly fixing the wrong thing.
// Returns null when there's no useful evidence to surface.
// ─────────────────────────────────────────────────────────────────────────────
function fmtList(arr, n = 3) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const slice = arr.slice(0, n).map(s => `"${String(s).slice(0, 60)}"`);
  return slice.join(', ') + (arr.length > n ? `, … (+${arr.length - n} more)` : '');
}

const EVIDENCE_FORMATTERS = {
  slop_fonts: (e) => {
    const lines = [];
    if (typeof e.ratio === 'number' && e.total) {
      lines.push(`${e.slopCount}/${e.total} elements (${Math.round(e.ratio * 100)}%) use an AI-default font.`);
    }
    if (e.heroFam) {
      lines.push(`Hero/H1 font is \`${e.heroFam}\` — ${e.heroIsSlop ? '⚠️ on the slop list, replace it.' : '✓ not on the slop list, **keep it**.'}`);
    }
    if (e.accentSerifItalicCount > 0) {
      lines.push(`${e.accentSerifItalicCount} italic-serif accents (Instrument Serif-style) detected.`);
    }
    return lines.length ? lines.join(' ') : null;
  },
  purple_accent: (e) => {
    const parts = [];
    if (e.purpleEls != null) parts.push(`${e.purpleEls} elements painted in the HSL 240–295° purple/indigo range`);
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
    e.stripeCards ? `${e.stripeCards} cards have a thick colored top or left border (Tailwind UI "accent stripe").` : null,
  glassmorphism: (e) =>
    e.glassCount ? `${e.glassCount} elements use \`backdrop-filter: blur()\` on translucent surfaces.` : null,
  colored_glows: (e) =>
    e.glowCount ? `${e.glowCount} elements have saturated colored \`box-shadow\` glows (red/orange/blue/purple/etc.).` : null,
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
  perma_dark_mode: (e) => {
    const parts = [];
    if (e.bodyDark) parts.push('body background is dark');
    if (e.greyParas != null && e.totalParas) {
      parts.push(`${e.greyParas}/${e.totalParas} paragraphs (${Math.round((e.ratio || 0) * 100)}%) use mid-grey text below the WCAG-AA contrast threshold`);
    }
    return parts.length ? parts.join('; ') + '.' : null;
  },
  icon_card_grid: (e) =>
    e.maxGroupSize ? `Largest sibling card group: ${e.maxGroupSize} identical icon-on-top cards in a row.` : null,
  numbered_steps: (e) =>
    e.bestRun ? `Found a run of ${e.bestRun} numbered "1 · 2 · 3" steps with generic verbs.` : null,
  stat_banner: (e) =>
    e.clusterSize ? `${e.clusterSize} oversized big-number stats clustered in one banner (likely unverified).` : null,
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
  }
};

function formatEvidence(pattern) {
  const formatter = EVIDENCE_FORMATTERS[pattern.id];
  if (!formatter) return null;
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

// Build the assembled fix prompt from a scan result.
export function buildFixPrompt(result) {
  const allPatterns = result.patterns || [];
  const triggered = allPatterns.filter(p => p.triggered);
  const passing = allPatterns.filter(p => !p.triggered);

  if (triggered.length === 0) {
    return `Your landing page (${result.url}) scored ${result.score}/100 — tier "${result.tier}" — and triggered 0 of 16 AI-design-slop patterns. There's nothing to fix on the slop dimension. Move on to copy, conversion, or content quality.`;
  }

  const url = result.finalUrl || result.url;
  const h1FontIsSlop =
    triggered.find(p => p.id === 'slop_fonts')?.evidence?.heroIsSlop === true;

  const header = `# Landing page slop fix prompt

Your landing page scored **${result.score}/100** on the Slop Detector — tier **${result.tier}** — triggering **${triggered.length} of 16** AI-design-slop patterns. The goal of this prompt is to reduce that score to **< ${CLEAN_THRESHOLD} (Clean tier)** by addressing each triggered pattern with specific, opinionated remediation.

## Page context
- URL: ${url}
- Title: ${result.title || '(no title)'}${result.h1 ? `\n- H1: "${result.h1}"` : ''}${result.h1Font ? `\n- H1 font: ${result.h1Font}${h1FontIsSlop ? ' ⚠️ on the slop list' : ' ✓ not on the slop list — **keep this font**'}` : ''}

## Issues to fix (in priority order — highest weight first)
`;

  const sorted = triggered.slice().sort((a, b) => b.weight - a.weight);
  const issues = sorted.map((p, i) => {
    const fix = FIXES[p.id];
    if (!fix) return `### ${i + 1}. ${p.label} (+${p.weight})\n_No fix recipe available for this pattern._`;
    const alts = fix.alternatives.map(a => `   - ${a}`).join('\n');
    const evidence = formatEvidence(p);
    const evidenceBlock = evidence
      ? `\n**What we found on YOUR page:**\n${evidence}\n`
      : '';
    return `### ${i + 1}. ${p.label}  *(weight: +${p.weight})*
${evidenceBlock}
**Why this reads as AI-slop:**
${fix.problem}

**Fix:**
${fix.fix}

**Better alternatives:**
${alts}

**Hard rule:** ${fix.rule}`;
  }).join('\n\n---\n\n');

  // Anti-regression: list patterns that currently pass so the LLM doesn't
  // "fix" the page by introducing one of them (very common: removing the
  // icon-card grid and replacing it with a gradient-text hero).
  const passingList = passing
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .map(p => `- **${p.label}** — currently passing. Do not introduce this pattern.`)
    .join('\n');

  const footer = `

---

## Currently passing — do NOT introduce these patterns

The following ${passing.length} patterns are not triggered on your page right now. Any fix that introduces one of them will RAISE your score and is unacceptable.

${passingList}

---

## General guidance

1. **Don't replace one slop pattern with another.** Swapping Inter for Geist is not progress — both are banned. Swapping indigo-600 for violet-500 is not progress — the whole HSL 240–295 range is banned.
2. **Preserve what's already clean.** Anything not flagged above is, by definition, working. Don't rewrite untriggered fonts, colors, or layouts "for consistency".
3. **Look at brands with distinct personality** for inspiration: Posthog (intentionally weird), Are.na, Cabin, Manual, Hash, Linear (pre-2024), Stripe docs. The common thread is *editorial restraint and real product imagery*, not decoration.
4. **Show the product, don't decorate around it.** Every gradient, glow, glass panel, and icon card is space that could have been a real product screenshot.
5. **Empty is better than fake.** Empty stat banner > "10k+ users". Empty testimonials section > "JD" on a purple gradient. Empty FAQ > five invented questions.

## Acceptance criterion

After your changes, rescan with:

\`\`\`bash
curl -sX POST https://slop-detect.com/api/scan \\
  -H 'content-type: application/json' \\
  -d '{"url":"${url}"}' | jq '{score, tier, patternsFlagged, triggered: [.patterns[] | select(.triggered) | .id]}'
\`\`\`

Or open https://slop-detect.com and paste the URL.

✅ **Passing**: \`score < ${CLEAN_THRESHOLD}\` AND none of the ${triggered.length} patterns above still trigger.
❌ **Failing**: score didn't drop below ${CLEAN_THRESHOLD}, OR any previously-passing pattern now triggers.

## Output format

When you make the changes:
- Show each file you're modifying (full path + unified diff if possible)
- For each change, name the pattern ID it addresses (e.g. \`slop_fonts\`, \`perma_dark_mode\`)
- After all changes, list the triggered patterns that should now be resolved AND confirm none of the "currently passing" patterns were introduced.`;

  return header + '\n' + issues + footer;
}
