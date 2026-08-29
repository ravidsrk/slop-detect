// Build task 16: seo-version-consistency.
// Closes the discovery gap (the new /docs + /brand routes and the per-domain
// /score hubs must be in the sitemap) and the version-drift gap (every static
// copy of the product version and the catalogue version is pinned to its ONE
// source — root package.json and core's DEFINITIONS_VERSION — so the labels can
// never silently lag a release again).

import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

const sitemap = read('../public/sitemap.xml');
const openapi = JSON.parse(read('../public/openapi.json'));
const agentCard = JSON.parse(read('../public/.well-known/agent-card.json'));
const serverCard = JSON.parse(read('../public/.well-known/mcp/server-card.json'));
const patternsMd = read('../public/api/patterns.md');

// The single sources of truth.
const pkg = JSON.parse(read('../../../package.json'));
const coreSrc = read('../../../packages/core/src/index.ts');
const DEFINITIONS_VERSION = coreSrc.match(/DEFINITIONS_VERSION\s*=\s*'([^']+)'/)?.[1];

// ── discovery: the sitemap lists the new routes (floor "discovery gap") ───────
test('sitemap includes the new /docs and /brand routes', () => {
  expect(sitemap, '/docs must be discoverable').toContain(
    '<loc>https://slop-detect.com/docs</loc>'
  );
  expect(sitemap, '/brand must be discoverable').toContain(
    '<loc>https://slop-detect.com/brand</loc>'
  );
});

test('sitemap lists a representative set of per-domain /score hubs', () => {
  const scoreHubs = (sitemap.match(/<loc>https:\/\/slop-detect\.com\/score\//g) || []).length;
  expect(scoreHubs, 'the canonical score hubs are the spine and must be crawlable').toBeGreaterThan(
    5
  );
  // Marquee corpus domains the leaderboard headlines.
  for (const d of ['stripe.com', 'vercel.com', 'v0.dev', 'linear.app']) {
    expect(sitemap).toContain(`<loc>https://slop-detect.com/score/${d}</loc>`);
  }
});

test('sitemap is well-formed: every <loc> sits inside a <url> and uses the canonical origin', () => {
  const locs = sitemap.match(/<loc>([^<]+)<\/loc>/g) || [];
  expect(locs.length).toBeGreaterThan(15);
  for (const loc of locs) {
    expect(loc).toMatch(/<loc>https:\/\/slop-detect\.com\//);
  }
  expect((sitemap.match(/<url>/g) || []).length).toBe((sitemap.match(/<\/url>/g) || []).length);
});

// ── version drift: product version pinned to ONE source (root package.json) ───
test('openapi + agent surface advertise the released package version (no drift)', () => {
  const v = pkg.version;
  expect(openapi.info.version, 'openapi.json must track package.json').toBe(v);
  expect(agentCard.version, 'agent-card.json must track package.json').toBe(v);
  expect(serverCard.version, 'mcp server-card.json must track package.json').toBe(v);
});

test('publishable packages share one version and a changesets fixed group', () => {
  const core = JSON.parse(read('../../../packages/core/package.json'));
  const cli = JSON.parse(read('../../../packages/cli/package.json'));
  const mcp = JSON.parse(read('../../../packages/mcp/package.json'));
  expect(cli.version).toBe(core.version);
  expect(mcp.version).toBe(core.version);
  const changesets = JSON.parse(read('../../../.changeset/config.json'));
  expect(changesets.fixed).toEqual([['@slop-detect/core', 'slop-detect', 'slop-detect-mcp']]);
});

// ── defs drift: catalogue label pinned to ONE source (DEFINITIONS_VERSION) ────
test('catalogue version labels track DEFINITIONS_VERSION (no defs drift)', () => {
  expect(DEFINITIONS_VERSION, 'parsed DEFINITIONS_VERSION from core').toMatch(/^\d{4}\.\d{2}$/);
  expect(
    patterns_md_version(patternsMd),
    'api/patterns.md catalogue label must match the engine'
  ).toBe(DEFINITIONS_VERSION);
  expect(
    openapi.components.schemas.PatternCatalogue.properties.version.example,
    'openapi PatternCatalogue example must match the engine'
  ).toBe(DEFINITIONS_VERSION);
  // The stale label must not reappear anywhere in the catalogue doc.
  expect(patternsMd.includes('Version 2026.08,'), 'no stale catalogue label').toBeFalsy();
});

function patterns_md_version(md) {
  return md.match(/Version (\d{4}\.\d{2}),/)?.[1];
}

// ── parity: the full agent tool surface is advertised everywhere (MNR-24) ─────
test('the llms developer surfaces advertise the full MCP tool list', () => {
  for (const rel of ['../public/llms-full.txt', '../public/developers/llms.txt']) {
    const txt = read(rel);
    for (const tool of ['scan_page', 'check_aeo', 'check_design_system', 'fix_prompt']) {
      expect(txt.includes(tool), `${rel}: must advertise ${tool}`).toBeTruthy();
    }
  }
});

test('published surfaces do not hardcode a 16-rule pattern count', () => {
  const files = [
    '../../../packages/cli/README.md',
    '../../../packages/mcp/README.md',
    '../../../packages/action/README.md',
    '../../../packages/action/action.yml',
    '../API.md',
    '../../../skills/README.md',
  ];
  for (const rel of files) {
    const txt = read(rel);
    expect(txt.includes('16-rule'), rel).toBeFalsy();
    expect(txt.includes('16 "AI slop"'), rel).toBeFalsy();
  }
});
