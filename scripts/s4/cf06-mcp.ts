// CF-06 MCP tools: stdio server → tools/list + scan_page (T-39).
// Spawns the built server with SLOP_DETECT_API pointed at the S4 target.
// Happy: initialize → tools/list shows the 4 tools; scan_page scans.
// Failure: unknown tool → JSON-RPC error (isError).

import path from 'node:path';
import { spawn } from 'node:child_process';
import { createCtx, paceScan, seed, type Ctx } from './lib.ts';

const BIN = path.join(process.cwd(), 'packages', 'mcp', 'dist', 'bin', 'server.js');

function rpc(id: number, method: string, params = {}) {
  return JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
}

async function session(
  ctx: Ctx,
  calls: { method: string; params?: Record<string, unknown> }[]
): Promise<Map<number, any>> {
  const child = spawn('node', [BIN], {
    env: { ...process.env, SLOP_DETECT_API: ctx.base },
  });
  const out = new Map<number, any>();
  let buf = '';
  const done = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('MCP session timed out'));
    }, 90000);
    child.stdout.on('data', (d) => {
      buf += d.toString();
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line);
          if (typeof msg.id === 'number') out.set(msg.id, msg);
        } catch {
          /* stdio log line, not a frame */
        }
      }
      if (out.size >= calls.length + 1) {
        clearTimeout(timer);
        child.kill();
        resolve();
      }
    });
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on('close', () => {
      clearTimeout(timer);
      resolve();
    });
  });
  child.stdin.write(
    rpc(0, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 's4', version: '1' },
    })
  );
  calls.forEach((c, i) => child.stdin.write(rpc(i + 1, c.method, c.params)));
  await done;
  return out;
}

export async function run(ctx: Ctx) {
  await ctx.step('happy: tools/list exposes the 4 tools', async () => {
    const out = await session(ctx, [{ method: 'tools/list' }]);
    const tools = out.get(1)?.result?.tools ?? [];
    const names = tools.map((t: any) => t.name).sort();
    for (const name of ['check_aeo', 'check_design_system', 'fix_prompt', 'scan_page']) {
      ctx.assert(names.includes(name), `tool ${name} listed (got ${names.join(',')})`);
    }
  });

  await ctx.step('happy: scan_page scans via the target API', async () => {
    const target = seed(ctx);
    await paceScan(); // the child's /api/scan POST consumes scan budget
    const out = await session(ctx, [
      {
        method: 'tools/call',
        params: { name: 'scan_page', arguments: { url: target } },
      },
    ]);
    const res = out.get(1)?.result;
    ctx.assert(
      res && res.isError !== true,
      `scan_page ok, got ${JSON.stringify(res).slice(0, 200)}`
    );
    ctx.assert(
      JSON.stringify(res).includes(new URL(target).hostname),
      'result mentions the scanned host'
    );
  });

  await ctx.step('failure: unknown tool → isError', async () => {
    const out = await session(ctx, [
      { method: 'tools/call', params: { name: 'nope', arguments: {} } },
    ]);
    const res = out.get(1)?.result;
    ctx.assert(res && res.isError === true, 'unknown tool returns isError');
  });
}

if (import.meta.main) {
  const ctx = createCtx('CF-06');
  await run(ctx);
  const failed = ctx.steps.filter((s) => s.status === 'fail').length;
  if (failed) process.exit(1);
}
