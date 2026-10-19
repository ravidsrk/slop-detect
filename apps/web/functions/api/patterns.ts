// GET /api/patterns  →  { version, count, patterns: [{ id, label, short, weight, since }] }
//
// Exposes the live pattern catalogue straight from slop-detect-core so the
// frontend (and any integrator) can render the rule list without hardcoding it.
// This is what keeps "The N rules" panel honest as patterns are added — the UI
// reads from here instead of a stale inline <ol>.

import {
  PATTERNS,
  COPY_PATTERNS,
  AEO_CHECKS,
  SYSTEM_CHECKS,
  PRESETS,
  DEFINITIONS_VERSION,
} from '@slop-detect/core';

export async function onRequestGet() {
  const patterns = PATTERNS.map((p) => ({
    id: p.id,
    label: p.label,
    short: p.short,
    category: p.category || null,
    weight: p.weight,
    since: p.since || 'baseline',
  }));

  const copyPatterns = (COPY_PATTERNS as any[]).map((p) => ({
    id: p.id,
    label: p.label,
    short: p.short,
    category: p.category || 'copy',
    weight: p.weight,
    since: p.since || '2026.08',
  }));

  const aeoChecks = (AEO_CHECKS as any[]).map((c) => ({
    id: c.id,
    label: c.label,
    severity: c.severity || 'recommended',
    required: c.severity === 'required',
    weight: c.weight,
  }));

  const systemChecks = SYSTEM_CHECKS.map((c) => ({
    id: c.id,
    label: c.label,
    weight: c.weight,
  }));

  return new Response(
    JSON.stringify({
      version: DEFINITIONS_VERSION,
      count: patterns.length,
      patterns,
      copyCount: copyPatterns.length,
      copyPatterns,
      aeoCount: aeoChecks.length,
      aeoChecks,
      systemCount: systemChecks.length,
      systemChecks,
      presets: Object.keys(PRESETS),
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
