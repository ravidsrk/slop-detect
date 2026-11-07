// Experimental watchlist (D-10 #249, C-10 #274).
//
// Runs ONLY when `--experimental` (`opts.experimental: true`) is passed.
// Results feed calibration prevalence exports and MUST NEVER alter any score
// (design, copy, unified, craft, system, or AEO).

import { buildNormalizedTextView } from './text.js';

export interface ExperimentalWatchlistItem {
  id: string;
  axis: 'design' | 'copy';
  label: string;
  status: 'experimental';
  weight: 0;
  scored: false;
  authorshipClaim: false;
  evidenceGrade: 'hypothesis';
  era: string;
  extract?: (ctx: any) => any;
}

export const EXPERIMENTAL_DESIGN_WATCHLIST: ExperimentalWatchlistItem[] = [
  {
    id: 'neobrutalist_hard_shadow',
    axis: 'design',
    label: 'Neobrutalist hard offset shadow (blur 0, offset >= 3px, border >= 2px on >= 4 cards)',
    status: 'experimental',
    weight: 0,
    scored: false,
    authorshipClaim: false,
    evidenceGrade: 'hypothesis',
    era: '2025-v0',
    extract: (ctx: any) => {
      const { visible, parseColor } = ctx;
      let count = 0;
      const samples: string[] = [];
      for (const el of visible || []) {
        const cs = getComputedStyle(el);
        const bw = parseFloat(cs.borderTopWidth || '0') || 0;
        if (bw < 2) continue;
        const bs = String(cs.boxShadow || '');
        if (!bs || bs === 'none') continue;
        // Match offset-x offset-y blur-radius ...
        const m = bs.match(
          /(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px(?:\s+(-?\d+(?:\.\d+)?)px)?/
        );
        if (!m) continue;
        const ox = Math.abs(parseFloat(m[1]));
        const oy = Math.abs(parseFloat(m[2]));
        const blur = parseFloat(m[3]);
        if (blur === 0 && (ox >= 3 || oy >= 3)) {
          const colMatch = bs.match(/(?:rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}|oklch\([^)]+\))/);
          const col = colMatch && parseColor ? parseColor(colMatch[0]) : { r: 0, g: 0, b: 0, a: 1 };
          const isDarkShadow =
            !col || (col.r < 80 && col.g < 80 && col.b < 80 && (col.a ?? 1) >= 0.7);
          if (isDarkShadow) {
            count++;
            if (samples.length < 3) {
              samples.push((el.tagName || 'DIV').toLowerCase());
            }
          }
        }
      }
      return { count, samples, triggered: count >= 4 };
    },
  },
  {
    id: 'analogous_hue_goo',
    axis: 'design',
    label: 'Analogous-hue nested tinted layers (>= 3 nested layers within +-20 deg hue)',
    status: 'experimental',
    weight: 0,
    scored: false,
    authorshipClaim: false,
    evidenceGrade: 'hypothesis',
    era: '2026-opus',
    extract: (ctx: any) => {
      const { visible, parseColor, rgbToOklch } = ctx;
      let chains = 0;
      for (const el of visible || []) {
        const hues: number[] = [];
        let cur: any = el;
        let depth = 0;
        while (cur && depth++ < 6) {
          const cs = getComputedStyle(cur);
          const bg = parseColor ? parseColor(cs.backgroundColor) : null;
          if (bg && (bg.a ?? 1) >= 0.15 && rgbToOklch) {
            const lch = rgbToOklch(bg);
            if (lch && lch.C >= 0.03 && Number.isFinite(lch.h)) {
              hues.push(lch.h);
            }
          }
          cur = cur.parentElement;
        }
        if (hues.length >= 3) {
          const first = hues[0];
          const allClose = hues.slice(0, 3).every((h) => {
            const diff = Math.abs(((((h - first) % 360) + 540) % 360) - 180);
            return diff <= 20;
          });
          if (allClose) chains++;
        }
      }
      return { chains, triggered: chains >= 1 };
    },
  },
  {
    id: 'unbranded_chat_bubble',
    axis: 'design',
    label: 'Fixed bottom-right chat launcher bubble with no known support vendor script',
    status: 'experimental',
    weight: 0,
    scored: false,
    authorshipClaim: false,
    evidenceGrade: 'hypothesis',
    era: '2025-v0',
    extract: (ctx: any) => {
      const { visible } = ctx;
      const scripts = Array.from(document.querySelectorAll('script[src]')).map((s: any) =>
        String(s.getAttribute('src') || '').toLowerCase()
      );
      const knownVendors = [
        'intercom',
        'crisp.chat',
        'zdassets',
        'zendesk',
        'drift',
        'hubspot',
        'tawk.to',
        'freshchat',
        'helpscout',
      ];
      const hasVendorScript = scripts.some((s) => knownVendors.some((v) => s.includes(v)));
      if (hasVendorScript) {
        return { triggered: false, hasVendorScript: true };
      }
      const vw = window.innerWidth || 1280;
      const vh = window.innerHeight || 800;
      let found = false;
      for (const el of visible || []) {
        const cs = getComputedStyle(el);
        if (cs.position !== 'fixed') continue;
        const r = el.getBoundingClientRect();
        if (
          r.width >= 36 &&
          r.width <= 84 &&
          r.height >= 36 &&
          r.height <= 84 &&
          vw - r.right <= 48 &&
          vh - r.bottom <= 48
        ) {
          found = true;
          break;
        }
      }
      return { triggered: found, hasVendorScript: false };
    },
  },
  {
    id: 'glass_gradient_kit',
    axis: 'design',
    label: 'Glassmorphism card over gradient ground with 1px translucent light border',
    status: 'experimental',
    weight: 0,
    scored: false,
    authorshipClaim: false,
    evidenceGrade: 'hypothesis',
    era: '2025-v0',
    extract: (ctx: any) => {
      const { visible, parseColor } = ctx;
      let glassCards = 0;
      let hasGradientGround = false;
      for (const el of visible || []) {
        const cs = getComputedStyle(el);
        const bgImg = String(cs.backgroundImage || '');
        if (/gradient\(/i.test(bgImg)) {
          const r = el.getBoundingClientRect();
          if (
            r.width * r.height >=
            (window.innerWidth || 1280) * (window.innerHeight || 800) * 0.2
          ) {
            hasGradientGround = true;
          }
        }
        const bf = String((cs as any).backdropFilter || (cs as any).webkitBackdropFilter || '');
        const bw = parseFloat(cs.borderTopWidth || '0') || 0;
        const bc = parseColor ? parseColor(cs.borderTopColor) : null;
        if (
          /blur\(/i.test(bf) &&
          bw >= 0.5 &&
          bw <= 1.5 &&
          bc &&
          bc.r > 200 &&
          bc.g > 200 &&
          bc.b > 200 &&
          (bc.a ?? 1) < 0.6
        ) {
          glassCards++;
        }
      }
      return { glassCards, hasGradientGround, triggered: hasGradientGround && glassCards >= 2 };
    },
  },
  {
    id: 'dev_theme_palette',
    axis: 'design',
    label: 'Single neon accent on near-black or Tokyo Night / Dracula dev-theme palette',
    status: 'experimental',
    weight: 0,
    scored: false,
    authorshipClaim: false,
    evidenceGrade: 'hypothesis',
    era: '2025-cursor',
    extract: (ctx: any) => {
      const { visible, parseColor, rgbToOklch } = ctx;
      const bodyBg = parseColor
        ? parseColor(getComputedStyle(document.body).backgroundColor)
        : null;
      if (!bodyBg) return { triggered: false, theme: null };
      const bodyLch = rgbToOklch ? rgbToOklch(bodyBg) : null;
      if (!bodyLch || bodyLch.L > 0.28) return { triggered: false, theme: null };

      // Check Tokyo Night (#1a1b26) / Dracula (#282a36) or single emerald/acid-green/vermilion accent
      const isTokyoBg =
        Math.abs(bodyBg.r - 26) <= 10 &&
        Math.abs(bodyBg.g - 27) <= 10 &&
        Math.abs(bodyBg.b - 38) <= 12;
      const isDraculaBg =
        Math.abs(bodyBg.r - 40) <= 10 &&
        Math.abs(bodyBg.g - 42) <= 10 &&
        Math.abs(bodyBg.b - 54) <= 12;

      let emeraldHits = 0;
      let acidGreenHits = 0;
      let vermilionHits = 0;
      for (const el of visible || []) {
        const cs = getComputedStyle(el);
        for (const raw of [cs.color, cs.backgroundColor, cs.borderTopColor]) {
          const c = parseColor ? parseColor(raw) : null;
          if (!c || (c.a ?? 1) < 0.5) continue;
          const lch = rgbToOklch ? rgbToOklch(c) : null;
          if (!lch || lch.C < 0.12) continue;
          if (lch.h >= 145 && lch.h <= 170) emeraldHits++;
          else if (lch.h >= 115 && lch.h < 145) acidGreenHits++;
          else if (lch.h >= 20 && lch.h <= 38) vermilionHits++;
        }
      }
      const theme = isTokyoBg
        ? 'tokyo-night'
        : isDraculaBg
          ? 'dracula'
          : emeraldHits >= 3
            ? 'near-black-emerald'
            : acidGreenHits >= 3
              ? 'near-black-acid-green'
              : vermilionHits >= 3
                ? 'near-black-vermilion'
                : null;
      return {
        triggered: Boolean(theme),
        theme,
        emeraldHits,
        acidGreenHits,
        vermilionHits,
      };
    },
  },
  {
    id: 'tilted_device_mockup',
    axis: 'design',
    label: 'Tilted/rotated device mockup frame with sage-on-cream palette',
    status: 'experimental',
    weight: 0,
    scored: false,
    authorshipClaim: false,
    evidenceGrade: 'hypothesis',
    era: '2026-opus',
    extract: (ctx: any) => {
      const { visible, parseColor, rgbToOklch } = ctx;
      const bodyBg = parseColor
        ? parseColor(getComputedStyle(document.body).backgroundColor)
        : null;
      const bodyLch = bodyBg && rgbToOklch ? rgbToOklch(bodyBg) : null;
      const isCream =
        bodyLch &&
        bodyLch.L >= 0.92 &&
        bodyLch.C >= 0.008 &&
        bodyLch.C <= 0.06 &&
        bodyLch.h >= 60 &&
        bodyLch.h <= 115;
      let tiltedFrames = 0;
      let hasSage = false;
      for (const el of visible || []) {
        const cs = getComputedStyle(el);
        const tf = String(cs.transform || '');
        const rot = String((cs as any).rotate || '');
        if (
          (tf && tf !== 'none' && /matrix|rotate/i.test(tf)) ||
          (rot && rot !== 'none' && rot !== '0deg')
        ) {
          const r = el.getBoundingClientRect();
          const radius = parseFloat(cs.borderTopLeftRadius || '0') || 0;
          if (r.width >= 180 && r.height >= 240 && radius >= 16) {
            tiltedFrames++;
          }
        }
        const bg = parseColor ? parseColor(cs.backgroundColor) : null;
        const lch = bg && rgbToOklch ? rgbToOklch(bg) : null;
        if (lch && lch.C >= 0.03 && lch.C <= 0.12 && lch.h >= 120 && lch.h <= 165) {
          hasSage = true;
        }
      }
      return {
        isCream: Boolean(isCream),
        hasSage,
        tiltedFrames,
        triggered: Boolean(isCream && hasSage && tiltedFrames >= 1),
      };
    },
  },
];

// Greek math/technical prefix exclusions for C-10 (#274):
// e.g. "Δ-sigma", "α-helix", "β-lactam", "μ-sec", "λ-calculus", "σ-algebra"
export const GREEK_MATH_TOKEN_RE =
  /^(?:[ΔΩΠΣΦΨΛΘΓαβγδεζηθικλμνξοπρστυφχψω](?:-[A-Za-z0-9]+)?|[A-Za-z0-9]+-[ΔΩΠΣΦΨΛΘΓαβγδεζηθικλμνξοπρστυφχψω])$/;

export const EXPERIMENTAL_COPY_WATCHLIST: ExperimentalWatchlistItem[] = [
  {
    id: 'punctuation_sentence_band',
    axis: 'copy',
    label: 'Punctuation diversity and 8-20 word sentence band concentration',
    status: 'experimental',
    weight: 0,
    scored: false,
    authorshipClaim: false,
    evidenceGrade: 'hypothesis',
    era: '2025-llm',
  },
  {
    id: 'mixed_script_homoglyphs',
    axis: 'copy',
    label:
      'Mixed-script characters (Latin + Cyrillic/Greek within single words; non-authorship finding)',
    status: 'experimental',
    weight: 0,
    scored: false,
    authorshipClaim: false,
    evidenceGrade: 'hypothesis',
    era: '2026-evasion',
  },
];

export function evaluateExperimentalCopyWatchlist(textContext: any) {
  const rawText = String(textContext?.bodyText || textContext?.text || '').trim();
  const normalized = buildNormalizedTextView(rawText);
  const sentences = normalized.normalized
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).filter(Boolean).length >= 3);

  let inBandCount = 0;
  for (const s of sentences) {
    const wc = s.split(/\s+/).filter(Boolean).length;
    if (wc >= 8 && wc <= 20) inBandCount++;
  }
  const sentenceBandRatio =
    sentences.length > 0 ? Math.round((inBandCount / sentences.length) * 100) / 100 : 0;

  const punctMarks = new Set(rawText.match(/[.,;:!?—–()[\]"']/g) || []);
  const punctuationDiversity = punctMarks.size;
  const bandTriggered =
    sentences.length >= 6 && sentenceBandRatio >= 0.75 && punctuationDiversity <= 3;

  // Mixed-script homoglyph tokens (C-10 #274):
  // Tokens mixing Latin [A-Za-z] with Cyrillic [\u0400-\u04FF] or Greek [\u0370-\u03FF],
  // excluding Greek-letter math compounds like "Δ-sigma" or "α-helix".
  const rawTokens = rawText
    .split(/\s+/)
    .map((t) => t.replace(/^[.,;:!?"'([{]+|[.,;:!?"')\]}]+$/g, ''));
  const mixedTokens: string[] = [];
  for (const tok of rawTokens) {
    if (!tok || tok.length < 2) continue;
    if (GREEK_MATH_TOKEN_RE.test(tok)) continue;
    const hasLatin = /[A-Za-z]/.test(tok);
    const hasCyrillic = /[\u0400-\u04FF]/.test(tok);
    const hasGreek = /[\u0370-\u03FF]/.test(tok);
    if (hasLatin && (hasCyrillic || hasGreek)) {
      mixedTokens.push(tok.slice(0, 40));
    }
  }

  return [
    {
      id: 'punctuation_sentence_band',
      axis: 'copy' as const,
      label: 'Punctuation diversity and 8-20 word sentence band concentration',
      status: 'experimental' as const,
      weight: 0 as const,
      scored: false as const,
      authorshipClaim: false as const,
      triggered: bandTriggered,
      evidence: {
        sentenceCount: sentences.length,
        inBandCount,
        sentenceBandRatio,
        punctuationDiversity,
      },
    },
    {
      id: 'mixed_script_homoglyphs',
      axis: 'copy' as const,
      label:
        'Mixed-script characters (Latin + Cyrillic/Greek within single words; non-authorship finding)',
      status: 'experimental' as const,
      weight: 0 as const,
      scored: false as const,
      authorshipClaim: false as const,
      triggered: mixedTokens.length >= 2,
      evidence: {
        count: mixedTokens.length,
        samples: mixedTokens.slice(0, 5),
        note: 'Mixed-script characters are reported as text-encoding/evasion artifacts, never as authorship evidence.',
      },
    },
  ];
}

export function evaluateExperimentalWatchlist(
  rawDesignSignals: Record<string, any> | null | undefined,
  textContext: any
) {
  const design = EXPERIMENTAL_DESIGN_WATCHLIST.map((item) => {
    const raw = (rawDesignSignals && rawDesignSignals[item.id]) || { triggered: false };
    const { triggered, ...evidence } = raw;
    return {
      id: item.id,
      axis: 'design' as const,
      label: item.label,
      status: 'experimental' as const,
      weight: 0 as const,
      scored: false as const,
      authorshipClaim: false as const,
      triggered: Boolean(triggered),
      evidence,
    };
  });
  const copy = evaluateExperimentalCopyWatchlist(textContext);
  return {
    scored: false as const,
    design,
    copy,
  };
}
