// The `system` axis (DESIGN.md compliance) — parser, token flattening, and the
// drift scorer. Pure functions; no DOM (extractSystemContext is covered by the
// browser golden tests).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDesignMd,
  extractFrontMatter,
  flattenDesignTokens,
  scoreSystemCompliance,
  primaryFamily,
  parseCssColor,
} from '../src/system.js';

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
  assert.match(fm, /name: Heritage/);
  assert.doesNotMatch(fm, /Overview/);
  assert.equal(extractFrontMatter('no front matter here'), null);
});

test('parseDesignMd reads nested tokens, quoted hex, comments, and resolves {refs}', () => {
  const p = parseDesignMd(SAMPLE);
  assert.equal(p.name, 'Heritage');
  assert.equal(p.colors.primary, '#1A1C1E');
  assert.equal(p.typography.h1.fontFamily, 'Public Sans');
  assert.equal(p.spacing.md, '16px', 'trailing comment stripped');
  assert.equal(
    p.components['button-primary'].backgroundColor,
    '#B8422E',
    '{colors.tertiary} resolved'
  );
});

test('parseDesignMd returns null for prose-only or token-free files', () => {
  assert.equal(parseDesignMd('# Just a readme\nNo front matter.'), null);
  assert.equal(
    parseDesignMd('---\nname: OnlyAName\n---\nprose'),
    null,
    'a name alone is not a token set'
  );
});

// ── flattening + matching primitives ─────────────────────────────────────────
test('flattenDesignTokens gathers fonts, palette (incl. component colors), radii', () => {
  const t = flattenDesignTokens(parseDesignMd(SAMPLE));
  assert.deepEqual(t.fonts.sort(), ['georgia', 'public sans']);
  assert.ok(t.colors.includes('#B8422E'), 'resolved component bg in palette');
  assert.ok(t.colors.includes('#ffffff'));
  assert.deepEqual(t.radii, [4, 8]);
});

test('primaryFamily skips generic families and quotes', () => {
  assert.equal(primaryFamily('"Inter", ui-sans-serif, system-ui'), 'inter');
  assert.equal(primaryFamily('-apple-system, BlinkMacSystemFont, "Segoe UI", Georgia'), 'segoe ui');
  assert.equal(primaryFamily('sans-serif'), null);
});

test('parseCssColor handles hex (3/6) and rgb()/rgba()', () => {
  assert.deepEqual(parseCssColor('#fff'), [255, 255, 255]);
  assert.deepEqual(parseCssColor('#B8422E'), [184, 66, 46]);
  assert.deepEqual(parseCssColor('rgb(184, 66, 46)'), [184, 66, 46]);
  assert.deepEqual(parseCssColor('rgba(184,66,46,0.9)'), [184, 66, 46]);
  assert.equal(parseCssColor('oklch(62% 0.18 250)'), null);
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
  assert.equal(r.declared, true);
  assert.equal(r.tier, 'Aligned');
  assert.equal(r.score, 100);
  assert.equal(r.drift.length, 0);
});

test('undeclared font + off-palette CTA read as named drift, not a verdict', () => {
  const r = scoreSystemCompliance(parsed, DRIFTED);
  assert.notEqual(r.tier, 'Aligned');
  const ids = r.drift.map((d) => d.id);
  assert.ok(ids.includes('fonts.declared'), 'Inter flagged as undeclared');
  assert.ok(ids.includes('colors.cta'), 'violet CTA flagged as off-palette');
  const fontDrift = r.drift.find((d) => d.id === 'fonts.declared');
  assert.match(fontDrift.message, /inter/);
});

test('a rarely-used font (<10% of text) is not drift (icon-font tolerance)', () => {
  const r = scoreSystemCompliance(parsed, {
    ...ALIGNED,
    fonts: { 'Georgia, serif': 95, FontAwesome: 3 },
  });
  assert.ok(!r.drift.some((d) => d.id === 'fonts.declared'));
});

test('missing data is SKIPPED, never drift', () => {
  // Nothing observed at all → every check skips → perfect-by-absence is avoided
  // by tier "No data" semantics: score stays 100 but checksEvaluated is 0.
  const r = scoreSystemCompliance(parsed, {});
  assert.equal(r.checksEvaluated, 0);
  assert.equal(r.drift.length, 0);
  assert.equal(r.tier, 'No data');
});

test('no parseable DESIGN.md → declared:false, null score', () => {
  const r = scoreSystemCompliance(null, ALIGNED);
  assert.equal(r.declared, false);
  assert.equal(r.score, null);
  assert.equal(r.tier, 'No system');
});

test('color matching tolerates rendering rounding (±10/channel)', () => {
  const r = scoreSystemCompliance(parsed, {
    ...ALIGNED,
    ctas: [{ bg: 'rgb(186, 68, 48)', text: 'Buy' }], // tertiary ±2
  });
  assert.ok(!r.drift.some((d) => d.id === 'colors.cta'));
});
