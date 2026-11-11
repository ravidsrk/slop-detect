# Deploy Gates — Vercel Deployment Checks & Netlify Build Plugin

Gate production promotions and preview deploys on deterministic design, copy, `DESIGN.md`, and AEO thresholds (`R-12` / [#328](https://github.com/ravidsrk/slop-detect/issues/328)).

---

## 1. Vercel Deployment Checks (via GitHub Actions)

Vercel [Deployment Checks](https://vercel.com/docs/deployment-checks) can hold production promotion until selected GitHub Actions checks succeed against the preview URL.

### Step 1: Add `.github/workflows/slop-gate.yml`

```yaml
name: Slop Detect Gate

on:
  deployment_status:

permissions:
  contents: read
  pull-requests: write
  security-events: write

jobs:
  slop-gate:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Slop Detect on Vercel Preview
        uses: ravidsrk/slop-detect@v0.9.0
        with:
          url: ${{ github.event.deployment_status.target_url }}
          axes: 'design,copy'
          design-md: 'auto'
          aeo: 'true'
          fail-under: '27' # Block Heavy tier (>= 28) from promoting to production
          sarif: 'slop.sarif'
          upload-sarif: 'true'
```

### Step 2: Require the check in Vercel Project Settings

1. Open your Vercel project → **Settings → Deployment Protection / Deployment Checks**.
2. Click **Add Check → GitHub Actions** and select **`slop-gate`**.
3. Enable **Block production promotion until check passes**.
4. Any preview deployment that scores `Heavy` (≥ 28) or regresses beyond your threshold will fail the check and hold `deployment.promoted`.

---

## 2. Netlify Build Plugin (`netlify-plugin-slop-detect`)

The in-repo [`packages/netlify-plugin-slop-detect`](../packages/netlify-plugin-slop-detect) plugin runs during `onPostBuild` (against the local static `PUBLISH_DIR` or `DEPLOY_PRIME_URL`), reports a structured summary to the Netlify deploy log via `utils.status.show`, and halts failing deploys via `utils.build.failBuild`.

### `netlify.toml` Configuration

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[plugins]]
  package = "./packages/netlify-plugin-slop-detect"
  [plugins.inputs]
    failOn = "heavy"          # "heavy" (>= 28), "mild" (>= 10), or "none"
    failUnderScore = 27       # Maximum allowed slop score (0-100, lower is better)
    axes = ["design", "copy"] # Axes to evaluate
    designMd = "./DESIGN.md"  # Optional path or URL to DESIGN.md
```

### Behavior

- **Pass:** Calls `utils.status.show({ title: 'Slop Detect: Clean (4/100)', summary: '...' })` and lets the deploy proceed.
- **Breach:** Calls `utils.build.failBuild('Slop score 34 (Heavy) exceeded threshold 27')` so a regressed deploy never reaches production.
- **Scan error / unreachable:** Reports `Scan could not run` without falsely reporting a `Clean` score.
