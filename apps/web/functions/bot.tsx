/** @jsxRuntime automatic @jsxImportSource hono/jsx */
// GET /bot — scanner identity (A-08). One user agent, no vendor impersonation.

import { raw } from 'hono/html';
import { AEO_SCANNER_USER_AGENT, SCANNER_USER_AGENT } from '@slop-detect/core';
import { BRAND_FONTS_HEAD, BRAND_CSS } from './_brand.js';
import { Nav, Footer, SectionLedger, UI_CSS } from './_ui.js';

const ORIGIN = 'https://slop-detect.com';

const PAGE_CSS = `
  .bot-wrap{max-width:760px;margin:0 auto;padding:56px var(--pad-x) 72px}
  .bot-h1{font-family:var(--serif);font-weight:500;font-size:var(--fs-display-2);line-height:1.12;letter-spacing:-0.02em;color:var(--text);margin:14px 0 16px}
  .bot-lead{font-size:var(--fs-lead);line-height:1.6;color:var(--text-2);max-width:60ch;margin-bottom:24px}
  .bot-ua{display:block;padding:16px 18px;background:var(--panel);border:1px solid var(--border);border-radius:4px;font-family:var(--mono);font-size:13.5px;color:var(--text);white-space:pre-wrap;word-break:break-all;margin-bottom:24px}
  .bot-p{font-size:15px;line-height:1.65;color:var(--text-2);margin-bottom:14px}
  .bot-p a{color:var(--clean-text);text-decoration:underline;text-underline-offset:3px}
`;

export async function onRequestGet({ request }: { request?: { url: string } } = {}) {
  const origin = request?.url ? new URL(request.url).origin : ORIGIN;
  const ua = AEO_SCANNER_USER_AGENT || SCANNER_USER_AGENT;
  const doc = (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Scanner identity · slop-detect</title>
        <link rel="canonical" href={`${ORIGIN}/bot`} />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <meta
          name="description"
          content="The user agent slop-detect sends when it fetches a page. It does not impersonate another crawler."
        />
        {raw(BRAND_FONTS_HEAD)}
        <style>{raw(BRAND_CSS + UI_CSS + PAGE_CSS)}</style>
      </head>
      <body>
        <Nav origin={origin} current="/bot" />
        <main class="bot-wrap">
          <SectionLedger tag="" label="scanner identity · honest user-agent" />
          <h1 class="bot-h1">Scanner identity</h1>
          <p class="bot-lead">
            Fetches from this service send one transparent user agent. The scanner does not pretend
            to be Googlebot, GPTBot, or any other vendor crawler.
          </p>
          <code class="bot-ua">{ua}</code>
          <p class="bot-p">
            Site operators can explicitly allow or block this user-agent token in{' '}
            <code>robots.txt</code>. Local CLI and <code>slop-detect-mcp --local</code> runs happen
            directly from the developer&rsquo;s machine.
          </p>
          <p class="bot-p">
            Read the <a href={`${origin}/docs`}>methodology</a> for the full list of HTTP and
            headless-Chromium checks, or return to the <a href={`${origin}/`}>scanner</a>.
          </p>
        </main>
        <Footer origin={origin} />
      </body>
    </html>
  );

  return new Response('<!doctype html>' + doc.toString(), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
