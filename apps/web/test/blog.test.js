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
