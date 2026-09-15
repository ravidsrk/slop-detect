#!/usr/bin/env bun
// KV backup / restore / verify for the slop-detect-web namespaces (T-08).
// Backend-agnostic core (memory backend in tests proves the round-trip);
// the Cloudflare API backend needs CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID
// (H-01) and namespace IDs from apps/web/wrangler.toml.
//
//   backup  [--out DIR] [--namespace binding|id]   # writes DIR/manifest.json + values
//   restore --in DIR [--namespace binding|id] [--apply]  # dry-run unless --apply
//   verify  --in DIR [--namespace binding|id]       # read-only: compare live vs backup
//
// Restore is upsert-only: it never deletes keys. Exits 0 on success, 2 on
// usage errors, 1 on operational failure.

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEBROOT = resolve(HERE, '..');
const CONCURRENCY = 5;
const MIN_TTL = 60;

export function readNamespaces() {
  const text = readFileSync(join(WEBROOT, 'wrangler.toml'), 'utf8');
  const out = {};
  const blocks = text.split('[[kv_namespaces]]').slice(1);
  for (const b of blocks) {
    const binding = b.match(/binding\s*=\s*"([^"]+)"/)?.[1];
    const id = b.match(/\bid\s*=\s*"([^"]+)"/)?.[1];
    if (binding && id) out[binding] = id;
  }
  return out;
}

export function resolveNamespace(ref) {
  const map = readNamespaces();
  if (map[ref]) return { binding: ref, id: map[ref] };
  const binding = Object.keys(map).find((b) => map[b] === ref);
  if (binding) return { binding, id: ref };
  throw new Error(
    `unknown namespace ${JSON.stringify(ref)} (want binding or id from wrangler.toml)`
  );
}

// ── Backends: { listKeys() -> [{name, expiration?}], getRaw(name) -> Buffer|null,
// ── putRaw(name, Buffer, {expirationTtl?}) } ──────────────────────────────────

export function memoryKv(seed = {}) {
  const store = new Map(Object.entries(seed));
  return {
    async listKeys() {
      return [...store.keys()].map((name) => ({ name }));
    },
    async getRaw(name) {
      const v = store.get(name);
      return v === undefined ? null : Buffer.from(v);
    },
    async putRaw(name, buf) {
      store.set(name, Buffer.from(buf));
    },
    store,
  };
}

export function cfApiKv({ token, accountId, namespaceId, fetchImpl = globalThis.fetch }) {
  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`;
  const headers = { Authorization: `Bearer ${token}` };
  async function req(path, init = {}) {
    const res = await fetchImpl(base + path, { ...init, headers });
    if (!res.ok) {
      const err = new Error(`CF API ${init.method || 'GET'} ${path}: ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res;
  }
  return {
    async listKeys() {
      const out = [];
      let cursor = null;
      for (;;) {
        const qs = new URLSearchParams({ limit: '1000', ...(cursor ? { cursor } : {}) });
        const res = await req(`/keys?${qs}`);
        const body = await res.json();
        if (!body.success)
          throw new Error(`CF API list keys failed: ${JSON.stringify(body.errors)}`);
        for (const k of body.result || []) out.push({ name: k.name, expiration: k.expiration });
        cursor = body.result_info?.cursor || null;
        const done = body.result_info?.list_complete ?? body.result_info?.count === 0;
        if (!cursor || done) break;
      }
      return out;
    },
    async getRaw(name) {
      try {
        const res = await req(`/values/${encodeURIComponent(name)}`);
        return Buffer.from(await res.arrayBuffer());
      } catch (e) {
        // Vanished between list and get: count as missing, don't abort the backup.
        if (e.status === 404) return null;
        throw e;
      }
    },
    async putRaw(name, buf, { expirationTtl } = {}) {
      const qs = expirationTtl
        ? `?expiration_ttl=${Math.max(MIN_TTL, Math.floor(expirationTtl))}`
        : '';
      await req(`/values/${encodeURIComponent(name)}${qs}`, { method: 'PUT', body: buf });
    },
  };
}

async function mapLimit(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    })
  );
  return out;
}

export function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

// ── Core (backend-agnostic) ──────────────────────────────────────────────────

export async function backupNamespace(kv, { binding, id }, outDir) {
  const keys = await kv.listKeys();
  const entries = await mapLimit(keys, CONCURRENCY, async ({ name, expiration }) => {
    const raw = await kv.getRaw(name);
    if (raw === null) return { name, missing: true };
    return {
      name,
      expiration: expiration ?? null,
      sha256: sha256(raw),
      base64: raw.toString('base64'),
    };
  });
  const present = entries.filter((e) => !e.missing);
  const manifest = {
    tool: 'kv-backup.mjs',
    binding,
    namespaceId: id,
    takenAt: new Date().toISOString(),
    keys: present.length,
    missing: entries.length - present.length,
    entries: present,
  };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

// Validate every entry BEFORE writing anything: schema, checksum, and target match.
// Throws on the first problem; the caller writes nothing until this returns.
export function validateManifest(manifest, target) {
  if (!manifest || !Array.isArray(manifest.entries))
    throw new Error('manifest has no entries array');
  if (target) {
    if (manifest.binding && manifest.binding !== target.binding) {
      throw new Error(
        `manifest is for ${manifest.binding}, target is ${target.binding} — refusing cross-namespace restore`
      );
    }
    if (manifest.namespaceId && manifest.namespaceId !== target.id) {
      throw new Error(
        'manifest namespaceId does not match target — refusing cross-namespace restore'
      );
    }
  }
  return manifest.entries.map((e, i) => {
    if (typeof e?.name !== 'string' || !e.name) throw new Error(`entry ${i}: bad name`);
    if (typeof e?.base64 !== 'string') throw new Error(`entry ${i} (${e.name}): bad base64`);
    let raw;
    try {
      raw = Buffer.from(e.base64, 'base64');
    } catch {
      throw new Error(`entry ${i} (${e.name}): undecodable base64`);
    }
    if (sha256(raw) !== e.sha256)
      throw new Error(
        `entry ${i} (${e.name}): checksum mismatch — manifest damaged, refusing to write`
      );
    return { ...e, raw };
  });
}

export async function restoreNamespace(kv, manifest, { apply = false, target = null } = {}) {
  const validated = validateManifest(manifest, target);
  const plan = { writes: 0, skippedExpired: 0, bytes: 0 };
  for (const e of validated) {
    // Re-evaluate expiry per write: short-lived keys that would come back with
    // less than a floor of life are skipped, never resurrected past their span.
    const remaining = e.expiration ? e.expiration - Math.floor(Date.now() / 1000) : null;
    if (remaining !== null && remaining < MIN_TTL) {
      plan.skippedExpired++;
      continue;
    }
    plan.writes++;
    plan.bytes += e.raw.length;
    if (apply) {
      await kv.putRaw(e.name, e.raw, remaining !== null ? { expirationTtl: remaining } : {});
    }
  }
  return plan;
}

export async function verifyNamespace(kv, manifest) {
  const live = new Map((await kv.listKeys()).map((k) => [k.name, k]));
  const mismatched = [];
  let checked = 0;
  for (const e of manifest.entries) {
    if (!live.has(e.name)) {
      mismatched.push({ name: e.name, reason: 'missing-live' });
      continue;
    }
    const raw = await kv.getRaw(e.name);
    checked++;
    if (raw === null || sha256(raw) !== e.sha256)
      mismatched.push({ name: e.name, reason: 'bytes-differ' });
  }
  return { checked, mismatched, liveKeys: live.size, backupKeys: manifest.entries.length };
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function usage(exit = 2) {
  console.error(
    'usage: kv-backup.mjs backup [--out DIR] [--namespace binding|id]\n' +
      '       kv-backup.mjs restore --in DIR [--namespace binding|id] [--apply]\n' +
      '       kv-backup.mjs verify --in DIR [--namespace binding|id]\n' +
      'env: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID'
  );
  process.exit(exit);
}

class UsageError extends Error {}

export function parseArgs(argv) {
  const cmd = argv[0];
  const o = {};
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--apply') o.apply = true;
    else if (argv[i] === '--out' || argv[i] === '--in' || argv[i] === '--namespace') {
      const v = argv[++i];
      // A missing or flag-shaped value must fail loudly: silently treating
      // `--namespace` with no value as "all namespaces" has written to the
      // wrong place in every tool that allowed it.
      if (v === undefined || v === '' || v.startsWith('--')) {
        throw new UsageError(`${argv[i - 1]} needs a value`);
      }
      o[argv[i - 1].slice(2)] = v;
    } else throw new UsageError(`unknown argument ${JSON.stringify(argv[i])}`);
  }
  return { cmd, o };
}

function liveKv(namespaceId) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !accountId) {
    console.error('missing CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID (see H-01)');
    process.exit(1);
  }
  return cfApiKv({ token, accountId, namespaceId });
}

async function main() {
  let cmd, o;
  try {
    ({ cmd, o } = parseArgs(process.argv.slice(2)));
  } catch (e) {
    if (e instanceof UsageError) {
      console.error(`kv-backup: ${e.message}`);
      usage();
    }
    throw e;
  }
  if (!['backup', 'restore', 'verify'].includes(cmd)) usage();
  const refs = o.namespace
    ? [resolveNamespace(o.namespace)]
    : Object.entries(readNamespaces()).map(([binding, id]) => ({ binding, id }));
  if (cmd === 'backup') {
    const root = resolve(o.out || `kv-backup-${new Date().toISOString().slice(0, 10)}`);
    for (const ref of refs) {
      const dir = join(root, ref.binding);
      const m = await backupNamespace(liveKv(ref.id), ref, dir);
      console.error(`backup ${ref.binding}: ${m.keys} keys (${m.missing} missing) -> ${dir}`);
    }
  } else {
    if (!o.in || !existsSync(o.in)) usage();
    let processed = 0;
    for (const ref of refs) {
      const dir = join(resolve(o.in), ref.binding);
      if (!existsSync(join(dir, 'manifest.json'))) {
        console.error(`skip ${ref.binding}: no manifest in ${dir}`);
        continue;
      }
      processed++;
      const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
      if (cmd === 'restore') {
        const plan = await restoreNamespace(liveKv(ref.id), manifest, {
          apply: !!o.apply,
          target: ref,
        });
        console.error(
          `restore ${ref.binding} ${o.apply ? 'APPLIED' : 'DRY-RUN'}: ${plan.writes} writes, ${plan.skippedExpired} skipped-expired, ${plan.bytes} bytes`
        );
      } else {
        const v = await verifyNamespace(liveKv(ref.id), manifest);
        console.error(
          `verify ${ref.binding}: ${v.checked} checked, ${v.mismatched.length} mismatched (live ${v.liveKeys}, backup ${v.backupKeys})`
        );
        for (const m of v.mismatched.slice(0, 20)) console.error(`  ${m.reason} ${m.name}`);
        if (v.mismatched.length) process.exit(1);
      }
    }
    // An input dir with no usable manifests must fail, never report success.
    if (!processed) {
      console.error(
        `kv-backup: no manifests found under ${resolve(o.in)} for the selected namespace(s)`
      );
      process.exit(1);
    }
  }
}

const invokedAsScript =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  main().catch((e) => {
    console.error(`kv-backup: ${e.message}`);
    process.exit(1);
  });
}
