# Slop Detector — Terms of Service

_Last updated: 2026-09-15 · Version: 2026.09_

Slop Detector (`slop-detect.com`, the API, the CLI, and the MCP server —
"the service") scores public web pages against a deterministic,
open-source design-slop fingerprint. By using the service you agree to these
terms. If you don't agree, self-host: the engine is MIT-licensed and runs
entirely on your own infrastructure.

## 1. What the service does

You submit a public URL; we load it once in headless Chromium, extract
styling and copy signals, and return a score plus the triggered patterns.
Scores are heuristic estimates — a fingerprint, not a verdict. Premium
hand-built sites can score Mild, and a Clean score doesn't mean a page is
good. Don't treat a score as a security audit, an accessibility audit, or
professional advice.

## 2. Free engine, paid continuity

- **Detection is free forever.** Scanning, the CLI (`npx slop-detect`), the
  HTTP API, the MCP server, and self-hosting cost nothing. The engine source
  is MIT-licensed (see `LICENSE` in the repo).
- **Monitoring is the paid layer.** Registering a domain for regression
  alerts and history (`POST /api/watch`) is continuity, not detection, and
  may be billed per the [pricing page](/pricing.md). During the current
  validation phase monitoring is free to try.
- Free tiers are subject to per-IP rate limits, a Turnstile challenge on the
  web form, and fail-closed scan routes under load. Paid monitoring gets its
  documented quotas instead of begging the rate limiter.

## 3. Acceptable use

- **Only scan URLs you have the right to analyze** — your own sites, or
  third-party pages with permission. The scanner issues real page loads
  against the target; hammering someone else's site through us is abuse.
- **No probing non-public infrastructure.** Requests targeting private,
  loopback, link-local, or metadata addresses are blocked outright (SSRF
  guard), as are non-HTTP(S) schemes. Attempting to circumvent this block —
  via DNS rebinding, redirects, URL tricks, or otherwise — is a violation.
- **No circumventing abuse controls:** rate limits, the Turnstile challenge,
  or alert confirmation (double opt-in). Don't resell or scrape the hosted
  API at a volume that degrades it for others — self-host instead.
- **Monitoring is for domains you control.** Registering someone else's
  domain, or someone else's email address, is abuse. Alert addresses must
  confirm via double opt-in before a single alert is sent.

We may rate-limit, block, or delete accounts, watches, and stored results
that violate these terms, without notice.

## 4. Your content and scan results

- Scan results (score, triggered patterns, title/H1 — never full page
  content) are stored for ~90 days and may appear on public pages: the
  shareable result permalink, per-domain score pages and history, and
  aggregate statistics/leaderboard.
- Pass `share: false` on a scan request to skip storage entirely.
- Domains appear in the public directory **only** with explicit opt-in
  (`list: true`); scanning never lists a site.
- Email addresses are handled under the [privacy policy](/privacy.md):
  stored only for confirmed monitoring and dashboard sign-in, never shown
  publicly, deleted on unsubscribe.

## 5. Monitoring, alerts, and cancellation

- Monitoring requires a confirmed (double opt-in) email address. One watch
  per domain; the watch stores a baseline score and alerts on regression.
- Cancel any time: `POST /api/watch` with
  `{ "domain": "<your-domain>", "email": "<your-email>", "unsubscribe": true }`
  stops alerts, delists the domain, and removes your email. No retention
  dark patterns: one request deletes it.
- Alert delivery depends on third-party email infrastructure; we don't
  guarantee every alert arrives.

## 6. Intellectual property

The Slop Detector engine, CLI, and site source are MIT-licensed — inspect,
fork, and self-host freely. Scores generated for your URLs are yours to use,
including commercially. The "Slop Detector" name and brand assets are not
covered by the MIT license; don't present a fork or copycat as the official
service.

## 7. Disclaimer

THE SERVICE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
NON-INFRINGEMENT. Scores may be wrong; availability may vary; features may
change or be discontinued. We may modify these terms; continued use after a
change constitutes acceptance, and material changes will bump the version
above.

## 8. Limitation of liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE OPERATOR SHALL NOT BE LIABLE FOR
INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY
LOSS OF PROFITS OR DATA, ARISING FROM USE OF THE SERVICE — INCLUDING SCORES
YOU RELY ON IN A REDESIGN, REPORT, OR PURCHASING DECISION. TOTAL LIABILITY
FOR ANY CLAIM IS LIMITED TO THE AMOUNT YOU PAID FOR THE SERVICE IN THE
PRECEDING 12 MONTHS (ZERO IF YOU USED ONLY FREE TIERS).

## 9. Termination and deletion

You may stop using the service at any time; cancellation of monitoring is in
section 5. We may suspend or terminate access for terms violations or to
protect the service. To delete stored scan results, badges, or directory
entries, open an issue at
<https://github.com/ravidsrk/slop-detect/issues> or contact the maintainer
listed in the repository.

## 10. Contact

Open an issue at <https://github.com/ravidsrk/slop-detect/issues> or contact
the maintainer listed in the repository.
