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
  CRAFT_CHECKS,
  PRESETS,
  DEFINITIONS_VERSION,
} from '@slop-detect/core';

function lifecycle(p: any, extra: Record<string, unknown> = {}) {
  return {
    id: p.id,
    label: p.label,
    short: p.short ?? null,
    category: p.category || extra.category || null,
    weight: p.weight,
    since: p.since || extra.since || null,
    status: p.status || 'active',
    evidenceGrade: p.evidenceGrade ?? null,
    era: p.era ?? null,
    modelFamilies: p.modelFamilies ?? [],
    lastValidatedIn: p.lastValidatedIn ?? null,
    likelihoodRatio: p.likelihoodRatio ?? null,
    fpRate: p.fpRate ?? null,
    fpRatePre2022: p.fpRatePre2022 ?? null,
    ...extra,
  };
}

export async function onRequestGet() {
  const patterns = PATTERNS.map((p) => lifecycle(p, { since: p.since || 'baseline' }));

  const copyPatterns = (COPY_PATTERNS as any[]).map((p) =>
    lifecycle(p, { category: p.category || 'copy', since: p.since || '2026.08' }),
  );

  const aeoChecks = (AEO_CHECKS as any[]).map((c) =>
    lifecycle(c, {
      severity: c.severity || 'recommended',
      required: c.severity === 'required',
    }),
  );

  const systemChecks = SYSTEM_CHECKS.map((c) => lifecycle(c));

  const craftChecks = CRAFT_CHECKS.map((c) => lifecycle(c));

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
      craftCount: craftChecks.length,
      craftChecks,
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
