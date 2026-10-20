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
  SYSTEM_CHECKS,
  DEFINITIONS_VERSION,
  scorePatterns,
} from '@slop-detect/core';

const spec = (name) => readFileSync(new URL(`../../../spec/${name}`, import.meta.url), 'utf8');
const config = JSON.parse(spec('config.json'));

test('spec config counts and versions match the engine dynamically', () => {
  const deriveExpectedCounts = (patterns, copyPatterns, aeoChecks, systemChecks) => ({
    pattern_count: patterns.length,
    copy_pattern_count: copyPatterns.length,
    aeo_check_count: aeoChecks.length,
    system_check_count: systemChecks.length,
  });
  const expected = deriveExpectedCounts(PATTERNS, COPY_PATTERNS, AEO_CHECKS, SYSTEM_CHECKS);
  expect(config.definitions_version).toBe(DEFINITIONS_VERSION);
  expect(config.spec_version).toBe(DEFINITIONS_VERSION);
  expect(config.pattern_count).toBe(expected.pattern_count);
  expect(config.copy_pattern_count).toBe(expected.copy_pattern_count);
  expect(config.aeo_check_count).toBe(expected.aeo_check_count);
  expect(config.system_check_count).toBe(expected.system_check_count);

  // Adding a pattern changes the expected count without editing the test.
  const withExtra = deriveExpectedCounts(
    [...PATTERNS, { id: 'extra_rule' }],
    COPY_PATTERNS,
    AEO_CHECKS,
    SYSTEM_CHECKS
  );
  expect(withExtra.pattern_count).toBe(PATTERNS.length + 1);
});

test('spec design tiers match engine behavior at the boundaries', () => {
  const at = (score) => scorePatterns([{ id: 'x', weight: score, triggered: true }]).tier;
  const t = config.tiers.design;
  expect(at(t.clean.min)).toBe('Clean');
  expect(at(t.clean.max)).toBe('Clean');
  expect(at(t.clean.max + 1)).toBe('Mild');
  expect(at(t.mild.min)).toBe('Mild');
  expect(at(t.mild.max)).toBe('Mild');
  expect(at(t.mild.max + 1)).toBe('Heavy');
  expect(at(t.heavy.min)).toBe('Heavy');
});

test('spec catalogue id sets and detail headings match the engine id sets exactly (both directions)', () => {
  // Parses the backticked-ID catalogue rows (`| \`id\` | ...`) so a stale
  // spec row (engine id removed/renamed) fails too, not just a missing one.
  const tableIds = (doc) =>
    doc
      .split('\n')
      .map((line) => line.match(/^\|\s*`([A-Za-z0-9_.]+)`/)?.[1])
      .filter(Boolean)
      .sort();
  const headingIds = (doc) =>
    [...doc.matchAll(/^###\s+`?([a-z0-9_.]+)`?(?:\s+\(|$)/gm)].map((m) => m[1]).sort();

  const designIds = PATTERNS.map((p) => p.id).sort();
  const copyIds = COPY_PATTERNS.map((p) => p.id).sort();
  const aeoIds = AEO_CHECKS.map((c) => c.id).sort();
  const systemIds = SYSTEM_CHECKS.map((c) => c.id).sort();

  expect(tableIds(spec('patterns.md'))).toEqual(designIds);
  expect(headingIds(spec('patterns.md'))).toEqual(designIds);
  expect(tableIds(spec('copy-axis.md'))).toEqual(copyIds);
  expect(tableIds(spec('aeo.md'))).toEqual(aeoIds);
  expect(tableIds(spec('system.md'))).toEqual(systemIds);
});

test('spec/system.md describes actual per-channel L-infinity color matching, not CIELAB delta-E', () => {
  const sysDoc = spec('system.md');
  expect(sysDoc).not.toMatch(/CIELAB|ΔE|delta[- ]?E/i);
  expect(sysDoc).toMatch(/max\(\|ΔR\|,\s*\|ΔG\|,\s*\|ΔB\|\)/);
  expect(sysDoc).toMatch(/\b10\b/);
  expect(sysDoc).toMatch(/exact,?\s*case-insensitive string equality/i);
});

test('no unsourced prevalence figures or false pattern attributions in patterns.ts, fixes.ts, or spec/patterns.md', () => {
  const patternsSrc = readFileSync(new URL('../src/patterns.ts', import.meta.url), 'utf8');
  const fixesSrc = readFileSync(new URL('../src/fixes.ts', import.meta.url), 'utf8');
  const patternsSpec = spec('patterns.md');

  for (const [label, text] of [
    ['patterns.ts', patternsSrc],
    ['fixes.ts', fixesSrc],
    ['spec/patterns.md', patternsSpec],
  ]) {
    expect(text, `${label} must not contain unsourced ~74% claim`).not.toMatch(/~?74%/);
    expect(text, `${label} must not contain unsourced ~76% claim`).not.toMatch(/~?76%/);
    expect(text, `${label} must not contain unsourced 90%+ claim`).not.toMatch(/90%\+/);
    expect(text, `${label} must not attribute gradient_letter_avatars to Meng To`).not.toMatch(
      /Meng(?:\s+To)?[^\n]{0,80}(?:gradient|avatar)|(?:gradient|avatar)[^\n]{0,80}Meng(?:\s+To)?/i
    );
    expect(text, `${label} must not attribute 15 patterns or faq_accordion to Krebs`).not.toMatch(
      /(?:15|1–15)\s+from\s+Adrian\s+Krebs/i
    );
  }
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
  const system = spec('system.md');
  for (const c of SYSTEM_CHECKS) expect(rowWeight(system, c.id)).toBe(c.weight);
});
