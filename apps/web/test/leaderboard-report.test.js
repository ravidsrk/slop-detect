import { test, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildReport, flaggedPatternIds } from '../leaderboard/report.mjs';

test('flaggedPatternIds reads triggered pattern rows and ignores clean ones', () => {
  expect(
    flaggedPatternIds({
      patterns: [
        { id: 'slop_fonts', triggered: true },
        { id: 'purple_accent', triggered: false },
        { id: 'gradient_text', triggered: true },
      ],
    })
  ).toEqual(['slop_fonts', 'gradient_text']);
  expect(flaggedPatternIds({ triggered: ['cream_default_bg', { id: 'stat_banner' }] })).toEqual([
    'cream_default_bg',
    'stat_banner',
  ]);
  expect(flaggedPatternIds({ error: 'cloudflare_challenge' })).toEqual([]);
});

test('buildReport stores per-rule counts from flaggedPatterns', () => {
  const report = buildReport(
    [
      {
        domain: 'a.com',
        scored: true,
        score: 12,
        grade: 'B+',
        tier: 'Mild',
        category: 'saas',
        builtWith: 'custom',
        patternsFlagged: 2,
        flaggedPatterns: ['slop_fonts', 'gradient_text'],
      },
      {
        domain: 'b.com',
        scored: true,
        score: 4,
        grade: 'A',
        tier: 'Clean',
        category: 'saas',
        builtWith: 'custom',
        patternsFlagged: 1,
        flaggedPatterns: ['slop_fonts'],
      },
    ],
    '2026.10'
  );
  expect(report.definitionsVersion).toBe('2026.10');
  expect(report.patternPrevalence).toEqual({ slop_fonts: 2, gradient_text: 1 });
  const a = report.sites.find((s) => s.domain === 'a.com');
  expect(a.flaggedPatterns).toEqual(['slop_fonts', 'gradient_text']);
});

test('node --local points at the built CLI and catches a missing build', () => {
  const report = fileURLToPath(new URL('../leaderboard/report.mjs', import.meta.url));
  const res = spawnSync(
    'node',
    [
      '--input-type=module',
      '-e',
      `import { loadLocalScanUrl } from ${JSON.stringify(report)};
       try {
         const scan = await loadLocalScanUrl();
         if (typeof scan !== 'function') process.exit(2);
         console.log('loaded');
       } catch (e) {
         const msg = String(e && e.message);
         if (msg.includes('detector.js')) process.exit(3);
         if (!msg.includes('built CLI')) process.exit(4);
         console.log('caught');
       }`,
    ],
    { encoding: 'utf8' }
  );
  expect(res.status, res.stderr || res.stdout).toBe(0);
  expect(res.stdout.trim()).toMatch(/^(loaded|caught)$/);
});
