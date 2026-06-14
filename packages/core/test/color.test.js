// Unit tests for the WCAG contrast/chroma color helpers added in Tranche A
// (#09, ported from Impeccable). These power low_contrast_text + gray_on_color,
// so the math has to be right. Pure functions — operate on {r,g,b,a} objects.
//
// createColorHelpers() builds a <canvas> at construction (for parseColor), so we
// stub a minimal document. The math functions under test never touch the canvas.
//
// Run with: vitest run packages/core/test/color.test.js
import { test, expect } from 'vitest';
import { createColorHelpers } from '@slop-detect/core';

// Minimal DOM stub so createColorHelpers() can construct.
globalThis.document = {
  createElement: () => ({
    width: 0,
    height: 0,
    getContext: () => ({
      clearRect() {},
      fillRect() {},
      set fillStyle(_v) {},
      get fillStyle() {
        return '#000';
      },
      getImageData: () => ({ data: [0, 0, 0, 255] }),
    }),
  }),
};

const h = createColorHelpers();

const WHITE = { r: 255, g: 255, b: 255, a: 1 };
const BLACK = { r: 0, g: 0, b: 0, a: 1 };

test('relativeLuminance: black is 0, white is 1', () => {
  expect(h.relativeLuminance(BLACK)).toBe(0);
  expect(Math.abs(h.relativeLuminance(WHITE) - 1) < 1e-9).toBeTruthy();
});

test('contrastRatio: black-on-white is 21:1', () => {
  expect(Math.abs(h.contrastRatio(BLACK, WHITE) - 21) < 0.01).toBeTruthy();
  expect(h.contrastRatio(WHITE, WHITE)).toBe(1); // identical = 1:1
});

test('contrastRatio: known WCAG pair #767676 on white ≈ 4.54:1 (AA body pass)', () => {
  const grey = { r: 0x76, g: 0x76, b: 0x76, a: 1 };
  const ratio = h.contrastRatio(grey, WHITE);
  expect(ratio >= 4.5 && ratio < 4.6).toBeTruthy();
});

test('contrastRatio: light grey #aaa on white fails AA body (< 4.5)', () => {
  const lightGrey = { r: 0xaa, g: 0xaa, b: 0xaa, a: 1 };
  expect(h.contrastRatio(lightGrey, WHITE) < 4.5).toBeTruthy();
});

test('channelSpread: greys are ~0, saturated colors are high', () => {
  expect(h.channelSpread({ r: 128, g: 128, b: 128 })).toBe(0);
  expect(h.channelSpread({ r: 99, g: 102, b: 241 })).toBe(142); // indigo-500
});

test('isNeutral: greys/black/white neutral, saturated not', () => {
  expect(h.isNeutral({ r: 128, g: 130, b: 132, a: 1 })).toBe(true); // spread 4
  expect(h.isNeutral(WHITE)).toBe(true);
  expect(h.isNeutral({ r: 0, g: 0, b: 0, a: 0 })).toBe(true); // transparent
  expect(h.isNeutral({ r: 99, g: 102, b: 241, a: 1 })).toBe(false); // indigo
  expect(h.isNeutral({ r: 200, g: 200, b: 160, a: 1 })).toBe(false); // spread 40 — tinted
});

test('isNeutral: spread exactly at 30 boundary is NOT neutral', () => {
  expect(h.isNeutral({ r: 100, g: 100, b: 130, a: 1 })).toBe(false); // spread 30
  expect(h.isNeutral({ r: 100, g: 100, b: 129, a: 1 })).toBe(true); // spread 29
});
