import { test, expect, afterEach } from 'vitest';
import { handleCall, TOOLS, PROMPTS, RESOURCES } from '../src/server.ts';

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
});

function jsonRes(body, { ok = true, status = 200, text } = {}) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => (text != null ? text : JSON.stringify(body)),
  };
}

test('TOOLS lists all four tool names with url required and MCP annotations', () => {
  expect(TOOLS.map((t) => t.name)).toEqual([
    'scan_page',
    'check_aeo',
    'check_design_system',
    'fix_prompt',
  ]);
  for (const t of TOOLS) {
    expect(t.inputSchema.required).toContain('url');
    expect(typeof t.title).toBe('string');
    expect(t.annotations.readOnlyHint).toBe(true);
    expect(t.annotations.destructiveHint).toBe(false);
    expect(t.annotations.idempotentHint).toBe(true);
    expect(t.annotations.openWorldHint).toBe(true);
  }
  const system = TOOLS.find((t) => t.name === 'check_design_system');
  expect(system.inputSchema.properties.design_md_url).toBeTruthy();
  expect(PROMPTS.map((p) => p.name)).toEqual(['audit_landing_page', 'deslop_and_verify']);
  expect(RESOURCES.map((r) => r.uri)).toEqual([
    'slop://spec/patterns',
    'slop://spec/design-md-template',
  ]);
});

test('missing url is a tool error, not a crash', async () => {
  let called = false;
  global.fetch = async () => {
    called = true;
    return jsonRes({});
  };
  const r = await handleCall('scan_page', {});
  expect(r.isError).toBe(true);
  expect(r.content[0].text).toMatch(/Missing required argument "url"/);
  expect(called).toBe(false);
});

test('scan_page POSTs /api/scan and formats the result', async () => {
  const calls = [];
  global.fetch = async (url, opts) => {
    calls.push({ url: String(url), body: JSON.parse(opts.body) });
    return jsonRes({
      grade: 'A',
      score: 4,
      tier: 'Clean',
      patternsFlagged: 0,
      patternsTotal: 27,
      patterns: [],
    });
  };
  const r = await handleCall('scan_page', { url: ' https://example.com ' });
  expect(r.isError).toBeFalsy();
  expect(calls[0].url).toMatch(/\/api\/scan$/);
  expect(calls[0].body).toEqual({ url: 'https://example.com' });
  expect(r.content[0].text).toMatch(/Score: 4\/100/);
});

test('scan_page forwards optional copy/axes/preset/design_md_url and formats multi-axis output', async () => {
  const calls = [];
  global.fetch = async (url, opts) => {
    calls.push({ url: String(url), body: JSON.parse(opts.body) });
    return jsonRes({
      grade: 'A',
      score: 4,
      tier: 'Clean',
      unifiedScore: 12,
      unifiedGrade: 'B+',
      unifiedTier: 'Mild',
      patternsFlagged: 0,
      patternsTotal: 27,
      patterns: [],
      axes: {
        copy: {
          score: 12,
          grade: 'B+',
          tier: 'Mild',
          patternsFlagged: 1,
          patternsTotal: 9,
          patterns: [
            { id: 'buzzword_density', label: 'AI buzzword density', weight: 7, triggered: true },
          ],
        },
      },
      system: {
        declared: true,
        score: 95,
        tier: 'Aligned',
      },
    });
  };
  const r = await handleCall('scan_page', {
    url: 'https://example.com',
    copy: true,
    preset: 'strict',
    design_md_url: 'auto',
  });
  expect(calls[0].body).toEqual({
    url: 'https://example.com',
    axes: ['design', 'copy'],
    preset: 'strict',
    designMd: true,
  });
  expect(r.content[0].text).toMatch(/Unified Score: 12\/100/);
  expect(r.content[0].text).toMatch(/Copy Axis: 12\/100/);
  expect(r.content[0].text).toMatch(/System Axis \(DESIGN\.md\): 95\/100/);
});

test('check_aeo POSTs /api/aeo; check_design_system forwards design_md_url', async () => {
  const calls = [];
  global.fetch = async (url, opts) => {
    calls.push({ url: String(url), body: JSON.parse(opts.body) });
    if (String(url).includes('/api/aeo')) {
      return jsonRes({
        url: 'https://example.com',
        score: 80,
        maxScore: 100,
        tier: 'AI-Ready',
        requiredFailed: 0,
        recommendedFailed: 0,
        failed: [],
        passed: [],
      });
    }
    return jsonRes({
      system: {
        declared: true,
        score: 90,
        tier: 'Aligned',
        name: 'Heritage',
        checksEvaluated: 5,
        checksSkipped: 0,
        drift: [],
      },
    });
  };
  const aeo = await handleCall('check_aeo', { url: 'https://example.com' });
  const sys = await handleCall('check_design_system', {
    url: 'https://example.com',
    design_md_url: 'https://example.com/DESIGN.md',
  });
  expect(calls[0].url).toMatch(/\/api\/aeo$/);
  expect(calls[1].body).toEqual({
    url: 'https://example.com',
    designMd: 'https://example.com/DESIGN.md',
    share: false,
  });
  expect(aeo.content[0].text).toMatch(/AI-Ready/);
  expect(sys.content[0].text).toMatch(/Aligned/);
});

test('fix_prompt returns prompt text; unknown tools error', async () => {
  global.fetch = async () => jsonRes(null, { text: 'de-slop this page' });
  const ok = await handleCall('fix_prompt', { url: 'https://example.com' });
  expect(ok.content[0].text).toBe('de-slop this page');
  const bad = await handleCall('nope', { url: 'https://example.com' });
  expect(bad.isError).toBe(true);
  expect(bad.content[0].text).toMatch(/Unknown tool/);
});
