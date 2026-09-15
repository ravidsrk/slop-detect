// T-35: flow analytics (G-32). Named funnel counters per critical flow in a
// dedicated daily blob (`stats:flows:YYYY-MM-DD`), exposed via /api/stats
// `flows`, aggregate-only (fixed allowlist — no identifiers can enter).
// CF-02 (CLI) and CF-06 (MCP) run locally and are server-unobservable by
// design; CLI --remote/API use counts as ordinary scan-route traffic.

import { test, expect, afterEach } from 'vitest';
import {
  mergeFlowBlob,
  bumpFlowStats,
  getFlowStats,
  deferFlowBump,
  flowDateKey,
  putWatch,
  getWatch,
  recordScanForWatch,
  issueWatchToken,
  issueDashboardToken,
} from '../functions/_shared.ts';
import { scanFlowEvent, onRequestPost as scanPost } from '../functions/api/scan.ts';
import { onRequestPost as fixPost } from '../functions/api/fix-prompt.ts';
import { onRequestPost as watchPost } from '../functions/api/watch.ts';
import { onRequestGet as confirmGet } from '../functions/api/watch/confirm.tsx';
import { onRequestPost as sweepPost } from '../functions/api/cron/sweep.ts';
import { onRequestPost as linkPost } from '../functions/api/dashboard/link.ts';
import { onRequestGet as dashGet } from '../functions/dashboard.tsx';
import { onRequestGet as statsGet } from '../functions/api/stats.ts';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

// Detached (non-waitUntil) bumps resolve on microtasks; flush before asserting.
const flush = () => new Promise((r) => setTimeout(r, 15));

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
    async list({ prefix = '' } = {}) {
      const keys = [...store.keys()].filter((n) => n.startsWith(prefix)).map((name) => ({ name }));
      return { keys, list_complete: true };
    },
  };
}

async function flowBlob(kv) {
  const raw = await kv.get(flowDateKey());
  return raw ? JSON.parse(raw).flows : null;
}

// ── Core ─────────────────────────────────────────────────────────────────────

test('merge is pure: accumulates per flow/event, batches counts', () => {
  let b = mergeFlowBlob(null, 'watch', 'subscribed');
  b = mergeFlowBlob(b, 'watch', 'subscribed', 4);
  b = mergeFlowBlob(b, 'watch', 'confirmed');
  expect(b.flows).toEqual({ watch: { subscribed: 5, confirmed: 1 } });
  // Corrupt/foreign blobs restart rather than crash.
  expect(mergeFlowBlob({ nope: 1 }, 'scan', 'completed').flows).toEqual({ scan: { completed: 1 } });
  // Greptile P2 on PR #183: arrays pass typeof checks but swallow named
  // props in JSON.stringify — reset them (and non-number counters) instead
  // of reporting success into a blob that stays unreadable.
  expect(mergeFlowBlob({ flows: [] }, 'scan', 'completed').flows).toEqual({
    scan: { completed: 1 },
  });
  expect(mergeFlowBlob({ flows: { scan: [] } }, 'scan', 'completed').flows).toEqual({
    scan: { completed: 1 },
  });
  expect(mergeFlowBlob({ flows: { scan: { completed: 'x' } } }, 'scan', 'completed').flows).toEqual(
    { scan: { completed: 1 } }
  );
});

test('bump validates names and counts; rejects without writing', async () => {
  const kv = makeKv();
  expect(await bumpFlowStats(kv, 'watch', 'subscribed')).toBe(true);
  expect(await bumpFlowStats(kv, 'watch', 'nope')).toBe(false);
  expect(await bumpFlowStats(kv, 'evil', 'subscribed')).toBe(false);
  expect(await bumpFlowStats(kv, 'watch', 'subscribed', 0)).toBe(false);
  expect(await bumpFlowStats(kv, 'watch', 'subscribed', -2)).toBe(false);
  expect(await bumpFlowStats(null, 'watch', 'subscribed')).toBe(false);
  expect(await flowBlob(kv)).toEqual({ watch: { subscribed: 1 } });
});

test('getFlowStats returns today + yesterday; corrupt day reads null', async () => {
  const kv = makeKv();
  expect(await getFlowStats(kv)).toEqual({ today: null, yesterday: null });
  await bumpFlowStats(kv, 'scan', 'completed');
  const stats = await getFlowStats(kv);
  expect(stats.today.flows).toEqual({ scan: { completed: 1 } });
  expect(stats.yesterday).toBeNull();
  kv.store.set(flowDateKey(), '{corrupt');
  expect((await getFlowStats(kv)).today).toBeNull();
  kv.store.set(flowDateKey(), JSON.stringify({ date: 'x', flows: [] }));
  expect((await getFlowStats(kv)).today).toBeNull();
});

test('deferFlowBump never throws, even on a throwing KV or null env', async () => {
  const throwing = {
    async get() {
      throw new Error('down');
    },
    async put() {
      throw new Error('down');
    },
  };
  expect(() => deferFlowBump({ RESULTS: throwing }, 'scan', 'completed')).not.toThrow();
  expect(() => deferFlowBump(null, 'scan', 'completed')).not.toThrow();
  expect(() => deferFlowBump({}, 'nope', 'nope')).not.toThrow();
  await flush();
});

// ── Scan ─────────────────────────────────────────────────────────────────────

test('scanFlowEvent classifies every patch shape exactly once', () => {
  expect(scanFlowEvent({ status: 200 })).toBe('completed');
  expect(scanFlowEvent({ status: 200, tier: 'Clean', navMs: 5 })).toBe('completed');
  expect(scanFlowEvent({ status: 422, blocked: 'bot-wall' })).toBe('blocked');
  expect(scanFlowEvent({ status: 400 })).toBe('failed');
  expect(scanFlowEvent({ status: 500 })).toBe('failed');
  expect(scanFlowEvent({ status: 502 })).toBe('failed');
  expect(scanFlowEvent({})).toBe('failed');
  expect(scanFlowEvent(null)).toBe('failed');
});

test('scan route bumps failed on bad JSON; share:false writes nothing (privacy)', async () => {
  const kv = makeKv();
  const bad = await scanPost({
    request: {
      url: 'https://x/api/scan',
      headers: { get: () => null },
      json: async () => {
        throw new Error('nope');
      },
    },
    env: { BROWSER: {}, RESULTS: kv },
  });
  expect(bad.status).toBe(400);
  await flush();
  expect(await flowBlob(kv)).toEqual({ scan: { failed: 1 } });

  // share:false with no BROWSER takes the pre-parse branch — and must not bump.
  const kv2 = makeKv();
  const res = await scanPost({
    request: {
      url: 'https://x/api/scan',
      headers: { get: () => null },
      json: async () => ({ url: 'https://acme.example.com', share: false }),
    },
    env: { RESULTS: kv2 },
  });
  expect(res.status).toBe(500);
  await flush();
  expect(kv2.store.has(flowDateKey())).toBe(false);
});

// ── Fix prompt ───────────────────────────────────────────────────────────────

const tinyResult = {
  url: 'https://private-customer.example.com/page?token=abc',
  score: 30,
  tier: 'Heavy',
  patterns: [],
};

test('fixprompt.assembled fires on result mode (no scan)', async () => {
  const kv = makeKv();
  const res = await fixPost({
    request: {
      url: 'https://x/api/fix-prompt',
      headers: { get: () => null },
      json: async () => ({ result: tinyResult }),
    },
    env: { RESULTS: kv },
  });
  expect(res.status).toBe(200);
  await flush();
  expect(await flowBlob(kv)).toEqual({ fixprompt: { assembled: 1 } });
});

test('fixprompt.scanned fires on url mode (scan stubbed)', async () => {
  const kv = makeKv();
  const scanImpl = async () => new Response(JSON.stringify(tinyResult));
  const res = await fixPost({
    request: {
      url: 'https://x/api/fix-prompt',
      headers: { get: () => null },
      json: async () => ({ url: 'https://acme.example.com' }),
    },
    env: { RESULTS: kv },
    scanImpl,
  });
  expect(res.status).toBe(200);
  await flush();
  expect(await flowBlob(kv)).toEqual({ fixprompt: { scanned: 1 } });
});

// ── Watch funnel ─────────────────────────────────────────────────────────────

const watchReq = (body) => ({ url: 'https://slop-detect.com/api/watch', json: async () => body });

test('watch funnel: subscribed once, confirmed, unsubscribed (re-POSTs excluded)', async () => {
  const kv = makeKv();
  const env = { RESULTS: kv, RATE_LIMIT: makeKv() };
  const sub = await watchPost({
    request: watchReq({ domain: 'funnel.example.com', email: 'owner@funnel.example.com' }),
    env,
  });
  expect(sub.status).toBe(201);
  // Idempotent re-POST is an update, not a funnel add.
  await watchPost({
    request: watchReq({ domain: 'funnel.example.com', email: 'owner@funnel.example.com' }),
    env,
  });
  const token = await issueWatchToken(kv, 'funnel.example.com');
  const conf = await confirmGet({
    request: { url: `https://slop-detect.com/api/watch/confirm?token=${token}` },
    env,
  });
  expect(conf.status).toBe(200);
  const unsub = await watchPost({
    request: watchReq({
      domain: 'funnel.example.com',
      email: 'owner@funnel.example.com',
      unsubscribe: true,
    }),
    env,
  });
  expect((await unsub.json()).unsubscribed).toBe(true);
  await flush();
  expect(await flowBlob(kv)).toEqual({
    watch: { subscribed: 1, confirmed: 1, unsubscribed: 1 },
  });
  // Second unsubscribe finds no watch: unsubscribed:false, no second event
  // (greptile P2 on PR #183 — the event is gated on actual removal).
  const again = await watchPost({
    request: watchReq({
      domain: 'funnel.example.com',
      email: 'owner@funnel.example.com',
      unsubscribe: true,
    }),
    env,
  });
  expect((await again.json()).unsubscribed).toBe(false);
  await flush();
  expect((await flowBlob(kv)).watch.unsubscribed).toBe(1);
});

test('one-click unsubscribe counts as churn once; replays emit nothing', async () => {
  const kv = makeKv();
  const SECRET = 'one-click-secret';
  const { signUnsubscribe } = await import('../functions/_session.ts');
  const { onRequestPost: unsubPost } = await import('../functions/api/watch/unsubscribe.tsx');
  await putWatch(kv, {
    domain: 'click.example.com',
    email: 'owner@click.example.com',
    verified: true,
  });
  const token = await signUnsubscribe('click.example.com', 'owner@click.example.com', SECRET);
  const env = { RESULTS: kv, SESSION_SECRET: SECRET };
  const req = () => ({
    url: `https://slop-detect.com/api/watch/unsubscribe?token=${token}`,
    headers: { get: () => null },
  });
  expect((await unsubPost({ request: req(), env })).status).toBe(200);
  expect((await unsubPost({ request: req(), env })).status).toBe(200);
  await flush();
  expect(await flowBlob(kv)).toEqual({ watch: { unsubscribed: 1 } });
});

test('sweep batches alerted counts into one flow event', async () => {
  const kv = makeKv();
  const CRON = 'test-cron';
  // Verified watch with a Clean baseline; the stub scan regresses to Heavy.
  await putWatch(kv, {
    domain: 'sweep.example.com',
    email: 'owner@sweep.example.com',
    verified: true,
    baselineScore: 5,
    baselineGrade: 'A',
    baselineTier: 'Clean',
  });
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u.includes('api.resend.com')) return new Response(JSON.stringify({ id: 'e1' }));
    if (u.endsWith('/api/scan')) {
      await recordScanForWatch(kv, {
        domain: 'sweep.example.com',
        score: 40,
        tier: 'Heavy',
        grade: 'F',
        id: 'scan-x',
        createdAt: new Date().toISOString(),
      });
      return new Response(JSON.stringify({ ok: true }));
    }
    throw new Error(`unexpected fetch to ${u}`);
  };
  const res = await sweepPost({
    request: {
      url: 'https://slop-detect.com/api/cron/sweep',
      headers: { get: (k) => (k.toLowerCase() === 'authorization' ? `Bearer ${CRON}` : null) },
    },
    env: {
      RESULTS: kv,
      CRON_SECRET: CRON,
      INTERNAL_API_KEY: 'k',
      RESEND_API_KEY: 're_test',
      ALERT_FROM: 'a@b.c',
      SESSION_SECRET: 's',
      MAIL_POSTAL_ADDRESS: '123 Example St',
    },
  });
  expect((await res.json()).alerted).toBe(1);
  await flush();
  expect((await flowBlob(kv)).watch.alerted).toBe(1);
});

// ── Dashboard funnel ─────────────────────────────────────────────────────────

test('dashboard funnel: link_sent then session_minted (known emails only)', async () => {
  const kv = makeKv();
  const SECRET = 'dash-secret';
  globalThis.fetch = async () => new Response(JSON.stringify({ id: 'e1' }));
  const env = {
    RESULTS: kv,
    RATE_LIMIT: makeKv(),
    RESEND_API_KEY: 'k',
    ALERT_FROM: 'a@b.c',
    SESSION_SECRET: SECRET,
  };
  await putWatch(kv, { domain: 'd.example.com', email: 'owner@dash.example.com', verified: true });
  const { addToEmailIndex } = await import('../functions/_shared.ts');
  await addToEmailIndex(kv, 'owner@dash.example.com', 'd.example.com');
  const link = await linkPost({
    request: {
      url: 'https://slop-detect.com/api/dashboard/link',
      json: async () => ({ email: 'owner@dash.example.com' }),
    },
    env,
  });
  expect(link.status).toBe(200);
  // Unknown addresses get the identical 200 but no send — and no event.
  await linkPost({
    request: {
      url: 'https://slop-detect.com/api/dashboard/link',
      json: async () => ({ email: 'nobody@dash.example.com' }),
    },
    env,
  });
  const token = await issueDashboardToken(kv, 'owner@dash.example.com');
  const dash = await dashGet({
    request: {
      url: `https://slop-detect.com/dashboard?token=${token}`,
      headers: { get: () => null },
    },
    env,
  });
  expect(dash.status).toBe(302);
  await flush();
  expect(await flowBlob(kv)).toEqual({ dashboard: { link_sent: 1, session_minted: 1 } });
});

// ── Exposure + privacy ───────────────────────────────────────────────────────

test('/api/stats exposes flows alongside ops; empty store reads null', async () => {
  const kv = makeKv();
  const empty = await statsGet({ env: { RESULTS: kv } });
  expect((await empty.json()).flows).toEqual({ today: null, yesterday: null });
  await bumpFlowStats(kv, 'watch', 'subscribed', 3);
  const full = await statsGet({ env: { RESULTS: kv } });
  const body = await full.json();
  expect(body.flows.today.flows).toEqual({ watch: { subscribed: 3 } });
  expect(body.ops).toBeTruthy();
  const noKv = await statsGet({ env: {} });
  expect((await noKv.json()).flows).toEqual({ today: null, yesterday: null });
});

test('flow blobs carry counts only — no emails, domains, or URLs can enter', async () => {
  const kv = makeKv();
  const env = { RESULTS: kv, RATE_LIMIT: makeKv() };
  await watchPost({
    request: watchReq({
      domain: 'secret-customer.example.com',
      email: 'ceo@secret-customer.example.com',
    }),
    env,
  });
  await fixPost({
    request: {
      url: 'https://x/api/fix-prompt',
      headers: { get: () => null },
      json: async () => ({ result: tinyResult }),
    },
    env,
  });
  await flush();
  const raw = await kv.get(flowDateKey());
  expect(raw).toBeTruthy();
  expect(raw).not.toMatch(/@/);
  expect(raw).not.toMatch(/example\.com/);
  expect(raw).not.toMatch(/token=abc/);
  expect(raw).not.toMatch(/http/);
  // And the allowlist rejects identifier-shaped names at the gate.
  expect(await bumpFlowStats(kv, 'watch', 'ceo@x.io')).toBe(false);
});
