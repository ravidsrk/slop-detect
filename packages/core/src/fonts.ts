// Default-template font stack fingerprint (D-08 refreshed 2026 list + document.fonts check).
// Inter dominates centered hero headlines; Space Grotesk + Syne + Fraunces +
// Geist combos signal template defaults; secondary faces count only alongside other signals.

export const PRIMARY_SLOP_FONT_PREFIXES = [
  'inter', // Inter / Inter Display / Inter Tight (tagged decaying in slop_fonts)
  'geist', // Geist / Geist Sans / Geist Mono / GeistSans
  'space grotesk',
  'space-grotesk',
  'plus jakarta sans',
  'plus-jakarta',
  'plus jakarta',
  'dm sans', // shadcn/ui default
  'dm-sans',
  'outfit',
  'sora',
  'syne', // D-08 display
  'fraunces', // D-08 display
  'general sans',
  'general-sans',
  'satoshi',
  'cal sans', // Linear/Vercel imitator hero font
  'cal-sans',
  'switzer',
  'clash display',
  'clash-display',
];

export const SECONDARY_SLOP_FONT_PREFIXES = [
  'manrope', // D-08 secondary (co-occurrence only)
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

export const SLOP_FONT_PREFIXES = [
  ...PRIMARY_SLOP_FONT_PREFIXES,
  ...SECONDARY_SLOP_FONT_PREFIXES,
];

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
        : null;

  if (!fontsSet) return stack[0];

  const faces: Array<{ family: string; status: string }> = [];
  try {
    if (typeof fontsSet.forEach === 'function') {
      fontsSet.forEach((face: any) => {
        if (face && face.family) {
          faces.push({
            family: String(face.family).replace(/^['"]|['"]$/g, '').toLowerCase(),
            status: String(face.status || 'loaded'),
          });
        }
      });
    } else if (Array.isArray(fontsSet)) {
      for (const face of fontsSet) {
        if (face && face.family) {
          faces.push({
            family: String(face.family).replace(/^['"]|['"]$/g, '').toLowerCase(),
            status: String(face.status || 'loaded'),
          });
        }
      }
    }
  } catch (e) {
    return stack[0];
  }

  if (faces.length === 0) return stack[0];

  const systemFallbacks = new Set([
    'system-ui',
    '-apple-system',
    'blinkmacsystemfont',
    'segoe ui',
    'roboto',
    'helvetica',
    'helvetica neue',
    'arial',
    'sans-serif',
    'serif',
    'monospace',
    'ui-sans-serif',
    'ui-serif',
    'ui-monospace',
  ]);

  for (const candidate of stack) {
    if (systemFallbacks.has(candidate)) return candidate;
    const matching = faces.filter(
      (f) => f.family === candidate || candidate.startsWith(f.family) || f.family.startsWith(candidate),
    );
    if (matching.length > 0) {
      if (matching.some((f) => f.status === 'loaded')) return candidate;
      // Declared in document.fonts but failed/unloaded — fall through to next in stack
      continue;
    }
    return candidate;
  }
  return stack[stack.length - 1] || '';
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
