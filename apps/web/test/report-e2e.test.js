// Alert-chain proof (G-06 / T-25): an induced scan failure POSTs to a LIVE
// stub webhook receiver. This is the "one alert proven to fire" P4-exit
// evidence — not a fetch mock, but the real chain: handler catch → report()
// → HTTP POST, asserted on the bytes the receiver actually got. The remaining
// production step (setting ERROR_WEBHOOK in Pages) is documented in the T-28
// runbooks; this test proves the code side fires given the URL.

import { test, expect, beforeEach, afterEach, vi } from 'vitest';
import http from 'node:http';

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

let server;
let received;

beforeEach(async () => {
  received = [];
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      received.push({
        url: req.url,
        method: req.method,
        contentType: req.headers['content-type'],
        body,
      });
      res.writeHead(200);
      res.end('ok');
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('an induced scan failure POSTs to the configured webhook (alert proven to fire)', async () => {
  const port = server.address().port;
  const pending = [];
  const res = await onRequestPost({
    request: {
      url: 'https://slop-detect.com/api/scan',
      headers: { get: () => 'trace-e2e-1' },
      json: async () => ({ url: 'https://acme.example.com' }),
    },
    env: { BROWSER: {}, ERROR_WEBHOOK: `http://127.0.0.1:${port}/hook` },
    waitUntil: (p) => pending.push(p),
  });
  expect(res.status).toBe(502);
  // Both background promises must ride waitUntil: the T-24 ops bump and
  // the scan_failed webhook POST. A detached promise can be killed after
  // the response in the Workers runtime, silently losing the alert — so if
  // you add a third waitUntil, account for it here.
  expect(pending).toHaveLength(2);
  await Promise.all(pending);
  expect(received).toHaveLength(1);
  expect(received[0].url).toBe('/hook');
  // Transport contract, not just the payload: Slack-compatible receivers
  // need a POST with a JSON content type.
  expect(received[0].method).toBe('POST');
  expect(received[0].contentType).toBe('application/json');
  const payload = JSON.parse(received[0].body);
  // Slack-style envelope: `text` carries `level`, `event`, and redacted data.
  expect(payload.text).toMatch(/slop-detect error: scan_failed/);
  expect(payload.text).toContain('trace-e2e-1');
  expect(payload.text).toMatch(/simulated navigation boom/);
});

test('no webhook configured means no POST attempt (console line only)', async () => {
  const pending = [];
  const res = await onRequestPost({
    request: {
      url: 'https://slop-detect.com/api/scan',
      headers: { get: () => null },
      json: async () => ({ url: 'https://acme.example.com' }),
    },
    env: { BROWSER: {} },
    waitUntil: (p) => pending.push(p),
  });
  expect(res.status).toBe(502);
  // No hook configured: only the ops bump rides waitUntil, nothing POSTs.
  expect(pending).toHaveLength(1);
  await Promise.all(pending);
  expect(received).toHaveLength(0);
});
