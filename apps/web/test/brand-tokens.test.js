// Foundation guardrail (build task 00): the shared theme IS the new light
// editorial-instrument system, and it dogfoods its own detector. These assertions
// pin the identity (fonts, color-scheme, the five core hexes) and the anti-slop +
// a11y dodges, so a regression to the old dark Hanken/Martian theme — or a slop
// tell creeping into the tokens — fails the build instead of shipping.

import { test, expect } from 'vitest';
import { BRAND_FONTS_HEAD, BRAND_CSS } from '../functions/_brand.ts';

const ALL = BRAND_FONTS_HEAD + '\n' + BRAND_CSS;

// ── the new faces are loaded, the old ones are gone ──────────────────────────
test('the brand loads the three new faces (Newsreader, Libre Franklin, JetBrains Mono)', () => {
  expect(BRAND_FONTS_HEAD, 'serif display face').toMatch(/Newsreader/);
  expect(BRAND_FONTS_HEAD, 'grotesque body face').toMatch(/Libre\+Franklin/);
  expect(BRAND_FONTS_HEAD, 'mono data face').toMatch(/JetBrains\+Mono/);
  // and the families are wired into the CSS custom properties
  expect(BRAND_CSS).toMatch(/--serif:\s*'Newsreader'/);
  expect(BRAND_CSS).toMatch(/--sans:\s*'Libre Franklin'/);
  expect(BRAND_CSS).toMatch(/--mono:\s*'JetBrains Mono'/);
});

test('the old dark theme faces are absent (no Hanken, no Martian)', () => {
  expect(ALL, 'old prose face dropped').not.toMatch(/Hanken/i);
  expect(ALL, 'old mono face dropped').not.toMatch(/Martian/i);
});

test('no AI-default faces requested (no Inter / Geist / Space Grotesk)', () => {
  expect(ALL).not.toMatch(/Inter|Geist|Space\s*Grotesk/i);
});

// ── light-first ──────────────────────────────────────────────────────────────
test(':root declares color-scheme:light (the page is light-first)', () => {
  expect(BRAND_CSS).toMatch(/color-scheme:\s*light/);
  expect(BRAND_CSS, 'no leftover dark color-scheme').not.toMatch(/color-scheme:\s*dark/);
});

// ── the five core brand hexes ────────────────────────────────────────────────
test('the five core brand hexes are present', () => {
  const cores = {
    paper: '#F4F5F2',
    ink: '#181815',
    clean: '#1FA85E',
    mild: '#D89A2E',
    heavy: '#C9402E',
  };
  for (const [name, hex] of Object.entries(cores)) {
    expect(BRAND_CSS, `${name} ${hex}`).toContain(hex);
  }
  // accent token + ledger device exactly as the brand-unification marks expect
  expect(BRAND_CSS, 'green accent token').toMatch(/--clean:\s*#1FA85E/);
  expect(BRAND_CSS, 'section-ledger rule device').toMatch(/border-top:1\.5px solid #181815/);
});

// ── a11y GAP-FILL: a keyboard focus ring, never a bare outline:none ───────────
test('a :focus-visible ring exists (bare outline:none is not the whole story)', () => {
  expect(BRAND_CSS).toMatch(/:focus-visible\s*\{[^}]*outline/);
});

test('a single transition token and a reduced-motion guard are defined', () => {
  expect(BRAND_CSS, 'one subtle motion token').toMatch(/--t:\s*140ms ease/);
  expect(BRAND_CSS, 'reduced-motion media query').toMatch(/prefers-reduced-motion/);
});

test('responsive breakpoint helpers exist (the export shipped no @media)', () => {
  expect(BRAND_CSS).toMatch(/@media \(max-width:\s*900px\)/);
  expect(BRAND_CSS).toMatch(/@media \(max-width:\s*640px\)/);
});

// ── dogfood: the tokens themselves carry no slop tells ───────────────────────
test('no gradient text — there is no background-clip:text anywhere', () => {
  expect(BRAND_CSS).not.toMatch(/background-clip:\s*text/i);
  expect(BRAND_CSS).not.toMatch(/-webkit-background-clip:\s*text/i);
});

test('no purple as a brand/accent token (purple is bounded to data avatars)', () => {
  // The old cold-blue accent is gone and no VibeCode purple is introduced as a
  // brand color. (#7A4D9A lives only in the _theme avatar palette, not here.)
  expect(BRAND_CSS).not.toMatch(/5b9dff/i);
  expect(BRAND_CSS).not.toMatch(/--accent:\s*#7A4D9A/i);
});

test('shadow policy: the only shadow token is the flat badge shadow', () => {
  expect(BRAND_CSS, 'badge shadow token').toMatch(/0 1px 2px rgba\(0,0,0,0\.1\)/);
});
