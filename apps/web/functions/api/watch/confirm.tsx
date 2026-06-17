/** @jsxRuntime automatic @jsxImportSource hono/jsx */
// GET /api/watch/confirm?token=...  — double-opt-in confirmation (MNR-13).
//
// Clicking the link in the verification email burns the single-use token (7-day
// TTL) and flips the watch to verified:true — the only state in which regression
// alert emails are sent. People click these in a browser, so it returns a small
// HTML page; it now wears the same light editorial-instrument shell as the rest
// of the product (Nav / Footer / SectionLedger) and the confirmation micro-state
// language (design "Motion and interaction states > confirmation micro-states").
//
// Status contract preserved: 200 verified, 503 no storage, 400 missing token,
// 410 expired/used, 404 watch gone (alerts.test.js covers the lifecycle).

import { raw } from 'hono/html';
import { consumeWatchToken, getWatch, putWatch } from '../../_shared.js';
import { BRAND_FONTS_HEAD, BRAND_CSS } from '../../_brand.js';
import { Nav, Footer, SectionLedger, Button, UI_CSS } from '../../_ui.js';

// Page-specific layout: a left-aligned confirmation card centered as a block in
// the space between the sticky nav and the footer. Centering the column is fine;
// the prose stays left-aligned because centered sans body copy is itself a slop
// tell (design "Screen and section inventory > Landing").
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
  .confirm-next{font-family:var(--mono);font-size:var(--fs-body-xs);line-height:1.75;color:var(--text-4);margin:16px 0 0;max-width:54ch}
  .confirm-next code{background:var(--bg-2);border:1px solid var(--border);border-radius:3px;padding:1px 5px;color:var(--text-3)}
  .confirm-actions{margin-top:24px}
  .confirm-meta{font-family:var(--mono);font-size:var(--fs-mono-label);color:var(--text-6);margin-top:28px}
  @media(max-width:640px){.confirm{padding:40px 20px}}
`;

// One confirmation card, one of the five states. `tone` selects the mono
// micro-state color (ok / warn / err); `state` is the short confirmation line
// echoed under the heading; `body` is the prose; `action` is the outline button.
function page({
  title,
  status = 200,
  ledger,
  heading,
  tone,
  state,
  body,
  action,
  domain = '',
}: {
  title: string;
  status?: number;
  ledger: { tag: string; label: string };
  heading: any;
  tone: string;
  state: any;
  body: any;
  action?: { href: string; label: string };
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
            <SectionLedger tag={ledger.tag} label={ledger.label} />
            <h1 class="confirm-h">{heading}</h1>
            <p class={`confirm-state ${tone}`}>{state}</p>
            {body}
            {action ? (
              <div class="confirm-actions">
                <Button variant="outline" href={action.href} label={action.label} />
              </div>
            ) : null}
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

export async function onRequestGet({ request, env }) {
  if (!env.RESULTS)
    return page({
      title: 'Unavailable',
      status: 503,
      ledger: { tag: 'monitoring', label: 'double opt-in' },
      heading: 'Temporarily unavailable',
      tone: 'warn',
      state: 'storage offline',
      body: (
        <p class="confirm-body">
          Monitoring storage is offline. Open the link again in a few minutes.
        </p>
      ),
      action: { href: '/', label: 'Back to slop-detect' },
    });

  const token = new URL(request.url).searchParams.get('token');
  if (!token)
    return page({
      title: 'Invalid link',
      status: 400,
      ledger: { tag: 'monitoring', label: 'double opt-in' },
      heading: 'Invalid confirmation link',
      tone: 'err',
      state: 'token missing',
      body: (
        <p class="confirm-body">
          This link is missing its token. Open it straight from the verification email, or
          re-subscribe for a fresh one.
        </p>
      ),
      action: { href: '/', label: 'Re-subscribe' },
    });

  const domain = await consumeWatchToken(env.RESULTS, token);
  if (!domain)
    return page({
      title: 'Link expired',
      status: 410,
      ledger: { tag: 'monitoring', label: 'double opt-in' },
      heading: 'This link has expired or was already used',
      tone: 'warn',
      state: 'link expired or used',
      body: (
        <p class="confirm-body">
          Confirmation links are single-use and valid for 7 days. Re-subscribe to get a fresh one.
        </p>
      ),
      action: { href: '/', label: 'Re-subscribe' },
    });

  const watch = await getWatch(env.RESULTS, domain);
  if (!watch)
    return page({
      title: 'Not monitored',
      status: 404,
      ledger: { tag: 'monitoring', label: 'double opt-in' },
      heading: `${domain} isn't being monitored`,
      tone: 'err',
      state: 'monitor not found',
      domain,
      body: (
        <p class="confirm-body">
          The monitor may have been removed. Re-subscribe to start watching it again.
        </p>
      ),
      action: { href: '/', label: 'Re-subscribe' },
    });

  watch.verified = true;
  watch.verifiedAt = new Date().toISOString();
  await putWatch(env.RESULTS, watch);

  return page({
    title: 'Confirmed',
    status: 200,
    ledger: { tag: 'monitoring', label: 'double opt-in confirmed' },
    heading: "You're all set",
    tone: 'ok',
    state: `${domain} verified ✓`,
    domain,
    body: (
      <>
        <p class="confirm-body">
          <strong>{domain}</strong> is now monitored. We email you only when its AI-design-slop
          score regresses, never on a schedule.
        </p>
        <p class="confirm-next">
          Stop anytime: POST <code>{'{ unsubscribe: true }'}</code> with your email to{' '}
          <code>/api/watch</code>.
        </p>
      </>
    ),
    action: { href: '/dashboard', label: 'Your monitored domains' },
  });
}
