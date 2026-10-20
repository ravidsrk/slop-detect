// GET /badge/:domain.svg — live, embeddable slop badge.
//
// Reflects the latest stored scan for that domain (from KV key d:<domain>).
// Tier-colored, shields-style. Cached short so READMEs/footers stay reasonably
// fresh without re-scanning on every render. If a domain has never been
// scanned, returns a neutral "no scan" badge (still valid SVG).
//
// Embed:
//   [![slop](https://slop-detect.com/badge/example.com.svg)](https://slop-detect.com)

import { getLatestForDomain, getWatch, isEmailVerifiedListing, BADGE_TTL } from '../_shared.js';
import { badgeSvg } from '../_badge.js';

export async function onRequestGet({ params, env }) {
  let domain = String(params.domain || '')
    .replace(/\.svg$/i, '')
    .replace(/^www\./, '')
    .toLowerCase()
    .slice(0, 253);

  const [slim, watch] = await Promise.all([
    getLatestForDomain(env.RESULTS, domain).catch(() => null),
    getWatch(env.RESULTS, domain).catch(() => null),
  ]);
  // Same gate as /score/:domain. The SVG is a public, cacheable embed, so a
  // saved scan is not enough to print the grade.
  const svg = badgeSvg(domain, slim, {
    withheld: !!slim && !isEmailVerifiedListing(watch),
  });

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      // Short cache: badges should track re-scans within a few hours, and
      // GitHub/Camo will cache aggressively anyway.
      'Cache-Control': `public, max-age=${BADGE_TTL}, s-maxage=${BADGE_TTL}`,
    },
  });
}
