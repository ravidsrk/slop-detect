// Per-pattern positive coverage registry (G-18 / gh-92).
//
// golden.test.js pins whole-page behavior on 2 fixtures; this file pins that
// EVERY design-pattern extractor fires on a page built to exhibit it — one
// positive-detection case per pattern ID. Cases scan their fixture once (cached
// per file) and assert the pattern triggers with non-empty evidence.
//
// Same gating as golden.test.js: needs Playwright + Chromium, so it runs under
// RUN_GOLDEN=1 (locally + the CI "Smoke test CLI" job, which is required on
// every PR — a regression in any extractor fails the PR). Batches: T-18a
// added IDs 1–9, T-18b adds 10–18 below, T-18c adds 19–27 (the clean-anchor
// negative at the bottom iterates CASES, so it grows with each batch).

import { test, expect } from 'vitest';
import { scanUrl } from '../src/index.ts';

const RUN = process.env.RUN_GOLDEN === '1';
const fixture = (name) => new URL(`./fixtures/${name}`, import.meta.url).href;

const cache = new Map();
async function scanCached(name) {
  if (!cache.has(name)) cache.set(name, scanUrl(fixture(name), { axes: ['design'] }));
  return cache.get(name);
}

// [patternId, positiveFixture]
const CASES = [
  ['slop_fonts', 'slop-vibecode.html'],
  ['purple_accent', 'slop-vibecode.html'],
  ['gradient_text', 'slop-vibecode.html'],
  ['gradient_backgrounds', 'slop-vibecode.html'],
  ['accent_stripe', 'pat-accent_stripe.html'],
  ['glassmorphism', 'slop-vibecode.html'],
  ['colored_glows', 'slop-vibecode.html'],
  ['centered_hero', 'slop-vibecode.html'],
  ['hero_eyebrow_pill', 'slop-vibecode.html'],
  // ── T-18b batch (IDs 10–18) ──
  ['all_caps_labels', 'pat-all_caps_labels.html'],
  ['perma_dark_mode', 'slop-vibecode.html'],
  ['icon_card_grid', 'pat-icon_card_grid.html'],
  ['numbered_steps', 'pat-numbered_steps.html'],
  ['stat_banner', 'pat-stat_banner.html'],
  ['faq_accordion', 'pat-faq_accordion.html'],
  ['gradient_letter_avatars', 'pat-gradient_letter_avatars.html'],
  ['bento_grid', 'pat-bento_grid.html'],
  ['aurora_mesh_gradient', 'pat-aurora_mesh_gradient.html'],
];

for (const [id, fx] of CASES) {
  test(`${id} fires on its positive fixture (${fx})`, { skip: !RUN, timeout: 60_000 }, async () => {
    const r = await scanCached(fx);
    expect(r.blocked).toBeFalsy();
    const hit = r.patterns.find((p) => p.id === id);
    expect(hit?.triggered).toBe(true);
    const evKeys = Object.keys(hit?.evidence ?? {}).filter(
      (k) => k !== 'triggered' && k !== 'error'
    );
    expect(evKeys.length).toBeGreaterThan(0);
  });
}

test(
  'clean-artisan trips none of the registered patterns (negative anchor)',
  { skip: !RUN, timeout: 60_000 },
  async () => {
    const r = await scanCached('clean-artisan.html');
    expect(r.blocked).toBeFalsy();
    for (const [id] of CASES) {
      expect(r.patterns.find((p) => p.id === id)?.triggered ?? false).toBe(false);
    }
  }
);
