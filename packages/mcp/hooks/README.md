# Agent hooks

`scan-regression.mjs` is the hook. It is published as the `slop-detect-hook` bin, so it runs without adding anything to the project:

```bash
npx -y -p slop-detect -p slop-detect-mcp slop-detect-hook
```

`slop-detect` (the Playwright runner) is an optional peer of `slop-detect-mcp`, so it is named with `-p`. `npx slop-detect init` writes this command for Claude Code (PostToolUse + Stop), Cursor and Codex. The hook never calls `https://slop-detect.com/api/*`.

It scans the dev server named by `SLOP_LOCAL_URL`, `.slop/local-url` or its first argument. The first scored run records `.slop/session-baseline.json`; later runs report only when the score rises or a new pattern appears.

## Exit codes

As a hook (Claude Code, Cursor and Codex pass one JSON object on stdin), exit codes follow what the agent can act on:

| Situation | Exit | What happens |
| --- | --- | --- |
| Score rose or a new pattern appeared | 2 | The message goes to stderr: Claude sees it after the edit, and Stop is blocked so the agent can fix it. |
| Same regression, Stop already continued (`stop_hook_active`) | 0 | A `systemMessage` tells you; the agent is not sent round again. |
| Scan could not run (dev server down, wrong port, no browser) | 0 | Never blocks. On Stop a `systemMessage` says why; that is not a Clean score. |
| No URL configured | 0 | Silent. The hook does nothing until you set one. |
| PostToolUse on a non-UI file (`.py`, `.go`, lockfiles, …) | 0 | No scan. |

From a terminal it keeps CLI exit codes: 0 scored, 1 regression (text on stdout), 2 could not run.

## Claude Code

`claude-code.json` is the repo-root recipe (`node packages/mcp/hooks/scan-regression.mjs`). In another project, use the `npx` command above, or `node ./node_modules/slop-detect-mcp/hooks/scan-regression.mjs` when both packages are installed. Copy the `hooks` object into `.claude/settings.local.json` and set `SLOP_LOCAL_URL` (or `.slop/local-url`).

The Claude Code plugin (`plugins/slop-detect`) ships `hooks/run-hook.mjs`, which checks for a configured URL first and then runs the same `npx` command, so the plugin costs nothing until you opt in.

## Cursor and Codex

Use the same command in the harness hook file (Cursor `.cursor/hooks.json`, Codex `.codex/hooks.json`). Codex runs a hook only after you approve the hook file. This recipe does not submit anything to a marketplace or registry.

## scan-local.mjs

`scan-local.mjs` scores one page and prints the scan-result JSON (CI smoke and `scan-regression.mjs` use it). From a terminal: exit 0 when scored, 2 when the scan could not run. Older recipes ran it as the hook; with hook JSON on stdin it now prints nothing and exits 0, so it can't block an agent.

The MCP server itself should run in local mode (`npx -y -p slop-detect -p slop-detect-mcp slop-detect-mcp --local` or `SLOP_DETECT_LOCAL=1`) so `scan_page`, `check_aeo`, `check_design_system`, `fix_prompt` and `extract_design_system` stay on this machine as well.
