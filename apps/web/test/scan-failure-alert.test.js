// T-25 alert-chain tests: what the `scan_failed` log line contains when a scan
// blows up. The E2E proof that the alert reaches a live webhook receiver is
// in report-e2e.test.js; this file locks the line's field contract.

import { test, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@cloudflare/puppeteer', () => ({
  default: {
    sessions: async () => [],
    connect: async () => {
      throw new Error('no connect in this test');
    },
    launch: async () => ({
      version: async () => 'HeadlessChrome/131.0.0.0',
      newPage: async () => ({
        setViewport: async () => {},
        setUserAgent: async () => {},
        goto: async () => {
          throw new Error('simulated navigation boom');
        },
        waitForNetworkIdle: async () => {},
        evaluate: async () => {
          throw new Error('unreachable');
        },
        screenshot: async () => Buffer.from('x'),
        close: async () => {},
      }),
      disconnect: async () => {},
      close: async () => {},
    }),
  },
}));

// vi.mock is hoisted: scan.ts binds to the fake browser module above.
import { onRequestPost } from '../functions/api/scan.ts';

let logged;
let errorSpy;

beforeEach(() => {
  logged = [];
  errorSpy = vi.spyOn(console, 'error').mockImplementation((line) => {
    if (typeof line === 'string' && line.startsWith('[slop-detect] ')) {
      logged.push(JSON.parse(line.slice('[slop-detect] '.length)));
    }
  });
});

afterEach(() => {
  errorSpy.mockRestore();
});

test('a browser failure emits a scan_failed line carrying requestId + diagnostics', async () => {
  const res = await onRequestPost({
    request: {
      url: 'https://slop-detect.com/api/scan',
      headers: { get: () => 'trace-42' },
      json: async () => ({ url: 'https://acme.example.com' }),
    },
    env: { BROWSER: {} },
  });
  expect(res.status).toBe(502);
  expect(logged).toHaveLength(1);
  const line = logged[0];
  expect(line.level).toBe('error');
  expect(line.event).toBe('scan_failed');
  expect(line.url).toBe('https://acme.example.com');
  expect(line.message).toMatch(/simulated navigation boom/);
  expect(line.requestId).toBe('trace-42');
  expect(line).toHaveProperty('navMs');
  expect(line).toHaveProperty('patternsErrored');
  expect(typeof line.ts).toBe('string');
});

test('each failure gets a fresh timestamped line (no batching, no swallowing)', async () => {
  const req = (id) => ({
    request: {
      url: 'https://slop-detect.com/api/scan',
      headers: { get: () => id },
      json: async () => ({ url: 'https://acme.example.com' }),
    },
    env: { BROWSER: {} },
  });
  await onRequestPost(req('trace-a'));
  await onRequestPost(req('trace-b'));
  expect(logged.map((l) => l.requestId)).toEqual(['trace-a', 'trace-b']);
});
