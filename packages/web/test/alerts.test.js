// Email sender + alert-copy builders + monitoring sweep + confirm flow.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendEmail, emailConfigured } from '../functions/_email.js';
import { buildVerificationEmail, buildRegressionAlert } from '../functions/_alerts.js';
import { monitorSweep } from '../functions/_sweep.js';
import { issueWatchToken, consumeWatchToken, getWatch } from '../functions/_shared.js';
import { onRequestGet as confirmGet } from '../functions/api/watch/confirm.js';

function makeKv(seed = {}) {
  const store = new Map(Object.entries(seed).map(([k, v]) => [k, typeof v === 'string' ? { value: v } : v]));
  return {
    store,
    async get(k) { return store.has(k) ? store.get(k).value : null; },
    async put(k, v, opts = {}) { store.set(k, { value: v, metadata: opts.metadata }); },
    async delete(k) { store.delete(k); },
    async list({ prefix = '', limit = 1000 } = {}) {
      const keys = [...store.keys()].filter(n => n.startsWith(prefix)).slice(0, limit).map(n => ({ name: n, metadata: store.get(n).metadata }));
      return { keys, list_complete: true };
    }
  };
}

// ── email sender ─────────────────────────────────────────────────────────────
test('emailConfigured reflects RESEND_API_KEY + ALERT_FROM', () => {
  assert.equal(emailConfigured({}), false);
  assert.equal(emailConfigured({ RESEND_API_KEY: 'x' }), false);
  assert.equal(emailConfigured({ RESEND_API_KEY: 'x', ALERT_FROM: 'a@b.com' }), true);
});

test('sendEmail no-ops (does not throw) when no provider is configured', async () => {
  let called = false;
  const r = await sendEmail({}, { to: 'a@b.com', subject: 's', text: 't' }, async () => { called = true; return new Response('', { status: 200 }); });
  assert.equal(r.sent, false);
  assert.equal(r.reason, 'no_provider');
  assert.equal(called, false, 'must not hit the network without a provider');
});

test('sendEmail posts to Resend when configured', async () => {
  const env = { RESEND_API_KEY: 'k', ALERT_FROM: 'Slop <a@slop-detect.com>' };
  let seen = null;
  const fetchImpl = async (url, init) => {
    seen = { url, body: JSON.parse(init.body), auth: init.headers.Authorization };
    return new Response(JSON.stringify({ id: 'em_1' }), { status: 200 });
  };
  const r = await sendEmail(env, { to: 'dev@x.io', subject: 'Hi', text: 'Body' }, fetchImpl);
  assert.equal(r.sent, true);
  assert.equal(r.id, 'em_1');
  assert.match(seen.url, /api\.resend\.com/);
  assert.equal(seen.body.to[0], 'dev@x.io');
  assert.equal(seen.auth, 'Bearer k');
});

test('sendEmail reports failure but does not throw on a non-2xx', async () => {
  const env = { RESEND_API_KEY: 'k', ALERT_FROM: 'a@b.com' };
  const r = await sendEmail(env, { to: 'd@x.io', subject: 's', text: 't' }, async () => new Response('nope', { status: 422 }));
  assert.equal(r.sent, false);
  assert.equal(r.reason, 'http_422');
});

// ── copy builders ────────────────────────────────────────────────────────────
test('verification email carries the confirm link and a privacy line', () => {
  const m = buildVerificationEmail('example.com', 'https://slop-detect.com/api/watch/confirm?token=abc');
  assert.match(m.subject, /example\.com/);
  assert.match(m.text, /confirm\?token=abc/);
  assert.match(m.text, /privacy/i);
});

test('regression alert shows baseline vs now, tier drop, and unsubscribe', () => {
  const m = buildRegressionAlert('example.com',
    { score: 8, grade: 'A-', tier: 'Clean' },
    { score: 30, grade: 'C', tier: 'Heavy' },
    { resultUrl: 'https://slop-detect.com/r/abc' });
  assert.match(m.subject, /example\.com/);
  assert.match(m.text, /A-/);
  assert.match(m.text, /Heavy/);
  assert.match(m.text, /Clean → Heavy/);
  assert.match(m.text, /\/r\/abc/);
  assert.match(m.text, /unsubscribe/i);
});

// ── sweep logic ──────────────────────────────────────────────────────────────
function sweepHarness(watches) {
  const store = new Map(watches.map(w => [w.domain, { ...w }]));
  const sent = [];
  return {
    store, sent,
    run: (opts = {}) => monitorSweep({
      watches: [...store.values()],
      scanDomain: async () => {},                       // scan is a no-op; we pre-set state
      getWatch: async (d) => store.get(d) || null,
      putWatch: async (w) => store.set(w.domain, w),
      sendAlert: async (w) => { sent.push(w.domain); return { sent: true }; },
      ...opts
    })
  };
}

test('sweep alerts a verified, regressed, not-yet-notified domain exactly once', async () => {
  const h = sweepHarness([{ domain: 'a.com', verified: true, regressed: true, notified: false }]);
  const s1 = await h.run();
  assert.equal(s1.alerted, 1);
  assert.deepEqual(h.sent, ['a.com']);
  assert.equal(h.store.get('a.com').notified, true);
  // Second sweep: already notified → no duplicate alert.
  const s2 = await h.run();
  assert.equal(s2.alerted, 0);
  assert.deepEqual(h.sent, ['a.com']);
});

test('sweep skips unverified domains (consent gate)', async () => {
  const h = sweepHarness([{ domain: 'a.com', verified: false, regressed: true, notified: false }]);
  const s = await h.run();
  assert.equal(s.skippedUnverified, 1);
  assert.equal(s.alerted, 0);
  assert.deepEqual(h.sent, []);
});

test('sweep does not alert a verified domain that is not regressed', async () => {
  const h = sweepHarness([{ domain: 'a.com', verified: true, regressed: false, notified: false }]);
  const s = await h.run();
  assert.equal(s.alerted, 0);
});

test('sweep respects max and records errors without aborting', async () => {
  const watches = [
    { domain: 'a.com', verified: true, regressed: true, notified: false },
    { domain: 'b.com', verified: true, regressed: true, notified: false }
  ];
  const store = new Map(watches.map(w => [w.domain, { ...w }]));
  const s = await monitorSweep({
    watches: [...store.values()],
    scanDomain: async (w) => { if (w.domain === 'a.com') throw new Error('scan failed'); },
    getWatch: async (d) => store.get(d) || null,
    putWatch: async (w) => store.set(w.domain, w),
    sendAlert: async () => ({ sent: true }),
    max: 5
  });
  assert.equal(s.errors, 1);          // a.com threw
  assert.equal(s.alerted, 1);         // b.com still alerted
});

// ── token + confirm flow ─────────────────────────────────────────────────────
test('issue/consume token is single-use', async () => {
  const kv = makeKv();
  const token = await issueWatchToken(kv, 'example.com');
  assert.ok(token && token.length >= 16);
  assert.equal(await consumeWatchToken(kv, token), 'example.com');
  assert.equal(await consumeWatchToken(kv, token), null, 'second use is rejected');
});

test('GET /api/watch/confirm flips the watch to verified', async () => {
  const kv = makeKv({ 'w:example.com': JSON.stringify({ domain: 'example.com', email: 'o@x.io', verified: false }) });
  const token = await issueWatchToken(kv, 'example.com');
  const res = await confirmGet({ request: { url: `https://slop-detect.com/api/watch/confirm?token=${token}` }, env: { RESULTS: kv } });
  assert.equal(res.status, 200);
  assert.match(await res.text(), /all set/i);
  assert.equal((await getWatch(kv, 'example.com')).verified, true);
});

test('GET /api/watch/confirm rejects a bad/expired token with 410', async () => {
  const kv = makeKv();
  const res = await confirmGet({ request: { url: 'https://slop-detect.com/api/watch/confirm?token=nope' }, env: { RESULTS: kv } });
  assert.equal(res.status, 410);
});
