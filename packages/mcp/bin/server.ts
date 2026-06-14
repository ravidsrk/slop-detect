#!/usr/bin/env node
// Entry point for `npx slop-detect-mcp`. Kept tiny — all wiring lives in
// ../src/server.js so the logic is importable and testable.

import { startServer } from '../src/index.js';

startServer().catch((err) => {
  process.stderr.write(`slop-detect-mcp: fatal — ${err && err.message ? err.message : err}\n`);
  process.exit(1);
});
