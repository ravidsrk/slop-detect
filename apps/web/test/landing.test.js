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
  expect(fontsUrl.includes('Newsreader'), 'serif display face present').toBeTruthy();
  expect(fontsUrl.includes('Libre+Franklin'), 'brand prose face present').toBeTruthy();
  expect(fontsUrl.includes('JetBrains+Mono'), 'brand mono face present').toBeTruthy();
  expect(/Inter|Geist|Space\+Grotesk/.test(fontsUrl), 'no slop faces requested').toBeFalsy();
});

// ── design fidelity: the rebuilt landing wears the shared light system ───────
test('the rebuilt landing renders the nine sections + serif centered hero', () => {
  // the centered serif hero (the one allowed centered layout)
  expect(html, 'serif hero headline').toMatch(/class="display-hero"/);
  expect(html, 'the italic "generated?" hero').toMatch(/look <em>generated\?<\/em>/);
  // the editorial sections below the hero
  expect(html, 'stats strip').toMatch(/class="stats"/);
  expect(html, 'leaderboard preview backlinks to score pages').toMatch(/id="lbBoard"/);
  expect(html, 'four-axis ledger').toMatch(/class="axes"/);
  expect(html, 'teams / continuity dark band').toMatch(/class="band"/);
  expect(html, 'research cards').toMatch(/class="research-grid"/);
  expect(html, 'the manifesto blockquote').toMatch(/Empty is better than fake/);
});

test('the rebuilt landing dogfoods its own detector (no slop tells)', () => {
  // the font *tokens* resolve only to the brand faces — no slop face is ever set
  // as a font-family (prose mentions of the rejected reflex picks are fine).
  const fontDecls = (html.match(/--(?:serif|sans|mono):[^;]+/g) || []).join(' ');
  expect(fontDecls).toMatch(/Newsreader/);
  expect(fontDecls).toMatch(/Libre Franklin/);
  expect(fontDecls).toMatch(/JetBrains Mono/);
  expect(
    /Inter|Geist|Space Grotesk|Hanken|Martian/.test(fontDecls),
    'no slop face set as a font-family'
  ).toBeFalsy();
  // no gradient text or gradient surfaces, no background-clip text
  expect(
    /background-clip:\s*text|-webkit-background-clip/.test(html),
    'no gradient text'
  ).toBeFalsy();
  expect(/linear-gradient|radial-gradient/.test(html), 'flat surfaces only').toBeFalsy();
  // no VibeCode purple on a CTA: #7A4D9A exists only as a data-avatar swatch (the
  // CHIPS palette in the leaderboard-preview JS), never on a button or accent.
  expect(
    /#7A4D9A/.test(html.replace(/const CHIPS = \[[^\]]*\];/g, '')),
    'purple only in the chip palette'
  ).toBeFalsy();
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

// ── scan field never doubles the static "https://" prefix ──────────────────────
// The hero field renders a decorative "https://" prefix, so any value placed into
// it must be a bare host. Regression for the chip + ?url= prefill double-scheme bug
// ("https:// https://news.ycombinator.com"). The API re-adds https:// for bare hosts.
test('programmatic scan-field values are stripped of their scheme', () => {
  expect(/function stripScheme\(/.test(html), 'stripScheme helper present').toBeTruthy();
  // Every programmatic set routes through stripScheme...
  expect(
    /urlInput\.value = stripScheme\(b\.dataset\.url\)/.test(html),
    'chip click strips the scheme'
  ).toBeTruthy();
  expect(
    /urlInput\.value = stripScheme\(q\)/.test(html),
    'deep-link prefill strips the scheme'
  ).toBeTruthy();
  // ...and no raw scheme-bearing assignment survives.
  expect(
    /urlInput\.value\s*=\s*b\.dataset\.url\b/.test(html),
    'no raw chip URL assignment'
  ).toBeFalsy();
  expect(/urlInput\.value\s*=\s*q\b/.test(html), 'no raw query-param assignment').toBeFalsy();
  // The helper strips only a leading scheme (anchored, case-insensitive), nothing else.
  expect(/replace\(\/\^https\?:\\\/\\\/\/i, ''\)/.test(html), 'anchored scheme strip').toBeTruthy();
});

// ── scan lands on the full Result page (design flow: Landing -> Result) ───────
// A completed scan navigates to its permalink /r/<id> (the rich Result page),
// rather than only rendering a compact card inline on the landing page.
test('a completed scan navigates to the full /r/<id> result page', () => {
  expect(
    /window\.location\.href = '\/r\/' \+ encodeURIComponent\(data\.id\)/.test(html),
    'scan success navigates to the permalink result page'
  ).toBeTruthy();
  // the inline render stays as the fallback when there is no shareable id
  expect(
    /render\(data, Date\.now\(\) - t0\)/.test(html),
    'inline render fallback kept'
  ).toBeTruthy();
});
