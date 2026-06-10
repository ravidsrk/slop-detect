// check_design_system tool — the API client body and the formatter output.

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { checkSystem } from '../src/api.js';
import { formatSystem } from '../src/format.js';

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; });

test('checkSystem posts designMd:true (auto) with share:false by default', async () => {
  let seen = null;
  global.fetch = async (url, opts) => {
    seen = { url: String(url), body: JSON.parse(opts.body) };
    return { ok: true, status: 200, json: async () => ({ system: { declared: true } }) };
  };
  await checkSystem('https://example.com');
  assert.match(seen.url, /\/api\/scan$/);
  assert.equal(seen.body.designMd, true);
  assert.equal(seen.body.share, false, 'agent checks must not mint public permalinks');
});

test('checkSystem passes an explicit DESIGN.md URL through', async () => {
  let seen = null;
  global.fetch = async (_u, opts) => {
    seen = JSON.parse(opts.body);
    return { ok: true, status: 200, json: async () => ({}) };
  };
  await checkSystem('https://example.com', 'https://example.com/brand/DESIGN.md');
  assert.equal(seen.designMd, 'https://example.com/brand/DESIGN.md');
});

test('formatSystem renders score, tier, drift items, and the polarity reminder', () => {
  const out = formatSystem({
    system: {
      declared: true, name: 'Heritage', score: 55, tier: 'Drifting',
      checksEvaluated: 5, checksSkipped: 0, source: 'https://example.com/DESIGN.md',
      drift: [{ id: 'fonts.declared', message: 'font(s) in use but not in the system: inter' }]
    }
  });
  assert.match(out, /55\/100/);
  assert.match(out, /HIGHER is better/);
  assert.match(out, /Drifting/);
  assert.match(out, /inter \(fonts\.declared\)/);
  assert.match(out, /not a verdict/i);
});

test('formatSystem explains the no-system state with how to fix it', () => {
  const out = formatSystem({ system: { declared: false, message: 'No parseable DESIGN.md tokens — nothing to check against.' } });
  assert.match(out, /NO SYSTEM DECLARED/);
  assert.match(out, /publish a DESIGN\.md/);
});
