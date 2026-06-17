// Middleware tests — foreign-origin rejection (#6) and rate-limit fail-closed
// behavior for the scan route (#5). These drive onRequest() with hand-built
// context mocks so no real KV / browser / network is involved.

import { test, expect } from 'vitest';
import { onRequest } from '../functions/api/_middleware.ts';

const ALLOWED = 'https://slop-detect.com';

// Build a fake request. `body` is sent as JSON; `headers` is a plain object.
function makeRequest({ method = 'POST', path = '/api/scan', headers = {}, body = {} } = {}) {
  const url = `https://slop-detect.com${path}`;
  const h = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  const json = async () => body;
  return {
    method,
    url,
    headers: { get: (k) => (h.has(k.toLowerCase()) ? h.get(k.toLowerCase()) : null) },
    clone() {
      return { json };
    },
    json,
  };
}

// A context whose next() returns a benign 200 — so if the gate lets a request
// through, we observe a 200; if it blocks, we observe the gate's status.
function makeContext(request, env = {}) {
  return {
    request,
    env,
    next: async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  };
}

// A KV mock that always throws — simulates a KV outage (binding present, but
// reads/writes fail).
const throwingKv = {
  get: async () => {
    throw new Error('KV down');
  },
  put: async () => {
    throw new Error('KV down');
  },
};

test('#6 foreign browser origin is rejected with 403 origin_not_allowed', async () => {
  const req = makeRequest({
    headers: { Origin: 'https://evil.example.com' },
    body: { url: 'https://x.com' },
  });
  const res = await onRequest(makeContext(req));
  expect(res.status).toBe(403);
  const j = await res.json();
  expect(j.error).toBe('origin_not_allowed');
});

test('#6 trusted origin is NOT rejected as foreign (passes the origin gate)', async () => {
  // No RATE_LIMIT, no TURNSTILE_SECRET → should fall through to next() = 200.
  const req = makeRequest({ headers: { Origin: ALLOWED }, body: { url: 'https://x.com' } });
  const res = await onRequest(makeContext(req, {}));
  expect(res.status).toBe(200);
});

test('#6 no-origin caller (CLI/curl) is NOT treated as foreign', async () => {
  const req = makeRequest({ headers: {}, body: { url: 'https://x.com' } });
  const res = await onRequest(makeContext(req, {}));
  // First scan with no KV binding is allowed (under the in-memory ceiling).
  expect(res.status).toBe(200);
});

test('#5 RATE_LIMIT binding MISSING still caps the scan route (fail-closed)', async () => {
  // Same no-origin caller, hammered. With no KV binding, the in-memory ceiling
  // (3) must kick in and start returning 429 — NOT unlimited 200s.
  const ip = '203.0.113.77';
  let got429 = false;
  let allowed = 0;
  for (let i = 0; i < 8; i++) {
    const req = makeRequest({
      headers: { 'CF-Connecting-IP': ip },
      body: { url: 'https://x.com' },
    });
    const res = await onRequest(makeContext(req, {}));
    if (res.status === 429) {
      got429 = true;
      break;
    }
    if (res.status === 200) allowed++;
  }
  expect(got429, 'expected the scan route to start 429ing without a KV binding').toBeTruthy();
  expect(allowed <= 3, `expected <=3 scans before the ceiling, got ${allowed}`).toBeTruthy();
});

test('#5 KV outage (binding present, reads throw) fails CLOSED on scan route', async () => {
  const ip = '203.0.113.88';
  let got429 = false;
  for (let i = 0; i < 8; i++) {
    const req = makeRequest({
      headers: { 'CF-Connecting-IP': ip },
      body: { url: 'https://x.com' },
    });
    const res = await onRequest(makeContext(req, { RATE_LIMIT: throwingKv }));
    if (res.status === 429) {
      got429 = true;
      break;
    }
  }
  expect(got429, 'expected scan to fail-closed under a KV outage').toBeTruthy();
});

test('#5 KV outage on cheap fix-prompt (assemble) fails OPEN', async () => {
  // fix-prompt with { result } (no url) is the cheap assemble path — a KV outage
  // should NOT block it (no browser cost).
  const req = makeRequest({
    path: '/api/fix-prompt',
    headers: { 'CF-Connecting-IP': '203.0.113.99' },
    body: { result: { score: 10, patterns: [] } },
  });
  const res = await onRequest(makeContext(req, { RATE_LIMIT: throwingKv }));
  expect(res.status).toBe(200);
});

test('global daily cap returns 503 daily_capacity_reached for scans', async () => {
  // KV that reports the global counter already at/over the cap.
  const cappedKv = {
    get: async (k) => (k.startsWith('rl:global:scan:') ? '10000' : '0'),
    put: async () => {},
  };
  const req = makeRequest({
    headers: { 'CF-Connecting-IP': '203.0.113.5' },
    body: { url: 'https://x.com' },
  });
  const res = await onRequest(makeContext(req, { RATE_LIMIT: cappedKv, SCAN_DAILY_CAP: '10000' }));
  expect(res.status).toBe(503);
  expect((await res.json()).error).toBe('daily_capacity_reached');
});

test('global daily cap fails closed when KV read errors', async () => {
  const flakyKv = {
    get: async (k) => {
      if (k.startsWith('rl:global:scan:')) throw new Error('KV down');
      return '0';
    },
    put: async () => {},
  };
  const req = makeRequest({
    headers: { 'CF-Connecting-IP': '203.0.113.55' },
    body: { url: 'https://x.com' },
  });
  const res = await onRequest(
    makeContext(req, { RATE_LIMIT: flakyKv, SCAN_DAILY_CAP: '10000' })
  );
  expect(res.status).toBe(503);
  expect((await res.json()).error).toBe('scanning_paused');
});

test('SCAN_DISABLED kill switch returns 503 scanning_paused', async () => {
  const okKv = { get: async () => '0', put: async () => {} };
  const req = makeRequest({
    headers: { 'CF-Connecting-IP': '203.0.113.6' },
    body: { url: 'https://x.com' },
  });
  const res = await onRequest(makeContext(req, { RATE_LIMIT: okKv, SCAN_DISABLED: '1' }));
  expect(res.status).toBe(503);
  expect((await res.json()).error).toBe('scanning_paused');
});

test('a failed Turnstile 403s WITHOUT incrementing the global daily cap', async () => {
  // Regression: Turnstile is verified BEFORE the cost guard, so a captcha-less
  // (or spoofed-Origin) request can't burn the global daily-scan budget and 503
  // real users. A trusted origin with no X-Turnstile-Token must 403 and leave the
  // rl:global:scan:<day> counter untouched.
  const puts = [];
  const kv = {
    get: async () => '0',
    put: async (k) => {
      puts.push(k);
    },
  };
  const req = makeRequest({
    headers: { Origin: ALLOWED, 'CF-Connecting-IP': '203.0.113.7' },
    body: { url: 'https://x.com' },
  });
  const res = await onRequest(makeContext(req, { RATE_LIMIT: kv, TURNSTILE_SECRET: 'secret' }));
  expect(res.status).toBe(403);
  expect((await res.json()).error).toBe('turnstile_required');
  expect(
    puts.some((k) => k.startsWith('rl:global:scan:')),
    'global daily cap must NOT be incremented when Turnstile fails'
  ).toBeFalsy();
});

test('OPTIONS preflight returns 204 regardless of origin', async () => {
  const req = makeRequest({ method: 'OPTIONS', headers: { Origin: 'https://evil.example.com' } });
  const res = await onRequest(makeContext(req));
  expect(res.status).toBe(204);
});
