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
  cleanupLegacyListings,
  performUnsubscribe,
  recordScanForWatch,
  getWatch,
  putWatch,
} from '../functions/_shared.ts';

// Flip a stored watch to email-verified (what the confirm click does), so
// listing activation can be exercised without the token/email plumbing.
async function verifyWatch(kv, domain) {
  const w = await getWatch(kv, domain);
  w.verified = true;
  await putWatch(kv, w);
}
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
test('/directory renders a rel="ugc nofollow" link to each listed site', async () => {
  const kv = makeKv();
  await setListing(kv, slim({ domain: 'example.com', score: 8, grade: 'A-', tier: 'Clean' }));
  const res = await directoryGet({
    request: { url: 'https://slop-detect.com/directory' },
    env: { RESULTS: kv },
  });
  expect(res.status).toBe(200);
  const html = await res.text();
  expect(html, 'links out to the site').toMatch(/href="https:\/\/example\.com"/);
  expect(html, 'user-submitted links carry no ranking credit').toMatch(
    /href="https:\/\/example\.com" rel="ugc nofollow noopener"/
  );
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
  // Unverified claim: listing intent is recorded but NOT public yet — an
  // unproven email can never publish a directory link.
  expect(j.directoryUrl).toBe(null);
  expect(await getListing(kv, 'example.com'), 'no public row before verification').toBe(null);

  // After email verification, re-subscribing activates the public listing.
  await verifyWatch(kv, 'example.com');
  res = await watchPost({
    request: postReq({ domain: 'example.com', email: 'o@x.io', list: true }),
    env,
  });
  j = await res.json();
  expect(j.directoryUrl.endsWith('/directory')).toBeTruthy();
  expect(await getListing(kv, 'example.com'), 'listing created once verified').toBeTruthy();

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
  await verifyWatch(kv, 'example.com');
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

test('a VERIFIED claimed domain cannot be listed/hijacked by a different email', async () => {
  // owner@x.io already claims (verified) + lists example.com.
  const kv = makeKv({
    'w:example.com': JSON.stringify({
      domain: 'example.com',
      email: 'owner@x.io',
      listed: true,
      verified: true,
    }),
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

test('an UNVERIFIED claim does not lock the domain against a different email', async () => {
  // squatter@evil.io typed an email against owner.com but never confirmed it.
  const kv = makeKv({
    'w:example.com': JSON.stringify({
      domain: 'example.com',
      email: 'squatter@evil.io',
      listed: true,
      verified: false,
    }),
    'l:example.com': JSON.stringify({
      domain: 'example.com',
      score: 6,
      grade: 'A',
      tier: 'Clean',
      listedAt: 'orig',
    }),
  });
  const env = { RESULTS: kv };
  // The real owner claims it: allowed (201), and the squatter's stale public
  // row is removed until the new claim verifies.
  const res = await watchPost({
    request: postReq({ domain: 'example.com', email: 'owner@x.io', list: true }),
    env,
  });
  expect(res.status).toBe(201);
  const watch = await getWatch(kv, 'example.com');
  expect(watch.email).toBe('owner@x.io');
  expect(watch.verified).toBe(false);
  expect(await getListing(kv, 'example.com')).toBe(null);
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
      verified: true,
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

test('listSites hides (without deleting) legacy rows from unverified claims (pre-verification listings)', async () => {
  // Rows written before listings required verification carry no `v` marker.
  const legacyMeta = (s) => ({ s, g: 'A', tr: 'Clean', id: null, t: '', at: '2026-01-01' });
  const kv = makeKv({
    'l:unverified.example.com': {
      value: JSON.stringify({ domain: 'unverified.example.com', score: 3 }),
      metadata: legacyMeta(3),
    },
    'w:unverified.example.com': JSON.stringify({
      domain: 'unverified.example.com',
      email: 'a@x.io',
      listed: true,
      verified: false,
    }),
    'l:orphan.example.com': {
      value: JSON.stringify({ domain: 'orphan.example.com', score: 4 }),
      metadata: legacyMeta(4),
    },
    'l:verified.example.com': {
      value: JSON.stringify({ domain: 'verified.example.com', score: 5, listedAt: '2026-01-01' }),
      metadata: legacyMeta(5),
    },
    'w:verified.example.com': JSON.stringify({
      domain: 'verified.example.com',
      email: 'b@x.io',
      listed: true,
      verified: true,
    }),
  });
  const { sites } = await listSites(kv);
  expect(sites.map((s) => s.domain)).toEqual(['verified.example.com']);
  // The read path neither deletes nor rewrites listing rows: rejected rows are
  // hidden and recorded in lv:rejected; the verified one is shown as-is.
  expect(kv.store.has('l:unverified.example.com')).toBe(true);
  expect(kv.store.has('l:orphan.example.com')).toBe(true);
  expect(JSON.parse(kv.store.get('lv:rejected').value).sort()).toEqual([
    'orphan.example.com',
    'unverified.example.com',
  ]);
  expect(kv.store.get('l:verified.example.com').metadata.v).toBeUndefined();
  // /api/sites serves the filtered view too.
  const res = await sitesGet({
    request: { url: 'https://slop-detect.com/api/sites' },
    env: { RESULTS: kv },
  });
  const body = await res.json();
  const domains = (body.sites || []).map((s) => s.domain);
  expect(domains).toEqual(['verified.example.com']);
});

test('a directory read racing an unsubscribe cannot resurrect the removed listing', async () => {
  const kv = makeKv({
    'l:racy.example.com': {
      value: JSON.stringify({ domain: 'racy.example.com', score: 2 }),
      metadata: { s: 2, g: 'A', tr: 'Clean', id: null, t: '', at: '2026-01-01' },
    },
    'w:racy.example.com': JSON.stringify({
      domain: 'racy.example.com',
      email: 'o@x.io',
      listed: true,
      verified: true,
    }),
  });
  // performUnsubscribe lands right after listSites' watch check reads the
  // still-verified watch: it removes the listing row and the watch.
  const origGet = kv.get.bind(kv);
  let unsubscribed = false;
  kv.get = async (k) => {
    const v = await origGet(k);
    if (k === 'w:racy.example.com' && !unsubscribed) {
      unsubscribed = true;
      await performUnsubscribe(kv, 'racy.example.com', 'o@x.io');
    }
    return v;
  };
  const listingWrites = [];
  const origPut = kv.put.bind(kv);
  kv.put = async (k, v, o) => {
    if (k.startsWith('l:')) listingWrites.push(k);
    return origPut(k, v, o);
  };
  await listSites(kv);
  expect(unsubscribed, 'the simulated removal actually ran').toBe(true);
  expect(listingWrites, 'the read path never writes a listing row').toEqual([]);
  expect(kv.store.has('l:racy.example.com'), 'listing stays removed').toBe(false);
  expect(kv.store.has('w:racy.example.com'), 'watch stays removed').toBe(false);
  // A later directory read doesn't bring it back either.
  kv.get = origGet;
  const again = await listSites(kv);
  expect(again.sites).toEqual([]);
});

test('a listing confirmed while a directory read checks the legacy row is not deleted', async () => {
  // Legacy row + still-unverified watch: the read path will classify it as
  // rejected. Confirmation lands right after the watch read, verifying the
  // watch and writing a fresh v:1 row for the same domain.
  const kv = makeKv({
    'l:late.example.com': {
      value: JSON.stringify({ domain: 'late.example.com', score: 2 }),
      metadata: { s: 2, g: 'A', tr: 'Clean', id: null, t: '', at: '2026-01-01' },
    },
    'w:late.example.com': JSON.stringify({
      domain: 'late.example.com',
      email: 'o@x.io',
      listed: true,
      verified: false,
    }),
  });
  const origGet = kv.get.bind(kv);
  let confirmed = false;
  kv.get = async (k) => {
    const v = await origGet(k);
    if (k === 'w:late.example.com' && !confirmed) {
      confirmed = true;
      await verifyWatch(kv, 'late.example.com');
      await setListing(kv, { domain: 'late.example.com', score: 3, grade: 'A', tier: 'Clean' });
    }
    return v;
  };
  const first = await listSites(kv);
  expect(confirmed, 'the simulated confirm actually ran').toBe(true);
  expect(first.sites).toEqual([]); // classified from the pre-confirm read
  // The confirmed row survived the read and is served from now on.
  expect(kv.store.get('l:late.example.com').metadata.v).toBe(1);
  kv.get = origGet;
  const again = await listSites(kv);
  expect(again.sites.map((x) => x.domain)).toEqual(['late.example.com']);
});

test('valid legacy listings beyond one request budget become visible on later requests', async () => {
  const seed = {};
  for (let i = 0; i < 51; i++) {
    const d = `ok${String(i).padStart(3, '0')}.example.com`;
    seed[`l:${d}`] = { value: '{}', metadata: { s: 1, at: '2026-01-01' } };
    seed[`w:${d}`] = JSON.stringify({ domain: d, email: 'o@x.io', listed: true, verified: true });
  }
  const kv = makeKv(seed);
  let watchReads = 0;
  const origGet = kv.get.bind(kv);
  kv.get = async (k) => {
    if (k.startsWith('w:')) watchReads++;
    return origGet(k);
  };
  const first = await listAllSites(kv);
  expect(first.length).toBe(50); // bounded: one row still pending
  expect(watchReads).toBe(50);
  watchReads = 0;
  const second = await listAllSites(kv);
  expect(second.length).toBe(51); // progress carried across requests
  expect(watchReads).toBe(1); // only the previously unchecked row
  watchReads = 0;
  expect((await listAllSites(kv)).length).toBe(51);
  expect(watchReads).toBe(0); // steady state: no per-row reads
  // Listing rows themselves were never rewritten.
  expect(kv.store.get('l:ok000.example.com').metadata.v).toBeUndefined();
});

test('legacy cleanup is bounded per request: watch checks capped, rows scanned capped', async () => {
  const seed = {};
  for (let i = 0; i < 120; i++) {
    seed[`l:orphan${String(i).padStart(3, '0')}.example.com`] = {
      value: '{}',
      metadata: { s: 1, at: '2026-01-01' },
    };
  }
  const kv = makeKv(seed);
  let watchReads = 0;
  const origGet = kv.get.bind(kv);
  kv.get = async (k) => {
    if (k.startsWith('w:')) watchReads++;
    return origGet(k);
  };
  const first = await listAllSites(kv);
  expect(first).toEqual([]);
  expect(watchReads).toBe(50); // one request's legacy budget
  // Classification continues on later requests (rejected rows stay hidden and
  // are never re-checked once indexed)…
  watchReads = 0;
  expect(await listAllSites(kv)).toEqual([]);
  expect(watchReads).toBe(50);
  watchReads = 0;
  expect(await listAllSites(kv)).toEqual([]);
  expect(watchReads).toBe(20);
  watchReads = 0;
  expect(await listAllSites(kv)).toEqual([]);
  expect(watchReads).toBe(0); // steady state
  expect(JSON.parse(kv.store.get('lv:rejected').value).length).toBe(120);

  // Raw rows scanned (not just rows returned) bound the walk.
  const big = makeKv(seed);
  let listed = 0;
  const origList = big.list.bind(big);
  big.list = async (opts) => {
    const r = await origList(opts);
    listed += r.keys.length;
    return r;
  };
  await listAllSites(big, { max: 30 });
  expect(listed).toBe(30);
});

test('a block of rejected legacy rows larger than the row limit cannot hide a later confirmed listing', async () => {
  // Paginating KV: honors limit + cursor like Workers KV list().
  const seed = {};
  const rejected = [];
  for (let i = 0; i < 40; i++) {
    const d = `a${String(i).padStart(3, '0')}.example.com`;
    seed[`l:${d}`] = { value: '{}', metadata: { s: 1, at: '2026-01-01' } };
    rejected.push(d);
  }
  seed['lv:rejected'] = JSON.stringify(rejected);
  const kv = makeKv(seed);
  await setListing(kv, { domain: 'zz-confirmed.example.com', score: 2, grade: 'A', tier: 'Clean' });
  kv.list = async ({ prefix = '', limit = 1000, cursor } = {}) => {
    const names = [...kv.store.keys()].filter((n) => n.startsWith(prefix)).sort();
    const start = cursor ? Number(cursor) : 0;
    const page = names.slice(start, start + limit);
    const next = start + page.length;
    return {
      keys: page.map((n) => ({ name: n, metadata: kv.store.get(n).metadata })),
      list_complete: next >= names.length,
      cursor: next >= names.length ? undefined : String(next),
    };
  };
  let watchReads = 0;
  const origGet = kv.get.bind(kv);
  kv.get = async (k) => {
    if (k.startsWith('w:')) watchReads++;
    return origGet(k);
  };
  // Row limit (30) is smaller than the block of 40 rejected rows ahead of it.
  for (let i = 0; i < 2; i++) {
    const sites = await listAllSites(kv, { max: 30 });
    expect(sites.map((x) => x.domain)).toEqual(['zz-confirmed.example.com']);
  }
  expect(watchReads).toBe(0); // rejected rows are skipped without reads
  expect(kv.store.has('l:a000.example.com'), 'still read-only: nothing deleted').toBe(true);
});

// ── Off-read-path legacy cleanup (daily sweep) ──────────────────────────────
const legacyRow = (s = 1) => ({ value: '{}', metadata: { s, at: '2026-01-01' } });

function paginate(kv) {
  kv.list = async ({ prefix = '', limit = 1000, cursor } = {}) => {
    const names = [...kv.store.keys()].filter((n) => n.startsWith(prefix)).sort();
    const start = cursor ? Number(cursor) : 0;
    const page = names.slice(start, start + limit);
    const next = start + page.length;
    return {
      keys: page.map((n) => ({ name: n, metadata: kv.store.get(n).metadata })),
      list_complete: next >= names.length,
      cursor: next >= names.length ? undefined : String(next),
    };
  };
  return kv;
}

test('cleanup deletes a stale rejected legacy row and drops it from lv:rejected', async () => {
  const kv = makeKv({
    'l:stale.example.com': legacyRow(),
    'w:stale.example.com': JSON.stringify({
      domain: 'stale.example.com',
      email: 'o@x.io',
      listed: true,
      verified: false,
    }),
    'l:keep.example.com': legacyRow(),
    'w:keep.example.com': JSON.stringify({
      domain: 'keep.example.com',
      email: 'o@x.io',
      listed: true,
      verified: true,
    }),
    'lv:rejected': JSON.stringify(['stale.example.com']),
  });
  const r = await cleanupLegacyListings(kv);
  expect(r.deleted).toBe(1);
  expect(kv.store.has('l:stale.example.com')).toBe(false);
  expect(kv.store.has('lv:rejected')).toBe(false);
  // A legacy row with a listed+verified watch is never deleted; it's indexed.
  expect(kv.store.has('l:keep.example.com')).toBe(true);
  expect(JSON.parse(kv.store.get('lv:verified').value)).toEqual(['keep.example.com']);
  expect((await listAllSites(kv)).map((x) => x.domain)).toEqual(['keep.example.com']);
});

test('cleanup restores a listing confirmed between its re-read and the delete', async () => {
  const kv = makeKv({
    'l:late.example.com': legacyRow(),
    'w:late.example.com': JSON.stringify({
      domain: 'late.example.com',
      email: 'o@x.io',
      listed: true,
      verified: false,
      lastScore: 4,
      lastGrade: 'A',
      lastTier: 'Clean',
      lastId: 'abc',
    }),
    'lv:rejected': JSON.stringify(['late.example.com']),
  });
  // Confirm lands right after cleanup's pre-delete watch check: it verifies
  // the watch, then writes its v:1 row (which the delete then removes).
  const origGet = kv.get.bind(kv);
  let confirmed = false;
  kv.get = async (k) => {
    const v = await origGet(k);
    if (k === 'w:late.example.com' && !confirmed) {
      confirmed = true;
      await verifyWatch(kv, 'late.example.com');
      await setListing(kv, {
        domain: 'late.example.com',
        score: 4,
        grade: 'A',
        tier: 'Clean',
        id: 'abc',
      });
    }
    return v;
  };
  const r = await cleanupLegacyListings(kv);
  expect(confirmed, 'the simulated confirm actually ran').toBe(true);
  expect(r.restored).toBe(1);
  const row = kv.store.get('l:late.example.com');
  expect(row, 'confirmed listing is present').toBeTruthy();
  expect(row.metadata.v).toBe(1);
  expect(JSON.parse(row.value)).toMatchObject({ domain: 'late.example.com', score: 4, id: 'abc' });
  kv.get = origGet;
  expect((await listAllSites(kv)).map((x) => x.domain)).toEqual(['late.example.com']);
});

test('cleanup leaves a row that was replaced by a confirmed v:1 row before the re-read', async () => {
  const kv = makeKv({ 'lv:rejected': JSON.stringify(['swap.example.com']) });
  await setListing(kv, { domain: 'swap.example.com', score: 1, grade: 'A', tier: 'Clean' });
  const r = await cleanupLegacyListings(kv);
  expect(r.skipped).toBe(1);
  expect(kv.store.get('l:swap.example.com').metadata.v).toBe(1);
  expect(kv.store.has('lv:rejected')).toBe(false);
});

test('cleanup is bounded per run and makes progress across runs', async () => {
  const seed = {};
  const rejected = [];
  for (let i = 0; i < 250; i++) {
    const d = `r${String(i).padStart(3, '0')}.example.com`;
    seed[`l:${d}`] = legacyRow();
    rejected.push(d);
  }
  // Plus unclassified legacy orphans the read path never reached.
  for (let i = 0; i < 30; i++) seed[`l:u${String(i).padStart(3, '0')}.example.com`] = legacyRow();
  seed['lv:rejected'] = JSON.stringify(rejected);
  const kv = paginate(makeKv(seed));
  const legacyLeft = () => [...kv.store.keys()].filter((k) => k.startsWith('l:')).length;

  const r1 = await cleanupLegacyListings(kv);
  expect(r1.processed).toBe(200);
  expect(legacyLeft()).toBe(80);
  expect(JSON.parse(kv.store.get('lv:rejected').value).length).toBe(50);

  const r2 = await cleanupLegacyListings(kv);
  expect(r2.processed).toBe(80); // 50 rejected + 30 found by the namespace walk
  expect(legacyLeft()).toBe(0);
  expect(kv.store.has('lv:rejected')).toBe(false);

  // A small per-run cap still advances through unclassified rows.
  const kv2 = paginate(
    makeKv(
      Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`l:w${i}.example.com`, legacyRow()]))
    )
  );
  const runs = [];
  for (let i = 0; i < 3; i++) runs.push((await cleanupLegacyListings(kv2, { max: 2 })).processed);
  expect(runs).toEqual([2, 2, 1]);
  expect([...kv2.store.keys()].filter((k) => k.startsWith('l:'))).toEqual([]);
});

test('the directory read path still never deletes legacy rows (only the sweep does)', async () => {
  const kv = makeKv({ 'l:orphan-x.example.com': legacyRow() });
  const deletes = [];
  const origDelete = kv.delete.bind(kv);
  kv.delete = async (k) => {
    deletes.push(k);
    return origDelete(k);
  };
  expect(await listAllSites(kv)).toEqual([]);
  expect(await listSites(kv)).toMatchObject({ sites: [] });
  expect(deletes.filter((k) => k.startsWith('l:'))).toEqual([]);
  expect(kv.store.has('l:orphan-x.example.com')).toBe(true);
});
