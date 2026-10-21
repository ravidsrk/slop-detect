import { test, expect } from 'vitest';
import { buildActionSarif } from '../sarif.mjs';

test('action SARIF is stable and a blocked page is not a pass', () => {
  const page = {
    url: 'https://example.com',
    score: 8,
    patterns: [
      {
        id: 'slop_fonts',
        label: 'Slop fonts',
        weight: 8,
        triggered: true,
        evidence: { selector: 'h1' },
      },
      { id: 'purple_accent', label: 'Purple', weight: 6, triggered: false },
    ],
  };
  const first = buildActionSarif([page]);
  const second = buildActionSarif([page]);
  expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  expect(first.runs).toHaveLength(1);
  expect(first.runs[0].results.map((result) => result.ruleId)).toEqual(['slop_fonts']);
  expect(first.runs[0].results[0].locations[0].logicalLocations[0].fullyQualifiedName).toBe('h1');
  expect(JSON.stringify(first)).not.toMatch(/startLine/);
  const rule = first.runs[0].tool.driver.rules.find((item) => item.id === 'slop_fonts');
  expect(rule.help.markdown).toBe('Slop fonts');

  const blocked = buildActionSarif([{ url: 'https://example.com', blocked: true, score: null }]);
  expect(blocked.runs[0].results[0].ruleId).toBe('scan');
  expect(blocked.runs[0].results[0].level).toBe('error');
  expect(blocked.runs[0].results[0].message.text).toMatch(/not a Clean score/);
});
