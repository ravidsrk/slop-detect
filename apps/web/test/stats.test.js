// Tests for the always-on scan recorder + the global score distribution that
// power the per-domain /score page (history for ALL domains, peer percentile).
// Driven against the same in-memory KV mock the watch tests use.

import { test, expect } from 'vitest';
import {
  recordScan,
  recordScanForWatch,
  getHistory,
  getStats,
  getScoreDistribution,
  summarizeStats,
  percentileFromDistribution,
  percentileForScore,
} from '../functions/_shared.ts';

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

function slim(over = {}) {
  return {
    id: 'aaaa1111',
    domain: 'example.com',
    score: 8,
    grade: 'A-',
    tier: 'Clean',
    createdAt: '2026-06-01T00:00:00.000Z',
    ...over,
  };
}

// ── history for ALL domains (the core PR1 behavior) ──────────────────────────
test('recordScan appends a history point for an UNWATCHED domain', async () => {
  const kv = makeKv();
  await recordScan(kv, slim({ id: 'p1', score: 8, tier: 'Clean' }));
  const hist = await getHistory(kv, 'example.com');
  expect(hist.length).toBe(1);
  expect(hist[0].id).toBe('p1');
  expect(hist[0].score).toBe(8);
  expect(hist[0].tier).toBe('Clean');
});

test('recordScan grows the timeline across re-scans and de-dupes by id', async () => {
  const kv = makeKv();
  await recordScan(kv, slim({ id: 'p1', score: 8 }));
  await recordScan(kv, slim({ id: 'p1', score: 8 })); // same scan id, no-op
  await recordScan(kv, slim({ id: 'p2', score: 30, tier: 'Heavy', grade: 'D' }));
  const hist = await getHistory(kv, 'example.com');
  expect(hist.map((h) => h.id)).toEqual(['p1', 'p2']);
});

test('recordScan then recordScanForWatch does not double-append (production path)', async () => {
  // A watched domain: scan.js calls recordScan (all-domains) then
  // recordScanForWatch (watch baseline). The second append must de-dupe.
  const kv = makeKv({
    'w:example.com': JSON.stringify({ domain: 'example.com', email: 'a@b.com' }),
  });
  const s = slim({ id: 'p1', score: 8 });
  await recordScan(kv, s);
  await recordScanForWatch(kv, s);
  const hist = await getHistory(kv, 'example.com');
  expect(hist.length, 'same scan id appended once across both recorders').toBe(1);
});

test('recordScan carries the system reading when the axis ran', async () => {
  const kv = makeKv();
  await recordScan(kv, slim({ id: 'p1', system: { score: 72, tier: 'Aligned' } }));
  const hist = await getHistory(kv, 'example.com');
  expect(hist[0].sys).toEqual({ score: 72, tier: 'Aligned' });
});

// ── global score distribution + stats ────────────────────────────────────────
test('recordScan bumps the score distribution; getStats aggregates it', async () => {
  const kv = makeKv();
  await recordScan(kv, slim({ id: 'a', domain: 'a.com', score: 4, tier: 'Clean' })); // Clean
  await recordScan(kv, slim({ id: 'b', domain: 'b.com', score: 20, tier: 'Mild' })); // Mild
  await recordScan(kv, slim({ id: 'c', domain: 'c.com', score: 40, tier: 'Heavy' })); // Heavy
  const stats = await getStats(kv);
  expect(stats.count).toBe(3);
  expect(stats.clean).toBe(1);
  expect(stats.mild).toBe(1);
  expect(stats.heavy).toBe(1);
  expect(stats.avgScore).toBe(Math.round(((4 + 20 + 40) / 3) * 10) / 10);
  expect(stats.slopShare).toBe(67); // 2 of 3 score >= 10
});

test('getScoreDistribution returns a 101-bucket array, empty when unseeded', async () => {
  const kv = makeKv();
  const dist = await getScoreDistribution(kv);
  expect(dist.length).toBe(101);
  expect(dist.every((n) => n === 0)).toBeTruthy();
});

test('summarizeStats handles an empty distribution without NaN', () => {
  const s = summarizeStats(new Array(101).fill(0));
  expect(s).toEqual({ count: 0, avgScore: 0, slopShare: 0, clean: 0, mild: 0, heavy: 0 });
});

// ── peer percentile ("cleaner than X% of N sites") ───────────────────────────
test('percentileFromDistribution counts sites scoring strictly worse', () => {
  const dist = new Array(101).fill(0);
  dist[5] = 1;
  dist[10] = 1;
  dist[20] = 1;
  dist[50] = 1; // 4 sites
  // score 10 -> sites scoring > 10 are {20,50} = 2 of 4 = 50% cleaner-than
  expect(percentileFromDistribution(dist, 10)).toEqual({ count: 4, cleanerThanPct: 50 });
  // a 5 (cleanest) is cleaner than the other 3 of 4 = 75%
  expect(percentileFromDistribution(dist, 5).cleanerThanPct).toBe(75);
  // the worst (50) is cleaner than 0%
  expect(percentileFromDistribution(dist, 50).cleanerThanPct).toBe(0);
});

test('percentile is null with no data, and clamps out-of-range scores', () => {
  expect(percentileFromDistribution(new Array(101).fill(0), 8)).toEqual({
    count: 0,
    cleanerThanPct: null,
  });
  const dist = new Array(101).fill(0);
  dist[100] = 1;
  expect(percentileFromDistribution(dist, 999).cleanerThanPct).toBe(0); // clamps to 100
});

test('percentileForScore reads the live distribution from KV', async () => {
  const kv = makeKv();
  await recordScan(kv, slim({ id: 'a', domain: 'a.com', score: 30 }));
  await recordScan(kv, slim({ id: 'b', domain: 'b.com', score: 5 }));
  // scoring 5: one site (30) is worse -> cleaner than 50% of 2
  expect(await percentileForScore(kv, 5)).toEqual({ count: 2, cleanerThanPct: 50 });
});
