# MCP SDK v2 plan

This package is on `@modelcontextprotocol/sdk` `^1.32.2` (MCP protocol up to `2025-11-25`). It uses the low-level `Server` class with plain JSON Schemas. A move to SDK v2 is not scheduled; when it happens, keep the points below.

## Do not adopt

The MCP revision dated 2026-07-28 deprecates Sampling, Roots, and Logging. This server does not use them. A later SDK v2 migration must not add them.

## What is already on the tool list

- The tool contract (names, input schemas, descriptions, annotations, prompts, server instructions) comes from `packages/core/src/mcp-tools.ts`. The hosted endpoint at `https://slop-detect.com/mcp` serves the same contract; `apps/web/test/mcp-contract.test.js` fails if they differ.
- `scan_page` and `check_aeo` keep `outputSchema` from `schemas/scan-result.v1.json` when that file loads. Their `structuredContent` is a compact, schema-valid scan document (triggered patterns only); `detail: "full"` returns the whole document, and the npm server also keeps it behind `slop://scan/<scan_id>`.
- `check_design_system`, `fix_prompt`, `lint_design_md`, `diff_design_md` and `extract_design_system` declare small typed output schemas (system result, prompt metadata, lint report, token diff, extracted tokens). They carry data, not a copy of the text result.
- Tools, prompts, resources and the `slop://scan/{scan_id}` resource template set `icons` to `https://slop-detect.com/favicon.svg` (`image/svg+xml`, size `any`).
- Server `instructions` are sent in `initialize` (Claude Code's tool search loads only tool names and instructions up front).

## Still out of scope

Live submission to the MCP Registry, Glama, skills.sh, or a marketplace. A v1.0.0 tag.
