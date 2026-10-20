// GET /api/opt-in?domains=a.com,b.com
//
// Public grades for the compare arena. A domain is included only when its watch
// is an email-verified directory listing (the same check as /score/:domain).
// Everyone else is omitted, so the caller cannot tell a missing scan from a
// withheld one by reading a score. Capped so a public GET cannot fan out into
// thousands of watch reads.

import {
  getLatestForDomain,
  getListing,
  getResult,
  getWatch,
  isEmailVerifiedListing,
  normalizeDomain,
} from '../_shared.js';

const MAX_DOMAINS = 40;

function patternCount(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

// The count has to describe the same record as the published score. A listing
// does not store patternsFlagged, so look up its result and accept that count
// only when the saved score still matches. A missing result, or a result from
// a different score, is null — never the latest scan's count and never the corpus.
async function patternsForSource(kv, src) {
  if (!src) return null;
  const own = patternCount(src.patternsFlagged);
  if (own != null) return own;
  if (!src.id) return null;
  const saved = await getResult(kv, src.id).catch(() => null);
  if (!saved || saved.score !== src.score) return null;
  return patternCount(saved.patternsFlagged);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=120',
    },
  });
}

export async function onRequestGet({ request, env }) {
  const raw = new URL(request.url).searchParams.get('domains') || '';
  const domains = [];
  const seen = new Set();
  for (const part of raw.split(',')) {
    const domain = normalizeDomain(part);
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    domains.push(domain);
    if (domains.length >= MAX_DOMAINS) break;
  }

  const out: Record<
    string,
    {
      score: number | null;
      grade: string | null;
      tier: string | null;
      patternsFlagged: number | null;
    }
  > = {};
  if (env?.RESULTS && domains.length) {
    await Promise.all(
      domains.map(async (domain) => {
        const watch = await getWatch(env.RESULTS, domain).catch(() => null);
        if (!isEmailVerifiedListing(watch)) return;
        const listing = await getListing(env.RESULTS, domain).catch(() => null);
        const latest =
          listing && listing.score != null
            ? null
            : await getLatestForDomain(env.RESULTS, domain).catch(() => null);
        const src = listing && listing.score != null ? listing : latest;
        out[domain] = {
          score: src && typeof src.score === 'number' ? src.score : null,
          grade: src?.grade ?? null,
          tier: src?.tier ?? null,
          patternsFlagged: await patternsForSource(env.RESULTS, src),
        };
      })
    );
  }

  return json({ domains: out });
}
