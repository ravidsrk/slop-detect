// Post-verify DNS check for the Resend sending domain (T-37, G-43).
//
// After the owner adds slop-detect.com in the Resend dashboard and publishes
// the three DNS records (H-03, see docs/EMAIL_AUTH.md), this verifies each
// record resolves with the right shape. Pure + injectable resolver so tests
// drive both PASS and FAIL paths without touching real DNS.
//
// What PASS means (shape, not exact strings — DKIM keys are tenant-specific,
// copy them from the Resend dashboard):
//   spf:   TXT @ contains a v=spf1 record with an `include:` mechanism
//   dkim:  TXT resend._domainkey.<domain> starts with v=DKIM1
//   dmarc: TXT _dmarc.<domain> starts with v=DMARC1 and carries a p= policy
//          (any of none/quarantine/reject passes the check; the policy is
//          reported so the owner can harden deliberately, not blindly).

export async function checkEmailAuth(domain, resolveTxt) {
  const results: Record<
    string,
    { ok: boolean; record?: string; reason?: string; policy?: string }
  > = {};
  const txt = async (name) => {
    try {
      const records = await resolveTxt(name);
      return (records || []).map((r) => (Array.isArray(r) ? r.join('') : String(r)));
    } catch (e) {
      return { error: e && e.code ? e.code : String(e) };
    }
  };

  // SPF: any v=spf1 record with an include mechanism (bare `v=spf1 -all`
  // would fail every Resend send, so it must not pass).
  const spf = await txt(domain);
  if (Array.isArray(spf)) {
    const rec = spf.find((r) => r.startsWith('v=spf1'));
    results.spf =
      rec && /include:\S+/.test(rec)
        ? { ok: true, record: rec }
        : {
            ok: false,
            reason: rec ? 'no include mechanism (would fail all sends)' : 'no v=spf1 record',
          };
  } else {
    results.spf = { ok: false, reason: `DNS lookup failed: ${spf.error}` };
  }

  // DKIM: Resend publishes under resend._domainkey (selector `resend`).
  const dkim = await txt(`resend._domainkey.${domain}`);
  if (Array.isArray(dkim)) {
    const rec = dkim.find((r) => r.startsWith('v=DKIM1'));
    results.dkim = rec
      ? { ok: true, record: `${rec.slice(0, 24)}…` }
      : { ok: false, reason: 'no v=DKIM1 record (copy the value from Resend)' };
  } else {
    results.dkim = { ok: false, reason: `DNS lookup failed: ${dkim.error}` };
  }

  // DMARC: v=DMARC1 with an explicit policy; the policy is reported, not gated.
  const dmarc = await txt(`_dmarc.${domain}`);
  if (Array.isArray(dmarc)) {
    const rec = dmarc.find((r) => r.startsWith('v=DMARC1'));
    const policy = rec && (rec.match(/p=(none|quarantine|reject)/) || [])[1];
    results.dmarc = rec
      ? { ok: true, record: rec, policy: policy || 'unspecified' }
      : { ok: false, reason: 'no v=DMARC1 record' };
  } else {
    results.dmarc = { ok: false, reason: `DNS lookup failed: ${dmarc.error}` };
  }

  return { domain, ok: results.spf.ok && results.dkim.ok && results.dmarc.ok, checks: results };
}

export function formatReport(report) {
  const line = (name, c) =>
    c.ok
      ? `  PASS ${name}: ${c.record}${c.policy ? ` (p=${c.policy})` : ''}`
      : `  FAIL ${name}: ${c.reason}`;
  return [
    `email-auth for ${report.domain}: ${report.ok ? 'PASS' : 'FAIL'}`,
    line('spf', report.checks.spf),
    line('dkim', report.checks.dkim),
    line('dmarc', report.checks.dmarc),
  ].join('\n');
}
