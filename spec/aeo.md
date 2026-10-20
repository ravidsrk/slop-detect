# AEO conformance model

Answer-Engine Optimization (AEO) measures technical eligibility for AI search engines and user-triggered agent fetchers: can search and citation crawlers reach the page over HTTP, pass edge/WAF checks, permitted by `robots.txt` and snippet controls, and read substantive server-rendered prose without executing JavaScript?

**Polarity:** AEO is inverted vs slop. Higher AEO score = better (`Eligible`). Lower slop score = better (`Clean`).

## Scoring & dynamic denominator

Sixteen checks run against a live URL via HTTP `fetch` using our honest self-identification User-Agent (`SlopDetector-AEO/1.0 (+https://slop-detect.com/bot)` — never impersonating third-party crawlers).

Checks that are not applicable (`status: "na"`, such as missing optional `/llms.txt`, non-negotiated `Vary: Accept`, or page-dependent checks when `html.reachable` fails) or inconclusive (`status: "unknown"`, such as when the scanner vantage point is blocked by an edge firewall) or informational (`weight: 0`, `status: "info"`) are excluded from the denominator:

```
earned_weight     = Σ (weight for pass) + Σ (0.5 × weight for warn)
applicable_weight = Σ weight for applicable scored checks (status ∈ {pass, warn, fail})
aeo_score         = round(100 × earned_weight / applicable_weight)
aeo_tier          = Eligible            if aeo_score ≥ 80
                    Partially Eligible  if aeo_score ≥ 50
                    Restricted          otherwise
```

## Check catalogue

| ID | Label | Weight | Severity | What passes |
|----|-------|--------|----------|-------------|
| `html.reachable` | Page is reachable over HTTP (HTML 2xx) | 10 | required | Baseline HTTP fetch returns 2xx HTML without WAF challenge |
| `edge.access` | Edge/WAF allows automated retrieval without challenge or block | 20 | required | Search-class probe with honest UA receives 2xx (not AWS WAF 202/405, CF challenge, or 403) |
| `robots.searchAllowed` | robots.txt permits AI search & citation crawlers (RFC 9309) | 20 | required | RFC 9309 evaluation permits search crawlers (`OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`, `Googlebot`, `bingbot`, `Applebot`) |
| `html.indexable` | Page is indexable (no global noindex directive) | 12 | required | No global `noindex` or `none` in `X-Robots-Tag` or `<meta name="robots">` |
| `ai.previewControls` | Snippet & preview controls permit quoting across Google, Bing, and Apple | 8 | required | Per-engine `nosnippet` / `max-snippet` / `data-nosnippet` controls permit text previews (Google 5, Bing 2, Apple 1) |
| `html.serverTextCoverage` | Server-rendered HTML contains primary page prose without JS | 15 | required | Raw HTML contains ≥80% of rendered words (50–79% warns at half weight; <50% or empty CSR shell fails) |
| `md.twin` | Validated Markdown twin served via negotiation or .md route | 6 | recommended | Negotiated or `<url>.md` twin returns `text/markdown` with ≥50 bytes of non-HTML prose after stripping frontmatter |
| `html.linkAlternate` | HTML advertises a valid Markdown twin (Link rel=alternate) | 3 | recommended | `Link` header or `<link rel="alternate" type="text/markdown" href="...">` points to a validated twin |
| `site.llmsTxt` | Valid /llms.txt published at site root (H1 + links, non-HTML) | 2 | recommended | `/llms.txt` returns non-HTML with ≥50 chars, H1 heading, and ≥1 markdown link (`404` is `na`) |
| `html.vary` | Negotiated responses send Vary: Accept | 4 | recommended | `Vary` header includes `Accept` (`na` when site does not negotiate markdown) |
| `ai.manipulation` | No prompt injection, hidden instructions, or AI manipulation links | 0 | info | Scans poisoning links, hidden DOM instructions, `X-AI-*` headers, JSON-LD strings, and `/llms.txt` |
| `agent.operability` | Interactive controls have accessible names and no blocking overlays | 0 | info | Evaluates accessible name coverage on interactive elements and Lighthouse 13.5.0 agent operability rules |
| `agent.discovery` | Agent discovery endpoints (ARD, Agentmap, A2A agent-card, WebMCP) | 0 | info | Reports `Agentmap:` in `robots.txt` and WebMCP signals without probing deprecated `.well-known/mcp.json` |
| `ai.usagePolicy` | Machine-readable AI usage preferences (AIPREF Content-Usage, Content-Signal, TDMRep) | 0 | info | Parses IETF AIPREF `Content-Usage` (`train-ai`, `ai-use`, `search`) and `Content-Signal` headers |
| `content.dates` | Publication and modification dates are valid and consistent across signals | 0 | info | Checks JSON-LD `datePublished`/`dateModified` and `Last-Modified` consistency without penalizing age |
| `jsonld.hygiene` | JSON-LD structured data parses cleanly and matches visible text | 0 | info | Validates `<script type="application/ld+json">` syntax, `@context`/`@type`, and prompt-injection hygiene |

### Tier thresholds

| Tier | Ratio | Score range |
|------|-------|-------------|
| Eligible | ≥ 0.80 | 80–100 |
| Partially Eligible | 0.50–0.79 | 50–79 |
| Restricted | < 0.50 | 0–49 |

## RFC 9309 `robots.txt` evaluation & purpose-tiered bot registry

`parseRobotsTxt()` and `evaluateRobotsTxt()` implement RFC 9309:
- Bot-specific groups override `User-agent: *`; duplicate groups for the same token merge; `Applebot` inherits `Googlebot` rules when `Applebot` has no explicit group.
- Longest matching path pattern wins; `Allow` wins ties of equal length; `*` and trailing `$` wildcards and percent-encoding normalization are supported.
- HTTP `5xx` on `/robots.txt` is treated as full disallow; `4xx` is treated as allow all; `200` with `text/html` is ignored with a warning.
- Blocking training-only crawlers (`GPTBot`, `ClaudeBot`, `Google-Extended`, `Applebot-Extended`, `CCBot`) is recorded informationally and never reduces `robots.searchAllowed`.
