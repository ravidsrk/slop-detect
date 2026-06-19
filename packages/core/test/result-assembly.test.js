// DM-1 acceptance: patternsErrored surfaces extractor failures in assembled results.

import { test, expect } from 'vitest';
import { assemblePatternResults, PATTERNS } from '@slop-detect/core';

test('assemblePatternResults counts signals that carry an error', () => {
  const signals = Object.fromEntries(PATTERNS.map((p) => [p.id, { triggered: false, count: 1 }]));
  signals.slop_fonts = { triggered: false, error: 'ctx.missingHelper is not a function' };

  const { patterns, patternsErrored } = assemblePatternResults(signals);
  expect(patternsErrored).toBe(1);
  expect(patterns.find((p) => p.id === 'slop_fonts')?.evidence.error).toBe(
    'ctx.missingHelper is not a function'
  );
  expect(patterns.find((p) => p.id === 'slop_fonts')?.triggered).toBe(false);
});

test('assemblePatternResults reports zero when no extractor failed', () => {
  const signals = { slop_fonts: { triggered: true, heroIsSlop: true } };
  const { patternsErrored } = assemblePatternResults(signals);
  expect(patternsErrored).toBe(0);
});
