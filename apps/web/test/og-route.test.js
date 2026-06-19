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

function ogCtx(id, env, url = 'https://slop-detect.com/og/abc123def456.png') {
  return {
    params: { id },
    env,
    request: { url },
  };
}

beforeEach(() => {
  mock.idleSessionId = null;
  mock.calls = { sessions: 0, connect: 0, launch: 0 };
});

test('SCAN_DISABLED serves the static fallback without launching a browser', async () => {
  const kv = makeKv({ 'r:abc123def456': JSON.stringify(slim) });
  const res = await onRequestGet(
    ogCtx('abc123def456', { RESULTS: kv, BROWSER: {}, SCAN_DISABLED: '1' })
  );
  expect(res.status).toBe(302);
  expect(res.headers.get('Location')).toBe('https://slop-detect.com/og.png');
  expect(mock.calls.launch).toBe(0);
  expect(mock.calls.connect).toBe(0);
  expect(mock.calls.sessions).toBe(0);
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
