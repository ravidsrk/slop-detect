// Agency dashboard (P2b): HMAC sessions, magic-link tokens, the link endpoint's
// anti-enumeration guarantee, and the /dashboard page's auth + isolation.

import { test, expect, afterEach } from 'vitest';
import {
  signSession,
  verifySession,
  sessionCookie,
  clearSessionCookie,
  readSessionToken,
} from '../functions/_session.ts';
import {
  issueDashboardToken,
  consumeDashboardToken,
  listWatchesByEmail,
} from '../functions/_shared.ts';
import { buildDashboardLinkEmail } from '../functions/_alerts.ts';
import { onRequestPost as linkPost } from '../functions/api/dashboard/link.ts';
import { onRequestGet as dashGet } from '../functions/dashboard.tsx';

const SECRET = 'test-secret-0123456789';

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
      store.set(k, { value: v, metadata: o.metadata });
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

const watch = (domain, email, over = {}) =>
  JSON.stringify({
    domain,
    email,
    verified: true,
    lastScore: 8,
    lastGrade: 'A-',
    lastTier: 'Clean',
    ...over,
  });

function getReq(url, cookie) {
  return { url, headers: { get: (k) => (k.toLowerCase() === 'cookie' ? cookie || null : null) } };
}
function postReq(body) {
  return { url: 'https://slop-detect.com/api/dashboard/link', json: async () => body };
}

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

// ── sessions ─────────────────────────────────────────────────────────────────
test('session round-trips; tampering, expiry, and wrong secret all reject', async () => {
  const tok = await signSession('a@x.io', SECRET);
  expect(await verifySession(tok, SECRET)).toBe('a@x.io');

  // Tampered signature.
  expect(await verifySession(tok.slice(0, -2) + 'ff', SECRET)).toBe(null);
  // Tampered payload (forge a different email, keep the old signature).
  const [, sig] = [tok.slice(0, tok.lastIndexOf('.')), tok.slice(tok.lastIndexOf('.') + 1)];
  const forged =
    btoa(JSON.stringify({ e: 'evil@x.io', x: Date.now() + 9e9 })).replace(/=+$/, '') + '.' + sig;
  expect(await verifySession(forged, SECRET)).toBe(null);
  // Expired.
  const old = await signSession('a@x.io', SECRET, { ttlMs: 1000, now: Date.now() - 5000 });
  expect(await verifySession(old, SECRET)).toBe(null);
  // Wrong secret.
  expect(await verifySession(tok, 'other-secret')).toBe(null);
});

test('session cookie is HttpOnly+Secure and readable back off the request', async () => {
  const tok = await signSession('a@x.io', SECRET);
  const cookie = sessionCookie(tok);
  expect(cookie).toMatch(/HttpOnly/);
  expect(cookie).toMatch(/Secure/);
  expect(cookie).toMatch(/SameSite=Lax/);
  expect(readSessionToken(getReq('https://x/', cookie.split(';')[0]))).toBe(tok);
  expect(clearSessionCookie()).toMatch(/Max-Age=0/);
});

// ── tokens + per-email listing ───────────────────────────────────────────────
test('dashboard tokens are single-use', async () => {
  const kv = makeKv();
  const t = await issueDashboardToken(kv, 'a@x.io');
  expect(await consumeDashboardToken(kv, t)).toBe('a@x.io');
  expect(await consumeDashboardToken(kv, t)).toBe(null);
});

test('listWatchesByEmail returns only that owner, case-normalized', async () => {
  const kv = makeKv({
    'w:a.com': watch('a.com', 'agency@x.io'),
    'w:b.com': watch('b.com', 'agency@x.io'),
    'w:c.com': watch('c.com', 'other@y.io'),
  });
  const mine = await listWatchesByEmail(kv, '  Agency@X.io ');
  expect(mine.map((w) => w.domain).sort()).toEqual(['a.com', 'b.com']);
});

// ── /api/dashboard/link ──────────────────────────────────────────────────────
const LIVE_ENV = { RESEND_API_KEY: 'k', ALERT_FROM: 'a@slop-detect.com', SESSION_SECRET: SECRET };

test('link endpoint is configured-off without provider/secret', async () => {
  const res = await linkPost({ request: postReq({ email: 'a@x.io' }), env: { RESULTS: makeKv() } });
  expect(res.status).toBe(503);
});

test('link endpoint never reveals whether an email has watches (anti-enumeration)', async () => {
  const sent = [];
  globalThis.fetch = async (url, opts) => {
    sent.push(JSON.parse(opts.body));
    return new Response('{}', { status: 200 });
  };
  const kv = makeKv({ 'w:a.com': watch('a.com', 'known@x.io') });
  const env = { RESULTS: kv, ...LIVE_ENV };

  const r1 = await linkPost({ request: postReq({ email: 'known@x.io' }), env });
  const r2 = await linkPost({ request: postReq({ email: 'unknown@x.io' }), env });
  const [b1, b2] = [await r1.json(), await r2.json()];
  expect(r1.status).toBe(r2.status);
  expect(b1, 'identical bodies for known and unknown emails').toEqual(b2);

  // …but only the known email actually got a message, with a token link in it.
  expect(sent.length).toBe(1);
  expect(sent[0].to[0]).toBe('known@x.io');
  expect(sent[0].text).toMatch(/\/dashboard\?token=/);
});

test('link endpoint rate-limits magic-link sends per email (anti-bombing)', async () => {
  const sent = [];
  globalThis.fetch = async (_url, opts) => {
    sent.push(JSON.parse(opts.body));
    return new Response('{}', { status: 200 });
  };
  const kv = makeKv({ 'w:a.com': watch('a.com', 'known@x.io') });
  const env = { RESULTS: kv, RATE_LIMIT: kv, ...LIVE_ENV };

  for (let i = 0; i < 4; i++) {
    const res = await linkPost({ request: postReq({ email: 'known@x.io' }), env });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  }
  expect(sent.length).toBe(3);
});

test('dashboard link email copy: single-use, 15 minutes, privacy', () => {
  const m = buildDashboardLinkEmail('https://slop-detect.com/dashboard?token=abc', 3);
  expect(m.text).toMatch(/token=abc/);
  expect(m.text).toMatch(/single-use/);
  expect(m.text).toMatch(/15 minutes/);
  expect(m.text).toMatch(/privacy/i);
});

// ── /dashboard page ──────────────────────────────────────────────────────────
test('/dashboard is configured-off without SESSION_SECRET', async () => {
  const res = await dashGet({
    request: getReq('https://slop-detect.com/dashboard'),
    env: { RESULTS: makeKv() },
  });
  expect(await res.text()).toMatch(/not configured/i);
});

test('/dashboard without a cookie shows the login form, no domains', async () => {
  const kv = makeKv({ 'w:a.com': watch('a.com', 'agency@x.io') });
  const res = await dashGet({
    request: getReq('https://slop-detect.com/dashboard'),
    env: { RESULTS: kv, SESSION_SECRET: SECRET },
  });
  const html = await res.text();
  expect(html).toMatch(/Sign in to your dashboard/);
  expect(html.includes('a.com'), 'no domains before auth').toBeFalsy();
});

test('a valid magic-link token mints a session cookie and redirects clean', async () => {
  const kv = makeKv({ 'w:a.com': watch('a.com', 'agency@x.io') });
  const t = await issueDashboardToken(kv, 'agency@x.io');
  const res = await dashGet({
    request: getReq(`https://slop-detect.com/dashboard?token=${t}`),
    env: { RESULTS: kv, SESSION_SECRET: SECRET },
  });
  expect(res.status).toBe(302);
  expect(res.headers.get('Location')).toBe('https://slop-detect.com/dashboard');
  const setCookie = res.headers.get('Set-Cookie');
  expect(setCookie).toMatch(/sd_session=/);
  // The minted cookie verifies back to the email.
  const minted = setCookie.match(/sd_session=([^;]+)/)[1];
  expect(await verifySession(minted, SECRET)).toBe('agency@x.io');
  // And the token burned.
  expect(await consumeDashboardToken(kv, t)).toBe(null);
});

test('a bad/expired token falls back to login with an expiry note', async () => {
  const res = await dashGet({
    request: getReq('https://slop-detect.com/dashboard?token=nope'),
    env: { RESULTS: makeKv(), SESSION_SECRET: SECRET },
  });
  expect(await res.text()).toMatch(/expired or was already used/i);
});

test('a signed-in agency sees ONLY its own domains — never another owner’s', async () => {
  const kv = makeKv({
    'w:a.com': watch('a.com', 'agency@x.io', { systemRegressed: true, lastSystemTier: 'Drifting' }),
    'w:b.com': watch('b.com', 'agency@x.io'),
    'w:secret.com': watch('secret.com', 'other@y.io'),
  });
  const tok = await signSession('agency@x.io', SECRET);
  const res = await dashGet({
    request: getReq('https://slop-detect.com/dashboard', `sd_session=${tok}`),
    env: { RESULTS: kv, SESSION_SECRET: SECRET },
  });
  const html = await res.text();
  expect(html).toMatch(/a\.com/);
  expect(html).toMatch(/b\.com/);
  expect(html, 'drift flag surfaced').toMatch(/drifted/);
  expect(html, 'per-domain report linked').toMatch(/\/report\/a\.com/);
  expect(html.includes('secret.com'), 'another owner’s domain must never render').toBeFalsy();
  expect(html.includes('other@y.io'), 'another owner’s email must never render').toBeFalsy();
});

test('?logout=1 clears the cookie and returns to login', async () => {
  const res = await dashGet({
    request: getReq('https://slop-detect.com/dashboard?logout=1'),
    env: { RESULTS: makeKv(), SESSION_SECRET: SECRET },
  });
  expect(res.headers.get('Set-Cookie')).toMatch(/Max-Age=0/);
  expect(await res.text()).toMatch(/Sign in to your dashboard/);
});
