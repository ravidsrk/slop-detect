# Conformance

What producers (site owners, CI pipelines, downstream linters) should expect from slop-detect scores and gates.

## Design axis tiers

Score = sum of triggered design-pattern weights (45 patterns in the catalogue; weight 0 review and retired rules add nothing; clamped 0–100).

### Clean (0–9)

- Few or no AI-design-slop tells detected
- Letter grades A+ through A−
- Typical of deliberately designed pages (Stripe, Linear, Notion are the calibration targets for this band; flagship calibration is tracked in issue #100)
- CI with `--fail-on heavy` or `--fail-on mild` passes

### Mild (10–27)

- Several template tells present but not overwhelming
- Letter grades B+ through C
- A handful of AI-default choices (fonts, layout blocks, color choices)
- CI with `--fail-on heavy` passes; `--fail-on mild` fails

### Heavy (28+)

- Many patterns firing; page reads as AI-builder default kit
- Letter grades D+ through F
- CI with `--fail-on heavy` or `--fail-on mild` fails

## Copy axis tiers

Score = sum of triggered copy-pattern weights (26 patterns in the catalogue; weight 0 review rules add nothing; clamped 0–100). Independent of design tiers.

| Tier | Range | Producer expectation |
|------|-------|----------------------|
| Clean | 0–7 | Low buzzword and dash density |
| Mild | 8–19 | Several copy tells present |
| Heavy | 20+ | Multiple density patterns firing |

When copy scanning is disabled (CLI default), only the design axis is reported.

## Unified tier (design + copy)

When both axes run, `unifiedTier` uses **design band thresholds** (0–9 / 10–27 / 28+) applied to `unifiedScore` from `combineAxes()`. Producers using `--copy` should gate on `unifiedTier`, not design tier alone.

## AEO conformance

AEO polarity is inverted: **higher is better**.

| Tier | Ratio | Passing expectation |
|------|-------|---------------------|
| Eligible | ≥ 0.8 (80/100) | Required checks pass on the applicable denominator |
| Partially Eligible | ≥ 0.5 (50/100) | Reachable, with gaps in edge access, robots, snippets, or server text |
| Restricted | < 0.5 | Unreachable, blocked at the edge, disallowed, or noindex |

**Required fundamentals** (85 points when all apply): `html.reachable` 10, `edge.access` 20, `robots.searchAllowed` 20, `html.indexable` 12, `ai.previewControls` 8, `html.serverTextCoverage` 15.

**Recommended bonuses** (15 points): markdown twin 6, Link alternate 3, `/llms.txt` 2, `Vary: Accept` 4.

Weight 0 checks (`ai.manipulation`, `agent.operability`, `agent.discovery`, `ai.usagePolicy`, `content.dates`, `jsonld.hygiene`) are reported and excluded from the denominator. Not-applicable and unknown checks are also excluded, so the score is `100 × earned / applicable`, not a fixed 100-point quiz. The scanner user agent is `SlopDetector-AEO/1.0 (+https://slop-detect.com/bot)`. It does not impersonate another crawler.

Passing every required check yields 85/100 when those checks apply → **Eligible**. Publish machine-readable twins to pick up the recommended points.

AEO is run separately via `--aeo` or the API; it does not affect slop tier or `--fail-on` unless integrated by the consumer.

## CLI `--fail-on` (CI gate)

Gates slop tier after a successful scan. Does not apply to AEO unless the consumer adds a separate check.

### Usage

```bash
npx slop-detect https://example.com --fail-on heavy   # fail on Heavy only
npx slop-detect https://example.com --fail-on mild    # fail on Mild or Heavy
```

### Tier ranking

```
Clean = 0, Mild = 1, Heavy = 2
```

A page fails the gate when its effective tier rank is **≥ threshold rank**.

Effective tier selection:

- Design only: `tier`
- Design + copy: `unifiedTier`

### Exit codes

| Code | Meaning |
|------|---------|
| 0 | Scan succeeded; all pages passed the gate (or no `--fail-on` set) |
| 1 | Scan ran but one or more pages failed the `--fail-on` gate |
| 2 | Usage/argument error (invalid flag, missing URL, invalid `--fail-on` value) |

**Always-fail conditions** (regardless of threshold): `error` or `blocked` on any URL counts as gate failure when `--fail-on` is set. The scanner could not produce a tier to evaluate.

Invalid `--fail-on` values (e.g. `bogus`) exit **2** with a clear stderr message — usage errors must not collide with the CI gate signal (exit 1).

### CI recommendation

```yaml
- run: npx -y slop-detect ${{ env.PREVIEW_URL }} --fail-on heavy
```

Use `--fail-on heavy` for permissive gates (block only obvious template pages). Use `--fail-on mild` for stricter quality bars. Combine with `--json` when the pipeline needs structured output:

```bash
npx -y slop-detect "$PREVIEW_URL" --json --fail-on heavy | tee slop.json
echo "exit=$?"
```

JSON mode still exits 1 on gate failure; stderr carries the human gate message only in non-JSON mode.

## Definitions version

Scores are tagged with `definitionsVersion` (currently **2026.11**). When the catalogue changes, re-score pages to distinguish rule drift from site changes. The published leaderboard and calibration notes remain the measured **2026.10** corpus until that re-score exists.

The v1.0 gate is unmet: Heavy false-positive rate ≤2% (95% CI) on at least 1,520 held-out human controls. Do not treat a 2026.11 score as a calibrated v1.0 result. Likelihood ratios in the catalogue are null until measured.