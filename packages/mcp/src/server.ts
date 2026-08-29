// MCP server wiring. Exposes four tools — scan_page, check_aeo,
// check_design_system, and fix_prompt — over the stdio transport so any MCP
// client (Claude Code, Cursor, Windsurf) can drive slop-detect.com without a
// browser or API key.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { scanPage, checkAeo, checkSystem, fixPrompt, ApiError } from './api.js';
import { formatScan, formatAeo, formatSystem } from './format.js';

// Read our own version from package.json so the MCP handshake never drifts from
// the published version. Falls back to '0.0.0' if the file can't be read (e.g.
// an unusual bundling) rather than crashing the server on startup.
function readVersion() {
  try {
    const pkgUrl = new URL('../package.json', import.meta.url);
    const pkg = JSON.parse(readFileSync(fileURLToPath(pkgUrl), 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}
const VERSION = readVersion();

export const TOOLS = [
  {
    name: 'scan_page',
    description:
      'Scan a landing page for AI-design-slop. Returns a grade, a 0-100 score ' +
      '(lower is better), the slop tier, a verdict, the triggered patterns, and ' +
      'a shareable result URL.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The page URL to scan (e.g. https://example.com).' },
      },
      required: ['url'],
    },
  },
  {
    name: 'check_aeo',
    description:
      'Check whether AI engines (ChatGPT, Claude, Perplexity, Google AI ' +
      'Overviews) can actually read and cite a page. Returns an AEO ' +
      'conformance score 0-100 (HIGHER is better), a tier (AI-Ready / Partial ' +
      '/ Invisible), and which checks failed — AI-crawler blocking, noindex, ' +
      'robots.txt disallows, missing markdown twin / llms.txt. Complements ' +
      'scan_page: a page can look human-made yet still be invisible to AI search.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The page URL to check (e.g. https://example.com).' },
      },
      required: ['url'],
    },
  },
  {
    name: 'check_design_system',
    description:
      'Check whether a page honors its OWN declared design system (a DESIGN.md ' +
      'file — Google Labs spec). Returns a compliance score 0-100 (HIGHER is ' +
      'better), a tier (Aligned / Drifting / Off-system), and named drift ' +
      'signals: fonts in use that are not declared, CTA/surface colors off the ' +
      'palette, radii off the scale. Use this BEFORE shipping UI changes to a ' +
      'site that has a design system — it catches brand drift that the slop ' +
      'score (an absolute measure) cannot. By default looks for ' +
      '<origin>/DESIGN.md next to the page.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The page URL to check (e.g. https://example.com).' },
        design_md_url: {
          type: 'string',
          description:
            'Optional: an explicit URL to the DESIGN.md to check against. Defaults to <origin>/DESIGN.md.',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'fix_prompt',
    description:
      'Generate a copy-paste prompt that tells a coding agent exactly how to ' +
      'de-slop a page — based on the same scan. Returns the prompt text.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The page URL to generate a fix prompt for.' },
      },
      required: ['url'],
    },
  },
];

// Wrap a tool body so any thrown error (network, ApiError, validation) becomes
// MCP error content instead of crashing the process. A long-lived server must
// never die on a single bad request.
function asToolResult(text, isError = false) {
  return { content: [{ type: 'text', text }], isError };
}

export async function handleCall(name, args) {
  const url = args && typeof args.url === 'string' ? args.url.trim() : '';
  if (!url) {
    return asToolResult('Missing required argument "url" (a string).', true);
  }

  if (name === 'scan_page') {
    const result = await scanPage(url);
    return asToolResult(formatScan(result));
  }
  if (name === 'check_aeo') {
    const report = await checkAeo(url);
    return asToolResult(formatAeo(report));
  }
  if (name === 'check_design_system') {
    const designMdUrl =
      args && typeof args.design_md_url === 'string' ? args.design_md_url.trim() : '';
    const result = await checkSystem(url, designMdUrl || undefined);
    return asToolResult(formatSystem(result));
  }
  if (name === 'fix_prompt') {
    const prompt = await fixPrompt(url);
    return asToolResult(prompt);
  }
  return asToolResult(`Unknown tool: ${name}`, true);
}

export function createServer() {
  const server = new Server(
    { name: 'slop-detect-mcp', version: VERSION },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      return await handleCall(name, args);
    } catch (err) {
      // ApiError already carries a clean, actionable message; for everything
      // else (DNS failures, fetch aborts) we surface the raw message so the
      // agent can decide whether to retry.
      const msg =
        err instanceof ApiError
          ? err.message
          : `Could not reach slop-detect.com: ${err && err.message ? err.message : String(err)}`;
      return asToolResult(msg, true);
    }
  });

  return server;
}

export async function startServer() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout is reserved for the JSON-RPC stream, so status goes to stderr.
  process.stderr.write('slop-detect-mcp: listening on stdio\n');
}
