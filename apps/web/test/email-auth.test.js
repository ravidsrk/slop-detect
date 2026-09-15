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
  expect(r.checks.spf.reason).toMatch(/no include/);
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
