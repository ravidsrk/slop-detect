/** @jsxRuntime automatic @jsxImportSource hono/jsx */
// GET /blog — the index of posts. Crawlable, server-rendered on the shared brand
// system (anti-slop), with a Blog JSON-LD for AEO. Content lives in _posts.js.

import { raw } from 'hono/html';
import { jsonForScript } from './_render.js';
import { POSTS } from './_posts.js';
import { BRAND_FONTS_HEAD, BRAND_CSS } from './_brand.js';

const ORIGIN = 'https://slop-detect.com';

const PAGE_CSS = `
  body{padding:48px 20px 80px}
  .wrap{max-width:680px;margin:0 auto}
  .brand{font-size:14px;font-weight:600;margin-bottom:22px}
  .brand .slash{color:var(--dim);font-weight:400}
  h1{font-size:30px;font-weight:700;letter-spacing:-0.02em;margin:6px 0 6px}
  .lead{color:var(--muted);margin-bottom:26px;max-width:60ch}
  .posts{list-style:none}
  .post{padding:20px 0;border-bottom:1px solid var(--bg-2)}
  .post-title{font-size:19px;font-weight:700;letter-spacing:-0.01em;text-decoration:none}
  .post-title:hover{text-decoration:underline}
  .post-meta{font-family:var(--mono);font-size:11.5px;color:var(--dim);margin-top:4px}
  .post-sum{color:var(--text-2);font-size:14.5px;margin-top:8px;max-width:62ch}
  footer{margin-top:36px;font-family:var(--mono);font-size:11.5px;color:var(--dim)}
  footer a{color:var(--muted)}
`;

export async function onRequestGet({ request }) {
  const origin = new URL(request.url).origin;
  const posts = POSTS.slice().sort((a, b) => (a.date < b.date ? 1 : -1));

  const jsonLd = jsonForScript({
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${ORIGIN}/blog`,
    name: 'Slop Detector blog',
    url: `${ORIGIN}/blog`,
    blogPost: posts.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      datePublished: p.date,
      url: `${ORIGIN}/blog/${p.slug}`,
    })),
  });

  const doc = (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Blog · slop-detect</title>
        <meta
          name="description"
          content="Notes on the AI-design-slop fingerprint: how the score works, why detectors decay, and the durable per-site signal."
        />
        <link rel="canonical" href={`${ORIGIN}/blog`} />
        <meta property="og:title" content="Slop Detector blog" />
        <meta
          property="og:description"
          content="How the slop score works, and why the durable signal is per-site."
        />
        <meta property="og:url" content={`${ORIGIN}/blog`} />
        <meta property="og:image" content={`${ORIGIN}/og.png`} />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <script type="application/ld+json">{raw(jsonLd)}</script>
        {raw(BRAND_FONTS_HEAD)}
        <style>{raw(BRAND_CSS + PAGE_CSS)}</style>
      </head>
      <body>
        <div class="wrap">
          <div class="brand">
            <a href="/" style="color:inherit">
              {raw('slop&#8209;detect')}
            </a>{' '}
            <span class="slash">/ blog</span>
          </div>
          <div class="eyebrow">
            <span class="reg">{raw('&sect;log')}</span>
            <span class="reg-label">notes</span>
          </div>
          <h1>Blog</h1>
          <p class="lead">
            Notes on the AI-design-slop fingerprint: how the score works, why detectors decay, and
            the durable per-site signal.
          </p>
          <ul class="posts">
            {posts.map((p) => (
              <li class="post">
                <a class="post-title" href={`${origin}/blog/${p.slug}`}>
                  {p.title}
                </a>
                <div class="post-meta">{p.date}</div>
                <p class="post-sum">{p.summary}</p>
              </li>
            ))}
          </ul>
          <footer>
            <a href={`${origin}/`}>slop-detect.com</a> {raw('&middot;')}{' '}
            <a href={`${origin}/leaderboard`}>the report</a> {raw('&middot;')}{' '}
            <a href="https://github.com/ravidsrk/slop-detect">source</a>
          </footer>
        </div>
      </body>
    </html>
  );

  const html = '<!doctype html>' + doc.toString();

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=600' },
  });
}
