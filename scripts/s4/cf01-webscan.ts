// CF-01 web scan: index → POST /api/scan → /r/:id (T-39).
// Happy: a real scan returns a scored result + a shareable permalink.
// Failure: SSRF-blocked target → 400; empty body → 400.

import { createCtx, seed, type Ctx } from './lib.ts';

export async function run(ctx: Ctx) {
  let id: string | null = null;
  const target = seed(ctx);
  const host = new URL(target).hostname;

  await ctx.step(`happy: scan ${host} returns a scored result`, async () => {
    const res = await ctx.fetch('/api/scan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: target }),
    });
    ctx.assert(res.status === 200, `expected 200, got ${res.status}`);
    const body = await res.json();
    ctx.assert(typeof body.score === 'number', 'score is a number');
    ctx.assert(['Clean', 'Mild', 'Heavy'].includes(body.tier), `known tier, got ${body.tier}`);
    ctx.assert(Array.isArray(body.patterns), 'patterns array present');
    ctx.assert(typeof body.id === 'string' && body.id.length > 0, 'result id present');
    id = body.id;
  });

  await ctx.step('happy: /r/:id permalink renders the result', async () => {
    const res = await ctx.fetch(`/r/${id}`);
    ctx.assert(res.status === 200, `expected 200, got ${res.status}`);
    const html = await res.text();
    ctx.assert(html.includes(host), 'permalink mentions the scanned domain');
  });

  await ctx.step('failure: SSRF-blocked target → 400, nothing scanned', async () => {
    const res = await ctx.fetch('/api/scan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'http://localhost:9/internal' }),
    });
    ctx.assert(res.status === 400, `expected 400, got ${res.status}`);
  });

  await ctx.step('failure: empty body → 400', async () => {
    const res = await ctx.fetch('/api/scan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    ctx.assert(res.status === 400, `expected 400, got ${res.status}`);
  });
}

if (import.meta.main) {
  const ctx = createCtx('CF-01');
  await run(ctx);
  const failed = ctx.steps.filter((s) => s.status === 'fail').length;
  if (failed) process.exit(1);
}
