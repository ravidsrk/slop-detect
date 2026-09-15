// Request-ID seam (G-04 / T-22): every /api/* response carries X-Request-Id so
// failures are traceable from a user's report back to the log line.
//
// Derivation (no coordination needed between layers):
//   1. inbound `cf-ray` (Cloudflare sets it on every production request), else
//   2. inbound `x-request-id` (echoed — lets callers trace their own calls,
//      and carries the middleware's ID into handlers), else
//   3. `crypto.randomUUID()` (local dev / non-Cloudflare runtimes).
//
// The api/_middleware computes the ID once, forwards it to handlers on a
// cloned request (forwardWithId), and stamps it on every response — including
// rejections. Handlers read the forwarded header first so all three agree.

function getHeader(request, name) {
  try {
    return request?.headers?.get?.(name) || null;
  } catch {
    return null;
  }
}

export function requestIdFor(request) {
  const ray = getHeader(request, 'cf-ray');
  if (ray) return String(ray).slice(0, 128);
  const echo = getHeader(request, 'x-request-id');
  if (echo) return String(echo).slice(0, 128);
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through to the Math.random fallback */
  }
  return `rid-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffffffffff).toString(36)}`;
}

// Clone the request with the computed ID set, so downstream handlers read the
// SAME id the middleware stamps on the response. Falls back to the original
// request when cloning is impossible (test doubles, exotic runtimes) —
// handlers then re-derive via requestIdFor, which still agrees whenever an
// inbound cf-ray or x-request-id exists (always, in production).
export function forwardWithId(request, requestId) {
  try {
    const fwd = new Request(request);
    fwd.headers.set('x-request-id', requestId);
    return fwd;
  } catch {
    return request;
  }
}
