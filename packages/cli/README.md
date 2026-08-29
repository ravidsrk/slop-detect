# slop-detect

> Score any landing page against the 16-rule AI-design-slop fingerprint, from your terminal.

Playwright-based, deterministic, zero-config. Perfect for CI, batch scans, and air-gapped audits.

## Install

```bash
# One-off
npx slop-detect https://your-site.com

# Or install globally
npm install -g slop-detect
slop-detect https://your-site.com
```

Chromium is installed lazily on the first local scan (~150 MB via Playwright), not at `npm install`. Set `SKIP_PLAYWRIGHT_DOWNLOAD=1` to skip that download when Playwright's Chromium is already installed (it does not select a system Chrome/Safari binary). `--remote` scans via the API and needs no Chromium.

## Usage

```bash
slop-detect <url>                       # scan one URL
slop-detect <url1> <url2> <url3>        # scan many, print a table
slop-detect <url> --json                # machine-readable output
slop-detect <url> --screenshot          # include base64 viewport screenshot
slop-detect <url> --timeout 30000       # navigation timeout in ms
```

## Example

```
$ slop-detect https://www.aura.build

URL: https://www.aura.build
SCORE: 36 / 100   →   Heavy   (8 / 27 patterns)

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
Heavy slop. A blocked or errored scan also exits non-zero. Want the JSON too? Combine:

```bash
npx -y slop-detect "$PREVIEW_URL" --json --fail-on heavy | tee slop.json
```

## Tiers

- Clean: 0 to 9
- Mild: 10 to 27
- Heavy: 28 or more

## See also

- [Web UI](https://slop-detect.com) — point-and-click scanning
- [`slop-detect-core`](https://www.npmjs.com/package/slop-detect-core) — pure detection engine, runtime-agnostic
- [Repository](https://github.com/ravidsrk/slop-detect) — source, contributing, the full 27 patterns

## License

MIT
