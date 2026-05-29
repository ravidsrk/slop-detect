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
    resultUrl
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
    '```'
  ].filter((l) => l !== null);

  return lines.join('\n');
}
