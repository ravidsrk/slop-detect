// KV TTL guard (T-10 / G-14): every namespaced key write carries the TTL from
// docs/KV_TTL.md, and the two durable aggregate keys explicitly carry none.
// Driven against a TTL-capturing in-memory KV mock.

import { test, expect } from 'vitest';
import {
  addToEmailIndex,
  removeFromEmailIndex,
  listWatchesByEmail,
  putWatch,
  recordScan,
} from '../functions/_shared.ts';

const YEAR = 60 * 60 * 24 * 365;

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
