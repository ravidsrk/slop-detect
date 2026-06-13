// SSRF: runAeoChecks must follow redirects MANUALLY and re-validate each hop
// when given an isUrlAllowed hook, so a public URL can't bounce the fetcher to
// an internal host.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runAeoChecks } from '../src/aeo.js';

// A fetch mock that 302-redirects the main page to cloud-metadata, and returns
// a benign 200 for everything else (robots/llms/md/etc.).
function makeRedirectingFetch(spy) {
  return async (url, init) => {
    spy.push(url);
    if (url === 'https://victim.example/') {
      return new Response(null, {
        status: 302,
        headers: { location: 'http://169.254.169.254/latest/meta-data/' },
      });
    }
    return new Response('ok', { status: 200, headers: { 'content-type': 'text/plain' } });
  };
}

const blockInternal = (u) => !/169\.254\.|localhost|127\.0\.0\.1|\[::1\]/.test(u);

test('runAeoChecks blocks a redirect to an internal host (no internal fetch)', async () => {
  const seen = [];
  const report = await runAeoChecks('https://victim.example/', {
    fetchImpl: makeRedirectingFetch(seen),
    isUrlAllowed: blockInternal,
    timeoutMs: 2000,
  });
  // The internal metadata host must never have been fetched.
  assert.ok(!seen.some((u) => u.includes('169.254.169.254')), 'must not fetch the internal host');
  // And the reachability check should have failed (blocked), not silently passed.
  const reachable = report.checks.find((c) => c.id === 'html.reachable');
  assert.equal(reachable.passed, false, 'blocked redirect → not reachable');
});

test('without isUrlAllowed, behavior is unchanged (auto-follow)', async () => {
  // A simple 200 with no redirect — sanity that the default path still works.
  const fetchImpl = async () =>
    new Response('<html><title>x</title></html>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    });
  const report = await runAeoChecks('https://ok.example/', { fetchImpl, timeoutMs: 2000 });
  assert.equal(report.checks.find((c) => c.id === 'html.reachable').passed, true);
});
