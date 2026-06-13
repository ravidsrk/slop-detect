// GET /api/stats — homepage hub aggregate stats. Wraps getStats; verify the
// handler shape + the no-storage fallback.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/api/stats.js';
import { recordScan } from '../functions/_shared.js';

function makeKv() {
  const s = new Map();
  return {
    async get(k) { return s.has(k) ? s.get(k) : null; },
    async put(k, v) { s.set(k, v); },
    async delete(k) { s.delete(k); }
  };
}

test('GET /api/stats returns aggregate counts from the distribution', async () => {
  const kv = makeKv();
  await recordScan(kv, { id: 'a', domain: 'a.com', score: 4, tier: 'Clean' });
  await recordScan(kv, { id: 'b', domain: 'b.com', score: 30, tier: 'Heavy' });
  const res = await onRequestGet({ env: { RESULTS: kv } });
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.count, 2);
  assert.equal(j.clean, 1);
  assert.equal(j.heavy, 1);
  assert.equal(j.slopShare, 50);
});

test('GET /api/stats is safe with no storage configured', async () => {
  const res = await onRequestGet({ env: {} });
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.count, 0);
});
