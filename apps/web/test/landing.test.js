// Landing page (public/index.html) + brand-unification regression tests.
// The deep review found the page frozen at v0.5.1 with no conversion path —
// these assertions stop that class of drift from recurring.

import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { onRequestGet as directoryGet } from '../functions/directory.tsx';
import { onRequestGet as leaderboardGet } from '../functions/leaderboard.tsx';
import { onRequestGet as reportGet } from '../functions/report/[domain].tsx';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

// ── staleness guards ─────────────────────────────────────────────────────────
test('landing page carries no stale version or definitions strings', () => {
  expect(html.includes('0.5.1'), 'JSON-LD softwareVersion must track releases').toBeFalsy();
  expect(html.includes('2026.08'), 'defs label must not lag DEFINITIONS_VERSION').toBeFalsy();
});

test('JSON-LD softwareVersion matches the released package version', () => {
  // Kills the drift class for good: the landing page can never again claim an
  // old version once package.json moves.
  const pkg = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'));
  expect(html, `landing must advertise v${pkg.version}`).toMatch(
    new RegExp(`"softwareVersion":\\s*"${pkg.version.replace(/\./g, '\\.')}"`)
  );
});

test('the dashboard is reachable from nav and footer', () => {
  expect(
    (html.match(/href="\/dashboard"/g) || []).length >= 2,
    'topbar + footer dashboard links'
  ).toBeTruthy();
});

test('landing page mentions the full current tool surface', () => {
  expect(
    html.includes('check_design_system'),
    'MCP tool list must include the system-axis tool'
  ).toBeTruthy();
  expect(html, 'the system axis must be presented').toMatch(/DESIGN\.md/);
});

// ── conversion bridge (§04) ──────────────────────────────────────────────────
test('the monitoring conversion section exists and posts to /api/watch', () => {
  expect(html, 'the #monitor section anchor').toMatch(/id="monitor"/);
  expect(html).toMatch(/id="watchForm"/);
  expect(html).toMatch(/id="watchDomain"/);
  expect(html).toMatch(/id="watchEmail"/);
  expect(html, 'system-axis opt-in checkbox').toMatch(/id="watchSystem"/);
  expect(html, 'directory opt-in checkbox').toMatch(/id="watchList"/);
  expect(html, 'form submits to the watch API').toMatch(/\/api\/watch/);
  expect(html, 'post-scan nudge into the funnel').toMatch(/monitorNudgeLink/);
});

test('the section is honest: double opt-in, privacy, free engine', () => {
  expect(html).toMatch(/[Dd]ouble opt-in/);
  expect(html, 'privacy policy linked').toMatch(/href="\/privacy\.md"/);
  expect(html, 'free-engine promise stated').toMatch(/MIT/);
});

test('monitor opt-ins are additive — an unchecked box never delists on resubmit', () => {
  // Regression (Bugbot #12): sending list:false/system:false on every submit
  // would delist a domain the owner had listed. Flags must only be SENT when checked.
  expect(
    /list:\s*\$\('watchList'\)\.checked/.test(html),
    'list must not be sent unconditionally'
  ).toBeFalsy();
  expect(
    /system:\s*\$\('watchSystem'\)\.checked/.test(html),
    'system must not be sent unconditionally'
  ).toBeFalsy();
  expect(html, 'list opt-in only when checked').toMatch(
    /watchList'\)\.checked \? \{ list: true \}/
  );
  expect(html, 'system opt-in only when checked').toMatch(
    /watchSystem'\)\.checked \? \{ system: true \}/
  );
});

test('exactly one domainOf helper (no shadowed duplicate)', () => {
  expect((html.match(/function domainOf/g) || []).length).toBe(1);
});

// ── agent-discovery files list the full tool surface ─────────────────────────
test('every agent-discovery surface advertises check_design_system', () => {
  const files = [
    '../public/.well-known/agent-card.json',
    '../public/.well-known/agent.json',
    '../public/.well-known/mcp/server-card.json',
    '../public/index.md',
  ];
  for (const f of files) {
    const txt = readFileSync(new URL(f, import.meta.url), 'utf8');
    expect(
      txt.includes('scan_page') && txt.includes('check_aeo'),
      `${f}: base tools present`
    ).toBeTruthy();
    expect(
      txt.includes('check_design_system'),
      `${f}: must list the system-axis tool`
    ).toBeTruthy();
  }
});

// ── navigation to the product surfaces ───────────────────────────────────────
test('nav/footer link the directory, leaderboard, monitor, and privacy', () => {
  expect(html).toMatch(/href="\/directory"/);
  expect(html).toMatch(/href="\/leaderboard"/);
  expect(html).toMatch(/href="#monitor"/);
  expect(html).toMatch(/href="\/privacy\.md"/);
});

// ── anti-slop: fonts stay system-distinct ────────────────────────────────────
test('the Google Fonts request loads only the brand faces (no Inter/Geist)', () => {
  const fontsUrl = (html.match(/https:\/\/fonts\.googleapis\.com\/css2[^"]+/) || [''])[0];
  expect(fontsUrl.includes('Hanken+Grotesk'), 'brand prose face present').toBeTruthy();
  expect(fontsUrl.includes('Martian+Mono'), 'brand mono face present').toBeTruthy();
  expect(/Inter|Geist|Space\+Grotesk/.test(fontsUrl), 'no slop faces requested').toBeFalsy();
});

// ── brand unification: sub-pages share the landing identity ─────────────────
function makeKv(seed = {}) {
  const store = new Map(
    Object.entries(seed).map(([k, v]) => [k, typeof v === 'string' ? { value: v } : v])
  );
  return {
    async get(k) {
      return store.has(k) ? store.get(k).value : null;
    },
    async put(k, v, o = {}) {
      store.set(k, { value: v, metadata: o.metadata });
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

// The shared light editorial-instrument identity: the three new faces (loaded by
// BRAND_FONTS_HEAD), the green verdict accent token, and the signature 1.5px ink
// section-ledger rule (both in BRAND_CSS). Every server-rendered page embeds these,
// so /directory, /leaderboard, /report must all carry them.
const BRAND_MARKS = [
  /Newsreader/,
  /Libre\+Franklin/,
  /JetBrains\+Mono/,
  /--clean:\s*#1FA85E/,
  /border-top:1\.5px solid #181815/,
];

test('/directory wears the landing brand (fonts, accent, registration mark)', async () => {
  const res = await directoryGet({
    request: { url: 'https://slop-detect.com/directory' },
    env: { RESULTS: makeKv() },
  });
  const out = await res.text();
  for (const re of BRAND_MARKS) expect(out).toMatch(re);
});

test('/leaderboard wears the landing brand', async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = async () => new Response('nope', { status: 404 });
  try {
    const res = await leaderboardGet({ request: { url: 'https://slop-detect.com/leaderboard' } });
    const out = await res.text();
    for (const re of BRAND_MARKS) expect(out).toMatch(re);
    expect(out, 'leaderboard CTA routes into the monitoring funnel').toMatch(/#monitor/);
  } finally {
    globalThis.fetch = orig;
  }
});

test('/report wears the landing brand and keeps its print stylesheet', async () => {
  const res = await reportGet({
    params: { domain: 'example.com' },
    request: { url: 'https://slop-detect.com/report/example.com' },
    env: { RESULTS: makeKv() },
  });
  const out = await res.text();
  for (const re of BRAND_MARKS) expect(out).toMatch(re);
  expect(out).toMatch(/@media print/);
});
