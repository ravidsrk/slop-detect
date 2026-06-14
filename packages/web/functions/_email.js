// Provider-agnostic transactional email. Wired to Resend (https://resend.com)
// via env, but isolated behind one function so swapping providers is a one-file
// change. SAFE BY DEFAULT: with no provider configured it logs and no-ops
// (returns { sent:false, reason:'no_provider' }) instead of throwing — so the
// monitoring flow never breaks just because email isn't set up yet.
//
// Required env to actually send:
//   RESEND_API_KEY  — Resend API key
//   ALERT_FROM      — verified From address, e.g. "Slop Detect <alerts@slop-detect.com>"
//
// `fetchImpl` is injectable for tests.

import { report } from './_report.js';

export function emailConfigured(env) {
  return !!(env && env.RESEND_API_KEY && env.ALERT_FROM);
}

export async function sendEmail(env, { to, subject, text, html }, fetchImpl = fetch) {
  if (!to || !subject || !(text || html)) {
    return { sent: false, reason: 'invalid_message' };
  }
  if (!emailConfigured(env)) {
    // No provider yet — record intent so it's visible, but don't fail the caller.
    report(env, 'info', 'email_skipped_no_provider', { to: redact(to), subject });
    return { sent: false, reason: 'no_provider' };
  }
  try {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.ALERT_FROM,
        to: [to],
        subject,
        text,
        ...(html ? { html } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      report(env, 'error', 'email_send_failed', { status: res.status, body: body.slice(0, 200) });
      return { sent: false, reason: `http_${res.status}` };
    }
    const data = await res.json().catch(() => ({}));
    return { sent: true, id: data.id || null };
  } catch (e) {
    report(env, 'error', 'email_send_error', { message: e && e.message ? e.message : String(e) });
    return { sent: false, reason: 'exception' };
  }
}

// Never log a full address — keep just enough to debug (first char + domain).
function redact(addr) {
  const s = String(addr);
  const at = s.indexOf('@');
  if (at < 1) return '***';
  return `${s[0]}***${s.slice(at)}`;
}
