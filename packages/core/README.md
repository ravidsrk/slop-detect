# slop-detect-core

> Pure four-axis detection engine for AI-design-slop patterns, LLM copy tells, `DESIGN.md` system compliance, and AEO crawler readiness. Runtime-agnostic — runs in Node, Cloudflare Workers, or the browser.

This is the heart of [`slop-detect`](https://github.com/ravidsrk/slop-detect). It exports the rule definitions (45 design patterns, 26 copy patterns, 16 AEO checks, 9 `DESIGN.md` checks, and 11 craft-floor checks as of `definitions@2026.11`), the scoring functions, remediation prompt builder, and the DOM-side page evaluation script — without ever touching a browser directly. You bring the runner; this package brings the rules. Weight 0 review rules add no points. Craft never feeds Clean / Mild / Heavy. The npm package version stays 0.8.0.

> **Package name:** published to npm as **`slop-detect-core`**. Inside this monorepo the workspace is named `@slop-detect/core`; that scoped name is not published to npm.

## Install

```bash
npm install slop-detect-core
```

## Usage

```ts
import { PATTERNS, buildPageEvaluateScript, assembleScanResult } from 'slop-detect-core';

// 1) Drive your runner (Playwright / Puppeteer / Cloudflare Browser Rendering)
//    to execute the page-eval script in the target page's DOM. The copy-axis
//    text context is always extracted; `includeSystem` adds the DESIGN.md pass.
const script = buildPageEvaluateScript(PATTERNS, { includeSystem: true });
const raw = await page.evaluate(script);

// 2) Assemble the scored scan result (design + optional copy axis, grade, verdict):
const result = assembleScanResult(raw, {
  url: 'https://example.com',
  finalUrl: page.url(),
  axes: ['design', 'copy'],
  patterns: PATTERNS,
});

if (result.blocked) console.log(`Not scored: ${result.error}`);
else console.log(`${result.score}/100 — ${result.tier} (${result.grade})`);
```

## Exports

| Export | Purpose |
|---|---|
| `DEFINITIONS_VERSION` | Current versioned ruleset string (`"2026.11"`) |
| `PATTERNS` | Design rule definitions (`{ id, label, short, category, weight, status, extract }`). Length is the live catalogue. |
| `COPY_PATTERNS` | Prose/copy rule definitions (`{ id, label, short, weight, status, match }`). Length is the live catalogue. |
| `AEO_CHECKS` | Answer Engine Optimization checks. Current ids include `html.reachable`, `edge.access`, `robots.searchAllowed`, `html.indexable`, `ai.previewControls`, `html.serverTextCoverage`, `md.twin`, `html.linkAlternate`, `site.llmsTxt`, `html.vary`. |
| `CRAFT_CHECKS` / `scoreCraft` | Craft-floor checks. They never feed `combineAxes`. |
| `scorePatterns(patternResults)` | Pure design-axis scorer returning `{ score, tier, grade, verdict, patternsFlagged, patternsTotal, definitionsVersion }` (filter with `applyPreset` first for a preset) |
| `scoreCopy(textContext)` | Pure copy-axis scorer returning `{ axis, score, tier, grade, patternsFlagged, patternsTotal, wordCount, thin, patterns }` |
| `combineAxes(axesMap)` | Combines design + copy axes into `{ unifiedScore, unifiedTier, unifiedGrade, axesScored, dirtyAxes }` |
| `runAeoChecks(url, opts?)` / `scoreAeo(url, opts?)` | **Async, performs network fetches** (`opts.fetchImpl`, `userAgent`, `timeoutMs`, `isUrlAllowed`). Resolves to `{ axis, url, mdUrl, score, maxScore, ratio, tier, requiredFailed, recommendedFailed, passed, failed, checks, durationMs }`; each check is `{ id, label, severity, weight, passed, message }` |
| `parseDesignMd(markdown)` | Parses a Google Labs `DESIGN.md` specification into normalized tokens (or `null`) |
| `scoreSystemCompliance(parsed, observed)` / `checkDesignSystem(...)` | Scores the observed `systemContext` from the page-eval script against `parseDesignMd()` output (`Aligned` / `Drifting` / `Off-system`) |
| `generateDesignMd(observed, opts?)` | Bootstraps a `DESIGN.md` from an observed `systemContext` (every observed CTA fill, heading colour, font and radius is kept) |
| `PRESETS` / `getPatterns(preset)` / `applyPreset(patterns, preset)` | Named pattern subsets (`full`, `strict`, `marketing`, `minimal`); `getPatterns('strict')` filters the built-in `PATTERNS` |
| `compileRule(rule)` / `validateRule(rule)` | Declarative JSON/object rule compiler and validator |
| `FIXES` / `buildFixPrompt(scanResult)` | Per-pattern remediation recipes and markdown fix-prompt generator |
| `scoreToGrade(score)` / `buildVerdict(score, tier, triggered?)` | Letter grade (`A+` to `F`) and human-readable one-line verdict |
| `buildPageEvaluateScript(patterns?, opts?)` | Builds the self-contained browser evaluation script for `patterns` (default: all); `opts.includeSystem` adds the `DESIGN.md` observation pass. Also accepts the `buildPageScript(opts)` form |
| `assembleScanResult(raw, opts?)` | Scores the `page.evaluate` payload: `opts.url`, `finalUrl`, `axes` (`['design']` default, `['design','copy']`, `'all'`), `patterns` subset, `preset`. Returns the design summary + `patterns`, `patternsErrored`, and with copy: `axes` + `unifiedScore/Tier/Grade`. Bot walls / empty renders return `{ blocked: true, score: null, code, error, hint }` |
| `assemblePatternResults(signals)` / `detectBlocked(raw)` | Lower-level building blocks used by the reference runners |
| `createColorHelpers()` / `createVisibilityHelpers()` | Color & DOM visibility predicates used inside `extract(ctx)` |
| `isSlopFont` / `isAccentSerif` | Font-family classifiers |

## Tiers & Polarity

- **Design axis** (lower is better): `Clean` (0 to 9) · `Mild` (10 to 27) · `Heavy` (28 or more)
- **Copy axis** (lower is better): `Clean` (0 to 7) · `Mild` (8 to 19) · `Heavy` (20 or more)
- **System axis (`DESIGN.md`)** (higher is better): `Aligned` (80 to 100) · `Drifting` (50 to 79) · `Off-system` (below 50)
- **AEO axis** (higher is better): `Eligible` (80 to 100) · `Partially Eligible` (50 to 79) · `Restricted` (below 50)
- **Craft floor** (separate): never changes design, copy, or Clean / Mild / Heavy

## Reference runners

- Node + Playwright: [`slop-detect`](https://www.npmjs.com/package/slop-detect)
- Model Context Protocol server: [`slop-detect-mcp`](https://www.npmjs.com/package/slop-detect-mcp)
- Cloudflare Workers + Browser Rendering: see [`apps/web/functions/api/scan.ts`](https://github.com/ravidsrk/slop-detect/blob/main/apps/web/functions/api/scan.ts)

## License

MIT
