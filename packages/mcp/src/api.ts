// Thin client for the slop-detect.com HTTP API. Lives separately from the
// MCP wiring so the network/error handling is testable in isolation and the
// server stays focused on protocol concerns.

// Base URL is configurable so the same server can point at a local dev build
// (e.g. `SLOP_DETECT_API=http://localhost:8788`) without code changes.
export function apiBase() {
  return (process.env.SLOP_DETECT_API || 'https://slop-detect.com').replace(/\/$/, '');
}

// Custom error that carries the HTTP status. We surface 429 (rate limited) and
// 502 (scan failure) with tailored messages downstream, so callers need the
// status, not just a string.
export class ApiError extends Error {
  status: number;
  body: string;
  constructor(message, { status = 0, body = '' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

// Turn a non-200 response into a human-readable ApiError. We try to pull the
// API's `{error}` / `{message}` field but fall back to raw text — the goal is a
// message an agent can act on, never a stack trace.
async function toApiError(res) {
  let body = '';
  let detail = '';
  try {
    body = await res.text();
    const json = JSON.parse(body);
    detail = json.error || json.message || '';
  } catch {
    // Non-JSON body (HTML error page, plain text) — keep the raw text as detail.
    detail = body.slice(0, 300);
  }

  if (res.status === 429) {
    return new ApiError(
      `Rate limited by slop-detect.com (HTTP 429)${detail ? `: ${detail}` : ''}. ` +
        'Wait a bit before scanning again — the API limits requests per IP.',
      { status: 429, body }
    );
  }
  if (res.status === 502) {
    return new ApiError(
      `The scan failed upstream (HTTP 502)${detail ? `: ${detail}` : ''}. ` +
        'The page may be unreachable, block bots, or have timed out. Try again or check the URL.',
      { status: 502, body }
    );
  }
  return new ApiError(
    `slop-detect.com returned HTTP ${res.status}${detail ? `: ${detail}` : ''}.`,
    { status: res.status, body }
  );
}

// Upstream scan drives a real headless browser (~30s worst case), so give it
// headroom but never hang an MCP client forever. Overridable for slow networks.
const DEFAULT_TIMEOUT_MS = Number(process.env.SLOP_DETECT_TIMEOUT_MS) || 45000;

// fetch wrapper that aborts after DEFAULT_TIMEOUT_MS and turns the abort into a
// clean ApiError (rather than a raw DOMException the agent can't interpret).
async function fetchWithTimeout(url, opts = {}) {
  try {
    return await fetch(url, { ...opts, signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS) });
  } catch (err) {
    if (err && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      throw new ApiError(
        `slop-detect.com did not respond within ${Math.round(DEFAULT_TIMEOUT_MS / 1000)}s. ` +
          'The page may be slow to load or the API may be busy — try again.',
        { status: 0 }
      );
    }
    throw err;
  }
}

// POST {url} to /api/scan and return the parsed JSON result.
export async function scanPage(url) {
  const res = await fetchWithTimeout(`${apiBase()}/api/scan`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json();
}

// POST {url, designMd} to /api/scan and return the parsed JSON — the
// design-system compliance check ("does this page honor its own DESIGN.md?").
// `designMdUrl` (optional) points at an explicit DESIGN.md; otherwise the API
// auto-discovers <origin>/DESIGN.md. share:false — agent checks shouldn't mint
// public permalinks.
export async function checkSystem(url, designMdUrl) {
  const res = await fetchWithTimeout(`${apiBase()}/api/scan`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      url,
      designMd: typeof designMdUrl === 'string' && designMdUrl ? designMdUrl : true,
      share: false,
    }),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json();
}

// POST {url} to /api/aeo and return the AEO conformance report JSON — "can AI
// engines (ChatGPT/Claude/Perplexity) actually read & cite this page?".
export async function checkAeo(url) {
  const res = await fetchWithTimeout(`${apiBase()}/api/aeo`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json();
}

// POST {url} to /api/fix-prompt and return the generated prompt as text.
// The endpoint returns text/plain by default; we never request JSON because the
// raw prompt is exactly what we want to hand back to the agent.
export async function fixPrompt(url) {
  const res = await fetchWithTimeout(`${apiBase()}/api/fix-prompt`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw await toApiError(res);
  return res.text();
}
