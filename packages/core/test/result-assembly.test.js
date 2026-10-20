// DM-1 acceptance: patternsErrored surfaces extractor failures in assembled results.

import { test, expect } from 'vitest';
import {
  assemblePatternResults,
  assembleScanResult,
  buildPageEvaluateScript,
  buildFixPrompt,
  getPatterns,
  applyPreset,
  PATTERNS,
} from '@slop-detect/core';

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

// ── Documented embed API (README "Programmatic use") ─────────────────────────
// A page-eval payload shaped like `page.evaluate(buildPageEvaluateScript(...))`.
function pageData(triggeredIds = []) {
  const signals = Object.fromEntries(
    PATTERNS.map((p) => [p.id, { triggered: triggeredIds.includes(p.id), count: 1 }])
  );
  return {
    title: 'Acme',
    url: 'https://acme.example/',
    h1Text: 'Ship faster',
    h1Font: 'Inter, sans-serif',
    visibleCount: 200,
    signals,
    textContext: { text: '', headings: [], paragraphs: [], wordCount: 0 },
    systemContext: null,
  };
}

test('assembleScanResult(raw, opts) scores the page-eval payload as the README shows', () => {
  const raw = pageData(['slop_fonts', 'purple_accent', 'gradient_text']);
  const result = assembleScanResult(raw, {
    url: 'https://acme.example',
    finalUrl: 'https://acme.example/',
    axes: ['design', 'copy'],
    patterns: PATTERNS,
  });
  const expected = ['slop_fonts', 'purple_accent', 'gradient_text']
    .map((id) => PATTERNS.find((p) => p.id === id).weight)
    .reduce((a, b) => a + b, 0);
  expect(result.score).toBe(expected);
  expect(['Clean', 'Mild', 'Heavy']).toContain(result.tier);
  expect(typeof result.grade).toBe('string');
  expect(typeof result.verdict).toBe('string');
  expect(result.patternsFlagged).toBe(3);
  expect(result.patternsTotal).toBe(PATTERNS.length);
  expect(result.url).toBe('https://acme.example');
  expect(result.finalUrl).toBe('https://acme.example/');
  expect(result.axes.copy.axis).toBe('copy');
  expect(typeof result.unifiedScore).toBe('number');
  expect(result.definitionsVersion).toBeTruthy();
});

test('assembleScanResult still accepts the legacy bare signals map', () => {
  const { signals } = pageData(['slop_fonts']);
  const result = assembleScanResult(signals);
  expect(result.patternsFlagged).toBe(1);
  expect(result.patterns.find((p) => p.id === 'slop_fonts').triggered).toBe(true);
  expect(typeof result.score).toBe('number');
  expect(result.patternsErrored).toBe(0);
});

test('assembleScanResult honours the patterns subset and preset', () => {
  const raw = pageData(['slop_fonts', 'purple_accent']);
  const minimal = assembleScanResult(raw, { preset: 'minimal' });
  expect(minimal.patternsTotal).toBe(3);
  const subset = assembleScanResult(raw, {
    patterns: [PATTERNS.find((p) => p.id === 'slop_fonts')],
  });
  expect(subset.patternsTotal).toBe(1);
  expect(subset.patternsFlagged).toBe(1);
});

test('assembleScanResult reports a blocked page instead of a false Clean 0', () => {
  const result = assembleScanResult({ title: 'Just a moment...', signals: {}, visibleCount: 3 });
  expect(result.blocked).toBe(true);
  expect(result.code).toBe('cloudflare_challenge');
  expect(result.score).toBeNull();
});

test('buildPageEvaluateScript(patterns, opts) honours both arguments', () => {
  const only = [PATTERNS.find((p) => p.id === 'slop_fonts')];
  const script = buildPageEvaluateScript(only, { includeSystem: true });
  expect(script).toContain('signals["slop_fonts"]');
  expect(script).not.toContain('signals["purple_accent"]');
  expect(script).toContain('systemContext = extractSystemContext()');

  const legacy = buildPageEvaluateScript({ includeSystem: false });
  expect(legacy).toContain('signals["purple_accent"]');
  expect(legacy).not.toContain('systemContext = extractSystemContext()');
});

test('getPatterns(preset) filters the built-in catalogue; legacy (patterns, preset) still works', () => {
  const strict = getPatterns('strict');
  expect(Array.isArray(strict)).toBe(true);
  expect(strict.length).toBeGreaterThan(0);
  expect(strict.every((p) => p.weight >= 5)).toBe(true);
  expect(getPatterns(PATTERNS, 'minimal')).toEqual(applyPreset(PATTERNS, 'minimal'));
  expect(getPatterns()).toEqual(PATTERNS);
});

test('buildFixPrompt reads AEO check message + severity from the real report shape', () => {
  const prompt = buildFixPrompt({
    url: 'https://acme.example',
    score: 0,
    tier: 'Clean',
    patterns: [],
    aeo: {
      score: 40,
      maxScore: 100,
      tier: 'Invisible',
      failed: [
        {
          id: 'robots.aiAllowed',
          label: 'robots.txt allows AI crawlers',
          severity: 'required',
          weight: 20,
          passed: false,
          message: 'GPTBot is disallowed by robots.txt',
        },
      ],
    },
  });
  expect(prompt).toContain('20 pts, required');
  expect(prompt).toContain('GPTBot is disallowed by robots.txt');
  expect(prompt).not.toContain('Add the missing signal.');
});

test('assembleScanResult scores a small extracted subset (minimal preset) instead of blocking it', () => {
  const minimal = getPatterns('minimal');
  expect(minimal.length).toBeLessThan(4);
  const raw = pageData(['slop_fonts']);
  raw.signals = Object.fromEntries(minimal.map((p) => [p.id, raw.signals[p.id]]));
  const result = assembleScanResult(raw, { patterns: minimal });
  expect(result.blocked).toBeUndefined();
  expect(result.patternsTotal).toBe(minimal.length);
  expect(result.patternsFlagged).toBe(1);
  expect(typeof result.score).toBe('number');

  // Bot walls and empty renders are still caught for a subset.
  expect(assembleScanResult({ ...raw, title: 'Just a moment...' }).code).toBe(
    'cloudflare_challenge'
  );
  expect(assembleScanResult({ ...raw, title: '', h1Text: null }).code).toBe('empty_page');
  expect(assembleScanResult({ ...raw, visibleCount: 3 }).code).toBe('empty_page');
});

test('buildPageEvaluateScript(undefined, opts) keeps opts and uses every pattern', () => {
  const script = buildPageEvaluateScript(undefined, { includeSystem: true });
  expect(script).toContain('systemContext = extractSystemContext()');
  for (const p of PATTERNS) expect(script).toContain(`signals[${JSON.stringify(p.id)}]`);
});
