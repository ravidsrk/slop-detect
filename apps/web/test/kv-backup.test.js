// kv-backup round-trip rehearsal (T-08 / G-13): backup -> restore -> verify
// against the memory backend, TTL preservation, dry-run safety, the CF API
// backend's pagination over mocked fetch, and wrangler.toml namespace parsing.

import { test, expect } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  memoryKv,
  cfApiKv,
  backupNamespace,
  restoreNamespace,
  verifyNamespace,
  validateManifest,
  parseArgs,
  sha256,
  readNamespaces,
  resolveNamespace,
} from '../scripts/kv-backup.mjs';

function entry(name, text, expiration = null) {
  const base64 = Buffer.from(text).toString('base64');
  return { name, expiration, sha256: sha256(Buffer.from(text)), base64 };
}

function manifestOf(entries, over = {}) {
  return {
    binding: 'RESULTS',
    namespaceId: 'test-ns',
    takenAt: new Date().toISOString(),
    keys: entries.length,
    missing: 0,
    entries,
    ...over,
  };
}

const REF = { binding: 'RESULTS', id: 'test-ns' };
const scratch = () => mkdtempSync(join(tmpdir(), 'kvbu-'));

function capturing(base) {
  const puts = [];
  return {
    ...base,
    puts,
    putRaw: async (name, buf, opts = {}) => {
      puts.push({ name, bytes: buf.length, ttl: opts.expirationTtl });
      return base.putRaw(name, buf, opts);
    },
  };
}

test('backup -> restore -> verify round-trips text and binary values', async () => {
  const src = memoryKv({ 'r:a': 'hello', 'og:b': Buffer.from([0, 1, 2, 250]).toString('binary') });
  const dir = scratch();
  const manifest = await backupNamespace(src, REF, dir);
  expect(manifest.keys).toBe(2);
  expect(manifest.binding).toBe('RESULTS');
  expect(manifest.entries[0]).toHaveProperty('sha256');

  const dst = memoryKv();
  const plan = await restoreNamespace(dst, manifest, { apply: true });
  expect(plan).toMatchObject({ writes: 2, skippedExpired: 0 });
  const v = await verifyNamespace(dst, manifest);
  expect(v.mismatched).toEqual([]);
  expect(v.checked).toBe(2);
});

test('restore is dry-run unless --apply: plans without writing', async () => {
  const src = memoryKv({ 'r:a': 'hello' });
  const manifest = await backupNamespace(src, REF, scratch());
  const dst = capturing(memoryKv());
  const plan = await restoreNamespace(dst, manifest);
  expect(plan.writes).toBe(1);
  expect(dst.puts).toHaveLength(0);
  expect(dst.store.size).toBe(0);
});

test('restore preserves expirations as TTLs and skips already-expired keys', async () => {
  const now = Math.floor(Date.now() / 1000);
  const manifest = manifestOf([
    entry('fresh', 'f', now + 3600),
    entry('durable', 'd'),
    entry('stale', 's', now - 10),
  ]);
  const dst = capturing(memoryKv());
  const plan = await restoreNamespace(dst, manifest, { apply: true });
  expect(plan).toMatchObject({ writes: 2, skippedExpired: 1 });
  expect(dst.puts.find((p) => p.name === 'fresh').ttl).toBeGreaterThan(3500);
  expect(dst.puts.find((p) => p.name === 'durable').ttl).toBeUndefined();
  expect(dst.store.has('stale')).toBe(false);
});

test('short-lived entries are skipped, never resurrected past their span', async () => {
  const now = Math.floor(Date.now() / 1000);
  const manifest = manifestOf([entry('dying', 'x', now + 30)]);
  const dst = capturing(memoryKv());
  const plan = await restoreNamespace(dst, manifest, { apply: true });
  expect(plan).toMatchObject({ writes: 0, skippedExpired: 1 });
  expect(dst.store.has('dying')).toBe(false);
});

test('damaged manifests abort before any write', async () => {
  const good = entry('a', 'hello');
  const bad = { ...entry('b', 'world'), base64: Buffer.from('EVIL').toString('base64') };
  const manifest = manifestOf([good, bad]);
  const dst = capturing(memoryKv());
  await expect(restoreNamespace(dst, manifest, { apply: true })).rejects.toThrow(
    'checksum mismatch'
  );
  expect(dst.store.size).toBe(0);
});

test('cross-namespace manifests are refused', async () => {
  const manifest = manifestOf([entry('a', 'hello')], {
    binding: 'RATE_LIMIT',
    namespaceId: 'other',
  });
  const dst = memoryKv();
  await expect(
    restoreNamespace(dst, manifest, { apply: true, target: { binding: 'RESULTS', id: 'test-ns' } })
  ).rejects.toThrow('cross-namespace');
  expect(validateManifest(manifest, null)).toHaveLength(1);
});

test('vanished keys (CF 404) count as missing, not fatal', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('/keys?')) {
      return Response.json({
        success: true,
        result: [{ name: 'r:a' }, { name: 'r:gone' }],
        result_info: { cursor: '', count: 2, list_complete: true },
      });
    }
    if (url.includes('/values/r%3Aa')) return new Response('hello-A');
    return new Response('not found', { status: 404 });
  };
  const kv = cfApiKv({ token: 't', accountId: 'a', namespaceId: 'n', fetchImpl });
  const manifest = await backupNamespace(kv, REF, scratch());
  expect(manifest.keys).toBe(1);
  expect(manifest.missing).toBe(1);
});

test('arg parsing rejects empty values and unknown flags', () => {
  expect(parseArgs(['backup', '--out', 'd', '--namespace', 'RESULTS'])).toEqual({
    cmd: 'backup',
    o: { out: 'd', namespace: 'RESULTS' },
  });
  expect(() => parseArgs(['restore', '--in', 'd', '--namespace'])).toThrow('needs a value');
  expect(() => parseArgs(['restore', '--in', 'd', '--namespace', '--apply'])).toThrow(
    'needs a value'
  );
  expect(() => parseArgs(['backup', '--bogus'])).toThrow('unknown argument');
});

test('verify reports missing and divergent keys', async () => {
  const src = memoryKv({ 'r:a': 'hello', 'r:gone': 'x' });
  const manifest = await backupNamespace(src, REF, scratch());
  const dst = memoryKv({ 'r:a': 'CHANGED' });
  const v = await verifyNamespace(dst, manifest);
  expect(v.mismatched).toEqual([
    { name: 'r:a', reason: 'bytes-differ' },
    { name: 'r:gone', reason: 'missing-live' },
  ]);
});

test('missing values at backup time are counted, not fatal', async () => {
  const flaky = memoryKv({ 'r:a': 'v' });
  flaky.listKeys = async () => [{ name: 'r:a' }, { name: 'r:vanished' }];
  const manifest = await backupNamespace(flaky, REF, scratch());
  expect(manifest.keys).toBe(1);
  expect(manifest.missing).toBe(1);
});

test('CF backend paginates key listing and reads values', async () => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push(`${init.method || 'GET'} ${url}`);
    if (url.includes('/keys?') && !url.includes('cursor=')) {
      return Response.json({
        success: true,
        result: [{ name: 'r:a', expiration: null }],
        result_info: { cursor: 'c2', count: 1 },
      });
    }
    if (url.includes('cursor=c2')) {
      return Response.json({
        success: true,
        result: [{ name: 'r:b', expiration: 9999999999 }],
        result_info: { cursor: '', count: 1, list_complete: true },
      });
    }
    if (url.includes('/values/r%3Aa')) return new Response('hello-A');
    if (url.includes('/values/r%3Ab')) return new Response('hello-B');
    throw new Error(`unexpected ${url}`);
  };
  const kv = cfApiKv({ token: 't', accountId: 'a', namespaceId: 'n', fetchImpl });
  const keys = await kv.listKeys();
  expect(keys.map((k) => k.name)).toEqual(['r:a', 'r:b']);
  expect(keys[1].expiration).toBe(9999999999);
  const manifest = await backupNamespace(kv, REF, scratch());
  expect(manifest.keys).toBe(2);
  // Two listings happened (explicit + inside backup), two pages each.
  expect(calls.filter((c) => c.includes('/keys?'))).toHaveLength(4);
});

test('CF backend PUT encodes TTL floor and surfaces API errors', async () => {
  const seen = [];
  const fetchImpl = async (url, init = {}) => {
    seen.push(url);
    return new Response('{}', { status: 200 });
  };
  const kv = cfApiKv({ token: 't', accountId: 'a', namespaceId: 'n', fetchImpl });
  await kv.putRaw('r:a', Buffer.from('x'), { expirationTtl: 5 });
  expect(seen[0]).toContain('expiration_ttl=60');
  await kv.putRaw('r:b', Buffer.from('y'), {});
  expect(seen[1]).not.toContain('expiration_ttl');

  const failing = cfApiKv({
    token: 't',
    accountId: 'a',
    namespaceId: 'n',
    fetchImpl: async () => new Response('nope', { status: 403 }),
  });
  await expect(failing.listKeys()).rejects.toThrow('403');
});

test('namespaces resolve from wrangler.toml by binding or id', () => {
  const map = readNamespaces();
  expect(map.RESULTS).toMatch(/^[0-9a-f]{32}$/);
  expect(map.RATE_LIMIT).toMatch(/^[0-9a-f]{32}$/);
  expect(resolveNamespace('RESULTS')).toEqual({ binding: 'RESULTS', id: map.RESULTS });
  expect(resolveNamespace(map.RATE_LIMIT)).toEqual({ binding: 'RATE_LIMIT', id: map.RATE_LIMIT });
  expect(() => resolveNamespace('NOPE')).toThrow('unknown namespace');
});
