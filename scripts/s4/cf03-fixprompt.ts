// CF-03 fix prompt: endpoint → markdown (T-39).
// Happy: assembled mode ({result}) returns markdown; scanned mode ({url})
// scans first, then returns markdown.
// Failure: empty body → 400.

import { createCtx, seed, type Ctx } from './lib.ts';

const TINY_RESULT = { url: 'https://example.com', score: 30, tier: 'Heavy', patterns: [] };

export async function run(ctx: Ctx) {
  const post = (body: unknown) =>
    ctx.fetch('/api/fix-prompt', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  await ctx.step('happy: assembled mode returns markdown', async () => {
    const res = await post({ result: TINY_RESULT });
    ctx.assert(res.status === 200, `expected 200, got ${res.status}`);
    const text = await res.text();
    ctx.assert(text.length > 50, 'prompt body is substantial');
    ctx.assert(/example\.com|Heavy|30/.test(text), 'prompt references the result');
  });

  await ctx.step('happy: scanned mode scans, then returns markdown', async () => {
    const res = await post({ url: seed(ctx) });
    ctx.assert(res.status === 200, `expected 200, got ${res.status}`);
    const text = await res.text();
    ctx.assert(text.length > 50, 'prompt body is substantial');
  });

  await ctx.step('failure: empty body → 400', async () => {
    const res = await post({});
    ctx.assert(res.status === 400, `expected 400, got ${res.status}`);
  });
}

if (import.meta.main) {
  const ctx = createCtx('CF-03');
  await run(ctx);
  const failed = ctx.steps.filter((s) => s.status === 'fail').length;
  if (failed) process.exit(1);
}
