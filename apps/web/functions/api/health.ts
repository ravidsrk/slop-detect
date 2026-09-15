// GET /api/health — liveness + readiness for the scan API (G-07 / T-23).
//
// Liveness is implicit (a 200/503 JSON answer proves the Function runs).
// Readiness probes whether scans can actually be accepted:
//   - browser: BROWSER binding present (presence only — launching Chromium per
//     ping would burn the render budget; depth is the canary's job).
//   - rateLimitKv / resultsKv: binding present AND one cheap read succeeds.
//   - scans: SCAN_DISABLED kill switch off (when paused, every scan 503s, so
//     readiness must say degraded — including during intentional maintenance,
//     where the failing ping doubles as the re-enable reminder).
// 200 when everything is ready, 503 when anything is degraded. Never cached.
// Polled by .github/workflows/health-ping.yml (every 30 min) and documented
// in the T-28 runbooks as the first triage step.

import { DEFINITIONS_VERSION } from '@slop-detect/core';
import { report } from '../_report.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Must reflect current state — never cache readiness.
      'Cache-Control': 'no-store',
    },
  });
}

async function probeKv(name, binding, env, waitUntil) {
  if (!binding) return { ok: false, reason: 'binding missing' };
  const start = Date.now();
  try {
    // A read on a fixed probe key: missing keys still prove readability.
    await binding.get('health:ping');
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    // Redacted on the wire (this endpoint is public); detail to the log.
    report(
      env,
      'error',
      'health_kv_probe_failed',
      { kv: name, message: err && err.message ? err.message : String(err) },
      waitUntil
    );
    return { ok: false, reason: 'read failed' };
  }
}

export async function onRequestGet({ env, waitUntil }) {
  const e = env || {};
  const [rateLimitKv, resultsKv] = await Promise.all([
    probeKv('RATE_LIMIT', e.RATE_LIMIT, e, waitUntil),
    probeKv('RESULTS', e.RESULTS, e, waitUntil),
  ]);
  const browser = e.BROWSER ? { ok: true } : { ok: false, reason: 'binding missing' };
  // The kill switch rejects every scan with 503 — readiness must say so, or
  // the ping reports "ready" through an intentional (or stale) shutdown.
  const paused = e.SCAN_DISABLED === '1' || e.SCAN_DISABLED === 'true';
  const scans = paused ? { ok: false, reason: 'scanning paused' } : { ok: true };
  const checks = { browser, rateLimitKv, resultsKv, scans };
  const ready = browser.ok && rateLimitKv.ok && resultsKv.ok && scans.ok;
  return json(
    {
      status: ready ? 'ok' : 'degraded',
      checks,
      version: DEFINITIONS_VERSION,
      time: new Date().toISOString(),
    },
    ready ? 200 : 503
  );
}
