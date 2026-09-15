# Calibrating the detector

The slop score is only credible if we can show it agrees with human judgement.
This is the harness for that — and the honest answer to "what's your accuracy?".

## What's here

- **Deterministic golden fixtures** — `packages/cli/test/fixtures/*.html`, scanned
  in a real headless browser by `packages/cli/test/golden.test.js` (whole-page
  behavior) and `packages/cli/test/pattern-coverage.test.js` (one positive
  fixture per pattern ID, gh-92). These pin detector behavior so a refactor or
  threshold tweak can't silently break detection. They run in CI's
  "Smoke test CLI" job (`RUN_GOLDEN=1`), which has Chromium.
- **A labeled corpus** — `packages/cli/calibration/corpus.json`. Each row has a
  URL, a human-confirmed expected tier (`label`), and provenance. `label: null`
  means "candidate, awaiting review."
- **A runner** — `packages/cli/calibration/run.mjs` (`bun run calibrate`). Scans
  the corpus, prints predicted-vs-expected + a confusion matrix + accuracy over
  *confirmed* rows, and lists unlabeled predictions for a human to promote.

## How to use it

```bash
bun run calibrate                 # scan via the public API (no browser needed)
bun run calibrate -- --local      # scan locally (needs Playwright)
bun run calibrate -- --json cal.json
bun run calibrate -- --check      # CI/regression: exit 1 on a confirmed-label miss
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
3. Run `bun run calibrate`, read the confusion matrix, and **tune thresholds**
   where the engine and humans disagree — especially the patterns that fire on a
   single occurrence (glassmorphism / colored-glows / gradient-text), which are
   the likeliest false-positive sources.
4. Re-run until accuracy is stable, then publish the number *with* the corpus and
   the definitions version, so it's reproducible.

Until then, describe the score as "a deterministic fingerprint" — not "N% accurate."

## Findings — 2026-06-05 (first real evidence)

Scanning recognizable sites for the `/leaderboard` instrument produced the first
hard evidence, captured per-pattern from the live API and recorded in
`packages/cli/calibration/corpus.json`. **The detector over-flags premium,
hand-crafted sites** — the exact opposite of what it should do:

| Site | Should be | Detector said | Why (patterns that fired) |
|---|---|---|---|
| Linear | Clean | **Heavy (36)** | slop_fonts·8 (Inter), eyebrow_pill·5 ("Sign up" CTA), perma_dark·4, centered_hero·4, gradient_backgrounds·4, icon_card_grid·4, numbered_steps·3, nested_cards·4 |
| Vercel | Clean | **Heavy (29)** | slop_fonts·8 (Geist), eyebrow_pill·5 ("Events" nav), centered_hero·4, crushed_tracking·5, icon_card_grid·4, numbered_steps·3 |
| Stripe | Clean | **Mild (23)** | purple_accent·8 (brand blurple #533afd), gradient_backgrounds·4, glassmorphism·4 (single el), icon_card_grid·4, stat_banner·3 |
| Supabase | Clean | Clean (8) ✓ | gradient_backgrounds·4 (**37 elements!**), icon_card_grid·4 — fired but stayed under threshold |

### Three classes of over-fire

1. **Already fixed (pending deploy).** `hero_eyebrow_pill` was counting CTA/nav
   buttons ("Sign up", "Events"); `glassmorphism` fired on a *single* element.
   The merged calibration (eyebrow needs a keyword; glass needs ≥2) removes these
   → Linear −5, Vercel −5, Stripe −4. Verified by the golden tests.

2. **Weak "modern-SaaS" signals firing in a cluster (the real debt).**
   `gradient_backgrounds` no longer discriminates **anything** — clean Supabase
   has 37 of them. `icon_card_grid`, `numbered_steps`, `stat_banner`,
   `centered_hero`, `perma_dark_mode`, `nested_cards` are common to *every* modern
   marketing site, slop or not. Each is only 3–4 pts, but together they bury a
   bespoke site. **Hypotheses to test against a labeled set (do NOT blind-tune):**
   down-weight these structural patterns, and/or only count them when a *strong*
   tell (slop_fonts / purple / gradient_text / gradient_avatars) also fires
   (corroboration), and/or drop `gradient_backgrounds` as a standalone signal.

3. **The philosophical tells (your call).** `slop_fonts`·8 fires on Linear (Inter)
   and Vercel (Geist — their *own* font); `purple_accent`·8 on Stripe's iconic,
   pre-AI blurple. These are real "AI-default" choices *and* legitimate brand
   choices. Whether to keep penalizing them, lower their weight, or require
   corroboration is a product-positioning decision, not a code one.

### Why this isn't fixed in code yet (deliberately)

Re-weighting six patterns off four data points is overfitting — the exact trap
this file warns about. The fix is to **expand the corpus to 50–100 labeled URLs,
run `bun run calibrate`, and tune class-2/3 patterns until the premium-custom set
clears**, with the golden fixtures guarding that real slop still scores Heavy.
The evidence and labels above are the starting point; the tuning is the next
session's work, ideally with a second pair of eyes on the boundary labels.

## Findings — 2026-09-15 (harness repaired, seed re-run)

The harness itself was broken: `bun run calibrate` shelled to
`node --import tsx` but `tsx` was never a dependency, and
`calibrate.yml` ran bare `node` against a `.ts` import — both paths failed
before scanning anything. Fixed (T-19c) by running the runner under `bun`,
which resolves the source import natively; no new dependency.

Re-ran the unchanged 13-row seed locally (`--local`, engine 2026.09):

| Site | Should be | Detector said (June → Sept) |
|---|---|---|
| news.ycombinator.com | Clean | Clean ✓ → Clean (6) ✓ |
| example.com | Clean | (not scanned in June) → **null (blocked: empty_page)** ✗ |
| motherfuckingwebsite.com | Clean | Clean ✓ → Clean (0) ✓ |
| berkshirehathaway.com | Clean | Clean ✓ → Clean (3) ✓ |
| gnu.org | Clean | (not scanned in June) → Mild (10) ✗ |
| supabase.com | Clean | Clean (8) ✓ → **Mild (20)** ✗ |
| bolt.new | Mild | Mild ✓ → Heavy (31) ✗ |
| aura.build | Mild | Heavy (30) ✗ → Mild (25) ✓ |
| v0.dev | Mild | Mild (17) ✓ → Mild (17) ✓ |
| lovable.dev | Clean | Clean (9) ✓ → **Mild (15)** ✗ |
| stripe.com | Clean | Mild (23) ✗ → Mild (19) ✗ |
| linear.app | Clean | Heavy (36) ✗ → Mild (19) ✗ |
| vercel.com | Clean | Heavy (29) ✗ → Mild (17) ✗ |

**5/13 (38.5%)**, confusion Clean→{Clean 3, Mild 6}, Mild→{Mild 2, Heavy 1}.
No Heavy labels exist in the seed — another reason the number is not a claim.

What moved since June, and why:

1. **Genuine fixes pulled the premium sites down.** Linear 36→19 and Vercel
   29→17 reflect the shipped eyebrow-pill keyword requirement, the
   glassmorphism ≥2 threshold, and the centered_hero geometry fix (T-17).
   They still read Mild on the class-2 structural cluster — the debt the
   June section names, still correctly unfixed without a bigger corpus.
2. **Two regressions need eyes during H-05 labeling.** Supabase 8→20 and
   Lovable 9→15 crossed Clean→Mild. Nine patterns were added since June
   (17–27); the added weight lands on real pages too. Whether the new
   fires are true tells or over-fires is a label-then-tune question, not a
   revert question — but the re-run caught it, which is the point of the
   harness.
3. **example.com exposes a harness semantic, not a detector bug.** The page
   is too thin to judge (title + H1, 4 visible elements), so the detector
   honestly abstains (`empty_page`, score null) — and the harness counts
   the abstention as a MISS. Kept as-is deliberately: silently excluding
   abstentions would flatter accuracy. A human relabeling pass (H-05) may
   drop thin pages from the corpus instead.

No thresholds were touched: tuning off 13 rows is still overfitting. The
corpus grows to 50–100 human labels + second rater under H-05 (gh-99,
launch-gating); this run is the pre-growth baseline it will be judged
against. Corpus `definitionsVersion` stays 2026.08 until those labels land.

