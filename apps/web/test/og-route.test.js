// REL-2: /og/:id.png honors SCAN_DISABLED and routes browser I/O through _browser.

import { test, expect, vi, beforeEach } from 'vitest';

const mock = vi.hoisted(() => ({
  idleSessionId: null,
  calls: { sessions: 0, connect: 0, launch: 0 },
  screenshotBytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
}));

function makePage() {
  return {
    setViewport: async () => {},
    setContent: async () => {},
    evaluate: async () => {},
    screenshot: async () => mock.screenshotBytes,
  };
}

function makeBrowser() {
  return {
    newPage: async () => makePage(),
    disconnect: async () => {},
    close: async () => {},
  };
}

vi.mock('@cloudflare/puppeteer', () => ({
  default: {
    sessions: async () => {
      mock.calls.sessions++;
      if (!mock.idleSessionId) return [];
      return [{ sessionId: mock.idleSessionId, startTime: Date.now() }];
    },
    connect: async () => {
      mock.calls.connect++;
      return makeBrowser();
    },
    launch: async () => {
      mock.calls.launch++;
      return makeBrowser();
    },
  },
}));

import { onRequestGet } from '../functions/og/[id].ts';
import { OG_RENDER_LIMIT, ogRenderAllowed } from '../functions/_data.ts';

const slim = {
  id: 'abc123def456',
  domain: 'example.com',
  score: 22,
  tier: 'Mild',
  grade: 'C',
  verdict: 'Some patterns flagged.',
  patternsFlagged: 4,
  patternsTotal: 27,
  triggered: [{ short: 'Centered hero', label: 'Centered hero' }],
};

function makeKv(seed = {}) {
  const store = new Map(Object.entries(seed));
  return {
    store,
    async get(k, type) {
      if (!store.has(k)) return null;
      const v = store.get(k);
      if (type === 'arrayBuffer' && typeof v === 'string') {
        return new TextEncoder().encode(v).buffer;
      }
      return v;
    },
    async put(k, v) {
      store.set(k, v);
    },
  };
}

function ogCtx(id, env, url = 'https://slop-detect.com/og/abc123def456.png', ip = '203.0.113.1') {
  return {
    params: { id },
    env,
    request: {
      url,
      headers: { get: (name) => (name === 'CF-Connecting-IP' ? ip : null) },
    },
  };
}

beforeEach(() => {
  mock.idleSessionId = null;
  mock.calls = { sessions: 0, connect: 0, launch: 0 };
});

test('SCAN_DISABLED serves the static fallback without launching a browser', async () => {
  const kv = makeKv({ 'r:abc123def456': JSON.stringify(slim) });
  const rate = makeKv();
  const res = await onRequestGet(
    ogCtx('abc123def456', { RESULTS: kv, BROWSER: {}, RATE_LIMIT: rate, SCAN_DISABLED: '1' })
  );
  expect(res.status).toBe(302);
  expect(res.headers.get('Location')).toBe('https://slop-detect.com/og.png');
  expect(mock.calls.launch).toBe(0);
  expect(mock.calls.connect).toBe(0);
  expect(mock.calls.sessions).toBe(0);
  expect(rate.store.size).toBe(0);
});

test('SCAN_DISABLED serves the fallback even when og cache is populated', async () => {
  const kv = makeKv({
    'r:abc123def456': JSON.stringify(slim),
    'og:abc123def456': mock.screenshotBytes,
  });
  const res = await onRequestGet(
    ogCtx('abc123def456', { RESULTS: kv, BROWSER: {}, SCAN_DISABLED: '1' })
  );
  expect(res.status).toBe(302);
  expect(res.headers.get('Location')).toBe('https://slop-detect.com/og.png');
  expect(mock.calls.launch).toBe(0);
  expect(mock.calls.connect).toBe(0);
  expect(mock.calls.sessions).toBe(0);
});

test('cache miss with a valid id launches at most once', async () => {
  const kv = makeKv({ 'r:abc123def456': JSON.stringify(slim) });
  const res = await onRequestGet(ogCtx('abc123def456', { RESULTS: kv, BROWSER: {} }));
  expect(res.status).toBe(200);
  expect(res.headers.get('Content-Type')).toBe('image/png');
  expect(mock.calls.launch).toBe(1);
  expect(mock.calls.connect).toBe(0);
});

test('cache hit never launches a browser', async () => {
  const png = mock.screenshotBytes;
  const kv = makeKv({
    'r:abc123def456': JSON.stringify(slim),
    'og:abc123def456': png,
  });
  const res = await onRequestGet(ogCtx('abc123def456', { RESULTS: kv, BROWSER: {} }));
  expect(res.status).toBe(200);
  expect(mock.calls.launch).toBe(0);
  expect(mock.calls.connect).toBe(0);
});

test('cache hit does not consume the OG render budget', async () => {
  const png = mock.screenshotBytes;
  const results = makeKv({
    'r:abc123def456': JSON.stringify(slim),
    'og:abc123def456': png,
  });
  const rate = makeKv();
  const res = await onRequestGet(
    ogCtx('abc123def456', { RESULTS: results, BROWSER: {}, RATE_LIMIT: rate })
  );
  expect(res.status).toBe(200);
  expect(mock.calls.launch).toBe(0);
  expect(rate.store.size).toBe(0);
});

test('uncached OG renders are capped per IP', async () => {
  const results = makeKv();
  const rate = makeKv();
  const env = { RESULTS: results, BROWSER: {}, RATE_LIMIT: rate };
  const ip = '198.51.100.10';
  for (let i = 0; i < OG_RENDER_LIMIT + 1; i++) {
    const id = `id${i}`;
    results.store.set(`r:${id}`, JSON.stringify({ ...slim, id }));
    const res = await onRequestGet(ogCtx(id, env, `https://slop-detect.com/og/${id}.png`, ip));
    if (i < OG_RENDER_LIMIT) {
      expect(res.status).toBe(200);
    } else {
      expect(res.status).toBe(302);
      expect(res.headers.get('Location')).toBe('https://slop-detect.com/og.png');
    }
  }
  expect(mock.calls.launch).toBe(OG_RENDER_LIMIT);
});

test('OG render budgets are independent per IP', async () => {
  const results = makeKv({ 'r:abc123def456': JSON.stringify(slim) });
  const rate = makeKv();
  const env = { RESULTS: results, BROWSER: {}, RATE_LIMIT: rate };
  for (let i = 0; i < OG_RENDER_LIMIT; i++) {
    expect(await ogRenderAllowed(rate, '198.51.100.1')).toBe(true);
  }
  expect(await ogRenderAllowed(rate, '198.51.100.1')).toBe(false);
  const res = await onRequestGet(ogCtx('abc123def456', env, undefined, '198.51.100.2'));
  expect(res.status).toBe(200);
  expect(mock.calls.launch).toBe(1);
});

test('OG render still works when RATE_LIMIT binding is absent', async () => {
  const kv = makeKv({ 'r:abc123def456': JSON.stringify(slim) });
  const res = await onRequestGet(
    ogCtx('abc123def456', { RESULTS: kv, BROWSER: {} }, undefined, '198.51.100.11')
  );
  expect(res.status).toBe(200);
  expect(mock.calls.launch).toBe(1);
});

test('concurrent uncached OG renders from one IP stay within the cap', async () => {
  const results = makeKv();
  const rate = makeKv();
  const env = { RESULTS: results, BROWSER: {}, RATE_LIMIT: rate };
  const ip = '192.0.2.80';
  const n = OG_RENDER_LIMIT + 5;
  const ctxs = [];
  for (let i = 0; i < n; i++) {
    const id = `c${i}`;
    results.store.set(`r:${id}`, JSON.stringify({ ...slim, id }));
    ctxs.push(ogCtx(id, env, `https://slop-detect.com/og/${id}.png`, ip));
  }
  const responses = await Promise.all(ctxs.map((ctx) => onRequestGet(ctx)));
  expect(responses.filter((r) => r.status === 200).length).toBe(OG_RENDER_LIMIT);
  expect(responses.filter((r) => r.status === 302).length).toBe(5);
  expect(mock.calls.launch).toBe(OG_RENDER_LIMIT);
});

test('RATE_LIMIT KV errors fail closed without launching Chromium', async () => {
  const results = makeKv({ 'r:abc123def456': JSON.stringify(slim) });
  const rate = {
    async get() {
      throw new Error('kv down');
    },
    async put() {
      throw new Error('kv down');
    },
  };
  const res = await onRequestGet(
    ogCtx(
      'abc123def456',
      { RESULTS: results, BROWSER: {}, RATE_LIMIT: rate },
      undefined,
      '192.0.2.55'
    )
  );
  expect(res.status).toBe(302);
  expect(mock.calls.launch).toBe(0);
});

test('RATE_LIMIT KV errors do not exhaust the isolate OG budget', async () => {
  const results = makeKv({ 'r:abc123def456': JSON.stringify(slim) });
  const ip = '192.0.2.56';
  const throwing = {
    async get() {
      throw new Error('kv down');
    },
    async put() {
      throw new Error('kv down');
    },
  };
  for (let i = 0; i < OG_RENDER_LIMIT; i++) {
    const denied = await onRequestGet(
      ogCtx('abc123def456', { RESULTS: results, BROWSER: {}, RATE_LIMIT: throwing }, undefined, ip)
    );
    expect(denied.status).toBe(302);
  }
  const rate = makeKv();
  const res = await onRequestGet(
    ogCtx('abc123def456', { RESULTS: results, BROWSER: {}, RATE_LIMIT: rate }, undefined, ip)
  );
  expect(res.status).toBe(200);
  expect(mock.calls.launch).toBe(1);
});
