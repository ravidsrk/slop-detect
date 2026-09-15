// CF-04 watch/monitor: register → confirm → sweep → alert (T-39).
// Executable without secrets: subscribe → unsubscribe roundtrip (self-cleaning),
// email-mismatch 403, sweep 401 without auth. Confirm + alert delivery need
// email/token access, so they SKIP here with reason — monitor-flow integration
// tests own those transitions (see apps/web/test/monitor-flow.test.js).

import { createCtx, type Ctx } from './lib.ts';

export async function run(ctx: Ctx) {
  const stamp = Date.now().toString(36);
  const domain = `s4-${stamp}.example.com`;
  const email = `s4-${stamp}@slop-detect.com`;
  const post = (body: unknown) =>
    ctx.fetch('/api/watch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  await ctx.step('happy: subscribe → 201 with monitoring:true', async () => {
    const res = await post({ domain, email });
    ctx.assert(res.status === 201, `expected 201, got ${res.status}`);
    const body = await res.json();
    ctx.assert(body.monitoring === true, 'monitoring true');
  });

  await ctx.step('happy: unsubscribe (email match) cleans up → true', async () => {
    const res = await post({ domain, email, unsubscribe: true });
    const body = await res.json();
    ctx.assert(body.unsubscribed === true, 'unsubscribed true (self-cleaning)');
  });

  await ctx.step('failure: unsubscribe with wrong email → 403', async () => {
    await post({ domain, email });
    const res = await post({ domain, email: 'stranger@evil.example.com', unsubscribe: true });
    ctx.assert(res.status === 403, `expected 403, got ${res.status}`);
    await post({ domain, email, unsubscribe: true }); // self-clean
  });

  await ctx.step(
    'failure: sweep without auth never executes (401, or 503 if sweep unconfigured)',
    async () => {
      const res = await ctx.fetch('/api/cron/sweep', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      ctx.assert([401, 503].includes(res.status), `expected 401 or 503, got ${res.status}`);
    }
  );

  await ctx.step('confirm + alert delivery (needs email access)', async () => {
    ctx.skip('token + mailbox access required; covered by monitor-flow.test.js chain');
  });
}

if (import.meta.main) {
  const ctx = createCtx('CF-04');
  await run(ctx);
  const failed = ctx.steps.filter((s) => s.status === 'fail').length;
  if (failed) process.exit(1);
}
