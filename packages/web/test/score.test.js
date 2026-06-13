// Tests for the per-domain score hub (GET /score/:domain). Renders the handler
// against an in-memory KV mock and asserts on the produced HTML, no browser.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saveResult, recordScan, setListing } from '../functions/_shared.js';
import { onRequestGet } from '../functions/score/[domain].js';

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

function slim(over = {}) {
  return {
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
    ...over,
  };
}

async function render(kv, domainParam) {
  const res = await onRequestGet({
    params: { domain: domainParam },
    request: { url: `https://slop-detect.com/score/${domainParam}` },
    env: { RESULTS: kv },
  });
  return { status: res.status, html: await res.text(), res };
}

test('invalid domain returns 400', async () => {
  const { status } = await render(makeKv(), 'not a domain');
  assert.equal(status, 400);
});

test('unknown domain renders the empty state with a scan CTA', async () => {
  const { status, html } = await render(makeKv(), 'never-scanned.com');
  assert.equal(status, 404);
  assert.match(html, /No scan recorded/);
  assert.match(html, /\/\?url=never-scanned\.com/);
});

test('a scanned domain renders score, grade, verdict, JSON-LD, canonical', async () => {
  const kv = makeKv();
  const s = slim();
  await saveResult(kv, s);
  await recordScan(kv, s);
  const { status, html } = await render(kv, 'ex.com');
  assert.equal(status, 200);
  assert.match(html, />D</); // grade
  assert.match(html, /30<small>\/100<\/small>/); // score
  assert.match(html, /Heavy slop/); // verdict
  assert.match(html, /application\/ld\+json/); // AEO structured data
  assert.match(html, /rel="canonical" href="https:\/\/slop-detect\.com\/score\/ex\.com"/);
});

test('an UNCLAIMED domain shows the claim form, no dofollow backlink', async () => {
  const kv = makeKv();
  const s = slim();
  await saveResult(kv, s);
  await recordScan(kv, s);
  const { html } = await render(kv, 'ex.com');
  assert.match(html, /id="claimForm"/);
  assert.match(html, /Claim this page/);
  assert.doesNotMatch(html, /rel="dofollow"/);
});

test('a CLAIMED (listed) domain shows a dofollow backlink, not the claim form', async () => {
  const kv = makeKv();
  const s = slim();
  await saveResult(kv, s);
  await recordScan(kv, s);
  await setListing(kv, s); // owner claimed + listed
  const { html } = await render(kv, 'ex.com');
  assert.match(html, /rel="dofollow"/);
  assert.match(html, /Listed in the/);
  assert.doesNotMatch(html, /id="claimForm"/);
});

test('peer percentile appears only once enough sites are scanned', async () => {
  const kv = makeKv();
  const target = slim({ id: 't', domain: 'ex.com', score: 5, tier: 'Clean', grade: 'A' });
  await saveResult(kv, target);
  await recordScan(kv, target);
  // only 1 site so far -> no peer line
  let r = await render(kv, 'ex.com');
  assert.doesNotMatch(r.html, /Cleaner than/);
  // seed four more scans so the corpus crosses the >=5 threshold
  for (let i = 0; i < 4; i++) {
    await recordScan(kv, slim({ id: 'x' + i, domain: `d${i}.com`, score: 40 + i, tier: 'Heavy' }));
  }
  r = await render(kv, 'ex.com');
  assert.match(r.html, /Cleaner than <strong>/);
});

test('the page links to this scan, the printable report, and a re-scan', async () => {
  const kv = makeKv();
  const s = slim();
  await saveResult(kv, s);
  await recordScan(kv, s);
  const { html } = await render(kv, 'ex.com');
  assert.match(html, /href="https:\/\/slop-detect\.com\/r\/sc0re001"/);
  assert.match(html, /href="https:\/\/slop-detect\.com\/report\/ex\.com"/);
  assert.match(html, /\/\?url=ex\.com/);
});
