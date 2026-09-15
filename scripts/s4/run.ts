// S4 stranger-test runner: runs every CF-0X script against --target,
// writes scripts/s4/results.json, exits non-zero on any FAIL. Usage:
//   bun scripts/s4/run.ts --target https://<preview>.pages.dev
//   bun scripts/s4/run.ts --target https://slop-detect.com

import { writeFileSync } from 'node:fs';
import { createCtx, type Ctx } from './lib.ts';
import { run as cf01 } from './cf01-webscan.ts';
import { run as cf02 } from './cf02-cli.ts';
import { run as cf03 } from './cf03-fixprompt.ts';
import { run as cf04 } from './cf04-monitor.ts';
import { run as cf05 } from './cf05-dashboard.ts';
import { run as cf06 } from './cf06-mcp.ts';
import { run as cf07 } from './cf07-share.ts';

const FLOWS: Record<string, (ctx: Ctx) => Promise<void>> = {
  cf01: cf01,
  cf02: cf02,
  cf03: cf03,
  cf04: cf04,
  cf05: cf05,
  cf06: cf06,
  cf07: cf07,
};

const target = process.argv.find((a) => a.startsWith('--target='))?.split('=')[1];
if (target) process.env.S4_BASE = target;
const only = process.argv
  .find((a) => a.startsWith('--only='))
  ?.split('=')[1]
  ?.split(',');
const names = Object.keys(FLOWS).filter((n) => !only || only.includes(n));
const report: Record<string, unknown> = {
  target: '',
  startedAt: new Date().toISOString(),
  flows: {},
};
let failures = 0;

// Scan-budget pacing lives in lib.paceScan (bursts of ≤3, then a 61s+ idle),
// so flows can run back-to-back here.
for (const name of names) {
  const ctx = createCtx(name.toUpperCase().replace('CF', 'CF-'));
  report.target = ctx.base;
  try {
    await FLOWS[name](ctx);
  } catch (e) {
    console.error(`[${name}] harness error: ${(e as Error).message}`);
  }
  (report.flows as Record<string, unknown>)[name] = ctx.steps;
  const failed = ctx.steps.filter((s) => s.status === 'fail').length;
  const skipped = ctx.steps.filter((s) => s.status === 'skip').length;
  failures += failed;
  console.log(
    `--- ${name}: ${ctx.steps.length - failed - skipped} pass, ${skipped} skip, ${failed} fail`
  );
}

report.finishedAt = new Date().toISOString();
writeFileSync(new URL('./results.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(failures ? `S4 RESULT: FAIL (${failures} failing steps)` : 'S4 RESULT: PASS');
process.exit(failures ? 1 : 0);
