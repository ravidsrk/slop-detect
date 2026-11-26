#!/usr/bin/env node
// Scores one local page with the Playwright runner in the slop-detect package
// and prints the scan-result JSON on stdout. It never calls slop-detect.com.
// From a terminal or CI: exit 0 when the page was scored, 2 when the scan could
// not run (that is not a Clean score).
//
// Use scan-regression.mjs (bin: slop-detect-hook) as the agent hook. Older
// recipes ran this file as the hook; with hook JSON on stdin it now prints
// nothing and always exits 0, so it can't spam or block an agent (#359).

import { firstLine, hookTarget, readHookInput } from './hook-input.mjs';

const input = await readHookInput();
const asHook = !!input;
const cwd = (input && typeof input.cwd === 'string' && input.cwd) || process.cwd();

function fail(message) {
  if (asHook) process.exit(0);
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

const target = hookTarget(process.argv, process.env, cwd);
if (!target) {
  fail(
    'Set SLOP_LOCAL_URL or pass a localhost or file URL. Scan could not run. This is not a Clean score. This hook does not call slop-detect.com.'
  );
}

const originalFetch = globalThis.fetch;
globalThis.fetch = async (request, init) => {
  const href =
    typeof request === 'string' ? request : request instanceof URL ? request.href : request.url;
  let host = '';
  let path = '';
  try {
    const url = new URL(href);
    host = url.hostname.toLowerCase();
    path = url.pathname;
  } catch {
    /* non-URL input falls through to fetch */
  }
  if ((host === 'slop-detect.com' || host === 'www.slop-detect.com') && path.startsWith('/api/')) {
    throw new Error(`Local hook refused ${href}`);
  }
  return originalFetch(request, init);
};

let scanUrl;
let stampScanResult;
try {
  ({ scanUrl } = await import('slop-detect'));
  const { importCore } = await import('./import-core.mjs');
  ({ stampScanResult } = await importCore());
} catch (err) {
  fail(
    `Scan could not run. This is not a Clean score. The slop-detect package (Playwright) is not installed next to slop-detect-mcp: run the hook with npx -y -p slop-detect -p slop-detect-mcp slop-detect-hook. (${firstLine(err && err.message ? err.message : err)})`
  );
}

let result;
try {
  result = stampScanResult(await scanUrl(target, { preset: 'full', axes: ['design'] }));
} catch (err) {
  fail(
    `Scan could not run. This is not a Clean score. ${firstLine(err && err.message ? err.message : err)}`
  );
}

if (asHook) process.exit(0);
const scored = !!result && !result.blocked && !result.error && typeof result.score === 'number';
if (!scored) process.stderr.write('Scan could not run. This is not a Clean score.\n');
// Exit from the write callback so a large JSON document isn't cut off on
// platforms where piped stdout is asynchronous.
process.stdout.write(`${JSON.stringify(result)}\n`, () => process.exit(scored ? 0 : 2));
