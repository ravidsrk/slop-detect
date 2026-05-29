# slop-detect-mcp

> MCP server that lets AI coding agents scan landing pages for **AI-design-slop** and pull a ready-to-paste fix prompt — straight from the chat.

Part of [slop-detect](https://slop-detect.com): the 16-rule fingerprint that catches Cursor / v0 / Lovable template slop in the wild. This package wraps the live `slop-detect.com` API as a [Model Context Protocol](https://modelcontextprotocol.io) server, so **Claude Code, Cursor, and Windsurf** can audit and de-slop pages without a browser or API key.

## Tools

| Tool | Input | What it does |
| --- | --- | --- |
| `scan_page` | `{ url }` | Scans the page and returns a grade, a 0-100 score (**lower is better**), the slop tier, a verdict, the triggered patterns, and a shareable result URL. |
| `fix_prompt` | `{ url }` | Returns a copy-paste prompt that tells a coding agent exactly how to de-slop the page. |

> **Score polarity:** `0` = no slop. Tiers are **Clean** (0–9), **Mild** (10–27), **Heavy** (28+).

## Install

No global install needed — clients run it on demand via `npx`:

```bash
npx -y slop-detect-mcp
```

Or install it explicitly:

```bash
npm install -g slop-detect-mcp
```

## Configure your client

All MCP clients use the same config shape. Add the server, restart the client, and ask it to "scan https://example.com for slop".

### Claude Code

Add to `.mcp.json` in your project root (or `claude_desktop_config.json` for Claude Desktop):

```json
{
  "mcpServers": {
    "slop-detect": {
      "command": "npx",
      "args": ["-y", "slop-detect-mcp"]
    }
  }
}
```

Or one-liner from the Claude Code CLI:

```bash
claude mcp add slop-detect -- npx -y slop-detect-mcp
```

### Cursor

Add to `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global):

```json
{
  "mcpServers": {
    "slop-detect": {
      "command": "npx",
      "args": ["-y", "slop-detect-mcp"]
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "slop-detect": {
      "command": "npx",
      "args": ["-y", "slop-detect-mcp"]
    }
  }
}
```

## Configuration

| Env var | Default | Purpose |
| --- | --- | --- |
| `SLOP_DETECT_API` | `https://slop-detect.com` | API base URL. Point it at a local dev build (e.g. `http://localhost:8788`) when hacking on the web app. |

```json
{
  "mcpServers": {
    "slop-detect": {
      "command": "npx",
      "args": ["-y", "slop-detect-mcp"],
      "env": { "SLOP_DETECT_API": "http://localhost:8788" }
    }
  }
}
```

## Notes

- **No captcha, but rate-limited.** Non-browser callers skip the Turnstile challenge, so this server works headless — but the API rate-limits per IP. If you see a rate-limit message, wait a bit before scanning again.
- **Errors come back as tool content**, never as crashes — a flaky page or a 429/502 returns a clear message the agent can act on.

## License

MIT © Ravindra Kumar
