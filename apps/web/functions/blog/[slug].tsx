/** @jsxRuntime automatic @jsxImportSource hono/jsx */
// GET /blog/<slug>      → the post, server-rendered (anti-slop, BlogPosting JSON-LD).
// GET /blog/<slug>.md    → the raw markdown twin, the AEO convention we preach.
//
// Single source: both come from _posts.ts, so the HTML and the twin never drift.
//
// Design (GAP-FILL): a reading column — Newsreader title + headings, Libre Franklin
// prose, and the design dark "Code block" for any fenced code. Because _posts.ts /
// mdToHtml stay frozen, the prose <pre>/<code> they emit are styled here to match
// the shared .cb code block rather than swapping in the component.

import { raw as rawHtml } from 'hono/html';
import { jsonForScript } from '../_render.js';
import { getPost, mdToHtml } from '../_posts.js';
import { BRAND_FONTS_HEAD, BRAND_CSS } from '../_brand.js';
import { Nav, Footer, SectionLedger, UI_CSS } from '../_ui.js';

const ORIGIN = 'https://slop-detect.com';

// Reading time from the markdown body, ~200 wpm, floor of one minute.
function readingMinutes(body: string) {
  const words = String(body || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

const PAGE_CSS = `
  .bp-main{max-width:680px;margin:0 auto;padding:48px var(--pad-x) 24px}
  .bp-back{display:inline-block;font-family:var(--mono);font-size:12.5px;color:var(--text-4);margin-bottom:22px}
  .bp-back:hover{color:var(--text)}
  .bp-title{font-family:var(--serif);font-weight:500;font-size:clamp(30px,4.4vw,44px);line-height:1.1;letter-spacing:-0.02em;color:var(--text);margin:0 0 8px}
  .bp-meta{font-family:var(--mono);font-size:12.5px;color:var(--text-4);margin-bottom:30px}

  /* prose — Libre Franklin body, Newsreader headings, the design code block */
  .prose{font-family:var(--sans);font-size:var(--fs-body);line-height:1.7;color:var(--text-2)}
  .prose h2{font-family:var(--serif);font-weight:600;font-size:var(--fs-h3);line-height:1.1;letter-spacing:-0.01em;color:var(--text);margin:34px 0 10px}
  .prose h3{font-family:var(--serif);font-weight:600;font-size:var(--fs-serif-row);line-height:1.15;color:var(--text);margin:26px 0 6px}
  .prose h4{font-family:var(--serif);font-weight:600;font-size:18px;color:var(--text);margin:22px 0 6px}
  .prose p{margin:0 0 16px}
  .prose ul{margin:0 0 16px;padding-left:22px}
  .prose li{margin:6px 0}
  .prose a{color:var(--clean-text);text-decoration:underline;text-underline-offset:2px}
  .prose a:hover{color:var(--text)}
  /* inline mono: same family, slightly smaller, no background (design "Code block") */
  .prose code{font-family:var(--mono);font-size:0.92em;color:var(--text)}
  /* fenced code: the design dark code block */
  .prose pre{background:#16170F;border-radius:var(--r-5);padding:18px 20px;overflow:auto;margin:0 0 18px}
  .prose pre code{font-family:var(--mono);font-size:var(--fs-code);line-height:1.85;color:#C9CABF;background:none;white-space:pre}

  .bp-twin{margin-top:34px;padding-top:18px;border-top:1px solid var(--border);font-family:var(--mono);font-size:12.5px;color:var(--text-4)}
  .bp-twin a{color:var(--clean-text);text-decoration:underline;text-underline-offset:2px}
  .bp-twin a:hover{color:var(--text)}

  @media(max-width:640px){.bp-main{padding-left:20px;padding-right:20px}}
`;

export async function onRequestGet({ params, request }) {
  const origin = new URL(request.url).origin;
  const rawSlug = String(params.slug || '');
  const wantsMd = rawSlug.endsWith('.md');
  const slug = wantsMd ? rawSlug.slice(0, -3) : rawSlug;
  const post = getPost(slug);

  if (!post) {
    return new Response('Post not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // Markdown twin: the post body, with a leading H1 + summary, served raw.
  if (wantsMd) {
    const md = `# ${post.title}\n\n> ${post.summary}\n\n${post.body}\n`;
    return new Response(md, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=600',
      },
    });
  }

  const url = `${ORIGIN}/blog/${post.slug}`;
  const jsonLd = jsonForScript({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': url,
    headline: post.title,
    description: post.summary,
    datePublished: post.date,
    dateModified: post.date,
    url,
    isPartOf: { '@type': 'Blog', name: 'Slop Detector blog', url: `${ORIGIN}/blog` },
    author: { '@type': 'Person', name: 'Ravindra Kumar' },
  });

  const doc = (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`${post.title} · slop-detect`}</title>
        <meta name="description" content={post.summary} />
        <link rel="canonical" href={url} />
        <link rel="alternate" type="text/markdown" href={`${url}.md`} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.summary} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={`${ORIGIN}/og.png`} />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <script type="application/ld+json">{rawHtml(jsonLd)}</script>
        {rawHtml(BRAND_FONTS_HEAD)}
        <style>{rawHtml(BRAND_CSS + UI_CSS + PAGE_CSS)}</style>
      </head>
      <body>
        <Nav origin={origin} current="" />
        <main class="bp-main">
          <SectionLedger tag="§" label="notes" />
          <a class="bp-back" href={`${origin}/blog`}>
            {rawHtml('&larr; all posts')}
          </a>
          <article>
            <h1 class="bp-title">{post.title}</h1>
            <div class="bp-meta">
              {post.date} · {readingMinutes(post.body)} min read
            </div>
            <div class="prose">{rawHtml(mdToHtml(post.body))}</div>
          </article>
          <div class="bp-twin">
            Machine-readable twin: <a href={`${url}.md`}>{`${post.slug}.md`}</a>
          </div>
        </main>
        <Footer origin={origin} domain={post.slug} />
      </body>
    </html>
  );

  const html = '<!doctype html>' + doc.toString();

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=600' },
  });
}
