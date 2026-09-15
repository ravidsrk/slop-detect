// T-31: mail-compliance guard (CAN-SPAM footer + RFC 8058 one-click +
// bounce suppression). G-16: postal + 1-click unsub + honor path. G-46:
// bounce handling. All flows run against in-memory KV — no Resend, no net.

import { test, expect } from 'vitest';
import {
  mailFooter,
  buildVerificationEmail,
  buildRegressionAlert,
  buildDriftAlert,
  buildDashboardLinkEmail,
} from '../functions/_alerts.ts';
import {
  signUnsubscribe,
  verifyUnsubscribe,
  unsubscribeUrl,
  signSession,
} from '../functions/_session.ts';
import { sendEmail } from '../functions/_email.ts';
import { isSuppressed } from '../functions/_shared.ts';
import {
  onRequestGet as unsubGet,
  onRequestPost as unsubPost,
} from '../functions/api/watch/unsubscribe.tsx';
import { onRequestPost as webhookPost } from '../functions/api/email/webhook.ts';

const SECRET = 'test-session-secret- long enough';
const POSTAL = '123 Example St, Springfield IL 62701';
const DOMAIN = 'acme.example.com';
const EMAIL = 'owner@acme.example.com';

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
  };
}

function seedWatch(kv, { email = EMAIL, listed = true } = {}) {
  const watch = {
    domain: DOMAIN,
    email,
    verified: true,
    listed,
    consentAt: '2026-09-01T00:00:00.000Z',
    policyVersion: '2026.06',
  };
  kv.store.set(`w:${DOMAIN}`, JSON.stringify(watch));
  if (listed) kv.store.set(`l:${DOMAIN}`, JSON.stringify({ domain: DOMAIN, score: 12 }));
  return watch;
}

function req(url, method = 'GET') {
  return new Request(url, { method });
}

// ── Footer ───────────────────────────────────────────────────────────────────

test('alert footer carries postal, one-click URL, and privacy link', () => {
  const footer = mailFooter({ postal: POSTAL, unsubUrl: 'https://x/unsub?token=t' });
  const text = footer.join('\n');
  expect(text).toContain(POSTAL);
  expect(text).toContain('https://x/unsub?token=t');
  expect(text).toContain('one click');
  expect(text).toContain('/privacy.md');
});

test('transactional footer has postal but no unsubscribe line', () => {
  const text = mailFooter({ postal: POSTAL }).join('\n');
  expect(text).toContain(POSTAL);
  expect(text).not.toMatch(/unsub/i);
});

test('missing postal degrades to a bare brand line (caller reports mail_postal_missing)', () => {
  const text = mailFooter({}).join('\n');
  expect(text).toContain('Slop Detector');
  expect(text).toContain('/privacy.md');
});

test('alert builders thread the footer; the false reply-to-unsubscribe promise is gone', () => {
  const footer = mailFooter({ postal: POSTAL, unsubUrl: 'https://x/u' });
  const base = { score: 10, grade: 'B', tier: 'Clean' };
  const cur = { score: 40, grade: 'F', tier: 'Heavy' };
  for (const msg of [
    buildRegressionAlert(DOMAIN, base, cur, { footer }),
    buildDriftAlert(DOMAIN, base, cur, [], { footer }),
  ]) {
    expect(msg.text).toContain(POSTAL);
    expect(msg.text).toContain('https://x/u');
  }
  // Without a footer there must be NO unsubscribe instructions at all —
  // the old "reply, or POST" line promised a path that never existed.
  const bare = buildRegressionAlert(DOMAIN, base, cur, {});
  expect(bare.text).not.toMatch(/reply|unsub/i);
});

test('transactional builders accept the footer without duplicating the privacy line', () => {
  const footer = mailFooter({ postal: POSTAL });
  const v = buildVerificationEmail(DOMAIN, 'https://x/confirm', { footer });
  expect(v.text).toContain(POSTAL);
  expect(v.text.match(/privacy\.md/g).length).toBe(1);
  const d = buildDashboardLinkEmail('https://x/dash', 2, { footer });
  expect(d.text).toContain(POSTAL);
  expect(d.text.match(/privacy\.md/g).length).toBe(1);
});

// ── One-click tokens ─────────────────────────────────────────────────────────

test('sign/verify roundtrip binds exactly one domain+email pair', async () => {
  const token = await signUnsubscribe(DOMAIN, EMAIL, SECRET);
  expect(token).toBeTruthy();
  expect(await verifyUnsubscribe(token, SECRET)).toEqual({ domain: DOMAIN, email: EMAIL });
  expect(unsubscribeUrl('https://slop-detect.com', token)).toContain(
    '/api/watch/unsubscribe?token='
  );
});

test('tampered payload, wrong secret, and garbage all reject', async () => {
  const token = await signUnsubscribe(DOMAIN, EMAIL, SECRET);
  const [payload, sig] = token.split('.');
  const flipped = (payload[0] === 'A' ? 'B' : 'A') + payload.slice(1);
  expect(await verifyUnsubscribe(`${flipped}.${sig}`, SECRET)).toBeNull();
  expect(await verifyUnsubscribe(token, 'wrong-secret')).toBeNull();
  expect(await verifyUnsubscribe('garbage', SECRET)).toBeNull();
  expect(await verifyUnsubscribe('', SECRET)).toBeNull();
  expect(await signUnsubscribe(DOMAIN, EMAIL, '')).toBeNull();
});

test('domain separation: session cookies never verify as unsubscribe tokens', async () => {
  const session = await signSession(EMAIL, SECRET);
  expect(await verifyUnsubscribe(session, SECRET)).toBeNull();
});

// ── Unsubscribe route ────────────────────────────────────────────────────────

test('GET renders confirm but never performs (prefetcher-safe)', async () => {
  const kv = makeKv();
  seedWatch(kv);
  const token = await signUnsubscribe(DOMAIN, EMAIL, SECRET);
  const res = await unsubGet({
    request: req(
      `https://slop-detect.com/api/watch/unsubscribe?token=${encodeURIComponent(token)}`
    ),
    env: { RESULTS: kv, SESSION_SECRET: SECRET },
  });
  expect(res.status).toBe(200);
  const html = await res.text();
  expect(html).toContain(DOMAIN);
  expect(html).toContain('<form');
  // Still monitored — GET changed nothing.
  expect(kv.store.has(`w:${DOMAIN}`)).toBe(true);
});

test('POST performs the full honor path: watch + listing + index gone, immediately', async () => {
  const kv = makeKv();
  seedWatch(kv);
  const token = await signUnsubscribe(DOMAIN, EMAIL, SECRET);
  const res = await unsubPost({
    request: req(
      `https://slop-detect.com/api/watch/unsubscribe?token=${encodeURIComponent(token)}`,
      'POST'
    ),
    env: { RESULTS: kv, SESSION_SECRET: SECRET },
  });
  expect(res.status).toBe(200);
  expect(await res.text()).toContain('Alerts off');
  expect(kv.store.has(`w:${DOMAIN}`)).toBe(false);
  expect(kv.store.has(`l:${DOMAIN}`)).toBe(false);
  // Replay is a harmless 200 no-op (RFC: the URL must keep working).
  const replay = await unsubPost({
    request: req(`https://slop-detect.com/api/watch/unsubscribe?token=${token}`, 'POST'),
    env: { RESULTS: kv, SESSION_SECRET: SECRET },
  });
  expect(replay.status).toBe(200);
});

test('POST with a forged token is refused and the watch survives', async () => {
  const kv = makeKv();
  seedWatch(kv);
  const forged = await signUnsubscribe(DOMAIN, EMAIL, 'attacker-secret');
  const res = await unsubPost({
    request: req(`https://slop-detect.com/api/watch/unsubscribe?token=${forged}`, 'POST'),
    env: { RESULTS: kv, SESSION_SECRET: SECRET },
  });
  expect(res.status).toBe(403);
  expect(kv.store.has(`w:${DOMAIN}`)).toBe(true);
});

test('POST with a stale token (address changed) must not stop the new subscriber', async () => {
  const kv = makeKv();
  seedWatch(kv, { email: 'new@acme.example.com' });
  const stale = await signUnsubscribe(DOMAIN, EMAIL, SECRET);
  const res = await unsubPost({
    request: req(`https://slop-detect.com/api/watch/unsubscribe?token=${stale}`, 'POST'),
    env: { RESULTS: kv, SESSION_SECRET: SECRET },
  });
  expect(res.status).toBe(403);
  expect(kv.store.has(`w:${DOMAIN}`)).toBe(true);
});

test('missing token and missing storage fail closed', async () => {
  const kv = makeKv();
  const noToken = await unsubGet({
    request: req('https://slop-detect.com/api/watch/unsubscribe'),
    env: { RESULTS: kv, SESSION_SECRET: SECRET },
  });
  expect(noToken.status).toBe(400);
  const noKv = await unsubPost({
    request: req('https://slop-detect.com/api/watch/unsubscribe?token=x', 'POST'),
    env: {},
  });
  expect(noKv.status).toBe(503);
});

// ── Bounce webhook + suppression gate ────────────────────────────────────────

const WEBHOOK_RAW = 'test-webhook-secret-32-bytes-long!!';
const WEBHOOK_B64 = Buffer.from(WEBHOOK_RAW).toString('base64');

async function svixHeaders(body, { secretB64 = WEBHOOK_B64, ts = null, id = 'msg_test_1' } = {}) {
  const timestamp = ts ?? String(Math.floor(Date.now() / 1000));
  const key = await crypto.subtle.importKey(
    'raw',
    Uint8Array.from(Buffer.from(secretB64, 'base64')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${id}.${timestamp}.${body}`)
  );
  const b64 = Buffer.from(new Uint8Array(sig)).toString('base64');
  return { 'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': `v1,${b64}` };
}

function webhookReq(body, headers) {
  return new Request('https://slop-detect.com/api/email/webhook', {
    method: 'POST',
    headers,
    body,
  });
}

const webhookEnv = (kv) => ({ RESULTS: kv, RESEND_WEBHOOK_SECRET: `whsec_${WEBHOOK_B64}` });

test('bounced and complained recipients are suppressed; later sends skip', async () => {
  const kv = makeKv();
  const env = webhookEnv(kv);
  for (const [type, to] of [
    ['email.bounced', 'dead@example.com'],
    ['email.complained', 'angry@example.com'],
  ]) {
    const body = JSON.stringify({ type, data: { to: [to], subject: 'x' } });
    const res = await webhookPost({ request: webhookReq(body, await svixHeaders(body)), env });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, suppressed: 1 });
    expect(await isSuppressed(kv, to)).toBe(true);
    // Case-insensitive: suppression keyed by normalized hash.
    expect(await isSuppressed(kv, to.toUpperCase())).toBe(true);
  }
  // The gate honors it: no provider call, reason suppressed.
  let fetched = 0;
  const res = await sendEmail(
    { ...env, RESEND_API_KEY: 'k', ALERT_FROM: 'a@b.c', RESULTS: kv },
    { to: 'dead@example.com', subject: 's', text: 't' },
    async () => {
      fetched++;
      return new Response('{}');
    }
  );
  expect(res).toEqual({ sent: false, reason: 'suppressed' });
  expect(fetched).toBe(0);
  // Unsuppressed addresses still send.
  const ok = await sendEmail(
    { ...env, RESEND_API_KEY: 'k', ALERT_FROM: 'a@b.c', RESULTS: kv },
    { to: 'fine@example.com', subject: 's', text: 't' },
    async () => {
      fetched++;
      return new Response(JSON.stringify({ id: 'e1' }));
    }
  );
  expect(ok.sent).toBe(true);
  expect(fetched).toBe(1);
});

test('a rejecting suppression lookup fails closed inside the contract, never throws', async () => {
  // Greptile P1 on PR #173: a transient KV rejection must not escape
  // sendEmail as a throw, and must not send blind past the suppressions.
  const kv = {
    async get() {
      throw new Error('KV blip');
    },
    async put() {},
    async delete() {},
  };
  let fetched = 0;
  const res = await sendEmail(
    { RESEND_API_KEY: 'k', ALERT_FROM: 'a@b.c', RESULTS: kv },
    { to: 'fine@example.com', subject: 's', text: 't' },
    async () => {
      fetched++;
      return new Response('{}');
    }
  );
  expect(res).toEqual({ sent: false, reason: 'suppression_unknown' });
  expect(fetched).toBe(0);
});

test('forged signature, stale timestamp, and missing secret fail closed', async () => {
  const kv = makeKv();
  const env = webhookEnv(kv);
  const body = JSON.stringify({ type: 'email.bounced', data: { to: ['v@example.com'] } });
  const badSig = await webhookPost({
    request: webhookReq(body, { ...(await svixHeaders(body)), 'svix-signature': 'v1,AAAAAAAA' }),
    env,
  });
  expect(badSig.status).toBe(401);
  const stale = await webhookPost({
    request: webhookReq(
      body,
      await svixHeaders(body, { ts: String(Math.floor(Date.now() / 1000) - 3600) })
    ),
    env,
  });
  expect(stale.status).toBe(401);
  expect(await isSuppressed(kv, 'v@example.com')).toBe(false);
  const noSecret = await webhookPost({
    request: webhookReq(body, await svixHeaders(body)),
    env: { RESULTS: kv },
  });
  expect(noSecret.status).toBe(503);
});

test('non-suppression events are acked and ignored', async () => {
  const kv = makeKv();
  const env = webhookEnv(kv);
  const body = JSON.stringify({ type: 'email.delivered', data: { to: ['v@example.com'] } });
  const res = await webhookPost({ request: webhookReq(body, await svixHeaders(body)), env });
  expect(res.status).toBe(200);
  expect(await isSuppressed(kv, 'v@example.com')).toBe(false);
});

// ── Header forwarding ────────────────────────────────────────────────────────

test('sendEmail forwards List-Unsubscribe headers to Resend verbatim', async () => {
  let payload;
  await sendEmail(
    { RESEND_API_KEY: 'k', ALERT_FROM: 'a@b.c' },
    {
      to: 'fine@example.com',
      subject: 's',
      text: 't',
      headers: {
        'List-Unsubscribe': '<https://x/u>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    },
    async (_url, init) => {
      payload = JSON.parse(init.body);
      return new Response(JSON.stringify({ id: 'e1' }));
    }
  );
  expect(payload.headers).toEqual({
    'List-Unsubscribe': '<https://x/u>',
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  });
  // No headers ⇒ no key (Resend payload unchanged for transactional mails).
  await sendEmail(
    { RESEND_API_KEY: 'k', ALERT_FROM: 'a@b.c' },
    { to: 'f@x.c', subject: 's', text: 't' },
    async (_url, init) => {
      payload = JSON.parse(init.body);
      return new Response(JSON.stringify({ id: 'e2' }));
    }
  );
  expect('headers' in payload).toBe(false);
});
