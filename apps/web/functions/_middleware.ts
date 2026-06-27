// Root Pages middleware — runs for EVERY Function route (it nests above
// functions/api/_middleware.ts, which handles /api/*).
//
// Why this exists: Cloudflare Pages applies the public/_headers rules ONLY to
// static assets, not to Function-rendered responses. So every server-rendered
// HTML page (/dashboard, /r/:id, /score/:domain, /report/:domain, /directory,
// /leaderboard, /blog/:slug, /brand, /docs, the watch-confirm page) was shipping
// with no Content-Security-Policy, X-Frame-Options, nosniff, or HSTS — the
// dashboard sign-in page was framable. Add the same headers _headers declares,
// once, to every text/html Function response.
//
// Scope guards:
//   - Only text/html responses are touched, so JSON (/api/*), OG PNGs, and badge
//     SVGs pass straight through unchanged.
//   - We never override a header a route set itself (and _headers, applied by the
//     platform to static assets, carries identical values), so this can't clash.

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), browsing-topics=()',
  'X-Frame-Options': 'SAMEORIGIN',
  // Identical to the /* CSP in public/_headers: scoped to Google Fonts and
  // Cloudflare Turnstile, with 'unsafe-inline' for the existing inline
  // <style>/<script>/JSON-LD. Tightening to nonces is a separate follow-up.
  'Content-Security-Policy':
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com",
};

export async function onRequest(context) {
  const res = await context.next();
  const contentType = res.headers.get('Content-Type') || '';
  // Only decorate HTML; leave JSON, images (OG/badge), and other assets alone.
  if (!contentType.includes('text/html')) return res;

  const merged = new Response(res.body, res);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    if (!merged.headers.has(k)) merged.headers.set(k, v);
  }
  return merged;
}
