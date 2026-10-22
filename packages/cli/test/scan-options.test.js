import { test, expect } from 'vitest';
import { shouldIncludeSystem, buildSarifReport, loadAxeSource } from '../src/index.ts';

test('includeSystem remains a public ScanOptions field and enables extraction', () => {
  expect(shouldIncludeSystem({})).toBe(false);
  expect(shouldIncludeSystem({ includeSystem: true })).toBe(true);
  expect(shouldIncludeSystem({ includeSystem: false })).toBe(false);
});

test('loadAxeSource fails closed when the optional package is absent', async () => {
  await expect(loadAxeSource()).rejects.toThrow(/optional and off by default/);
});

test('designMd still implies system extraction', () => {
  expect(shouldIncludeSystem({ designMd: 'tokens: {}' })).toBe(true);
  expect(shouldIncludeSystem({ designMd: 'tokens: {}', includeSystem: false })).toBe(true);
});

test('buildSarifReport emits a valid SARIF 2.1.0 report with triggered design/copy patterns and system drift', () => {
  const sarif = buildSarifReport([
    {
      url: 'https://acme.example',
      patterns: [
        {
          id: 'slop_fonts',
          short: 'Slop fonts',
          label: 'AI default fonts',
          weight: 8,
          triggered: true,
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
      system: {
        drift: [{ id: 'fonts.declared', message: 'undeclared font: inter' }],
      },
    },
  ]);
  expect(sarif.version).toBe('2.1.0');
  expect(sarif.runs).toHaveLength(1);
  expect(sarif.runs[0].tool.driver.name).toBe('slop-detect');
  expect(sarif.runs[0].results.map((r) => r.ruleId)).toEqual([
    'slop_fonts',
    'buzzword_density',
    'system.fonts.declared',
  ]);
});
