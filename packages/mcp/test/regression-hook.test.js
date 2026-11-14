// scan-regression.mjs (bin: slop-detect-hook) exit semantics (#359). As a hook
// it reports regressions to the agent (exit 2 + stderr) and never blocks on a
// condition the agent can't fix. From a terminal it keeps CLI exit codes. A stub
// scanner stands in for Playwright so these run without a browser.

import { test, expect, beforeEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOK = fileURLToPath(new URL('../hooks/scan-regression.mjs', import.meta.url));

let dir;
let stub;
let marker;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'slop-hook-'));
  stub = join(dir, 'stub-scanner.mjs');
  marker = join(dir, 'scanned');
  writeFileSync(
    stub,
    `import { readFileSync, writeFileSync } from 'node:fs';
writeFileSync(${JSON.stringify(marker)}, '1');
if (process.env.STUB_FAIL) { process.stderr.write('Scan could not run. This is not a Clean score. page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3999/\\nCall log:\\n  - navigating\\n'); process.exit(2); }
process.stdout.write(readFileSync(process.env.STUB_RESULT, 'utf8'));
`
  );
});

function scan(score, ids) {
  const path = join(dir, `scan-${score}-${ids.join('-') || 'none'}.json`);
  writeFileSync(
    path,
    JSON.stringify({
      schemaVersion: 1,
      definitionsVersion: '2026.11',
      url: 'http://127.0.0.1:3000/',
      score,
      tier: score >= 28 ? 'Heavy' : score >= 10 ? 'Mild' : 'Clean',
      patterns: ids.map((id) => ({ id, status: 'fail', triggered: true, weight: 4 })),
    })
  );
  return path;
}

function run({ input, args = [], env = {} } = {}) {
  const base = { ...process.env, SLOP_HOOK_SCANNER: stub, ...env };
  delete base.SLOP_LOCAL_URL;
  if (env.SLOP_LOCAL_URL) base.SLOP_LOCAL_URL = env.SLOP_LOCAL_URL;
  return spawnSync(process.execPath, [HOOK, ...args], {
    encoding: 'utf8',
    cwd: dir,
    env: base,
    input: input === undefined ? '' : JSON.stringify({ cwd: dir, ...input }),
  });
}

const URL_ENV = { SLOP_LOCAL_URL: 'http://127.0.0.1:3000/' };

test('from a terminal with no URL: exit 2, says it could not run, claims no score', () => {
  const r = run();
  expect(r.status).toBe(2);
  expect(r.stderr).toMatch(/not a Clean score/);
  expect(r.stdout).toBe('');
});

test('as a hook with no URL configured: exit 0 and silent', () => {
  for (const event of ['PostToolUse', 'Stop']) {
    const r = run({ input: { hook_event_name: event } });
    expect(r.status, event).toBe(0);
    expect(r.stdout, event).toBe('');
    expect(r.stderr, event).toBe('');
  }
  expect(existsSync(marker)).toBe(false);
});

test('as a hook, a scan that cannot run never blocks; Stop tells the user', () => {
  const env = { ...URL_ENV, STUB_FAIL: '1' };
  const post = run({ input: { hook_event_name: 'PostToolUse' }, env });
  expect(post.status).toBe(0);
  expect(post.stderr).toBe('');
  const stop = run({ input: { hook_event_name: 'Stop', stop_hook_active: false }, env });
  expect(stop.status).toBe(0);
  const out = JSON.parse(stop.stdout);
  expect(out.systemMessage).toMatch(/connection refused|ERR_CONNECTION_REFUSED/i);
  expect(out.systemMessage).toMatch(/not a Clean score/);
  expect(out.systemMessage).not.toMatch(/Call log/);
  expect(out.decision).toBeUndefined();
});

test('a regression reaches the agent: exit 2 with the message on stderr', () => {
  const baseline = run({
    input: { hook_event_name: 'PostToolUse' },
    env: { ...URL_ENV, STUB_RESULT: scan(0, []) },
  });
  expect(baseline.status).toBe(0);
  expect(existsSync(join(dir, '.slop', 'session-baseline.json'))).toBe(true);

  const worse = scan(9, ['gradient_backgrounds', 'aurora_mesh_gradient']);
  for (const event of ['PostToolUse', 'Stop']) {
    const r = run({
      input: {
        hook_event_name: event,
        stop_hook_active: false,
        tool_input: { file_path: 'src/app/page.tsx' },
      },
      env: { ...URL_ENV, STUB_RESULT: worse },
    });
    expect(r.status, event).toBe(2);
    expect(r.stderr, event).toMatch(/Score 0 → 9/);
    expect(r.stderr, event).toMatch(/New patterns: gradient_backgrounds, aurora_mesh_gradient/);
  }

  // Stop already continued once: report to the user instead of looping.
  const again = run({
    input: { hook_event_name: 'Stop', stop_hook_active: true },
    env: { ...URL_ENV, STUB_RESULT: worse },
  });
  expect(again.status).toBe(0);
  expect(JSON.parse(again.stdout).systemMessage).toMatch(/Score 0 → 9/);

  // From a terminal the CLI contract stays: exit 1, text on stdout.
  const manual = run({ env: { ...URL_ENV, STUB_RESULT: worse } });
  expect(manual.status).toBe(1);
  expect(manual.stdout).toMatch(/Score 0 → 9/);
});

test('an unchanged page stays silent', () => {
  const clean = scan(0, []);
  run({ input: { hook_event_name: 'Stop' }, env: { ...URL_ENV, STUB_RESULT: clean } });
  const r = run({ input: { hook_event_name: 'Stop' }, env: { ...URL_ENV, STUB_RESULT: clean } });
  expect(r.status).toBe(0);
  expect(r.stdout).toBe('');
  expect(r.stderr).toBe('');
});

test('PostToolUse on a non-UI file does not scan', () => {
  const r = run({
    input: { hook_event_name: 'PostToolUse', tool_input: { file_path: 'server/db/migrate.py' } },
    env: { ...URL_ENV, STUB_RESULT: scan(0, []) },
  });
  expect(r.status).toBe(0);
  expect(existsSync(marker)).toBe(false);
});

test('the URL can come from .slop/local-url', () => {
  const r0 = spawnSync('mkdir', ['-p', join(dir, '.slop')]);
  expect(r0.status).toBe(0);
  writeFileSync(join(dir, '.slop', 'local-url'), 'http://127.0.0.1:4321/\n');
  const r = run({ input: { hook_event_name: 'Stop' }, env: { STUB_RESULT: scan(0, []) } });
  expect(r.status).toBe(0);
  expect(existsSync(marker)).toBe(true);
});
