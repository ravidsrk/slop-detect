// POST /api/email/webhook — Resend bounce/complaint ingestion (G-46).
//
// Resend delivers delivery events as Svix-signed webhooks. We care about two:
//   email.bounced / email.complained → suppress the recipient (sendEmail then
//   refuses to mail them, same redaction rules as every other email log line).
// Everything else (sent, delivered, opened, clicked, delayed) is acked and
// ignored — reporting per-email delivery events would flood the log pipeline.
//
// Security: the Svix signature (v1 HMAC-SHA256 over "id.timestamp.body") is
// verified with a 5-minute timestamp tolerance before the body is trusted.
// Missing RESEND_WEBHOOK_SECRET ⇒ 503 configured-off (Resend retries, which
// is the correct behavior until the owner wires the secret — see docs/EMAIL.md
// and H-02). Unknown/garbage payloads ⇒ 200-ignored, never 500: a poison event
// must not wedge the webhook queue.

import { addSuppression } from '../../_shared.js';
import { report } from '../../_report.js';

const SIG_TOLERANCE_SEC = 5 * 60;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function svixSign(secretB64, signedContent) {
  const key = await crypto.subtle.importKey(
    'raw',
    b64ToBytes(secretB64),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent));
  return bytesToB64(new Uint8Array(sig));
}

export async function verifySvix(request, rawBody, secret, { nowSec = Date.now() / 1000 } = {}) {
  if (!secret) return false;
  const id = request.headers.get('svix-id');
  const ts = request.headers.get('svix-timestamp');
  const sigHeader = request.headers.get('svix-signature');
  if (!id || !ts || !sigHeader) return false;
  const t = Number(ts);
  if (!Number.isFinite(t) || Math.abs(nowSec - t) > SIG_TOLERANCE_SEC) return false;
  const key = String(secret).replace(/^whsec_/, '');
  let expected;
  try {
    expected = await svixSign(key, `${id}.${ts}.${rawBody}`);
  } catch {
    return false;
  }
  return sigHeader
    .split(' ')
    .filter((s) => s.startsWith('v1,'))
    .some((s) => safeEqual(s.slice(3), expected));
}

function recipientsOf(data) {
  const to = data && data.to;
  if (typeof to === 'string') return [to];
  if (Array.isArray(to)) return to.filter((t) => typeof t === 'string');
  return [];
}

function redact(addr) {
  const s = String(addr);
  const at = s.indexOf('@');
  if (at < 1) return '***';
  return `${s[0]}***${s.slice(at)}`;
}

export async function onRequestPost({ request, env }) {
  if (!env.RESULTS) return json({ error: 'storage offline' }, 503);
  if (!env.RESEND_WEBHOOK_SECRET) return json({ error: 'webhook not configured' }, 503);
  const rawBody = await request.text();
  if (!(await verifySvix(request, rawBody, env.RESEND_WEBHOOK_SECRET))) {
    report(env, 'warn', 'email_webhook_bad_sig', {});
    return json({ error: 'bad signature' }, 401);
  }
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ received: true, ignored: 'unparseable' });
  }
  const type = event && event.type;
  if (type !== 'email.bounced' && type !== 'email.complained') {
    return json({ received: true, ignored: type || 'unknown' });
  }
  const reason = type === 'email.bounced' ? 'bounced' : 'complained';
  const recipients = recipientsOf(event.data);
  for (const to of recipients) {
    await addSuppression(env.RESULTS, to, reason);
    report(env, 'info', 'email_suppressed', { to: redact(to), reason });
  }
  return json({ received: true, suppressed: recipients.length });
}
