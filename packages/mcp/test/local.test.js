import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect, afterEach } from 'vitest';
import { DEFINITIONS_VERSION, PATTERNS } from '@slop-detect/core';
import { handleCall, loadResource } from '../src/server.ts';
import {
  isHostedApiUrl,
  isLoopbackOrFile,
  localCatalogue,
  localModeRequested,
  localScannerMissingMessage,
  resetLocalMode,
  setCliLoaderForTests,
  setLocalMode,
  useLocalCliForTests,
} from '../src/local.ts';

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  resetLocalMode();
});

function trackFetch() {
  const calls = [];
  global.fetch = async (input) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    calls.push(href);
    if (isHostedApiUrl(href)) throw new Error(`local mode called ${href}`);
    return {
      ok: true,
      status: 200,
      headers: {
        get: (name) => (String(name).toLowerCase() === 'content-type' ? 'text/html' : null),
      },
      text: async () =>
        '<!doctype html><html><head><title>Local page</title></head><body><h1>Local page</h1><p>Enough server text for a fetch check.</p></body></html>',
    };
  };
  return calls;
}

test('local mode is opt-in and loopback is recognized', () => {
  expect(localModeRequested(['node', 'server.js'], {})).toBe(false);
  expect(localModeRequested(['node', 'server.js', '--local'], {})).toBe(true);
  expect(localModeRequested(['node', 'server.js'], { SLOP_DETECT_LOCAL: '1' })).toBe(true);
  expect(localModeRequested(['node', 'server.js'], { SLOP_DETECT_LOCAL: 'true' })).toBe(true);
  expect(isLoopbackOrFile('http://127.0.0.1:3000/')).toBe(true);
  expect(isLoopbackOrFile('http://localhost:8788/index.html')).toBe(true);
  expect(isLoopbackOrFile('http://[::1]:4173/')).toBe(true);
  expect(isLoopbackOrFile('http://app.localhost:3000/')).toBe(true);
  expect(isLoopbackOrFile('file:///tmp/page.html')).toBe(true);
  expect(isLoopbackOrFile('https://example.com')).toBe(false);
  expect(isHostedApiUrl('https://slop-detect.com/api/scan')).toBe(true);
  expect(isHostedApiUrl('https://example.com/api/scan')).toBe(false);
  expect(localScannerMissingMessage('missing')).toMatch(/optional slop-detect package/);
});

test('default mode refuses loopback and file URLs without calling the API', async () => {
  const calls = trackFetch();
  const loop = await handleCall('scan_page', { url: 'http://127.0.0.1:3000/' });
  const file = await handleCall('check_aeo', { url: 'file:///tmp/page.html' });
  expect(loop.isError).toBe(true);
  expect(loop.content[0].text).toMatch(/--local/);
  expect(file.isError).toBe(true);
  expect(calls).toEqual([]);
});

test('local mode scans with the injected runner and does not call the hosted API', async () => {
  const calls = trackFetch();
  const seen = [];
  useLocalCliForTests({
    scanUrl: async (url, opts) => {
      seen.push({ url, opts });
      return {
        url,
        score: 4,
        grade: 'A',
        tier: 'Clean',
        patternsFlagged: 0,
        patternsTotal: 1,
        patterns: [{ id: 'centered_hero', label: 'Centered hero', weight: 4, triggered: false }],
        schemaVersion: 1,
      };
    },
    loadDesignMd: async () => ({ text: '---\nname: Local\n---\n', from: 'mem' }),
  });

  const scan = await handleCall('scan_page', { url: 'http://127.0.0.1:4321/' });
  expect(scan.isError).toBeFalsy();
  expect(scan.structuredContent.schemaVersion).toBe(1);
  expect(scan.structuredContent.score).toBe(4);
  expect(scan.content[0].text).toMatch(/Score: 4\/100/);
  expect(seen[0].url).toBe('http://127.0.0.1:4321/');
  expect(seen[0].opts.designMd).toBeUndefined();

  const sys = await handleCall('check_design_system', { url: 'http://localhost:4321/' });
  expect(sys.isError).toBeFalsy();
  expect(seen[1].opts.designMd).toMatch(/name: Local/);

  const prompt = await handleCall('fix_prompt', { url: 'http://127.0.0.1:4321/pricing' });
  expect(prompt.isError).toBeFalsy();
  expect(prompt.content[0].text).toMatch(/nothing to fix|0 of/i);

  const triggered = await handleCall('fix_prompt', {
    url: 'https://preview.example.test/',
  });
  expect(triggered.isError).toBeFalsy();
  expect(calls.some((href) => isHostedApiUrl(href))).toBe(false);
});

test('local fix_prompt names a triggered pattern from the scan', async () => {
  const calls = trackFetch();
  useLocalCliForTests({
    scanUrl: async (url) => ({
      url,
      score: 12,
      tier: 'Mild',
      grade: 'B',
      title: 'Fixture',
      patternsFlagged: 1,
      patternsTotal: 1,
      patterns: [
        { id: 'purple_accent', label: 'Vibe purple', weight: 4, triggered: true, evidence: {} },
      ],
    }),
  });
  const prompt = await handleCall('fix_prompt', { url: 'http://127.0.0.1:9/' });
  expect(prompt.isError).toBeFalsy();
  expect(prompt.content[0].text).toMatch(/Vibe purple/);
  expect(prompt.content[0].text).toMatch(/240.295/);
  expect(calls.some((href) => isHostedApiUrl(href))).toBe(false);
});

test('local check_aeo fetches the page and refuses file URLs and the hosted API', async () => {
  const calls = trackFetch();
  setLocalMode(true);
  const report = await handleCall('check_aeo', { url: 'http://127.0.0.1:5150/' });
  expect(report.isError).toBeFalsy();
  expect(report.structuredContent.schemaVersion).toBe(1);
  expect(typeof report.structuredContent.score).toBe('number');
  expect(calls.length).toBeGreaterThan(0);
  expect(calls.every((href) => !isHostedApiUrl(href))).toBe(true);
  expect(calls.some((href) => href.startsWith('http://127.0.0.1:5150/'))).toBe(true);

  const file = await handleCall('check_aeo', { url: 'file:///tmp/page.html' });
  expect(file.isError).toBe(true);
  expect(file.content[0].text).toMatch(/http\(s\) URL/);
});

test('a missing local runner is a tool error', async () => {
  setCliLoaderForTests(async () => {
    throw new Error('Cannot find package slop-detect');
  });
  const result = await handleCall('scan_page', { url: 'http://127.0.0.1:3000/' });
  expect(result.isError).toBe(true);
  expect(result.content[0].text).toMatch(/optional slop-detect package/);
});

test('local pattern resource comes from the engine and does not fetch', async () => {
  let called = false;
  global.fetch = async () => {
    called = true;
    throw new Error('fetch');
  };
  setLocalMode(true);
  const catalogue = localCatalogue();
  expect(catalogue.version).toBe(DEFINITIONS_VERSION);
  expect(catalogue.count).toBe(PATTERNS.length);
  expect(catalogue.patterns.every((p) => p.likelihoodRatio == null)).toBe(true);
  expect(catalogue.source).toBe('local-engine');
  const loaded = await loadResource('slop://spec/patterns');
  const body = JSON.parse(loaded.text);
  expect(body.version).toBe(DEFINITIONS_VERSION);
  expect(body.count).toBe(PATTERNS.length);
  expect(called).toBe(false);
});

function runHook(command, env) {
  const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
  return new Promise((resolve, reject) => {
    const child = spawn(command, { cwd: repoRoot, env, shell: true });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`hook scan timed out\n${stderr}`));
    }, 80000);
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('exit', (status) => {
      clearTimeout(timer);
      resolve({ status, stdout, stderr });
    });
  });
}

test('the Claude Code hook fixture refuses to invent a score when it cannot scan', async () => {
  const hook = JSON.parse(
    readFileSync(fileURLToPath(new URL('../hooks/claude-code.json', import.meta.url)), 'utf8')
  );
  const commands = [];
  for (const group of Object.values(hook.hooks)) {
    for (const entry of group) {
      for (const item of entry.hooks) commands.push(item.command);
    }
  }
  expect(hook.hooks.PostToolUse).toBeTruthy();
  expect(hook.hooks.Stop).toBeTruthy();
  expect(new Set(commands)).toEqual(new Set(['node packages/mcp/hooks/scan-local.mjs']));

  const env = { ...process.env };
  delete env.SLOP_LOCAL_URL;
  const missing = await runHook(commands[0], env);
  expect(missing.status).toBe(2);
  expect(missing.stderr).toMatch(/not a Clean score/);
  expect(missing.stderr).not.toMatch(/slop-detect\.com\/api\//);
  expect(missing.stdout.trim()).toBe('');
});

// Real Chromium is installed in the smoke-cli job (playwright install --with-deps).
// The unit job has no browser libraries, and a failed launch must not look like Clean.
test(
  'the Claude Code hook fixture scans a local dev server',
  { skip: process.env.RUN_GOLDEN !== '1', timeout: 90000 },
  async () => {
    const html = readFileSync(
      fileURLToPath(new URL('../../cli/test/fixtures/clean-artisan.html', import.meta.url))
    );
    const server = createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html);
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const { port } = server.address();
    const pageUrl = `http://127.0.0.1:${port}/`;
    let result;
    try {
      result = await runHook('node packages/mcp/hooks/scan-local.mjs', {
        ...process.env,
        SLOP_LOCAL_URL: pageUrl,
        SKIP_PLAYWRIGHT_DOWNLOAD: '1',
      });
    } finally {
      server.close();
    }
    expect(result.stderr).not.toMatch(/slop-detect\.com\/api\//);
    expect(result.status).toBe(0);
    const doc = JSON.parse(result.stdout);
    expect(doc.schemaVersion).toBe(1);
    expect(typeof doc.score).toBe('number');
    expect(doc.blocked).toBeFalsy();
    expect(doc.url).toBe(pageUrl);
  }
);
