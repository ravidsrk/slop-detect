// Per-pattern positive coverage registry (G-18 / gh-92).
//
// golden.test.js pins whole-page behavior on 2 fixtures; this file pins that
// EVERY design-pattern extractor fires on a page built to exhibit it — one
// positive-detection case per pattern ID. Cases scan their fixture once (cached
// per file) and assert the pattern triggers with non-empty evidence.
//
// Same gating as golden.test.js: needs Playwright + Chromium, so it runs under
// RUN_GOLDEN=1 (locally + the CI "Smoke test CLI" job, which is required on
// every PR — a regression in any extractor fails the PR). The id-list test
// below is never skipped: every PATTERNS id needs a row. Retired rules stay
// in the list and must not fire. Craft checks are not design patterns.

import { test, expect } from 'vitest';
import { scanUrl } from '../src/index.ts';
import { PATTERNS } from '@slop-detect/core';

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
  // ── T-18c batch (IDs 19–27) ──
  ['ai_sparkle_badges', 'pat-ai_sparkle_badges.html'],
  ['cream_default_bg', 'pat-cream_default_bg.html'],
  ['low_contrast_text', 'pat-low_contrast_text.html'],
  ['crushed_tracking', 'pat-crushed_tracking.html'],
  ['oversized_hero_h1', 'pat-oversized_hero_h1.html'],
  ['nested_cards', 'pat-nested_cards.html'],
  ['flat_type_hierarchy', 'pat-flat_type_hierarchy.html'],
  // ── 2026.11 design rules (weight 0 review, plus retired all_caps_labels above) ──
  ['slop_fonts_2026', 'pat-slop_fonts_2026.html'],
  ['accent_stripe_2026', 'pat-accent_stripe_2026.html'],
  ['eyebrow_label', 'pat-eyebrow_label.html'],
  ['scaffold_defaults_unedited', 'pat-scaffold_defaults_unedited.html'],
  ['hero_accent_word', 'pat-hero_accent_word.html'],
  ['template_chrome_2026', 'pat-template_chrome_2026.html'],
  ['uniform_radius_shadow', 'pat-uniform_radius_shadow.html'],
  ['editorial_cream_kit', 'pat-editorial_cream_kit.html'],
  ['template_page_order', 'pat-template_page_order.html'],
  ['pulsing_status_badge', 'pat-pulsing_status_badge.html'],
  ['display_mono_heading', 'pat-display_mono_heading.html'],
  ['chip_rainbow', 'pat-chip_rainbow.html'],
  ['fake_macos_terminal', 'pat-fake_macos_terminal.html'],
  ['fake_logo_bar', 'pat-fake_logo_bar.html'],
  ['infinite_marquee_ticker', 'pat-infinite_marquee_ticker.html'],
  ['fade_up_monoculture', 'pat-fade_up_monoculture.html'],
  ['cursor_spotlight_gradient', 'pat-cursor_spotlight_gradient.html'],
  ['uniform_card_hover', 'pat-uniform_card_hover.html'],
  ['section_template_repetition', 'pat-section_template_repetition.html'],
  ['unthemed_browser_surfaces', 'pat-unthemed_browser_surfaces.html'],
];

for (const [id, fx] of CASES) {
  const retired = PATTERNS.find((p) => p.id === id)?.status === 'retired';
  test(
    retired
      ? `${id} stays retired on its fixture (${fx})`
      : `${id} fires on its positive fixture (${fx})`,
    { skip: !RUN, timeout: 60_000 },
    async () => {
      const r = await scanCached(fx);
      expect(r.blocked).toBeFalsy();
      const hit = r.patterns.find((p) => p.id === id);
      if (retired) {
        expect(hit?.triggered ?? false).toBe(false);
        return;
      }
      expect(hit?.triggered).toBe(true);
      const evKeys = Object.keys(hit?.evidence ?? {}).filter(
        (k) => k !== 'triggered' && k !== 'error'
      );
      expect(evKeys.length).toBeGreaterThan(0);
    }
  );
}

test('registry covers every engine pattern id (no silent gaps)', () => {
  // Unskipped on purpose: a future 28th pattern with no positive fixture
  // must fail the DEFAULT suite, not just the golden run.
  expect(CASES.map(([id]) => id).sort()).toEqual(PATTERNS.map((p) => p.id).sort());
});

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
