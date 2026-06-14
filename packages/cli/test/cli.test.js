// CLI behavior tests — exercise the bin via subprocess so we cover real arg
// parsing + exit codes without launching a browser. We only test paths that
// short-circuit before scanUrl() (validation, help), so these stay fast and
// hermetic (no network, no Chromium).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The CLI is TypeScript compiled to dist/; spawn the built binary (this test is
// an integration check of the shipped artifact, run under plain node). `npm test`
// builds first via pretest.
const BIN = fileURLToPath(new URL('../dist/bin/slop.js', import.meta.url));

function run(args) {
  return spawnSync('node', [BIN, ...args], { encoding: 'utf8' });
}

test('--help exits 0 and lists the dynamic pattern catalogue', () => {
  const r = run(['--help']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /AI-design-slop patterns \(defs/);
  assert.match(r.stdout, /--fail-on <tier>/);
  // The list is generated from PATTERNS — it must contain a known short name.
  assert.match(r.stdout, /Slop fonts/);
});

test('invalid --fail-on value exits 2 with a clear message', () => {
  const r = run(['https://example.com', '--fail-on', 'bogus']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Invalid --fail-on value/);
});

test('non-http(s) scheme is rejected before any scan (exit 2)', () => {
  for (const u of ['ftp://example.com', 'file:///etc/passwd', 'data:text/html,x']) {
    const r = run([u]);
    assert.equal(r.status, 2, `expected exit 2 for ${u}`);
    assert.match(r.stderr, /Only http\(s\) URLs can be scanned/);
  }
});

// Exit-code contract: 0 = ok, 1 = scan ran but failed the --fail-on gate (the CI
// signal), 2 = usage/argument error. Usage errors must NOT collide with the gate.
test('no args prints help and exits 2 (usage error)', () => {
  const r = run([]);
  assert.equal(r.status, 2);
  assert.match(r.stdout, /Usage:/);
});

test('unknown flag exits 2 (usage error)', () => {
  const r = run(['https://example.com', '--nope']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Unknown flag/);
});
