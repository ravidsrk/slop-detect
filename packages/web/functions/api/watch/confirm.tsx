/** @jsxRuntime automatic @jsxImportSource hono/jsx */
// GET /api/watch/confirm?token=...  — double-opt-in confirmation.
//
// Clicking the link in the verification email burns the token and flips the
// watch to verified:true, which is the only state in which regression alert
// emails are sent. Returns a small HTML page (people click these in a browser).

import { raw } from 'hono/html';
import { consumeWatchToken, getWatch, putWatch } from '../../_shared.js';

const STYLE = `
  :root{color-scheme:dark}
  body{background:#0a0a0b;color:#e7e7ea;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
       display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px}
  .card{max-width:30rem}
  h1{font-size:24px;margin:0 0 10px;letter-spacing:-0.01em}
  p{color:#a1a1aa;line-height:1.5;margin:0 0 8px}
  a{color:#e7e7ea}
  .k{font-family:ui-monospace,Menlo,monospace;font-size:12px;color:#6b6b73;margin-top:18px}
`;

function page(title, body, status = 200) {
  const doc = (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`${title} · slop-detect`}</title>
        <style>{raw(STYLE)}</style>
      </head>
      <body>
        <div class="card">
          {body}
          <p class="k">slop-detect.com</p>
        </div>
      </body>
    </html>
  );
  return new Response('<!doctype html>' + doc.toString(), {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function onRequestGet({ request, env }) {
  if (!env.RESULTS)
    return page(
      'Unavailable',
      <>
        <h1>Temporarily unavailable</h1>
        <p>Monitoring storage is offline. Try again shortly.</p>
      </>,
      503
    );

  const token = new URL(request.url).searchParams.get('token');
  if (!token)
    return page(
      'Invalid link',
      <>
        <h1>Invalid confirmation link</h1>
        <p>This link is missing its token.</p>
      </>,
      400
    );

  const domain = await consumeWatchToken(env.RESULTS, token);
  if (!domain) {
    return page(
      'Link expired',
      <>
        <h1>This link has expired or was already used</h1>
        <p>
          Confirmation links are single-use and valid for 7 days. Re-subscribe to get a fresh one.
        </p>
      </>,
      410
    );
  }

  const watch = await getWatch(env.RESULTS, domain);
  if (!watch) {
    return page(
      'Not monitored',
      <>
        <h1>{domain} isn't being monitored</h1>
        <p>The monitor may have been removed. Re-subscribe to start again.</p>
      </>,
      404
    );
  }

  watch.verified = true;
  watch.verifiedAt = new Date().toISOString();
  await putWatch(env.RESULTS, watch);

  return page(
    'Confirmed',
    <>
      <h1>You're all set ✓</h1>
      <p>
        <strong>{domain}</strong> is now monitored. We'll email you only when its AI-design-slop
        score regresses.
      </p>
      <p>
        Stop anytime: POST <code>{'{ unsubscribe: true }'}</code> with your email to /api/watch.
      </p>
    </>
  );
}
