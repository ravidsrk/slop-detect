// Tests for the embeddable slop badge (the two-segment editorial pill).
//
// Two layers: the pure `badgeSvg` renderer (segments, tier colors, no-scan
// fallback, no gradient tell) and the GET /badge/:domain.svg route (MNR-8
// functional parity: svg content-type, 3h cache, `.svg` + `www.` stripping).

import { test, expect } from 'vitest';
import { badgeSvg } from '../functions/_badge.tsx';
import { badgeColors } from '../functions/_theme.ts';
import { saveResult, BADGE_TTL } from '../functions/_shared.ts';
import { onRequestGet } from '../functions/badge/[domain].ts';

function slim(over = {}) {
  return {
    id: 'badge001',
    domain: 'ex.com',
    score: 30,
    tier: 'Heavy',
    grade: 'D',
    ...over,
  };
}

function makeKv(seed = {}) {
  const store = new Map(Object.entries(seed));
  return {
    store,
    async get(k) {
      return store.has(k) ? store.get(k) : null;
    },
    async put(k, v) {
      store.set(k, v);
    },
    async delete(k) {
      store.delete(k);
    },
  };
}

test('renders two segments: dark left "slop" + tier-colored right grade · score', () => {
  const svg = badgeSvg('ex.com', slim());
  const { bg, ink } = badgeColors('Heavy');
  // Left segment: the dark ink panel with the "slop" wordmark.
  expect(svg).toMatch(/fill="#16170F"/);
  expect(svg).toMatch(/>slop</);
  // Right segment: the Heavy bg fill, with grade · score in the Heavy ink.
  expect(svg).toContain(`fill="${bg}"`);
  expect(svg).toContain(`fill="${ink}"`);
  expect(svg).toMatch(/>D · 30</);
});

test('right-segment colors come from _theme.badgeColors for every tier', () => {
  const cases = [
    { tier: 'Clean', grade: 'A', score: 5 },
    { tier: 'Mild', grade: 'C', score: 18 },
    { tier: 'Heavy', grade: 'F', score: 60 },
  ];
  for (const { tier, grade, score } of cases) {
    const svg = badgeSvg('ex.com', slim({ tier, grade, score }));
    const { bg, ink } = badgeColors(tier);
    // The exact table values (Clean #1FA85E/#0A2A18, Mild #D89A2E/#3A2705,
    // Heavy #C9402E/#FFFFFF) are reached through the resolver, never inlined.
    expect(svg).toContain(`fill="${bg}"`);
    expect(svg).toContain(`fill="${ink}"`);
    expect(svg).toContain(`${grade} · ${score}`);
  }
});

test('no-scan fallback: neutral grey badge, "no scan", no grade · score', () => {
  const svg = badgeSvg('never.dev', null);
  const neutral = badgeColors('Unknown');
  expect(svg).toMatch(/>no scan</);
  expect(svg).toContain(`fill="${neutral.bg}"`); // #6E6F63 neutral right segment
  expect(svg).toMatch(/fill="#16170F"/); // still the dark left segment
  expect(svg).not.toMatch(/ · /); // no grade · score divider
});

test('contains no gradient tell (the dropped shields linear-gradient overlay)', () => {
  const scanned = badgeSvg('ex.com', slim());
  const empty = badgeSvg('ex.com', null);
  for (const svg of [scanned, empty]) {
    expect(svg).not.toMatch(/gradient/i); // no linearGradient / radialGradient
    expect(svg).not.toContain('url(#s)'); // the old overlay reference
  }
});

test('a11y + tokens: role=img, aria-label, 4px radius, JetBrains Mono, one sanctioned shadow', () => {
  const svg = badgeSvg('ex.com', slim());
  expect(svg).toMatch(/role="img"/);
  expect(svg).toMatch(/aria-label="slop score for ex\.com: D · 30"/);
  expect(svg).toMatch(/rx="4"/); // design "Radii": 4px badge corners
  expect(svg).toContain('JetBrains Mono');
  // The badge is the only surface allowed a shadow (design "Shadows":
  // 0 1px 2px rgba(0,0,0,0.1)) — rendered once, as a subtle drop shadow.
  expect(svg).toMatch(/feDropShadow/);
  expect(svg).toMatch(/flood-opacity="0\.1"/);
  expect(svg.match(/<feDropShadow/g)).toHaveLength(1); // exactly one shadow element
});

test('GET /badge route: svg content-type, 3h cache, tier-colored body', async () => {
  const kv = makeKv();
  await saveResult(kv, slim());
  const res = await onRequestGet({ params: { domain: 'ex.com' }, env: { RESULTS: kv } });
  expect(res.headers.get('Content-Type')).toMatch(/image\/svg\+xml/);
  expect(BADGE_TTL).toBe(60 * 60 * 3); // 3 hours
  expect(res.headers.get('Cache-Control')).toContain(`max-age=${BADGE_TTL}`);
  const body = await res.text();
  expect(body).toContain(`fill="${badgeColors('Heavy').bg}"`);
});

test('GET /badge route strips `.svg` and `www.` before lookup', async () => {
  const kv = makeKv();
  await saveResult(kv, slim()); // stored under d:ex.com
  const res = await onRequestGet({ params: { domain: 'www.EX.com.svg' }, env: { RESULTS: kv } });
  const body = await res.text();
  // Normalized to ex.com, so the stored Heavy scan is found (not the no-scan badge).
  expect(body).toContain(`fill="${badgeColors('Heavy').bg}"`);
  expect(body).not.toMatch(/>no scan</);
});

test('GET /badge route: an unscanned domain returns a valid no-scan badge', async () => {
  const res = await onRequestGet({
    params: { domain: 'unscanned.io.svg' },
    env: { RESULTS: makeKv() },
  });
  const body = await res.text();
  expect(body).toMatch(/>no scan</);
  expect(body).toContain(`fill="${badgeColors('Unknown').bg}"`);
  expect(body).toMatch(/role="img"/);
});
