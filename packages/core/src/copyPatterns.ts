// Copy-slop patterns — the *text* axis of the multi-axis slop score (#08).
//
// WHY a separate module from patterns.js: design-slop patterns run INSIDE the
// page (they need getComputedStyle + geometry) and are serialized via
// .toString() + page.evaluate(). Copy-slop is pure text analysis — it needs no
// DOM, no browser. So these are ordinary functions that run in Node or a Worker
// on the already-extracted page text at near-zero marginal cost. Keeping them
// here means they're unit-testable without a browser and reusable anywhere.
//
// Each pattern is `{ id, label, short, axis:'copy', category, weight, match }`.
// `match(textCtx)` receives { text, headings, paragraphs, wordCount } and
// returns an evidence object that ALWAYS includes a boolean `triggered`.
//
// Calibration philosophy: these fire on *density*, not single occurrences. One
// em-dash is fine writing; one per 40 words is a machine. One buzzword is
// marketing; eight is a content mill. Thresholds are tuned so that hand-written
// landing copy (Stripe, Linear, Notion) stays Clean while GPT-default blog/landing
// prose lights up.

// ── Shared helpers (module-local; these run in Node/Worker, not in-page) ──────
function countMatches(text, re) {
  const m = text.match(re);
  return m ? m.length : 0;
}

function uniqueMatches(text, re, max = 5) {
  const set = new Set();
  let m;
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  while ((m = g.exec(text)) !== null) {
    set.add((m[0] || '').toLowerCase().trim());
    if (set.size >= 50) break;
  }
  return [...set].slice(0, max);
}

function per1000(count, wordCount) {
  if (!wordCount) return 0;
  return (count / wordCount) * 1000;
}

// ── The buzzword lexicon (the single most-cited LLM-prose tell) ──────────────
// Curated from the recurring "ChatGPT words" lists circulating since 2024-2026.
// Word-boundary matched, case-insensitive. Kept as a flat list so a contributor
// can extend it in one place.
const BUZZWORDS = [
  'delve',
  'leverage',
  'leveraging',
  'seamless',
  'seamlessly',
  'robust',
  'elevate',
  'unlock',
  'unlocking',
  'empower',
  'empowering',
  'streamline',
  'streamlined',
  'harness',
  'harnessing',
  'foster',
  'fostering',
  'cutting-edge',
  'game-changer',
  'game-changing',
  'revolutionize',
  'revolutionary',
  'transformative',
  'innovative',
  'holistic',
  'synergy',
  'paradigm',
  'tapestry',
  'realm',
  'landscape',
  'navigate',
  'navigating',
  'embark',
  'bespoke',
  'curated',
  'meticulous',
  'meticulously',
  'unparalleled',
  'unprecedented',
  'supercharge',
  'turbocharge',
  'next-level',
  'best-in-class',
  'world-class',
  'state-of-the-art',
  'frictionless',
  'effortless',
  'effortlessly',
  'comprehensive',
  'ever-evolving',
  'fast-paced',
  'dynamic',
  'pivotal',
  'underscore',
  'underscores',
  'testament',
  'beacon',
  'plethora',
  'myriad',
];

export const COPY_PATTERNS = [
  // ── C1. BUZZWORD DENSITY ────────────────────────────────────────────────
  {
    id: 'buzzword_density',
    label: 'AI buzzword density (leverage / seamless / robust / elevate …)',
    short: 'Buzzwords',
    axis: 'copy',
    category: 'copy',
    weight: 7,
    match: ({ text, wordCount }) => {
      const lower = text.toLowerCase();
      const hits = [];
      let total = 0;
      for (const w of BUZZWORDS) {
        // Escape hyphens for the boundary regex; \b doesn't play with hyphens
        const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`(?:^|[^a-zA-Z-])${esc}(?:[^a-zA-Z-]|$)`, 'gi');
        const c = countMatches(lower, re);
        if (c > 0) {
          hits.push({ word: w, count: c });
          total += c;
        }
      }
      hits.sort((a, b) => b.count - a.count);
      const density = per1000(total, wordCount);
      // Trigger on absolute distinct-word breadth OR on density. Breadth catches
      // short landing pages; density catches long blog slop.
      const distinct = hits.length;
      return {
        total,
        distinct,
        density: Math.round(density * 10) / 10,
        topWords: hits.slice(0, 6),
        triggered: distinct >= 4 || (total >= 3 && density >= 6),
      };
    },
  },

  // ── C2. EM-DASH OVERLOAD ────────────────────────────────────────────────
  {
    id: 'em_dash_overload',
    label: 'Em-dash overload (— used as the default connective)',
    short: 'Em-dashes',
    axis: 'copy',
    category: 'copy',
    weight: 5,
    match: ({ text, wordCount }) => {
      // True em-dash U+2014, plus the spaced " - " and en-dash U+2013 used the
      // same way. The em-dash specifically is the strongest LLM tell.
      const emDashes = countMatches(text, /\u2014/g);
      const enDashAsDash = countMatches(text, /\s\u2013\s/g);
      const total = emDashes + enDashAsDash;
      const density = per1000(total, wordCount);
      return {
        emDashes,
        enDashAsDash,
        total,
        density: Math.round(density * 10) / 10,
        // ~1 em-dash per 150 words is human; LLMs hit 1 per 40-60.
        triggered: (total >= 4 && density >= 7) || emDashes >= 8,
      };
    },
  },

  // ── C3. ANTITHESIS "not just X, it's Y" ─────────────────────────────────
  {
    id: 'antithesis_construction',
    label: '"It\'s not just X — it\'s Y" / "not only … but also" antithesis',
    short: 'Not-just-X',
    axis: 'copy',
    category: 'copy',
    weight: 6,
    match: ({ text }) => {
      const patterns = [
        /\bit['’]?s not just\b/gi,
        /\bnot just (?:a|an|about)\b/gi,
        /\bisn['’]?t just\b/gi,
        /\bnot only\b[^.?!]{1,80}\bbut also\b/gi,
        /\bmore than just\b/gi,
        /\bthis is(?:n['’]?t)? (?:just )?about\b/gi,
      ];
      let total = 0;
      const samples = [];
      for (const re of patterns) {
        const found = uniqueMatches(text, re, 2);
        total += countMatches(text, re);
        for (const f of found) if (samples.length < 4) samples.push(f);
      }
      return { total, samples, triggered: total >= 2 };
    },
  },

  // ── C4. FILLER OPENERS ───────────────────────────────────────────────────
  {
    id: 'filler_openers',
    label: 'Generic filler openers ("In today\'s fast-paced world …")',
    short: 'Filler opener',
    axis: 'copy',
    category: 'copy',
    weight: 5,
    match: ({ text }) => {
      const phrases = [
        /\bin today['’]?s (?:fast-paced|ever-evolving|digital|modern|competitive)\b/gi,
        /\bin the world of\b/gi,
        /\bin an era (?:of|where)\b/gi,
        /\bwhen it comes to\b/gi,
        /\bat the end of the day\b/gi,
        /\bin the realm of\b/gi,
        /\bin the ever-(?:evolving|changing|expanding)\b/gi,
      ];
      let total = 0;
      const samples = [];
      for (const re of phrases) {
        total += countMatches(text, re);
        for (const f of uniqueMatches(text, re, 1)) if (samples.length < 4) samples.push(f);
      }
      return { total, samples, triggered: total >= 1 };
    },
  },

  // ── C5. FORMULAIC CLOSERS ────────────────────────────────────────────────
  {
    id: 'formulaic_closers',
    label: 'Essay-style closers ("In conclusion", "In summary", "Ultimately")',
    short: 'Closers',
    axis: 'copy',
    category: 'copy',
    weight: 4,
    match: ({ text }) => {
      const re =
        /\b(?:in conclusion|in summary|to sum up|to summarize|all in all|ultimately,|in the end,|when all is said and done)\b/gi;
      const total = countMatches(text, re);
      return { total, samples: uniqueMatches(text, re, 3), triggered: total >= 1 };
    },
  },

  // ── C6. RULE-OF-THREE TRICOLON ──────────────────────────────────────────
  {
    id: 'rule_of_three',
    label: 'Rule-of-three adjective tricolons ("fast, reliable, and scalable")',
    short: 'Rule of three',
    axis: 'copy',
    category: 'copy',
    weight: 4,
    match: ({ text }) => {
      // "word, word, and word" where the words are adjective/gerund-ish. We keep
      // it conservative: 3 comma-separated single tokens joined by "and"/"or".
      const re = /\b([a-z]{4,15}),\s+([a-z]{4,15}),\s+and\s+([a-z]{4,15})\b/gi;
      const total = countMatches(text, re);
      const samples = uniqueMatches(text, re, 3);
      // Also the "X, Y, Z" without the oxford comma+and, three short tokens
      const re2 = /\b([a-z]{4,15}),\s+([a-z]{4,15}),\s+([a-z]{4,15})\.\s/gi;
      const total2 = countMatches(text, re2);
      return {
        total: total + total2,
        samples,
        triggered: total + total2 >= 3,
      };
    },
  },

  // ── C7. "WHETHER YOU'RE … OR …" ──────────────────────────────────────────
  {
    id: 'whether_youre',
    label: '"Whether you\'re X or Y" audience-spanning construction',
    short: 'Whether-you',
    axis: 'copy',
    category: 'copy',
    weight: 3,
    match: ({ text }) => {
      const re = /\bwhether you['’]?re\b[^.?!]{1,80}\bor\b/gi;
      const total = countMatches(text, re);
      return { total, samples: uniqueMatches(text, re, 2), triggered: total >= 1 };
    },
  },

  // ── C8. INVISIBLE / SMART UNICODE ARTIFACTS ─────────────────────────────
  {
    id: 'unicode_artifacts',
    label: 'Invisible Unicode + smart-quote artifacts (copy-pasted from an LLM)',
    short: 'Unicode tells',
    axis: 'copy',
    category: 'copy',
    weight: 4,
    match: ({ text }) => {
      // Zero-width space/joiner, non-breaking space runs, narrow no-break space.
      // Each code point is matched individually on purpose (ZWJ here is a literal
      // target, not an emoji combiner), so the misleading-character-class heuristic
      // is a false positive for this detector.
      // eslint-disable-next-line no-misleading-character-class
      const zeroWidth = countMatches(text, /[\u200B\u200C\u200D\u2060\uFEFF]/g);
      const nbsp = countMatches(text, /\u00A0/g);
      const narrowNbsp = countMatches(text, /\u202F/g);
      // Mathematical-alphanumeric "fake bold/italic" letters (𝗯𝗼𝗹𝗱, 𝘪𝘵𝘢𝘭𝘪𝘤, 𝟭𝟮𝟯).
      // The Unicode Mathematical Alphanumeric Symbols block (U+1D400–U+1D7FF) is
      // abused to fake bold/italic in plain text — a strong LLM-social / spam tell
      // that real landing copy never uses (it breaks screen readers and search).
      // Counted by code point, so we iterate rather than regex-match surrogate pairs.
      let mathAlnum = 0;
      for (const ch of text) {
        const cp = ch.codePointAt(0);
        if (cp >= 0x1d400 && cp <= 0x1d7ff) mathAlnum++;
      }
      // Curly quotes are normal in good typography, so they DON'T count alone —
      // only the invisible artifacts, narrow no-break spaces, and fake-bold
      // mathematical letters are LLM tells.
      const total = zeroWidth + narrowNbsp + mathAlnum + (nbsp > 6 ? 1 : 0);
      return {
        zeroWidth,
        narrowNbsp,
        nbsp,
        mathAlnum,
        total,
        // A handful of math-alnum chars (>=4) means a fake-bold word, not a stray glyph.
        triggered: zeroWidth >= 1 || narrowNbsp >= 1 || mathAlnum >= 4,
      };
    },
  },

  // ── C9. EMOJI BULLET HEADERS ─────────────────────────────────────────────
  {
    id: 'emoji_bullet_headers',
    label: 'Emoji-prefixed bullet/headers (🚀 ✅ ✨ as list markers)',
    short: 'Emoji bullets',
    axis: 'copy',
    category: 'copy',
    weight: 3,
    match: ({ text, headings, paragraphs }) => {
      // Lines that START with a "marketing emoji" — the GPT bullet aesthetic.
      const lead =
        /^\s*(?:[\u2705\u2728\u2734\u2733\u2B50\uD83D\uDE80\uD83D\uDD25\uD83D\uDCA1\uD83C\uDF89\uD83D\uDC4D\uD83D\uDE4C\u26A1\uD83D\uDCAA\uD83D\uDEE0\uD83D\uDC49])/u;
      const lines = [...(headings || []), ...(paragraphs || [])];
      let count = 0;
      const samples = [];
      for (const l of lines) {
        if (lead.test(l)) {
          count++;
          if (samples.length < 3) samples.push(l.slice(0, 40));
        }
      }
      return { count, samples, triggered: count >= 3 };
    },
  },
];
