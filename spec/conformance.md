# Conformance

What producers (site owners, CI pipelines, downstream linters) should expect from slop-detect scores and gates.

## Design axis tiers

Score = sum of triggered design-pattern weights (27 patterns, clamped 0–100).

### Clean (0–9)

- Few or no AI-design-slop tells detected
- Letter grades A+ through A−
- Typical of deliberately designed pages (Stripe, Linear, Notion calibrate here)
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

Score = sum of triggered copy-pattern weights (9 patterns, clamped 0–100). Independent of design tiers.

| Tier | Range | Producer expectation |
|------|-------|----------------------|
| Clean | 0–7 | Prose reads human-edited; low buzzword/dash density |
| Mild | 8–19 | Noticeable LLM prose tells |
| Heavy | 20+ | Copy reads generated; multiple density patterns firing |

When copy scanning is disabled (CLI default), only the design axis is reported.

## Unified tier (design + copy)

When both axes run, `unifiedTier` uses **design band thresholds** (0–9 / 10–27 / 28+) applied to `unifiedScore` from `combineAxes()`. Producers using `--copy` should gate on `unifiedTier`, not design tier alone.

## AEO conformance

AEO polarity is inverted: **higher is better**.

| Tier | Ratio | Passing expectation |
|------|-------|---------------------|
| AI-Ready | ≥ 0.8 (80/100) | All required checks pass; at least one recommended check helps reach 80 |
| Partial | ≥ 0.5 (50/100) | Reachable and mostly crawlable; missing markdown twin or llms.txt |
| Invisible | < 0.5 | Blocked bots, noindex, unreachable, or robots.txt disallow |

**Required fundamentals** (70 points): HTML reachable, GPTBot not blocked, robots.txt allows AI crawlers, page indexable.

**Recommended bonuses** (30 points): markdown twin, Link alternate, `/llms.txt`, `Vary: Accept`.

Passing all required checks alone yields 70/100 → **Partial**, not AI-Ready. Producers targeting citation in AI answers should aim for **AI-Ready** and publish machine-readable twins.

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

Scores are tagged with `definitionsVersion` (currently **2026.09**). When the catalogue changes, re-score pages to distinguish rule drift from site changes.