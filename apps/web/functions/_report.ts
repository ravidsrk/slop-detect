// Minimal observability shim for the Pages Functions.
//
// Cloudflare captures console output via `wrangler tail` and Logpush, so a
// structured console line is the zero-dependency baseline. If env.ERROR_WEBHOOK
// (a Slack/Discord/Sentry-ingest URL) is configured, we ALSO fire-and-forget a
// POST so real errors page someone instead of dying in a swallowed catch.
//
// Usage:
//   import { report } from '../_report.js';
//   report(env, 'error', 'scan_failed', { url, message: err.message }, waitUntil);
//
// Keep payloads PII-free — never log emails or full page content.

export function report(env, level, event, data = {}, waitUntil = undefined) {
  const line = { ts: new Date().toISOString(), level, event, ...data };
  // Structured log line (picked up by `wrangler tail` / Logpush).
  try {
    const fn = level === 'error' ? console.error : console.log;
    fn(`[slop-detect] ${JSON.stringify(line)}`);
  } catch (_) {
    /* never throw from the logger */
  }

  // Optional out-of-band alert. Fire-and-forget; never block or fail the request.
  const hook = env && env.ERROR_WEBHOOK;
  if (hook && (level === 'error' || level === 'warn')) {
    try {
      const body = JSON.stringify({
        text: `slop-detect ${level}: ${event} ${JSON.stringify(data).slice(0, 800)}`,
      });
      const promise = fetch(hook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
      }).catch(() => {});
      if (typeof waitUntil === 'function') {
        waitUntil(promise);
      } else {
        // Callers without request context (e.g. _email.ts) fall back to a
        // detached promise; not guaranteed to complete after the response.
        void promise;
      }
    } catch (_) {
      /* swallow — observability must never break the request */
    }
  }
}
