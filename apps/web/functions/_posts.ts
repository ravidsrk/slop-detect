// Seed content for /blog. Posts are authored once here as markdown (single
// source of truth); the dynamic route renders them to HTML and also serves the
// raw markdown twin at /blog/<slug>.md, the AEO convention the tool preaches.
//
// Bodies are deliberately written clean (commas/colons, no buzzwords) so the
// blog passes the copy axis it represents.

import { escapeHtml } from './_shared.js';

export const POSTS = [
  {
    slug: 'four-axis-calibration-2026-09',
    title: 'Calibrating the four-axis instrument: design, copy, system, and AEO',
    date: '2026-10-17',
    image: '/media/docs-four-axes-architecture.png',
    imageAlt: 'Four-axis telemetry architecture schematic for definitions 2026.09',
    summary:
      'How definitions 2026.09 unifies 27 CSS and DOM rules, 9 prose checks, DESIGN.md token compliance, and 8 AEO crawler checks into one deterministic audit.',
    body: `A single visual score catches template reflexes, but modern web software fails in four distinct ways. A landing page can wear a generated layout, speak in repetitive machine prose, drift off its team's declared design tokens, or ship an empty client-rendered shell that AI answer engines cannot read.

## Four independent axes with explicit polarity

In definitions 2026.09, the engine separates these concerns into four orthogonal axes:

- Design slop: 27 weighted CSS and DOM checks run in real headless Chromium. Lower is cleaner (0 to 9 Clean, 10 to 27 Mild, 28 and up Heavy).
- Copy slop: 9 prose checks run against extracted page text at zero extra navigation cost. Lower is cleaner (0 to 7 Clean, 8 to 19 Mild, 20 and up Heavy).
- System compliance (DESIGN.md): relative verification against the repository's own declared colors, typography, and corner radii. Higher is better (80 to 100 Aligned, 50 to 79 Drifting, below 50 Off-system).
- AEO readiness: 8 crawler and content-negotiation checks verifying whether answer engines can index and cite the page. Higher is better (80 to 100 AI-Ready).

## Inspecting DOM strata in 3D

When a page triggers multiple design or layout rules, reading a flat list of rule IDs hides where the tells live in the document tree. The interactive 3D DOM spectrometer on the home page and per-domain score hubs explodes the scanned document into five vertical strata: typography, palette and contrast, layout topology, copy rhetoric, and AEO metadata.

\`\`\`bash
npx slop-detect https://your-site.com --axes all --design-md auto --aeo
\`\`\`

## Closing the loop in CI and MCP

Because every check is a deterministic function of computed styles and HTTP headers, coding agents can call \`slop-detect-mcp\` inside the editor before opening a pull request, and teams can gate deploy previews with \`slop-detect-action\` in GitHub Actions.`,
  },
  {
    slug: 'aeo-for-engineering-teams',
    title: 'AEO for engineering teams: making pages readable to AI answer engines',
    date: '2026-09-20',
    image: '/media/docs-aeo-crawler-pipeline.png',
    imageAlt: 'AEO eight-check verification pipeline schematic',
    summary:
      'Why clean visual design is still invisible to ChatGPT, Claude, and Perplexity when crawlers hit blocked robots rules or missing markdown twins.',
    body: `A landing page can score 0 out of 100 on the design-slop fingerprint and still be completely invisible when a buyer asks an AI assistant to compare tools in your category. Answer Engine Optimization (AEO) measures whether automated research agents can fetch, parse, and cite your canonical content over HTTP.

## The eight-check verification circuit

The AEO axis evaluates eight concrete HTTP and HTML signals totaling 100 points (70 required points + 30 recommended bonus points):

- \`html.reachable\` (10 pts, required): verifies that normal browser HTTP fetch returns a 2xx HTML document.
- \`bot.notBlocked\` (25 pts, required): confirms that fetching with the \`GPTBot\` User-Agent returns 2xx rather than a WAF challenge or 403 block.
- \`robots.aiAllowed\` (20 pts, required): verifies that \`robots.txt\` does not disallow major AI crawlers (\`GPTBot\`, \`ClaudeBot\`, \`PerplexityBot\`, \`Google-Extended\`).
- \`html.indexable\` (15 pts, required): confirms the page does not emit \`noindex\` in \`X-Robots-Tag\` headers or \`<meta name="robots">\`.
- \`md.twin\` (10 pts, recommended): checks for a clean \`<url>.md\` markdown twin (or \`/index.md\` for the root path) returning \`text/markdown\`.
- \`html.linkAlternate\` (8 pts, recommended): checks that HTML advertises the markdown twin via \`Link: rel="alternate"; type="text/markdown"\` or \`<link rel="alternate">\`.
- \`site.llmsTxt\` (7 pts, recommended): checks for a structured \`/llms.txt\` discovery file at the root domain.
- \`html.vary\` (5 pts, recommended): checks that the response sends \`Vary: Accept\` for content-negotiation awareness.

## Serving markdown twins

Every documentation and blog route on \`slop-detect.com\` exposes a direct markdown twin alongside its HTML page. Run \`npx slop-detect <url> --aeo\` or \`POST /api/aeo\` to audit any URL against all eight checks.`,
  },
  {
    slug: 'how-the-slop-score-works',
    title: 'How the slop score works',
    date: '2026-06-13',
    image: '/media/hero-optical-instrument.png',
    imageAlt: 'Isometric optical DOM spectrometer diagram',
    summary:
      'A weighted, deterministic fingerprint: same page in, same score out. No model, no randomness.',
    body: `Every scan runs the same set of named checks against a page's live
computed styles, adds up the weight of the ones that fire, and returns a number
from 0 to 100. Lower is cleaner.

## Deterministic by design

There is no model and no randomness. The score is a pure function of the page:
scan the same URL twice and you get the same number. That is the point. A
probabilistic "is this AI?" verdict cannot be audited or trusted at a threshold.
A fixed, named fingerprint can.

## Weights and tiers

Each pattern carries a fixed weight, heavier for the strongest tells (the
AI-default font stack, vibe purple) and lighter for the softer ones. The total
maps to three tiers:

- Clean, 0 to 9
- Mild, 10 to 27
- Heavy, 28 and up

## A fingerprint, not a verdict

A high score means the page matches many default-template patterns, not that it is bad and
not that an AI wrote it. Everyone uses AI now. The score measures how generic the
result reads, nothing about the team behind it. Reproduce any score yourself with
\`npx slop-detect <url>\`.`,
  },
  {
    slug: 'why-detectors-decay',
    title: 'Why slop detectors decay, and what we do about it',
    date: '2026-06-13',
    image: '/media/docs-design-md-drift.png',
    imageAlt: 'DESIGN.md token compliance versus live rendered DOM drift diagram',
    summary:
      'A fixed visual fingerprint degrades as generators suppress the default look. The durable signal is per-site, not global.',
    body: `A signature-style detector that enumerates today's visual tells
degrades over time. The generators that produce the slop are actively engineered
to suppress the default look, and design standards push per-brand constraints
into them. The exact fonts and gradients we flag today will not be the tells a
year from now.

## The absolute score is the hook, not the moat

A loud, free default-template pattern grader gets attention while the
meme is hot. But the rule list is copyable in an afternoon, and the fashion it
tracks will move. So the absolute score is acquisition, not a durable product.

## The durable signal is per-site

The question that does not decay is relative: does this page honor its own
declared design system? Point a scan at a site's DESIGN.md, the open token spec
for colors, typography, radii, and components, and the scan reports drift: fonts
in use that were never declared, CTA colors off the palette, radii off the scale.
A bespoke site checked against its own tokens can never false-positive as slop,
and the reference point is the customer's own system, not a global fashion that
ages.

## What this means for you

Use the free slop score to catch the obvious generated look. Use the system axis
to keep a real design system honest as non-designers and coding agents keep
shipping to it. One is the hook, the other is the thing worth monitoring.`,
  },
];

export function getPost(slug) {
  return POSTS.find((p) => p.slug === slug) || null;
}

// Minimal, safe markdown to HTML for the seed posts. Escapes first, then applies
// a small set of block + inline rules (headings, unordered lists, fenced code,
// paragraphs, links, bold, inline code). Not a full CommonMark parser by design.
export function mdToHtml(md) {
  const lines = String(md).replace(/\r\n/g, '\n').split('\n');
  const inline = (s) =>
    escapeHtml(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${escapeHtml(buf.join('\n'))}</code></pre>`);
      continue;
    }
    const h = line.match(/^(#{2,4})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length;
      out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
      i++;
      continue;
    }
    if (/^-\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^-\s+/.test(lines[i]))
        items.push(`<li>${inline(lines[i++].replace(/^-\s+/, ''))}</li>`);
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,4}\s|-\s|```)/.test(lines[i]))
      buf.push(lines[i++]);
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return out.join('\n');
}
