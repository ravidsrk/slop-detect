# `netlify-plugin-slop-detect`

Netlify Build Plugin (`R-12` / [#328](https://github.com/ravidsrk/slop-detect/issues/328)) that audits deploy previews against the Slop Detector engine (`design`, `copy`, `DESIGN.md` compliance) during `onPostBuild`, reports a summary via `utils.status.show`, and fails the deploy via `utils.build.failBuild` when thresholds are exceeded.

## Usage (`netlify.toml`)

```toml
[[plugins]]
  package = "./packages/netlify-plugin-slop-detect"
  [plugins.inputs]
    failOn = "heavy"
    failUnderScore = 27
    axes = ["design", "copy"]
    designMd = "auto"
```
