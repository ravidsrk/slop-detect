// Pure builders for the two monitoring emails. Kept dependency-free and pure so
// they're trivially testable and the wording lives in one place. No PII beyond
// the recipient's own domain; copy is plain-text-first (best deliverability).

// Double-opt-in confirmation. We never send alerts to an address until the owner
// clicks this — it's the consent gate (and stops anyone attaching a victim's
// email to a domain).
export function buildVerificationEmail(domain, confirmUrl) {
  const subject = `Confirm monitoring for ${domain}`;
  const text = [
    `You (or someone) asked slop-detect to monitor ${domain} and email you when`,
    `its AI-design-slop score regresses.`,
    ``,
    `Confirm to start monitoring:`,
    confirmUrl,
    ``,
    `If you didn't request this, ignore this email — no monitoring starts and`,
    `your address is removed automatically. We never share or sell your email.`,
    `Privacy: https://slop-detect.com/privacy.md`
  ].join('\n');
  return { subject, text };
}

// The actual regression alert: "your score dropped".
export function buildRegressionAlert(domain, baseline, current, opts = {}) {
  const dir = current.score > baseline.score ? 'rose' : 'changed';
  const subject = `slop-detect: ${domain} ${current.grade} (was ${baseline.grade})`;
  const lines = [
    `${domain} regressed on the AI-design-slop fingerprint.`,
    ``,
    `  Baseline: ${baseline.grade}  ·  score ${baseline.score}  ·  ${baseline.tier}`,
    `  Now:      ${current.grade}  ·  score ${current.score}  ·  ${current.tier}`,
    ``,
    `The slop score ${dir} by ${Math.abs(current.score - baseline.score)} point(s)` +
      `${tierDrop(baseline.tier, current.tier) ? ` and the tier dropped ${baseline.tier} → ${current.tier}` : ''}.`
  ];
  if (opts.resultUrl) lines.push('', `Full scan: ${opts.resultUrl}`);
  if (opts.fixUrl) lines.push(`Fix prompt: ${opts.fixUrl}`);
  lines.push(
    '',
    `Stop these alerts: reply, or POST { unsubscribe: true } with this email to`,
    `https://slop-detect.com/api/watch`
  );
  return { subject, text: lines.join('\n') };
}

const RANK = { Clean: 0, Mild: 1, Heavy: 2 };
function tierDrop(from, to) {
  return (RANK[to] ?? 0) > (RANK[from] ?? 0);
}

// Design-system drift alert (Roadmap v2 P2a): "your page no longer honors its
// own DESIGN.md." Named, contestable drift items — signals, never verdicts.
export function buildDriftAlert(domain, baseline, current, driftItems = [], opts = {}) {
  const subject = `slop-detect: ${domain} drifted off its design system (${baseline.tier} → ${current.tier})`;
  const lines = [
    `${domain} no longer matches its declared design system (DESIGN.md).`,
    ``,
    `  Baseline: ${baseline.tier}${typeof baseline.score === 'number' ? `  ·  ${baseline.score}/100` : ''}`,
    `  Now:      ${current.tier}${typeof current.score === 'number' ? `  ·  ${current.score}/100` : ''}`,
    ``
  ];
  if (driftItems.length) {
    lines.push('What drifted:');
    for (const d of driftItems.slice(0, 5)) lines.push(`  ✗ ${d.message}`);
    lines.push('');
  }
  lines.push(
    'These are named checks against the tokens YOUR DESIGN.md declares — a',
    'fingerprint of drift, not a verdict on the design.'
  );
  if (opts.resultUrl) lines.push('', `Full scan: ${opts.resultUrl}`);
  lines.push(
    '',
    `Stop these alerts: reply, or POST { unsubscribe: true } with this email to`,
    `https://slop-detect.com/api/watch`
  );
  return { subject, text: lines.join('\n') };
}
