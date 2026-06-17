// Golden detection tests — scan self-contained HTML fixtures in a REAL headless
// browser and pin the detector's behavior on known-clean vs. known-slop pages.
// This is the only coverage that exercises the 27 design-pattern `extract`
// functions end to end (they need layout + computed styles, so jsdom won't do).
//
// Gated behind RUN_GOLDEN=1 because it needs Playwright + a Chromium binary. The
// default `npm test` (and the browser-free CI "Unit tests" job) skip it; the
// CI "Smoke test CLI" job installs Chromium and runs it with RUN_GOLDEN=1.

import { test, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { scanUrl } from '../src/index.ts';

const RUN = process.env.RUN_GOLDEN === '1';
const fixture = (name) => new URL(`./fixtures/${name}`, import.meta.url).href;
const triggered = (r, id) => r.patterns.find((p) => p.id === id)?.triggered === true;
const fixtureText = (name) => readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

test(
  'clean artisan page scores Clean and trips no font/purple tells',
  { skip: !RUN, timeout: 60_000 },
  async () => {
    const r = await scanUrl(fixture('clean-artisan.html'), { axes: ['design'] });
    expect(r.tier).toBe('Clean');
    expect(r.score).toBeLessThan(10);
    expect(triggered(r, 'slop_fonts')).toBe(false);
    expect(triggered(r, 'purple_accent')).toBe(false);
    expect(triggered(r, 'gradient_text')).toBe(false);
  }
);

test(
  'maximal VibeCode page scores out of Clean with the canonical tells',
  { skip: !RUN },
  async () => {
    const r = await scanUrl(fixture('slop-vibecode.html'), { axes: ['design'] });
    // Coarse-but-robust: a page wearing Inter + indigo gradients + a gradient-clip
    // H1 must not read as Clean, and the three dead-giveaways must fire.
    expect(r.tier).not.toBe('Clean');
    expect(r.score).toBeGreaterThanOrEqual(10);
    expect(triggered(r, 'slop_fonts')).toBe(true);
    expect(triggered(r, 'gradient_text')).toBe(true);
    expect(triggered(r, 'purple_accent')).toBe(true);
  }
);

test(
  'a pill-shaped CTA button does NOT trigger the eyebrow-pill tell (calibration regression)',
  { skip: !RUN },
  async () => {
    const r = await scanUrl(fixture('clean-cta-pill.html'), { axes: ['design'] });
    expect(triggered(r, 'hero_eyebrow_pill')).toBe(false);
    expect(r.tier).toBe('Clean');
  }
);

test(
  'the slop fixture STILL trips the eyebrow tell (its "Now in beta" pill) and glass',
  { skip: !RUN },
  async () => {
    const r = await scanUrl(fixture('slop-vibecode.html'), { axes: ['design'] });
    expect(triggered(r, 'hero_eyebrow_pill')).toBe(true);
    expect(triggered(r, 'glassmorphism')).toBe(true);
  }
);

test(
  'the two fixtures are clearly separated (slop scores well above clean)',
  { skip: !RUN },
  async () => {
    const [clean, slop] = await Promise.all([
      scanUrl(fixture('clean-artisan.html'), { axes: ['design'] }),
      scanUrl(fixture('slop-vibecode.html'), { axes: ['design'] }),
    ]);
    expect(slop.score - clean.score).toBeGreaterThanOrEqual(15);
  }
);

test('a page that honors its DESIGN.md scores Aligned', { skip: !RUN }, async () => {
  const md = await fixtureText('artisan-DESIGN.md');
  const r = await scanUrl(fixture('clean-artisan.html'), { axes: ['design'], designMd: md });
  expect(r.system).toBeTruthy();
  expect(r.system.declared).toBe(true);
  expect(r.system.tier).toBe('Aligned');
});

test(
  'the same page against the WRONG system reads as drift, with named signals',
  { skip: !RUN },
  async () => {
    const md = await fixtureText('mismatched-DESIGN.md');
    const r = await scanUrl(fixture('clean-artisan.html'), { axes: ['design'], designMd: md });
    expect(r.system.tier).not.toBe('Aligned');
    const ids = r.system.drift.map((d) => d.id);
    expect(ids).toContain('fonts.declared');
    expect(ids).toContain('colors.cta');
  }
);
