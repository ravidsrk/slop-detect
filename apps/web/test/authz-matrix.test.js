// AuthZ matrix verification (T-09 / G-22): every route × credential state.
// Cells already proven elsewhere are cited, not re-tested:
//   dashboard page + link anti-enumeration → dashboard.test.js (17 tests)
//   watch subscribe/unsubscribe/GET privacy  → watch.test.js
//   confirm handler                          → alerts.test.js
//   middleware origin/rate/cap/kill-switch   → middleware.test.js
// This file proves the UNCOVERED cells: the sweep's Bearer [REDACTED] (zero
// coverage before), the middleware API-key paths, aeo/fix-prompt gating,
// and a tampered dashboard cookie at the page level.

import { test, expect } from 'vitest';
import { onRequest as apiGate } from '../functions/api/_middleware.ts';
import { onRequestPost as sweepPost } from '../functions/api/cron/sweep.ts';
import { onRequestGet as patternsGet } from '../functions/api/patterns.ts';
import { onRequestGet as dashGet } from '../functions/dashboard.tsx';
import { signSession } from '../functions/_session.ts';

const SECRET = 'test-secret-0123456789';
const CRON = 'cron-secret-abc';

function makeKv(seed = {}) {
  const store = new Map(
    Object.entries(seed).map(([k, v]) => [k, typeof v === 'string' ? { value: v } : v])
  );
  return {
    store,
    async get(k) {
      return store.has(k) ? store.get(k).value : null;
    },
    async put(k, v, o = {}) {
      store.set(k, { value: v, metadata: o.metadata, ttl: o.expirationTtl });
    },
    async delete(k) {
      store.delete(k);
    },
    async list({ prefix = '', limit = 1000 } = {}) {
      const keys = [...store.keys()]
        .filter((n) => n.startsWith(prefix))
        .slice(0, limit)
        .map((n) => ({ name: n, metadata: store.get(n).metadata }));
      return { keys, list_complete: true };
    },
  };
}

// Fake request shaped like middleware.test.js's, plus clone().json() for the
// fix-prompt body peek. Headers are case-insensitive.
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

const passThrough = async () =>
  new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

// ── Sweep: Bearer [REDACTED] ───────────────────────────────────────────────────

function sweepReq(auth) {
  const headers = auth ? { Authorization: auth } : {};
  return makeRequest({ path: '/api/cron/sweep', headers, body: {} });
}

test('sweep: 503 sweep_disabled without CRON_SECRET (feature off by default)', async () => {
  const res = await sweepPost({
    request: sweepReq(`Bearer ${CRON}`),
    env: { RESULTS: makeKv(), INTERNAL_API_KEY: 'k' },
  });
  expect(res.status).toBe(503);
  expect((await res.json()).error).toBe('sweep_disabled');
});

test('sweep: 401 without Authorization, 401 on the wrong secret', async () => {
  const env = { CRON_SECRET: CRON, RESULTS: makeKv(), INTERNAL_API_KEY: 'k' };
  const anon = await sweepPost({ request: sweepReq(null), env });
  expect(anon.status).toBe(401);
  expect((await anon.json()).error).toBe('unauthorized');
  const wrong = await sweepPost({ request: sweepReq('Bearer wrong-secret'), env });
  expect(wrong.status).toBe(401);
  expect((await wrong.json()).error).toBe('unauthorized');
});

test('sweep: 500 misconfigured without INTERNAL_API_KEY (even with valid Bearer)', async () => {
  const res = await sweepPost({
    request: sweepReq(`Bearer ${CRON}`),
    env: { CRON_SECRET: CRON, RESULTS: makeKv() },
  });
  expect(res.status).toBe(500);
  expect((await res.json()).error).toBe('misconfigured');
});

test('sweep: 200 happy path with valid Bearer + empty watch list', async () => {
  const res = await sweepPost({
    request: sweepReq(`Bearer ${CRON}`),
    env: { CRON_SECRET: CRON, RESULTS: makeKv(), INTERNAL_API_KEY: 'k' },
  });
  expect(res.status).toBe(200);
  const j = await res.json();
  expect(j.ok).toBe(true);
  expect(j.considered).toBe(0);
});

test('sweep through the middleware: cheap gate passes the scheduler, handler enforces Bearer', async () => {
  const env = { CRON_SECRET: CRON, RESULTS: makeKv(), INTERNAL_API_KEY: 'k' };
  const chain = (request) => apiGate({ request, env, next: () => sweepPost({ request, env }) });
  // No RATE_LIMIT binding at all: the scheduler (no-origin POST) still passes
  // the middleware's cheap route and reaches the handler's 401.
  const anon = await chain(sweepReq(null));
  expect(anon.status).toBe(401);
  expect((await anon.json()).error).toBe('unauthorized');
  const authed = await chain(sweepReq(`Bearer ${CRON}`));
  expect(authed.status).toBe(200);
  expect((await authed.json()).ok).toBe(true);
});

// ── Middleware: API-key paths ────────────────────────────────────────────────

const keyedKv = (records = {}) =>
  makeKv(
    Object.fromEntries(Object.entries(records).map(([k, r]) => [`key:${k}`, JSON.stringify(r)]))
  );

test('presented-but-invalid API key → 401 invalid_api_key', async () => {
  const req = makeRequest({ path: '/api/scan', headers: { 'X-API-Key': 'nope' }, body: {} });
  const res = await apiGate({ request: req, env: { RATE_LIMIT: makeKv() }, next: passThrough });
  expect(res.status).toBe(401);
  expect((await res.json()).error).toBe('invalid_api_key');
});

test('disabled API key → 403 key_disabled', async () => {
  const req = makeRequest({ path: '/api/scan', headers: { 'X-API-Key': 'dead' }, body: {} });
  const env = { RATE_LIMIT: keyedKv({ dead: { tier: 'pro', disabled: true } }) };
  const res = await apiGate({ request: req, env, next: passThrough });
  expect(res.status).toBe(403);
  expect((await res.json()).error).toBe('key_disabled');
});

test('foreign origin + valid key passes (a key is explicit authorization)', async () => {
  const req = makeRequest({
    path: '/api/scan',
    headers: { Origin: 'https://partner.example.com', 'X-API-Key': 'pk1' },
    body: {},
  });
  const env = { RATE_LIMIT: keyedKv({ pk1: { tier: 'free' } }) };
  const res = await apiGate({ request: req, env, next: passThrough });
  expect(res.status).toBe(200);
});

test('valid key skips Turnstile on scan from a trusted origin', async () => {
  const base = { Origin: 'https://slop-detect.com' };
  const keyed = makeRequest({
    path: '/api/scan',
    headers: { ...base, 'X-API-Key': 'pk2' },
    body: {},
  });
  const env = { RATE_LIMIT: keyedKv({ pk2: { tier: 'free' } }), TURNSTILE_SECRET: 'ts' };
  const res = await apiGate({ request: keyed, env, next: passThrough });
  expect(res.status).toBe(200);
  // Control: the same request anonymous is Turnstile-gated.
  const anon = makeRequest({ path: '/api/scan', headers: base, body: {} });
  const res2 = await apiGate({
    request: anon,
    env: { RATE_LIMIT: makeKv(), TURNSTILE_SECRET: 'ts' },
    next: passThrough,
  });
  expect(res2.status).toBe(403);
  expect((await res2.json()).error).toBe('turnstile_required');
});

test('unlimited key bypasses an exhausted daily cap; anonymous gets 503', async () => {
  const day = new Date().toISOString().slice(0, 10);
  const gkey = `rl:global:scan:${day}`;
  const seed = { [gkey]: '5' };
  const mkEnv = (records) => ({
    RATE_LIMIT: makeKv({ ...seed, ...records }),
    SCAN_DAILY_CAP: '5',
  });
  const anon = makeRequest({ path: '/api/scan', body: {} });
  const resAnon = await apiGate({ request: anon, env: mkEnv({}), next: passThrough });
  expect(resAnon.status).toBe(503);
  expect((await resAnon.json()).error).toBe('daily_capacity_reached');
  const keyed = makeRequest({ path: '/api/scan', headers: { 'X-API-Key': 'ops' }, body: {} });
  const resKey = await apiGate({
    request: keyed,
    env: mkEnv({ 'key:ops': JSON.stringify({ tier: 'unlimited' }) }),
    next: passThrough,
  });
  expect(resKey.status).toBe(200);
});

// ── Middleware: aeo / fix-prompt gating ─────────────────────────────────────

test('fix-prompt {url} is gated AS a scan; {result} stays cheap', async () => {
  const env = () => ({ RATE_LIMIT: makeKv(), TURNSTILE_SECRET: 'ts' });
  const base = { Origin: 'https://slop-detect.com', 'CF-Connecting-IP': '9.9.9.1' };
  // {url} without a Turnstile token → 403, like a scan.
  const urlMode = makeRequest({
    path: '/api/fix-prompt',
    headers: base,
    body: { url: 'https://x.com' },
  });
  const r1 = await apiGate({ request: urlMode, env: env(), next: passThrough });
  expect(r1.status).toBe(403);
  expect((await r1.json()).error).toBe('turnstile_required');
  // {result} assembles without a captcha.
  const cheap = makeRequest({
    path: '/api/fix-prompt',
    headers: base,
    body: { result: { score: 1 } },
  });
  const r2 = await apiGate({ request: cheap, env: env(), next: passThrough });
  expect(r2.status).toBe(200);
  // {url} shares the scan bucket: an exhausted scan counter 429s it.
  const kv = makeKv({ 'rl:scan:9.9.9.1': '6' });
  const r3 = await apiGate({
    request: urlMode,
    env: { RATE_LIMIT: kv, TURNSTILE_SECRET: 'ts' },
    next: passThrough,
  });
  expect(r3.status).toBe(429);
});

test('fix-prompt {result} assembles cheap but still 429s past 20/min', async () => {
  const req = makeRequest({
    path: '/api/fix-prompt',
    headers: { 'CF-Connecting-IP': '9.9.9.3' },
    body: { result: { score: 1 } },
  });
  const kv = makeKv({ 'rl:fix-prompt:9.9.9.3': '20' });
  const res = await apiGate({ request: req, env: { RATE_LIMIT: kv }, next: passThrough });
  expect(res.status).toBe(429);
  expect((await res.json()).error).toBe('rate_limited');
});

test('GET /api/patterns is public and serves the live catalogue', async () => {
  const res = await patternsGet();
  expect(res.status).toBe(200);
  const j = await res.json();
  expect(typeof j.version).toBe('string');
  expect(j.count).toBe(j.patterns.length);
  expect(j.count).toBeGreaterThan(0);
});

test('aeo POST is gated AS a scan (Turnstile + shared bucket)', async () => {
  const base = { Origin: 'https://slop-detect.com', 'CF-Connecting-IP': '9.9.9.2' };
  const req = makeRequest({ path: '/api/aeo', headers: base, body: { url: 'https://x.com' } });
  const r1 = await apiGate({
    request: req,
    env: { RATE_LIMIT: makeKv(), TURNSTILE_SECRET: 'ts' },
    next: passThrough,
  });
  expect(r1.status).toBe(403);
  expect((await r1.json()).error).toBe('turnstile_required');
  const kv = makeKv({ 'rl:scan:9.9.9.2': '6' });
  const r2 = await apiGate({
    request: req,
    env: { RATE_LIMIT: kv, TURNSTILE_SECRET: 'ts' },
    next: passThrough,
  });
  expect(r2.status).toBe(429);
});

test('GET passes the middleware without auth (public reads)', async () => {
  const req = makeRequest({ method: 'GET', path: '/api/scan' });
  const res = await apiGate({ request: req, env: {}, next: passThrough });
  expect(res.status).toBe(200);
});

// ── Dashboard page: tampered cookie ──────────────────────────────────────────

test('dashboard: a tampered session cookie falls back to login, leaks nothing', async () => {
  const good = await signSession('agency@x.io', SECRET);
  const bad = good.slice(0, -1) + (good.endsWith('0') ? '1' : '0');
  const req = new Request('https://slop-detect.com/dashboard', {
    headers: { Cookie: `sd_session=${bad}` },
  });
  const res = await dashGet({ request: req, env: { RESULTS: makeKv(), SESSION_SECRET: SECRET } });
  expect(res.status).toBe(200);
  const html = await res.text();
  expect(html).toMatch(/Sign in to your dashboard/);
  expect(html.includes('agency@x.io'), 'no owner identity before auth').toBe(false);
});
