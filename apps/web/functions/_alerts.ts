// Pure builders for the two monitoring emails. Kept dependency-free and pure so
// they're trivially testable and the wording lives in one place. No PII beyond
// the recipient's own domain; copy is plain-text-first (best deliverability).

// CAN-SPAM footer, shared by all four mails: physical postal address (from
// MAIL_POSTAL_ADDRESS), one-click unsubscribe for recurring alerts, privacy
// link. Returns footer LINES; callers spread them at the end of the body.
// `postal` missing ⇒ the Slop Detector line ships without an address and the
// caller reports mail_postal_missing (owner must set it — see docs/EMAIL.md).
export function mailFooter({ postal, unsubUrl }: { postal?: string; unsubUrl?: string }) {
  const lines = ['—', postal ? `Slop Detector · ${postal}` : 'Slop Detector'];
  if (unsubUrl) lines.push(`Stop these alerts (one click, immediate): ${unsubUrl}`);
  lines.push('Privacy: https://slop-detect.com/privacy.md');
  return lines;
}

// Double-opt-in confirmation. We never send alerts to an address until the owner
// clicks this — it's the consent gate (and stops anyone attaching a victim's
// email to a domain).
export function buildVerificationEmail(domain, confirmUrl, opts: any = {}) {
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
    ...(opts.footer ? ['', ...opts.footer] : [`Privacy: https://slop-detect.com/privacy.md`]),
  ].join('\n');
  return { subject, text };
}

// The actual regression alert: "your score dropped".
export function buildRegressionAlert(domain, baseline, current, opts: any = {}) {
  const dir = current.score > baseline.score ? 'rose' : 'changed';
  const subject = `slop-detect: ${domain} ${current.grade} (was ${baseline.grade})`;
  const lines = [
    `${domain} regressed on the AI-design-slop fingerprint.`,
    ``,
    `  Baseline: ${baseline.grade}  ·  score ${baseline.score}  ·  ${baseline.tier}`,
    `  Now:      ${current.grade}  ·  score ${current.score}  ·  ${current.tier}`,
    ``,
    `The slop score ${dir} by ${Math.abs(current.score - baseline.score)} point(s)` +
      `${tierDrop(baseline.tier, current.tier) ? ` and the tier dropped ${baseline.tier} → ${current.tier}` : ''}.`,
  ];
  if (opts.resultUrl) lines.push('', `Full scan: ${opts.resultUrl}`);
  if (opts.fixUrl) lines.push(`Fix prompt: ${opts.fixUrl}`);
  // The old "reply, or POST" line promised an unsubscribe path that never
  // existed (no inbound handler). The footer carries the real one-click URL.
  if (opts.footer) lines.push('', ...opts.footer);
  return { subject, text: lines.join('\n') };
}

const RANK = { Clean: 0, Mild: 1, Heavy: 2 };
function tierDrop(from, to) {
  return (RANK[to] ?? 0) > (RANK[from] ?? 0);
}

// Design-system drift alert (Roadmap v2 P2a): "your page no longer honors its
// own DESIGN.md." Named, contestable drift items — signals, never verdicts.
export function buildDriftAlert(domain, baseline, current, driftItems = [], opts: any = {}) {
  const subject = `slop-detect: ${domain} drifted off its design system (${baseline.tier} → ${current.tier})`;
  const lines = [
    `${domain} no longer matches its declared design system (DESIGN.md).`,
    ``,
    `  Baseline: ${baseline.tier}${typeof baseline.score === 'number' ? `  ·  ${baseline.score}/100` : ''}`,
    `  Now:      ${current.tier}${typeof current.score === 'number' ? `  ·  ${current.score}/100` : ''}`,
    ``,
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
  // Same as the regression alert: the footer carries the real one-click URL.
  if (opts.footer) lines.push('', ...opts.footer);
  return { subject, text: lines.join('\n') };
}

// Dashboard magic-link login email (P2b). Single-use, 15-minute link; ignoring
// it is always safe.
export function buildDashboardLinkEmail(loginUrl, domainCount, opts: any = {}) {
  const subject = 'Your slop-detect dashboard link';
  const text = [
    `Sign in to your slop-detect dashboard (${domainCount} monitored domain${domainCount === 1 ? '' : 's'}):`,
    '',
    loginUrl,
    '',
    'The link is single-use and expires in 15 minutes. If you did not request',
    'it, ignore this email — nothing happens without the click.',
    ...(opts.footer ? ['', ...opts.footer] : ['Privacy: https://slop-detect.com/privacy.md']),
  ].join('\n');
  return { subject, text };
}
