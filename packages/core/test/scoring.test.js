// Pure scoring-engine tests — the math the whole product rests on, none of which
// was covered before. No DOM/browser: scorePatterns/scoreCopy/combineAxes and the
// grade/preset helpers are all pure functions.

import { test, expect } from 'vitest';
import {
  scorePatterns,
  scoreCopy,
  combineAxes,
  gradeForScore,
  applyPreset,
  isPreset,
  PATTERNS,
  COPY_PATTERNS,
  DEFINITIONS_VERSION,
} from '@slop-detect/core';

const p = (id, weight, triggered) => ({ id, label: id, category: 'x', weight, triggered });

// ── scorePatterns ────────────────────────────────────────────────────────────
test('scorePatterns sums triggered weights and reports totals', () => {
  const r = scorePatterns([p('a', 8, true), p('b', 4, false), p('c', 6, true)]);
  expect(r.score).toBe(14);
  expect(r.patternsFlagged).toBe(2);
  expect(r.patternsTotal).toBe(3);
  expect(r.definitionsVersion).toBe(DEFINITIONS_VERSION);
  expect(typeof r.verdict === 'string' && r.verdict.length > 0).toBeTruthy();
});

test('scorePatterns tier bands: Clean<10, Mild 10..27, Heavy>=28', () => {
  expect(scorePatterns([p('a', 9, true)]).tier).toBe('Clean');
  expect(scorePatterns([p('a', 10, true)]).tier).toBe('Mild');
  expect(scorePatterns([p('a', 27, true)]).tier).toBe('Mild');
  expect(scorePatterns([p('a', 28, true)]).tier).toBe('Heavy');
});

test('scorePatterns clamps score to 100 and tier stays Heavy', () => {
  const r = scorePatterns([p('a', 80, true), p('b', 70, true)]);
  expect(r.score).toBe(100);
  expect(r.tier).toBe('Heavy');
});

test('scorePatterns grade matches the score bands', () => {
  expect(scorePatterns([]).grade).toBe('A+'); // 0
  expect(scorePatterns([p('a', 28, true)]).grade).toBe('D+'); // 28
});

// ── gradeForScore ────────────────────────────────────────────────────────────
test('gradeForScore is monotonic and clamped', () => {
  expect(gradeForScore(0)).toBe('A+');
  expect(gradeForScore(9)).toBe('A-');
  expect(gradeForScore(100)).toBe('F');
  expect(gradeForScore(-5)).toBe('A+'); // clamps low
  expect(gradeForScore(99999)).toBe('F'); // clamps high
});

// ── combineAxes ──────────────────────────────────────────────────────────────
test('combineAxes takes the max when only one axis is dirty', () => {
  const r = combineAxes({
    design: { score: 8, tier: 'Clean' },
    copy: { score: 18, tier: 'Mild' },
  });
  expect(r.unifiedScore).toBe(18);
  expect(r.dirtyAxes).toBe(1);
});

test('combineAxes adds +6 per extra dirty axis', () => {
  const r = combineAxes({
    design: { score: 30, tier: 'Heavy' },
    copy: { score: 18, tier: 'Mild' },
  });
  expect(r.unifiedScore).toBe(36); // max 30 + 6 (one extra dirty axis)
  expect(r.dirtyAxes).toBe(2);
  expect(r.unifiedTier).toBe('Heavy');
});

test('combineAxes with all-clean axes is 0/Clean', () => {
  const r = combineAxes({ design: { score: 4, tier: 'Clean' } });
  expect(r.unifiedScore).toBe(4);
  expect(r.dirtyAxes).toBe(0);
});

// ── scoreCopy ────────────────────────────────────────────────────────────────
test('scoreCopy returns thin=true and Clean when there is too little prose', () => {
  const r = scoreCopy({ text: 'hello world', wordCount: 5, headings: [], paragraphs: [] });
  expect(r.thin).toBe(true);
  expect(r.score).toBe(0);
  expect(r.tier).toBe('Clean');
  expect(r.patterns.length).toBe(COPY_PATTERNS.length);
  // Thin text must never flag a pattern (avoids false positives on sparse pages).
  expect(r.patterns.every((pp) => pp.triggered === false)).toBe(true);
});

test('scoreCopy never throws and clamps to 100', () => {
  const r = scoreCopy({ text: 'x'.repeat(10), wordCount: 100, headings: [], paragraphs: [] });
  expect(r.score >= 0 && r.score <= 100).toBeTruthy();
});

// ── presets ──────────────────────────────────────────────────────────────────
test('isPreset recognises known presets only', () => {
  expect(isPreset('full')).toBe(true);
  expect(isPreset('strict')).toBe(true);
  expect(isPreset('minimal')).toBe(true);
  expect(isPreset('nope')).toBe(false);
});

test('applyPreset: full keeps all; strict keeps only weight>=5; minimal keeps 3', () => {
  expect(applyPreset(PATTERNS, 'full').length).toBe(PATTERNS.length);

  const strict = applyPreset(PATTERNS, 'strict');
  expect(strict.length < PATTERNS.length).toBeTruthy();
  expect(strict.every((pp) => pp.weight >= 5)).toBe(true);

  const minimal = applyPreset(PATTERNS, 'minimal');
  expect(minimal.map((pp) => pp.id).sort()).toEqual([
    'gradient_text',
    'purple_accent',
    'slop_fonts',
  ]);
});

test('applyPreset is fail-open on an unknown preset (returns full set)', () => {
  expect(applyPreset(PATTERNS, 'does-not-exist').length).toBe(PATTERNS.length);
});

// ── catalogue integrity ──────────────────────────────────────────────────────
test('every PATTERN has a unique id, a positive weight, and a detect/extract fn', () => {
  const ids = new Set();
  for (const pat of PATTERNS) {
    expect(pat.id && !ids.has(pat.id)).toBeTruthy();
    ids.add(pat.id);
    expect(typeof pat.weight === 'number' && pat.weight > 0).toBeTruthy();
    expect(typeof pat.extract === 'function').toBeTruthy();
  }
  // README/CLI claim 27 design patterns — keep that promise honest.
  expect(PATTERNS.length).toBe(27);
});