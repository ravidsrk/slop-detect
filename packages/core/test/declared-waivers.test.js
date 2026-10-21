import { test, expect } from 'vitest';
import { applyDeclaredDesignWaivers, parseDesignMd, gradeForScore } from '@slop-detect/core';

const DECLARED = `---
name: Fenced Brand
colors:
  primary: "oklch(0.585 0.233 277.1)"
  surface: "#0A0A0B"
typography:
  h1:
    fontFamily: "Inter"
rounded:
  md: 8px
components:
  button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
---
`;

test('declared tokens waive matching design patterns and keep the raw score', () => {
  const parsed = parseDesignMd(DECLARED);
  const patterns = [
    {
      id: 'purple_accent',
      label: 'Purple',
      weight: 4,
      triggered: true,
      status: 'fail',
      evidence: {},
    },
    {
      id: 'slop_fonts',
      label: 'Fonts',
      weight: 8,
      triggered: true,
      status: 'fail',
      evidence: { heroFam: 'Inter' },
    },
    { id: 'bento_grid', label: 'Bento', weight: 4, triggered: false, status: 'pass', evidence: {} },
  ];
  const result = applyDeclaredDesignWaivers(
    {
      score: 12,
      tier: 'Mild',
      grade: 'B+',
      patternsFlagged: 2,
      patternsTotal: 3,
      patterns,
      evidence: [
        { id: 'purple_accent', label: 'Purple' },
        { id: 'slop_fonts', label: 'Fonts' },
      ],
      craft: { score: 80 },
      axes: {
        design: {
          axis: 'design',
          score: 12,
          tier: 'Mild',
          grade: 'B+',
          patternsFlagged: 2,
          patternsTotal: 3,
          patterns,
        },
        copy: { axis: 'copy', score: 0, tier: 'Clean', grade: 'A+', patternsFlagged: 0 },
      },
      unifiedScore: 12,
      unifiedTier: 'Mild',
    },
    parsed
  );

  expect(result.rawScore).toBe(12);
  expect(result.score).toBe(0);
  expect(result.tier).toBe('Clean');
  expect(result.grade).toBe(gradeForScore(0));
  expect(result.patternsFlagged).toBe(0);
  expect(result.waivedPatterns.map((w) => w.id).sort()).toEqual(['purple_accent', 'slop_fonts']);
  expect(result.evidence.map((e) => e.id)).toEqual([]);
  expect(result.craft.score).toBe(80);
  expect(result.axes.design.score).toBe(0);
  expect(result.unifiedScore).toBe(0);
  expect(result.unifiedTier).toBe('Clean');
});

test('a scan without a parsed DESIGN.md is returned unchanged', () => {
  const result = { score: 12, tier: 'Mild', patterns: [] };
  expect(applyDeclaredDesignWaivers(result, null)).toBe(result);
});

test('unrelated tokens do not change the design score', () => {
  const parsed = parseDesignMd(`---
name: Plain
colors:
  ink: "#111111"
typography:
  body:
    fontFamily: "Newsreader"
---
`);
  const result = applyDeclaredDesignWaivers(
    {
      score: 8,
      tier: 'Clean',
      grade: 'A-',
      patternsFlagged: 1,
      patterns: [
        {
          id: 'bento_grid',
          label: 'Bento',
          weight: 4,
          triggered: true,
          status: 'fail',
          evidence: {},
        },
      ],
    },
    parsed
  );
  expect(result.score).toBe(8);
  expect(result.tier).toBe('Clean');
  expect(result.waivedPatterns).toEqual([]);
});
