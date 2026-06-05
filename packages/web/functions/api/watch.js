// /api/watch — monitored domains (the willingness-to-pay test from VALIDATION.md)
//
//   POST /api/watch  { domain, email }              → start monitoring a domain
//   POST /api/watch  { domain, email, unsubscribe }  → stop monitoring it
//   GET  /api/watch?domain=<domain>                  → public monitoring status
//
// Scanning stays free forever; this is the paid CONTINUITY layer — we REMEMBER a
// domain and flag when it regresses to slop between redesigns. For the
// validation phase this captures intent + an email and proves regression
// detection on real scan data. Scheduled re-scans (Cron Trigger) and the actual
// "your score dropped" email are the documented next step, not this commit.
//
// Rate-limit, CORS, and foreign-origin rejection are handled by
// functions/api/_middleware.js — this route gets the cheap (non-scan) limit and
// is NOT gated by Turnstile, so the signup form works without a captcha.

import {
  normalizeDomain,
  isValidEmail,
  getWatch,
  putWatch,
  deleteWatch,
  getHistory,
  getLatestForDomain,
  publicWatch,
  setListing,
  deleteListing
} from '../_shared.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// GET /api/watch?domain=example.com — monitoring status + score history.
// Public (no email is ever returned). Powers a future dashboard / sparkline.
export async function onRequestGet({ request, env }) {
  const domain = normalizeDomain(new URL(request.url).searchParams.get('domain') || '');
  if (!domain) return json({ error: 'a valid ?domain= is required' }, 400);
  if (!env.RESULTS) return json({ error: 'monitoring storage unavailable' }, 503);

  const watch = await getWatch(env.RESULTS, domain);
  if (!watch) return json({ domain, monitoring: false });

  const history = await getHistory(env.RESULTS, domain);
  return json(publicWatch(watch, history));
}

export async function onRequestPost({ request, env }) {
  if (!env.RESULTS) return json({ error: 'monitoring storage unavailable' }, 503);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON body' }, 400); }

  const domain = normalizeDomain(body?.domain);
  if (!domain) return json({ error: 'a valid `domain` is required (e.g. "example.com")' }, 400);

  if (!isValidEmail(body?.email)) {
    return json({ error: 'a valid `email` is required to monitor a domain' }, 400);
  }
  const email = String(body.email).trim().toLowerCase();

  // ── Unsubscribe ────────────────────────────────────────────────────────────
  // Require the email to match the subscriber so a third party can't stop
  // someone else's monitoring. Removing the watch also delists the domain.
  if (body.unsubscribe) {
    const existing = await getWatch(env.RESULTS, domain);
    if (!existing) return json({ domain, monitoring: false, unsubscribed: false });
    if (existing.email !== email) {
      return json({ error: 'email does not match the subscriber for this domain' }, 403);
    }
    await deleteWatch(env.RESULTS, domain);
    if (existing.listed) await deleteListing(env.RESULTS, domain);
    return json({ domain, monitoring: false, unsubscribed: true });
  }

  // ── Subscribe (idempotent) ───────────────────────────────────────────────────
  const existing = await getWatch(env.RESULTS, domain);
  const now = new Date().toISOString();

  // Seed the baseline from the domain's most recent public scan if one exists,
  // so a domain registered right after a scan starts watching from a known
  // point. If nothing's been scanned yet, the baseline is set on the next scan
  // (see recordScanForWatch). Preserve an established baseline on re-subscribe.
  const latest = await getLatestForDomain(env.RESULTS, domain).catch(() => null);

  // Opt-in to the public directory: `list:true` lists the domain (dofollow
  // backlink from /directory); `list:false` delists it; omitting it preserves
  // the current state. This is the ONLY way a domain enters the directory —
  // an email-attached, deliberate act by whoever is claiming the domain.
  const listed = body.list === true ? true
    : body.list === false ? false
    : (existing?.listed ?? false);

  const watch = {
    domain,
    email,
    listed,
    plan: existing?.plan || 'trial',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    baselineScore: existing?.baselineScore ?? latest?.score ?? null,
    baselineGrade: existing?.baselineGrade ?? latest?.grade ?? null,
    baselineTier:  existing?.baselineTier  ?? latest?.tier  ?? null,
    baselineId:    existing?.baselineId    ?? latest?.id    ?? null,
    baselineAt:    existing?.baselineAt    ?? latest?.createdAt ?? null,
    lastScore: existing?.lastScore ?? latest?.score ?? null,
    lastGrade: existing?.lastGrade ?? latest?.grade ?? null,
    lastTier:  existing?.lastTier  ?? latest?.tier  ?? null,
    lastId:    existing?.lastId    ?? latest?.id    ?? null,
    lastCheckedAt: existing?.lastCheckedAt ?? latest?.createdAt ?? null,
    regressed: existing?.regressed ?? false,
    notified:  existing?.notified  ?? false
  };
  await putWatch(env.RESULTS, watch);

  // Reflect the listing choice in the directory. List from the best score we
  // have (the latest scan); a never-scanned domain lists as "pending" and is
  // filled in on its next scan via recordScanForWatch.
  if (listed) {
    const seed = latest || {
      domain, score: watch.lastScore, grade: watch.lastGrade,
      tier: watch.lastTier, id: watch.lastId, title: null
    };
    await setListing(env.RESULTS, seed).catch(() => {});
  } else if (existing?.listed) {
    await deleteListing(env.RESULTS, domain).catch(() => {});
  }

  const history = await getHistory(env.RESULTS, domain);
  return json({
    ...publicWatch(watch, history),
    monitoring: true,
    alreadyMonitored: !!existing,
    directoryUrl: listed ? `${new URL(request.url).origin}/directory` : null,
    // Be explicit about what the trial does and doesn't do yet, so the signup
    // UX doesn't over-promise during validation.
    note: watch.baselineScore == null
      ? 'Baseline will be set the next time this domain is scanned.'
      : 'Monitoring active — we recorded the current score as your baseline.'
  }, existing ? 200 : 201);
}
