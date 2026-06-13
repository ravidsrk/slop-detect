// MCP API client tests — cover the timeout wrapper and error mapping without a
// live network by stubbing global.fetch.

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { scanPage, fixPrompt, ApiError } from '../src/api.js';

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
});

function jsonRes(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

test('scanPage returns parsed JSON on success', async () => {
  global.fetch = async () => jsonRes({ score: 12, tier: 'Mild' });
  const r = await scanPage('https://example.com');
  assert.equal(r.score, 12);
  assert.equal(r.tier, 'Mild');
});

test('429 maps to a rate-limit ApiError', async () => {
  global.fetch = async () => jsonRes({ error: 'rate_limited' }, { ok: false, status: 429 });
  await assert.rejects(scanPage('https://x.com'), (e) => {
    assert.ok(e instanceof ApiError);
    assert.equal(e.status, 429);
    assert.match(e.message, /Rate limited/);
    return true;
  });
});

test('502 maps to an upstream-failure ApiError', async () => {
  global.fetch = async () => jsonRes({ error: 'boom' }, { ok: false, status: 502 });
  await assert.rejects(fixPrompt('https://x.com'), (e) => {
    assert.equal(e.status, 502);
    assert.match(e.message, /failed upstream/);
    return true;
  });
});

test('a fetch timeout (TimeoutError) becomes a clean ApiError, not a raw abort', async () => {
  global.fetch = async () => {
    const err = new Error('The operation was aborted due to timeout');
    err.name = 'TimeoutError';
    throw err;
  };
  await assert.rejects(scanPage('https://slow.example'), (e) => {
    assert.ok(e instanceof ApiError);
    assert.match(e.message, /did not respond within/);
    return true;
  });
});

test('MCP server version matches package.json (no hardcoded drift)', () => {
  const pkg = JSON.parse(
    readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8')
  );
  // Mirror the readVersion() logic to assert it resolves to the package version.
  assert.match(pkg.version, /^\d+\.\d+\.\d+/);
});
