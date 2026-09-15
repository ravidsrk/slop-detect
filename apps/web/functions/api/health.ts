// GET /api/health — liveness + readiness for the scan API (G-07 / T-23).
//
// Liveness is implicit (a 200/503 JSON answer proves the Function runs).
// Readiness probes the three bindings the scan path needs:
//   - browser: BROWSER binding present (presence only — launching Chromium per
//     ping would burn the render budget; depth is the canary's job).
//   - rateLimitKv / resultsKv: binding present AND one cheap read succeeds.
// 200 when everything is ready, 503 when anything is degraded. Never cached.
// Polled by .github/workflows/health-ping.yml (every 30 min) and documented
// in the T-28 runbooks as the first triage step.

import { DEFINITIONS_VERSION } from '@slop-detect/core';

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

async function probeKv(binding) {
  if (!binding) return { ok: false, reason: 'binding missing' };
  const start = Date.now();
  try {
    // A read on a fixed probe key: missing keys still prove readability.
    await binding.get('health:ping');
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, reason: err && err.message ? err.message : String(err) };
  }
}

export async function onRequestGet({ env }) {
  const e = env || {};
  const [rateLimitKv, resultsKv] = await Promise.all([probeKv(e.RATE_LIMIT), probeKv(e.RESULTS)]);
  const browser = e.BROWSER ? { ok: true } : { ok: false, reason: 'binding missing' };
  const checks = { browser, rateLimitKv, resultsKv };
  const ready = browser.ok && rateLimitKv.ok && resultsKv.ok;
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
