// T-38: landing/pricing truthfulness guard (G-42). Marketing copy lies by
// default — prices go stale, counts drift, schedules change. Every checkable
// claim below is pinned to the code that grounds it, so the next drift fails
// loudly instead of charging users for a plan that doesn't exist (the
// $29–$149/mo line this task deleted was live and wrong: monitoring is a
// free validation trial, and $29 is the post-launch plan in #102).

import { test, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PATTERNS, COPY_PATTERNS, AEO_CHECKS } from '@slop-detect/core';

const HERE = path.dirname(fileURLToPath(import.meta.url)); // apps/web/test
const WEB = path.join(HERE, '..'); // apps/web
const ROOT = path.join(HERE, '..', '..', '..'); // repo root

const ui = fs.readFileSync(path.join(WEB, 'functions', '_ui.tsx'), 'utf8');
const landing = fs.readFileSync(path.join(WEB, 'public', 'index.html'), 'utf8');
const pricing = fs.readFileSync(path.join(WEB, 'public', 'pricing.md'), 'utf8');
const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');

test('no live price is quoted anywhere (monitoring is a free validation trial)', () => {
  // pricing.md is the single source of pricing truth: trial, free during
  // validation. Any dollar figure or per-month claim elsewhere is stale.
  for (const [name, doc] of [
    ['_ui.tsx', ui],
    ['index.html', landing],
    ['pricing.md', pricing],
    ['README.md', readme],
  ]) {
    expect(doc, `${name} quotes no dollars`).not.toMatch(/\$\d/);
    expect(doc, `${name} claims no per-month price`).not.toMatch(/\/mo\b/);
  }
  expect(pricing).toMatch(/free during validation/i);
  expect(ui).toMatch(/free during validation/);
});

test('pattern-count copy matches the live engine catalogue', () => {
  // AGENTS.md: counts are served dynamically and never hardcoded — but the
  // marketing adjectives ("27-pattern fingerprint") exist in prose, so pin
  // them to the arrays instead of trusting memory.
  const n = (re, doc) => {
    const m = doc.match(re);
    return m ? Number(m[1]) : null;
  };
  expect(n(/(\d+)-pattern deterministic/, pricing)).toBe(PATTERNS.length);
  expect(n(/(\d+)-pattern deterministic/, landing)).toBe(PATTERNS.length);
  expect(n(/The (\d+) patterns/, readme)).toBe(PATTERNS.length);
  expect(PATTERNS.length).toBe(27);
  expect(COPY_PATTERNS.length).toBe(9);
  expect(AEO_CHECKS.length).toBe(8);
});

test('"daily sweep" claims are backed by a scheduled trigger', () => {
  // index.html + README promise a daily re-scan; monitor-sweep.yml owns the
  // schedule (daily 08:17 UTC, disabled-by-default without CRON_SECRET —
  // RUNBOOKS documents the caveat, so the claim holds when enabled).
  expect(landing).toMatch(/daily re-scan/i);
  const workflow = fs.readFileSync(
    path.join(ROOT, '.github', 'workflows', 'monitor-sweep.yml'),
    'utf8'
  );
  expect(workflow).toMatch(/cron:\s*'\d+ \d+ \* \* \*'/);
  const runbooks = fs.readFileSync(path.join(ROOT, 'docs', 'RUNBOOKS.md'), 'utf8');
  expect(runbooks).toMatch(/monitor-sweep\.yml/);
});

test('pricing page links resolve to files that exist', () => {
  // pricing.md points agents at VALIDATION.md for the trial rationale — a
  // dead link there breaks the one page agents read before recommending us.
  expect(fs.existsSync(path.join(ROOT, 'VALIDATION.md'))).toBe(true);
  expect(pricing).toMatch(/slop-detect\.com\/dashboard/);
});
