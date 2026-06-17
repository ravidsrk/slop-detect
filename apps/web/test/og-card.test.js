// Build task 13: the dynamic OG share card (cardHtml) is re-themed to the new
// light editorial-instrument system and dogfoods its own detector. These tests
// render cardHtml() to a string and pin the new tokens, the tier text color, the
// italic-Newsreader verdict, and — closing the floor's open decision on the share
// surface — assert the radial/linear gradient background is gone for good.

import { test, expect } from 'vitest';
import { cardHtml } from '../functions/_card.tsx';
import { tierText, tierFill } from '../functions/_theme.ts';

const slim = (over = {}) => ({
  id: 'abc123',
  domain: 'bolt.new',
  score: 33,
  tier: 'Heavy',
  grade: 'D+',
  verdict: 'Reads like a generated template: default fonts, gradient blobs, centered hero.',
  patternsFlagged: 12,
  patternsTotal: 27,
  definitionsVersion: '2026.09',
  triggered: [
    { short: 'AI-default font stack', label: 'AI-default font stack (Inter / Geist)' },
    { short: 'Aurora / mesh gradient', label: 'Aurora / mesh gradient blobs' },
    { short: 'Centered hero', label: 'Centered hero in generic sans' },
    { short: 'Glassmorphism', label: 'Glassmorphism cards' },
  ],
  ...over,
});

// ── the card is the new system, not the old dark gradient card ───────────────
test('the card uses the new editorial faces (Newsreader serif + JetBrains Mono)', () => {
  const html = cardHtml(slim());
  expect(html, 'serif display face').toMatch(/Newsreader/);
  expect(html, 'mono data face').toMatch(/JetBrains Mono/);
  // and it requests them from Google Fonts via the shared brand <link>
  expect(html).toMatch(/fonts\.googleapis\.com/);
});

test('NO gradient on the share surface (radial or linear) — flat paper only', () => {
  const html = cardHtml(slim());
  expect(html, 'radial-gradient is gone').not.toMatch(/radial-gradient/i);
  expect(html, 'linear-gradient is gone').not.toMatch(/linear-gradient/i);
  // the body is the cool-paper surface, not the old near-black register
  expect(html).toMatch(/background:#F4F5F2/);
  expect(html).not.toMatch(/#0a0a0b/i);
});

// ── color encodes the score: the numeral + grade carry the tier text hue ─────
test('the score numeral and grade render in the tier text color', () => {
  const html = cardHtml(slim({ tier: 'Heavy' }));
  const fg = tierText('Heavy'); // #B23A2A
  expect(html).toContain(`color:${fg}`);
  // the core hue is used for the verdict dots (fill), not the type
  expect(html).toContain(`background:${tierFill('Heavy')}`);
});

test('each tier maps the numeral to its own AA text hue', () => {
  for (const [tier, hex] of [
    ['Clean', '#15824A'],
    ['Mild', '#9A6B12'],
    ['Heavy', '#B23A2A'],
  ]) {
    const html = cardHtml(slim({ tier }));
    expect(html, `${tier} numeral hue`).toContain(`color:${hex}`);
    expect(html, `${tier} pill label`).toMatch(new RegExp(tier.toUpperCase()));
  }
});

// ── the verdict is Newsreader italic voice ───────────────────────────────────
test('the verdict line is set in italic Newsreader', () => {
  const html = cardHtml(slim());
  expect(html).toMatch(/\.verdict\{[^}]*font-family:'Newsreader'[^}]*font-style:italic/);
  expect(html).toMatch(/Reads like a generated template/);
});

// ── the dynamic reading still lands on the card ──────────────────────────────
test('the card shows the live reading: domain, score, grade, tier, flagged count', () => {
  const html = cardHtml(slim());
  expect(html).toMatch(/bolt\.new/);
  expect(html).toMatch(/>33</); // score numeral
  expect(html).toMatch(/>D\+</); // grade
  expect(html).toMatch(/HEAVY/); // tier pill
  expect(html).toMatch(/12\/27 patterns flagged/);
  expect(html).toMatch(/defs 2026\.09/);
  expect(html).toMatch(/slop-detect\.com/);
  // the top tells, joined for the footer
  expect(html).toMatch(/AI-default font stack/);
});

test('it stays a 1200×630 document with a doctype', () => {
  const html = cardHtml(slim());
  expect(html.startsWith('<!doctype html>')).toBe(true);
  expect(html).toMatch(/width:1200px;height:630px/);
});

// ── dogfood: the card itself must pass the detector ──────────────────────────
test('no slop tells in the card markup (no AI fonts, no purple CTA, flat borders)', () => {
  const html = cardHtml(slim());
  expect(html, 'no AI-default faces').not.toMatch(/Inter|Geist|Space\s*Grotesk/i);
  expect(html, 'no gradient text').not.toMatch(/background-clip:\s*text/i);
  expect(html, 'no purple anywhere').not.toMatch(/7A4D9A/i);
  // flat, 1px-bordered chip — not a heavy/elevated card
  expect(html).toMatch(/border:1px solid #DBDDD6/);
  // the signature ledger rule carries the footer hierarchy
  expect(html).toMatch(/border-top:1\.5px solid #181815/);
});

// ── graceful when optional fields are missing (KV slim may omit them) ────────
test('renders without a verdict or tells without throwing', () => {
  const html = cardHtml(slim({ verdict: null, triggered: [], definitionsVersion: null }));
  expect(html).toMatch(/bolt\.new/);
  expect(html).not.toMatch(/class="verdict"/);
});
