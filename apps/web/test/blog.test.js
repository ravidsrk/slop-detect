// /blog index + /blog/<slug> (HTML and the .md twin) render from _posts.js.

import { test, expect } from 'vitest';
import { onRequestGet as indexGet } from '../functions/blog.tsx';
import { onRequestGet as postGet } from '../functions/blog/[slug].tsx';
import { POSTS, mdToHtml } from '../functions/_posts.ts';

const req = (path) => ({ url: `https://slop-detect.com${path}` });

test('/blog lists every post with a link', async () => {
  const res = await indexGet({ request: req('/blog') });
  expect(res.status).toBe(200);
  const html = await res.text();
  for (const p of POSTS) {
    expect(html).toMatch(new RegExp(p.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    expect(html).toMatch(new RegExp(`/blog/${p.slug}`));
  }
  expect(html).toMatch(/application\/ld\+json/);
});

test('/blog/<slug> renders the post HTML with structured data + a twin link', async () => {
  const slug = 'how-the-slop-score-works';
  const res = await postGet({ params: { slug }, request: req(`/blog/${slug}`) });
  expect(res.status).toBe(200);
  const html = await res.text();
  expect(html).toMatch(/How the slop score works/);
  expect(html).toMatch(/<h2>Deterministic by design<\/h2>/);
  expect(html).toMatch(/BlogPosting/);
  expect(html).toMatch(new RegExp(`rel="canonical" href="https://slop-detect.com/blog/${slug}"`));
  expect(html).toMatch(
    new RegExp(
      `rel="alternate" type="text/markdown" href="https://slop-detect.com/blog/${slug}.md"`
    )
  );
});

test('/blog/<slug>.md serves the raw markdown twin', async () => {
  const res = await postGet({
    params: { slug: 'how-the-slop-score-works.md' },
    request: req('/blog/how-the-slop-score-works.md'),
  });
  expect(res.status).toBe(200);
  expect(res.headers.get('Content-Type')).toMatch(/text\/markdown/);
  const md = await res.text();
  expect(md).toMatch(/^# How the slop score works/);
});

test('unknown slug returns 404', async () => {
  const res = await postGet({ params: { slug: 'nope' }, request: req('/blog/nope') });
  expect(res.status).toBe(404);
});

test('mdToHtml renders blocks and escapes HTML in inline code', () => {
  const html = mdToHtml(
    '## Head\n\n- one\n- two\n\nUse `npx slop-detect <url>` and **bold** text and a [link](https://x.com).'
  );
  expect(html).toMatch(/<h2>Head<\/h2>/);
  expect(html).toMatch(/<ul><li>one<\/li><li>two<\/li><\/ul>/);
  expect(html).toMatch(/<code>npx slop-detect &lt;url&gt;<\/code>/); // angle brackets escaped
  expect(html).toMatch(/<strong>bold<\/strong>/);
  expect(html).toMatch(/<a href="https:\/\/x\.com">link<\/a>/);
});

// ── re-skin: design fidelity (Research / article-card vocabulary) ────────────
test('/blog uses the article-card vocabulary on the shared shell, newest-first', async () => {
  const res = await indexGet({ request: req('/blog') });
  const html = await res.text();
  // shared shell from _ui (Nav + Footer), not a one-off header
  expect(html, 'shared nav').toMatch(/class="nav"/);
  expect(html, 'shared footer').toMatch(/class="ft"/);
  // a feature card beside a stack of article links
  expect(html).toMatch(/bl-research/);
  expect(html).toMatch(/bl-feature/);
  expect(html).toMatch(/bl-link/);
  // Newsreader (serif) titles + a mono date·read-time reference tag
  expect(html).toMatch(/bl-feature-title\{font-family:var\(--serif\)/);
  expect(html).toMatch(/\d+ min read/);
  // newest-first: posts render in non-increasing date order (first occurrence)
  const firstSeen = [];
  for (const m of html.matchAll(/\/blog\/([a-z0-9-]+)(?=["<.])/g))
    if (!firstSeen.includes(m[1])) firstSeen.push(m[1]);
  expect(firstSeen.length).toBe(POSTS.length);
  const dates = firstSeen.map((slug) => POSTS.find((p) => p.slug === slug).date);
  for (let i = 1; i < dates.length; i++) expect(dates[i] <= dates[i - 1]).toBe(true);
});

test('/blog/<slug> renders Libre Franklin prose, Newsreader headings, and the design code block', async () => {
  const res = await postGet({
    params: { slug: 'how-the-slop-score-works' },
    request: req('/blog/how-the-slop-score-works'),
  });
  const html = await res.text();
  expect(html, 'shared shell').toMatch(/class="nav"/);
  expect(html, 'prose column').toMatch(/class="prose"/);
  expect(html, 'Libre Franklin body (--sans)').toMatch(/\.prose\{font-family:var\(--sans\)/);
  expect(html, 'Newsreader headings (--serif)').toMatch(/\.prose h2\{font-family:var\(--serif\)/);
  expect(html, 'dark design code block for fenced code').toMatch(/\.prose pre\{background:#16170F/);
});

// ── dogfood: both surfaces must score Clean ──────────────────────────────────
test('the blog dogfoods its own detector (no slop fonts, no gradient text, no purple CTA)', async () => {
  const index = await (await indexGet({ request: req('/blog') })).text();
  const post = await (
    await postGet({
      params: { slug: 'why-detectors-decay' },
      request: req('/blog/why-detectors-decay'),
    })
  ).text();
  for (const [label, html] of [
    ['index', index],
    ['post', post],
  ]) {
    expect(html, `${label}: no AI-default faces`).not.toMatch(/Inter,|Geist|Space Grotesk/i);
    expect(html, `${label}: no gradient text`).not.toMatch(/background-clip:\s*text/i);
    // the lone purple lives only in the data-avatar palette (_theme); never on the blog
    expect(html, `${label}: no purple accent`).not.toMatch(/#7A4D9A/i);
  }
});
