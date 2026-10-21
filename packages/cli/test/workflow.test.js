import { test, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { PRESETS } from '@slop-detect/core';
import { writeBaseline } from '../src/offline.ts';
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

function savedScan(score, ids, version = '2026.11') {
  return {
    url: 'https://example.com',
    score,
    tier: score >= 28 ? 'Heavy' : score >= 10 ? 'Mild' : 'Clean',
    definitionsVersion: version,
    patterns: ids.map((id) => ({ id, triggered: true, evidence: { samples: [id] } })),
    environment: { viewport: { width: 1280, height: 800 } },
  };
}

test('--runs and --aggregate reject bad values before a fetch', () => {
  const runs = run(['https://example.com', '--runs', '0']);
  expect(runs.status).toBe(2);
  expect(runs.stderr).toMatch(/1 to 5/);
  const aggregate = run(['https://example.com', '--aggregate', 'mean']);
  expect(aggregate.status).toBe(2);
  expect(aggregate.stderr).toMatch(/median or pessimistic/);
});

test('--compare-to stays offline and refuses a definitions mismatch', () => {
  const dir = mkdtempSync(join(tmpdir(), 'slop-compare-'));
  const before = join(dir, 'before.json');
  const after = join(dir, 'after.json');
  writeFileSync(before, JSON.stringify(savedScan(4, ['slop_fonts'], '2026.10')));
  writeFileSync(after, JSON.stringify(savedScan(10, ['slop_fonts'])));
  const mismatch = run(['--compare-to', before, after]);
  expect(mismatch.status).toBe(2);
  expect(mismatch.stderr).toMatch(/not a score delta/);
  expect(mismatch.stdout).toBe('');

  writeFileSync(before, JSON.stringify(savedScan(4, ['slop_fonts'])));
  writeFileSync(after, JSON.stringify(savedScan(10, ['slop_fonts', 'purple_accent'])));
  const regression = run(['--compare-to', before, after, '--fail-on-regression']);
  expect(regression.status).toBe(1);
  expect(regression.stdout).toMatch(/Score 4 → 10/);
  expect(regression.stdout).toMatch(/purple_accent/);

  writeFileSync(after, JSON.stringify(savedScan(4, ['slop_fonts'])));
  const same = run(['--compare-to', before, after, '--fail-on-regression']);
  expect(same.status).toBe(0);
  expect(same.stdout).toMatch(/\+0/);

  const withUrl = run(['--compare-to', before, after, 'https://example.com']);
  expect(withUrl.status).toBe(2);
  expect(withUrl.stderr).toMatch(/does not take URLs/);
});

test('writeBaseline refuses an unscored page and writes a scored one', () => {
  const dir = mkdtempSync(join(tmpdir(), 'slop-baseline-'));
  expect(() => writeBaseline(join(dir, 'nope.json'), { error: 'down' })).toThrow(
    /not a Clean score/
  );
  const dest = join(dir, 'nested', 'base.json');
  writeBaseline(dest, savedScan(4, ['slop_fonts']));
  expect(JSON.parse(readFileSync(dest, 'utf8')).score).toBe(4);
});

test('the CLI readme names every preset id', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  for (const id of Object.keys(PRESETS)) expect(readme).toContain(id);
});
