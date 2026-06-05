# Calibrating the detector

The slop score is only credible if we can show it agrees with human judgement.
This is the harness for that — and the honest answer to "what's your accuracy?".

## What's here

- **Deterministic golden fixtures** — `packages/cli/test/fixtures/*.html`, scanned
  in a real headless browser by `packages/cli/test/golden.test.js`. These pin
  detector behavior on a hand-built clean page and a maximal-slop page so a
  refactor or threshold tweak can't silently break detection. They run in CI's
  "Smoke test CLI" job (`RUN_GOLDEN=1`), which has Chromium.
- **A labeled corpus** — `packages/cli/calibration/corpus.json`. Each row has a
  URL, a human-confirmed expected tier (`label`), and provenance. `label: null`
  means "candidate, awaiting review."
- **A runner** — `packages/cli/calibration/run.mjs` (`npm run calibrate`). Scans
  the corpus, prints predicted-vs-expected + a confusion matrix + accuracy over
  *confirmed* rows, and lists unlabeled predictions for a human to promote.

## How to use it

```bash
npm run calibrate                 # scan via the public API (no browser needed)
npm run calibrate -- --local      # scan locally (needs Playwright)
npm run calibrate -- --json cal.json
npm run calibrate -- --check      # CI/regression: exit 1 on a confirmed-label miss
```

## The honest status

This is a **seed**: ~5 confidently-labeled clean pages, 2 sourced "Mild" AI-builder
sites, and a handful of candidates. That is enough to catch gross regressions —
**not** enough to claim a headline accuracy number.

To state a defensible figure (the deep-review gap #8):

1. Grow `corpus.json` to **50–100 URLs** spanning Clean/Mild/Heavy and builders
   (v0, Lovable, Bolt, Framer) plus genuinely-custom premium sites.
2. Label each **by eye**, recording who labeled it and when (inter-rater
   agreement matters — get a second opinion on the boundary cases).
3. Run `npm run calibrate`, read the confusion matrix, and **tune thresholds**
   where the engine and humans disagree — especially the patterns that fire on a
   single occurrence (glassmorphism / colored-glows / gradient-text), which are
   the likeliest false-positive sources.
4. Re-run until accuracy is stable, then publish the number *with* the corpus and
   the definitions version, so it's reproducible.

Until then, describe the score as "a deterministic fingerprint" — not "N% accurate."
