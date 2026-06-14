// Guard: every inline (non-JSON-LD) <script> the server emits must be valid JS.
//
// When the page routes were ported to hono/jsx, their inline progressive-
// enhancement scripts moved into raw`` strings. Dropping a handler's closing
// `});` there is silent — JSX renders the broken string fine, and the existing
// page tests only regex the markup. This parses each emitted <script> body with
// `new Function`, which throws on a syntax error. Regression: the dashboard login
// script lost its addEventListener close (Cursor Bugbot, PR #26).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet as dashGet } from '../functions/dashboard.js';
import { onRequestGet as scoreGet } from '../functions/score/[domain].js';
import { onRequestGet as rGet } from '../functions/r/[id].js';
import { saveResult, recordScan } from '../functions/_shared.js';

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
  assert.ok(blocks.length > 0, `${label}: expected at least one inline <script>`);
  for (const body of blocks) {
    assert.doesNotThrow(() => new Function(body), `${label}: inline <script> must parse`);
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
