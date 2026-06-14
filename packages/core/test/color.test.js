// Unit tests for the WCAG contrast/chroma color helpers added in Tranche A
// (#09, ported from Impeccable). These power low_contrast_text + gray_on_color,
// so the math has to be right. Pure functions — operate on {r,g,b,a} objects.
//
// createColorHelpers() builds a <canvas> at construction (for parseColor), so we
// stub a minimal document. The math functions under test never touch the canvas.
//
// Run with: node --test packages/core/test/color.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';

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

const { createColorHelpers } = await import('../src/color.js');
const h = createColorHelpers();

const WHITE = { r: 255, g: 255, b: 255, a: 1 };
const BLACK = { r: 0, g: 0, b: 0, a: 1 };

test('relativeLuminance: black is 0, white is 1', () => {
  assert.equal(h.relativeLuminance(BLACK), 0);
  assert.ok(Math.abs(h.relativeLuminance(WHITE) - 1) < 1e-9);
});

test('contrastRatio: black-on-white is 21:1', () => {
  assert.ok(Math.abs(h.contrastRatio(BLACK, WHITE) - 21) < 0.01);
  assert.equal(h.contrastRatio(WHITE, WHITE), 1); // identical = 1:1
});

test('contrastRatio: known WCAG pair #767676 on white ≈ 4.54:1 (AA body pass)', () => {
  const grey = { r: 0x76, g: 0x76, b: 0x76, a: 1 };
  const ratio = h.contrastRatio(grey, WHITE);
  assert.ok(ratio >= 4.5 && ratio < 4.6, `expected ~4.54, got ${ratio}`);
});

test('contrastRatio: light grey #aaa on white fails AA body (< 4.5)', () => {
  const lightGrey = { r: 0xaa, g: 0xaa, b: 0xaa, a: 1 };
  assert.ok(h.contrastRatio(lightGrey, WHITE) < 4.5);
});

test('channelSpread: greys are ~0, saturated colors are high', () => {
  assert.equal(h.channelSpread({ r: 128, g: 128, b: 128 }), 0);
  assert.equal(h.channelSpread({ r: 99, g: 102, b: 241 }), 142); // indigo-500
});

test('isNeutral: greys/black/white neutral, saturated not', () => {
  assert.equal(h.isNeutral({ r: 128, g: 130, b: 132, a: 1 }), true); // spread 4
  assert.equal(h.isNeutral(WHITE), true);
  assert.equal(h.isNeutral({ r: 0, g: 0, b: 0, a: 0 }), true); // transparent
  assert.equal(h.isNeutral({ r: 99, g: 102, b: 241, a: 1 }), false); // indigo
  assert.equal(h.isNeutral({ r: 200, g: 200, b: 160, a: 1 }), false); // spread 40 — tinted
});

test('isNeutral: spread exactly at 30 boundary is NOT neutral', () => {
  assert.equal(h.isNeutral({ r: 100, g: 100, b: 130, a: 1 }), false); // spread 30
  assert.equal(h.isNeutral({ r: 100, g: 100, b: 129, a: 1 }), true); // spread 29
});
