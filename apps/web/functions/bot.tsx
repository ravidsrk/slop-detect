/** @jsxRuntime automatic @jsxImportSource hono/jsx */
// GET /bot — scanner identity (A-08). One user agent, no vendor impersonation.

import { AEO_SCANNER_USER_AGENT, SCANNER_USER_AGENT } from '@slop-detect/core';

const ORIGIN = 'https://slop-detect.com';

export async function onRequestGet() {
  const ua = AEO_SCANNER_USER_AGENT || SCANNER_USER_AGENT;
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Scanner identity · slop-detect</title>
  <link rel="canonical" href="${ORIGIN}/bot" />
  <meta name="description" content="The user agent slop-detect sends when it fetches a page. It does not impersonate another crawler." />
  <style>
    body{margin:0;background:#141412;color:#f4f5f2;font:16px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}
    main{max-width:720px;margin:0 auto;padding:48px 20px}
    a{color:#1fa85e}
    code{display:block;padding:12px 14px;border:1px solid #2a2a26;background:#10100e;white-space:pre-wrap}
  </style>
</head>
<body>
  <main>
    <p><a href="${ORIGIN}/">slop-detect</a></p>
    <h1>Scanner identity</h1>
    <p>Fetches from this service send one user agent. The scanner does not pretend to be Googlebot, GPTBot, or any other vendor crawler.</p>
    <code>${ua}</code>
    <p>Operators can allow or block that token in robots.txt. The <a href="${ORIGIN}/docs">methodology</a> describes what a scan measures.</p>
  </main>
</body>
</html>`;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
