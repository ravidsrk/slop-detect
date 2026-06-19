// Favicon assets: the scan-reticle in a rounded dark tile (light brackets, clean
// dot), matching the design source (claude.ai/design 644611bf, brand/favicon.svg)
// so the mark stays legible on any browser tab. These assertions keep the icon
// files resolvable from the HTML <link rel="icon"> tags and stop the favicon from
// regressing to a slop-tripping glyph (gradient, purple, icon font).

import { test, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const pub = (p) => new URL(`../public/${p}`, import.meta.url);
const svg = readFileSync(pub('favicon.svg'), 'utf8');
const html = readFileSync(pub('index.html'), 'utf8');

// Width/height live in the PNG IHDR chunk: 8-byte signature, then 4-byte length +
// "IHDR", then big-endian width (offset 16) and height (offset 20).
function pngSize(relPath) {
  const buf = readFileSync(pub(relPath));
  expect(
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    `${relPath} is a PNG`
  ).toBeTruthy();
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

test('all three icon files exist', () => {
  for (const f of ['favicon.svg', 'favicon.png', 'favicon-512.png']) {
    expect(existsSync(pub(f)), `${f} must exist`).toBeTruthy();
  }
});

test('every <link rel="icon"> href resolves to a committed file', () => {
  const hrefs = [...html.matchAll(/href="\/(favicon[^"]*)"/g)].map((m) => m[1]);
  expect(hrefs.length, 'index.html references at least one favicon').toBeGreaterThan(0);
  for (const h of hrefs) {
    expect(existsSync(pub(h)), `${h} referenced by index.html must resolve`).toBeTruthy();
  }
});

test('favicon.svg is the reticle in a dark tile (light brackets, clean dot)', () => {
  expect(svg, 'rounded tile').toMatch(/rx="5"/);
  expect(svg, 'dark ink tile #16170F').toMatch(/fill="#16170F"/);
  expect(svg, 'light #F4F5F2 reticle brackets').toMatch(/stroke="#F4F5F2"/);
  expect(svg, 'clean-green #3FBE7A verdict dot').toMatch(/fill="#3FBE7A"/);
});

test('the old dark scan-line mark is gone', () => {
  expect(svg.includes('#0a0a0b'), 'old dark tile fill removed').toBeFalsy();
  expect(svg.includes('#f87171'), 'old scan-line red removed').toBeFalsy();
});

test('favicon stays dogfood-clean: no gradient, no purple, no background-clip', () => {
  expect(/gradient|background-clip|filter:/i.test(svg), 'no gradient/clip tricks').toBeFalsy();
  expect(/#[0-9a-f]*(7c3aed|8b5cf6|a855f7|6d28d9)/i.test(svg), 'no purple').toBeFalsy();
});

test('PNG sizes cover retina + installable 512', () => {
  expect(pngSize('favicon.png')).toEqual({ w: 192, h: 192 });
  expect(pngSize('favicon-512.png')).toEqual({ w: 512, h: 512 });
});
