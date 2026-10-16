# @slop-detect/core

> Pure detection engine for AI-design-slop patterns. Runtime-agnostic — runs in Node, Cloudflare Workers, or the browser.

This is the heart of [`slop-detect`](https://github.com/ravidsrk/slop-detect). It exports the full set of rule definitions (27 design + 9 copy as of `definitions@2026.10`), the scoring function, and the DOM-side helpers — but it never touches a browser. You bring the runner; this package brings the rules.

## Install

```bash
npm install @slop-detect/core
```

## Usage

```js
import { buildPageScript, assemblePatternResults, scorePatterns } from '@slop-detect/core';

// 1) Run every extractor in the page in one round-trip (Playwright /
//    Puppeteer / Cloudflare Browser Rendering all work the same way):
const data = await page.evaluate(buildPageScript());

// 2) Assemble the per-pattern results ({ id, label, weight, triggered,
//    evidence }) from the raw page signals:
const { patterns } = assemblePatternResults(data.signals);

// 3) Score:
const { score, tier, patternsFlagged, patternsTotal } = scorePatterns(patterns);
console.log(`${score}/100 — ${tier}`);
```

## Exports

| Export | Purpose |
|---|---|
| `PATTERNS` | Array of design rule definitions with `{ id, label, short, category, weight, extract }` (27 in `definitions@2026.10`) |
| `buildPageScript(opts?)` | The in-page IIFE that runs every extractor in one `page.evaluate` |
| `assemblePatternResults(signals)` | Raw page signals → `{ patterns, patternsErrored }` |
| `scorePatterns(results)` | Pure scorer returning `{ score, tier, grade, verdict, patternsFlagged, patternsTotal }` |
| `createColorHelpers()` | Builds parsing helpers used inside `extract()` callbacks |
| `createVisibilityHelpers()` | DOM-visibility predicates for in-page work |
| `isSlopFont` / `isAccentSerif` | Font-family classifiers |
| `SLOP_FONT_PREFIXES` / `ACCENT_SERIF_PREFIXES` | Raw font allow/denylists |
| `FIXES` | Per-pattern fix recipes (problem, fix, alternatives, hard rule) |
| `buildFixPrompt(scanResult)` | Generate a markdown prompt for an AI agent |

## Tiers

- Clean: 0 to 9
- Mild: 10 to 27
- Heavy: 28 or more

## Reference runners

- Node + Playwright: [`slop-detect`](https://www.npmjs.com/package/slop-detect)
- Cloudflare Workers + Browser Rendering: see [`apps/web/functions/api/scan.ts`](https://github.com/ravidsrk/slop-detect/blob/main/apps/web/functions/api/scan.ts)

## License

MIT
