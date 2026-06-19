// DM-2 acceptance: Playwright is pinned exactly and scan results record browserVersion.

import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { scanUrl } from '../src/index.ts';

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8')
);

test('playwright dependency is pinned to an exact semver (no caret)', () => {
  expect(pkg.dependencies.playwright).toMatch(/^\d+\.\d+\.\d+$/);
  expect(pkg.dependencies.playwright).toBe('1.60.0');
});

test(
  'scanUrl records a non-null browserVersion from the Chromium engine',
  { skip: process.env.RUN_GOLDEN !== '1', timeout: 60_000 },
  async () => {
    const url = new URL('./fixtures/clean-artisan.html', import.meta.url).href;
    const r = await scanUrl(url, { axes: ['design'] });
    expect(typeof r.browserVersion).toBe('string');
    expect(r.browserVersion.length).toBeGreaterThan(0);
    // Playwright returns a bare Chromium semver; Puppeteer prefixes HeadlessChrome/.
    expect(r.browserVersion).toMatch(/Chrome|Chromium|\d+\.\d+\.\d+/i);
    expect(r.patternsErrored).toBe(0);
  }
);
