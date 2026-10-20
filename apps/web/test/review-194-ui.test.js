// Regression guards for the PR #194 web-UI review follow-ups (greptile threads):
// the Result page's live AEO probe, the corpus-fallback breakdown, system-only
// fix prompts, keyboard-operable category bars, the /compare arena, the hero
// instrument's reduced-motion + offscreen behaviour, and the docs grade table.
// Page scripts are executed against small DOM stubs (no jsdom in this repo).

import { test, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import { GRADE_BANDS } from '@slop-detect/core';
import { onRequestGet as scoreGet } from '../functions/score/[domain].tsx';
import { resultScript } from '../functions/_result.tsx';
import { saveResult, recordScan } from '../functions/_shared.ts';

const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const LEADERBOARD = JSON.parse(read('../public/leaderboard.json'));

afterEach(() => {
  vi.unstubAllGlobals();
});

function makeKv(seed = {}) {
  const store = new Map(Object.entries(seed));
  return {
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

// ── minimal DOM stub ────────────────────────────────────────────────────────
function makeEl(id) {
  const listeners = {};
  const attrs = {};
  const el = {
    id,
    innerHTML: '',
    textContent: '',
    value: '',
    hidden: false,
    disabled: false,
    style: {},
    children: [],
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener(type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
    },
    fire(type, ev = {}) {
      for (const fn of listeners[type] || []) fn({ preventDefault() {}, ...ev });
    },
    setAttribute(k, v) {
      attrs[k] = String(v);
    },
    getAttribute(k) {
      return k in attrs ? attrs[k] : null;
    },
    appendChild(c) {
      el.children.push(c);
      if (c.onload) setTimeout(() => c.onload(), 0);
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    closest() {
      return null;
    },
    getBoundingClientRect() {
      return { width: 640, height: 420, top: 0, left: 0 };
    },
  };
  return el;
}

function makeDocument() {
  const els = new Map();
  const doc = {
    els,
    hidden: false,
    readyState: 'complete',
    head: makeEl('head'),
    activeElement: null,
    getElementById(id) {
      if (!els.has(id)) els.set(id, makeEl(id));
      return els.get(id);
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    createElement(tag) {
      return makeEl(tag);
    },
    addEventListener() {},
  };
  return doc;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

// ── /score corpus fallback (thread 4312665083) ────────────────────────────────
test('corpus-fallback score page marks the breakdown unavailable instead of clean', async () => {
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify(LEADERBOARD)));
  const res = await scoreGet({
    params: { domain: 'bolt.new' },
    request: { url: 'https://slop-detect.com/score/bolt.new' },
    env: { RESULTS: makeKv() },
  });
  expect(res.status).toBe(200);
  const html = await res.text();
  expect(html).toMatch(/breakdown was not saved/);
  expect(html).not.toMatch(/clean, no tells in this category/);
  expect(html).not.toMatch(/Nothing to fix/);
  expect(html).not.toMatch(/cleanliness radar/);
  expect(html).not.toMatch(/class="cbar-item"/);
});

// ── system-only drift (thread 4312665270) + category bar buttons (4312665186) ──
async function renderScore(slim) {
  const kv = makeKv();
  await saveResult(kv, slim);
  await recordScan(kv, slim);
  const res = await scoreGet({
    params: { domain: slim.domain },
    request: { url: `https://slop-detect.com/score/${slim.domain}` },
    env: { RESULTS: kv },
  });
  return res.text();
}

const BASE = {
  url: 'https://ex.com/docs',
  finalUrl: 'https://ex.com/docs',
  domain: 'ex.com',
  title: 'Ex',
  verdict: 'x',
  patternsTotal: 27,
  definitionsVersion: '2026.09',
  createdAt: '2026-06-10T12:00:00.000Z',
};

test('system-only drift still exposes the fix prompt + AI handoff', async () => {
  const html = await renderScore({
    ...BASE,
    id: 'sysonly1',
    score: 0,
    tier: 'Clean',
    grade: 'A+',
    patternsFlagged: 0,
    triggered: [],
    system: { score: 70, tier: 'Drifting', drift: [{ id: 'color', message: 'off-palette' }] },
  });
  expect(html).toMatch(/id="copyFix"/);
  expect(html).toMatch(/id="fixClaude"/);
  expect(html).not.toMatch(/Nothing to fix/);
  expect(html).toMatch(/Design-system drift/); // carried in the inline FIX_PROMPT
});

test('category overview bars are keyboard-operable buttons', async () => {
  const html = await renderScore({
    ...BASE,
    id: 'cbarbtn1',
    score: 8,
    tier: 'Clean',
    grade: 'A-',
    patternsFlagged: 1,
    triggered: [{ id: 'slop_fonts', label: 'AI-default font stack', weight: 8 }],
  });
  const bars = [...html.matchAll(/<(\w+)[^>]*class="cbar-item"/g)].map((m) => m[1]);
  expect(bars.length).toBe(5);
  expect(bars.every((t) => t === 'button')).toBe(true);
  // the probe targets the scanned page, not the bare domain (thread 4312665062)
  expect(html).toContain('var AEO_URL="https://ex.com/docs"');
});

// ── live AEO probe (threads 4312665051, 4312665062, 4312665072) ───────────────
test('live AEO probe sends a Turnstile token, probes the scanned URL, shows check messages', async () => {
  const doc = makeDocument();
  const btn = doc.getElementById('runAeoBtn');
  doc.getElementById('aeoTurnstile');
  const row = makeEl('row');
  const mark = makeEl('mark');
  const det = makeEl('det');
  det.hidden = true;
  row.querySelector = (sel) => (sel === '.aeo-mark' ? mark : sel === '.aeo-detail' ? det : null);
  doc.querySelector = (sel) => (sel === '[data-aeo-id="robots.gptbot"]' ? row : null);

  const calls = [];
  const turnstile = {
    render(host, opts) {
      setTimeout(() => opts.callback('tok-123'), 0);
      return 'w1';
    },
    remove: vi.fn(),
  };
  const win = { turnstile };
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', win);
  vi.stubGlobal('navigator', {});
  vi.stubGlobal('fetch', async (url, init) => {
    calls.push({ url, init });
    return new Response(
      JSON.stringify({
        score: 60,
        tier: 'Partial',
        durationMs: 900,
        passed: [],
        checks: [
          {
            id: 'robots.gptbot',
            severity: 'required',
            passed: false,
            message: 'robots.txt blocks GPTBot',
          },
        ],
      }),
      { status: 200 }
    );
  });

  const src = resultScript({
    shareText: 's',
    shareUrl: 'https://slop-detect.com/score/ex.com',
    domain: 'ex.com',
    aeoUrl: 'https://ex.com/docs',
  });
  new Function(src)();
  btn.fire('click');
  for (let i = 0; i < 5; i++) await flush();

  expect(calls.length).toBe(1);
  expect(calls[0].url).toBe('/api/aeo');
  expect(calls[0].init.headers['X-Turnstile-Token']).toBe('tok-123');
  expect(JSON.parse(calls[0].init.body).url).toBe('https://ex.com/docs');
  expect(turnstile.remove).toHaveBeenCalledWith('w1'); // single-use: next run gets a fresh token
  expect(mark.textContent).toBe('✗');
  expect(det.textContent).toBe('robots.txt blocks GPTBot');
  expect(det.hidden).toBe(false);
});

// ── /compare arena (threads 4312665093, 4312665104) ───────────────────────────
function compareScript() {
  const html = read('../public/compare/index.html');
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  return blocks.find((b) => b.includes('leaderboard.json'));
}

async function runCompare(a, b, fetchImpl = async () => new Response(JSON.stringify(LEADERBOARD))) {
  const doc = makeDocument();
  doc.getElementById('cmpA').value = a;
  doc.getElementById('cmpB').value = b;
  vi.stubGlobal('document', doc);
  vi.stubGlobal('location', { search: '' });
  vi.stubGlobal('fetch', fetchImpl);
  new Function(compareScript())();
  const before = {
    a: doc.getElementById('cardA').innerHTML,
    delta: doc.getElementById('cmpDeltaSummary').textContent,
  };
  for (let i = 0; i < 5; i++) await flush();
  return {
    before,
    a: doc.getElementById('cardA').innerHTML,
    b: doc.getElementById('cardB').innerHTML,
    radar: doc.getElementById('cmpRadarSvg').innerHTML,
    delta: doc.getElementById('cmpDeltaSummary').textContent,
  };
}

test('compare: unscanned corpus sites show the recorded failure, not a grade', async () => {
  const r = await runCompare('openai.com', 'lovable.dev');
  // no example grades before the corpus arrives either
  expect(r.before.a).not.toMatch(/arena-grade/);
  expect(r.a).toMatch(/No successful scan on record/);
  expect(r.b).toMatch(/No successful scan on record/);
  expect(r.a).toMatch(/cloudflare_challenge/);
  expect(r.b).toMatch(/cloudflare_challenge/);
  expect(r.a + r.b).not.toMatch(/arena-grade|arena-num/);
  expect(r.delta).toMatch(/no successful scan on record/);
});

test('compare: scored sites show the recorded count, and withhold grades without opt-in', async () => {
  const r = await runCompare('stripe.com', 'bolt.new');
  const bolt = LEADERBOARD.sites.find((s) => s.domain === 'bolt.new');
  const stripe = LEADERBOARD.sites.find((s) => s.domain === 'stripe.com');
  expect(r.b).toContain(`${bolt.patternsFlagged} patterns flagged on record`);
  expect(r.b).toMatch(/breakdown unavailable/);
  expect(r.b).not.toMatch(/0 patterns/);
  expect(r.b).toMatch(/opt-in required/i);
  expect(r.a + r.b).not.toMatch(/arena-grade|arena-num/);
  expect(r.a).not.toContain(`>${stripe.score}<small>`);
  expect(r.b).not.toContain(`>${bolt.score}<small>`);
  // only the two guide rings: no per-site polygons derived from the total score
  expect((r.radar.match(/<polygon/g) || []).length).toBe(2);
  expect(r.delta).toMatch(/withheld until each domain owner opts in/i);
  expect(r.delta).not.toMatch(/pts cleaner/);
  expect(r.delta).not.toContain(`${stripe.score}/100`);
  expect(r.delta).not.toContain(`${bolt.score}/100`);
});

test('compare: email-verified listings show grades; an unverified peer stays withheld', async () => {
  const stripe = LEADERBOARD.sites.find((s) => s.domain === 'stripe.com');
  const bolt = LEADERBOARD.sites.find((s) => s.domain === 'bolt.new');
  const r = await runCompare('stripe.com', 'bolt.new', async (url) => {
    const u = String(url);
    if (u.includes('leaderboard.json')) return new Response(JSON.stringify(LEADERBOARD));
    if (u.includes('/api/opt-in')) {
      return new Response(
        JSON.stringify({
          domains: {
            'stripe.com': { score: stripe.score, grade: stripe.grade, tier: stripe.tier },
          },
        })
      );
    }
    return new Response('no', { status: 404 });
  });
  expect(r.a).toContain(`>${stripe.score}<small>`);
  expect(r.a).toMatch(/arena-grade/);
  // The opt-in row did not include a count, so the card must not borrow the corpus one.
  expect(r.a).toMatch(/Pattern count unavailable/);
  expect(r.a).not.toContain(`${stripe.patternsFlagged} patterns flagged`);
  expect(r.b).toMatch(/opt-in required/i);
  expect(r.b).toContain(`${bolt.patternsFlagged} patterns flagged on record`);
  expect(r.b).not.toMatch(/arena-grade|arena-num/);
  expect(r.b).not.toContain(`>${bolt.score}<small>`);
  expect(r.delta).toMatch(/withheld until each domain owner opts in/i);
  expect(r.delta).not.toMatch(/pts cleaner/);
});

test('compare: a public score shows its own pattern count, not the corpus count', async () => {
  const stripe = LEADERBOARD.sites.find((s) => s.domain === 'stripe.com');
  const bolt = LEADERBOARD.sites.find((s) => s.domain === 'bolt.new');
  const r = await runCompare('stripe.com', 'bolt.new', async (url) => {
    const u = String(url);
    if (u.includes('leaderboard.json')) return new Response(JSON.stringify(LEADERBOARD));
    if (u.includes('/api/opt-in')) {
      return new Response(
        JSON.stringify({
          domains: {
            'stripe.com': { score: 0, grade: 'A+', tier: 'Clean', patternsFlagged: 0 },
          },
        })
      );
    }
    return new Response('no', { status: 404 });
  });
  expect(stripe.patternsFlagged).toBe(4);
  expect(stripe.score).not.toBe(0);
  expect(r.a).toContain('>0<small>');
  expect(r.a).toContain('✓ 0 patterns flagged on record');
  expect(r.a).not.toContain(`${stripe.patternsFlagged} patterns flagged`);
  expect(r.a).not.toContain(`>${stripe.score}<small>`);
  expect(r.b).toMatch(/opt-in required/i);
  expect(r.b).toContain(`${bolt.patternsFlagged} patterns flagged on record`);
  expect(r.b).not.toMatch(/arena-grade|arena-num/);
});

// ── docs grade table (thread 4312665223) ──────────────────────────────────────
test('docs.md grade table matches GRADE_BANDS exactly', () => {
  const md = read('../public/docs.md');
  const section = md.slice(md.indexOf('## 11 · Tiers & grades'));
  const pairs = [...section.matchAll(/`([A-F][+-]?)` \(`(\d+)–(\d+)`\)/g)].map((m) => ({
    grade: m[1],
    min: Number(m[2]),
    max: Number(m[3]),
  }));
  let min = 0;
  const expected = GRADE_BANDS.map((b) => {
    const row = { grade: b.grade, min, max: b.max };
    min = b.max + 1;
    return row;
  });
  expect(pairs).toEqual(expected);
});

// ── landing x-ray inspector (thread 4312665148) ───────────────────────────────
test('x-ray inspector text is exposed; only its canvas is aria-hidden', () => {
  const html = read('../public/index.html');
  expect(html).toMatch(/<div class="xray-inspector">/);
  expect(html).toMatch(/<canvas class="xray-canvas" id="patternXrayCanvas" aria-hidden="true">/);
});

// ── hero instrument (threads 4312665129, 4312665167) ──────────────────────────
function makeCtx() {
  // `frame` records every drawing call since the last clearRect, so two paints of
  // the same state produce identical frames.
  const counter = { clears: 0, frame: [] };
  const ctx = new Proxy(
    {},
    {
      get(t, k) {
        if (k === 'clearRect')
          return () => {
            counter.clears++;
            counter.frame = [];
          };
        if (k === 'measureText') return () => ({ width: 10 });
        if (k in t) return t[k];
        return (...args) => counter.frame.push(`${String(k)}(${args.join(',')})`);
      },
      set(t, k, v) {
        t[k] = v;
        return true;
      },
    }
  );
  return { ctx, counter };
}

function bootInstrument({ reduced }) {
  const doc = makeDocument();
  const { ctx, counter } = makeCtx();
  const canvas = doc.getElementById('domStageCanvas');
  canvas.getContext = () => ctx;
  canvas.setPointerCapture = () => {};
  // the X-ray + gyro canvases are absent: only the hero stage boots
  const realGet = doc.getElementById.bind(doc);
  doc.getElementById = (id) =>
    id === 'patternXrayCanvas' || id === 'axisGyroCanvas' || id === 'xrayList' ? null : realGet(id);
  const tabs = [makeEl('tab-heavy'), makeEl('tab-clean')];
  tabs[0].setAttribute('data-specimen', 'heavy');
  tabs[1].setAttribute('data-specimen', 'clean');
  doc.querySelectorAll = (sel) => (sel === '[data-specimen]' ? tabs : []);

  const raf = [];
  let ioCb = null;
  vi.stubGlobal('document', doc);
  const win = {
    matchMedia: () => ({ matches: reduced }),
    devicePixelRatio: 1,
    addEventListener() {},
  };
  vi.stubGlobal('window', win);
  vi.stubGlobal('requestAnimationFrame', (fn) => raf.push(fn));
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb) {
        this.cb = cb;
      }
      observe(target) {
        if (target === canvas) ioCb = this.cb; // ignore the scroll-reveal observer
      }
      unobserve() {}
    }
  );
  new Function(read('../public/instrument-3d.js'))();
  const step = () => {
    const fns = raf.splice(0);
    fns.forEach((f) => f());
    return fns.length;
  };
  return { doc, win, counter, tabs, raf, step, io: (v) => ioCb([{ isIntersecting: v }]) };
}

test('reduced motion: specimen/slider/explode interactions repaint the hero once', () => {
  const h = bootInstrument({ reduced: true });
  const initial = h.counter.clears;
  expect(initial).toBe(1);
  expect(h.raf.length).toBe(0); // no animation loop

  h.tabs[1].fire('click');
  expect(h.step()).toBe(1);
  expect(h.counter.clears).toBe(initial + 1);
  expect(h.raf.length).toBe(0); // exactly one frame, no loop restarted

  const slider = h.doc.getElementById('stageMorphRange');
  slider.value = '40';
  slider.fire('input');
  h.doc.getElementById('stageExplodeBtn').fire('click');
  expect(h.step()).toBe(1); // coalesced into one paint
  expect(h.counter.clears).toBe(initial + 2);
});

test('hero animation pauses offscreen and resumes when visible again', () => {
  const h = bootInstrument({ reduced: false });
  expect(h.raf.length).toBe(1); // loop running
  h.io(false);
  h.step(); // the in-flight frame draws, then stops scheduling
  expect(h.raf.length).toBe(0);
  const clears = h.counter.clears;
  h.io(true);
  expect(h.raf.length).toBe(1);
  h.step();
  expect(h.counter.clears).toBe(clears + 1);
  expect(h.raf.length).toBe(1);
});

test('hero tell lists are rebuilt only when the active tell set changes', () => {
  const h = bootInstrument({ reduced: false });
  const list = h.doc.getElementById('stageTellsList');
  let writes = 0;
  let value = list.innerHTML;
  Object.defineProperty(list, 'innerHTML', {
    get: () => value,
    set: (v) => {
      writes++;
      value = v;
    },
  });
  // start a long de-slop morph: syncReadout runs on every frame
  h.doc.getElementById('stageDeslopBtn').fire('click');
  let frames = 0;
  while (h.raf.length && frames < 400) {
    h.step();
    frames++;
  }
  expect(frames).toBeGreaterThan(30);
  expect(writes).toBeGreaterThan(0);
  expect(writes).toBeLessThan(frames / 3);
});

// ── PR #219 follow-ups ────────────────────────────────────────────────────────
test('reduced motion: a queued repaint draws changes made after it was queued', () => {
  // Same end state reached two ways must paint the same frame.
  const queued = bootInstrument({ reduced: true });
  const slider = queued.doc.getElementById('stageMorphRange');
  slider.value = '40';
  slider.fire('input'); // queues a repaint
  queued.doc.getElementById('stageExplodeBtn').fire('click'); // changes target before it runs
  expect(queued.step()).toBe(1);
  const queuedFrame = queued.counter.frame.join(';');

  const stepped = bootInstrument({ reduced: true });
  const slider2 = stepped.doc.getElementById('stageMorphRange');
  slider2.value = '40';
  slider2.fire('input');
  stepped.step();
  stepped.doc.getElementById('stageExplodeBtn').fire('click');
  stepped.step();
  expect(queuedFrame).toBe(stepped.counter.frame.join(';'));
});

test('de-slop still updates the readout while the hero canvas is hidden', () => {
  const h = bootInstrument({ reduced: false });
  h.io(false); // e.g. <768px: .stage-canvas-wrap is display:none
  h.step();
  expect(h.raf.length).toBe(0);
  const score = h.doc.getElementById('stageScoreNum');
  expect(score.textContent).not.toBe('0');
  h.doc.getElementById('stageDeslopBtn').fire('click');
  expect(score.textContent).toBe('0');
  expect(h.doc.getElementById('stageTellsList').innerHTML).toMatch(/st-tell-clean/);
});

test('compare: a corpus fetch failure does not claim missing scan history', async () => {
  const r = await runCompare('stripe.com', 'bolt.new', async () => {
    throw new Error('offline');
  });
  expect(r.a).toMatch(/Corpus unavailable/);
  expect(r.delta).toMatch(/Corpus unavailable/);
  expect(r.delta).not.toMatch(/no successful scan/);
});

test('live AEO: a Turnstile script that loads after the timeout never renders a widget', async () => {
  vi.useFakeTimers();
  try {
    const doc = makeDocument();
    const btn = doc.getElementById('runAeoBtn');
    doc.getElementById('aeoTurnstile');
    let script = null;
    doc.head.appendChild = (c) => {
      script = c;
    };
    const win = {};
    const calls = [];
    vi.stubGlobal('document', doc);
    vi.stubGlobal('window', win);
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('fetch', async (url, init) => {
      calls.push(init);
      return new Response(JSON.stringify({ error: 'turnstile_required' }), { status: 403 });
    });
    new Function(resultScript({ shareText: 's', shareUrl: 'u', domain: 'ex.com' }))();
    btn.fire('click');
    await vi.advanceTimersByTimeAsync(8000);
    expect(calls.length).toBe(1); // gave up and let the server decide
    expect(calls[0].headers['X-Turnstile-Token']).toBeUndefined();

    const render = vi.fn(() => 'late');
    win.turnstile = { render, remove: vi.fn() };
    script.onload(); // the slow script finally arrives
    expect(render).not.toHaveBeenCalled();
  } finally {
    vi.useRealTimers();
  }
});

test('live AEO: a successful token cancels the timeout', async () => {
  vi.useFakeTimers();
  try {
    const doc = makeDocument();
    const btn = doc.getElementById('runAeoBtn');
    doc.getElementById('aeoTurnstile');
    vi.stubGlobal('document', doc);
    vi.stubGlobal('window', {
      turnstile: { render: (h, o) => (o.callback('t'), 'w'), remove() {} },
    });
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('fetch', () => new Promise(() => {})); // keep the probe in flight
    new Function(resultScript({ shareText: 's', shareUrl: 'u', domain: 'ex.com' }))();
    btn.fire('click');
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});

// ── #219 follow-up: scan progress with the hero canvas hidden ─────────────────
test.each([false, true])(
  'live scan banner keeps ticking while the hero canvas is hidden (reduced=%s)',
  (reduced) => {
    vi.useFakeTimers();
    try {
      const h = bootInstrument({ reduced });
      h.io(false); // <768px: .stage-canvas-wrap is display:none, loop paused
      h.step();
      expect(h.raf.length).toBe(0);
      const timer = h.doc.getElementById('stageLiveTimer');
      const phase = h.doc.getElementById('stageLivePhase');
      h.win.__slopInstrument.startLiveScan('https://ex.com');
      h.step(); // reduced motion paints one still frame; nothing reschedules
      vi.advanceTimersByTime(3200);
      expect(h.raf.length).toBe(0); // the canvas loop stayed paused
      expect(parseFloat(timer.textContent)).toBeGreaterThanOrEqual(3);
      const later = phase.textContent;
      expect(later).toBeTruthy();
      vi.advanceTimersByTime(3000);
      expect(parseFloat(timer.textContent)).toBeGreaterThanOrEqual(6);
      expect(phase.textContent).not.toBe(later); // phases progress too
      h.win.__slopInstrument.stopLiveScan();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  }
);
