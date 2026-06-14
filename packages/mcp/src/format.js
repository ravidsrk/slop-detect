// Renders a /api/scan JSON result into the readable summary an agent sees in
// its tool output. Kept pure (no I/O) so it's trivial to unit-test and reuse.

// Score is 0-100 where LOWER is better — easy to misread, so we spell it out
// every time rather than assume the model remembers the polarity.
export function formatScan(result) {
  const {
    grade,
    score,
    tier,
    verdict,
    finalUrl,
    title,
    patternsFlagged,
    patternsTotal,
    patterns = [],
    resultUrl,
  } = result;

  // Only the triggered patterns are actionable; the rest are noise here.
  const triggered = patterns.filter((p) => p.triggered);
  const triggeredLines = triggered.length
    ? triggered.map((p) => `  • ${p.label} (+${p.weight})`).join('\n')
    : '  • None — clean on all checks.';

  const lines = [
    `Grade: ${grade}`,
    `Score: ${score}/100 (lower is better — 0 = no slop)`,
    `Tier: ${tier}`,
    verdict ? `Verdict: ${verdict}` : null,
    title ? `Title: ${title}` : null,
    finalUrl ? `Scanned: ${finalUrl}` : null,
    '',
    `Patterns flagged: ${patternsFlagged}/${patternsTotal}`,
    triggeredLines,
    '',
    resultUrl ? `Shareable result: ${resultUrl}` : null,
    '',
    'Raw JSON:',
    '```json',
    JSON.stringify(result, null, 2),
    '```',
  ].filter((l) => l !== null);

  return lines.join('\n');
}

// Renders the `system` block of a /api/scan result (DESIGN.md compliance).
// Score is 0-100 where HIGHER is better — it measures alignment with the
// site's OWN declared design system, not slop.
export function formatSystem(result) {
  const sys = result && result.system;
  if (!sys) {
    return 'No system block in the scan result — the API may not have run the design-system axis.';
  }
  if (!sys.declared) {
    return [
      'Design-system check: NO SYSTEM DECLARED.',
      sys.message || 'No parseable DESIGN.md tokens were found for this page.',
      '',
      'To enable this check, publish a DESIGN.md (Google Labs spec — YAML',
      'front-matter tokens: colors, typography, rounded, components) at the',
      'site root, or pass design_md_url pointing at one.',
    ].join('\n');
  }

  const driftLines = (sys.drift || []).length
    ? sys.drift.map((d) => `  • ${d.message} (${d.id})`).join('\n')
    : '  • None — the page matches its declared system.';

  const lines = [
    `Design-system compliance${sys.name ? ` — "${sys.name}"` : ''}`,
    `Score: ${sys.score}/100 (HIGHER is better — 100 = fully on-system)`,
    `Tier: ${sys.tier} (Aligned ≥80 · Drifting ≥50 · Off-system <50)`,
    sys.source ? `DESIGN.md: ${sys.source}` : null,
    `Checks: ${sys.checksEvaluated} evaluated, ${sys.checksSkipped} skipped (missing data skips — it is never drift)`,
    '',
    'Drift:',
    driftLines,
    '',
    'These are named, contestable checks against the tokens the site itself',
    'declares — a fingerprint of drift, not a verdict on the design.',
    '',
    'Raw JSON:',
    '```json',
    JSON.stringify(sys, null, 2),
    '```',
  ].filter((l) => l !== null);

  return lines.join('\n');
}

// Renders a /api/aeo report. Score is 0-100 where HIGHER is better (the inverse
// of the slop score), so we spell that out too. Tier: AI-Ready / Partial /
// Invisible.
export function formatAeo(report) {
  const {
    url,
    score,
    maxScore,
    tier,
    requiredFailed,
    recommendedFailed,
    failed = [],
    passed = [],
  } = report;

  const failLines = failed.length
    ? failed.map((c) => `  • ${c.label} (${c.severity}, -${c.weight}) — ${c.message}`).join('\n')
    : '  • None — passes every AEO check.';

  const lines = [
    `AEO: can AI engines read & cite this page?`,
    `Score: ${score}/${maxScore} (HIGHER is better — ${maxScore} = fully AI-ready)`,
    `Tier: ${tier}`,
    url ? `Scanned: ${url}` : null,
    '',
    `Checks passed: ${passed.length}/${passed.length + failed.length}` +
      ` (required failed: ${requiredFailed}, recommended failed: ${recommendedFailed})`,
    'Issues:',
    failLines,
    '',
    'Raw JSON:',
    '```json',
    JSON.stringify(report, null, 2),
    '```',
  ].filter((l) => l !== null);

  return lines.join('\n');
}
