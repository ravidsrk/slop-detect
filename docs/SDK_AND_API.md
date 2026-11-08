# Programmatic SDK (`slop-detect-core`) & HTTP REST API

Whether you want to embed the pure detection engine inside your own Playwright / Puppeteer / Cloudflare Workers pipeline or call the hosted HTTP API (`https://slop-detect.com`), both surfaces return the exact same schema-validated payload ([`schemas/scan-result.v1.json`](../schemas/scan-result.v1.json)).

---

## Part 1: Programmatic JavaScript / TypeScript SDK (`slop-detect-core`)

`slop-detect-core` has **zero runtime dependencies** and runs in Node.js, Bun, Deno, Cloudflare Workers, or the browser.

> [!IMPORTANT]
> **Package Name:** Install from npm as **`slop-detect-core`** (`npm install slop-detect-core`). Inside this monorepo, the workspace is named `@slop-detect/core`; `prepack` rewrites it to `slop-detect-core` on publish.

### 1. Full 5-Axis Scan with Playwright or Puppeteer

```ts
import { chromium } from 'playwright';
import fs from 'node:fs';
import {
  PATTERNS,
  buildPageEvaluateScript,
  assembleScanResult,
  parseDesignMd,
  scoreSystemCompliance,
  applyDeclaredDesignWaivers,
  runAeoChecks,
  buildFixPrompt,
} from 'slop-detect-core';

const url = 'https://example.com';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
await page.evaluate(() => document.fonts?.ready);

// 1. Build and run the self-contained DOM inspection script
const script = buildPageEvaluateScript(PATTERNS, { includeSystem: true });
const raw = await page.evaluate(script);

// 2. Score Design + Copy + Craft Floor
let result = assembleScanResult(raw, {
  url,
  finalUrl: page.url(),
  axes: ['design', 'copy'],
  includeCraft: true,
  patterns: PATTERNS,
});

// 3. Optional: Check compliance against DESIGN.md and apply declared token waivers
const designMdText = fs.readFileSync('./DESIGN.md', 'utf8');
const parsedDesign = parseDesignMd(designMdText);
if (parsedDesign && !result.blocked) {
  result.system = scoreSystemCompliance(parsedDesign, raw.systemContext);
  result = applyDeclaredDesignWaivers(result, parsedDesign);
}

// 4. Optional: Run the 16-check AEO network & HTML audit
const aeo = await runAeoChecks(url);

// 5. Optional: Build a remediation prompt for coding agents
const prompt = buildFixPrompt(result);

await browser.close();
console.log({
  score: result.score,
  tier: result.tier,
  grade: result.grade,
  copyScore: result.axes?.copy?.score,
  craftScore: result.craft?.score,
  systemScore: result.system?.score,
  aeoScore: aeo.score,
});
```

### 2. Authoring Custom Declarative Rules (`compileRule`)

Extend `PATTERNS` with your own team-specific rules without writing serialized DOM traversal code:

```ts
import { PATTERNS, compileRule, validateRule, buildPageEvaluateScript } from 'slop-detect-core';

const noComicSans = {
  id: 'team_no_comic_sans',
  label: 'Forbidden Comic Sans font family',
  short: 'Comic Sans',
  category: 'fonts',
  weight: 6,
  detect: {
    when: [{ style: 'fontFamily', matches: 'comic sans', flags: 'i' }],
    trigger: { minCount: 1 },
  },
};

const errors = validateRule(noComicSans);
if (errors.length > 0) throw new Error(errors.join(', '));

const customPatterns = [...PATTERNS, compileRule(noComicSans)];
const script = buildPageEvaluateScript(customPatterns);
```

### 3. Standalone Copy, `DESIGN.md` & Token Utilities (No Browser Needed)

```ts
import {
  scoreCopy,
  lintDesignMd,
  diffDesignMd,
  generateDesignMd,
  extractDtcgTokens,
} from 'slop-detect-core';

// Lint a DESIGN.md file statically
const lintReport = lintDesignMd(designMdMarkdown);

// Diff two DESIGN.md files for breaking token changes
const diffReport = diffDesignMd(baseDesignMd, headDesignMd);
```

---

## Part 2: Public HTTP REST API (`https://slop-detect.com`)

For complete request/response schemas, authentication headers (`Authorization: Bearer sk_live_xxx` or `X-API-Key`), rate limits, and error codes, see [**`apps/web/API.md`**](../apps/web/API.md) and the OpenAPI 3.1 spec at [`https://slop-detect.com/openapi.json`](../apps/web/public/openapi.json).

### Core Endpoints Summary

| Method & Path | Description |
| --- | --- |
| `POST /api/scan` | Run headless Chromium scan. Body: `{ url, axes?: ["design","copy"], designMd?: true \| string, preset?: "full" \| "strict" \| "marketing" \| "minimal", screenshot?: boolean }`. |
| `POST /api/aeo` | Run the 16-check AEO readiness audit. Body: `{ url }`. |
| `POST /api/fix-prompt` | Generate a markdown remediation prompt from `{ url }` or an existing `{ result }`. |
| `GET /api/patterns` | Live rule catalogue (`PATTERNS`, `COPY_PATTERNS`, `AEO_CHECKS`, `SYSTEM_CHECKS`, `CRAFT_CHECKS`, `DEFINITIONS_VERSION`). |
| `POST /mcp` | Stateless Streamable HTTP MCP endpoint (`initialize`, `server/discover`, `tools/list`, `tools/call`, `resources/read`). |
| `GET /r/:id` | Server-rendered shareable scan permalink. |
| `GET /score/:domain` | Canonical per-domain telemetry hub. |
| `GET /badge/:domain.svg` | Live tier-colored SVG badge for READMEs (`[![slop](https://slop-detect.com/badge/example.com.svg)](https://slop-detect.com/score/example.com)`). |
| `GET /og/:id.png` | 1200×630 PNG social card for a stored scan result. |
| `POST /api/watch` | Subscribe a domain to continuity regression & `DESIGN.md` drift monitoring (double opt-in). |
| `GET /api/health` | Live readiness probe reporting engine version, `definitionsVersion`, and KV health. |
