// Product version shared by the npm packages (core, CLI, MCP) and the hosted
// app (MCP serverInfo, server card, /?mode=agent). The release bump updates
// this together with the package.json versions; a test in
// packages/core/test/version.test.js fails if they drift apart.
export const SLOP_DETECT_VERSION = '0.9.0';
