// /blog index + /blog/<slug> (HTML and the .md twin) render from _posts.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet as indexGet } from '../functions/blog.js';
import { onRequestGet as postGet } from '../functions/blog/[slug].js';
import { POSTS, mdToHtml } from '../functions/_posts.js';

const req = (path) => ({ url: `https://slop-detect.com${path}` });

test('/blog lists every post with a link', async () => {
  const res = await indexGet({ request: req('/blog') });
  assert.equal(res.status, 200);
  const html = await res.text();
  for (const p of POSTS) {
    assert.match(html, new RegExp(p.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(html, new RegExp(`/blog/${p.slug}`));
  }
  assert.match(html, /application\/ld\+json/);
});

test('/blog/<slug> renders the post HTML with structured data + a twin link', async () => {
  const slug = 'how-the-slop-score-works';
  const res = await postGet({ params: { slug }, request: req(`/blog/${slug}`) });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /How the slop score works/);
  assert.match(html, /<h2>Deterministic by design<\/h2>/);
  assert.match(html, /BlogPosting/);
  assert.match(html, new RegExp(`rel="canonical" href="https://slop-detect.com/blog/${slug}"`));
  assert.match(
    html,
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
  assert.equal(res.status, 200);
  assert.match(res.headers.get('Content-Type'), /text\/markdown/);
  const md = await res.text();
  assert.match(md, /^# How the slop score works/);
});

test('unknown slug returns 404', async () => {
  const res = await postGet({ params: { slug: 'nope' }, request: req('/blog/nope') });
  assert.equal(res.status, 404);
});

test('mdToHtml renders blocks and escapes HTML in inline code', () => {
  const html = mdToHtml(
    '## Head\n\n- one\n- two\n\nUse `npx slop-detect <url>` and **bold** text and a [link](https://x.com).'
  );
  assert.match(html, /<h2>Head<\/h2>/);
  assert.match(html, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
  assert.match(html, /<code>npx slop-detect &lt;url&gt;<\/code>/); // angle brackets escaped
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<a href="https:\/\/x\.com">link<\/a>/);
});
