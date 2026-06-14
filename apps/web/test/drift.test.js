// System-drift monitoring (Roadmap v2 P2a) + the agency report page (P2b-lite).
// Pure predicate, watch tracking, sweep alerting, email copy, the /api/watch
// opt-in flag, and /report/:domain rendering — all against in-memory mocks.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isSystemDrift,
  recordScanForWatch,
  getWatch,
  slimResult,
  publicWatch,
  getHistory,
} from '../functions/_shared.js';
import { monitorSweep } from '../functions/_sweep.js';
import { buildDriftAlert } from '../functions/_alerts.js';
import { onRequestPost as watchPost } from '../functions/api/watch.js';
import { onRequestGet as reportGet } from '../functions/report/[domain].js';

function makeKv(seed = {}) {
  const store = new Map(
    Object.entries(seed).map(([k, v]) => [k, typeof v === 'string' ? { value: v } : v])
  );
  return {
    store,
    async get(k) {
      return store.has(k) ? store.get(k).value : null;
    },
    async put(k, v, opts = {}) {
      store.set(k, { value: v, metadata: opts.metadata });
    },
    async delete(k) {
      store.delete(k);
    },
    async list({ prefix = '', limit = 1000 } = {}) {
      const keys = [...store.keys()]
        .filter((n) => n.startsWith(prefix))
        .slice(0, limit)
        .map((n) => ({ name: n, metadata: store.get(n).metadata }));
      return { keys, list_complete: true };
    },
  };
}

const slim = (over = {}) => ({
  id: 'r1',
  domain: 'example.com',
  score: 8,
  grade: 'A-',
  tier: 'Clean',
  createdAt: '2026-06-10T00:00:00.000Z',
  ...over,
});
const sysSlim = (sysOver = {}, over = {}) =>
  slim({
    system: { score: 95, tier: 'Aligned', name: 'Heritage', driftCount: 0, drift: [], ...sysOver },
    ...over,
  });

// ── isSystemDrift (pure) ─────────────────────────────────────────────────────
test('isSystemDrift: falling from an Aligned baseline is drift', () => {
  assert.equal(
    isSystemDrift({ score: 90, tier: 'Aligned' }, { score: 60, tier: 'Drifting' }),
    true
  );
  assert.equal(
    isSystemDrift({ score: 90, tier: 'Aligned' }, { score: 30, tier: 'Off-system' }),
    true
  );
});

test('isSystemDrift: staying Aligned, or improving, is never drift', () => {
  assert.equal(
    isSystemDrift({ score: 85, tier: 'Aligned' }, { score: 82, tier: 'Aligned' }),
    false
  );
  assert.equal(
    isSystemDrift({ score: 40, tier: 'Off-system' }, { score: 70, tier: 'Drifting' }),
    false
  );
});

test('isSystemDrift: a never-Aligned site only drifts on a meaningful worsening (≥15)', () => {
  const base = { score: 60, tier: 'Drifting' };
  assert.equal(isSystemDrift(base, { score: 55, tier: 'Drifting' }), false, '-5 is noise');
  assert.equal(isSystemDrift(base, { score: 45, tier: 'Drifting' }), true, '-15 is drift');
});

test('isSystemDrift: No system / No data tiers never drift', () => {
  assert.equal(
    isSystemDrift({ score: 90, tier: 'Aligned' }, { score: null, tier: 'No system' }),
    false
  );
  assert.equal(
    isSystemDrift({ score: 90, tier: 'Aligned' }, { score: null, tier: 'No data' }),
    false
  );
});

// ── slimResult carries the compact system summary ───────────────────────────
test('slimResult persists a compact system block only when the axis ran', () => {
  const withSys = slimResult(
    {
      url: 'https://example.com',
      score: 8,
      tier: 'Clean',
      grade: 'A-',
      patterns: [],
      system: {
        declared: true,
        score: 70,
        tier: 'Drifting',
        name: 'H',
        drift: [{ id: 'fonts.declared', message: 'inter undeclared', evidence: {} }],
      },
    },
    'id1'
  );
  assert.equal(withSys.system.score, 70);
  assert.equal(withSys.system.drift[0].id, 'fonts.declared');
  assert.equal(withSys.system.drift[0].evidence, undefined, 'evidence blobs are not persisted');

  const noSys = slimResult(
    { url: 'https://x.com', score: 8, tier: 'Clean', grade: 'A-', patterns: [] },
    'id2'
  );
  assert.equal(noSys.system, undefined);

  const undeclared = slimResult(
    {
      url: 'https://x.com',
      score: 8,
      tier: 'Clean',
      grade: 'A-',
      patterns: [],
      system: { declared: false, score: null, tier: 'No system' },
    },
    'id3'
  );
  assert.equal(
    undeclared.system,
    undefined,
    'No-system results are not persisted as compliance data'
  );
});

// ── recordScanForWatch system tracking ───────────────────────────────────────
test('recordScanForWatch sets a system baseline, then flags drift and resets on recovery', async () => {
  const kv = makeKv({
    'w:example.com': JSON.stringify({
      domain: 'example.com',
      email: 'o@x.io',
      system: true,
      verified: true,
    }),
  });

  // First system reading establishes the baseline (Aligned 95) — no drift.
  let out = await recordScanForWatch(kv, sysSlim({}, { id: 's1' }));
  assert.equal(out.system.drifted, false);
  let w = await getWatch(kv, 'example.com');
  assert.equal(w.baselineSystemScore, 95);
  assert.equal(w.baselineSystemTier, 'Aligned');

  // Agent pushes off-system change → drift flagged, drift items stored.
  out = await recordScanForWatch(
    kv,
    sysSlim(
      {
        score: 55,
        tier: 'Drifting',
        drift: [{ id: 'colors.cta', message: 'violet CTA off-palette' }],
      },
      { id: 's2' }
    )
  );
  assert.equal(out.system.drifted, true);
  w = await getWatch(kv, 'example.com');
  assert.equal(w.systemRegressed, true);
  assert.equal(w.lastSystemDrift[0].id, 'colors.cta');
  assert.equal(w.baselineSystemScore, 95, 'baseline must not move');

  // Recovery → flag clears and systemNotified re-arms.
  w.systemNotified = true;
  await kv.put('w:example.com', JSON.stringify(w));
  out = await recordScanForWatch(kv, sysSlim({}, { id: 's3' }));
  w = await getWatch(kv, 'example.com');
  assert.equal(w.systemRegressed, false);
  assert.equal(w.systemNotified, false, 'recovery re-arms the alert');

  // History points carry the system reading.
  const hist = await getHistory(kv, 'example.com');
  assert.equal(hist.length, 3);
  assert.equal(hist[1].sys.tier, 'Drifting');
});

test('a designMd-less scan does not erase system state', async () => {
  const kv = makeKv({
    'w:example.com': JSON.stringify({
      domain: 'example.com',
      email: 'o@x.io',
      baselineSystemScore: 95,
      baselineSystemTier: 'Aligned',
      lastSystemScore: 55,
      lastSystemTier: 'Drifting',
      systemRegressed: true,
    }),
  });
  await recordScanForWatch(kv, slim({ id: 'plain' })); // no .system
  const w = await getWatch(kv, 'example.com');
  assert.equal(w.lastSystemScore, 55, 'system reading untouched');
  assert.equal(w.systemRegressed, true, 'drift flag untouched');
});

// ── sweep: drift alert once, recovery re-arms; scanDomain gets the watch ─────
function sweepHarness(watches) {
  const store = new Map(watches.map((w) => [w.domain, { ...w }]));
  const sent = [],
    drifted = [],
    scanned = [];
  return {
    store,
    sent,
    drifted,
    scanned,
    run: () =>
      monitorSweep({
        watches: [...store.values()],
        scanDomain: async (w) => {
          scanned.push({ domain: w.domain, system: !!w.system });
        },
        getWatch: async (d) => store.get(d) || null,
        putWatch: async (w) => store.set(w.domain, w),
        sendAlert: async (w) => {
          sent.push(w.domain);
          return { sent: true };
        },
        sendDriftAlert: async (w) => {
          drifted.push(w.domain);
          return { sent: true };
        },
      }),
  };
}

test('sweep fires the drift alert exactly once per drift event', async () => {
  const h = sweepHarness([
    {
      domain: 'a.com',
      verified: true,
      system: true,
      regressed: false,
      notified: false,
      systemRegressed: true,
      systemNotified: false,
    },
  ]);
  const s1 = await h.run();
  assert.equal(s1.driftAlerted, 1);
  assert.equal(s1.alerted, 0, 'slop alert independent of drift alert');
  assert.deepEqual(h.drifted, ['a.com']);
  assert.equal(h.store.get('a.com').systemNotified, true);

  const s2 = await h.run();
  assert.equal(s2.driftAlerted, 0, 'no duplicate drift alert');
});

test('sweep can fire BOTH alerts in one pass and passes the watch to scanDomain', async () => {
  const h = sweepHarness([
    {
      domain: 'b.com',
      verified: true,
      system: true,
      regressed: true,
      notified: false,
      systemRegressed: true,
      systemNotified: false,
    },
  ]);
  const s = await h.run();
  assert.equal(s.alerted, 1);
  assert.equal(s.driftAlerted, 1);
  assert.deepEqual(h.scanned, [{ domain: 'b.com', system: true }], 'scanDomain sees watch.system');
});

test('sweep without a sendDriftAlert callback skips drift silently (backward compatible)', async () => {
  const store = new Map([
    ['a.com', { domain: 'a.com', verified: true, systemRegressed: true, systemNotified: false }],
  ]);
  const s = await monitorSweep({
    watches: [...store.values()],
    scanDomain: async () => {},
    getWatch: async (d) => store.get(d),
    putWatch: async (w) => store.set(w.domain, w),
    sendAlert: async () => ({ sent: true }),
  });
  assert.equal(s.driftAlerted, 0);
});

// ── drift email copy ─────────────────────────────────────────────────────────
test('buildDriftAlert names the drift, frames signals-not-verdicts, offers unsubscribe', () => {
  const m = buildDriftAlert(
    'example.com',
    { score: 95, tier: 'Aligned' },
    { score: 55, tier: 'Drifting' },
    [{ id: 'fonts.declared', message: 'font(s) in use but not in the system: inter' }],
    { resultUrl: 'https://slop-detect.com/r/abc' }
  );
  assert.match(m.subject, /example\.com/);
  assert.match(m.subject, /Aligned → Drifting/);
  assert.match(m.text, /inter/);
  assert.match(m.text, /not a verdict/i);
  assert.match(m.text, /unsubscribe/i);
  assert.match(m.text, /\/r\/abc/);
});

// ── /api/watch { system: true } opt-in ──────────────────────────────────────
test('POST /api/watch { system:true } enables compliance monitoring; omit preserves', async () => {
  const kv = makeKv();
  const env = { RESULTS: kv };
  const req = (body) => ({ json: async () => body, url: 'https://slop-detect.com/api/watch' });

  let res = await watchPost({
    request: req({ domain: 'example.com', email: 'o@x.io', system: true }),
    env,
  });
  let j = await res.json();
  assert.equal(j.systemMonitoring, true);

  // Re-subscribe without the flag — preserved.
  res = await watchPost({ request: req({ domain: 'example.com', email: 'o@x.io' }), env });
  j = await res.json();
  assert.equal(j.systemMonitoring, true);

  // Explicit off.
  res = await watchPost({
    request: req({ domain: 'example.com', email: 'o@x.io', system: false }),
    env,
  });
  j = await res.json();
  assert.equal(j.systemMonitoring, false);
});

test('re-subscribing does not erase the system baseline; publicWatch exposes it sans email', async () => {
  const kv = makeKv({
    'w:example.com': JSON.stringify({
      domain: 'example.com',
      email: 'o@x.io',
      system: true,
      baselineSystemScore: 95,
      baselineSystemTier: 'Aligned',
      lastSystemScore: 55,
      lastSystemTier: 'Drifting',
      systemRegressed: true,
      lastSystemDrift: [{ id: 'colors.cta', message: 'off-palette' }],
    }),
  });
  const env = { RESULTS: kv };
  const res = await watchPost({
    request: {
      json: async () => ({ domain: 'example.com', email: 'o@x.io' }),
      url: 'https://slop-detect.com/api/watch',
    },
    env,
  });
  const j = await res.json();
  assert.equal(j.system.baseline.score, 95, 'baseline preserved across re-subscribe');
  assert.equal(j.system.drifted, true);
  assert.equal(j.system.drift[0].id, 'colors.cta');
  assert.ok(!JSON.stringify(j).includes('o@x.io'), 'email never leaks');
});

// ── /report/:domain (P2b-lite) ───────────────────────────────────────────────
test('/report renders scores, system compliance, drift, and history — without the email', async () => {
  const kv = makeKv({
    'd:example.com': 'r9',
    'r:r9': JSON.stringify({
      id: 'r9',
      domain: 'example.com',
      score: 12,
      grade: 'B+',
      tier: 'Mild',
      patternsFlagged: 3,
      patternsTotal: 27,
      definitionsVersion: '2026.08',
      triggered: [{ id: 'slop_fonts', label: 'AI-default font stack', weight: 8 }],
    }),
    'w:example.com': JSON.stringify({
      domain: 'example.com',
      email: 'secret@x.io',
      system: true,
      verified: true,
      lastSystemScore: 55,
      lastSystemTier: 'Drifting',
      systemRegressed: true,
      baselineSystemScore: 95,
      baselineSystemTier: 'Aligned',
      lastSystemDrift: [{ id: 'fonts.declared', message: 'inter undeclared' }],
    }),
    'h:example.com': JSON.stringify([
      {
        id: 'r8',
        score: 8,
        grade: 'A-',
        tier: 'Clean',
        createdAt: '2026-06-01T00:00:00Z',
        sys: { score: 95, tier: 'Aligned' },
      },
      {
        id: 'r9',
        score: 12,
        grade: 'B+',
        tier: 'Mild',
        createdAt: '2026-06-10T00:00:00Z',
        sys: { score: 55, tier: 'Drifting' },
      },
    ]),
  });
  const res = await reportGet({
    params: { domain: 'example.com' },
    request: { url: 'https://slop-detect.com/report/example.com' },
    env: { RESULTS: kv },
  });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /B\+/);
  assert.match(html, /Drifting/);
  assert.match(html, /inter undeclared/);
  assert.match(html, /History/);
  assert.match(html, /@media print/, 'print stylesheet present (the PDF substitute)');
  assert.ok(!html.includes('secret@x.io'), 'email never appears in the report');
  // Anti-slop self-check.
  assert.doesNotMatch(html, /Inter,|Geist|Space Grotesk/);
});

test('/report shows an honest empty state for an unknown domain', async () => {
  const res = await reportGet({
    params: { domain: 'unseen.com' },
    request: { url: 'https://slop-detect.com/report/unseen.com' },
    env: { RESULTS: makeKv() },
  });
  const html = await res.text();
  assert.match(html, /No scan data/i);
});
