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

function failUsage(msg: string): never {
  console.error(`s4: ${msg}`);
  console.error(
    `Usage: bun scripts/s4/run.ts [--target <url>|--target=<url>] [--only <f>|--only=<f>]`
  );
  console.error(`Flows: ${Object.keys(FLOWS).join(', ')}`);
  process.exit(2);
}

// Both `--flag value` and `--flag=value`; unknown --flags are a usage error
// (a typo'd --target must never silently run the suite against production).
function argValue(flag: string): string | undefined {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === flag) {
      const v = args[i + 1];
      if (v === undefined || v.startsWith('--')) failUsage(`${flag} needs a value`);
      return v;
    }
    if (a.startsWith(flag + '=')) return a.slice(flag.length + 1);
  }
  return undefined;
}

const knownFlag = (a: string) =>
  a === '--target' || a.startsWith('--target=') || a === '--only' || a.startsWith('--only=');
for (const a of process.argv.slice(2)) {
  if (a.startsWith('--') && !knownFlag(a)) failUsage(`unknown flag ${a}`);
}

const target = argValue('--target');
if (target !== undefined) {
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    failUsage(`--target is not a URL: ${target}`);
  }
  if (!/^https?:$/.test(url!.protocol)) failUsage(`--target must be http(s): ${target}`);
  process.env.S4_BASE = target;
}
const onlyRaw = argValue('--only');
let names = Object.keys(FLOWS);
if (onlyRaw !== undefined) {
  const only = onlyRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const unknown = only.filter((n) => !FLOWS[n]);
  if (unknown.length) failUsage(`unknown flow(s): ${unknown.join(', ')}`);
  if (!only.length) failUsage('--only needs at least one flow');
  names = only;
}
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
    // An exception outside ctx.step() (setup code, a bug in the flow): record
    // it as a failure, never swallow it into a PASS.
    const detail = e instanceof Error ? e.message : String(e);
    ctx.steps.push({ flow: ctx.flow, step: 'harness error', status: 'fail', ms: 0, detail });
    console.error(`[${name}] harness error: ${detail}`);
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
