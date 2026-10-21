// CLI behavior tests — exercise the bin via subprocess so we cover real arg
// parsing + exit codes without launching a browser. We only test paths that
// short-circuit before scanUrl() (validation, help), so these stay fast and
// hermetic (no network, no Chromium).

import { test, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

test('valid --timeout is accepted at parse time (no URL still exits 2)', () => {
  const r = run(['--timeout', '30000']);
  expect(r.status).toBe(2);
  expect(r.stderr).not.toMatch(/Unknown flag/);
  expect(r.stderr).not.toMatch(/--timeout needs a positive integer/);
  expect(r.stdout).toMatch(/Usage:/);
});

test('--timeout with --remote exits 2 before any scan', () => {
  const r = run(['https://example.com', '--remote', '--timeout', '5000']);
  expect(r.status).toBe(2);
  expect(r.stderr).toMatch(/--timeout applies to local Playwright navigation only/);
});

test('--version and -V exit 0 and print version + definitions version', () => {
  for (const flag of ['--version', '-V']) {
    const r = run([flag]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/^slop-detect 0\.8\.0 \(defs 2026\.\d+\)/);
  }
});

test('invalid --fail-under value exits 2 with a clear message', () => {
  for (const bad of ['Z', '150', '-5', 'bogus']) {
    const r = run(['https://example.com', '--fail-under', bad]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/Invalid --fail-under value/);
  }
});

test('valid --fail-under (grade or score) is accepted at parse time', () => {
  for (const ok of ['B', 'A+', '15', '0']) {
    const r = run(['--fail-under', ok]);
    expect(r.status).toBe(2); // no URL -> prints help
    expect(r.stderr).not.toMatch(/Invalid --fail-under/);
    expect(r.stdout).toMatch(/Usage:/);
  }
});

test('--design-md with local file path and --remote exits 2 before any scan', () => {
  const r = run(['https://example.com', '--remote', '--design-md', './DESIGN.md']);
  expect(r.status).toBe(2);
  expect(r.stderr).toMatch(/--design-md with --remote requires "auto" or an http\(s\) URL/);
});

test('--init-design-md with --remote exits 2 before any scan', () => {
  const r = run(['https://example.com', '--remote', '--init-design-md']);
  expect(r.status).toBe(2);
  expect(r.stderr).toMatch(/--init-design-md requires local DOM token extraction/);
});

test('--init-tokens with --remote exits 2 before any scan', () => {
  const r = run(['https://example.com', '--remote', '--init-tokens']);
  expect(r.status).toBe(2);
  expect(r.stderr).toMatch(/--init-tokens requires local DOM token extraction/);
});

test('--init-design-md together with --init-tokens exits 2', () => {
  const r = run(['https://example.com', '--init-design-md', '--init-tokens']);
  expect(r.status).toBe(2);
  expect(r.stderr).toMatch(/Pass only one/);
});

test('--a11y with --remote exits 2 before any scan', () => {
  const r = run(['https://example.com', '--remote', '--a11y']);
  expect(r.status).toBe(2);
  expect(r.stderr).toMatch(/--a11y runs axe-core in the local browser/);
});

test('--a11y without axe-core installed exits 2 before a scan', () => {
  const r = run(['https://example.com', '--a11y']);
  expect(r.status).toBe(2);
  expect(r.stderr).toMatch(/axe-core is optional and off by default/);
});

test('--lint-design-md reports a broken ref and exits 1', () => {
  const dir = mkdtempSync(join(tmpdir(), 'slop-lint-'));
  const file = join(dir, 'DESIGN.md');
  writeFileSync(
    file,
    `---
name: Broken
colors:
  bg: "#ffffff"
components:
  btn:
    backgroundColor: "{colors.missing}"
---
`
  );
  const r = run(['--lint-design-md', file]);
  expect(r.status).toBe(1);
  expect(r.stdout).toMatch(/invalid/);
  expect(r.stdout).toMatch(/broken-ref/);
  const json = run(['--json', '--lint-design-md', file]);
  expect(json.status).toBe(1);
  expect(JSON.parse(json.stdout).valid).toBe(false);
});

test('--lint-design-md accepts a warning-only file and rejects a URL', () => {
  const dir = mkdtempSync(join(tmpdir(), 'slop-lint-ok-'));
  const file = join(dir, 'DESIGN.md');
  writeFileSync(
    file,
    `---
name: Ok
specVersion: "beta"
colors:
  ink: "#111111"
typography:
  body:
    fontFamily: "Newsreader"
---
`
  );
  const r = run(['--lint-design-md', file]);
  expect(r.status).toBe(0);
  expect(r.stdout).toMatch(/valid/);
  expect(r.stdout).toMatch(/spec-version-mismatch/);
  const withUrl = run(['https://example.com', '--lint-design-md', file]);
  expect(withUrl.status).toBe(2);
  expect(withUrl.stderr).toMatch(/do not take a URL/);
});

test('--diff-design-md exits 1 on a token change and 0 when the files match', () => {
  const dir = mkdtempSync(join(tmpdir(), 'slop-diff-'));
  const base = join(dir, 'base.md');
  const head = join(dir, 'head.md');
  const same = `---
name: Brand
colors:
  ink: "#111111"
---
`;
  writeFileSync(base, same);
  writeFileSync(head, same);
  const match = run(['--diff-design-md', base, head]);
  expect(match.status).toBe(0);
  expect(match.stdout).toMatch(/compatible/);
  writeFileSync(head, same.replace('#111111', '#222222'));
  const changed = run(['--diff-design-md', base, head]);
  expect(changed.status).toBe(1);
  expect(changed.stdout).toMatch(/breaking/);
  expect(changed.stdout).toMatch(/changed colors.ink/);
});
