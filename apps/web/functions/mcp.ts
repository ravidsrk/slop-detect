// POST /mcp, GET /mcp, OPTIONS /mcp — Remote MCP Streamable HTTP Transport (R-04 #320, R-07 #323)
//
// Implements MCP protocol `2025-11-25` Streamable HTTP transport over a stateless
// Cloudflare Pages Function:
// - Deterministic `tools/list` ordering (`DETERMINISTIC_TOOL_ORDER`) with `ttlMs: 300000`
//   and `cacheScope: "public"` so agent prompt caches stay warm across turns.
// - Interactive MCP Apps score card resource (`ui://slop-detect/scorecard.html`,
//   `mimeType: "text/html;profile=mcp-app"`) with editorial-instrument styling,
//   K-06 harm-avoiding language ("matches N default-template patterns"), and the
//   FIX-04 "uncalibrated beta" badge linked to CALIBRATION.md.
// - SSRF protection via `validateScanUrl` across all URL-accepting tools.
// - `Mcp-Method` and `Mcp-Name` response headers for Cloudflare analytics.

import {
  PATTERNS,
  COPY_PATTERNS,
  CRAFT_CHECKS,
  SYSTEM_CHECKS,
  AEO_CHECKS,
  DEFINITIONS_VERSION,
  buildFixPrompt,
  buildAvoidList,
  lintDesignMd,
  diffDesignMd,
  generateDesignMd,
  extractDtcgTokens,
} from '@slop-detect/core';
import { validateScanUrl } from './_ssrf.js';
import { onRequestPost as scanOnRequestPost } from './api/scan.js';
import { onRequestPost as aeoOnRequestPost } from './api/aeo.js';
import { onRequestPost as fixPromptOnRequestPost } from './api/fix-prompt.js';
import {
  buildServerCard,
  DETERMINISTIC_TOOL_ORDER,
  MCP_PROTOCOL_VERSION,
  MCP_SERVER_VERSION,
  MCP_TOOL_TTL_MS,
  MCP_SCORECARD_URI,
  MCP_SCORECARD_MIME,
} from './mcp/server-card.js';

export {
  validateScanUrl as validateTargetUrl,
  DETERMINISTIC_TOOL_ORDER,
  MCP_PROTOCOL_VERSION,
  MCP_SERVER_VERSION,
  MCP_TOOL_TTL_MS,
  MCP_SCORECARD_URI,
  MCP_SCORECARD_MIME,
  buildServerCard,
};

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version, X-Request-Id',
  'Access-Control-Expose-Headers': 'Mcp-Method, Mcp-Name, Mcp-Protocol-Version',
};

const DESIGN_MD_TEMPLATE = `---
name: "Site Design System"
specVersion: "alpha"
colors:
  surface: "#F6F4EE"
  ink: "#181815"
  primary: "#1F5E3B"
typography:
  h1:
    fontFamily: "IBM Plex Mono"
  body:
    fontFamily: "IBM Plex Mono"
rounded:
  sm: 2px
  md: 4px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
---

# Site Design System (\`DESIGN.md\`)

Declare your normative design tokens in the YAML front matter above so \`slop-detect\`
waives intentional brand choices and audits live DOM token compliance.
`;

// ── R-07 (#323): Editorial-instrument MCP Apps Score Card HTML ───────────────
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderScorecardHtml(initialData?: Record<string, any>): string {
  const data = initialData && typeof initialData === 'object' ? initialData : {};
  const url = typeof data.url === 'string' ? data.url : 'https://example.com';
  const score = typeof data.score === 'number' ? data.score : 0;
  const tier = typeof data.tier === 'string' ? data.tier : 'Clean';
  const triggered = Array.isArray(data.patterns)
    ? data.patterns.filter((p: any) => p && p.triggered && !p.waived)
    : [];
  const patternCount = triggered.length;
  const designScore = data.axes?.design?.score ?? score;
  const copyScore = data.axes?.copy?.score ?? null;
  const craftScore = data.axes?.craft?.score ?? null;
  const fixPromptText =
    typeof data.fixPrompt === 'string' && data.fixPrompt.trim()
      ? data.fixPrompt
      : triggered.length > 0
        ? buildFixPrompt({ url, score, tier, patterns: data.patterns })
        : 'No default-template patterns triggered.';

  const rowsHtml =
    triggered.length > 0
      ? triggered
          .map(
            (p: any) => `<tr>
          <td><code>${escapeHtml(p.id)}</code></td>
          <td>${escapeHtml(p.label || p.id)}</td>
          <td class="num">${escapeHtml(p.weight ?? 0)}</td>
          <td>${escapeHtml(p.detail || '')}</td>
        </tr>`
          )
          .join('\n')
      : `<tr><td colspan="4" class="empty">0 triggered patterns — matches 0 default-template patterns.</td></tr>`;

  const serializedInitial = JSON.stringify({
    url,
    score,
    tier,
    patternCount,
    axes: { design: designScore, copy: copyScore, craft: craftScore },
    triggered: triggered.map((p: any) => ({
      id: p.id,
      label: p.label || p.id,
      weight: p.weight ?? 0,
      detail: p.detail || '',
    })),
    fixPrompt: fixPromptText,
  }).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Slop Detector — MCP Score Card</title>
  <style>
    :root {
      --bg: #F6F4EE;
      --surface: #EFECE4;
      --ink: #181815;
      --muted: #5C5A54;
      --rule: #181815;
      --clean: #1F5E3B;
      --mild: #8A5A00;
      --heavy: #9E2A2B;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      background: var(--bg);
      color: var(--ink);
      font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      line-height: 1.5;
    }
    .instrument {
      border: 1.5px solid var(--rule);
      background: var(--bg);
      max-width: 760px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-bottom: 1.5px solid var(--rule);
      background: var(--surface);
    }
    .title {
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .beta-badge {
      display: inline-block;
      padding: 2px 6px;
      border: 1px solid var(--rule);
      font-size: 11px;
      color: var(--ink);
      text-decoration: none;
      background: var(--bg);
    }
    .beta-badge:hover {
      background: var(--ink);
      color: var(--bg);
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      border-bottom: 1.5px solid var(--rule);
    }
    .cell {
      padding: 12px 14px;
      border-right: 1px solid var(--rule);
    }
    .cell:last-child { border-right: none; }
    .label {
      font-size: 11px;
      text-transform: uppercase;
      color: var(--muted);
      display: block;
    }
    .value {
      font-size: 20px;
      font-weight: 700;
      margin-top: 2px;
    }
    .tier-badge {
      display: inline-block;
      padding: 2px 8px;
      border: 1px solid var(--rule);
      font-weight: 700;
      text-transform: uppercase;
    }
    .verdict-bar {
      padding: 10px 14px;
      border-bottom: 1.5px solid var(--rule);
      font-weight: 600;
    }
    .axes-bar {
      display: flex;
      gap: 16px;
      padding: 8px 14px;
      border-bottom: 1.5px solid var(--rule);
      background: var(--surface);
      font-size: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      padding: 8px 10px;
      border-bottom: 1px solid var(--rule);
      text-align: left;
      vertical-align: top;
    }
    th {
      background: var(--surface);
      text-transform: uppercase;
      font-size: 11px;
    }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    td.empty { color: var(--muted); font-style: italic; }
    .actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      background: var(--surface);
    }
    button.copy-btn {
      font-family: inherit;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 12px;
      border: 1.5px solid var(--rule);
      background: var(--bg);
      color: var(--ink);
      cursor: pointer;
      text-transform: uppercase;
    }
    button.copy-btn:hover {
      background: var(--ink);
      color: var(--bg);
    }
  </style>
</head>
<body>
  <article class="instrument" aria-label="Slop Detector Score Card">
    <header class="header">
      <span class="title">SLOP-DETECT // EDITORIAL INSTRUMENT</span>
      <a
        class="beta-badge"
        href="https://github.com/ravidsrk/slop-detect/blob/main/CALIBRATION.md"
        target="_blank"
        rel="noopener noreferrer"
      >uncalibrated beta</a>
    </header>
    <section class="summary">
      <div class="cell">
        <span class="label">Target URL</span>
        <div class="value" id="sc-url" style="font-size:13px;word-break:break-all;">${escapeHtml(url)}</div>
      </div>
      <div class="cell">
        <span class="label">Composite Score</span>
        <div class="value" id="sc-score">${escapeHtml(score)} / 100</div>
      </div>
      <div class="cell">
        <span class="label">Tier</span>
        <div class="value"><span class="tier-badge" id="sc-tier">${escapeHtml(tier)}</span></div>
      </div>
    </section>
    <div class="verdict-bar" id="sc-verdict">
      Page matches <span id="sc-pattern-count">${escapeHtml(patternCount)}</span> default-template patterns.
    </div>
    <div class="axes-bar" id="sc-axes">
      <span>DESIGN: <strong id="sc-axis-design">${escapeHtml(designScore)}</strong></span>
      <span>COPY: <strong id="sc-axis-copy">${escapeHtml(copyScore ?? '—')}</strong></span>
      <span>CRAFT: <strong id="sc-axis-craft">${escapeHtml(craftScore ?? '—')}</strong></span>
    </div>
    <table aria-label="Triggered default-template patterns">
      <thead>
        <tr>
          <th>Pattern ID</th>
          <th>Label</th>
          <th>Weight</th>
          <th>Evidence</th>
        </tr>
      </thead>
      <tbody id="sc-rows">
        ${rowsHtml}
      </tbody>
    </table>
    <footer class="actions">
      <span id="sc-status">Ready — DEFINITIONS_VERSION ${escapeHtml(DEFINITIONS_VERSION)}</span>
      <button type="button" class="copy-btn" id="sc-copy-fix">Copy Fix Prompt</button>
    </footer>
  </article>
  <script>
    (function () {
      var state = ${serializedInitial};
      var btn = document.getElementById('sc-copy-fix');
      var statusEl = document.getElementById('sc-status');
      function hydrate(next) {
        if (!next || typeof next !== 'object') return;
        state = Object.assign({}, state, next);
        if (next.url) document.getElementById('sc-url').textContent = String(next.url);
        if (typeof next.score === 'number') {
          document.getElementById('sc-score').textContent = next.score + ' / 100';
        }
        if (next.tier) document.getElementById('sc-tier').textContent = String(next.tier);
        var trig = Array.isArray(next.patterns)
          ? next.patterns.filter(function (p) { return p && p.triggered && !p.waived; })
          : Array.isArray(next.triggered) ? next.triggered : null;
        if (trig) {
          document.getElementById('sc-pattern-count').textContent = String(trig.length);
          var tbody = document.getElementById('sc-rows');
          tbody.innerHTML = '';
          if (trig.length === 0) {
            var tr = document.createElement('tr');
            var td = document.createElement('td');
            td.colSpan = 4;
            td.className = 'empty';
            td.textContent = '0 triggered patterns — matches 0 default-template patterns.';
            tr.appendChild(td);
            tbody.appendChild(tr);
          } else {
            trig.forEach(function (p) {
              var tr = document.createElement('tr');
              ['id', 'label', 'weight', 'detail'].forEach(function (k) {
                var td = document.createElement('td');
                if (k === 'weight') td.className = 'num';
                td.textContent = String(p[k] !== undefined ? p[k] : '');
                tr.appendChild(td);
              });
              tbody.appendChild(tr);
            });
          }
        }
      }
      if (btn) {
        btn.addEventListener('click', function () {
          var promptText = state.fixPrompt || '';
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(promptText).then(function () {
              statusEl.textContent = 'Fix prompt copied to clipboard.';
            });
          }
        });
      }
      window.addEventListener('message', function (ev) {
        var msg = ev && ev.data;
        if (!msg || typeof msg !== 'object') return;
        if (msg.method === 'ui/notifications/tool-result' && msg.params) {
          hydrate(msg.params.structuredContent || msg.params);
        } else if (msg.structuredContent) {
          hydrate(msg.structuredContent);
        }
      });
    })();
  </script>
</body>
</html>`;
}

// ── Deterministic Tool Definitions (R-04 #320) ───────────────────────────────
const TOOL_DEFINITIONS_MAP: Record<string, any> = {
  scan_page: {
    name: 'scan_page',
    title: 'Scan Landing Page for Default-Template Patterns',
    description:
      'Scan a live URL with headless Chromium and score it against the design, copy, and craft pattern catalogue (0–100; Clean 0–9, Mild 10–27, Heavy 28+).',
    ttlMs: MCP_TOOL_TTL_MS,
    cacheScope: 'public',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Public http:// or https:// URL to scan.',
        },
        preset: {
          type: 'string',
          enum: ['full', 'nextjs', 'astro', 'tailwind', 'shadcn'],
          description: 'Optional framework preset.',
        },
        axes: {
          oneOf: [
            { type: 'string', enum: ['all'] },
            {
              type: 'array',
              items: { type: 'string', enum: ['design', 'copy', 'craft'] },
            },
          ],
          description: 'Axes to evaluate (defaults to all).',
        },
      },
      required: ['url'],
    },
    annotations: {
      title: 'Scan Landing Page',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      ttlMs: MCP_TOOL_TTL_MS,
      cacheScope: 'public',
      ui: { resourceUri: MCP_SCORECARD_URI },
    },
  },
  check_aeo: {
    name: 'check_aeo',
    title: 'Check AEO (AI Engine Optimization) Readiness',
    description:
      'Run the 16-check AEO static HTTP audit on a URL (higher score = better AI-engine answerability).',
    ttlMs: MCP_TOOL_TTL_MS,
    cacheScope: 'public',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Public http:// or https:// URL to audit.',
        },
      },
      required: ['url'],
    },
    annotations: {
      title: 'Check AEO Readiness',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      ttlMs: MCP_TOOL_TTL_MS,
      cacheScope: 'public',
      ui: { resourceUri: MCP_SCORECARD_URI },
    },
  },
  check_design_system: {
    name: 'check_design_system',
    title: 'Check DESIGN.md / DTCG Design System Compliance',
    description:
      'Audit whether a live URL honors its declared DESIGN.md or W3C DTCG 2025.10 tokens.json design system.',
    ttlMs: MCP_TOOL_TTL_MS,
    cacheScope: 'public',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Public http:// or https:// URL to audit.',
        },
        designMd: {
          oneOf: [{ type: 'boolean' }, { type: 'string' }],
          description:
            'Pass true to discover <origin>/DESIGN.md automatically, or pass a public URL to a DESIGN.md file.',
        },
      },
      required: ['url'],
    },
    annotations: {
      title: 'Check Design System Compliance',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      ttlMs: MCP_TOOL_TTL_MS,
      cacheScope: 'public',
      ui: { resourceUri: MCP_SCORECARD_URI },
    },
  },
  fix_prompt: {
    name: 'fix_prompt',
    title: 'Generate CSS & Copy Refactor Prompt',
    description:
      'Build a ready-to-paste refactor prompt and upfront avoid-list from a URL or triggered pattern list.',
    ttlMs: MCP_TOOL_TTL_MS,
    cacheScope: 'public',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Optional public URL to scan and generate fixes for.',
        },
        patterns: {
          type: 'array',
          description: 'Optional array of pattern results or pattern IDs.',
          items: {
            oneOf: [{ type: 'string' }, { type: 'object' }],
          },
        },
        mode: {
          type: 'string',
          enum: ['fix', 'avoid'],
          description: 'Return targeted fix prompt ("fix") or upfront avoid-list ("avoid").',
        },
      },
    },
    annotations: {
      title: 'Generate Fix Prompt',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    _meta: {
      ttlMs: MCP_TOOL_TTL_MS,
      cacheScope: 'public',
    },
  },
  lint_design_md: {
    name: 'lint_design_md',
    title: 'Lint DESIGN.md Token File',
    description:
      'Statically lint a DESIGN.md document for broken token references, WCAG AA component contrast (< 4.5:1), orphaned tokens, and specVersion mismatches.',
    ttlMs: MCP_TOOL_TTL_MS,
    cacheScope: 'public',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description:
            'Raw markdown content of DESIGN.md (with YAML front matter or ```yaml block).',
        },
      },
      required: ['content'],
    },
    annotations: {
      title: 'Lint DESIGN.md',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    _meta: {
      ttlMs: MCP_TOOL_TTL_MS,
      cacheScope: 'public',
    },
  },
  diff_design_md: {
    name: 'diff_design_md',
    title: 'Diff Two DESIGN.md Token Files',
    description:
      'Compute a structured token diff (added, removed, changed, breaking) between two DESIGN.md revisions.',
    ttlMs: MCP_TOOL_TTL_MS,
    cacheScope: 'public',
    inputSchema: {
      type: 'object',
      properties: {
        base: {
          type: 'string',
          description: 'Base (before) DESIGN.md content.',
        },
        head: {
          type: 'string',
          description: 'Head (after) DESIGN.md content.',
        },
      },
      required: ['base', 'head'],
    },
    annotations: {
      title: 'Diff DESIGN.md',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    _meta: {
      ttlMs: MCP_TOOL_TTL_MS,
      cacheScope: 'public',
    },
  },
  extract_design_system: {
    name: 'extract_design_system',
    title: 'Extract DESIGN.md & W3C DTCG 2025.10 Tokens',
    description:
      'Generate a starter DESIGN.md and W3C DTCG 2025.10 tokens.json from observed DOM tokens or a public URL.',
    ttlMs: MCP_TOOL_TTL_MS,
    cacheScope: 'public',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Optional public URL to attribute or extract tokens from.',
        },
        name: {
          type: 'string',
          description: 'Optional design system name.',
        },
        observed: {
          type: 'object',
          description:
            'Optional observed token snapshot ({ surface, headings, ctas, fonts, radii }).',
        },
      },
    },
    annotations: {
      title: 'Extract Design System',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    _meta: {
      ttlMs: MCP_TOOL_TTL_MS,
      cacheScope: 'public',
    },
  },
};

export function getDeterministicTools() {
  return DETERMINISTIC_TOOL_ORDER.map((name) => TOOL_DEFINITIONS_MAP[name]);
}

const RESOURCES_LIST = [
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
];

const PROMPTS_LIST = [
  {
    name: 'audit-landing-page',
    description:
      'Run a full default-template pattern and AEO audit on a URL and propose surgical CSS and copy fixes.',
    arguments: [
      {
        name: 'url',
        description: 'Public URL of the landing page to audit.',
        required: true,
      },
    ],
  },
  {
    name: 'refactor-to-design-system',
    description:
      'Audit a page against its DESIGN.md token contract and rewrite drifting components.',
    arguments: [
      {
        name: 'url',
        description: 'Public URL of the page to check.',
        required: true,
      },
    ],
  },
];

// ── Per-IP KV rate limiter for network-bound MCP tool calls ──────────────────
async function checkMcpRateLimit(request: Request, env: any, toolName: string): Promise<boolean> {
  if (!env?.RESULTS || typeof env.RESULTS.get !== 'function') return true;
  const ip = request.headers?.get?.('CF-Connecting-IP') || 'anon';
  const isScan =
    toolName === 'scan_page' || toolName === 'check_design_system' || toolName === 'fix_prompt';
  const limit = isScan ? 6 : 30;
  const key = `rl:mcp:${isScan ? 'scan' : 'aeo'}:${ip}`;
  try {
    const cur = parseInt((await env.RESULTS.get(key)) || '0', 10);
    if (cur >= limit) return false;
    await env.RESULTS.put(key, String(cur + 1), { expirationTtl: 60 });
  } catch {
    // KV hiccups fail open
  }
  return true;
}

// ── Tool Execution ───────────────────────────────────────────────────────────
async function executeToolCall(
  name: string,
  rawArgs: Record<string, any>,
  ctx: { request: Request; env: any; waitUntil?: any }
) {
  const args = rawArgs && typeof rawArgs === 'object' ? rawArgs : {};

  if (name === 'lint_design_md') {
    const content = typeof args.content === 'string' ? args.content : String(args.text ?? '');
    const report = lintDesignMd(content);
    const summary = report.valid
      ? `DESIGN.md valid (specVersion: ${report.specVersion}, ${report.warnings.length} warning(s)).`
      : `DESIGN.md invalid: ${report.errors.length} error(s), ${report.warnings.length} warning(s).\n` +
        report.issues.map((i) => `- [${i.severity}] ${i.ruleId}: ${i.message}`).join('\n');
    return {
      content: [{ type: 'text', text: summary }],
      structuredContent: report,
    };
  }

  if (name === 'diff_design_md') {
    const base = typeof args.base === 'string' ? args.base : String(args.before ?? '');
    const head = typeof args.head === 'string' ? args.head : String(args.after ?? '');
    const diff = diffDesignMd(base, head);
    const summary = [
      `DESIGN.md token diff — breaking: ${diff.breaking ? 'YES' : 'no'}`,
      `Added (${diff.added.length}): ${diff.added.map((a) => a.path).join(', ') || 'none'}`,
      `Removed (${diff.removed.length}): ${diff.removed.map((r) => r.path).join(', ') || 'none'}`,
      `Changed (${diff.changed.length}): ${diff.changed.map((c) => `${c.path} (${c.before} -> ${c.after})`).join(', ') || 'none'}`,
    ].join('\n');
    return {
      content: [{ type: 'text', text: summary }],
      structuredContent: diff,
    };
  }

  if (name === 'extract_design_system') {
    if (args.url !== undefined) {
      const checked = validateScanUrl(args.url);
      if (checked.error) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Invalid or blocked URL: ${checked.error}` }],
          structuredContent: { error: checked.error, status: checked.status },
        };
      }
    }
    const sysName =
      typeof args.name === 'string' && args.name.trim() ? args.name.trim() : 'Site Design System';
    const observed = args.observed && typeof args.observed === 'object' ? args.observed : {};
    const designMd = generateDesignMd(observed, { name: sysName, url: args.url });
    const dtcgTokens = extractDtcgTokens(observed, { name: sysName });
    return {
      content: [
        {
          type: 'text',
          text: `${designMd}\n\`\`\`json\n${JSON.stringify(dtcgTokens, null, 2)}\n\`\`\``,
        },
      ],
      structuredContent: {
        designMd,
        dtcgTokens,
      },
    };
  }

  if (name === 'fix_prompt') {
    if (args.mode === 'avoid' && !args.url && !args.patterns) {
      const avoid = buildAvoidList({});
      return {
        content: [{ type: 'text', text: avoid }],
        structuredContent: { prompt: avoid, mode: 'avoid' },
      };
    }
    if (Array.isArray(args.patterns) && !args.url) {
      const normalized = args.patterns.map((item: any) => {
        if (typeof item === 'string') {
          const found =
            PATTERNS.find((p) => p.id === item) || COPY_PATTERNS.find((p) => p.id === item);
          return {
            id: item,
            label: found?.label || item,
            weight: found?.weight || 3,
            triggered: true,
            detail: found?.short || found?.label || '',
          };
        }
        return item;
      });
      const prompt = buildFixPrompt({ url: 'page', patterns: normalized });
      return {
        content: [{ type: 'text', text: prompt }],
        structuredContent: { prompt, mode: 'fix', triggeredCount: normalized.length },
      };
    }
    if (args.url !== undefined) {
      const checked = validateScanUrl(args.url);
      if (checked.error) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Invalid or blocked URL: ${checked.error}` }],
          structuredContent: { error: checked.error, status: checked.status },
        };
      }
      if (!(await checkMcpRateLimit(ctx.request, ctx.env, name))) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Rate limit exceeded. Retry in 60s.' }],
          structuredContent: { error: 'Rate limit exceeded', status: 429 },
        };
      }
      const subReq = new Request('https://slop-detect.com/api/fix-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: checked.url, mode: args.mode || 'fix' }),
      });
      const res = await fixPromptOnRequestPost({
        request: subReq,
        env: ctx.env || {},
        waitUntil: ctx.waitUntil,
      } as any);
      const payload = (await res.json()) as Record<string, any>;
      if (!res.ok) {
        return {
          isError: true,
          content: [{ type: 'text', text: payload.error || `Fix prompt failed (${res.status})` }],
          structuredContent: payload,
        };
      }
      return {
        content: [{ type: 'text', text: payload.prompt || JSON.stringify(payload) }],
        structuredContent: payload,
      };
    }
    const avoid = buildAvoidList({});
    return {
      content: [{ type: 'text', text: avoid }],
      structuredContent: { prompt: avoid, mode: 'avoid' },
    };
  }

  if (name === 'check_aeo') {
    const checked = validateScanUrl(args.url);
    if (checked.error) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Invalid or blocked URL: ${checked.error}` }],
        structuredContent: { error: checked.error, status: checked.status },
      };
    }
    if (!(await checkMcpRateLimit(ctx.request, ctx.env, name))) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'Rate limit exceeded. Retry in 60s.' }],
        structuredContent: { error: 'Rate limit exceeded', status: 429 },
      };
    }
    const subReq = new Request('https://slop-detect.com/api/aeo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: checked.url, share: false }),
    });
    const res = await aeoOnRequestPost({
      request: subReq,
      env: ctx.env || {},
      waitUntil: ctx.waitUntil,
    } as any);
    const payload = (await res.json()) as Record<string, any>;
    if (!res.ok) {
      return {
        isError: true,
        content: [{ type: 'text', text: payload.error || `AEO audit failed (${res.status})` }],
        structuredContent: payload,
      };
    }
    const failed = Array.isArray(payload.checks)
      ? payload.checks.filter((c: any) => !c.passed)
      : [];
    const textSummary = [
      `AEO Score for ${payload.url || checked.url}: ${payload.score}/100 (${payload.tier}) [uncalibrated beta]`,
      failed.length
        ? `Failed checks (${failed.length}):\n` +
          failed.map((c: any) => `- ${c.id} (${c.severity}): ${c.detail || c.label}`).join('\n')
        : 'All 16 AEO checks passed.',
    ].join('\n');
    return {
      content: [{ type: 'text', text: textSummary }],
      structuredContent: payload,
      _meta: { ui: { resourceUri: MCP_SCORECARD_URI } },
    };
  }

  if (name === 'scan_page' || name === 'check_design_system') {
    const checked = validateScanUrl(args.url);
    if (checked.error) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Invalid or blocked URL: ${checked.error}` }],
        structuredContent: { error: checked.error, status: checked.status },
      };
    }
    if (typeof args.designMd === 'string') {
      const dmChecked = validateScanUrl(args.designMd);
      if (dmChecked.error) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Invalid designMd URL: ${dmChecked.error}` }],
          structuredContent: { error: dmChecked.error, status: dmChecked.status },
        };
      }
    }
    if (!(await checkMcpRateLimit(ctx.request, ctx.env, name))) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'Rate limit exceeded. Retry in 60s.' }],
        structuredContent: { error: 'Rate limit exceeded', status: 429 },
      };
    }
    const scanBody: Record<string, any> = {
      url: checked.url,
      preset: args.preset || 'full',
      axes: args.axes || 'all',
      share: false,
    };
    if (name === 'check_design_system') {
      scanBody.designMd = args.designMd ?? true;
    }
    const subReq = new Request('https://slop-detect.com/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scanBody),
    });
    const res = await scanOnRequestPost({
      request: subReq,
      env: ctx.env || {},
      waitUntil: ctx.waitUntil,
    } as any);
    const payload = (await res.json()) as Record<string, any>;
    if (!res.ok) {
      return {
        isError: true,
        content: [{ type: 'text', text: payload.error || `Scan failed (${res.status})` }],
        structuredContent: payload,
      };
    }
    const triggered = Array.isArray(payload.patterns)
      ? payload.patterns.filter((p: any) => p && p.triggered && !p.waived)
      : [];
    const textSummary = [
      `Slop Score for ${payload.url || checked.url}: ${payload.score}/100 (${payload.tier}) [uncalibrated beta]`,
      `Page matches ${triggered.length} default-template patterns.`,
      ...triggered.map((p: any) => `- ${p.id} (weight ${p.weight}): ${p.detail || p.label}`),
    ].join('\n');
    return {
      content: [{ type: 'text', text: textSummary }],
      structuredContent: payload,
      _meta: { ui: { resourceUri: MCP_SCORECARD_URI } },
    };
  }

  return null;
}

// ── JSON-RPC 2.0 Dispatcher ──────────────────────────────────────────────────
async function dispatchRpc(
  rpc: Record<string, any>,
  ctx: { request: Request; env: any; waitUntil?: any }
): Promise<{ response: Record<string, any> | null; method: string; toolName?: string }> {
  if (!rpc || typeof rpc !== 'object' || rpc.jsonrpc !== '2.0' || typeof rpc.method !== 'string') {
    return {
      method: 'invalid',
      response: {
        jsonrpc: '2.0',
        id: rpc?.id ?? null,
        error: { code: -32600, message: 'Invalid JSON-RPC 2.0 request' },
      },
    };
  }

  const method = rpc.method;
  const id = rpc.id;
  const params = rpc.params && typeof rpc.params === 'object' ? rpc.params : {};
  const isNotification = id === undefined;

  if (isNotification || method.startsWith('notifications/')) {
    return { method, response: null };
  }

  if (method === 'initialize') {
    return {
      method,
      response: {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: MCP_PROTOCOL_VERSION,
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
          serverInfo: {
            name: 'slop-detect-mcp',
            title: 'Slop Detector',
            version: MCP_SERVER_VERSION,
            definitionsVersion: DEFINITIONS_VERSION,
          },
          instructions:
            'Use scan_page to score a live URL against the default-template pattern catalogue (design, copy, craft axes). Use check_aeo to audit AI-engine answerability. Use check_design_system, lint_design_md, diff_design_md, or extract_design_system to validate or generate DESIGN.md and W3C DTCG 2025.10 token files. Use fix_prompt to generate a targeted CSS/copy refactor prompt.',
        },
      },
    };
  }

  if (method === 'ping') {
    return {
      method,
      response: { jsonrpc: '2.0', id, result: {} },
    };
  }

  if (method === 'server/discover') {
    return {
      method,
      response: { jsonrpc: '2.0', id, result: buildServerCard() },
    };
  }

  if (method === 'tools/list') {
    return {
      method,
      response: {
        jsonrpc: '2.0',
        id,
        result: {
          tools: getDeterministicTools(),
          ttlMs: MCP_TOOL_TTL_MS,
          cacheScope: 'public',
        },
      },
    };
  }

  if (method === 'resources/list') {
    return {
      method,
      response: {
        jsonrpc: '2.0',
        id,
        result: {
          resources: RESOURCES_LIST,
        },
      },
    };
  }

  if (method === 'resources/read') {
    const uri = params.uri;
    if (uri === MCP_SCORECARD_URI) {
      return {
        method,
        response: {
          jsonrpc: '2.0',
          id,
          result: {
            contents: [
              {
                uri: MCP_SCORECARD_URI,
                mimeType: MCP_SCORECARD_MIME,
                text: renderScorecardHtml(params.state || params.arguments),
              },
            ],
          },
        },
      };
    }
    if (uri === 'slop://spec/patterns') {
      return {
        method,
        response: {
          jsonrpc: '2.0',
          id,
          result: {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  version: DEFINITIONS_VERSION,
                  designPatterns: PATTERNS,
                  copyPatterns: COPY_PATTERNS,
                  craftChecks: CRAFT_CHECKS,
                  systemChecks: SYSTEM_CHECKS,
                }),
              },
            ],
          },
        },
      };
    }
    if (uri === 'slop://spec/design-md-template') {
      return {
        method,
        response: {
          jsonrpc: '2.0',
          id,
          result: {
            contents: [
              {
                uri,
                mimeType: 'text/markdown',
                text: DESIGN_MD_TEMPLATE,
              },
            ],
          },
        },
      };
    }
    if (uri === 'slop://spec/aeo') {
      return {
        method,
        response: {
          jsonrpc: '2.0',
          id,
          result: {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  version: DEFINITIONS_VERSION,
                  checks: AEO_CHECKS,
                }),
              },
            ],
          },
        },
      };
    }
    return {
      method,
      response: {
        jsonrpc: '2.0',
        id,
        error: { code: -32602, message: `Unknown resource URI: ${String(uri)}` },
      },
    };
  }

  if (method === 'prompts/list') {
    return {
      method,
      response: {
        jsonrpc: '2.0',
        id,
        result: {
          prompts: PROMPTS_LIST,
        },
      },
    };
  }

  if (method === 'prompts/get') {
    const promptName = params.name;
    const targetUrl = params.arguments?.url || '<url>';
    if (promptName === 'audit-landing-page') {
      return {
        method,
        response: {
          jsonrpc: '2.0',
          id,
          result: {
            description: PROMPTS_LIST[0].description,
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Audit ${targetUrl} with scan_page and check_aeo, then generate a surgical refactor plan with fix_prompt.`,
                },
              },
            ],
          },
        },
      };
    }
    if (promptName === 'refactor-to-design-system') {
      return {
        method,
        response: {
          jsonrpc: '2.0',
          id,
          result: {
            description: PROMPTS_LIST[1].description,
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Check ${targetUrl} against its DESIGN.md with check_design_system and resolve any drifting tokens.`,
                },
              },
            ],
          },
        },
      };
    }
    return {
      method,
      response: {
        jsonrpc: '2.0',
        id,
        error: { code: -32602, message: `Unknown prompt: ${String(promptName)}` },
      },
    };
  }

  if (method === 'tools/call') {
    const toolName = typeof params.name === 'string' ? params.name : '';
    if (!DETERMINISTIC_TOOL_ORDER.includes(toolName as any)) {
      return {
        method,
        toolName,
        response: {
          jsonrpc: '2.0',
          id,
          error: { code: -32602, message: `Unknown tool: ${toolName}` },
        },
      };
    }
    const result = await executeToolCall(toolName, params.arguments || {}, ctx);
    return {
      method,
      toolName,
      response: {
        jsonrpc: '2.0',
        id,
        result,
      },
    };
  }

  return {
    method,
    response: {
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    },
  };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet({ request }: { request: Request }) {
  const accept = request?.headers?.get?.('accept') || '';
  if (
    accept.includes('text/event-stream') &&
    !accept.includes('application/json') &&
    !accept.includes('*/*')
  ) {
    return new Response(
      JSON.stringify({
        error: 'Stateless Streamable HTTP endpoint: send JSON-RPC requests via POST /mcp.',
      }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Allow: 'POST, GET, OPTIONS',
          ...CORS_HEADERS,
        },
      }
    );
  }
  return new Response(JSON.stringify(buildServerCard(), null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/mcp-server-card+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Mcp-Protocol-Version': MCP_PROTOCOL_VERSION,
      'Mcp-Method': 'GET',
      ...CORS_HEADERS,
    },
  });
}

export async function onRequestPost(ctx: { request: Request; env?: any; waitUntil?: any }) {
  let payload: any;
  try {
    payload = await ctx.request.json();
  } catch {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error: invalid JSON body' },
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Mcp-Protocol-Version': MCP_PROTOCOL_VERSION,
          ...CORS_HEADERS,
        },
      }
    );
  }

  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32600, message: 'Empty JSON-RPC batch' },
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Mcp-Protocol-Version': MCP_PROTOCOL_VERSION,
            ...CORS_HEADERS,
          },
        }
      );
    }
    const results = await Promise.all(
      payload.map((item) =>
        dispatchRpc(item, { request: ctx.request, env: ctx.env || {}, waitUntil: ctx.waitUntil })
      )
    );
    const responses = results.map((r) => r.response).filter(Boolean);
    if (responses.length === 0) {
      return new Response(null, {
        status: 202,
        headers: {
          'Mcp-Protocol-Version': MCP_PROTOCOL_VERSION,
          'Mcp-Method': 'batch-notification',
          ...CORS_HEADERS,
        },
      });
    }
    return new Response(JSON.stringify(responses), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Mcp-Protocol-Version': MCP_PROTOCOL_VERSION,
        'Mcp-Method': 'batch',
        ...CORS_HEADERS,
      },
    });
  }

  const { response, method, toolName } = await dispatchRpc(payload, {
    request: ctx.request,
    env: ctx.env || {},
    waitUntil: ctx.waitUntil,
  });

  const headers: Record<string, string> = {
    'Mcp-Protocol-Version': MCP_PROTOCOL_VERSION,
    'Mcp-Method': method,
    ...CORS_HEADERS,
  };
  if (toolName) headers['Mcp-Name'] = toolName;

  if (response === null) {
    return new Response(null, { status: 202, headers });
  }

  headers['Content-Type'] = 'application/json; charset=utf-8';
  return new Response(JSON.stringify(response), { status: 200, headers });
}

export async function onRequest(ctx: any) {
  const method = (ctx?.request?.method || 'GET').toUpperCase();
  if (method === 'OPTIONS') return onRequestOptions();
  if (method === 'GET' || method === 'HEAD') return onRequestGet(ctx);
  if (method === 'POST') return onRequestPost(ctx);
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
  });
}
