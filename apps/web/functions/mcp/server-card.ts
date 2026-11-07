// GET /mcp/server-card → application/mcp-server-card+json
//
// Serves the SEP-1649 / well-known MCP Server Card from the Functions route
// so clients probing either `/.well-known/mcp/server-card.json` or
// `/mcp/server-card` receive identical discovery metadata.

import { DEFINITIONS_VERSION } from '@slop-detect/core';

export const MCP_PROTOCOL_VERSION = '2025-11-25';
export const MCP_SERVER_VERSION = '0.8.0';
export const MCP_TOOL_TTL_MS = 300000;
export const MCP_SCORECARD_URI = 'ui://slop-detect/scorecard.html';
export const MCP_SCORECARD_MIME = 'text/html;profile=mcp-app';

// Deterministic tool order required by R-04 (#320) for prompt-cache stability.
export const DETERMINISTIC_TOOL_ORDER = [
  'scan_page',
  'check_aeo',
  'check_design_system',
  'fix_prompt',
  'lint_design_md',
  'diff_design_md',
  'extract_design_system',
] as const;

export function buildServerCard() {
  return {
    $schema: 'https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json',
    protocolVersion: MCP_PROTOCOL_VERSION,
    serverInfo: {
      name: 'io.github.ravidsrk/slop-detect',
      title: 'Slop Detector',
      version: MCP_SERVER_VERSION,
      definitionsVersion: DEFINITIONS_VERSION,
    },
    name: 'io.github.ravidsrk/slop-detect',
    title: 'Slop Detector',
    description:
      'Audit any landing page for default-template design and copy patterns, AEO (AI Engine Optimization) readiness, and DESIGN.md / W3C DTCG 2025.10 design-system compliance, or generate a ready-to-paste refactor prompt.',
    version: MCP_SERVER_VERSION,
    homepageUrl: 'https://slop-detect.com',
    documentationUrl: 'https://slop-detect.com/docs',
    repository: {
      url: 'https://github.com/ravidsrk/slop-detect',
      source: 'github',
      subfolder: 'packages/mcp',
    },
    packages: [
      {
        registryType: 'npm',
        identifier: 'slop-detect-mcp',
        version: MCP_SERVER_VERSION,
        transport: {
          type: 'stdio',
        },
      },
    ],
    remotes: [
      {
        type: 'streamable-http',
        url: 'https://slop-detect.com/mcp',
      },
    ],
    capabilities: {
      tools: { listChanged: false },
      resources: { subscribe: false, listChanged: false },
      prompts: { listChanged: false },
      experimental: {
        mcpApps: {
          mimeTypes: [MCP_SCORECARD_MIME],
        },
      },
    },
    tools: [
      {
        name: 'scan_page',
        description:
          'Scan a URL and return its design, copy, and craft scores (0–100), tier (Clean / Mild / Heavy), and triggered pattern breakdown.',
        ttlMs: MCP_TOOL_TTL_MS,
        cacheScope: 'public',
      },
      {
        name: 'check_aeo',
        description:
          'Run the 16-check AEO (AI Engine Optimization) audit on a URL: robots.txt, llms.txt, JSON-LD, SSR, headings, tables, FAQ, canonical, meta, sitemap, freshness, crawl trap,llms-full, agent discovery, content signal, and answer unit.',
        ttlMs: MCP_TOOL_TTL_MS,
        cacheScope: 'public',
      },
      {
        name: 'check_design_system',
        description:
          'Check whether a live URL honors its declared DESIGN.md or W3C DTCG 2025.10 tokens.json design system.',
        ttlMs: MCP_TOOL_TTL_MS,
        cacheScope: 'public',
      },
      {
        name: 'fix_prompt',
        description:
          'Generate a ready-to-paste CSS/HTML refactor prompt and upfront avoid-list from a URL or triggered pattern list.',
        ttlMs: MCP_TOOL_TTL_MS,
        cacheScope: 'public',
      },
      {
        name: 'lint_design_md',
        description:
          'Statically lint a DESIGN.md document for broken token references, WCAG AA component contrast (< 4.5:1), orphaned tokens, and specVersion mismatches.',
        ttlMs: MCP_TOOL_TTL_MS,
        cacheScope: 'public',
      },
      {
        name: 'diff_design_md',
        description:
          'Compute a structured token diff (added, removed, changed, breaking) between two DESIGN.md revisions.',
        ttlMs: MCP_TOOL_TTL_MS,
        cacheScope: 'public',
      },
      {
        name: 'extract_design_system',
        description:
          'Extract observed DOM tokens or a live URL into a starter DESIGN.md and W3C DTCG 2025.10 tokens.json.',
        ttlMs: MCP_TOOL_TTL_MS,
        cacheScope: 'public',
      },
    ],
    resources: [
      {
        uri: MCP_SCORECARD_URI,
        name: 'Slop Detector Score Card UI',
        mimeType: MCP_SCORECARD_MIME,
        description:
          'Interactive MCP Apps score card view (editorial instrument aesthetic) with tier badge, axis breakdown, triggered pattern table, and copy-fix-prompt action.',
      },
      {
        uri: 'slop://spec/patterns',
        name: 'Slop Detector Pattern Catalogue',
        mimeType: 'application/json',
        description:
          'Versioned design, copy, craft, and system pattern catalogue with weights, tiers, and descriptions.',
      },
      {
        uri: 'slop://spec/design-md-template',
        name: 'DESIGN.md Starter Template',
        mimeType: 'text/markdown',
        description: 'Starter DESIGN.md template with YAML front matter for declaring site tokens.',
      },
      {
        uri: 'slop://spec/aeo',
        name: 'AEO Check Catalogue',
        mimeType: 'application/json',
        description: 'Versioned 16-check AEO catalogue with weights, severities, and descriptions.',
      },
    ],
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet() {
  return new Response(JSON.stringify(buildServerCard(), null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/mcp-server-card+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      ...CORS_HEADERS,
    },
  });
}

export async function onRequest(ctx: any) {
  const method = (ctx?.request?.method || 'GET').toUpperCase();
  if (method === 'OPTIONS') return onRequestOptions();
  if (method === 'GET' || method === 'HEAD') return onRequestGet();
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
