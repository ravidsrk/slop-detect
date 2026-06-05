// Pure scoring-engine tests — the math the whole product rests on, none of which
// was covered before. No DOM/browser: scorePatterns/scoreCopy/combineAxes and the
// grade/preset helpers are all pure functions.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scorePatterns,
  scoreCopy,
  combineAxes,
  gradeForScore,
  applyPreset,
  isPreset,
  PATTERNS,
  COPY_PATTERNS,
  DEFINITIONS_VERSION
} from '../src/index.js';

const p = (id, weight, triggered) => ({ id, label: id, category: 'x', weight, triggered });

// ── scorePatterns ────────────────────────────────────────────────────────────
test('scorePatterns sums triggered weights and reports totals', () => {
  const r = scorePatterns([p('a', 8, true), p('b', 4, false), p('c', 6, true)]);
  assert.equal(r.score, 14);
  assert.equal(r.patternsFlagged, 2);
  assert.equal(r.patternsTotal, 3);
  assert.equal(r.definitionsVersion, DEFINITIONS_VERSION);
  assert.ok(typeof r.verdict === 'string' && r.verdict.length > 0);
});

test('scorePatterns tier bands: Clean<10, Mild 10..27, Heavy>=28', () => {
  assert.equal(scorePatterns([p('a', 9, true)]).tier, 'Clean');
  assert.equal(scorePatterns([p('a', 10, true)]).tier, 'Mild');
  assert.equal(scorePatterns([p('a', 27, true)]).tier, 'Mild');
  assert.equal(scorePatterns([p('a', 28, true)]).tier, 'Heavy');
});

test('scorePatterns clamps score to 100 and tier stays Heavy', () => {
  const r = scorePatterns([p('a', 80, true), p('b', 70, true)]);
  assert.equal(r.score, 100);
  assert.equal(r.tier, 'Heavy');
});

test('scorePatterns grade matches the score bands', () => {
  assert.equal(scorePatterns([]).grade, 'A+');               // 0
  assert.equal(scorePatterns([p('a', 28, true)]).grade, 'D+'); // 28
});

// ── gradeForScore ────────────────────────────────────────────────────────────
test('gradeForScore is monotonic and clamped', () => {
  assert.equal(gradeForScore(0), 'A+');
  assert.equal(gradeForScore(9), 'A-');
  assert.equal(gradeForScore(100), 'F');
  assert.equal(gradeForScore(-5), 'A+');   // clamps low
  assert.equal(gradeForScore(99999), 'F'); // clamps high
});

// ── combineAxes ──────────────────────────────────────────────────────────────
test('combineAxes takes the max when only one axis is dirty', () => {
  const r = combineAxes({
    design: { score: 8, tier: 'Clean' },
    copy: { score: 18, tier: 'Mild' }
  });
  assert.equal(r.unifiedScore, 18);
  assert.equal(r.dirtyAxes, 1);
});

test('combineAxes adds +6 per extra dirty axis', () => {
  const r = combineAxes({
    design: { score: 30, tier: 'Heavy' },
    copy: { score: 18, tier: 'Mild' }
  });
  assert.equal(r.unifiedScore, 36); // max 30 + 6 (one extra dirty axis)
  assert.equal(r.dirtyAxes, 2);
  assert.equal(r.unifiedTier, 'Heavy');
});

test('combineAxes with all-clean axes is 0/Clean', () => {
  const r = combineAxes({ design: { score: 4, tier: 'Clean' } });
  assert.equal(r.unifiedScore, 4);
  assert.equal(r.dirtyAxes, 0);
});

// ── scoreCopy ────────────────────────────────────────────────────────────────
test('scoreCopy returns thin=true and Clean when there is too little prose', () => {
  const r = scoreCopy({ text: 'hello world', wordCount: 5, headings: [], paragraphs: [] });
  assert.equal(r.thin, true);
  assert.equal(r.score, 0);
  assert.equal(r.tier, 'Clean');
  assert.equal(r.patterns.length, COPY_PATTERNS.length);
  // Thin text must never flag a pattern (avoids false positives on sparse pages).
  assert.equal(r.patterns.every(pp => pp.triggered === false), true);
});

test('scoreCopy never throws and clamps to 100', () => {
  const r = scoreCopy({ text: 'x'.repeat(10), wordCount: 100, headings: [], paragraphs: [] });
  assert.ok(r.score >= 0 && r.score <= 100);
});

// ── presets ──────────────────────────────────────────────────────────────────
test('isPreset recognises known presets only', () => {
  assert.equal(isPreset('full'), true);
  assert.equal(isPreset('strict'), true);
  assert.equal(isPreset('minimal'), true);
  assert.equal(isPreset('nope'), false);
});

test('applyPreset: full keeps all; strict keeps only weight>=5; minimal keeps 3', () => {
  assert.equal(applyPreset(PATTERNS, 'full').length, PATTERNS.length);

  const strict = applyPreset(PATTERNS, 'strict');
  assert.ok(strict.length < PATTERNS.length);
  assert.equal(strict.every(pp => pp.weight >= 5), true);

  const minimal = applyPreset(PATTERNS, 'minimal');
  assert.deepEqual(minimal.map(pp => pp.id).sort(), ['gradient_text', 'purple_accent', 'slop_fonts']);
});

test('applyPreset is fail-open on an unknown preset (returns full set)', () => {
  assert.equal(applyPreset(PATTERNS, 'does-not-exist').length, PATTERNS.length);
});

// ── catalogue integrity ──────────────────────────────────────────────────────
test('every PATTERN has a unique id, a positive weight, and a detect/extract fn', () => {
  const ids = new Set();
  for (const pat of PATTERNS) {
    assert.ok(pat.id && !ids.has(pat.id), `duplicate or missing id: ${pat.id}`);
    ids.add(pat.id);
    assert.ok(typeof pat.weight === 'number' && pat.weight > 0, `bad weight on ${pat.id}`);
    assert.ok(typeof pat.extract === 'function', `no extract on ${pat.id}`);
  }
  // README/CLI claim 27 design patterns — keep that promise honest.
  assert.equal(PATTERNS.length, 27);
});
