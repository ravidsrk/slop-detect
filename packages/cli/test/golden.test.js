// Golden detection tests — scan self-contained HTML fixtures in a REAL headless
// browser and pin the detector's behavior on known-clean vs. known-slop pages.
// This is the only coverage that exercises the 27 design-pattern `extract`
// functions end to end (they need layout + computed styles, so jsdom won't do).
//
// Gated behind RUN_GOLDEN=1 because it needs Playwright + a Chromium binary. The
// default `npm test` (and the browser-free CI "Unit tests" job) skip it; the
// CI "Smoke test CLI" job installs Chromium and runs it with RUN_GOLDEN=1.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanUrl } from '../src/detector.js';

const RUN = process.env.RUN_GOLDEN === '1';
const fixture = (name) => new URL(`./fixtures/${name}`, import.meta.url).href;
const triggered = (r, id) => r.patterns.find((p) => p.id === id)?.triggered === true;

test('clean artisan page scores Clean and trips no font/purple tells', { skip: !RUN }, async () => {
  const r = await scanUrl(fixture('clean-artisan.html'), { axes: ['design'] });
  assert.equal(r.tier, 'Clean', `expected Clean, got ${r.tier} (score ${r.score})`);
  assert.ok(r.score < 10, `Clean must be < 10, got ${r.score}`);
  assert.equal(triggered(r, 'slop_fonts'), false, 'serif/system stack is not a slop font');
  assert.equal(triggered(r, 'purple_accent'), false, 'no VibeCode purple here');
  assert.equal(triggered(r, 'gradient_text'), false, 'no gradient-clip headline');
});

test('maximal VibeCode page scores out of Clean with the canonical tells', { skip: !RUN }, async () => {
  const r = await scanUrl(fixture('slop-vibecode.html'), { axes: ['design'] });
  // Coarse-but-robust: a page wearing Inter + indigo gradients + a gradient-clip
  // H1 must not read as Clean, and the three dead-giveaways must fire.
  assert.notEqual(r.tier, 'Clean', `slop page must not be Clean (score ${r.score})`);
  assert.ok(r.score >= 10, `expected Mild+ (>=10), got ${r.score}`);
  assert.equal(triggered(r, 'slop_fonts'), true, 'Inter stack should trip slop_fonts');
  assert.equal(triggered(r, 'gradient_text'), true, 'gradient-clip H1 should trip gradient_text');
  assert.equal(triggered(r, 'purple_accent'), true, 'violet filled CTA should trip purple_accent');
});

test('the two fixtures are clearly separated (slop scores well above clean)', { skip: !RUN }, async () => {
  const [clean, slop] = await Promise.all([
    scanUrl(fixture('clean-artisan.html'), { axes: ['design'] }),
    scanUrl(fixture('slop-vibecode.html'), { axes: ['design'] })
  ]);
  assert.ok(slop.score - clean.score >= 15,
    `expected a clear gap; clean=${clean.score} slop=${slop.score}`);
});
