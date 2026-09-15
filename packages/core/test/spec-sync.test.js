// Spec-vs-engine sync guard (T-21 / G-31): spec/ is the contract downstream
// tools read, so every machine-checkable claim in it is pinned against the
// engine. Catches: added/removed/re-weighted patterns, version drift, tier
// drift, catalogue-table rot. Prose detection summaries (e.g. the bento
// "≥5 rounded" wording fixed in T-21) stay human-review territory.
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  PATTERNS,
  COPY_PATTERNS,
  AEO_CHECKS,
  DEFINITIONS_VERSION,
  scorePatterns,
} from '@slop-detect/core';

const spec = (name) => readFileSync(new URL(`../../../spec/${name}`, import.meta.url), 'utf8');
const config = JSON.parse(spec('config.json'));

test('spec config counts and versions match the engine', () => {
  expect(config.definitions_version).toBe(DEFINITIONS_VERSION);
  expect(config.spec_version).toBe(DEFINITIONS_VERSION);
  expect(config.pattern_count).toBe(PATTERNS.length);
  expect(config.copy_pattern_count).toBe(COPY_PATTERNS.length);
  expect(config.aeo_check_count).toBe(AEO_CHECKS.length);
});

test('spec design tiers match engine behavior at the boundaries', () => {
  const at = (score) => scorePatterns([{ id: 'x', weight: score, triggered: true }]).tier;
  const t = config.tiers.design;
  expect(t.clean).toEqual({ min: 0, max: 9 });
  expect(t.mild).toEqual({ min: 10, max: 27 });
  expect(t.heavy.min).toBe(28);
  expect(at(t.clean.max)).toBe('Clean');
  expect(at(t.mild.min)).toBe('Mild');
  expect(at(t.mild.max)).toBe('Mild');
  expect(at(t.heavy.min)).toBe('Heavy');
});

test('spec catalogue id sets match the engine id sets exactly (both directions)', () => {
  // Parses the backticked-ID catalogue rows (`| \`id\` | ...`) so a stale
  // spec row (engine id removed/renamed) fails too, not just a missing one.
  const tableIds = (doc) =>
    doc
      .split('\n')
      .map((line) => line.match(/^\|\s*`([A-Za-z0-9_.]+)`/)?.[1])
      .filter(Boolean)
      .sort();
  expect(tableIds(spec('patterns.md'))).toEqual(PATTERNS.map((p) => p.id).sort());
  expect(tableIds(spec('copy-axis.md'))).toEqual(COPY_PATTERNS.map((p) => p.id).sort());
  expect(tableIds(spec('aeo.md'))).toEqual(AEO_CHECKS.map((c) => c.id).sort());
});

test('spec catalogue weights match engine weights', () => {
  const rowWeight = (doc, id) => {
    const m = doc.match(new RegExp(`\\\`${id}\\\`[^|]*\\|[^|]*\\|\\s*(\\d+)`));
    return m ? parseInt(m[1], 10) : null;
  };
  const design = spec('patterns.md');
  for (const p of PATTERNS) expect(rowWeight(design, p.id)).toBe(p.weight);
  const copy = spec('copy-axis.md');
  for (const p of COPY_PATTERNS) expect(rowWeight(copy, p.id)).toBe(p.weight);
  const aeo = spec('aeo.md');
  for (const c of AEO_CHECKS) expect(rowWeight(aeo, c.id)).toBe(c.weight);
});
