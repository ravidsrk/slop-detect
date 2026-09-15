// T-37: email-auth gate. Stub resolver drives every PASS/FAIL branch without
// touching real DNS; the live run against slop-detect.com is the (expected
// red, pre-H-03) baseline in evidence/T-37-emailauth.txt.

import { test, expect } from 'vitest';
import { checkEmailAuth, formatReport } from '../functions/_emailauth.ts';

const GOOD = {
  'slop-detect.com': [['v=spf1 include:amazonses.com ~all']],
  'resend._domainkey.slop-detect.com': [['v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ']],
  '_dmarc.slop-detect.com': [['v=DMARC1; p=quarantine; rua=mailto:dmarc@slop-detect.com']],
};

const stub = (records) => async (name) => {
  if (!(name in records)) {
    const e = new Error(`queryTxt ENOTFOUND ${name}`);
    e.code = 'ENOTFOUND';
    throw e;
  }
  return records[name];
};

test('all three records correct → PASS with policy reported', async () => {
  const r = await checkEmailAuth('slop-detect.com', stub(GOOD));
  expect(r.ok).toBe(true);
  expect(r.checks.dmarc.policy).toBe('quarantine');
  const out = formatReport(r);
  expect(out).toContain('email-auth for slop-detect.com: PASS');
  expect(out).toContain('p=quarantine');
});

test('a bare v=spf1 -all FAILS (would reject every Resend send)', async () => {
  const r = await checkEmailAuth(
    'slop-detect.com',
    stub({ ...GOOD, 'slop-detect.com': [['v=spf1 -all']] })
  );
  expect(r.ok).toBe(false);
  expect(r.checks.spf.reason).toMatch(/does not authorize Resend/);
});

test('an unrelated include (google) FAILS — only Resend infra passes', async () => {
  // Greptile P1 on PR #179: the gate must not go green on someone else's SPF.
  const r = await checkEmailAuth(
    'slop-detect.com',
    stub({ ...GOOD, 'slop-detect.com': [['v=spf1 include:_spf.google.com -all']] })
  );
  expect(r.ok).toBe(false);
  expect(r.checks.spf.reason).toMatch(/amazonses/);
});

test('SPF lookalikes FAIL: exp= modifier and -/~/? qualifiers are not passes', async () => {
  // Greptile follow-up P1 on PR #179: mechanisms, not substrings.
  for (const spf of [
    'v=spf1 exp=include:amazonses.com -all',
    'v=spf1 -include:amazonses.com ~all',
    'v=spf1 ~include:amazonses.com -all',
    'v=spf1 redirect=example.com',
  ]) {
    const r = await checkEmailAuth(
      'slop-detect.com',
      stub({ ...GOOD, 'slop-detect.com': [[spf]] })
    );
    expect(r.ok, spf).toBe(false);
  }
  const plus = await checkEmailAuth(
    'slop-detect.com',
    stub({ ...GOOD, 'slop-detect.com': [['v=spf1 +include:amazonses.com -all']] })
  );
  expect(plus.ok).toBe(true);
});

test('missing DKIM record FAILS with the Resend pointer', async () => {
  const { ['resend._domainkey.slop-detect.com']: _drop, ...rest } = GOOD;
  const r = await checkEmailAuth('slop-detect.com', stub(rest));
  expect(r.ok).toBe(false);
  expect(r.checks.dkim.reason).toMatch(/ENOTFOUND/);
});

test('missing DMARC FAILS; p=none still passes (reported, not gated)', async () => {
  const { ['_dmarc.slop-detect.com']: _drop, ...rest } = GOOD;
  const missing = await checkEmailAuth('slop-detect.com', stub(rest));
  expect(missing.ok).toBe(false);
  // Greptile P1 on PR #179: a policy-less record must not pass either.
  const nopolicy = await checkEmailAuth(
    'slop-detect.com',
    stub({ ...GOOD, '_dmarc.slop-detect.com': [['v=DMARC1; rua=mailto:x@y']] })
  );
  expect(nopolicy.ok).toBe(false);
  expect(nopolicy.checks.dmarc.reason).toMatch(/no valid p=/);
  // Greptile follow-up P1 on PR #179: sp= must not satisfy the top-level p=.
  const subonly = await checkEmailAuth(
    'slop-detect.com',
    stub({ ...GOOD, '_dmarc.slop-detect.com': [['v=DMARC1; sp=none']] })
  );
  expect(subonly.ok).toBe(false);
  // Tags are case-insensitive per RFC 7489 §6.3.
  const upper = await checkEmailAuth(
    'slop-detect.com',
    stub({ ...GOOD, '_dmarc.slop-detect.com': [['v=DMARC1; P=REJECT']] })
  );
  expect(upper.ok).toBe(true);
  expect(upper.checks.dmarc.policy).toBe('reject');
  const none = await checkEmailAuth(
    'slop-detect.com',
    stub({ ...GOOD, '_dmarc.slop-detect.com': [['v=DMARC1; p=none']] })
  );
  expect(none.ok).toBe(true);
  expect(none.checks.dmarc.policy).toBe('none');
});

test('DNS errors fail with the reason, never throw', async () => {
  const r = await checkEmailAuth('slop-detect.com', stub({}));
  expect(r.ok).toBe(false);
  expect(r.checks.spf.reason).toMatch(/ENOTFOUND/);
  expect(() => formatReport(r)).not.toThrow();
  expect(formatReport(r)).toContain('FAIL');
});
