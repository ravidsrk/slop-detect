// POST /api/cron/sweep — run the monitoring sweep (re-scan verified domains,
// email owners on a new regression). Triggered by an external scheduler (a
// GitHub Actions cron, a Cloudflare cron Worker, or cron-job.org) — NOT by users.
//
// Auth: requires `Authorization: Bearer <CRON_SECRET>`. Returns 503 if the secret
// isn't configured (feature off by default).
//
// Required env to run:
//   CRON_SECRET       — shared secret the scheduler presents.
//   INTERNAL_API_KEY  — an `unlimited`-tier API key (minted in RATE_LIMIT KV) so
//                       the internal re-scans bypass the per-IP limit, the cost
//                       cap, and Turnstile.
//   RESEND_API_KEY / ALERT_FROM — to actually deliver alert emails (else no-op).

import { listWatches, getWatch, putWatch } from '../../_shared.js';
import { monitorSweep } from '../../_sweep.js';
import { sendEmail } from '../../_email.js';
import { buildRegressionAlert, buildDriftAlert } from '../../_alerts.js';
import { report } from '../../_report.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

// Constant-time-ish compare to avoid leaking the secret via timing.
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function onRequestPost({ request, env }) {
  if (!env.CRON_SECRET)
    return json({ error: 'sweep_disabled', message: 'CRON_SECRET is not configured.' }, 503);
  if (!env.RESULTS) return json({ error: 'storage_unavailable' }, 503);

  const auth = request.headers.get('Authorization') || '';
  const presented = auth.replace(/^Bearer\s+/i, '');
  if (!safeEqual(presented, env.CRON_SECRET)) return json({ error: 'unauthorized' }, 401);

  if (!env.INTERNAL_API_KEY) {
    return json(
      {
        error: 'misconfigured',
        message: 'INTERNAL_API_KEY (unlimited tier) is required for internal re-scans.',
      },
      500
    );
  }

  const origin = new URL(request.url).origin;
  const max = Math.min(200, Math.max(1, parseInt(env.SWEEP_MAX || '50', 10) || 50));

  // Re-scan a watched domain through the public scan path (keyed unlimited →
  // bypasses limits/cost-cap/Turnstile). Watches that opted into design-system
  // monitoring (watch.system) also run the system axis against the domain's
  // <origin>/DESIGN.md. The scan triggers recordScanForWatch, which updates the
  // watch's history + regression/drift flags as a side effect.
  const scanDomain = async (watch) => {
    const body: any = { url: `https://${watch.domain}`, axes: ['design'] };
    if (watch.system) body.designMd = true;
    const res = await fetch(`${origin}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': env.INTERNAL_API_KEY },
      body: JSON.stringify(body),
    });
    if (!res.ok && res.status !== 422) {
      // 422 = the page couldn't be scored (bot wall/dead) — not fatal for a sweep.
      throw new Error(`scan ${watch.domain} -> ${res.status}`);
    }
  };

  const sendAlert = async (watch) => {
    const baseline = {
      score: watch.baselineScore,
      grade: watch.baselineGrade,
      tier: watch.baselineTier,
    };
    const current = { score: watch.lastScore, grade: watch.lastGrade, tier: watch.lastTier };
    const resultUrl = watch.lastId ? `${origin}/r/${watch.lastId}` : null;
    const msg = buildRegressionAlert(watch.domain, baseline, current, { resultUrl });
    return sendEmail(env, { to: watch.email, subject: msg.subject, text: msg.text });
  };

  // System-drift alert (P2a) — fires once per drift event, recovery re-arms.
  const sendDriftAlert = async (watch) => {
    const baseline = { score: watch.baselineSystemScore, tier: watch.baselineSystemTier };
    const current = { score: watch.lastSystemScore, tier: watch.lastSystemTier };
    const resultUrl = watch.lastId ? `${origin}/r/${watch.lastId}` : null;
    const msg = buildDriftAlert(watch.domain, baseline, current, watch.lastSystemDrift || [], {
      resultUrl,
    });
    return sendEmail(env, { to: watch.email, subject: msg.subject, text: msg.text });
  };

  const watches = await listWatches(env.RESULTS, { limit: 1000 });
  const summary = await monitorSweep({
    watches,
    scanDomain,
    getWatch: (d) => getWatch(env.RESULTS, d),
    putWatch: (w) => putWatch(env.RESULTS, w),
    sendAlert,
    sendDriftAlert,
    max,
  });

  report(env, 'info', 'monitor_sweep', summary);
  return json({ ok: true, ...summary });
}
