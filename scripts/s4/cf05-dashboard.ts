// CF-05 dashboard: magic link → session → dashboard (T-39).
// Executable without secrets: link request shape, login form, bad-token page.
// Page + link steps SKIP with reason when the target fail-closes (503: no
// email provider / SESSION_SECRET, e.g. current prod per H-02); full mint
// needs mailbox access → SKIP (dashboard.test.js owns all three).

import { createCtx, type Ctx } from './lib.ts';

export async function run(ctx: Ctx) {
  // The link endpoint fail-closes with 503 dashboard_unavailable when the
  // target has no email provider / SESSION_SECRET (known prod state, H-02).
  // That is correct behavior, not a flow failure — skip with the reason.
  const link = async (email: string): Promise<Response> => {
    const res = await ctx.fetch('/api/dashboard/link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (res.status === 503) {
      const body = await res.json().catch(() => ({}));
      ctx.assert(
        body.error === 'dashboard_unavailable',
        `expected dashboard_unavailable, got ${JSON.stringify(body).slice(0, 160)}`
      );
      ctx.skip(
        'target has no email provider/SESSION_SECRET (fail-closed 503); owned by dashboard.test.js'
      );
    }
    return res;
  };

  await ctx.step('happy: link request → 200 generic (anti-enumeration shape)', async () => {
    const res = await link('stranger@example.com');
    ctx.assert(res.status === 200, `expected 200, got ${res.status}`);
    const body = await res.json();
    ctx.assert(body.ok === true, 'ok true without revealing account existence');
  });

  // Same fail-closed contract for pages: every /dashboard GET 503s with the
  // "Dashboard not configured" view when SESSION_SECRET is absent.
  const dash = async (p: string): Promise<string> => {
    const res = await ctx.fetch(p);
    const html = await res.text();
    if (res.status === 503) {
      ctx.assert(/not configured/i.test(html), '503 is the documented not-configured view');
      ctx.skip('target has no SESSION_SECRET (fail-closed 503); owned by dashboard.test.js');
    }
    ctx.assert(res.status === 200, `expected 200, got ${res.status}`);
    return html;
  };

  await ctx.step('happy: /dashboard renders the login form', async () => {
    const html = await dash('/dashboard');
    ctx.assert(/sign in/i.test(html), 'login form present');
  });

  await ctx.step('failure: invalid email → 400', async () => {
    const res = await link('not-an-email');
    ctx.assert(res.status === 400, `expected 400, got ${res.status}`);
  });

  await ctx.step('failure: dead token → expired page', async () => {
    const html = await dash('/dashboard?token=deadbeef-dead-beef-dead-beefdeadbeef');
    ctx.assert(/expired|already used/i.test(html), 'expired-token page shown');
  });

  await ctx.step('full mint (needs mailbox access)', async () => {
    ctx.skip('magic-link email access required; covered by dashboard.test.js');
  });
}

if (import.meta.main) {
  const ctx = createCtx('CF-05');
  await run(ctx);
  const failed = ctx.steps.filter((s) => s.status === 'fail').length;
  if (failed) process.exit(1);
}
