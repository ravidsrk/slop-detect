// Guard: every inline (non-JSON-LD) <script> the server emits must be valid JS.
//
// When the page routes were ported to hono/jsx, their inline progressive-
// enhancement scripts moved into raw`` strings. Dropping a handler's closing
// `});` there is silent — JSX renders the broken string fine, and the existing
// page tests only regex the markup. This parses each emitted <script> body with
// `new Function`, which throws on a syntax error. Regression: the dashboard login
// script lost its addEventListener close (Cursor Bugbot, PR #26).

import { test, expect } from 'vitest';
import { onRequestGet as dashGet } from '../functions/dashboard.tsx';
import { onRequestGet as scoreGet } from '../functions/score/[domain].tsx';
import { onRequestGet as rGet } from '../functions/r/[id].tsx';
import { saveResult, recordScan } from '../functions/_shared.ts';

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

// Executable inline scripts are emitted as bare <script>…</script> (the JSON-LD
// blocks carry a type=, so they're skipped).
function assertScriptsParse(html, label) {
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  expect(blocks.length > 0, `${label}: expected at least one inline <script>`).toBeTruthy();
  for (const body of blocks) {
    expect(() => new Function(body), `${label}: inline <script> must parse`).not.toThrow();
  }
}

test('dashboard login inline script is syntactically valid', async () => {
  const res = await dashGet({
    request: { url: 'https://slop-detect.com/dashboard', headers: { get: () => null } },
    env: { SESSION_SECRET: 'test-secret' },
  });
  assertScriptsParse(await res.text(), 'dashboard');
});

test('score hub inline script is syntactically valid', async () => {
  const kv = makeKv();
  const s = {
    id: 'sc0re001',
    url: 'https://ex.com',
    finalUrl: 'https://ex.com/',
    domain: 'ex.com',
    title: 'Ex',
    score: 30,
    tier: 'Heavy',
    grade: 'D',
    verdict: 'Heavy slop. Wears the starter kit head to toe.',
    patternsFlagged: 7,
    patternsTotal: 27,
    definitionsVersion: '2026.09',
    triggered: [
      { id: 'slop_fonts', label: 'AI-default font stack', short: 'Slop fonts', weight: 8 },
    ],
    createdAt: '2026-06-10T12:00:00.000Z',
  };
  await saveResult(kv, s);
  await recordScan(kv, s);
  const res = await scoreGet({
    params: { domain: 'ex.com' },
    request: { url: 'https://slop-detect.com/score/ex.com' },
    env: { RESULTS: kv },
  });
  assertScriptsParse(await res.text(), 'score');
});

test('shared result (/r/:id) inline script is syntactically valid', async () => {
  const kv = makeKv();
  const s = {
    id: 'sh4r3d01',
    url: 'https://ex.com',
    finalUrl: 'https://ex.com/',
    domain: 'ex.com',
    title: 'Ex',
    score: 30,
    tier: 'Heavy',
    grade: 'D',
    verdict: 'Heavy slop.',
    patternsFlagged: 7,
    patternsTotal: 27,
    definitionsVersion: '2026.09',
    triggered: [{ label: 'AI-default font stack', weight: 8 }],
    createdAt: '2026-06-10T12:00:00.000Z',
  };
  await saveResult(kv, s);
  const res = await rGet({
    params: { id: 'sh4r3d01' },
    request: { url: 'https://slop-detect.com/r/sh4r3d01' },
    env: { RESULTS: kv },
  });
  assertScriptsParse(await res.text(), 'r/:id');
});

// REDESIGN/GAP-FILL (task 04): a missing or expired permalink returns the friendly
// 90-day 404 with a new-scan CTA, noindex, and no canonical (there's no domain to
// point at). A resolved permalink carries rel=canonical to the /score hub so a
// domain's many /r snapshots don't dilute it (the floor's SEO gap).
test('expired / missing /r/:id returns the friendly 90-day 404', async () => {
  const kv = makeKv();
  const res = await rGet({
    params: { id: 'nope0000' },
    request: { url: 'https://slop-detect.com/r/nope0000' },
    env: { RESULTS: kv },
  });
  expect(res.status).toBe(404);
  const html = await res.text();
  expect(html).toMatch(/kept for 90 days/i);
  expect(html).toMatch(/Run a new scan/i);
  expect(html).toMatch(/<meta name="robots" content="noindex"/);
  expect(html.includes('rel="canonical"')).toBeFalsy();
});

test('resolved /r/:id canonicalizes to the /score hub', async () => {
  const kv = makeKv();
  const s = {
    id: 'c4non001',
    url: 'https://ex.com',
    finalUrl: 'https://ex.com/',
    domain: 'ex.com',
    title: 'Ex',
    score: 30,
    tier: 'Heavy',
    grade: 'D',
    verdict: 'Heavy slop.',
    patternsFlagged: 7,
    patternsTotal: 27,
    definitionsVersion: '2026.09',
    triggered: [{ label: 'AI-default font stack', weight: 8 }],
    createdAt: '2026-06-10T12:00:00.000Z',
  };
  await saveResult(kv, s);
  const res = await rGet({
    params: { id: 'c4non001' },
    request: { url: 'https://slop-detect.com/r/c4non001' },
    env: { RESULTS: kv },
  });
  expect(res.status).toBe(200);
  const html = await res.text();
  expect(html).toContain('<link rel="canonical" href="https://slop-detect.com/score/ex.com"');
  // OG/Twitter unfurl to the per-id PNG card (MNR-8).
  expect(html).toContain('og/c4non001.png');
  // the redesigned share surface must not reintroduce a gradient background.
  expect(html.includes('radial-gradient')).toBeFalsy();
});

// Regression: values embedded in inline scripts (and JSON-LD) via jsonForScript
// must not be able to break out of the <script> element. Even though verdict is a
// fixed pool and domain is hostname-shaped today, a hostile value containing
// </script> must come out <-escaped, leaving the script tags balanced.
test('hostile field values cannot break out of inline scripts', async () => {
  const evil = '</script><img src=x onerror=alert(1)>';
  const kv = makeKv();
  const s = {
    id: 'evil0001',
    url: 'https://ex.com/' + evil,
    finalUrl: 'https://ex.com/' + evil,
    domain: 'ex.com',
    title: evil,
    score: 30,
    tier: 'Heavy',
    grade: 'D',
    verdict: 'pwn ' + evil,
    patternsFlagged: 7,
    patternsTotal: 27,
    definitionsVersion: '2026.09',
    triggered: [{ label: evil, weight: 8 }],
    createdAt: '2026-06-10T12:00:00.000Z',
  };
  await saveResult(kv, s);
  await recordScan(kv, s);

  for (const [name, fn, params] of [
    ['r/:id', rGet, { id: 'evil0001' }],
    ['score', scoreGet, { domain: 'ex.com' }],
  ]) {
    const html = await (
      await fn({ params, request: { url: 'https://slop-detect.com/x' }, env: { RESULTS: kv } })
    ).text();
    const opens = (html.match(/<script\b/gi) || []).length;
    const closes = (html.match(/<\/script>/gi) || []).length;
    expect(opens, `${name}: unbalanced <script> tags → breakout`).toBe(closes);
    expect(html.includes('</script><img'), `${name}: raw </script> breakout present`).toBeFalsy();
    expect(html.includes('\\u003c'), `${name}: payload should be \\u003c-escaped`).toBeTruthy();
  }
});
