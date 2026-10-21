#!/usr/bin/env node
// Hook command for a local dev server. Uses the Playwright runner in
// slop-detect. Fetches of the hosted /api/* surface throw. Stdout is one
// scan-result JSON document. Exit 0 when the page was scored. Exit 2 when
// the scan could not run (that is not a Clean score).

const target = process.argv[2] || process.env.SLOP_LOCAL_URL || '';
if (!target) {
  process.stderr.write(
    'Set SLOP_LOCAL_URL or pass a localhost or file URL. Scan could not run. This is not a Clean score. This hook does not call slop-detect.com.\n'
  );
  process.exit(2);
}

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
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
  return originalFetch(input, init);
};

const { scanUrl } = await import('slop-detect');
const { stampScanResult } = await import('@slop-detect/core');

let result;
try {
  result = stampScanResult(await scanUrl(target, { preset: 'full', axes: ['design'] }));
} catch (err) {
  process.stderr.write(
    `Scan could not run. This is not a Clean score. ${err && err.message ? err.message : err}\n`
  );
  process.exit(2);
}

process.stdout.write(`${JSON.stringify(result)}\n`);
if (!result || result.blocked || result.error || typeof result.score !== 'number') {
  process.stderr.write('Scan could not run. This is not a Clean score.\n');
  process.exit(2);
}
process.exit(0);
