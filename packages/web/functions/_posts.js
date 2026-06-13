// Seed content for /blog. Posts are authored once here as markdown (single
// source of truth); the dynamic route renders them to HTML and also serves the
// raw markdown twin at /blog/<slug>.md, the AEO convention the tool preaches.
//
// Bodies are deliberately written clean (commas/colons, no buzzwords) so the
// blog passes the copy axis it represents.

import { escapeHtml } from './_shared.js';

export const POSTS = [
  {
    slug: 'how-the-slop-score-works',
    title: 'How the slop score works',
    date: '2026-06-13',
    summary: 'A weighted, deterministic fingerprint: same page in, same score out. No model, no randomness.',
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

A high score means the page reads as machine-generated, not that it is bad and
not that an AI wrote it. Everyone uses AI now. The score measures how generic the
result reads, nothing about the team behind it. Reproduce any score yourself with
\`npx slop-detect <url>\`.`
  },
  {
    slug: 'why-detectors-decay',
    title: 'Why slop detectors decay, and what we do about it',
    date: '2026-06-13',
    summary: 'A fixed visual fingerprint degrades as generators suppress the default look. The durable signal is per-site, not global.',
    body: `A signature-style detector that enumerates today's visual tells
degrades over time. The generators that produce the slop are actively engineered
to suppress the default look, and design standards push per-brand constraints
into them. The exact fonts and gradients we flag today will not be the tells a
year from now.

## The absolute score is the hook, not the moat

A loud, free "how AI-generated does this look?" grader gets attention while the
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
shipping to it. One is the hook, the other is the thing worth monitoring.`
  }
];

export function getPost(slug) {
  return POSTS.find((p) => p.slug === slug) || null;
}

// Minimal, safe markdown to HTML for the seed posts. Escapes first, then applies
// a small set of block + inline rules (headings, unordered lists, fenced code,
// paragraphs, links, bold, inline code). Not a full CommonMark parser by design.
export function mdToHtml(md) {
  const lines = String(md).replace(/\r\n/g, '\n').split('\n');
  const inline = (s) => escapeHtml(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${escapeHtml(buf.join('\n'))}</code></pre>`);
      continue;
    }
    const h = line.match(/^(#{2,4})\s+(.*)$/);
    if (h) { const lvl = h[1].length; out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`); i++; continue; }
    if (/^-\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^-\s+/.test(lines[i])) items.push(`<li>${inline(lines[i++].replace(/^-\s+/, ''))}</li>`);
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }
    if (!line.trim()) { i++; continue; }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,4}\s|-\s|```)/.test(lines[i])) buf.push(lines[i++]);
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return out.join('\n');
}
