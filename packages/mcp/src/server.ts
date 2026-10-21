// MCP server wiring. Exposes four tools — scan_page, check_aeo,
// check_design_system, and fix_prompt — over the stdio transport so any MCP
// client (Claude Code, Cursor, Windsurf) can drive slop-detect.com without a
// browser or API key.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
  AEO_CHECKS,
  DEFINITIONS_VERSION,
  buildAvoidList,
  diffDesignMd,
  lintDesignMd,
  stampScanResult,
} from '@slop-detect/core';
import { scanPage, checkAeo, checkSystem, fixPrompt, fetchPatterns, ApiError } from './api.js';
import {
  formatScan,
  formatAeo,
  formatSystem,
  formatDesignMdLint,
  formatDesignMdDiff,
} from './format.js';
import {
  isLocalMode,
  isLoopbackOrFile,
  localAeo,
  localCatalogue,
  localFixPrompt,
  localModeRequested,
  localScan,
  setLocalMode,
} from './local.js';

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

// Canonical contract is schemas/scan-result.v1.json at the repo root. The
// published bundle looks next to dist as well as next to src.
function loadScanResultSchema() {
  const start = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(start, '../../../schemas/scan-result.v1.json'),
    join(start, '../../../../schemas/scan-result.v1.json'),
    join(start, '../../../../../schemas/scan-result.v1.json'),
  ];
  for (const path of candidates) {
    try {
      return JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      /* try the next location */
    }
  }
  return undefined;
}

const SCAN_RESULT_SCHEMA = loadScanResultSchema();

export const TOOLS = [
  {
    name: 'scan_page',
    title: 'Scan Landing Page for AI Slop',
    description:
      'Scan a landing page for AI-design-slop (and optionally copy slop and DESIGN.md compliance). Returns a grade, a 0-100 score ' +
      '(lower is better), the slop tier, a verdict, the triggered patterns, and ' +
      'a shareable result URL.',
    annotations: {
      title: 'Scan Landing Page for AI Slop',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The page URL to scan (e.g. https://example.com).' },
        copy: {
          type: 'boolean',
          description: 'Optional: also score the copy axis (9 LLM prose tells).',
        },
        axes: {
          type: 'array',
          items: { type: 'string', enum: ['design', 'copy'] },
          description: 'Optional: explicit axes to score (e.g. ["design", "copy"]).',
        },
        preset: {
          type: 'string',
          enum: ['full', 'strict', 'marketing', 'minimal'],
          description: 'Optional: scoring preset (default: "full").',
        },
        design_md_url: {
          type: 'string',
          description:
            'Optional: URL to a DESIGN.md file or "auto" to also evaluate design-system compliance.',
        },
      },
      required: ['url'],
    },
    ...(SCAN_RESULT_SCHEMA ? { outputSchema: SCAN_RESULT_SCHEMA } : {}),
  },
  {
    name: 'check_aeo',
    title: 'Check AEO Crawler & Citation Readiness',
    description:
      'Check whether a page can be fetched and read. Returns an AEO ' +
      'conformance score 0-100 (HIGHER is better), a tier (Eligible / ' +
      'Partially Eligible / Restricted), and which checks failed. The scanner ' +
      'uses its own user agent and does not impersonate vendor crawlers. ' +
      'Complements scan_page.',
    annotations: {
      title: 'Check AEO Crawler & Citation Readiness',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The page URL to check (e.g. https://example.com).' },
      },
      required: ['url'],
    },
    ...(SCAN_RESULT_SCHEMA ? { outputSchema: SCAN_RESULT_SCHEMA } : {}),
  },
  {
    name: 'check_design_system',
    title: 'Check DESIGN.md System Compliance',
    description:
      'Check whether a page honors its OWN declared design system (a DESIGN.md ' +
      'file — Google Labs spec). Returns a compliance score 0-100 (HIGHER is ' +
      'better), a tier (Aligned / Drifting / Off-system), and named drift ' +
      'signals: fonts in use that are not declared, CTA/surface colors off the ' +
      'palette, radii off the scale. Use this BEFORE shipping UI changes to a ' +
      'site that has a design system — it catches brand drift that the slop ' +
      'score (an absolute measure) cannot. By default looks for ' +
      '<origin>/DESIGN.md next to the page.',
    annotations: {
      title: 'Check DESIGN.md System Compliance',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
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
    title: 'Generate Anti-Slop Remediation Prompt',
    description:
      'Generate a copy-paste prompt that tells a coding agent exactly how to ' +
      'de-slop a page — based on the same scan. Returns the prompt text.',
    annotations: {
      title: 'Generate Anti-Slop Remediation Prompt',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The page URL to generate a fix prompt for.' },
        copy: {
          type: 'boolean',
          description: 'Optional: include copy-axis prose remediation in the prompt.',
        },
        axes: {
          type: 'array',
          items: { type: 'string', enum: ['design', 'copy'] },
          description: 'Optional: explicit axes to include in the fix prompt.',
        },
        preset: {
          type: 'string',
          enum: ['full', 'strict', 'marketing', 'minimal'],
          description: 'Optional: scoring preset (default: "full").',
        },
        design_md_url: {
          type: 'string',
          description: 'Optional: URL to DESIGN.md or "auto" to include system drift remediation.',
        },
        brief: {
          type: 'boolean',
          description:
            'Optional. When true, return a short avoid list of at most 120 words. The default remains the long remediation prompt.',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'lint_design_md',
    title: 'Lint a DESIGN.md File',
    description:
      'Statically lint DESIGN.md text for broken token references, component contrast below 4.5:1, orphaned palette tokens, and a specVersion other than alpha. Local only: it does not fetch a page and does not change any score.',
    annotations: {
      title: 'Lint a DESIGN.md File',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      properties: {
        design_md: {
          type: 'string',
          description: 'The full DESIGN.md document, including YAML front matter.',
        },
      },
      required: ['design_md'],
    },
  },
  {
    name: 'diff_design_md',
    title: 'Diff Two DESIGN.md Files',
    description:
      'Diff two DESIGN.md documents and report added, removed, and changed tokens. A removed or changed token is breaking. Local only: it does not fetch a page and does not rescore one.',
    annotations: {
      title: 'Diff Two DESIGN.md Files',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      properties: {
        base_design_md: {
          type: 'string',
          description: 'The base DESIGN.md text.',
        },
        head_design_md: {
          type: 'string',
          description: 'The head DESIGN.md text.',
        },
      },
      required: ['base_design_md', 'head_design_md'],
    },
  },
];

export const PROMPTS = [
  {
    name: 'audit_landing_page',
    description:
      'Run a full 4-axis audit (Design Slop + Copy Slop + DESIGN.md System Compliance + AEO Readiness) on a URL and produce an actionable report.',
    arguments: [
      {
        name: 'url',
        description: 'The landing page URL to audit (e.g. https://example.com).',
        required: true,
      },
    ],
  },
  {
    name: 'deslop_and_verify',
    description:
      'Generate a remediation fix prompt for a URL, apply the CSS/DOM/copy fixes in the codebase, and re-scan to verify a Clean (<10) score.',
    arguments: [
      {
        name: 'url',
        description: 'The preview or production URL to remediate.',
        required: true,
      },
    ],
  },
];

export const DESIGN_MD_TEMPLATE = `---
name: "Brand Design System"
colors:
  surface: "#F4F5F2"
  ink: "#181815"
  primary: "#1FA85E"
typography:
  h1:
    fontFamily: "Newsreader"
  body:
    fontFamily: "Libre Franklin"
rounded:
  sm: 4px
  md: 6px
  lg: 8px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
---

# Brand Design System (\`DESIGN.md\`)

Publish this file at \`/DESIGN.md\` on your origin so \`slop-detect\` and coding agents can verify live DOM alignment against your declared tokens.
`;

export const RESOURCES = [
  {
    uri: 'slop://spec/patterns',
    name: 'Slop Detector Pattern & Check Catalogue',
    description:
      'Live JSON catalogue of design patterns, copy patterns, AEO checks, and DESIGN.md system checks from slop-detect.com.',
    mimeType: 'application/json',
  },
  {
    uri: 'slop://spec/design-md-template',
    name: 'Google Labs DESIGN.md Starter Template',
    description:
      'Reference DESIGN.md file with YAML front-matter tokens (colors, typography, rounded, components) for the system compliance axis.',
    mimeType: 'text/markdown',
  },
  {
    uri: 'slop://spec/aeo',
    name: 'AEO check catalogue',
    description:
      'AEO checks from the installed engine. Weight 0 checks stay in review. Pre-2022 false-positive rates are unmeasured.',
    mimeType: 'application/json',
  },
];

// Wrap a tool body so any thrown error (network, ApiError, validation) becomes
// MCP error content instead of crashing the process. A long-lived server must
// never die on a single bad request.
function asToolResult(text, isError = false, structuredContent?) {
  const result: {
    content: Array<{ type: 'text'; text: string }>;
    isError: boolean;
    structuredContent?: unknown;
  } = { content: [{ type: 'text', text }], isError };
  if (structuredContent !== undefined) result.structuredContent = structuredContent;
  return result;
}

function extractScanOptions(args: any) {
  const opts: { axes?: string[]; preset?: string; designMd?: string | boolean; brief?: boolean } =
    {};
  if (Array.isArray(args?.axes) && args.axes.length > 0) {
    opts.axes = args.axes;
  } else if (args?.copy === true) {
    opts.axes = ['design', 'copy'];
  }
  if (typeof args?.preset === 'string' && args.preset.trim()) {
    opts.preset = args.preset.trim();
  }
  if (typeof args?.design_md_url === 'string' && args.design_md_url.trim()) {
    const d = args.design_md_url.trim();
    opts.designMd = d === 'auto' ? true : d;
  }
  if (args?.brief === true) opts.brief = true;
  return opts;
}

function handleLocalDesignMd(name, args) {
  if (name === 'lint_design_md') {
    const text = args && typeof args.design_md === 'string' ? args.design_md : '';
    if (!text.trim()) {
      return asToolResult('Missing required argument "design_md" (the DESIGN.md text).', true);
    }
    return asToolResult(formatDesignMdLint(lintDesignMd(text)));
  }
  const base = args && typeof args.base_design_md === 'string' ? args.base_design_md : '';
  const head = args && typeof args.head_design_md === 'string' ? args.head_design_md : '';
  if (!base.trim() || !head.trim()) {
    return asToolResult('Missing required arguments "base_design_md" and "head_design_md".', true);
  }
  return asToolResult(formatDesignMdDiff(diffDesignMd(base, head)));
}

export async function handleCall(name, args) {
  if (name === 'lint_design_md' || name === 'diff_design_md') {
    return handleLocalDesignMd(name, args);
  }
  const url = args && typeof args.url === 'string' ? args.url.trim() : '';
  if (!url) {
    return asToolResult('Missing required argument "url" (a string).', true);
  }

  if (!isLocalMode() && isLoopbackOrFile(url)) {
    return asToolResult(
      'This URL is on localhost or file://. The hosted API cannot scan it. ' +
        'Restart the server with `slop-detect-mcp --local` (or SLOP_DETECT_LOCAL=1) so the scan stays on this machine.',
      true
    );
  }

  if (isLocalMode()) {
    try {
      return await handleLocalScan(name, url, args);
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      return asToolResult(message, true);
    }
  }

  if (name === 'scan_page') {
    const result = stampScanResult(await scanPage(url, extractScanOptions(args)));
    return asToolResult(formatScan(result), false, result);
  }
  if (name === 'check_aeo') {
    const report = stampScanResult(await checkAeo(url));
    return asToolResult(formatAeo(report), false, report);
  }
  if (name === 'check_design_system') {
    const designMdUrl =
      args && typeof args.design_md_url === 'string' ? args.design_md_url.trim() : '';
    const result = await checkSystem(url, designMdUrl || undefined);
    return asToolResult(formatSystem(result));
  }
  if (name === 'fix_prompt') {
    if (args?.brief === true) {
      const result = stampScanResult(await scanPage(url, extractScanOptions(args))) as {
        blocked?: boolean;
        error?: unknown;
        score?: unknown;
      };
      if (!result || result.blocked || result.error || typeof result.score !== 'number') {
        return asToolResult('Scan could not run. This is not a Clean score.', true);
      }
      return asToolResult(buildAvoidList(result));
    }
    const prompt = await fixPrompt(url, extractScanOptions(args));
    return asToolResult(prompt);
  }
  return asToolResult(`Unknown tool: ${name}`, true);
}

async function handleLocalScan(name, url, args) {
  if (name === 'scan_page') {
    const result = await localScan(url, extractScanOptions(args));
    return asToolResult(formatScan(result), false, result);
  }
  if (name === 'check_aeo') {
    const report = await localAeo(url);
    return asToolResult(formatAeo(report), false, report);
  }
  if (name === 'check_design_system') {
    const designMdUrl =
      args && typeof args.design_md_url === 'string' ? args.design_md_url.trim() : '';
    const result = await localScan(url, { designMd: designMdUrl || true });
    return asToolResult(formatSystem(result), false, result);
  }
  if (name === 'fix_prompt') {
    const prompt = await localFixPrompt(url, extractScanOptions(args));
    return asToolResult(prompt);
  }
  return asToolResult(`Unknown tool: ${name}`, true);
}

export function createServer() {
  const server = new Server(
    { name: 'slop-detect-mcp', version: VERSION },
    { capabilities: { tools: {}, prompts: {}, resources: {} } }
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
          : isLocalMode()
            ? err && err.message
              ? err.message
              : String(err)
            : `Could not reach slop-detect.com: ${err && err.message ? err.message : String(err)}`;
      return asToolResult(msg, true);
    }
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: PROMPTS }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: promptArgs } = request.params;
    const targetUrl = promptArgs?.url || '<url>';
    if (name === 'audit_landing_page') {
      return {
        description: `Four-axis audit for ${targetUrl}`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Audit the landing page at ${targetUrl} across all four axes using slop-detect-mcp:\n1. Call \`scan_page\` with \`{"url": "${targetUrl}", "copy": true}\`.\n2. Call \`check_design_system\` with \`{"url": "${targetUrl}"}\`.\n3. Call \`check_aeo\` with \`{"url": "${targetUrl}"}\`.\n4. Summarize the scores, polarity (lower is better for design/copy; higher is better for system/AEO), and prioritized fixes.`,
            },
          },
        ],
      };
    }
    if (name === 'deslop_and_verify') {
      return {
        description: `Remediate and verify ${targetUrl}`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `De-slop the landing page at ${targetUrl}:\n1. Call \`fix_prompt\` with \`{"url": "${targetUrl}", "copy": true}\`.\n2. Apply each remediation recipe to the codebase without introducing any currently-passing patterns.\n3. Re-run \`scan_page\` on ${targetUrl} and confirm the score is Clean (< 10).`,
            },
          },
        ],
      };
    }
    throw new Error(`Unknown prompt: ${name}`);
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: RESOURCES }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const loaded = await loadResource(request.params.uri);
    return { contents: [loaded] };
  });

  return server;
}

export async function loadResource(uri: string) {
  if (uri === 'slop://spec/design-md-template') {
    return { uri, mimeType: 'text/markdown', text: DESIGN_MD_TEMPLATE };
  }
  if (uri === 'slop://spec/patterns') {
    const catalogue = isLocalMode() ? localCatalogue() : await fetchPatterns();
    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(catalogue, null, 2),
    };
  }
  if (uri === 'slop://spec/aeo') {
    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(
        {
          source: 'installed-engine',
          definitionsVersion: DEFINITIONS_VERSION,
          pre2022HeavyRate: null,
          checks: AEO_CHECKS.map((check) => ({
            id: check.id,
            label: check.label,
            weight: check.weight,
            status: check.status,
            likelihoodRatio: check.likelihoodRatio ?? null,
            fpRatePre2022: check.fpRatePre2022 ?? null,
          })),
        },
        null,
        2
      ),
    };
  }
  throw new Error(`Unknown resource URI: ${uri}`);
}

export async function startServer() {
  setLocalMode(localModeRequested());
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout is reserved for the JSON-RPC stream, so status goes to stderr.
  const where = isLocalMode() ? ' (local mode, no calls to slop-detect.com)' : '';
  process.stderr.write(`slop-detect-mcp: listening on stdio${where}\n`);
}
