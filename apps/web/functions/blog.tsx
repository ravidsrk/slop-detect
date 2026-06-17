/** @jsxRuntime automatic @jsxImportSource hono/jsx */
// GET /blog — the index of posts. Crawlable, server-rendered on the shared light
// editorial system (anti-slop), with a Blog JSON-LD for AEO. Content lives in
// _posts.ts (unchanged); this file only re-skins the presentation.
//
// Design (GAP-FILL): the export ships no blog screen, so the index borrows the
// "Research / article cards" vocabulary — a large feature card for the newest
// post (Newsreader title + a mono date·read-time footer) beside a stack of plain
// article links (Newsreader 19px + a mono reference tag). Shell, ledger rule, and
// footer come from the shared _ui library so it reads as the same product.

import { raw } from 'hono/html';
import { jsonForScript } from './_render.js';
import { POSTS } from './_posts.js';
import { BRAND_FONTS_HEAD, BRAND_CSS } from './_brand.js';
import { Nav, Footer, SectionLedger, UI_CSS } from './_ui.js';

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
  .bl-main{max-width:1080px;margin:0 auto;padding:56px var(--pad-x) 16px}
  .bl-hd{max-width:60ch;margin:22px 0 40px}
  .bl-h1{font-family:var(--serif);font-weight:500;font-size:clamp(34px,4.6vw,52px);line-height:1.02;letter-spacing:-0.02em;color:var(--text);margin:0 0 12px}
  .bl-lead{font-size:var(--fs-lead);line-height:1.55;color:var(--text-2);max-width:58ch}

  /* Research / article cards: a 1.3fr 1fr grid (feature card + a link stack). */
  .bl-research{display:grid;grid-template-columns:1.3fr 1fr;gap:28px;align-items:start}

  .bl-feature{display:block;border:1px solid var(--border);border-radius:var(--r-6);background:var(--panel);padding:30px 30px 26px;transition:border-color var(--t)}
  .bl-feature:hover{border-color:var(--text)}
  .bl-feature-title{font-family:var(--serif);font-weight:500;font-size:var(--fs-h3);line-height:1.08;letter-spacing:-0.01em;color:var(--text)}
  .bl-feature-sum{font-size:var(--fs-body-sm);line-height:1.55;color:var(--text-3);margin-top:12px;max-width:46ch}
  .bl-feature-foot{font-family:var(--mono);font-size:12px;color:var(--text-4);margin-top:18px}

  .bl-links{display:flex;flex-direction:column}
  .bl-link{display:block;padding:18px 0;border-bottom:1px solid var(--border);transition:opacity var(--t)}
  .bl-link:first-child{padding-top:0}
  .bl-link:hover{opacity:0.7}
  .bl-link-title{font-family:var(--serif);font-weight:500;font-size:19px;line-height:1.15;letter-spacing:-0.01em;color:var(--text)}
  .bl-link-sum{font-size:var(--fs-body-sm);line-height:1.5;color:var(--text-4);margin-top:6px;max-width:44ch}
  .bl-link-tag{display:block;font-family:var(--mono);font-size:11.5px;color:var(--text-5);margin-top:8px}

  .bl-empty{border:1px solid var(--border);border-radius:var(--r-6);background:var(--panel);padding:30px;color:var(--text-3);font-size:var(--fs-body)}
  .bl-empty a{color:var(--clean-text);text-decoration:underline;text-underline-offset:2px}

  @media(max-width:900px){.bl-research{grid-template-columns:1fr}}
  @media(max-width:640px){.bl-main{padding-left:20px;padding-right:20px}}
`;

// One plain article link in the right-hand stack: serif title, an optional
// summary, and a mono date·read-time reference tag.
function ArticleLink({ post, origin }) {
  return (
    <a class="bl-link" href={`${origin}/blog/${post.slug}`}>
      <span class="bl-link-title">{post.title}</span>
      <span class="bl-link-sum">{post.summary}</span>
      <span class="bl-link-tag">
        {post.date} · {readingMinutes(post.body)} min read
      </span>
    </a>
  );
}

export async function onRequestGet({ request }) {
  const origin = new URL(request.url).origin;
  const posts = POSTS.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const [feature, ...rest] = posts;

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
        <style>{raw(BRAND_CSS + UI_CSS + PAGE_CSS)}</style>
      </head>
      <body>
        <Nav origin={origin} current="" />
        <main class="bl-main">
          <SectionLedger tag="§" label="notes" />
          <header class="bl-hd">
            <h1 class="bl-h1">Blog</h1>
            <p class="bl-lead">
              Notes on the AI-design-slop fingerprint: how the score works, why detectors decay, and
              the durable per-site signal.
            </p>
          </header>

          {feature ? (
            <div class="bl-research">
              <a class="bl-feature" href={`${origin}/blog/${feature.slug}`}>
                <h2 class="bl-feature-title">{feature.title}</h2>
                <p class="bl-feature-sum">{feature.summary}</p>
                <div class="bl-feature-foot">
                  {feature.date} · {readingMinutes(feature.body)} min read
                </div>
              </a>
              <div class="bl-links">
                {rest.map((p) => (
                  <ArticleLink post={p} origin={origin} />
                ))}
              </div>
            </div>
          ) : (
            <div class="bl-empty">
              No notes yet. In the meantime, <a href={`${origin}/`}>scan a page</a>.
            </div>
          )}
        </main>
        <Footer origin={origin} />
      </body>
    </html>
  );

  const html = '<!doctype html>' + doc.toString();

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=600' },
  });
}
