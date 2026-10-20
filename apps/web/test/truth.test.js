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
import { PATTERNS, COPY_PATTERNS, AEO_CHECKS, SYSTEM_CHECKS } from '@slop-detect/core';
import { onRequestGet as patternsGet } from '../functions/api/patterns.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url)); // apps/web/test
const WEB = path.join(HERE, '..'); // apps/web
const ROOT = path.join(HERE, '..', '..', '..'); // repo root

const ui = fs.readFileSync(path.join(WEB, 'functions', '_ui.tsx'), 'utf8');
const landing = fs.readFileSync(path.join(WEB, 'public', 'index.html'), 'utf8');
const pricing = fs.readFileSync(path.join(WEB, 'public', 'pricing.md'), 'utf8');
const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const agentsMd = fs.readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8');
const skillMd = fs.readFileSync(path.join(ROOT, 'skills', 'slop-detect', 'SKILL.md'), 'utf8');

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

test('pattern-count copy matches the live engine catalogue dynamically', async () => {
  // Derive expected counts from the engine registries (same source as /api/patterns).
  const expectedCountsFrom = (patterns, copyPatterns, aeoChecks, systemChecks) => ({
    design: patterns.length,
    copy: copyPatterns.length,
    aeo: aeoChecks.length,
    system: systemChecks.length,
  });
  const expected = expectedCountsFrom(PATTERNS, COPY_PATTERNS, AEO_CHECKS, SYSTEM_CHECKS);

  // Adding a pattern must change the expected count without editing the test.
  expect(
    expectedCountsFrom([...PATTERNS, { id: 'dummy' }], COPY_PATTERNS, AEO_CHECKS, SYSTEM_CHECKS)
      .design
  ).toBe(expected.design + 1);

  const apiData = await (await patternsGet()).json();
  expect(apiData.count).toBe(expected.design);
  expect(apiData.copyCount).toBe(expected.copy);
  expect(apiData.aeoCount).toBe(expected.aeo);
  expect(apiData.systemCount).toBe(expected.system);

  const n = (re, doc) => {
    const m = doc.match(re);
    return m ? Number(m[1]) : null;
  };
  expect(n(/(\d+)-pattern deterministic/, pricing)).toBe(expected.design);
  expect(n(/(\d+)-pattern deterministic/, landing)).toBe(expected.design);
  expect(n(/The (\d+) patterns/, readme)).toBe(expected.design);
  expect(n(/(\d+) design patterns/, agentsMd)).toBe(expected.design);
  expect(n(/(\d+) copy patterns/, agentsMd)).toBe(expected.copy);
  expect(n(/(\d+) AEO checks/, agentsMd)).toBe(expected.aeo);
  expect(n(/Axis 1: The (\d+) design patterns/, skillMd)).toBe(expected.design);
  expect(n(/Axis 2: The (\d+) copy patterns/, skillMd)).toBe(expected.copy);
  expect(n(/Axis 4: AEO readiness \((\d+) checks/, skillMd)).toBe(expected.aeo);

  // index.html must not hardcode "(9 tells)" or "10/27".
  expect(landing).not.toContain('(9 tells)');
  expect(landing).not.toMatch(/\b10\/27\b/);
});

test('docs do not tell users to install @slop-detect/core from npm and only name registered check/pattern IDs', () => {
  const corePkg = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'packages', 'core', 'package.json'), 'utf8')
  );
  // prepack rewrites @slop-detect/core -> slop-detect-core before npm publish
  expect(corePkg.scripts?.prepack || '').toContain('slop-detect-core');

  const badInstallRe =
    /(?:npm\s+(?:install|i|add)|pnpm\s+(?:add|i|install)|yarn\s+add|bun\s+(?:add|i|install)|npx(?:\s+-y)?)\s+@slop-detect\/core\b/i;
  expect(badInstallRe.test('npm install @slop-detect/core')).toBe(true);
  for (const [name, doc] of [
    ['README.md', readme],
    ['AGENTS.md', agentsMd],
    ['SKILL.md', skillMd],
  ]) {
    expect(doc, `${name} must not tell users to install @slop-detect/core from npm`).not.toMatch(
      badInstallRe
    );
  }

  // Registry validation: docs must not name a check or pattern ID that is not in the engine.
  const validPatternIds = new Set([
    ...PATTERNS.map((p) => p.id),
    ...COPY_PATTERNS.map((p) => p.id),
  ]);
  const validCheckIds = new Set([
    ...AEO_CHECKS.map((c) => c.id),
    ...SYSTEM_CHECKS.map((c) => c.id),
  ]);
  const validateDocIds = (doc) => {
    const unknown = [];
    // Dotted check IDs in backticks (e.g. `html.reachable`, `robots.aiAllowed`)
    for (const m of doc.matchAll(/`((?:html|bot|robots|md|site)\.[A-Za-z0-9_]+)`/g)) {
      if (m[1] === 'robots.txt') continue;
      if (!validCheckIds.has(m[1])) unknown.push(m[1]);
    }
    // Markdown table rows with backticked pattern/check IDs (`| 1 | \`slop_fonts\` |` or `| \`slop_fonts\` |`)
    for (const m of doc.matchAll(/^\|\s*(?:\d+\s*\|\s*)?`([a-z0-9_.]+)`\s*\|/gm)) {
      const id = m[1];
      if (
        !validPatternIds.has(id) &&
        !validCheckIds.has(id) &&
        !['full', 'strict', 'marketing', 'minimal'].includes(id)
      ) {
        unknown.push(id);
      }
    }
    return unknown;
  };

  expect(validateDocIds('Check `html.nonExistentCheck` and |\n| `fake_pattern_id` |')).toEqual([
    'html.nonExistentCheck',
    'fake_pattern_id',
  ]);

  for (const [name, doc] of [
    ['README.md', readme],
    ['AGENTS.md', agentsMd],
    ['SKILL.md', skillMd],
  ]) {
    expect(validateDocIds(doc), `${name} named unregistered check/pattern ID`).toEqual([]);
  }

  // README must not advertise unimplemented JSON-LD or SSR-prose AEO checks.
  expect(readme).not.toMatch(/AEO axis[^\n]*(?:JSON-LD|SSR prose)/i);
});

test('"daily sweep" claims pin the full config-dependent contract', () => {
  // index.html + README describe a daily re-scan AT LAUNCH (waitlist copy).
  // Greptile P2 on PR #181: a cron alone doesn't prove sweeps — the old
  // workflow exited 0 having done nothing, a green no-op. The off-state must
  // now be VISIBLE: scheduled runs are skipped unless MONITORING_ENABLED is
  // true, and a manual run without CRON_SECRET fails loudly. Pin the whole
  // chain plus the RUNBOOKS caveat; this proves the mechanism and its
  // documented off-state, not that prod is configured today.
  expect(landing).toMatch(/daily re-scan/i);
  expect(landing).toMatch(/waitlist/i);
  const workflow = fs.readFileSync(
    path.join(ROOT, '.github', 'workflows', 'monitor-sweep.yml'),
    'utf8'
  );
  expect(workflow).toMatch(/cron:\s*'\d+ \d+ \* \* \*'/);
  expect(workflow).toMatch(/\[\s*-z\s*"\$CRON_SECRET"\s*\]/);
  expect(workflow).toMatch(/vars\.MONITORING_ENABLED == 'true'/);
  expect(workflow).toMatch(/::error::CRON_SECRET not set/);
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
