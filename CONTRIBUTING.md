# Contributing to slop-detect

Thanks for considering a contribution. The whole detection engine is small enough that you can read all of it in one sitting before you start.

## TL;DR

1. Fork → branch → PR.
2. New patterns and fix-recipe improvements are the most welcome contributions.
3. Run `bun run format:check`, `bun run typecheck`, and `bun run test` before pushing — CI runs the same.
4. Be kind in issues and PRs. The code we're auditing was written by people too.

## Setup

```bash
git clone https://github.com/<you>/slop-detect.git
cd slop-detect
bun install              # installs all workspaces (packages/*, apps/*, examples/*)
bun run --filter slop-detect demo   # smoke test: scans 3 known sites
```

You need:

- [Bun 1.3+](https://bun.sh) — package manager + script runner
- Node 20+ — runtime for the CLI's Playwright runner and the built bins
- A Cloudflare account if you want to run the web app locally with real scans (Browser Rendering requires Workers Paid; ~$5/mo)

For pure pattern development you don't need Cloudflare — the CLI runs everything locally with Playwright.

## Repository layout

```
packages/
├── core/                            ← rule definitions, 5-axis scoring, fix recipes (workspace @slop-detect/core -> npm: slop-detect-core)
├── cli/                             ← Playwright runner, static HTML scanner, SARIF/JUnit/agent reporters (npm: slop-detect)
├── mcp/                             ← MCP server for AI coding agents (npm: slop-detect-mcp)
├── action/                          ← Composite GitHub Action (api + local Chromium + SARIF)
├── netlify-plugin-slop-detect/      ← Netlify onPostBuild deploy gate
└── lighthouse-plugin-slop-copy/     ← Lighthouse copy + HTML AEO plugin

apps/
├── web/                             ← Cloudflare Pages app, REST API (/api/*) & remote MCP (/mcp)

docs/                                ← Developer guides, generator/builder recipes & ops runbooks
examples/                            ← Astro 5 & Next.js 15 reference integrations
schemas/                             ← JSON Schema v1 (scan-result.v1.json)
spec/                                ← Versioned pattern, copy, system, AEO & conformance specs
```

When you change a rule in `packages/core/src/patterns.ts` or `packages/core/src/copyPatterns.ts`, the CLI, MCP server, GitHub Action, and web app pick it up automatically — they all consume `@slop-detect/core` via `workspace:*`.

## Proposing a new pattern

New rules (and changes that broaden what an existing rule fires on) follow **Calibration Protocol v2** ([`CALIBRATION.md`](CALIBRATION.md)):

1. **Find the pattern in the wild.** Show 5+ real landing pages where it appears and confirm it is over-represented in default-template pages compared with bespoke human-designed pages.
2. **Write a deterministic detector.** `extract(ctx)` runs in the page's DOM; `detect(signals)` returns `true`/`false`. Avoid heuristics that depend on screenshots, ML, or wall-clock timing.
3. **Enter at `weight: 0, status: 'review'` (`rule:weight-0`).** Every new rule ships at weight `0` first so it collects evidence in scan output without altering any site's score or tier. To graduate to a positive weight (`1–8`, `status: 'active'`), it must pass the **K-04 Promotion Gate** on the locked 30% held-out calibration split ($\text{LR}_+ \ge 3.0$, Clopper–Pearson 95% CI, and zero regressions on `packages/core/test/pioneers.test.js`).
4. **Write a fix recipe.** Add a `FIXES` entry in `packages/core/src/fixes.ts` with: `problem`, `fix`, `alternatives`, and `rule` (following [K-06](https://github.com/ravidsrk/slop-detect/issues/301): describe default-template pattern overlap, never claim a page is "AI-generated").
5. **Update the normative spec.** Add the rule to [`spec/patterns.md`](spec/patterns.md) or [`spec/copy-axis.md`](spec/copy-axis.md) (and run `node scripts/export-vale.mjs` if adding a regex-expressible copy rule).

Open an issue first using the [**New Pattern**](.github/ISSUE_TEMPLATE/new_pattern.md) template before writing code.

### The low-friction path: declarative rules

For patterns that boil down to *"find N elements whose computed style / text
matches X"*, you don't need to hand-write a browser function. Describe the rule
declaratively and `compileRule()` turns it into a real pattern — selector-scoped,
self-contained, and injectable by both runners. This is the eslint/semgrep
playbook: lower the cost of a rule and the ruleset stays current.

A declarative rule:

```js
import { compileRule } from '@slop-detect/core';

const pattern = compileRule({
  id: 'all_caps_labels',          // lowercase snake_case, unique
  label: 'All-caps section labels (text-transform:uppercase)',
  short: 'All-caps',
  category: 'fonts',              // fonts | colors | layout | css | images | copy
  weight: 3,                      // 0–40; how much slop it contributes
  author: 'your-handle',          // attribution, surfaced in metadata
  since: '2026.07',
  detect: {
    // Optional scope. Default = the visible-element set the runner computed.
    // scope: { selector: 'header *' }  or  { heroOnly: true }
    when: [
      { style: 'textTransform', equals: 'uppercase' },
      { style: 'letterSpacing', gte: 0.5 },            // numeric: gte / lte
      { text: { minLen: 3, maxLen: 40 } }              // text length / regex
    ],
    trigger: { minCount: 2 }       // or { minRatio: 0.6 }
  }
});
```

Supported `when` conditions:

| Shape | Matches when |
|---|---|
| `{ style, equals }` | `getComputedStyle(el)[style] === equals` |
| `{ style, includes }` | computed value contains the substring |
| `{ style, matches, flags }` | computed value matches the regex |
| `{ style, oneOf: [...] }` | computed value is in the list |
| `{ style, gte, lte }` | `parseFloat` of the value is in range |
| `{ text: { minLen, maxLen, matches, notMatches } }` | element text constraints |
| `{ semantic: 'purple'｜'dark'｜'midGrey'｜'slopFont', style? }` | uses the engine's colour/font helpers |

`trigger` fires on `minCount` (absolute) and/or `minRatio` (matched ÷ scoped).
Validate before you compile with `validateRule(rule)` — it returns an array of
problems (empty = valid). Imperative `extract(ctx)` patterns are still fully
supported for anything too gnarly for the declarative form; `compileRules()`
accepts a mixed list.

## Proposing a copy-slop pattern (the text axis)

The **copy axis** lives in `packages/core/src/copyPatterns.ts`. Unlike design
patterns, copy patterns are *pure text analysis* — they run in Node/Worker on the
already-extracted page text, so **no browser, no serialization, fully
unit-testable**. A copy pattern is:

```js
{
  id: 'my_copy_tell',
  label: '…', short: '…',
  axis: 'copy', category: 'copy', weight: 5,   // 0–40
  match: ({ text, headings, paragraphs, wordCount }) => {
    // …count occurrences, compute density…
    return { total, density, samples, triggered: /* boolean */ };
  }
}
```

Calibration rule: **fire on density, not single occurrences.** One em-dash is
fine; one per 40 words is a machine. Tune thresholds so hand-written copy
(Stripe/Linear/Notion) stays Clean while GPT-default prose lights up. Add a `FIXES`
entry and an evidence formatter, then cover it in `packages/core/test/copy.test.js`.

## Improving a fix recipe

If a fix recipe is too generic, contradicts itself, or recommends a substitute that itself reads as slop — fix it. PRs that sharpen existing recipes are some of the most valuable contributions because they directly improve the LLM output users get.

Each recipe should follow the four-field structure:

- `problem` — *why* this reads as AI-slop, with the specific tell
- `fix` — the senior designer's prescription
- `alternatives` — 3–5 concrete directions with brand references (Linear, Stripe, PostHog, Cabin, etc.)
- `rule` — a hard, testable constraint

Avoid:

- Vague guidance ("use better typography", "make it more original")
- Substituting one banned pattern for another (Inter → Geist is not progress)
- Naming products as alternatives that became slop themselves

## Code style

- TypeScript across all `packages/*` source; ES modules (`type: "module"` everywhere)
- Two-space indentation, single quotes, no semicolons-at-ends-of-IIFEs flair
- Keep files small. `core` is the source of truth — don't add runtime-specific logic there
- New publishable packages bundle with tsup (dual ESM + CJS), test with vitest, and
  follow the composite-tsconfig + per-package `vitest.config.ts` template used by
  `packages/core`. See `packages/core/package.json` as the reference shape.

## Testing your changes

```bash
# 1) Format + typecheck
bun run format:check   # or `bun run format` to auto-fix
bun run typecheck      # turbo across every package

# 2) Build + test (turbo handles dependency order)
bun run build          # tsup across the publishable libs
bun run test           # vitest, every package

# 3) Run the CLI against a known-bad and known-good URL
bun run --filter slop-detect scan https://www.aura.build         # should be Heavy
bun run --filter slop-detect scan https://news.ycombinator.com   # should be Clean
bun run --filter slop-detect scan https://example.com -- --copy  # design + copy axes

# 4) Run the web app locally (scans work; first scan downloads a browser):
bun run web:dev
```

## Pull request checklist

- [ ] `bun run format:check`, `bun run typecheck`, `bun run test` all pass
- [ ] You ran the CLI against ≥2 URLs and confirmed your change behaves as expected
- [ ] If you added a pattern: ≥10 real-world examples in the PR description AND `spec/patterns.md` updated
- [ ] If you changed a fix recipe: a before/after comparison of the generated prompt
- [ ] README / pattern table updated if the public surface changed

## Releasing

Publish path is **tag-gated** `.github/workflows/publish.yml`, not `changeset publish`.

1. Land version bumps on `main` (changesets may draft them; the three publishable packages are a **fixed** group so they cannot drift).
2. Confirm `packages/{core,cli,mcp}/package.json` versions are identical and CHANGELOG is updated.
3. Cut `vX.Y.Z` matching that version. The workflow publishes `slop-detect-core` (the `@slop-detect/core` workspace, renamed by its `prepack`; the scoped name is never published) → `slop-detect` → `slop-detect-mcp` and fails if `NPM_TOKEN` is missing or a package version does not match the tag.

Do not run `bun run release` — it exits non-zero on purpose.

## Reporting bugs

Use the **Bug Report** issue template. Include:

- URL you scanned
- Full JSON output from `slop-detect <url> --json`
- What you expected
- What you got

## Code of conduct

Be kind. The web we're building tools for is built by humans, and the sites we audit are usually first-time builders shipping their first product. Roast the patterns, never the people.

## License

By contributing, you agree your work is released under the [MIT License](LICENSE).
