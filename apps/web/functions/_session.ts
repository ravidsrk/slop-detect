// Magic-link sessions for the agency dashboard (Roadmap v2 P2b).
//
// Indie-lean auth: no passwords, no accounts table. A watch already carries the
// owner's email; the dashboard is simply "every watch belonging to this email."
// Login = click a single-use emailed link → we set an HMAC-signed, HttpOnly
// cookie. The only server-side state is the short-lived link token (KV); the
// session itself is stateless (signed payload), so there is nothing to clean up.
//
// Web Crypto only (crypto.subtle) — identical behavior in Cloudflare Workers
// and Node ≥20 tests. Requires env.SESSION_SECRET; absent ⇒ the dashboard is
// configured-off (same safe-off pattern as email alerts).

const COOKIE_NAME = 'sd_session';
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const enc = new TextEncoder();

async function hmacHex(data, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Constant-time-ish compare (same pattern as the cron sweep's secret check).
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function b64urlEncode(s) {
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
function b64urlDecode(s) {
  const pad = s.length % 4 === 2 ? '==' : s.length % 4 === 3 ? '=' : '';
  return decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad)));
}

// email → "payload.signature". Payload carries the email + absolute expiry.
export async function signSession(
  email,
  secret,
  { ttlMs = DEFAULT_TTL_MS, now = Date.now() } = {}
) {
  if (!email || !secret) return null;
  const payload = b64urlEncode(JSON.stringify({ e: email, x: now + ttlMs }));
  const sig = await hmacHex(payload, secret);
  return `${payload}.${sig}`;
}

// "payload.signature" → email, or null (bad shape / bad signature / expired).
export async function verifySession(token, secret, { now = Date.now() } = {}) {
  if (!token || !secret) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacHex(payload, secret);
  if (!safeEqual(sig, expected)) return null;
  try {
    const { e, x } = JSON.parse(b64urlDecode(payload));
    if (typeof e !== 'string' || typeof x !== 'number' || now >= x) return null;
    return e;
  } catch {
    return null;
  }
}

// ── One-click unsubscribe tokens (RFC 8058) ──────────────────────────────────
// Stateless like sessions: "payload.signature", signed with SESSION_SECRET but
// domain-separated ('unsub-v1' prefix in the signed input) so a session cookie
// can never verify as an unsubscribe token and vice versa. No expiry — the
// token dies with the watch (unsubscribing twice is a harmless no-op), which
// is exactly the RFC's "the URL must keep working" expectation. A token binds
// ONE (domain, email) pair, so a leaked URL can't stop anyone else's alerts.
const UNSUB_PREFIX = 'unsub-v1';

export async function signUnsubscribe(domain, email, secret) {
  if (!domain || !email || !secret) return null;
  const payload = b64urlEncode(JSON.stringify({ d: domain, e: email }));
  const sig = await hmacHex(`${UNSUB_PREFIX}.${payload}`, secret);
  return `${payload}.${sig}`;
}

// "payload.signature" → { domain, email }, or null (bad shape / bad signature).
export async function verifyUnsubscribe(token, secret) {
  if (!token || !secret) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacHex(`${UNSUB_PREFIX}.${payload}`, secret);
  if (!safeEqual(sig, expected)) return null;
  try {
    const { d, e } = JSON.parse(b64urlDecode(payload));
    if (typeof d !== 'string' || typeof e !== 'string' || !d || !e) return null;
    return { domain: d, email: e };
  } catch {
    return null;
  }
}

export function unsubscribeUrl(origin, token) {
  return `${origin}/api/watch/unsubscribe?token=${encodeURIComponent(token)}`;
}

// ── Cookie plumbing ──────────────────────────────────────────────────────────
export function sessionCookie(token, { maxAgeSec = DEFAULT_TTL_MS / 1000 } = {}) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor(maxAgeSec)}`;
}
export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
export function readSessionToken(request) {
  const header =
    request.headers && typeof request.headers.get === 'function'
      ? request.headers.get('Cookie') || ''
      : '';
  const m = header.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return m ? m[1] : null;
}

// Convenience: request → logged-in email (or null).
export async function sessionEmail(request, secret) {
  const token = readSessionToken(request);
  return token ? verifySession(token, secret) : null;
}

// CSRF backstop for the cookie-authed /api/me/* routes (T-32). The middleware
// already rejects foreign origins and the cookie is SameSite=Lax (never sent
// on cross-site POSTs); this makes the route safe even if either regresses.
// Absent Origin/Referer ⇒ allow (curl/CLI carry no origin, and a stolen
// cookie is credential theft, not CSRF). Present-but-foreign ⇒ reject.
export function isForeignOrigin(request) {
  let origin = '';
  let referer = '';
  let host = '';
  if (request.headers && typeof request.headers.get === 'function') {
    origin = request.headers.get('Origin') || '';
    referer = request.headers.get('Referer') || '';
    host = request.headers.get('Host') || '';
  }
  const cand = origin || referer;
  if (!cand) return false;
  try {
    const candHost = new URL(cand, `https://${host || 'slop-detect.com'}`).host;
    const selfHost = host || new URL(request.url).host;
    return candHost !== selfHost;
  } catch {
    return true;
  }
}
