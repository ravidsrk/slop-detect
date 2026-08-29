// CLI behavior tests — exercise the bin via subprocess so we cover real arg
// parsing + exit codes without launching a browser. We only test paths that
// short-circuit before scanUrl() (validation, help), so these stay fast and
// hermetic (no network, no Chromium).

import { test, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The CLI is built to dist/; spawn the built binary (this test is an integration
// check of the shipped artifact, run under plain node). `pretest` builds first.
const BIN = fileURLToPath(new URL('../dist/bin/slop.js', import.meta.url));

function run(args) {
  return spawnSync('node', [BIN, ...args], { encoding: 'utf8' });
}

test('--help exits 0 and lists the dynamic pattern catalogue', () => {
  const r = run(['--help']);
  expect(r.status).toBe(0);
  expect(r.stdout).toMatch(/AI-design-slop patterns \(defs/);
  expect(r.stdout).toMatch(/--fail-on <tier>/);
  expect(r.stdout).toMatch(/--timeout <ms>/);
  // The list is generated from PATTERNS — it must contain a known short name.
  expect(r.stdout).toMatch(/Slop fonts/);
});

test('invalid --fail-on value exits 2 with a clear message', () => {
  const r = run(['https://example.com', '--fail-on', 'bogus']);
  expect(r.status).toBe(2);
  expect(r.stderr).toMatch(/Invalid --fail-on value/);
});

test('non-http(s) scheme is rejected before any scan (exit 2)', () => {
  for (const u of ['ftp://example.com', 'file:///etc/passwd', 'data:text/html,x']) {
    const r = run([u]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/Only http\(s\) URLs can be scanned/);
  }
});

// Exit-code contract: 0 = ok, 1 = scan ran but failed the --fail-on gate (the CI
// signal), 2 = usage/argument error. Usage errors must NOT collide with the gate.
test('no args prints help and exits 2 (usage error)', () => {
  const r = run([]);
  expect(r.status).toBe(2);
  expect(r.stdout).toMatch(/Usage:/);
});

test('unknown flag exits 2 (usage error)', () => {
  const r = run(['https://example.com', '--nope']);
  expect(r.status).toBe(2);
  expect(r.stderr).toMatch(/Unknown flag/);
});

test('--timeout without a value exits 2 (usage error)', () => {
  const r = run(['https://example.com', '--timeout']);
  expect(r.status).toBe(2);
  expect(r.stderr).toMatch(/--timeout needs a positive integer/);
});

test('invalid --timeout value exits 2 (usage error)', () => {
  for (const val of ['0', '-1', 'bogus', '30000.5']) {
    const r = run(['https://example.com', '--timeout', val]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/--timeout needs a positive integer/);
  }
});
