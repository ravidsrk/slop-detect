// Unit tests for the AEO axis. Pure functions + an injected fetch mock so the
// check runner is fully deterministic (no network). Run with:
//   node --test packages/core/test/aeo.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_BOTS,
  AEO_CHECKS,
  detectAIBot,
  aiBotsBlockedByRobots,
  toMarkdownUrl,
  runAeoChecks
} from '../src/aeo.js';

// ── detectAIBot ──────────────────────────────────────────────────────────────
test('detectAIBot identifies known crawlers by substring, case-insensitive', () => {
  const gpt = detectAIBot('Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)');
  assert.equal(gpt.isBot, true);
  assert.equal(gpt.vendor, 'OpenAI');
  assert.equal(gpt.purpose, 'training');

  const claude = detectAIBot('claudebot/1.0');
  assert.equal(claude.isBot, true);
  assert.equal(claude.vendor, 'Anthropic');

  const human = detectAIBot('Mozilla/5.0 (Macintosh) Safari/605');
  assert.equal(human.isBot, false);
  assert.equal(human.vendor, null);

  assert.equal(detectAIBot('').isBot, false);
});

test('AI_BOTS registry is non-trivial and covers the big four vendors', () => {
  assert.ok(AI_BOTS.length >= 20, `expected a substantial registry, got ${AI_BOTS.length}`);
  const vendors = new Set(AI_BOTS.map((b) => b.vendor));
  for (const v of ['OpenAI', 'Anthropic', 'Perplexity', 'Google']) {
    assert.ok(vendors.has(v), `registry missing ${v}`);
  }
});

// ── toMarkdownUrl ────────────────────────────────────────────────────────────
test('toMarkdownUrl maps pages to their .md twin', () => {
  assert.equal(toMarkdownUrl('https://x.com/blog/post'), 'https://x.com/blog/post.md');
  assert.equal(toMarkdownUrl('https://x.com/'), 'https://x.com/index.md');
  assert.equal(toMarkdownUrl('https://x.com/a/'), 'https://x.com/a.md');
  // idempotent
  assert.equal(toMarkdownUrl('https://x.com/a.md'), 'https://x.com/a.md');
});

// ── robots.txt parser ────────────────────────────────────────────────────────
test('aiBotsBlockedByRobots: blanket Disallow under * blocks AI bots', () => {
  const r = aiBotsBlockedByRobots('User-agent: *\nDisallow: /', '/blog');
  assert.equal(r.blocked, true);
  assert.deepEqual(r.agents, ['*']);
});

test('aiBotsBlockedByRobots: named AI bot disallow is detected', () => {
  const r = aiBotsBlockedByRobots('User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nDisallow:', '/');
  assert.equal(r.blocked, true);
  assert.ok(r.agents.includes('gptbot'));
});

test('aiBotsBlockedByRobots: empty Disallow and unrelated bots do not block', () => {
  assert.equal(aiBotsBlockedByRobots('User-agent: *\nDisallow:', '/').blocked, false);
  assert.equal(aiBotsBlockedByRobots('User-agent: AhrefsBot\nDisallow: /', '/').blocked, false);
  assert.equal(aiBotsBlockedByRobots('', '/').blocked, false);
});

test('aiBotsBlockedByRobots: path-scoped disallow only blocks matching paths', () => {
  const robots = 'User-agent: *\nDisallow: /admin';
  assert.equal(aiBotsBlockedByRobots(robots, '/admin/users').blocked, true);
  assert.equal(aiBotsBlockedByRobots(robots, '/blog/post').blocked, false);
});

// ── runAeoChecks with an injected fetch mock ─────────────────────────────────
// Build a fetch impl that responds based on URL + headers, so we can simulate a
// fully AEO-ready site and a fully invisible one without touching the network.
function makeFetch(routes) {
  return async (url, init) => {
    const u = new URL(url);
    const ua = (init && init.headers && (init.headers['User-Agent'] || init.headers['user-agent'])) || '';
    const key = u.pathname;
    const entry = routes(key, ua, u);
    if (!entry) return new Response('not found', { status: 404, headers: { 'content-type': 'text/html' } });
    return new Response(entry.body ?? 'ok', {
      status: entry.status ?? 200,
      headers: entry.headers ?? { 'content-type': 'text/html' }
    });
  };
}

test('runAeoChecks: fully AEO-ready site scores AI-Ready (100)', async () => {
  const fetchImpl = makeFetch((path, ua) => {
    if (path === '/') {
      return {
        body: '<html><head><link rel="alternate" type="text/markdown" href="/index.md"></head><body>hi</body></html>',
        headers: { 'content-type': 'text/html', 'vary': 'Accept', 'link': '</index.md>; rel="alternate"; type="text/markdown"' }
      };
    }
    if (path === '/index.md') return { body: '# Hi', headers: { 'content-type': 'text/markdown; charset=utf-8' } };
    if (path === '/robots.txt') return { body: 'User-agent: *\nAllow: /', headers: { 'content-type': 'text/plain' } };
    if (path === '/llms.txt') return { body: '# Site', headers: { 'content-type': 'text/plain' } };
    return null;
  });

  const r = await runAeoChecks('https://ready.example', { fetchImpl, timeoutMs: 1000 });
  assert.equal(r.axis, 'aeo');
  assert.equal(r.score, 100, `expected perfect, got ${r.score}: ${JSON.stringify(r.failed.map((c) => c.id))}`);
  assert.equal(r.tier, 'AI-Ready');
  assert.equal(r.requiredFailed, 0);
});

test('runAeoChecks: site that blocks GPTBot + has noindex fails the required checks', async () => {
  const fetchImpl = makeFetch((path, ua) => {
    if (path === '/robots.txt') return { body: 'User-agent: GPTBot\nDisallow: /', headers: { 'content-type': 'text/plain' } };
    if (path === '/') {
      // GPTBot gets a 403; humans get a noindex page.
      if (/gptbot/i.test(ua)) return { status: 403, body: 'forbidden' };
      return { body: '<html><head><meta name="robots" content="noindex"></head><body>x</body></html>', headers: { 'content-type': 'text/html' } };
    }
    return null; // no twin, no llms.txt
  });

  const r = await runAeoChecks('https://blocked.example', { fetchImpl, timeoutMs: 1000 });
  const failedIds = new Set(r.failed.map((c) => c.id));
  assert.ok(failedIds.has('bot.notBlocked'), 'should flag blocked GPTBot');
  assert.ok(failedIds.has('robots.aiAllowed'), 'should flag robots disallow');
  assert.ok(failedIds.has('html.indexable'), 'should flag noindex');
  assert.ok(r.requiredFailed >= 3);
  assert.equal(r.tier, 'Invisible');
});

test('AEO_CHECKS weights total 100', () => {
  const total = AEO_CHECKS.reduce((s, c) => s + c.weight, 0);
  assert.equal(total, 100);
});
