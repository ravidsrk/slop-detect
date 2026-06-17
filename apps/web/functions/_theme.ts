// Centralized tier / grade / verdict color resolvers.
//
// The palette is the product: color encodes the score. Every surface that shows a
// tier, grade, or axis — the TSX pages, the OG card generator (/og), and the badge
// generator (/badge) — reads these maps so there is ONE source of truth. The maps
// are extracted verbatim from docs/design-extract.md > "Tier, grade, and verdict
// logic"; the engine's gradeForScore / verdictFor / GRADE_BANDS are wrapped here so
// callers reach the score→grade→verdict pipeline through this one module too.
//
// Lower score is cleaner: Clean < 10, Mild 10–27, Heavy ≥ 28.

import { gradeForScore, verdictFor, GRADE_BANDS } from '@slop-detect/core';

// Re-export the engine scorers so pages read grade/verdict logic from one place.
export { gradeForScore, verdictFor, GRADE_BANDS };

export type Tier = 'Clean' | 'Mild' | 'Heavy';

// score (0–100, lower is cleaner) → tier. Mirrors the engine's design bands.
export function tierFor(score: number): Tier {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  if (s >= 28) return 'Heavy';
  if (s >= 10) return 'Mild';
  return 'Clean';
}

// dot / fill — the core verdict hues, used for fills, dots, bars, badges.
export function tierFill(tier: string): string {
  switch (tier) {
    case 'Clean':
      return '#1FA85E';
    case 'Mild':
      return '#D89A2E';
    case 'Heavy':
      return '#C9402E';
    default:
      return '#6E6F63';
  }
}

// text (the `Fg`) — AA-darkened hues for type on paper.
export function tierText(tier: string): string {
  switch (tier) {
    case 'Clean':
      return '#15824A';
    case 'Mild':
      return '#9A6B12';
    case 'Heavy':
      return '#B23A2A';
    default:
      return '#6E6F63';
  }
}

// status-pill background (the `chipBg`): a faint tint behind a tier label.
export function tierPillBg(tier: string): string {
  switch (tier) {
    case 'Clean':
      return 'rgba(31,168,94,0.12)';
    case 'Mild':
      return 'rgba(216,154,46,0.14)';
    case 'Heavy':
      return 'rgba(201,64,46,0.12)';
    default:
      return 'rgba(110,111,99,0.12)';
  }
}

// The embeddable SVG badge: dark left segment, tier-colored right segment.
export function badgeColors(tier: string): { bg: string; ink: string } {
  switch (tier) {
    case 'Clean':
      return { bg: '#1FA85E', ink: '#0A2A18' };
    case 'Mild':
      return { bg: '#D89A2E', ink: '#3A2705' };
    case 'Heavy':
      return { bg: '#C9402E', ink: '#FFFFFF' };
    default:
      return { bg: '#6E6F63', ink: '#F4F5F2' };
  }
}

// The {fg, bg, label} resolver the existing callers consume via _shared/_render.
// fg = tier text hue, bg = status-pill tint, fill = core hue, label kept for
// back-compat (no current caller reads it). _render.tierColors delegates here.
export function tierColors(tier: string): {
  fg: string;
  bg: string;
  fill: string;
  label: string;
} {
  return {
    fg: tierText(tier),
    bg: tierPillBg(tier),
    fill: tierFill(tier),
    label: tierText(tier),
  };
}

// System (DESIGN.md) axis: higher is better.
//   Aligned ≥ 80 · Drifting ≥ 50 · Off-system < 50 · no system declared → grey.
export function systemAxisColor(score: number | null | undefined): string {
  if (score == null) return '#6E6F63';
  const s = Number(score) || 0;
  if (s >= 80) return '#15824A';
  if (s >= 50) return '#9A6B12';
  return '#B23A2A';
}

// AEO (agent-readable) axis: higher is better.
//   AI-Ready ≥ 80 · Partial ≥ 50 · Invisible < 50.
export function aeoAxisColor(score: number): string {
  const s = Number(score) || 0;
  if (s >= 80) return '#15824A';
  if (s >= 50) return '#9A6B12';
  return '#B23A2A';
}

// Pass / fail marks for the AEO checklist.
export const AEO_PASS_COLOR = '#15824A';
export const AEO_FAIL_COLOR = '#C9402E';

// Letter-avatar chip palette (deterministic per name). The one purple (#7A4D9A)
// appears ONLY here, as 1 of 6 data backgrounds — never a CTA, accent, or brand
// color (the brand forbids purple on CTAs).
export const chipPalette = ['#C9402E', '#9A6B12', '#15824A', '#46473F', '#2C6E8F', '#7A4D9A'];

// Deterministic name → chip color (stable FNV-1a-ish hash so a name always maps
// to the same swatch).
export function avatarColor(name: string): string {
  const s = String(name || '');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return chipPalette[Math.abs(h) % chipPalette.length];
}

// grade letter → color bucket. A* → clean, B/C → mild, D/F → heavy.
export function gradeColorBucket(grade: string): Tier {
  const g = String(grade || '')
    .trim()
    .toUpperCase();
  if (g.startsWith('A')) return 'Clean';
  if (g.startsWith('B') || g.startsWith('C')) return 'Mild';
  return 'Heavy';
}
