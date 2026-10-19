# Slop Detector — Strategic Product Roadmap (v3)

> **Deterministic, zero-LLM verification for the AI-generated web across four axes: Design Slop, Copy Slop, `DESIGN.md` System Compliance, and AEO / Generative Engine Optimization.**
>
> Live site: **[slop-detect.com](https://slop-detect.com)** · CLI: `npx slop-detect <url>` · MCP: `npx -y slop-detect-mcp` · Action: `ravidsrk/slop-detect/packages/action@v0.8.0`

> **Under review — proposed v4:** [`docs/research/roadmap-v4/REPORT.md`](docs/research/roadmap-v4/REPORT.md) audits this v3 roadmap's citations (16 of 123 claims fabricated, 38 need correction) and proposes reordering it: fix measurements first, then calibrate, then promote rules on evidence. Until it is accepted, treat the `research:backed` labels below with caution.

---

## 1. Shipped Baseline (`v0.8.0` · `definitions@2026.09`)

All foundational infrastructure, core axes, and distribution channels from the v1/v2 launch roadmap are **shipped and live in production**:

- **Four-Axis Deterministic Engine (`@slop-detect/core` / `slop-detect-core@0.8.0`)**:
  - **Axis 01 — Design Slop**: 27 CSS/DOM rules across typography, color, layout, components, and visual effects (`Clean 0–9`, `Mild 10–27`, `Heavy 28+`).
  - **Axis 02 — Copy Slop**: 9 prose & rhetoric rules (`buzzword_density`, `em_dash_overload`, `antithesis_construction`, `filler_openers`, `formulaic_closers`, `rule_of_three`, `whether_youre`, `unicode_artifacts`, `emoji_bullet_headers`).
  - **Axis 03 — System Compliance (`DESIGN.md`)**: 5 token compliance checks (`fonts.declared`, `colors.cta`, `colors.surface`, `colors.headings`, `radii.scale`) + `generateDesignMd()` (`--init-design-md`).
  - **Axis 04 — AEO (Agent-Readable Readiness)**: 8 crawler & content-negotiation checks (`html.reachable`, `bot.notBlocked`, `robots.aiAllowed`, `html.indexable`, `md.twin`, `html.linkAlternate`, `site.llmsTxt`, `html.vary`).
- **Live Edge Platform (`https://slop-detect.com`)**:
  - Real headless Chromium scanning on Cloudflare Workers Browser Rendering (`POST /api/scan`), dynamic SVG shields (`GET /badge/:domain.svg`), OpenAPI 3.1 (`GET /openapi.json`), Markdown content negotiation (`Accept: text/markdown`), `/leaderboard`, `/directory`, `/compare`, `/docs`, `/blog`, `/brand`, `/r/:id`, `/score/:domain`, `/report/:domain`, and double opt-in continuity monitoring (`POST /api/watch`, `/dashboard`).
- **Developer Ecosystem (`v0.8.0`)**:
  - npm: `npx slop-detect <url>` (`slop-detect@0.8.0`) and `npx -y slop-detect-mcp` (`slop-detect-mcp@0.8.0`).
  - GitHub Action: `uses: ravidsrk/slop-detect/packages/action@v0.8.0`, with sticky PR grade tables.

---

## 2. Research Foundation Driving Roadmap v3

This roadmap is grounded in a synthesis of **2024–2026 academic literature (arXiv, KDD, PNAS, ICML, ICLR, NAACL, Science Advances)**, **GitHub open-source standards**, and **empirical practitioner studies on X and Hacker News**:

### 2.1 Academic Literature (arXiv & Peer-Reviewed Venues)

| Pillar | Paper & Venue | arXiv / Link | Core Finding Applied in `slop-detect` |
| :--- | :--- | :--- | :--- |
| **Axis 01 · Design & Layout Homogenization** | **Design2Code: How Far Are We From Automating Front-End Engineering?** (Si et al., Stanford / *NAACL 2025*) | [`arXiv:2403.03163`](https://arxiv.org/abs/2403.03163) | Formalizes `Block-Match` bounding-box matching, normalized center offsets, 2D IoU layout overlap, and perceptual color distance ($\Delta E$). |
| **Axis 01 · Industrial UI Code Benchmarks** | **TaoD2C-Bench: Benchmarking MLLMs for Industrial UI Code Generation Beyond Visual Fidelity** (2026) & **EfficientUICoder** (2025) | [`arXiv:2610.10374`](https://arxiv.org/abs/2610.10374) · [`arXiv:2509.12159`](https://arxiv.org/abs/2509.12159) | Introduces Structural Complexity Score (SCS), Component Reuse Rate (CRR), Responsive Layout Integrity (RLI), and DOM token redundancy metrics. |
| **Axis 01 · DOM Topology & Mode Collapse** | **WebCode2M** (Gui et al., 2024), **Web2Code** (Yun et al., *NeurIPS 2024*), **WebSight** (Laurençon et al., 2024), **UICoder** (Wu et al., Apple 2024), **Sketch2Code** (Li et al., 2024) | [`arXiv:2404.06369`](https://arxiv.org/abs/2404.06369) · [`arXiv:2406.20098`](https://arxiv.org/abs/2406.20098) · [`arXiv:2403.09029`](https://arxiv.org/abs/2403.09029) · [`arXiv:2406.07739`](https://arxiv.org/abs/2406.07739) · [`arXiv:2410.16232`](https://arxiv.org/abs/2410.16232) | **TreeBLEU** 1-height DOM subtree recall proves LLM-generated HTML suffers from shallow `<div>` wrapper soup, sibling card tuple entropy collapse, and unrequested SaaS boilerplate injection. |
| **Axis 01 · Creative Homogenization** | **Homogenization Effects of LLMs on Human Creative Ideation** (Anderson et al., *ACM C&C 2024*) & **Ngo et al.** (*Info. Sci.* 2003) | [`arXiv:2402.01536`](https://arxiv.org/abs/2402.01536) | Formalizes bilateral layout symmetry, visual balance, density, and group-level variance compression. |
| **Axis 02 · RLHF Grammatical Stylometry** | **Do LLMs write like humans? Variation in grammatical and rhetorical styles** (Reinhart et al., CMU / *PNAS 2025*) | [`arXiv:2410.16107`](https://arxiv.org/abs/2410.16107) | Biber multidimensional analysis proving RLHF models generate **trailing present participial clauses (`", ensuring..."`, `", empowering..."`) at 2×–5× human rates** and stack nominalizations/hedges. |
| **Axis 02 · Excess Vocabulary & Burstiness** | **Delving into ChatGPT usage through excess vocabulary** (Kobak et al., *Science Advances 2025*), **Monitoring AI-Modified Content at Scale** (Liang et al., *ICML 2024*), **Padmakumar & He** (*ICLR 2024*) | [`arXiv:2406.07016`](https://arxiv.org/abs/2406.07016) · [`arXiv:2403.07183`](https://arxiv.org/abs/2403.07183) · [`arXiv:2309.05196`](https://arxiv.org/abs/2309.05196) | Quantifies empirical word fold-increases (*meticulous* 34.7×, *delve* >25×, *intricate* 11.2×, *commendable* 9.8×) across 14M+ abstracts and low sentence-length burstiness ($\text{CV} = \sigma_L / \mu_L < 0.24$). |
| **Axis 03 · Perceptual Color & Token Spaces** | **Helmlab: Analytical, Data-Driven Color Spaces for UI Design Systems** (Yıldız, 2026) & **W3C WCAG 3.0 APCA** (Somers) | [`arXiv:2602.23010`](https://arxiv.org/abs/2602.23010) · [W3C DTCG `2025.10`](https://tr.designtokens.org/format/) | Replaces broken sRGB Manhattan tolerance with perceptual **Oklab / OKLCH Euclidean distance ($\Delta E_{\text{OK}}$)** and polarity-aware APCA contrast ($L_c$). |
| **Axis 04 · Generative Engine Optimization (GEO)** | **GEO: Generative Engine Optimization** (Aggarwal et al., Princeton / Georgia Tech / AI2, *KDD 2024*), **Structural Feature Engineering for GEO** (2026), **Diagnosing Citation Failures in GEO** (2026), **Chen et al.** (2025), **Mind2Web** (*NeurIPS 2023*), **WebArena** (*ICLR 2024*) | [`arXiv:2311.09735`](https://arxiv.org/abs/2311.09735) · [`arXiv:2603.29979`](https://arxiv.org/abs/2603.29979) · [`arXiv:2603.09296`](https://arxiv.org/abs/2603.09296) · [`arXiv:2509.08919`](https://arxiv.org/abs/2509.08919) · [`arXiv:2306.06070`](https://arxiv.org/abs/2306.06070) · [`arXiv:2307.13854`](https://arxiv.org/abs/2307.13854) | Proves quotation density (+40.9% PAWC), quantitative statistics (+30.6%–37%), authoritative outbound citations (+27.5% to +115.1%), SSR unhydrated text extractability, and `JSON-LD` entity graphs govern AI citation behavior. |

### 2.2 GitHub Standards & Practitioner Discourse (X / Hacker News)

- **Show HN Empirical Audits**: Adrian Krebs's study of 1,590 Show HN launches (`slopcop.adriankrebs.ch`, finding 22% Heavy Slop and 32% Mild Slop) and the resulting HN debate on the **"Pioneer vs. Clone Problem"** (distinguishing Linear/Vercel/Stripe craft from vibe-coded clones via multi-category co-occurrence confidence and domain presets).
- **Practitioner Craft Taxonomies**: Paul Bakaus's *Impeccable v4.6.0 Craft Floor* (unthemed native browser surfaces, missing `color-scheme: dark`, missing `tabular-nums`, sparklines standing in for content) and Meng To's *Audit AI Design Slop* (boxed Lucide icons, gradient-letter avatars, synthetic testimonial persona clusters).
- **Open Standards on GitHub**: `google-labs-code/design.md`, `VoltAgent/awesome-design-md`, `dembrandt/dembrandt`, W3C DTCG `2025.10` (`tokens.json`), `@shadcn/lint`, `AnswerDotAI/llms-txt`, `ai-robots-txt/ai.robots.txt`, Cloudflare *Markdown for Agents* (`Accept: text/markdown`, `x-markdown-tokens`, `Content-Signal`), `a2aproject/A2A` (`/.well-known/agent-card.json`), and `modelcontextprotocol/modelcontextprotocol` (`/.well-known/mcp.json`).

---

## 3. Roadmap Tracks & Tracked GitHub Issues (`#196`–`#213`)

Every roadmap item below is tracked as a self-contained issue in [`ravidsrk/slop-detect/issues`](https://github.com/ravidsrk/slop-detect/issues) with full algorithmic specifications and acceptance criteria.

### Track 1 — Axis 01 (Design Slop): Next-Gen 2026 Component, Motion & Spatial Geometry Tells

| Issue | Title & Scope | Primary Citations | Target Packages |
| :---: | :--- | :--- | :--- |
| **[#196](https://github.com/ravidsrk/slop-detect/issues/196)** | **Potemkin UI & 2026 vibe-coding component tells**: `boxed_lucide_icons`, `fake_macos_terminal`, `dead_shell_interactions`, `fake_logo_bar` | `arXiv:2410.16232` (*Sketch2Code*), Show HN corpus, Meng To, Impeccable v4.6 | `@slop-detect/core`, `spec/` |
| **[#197](https://github.com/ravidsrk/slop-detect/issues/197)** | **Framer Motion & Magic UI motion monoculture**: `infinite_marquee_ticker`, `cursor_spotlight_gradient`, `scroll_fade_up_monoculture` | `arXiv:2610.10374` (*TaoD2C-Bench*), X/HN practitioner audits | `@slop-detect/core`, `spec/` |
| **[#198](https://github.com/ravidsrk/slop-detect/issues/198)** | **Computational layout entropy, symmetry collapse & DOM TreeBLEU metrics**: `symmetric_section_monotony`, `uniform_card_box_entropy`, `div_soup_ratio`, `bounding_box_collision` | `arXiv:2403.03163` (*Design2Code*), `arXiv:2404.06369` (*WebCode2M*), `arXiv:2406.07739` (*UICoder*), Ngo et al. (2003) | `@slop-detect/core`, `spec/` |
| **[#199](https://github.com/ravidsrk/slop-detect/issues/199)** | **Unthemed browser surfaces, missing `tabular-nums` & APCA dark-mode perceptual contrast ($L_c$)** | W3C WCAG 3.0 APCA, `arXiv:2602.23010` (*Helmlab*), Impeccable v4.6 Craft Floor | `@slop-detect/core`, `spec/` |

### Track 2 — Axis 02 (Copy Slop): LLM Stylometry, Syntactic Fingerprints & Hallucinated Social Proof

| Issue | Title & Scope | Primary Citations | Target Packages |
| :---: | :--- | :--- | :--- |
| **[#200](https://github.com/ravidsrk/slop-detect/issues/200)** | **RLHF syntactic & stylometric copy detectors**: `trailing_participial_clauses` (`", ensuring..."`), `sentence_length_uniformity` (low burstiness $\text{CV} < 0.24$), `nominalization_and_hedge_stack` | `arXiv:2410.16107` (Reinhart et al., *PNAS 2025*), `arXiv:2309.05196` (Padmakumar & He, *ICLR 2024*) | `@slop-detect/core`, `spec/` |
| **[#201](https://github.com/ravidsrk/slop-detect/issues/201)** | **Empirical log-odds excess vocabulary calibration in `buzzword_density`** (3-tier $r_w$ weighting from 14M PubMed abstracts & 50K peer reviews) | `arXiv:2406.07016` (Kobak et al., *Science Advances 2025*), `arXiv:2403.07183` (Liang et al., *ICML 2024*) | `@slop-detect/core`, `spec/` |
| **[#202](https://github.com/ravidsrk/slop-detect/issues/202)** | **Hallucinated LLM testimonials & SaaS microcopy formulas**: `hallucinated_testimonials` (*Sarah Chen / Alex Rivera* cluster + `pravatar.cc` / `dicebear`), `risk_reversal_triad`, `saas_headline_formula` | Meng To (*Audit AI Design Slop*), Show HN landing-page corpus | `@slop-detect/core`, `spec/` |

### Track 3 — Axis 03 (`DESIGN.md` & System Compliance): Perceptual Oklab/OKLCH Math & W3C Design Tokens

| Issue | Title & Scope | Primary Citations | Target Packages |
| :---: | :--- | :--- | :--- |
| **[#203](https://github.com/ravidsrk/slop-detect/issues/203)** | **Perceptual Oklab/OKLCH color matching ($\Delta E_{\text{OK}}$) & `spacing.scale` + `typography.scale` checks** | `arXiv:2602.23010` (*Helmlab*), Björn Ottosson Oklab, `google-labs-code/design.md` | `@slop-detect/core` (`system.ts`) |
| **[#204](https://github.com/ravidsrk/slop-detect/issues/204)** | **W3C Design Tokens (`DTCG 2025.10 tokens.json`) dual-format support & rich `DESIGN.md` extraction** (`--extract-tokens`, `--extract-design-md`, MCP `extract_design_system`) | W3C DTCG `2025.10`, `VoltAgent/awesome-design-md`, `dembrandt/dembrandt`, `amzn/style-dictionary` | `@slop-detect/core`, `slop-detect`, `slop-detect-mcp` |

### Track 4 — Axis 04 (AEO & Generative Engine Optimization): Citationworthiness & 2026 Agent Web

| Issue | Title & Scope | Primary Citations | Target Packages |
| :---: | :--- | :--- | :--- |
| **[#205](https://github.com/ravidsrk/slop-detect/issues/205)** | **Empirical GEO citationworthiness checks**: `geo.citationEvidence` (statistics & outbound citations), `geo.structuredKnowledge` (`JSON-LD` & tables/lists), `html.tokenEfficiency` (SSR prose gate & HTML-to-text ratio) | `arXiv:2311.09735` (Aggarwal et al., *KDD 2024*), `arXiv:2603.29979`, `arXiv:2603.09296`, `arXiv:2509.08919`, `arXiv:2306.06070` (*Mind2Web*) | `@slop-detect/core` (`aeo.ts`), `spec/` |
| **[#206](https://github.com/ravidsrk/slop-detect/issues/206)** | **Harden AEO protocol checks**: strict `/llms.txt` grammar validation (reject SPA HTML soft-404s), `training` vs `search` crawler separation in `robots.aiAllowed`, Cloudflare *Markdown for Agents* (`Accept: text/markdown`, `x-markdown-tokens`), A2A `agent-card.json` & `mcp.json` | `AnswerDotAI/llms-txt`, `ai-robots-txt/ai.robots.txt`, Cloudflare Markdown for Agents, `a2aproject/A2A` | `@slop-detect/core` (`aeo.ts`), `spec/` |

### Track 5 — Calibration Honesty, Visual Attribution & Anti-Fragility

| Issue | Title & Scope | Primary Citations | Target Packages |
| :---: | :--- | :--- | :--- |
| **[#207](https://github.com/ravidsrk/slop-detect/issues/207)** | **Co-Occurrence Confidence scoring, expanded category presets (`--preset devtools\|editorial\|ecommerce\|portfolio`) & `.sloprc.json` / inline `data-slop-ignore` waivers** | HN Pioneer-vs-Clone analysis, `@shadcn/lint`, Impeccable v4.6 hooks | `@slop-detect/core`, `slop-detect`, `@slop-detect/action` |
| **[#208](https://github.com/ravidsrk/slop-detect/issues/208)** | **DOM selector + bounding-box coordinates (`locations`) per pattern & zero-dep SVG annotated screenshots (`--annotate-screenshot <path.png>`)** | `arXiv:2404.05955` (*VisualWebBench*), `arXiv:2403.03163` (*Design2Code*) | `@slop-detect/core`, `slop-detect`, `apps/web` |

### Track 6 — Developer Workflow, CI Ratcheting, Multi-Page Crawl & Continuity Platform

| Issue | Title & Scope | Primary Citations | Target Packages |
| :---: | :--- | :--- | :--- |
| **[#209](https://github.com/ravidsrk/slop-detect/issues/209)** | **Base-vs-PR branch score diffing & regression ratcheting** (`compareScans`, `--compare-to`, `--fail-on-regression`, Action `baseline-url` PR delta tables) | `narthur/pa11y-ratchet`, `GoogleChrome/lighthouse-ci`, `bundlewatch` | `@slop-detect/core`, `slop-detect`, `@slop-detect/action` |
| **[#210](https://github.com/ravidsrk/slop-detect/issues/210)** | **Static build directory scanning (`slop-detect ./dist`) & multi-page `--sitemap` / `--crawl`** with shared Playwright browser pool and Aggregate Domain Scorecard | `harlan-zw/unlighthouse`, `GoogleChrome/lighthouse-ci` (`staticDistDir`) | `slop-detect`, `@slop-detect/action` |
| **[#211](https://github.com/ravidsrk/slop-detect/issues/211)** | **Actionable SARIF 2.1.0 for GitHub Code Scanning**: DOM source-location mapping (React Fiber / Astro / v0 / Lovable hints) & inline `FIX_RECIPES` in `rule.help.markdown` | `github/codeql-action/upload-sarif@v3`, OASIS SARIF v2.1.0 | `@slop-detect/core`, `slop-detect`, `@slop-detect/action` |
| **[#212](https://github.com/ravidsrk/slop-detect/issues/212)** | **MCP Server v2**: MCP Resources (`slop://spec/*`), MCP Prompts (`audit-and-fix-page`, `bootstrap-design-system`), tool annotations & `--init-hooks` for Claude Code / Cursor | Model Context Protocol 2025/2026 spec | `slop-detect-mcp`, `slop-detect` |
| **[#213](https://github.com/ravidsrk/slop-detect/issues/213)** | **200-URL Stratified Calibration Benchmark (`CALIBRATION.md` v2) & Webhook Continuity Alerts** (Slack/Discord/JSON webhooks on `POST /api/watch` drift events) | `slopcop.adriankrebs.ch`, `arXiv:2403.03163`, `arXiv:2404.06369` | `scripts/`, `CALIBRATION.md`, `apps/web` |

---

## 4. Release & Definition Cadence

```
v0.8.0 (definitions@2026.09)  ──►  SHIPPED (4-axis engine, Cloudflare edge, npm CLI + MCP, Watch sweeps)
       │
       ▼
v0.9.0 (definitions@2026.10)  ──►  AEO Hardening & Developer Workflow
       │                           • #206 Strict /llms.txt grammar, training-vs-search bots, Cloudflare Markdown
       │                           • #208 DOM bounding-box coordinates & --annotate-screenshot SVG overlay
       │                           • #209 Base-vs-PR score diffing (compareScans, --fail-on-regression)
       │                           • #203 Perceptual Oklab/OKLCH color matching & spacing.scale / typography.scale
       ▼
v0.10.0 (definitions@2026.11) ──►  Research-Backed Engine Expansion (Design, Copy, GEO, W3C Tokens)
       │                           • #196 Potemkin UI & component tells (boxed_lucide_icons, fake_macos_terminal)
       │                           • #197 Framer Motion / Magic UI motion monoculture
       │                           • #198 Computational layout entropy & TreeBLEU DOM metrics
       │                           • #199 Unthemed browser surfaces & APCA dark-mode contrast
       │                           • #200 RLHF participial tail clauses & sentence-length burstiness
       │                           • #201 Kobak/Liang log-odds excess vocabulary calibration
       │                           • #202 Hallucinated testimonials ("Sarah Chen") & risk-reversal triads
       │                           • #204 W3C DTCG 2025.10 tokens.json & MCP extract_design_system
       │                           • #205 Empirical GEO citationworthiness checks (KDD 2024 PAWC signals)
       ▼
v1.0.0 (definitions@2026.12)  ──►  Enterprise CI, Calibration v2 & Continuity Platform
                                   • #207 Co-occurrence confidence, domain presets & .sloprc.json waivers
                                   • #210 Static build scanning (slop-detect ./dist) & --sitemap / --crawl pool
                                   • #211 GitHub Code Scanning SARIF 2.1.0 with framework source hints
                                   • #212 MCP Resources, Prompts & --init-hooks IDE guardrails
                                   • #213 200-URL Stratified Calibration Benchmark & Webhook drift alerts
```
