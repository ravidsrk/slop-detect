# MCP SDK v2 plan

This package stays on `@modelcontextprotocol/sdk` `^1.29.0`. Do not bump it in the current slice, and do not publish a registry entry from this plan.

## Do not adopt

The MCP revision dated 2026-07-28 deprecates Sampling, Roots, and Logging. This server does not use them. A later SDK v2 migration must not add them.

## What is already on the tool list

- `scan_page` and `check_aeo` keep `outputSchema` from `schemas/scan-result.v1.json` when that file loads. Their `structuredContent` is the stamped scan document.
- `check_design_system`, `fix_prompt`, `lint_design_md`, and `diff_design_md` use a text schema `{ text: string }`. They are not scan documents. Do not attach the scan schema to them.
- Tools, prompts, and resources set `icons` to `https://slop-detect.com/favicon.svg` (`image/svg+xml`, size `any`). The 1.29 server returns the tool objects from the list handler. This slice does not upgrade the SDK to find out whether a future validator strips unknown keys. If a client drops `icons`, keep them on the exported objects and add a list-handler wrapper only after that drop is observed.

## Still out of scope

Live submission to the MCP Registry, Glama, skills.sh, or a marketplace. npm publish. A v1.0.0 tag.
