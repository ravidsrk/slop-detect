// T-30: legal-pages guard. The privacy policy and terms of service make
// concrete, checkable claims about the code (TTLs, cookie flags, hashing,
// opt-in gating). When code drifts from the policy — or a well-meaning edit
// adds an ungrounded promise — this test fails before users read a lie. Every
// assertion below names the code that grounds it.

import { test, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)); // apps/web/test
const PUBLIC = path.join(HERE, '..', 'public');
const FUNCTIONS = path.join(HERE, '..', 'functions');

const privacy = fs.readFileSync(path.join(PUBLIC, 'privacy.md'), 'utf8');
const terms = fs.readFileSync(path.join(PUBLIC, 'terms.md'), 'utf8');
const ui = fs.readFileSync(path.join(FUNCTIONS, '_ui.tsx'), 'utf8');
const landing = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
const data = fs.readFileSync(path.join(FUNCTIONS, '_data.ts'), 'utf8');
const watch = fs.readFileSync(path.join(FUNCTIONS, 'api', 'watch.ts'), 'utf8');

test('terms of service: required sections exist', () => {
  for (const section of [
    'Acceptable use',
    'Intellectual property',
    'Disclaimer',
    'Limitation of liability',
    'Contact',
  ]) {
    expect(terms, `terms.md has a "${section}" section`).toContain(section);
  }
});

test('terms acceptable-use matches the SSRF guard and abuse controls', () => {
  // _ssrf.ts blocks private/loopback/link-local/metadata targets outright.
  expect(terms).toMatch(/private/i);
  expect(terms).toMatch(/loopback/);
  expect(terms).toMatch(/metadata/);
  // _middleware.ts enforces per-IP rate limits; the web form has Turnstile.
  expect(terms).toMatch(/rate limit/i);
  expect(terms).toMatch(/Turnstile/);
  // watch.ts: verified must be true before any alert is sent (double opt-in).
  expect(terms).toMatch(/double opt-in/);
});

test('terms storage claims match the persistence code', () => {
  // scan.ts: body.share === false skips saveResult/recordScan entirely.
  expect(terms).toMatch(/share:\s*false/);
  // Three retention tiers, not one (greptile P1 on PR #171): RESULT_TTL =
  // 90 days for the payload, WATCH_TTL = 1 year rolling for the h: history
  // key, aggregates immortal. watch.ts reconciles list:true rows only.
  expect(terms).toMatch(/~90 days/);
  expect(terms).toMatch(/up to 1 year/);
  expect(terms).toMatch(/retained indefinitely/);
  expect(terms).toMatch(/no history point, no aggregate contribution/);
  expect(terms).toMatch(/list:\s*true/);
  expect(terms).toMatch(/never full page/i);
  // _email.ts has no delivery guarantee; the terms must not promise one.
  expect(terms).toMatch(/don't\s+guarantee every alert arrives/);
});

test('terms make no promise about paid quotas that pricing does not define', () => {
  // Greptile P2 on PR #171: pricing.md only documents the validation trial,
  // and watch.ts assigns plan:'trial' — so the terms must not claim paid
  // monitoring gets "documented quotas" until pricing defines them.
  expect(terms).not.toMatch(/documented quotas/);
  expect(terms).toMatch(/when paid plans launch/);
});

test('legal claims are wired to implementation tripwires', () => {
  // Greptile P2 on PR #171: text-only parity tests stay green if the
  // control is deleted. Each named control below must still exist in the
  // implementation, or this test fails alongside the behavioral suite
  // (ssrf.test.js, middleware.test.js, kv-ttl.test.js, sweep tests).
  const ssrf = fs.readFileSync(path.join(FUNCTIONS, '_ssrf.ts'), 'utf8');
  expect(ssrf, 'SSRF guard still blocks private ranges').toContain('isPrivateIPv4');
  expect(ssrf, 'SSRF guard still covers cloud metadata').toContain('169');
  const mw = fs.readFileSync(path.join(FUNCTIONS, 'api', '_middleware.ts'), 'utf8');
  expect(mw, 'per-IP rate limiting still enforced').toContain('RATE_LIMIT');
  expect(mw, 'Turnstile challenge still referenced').toMatch(/turnstile/i);
  const sweep = fs.readFileSync(path.join(FUNCTIONS, '_sweep.ts'), 'utf8');
  expect(sweep, 'sweep still skips unverified watches').toContain('!w.verified');
  expect(sweep, 'sweep re-checks verification on fresh reads').toContain('!fresh.verified');
  const scan = fs.readFileSync(path.join(FUNCTIONS, 'api', 'scan.ts'), 'utf8');
  expect(scan, 'share:false still skips persistence').toContain('body.share !== false');
  expect(data, 'history key still carries the 1-year rolling TTL').toMatch(
    /h:\$\{domain\}.*WATCH_TTL/
  );
});

test('terms licensing matches LICENSE and pricing.md', () => {
  const license = fs.readFileSync(path.join(HERE, '..', '..', '..', 'LICENSE'), 'utf8');
  expect(license).toMatch(/MIT License/);
  expect(terms).toMatch(/MIT/);
  const pricing = fs.readFileSync(path.join(PUBLIC, 'pricing.md'), 'utf8');
  expect(pricing).toMatch(/free during validation/i);
  expect(terms).toMatch(/validation phase/);
});

test('terms carries the AS-IS warranty disclaimer and liability cap', () => {
  expect(terms).toMatch(/"AS IS"/);
  expect(terms).toMatch(/WITHOUT WARRANTY/);
  expect(terms).toMatch(/preceding 12 months/i);
});

test('both legal pages document the self-serve export/erasure endpoints', () => {
  // T-32: G-17 closes only if users can FIND the rights path.
  for (const [name, doc] of [
    ['privacy.md', privacy],
    ['terms.md', terms],
  ]) {
    expect(doc, `${name} documents export`).toContain('/api/me/export');
    expect(doc, `${name} documents erasure`).toContain('/api/me/erase');
  }
});

test('both legal pages name the GitHub contact channel', () => {
  for (const [name, doc] of [
    ['privacy.md', privacy],
    ['terms.md', terms],
  ]) {
    expect(doc, `${name} names the issues contact`).toMatch(
      /github\.com\/ravidsrk\/slop-detect\/issues/
    );
  }
});

test('every footer links both legal pages', () => {
  // Component footer (_ui.tsx links array, single-quoted) and the static
  // landing footer (index.html, double-quoted attributes).
  expect(ui).toContain("'/terms.md'");
  expect(landing).toContain('href="/terms.md"');
  expect(ui).toContain("'/privacy.md'");
  expect(landing).toContain('href="/privacy.md"');
});

test('privacy policy: sub-processor disclosure is complete', () => {
  // _brand.ts loads Google Fonts; _middleware.ts CSP allowlists it. An
  // earlier draft claimed "no external fonts" — that lie is pinned dead.
  expect(privacy).toMatch(/Google Fonts/);
  expect(privacy).not.toMatch(/no external fonts/i);
  expect(privacy).toMatch(/Cloudflare/);
  expect(privacy).toMatch(/Resend/);
});

test('privacy policy: retention table matches the TTL constants', () => {
  // _data.ts: RESULT_TTL = 90d, WATCH_TTL = 365d (rolling, refreshed on
  // every scan via putWatch in recordScanForWatch), VERIFY_TTL = 7d,
  // DASHBOARD_TOKEN_TTL = 15min; dashboard/link.ts sets a 30-day cookie.
  expect(privacy).toMatch(/90 days/);
  expect(privacy).toMatch(/score-history point lives up to 1 year/);
  expect(privacy).toMatch(/Anonymous aggregate statistics/);
  // recordScan dedupes via claimStatsContribution (STATS_CONTRIB_TTL = 1y):
  // aggregates count each domain once per year, not once per scan.
  expect(privacy).toMatch(/First stored scan per domain per year/);
  expect(terms).toMatch(/one contribution per domain per year/);
  expect(privacy).toMatch(/up to 1 year/);
  expect(privacy).toMatch(/7 days/);
  expect(privacy).toMatch(/15 minutes/);
  expect(privacy).toMatch(/30 days/);
  expect(data).toContain('60 * 60 * 24 * 90');
  expect(data).toContain('60 * 60 * 24 * 365');
});

test('privacy policy: no ungrounded infrastructure promises', () => {
  // KV placement is Cloudflare-global (no region pinning in wrangler.toml);
  // _email.ts defines no monthly pool; no edge-cache layer exists for
  // target responses (single in-memory load per scan).
  expect(privacy).not.toMatch(/EU and US regions/);
  expect(privacy).not.toMatch(/1,000-message/);
  expect(privacy).not.toMatch(/edge cache/i);
});

test('privacy policy version matches the consent stamp in code', () => {
  // watch.ts stamps policyVersion on every watch record; if the policy
  // revs without the code (or vice versa), consent records lie.
  const codeVersion = watch.match(/policyVersion:\s*'([^']+)'/)[1];
  expect(privacy).toContain(`Policy version: ${codeVersion}`);
});
