import { test, expect } from 'vitest';
import { exitCodeForScanResults } from '../src/exit-code.ts';

const blocked = {
  url: 'https://example.com',
  blocked: true,
  code: 'cloudflare_challenge',
  error: 'Site is behind a bot challenge.',
  score: null,
  tier: null,
};

test('a scan that cannot run exits 2, never 0', () => {
  expect(exitCodeForScanResults([blocked])).toBe(2);
  expect(exitCodeForScanResults([blocked], { failOn: 'Heavy' })).toBe(2);
  expect(
    exitCodeForScanResults([{ url: 'https://example.com', error: 'Navigation timeout' }])
  ).toBe(2);
  expect(exitCodeForScanResults([])).toBe(2);
});

test('a scored page exits 0 until a gate is set, then 1 when it is over the gate', () => {
  const heavy = { url: 'https://example.com', score: 40, tier: 'Heavy', patterns: [] };
  const clean = { url: 'https://example.com', score: 2, tier: 'Clean', patterns: [] };
  expect(exitCodeForScanResults([heavy])).toBe(0);
  expect(exitCodeForScanResults([clean], { failOn: 'Heavy' })).toBe(0);
  expect(exitCodeForScanResults([heavy], { failOn: 'Heavy' })).toBe(1);
  expect(exitCodeForScanResults([heavy], { failUnderScore: 15 })).toBe(1);
  expect(exitCodeForScanResults([clean], { failUnderScore: 15 })).toBe(0);
});

test('an unscannable page wins over a gated finding', () => {
  const heavy = { url: 'https://one.example', score: 40, tier: 'Heavy' };
  expect(exitCodeForScanResults([heavy, blocked], { failOn: 'Heavy' })).toBe(2);
});
