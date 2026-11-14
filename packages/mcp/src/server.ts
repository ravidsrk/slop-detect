// MCP server for the npm package (stdio transport). The tool contract (names,
// input schemas, descriptions, annotations, prompts, server instructions) comes
// from @slop-detect/core, so this server and the hosted endpoint at
// https://slop-detect.com/mcp can't drift apart (#361). This file adds what only
// a local process can do: the stdio transport, output schemas, local mode, and
// an in-memory store of recent scans so follow-up tools reuse a scan instead of
// running another browser scan (#358).

import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
  AEO_CHECKS,
  DEFINITIONS_VERSION,
  MCP_ICONS,
  MCP_LOCAL_SERVER_COMMAND,
  MCP_PROMPTS,
  MCP_SERVER_INSTRUCTIONS,
  MCP_TOOLS,
  buildMcpDesignSystem,
  buildMcpFixPrompt,
  compactAeoReport,
  compactScanResult,
  diffDesignMd,
  formatAeoSummary,
  formatDesignMdDiff,
  formatDesignMdLint,
  formatScanFailure,
  formatScanSummary,
  formatSystemSummary,
  hostnameLabel,
  isMcpScanFailure,
  isMcpToolName,
  lintDesignMd,
  mcpUnknownToolMessage,
  observedTokensOf,
  renderMcpPrompt,
  stampScanResult,
  systemStructured,
  validateMcpToolArguments,
} from '@slop-detect/core';
import { scanPage, checkAeo, checkSystem, fetchPatterns, ApiError } from './api.js';
import { describeScanError } from './errors.js';
import {
  isLocalMode,
  isLoopbackOrFile,
  localAeo,
  localCatalogue,
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
    join(start, '../schema/scan-result.v1.json'),
    join(start, '../../schema/scan-result.v1.json'),
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

// Structured results for the tools that don't return a scan document. They
// carry data, not a copy of the text, so clients that show both don't pay for
// the same content twice (#358).
const SYSTEM_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: true,
  required: ['declared'],
  properties: {
    declared: { type: 'boolean' },
    score: { type: 'number' },
    tier: { type: 'string' },
    drift: { type: 'array', items: { type: 'object', additionalProperties: true } },
    scanId: { type: 'string' },
  },
};
const FIX_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: true,
  required: ['mode', 'triggeredCount'],
  properties: {
    mode: { enum: ['fix', 'avoid'] },
    triggeredCount: { type: 'number' },
    patterns: { type: 'array', items: { type: 'string' } },
    score: { type: ['number', 'null'] },
    tier: { type: ['string', 'null'] },
    chars: { type: 'number' },
    scanId: { type: 'string' },
  },
};
const LINT_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: true,
  required: ['valid', 'errors', 'warnings'],
  properties: {
    valid: { type: 'boolean' },
    specVersion: { type: 'string' },
    errors: { type: 'array' },
    warnings: { type: 'array' },
    issues: { type: 'array' },
  },
};
const DIFF_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: true,
  required: ['breaking', 'added', 'removed', 'changed'],
  properties: {
    breaking: { type: 'boolean' },
    added: { type: 'array' },
    removed: { type: 'array' },
    changed: { type: 'array' },
  },
};
const EXTRACT_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: true,
  required: ['format', 'name'],
  properties: {
    format: { enum: ['design_md', 'dtcg', 'both'] },
    name: { type: 'string' },
    designMd: { type: 'string' },
    dtcgTokens: { type: 'object', additionalProperties: true },
    scanId: { type: 'string' },
  },
};

const OUTPUT_SCHEMAS: Record<string, any> = {
  scan_page: SCAN_RESULT_SCHEMA,
  check_aeo: SCAN_RESULT_SCHEMA,
  check_design_system: SYSTEM_OUTPUT_SCHEMA,
  fix_prompt: FIX_OUTPUT_SCHEMA,
  lint_design_md: LINT_OUTPUT_SCHEMA,
  diff_design_md: DIFF_OUTPUT_SCHEMA,
  extract_design_system: EXTRACT_OUTPUT_SCHEMA,
};

export const TOOLS = MCP_TOOLS.map((tool) => ({
  ...tool,
  icons: MCP_ICONS,
  ...(OUTPUT_SCHEMAS[tool.name] ? { outputSchema: OUTPUT_SCHEMAS[tool.name] } : {}),
}));

export const PROMPTS = MCP_PROMPTS.map((prompt) => ({ ...prompt, icons: MCP_ICONS }));

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
      'JSON catalogue of design patterns, copy patterns, AEO checks, and DESIGN.md system checks (from slop-detect.com, or the installed engine in local mode).',
    mimeType: 'application/json',
    icons: MCP_ICONS,
  },
  {
    uri: 'slop://spec/design-md-template',
    name: 'Google Labs DESIGN.md Starter Template',
    description:
      'Reference DESIGN.md file with YAML front-matter tokens (colors, typography, rounded, components) for the system compliance axis.',
    mimeType: 'text/markdown',
    icons: MCP_ICONS,
  },
  {
    uri: 'slop://spec/aeo',
    name: 'AEO check catalogue',
    description:
      'AEO checks from the installed engine. Weight 0 checks stay in review. Pre-2022 false-positive rates are unmeasured.',
    mimeType: 'application/json',
    icons: MCP_ICONS,
  },
  {
    uri: 'ui://slop-detect/scorecard.html',
    name: 'Slop Detector Interactive MCP App Scorecard',
    description:
      'Interactive MCP App HTML scorecard (text/html;profile=mcp-app) rendering design, copy, system, craft, and AEO axes with K-06 compliant framing and uncalibrated beta disclosure.',
    mimeType: 'text/html;profile=mcp-app',
    icons: MCP_ICONS,
  },
];

export const RESOURCE_TEMPLATES = [
  {
    uriTemplate: 'slop://scan/{scan_id}',
    name: 'Scan document',
    description:
      'Full result of a scan_page / check_design_system / fix_prompt / extract_design_system scan from this session (every pattern with evidence). Large: read it only when the summary is not enough.',
    mimeType: 'application/json',
    icons: MCP_ICONS,
  },
];

export const MCP_APP_SCORECARD_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Slop Detector — MCP App Scorecard</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0a0b09;
      --surface: #121410;
      --border: #262922;
      --ink: #ebede8;
      --muted: #93998b;
      --accent: #3ddc84;
      --warn: #eab308;
      --danger: #ef4444;
    }
    body {
      margin: 0;
      padding: 16px;
      background: var(--bg);
      color: var(--ink);
      font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .card {
      border: 1px solid var(--border);
      background: var(--surface);
      padding: 16px;
      border-radius: 5px;
    }
    .hdr {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 1px solid var(--border);
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .badge {
      font-size: 11px;
      padding: 2px 6px;
      border: 1px solid var(--border);
      color: var(--muted);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px;
    }
    .cell {
      border: 1px solid var(--border);
      padding: 10px;
      border-radius: 5px;
    }
    .k { color: var(--muted); font-size: 11px; text-transform: uppercase; }
    .v { font-size: 18px; font-weight: 700; margin-top: 4px; }
    .note { margin-top: 12px; color: var(--muted); font-size: 11px; }
  </style>
</head>
<body>
  <div class="card" id="scorecard">
    <div class="hdr">
      <strong>SLOP DETECTOR // INSTRUMENT SCORECARD</strong>
      <span class="badge">uncalibrated beta · defs ${DEFINITIONS_VERSION}</span>
    </div>
    <div class="grid">
      <div class="cell"><div class="k">Design Axis</div><div class="v" id="design-score">matches N default patterns</div></div>
      <div class="cell"><div class="k">Copy Axis</div><div class="v" id="copy-score">0–100 (lower is better)</div></div>
      <div class="cell"><div class="k">System (DESIGN.md)</div><div class="v" id="system-score">0–100 (higher is better)</div></div>
      <div class="cell"><div class="k">AEO Eligibility</div><div class="v" id="aeo-score">0–100 (higher is better)</div></div>
    </div>
    <p class="note">Measures convergence onto default template patterns (not page authorship).</p>
  </div>
</body>
</html>`;

// ── Scan store ───────────────────────────────────────────────────────────────
// The last few full scan documents, keyed by scan_id. A stdio server lives for
// one client session, so this is session-scoped and gone on restart.
export const SCAN_STORE_LIMIT = 20;
const scanStore = new Map<string, any>();

export function rememberScan(result: any): string {
  const id = `s_${randomUUID().replace(/-/g, '').slice(0, 10)}`;
  scanStore.set(id, result);
  while (scanStore.size > SCAN_STORE_LIMIT) {
    const oldest = scanStore.keys().next().value;
    if (oldest === undefined) break;
    scanStore.delete(oldest);
  }
  return id;
}

export function recalledScan(id: string): any | null {
  return scanStore.get(id) || null;
}

export function resetScanStoreForTests() {
  scanStore.clear();
}

function unknownScanIdMessage(id: string) {
  return `scan_id "${id}" isn't in this server's memory. It keeps the last ${SCAN_STORE_LIMIT} scans of this session and forgets them on restart. Call scan_page again, or pass url.`;
}

// ── Results ──────────────────────────────────────────────────────────────────

export class UnknownToolError extends Error {}

type ToolResult = {
  content: Array<Record<string, any>>;
  isError: boolean;
  structuredContent?: unknown;
};

function okResult(
  text: string,
  structuredContent?: unknown,
  extra: Array<Record<string, any>> = []
): ToolResult {
  const result: ToolResult = { content: [{ type: 'text', text }, ...extra], isError: false };
  if (structuredContent !== undefined) result.structuredContent = structuredContent;
  return result;
}

// Errors carry no structured content: clients validate structured results
// against the output schema only when the call succeeded.
function errorResult(text: string): ToolResult {
  return { content: [{ type: 'text', text }], isError: true };
}

function scanResourceLink(scanId: string, result: any) {
  return {
    type: 'resource_link',
    uri: `slop://scan/${scanId}`,
    name: `scan-${scanId}.json`,
    title: `Full scan document for ${result.finalUrl || result.url}`,
    description:
      'Every pattern with its evidence. Large; read it only when the summary is not enough.',
    mimeType: 'application/json',
  };
}

function urlProblem(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return `Not a valid URL: "${url}". Pass an absolute http(s):// URL${isLocalMode() ? ' or a file:// path' : ''}.`;
  }
  if (!['http:', 'https:', 'file:'].includes(parsed.protocol)) {
    return `Unsupported URL scheme "${parsed.protocol}" in "${url}". Pass an http(s):// URL${isLocalMode() ? ' or a file:// path' : ''}.`;
  }
  if (!isLocalMode() && isLoopbackOrFile(url)) {
    return (
      "This URL is on localhost or file://, which the hosted API can't reach. " +
      `Restart this server in local mode so the scan stays on this machine: ${MCP_LOCAL_SERVER_COMMAND} (or set SLOP_DETECT_LOCAL=1).`
    );
  }
  return null;
}

function designMdOption(value: string | undefined): string | boolean | undefined {
  if (!value) return undefined;
  return value === 'auto' ? true : value;
}

async function runScan(
  url: string,
  opts: { axes?: string[]; preset?: string; designMd?: string | boolean } = {}
) {
  if (isLocalMode()) return localScan(url, opts);
  return stampScanResult(await scanPage(url, opts));
}

function errorMessageFor(err: any, url?: string): string {
  if (err instanceof ApiError) return err.message;
  const message = err && err.message ? String(err.message) : String(err);
  if (isLocalMode()) return describeScanError(err, url || '');
  return `Could not reach slop-detect.com: ${message.split('\n')[0].slice(0, 200)}`;
}

// ── Tools ────────────────────────────────────────────────────────────────────

async function scanPageTool(args: Record<string, any>): Promise<ToolResult> {
  const problem = urlProblem(args.url);
  if (problem) return errorResult(problem);
  const result = await runScan(args.url, {
    axes: args.axes,
    preset: args.preset,
    designMd: designMdOption(args.design_md_url),
  });
  if (isMcpScanFailure(result)) return errorResult(formatScanFailure(result, args.url));
  const scanId = rememberScan(result);
  const structured =
    args.detail === 'full'
      ? { ...result, scanId, detail: 'full' }
      : compactScanResult(result, { scanId });
  return okResult(formatScanSummary(result, { scanId }), structured, [
    scanResourceLink(scanId, result),
  ]);
}

async function checkAeoTool(args: Record<string, any>): Promise<ToolResult> {
  const problem = urlProblem(args.url);
  if (problem) return errorResult(problem);
  const report = isLocalMode()
    ? await localAeo(args.url)
    : stampScanResult(await checkAeo(args.url));
  return okResult(formatAeoSummary(report), compactAeoReport(report));
}

async function systemTool(args: Record<string, any>): Promise<ToolResult> {
  const stored = args.scan_id ? recalledScan(args.scan_id) : null;
  if (args.scan_id && !stored && !args.url) return errorResult(unknownScanIdMessage(args.scan_id));
  let result = stored && stored.system ? stored : null;
  let scanId = result ? args.scan_id : '';
  if (!result) {
    const url = args.url || stored?.finalUrl || stored?.url;
    const problem = urlProblem(url);
    if (problem) return errorResult(problem);
    const designMd = designMdOption(args.design_md_url) ?? true;
    result = isLocalMode()
      ? await localScan(url, { designMd })
      : stampScanResult(await checkSystem(url, designMd === true ? undefined : String(designMd)));
    if (isMcpScanFailure(result)) return errorResult(formatScanFailure(result, url));
    scanId = rememberScan(result);
  }
  return okResult(
    `${formatSystemSummary(result)}\nscan_id: ${scanId}`,
    systemStructured(result, { scanId })
  );
}

async function fixPromptTool(args: Record<string, any>): Promise<ToolResult> {
  if (args.scan_id) {
    const stored = recalledScan(args.scan_id);
    if (!stored) return errorResult(unknownScanIdMessage(args.scan_id));
    const out = buildMcpFixPrompt({ result: stored, brief: args.brief, scanId: args.scan_id });
    return okResult(out.text, out.structured);
  }
  if (args.patterns) {
    const out = buildMcpFixPrompt({ patterns: args.patterns, brief: args.brief });
    return okResult(out.text, out.structured);
  }
  if (args.url) {
    const problem = urlProblem(args.url);
    if (problem) return errorResult(problem);
    const result = await runScan(args.url, {
      axes: args.axes,
      preset: args.preset,
      designMd: designMdOption(args.design_md_url),
    });
    if (isMcpScanFailure(result)) return errorResult(formatScanFailure(result, args.url));
    const scanId = rememberScan(result);
    const out = buildMcpFixPrompt({ result, brief: args.brief, scanId });
    return okResult(out.text, out.structured);
  }
  const out = buildMcpFixPrompt({ brief: true });
  return okResult(out.text, out.structured);
}

async function extractTool(args: Record<string, any>): Promise<ToolResult> {
  if (args.observed) {
    const out = buildMcpDesignSystem({
      observed: args.observed,
      name: args.name,
      url: args.url,
      format: args.format,
    });
    return okResult(out.text, out.structured);
  }
  const stored = args.scan_id ? recalledScan(args.scan_id) : null;
  if (args.scan_id && !stored && !args.url) return errorResult(unknownScanIdMessage(args.scan_id));
  let result = stored && observedTokensOf(stored) ? stored : null;
  let scanId = result ? args.scan_id : '';
  const url = args.url || stored?.finalUrl || stored?.url;
  if (!result) {
    const problem = urlProblem(url);
    if (problem) return errorResult(problem);
    result = await runScan(url, { designMd: true });
    if (isMcpScanFailure(result)) return errorResult(formatScanFailure(result, url));
    scanId = rememberScan(result);
  }
  const observed = observedTokensOf(result);
  if (!observed) {
    return errorResult(
      `The scan of ${result.finalUrl || url} returned no observed design tokens, so there is nothing to extract.`
    );
  }
  const out = buildMcpDesignSystem({
    observed,
    name: args.name || result.title || hostnameLabel(result.finalUrl || url) || undefined,
    url: result.finalUrl || url,
    format: args.format,
  });
  return okResult(out.text, { ...out.structured, scanId });
}

async function runTool(name: string, args: Record<string, any>): Promise<ToolResult> {
  switch (name) {
    case 'lint_design_md': {
      const report = lintDesignMd(args.design_md);
      return okResult(formatDesignMdLint(report), report);
    }
    case 'diff_design_md': {
      const diff = diffDesignMd(args.base_design_md, args.head_design_md);
      return okResult(formatDesignMdDiff(diff), diff);
    }
    case 'scan_page':
      return scanPageTool(args);
    case 'check_aeo':
      return checkAeoTool(args);
    case 'check_design_system':
      return systemTool(args);
    case 'fix_prompt':
      return fixPromptTool(args);
    case 'extract_design_system':
      return extractTool(args);
    default:
      throw new UnknownToolError(mcpUnknownToolMessage(name));
  }
}

// Validate, then run. Unknown tools throw (the transport turns that into a
// JSON-RPC -32602 error, as the hosted endpoint does); everything else comes
// back as a tool result, never a crash.
export async function handleCall(name: string, rawArgs: unknown): Promise<ToolResult> {
  if (!isMcpToolName(name)) throw new UnknownToolError(mcpUnknownToolMessage(name));
  const checked = validateMcpToolArguments(name, rawArgs);
  if (checked.ok === false) return errorResult((checked as { message: string }).message);
  const args = (checked as { args: Record<string, any> }).args;
  try {
    return await runTool(name, args);
  } catch (err) {
    return errorResult(errorMessageFor(err, args.url));
  }
}

export function createServer() {
  const server = new Server(
    { name: 'slop-detect-mcp', version: VERSION },
    {
      capabilities: { tools: {}, prompts: {}, resources: {} },
      instructions: MCP_SERVER_INSTRUCTIONS,
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      return (await handleCall(name, args)) as any;
    } catch (err) {
      if (err instanceof UnknownToolError) throw new McpError(ErrorCode.InvalidParams, err.message);
      throw err;
    }
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: PROMPTS }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: promptArgs } = request.params;
    const rendered = renderMcpPrompt(name, promptArgs || {});
    if (!rendered) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Unknown prompt: ${name}. Available prompts: ${PROMPTS.map((p) => p.name).join(', ')}.`
      );
    }
    return rendered;
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: RESOURCES }));
  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: RESOURCE_TEMPLATES,
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    try {
      const loaded = await loadResource(request.params.uri);
      return { contents: [loaded] };
    } catch (err) {
      if (err instanceof McpError) throw err;
      throw new McpError(
        ErrorCode.InvalidParams,
        err && (err as Error).message ? (err as Error).message : String(err)
      );
    }
  });

  return server;
}

export async function loadResource(uri: string) {
  if (uri.startsWith('slop://scan/')) {
    const id = uri.slice('slop://scan/'.length);
    const stored = recalledScan(id);
    if (!stored) throw new McpError(ErrorCode.InvalidParams, unknownScanIdMessage(id));
    return { uri, mimeType: 'application/json', text: JSON.stringify(stored) };
  }
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
  if (uri === 'ui://slop-detect/scorecard.html') {
    return {
      uri,
      mimeType: 'text/html;profile=mcp-app',
      text: MCP_APP_SCORECARD_HTML,
    };
  }
  throw new McpError(ErrorCode.InvalidParams, `Unknown resource URI: ${uri}`);
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
