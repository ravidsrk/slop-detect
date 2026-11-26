// Root handler for `/`.
//
// Adds a machine-readable agent view: GET /?mode=agent returns a structured
// JSON document (capabilities, endpoints, auth, discovery links) instead of the
// marketing HTML, so AI agents get an actionable description in one fetch.
// Also handled: Accept: application/json content-negotiation.
//
// Any other request falls through to next() — the static index.html SPA.

import {
  PATTERNS,
  COPY_PATTERNS,
  CRAFT_CHECKS,
  AEO_CHECKS,
  SYSTEM_CHECKS,
  DEFINITIONS_VERSION,
  SLOP_DETECT_VERSION,
} from '@slop-detect/core';

const ORIGIN = 'https://slop-detect.com';

function agentView() {
  return {
    name: 'Slop Detector',
    description:
      'Deterministic headless-Chromium verifier for landing pages, coding agents, and DESIGN.md token systems. Evaluates five orthogonal axes: default-template design patterns, copy/paste artifacts, craft floor defects, rendered DESIGN.md system compliance, and AEO technical crawler eligibility.',
    url: ORIGIN,
    license: 'MIT',
    repository: 'https://github.com/ravidsrk/slop-detect',
    version: SLOP_DETECT_VERSION,
    catalogue: {
      definitionsVersion: DEFINITIONS_VERSION,
      patternCount: PATTERNS.length,
      copyPatternCount: COPY_PATTERNS.length,
      craftCheckCount: CRAFT_CHECKS.length,
      systemCheckCount: SYSTEM_CHECKS.length,
      aeoCheckCount: AEO_CHECKS.length,
      axes: ['design', 'copy', 'craft', 'system', 'aeo'],
      tiers: { clean: '0-9', mild: '10-27', heavy: '28+' },
    },
    capabilities: [
      {
        name: 'scan_page',
        method: 'POST',
        endpoint: `${ORIGIN}/api/scan`,
        body: { url: 'https://example.com', axes: ['design', 'copy', 'craft'], share: false },
        description:
          'Evaluate a URL on default-template design, copy, craft floor, and optional DESIGN.md compliance with real CSS selectors.',
      },
      {
        name: 'check_aeo',
        method: 'POST',
        endpoint: `${ORIGIN}/api/aeo`,
        body: { url: 'https://example.com' },
        description:
          'Check whether search and AI answer crawlers can fetch, parse, and read a page without JS. Higher is better.',
      },
      {
        name: 'list_patterns',
        method: 'GET',
        endpoint: `${ORIGIN}/api/patterns`,
        description: 'Read the live pattern and check catalogue.',
      },
      {
        name: 'check_design_system',
        method: 'POST',
        endpoint: `${ORIGIN}/api/scan`,
        body: { url: 'https://example.com', designMd: true, share: false },
        description:
          'System axis: verify live rendered DOM against <origin>/DESIGN.md (0-100 compliance, higher is better, plus starter DESIGN.md extraction when absent).',
      },
      {
        name: 'monitor_domain',
        method: 'POST',
        endpoint: `${ORIGIN}/api/watch`,
        body: { domain: 'example.com', email: 'you@company.com', system: true },
        description:
          'Monitor a domain: daily re-scans, regression + DESIGN.md-drift email or HTTPS webhook alerts (double opt-in).',
      },
      {
        name: 'fix_prompt',
        method: 'POST',
        endpoint: `${ORIGIN}/api/fix-prompt`,
        body: { url: 'https://example.com' },
        description:
          'Build a selector-addressed remediation prompt covering design, copy, craft floor, DESIGN.md drift, and AEO gaps.',
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
      mcpLocal: 'npx -y -p slop-detect -p slop-detect-mcp slop-detect-mcp --local',
      cli: 'npx slop-detect verify <url>',
      skills: `${ORIGIN}/.well-known/agent-skills/index.json`,
      a2a: `${ORIGIN}/.well-known/agent-card.json`,
      agent: `${ORIGIN}/.well-known/agent.json`,
    },
    discovery: {
      llmsTxt: `${ORIGIN}/llms.txt`,
      llmsFullTxt: `${ORIGIN}/llms-full.txt`,
      apiLlmsTxt: `${ORIGIN}/api/llms.txt`,
      developersLlmsTxt: `${ORIGIN}/developers/llms.txt`,
      markdownTwin: `${ORIGIN}/index.md`,
      docs: `${ORIGIN}/docs`,
      docsMarkdownTwin: `${ORIGIN}/docs.md`,
      patternsMarkdown: `${ORIGIN}/api/patterns.md`,
      brand: `${ORIGIN}/brand`,
      blog: `${ORIGIN}/blog`,
      compare: `${ORIGIN}/compare`,
      pricing: `${ORIGIN}/pricing.md`,
      privacy: `${ORIGIN}/privacy.md`,
      terms: `${ORIGIN}/terms.md`,
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
