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

// Both report() shapes: single-line report(env, 'level', 'event', …) —
// including calls whose argument list continues on later lines — and
// multi-line with 'level', and 'event', on their own lines.
const SINGLE_CALL = /report\(\s*[^,]+,\s*'(error|warn|info)'\s*,\s*'([a-zA-Z0-9_]+)'/;
const LEVEL_LINE = /^\s*'(error|warn|info)',\s*$/;
const EVENT_LINE = /^\s*'([a-zA-Z0-9_]+)',\s*$/;

// Resolve the event for ONE call site (0-based line index). Returns null
// when the site uses a shape this guard doesn't understand — which must
// fail the suite (see below), never slip through silently.
function resolveSiteEvent(lines, site) {
  const inline = lines[site].match(SINGLE_CALL);
  if (inline) return inline[2];
  for (let i = site + 1; i <= Math.min(site + 4, lines.length - 1); i++) {
    if (!LEVEL_LINE.test(lines[i])) continue;
    for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
      const em = lines[j].match(EVENT_LINE);
      if (em) return em[1];
    }
  }
  return null;
}

function stripLineComments(source) {
  return source.split('\n').map((l) => l.replace(/\/\/.*$/, ''));
}

function reportCallSites(strippedLines) {
  const sites = [];
  strippedLines.forEach((line, i) => {
    const re = /(^|[^\w$.])report\(/g;
    while (re.exec(line)) sites.push(i);
  });
  return sites;
}

test('every report() event in code is documented in docs/ALERTS.md', () => {
  const found = new Set();
  const unresolved = [];
  // _report.ts excluded: it defines report() (+ a usage comment), no events.
  for (const file of walk(FUNCTIONS_ROOT).filter((p) => !p.endsWith('/_report.ts'))) {
    const lines = stripLineComments(fs.readFileSync(file, 'utf8'));
    for (const site of reportCallSites(lines)) {
      const event = resolveSiteEvent(lines, site);
      if (event) found.add(event);
      else unresolved.push(`${path.relative(FUNCTIONS_ROOT, file)}:${site + 1}`);
    }
  }
  // Airtightness, inverted: a call site the guard can't resolve (constant,
  // template, double quotes, new layout) FAILS here instead of evading the
  // coverage check below. Extend resolveSiteEvent, don't delete the site.
  expect(unresolved, `unresolvable report() call sites: ${unresolved.join(', ')}`).toEqual([]);
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

test('every /api/* route in the ops docs maps to a route file', () => {
  const runbooks = ['RUNBOOKS.md', 'STAGING.md', 'ROLLBACK.md']
    .map((p) => fs.readFileSync(path.join(DOCS_ROOT, p), 'utf8'))
    .join('\n');
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

test('every workflow referenced in the ops docs exists', () => {
  const pages = ['RUNBOOKS.md', 'STAGING.md', 'ROLLBACK.md'];
  const bodies = pages.map((p) => fs.readFileSync(path.join(DOCS_ROOT, p), 'utf8')).join('\n');
  // With or without backticks: a bare `preview.yml` mention is still an
  // operational reference, and must still resolve (or be reworded).
  const workflows = [...new Set([...bodies.matchAll(/([a-z0-9-]+\.yml)/g)].map((m) => m[1]))];
  expect(workflows.length).toBeGreaterThan(0);
  for (const w of workflows) {
    const p = path.join(DOCS_ROOT, '..', '.github', 'workflows', w);
    expect(fs.existsSync(p), `ops docs reference missing workflow ${w}`).toBe(true);
  }
});

test('every .md link in the ops docs resolves to a file', () => {
  const pages = [
    'ALERTS.md',
    'RUNBOOKS.md',
    'CAPACITY.md',
    'RECOVERY.md',
    'STAGING.md',
    'ROLLBACK.md',
  ];
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
