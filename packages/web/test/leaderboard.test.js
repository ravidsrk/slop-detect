// /leaderboard renders the generated dataset (fetched at request time) into a
// research-framed page: aggregate stat + Hall of Clean + by-builder, anti-slop.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/leaderboard.js';

const SAMPLE = {
  generatedAt: '2026-06-05T00:00:00.000Z',
  definitionsVersion: '2026.08',
  count: 3, scored: 3,
  stats: { avgScore: 17, slopShare: 33, cleanCount: 2, mildCount: 1, heavyCount: 0 },
  byBuilder: { v0: { count: 1, avgScore: 30 }, custom: { count: 2, avgScore: 7 } },
  byCategory: {},
  sites: [
    { domain: 'stripe.com', url: 'https://stripe.com', builtWith: 'custom', category: 'saas', scored: true, score: 4, grade: 'A', tier: 'Clean', resultUrl: 'https://slop-detect.com/r/aaa' },
    { domain: 'news.ycombinator.com', url: 'https://news.ycombinator.com', builtWith: 'custom', category: 'classic', scored: true, score: 6, grade: 'A-', tier: 'Clean' },
    { domain: 'demo.v0', url: 'https://demo.v0', builtWith: 'v0', category: 'ai-builder', scored: true, score: 30, grade: 'C', tier: 'Heavy' }
  ]
};

// Stub the static-asset fetch the page does for /leaderboard.json.
function withFetch(impl, fn) {
  const orig = globalThis.fetch;
  globalThis.fetch = impl;
  return Promise.resolve(fn()).finally(() => { globalThis.fetch = orig; });
}

const req = { url: 'https://slop-detect.com/leaderboard' };

test('/leaderboard renders the headline stat, Hall of Clean, and by-builder', async () => {
  await withFetch(async () => new Response(JSON.stringify(SAMPLE), { status: 200 }), async () => {
    const res = await onRequestGet({ request: req });
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /33%/, 'shows slop share');
    assert.match(html, /Hall of Clean/);
    assert.match(html, /stripe\.com/, 'names a clean site (praise is fine)');
    assert.match(html, /By builder/);
    assert.match(html, /v0/, 'builder breakdown present');
    // Anti-slop self-check.
    assert.doesNotMatch(html, /Inter|Geist|Space Grotesk/i);
    assert.doesNotMatch(html, /background-clip:\s*text/i);
    // Framing caveat must be present (not a verdict on a company).
    assert.match(html, /fingerprint, not a verdict/i);
    // Hall of Clean links out to the clean site (a backlink / praise).
    assert.match(html, /href="https:\/\/stripe\.com"/);
  });
});

test('/leaderboard shows a graceful "generating" state when data is missing', async () => {
  await withFetch(async () => new Response('not found', { status: 404 }), async () => {
    const res = await onRequestGet({ request: req });
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /being generated/i);
    assert.doesNotMatch(html, /undefined/);
  });
});

test('/leaderboard never lists a Heavy site in the Hall of Clean', async () => {
  await withFetch(async () => new Response(JSON.stringify(SAMPLE), { status: 200 }), async () => {
    const res = await onRequestGet({ request: req });
    const html = await res.text();
    const hall = html.slice(html.indexOf('Hall of Clean'), html.indexOf('By builder'));
    assert.ok(!hall.includes('demo.v0'), 'the Heavy site must not appear in Hall of Clean');
  });
});
