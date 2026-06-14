// GET /blog/<slug>      → the post, server-rendered (anti-slop, BlogPosting JSON-LD).
// GET /blog/<slug>.md    → the raw markdown twin, the AEO convention we preach.
//
// Single source: both come from _posts.js, so the HTML and the twin never drift.

import { escapeHtml } from '../_shared.js';
import { getPost, mdToHtml } from '../_posts.js';
import { BRAND_FONTS_HEAD, BRAND_CSS } from '../_brand.js';

const ORIGIN = 'https://slop-detect.com';

export async function onRequestGet({ params, request }) {
  const origin = new URL(request.url).origin;
  const raw = String(params.slug || '');
  const wantsMd = raw.endsWith('.md');
  const slug = wantsMd ? raw.slice(0, -3) : raw;
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
  const jsonLd = JSON.stringify({
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

  const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(post.title)} · slop-detect</title>
<meta name="description" content="${escapeHtml(post.summary)}">
<link rel="canonical" href="${url}">
<link rel="alternate" type="text/markdown" href="${url}.md">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(post.title)}">
<meta property="og:description" content="${escapeHtml(post.summary)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ORIGIN}/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<script type="application/ld+json">${jsonLd}</script>
${BRAND_FONTS_HEAD}
<style>${BRAND_CSS}
  body{padding:48px 20px 90px}
  .wrap{max-width:660px;margin:0 auto}
  .brand{font-size:14px;font-weight:600;margin-bottom:22px}
  .brand .slash{color:var(--dim);font-weight:400}
  h1{font-size:30px;font-weight:700;letter-spacing:-0.02em;line-height:1.15;margin:6px 0 6px}
  .meta{font-family:var(--mono);font-size:12px;color:var(--dim);margin-bottom:26px}
  .body{font-size:16px;color:var(--text-2);line-height:1.7}
  .body h2{font-size:20px;font-weight:700;color:var(--text);letter-spacing:-0.01em;margin:30px 0 8px}
  .body h3{font-size:16px;font-weight:700;color:var(--text);margin:22px 0 6px}
  .body p{margin:0 0 16px}
  .body ul{margin:0 0 16px;padding-left:20px}
  .body li{margin:4px 0}
  .body a{color:var(--accent)}
  .body code{font-family:var(--mono);font-size:13.5px;color:var(--text);background:var(--bg-2);border:1px solid var(--border);border-radius:5px;padding:1px 5px}
  .body pre{background:var(--bg-2);border:1px solid var(--border);border-radius:8px;padding:14px;overflow:auto;margin:0 0 16px}
  .body pre code{border:0;padding:0;background:none}
  .twin{margin-top:30px;font-family:var(--mono);font-size:12px;color:var(--dim)}
  .twin a{color:var(--muted)}
  footer{margin-top:36px;font-family:var(--mono);font-size:11.5px;color:var(--dim)}
  footer a{color:var(--muted)}
</style></head><body><div class="wrap">
  <div class="brand"><a href="/" style="color:inherit">slop&#8209;detect</a> <span class="slash">/ <a href="${origin}/blog" style="color:inherit">blog</a></span></div>
  <h1>${escapeHtml(post.title)}</h1>
  <div class="meta">${escapeHtml(post.date)}</div>
  <div class="body">${mdToHtml(post.body)}</div>
  <div class="twin">Machine-readable twin: <a href="${url}.md">${escapeHtml(post.slug)}.md</a></div>
  <footer><a href="${origin}/blog">&larr; all posts</a> &middot;
    <a href="${origin}/">scan a page</a></footer>
</div></body></html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=600' },
  });
}
