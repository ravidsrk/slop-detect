// Directory / listing tests — the opt-in catalogue of scanned sites
// (VALIDATION.md). Covers the _shared.js listing helpers, GET /api/sites, the
// server-rendered /directory page, and the `list` opt-in flag on /api/watch.
// Driven against an in-memory KV mock that supports list() + metadata.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  setListing,
  getListing,
  deleteListing,
  listSites,
  listAllSites,
  recordScanForWatch,
  getWatch
} from '../functions/_shared.js';
import { onRequestGet as sitesGet } from '../functions/api/sites.js';
import { onRequestGet as directoryGet } from '../functions/api/../directory.js';
import { onRequestPost as watchPost } from '../functions/api/watch.js';

// CF-KV-shaped mock with metadata + list({ prefix }).
function makeKv(seed = {}) {
  const store = new Map();
  for (const [k, v] of Object.entries(seed)) {
    store.set(k, typeof v === 'string' ? { value: v } : v);
  }
  return {
    store,
    async get(k) { return store.has(k) ? store.get(k).value : null; },
    async getWithMetadata(k) {
      const e = store.get(k);
      return e ? { value: e.value, metadata: e.metadata || null } : { value: null, metadata: null };
    },
    async put(k, v, opts = {}) { store.set(k, { value: v, metadata: opts.metadata }); },
    async delete(k) { store.delete(k); },
    async list({ prefix = '', limit = 1000 } = {}) {
      const names = [...store.keys()].filter(n => n.startsWith(prefix)).sort().slice(0, limit);
      return {
        keys: names.map(n => ({ name: n, metadata: store.get(n).metadata })),
        list_complete: true
      };
    }
  };
}

const slim = (over = {}) => ({
  id: 'r1', domain: 'example.com', score: 8, grade: 'A-', tier: 'Clean',
  title: 'Example', ...over
});

function postReq(body) { return { json: async () => body, url: 'https://slop-detect.com/api/watch' }; }

// ── listing helpers ──────────────────────────────────────────────────────────
test('setListing writes a record + display metadata, getListing reads it back', async () => {
  const kv = makeKv();
  const rec = await setListing(kv, slim());
  assert.equal(rec.domain, 'example.com');
  assert.equal(rec.url, 'https://example.com');

  const got = await getListing(kv, 'example.com');
  assert.equal(got.score, 8);
  // The compact summary must live in KV metadata so the directory enumerates cheaply.
  assert.equal(kv.store.get('l:example.com').metadata.g, 'A-');
});

test('setListing preserves listedAt across refreshes but updates the score', async () => {
  const kv = makeKv();
  const first = await setListing(kv, slim({ score: 8, tier: 'Clean' }));
  await new Promise(r => setTimeout(r, 2));
  const second = await setListing(kv, slim({ score: 40, grade: 'D', tier: 'Heavy' }));
  assert.equal(second.listedAt, first.listedAt, 'listedAt is sticky');
  assert.equal(second.score, 40, 'score refreshes');
});

test('listSites derives rows from metadata; deleteListing removes them', async () => {
  const kv = makeKv();
  await setListing(kv, slim({ domain: 'a.com', score: 4, grade: 'A', tier: 'Clean' }));
  await setListing(kv, slim({ domain: 'b.com', score: 55, grade: 'F', tier: 'Heavy' }));

  let { sites } = await listSites(kv);
  assert.equal(sites.length, 2);
  assert.deepEqual(sites.map(s => s.domain).sort(), ['a.com', 'b.com']);

  await deleteListing(kv, 'b.com');
  ({ sites } = await listSites(kv));
  assert.deepEqual(sites.map(s => s.domain), ['a.com']);
});

// ── GET /api/sites ───────────────────────────────────────────────────────────
test('GET /api/sites sorts cleanest-first by default and sloppiest-first on demand', async () => {
  const kv = makeKv();
  await setListing(kv, slim({ domain: 'clean.com', score: 3, grade: 'A', tier: 'Clean' }));
  await setListing(kv, slim({ domain: 'dirty.com', score: 60, grade: 'F', tier: 'Heavy' }));
  const env = { RESULTS: kv };

  let res = await sitesGet({ request: { url: 'https://slop-detect.com/api/sites' }, env });
  let j = await res.json();
  assert.equal(j.sites[0].domain, 'clean.com');

  res = await sitesGet({ request: { url: 'https://slop-detect.com/api/sites?sort=slop' }, env });
  j = await res.json();
  assert.equal(j.sites[0].domain, 'dirty.com');
  assert.equal(j.sort, 'slop');
});

test('GET /api/sites returns 503 without storage', async () => {
  const res = await sitesGet({ request: { url: 'https://slop-detect.com/api/sites' }, env: {} });
  assert.equal(res.status, 503);
});

// ── GET /directory (server-rendered HTML) ────────────────────────────────────
test('/directory renders a DOFOLLOW backlink to each listed site', async () => {
  const kv = makeKv();
  await setListing(kv, slim({ domain: 'example.com', score: 8, grade: 'A-', tier: 'Clean' }));
  const res = await directoryGet({ request: { url: 'https://slop-detect.com/directory' }, env: { RESULTS: kv } });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /href="https:\/\/example\.com"/, 'links out to the site');
  assert.doesNotMatch(html, /rel=["']?nofollow/i, 'the backlink must be dofollow');
  assert.match(html, /application\/ld\+json/, 'emits ItemList JSON-LD for SEO');
  // Anti-slop self-check: the directory must not wear the tells it detects.
  assert.doesNotMatch(html, /Inter|Geist|Space Grotesk/i, 'no slop fonts');
  assert.doesNotMatch(html, /background-clip:\s*text/i, 'no gradient text');
});

test('/directory shows an empty state with a claim CTA when nothing is listed', async () => {
  const res = await directoryGet({ request: { url: 'https://slop-detect.com/directory' }, env: { RESULTS: makeKv() } });
  const html = await res.text();
  assert.match(html, /No sites listed yet/i);
  assert.match(html, /claim it/i);
});

// ── /api/watch list opt-in ───────────────────────────────────────────────────
test('POST /api/watch { list:true } lists the domain; { list:false } delists it', async () => {
  // Seed a prior scan so the listing has a score.
  const kv = makeKv({
    'd:example.com': 'r0',
    'r:r0': JSON.stringify({ id: 'r0', domain: 'example.com', score: 6, grade: 'A', tier: 'Clean', title: 'Ex' })
  });
  const env = { RESULTS: kv };

  let res = await watchPost({ request: postReq({ domain: 'example.com', email: 'o@x.io', list: true }), env });
  let j = await res.json();
  assert.equal(j.listed, true);
  assert.ok(j.directoryUrl.endsWith('/directory'));
  assert.ok(await getListing(kv, 'example.com'), 'listing created');

  // Re-subscribe with list:false → delisted, monitoring intact.
  res = await watchPost({ request: postReq({ domain: 'example.com', email: 'o@x.io', list: false }), env });
  j = await res.json();
  assert.equal(j.listed, false);
  assert.equal(await getListing(kv, 'example.com'), null, 'listing removed');
  assert.ok(await getWatch(kv, 'example.com'), 'still monitored');
});

test('omitting `list` on re-subscribe preserves the listing state', async () => {
  const kv = makeKv({
    'd:example.com': 'r0',
    'r:r0': JSON.stringify({ id: 'r0', domain: 'example.com', score: 6, grade: 'A', tier: 'Clean' })
  });
  const env = { RESULTS: kv };
  await watchPost({ request: postReq({ domain: 'example.com', email: 'o@x.io', list: true }), env });
  // Re-subscribe without the flag — must stay listed.
  const res = await watchPost({ request: postReq({ domain: 'example.com', email: 'o@x.io' }), env });
  const j = await res.json();
  assert.equal(j.listed, true);
  assert.ok(await getListing(kv, 'example.com'));
});

test('unsubscribing a listed domain also delists it', async () => {
  const kv = makeKv({
    'd:example.com': 'r0',
    'r:r0': JSON.stringify({ id: 'r0', domain: 'example.com', score: 6, grade: 'A', tier: 'Clean' })
  });
  const env = { RESULTS: kv };
  await watchPost({ request: postReq({ domain: 'example.com', email: 'o@x.io', list: true }), env });
  await watchPost({ request: postReq({ domain: 'example.com', email: 'o@x.io', unsubscribe: true }), env });
  assert.equal(await getListing(kv, 'example.com'), null);
});

// ── re-scan refreshes a listed domain's directory entry ──────────────────────
test('recordScanForWatch refreshes the listing for a listed, watched domain', async () => {
  const kv = makeKv({
    'w:example.com': JSON.stringify({ domain: 'example.com', email: 'o@x.io', listed: true, baselineScore: 6, baselineTier: 'Clean' }),
    'l:example.com': JSON.stringify({ domain: 'example.com', score: 6, grade: 'A', tier: 'Clean', listedAt: 'orig' })
  });
  // A regressing re-scan should both flag the watch and update the directory.
  await recordScanForWatch(kv, slim({ id: 'r9', score: 45, grade: 'D', tier: 'Heavy' }));
  const listing = await getListing(kv, 'example.com');
  assert.equal(listing.score, 45, 'directory tracks the new score');
  assert.equal(listing.listedAt, 'orig', 'listed-since is preserved');
});
