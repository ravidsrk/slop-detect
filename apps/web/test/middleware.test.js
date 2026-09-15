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
  const res = await onRequest(makeContext(req, { RATE_LIMIT: flakyKv, SCAN_DAILY_CAP: '10000' }));
  expect(res.status).toBe(503);
  expect((await res.json()).error).toBe('scanning_paused');
});

test('/api/aeo charges several daily-cap units for its fan-out; a scan charges one', async () => {
  // aeo does not drive the browser but fans out to ~30 outbound fetches, so it
  // must consume more of the shared daily budget than a single scan.
  const puts = [];
  const countingKv = {
    get: async () => '0',
    put: async (k, v) => {
      puts.push([k, v]);
    },
  };
  const aeoReq = makeRequest({
    path: '/api/aeo',
    headers: { 'CF-Connecting-IP': '203.0.113.71' },
    body: { url: 'https://x.com' },
  });
  await onRequest(makeContext(aeoReq, { RATE_LIMIT: countingKv, SCAN_DAILY_CAP: '10000' }));
  const aeoGlobal = puts.find(([k]) => k.startsWith('rl:global:scan:'));
  expect(aeoGlobal, 'aeo increments the global daily cap').toBeTruthy();
  expect(aeoGlobal[1], 'aeo charges AEO_COST_UNITS').toBe('3');

  puts.length = 0;
  const scanReq = makeRequest({
    path: '/api/scan',
    headers: { 'CF-Connecting-IP': '203.0.113.72' },
    body: { url: 'https://x.com' },
  });
  await onRequest(makeContext(scanReq, { RATE_LIMIT: countingKv, SCAN_DAILY_CAP: '10000' }));
  const scanGlobal = puts.find(([k]) => k.startsWith('rl:global:scan:'));
  expect(scanGlobal[1], 'a browser scan charges one unit').toBe('1');
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

test('COST-1 parallel burst cannot overshoot per-IP limit via stale KV [COST-1]', async () => {
  // KV always returns 0 — simulates concurrent reads of the same stale counter.
  // Without the per-isolate memIncrement ceiling, all K requests would pass.
  const anonNoOriginLimit = 3; // Math.max(2, Math.floor(SCAN_LIMIT_PER_MIN / 2))
  const staleKv = {
    get: async () => '0',
    put: async () => {},
  };
  const ip = '203.0.113.200';
  const parallel = 8;
  const results = await Promise.all(
    Array.from({ length: parallel }, () =>
      onRequest(
        makeContext(
          makeRequest({
            headers: { 'CF-Connecting-IP': ip },
            body: { url: 'https://x.com' },
          }),
          { RATE_LIMIT: staleKv }
        )
      )
    )
  );
  const allowed = results.filter((r) => r.status === 200).length;
  expect(
    allowed,
    `expected at most ${anonNoOriginLimit} parallel scans with stale KV, got ${allowed}`
  ).toBeLessThanOrEqual(anonNoOriginLimit);
});

test('SEC-3 no-origin scan allowed only up to anon limit (Turnstile bypass floor) [SEC-3]', async () => {
  // Turnstile is required only for trusted browser origins. No-origin callers
  // (CLI/curl) bypass captcha by design; the per-IP limit is the real floor.
  const anonNoOriginLimit = 3;
  const okKv = { get: async () => '0', put: async () => {} };
  const ip = '203.0.113.201';
  let allowed = 0;
  let got429 = false;
  for (let i = 0; i < 8; i++) {
    const req = makeRequest({
      headers: { 'CF-Connecting-IP': ip },
      body: { url: 'https://x.com' },
    });
    const res = await onRequest(makeContext(req, { RATE_LIMIT: okKv, TURNSTILE_SECRET: 'secret' }));
    if (res.status === 200) allowed++;
    if (res.status === 429) {
      got429 = true;
      break;
    }
  }
  expect(got429, 'expected no-origin scans to hit the per-IP floor').toBeTruthy();
  expect(allowed).toBeLessThanOrEqual(anonNoOriginLimit);
});

test('middleware scan counters carry window TTLs (KV_TTL.md)', async () => {
  const puts = [];
  const rateKv = {
    get: async () => '0',
    put: async (k, v, o = {}) => {
      puts.push({ k, ttl: o.expirationTtl });
    },
  };
  const req = makeRequest({
    headers: { 'CF-Connecting-IP': '203.0.113.99' },
    body: { url: 'https://x.com' },
  });
  const res = await onRequest(makeContext(req, { RATE_LIMIT: rateKv, TURNSTILE_SECRET: 'secret' }));
  expect(res.status).toBe(200);
  const perIp = puts.find((p) => p.k.startsWith('rl:scan:'));
  const global = puts.find((p) => p.k.startsWith('rl:global:scan:'));
  expect(perIp, 'expected a per-IP scan counter write').toBeDefined();
  expect(perIp.ttl).toBe(60);
  expect(global, 'expected a global daily budget write').toBeDefined();
  expect(global.ttl).toBe(172800);
});

// ── Request IDs (G-04 / T-22) ───────────────────────────────────────────────
// Every /api/* response carries X-Request-Id: cf-ray when present, else an
// echoed inbound x-request-id, else a fresh UUID. Rejections carry it too.

test('pass-through POST stamps X-Request-Id (uuid fallback, no inbound id)', async () => {
  const req = makeRequest({
    headers: { Origin: ALLOWED, 'CF-Connecting-IP': '203.0.113.211' },
    body: { url: 'https://x.com' },
  });
  const res = await onRequest(makeContext(req, {}));
  expect(res.status).toBe(200);
  const id = res.headers.get('X-Request-Id');
  expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
});

test('inbound cf-ray is preferred as the request ID', async () => {
  const req = makeRequest({
    headers: { Origin: ALLOWED, 'CF-Ray': 'abc123ray', 'CF-Connecting-IP': '203.0.113.212' },
    body: { url: 'https://x.com' },
  });
  const res = await onRequest(makeContext(req, {}));
  expect(res.headers.get('X-Request-Id')).toBe('abc123ray');
});

test('inbound x-request-id is echoed when no cf-ray', async () => {
  const req = makeRequest({
    headers: {
      Origin: ALLOWED,
      'X-Request-Id': 'caller-trace-1',
      'CF-Connecting-IP': '203.0.113.213',
    },
    body: { url: 'https://x.com' },
  });
  const res = await onRequest(makeContext(req, {}));
  expect(res.headers.get('X-Request-Id')).toBe('caller-trace-1');
});

test('rejections carry X-Request-Id too (403 foreign origin)', async () => {
  const req = makeRequest({
    headers: { Origin: 'https://evil.example.com', 'CF-Ray': 'rej-ray-9' },
    body: { url: 'https://x.com' },
  });
  const res = await onRequest(makeContext(req, {}));
  expect(res.status).toBe(403);
  expect(res.headers.get('X-Request-Id')).toBe('rej-ray-9');
});

test('GET and OPTIONS responses carry X-Request-Id', async () => {
  const get = makeRequest({ method: 'GET', path: '/api/patterns' });
  const resGet = await onRequest(makeContext(get, {}));
  expect(resGet.headers.get('X-Request-Id')).toBeTruthy();
  const opt = makeRequest({ method: 'OPTIONS', path: '/api/scan' });
  const resOpt = await onRequest(makeContext(opt, {}));
  expect(resOpt.status).toBe(204);
  expect(resOpt.headers.get('X-Request-Id')).toBeTruthy();
});

test('the computed ID is forwarded to the handler on a cloned request', async () => {
  // Real Request (unlike the POJO doubles above) so forwardWithId can clone.
  const req = new Request('https://slop-detect.com/api/scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CF-Ray': 'fwd-ray-7',
      'CF-Connecting-IP': '203.0.113.214',
    },
    body: JSON.stringify({ url: 'https://x.com' }),
  });
  let seen;
  const ctx = {
    request: req,
    env: {},
    next: async (r) => {
      seen = r;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    },
  };
  const res = await onRequest(ctx);
  expect(res.status).toBe(200);
  expect(res.headers.get('X-Request-Id')).toBe('fwd-ray-7');
  expect(seen.headers.get('x-request-id')).toBe('fwd-ray-7');
});

test('preflight allows + exposes X-Request-Id (CORS gap)', async () => {
  const opt = makeRequest({ method: 'OPTIONS', path: '/api/scan' });
  const res = await onRequest(makeContext(opt, {}));
  expect(res.status).toBe(204);
  expect(res.headers.get('Access-Control-Allow-Headers')).toMatch(/X-Request-Id/);
  expect(res.headers.get('Access-Control-Expose-Headers')).toMatch(/X-Request-Id/);
});

test('a throwing POST handler becomes a traced JSON 500 (same ID in body+header)', async () => {
  const req = makeRequest({
    headers: { Origin: ALLOWED, 'CF-Ray': 'throw-ray-1', 'CF-Connecting-IP': '203.0.113.215' },
    body: { url: 'https://x.com' },
  });
  const ctx = {
    request: req,
    env: {},
    next: async () => {
      throw new Error('handler exploded');
    },
  };
  const res = await onRequest(ctx);
  expect(res.status).toBe(500);
  expect(res.headers.get('X-Request-Id')).toBe('throw-ray-1');
  const j = await res.json();
  expect(j.error).toBe('internal_error');
  expect(j.requestId).toBe('throw-ray-1');
  expect(JSON.stringify(j)).not.toMatch(/exploded/);
});

test('a throwing GET handler becomes a traced JSON 500', async () => {
  const req = makeRequest({ method: 'GET', path: '/api/patterns' });
  const ctx = {
    request: req,
    env: {},
    next: async () => {
      throw new Error('get handler exploded');
    },
  };
  const res = await onRequest(ctx);
  expect(res.status).toBe(500);
  const j = await res.json();
  expect(j.error).toBe('internal_error');
  expect(j.requestId).toBe(res.headers.get('X-Request-Id'));
  expect(j.requestId).toBeTruthy();
});

// ── Ops metrics bumps (G-05 / T-24) ──────────────────────────────────────────
// The middleware bumps per-route req/byStatus fire-and-forget (no waitUntil in
// these doubles, so the write lands detached — flush before asserting).

function makeOpsKv() {
  const store = new Map();
  return {
    store,
    get: async (k) => (store.has(k) ? store.get(k) : null),
    put: async (k, v) => {
      store.set(k, v);
    },
  };
}

const flush = () => new Promise((r) => setTimeout(r, 25));

function todayOpsKey() {
  return `stats:ops:${new Date().toISOString().slice(0, 10)}`;
}

test('pass-through POST bumps the route req/byStatus blob (non-scan route)', async () => {
  // Single-writer rule: scan pass-throughs are owned by scan.ts, so this
  // exercises a non-scan route (fix-prompt) for the middleware bump.
  const opsKv = makeOpsKv();
  const req = makeRequest({
    path: '/api/fix-prompt',
    headers: { Origin: ALLOWED, 'CF-Connecting-IP': '203.0.113.216' },
    body: { result: { score: 1 } },
  });
  const res = await onRequest(makeContext(req, { RESULTS: opsKv }));
  expect(res.status).toBe(200);
  await flush();
  const blob = JSON.parse(opsKv.store.get(todayOpsKey()));
  expect(blob.routes['fix-prompt'].req).toBe(1);
  expect(blob.routes['fix-prompt'].byStatus).toEqual({ 200: 1 });
});

test('scan pass-throughs are NOT bumped by the middleware (scan.ts owns them)', async () => {
  const opsKv = makeOpsKv();
  const req = makeRequest({
    headers: { Origin: ALLOWED, 'CF-Connecting-IP': '203.0.113.222' },
    body: { url: 'https://x.com' },
  });
  const res = await onRequest(makeContext(req, { RESULTS: opsKv }));
  expect(res.status).toBe(200);
  await flush();
  expect(opsKv.store.size).toBe(0);
});

test('rejections bump byStatus (403 foreign origin)', async () => {
  const opsKv = makeOpsKv();
  const req = makeRequest({
    headers: { Origin: 'https://evil.example.com', 'CF-Connecting-IP': '203.0.113.217' },
    body: { url: 'https://x.com' },
  });
  const res = await onRequest(makeContext(req, { RESULTS: opsKv }));
  expect(res.status).toBe(403);
  await flush();
  const blob = JSON.parse(opsKv.store.get(todayOpsKey()));
  expect(blob.routes.scan.req).toBe(1);
  expect(blob.routes.scan.byStatus).toEqual({ 403: 1 });
});

test('missing RESULTS binding skips the bump without breaking the request', async () => {
  const req = makeRequest({
    headers: { Origin: ALLOWED, 'CF-Connecting-IP': '203.0.113.218' },
    body: { url: 'https://x.com' },
  });
  const res = await onRequest(makeContext(req, {}));
  expect(res.status).toBe(200);
  await flush();
});

test('share:false skips even anonymous ops bumps (privacy promise)', async () => {
  const opsKv = makeOpsKv();
  const req = new Request('https://slop-detect.com/api/scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: ALLOWED,
      'CF-Connecting-IP': '203.0.113.219',
    },
    body: JSON.stringify({ url: 'https://x.com', share: false }),
  });
  const ctx = {
    request: req,
    env: { RESULTS: opsKv },
    next: async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
  };
  const res = await onRequest(ctx);
  expect(res.status).toBe(200);
  await flush();
  expect(opsKv.store.size).toBe(0);
});

test('oversized declared bodies skip the pre-admission peek (rejection still counted)', async () => {
  const opsKv = makeOpsKv();
  // POJO double with an explicit huge content-length (real Requests forbid
  // setting it by hand); clone would parse, but the cap skips the peek.
  // Foreign origin forces a middleware rejection, which bumps (peek skipped
  // means the opt-out is unknown — fail-counted, never fail-blind).
  let cloned = false;
  const req = {
    method: 'POST',
    url: 'https://slop-detect.com/api/scan',
    headers: {
      get: (k) => {
        const h = {
          origin: 'https://evil.example.com',
          'cf-connecting-ip': '203.0.113.220',
          'content-length': '100000',
        };
        return h[k.toLowerCase()] ?? null;
      },
    },
    clone: () => {
      cloned = true;
      return { json: async () => ({ url: 'https://x.com', share: false }) };
    },
    json: async () => ({ url: 'https://x.com', share: false }),
  };
  const res = await onRequest(makeContext(req, { RESULTS: opsKv }));
  expect(res.status).toBe(403);
  expect(cloned).toBe(false);
  await flush();
  const blob = JSON.parse(opsKv.store.get(todayOpsKey()));
  expect(blob.routes.scan.req).toBe(1);
  expect(blob.routes.scan.byStatus).toEqual({ 403: 1 });
});

test('chunked bodies with unknown length skip the pre-admission peek', async () => {
  const opsKv = makeOpsKv();
  let cloned = false;
  const req = {
    method: 'POST',
    url: 'https://slop-detect.com/api/scan',
    headers: {
      get: (k) => {
        const h = {
          origin: 'https://evil.example.com',
          'cf-connecting-ip': '203.0.113.221',
          'transfer-encoding': 'chunked',
        };
        return h[k.toLowerCase()] ?? null;
      },
    },
    clone: () => {
      cloned = true;
      return { json: async () => ({ url: 'https://x.com' }) };
    },
    json: async () => ({ url: 'https://x.com' }),
  };
  const res = await onRequest(makeContext(req, { RESULTS: opsKv }));
  expect(res.status).toBe(403);
  expect(cloned).toBe(false);
  await flush();
  expect(JSON.parse(opsKv.store.get(todayOpsKey())).routes.scan.req).toBe(1);
});

test('share:false scan REJECTIONS are not bumped (peek drives the opt-out)', async () => {
  // Real Request so the peek can actually parse the share:false flag.
  const opsKv = makeOpsKv();
  const req = new Request('https://slop-detect.com/api/scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://evil.example.com',
      'CF-Connecting-IP': '203.0.113.223',
    },
    body: JSON.stringify({ url: 'https://x.com', share: false }),
  });
  const res = await onRequest(makeContext(req, { RESULTS: opsKv }));
  expect(res.status).toBe(403);
  await flush();
  expect(opsKv.store.size).toBe(0);
});
