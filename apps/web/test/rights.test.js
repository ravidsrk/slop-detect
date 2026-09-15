// T-32: self-serve export/erasure (G-17) + retention doc (G-35). Session
// cookie proves email ownership; erasure is per-domain ownership-checked,
// idempotent, and clears the session. Anonymous scan artifacts are
// unattributable and must survive an erase untouched.

import { test, expect } from 'vitest';
import { onRequestGet as exportGet } from '../functions/api/me/export.ts';
import { onRequestPost as erasePost } from '../functions/api/me/erase.ts';
import {
  putWatch,
  getWatch,
  getListing,
  addToEmailIndex,
  setListing,
  addSuppression,
  isSuppressed,
  getEmailDomains,
} from '../functions/_shared.ts';
import { signSession, isForeignOrigin } from '../functions/_session.ts';

const SECRET = 'test-session-secret';
const EMAIL = 'owner@acme.example.com';
const OTHER = 'stranger@example.com';

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

async function seedAccount(kv, email, domains) {
  for (const domain of domains) {
    await putWatch(kv, {
      domain,
      email,
      verified: true,
      listed: true,
      consentAt: '2026-09-01T00:00:00.000Z',
      policyVersion: '2026.06',
    });
    await addToEmailIndex(kv, email, domain);
    await setListing(kv, { domain, score: 12, grade: 'B', tier: 'Mild', id: `r-${domain}` });
  }
}

async function authed(email, secret = SECRET, extraHeaders = {}) {
  const token = await signSession(email, secret);
  const headers = new Headers({ Cookie: `sd_session=${token}`, ...extraHeaders });
  return { headers, url: 'https://slop-detect.com/api/me/x', json: async () => ({ email }) };
}

const env = (kv) => ({ RESULTS: kv, SESSION_SECRET: SECRET });

// ── Export ───────────────────────────────────────────────────────────────────

test('export returns every email-bound record as a JSON download', async () => {
  const kv = makeKv();
  await seedAccount(kv, EMAIL, ['a.example.com', 'b.example.com']);
  await addSuppression(kv, EMAIL, 'bounced');
  const res = await exportGet({ request: await authed(EMAIL), env: env(kv) });
  expect(res.status).toBe(200);
  expect(res.headers.get('Content-Disposition')).toMatch(
    /^attachment; filename="slop-detect-export-/
  );
  const body = await res.json();
  expect(body.email).toBe(EMAIL);
  expect(body.watches.map((w) => w.domain).sort()).toEqual(['a.example.com', 'b.example.com']);
  expect(body.watches[0].consentAt).toBeTruthy();
  expect(Object.keys(body.listings).sort()).toEqual(['a.example.com', 'b.example.com']);
  expect(body.emailIndex.sort()).toEqual(['a.example.com', 'b.example.com']);
  expect(body.suppression).toMatchObject({ reason: 'bounced' });
  expect(body.notes.join('\n')).toMatch(/cannot be attributed/);
});

test('export rejects missing, forged, and expired sessions with 401', async () => {
  const kv = makeKv();
  const anon = await exportGet({
    request: { headers: new Headers(), url: 'https://slop-detect.com/api/me/export' },
    env: env(kv),
  });
  expect(anon.status).toBe(401);
  const forged = await exportGet({ request: await authed(EMAIL, 'wrong-secret'), env: env(kv) });
  expect(forged.status).toBe(401);
  const expiredToken = await signSession(EMAIL, SECRET, { ttlMs: -1000 });
  const expired = await exportGet({
    request: {
      headers: new Headers({ Cookie: `sd_session=${expiredToken}` }),
      url: 'https://slop-detect.com/api/me/export',
    },
    env: env(kv),
  });
  expect(expired.status).toBe(401);
});

test('same-origin check: foreign Origin/Referer rejected, absent allowed', async () => {
  const kv = makeKv();
  const foreign = await exportGet({
    request: await authed(EMAIL, SECRET, { Origin: 'https://evil.example' }),
    env: env(kv),
  });
  expect(foreign.status).toBe(403);
  const foreignRef = await exportGet({
    request: await authed(EMAIL, SECRET, { Referer: 'https://evil.example/p' }),
    env: env(kv),
  });
  expect(foreignRef.status).toBe(403);
  const same = await exportGet({
    request: await authed(EMAIL, SECRET, { Origin: 'https://slop-detect.com' }),
    env: env(kv),
  });
  expect(same.status).toBe(200);
  expect(
    isForeignOrigin({ headers: new Headers(), url: 'https://slop-detect.com/api/me/export' })
  ).toBe(false);
});

test('export without storage or secret is 503, not a throw', async () => {
  const res = await exportGet({ request: await authed(EMAIL), env: {} });
  expect(res.status).toBe(503);
});

// ── Erasure ──────────────────────────────────────────────────────────────────

test('erase deletes all email-bound records, clears suppression + cookie, and is idempotent', async () => {
  const kv = makeKv();
  await seedAccount(kv, EMAIL, ['a.example.com', 'b.example.com']);
  await addSuppression(kv, EMAIL, 'complained');
  const req = await authed(EMAIL);
  const res = await erasePost({ request: req, env: env(kv) });
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ erased: 2, staleDomains: 0, suppressionCleared: true });
  expect(res.headers.get('Set-Cookie')).toMatch(/sd_session=;/);
  for (const d of ['a.example.com', 'b.example.com']) {
    expect(await getWatch(kv, d)).toBeNull();
    expect(await getListing(kv, d)).toBeNull();
  }
  expect(await getEmailDomains(kv, EMAIL)).toEqual([]);
  expect(await isSuppressed(kv, EMAIL)).toBe(false);
  // Replay: zeros, still 200.
  const replay = await erasePost({ request: await authed(EMAIL), env: env(kv) });
  expect(replay.status).toBe(200);
  expect(await replay.json()).toMatchObject({ erased: 0, suppressionCleared: false });
});

test('erase requires the body email to echo the session (fat-finger guard)', async () => {
  const kv = makeKv();
  await seedAccount(kv, EMAIL, ['a.example.com']);
  const req = await authed(EMAIL);
  req.json = async () => ({ email: OTHER });
  const res = await erasePost({ request: req, env: env(kv) });
  expect(res.status).toBe(400);
  expect(await getWatch(kv, 'a.example.com')).toBeTruthy();
  const empty = await authed(EMAIL);
  empty.json = async () => ({});
  expect((await erasePost({ request: empty, env: env(kv) })).status).toBe(400);
});

test('erase never touches a watch that moved to another email (stale index)', async () => {
  const kv = makeKv();
  await seedAccount(kv, EMAIL, ['mine.example.com']);
  // Stale entry: EMAIL's index claims moved.example.com, but the watch belongs to OTHER.
  await putWatch(kv, { domain: 'moved.example.com', email: OTHER, verified: true });
  await addToEmailIndex(kv, EMAIL, 'moved.example.com');
  const res = await erasePost({ request: await authed(EMAIL), env: env(kv) });
  expect(await res.json()).toMatchObject({ erased: 1, staleDomains: 1 });
  expect(await getWatch(kv, 'mine.example.com')).toBeNull();
  const kept = await getWatch(kv, 'moved.example.com');
  expect(kept && kept.email).toBe(OTHER);
  expect(await getEmailDomains(kv, EMAIL)).toEqual([]);
});

test('erase leaves anonymous scan artifacts and other users untouched', async () => {
  const kv = makeKv();
  await seedAccount(kv, EMAIL, ['gone.example.com']);
  await seedAccount(kv, OTHER, ['stays.example.com']);
  kv.store.set('r:abc', JSON.stringify({ id: 'abc', domain: 'gone.example.com', score: 42 }));
  kv.store.set('d:gone.example.com', 'abc');
  kv.store.set('h:gone.example.com', JSON.stringify([{ id: 'abc', score: 42 }]));
  await erasePost({ request: await authed(EMAIL), env: env(kv) });
  expect(kv.store.get('r:abc')).toBeTruthy();
  expect(kv.store.get('d:gone.example.com')).toBe('abc');
  expect(kv.store.get('h:gone.example.com')).toBeTruthy();
  expect(await getWatch(kv, 'stays.example.com')).toBeTruthy();
  expect(await getEmailDomains(kv, OTHER)).toEqual(['stays.example.com']);
});

test('erase rejects anonymous, foreign-origin, and unconfigured requests', async () => {
  const kv = makeKv();
  const anon = await erasePost({
    request: { headers: new Headers(), url: 'https://x/api/me/erase', json: async () => ({}) },
    env: env(kv),
  });
  expect(anon.status).toBe(401);
  const foreign = await erasePost({
    request: await authed(EMAIL, SECRET, { Origin: 'https://evil.example' }),
    env: env(kv),
  });
  expect(foreign.status).toBe(403);
  const noKv = await erasePost({ request: await authed(EMAIL), env: {} });
  expect(noKv.status).toBe(503);
});
