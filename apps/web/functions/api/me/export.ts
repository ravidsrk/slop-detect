// GET /api/me/export — self-serve data export (GDPR Art. 15 / DPDP, G-17).
//
// Auth: the dashboard session cookie (proves control of the email via the
// magic-link flow). Returns every KV record keyed to that email as a JSON
// download: watch records, directory listings of owned domains, the email
// index entry, and the suppression record. Anonymous scan artifacts
// (r:/d:/h: keys, aggregates) are NOT tied to any email and can't be
// attributed — the response says so in `notes` instead of pretending.
// CSRF: same-origin enforced in-route (backstop behind SameSite=Lax +
// middleware foreign-origin rejection); the payload is unreadable
// cross-origin anyway (no CORS allow).

import {
  listWatchesByEmail,
  getEmailDomains,
  getListing,
  suppressionKey,
  emailCountersPresent,
} from '../../_shared.js';
import { sessionEmail, isForeignOrigin } from '../../_session.js';
import { report } from '../../_report.js';

function redact(addr) {
  const s = String(addr);
  const at = s.indexOf('@');
  if (at < 1) return '***';
  return `${s[0]}***${s.slice(at)}`;
}

export async function onRequestGet({ request, env }) {
  if (!env.RESULTS || !env.SESSION_SECRET)
    return new Response(JSON.stringify({ error: 'account storage unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  if (isForeignOrigin(request))
    return new Response(JSON.stringify({ error: 'foreign origin' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  const email = await sessionEmail(request, env.SESSION_SECRET);
  if (!email)
    return new Response(JSON.stringify({ error: 'sign in to export your data' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });

  const watches = await listWatchesByEmail(env.RESULTS, email);
  const listings = {};
  for (const w of watches) {
    const row = await getListing(env.RESULTS, w.domain);
    if (row) listings[w.domain] = row;
  }
  const supRaw = await env.RESULTS.get(await suppressionKey(email));
  const body = {
    exportedAt: new Date().toISOString(),
    email,
    watches,
    listings,
    emailIndex: await getEmailDomains(env.RESULTS, email),
    suppression: supRaw ? JSON.parse(supRaw) : null,
    // Ephemeral per-email abuse counters (hashed keys, ≤1h TTL) — presence
    // only, since a bare count is the whole record. Erasure deletes these.
    ephemeralCounters: await emailCountersPresent(env.RATE_LIMIT, email),
    notes: [
      'Anonymous scan results (result permalinks, per-domain history, aggregate statistics) are not tied to any email and cannot be attributed to you — see docs/RETENTION.md. To remove a specific public scan result, open an issue (privacy.md).',
      'Single-use magic-link and confirmation tokens (15 min / 7 day TTL) are unenumerable by design and expire on their own; nothing to export.',
    ],
  };
  report(env, 'info', 'data_exported', { to: redact(email), watches: watches.length });
  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="slop-detect-export-${body.exportedAt.slice(0, 10)}.json"`,
    },
  });
}
