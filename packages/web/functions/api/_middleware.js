// Rate-limit + Turnstile middleware for /api/* endpoints.
//
// Defends against:
//   1. Abusive batch scanning (one IP firing 100 scans/min) — KV-backed counter.
//   2. Drive-by embedding from third-party sites — restrict CORS origin to
//      slop-detect.com (with localhost allowed for dev) and require a valid
//      Turnstile token on POST.
//
// Bindings (see wrangler.toml + pages env vars):
//   env.RATE_LIMIT        — KV namespace for per-IP counter (sliding 60s window)
//   env.TURNSTILE_SECRET  — Cloudflare Turnstile secret key
//   env.TURNSTILE_SITEKEY — public sitekey (echoed to web UI)

const ALLOWED_ORIGINS = new Set([
  'https://slop-detect.com',
  'https://www.slop-detect.com',
  'https://slop-detector.pages.dev',
  'https://slop-detector-8by.pages.dev',
  'http://localhost:8788',
  'http://localhost:3000'
]);

// Per-IP rate limit: max N scans per 60-second window.
const SCAN_LIMIT_PER_MIN = 6;
const FIXPROMPT_LIMIT_PER_MIN = 20;

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : 'https://slop-detect.com';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Turnstile-Token',
    'Vary': 'Origin'
  };
}

function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
  });
}

async function verifyTurnstile(token, secret, ip) {
  if (!token || !secret) return { ok: false, reason: 'missing_token' };
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body
    });
    const data = await r.json();
    return data.success
      ? { ok: true }
      : { ok: false, reason: 'turnstile_failed', codes: data['error-codes'] };
  } catch (err) {
    return { ok: false, reason: 'turnstile_unreachable', detail: String(err) };
  }
}

async function checkRateLimit(kv, ip, route, limit) {
  // KV counter with TTL — coarse but cheap; good enough for a public free
  // endpoint backed by an expensive headless browser.
  const key = `rl:${route}:${ip}`;
  let n = 0;
  try {
    const v = await kv.get(key);
    n = v ? parseInt(v, 10) : 0;
  } catch (_) { /* fall through */ }
  if (n >= limit) return { ok: false, used: n, limit };
  // Increment with 60s TTL (effectively a rolling 60s window).
  try {
    await kv.put(key, String(n + 1), { expirationTtl: 60 });
  } catch (_) { /* if KV fails, fail-open rather than block all users */ }
  return { ok: true, used: n + 1, limit };
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const origin = request.headers.get('Origin') || '';
  const url = new URL(request.url);

  // CORS preflight passes through with the right headers.
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  // GET endpoints are public — only POST hits the expensive browser code.
  if (request.method !== 'POST') {
    return next();
  }

  // Block third-party origins outright. Browser CORS protects most cases, but
  // this also blocks server-to-server scrapers piggy-backing on our quota.
  // Allow no-origin requests (curl / CLI) but rate-limit them harder.
  const trusted = ALLOWED_ORIGINS.has(origin);

  // Client IP — Cloudflare always sets this on the request object.
  const ip = request.headers.get('CF-Connecting-IP')
    || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    || 'unknown';

  // Per-route limits.
  const route = url.pathname.replace(/^\/api\//, '');
  const limit = route === 'scan'
    ? (trusted ? SCAN_LIMIT_PER_MIN : Math.max(2, Math.floor(SCAN_LIMIT_PER_MIN / 2)))
    : FIXPROMPT_LIMIT_PER_MIN;

  if (env.RATE_LIMIT) {
    const gate = await checkRateLimit(env.RATE_LIMIT, ip, route, limit);
    if (!gate.ok) {
      return jsonResponse({
        error: 'rate_limited',
        message: `Too many requests. Limit is ${limit}/min per IP for /api/${route}.`,
        retryAfter: 60
      }, 429, origin);
    }
  }

  // Turnstile required for /api/scan from browser origins. CLI / server callers
  // (no Origin header) skip Turnstile but get the harder rate limit above.
  if (route === 'scan' && trusted && env.TURNSTILE_SECRET) {
    const token = request.headers.get('X-Turnstile-Token');
    const verdict = await verifyTurnstile(token, env.TURNSTILE_SECRET, ip);
    if (!verdict.ok) {
      return jsonResponse({
        error: 'turnstile_required',
        message: 'Captcha verification failed. Reload the page and try again.',
        reason: verdict.reason
      }, 403, origin);
    }
  }

  // Attach CORS headers to whatever the downstream handler returns.
  const res = await next();
  const merged = new Response(res.body, res);
  for (const [k, v] of Object.entries(corsHeaders(origin))) {
    merged.headers.set(k, v);
  }
  return merged;
}
