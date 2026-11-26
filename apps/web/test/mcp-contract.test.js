// Remote /mcp contract (#361): same tools as the npm server, argument
// validation, real URL extraction, and no crash paths. The scan handler is
// mocked so these run without a browser.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';

const scanCalls = [];
let scanImpl;
vi.mock('../functions/api/scan.ts', () => ({
  onRequestPost: async ({ request }) => {
    const body = await request.json();
    scanCalls.push(body);
    return scanImpl(body);
  },
}));

const { onRequestPost } = await import('../functions/mcp.ts');
const core = await import('@slop-detect/core');
const stdio = await import('../../../packages/mcp/src/server.ts');

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function scanPayload(url, overrides = {}) {
  return {
    schemaVersion: 1,
    definitionsVersion: core.DEFINITIONS_VERSION,
    url,
    finalUrl: url,
    title: `Page at ${url}`,
    score: 14,
    tier: 'Mild',
    grade: 'B',
    patternsFlagged: 1,
    patternsTotal: 45,
    patterns: [
      {
        id: 'purple_accent',
        label: 'Vibe purple',
        weight: 4,
        status: 'fail',
        triggered: true,
        evidence: {},
      },
      { id: 'bento_grid', label: 'Bento grid', weight: 4, status: 'pass', triggered: false },
    ],
    ...overrides,
  };
}

let testIpCounter = 1;
async function rpc(method, params = {}, id = 1, ip = `198.51.100.${testIpCounter}`) {
  const res = await onRequestPost({
    request: new Request('https://slop-detect.com/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
    }),
    env: {},
  });
  expect(res.status).toBe(200);
  return res.json();
}

const call = (name, args, ip) => rpc('tools/call', { name, arguments: args }, 1, ip);

beforeEach(() => {
  testIpCounter += 1;
  scanCalls.length = 0;
  scanImpl = (body) => json(scanPayload(body.url));
});

describe('remote /mcp contract', () => {
  it('serves the same tools as the npm server (names, schemas, descriptions)', async () => {
    const body = await rpc('tools/list');
    const remote = body.result.tools.map(
      ({ name, title, description, inputSchema, annotations }) => ({
        name,
        title,
        description,
        inputSchema,
        annotations,
      })
    );
    const local = stdio.TOOLS.map(({ name, title, description, inputSchema, annotations }) => ({
      name,
      title,
      description,
      inputSchema,
      annotations,
    }));
    expect(remote).toEqual(local);
    expect(remote.map((t) => t.name)).toEqual(core.MCP_TOOLS.map((t) => t.name));
  });

  it('initialize reports the package version and the shared instructions', async () => {
    const pkg = JSON.parse(
      readFileSync(new URL('../../../packages/mcp/package.json', import.meta.url), 'utf8')
    );
    const body = await rpc('initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 't', version: '0' },
    });
    expect(body.result.serverInfo.version).toBe(pkg.version);
    expect(body.result.serverInfo.version).toBe(core.SLOP_DETECT_VERSION);
    expect(body.result.instructions).toBe(core.MCP_SERVER_INSTRUCTIONS);
  });

  it('the static discovery card lists exactly the registry tools and prompts', () => {
    const card = JSON.parse(
      readFileSync(new URL('../public/.well-known/mcp/server-card.json', import.meta.url), 'utf8')
    );
    expect(card.tools).toEqual(
      core.MCP_TOOLS.map((t) => ({ name: t.name, title: t.title, description: t.description }))
    );
    expect(card.prompts).toEqual(
      core.MCP_PROMPTS.map((p) => ({ name: p.name, description: p.description }))
    );
  });

  it('missing or unknown arguments are corrective errors, not silent results', async () => {
    const lint = await call('lint_design_md', {});
    expect(lint.result.isError).toBe(true);
    expect(lint.result.content[0].text).toMatch(/Missing required argument "design_md"/);
    const diff = await call('diff_design_md', { base: 'a' });
    expect(diff.result.isError).toBe(true);
    expect(diff.result.content[0].text).toMatch(/head_design_md/);
    const bogus = await call('scan_page', { url: 'https://example.com', presett: 'full' });
    expect(bogus.result.isError).toBe(true);
    expect(bogus.result.content[0].text).toMatch(/Unknown argument "presett"/);
    const preset = await call('scan_page', { url: 'https://example.com', preset: 'nextjs' });
    expect(preset.result.isError).toBe(true);
    expect(preset.result.content[0].text).toMatch(/editorial, devtool/);
    expect(scanCalls).toHaveLength(0);
  });

  it('accepts the npm server parameter names for lint and diff', async () => {
    const md = `---
name: "Brand"
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
    const lint = await call('lint_design_md', { design_md: md });
    expect(lint.result.isError).toBe(false);
    expect(lint.result.structuredContent.valid).toBe(true);
    const diff = await call('diff_design_md', {
      base_design_md: md,
      head_design_md: md.replace('#181815', '#123456'),
    });
    expect(diff.result.structuredContent.breaking).toBe(true);
    expect(diff.result.structuredContent.changed.length).toBeGreaterThan(0);
  });

  it('extract_design_system scans the URL instead of returning a default template', async () => {
    scanImpl = (body) =>
      json(
        scanPayload(body.url, {
          systemContext: body.url.includes('one')
            ? {
                colors: { surface: ['rgb(255, 250, 240)'], ctaBg: ['rgb(200, 30, 30)'] },
                fonts: { h1: 'Georgia' },
              }
            : {
                colors: { surface: ['rgb(10, 20, 30)'], ctaBg: ['rgb(30, 200, 90)'] },
                fonts: { h1: 'Futura' },
              },
        })
      );
    const one = await call('extract_design_system', { url: 'https://one.example/' });
    const two = await call('extract_design_system', { url: 'https://two.example/' });
    expect(one.result.isError).toBe(false);
    expect(one.result.content[0].text).not.toBe(two.result.content[0].text);
    expect(scanCalls).toHaveLength(2);
    for (const body of scanCalls) {
      expect(body.share).toBe(false);
      expect(body.designMd).toBe(true);
    }
    expect(one.result.structuredContent.name).toBe('Page at https://one.example/');
  });

  it('fix_prompt: avoid mode needs no scan; url mode scans and never crashes on text', async () => {
    const avoid = await call('fix_prompt', { mode: 'avoid' });
    expect(avoid.result.isError).toBe(false);
    expect(avoid.result.content[0].text).toMatch(/^Generic avoid list/);
    expect(avoid.result.content[0].text).not.toMatch(/Scan could not run/);

    const fromIds = await call('fix_prompt', { patterns: ['purple_accent'] });
    expect(fromIds.result.content[0].text).not.toMatch(/undefined/);

    const scanned = await call('fix_prompt', { url: 'https://example.com/' });
    expect(scanned.result.isError).toBe(false);
    expect(scanned.result.content[0].text).toMatch(/Vibe purple/);
    expect(scanned.result.structuredContent).toMatchObject({
      mode: 'fix',
      triggeredCount: 1,
      score: 14,
    });
    expect(scanCalls[0].share).toBe(false);
  });

  it('scan_page returns the compact summary and the score card meta', async () => {
    const r = await call('scan_page', { url: 'https://example.com/', axes: ['copy'] });
    expect(r.result.isError).toBe(false);
    expect(r.result.content[0].text).toMatch(/Design: 14\/100 · Mild/);
    expect(r.result.content[0].text).toMatch(/purple_accent \(\+4\)/);
    expect(r.result.content[0].text).toMatch(/fix_prompt with patterns \["purple_accent"\]/);
    expect(r.result.structuredContent.patterns.map((p) => p.id)).toEqual(['purple_accent']);
    expect(r.result._meta.ui.resourceUri).toBe('ui://slop-detect/scorecard.html');
    expect(scanCalls[0]).toMatchObject({ share: false, axes: ['design', 'copy'] });
  });

  it('blocked pages come back as errors with the hint', async () => {
    scanImpl = () =>
      json({ error: 'Sparse DOM.', code: 'empty_page', hint: 'Try a public marketing URL.' }, 422);
    const r = await call('scan_page', { url: 'https://spa.example/' });
    expect(r.result.isError).toBe(true);
    expect(r.result.content[0].text).toMatch(/Sparse DOM\. Try a public marketing URL\./);
    expect(r.result.content[0].text).toMatch(/not a Clean result/);
  });

  it('scan_id is refused with a pointer to patterns (stateless endpoint)', async () => {
    const r = await call('fix_prompt', { scan_id: 's_abc' });
    expect(r.result.isError).toBe(true);
    expect(r.result.content[0].text).toMatch(/stateless/);
    expect(r.result.content[0].text).toMatch(/patterns/);
  });

  it('a thrown error comes back as a tool error, not an HTTP 500', async () => {
    scanImpl = () => {
      throw new Error('browser crashed');
    };
    const r = await call('scan_page', { url: 'https://example.com/' });
    expect(r.result.isError).toBe(true);
    expect(r.result.content[0].text).toMatch(/browser crashed/);
  });

  it('unknown tools are JSON-RPC errors; prompts accept the old hyphenated names', async () => {
    const unknown = await call('nope', {});
    expect(unknown.error.code).toBe(-32602);
    expect(unknown.error.message).toMatch(/Unknown tool: nope/);
    const list = await rpc('prompts/list');
    expect(list.result.prompts.map((p) => p.name)).toEqual(core.MCP_PROMPTS.map((p) => p.name));
    const legacy = await rpc('prompts/get', {
      name: 'audit-landing-page',
      arguments: { url: 'https://a.example' },
    });
    expect(legacy.result.messages[0].content.text).toMatch(/https:\/\/a\.example/);
    const verify = await rpc('prompts/get', {
      name: 'deslop_and_verify',
      arguments: { url: 'https://a.example' },
    });
    expect(verify.result.messages[0].content.text).toMatch(/--local/);
  });
});
