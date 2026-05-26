# slop-detect-core

> Pure detection engine for AI-design-slop patterns. Runtime-agnostic — runs in Node, Cloudflare Workers, or the browser.

This is the heart of [`slop-detect`](https://github.com/ravidsrk/slop-detect). It exports the 16 rule definitions, the scoring function, and the DOM-side helpers — but it never touches a browser. You bring the runner; this package brings the rules.

## Install

```bash
npm install slop-detect-core
```

## Usage

```js
import { PATTERNS, scorePatterns } from 'slop-detect-core';

// 1) Drive your runner (Playwright / Puppeteer / Cloudflare browser) to
//    execute each pattern's `extract()` in the page's DOM context:
const signals = {};
for (const p of PATTERNS) {
  signals[p.id] = await page.evaluate(p.extract);   // example: Playwright
}

// 2) Run the pure `detect()` step in your runtime:
const patterns = PATTERNS.map(p => ({
  id:        p.id,
  label:     p.label,
  weight:    p.weight,
  triggered: p.detect(signals[p.id]),
  evidence:  signals[p.id]
}));

// 3) Score:
const { score, tier, patternsFlagged, patternsTotal } = scorePatterns(patterns);
console.log(`${score}/100 — ${tier}`);
```

## Exports

| Export | Purpose |
|---|---|
| `PATTERNS` | Array of 16 rule definitions with `{ id, label, weight, extract, detect }` |
| `scorePatterns(results)` | Pure scorer returning `{ score, tier, patternsFlagged, patternsTotal }` |
| `createColorHelpers()` | Builds parsing helpers used inside `extract()` callbacks |
| `createVisibilityHelpers()` | DOM-visibility predicates for in-page work |
| `isSlopFont` / `isAccentSerif` | Font-family classifiers |
| `SLOP_FONT_PREFIXES` / `ACCENT_SERIF_PREFIXES` | Raw font allow/denylists |
| `FIXES` | Per-pattern fix recipes (problem, fix, alternatives, hard rule) |
| `buildFixPrompt(scanResult)` | Generate a markdown prompt for an AI agent |

## Tiers

- Clean: 0 to 11
- Mild: 12 to 29
- Heavy: 30 or more

## Reference runners

- Node + Playwright: [`slop-detect`](https://www.npmjs.com/package/slop-detect)
- Cloudflare Workers + Browser Rendering: see [`packages/web/functions/api/scan.js`](https://github.com/ravidsrk/slop-detect/blob/main/packages/web/functions/api/scan.js)

## License

MIT
