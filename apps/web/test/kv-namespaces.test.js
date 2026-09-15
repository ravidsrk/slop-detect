// kv-namespaces rehearsal (T-29 / G-11): ensure/list/check over a mocked
// Cloudflare API. Live run needs H-01 credentials; these tests prove the
// script would do the right thing (idempotent ensure, dry-run default,
// auth failure surfacing).

import { test, expect } from 'vitest';
import {
  cfKvAdmin,
  ensureNamespace,
  checkNamespaces,
  previewTitle,
  parseArgs,
} from '../scripts/kv-namespaces.mjs';

function mockApi({ namespaces = [], failWith = null, perPage = 100 } = {}) {
  const calls = [];
  const store = new Map(namespaces.map((ns) => [ns.id, { ...ns }]));
  const fetchImpl = async (url, init = {}) => {
    calls.push({ method: init.method || 'GET', url, body: init.body });
    if (failWith) {
      return { ok: false, status: failWith.status, json: async () => failWith.body };
    }
    const u = new URL(url);
    if ((init.method || 'GET') === 'GET' && u.pathname.endsWith('/namespaces')) {
      // Honor real pagination params like the Cloudflare API.
      const all = [...store.values()];
      const pp = parseInt(u.searchParams.get('per_page') || '100', 10);
      const page = parseInt(u.searchParams.get('page') || '1', 10);
      const slice = all.slice((page - 1) * pp, page * pp);
      const total_pages = Math.max(1, Math.ceil(all.length / pp));
      const result_info = { page, per_page: pp, total_pages, total_count: all.length };
      return { ok: true, json: async () => ({ success: true, result: slice, result_info }) };
    }
    if (init.method === 'POST' && u.pathname.endsWith('/namespaces')) {
      const { title } = JSON.parse(init.body);
      const id = `ns-${store.size + 1}`;
      store.set(id, { id, title });
      return { ok: true, json: async () => ({ success: true, result: { id, title } }) };
    }
    const m = u.pathname.match(/\/namespaces\/([^/]+)$/);
    if ((init.method || 'GET') === 'GET' && m) {
      const ns = store.get(m[1]);
      if (!ns)
        return { ok: false, status: 404, json: async () => ({ success: false, errors: [] }) };
      return { ok: true, json: async () => ({ success: true, result: ns }) };
    }
    throw new Error(`unexpected call ${init.method} ${url}`);
  };
  return { api: cfKvAdmin({ token: 't', accountId: 'a', fetchImpl, perPage }), calls, store };
}

test('preview titles follow the slop-detector-<BINDING>-preview convention', () => {
  expect(previewTitle('RESULTS')).toBe('slop-detector-RESULTS-preview');
  expect(previewTitle('RATE_LIMIT')).toBe('slop-detector-RATE_LIMIT-preview');
});

test('ensure finds an existing namespace by title (idempotent, no POST)', async () => {
  const { api, calls } = mockApi({
    namespaces: [{ id: 'ns-9', title: 'slop-detector-RESULTS-preview' }],
  });
  const r = await ensureNamespace(api, 'RESULTS', { apply: true });
  expect(r).toEqual({ title: 'slop-detector-RESULTS-preview', id: 'ns-9', created: false });
  expect(calls.map((c) => c.method)).toEqual(['GET']);
});

test('ensure creates a missing namespace only with --apply (dry-run default)', async () => {
  const dry = mockApi();
  const r1 = await ensureNamespace(dry.api, 'RESULTS', { apply: false });
  expect(r1).toEqual({
    title: 'slop-detector-RESULTS-preview',
    id: null,
    created: false,
    dryRun: true,
  });
  expect(dry.calls.map((c) => c.method)).toEqual(['GET']);

  const live = mockApi();
  const r2 = await ensureNamespace(live.api, 'RESULTS', { apply: true });
  expect(r2.created).toBe(true);
  expect(r2.id).toBe('ns-1');
  expect(live.calls.map((c) => c.method)).toEqual(['GET', 'POST']);
  expect(JSON.parse(live.calls[1].body)).toEqual({ title: 'slop-detector-RESULTS-preview' });
});

test('ensure follows pagination: title on page 2 found, no duplicate created', async () => {
  const { api, calls } = mockApi({
    perPage: 2,
    namespaces: [
      { id: 'ns-1', title: 'other-a' },
      { id: 'ns-2', title: 'other-b' },
      { id: 'ns-3', title: 'slop-detector-RESULTS-preview' },
    ],
  });
  const r = await ensureNamespace(api, 'RESULTS', { apply: true });
  expect(r).toEqual({ title: 'slop-detector-RESULTS-preview', id: 'ns-3', created: false });
  // Two GET pages traversed, zero POSTs — idempotence holds past page 1.
  expect(calls.map((c) => c.method)).toEqual(['GET', 'GET']);
  expect(calls[1].url).toContain('page=2');
});

test('ensure rejects unknown bindings before touching the API', async () => {
  const { api, calls } = mockApi();
  await expect(ensureNamespace(api, 'SESSIONS', { apply: true })).rejects.toThrow(
    /unknown binding/
  );
  expect(calls).toEqual([]);
});

test('check reports ok per binding, failures named', async () => {
  const { api } = mockApi({ namespaces: [{ id: 'good-id', title: 'x' }] });
  expect(await checkNamespaces(api, { RESULTS: 'good-id' })).toEqual({});
  const failures = await checkNamespaces(api, { RESULTS: 'good-id', RATE_LIMIT: 'gone-id' });
  expect(Object.keys(failures)).toEqual(['RATE_LIMIT']);
});

test('API errors surface with status (auth failures fail loudly)', async () => {
  const { api } = mockApi({
    failWith: { status: 403, body: { success: false, errors: [{ message: 'bad token' }] } },
  });
  await expect(ensureNamespace(api, 'RESULTS', { apply: true })).rejects.toThrow(/bad token/);
});

test('parseArgs handles the three commands', () => {
  expect(parseArgs(['list'])).toMatchObject({ cmd: 'list' });
  expect(parseArgs(['ensure', '--binding', 'RESULTS', '--apply'])).toMatchObject({
    cmd: 'ensure',
    binding: 'RESULTS',
    apply: true,
  });
  expect(parseArgs(['check'])).toMatchObject({ cmd: 'check' });
});
