// CF-04 monitor flow end-to-end (T-15 / G-01): subscribe → confirm → baseline →
// regress → sweep → exactly-once alert → recovery re-arms — through the REAL
// handlers with only the network faked (Resend + the sweep's internal re-scan,
// whose stub faithfully replays the scan path's recordScanForWatch side
// effect). Plus the fail-closed matrix sans secrets: every missing-config
// state must degrade loudly (503/500) or retry-safe, never crash or spam.

import { test, expect, afterEach } from 'vitest';
import { onRequestPost as watchPost } from '../functions/api/watch.ts';
import { onRequestGet as confirmGet } from '../functions/api/watch/confirm.tsx';
import { onRequestPost as sweepPost } from '../functions/api/cron/sweep.ts';
import { recordScanForWatch, getWatch, putWatch } from '../functions/_shared.ts';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const CRON = 'test-cron-secret';

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

const postReq = (body) => ({
  url: 'https://slop-detect.com/api/watch',
  json: async () => body,
});
const sweepReq = (auth) => ({
  url: 'https://slop-detect.com/api/cron/sweep',
  headers: { get: (k) => (k.toLowerCase() === 'authorization' ? auth : null) },
});
const slim = (domain, score, tier, grade, id) => ({
  domain,
  score,
  tier,
  grade,
  id,
  createdAt: new Date().toISOString(),
});

// Route the only two outbound calls the flow makes: Resend delivery and the
// sweep's internal POST /api/scan. The scan stub replays the real scan
// handler's watch side effect (recordScanForWatch) with the next scripted
// score, so the sweep observes genuine state transitions.
function installFlowFetch({ results, sent, scanPlan, expectKey }) {
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u.includes('api.resend.com')) {
      sent.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ id: `em_${sent.length}` }), { status: 200 });
    }
    if (u.endsWith('/api/scan')) {
      // The stub is not a free pass: it enforces the sweep→scan contract —
      // the unlimited internal key presented, the design axis requested —
      // and throws (→ summary.errors) on any deviation.
      if (init?.headers?.['X-API-Key'] !== expectKey)
        throw new Error('sweep did not present the internal API key');
      const body = JSON.parse(init.body);
      if (!body.url?.startsWith('https://') || !body.axes?.includes('design'))
        throw new Error(`bad internal scan payload: ${init.body.slice(0, 120)}`);
      const domain = new URL(body.url).hostname;
      const [score, tier, grade] = scanPlan.length > 1 ? scanPlan.shift() : scanPlan[0];
      await recordScanForWatch(
        results,
        slim(domain, score, tier, grade, `scan-${Date.now()}-${score}`)
      );
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    throw new Error(`unexpected fetch to ${u}`);
  };
}

async function subscribe(results, rateLimit, domain, email, extraEnv = {}) {
  const env = {
    RESULTS: results,
    RATE_LIMIT: rateLimit,
    RESEND_API_KEY: 're_test',
    ALERT_FROM: 'Slop Detect <alerts@slop-detect.com>',
    ...extraEnv,
  };
  const res = await watchPost({ request: postReq({ domain, email }), env });
  return { res, env };
}

function issuedToken(results) {
  const key = [...results.store.keys()].find((k) => k.startsWith('wv:'));
  return key ? key.slice('wv:'.length) : null;
}

test('CF-04 chain: subscribe → confirm → regress → exactly-once alert → recovery re-arms', async () => {
  const results = makeKv();
  const rateLimit = makeKv();
  const sent = [];
  // Sweep 1 regresses (Clean 5 → Heavy 30); sweep 2 recovers (→ Clean 4);
  // sweep 3 regresses again (→ Heavy 31) to prove re-arming.
  const scanPlan = [
    [30, 'Heavy', 'D'],
    [4, 'Clean', 'A'],
    [31, 'Heavy', 'D'],
  ];
  installFlowFetch({ results, sent, scanPlan, expectKey: 'unlimited-test-key' });

  // 1. Subscribe: 201, verification email out, watch stored unverified.
  // Full compliance config (T-31): sweep alerts fail closed without it.
  const { res: sub, env } = await subscribe(results, rateLimit, 'flow.test', 'owner@flow.test', {
    SESSION_SECRET: 'chain-secret',
    MAIL_POSTAL_ADDRESS: '123 Example St',
  });
  expect(sub.status).toBe(201);
  expect((await sub.json()).verificationSent).toBe(true);
  expect(sent).toHaveLength(1);
  expect((await getWatch(results, 'flow.test')).verified).toBe(false);

  // 2. Confirm the double-opt-in link: watch flips to verified.
  const token = issuedToken(results);
  expect(token).toBeTruthy();
  const conf = await confirmGet({
    request: { url: `https://slop-detect.com/api/watch/confirm?token=${token}` },
    env,
  });
  expect(conf.status).toBe(200);
  expect((await getWatch(results, 'flow.test')).verified).toBe(true);

  // 3. Baseline lands on the domain's first real scan (Clean 5).
  await recordScanForWatch(results, slim('flow.test', 5, 'Clean', 'A', 'scan-base'));
  expect((await getWatch(results, 'flow.test')).baselineScore).toBe(5);

  const sweepEnv = { ...env, CRON_SECRET: CRON, INTERNAL_API_KEY: 'unlimited-test-key' };
  const sweep = () => sweepPost({ request: sweepReq(`Bearer ${CRON}`), env: sweepEnv });

  // 4. Sweep 1 regresses → exactly one alert, baseline-vs-now, to the owner.
  const s1 = await sweep();
  expect(s1.status).toBe(200);
  expect(await s1.json()).toMatchObject({ ok: true, considered: 1, scanned: 1, alerted: 1 });
  expect(sent).toHaveLength(2);
  expect(sent[1].to).toContain('owner@flow.test');
  // T-31: the alert carries the footer + RFC 8058 headers end to end.
  expect(sent[1].text).toContain('123 Example St');
  expect(sent[1].headers['List-Unsubscribe']).toMatch(/\/api\/watch\/unsubscribe\?token=/);
  expect(sent[1].headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  expect((await getWatch(results, 'flow.test')).notified).toBe(true);

  // 5. Sweep 2 recovers → no mail, notified resets (re-armed).
  const s2 = await sweep();
  expect((await s2.json()).alerted).toBe(0);
  expect(sent).toHaveLength(2);
  expect((await getWatch(results, 'flow.test')).notified).toBe(false);

  // 6. Sweep 3 regresses again → second alert fires (re-arm proven).
  const s3 = await sweep();
  expect((await s3.json()).alerted).toBe(1);
  expect(sent).toHaveLength(3);
});

// ── Fail-closed sans secrets ─────────────────────────────────────────────────

test('subscribe without an email provider still 201s, honestly flagged', async () => {
  const results = makeKv();
  const { res } = await subscribe(results, makeKv(), 'noprovider.test', 'owner@np.test', {
    RESEND_API_KEY: undefined,
    ALERT_FROM: undefined,
  });
  expect(res.status).toBe(201);
  const j = await res.json();
  expect(j.alertsActive).toBe(false);
  expect(j.verificationSent).toBe(false);
  // Consent record stands; nothing verified; nothing mailed.
  const w = await getWatch(results, 'noprovider.test');
  expect(w.verified).toBe(false);
  expect(issuedToken(results)).toBeNull();
});

test('sweep without a provider retries safe: 200, alerted 0, notified stays false', async () => {
  const results = makeKv();
  const rateLimit = makeKv();
  const sent = [];
  installFlowFetch({ results, sent, scanPlan: [[30, 'Heavy', 'D']], expectKey: 'k' });
  // No RESEND_API_KEY / ALERT_FROM (test values for the non-email config only).
  const env = {
    RESULTS: results,
    RATE_LIMIT: rateLimit,
    CRON_SECRET: CRON,
    INTERNAL_API_KEY: 'k',
  };
  await watchPost({ request: postReq({ domain: 'retry.test', email: 'owner@retry.test' }), env });
  const w0 = await getWatch(results, 'retry.test');
  w0.verified = true;
  await putWatch(results, w0);
  await recordScanForWatch(results, slim('retry.test', 5, 'Clean', 'A', 'scan-base'));
  const res = await sweepPost({ request: sweepReq(`Bearer ${CRON}`), env });
  expect(res.status).toBe(200);
  // sendEmail no-ops (sent:false) so the sweep counts no alert, leaves
  // notified false for next time, and — critically — never throws or mails.
  const j = await res.json();
  expect(j).toMatchObject({ ok: true, considered: 1, scanned: 1, alerted: 0, errors: 0 });
  expect((await getWatch(results, 'retry.test')).notified).toBe(false);
  expect(sent).toHaveLength(0);
});

test('sweep without compliance config fails closed: 200, alerted 0, notified stays false', async () => {
  // Greptile P1 on PR #173: a degraded send would consume the event
  // (notified=true) with noncompliant mail. Instead the sender skips and the
  // next configured sweep delivers — same retry-safe shape as no-provider.
  const results = makeKv();
  const sent = [];
  installFlowFetch({ results, sent, scanPlan: [[30, 'Heavy', 'D']], expectKey: 'k' });
  const env = {
    RESULTS: results,
    RATE_LIMIT: makeKv(),
    RESEND_API_KEY: 're_test',
    ALERT_FROM: 'Slop Detect <alerts@slop-detect.com>',
    CRON_SECRET: CRON,
    INTERNAL_API_KEY: 'k',
    // SESSION_SECRET and MAIL_POSTAL_ADDRESS deliberately absent.
  };
  await watchPost({ request: postReq({ domain: 'closed.test', email: 'owner@closed.test' }), env });
  const w0 = await getWatch(results, 'closed.test');
  w0.verified = true;
  await putWatch(results, w0);
  await recordScanForWatch(results, slim('closed.test', 5, 'Clean', 'A', 'scan-base'));
  const res = await sweepPost({ request: sweepReq(`Bearer ${CRON}`), env });
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ ok: true, considered: 1, scanned: 1, alerted: 0 });
  expect((await getWatch(results, 'closed.test')).notified).toBe(false);
  expect(sent).toHaveLength(1); // verification only — no alert went out
  // Recovery: the same event delivers once configured (nothing was consumed).
  installFlowFetch({ results, sent, scanPlan: [[30, 'Heavy', 'D']], expectKey: 'k' });
  const res2 = await sweepPost({
    request: sweepReq(`Bearer ${CRON}`),
    env: { ...env, SESSION_SECRET: 's', MAIL_POSTAL_ADDRESS: '123 Example St' },
  });
  expect((await res2.json()).alerted).toBe(1);
  expect(sent).toHaveLength(2);
  expect((await getWatch(results, 'closed.test')).notified).toBe(true);
});

test('confirm without storage is a 503 page, not a throw', async () => {
  const res = await confirmGet({
    request: { url: 'https://slop-detect.com/api/watch/confirm?token=abc' },
    env: {},
  });
  expect(res.status).toBe(503);
});

test('watch POST without storage is a 503, not a throw', async () => {
  const res = await watchPost({
    request: postReq({ domain: 'x.test', email: 'a@x.test' }),
    env: {},
  });
  expect(res.status).toBe(503);
  expect((await res.json()).error).toBe('monitoring storage unavailable');
});
