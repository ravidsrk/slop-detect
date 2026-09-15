---
name: Bug report
about: Something detected wrong, or not detected at all
title: '[bug] '
labels: bug
---

## What happened

<!-- The URL you scanned and what was wrong -->

URL scanned: `https://...`

## Expected

<!-- e.g. "I expected this site to score Heavy because it has Inter, indigo CTAs, and gradient text" -->

## Got

<!-- Sanitized JSON output from `slop-detect <url> --json`: strip query strings/fragments from URLs, delete the `screenshot` field, keep score/patterns/version (see docs/SUPPORT.md) -->

```json
```

## Screenshot

<!-- Optional but very helpful — drag-drop a screenshot of the page -->

## Environment

- Package: <!-- slop-detect vX.Y.Z / web (slop-detect.com) / slop-detect-core embedded -->
- Node version (if CLI): <!-- output of `node -v` -->
- OS: <!-- macOS 14 / Ubuntu 22 / Windows / etc. -->
