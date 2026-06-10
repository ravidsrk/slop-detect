// Landing page (public/index.html) + brand-unification regression tests.
// The deep review found the page frozen at v0.5.1 with no conversion path —
// these assertions stop that class of drift from recurring.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { onRequestGet as directoryGet } from '../functions/directory.js';
import { onRequestGet as leaderboardGet } from '../functions/leaderboard.js';
import { onRequestGet as reportGet } from '../functions/report/[domain].js';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

// ── staleness guards ─────────────────────────────────────────────────────────
test('landing page carries no stale version or definitions strings', () => {
  assert.ok(!html.includes('0.5.1'), 'JSON-LD softwareVersion must track releases');
  assert.ok(!html.includes('2026.08'), 'defs label must not lag DEFINITIONS_VERSION');
});

test('landing page mentions the full current tool surface', () => {
  assert.ok(html.includes('check_design_system'), 'MCP tool list must include the system-axis tool');
  assert.match(html, /DESIGN\.md/, 'the system axis must be presented');
});

// ── conversion bridge (§04) ──────────────────────────────────────────────────
test('the monitoring conversion section exists and posts to /api/watch', () => {
  assert.match(html, /id="monitor"/, 'the #monitor section anchor');
  assert.match(html, /id="watchForm"/);
  assert.match(html, /id="watchDomain"/);
  assert.match(html, /id="watchEmail"/);
  assert.match(html, /id="watchSystem"/, 'system-axis opt-in checkbox');
  assert.match(html, /id="watchList"/, 'directory opt-in checkbox');
  assert.match(html, /\/api\/watch/, 'form submits to the watch API');
  assert.match(html, /monitorNudgeLink/, 'post-scan nudge into the funnel');
});

test('the section is honest: double opt-in, privacy, free engine', () => {
  assert.match(html, /[Dd]ouble opt-in/);
  assert.match(html, /href="\/privacy\.md"/, 'privacy policy linked');
  assert.match(html, /MIT/, 'free-engine promise stated');
});

// ── navigation to the product surfaces ───────────────────────────────────────
test('nav/footer link the directory, leaderboard, monitor, and privacy', () => {
  assert.match(html, /href="\/directory"/);
  assert.match(html, /href="\/leaderboard"/);
  assert.match(html, /href="#monitor"/);
  assert.match(html, /href="\/privacy\.md"/);
});

// ── anti-slop: fonts stay system-distinct ────────────────────────────────────
test('the Google Fonts request loads only the brand faces (no Inter/Geist)', () => {
  const fontsUrl = (html.match(/https:\/\/fonts\.googleapis\.com\/css2[^"]+/) || [''])[0];
  assert.ok(fontsUrl.includes('Hanken+Grotesk'), 'brand prose face present');
  assert.ok(fontsUrl.includes('Martian+Mono'), 'brand mono face present');
  assert.ok(!/Inter|Geist|Space\+Grotesk/.test(fontsUrl), 'no slop faces requested');
});

// ── brand unification: sub-pages share the landing identity ─────────────────
function makeKv(seed = {}) {
  const store = new Map(Object.entries(seed).map(([k, v]) => [k, typeof v === 'string' ? { value: v } : v]));
  return {
    async get(k) { return store.has(k) ? store.get(k).value : null; },
    async put(k, v, o = {}) { store.set(k, { value: v, metadata: o.metadata }); },
    async delete(k) { store.delete(k); },
    async list({ prefix = '', limit = 1000 } = {}) {
      const keys = [...store.keys()].filter(n => n.startsWith(prefix)).slice(0, limit)
        .map(n => ({ name: n, metadata: store.get(n).metadata }));
      return { keys, list_complete: true };
    }
  };
}

const BRAND_MARKS = [/Hanken\+Grotesk/, /Martian\+Mono/, /--accent:#5b9dff/, /class="eyebrow"/];

test('/directory wears the landing brand (fonts, accent, registration mark)', async () => {
  const res = await directoryGet({ request: { url: 'https://slop-detect.com/directory' }, env: { RESULTS: makeKv() } });
  const out = await res.text();
  for (const re of BRAND_MARKS) assert.match(out, re);
});

test('/leaderboard wears the landing brand', async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = async () => new Response('nope', { status: 404 });
  try {
    const res = await leaderboardGet({ request: { url: 'https://slop-detect.com/leaderboard' } });
    const out = await res.text();
    for (const re of BRAND_MARKS) assert.match(out, re);
    assert.match(out, /#monitor/, 'leaderboard CTA routes into the monitoring funnel');
  } finally { globalThis.fetch = orig; }
});

test('/report wears the landing brand and keeps its print stylesheet', async () => {
  const res = await reportGet({
    params: { domain: 'example.com' },
    request: { url: 'https://slop-detect.com/report/example.com' },
    env: { RESULTS: makeKv() }
  });
  const out = await res.text();
  for (const re of BRAND_MARKS) assert.match(out, re);
  assert.match(out, /@media print/);
});
