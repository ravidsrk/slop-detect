import { test, expect } from 'vitest';
import {
  PRESETS,
  PATTERNS,
  aggregateRuns,
  assembleScanResult,
  buildSarifReport,
  compareScans,
  presetProfiles,
  regressionAgainstBaseline,
} from '@slop-detect/core';

function pageData(triggeredIds = []) {
  const signals = Object.fromEntries(
    PATTERNS.map((pattern) => [
      pattern.id,
      { triggered: triggeredIds.includes(pattern.id), count: 1 },
    ])
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

const baseline = {
  url: 'https://example.com',
  score: 4,
  definitionsVersion: '2026.11',
  patterns: [{ id: 'slop_fonts', triggered: true }],
  environment: { chromium: '1', viewport: { width: 1280, height: 800 } },
  axes: { copy: { score: 1 } },
};

test('compareScans refuses a definitions mismatch and still reports an environment diff', () => {
  const mismatch = compareScans({ ...baseline, definitionsVersion: '2026.10' }, baseline);
  expect(mismatch.comparable).toBe(false);
  expect(mismatch.delta).toBeNull();
  expect(mismatch.error).toMatch(/not a score delta/);

  const missing = compareScans({ score: 4, patterns: [] }, baseline);
  expect(missing.comparable).toBe(false);
  expect(missing.delta).toBeNull();

  const blocked = compareScans(baseline, { ...baseline, blocked: true, score: null });
  expect(blocked.comparable).toBe(false);
  expect(blocked.error).toMatch(/not a Clean score/);

  const current = {
    ...baseline,
    score: 10,
    patterns: [
      { id: 'slop_fonts', triggered: true },
      { id: 'purple_accent', triggered: true },
    ],
    environment: { chromium: '2', viewport: { width: 1280, height: 800 } },
    axes: { copy: { score: 4 } },
  };
  const report = compareScans(baseline, current);
  expect(report.comparable).toBe(true);
  expect(report.delta).toBe(6);
  expect(report.copyDelta).toBe(3);
  expect(report.patternsAdded).toEqual(['purple_accent']);
  expect(report.patternsResolved).toEqual([]);
  expect(report.regression).toBe(true);
  expect(report.environmentDiff).toBe(true);
  expect(report.text).toMatch(/Environment differs/);

  const same = compareScans(baseline, baseline, { maxDelta: 0 });
  expect(same.regression).toBe(false);
  expect(same.delta).toBe(0);
});

test('a definitions change on the session baseline is a rescore', () => {
  const decision = regressionAgainstBaseline(
    { score: 4, patterns: [], definitionsVersion: '2026.10' },
    {
      score: 40,
      definitionsVersion: '2026.11',
      patterns: [{ id: 'purple_accent', triggered: true }],
    }
  );
  expect(decision.establish).toBe(true);
  expect(decision.worse).toBe(false);
  expect(decision.silent).toBe(false);
  expect(decision.text).toMatch(/rescore, not a regression/);
});

test('aggregateRuns keeps a failed run from becoming a Clean aggregate', () => {
  const low = {
    score: 4,
    definitionsVersion: '2026.11',
    environment: { viewport: { width: 1280 } },
  };
  const high = {
    score: 11,
    definitionsVersion: '2026.11',
    environment: { viewport: { width: 1280 } },
  };
  const median = aggregateRuns([low, high, { ...low, score: 10 }], 'median');
  expect(median.ok).toBe(true);
  expect(median.aggregatedScore).toBe(10);
  expect(median.spread).toBe(7);
  expect(aggregateRuns([low, high], 'pessimistic').aggregatedScore).toBe(11);
  expect(aggregateRuns([low, high], 'median').aggregatedScore).toBe(8);
  const blocked = aggregateRuns([{ score: 0, blocked: true }], 'median');
  expect(blocked.ok).toBe(false);
  expect(blocked.aggregatedScore).toBeNull();
  expect(blocked.message).toMatch(/not a Clean score/);
  const versions = aggregateRuns(
    [
      { score: 1, definitionsVersion: '2026.10' },
      { score: 2, definitionsVersion: '2026.11' },
    ],
    'median'
  );
  expect(versions.ok).toBe(false);
  expect(versions.message).toMatch(/not one score/);
  expect(aggregateRuns([low], 'mean').message).toMatch(/median or pessimistic/);
  expect(aggregateRuns([], 'median').aggregatedScore).toBeNull();
});

test('SARIF fingerprints are stable and do not invent source lines', () => {
  const page = {
    url: 'https://acme.example',
    score: 8,
    patterns: [
      {
        id: 'slop_fonts',
        short: 'Slop fonts',
        label: 'AI default fonts',
        weight: 8,
        triggered: true,
        evidence: { selector: 'h1.title' },
      },
      {
        id: 'purple_accent',
        short: 'Purple CTA',
        label: 'Purple CTA',
        weight: 6,
        triggered: false,
      },
    ],
    axes: {
      copy: {
        patterns: [
          {
            id: 'buzzword_density',
            short: 'Buzzwords',
            label: 'AI buzzword density',
            axis: 'copy',
            weight: 7,
            triggered: true,
          },
        ],
      },
    },
    system: { drift: [{ id: 'fonts.declared', message: 'undeclared font: inter' }] },
    aeo: {
      checks: [
        { id: 'robots', label: 'robots', status: 'fail', severity: 'required', message: 'blocked' },
        { id: 'llms', label: 'llms', status: 'warn', severity: 'recommended', message: 'short' },
        { id: 'ok', label: 'ok', status: 'pass', severity: 'required', message: 'fine' },
      ],
    },
  };
  const first = buildSarifReport([page]);
  const second = buildSarifReport([page]);
  expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  expect(first.runs).toHaveLength(1);
  expect(first.runs[0].properties.category).toBe('https://acme.example');
  expect(first.runs[0].automationDetails.id).toMatch(/^slop-detect\/[0-9a-f]{8}$/);
  expect(first.runs[0].results.map((result) => result.ruleId)).toEqual([
    'slop_fonts',
    'buzzword_density',
    'system.fonts.declared',
    'aeo.robots',
    'aeo.llms',
  ]);
  const slop = first.runs[0].results[0];
  expect(slop.partialFingerprints.primaryLocationLineHash).toMatch(/^[0-9a-f]{8}$/);
  expect(slop.locations[0].logicalLocations[0].fullyQualifiedName).toBe('h1.title');
  expect(JSON.stringify(first)).not.toMatch(/startLine/);
  const rule = first.runs[0].tool.driver.rules.find((item) => item.id === 'slop_fonts');
  expect(rule.help.markdown.length).toBeGreaterThan(0);

  const blocked = buildSarifReport([{ url: 'https://acme.example', blocked: true, score: null }]);
  expect(blocked.runs[0].results.map((result) => result.ruleId)).toEqual(['scan']);
  expect(blocked.runs[0].results[0].message.text).toMatch(/not a Clean score/);
});

test('a non-full preset reports the unfiltered design score and names untouched axes', () => {
  const raw = pageData(['slop_fonts', 'numbered_steps']);
  const full = assembleScanResult(raw, { preset: 'full' });
  const preset = assembleScanResult(raw, { preset: 'minimal' });
  expect(full.fullScore).toBeUndefined();
  expect(full.presetWarning).toBeUndefined();
  expect(preset.fullScore).toBe(full.score);
  expect(preset.score).toBeLessThan(preset.fullScore);
  expect(preset.presetWarning).toBeUndefined();

  const withCopy = assembleScanResult(raw, { preset: 'minimal', axes: ['design', 'copy'] });
  const fullCopy = assembleScanResult(raw, { preset: 'full', axes: ['design', 'copy'] });
  expect(withCopy.presetWarning).toMatch(/not applied to: copy/);
  expect(withCopy.axes.copy.score).toBe(fullCopy.axes.copy.score);
  expect(withCopy.fullScore).toBe(full.score);
});

test('preset profiles cover every preset and never score craft', () => {
  expect(presetProfiles().map((preset) => preset.id)).toEqual(Object.keys(PRESETS));
  expect(presetProfiles().every((preset) => preset.craft === 'never-scored')).toBe(true);
});
