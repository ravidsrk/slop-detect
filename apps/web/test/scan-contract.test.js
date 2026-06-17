// Contract-shape tests for POST /api/scan (parity-spec Optional task 17).
//
// /api/scan is the one engine seam the floor flags as untested (old-product-
// inventory "Direct-test gaps"): it hard-requires a Cloudflare BROWSER binding,
// so it never ran under vitest. We don't need a real Chromium to lock the
// response CONTRACT, though — the handler funnels all browser I/O through
// `puppeteer.launch(env.BROWSER)` → `page.evaluate(pageScript)`, which returns a
// plain `data` object the Worker then scores. So we mock `@cloudflare/puppeteer`,
// inject the page-eval result, and assert:
//   - the success contract: score/tier/grade/verdict + per-pattern triggered/
//     clean breakdown with weights and evidence, plus the multi-axis shape (MNR-1)
//   - the error contract: 400 (bad JSON / bad URL / blocked redirect),
//     422 (anti-bot / dead page, with a hint), 500 (missing binding), 502
//     (scan/navigation failure) (MNR-3)

import { test, expect, vi, beforeEach } from 'vitest';
import { onRequestPost } from '../functions/api/scan.ts';

// Shared, mutable mock state. vi.hoisted runs before the vi.mock factory and the
// scan.ts import, so the factory can close over it and each test can drive the
// fake browser by mutating these fields in beforeEach / inline.
const mock = vi.hoisted(() => ({
  pageData: null, // resolved value of page.evaluate(pageScript)
  launchError: null, // if set, puppeteer.launch throws (binding/runtime failure)
  gotoError: null, // if set, page.goto throws (navigation failure)
  evalError: null, // if set, page.evaluate throws (page crashed)
  screenshotError: null, // if set, page.screenshot throws (handled, non-fatal)
}));

vi.mock('@cloudflare/puppeteer', () => ({
  default: {
    launch: async () => {
      if (mock.launchError) throw mock.launchError;
      return {
        newPage: async () => ({
          setViewport: async () => {},
          setUserAgent: async () => {},
          goto: async () => {
            if (mock.gotoError) throw mock.gotoError;
          },
          waitForNetworkIdle: async () => {},
          evaluate: async () => {
            if (mock.evalError) throw mock.evalError;
            return mock.pageData;
          },
          screenshot: async () => {
            if (mock.screenshotError) throw mock.screenshotError;
            return Buffer.from('fake-jpeg-bytes');
          },
        }),
        close: async () => {},
      };
    },
  },
}));

// vi.mock is hoisted above the imports, so scan.ts binds to the fake module, never
// the real @cloudflare/puppeteer (which can't load off the Workers runtime).

// In-memory KV that matches the binding surface the handler touches
// (get/put/delete/list), mirroring test/score.test.js.
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
    async list({ prefix = '', limit = 1000 } = {}) {
      const keys = [...store.keys()]
        .filter((k) => k.startsWith(prefix))
        .slice(0, limit)
        .map((name) => ({ name }));
      return { keys, list_complete: true };
    },
  };
}

// A realistic "page rendered fine" eval payload. Five signals carry evidence
// (>= 4 keeps detectBlocked from flagging it as a dead page) and three trip
// triggered:true so we exercise the scored path. Pattern ids are real
// (@slop-detect/core PATTERNS) so applyPreset/scorePatterns score them.
function healthyPageData(over = {}) {
  return {
    title: 'Acme — the AI-native platform',
    url: 'https://acme.example.com/',
    viewport: { w: 1280, h: 800 },
    docHeight: 4200,
    h1Text: 'Build faster with Acme',
    h1Font: 'Inter, sans-serif',
    visibleCount: 140,
    signals: {
      slop_fonts: {
        triggered: true,
        heroIsSlop: true,
        slopCount: 30,
        total: 42,
        ratio: 0.714,
        heroFam: 'Inter, sans-serif',
      },
      purple_accent: { triggered: true, hits: 11, sampled: 42 },
      gradient_text: { triggered: false, count: 0 },
      centered_hero: { triggered: false, centered: false, wide: false },
      all_caps_labels: { triggered: true, count: 6, total: 20 },
    },
    textContext: {
      text: 'Acme is the AI-native platform built for modern teams. '.repeat(8),
      headings: ['Build faster with Acme', 'Why teams choose Acme', 'Pricing'],
      paragraphs: ['Acme is the AI-native platform built for modern teams.'],
      wordCount: 64,
    },
    systemContext: null,
    ...over,
  };
}

const TIERS = ['Clean', 'Mild', 'Heavy'];

function postReq(body, { url = 'https://slop-detect.com/api/scan' } = {}) {
  return {
    url,
    json: async () => body,
  };
}

beforeEach(() => {
  mock.pageData = healthyPageData();
  mock.launchError = null;
  mock.gotoError = null;
  mock.evalError = null;
  mock.screenshotError = null;
});

// ── Success contract (MNR-1) ────────────────────────────────────────────────

test('a healthy scan returns the design-axis scoring contract', async () => {
  const res = await onRequestPost({
    request: postReq({ url: 'https://acme.example.com' }),
    env: { BROWSER: {} }, // no RESULTS → persistence skipped; pure scoring shape
  });
  expect(res.status).toBe(200);
  expect(res.headers.get('Content-Type')).toBe('application/json');
  const r = await res.json();

  // Echoed request + page identity.
  expect(r.url).toBe('https://acme.example.com');
  expect(r.finalUrl).toBe('https://acme.example.com/');
  expect(r.title).toBe('Acme — the AI-native platform');
  expect(r.h1).toBe('Build faster with Acme');
  expect(r.h1Font).toBe('Inter, sans-serif');

  // The scoring headline (MNR-1: 0-100 score, tier, letter grade, verdict line).
  expect(typeof r.score).toBe('number');
  expect(r.score).toBeGreaterThanOrEqual(8); // slop_fonts alone weighs 8
  expect(r.score).toBeLessThanOrEqual(100);
  expect(TIERS).toContain(r.tier);
  expect(typeof r.grade).toBe('string');
  expect(r.grade.length).toBeGreaterThan(0);
  expect(typeof r.verdict).toBe('string');
  expect(r.verdict.length).toBeGreaterThan(0);
  expect(r.definitionsVersion).toBeTruthy();

  // Preset defaults to "full"; navMs is reported; no screenshot unless requested.
  expect(r.preset).toBe('full');
  expect(typeof r.navMs).toBe('number');
  expect(r.screenshot).toBeNull();

  // Per-pattern triggered/clean breakdown with weights + evidence (MNR-1).
  expect(Array.isArray(r.patterns)).toBe(true);
  expect(r.patterns.length).toBe(r.patternsTotal);
  for (const p of r.patterns) {
    expect(typeof p.id).toBe('string');
    expect(typeof p.label).toBe('string');
    expect(typeof p.weight).toBe('number');
    expect(typeof p.triggered).toBe('boolean');
    expect(p.evidence).toBeTypeOf('object');
  }
  // patternsFlagged matches the count of triggered rows we injected (3).
  const flagged = r.patterns.filter((p) => p.triggered);
  expect(r.patternsFlagged).toBe(flagged.length);
  expect(r.patternsFlagged).toBe(3);
  const fonts = r.patterns.find((p) => p.id === 'slop_fonts');
  expect(fonts.triggered).toBe(true);
  expect(fonts.evidence.heroIsSlop).toBe(true);
});

test('axes:[design,copy] adds the multi-axis shape + unified headline', async () => {
  const res = await onRequestPost({
    request: postReq({ url: 'https://acme.example.com', axes: ['design', 'copy'] }),
    env: { BROWSER: {} },
  });
  expect(res.status).toBe(200);
  const r = await res.json();

  expect(r.axes).toBeTypeOf('object');
  // Design axis summary carries the same scored patterns.
  expect(r.axes.design.axis).toBe('design');
  expect(r.axes.design.score).toBe(r.score);
  expect(r.axes.design.tier).toBe(r.tier);
  expect(Array.isArray(r.axes.design.patterns)).toBe(true);
  // Copy axis ran (wordCount 64 > 40 threshold → not "thin").
  expect(r.axes.copy.axis).toBe('copy');
  expect(typeof r.axes.copy.score).toBe('number');
  expect(TIERS).toContain(r.axes.copy.tier);
  expect(typeof r.axes.copy.grade).toBe('string');
  expect(typeof r.axes.copy.patternsFlagged).toBe('number');
  expect(Array.isArray(r.axes.copy.patterns)).toBe(true);
  expect(r.axes.copy.thin).toBe(false);

  // Unified roll-up (combineAxes): max of axis scores, clamped, with the list of
  // axes that were scored.
  expect(typeof r.unifiedScore).toBe('number');
  expect(r.unifiedScore).toBeLessThanOrEqual(100);
  expect(TIERS).toContain(r.unifiedTier);
  expect(typeof r.unifiedGrade).toBe('string');
  expect(r.axesScored).toEqual(['design', 'copy']);
});

test('the design axis is the default when no axes are requested', async () => {
  const res = await onRequestPost({
    request: postReq({ url: 'https://acme.example.com' }),
    env: { BROWSER: {} },
  });
  const r = await res.json();
  // Backward-compatible default: copy axis is NOT run, so no axes/unified keys.
  expect(r.axes).toBeUndefined();
  expect(r.unifiedScore).toBeUndefined();
});

test('share persistence mints an id + permalink and writes the KV snapshot', async () => {
  const kv = makeKv();
  const res = await onRequestPost({
    request: postReq({ url: 'https://acme.example.com' }),
    env: { BROWSER: {}, RESULTS: kv },
  });
  expect(res.status).toBe(200);
  const r = await res.json();

  expect(typeof r.id).toBe('string');
  expect(r.id.length).toBeGreaterThan(0);
  expect(r.resultUrl).toBe(`https://slop-detect.com/r/${r.id}`);
  // The slim snapshot landed under r:<id> and the domain pointer under d:<domain>.
  expect(kv.store.has(`r:${r.id}`)).toBe(true);
  expect(kv.store.has('d:acme.example.com')).toBe(true);
  const slim = JSON.parse(kv.store.get(`r:${r.id}`));
  expect(slim.score).toBe(r.score);
  expect(slim.tier).toBe(r.tier);
  expect(Array.isArray(slim.triggered)).toBe(true);
  expect(slim.triggered.length).toBe(r.patternsFlagged);
});

test('share:false opts out of persistence (no id, no KV writes)', async () => {
  const kv = makeKv();
  const res = await onRequestPost({
    request: postReq({ url: 'https://acme.example.com', share: false }),
    env: { BROWSER: {}, RESULTS: kv },
  });
  const r = await res.json();
  expect(r.id).toBeUndefined();
  expect(r.resultUrl).toBeUndefined();
  expect(kv.store.size).toBe(0);
});

test('screenshot:true returns a base64 jpeg data URL', async () => {
  const res = await onRequestPost({
    request: postReq({ url: 'https://acme.example.com', screenshot: true }),
    env: { BROWSER: {} },
  });
  const r = await res.json();
  expect(typeof r.screenshot).toBe('string');
  expect(r.screenshot.startsWith('data:image/jpeg;base64,')).toBe(true);
});

// ── Error contract (MNR-3 + the documented 400/422/500/502 states) ───────────

test('500 when the BROWSER binding is missing', async () => {
  const res = await onRequestPost({
    request: postReq({ url: 'https://acme.example.com' }),
    env: {}, // no BROWSER binding
  });
  expect(res.status).toBe(500);
  const r = await res.json();
  expect(r.error).toMatch(/BROWSER binding/);
});

test('400 on an unparseable JSON body', async () => {
  const res = await onRequestPost({
    request: {
      url: 'https://slop-detect.com/api/scan',
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    },
    env: { BROWSER: {} },
  });
  expect(res.status).toBe(400);
  const r = await res.json();
  expect(r.error).toBe('Invalid JSON body');
});

test('400 on a missing url', async () => {
  const res = await onRequestPost({
    request: postReq({}),
    env: { BROWSER: {} },
  });
  expect(res.status).toBe(400);
  const r = await res.json();
  expect(r.error).toMatch(/url is required/);
});

test('400 on a non-http(s) scheme (SSRF surface)', async () => {
  const res = await onRequestPost({
    request: postReq({ url: 'file:///etc/passwd' }),
    env: { BROWSER: {} },
  });
  expect(res.status).toBe(400);
  const r = await res.json();
  expect(r.error).toMatch(/http\(s\)/);
});

test('400 blocked_redirect when the page lands on a private host', async () => {
  // The pre-flight host check passes (public host requested), but the page
  // reports a final location on the cloud-metadata IP → refuse to hand back content.
  mock.pageData = healthyPageData({ url: 'http://169.254.169.254/' });
  const res = await onRequestPost({
    request: postReq({ url: 'https://acme.example.com' }),
    env: { BROWSER: {} },
  });
  expect(res.status).toBe(400);
  const r = await res.json();
  expect(r.code).toBe('blocked_redirect');
  expect(r.finalUrl).toBe('http://169.254.169.254/');
});

test('422 cloudflare_challenge carries a code + hint, not a fake Clean 0', async () => {
  mock.pageData = healthyPageData({ title: 'Just a moment...', h1Text: null });
  const res = await onRequestPost({
    request: postReq({ url: 'https://acme.example.com' }),
    env: { BROWSER: {} },
  });
  expect(res.status).toBe(422);
  const r = await res.json();
  expect(r.code).toBe('cloudflare_challenge');
  expect(typeof r.hint).toBe('string');
  expect(r.hint.length).toBeGreaterThan(0);
  // Critically: an anti-bot wall must NOT be scored as a clean page.
  expect(r.score).toBeUndefined();
});

test('422 empty_page for a dead/sparse render', async () => {
  mock.pageData = healthyPageData({
    title: '',
    h1Text: null,
    visibleCount: 0,
    signals: {},
  });
  const res = await onRequestPost({
    request: postReq({ url: 'https://acme.example.com' }),
    env: { BROWSER: {} },
  });
  expect(res.status).toBe(422);
  const r = await res.json();
  expect(r.code).toBe('empty_page');
  expect(typeof r.hint).toBe('string');
});

test('422 access_blocked for an anti-bot title with sparse DOM', async () => {
  mock.pageData = healthyPageData({ title: 'Access Denied', h1Text: null, visibleCount: 5 });
  const res = await onRequestPost({
    request: postReq({ url: 'https://acme.example.com' }),
    env: { BROWSER: {} },
  });
  expect(res.status).toBe(422);
  const r = await res.json();
  expect(r.code).toBe('access_blocked');
  expect(typeof r.hint).toBe('string');
});

test('502 when navigation throws', async () => {
  mock.gotoError = new Error('Navigation timeout of 25000 ms exceeded');
  const res = await onRequestPost({
    request: postReq({ url: 'https://acme.example.com' }),
    env: { BROWSER: {} },
  });
  expect(res.status).toBe(502);
  const r = await res.json();
  expect(r.error).toMatch(/Navigation timeout/);
});

test('502 when puppeteer.launch fails', async () => {
  mock.launchError = new Error('Browser binding unavailable');
  const res = await onRequestPost({
    request: postReq({ url: 'https://acme.example.com' }),
    env: { BROWSER: {} },
  });
  expect(res.status).toBe(502);
  const r = await res.json();
  expect(r.error).toMatch(/Browser binding unavailable/);
});
