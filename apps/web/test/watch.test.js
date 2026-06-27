// Monitored-domains tests (VALIDATION.md WTP test). Pure helpers + the
// recordScanForWatch hook + the /api/watch handlers, all driven against an
// in-memory KV mock — no real Cloudflare KV, browser, or network.

import { test, expect, afterEach } from 'vitest';
import {
  normalizeDomain,
  isValidEmail,
  isRegression,
  tierRank,
  recordScanForWatch,
  getWatch,
  getHistory,
  emailIndexKey,
  getEmailDomains,
  watchVerifyAllowed,
} from '../functions/_shared.ts';
import { onRequestPost, onRequestGet } from '../functions/api/watch.ts';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

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
  expect(normalizeDomain('example.com')).toBe('example.com');
  expect(normalizeDomain('https://www.Example.com')).toBe('example.com');
  expect(normalizeDomain('https://example.com/pricing')).toBe('example.com');
  expect(normalizeDomain('sub.example.co.uk')).toBe('sub.example.co.uk');
});

test('normalizeDomain rejects junk, IPs-with-paths, and empty', () => {
  expect(normalizeDomain('')).toBe(null);
  expect(normalizeDomain('not a domain')).toBe(null);
  expect(normalizeDomain('localhost')).toBe(null); // no TLD
  expect(normalizeDomain('foo@bar.com')).toBe(null); // credentials/@
  expect(normalizeDomain('x.y')).toBe(null); // too short / 1-char TLD label
});

// ── isValidEmail ─────────────────────────────────────────────────────────────
test('isValidEmail accepts plausible addresses, rejects garbage', () => {
  expect(isValidEmail('dev@startup.io')).toBeTruthy();
  expect(isValidEmail('a.b+tag@sub.example.co')).toBeTruthy();
  expect(isValidEmail('nope')).toBeFalsy();
  expect(isValidEmail('a@b')).toBeFalsy();
  expect(isValidEmail('')).toBeFalsy();
  expect(isValidEmail('a b@c.com')).toBeFalsy();
});

// ── isRegression / tierRank ──────────────────────────────────────────────────
test('tierRank orders the bands', () => {
  expect(tierRank('Clean') < tierRank('Mild')).toBeTruthy();
  expect(tierRank('Mild') < tierRank('Heavy')).toBeTruthy();
});

test('isRegression fires on a tier drop OR a meaningful score increase', () => {
  const base = { score: 8, tier: 'Clean' };
  expect(isRegression(base, { score: 10, tier: 'Clean' })).toBeFalsy(); // +2, same tier → no
  expect(isRegression(base, { score: 16, tier: 'Clean' })).toBeTruthy(); // +8 → yes
  expect(isRegression(base, { score: 11, tier: 'Mild' })).toBeTruthy(); // tier drop → yes
  expect(isRegression(base, { score: 4, tier: 'Clean' })).toBeFalsy(); // improved → no
  expect(isRegression(null, { score: 90, tier: 'Heavy' })).toBeFalsy(); // no baseline → no
});

// ── recordScanForWatch ───────────────────────────────────────────────────────
test('recordScanForWatch is a no-op for unwatched domains', async () => {
  const kv = makeKv();
  const out = await recordScanForWatch(kv, slim());
  expect(out).toBe(null);
  expect(kv.store.has('h:example.com')).toBe(false);
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
  expect(first.watched).toBe(true);
  expect(first.regressed).toBe(false);
  expect(first.baseline.score).toBe(8);

  let watch = await getWatch(kv, 'example.com');
  expect(watch.baselineScore).toBe(8);
  expect(watch.lastScore).toBe(8);

  // Later scan regresses to Heavy → flagged.
  const later = await recordScanForWatch(
    kv,
    slim({ id: 's2', score: 41, grade: 'D', tier: 'Heavy' })
  );
  expect(later.regressed).toBe(true);
  expect(later.delta).toBe(33);

  watch = await getWatch(kv, 'example.com');
  expect(watch.regressed).toBe(true);
  expect(watch.baselineScore, 'baseline must not move once set').toBe(8);

  const hist = await getHistory(kv, 'example.com');
  expect(hist.length).toBe(2);
  expect(hist.map((h) => h.id)).toEqual(['s1', 's2']);
});

test('recordScanForWatch de-dupes the same scan id in history', async () => {
  const kv = makeKv({
    'w:example.com': JSON.stringify({ domain: 'example.com', email: 'd@x.io' }),
  });
  await recordScanForWatch(kv, slim({ id: 'dup' }));
  await recordScanForWatch(kv, slim({ id: 'dup' }));
  const hist = await getHistory(kv, 'example.com');
  expect(hist.length).toBe(1);
});

// ── POST /api/watch ──────────────────────────────────────────────────────────
test('POST /api/watch validates domain and email', async () => {
  const env = { RESULTS: makeKv() };
  let res = await onRequestPost({ request: makePostReq({ domain: 'nope', email: 'd@x.io' }), env });
  expect(res.status).toBe(400);

  res = await onRequestPost({ request: makePostReq({ domain: 'example.com', email: 'bad' }), env });
  expect(res.status).toBe(400);
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
  expect(res.status).toBe(201);
  const j = await res.json();
  expect(j.monitoring).toBe(true);
  expect(j.domain).toBe('example.com');
  expect(j.baseline.score).toBe(6);

  const watch = await getWatch(kv, 'example.com');
  expect(watch.email, 'email is normalized lowercase').toBe('dev@startup.io');
  expect(watch.baselineScore).toBe(6);

  const indexKey = await emailIndexKey('dev@startup.io');
  expect(kv.store.has(indexKey), 'subscribe writes the email index key [COST-2]').toBe(true);
  expect(await getEmailDomains(kv, 'dev@startup.io')).toEqual(['example.com']);
});

test('POST /api/watch unsubscribe requires a matching email', async () => {
  const kv = makeKv({
    'w:example.com': JSON.stringify({ domain: 'example.com', email: 'owner@x.io' }),
  });
  const indexKey = await emailIndexKey('owner@x.io');
  kv.store.set(indexKey, JSON.stringify(['example.com']));
  const env = { RESULTS: kv };

  // Wrong email → 403, watch survives.
  let res = await onRequestPost({
    request: makePostReq({ domain: 'example.com', email: 'rando@y.io', unsubscribe: true }),
    env,
  });
  expect(res.status).toBe(403);
  expect(await getWatch(kv, 'example.com')).toBeTruthy();

  // Right email → removed.
  res = await onRequestPost({
    request: makePostReq({ domain: 'example.com', email: 'owner@x.io', unsubscribe: true }),
    env,
  });
  expect(res.status).toBe(200);
  expect(await getWatch(kv, 'example.com')).toBe(null);
  expect(kv.store.has(indexKey), 'unsubscribe removes the email index entry').toBe(false);
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
  expect(res.status).toBe(200);
  const j = await res.json();
  expect(j.monitoring).toBe(true);
  expect(j.regressed).toBe(true);
  expect(j.history.length).toBe(1);
  expect(JSON.stringify(j).includes('secret@x.io'), 'email must never be returned').toBeFalsy();
});

test('GET /api/watch on an unwatched domain says monitoring:false', async () => {
  const env = { RESULTS: makeKv() };
  const res = await onRequestGet({ request: makeGetReq('unseen.com'), env });
  const j = await res.json();
  expect(j.monitoring).toBe(false);
});

// ── Per-recipient confirmation-email cap (anti email-bomb) ────────────────────
test('watchVerifyAllowed caps confirmation emails per recipient and fails closed', async () => {
  const kv = makeKv();
  // 3 sends allowed in the window, the 4th is blocked.
  expect(await watchVerifyAllowed(kv, 'victim@x.io')).toBe(true);
  expect(await watchVerifyAllowed(kv, 'victim@x.io')).toBe(true);
  expect(await watchVerifyAllowed(kv, 'victim@x.io')).toBe(true);
  expect(await watchVerifyAllowed(kv, 'victim@x.io')).toBe(false);
  // A different recipient has its own budget.
  expect(await watchVerifyAllowed(kv, 'other@x.io')).toBe(true);
  // The key is the hashed address, never the raw email.
  expect([...kv.store.keys()].some((k) => k.includes('victim@x.io'))).toBe(false);
  // No counter store → fail closed (do not send).
  expect(await watchVerifyAllowed(null, 'victim@x.io')).toBe(false);
});

test('POST /api/watch stops emailing one address after the per-recipient cap', async () => {
  let sends = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes('api.resend.com')) {
      sends++;
      return new Response(JSON.stringify({ id: `e${sends}` }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    throw new Error(`unexpected fetch to ${url}`);
  };
  const env = {
    RESULTS: makeKv(),
    RATE_LIMIT: makeKv(),
    RESEND_API_KEY: 're_test',
    ALERT_FROM: 'Slop Detect <alerts@slop-detect.com>',
  };
  // An attacker re-POSTs the same victim address; the confirmation email must be
  // capped regardless of how many times they hit the endpoint.
  const results = [];
  for (let i = 0; i < 5; i++) {
    const res = await onRequestPost({
      request: makePostReq({ domain: 'attacker-chosen.com', email: 'victim@x.io' }),
      env,
    });
    results.push((await res.json()).verificationSent);
  }
  expect(results).toEqual([true, true, true, false, false]);
  expect(sends, 'only 3 emails reach the victim, not 5').toBe(3);
});
