// Agency dashboard (P2b): HMAC sessions, magic-link tokens, the link endpoint's
// anti-enumeration guarantee, and the /dashboard page's auth + isolation.

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  signSession, verifySession, sessionCookie, clearSessionCookie, readSessionToken
} from '../functions/_session.js';
import {
  issueDashboardToken, consumeDashboardToken, listWatchesByEmail
} from '../functions/_shared.js';
import { buildDashboardLinkEmail } from '../functions/_alerts.js';
import { onRequestPost as linkPost } from '../functions/api/dashboard/link.js';
import { onRequestGet as dashGet } from '../functions/dashboard.js';

const SECRET = 'test-secret-0123456789';

function makeKv(seed = {}) {
  const store = new Map(Object.entries(seed).map(([k, v]) => [k, typeof v === 'string' ? { value: v } : v]));
  return {
    store,
    async get(k) { return store.has(k) ? store.get(k).value : null; },
    async put(k, v, o = {}) { store.set(k, { value: v, metadata: o.metadata }); },
    async delete(k) { store.delete(k); },
    async list({ prefix = '', limit = 1000 } = {}) {
      const keys = [...store.keys()].filter(n => n.startsWith(prefix)).slice(0, limit)
        .map(n => ({ name: n, metadata: store.get(n).metadata }));
      return { keys, list_complete: true };
    }
  };
}

const watch = (domain, email, over = {}) =>
  JSON.stringify({ domain, email, verified: true, lastScore: 8, lastGrade: 'A-', lastTier: 'Clean', ...over });

function getReq(url, cookie) {
  return { url, headers: { get: (k) => (k.toLowerCase() === 'cookie' ? (cookie || null) : null) } };
}
function postReq(body) {
  return { url: 'https://slop-detect.com/api/dashboard/link', json: async () => body };
}

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

// ── sessions ─────────────────────────────────────────────────────────────────
test('session round-trips; tampering, expiry, and wrong secret all reject', async () => {
  const tok = await signSession('a@x.io', SECRET);
  assert.equal(await verifySession(tok, SECRET), 'a@x.io');

  // Tampered signature.
  assert.equal(await verifySession(tok.slice(0, -2) + 'ff', SECRET), null);
  // Tampered payload (forge a different email, keep the old signature).
  const [, sig] = [tok.slice(0, tok.lastIndexOf('.')), tok.slice(tok.lastIndexOf('.') + 1)];
  const forged = btoa(JSON.stringify({ e: 'evil@x.io', x: Date.now() + 9e9 })).replace(/=+$/, '') + '.' + sig;
  assert.equal(await verifySession(forged, SECRET), null);
  // Expired.
  const old = await signSession('a@x.io', SECRET, { ttlMs: 1000, now: Date.now() - 5000 });
  assert.equal(await verifySession(old, SECRET), null);
  // Wrong secret.
  assert.equal(await verifySession(tok, 'other-secret'), null);
});

test('session cookie is HttpOnly+Secure and readable back off the request', async () => {
  const tok = await signSession('a@x.io', SECRET);
  const cookie = sessionCookie(tok);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.equal(readSessionToken(getReq('https://x/', cookie.split(';')[0])), tok);
  assert.match(clearSessionCookie(), /Max-Age=0/);
});

// ── tokens + per-email listing ───────────────────────────────────────────────
test('dashboard tokens are single-use', async () => {
  const kv = makeKv();
  const t = await issueDashboardToken(kv, 'a@x.io');
  assert.equal(await consumeDashboardToken(kv, t), 'a@x.io');
  assert.equal(await consumeDashboardToken(kv, t), null);
});

test('listWatchesByEmail returns only that owner, case-normalized', async () => {
  const kv = makeKv({
    'w:a.com': watch('a.com', 'agency@x.io'),
    'w:b.com': watch('b.com', 'agency@x.io'),
    'w:c.com': watch('c.com', 'other@y.io')
  });
  const mine = await listWatchesByEmail(kv, '  Agency@X.io ');
  assert.deepEqual(mine.map(w => w.domain).sort(), ['a.com', 'b.com']);
});

// ── /api/dashboard/link ──────────────────────────────────────────────────────
const LIVE_ENV = { RESEND_API_KEY: 'k', ALERT_FROM: 'a@slop-detect.com', SESSION_SECRET: SECRET };

test('link endpoint is configured-off without provider/secret', async () => {
  const res = await linkPost({ request: postReq({ email: 'a@x.io' }), env: { RESULTS: makeKv() } });
  assert.equal(res.status, 503);
});

test('link endpoint never reveals whether an email has watches (anti-enumeration)', async () => {
  const sent = [];
  globalThis.fetch = async (url, opts) => { sent.push(JSON.parse(opts.body)); return new Response('{}', { status: 200 }); };
  const kv = makeKv({ 'w:a.com': watch('a.com', 'known@x.io') });
  const env = { RESULTS: kv, ...LIVE_ENV };

  const r1 = await linkPost({ request: postReq({ email: 'known@x.io' }), env });
  const r2 = await linkPost({ request: postReq({ email: 'unknown@x.io' }), env });
  const [b1, b2] = [await r1.json(), await r2.json()];
  assert.equal(r1.status, r2.status);
  assert.deepEqual(b1, b2, 'identical bodies for known and unknown emails');

  // …but only the known email actually got a message, with a token link in it.
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to[0], 'known@x.io');
  assert.match(sent[0].text, /\/dashboard\?token=/);
});

test('dashboard link email copy: single-use, 15 minutes, privacy', () => {
  const m = buildDashboardLinkEmail('https://slop-detect.com/dashboard?token=abc', 3);
  assert.match(m.text, /token=abc/);
  assert.match(m.text, /single-use/);
  assert.match(m.text, /15 minutes/);
  assert.match(m.text, /privacy/i);
});

// ── /dashboard page ──────────────────────────────────────────────────────────
test('/dashboard is configured-off without SESSION_SECRET', async () => {
  const res = await dashGet({ request: getReq('https://slop-detect.com/dashboard'), env: { RESULTS: makeKv() } });
  assert.match(await res.text(), /not configured/i);
});

test('/dashboard without a cookie shows the login form, no domains', async () => {
  const kv = makeKv({ 'w:a.com': watch('a.com', 'agency@x.io') });
  const res = await dashGet({ request: getReq('https://slop-detect.com/dashboard'), env: { RESULTS: kv, SESSION_SECRET: SECRET } });
  const html = await res.text();
  assert.match(html, /Sign in to your dashboard/);
  assert.ok(!html.includes('a.com'), 'no domains before auth');
});

test('a valid magic-link token mints a session cookie and redirects clean', async () => {
  const kv = makeKv({ 'w:a.com': watch('a.com', 'agency@x.io') });
  const t = await issueDashboardToken(kv, 'agency@x.io');
  const res = await dashGet({
    request: getReq(`https://slop-detect.com/dashboard?token=${t}`),
    env: { RESULTS: kv, SESSION_SECRET: SECRET }
  });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('Location'), 'https://slop-detect.com/dashboard');
  const setCookie = res.headers.get('Set-Cookie');
  assert.match(setCookie, /sd_session=/);
  // The minted cookie verifies back to the email.
  const minted = setCookie.match(/sd_session=([^;]+)/)[1];
  assert.equal(await verifySession(minted, SECRET), 'agency@x.io');
  // And the token burned.
  assert.equal(await consumeDashboardToken(kv, t), null);
});

test('a bad/expired token falls back to login with an expiry note', async () => {
  const res = await dashGet({
    request: getReq('https://slop-detect.com/dashboard?token=nope'),
    env: { RESULTS: makeKv(), SESSION_SECRET: SECRET }
  });
  assert.match(await res.text(), /expired or was already used/i);
});

test('a signed-in agency sees ONLY its own domains — never another owner’s', async () => {
  const kv = makeKv({
    'w:a.com': watch('a.com', 'agency@x.io', { systemRegressed: true, lastSystemTier: 'Drifting' }),
    'w:b.com': watch('b.com', 'agency@x.io'),
    'w:secret.com': watch('secret.com', 'other@y.io')
  });
  const tok = await signSession('agency@x.io', SECRET);
  const res = await dashGet({
    request: getReq('https://slop-detect.com/dashboard', `sd_session=${tok}`),
    env: { RESULTS: kv, SESSION_SECRET: SECRET }
  });
  const html = await res.text();
  assert.match(html, /a\.com/);
  assert.match(html, /b\.com/);
  assert.match(html, /drifted/, 'drift flag surfaced');
  assert.match(html, /\/report\/a\.com/, 'per-domain report linked');
  assert.ok(!html.includes('secret.com'), 'another owner’s domain must never render');
  assert.ok(!html.includes('other@y.io'), 'another owner’s email must never render');
});

test('?logout=1 clears the cookie and returns to login', async () => {
  const res = await dashGet({
    request: getReq('https://slop-detect.com/dashboard?logout=1'),
    env: { RESULTS: makeKv(), SESSION_SECRET: SECRET }
  });
  assert.match(res.headers.get('Set-Cookie'), /Max-Age=0/);
  assert.match(await res.text(), /Sign in to your dashboard/);
});
