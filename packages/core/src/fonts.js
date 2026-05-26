// The 2026 AI-generated-design font fingerprint.
// Inter dominates centered hero headlines; Space Grotesk + Instrument Serif +
// Geist combos signal "tried to look artsy"; Lucide/Iconify default icon sets.

export const SLOP_FONT_PREFIXES = [
  'inter',
  'geist',
  'space grotesk',
  'space-grotesk',
  'instrument serif',
  'instrument-serif',
  'general sans',
  'satoshi',
  'plus jakarta sans',
  'plus-jakarta'
];

export function isSlopFont(family) {
  if (!family) return false;
  const f = String(family).toLowerCase().replace(/['"]/g, '');
  const first = f.split(',')[0].trim();
  return SLOP_FONT_PREFIXES.some(p => first.startsWith(p));
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
  'cormorant'
];

export function isAccentSerif(family) {
  if (!family) return false;
  const f = String(family).toLowerCase().replace(/['"]/g, '');
  const first = f.split(',')[0].trim();
  return ACCENT_SERIF_PREFIXES.some(p => first.startsWith(p));
}
