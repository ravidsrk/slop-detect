# AI Coding Agents, MCP & IDE Integrations

Slop Detector is designed to run **inside your coding agent's loop** so Claude Code, Cursor, Windsurf, GitHub Copilot, OpenAI Codex, v0, and Lovable can audit their own output in real headless Chromium and fix triggered tells before you ever review the PR.

<p align="center">
  <img src="../apps/web/public/media/docs-ci-mcp-loop.png" alt="Closed-Loop Anti-Slop Engineering Workflow (MCP + CI Gate)" width="100%" />
</p>

---

## 1. Which Integration Should I Use?

| Environment | Target URLs | Recommended Setup |
| --- | --- | --- |
| **Claude Code / Cursor / Windsurf (Local Dev)** | `http://localhost:*`, `file://`, AND public URLs | `npx slop-detect init` or `npx -y slop-detect-mcp --local` |
| **Claude Code / Cursor / Windsurf (Zero-Install)** | Public `https://` URLs & deploy previews | `npx -y slop-detect-mcp` (calls `https://slop-detect.com/api/*`) |
| **Web / Cloud Agents (`v0`, `Lovable`, `claude.ai`, `ChatGPT`)** | Public `https://` preview URLs (`*.vercel.app`, `*.lovable.app`) | Remote Streamable HTTP MCP: `https://slop-detect.com/mcp` |
| **Any [agentskills.io](https://agentskills.io)-compatible agent (20+ IDEs)** | Local or public URLs | Copy [`skills/slop-detect/SKILL.md`](../skills/slop-detect/SKILL.md) into `.claude/skills/` or `.cursor/skills/` |

> [!WARNING]
> **Localhost vs. Remote MCP:** The hosted API (`https://slop-detect.com/api/*` and `https://slop-detect.com/mcp`) enforces a strict SSRF guard and rejects `localhost`, `127.0.0.1`, and private network IPs (`422`). To scan `http://localhost:3000` or `file://`, always run the CLI or start `slop-detect-mcp` with `--local` (`SLOP_DETECT_LOCAL=1`).

---

## 2. One-Command Project Setup (`slop-detect init`)

From your project root:

```bash
npx slop-detect init
```

This creates or merges:
1. `.mcp.json` / `.cursor/mcp.json` — registers `slop-detect-mcp`
2. `.claude/settings.local.json` / `.cursor/hooks.json` — wires `packages/mcp/hooks/scan-local.mjs` as a post-edit hook (pass `--no-hooks` to skip hooks)
3. `.claude/skills/slop-detect/SKILL.md` — installs the portable Agent Skill

---

## 3. MCP Server (`slop-detect-mcp` & `https://slop-detect.com/mcp`)

Both the stdio package ([`packages/mcp`](../packages/mcp)) and the stateless Streamable HTTP endpoint (`https://slop-detect.com/mcp`) expose **7 tools** and **1 MCP App UI resource**:

### Available MCP Tools

| Tool Name | Arguments | What It Returns |
| --- | --- | --- |
| `scan_page` | `{ url, axes?: ["design","copy"], preset? }` | Full 0–100 score (`Clean`/`Mild`/`Heavy`), letter grade, triggered pattern evidence, and shareable permalink (`structuredContent` + text). |
| `check_aeo` | `{ url }` | 16-check Answer Engine Optimization audit (`Eligible` / `Partially Eligible` / `Restricted`). |
| `check_design_system` | `{ url, design_md_url? }` | Checks live DOM compliance against `<origin>/DESIGN.md` or a custom `DESIGN.md` URL (`Aligned` / `Drifting` / `Off-system`). |
| `fix_prompt` | `{ url }` | Generates a copy-paste remediation prompt scoped to the page's heaviest triggered tells. |
| `lint_design_md` | `{ design_md }` | Static lint of `DESIGN.md` prose/frontmatter (broken token refs, contrast < 4.5:1, orphaned tokens). No network call. |
| `diff_design_md` | `{ base_design_md, head_design_md }` | Token-level diff between two `DESIGN.md` files; flags breaking removals or value shifts. |
| `extract_design_system` | `{ url?, observed?, format?: "design-md" \| "dtcg" }` | Extracts a Google Labs `DESIGN.md` or W3C DTCG `2025.10` `tokens.json` from a live URL or observed DOM payload. |

### Interactive MCP App Resource (`ui://slop-detect/scorecard.html`)

Clients supporting the MCP Apps extension (`text/html;profile=mcp-app`) render an inline editorial-instrument scorecard directly in chat via `resources/read` on `ui://slop-detect/scorecard.html`.

---

## 4. IDE & Client Configuration

### Claude Code

**Option 1: Claude Code Plugin Marketplace**
```text
/plugin marketplace add ravidsrk/slop-detect
/plugin install slop-detect@slop-detect
```
*(Manifests live at [`.claude-plugin/marketplace.json`](../.claude-plugin/marketplace.json) and [`plugins/slop-detect/.claude-plugin/plugin.json`](../plugins/slop-detect/.claude-plugin/plugin.json).)*

**Option 2: CLI One-Liner**
```bash
# Public URLs (zero install)
claude mcp add slop-detect -- npx -y slop-detect-mcp

# Localhost dev servers (uses local Playwright via slop-detect)
claude mcp add slop-detect -- npx -y slop-detect-mcp --local
```

**Option 3: Automatic PostToolUse Hook (`scan-local.mjs`)**
When editing frontend files against a running dev server (`http://localhost:3000`), wire [`packages/mcp/hooks/claude-code.json`](../packages/mcp/hooks/claude-code.json) into `.claude/settings.local.json`:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "SLOP_LOCAL_URL=http://localhost:3000 node node_modules/slop-detect-mcp/hooks/scan-local.mjs"
          }
        ]
      }
    ]
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "slop-detect": {
      "command": "npx",
      "args": ["-y", "slop-detect-mcp", "--local"]
    }
  }
}
```
Cursor Agent Plugins 1.0 manifests are also provided at [`plugin.json`](../plugin.json) and [`.cursor-plugin/plugin.json`](../.cursor-plugin/plugin.json).

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

### VS Code (GitHub Copilot) & Agent Skills

Copy the portable Agent Skill into your workspace:
```bash
mkdir -p .github/copilot/skills
cp -r skills/slop-detect .github/copilot/skills/
```
Or for Microsoft Agent Package Manager (APM), see [`apm.yml`](../apm.yml).

---

## 5. Cloud Builders & Remote Connectors

- **Vercel `v0`, Lovable, claude.ai, and ChatGPT Developer Mode:** Connect directly to `https://slop-detect.com/mcp` (Streamable HTTP, no auth required). Step-by-step instructions: [**`BUILDER_RECIPES.md`**](./BUILDER_RECIPES.md).
- **Pairing with `frontend-design`, Stitch `DESIGN.md`, and Impeccable:** Prompting and verification workflows: [**`GENERATOR_RECIPES.md`**](./GENERATOR_RECIPES.md).
