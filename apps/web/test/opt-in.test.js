// Public grades on /api/opt-in follow the same email-verified listing gate as
// /score/:domain. A saved scan or an unverified watch must not be returned.

import { test, expect } from 'vitest';
import { saveResult, setListing } from '../functions/_shared.ts';
import { onRequestGet } from '../functions/api/opt-in.ts';

function makeKv() {
  const store = new Map();
  return {
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

async function seed(kv, domain, score, watch) {
  await saveResult(kv, {
    id: domain.replace(/\W/g, '').slice(0, 12),
    domain,
    url: `https://${domain}/`,
    score,
    grade: 'B',
    tier: 'Mild',
  });
  if (watch)
    await kv.put(`w:${domain}`, JSON.stringify({ domain, email: 'owner@' + domain, ...watch }));
}

test('GET /api/opt-in returns grades only for email-verified listings', async () => {
  const kv = makeKv();
  await seed(kv, 'cal.com', 19, { listed: true, verified: true });
  await seed(kv, 'stripe.com', 19, { listed: true, verified: false });
  await seed(kv, 'clerk.com', 36, { listed: false, verified: true });
  await seed(kv, 'resend.com', 22, null);
  await setListing(kv, {
    domain: 'resend.com',
    score: 22,
    grade: 'B-',
    tier: 'Mild',
    id: 'resend',
  });

  const res = await onRequestGet({
    request: {
      url: 'https://slop-detect.com/api/opt-in?domains=Stripe.COM,stripe.com,clerk.com,resend.com,cal.com,not a domain',
    },
    env: { RESULTS: kv },
  });
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.domains['cal.com']).toMatchObject({ score: 19, grade: 'B', tier: 'Mild' });
  expect(body.domains['stripe.com']).toBeUndefined();
  expect(body.domains['clerk.com']).toBeUndefined();
  expect(body.domains['resend.com']).toBeUndefined();
  expect(JSON.stringify(body)).not.toMatch(/owner@/);
});

test('GET /api/opt-in prefers the directory listing score over the latest scan', async () => {
  const kv = makeKv();
  await seed(kv, 'cal.com', 19, { listed: true, verified: true });
  await setListing(kv, { domain: 'cal.com', score: 27, grade: 'C', tier: 'Mild', id: 'cal' });
  const res = await onRequestGet({
    request: { url: 'https://slop-detect.com/api/opt-in?domains=cal.com' },
    env: { RESULTS: kv },
  });
  const body = await res.json();
  expect(body.domains['cal.com']).toEqual({ score: 27, grade: 'C', tier: 'Mild' });
});

test('GET /api/opt-in is empty when storage is missing', async () => {
  const res = await onRequestGet({
    request: { url: 'https://slop-detect.com/api/opt-in?domains=cal.com' },
    env: {},
  });
  const body = await res.json();
  expect(body.domains).toEqual({});
});
