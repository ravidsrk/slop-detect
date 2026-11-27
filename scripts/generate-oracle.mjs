#!/usr/bin/env node
// Exports deterministic oracle test vectors from the TypeScript @slop-detect/core
// engine into spec/oracle/vectors.json so the Rust crates (slop-core, slop-wasm)
// prove byte-for-byte behavioral parity against the canonical contract.
//
// Usage:
//   bun run --filter @slop-detect/core build && node scripts/generate-oracle.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const core = await import('../packages/core/dist/index.js');

const colorInputs = [
  '#181815',
  '#F4F5F2',
  '#1FA85E',
  '#6366f1',
  '#8b5cf6',
  '#fff',
  '#0008',
  'rgb(99, 102, 241)',
  'rgba(24, 24, 21, 0.5)',
  'rgb(31 168 94 / 80%)',
  'hsl(262, 83%, 58%)',
  'hsl(148deg 69% 39% / 0.9)',
  'oklch(0.62 0.21 290)',
  'oklch(55% 0.15 150 / 75%)',
  'oklab(0.65 -0.12 0.08)',
  'rebeccapurple',
];

const colors = colorInputs.map((input) => {
  const parsed = core.parseColor(input);
  return {
    input,
    r: parsed.r,
    g: parsed.g,
    b: parsed.b,
    a: Number(parsed.a.toFixed(6)),
    oklab: {
      L: Number(parsed.oklab.L.toFixed(6)),
      a: Number(parsed.oklab.a.toFixed(6)),
      b: Number(parsed.oklab.b.toFixed(6)),
    },
    oklch: {
      L: Number(parsed.oklch.L.toFixed(6)),
      C: Number(parsed.oklch.C.toFixed(6)),
      h: Number(parsed.oklch.h.toFixed(4)),
    },
    isPurple: core.isPurple(parsed),
    isDark: core.isDark(parsed),
    isNeutral: core.isNeutral(parsed),
  };
});

const colorPairs = [
  ['#181815', '#F4F5F2'],
  ['#1FA85E', '#FFFFFF'],
  ['#6366F1', '#8B5CF6'],
  ['#777777', '#888888'],
  ['oklch(0.62 0.21 290)', '#8b5cf6'],
].map(([a, b]) => {
  const ca = core.parseColor(a);
  const cb = core.parseColor(b);
  return {
    a,
    b,
    deltaEOklab: Number(core.deltaEOklab(ca, cb).toFixed(6)),
    contrastRatio: Number(core.contrastRatio(ca, cb).toFixed(4)),
  };
});

const validDesignMd = `---
name: "Editorial Paper"
specVersion: "alpha"
colors:
  surface: "#F4F5F2"
  ink: "#181815"
  accent: "#1FA85E"
  onAccent: "#181815"
typography:
  h1:
    fontFamily: "Newsreader"
    fontSize: 48px
    lineHeight: 1.15
  body:
    fontFamily: "Libre Franklin"
    fontSize: 16px
    lineHeight: 1.5
rounded:
  none: 0px
  sm: 4px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.onAccent}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
---

# Editorial Paper
`;

const brokenDesignMd = `---
name: "Broken System"
specVersion: "v2"
colors:
  surface: "#FFFFFF"
  muted: "#CCCCCC"
  orphan: "#123456"
  loopA: "{colors.loopB}"
  loopB: "{colors.loopA}"
components:
  bad-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
  missing-ref:
    backgroundColor: "{colors.doesNotExist}"
    textColor: "{colors.surface}"
---
`;

const updatedDesignMd = `---
name: "Editorial Paper"
specVersion: "alpha"
colors:
  surface: "#F4F5F2"
  ink: "#111110"
  accent: "#1FA85E"
  onAccent: "#181815"
  brandBlue: "#0F4C81"
typography:
  h1:
    fontFamily: "Newsreader"
    fontSize: 48px
    lineHeight: 1.15
rounded:
  none: 0px
  sm: 4px
---
`;

const dtcgSample = JSON.stringify(
  {
    $name: 'Studio Tokens',
    colors: {
      $type: 'color',
      surface: {
        $value: { colorSpace: 'srgb', components: [0.9569, 0.9608, 0.949], hex: '#F4F5F2' },
      },
      ink: { $value: { colorSpace: 'srgb', components: [0.0941, 0.0941, 0.0824], hex: '#181815' } },
      brand: { $value: '{colors.ink}' },
    },
    typography: {
      $type: 'fontFamily',
      heading: { $value: ['Newsreader', 'Georgia', 'serif'] },
    },
    radii: {
      $type: 'dimension',
      sm: { $value: { value: 4, unit: 'px' } },
    },
    spacing: {
      $type: 'dimension',
      md: { $value: { value: 16, unit: 'px' } },
    },
  },
  null,
  2
);

const observedAligned = {
  fonts: { '"Newsreader", serif': 4, '"Libre Franklin", sans-serif': 20 },
  surface: 'rgb(244, 245, 242)',
  headings: [{ tag: 'H1', color: 'rgb(24, 24, 21)', fontFamily: 'Newsreader', fontSize: 48 }],
  ctas: [{ bg: 'rgb(31, 168, 94)', color: 'rgb(24, 24, 21)', text: 'Start audit' }],
  radii: [4],
  spacings: [8, 16, 24],
  fontSizes: [16, 48],
  typographyStyles: [
    { tag: 'H1', fontFamily: 'Newsreader', fontSize: 48, lineHeight: 1.15, letterSpacing: 0 },
    { tag: 'P', fontFamily: 'Libre Franklin', fontSize: 16, lineHeight: 1.5, letterSpacing: 0 },
  ],
};

const observedDrifting = {
  fonts: { '"Inter", sans-serif': 24 },
  surface: 'rgb(10, 10, 20)',
  headings: [{ tag: 'H1', color: 'rgb(139, 92, 246)', fontFamily: 'Inter', fontSize: 72 }],
  ctas: [{ bg: 'rgb(99, 102, 241)', color: 'rgb(255, 255, 255)', text: 'Get Started' }],
  radii: [16, 24],
  spacings: [12, 36],
  fontSizes: [14, 72],
  typographyStyles: [],
};

const designMdVectors = {
  lintValid: core.lintDesignMd(validDesignMd),
  lintBroken: core.lintDesignMd(brokenDesignMd),
  diff: core.diffDesignMd(validDesignMd, updatedDesignMd),
  dtcgParsed: core.parseDtcgTokens(dtcgSample),
  systemAligned: (() => {
    const res = core.scoreSystemCompliance(core.parseDesignMd(validDesignMd), observedAligned);
    return {
      score: res.score,
      tier: res.tier,
      driftIds: res.drift.map((d) => d.id),
      checkStatuses: Object.fromEntries(res.checks.map((c) => [c.id, c.status])),
    };
  })(),
  systemDrifting: (() => {
    const res = core.scoreSystemCompliance(core.parseDesignMd(validDesignMd), observedDrifting);
    return {
      score: res.score,
      tier: res.tier,
      driftIds: res.drift.map((d) => d.id),
      checkStatuses: Object.fromEntries(res.checks.map((c) => [c.id, c.status])),
    };
  })(),
  fixtures: {
    validDesignMd,
    brokenDesignMd,
    updatedDesignMd,
    dtcgSample,
    observedAligned,
    observedDrifting,
  },
};

const designScoreCases = [
  {
    name: 'clean_empty',
    patterns: [],
  },
  {
    name: 'inter_only_co_signal_zeroed',
    patterns: [
      {
        id: 'slop_fonts',
        weight: 8,
        triggered: true,
        evidence: { heroFam: 'Inter', interOrGeistOnly: true },
      },
    ],
  },
  {
    name: 'inter_plus_centered_hero_capped_at_8',
    patterns: [
      {
        id: 'slop_fonts',
        weight: 8,
        triggered: true,
        evidence: { heroFam: 'Inter', interOrGeistOnly: true },
      },
      { id: 'centered_hero', weight: 4, triggered: true, evidence: { centered: true } },
    ],
  },
  {
    name: 'purple_alone_zeroed',
    patterns: [
      {
        id: 'purple_accent',
        weight: 4,
        triggered: true,
        evidence: { count: 2, samples: ['#6366f1'] },
      },
      { id: 'gradient_text', weight: 6, triggered: false, evidence: {} },
    ],
  },
  {
    name: 'purple_with_co_signal_kept',
    patterns: [
      { id: 'purple_accent', weight: 4, triggered: true, evidence: { count: 2 } },
      { id: 'gradient_text', weight: 6, triggered: true, evidence: { count: 1 } },
      { id: 'glassmorphism', weight: 4, triggered: true, evidence: { count: 2 } },
    ],
  },
  {
    name: 'overlapping_nodes_dedup',
    patterns: [
      {
        id: 'gradient_text',
        weight: 6,
        triggered: true,
        evidence: { nodeIds: ['h1:10:hero', 'span:20:sub'] },
      },
      {
        id: 'colored_glows',
        weight: 4,
        triggered: true,
        evidence: { nodeIds: ['h1:10:hero', 'span:20:sub'] },
      },
    ],
  },
  {
    name: 'heavy_vibecode_stack',
    patterns: [
      { id: 'slop_fonts', weight: 8, triggered: true, evidence: { heroFam: 'Space Grotesk' } },
      { id: 'centered_hero', weight: 4, triggered: true, evidence: {} },
      { id: 'gradient_text', weight: 6, triggered: true, evidence: {} },
      { id: 'glassmorphism', weight: 4, triggered: true, evidence: {} },
      { id: 'bento_grid', weight: 4, triggered: true, evidence: {} },
      { id: 'aurora_mesh_gradient', weight: 5, triggered: true, evidence: {} },
      { id: 'hero_eyebrow_pill', weight: 5, triggered: true, evidence: {} },
    ],
  },
].map((tc) => {
  const scored = core.scorePatterns(tc.patterns);
  return {
    name: tc.name,
    input: tc.patterns,
    expected: {
      score: scored.score,
      tier: scored.tier,
      grade: scored.grade,
      verdict: scored.verdict,
      adjustmentRules: scored.adjustments.map((a) => ({
        ruleId: a.ruleId,
        targetPatternId: a.targetPatternId,
        delta: a.delta,
      })),
    },
  };
});

const combineAxesCases = [
  { design: { score: 4, tier: 'Clean' }, copy: { score: 2, tier: 'Clean' } },
  { design: { score: 18, tier: 'Mild' }, copy: { score: 4, tier: 'Clean' } },
  { design: { score: 20, tier: 'Mild' }, copy: { score: 15, tier: 'Mild' } },
  { design: { score: 34, tier: 'Heavy' }, copy: { score: 22, tier: 'Heavy' } },
].map((input) => ({
  input,
  expected: core.combineAxes(input),
}));

const cleanHumanProse = [
  'Our print shop opened on Fourth Street in 1994 with a single Heidelberg windmill press and two shelves of lead type.',
  'We still set wedding announcements, hardware catalogs, and municipal forms on heavy cotton stock cut to size in the back room.',
  'Customers walk in with a sketch on graph paper, pick an ink tin off the counter, and inspect the first proof before the run starts.',
  'Because every press runs on mechanical registration rather than digital toner, a two-color poster takes about forty minutes to lock up and clean down.',
  'Most jobs leave the shop in brown kraft boxes within three business days, priced by sheet count and press hours rather than subscription tiers.',
  'Last winter we rebuilt the paper cutter flywheel with parts machined down the block and catalogued forty drawers of wood display letters.',
  'If you need foil stamping, blind debossing, or numbered raffle books, send your dimensions and paper weight by Tuesday afternoon so we can pull stock from the mill truck.',
  'Parking is behind the loading dock off Maple Alley, and press checks run every morning between eight and eleven.',
].join(' ');

const heavyAiCopy = [
  "In today's fast-paced digital world, it's not just a dashboard — it's a revolutionary, cutting-edge ecosystem designed to seamlessly elevate, streamline, harness, unlock, and supercharge your workflow.",
  'Whether you are a solo founder, a growing startup, or an enterprise team, our robust and holistic platform empowers you to leverage unparalleled synergy and effortless scalability across every department.',
  'Delve into a transformative tapestry of next-generation insights — built for speed, engineered for scale, crafted for perfection — so you can navigate the ever-evolving landscape with ease and confidence.',
  'Here is a quick summary of what you get: fast setup, reliable analytics, and modern security. It is not merely software; it is a game-changing paradigm shift for future-proof teams.',
  'Modern organizations cannot afford fragmented tools when customers expect frictionless experiences from the very first interaction. Our innovative architecture bridges the gap between strategy and execution, turning raw complexity into actionable clarity.',
  'Whether you are scaling global operations, streamlining customer onboarding, or unlocking hidden revenue streams, every feature works harmoniously to foster collaboration, accelerate velocity, and elevate outcomes.',
  'Ready to reimagine what is possible? Embark on your journey today and take your productivity to the next level. In conclusion, this seamless solution unlocks your full potential.',
].join(' ');

const pasteArtifactCopy = {
  text: 'Sure! Here is your updated homepage copy for [Company Name]. Check our guide: **Bold Launch** and ## Subheading. :contentReference[oaicite:0]{index=0} Regenerate response.',
  links: [{ href: 'https://example.com/pricing?utm_source=chatgpt.com', text: 'Pricing' }],
  wordCount: 25,
  proseWordCount: 25,
};

const copyCases = [
  { name: 'clean_human_prose', input: { text: cleanHumanProse, lang: 'en' } },
  { name: 'heavy_ai_copy', input: { text: heavyAiCopy, lang: 'en' } },
  {
    name: 'short_prose_gated',
    input: { text: 'Short marketing snippet with seamless synergy.', lang: 'en' },
  },
  {
    name: 'non_english_gated',
    input: {
      text: 'Bonjour et bienvenue sur notre atelier artisanal de menuiserie traditionnelle situe dans le centre historique de Lyon depuis plusieurs generations.',
      lang: 'fr',
    },
  },
  { name: 'paste_artifacts', input: pasteArtifactCopy },
].map((tc) => {
  const res = core.scoreCopy(tc.input);
  return {
    name: tc.name,
    input: tc.input,
    expected: {
      score: res.score,
      tier: res.tier,
      grade: res.grade,
      isEnglish: res.isEnglish,
      proseConfidence: res.proseConfidence,
      thin: res.thin,
      triggeredIds: res.patterns.filter((p) => p.triggered).map((p) => p.id),
    },
  };
});

const robotsCases = [
  {
    name: 'allow_all_default',
    robotsTxt: 'User-agent: *\nAllow: /\n',
    pathname: '/',
    fetchInfo: { status: 200, contentType: 'text/plain' },
  },
  {
    name: 'block_training_allow_search',
    robotsTxt:
      'User-agent: GPTBot\nDisallow: /\n\nUser-agent: ClaudeBot\nDisallow: /\n\nUser-agent: *\nAllow: /\n',
    pathname: '/docs',
    fetchInfo: { status: 200, contentType: 'text/plain' },
  },
  {
    name: 'rfc9309_longest_match_and_tie_allow_wins',
    robotsTxt:
      'User-agent: OAI-SearchBot\nDisallow: /docs/\nAllow: /docs/public\nDisallow: /exact$\nAllow: /exact$\n',
    pathname: '/docs/public/guide',
    fetchInfo: { status: 200, contentType: 'text/plain' },
  },
  {
    name: 'cloudflare_managed_collateral',
    robotsTxt:
      '# BEGIN Cloudflare Managed content\nUser-agent: *\nDisallow: /\n# END Cloudflare Managed content\n',
    pathname: '/',
    fetchInfo: { status: 200, contentType: 'text/plain' },
  },
  {
    name: 'applebot_inherits_googlebot',
    robotsTxt: 'User-agent: Googlebot\nDisallow: /private/\n',
    pathname: '/private/secret',
    fetchInfo: { status: 200, contentType: 'text/plain' },
  },
  {
    name: 'rfc9309_5xx_disallows_all',
    robotsTxt: '',
    pathname: '/',
    fetchInfo: { status: 503, contentType: 'text/plain' },
  },
  {
    name: 'rfc9309_404_allows_all',
    robotsTxt: 'Not Found',
    pathname: '/',
    fetchInfo: { status: 404, contentType: 'text/html' },
  },
].map((tc) => {
  const res = core.evaluateRobotsTxt(tc.robotsTxt, tc.pathname, tc.fetchInfo);
  return {
    ...tc,
    expected: {
      fetchOutcome: res.fetchOutcome,
      searchAllowed: res.searchAllowed,
      searchBlocked: res.searchBlocked,
      trainingBlocked: res.trainingBlocked,
      cloudflareManaged: res.cloudflareManaged,
      cloudflareSearchCollateral: res.cloudflareSearchCollateral,
    },
  };
});

const previewCases = [
  {
    name: 'clean_preview',
    headers: {},
    html: '<html><head><title>Doc</title></head><body><main><p>Readable article prose here.</p></main></body></html>',
  },
  {
    name: 'x_robots_scoped_google_nosnippet',
    headers: { 'x-robots-tag': 'googlebot: nosnippet, bingbot: index' },
    html: '<html><body><p>Hello world</p></body></html>',
  },
  {
    name: 'meta_global_noindex',
    headers: {},
    html: '<html><head><meta name="robots" content="noindex, nofollow"></head><body><p>Private</p></body></html>',
  },
].map((tc) => {
  const res = core.parsePreviewDirectives(tc.headers, tc.html);
  return {
    ...tc,
    expected: {
      status: res.status,
      earnedWeight: res.earnedWeight,
      globalNoindex: res.globalNoindex,
      googleStatus: res.engines.google.status,
      bingStatus: res.engines.bing.status,
      appleStatus: res.engines.apple.status,
    },
  };
});

const llmsCases = [
  {
    name: 'valid_llms_txt',
    body: '# Slop Detector\n\n> Deterministic page auditor.\n\n## Docs\n- [Guide](https://slop-detect.com/docs.md): Documentation\n',
    contentType: 'text/plain; charset=utf-8',
  },
  {
    name: 'html_soft_404',
    body: '<!doctype html><html><body><h1>Not Found</h1></body></html>',
    contentType: 'text/html',
  },
  {
    name: 'missing_h1_and_links',
    body: 'Just some plain text without headings or markdown links.',
    contentType: 'text/plain',
  },
].map((tc) => {
  const res = core.validateLlmsTxt(tc.body, tc.contentType);
  return {
    ...tc,
    expected: {
      valid: res.valid,
      hasH1: res.hasH1,
      linkCount: res.linkCount,
      isHtml: res.isHtml,
    },
  };
});

const craftCases = {
  scoreClean: (() => {
    const res = core.scoreCraft({
      viewport_meta_missing: { triggered: false, status: 'pass' },
      mobile_reflow_failure: { triggered: false, status: 'pass' },
      focus_indicator_missing: { triggered: false, status: 'pass' },
    });
    return { score: res.score, failedIds: res.failed.map((f) => f.id) };
  })(),
  scoreDefective: (() => {
    const res = core.scoreCraft({
      viewport_meta_missing: { triggered: true, status: 'fail' },
      mobile_reflow_failure: { triggered: true, status: 'fail' },
      focus_indicator_missing: { triggered: false, status: 'pass' },
    });
    return { score: res.score, failedIds: res.failed.map((f) => f.id) };
  })(),
  mobileReflowOverflow: core.evaluateMobileReflow({
    viewportWidth: 390,
    scrollWidth: 480,
    elements: [
      {
        tag: 'DIV',
        text: 'Wide hero box',
        rect: { left: 0, top: 0, right: 480, bottom: 100, width: 480, height: 100 },
        opacity: 1,
      },
    ],
  }),
};

const oracle = {
  schemaVersion: 1,
  definitionsVersion: core.DEFINITIONS_VERSION,
  slopDetectVersion: core.SLOP_DETECT_VERSION,
  counts: {
    designPatterns: core.PATTERNS.length,
    copyPatterns: core.COPY_PATTERNS.length,
    craftChecks: core.CRAFT_CHECKS.length,
    aeoChecks: core.AEO_CHECKS.length,
  },
  colors,
  colorPairs,
  designMd: designMdVectors,
  designScore: designScoreCases,
  combineAxes: combineAxesCases,
  copy: copyCases,
  aeo: {
    robots: robotsCases,
    preview: previewCases,
    llms: llmsCases,
  },
  craft: craftCases,
};

const outDir = path.join(ROOT, 'spec', 'oracle');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'vectors.json');
fs.writeFileSync(outPath, `${JSON.stringify(oracle, null, 2)}\n`);
console.log(
  `wrote ${outPath} (${oracle.counts.designPatterns} design, ${oracle.counts.copyPatterns} copy, ${oracle.counts.craftChecks} craft, ${oracle.counts.aeoChecks} aeo)`
);
