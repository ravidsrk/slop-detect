#!/usr/bin/env node
// Plugin hook launcher. Claude Code copies a marketplace plugin into its cache
// on its own, so this file can't reach scripts elsewhere in the repository
// (#359). It does the cheap check itself, so the plugin costs nothing until you
// opt in by setting SLOP_LOCAL_URL or writing .slop/local-url in the project.
// Then it runs the hook from the published packages and relays its result:
//   npx -y -p slop-detect -p slop-detect-mcp slop-detect-hook
// Exit 2 (a regression Claude should fix) is passed through; anything else,
// including a missing npx, exits 0 so the plugin never blocks on setup issues.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

function readStdin(idleMs = 300, maxMs = 3000) {
  if (process.stdin.isTTY) return Promise.resolve('');
  return new Promise((resolve) => {
    let data = '';
    let settled = false;
    let timer = setTimeout(finish, idleMs);
    const hardStop = setTimeout(finish, maxMs);
    function finish() {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(hardStop);
      process.stdin.pause();
      resolve(data);
    }
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
      clearTimeout(timer);
      timer = setTimeout(finish, maxMs);
    });
    process.stdin.on('end', finish);
    process.stdin.on('error', finish);
  });
}

const raw = await readStdin();
let input = null;
try {
  input = raw.trim() ? JSON.parse(raw) : null;
} catch {
  input = null;
}
const cwd =
  (input && typeof input.cwd === 'string' && input.cwd) ||
  process.env.CLAUDE_PROJECT_DIR ||
  process.cwd();
if (!process.env.SLOP_LOCAL_URL && !existsSync(join(cwd, '.slop', 'local-url'))) process.exit(0);

const child = spawnSync(
  'npx',
  ['-y', '-p', 'slop-detect', '-p', 'slop-detect-mcp', 'slop-detect-hook'],
  {
    cwd,
    input: raw,
    encoding: 'utf8',
    env: process.env,
    shell: process.platform === 'win32',
    maxBuffer: 16 * 1024 * 1024,
  }
);
if (child.error) process.exit(0);
if (child.stdout) process.stdout.write(child.stdout);
if (child.stderr) process.stderr.write(child.stderr);
process.exit(child.status === 2 ? 2 : 0);
