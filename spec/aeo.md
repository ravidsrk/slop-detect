# AEO conformance model

Answer-Engine Optimization (AEO) measures whether AI engines can fetch, read, and cite a page. It complements the design and copy slop axes: a page can look human-crafted and still be invisible to ChatGPT, Claude, or Perplexity if crawlers are blocked or no machine-readable twin exists.

**Polarity:** AEO is inverted vs slop. Higher AEO score = better. Lower slop score = better.

## Scoring

Eight weighted checks run against a live URL via HTTP `fetch`. Passed checks contribute their weight; failed checks contribute 0.

```
aeo_score  = Σ weight for passed checks        (max 100)
aeo_ratio  = aeo_score / maxScore
aeo_tier   = AI-Ready if ratio ≥ 0.8
             Partial  if ratio ≥ 0.5
             Invisible otherwise
```

Total weight = 100. Required checks (70 points) are fundamentals every site should pass. Recommended checks (30 points) are markdown-twin / `llms.txt` bonuses that push a site from readable to optimized.

## Check catalogue

| ID | Label | Weight | Severity | What passes |
|----|-------|--------|----------|-------------|
| `html.reachable` | Page is reachable (HTML 2xx) | 10 | required | Normal browser fetch returns 2xx HTML |
| `bot.notBlocked` | AI crawlers are not blocked (GPTBot gets 2xx) | 25 | required | Fetch with GPTBot User-Agent returns 2xx |
| `robots.aiAllowed` | robots.txt does not Disallow AI crawlers | 20 | required | No AI bot or `*` group disallows the page path |
| `html.indexable` | Page is indexable (no noindex) | 15 | required | No `noindex` in `X-Robots-Tag` or `<meta name="robots">` |
| `md.twin` | Markdown twin served at `<url>.md` | 10 | recommended | `GET <path>.md` (or `/index.md` for `/`) returns `text/markdown` 2xx |
| `html.linkAlternate` | HTML advertises the markdown twin (Link rel=alternate) | 8 | recommended | `Link: rel=alternate; type=text/markdown` in header or `<link>` in HTML |
| `site.llmsTxt` | `/llms.txt` published at the site root | 7 | recommended | `GET /llms.txt` returns 2xx |
| `html.vary` | HTML sends Vary: Accept (content-negotiation aware) | 5 | recommended | `Vary` header includes `Accept` |

### Required vs recommended

| Severity | Total weight | Expectation |
|----------|--------------|-------------|
| required | 70 | Must pass for AI-Ready tier without recommended bonuses |
| recommended | 30 | Optional; passing all required + all recommended = 100 |

A plain marketing site can reach **AI-Ready** (≥80) by passing all four required checks (70 points) plus one recommended check. Passing only required checks yields 70/100 (ratio 0.7) → **Partial**.

### Tier thresholds

| Tier | Ratio | Score range |
|------|-------|-------------|
| AI-Ready | ≥ 0.8 | 80–100 |
| Partial | ≥ 0.5 | 50–79 |
| Invisible | < 0.5 | 0–49 |

Report fields: `requiredFailed`, `recommendedFailed`, `passed[]`, `failed[]`, `checks[]`, `mdUrl`, `durationMs`.

## Markdown twin convention

`toMarkdownUrl()` maps:

- `/` → `/index.md`
- `/a/b` → `/a/b.md`
- Paths already ending in `.md` are unchanged

## robots.txt evaluation

`aiBotsBlockedByRobots(robotsTxt, pathname)` parses `User-agent` groups. A page is blocked if any group targeting `*` or a known AI bot name has a `Disallow` rule matching the page path (prefix match, or `Disallow: /`).

## AI agent registry

`detectAIBot(userAgent)` matches against `AI_BOTS`. Used for robots.txt agent-name resolution and bot identification.

| Vendor | Name | UA pattern | Purpose | Docs URL |
|--------|------|------------|---------|----------|
| OpenAI | GPTBot | `GPTBot` | training | https://platform.openai.com/docs/gptbot |
| OpenAI | ChatGPT-User | `ChatGPT-User` | user-action | https://platform.openai.com/docs/bots |
| OpenAI | OAI-SearchBot | `OAI-SearchBot` | search | https://platform.openai.com/docs/bots |
| Anthropic | ClaudeBot | `ClaudeBot` | training | https://support.anthropic.com/en/articles/8896518 |
| Anthropic | anthropic-ai | `anthropic-ai` | training | — |
| Anthropic | Claude-Web | `Claude-Web` | user-action | — |
| Anthropic | Claude-SearchBot | `Claude-SearchBot` | search | https://support.anthropic.com/en/articles/8896518 |
| Anthropic | Claude-User | `Claude-User` | user-action | https://support.anthropic.com/en/articles/8896518 |
| Perplexity | PerplexityBot | `PerplexityBot` | search | https://docs.perplexity.ai/guides/bots |
| Perplexity | Perplexity-User | `Perplexity-User` | user-action | https://docs.perplexity.ai/guides/bots |
| Google | Google-Extended | `Google-Extended` | training | https://developers.google.com/search/docs/crawling-indexing/google-extended |
| Google | GoogleOther | `GoogleOther` | training | — |
| Apple | Applebot-Extended | `Applebot-Extended` | training | https://support.apple.com/en-us/119829 |
| Cohere | cohere-ai | `cohere-ai` | training | — |
| Common Crawl | CCBot | `CCBot` | training | https://commoncrawl.org/ccbot |
| ByteDance | Bytespider | `Bytespider` | training | — |
| DeepSeek | DeepSeekBot | `DeepSeekBot` | training | — |
| Amazon | Amazonbot | `Amazonbot` | training | https://developer.amazon.com/amazonbot |
| You.com | YouBot | `YouBot` | search | — |
| Diffbot | Diffbot | `Diffbot` | training | — |
| ImageSift | ImagesiftBot | `ImagesiftBot` | training | — |
| Webz.io | Omgilibot | `Omgilibot` | training | — |
| DuckDuckGo | DuckAssistBot | `DuckAssistBot` | search | — |
| Meta | Meta-ExternalAgent | `meta-externalagent` | training | — |
| Meta | Meta-ExternalFetcher | `meta-externalfetcher` | user-action | — |
| Mistral | MistralAI-User | `MistralAI-User` | user-action | — |
| Allen Institute | AI2Bot | `AI2Bot` | training | — |

**Purpose values:** `training` = corpus crawlers; `search` = on-demand answer fetchers (citation-relevant); `user-action` = fetches triggered by user prompts.

The `bot.notBlocked` check uses GPTBot User-Agent: `Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)`.

## Example output shape

```json
{
  "axis": "aeo",
  "score": 70,
  "maxScore": 100,
  "ratio": 0.7,
  "tier": "Partial",
  "requiredFailed": 0,
  "recommendedFailed": 4,
  "passed": [ "...4 required checks..." ],
  "failed": [ "...4 recommended checks..." ]
}
```