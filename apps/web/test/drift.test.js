// System-drift monitoring (Roadmap v2 P2a) + the agency report page (P2b-lite).
// Pure predicate, watch tracking, sweep alerting, email copy, the /api/watch
// opt-in flag, and /report/:domain rendering — all against in-memory mocks.

import { test, expect } from 'vitest';
import {
  isSystemDrift,
  recordScanForWatch,
  getWatch,
  slimResult,
  publicWatch,
  getHistory,
} from '../functions/_shared.ts';
import { monitorSweep } from '../functions/_sweep.ts';
import { buildDriftAlert } from '../functions/_alerts.ts';
import { onRequestPost as watchPost } from '../functions/api/watch.ts';
import { onRequestGet as reportGet } from '../functions/report/[domain].tsx';

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
  expect(isSystemDrift({ score: 90, tier: 'Aligned' }, { score: 60, tier: 'Drifting' })).toBe(true);
  expect(isSystemDrift({ score: 90, tier: 'Aligned' }, { score: 30, tier: 'Off-system' })).toBe(
    true
  );
});

test('isSystemDrift: staying Aligned, or improving, is never drift', () => {
  expect(isSystemDrift({ score: 85, tier: 'Aligned' }, { score: 82, tier: 'Aligned' })).toBe(false);
  expect(isSystemDrift({ score: 40, tier: 'Off-system' }, { score: 70, tier: 'Drifting' })).toBe(
    false
  );
});

test('isSystemDrift: a never-Aligned site only drifts on a meaningful worsening (≥15)', () => {
  const base = { score: 60, tier: 'Drifting' };
  expect(isSystemDrift(base, { score: 55, tier: 'Drifting' }), '-5 is noise').toBe(false);
  expect(isSystemDrift(base, { score: 45, tier: 'Drifting' }), '-15 is drift').toBe(true);
});

test('isSystemDrift: No system / No data tiers never drift', () => {
  expect(isSystemDrift({ score: 90, tier: 'Aligned' }, { score: null, tier: 'No system' })).toBe(
    false
  );
  expect(isSystemDrift({ score: 90, tier: 'Aligned' }, { score: null, tier: 'No data' })).toBe(
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
  expect(withSys.system.score).toBe(70);
  expect(withSys.system.drift[0].id).toBe('fonts.declared');
  expect(withSys.system.drift[0].evidence, 'evidence blobs are not persisted').toBe(undefined);

  const noSys = slimResult(
    { url: 'https://x.com', score: 8, tier: 'Clean', grade: 'A-', patterns: [] },
    'id2'
  );
  expect(noSys.system).toBe(undefined);

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
  expect(undeclared.system, 'No-system results are not persisted as compliance data').toBe(
    undefined
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
  expect(out.system.drifted).toBe(false);
  let w = await getWatch(kv, 'example.com');
  expect(w.baselineSystemScore).toBe(95);
  expect(w.baselineSystemTier).toBe('Aligned');

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
  expect(out.system.drifted).toBe(true);
  w = await getWatch(kv, 'example.com');
  expect(w.systemRegressed).toBe(true);
  expect(w.lastSystemDrift[0].id).toBe('colors.cta');
  expect(w.baselineSystemScore, 'baseline must not move').toBe(95);

  // Recovery → flag clears and systemNotified re-arms.
  w.systemNotified = true;
  await kv.put('w:example.com', JSON.stringify(w));
  out = await recordScanForWatch(kv, sysSlim({}, { id: 's3' }));
  w = await getWatch(kv, 'example.com');
  expect(w.systemRegressed).toBe(false);
  expect(w.systemNotified, 'recovery re-arms the alert').toBe(false);

  // History points carry the system reading.
  const hist = await getHistory(kv, 'example.com');
  expect(hist.length).toBe(3);
  expect(hist[1].sys.tier).toBe('Drifting');
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
  expect(w.lastSystemScore, 'system reading untouched').toBe(55);
  expect(w.systemRegressed, 'drift flag untouched').toBe(true);
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
  expect(s1.driftAlerted).toBe(1);
  expect(s1.alerted, 'slop alert independent of drift alert').toBe(0);
  expect(h.drifted).toEqual(['a.com']);
  expect(h.store.get('a.com').systemNotified).toBe(true);

  const s2 = await h.run();
  expect(s2.driftAlerted, 'no duplicate drift alert').toBe(0);
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
  expect(s.alerted).toBe(1);
  expect(s.driftAlerted).toBe(1);
  expect(h.scanned, 'scanDomain sees watch.system').toEqual([{ domain: 'b.com', system: true }]);
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
  expect(s.driftAlerted).toBe(0);
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
  expect(m.subject).toMatch(/example\.com/);
  expect(m.subject).toMatch(/Aligned → Drifting/);
  expect(m.text).toMatch(/inter/);
  expect(m.text).toMatch(/not a verdict/i);
  expect(m.text).toMatch(/unsubscribe/i);
  expect(m.text).toMatch(/\/r\/abc/);
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
  expect(j.systemMonitoring).toBe(true);

  // Re-subscribe without the flag — preserved.
  res = await watchPost({ request: req({ domain: 'example.com', email: 'o@x.io' }), env });
  j = await res.json();
  expect(j.systemMonitoring).toBe(true);

  // Explicit off.
  res = await watchPost({
    request: req({ domain: 'example.com', email: 'o@x.io', system: false }),
    env,
  });
  j = await res.json();
  expect(j.systemMonitoring).toBe(false);
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
  expect(j.system.baseline.score, 'baseline preserved across re-subscribe').toBe(95);
  expect(j.system.drifted).toBe(true);
  expect(j.system.drift[0].id).toBe('colors.cta');
  expect(JSON.stringify(j).includes('o@x.io'), 'email never leaks').toBeFalsy();
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
  expect(res.status).toBe(200);
  const html = await res.text();
  expect(html).toMatch(/B\+/);
  expect(html).toMatch(/Drifting/);
  expect(html).toMatch(/inter undeclared/);
  expect(html).toMatch(/History/);
  expect(html, 'print stylesheet present (the PDF substitute)').toMatch(/@media print/);
  expect(html.includes('secret@x.io'), 'email never appears in the report').toBeFalsy();
  // Anti-slop self-check.
  expect(html).not.toMatch(/Inter,|Geist|Space Grotesk/);
});

test('/report shows an honest empty state for an unknown domain', async () => {
  const res = await reportGet({
    params: { domain: 'unseen.com' },
    request: { url: 'https://slop-detect.com/report/unseen.com' },
    env: { RESULTS: makeKv() },
  });
  const html = await res.text();
  expect(html).toMatch(/No scan data/i);
});
