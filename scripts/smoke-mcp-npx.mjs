#!/usr/bin/env node
// Acceptance smoke for #357: the exact npx command in plugins/slop-detect/.mcp.json
// (and the slop-detect-hook command `slop-detect init` writes) must scan a page
// with nothing else installed. Packs core, CLI and MCP like publish.yml, swaps
// each `-p <name>` for the matching tarball (core is added because the packed
// MCP server depends on a version that may not be on npm yet), runs the command
// in an empty directory, and drives it over stdio.
//
//   node scripts/smoke-mcp-npx.mjs [tarball-dir]
//
// Needs network for third-party dependencies and an installed Chromium.

import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixture = `file://${join(root, 'packages/cli/test/fixtures/pat-bento_grid.html')}`;

function packAll() {
  const dir = mkdtempSync(join(tmpdir(), 'slop-tarballs-'));
  for (const pkg of ['core', 'cli', 'mcp']) {
    const pkgDir = join(root, 'packages', pkg);
    execFileSync('bun', ['pm', 'pack'], { cwd: pkgDir, stdio: 'inherit' });
    const tarball = readdirSync(pkgDir).find((f) => f.endsWith('.tgz'));
    if (!tarball) throw new Error(`bun pm pack produced no tarball in ${pkgDir}`);
    renameSync(join(pkgDir, tarball), join(dir, tarball));
  }
  return dir;
}

const tarballDir = process.argv[2] ? resolve(process.argv[2]) : packAll();
const tarballs = readdirSync(tarballDir).filter((f) => f.endsWith('.tgz'));
function tarballFor(name) {
  const match = tarballs.find((f) => new RegExp(`^${name}-\\d`).test(f));
  if (!match) throw new Error(`no tarball for ${name} in ${tarballDir}`);
  return join(tarballDir, match);
}

// `-p slop-detect -p slop-detect-mcp <bin> ...` → tarball paths, plus core.
function localArgs(args) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-p') {
      out.push('-p', tarballFor(args[++i]));
    } else {
      out.push(args[i]);
    }
  }
  const bin = out.findIndex((a, i) => i > 0 && out[i - 1] !== '-p' && a !== '-y' && a !== '-p');
  out.splice(bin, 0, '-p', tarballFor('slop-detect-core'));
  return out;
}

const fail = (message) => {
  console.error(`FAIL ${message}`);
  process.exit(1);
};

// 1. The plugin's MCP server command.
const plugin = JSON.parse(readFileSync(join(root, 'plugins/slop-detect/.mcp.json'), 'utf8'));
const server = plugin.mcpServers['slop-detect'];
if (server.command !== 'npx') fail(`plugin MCP command is ${server.command}, expected npx`);
const serverArgs = localArgs(server.args);
const cwd = mkdtempSync(join(tmpdir(), 'slop-npx-'));
console.log(`npx ${serverArgs.join(' ')}`);

const child = spawn('npx', serverArgs, { cwd, stdio: ['pipe', 'pipe', 'inherit'] });
let buffer = '';
const replies = new Map();
child.stdout.on('data', (chunk) => {
  buffer += chunk;
  let i;
  while ((i = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, i).trim();
    buffer = buffer.slice(i + 1);
    if (!line) continue;
    const msg = JSON.parse(line);
    if (msg.id != null) replies.set(msg.id, msg);
  }
});
const send = (msg) => child.stdin.write(`${JSON.stringify(msg)}\n`);
const reply = (id, ms = 240000) =>
  new Promise((ok, no) => {
    const start = Date.now();
    const timer = setInterval(() => {
      if (replies.has(id)) {
        clearInterval(timer);
        ok(replies.get(id));
      } else if (Date.now() - start > ms) {
        clearInterval(timer);
        no(new Error(`no reply to request ${id}`));
      }
    }, 100);
  });

try {
  send({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } },
  });
  const init = await reply(1);
  if (!init.result?.instructions) fail('initialize returned no server instructions');
  send({ jsonrpc: '2.0', method: 'notifications/initialized' });
  send({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'scan_page', arguments: { url: fixture } } });
  const scan = (await reply(2)).result;
  const text = scan?.content?.[0]?.text || '';
  if (scan?.isError) fail(`scan_page returned an error: ${text}`);
  if (!/Design: \d+\/100/.test(text)) fail(`unexpected scan_page text: ${text.slice(0, 200)}`);
  if (text.length > 4000) fail(`scan_page text is ${text.length} chars (budget 4000)`);
  console.log(`ok   scan_page via the plugin command (${text.length} chars): ${text.split('\n')[1]}`);
} finally {
  child.kill();
}

// 2. The hook command `slop-detect init` writes.
const initSrc = readFileSync(join(root, 'packages/cli/src/init-project.ts'), 'utf8');
const hookCommand = initSrc.match(/export const HOOK_COMMAND = '([^']+)'/)[1].split(' ');
if (hookCommand[0] !== 'npx') fail(`HOOK_COMMAND does not start with npx: ${hookCommand.join(' ')}`);
const hookArgs = localArgs(hookCommand.slice(1));
const hookCwd = mkdtempSync(join(tmpdir(), 'slop-hook-'));
const hook = spawnSync('npx', hookArgs, {
  cwd: hookCwd,
  encoding: 'utf8',
  input: JSON.stringify({ hook_event_name: 'Stop', stop_hook_active: false, cwd: hookCwd }),
  env: { ...process.env, SLOP_LOCAL_URL: fixture },
  timeout: 240000,
});
if (hook.status !== 0) fail(`hook exited ${hook.status}: ${hook.stderr}`);
if (!existsSync(join(hookCwd, '.slop', 'session-baseline.json'))) {
  fail(`hook did not record a baseline. stdout=${hook.stdout} stderr=${hook.stderr}`);
}
console.log('ok   slop-detect-hook via the init command recorded a session baseline');
process.exit(0);
