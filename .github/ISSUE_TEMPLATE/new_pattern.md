---
name: New Pattern or Rule Proposal (K-04)
about: Propose a new design, copy, craft, DESIGN.md, or AEO rule (enters at weight 0 under K-04)
title: '[Rule]: '
labels: ['roadmap:v4', 'rule:weight-0', 'evidence:hypothesis']
---

## Summary & Rule ID

- **Proposed ID:** `snake_case_id`
- **Axis:** `design` | `copy` | `craft` | `system` | `aeo`
- **Initial Weight:** `weight: 0` (`status: 'review'` — required by [K-04 (#299)](https://github.com/ravidsrk/slop-detect/issues/299) for all new rules and broadened matchers)
- **Proposed Target Weight (after held-out validation):**

## Deterministic Detection Specification

- **DOM / Computed Style / Prose Signal:**
- **False-Positive Exclusions (e.g. code blocks, quotes, declared `DESIGN.md` waivers):**

## Evidence Grade

- [ ] `evidence:measured` — Lift measured on our own held-out calibration corpus (`LR >= 3.0`)
- [ ] `evidence:standard` — Grounded in a W3C / RFC / vendor crawler specification
- [ ] `evidence:practitioner` — Documented in verified practitioner studies or model prompt guides
- [ ] `evidence:hypothesis` — Plausible signal awaiting held-out calibration measurement

## K-04 Promotion Gate Checklist (Required Before Raising Weight > 0)

- [ ] **Held-out Likelihood Ratio (LR):** `LR >= 3.0` on the locked held-out calibration split (`K-01`)
- [ ] **95% Confidence Interval (Clopper-Pearson):** Lower bound documented (`[lower, upper]`)
- [ ] **Pre-2022 Human Control FPR:** False-positive rate on pre-2022 human controls recorded
- [ ] **Heavy FPR Delta:** `deltaHeavyFpr <= 0` (does not increase Heavy tier false-positive rate)
- [ ] **Pioneer Regression Suite (`K-05`):** Zero Heavy regressions across the pioneer snapshot suite
- [ ] **Harm-Avoiding Language (`K-06`):** Rule label and fix recipe describe default-template patterns or defects — never claims a page is "AI-generated"
