// POST /api/fix-prompt
//
// Two modes:
//   1. Body has `{ result }` — caller already has a scan result, just assemble.
//   2. Body has `{ url }`    — re-run a scan, then assemble.
//
// Mode 1 is what the frontend uses (no double scan). Mode 2 is for CLI use:
//   curl -X POST -H 'content-type: application/json' \
//        -d '{"url":"https://example.com"}' \
//        https://slop-detector-8by.pages.dev/api/fix-prompt

import { buildFixPrompt } from '@slop-detect/core';
import { onRequestPost as scanHandler } from './scan.js';
import { deferFlowBump } from '../_shared.js';

// CORS + rate-limit handled by functions/api/_middleware.js.
// `scanImpl` is injectable for tests (same seam as _email's fetchImpl).
export async function onRequestPost({ request, env, waitUntil, scanImpl = scanHandler }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return text('Invalid JSON body', 400);
  }

  let result = body?.result;
  const scannedMode = !result && !!body?.url;

  // Guard against the body-peek bypass: if middleware admitted this request as
  // cheap-only (oversized >64KB or chunked without Content-Length), refuse to
  // drive an ungated browser scan in-process.
  if (scannedMode && request.headers?.get?.('x-slop-fixprompt-mode') === 'cheap') {
    return text(
      'URL-mode /api/fix-prompt requests must include Content-Length <= 64KB so scan limits can be enforced.',
      413
    );
  }

  // Mode 2: scan first. Forward axes/preset/designMd so a multi-axis fix prompt is
  // possible via { url, axes: ['design','copy'], designMd: 'auto' }.
  if (scannedMode) {
    const reqId = request.headers?.get?.('x-request-id');
    const scanHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (reqId) scanHeaders['X-Request-Id'] = reqId;
    const scanReq = new Request(request.url, {
      method: 'POST',
      headers: scanHeaders,
      body: JSON.stringify({
        url: body.url,
        axes: body.axes,
        preset: body.preset,
        designMd: body.designMd === 'auto' ? true : body.designMd,
        share: false,
      }),
    });
    const scanRes = await scanImpl({ request: scanReq, env, waitUntil });
    result = await scanRes.json();
    if (result.error) {
      const upstreamStatus =
        scanRes.status === 400 ||
        scanRes.status === 422 ||
        scanRes.status === 429 ||
        scanRes.status === 503
          ? scanRes.status
          : 502;
      return text(`Scan failed: ${result.error}`, upstreamStatus);
    }
  }

  if (!result || !Array.isArray(result.patterns)) {
    return text('Provide either a `result` (from /api/scan) or a `url` to scan.', 400);
  }

  const prompt = buildFixPrompt(result);
  // The inner scan runs share:false (no scan flow bump) — this event owns it.
  deferFlowBump(env, 'fixprompt', scannedMode ? 'scanned' : 'assembled', 1, waitUntil);
  const asJson =
    body?.format === 'json' || (request.headers.get('accept') || '').includes('application/json');

  if (asJson) {
    return new Response(
      JSON.stringify(
        {
          url: result.url,
          score: result.score,
          tier: result.tier,
          patternsFlagged: result.patternsFlagged,
          prompt,
        },
        null,
        2
      ),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(prompt, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

function text(s, status = 200) {
  return new Response(s, { status, headers: { 'Content-Type': 'text/plain' } });
}
