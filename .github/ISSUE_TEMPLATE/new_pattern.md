---
name: Propose a new pattern
about: Suggest a 17th (or 18th, ...) AI-design-slop pattern
title: '[pattern] '
labels: new-pattern
---

## The pattern

<!-- One sentence: what's the visual element? -->

## Why it reads as AI-slop

<!-- What's the tell? Specific Tailwind class, CSS property, design choice... -->

## Evidence at scale

<!-- The bar is 10+ real landing pages where this appears. Paste URLs: -->

1. https://...
2. https://...
3. https://...
4. https://...
5. https://...
(and so on)

## AI-tooling correlation

<!-- Why is this AI-generated rather than just "common"? Show 3+ AI-generated pages
     with it and 3+ human-designed pages without it, or vice versa. -->

## Proposed detector

<!-- Pseudocode or actual `extract()` + `detect()` JavaScript -->

```js
extract(ctx) {
  // runs in the page's DOM context
  // return signals
},
detect(signals) {
  // pure function deciding triggered: true/false
}
```

## Proposed weight (1–8)

<!-- Justify relative to existing patterns. Weight 8 is for slam-dunks like Inter font.
     Most new patterns should land at 3–5. -->

## Proposed fix recipe

```
problem: <why this reads as AI-slop>
fix:     <senior designer's prescription>
alternatives:
   - <option 1 with brand reference>
   - <option 2>
   - <option 3>
rule:    <hard testable constraint>
```
