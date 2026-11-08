# Generator Recipes — Pairing Slop Detector as the Verifier

> **Slop Detector is the verifier that generators call.** Design skills (`frontend-design`, `impeccable`, `taste-skill`, `hallmark`) and page builders (`v0`, `Lovable`, `Stitch`) guide generation. `slop-detect` verifies the rendered result in headless Chromium against your `DESIGN.md`, default-template CSS/copy patterns, craft floor, and AEO eligibility.

All recipes below follow [K-06](https://github.com/ravidsrk/slop-detect/issues/301): the scanner measures overlap with default-template patterns, token drift, and technical eligibility — never authorship.

---

## 1. Anthropic `frontend-design` + `slop-detect`

Anthropic's [`frontend-design` skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) steers Claude away from generic layouts during prompting. Pair it with `slop-detect` so Claude verifies the rendered DOM before finishing.

### Setup

```bash
# Install both skills into Claude Code / Cursor
npx skills add anthropics/skills --skill frontend-design
npx skills add ravidsrk/slop-detect --skill slop-detect

# Or install the Claude Code plugin (includes skill + local MCP + PostToolUse hook)
# /plugin marketplace add ravidsrk/slop-detect
# /plugin install slop-detect@slop-detect
```

### Prompt workflow

```text
1. Build the landing page following the frontend-design skill and ./DESIGN.md.
2. Start the dev server and run `npx slop-detect http://localhost:3000 --copy --craft --design-md ./DESIGN.md --format agent`.
3. If any scored pattern fires or DESIGN.md coverage drops below 80, run `npx slop-detect http://localhost:3000 --fix-prompt` and apply the targeted fixes until the page grades Clean (score <= 9).
```

---

## 2. Google Stitch `DESIGN.md` + `check_design_system`

[`@google/design.md`](https://github.com/google-labs-code/design.md) validates static `DESIGN.md` syntax and within-file contrast, while `slop-detect` checks whether the **rendered page in Chromium** actually uses the declared tokens (`coverage.color`, `coverage.font`, `coverage.radius`, `coverage.spacing`, ΔE_OK ≤ 0.03).

### CI & Local Verification

```bash
# Step 1: Lint the static DESIGN.md contract
npx slop-detect --lint-design-md ./DESIGN.md

# Step 2: Verify the rendered page against DESIGN.md in headless Chromium
npx slop-detect http://localhost:3000 --design-md ./DESIGN.md --fail-under B
```

When `DESIGN.md` explicitly declares a brand choice (for example, `Space Grotesk` or a `#7c3aed` brand primary), `slop-detect` automatically records a `waivedByDesignMd` waiver so intentional brand tokens are not double-penalized as default-template patterns.

---

## 3. Vercel `v0` + Remote MCP (`https://slop-detect.com/mcp`)

Use Slop Detector inside `v0` generations via the stateless Streamable HTTP MCP endpoint:

1. In `v0`, open **Settings → MCP Connections → Add MCP Server**.
2. Set **URL** to `https://slop-detect.com/mcp` (Authentication: **None**).
3. After `v0` deploys a preview URL (`https://*.vercel.app`), prompt:
   > "Call `scan_page` and `check_aeo` on the preview URL, then call `fix_prompt` and apply the diff."

See [BUILDER_RECIPES.md](./BUILDER_RECIPES.md) for step-by-step screenshots and localhost caveats.

---

## 4. Cursor Agent Plugins 1.0 + Local Hook Loop

Cursor loads the root [`plugin.json`](../plugin.json) / [`.cursor-plugin/plugin.json`](../.cursor-plugin/plugin.json) manifest directly:

```bash
# One-command project setup (writes .cursor/mcp.json + .cursor/hooks.json)
npx slop-detect init --providers=cursor --scope=project
```

Or click the Cursor MCP install deeplink:

```text
cursor://anysphere.cursor-deeplink/mcp/install?name=slop-detect&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsInNsb3AtZGV0ZWN0LW1jcCJdfQ==
```

---

## 5. Impeccable + `slop-detect` (Source Critique + Rendered Score & AEO Gate)

[Impeccable](https://github.com/pbakaus/impeccable) provides 24 design commands and 61 detector rules during interactive editing. Pair it with `slop-detect` for:
- **Calibrated 0–100 tier scoring** (`Clean` 0–9, `Mild` 10–27, `Heavy` ≥28) with held-out likelihood ratios.
- **Rendered `DESIGN.md` conformance** (`check_design_system`).
- **AEO crawler & preview-control eligibility** (`check_aeo`).
- **PR ratcheting & SARIF 2.1.0 code scanning** in GitHub Actions.

```bash
# During interactive polish
npx impeccable detect http://localhost:3000

# Pre-PR gate: multi-axis score + DESIGN.md + AEO + SARIF
npx slop-detect http://localhost:3000 --copy --craft --aeo --design-md ./DESIGN.md --fail-on heavy
```
