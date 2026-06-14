// check_design_system tool — the API client body and the formatter output.

import { test, expect, afterEach } from 'vitest';
import { checkSystem } from '../src/api.ts';
import { formatSystem } from '../src/format.ts';

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
});

test('checkSystem posts designMd:true (auto) with share:false by default', async () => {
  let seen = null;
  global.fetch = async (url, opts) => {
    seen = { url: String(url), body: JSON.parse(opts.body) };
    return { ok: true, status: 200, json: async () => ({ system: { declared: true } }) };
  };
  await checkSystem('https://example.com');
  expect(seen.url).toMatch(/\/api\/scan$/);
  expect(seen.body.designMd).toBe(true);
  expect(seen.body.share).toBe(false);
});

test('checkSystem passes an explicit DESIGN.md URL through', async () => {
  let seen = null;
  global.fetch = async (_u, opts) => {
    seen = JSON.parse(opts.body);
    return { ok: true, status: 200, json: async () => ({}) };
  };
  await checkSystem('https://example.com', 'https://example.com/brand/DESIGN.md');
  expect(seen.designMd).toBe('https://example.com/brand/DESIGN.md');
});

test('formatSystem renders score, tier, drift items, and the polarity reminder', () => {
  const out = formatSystem({
    system: {
      declared: true,
      name: 'Heritage',
      score: 55,
      tier: 'Drifting',
      checksEvaluated: 5,
      checksSkipped: 0,
      source: 'https://example.com/DESIGN.md',
      drift: [{ id: 'fonts.declared', message: 'font(s) in use but not in the system: inter' }],
    },
  });
  expect(out).toMatch(/55\/100/);
  expect(out).toMatch(/HIGHER is better/);
  expect(out).toMatch(/Drifting/);
  expect(out).toMatch(/inter \(fonts\.declared\)/);
  expect(out).toMatch(/not a verdict/i);
});

test('formatSystem explains the no-system state with how to fix it', () => {
  const out = formatSystem({
    system: {
      declared: false,
      message: 'No parseable DESIGN.md tokens — nothing to check against.',
    },
  });
  expect(out).toMatch(/NO SYSTEM DECLARED/);
  expect(out).toMatch(/publish a DESIGN\.md/);
});