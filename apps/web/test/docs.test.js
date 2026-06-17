// /docs (alias /methodology) — the methodology reference route.
//
// Asserts the design-fidelity + functional-parity contract from parity-spec build
// task 10: the sticky sidebar TOC (a nav landmark with in-page anchors), the four
// axes and the eight AEO checks, the tier/grade reference (Clean 0-9 / Mild 10-27
// / Heavy 28+), the dark code blocks, and the anti-slop self-check (no slop fonts,
// no gradient/background-clip text, no purple, flat surfaces). Counts are read from
// the engine so the test fails if the page hardcodes a number that drifts (MNR-23).

import { test, expect } from 'vitest';
import { onRequestGet } from '../functions/docs.tsx';
import {
  AEO_CHECKS,
  PRESETS,
  PATTERNS,
  COPY_PATTERNS,
  DEFINITIONS_VERSION,
  GRADE_BANDS,
} from '@slop-detect/core';

const getReq = (url = 'https://slop-detect.com/docs') => ({ url });

async function render() {
  const res = await onRequestGet({ request: getReq() });
  return { res, html: await res.text() };
}

// The embedded stylesheet only (so anti-slop checks aren't fooled by prose that
// legitimately NAMES the tells — "gradient text", "Inter is in use", "purple CTAs").
function styleOf(html) {
  const m = html.match(/<style>([\s\S]*?)<\/style>/);
  return m ? m[1] : '';
}

// JSX escapes text children, so a label containing angle brackets (e.g. the AEO
// "Markdown twin served at <url>.md") renders escaped — match it the same way.
const htmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

test('responds 200 text/html with the canonical /docs link', async () => {
  const { res, html } = await render();
  expect(res.status).toBe(200);
  expect(res.headers.get('Content-Type')).toMatch(/text\/html/);
  expect(html.startsWith('<!doctype html>')).toBe(true);
  expect(html).toMatch(/rel="canonical" href="https:\/\/slop-detect\.com\/docs"/);
  expect(html).toMatch(/<title>How the scan works/);
});

// ── sidebar TOC: sticky nav landmark + in-page anchors ─────────────────────────
test('renders the sticky sidebar TOC as a nav landmark with 11 in-page anchors', async () => {
  const { html } = await render();
  expect(html).toMatch(/<nav class="toc" aria-label="On this page">/);
  expect(styleOf(html)).toMatch(/\.toc\{position:sticky/);
  // 11 anchored sections, each an in-page link.
  const links = html.match(/class="toc-link" href="#[a-z]+"/g) || [];
  expect(links.length).toBe(11);
  for (const id of ['axes', 'aeo', 'system', 'api', 'continuity', 'presets', 'ci', 'tiers']) {
    expect(html, `toc anchor #${id}`).toContain(`href="#${id}"`);
    expect(html, `section id ${id}`).toContain(`id="${id}"`);
  }
});

test('the sidebar meta block reflects the live engine counts + definitions version', async () => {
  const { html } = await render();
  expect(html).toContain(
    `definitions·${DEFINITIONS_VERSION} · ${PATTERNS.length} design · ${COPY_PATTERNS.length} copy · ${AEO_CHECKS.length} AEO · MIT`
  );
});

// ── the four axes ──────────────────────────────────────────────────────────────
test('renders the four axes with their polarity', async () => {
  const { html } = await render();
  for (const axis of ['design slop', 'copy slop', 'system', 'AEO']) {
    expect(html, `axis ${axis}`).toContain(axis);
  }
  // Polarity is stated both ways (slop lower, system & AEO higher).
  expect(html).toContain('lower is better');
  expect(html).toContain('higher is better');
});

// ── the eight AEO checks ───────────────────────────────────────────────────────
test('renders all eight AEO checks with weight + severity, from the engine', async () => {
  const { html } = await render();
  expect(AEO_CHECKS.length).toBe(8);
  for (const check of AEO_CHECKS) {
    expect(html, `aeo check ${check.id}`).toContain(htmlEsc(check.label));
  }
  // required + recommended severities both labelled.
  expect(html).toContain('required');
  expect(html).toContain('recommended');
  // the "eating our own cooking" green callout.
  expect(html).toMatch(/callout-green/);
  expect(html).toContain('eating our own cooking');
});

// ── tiers & grades reference ───────────────────────────────────────────────────
test('renders the tier reference: Clean 0-9 / Mild 10-27 / Heavy 28+ with tier-colored top rules', async () => {
  const { html } = await render();
  expect(html).toMatch(/Clean[\s\S]*?score 0-9/);
  expect(html).toMatch(/Mild[\s\S]*?score 10-27/);
  expect(html).toMatch(/Heavy[\s\S]*?score 28\+/);
  // 2px tier-colored top rules (one per column, the three core verdict hues).
  expect(html).toContain('border-top:2px solid #1FA85E');
  expect(html).toContain('border-top:2px solid #D89A2E');
  expect(html).toContain('border-top:2px solid #C9402E');
  // grade letters come from the engine bands (A+ .. F all present).
  for (const g of GRADE_BANDS) expect(html, `grade ${g.grade}`).toContain(g.grade);
});

// ── code blocks ────────────────────────────────────────────────────────────────
test('renders dark code blocks with a language hint, scrollable not clipped', async () => {
  const { html } = await render();
  const blocks = html.match(/class="cb"/g) || [];
  expect(blocks.length).toBeGreaterThanOrEqual(7); // install, cli, curl, drift, js, mcp, ci
  // language hints (the a11y "language hint" the spec asks for).
  for (const lang of ['bash', 'json', 'yaml', 'javascript']) {
    expect(html, `lang hint ${lang}`).toContain(`>${lang}</span>`);
  }
  // the code surface scrolls rather than clips.
  expect(styleOf(html)).toMatch(/\.cb\{[^}]*overflow:auto/);
});

// ── presets + MCP + CI ─────────────────────────────────────────────────────────
test('reflects the live presets, the MCP config, and the CI action', async () => {
  const { html } = await render();
  for (const id of Object.keys(PRESETS)) {
    expect(html, `preset ${id}`).toContain(id);
  }
  expect(html).toContain('slop-detect-mcp');
  expect(html).toContain('scan_page');
  expect(html).toContain('ravidsrk/slop-detect/packages/action');
  expect(html).toContain('fail-under');
});

// ── the real API surface ───────────────────────────────────────────────────────
test('documents the real endpoints + the auth tiers', async () => {
  const { html } = await render();
  for (const path of ['/api/scan', '/api/aeo', '/api/patterns', '/api/watch']) {
    expect(html, `endpoint ${path}`).toContain(path);
  }
  expect(html).toContain('X-API-Key');
  expect(html).toMatch(/free.*10\/min/s);
});

// ── /compare fold + scan closer ────────────────────────────────────────────────
test('folds /compare and closes with the manifesto + a scan button', async () => {
  const { html } = await render();
  expect(html).toContain('/compare');
  expect(html).toContain('Empty is better than fake');
  expect(html).toMatch(/<form class="scan scan-hero"/); // the closer scan input
});

// ── nav active state + landmarks ───────────────────────────────────────────────
test('nav marks docs active and the page exposes semantic landmarks', async () => {
  const { html } = await render();
  expect(html).toMatch(/nav-link nav-link-active[^>]*>/);
  expect(html).toMatch(/aria-current="page"/);
  expect(html).toMatch(/<main class="doc-main">/);
  expect(html).toMatch(/<footer class="ft">/);
});

// ── responsive: the sidebar collapses at <=900px ───────────────────────────────
test('the sidebar collapses at <=900px (design "Responsive")', async () => {
  const style = styleOf(await render().then((r) => r.html));
  expect(style).toMatch(/@media\(max-width:900px\)/);
  // inside the breakpoint, the sticky sidebar goes static + full width.
  const block = style.slice(style.indexOf('@media(max-width:900px)'));
  expect(block).toMatch(/\.docs\{grid-template-columns:1fr/);
  expect(block).toMatch(/\.toc\{position:static/);
});

// ── anti-slop self-check: this page must itself score Clean ────────────────────
test('anti-slop self-check: no slop fonts, no gradient/background-clip text, no purple, flat surfaces', async () => {
  const { html } = await render();
  const style = styleOf(html);

  // No slop FONT FAMILIES used or requested (prose may name "Inter" as a tell).
  const fontDecls = style.match(/font-family:[^;}]*/g) || [];
  for (const decl of fontDecls) {
    expect(/Inter|Geist|Space Grotesk/.test(decl), `slop face in ${decl}`).toBe(false);
  }
  const fontLink = (html.match(/<link[^>]+fonts\.googleapis[^>]*>/g) || []).join(' ');
  expect(/Inter|Geist|Space\+Grotesk/.test(fontLink), 'no slop face requested').toBe(false);
  expect(html).toMatch(/Newsreader/);

  // No gradient layers, no gradient/background-clip text (solid ink only).
  expect(/gradient\(/i.test(style), 'flat surfaces, no css gradient').toBe(false);
  expect(/background-clip\s*:\s*text/i.test(style), 'no background-clip text').toBe(false);

  // No purple anywhere — not even the bounded avatar swatch (this page has none).
  expect(html.includes('#7A4D9A'), 'no purple').toBe(false);

  // Flat surfaces: the only shadow in the embedded sheet is the live-badge token.
  expect((style.match(/box-shadow/g) || []).length).toBe(1);
});
