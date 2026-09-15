#!/usr/bin/env bun
// KV namespace management for staging (T-29 / G-11). Creates and verifies the
// preview-environment namespaces so PR previews never touch production KV.
// Needs CLOUDFLARE_API_TOKEN (KV edit scope) + CLOUDFLARE_ACCOUNT_ID (H-01).
// No deps; runs on bun or node 20+.
//
//   list                                    # read-only: titles + ids
//   ensure --binding RESULTS|RATE_LIMIT [--apply]  # create preview ns if missing (dry-run unless --apply)
//   check                                   # read-only: wrangler.toml prod IDs exist
//
// Preview titles: slop-detector-<BINDING>-preview. ensure is idempotent:
// re-running finds the existing namespace by title and prints its id.
// Exits 0 on success, 2 on usage errors, 1 on operational failure.

import { readNamespaces } from './kv-backup.mjs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://api.cloudflare.com/client/v4';

export function previewTitle(binding) {
  return `slop-detector-${binding}-preview`;
}

export function cfKvAdmin({ token, accountId, fetchImpl = globalThis.fetch, perPage = 100 }) {
  const base = `${API}/accounts/${accountId}/storage/kv/namespaces`;
  const headers = { Authorization: `Bearer ${token}` };
  async function call(method, url, body) {
    const res = await fetchImpl(url, {
      method,
      headers: body ? { ...headers, 'Content-Type': 'application/json' } : headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      const detail = (data.errors || []).map((e) => e.message || e.code).join('; ') || res.status;
      throw new Error(`cloudflare api ${method} failed: ${detail}`);
    }
    return data.result;
  }
  // List follows result_info pagination: callers (ensure) need the FULL
  // inventory, not just page 1, or idempotence breaks past 100 namespaces.
  async function listAll() {
    const out = [];
    let page = 1;
    for (;;) {
      const res = await fetchImpl(`${base}?per_page=${perPage}&page=${page}`, {
        method: 'GET',
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        const detail = (data.errors || []).map((e) => e.message || e.code).join('; ') || res.status;
        throw new Error(`cloudflare api GET failed: ${detail}`);
      }
      out.push(...(data.result || []));
      const info = data.result_info || {};
      if (!info.total_pages || info.page >= info.total_pages || !(data.result || []).length) break;
      if (++page > 50) throw new Error('namespace list exceeded 50 pages; refusing to continue');
    }
    return out;
  }
  return {
    list: listAll,
    create: (title) => call('POST', base, { title }),
    get: (id) => call('GET', `${base}/${id}`),
  };
}

export async function ensureNamespace(api, binding, { apply = false } = {}) {
  if (binding !== 'RESULTS' && binding !== 'RATE_LIMIT') {
    throw new Error(`unknown binding ${JSON.stringify(binding)} (want RESULTS or RATE_LIMIT)`);
  }
  const title = previewTitle(binding);
  const all = await api.list();
  const existing = (all || []).find((ns) => ns.title === title);
  if (existing) return { title, id: existing.id, created: false };
  if (!apply) return { title, id: null, created: false, dryRun: true };
  const made = await api.create(title);
  return { title, id: made.id, created: true };
}

export async function checkNamespaces(api, map) {
  // Verify every wrangler.toml binding id exists. Returns failures ({} = ok).
  const failures = {};
  for (const [binding, id] of Object.entries(map)) {
    try {
      await api.get(id);
    } catch (e) {
      failures[binding] = e.message;
    }
  }
  return failures;
}

function usage(exit = 2) {
  console.error(
    'usage: kv-namespaces.mjs list | ensure --binding RESULTS|RATE_LIMIT [--apply] | check'
  );
  process.exit(exit);
}

export function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const o = { cmd, binding: null, apply: false };
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--binding') o.binding = rest[++i] ?? null;
    else if (rest[i] === '--apply') o.apply = true;
    else usage();
  }
  return o;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (!['list', 'ensure', 'check'].includes(o.cmd)) usage();
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !accountId) {
    console.error('kv-namespaces: set CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID (H-01).');
    process.exit(1);
  }
  const api = cfKvAdmin({ token, accountId });
  if (o.cmd === 'list') {
    for (const ns of (await api.list()) || []) console.log(`${ns.id}\t${ns.title}`);
    return;
  }
  if (o.cmd === 'ensure') {
    if (!o.binding) usage();
    const r = await ensureNamespace(api, o.binding, { apply: o.apply });
    if (r.created) console.log(`created ${r.title}: ${r.id}`);
    else if (r.dryRun) console.log(`would create ${r.title} (pass --apply)`);
    else console.log(`exists ${r.title}: ${r.id}`);
    return;
  }
  const failures = await checkNamespaces(api, readNamespaces());
  for (const [binding, id] of Object.entries(readNamespaces())) {
    console.log(`${failures[binding] ? 'MISSING' : 'ok'}\t${binding}\t${id}`);
  }
  if (Object.keys(failures).length > 0) process.exit(1);
}

const invokedAsScript =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  main().catch((e) => {
    console.error(`kv-namespaces: ${e.message}`);
    process.exit(1);
  });
}
