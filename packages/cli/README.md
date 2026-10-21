# slop-detect

> Score any landing page against the versioned fingerprint (`definitions@2026.11`), from your terminal or CI pipeline.

Playwright-based, deterministic, zero-config. Audits visual design slop (45 CSS/DOM rules), copy tells (26 prose rules), `DESIGN.md` token compliance, a craft floor that never feeds Clean / Mild / Heavy, and Answer Engine Optimization (16 AEO checks). Weight 0 review rules add no points. Package version stays 0.8.0.

## Install

```bash
# One-off
npx slop-detect https://your-site.com

# Or install globally
npm install -g slop-detect
slop-detect https://your-site.com
```

Chromium is installed lazily on the first local scan (~150 MB via Playwright), not at `npm install`. Set `SKIP_PLAYWRIGHT_DOWNLOAD=1` to skip that download when Playwright's Chromium is already installed (it does not select a system Chrome/Safari binary). `--remote` scans via the hosted API and needs no local Chromium.

## Usage

```bash
slop-detect <url>                       # scan one URL (design axis)
slop-detect <url1> <url2> <url3>        # scan many, print a comparison table
slop-detect <url> --copy                # score design + copy axes (unified score)
slop-detect <url> --craft               # also score the craft floor (never feeds Clean/Mild/Heavy)
slop-detect <url> --axes design,copy    # explicit axis list (or --axes all)
slop-detect <url> --aeo                 # run the AEO fetch-and-read audit
slop-detect <url> --design-md auto      # check compliance against <origin>/DESIGN.md
slop-detect <url> --design-md ./DESIGN.md  # check compliance against a local DESIGN.md
slop-detect <url> --init-tokens > tokens.json  # DTCG tokens.json from the live DOM
slop-detect --lint-design-md ./DESIGN.md       # static lint, no browser, exit 1 on errors
slop-detect --diff-design-md base.md head.md   # exit 1 when a token is removed or changed
slop-detect <url> --a11y                       # optional axe-core report; never changes a score
slop-detect <url> --preset strict       # preset: full | strict | marketing | minimal
slop-detect <url> --remote              # scan via https://slop-detect.com/api/scan (no browser)
slop-detect <url> --fail-on heavy       # exit non-zero on heavy (or mild) tier for CI
slop-detect <url> --json                # machine-readable JSON output
slop-detect result.json --format agent # one line per finding; also github, junit, gitlab, sarif
slop-detect --brief result.json        # avoid list, at most 120 words; --fix-prompt stays the long prompt
slop-detect --diff-scan before.json after.json
slop-detect --copy-dir ./dist          # copy axis from HTML files; not a rendered design score
slop-detect https://example.com --site-copy 5
slop-detect https://example.com --site 5
slop-detect --emit-aeo-fixes ./aeo --origin https://example.com
slop-detect init --dir . --no-hooks    # project skill and MCP config; --scope=project only
slop-detect <url> --screenshot          # include base64 viewport screenshot
slop-detect <url> --timeout 30000       # navigation timeout in ms
```

## Example

```
$ slop-detect https://www.aura.build --copy --aeo

URL: https://www.aura.build
SCORE: 36 / 100   →   Heavy (D)   (8 design patterns flagged)

  ✓ Slop fonts (Inter / Geist / Space Grotesk)        (+8)
  ✓ VibeCode Purple — filled indigo/violet CTAs       (+8)
  ✓ Hero gradient text (background-clip:text)         (+6)
  ✓ Gradient-heavy backgrounds (5+ elements)          (+4)
  ✓ Eyebrow pill above hero ("Now in beta")           (+5)
  ✓ All-caps section labels                           (+3)
  ✓ Identical feature cards with icon on top          (+4)
  ✓ Big-number stat banner                            (+3)
```

## CI integration

```yaml
# .github/workflows/slop-check.yml
name: slop-check
on: pull_request
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      # --fail-on exits non-zero when the page scores at/above the given tier,
      # so the step fails the build directly — no jq, no shell math.
      - run: npx -y slop-detect ${{ env.PREVIEW_URL }} --fail-on heavy
```

`--fail-on mild` is stricter (fails on Mild or Heavy); `--fail-on heavy` fails only on
Heavy slop. Those gates exit 1. A blocked or errored scan exits 2, with or without a
gate. Exit 2 means the scan could not run. It is not a Clean score. Want the JSON too? Combine:

```bash
npx -y slop-detect "$PREVIEW_URL" --json --fail-on heavy | tee slop.json
```

## Tiers

- **Design slop** (lower is better): Clean `0 to 9` · Mild `10 to 27` · Heavy `28 or more`
- **Copy slop** (lower is better): Clean `0 to 7` · Mild `8 to 19` · Heavy `20 or more`
- **System (`DESIGN.md`)** (higher is better): Aligned `80 to 100` · Drifting `50 to 79` · Off-system `< 50`
- **AEO** (higher is better): AI-Ready `80 to 100` · Partial `50 to 79` · Invisible `< 50`

## See also

- [Web UI & Methodology](https://slop-detect.com/docs) — interactive scanning and full 2026.10 spec
- [`slop-detect-core`](https://www.npmjs.com/package/slop-detect-core) — pure detection engine, runtime-agnostic (bundled into this CLI; install it separately only to embed the engine)
- [`slop-detect-mcp`](https://www.npmjs.com/package/slop-detect-mcp) — MCP server for Claude Code, Cursor, and Windsurf
- [Repository](https://github.com/ravidsrk/slop-detect) — source, contributing, and the full pattern catalogue

## License

MIT
