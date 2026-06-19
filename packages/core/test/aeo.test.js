// Unit tests for the AEO axis. Pure functions + an injected fetch mock so the
// check runner is fully deterministic (no network). Run with:
//   vitest run packages/core/test/aeo.test.js
import { test, expect } from 'vitest';
import {
  AI_BOTS,
  AEO_CHECKS,
  detectAIBot,
  aiBotsBlockedByRobots,
  toMarkdownUrl,
  runAeoChecks,
  readCapped,
  MAX_HTML_BYTES,
} from '@slop-detect/core';

// ── detectAIBot ──────────────────────────────────────────────────────────────
test('detectAIBot identifies known crawlers by substring, case-insensitive', () => {
  const gpt = detectAIBot('Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)');
  expect(gpt.isBot).toBe(true);
  expect(gpt.vendor).toBe('OpenAI');
  expect(gpt.purpose).toBe('training');

  const claude = detectAIBot('claudebot/1.0');
  expect(claude.isBot).toBe(true);
  expect(claude.vendor).toBe('Anthropic');

  const human = detectAIBot('Mozilla/5.0 (Macintosh) Safari/605');
  expect(human.isBot).toBe(false);
  expect(human.vendor).toBe(null);

  expect(detectAIBot('').isBot).toBe(false);
});

test('AI_BOTS registry is non-trivial and covers the big four vendors', () => {
  expect(AI_BOTS.length >= 20).toBeTruthy();
  const vendors = new Set(AI_BOTS.map((b) => b.vendor));
  for (const v of ['OpenAI', 'Anthropic', 'Perplexity', 'Google']) {
    expect(vendors.has(v)).toBeTruthy();
  }
});

// ── toMarkdownUrl ────────────────────────────────────────────────────────────
test('toMarkdownUrl maps pages to their .md twin', () => {
  expect(toMarkdownUrl('https://x.com/blog/post')).toBe('https://x.com/blog/post.md');
  expect(toMarkdownUrl('https://x.com/')).toBe('https://x.com/index.md');
  expect(toMarkdownUrl('https://x.com/a/')).toBe('https://x.com/a.md');
  // idempotent
  expect(toMarkdownUrl('https://x.com/a.md')).toBe('https://x.com/a.md');
});

// ── robots.txt parser ────────────────────────────────────────────────────────
test('aiBotsBlockedByRobots: blanket Disallow under * blocks AI bots', () => {
  const r = aiBotsBlockedByRobots('User-agent: *\nDisallow: /', '/blog');
  expect(r.blocked).toBe(true);
  expect(r.agents).toEqual(['*']);
});

test('aiBotsBlockedByRobots: named AI bot disallow is detected', () => {
  const r = aiBotsBlockedByRobots(
    'User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nDisallow:',
    '/'
  );
  expect(r.blocked).toBe(true);
  expect(r.agents.includes('gptbot')).toBeTruthy();
});

test('aiBotsBlockedByRobots: empty Disallow and unrelated bots do not block', () => {
  expect(aiBotsBlockedByRobots('User-agent: *\nDisallow:', '/').blocked).toBe(false);
  expect(aiBotsBlockedByRobots('User-agent: AhrefsBot\nDisallow: /', '/').blocked).toBe(false);
  expect(aiBotsBlockedByRobots('', '/').blocked).toBe(false);
});

test('aiBotsBlockedByRobots: path-scoped disallow only blocks matching paths', () => {
  const robots = 'User-agent: *\nDisallow: /admin';
  expect(aiBotsBlockedByRobots(robots, '/admin/users').blocked).toBe(true);
  expect(aiBotsBlockedByRobots(robots, '/blog/post').blocked).toBe(false);
});

// ── runAeoChecks with an injected fetch mock ─────────────────────────────────
// Build a fetch impl that responds based on URL + headers, so we can simulate a
// fully AEO-ready site and a fully invisible one without touching the network.
function makeFetch(routes) {
  return async (url, init) => {
    const u = new URL(url);
    const ua =
      (init && init.headers && (init.headers['User-Agent'] || init.headers['user-agent'])) || '';
    const key = u.pathname;
    const entry = routes(key, ua, u);
    if (!entry)
      return new Response('not found', { status: 404, headers: { 'content-type': 'text/html' } });
    return new Response(entry.body ?? 'ok', {
      status: entry.status ?? 200,
      headers: entry.headers ?? { 'content-type': 'text/html' },
    });
  };
}

test('runAeoChecks: fully AEO-ready site scores AI-Ready (100)', async () => {
  const fetchImpl = makeFetch((path, ua) => {
    if (path === '/') {
      return {
        body: '<html><head><link rel="alternate" type="text/markdown" href="/index.md"></head><body>hi</body></html>',
        headers: {
          'content-type': 'text/html',
          vary: 'Accept',
          link: '</index.md>; rel="alternate"; type="text/markdown"',
        },
      };
    }
    if (path === '/index.md')
      return { body: '# Hi', headers: { 'content-type': 'text/markdown; charset=utf-8' } };
    if (path === '/robots.txt')
      return { body: 'User-agent: *\nAllow: /', headers: { 'content-type': 'text/plain' } };
    if (path === '/llms.txt') return { body: '# Site', headers: { 'content-type': 'text/plain' } };
    return null;
  });

  const r = await runAeoChecks('https://ready.example', { fetchImpl, timeoutMs: 1000 });
  expect(r.axis).toBe('aeo');
  expect(r.score).toBe(100);
  expect(r.tier).toBe('AI-Ready');
  expect(r.requiredFailed).toBe(0);
});

test('runAeoChecks: site that blocks GPTBot + has noindex fails the required checks', async () => {
  const fetchImpl = makeFetch((path, ua) => {
    if (path === '/robots.txt')
      return { body: 'User-agent: GPTBot\nDisallow: /', headers: { 'content-type': 'text/plain' } };
    if (path === '/') {
      // GPTBot gets a 403; humans get a noindex page.
      if (/gptbot/i.test(ua)) return { status: 403, body: 'forbidden' };
      return {
        body: '<html><head><meta name="robots" content="noindex"></head><body>x</body></html>',
        headers: { 'content-type': 'text/html' },
      };
    }
    return null; // no twin, no llms.txt
  });

  const r = await runAeoChecks('https://blocked.example', { fetchImpl, timeoutMs: 1000 });
  const failedIds = new Set(r.failed.map((c) => c.id));
  expect(failedIds.has('bot.notBlocked')).toBeTruthy();
  expect(failedIds.has('robots.aiAllowed')).toBeTruthy();
  expect(failedIds.has('html.indexable')).toBeTruthy();
  expect(r.requiredFailed >= 3).toBeTruthy();
  expect(r.tier).toBe('Invisible');
});

test('AEO_CHECKS weights total 100', () => {
  const total = AEO_CHECKS.reduce((s, c) => s + c.weight, 0);
  expect(total).toBe(100);
});

// ── readCapped / SEC-2 body caps ─────────────────────────────────────────────
function makeOversizedStream(totalBytes, chunkSize = 64 * 1024) {
  let sent = 0;
  const stream = new ReadableStream({
    pull(controller) {
      if (sent >= totalBytes) {
        controller.close();
        return;
      }
      const size = Math.min(chunkSize, totalBytes - sent);
      controller.enqueue(new Uint8Array(size).fill(97));
      sent += size;
    },
  });
  return {
    stream,
    get sent() {
      return sent;
    },
  };
}

test('readCapped: oversized stream decodes <= cap and stops before the full body', async () => {
  const cap = 50_000;
  const oversized = cap + 200_000;
  const handle = makeOversizedStream(oversized);
  const res = new Response(handle.stream, { headers: { 'content-type': 'text/plain' } });
  const text = await readCapped(res, cap);
  expect(text.length).toBeLessThanOrEqual(cap);
  expect(handle.sent).toBeLessThan(oversized);
});

test('runAeoChecks: oversized robots.txt and llms.txt are stream-capped', async () => {
  const cap = MAX_HTML_BYTES;
  const oversized = cap + 500_000;
  const streams = {};

  const fetchImpl = async (url) => {
    const u = new URL(url);
    if (u.pathname === '/') {
      return new Response('<html><head></head><body>hi</body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });
    }
    if (u.pathname === '/robots.txt' || u.pathname === '/llms.txt' || u.pathname === '/index.md') {
      const handle = makeOversizedStream(oversized);
      streams[u.pathname] = handle;
      const ct =
        u.pathname === '/index.md' ? 'text/markdown; charset=utf-8' : 'text/plain; charset=utf-8';
      return new Response(handle.stream, { status: 200, headers: { 'content-type': ct } });
    }
    return new Response('not found', { status: 404 });
  };

  const r = await runAeoChecks('https://huge.example', { fetchImpl, timeoutMs: 5000 });
  expect(r.axis).toBe('aeo');
  for (const path of ['/robots.txt', '/llms.txt', '/index.md']) {
    expect(streams[path]?.sent).toBeLessThan(oversized);
  }
});

test('runAeoChecks: oversized Content-Length short-circuits without streaming', async () => {
  const fetchImpl = async (url) => {
    const u = new URL(url);
    if (u.pathname === '/') {
      return new Response('<html><head></head><body>hi</body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });
    }
    if (u.pathname === '/robots.txt') {
      const stream = new ReadableStream({
        pull() {
          throw new Error('must not stream-read robots.txt when Content-Length exceeds cap');
        },
      });
      return new Response(stream, {
        status: 200,
        headers: {
          'content-type': 'text/plain',
          'content-length': String(MAX_HTML_BYTES + 1_000_000),
        },
      });
    }
    return new Response('not found', { status: 404 });
  };

  const r = await runAeoChecks('https://cl.example', { fetchImpl, timeoutMs: 2000 });
  expect(r.axis).toBe('aeo');
});
