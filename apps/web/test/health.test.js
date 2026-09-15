// Health endpoint tests (G-07 / T-23): readiness shape, fail-closed signals.

import { test, expect } from 'vitest';
import { onRequestGet } from '../functions/api/health.ts';
import { DEFINITIONS_VERSION } from '@slop-detect/core';

const okKv = { get: async () => null };
const throwingKv = {
  get: async () => {
    throw new Error('KV down');
  },
};
const fullEnv = () => ({ BROWSER: {}, RATE_LIMIT: okKv, RESULTS: okKv });

test('healthy bindings return 200 ok with per-check detail', async () => {
  const res = await onRequestGet({ env: fullEnv() });
  expect(res.status).toBe(200);
  expect(res.headers.get('Cache-Control')).toBe('no-store');
  const j = await res.json();
  expect(j.status).toBe('ok');
  expect(j.version).toBe(DEFINITIONS_VERSION);
  expect(j.checks.browser.ok).toBe(true);
  expect(j.checks.rateLimitKv.ok).toBe(true);
  expect(j.checks.resultsKv.ok).toBe(true);
  expect(j.checks.scans).toEqual({ ok: true });
  expect(typeof j.checks.rateLimitKv.latencyMs).toBe('number');
  expect(typeof j.time).toBe('string');
});

test('missing BROWSER binding returns 503 degraded (not a crash)', async () => {
  const res = await onRequestGet({ env: { RATE_LIMIT: okKv, RESULTS: okKv } });
  expect(res.status).toBe(503);
  const j = await res.json();
  expect(j.status).toBe('degraded');
  expect(j.checks.browser.ok).toBe(false);
  expect(j.checks.rateLimitKv.ok).toBe(true);
});

test('a throwing KV returns 503 degraded with a redacted reason (detail goes to the log)', async () => {
  const res = await onRequestGet({ env: { BROWSER: {}, RATE_LIMIT: throwingKv, RESULTS: okKv } });
  expect(res.status).toBe(503);
  const j = await res.json();
  expect(j.status).toBe('degraded');
  expect(j.checks.rateLimitKv.ok).toBe(false);
  expect(j.checks.rateLimitKv.reason).toBe('read failed');
  expect(JSON.stringify(j)).not.toMatch(/KV down/);
});

test('SCAN_DISABLED kill switch reports degraded (scans cannot be accepted)', async () => {
  const res = await onRequestGet({ env: { ...fullEnv(), SCAN_DISABLED: '1' } });
  expect(res.status).toBe(503);
  const j = await res.json();
  expect(j.status).toBe('degraded');
  expect(j.checks.scans).toEqual({ ok: false, reason: 'scanning paused' });
  expect(j.checks.browser.ok).toBe(true);
});

test('missing KV bindings return 503 degraded', async () => {
  const res = await onRequestGet({ env: { BROWSER: {} } });
  expect(res.status).toBe(503);
  const j = await res.json();
  expect(j.checks.rateLimitKv).toEqual({ ok: false, reason: 'binding missing' });
  expect(j.checks.resultsKv).toEqual({ ok: false, reason: 'binding missing' });
});

test('missing env entirely returns 503 degraded, not a throw', async () => {
  const res = await onRequestGet({});
  expect(res.status).toBe(503);
  const j = await res.json();
  expect(j.status).toBe('degraded');
});
