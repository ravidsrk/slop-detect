// Copy-slop patterns — the *text* axis of the multi-axis slop score
// (FIX-11 #231, FIX-12 #232, C-01..C-16 #265..#279, #200, #201, #202).
//
// HARD RULE (C-15 #278): Formality/contraction rate, lexical diversity/readability,
// positive sentiment/promotional tone, and single-model perplexity are NEVER scored.

import { buildNormalizedTextView, extractOriginalSpan } from './text.js';

function countMatches(text: string, re: RegExp): number {
  const m = text.match(re);
  return m ? m.length : 0;
}

function uniqueMatches(text: string, re: RegExp, max = 5): string[] {
  const set = new Set<string>();
  let m: RegExpExecArray | null;
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  while ((m = g.exec(text)) !== null) {
    set.add((m[0] || '').toLowerCase().trim());
    if (set.size >= 50) break;
  }
  return [...set].slice(0, max);
}

function uniqueOriginalMatches(
  rawText: string,
  re: RegExp,
  max = 5,
): { count: number; samples: string[] } {
  const view = buildNormalizedTextView(rawText);
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  let count = 0;
  const samples: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = g.exec(view.normalized)) !== null) {
    count++;
    const orig = extractOriginalSpan(view, m.index, m.index + m[0].length).trim();
    const key = orig.toLowerCase();
    if (orig && !seen.has(key) && samples.length < max) {
      seen.add(key);
      samples.push(orig);
    }
    if (count >= 500) break;
  }
  return { count, samples };
}

function per1000(count: number, wordCount: number): number {
  if (!wordCount) return 0;
  return (count / wordCount) * 1000;
}

// English function-word list for C-01 language gate
const ENGLISH_FUNCTION_WORDS = new Set([
  'the',
  'of',
  'and',
  'to',
  'in',
  'is',
  'for',
  'that',
  'with',
  'on',
  'as',
  'are',
  'be',
  'by',
  'at',
  'from',
  'or',
  'an',
  'this',
  'your',
  'we',
  'you',
  'our',
  'it',
]);

export function detectEnglishProse(text: string, langAttr?: string): {
  isEnglish: boolean;
  lang: string;
  functionWordRatio: number;
  reason?: string;
} {
  if (langAttr && langAttr.trim()) {
    const cleanLang = langAttr.trim().toLowerCase();
    if (!cleanLang.startsWith('en')) {
      return { isEnglish: false, lang: cleanLang, functionWordRatio: 0, reason: `lang="${langAttr}"` };
    }
  }
  const words = String(text || '')
    .toLowerCase()
    .match(/[a-z\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF]+/gi) || [];
  if (words.length < 20) {
    return { isEnglish: true, lang: 'en', functionWordRatio: 1 };
  }
  let fnHits = 0;
  for (const w of words) {
    if (ENGLISH_FUNCTION_WORDS.has(w.toLowerCase())) fnHits++;
  }
  const ratio = +(fnHits / words.length).toFixed(3);
  if (ratio < 0.04) {
    return { isEnglish: false, lang: 'non-en', functionWordRatio: ratio, reason: 'low-english-function-words' };
  }
  return { isEnglish: true, lang: 'en', functionWordRatio: ratio };
}

// ── Buzzword lexicon (C-07 era-tagged) ──────────────────────────────────────
export const BUZZWORDS_BY_ERA = {
  gpt4_2023_2024: [
    'delve',
    'tapestry',
    'testament',
    'beacon',
    'realm',
    'embark',
    'plethora',
    'myriad',
    'foster',
    'fostering',
    'underscore',
    'underscores',
  ],
  marketing_2024_2026: [
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
    'cutting-edge',
    'game-changer',
    'game-changing',
    'revolutionize',
    'revolutionary',
    'transformative',
    'innovative',
    'synergy',
    'holistic',
    'bespoke',
    'unparalleled',
    'supercharge',
    'turbocharge',
    'next-gen',
    'next-generation',
    'future-proof',
    'reimagine',
    'reimagining',
    'frictionless',
    'effortless',
    'effortlessly',
  ],
};

export const AI_REFERRAL_SOURCES = [
  'chatgpt.com',
  'perplexity.ai',
  'perplexity',
  'claude.ai',
  'gemini.google.com',
  'copilot.microsoft.com',
  'you.com',
  'phind.com',
  'poe.com',
];
const GPT4_ERA_BUZZWORDS = new Set([
  'delve',
  'tapestry',
  'testament',
  'beacon',
  'realm',
  'embark',
  'plethora',
  'myriad',
  'foster',
  'fostering',
  'underscore',
  'underscores',
]);

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

// ── C-02 (#266): Dated Chatbot Markup Leak Registry ─────────────────────────
export const CHATBOT_MARKUP_REGISTRY = [
  {
    id: 'openai_content_reference',
    vendor: 'OpenAI ChatGPT',
    verifiedAt: '2026-10-20',
    re: /:?contentReference\s*\[\s*oaicite\s*:\s*\d+\s*\]\s*(?:\(\s*index\s*=\s*\d+\s*\))?/gi,
  },
  {
    id: 'openai_oaicite_token',
    vendor: 'OpenAI ChatGPT',
    verifiedAt: '2026-10-20',
    re: /\boaicite\b/gi,
  },
  {
    id: 'openai_oai_citation',
    vendor: 'OpenAI ChatGPT',
    verifiedAt: '2026-10-20',
    re: /\boai_citation\s*:\s*\d+/gi,
  },
  {
    id: 'openai_citeturn_compound',
    vendor: 'OpenAI ChatGPT Search',
    verifiedAt: '2026-10-20',
    re: /\bcite(?:turn\d+(?:search|news|view|image|academia|product|finance|sports)\d+)+/gi,
  },
  {
    id: 'openai_turn_search_token',
    vendor: 'OpenAI ChatGPT Search',
    verifiedAt: '2026-10-20',
    re: /\bturn\d+(?:search|news|view|image|academia|product|finance|sports)\d+\b/gi,
  },
  {
    id: 'gemini_attributable_index',
    vendor: 'Google Gemini',
    verifiedAt: '2026-10-20',
    re: /\{\s*"attribution"\s*:\s*\{\s*"attributableIndex"\s*:\s*"[^"]*"\s*\}\s*\}/g,
  },
  {
    id: 'gemini_cite_bracket',
    vendor: 'Google Gemini',
    verifiedAt: '2026-10-20',
    re: /\[\s*cite\s*:\s*\d+(?:\s*,\s*\d+)*\s*\]/gi,
  },
  {
    id: 'gemini_span_marker',
    vendor: 'Google Gemini',
    verifiedAt: '2026-10-20',
    re: /\[span_\d+\]\((?:start|end)_span\)/g,
  },
  {
    id: 'grok_citation_card',
    vendor: 'xAI Grok',
    verifiedAt: '2026-10-20',
    re: /grok_render_citation_card_json|<grok-card\b/gi,
  },
  {
    id: 'openai_file_cite_brackets',
    vendor: 'OpenAI Assistants',
    verifiedAt: '2026-10-20',
    re: /【\d+:\d+†[^】\n]{1,80}】|【\d+†L\d+(?:-L?\d+)?】/g,
  },
  {
    id: 'perplexity_attachment',
    vendor: 'Perplexity',
    verifiedAt: '2026-10-20',
    re: /\[(?:attached_file|web|page|image):\d+\]|ppl-ai-file-upload/gi,
  },
  {
    id: 'openai_canvas_fence',
    vendor: 'OpenAI Canvas',
    verifiedAt: '2026-10-20',
    re: /(?:^|\n):::(?:writing|document|code_block|canvas)\s*\{[^}\n]{0,120}\}/g,
  },
];

// Helper to count in-word invisible characters (FIX-11 #231)
function analyzeInvisibleCharacters(rawText: string) {
  // Remove URLs before scanning in-word invisibles
  const withoutUrls = String(rawText || '').replace(/https?:\/\/\S+/gi, ' ');
  const narrowNbsp = countMatches(withoutUrls, /\u202F/g);
  const nbsp = countMatches(withoutUrls, /\u00A0/g);

  // Strip valid flag tag sequences: U+1F3F4 followed by U+E0020..U+E007E and terminated by U+E007F
  const withoutValidFlags = withoutUrls.replace(
    /\u{1F3F4}[\u{E0020}-\u{E007E}]+\u{E007F}/gu,
    '',
  );
  let tagChars = 0;
  for (const ch of withoutValidFlags) {
    const cp = ch.codePointAt(0)!;
    if (cp >= 0xe0000 && cp <= 0xe007f) tagChars++;
  }

  // Count U+200B, U+2060, U+FEFF inside word tokens (between letters),
  // U+200D inside words when not part of an emoji/modifier ZWJ sequence,
  // U+200C inside words when not adjacent to Arabic/Persian/Devanagari/Bengali script letters.
  const chars = Array.from(withoutValidFlags);
  const isLetter = (c?: string) => Boolean(c && /\p{L}/u.test(c));
  const isEmojiOrModifier = (c?: string) =>
    Boolean(c && /[\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0E\uFE0F\u20E3]/u.test(c));
  const isZwnjScript = (c?: string) =>
    Boolean(c && /[\p{Script=Arabic}\p{Script=Devanagari}\p{Script=Bengali}]/u.test(c));

  let inWordInvisibles = 0;
  let totalZeroWidth = 0;
  for (let i = 0; i < chars.length; i++) {
    const cp = chars[i].codePointAt(0)!;
    const prev = chars[i - 1];
    const next = chars[i + 1];
    if (cp === 0x200b || cp === 0x2060 || cp === 0xfeff) {
      totalZeroWidth++;
      if (isLetter(prev) && isLetter(next)) {
        inWordInvisibles++;
      }
    } else if (cp === 0x200d) {
      if (!isEmojiOrModifier(prev) && !isEmojiOrModifier(next)) {
        totalZeroWidth++;
        if (isLetter(prev) && isLetter(next)) {
          inWordInvisibles++;
        }
      }
    } else if (cp === 0x200c) {
      if (!isZwnjScript(prev) && !isZwnjScript(next)) {
        totalZeroWidth++;
        if (isLetter(prev) && isLetter(next)) {
          inWordInvisibles++;
        }
      }
    }
  }

  let mathAlnum = 0;
  for (const ch of withoutUrls) {
    const cp = ch.codePointAt(0)!;
    if (cp >= 0x1d400 && cp <= 0x1d7ff) mathAlnum++;
  }

  return {
    tagChars,
    inWordInvisibles,
    zeroWidth: totalZeroWidth,
    narrowNbsp,
    nbsp,
    mathAlnum,
  };
}

export const COPY_PATTERNS = [
  // ── C1. BUZZWORD DENSITY (C-07 era-tagged, C-12 normalized) ─────────────
  {
    id: 'buzzword_density',
    label: 'AI buzzword density (leverage / seamless / robust / elevate …)',
    short: 'Buzzwords',
    axis: 'copy',
    category: 'copy',
    weight: 7,
    tier: 'Suggestion',
    statistical: true,
    status: 'active',
    evidenceGrade: 'measured',
    era: '2024-gpt4',
    modelFamilies: ['GPT-4', 'Claude', 'Gemini'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    match: ({ text, wordCount }: any) => {
      const view = buildNormalizedTextView(text || '');
      const lower = view.normalized.toLowerCase();
      const hits: Array<{ word: string; count: number; era: string; sample?: string }> = [];
      let total = 0;
      for (const w of BUZZWORDS) {
        const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`(?:^|[^a-zA-Z-])${esc}(?:[^a-zA-Z-]|$)`, 'gi');
        const c = countMatches(lower, re);
        if (c > 0) {
          const era = GPT4_ERA_BUZZWORDS.has(w) ? 'gpt-4-era' : '2025-2026';
          hits.push({ word: w, count: c, era });
          total += c;
        }
      }
      hits.sort((a, b) => b.count - a.count);
      const density = per1000(total, wordCount);
      const distinct = hits.length;
      return {
        total,
        distinct,
        density: Math.round(density * 10) / 10,
        topWords: hits.slice(0, 6),
        confusablesFolded: view.confusablesFolded,
        triggered: distinct >= 4 || (total >= 3 && density >= 6),
      };
    },
  },

  // ── C2. EM-DASH OVERLOAD (C-07: weight 2, decaying, U+2014 only) ────────
  {
    id: 'em_dash_overload',
    label: 'Em-dash overload (— used as the default connective)',
    short: 'Em-dashes',
    axis: 'copy',
    category: 'copy',
    weight: 2,
    tier: 'Suggestion',
    statistical: true,
    coOccurrenceOnly: true,
    status: 'decaying',
    evidenceGrade: 'measured',
    era: '2025-v0',
    modelFamilies: ['Claude (unconstrained)', 'GPT-4.1/4o era', 'DeepSeek'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    match: ({ text, wordCount }: any) => {
      // Freeburg et al. (arXiv 2603.27006) em-dashes per 1,000 words:
      // Human 1.70, GPT 2.75, Gemini 1.07, Claude 7.99 baseline -> 0.01 constrained.
      // Only U+2014 counts toward triggering; spaced en-dash U+2013 is recorded as evidence.
      const emDashes = countMatches(text || '', /\u2014/g);
      const enDashAsDash = countMatches(text || '', /\s\u2013\s/g);
      const total = emDashes + enDashAsDash;
      const density = per1000(emDashes, wordCount);
      return {
        emDashes,
        enDashAsDash,
        total,
        density: Math.round(density * 10) / 10,
        triggered: (emDashes >= 4 && density >= 7) || (emDashes >= 8 && (wordCount || 0) >= 300),
      };
    },
  },

  // ── C3. ANTITHESIS "not just X, it's Y" (C-08 rising, C-12 normalized) ──
  {
    id: 'antithesis_construction',
    label: '"It\'s not just X — it\'s Y" / "not only … but also" antithesis',
    short: 'Not-just-X',
    axis: 'copy',
    category: 'copy',
    weight: 6,
    tier: 'Suggestion',
    statistical: true,
    status: 'rising',
    evidenceGrade: 'measured',
    era: '2025-v0',
    modelFamilies: ['Claude', 'GPT-4o', 'v0'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    match: ({ text }: any) => {
      const patterns = [
        /\bit['’]?s not just\b/gi,
        /\bnot just (?:a|an|about)\b/gi,
        /\bisn['’]?t just\b/gi,
        /\bnot only\b[^.?!]{1,80}\bbut also\b/gi,
        /\bmore than just\b/gi,
        /\bthis is(?:n['’]?t)? (?:just )?about\b/gi,
      ];
      let total = 0;
      const samples: string[] = [];
      for (const re of patterns) {
        const res = uniqueOriginalMatches(text || '', re, 2);
        total += res.count;
        for (const f of res.samples) if (samples.length < 4) samples.push(f);
      }
      // Also record C-08 bare contrastive forms as non-scoring evidence
      const barePatterns = [
        /\bit['’]?s not\s+(?!just\b)[^,.?!]{2,40},\s*it['’]?s\s+/gi,
        /\bno\s+[a-z][^,.?!]{1,25},\s*no\s+[a-z][^,.?!]{1,25},\s*just\s+/gi,
        /\bNo\s+[A-Za-z][^.?!]{1,25}\.\s+No\s+[A-Za-z][^.?!]{1,25}\./g,
      ];
      let bareForms = 0;
      for (const bre of barePatterns) {
        bareForms += uniqueOriginalMatches(text || '', bre, 2).count;
      }
      return { total, bareForms, samples, triggered: total >= 2 };
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
    tier: 'Suggestion',
    statistical: true,
    status: 'decaying',
    evidenceGrade: 'practitioner',
    era: '2024-gpt4',
    modelFamilies: ['GPT-4'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    match: ({ text }: any) => {
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
      const samples: string[] = [];
      for (const re of phrases) {
        const res = uniqueOriginalMatches(text || '', re, 1);
        total += res.count;
        for (const f of res.samples) if (samples.length < 4) samples.push(f);
      }
      return { total, samples, triggered: total >= 1 };
    },
  },

  // ── C5. FORMULAIC CLOSERS (C-07 position-aware, historical) ──────────────
  {
    id: 'formulaic_closers',
    label: 'Essay-style closers ("In conclusion", "In summary", "Ultimately")',
    short: 'Closers',
    axis: 'copy',
    category: 'copy',
    weight: 4,
    tier: 'Suggestion',
    statistical: true,
    status: 'historical',
    evidenceGrade: 'practitioner',
    era: '2024-gpt4',
    modelFamilies: ['GPT-3.5', 'GPT-4'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    match: ({ text, paragraphs, blocks }: any) => {
      const re =
        /\b(?:in conclusion|in summary|to sum up|to summarize|all in all|ultimately,|in the end,|when all is said and done)\b/gi;
      // C-07: Position-aware when multiple paragraphs/blocks exist: check last two prose blocks
      let targetText = String(text || '');
      if (Array.isArray(blocks) && blocks.length >= 3) {
        targetText = blocks
          .slice(-2)
          .map((b: any) => b.text || '')
          .join('\n\n');
      } else if (Array.isArray(paragraphs) && paragraphs.length >= 3) {
        targetText = paragraphs.slice(-2).join('\n\n');
      }
      const res = uniqueOriginalMatches(targetText, re, 3);
      return { total: res.count, samples: res.samples, triggered: res.count >= 1 };
    },
  },

  // ── C6. RULE-OF-THREE TRICOLON (C-07 decaying, co-occurrence) ───────────
  {
    id: 'rule_of_three',
    label: 'Rule-of-three adjective tricolons ("fast, reliable, and scalable")',
    short: 'Rule of three',
    axis: 'copy',
    category: 'copy',
    weight: 4,
    tier: 'Suggestion',
    statistical: true,
    coOccurrenceOnly: true,
    status: 'decaying',
    evidenceGrade: 'practitioner',
    era: '2024-gpt4',
    modelFamilies: ['GPT-4', 'Claude'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    match: ({ text, wordCount }: any) => {
      const re = /\b([a-z]{4,15}),\s+([a-z]{4,15}),\s+and\s+([a-z]{4,15})\b/gi;
      const total = countMatches(text || '', re);
      const samples = uniqueMatches(text || '', re, 3);
      const re2 = /\b([a-z]{4,15}),\s+([a-z]{4,15}),\s+([a-z]{4,15})\.\s/gi;
      const total2 = countMatches(text || '', re2);
      const sum = total + total2;
      const density = per1000(sum, wordCount || 100);
      return {
        total: sum,
        density: Math.round(density * 10) / 10,
        samples,
        triggered: sum >= 3 && density >= 5,
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
    tier: 'Suggestion',
    statistical: true,
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2024-gpt4',
    modelFamilies: ['GPT-4', 'Claude'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    match: ({ text }: any) => {
      const re = /\bwhether you['’]?re\b[^.?!]{1,80}\bor\b/gi;
      const res = uniqueOriginalMatches(text || '', re, 2);
      return { total: res.count, samples: res.samples, triggered: res.count >= 1 };
    },
  },

  // ── C8. UNICODE ARTIFACTS (retired in FIX-11: split into hidden_tag_characters, invisible_characters, fake_bold_math_alnum) ─
  {
    id: 'unicode_artifacts',
    label: 'Invisible Unicode or mathematical fake-bold characters in text',
    short: 'Unicode tells',
    axis: 'copy',
    category: 'copy',
    weight: 0,
    tier: 'Warning',
    statistical: false,
    status: 'retired',
    evidenceGrade: 'standard',
    era: 'baseline',
    modelFamilies: [],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    match: () => ({
      zeroWidth: 0,
      inWordInvisibles: 0,
      tagChars: 0,
      narrowNbsp: 0,
      nbsp: 0,
      mathAlnum: 0,
      total: 0,
      retired: true,
      replacedBy: ['hidden_tag_characters', 'invisible_characters', 'fake_bold_math_alnum'],
      triggered: false,
    }),
  },

  // ── C9. EMOJI BULLET HEADERS (legacy scored emoji list) ───────────────────
  {
    id: 'emoji_bullet_headers',
    label: 'Emoji-prefixed bullet/headers (🚀 ✅ ✨ as list markers)',
    short: 'Emoji bullets',
    axis: 'copy',
    category: 'copy',
    weight: 3,
    tier: 'Suggestion',
    statistical: true,
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2024-gpt4',
    modelFamilies: ['GPT-4', 'GPT-4o'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    match: ({ headings, paragraphs }: any) => {
      const lead =
        /^\s*(?:[\u2705\u2728\u2734\u2733\u2B50\u26A1]|\u{1F680}|\u{1F525}|\u{1F4A1}|\u{1F389}|\u{1F44D}|\u{1F64C}|\u{1F4AA}|\u{1F6E0}|\u{1F449})/u;
      const lines = [...(headings || []), ...(paragraphs || [])];
      let count = 0;
      const samples: string[] = [];
      for (const l of lines) {
        if (lead.test(l)) {
          count++;
          if (samples.length < 3) samples.push(l.slice(0, 40));
        }
      }
      return { count, samples, triggered: count >= 3 };
    },
  },

  // ── FIX-11a. HIDDEN TAG CHARACTERS (weight 0 under K-04) ─────────────────
  {
    id: 'hidden_tag_characters',
    label: 'Hidden instruction characters (prompt-injection or smuggling vector)',
    short: 'Hidden tag chars',
    axis: 'copy',
    category: 'copy',
    weight: 0,
    tier: 'Warning',
    statistical: false,
    status: 'review',
    evidenceGrade: 'standard',
    era: '2025-v0',
    modelFamilies: [],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    match: ({ text }: any) => {
      const stats = analyzeInvisibleCharacters(text || '');
      return {
        tagChars: stats.tagChars,
        triggered: stats.tagChars >= 1,
      };
    },
  },

  // ── FIX-11b. INVISIBLE CHARACTERS (weight 0 under K-04) ──────────────────
  {
    id: 'invisible_characters',
    label: 'Invisible characters in text (often humanizer or paste residue)',
    short: 'Invisible chars',
    axis: 'copy',
    category: 'copy',
    weight: 0,
    tier: 'Warning',
    statistical: false,
    status: 'review',
    evidenceGrade: 'standard',
    era: '2025-v0',
    modelFamilies: [],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    match: ({ text }: any) => {
      const stats = analyzeInvisibleCharacters(text || '');
      return {
        inWordInvisibles: stats.inWordInvisibles,
        narrowNbsp: stats.narrowNbsp,
        triggered: stats.inWordInvisibles >= 2,
      };
    },
  },

  // ── FIX-11c. FAKE BOLD MATH ALNUM (keeps shipped weight 4) ───────────────
  {
    id: 'fake_bold_math_alnum',
    label: 'Mathematical Alphanumeric Symbols used as fake bold/italic in prose',
    short: 'Fake-bold Unicode',
    axis: 'copy',
    category: 'copy',
    weight: 4,
    tier: 'Suggestion',
    statistical: false,
    status: 'active',
    evidenceGrade: 'standard',
    era: '2024-gpt4',
    modelFamilies: [],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    match: ({ text }: any) => {
      const stats = analyzeInvisibleCharacters(text || '');
      return {
        mathAlnum: stats.mathAlnum,
        triggered: stats.mathAlnum >= 4,
      };
    },
  },

  // ── C-02 (#266). CHATBOT MARKUP LEAK (weight 0 under K-04) ───────────────
  {
    id: 'chatbot_markup_leak',
    label: 'Leaked chatbot citation or internal UI markup (oaicite / attributableIndex /grok-card)',
    short: 'Chatbot markup',
    axis: 'copy',
    category: 'copy',
    weight: 0,
    proposedWeight: 8,
    tier: 'Error',
    statistical: false,
    status: 'review',
    evidenceGrade: 'practitioner',
    era: '2025-v0',
    modelFamilies: ['ChatGPT', 'Gemini', 'Grok', 'Perplexity'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    match: ({ text, attributes, blocks }: any) => {
      const view = buildNormalizedTextView(text || '');
      const attrString = Array.isArray(attributes)
        ? attributes.map((a: any) => `${a.attr}=${a.value}`).join('\n')
        : '';
      const combined = view.normalized + (attrString ? '\n' + attrString : '');

      const matchedFamilies: string[] = [];
      const samples: string[] = [];
      let total = 0;

      for (const entry of CHATBOT_MARKUP_REGISTRY) {
        const g = new RegExp(
          entry.re.source,
          entry.re.flags.includes('g') ? entry.re.flags : entry.re.flags + 'g',
        );
        let m: RegExpExecArray | null;
        let famCount = 0;
        while ((m = g.exec(combined)) !== null) {
          famCount++;
          total++;
          if (samples.length < 5) samples.push(m[0].slice(0, 80));
          if (famCount >= 50) break;
        }
        if (famCount > 0) matchedFamilies.push(entry.id);
      }

      // Downgrade to Warning if inside blockquote/q or meta-discussion of >=3 families near "artifact|tell|sign"
      const allInQuote =
        Array.isArray(blocks) &&
        blocks.length > 0 &&
        blocks
          .filter((b: any) => CHATBOT_MARKUP_REGISTRY.some((r) => new RegExp(r.re.source, 'i').test(b.text || '')))
          .every((b: any) => b.inQuote);
      const isMetaDiscussion =
        matchedFamilies.length >= 3 && /\b(?:artifact|tell|sign|detector|regex)\b/i.test(view.normalized);
      const effectiveTier = allInQuote || isMetaDiscussion ? 'Warning' : 'Error';

      return {
        total,
        families: matchedFamilies,
        samples,
        effectiveTier,
        downgraded: effectiveTier !== 'Error',
        triggered: total >= 1,
      };
    },
  },

  // ── C-03 (#267). CHATBOT REPLY RESIDUE (weight 0 under K-04) ─────────────
  {
    id: 'chatbot_reply_residue',
    label: 'Chatbot turn framing, refusal, or UI Chrome pasted into page copy',
    short: 'Reply residue',
    axis: 'copy',
    category: 'copy',
    weight: 0,
    proposedWeight: 6,
    tier: 'Error',
    statistical: false,
    status: 'review',
    evidenceGrade: 'practitioner',
    era: '2024-gpt4',
    modelFamilies: ['ChatGPT', 'Claude', 'Gemini'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    match: ({ text, blocks }: any) => {
      // Exclude blocks inside chat demos or blockquotes
      let cleanText = String(text || '');
      if (Array.isArray(blocks) && blocks.length > 0) {
        cleanText = blocks
          .filter((b: any) => !b.inChatDemo && !b.inQuote)
          .map((b: any) => b.text || '')
          .join('\n\n');
      }
      const view = buildNormalizedTextView(cleanText);

      const errorPhrases = [
        /\bas an ai(?: language model| assistant)?\b/gi,
        /\bas a large language model\b/gi,
        /\bi cannot fulfill this request\b/gi,
        /\bmy knowledge cutoff\b/gi,
      ];
      const warningPhrases = [
        /(?:^|\n)\s*(?:certainly|sure|of course|absolutely)!\s+here(?:'s| is)\b/gi,
        /\bi hope this helps!\s*(?:let me know|feel free)/gi,
        /\blet me know if you(?:'d| would) like me to\b/gi,
        /\bregenerate response\b/gi,
        /\bcontinue generating\b/gi,
        /(?:^|\n)\s*(?:chatgpt|claude|copilot) said:/gi,
        /(?:^|\n)\s*you said:/gi,
      ];

      let errorHits = 0;
      let warningHits = 0;
      const samples: string[] = [];

      for (const re of errorPhrases) {
        const m = view.normalized.match(re);
        if (m) {
          errorHits += m.length;
          for (const s of m) if (samples.length < 4) samples.push(s.trim());
        }
      }
      for (const re of warningPhrases) {
        const m = view.normalized.match(re);
        if (m) {
          warningHits += m.length;
          for (const s of m) if (samples.length < 4) samples.push(s.trim());
        }
      }

      // "the user" is Suggestion-tier evidence ONLY, never triggers.
      const theUserCount = countMatches(view.normalized, /\bthe user\b/gi);
      const total = errorHits + warningHits;
      const effectiveTier = errorHits > 0 ? 'Error' : warningHits > 0 ? 'Warning' : 'Suggestion';

      return {
        total,
        errorHits,
        warningHits,
        theUserCount,
        effectiveTier,
        samples,
        triggered: total >= 1,
      };
    },
  },

  // ── C-04 (#268). AI REFERRAL UTM LINKS (weight 0 under K-04) ─────────────
  {
    id: 'ai_referral_utm_links',
    label: 'Links copied from an AI assistant (utm_source=chatgpt.com / openai / copilot.com)',
    short: 'AI UTM links',
    axis: 'copy',
    category: 'copy',
    weight: 0,
    proposedWeight: 3,
    tier: 'Warning',
    statistical: false,
    status: 'review',
    evidenceGrade: 'standard',
    era: '2025-v0',
    modelFamilies: ['ChatGPT', 'Copilot', 'Grok'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    match: ({ links }: any) => {
      // Inspects parsed a[href] query parameters ONLY — never prose text.
      const linkList = Array.isArray(links) ? links : [];
      const aiSources = new Set(['chatgpt.com', 'openai', 'copilot.com']);
      const matchedHrefs: string[] = [];

      for (const item of linkList) {
        const rawHref = typeof item === 'string' ? item : item?.href;
        if (!rawHref || typeof rawHref !== 'string') continue;
        try {
          const u = new URL(rawHref, 'https://example.invalid');
          const utmSource = (u.searchParams.get('utm_source') || '').toLowerCase();
          const referrer = (u.searchParams.get('referrer') || '').toLowerCase();
          if (aiSources.has(utmSource) || referrer === 'grok.com') {
            matchedHrefs.push(rawHref.slice(0, 120));
          }
        } catch {
          // ignore malformed href
        }
      }

      return {
        count: matchedHrefs.length,
        samples: matchedHrefs.slice(0, 5),
        triggered: matchedHrefs.length >= 1,
      };
    },
  },

  // ── C-05 (#269). UNFILLED PLACEHOLDERS (weight 0 under K-04) ─────────────
  {
    id: 'unfilled_placeholders',
    label: 'Unfinished copy (unfilled placeholders)',
    short: 'Placeholders',
    axis: 'copy',
    category: 'copy',
    weight: 0,
    proposedWeight: 5,
    tier: 'Warning',
    statistical: false,
    status: 'review',
    evidenceGrade: 'practitioner',
    era: 'baseline',
    modelFamilies: [],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    match: ({ text }: any) => {
      const s = String(text || '');
      const unambiguous = [
        /\[(?:Your|Insert|Add|Enter)\s[^\]\n]{1,40}\]/g,
        /\[(?:Company|Product|Brand|Business|Client|Customer|Founder|Startup) Name\]/gi,
        /\((?:Add|Insert) [^)]{1,40} here\)/gi,
        /\b(?:INSERT|PASTE)_[A-Z0-9_]+\b/g,
      ];
      const generic = [
        /\b20\d\d-[Xx]{2}-[Xx]{2}\b/g,
        /\{\{\s*[A-Za-z_][\w.]*\s*\}\}/g,
      ];

      let unambiguousHits = 0;
      let genericHits = 0;
      const samples: string[] = [];

      for (const re of unambiguous) {
        const m = s.match(re);
        if (m) {
          unambiguousHits += m.length;
          for (const hit of m) if (samples.length < 5) samples.push(hit);
        }
      }
      for (const re of generic) {
        const m = s.match(re);
        if (m) {
          genericHits += m.length;
          for (const hit of m) if (samples.length < 5) samples.push(hit);
        }
      }

      return {
        unambiguousHits,
        genericHits,
        total: unambiguousHits + genericHits,
        samples,
        triggered: unambiguousHits >= 1 || genericHits >= 2,
      };
    },
  },

  // ── C-06 (#270). LEAKED MARKDOWN (weight 0 under K-04) ───────────────────
  {
    id: 'leaked_markdown',
    label: 'Unrendered raw Markdown syntax in visible non-code text',
    short: 'Raw Markdown',
    axis: 'copy',
    category: 'copy',
    weight: 0,
    proposedWeight: 4,
    tier: 'Warning',
    statistical: false,
    status: 'review',
    evidenceGrade: 'practitioner',
    era: 'baseline',
    modelFamilies: [],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    match: ({ text }: any) => {
      const s = String(text || '');
      const boldItalic = countMatches(s, /(\*\*|__)(?=\S)([^*\n]{1,80}?)(?<=\S)\1/g);
      const headingSyntax = countMatches(s, /(?:^|\n)\s*#{1,6}\s+[A-Za-z0-9][^\n]{1,80}/g);
      const inlineLinks = countMatches(s, /\[([^\]\n]{1,80})\]\((https?:\/\/[^\s)]+)\)/g);
      const hrLines = countMatches(s, /(?:^|\n)\s*(?:---|\*\*\*|___)\s*(?:\n|$)/g);

      const kinds = [boldItalic > 0, headingSyntax > 0, inlineLinks > 0, hrLines > 0].filter(Boolean).length;
      const total = boldItalic + headingSyntax + inlineLinks + hrLines;
      const markdownMentions = countMatches(s, /\bmarkdown\b/gi);
      const downgraded = markdownMentions >= 2;

      return {
        boldItalic,
        headingSyntax,
        inlineLinks,
        hrLines,
        kinds,
        total,
        downgraded,
        effectiveTier: downgraded ? 'Suggestion' : 'Warning',
        triggered: total >= 2 || kinds >= 2,
      };
    },
  },

  // ── #202. STRUCTURAL FAKE SOCIAL PROOF (weight 0 under K-04) ─────────────
  {
    id: 'structural_fake_social_proof',
    label: 'Placeholder avatar services, duplicated avatar assets, or unattributed testimonials',
    short: 'Fake social proof',
    axis: 'copy',
    category: 'copy',
    weight: 0,
    tier: 'Warning',
    statistical: false,
    status: 'review',
    evidenceGrade: 'practitioner',
    era: '2025-v0',
    modelFamilies: ['v0', 'lovable', 'bolt'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    match: ({ attributes, testimonials }: any) => {
      const attrs = Array.isArray(attributes) ? attributes : [];
      const placeholderHosts = /(?:i\.pravatar\.cc|api\.dicebear\.com|randomuser\.me\/api\/portraits|ui-avatars\.com)/i;
      const placeholderHits: string[] = [];
      const avatarSrcs: string[] = [];

      for (const a of attrs) {
        if (a && typeof a.value === 'string') {
          if (placeholderHosts.test(a.value)) {
            placeholderHits.push(a.value.slice(0, 80));
          }
          if (a.attr === 'src' && /avatar|testimonial|user|profile/i.test(a.value)) {
            avatarSrcs.push(a.value);
          }
        }
      }

      const testList = Array.isArray(testimonials) ? testimonials : [];
      let unattributedCount = 0;
      for (const t of testList) {
        if (t && t.avatarSrc) avatarSrcs.push(t.avatarSrc);
        if (t && !t.hasRole && !t.hasCompany && !t.hasLink) {
          unattributedCount++;
        }
      }

      const uniqueAvatars = new Set(avatarSrcs);
      const duplicateAvatars = avatarSrcs.length >= 2 ? avatarSrcs.length - uniqueAvatars.size : 0;

      return {
        placeholderAvatarHits: placeholderHits.length,
        duplicateAvatars,
        unattributedTestimonials: unattributedCount,
        samples: placeholderHits.slice(0, 4),
        triggered:
          placeholderHits.length >= 1 || duplicateAvatars >= 1 || unattributedCount >= 2,
      };
    },
  },

  // ── C-08 (#272). BARE ANTITHESIS (weight 0 under K-04) ───────────────────
  {
    id: 'bare_antithesis',
    label: 'Bare contrastive frames ("It\'s not X, it\'s Y" / "No X, no Y, just Z")',
    short: 'Bare antithesis',
    axis: 'copy',
    category: 'copy',
    weight: 0,
    tier: 'Suggestion',
    statistical: true,
    status: 'review',
    evidenceGrade: 'practitioner',
    era: '2026-opus4.6',
    modelFamilies: ['Claude', 'GPT-4o'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    match: ({ text }: any) => {
      const patterns = [
        /\bit['’]?s not\s+(?!just\b)[^,.?!]{2,40},\s*it['’]?s\s+/gi,
        /\bno\s+[a-z][^,.?!]{1,25},\s*no\s+[a-z][^,.?!]{1,25},\s*just\s+/gi,
        /\bNo\s+[A-Za-z][^.?!]{1,25}\.\s+No\s+[A-Za-z][^.?!]{1,25}\./g,
      ];
      let total = 0;
      const samples: string[] = [];
      const nodeIds: string[] = [];
      for (const re of patterns) {
        const res = uniqueOriginalMatches(text || '', re, 2);
        total += res.count;
        for (const s of res.samples) {
          if (samples.length < 4) samples.push(s);
          nodeIds.push(`copy:no_x_no_y:${s.slice(0, 24).toLowerCase()}`);
        }
      }
      return { total, samples, nodeIds, triggered: total >= 2 };
    },
  },

  // ── C-09 (#273). EMOJI HEADING RATIO (weight 0 under K-04) ───────────────
  {
    id: 'emoji_heading_ratio',
    label: 'Lead emoji ratio ≥30% across ≥6 headings or list items',
    short: 'Emoji ratio',
    axis: 'copy',
    category: 'copy',
    weight: 0,
    tier: 'Suggestion',
    statistical: true,
    status: 'review',
    evidenceGrade: 'practitioner',
    era: '2025-v0',
    modelFamilies: ['GPT-4o'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    match: ({ headings, listItems, links }: any) => {
      const lead =
        /^\s*(?:[\u2705\u2728\u2734\u2733\u2B50\u26A1]|\u{1F680}|\u{1F525}|\u{1F4A1}|\u{1F389}|\u{1F44D}|\u{1F64C}|\u{1F4AA}|\u{1F6E0}|\u{1F449}|\u{1F9E0}|\u{1F539}|\u{1F4CC})/u;
      const items = [
        ...(Array.isArray(headings) ? headings : []),
        ...(Array.isArray(listItems) ? listItems : []),
      ];
      let count = 0;
      for (const h of items) {
        if (lead.test(h)) count++;
      }
      const total = items.length;
      const ratio = total > 0 ? +(count / total).toFixed(3) : 0;

      // Record CTA emoji in evidence only
      let ctaEmoji = 0;
      if (Array.isArray(links)) {
        for (const l of links) {
          if (l && typeof l.text === 'string' && lead.test(l.text)) ctaEmoji++;
        }
      }

      return {
        count,
        total,
        ratio,
        ctaEmoji,
        triggered: total >= 6 && ratio >= 0.3,
      };
    },
  },

  // ── C-13a (#276). ANNOUNCED STRUCTURE (weight 0 under K-04) ──────────────
  {
    id: 'announced_structure',
    label: 'Announced essay structure in opening prose ("In this post, we\'ll explore …")',
    short: 'Announced structure',
    axis: 'copy',
    category: 'copy',
    weight: 0,
    tier: 'Suggestion',
    statistical: true,
    status: 'review',
    evidenceGrade: 'practitioner',
    era: '2024-gpt4',
    modelFamilies: ['GPT-4', 'Claude'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    match: ({ text, paragraphs, blocks }: any) => {
      let opening = String(text || '').slice(0, 800);
      if (Array.isArray(blocks) && blocks.length > 0) {
        opening = blocks
          .filter((b: any) => !b.inHero)
          .slice(0, 2)
          .map((b: any) => b.text || '')
          .join('\n\n') || opening;
      } else if (Array.isArray(paragraphs) && paragraphs.length > 0) {
        opening = paragraphs.slice(0, 2).join('\n\n');
      }
      const re =
        /\b(?:in this (?:post|article|guide|page|piece|section)\b[^.?!]{0,60}\b(?:we(?:'ll| will)|you(?:'ll| will)|let['’]?s) (?:cover|explore|examine|walk through|break down|look at)|by the end of this (?:post|article|guide|page))\b/gi;
      const res = uniqueOriginalMatches(opening, re, 2);
      return {
        count: res.count,
        samples: res.samples,
        triggered: res.count >= 1,
      };
    },
  },

  // ── C-13b (#276). RESTATED THESIS CLOSER (weight 0 under K-04) ───────────
  {
    id: 'restated_thesis_closer',
    label: 'Closing paragraph restates H1/opening thesis with ≥50% content-word overlap',
    short: 'Restated thesis',
    axis: 'copy',
    category: 'copy',
    weight: 0,
    tier: 'Suggestion',
    statistical: true,
    status: 'review',
    evidenceGrade: 'hypothesis',
    era: '2024-gpt4',
    modelFamilies: ['GPT-4', 'Claude'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    match: ({ text, headings, paragraphs, wordCount }: any) => {
      const paras = Array.isArray(paragraphs) && paragraphs.length >= 2
        ? paragraphs
        : String(text || '').split(/\n\n+/).filter(Boolean);

      // Compute legacy_vs_modern_frame feature density (per 1,000 words)
      let legacyModernCo = 0;
      const legacyRe = /\b(?:traditional|legacy|old way|used to|manual|outdated)\b/i;
      const modernRe = /\b(?:modern|today|instead|automated|new way)\b/i;
      for (const p of paras) {
        if (legacyRe.test(p) && modernRe.test(p)) legacyModernCo++;
      }
      const legacyVsModernPer1000 = +per1000(legacyModernCo, wordCount || 100).toFixed(2);

      if (paras.length < 2) {
        return { overlap: 0, legacyVsModernPer1000, triggered: false };
      }

      const openingSource = (Array.isArray(headings) && headings[0]) ? headings[0] : paras[0];
      const closingPara = paras[paras.length - 1];
      const summaryLead =
        /^\s*(?:in (?:conclusion|summary|short)|to (?:sum up|summarize|wrap up)|ultimately|at the end of the day|overall)\b/i;

      const contentWords = (s: string) =>
        new Set(
          (s.toLowerCase().match(/[a-z]{4,}/g) || []).filter(
            (w) => !ENGLISH_FUNCTION_WORDS.has(w),
          ),
        );

      const openSet = contentWords(openingSource);
      const closeSet = contentWords(closingPara);
      let intersection = 0;
      for (const w of openSet) if (closeSet.has(w)) intersection++;
      const denom = Math.max(1, Math.min(openSet.size, closeSet.size));
      const overlap = openSet.size > 0 && closeSet.size > 0 ? +(intersection / denom).toFixed(2) : 0;

      const startsWithSummary = summaryLead.test(closingPara);
      return {
        startsWithSummary,
        overlap,
        legacyVsModernPer1000,
        triggered: startsWithSummary && overlap >= 0.5 && openSet.size >= 3,
      };
    },
  },

  // ── C-16 (#279). CONTEXT LEAK COPY (weight 0 under K-04) ─────────────────
  {
    id: 'context_leak_copy',
    label: 'Context-inappropriate dev/privacy boilerplate ("never leaves your browser")',
    short: 'Context leak',
    axis: 'copy',
    category: 'copy',
    weight: 0,
    tier: 'Suggestion',
    statistical: true,
    status: 'review',
    evidenceGrade: 'practitioner',
    era: '2025-v0',
    modelFamilies: ['Claude', 'Cursor', 'v0'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    match: ({ text }: any) => {
      const s = String(text || '');
      const neverLeaves = countMatches(s, /\bnever leave(?:s)? your (?:browser|device|machine)\b/gi);
      const builtWritten = countMatches(
        s,
        /\bbuilt with [a-z0-9.+-]+[^.?!\n]{0,40}\bwritten (?:in|from) [a-z0-9.+-]+/gi,
      );
      const noXNoYMatches = uniqueOriginalMatches(
        s,
        /\bno\s+[a-z][^,.?!]{1,25},\s*no\s+[a-z][^,.?!]{1,25},\s*just\s+/gi,
        3,
      );
      const lowercaseTagline = countMatches(s, /(?:^|\n)\s*one [a-z]{3,15}\.\s+one [a-z]{3,15}\./g);

      const nodeIds = noXNoYMatches.samples.map(
        (m) => `copy:no_x_no_y:${m.slice(0, 24).toLowerCase()}`,
      );
      const families = {
        never_leaves_browser: neverLeaves,
        built_written_stack: builtWritten,
        no_x_no_y: noXNoYMatches.count,
        lowercase_one_noun_tagline: lowercaseTagline,
      };
      const total = neverLeaves + builtWritten + noXNoYMatches.count + lowercaseTagline;

      return {
        families,
        total,
        nodeIds,
        triggered: total >= 1,
      };
    },
  },

  // ── #200a. TRAILING PARTICIPIAL CLAUSES (weight 0 under K-04) ────────────
  {
    id: 'trailing_participial_clauses',
    label: 'Trailing participial clauses (", ensuring / unlocking / enabling …")',
    short: 'Participial tails',
    axis: 'copy',
    category: 'copy',
    weight: 0,
    tier: 'Suggestion',
    statistical: true,
    minProseWords: 300,
    status: 'review',
    evidenceGrade: 'hypothesis',
    era: '2024-gpt4',
    modelFamilies: ['GPT-4', 'Claude'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    match: ({ text, wordCount }: any) => {
      const s = String(text || '');
      const re = /,\s+(?:ensuring|enabling|empowering|unlocking|fostering|driving|delivering|creating|providing|allowing|making|helping|streamlining|transforming)\b[^.?!]{5,80}[.?!]/gi;
      const count = countMatches(s, re);
      const samples = uniqueMatches(s, re, 3);
      const nomMatches = countMatches(s, /\b[a-z]{4,}(?:tion|ment|ness|ity)\b/gi);
      const nominalizationDensity = +per1000(nomMatches, wordCount || 100).toFixed(1);
      const density = +per1000(count, wordCount || 100).toFixed(1);
      return {
        count,
        density,
        nominalizationDensity,
        samples,
        triggered: count >= 3 && (wordCount || 0) >= 300,
      };
    },
  },

  // ── #200b. SENTENCE LENGTH UNIFORMITY (weight 0, raw stats only) ─────────
  {
    id: 'sentence_length_uniformity',
    label: 'Paragraph sentence-length dispersion statistics (mean, SD, CV, IQR)',
    short: 'Sentence uniformity',
    axis: 'copy',
    category: 'copy',
    weight: 0,
    tier: 'Suggestion',
    statistical: true,
    minProseWords: 300,
    status: 'review',
    evidenceGrade: 'hypothesis',
    era: '2025-v0',
    modelFamilies: [],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    match: ({ text, paragraphs }: any) => {
      const source =
        Array.isArray(paragraphs) && paragraphs.length > 0 ? paragraphs.join(' ') : String(text || '');
      // Protect common abbreviations before splitting sentences
      const cleaned = source.replace(/\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e|Inc|Ltd|Co)\./gi, '$&_');
      const sentences = cleaned
        .split(/[.!?]+(?:\s+|$)/)
        .map((s) => s.trim().split(/\s+/).filter(Boolean).length)
        .filter((len) => len >= 3);

      if (sentences.length < 15) {
        return {
          sentenceCount: sentences.length,
          mean: null,
          sd: null,
          cv: null,
          iqr: null,
          triggered: false,
        };
      }

      const n = sentences.length;
      const mean = sentences.reduce((a, b) => a + b, 0) / n;
      const variance = sentences.reduce((a, b) => a + (b - mean) * (b - mean), 0) / n;
      const sd = Math.sqrt(variance);
      const cv = mean > 0 ? sd / mean : 0;
      const sorted = sentences.slice().sort((a, b) => a - b);
      const q1 = sorted[Math.floor(n * 0.25)];
      const q3 = sorted[Math.floor(n * 0.75)];
      const iqr = q3 - q1;

      return {
        sentenceCount: n,
        mean: +mean.toFixed(2),
        sd: +sd.toFixed(2),
        cv: +cv.toFixed(3),
        iqr,
        // #200: No threshold is set until K-01 measures discrimination.
        triggered: false,
      };
    },
  },

  // ── #201. EXCESS VOCABULARY LOG-ODDS (weight 0 under K-04) ───────────────
  {
    id: 'excess_vocabulary_log_odds',
    label: "Corpus-derived Fightin' Words excess vocabulary log-odds score",
    short: 'Log-odds vocab',
    axis: 'copy',
    category: 'copy',
    weight: 0,
    tier: 'Suggestion',
    statistical: true,
    minProseWords: 300,
    status: 'review',
    evidenceGrade: 'hypothesis',
    era: '2026-opus4.6',
    modelFamilies: [],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    match: ({ text, wordCount, logOddsLexicon }: any) => {
      // Consumes a caller-supplied lexicon produced by computeFightinWordsLogOdds().
      // Never invents a hand-made tier list or fake frequencies.
      if (!Array.isArray(logOddsLexicon) || logOddsLexicon.length === 0) {
        return { matchedTerms: [], score: 0, triggered: false };
      }
      const tokens = (String(text || '').toLowerCase().match(/[a-z]+(?:-[a-z]+)*/g) || []);
      const counts = new Map<string, number>();
      for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1);

      const matchedTerms: Array<{ term: string; count: number; zScore: number }> = [];
      let weightedSum = 0;
      for (const entry of logOddsLexicon) {
        if (!entry || !entry.term || typeof entry.zScore !== 'number' || entry.zScore < 3) continue;
        const c = counts.get(String(entry.term).toLowerCase()) || 0;
        if (c > 0) {
          matchedTerms.push({ term: entry.term, count: c, zScore: entry.zScore });
          weightedSum += c * entry.zScore;
        }
      }
      const normScore = wordCount ? +(weightedSum / Math.sqrt(wordCount)).toFixed(3) : 0;
      return {
        matchedTerms: matchedTerms.slice(0, 10),
        score: normScore,
        triggered: matchedTerms.length >= 3 && normScore >= 3,
      };
    },
  },
];

// ── #201: Fightin' Words log-odds with informative Dirichlet prior ───────────
// Monroe, Colaresi & Quinn (2008), Political Analysis 16(4):372-403.
export function computeFightinWordsLogOdds(
  aiPages: Array<{ text: string; domain?: string }>,
  humanPages: Array<{ text: string; domain?: string }>,
  opts: { minZ?: number; minSites?: number; priorScale?: number } = {},
): Array<{
  term: string;
  aiCount: number;
  humanCount: number;
  siteCount: number;
  logOddsRatio: number;
  zScore: number;
}> {
  const minZ = opts.minZ ?? 3.0;
  const minSites = opts.minSites ?? 3;
  const priorScale = opts.priorScale ?? 10;

  const tokenize = (s: string) =>
    (String(s || '').toLowerCase().match(/[a-z]{3,}(?:-[a-z]{2,})*/g) || []).filter(
      (w) => !ENGLISH_FUNCTION_WORDS.has(w),
    );

  const aiCounts = new Map<string, number>();
  const humanCounts = new Map<string, number>();
  const termSites = new Map<string, Set<string>>();
  let nAi = 0;
  let nHuman = 0;

  aiPages.forEach((p, idx) => {
    const site = p.domain || `ai-site-${idx}`;
    for (const w of tokenize(p.text)) {
      aiCounts.set(w, (aiCounts.get(w) || 0) + 1);
      nAi++;
      const s = termSites.get(w) || new Set<string>();
      s.add(site);
      termSites.set(w, s);
    }
  });

  humanPages.forEach((p) => {
    for (const w of tokenize(p.text)) {
      humanCounts.set(w, (humanCounts.get(w) || 0) + 1);
      nHuman++;
    }
  });

  const vocab = new Set<string>([...aiCounts.keys(), ...humanCounts.keys()]);
  const totalWords = Math.max(1, nAi + nHuman);
  const alpha0 = Math.max(1, vocab.size * priorScale);

  const results: Array<{
    term: string;
    aiCount: number;
    humanCount: number;
    siteCount: number;
    logOddsRatio: number;
    zScore: number;
  }> = [];

  for (const term of vocab) {
    const yAi = aiCounts.get(term) || 0;
    const yHu = humanCounts.get(term) || 0;
    const sites = termSites.get(term)?.size || 0;
    if (sites < minSites) continue;

    // Informative Dirichlet prior proportional to background frequency
    const bgFreq = (yAi + yHu) / totalWords;
    const alphaW = Math.max(0.5, bgFreq * alpha0);

    const numAi = yAi + alphaW;
    const denAi = Math.max(0.5, nAi + alpha0 - yAi - alphaW);
    const numHu = yHu + alphaW;
    const denHu = Math.max(0.5, nHuman + alpha0 - yHu - alphaW);

    const delta = Math.log(numAi / denAi) - Math.log(numHu / denHu);
    const variance = 1 / numAi + 1 / denAi + 1 / numHu + 1 / denHu;
    const zScore = delta / Math.sqrt(variance);

    if (zScore >= minZ) {
      results.push({
        term,
        aiCount: yAi,
        humanCount: yHu,
        siteCount: sites,
        logOddsRatio: +delta.toFixed(4),
        zScore: +zScore.toFixed(3),
      });
    }
  }

  return results.sort((a, b) => b.zScore - a.zScore);
}

// #201: Kobak et al. (arXiv 2604.04723) excess-word-usage drift calculator
export function computeVocabularyDrift(
  currentDocs: Array<{ text: string }>,
  baselineDocs: Array<{ text: string }>,
  terms: string[],
): {
  deltas: Record<string, number>;
  meanDelta: number;
} {
  const docShare = (docs: Array<{ text: string }>, term: string) => {
    if (docs.length === 0) return 0;
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const hits = docs.filter((d) => re.test(d.text || '')).length;
    return hits / docs.length;
  };
  const deltas: Record<string, number> = {};
  let sum = 0;
  for (const t of terms) {
    const pCur = docShare(currentDocs, t);
    const pBase = docShare(baselineDocs, t);
    const d = +(pCur - pBase).toFixed(4);
    deltas[t] = d;
    sum += d;
  }
  return {
    deltas,
    meanDelta: terms.length ? +(sum / terms.length).toFixed(4) : 0,
  };
}

// #201: Watch-list admission guard (>= 2 independent post-cutoff domains + lift >= 3)
export function evaluateWatchListCandidate(candidate: {
  term: string;
  independentDomains: string[];
  likelihoodRatio: number;
}): { admitted: boolean; weight: 0; status: 'review' | 'rejected' } {
  const uniqueDomains = new Set(candidate.independentDomains).size;
  const admitted = uniqueDomains >= 2 && candidate.likelihoodRatio >= 3;
  return {
    admitted,
    weight: 0,
    status: admitted ? 'review' : 'rejected',
  };
}
