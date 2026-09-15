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
  // _data.ts RESULT_TTL = 90 days; watch.ts reconciles list:true rows only.
  expect(terms).toMatch(/90 days/);
  expect(terms).toMatch(/list:\s*true/);
  expect(terms).toMatch(/never full page/i);
  // _email.ts has no delivery guarantee; the terms must not promise one.
  expect(terms).toMatch(/don't\s+guarantee every alert arrives/);
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
