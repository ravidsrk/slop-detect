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
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function findNativeBinary(cwd) {
  const here = dirname(fileURLToPath(import.meta.url));
  const exe = process.platform === 'win32' ? 'slop-detect.exe' : 'slop-detect';
  const os =
    process.platform === 'darwin' ? 'darwin' : process.platform === 'linux' ? 'linux' : 'windows';
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  const asset = os === 'windows' ? `slop-detect-${os}-${arch}.exe` : `slop-detect-${os}-${arch}`;
  const cacheBase =
    process.env.XDG_CACHE_HOME ||
    (process.platform === 'win32'
      ? process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')
      : join(homedir(), '.cache'));
  const candidates = [
    process.env.SLOP_DETECT_BIN,
    join(cwd, 'target', 'release', exe),
    join(cacheBase, 'slop-detect', 'engine', '0.1.0', asset),
    join(here, '..', 'scripts', 'slop-detect'),
  ].filter(Boolean);
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

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

// Fast-path: if a native Rust binary is cached/installed locally, run sub-15ms
// static checks on PostToolUse edits before falling through to live URL scans.
const eventName = String((input && (input.hook_event_name || input.event)) || '');
if (eventName === 'PostToolUse' && raw.trim()) {
  const nativeBin = findNativeBinary(cwd);
  if (nativeBin && !nativeBin.endsWith('scripts/slop-detect')) {
    const fast = spawnSync(nativeBin, ['hook'], {
      cwd,
      input: raw,
      encoding: 'utf8',
      timeout: 3000,
    });
    if (!fast.error && fast.stdout && fast.stdout.trim()) {
      process.stdout.write(fast.stdout);
    }
  }
}

if (!process.env.SLOP_LOCAL_URL && !existsSync(join(cwd, '.slop', 'local-url'))) process.exit(0);

// Skip spawning npx completely for non-UI PostToolUse edits.
if (eventName === 'PostToolUse') {
  const toolInput = (input && input.tool_input) || {};
  const filePath = String(toolInput.file_path || toolInput.path || '');
  if (filePath) {
    const base = filePath.split(/[\\/]/).pop().toLowerCase();
    const uiExt = new Set([
      '.html',
      '.htm',
      '.css',
      '.scss',
      '.sass',
      '.less',
      '.pcss',
      '.styl',
      '.jsx',
      '.tsx',
      '.vue',
      '.svelte',
      '.astro',
      '.mdx',
      '.liquid',
      '.njk',
      '.hbs',
      '.ejs',
      '.erb',
      '.twig',
    ]);
    const isDesignFile =
      base === 'design.md' || base === 'tokens.json' || base.startsWith('tailwind.config');
    const dot = base.lastIndexOf('.');
    if (!isDesignFile && !(dot >= 0 && uiExt.has(base.slice(dot)))) {
      process.exit(0);
    }
  }
}

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
