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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); }
  catch { return text('Invalid JSON body', 400); }

  let result = body?.result;

  // Mode 2: scan first.
  if (!result && body?.url) {
    const scanReq = new Request(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: body.url })
    });
    const scanRes = await scanHandler({ request: scanReq, env });
    result = await scanRes.json();
    if (result.error) return text(`Scan failed: ${result.error}`, 502);
  }

  if (!result || !Array.isArray(result.patterns)) {
    return text('Provide either a `result` (from /api/scan) or a `url` to scan.', 400);
  }

  const prompt = buildFixPrompt(result);
  const asJson = body?.format === 'json' ||
    (request.headers.get('accept') || '').includes('application/json');

  if (asJson) {
    return new Response(JSON.stringify({
      url: result.url,
      score: result.score,
      tier: result.tier,
      patternsFlagged: result.patternsFlagged,
      prompt
    }, null, 2), {
      headers: { 'Content-Type': 'application/json', ...CORS }
    });
  }

  return new Response(prompt, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...CORS }
  });
}

function text(s, status = 200) {
  return new Response(s, { status, headers: { 'Content-Type': 'text/plain', ...CORS } });
}
