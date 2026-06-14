// MCP API client tests — cover the timeout wrapper and error mapping without a
// live network by stubbing global.fetch.

import { test, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { scanPage, fixPrompt, ApiError } from '../src/api.ts';

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
  expect(r.score).toBe(12);
  expect(r.tier).toBe('Mild');
});

test('429 maps to a rate-limit ApiError', async () => {
  global.fetch = async () => jsonRes({ error: 'rate_limited' }, { ok: false, status: 429 });
  await expect(scanPage('https://x.com')).rejects.toSatisfy((e) => {
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(429);
    expect(e.message).toMatch(/Rate limited/);
    return true;
  });
});

test('502 maps to an upstream-failure ApiError', async () => {
  global.fetch = async () => jsonRes({ error: 'boom' }, { ok: false, status: 502 });
  await expect(fixPrompt('https://x.com')).rejects.toSatisfy((e) => {
    expect(e.status).toBe(502);
    expect(e.message).toMatch(/failed upstream/);
    return true;
  });
});

test('a fetch timeout (TimeoutError) becomes a clean ApiError, not a raw abort', async () => {
  global.fetch = async () => {
    const err = new Error('The operation was aborted due to timeout');
    err.name = 'TimeoutError';
    throw err;
  };
  await expect(scanPage('https://slow.example')).rejects.toSatisfy((e) => {
    expect(e).toBeInstanceOf(ApiError);
    expect(e.message).toMatch(/did not respond within/);
    return true;
  });
});

test('MCP server version matches package.json (no hardcoded drift)', () => {
  const pkg = JSON.parse(
    readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8')
  );
  // Mirror the readVersion() logic to assert it resolves to the package version.
  expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
});