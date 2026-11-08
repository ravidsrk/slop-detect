import { describe, it, expect } from 'vitest';
import {
  onRequestPost,
  onRequestGet,
  onRequestOptions,
  DETERMINISTIC_TOOL_ORDER,
  MCP_PROTOCOL_VERSION,
  MCP_SCORECARD_URI,
  MCP_SCORECARD_MIME,
} from '../functions/mcp.ts';
import { onRequestGet as serverCardGet } from '../functions/mcp/server-card.ts';

function rpcRequest(body, headers = {}) {
  return new Request('https://slop-detect.com/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe('Remote MCP Streamable HTTP Transport (/mcp & /mcp/server-card)', () => {
  it('responds to initialize with protocolVersion 2025-11-25 and MCP Apps capability', async () => {
    const res = await onRequestPost({
      request: rpcRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-11-25',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      }),
      env: {},
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Mcp-Protocol-Version')).toBe(MCP_PROTOCOL_VERSION);
    expect(res.headers.get('Mcp-Method')).toBe('initialize');
    const body = await res.json();
    expect(body.jsonrpc).toBe('2.0');
    expect(body.id).toBe(1);
    expect(body.result.protocolVersion).toBe('2025-11-25');
    expect(body.result.serverInfo.name).toBe('slop-detect-mcp');
    expect(body.result.capabilities.experimental.mcpApps.mimeTypes).toContain(MCP_SCORECARD_MIME);
  });

  it('returns 202 Accepted for notifications/initialized', async () => {
    const res = await onRequestPost({
      request: rpcRequest({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      }),
      env: {},
    });
    expect(res.status).toBe(202);
  });

  it('returns deterministic tools/list ordering with ttlMs 300000 and cacheScope public', async () => {
    const res1 = await onRequestPost({
      request: rpcRequest({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
      env: {},
    });
    const res2 = await onRequestPost({
      request: rpcRequest({ jsonrpc: '2.0', id: 3, method: 'tools/list' }),
      env: {},
    });

    const b1 = await res1.json();
    const b2 = await res2.json();
    const names1 = b1.result.tools.map((t) => t.name);
    const names2 = b2.result.tools.map((t) => t.name);

    expect(names1).toEqual([...DETERMINISTIC_TOOL_ORDER]);
    expect(names2).toEqual(names1);
    expect(b1.result.ttlMs).toBe(300000);
    expect(b1.result.cacheScope).toBe('public');
    for (const tool of b1.result.tools) {
      expect(tool.ttlMs).toBe(300000);
      expect(tool.cacheScope).toBe('public');
    }
  });

  it('supports server/discover RPC and GET /mcp/server-card with streamable-http remote', async () => {
    const rpcRes = await onRequestPost({
      request: rpcRequest({ jsonrpc: '2.0', id: 4, method: 'server/discover' }),
      env: {},
    });
    const rpcBody = await rpcRes.json();
    expect(rpcBody.result.remotes).toEqual([
      { type: 'streamable-http', url: 'https://slop-detect.com/mcp' },
    ]);
    expect(rpcBody.result.tools.map((t) => t.name)).toEqual([...DETERMINISTIC_TOOL_ORDER]);

    const cardRes = await serverCardGet();
    expect(cardRes.status).toBe(200);
    expect(cardRes.headers.get('Content-Type')).toContain('application/mcp-server-card+json');
    expect(cardRes.headers.get('Cache-Control')).toContain('max-age=3600');
    const cardJson = await cardRes.json();
    expect(cardJson.remotes).toEqual([
      { type: 'streamable-http', url: 'https://slop-detect.com/mcp' },
    ]);
  });

  it('serves ui://slop-detect/scorecard.html with text/html;profile=mcp-app, K-06 wording, and FIX-04 beta badge', async () => {
    const listRes = await onRequestPost({
      request: rpcRequest({ jsonrpc: '2.0', id: 5, method: 'resources/list' }),
      env: {},
    });
    const listBody = await listRes.json();
    const scorecardResource = listBody.result.resources.find((r) => r.uri === MCP_SCORECARD_URI);
    expect(scorecardResource).toBeDefined();
    expect(scorecardResource.mimeType).toBe('text/html;profile=mcp-app');

    const readRes = await onRequestPost({
      request: rpcRequest({
        jsonrpc: '2.0',
        id: 6,
        method: 'resources/read',
        params: {
          uri: MCP_SCORECARD_URI,
          state: {
            url: 'https://acme.example',
            score: 18,
            tier: 'Mild',
            patterns: [
              {
                id: 'purple_accent',
                label: 'Purple Accent',
                weight: 4,
                triggered: true,
                detail: 'Primary CTA uses #7C3AED',
              },
            ],
          },
        },
      }),
      env: {},
    });

    const readBody = await readRes.json();
    const content = readBody.result.contents[0];
    expect(content.uri).toBe(MCP_SCORECARD_URI);
    expect(content.mimeType).toBe('text/html;profile=mcp-app');
    expect(content.text).toContain('default-template patterns');
    expect(content.text).toContain('uncalibrated beta');
    expect(content.text).toContain(
      'https://github.com/ravidsrk/slop-detect/blob/main/CALIBRATION.md'
    );
    expect(content.text).toContain('https://acme.example');
    expect(content.text).toContain('purple_accent');
    expect(content.text).not.toMatch(/AI-generated|AI generated|looks AI/i);
  });

  it('executes lint_design_md, diff_design_md, extract_design_system, and fix_prompt tools', async () => {
    const validMd = `---
name: "Test Brand"
specVersion: "alpha"
colors:
  surface: "#F6F4EE"
  primary: "#181815"
components:
  btn:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
---
`;
    const lintRes = await onRequestPost({
      request: rpcRequest({
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: { name: 'lint_design_md', arguments: { content: validMd } },
      }),
      env: {},
    });
    expect(lintRes.headers.get('Mcp-Method')).toBe('tools/call');
    expect(lintRes.headers.get('Mcp-Name')).toBe('lint_design_md');
    const lintBody = await lintRes.json();
    expect(lintBody.result.structuredContent.valid).toBe(true);

    const headMd = validMd.replace('#181815', '#1F5E3B');
    const diffRes = await onRequestPost({
      request: rpcRequest({
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: { name: 'diff_design_md', arguments: { base: validMd, head: headMd } },
      }),
      env: {},
    });
    expect(diffRes.headers.get('Mcp-Name')).toBe('diff_design_md');
    const diffBody = await diffRes.json();
    expect(diffBody.result.structuredContent.breaking).toBe(true);
    expect(diffBody.result.structuredContent.changed.length).toBeGreaterThan(0);

    const extractRes = await onRequestPost({
      request: rpcRequest({
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: {
          name: 'extract_design_system',
          arguments: {
            name: 'Extracted Co',
            observed: {
              surface: '#F6F4EE',
              headings: [{ color: '#181815', fontFamily: 'IBM Plex Mono' }],
              ctas: [{ bg: '#1F5E3B' }],
              radii: [2, 4],
            },
          },
        },
      }),
      env: {},
    });
    const extractBody = await extractRes.json();
    expect(extractBody.result.structuredContent.designMd).toContain('Extracted Co');
    expect(extractBody.result.structuredContent.dtcgTokens.$name).toBe('Extracted Co');

    const fixRes = await onRequestPost({
      request: rpcRequest({
        jsonrpc: '2.0',
        id: 10,
        method: 'tools/call',
        params: {
          name: 'fix_prompt',
          arguments: { patterns: ['purple_accent', 'gradient_text'] },
        },
      }),
      env: {},
    });
    const fixBody = await fixRes.json();
    expect(fixBody.result.structuredContent.triggeredCount).toBe(2);
    expect(fixBody.result.content[0].text.length).toBeGreaterThan(20);
  });

  it('enforces SSRF rejection on loopback and private URLs across network tools', async () => {
    for (const toolName of [
      'scan_page',
      'check_aeo',
      'check_design_system',
      'fix_prompt',
      'extract_design_system',
    ]) {
      const res = await onRequestPost({
        request: rpcRequest({
          jsonrpc: '2.0',
          id: 11,
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: { url: 'http://127.0.0.1:8080/admin' },
          },
        }),
        env: {},
      });
      const body = await res.json();
      expect(body.result.isError).toBe(true);
      expect(body.result.content[0].text).toMatch(/private|local|blocked/i);
    }
  });

  it('handles OPTIONS preflight and GET discovery on /mcp', async () => {
    const optRes = await onRequestOptions();
    expect(optRes.status).toBe(204);
    expect(optRes.headers.get('Access-Control-Allow-Origin')).toBe('*');

    const getRes = await onRequestGet({
      request: new Request('https://slop-detect.com/mcp', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }),
    });
    expect(getRes.status).toBe(200);
    const card = await getRes.json();
    expect(card.protocolVersion).toBe('2025-11-25');
  });
});
