import { test, expect } from 'vitest';
import {
  CRAFT_CHECKS,
  applyDesignSystemWaivers,
  buildAvoidList,
  buildFixPrompt,
  buildSarifReport,
  compareScans,
  htmlToCopyInput,
  measureMobileReflowOnPage,
  parseDesignMd,
  parsePreviewDirectives,
  runAeoChecks,
  scoreMultiPageCopy,
  scorePatterns,
  scoreSiteCopy,
} from '@slop-detect/core';

const FONT_MD = `---
name: Fonts
typography:
  h1:
    fontFamily: Inter
---
`;

test('a font waiver recomputes the capped score instead of subtracting original weights', () => {
  const patterns = [
    { id: 'slop_fonts', weight: 8, triggered: true, evidence: { heroFam: 'Inter' } },
    { id: 'centered_hero', weight: 4, triggered: true, evidence: {} },
    { id: 'gradient_text', weight: 6, triggered: true, evidence: { samples: ['hero'] } },
  ];
  const raw = scorePatterns(patterns);
  expect(raw.score).toBe(14);
  const waived = applyDesignSystemWaivers({ ...raw, patterns }, parseDesignMd(FONT_MD));
  expect(waived.rawScore).toBe(14);
  expect(waived.score).toBe(6);
  expect(waived.waivedPatterns.map((item) => item.id).sort()).toEqual([
    'centered_hero',
    'slop_fonts',
  ]);
});

test('a declared color waives only the observed surface or accent', () => {
  const parsed = parseDesignMd(`---
name: Mismatch
colors:
  primary: "oklch(0.585 0.233 277.1)"
  ink: "#111111"
---
`);
  const scan = {
    score: 8,
    tier: 'Clean',
    patterns: [
      {
        id: 'purple_accent',
        weight: 4,
        triggered: true,
        evidence: { samples: [{ bg: '#c026d3' }] },
      },
      {
        id: 'perma_dark_mode',
        weight: 4,
        triggered: true,
        evidence: { surface: '#1e293b' },
      },
    ],
  };
  const waived = applyDesignSystemWaivers(scan, parsed);
  expect(waived.waivedPatterns).toEqual([]);
  expect(waived.score).toBe(8);

  const empty = applyDesignSystemWaivers(
    {
      score: 8,
      tier: 'Clean',
      patterns: [
        { id: 'purple_accent', weight: 4, triggered: true, evidence: {} },
        { id: 'perma_dark_mode', weight: 4, triggered: true, evidence: {} },
      ],
    },
    parsed
  );
  expect(empty.waivedPatterns).toEqual([]);
  expect(empty.score).toBe(8);
});

test('waived patterns are not brief findings, regressions, SARIF results, or fix-prompt work', () => {
  const page = {
    url: 'https://example.com/',
    score: 6,
    tier: 'Clean',
    definitionsVersion: '2026.11',
    patterns: [
      {
        id: 'purple_accent',
        triggered: true,
        waived: true,
        label: 'Purple accent',
        weight: 4,
        evidence: { samples: ['#6366f1'] },
      },
      {
        id: 'gradient_text',
        triggered: true,
        label: 'Gradient text',
        weight: 6,
        evidence: { selector: 'h1', samples: ['hero'] },
      },
    ],
  };
  const brief = buildAvoidList(page);
  expect(brief).not.toMatch(/purple_accent/);
  expect(brief).toMatch(/gradient_text/);

  const report = compareScans(
    { url: 'https://example.com/', score: 10, definitionsVersion: '2026.11', patterns: [] },
    page
  );
  expect(report.patternsAdded).toEqual(['gradient_text']);
  expect(report.regression).toBe(true);
  const waivedOnly = compareScans(
    { url: 'https://example.com/', score: 10, definitionsVersion: '2026.11', patterns: [] },
    { ...page, score: 6, patterns: [page.patterns[0]] }
  );
  expect(waivedOnly.patternsAdded).toEqual([]);
  expect(waivedOnly.regression).toBe(false);

  const sarif = buildSarifReport([page]);
  const resultIds = sarif.runs[0].results.map((result) => result.ruleId);
  expect(resultIds).not.toContain('purple_accent');
  expect(resultIds).toContain('gradient_text');

  const prompt = buildFixPrompt({
    url: 'https://example.com/',
    score: 8,
    tier: 'Clean',
    patterns: [
      {
        id: 'slop_fonts',
        triggered: true,
        waived: true,
        label: 'Fonts',
        evidence: { heroFam: 'Inter' },
      },
    ],
  });
  expect(prompt).toMatch(/nothing to fix/);
  expect(prompt).not.toMatch(/Inter, Geist/);
});

test('mobile reflow is unknown on a desktop viewport and runs at phone width', async () => {
  const mobile = CRAFT_CHECKS.find((check) => check.id === 'mobile_reflow_failure');
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  const prevStyle = globalThis.getComputedStyle;
  globalThis.document = { body: {}, documentElement: { scrollWidth: 390 } };
  globalThis.getComputedStyle = () => ({ backgroundColor: 'rgb(255, 255, 255)' });
  try {
    globalThis.window = { innerWidth: 1280, innerHeight: 800 };
    const desktop = mobile.extract({ visible: [], parseColor: () => null });
    expect(desktop.status).toBe('unknown');
    expect(desktop.triggered).toBe(false);

    globalThis.window = { innerWidth: 390, innerHeight: 800 };
    const phone = mobile.extract({ visible: [], parseColor: () => null });
    expect(phone.status).toBeUndefined();
    expect(phone.triggered).toBe(false);
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
    globalThis.getComputedStyle = prevStyle;
  }

  const widths = [];
  const page = {
    async setViewportSize({ width }) {
      widths.push(width);
    },
    async evaluate() {
      return { triggered: true, subtypes: ['page_overflow'] };
    },
  };
  const measured = await measureMobileReflowOnPage(page);
  expect(measured.triggered).toBe(true);
  expect(widths).toEqual([390, 1280]);

  const blocked = await measureMobileReflowOnPage({
    async setViewportSize() {
      throw new Error('viewport resize is not available');
    },
    async evaluate() {
      return { triggered: false };
    },
  });
  expect(blocked.status).toBe('unknown');
  expect(blocked.triggered).toBe(false);
});

test('off-screen hidden text is unmeasured and a focused ring is per control', () => {
  const stuck = CRAFT_CHECKS.find((check) => check.id === 'content_stuck_hidden');
  const make = (text, top) => ({
    closest: () => null,
    childNodes: [{ nodeType: 3, nodeValue: text }],
    getBoundingClientRect: () => ({
      top,
      bottom: top + 40,
      left: 8,
      right: 180,
      width: 172,
      height: 40,
    }),
  });
  const below = make('This section waits for the reader to scroll down the page.', 900);
  const visible = make('This heading is already inside the first viewport.', 40);
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  const prevStyle = globalThis.getComputedStyle;
  globalThis.document = {
    body: { querySelectorAll: () => [below, visible] },
  };
  globalThis.window = { innerWidth: 1280, innerHeight: 800 };
  globalThis.getComputedStyle = () => ({
    display: 'block',
    opacity: '0',
    visibility: 'visible',
  });
  try {
    const result = stuck.extract();
    expect(result.count).toBe(1);
    expect(result.samples[0]).toMatch(/first viewport/);
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
    globalThis.getComputedStyle = prevStyle;
  }

  const focus = CRAFT_CHECKS.find((check) => check.id === 'focus_indicator_missing');
  const doc = { activeElement: null, styleSheets: [] };
  const control = (matches) => ({
    tagName: 'BUTTON',
    className: '',
    disabled: false,
    style: { outline: '', outlineWidth: '', boxShadow: '', borderColor: '' },
    getAttribute: () => null,
    hasAttribute: () => false,
    getBoundingClientRect: () => ({ top: 12, width: 80, height: 32 }),
    matches,
    focus() {
      doc.activeElement = this;
    },
    blur() {
      doc.activeElement = null;
    },
  });
  const special = control((sel) => sel === 'button.special');
  const plain = control((sel) => sel === 'button.plain');
  doc.styleSheets = [
    {
      cssRules: [
        {
          selectorText: 'button.special:focus',
          cssText: 'button.special:focus { outline: none; }',
        },
      ],
    },
  ];
  globalThis.document = doc;
  globalThis.window = { innerHeight: 800 };
  globalThis.getComputedStyle = (el) =>
    el === special && doc.activeElement === special
      ? { outlineStyle: 'none', outlineWidth: '0px', boxShadow: 'rgb(0, 0, 255) 0px 0px 0px 3px' }
      : { outlineStyle: 'none', outlineWidth: '0px', boxShadow: 'none' };
  try {
    const ring = focus.extract({ visible: [special, plain] });
    expect(ring.missingCount).toBe(0);

    globalThis.getComputedStyle = () => ({
      outlineStyle: 'none',
      outlineWidth: '0px',
      boxShadow: 'none',
    });
    const bare = focus.extract({ visible: [special, plain] });
    expect(bare.missingCount).toBe(1);
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
    globalThis.getComputedStyle = prevStyle;
  }
});

test('combined X-Robots-Tag scopes stay with their bot', () => {
  const combined = parsePreviewDirectives(
    new Headers({ 'x-robots-tag': 'googlebot: index, bingbot: noindex' }),
    '<p>Hello</p>'
  );
  expect(combined.engines.google.directives).toContain('index');
  expect(combined.engines.google.directives.join(' ')).not.toMatch(/bingbot/);
  expect(combined.engines.bing.directives).toContain('noindex');
  expect(combined.engines.bing.status).toBe('fail');

  const googleOnly = parsePreviewDirectives(
    new Headers({ 'x-robots-tag': 'googlebot: nosnippet, max-snippet:40' }),
    ''
  );
  expect(googleOnly.engines.google.directives).toEqual(['nosnippet', 'max-snippet:40']);
  expect(googleOnly.engines.bing.directives).toEqual([]);

  const all = parsePreviewDirectives(new Headers({ 'x-robots-tag': 'nosnippet, noindex' }), '');
  expect(all.globalNoindex).toBe(true);
  expect(all.engines.google.directives).toContain('noindex');
  expect(all.engines.bing.directives).toContain('noindex');
});

test('server text coverage needs prose or a rendered comparison', async () => {
  const page = async (html) => {
    const res = await runAeoChecks('https://coverage.example/', {
      fetchImpl: async (target) => {
        const path = new URL(target).pathname;
        if (path === '/') {
          return new Response(html, { status: 200, headers: { 'content-type': 'text/html' } });
        }
        return new Response('missing', { status: 404 });
      },
    });
    return res.checks.find((check) => check.id === 'html.serverTextCoverage').status;
  };
  expect(await page('<div id="root" class="app"></div>')).toBe('unknown');
  expect(await page('<div id="root"></div>')).toBe('fail');
  expect(
    await page(`<html><body><p>${'readable server prose '.repeat(12)}</p></body></html>`)
  ).toBe('pass');
});

test('preview points use the parsed weight, and alternate URLs are judged on their own response', async () => {
  const nosnippet = await runAeoChecks('https://preview.example/', {
    fetchImpl: async (target) => {
      const path = new URL(target).pathname;
      if (path === '/') {
        return new Response(
          '<html><head><meta name="googlebot" content="nosnippet"></head><body><p>Server rendered documentation for agents and readers.</p></body></html>',
          { status: 200, headers: { 'content-type': 'text/html' } }
        );
      }
      return new Response('missing', { status: 404 });
    },
  });
  const preview = nosnippet.checks.find((check) => check.id === 'ai.previewControls');
  expect(preview.detail.earnedWeight).toBe(3);
  expect(preview.status).toBe('fail');
  const applicable = nosnippet.checks.filter(
    (check) => check.weight > 0 && !['na', 'unknown', 'info'].includes(check.status)
  );
  const wholeCheckPoints = applicable.reduce(
    (sum, check) =>
      sum +
      (check.status === 'pass' ? check.weight : check.status === 'warn' ? check.weight * 0.5 : 0),
    0
  );
  expect(nosnippet.earnedWeight).toBe(wholeCheckPoints + preview.detail.earnedWeight);

  const markdown = `# Docs\n\n${'A validated markdown twin with enough prose for the checker.\n\n'.repeat(3)}`;
  const advertised = await runAeoChecks('https://ads.example/docs', {
    fetchImpl: async (target) => {
      const path = new URL(target).pathname;
      if (path === '/docs') {
        return new Response(
          '<html><head><link rel="alternate" type="text/markdown" href="/missing.md"></head><body><p>Server rendered documentation for agents and readers across the docs page.</p></body></html>',
          { status: 200, headers: { 'content-type': 'text/html' } }
        );
      }
      if (path === '/missing.md') return new Response('missing', { status: 404 });
      if (path === '/docs.md') {
        return new Response(markdown, {
          status: 200,
          headers: { 'content-type': 'text/markdown' },
        });
      }
      return new Response('missing', { status: 404 });
    },
  });
  expect(advertised.checks.find((check) => check.id === 'md.twin').status).toBe('pass');
  const alternate = advertised.checks.find((check) => check.id === 'html.linkAlternate');
  expect(alternate.status).toBe('fail');
  expect(alternate.detail.twinValid).toBe(false);

  const malformed = await runAeoChecks('https://bad-alt.example/', {
    fetchImpl: async (target) => {
      const path = new URL(target).pathname;
      if (path === '/') {
        return new Response(
          '<html><head><link rel="alternate" type="text/markdown" href="http://["></head><body><p>Server rendered documentation for agents and readers on this page.</p></body></html>',
          { status: 200, headers: { 'content-type': 'text/html' } }
        );
      }
      if (path === '/index.md') {
        return new Response(markdown, {
          status: 200,
          headers: { 'content-type': 'text/markdown' },
        });
      }
      return new Response('missing', { status: 404 });
    },
  });
  expect(malformed.axis).toBe('aeo');
  expect(
    malformed.checks.find((check) => check.id === 'html.linkAlternate').detail.invalidUrl
  ).toBe(true);
  expect(malformed.checks.find((check) => check.id === 'md.twin').status).toBe('pass');
});

test('multi-page copy strips shared headings and paragraphs before statistical scoring', () => {
  const closer = 'In conclusion, the operators close every review with the same final sentence.';
  const pages = [1, 2, 3, 4, 5].map((i) => {
    const body = Array.from(
      { length: 8 },
      (_, shard) =>
        `On service node ${i} shard ${shard}, we connect directly to your production Postgres database and stream row-level changes over a dedicated TLS tunnel with deterministic latency histograms for on-call engineers.`
    );
    return {
      url: `https://site.example/page-${i}`,
      lang: 'en',
      text: [...body, closer].join('\n\n'),
      headings: ['Shared operations footer heading'],
      paragraphs: [body[0], body[1], closer],
    };
  });
  const scored = scoreMultiPageCopy(pages);
  expect(scored.status).toBe('ok');
  const closers = scored.pages[0].result.patterns.find(
    (pattern) => pattern.id === 'formulaic_closers'
  );
  expect(closers.triggered).toBe(false);
  expect(scored.score).toBe(0);
});

test('static HTML copy keeps links and image sources', () => {
  const page = htmlToCopyInput(
    `<html lang="en"><script>secret token</script><h1>Hello</h1><p>Visible copy stays.</p><a href="https://example.com/start?utm_source=chatgpt.com">Ask</a><img src="https://i.pravatar.cc/80" alt="person"></html>`,
    'one.html'
  );
  expect(page.text).not.toMatch(/secret token/);
  expect(page.headings).toEqual(['Hello']);
  expect(page.links.map((link) => link.href)).toEqual([
    'https://example.com/start?utm_source=chatgpt.com',
  ]);
  expect(
    page.attributes.some((attr) => attr.attr === 'src' && attr.value.includes('i.pravatar.cc'))
  ).toBe(true);
  const report = scoreSiteCopy([page]);
  expect(report.artifactFindings.map((finding) => finding.patternId)).toEqual(
    expect.arrayContaining(['ai_referral_utm_links', 'structural_fake_social_proof'])
  );
});
