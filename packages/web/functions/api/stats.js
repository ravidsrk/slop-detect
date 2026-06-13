// GET /api/stats — live aggregate scan stats for the homepage hub.
//
// Reads the single global score histogram (stats:dist, bumped once per scan in
// recordScan) and returns the headline numbers: how many scans are on record,
// the average score, the share that carry slop, and the tier breakdown. One KV
// read, no per-domain enumeration. Public, GET (not gated by the middleware).

import { getStats } from '../_shared.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=120, s-maxage=120'
    }
  });
}

export async function onRequestGet({ env }) {
  if (!env.RESULTS) return json({ count: 0, avgScore: 0, slopShare: 0, clean: 0, mild: 0, heavy: 0 });
  const stats = await getStats(env.RESULTS).catch(() => null);
  return json(stats || { count: 0, avgScore: 0, slopShare: 0, clean: 0, mild: 0, heavy: 0 });
}
