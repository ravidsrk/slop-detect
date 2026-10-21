# Scan result schema v1

`scan-result.v1.json` is JSON Schema draft 2020-12 for three documents:

- a scored scan (`schemaVersion`, `definitionsVersion`, `url`, numeric `score`, `tier`, `patterns`)
- a page the runner could not score (`blocked`, `error`, or `code`, and no numeric `score`)
- an AEO report (`axis: "aeo"`)

CLI `--json` prints one document, or an array when several URLs were passed. `POST /api/scan` and `POST /api/aeo` return one document. MCP `scan_page` and `check_aeo` return the same document as `structuredContent`.

`schemaVersion` is the schema major. It is not a package version and it does not change Clean, Mild, or Heavy. Package versions stay 0.8.0. This file does not freeze a v1.0 product release.

A breaking change (a removed field, a narrower type or enum, a new required property, or `additionalProperties: false` where the previous schema was open) renames the file to `scan-result.v2.json` and bumps `$id`. Adding an optional property stays on v1. `schemas/check-schema-compat.mjs` compares the file with `origin/main`.

Pattern rows use `status` of `fail`, `review`, `unknown`, or `pass`. `locations` is optional and omitted until a runner has a DOM location. `madeWith` is provenance and does not change the score. `confidence` is a co-occurrence summary, not a calibrated likelihood ratio. `environment` (`chromium`, `viewport`, `userAgent`) is optional.

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Every requested page produced a score. Findings do not fail the process unless `--fail-on` or `--fail-under` is set. |
| 1 | A page was scored and it is over that gate. `slop-detect --lint-design-md` also exits 1 when the file has errors. |
| 2 | The scan could not run, or the invocation is invalid. This covers a blocked page, a navigation error, an empty render, a bot wall, and a bad flag. It is never a Clean score. |

When a run mixes a gated finding and a page that could not be scanned, the process exits 2.
