# Agent-readiness (orank) — what was fixed and what's left

orank baseline: **47/100, Grade D** (scan before this work). orank evaluates how
well a product supports AI-agent use cases across 5 layers: Discovery, Identity,
Auth & Access, Agent Integration, User Experience.

## ✅ Fixed in the codebase (shipped)

### Identity
- **JSON-LD @graph** on the homepage: Organization (+contactPoint, +address),
  WebSite, SoftwareApplication (+offers), FAQPage, BreadcrumbList, WebPage
  (+speakable), with `sameAs` entity links. Covers: structured-data, entity-linking,
  org-completeness, schema-breadth, speakable, metadata.
- **og:type** + og:site_name (4th metadata signal).
- **llms.txt** enriched: use cases, constraints, API reference, "Instructions for
  AI agents" (when-to-use), AGENTS.md link.
- **llms-full.txt** (new): headed sections, code, auth + API + quickstart.
- **Modular llms.txt**: `/api/llms.txt`, `/developers/llms.txt`.
- **Consistent description** across title/og/H1/llms.

### Auth & Access
- **OpenAPI 3.1** at `/openapi.json` (scan/aeo/patterns/fix-prompt) with an apiKey
  security scheme → fixes OpenAPI + scoped-permissions.
- **`/.well-known/oauth-protected-resource`** (RFC 9728), honest anonymous +
  optional-API-key model, with WorkOS `agent_auth` block.
- **`/auth.md`** prose walkthrough (text/markdown).

### Agent Integration / Discovery
- **`/.well-known/agent.json`**, **`/.well-known/agent-card.json`** (A2A),
  **`/.well-known/mcp/server-card.json`** (MCP discovery).
- **`/.well-known/agent-skills/index.json`** upgraded to v0.2.0 (valid JSON,
  `$schema`, per-entry type/url/digest; digest verified against the live SKILL.md).
- **`GET /?mode=agent`** machine-readable view (+ Accept: application/json).
- **AGENTS.md** at repo root (linked from llms.txt).
- **robots.txt** Content-Signal (ai-train=no) + **Schemamap** directive;
  **schema-map.xml** (NLWeb Schema Feeds).
- **/compare** positioning page (SSR HTML + .md twin + Article JSON-LD).
- **pricing.md** (real markdown), **/api/patterns.md** twin, expanded sitemap.
- **_headers**: correct content-types for all md/json/xml + Link alternates + CORS.

### Bonus cleanups
- Fixed stale pattern counts: README 19→27, SKILL.md 16→27.
- Verified slop self-scan unchanged (4/100 Clean A) and AEO self-scan 100/100.

## ⚠️ Off-platform — NOT codebase-fixable (require human action)

These orank gaps cannot be closed by shipping code. They need real-world presence,
which takes outreach and time (orank itself calls these "months-to-years"):

| Gap | What it needs | Who/how |
| --- | --- | --- |
| Wikipedia / Wikidata entity | A Wikipedia article + Wikidata item (P856 = slop-detect.com). Requires third-party press first (notability). | Earn coverage, then a neutral editor drafts with citations. |
| Training corpus footprint / knowledge-cutoff / 3rd-party citations | Product Hunt + Hacker News launch, Dev.to / CSS-Tricks coverage, Reddit/HN discussion of the April 2026 study. | Founder-led launch + outreach. |
| Brand-name discoverability / share-of-voice | Press mentions linking the canonical domain; comparison/"best X for Y" content that ranks. | Content + backlinks over time. |
| ChatGPT app / GPT Store listing | Submit to the GPT Store. | Manual submission (uses the MCP/OpenAPI now published). |
| skills.sh listing | `npx skills add` to register the SKILL.md (the file + index are now valid and ready). | One command by the maintainer. |

The code now gives every one of these a clean foundation: the OpenAPI spec, MCP
server card, agent.json, and valid SKILL.md mean the GPT Store / skills.sh
submissions are paste-and-go whenever you're ready.
