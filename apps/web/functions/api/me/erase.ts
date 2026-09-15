// POST /api/me/erase — self-serve erasure (GDPR Art. 17 / DPDP, G-17).
//
// Auth: dashboard session cookie + same-origin (see export.ts) + the caller
// echoes the session email in the body ({ "email": "you@x" }) so a stray or
// curious POST can't wipe an account by accident. Erases every email-bound
// record: each owned watch via performUnsubscribe (delist + drop index +
// delete watch), plus the suppression record. Stale index entries (watch
// gone or re-owned) are cleaned without touching anyone else's watch.
// Idempotent: erasing twice returns zeros, still 200. Anonymous scan
// artifacts can't be attributed (see export.ts notes) and are left alone.
// The response clears the session cookie — the account it described is gone.

import {
  getEmailDomains,
  getWatch,
  performUnsubscribe,
  removeFromEmailIndex,
  deleteSuppression,
  isSuppressed,
} from '../../_shared.js';
import { sessionEmail, isForeignOrigin, clearSessionCookie } from '../../_session.js';
import { report } from '../../_report.js';

function redact(addr) {
  const s = String(addr);
  const at = s.indexOf('@');
  if (at < 1) return '***';
  return `${s[0]}***${s.slice(at)}`;
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extraHeaders },
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.RESULTS || !env.SESSION_SECRET)
    return json({ error: 'account storage unavailable' }, 503);
  if (isForeignOrigin(request)) return json({ error: 'foreign origin' }, 403);
  const email = await sessionEmail(request, env.SESSION_SECRET);
  if (!email) return json({ error: 'sign in to erase your data' }, 401);

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: 'body must be JSON { email }' }, 400);
  }
  if (
    String(body.email || '')
      .trim()
      .toLowerCase() !== String(email).trim().toLowerCase()
  ) {
    return json({ error: 'body.email must match the signed-in address' }, 400);
  }

  let erased = 0;
  let stale = 0;
  for (const domain of await getEmailDomains(env.RESULTS, email)) {
    const w = await getWatch(env.RESULTS, domain);
    // Ownership re-check per domain: a stale index entry must never delete
    // a watch that moved to another email — clean the entry, keep the watch
    // (same rule as listWatchesByEmail).
    if (!w || w.email !== email) {
      await removeFromEmailIndex(env.RESULTS, email, domain);
      stale++;
      continue;
    }
    if (await performUnsubscribe(env.RESULTS, domain, email)) erased++;
  }
  const hadSuppression = await isSuppressed(env.RESULTS, email);
  if (hadSuppression) await deleteSuppression(env.RESULTS, email);

  report(env, 'info', 'data_erased', { to: redact(email), erased, stale });
  return json(
    {
      erased,
      staleDomains: stale,
      suppressionCleared: hadSuppression,
      note: 'Anonymous scan artifacts are not tied to your email and were left alone (see /api/me/export notes).',
    },
    200,
    { 'Set-Cookie': clearSessionCookie() }
  );
}
