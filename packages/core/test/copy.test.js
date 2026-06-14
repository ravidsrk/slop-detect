// Unit tests for the copy-slop axis (#08). Pure functions — no browser needed.
// Run with: vitest run packages/core/test/copy.test.js
import { test, expect } from 'vitest';
import { scoreCopy, combineAxes, COPY_PATTERNS, gradeForScore } from '@slop-detect/core';

function ctx(text, extra = {}) {
  const wordCount = extra.wordCount ?? (text ? text.split(/\s+/).filter(Boolean).length : 0);
  return { text, headings: extra.headings || [], paragraphs: extra.paragraphs || [], wordCount };
}

const SLOP = ctx(
  "In today's fast-paced world, businesses need to leverage cutting-edge solutions. " +
    "Our platform isn't just a tool — it's a game-changer. Whether you're a startup or an " +
    'enterprise, we empower you to unlock seamless, robust, and scalable workflows. We harness ' +
    'innovative technology to streamline operations and elevate your business — delivering ' +
    'unparalleled, transformative results. In conclusion, delve into a comprehensive solution today.',
  { headings: ['🚀 Fast', '✅ Reliable', '✨ Scalable'] }
);

const CLEAN = ctx(
  'We help small clinics fill empty appointment slots. Connect your calendar, set your hours, ' +
    'and we text patients when a slot opens. Most clinics fill 3 to 5 extra slots a week. ' +
    'No setup fee. Cancel anytime. Pricing starts at 29 dollars a month for one location.'
);

test('slop copy scores Heavy with multiple tells', () => {
  const r = scoreCopy(SLOP);
  expect(r.axis).toBe('copy');
  expect(r.score >= 20).toBeTruthy();
  expect(r.tier).toBe('Heavy');
  expect(r.patternsFlagged >= 4).toBeTruthy();
  const ids = r.patterns.filter((p) => p.triggered).map((p) => p.id);
  expect(ids.includes('buzzword_density')).toBeTruthy();
  expect(ids.includes('filler_openers')).toBeTruthy();
  expect(ids.includes('emoji_bullet_headers')).toBeTruthy();
});

test('clean human copy scores Clean', () => {
  const r = scoreCopy(CLEAN);
  expect(r.tier).toBe('Clean');
  expect(r.patternsFlagged).toBe(0);
});

test('thin copy is not judged (returns Clean + thin flag)', () => {
  const r = scoreCopy(ctx('Coming soon.'));
  expect(r.thin).toBe(true);
  expect(r.tier).toBe('Clean');
  expect(r.patternsFlagged).toBe(0);
});

test('every copy pattern returns a boolean triggered', () => {
  const r = scoreCopy(SLOP);
  for (const p of r.patterns) {
    expect(typeof p.triggered).toBe('boolean');
    expect(p.axis).toBe('copy');
  }
  expect(r.patterns.length).toBe(COPY_PATTERNS.length);
});

test('em-dash overload needs density, not a single dash', () => {
  const one = scoreCopy(
    ctx(
      'A clean sentence — with a single pause — and nothing more here in this longer body of otherwise perfectly human text that goes on for a while.'
    )
  );
  const emPattern = one.patterns.find((p) => p.id === 'em_dash_overload');
  expect(emPattern.triggered).toBe(false);
});

test('unicode_artifacts catches mathematical fake-bold letters', () => {
  // 𝗹𝗲𝘃𝗲𝗿𝗮𝗴𝗲 / 𝗯𝗿𝗮𝗻𝗱 — the U+1D400 block abused as styling. Padded past the
  // 40-word "thin" floor so the copy axis actually judges it.
  const fakeBold =
    'We help you \uD835\uDDF9\uD835\uDDF2\uD835\uDDCF\uD835\uDDF2\uD835\uDDFF\uD835\uDDEE\uD835\uDDF4\uD835\uDDF2 your ' +
    '\uD835\uDDEF\uD835\uDDFF\uD835\uDDEE\uD835\uDDFB\uD835\uDDF1 with a fast, simple platform that real teams actually use every day. ' +
    'Connect your calendar, set your hours, and we text patients when a slot opens up. ' +
    'Most clinics fill three to five extra slots a week without any extra effort at all from staff.';
  const r = scoreCopy(ctx(fakeBold));
  const u = r.patterns.find((p) => p.id === 'unicode_artifacts');
  expect(u.triggered).toBe(true);
  expect(u.evidence.mathAlnum >= 4).toBeTruthy();
});

test('unicode_artifacts does not fire on ordinary clean copy', () => {
  const u = scoreCopy(CLEAN).patterns.find((p) => p.id === 'unicode_artifacts');
  expect(u.triggered).toBe(false);
  expect(u.evidence.mathAlnum).toBe(0);
});

test('combineAxes: max score + multi-axis penalty', () => {
  const both = combineAxes({
    design: { score: 30, tier: 'Heavy' },
    copy: { score: 22, tier: 'Heavy' },
  });
  expect(both.unifiedScore).toBe(36); // 30 + 6 penalty for 2nd dirty axis
  expect(both.dirtyAxes).toBe(2);
  expect(both.unifiedTier).toBe('Heavy');

  const oneClean = combineAxes({
    design: { score: 5, tier: 'Clean' },
    copy: { score: 22, tier: 'Heavy' },
  });
  expect(oneClean.unifiedScore).toBe(22); // no penalty, only 1 dirty axis
  expect(oneClean.dirtyAxes).toBe(1);
});

test('combineAxes clamps to 100', () => {
  const r = combineAxes({
    design: { score: 98, tier: 'Heavy' },
    copy: { score: 40, tier: 'Heavy' },
  });
  expect(r.unifiedScore).toBe(100);
});

test('grade follows score monotonically', () => {
  expect(gradeForScore(0)).toBe('A+');
  expect(gradeForScore(100).startsWith('F') || gradeForScore(100) === 'F').toBeTruthy();
});
