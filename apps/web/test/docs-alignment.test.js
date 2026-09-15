// T-28: docs-alignment guard. Docs PRs rot the same way code does (see the
// T-24 test-count staleness greptile caught in PR #160), so the alignment
// that matters is pinned here, not trusted to memory:
//   1. every report() event in code is documented in docs/ALERTS.md, and
//   2. every /api/* route + every .md link in the ops docs resolves.

import { test, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)); // apps/web/test
const DOCS_ROOT = path.join(HERE, '..', '..', '..', 'docs'); // repo/docs
const FUNCTIONS_ROOT = path.join(HERE, '..', 'functions'); // apps/web/functions

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const child = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(child, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(child);
  }
  return out;
}

// Both report() shapes: single-line report(env, 'level', 'event', …) and
// multi-line with 'level', and 'event', on their own lines.
function extractReportEvents(source) {
  const events = new Set();
  const single = /report\(\s*[^,]+,\s*'(?:error|warn|info)'\s*,\s*'([a-zA-Z0-9_]+)'/g;
  let m;
  while ((m = single.exec(source))) events.add(m[1]);
  const lines = source.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    if (!/^\s*'(?:error|warn|info)',\s*$/.test(lines[i])) continue;
    for (let j = i + 1; j <= Math.min(i + 2, lines.length - 1); j++) {
      const em = lines[j].match(/^\s*'([a-zA-Z0-9_]+)',\s*$/);
      if (em) {
        events.add(em[1]);
        break;
      }
    }
  }
  return events;
}

test('every report() event in code is documented in docs/ALERTS.md', () => {
  const found = new Set();
  // _report.ts excluded: it only shows 'scan_failed' in a usage comment.
  for (const file of walk(FUNCTIONS_ROOT).filter((p) => !p.endsWith('/_report.ts'))) {
    for (const e of extractReportEvents(fs.readFileSync(file, 'utf8'))) found.add(e);
  }
  // Pin the extractor itself: these events exist today, so an empty or
  // partial extraction (e.g. a new call style) fails loudly instead of
  // passing vacuously.
  const known = [
    'scan_failed',
    'handler_threw',
    'health_kv_probe_failed',
    'persist_failed',
    'pattern_errors',
    'email_send_failed',
    'email_send_error',
    'email_retry',
    'email_skipped_no_provider',
    'monitor_sweep',
  ];
  for (const e of known) expect([...found], `extractor missed ${e}`).toContain(e);
  const alerts = fs.readFileSync(path.join(DOCS_ROOT, 'ALERTS.md'), 'utf8');
  for (const e of found) {
    expect(alerts.includes(`\`${e}\``), `docs/ALERTS.md never mentions \`${e}\``).toBe(true);
  }
});

test('every /api/* route in docs/RUNBOOKS.md maps to a route file', () => {
  const runbooks = fs.readFileSync(path.join(DOCS_ROOT, 'RUNBOOKS.md'), 'utf8');
  const routes = [...new Set([...runbooks.matchAll(/\/api\/[a-z0-9/_-]+/g)].map((m) => m[0]))];
  expect(routes.length).toBeGreaterThan(0);
  for (const route of routes) {
    const rel = route.replace(/^\/api\//, 'api/');
    const candidates = [`${rel}.ts`, `${rel}.tsx`].map((p) => path.join(FUNCTIONS_ROOT, p));
    const hit = candidates.some((p) => fs.existsSync(p));
    expect(
      hit,
      `${route} has no route file (${candidates.map((p) => path.basename(p)).join(' / ')})`
    ).toBe(true);
  }
});

test('every .md link in the ops docs resolves to a file', () => {
  const pages = ['ALERTS.md', 'RUNBOOKS.md', 'CAPACITY.md', 'RECOVERY.md'];
  let checked = 0;
  for (const page of pages) {
    const body = fs.readFileSync(path.join(DOCS_ROOT, page), 'utf8');
    for (const m of body.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = m[1];
      if (/^(https?:|#|mailto:)/.test(target)) continue;
      expect(fs.existsSync(path.join(DOCS_ROOT, target)), `${page} links missing ${target}`).toBe(
        true
      );
      checked++;
    }
  }
  expect(checked).toBeGreaterThan(0);
});
