// Root handler for `/`.
//
// Adds a machine-readable agent view: GET /?mode=agent returns a structured
// JSON document (capabilities, endpoints, auth, discovery links) instead of the
// marketing HTML, so AI agents get an actionable description in one fetch.
// Also handled: Accept: application/json content-negotiation.
//
// Any other request falls through to next() — the static index.html SPA.

import { PATTERNS, DEFINITIONS_VERSION } from 'slop-detect-core';

const ORIGIN = 'https://slop-detect.com';

function agentView() {
  return {
    name: 'Slop Detector',
    description:
      'Score any landing page against the AI-design-slop fingerprint. Deterministic, weighted 0-100 scoring of the CSS and copy tells that Cursor, v0, Lovable and Bolt converged on, on real headless Chromium. Plus an AEO axis: can AI engines read & cite a page.',
    url: ORIGIN,
    license: 'MIT',
    repository: 'https://github.com/ravidsrk/slop-detect',
    version: '0.7.0',
    catalogue: {
      definitionsVersion: DEFINITIONS_VERSION,
      patternCount: PATTERNS.length,
      tiers: { clean: '0-9', mild: '10-27', heavy: '28+' },
    },
    capabilities: [
      {
        name: 'scan_page',
        method: 'POST',
        endpoint: `${ORIGIN}/api/scan`,
        body: { url: 'https://example.com', axes: ['design', 'copy'] },
        description: 'Score a URL against the design-slop (and optional copy-slop) fingerprint.',
      },
      {
        name: 'check_aeo',
        method: 'POST',
        endpoint: `${ORIGIN}/api/aeo`,
        body: { url: 'https://example.com' },
        description: 'Score whether AI engines can fetch, read & cite a page. Higher is better.',
      },
      {
        name: 'list_patterns',
        method: 'GET',
        endpoint: `${ORIGIN}/api/patterns`,
        description: 'Read the live pattern catalogue.',
      },
      {
        name: 'check_design_system',
        method: 'POST',
        endpoint: `${ORIGIN}/api/scan`,
        body: { url: 'https://example.com', designMd: true },
        description:
          'System axis: does the page honor its own DESIGN.md? 0-100 compliance (higher is better) + named drift.',
      },
      {
        name: 'monitor_domain',
        method: 'POST',
        endpoint: `${ORIGIN}/api/watch`,
        body: { domain: 'example.com', email: 'you@company.com', system: true },
        description:
          'Monitor a domain: daily re-scans, regression + design-drift email alerts (double opt-in).',
      },
      {
        name: 'fix_prompt',
        method: 'POST',
        endpoint: `${ORIGIN}/api/fix-prompt`,
        body: { url: 'https://example.com' },
        description: 'Build a ready-to-paste prompt to de-slop a page.',
      },
    ],
    auth: {
      type: 'none',
      apiKeyHeader: 'X-API-Key',
      notes: 'No API key required for normal use. Per-IP rate limited. See /auth.md',
      doc: `${ORIGIN}/auth.md`,
    },
    interfaces: {
      http: `${ORIGIN}/openapi.json`,
      mcp: `${ORIGIN}/.well-known/mcp/server-card.json`,
      cli: 'npx slop-detect <url>',
      skills: `${ORIGIN}/.well-known/agent-skills/index.json`,
      a2a: `${ORIGIN}/.well-known/agent-card.json`,
      agent: `${ORIGIN}/.well-known/agent.json`,
    },
    discovery: {
      llmsTxt: `${ORIGIN}/llms.txt`,
      llmsFullTxt: `${ORIGIN}/llms-full.txt`,
      markdownTwin: `${ORIGIN}/index.md`,
      pricing: `${ORIGIN}/pricing.md`,
      privacy: `${ORIGIN}/privacy.md`,
      dashboard: `${ORIGIN}/dashboard`,
      directory: `${ORIGIN}/directory`,
      leaderboard: `${ORIGIN}/leaderboard`,
      sitemap: `${ORIGIN}/sitemap.xml`,
      schemaMap: `${ORIGIN}/schema-map.xml`,
    },
  };
}

export async function onRequestGet(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const wantsAgent =
    url.searchParams.get('mode') === 'agent' ||
    (request.headers.get('accept') || '').includes('application/json');

  if (wantsAgent) {
    return new Response(JSON.stringify(agentView(), null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        Vary: 'Accept',
      },
    });
  }
  return next();
}
