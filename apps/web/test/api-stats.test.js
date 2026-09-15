// GET /api/stats — homepage hub aggregate stats. Wraps getStats; verify the
// handler shape + the no-storage fallback.

import { test, expect } from 'vitest';
import { onRequestGet } from '../functions/api/stats.ts';
import { recordScan } from '../functions/_shared.ts';

function makeKv() {
  const s = new Map();
  return {
    async get(k) {
      return s.has(k) ? s.get(k) : null;
    },
    async put(k, v) {
      s.set(k, v);
    },
    async delete(k) {
      s.delete(k);
    },
  };
}

test('GET /api/stats returns aggregate counts from the distribution', async () => {
  const kv = makeKv();
  await recordScan(kv, { id: 'a', domain: 'a.com', score: 4, tier: 'Clean' });
  await recordScan(kv, { id: 'b', domain: 'b.com', score: 30, tier: 'Heavy' });
  const res = await onRequestGet({ env: { RESULTS: kv } });
  expect(res.status).toBe(200);
  const j = await res.json();
  expect(j.count).toBe(2);
  expect(j.clean).toBe(1);
  expect(j.heavy).toBe(1);
  expect(j.slopShare).toBe(50);
});

test('GET /api/stats is safe with no storage configured', async () => {
  const res = await onRequestGet({ env: {} });
  expect(res.status).toBe(200);
  const j = await res.json();
  expect(j.count).toBe(0);
});

test('GET /api/stats includes the ops flow dashboard (today + yesterday)', async () => {
  const { bumpOpsStats, opsDateKey } = await import('../functions/_shared.ts');
  const kv = makeKv();
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  await bumpOpsStats(kv, 'scan', { status: 200 }, opsDateKey(today));
  await bumpOpsStats(kv, 'health', { status: 200 }, opsDateKey(yesterday));
  const res = await onRequestGet({ env: { RESULTS: kv } });
  expect(res.status).toBe(200);
  const j = await res.json();
  expect(j.ops.today.routes.scan.req).toBe(1);
  expect(j.ops.yesterday.routes.health.req).toBe(1);
});

test('GET /api/stats ops is null-blessed with no storage or no blobs', async () => {
  const res = await onRequestGet({ env: {} });
  const j = await res.json();
  expect(j.ops).toEqual({ today: null, yesterday: null });
  const res2 = await onRequestGet({ env: { RESULTS: makeKv() } });
  const j2 = await res2.json();
  expect(j2.ops).toEqual({ today: null, yesterday: null });
});
