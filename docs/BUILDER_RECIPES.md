# Builder Recipes — Lovable, v0, claude.ai, and ChatGPT via Remote MCP

Slop Detector exposes a zero-auth, stateless Streamable HTTP MCP server at:

```text
https://slop-detect.com/mcp
```

It implements both the **2026-07-28 stateless MCP specification** (`server/discover`, no session handshake required, deterministic `tools/list` ordering) and the **2025-11-25** `initialize` handshake for backward compatibility, plus an inline **MCP App score card** (`text/html;profile=mcp-app`, `ui://slop-detect/score-card.html`).

---

## Public URL vs. Localhost (`--local`) Requirement

| Target URL | Which MCP Server to Use | Why |
| --- | --- | --- |
| Public `https://` preview (`*.lovable.app`, `*.vercel.app`, `*.netlify.app`, `*.pages.dev`) | Remote MCP: `https://slop-detect.com/mcp` | The hosted Cloudflare Worker opens the public URL in headless Chromium. |
| `http://localhost:*`, `http://127.0.0.1:*`, `file://`, or private VPN preview | Local stdio MCP: `npx -y slop-detect-mcp --local` | The remote server enforces a strict SSRF guard and rejects loopback/private IPs (`422`). `--local` runs Playwright on your machine with zero data egress. |

---

## 1. Lovable (Custom MCP Connector)

1. In your Lovable workspace, open **Settings → Connectors → Chat connectors → New MCP server**.
2. Fill in:
   - **Name:** `Slop Detector`
   - **Server URL:** `https://slop-detect.com/mcp`
   - **Authentication:** `None`
3. Click **Save & Verify**. Lovable discovers 6 tools: `scan_page`, `check_aeo`, `check_design_system`, `fix_prompt`, `lint_design_md`, and `diff_design_md`.
4. Publish or update your Lovable preview URL (`https://<project>.lovable.app`), then ask in chat:
   ```text
   Run scan_page and check_aeo on https://<project>.lovable.app. If the design or copy score is above 9, call fix_prompt and apply the changes.
   ```

---

## 2. Vercel `v0` (Bring-Your-Own MCP)

1. In `v0`, click the **MCP** icon in the prompt bar (or open **Settings → MCP Connections → Add Connection**).
2. Enter:
   - **Name:** `slop-detect`
   - **Transport:** `Streamable HTTP`
   - **URL:** `https://slop-detect.com/mcp`
   - **Headers:** *(leave empty — anonymous access is supported; optional `x-api-key` if you have a high-volume key)*
3. Once `v0` generates a preview deployment URL, prompt:
   ```text
   Audit the preview URL with scan_page (axes: ["design", "copy"]) and check_design_system. Apply any fixes returned by fix_prompt.
   ```

---

## 3. Claude.ai (Custom Integration / Remote MCP)

1. Open **claude.ai → Settings → Integrations → Add Custom Integration**.
2. Set:
   - **Integration Name:** `Slop Detector`
   - **Remote MCP URL:** `https://slop-detect.com/mcp`
3. In any conversation, paste a public URL and ask:
   ```text
   Audit https://example.com with Slop Detector across design, copy, and AEO.
   ```
   Claude renders the interactive `ui://slop-detect/score-card.html` MCP App card inline alongside the structured findings.

---

## 4. ChatGPT Developer Mode / Codex App Directory

1. In ChatGPT, open **Settings → Connectors / Developer Mode → Create Connector**.
2. Set:
   - **Name:** `Slop Detector`
   - **MCP Endpoint:** `https://slop-detect.com/mcp`
   - **Authentication:** `None`
3. Domain verification is served at `https://slop-detect.com/.well-known/openai-apps-challenge` and the portable manifest is in [`plugin.json`](../plugin.json) with review test cases in [`docs/openai-app-review-cases.json`](./openai-app-review-cases.json).
