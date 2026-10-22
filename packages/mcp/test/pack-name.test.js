import { test, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('prepack publishes slop-detect-core and postpack restores the workspace dependency', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const dir = mkdtempSync(join(tmpdir(), 'mcp-pack-'));
  const path = join(dir, 'package.json');
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);

  const run = (script) => {
    const source = script.replace(/^node -e /, '');
    const code = source.startsWith("'") ? source.slice(1, -1) : source;
    execFileSync(process.execPath, ['-e', code], { cwd: dir });
  };

  run(pkg.scripts.prepack);
  const packed = JSON.parse(readFileSync(path, 'utf8'));
  expect(packed.dependencies['slop-detect-core']).toBe(pkg.version);
  expect(packed.dependencies['@slop-detect/core']).toBeUndefined();

  run(pkg.scripts.postpack);
  const restored = JSON.parse(readFileSync(path, 'utf8'));
  expect(restored.dependencies['@slop-detect/core']).toBe('workspace:*');
  expect(restored.dependencies['slop-detect-core']).toBeUndefined();
});
