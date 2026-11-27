#!/usr/bin/env node
// Runs the compiled native Rust raw-CDP binary across all golden HTML fixtures
// in packages/cli/test/fixtures/ (clean-artisan, slop-vibecode, and every
// pat-*.html rule fixture) to prove full 45-pattern parity without Playwright.

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const FIXTURES = path.join(ROOT, 'packages/cli/test/fixtures');
const BIN = process.env.SLOP_DETECT_BIN || path.join(ROOT, 'target/release/slop-detect');

if (!fs.existsSync(BIN)) {
  console.error(`Native binary missing at ${BIN}. Run 'cargo build --release -p slop-cli' first.`);
  process.exit(2);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.woff2': 'font/woff2',
  '.md': 'text/markdown; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const cleanPath = (req.url || '/').split('?')[0].replace(/^\/+/, '');
  const filePath = path.join(FIXTURES, cleanPath);
  if (
    !filePath.startsWith(FIXTURES) ||
    !fs.existsSync(filePath) ||
    fs.statSync(filePath).isDirectory()
  ) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

async function scan(file, extraArgs = []) {
  const { stdout } = await execFileAsync(
    BIN,
    ['scan', `${base}/${file}`, ...extraArgs, '--format', 'json'],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 30000 }
  );
  return JSON.parse(stdout);
}

try {
  // 1. Flagship clean + DESIGN.md + craft
  const clean = await scan('clean-artisan.html', [
    '--copy',
    '--craft',
    '--design-md',
    path.join(FIXTURES, 'artisan-DESIGN.md'),
  ]);
  assert.equal(clean.score, 0, 'clean-artisan score must be 0');
  assert.equal(clean.tier, 'Clean');
  assert.equal(clean.craft.score, 100, 'clean-artisan craft must be 100');
  assert.equal(clean.system.score, 83, 'clean-artisan system must match Playwright (83)');

  // 2. Flagship Heavy vibecode
  const heavy = await scan('slop-vibecode.html', ['--copy', '--craft']);
  assert.equal(heavy.score, 39, 'slop-vibecode score must be 39');
  assert.equal(heavy.tier, 'Heavy');
  assert.equal(heavy.craft.score, 82, 'slop-vibecode craft must be 82');

  // 3. Every pat-*.html fixture must trigger its named design pattern or craft check
  const patFiles = fs
    .readdirSync(FIXTURES)
    .filter((f) => f.startsWith('pat-') && f.endsWith('.html'))
    .sort();

  const CRAFT_IDS = new Set(['gray_on_color', 'wide_body_tracking']);
  const RETIRED_IDS = new Set(['all_caps_labels']);
  const failures = [];
  const CONCURRENCY = 4;
  for (let i = 0; i < patFiles.length; i += CONCURRENCY) {
    const batch = patFiles.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (file) => {
        const id = file.slice(4, -5);
        const res = await scan(file, CRAFT_IDS.has(id) ? ['--craft'] : []);
        if (RETIRED_IDS.has(id)) {
          const hit = res.design?.patterns?.find((p) => p.id === id);
          if (!hit || hit.triggered)
            failures.push(`${file}: retired pattern ${id} must not trigger`);
        } else if (CRAFT_IDS.has(id)) {
          const hit = res.craft?.checks?.find((c) => c.id === id && c.triggered);
          if (!hit) failures.push(`${file}: craft check ${id} did not trigger`);
        } else {
          const hit = res.design?.patterns?.find((p) => p.id === id && p.triggered);
          if (!hit) failures.push(`${file}: design pattern ${id} did not trigger`);
        }
      })
    );
  }

  if (failures.length > 0) {
    console.error('Rust CDP golden failures:\n' + failures.join('\n'));
    process.exit(1);
  }

  console.log(
    `Rust CDP golden suite PASSED: clean-artisan + slop-vibecode + ${patFiles.length}/${patFiles.length} pat-*.html fixtures verified!`
  );
} finally {
  server.close();
}
