// Default-template font stack fingerprint (D-08 refreshed 2026 list + document.fonts check).
// Legacy v0.8.1 families stay in SLOP_FONT_PREFIXES (used by weight-8 slop_fonts).
// Newly added 2026 families (Syne, Fraunces, Outfit, Sora, Playfair, Lora, DM Serif,
// JetBrains Mono, Fira Code) trigger only on the weight-0 review rule slop_fonts_2026 (#247, #299).

export const LEGACY_SLOP_FONT_PREFIXES = [
  'inter', // Inter / Inter Display / Inter Tight (lifecycle status: decaying)
  'geist', // Geist / Geist Sans / Geist Mono / GeistSans
  'space grotesk',
  'space-grotesk',
  'instrument serif',
  'instrument-serif',
  'general sans',
  'general-sans',
  'satoshi',
  'plus jakarta sans',
  'plus-jakarta',
  'plus jakarta',
  'manrope', // 2026 AI-tool default (secondary / co-occurrence)
  'dm sans', // shadcn/ui default
  'dm-sans',
  'cal sans', // Linear/Vercel imitator hero font
  'cal-sans',
  'switzer',
  'clash display',
  'clash-display',
];

export const PRIMARY_SLOP_FONT_PREFIXES = [
  'inter',
  'geist',
  'space grotesk',
  'space-grotesk',
  'plus jakarta sans',
  'plus-jakarta',
  'plus jakarta',
  'dm sans',
  'dm-sans',
  'outfit',
  'sora',
  'syne',
  'fraunces',
  'general sans',
  'general-sans',
  'satoshi',
  'cal sans',
  'cal-sans',
  'switzer',
  'clash display',
  'clash-display',
];

export const SECONDARY_SLOP_FONT_PREFIXES = [
  'manrope',
  'playfair display',
  'playfair',
  'lora',
  'dm serif',
  'dm-serif',
  'instrument serif',
  'instrument-serif',
  'jetbrains mono',
  'jetbrains-mono',
  'fira code',
  'fira-code',
];

export const SLOP_DISPLAY_FONT_PREFIXES = [
  'syne',
  'fraunces',
  'clash display',
  'clash-display',
  'cal sans',
  'cal-sans',
  'space grotesk',
  'space-grotesk',
];

// SLOP_FONT_PREFIXES contains ONLY the legacy families for the weight-8 slop_fonts rule.
export const SLOP_FONT_PREFIXES = [...LEGACY_SLOP_FONT_PREFIXES];

export const NEW_2026_SLOP_FONT_PREFIXES = [
  'syne',
  'fraunces',
  'outfit',
  'sora',
  'playfair display',
  'playfair',
  'lora',
  'dm serif',
  'dm-serif',
  'jetbrains mono',
  'jetbrains-mono',
  'fira code',
  'fira-code',
];

export const SLOP_FONT_LIFECYCLE: Record<string, 'active' | 'decaying' | 'review' | 'retired'> = {
  inter: 'decaying',
  geist: 'decaying',
  'space grotesk': 'active',
  'instrument serif': 'active',
  'general sans': 'active',
  satoshi: 'active',
  'plus jakarta sans': 'active',
  manrope: 'active',
  'dm sans': 'active',
  'cal sans': 'active',
  switzer: 'active',
  'clash display': 'active',
  syne: 'review',
  fraunces: 'review',
  outfit: 'review',
  sora: 'review',
  'playfair display': 'review',
  lora: 'review',
  'dm serif': 'review',
  'jetbrains mono': 'review',
  'fira code': 'review',
};

export function resolveRenderedFont(family: string | null | undefined, docFonts?: any): string {
  if (!family) return '';
  const stack = String(family)
    .split(',')
    .map((f) => f.trim().replace(/^['"]|['"]$/g, '').toLowerCase())
    .filter(Boolean);
  if (stack.length === 0) return '';

  const fontsSet =
    docFonts !== undefined
      ? docFonts
      : typeof document !== 'undefined' && (document as any).fonts
        ? (document as any).fonts
        : undefined;

  // Only when no FontFaceSet / docFonts exists in the runtime at all (pure string call in Node)
  // do we fall back to the first declared family.
  if (fontsSet === undefined || fontsSet === null) return stack[0];

  const faces: Array<{ family: string; status: string }> = [];
  const pushFace = (face: any) => {
    if (face && face.family) {
      faces.push({
        family: String(face.family).replace(/^['"]|['"]$/g, '').toLowerCase(),
        status: String(face.status || 'unloaded').toLowerCase(),
      });
    }
  };
  try {
    if (typeof fontsSet[Symbol.iterator] === 'function') {
      for (const face of fontsSet) pushFace(face);
    } else if (typeof fontsSet.forEach === 'function') {
      fontsSet.forEach(pushFace);
    } else if (Array.isArray(fontsSet)) {
      for (const face of fontsSet) pushFace(face);
    }
  } catch {
    return '';
  }

  const systemFallbacks = new Set([
    'system-ui',
    '-apple-system',
    'blinkmacsystemfont',
    'segoe ui',
    'helvetica',
    'helvetica neue',
    'arial',
    'georgia',
    'times',
    'times new roman',
    'courier',
    'courier new',
    'verdana',
    'tahoma',
    'trebuchet ms',
    'sans-serif',
    'serif',
    'monospace',
    'ui-sans-serif',
    'ui-serif',
    'ui-monospace',
  ]);

  // Confirm a non-system family ONLY when a FontFace with status === 'loaded' matches it.
  // Absent or unloaded faces fall through to the next entry in the font-family stack.
  for (const candidate of stack) {
    const loadedMatch = faces.some(
      (f) =>
        f.status === 'loaded' &&
        (f.family === candidate ||
          candidate.startsWith(f.family + ' ') ||
          candidate.startsWith(f.family + '-') ||
          f.family.startsWith(candidate + ' ') ||
          f.family.startsWith(candidate + '-')),
    );
    if (loadedMatch) return candidate;
    if (systemFallbacks.has(candidate)) return candidate;
  }
  return '';
}

export function isSlopFont(family: string | null | undefined, docFonts?: any): boolean {
  if (!family) return false;
  const first = resolveRenderedFont(family, docFonts);
  if (!first) return false;
  return SLOP_FONT_PREFIXES.some((p) => first.startsWith(p));
}

export function isPrimarySlopFont(family: string | null | undefined, docFonts?: any): boolean {
  if (!family) return false;
  const first = resolveRenderedFont(family, docFonts);
  if (!first) return false;
  return PRIMARY_SLOP_FONT_PREFIXES.some((p) => first.startsWith(p));
}

export function isSecondarySlopFont(family: string | null | undefined, docFonts?: any): boolean {
  if (!family) return false;
  const first = resolveRenderedFont(family, docFonts);
  if (!first) return false;
  return SECONDARY_SLOP_FONT_PREFIXES.some((p) => first.startsWith(p));
}

export const ACCENT_SERIF_PREFIXES = [
  'instrument serif',
  'instrument-serif',
  'fraunces',
  'playfair',
  'lora',
  'ibm plex serif',
  'spectral',
  'tinos',
  'cormorant',
];

export function isAccentSerif(family: string | null | undefined): boolean {
  if (!family) return false;
  const f = String(family).toLowerCase().replace(/['"]/g, '');
  const first = f.split(',')[0].trim();
  return ACCENT_SERIF_PREFIXES.some((p) => first.startsWith(p));
}
