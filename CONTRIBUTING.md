# Contributing to slop-detect

Thanks for considering a contribution. The whole project is ~2,000 lines of JavaScript — small enough that you can read all of it in one sitting before you start.

## TL;DR

1. Fork → branch → PR.
2. New patterns and fix-recipe improvements are the most welcome contributions.
3. CI runs `node --check` on every PR; please don't break the syntax.
4. Be kind in issues and PRs. The code we're auditing was written by people too.

## Setup

```bash
git clone https://github.com/<you>/slop-detect.git
cd slop-detect
npm install              # installs all 4 workspaces
npm run demo             # smoke test: scans 3 known sites
```

If `npm install` fails building `sharp` (a transitive native dep of
`wrangler` → `miniflare`, pulled in only by the web workspace) on a very new
Node, install with lifecycle scripts skipped:

```bash
npm install --ignore-scripts   # links workspaces; tests, lint, CLI all work
```

That's enough for everything except `npm run web:dev` (the local Cloudflare
Pages server), which wants the full `wrangler` install on a Node LTS where
sharp's prebuilt binary resolves.

You need:

- Node 20+ (Node LTS recommended for the web workspace)
- A Cloudflare account if you want to run the web app locally with real scans (Browser Rendering requires Workers Paid; ~$5/mo)

For pure pattern development you don't need Cloudflare — the CLI runs everything locally with Playwright.

## Repository layout

```
packages/
├── core/    slop-detect-core   ← rule definitions, scoring, fix recipes
├── cli/     slop-detect    ← Playwright runner
└── web/     slop-detect-web    ← Cloudflare Pages app for slop-detect.com
```

When you change a rule in `packages/core/src/patterns.js`, both the CLI and the web app pick it up automatically — they're consumers of the same `slop-detect-core` package via workspace symlinks.

## Proposing a new pattern (#17, #18, ...)

The bar for adding a new pattern is high but not impossible. Convince us with **evidence at scale**:

1. **Find the pattern in the wild.** Show 10+ real landing pages where it appears.
2. **Confirm AI-tooling correlation.** It must be over-represented in AI-generated pages (Cursor, v0, Lovable, Bolt, GPT image-to-code) versus human-designed ones.
3. **Write a deterministic detector.** `extract(ctx)` runs in the page's DOM; `detect(signals)` returns true/false. Avoid heuristics that depend on screenshots, ML, or wall-clock timing.
4. **Assign a weight (1–8).** Justify it relative to the existing 16. Weight 8 is reserved for slam-dunk signals like Inter-font usage and indigo-600 CTAs.
5. **Write a fix recipe.** Add a `FIXES` entry in `packages/core/src/fixes.js` with: problem, fix, alternatives, hard rule.

Open an issue first using the **New Pattern** template before writing code. We'd rather discuss it before you spend an evening on a detector we can't accept.

### The low-friction path: declarative rules

For patterns that boil down to *"find N elements whose computed style / text
matches X"*, you don't need to hand-write a browser function. Describe the rule
declaratively and `compileRule()` turns it into a real pattern — selector-scoped,
self-contained, and injectable by both runners. This is the eslint/semgrep
playbook: lower the cost of a rule and the ruleset stays current.

A declarative rule:

```js
import { compileRule } from 'slop-detect-core';

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

The **copy axis** lives in `packages/core/src/copyPatterns.js`. Unlike design
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

- ES modules (`type: "module"` everywhere)
- Two-space indentation, single quotes, no semicolons-at-ends-of-IIFEs flair
- Keep files small. `core` is the source of truth — don't add runtime-specific logic there

## Testing your changes

```bash
# 1) Lint (syntax check)
npm run lint

# 2) Unit tests (copy axis + scoring — pure, no browser)
npm test

# 3) Run the CLI against a known-bad and known-good URL
npm run scan -- https://www.aura.build              # should be Heavy
npm run scan -- https://news.ycombinator.com         # should be Clean
npm run scan -- https://example.com --copy           # design + copy axes

# 4) Run the web app locally (won't actually scan without Cloudflare):
npm run web:dev
```

## Pull request checklist

- [ ] `npm run lint` passes
- [ ] You ran the CLI against ≥2 URLs and confirmed your change behaves as expected
- [ ] If you added a pattern: ≥10 real-world examples in the PR description
- [ ] If you changed a fix recipe: a before/after comparison of the generated prompt
- [ ] README / pattern table updated if the public surface changed

## Reporting bugs

Use the **Bug Report** issue template. Include:

- URL you scanned
- Full JSON output from `slop-detect <url> --json`
- What you expected
- What you got

## Code of conduct

Be kind. The web we're building tools for is built by humans, and the AI-generated sites we audit are usually first-time builders shipping their first product. Roast the patterns, never the people.

## License

By contributing, you agree your work is released under the [MIT License](LICENSE).
