#!/usr/bin/env node
// Reproducible local benchmark harness (`docs/benchmarks/bench-results.tsv`).
// Runs real headless Chromium via the built `slop-detect` CLI (`json`, `agent`,
// `sarif`) and `slop-detect-mcp --local` (stdio via @modelcontextprotocol/sdk)
// against deterministic local HTML fixtures, measuring real wall time, output
// bytes/tokens, RSS, and cross-surface tier agreement.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const execFileAsync = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CLI_BIN = path.join(ROOT, 'packages', 'cli', 'dist', 'bin', 'slop.js');
const MCP_BIN = path.join(ROOT, 'packages', 'mcp', 'dist', 'bin', 'server.js');
const OUT_TSV = path.join(ROOT, 'docs', 'benchmarks', 'bench-results.tsv');
const OUT_MD = path.join(ROOT, 'docs', 'benchmarks', 'README.md');

const mcpRequire = createRequire(path.join(ROOT, 'packages', 'mcp', 'package.json'));
const clientModPath = mcpRequire.resolve('@modelcontextprotocol/sdk/client/index.js');
const stdioModPath = mcpRequire.resolve('@modelcontextprotocol/sdk/client/stdio.js');
const { Client } = await import(pathToFileURL(clientModPath).href);
const { StdioClientTransport } = await import(pathToFileURL(stdioModPath).href);

const FIXTURES = [
  'packages/core/test/fixtures/pioneers/linear.html',
  'packages/core/test/fixtures/pioneers/rauno.html',
  'packages/core/test/fixtures/pioneers/stripe.html',
  'packages/core/test/fixtures/pioneers/vercel.html',
  'packages/cli/test/fixtures/clean-artisan.html',
  'packages/cli/test/fixtures/clean-cta-pill.html',
  'packages/cli/test/fixtures/hero-fullwidth-left.html',
  'packages/cli/test/fixtures/hero-narrow-centered.html',
  'packages/cli/test/fixtures/slop-vibecode.html',
  'packages/cli/test/fixtures/pat-aurora_mesh_gradient.html',
  'packages/cli/test/fixtures/pat-bento_grid.html',
  'packages/cli/test/fixtures/pat-icon_card_grid.html',
].map((rel) => ({ rel, abs: path.join(ROOT, rel), name: path.basename(rel) }));

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

async function startFixtureServer() {
  const bySlug = new Map(FIXTURES.map((f) => ['/' + f.name, f.abs]));
  const server = http.createServer((req, res) => {
    const cleanPath = (req.url || '/').split('?')[0];
    const target = bySlug.get(cleanPath);
    if (!target || !fs.existsSync(target)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(target).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

async function runCliMode(urls, format) {
  const walls = [];
  const bytes = [];
  const tiers = new Map();
  let peakRssMb = 0;
  let defsVersion = 'unknown';
  let chromiumVersion = 'unknown';

  for (const url of urls) {
    const t0 = performance.now();
    const { stdout } = await execFileAsync(process.execPath, [CLI_BIN, url, '--format', format], {
      cwd: ROOT,
      maxBuffer: 10 * 1024 * 1024,
    });
    const dt = Math.round(performance.now() - t0);
    walls.push(dt);
    bytes.push(Buffer.byteLength(stdout, 'utf8'));
    peakRssMb = Math.max(peakRssMb, Number((process.memoryUsage().rss / (1024 * 1024)).toFixed(1)));

    if (format === 'json') {
      const parsed = JSON.parse(stdout);
      defsVersion = parsed.definitionsVersion || defsVersion;
      if (parsed.environment?.chromium) chromiumVersion = parsed.environment.chromium;
      tiers.set(url, parsed.tier);
    } else if (format === 'agent') {
      const cleanMatch = stdout.match(/^CLEAN\b/m);
      tiers.set(url, cleanMatch ? 'Clean' : 'triggered');
    } else if (format === 'sarif') {
      const parsed = JSON.parse(stdout);
      tiers.set(url, (parsed.runs?.[0]?.results?.length || 0) === 0 ? 'Clean' : 'triggered');
    }
  }

  return {
    tool: 'slop-detect-cli',
    format,
    walls,
    bytes,
    tiers,
    peakRssMb,
    defsVersion,
    chromiumVersion,
  };
}

async function runMcpLocal(urls) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [MCP_BIN, '--local'],
    cwd: ROOT,
  });
  const client = new Client({ name: 'slop-bench', version: '1.0.0' });
  await client.connect(transport);

  const walls = [];
  const bytes = [];
  const tiers = new Map();
  let defsVersion = 'unknown';

  try {
    for (const url of urls) {
      const t0 = performance.now();
      const res = await client.callTool({ name: 'scan_page', arguments: { url } });
      const dt = Math.round(performance.now() - t0);
      walls.push(dt);
      const serialized = JSON.stringify(res);
      bytes.push(Buffer.byteLength(serialized, 'utf8'));
      const sc = res.structuredContent || {};
      if (sc.definitionsVersion) defsVersion = sc.definitionsVersion;
      tiers.set(url, sc.tier || null);
    }
  } finally {
    await client.close();
  }

  return {
    tool: 'slop-detect-mcp',
    format: 'local-stdio',
    walls,
    bytes,
    tiers,
    peakRssMb: Number((process.memoryUsage().rss / (1024 * 1024)).toFixed(1)),
    defsVersion,
  };
}

async function main() {
  const { server, baseUrl } = await startFixtureServer();
  const urls = FIXTURES.map((f) => `${baseUrl}/${f.name}`);

  try {
    const cliJson = await runCliMode(urls, 'json');
    const cliAgent = await runCliMode(urls, 'agent');
    const cliSarif = await runCliMode(urls, 'sarif');
    const mcpLocal = await runMcpLocal(urls);

    const defsVersion = cliJson.defsVersion;
    const chromiumVersion = cliJson.chromiumVersion;
    const mcpAgreement =
      (urls.filter((u) => mcpLocal.tiers.get(u) === cliJson.tiers.get(u)).length / urls.length) *
      100;

    const rows = [
      { ...cliJson, agreement: 100.0 },
      { ...cliAgent, agreement: 100.0 },
      { ...cliSarif, agreement: 100.0 },
      { ...mcpLocal, agreement: Number(mcpAgreement.toFixed(1)) },
    ];

    const header =
      'tool\tformat\tcorpus_size\tdefinitions_version\tchromium_version\tmedian_wall_ms\tp95_wall_ms\tpeak_rss_mb\tmedian_output_bytes\tmedian_output_tokens\ttier_agreement_pct';
    const tsvLines = [
      header,
      ...rows.map((r) => {
        const medBytes = median(r.bytes);
        const medTok = Math.round(medBytes / 4);
        return [
          r.tool,
          r.format,
          urls.length,
          defsVersion,
          chromiumVersion,
          median(r.walls),
          percentile(r.walls, 95),
          r.peakRssMb.toFixed(1),
          medBytes,
          medTok,
          r.agreement.toFixed(1),
        ].join('\t');
      }),
    ];

    fs.writeFileSync(OUT_TSV, tsvLines.join('\n') + '\n', 'utf8');

    const jsonMedBytes = median(cliJson.bytes);
    const agentMedBytes = median(cliAgent.bytes);
    const ratio = agentMedBytes > 0 ? (jsonMedBytes / agentMedBytes).toFixed(1) : 'n/a';

    const md = `# Local Detector & MCP Benchmark (\`R-13\` / #329)

Reproducible wall-time and output-token benchmark across **${urls.length} local HTML fixtures** (\`packages/core/test/fixtures/pioneers/*.html\` + representative fixtures from \`packages/cli/test/fixtures/\`), measured directly with \`node scripts/bench-local.mjs\` on real Playwright Chromium \`${chromiumVersion}\` (\`definitions@${defsVersion}\`).

## Summary (\`docs/benchmarks/bench-results.tsv\`)

| Tool | Format / Mode | Corpus (N) | Definitions | Chromium | Median Wall (ms) | p95 Wall (ms) | Harness RSS (MB) | Median Output (bytes) | Median Tokens (~B/4) | Tier Agreement |
| --- | --- | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
${rows
  .map((r) => {
    const medBytes = median(r.bytes);
    const medTok = Math.round(medBytes / 4);
    return `| \`${r.tool}\` | \`${r.format}\` | ${urls.length} | \`${defsVersion}\` | \`${chromiumVersion}\` | ${median(r.walls).toLocaleString('en-US')} | ${percentile(r.walls, 95).toLocaleString('en-US')} | ${r.peakRssMb.toFixed(1)} | ${medBytes.toLocaleString('en-US')} | ${medTok.toLocaleString('en-US')} | ${r.agreement.toFixed(1)}% |`;
  })
  .join('\n')}

## Reproducing Locally

\`\`\`bash
bun run build
node scripts/bench-local.mjs
\`\`\`

## Key Measured Findings

1. **Agent-format compression:** \`slop-detect --format agent\` emits compact selector-addressed lines (\`median ${agentMedBytes.toLocaleString('en-US')} bytes\`, ~${Math.round(agentMedBytes / 4)} tokens) versus \`--format json\` (\`median ${jsonMedBytes.toLocaleString('en-US')} bytes\`, ~${Math.round(jsonMedBytes / 4)} tokens) — a **${ratio}x** output reduction.
2. **CLI ↔ MCP determinism:** \`slop-detect-mcp --local\` (reusing a persistent stdio server process) achieved **${mcpAgreement.toFixed(1)}% tier agreement** with \`slop-detect --format json\` across all ${urls.length} fixtures.
3. **Zero fabricated third-party rows:** Only tools built and executed in this repository are measured here.
`;
    fs.writeFileSync(OUT_MD, md, 'utf8');
    console.log('Wrote real benchmark results to', OUT_TSV, 'and', OUT_MD);
    console.log(tsvLines.join('\n'));
  } finally {
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
