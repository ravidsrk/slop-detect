// One MCP tool contract for both servers: the npm/stdio server
// (packages/mcp) and the hosted Streamable HTTP endpoint
// (apps/web/functions/mcp.ts). Names, input schemas, descriptions, annotations,
// prompts and server instructions live here so the two surfaces can't drift
// apart again (#361). Each server adds only transport details (icons, output
// schemas, cache hints) on top.

import { PRESETS } from './presets.js';

export const MCP_TOOL_NAMES = [
  'scan_page',
  'check_aeo',
  'check_design_system',
  'fix_prompt',
  'lint_design_md',
  'diff_design_md',
  'extract_design_system',
] as const;

export type McpToolName = (typeof MCP_TOOL_NAMES)[number];

export const MCP_PRESET_IDS: string[] = Object.keys(PRESETS);
export const MCP_SCAN_AXES = ['design', 'copy', 'craft'];
export const MCP_EXTRACT_FORMATS = ['design_md', 'dtcg', 'both'];
export const MCP_DETAIL_LEVELS = ['summary', 'full'];

// The command that runs the npm server in local mode. `slop-detect` (the
// Playwright runner) is an optional peer, so it has to be installed alongside.
export const MCP_LOCAL_SERVER_COMMAND =
  'npx -y -p slop-detect -p slop-detect-mcp slop-detect-mcp --local';

export const MCP_ICONS = [
  { src: 'https://slop-detect.com/favicon.svg', mimeType: 'image/svg+xml', sizes: ['any'] },
];

export const MCP_SERVER_INSTRUCTIONS = [
  'Slop Detector scores landing pages deterministically. Use these tools when the user asks whether a page looks generic or templated (scan_page), how to fix those findings (fix_prompt), whether search and AI answer engines can read and cite a page (check_aeo), or whether a page follows its own DESIGN.md design system (check_design_system, lint_design_md, diff_design_md, extract_design_system).',
  'Polarity: scan_page scores run 0–100 where lower is better; AEO and DESIGN.md compliance scores run 0–100 where higher is better.',
  'Scans drive a real browser (about 5–30 seconds each) and hosted scans are rate limited, so reuse results: pass scan_id (npm server) or the triggered pattern IDs to fix_prompt instead of scanning again, and pass design_md_url to scan_page when you also need DESIGN.md compliance.',
  `The hosted server can't reach localhost or private URLs. For a local dev server, run the npm server in local mode: ${MCP_LOCAL_SERVER_COMMAND}`,
  'Scores measure overlap with common template defaults, never who or what made a page. A scan that cannot run returns an error, which is not a Clean result.',
].join('\n\n');

const URL_DESCRIPTION =
  'Absolute URL of the page, e.g. https://example.com. localhost and file:// URLs work only on the npm server started with --local.';
const SCAN_ID_DESCRIPTION =
  'scan_id returned by an earlier scan_page call in this session. Kept in memory by the npm server only; the hosted endpoint is stateless.';
const AXES_SCHEMA = {
  type: 'array',
  items: { type: 'string', enum: MCP_SCAN_AXES },
  description:
    'Axes to score. design is always scored; add copy (prose tells) and/or craft (a separate defect floor that never changes the design score). Default: ["design"].',
};
const PRESET_SCHEMA = {
  type: 'string',
  enum: MCP_PRESET_IDS,
  description:
    'Design pattern preset. It filters design patterns only; copy, craft, AEO and DESIGN.md scores are unchanged. Default: full.',
};
const DESIGN_MD_URL_DESCRIPTION =
  'Also score compliance with the site\'s own DESIGN.md: "auto" looks for <origin>/DESIGN.md; or pass the URL of a DESIGN.md or tokens.json.';

const READ_ONLY_FETCH = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};
const READ_ONLY_LOCAL = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export interface McpToolDefinition {
  name: McpToolName;
  title: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
    additionalProperties: false;
  };
  annotations: Record<string, any>;
}

function tool(
  name: McpToolName,
  title: string,
  description: string,
  properties: Record<string, any>,
  required: string[],
  annotations: Record<string, any>
): McpToolDefinition {
  return {
    name,
    title,
    description,
    inputSchema: { type: 'object', properties, required, additionalProperties: false },
    annotations: { title, ...annotations },
  };
}

export const MCP_TOOLS: McpToolDefinition[] = [
  tool(
    'scan_page',
    'Scan Page for Default-Template Patterns',
    [
      "Score a landing page against the versioned default-template pattern catalogue. The design axis inspects computed CSS and DOM in headless Chromium; add the copy axis for prose tells, the craft axis for a separate defect floor, and design_md_url to also score compliance with the site's DESIGN.md.",
      'Use it when the user asks whether a page looks generic or templated, wants a slop score, or before and after UI changes.',
      'Returns a short summary: score 0–100 (lower is better; Clean 0–9, Mild 10–27, Heavy 28+), tier, grade, and only the triggered patterns with their IDs, weights and evidence.',
      'Each call runs a real browser scan (about 5–30 seconds); hosted scans are rate limited per IP. localhost and file:// URLs need the npm server started with --local. Results are not published anywhere.',
      'Scores measure overlap with common template defaults, not who or what made the page.',
      'Not for crawler or AI-engine readiness (check_aeo) or for linting a DESIGN.md file (lint_design_md). Next step: fix_prompt with the scan_id (npm server) or the triggered pattern IDs.',
    ].join(' '),
    {
      url: { type: 'string', description: URL_DESCRIPTION },
      axes: AXES_SCHEMA,
      preset: PRESET_SCHEMA,
      design_md_url: { type: 'string', description: DESIGN_MD_URL_DESCRIPTION },
      detail: {
        type: 'string',
        enum: MCP_DETAIL_LEVELS,
        description:
          "summary (default): the structured result lists triggered patterns only. full: the complete scan document (often 20,000–100,000 characters); use it only when you need every pattern's evidence.",
      },
    },
    ['url'],
    READ_ONLY_FETCH
  ),
  tool(
    'check_aeo',
    'Check AEO Crawler & Citation Readiness',
    [
      'Check whether search engines and AI answer engines can fetch, parse and cite a page, using static HTTP checks (no browser): reachability, edge access, robots.txt search rules, indexability, AI preview controls, server-rendered text coverage, a Markdown twin, llms.txt and more.',
      'Use it when the user asks whether ChatGPT, Claude, Perplexity or search crawlers can read or cite their site.',
      'Returns a 0–100 score where higher is better, a tier (Eligible 80+, Partially Eligible 50–79, Restricted below 50) and the failed checks. Takes a few seconds.',
      "The scanner uses its own user agent and doesn't impersonate vendor crawlers, so a site that blocks unknown bots can score lower than real crawlers would see it.",
      "localhost needs the npm server started with --local; file:// pages can't be checked. Not for visual or copy quality (scan_page).",
    ].join(' '),
    { url: { type: 'string', description: URL_DESCRIPTION } },
    ['url'],
    READ_ONLY_FETCH
  ),
  tool(
    'check_design_system',
    'Check DESIGN.md System Compliance',
    [
      'Check whether a live page follows its own declared design system: a DESIGN.md (Google Labs format) or a W3C DTCG tokens.json.',
      'Use it before shipping UI changes on a site that publishes a DESIGN.md, to catch fonts, CTA and surface colours, and radii that drift from the declared tokens.',
      'Returns a 0–100 compliance score where higher is better (Aligned 80+, Drifting 50–79, Off-system below 50) and the named drift signals; if the site declares no system it says so instead of scoring.',
      'Runs a browser scan (about 5–30 seconds) unless scan_id points at an earlier scan_page result that included design_md_url. If you already called scan_page with design_md_url, its response already contains this result.',
      "Unlike scan_page, it judges the page against the site's own tokens, not against template defaults.",
    ].join(' '),
    {
      url: { type: 'string', description: URL_DESCRIPTION },
      design_md_url: {
        type: 'string',
        description:
          '"auto" (default) looks for <origin>/DESIGN.md; or pass the URL of a DESIGN.md or tokens.json.',
      },
      scan_id: { type: 'string', description: SCAN_ID_DESCRIPTION },
    },
    [],
    READ_ONLY_FETCH
  ),
  tool(
    'fix_prompt',
    'Build Remediation Prompt',
    [
      'Build a copy-paste remediation prompt for a coding agent: for each triggered pattern, what was found, why it reads as a template default, the fix, alternatives and a hard rule, plus the heaviest currently-passing patterns not to introduce.',
      'Use it after scan_page when the user wants the findings fixed.',
      'Reuse the scan you already have: pass scan_id (npm server) or patterns (the triggered pattern IDs from scan_page). Pass url only when there is no scan yet; that runs a new browser scan (about 5–30 seconds).',
      'brief: true returns a short avoid list (at most 120 words) instead; with no url, scan_id or patterns it returns a generic avoid list for a page that has not been built yet.',
      "Returns text only; it doesn't edit files.",
    ].join(' '),
    {
      url: {
        type: 'string',
        description: `Page to scan when you have no scan yet; ignored when scan_id or patterns is given. ${URL_DESCRIPTION}`,
      },
      scan_id: { type: 'string', description: SCAN_ID_DESCRIPTION },
      patterns: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Triggered pattern IDs from a scan_page result, e.g. ["bento_grid", "gradient_text"]. Builds the prompt without scanning; score lines are left out.',
      },
      axes: {
        ...AXES_SCHEMA,
        description: `${AXES_SCHEMA.description} Used only when url triggers a new scan.`,
      },
      preset: {
        ...PRESET_SCHEMA,
        description: `${PRESET_SCHEMA.description} Used only when url triggers a new scan.`,
      },
      design_md_url: {
        type: 'string',
        description: `${DESIGN_MD_URL_DESCRIPTION} Used only when url triggers a new scan.`,
      },
      brief: {
        type: 'boolean',
        description:
          'true: return a short avoid list (at most 120 words) instead of the full prompt. Default false.',
      },
    },
    [],
    READ_ONLY_FETCH
  ),
  tool(
    'lint_design_md',
    'Lint a DESIGN.md File',
    [
      'Statically lint DESIGN.md text: broken token references, component contrast below WCAG 4.5:1, orphaned palette tokens, and a specVersion other than alpha.',
      'Use it while writing or editing a DESIGN.md.',
      "Local and instant: it doesn't fetch a page and doesn't change any score. Pass the document text, not a path or URL (read the file first).",
      'Returns valid or invalid, error and warning counts, and each issue with its rule ID and token path.',
    ].join(' '),
    {
      design_md: {
        type: 'string',
        description:
          'The full DESIGN.md text, including its YAML front matter (or a ```yaml block).',
      },
    },
    ['design_md'],
    READ_ONLY_LOCAL
  ),
  tool(
    'diff_design_md',
    'Diff Two DESIGN.md Files',
    [
      'Compare two DESIGN.md documents token by token and list added, removed and changed tokens; a removed or changed token is breaking.',
      'Use it when reviewing a change to a DESIGN.md.',
      "Local and instant: it doesn't fetch or rescore a page. Pass both documents as text (read the files first).",
    ].join(' '),
    {
      base_design_md: { type: 'string', description: 'DESIGN.md text before the change.' },
      head_design_md: { type: 'string', description: 'DESIGN.md text after the change.' },
    },
    ['base_design_md', 'head_design_md'],
    READ_ONLY_LOCAL
  ),
  tool(
    'extract_design_system',
    'Extract DESIGN.md & DTCG Tokens from a Page',
    [
      'Reverse-engineer a starter design system from a live page: the colours, typography, radii, shadows and spacing it renders become a Google Labs DESIGN.md and/or a W3C DTCG 2025.10 tokens.json.',
      'Use it to bootstrap a DESIGN.md for a site that has none.',
      'Runs a browser scan of url (about 5–30 seconds) unless you pass scan_id (an earlier scan_page made with design_md_url; npm server only) or observed tokens.',
      "The output describes what the page renders today, not a recommended palette; review it before publishing. Returns the document text; it doesn't write files.",
    ].join(' '),
    {
      url: { type: 'string', description: URL_DESCRIPTION },
      scan_id: { type: 'string', description: SCAN_ID_DESCRIPTION },
      observed: {
        type: 'object',
        description:
          'Advanced: tokens you already observed, as { surface, headings, ctas, fonts, radii }, converted without scanning.',
      },
      name: { type: 'string', description: 'Design system name. Defaults to the page title.' },
      format: {
        type: 'string',
        enum: MCP_EXTRACT_FORMATS,
        description: 'design_md (default), dtcg (tokens.json), or both.',
      },
    },
    [],
    READ_ONLY_FETCH
  ),
];

const TOOLS_BY_NAME = new Map(MCP_TOOLS.map((t) => [t.name, t]));

export function isMcpToolName(name: unknown): name is McpToolName {
  return typeof name === 'string' && TOOLS_BY_NAME.has(name as McpToolName);
}

export function mcpUnknownToolMessage(name: unknown): string {
  return `Unknown tool: ${String(name)}. Available tools: ${MCP_TOOL_NAMES.join(', ')}.`;
}

// ── Argument validation ──────────────────────────────────────────────────────
// Both servers validate before running anything, so a missing or misspelled
// argument comes back as a short corrective error instead of a silent result.
// Parameter names that either server used before the contract was unified are
// accepted as aliases, so an agent that learned the older names still gets the
// right answer.

const ALIASES: Record<McpToolName, Record<string, string>> = {
  scan_page: { designMd: 'design_md_url', designMdUrl: 'design_md_url' },
  check_aeo: {},
  check_design_system: {
    designMd: 'design_md_url',
    designMdUrl: 'design_md_url',
    scanId: 'scan_id',
  },
  fix_prompt: { designMd: 'design_md_url', designMdUrl: 'design_md_url', scanId: 'scan_id' },
  lint_design_md: { content: 'design_md', text: 'design_md', designMd: 'design_md' },
  diff_design_md: {
    base: 'base_design_md',
    before: 'base_design_md',
    head: 'head_design_md',
    after: 'head_design_md',
  },
  extract_design_system: { scanId: 'scan_id' },
};

// At least one of these must be present (fix_prompt with brief: true needs none).
const ONE_OF: Partial<Record<McpToolName, string[]>> = {
  check_design_system: ['url', 'scan_id'],
  fix_prompt: ['url', 'scan_id', 'patterns'],
  extract_design_system: ['url', 'scan_id', 'observed'],
};

// Free-text documents keep their whitespace; everything else is trimmed.
const RAW_TEXT_KEYS = new Set(['design_md', 'base_design_md', 'head_design_md']);

export type McpArgsResult =
  { ok: true; args: Record<string, any> } | { ok: false; message: string };

function firstSentence(text: string): string {
  const match = String(text || '').match(/^.*?[.!?](\s|$)/);
  return (match ? match[0] : String(text || '')).trim();
}

export function validateMcpToolArguments(name: string, raw: unknown): McpArgsResult {
  const fail = (message: string): McpArgsResult => ({ ok: false, message });
  const definition = TOOLS_BY_NAME.get(name as McpToolName);
  if (!definition) return fail(mcpUnknownToolMessage(name));
  if (raw != null && (typeof raw !== 'object' || Array.isArray(raw))) {
    return fail(`Arguments for ${name} must be a JSON object.`);
  }
  const input: Record<string, any> = { ...((raw as Record<string, any>) || {}) };
  const props = definition.inputSchema.properties;
  const valid = Object.keys(props).join(', ');

  // Legacy shapes from before the contract was unified.
  if ((name === 'scan_page' || name === 'fix_prompt') && 'copy' in input) {
    const copy = input.copy;
    delete input.copy;
    if (typeof copy !== 'boolean') {
      return fail(`"copy" must be true or false. Prefer axes: ["design", "copy"].`);
    }
    if (copy) {
      const axes = input.axes === undefined ? ['design'] : input.axes;
      input.axes = Array.isArray(axes) ? [...axes, 'copy'] : axes;
    }
  }
  if (name === 'fix_prompt' && 'mode' in input) {
    const mode = input.mode;
    delete input.mode;
    if (mode !== 'fix' && mode !== 'avoid') {
      return fail(`"mode" must be "fix" or "avoid". Prefer brief: true for an avoid list.`);
    }
    if (input.brief === undefined) input.brief = mode === 'avoid';
  }
  for (const [alias, canonical] of Object.entries(ALIASES[definition.name])) {
    if (!(alias in input)) continue;
    const value = input[alias];
    delete input[alias];
    if (input[canonical] === undefined) input[canonical] = value;
  }

  for (const key of Object.keys(input)) {
    if (!(key in props)) {
      return fail(`Unknown argument "${key}" for ${name}. Valid arguments: ${valid}.`);
    }
  }

  const out: Record<string, any> = {};
  for (const [key, spec] of Object.entries(props)) {
    let value = input[key];
    if (value === undefined || value === null) continue;
    if (spec.type === 'string') {
      if (key === 'design_md_url' && value === true) value = 'auto';
      if (key === 'design_md_url' && value === false) continue;
      if (typeof value !== 'string') return fail(`"${key}" must be a string.`);
      const trimmed = value.trim();
      if (!trimmed) continue;
      if (spec.enum && !spec.enum.includes(trimmed)) {
        return fail(`"${key}" must be one of: ${spec.enum.join(', ')} (got "${trimmed}").`);
      }
      out[key] = RAW_TEXT_KEYS.has(key) ? value : trimmed;
    } else if (spec.type === 'boolean') {
      if (typeof value !== 'boolean') return fail(`"${key}" must be true or false.`);
      out[key] = value;
    } else if (spec.type === 'array') {
      if (key === 'axes' && value === 'all') value = [...MCP_SCAN_AXES];
      if (typeof value === 'string') value = [value];
      if (!Array.isArray(value)) return fail(`"${key}" must be an array of strings.`);
      const items = value.map((item: any) =>
        key === 'patterns' && item && typeof item === 'object' && typeof item.id === 'string'
          ? item.id
          : item
      );
      const allowed = spec.items && spec.items.enum;
      const cleaned: string[] = [];
      for (const item of items) {
        if (typeof item !== 'string' || !item.trim()) {
          return fail(`"${key}" must be an array of non-empty strings.`);
        }
        const text = item.trim();
        if (allowed && !allowed.includes(text)) {
          return fail(`"${key}" items must be from: ${allowed.join(', ')} (got "${text}").`);
        }
        if (!cleaned.includes(text)) cleaned.push(text);
      }
      if (!cleaned.length) continue;
      out[key] = cleaned;
    } else if (spec.type === 'object') {
      if (typeof value !== 'object' || Array.isArray(value)) {
        return fail(`"${key}" must be a JSON object.`);
      }
      out[key] = value;
    }
  }

  for (const key of definition.inputSchema.required) {
    if (out[key] === undefined) {
      return fail(
        `Missing required argument "${key}" for ${name}: ${firstSentence(props[key].description)}`
      );
    }
  }
  const oneOf = ONE_OF[definition.name];
  if (oneOf && !oneOf.some((key) => out[key] !== undefined)) {
    if (!(definition.name === 'fix_prompt' && out.brief === true)) {
      return fail(
        `Pass one of ${oneOf.map((key) => `"${key}"`).join(', ')} to ${name}.` +
          (definition.name === 'fix_prompt'
            ? ' Or pass brief: true alone for a generic avoid list.'
            : '')
      );
    }
  }
  if (Array.isArray(out.axes) && !out.axes.includes('design')) out.axes = ['design', ...out.axes];
  return { ok: true, args: out };
}

// ── Prompts ──────────────────────────────────────────────────────────────────

export const MCP_PROMPTS = [
  {
    name: 'audit_landing_page',
    title: 'Audit a landing page',
    description:
      'Run the design, copy and AEO checks on a URL (plus DESIGN.md compliance when the site has one) and write a prioritized report.',
    arguments: [
      {
        name: 'url',
        description: 'Landing page URL to audit, e.g. https://example.com.',
        required: true,
      },
    ],
  },
  {
    name: 'deslop_and_verify',
    title: 'Fix and verify',
    description:
      'Build the fix prompt for a page, apply the fixes in the codebase, then re-scan where the changes run to confirm the result.',
    arguments: [
      {
        name: 'url',
        description:
          'URL of the page as it runs with your changes: a local dev server (npm server with --local) or a preview deploy.',
        required: true,
      },
    ],
  },
  {
    name: 'refactor_to_design_system',
    title: 'Refactor to the declared design system',
    description: 'Check a page against its DESIGN.md, fix the drifting components, and re-check.',
    arguments: [
      {
        name: 'url',
        description: 'URL of the page that should follow its DESIGN.md.',
        required: true,
      },
    ],
  },
];

// Older hyphenated prompt names from the hosted endpoint.
export const MCP_PROMPT_ALIASES: Record<string, string> = {
  'audit-landing-page': 'audit_landing_page',
  'deslop-and-verify': 'deslop_and_verify',
  'refactor-to-design-system': 'refactor_to_design_system',
};

export function renderMcpPrompt(
  rawName: string,
  args: Record<string, any> = {}
): {
  description: string;
  messages: Array<{ role: 'user'; content: { type: 'text'; text: string } }>;
} | null {
  const name = MCP_PROMPT_ALIASES[rawName] || rawName;
  const prompt = MCP_PROMPTS.find((p) => p.name === name);
  if (!prompt) return null;
  const url = typeof args?.url === 'string' && args.url.trim() ? args.url.trim() : '<url>';
  let text: string;
  if (name === 'audit_landing_page') {
    const quotedUrl = JSON.stringify(url);
    text = [
      `Audit the landing page at ${url} with the slop-detect tools:`,
      `1. Call scan_page with {"url": ${quotedUrl}, "axes": ["design", "copy"], "design_md_url": "auto"}.`,
      `2. Call check_aeo with {"url": ${quotedUrl}}.`,
      '3. Report the scores with their polarity (design and copy: lower is better; DESIGN.md compliance and AEO: higher is better), then the findings in priority order: heaviest triggered patterns first, then DESIGN.md drift, then failed AEO checks.',
      '4. Offer a fix prompt: call fix_prompt with the scan_id from step 1 (or the triggered pattern IDs) so the page is not scanned again.',
      'The scores measure overlap with common template defaults, not who or what made the page.',
    ].join('\n');
  } else if (name === 'deslop_and_verify') {
    const quotedUrl = JSON.stringify(url);
    text = [
      `De-slop the page at ${url}:`,
      `1. Call scan_page with {"url": ${quotedUrl}, "axes": ["design", "copy"]}, then call fix_prompt with the returned scan_id (or the triggered pattern IDs).`,
      '2. Apply each fix in the codebase. Do not introduce any of the currently passing patterns the prompt lists.',
      '3. Verify where the changes actually run: re-scan your local dev server (npm server started with --local) or a fresh preview deploy. A production URL only reflects your changes after you deploy.',
      '4. Done means the design score is under 10 (Clean) and none of the fixed patterns still trigger. If the scan cannot run (an error instead of a score), say so; that is not a Clean result.',
    ].join('\n');
  } else {
    const quotedUrl = JSON.stringify(url);
    text = [
      `Bring ${url} back in line with its declared design system:`,
      `1. Call check_design_system with {"url": ${quotedUrl}}. If it reports no declared system, stop and say so.`,
      '2. Fix each drift signal in the codebase (fonts, CTA and surface colours, radii) using the tokens the DESIGN.md declares.',
      '3. Re-run check_design_system where the changes run (local dev server with --local, or a preview deploy) and confirm the tier is Aligned (80+).',
    ].join('\n');
  }
  return {
    description: `${prompt.title}: ${url}`,
    messages: [{ role: 'user', content: { type: 'text', text } }],
  };
}
