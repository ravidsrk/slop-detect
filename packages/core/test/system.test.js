// The `system` axis (DESIGN.md compliance) — parser, token flattening, and the
// drift scorer. Pure functions; no DOM (extractSystemContext is covered by the
// browser golden tests).

import { test, expect } from 'vitest';
import {
  parseDesignMd,
  extractFrontMatter,
  flattenDesignTokens,
  scoreSystemCompliance,
  generateDesignMd,
  primaryFamily,
  parseCssColor,
} from '@slop-detect/core';

// A DESIGN.md in the Google Labs spec shape (front matter + prose), including a
// {token.reference}, quoted hex (the # must survive), and a trailing comment.
const SAMPLE = `---
name: Heritage
colors:
  primary: "#1A1C1E"
  tertiary: "#B8422E"
  paper: "#FBFAF7"
typography:
  h1:
    fontFamily: Public Sans
    fontSize: 3rem
  body:
    fontFamily: Georgia
rounded:
  sm: 4px
  md: 8px
spacing:
  md: 16px   # base unit
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "#ffffff"
---

## Overview
Architectural Minimalism meets Journalistic Gravitas.
`;

// ── parsing ──────────────────────────────────────────────────────────────────
test('extractFrontMatter pulls the fenced YAML block', () => {
  const fm = extractFrontMatter(SAMPLE);
  expect(fm).toMatch(/name: Heritage/);
  expect(fm).not.toMatch(/Overview/);
  expect(extractFrontMatter('no front matter here')).toBe(null);
});

test('parseDesignMd reads nested tokens, quoted hex, comments, and resolves {refs}', () => {
  const p = parseDesignMd(SAMPLE);
  expect(p.name).toBe('Heritage');
  expect(p.colors.primary).toBe('#1A1C1E');
  expect(p.typography.h1.fontFamily).toBe('Public Sans');
  expect(p.spacing.md).toBe('16px');
  expect(p.components['button-primary'].backgroundColor).toBe('#B8422E');
});

test('parseDesignMd returns null for prose-only or token-free files', () => {
  expect(parseDesignMd('# Just a readme\nNo front matter.')).toBe(null);
  expect(parseDesignMd('---\nname: OnlyAName\n---\nprose')).toBe(null);
});

// ── flattening + matching primitives ─────────────────────────────────────────
test('flattenDesignTokens gathers fonts, palette (incl. component colors), radii', () => {
  const t = flattenDesignTokens(parseDesignMd(SAMPLE));
  expect(t.fonts.sort()).toEqual(['georgia', 'public sans']);
  expect(t.colors.includes('#B8422E')).toBeTruthy();
  expect(t.colors.includes('#ffffff')).toBeTruthy();
  expect(t.radii).toEqual([4, 8]);
});

test('primaryFamily skips generic families and quotes', () => {
  expect(primaryFamily('"Inter", ui-sans-serif, system-ui')).toBe('inter');
  expect(primaryFamily('-apple-system, BlinkMacSystemFont, "Segoe UI", Georgia')).toBe('segoe ui');
  expect(primaryFamily('sans-serif')).toBe(null);
});

test('parseCssColor handles hex (3/6), rgb()/rgba(), and hsl()/hsla()', () => {
  expect(parseCssColor('#fff')).toEqual([255, 255, 255]);
  expect(parseCssColor('#B8422E')).toEqual([184, 66, 46]);
  expect(parseCssColor('rgb(184, 66, 46)')).toEqual([184, 66, 46]);
  expect(parseCssColor('rgba(184,66,46,0.9)')).toEqual([184, 66, 46]);
  expect(parseCssColor('hsl(0, 0%, 100%)')).toEqual([255, 255, 255]);
  expect(parseCssColor('hsla(148, 69%, 39%, 1)')).toEqual([31, 168, 95]);
  expect(parseCssColor('oklch(62% 0.18 250)')).toBe(null);
});

// ── scoring ──────────────────────────────────────────────────────────────────
const parsed = parseDesignMd(SAMPLE);

// A page that honors the system: Georgia text, tertiary CTAs, paper surface.
const ALIGNED = {
  fonts: { 'Georgia, serif': 40, '"Public Sans", sans-serif': 10 },
  ctas: [{ bg: 'rgb(184, 66, 46)', text: 'Buy' }],
  surface: 'rgb(251, 250, 247)',
  headings: [{ tag: 'H1', color: 'rgb(26, 28, 30)' }],
  radii: [4, 8],
};

// The same page after an agent "improved" it: Inter, an off-palette violet CTA.
const DRIFTED = {
  ...ALIGNED,
  fonts: { 'Inter, ui-sans-serif': 45, 'Georgia, serif': 5 },
  ctas: [{ bg: 'rgb(124, 58, 237)', text: 'Get started' }],
};

test('an on-system page scores Aligned with no drift', () => {
  const r = scoreSystemCompliance(parsed, ALIGNED);
  expect(r.declared).toBe(true);
  expect(r.tier).toBe('Aligned');
  expect(r.score).toBe(100);
  expect(r.drift.length).toBe(0);
});

test('undeclared font + off-palette CTA read as named drift, not a verdict', () => {
  const r = scoreSystemCompliance(parsed, DRIFTED);
  expect(r.tier).not.toBe('Aligned');
  const ids = r.drift.map((d) => d.id);
  expect(ids.includes('fonts.declared')).toBeTruthy();
  expect(ids.includes('colors.cta')).toBeTruthy();
  const fontDrift = r.drift.find((d) => d.id === 'fonts.declared');
  expect(fontDrift.message).toMatch(/inter/);
});

test('a rarely-used font (<10% of text) is not drift (icon-font tolerance)', () => {
  const r = scoreSystemCompliance(parsed, {
    ...ALIGNED,
    fonts: { 'Georgia, serif': 95, FontAwesome: 3 },
  });
  expect(r.drift.some((d) => d.id === 'fonts.declared')).toBe(false);
});

test('missing data is SKIPPED, never drift', () => {
  // Nothing observed at all → every check skips → perfect-by-absence is avoided
  // by tier "No data" semantics: score stays 100 but checksEvaluated is 0.
  const r = scoreSystemCompliance(parsed, {});
  expect(r.checksEvaluated).toBe(0);
  expect(r.drift.length).toBe(0);
  expect(r.tier).toBe('No data');
});

test('no parseable DESIGN.md → declared:false, null score', () => {
  const r = scoreSystemCompliance(null, ALIGNED);
  expect(r.declared).toBe(false);
  expect(r.score).toBe(null);
  expect(r.tier).toBe('No system');
});

test('color matching tolerates rendering rounding (±10/channel)', () => {
  const r = scoreSystemCompliance(parsed, {
    ...ALIGNED,
    ctas: [{ bg: 'rgb(186, 68, 48)', text: 'Buy' }], // tertiary ±2
  });
  expect(r.drift.some((d) => d.id === 'colors.cta')).toBe(false);
});

test('generateDesignMd bootstraps a DESIGN.md that round-trips to 100/100 Aligned', () => {
  const md = generateDesignMd(ALIGNED, { name: 'Heritage Auto', url: 'https://heritage.example' });
  const reparsed = parseDesignMd(md);
  expect(reparsed).not.toBeNull();
  expect(reparsed.name).toBe('Heritage Auto');
  const compliance = scoreSystemCompliance(reparsed, ALIGNED);
  expect(compliance.score).toBe(100);
  expect(compliance.tier).toBe('Aligned');
  expect(compliance.drift).toEqual([]);
});

test('a page passes against the DESIGN.md generated from it, even with a wide palette', () => {
  // More distinct CTA fills (8), heading colours (4), fonts (6 at ≥10%) and
  // radii (9) than the generator used to keep — every one must survive.
  const ctaBgs = [
    'rgb(10, 20, 30)',
    'rgb(200, 40, 40)',
    'rgb(40, 200, 40)',
    'rgb(40, 40, 200)',
    'rgb(220, 180, 20)',
    'rgb(20, 180, 220)',
    'rgb(180, 20, 220)',
    'rgb(120, 120, 120)',
  ];
  const observed = {
    fonts: {
      '"Public Sans", sans-serif': 10,
      'Georgia, serif': 10,
      '"IBM Plex Mono", monospace': 10,
      'Lora, serif': 10,
      '"Space Mono", monospace': 10,
      'Fraunces, serif': 10,
    },
    ctas: ctaBgs.map((bg, i) => ({ bg, text: `CTA ${i}` })),
    surface: 'rgb(251, 250, 247)',
    headings: [
      { tag: 'H1', color: 'rgb(26, 28, 30)', fontFamily: '"Public Sans", sans-serif' },
      { tag: 'H2', color: 'rgb(150, 30, 60)', fontFamily: 'Georgia, serif' },
      { tag: 'H2', color: 'rgb(30, 150, 60)', fontFamily: 'Georgia, serif' },
      { tag: 'H3', color: 'rgb(60, 30, 150)', fontFamily: 'Georgia, serif' },
    ],
    radii: [3, 6, 10, 14, 18, 24, 32, 40, 56],
  };
  const md = generateDesignMd(observed, { name: 'Wide Palette' });
  const compliance = scoreSystemCompliance(parseDesignMd(md), observed);
  expect(compliance.drift).toEqual([]);
  expect(compliance.score).toBe(100);
  expect(compliance.tier).toBe('Aligned');

  // Each check must actually be evaluated (not skipped) for the pass to mean anything.
  expect(compliance.checksEvaluated).toBe(5);

  // And dropping just the last CTA colour from the generated file must fail the
  // CTA check — i.e. the test above genuinely depends on preserving every fill.
  const trimmed = md.replace(/\n {2}accent_7: "#[0-9A-F]{6}"/, '');
  expect(trimmed).not.toBe(md);
  const drifted = scoreSystemCompliance(parseDesignMd(trimmed), observed);
  expect(drifted.drift.some((d) => d.id === 'colors.cta')).toBe(true);
});

test('comparator matches spec/system.md: per-channel RGB tolerance and distinct-radii majority', () => {
  const md = `---
colors:
  brand: "#646464"
rounded:
  md: 8px
---
`;
  const parsed = parseDesignMd(md);
  const check = (observed, id) =>
    scoreSystemCompliance(parsed, observed).checks.find((c) => c.id === id).status;
  // CTA: L∞ ≤ 10 on every channel.
  expect(check({ ctas: [{ bg: 'rgb(110, 90, 110)' }] }, 'colors.cta')).toBe('pass');
  expect(check({ ctas: [{ bg: 'rgb(111, 100, 100)' }] }, 'colors.cta')).toBe('fail');
  // One off-palette CTA fails the whole check.
  expect(
    check({ ctas: [{ bg: 'rgb(100, 100, 100)' }, { bg: 'rgb(0, 0, 0)' }] }, 'colors.cta')
  ).toBe('fail');
  // Surface + headings: tolerance 14.
  expect(check({ surface: 'rgb(114, 86, 100)' }, 'colors.surface')).toBe('pass');
  expect(check({ surface: 'rgb(115, 100, 100)' }, 'colors.surface')).toBe('fail');
  // Headings fail only when MORE than half are off-palette.
  const heads = (colors) => ({ headings: colors.map((color) => ({ tag: 'H2', color })) });
  expect(check(heads(['rgb(100,100,100)', 'rgb(0,0,0)']), 'colors.headings')).toBe('pass');
  expect(check(heads(['rgb(100,100,100)', 'rgb(0,0,0)', 'rgb(0,0,0)']), 'colors.headings')).toBe(
    'fail'
  );
  // Radii: ±2px, fail only when more than half of the distinct radii are off.
  expect(check({ radii: [10, 30] }, 'radii.scale')).toBe('pass');
  expect(check({ radii: [10, 30, 40] }, 'radii.scale')).toBe('fail');
});
