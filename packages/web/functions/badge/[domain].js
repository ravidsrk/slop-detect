// GET /badge/:domain.svg — live, embeddable slop badge.
//
// Reflects the latest stored scan for that domain (from KV key d:<domain>).
// Tier-colored, shields-style. Cached short so READMEs/footers stay reasonably
// fresh without re-scanning on every render. If a domain has never been
// scanned, returns a neutral "no scan" badge (still valid SVG).
//
// Embed:
//   [![slop](https://slop-detect.com/badge/example.com.svg)](https://slop-detect.com)

import { getLatestForDomain, badgeSvg, BADGE_TTL } from '../_shared.js';

export async function onRequestGet({ params, env }) {
  let domain = String(params.domain || '')
    .replace(/\.svg$/i, '')
    .replace(/^www\./, '')
    .toLowerCase()
    .slice(0, 253);

  const slim = await getLatestForDomain(env.RESULTS, domain).catch(() => null);
  const svg = badgeSvg(domain, slim);

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      // Short cache: badges should track re-scans within a few hours, and
      // GitHub/Camo will cache aggressively anyway.
      'Cache-Control': `public, max-age=${BADGE_TTL}, s-maxage=${BADGE_TTL}`
    }
  });
}
