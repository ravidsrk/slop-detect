import { test, expect, afterEach, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { MCP_SERVER_INSTRUCTIONS, MCP_TOOLS } from '@slop-detect/core';
import {
  createServer,
  handleCall,
  loadResource,
  recalledScan,
  resetScanStoreForTests,
  TOOLS,
  PROMPTS,
  RESOURCES,
  RESOURCE_TEMPLATES,
  UnknownToolError,
} from '../src/server.ts';

const realFetch = global.fetch;
beforeEach(() => resetScanStoreForTests());
afterEach(() => {
  global.fetch = realFetch;
});

const FULL_SCAN = JSON.parse(
  readFileSync(new URL('./fixtures/full-scan-copy.json', import.meta.url), 'utf8')
);
const SCHEMA = JSON.parse(
  readFileSync(new URL('../../../schemas/scan-result.v1.json', import.meta.url), 'utf8')
);
const validateScanDoc = new Ajv2020({ strict: false }).compile(SCHEMA);

function jsonRes(body, { ok = true, status = 200, text, headers } = {}) {
  return {
    ok,
    status,
    headers: { get: (name) => (headers ? (headers[String(name).toLowerCase()] ?? null) : null) },
    json: async () => body,
    text: async () => (text != null ? text : JSON.stringify(body)),
  };
}

function scanDoc(overrides = {}) {
  return {
    schemaVersion: 1,
    definitionsVersion: '2026.11',
    url: 'https://example.com',
    grade: 'A',
    score: 4,
    tier: 'Clean',
    patternsFlagged: 0,
    patternsTotal: 45,
    patterns: [],
    ...overrides,
  };
}

// Every POST body the server sent to the hosted API.
function trackApi(respond) {
  const calls = [];
  global.fetch = async (url, opts = {}) => {
    const body = opts.body ? JSON.parse(opts.body) : null;
    calls.push({ url: String(url), body });
    return respond(String(url), body);
  };
  return calls;
}

test('TOOLS come from the shared core registry, plus icons and output schemas', () => {
  expect(TOOLS.map((t) => t.name)).toEqual(MCP_TOOLS.map((t) => t.name));
  for (const tool of TOOLS) {
    const shared = MCP_TOOLS.find((t) => t.name === tool.name);
    expect(tool.description).toBe(shared.description);
    expect(tool.inputSchema).toEqual(shared.inputSchema);
    expect(tool.annotations).toEqual(shared.annotations);
    expect(tool.icons[0].src).toBe('https://slop-detect.com/favicon.svg');
    expect(tool.outputSchema).toBeTruthy();
    expect(tool.inputSchema.additionalProperties).toBe(false);
  }
  const local = new Set(['lint_design_md', 'diff_design_md']);
  for (const t of TOOLS) {
    expect(t.annotations.readOnlyHint).toBe(true);
    expect(t.annotations.destructiveHint).toBe(false);
    expect(t.annotations.idempotentHint).toBe(true);
    expect(t.annotations.openWorldHint).toBe(!local.has(t.name));
  }
  for (const name of ['scan_page', 'check_aeo']) {
    expect(TOOLS.find((t) => t.name === name).inputSchema.required).toEqual(['url']);
  }
  expect(PROMPTS.map((p) => p.name)).toEqual([
    'audit_landing_page',
    'deslop_and_verify',
    'refactor_to_design_system',
  ]);
  expect(RESOURCES.map((r) => r.uri)).toEqual([
    'slop://spec/patterns',
    'slop://spec/design-md-template',
    'slop://spec/aeo',
    'ui://slop-detect/scorecard.html',
  ]);
  expect(RESOURCE_TEMPLATES[0].uriTemplate).toBe('slop://scan/{scan_id}');
});

test('tool descriptions say when to use them and what they cost (#361)', () => {
  for (const tool of TOOLS) {
    const sentences = tool.description.split(/(?<=[.!?])\s+/).filter(Boolean);
    expect(sentences.length, tool.name).toBeGreaterThanOrEqual(3);
    expect(tool.description, tool.name).toMatch(/Use it /);
    expect(tool.description.length, tool.name).toBeLessThan(2000);
    expect(tool.description, tool.name).not.toMatch(/\b(HIGHER|OWN|BEFORE|MUST)\b/);
    for (const [param, spec] of Object.entries(tool.inputSchema.properties)) {
      expect(spec.description, `${tool.name}.${param}`).toBeTruthy();
    }
  }
});

test('the server sends instructions in initialize (#361)', () => {
  const server = createServer();
  expect(server._instructions).toBe(MCP_SERVER_INSTRUCTIONS);
  expect(MCP_SERVER_INSTRUCTIONS.length).toBeLessThan(4096);
  expect(MCP_SERVER_INSTRUCTIONS).toMatch(/lower is better/);
  expect(MCP_SERVER_INSTRUCTIONS).toMatch(/higher is better/);
});

test('missing url is a tool error, not a crash', async () => {
  const calls = trackApi(() => jsonRes({}));
  const r = await handleCall('scan_page', {});
  expect(r.isError).toBe(true);
  expect(r.content[0].text).toMatch(/Missing required argument "url"/);
  expect(calls).toEqual([]);
});

test('unknown and misspelled arguments are named, not ignored (#361)', async () => {
  const calls = trackApi(() => jsonRes(scanDoc()));
  const bogus = await handleCall('scan_page', { url: 'https://example.com', urll: 'x' });
  expect(bogus.isError).toBe(true);
  expect(bogus.content[0].text).toMatch(/Unknown argument "urll".*Valid arguments: url/);
  const preset = await handleCall('scan_page', { url: 'https://example.com', preset: 'nextjs' });
  expect(preset.isError).toBe(true);
  expect(preset.content[0].text).toMatch(
    /preset.*full, strict, marketing, minimal, editorial, devtool/
  );
  expect(calls).toEqual([]);
});

test('scan_page sends share:false and returns a compact summary (#358, #363)', async () => {
  const calls = trackApi(() => jsonRes(scanDoc()));
  const r = await handleCall('scan_page', { url: ' https://example.com ' });
  expect(r.isError).toBe(false);
  expect(calls[0].url).toMatch(/\/api\/scan$/);
  expect(calls[0].body).toEqual({ url: 'https://example.com', share: false });
  expect(r.content[0].text).toMatch(/Design: 4\/100 · Clean/);
  expect(r.content[0].text).not.toMatch(/Raw JSON/);
  expect(r.content[0].text).toMatch(/scan_id: s_/);
  expect(r.content[1]).toMatchObject({ type: 'resource_link', mimeType: 'application/json' });
  expect(r.structuredContent.schemaVersion).toBe(1);
  expect(r.structuredContent.score).toBe(4);
  expect(r.structuredContent.scanId).toMatch(/^s_/);
  expect(TOOLS.find((t) => t.name === 'scan_page').outputSchema.$id).toMatch(
    /scan-result\.v1\.json$/
  );
});

test('a full scan stays within the size budget and validates against the schema (#358)', async () => {
  trackApi(() => jsonRes(FULL_SCAN));
  const r = await handleCall('scan_page', { url: 'https://heavy.example/', axes: ['copy'] });
  expect(r.isError).toBe(false);
  expect(r.content[0].text.length).toBeLessThanOrEqual(4000);
  expect(JSON.stringify(r.structuredContent).length).toBeLessThanOrEqual(10000);
  expect(validateScanDoc(r.structuredContent)).toBe(true);
  // Every triggered pattern is still there, in text and structured form.
  const triggered = FULL_SCAN.patterns.filter((p) => p.triggered && p.weight > 0).map((p) => p.id);
  for (const id of triggered) expect(r.content[0].text).toContain(id);
  expect(r.structuredContent.patterns.map((p) => p.id)).toEqual(
    FULL_SCAN.patterns.filter((p) => p.triggered).map((p) => p.id)
  );
  expect(r.structuredContent.axes.copy.patterns.length).toBe(
    FULL_SCAN.axes.copy.patterns.filter((p) => p.triggered).length
  );
  // The complete document is one resource read away.
  const id = r.structuredContent.scanId;
  const resource = await loadResource(`slop://scan/${id}`);
  expect(JSON.parse(resource.text).patterns.length).toBe(FULL_SCAN.patterns.length);
  const full = await handleCall('scan_page', { url: 'https://heavy.example/', detail: 'full' });
  expect(full.structuredContent.patterns.length).toBe(FULL_SCAN.patterns.length);
  expect(full.content[0].text.length).toBeLessThanOrEqual(4000);
});

test('fix_prompt with a scan_id reuses the scan: no second request (#358)', async () => {
  const calls = trackApi(() => jsonRes(FULL_SCAN));
  const scan = await handleCall('scan_page', { url: 'https://heavy.example/' });
  const scanId = scan.structuredContent.scanId;
  expect(recalledScan(scanId)).toBeTruthy();
  expect(calls).toHaveLength(1);
  const prompt = await handleCall('fix_prompt', { scan_id: scanId });
  expect(prompt.isError).toBe(false);
  expect(prompt.content[0].text).toMatch(/# Landing page slop fix prompt/);
  expect(prompt.structuredContent).toMatchObject({ mode: 'fix', scanId, score: 41 });
  const brief = await handleCall('fix_prompt', { scan_id: scanId, brief: true });
  expect(brief.content[0].text).toMatch(/^Avoid list for/);
  expect(calls).toHaveLength(1);
  const missing = await handleCall('fix_prompt', { scan_id: 's_nope' });
  expect(missing.isError).toBe(true);
  expect(missing.content[0].text).toMatch(/isn't in this server's memory/);
});

test('scan_page forwards axes/preset/design_md_url; legacy copy:true still works', async () => {
  const calls = trackApi(() =>
    jsonRes(
      scanDoc({
        unifiedScore: 12,
        unifiedGrade: 'B+',
        unifiedTier: 'Mild',
        axes: {
          copy: {
            score: 12,
            grade: 'B+',
            tier: 'Mild',
            patternsFlagged: 1,
            patternsTotal: 26,
            patterns: [
              {
                id: 'buzzword_density',
                label: 'AI buzzword density',
                weight: 7,
                status: 'fail',
                triggered: true,
              },
            ],
          },
        },
        system: { declared: true, score: 95, tier: 'Aligned', drift: [] },
      })
    )
  );
  const r = await handleCall('scan_page', {
    url: 'https://example.com',
    copy: true,
    preset: 'strict',
    design_md_url: 'auto',
  });
  expect(calls[0].body).toEqual({
    url: 'https://example.com',
    share: false,
    axes: ['design', 'copy'],
    preset: 'strict',
    designMd: true,
  });
  expect(r.content[0].text).toMatch(/Unified \(design \+ copy\): 12\/100/);
  expect(r.content[0].text).toMatch(/Copy: 12\/100 · Mild/);
  expect(r.content[0].text).toMatch(/buzzword_density \(\+7\)/);
  expect(r.content[0].text).toMatch(/DESIGN\.md compliance: 95\/100 · Aligned/);
});

test('a blocked page is an error with the reason and hint, never "clean" (#360)', async () => {
  trackApi(() =>
    jsonRes(
      {
        error: 'Target page rendered too little content to judge reliably.',
        code: 'empty_page',
        hint: 'The site likely requires sign-in or heavy client-side hydration.',
      },
      { ok: false, status: 422 }
    )
  );
  const hosted = await handleCall('scan_page', { url: 'https://spa.example/' });
  expect(hosted.isError).toBe(true);
  expect(hosted.content[0].text).toMatch(/HTTP 422/);
  expect(hosted.content[0].text).toMatch(/heavy client-side hydration/);
  expect(hosted.content[0].text).toMatch(/not a Clean result/);
  expect(hosted.structuredContent).toBeUndefined();
});

test('check_aeo is compact; check_design_system forwards design_md_url (#358)', async () => {
  const checks = Array.from({ length: 16 }, (_, i) => ({
    id: `check.${i}`,
    label: `Check ${i}`,
    severity: i < 2 ? 'required' : 'recommended',
    weight: 5,
    status: i < 2 ? 'fail' : 'pass',
    passed: i >= 2,
    message: `message ${i}`,
    detail: { big: 'x'.repeat(400) },
  }));
  const calls = trackApi((url) => {
    if (url.includes('/api/aeo')) {
      return jsonRes({
        schemaVersion: 1,
        axis: 'aeo',
        url: 'https://example.com',
        score: 80,
        maxScore: 100,
        tier: 'Eligible',
        requiredFailed: 2,
        recommendedFailed: 0,
        checks,
        failed: checks.filter((c) => !c.passed),
        passed: checks.filter((c) => c.passed),
        evidence: checks.filter((c) => !c.passed),
      });
    }
    return jsonRes(
      scanDoc({
        system: {
          declared: true,
          score: 90,
          tier: 'Aligned',
          name: 'Heritage',
          checksEvaluated: 5,
          checksSkipped: 0,
          drift: [],
        },
      })
    );
  });
  const aeo = await handleCall('check_aeo', { url: 'https://example.com' });
  const sys = await handleCall('check_design_system', {
    url: 'https://example.com',
    design_md_url: 'https://example.com/DESIGN.md',
  });
  expect(calls[0].url).toMatch(/\/api\/aeo$/);
  expect(calls[0].body).toEqual({ url: 'https://example.com', share: false });
  expect(calls[1].body).toEqual({
    url: 'https://example.com',
    designMd: 'https://example.com/DESIGN.md',
    share: false,
  });
  expect(aeo.content[0].text).toMatch(/80\/100 · Eligible \(higher is better/);
  expect(aeo.content[0].text).toMatch(/Failed checks \(2 of 16\)/);
  expect(validateScanDoc(aeo.structuredContent)).toBe(true);
  expect(aeo.structuredContent.checks).toHaveLength(16);
  expect(JSON.stringify(aeo.structuredContent)).not.toMatch(/xxxx/);
  expect(sys.content[0].text).toMatch(/90\/100 · Aligned/);
  expect(sys.structuredContent).toMatchObject({ declared: true, score: 90, tier: 'Aligned' });
  expect(sys.structuredContent.scanId).toMatch(/^s_/);
});

test('hosted fix_prompt scans with share:false and builds the prompt locally', async () => {
  const calls = trackApi(() =>
    jsonRes(
      scanDoc({
        score: 14,
        tier: 'Mild',
        patterns: [
          {
            id: 'purple_accent',
            label: 'Vibe purple',
            weight: 4,
            status: 'fail',
            triggered: true,
            evidence: {},
          },
        ],
      })
    )
  );
  const ok = await handleCall('fix_prompt', { url: 'https://example.com' });
  expect(ok.isError).toBe(false);
  expect(calls).toHaveLength(1);
  expect(calls[0].url).toMatch(/\/api\/scan$/);
  expect(calls[0].body.share).toBe(false);
  expect(ok.content[0].text).toMatch(/Vibe purple/);
  expect(ok.structuredContent).toMatchObject({ mode: 'fix', triggeredCount: 1, score: 14 });
  expect(ok.structuredContent.prompt).toBeUndefined();
});

test('fix_prompt from pattern IDs or with no source makes no request (#364)', async () => {
  const calls = trackApi(() => jsonRes({}));
  const fromIds = await handleCall('fix_prompt', { patterns: ['bento_grid'] });
  expect(fromIds.isError).toBe(false);
  expect(fromIds.content[0].text).toMatch(/without a page scan/);
  expect(fromIds.content[0].text).not.toMatch(/undefined/);
  const generic = await handleCall('fix_prompt', { brief: true });
  expect(generic.content[0].text).toMatch(/^Generic avoid list/);
  expect(generic.structuredContent.mode).toBe('avoid');
  const legacyAvoid = await handleCall('fix_prompt', { mode: 'avoid' });
  expect(legacyAvoid.content[0].text).toMatch(/^Generic avoid list/);
  const none = await handleCall('fix_prompt', {});
  expect(none.isError).toBe(true);
  expect(none.content[0].text).toMatch(/Pass one of "url", "scan_id", "patterns"/);
  expect(calls).toEqual([]);
});

test('unknown tools throw (JSON-RPC -32602 on the wire), as the hosted endpoint does', async () => {
  await expect(handleCall('nope', {})).rejects.toBeInstanceOf(UnknownToolError);
  await expect(handleCall('nope', { url: 'https://example.com' })).rejects.toThrow(
    /Unknown tool: nope/
  );
});

test('lint_design_md and diff_design_md stay local; old parameter names still work', async () => {
  const calls = trackApi(() => jsonRes({}));
  const bad = `---
name: Broken
colors:
  bg: "#ffffff"
components:
  btn:
    backgroundColor: "{colors.missing}"
---`;
  const lint = await handleCall('lint_design_md', { design_md: bad });
  expect(lint.isError).toBe(false);
  expect(lint.content[0].text).toMatch(/broken-ref/);
  expect(lint.content[0].text).toMatch(/invalid/);
  expect(lint.structuredContent.valid).toBe(false);
  expect(lint.structuredContent.text).toBeUndefined();

  const viaContent = await handleCall('lint_design_md', { content: bad });
  expect(viaContent.content[0].text).toBe(lint.content[0].text);

  const missing = await handleCall('lint_design_md', {});
  expect(missing.isError).toBe(true);
  expect(missing.content[0].text).toMatch(/design_md/);

  const same = await handleCall('diff_design_md', { base_design_md: bad, head_design_md: bad });
  expect(same.content[0].text).toMatch(/compatible/);
  expect(same.content[0].text).toMatch(/No token changes/);

  const head = bad.replace('#ffffff', '#000000');
  const changed = await handleCall('diff_design_md', { base_design_md: bad, head_design_md: head });
  expect(changed.content[0].text).toMatch(/breaking/);
  expect(changed.structuredContent.breaking).toBe(true);
  const legacy = await handleCall('diff_design_md', { base: bad, head });
  expect(legacy.structuredContent).toEqual(changed.structuredContent);
  expect(calls).toEqual([]);
});

test('slop://spec/aeo is the installed catalogue and does not fetch', async () => {
  let called = false;
  global.fetch = async () => {
    called = true;
    throw new Error('aeo resource must not fetch');
  };
  const loaded = await loadResource('slop://spec/aeo');
  const body = JSON.parse(loaded.text);
  expect(called).toBe(false);
  expect(body.source).toBe('installed-engine');
  expect(body.pre2022HeavyRate).toBeNull();
  expect(body.checks.length).toBeGreaterThan(0);
  expect(
    body.checks.every(
      (check) => check.likelihoodRatio == null || typeof check.likelihoodRatio === 'number'
    )
  ).toBe(true);
});

test('output schemas: scan tools return scan documents, the rest typed data', async () => {
  for (const entry of [...TOOLS, ...PROMPTS, ...RESOURCES]) {
    expect(entry.icons[0].src).toBe('https://slop-detect.com/favicon.svg');
    expect(entry.icons[0].mimeType).toBe('image/svg+xml');
  }
  const required = Object.fromEntries(
    TOOLS.filter((t) => !t.outputSchema.$id).map((t) => [t.name, t.outputSchema.required])
  );
  expect(required).toEqual({
    check_design_system: ['declared'],
    fix_prompt: ['mode', 'triggeredCount'],
    lint_design_md: ['valid', 'errors', 'warnings'],
    diff_design_md: ['breaking', 'added', 'removed', 'changed'],
    extract_design_system: ['format', 'name'],
  });
  for (const name of ['scan_page', 'fix_prompt']) {
    const preset = TOOLS.find((tool) => tool.name === name).inputSchema.properties.preset.enum;
    expect(preset).toContain('editorial');
    expect(preset).toContain('devtool');
  }

  const scorecard = await loadResource('ui://slop-detect/scorecard.html');
  expect(scorecard.mimeType).toBe('text/html;profile=mcp-app');
  expect(scorecard.text).toMatch(/matches N default patterns/);
  expect(scorecard.text).toMatch(/uncalibrated beta/);

  const calls = trackApi(() =>
    jsonRes(
      scanDoc({
        title: 'Example',
        systemContext: {
          fonts: { h1: 'Inter', body: 'Inter' },
          colors: {
            surface: ['rgb(10, 10, 10)'],
            ink: ['rgb(240, 240, 240)'],
            ctaBg: ['rgb(34, 197, 94)'],
          },
          radii: [6],
        },
      })
    )
  );
  const extracted = await handleCall('extract_design_system', {
    url: 'https://example.com',
    format: 'dtcg',
  });
  expect(extracted.isError).toBe(false);
  expect(calls[0].body).toEqual({ url: 'https://example.com', share: false, designMd: true });
  const parsedTokens = JSON.parse(extracted.content[0].text);
  expect(parsedTokens.$schema).toMatch(/designtokens/);
  expect(extracted.structuredContent).toMatchObject({ format: 'dtcg', name: 'Example' });
  // Reusing the scan: no second request.
  const again = await handleCall('extract_design_system', {
    scan_id: extracted.structuredContent.scanId,
  });
  expect(again.isError).toBe(false);
  expect(calls).toHaveLength(1);
});

test('every hosted call sends share:false (#363)', async () => {
  const calls = trackApi((url) =>
    url.includes('/api/aeo')
      ? jsonRes({
          schemaVersion: 1,
          axis: 'aeo',
          url: 'https://example.com',
          score: 90,
          tier: 'Eligible',
          checks: [],
        })
      : jsonRes(scanDoc({ system: { declared: false, drift: [] }, systemContext: { radii: [4] } }))
  );
  await handleCall('scan_page', { url: 'https://example.com' });
  await handleCall('check_aeo', { url: 'https://example.com' });
  await handleCall('check_design_system', { url: 'https://example.com' });
  await handleCall('fix_prompt', { url: 'https://example.com' });
  await handleCall('fix_prompt', { url: 'https://example.com', brief: true });
  await handleCall('extract_design_system', { url: 'https://example.com' });
  expect(calls.length).toBe(6);
  for (const call of calls) expect(call.body.share, call.url).toBe(false);
});

test('API errors keep the message, retry time and hint (#360)', async () => {
  trackApi(() =>
    jsonRes(
      {
        error: 'rate_limited',
        message: 'Too many requests. Limit is 3/min per IP for /api/scan (tier: anonymous).',
        retryAfter: 60,
      },
      { ok: false, status: 429 }
    )
  );
  const limited = await handleCall('scan_page', { url: 'https://example.com' });
  expect(limited.isError).toBe(true);
  expect(limited.content[0].text).toMatch(/3\/min/);
  expect(limited.content[0].text).toMatch(/Retry in 60s/);
  expect(limited.content[0].text).toMatch(/--local/);
});
