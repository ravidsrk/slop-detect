// Build task 11: GET /brand — the identity system, and THE dogfood proof page.
//
// slop-detect scores how generated a landing page looks, so the page that ships
// its identity has to score 0/100, A+, Clean on that same scan. These tests pin
// the seven numbered ledger sections (the mark, wordmark, the five-swatch palette,
// the three type specimens, the three tier voice samples, the three badge
// examples + markdown embed, and the do/don't cards) AND assert the page passes
// the anti-slop self-check most strictly of any surface: no slop fonts, no
// gradient text, purple bounded to the data-avatar palette (never a CTA/accent),
// and the live badge as the one element allowed a shadow. Effectively a coded
// version of "this page scores Clean".

import { test, expect } from 'vitest';
import { onRequestGet } from '../functions/brand.tsx';
import { chipPalette } from '../functions/_theme.ts';

async function render() {
  const res = await onRequestGet({ request: { url: 'https://slop-detect.com/brand' } });
  const html = await res.text();
  return { res, html };
}

// ── the route renders an HTML document ───────────────────────────────────────
test('GET /brand renders an HTML document with the brand title', async () => {
  const { res, html } = await render();
  expect(res.status ?? 200).toBe(200);
  expect(res.headers.get('content-type')).toMatch(/text\/html/);
  expect(html.startsWith('<!doctype html>')).toBe(true);
  expect(html).toContain('<title>Brand · slop-detect</title>');
});

// ── hero: the thesis + the live "this page scores Clean" proof ───────────────
test('the hero states the thesis and that this page scores 0/100 A+ Clean', async () => {
  const { html } = await render();
  expect(html).toContain('A detector that refuses to look like the thing it detects.');
  expect(html).toContain('this page scores 0/100 · A+ · Clean');
});

// ── the seven numbered ledger sections ───────────────────────────────────────
test('the page builds the seven numbered ledger sections', async () => {
  const { html } = await render();
  const sections = [
    ['01', 'the mark'],
    ['02', 'the wordmark'],
    ['03', 'color'],
    ['04', 'typography'],
    ['05', 'voice'],
    ['06', 'the badge'],
    ['07', 'principles'],
  ];
  for (const [n, label] of sections) {
    expect(html, `${n} ledger tag`).toContain(`ledger-tag">${n}<`);
    expect(html, `${label} ledger label`).toContain(`ledger-label">${label}<`);
  }
});

// ── 01 the mark: the committed reticle assets, light + dark ──────────────────
test('section 01 references the committed reticle marks (light + dark)', async () => {
  const { html } = await render();
  expect(html).toContain('/landing/design/mark.svg');
  expect(html).toContain('/landing/design/mark-dark.svg');
});

// ── 03 color: the five core swatches, hexes exposed as text (not color-only) ──
test('section 03 renders the five core swatches with their hexes as text', async () => {
  const { html } = await render();
  const cores = [
    ['paper', '#F4F5F2'],
    ['ink', '#181815'],
    ['clean', '#1FA85E'],
    ['mild', '#D89A2E'],
    ['heavy', '#C9402E'],
  ];
  for (const [name, hex] of cores) {
    expect(html, `${name} swatch name`).toContain(`sw-name">${name}<`);
    expect(html, `${name} hex shown as text`).toContain(`sw-hex">${hex}<`);
  }
  expect((html.match(/class="sw"/g) || []).length, 'exactly five swatch cards').toBe(5);
});

// ── 04 typography: three specimens, one per family ───────────────────────────
test('section 04 shows three type specimens, one per family', async () => {
  const { html } = await render();
  expect((html.match(/class="spec"/g) || []).length, 'three specimen cards').toBe(3);
  expect(html).toContain('Newsreader');
  expect(html).toContain('Libre Franklin');
  expect(html).toContain('JetBrains Mono');
});

// ── 05 voice: three tier voice samples, each in its tier text hue ────────────
test('section 05 shows three tier voice samples in their tier text colors', async () => {
  const { html } = await render();
  expect((html.match(/class="voice-s"/g) || []).length, 'three voice samples').toBe(3);
  expect(html).toContain('voice-tier" style="color:#15824A">Clean<');
  expect(html).toContain('voice-tier" style="color:#9A6B12">Mild<');
  expect(html).toContain('voice-tier" style="color:#B23A2A">Heavy<');
});

// ── 06 the badge: three live badge examples + the markdown embed ─────────────
test('section 06 shows three live badge examples and the markdown embed', async () => {
  const { html } = await render();
  expect((html.match(/class="live-badge"/g) || []).length, 'three live badges').toBe(3);
  expect(html).toContain('A+ · 0'); // Clean
  expect(html).toContain('C · 24'); // Mild
  expect(html).toContain('D · 41'); // Heavy
  expect(html, 'badge image url').toMatch(/slop-detect\.com\/badge\/yourdomain\.com/);
  expect(html, 'score link url').toMatch(/slop-detect\.com\/score\/yourdomain\.com/);
});

// ── 07 principles: the do / don't cards ──────────────────────────────────────
test("section 07 renders the do and don't cards", async () => {
  const { html } = await render();
  expect(html).toContain('card-do');
  expect(html).toContain('card-dont');
  // hono escapes the apostrophe in the "don't" header
  expect(html).toMatch(/class="card-h">don(&#39;|')t<\/div>/);
  // a representative line from each card (chosen without apostrophes)
  expect(html).toContain('Show the product. Screenshot the real thing.');
  expect(html).toContain('Reach for the default font stack.');
});

// ════════════════════════════════════════════════════════════════════════════
// THE DOGFOOD SELF-CHECK — strictest of any surface. This page must score Clean.
// ════════════════════════════════════════════════════════════════════════════

test('dogfood: requests only the brand faces — no Inter / Geist / Space Grotesk', async () => {
  const { html } = await render();
  const fontsUrl = (html.match(/https:\/\/fonts\.googleapis\.com\/css2[^"]+/) || [''])[0];
  expect(fontsUrl).toContain('Newsreader');
  expect(fontsUrl).toContain('Libre+Franklin');
  expect(fontsUrl).toContain('JetBrains+Mono');
  expect(/Inter|Geist|Space\+Grotesk/.test(fontsUrl), 'no slop faces requested').toBe(false);
  // and no font-family declaration anywhere names a slop face
  expect(
    /font-family:[^;{}]*(Inter|Geist|Space Grotesk)/i.test(html),
    'no slop face in any font-family'
  ).toBe(false);
});

test('dogfood: no gradient text and no gradient surfaces (solid ink, flat fills)', async () => {
  const { html } = await render();
  expect(/background-clip:\s*text/i.test(html), 'no gradient text').toBe(false);
  expect(/-webkit-background-clip:\s*text/i.test(html), 'no gradient text').toBe(false);
  expect(/gradient\(/i.test(html), 'flat surfaces, no gradient layers').toBe(false);
});

test('dogfood: purple is bounded to the data-avatar palette, never a CTA or accent', async () => {
  const { html } = await render();
  // #7A4D9A appears only inside the bounded six-color letter-avatar exhibit:
  // once as the chip background, once as its hex label (hex-as-text, not
  // color-only). EVERY occurrence must sit inside a .dpal block — never on a
  // control or accent.
  const at = [];
  for (let i = html.indexOf('#7A4D9A'); i !== -1; i = html.indexOf('#7A4D9A', i + 1)) at.push(i);
  expect(at.length, 'the bounded palette renders the purple swatch').toBeGreaterThanOrEqual(1);
  for (const pos of at) {
    expect(
      html.slice(Math.max(0, pos - 140), pos),
      `purple at ${pos} is inside the bounded data palette`
    ).toMatch(/dpal/);
  }
  // it is a data swatch background, not a control
  expect(html).toMatch(/dpal-chip" style="background:#7A4D9A/i);
  // the page's actual CTA (the scan submit) is ink going to green, never purple
  expect(html).toMatch(/\.scan-go:hover\{background:var\(--clean-text\)\}/);
});

test('dogfood: the live badge is the only element that carries a shadow', async () => {
  const { html } = await render();
  expect((html.match(/box-shadow/g) || []).length, 'exactly one shadow on the page').toBe(1);
  expect(html).toMatch(/\.live-badge\{[^}]*box-shadow:var\(--shadow-badge\)/);
});

test('the page wears the shared light editorial-instrument identity', async () => {
  const { html } = await render();
  const marks = [
    /Newsreader/,
    /Libre\+Franklin/,
    /JetBrains\+Mono/,
    /--clean:\s*#1FA85E/,
    /border-top:1\.5px solid #181815/,
    /color-scheme:\s*light/,
  ];
  for (const re of marks) expect(html).toMatch(re);
});

// ── functional parity: links /docs + the scan flow, keeps framing + manifesto ─
test('it links to /docs and the scan flow, and keeps the framing + manifesto', async () => {
  const { html } = await render();
  expect(html, 'docs link').toMatch(/href="https:\/\/slop-detect\.com\/docs"/);
  expect(html, 'scan flow GETs to /score').toMatch(/action="\/score"/);
  expect(html, 'the scan is a search landmark').toMatch(/role="search"/);
  expect(html, 'the manifesto').toContain('Empty is better than fake.');
  expect(html, 'the MNR-27 framing in the footer').toContain('A fingerprint, not a verdict.');
});

// ── a11y: landmarks, one h1, labelled sections ───────────────────────────────
test('a11y: a single h1, semantic landmarks, and labelled sections', async () => {
  const { html } = await render();
  expect((html.match(/<h1/g) || []).length, 'exactly one h1').toBe(1);
  expect(html).toContain('<main');
  expect(html).toMatch(/<nav[^>]*aria-label="Primary"/);
  for (const id of ['s01', 's02', 's03', 's04', 's05', 's06', 's07']) {
    expect(html, `${id} labelled`).toContain(`aria-labelledby="${id}"`);
    expect(html, `${id} heading`).toContain(`id="${id}"`);
  }
});

// ── copy axis 0: dry register, no buzzwords, no em-dash, no AI sparkle ────────
test('copy axis stays 0: no buzzwords, no em dash, no sparkle glyph (prose only)', async () => {
  const { html } = await render();
  // test prose, not the embedded stylesheet (CSS comments use box-drawing rules)
  const prose = html.replace(/<style>[\s\S]*?<\/style>/g, '');
  expect(
    /\b(seamless|leverage|comprehensive|cutting-edge|revolutionary|supercharge|unleash|game-?changing)\b/i.test(
      prose
    ),
    'no marketing buzzwords'
  ).toBe(false);
  expect(prose.includes('—'), 'no em dashes in copy').toBe(false);
  expect(prose.includes('✨'), 'no AI sparkle glyph').toBe(false);
});

// ── guard: the bounded palette really is the engine's six-color set ──────────
test('the data-avatar palette rendered is the engine chipPalette (one purple)', () => {
  expect(chipPalette).toHaveLength(6);
  expect(chipPalette.filter((c) => /7A4D9A/i.test(c))).toHaveLength(1);
});
