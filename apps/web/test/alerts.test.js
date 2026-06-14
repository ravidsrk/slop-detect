// Email sender + alert-copy builders + monitoring sweep + confirm flow.

import { test, expect } from 'vitest';
import { sendEmail, emailConfigured } from '../functions/_email.ts';
import { buildVerificationEmail, buildRegressionAlert } from '../functions/_alerts.ts';
import { monitorSweep } from '../functions/_sweep.ts';
import { issueWatchToken, consumeWatchToken, getWatch } from '../functions/_shared.ts';
import { onRequestGet as confirmGet } from '../functions/api/watch/confirm.tsx';

function makeKv(seed = {}) {
  const store = new Map(
    Object.entries(seed).map(([k, v]) => [k, typeof v === 'string' ? { value: v } : v])
  );
  return {
    store,
    async get(k) {
      return store.has(k) ? store.get(k).value : null;
    },
    async put(k, v, opts = {}) {
      store.set(k, { value: v, metadata: opts.metadata });
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

// ── email sender ─────────────────────────────────────────────────────────────
test('emailConfigured reflects RESEND_API_KEY + ALERT_FROM', () => {
  expect(emailConfigured({})).toBe(false);
  expect(emailConfigured({ RESEND_API_KEY: 'x' })).toBe(false);
  expect(emailConfigured({ RESEND_API_KEY: 'x', ALERT_FROM: 'a@b.com' })).toBe(true);
});

test('sendEmail no-ops (does not throw) when no provider is configured', async () => {
  let called = false;
  const r = await sendEmail({}, { to: 'a@b.com', subject: 's', text: 't' }, async () => {
    called = true;
    return new Response('', { status: 200 });
  });
  expect(r.sent).toBe(false);
  expect(r.reason).toBe('no_provider');
  expect(called, 'must not hit the network without a provider').toBe(false);
});

test('sendEmail posts to Resend when configured', async () => {
  const env = { RESEND_API_KEY: 'k', ALERT_FROM: 'Slop <a@slop-detect.com>' };
  let seen = null;
  const fetchImpl = async (url, init) => {
    seen = { url, body: JSON.parse(init.body), auth: init.headers.Authorization };
    return new Response(JSON.stringify({ id: 'em_1' }), { status: 200 });
  };
  const r = await sendEmail(env, { to: 'dev@x.io', subject: 'Hi', text: 'Body' }, fetchImpl);
  expect(r.sent).toBe(true);
  expect(r.id).toBe('em_1');
  expect(seen.url).toMatch(/api\.resend\.com/);
  expect(seen.body.to[0]).toBe('dev@x.io');
  expect(seen.auth).toBe('Bearer k');
});

test('sendEmail reports failure but does not throw on a non-2xx', async () => {
  const env = { RESEND_API_KEY: 'k', ALERT_FROM: 'a@b.com' };
  const r = await sendEmail(
    env,
    { to: 'd@x.io', subject: 's', text: 't' },
    async () => new Response('nope', { status: 422 })
  );
  expect(r.sent).toBe(false);
  expect(r.reason).toBe('http_422');
});

// ── copy builders ────────────────────────────────────────────────────────────
test('verification email carries the confirm link and a privacy line', () => {
  const m = buildVerificationEmail(
    'example.com',
    'https://slop-detect.com/api/watch/confirm?token=abc'
  );
  expect(m.subject).toMatch(/example\.com/);
  expect(m.text).toMatch(/confirm\?token=abc/);
  expect(m.text).toMatch(/privacy/i);
});

test('regression alert shows baseline vs now, tier drop, and unsubscribe', () => {
  const m = buildRegressionAlert(
    'example.com',
    { score: 8, grade: 'A-', tier: 'Clean' },
    { score: 30, grade: 'C', tier: 'Heavy' },
    { resultUrl: 'https://slop-detect.com/r/abc' }
  );
  expect(m.subject).toMatch(/example\.com/);
  expect(m.text).toMatch(/A-/);
  expect(m.text).toMatch(/Heavy/);
  expect(m.text).toMatch(/Clean → Heavy/);
  expect(m.text).toMatch(/\/r\/abc/);
  expect(m.text).toMatch(/unsubscribe/i);
});

// ── sweep logic ──────────────────────────────────────────────────────────────
function sweepHarness(watches) {
  const store = new Map(watches.map((w) => [w.domain, { ...w }]));
  const sent = [];
  return {
    store,
    sent,
    run: (opts = {}) =>
      monitorSweep({
        watches: [...store.values()],
        scanDomain: async () => {}, // scan is a no-op; we pre-set state
        getWatch: async (d) => store.get(d) || null,
        putWatch: async (w) => store.set(w.domain, w),
        sendAlert: async (w) => {
          sent.push(w.domain);
          return { sent: true };
        },
        ...opts,
      }),
  };
}

test('sweep alerts a verified, regressed, not-yet-notified domain exactly once', async () => {
  const h = sweepHarness([{ domain: 'a.com', verified: true, regressed: true, notified: false }]);
  const s1 = await h.run();
  expect(s1.alerted).toBe(1);
  expect(h.sent).toEqual(['a.com']);
  expect(h.store.get('a.com').notified).toBe(true);
  // Second sweep: already notified → no duplicate alert.
  const s2 = await h.run();
  expect(s2.alerted).toBe(0);
  expect(h.sent).toEqual(['a.com']);
});

test('sweep skips unverified domains (consent gate)', async () => {
  const h = sweepHarness([{ domain: 'a.com', verified: false, regressed: true, notified: false }]);
  const s = await h.run();
  expect(s.skippedUnverified).toBe(1);
  expect(s.alerted).toBe(0);
  expect(h.sent).toEqual([]);
});

test('sweep does not alert a verified domain that is not regressed', async () => {
  const h = sweepHarness([{ domain: 'a.com', verified: true, regressed: false, notified: false }]);
  const s = await h.run();
  expect(s.alerted).toBe(0);
});

test('sweep respects max and records errors without aborting', async () => {
  const watches = [
    { domain: 'a.com', verified: true, regressed: true, notified: false },
    { domain: 'b.com', verified: true, regressed: true, notified: false },
  ];
  const store = new Map(watches.map((w) => [w.domain, { ...w }]));
  const s = await monitorSweep({
    watches: [...store.values()],
    scanDomain: async (w) => {
      if (w.domain === 'a.com') throw new Error('scan failed');
    },
    getWatch: async (d) => store.get(d) || null,
    putWatch: async (w) => store.set(w.domain, w),
    sendAlert: async () => ({ sent: true }),
    max: 5,
  });
  expect(s.errors).toBe(1); // a.com threw
  expect(s.alerted).toBe(1); // b.com still alerted
});

// ── token + confirm flow ─────────────────────────────────────────────────────
test('issue/consume token is single-use', async () => {
  const kv = makeKv();
  const token = await issueWatchToken(kv, 'example.com');
  expect(token && token.length >= 16).toBeTruthy();
  expect(await consumeWatchToken(kv, token)).toBe('example.com');
  expect(await consumeWatchToken(kv, token), 'second use is rejected').toBe(null);
});

test('GET /api/watch/confirm flips the watch to verified', async () => {
  const kv = makeKv({
    'w:example.com': JSON.stringify({ domain: 'example.com', email: 'o@x.io', verified: false }),
  });
  const token = await issueWatchToken(kv, 'example.com');
  const res = await confirmGet({
    request: { url: `https://slop-detect.com/api/watch/confirm?token=${token}` },
    env: { RESULTS: kv },
  });
  expect(res.status).toBe(200);
  expect(await res.text()).toMatch(/all set/i);
  expect((await getWatch(kv, 'example.com')).verified).toBe(true);
});

test('GET /api/watch/confirm rejects a bad/expired token with 410', async () => {
  const kv = makeKv();
  const res = await confirmGet({
    request: { url: 'https://slop-detect.com/api/watch/confirm?token=nope' },
    env: { RESULTS: kv },
  });
  expect(res.status).toBe(410);
});
