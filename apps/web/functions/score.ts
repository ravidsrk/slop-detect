// GET /score?domain=<input> — no-JS progressive-enhancement redirect for the
// landing page scan form (`action="/score" method="get"`) and direct query links.
// Normalizes the domain and redirects 302 to the canonical /score/:domain hub
// (or back to / if no valid domain was provided).

import { normalizeDomain } from './_shared.js';

export async function onRequestGet({ request }: { request: Request }) {
  const url = new URL(request.url);
  const rawInput = url.searchParams.get('domain') || url.searchParams.get('url') || '';
  const domain = normalizeDomain(String(rawInput));

  const target = domain ? `${url.origin}/score/${encodeURIComponent(domain)}` : `${url.origin}/`;
  return new Response(null, {
    status: 302,
    headers: {
      Location: target,
      'Cache-Control': 'no-store',
    },
  });
}
