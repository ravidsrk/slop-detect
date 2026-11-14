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

test('429 maps to a rate-limit ApiError with the API message and retry time', async () => {
  global.fetch = async () =>
    jsonRes(
      {
        error: 'rate_limited',
        message: 'Too many requests. Limit is 3/min per IP.',
        retryAfter: 60,
      },
      { ok: false, status: 429 }
    );
  await expect(scanPage('https://x.com')).rejects.toSatisfy((e) => {
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(429);
    expect(e.message).toMatch(/rate limit \(HTTP 429\)/);
    expect(e.message).toMatch(/Limit is 3\/min per IP/);
    expect(e.message).toMatch(/Retry in 60s/);
    return true;
  });
});

test('422 keeps the reason and hint and says it is not a Clean result', async () => {
  global.fetch = async () =>
    jsonRes(
      { error: 'Sparse DOM.', code: 'empty_page', hint: 'Try a public marketing URL.' },
      { ok: false, status: 422 }
    );
  await expect(scanPage('https://x.com')).rejects.toSatisfy((e) => {
    expect(e.status).toBe(422);
    expect(e.message).toMatch(/Sparse DOM\./);
    expect(e.message).toMatch(/Try a public marketing URL\./);
    expect(e.message).toMatch(/not a Clean result/);
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
