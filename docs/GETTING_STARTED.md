# Getting Started with Slop Detector

Get from zero to your first 5-axis landing page audit in under five minutes.

---

## 1. Run Your First Scan (No Install Required)

### Option A: From Your Terminal (Local Chromium via `npx`)

```bash
# Score the design axis (45 CSS/DOM patterns) in real headless Chromium
npx slop-detect https://your-site.com

# Run a full multi-axis audit: Design + Copy + Craft Floor + DESIGN.md + AEO
npx slop-detect https://your-site.com --copy --craft --aeo --design-md auto
```

> [!TIP]
> On its first run, `slop-detect` lazily downloads Playwright's headless Chromium (~150 MB). If you don't want to download a local browser, add `--remote` to run the scan through the hosted API (`https://slop-detect.com/api/scan`):
> ```bash
> npx slop-detect https://your-site.com --copy --remote
> ```

### Option B: Via `curl` (Public HTTP API)

```bash
curl -s -X POST https://slop-detect.com/api/scan \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://your-site.com","axes":["design","copy"],"designMd":true}' | jq
```

### Option C: In the Web Workbench

Open [**https://slop-detect.com**](https://slop-detect.com), paste any public URL, and inspect triggered tells in the interactive X-Ray breakdown.

---

## 2. Understanding Your Score

Slop Detector evaluates five independent axes. Note the **score polarity** — for the two slop axes, **0 is best**; for System, AEO, and Craft, **100 is best**:

| Axis | Flag / Endpoint | Score Range | Polarity | Tier Bands |
| --- | --- | --- | --- | --- |
| **Design Slop** | *(default)* | `0–100` | **Lower is better** | `Clean` (`0–9`, `A+`..`A-`) · `Mild` (`10–27`, `B+`..`C`) · `Heavy` (`28+`, `D+`..`F`) |
| **Copy Slop** | `--copy` / `axes: ["design","copy"]` | `0–100` | **Lower is better** | `Clean` (`0–7`) · `Mild` (`8–19`) · `Heavy` (`20+`) |
| **Craft Floor** | `--craft` | `0–100` | **Higher is better** | Orthogonal rendering/a11y floor; never inflates Design or Copy tiers |
| **System (`DESIGN.md`)** | `--design-md auto` or `./DESIGN.md` | `0–100` | **Higher is better** | `Aligned` (`80–100`) · `Drifting` (`50–79`) · `Off-system` (`<50`) |
| **AEO Readiness** | `--aeo` / `POST /api/aeo` | `0–100` | **Higher is better** | `Eligible` (`80–100`) · `Partially Eligible` (`50–79`) · `Restricted` (`<50`) |

---

## 3. Generate a Fix Prompt for Your Coding Agent

When a scan flags default-template tells, generate a targeted remediation prompt containing the exact DOM evidence, senior-designer prescription, concrete brand alternatives, and testable hard rules:

```bash
# Full markdown remediation prompt (paste into Claude Code, Cursor, or v0)
npx slop-detect https://your-site.com --copy --fix-prompt > fix.md

# Or compact <=120-word avoid-list brief for tight agent context windows
npx slop-detect https://your-site.com --json > scan.json
npx slop-detect --brief scan.json
```

---

## 4. Wire Slop Detector Into Your Project in One Command

Inside any frontend repository (Next.js, Astro, Vite, Remix, SvelteKit, etc.), run:

```bash
npx slop-detect init
```

This non-destructively configures:
- **Claude Code** (`.mcp.json`, `.claude/settings.local.json` PostToolUse hook, and Agent Skill)
- **Cursor** (`.cursor/mcp.json` and `.cursor/hooks.json`)

Add `--no-hooks` if you only want the MCP server and Agent Skill without automatic post-edit hooks:

```bash
npx slop-detect init --dir . --no-hooks
```

---

## 5. Next Steps

- [**Complete CLI Guide (`CLI_GUIDE.md`)**](./CLI_GUIDE.md) — Batch scanning, static HTML directories (`--copy-dir`), site-wide crawls (`--site`), SARIF/JUnit output, and baseline ratcheting.
- [**AI Agent & IDE Integrations (`AGENT_INTEGRATIONS.md`)**](./AGENT_INTEGRATIONS.md) — Claude Code, Cursor, Windsurf, Copilot, Codex, and Remote MCP (`https://slop-detect.com/mcp`).
- [**CI/CD & Deploy Gates (`CI_AND_DEPLOY_GATES.md`)**](./CI_AND_DEPLOY_GATES.md) — Block regressions in GitHub Actions, Vercel, Netlify, Lighthouse, and Vale.
- [**Design Systems (`DESIGN_SYSTEMS.md`)**](./DESIGN_SYSTEMS.md) — Extract, lint, diff, and enforce `DESIGN.md` and W3C DTCG `2025.10` `tokens.json`.
- [**AEO Guide (`AEO_GUIDE.md`)**](./AEO_GUIDE.md) — Configure `robots.txt`, `/llms.txt`, Markdown twins, and agent discovery endpoints.
