// /leaderboard renders the generated dataset (fetched at request time) into a
// research-framed page: corpus headline + a live counter + category rankings +
// by-builder, anti-slop. Each name links into its /score hub.

import { test, expect } from 'vitest';
import { onRequestGet } from '../functions/leaderboard.tsx';

const SAMPLE = {
  generatedAt: '2026-06-05T00:00:00.000Z',
  definitionsVersion: '2026.08',
  count: 3,
  scored: 3,
  stats: { avgScore: 17, slopShare: 33, cleanCount: 2, mildCount: 1, heavyCount: 0 },
  byBuilder: { v0: { count: 1, avgScore: 30 }, custom: { count: 2, avgScore: 7 } },
  byCategory: {},
  sites: [
    {
      domain: 'stripe.com',
      url: 'https://stripe.com',
      builtWith: 'custom',
      category: 'saas',
      scored: true,
      score: 4,
      grade: 'A',
      tier: 'Clean',
    },
    {
      domain: 'news.ycombinator.com',
      url: 'https://news.ycombinator.com',
      builtWith: 'custom',
      category: 'classic',
      scored: true,
      score: 6,
      grade: 'A-',
      tier: 'Clean',
    },
    {
      domain: 'demo.v0',
      url: 'https://demo.v0',
      builtWith: 'v0',
      category: 'ai-builder',
      scored: true,
      score: 30,
      grade: 'C',
      tier: 'Heavy',
    },
  ],
};

// Stub the static-asset fetch the page does for /leaderboard.json.
function withFetch(impl, fn) {
  const orig = globalThis.fetch;
  globalThis.fetch = impl;
  return Promise.resolve(fn()).finally(() => {
    globalThis.fetch = orig;
  });
}

// KV mock whose stats:dist seeds getStats with `n` scans (all at one bucket).
function kvWithScans(n) {
  const dist = new Array(101).fill(0);
  dist[12] = n;
  const store = new Map([['stats:dist', JSON.stringify(dist)]]);
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

const req = { url: 'https://slop-detect.com/leaderboard' };

test('/leaderboard renders the headline, category rankings, and by-builder', async () => {
  await withFetch(
    async () => new Response(JSON.stringify(SAMPLE), { status: 200 }),
    async () => {
      const res = await onRequestGet({ request: req, env: {} });
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html, 'shows corpus slop share').toMatch(/33%/);
      expect(html).toMatch(/AI builders/);
      expect(html).toMatch(/SaaS &amp; dev tools|SaaS & dev tools/);
      expect(html).toMatch(/Classic/);
      expect(html).toMatch(/By builder/);
      expect(html, 'builder breakdown present').toMatch(/v0/);
      // Names link into the score hub (closing the loop), not dead-ending elsewhere.
      expect(html).toMatch(/href="https:\/\/slop-detect\.com\/score\/stripe\.com"/);
      // Anti-slop self-check + framing caveat. The font names are matched
      // case-sensitively (as in ui.test.js) so the shared UI_CSS `cursor:pointer`
      // — which contains the substring "inter" — is not a false positive.
      expect(html).not.toMatch(/Inter|Geist|Space Grotesk/);
      expect(html).not.toMatch(/background-clip:\s*text/i);
      expect(html).toMatch(/fingerprint, not a verdict/i);
    }
  );
});

test('/leaderboard shows a graceful "generating" state when data is missing', async () => {
  await withFetch(
    async () => new Response('not found', { status: 404 }),
    async () => {
      const res = await onRequestGet({ request: req, env: {} });
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toMatch(/being generated/i);
      expect(html).not.toMatch(/undefined/);
    }
  );
});

test('/leaderboard shows the live scan counter once enough scans exist', async () => {
  await withFetch(
    async () => new Response(JSON.stringify(SAMPLE), { status: 200 }),
    async () => {
      const withData = await (
        await onRequestGet({ request: req, env: { RESULTS: kvWithScans(120) } })
      ).text();
      expect(withData).toMatch(/120<\/strong>\s*scans|>120<\/strong>/);
      const tooFew = await (
        await onRequestGet({ request: req, env: { RESULTS: kvWithScans(10) } })
      ).text();
      expect(tooFew).not.toMatch(/scans,\s*\n?\s*average/);
    }
  );
});
