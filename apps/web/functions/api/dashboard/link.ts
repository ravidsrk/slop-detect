// POST /api/dashboard/link { email } — request a magic sign-in link for the
// agency dashboard (Roadmap v2 P2b).
//
// Anti-enumeration: the response is IDENTICAL whether or not the email owns any
// watches — a link is only actually sent when it does. Goes through the shared
// middleware (cheap rate limit, CORS, foreign-origin rejection; no Turnstile).
// Configured-off without an email provider + SESSION_SECRET, like alerts.

import { isValidEmail, listWatchesByEmail, issueDashboardToken } from '../../_shared.js';
import { emailConfigured, sendEmail } from '../../_email.js';
import { buildDashboardLinkEmail } from '../../_alerts.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

// Per-email send cap — stops address bombing while keeping the anti-enumeration
// response identical (we skip the send silently when over limit).
const DASHLINK_LIMIT = 3;
const DASHLINK_WINDOW_SEC = 3600;

async function dashLinkAllowed(kv, email) {
  if (!kv) return true;
  const key = `rl:dashlink:${email}`;
  try {
    const n = parseInt(await kv.get(key), 10) || 0;
    if (n >= DASHLINK_LIMIT) return false;
    await kv.put(key, String(n + 1), { expirationTtl: DASHLINK_WINDOW_SEC });
    return true;
  } catch {
    // Fail closed on the send path when KV is unavailable.
    return false;
  }
}

export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.RESULTS)
    return json({ error: 'dashboard_unavailable', message: 'Storage is offline.' }, 503);
  if (!emailConfigured(env) || !env.SESSION_SECRET) {
    return json(
      {
        error: 'dashboard_unavailable',
        message:
          'Dashboard sign-in requires the email provider and SESSION_SECRET to be configured.',
      },
      503
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!isValidEmail(body?.email)) return json({ error: 'a valid `email` is required' }, 400);
  const email = String(body.email).trim().toLowerCase();

  // The one fixed response — composed before we know anything, returned in every
  // non-error path, so timing/shape can't reveal whether an account exists.
  const genericOk = {
    ok: true,
    message:
      'If that address monitors any domains, a sign-in link is on its way. It expires in 15 minutes.',
  };

  try {
    const watches = await listWatchesByEmail(env.RESULTS, email);
    if (watches.length && (await dashLinkAllowed(env.RATE_LIMIT, email))) {
      // Issue + send out-of-band so the response latency is IDENTICAL whether or
      // not the address owns watches. Doing the KV write + email round-trip inline
      // would make existence measurable (a timing oracle) despite the generic
      // body. `waitUntil` runs it after the response is sent; we fall back to an
      // inline await only when it's unavailable (e.g. unit tests).
      const send = (async () => {
        const token = await issueDashboardToken(env.RESULTS, email);
        const loginUrl = `${new URL(request.url).origin}/dashboard?token=${token}`;
        const msg = buildDashboardLinkEmail(loginUrl, watches.length);
        await sendEmail(env, { to: email, subject: msg.subject, text: msg.text });
      })().catch(() => {});
      if (typeof waitUntil === 'function') waitUntil(send);
      else await send;
    }
  } catch (_) {
    /* best-effort: still return the generic response */
  }

  return json(genericOk);
}
