// Monitored-domains tests (VALIDATION.md WTP test). Pure helpers + the
// recordScanForWatch hook + the /api/watch handlers, all driven against an
// in-memory KV mock — no real Cloudflare KV, browser, or network.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeDomain,
  isValidEmail,
  isRegression,
  tierRank,
  recordScanForWatch,
  getWatch,
  getHistory,
} from '../functions/_shared.js';
import { onRequestPost, onRequestGet } from '../functions/api/watch.js';

// Minimal CF-KV-shaped mock: string values, TTL ignored.
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

function makePostReq(body) {
  return { json: async () => body, url: 'https://slop-detect.com/api/watch' };
}
function makeGetReq(domain) {
  return { url: `https://slop-detect.com/api/watch?domain=${encodeURIComponent(domain || '')}` };
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

// ── normalizeDomain ──────────────────────────────────────────────────────────
test('normalizeDomain accepts bare domains and strips scheme/www', () => {
  assert.equal(normalizeDomain('example.com'), 'example.com');
  assert.equal(normalizeDomain('https://www.Example.com'), 'example.com');
  assert.equal(normalizeDomain('https://example.com/pricing'), 'example.com');
  assert.equal(normalizeDomain('sub.example.co.uk'), 'sub.example.co.uk');
});

test('normalizeDomain rejects junk, IPs-with-paths, and empty', () => {
  assert.equal(normalizeDomain(''), null);
  assert.equal(normalizeDomain('not a domain'), null);
  assert.equal(normalizeDomain('localhost'), null); // no TLD
  assert.equal(normalizeDomain('foo@bar.com'), null); // credentials/@
  assert.equal(normalizeDomain('x.y'), null); // too short / 1-char TLD label
});

// ── isValidEmail ─────────────────────────────────────────────────────────────
test('isValidEmail accepts plausible addresses, rejects garbage', () => {
  assert.ok(isValidEmail('dev@startup.io'));
  assert.ok(isValidEmail('a.b+tag@sub.example.co'));
  assert.ok(!isValidEmail('nope'));
  assert.ok(!isValidEmail('a@b'));
  assert.ok(!isValidEmail(''));
  assert.ok(!isValidEmail('a b@c.com'));
});

// ── isRegression / tierRank ──────────────────────────────────────────────────
test('tierRank orders the bands', () => {
  assert.ok(tierRank('Clean') < tierRank('Mild'));
  assert.ok(tierRank('Mild') < tierRank('Heavy'));
});

test('isRegression fires on a tier drop OR a meaningful score increase', () => {
  const base = { score: 8, tier: 'Clean' };
  assert.ok(!isRegression(base, { score: 10, tier: 'Clean' })); // +2, same tier → no
  assert.ok(isRegression(base, { score: 16, tier: 'Clean' })); // +8 → yes
  assert.ok(isRegression(base, { score: 11, tier: 'Mild' })); // tier drop → yes
  assert.ok(!isRegression(base, { score: 4, tier: 'Clean' })); // improved → no
  assert.ok(!isRegression(null, { score: 90, tier: 'Heavy' })); // no baseline → no
});

// ── recordScanForWatch ───────────────────────────────────────────────────────
test('recordScanForWatch is a no-op for unwatched domains', async () => {
  const kv = makeKv();
  const out = await recordScanForWatch(kv, slim());
  assert.equal(out, null);
  assert.equal(kv.store.has('h:example.com'), false);
});

test('recordScanForWatch sets a baseline on first scan, then detects regression', async () => {
  const kv = makeKv({
    'w:example.com': JSON.stringify({ domain: 'example.com', email: 'dev@x.io' }),
  });

  // First scan establishes the baseline (Clean 8) and is not a regression.
  const first = await recordScanForWatch(
    kv,
    slim({ id: 's1', score: 8, grade: 'A-', tier: 'Clean' })
  );
  assert.equal(first.watched, true);
  assert.equal(first.regressed, false);
  assert.equal(first.baseline.score, 8);

  let watch = await getWatch(kv, 'example.com');
  assert.equal(watch.baselineScore, 8);
  assert.equal(watch.lastScore, 8);

  // Later scan regresses to Heavy → flagged.
  const later = await recordScanForWatch(
    kv,
    slim({ id: 's2', score: 41, grade: 'D', tier: 'Heavy' })
  );
  assert.equal(later.regressed, true);
  assert.equal(later.delta, 33);

  watch = await getWatch(kv, 'example.com');
  assert.equal(watch.regressed, true);
  assert.equal(watch.baselineScore, 8, 'baseline must not move once set');

  const hist = await getHistory(kv, 'example.com');
  assert.equal(hist.length, 2);
  assert.deepEqual(
    hist.map((h) => h.id),
    ['s1', 's2']
  );
});

test('recordScanForWatch de-dupes the same scan id in history', async () => {
  const kv = makeKv({
    'w:example.com': JSON.stringify({ domain: 'example.com', email: 'd@x.io' }),
  });
  await recordScanForWatch(kv, slim({ id: 'dup' }));
  await recordScanForWatch(kv, slim({ id: 'dup' }));
  const hist = await getHistory(kv, 'example.com');
  assert.equal(hist.length, 1);
});

// ── POST /api/watch ──────────────────────────────────────────────────────────
test('POST /api/watch validates domain and email', async () => {
  const env = { RESULTS: makeKv() };
  let res = await onRequestPost({ request: makePostReq({ domain: 'nope', email: 'd@x.io' }), env });
  assert.equal(res.status, 400);

  res = await onRequestPost({ request: makePostReq({ domain: 'example.com', email: 'bad' }), env });
  assert.equal(res.status, 400);
});

test('POST /api/watch subscribes, seeding baseline from the latest scan', async () => {
  // Pre-seed a prior scan for the domain (d:<domain> → id, r:<id> → result).
  const kv = makeKv({
    'd:example.com': 'r0',
    'r:r0': JSON.stringify({
      id: 'r0',
      domain: 'example.com',
      score: 6,
      grade: 'A',
      tier: 'Clean',
      createdAt: '2026-05-01T00:00:00.000Z',
    }),
  });
  const env = { RESULTS: kv };

  const res = await onRequestPost({
    request: makePostReq({ domain: 'https://www.example.com', email: 'Dev@Startup.IO' }),
    env,
  });
  assert.equal(res.status, 201);
  const j = await res.json();
  assert.equal(j.monitoring, true);
  assert.equal(j.domain, 'example.com');
  assert.equal(j.baseline.score, 6);

  const watch = await getWatch(kv, 'example.com');
  assert.equal(watch.email, 'dev@startup.io', 'email is normalized lowercase');
  assert.equal(watch.baselineScore, 6);
});

test('POST /api/watch unsubscribe requires a matching email', async () => {
  const kv = makeKv({
    'w:example.com': JSON.stringify({ domain: 'example.com', email: 'owner@x.io' }),
  });
  const env = { RESULTS: kv };

  // Wrong email → 403, watch survives.
  let res = await onRequestPost({
    request: makePostReq({ domain: 'example.com', email: 'rando@y.io', unsubscribe: true }),
    env,
  });
  assert.equal(res.status, 403);
  assert.ok(await getWatch(kv, 'example.com'));

  // Right email → removed.
  res = await onRequestPost({
    request: makePostReq({ domain: 'example.com', email: 'owner@x.io', unsubscribe: true }),
    env,
  });
  assert.equal(res.status, 200);
  assert.equal(await getWatch(kv, 'example.com'), null);
});

// ── GET /api/watch ───────────────────────────────────────────────────────────
test('GET /api/watch reports status without leaking the email', async () => {
  const kv = makeKv({
    'w:example.com': JSON.stringify({
      domain: 'example.com',
      email: 'secret@x.io',
      baselineScore: 8,
      baselineGrade: 'A-',
      baselineTier: 'Clean',
      lastScore: 30,
      lastGrade: 'C',
      lastTier: 'Heavy',
      regressed: true,
    }),
    'h:example.com': JSON.stringify([
      { id: 'a', score: 8, grade: 'A-', tier: 'Clean', createdAt: 't1' },
    ]),
  });
  const env = { RESULTS: kv };

  const res = await onRequestGet({ request: makeGetReq('example.com'), env });
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.monitoring, true);
  assert.equal(j.regressed, true);
  assert.equal(j.history.length, 1);
  assert.ok(!JSON.stringify(j).includes('secret@x.io'), 'email must never be returned');
});

test('GET /api/watch on an unwatched domain says monitoring:false', async () => {
  const env = { RESULTS: makeKv() };
  const res = await onRequestGet({ request: makeGetReq('unseen.com'), env });
  const j = await res.json();
  assert.equal(j.monitoring, false);
});
