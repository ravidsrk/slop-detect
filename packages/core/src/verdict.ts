// Letter grades + deterministic verdict one-liners.
//
// The 0–100 score stays the source of truth. A letter grade is more emotional
// and shareable (every grader that spreads — HubSpot, securityheaders,
// websitecarbon — uses one), and a punchy verdict drives the share card.
//
// IMPORTANT: verdicts critique the PAGE, never the person/company. "Slop is a
// fingerprint, not a verdict on you." Overclaiming gets us dunked on, and the
// "everyone uses AI now" counter-narrative is correct.

// Grade bands keyed off the same 0–100 scale as the tiers.
// Aligned to tiers: Clean (0–9) spans A+→A-, Mild (10–27) spans B→C-,
// Heavy (≥28) spans D→F.
export const GRADE_BANDS = [
  { max: 2, grade: 'A+' },
  { max: 5, grade: 'A' },
  { max: 9, grade: 'A-' },
  { max: 14, grade: 'B+' },
  { max: 19, grade: 'B' },
  { max: 23, grade: 'B-' },
  { max: 27, grade: 'C' },
  { max: 33, grade: 'D+' },
  { max: 39, grade: 'D' },
  { max: 100, grade: 'F' },
];

export function gradeForScore(score) {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  for (const band of GRADE_BANDS) {
    if (s <= band.max) return band.grade;
  }
  return 'F';
}

// Deterministic verdict one-liner. Picks from a small pool by tier, made stable
// by hashing the triggered-pattern signature so the same page always gets the
// same line (good for caching + repeatability), but different pages vary.
export const VERDICTS = {
  Clean: [
    'Matches few default-template patterns. Distinct visual choices.',
    'Clean. Minimal overlap with common default-template patterns.',
    'Few default-template patterns matched — custom layout and palette.',
    'Restrained palette and typography. Default-template patterns are absent.',
  ],
  Mild: [
    'Mostly clean, with a few default-template patterns present.',
    'Matches a few default-template patterns; most layout choices are distinct.',
    'A handful of default-template patterns away from clean.',
    'Moderate overlap with default-template patterns across a few styling rules.',
  ],
  Heavy: [
    'Heavy slop. High overlap with common default-template patterns.',
    'Matches many default-template patterns — gradients, default fonts, and repeated card grids.',
    'Dense concentration of default-template patterns.',
    'High match count of default-template patterns across typography, color, and layout.',
  ],
};

// Tiny stable string hash (FNV-1a-ish) → index into the verdict pool.
function pick(arr, seed) {
  let h = 2166136261;
  const s = String(seed || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return arr[Math.abs(h) % arr.length];
}

export function verdictFor(score, tier, triggered = []) {
  const pool = VERDICTS[tier] || VERDICTS.Mild;
  const sig = (triggered || [])
    .map((p) => (typeof p === 'string' ? p : p.id))
    .sort()
    .join(',');
  return pick(pool, `${tier}:${sig}`);
}
