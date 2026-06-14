// GET /api/patterns  →  { version, count, patterns: [{ id, label, short, weight, since }] }
//
// Exposes the live pattern catalogue straight from slop-detect-core so the
// frontend (and any integrator) can render the rule list without hardcoding it.
// This is what keeps "The N rules" panel honest as patterns are added — the UI
// reads from here instead of a stale inline <ol>.

import { PATTERNS, DEFINITIONS_VERSION } from 'slop-detect-core';

export async function onRequestGet() {
  const patterns = PATTERNS.map((p) => ({
    id: p.id,
    label: p.label,
    short: p.short,
    category: p.category || null,
    weight: p.weight,
    since: p.since || 'baseline',
  }));

  return new Response(
    JSON.stringify({
      version: DEFINITIONS_VERSION,
      count: patterns.length,
      patterns,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        // Catalogue only changes on a deploy — let the edge cache it.
        'Cache-Control': 'public, max-age=3600',
      },
    }
  );
}
