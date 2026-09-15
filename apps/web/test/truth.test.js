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
  // Greptile P2 on PR #181: discover every served text surface instead of
  // hardcoding four documents, so a new page can't smuggle a price in.
  const docs = [
    ['_ui.tsx', ui],
    ['README.md', readme],
  ];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const child = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (/\.(md|html|txt)$/.test(entry.name)) {
        docs.push([path.relative(WEB, child), fs.readFileSync(child, 'utf8')]);
      }
    }
  };
  walk(path.join(WEB, 'public'));
  // Allowlist (audited, not a hole): patterns.md quotes "$2M+" as a
  // stat-banner pattern EXAMPLE — copy evidence, not a price claim.
  const scrubbed = (name, doc) =>
    name.endsWith('api/patterns.md') ? doc.replace('"$2M+"', '"<redacted-example>"') : doc;
  for (const [name, doc] of docs) {
    const text = scrubbed(name, doc);
    expect(text, `${name} quotes no dollars`).not.toMatch(/\$\d/);
    expect(text, `${name} claims no per-month price`).not.toMatch(/\/mo\b/);
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

test('"daily sweep" claims pin the full config-dependent contract', () => {
  // index.html + README promise a daily re-scan. Greptile P2 on PR #181: a
  // cron alone doesn't prove sweeps — without CRON_SECRET the workflow
  // exits 0 having done nothing. So pin the whole chain: the daily
  // schedule, the skip-with-notice step (real code, not a comment), and
  // the RUNBOOKS caveat. The claim describes the configured service
  // (CRON_SECRET is H-02, launch-gating); this test proves the mechanism
  // and its documented off-state, not that prod is configured today.
  expect(landing).toMatch(/daily re-scan/i);
  const workflow = fs.readFileSync(
    path.join(ROOT, '.github', 'workflows', 'monitor-sweep.yml'),
    'utf8'
  );
  expect(workflow).toMatch(/cron:\s*'\d+ \d+ \* \* \*'/);
  expect(workflow).toMatch(/\[\s*-z\s*"\$CRON_SECRET"\s*\]/);
  expect(workflow).toMatch(/::notice::CRON_SECRET not set/);
  const runbooks = fs.readFileSync(path.join(ROOT, 'docs', 'RUNBOOKS.md'), 'utf8');
  expect(runbooks).toMatch(/monitor-sweep\.yml/);
  expect(runbooks).toMatch(/alerts can't fire if the sweep never runs/);
});

test('pricing links map href → target that exists', () => {
  // Greptile P2 on PR #181: validate the actual mappings, not substrings.
  // pricing.md → VALIDATION.md on main (the trial-rationale page agents read).
  const validationHref = pricing.match(/\((https:\/\/github\.com\/[^)]+VALIDATION\.md)\)/)[1];
  expect(validationHref).toBe('https://github.com/ravidsrk/slop-detect/blob/main/VALIDATION.md');
  expect(fs.existsSync(path.join(ROOT, 'VALIDATION.md'))).toBe(true);
  // _ui.tsx monitor fine print → /pricing.md (added by T-38) and /privacy.md.
  for (const href of ['/pricing.md', '/privacy.md']) {
    expect(ui).toContain(`href="${href}"`);
    expect(fs.existsSync(path.join(WEB, 'public', href.slice(1)))).toBe(true);
  }
});
