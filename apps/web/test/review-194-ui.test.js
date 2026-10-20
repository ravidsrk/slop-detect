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

async function runCompare(a, b) {
  const doc = makeDocument();
  doc.getElementById('cmpA').value = a;
  doc.getElementById('cmpB').value = b;
  vi.stubGlobal('document', doc);
  vi.stubGlobal('location', { search: '' });
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify(LEADERBOARD)));
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
  const r = await runCompare('vercel.com', 'lovable.dev');
  // no example grades before the corpus arrives either
  expect(r.before.a).not.toMatch(/arena-grade/);
  expect(r.a).toMatch(/No successful scan on record/);
  expect(r.a).toMatch(/HTTP 502/);
  expect(r.b).toMatch(/cloudflare_challenge/);
  expect(r.a + r.b).not.toMatch(/arena-grade|arena-num/);
  expect(r.delta).toMatch(/no successful scan on record/);
});

test('compare: scored sites show the recorded count, no invented tells or radar', async () => {
  const r = await runCompare('stripe.com', 'bolt.new');
  const bolt = LEADERBOARD.sites.find((s) => s.domain === 'bolt.new');
  expect(r.b).toContain(`${bolt.patternsFlagged} patterns flagged on record`);
  expect(r.b).toMatch(/breakdown unavailable/);
  expect(r.b).not.toMatch(/0 patterns/);
  expect(r.b).toContain(`>${bolt.score}<small>`);
  // only the two guide rings: no per-site polygons derived from the total score
  expect((r.radar.match(/<polygon/g) || []).length).toBe(2);
  expect(r.delta).toMatch(/pts cleaner/);
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
  const counter = { clears: 0 };
  const ctx = new Proxy(
    {},
    {
      get(t, k) {
        if (k === 'clearRect') return () => counter.clears++;
        if (k === 'measureText') return () => ({ width: 10 });
        if (k in t) return t[k];
        return () => {};
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
  vi.stubGlobal('window', {
    matchMedia: () => ({ matches: reduced }),
    devicePixelRatio: 1,
    addEventListener() {},
  });
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
  return { doc, counter, tabs, raf, step, io: (v) => ioCb([{ isIntersecting: v }]) };
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
