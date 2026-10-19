# GitHub / open-source ecosystem, competitive landscape and developer-distribution channels for Slop Detector (state as of 2026-10-19)

Legend for every finding:
- **[V]** = verified by opening the primary source on 2026-10-19 (GitHub REST API or README via `gh api`, official docs page, release notes, package-registry API).
- **[S]** = secondary source only (search-result summary, third-party blog or press).
- **[X]** = could not verify.

Unless stated otherwise:
- Star counts and activity come from `gh api repos/OWNER/NAME` on 2026-10-19, in the form stars · created · last push · SPDX license.
- npm versions come from `registry.npmjs.org/<pkg>/latest`. Downloads are last-month figures from `api.npmjs.org/downloads/point/last-month/<pkg>`, queried 2026-10-19.
- HN points and comments come from the hn.algolia.com API on 2026-10-19.

Research note: the shared WebSearch budget ran out partway through. After that, findings were verified only by fetching known primary URLs or calling `gh api` on named repos. Items that could not be checked that way are listed under each Gaps section.

## 1. Competitors and adjacent detectors (AI design slop, AI copy slop, code slop)

### Takeaway
"Anti-AI-slop design" grew into a large GitHub category in 2026. Agent skills dominate it: taste-skill (99k stars), Impeccable (83k stars, 759k npm downloads/month) and Hallmark (30k). Impeccable now ships **61 deterministic detector rules runnable from a CLI and browser extension with no LLM**, plus harness hooks. That makes it the de facto deterministic design-slop detector inside agent workflows.

The closest methodological twin to slop-detect is Adrian Krebs' MIT-licensed **design-slop-cop**: headless browser, 14 deterministic DOM/CSS patterns, a 0–100 score and a live scanner. The other near twin is **VibeCheck** (Puppeteer, 45+ heuristics, 0–100).

Static source scanners are also proliferating: @gessobuild/anti-slop (73 rules), kill-ai-slop and avoid-ai-design. None of the verified tools combines live-URL computed-style scoring, a calibrated tier system, an AEO axis and a public API/leaderboard the way slop-detect does. Slop-detect's reach is tiny by comparison: 14 stars and 698 CLI downloads/month.

### Cited Findings
**Baseline: slop-detect itself**
- ravidsrk/slop-detect: 14 stars · created 2026-05-26 · pushed 2026-10-19 · MIT — [GitHub API: ravidsrk/slop-detect](https://github.com/ravidsrk/slop-detect) [V]
- npm downloads last month: slop-detect 0.8.0 = 698; slop-detect-core 0.8.0 = 697; slop-detect-mcp 0.8.0 = 32 — [npm downloads API: slop-detect](https://api.npmjs.org/downloads/point/last-month/slop-detect), [slop-detect-mcp](https://api.npmjs.org/downloads/point/last-month/slop-detect-mcp) [V]
- Local repo state: the MCP server uses `StdioServerTransport` only and sets `annotations.readOnlyHint` on tools; there is no `outputSchema` or `structuredContent` anywhere in `packages/mcp/src`. `skills/slop-detect/SKILL.md` exists with Agent-Skills frontmatter (`name`, `description`, `license`, `metadata`, `compatibility`). The Action is at `packages/action/action.yml` — local files `packages/mcp/src/server.ts`, `skills/slop-detect/SKILL.md`, `packages/action/action.yml` [V]
- An Algolia HN search for "slop-detect" returned no story about slop-detect or slop-detect.com. The top hit was Kagi "SlopStop" (589 pts, 2025-11-13) — [HN Algolia API query "slop-detect"](https://hn.algolia.com/api/v1/search?query=slop-detect&tags=story) [V: absence only]

**Design-slop detectors and anti-slop design skills**
- **Paul Bakaus' Impeccable** (pbakaus/impeccable): 82,943 stars · created 2025-11-16 · pushed 2026-10-19 · Apache-2.0 — [GitHub API](https://github.com/pbakaus/impeccable) [V]
  - The README says: "1 skill, 24 commands, live browser iteration, and 61 deterministic detector rules for AI-generated frontend design." It also says: "61 deterministic detector rules plus LLM-only critique checks. The CLI and browser extension run the deterministic rules with no LLM and no API key." — [README pbakaus/impeccable](https://github.com/pbakaus/impeccable) [V]
  - **It does ship a detector, a CLI and hooks.** `npx impeccable install` detects harness folders (`~/.claude`, `~/.codex`, `~/.grok`, `~/.hermes`, `~/.veto`, project `.cursor`) and installs the skill plus a project "design hook". Codex users must approve `.codex/hooks.json`. A VS Code extension `renaissance-geek.impeccable` installs the skill only, without hooks. Every skill copy ships a launcher that runs a self-contained engine binary — [README](https://github.com/pbakaus/impeccable) [V]
  - The README states: "Anthropic's frontend-design was the first widely-used design skill for Claude. Impeccable started from there." The tells it names: "Inter for everything, purple-to-blue gradients, cards nested in cards, gray text on colored backgr[ounds]" — [README](https://github.com/pbakaus/impeccable) [V]
  - npm `impeccable` 4.6.0 ("Design skills, commands, and anti-pattern detection for AI coding agents"): 759,385 downloads last month — [npm registry](https://registry.npmjs.org/impeccable/latest), [downloads API](https://api.npmjs.org/downloads/point/last-month/impeccable) [V]
  - No listing found in the official MCP Registry (search "impeccable") — [registry API](https://registry.modelcontextprotocol.io/v0/servers?search=impeccable) [V]
- **Leonxlnx/taste-skill**: 99,135 stars · created 2026-02-19 · pushed 2026-10-19 · MIT — [GitHub API](https://github.com/Leonxlnx/taste-skill) [V]
  - Agent skills that give the agent "an art direction, real pictures and a way to check its own work". The skill "Checks the page in a real browser at three widths and fails it on slop." Install: `npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"`. Includes a Stitch skill with an optional `DESIGN.md` export — [README](https://github.com/Leonxlnx/taste-skill) [V]
  - The agent performs the check, so this is LLM/agent-based. HN: "Taste Skill: An Anti-Slop Front End Framework for AI Agents", 3 pts (2026-05-28) — [HN item 48306196](https://news.ycombinator.com/item?id=48306196) [V via Algolia]
- **Nutlope/hallmark** (Together AI): 30,374 stars · created 2026-04-27 · pushed 2026-08-06 · MIT — [GitHub API](https://github.com/Nutlope/hallmark) [V]
  - "runs fifty-seven slop-test gates plus a pre-emit self-critique"; 21 themes.
  - `hallmark audit <target>`: "Score existing code against the anti-patterns. Punch list, no edits."
  - `hallmark study <screenshot | URL>` "Optionally emits a portable `design.md`".
  - Install: `npx skills add nutlope/hallmark` — [README](https://github.com/Nutlope/hallmark) [V]
  - HN: 7 pts / 9 comments (2026-07-26) — [HN item 49058547](https://news.ycombinator.com/item?id=49058547) [V via Algolia]
- **Anthropic frontend-design skill** (anthropics/skills, 182,126 stars, pushed 2026-10-09). It is guidance only, with no detector.
  - It lists "the commonest tells of a generated page", including "Accenting just a single word or phrase in a headline".
  - It lists named defaults to avoid, including "a warm cream background (near #F4F1EA) with a high-contrast serif display and a terracotta or warm-clay accent (often near #D97757 — Anthropic's own Claude-interaction accent, so on a user's brief it reads as a tell)".
  - It also lists "the SaaS-card kit: … identical rounded cards, one border-radius on everything …, the same soft grey shadow (rgba(0,0,0,.1)) … gradient washes" — [SKILL.md anthropics/skills/skills/frontend-design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) [V]
- **Adrian Krebs' "slopcop"** = AdrianKrebs/design-slop-cop: 18 stars · created 2026-04-28 · pushed 2026-07-07 · MIT — [GitHub API](https://github.com/AdrianKrebs/design-slop-cop) [V]
  - "The tool loads each site in a headless browser, analyzes the DOM, and reports which of 14 deterministic AI design patterns are found."
  - "Manual verification across ~150 labeled sites suggests ~5–10% false positives."
  - JSON output carries `score` (0–100), `patternsFlagged` and `patternsTotal`. Live scanner at slopcop.adriankrebs.ch — [README](https://github.com/AdrianKrebs/design-slop-cop) [V]
- **Krebs' blog post** (2026-04-20) — [adriankrebs.ch/blog/design-slop](https://www.adriankrebs.ch/blog/design-slop/) [V]
  - Method: Playwright plus "Every pattern is a deterministic CSS or DOM check". He scored about 1,590 Show HN sites: High (4+ patterns) 22%, Medium 32%, Low 46%.
  - Fonts: Inter everywhere; Space Grotesk / Instrument Serif / Geist; serif-italic accent word.
  - Colors: "VibeCode Purple"; perma-dark mode with grey body text; barely-passing contrast; gradients; colored glows.
  - Layout: centered hero; badge above the H1; colored top/left card borders; identical icon cards; numbered steps; stat banners; emoji nav; all-caps labels.
  - CSS: shadcn/ui; glassmorphism.
  - HN: "Scoring 500 Show HN pages for AI design slop", 4 pts (2026-04-19) — [HN item 47825004](https://news.ycombinator.com/item?id=47825004) [V via Algolia]
  - An aiindigo.com page describes "SlopCop" as a URL scanner giving a "slop score". It reads as promotional and names no creator — [aiindigo SlopCop](https://aiindigo.com/tool/slopcop) [S]
- **VibeCheck** (vibecheck.fail): "45+ visual and structural heuristics across 5 categories".
  - Signals include purple gradients, glassmorphic cards, uniform padding, "card grid syndrome", hero-stat-FAQ scaffolding, AI-style copy, default icon libraries and palette homogeneity.
  - Method: full-page screenshot plus headless Puppeteer. Output is 0–100 (higher = more AI vibe).
  - Mentions local runs, CI pipelines and a Claude Code skill. Says it is "fully open", but links no repo. Author @NOTONKETAMINE — [vibecheck.fail](https://www.vibecheck.fail/) [V site; repo X]
  - HN: "Vibecheck: AI Web Design Slop Fingerprinter", 4 pts (2026-04-17) — [HN item 47811823](https://news.ycombinator.com/item?id=47811823) [V via Algolia]
- **yetone/kill-ai-slop**: 1,370 stars · created 2026-07-10 · pushed 2026-09-15 · Apache-2.0 — [GitHub API](https://github.com/yetone/kill-ai-slop) [V]
  - Two parts: a multilingual field-guide site (killaislop.com) and an Agent Skill.
  - Deterministic scanner: `node skill/scripts/scan.mjs path/to/project [--json]`, with `--only=` / `--skip=` by tell id, `--exclude=`, `--rules=extra.mjs` for custom tells, and `deslop-ignore` comment directives — [README](https://github.com/yetone/kill-ai-slop) [V]
- **Gesso-Build/skills** (`@gessobuild/anti-slop`): 91 stars · created 2026-07-28 · pushed 2026-10-18 · MIT — [GitHub API](https://github.com/Gesso-Build/skills) [V]
  - "A deterministic design critique for HTML/CSS … 73 of those tells as executable rules: each one a documented detector with an exact threshold".
  - Reads `.html` files (inline styles and `<style>` blocks only).
  - `npx -y @gessobuild/anti-slop check page.html` (exit 1 on slop); `check dist/ --json`; `fix page.html --write` (deterministic fixes). Listed on skills.sh — [README](https://github.com/Gesso-Build/skills) [V]
- **Laith0003/ux-skill**: 82 stars · pushed 2026-10-02 · MIT — [GitHub API](https://github.com/Laith0003/ux-skill) [V]
  - `pip install uxskill`: "Free, MIT, offline, no LLM"; "Sharper linter (152 rules)"; 18 MCP tools.
  - `/ux-evolve` loop "lint → polish → re-lint until score ≥ 90 … Quality gate at 65" — [README](https://github.com/Laith0003/ux-skill) [V]
- **funboy322/avoid-ai-design**: 114 stars · pushed 2026-09-24 · MIT — [GitHub API](https://github.com/funboy322/avoid-ai-design) [V]
  - A catalog of 67 tells. `scripts/detect.mjs` "finds the code-certain tells with no model call and no dependencies (Node 18+)".
  - Recommends a Claude Code `PostToolUse` hook so "When an edit introduces P0 or P1 tells, Claude sees the list right away" — [README](https://github.com/funboy322/avoid-ai-design) [V]
- **miqdadbadjuber/anti-slop**: 6,490 stars · created 2026-08-07 · pushed 2026-10-16 · MIT — [GitHub API](https://github.com/miqdadbadjuber/anti-slop) [V]
  - A rulebook ("38 mandatory rules (R-01 to R-38)"). Install via `npx antislop-ai`, `npx skills add` or a Cline plugin.
  - It positions itself as "a filter, not a style guide" that pairs with DESIGN.md — [README](https://github.com/miqdadbadjuber/anti-slop) [V]
- **hayattcodes/Slop-Detector**: 2 stars · created 2026-07-20 · no license — [GitHub API](https://github.com/hayattcodes/Slop-Detector) [V]
  - "A Chrome extension and CLI tool that detects 'AI slop' — generic, templated UI design patterns": "40 deterministic pattern detectors" and 46 rule definitions — [README](https://github.com/hayattcodes/Slop-Detector) [V]
  - The name collides with the "Slop Detector" brand.
- **sloppatterns.com**: listed in the official MCP Registry as `com.sloppatterns/slop-patterns`, a remote streamable-http server published 2026-10-12. Description: "Checks UI code for AI-default design patterns and gives the fix. By Precious Studio."
  - Repo pavithralamahewa/slop-patterns: 1 star, MIT, created 2026-09-27 — [registry API](https://registry.modelcontextprotocol.io/v0.1/servers/com.sloppatterns%2Fslop-patterns/versions/latest), [GitHub API](https://github.com/pavithralamahewa/slop-patterns) [V]
  - Also in the registry: `com.noslopui/noslopui` ("Hand-crafted UI components and design systems for agents, so builds don't look like AI slop", 2026-10-08) — [registry API](https://registry.modelcontextprotocol.io/v0.1/servers/com.noslopui%2Fnoslopui/versions/latest) [V]
- **febbhav/signs-of-ai-design**: 27 stars · created 2026-07-22. Content is CC BY-SA 4.0.
  - "A field guide to the visual tells of AI-generated design … Modeled on Wikipedia's Signs of AI writing". It warns: "One match is noise."
  - It also says: "Do not use this list to harass people … misidentifying a human designer's work as AI causes real harm" — [README](https://github.com/febbhav/signs-of-ai-design) [V]
  - HN 2 pts (2026-07-26) — [HN item 49063374](https://news.ycombinator.com/item?id=49063374) [V via Algolia]
- **Other anti-slop design skills (metadata only):** superdesigndev/superdesign-skill 842 stars; Trystan-SA/claude-design-system-prompt 2,000; Yu-369/VibeCurb 985; educlopez/ui-craft 392; codeswithroh/tastemaker 477 — [gh search repos "ai slop" / "anti-slop", 2026-10-19](https://github.com/search?q=ai+slop&type=repositories&s=stars) [V metadata]
- "Vibe Check by MUVING MEDIA" (Product Hunt) reportedly gives a "Vibe Score" and "generates fix prompts for tools like Cursor or Lovable" — [hunted.space listing](https://hunted.space/product/vibe-check-by-muving-media) [S]

**Copy/prose-slop tools**
- **Large skills:**
  - blader/humanizer: 58,323 stars · created 2026-01-18 · MIT. "Agent skill that removes signs of AI-generated writing from text" — [GitHub API](https://github.com/blader/humanizer) [V]
  - hardikpandya/stop-slop: 18,141 stars · pushed 2026-03-17 — [GitHub API](https://github.com/hardikpandya/stop-slop) [V]
  - petergyang/no-ai-slop: 12,560 stars · pushed 2026-09-02. "Removes 20+ patterns" — [GitHub API](https://github.com/petergyang/no-ai-slop) [V]
- **Scoring/lint tools:**
  - ItsssssJack/SlopMonster: 1,130 stars. "Lint for AI tells, cleanse with a rival model, lint again." — [GitHub API](https://github.com/ItsssssJack/SlopMonster) [V]
  - Aboudjem/humanizer-skill: 283 stars. "55 patterns, 5 voices, a 0-100 AI-tell score" — [GitHub API](https://github.com/Aboudjem/humanizer-skill) [V]
  - eric-tramel/slop-guard: 167 stars — [GitHub API](https://github.com/eric-tramel/slop-guard) [V]
  - FeedHive/ai-slop-detector: 79 stars. "120 patterns"; Show HN 1 pt (2026-10-12) — [HN item 50058453](https://news.ycombinator.com/item?id=50058453) [V]
- **AIStoryHub/etincel**: 9 stars · MIT. This is the best distribution blueprint for a deterministic linter.
  - It ships a "**deterministic audit** … as a CLI, a GitHub Action, and an MCP tool". "`audit_text` is plain deterministic code … not a model call."
  - It is listed in the official MCP Registry as `ai.etincel/etincel-nonfiction`, with the npm package `etincel` plus a Streamable HTTP remote `https://etincel.ai/api/mcp`. The README says: "so MCP-aware clients that auto-discover servers from there (VS Code's `@mcp` gallery, for one) find it" — [README](https://github.com/AIStoryHub/etincel), [registry API](https://registry.modelcontextprotocol.io/v0/servers?search=etincel) [V]
- **Vale, textlint, alex, write-good:**
  - tbhb/vale-ai-tells: Vale style package, 119 stars · created 2025-12-02 · pushed 2026-10-17 · MIT — [GitHub API](https://github.com/tbhb/vale-ai-tells) [V]
  - vale-cli/vale: 6,257 stars · pushed 2026-10-16 — [GitHub API](https://github.com/vale-cli/vale) [V]
  - textlint/textlint: 3,202 stars, active (pushed 2026-10-18). get-alex/alex (5,105) and btford/write-good (5,101) are stale, last pushed 2024-11-27 and 2025-03-10 — [GitHub API textlint](https://github.com/textlint/textlint), [alex](https://github.com/get-alex/alex), [write-good](https://github.com/btford/write-good) [V]
- **Sam Paech's tools:**
  - sam-paech/slop-forensics: 374 stars · last push 2025-11-01 · MIT. "A toolkit for generating & analyzing 'slop' — over-represented lexical patterns — in LLM outputs". It computes word/bigram/trigram over-representation, repetition and slop scores from LLM-generated datasets (`generate_dataset.py` prompts models) — [README](https://github.com/sam-paech/slop-forensics) [V]
  - sam-paech/antislop-sampler: 358 stars · Apache-2.0 · pushed 2026-03-05 — [GitHub API](https://github.com/sam-paech/antislop-sampler) [V]
- The registry also lists `com.desloppy/desloppy` ("Find the lines that make writing sound like AI", remote, published 2026-10-15) — [registry API](https://registry.modelcontextprotocol.io/v0.1/servers/com.desloppy%2Fdesloppy/versions/latest) [V]

**Code/PR-slop tools (adjacent only)**
- **dmmulroy/anti-slop**: 5,604 stars. "Opinionated Oxlint rules for rejecting low-evidence TypeScript and JavaScript patterns" — [GitHub API](https://github.com/dmmulroy/anti-slop) [V]
- **antfu/eslint-plugin-slop**: 121 stars · created 2026-09-02 — [GitHub API](https://github.com/antfu/eslint-plugin-slop) [V]
- **peakoss/anti-slop**: 842 stars · AGPL-3.0. A GitHub Action that "detects and automatically closes low-quality and AI slop PRs" — [GitHub API](https://github.com/peakoss/anti-slop) [V metadata]
- **Effect-TS/slopcop**: 33 stars. "A GitHub bot for triaging pull requests in the Effect repository". It is a GitHub App using check runs and is unrelated to design — [README](https://github.com/Effect-TS/slopcop) [V]
- **peteromallet/desloppify**: 3,183 stars — [GitHub API](https://github.com/peteromallet/desloppify) [V metadata]

**HN reception**
- Design-slop tools get single-digit HN points: Hallmark 7, Krebs 4, VibeCheck 4, Signs of AI Design 2, Taste Skill 3. By contrast, Kagi SlopStop got 589 pts (2025-11-13) and Agent Skills 544 pts (2026-02-03) — [HN Algolia API results 2026-10-19](https://hn.algolia.com/api/v1/search?query=AI%20design%20slop&tags=story) [V]
- A 2026-07-26 "Ask HN: Anyone know a good AI slop detection service" got 2 pts / 2 comments. A 2026-10-15 "Ask HN: How do you avoid building verbose AI slop designs?" got 1 pt / 5 comments — [HN item 49059537](https://news.ycombinator.com/item?id=49059537), [HN item 50099583](https://news.ycombinator.com/item?id=50099583) [V via Algolia]

### Inferences
- Slop-detect's "deterministic, zero-LLM" claim is no longer unique. Impeccable (61 rules, CLI + extension), Gesso (73), ux-skill (152), hayattcodes (40), kill-ai-slop and avoid-ai-design all claim determinism. Slop-detect's defensible differentiators are:
  - live-URL scoring from **computed styles in real Chromium** (most rivals statically scan source/HTML);
  - a **calibrated 0–100 with tiers** plus a published spec/version;
  - the **AEO axis**;
  - a **public no-auth API, leaderboard and badges**.
  Marketing and docs should say this explicitly.
- Stars accrue to skills distributed via `npx skills add`, and HN is not where this category wins attention (all design-slop tools scored ≤7 pts). Distribution through agent ecosystems (skills, plugins, MCP registry) is the growth lever, not launch posts.
- Krebs' design-slop-cop is MIT, uses the same architecture and has a labeled set (~150 sites, 5–10% FP) and a 1,590-site Show HN run. It is the most useful external benchmark or cross-validation partner for calibration (#213).
- Most of Krebs' list is already in slop-detect's catalogue (local `packages/core/src` IDs include `centered_hero`, `hero_eyebrow_pill`, `accent_stripe`, `numbered_steps`, `stat_banner`, `colored_glows`, `perma_dark_mode`, `slop_fonts`, `glassmorphism`, `all_caps_labels`, `cream_default_bg`). Visible gaps are:
  - the "single accented word in headline" tell (named by both Anthropic's skill and Krebs);
  - a shadcn/ui default-theme fingerprint;
  - the Claude terracotta accent (~#D97757) paired with `cream_default_bg`.
- Design-skill authors converge on "agent self-check" loops: taste-skill's browser check at three widths, Hallmark's 57 gates, ux-skill's lint→polish→re-lint to ≥90, avoid-ai-design's PostToolUse hook. A deterministic `scan_page` / local-file scanner that those skills can call is a natural integration point. Today they reimplement detection inside prompts or scripts.
- Name collision risk: "Slop Detector" is used by hayattcodes/Slop-Detector, SicariusSicariiStuff/SLOP_Detector, flamehaven01/AI-SLOP-Detector and others. Several unrelated "slopcheck" servers (YouTube policy checkers) are also in the MCP Registry.

### Gaps
- Not verified: whether Impeccable's CLI can scan a **live URL** with computed styles or only source files; its rule list; its exact CLI subcommand names. The README excerpt does not say, and impeccable.style docs were not opened.
- VibeCheck's repository, license and rule list were not found.
- Whether aiindigo's "SlopCop" is Krebs' tool could not be verified.
- No stylelint plugin for AI design tells was found in the searches run. No textlint rule package for AI-isms was checked. npm search was not performed.
- The rule lists of Hallmark (57 gates) and Gesso (73 rules) were not compared against slop-detect's 27+9 patterns.

## 2. AEO / GEO / agent-readiness auditing tools

### Takeaway
Google moved first and for free. **Lighthouse 13.2–13.5 (May–Sep 2026) added an "Agentic Browsing" category** with seven equal-weight audits: llms.txt, ARD manifest, agent accessibility tree, three WebMCP audits, and CLS. It is exposed through the PSI API since v13.4.1.

**Cloudflare's "Is Your Site Agent-Ready?"** probes a much wider protocol surface:
- robots.txt AI rules, Markdown negotiation, Content Signals, Web Bot Auth;
- MCP Server Card, Agent Skills, WebMCP, API Catalog, OAuth discovery, ARD;
- commerce protocols.

The open-source **ora/ax** CLI gates on `--min-score` and generates fix files.

Commercial "AEO graders" are LLM-prompting brand monitors, not page-readiness checkers:
- HubSpot's AI Search Grader queries ChatGPT/Perplexity/Gemini and scores sentiment and share of voice;
- Peec scrapes AI UIs.

Slop-detect's 8 AEO checks overlap Lighthouse on llms.txt. It lacks ARD, WebMCP, agent accessibility tree, MCP Server Card, API Catalog, OAuth discovery, Content Signals and Web Bot Auth checks.

### Cited Findings
**Lighthouse Agentic Browsing**
- Release history — [GoogleChrome/lighthouse releases](https://github.com/GoogleChrome/lighthouse/releases) [V]
  - v13.2.0 (2026-05-01): "agentic: add new agentic browsing category"; "config: implement llms.txt check for AI agents"; "enable and add new axe audits for agentic category"; WebMCP audits (`webmcp-form-coverage`, `webmcp-registered-tools`, `webmcp-schema-validity`).
  - v13.3.0 (2026-05-07): "New agentic browsing category added to default config".
  - v13.4.0 (2026-06-09): "viewer: disable agentic-browsing in PSI api call".
  - v13.4.1 (2026-07-20): "Enabled Agentic Browsing category via PSI API"; "Detailed error messages when fetching `robots.txt` or `llms.txt` fails".
  - v13.5.0 (2026-09-18): "group llms.txt and ARD audits under agent discovery".
- Category config: `agent-accessibility-tree`, `webmcp-form-coverage`, `webmcp-registered-tools`, `webmcp-schema-validity`, `cumulative-layout-shift`, `llms-txt` and `ard-schema`, each weight 1. Groups are WebMCP, Agent Accessibility and Agent Discoverability — [core/config/agentic-browsing-config.js](https://github.com/GoogleChrome/lighthouse/blob/main/core/config/agentic-browsing-config.js) [V]
- `llms-txt` audit: passes if the file has an H1 (`/^\s*#\s+.+/m`), is at least 50 characters and contains links. Fetch failures are reported — [core/audits/agentic/llms-txt.js](https://github.com/GoogleChrome/lighthouse/blob/main/core/audits/agentic/llms-txt.js) [V]
- `ard-schema` audit: validates an "Agentic Resource Discovery (ARD) manifest, served at `/.well-known/ard.json` or linked with `rel="ard"`". It flags legacy `/.well-known/ai-catalog.json` / `rel="ai-catalog"`. Validation is ported from the ards-project/ard-spec conformance test (spec: agenticresourcediscovery.org/spec/) — [core/audits/agentic/ard-schema.js](https://github.com/GoogleChrome/lighthouse/blob/main/core/audits/agentic/ard-schema.js) [V]
- Third-party coverage says a missing llms.txt (404) is "Not Applicable" and that results are a ratio of passed checks, not a 0–100 score. It also says WebMCP audits need a Chrome flag or origin trial. Google says Search does not use llms.txt — [DebugBear](https://www.debugbear.com/blog/lighthouse-agentic-browsing), [dbswebsite](https://www.dbswebsite.com/blog/google-lighthouse-agentic-ai-browsing-audit/), [the-decoder](https://the-decoder.com/google-tests-websites-for-llms-txt-and-agent-compatibility/) [S]

**Cloudflare "Is Your Site Agent-Ready?"** — [isitagentready.com](https://isitagentready.com/) [V]
- Scans "multiple emerging standards — from robots.txt and Markdown negotiation to MCP, OAuth, Agent Skills and agentic commerce" across 5 categories:
  - Discoverability: robots.txt, Sitemap, Link headers, DNS-AID.
  - Content Accessibility: Markdown content negotiation.
  - Bot Access Control: AI bot rules, Content Signals, Web Bot Auth.
  - Protocol Discovery: MCP Server Card, Agent Skills, WebMCP, API Catalog, OAuth discovery, OAuth Protected Resource, Auth.md, ARD, Personal Agent Protocol (Poppy).
  - Commerce: x402, MPP, UCP, ACP.
- Site-type presets: Content Site vs API/Application.
- "Copy the instructions below and paste them into your coding agent". The recommendations are "AI-generated … Cloudflare assumes no liability".

**ora/ax**: 29 stars · created 2026-08-10 · MIT — [README ora/ax](https://github.com/ora/ax) [V]
- `npx ax audit https://stripe.com`: "No account, no API key"; `--min-score <n>` "Exit 1 when the score is below n (0-100) — the CI gate".
- `webmcp-audit <url>` runs in a real browser.
- `generate-files <domain>` drafts "`ard.json`, `ai-catalog.json`, `poppy.json`, `llms.txt`, a `robots.txt` edit, an API catalog, MCP server cards".
- `deep-journey` runs a real AI agent against curated tasks.

**jdevalk/specification.website**: 912 stars · created 2026-05-29 · pushed 2026-10-19 — [README](https://github.com/jdevalk/specification.website) [V]
- "Platform-agnostic, sourced on every page, written for humans and agents", with an "Agent Readiness" section.
- MCP server at `https://mcp.specification.website/mcp`. Links isitagentready.com.

**HubSpot AI Search Grader**
- "a free, one-time check that reveals what ChatGPT, Perplexity, and Gemini say about you based on their training data". "Five dimensions … overall score out of 100"; "Sentiment Results (up to 40 points)" — [hubspot.com/aeo-grader](https://www.hubspot.com/aeo-grader) [V]
- HubSpot's comparison blog (updated 2026-08-04) gives the other weights: Presence Quality 20, Brand Recognition 20, Share of Voice 10, Market Competition 10. It also says the paid HubSpot AEO costs $50/month for 25 prompts — [blog.hubspot.com hubspot-vs-peec-ai](https://blog.hubspot.com/marketing/hubspot-vs-peec-ai) [V for HubSpot's own claims]
- The same blog says Peec AI "uses UI scraping to simulate real user sessions", with Starter at $95/month. It names Profound and Scrunch only in article titles — [blog.hubspot.com](https://blog.hubspot.com/marketing/hubspot-vs-peec-ai) [S]

**Open-source AEO building blocks**
- AnswerDotAI/llms-txt (spec repo): 2,663 stars · pushed 2026-09-24 — [GitHub API](https://github.com/AnswerDotAI/llms-txt) [V]
- ai-robots-txt/ai.robots.txt ("A list of AI agents and robots to block"): 4,201 stars · pushed 2026-10-18 · MIT — [GitHub API](https://github.com/ai-robots-txt/ai.robots.txt) [V]
- AEO/GEO skills and platforms:
  - AgriciDaniel/claude-seo: 19,224 stars ("26 sub-skills … GEO/AEO, age[nt readiness]")
  - onvoyage-ai/gtm-engineer-skills: 1,323
  - Auriti-Labs/geo-optimizer-skill: 1,121
  - elmohq/elmo: 470 (AEO tracking platform)
  — [GitHub API](https://github.com/AgriciDaniel/claude-seo) [V metadata]
- Many near-zero-star llms.txt validators exist, e.g. aiamatrix/llms-txt-validator ("CLI, Node library, and GitHub Action for validating llms.txt v2 format") and maxaeo/llms-txt-validator (CLI + Action) — [gh search "llms.txt validator" 2026-10-19](https://github.com/search?q=llms.txt+validator&type=repositories) [V metadata]
- The official MCP Registry already has llms.txt and SEO servers: `dev.llms-txt-validator/llms-txt-validator`, `de.llms-txt-generator/llms-txt`, `ai.inxy/seo-audit` (v1.3.1), `io.github.priyankark/lighthouse-mcp` (npm), plus several accessibility checkers — [registry API search](https://registry.modelcontextprotocol.io/v0/servers?search=llms) [V]

### Inferences
- The free Lighthouse/PSI category will commoditize "has llms.txt" checks. Slop-detect's AEO axis should:
  - add the discovery checks Lighthouse and Cloudflare now standardize (ARD, MCP Server Card, Content Signals);
  - report Lighthouse-compatible verdicts, so users do not get contradictory pass/fail answers;
  - keep its differentiators: AI-bot robots separation, Accept: text/markdown twin, `Vary`, indexability.
- Lighthouse's llms.txt rule is lenient (H1 + ≥50 chars + ≥1 link). #206's "strict grammar" should be presented as a second, stricter level, not a replacement.
- ora/ax's `generate-files` and Cloudflare's copy-paste agent instructions show that the market expects **fix artifacts**, not just findings. Slop-detect's `fix_prompt` covers design. An AEO counterpart could emit ready-to-commit robots.txt AI rules, a draft llms.txt, an ard.json skeleton and a Link header snippet, deterministically and with no LLM.
- HubSpot, Peec and Profound-style monitors measure brand perception by prompting LLMs. That is out of scope for a zero-LLM tool, but it is a positioning point: "we check whether AI *can* read and cite you; they check whether it *does*."

### Gaps
- No official developer.chrome.com doc page for the agentic audits was opened; the Lighthouse repo source and releases were used instead. Whether the production PSI API returns the category today was not tested.
- Profound, Otterly.ai and Scrunch (including Scrunch's agent-experience features) were not verified; the search budget was exhausted.
- The ARD spec (agenticresourcediscovery.org) and the MCP Server Card well-known path standard were not opened directly. The `/.well-known/mcp/server-card.json` path is only attested by Smithery docs (Section 5).
- Whether Cloudflare's scanner checks are deterministic or partly LLM-assisted beyond the recommendations is not stated.

## 3. Design-token / design-system extraction and linting

### Takeaway
Build on existing libraries instead of reimplementing:
- **`@google/design.md`** (Apache-2.0, 1.32M npm downloads/month) already provides `lint` (spec validation, broken token references, WCAG contrast, structured JSON) and `diff` (token- and prose-level regressions). The DESIGN.md format itself is still versioned "alpha".
- **dembrandt** (MIT, 3.7k stars, Playwright computed styles) already exports `--dtcg`, `--design-md`, `--tailwind`, `--shadcn` and `--wcag`, and is listed in the MCP Registry.
- **DTCG 2025.10** is a Candidate Recommendation that the group itself calls "stable".
- **Style Dictionary 5.7** (9.3M downloads/month) and **Terrazzo 2.9** (DTCG-native) are the build-side consumers.
- Project Wallace's **css-design-tokens** is EUPL-1.2, so check its license before bundling. **Firecrawl's `branding` format** is a hosted, AGPL-backed extractor with an LLM-flavoured "personality" field.

### Cited Findings
- **google-labs-code/design.md**: 28,422 stars · created 2026-04-10 · pushed 2026-10-16 · Apache-2.0 — [GitHub API](https://github.com/google-labs-code/design.md) [V]
  - "A DESIGN.md file combines machine-readable design tokens (YAML front matter or interleaved YAML code blocks) with human-readable design rationale".
  - `npx @google/design.md lint DESIGN.md` will "Validate a DESIGN.md against the spec, catch broken token references, check WCAG contrast ratios, and surface structural findings — all as structured JSON".
  - `npx @google/design.md diff DESIGN.md DESIGN-v2.md` will "detect token-level and prose regressions".
  - The spec field reads `version: <string> # optional, current: "alpha"` — [README](https://github.com/google-labs-code/design.md) [V]
  - npm `@google/design.md` 0.4.0 ("a linter and exporter for the DESIGN.md format"): 1,323,549 downloads last month — [npm registry](https://registry.npmjs.org/@google/design.md/latest), [downloads](https://api.npmjs.org/downloads/point/last-month/@google/design.md) [V]
  - HN: "Design.md: A format spec for describing a visual identity to coding agents", 37 pts (2026-04-24). Google blog: "Stitch's DESIGN.md format is now open-source" (2026-04-23) — [HN item 47887123](https://news.ycombinator.com/item?id=47887123) [V via Algolia]
- **VoltAgent/awesome-design-md**: 122,218 stars · created 2026-03-31 · MIT — [GitHub API](https://github.com/VoltAgent/awesome-design-md) [V]
  - VoltAgent/official-design-md: 524 stars ("Official DESIGN.md files published by companies themselves") [V metadata].
  - Meliwat/awesome-design-md-pre-paywall: 49 stars, "Reverted snapshot of VoltAgent/awesome-design-md before getdesign.md links were introduced" — [GitHub search metadata](https://github.com/Meliwat/awesome-design-md-pre-paywall) [V metadata]
- **DESIGN.md extractors:**
  - bergside/design-md-chrome: 3,039 stars ("Chrome extension to extract styles from any website and generate DESIGN.md files")
  - Railly/tinte: 625 ("Extract an identity from any reference, emit SKILL.md + tokens.css, lin[t]")
  - Paidax01/web-to-design-md: 436
  - uxKero/anydesign: 221
  — [GitHub API](https://github.com/bergside/design-md-chrome) [V metadata]
- **dembrandt/dembrandt**: 3,730 stars · created 2025-11-22 · pushed 2026-10-11 · MIT — [GitHub API](https://github.com/dembrandt/dembrandt) [V]
  - "Extract any website's design system in one command. Enforce it in CI." "dembrandt drives Chromium through `playwright-core`… reads computed styles from the DOM".
  - Flags: `--dtcg` ("W3C design tokens, for Style Dictionary or Tokens Studio"), `--design-md`, `--tailwind`, `--shadcn`, `--wcag` ("WCAG 2.1 contrast on real DOM pairs"), `--html`, `--brand-guide`, `--json-only` — [README](https://github.com/dembrandt/dembrandt) [V]
  - npm dembrandt 0.39.2: 20,296 downloads last month. MCP Registry: `io.github.dembrandt/dembrandt` (npm, v0.39.0–0.39.2) — [npm downloads](https://api.npmjs.org/downloads/point/last-month/dembrandt), [registry API](https://registry.modelcontextprotocol.io/v0/servers?search=dembrandt) [V]
- **Project Wallace:**
  - @projectwallace/css-analyzer 9.9.4 ("Check design tokens, complexity, specificity…"): 73,553 downloads/month; repo 366 stars, MIT.
  - @projectwallace/css-design-tokens 0.11.12: 2,242 downloads/month; repo 22 stars, **EUPL-1.2**. API: `css_to_tokens(css)` and `analysis_to_tokens(analysis)` produce "Design Tokens spec-compliant" output.
  - projectwallace/wallace-cli: 645 stars.
  — [README css-design-tokens](https://github.com/projectwallace/css-design-tokens), [GitHub API css-analyzer](https://github.com/projectwallace/css-analyzer), [npm](https://registry.npmjs.org/@projectwallace/css-analyzer/latest) [V]
- **cssstats/cssstats**: 2,814 stars, last push 2023-10-07 (stale) — [GitHub API](https://github.com/cssstats/cssstats) [V]
- **DTCG:** "Design Tokens Technical Reports 2025.10", status "Candidate Recommendation", "This specification is considered stable". It includes a Resolver module — [designtokens.org/TR/2025.10](https://www.designtokens.org/tr/2025.10/) [V]. design-tokens/community-group: 2,152 stars — [GitHub API](https://github.com/design-tokens/community-group) [V]
- **Style Dictionary:** style-dictionary/style-dictionary 4,867 stars · Apache-2.0 · pushed 2026-10-16; npm style-dictionary 5.7.0, 9,319,891 downloads last month — [npm](https://registry.npmjs.org/style-dictionary/latest) [V]
- **Terrazzo:** terrazzoapp/terrazzo 476 stars ("Use DTCG tokens JSON to generate code"); @terrazzo/cli 2.9.0 ("CLI for managing design tokens using the Design Tokens Community Group (DTCG) standard"), 393,216 downloads last month — [npm](https://registry.npmjs.org/@terrazzo/cli/latest) [V]
- **tokens-studio/sd-transforms**: 251 stars, last push 2025-12-10 — [GitHub API](https://github.com/tokens-studio/sd-transforms) [V]
- **Firecrawl `branding` format** (`formats: ['branding']`, 1 credit per scrape). It returns:
  - `colorScheme`, logo, primary/secondary/accent/background/text/link/semantic colors;
  - fonts and typography (families, sizes, weights, line heights);
  - spacing (base unit, radius, padding/margin);
  - button and input component styles, icons, images, animations/layout;
  - "Personality: tone, energy, and target audience".
  — [docs.firecrawl.dev/features/scrape](https://docs.firecrawl.dev/features/scrape) [V via WebFetch]. firecrawl/firecrawl: 192,943 stars, AGPL-3.0 — [GitHub API](https://github.com/firecrawl/firecrawl) [V]

### Inferences
- For #204 and #203:
  - Delegate DESIGN.md parsing, validation and diffing to `@google/design.md`, and reuse its JSON finding shape.
  - Differentiate on what it cannot do: check the **live page's computed styles** against the DESIGN.md tokens. That is slop-detect's existing 5-check compliance axis.
  - For extraction, either call dembrandt (MIT, same Playwright approach, already outputs DTCG and DESIGN.md) or emit DTCG via the MIT css-analyzer. Avoid bundling EUPL-1.2 code into the MIT core without a license review.
- The DESIGN.md format is "alpha" and very popular (122k-star collection, 1.3M downloads/month). Expect churn, so pin a spec version in `spec/config.json` and test against `@google/design.md` fixtures.
- DTCG 2025.10 is "Candidate Recommendation, considered stable", not a W3C Recommendation. Docs should use that wording.
- Firecrawl `branding` could be an *import source* (accept its JSON as a DESIGN.md surrogate). A dependency is not advisable given the AGPL, the hosted service and its non-deterministic "personality" fields.

### Gaps
- Whether Style Dictionary 5.x fully supports DTCG 2025.10 (including the Resolver module) was not confirmed; the README grep found no DTCG mention. Tokens Studio's DTCG 2025.10 status was not checked.
- The DESIGN.md spec's normative token types (beyond the README example) and `@google/design.md`'s exporter targets were not enumerated.
- dembrandt's licensing of its MCP server and its CI "enforce" mode details were not opened.

## 4. CI quality-gate patterns (Lighthouse CI, unlighthouse, pa11y-ci, axe, Playwright, Chromatic)

### Takeaway
Mature web-quality gates share six UX primitives:
1. eslint-style per-check assertion levels (`off`/`warn`/`error`) with numeric thresholds and presets (LHCI);
2. budgets: LHCI per-page `budgets.json` or unlighthouse's single `--budget N` with exit 1;
3. static `dist` auto-detection and a built-in server (LHCI `staticDistDir`);
4. sitemap-driven multi-URL runs with find/replace/exclude rewriting (pa11y-ci);
5. shareable report storage (LHCI "temporary-public-storage");
6. baselines per branch versus branch-to-branch review (Chromatic, Playwright golden files), plus GitHub status checks via a GitHub App.

Most of these map onto already-filed issues #207, #209, #210 and #211.

### Cited Findings
- **Lighthouse CI** — [docs/configuration.md](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md) [V]
  - Assertions are "keyed by the Lighthouse audit ID and follow an eslint-style format of `level | [level, options]`".
  - Levels: `warn` ("failure will not result in a non-zero exit code") and `error`. Properties: `minScore`, `maxLength`, `maxNumericValue`. Category assertions look like `"categories:accessibility": ["error", {"minScore": 1}]`. `--preset` (e.g. `lighthouse:recommended`), `--budgetsFile`, `aggregationMethod`.
  - Collect options: `staticDistDir`, `startServerCommand`, `numberOfRuns`, `isSinglePageApplication`, `psiApiKey`. Also `lhci healthcheck --fatal`.
  - getting-started: upload to "_temporary public_ storage" ("As the name implies, this is _temporary_ and _public_"), plus "GitHub Status Checks — GitHub App Method (Recommended)" — [docs/getting-started.md](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/getting-started.md) [V]
  - Repo 7,115 stars; @lhci/cli 0.15.1 had 7,140,567 downloads last month, but its last npm modification was 2025-06-25. treosh/lighthouse-ci-action: 1,291 stars, last push 2026-03-12 — [GitHub API](https://github.com/GoogleChrome/lighthouse-ci), [npm](https://registry.npmjs.org/@lhci/cli/latest) [V]
- **unlighthouse-ci**: "Auto-discovers every URL, runs Lighthouse on all of them in parallel, enforces a single budget". Example: `unlighthouse-ci --site https://staging.example.com --budget 80`, where "Exit code 1 = budget failed. Exit code 0 = all pages passed. That's the entire contract." `--build-static` produces a report.
  - Repo 4,904 stars; npm 190,453 downloads/month — [docs/2.integrations/1.ci.md](https://github.com/harlan-zw/unlighthouse/blob/main/docs/2.integrations/1.ci.md) [V]
- **pa11y-ci**: test "a list of URLs or a sitemap". Flags include `--sitemap`, `--sitemap-find`, `--sitemap-replace`, `--sitemap-exclude` and `--json`.
  - 642 stars · LGPL-3.0; 5.0.0 had 540,659 downloads/month — [README pa11y-ci](https://github.com/pa11y/pa11y-ci) [V]
- **@axe-core/playwright** 4.14.0: 52,927,938 downloads last month; dequelabs/axe-core-npm 727 stars, MPL-2.0 — [npm](https://registry.npmjs.org/@axe-core/playwright/latest) [V]
- **Playwright:** `await expect(page).toHaveScreenshot()`: "On first execution, Playwright test will generate reference screenshots" (golden files). "Browser rendering can vary based on the host OS … For consistent screenshots, run tests in the s[ame environment]" — [docs/src/test-snapshots-js.md](https://github.com/microsoft/playwright/blob/main/docs/src/test-snapshots-js.md) [V]
- **Chromatic:** "UI Tests: Verify changes on one branch (uses baselines)"; "UI Review: Compare two branches for changes (does not use baselines)" — [chromatic.com/docs/branching-and-baselines](https://www.chromatic.com/docs/branching-and-baselines/) [V]
- **GitHub workflow commands:** `echo "::error file=app.js,line=1::Missing semicolon"` creates annotations. Job summaries are "Accessible using environment file GITHUB_STEP_SUMMARY" — [docs.github.com workflow-commands](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands) [V]
- **SARIF upload:** use `github/codeql-action/upload-sarif@v4` with `security-events: write`.
  - The optional `category` "enables you to analyze the same commit in multiple ways". If the SARIF file lacks `partialFingerprints`, the action computes them.
  - Code scanning is available for "Public repositories on GitHub.com". "For private and internal repositories, code scanning is available when GitHub Code Security features are enabled" — [docs.github.com uploading-a-sarif-file](https://docs.github.com/en/code-security/how-tos/scan-code-for-vulnerabilities/integrate-with-existing-tools/uploading-a-sarif-file-to-github) [V]
- Effect-TS/slopcop (PR-slop bot) reports through GitHub check runs ("Check run is the…") — [README](https://github.com/Effect-TS/slopcop) [V partial]
- Competing AEO/prose gates already use the same contract: ora/ax `--min-score <n>` exits 1. Gesso's `check` exits 1 on slop. etincel ships a GitHub Action — [ora/ax README](https://github.com/ora/ax), [Gesso README](https://github.com/Gesso-Build/skills), [etincel README](https://github.com/AIStoryHub/etincel) [V]

### Inferences
- **For #207 (presets / `.sloprc.json`):**
  - Copy the LHCI assertion grammar verbatim so users already know it: `{"preset":"slop:recommended","assertions":{"gradient_text":"off","purple_accent":["warn"],"score":["error",{"maxScore":27}]}}`.
  - Copy kill-ai-slop's `--only/--skip/--rules` flags and the `deslop-ignore`-style inline directive precedent.
- **For #209 (ratchet):** Chromatic's distinction is the right mental model. "UI Tests" means comparing against an accepted baseline per branch; "UI Review" means base-vs-PR diff. Store accepted baselines and render reports at stable slop-detect.com permalinks, the analog of LHCI temporary-public-storage. Slop-detect already has public share and report infrastructure.
- **For #210 (dist/sitemap):** offer both LHCI's per-page budgets and unlighthouse's single `--budget` contract. Add pa11y-ci-style `--sitemap-find/--sitemap-replace` for staging hosts.
- **For #211 (SARIF):** SARIF only reaches the Security tab for public repos, or for private repos with GitHub Code Security. Always also emit a `$GITHUB_STEP_SUMMARY` table and `::warning`/`::error` annotations. Use `category` per URL.
- Browser caching (e.g. caching `~/.cache/ms-playwright`) matters only if the Action moves from the hosted API to local Chromium (#210 static scanning). dembrandt notes it reuses the Playwright cache.

### Gaps
- LHCI's `budgets.json` schema, and whether LHCI is still actively released (the npm package was last modified 2025-06-25), were not checked in depth.
- The GitHub annotation-count limits per step/job were not captured from the docs page.
- The pa11y-ci threshold option was not confirmed in the README grep.

## 5. Agent distribution channels as of Oct 2026 (MCP Registry and spec, MCP Apps, Agent Skills, plugins, marketplaces)

### Takeaway
Reach ranking:
1. **Agent Skills via `npx skills`**: 23.8M npm downloads/month and 80 supported agents. Slop-detect already has a compliant `SKILL.md`, so this is near-zero effort.
2. **The official MCP Registry**: still "preview", but it auto-feeds the GitHub MCP Registry / VS Code `@mcp` gallery and downstream marketplaces. It needs `server.json`, `mcpName` and an OIDC publish step.
3. **A remote Streamable HTTP MCP endpoint at slop-detect.com**. This is the prerequisite for:
   - ChatGPT/Codex plugin-directory submission (needs a "stable, public HTTPS endpoint");
   - Smithery URL publishing;
   - zero-install use in Copilot cloud agent and claude.ai.
4. **The Claude Code plugin marketplace**: `.claude-plugin/marketplace.json` plus a directory submission form.
5. **Cursor**, via the cross-vendor **Agent Plugins 1.0** `plugin.json` and MCP install deeplinks. The marketplace itself is manually reviewed.
6. **MCP Apps** (spec 2026-01-26 Stable; ChatGPT, Claude, VS Code, Goose) for an inline score-card UI.

The newest MCP spec revision, **2026-07-28**, is a breaking redesign: it is stateless, drops sessions and `initialize`, adds `server/discover`, and deprecates Sampling, Roots and Logging. Any new remote endpoint should target it from day one.

### Cited Findings
**Official MCP Registry**
- Launched in preview on September 8, 2025 by David Soria Parra, Adam Jones, Tadas Antanavicius, Toby Padilla and Theodora Chu. The post says: "Public subregistries like opinionated 'MCP marketplaces' associated with each MCP client are free to augment and enhance data they ingest from the upstream MCP Registry". The preview "does not provide data durability guarantees" — [MCP blog 2025-09-08](http://blog.modelcontextprotocol.io/posts/2025-09-08-mcp-registry-preview/) [V]
- The docs still say, as of 2026-10-19: "The MCP Registry is currently in preview. Breaking changes or data resets may occur before general availability." The latest registry release is v1.8.1 (2026-08-06) — [registry docs FAQ](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/faq.mdx), [registry releases](https://github.com/modelcontextprotocol/registry/releases) [V]. modelcontextprotocol/registry: 7,379 stars [V]
- **`server.json` (npm):**
  - Fields: `"$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json"`, `name` (e.g. `io.github.username/…`), `title`, `description`, `version`, and `packages[]` with `{"registryType":"npm","identifier":…,"version":…,"transport":{"type":"stdio"}}`.
  - Only the npm public registry is supported.
  - "The MCP Registry verifies ownership of npm packages by checking `mcpName` in `package.json`. The `mcpName` property **MUST** match the server name from `server.json`."
  — [package-types.mdx](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/package-types.mdx) [V]
- **MCPB packages:** `"registryType": "mcpb"` points to a GitHub/GitLab release asset URL with `fileSha256`. "The MCPB package URL … **MUST** contain the string 'mcp'" — [package-types.mdx](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/package-types.mdx) [V]. modelcontextprotocol/mcpb ("Desktop Extensions: One-click local MCP server installation in desktop apps"): 2,143 stars [V]
- **Remote servers:** `"remotes": [{"type": "streamable-http", "url": …}]`. "A remote server MUST be publicly accessible." The registry "does not verify that you control the remote URL". It recommends DNS or HTTP auth "so the server name reflects that domain" — [remote-servers.mdx](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/remote-servers.mdx) [V]
- **Authentication:**
  - GitHub auth gives the `io.github.<username>/*` namespace via `mcp-publisher login github`, or GitHub OIDC in Actions.
  - Org namespaces require the org **Owner** role.
  - DNS auth uses a TXT record on the apex.
  - HTTP auth uses `https://example.com/.well-known/mcp-registry-auth` containing `v=MCPv1; k=ed25519; p=<PUBLIC_KEY>`, which yields the `com.example/*` namespace.
  — [authentication.mdx](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/authentication.mdx) [V]
- **CI publishing example:**
  - `on: push: tags: ["v*"]`, `permissions: id-token: write # Required for OIDC authentication`.
  - Publish to npm, then download `mcp-publisher_<os>_<arch>` from `releases/latest`.
  - Then `./mcp-publisher login github-oidc` and `./mcp-publisher publish`.
  - An optional `jq` step sets `server.json` `.version` from the tag.
  — [github-actions.mdx](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/github-actions.mdx) [V]
- **Aggregators** consume `GET /v0.1/servers` (cursor pagination) and "are expected to scrape … once per hour" — [registry-aggregators.mdx](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/registry-aggregators.mdx) [V]
- **GitHub MCP Registry:** "Developers will be able to self-publish MCP servers directly to the OSS MCP Community Registry. Once published, those servers will automatically appear in the GitHub MCP Registry". It also promises "Discoverability inside VS Code with one-click installation" — [GitHub blog "Meet the GitHub MCP Registry" (HN-submitted 2025-09-17)](https://github.blog/ai-and-ml/github-copilot/meet-the-github-mcp-registry-the-fastest-way-to-discover-mcp-servers/) [V]
- **VS Code:** "enter @mcp in the search field. This shows the list of available MCP servers in the gallery". There is also an experimental "Customization Marketplace" (`chat.customizations.marketplace.enabled`) — [code.visualstudio.com MCP servers doc](https://code.visualstudio.com/docs/copilot/customization/mcp-servers) [V]
- **Copilot cloud agent and code review** use repository-level MCP config (`mcpServers` JSON). Copilot "will not ask for your approval before using them".
  - They "only support MCP tools. They do not currently support resources or prompts".
  - They "do not currently support remote MCP servers that leverage OAuth".
  — [docs.github.com extend-coding-agent-with-mcp](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/extend-coding-agent-with-mcp) [V]
- Slop-detect is **not** in the official registry; searching "slop" returned noslopui, slop-patterns, slopcheck, desloppy, useslop and timeslope. Competitors that are listed include `io.github.dembrandt/dembrandt`, `ai.etincel/etincel-nonfiction` and `io.github.priyankark/lighthouse-mcp` — [registry API search "slop"](https://registry.modelcontextprotocol.io/v0/servers?search=slop) [V]

**MCP specification**
- Revisions present: 2024-11-05, 2025-03-26, 2025-06-18, 2025-11-25, **2026-07-28**, draft — [schema directory](https://github.com/modelcontextprotocol/modelcontextprotocol/tree/main/schema) [V]
- **2026-07-28 major changes** — [2026-07-28 changelog](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/changelog.mdx) [V]
  - Protocol-level sessions and `Mcp-Session-Id` are removed.
  - "Make MCP stateless: remove the `initialize`/`notifications/initialized` handshake". The protocol version and client capabilities move into per-request `_meta`.
  - "servers MUST implement" `server/discover`.
  - `subscriptions/listen` replaces the GET stream and `resources/subscribe`.
  - `ping` and `logging/setLevel` are removed.
  - Tasks move to the extension `io.modelcontextprotocol/tasks`.
  - Multi Round-Trip Requests (`InputRequiredResult`) replace server-initiated `elicitation/create`, `sampling/createMessage` and `roots/list`.
  - A required `resultType` is added; SSE resumability is removed.
- **2026-07-28 minor changes:**
  - An `extensions` capability.
  - "Servers SHOULD return tools from `tools/list` in a deterministic order".
  - Required `Mcp-Method` / `Mcp-Name` headers.
  - `ttlMs`/`cacheScope` on list and read results.
  - "Loosen `inputSchema` and `outputSchema` to allow any JSON Schema 2020-12 keywords, and `structuredContent` to allow any JSON value".
- **2026-07-28 deprecations:** Roots, Sampling and Logging (SEP-2577); HTTP+SSE; Dynamic Client Registration in favour of Client ID Metadata Documents. There is a 12-month minimum deprecation window — [same changelog](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/changelog.mdx) [V]
- **2025-11-25 additions:** icons for tools, resources and prompts (SEP-973); tool-name guidance (SEP-986); URL-mode elicitation; sampling tool calling; experimental tasks (SEP-1686); JSON Schema 2020-12 as default — [2025-11-25 changelog](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/changelog.mdx) [V]
- **TypeScript SDK:** v2.3.1 and 1.32.1 (both 2026-10-05). v2 is split into `@modelcontextprotocol/server`, `client`, `core`, `server-legacy` and `codemod`.
  - Release notes mention serving the Tasks extension "on a 2026-07-28 connection" and `server/discover` probes. A "stateless Streamable HTTP transport handles one request".
  - Slop-detect-mcp depends on `@modelcontextprotocol/sdk ^1.29.0`.
  — [typescript-sdk releases](https://github.com/modelcontextprotocol/typescript-sdk/releases), local `packages/mcp/package.json` [V]

**MCP Apps (SEP-1865 lineage) and OpenAI**
- modelcontextprotocol/ext-apps: 2,978 stars; SDK v2.0.3 (2026-09-25).
  - Spec table: "**2026-01-26** | Stable"; draft | Development.
  - Supported clients: ChatGPT, Claude, VS Code (VS Code blog 2026-01-26), Goose, Postman, MCPJam, mcp-use, Alpic.
  - It ships 4 Agent Skills and a Claude Code marketplace: `/plugin marketplace add modelcontextprotocol/ext-apps`.
  — [ext-apps README](https://github.com/modelcontextprotocol/ext-apps) [V]
- Migration map: OpenAI `_meta["openai/..."]` becomes `_meta.ui.*`; `text/html+skybridge` becomes `text/html;profile=mcp-app`; helpers are `registerAppTool()` and `registerAppResource()` — [migrate_from_openai_apps.md](https://github.com/modelcontextprotocol/ext-apps/blob/main/docs/migrate_from_openai_apps.md) [V]
- "ChatGPT implements the open MCP Apps standard for UI returned…" — [developers.openai.com MCP Apps in ChatGPT](https://developers.openai.com/apps-sdk/mcp-apps-in-chatgpt/) [V]
- **OpenAI plugin directory (ChatGPT + Codex)** — [developers.openai.com submission](https://developers.openai.com/apps-sdk/deploy/submission) [V via WebFetch]
  - Submissions are ZIP uploads. Plugins "can include MCP connections, skills, or both".
  - Remote MCP needs a "stable, public HTTPS endpoint", and each plugin may connect one MCP server.
  - Domain verification uses `/.well-known/openai-apps-challenge`. Auth may be none, OAuth or mixed; API-key and bearer flows are unsupported.
  - Website, support, privacy and ToS URLs are required. "Initial MCP app review requires exactly five positive and three negative cases", plus a demo video.
  - "Skills-only plugins … skip the MCP review cases and demo recording". "OpenAI scans your hosted MCP server daily".
  - It references an "Agent Plugins" portable manifest (`plugin.json` with an `extensions.com.openai` section).

**Agent Skills and skills.sh**
- Spec: `SKILL.md` frontmatter has `name` (required, max 64, lowercase/hyphens), `description` (required, max 1024), optional `license`, `compatibility` (max 500), `metadata` (string map) and `allowed-tools` (experimental). Optional `scripts/`, `references/` and `assets/` folders; progressive disclosure — [agentskills specification.mdx](https://github.com/agentskills/agentskills/blob/main/docs/specification.mdx) [V]. agentskills/agentskills: 26,294 stars; HN "Agent Skills" 544 pts (2026-02-03) — [HN item 46871173](https://news.ycombinator.com/item?id=46871173) [V]
- **vercel-labs/skills (`npx skills`):** 35,583 stars. npm `skills` 1.7.2 had **23,786,800 downloads last month** — [npm downloads](https://api.npmjs.org/downloads/point/last-month/skills) [V]
  - It "Supports OpenCode, Claude Code, Codex, Cursor, and 75 more". Usage: `npx skills add owner/repo [--skill …] [--agent claude-code] [-g]`.
  - Anonymous install telemetry ("GitHub repository and skill identifiers are sent only for repositories that GitHub positively confirms are public"). It powers the skills.sh directory and badges `https://skills.sh/b/<owner>/<repo>`.
  — [README vercel-labs/skills](https://github.com/vercel-labs/skills) [V]
  - Show HN "Agent Skills Leaderboard" (skills.sh): 135 pts (2026-01-20) — [HN item via Algolia](https://hn.algolia.com/api/v1/search?query=agent%20skills&tags=story) [V]
- Competing design skills distribute exactly this way: taste-skill, Hallmark, kill-ai-slop, Gesso and anti-slop all use `npx skills add` (see Section 1) [V]

**Claude Code plugins**
- "A plugin marketplace is a directory or repository with a `.claude-plugin/marketplace.json` file" requiring `name`, `owner` and `plugins[]`. Each entry needs `name` + `source`.
  - Source types: relative path, `{"source":"github","repo":…}`, `{"source":"git-subdir","url":…,"path":…}` (monorepos), and `npm`.
  - Validate with `claude plugin validate`. Install with `/plugin marketplace add …` and `/plugin install <name>@<marketplace>`. "Offering a plugin to everyone: submit it to Anthropic's directory."
  — [code.claude.com plugin-marketplaces](https://code.claude.com/docs/en/plugin-marketplaces) [V]
- **anthropics/claude-plugins-official** (43,044 stars): "Third-party partners can submit plugins … use the plugin directory submission form". Plugin layout is `.claude-plugin/plugin.json`, `.mcp.json`, `commands/`, `agents/`, `skills/`.
  - "The `name` field … is an **immutable slug**". `strict: false` skill-bundle plugins are allowed.
  — [README](https://github.com/anthropics/claude-plugins-official) [V]

**Cursor and Agent Plugins**
- "Cursor supports the Agent Plugins open standard alongside its own plugin format". Agent Plugins use "a plugin.json manifest at the plugin root, packaging skills and MCP servers". Cursor Plugins use `.cursor-plugin/plugin.json` and add rules, agents, commands and hooks.
- "Plugins are distributed as Git repositories and submitted through the Cursor team. Every plugin is manually reviewed before it's listed". Community plugins and MCP live at cursor.directory. Team marketplaces: Teams get 1, Enterprise unlimited.
— [cursor.com/docs/plugins](https://cursor.com/docs/plugins) [V]
- Marketplace launched with Cursor 2.5 on 2026-02-17 — [classmethod](https://dev.classmethod.jp/en/articles/cursor-customize-integrated-management/), [Firecrawl blog](https://www.firecrawl.dev/blog/best-cursor-plugins) [S]
- **Agent Plugins** is "an open, vendor-neutral standard for packaging reusable components into portable plugins".
  - Its TSC Core Maintainers come from Amazon, Cursor, Microsoft, OpenAI and Vercel. Version 1.0.0.
  - `plugin.json` is required, `skills/` holds Agent Skills, and `mcp.json` declares stdio or Streamable HTTP servers. Client extensions live under reverse-domain namespaces.
  - Schema: `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`.
  — [agent-plugins.org](https://agent-plugins.org) [V via WebFetch]
- Cursor MCP deeplink: `cursor://anysphere.cursor-deeplink/mcp/install?name=$NAME&config=$BASE64_ENCODED_CONFIG` — [cursor.com/docs/context/mcp/install-links](https://cursor.com/docs/context/mcp/install-links) [V]

**Smithery, Glama, PulseMCP**
- **Smithery publish** — [smithery.ai/docs/build/publish](https://smithery.ai/docs/build/publish) [V]
  - Two routes: "URL" (a "public HTTPS URL"; "Smithery handles client registration automatically via Client ID Metadata Documents") or "Local (MCPB Bundle)".
  - "Smithery scans your server to extract metadata (tools, prompts, resources)".
  - Fallback: a "static server card at `/.well-known/mcp/server-card.json`".
- The Smithery CLI repo now appears as arcadeai-labs/smithery-cli: 844 stars, AGPL-3.0, last push 2026-05-31 — [GitHub API](https://github.com/arcadeai-labs/smithery-cli) [V metadata; ownership change not verified]
- punkpeye/awesome-mcp-servers: 96,600 stars — [GitHub API](https://github.com/punkpeye/awesome-mcp-servers) [V metadata]

### Inferences
**Channel ranking for slop-detect (reach × effort)**

| # | Channel | Evidence of reach | Exact artifacts | Effort |
|---|---|---|---|---|
| a | Agent Skills / skills.sh | `skills` CLI 23.8M downloads/month; 80 agents; competitors gained 30k–99k stars this way | Existing `skills/slop-detect/SKILL.md`; README `npx skills add ravidsrk/slop-detect`; skills.sh badge | very low |
| b | Official MCP Registry → GitHub MCP Registry, VS Code `@mcp`, aggregators | Auto-propagation per GitHub blog and etincel | `packages/mcp/server.json` (schema 2025-12-11); `"mcpName"` in `packages/mcp/package.json`; `mcp-publisher login github-oidc` (or `login http` for `com.slop-detect/*`); `mcp-publisher publish` in `publish.yml` | low |
| c | Claude Code marketplace and official directory | anthropics/claude-code 152k stars; directory 43k stars | `.claude-plugin/marketplace.json` at repo root + `plugins/slop-detect/.claude-plugin/plugin.json`, `.mcp.json`, `skills/`; submission form | low |
| d | Remote MCP at `https://slop-detect.com/mcp` | Unlocks OpenAI directory, Smithery URL publish, claude.ai/ChatGPT connectors, Copilot cloud agent (no OAuth needed because the API is no-auth) | Pages Function implementing stateless Streamable HTTP (2026-07-28 + 2025-11-25 compat); `remotes` in `server.json`; `/.well-known/mcp/server-card.json`; `/.well-known/mcp-registry-auth` | medium |
| e | Cursor / Agent Plugins | Cursor plus other Agent-Plugins clients | Root `plugin.json` per agent-plugins.org 1.0.0 schema with `skills/` + `mcp.json`; "Add to Cursor" deeplink; cursor.directory listing; marketplace submission | low |
| f | MCP Apps score-card UI | ChatGPT, Claude, VS Code, Goose render it | `@modelcontextprotocol/ext-apps` `registerAppTool`/`registerAppResource`, `text/html;profile=mcp-app` | medium (needs d) |
| g | OpenAI ChatGPT/Codex directory | Very large end-user reach | ZIP with skills (+ MCP); `/.well-known/openai-apps-challenge`; privacy/ToS pages; 5+3 test cases; demo video | medium-high (a skills-only plugin is lower) |

**Implications for slop-detect-mcp:**
- Copilot cloud agent and code review ignore MCP resources and prompts. Tools must stay self-sufficient, which tempers #212's resource/prompt emphasis for that channel.
- The new spec deprecates Sampling, Roots and Logging. Do not design new features around them; use the MRTR pattern for any input requests.
- Registry naming: `com.slop-detect/slop-detect` via HTTP auth (slop-detect.com is owned) is more trustworthy than `io.github.ravidsrk/slop-detect`. The registry docs explicitly recommend domain auth when the remote URL is on your domain.

### Gaps
- **Glama and PulseMCP listing mechanics could not be verified.** The pulsemcp.com/submit page returned a bot-protection block, Glama was not fetched, and the search budget was exhausted.
- Whether VS Code's `@mcp` gallery reads the official registry directly or through the GitHub MCP Registry, and the sync latency, is not documented in the pages opened.
- The OpenAI docs navigation lists "Submit a Claude Code plugin", but the WebFetch summary of the page found no Claude Code acceptance language. This is unresolved.
- Cursor Marketplace reach numbers were not found. Which clients besides Cursor load Agent Plugins 1.0 was not confirmed; the agent-plugins.org page names no clients.
- Install counts on skills.sh for competitors (Impeccable, Hallmark, Gesso) were not retrieved.

## 6. npm supply-chain changes 2025–2026 and what slop-detect's 3-package monorepo should do now

### Takeaway
Classic npm tokens are gone, and write-capable granular tokens are capped at 90 days. Slop-detect's long-lived `NPM_TOKEN` with 2FA bypass is the legacy path npm is steering away from.

**Trusted Publishing (OIDC) is the recommended replacement.** It requires npm ≥ 11.5.1, Node ≥ 22.14.0, `id-token: write` and a per-package config on npmjs.com (owner, repo, workflow filename, optional environment, allowed actions). It produces automatic provenance for public repos.

The **May 2026 "Mini Shai-Hulud" compromise of TanStack** happened *despite* OIDC and provenance, because trust was repository-wide. The OIDC config must therefore be scoped to one workflow plus a protected environment, with frozen and script-free installs. npm 12 now blocks dependency lifecycle scripts by default.

### Cited Findings
- **Shai-Hulud (September 2025):** "On September 14, 2025, we were notified of the Shai-Hulud attack, a self-replicating worm … via compromised maintainer accounts by injecting malicious post-install scripts". GitHub carried out "Immediate removal of 500+ compromised packages".
  - GitHub's plan: required 2FA for local publishing, granular tokens with a 7-day lifetime, trusted publishing, deprecating classic tokens and TOTP (moving to FIDO), "Set publishing access to disallow tokens by default", and "Expand eligible providers for trusted publishing".
  — [GitHub blog "Our plan for a more secure npm supply chain"](https://github.blog/security/supply-chain-security/our-plan-for-a-more-secure-npm-supply-chain/) [V]
- HN: "Shai-Hulud malware attack: Tinycolor and over 40 NPM packages compromised", 1,233 pts (2025-09-16) — [HN item 45260741](https://news.ycombinator.com/item?id=45260741) [V via Algolia]
- **Shai-Hulud 2.0 (November 2025):** "Shai-Hulud Returns: Over 300 NPM Packages Infected", 1,038 pts (2025-11-24). The trigger.dev post-mortem "compromised a dev machine and raided GitHub org access" got 262 pts (2025-12-14) — [HN item 46032539](https://news.ycombinator.com/item?id=46032539), [HN item 46262021](https://news.ycombinator.com/item?id=46262021) [V via Algolia]
- **Token timeline:**
  - 2025-09-29: announced. New write tokens default to a 7-day expiry, max 90 days — [GitHub changelog 2025-09-29](https://github.blog/changelog/2025-09-29-strengthening-npm-security-important-changes-to-authentication-and-token-management/) [S: search summary]
  - 2025-11-05: classic token creation disabled; write tokens capped at 90 days; 2FA by default; a "Bypass 2FA" option for CI — [GitHub changelog 2025-11-05](https://github.blog/changelog/2025-11-05-npm-security-update-classic-token-creation-disabled-and-granular-token-changes/) [S: page opened but body not captured; details from search summary]
  - 2025-12-09: "We've permanently revoked all existing npm classic tokens". `npm login` now gives "a two-hour session token". "For CI/CD workflows, create granular access tokens … you may enable Bypass 2FA … (write tokens limited to 90 days maximum)". "2FA enforcement is shifting to become the default option for all new package publications" — [GitHub changelog 2025-12-09](https://github.blog/changelog/2025-12-09-npm-classic-tokens-revoked-session-based-auth-and-cli-token-management-now-available/) [V]
- **Trusted publishing requirements** (docs accessed 2026-10-19) — [docs.npmjs.com/trusted-publishers](https://docs.npmjs.com/trusted-publishers) [V]
  - "Trusted publishing requires npm CLI version 11.5.1 or later and Node version 22.14.0 or higher."
  - GitHub fields: Organization or user, Repository, **Workflow filename** (e.g. `publish.yml`), and optional **Environment name**.
  - "Allowed actions (optional): npm stage publish is always allowed. Choose whether this trusted publisher can also publish directly with npm publish or manage dist-tags with npm dist-tag". "Trusted publisher configurations created before May 20, 2026 are automatically set to allow npm publish only".
  - "The critical requirement is the id-token: write permission". "Trusted publishing currently supports only cloud-hosted runners". "Each package can have up to 10 trusted publishers". "Existing trusted publisher connections cannot be changed".
  - Hardening: "Select 'Require two-factor authentication and disallow tokens'". "configure your trusted publisher with stage-only permissions … requiring a maintainer to review and approve each package with 2FA". `npm stage approve` and related commands "require interactive authentication and cannot use OIDC tokens".
  - Provenance: "When you publish using trusted publishing from GitHub Actions or GitLab CI/CD, npm automatically generates and publishes provenance attestations … you don't need to add the --provenance flag". This applies only when "Publishing from a public repository" and "Publishing a public package".
  - Troubleshooting: an ENEEDAUTH error usually means the workflow filename does not match exactly. With `workflow_call`, "validation checks the calling workflow's name".
- **Mini Shai-Hulud, the TanStack case (2026-05-11)** — [Endor Labs analysis](https://www.endorlabs.com/learn/shai-hulud-compromises-the-tanstack-ecosystem-80-packages-compromised) [V; vendor analysis]
  - An orphaned commit pushed to a fork "triggered a GitHub Actions workflow run against the legitimate TanStack/router workflow surface". Trust had been granted "at the repository level rather than scoped to a specific protected branch and workflow file".
  - The result was 84 malicious @tanstack versions "all carrying valid SLSA provenance attestations". "Provenance … does not attest that the workflow was authorized to run." "TanStack had 2FA enabled on every team account. That did not stop the attack."
  - Recommended mitigations: "Scope npm OIDC trusted publishing to a specific workflow file on a specific protected branch"; `npm ci --ignore-scripts`; frozen lockfiles; treat fork-only commits as threat indicators; review `optionalDependencies` `github:` refs; "Do not treat npm provenance as a standalone security control".
  - The article's own counts are inconsistent (84 versions in the body vs "160+" in the title).
- Other reports: Socket/Aikido counted 373 malicious entries across 169 packages; the campaign is attributed to TeamPCP; an earlier wave on 2026-04-29 hit SAP packages — [Sonatype](https://www.sonatype.com/blog/mini-shai-hulud-npm-attack-more-than-2200-components-impacted), [BleepingComputer](https://www.bleepingcomputer.com/news/security/new-shai-hulud-malware-wave-compromises-600-npm-packages/amp/) [S]. HN "Mini Shai-Hulud Strikes Again: 314 npm Packages Compromised" got 391 pts (2026-05-19) — [HN item 48189368](https://news.ycombinator.com/item?id=48189368) [V via Algolia]
- **npm 12 (v12.0.0 release notes):** "Dependency lifecycle scripts are now blocked by default unless allowed by the root package's `allowScripts` policy. After installing, run `npm install-scripts approve`". Supported Node: `^22.22.2 || ^24.15.0 || >=26.0.0` — [npm/cli v12.0.0 release](https://github.com/npm/cli/releases/tag/v12.0.0) [V; release date not captured]
- **GitHub immutable releases:** "Git tags cannot be moved … cannot be changed, and cannot be deleted while the release exists", and assets cannot be modified — [docs.github.com immutable-releases](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/immutable-releases) [V]
- **Slop-detect's current `publish.yml`** (local) triggers on `push: tags: v*` and `workflow_dispatch`, with `environment: production`. Actions are SHA-pinned (`actions/checkout@34e1…`, `actions/setup-node@4993…` with `node-version: 22`, `oven-sh/setup-bun@0c50…`). It runs `bun install` (not frozen), then build and test, then checks the tag matches the package versions. It then runs three `npm publish --access public` steps with `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`. Packages are published under the individual npm account `ravindrakumar8088` — local `.github/workflows/publish.yml`, `docs/completion/STATUS.md` [V]

### Inferences
**Step-by-step plan for slop-detect-core, slop-detect and slop-detect-mcp:**
1. **Configure trusted publishers on npmjs.com.** For each of the three packages, use GitHub Actions with owner `ravidsrk`, repo `slop-detect`, workflow `publish.yml` and environment `production`. Set allowed actions to `npm stage publish` (always on). Enable `npm publish` only if you want unattended releases; leave `dist-tag` off.
2. **Protect the `production` environment.** Use deployment-branch/tag rules (only `v*` tags created from `main`) and a required reviewer. npm's config cannot pin a branch, so environment protection is how to "scope to a protected branch" (the TanStack lesson). Add a tag ruleset so only maintainers can create `v*` tags, and enable immutable releases.
3. **Edit `publish.yml`:**
   - Add `permissions: {contents: read, id-token: write}`.
   - Run npm ≥ 11.5.1. Either use Node 24 per npm's example, or `npm i -g npm@^11.5.1`. Inference, unverified: Node 22's bundled npm is 10.x.
   - Delete the `NPM_TOKEN` preflight and all `NODE_AUTH_TOKEN` env entries.
   - Install with `bun install --frozen-lockfile` and disable dependency lifecycle scripts in the publish job (inference: Bun flag semantics not re-verified here).
   - Keep the SHA pins.
   - Consider dropping `workflow_dispatch`, or gating it to the same environment.
4. **Optional human gate.** Publish with `npm stage publish`, then approve with `npm stage approve` under 2FA. This is valuable for a single-maintainer account.
5. **After the first OIDC publish:** confirm the provenance badge on all three npm pages. Then set each package to "Require two-factor authentication and disallow tokens", revoke the granular token, and delete the `NPM_TOKEN` secret.
6. **Publish to the MCP Registry in the same job.** Use the same `id-token: write` (`mcp-publisher login github-oidc` or HTTP-domain auth). Pin `mcp-publisher` to a version and checksum instead of `releases/latest` (inference: supply-chain hygiene).
7. **Reduce the bus factor.** Add a second npm maintainer or move the packages to an npm org. Note that core's unscoped `slop-detect-core` rename happens in `prepack`, which must keep working under OIDC.

### Gaps
- The exact 2025-11-05 changelog wording and the reason the revocation date moved from 2025-11-19 to 2025-12-09 were not captured.
- The npm 12.0.0 release date, and whether Node 24 LTS's bundled npm already satisfies ≥ 11.5.1, were not verified.
- The npm "Staged publishing for npm packages" doc page was not opened separately.
- The truncated note "Configurations created before Sep 03, 2026 require you to explicitly select at least one all[owed action] …" was not fully read.
- The Mini Shai-Hulud package counts conflict across vendors (84 / 160+ / 169 / 314 / "2,200 components").

## 7. GitHub Marketplace for Actions and quality-gate Action patterns

### Takeaway
GitHub Marketplace auto-lists only actions whose **`action.yml` sits at the repository root**, in a public repo, with a unique name, published through a release, by an account that accepted the Marketplace Developer Agreement and has 2FA. Slop-detect's composite Action lives at `packages/action/action.yml`, so it **cannot be listed as-is**. A dedicated `slop-detect-action` repo (synced on release, with immutable releases) is required.

Popular gates combine:
- exit-code contracts (`--min-score`, `--budget`);
- step summaries and file/line annotations;
- SARIF to code scanning (public repos);
- status or check runs (LHCI's GitHub App, Effect's slopcop bot).

### Cited Findings
- "Actions are published to GitHub Marketplace immediately and aren't reviewed by GitHub as long as they meet these requirements" — [docs.github.com publish-in-github-marketplace](https://docs.github.com/en/actions/how-tos/create-and-publish-actions/publish-in-github-marketplace) [V]
  - "The action must be in a public repository."
  - "Each repository must contain a single action metadata file (action.yml or action.yaml) at the root."
  - "Repositories may include other actions metadata files in sub-folders, but they will not be automatically listed in the marketplace."
  - "The name in the action's metadata file must be unique."
  - The "Publish" checkbox is disabled until the GitHub Marketplace Developer Agreement is accepted. "Publishing requires you to use two-factor authentication."
- Slop-detect's Action is at `packages/action/action.yml` (composite, `branding: icon: 'eye', color: 'gray-dark'`, inputs `url`, `fail-under`, `api-base`). README usage is `uses: ravidsrk/slop-detect/packages/action@v0.8.0` — local `packages/action/action.yml` [V]
- Marketplace validation mirrors exist for small competitors: `actions-marketplace-validations/JGalego_slopcop` and `actions-marketplace-validations/aiamatrix_llms-txt-validator`. This shows "slopcop" and an llms.txt validator Action are already in the listing pipeline — [gh search "slopcop" / "llms.txt validator" 2026-10-19](https://github.com/search?q=slopcop&type=repositories) [V metadata]
- Job summary, annotations, SARIF `category`/`partialFingerprints`, immutable releases and LHCI status checks: see Section 4 and Section 6 (docs.github.com, lighthouse-ci docs) [V]

### Inferences
- **New repo `ravidsrk/slop-detect-action`:**
  - Root `action.yml` (copied from `packages/action` by the release workflow) and a `v1` floating major tag plus immutable `vX.Y.Z` releases.
  - A unique Marketplace name, e.g. "Slop Detect — AI design slop gate". Check for collisions; "slopcop" is likely taken.
  - Keep the monorepo path working for existing users.
- **Action UX to add:**
  - Write a Markdown score table to `$GITHUB_STEP_SUMMARY`.
  - Emit `::warning`/`::error` annotations per pattern (no file/line for live URLs).
  - Add an optional `sarif: true` input with `upload-sarif` and `category: slop-detect/<url>` (#211).
  - Add an optional check run via `GITHUB_TOKEN` `checks: write`.
  - Keep the exit-code contract (`fail-under`) mirrored as `--min-score`-style naming for parity with ora/ax and unlighthouse.

### Gaps
- Whether workflow files in the action repo block listing was not verified; the current docs text did not include that rule in the excerpt read.
- Whether the name "Slop Detect" is free on the Marketplace was not checked.

## 8. Synthesis: competitor matrix and roadmap implications

### Takeaway
Slop-detect is technically differentiated but badly under-distributed: 14 stars and 32 MCP downloads/month, against Impeccable's 759k downloads/month and 61 deterministic rules. The highest-leverage roadmap work is distribution packaging on standards that now exist:
- Agent Skills / skills.sh;
- the official MCP Registry;
- the Claude Code marketplace;
- Agent Plugins for Cursor;
- a remote Streamable HTTP MCP endpoint (which unlocks ChatGPT/Codex and Smithery);
- a root-level Marketplace Action repo.

Supply-chain hygiene (OIDC trusted publishing scoped to a protected environment) should land first. On features, align the AEO axis with Lighthouse's new Agentic Browsing audits and Cloudflare's agent-readiness checks. Build DESIGN.md work on `@google/design.md` and dembrandt rather than reimplementing them.

### Cited Findings — Competitor matrix
(Sources and verification are given in Sections 1–5.)

| Tool | Type | Deterministic? | What it checks | Stars / activity (2026-10-19) | Overlap with slop-detect | What we should learn |
|---|---|---|---|---|---|---|
| Impeccable (pbakaus/impeccable) | Agent skill + CLI + browser extension + hooks | Yes for 61 detector rules; LLM for critique | AI-frontend design anti-patterns in agent workflows | 82,943 · pushed 10-19 · Apache-2.0; npm 759k/mo | High (design-slop rules) | One-command multi-harness install (`npx impeccable install`), hooks, browser extension; position slop-detect as live-URL/CI/AEO complement |
| Taste Skill (Leonxlnx) | Agent skills | No (agent checks in a real browser at 3 widths) | Art direction; fails pages on slop | 99,135 · 10-19 · MIT | Medium | Expose `scan_page` as the deterministic "browser check" such skills call |
| Hallmark (Nutlope / Together AI) | Agent skill | No (57 gates + self-critique by LLM) | Design gates; `audit`; `study URL` → design.md | 30,374 · 08-06 · MIT | Medium | `study` → DESIGN.md flow; theme catalog virality |
| Anthropic frontend-design | Agent skill (guidance) | No | Lists tells (single-word accent, cream #F4F1EA + terracotta #D97757, SaaS-card kit) | anthropics/skills 182,126 | Low (rules source) | Add the "single-word headline accent" and Claude-terracotta tells |
| Design Slop Cop (AdrianKrebs) | Web app + CLI | Yes (14 DOM/CSS patterns, headless browser) | Live URLs, 0–100 score | 18 · 07-07 · MIT | Very high (same architecture) | External benchmark: ~150 labeled sites (5–10% FP) and 1,590 Show HN scores |
| VibeCheck (vibecheck.fail) | Web scanner | Unclear (heuristics + screenshot, Puppeteer) | 45+ heuristics, 5 categories, 0–100 | Repo not found | Very high | Screenshot-based visual heuristics; "grade the vibe, not the toolchain" |
| kill-ai-slop (yetone) | Field guide + skill + scanner | Yes (static scan.mjs) | Source-code visual and copy tics | 1,370 · 09-15 · Apache-2.0 | Medium-high | `--rules` plugin files, `--only/--skip`, `deslop-ignore` directives (#207) |
| @gessobuild/anti-slop | npm CLI + skill | Yes (73 rules w/ thresholds) | Static `.html` inline/`<style>` CSS; `fix --write` | 91 · 10-18 · MIT | High (static) | Deterministic auto-fix; `check dist/ --json` (#210) |
| ux-skill (Laith0003) | Python engine + plugin + 18 MCP tools | Yes ("no LLM", 152 rules) | UI lint + synthesis; score ≥90 loop | 82 · 10-02 · MIT | Medium | lint→fix→re-lint loop with quality gate |
| avoid-ai-design (funboy322) | Claude skill + `detect.mjs` | Partly (detect.mjs yes) | 67 tells; PostToolUse hook | 114 · 09-24 · MIT | Medium | Ship a ready PostToolUse hook recipe (#212) |
| anti-slop rules (miqdadbadjuber) | Rulebook skill | No | 38 rules for agents | 6,490 · 10-16 · MIT | Low | Prevention rules + DESIGN.md pairing |
| hayattcodes/Slop-Detector | Chrome ext + CLI | Yes (40 detectors / 46 rules) | Live page DOM | 2 · 07-24 · none | High; **name collision** | Browser-extension form factor |
| slop-patterns (sloppatterns.com) | Remote MCP + library | Unclear | UI code AI-default patterns + fixes | 1 · 10-16 · MIT; registry 2026-10-12 | Medium | Already in MCP Registry: first-mover in registry search for "slop" |
| Signs of AI design (febbhav) | Field guide (CC BY-SA) | n/a | Visual tells across media | 27 · 07-31 | Low | Cite as rationale; harm-avoidance framing |
| humanizer / stop-slop / no-ai-slop | Writing skills | No (LLM rewrite) | AI-isms in prose | 58,323 / 18,141 / 12,560 | Low-medium (copy axis) | Wikipedia "Signs of AI writing" as shared taxonomy |
| etincel (AIStoryHub) | CLI + Action + MCP (npm + remote) | Yes | Prose AI tells | 9 · 08-15 · MIT | Low (copy) | **Distribution blueprint**: registry-listed npm + remote endpoint, VS Code @mcp discovery |
| vale-ai-tells / Vale | Prose linter package | Yes | AI-tell vocabulary/patterns | 119 / 6,257 | Low-medium | Export copy rules as a Vale style for docs CI |
| slop-forensics / antislop-sampler (Sam Paech) | Research toolkit / sampler | Lexical stats (requires LLM-generated corpora) | Over-represented words/n-grams | 374 (last push 2025-11-01) / 358 | Low | Vocabulary source for #201 |
| eslint-plugin-slop / anti-slop (Oxlint) | Code linters | Yes | Code slop | 121 / 5,604 | None (code) | Naming/positioning precedent |
| Lighthouse Agentic Browsing | Audit category (also PSI API) | Yes | llms.txt, ARD manifest, agent a11y tree, WebMCP ×3, CLS | lighthouse 30,907; v13.5.0 2026-09-18 | High (AEO) | Add ARD/WebMCP/agent-a11y; report Lighthouse-compatible verdicts |
| Is It Agent Ready? (Cloudflare) | Web scanner | Probes (recommendations AI-generated) | robots/sitemap/Link/DNS-AID, Markdown negotiation, Content Signals, Web Bot Auth, MCP Server Card, Agent Skills, WebMCP, API Catalog, OAuth, ARD, commerce | n/a (hosted) | High (AEO) | Site-type presets; copy-paste agent fix instructions |
| ora/ax | CLI (hosted audit) | Hosted checks + optional agent journeys | Agent readiness 0–100; WebMCP audit | 29 · 10-19 · MIT | Medium-high (AEO) | `--min-score` gate; `generate-files` (ard.json, llms.txt, robots edits, server cards) |
| HubSpot AI Search Grader / Peec AI | Brand-perception monitors | No (LLM prompting / UI scraping) | Sentiment, share of voice, citations | Commercial | Low (different question) | Positioning: "can AI read you" vs "does AI cite you" |
| dembrandt | CLI + MCP (registry) | Yes (Playwright computed styles) | Design-system extraction → DTCG, DESIGN.md, Tailwind, shadcn, WCAG | 3,730 · 10-11 · MIT; npm 20k/mo | High (DESIGN.md axis, extraction) | Reuse or align for #204 instead of reimplementing |
| @google/design.md | Spec + linter/differ CLI | Yes | DESIGN.md validation, broken refs, WCAG, diff | 28,422 · 10-16 · Apache-2.0; npm 1.32M/mo | High (DESIGN.md axis) | Build #203/#204 on its lint/diff JSON |
| Project Wallace css-analyzer / css-design-tokens | Libraries | Yes | CSS stats → DTCG tokens | 366 (MIT) / 22 (EUPL-1.2) | Medium | Use the MIT analyzer; license-review EUPL tokens lib |
| Firecrawl `branding` | Hosted API format | Partly (has "personality") | Colors, fonts, spacing, components, logo | firecrawl 192,943 · AGPL | Medium | Optional import source only |
| Lighthouse CI / unlighthouse / pa11y-ci | CI gates | Yes | Perf/a11y assertions, budgets, sitemaps | 7,115 / 4,904 / 642 | Pattern source | Assertion grammar, `--budget`, temporary public reports, status checks |

### Inferences — Roadmap implications
**NEW items**, ranked by reach × effort, with the security prerequisite first.

**P0 (prerequisite, risk reduction). NEW: Migrate npm publishing to OIDC Trusted Publishing, scoped to `publish.yml` + protected `production` environment.**
- Artifacts:
  - npmjs.com trusted-publisher configs for `slop-detect-core`, `slop-detect` and `slop-detect-mcp` ([docs.npmjs.com/trusted-publishers](https://docs.npmjs.com/trusted-publishers));
  - `publish.yml` changes: `id-token: write`, npm ≥ 11.5.1, no `NODE_AUTH_TOKEN`, frozen and script-free install;
  - environment protection and tag rulesets;
  - immutable releases ([docs](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/immutable-releases)).
- Acceptance criteria:
  - the `NPM_TOKEN` secret is deleted;
  - all three packages show npm provenance for the new version;
  - package settings read "Require 2FA and disallow tokens";
  - a forked-PR or `workflow_dispatch` run from a non-`main` ref cannot reach the `production` environment;
  - an optional dry-run uses `npm stage publish` and is approved via `npm stage approve`.

**1. NEW: Agent Skills / skills.sh distribution of the existing `skills/slop-detect/SKILL.md`.** Reach: very high; effort: very low.
- Artifacts:
  - verify that `npx skills add ravidsrk/slop-detect` installs it for claude-code, cursor and codex;
  - README install line plus skills.sh badge (`https://skills.sh/b/ravidsrk/slop-detect`);
  - a CI step validating frontmatter limits ([agentskills spec](https://github.com/agentskills/agentskills/blob/main/docs/specification.mdx));
  - optionally split into `slop-audit`, `aeo-audit` and `design-md-check` skills.
- Acceptance criteria:
  - an install succeeds in 3 agents;
  - a skills.sh page exists;
  - the skill invokes `npx slop-detect` / the API and returns the score and top fixes.

**2. NEW: Publish slop-detect-mcp to the official MCP Registry.** Reach: high via auto-propagation; effort: low.
- Artifacts:
  - `packages/mcp/server.json` (`$schema` `https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json`; `packages[0]` = npm `slop-detect-mcp`, stdio);
  - `"mcpName"` in `packages/mcp/package.json` matching the server name;
  - a domain namespace `com.slop-detect/slop-detect` via `/.well-known/mcp-registry-auth` HTTP auth (preferred), or `io.github.ravidsrk/slop-detect` via GitHub OIDC;
  - a `mcp-publisher publish` step after npm publish ([github-actions.mdx](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/github-actions.mdx)).
- Acceptance criteria:
  - `GET https://registry.modelcontextprotocol.io/v0.1/servers/<encoded-name>/versions/latest` returns the tag's version;
  - the server shows up in a VS Code `@mcp` search;
  - the version bump is automated from the git tag.

**3. NEW: Claude Code plugin + in-repo marketplace + official-directory submission.** Reach: high; effort: low.
- Artifacts:
  - `.claude-plugin/marketplace.json` at the repo root (name, owner, `plugins[]`);
  - `plugins/slop-detect/.claude-plugin/plugin.json`, `.mcp.json` (`npx -y slop-detect-mcp`) and `skills/` (reuse `SKILL.md`). Commands go in `/slop-scan`, `/slop-aeo`. Hooks ship only once #212's `--init-hooks` lands ([plugin-marketplaces docs](https://code.claude.com/docs/en/plugin-marketplaces));
  - the submission form linked from [claude-plugins-official](https://github.com/anthropics/claude-plugins-official).
- Acceptance criteria:
  - `claude plugin validate .` passes;
  - `/plugin marketplace add ravidsrk/slop-detect` + `/plugin install slop-detect@slop-detect` works;
  - the plugin name is frozen as an immutable slug.

**4. NEW: Remote MCP endpoint `https://slop-detect.com/mcp` (Streamable HTTP, stateless).** Reach: very high (unlocks #6, #8, Smithery, claude.ai/ChatGPT connectors and Copilot cloud agent without local install); effort: medium.
- Artifacts:
  - a Cloudflare Pages Function wrapping existing `/api/scan`, `/api/aeo` and `/api/fix-prompt`;
  - target 2026-07-28 (`server/discover`, no sessions, deterministic `tools/list` order, `ttlMs`/`cacheScope`) with 2025-11-25 fallback ([2026-07-28 changelog](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/changelog.mdx));
  - `remotes: [{type: "streamable-http", url: "https://slop-detect.com/mcp"}]` in `server.json`;
  - `/.well-known/mcp/server-card.json` ([Smithery publish](https://smithery.ai/docs/build/publish));
  - the existing per-origin rate limits apply.
- Acceptance criteria:
  - MCP Inspector, claude.ai custom connector and VS Code connect;
  - the Smithery URL-publish scan lists 4 tools;
  - no auth needed;
  - abuse limits are enforced.

**5. NEW: Agent Plugins 1.0 manifest for Cursor (and other compliant clients) + install deeplinks.** Reach: medium-high; effort: low.
- Artifacts:
  - root `plugin.json` per `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`, packaging `skills/` + `mcp.json` ([agent-plugins.org](https://agent-plugins.org), [Cursor plugins](https://cursor.com/docs/plugins));
  - an "Add to Cursor" link `cursor://anysphere.cursor-deeplink/mcp/install?name=slop-detect&config=<base64>` ([install-links](https://cursor.com/docs/context/mcp/install-links)) and a VS Code install button on README and slop-detect.com;
  - submission to the Cursor Marketplace (manual review) and cursor.directory.
- Acceptance criteria:
  - the plugin loads via Cursor Customize;
  - the deeplink installs a working MCP server.

**6. NEW: GitHub Marketplace-listable Action repo.** Reach: medium; effort: low-medium.
- Artifacts:
  - `ravidsrk/slop-detect-action` with root `action.yml` synced from `packages/action` on release;
  - immutable releases plus a `v1` major tag;
  - `$GITHUB_STEP_SUMMARY` table, `::warning`/`::error` annotations, optional `upload-sarif` with `category` ([Marketplace requirements](https://docs.github.com/en/actions/how-tos/create-and-publish-actions/publish-in-github-marketplace)).
- Acceptance criteria:
  - a Marketplace listing is live;
  - `uses: ravidsrk/slop-detect-action@v1` works;
  - the summary renders on a PR;
  - the monorepo path keeps working.

**7. NEW: AEO "agent discovery" parity checks with Lighthouse 13.5 and Cloudflare's agent-ready scan.** Reach: medium; effort: medium.
- Artifacts — new deterministic checks with spec links:
  - ARD manifest at `/.well-known/ard.json` or `rel="ard"`, flagging legacy `ai-catalog` ([Lighthouse ard-schema.js](https://github.com/GoogleChrome/lighthouse/blob/main/core/audits/agentic/ard-schema.js), agenticresourcediscovery.org/spec);
  - MCP Server Card at `/.well-known/mcp/server-card.json`;
  - a Content Signals directive in robots.txt;
  - optional WebMCP presence (`document.modelContext` tools);
  - each AEO result carries a `lighthouseEquivalent` id (`llms-txt`, `ard-schema`).
- This is distinct from #206, which covers llms.txt strictness, crawler separation and Markdown for Agents.
- Acceptance criteria:
  - fixture parity with Lighthouse 13.5 on `llms-txt` and `ard-schema` pass/fail;
  - counts served from `/api/patterns` (never hardcoded, per AGENTS.md);
  - `spec/` updated.

**8. NEW: MCP Apps score-card UI.** Reach: medium-high (visual, shareable in ChatGPT, Claude and VS Code); effort: medium; depends on #4.
- Artifacts: `@modelcontextprotocol/ext-apps` `registerAppTool`/`registerAppResource` with a `text/html;profile=mcp-app` resource rendering score, tier, top patterns and AEO checks in the dark/monospace brand ([ext-apps](https://github.com/modelcontextprotocol/ext-apps); spec 2026-01-26 Stable).
- Acceptance criteria:
  - renders in the MCP Apps basic-host and Claude;
  - hosts without UI receive identical text plus `structuredContent`.

**9. NEW: OpenAI ChatGPT/Codex plugin listing.** Reach: high; effort: medium-high.
- Start with a **skills-only plugin**, which skips MCP review cases and the demo. Then add the remote MCP from #4.
- Artifacts ([submission docs](https://developers.openai.com/apps-sdk/deploy/submission)):
  - `/.well-known/openai-apps-challenge`;
  - privacy, ToS and support pages;
  - 5 positive + 3 negative test cases;
  - a demo video.
- Acceptance criteria: approved directory listing.

**10. NEW: Deterministic AEO fix-file generator.** Reach: medium; effort: medium.
- An MCP tool / CLI `--emit-aeo-fixes` that writes robots.txt AI-bot rules (sourced from [ai-robots-txt/ai.robots.txt](https://github.com/ai-robots-txt/ai.robots.txt)), a draft llms.txt from the sitemap, an ard.json skeleton and Link-header snippets. It mirrors ora/ax `generate-files` ([ora/ax](https://github.com/ora/ax)) but with zero LLM.
- Acceptance criteria:
  - generated files pass slop-detect's own AEO checks and Lighthouse `llms-txt`/`ard-schema`;
  - output is byte-identical across runs.

**11. NEW (low effort, SEO and interop): Pattern crosswalk in `spec/patterns.md`.** Map each slop-detect pattern ID to equivalents in Krebs' slopcop, Impeccable, kill-ai-slop, Gesso and the Anthropic frontend-design tells, linking [febbhav/signs-of-ai-design](https://github.com/febbhav/signs-of-ai-design) (CC BY-SA, link only).
- Acceptance criteria: every pattern has ≥1 external reference or "unique to slop-detect".

**AMEND items to existing issues**
- **AMEND #204** (DTCG + DESIGN.md extraction): strengthened by the evidence.
  - Build on `@google/design.md` (Apache-2.0; `lint`/`diff` with JSON output; spec `version: "alpha"`; 1.32M downloads/month).
  - Test round-trips against dembrandt `--dtcg/--design-md` (MIT; already in the MCP Registry).
  - Describe DTCG 2025.10 as "Candidate Recommendation, considered stable".
  - Do not bundle `@projectwallace/css-design-tokens` (EUPL-1.2) without a license review; prefer the MIT `@projectwallace/css-analyzer`.
  - Treat Firecrawl `branding` as an optional import only (AGPL, LLM-ish "personality").
- **AMEND #203:** `@google/design.md lint` already checks WCAG contrast *within the file*. Keep slop-detect's value in *live computed-style vs token* compliance, and reuse `diff` semantics for token regressions.
- **AMEND #207:**
  - Adopt the LHCI assertion grammar (`off|warn|error`, `[level, {maxScore|minScore}]`, `preset`).
  - Adopt kill-ai-slop's `--only/--skip/--rules=extra.mjs` and an inline ignore-directive convention.
  - Consider Gesso-style deterministic `fix --write` for static HTML.
- **AMEND #209:**
  - Model "accepted baseline per branch" (Chromatic UI Tests) separately from "base-vs-PR diff" (Chromatic UI Review).
  - Store reports at stable slop-detect.com permalinks (the LHCI temporary-public-storage analog).
  - Post a GitHub check run or status.
- **AMEND #210:**
  - Offer unlighthouse's single `--budget N` with exit 1, alongside per-page budgets.
  - Add pa11y-ci `--sitemap-find/--sitemap-replace/--sitemap-exclude`.
  - Copy LHCI `staticDistDir` auto-detect and the built-in static server. Gesso already does `check dist/`, but only statically; slop-detect's computed-style advantage requires serving `dist`.
- **AMEND #211:** SARIF reaches code scanning only on public repos, or on private repos with GitHub Code Security. Always emit a `$GITHUB_STEP_SUMMARY` table and annotations as the universal path. Set `category` per URL and stable `partialFingerprints` (pattern id + URL).
- **AMEND #212:**
  - Add `outputSchema` + `structuredContent` (any JSON Schema 2020-12 in 2026-07-28), tool `icons` (2025-11-25 SEP-973) and deterministic `tools/list` order. `readOnlyHint` annotations already exist.
  - Note that Copilot cloud agent and code review use **tools only**, not resources or prompts, so keep tools self-contained.
  - Avoid Sampling, Roots and Logging (deprecated in 2026-07-28); use MRTR instead of server-initiated elicitation.
  - Plan migration to SDK v2 (`@modelcontextprotocol/server`) together with the remote endpoint.
  - For hooks, copy Impeccable's multi-harness installer and avoid-ai-design's PostToolUse recipe, including Codex's hook-trust approval flow.
- **AMEND #213:** add cross-tool agreement against Krebs' MIT design-slop-cop (~150 labeled sites, 5–10% FP; 1,590 Show HN sites scored 22% High / 32% Medium / 46% Low). VibeCheck has no public repo, so it cannot be benchmarked.
- **AMEND #206:**
  - Lighthouse's `llms-txt` rule is lenient (H1, ≥50 chars, ≥1 link; fetch errors flagged). Report "Lighthouse-compatible" and "strict" as two levels.
  - Source AI-crawler lists from ai-robots-txt/ai.robots.txt (4,201 stars, actively maintained).
  - Cloudflare's scanner also checks Content Signals and Web Bot Auth.
- **AMEND #196:** add `single_word_headline_accent` (Anthropic frontend-design: "Accenting just a single word or phrase in a headline"; Krebs: "Serif italic for one accent word") and a Claude-terracotta accent check (~#D97757) alongside the existing `cream_default_bg`. Check whether a "shadcn/ui default theme" fingerprint (Krebs) is already covered.

**CAVEATS**
- **CAVEAT (supply chain):** trusted publishing plus provenance did **not** prevent the TanStack compromise (repo-wide OIDC trust, orphaned fork commit). Scope trust to workflow + protected environment and don't treat provenance as sufficient ([Endor Labs](https://www.endorlabs.com/learn/shai-hulud-compromises-the-tanstack-ecosystem-80-packages-compromised)).
- **CAVEAT (registry):** the MCP Registry is still "preview — breaking changes or data resets may occur". Keep the publish step idempotent and keep README install paths independent of it.
- **CAVEAT (spec churn):** MCP 2026-07-28 removes sessions and the `initialize` handshake. Build the remote endpoint stateless from day one. The stdio server is unaffected short-term, but SDK v2 has split packages.
- **CAVEAT (competition):** Impeccable (61 deterministic rules, CLI, extension, hooks, 759k downloads/month) and the 30k–99k-star skills own agent mindshare. Compete on live-URL computed-style scoring, calibration, AEO and the public API, and **integrate** (be the deterministic check those skills call) rather than out-ship them on rule count.
- **CAVEAT (naming):** "Slop Detector" and "slopcheck" collide with multiple unrelated repos and registry entries. Use the domain-verified registry name `com.slop-detect/…` and consistent "slop-detect" naming.
- **CAVEAT (commoditization):** Lighthouse's Agentic Browsing category is free via PSI. A bare "has llms.txt" check is no longer a differentiator.
- **CAVEAT (licenses):** `@projectwallace/css-design-tokens` is EUPL-1.2 and Firecrawl is AGPL-3.0. Avoid hard dependencies in the MIT core.
- **CAVEAT (Marketplace):** the current `packages/action` path cannot be auto-listed. A separate root-level repo is required.
- **CAVEAT (launch channel):** design-slop tools scored ≤7 points on HN. Do not plan growth around a Show HN; agent-ecosystem listings carry the reach.

**Top NEW items, ranked by reach × effort**
1. Agent Skills / skills.sh
2. Official MCP Registry
3. Claude Code plugin + marketplace
4. Remote MCP endpoint
5. Agent Plugins / Cursor + deeplinks
6. Marketplace Action repo
7. AEO discovery parity (ARD / Server Card / Content Signals)
8. MCP Apps UI
9. OpenAI plugin (skills-only first)
10. AEO fix-file generator

P0 trusted-publishing migration precedes all of them. The pattern crosswalk (#11) is a cheap add-on.

### Gaps
- Install or usage telemetry for skills.sh, Cursor Marketplace, Smithery, Glama and PulseMCP was not retrieved. The reach ranking relies on npm download counts, GitHub stars and documented auto-propagation, not on channel-reported installs.
- Glama, PulseMCP, Profound, Otterly and Scrunch were not verified (search budget exhausted; PulseMCP blocked the fetch).
- Impeccable's ability to scan live URLs and its exact rule list, VibeCheck's repo and rules, and Hallmark's and Gesso's rule lists versus slop-detect's catalogue remain to be checked before final positioning claims.
