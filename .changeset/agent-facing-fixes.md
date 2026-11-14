---
'@slop-detect/core': patch
'slop-detect': patch
'slop-detect-mcp': patch
---

Agent-facing fixes (#357–#365): working `npx` local mode, compact MCP results with scan reuse, hooks that report regressions to the agent without blocking on setup, failed scans as errors, one MCP contract shared by the npm server and the hosted endpoint, private agent scans, and fix prompts that fit the page.
