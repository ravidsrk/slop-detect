// Rate-limit + Turnstile middleware for /api/* endpoints.
//
// Defends against:
//   1. Abusive batch scanning (one IP firing 100 scans/min) — KV-backed counter.
//   2. Drive-by embedding from third-party sites — restrict CORS origin to
//      slop-detect.com (with localhost allowed for dev) and require a valid
//      Turnstile token on POST.
//
// Optional API-key tiers (purely additive — no key = unchanged anon behavior):
//   Clients may pass `Authorization: Bearer <key>` or `X-API-Key: <key>`.
//   A valid key buckets rate limits by the KEY (not the IP) so shared-IP CI
//   runners aren't throttled by neighbors, raises the per-minute limits per
//   tier, and counts as proof-of-human (skips Turnstile regardless of origin).
//   Keys live in the existing RATE_LIMIT KV under a `key:<apikey>` prefix —
//   see API.md for how an operator mints one with wrangler.
//
// Bindings (see wrangler.toml + pages env vars):
//   env.RATE_LIMIT        — KV namespace for per-IP counters + API-key records
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

// API-key tier DEFAULTS. A key record's own scanPerMin/fixPerMin (if present)
// override these. `unlimited` means "skip the rate-limit gate entirely".
// `turnstile: false` means a valid key of this tier is proof-of-human enough,
// so we skip the Turnstile check regardless of request origin.
const TIERS = {
  free: { scanPerMin: 10, fixPerMin: 20, turnstile: false },
  pro: { scanPerMin: 60, fixPerMin: 120, turnstile: false },
  unlimited: { scanPerMin: Infinity, fixPerMin: Infinity, turnstile: false }
};

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : 'https://slop-detect.com';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    // Allow the two API-key header styles through CORS preflight too, so
    // browser clients with a key (e.g. a dashboard) aren't blocked.
    'Access-Control-Allow-Headers': 'Content-Type, X-Turnstile-Token, Authorization, X-API-Key',
    'Vary': 'Origin'
  };
}

function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
  });
}

// Pull an API key from either header style. Returns null if none supplied —
// reading a key is always optional.
function extractApiKey(request) {
  const auth = request.headers.get('Authorization') || '';
  const bearer = auth.match(/^Bearer\s+(.+)$/i);
  if (bearer) return bearer[1].trim();
  const x = request.headers.get('X-API-Key');
  if (x) return x.trim();
  return null;
}

// Resolve an API key against KV. `cache` is a per-request Map (passed in so the
// cache never outlives the request — a module-level cache would serve stale
// records across requests in the same Worker isolate). Returns:
//   { found: false }                       — no such key (caller → 401)
//   { found: true, record }                — valid record (may be disabled)
// KV-missing is handled by the caller (it only calls this when env.RATE_LIMIT
// exists), but a KV read error degrades gracefully to "not found".
async function resolveApiKey(kv, apiKey, cache) {
  if (cache.has(apiKey)) return cache.get(apiKey);
  let result = { found: false };
  try {
    const raw = await kv.get(`key:${apiKey}`);
    if (raw) {
      const record = JSON.parse(raw);
      result = { found: true, record };
    }
  } catch (_) {
    // Malformed JSON or KV hiccup — treat as not found rather than 500. The
    // worst case is the keyed client falls back to anonymous limits.
    result = { found: false };
  }
  cache.set(apiKey, result);
  return result;
}

// Merge a key record onto its tier defaults. A key may override the tier's
// per-minute limits; it inherits turnstile-bypass from the tier.
function effectiveTier(record) {
  const base = TIERS[record.tier] || TIERS.free;
  return {
    tier: record.tier in TIERS ? record.tier : 'free',
    scanPerMin: Number.isFinite(record.scanPerMin) ? record.scanPerMin : base.scanPerMin,
    fixPerMin: Number.isFinite(record.fixPerMin) ? record.fixPerMin : base.fixPerMin,
    turnstile: base.turnstile,
    label: record.label
  };
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

// In-memory, per-isolate fallback counter. Used ONLY when KV is unavailable so
// the expensive scan route can still enforce a hard ceiling (fail-closed)
// instead of letting an attacker drive unlimited headless-browser scans during
// a KV outage. Coarse — each Worker isolate keeps its own map and Cloudflare may
// run several — but it caps the blast radius. Entries self-expire after 60s.
const memCounters = new Map(); // key -> { count, resetAt }

// Hard ceiling for the scan route when KV is down. Deliberately tighter than the
// normal per-IP limit: a degraded mode should be conservative, not generous.
const SCAN_FALLBACK_CEILING = 3;

function memIncrement(key, windowMs = 60000) {
  const now = Date.now();
  // Opportunistic sweep of expired entries so the map can't grow unbounded in a
  // long-lived isolate (it's only touched during KV-degraded mode, so this is
  // cheap). Bounded work: only sweeps when the map is non-trivially sized.
  if (memCounters.size > 256) {
    for (const [k, v] of memCounters) if (now >= v.resetAt) memCounters.delete(k);
  }
  const cur = memCounters.get(key);
  if (!cur || now >= cur.resetAt) {
    const fresh = { count: 1, resetAt: now + windowMs };
    memCounters.set(key, fresh);
    return fresh.count;
  }
  cur.count += 1;
  return cur.count;
}

// Rate-limit gate. Returns { ok, used, limit, degraded }.
//
// Failure modes are route-aware:
//   - KV read/write succeeds → normal KV-backed rolling 60s window.
//   - KV unavailable + scan route → FAIL CLOSED: fall back to a tight in-memory
//     per-isolate ceiling so a KV outage can't unlock unlimited browser scans.
//   - KV unavailable + cheap routes (fix-prompt assemble) → fail open: these
//     don't touch the browser, so blocking everyone on a KV hiccup is worse than
//     letting them through.
//
// `bucket` is the IP for anonymous callers or `key:<apikey>` for keyed callers
// (so a keyed CI runner gets its own window, not the shared NAT IP's).
async function checkRateLimit(kv, bucket, route, limit) {
  const key = `rl:${route}:${bucket}`;
  const isScan = route === 'scan';

  let n = 0;
  let kvReadOk = false;
  try {
    const v = await kv.get(key);
    n = v ? parseInt(v, 10) : 0;
    kvReadOk = true;
  } catch (_) { /* handled below */ }

  if (!kvReadOk) {
    // KV read failed. For the expensive scan route, enforce a conservative
    // in-memory ceiling (fail-closed). For everything else, fail open.
    if (!isScan) return { ok: true, used: 0, limit, degraded: true };
    const memN = memIncrement(key);
    const ceiling = Math.min(SCAN_FALLBACK_CEILING, limit);
    if (memN > ceiling) return { ok: false, used: memN, limit: ceiling, degraded: true };
    return { ok: true, used: memN, limit: ceiling, degraded: true };
  }

  if (n >= limit) return { ok: false, used: n, limit, degraded: false };

  // Increment with 60s TTL (effectively a rolling 60s window).
  let kvWriteOk = false;
  try {
    await kv.put(key, String(n + 1), { expirationTtl: 60 });
    kvWriteOk = true;
  } catch (_) { /* handled below */ }

  // If the write failed on the scan route, also tick the in-memory ceiling so a
  // KV that reads-but-can't-write (e.g. quota exhausted) still can't be abused.
  if (!kvWriteOk && isScan) {
    const memN = memIncrement(key);
    const ceiling = Math.min(SCAN_FALLBACK_CEILING, limit);
    if (memN > ceiling) return { ok: false, used: memN, limit: ceiling, degraded: true };
    return { ok: true, used: memN, limit: ceiling, degraded: true };
  }

  return { ok: true, used: n + 1, limit, degraded: !kvWriteOk };
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

  // Origin classification:
  //   - trusted   → request carries an Origin in our allowlist (our own web UI).
  //   - no-origin → server-to-server / curl / CLI (Origin header absent). Allowed,
  //                 but rate-limited harder on the scan route (see limit selection).
  //   - foreign   → an Origin header that is NOT in the allowlist. A browser
  //                 embedding our endpoint from a third-party page. Rejected
  //                 outright below UNLESS the caller presents a valid API key
  //                 (a key is explicit authorization to call us from anywhere).
  const trusted = ALLOWED_ORIGINS.has(origin);
  const foreignOrigin = origin !== '' && !trusted;

  // Client IP — Cloudflare always sets this on the request object.
  const ip = request.headers.get('CF-Connecting-IP')
    || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    || 'unknown';

  const route = url.pathname.replace(/^\/api\//, '');

  // ── Effective route for gating ───────────────────────────────────────────────
  // /api/fix-prompt has two modes: { result } (cheap, assemble-only) and { url }
  // (re-runs a full headless scan in-process via scanHandler — which does NOT
  // re-enter this middleware). Without this, the { url } mode would borrow
  // fix-prompt's looser limits (20/min, no Turnstile) to drive the expensive
  // browser, fully bypassing the scan gate. So when fix-prompt carries a `url`,
  // we gate it AS a scan: same limit, same shared rate bucket, same Turnstile.
  let effectiveRoute = route;
  if (route === 'fix-prompt') {
    try {
      const peek = await request.clone().json();
      if (peek && peek.url && !peek.result) effectiveRoute = 'scan';
    } catch (_) {
      // Unparseable body — let the handler return its own 400. Gate as fix-prompt.
    }
  }
  // /api/aeo fires several outbound fetches per call against a user-supplied URL
  // (HTML, GPTBot UA, robots.txt, .md twin, llms.txt). It's cheaper than a
  // headless scan but just as abuse-prone (SSRF-adjacent, fan-out). Gate it AS a
  // scan: shared rate bucket, same per-IP limit, same Turnstile + fail-closed.
  if (route === 'aeo') effectiveRoute = 'scan';

  // ── Optional API-key resolution ────────────────────────────────────────────
  // A presented-but-invalid key is a hard error (so clients notice typos /
  // revoked keys); no key at all is fine and stays anonymous.
  const apiKey = extractApiKey(request);
  const keyCache = new Map(); // per-request cache for resolveApiKey
  let keyTier = null; // null === anonymous
  if (apiKey && env.RATE_LIMIT) {
    const resolved = await resolveApiKey(env.RATE_LIMIT, apiKey, keyCache);
    if (!resolved.found) {
      return jsonResponse({
        error: 'invalid_api_key',
        message: 'The API key provided was not recognised.'
      }, 401, origin);
    }
    if (resolved.record.disabled) {
      return jsonResponse({
        error: 'key_disabled',
        message: 'This API key has been disabled. Contact the operator.'
      }, 403, origin);
    }
    keyTier = effectiveTier(resolved.record);
  }

  // ── Foreign-origin rejection ────────────────────────────────────────────────
  // A browser sending an Origin we don't recognise is a third-party page calling
  // our API. Reject it outright — UNLESS it presented a valid API key, which is
  // explicit authorization to call us from anywhere (e.g. a partner dashboard).
  // No-origin callers (curl/CLI, Origin absent) are NOT foreign and pass through.
  if (foreignOrigin && !keyTier) {
    return jsonResponse({
      error: 'origin_not_allowed',
      message: 'This API is not callable from third-party origins. Use the CLI, the MCP server, or an API key.'
    }, 403, origin);
  }

  // ── Limit + bucket selection ────────────────────────────────────────────────
  // Anonymous: bucket by IP, use the existing per-IP limits (scan is harder for
  // no-origin callers). Keyed: bucket by the key, use the tier limit.
  let limit;
  let bucket;
  let tierLabel;
  if (keyTier) {
    limit = effectiveRoute === 'scan' ? keyTier.scanPerMin : keyTier.fixPerMin;
    bucket = `key:${apiKey}`;
    tierLabel = keyTier.tier;
  } else {
    limit = effectiveRoute === 'scan'
      ? (trusted ? SCAN_LIMIT_PER_MIN : Math.max(2, Math.floor(SCAN_LIMIT_PER_MIN / 2)))
      : FIXPROMPT_LIMIT_PER_MIN;
    bucket = ip;
    tierLabel = 'anonymous';
  }

  // Rate-limit gate. `unlimited` tier (limit === Infinity) skips the gate.
  // Gate under effectiveRoute so fix-prompt's { url } mode shares the scan bucket.
  //
  // Two binding states:
  //   - RATE_LIMIT bound  → checkRateLimit (KV-backed, with in-memory fallback).
  //   - RATE_LIMIT MISSING → the scan route must still NOT be wide open (it drives
  //     a headless browser). Enforce a tight in-memory per-isolate ceiling so a
  //     misconfigured deploy can't be abused for unlimited scans. Cheap routes
  //     stay open when the binding is absent (no browser cost).
  if (Number.isFinite(limit)) {
    let gate = { ok: true };
    if (env.RATE_LIMIT) {
      gate = await checkRateLimit(env.RATE_LIMIT, bucket, effectiveRoute, limit);
    } else if (effectiveRoute === 'scan') {
      const memN = memIncrement(`rl:scan:${bucket}`);
      const ceiling = Math.min(SCAN_FALLBACK_CEILING, limit);
      gate = memN > ceiling
        ? { ok: false, used: memN, limit: ceiling, degraded: true }
        : { ok: true, used: memN, limit: ceiling, degraded: true };
    }
    if (!gate.ok) {
      const scope = keyTier ? 'for your API key' : 'per IP';
      const effLimit = gate.limit || limit;
      return jsonResponse({
        error: 'rate_limited',
        message: `Too many requests. Limit is ${effLimit}/min ${scope} for /api/${effectiveRoute} (tier: ${tierLabel}).`,
        tier: tierLabel,
        limit: effLimit,
        degraded: !!gate.degraded,
        retryAfter: 60
      }, 429, origin);
    }
  }

  // ── Turnstile ───────────────────────────────────────────────────────────────
  // Required for /api/scan from browser origins WITHOUT a valid key. A valid key
  // is proof-of-human enough, so any keyed caller (browser or CLI) skips it.
  const skipTurnstile = keyTier && keyTier.turnstile === false;
  if (effectiveRoute === 'scan' && trusted && env.TURNSTILE_SECRET && !skipTurnstile) {
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

  // Attach CORS headers + rate-limit metadata to whatever the handler returns.
  const res = await next();
  const merged = new Response(res.body, res);
  for (const [k, v] of Object.entries(corsHeaders(origin))) {
    merged.headers.set(k, v);
  }
  merged.headers.set('X-RateLimit-Tier', tierLabel);
  merged.headers.set('X-RateLimit-Limit', Number.isFinite(limit) ? String(limit) : 'unlimited');
  return merged;
}
