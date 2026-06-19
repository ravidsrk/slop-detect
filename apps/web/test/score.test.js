// Tests for the per-domain score hub (GET /score/:domain). Renders the handler
// against an in-memory KV mock and asserts on the produced HTML, no browser.

import { test, expect } from 'vitest';
import { saveResult, recordScan, setListing } from '../functions/_shared.ts';
import { onRequestGet } from '../functions/score/[domain].tsx';

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

async function render(kv, domainParam, opts = {}) {
  const query = opts.query || '';
  const env = 'env' in opts ? opts.env : { RESULTS: kv };
  const res = await onRequestGet({
    params: { domain: domainParam },
    request: { url: `https://slop-detect.com/score/${domainParam}${query}` },
    env,
  });
  return { status: res.status, html: await res.text(), res };
}

// The page's OWN CSS must stay dogfood-clean, but the Fixes panel legitimately
// QUOTES slop tells in its remediation copy ("replace Inter…", "no background-clip:
// text on H1"). So the anti-slop guardrail is checked against the <style> block, not
// the body prose.
function styleOf(html) {
  const m = html.match(/<style>([\s\S]*?)<\/style>/);
  return m ? m[1] : '';
}

test('invalid domain returns 400', async () => {
  const { status } = await render(makeKv(), 'not a domain');
  expect(status).toBe(400);
});

test('unknown domain renders the empty state with a scan CTA', async () => {
  const { status, html } = await render(makeKv(), 'never-scanned.com');
  expect(status).toBe(404);
  expect(html).toMatch(/No scan recorded/);
  expect(html).toMatch(/\/\?url=never-scanned\.com/);
});

test('a scanned domain renders score, grade, verdict, JSON-LD, canonical', async () => {
  const kv = makeKv();
  const s = slim();
  await saveResult(kv, s);
  await recordScan(kv, s);
  const { status, html } = await render(kv, 'ex.com');
  expect(status).toBe(200);
  expect(html).toMatch(/>D</); // grade
  expect(html).toMatch(/30<small>\/100<\/small>/); // score
  expect(html).toMatch(/Heavy slop/); // verdict
  expect(html).toMatch(/application\/ld\+json/); // AEO structured data
  expect(html).toMatch(/rel="canonical" href="https:\/\/slop-detect\.com\/score\/ex\.com"/);
});

test('an UNCLAIMED domain shows the claim form, no dofollow backlink', async () => {
  const kv = makeKv();
  const s = slim();
  await saveResult(kv, s);
  await recordScan(kv, s);
  const { html } = await render(kv, 'ex.com');
  expect(html).toMatch(/id="claimForm"/);
  expect(html).toMatch(/Claim this page/);
  expect(html).not.toMatch(/rel="dofollow"/);
});

test('a CLAIMED (listed) domain shows a dofollow backlink, not the claim form', async () => {
  const kv = makeKv();
  const s = slim();
  await saveResult(kv, s);
  await recordScan(kv, s);
  await setListing(kv, s); // owner claimed + listed
  const { html } = await render(kv, 'ex.com');
  expect(html).toMatch(/rel="dofollow"/);
  expect(html).toMatch(/Listed in the/);
  expect(html).not.toMatch(/id="claimForm"/);
});

test('peer percentile appears only once enough sites are scanned', async () => {
  const kv = makeKv();
  const target = slim({ id: 't', domain: 'ex.com', score: 5, tier: 'Clean', grade: 'A' });
  await saveResult(kv, target);
  await recordScan(kv, target);
  // only 1 site so far -> no peer line
  let r = await render(kv, 'ex.com');
  expect(r.html).not.toMatch(/Cleaner than/);
  // seed four more scans so the corpus crosses the >=5 threshold
  for (let i = 0; i < 4; i++) {
    await recordScan(kv, slim({ id: 'x' + i, domain: `d${i}.com`, score: 40 + i, tier: 'Heavy' }));
  }
  r = await render(kv, 'ex.com');
  expect(r.html).toMatch(/Cleaner than <strong>/);
});

test('the page links to this scan, the printable report, and a re-scan', async () => {
  const kv = makeKv();
  const s = slim();
  await saveResult(kv, s);
  await recordScan(kv, s);
  const { html } = await render(kv, 'ex.com');
  expect(html).toMatch(/href="https:\/\/slop-detect\.com\/r\/sc0re001"/);
  expect(html).toMatch(/href="https:\/\/slop-detect\.com\/report\/ex\.com"/);
  expect(html).toMatch(/\/\?url=ex\.com/);
});

test('the densest sections render: 120px numeral, category bars, breakdown, axes', async () => {
  const kv = makeKv();
  const s = slim();
  await saveResult(kv, s);
  await recordScan(kv, s);
  const { html } = await render(kv, 'ex.com');
  // the big serif numeral (120px token) and the score/100 readout
  expect(styleOf(html)).toMatch(/--fs-score:\s*120px/);
  expect(html).toMatch(/class="bs-num"/);
  // five-up category bars, the expandable breakdown (keyboard-operable), the strip
  expect(html).toMatch(/class="cbar-fill"/);
  expect(html).toMatch(/data-toggle/);
  expect(html).toMatch(/aria-expanded/);
  expect(html).toMatch(/lower is better/); // four-axis polarity note
  expect(html).toMatch(/competitive analytics/);
  expect(html).toMatch(/Copy the full fix prompt/);
});

test('the first dirty breakdown category is open by default', async () => {
  const kv = makeKv();
  const s = slim(); // slop_fonts triggered → the Type category is dirty
  await saveResult(kv, s);
  await recordScan(kv, s);
  const { html } = await render(kv, 'ex.com');
  expect(html).toMatch(/data-open="1"/); // at least one category opens
  expect(html).toMatch(/aria-expanded="true"/);
});

test('loading placeholder renders a scanning skeleton (?preview=loading)', async () => {
  const { status, html } = await render(makeKv(), 'ex.com', { query: '?preview=loading' });
  expect(status).toBe(200);
  expect(html).toMatch(/scanning…/);
  expect(html).toMatch(/aria-busy="true"/);
  expect(html).toMatch(/name="robots" content="noindex"/);
});

test('error/retry state renders when the scoring store is unavailable', async () => {
  // No RESULTS binding is a misconfiguration, not "never scanned": surface an
  // honest 503 retry state, never a misleading clean/empty page.
  const { status, html } = await render(makeKv(), 'ex.com', { env: {} });
  expect(status).toBe(503);
  expect(html).toMatch(/Score unavailable/);
  expect(html).toMatch(/Retry/);
  expect(html).toMatch(/\/\?url=ex\.com/); // a rescan escape hatch
  expect(html).toMatch(/name="robots" content="noindex"/);
});

const LB_SAMPLE = {
  sites: [
    {
      domain: 'stripe.com',
      category: 'saas',
      scored: true,
      score: 4,
      grade: 'A',
      tier: 'Clean',
      title: 'Stripe',
    },
    {
      domain: 'ex.com',
      category: 'saas',
      scored: true,
      score: 30,
      grade: 'D',
      tier: 'Heavy',
      title: 'Ex',
    },
    {
      domain: 'news.ycombinator.com',
      category: 'classic',
      scored: true,
      score: 6,
      grade: 'A-',
      tier: 'Clean',
    },
  ],
};

function withFetch(impl, fn) {
  const orig = globalThis.fetch;
  globalThis.fetch = impl;
  return Promise.resolve(fn()).finally(() => {
    globalThis.fetch = orig;
  });
}

test('peer analytics renders rank-average overlay and neighbors when data is present', async () => {
  const kv = makeKv();
  const s = slim({ domain: 'ex.com' });
  await saveResult(kv, s);
  for (let i = 0; i < 5; i++) {
    await recordScan(kv, slim({ id: 'seed' + i, domain: `d${i}.com`, score: 20 + i }));
  }
  await recordScan(kv, s);
  await withFetch(
    async (url) => {
      if (String(url).endsWith('/leaderboard.json')) {
        return new Response(JSON.stringify(LB_SAMPLE), { status: 200 });
      }
      throw new Error('unexpected fetch: ' + url);
    },
    async () => {
      const { html } = await render(kv, 'ex.com');
      expect(html).toMatch(/--- rank avg/);
      expect(html).toMatch(/stroke-dasharray="3 3"/);
      expect(html).toMatch(/SaaS &amp; dev tools neighbors/);
      expect(html).toMatch(/href="https:\/\/slop-detect\.com\/score\/stripe\.com"/);
      expect(html).toMatch(/nb-you/);
    }
  );
});

test('neighbors tile always includes the you row at true rank when domain ranks below top 6', async () => {
  const kv = makeKv();
  const s = slim({ domain: 'slow.com', score: 90, tier: 'Heavy', grade: 'F' });
  await saveResult(kv, s);
  await recordScan(kv, s);
  const lbLarge = {
    sites: [
      { domain: 'a.com', category: 'saas', scored: true, score: 1, grade: 'A+', tier: 'Clean' },
      { domain: 'b.com', category: 'saas', scored: true, score: 2, grade: 'A', tier: 'Clean' },
      { domain: 'c.com', category: 'saas', scored: true, score: 3, grade: 'A', tier: 'Clean' },
      { domain: 'd.com', category: 'saas', scored: true, score: 4, grade: 'A-', tier: 'Clean' },
      { domain: 'e.com', category: 'saas', scored: true, score: 5, grade: 'B+', tier: 'Clean' },
      { domain: 'f.com', category: 'saas', scored: true, score: 6, grade: 'B', tier: 'Clean' },
      { domain: 'g.com', category: 'saas', scored: true, score: 7, grade: 'B-', tier: 'Clean' },
      {
        domain: 'slow.com',
        category: 'saas',
        scored: true,
        score: 90,
        grade: 'F',
        tier: 'Heavy',
        title: 'Slow',
      },
    ],
  };
  await withFetch(
    async (url) => {
      if (String(url).endsWith('/leaderboard.json')) {
        return new Response(JSON.stringify(lbLarge), { status: 200 });
      }
      throw new Error('unexpected fetch: ' + url);
    },
    async () => {
      const { html } = await render(kv, 'slow.com');
      expect(html).toMatch(/SaaS &amp; dev tools neighbors/);
      expect(html).toMatch(/nb-you/);
      expect(html).toMatch(/#8/);
      expect(html).toMatch(/href="https:\/\/slop-detect\.com\/score\/slow\.com"/);
    }
  );
});

test('peer analytics omits overlay and neighbors when data is insufficient', async () => {
  const kv = makeKv();
  const s = slim({ domain: 'orphan.com' });
  await saveResult(kv, s);
  await recordScan(kv, s);
  await withFetch(
    async (url) => {
      if (String(url).endsWith('/leaderboard.json')) {
        return new Response(JSON.stringify(LB_SAMPLE), { status: 200 });
      }
      throw new Error('unexpected fetch: ' + url);
    },
    async () => {
      const { html } = await render(kv, 'orphan.com');
      expect(html).not.toMatch(/--- rank avg/);
      expect(html).not.toMatch(/class="nb-row/);
    }
  );
});

test('the page is dogfood-clean: its own CSS uses no slop fonts, gradients, or clip-text', async () => {
  const kv = makeKv();
  const s = slim(); // slop_fonts triggered → fix copy QUOTES "Inter" in the body
  await saveResult(kv, s);
  await recordScan(kv, s);
  const { html } = await render(kv, 'ex.com');
  const css = styleOf(html);
  expect(css, 'no slop font-family').not.toMatch(/font-family:[^;}]*(Inter|Geist|Space Grotesk)/i);
  expect(css, 'no gradient text').not.toMatch(/background-clip:\s*text/i);
  expect(css, 'no gradient surfaces').not.toMatch(/(linear|radial)-gradient/i);
  // the light editorial-instrument families are the ones actually loaded
  expect(css).toMatch(/Newsreader/);
  expect(css).toMatch(/JetBrains Mono/);
  // the remediation copy legitimately names the banned font — proof we scoped right
  expect(html).toMatch(/Inter/);
});
