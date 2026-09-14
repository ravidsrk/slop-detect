// KV TTL guard (T-10 / G-14): data-layer KV writes carry the TTL from
// docs/KV_TTL.md, and the two durable aggregate keys explicitly carry none.
// Route-level single-site puts (og:image bytes, dashlink counter, middleware
// counters) are mapped in the doc and reviewed against it; this suite pins the
// data-layer writes reachable via public functions. TTL-capturing mock below.

import { test, expect } from 'vitest';
import {
  addToEmailIndex,
  removeFromEmailIndex,
  listWatchesByEmail,
  putWatch,
  recordScan,
  saveResult,
  issueWatchToken,
  issueDashboardToken,
  setListing,
  ogRenderAllowed,
  watchVerifyAllowed,
} from '../functions/_shared.ts';

const YEAR = 60 * 60 * 24 * 365;
const DAYS90 = 60 * 60 * 24 * 90;
const DAYS7 = 60 * 60 * 24 * 7;
const MIN15 = 60 * 15;

function makeKv() {
  const store = new Map();
  const puts = [];
  return {
    store,
    puts,
    async get(k) {
      return store.has(k) ? store.get(k).value : null;
    },
    async put(k, v, opts = {}) {
      store.set(k, { value: v, ttl: opts.expirationTtl });
      puts.push({ k, ttl: opts.expirationTtl });
    },
    async delete(k) {
      store.delete(k);
    },
    async list({ prefix = '' } = {}) {
      const keys = [...store.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name }));
      return { keys, list_complete: true, cursor: '' };
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
    triggered: [],
    createdAt: '2026-06-01T00:00:00.000Z',
    ...over,
  };
}

test('email index writes shadow the 1y watch TTL', async () => {
  const kv = makeKv();
  await addToEmailIndex(kv, 'a@x.io', 'example.com');
  const idx = kv.puts.find((p) => p.k.startsWith('e:'));
  expect(idx).toBeDefined();
  expect(idx.ttl).toBe(YEAR);
});

test('email index rewrite on remove carries the TTL; empty index deletes', async () => {
  const kv = makeKv();
  await addToEmailIndex(kv, 'a@x.io', 'example.com');
  await addToEmailIndex(kv, 'a@x.io', 'other.io');
  kv.puts.length = 0;
  await removeFromEmailIndex(kv, 'a@x.io', 'example.com');
  const idx = kv.puts.find((p) => p.k.startsWith('e:'));
  expect(idx.ttl).toBe(YEAR);
  await removeFromEmailIndex(kv, 'a@x.io', 'other.io');
  expect([...kv.store.keys()].some((k) => k.startsWith('e:'))).toBe(false);
});

test('index rebuild on listWatchesByEmail carries the TTL', async () => {
  const kv = makeKv();
  await putWatch(kv, { domain: 'example.com', email: 'a@x.io', verified: true });
  kv.puts.length = 0;
  const mine = await listWatchesByEmail(kv, 'a@x.io');
  expect(mine.map((w) => w.domain)).toEqual(['example.com']);
  const idx = kv.puts.find((p) => p.k.startsWith('e:'));
  expect(idx.ttl).toBe(YEAR);
});

test('stats contribution marker carries a 1y TTL (bounded growth)', async () => {
  const kv = makeKv();
  await recordScan(kv, slim());
  const gs = kv.puts.find((p) => p.k === 'gs:example.com');
  expect(gs).toBeDefined();
  expect(gs.ttl).toBe(YEAR);
});

test('aggregate keys stay durable by design (no TTL, fixed bounded keys)', async () => {
  const kv = makeKv();
  await recordScan(kv, slim());
  const dist = kv.puts.find((p) => p.k === 'stats:dist');
  const cat = kv.puts.find((p) => p.k === 'stats:catclean');
  expect(dist).toBeDefined();
  expect(cat).toBeDefined();
  expect(dist.ttl).toBeUndefined();
  expect(cat.ttl).toBeUndefined();
});

test('result snapshot + domain pointer carry 90d', async () => {
  const kv = makeKv();
  await saveResult(kv, slim());
  expect(kv.puts.find((p) => p.k === 'r:aaaa1111').ttl).toBe(DAYS90);
  expect(kv.puts.find((p) => p.k === 'd:example.com').ttl).toBe(DAYS90);
});

test('watch + history + listing carry 1y', async () => {
  const kv = makeKv();
  await putWatch(kv, { domain: 'example.com', email: 'a@x.io' });
  await recordScan(kv, slim());
  await setListing(kv, slim());
  expect(kv.puts.find((p) => p.k === 'w:example.com').ttl).toBe(YEAR);
  expect(kv.puts.find((p) => p.k === 'h:example.com').ttl).toBe(YEAR);
  expect(kv.puts.find((p) => p.k === 'l:example.com').ttl).toBe(YEAR);
});

test('single-use tokens carry short TTLs (7d verify, 15m magic link)', async () => {
  const kv = makeKv();
  const wt = await issueWatchToken(kv, 'example.com');
  const dt = await issueDashboardToken(kv, 'a@x.io');
  expect(kv.puts.find((p) => p.k === `wv:${wt}`).ttl).toBe(DAYS7);
  expect(kv.puts.find((p) => p.k === `dt:${dt}`).ttl).toBe(MIN15);
});

test('in-house rate counters carry window TTLs', async () => {
  const kv = makeKv();
  await ogRenderAllowed(kv, '1.2.3.4');
  await watchVerifyAllowed(kv, 'a@x.io');
  expect(kv.puts.find((p) => p.k === 'rl:ogrender:1.2.3.4').ttl).toBe(60);
  expect(kv.puts.find((p) => p.k.startsWith('rl:watchverify:')).ttl).toBe(3600);
});
