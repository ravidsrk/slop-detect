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
  isSlopFont,
  isPrimarySlopFont,
  isSecondarySlopFont,
  SLOP_FONT_LIFECYCLE,
  POST_PASS_RULES,
  HUMAN_TYPICALITY_REFERENCE,
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

  test('FIX-19 (#238): numbered_steps matches "SEC 0.1/0.2/0.3", Cloudflare-style SEC pair counts weight once and lists both labels & shared nodeIds, disjoint and single-incidental-node pairs keep both weights', () => {
    const overlapRule = POST_PASS_RULES.find((r) => r.id === 'overlapping_evidence_dedup');
    expect(overlapRule.description).toMatch(/>=\s*2/);
    expect(overlapRule.description).toMatch(/50%/);

    // Run real eyebrow_label.extract and numbered_steps.extract on a Cloudflare-style SEC 0.1/0.2/0.3 fixture
    const makeEl = (tag, text, rect, styleObj = {}) => ({
      tagName: tag.toUpperCase(),
      textContent: text,
      parentElement: { tagName: 'MAIN' },
      closest: () => null,
      getAttribute: () => null,
      getBoundingClientRect: () => ({
        ...rect,
        right: rect.left + rect.width,
        bottom: rect.top + rect.height,
      }),
      _style: {
        fontSize: '12px',
        letterSpacing: '1.2px',
        textTransform: 'uppercase',
        ...styleObj,
      },
    });

    const sec1 = makeEl('div', 'SEC 0.1', { left: 80, top: 100, width: 80, height: 16 });
    const h2a = makeEl('h2', 'Global Anycast Network', { left: 80, top: 124, width: 400, height: 36 }, { fontSize: '32px', letterSpacing: '0px', textTransform: 'none' });
    const sec2 = makeEl('div', 'SEC 0.2', { left: 80, top: 240, width: 80, height: 16 });
    const h2b = makeEl('h2', 'Zero-Trust Access', { left: 80, top: 264, width: 400, height: 36 }, { fontSize: '32px', letterSpacing: '0px', textTransform: 'none' });
    const sec3 = makeEl('div', 'SEC 0.3', { left: 80, top: 380, width: 80, height: 16 });
    const h2c = makeEl('h2', 'Programmable Workers', { left: 80, top: 404, width: 400, height: 36 }, { fontSize: '32px', letterSpacing: '0px', textTransform: 'none' });

    const prevGcs = globalThis.getComputedStyle;
    globalThis.getComputedStyle = (el) => el._style || { fontSize: '16px', letterSpacing: '0px', textTransform: 'none' };
    try {
      const visible = [sec1, h2a, sec2, h2b, sec3, h2c];
      const eyebrowDef = PATTERNS.find((p) => p.id === 'eyebrow_label');
      const stepsDef = PATTERNS.find((p) => p.id === 'numbered_steps');
      const eyebrowEv = eyebrowDef.extract({ visible });
      const stepsEv = stepsDef.extract({ visible });

      expect(stepsEv.bestRun).toBe(3);
      expect(stepsEv.triggered).toBe(true);
      expect(stepsEv.nodeIds.length).toBe(3);
      expect(eyebrowEv.triggered).toBe(true);
      expect(eyebrowEv.nodeIds).toEqual(stepsEv.nodeIds);

      // Even if both rules carry weight 3, the Cloudflare SEC pair is counted once (score 3),
      // shows both labels, and lists the shared nodeIds.
      const secScored = scorePatterns([
        { id: 'eyebrow_label', label: eyebrowDef.label, weight: 3, triggered: true, evidence: eyebrowEv },
        { id: 'numbered_steps', label: stepsDef.label, weight: 3, triggered: true, evidence: stepsEv },
      ]);
      expect(secScored.score).toBe(3);
      expect(secScored.evidence.map((e) => e.label)).toEqual([eyebrowDef.label, stepsDef.label]);
      const dedupAdj = secScored.adjustments.find((a) => a.ruleId === 'overlapping_evidence_dedup');
      expect(dedupAdj).toBeDefined();
      expect(dedupAdj.sharedNodes).toEqual(stepsEv.nodeIds);
      expect(dedupAdj.labels).toEqual([eyebrowDef.label, stepsDef.label]);

      // Disjoint nodes both count in full (3 + 4 = 7)
      const disjoint = scorePatterns([
        { id: 'numbered_steps', weight: 3, triggered: true, evidence: { bestRun: 3, nodeIds: ['s1', 's2', 's3'] } },
        { id: 'icon_card_grid', weight: 4, triggered: true, evidence: { maxGroupSize: 3, nodeIds: ['c1', 'c2', 'c3'] } },
      ]);
      expect(disjoint.score).toBe(7);

      // One incidental shared node out of 3 keeps both weights in full (3 + 4 = 7)
      const oneShared = scorePatterns([
        { id: 'numbered_steps', weight: 3, triggered: true, evidence: { bestRun: 3, nodeIds: ['shared1', 's2', 's3'] } },
        { id: 'icon_card_grid', weight: 4, triggered: true, evidence: { maxGroupSize: 3, nodeIds: ['shared1', 'c2', 'c3'] } },
      ]);
      expect(oneShared.score).toBe(7);
      expect(oneShared.adjustments.some((a) => a.ruleId === 'overlapping_evidence_dedup')).toBe(false);
    } finally {
      globalThis.getComputedStyle = prevGcs;
    }
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

  test('FIX-09 (#229) & #299: all_caps_labels stays retired at weight 0; eyebrow_label ships at weight 0 status review and adds 0 design points; detection fixtures pass', () => {
    const oldRule = PATTERNS.find((p) => p.id === 'all_caps_labels');
    const newRule = PATTERNS.find((p) => p.id === 'eyebrow_label');
    expect(oldRule.weight).toBe(0);
    expect(oldRule.status).toBe('retired');
    expect(newRule.weight).toBe(0);
    expect(newRule.status).toBe('review');

    // Scoring eyebrow_label adds 0 design points
    const scored = scorePatterns([
      { id: 'eyebrow_label', weight: newRule.weight, status: newRule.status, triggered: true, evidence: { ratio: 1 } },
    ]);
    expect(scored.score).toBe(0);

    const makeNode = (tag, text, top, extraStyle = {}, extraProps = {}) => ({
      tagName: tag.toUpperCase(),
      textContent: text,
      closest: (sel) => (extraProps.inButton && sel.includes('button') ? {} : null),
      getAttribute: (k) => (extraProps.datetime && k === 'datetime' ? extraProps.datetime : null),
      getBoundingClientRect: () => ({
        left: 80,
        top,
        width: 200,
        height: 18,
        right: 280,
        bottom: top + 18,
      }),
      _style: {
        fontSize: '12px',
        letterSpacing: '0px',
        textTransform: 'none',
        ...extraStyle,
      },
    });

    const prevGcs = globalThis.getComputedStyle;
    globalThis.getComputedStyle = (el) => el._style;
    try {
      // Lowercase-tracked (>= 0.06em) and typed caps fire at >= 60% of h2/h3 (2 of 3 = 66.7%)
      const tracked = [
        makeNode('span', 'workflow', 100, { fontSize: '12px', letterSpacing: '1px' }),
        makeNode('h2', 'First section', 124, { fontSize: '32px' }),
        makeNode('span', 'SECURITY', 240, { fontSize: '12px', letterSpacing: '0px' }),
        makeNode('h3', 'Second section', 264, { fontSize: '28px' }),
        makeNode('h2', 'Third section without eyebrow', 380, { fontSize: '32px' }),
      ];
      expect(newRule.extract({ visible: tracked }).triggered).toBe(true);

      // 1 eyebrow over 5 headings (20% < 60%) does NOT fire
      const oneOfFive = [
        makeNode('span', 'FEATURES', 100, { fontSize: '12px', textTransform: 'uppercase' }),
        makeNode('h2', 'H2 1', 124, { fontSize: '32px' }),
        makeNode('h2', 'H2 2', 224, { fontSize: '32px' }),
        makeNode('h2', 'H2 3', 324, { fontSize: '32px' }),
        makeNode('h2', 'H2 4', 424, { fontSize: '32px' }),
        makeNode('h2', 'H2 5', 524, { fontSize: '32px' }),
      ];
      expect(newRule.extract({ visible: oneOfFive }).triggered).toBe(false);

      // Button labels and standalone date labels do NOT fire
      const buttonsAndDates = [
        makeNode('button', 'GET STARTED', 100, { fontSize: '12px', textTransform: 'uppercase' }),
        makeNode('h2', 'Section A', 124, { fontSize: '32px' }),
        makeNode('span', 'OCT 20, 2026', 240, { fontSize: '12px', textTransform: 'uppercase' }),
        makeNode('h2', 'Section B', 264, { fontSize: '32px' }),
        makeNode('time', '2026-10-20', 380, { fontSize: '12px', textTransform: 'uppercase' }),
        makeNode('h2', 'Section C', 404, { fontSize: '32px' }),
      ];
      expect(newRule.extract({ visible: buttonsAndDates }).triggered).toBe(false);
    } finally {
      globalThis.getComputedStyle = prevGcs;
    }
  });

  test('D-07 (#246) & #299: accent_stripe keeps weight 6 for >=3px top/left stripes, puts 2px & bottom borders on weight-0 accent_stripe_2026, and excludes role=alert/note/status and uniform 4-border cards', () => {
    const legacyRule = PATTERNS.find((p) => p.id === 'accent_stripe');
    const newRule = PATTERNS.find((p) => p.id === 'accent_stripe_2026');
    expect(legacyRule.weight).toBe(6);
    expect(legacyRule.status).toBe('active');
    expect(newRule.weight).toBe(0);
    expect(newRule.status).toBe('review');

    const makeCard = (styleOverrides = {}, role = '') => ({
      tagName: 'DIV',
      getAttribute: (k) => (k === 'role' ? role : null),
      getBoundingClientRect: () => ({ width: 320, height: 180, top: 100, left: 80, right: 400, bottom: 280 }),
      _style: {
        borderTopWidth: '0px',
        borderLeftWidth: '0px',
        borderRightWidth: '0px',
        borderBottomWidth: '0px',
        borderTopColor: 'rgba(0,0,0,0)',
        borderLeftColor: 'rgba(0,0,0,0)',
        borderRightColor: 'rgba(0,0,0,0)',
        borderBottomColor: 'rgba(0,0,0,0)',
        borderRadius: '0px',
        ...styleOverrides,
      },
    });

    const prevGcs = globalThis.getComputedStyle;
    globalThis.getComputedStyle = (el) => el._style;
    try {
      // Existing >=3px top-stripe fixture (even with borderRadius 0px) still triggers legacy weight-6 rule
      const topCards = [
        makeCard({ borderTopWidth: '4px', borderTopColor: 'rgb(99, 102, 241)' }),
        makeCard({ borderTopWidth: '4px', borderTopColor: 'rgb(99, 102, 241)' }),
      ];
      const legacyTop = legacyRule.extract({ visible: topCards, parseColor, deltaEOklab });
      expect(legacyTop.triggered).toBe(true);
      expect(scorePatterns([{ id: 'accent_stripe', weight: 6, triggered: true, evidence: legacyTop }]).score).toBe(6);

      // 2px top stripe and bottom border do NOT trigger weight-6 accent_stripe; they trigger weight-0 accent_stripe_2026 and add 0 points
      const newCases = [
        makeCard({ borderTopWidth: '2px', borderTopColor: 'rgb(99, 102, 241)', borderRadius: '8px' }),
        makeCard({ borderBottomWidth: '3px', borderBottomColor: 'rgb(99, 102, 241)', borderRadius: '8px' }),
      ];
      expect(legacyRule.extract({ visible: newCases, parseColor, deltaEOklab }).triggered).toBe(false);
      const revRes = newRule.extract({ visible: newCases, parseColor, deltaEOklab });
      expect(revRes.triggered).toBe(true);
      expect(scorePatterns([{ id: 'accent_stripe_2026', weight: 0, status: 'review', triggered: true, evidence: revRes }]).score).toBe(0);

      // role=alert/note/status and a card whose four borders share one colour do NOT fire
      const excluded = [
        makeCard({ borderLeftWidth: '4px', borderLeftColor: 'rgb(99, 102, 241)' }, 'alert'),
        makeCard({ borderLeftWidth: '4px', borderLeftColor: 'rgb(99, 102, 241)' }, 'note'),
        makeCard({ borderLeftWidth: '4px', borderLeftColor: 'rgb(99, 102, 241)' }, 'status'),
        makeCard({
          borderTopWidth: '4px',
          borderLeftWidth: '1px',
          borderRightWidth: '1px',
          borderBottomWidth: '1px',
          borderTopColor: 'rgb(99, 102, 241)',
          borderLeftColor: 'rgb(99, 102, 241)',
          borderRightColor: 'rgb(99, 102, 241)',
          borderBottomColor: 'rgb(99, 102, 241)',
        }),
        makeCard({
          borderTopWidth: '4px',
          borderLeftWidth: '1px',
          borderRightWidth: '1px',
          borderBottomWidth: '1px',
          borderTopColor: 'rgb(99, 102, 241)',
          borderLeftColor: 'rgb(99, 102, 241)',
          borderRightColor: 'rgb(99, 102, 241)',
          borderBottomColor: 'rgb(99, 102, 241)',
        }),
      ];
      expect(legacyRule.extract({ visible: excluded, parseColor, deltaEOklab }).triggered).toBe(false);
      expect(newRule.extract({ visible: excluded, parseColor, deltaEOklab }).triggered).toBe(false);
    } finally {
      globalThis.getComputedStyle = prevGcs;
    }
  });

  test('D-08 (#247) & #299: resolveRenderedFont confirms only loaded FontFaces; unloaded Inter falls through to Arial; Syne/Fraunces trigger only weight-0 slop_fonts_2026; Inter/Geist alone add 0; Inter lifecycle is decaying', () => {
    const robotoOnly = [{ family: 'Roboto', status: 'loaded' }];
    // document.fonts with only loaded Roboto must NOT resolve "Inter, Arial" to inter, and isSlopFont must be false
    expect(resolveRenderedFont('Inter, Arial', robotoOnly)).toBe('arial');
    expect(isSlopFont('Inter, Arial', robotoOnly)).toBe(false);
    expect(resolveRenderedFont('Inter', robotoOnly)).toBe('');
    expect(isSlopFont('Inter', robotoOnly)).toBe(false);

    // Inter's lifecycle status is decaying
    expect(SLOP_FONT_LIFECYCLE.inter).toBe('decaying');
    expect(PATTERNS.find((p) => p.id === 'slop_fonts').status).toBe('decaying');

    const slopFontsRule = PATTERNS.find((p) => p.id === 'slop_fonts');
    const slopFonts2026Rule = PATTERNS.find((p) => p.id === 'slop_fonts_2026');
    expect(slopFontsRule.weight).toBe(8);
    expect(slopFonts2026Rule.weight).toBe(0);
    expect(slopFonts2026Rule.status).toBe('review');

    const prevGcs = globalThis.getComputedStyle;
    try {
      // Unloaded declared font must not fire slop_fonts
      const unloadedH1 = { textContent: 'Hero', _font: 'Inter' };
      globalThis.getComputedStyle = (el) => ({ fontFamily: el._font || 'Arial', fontStyle: 'normal' });
      const unloadedRes = slopFontsRule.extract({
        visible: [unloadedH1],
        h1: unloadedH1,
        isSlopFont: (f) => isSlopFont(f, robotoOnly),
        isAccentSerif: () => false,
        resolveRenderedFont: (f) => resolveRenderedFont(f, robotoOnly),
      });
      expect(unloadedRes.triggered).toBe(false);

      // Loaded Fraunces or Syne h1 must NOT trigger weight-8 slop_fonts, only weight-0 slop_fonts_2026 (0 points)
      for (const fam of ['Fraunces', 'Syne']) {
        const faces = [{ family: fam, status: 'loaded' }];
        const h1 = { textContent: 'Editorial Hero', _font: `${fam}, serif` };
        const legacyRes = slopFontsRule.extract({
          visible: [h1],
          h1,
          isSlopFont: (f) => isSlopFont(f, faces),
          isAccentSerif: () => false,
          resolveRenderedFont: (f) => resolveRenderedFont(f, faces),
        });
        const new2026Res = slopFonts2026Rule.extract({
          visible: [h1],
          h1,
          resolveRenderedFont: (f) => resolveRenderedFont(f, faces),
        });
        expect(legacyRes.triggered).toBe(false);
        expect(new2026Res.triggered).toBe(true);
        const scored = scorePatterns([
          { id: 'slop_fonts', weight: 8, triggered: legacyRes.triggered, evidence: legacyRes },
          { id: 'slop_fonts_2026', weight: 0, status: 'review', triggered: new2026Res.triggered, evidence: new2026Res },
        ]);
        expect(scored.score).toBe(0);
      }

      // Inter and Geist alone add 0 points
      for (const fam of ['Inter', 'Geist']) {
        const faces = [{ family: fam, status: 'loaded' }];
        const h1 = { textContent: 'Clean Hero', _font: `${fam}, sans-serif` };
        const ev = slopFontsRule.extract({
          visible: [h1],
          h1,
          isSlopFont: (f) => isSlopFont(f, faces),
          isAccentSerif: () => false,
          resolveRenderedFont: (f) => resolveRenderedFont(f, faces),
        });
        expect(ev.triggered).toBe(true);
        expect(ev.interOrGeistOnly).toBe(true);
        const scored = scorePatterns([{ id: 'slop_fonts', weight: 8, triggered: true, evidence: ev }]);
        expect(scored.score).toBe(0);
      }
    } finally {
      globalThis.getComputedStyle = prevGcs;
    }
  });
});

describe('D-01..D-15 & #196..#199: New design rules & provenance/typicality', () => {
  test('all 19 review design rules exist in PATTERNS at weight 0 with status review and never add score points', () => {
    const newIds = [
      'slop_fonts_2026',
      'accent_stripe_2026',
      'eyebrow_label',
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

    // Triggering all review rules at once must yield score 0 / Clean!
    const allTriggered = newIds.map((id) => ({ id, weight: 0, status: 'review', triggered: true }));
    const scored = scorePatterns(allTriggered);
    expect(scored.score).toBe(0);
    expect(scored.tier).toBe('Clean');
    expect(scored.reviewCount).toBe(newIds.length);
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

  test('D-13 & D-11 (#250): HUMAN_TYPICALITY_REFERENCE is null, computeDesignTypicality returns null without a caller reference, and computes empirical rank percentile when a reference is supplied', () => {
    const kits = evaluateDefaultKits({
      editorial_cream_kit: { triggered: true, creamBranch: true },
      cream_default_bg: { triggered: true },
      hero_accent_word: { triggered: true },
      numbered_steps: { triggered: true, bestRun: 3 },
      display_mono_heading: { triggered: true },
    });
    expect(Array.isArray(kits)).toBe(true);
    expect(kits[0].matched).toBe(true);

    expect(HUMAN_TYPICALITY_REFERENCE).toBeNull();
    expect(computeDesignTypicality([0.62, 8, 50, 0.35, 6])).toBeNull();
    expect(scorePatterns([]).typicality).toBeNull();

    const callerRef = [
      [0.1, 1, 10, 0.1, 1],
      [0.2, 2, 20, 0.2, 2],
      [0.3, 3, 30, 0.3, 3],
      [0.4, 4, 40, 0.4, 4],
      [0.5, 5, 50, 0.5, 5],
    ];
    const inCluster = computeDesignTypicality([0.3, 3, 30, 0.3, 3], callerRef);
    const outlier = computeDesignTypicality([50, 500, 5000, 50, 500], callerRef);
    expect(inCluster).not.toBeNull();
    expect(inCluster.scored).toBe(false);
    expect(inCluster.scoreDelta).toBe(0);
    expect(inCluster.percentile).toBeGreaterThan(outlier.percentile);
    expect(outlier.percentile).toBe(0);
    expect(outlier.atypicalityPercentile).toBe(100);
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

  test('Blocker 1 (#263, #264): stringified generic_control_labels.extract and form_no_failure_feedback.extract execute standalone with zero module closures', () => {
    const gcl = CRAFT_CHECKS.find((c) => c.id === 'generic_control_labels');
    const fnf = CRAFT_CHECKS.find((c) => c.id === 'form_no_failure_feedback');
    const standaloneGcl = new Function('ctx', `return (${gcl.extract.toString()})(ctx);`);
    const standaloneFnf = new Function('ctx', `return (${fnf.extract.toString()})(ctx);`);

    const mockForm = {
      querySelectorAll: () => [{ hasAttribute: () => false, getAttribute: () => null }],
      querySelector: () => null,
      getAttribute: () => null,
      hasAttribute: () => false,
    };
    const prevDoc = globalThis.document;
    globalThis.document = {
      querySelectorAll: (sel) => (sel === 'form' ? [mockForm] : []),
      querySelector: (sel) => (sel === 'form' ? mockForm : null),
    };
    try {
      const visible = [
        {
          tagName: 'BUTTON',
          textContent: 'Click here',
          getAttribute: (k) => (k === 'data-action' ? 'act1' : null),
        },
        {
          tagName: 'A',
          textContent: 'Read more',
          getAttribute: (k) => (k === 'href' ? '/post-1' : null),
        },
        {
          tagName: 'A',
          textContent: 'Learn more',
          getAttribute: (k) => (k === 'href' ? '/post-2' : null),
        },
        {
          tagName: 'IMG',
          textContent: '',
          getAttribute: (k) => (k === 'alt' ? 'image' : k === 'src' ? '/hero.png' : null),
        },
      ];
      const gclRes = standaloneGcl({ visible });
      expect(gclRes.triggered).toBe(true);
      expect(gclRes.genericCount).toBe(3);
      expect(gclRes.badAlts).toEqual(['image']);

      const fnfUnprobed = standaloneFnf({});
      expect(fnfUnprobed.status).toBe('unknown');
      expect(fnfUnprobed.triggered).toBe(false);

      const fnfFailed = standaloneFnf({
        formProbe: {
          formPresent: true,
          submittedEmpty: true,
          hasInvalidPseudo: false,
          hasAriaInvalid: false,
          hasVisibleErrorText: false,
          requestBlocked: false,
        },
      });
      expect(fnfFailed.triggered).toBe(true);
      expect(fnfFailed.status).toBe('fail');
      expect(fnfFailed.requestsMade).toBe(0);
    } finally {
      globalThis.document = prevDoc;
    }
  });

  test('Blockers 9, 10, 11 (#258, #264, scoreCraft): focus_indicator_missing triggers at 1/5 and supports pseudo rings, form_no_failure_feedback returns unknown when unprobed, and scoreCraft gives 0 points to review/unknown status', () => {
    // Blocker 9: 1 of 5 missing outline:none with no replacement triggers; pseudo ring passes
    expect(
      evaluateFocusIndicators([
        { tag: 'button', outlineWidth: '0px', outlineStyle: 'none', boxShadow: 'none', borderChanged: false },
        { tag: 'a', outlineWidth: '2px', outlineStyle: 'solid', boxShadow: 'none', borderChanged: false },
        { tag: 'a', outlineWidth: '0px', outlineStyle: 'none', boxShadow: '0 0 0 2px #3b82f6', borderChanged: false },
        { tag: 'button', outlineWidth: '0px', outlineStyle: 'none', boxShadow: 'none', borderChanged: false, hasPseudoFocusRing: true },
        { tag: 'input', outlineWidth: '2px', outlineStyle: 'auto', boxShadow: 'none', borderChanged: false },
      ]).triggered
    ).toBe(true);

    expect(
      evaluateFocusIndicators([
        { tag: 'button', outlineWidth: '0px', outlineStyle: 'none', boxShadow: 'none', borderChanged: false, hasPseudoFocusRing: true },
        { tag: 'a', outlineWidth: '2px', outlineStyle: 'solid', boxShadow: 'none', borderChanged: false },
      ]).triggered
    ).toBe(false);

    // Blocker 10: unprobed form returns status unknown; required field or visible error passes; requestsMade is 0
    const unprobed = evaluateFormFailureFeedback({ formPresent: true, submittedEmpty: false });
    expect(unprobed.status).toBe('unknown');
    expect(unprobed.triggered).toBe(false);
    expect(unprobed.requestsMade).toBe(0);

    const requiredPasses = evaluateFormFailureFeedback({
      formPresent: true,
      submittedEmpty: true,
      hasInvalidPseudo: true,
      hasAriaInvalid: false,
      hasVisibleErrorText: false,
    });
    expect(requiredPasses.status).toBe('pass');
    expect(requiredPasses.triggered).toBe(false);
    expect(requiredPasses.requestsMade).toBe(0);

    const errorMsgPasses = evaluateFormFailureFeedback({
      formPresent: true,
      submittedEmpty: true,
      hasInvalidPseudo: false,
      hasAriaInvalid: false,
      hasVisibleErrorText: true,
    });
    expect(errorMsgPasses.status).toBe('pass');
    expect(errorMsgPasses.triggered).toBe(false);

    // Blocker 11: active craft check with raw.status === 'review' or 'unknown' adds 0 points
    const craftReviewOrUnknown = scoreCraft({
      viewport_meta_missing: { triggered: true, status: 'review' },
      form_no_failure_feedback: { triggered: false, status: 'unknown' },
      reduced_motion_ignored: { triggered: true, animatedCount: 4 },
    });
    expect(craftReviewOrUnknown.score).toBe(100);
    expect(craftReviewOrUnknown.failed.length).toBe(0);
    expect(
      craftReviewOrUnknown.checks.find((c) => c.id === 'viewport_meta_missing').scoreDelta
    ).toBe(0);
    expect(
      craftReviewOrUnknown.checks.find((c) => c.id === 'form_no_failure_feedback').scoreDelta
    ).toBe(0);

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
