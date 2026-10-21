import { test, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOK = fileURLToPath(new URL('../hooks/scan-regression.mjs', import.meta.url));

test('a regression hook with no URL exits 2 and does not claim a score', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'slop-hook-'));
  const r = spawnSync(process.execPath, [HOOK], { encoding: 'utf8', cwd });
  expect(r.status).toBe(2);
  expect(r.stderr).toMatch(/not a Clean score/);
  expect(r.stdout).toBe('');
});
