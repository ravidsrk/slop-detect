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
  MCP_ICONS,
  MCP_PROMPTS,
  MCP_SERVER_INSTRUCTIONS,
  MCP_TOOLS,
  buildFixPrompt,
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
  systemStructured,
  validateMcpToolArguments,
} from '@slop-detect/core';
import { validateScanUrl } from './_ssrf.js';
import { isScanDisabled } from './_browser.js';
import { onRequestPost as scanOnRequestPost } from './api/scan.js';
import { onRequestPost as aeoOnRequestPost } from './api/aeo.js';
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

  const formatDetail = (p: any): string => {
    const d = p?.detail ?? p?.evidence;
    if (typeof d === 'string') return d;
    if (d && typeof d === 'object') {
      const sel =
        Array.isArray(p?.locations) && p.locations[0]?.selector ? p.locations[0].selector : '';
      return sel ? `${sel} — ${JSON.stringify(d).slice(0, 120)}` : JSON.stringify(d).slice(0, 140);
    }
    return '';
  };

  const rowsHtml =
    triggered.length > 0
      ? triggered
          .map(
            (p: any) => `<tr>
          <td><code>${escapeHtml(p.id)}</code></td>
          <td>${escapeHtml(p.label || p.id)}</td>
          <td class="num">${escapeHtml(p.weight ?? 0)}</td>
          <td>${escapeHtml(formatDetail(p))}</td>
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
      detail: formatDetail(p),
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
      function stringifyDetail(val) {
        if (val == null) return '';
        if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
          return String(val);
        }
        try { return JSON.stringify(val).slice(0, 140); } catch (e) { return ''; }
      }
      function hydrate(next) {
        if (!next || typeof next !== 'object') return;
        state = Object.assign({}, state, next);
        if (next.url) document.getElementById('sc-url').textContent = String(next.url);
        var scoreVal = typeof next.score === 'number'
          ? next.score
          : next.system && typeof next.system.score === 'number'
            ? next.system.score
            : null;
        if (scoreVal !== null) {
          document.getElementById('sc-score').textContent = scoreVal + ' / 100';
        }
        var tierVal = next.tier || (next.system && next.system.tier) || '';
        if (tierVal) document.getElementById('sc-tier').textContent = String(tierVal);
        var isAeo = Array.isArray(next.checks) && !Array.isArray(next.patterns) && !Array.isArray(next.triggered);
        var isSystem = Boolean(next.system && !Array.isArray(next.patterns) && !Array.isArray(next.triggered));
        var verdictEl = document.getElementById('sc-verdict');
        var rows = null;
        if (isAeo) {
          var failed = next.checks.filter(function (c) { return c && c.passed === false; });
          verdictEl.textContent = failed.length + ' failed AEO eligibility check(s) (higher score is better).';
          rows = failed.map(function (c) {
            return { id: c.id, label: c.label || c.id, weight: c.weight || 0, detail: c.message || c.status || '' };
          });
        } else if (isSystem) {
          var drift = Array.isArray(next.system.drift) ? next.system.drift : [];
          verdictEl.textContent = drift.length + ' DESIGN.md drift signal(s) (higher score is better).';
          rows = drift.map(function (d) {
            return { id: d.id || 'drift', label: d.label || d.id || 'Drift', weight: d.weight || 0, detail: d.message || stringifyDetail(d) };
          });
        } else {
          var trig = Array.isArray(next.patterns)
            ? next.patterns.filter(function (p) { return p && p.triggered && !p.waived; })
            : Array.isArray(next.triggered) ? next.triggered : null;
          if (trig) {
            document.getElementById('sc-pattern-count').textContent = String(trig.length);
            rows = trig.map(function (p) {
              return { id: p.id, label: p.label || p.id, weight: p.weight || 0, detail: stringifyDetail(p.detail !== undefined ? p.detail : p.evidence) };
            });
          }
        }
        if (rows) {
          var tbody = document.getElementById('sc-rows');
          tbody.innerHTML = '';
          if (rows.length === 0) {
            var tr = document.createElement('tr');
            var td = document.createElement('td');
            td.colSpan = 4;
            td.className = 'empty';
            td.textContent = isAeo
              ? 'All AEO checks passed.'
              : isSystem
                ? '0 DESIGN.md drift signals detected.'
                : '0 triggered patterns — matches 0 default-template patterns.';
            tr.appendChild(td);
            tbody.appendChild(tr);
          } else {
            rows.forEach(function (p) {
              var tr = document.createElement('tr');
              ['id', 'label', 'weight', 'detail'].forEach(function (k) {
                var td = document.createElement('td');
                if (k === 'weight') td.className = 'num';
                td.textContent = stringifyDetail(p[k]);
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
        // Only accept tool-result notifications from the embedding MCP host frame.
        if (window.parent && window.parent !== window && ev.source !== window.parent) return;
        var msg = ev && ev.data;
        if (!msg || typeof msg !== 'object' || msg.jsonrpc === undefined && !msg.method && !msg.structuredContent) return;
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

// ── Tools (R-04 #320, #361) ──────────────────────────────────────────────────
// The tool contract comes from @slop-detect/core, shared with the npm server,
// so the two can't drift apart. This endpoint adds cache hints and the MCP Apps
// score card on top. It is stateless: it keeps no scans, so scan_id handles
// (npm server only) are refused with a pointer to `patterns`.
const UI_TOOLS = new Set(['scan_page', 'check_aeo', 'check_design_system']);

export function getDeterministicTools() {
  const byName = new Map(MCP_TOOLS.map((tool) => [tool.name, tool]));
  return DETERMINISTIC_TOOL_ORDER.map((name) => {
    const tool = byName.get(name)!;
    return {
      ...tool,
      icons: MCP_ICONS,
      ttlMs: MCP_TOOL_TTL_MS,
      cacheScope: 'public',
      _meta: {
        ttlMs: MCP_TOOL_TTL_MS,
        cacheScope: 'public',
        ...(UI_TOOLS.has(name) ? { ui: { resourceUri: MCP_SCORECARD_URI } } : {}),
      },
    };
  });
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
    description: 'Versioned AEO check catalogue with weights, severities, and descriptions.',
  },
];

const PROMPTS_LIST = MCP_PROMPTS.map((prompt) => ({ ...prompt, icons: MCP_ICONS }));

// ── Per-IP fail-closed rate limiter + kill switch + daily cap for /mcp ───────
const mcpMemCounters = new Map<string, { count: number; resetAt: number }>();
const MCP_SCAN_FALLBACK_CEILING = 6;
const MCP_MAX_BATCH_SIZE = 10;
const MCP_MAX_NETWORK_TOOLS_PER_BATCH = 2;

function mcpMemIncrement(key: string, windowMs = 60_000, inc = 1): number {
  const now = Date.now();
  if (mcpMemCounters.size > 256) {
    for (const [k, v] of mcpMemCounters) if (now >= v.resetAt) mcpMemCounters.delete(k);
  }
  const cur = mcpMemCounters.get(key);
  if (!cur || now >= cur.resetAt) {
    const fresh = { count: inc, resetAt: now + windowMs };
    mcpMemCounters.set(key, fresh);
    return fresh.count;
  }
  cur.count += inc;
  return cur.count;
}

async function checkMcpRateLimit(
  request: Request,
  env: any,
  bucket: 'scan' | 'aeo'
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (isScanDisabled(env)) {
    return {
      ok: false,
      message:
        'Scanning is temporarily paused for maintenance. Try again shortly or run locally: npx -y -p slop-detect -p slop-detect-mcp slop-detect-mcp --local',
    };
  }
  const ip = request.headers?.get?.('CF-Connecting-IP') || 'anon';
  const limit = bucket === 'scan' ? 6 : 12;
  const key = `rl:mcp:${bucket}:${ip}`;
  const kv = env?.RATE_LIMIT || env?.RESULTS;

  // Always enforce per-isolate memory ceiling so concurrent requests or a KV
  // outage cannot bypass the hosted scan budget.
  const memN = mcpMemIncrement(key, 60_000, 1);
  if (memN > limit) {
    return { ok: false, message: RATE_LIMITED };
  }

  if (kv && typeof kv.get === 'function' && typeof kv.put === 'function') {
    try {
      const cur = parseInt((await kv.get(key)) || '0', 10);
      if (cur >= limit) return { ok: false, message: RATE_LIMITED };
      await kv.put(key, String(cur + 1), { expirationTtl: 60 });
    } catch {
      if (bucket === 'scan' && memN > MCP_SCAN_FALLBACK_CEILING) {
        return { ok: false, message: RATE_LIMITED };
      }
    }
  } else if (bucket === 'scan' && memN > MCP_SCAN_FALLBACK_CEILING) {
    return { ok: false, message: RATE_LIMITED };
  }

  // Enforce global daily cap shared with /api/scan so /mcp cannot bypass account limits.
  const cap = parseInt(env?.SCAN_DAILY_CAP || '10000', 10);
  if (env?.RATE_LIMIT && Number.isFinite(cap) && cap > 0) {
    const day = new Date().toISOString().slice(0, 10);
    const gkey = `rl:global:scan:${day}`;
    const units = bucket === 'aeo' ? 3 : 1;
    let used = 0;
    try {
      used = parseInt((await env.RATE_LIMIT.get(gkey)) || '0', 10);
    } catch {
      return {
        ok: false,
        message: 'Scanning is temporarily unavailable while capacity limits are checked.',
      };
    }
    if (used >= cap) {
      return {
        ok: false,
        message:
          'Daily hosted scan capacity has been reached. Retry tomorrow or run locally: npx -y -p slop-detect -p slop-detect-mcp slop-detect-mcp --local',
      };
    }
    const memGlobal = mcpMemIncrement(gkey, 86_400_000, units);
    if (memGlobal > cap) {
      return {
        ok: false,
        message:
          'Daily hosted scan capacity has been reached. Retry tomorrow or run locally: npx -y -p slop-detect -p slop-detect-mcp slop-detect-mcp --local',
      };
    }
    try {
      await env.RATE_LIMIT.put(gkey, String(used + units), { expirationTtl: 172_800 });
    } catch {
      /* best-effort */
    }
  }

  return { ok: true };
}

// ── Tool Execution ───────────────────────────────────────────────────────────
type ToolCtx = { request: Request; env: any; waitUntil?: any };

const RATE_LIMITED =
  'Rate limit exceeded on the hosted endpoint (6 browser scans per minute per IP). Retry in 60s, or run the npm server locally for unlimited scans: npx -y -p slop-detect -p slop-detect-mcp slop-detect-mcp --local';
const SCAN_ID_REMOTE =
  'scan_id handles are kept only by the npm server; this hosted endpoint is stateless and keeps no scans. Pass patterns (the triggered pattern IDs from scan_page) or url instead.';

function okResult(text: string, structuredContent?: unknown, meta?: Record<string, any>) {
  const result: Record<string, any> = { content: [{ type: 'text', text }], isError: false };
  if (structuredContent !== undefined) result.structuredContent = structuredContent;
  if (meta) result._meta = meta;
  return result;
}

function errorResult(text: string) {
  return { content: [{ type: 'text', text }], isError: true };
}

function blockedUrlMessage(url: string, error: string) {
  return `Invalid or blocked URL ${JSON.stringify(url)}: ${error}. The hosted endpoint only scans public http(s) pages; for localhost or private URLs run the npm server locally: npx -y -p slop-detect -p slop-detect-mcp slop-detect-mcp --local`;
}

function designMdBody(value: string | undefined): string | boolean | undefined {
  if (!value) return undefined;
  return value === 'auto' ? true : value;
}

async function runHostedScan(ctx: ToolCtx, body: Record<string, any>) {
  const subReq = new Request('https://slop-detect.com/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // share:false: agent scans never mint a public permalink (#363).
    body: JSON.stringify({ ...body, share: false }),
  });
  const res = await scanOnRequestPost({
    request: subReq,
    env: ctx.env || {},
    waitUntil: ctx.waitUntil,
  } as any);
  let payload: any;
  try {
    payload = await res.json();
  } catch {
    payload = { error: `The scanner returned a non-JSON response (HTTP ${res.status}).` };
  }
  if (!res.ok && payload && !payload.error) payload.error = `Scan failed (HTTP ${res.status}).`;
  return payload;
}

// Validate a URL argument and spend one rate-limit token. Returns an error
// result to send back, or null to proceed.
async function admitUrl(ctx: ToolCtx, url: string, bucket: 'scan' | 'aeo', extraUrl?: unknown) {
  const checked = validateScanUrl(url);
  if (checked.error) return { error: errorResult(blockedUrlMessage(url, checked.error)) };
  if (typeof extraUrl === 'string' && extraUrl !== 'auto') {
    const dm = validateScanUrl(extraUrl);
    if (dm.error) return { error: errorResult(blockedUrlMessage(extraUrl, dm.error)) };
  }
  const gate = await checkMcpRateLimit(ctx.request, ctx.env, bucket);
  if (!gate.ok) {
    return { error: errorResult('message' in gate ? gate.message : RATE_LIMITED) };
  }
  return { url: checked.url as string };
}

async function executeToolCall(name: string, args: Record<string, any>, ctx: ToolCtx) {
  if (name === 'lint_design_md') {
    const report = lintDesignMd(args.design_md);
    return okResult(formatDesignMdLint(report), report);
  }

  if (name === 'diff_design_md') {
    const diff = diffDesignMd(args.base_design_md, args.head_design_md);
    return okResult(formatDesignMdDiff(diff), diff);
  }

  if (name === 'scan_page') {
    const admitted = await admitUrl(ctx, args.url, 'scan', args.design_md_url);
    if (admitted.error) return admitted.error;
    const payload = await runHostedScan(ctx, {
      url: admitted.url,
      preset: args.preset || 'full',
      axes: args.axes || ['design'],
      ...(args.design_md_url ? { designMd: designMdBody(args.design_md_url) } : {}),
    });
    if (isMcpScanFailure(payload)) return errorResult(formatScanFailure(payload, admitted.url));
    const structured =
      args.detail === 'full' ? { ...payload, detail: 'full' } : compactScanResult(payload);
    return okResult(formatScanSummary(payload), structured, {
      ui: { resourceUri: MCP_SCORECARD_URI },
    });
  }

  if (name === 'check_aeo') {
    const admitted = await admitUrl(ctx, args.url, 'aeo');
    if (admitted.error) return admitted.error;
    const subReq = new Request('https://slop-detect.com/api/aeo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: admitted.url, share: false }),
    });
    const res = await aeoOnRequestPost({
      request: subReq,
      env: ctx.env || {},
      waitUntil: ctx.waitUntil,
    } as any);
    let payload: any;
    try {
      payload = await res.json();
    } catch {
      payload = { error: `The AEO audit returned a non-JSON response (HTTP ${res.status}).` };
    }
    if (!res.ok || typeof payload?.score !== 'number') {
      return errorResult(
        `AEO audit could not run for ${admitted.url}: ${payload?.error || `HTTP ${res.status}`}.`
      );
    }
    return okResult(formatAeoSummary(payload), compactAeoReport(payload), {
      ui: { resourceUri: MCP_SCORECARD_URI },
    });
  }

  if (name === 'check_design_system') {
    if (!args.url) return errorResult(SCAN_ID_REMOTE);
    const admitted = await admitUrl(ctx, args.url, 'scan', args.design_md_url);
    if (admitted.error) return admitted.error;
    const payload = await runHostedScan(ctx, {
      url: admitted.url,
      preset: 'full',
      axes: ['design'],
      designMd: designMdBody(args.design_md_url) ?? true,
    });
    if (isMcpScanFailure(payload)) return errorResult(formatScanFailure(payload, admitted.url));
    return okResult(formatSystemSummary(payload), systemStructured(payload), {
      ui: { resourceUri: MCP_SCORECARD_URI },
    });
  }

  if (name === 'fix_prompt') {
    if (args.patterns) {
      const out = buildMcpFixPrompt({ patterns: args.patterns, brief: args.brief });
      return okResult(out.text, out.structured);
    }
    if (args.url) {
      const admitted = await admitUrl(ctx, args.url, 'scan', args.design_md_url);
      if (admitted.error) return admitted.error;
      const payload = await runHostedScan(ctx, {
        url: admitted.url,
        preset: args.preset || 'full',
        axes: args.axes || ['design'],
        ...(args.design_md_url ? { designMd: designMdBody(args.design_md_url) } : {}),
      });
      if (isMcpScanFailure(payload)) return errorResult(formatScanFailure(payload, admitted.url));
      const out = buildMcpFixPrompt({ result: payload, brief: args.brief });
      return okResult(out.text, out.structured);
    }
    if (args.scan_id) return errorResult(SCAN_ID_REMOTE);
    const out = buildMcpFixPrompt({ brief: true });
    return okResult(out.text, out.structured);
  }

  if (name === 'extract_design_system') {
    if (args.observed) {
      const out = buildMcpDesignSystem({
        observed: args.observed,
        name: args.name,
        url: args.url,
        format: args.format,
      });
      return okResult(out.text, out.structured);
    }
    if (!args.url) return errorResult(SCAN_ID_REMOTE);
    const admitted = await admitUrl(ctx, args.url, 'scan');
    if (admitted.error) return admitted.error;
    const payload = await runHostedScan(ctx, {
      url: admitted.url,
      preset: 'full',
      axes: ['design'],
      designMd: true,
    });
    if (isMcpScanFailure(payload)) return errorResult(formatScanFailure(payload, admitted.url));
    const observed = observedTokensOf(payload);
    if (!observed) {
      return errorResult(
        `The scan of ${payload.finalUrl || admitted.url} returned no observed design tokens, so there is nothing to extract.`
      );
    }
    const out = buildMcpDesignSystem({
      observed,
      name:
        args.name || payload.title || hostnameLabel(payload.finalUrl || admitted.url) || undefined,
      url: payload.finalUrl || admitted.url,
      format: args.format,
    });
    return okResult(out.text, out.structured);
  }

  return errorResult(mcpUnknownToolMessage(name));
}

// Validate, run, and never let an exception escape as an HTTP 500.
async function callTool(name: string, rawArgs: unknown, ctx: ToolCtx) {
  const checked = validateMcpToolArguments(name, rawArgs);
  if (checked.ok === false) return errorResult((checked as { message: string }).message);
  try {
    return await executeToolCall(name, (checked as { args: Record<string, any> }).args, ctx);
  } catch (err) {
    const message = err && (err as Error).message ? (err as Error).message : String(err);
    return errorResult(
      `${name} failed on the hosted endpoint: ${message.split('\n')[0].slice(0, 200)}`
    );
  }
}

// ── JSON-RPC 2.0 Dispatcher ──────────────────────────────────────────────────
async function dispatchRpc(
  rpc: Record<string, any>,
  ctx: ToolCtx
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
          instructions: MCP_SERVER_INSTRUCTIONS,
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
    const promptName = String(params.name ?? '');
    const rendered = renderMcpPrompt(promptName, params.arguments || {});
    if (!rendered) {
      return {
        method,
        response: {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32602,
            message: `Unknown prompt: ${promptName}. Available prompts: ${PROMPTS_LIST.map((p) => p.name).join(', ')}.`,
          },
        },
      };
    }
    return {
      method,
      response: { jsonrpc: '2.0', id, result: rendered },
    };
  }

  if (method === 'tools/call') {
    const toolName = typeof params.name === 'string' ? params.name : '';
    if (!isMcpToolName(toolName)) {
      return {
        method,
        toolName,
        response: {
          jsonrpc: '2.0',
          id,
          error: { code: -32602, message: mcpUnknownToolMessage(toolName) },
        },
      };
    }
    const result = await callTool(toolName, params.arguments, ctx);
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

// A thrown error must still come back as JSON-RPC, never an HTML 500.
async function safeDispatch(
  rpc: any,
  ctx: ToolCtx
): Promise<{ response: Record<string, any> | null; method: string; toolName?: string }> {
  try {
    return await dispatchRpc(rpc, ctx);
  } catch (err) {
    const message = err && (err as Error).message ? (err as Error).message : String(err);
    return {
      method: typeof rpc?.method === 'string' ? rpc.method : 'invalid',
      response: {
        jsonrpc: '2.0',
        id: rpc?.id ?? null,
        error: { code: -32603, message: `Internal error: ${message.split('\n')[0].slice(0, 200)}` },
      },
    };
  }
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
    if (payload.length > MCP_MAX_BATCH_SIZE) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32600,
            message: `JSON-RPC batch too large (max ${MCP_MAX_BATCH_SIZE} requests per batch).`,
          },
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
    // Execute batch items sequentially and cap network-bound tool calls so a
    // single batch cannot launch concurrent browser floods past rate limits.
    const NETWORK_TOOLS = new Set([
      'scan_page',
      'check_aeo',
      'check_design_system',
      'fix_prompt',
      'extract_design_system',
    ]);
    let networkCalls = 0;
    const results: Array<{ response: Record<string, any> | null }> = [];
    for (const item of payload) {
      const isNetCall =
        item?.method === 'tools/call' &&
        NETWORK_TOOLS.has(item?.params?.name) &&
        Boolean(item?.params?.arguments?.url);
      if (isNetCall && ++networkCalls > MCP_MAX_NETWORK_TOOLS_PER_BATCH) {
        results.push({
          response: {
            jsonrpc: '2.0',
            id: item?.id ?? null,
            result: errorResult(
              `Batch limit exceeded: at most ${MCP_MAX_NETWORK_TOOLS_PER_BATCH} URL scan/audit calls per JSON-RPC batch.`
            ),
          },
        });
        continue;
      }
      results.push(
        await safeDispatch(item, {
          request: ctx.request,
          env: ctx.env || {},
          waitUntil: ctx.waitUntil,
        })
      );
    }
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

  const { response, method, toolName } = await safeDispatch(payload, {
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
