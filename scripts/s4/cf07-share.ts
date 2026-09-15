// CF-07 share surfaces: /r /score /api + cards (T-39).
// Happy: scan once, then the permalink, score page, patterns catalogue,
// and OG card all resolve. Failure: unknown result id → 404.

import { createCtx, seed, type Ctx } from './lib.ts';

export async function run(ctx: Ctx) {
  let id: string | null = null;
  const host = new URL(seed(ctx)).hostname;

  await ctx.step('happy: scan to seed share surfaces', async () => {
    const res = await ctx.fetch('/api/scan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: seed(ctx) }),
    });
    ctx.assert(res.status === 200, `expected 200, got ${res.status}`);
    id = (await res.json()).id;
    ctx.assert(typeof id === 'string' && id.length > 0, 'result id present');
  });

  await ctx.step(`happy: /r/:id + /score/${host} resolve`, async () => {
    const r = await ctx.fetch(`/r/${id}`);
    ctx.assert(r.status === 200, `expected /r 200, got ${r.status}`);
    const s = await ctx.fetch(`/score/${host}`);
    ctx.assert(s.status === 200, `expected /score 200, got ${s.status}`);
  });

  await ctx.step('happy: /api/patterns serves the live catalogue', async () => {
    const res = await ctx.fetch('/api/patterns');
    ctx.assert(res.status === 200, `expected 200, got ${res.status}`);
    const body = await res.json();
    const count = body.count ?? body.patterns?.length ?? body.length;
    ctx.assert(typeof count === 'number' && count > 0, `pattern count present, got ${count}`);
  });

  await ctx.step('happy: /og/:id.png renders a card (or documented /og.png fallback)', async () => {
    const res = await ctx.fetch(`/og/${id}.png`, { redirect: 'manual' });
    ctx.assert([200, 302].includes(res.status), `expected 200 or 302, got ${res.status}`);
    if (res.status === 302) {
      ctx.assert(
        (res.headers.get('location') || '').endsWith('/og.png'),
        'fallback redirects to /og.png'
      );
    } else {
      ctx.assert((res.headers.get('content-type') || '').includes('image'), 'content is an image');
    }
  });

  await ctx.step('failure: unknown result id → 404', async () => {
    const res = await ctx.fetch('/r/s4-does-not-exist-0000');
    ctx.assert(res.status === 404, `expected 404, got ${res.status}`);
  });
}

if (import.meta.main) {
  const ctx = createCtx('CF-07');
  await run(ctx);
  const failed = ctx.steps.filter((s) => s.status === 'fail').length;
  if (failed) process.exit(1);
}
