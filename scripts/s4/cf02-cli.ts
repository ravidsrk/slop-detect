// CF-02 CLI scan: slop <url> → terminal/JSON (T-39).
// Uses --remote (no local Chromium needed) against the S4 target base.
// Happy: --json returns a scored result, exit 0.
// Failure: unscannable URL fails the --fail-on gate (exit 1); a bogus
// --fail-on value is a usage error (exit 2). (Plain garbage exits 0 with an
// {error} payload by design — errors fail gates, not invocations.)

import { existsSync } from 'node:fs';
import path from 'node:path';
import { createCtx, paceScan, seed, type Ctx } from './lib.ts';

const BIN = path.join(process.cwd(), 'packages', 'cli', 'dist', 'bin', 'slop.js');

export async function run(ctx: Ctx) {
  // Fail fast on direct runs (`bun run s4` builds first; raw bun does not).
  ctx.assert(existsSync(BIN), `CLI build missing at ${BIN} — run: bun run build`);
  const env = { SLOP_API: ctx.base };

  await ctx.step('happy: remote JSON scan exits 0 with a scored result', async () => {
    await paceScan(); // the child's /api/scan POST consumes scan budget
    const r = await ctx.runBin('node', [BIN, seed(ctx), '--json', '--remote'], { env });
    ctx.assert(r.code === 0, `expected exit 0, got ${r.code}: ${r.stderr.slice(0, 300)}`);
    const body = JSON.parse(r.stdout);
    ctx.assert(typeof body.score === 'number', 'score is a number');
    ctx.assert(['Clean', 'Mild', 'Heavy'].includes(body.tier), `known tier, got ${body.tier}`);
  });

  await ctx.step('failure: unscannable URL fails the --fail-on gate (exit 1)', async () => {
    await paceScan(); // CLI sends https://not-a-url; the API error consumes budget
    const r = await ctx.runBin(
      'node',
      [BIN, 'not-a-url', '--json', '--remote', '--fail-on', 'heavy'],
      {
        env,
      }
    );
    ctx.assert(r.code === 1, `expected exit 1, got ${r.code}: ${r.stderr.slice(0, 300)}`);
  });

  await ctx.step('failure: bogus --fail-on value → exit 2 usage error', async () => {
    // No paceScan: parse errors exit before any API call.
    const r = await ctx.runBin('node', [BIN, seed(ctx), '--remote', '--fail-on', 'bogus'], { env });
    ctx.assert(r.code === 2, `expected exit 2, got ${r.code}`);
    ctx.assert(/fail-on/i.test(r.stderr), 'usage error names --fail-on');
  });
}

if (import.meta.main) {
  const ctx = createCtx('CF-02');
  await run(ctx);
  const failed = ctx.steps.filter((s) => s.status === 'fail').length;
  if (failed) process.exit(1);
}
