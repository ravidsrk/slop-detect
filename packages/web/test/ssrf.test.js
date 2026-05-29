// SSRF guard tests for validateScanUrl (functions/_shared.js).
// The scan endpoint loads arbitrary URLs in a headless browser and returns
// page content — these tests lock in that private/loopback/metadata hosts and
// non-http(s) schemes are rejected, while legitimate public URLs pass.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateScanUrl } from '../functions/_shared.js';

const BLOCKED = [
  'http://169.254.169.254/latest/meta-data/', // AWS/GCP metadata
  'http://127.0.0.1',
  'http://127.1',                              // (parsed as hostname, not blocked by IP rule but harmless)
  'http://localhost',
  'https://localhost:3000',
  'app.localhost',
  'http://foo.internal',
  'http://db.local',
  'http://[::1]/',
  'http://10.0.0.5',
  'http://192.168.1.1',
  'http://172.16.0.1',
  'http://172.31.255.255',
  'http://0.0.0.0',
  'http://100.64.1.1',                         // CGNAT
  'http://[fc00::1]',                          // unique-local
  'http://[fe80::1]',                          // link-local
  'http://::ffff:127.0.0.1',                   // IPv4-mapped loopback
  'file:///etc/passwd',
  'data:text/html,<script>',
  'ftp://example.com'
];

const ALLOWED = [
  ['https://stripe.com', 'https://stripe.com'],
  ['example.com', 'https://example.com'],          // scheme prepended
  ['http://93.184.216.34', 'http://93.184.216.34'],
  ['https://sub.example.co.uk/path?q=1', 'https://sub.example.co.uk/path?q=1'],
  ['http://172.32.0.1', 'http://172.32.0.1'],      // just outside 172.16/12
  ['http://11.0.0.1', 'http://11.0.0.1'],          // public, adjacent to 10/8
  ['http://8.8.8.8', 'http://8.8.8.8']
];

test('SSRF guard blocks private/loopback/metadata/non-http hosts', () => {
  for (const u of BLOCKED) {
    const r = validateScanUrl(u);
    assert.ok(r.error, `expected ${u} to be rejected, got ${r.url}`);
    assert.equal(r.status, 400);
  }
});

test('SSRF guard allows legitimate public URLs (and normalizes scheme)', () => {
  for (const [input, expected] of ALLOWED) {
    const r = validateScanUrl(input);
    assert.ok(!r.error, `expected ${input} to be allowed, got error: ${r.error}`);
    assert.equal(r.url, expected);
  }
});

test('SSRF guard rejects empty / non-string input', () => {
  for (const bad of [undefined, null, '', '   ', 42, {}]) {
    const r = validateScanUrl(bad);
    assert.ok(r.error);
    assert.equal(r.status, 400);
  }
});
