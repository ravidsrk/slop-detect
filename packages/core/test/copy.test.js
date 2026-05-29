// Unit tests for the copy-slop axis (#08). Pure functions — no browser needed.
// Run with: node --test packages/core/test/copy.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreCopy, combineAxes, COPY_PATTERNS, gradeForScore } from '../src/index.js';

function ctx(text, extra = {}) {
  const wordCount = extra.wordCount ?? (text ? text.split(/\s+/).filter(Boolean).length : 0);
  return { text, headings: extra.headings || [], paragraphs: extra.paragraphs || [], wordCount };
}

const SLOP = ctx(
  "In today's fast-paced world, businesses need to leverage cutting-edge solutions. " +
  "Our platform isn't just a tool — it's a game-changer. Whether you're a startup or an " +
  "enterprise, we empower you to unlock seamless, robust, and scalable workflows. We harness " +
  "innovative technology to streamline operations and elevate your business — delivering " +
  "unparalleled, transformative results. In conclusion, delve into a comprehensive solution today.",
  { headings: ['🚀 Fast', '✅ Reliable', '✨ Scalable'] }
);

const CLEAN = ctx(
  "We help small clinics fill empty appointment slots. Connect your calendar, set your hours, " +
  "and we text patients when a slot opens. Most clinics fill 3 to 5 extra slots a week. " +
  "No setup fee. Cancel anytime. Pricing starts at 29 dollars a month for one location."
);

test('slop copy scores Heavy with multiple tells', () => {
  const r = scoreCopy(SLOP);
  assert.equal(r.axis, 'copy');
  assert.ok(r.score >= 20, `expected Heavy score, got ${r.score}`);
  assert.equal(r.tier, 'Heavy');
  assert.ok(r.patternsFlagged >= 4, `expected >=4 tells, got ${r.patternsFlagged}`);
  const ids = r.patterns.filter(p => p.triggered).map(p => p.id);
  assert.ok(ids.includes('buzzword_density'));
  assert.ok(ids.includes('filler_openers'));
  assert.ok(ids.includes('emoji_bullet_headers'));
});

test('clean human copy scores Clean', () => {
  const r = scoreCopy(CLEAN);
  assert.equal(r.tier, 'Clean');
  assert.equal(r.patternsFlagged, 0, JSON.stringify(r.patterns.filter(p => p.triggered).map(p => p.id)));
});

test('thin copy is not judged (returns Clean + thin flag)', () => {
  const r = scoreCopy(ctx('Coming soon.'));
  assert.equal(r.thin, true);
  assert.equal(r.tier, 'Clean');
  assert.equal(r.patternsFlagged, 0);
});

test('every copy pattern returns a boolean triggered', () => {
  const r = scoreCopy(SLOP);
  for (const p of r.patterns) {
    assert.equal(typeof p.triggered, 'boolean', `${p.id} triggered not boolean`);
    assert.equal(p.axis, 'copy');
  }
  assert.equal(r.patterns.length, COPY_PATTERNS.length);
});

test('em-dash overload needs density, not a single dash', () => {
  const one = scoreCopy(ctx('A clean sentence — with a single pause — and nothing more here in this longer body of otherwise perfectly human text that goes on for a while.'));
  const emPattern = one.patterns.find(p => p.id === 'em_dash_overload');
  assert.equal(emPattern.triggered, false, 'two em-dashes in long text should not trigger');
});

test('combineAxes: max score + multi-axis penalty', () => {
  const both = combineAxes({
    design: { score: 30, tier: 'Heavy' },
    copy: { score: 22, tier: 'Heavy' }
  });
  assert.equal(both.unifiedScore, 36); // 30 + 6 penalty for 2nd dirty axis
  assert.equal(both.dirtyAxes, 2);
  assert.equal(both.unifiedTier, 'Heavy');

  const oneClean = combineAxes({
    design: { score: 5, tier: 'Clean' },
    copy: { score: 22, tier: 'Heavy' }
  });
  assert.equal(oneClean.unifiedScore, 22); // no penalty, only 1 dirty axis
  assert.equal(oneClean.dirtyAxes, 1);
});

test('combineAxes clamps to 100', () => {
  const r = combineAxes({
    design: { score: 98, tier: 'Heavy' },
    copy: { score: 40, tier: 'Heavy' }
  });
  assert.equal(r.unifiedScore, 100);
});

test('grade follows score monotonically', () => {
  assert.equal(gradeForScore(0), 'A+');
  assert.ok(gradeForScore(100).startsWith('F') || gradeForScore(100) === 'F');
});
