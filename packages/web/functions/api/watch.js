// /api/watch — monitored domains (the willingness-to-pay test from VALIDATION.md)
//
//   POST /api/watch  { domain, email }              → start monitoring a domain
//   POST /api/watch  { domain, email, unsubscribe }  → stop monitoring it
//   GET  /api/watch?domain=<domain>                  → public monitoring status
//
// Scanning stays free forever; this is the paid CONTINUITY layer — we REMEMBER a
// domain and flag when it regresses to slop between redesigns. Subscribing with a
// provider configured issues a double-opt-in confirmation email; the daily sweep
// (/api/cron/sweep) re-scans verified domains and emails owners on a regression.
// With no email provider configured, subscribing still works and simply doesn't
// email (alertsActive:false) — see _email.js / _sweep.js.
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
  deleteListing,
  issueWatchToken
} from '../_shared.js';
import { emailConfigured, sendEmail } from '../_email.js';
import { buildVerificationEmail } from '../_alerts.js';

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
    // Delist BEFORE removing the watch: if the listing delete throws we keep the
    // watch, so the state stays consistent ("still monitored + listed") and
    // retryable rather than orphaning a public row with no owner. Always attempt
    // cleanup even if the watch shows listed:false, to recover from failed deletes.
    await deleteListing(env.RESULTS, domain);
    await deleteWatch(env.RESULTS, domain);
    return json({ domain, monitoring: false, unsubscribed: true });
  }

  // ── Subscribe (idempotent) ───────────────────────────────────────────────────
  const existing = await getWatch(env.RESULTS, domain);

  // Ownership guard: once a domain is claimed, only the same email may modify it
  // (change the alert address, list/delist, re-baseline). Without this, any
  // caller could take over an existing watch or list/delist someone else's
  // domain. A brand-new domain can still be claimed by anyone with an email —
  // verified ownership (DNS TXT / meta tag) is a documented follow-up; this just
  // stops hijacking of an already-claimed domain.
  if (existing && existing.email !== email) {
    return json({
      error: 'this domain is already claimed by a different email; contact that owner to make changes'
    }, 403);
  }

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

  // Design-system monitoring (Roadmap v2 P2a): `system: true` makes the daily
  // sweep also check the domain against its <origin>/DESIGN.md and alert on
  // drift (the agency value proposition). Same explicit-set / omit-preserves
  // semantics as `list`; covered by the same ownership guard above.
  const systemMonitoring = body.system === true ? true
    : body.system === false ? false
    : (existing?.system ?? false);

  const watch = {
    domain,
    email,
    system: systemMonitoring,
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
    listed,
    regressed: existing?.regressed ?? false,
    notified:  existing?.notified  ?? false,
    // System-axis state is owned by recordScanForWatch — preserve it across
    // re-subscribes so toggling `list`/email can't erase the compliance baseline.
    baselineSystemScore: existing?.baselineSystemScore ?? null,
    baselineSystemTier:  existing?.baselineSystemTier  ?? null,
    lastSystemScore: existing?.lastSystemScore ?? null,
    lastSystemTier:  existing?.lastSystemTier  ?? null,
    lastSystemAt:    existing?.lastSystemAt    ?? null,
    lastSystemDrift: existing?.lastSystemDrift ?? [],
    systemRegressed: existing?.systemRegressed ?? false,
    systemNotified:  existing?.systemNotified  ?? false,
    // Privacy/consent: record WHEN the email was submitted and under which
    // policy version (lawful basis = consent). `verified` stays false until a
    // double-opt-in confirmation is added — no alert email may be sent to an
    // unverified address. Deletion = unsubscribe (email-matched) or /privacy.
    consentAt: existing?.consentAt || now,
    policyVersion: '2026.06',
    verified: existing?.verified ?? false
  };

  // The WATCH is the source of truth; the directory row is derived state.
  // Persist the watch FIRST so a public row can never exist without an owner
  // (an orphan row can't be delisted via the email-gated flow — strictly worse
  // than a missing row). Then reconcile the row to match. The reconcile is
  // best-effort: every scan rebuilds OR removes the row from `watch.listed`
  // (recordScanForWatch), so a transient KV hiccup here self-heals and never
  // strands a row. List from the best score we have; a never-scanned domain
  // lists as "pending", filled in on its next scan.
  await putWatch(env.RESULTS, watch);
  try {
    if (listed) {
      const seed = latest || {
        domain, score: watch.lastScore, grade: watch.lastGrade,
        tier: watch.lastTier, id: watch.lastId, title: null
      };
      await setListing(env.RESULTS, seed);
    } else if (!listed) {
      await deleteListing(env.RESULTS, domain);
    }
  } catch (_) { /* derived row — reconciled on the domain's next scan */ }

  // Double-opt-in: if an email provider is configured and this address isn't
  // verified yet, issue a single-use token and send the confirmation email. No
  // alert email is ever sent until the owner confirms. Best-effort — a send
  // failure must not fail the subscription (the consent record still stands).
  const origin = new URL(request.url).origin;
  const alertsLive = emailConfigured(env);
  let verificationSent = false;
  if (alertsLive && !watch.verified) {
    try {
      const token = await issueWatchToken(env.RESULTS, domain);
      if (token) {
        const confirmUrl = `${origin}/api/watch/confirm?token=${token}`;
        const msg = buildVerificationEmail(domain, confirmUrl);
        const res = await sendEmail(env, { to: email, subject: msg.subject, text: msg.text });
        verificationSent = !!(res && res.sent);
      }
    } catch (_) { /* best-effort */ }
  }

  const history = await getHistory(env.RESULTS, domain);
  return json({
    ...publicWatch(watch, history),
    monitoring: true,
    alreadyMonitored: !!existing,
    directoryUrl: listed ? `${origin}/directory` : null,
    // Honest state: alerts are live only when a provider is configured AND the
    // address has confirmed (double opt-in). Always surface privacy + deletion.
    alertsActive: alertsLive,
    verified: !!watch.verified,
    verificationSent,
    privacyPolicy: `${origin}/privacy.md`,
    note: (watch.baselineScore == null
      ? 'Baseline will be set the next time this domain is scanned. '
      : 'Monitoring active — we recorded the current score as your baseline. ') +
      (alertsLive
        ? (watch.verified
            ? 'Regression alerts are on for this confirmed address. '
            : 'Check your email to confirm and switch on regression alerts. ')
        : 'Regression-alert emails are not active yet. ') +
      'Unsubscribe anytime by POSTing { unsubscribe: true } with the same email.'
  }, existing ? 200 : 201);
}
