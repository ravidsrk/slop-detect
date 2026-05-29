// POST /api/aeo  { url }  →  AEO conformance report
//
// Runs the AEO axis — "can AI engines (ChatGPT/Claude/Perplexity) actually read
// & cite this page?" — against a URL. Unlike /api/scan this needs NO browser: it
// makes a handful of plain fetches (HTML, GPTBot UA, robots.txt, .md twin,
// llms.txt) from the edge and scores them against the AEO check catalogue.
//
// SSRF is guarded by validateScanUrl() (shared with /api/scan). CORS, rate
// limiting (gated AS a scan), and Turnstile are enforced by api/_middleware.js.

import { runAeoChecks } from 'slop-detect-core';
import { validateScanUrl } from '../_shared.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

export async function onRequestPost({ request }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }

  const v = validateScanUrl(body && body.url);
  if (v.error) return json({ error: v.error }, v.status || 400);

  try {
    const report = await runAeoChecks(v.url, {
      fetchImpl: fetch,
      timeoutMs: 10_000,
      userAgent: 'SlopDetector-AEO/1.0 (+https://slop-detect.com)'
    });
    return json(report);
  } catch (e) {
    return json({ error: `AEO check failed: ${e instanceof Error ? e.message : String(e)}` }, 502);
  }
}
