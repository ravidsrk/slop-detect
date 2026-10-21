import { test, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = fileURLToPath(new URL('../dist/bin/slop.js', import.meta.url));

function run(args) {
  return spawnSync('node', [BIN, ...args], { encoding: 'utf8' });
}

test('--site rejects a sample size outside 1 to 15 before any fetch', () => {
  const r = run(['https://example.com', '--site', '0']);
  expect(r.status).toBe(2);
  expect(r.stderr).toMatch(/1 to 15/);
});

test('--copy-dir on a missing directory exits 2', () => {
  const r = run(['--copy-dir', join(tmpdir(), 'slop-missing-dir')]);
  expect(r.status).toBe(2);
  expect(r.stderr).toMatch(/not a Clean score/);
});

test('--copy-dir scores local HTML without rendering', () => {
  const dir = mkdtempSync(join(tmpdir(), 'slop-copy-'));
  writeFileSync(join(dir, 'a.html'), '<html lang="en"><p>Short page.</p></html>');
  writeFileSync(join(dir, 'b.html'), '<html lang="en"><p>Another short page.</p></html>');
  const r = run(['--copy-dir', dir]);
  expect(r.status).toBe(0);
  expect(r.stdout).toMatch(/insufficient_pages/);
  expect(r.stdout).toMatch(/unmeasured/);
  expect(r.stdout).toMatch(/Rendered: false/);
  expect(r.stdout).not.toMatch(/Site copy: 0\/100 Clean/);
});

test('--brief names patterns from a saved scan and --diff-scan lists the change', () => {
  const dir = mkdtempSync(join(tmpdir(), 'slop-brief-'));
  const before = join(dir, 'before.json');
  const after = join(dir, 'after.json');
  writeFileSync(
    before,
    JSON.stringify({
      url: 'https://example.com',
      score: 40,
      tier: 'Heavy',
      patterns: [
        { id: 'numbered_steps', triggered: true, evidence: { samples: ['SEC 0.1'] } },
        { id: 'purple_accent', triggered: true, evidence: { samples: ['#6366f1'] } },
      ],
    })
  );
  writeFileSync(
    after,
    JSON.stringify({
      url: 'https://example.com',
      score: 12,
      tier: 'Mild',
      patterns: [{ id: 'purple_accent', triggered: true, evidence: { samples: ['#6366f1'] } }],
      kitMatches: [{ id: 'claude-opus-5.5-default', matched: true }],
    })
  );
  const brief = run(['--brief', before]);
  expect(brief.status).toBe(0);
  expect(brief.stdout).toMatch(/numbered_steps/);
  expect(brief.stdout).toMatch(/purple_accent/);
  expect(brief.stdout).toMatch(/SEC 0\.1/);
  const words = brief.stdout.trim().split(/\s+/).filter(Boolean);
  expect(words.length).toBeLessThanOrEqual(120);

  const diff = run(['--diff-scan', before, after]);
  expect(diff.status).toBe(0);
  expect(diff.stdout).toMatch(/numbered_steps/);
  expect(diff.stdout).toMatch(/claude-opus-5\.5-default/);
});

test('--format agent, github, and junit read a saved scan', () => {
  const dir = mkdtempSync(join(tmpdir(), 'slop-format-'));
  const file = join(dir, 'scan.json');
  writeFileSync(
    file,
    JSON.stringify({
      url: 'https://example.com/',
      score: 42,
      tier: 'Heavy',
      patterns: [
        {
          id: 'purple_accent',
          label: 'Purple accent',
          weight: 8,
          status: 'fail',
          triggered: true,
          evidence: { selector: '.cta', samples: ['#6366f1'] },
        },
      ],
    })
  );
  const agent = run(['--format', 'agent', file]);
  expect(agent.status).toBe(0);
  expect(agent.stdout.trim()).toMatch(/^purple_accent \.cta: #6366f1 → /);
  const github = run(['--format', 'github', file]);
  expect(github.stdout).toMatch(/::error title=purple_accent::/);
  const junit = run(['--format', 'junit', file]);
  expect(junit.stdout).toMatch(/<testsuite /);
  expect(junit.stdout).toMatch(/<failure /);
  const bad = run(['--format', 'nope', file]);
  expect(bad.status).toBe(2);
});

test('--emit-aeo-fixes writes the four starter files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'slop-aeo-'));
  const r = run([
    '--emit-aeo-fixes',
    dir,
    '--origin',
    'https://example.com',
    '--site-name',
    'Example',
  ]);
  expect(r.status).toBe(0);
  const robots = readFileSync(join(dir, 'robots.txt'), 'utf8');
  const llms = readFileSync(join(dir, 'llms.txt'), 'utf8');
  expect(robots).toMatch(/User-agent: GPTBot/);
  expect(robots.match(/^Allow:.*$/gm)).toEqual(['Allow: /']);
  expect(llms.startsWith('# Example')).toBe(true);
  expect(existsSync(join(dir, 'ard.json'))).toBe(true);
  expect(existsSync(join(dir, 'link-headers.txt'))).toBe(true);
});

test('init is idempotent, refuses a home-directory scope, and honors --no-hooks', () => {
  const dir = mkdtempSync(join(tmpdir(), 'slop-init-'));
  const first = run(['init', '--dir', dir, '--providers', 'claude,cursor', '--ci', 'github']);
  expect(first.status).toBe(0);
  expect(existsSync(join(dir, '.mcp.json'))).toBe(true);
  expect(existsSync(join(dir, '.claude/settings.local.json'))).toBe(true);
  expect(existsSync(join(dir, '.cursor/hooks.json'))).toBe(true);
  expect(existsSync(join(dir, '.github/workflows/slop-detect.yml'))).toBe(true);
  expect(existsSync(join(dir, '.codex/hooks.json'))).toBe(false);
  const settings = readFileSync(join(dir, '.claude/settings.local.json'), 'utf8');
  expect(settings).toMatch(/scan-regression\.mjs/);
  expect(settings.match(/scan-regression\.mjs/g)).toHaveLength(2);

  const second = run(['init', '--dir', dir, '--providers', 'claude,cursor', '--ci', 'github']);
  expect(second.status).toBe(0);
  expect(second.stdout).toMatch(/wrote 0 file/);
  const again = readFileSync(join(dir, '.claude/settings.local.json'), 'utf8');
  expect(again.match(/scan-regression\.mjs/g)).toHaveLength(2);

  const quiet = mkdtempSync(join(tmpdir(), 'slop-init-quiet-'));
  const noHooks = run(['init', '--dir', quiet, '--no-hooks']);
  expect(noHooks.status).toBe(0);
  expect(existsSync(join(quiet, '.mcp.json'))).toBe(true);
  expect(existsSync(join(quiet, '.claude/settings.local.json'))).toBe(false);
  expect(existsSync(join(quiet, '.cursor/hooks.json'))).toBe(false);

  const globalScope = run(['init', '--dir', dir, '--scope', 'global']);
  expect(globalScope.status).toBe(2);
  expect(globalScope.stderr).toMatch(/project directory only/);
});
