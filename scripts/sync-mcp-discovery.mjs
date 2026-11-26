#!/usr/bin/env node
// Copies the MCP tool and prompt contract from @slop-detect/core into the
// static discovery card (apps/web/public/.well-known/mcp/server-card.json), so
// clients that read the card see exactly what tools/list serves (#361).
// Run after changing packages/core/src/mcp-tools.ts (build core first):
//   bun run --filter @slop-detect/core build && node scripts/sync-mcp-discovery.mjs
// apps/web/test/mcp-http.test.js fails when the card drifts.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const core = await import('../packages/core/dist/index.js');
const path = fileURLToPath(
  new URL('../apps/web/public/.well-known/mcp/server-card.json', import.meta.url)
);
const card = JSON.parse(readFileSync(path, 'utf8'));
card.tools = core.MCP_TOOLS.map((tool) => ({
  name: tool.name,
  title: tool.title,
  description: tool.description,
}));
card.prompts = core.MCP_PROMPTS.map((prompt) => ({
  name: prompt.name,
  description: prompt.description,
}));
writeFileSync(path, `${JSON.stringify(card, null, 2)}\n`);
console.log(`synced ${card.tools.length} tools and ${card.prompts.length} prompts into ${path}`);
