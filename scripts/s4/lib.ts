// S4 evidence-harness library (T-39, G-26). Every flow script runs through
// this context: named steps with timing, hard assertions (a script that
// can't fail proves nothing — prove-it's mutation-audit spirit), recorded
// skips with reasons (never fake-passes), and JSONL evidence per flow.
//
// Usage (each scripts/s4/cfNN-*.ts):
//   import { createCtx } from './lib.ts';
//   export async function run(ctx) { ... }
//   if (import.meta.main) { const ctx = createCtx('CF-01'); await run(ctx); ... }

import { spawn } from 'node:child_process';

export type StepStatus = 'pass' | 'fail' | 'skip';

export interface StepRec {
  flow: string;
  step: string;
  status: StepStatus;
  ms: number;
  detail?: string;
}

export class SkipSignal extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'SkipSignal';
  }
}

export class AssertFailed extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertFailed';
  }
}

export interface Ctx {
  flow: string;
  base: string;
  steps: StepRec[];
  log(msg: string): void;
  step<T>(name: string, fn: () => Promise<T>): Promise<T>;
  skip(reason: string): never;
  assert(cond: unknown, msg: string): asserts cond;
  fetch(path: string, init?: RequestInit): Promise<Response>;
  runBin(
    cmd: string,
    args: string[],
    opts?: { env?: Record<string, string>; timeoutMs?: number }
  ): Promise<{
    code: number;
    stdout: string;
    stderr: string;
  }>;
}

export function baseUrl(): string {
  return (process.env.S4_BASE || 'https://slop-detect.com').replace(/\/$/, '');
}

/** Scannable seed URL: S4_SEED_URL override, else the target's own homepage.
 *  (example.com is NOT scannable — the engine 422s it as an empty page.) */
export function seed(ctx: Ctx): string {
  return process.env.S4_SEED_URL || ctx.base + '/';
}

// Scan-bucket pacer. No-origin callers (scripts, CLI, MCP — everything S4
// uses) get 3 scan-bucket hits per 60s (_middleware.ts), the gate runs
// pre-validation so even 400s consume budget, and each allowed hit RESETS the
// counter's 60s TTL — so steady pacing never recovers; only bursts of ≤3
// followed by a full 61s+ idle do. Every scan-bucket hit in the suite goes
// through paceScan(), which enforces exactly that. Subprocess flows (cf02,
// cf06) call it explicitly since their HTTP happens inside the child.
const hitTimes: number[] = [];
const SCAN_WINDOW_MS = 61000;
const SCAN_BURST = 3;

export async function paceScan(): Promise<void> {
  for (;;) {
    // Mirror the KV counter exactly: n = hits since the most recent ≥61s gap
    // (each allowed hit resets the 60s TTL, so the idle must follow the LAST
    // hit, not the oldest — trailing-window counting under-waits and 429s).
    const now = Date.now();
    let n = 0;
    let prev = now;
    for (let i = hitTimes.length - 1; i >= 0; i--) {
      if (prev - hitTimes[i] >= SCAN_WINDOW_MS) break;
      n++;
      prev = hitTimes[i];
    }
    if (n < SCAN_BURST) break;
    const last = hitTimes[hitTimes.length - 1];
    const wait = last + SCAN_WINDOW_MS + 1000 - now;
    await new Promise((r) => setTimeout(r, Math.max(wait, 1000)));
  }
  hitTimes.push(Date.now());
  if (hitTimes.length > 10) hitTimes.splice(0, hitTimes.length - 10);
}

function isScanBucket(path: string, init: RequestInit): boolean {
  return init.method === 'POST' && (path === '/api/scan' || path.startsWith('/api/fix-prompt'));
}

export function createCtx(flow: string, base = baseUrl()): Ctx {
  const steps: StepRec[] = [];
  const log = (msg: string) => console.log(`[${flow}] ${msg}`);
  const ctx: Ctx = {
    flow,
    base,
    steps,
    log,
    assert(cond: unknown, msg: string): asserts cond {
      if (!cond) throw new AssertFailed(msg);
    },
    skip(reason: string): never {
      throw new SkipSignal(reason);
    },
    async step<T>(name: string, fn: () => Promise<T>): Promise<T> {
      const t0 = Date.now();
      log(`▸ ${name}`);
      try {
        const out = await fn();
        steps.push({ flow, step: name, status: 'pass', ms: Date.now() - t0 });
        log(`  ✓ ${name} (${Date.now() - t0}ms)`);
        return out;
      } catch (e) {
        if (e instanceof SkipSignal) {
          steps.push({ flow, step: name, status: 'skip', ms: Date.now() - t0, detail: e.message });
          log(`  ○ ${name} SKIP: ${e.message}`);
          return undefined as T;
        }
        const detail = e instanceof Error ? e.message : String(e);
        steps.push({ flow, step: name, status: 'fail', ms: Date.now() - t0, detail });
        log(`  ✗ ${name} FAIL: ${detail}`);
        throw e;
      }
    },
    async fetch(p: string, init: RequestInit = {}): Promise<Response> {
      if (isScanBucket(p, init)) await paceScan();
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 90000);
      try {
        return await fetch(new URL(p, base).toString(), { ...init, signal: ctrl.signal });
      } finally {
        clearTimeout(t);
      }
    },
    async runBin(cmd, args, opts = {}) {
      return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, {
          env: { ...process.env, ...opts.env },
          timeout: opts.timeoutMs || 120000,
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (d) => (stdout += d));
        child.stderr.on('data', (d) => (stderr += d));
        child.on('error', reject);
        child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
      });
    },
  };
  return ctx;
}
