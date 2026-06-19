# Slop Detect Action

> Score a landing page against the 16-rule **AI-design-slop fingerprint** and gate your PRs.

A [composite GitHub Action](https://docs.github.com/actions/creating-actions/creating-a-composite-action)
that scans a URL (typically a **deploy-preview**), posts a **sticky PR comment**
with the grade/score, writes a job summary, and can **fail the check** when a page
is too sloppy.

The slop **score is 0–100 where _lower is better_** (Clean `0–9`, Mild `10–27`,
Heavy `28+`), surfaced as a letter grade (`A+ … F`).

---

## Security (`pull_request_target` and `url`)

This action works on `pull_request` and `pull_request_target`. It does **not**
check out or run PR code — it forwards `url` to the public slop-detect API via
`fetch` and may post a sticky PR comment.

`pull_request_target` is different: GitHub supplies a **write-scoped token even
for fork PRs**. That is safe here only when `url` is a **trusted, workflow-derived
deploy-preview URL** (resolved from your Vercel/Netlify/Cloudflare API or a
deployment status your workflow controls). **Never** pass a URL taken from PR
body, title, branch name, or other PR-controlled fields — especially on fork PRs.

Treat the `url` input as **untrusted**. The action already limits it to a single
`fetch` against the scan API; the risk is workflow misconfiguration, not code
execution inside the action.

Grant **least privilege** in your workflow:

```yaml
permissions:
  contents: read          # omit if you do not checkout
  pull-requests: write    # required for the sticky comment
```

Prefer `pull_request` when your preview URL does not require `pull_request_target`.

---

## Usage

```yaml
# .github/workflows/slop-check.yml
name: Slop check
on:
  pull_request:

permissions:
  pull-requests: write   # needed to post the sticky comment

jobs:
  slop:
    runs-on: ubuntu-latest
    steps:
      - name: Slop Detect
        uses: ravidsrk/slop-detect/packages/action@v0.2.0
        with:
          # Replace with your deploy-preview URL (see note below).
          url: https://your-site.com
          fail-under: '10'   # fail if slop score > 10
```

### Wiring up a deploy-preview URL

You usually want to scan the **preview** for the current PR, not production.
Capture the preview URL from your host and pass it to `url`:

```yaml
jobs:
  slop:
    runs-on: ubuntu-latest
    steps:
      # --- Vercel: grab the latest preview for this commit ---
      - id: preview
        run: |
          URL=$(vercel inspect --token=$VERCEL_TOKEN ... )   # your lookup
          echo "url=$URL" >> "$GITHUB_OUTPUT"

      - uses: ravidsrk/slop-detect/packages/action@v0.2.0
        with:
          url: ${{ steps.preview.outputs.url }}
          fail-under: 'B'   # fail if the page grades worse than B
```

> **Netlify / Vercel tip:** both expose the preview URL through their own
> actions (`nwtgck/actions-netlify` outputs `deploy-url`; the Vercel for GitHub
> app sets a deployment status). Feed whatever you get into `url`.

---

## Inputs

| Input          | Required | Default                    | Description                                                                                                   |
| -------------- | :------: | -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `url`          |   yes    | —                          | The page to scan (usually a deploy-preview URL).                                                              |
| `fail-under`   |    no    | `''`                       | Gate the check. Empty = report-only. A **number** fails when slop score exceeds it. A **letter grade** fails when the page grades worse than it. |
| `api-base`     |    no    | `https://slop-detect.com`  | Base URL of the slop-detect API.                                                                              |
| `comment`      |    no    | `'true'`                   | Post/update a sticky PR comment.                                                                              |
| `github-token` |    no    | `${{ github.token }}`      | Token used to post the comment.                                                                               |

## Outputs

| Output       | Description                              |
| ------------ | ---------------------------------------- |
| `score`      | Slop score `0–100` (lower is better).    |
| `grade`      | Letter grade `A+ … F`.                   |
| `tier`       | `Clean` / `Mild` / `Heavy`.              |
| `verdict`    | One-line human-readable verdict.         |
| `result-url` | Shareable result page URL.               |

Use them in later steps:

```yaml
      - id: slop
        uses: ravidsrk/slop-detect/packages/action@v0.2.0
        with:
          url: https://your-site.com
      - run: echo "Graded ${{ steps.slop.outputs.grade }} (${{ steps.slop.outputs.score }}/100)"
```

---

## Threshold (`fail-under`) examples

Remember: **lower score = less slop**. `fail-under` means _"fail if it's worse than this"_.

| `fail-under` | Behaviour                                                            |
| ------------ | ------------------------------------------------------------------- |
| `''` (empty) | **Report only.** Never fails the check — just comments + summary.   |
| `0`          | Fail on _any_ slop (score must be exactly `0`).                     |
| `9`          | Fail if the page leaves the **Clean** tier (score `> 9`).           |
| `27`         | Fail only on **Heavy** slop (score `> 27`).                         |
| `A-`         | Fail if the page grades **worse than `A-`** (i.e. `B+` or below).   |
| `B`          | Fail if the page grades **worse than `B`** (i.e. `B-` or below).    |

On failure the step emits a `::error::` annotation and exits non-zero, turning
the check red. On success it emits a `::notice::` and exits `0`.

---

## How it works

- It's a **composite** action: a single zero-dependency Node 20 script
  (`scan.mjs`) runs on the runner's built-in Node. Nothing to bundle, no
  `node_modules` committed.
- It `POST`s `{ url }` to `<api-base>/api/scan`, writes the step outputs and a
  job summary, then upserts a sticky PR comment (matched by a hidden
  `<!-- slop-detect-action -->` marker so re-runs update in place).
- Server-side callers skip the browser Turnstile check, so it works from CI.

## License

MIT — part of the [slop-detect](https://github.com/ravidsrk/slop-detect) monorepo.
