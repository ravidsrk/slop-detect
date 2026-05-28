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
  { max: 2,   grade: 'A+' },
  { max: 5,   grade: 'A'  },
  { max: 9,   grade: 'A-' },
  { max: 14,  grade: 'B+' },
  { max: 19,  grade: 'B'  },
  { max: 23,  grade: 'B-' },
  { max: 27,  grade: 'C'  },
  { max: 33,  grade: 'D+' },
  { max: 39,  grade: 'D'  },
  { max: 100, grade: 'F'  }
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
const VERDICTS = {
  Clean: [
    'Crafted, not generated. This page has a point of view.',
    'Clean. Reads like a human made deliberate choices.',
    'No template tells here — this one earned its look.',
    'Premium-feeling. The AI-slop fingerprint is absent.'
  ],
  Mild: [
    'Mostly clean, with a few template tells creeping in.',
    'Decent bones, but the slop is starting to show.',
    'A handful of AI-default choices away from genuinely sharp.',
    'Good page wearing a couple of borrowed clichés.'
  ],
  Heavy: [
    'Heavy slop. This wears the Cursor/v0/Bolt starter kit head to toe.',
    'Straight off the AI assembly line — gradients, Inter, the works.',
    'You can smell the default template from here.',
    'Maximum genericness. Every tell is firing at once.'
  ]
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
    .map(p => (typeof p === 'string' ? p : p.id))
    .sort()
    .join(',');
  return pick(pool, `${tier}:${sig}`);
}
