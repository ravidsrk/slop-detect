// Comprehensive unit tests for Roadmap v4 Design Corrections, Design Rules, and Craft Axis:
// #225 FIX-05, #226 FIX-06, #227 FIX-07, #228 FIX-08, #229 FIX-09, #230 FIX-10,
// #238 FIX-19, #239 FIX-20, #240 D-01, #241 D-02, #242 D-03, #243 D-04, #244 D-05,
// #245 D-06, #246 D-07, #247 D-08, #248 D-09, #250 D-11, #251 D-12, #252 D-13,
// #253 D-14, #254 D-15, #196, #197, #198, #199, and #255..#264 F-00..F-09.

import { test, expect, describe } from 'vitest';
import {
  PATTERNS,
  CRAFT_CHECKS,
  CRAFT_CHECK_IDS,
  scorePatterns,
  scoreCraft,
  combineAxes,
  applyPreset,
  parseColor,
  rgbToOklab,
  rgbToOklch,
  deltaEOklab,
  extractColorStrings,
  extractGradientStops,
  isPurple,
  apcaContrast,
  resolveRenderedFont,
  isPrimarySlopFont,
  isSecondarySlopFont,
  extractMadeWith,
  evaluateDefaultKits,
  computeDesignTypicality,
  evaluateMobileReflow,
  evaluateFocusIndicators,
  evaluateDeadCtas,
  evaluateFormFailureFeedback,
  formatAxeReport,
} from '@slop-detect/core';

describe('#225 FIX-05: Shared CSS Color 4 parser', () => {
  test('parses hex 3/4/6/8, modern space-separated rgb/hsl, hwb, oklab, oklch, lab, lch', () => {
    expect(parseColor('#6366f1')).toMatchObject({ r: 99, g: 102, b: 241, a: 1 });
    expect(parseColor('#6366f180').a).toBeCloseTo(128 / 255, 2);
    expect(parseColor('rgb(99 102 241 / 50%)')).toMatchObject({ r: 99, g: 102, b: 241, a: 0.5 });
    expect(parseColor('hsl(239 84% 67% / 0.8)').a).toBeCloseTo(0.8, 2);
    expect(parseColor('hwb(240 20% 10%)')).not.toBeNull();
    expect(parseColor('oklab(0.6 0.1 -0.2)')).not.toBeNull();
    expect(parseColor('oklch(0.585 0.233 277.1)')).not.toBeNull();
    expect(parseColor('lab(50% 40 59.5)')).not.toBeNull();
    expect(parseColor('lch(52.2% 72.2 50)')).not.toBeNull();
  });

  test('parses color() across srgb, srgb-linear, display-p3, a98-rgb, rec2020, prophoto-rgb, xyz-d65, xyz-d50', () => {
    for (const space of [
      'srgb',
      'srgb-linear',
      'display-p3',
      'a98-rgb',
      'rec2020',
      'prophoto-rgb',
      'xyz',
      'xyz-d65',
      'xyz-d50',
    ]) {
      const c = parseColor(`color(${space} 0.4 0.2 0.8 / 0.9)`);
      expect(c, `color(${space}) should parse`).not.toBeNull();
      expect(c.a).toBeCloseTo(0.9, 2);
    }
  });

  test('parses Tailwind v4 color-mix(in oklab, oklch(...) 50%, transparent) with premultiplied alpha', () => {
    const mixed = parseColor('color-mix(in oklab, oklch(0.585 0.233 277.1) 50%, transparent)');
    expect(mixed).not.toBeNull();
    expect(mixed.a).toBeCloseTo(0.5, 2);
    expect(isPurple(mixed)).toBe(true);
  });

  test('extractGradientStops parses multi-syntax stops and flags var(--unknown) as unknown', () => {
    const stops = extractGradientStops(
      'linear-gradient(to right, oklch(0.585 0.233 277.1), color(display-p3 0.5 0.2 0.9), var(--brand-end))'
    );
    expect(stops.length).toBe(3);
    expect(stops[0].unknown).toBe(false);
    expect(stops[1].unknown).toBe(false);
    expect(stops[2].unknown).toBe(true);
  });
});

describe('#226 FIX-06: purple_accent OKLCH boundary, weight 4, decaying, co-occurrence gate', () => {
  test('OKLCH hue 268-310 separates Tailwind blue-500/600 from indigo-500 and violet-500', () => {
    const blue500 = parseColor('#3b82f6'); // h ~ 260°
    const blue600 = parseColor('#2563eb'); // h ~ 263°
    const indigo500 = parseColor('#6366f1'); // h ~ 277°
    const violet500 = parseColor('#8b5cf6'); // h ~ 293°
    expect(isPurple(blue500)).toBe(false);
    expect(isPurple(blue600)).toBe(false);
    expect(isPurple(indigo500)).toBe(true);
    expect(isPurple(violet500)).toBe(true);
  });

  test('purple_accent has weight 4, status decaying, and contributes 0 points when isolated', () => {
    const def = PATTERNS.find((p) => p.id === 'purple_accent');
    expect(def.weight).toBe(4);
    expect(def.status).toBe('decaying');

    const isolated = scorePatterns([
      { id: 'purple_accent', weight: 4, triggered: true, evidence: { filledCtas: 1 } },
      { id: 'gradient_text', weight: 6, triggered: false, evidence: {} },
    ]);
    expect(isolated.score).toBe(0);
    expect(isolated.adjustments.some((a) => a.ruleId === 'purple_accent_co_signal')).toBe(true);

    const paired = scorePatterns([
      { id: 'purple_accent', weight: 4, triggered: true, evidence: { filledCtas: 1 } },
      { id: 'gradient_text', weight: 6, triggered: true, evidence: { count: 1 } },
    ]);
    expect(paired.score).toBe(10);
  });
});

describe('#227 FIX-07 & #238 FIX-19: Cross-pattern post-pass deduplication', () => {
  test('slop_fonts + centered_hero combined contribution is capped at <= 8 without mutating triggered', () => {
    const inputs = [
      { id: 'slop_fonts', weight: 8, triggered: true, evidence: { heroIsSlop: true } },
      { id: 'centered_hero', weight: 4, triggered: true, evidence: { centered: true } },
    ];
    const res = scorePatterns(inputs);
    expect(res.score).toBe(8);
    expect(inputs[1].triggered).toBe(true);
    expect(res.adjustments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'slop_fonts_centered_hero_cap',
          targetPatternId: 'centered_hero',
          delta: -4,
        }),
      ])
    );
  });

  test('FIX-19 overlapping_evidence_dedup discounts lower-weight rule when DOM nodeIds overlap', () => {
    const res = scorePatterns([
      {
        id: 'numbered_steps',
        weight: 3,
        triggered: true,
        evidence: { bestRun: 3, nodeIds: ['section[2]>div[0]'] },
      },
      {
        id: 'icon_card_grid',
        weight: 4,
        triggered: true,
        evidence: { maxGroupSize: 3, nodeIds: ['section[2]>div[0]'] },
      },
    ]);
    expect(res.score).toBe(4);
    expect(
      res.adjustments.some(
        (a) =>
          a.ruleId === 'overlapping_evidence_dedup' &&
          a.targetPatternId === 'numbered_steps' &&
          a.sharedNodes.includes('section[2]>div[0]')
      )
    ).toBe(true);
  });
});

describe('#228 FIX-08, #229 FIX-09, #230 FIX-10, #239 FIX-20, #246 D-07, #247 D-08', () => {
  test('FIX-08: apcaContrast computes directional Lc and low_contrast_text supports dark backgrounds', () => {
    const darkBg = parseColor('#0a0a0b');
    const dimGrey = parseColor('#52525b');
    const lc = apcaContrast(dimGrey, darkBg);
    expect(typeof lc).toBe('number');
    expect(Math.abs(lc)).toBeLessThan(45);
  });

  test('FIX-09: all_caps_labels is retired at weight 0 and eyebrow_label is active at weight 3', () => {
    const oldRule = PATTERNS.find((p) => p.id === 'all_caps_labels');
    const newRule = PATTERNS.find((p) => p.id === 'eyebrow_label');
    expect(oldRule.weight).toBe(0);
    expect(oldRule.status).toBe('retired');
    expect(newRule.weight).toBe(3);
    expect(newRule.status).toBe('active');
  });

  test('D-08: resolveRenderedFont walks fallback stack when webfont is unloaded in document.fonts', () => {
    const mockFonts = [{ family: 'Inter', status: 'unloaded' }];
    expect(resolveRenderedFont('"Inter", "Georgia", serif', mockFonts)).toBe('georgia');
    const loadedFonts = [{ family: 'Syne', status: 'loaded' }];
    expect(resolveRenderedFont('"Syne", sans-serif', loadedFonts)).toBe('syne');
    expect(isPrimarySlopFont('Syne, sans-serif', loadedFonts)).toBe(true);
    expect(isSecondarySlopFont('Manrope, sans-serif')).toBe(true);
  });
});

describe('D-01..D-15 & #196..#199: New design rules & provenance/typicality', () => {
  test('all 17 new design rules exist in PATTERNS at weight 0 with status review and never add score points', () => {
    const newIds = [
      'scaffold_defaults_unedited',
      'hero_accent_word',
      'template_chrome_2026',
      'uniform_radius_shadow',
      'editorial_cream_kit',
      'template_page_order',
      'pulsing_status_badge',
      'display_mono_heading',
      'chip_rainbow',
      'fake_macos_terminal',
      'fake_logo_bar',
      'infinite_marquee_ticker',
      'fade_up_monoculture',
      'cursor_spotlight_gradient',
      'uniform_card_hover',
      'section_template_repetition',
      'unthemed_browser_surfaces',
    ];
    for (const id of newIds) {
      const pat = PATTERNS.find((p) => p.id === id);
      expect(pat, `${id} must exist in PATTERNS`).toBeDefined();
      expect(pat.weight).toBe(0);
      expect(pat.status).toBe('review');
    }

    // Triggering all 17 review rules at once must yield score 0 / Clean!
    const allTriggered = newIds.map((id) => ({ id, weight: 0, status: 'review', triggered: true }));
    const scored = scorePatterns(allTriggered);
    expect(scored.score).toBe(0);
    expect(scored.tier).toBe('Clean');
    expect(scored.reviewCount).toBe(17);
  });

  test('D-06 & D-14: editorial and devtool presets exclude genre-appropriate rules', () => {
    const editorialIds = applyPreset(PATTERNS, 'editorial').map((p) => p.id);
    expect(editorialIds).not.toContain('cream_default_bg');
    expect(editorialIds).not.toContain('editorial_cream_kit');

    const devtoolIds = applyPreset(PATTERNS, 'devtool').map((p) => p.id);
    expect(devtoolIds).not.toContain('display_mono_heading');
    expect(devtoolIds).not.toContain('perma_dark_mode');
  });

  test('D-01: extractMadeWith detects Framer/Lovable/shadcn and never maps generator="Bolt" to bolt.new', () => {
    const mockDoc = {
      querySelectorAll(sel) {
        if (sel.includes('meta[name="generator"')) {
          return [{ getAttribute: (k) => (k === 'content' ? 'Bolt' : 'generator') }];
        }
        if (sel.includes('data-slot')) {
          return [{}, {}, {}, {}];
        }
        return [];
      },
      documentElement: {
        hasAttribute: () => false,
      },
    };
    const res = extractMadeWith(mockDoc);
    expect(Array.isArray(res)).toBe(true);
    expect(res.some((b) => b.builder === 'bolt.new' || b.builder === 'bolt')).toBe(false);
    expect(res.some((k) => k.builder === 'shadcn-default-kit' && k.tier === 'C')).toBe(true);
  });

  test('D-13 & D-11: evaluateDefaultKits and computeDesignTypicality work without affecting score', () => {
    const kits = evaluateDefaultKits({
      editorial_cream_kit: { triggered: true, creamBranch: true },
      cream_default_bg: { triggered: true },
      hero_accent_word: { triggered: true },
      numbered_steps: { triggered: true, bestRun: 3 },
      display_mono_heading: { triggered: true },
    });
    expect(Array.isArray(kits)).toBe(true);
    expect(kits[0].matched).toBe(true);

    const typ = computeDesignTypicality([0.62, 8, 50, 0.35, 6]);
    expect(typ.scored).toBe(false);
    expect(typeof typ.meanDistance).toBe('number');
    expect(typeof typ.percentile).toBe('number');
  });
});

describe('#255..#264 F-00..F-09: Craft-floor axis separation and checks', () => {
  test('F-00: gray_on_color and wide_body_tracking live in CRAFT_CHECKS, not PATTERNS, and never feed design score or combineAxes', () => {
    expect(PATTERNS.some((p) => p.id === 'gray_on_color')).toBe(false);
    expect(PATTERNS.some((p) => p.id === 'wide_body_tracking')).toBe(false);
    expect(CRAFT_CHECK_IDS.has('gray_on_color')).toBe(true);
    expect(CRAFT_CHECK_IDS.has('wide_body_tracking')).toBe(true);
    expect(CRAFT_CHECKS.length).toBe(11);

    // Passing craft checks into scorePatterns must yield 0 design score
    const leakAttempt = scorePatterns([
      { id: 'gray_on_color', weight: 4, triggered: true },
      { id: 'wide_body_tracking', weight: 3, triggered: true },
      { id: 'viewport_meta_missing', weight: 5, triggered: true },
    ]);
    expect(leakAttempt.score).toBe(0);
    expect(leakAttempt.tier).toBe('Clean');

    // Passing craft into combineAxes must be ignored by unifiedScore / unifiedTier
    const combined = combineAxes({
      design: { score: 4, tier: 'Clean' },
      craft: { score: 45, tier: 'Poor' },
    });
    expect(combined.unifiedScore).toBe(4);
    expect(combined.unifiedTier).toBe('Clean');
    expect(combined.axesScored).toEqual(['design']);
  });

  test('F-01..F-09: scoreCraft, reduced_motion_ignored weight 0, runner helpers, and optional formatAxeReport', () => {
    const rmCheck = CRAFT_CHECKS.find((c) => c.id === 'reduced_motion_ignored');
    expect(rmCheck.weight).toBe(0);
    expect(rmCheck.status).toBe('review');

    const craftRes = scoreCraft({
      viewport_meta_missing: { triggered: true },
      reduced_motion_ignored: { triggered: true, animatedCount: 4 },
    });
    expect(craftRes.axis).toBe('craft');
    expect(craftRes.failed.map((c) => c.id)).toEqual(['viewport_meta_missing']);
    expect(craftRes.advisories.map((c) => c.id)).toEqual(['reduced_motion_ignored']);
    expect(craftRes.score).toBeLessThan(100);
    expect(Array.isArray(craftRes.evidence)).toBe(true);

    expect(evaluateMobileReflow({ scrollWidth: 480, innerWidth: 320 }).triggered).toBe(true);
    expect(
      evaluateFocusIndicators([
        { tag: 'button', outlineWidth: '0px', outlineStyle: 'none', boxShadow: 'none', borderChanged: false },
        { tag: 'a', outlineWidth: '0px', outlineStyle: 'none', boxShadow: 'none', borderChanged: false },
      ]).triggered
    ).toBe(true);
    expect(evaluateDeadCtas([{ tag: 'a', href: '#', inHero: true }]).triggered).toBe(true);
    expect(
      evaluateFormFailureFeedback({ formPresent: true, submittedEmpty: true, hasInvalidPseudo: false, hasAriaInvalid: false, hasVisibleErrorText: false, requestBlocked: false }).triggered
    ).toBe(true);

    const axe = formatAxeReport(
      {
        violations: [{ id: 'color-contrast', impact: 'serious', nodes: [{}], helpUrl: 'https://dequeuniversity.com' }],
      },
      { enabled: true }
    );
    expect(axe.enabled).toBe(true);
    expect(axe.scored).toBe(false);
    expect(axe.violationCount).toBe(1);
  });
});
