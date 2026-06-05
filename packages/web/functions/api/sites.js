// GET /api/sites — the public directory of opt-in scanned sites (JSON).
//
// Only domains whose owners opted in via the claim/monitor flow
// (POST /api/watch { list: true }) appear here — see VALIDATION.md. Powers the
// crawlable /directory page and any external embed. Public, no key (GET routes
// aren't gated by the middleware).
//
//   GET /api/sites                 → up to `limit` listings (cursor-paginated)
//   GET /api/sites?sort=slop       → sloppiest first (default: cleanest first)
//   GET /api/sites?cursor=<cursor> → next page of the raw KV scan

import { listSites } from '../_shared.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Short edge cache — the directory changes only when someone lists/rescans.
      'Cache-Control': 'public, max-age=120, s-maxage=120'
    }
  });
}

export async function onRequestGet({ request, env }) {
  if (!env.RESULTS) return json({ error: 'directory storage unavailable' }, 503);

  const u = new URL(request.url);
  const cursor = u.searchParams.get('cursor');
  const sort = u.searchParams.get('sort') === 'slop' ? 'slop' : 'clean';
  const limit = Math.min(500, Math.max(1, parseInt(u.searchParams.get('limit') || '200', 10) || 200));

  const { sites, cursor: next, complete } = await listSites(env.RESULTS, { limit, cursor });

  // Sort within the returned page. A score of null (listed but not yet scored)
  // sinks to the end either way.
  const ranked = sites.slice().sort((a, b) => {
    const sa = a.score == null ? Infinity : a.score;
    const sb = b.score == null ? Infinity : b.score;
    return sort === 'slop' ? sb - sa : sa - sb;
  });

  return json({ count: ranked.length, sort, complete, cursor: next, sites: ranked });
}
