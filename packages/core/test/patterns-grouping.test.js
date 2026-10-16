// Regression tests for two detector grouping bugs found in the launch review:
//   - icon_card_grid keyed groups by parent TAG name, merging same-sized
//     cards from unrelated sections into one phantom grid;
//   - numbered_steps fired on ranked content lists (HN's 1..30 story ranks).
// Extractors run against minimal DOM fakes (only the surface they touch).

import { test, expect } from 'vitest';
import { PATTERNS } from '@slop-detect/core';

const extract = (id) => PATTERNS.find((p) => p.id === id).extract;

function parent(tag = 'DIV') {
  return { tagName: tag };
}

function card(p, { width = 300, height = 200 } = {}) {
  return {
    parentElement: p,
    textContent: 'Feature',
    closest: () => null,
    getBoundingClientRect: () => ({ width, height, top: 0 }),
    querySelector: () => ({ getBoundingClientRect: () => ({ width: 32, height: 32, top: 0 }) }),
  };
}

test('icon_card_grid: cards under DIFFERENT parents do not form a grid', () => {
  const visible = [card(parent()), card(parent()), card(parent()), card(parent())];
  const r = extract('icon_card_grid')({ visible });
  expect(r.maxGroupSize).toBe(1);
  expect(r.triggered).toBe(false);
});

test('icon_card_grid: 3+ same-sized siblings under one parent trigger', () => {
  const p = parent();
  const visible = [card(p), card(p), card(p)];
  const r = extract('icon_card_grid')({ visible });
  expect(r.maxGroupSize).toBe(3);
  expect(r.triggered).toBe(true);
});

test('icon_card_grid: siblings of very different widths do not group', () => {
  const p = parent();
  const visible = [card(p, { width: 160 }), card(p, { width: 300 }), card(p, { width: 540 })];
  const r = extract('icon_card_grid')({ visible });
  expect(r.triggered).toBe(false);
});

function rankEl(p, n, { inTable = false } = {}) {
  return {
    parentElement: p,
    textContent: `${n}. A story title here`,
    closest: (sel) => (inTable && sel.includes('table') ? { tagName: 'TABLE' } : null),
    getBoundingClientRect: () => ({ width: 600, height: 20, top: 0 }),
    querySelector: () => null,
  };
}

function stepEl(p, n) {
  return {
    parentElement: p,
    textContent: `${n} Connect your repo`,
    closest: () => null,
    getBoundingClientRect: () => ({ width: 300, height: 120, top: 0 }),
    querySelector: () => null,
  };
}

test('numbered_steps: a 30-row ranked list in a table does not trigger', () => {
  const tbody = parent('TBODY');
  const visible = Array.from({ length: 30 }, (_, i) => rankEl(tbody, i + 1, { inTable: true }));
  const r = extract('numbered_steps')({ visible });
  expect(r.triggered).toBe(false);
});

test('numbered_steps: a long sibling group is a ranked list even outside tables', () => {
  const ol = parent('OL');
  const visible = Array.from({ length: 9 }, (_, i) => rankEl(ol, i + 1));
  const r = extract('numbered_steps')({ visible });
  expect(r.triggered).toBe(false);
});

test('numbered_steps: a 3-step "how it works" section still triggers', () => {
  const div = parent();
  const visible = [stepEl(div, 1), stepEl(div, 2), stepEl(div, 3)];
  const r = extract('numbered_steps')({ visible });
  expect(r.bestRun).toBe(3);
  expect(r.triggered).toBe(true);
});

test('numbered_steps: "Step 1/2/3" labels still trigger', () => {
  const div = parent();
  const visible = [1, 2, 3].map((n) => ({
    ...stepEl(div, n),
    textContent: `Step ${n} — do the thing`,
  }));
  const r = extract('numbered_steps')({ visible });
  expect(r.triggered).toBe(true);
});
