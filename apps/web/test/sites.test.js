// Directory / listing tests — the opt-in catalogue of scanned sites
// (VALIDATION.md). Covers the _shared.js listing helpers, GET /api/sites, the
// server-rendered /directory page, and the `list` opt-in flag on /api/watch.
// Driven against an in-memory KV mock that supports list() + metadata.

import { test, expect } from 'vitest';
import {
  setListing,
  getListing,
  deleteListing,
  listSites,
  listAllSites,
  recordScanForWatch,
  getWatch,
} from '../functions/_shared.ts';
import { onRequestGet as sitesGet } from '../functions/api/sites.ts';
import { onRequestGet as directoryGet } from '../functions/directory.tsx';
import { onRequestPost as watchPost } from '../functions/api/watch.ts';

// CF-KV-shaped mock with metadata + list({ prefix }).
function makeKv(seed = {}) {
  const store = new Map();
  for (const [k, v] of Object.entries(seed)) {
    store.set(k, typeof v === 'string' ? { value: v } : v);
  }
  return {
    store,
    async get(k) {
      return store.has(k) ? store.get(k).value : null;
    },
    async getWithMetadata(k) {
      const e = store.get(k);
      return e ? { value: e.value, metadata: e.metadata || null } : { value: null, metadata: null };
    },
    async put(k, v, opts = {}) {
      store.set(k, { value: v, metadata: opts.metadata });
    },
    async delete(k) {
      store.delete(k);
    },
    async list({ prefix = '', limit = 1000 } = {}) {
      const names = [...store.keys()]
        .filter((n) => n.startsWith(prefix))
        .sort()
        .slice(0, limit);
      return {
        keys: names.map((n) => ({ name: n, metadata: store.get(n).metadata })),
        list_complete: true,
      };
    },
  };
}

const slim = (over = {}) => ({
  id: 'r1',
  domain: 'example.com',
  score: 8,
  grade: 'A-',
  tier: 'Clean',
  title: 'Example',
  ...over,
});

function postReq(body) {
  return { json: async () => body, url: 'https://slop-detect.com/api/watch' };
}

// ── listing helpers ──────────────────────────────────────────────────────────
test('setListing writes a record + display metadata, getListing reads it back', async () => {
  const kv = makeKv();
  const rec = await setListing(kv, slim());
  expect(rec.domain).toBe('example.com');
  expect(rec.url).toBe('https://example.com');

  const got = await getListing(kv, 'example.com');
  expect(got.score).toBe(8);
  // The compact summary must live in KV metadata so the directory enumerates cheaply.
  expect(kv.store.get('l:example.com').metadata.g).toBe('A-');
});

test('setListing preserves listedAt across refreshes but updates the score', async () => {
  const kv = makeKv();
  const first = await setListing(kv, slim({ score: 8, tier: 'Clean' }));
  await new Promise((r) => setTimeout(r, 2));
  const second = await setListing(kv, slim({ score: 40, grade: 'D', tier: 'Heavy' }));
  expect(second.listedAt, 'listedAt is sticky').toBe(first.listedAt);
  expect(second.score, 'score refreshes').toBe(40);
});

test('listSites derives rows from metadata; deleteListing removes them', async () => {
  const kv = makeKv();
  await setListing(kv, slim({ domain: 'a.com', score: 4, grade: 'A', tier: 'Clean' }));
  await setListing(kv, slim({ domain: 'b.com', score: 55, grade: 'F', tier: 'Heavy' }));

  let { sites } = await listSites(kv);
  expect(sites.length).toBe(2);
  expect(sites.map((s) => s.domain).sort()).toEqual(['a.com', 'b.com']);

  await deleteListing(kv, 'b.com');
  ({ sites } = await listSites(kv));
  expect(sites.map((s) => s.domain)).toEqual(['a.com']);
});

// ── GET /api/sites ───────────────────────────────────────────────────────────
test('GET /api/sites sorts cleanest-first by default and sloppiest-first on demand', async () => {
  const kv = makeKv();
  await setListing(kv, slim({ domain: 'clean.com', score: 3, grade: 'A', tier: 'Clean' }));
  await setListing(kv, slim({ domain: 'dirty.com', score: 60, grade: 'F', tier: 'Heavy' }));
  const env = { RESULTS: kv };

  let res = await sitesGet({ request: { url: 'https://slop-detect.com/api/sites' }, env });
  let j = await res.json();
  expect(j.sites[0].domain).toBe('clean.com');

  res = await sitesGet({ request: { url: 'https://slop-detect.com/api/sites?sort=slop' }, env });
  j = await res.json();
  expect(j.sites[0].domain).toBe('dirty.com');
  expect(j.sort).toBe('slop');
});

test('GET /api/sites: pending (unscored) sites sink to the end in BOTH sorts', async () => {
  const kv = makeKv();
  await setListing(kv, slim({ domain: 'scored.com', score: 50, grade: 'F', tier: 'Heavy' }));
  await setListing(kv, {
    domain: 'pending.com',
    score: null,
    grade: null,
    tier: null,
    id: null,
    title: null,
  });
  const env = { RESULTS: kv };

  for (const sort of ['clean', 'slop']) {
    const res = await sitesGet({
      request: { url: `https://slop-detect.com/api/sites?sort=${sort}` },
      env,
    });
    const j = await res.json();
    expect(j.sites[j.sites.length - 1].domain, `pending last when sort=${sort}`).toBe(
      'pending.com'
    );
  }
});

test('GET /api/sites returns 503 without storage', async () => {
  const res = await sitesGet({ request: { url: 'https://slop-detect.com/api/sites' }, env: {} });
  expect(res.status).toBe(503);
});

// ── GET /directory (server-rendered HTML) ────────────────────────────────────
test('/directory renders a DOFOLLOW backlink to each listed site', async () => {
  const kv = makeKv();
  await setListing(kv, slim({ domain: 'example.com', score: 8, grade: 'A-', tier: 'Clean' }));
  const res = await directoryGet({
    request: { url: 'https://slop-detect.com/directory' },
    env: { RESULTS: kv },
  });
  expect(res.status).toBe(200);
  const html = await res.text();
  expect(html, 'links out to the site').toMatch(/href="https:\/\/example\.com"/);
  expect(html, 'the backlink must be dofollow').not.toMatch(/rel=["']?nofollow/i);
  expect(html, 'emits ItemList JSON-LD for SEO').toMatch(/application\/ld\+json/);
  // Anti-slop self-check: the directory must not wear the tells it detects.
  // Case-sensitive on the font names (matching ui.test.js): the page embeds the
  // shared UI_CSS, whose `cursor:pointer` contains a lowercase "inter" substring
  // that an /i match would false-flag. The real slop faces are always capitalized.
  expect(html, 'no slop fonts').not.toMatch(/Inter|Geist|Space Grotesk/);
  expect(html, 'no gradient text').not.toMatch(/background-clip:\s*text/i);
});

test('/directory shows an empty state with a claim CTA when nothing is listed', async () => {
  const res = await directoryGet({
    request: { url: 'https://slop-detect.com/directory' },
    env: { RESULTS: makeKv() },
  });
  const html = await res.text();
  expect(html).toMatch(/No sites listed yet/i);
  expect(html).toMatch(/claim it/i);
});

// ── /api/watch list opt-in ───────────────────────────────────────────────────
test('POST /api/watch { list:true } lists the domain; { list:false } delists it', async () => {
  // Seed a prior scan so the listing has a score.
  const kv = makeKv({
    'd:example.com': 'r0',
    'r:r0': JSON.stringify({
      id: 'r0',
      domain: 'example.com',
      score: 6,
      grade: 'A',
      tier: 'Clean',
      title: 'Ex',
    }),
  });
  const env = { RESULTS: kv };

  let res = await watchPost({
    request: postReq({ domain: 'example.com', email: 'o@x.io', list: true }),
    env,
  });
  let j = await res.json();
  expect(j.listed).toBe(true);
  expect(j.directoryUrl.endsWith('/directory')).toBeTruthy();
  expect(await getListing(kv, 'example.com'), 'listing created').toBeTruthy();

  // Re-subscribe with list:false → delisted, monitoring intact.
  res = await watchPost({
    request: postReq({ domain: 'example.com', email: 'o@x.io', list: false }),
    env,
  });
  j = await res.json();
  expect(j.listed).toBe(false);
  expect(await getListing(kv, 'example.com'), 'listing removed').toBe(null);
  expect(await getWatch(kv, 'example.com'), 'still monitored').toBeTruthy();
});

test('omitting `list` on re-subscribe preserves the listing state', async () => {
  const kv = makeKv({
    'd:example.com': 'r0',
    'r:r0': JSON.stringify({
      id: 'r0',
      domain: 'example.com',
      score: 6,
      grade: 'A',
      tier: 'Clean',
    }),
  });
  const env = { RESULTS: kv };
  await watchPost({
    request: postReq({ domain: 'example.com', email: 'o@x.io', list: true }),
    env,
  });
  // Re-subscribe without the flag — must stay listed.
  const res = await watchPost({
    request: postReq({ domain: 'example.com', email: 'o@x.io' }),
    env,
  });
  const j = await res.json();
  expect(j.listed).toBe(true);
  expect(await getListing(kv, 'example.com')).toBeTruthy();
});

test('unsubscribing a listed domain also delists it', async () => {
  const kv = makeKv({
    'd:example.com': 'r0',
    'r:r0': JSON.stringify({
      id: 'r0',
      domain: 'example.com',
      score: 6,
      grade: 'A',
      tier: 'Clean',
    }),
  });
  const env = { RESULTS: kv };
  await watchPost({
    request: postReq({ domain: 'example.com', email: 'o@x.io', list: true }),
    env,
  });
  await watchPost({
    request: postReq({ domain: 'example.com', email: 'o@x.io', unsubscribe: true }),
    env,
  });
  expect(await getListing(kv, 'example.com')).toBe(null);
});

test('a claimed domain cannot be listed/hijacked by a different email', async () => {
  // owner@x.io already claims + lists example.com.
  const kv = makeKv({
    'w:example.com': JSON.stringify({ domain: 'example.com', email: 'owner@x.io', listed: true }),
    'l:example.com': JSON.stringify({
      domain: 'example.com',
      score: 6,
      grade: 'A',
      tier: 'Clean',
      listedAt: 'orig',
    }),
  });
  const env = { RESULTS: kv };

  // attacker@evil.io tries to take over (change email) and delist.
  const res = await watchPost({
    request: postReq({ domain: 'example.com', email: 'attacker@evil.io', list: false }),
    env,
  });
  expect(res.status).toBe(403);

  // The watch + listing are untouched.
  const watch = await getWatch(kv, 'example.com');
  expect(watch.email).toBe('owner@x.io');
  expect(await getListing(kv, 'example.com'), 'listing survives the hijack attempt').toBeTruthy();
});

test('/directory labels a listed-but-unscored domain "Pending", not "Unlisted"', async () => {
  const kv = makeKv();
  // List a domain that has never been scored (tier/score null).
  await setListing(kv, {
    domain: 'fresh.com',
    score: null,
    grade: null,
    tier: null,
    id: null,
    title: null,
  });
  const res = await directoryGet({
    request: { url: 'https://slop-detect.com/directory' },
    env: { RESULTS: kv },
  });
  const html = await res.text();
  expect(html, 'pending rows are labeled Pending').toMatch(/Pending/);
  expect(html, 'a listed row is never labeled Unlisted').not.toMatch(/Unlisted/);
});

// ── re-scan refreshes a listed domain's directory entry ──────────────────────
test('recordScanForWatch refreshes the listing for a listed, watched domain', async () => {
  const kv = makeKv({
    'w:example.com': JSON.stringify({
      domain: 'example.com',
      email: 'o@x.io',
      listed: true,
      baselineScore: 6,
      baselineTier: 'Clean',
    }),
    'l:example.com': JSON.stringify({
      domain: 'example.com',
      score: 6,
      grade: 'A',
      tier: 'Clean',
      listedAt: 'orig',
    }),
  });
  // A regressing re-scan should both flag the watch and update the directory.
  await recordScanForWatch(kv, slim({ id: 'r9', score: 45, grade: 'D', tier: 'Heavy' }));
  const listing = await getListing(kv, 'example.com');
  expect(listing.score, 'directory tracks the new score').toBe(45);
  expect(listing.listedAt, 'listed-since is preserved').toBe('orig');
});

test('recordScanForWatch reconciles away a stale row when the watch is not listed', async () => {
  // watch.listed=false but a directory row lingers (e.g. an earlier delist that
  // didn't land). A scan should remove it — the scan is the reconciler.
  const kv = makeKv({
    'w:example.com': JSON.stringify({
      domain: 'example.com',
      email: 'o@x.io',
      listed: false,
      baselineScore: 6,
      baselineTier: 'Clean',
    }),
    'l:example.com': JSON.stringify({
      domain: 'example.com',
      score: 6,
      grade: 'A',
      tier: 'Clean',
      listedAt: 'orig',
    }),
  });
  await recordScanForWatch(kv, slim({ id: 'r9', score: 7, grade: 'A-', tier: 'Clean' }));
  expect(await getListing(kv, 'example.com'), 'stale row reconciled away').toBe(null);
});
