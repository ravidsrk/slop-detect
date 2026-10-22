# Local scan hooks

`scan-local.mjs` scores `SLOP_LOCAL_URL` (or the first argument) with the Playwright runner from the `slop-detect` package. It does not call `https://slop-detect.com/api/*`. A scored page exits 0. A blocked or errored scan exits 2 and prints `Scan could not run. This is not a Clean score.`

Point `SLOP_LOCAL_URL` at the dev server the agent just edited, for example `http://127.0.0.1:3000/`. `file://` pages work too. Install `slop-detect` next to this package so Playwright can launch. The smoke job runs this command against a local fixture after `playwright install --with-deps chromium`. A machine without those system libraries exits 2. That exit is not a Clean score.

## Claude Code

`claude-code.json` is a PostToolUse and Stop recipe. From the repo root the command is `node packages/mcp/hooks/scan-local.mjs`. From an install, use `node ./node_modules/slop-detect-mcp/hooks/scan-local.mjs`. Copy the `hooks` object into `.claude/settings.local.json` and export `SLOP_LOCAL_URL`.

## Cursor and Codex

Use that same command in the harness hook file (Cursor `.cursor/hooks.json`, Codex `.codex/hooks.json`). Codex runs a hook only after you approve the hook file. This recipe does not submit anything to a marketplace or registry.

The MCP server itself should be started with `--local` (`npx -y slop-detect-mcp --local` or `SLOP_DETECT_LOCAL=1`) so `scan_page`, `check_aeo`, `check_design_system`, and `fix_prompt` stay on this machine as well.

`scan-regression.mjs` wraps that scan. The first scored run writes `.slop/session-baseline.json` and prints nothing. A later run prints only when the score rises or a new pattern appears. A blocked scan still exits 2. `slop-detect init` writes project files that call this command. It does not submit a marketplace listing.
