/** @jsxRuntime automatic @jsxImportSource hono/jsx */
// /api/watch/unsubscribe?token=... — one-click unsubscribe (RFC 8058, G-16).
//
// The token is a stateless HMAC binding ONE (domain, email) pair (see
// _session.ts signUnsubscribe); it travels in the List-Unsubscribe header and
// footer of every alert email. GET renders a confirm page for humans; POST
// performs the unsubscribe — this split is deliberate, because mail clients
// and link prefetchers GET URLs without asking. One-click clients POST
// `List-Unsubscribe=One-Click` to this same URL and get a 2xx either way.
//
// Status contract: 200 done/already-off, 503 no storage/secret, 400 missing
// token, 403 bad signature or token no longer matches the subscriber.

import { raw } from 'hono/html';
import { getWatch, performUnsubscribe, deferFlowBump } from '../../_shared.js';
import { verifyUnsubscribe } from '../../_session.js';
import { BRAND_FONTS_HEAD, BRAND_CSS } from '../../_brand.js';
import { Nav, Footer, SectionLedger, UI_CSS } from '../../_ui.js';

const PAGE_CSS = `
  body{display:flex;flex-direction:column;min-height:100vh}
  .confirm{flex:1;display:flex;align-items:center;justify-content:center;padding:56px var(--pad-x)}
  .confirm-card{max-width:34rem;width:100%}
  .confirm-h{font-family:var(--serif);font-weight:500;font-size:var(--fs-h2-static);line-height:1.06;letter-spacing:-0.02em;color:var(--text);margin:12px 0 0}
  .confirm-state{font-family:var(--mono);font-size:var(--fs-mono);margin:12px 0 0}
  .confirm-state.ok{color:var(--clean-text)}
  .confirm-state.warn{color:var(--mild-text)}
  .confirm-state.err{color:var(--heavy-text)}
  .confirm-body{font-size:var(--fs-body);line-height:1.6;color:var(--text-2);margin:14px 0 0;max-width:54ch}
  .confirm-body strong{color:var(--text)}
  .confirm-actions{margin-top:24px}
  .confirm-meta{font-family:var(--mono);font-size:var(--fs-mono-label);color:var(--text-6);margin-top:28px}
  @media(max-width:640px){.confirm{padding:40px 20px}}
`;

function page({
  title,
  status = 200,
  heading,
  tone,
  state,
  body,
  domain = '',
}: {
  title: string;
  status?: number;
  heading: any;
  tone: string;
  state: any;
  body: any;
  domain?: string;
}) {
  const doc = (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <title>{`${title} · slop-detect`}</title>
        {raw(BRAND_FONTS_HEAD)}
        <style>{raw(BRAND_CSS)}</style>
        <style>{raw(UI_CSS)}</style>
        <style>{raw(PAGE_CSS)}</style>
      </head>
      <body>
        <Nav />
        <main class="confirm">
          <div class="confirm-card">
            <SectionLedger tag="monitoring" label="unsubscribe" />
            <h1 class="confirm-h">{heading}</h1>
            <p class={`confirm-state ${tone}`}>{state}</p>
            {body}
            <p class="confirm-meta">slop-detect.com</p>
          </div>
        </main>
        <Footer domain={domain || '<domain>'} />
      </body>
    </html>
  );
  return new Response('<!doctype html>' + doc.toString(), {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function unavailable() {
  return page({
    title: 'Unavailable',
    status: 503,
    heading: 'Temporarily unavailable',
    tone: 'warn',
    state: 'storage offline',
    body: (
      <p class="confirm-body">
        Monitoring storage is offline. Open the link again in a few minutes.
      </p>
    ),
  });
}

function badLink() {
  return page({
    title: 'Invalid link',
    status: 403,
    heading: 'This unsubscribe link is invalid',
    tone: 'err',
    state: 'bad signature',
    body: (
      <p class="confirm-body">
        The link is malformed, forged, or no longer matches the subscriber (the alert address
        changed since it was sent). Unsubscribe from the newest alert email instead.
      </p>
    ),
  });
}

export async function onRequestGet({ request, env }) {
  if (!env.RESULTS || !env.SESSION_SECRET) return unavailable();
  const token = new URL(request.url).searchParams.get('token');
  if (!token)
    return page({
      title: 'Invalid link',
      status: 400,
      heading: 'Unsubscribe link incomplete',
      tone: 'err',
      state: 'token missing',
      body: (
        <p class="confirm-body">This URL is missing its token. Use the link from an alert email.</p>
      ),
    });
  const id = await verifyUnsubscribe(token, env.SESSION_SECRET);
  if (!id) return badLink();
  const watch = await getWatch(env.RESULTS, id.domain);
  if (!watch || watch.email !== id.email)
    return page({
      title: 'Already off',
      heading: 'Alerts already off',
      tone: 'ok',
      state: 'nothing monitored',
      domain: id.domain,
      body: (
        <p class="confirm-body">
          <strong>{id.domain}</strong> is not monitored under that address — nothing to stop.
        </p>
      ),
    });
  // GET never performs — the form below POSTs back to this same URL.
  return page({
    title: 'Unsubscribe',
    heading: 'Stop alerts?',
    tone: 'warn',
    state: 'confirm',
    domain: id.domain,
    body: (
      <div>
        <p class="confirm-body">
          Stop monitoring emails for <strong>{id.domain}</strong> to <strong>{id.email}</strong>.
          This also removes the domain from the public directory. Immediate, no take-backsies needed
          — resubscribe any time.
        </p>
        <form method="post" action={`/api/watch/unsubscribe?token=${encodeURIComponent(token)}`}>
          <div class="confirm-actions">
            <button type="submit" class="btn btn-outline">
              Stop alerts for {id.domain}
            </button>
          </div>
        </form>
      </div>
    ),
  });
}

export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.RESULTS || !env.SESSION_SECRET)
    return new Response(JSON.stringify({ error: 'storage offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  // The token travels in the URL (List-Unsubscribe header), not the body —
  // one-click clients POST an empty `List-Unsubscribe=One-Click` form.
  const token = new URL(request.url).searchParams.get('token');
  if (!token) return badLink();
  const id = await verifyUnsubscribe(token, env.SESSION_SECRET);
  if (!id) return badLink();
  const watch = await getWatch(env.RESULTS, id.domain);
  // Stale token (address changed since the mail was sent) must NOT stop the
  // new subscriber's alerts — refuse rather than guess.
  if (watch && watch.email !== id.email) return badLink();
  // Funnel completeness (T-35 follow-up): one-click unsubs count as churn too,
  // gated on actual removal like the API path. Replays (no watch) emit nothing.
  if (watch && (await performUnsubscribe(env.RESULTS, id.domain, id.email)))
    deferFlowBump(env, 'watch', 'unsubscribed', 1, waitUntil);
  // 200 either way: one-click clients just need the 2xx, humans get the page.
  return page({
    title: 'Unsubscribed',
    heading: 'Alerts off',
    tone: 'ok',
    state: 'unsubscribed',
    domain: id.domain,
    body: (
      <p class="confirm-body">
        <strong>{id.domain}</strong> is no longer monitored and was delisted. No more emails —
        resubscribe any time.
      </p>
    ),
  });
}
