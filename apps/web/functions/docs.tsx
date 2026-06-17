/** @jsxRuntime automatic @jsxImportSource hono/jsx */
// GET /docs (alias /methodology) — the methodology reference.
//
// The single "how the scan works" page: the four axes, install + CLI, the AEO
// axis, the DESIGN.md system axis, the web/REST API surface, the continuity
// endpoints, programmatic use, presets + MCP, the CI gate, and the tier/grade
// reference. A 1240px layout: a 212px sticky sidebar TOC (a nav landmark with
// in-page anchors) + a 760px content column (design "Screen inventory > 4. Docs").
//
// One source of truth: every count, axis, check, preset, grade band, and the
// definitions version is READ FROM THE ENGINE (@slop-detect/core), never typed in
// twice — so the docs can't drift from the live catalogue (MNR-5, MNR-23). The
// shell (Nav, Footer, CodeBlock, ScanInput, Button) and tokens come from the
// merged _ui.tsx / _brand.ts / _theme.ts foundation, imported read-only.
//
// Dogfood by construction: the editorial-instrument register — Newsreader serif
// display, Libre Franklin prose, JetBrains Mono data voice, near-black ink on cool
// paper, flat 1px-bordered surfaces, the 1.5px ink ledger rule as the only ruled
// device, the 2px tier-colored top rules on the tier columns. No slop fonts, no
// purple, no gradient or background-clip text, no shadow. This page must itself
// score Clean. Copy stays dry (copy axis 0): no buzzwords, no "not just X, it's Y".
//
// /methodology -> /docs is a redirect owned by the _redirects file (task 02); the
// sitemap entry for /docs is owned by the sitemap (task 16). This file only serves
// /docs and carries the canonical "/methodology" eyebrow + canonical link.

import { raw } from 'hono/html';
import { Nav, Footer, CodeBlock, ScanInput, UI_CSS } from './_ui.js';
import { BRAND_FONTS_HEAD, BRAND_CSS } from './_brand.js';
import { tierFill, tierText } from './_theme.js';
import {
  PATTERNS,
  COPY_PATTERNS,
  AEO_CHECKS,
  PRESETS,
  GRADE_BANDS,
  DEFINITIONS_VERSION,
} from '@slop-detect/core';

const ORIGIN = 'https://slop-detect.com';

// ── engine-derived reference data ──────────────────────────────────────────────
// Counts come from the live arrays so a re-weight / added pattern updates the docs
// with no edit here (MNR-23: the count is never hardcoded).
const N_DESIGN = PATTERNS.length;
const N_COPY = COPY_PATTERNS.length;
const N_AEO = AEO_CHECKS.length;

// The four product axes. The engine scores design + copy directly; the system and
// AEO axes are separate live endpoints. Each carries its identity color and its
// polarity (slop: lower is better; system & AEO: higher is better).
const FOUR_AXES = [
  {
    name: 'design slop',
    color: tierText('Heavy'),
    desc: `The original CSS fingerprint: ${N_DESIGN} weighted tells AI builders converged on — slop fonts, purple CTAs, gradient text, glassmorphism, bento grids.`,
    polarity: 'lower is better',
  },
  {
    name: 'copy slop',
    color: tierText('Mild'),
    desc: `${N_COPY} text tells on the page's own prose: buzzword density, em-dash overload, the "not just X, it's Y" antithesis, filler openers.`,
    polarity: 'lower is better',
  },
  {
    name: 'system · DESIGN.md',
    color: '#2C6E8F',
    desc: 'Does the page honor its own declared design system? Named, contestable drift against a DESIGN.md, never a verdict.',
    polarity: 'higher is better',
  },
  {
    name: 'AEO · agent-readable',
    color: tierText('Clean'),
    desc: `Can AI engines fetch, read, and cite the page? ${N_AEO} weighted checks against the live crawler registry.`,
    polarity: 'higher is better',
  },
];

// The real API surface (the file-based handlers under functions/api/). GET reads
// are public; POST writes are rate-limited (see auth tiers below).
const ENDPOINTS = [
  {
    method: 'POST',
    path: '/api/scan',
    desc: 'Score a URL on the design (and optional copy) axis. Add "designMd": true for the system axis, "preset" for a subset.',
  },
  {
    method: 'POST',
    path: '/api/aeo',
    desc: 'Score whether AI engines can fetch, read, and cite a page. Higher is better.',
  },
  {
    method: 'GET',
    path: '/api/patterns',
    desc: 'The live pattern catalogue: id, label, category, weight, and the definitions version.',
  },
  {
    method: 'POST',
    path: '/api/fix-prompt',
    desc: 'Assemble a paste-ready prompt that de-slops a page, scoped to its heaviest tells.',
  },
  {
    method: 'GET',
    path: '/?mode=agent',
    desc: 'A machine-readable capability document (capabilities, endpoints, auth, discovery) in one fetch.',
  },
];

// The continuity layer (the optional, paid memory over a domain). Detection stays
// free and stateless; these remember a domain and email you on regression.
const CONTINUITY = [
  {
    method: 'POST',
    path: '/api/watch',
    desc: 'Register a daily re-scan with regression + DESIGN.md-drift email alerts (double opt-in).',
  },
  {
    method: 'GET',
    path: '/api/watch/confirm',
    desc: 'Confirm the emailed opt-in link and switch alerts on.',
  },
  {
    method: 'GET',
    path: '/api/sites',
    desc: 'The public, owner-gated directory dataset of listed domains.',
  },
  {
    method: 'GET',
    path: '/api/stats',
    desc: 'Aggregate scan stats: total scans, median score, share carrying slop.',
  },
  {
    method: 'POST',
    path: '/api/dashboard/link',
    desc: 'Email a single-use magic sign-in link for the multi-domain dashboard.',
  },
];

// Tier + grade reference, computed from the engine's GRADE_BANDS so the columns can
// never disagree with the scorer. Group each grade's [min, max] range by tier.
function tierForScore(s) {
  if (s >= 28) return 'Heavy';
  if (s >= 10) return 'Mild';
  return 'Clean';
}
function gradeRanges() {
  const out: Array<{ grade: string; min: number; max: number; tier: string }> = [];
  let prevMax = -1;
  for (const band of GRADE_BANDS) {
    const min = prevMax + 1;
    out.push({ grade: band.grade, min, max: band.max, tier: tierForScore(min) });
    prevMax = band.max;
  }
  return out;
}
const TIER_COLUMNS = [
  { tier: 'Clean', range: '0-9', blurb: 'A point of view. The slop fingerprint is absent.' },
  { tier: 'Mild', range: '10-27', blurb: 'Good bones, a few template tells creeping in.' },
  { tier: 'Heavy', range: '28+', blurb: 'Wears the AI starter kit head to toe.' },
].map((c) => ({ ...c, grades: gradeRanges().filter((g) => g.tier === c.tier) }));

// The 11-item TOC. Each entry is an in-page anchor; the matching <section> uses the
// same id. Order mirrors the content flow (design "Docs sidebar").
const TOC = [
  { id: 'axes', label: 'The four axes' },
  { id: 'install', label: 'Install' },
  { id: 'cli', label: 'The CLI' },
  { id: 'aeo', label: 'AEO · agent-readable' },
  { id: 'system', label: 'The system axis' },
  { id: 'api', label: 'Web & REST API' },
  { id: 'continuity', label: 'Continuity & directory' },
  { id: 'programmatic', label: 'Programmatic (core)' },
  { id: 'presets', label: 'Presets & agents' },
  { id: 'ci', label: 'CI gate' },
  { id: 'tiers', label: 'Tiers & grades' },
];

// ── code-block tokenizer ───────────────────────────────────────────────────────
// CodeBlock's `html` prop is rendered raw, so EVERY literal must be HTML-escaped
// here (a stray < in a snippet would otherwise break the markup). `c.*` helpers
// wrap escaped text in the named syntax-accent spans from UI_CSS.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const c = {
  cmt: (s) => `<span class="t-cmt">${esc(s)}</span>`,
  cmd: (s) => `<span class="t-cmd">${esc(s)}</span>`,
  str: (s) => `<span class="t-str">${esc(s)}</span>`,
  key: (s) => `<span class="t-key">${esc(s)}</span>`,
  kw: (s) => `<span class="t-kw">${esc(s)}</span>`,
};

const CODE = {
  install: [
    c.cmt('# one-off scan, zero install'),
    `${c.cmd('npx')} slop-detect ${esc('https://your-site.com')}`,
    '',
    c.cmt('# or install the CLI globally'),
    `${c.cmd('npm')} i -g slop-detect`,
    `slop-detect ${esc('https://your-site.com')}`,
  ].join('\n'),

  cli: [
    `slop-detect ${esc('<url> [...urls]')}        ${c.cmt('# score one or many pages')}`,
    `  ${c.key('--copy')}              ${c.cmt('# also score the copy axis')}`,
    `  ${c.key('--axes all')}          ${c.cmt('# design + copy together')}`,
    `  ${c.key('--design-md auto')}    ${c.cmt('# check against <origin>/DESIGN.md')}`,
    `  ${c.key('--preset strict')}     ${c.cmt('# score a curated subset')}`,
    `  ${c.key('--remote')}            ${c.cmt('# scan via the API, no local browser')}`,
    `  ${c.key('--json')}              ${c.cmt('# machine-readable output')}`,
    `  ${c.key('--fail-on heavy')}     ${c.cmt('# exit non-zero to gate CI')}`,
  ].join('\n'),

  curl: [
    c.cmt('# score a page on the design + copy axes'),
    `${c.cmd('curl')} -s -X POST ${esc('https://slop-detect.com/api/scan')} \\`,
    `  -H ${c.str("'Content-Type: application/json'")} \\`,
    `  -d ${c.str('\'{"url":"https://your-site.com","axes":["design","copy"]}\'')} | ${c.cmd('jq')}`,
  ].join('\n'),

  drift: [
    `slop-detect ${esc('https://your-site.com')} ${c.key('--design-md auto')}`,
    '',
    `  ◳ system   ${c.str('Drifting')}   62/100   ${c.cmt('(DESIGN.md)')}`,
    `  ${c.str('drift')}  Inter is in use but is not declared in the system`,
    `  ${c.str('drift')}  the CTA fill is off the declared palette`,
    `  ${c.str('drift')}  a 16px card radius is off the declared 4 / 8 / 12 scale`,
  ].join('\n'),

  js: [
    `${c.kw('import')} { scorePatterns, PATTERNS, DEFINITIONS_VERSION } ${c.kw('from')} ${c.str("'@slop-detect/core'")};`,
    '',
    c.cmt('// core is pure: YOU open the page (Playwright/Puppeteer) and run each'),
    c.cmt("// pattern's detect() in-page, then hand the triggered results to the scorer."),
    `${c.kw('const')} summary = ${c.cmd('scorePatterns')}(results);`,
    `console.${c.cmd('log')}(summary.score, summary.grade, summary.tier);`,
    `console.${c.cmd('log')}(PATTERNS.length, DEFINITIONS_VERSION); ${c.cmt('// 27 2026.09')}`,
  ].join('\n'),

  mcp: [
    '{',
    `  ${c.key('"mcpServers"')}: {`,
    `    ${c.key('"slop-detect"')}: { ${c.key('"command"')}: ${c.str('"npx"')}, ${c.key('"args"')}: [${c.str('"-y"')}, ${c.str('"slop-detect-mcp"')}] }`,
    '  }',
    '}',
  ].join('\n'),

  ci: [
    `${c.key('- uses')}: ravidsrk/slop-detect/packages/action@v0.2.0`,
    `  ${c.key('with')}:`,
    `    ${c.key('url')}: ${esc('${{ steps.preview.outputs.url }}')}   ${c.cmt('# your deploy-preview URL')}`,
    `    ${c.key('fail-under')}: ${c.str("'B'")}                       ${c.cmt('# fail if the grade drops below B')}`,
  ].join('\n'),
};

// ── page styles ────────────────────────────────────────────────────────────────
// Light-first, referencing BRAND_CSS tokens. The grid is the only page-local
// layout; everything else reuses foundation classes. The single @media(max-width:
// 900px) collapses the sticky sidebar to a static, full-width block (design
// "Responsive": the docs sidebar collapses at <=900px).
const PAGE_CSS = `
  .docs{max-width:1240px;margin:0 auto;padding:40px var(--pad-x) 96px;
    display:grid;grid-template-columns:212px 1fr;gap:56px;align-items:start}

  /* sidebar TOC — sticky, mono, a 2px transparent left border that greens on hover */
  .toc{position:sticky;top:84px}
  .toc-list{list-style:none}
  .toc-link{display:block;font-family:var(--mono);font-size:13px;color:var(--text-4);
    border-left:2px solid transparent;padding:5px 0 5px 12px}
  .toc-link:hover{color:var(--text);border-left-color:var(--clean)}
  .toc-meta{margin-top:22px;padding-top:16px;border-top:1px solid var(--border);
    font-family:var(--mono);font-size:11.5px;line-height:1.7;color:var(--text-5)}

  .doc-main{min-width:0;max-width:760px}

  /* intro */
  .doc-eyebrow{font-family:var(--mono);font-size:13px;color:var(--clean-text)}
  .doc-h1{font-family:var(--serif);font-weight:500;font-size:var(--fs-display-3);
    line-height:1.0;letter-spacing:-0.02em;color:var(--text);margin:10px 0 16px}
  .doc-intro{font-size:var(--fs-lead);line-height:1.6;color:var(--text-2);max-width:64ch}
  .doc-note{margin-top:14px;font-family:var(--mono);font-size:12.5px;line-height:1.7;
    color:var(--text-4);max-width:70ch}
  .doc-note a{color:var(--text-3);border-bottom:1px solid var(--border-2)}
  .doc-note a:hover{border-color:var(--text)}

  /* a content section: the signature 1.5px ink top rule above an H2 */
  .doc-sec{margin-top:52px;border-top:1.5px solid var(--text);padding-top:14px}
  .doc-tag{font-family:var(--mono);font-size:12px;font-weight:500;color:var(--clean-text)}
  .doc-sec h2{font-family:var(--serif);font-weight:500;font-size:var(--fs-h2-static);
    line-height:1.1;letter-spacing:-0.01em;color:var(--text);margin:8px 0 12px}
  .doc-sec p{color:var(--text-2);max-width:66ch;margin-bottom:12px}
  .doc-sec p a{color:var(--text);border-bottom:1px solid var(--border-2)}
  .doc-sec p a:hover{border-color:var(--text)}
  .doc-sub{font-family:var(--mono);font-size:12.5px;color:var(--text-4);margin:18px 0 8px}

  /* reference tables — colored name column, rows divided by border-2, ink header */
  .tbl{width:100%;border-collapse:collapse;margin:6px 0 4px;font-size:14px}
  .tbl th{text-align:left;font-family:var(--mono);font-size:11.5px;font-weight:500;
    color:var(--text-4);border-bottom:1.5px solid var(--text);padding:0 14px 8px 0;
    letter-spacing:0;vertical-align:bottom}
  .tbl td{border-bottom:1px solid var(--border-2);padding:10px 14px 10px 0;
    color:var(--text-2);vertical-align:top}
  .tbl td.name{font-family:var(--mono);font-size:13px;white-space:nowrap}
  .tbl td.num{font-family:var(--mono);font-size:13px;color:var(--text-3);white-space:nowrap}
  .tbl td.pol{font-family:var(--mono);font-size:12px;color:var(--text-4);white-space:nowrap}
  .tbl .meth{font-family:var(--mono);font-size:11px;font-weight:700;color:var(--text-4)}

  /* language hint above a code block */
  .code{margin:10px 0 6px}
  .code-lang{display:block;font-family:var(--mono);font-size:11px;color:var(--text-5);
    margin-bottom:6px}

  /* callouts — flat 1px panels, no shadow */
  .callout{border:1px solid var(--border-2);border-radius:6px;background:var(--panel);
    padding:14px 16px;font-size:14px;color:var(--text-2);margin:10px 0}
  .callout .lab{font-family:var(--mono);font-size:11.5px;font-weight:700;color:var(--text-4);
    margin-right:8px}
  .callout-green{background:#E9F4EE;border-color:#A9D8BD;color:#1f3a2b}
  .callout-green .lab{color:var(--clean-text)}
  .callout-green a{color:#15824A;border-bottom:1px solid #A9D8BD}

  /* auth tiers line */
  .auth{font-family:var(--mono);font-size:12.5px;line-height:1.7;color:var(--text-4);
    border:1px solid var(--border-2);border-radius:6px;padding:12px 16px;margin-top:10px}
  .auth b{color:var(--text-2);font-weight:500}

  /* tiers & grades — three columns, each under a 2px tier-colored top rule */
  .tiers{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:6px}
  .tier-col{padding-top:12px}
  .tier-name{font-family:var(--mono);font-weight:700;font-size:14px;letter-spacing:0.02em}
  .tier-range{font-family:var(--mono);font-size:12px;color:var(--text-4);margin:2px 0 10px}
  .tier-grades{list-style:none}
  .tier-grades li{display:flex;justify-content:space-between;gap:12px;
    font-family:var(--mono);font-size:12.5px;color:var(--text-3);
    padding:5px 0;border-bottom:1px solid var(--row)}
  .tier-grades .gr{font-weight:700;color:var(--text)}
  .tier-blurb{margin-top:10px;font-size:13px;color:var(--text-3);line-height:1.5}

  /* closer */
  .closer{margin-top:60px;border-top:1.5px solid var(--text);padding-top:32px;text-align:center}
  .closer-q{font-family:var(--serif);font-style:italic;font-size:var(--fs-quote-lg);
    line-height:1.3;color:var(--text-3);max-width:30ch;margin:0 auto 8px}
  .closer-b{color:var(--text-3);margin-bottom:20px}
  .closer-form{max-width:440px;margin:0 auto}

  @media(max-width:900px){
    .docs{grid-template-columns:1fr;gap:28px}
    .toc{position:static;top:auto;border-bottom:1px solid var(--border);padding-bottom:8px}
    .toc-list{display:flex;flex-wrap:wrap;gap:4px 16px}
    .toc-link{border-left:0;padding:4px 0}
    .toc-meta{margin-top:14px}
  }
  @media(max-width:640px){
    .docs{padding-left:20px;padding-right:20px}
    .tiers{grid-template-columns:1fr;gap:0}
    .tier-col{border-top:2px solid var(--border);margin-top:14px}
  }
`;

// ── small components ───────────────────────────────────────────────────────────

// A content section: the 1.5px ink ledger rule + a mono tag + an anchored H2.
function DocSection({ id, tag, title, children }) {
  return (
    <section id={id} class="doc-sec" aria-labelledby={`${id}-h`}>
      <span class="doc-tag">{tag}</span>
      <h2 id={`${id}-h`}>{title}</h2>
      {children}
    </section>
  );
}

// A dark code block with a visible mono language hint (the language hint the a11y
// spec asks for, in addition to CodeBlock's aria-label). Scrolls, never clips.
function Code({ lang, html }) {
  return (
    <div class="code">
      <span class="code-lang">{lang}</span>
      <CodeBlock html={html} label={`${lang} example`} wrap={false} />
    </div>
  );
}

function EndpointTable({ rows, caption }) {
  return (
    <table class="tbl">
      <caption class="sr-only">{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Endpoint</th>
          <th scope="col">What it returns</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((e) => (
          <tr>
            <td class="name">
              <span class="meth">{e.method}</span>{' '}
              <span style={`color:${tierText('Clean')}`}>{e.path}</span>
            </td>
            <td>{e.desc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── handler ────────────────────────────────────────────────────────────────────

export async function onRequestGet({ request }) {
  const origin = new URL(request.url).origin;
  const metaLine = `definitions·${DEFINITIONS_VERSION} · ${N_DESIGN} design · ${N_COPY} copy · ${N_AEO} AEO · MIT`;

  const doc = (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>How the scan works · slop-detect</title>
        <meta
          name="description"
          content="The slop-detect methodology: a deterministic, weighted, reproducible fingerprint of the design and copy tells AI builders converged on, plus the DESIGN.md system axis and the AEO agent-readability axis. The four axes, the CLI, the API, presets, and the CI gate."
        />
        <link rel="canonical" href={`${ORIGIN}/docs`} />
        <meta property="og:title" content="How the scan works · slop-detect" />
        <meta
          property="og:description"
          content="The methodology behind the AI-design-slop fingerprint: four axes, the CLI, the REST API, presets, MCP, and the CI gate."
        />
        <meta property="og:url" content={`${ORIGIN}/docs`} />
        <meta property="og:image" content={`${ORIGIN}/og.png`} />
        {raw(BRAND_FONTS_HEAD)}
        <style>{raw(BRAND_CSS + UI_CSS + PAGE_CSS)}</style>
      </head>
      <body>
        <Nav origin={origin} current="/docs" />

        <div class="docs">
          {/* sidebar TOC — a nav landmark with in-page anchors */}
          <nav class="toc" aria-label="On this page">
            <ul class="toc-list">
              {TOC.map((t) => (
                <li>
                  <a class="toc-link" href={`#${t.id}`}>
                    {t.label}
                  </a>
                </li>
              ))}
            </ul>
            <p class="toc-meta">{metaLine}</p>
          </nav>

          <main class="doc-main">
            {/* 3. Intro */}
            <p class="doc-eyebrow">/methodology</p>
            <h1 class="doc-h1">How the scan works</h1>
            <p class="doc-intro">
              slop-detect scores a page against a fixed, weighted catalogue of the CSS and copy
              tells that Cursor, v0, Lovable, and Bolt converged on. It runs in real headless
              Chromium against the page's own computed styles. Same page in, same score out: no
              model, no randomness, auditable, reproducible, safe to gate CI on.
            </p>
            <p class="doc-note">
              A fingerprint, not a verdict. Everyone uses AI now; the score measures how generic the
              result reads, nothing about the team behind it. The full positioning against ML
              detectors and Lighthouse lives at <a href={`${origin}/compare`}>/compare</a>; the live
              catalogue is at <a href={`${origin}/api/patterns`}>/api/patterns</a> (definitions·
              {DEFINITIONS_VERSION}).
            </p>

            {/* 4. The four axes */}
            <DocSection id="axes" tag="01" title="The four axes">
              <p>
                A page can be slop in more than one way. slop-detect scores four independent axes;
                the two slop axes want a low score, the system and AEO axes want a high one.
              </p>
              <table class="tbl">
                <thead>
                  <tr>
                    <th scope="col">Axis</th>
                    <th scope="col">What it measures</th>
                    <th scope="col">Polarity</th>
                  </tr>
                </thead>
                <tbody>
                  {FOUR_AXES.map((a) => (
                    <tr>
                      <td class="name" style={`color:${a.color}`}>
                        {a.name}
                      </td>
                      <td>{a.desc}</td>
                      <td class="pol">{a.polarity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DocSection>

            {/* 5. Install */}
            <DocSection id="install" tag="02" title="Install">
              <p>
                Nothing to set up for a one-off scan. <code>npx</code> fetches the CLI, opens the
                page in a real browser, and prints the score.
              </p>
              <Code lang="bash" html={CODE.install} />
            </DocSection>

            {/* 6. The CLI */}
            <DocSection id="cli" tag="03" title="The CLI">
              <p>
                Score one or many URLs. The flags compose: axes, presets, the system axis, CI
                gating.
              </p>
              <Code lang="bash" html={CODE.cli} />
              <div class="callout">
                <span class="lab">tip</span>
                <code>--remote</code> scans through the API and needs no local Playwright install,
                so it is the right default in CI and on air-gapped runners.
              </div>
            </DocSection>

            {/* 7. AEO */}
            <DocSection id="aeo" tag="04" title="AEO · agent-readable">
              <p>
                The AEO axis asks a different question: can AI engines actually fetch, read, and
                cite this page? A page can look perfectly human-made and still be invisible to
                ChatGPT, Claude, or Perplexity because it blocks their crawlers or serves JS soup.{' '}
                {N_AEO} weighted checks, total weight 100. The four required checks are the
                fundamentals; the rest are recommended bonuses. Higher is better: AI-Ready (≥80),
                Partial (≥50), Invisible (&lt;50).
              </p>
              <table class="tbl">
                <thead>
                  <tr>
                    <th scope="col">Check</th>
                    <th scope="col">Weight</th>
                    <th scope="col">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {AEO_CHECKS.map((k) => (
                    <tr>
                      <td>{k.label}</td>
                      <td
                        class="num"
                        style={`color:${k.severity === 'required' ? tierText('Clean') : tierText('Mild')}`}
                      >
                        {k.weight}
                      </td>
                      <td class="pol">{k.severity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div class="callout callout-green">
                <span class="lab">eating our own cooking</span>
                slop-detect serves a markdown twin for every page, publishes an{' '}
                <a href={`${origin}/llms.txt`}>llms.txt</a>, and lets AI crawlers in. Run the axis
                on this very page: <code>POST /api/aeo</code> with{' '}
                <code>{'{ "url": "https://slop-detect.com/docs" }'}</code>.
              </div>
            </DocSection>

            {/* 8. The system axis (DESIGN.md) */}
            <DocSection id="system" tag="05" title="The system axis · DESIGN.md">
              <p>
                The absolute slop score asks "does this look AI-generated?" The system axis asks the
                durable question: does the page honor its own declared design system? Point it at a{' '}
                <a
                  href="https://github.com/google-labs-code/design.md"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  DESIGN.md
                </a>{' '}
                (Google Labs' open spec: colors, typography, radii) and it reports drift: fonts in
                use that aren't declared, CTA or surface colors off the palette, radii off the
                scale. A bespoke site checked against its own system scores Aligned, never "slop".
                Every drift item is a named, contestable signal.
              </p>
              <Code lang="bash" html={CODE.drift} />
            </DocSection>

            {/* 9. Web & REST API */}
            <DocSection id="api" tag="06" title="Web & REST API">
              <p>
                One curl away. POST a URL, read back the grade, score, verdict, and definitions
                version.
              </p>
              <Code lang="bash" html={CODE.curl} />
              <p class="doc-sub">endpoints</p>
              <EndpointTable rows={ENDPOINTS} caption="Public REST endpoints" />
              <p class="auth">
                <b>Auth.</b> No key needed for normal use. GET endpoints are public; POST is per-IP
                rate-limited (scan 6/min from the web, 3/min server-to-server). Pass{' '}
                <code>X-API-Key</code> or <code>Authorization: Bearer</code> for higher, per-key
                limits: <b>free</b> 10/min, <b>pro</b> 60/min, <b>unlimited</b>. Foreign browser
                origins are rejected without a key; the CLI and MCP are not.
              </p>
            </DocSection>

            {/* 10. Continuity & directory */}
            <DocSection id="continuity" tag="07" title="Continuity & directory">
              <p>
                Detection is free and stateless. The optional continuity layer remembers a domain,
                re-scans it daily, and emails you when it regresses to slop or drifts off its
                DESIGN.md between redesigns. <code>list: true</code> also opts the domain into the
                public, crawlable <a href={`${origin}/directory`}>directory</a> with a real
                backlink.
              </p>
              <EndpointTable rows={CONTINUITY} caption="Continuity and directory endpoints" />
            </DocSection>

            {/* 11. Programmatic (core) */}
            <DocSection id="programmatic" tag="08" title="Programmatic · the core engine">
              <p>
                <code>@slop-detect/core</code> is the pure, runtime-agnostic engine: it runs in
                Node, a Cloudflare Worker, or the browser, and knows nothing about fetching a page.
                You open the page, run each pattern's <code>detect()</code> in-page, then hand the
                triggered results to the scorer.
              </p>
              <Code lang="javascript" html={CODE.js} />
            </DocSection>

            {/* 12. Presets & agents */}
            <DocSection id="presets" tag="09" title="Presets & agents">
              <p>
                Not every audience cares about the same tells. A preset scores a curated subset or
                weighting without forking the ruleset. Pass <code>--preset</code> on the CLI or{' '}
                <code>{'{ "preset": "strict" }'}</code> to the API.
              </p>
              <table class="tbl">
                <thead>
                  <tr>
                    <th scope="col">Preset</th>
                    <th scope="col">Scores</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(PRESETS).map((p) => (
                    <tr>
                      <td class="name">{p.id}</td>
                      <td>{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p class="doc-sub">MCP · self-audit before shipping</p>
              <p>
                <code>slop-detect-mcp</code> is a Model Context Protocol server that lets an agent
                scan a page before it ships and pull the fix prompt back into the loop. Four tools:{' '}
                <code>scan_page</code>, <code>check_aeo</code>, <code>check_design_system</code>,{' '}
                <code>fix_prompt</code>.
              </p>
              <Code lang="json" html={CODE.mcp} />
            </DocSection>

            {/* 13. CI gate */}
            <DocSection id="ci" tag="10" title="CI gate · GitHub Action">
              <p>
                The action scans a deploy-preview URL, posts a sticky PR comment with the grade and
                triggered patterns, and fails the check when slop creeps above your threshold.{' '}
                <code>fail-under</code> takes a number (fail if the score exceeds it) or a letter
                grade. Leave it empty for report-only mode.
              </p>
              <Code lang="yaml" html={CODE.ci} />
            </DocSection>

            {/* 14. Tiers & grades */}
            <DocSection id="tiers" tag="11" title="Tiers & grades">
              <p>
                The 0-100 score is the source of truth; the tier and letter grade are derived from
                it. Lower is cleaner. The grade bands are read from the engine, so they cannot
                disagree with the scorer.
              </p>
              <div class="tiers">
                {TIER_COLUMNS.map((col) => (
                  <div class="tier-col" style={`border-top:2px solid ${tierFill(col.tier)}`}>
                    <div class="tier-name" style={`color:${tierText(col.tier)}`}>
                      {col.tier}
                    </div>
                    <div class="tier-range">score {col.range}</div>
                    <ul class="tier-grades">
                      {col.grades.map((g) => (
                        <li>
                          <span class="gr">{g.grade}</span>
                          <span>
                            {g.min}
                            {g.max > g.min ? `-${g.max}` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p class="tier-blurb">{col.blurb}</p>
                  </div>
                ))}
              </div>
            </DocSection>

            {/* 15. Closer */}
            <section class="closer" aria-labelledby="closer-h">
              <blockquote class="closer-q" id="closer-h">
                Empty is better than fake. Show the product, don't decorate around it.
              </blockquote>
              <p class="closer-b">Scan a page and read its fingerprint in about eight seconds.</p>
              <div class="closer-form">
                <ScanInput variant="hero" id="docs-scan" label="Scan" />
              </div>
            </section>
          </main>
        </div>

        <Footer origin={origin} />
      </body>
    </html>
  );

  const html = '<!doctype html>' + doc.toString();
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=1200',
    },
  });
}
