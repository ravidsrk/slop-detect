// OPS-1: error-webhook fetch must register with ctx.waitUntil when available.

import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { report } from '../functions/_report.ts';

const origFetch = globalThis.fetch;

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  globalThis.fetch = origFetch;
  vi.restoreAllMocks();
});

test('registers webhook fetch with waitUntil when provided', async () => {
  let resolveFetch;
  const fetchPromise = new Promise((r) => {
    resolveFetch = r;
  });
  globalThis.fetch = vi.fn(() => fetchPromise);

  const waitUntil = vi.fn();
  const env = { ERROR_WEBHOOK: 'https://hooks.example/alert' };

  report(env, 'error', 'scan_failed', { url: 'https://x.test', message: 'boom' }, waitUntil);

  expect(globalThis.fetch).toHaveBeenCalledOnce();
  expect(waitUntil).toHaveBeenCalledOnce();
  const registered = waitUntil.mock.calls[0][0];
  expect(registered).toBeInstanceOf(Promise);
  resolveFetch(new Response('', { status: 200 }));
  await registered;
});

test('falls back to detached fetch when waitUntil is absent', async () => {
  const fetchPromise = Promise.resolve(new Response('', { status: 200 }));
  globalThis.fetch = vi.fn(() => fetchPromise);

  const env = { ERROR_WEBHOOK: 'https://hooks.example/alert' };

  report(env, 'warn', 'persist_failed', { message: 'kv down' });

  expect(globalThis.fetch).toHaveBeenCalledOnce();
  await fetchPromise;
});

test('does not call fetch for info-level events', () => {
  globalThis.fetch = vi.fn();
  const waitUntil = vi.fn();

  report({ ERROR_WEBHOOK: 'https://hooks.example/alert' }, 'info', 'monitor_sweep', {}, waitUntil);

  expect(globalThis.fetch).not.toHaveBeenCalled();
  expect(waitUntil).not.toHaveBeenCalled();
});
