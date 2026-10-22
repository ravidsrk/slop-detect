// Compare schemas/scan-result.v1.json with the copy on origin/main.
// Introducing the file is allowed. An incompatible edit of an existing v1
// file fails until $id moves to scan-result.v2.json.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { assertCompatibleSchemaChange } from './schema-compat.mjs';

const baseRef = process.env.SCHEMA_BASE_REF || 'origin/main';
const current = JSON.parse(readFileSync(new URL('./scan-result.v1.json', import.meta.url), 'utf8'));

let baseText = '';
try {
  baseText = execFileSync('git', ['show', `${baseRef}:schemas/scan-result.v1.json`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (err) {
  const detail = `${err.stderr || ''}\n${err.message || ''}`;
  if (/not in '|does not exist|exists on disk, but not|fatal: path/i.test(detail)) {
    console.log(`No schemas/scan-result.v1.json on ${baseRef}. Introducing schema v1 is allowed.`);
    process.exit(0);
  }
  console.error(detail);
  process.exit(1);
}

try {
  assertCompatibleSchemaChange(JSON.parse(baseText), current);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
console.log(`schemas/scan-result.v1.json is compatible with ${baseRef}.`);
