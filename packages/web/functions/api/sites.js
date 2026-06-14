// GET /api/sites — the public directory of opt-in scanned sites (JSON).
//
// Only domains whose owners opted in via the claim/monitor flow
// (POST /api/watch { list: true }) appear here — see VALIDATION.md. Powers the
// crawlable /directory page and any external embed. Public, no key (GET routes
// aren't gated by the middleware).
//
//   GET /api/sites             → all listings, globally sorted (cleanest first)
//   GET /api/sites?sort=slop   → sloppiest first
//   GET /api/sites?limit=50    → cap the number of rows returned (after sorting)

import { listAllSites } from '../_shared.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Short edge cache — the directory changes only when someone lists/rescans.
      'Cache-Control': 'public, max-age=120, s-maxage=120',
    },
  });
}

export async function onRequestGet({ request, env }) {
  if (!env.RESULTS) return json({ error: 'directory storage unavailable' }, 503);

  const u = new URL(request.url);
  const sort = u.searchParams.get('sort') === 'slop' ? 'slop' : 'clean';
  const limit = Math.min(
    1000,
    Math.max(1, parseInt(u.searchParams.get('limit') || '500', 10) || 500)
  );

  // Enumerate the whole directory and sort GLOBALLY so the JSON view matches the
  // /directory page exactly (a per-page sort would diverge once there are more
  // listings than one KV page). Fine at validation scale; revisit if the
  // catalogue grows past a few thousand. A null score (listed, not yet scored)
  // always sinks to the end.
  const all = await listAllSites(env.RESULTS);
  all.sort((a, b) => {
    // Pending (unscored) entries always sink to the end, in BOTH sort modes —
    // mapping null→Infinity would float them to the top of a slop (desc) sort.
    if (a.score == null && b.score == null) return 0;
    if (a.score == null) return 1;
    if (b.score == null) return -1;
    return sort === 'slop' ? b.score - a.score : a.score - b.score;
  });

  const sites = all.slice(0, limit);
  return json({ count: all.length, returned: sites.length, sort, sites });
}
