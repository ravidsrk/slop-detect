# AEO / GEO and the agent-ready web: evidence base and standards landscape, 2024–2026 (status as of 2026-10-19)

How these notes were made:
- Research ran on 2026-10-19 (today). The lead researcher and six delegated research sub-agents fetched the sources. Each verification label below records what was actually opened in this session.
- **[V]** means verified: the page was opened and the number or quote taken from its text. Pages were read through a fetch tool that summarises and paraphrases, so re-check exact strings (UA versions, header names) before hardcoding them.
- **[S]** means secondary-source only (the intermediary is named). **[U]** means it could not be verified.
- "Industry data" marks vendor or SEO-tool studies. They are observational, have commercial incentives, and their methods are often only partly disclosed.
- The shared web-search budget ran out late in the run. The last items were therefore checked only by fetching known primary URLs, and a few items remain gaps (listed per section).
- Slop Detector code facts come from the local worktree at commit `d37e91c`: `packages/core/src/aeo.ts`, `spec/aeo.md` and `apps/web/functions/_posts.ts`.

---

## 1. What does GEO evidence after Aggarwal et al. (KDD 2024) show? Which page properties have causal or correlational support for increasing citation, and which tactics fail?

### Takeaway
The founding GEO gains (quotations, statistics, citations: +30–41% word-share) come from a 2023 simulated engine (gpt-3.5-turbo over 5 fixed sources). Controlled replications from 2025–2026 mostly find null or negative effects on modern engines and in full retrieval pipelines. What reproducibly drives AI citation is query relevance (title and passage match), retrieval and context position, concrete facts or evidence, recency, and brand prior. Page-level features explain only about 3% of within-site citation variance. Issue #205 also misquotes two of the Aggarwal numbers and cites a Mind2Web figure that does not exist.

### Cited Findings

**Founding paper: Aggarwal et al., "GEO: Generative Engine Optimization", arXiv 2311.09735 (v1 2023-11-16, v3 2024-06-28; "Accepted to KDD 2024")**

Source for all bullets below: [arXiv abs](https://arxiv.org/abs/2311.09735), [HTML v3](https://arxiv.org/html/2311.09735v3) [V]

- **Setup.**
  - The generative engine is gpt-3.5-turbo (temperature 0.7) reading the top 5 Google results.
  - "we randomly select one source website to be optimized and apply each of the GEO methods separately on the same source".
  - GEO-bench has 10K queries; results are on the 1K test split over 5 seeds.
  - The metrics are PAWC (Position-Adjusted Word Count, a zero-sum share of the answer) and a GPT-3.5 "Subjective Impression" score.
- **Table 1, GEO-bench PAWC** (baseline 19.3; percentage changes derived from the table):

  | Method | PAWC | Change |
  |---|---|---|
  | Quotation Addition | 27.2 | **+40.9%** |
  | Statistics Addition | 25.2 | **+30.6%** |
  | Cite Sources | 24.6 | **+27.5%** |
  | Fluency | 24.7 | +28.0% |
  | Keyword Stuffing | 17.7 | **−8.3%** |

  The text gives "relative improvement of 30-40% on the Position-Adjusted Word Count metric and 15-30% on the Subjective Impression metric". Keyword stuffing offers "little to no improvement".
- **Real engine (Perplexity.ai).** Only a 200-query subset was run, and sources were supplied "as file uploads", not retrieved organically.
  - Quotation: PAWC +20.7% derived (the text says "22%").
  - Statistics: PAWC +8.7%, Subjective Impression +37.2%.
  - Cite Sources: PAWC +11%, Subjective Impression −23%.
  - Keyword stuffing: −9.1% (the text says "10% worse").
- **Rank analysis (Table 2), measured with "all source contents simultaneously" optimized.**

  | Method | Rank 1 | Rank 4 | Rank 5 |
  |---|---|---|---|
  | Cite Sources | **−30.3%** | +15.5% | **+115.1%** |
  | Quotation | | | +99.7% |
  | Statistics | | | +97.9% |

- **Issue #205 claims, checked against the paper.**
  - Quotation +40.9%: correct.
  - Statistics "+30.6% to +37.0%": +30.6% is GEO-bench PAWC, but ~37% is Perplexity *Subjective Impression* on n=200. Statistics' Perplexity PAWC gain is only ~+9%.
  - Cite Sources +27.5%: correct for GEO-bench PAWC only.
  - "+115.1% for SERP rank 4–5": **wrong**. The figure is rank 5 only (rank 4 is +15.5%), it was measured with all sources optimized at once, and rank 1 *lost* 30.3%.
- A 2026 paper quotes different "Aggarwal numbers" (+42.6 / +32.8 / +27.7) taken from the "Word" sub-column, so secondary sources disagree depending on which column they read. Source: [arXiv 2609.07559](https://arxiv.org/html/2609.07559v1) [V].

**Controlled replications and refutations (2025–2026)**

- **C-SEO Bench** (Puerto, Gubri, Green, Oh, Yun). Sources: [arXiv 2506.11097 v3 (2025-10-20)](https://arxiv.org/html/2506.11097v3), "Accepted at NeurIPS Datasets & Benchmarks 2025" [V].
  - Ten methods were tested, including Aggarwal's eight and an llms.txt-style "LLM Guidance" summary prepended to the document.
  - With gpt-4o-mini, only **3 of 54** method–domain cases improved significantly; the best was +0.36 ±1.47 ranks.
  - "Statistics method decreases rankings in 19 out of 24 evaluated settings".
  - Haiku: 26 of 30 product-recommendation cases were significantly negative.
  - Gains "decrease steadily", "converging toward zero at full adoption" (a "congested and a zero-sum game").
  - Traditional SEO (retrieval position) moved results by up to **+2.77 ranks**.
- **Bajemon & Rochet, "Scoring Without the Engine".** Source: [arXiv 2609.07559 (2026-09-07)](https://arxiv.org/html/2609.07559v1) [V; authors have vendor ties].
  - Aggarwal's levers were re-measured on 10 engine families, including gpt-5.x and gemini-3.1-flash-lite.
  - Changes in PAWC share:
    - quotation −0.0009 (p=0.82)
    - statistics −0.0002 (p=0.96)
    - cite sources −0.0101 (p=0.04 uncorrected, 0.13 Bonferroni)
  - The authors call the 2023 anchors "an expired external check".
  - Their own deterministic score reaches a within-query Spearman of only **0.114**: "a quality filter rather than a citation predictor".
- **SAGEO Arena (Kim et al., KDD 2026).** Full pipeline: 171,003 docs, BM25, a reranker and GPT-5-mini. Source: [arXiv 2602.12187](https://arxiv.org/html/2602.12187v2) [V].
  - Body-text GEO rewrites *lowered* retrieval H@20 (0.58→0.53), rerank H@10 (1.00→0.84) and citation rate (0.50→0.47).
  - AutoGEO cut retrieval by 36%.
  - Optimizing structural fields (title, meta, headings, schema/JSON-LD) raised retrieval +22%, but citation only +2% (0.50→0.52).
- **Vishwakarma et al., "What Gets Cited".** 252,000 paired trials across 6 LLMs. Source: [arXiv 2605.25517 (2026-05-25), ACM DOI 10.1145/3805712.3808445](https://arxiv.org/html/2605.25517v1) [V].
  - "Gatekeepers" with odds ratios ≫100: topic match, list position, price, and recent vs old timestamp (OR 14.4 to ≫10k).
  - "Claims with evidence": OR 2.09 to ≫10k.
  - **Content structure (structured vs dense): OR 0.78–1.68, null.**
  - An *old* timestamp did worse than no timestamp.
- **AutoGEO (Wu et al.).** Simulated RAG, average +35.99%. Source: [arXiv 2510.11438 (2025-10-13)](https://arxiv.org/html/2510.11438v1) [V]. This **conflicts** with SAGEO Arena's real-pipeline −36% retrieval for AutoGEO.
- **Tian et al., "Diagnosing and Repairing Citation Failures in GEO".** Simulated engines (gpt-4.1-mini, claude-haiku-4.5). Source: [arXiv 2603.09296 (2026-03-10)](https://arxiv.org/html/2603.09296v1) [V].
  - Failure taxonomy:
    - Technical Integrity 10.1%. This explicitly includes "Content missing due to client-side rendering/SPA" and "Content overwhelmed by ads, navigation, or boilerplate"; subtype frequencies are not reported.
    - Semantic Alignment 62.2%.
    - Content Quality 27.1%.
  - Keyword Stuffing scored 62.44 vs Statistics 60.52, which **conflicts** with Aggarwal.
- **Yu et al., "Structural Feature Engineering for GEO".** Source: [arXiv 2603.29979 (2026-03-31)](https://arxiv.org/html/2603.29979v1) [V].
  - Claims citation rate rose 45.0%→52.8% (+17.3%) on "six mainstream generative engines", including "Google SGE" and "Bing Chat". How the engines were accessed is not stated.
  - It does **not** mention CSR, SSR, HTML-to-text ratio or crawlability. JSON-LD appears only as background.
- **Mind2Web.** Source: [arXiv 2306.06070](https://ar5iv.labs.arxiv.org/html/2306.06070) [V].
  - Average **1,135 elements/page**; cleaning to 580 keeps 94.7% recall of the target element.
  - **No "85–95% noise" figure exists**, so #205's citation of it is unsupported.
- **Martinez, critical survey of 45 GEO studies.** No technique shows "a stable, cross-platform causal effect on organic discoverability". Source: [arXiv 2607.14035 (2026-07-15)](https://arxiv.org/abs/2607.14035) [V: abstract only].
- **GEO-Flag.** Estimated GEO prevalence is **8.90%** of 10,095 Google/Gemini-result pages and **16.36%** of pages modified in 2026. Source: [arXiv 2608.16824 (2026-08-17)](https://arxiv.org/abs/2608.16824) [V: abstract only].

**Large-scale observational studies of real engines**

- **Chen & Koudas, "What Drives AI Citations?"** 158,099 answers and 468,037 citations from ChatGPT (GPT-5.4 nano), Gemini 3.1 Flash Lite and Perplexity Sonar via API, 2026-06-24 to 09-21. Source: [arXiv 2610.15033 (2026-10-10)](https://arxiv.org/html/2610.15033v1) [V].
  - Many effects reverse once compared within the same site (a Simpson's paradox):

    | Feature | Across sites | Within site |
    |---|---|---|
    | FAQ block | +18.1% | −3.4% |
    | Schema.org markup | +7.5% | −5.3% |
    | Page speed | +11.7% | −1.1% |

  - Robust effects: title match +14.1% and best-paragraph match +15.5%.
  - "Word count, outbound links, headings, tables and lists show no robust effect."
  - Retrieval explains **32% (95% CI 24–42%)** of within-site variation; page features explain **2.8%**.
  - **11.5%** of pages need JavaScript for their main text. Within-site citation effect: Gemini **−10.6% (p=0.008)**, ChatGPT −6.8% (n.s.), Perplexity −2.1% (n.s.).
  - **7.1%** of ChatGPT-cited pages disallow OAI-SearchBot.
  - Brands already in the model's prior get 1.60× the odds of citation.
  - The study is associational.
- **Zhang et al., "Citation Absorption".** Explicitly correlational. Source: [arXiv 2604.25707](https://arxiv.org/html/2604.25707v2) [V].
  - Top vs bottom "influence" quartile: 1,943 vs 170 words, and 10.59 vs 0.85 headings.
  - Pages with numbers or statistics: +61.55% mean "influence", a constructed score.
- **Kirsten et al., "Characterizing Web Search in the Age of Generative AI".** 4,706 queries, Sept 2025. Source: [arXiv 2510.11560](https://arxiv.org/html/2510.11560v2) [V].
  - 53% of AI Overviews' cited domains are not in the organic top 10; 27% are not in the top 100.
  - Two-month link Jaccard: organic 45% vs AI Overviews 18%.
- **Grossman et al., "How Generative AI Disrupts Search" (SIGIR 2026).** 11,500 queries collected 7–8 Dec 2025. Source: [arXiv 2604.27790](https://arxiv.org/html/2604.27790v1) [V].
  - AI Overviews appear for 51.5% of queries.
  - Sites blocking Google-Extended are significantly less likely to be retrieved by AI Overviews. 21 popular publishers never cited by Gemini all block Google-Extended. This correlation sits in tension with Google's statement that Google-Extended does not affect Search (§2).
- **Chen et al., "Generative Engine Optimization: How to Dominate AI Search".** GPT's earned-media share is 69.1–92.1% vs Google's 31.8–54.1%. The paper's schema advice was not tested. Source: [arXiv 2509.08919 (2025-09-10)](https://arxiv.org/html/2509.08919v1) [V].
- **Tow Center / CJR, "AI Search Has a Citation Problem" (Jaźwińska & Chandrasekar).** Source: [CJR (2025-03-06)](https://www.cjr.org/tow_center/we-compared-eight-ai-search-engines-theyre-all-bad-at-citing-news.php) [V].
  - 1,600 queries; more than 60% of answers were incorrect (Perplexity 37%, Grok 3 94%).
  - Perplexity Pro identified nearly a third of 90 excerpts from publishers that block it.

**Adversarial manipulation papers**

- **Pfrommer et al., "Ranking Manipulation for Conversational Search Engines" (EMNLP 2024).** Source: [arXiv 2406.03589](https://arxiv.org/html/2406.03589v3) [V].
  - RagDoll: 1,147 pages.
  - Tree-of-attacks prompt injection gained 82.94% of the maximum possible score on GPT-4 Turbo and 95.74% on Llama 3 70B. It transferred to Perplexity's Sonar Large Online at 54.23%.
  - GPT-4 Turbo was "minimally influenced by document content".
- **Nestaas, Debenedetti, Tramèr, "Adversarial SEO for LLMs".** Source: [arXiv 2406.18382](https://arxiv.org/html/2406.18382v2) [V]; the ICLR 2025 venue is [S] via mlanthology.
  - Hidden injections (often white, size-1 text) on live pages made Bing Copilot ~**2.5×** more likely to recommend the attacker's product; against real brands, 34.0%→59.4%.
  - When everyone attacks there is a prisoner's dilemma: "all parties globally lose".
- **Kumar & Lakkaraju, "Manipulating LLMs to Increase Product Visibility".** A white-box attack (a GCG-optimized "strategic text sequence") on Llama-2; no production engines tested. Source: [arXiv 2404.07981](https://arxiv.org/html/2404.07981v2) [V].

**Industry citation-source data** (all industry data)

- **Ahrefs, AI Overview citations from the top 10.** Source: [Ahrefs (Linehan), 2026-03-02](https://ahrefs.com/blog/ai-overview-citations-top-10/) [V].
  - 37.9% of AI Overview–cited pages rank in the top 10, 31.2% at 11–100 and 31.0% beyond 100.
  - Ahrefs: "~76% in July 2025 vs. ~38% today". Its parsing method changed between waves.
- **Ahrefs, AI assistant overlap.** Source: [Ahrefs, 2025-08-11](https://ahrefs.com/blog/ai-search-overlap/) [V].
  - Over 15,000 prompts, ChatGPT in-text citations overlap Google's top 10 only **8.0%** (average across assistants 11.9%; Perplexity 28.6%).
  - Quote: "AI Overviews follow the SERPs—AI assistants don't."
- **Semrush, AI Mode comparison.** Source: [Semrush, 2025-07-21](https://semrush.com/blog/ai-mode-comparison-study) [V].
  - Domain / URL overlap with the top 10: AI Overviews ~86% / 67%, AI Mode ~54% / ~35%, Perplexity >91% / 82%.
- **Profound.** Source: [Profound, 2025-06-05](https://www.tryprofound.com/blog/ai-platform-citation-patterns) [V].
  - 680M citations. Wikipedia is 7.8% of all ChatGPT citations, i.e. 47.9% of its top-10-source share. Reddit is 6.6% of all Perplexity citations, i.e. 46.7% of its top-10 share.
- **Ahrefs, brand visibility factors.** Source: [Ahrefs, 2025-12-12](https://ahrefs.com/blog/ai-brand-visibility-correlations/) [V].
  - Brand-level Spearman correlations for branded web mentions: 0.664 (ChatGPT), 0.709 (AI Mode), 0.656 (AI Overviews). YouTube mentions ~0.737. Backlinks "very weak".
- **SE Ranking, ChatGPT citation factors.** Average citations by bucket, confounded by domain authority. Source: [SE Ranking, 2025-11-24](https://seranking.com/blog/chatgpt-citation-factors/) [V].

  | Factor | Average citations |
  |---|---|
  | 19+ statistics vs minimal | 5.4 vs 2.8 |
  | Expert quotes, with vs without | 4.1 vs 2.4 |
  | Updated in last 3 months vs outdated | 6.0 vs 3.6 |
  | First contentful paint <0.4s vs >1.1s | 6.7 vs 2.1 |
  | FAQ schema, with vs without | **3.6 vs 4.2** |
  | Question-style headings vs plain | **3.4 vs 4.3** |

  Outbound links had "minimal effect".
- **Pew Research Center (independent; observational panel of 900 US adults).** Source: [Pew, 2025-07-22](https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/) [V].
  - Users clicked a traditional result on **8%** of visits with an AI summary vs **15%** without, and clicked a link inside the summary only **1%** of the time.
- **Seer Interactive.** Source: [Seer, 2025-11-04](https://www.seerinteractive.com/insights/aio-impact-on-google-ctr-september-2025-update) [V].
  - Q3 2025 organic CTR: 0.52% (AI Overview, brand not cited), 0.70% (cited), 1.45% (no AI Overview).
  - Seer: "We cannot definitively prove that citation causes higher CTRs."
- **TollBit.** Q4 2025: AI apps were 0.12% of referrals vs Google's 80.5%, and AI click-through fell from 0.8% to 0.27%. Source: [TollBit, 2026-04-13](https://tollbit.com/blog/scraper-index-and-audit/) [V].

### Inferences
- Of #205's three proposals, `html.tokenEfficiency` (renamed "server-rendered main-text coverage") has the best support:
  - Vercel's no-JS crawler data.
  - The within-site Gemini −10.6% finding.
  - Tian et al.'s taxonomy, which includes JS rendering failures.
- `geo.citationEvidence` has only 2023 simulated-engine causal support, and later controlled work shows it null or negative. It should not be scored as a citation predictor.
- No query-free page score can predict citation well, because the dominant levers (query relevance, retrieval rank, brand prior) depend on the query. A within-query Spearman of 0.114 is the ceiling observed so far. AEO checks should be framed as *eligibility* (can the page be fetched, parsed and attributed), not *citation-worthiness*.
- Tactics shown not to work or not to replicate:
  - Keyword stuffing (−8.3% / −9.1%; one conflicting simulation).
  - Statistics addition on modern engines (19 of 24 settings negative).
  - FAQ blocks, FAQ schema and question-style headings (null or negative).
  - Structure-only reformatting (OR null).
  - Body-text GEO rewrites in a real pipeline (−9% retrieval).
  - Adding schema (see §9).

### Gaps
- Role-augmented/intent-driven GEO, E-GEO (2511.20867), CHASE (2608.30466) and Nimase GEO-Bench (2605.29107) were seen in arXiv listings but not opened.
- No controlled study on a live engine with organic retrieval exists for any white-hat lever.
- Several 2026 papers have vendor ties (2609.07559; 2606.20065, a Ranqo vendor paper not opened; 2605.25517, with a Sprinklr pilot).

---

## 2. Crawler behavior: which AI crawlers and fetchers execute JS? Which user-agents matter in Oct 2026 and what are they for? Who honors robots.txt? What do Cloudflare Radar ratios show?

### Takeaway
- Most answer-time fetchers and training crawlers still read raw HTML only: ChatGPT-User, Claude-User, PerplexityBot / Perplexity-User, GPTBot, ClaudeBot. Googlebot (which feeds AI Overviews, AI Mode and Gemini grounding) and Applebot render JS. An unconfirmed September 2026 report says OpenAI's crawlers started rendering.
- Every major operator now separates training, search-index and user-triggered bots.
- User-triggered fetchers are documented by their own operators as possibly ignoring robots.txt.
- Training dominates AI crawling (~80%), and crawl-to-referral ratios range from ~3:1 (Google) to tens of thousands to one (Anthropic).
- Slop Detector's current probe (a spoofed GPTBot) and its robots logic (any registry bot blocked = fail) do not match this landscape.

### Cited Findings

**JavaScript execution**

- **Vercel + MERJ, "The rise of the AI crawler"** (Zecchini, Moore, Ubl, Siddle). Source: [Vercel, 2024-12-17](https://vercel.com/blog/the-rise-of-the-ai-crawler) [V].
  - Monthly requests on Vercel's network: GPTBot 569M; Claude 370M; AppleBot 314M; PerplexityBot 24.4M; Googlebot 4.5B. The four AI crawlers together are "a little over 28%" of Googlebot.
  - Quote: "none of the major AI crawlers currently render JavaScript".
  - ChatGPT and Claude fetch JS files (11.50% / 23.84% of requests) but "don't execute them".
  - "Gemini leverages Googlebot's infrastructure, enabling full JavaScript rendering"; AppleBot "renders JavaScript through a browser-based crawler".
  - 404 rates: ChatGPT 34.82%, Claude 34.16%, Googlebot 8.22%.
- **2026 field tests (all secondary).**
  - A Forge log study (30 days to 2026-09-24): ChatGPT-User 37,045 page reads with 0 script fetches; Claude-User 10,028 with 0.
  - A decoy test (2026-06-09): ChatGPT, Claude, Perplexity, Gemini live answers, Copilot and Meta AI all reported the raw-HTML value rather than the JS-written value.
  - Sources: [GEO Toolbox, 2026-10-04](https://geotoolbox.ai/blog/javascript-seo); [Advanced Web Ranking, 2026-08-20](https://www.advancedwebranking.com/blog/what-ai-search-crawlers-read) [S].
- **Claim that "OAI-SearchBot and GPTBot began rendering JavaScript on September 25 [2026]"**: based on Next.js `?_rsc=` requests from OpenAI IP ranges on one site; there is no OpenAI announcement. [U] (the original post returned 403; the claim was seen only via GEO Toolbox).
- **Apple:** "Applebot may render the content of your website within a browser." Source: [Apple, published 2026-09-04](https://support.apple.com/en-us/119829) [V].

**User-agent landscape (operator documentation, accessed 2026-10-19)**

| Token | Operator | Purpose | robots.txt (operator doc) | Verification | Source |
|---|---|---|---|---|---|
| GPTBot | OpenAI | Training ("may be used in training our generative AI foundation models") | Honoured. "Each setting is independent of the others" | openai.com/gptbot.json. Documented UA `…compatible; GPTBot/1.4; +https://openai.com/gptbot` | [OpenAI bots](https://developers.openai.com/api/docs/bots) (platform.openai.com 301s here) [V] |
| OAI-SearchBot | OpenAI | ChatGPT search index. "Sites that are opted out of OAI-SearchBot will not be shown in ChatGPT search answers" | Honoured; changes take ~24h | openai.com/searchbot.json. UA now has a Chrome/131 prefix | same [V] |
| ChatGPT-User | OpenAI | User-triggered fetches | "robots.txt rules may not apply" | openai.com/chatgpt-user.json | same [V] |
| OAI-AdsBot | OpenAI | Checks pages submitted as ChatGPT ads | — | openai.com/adsbot.json | same [V] |
| ChatGPT agent | OpenAI | Agent | — | Web Bot Auth signatures (§5) | Cloudflare [V] |
| ChatGPT Atlas | OpenAI | Agentic browser | — | Indistinguishable from Chrome | [S] (HUMAN snippet) |
| ClaudeBot | Anthropic | Training | Honoured, plus Crawl-delay | claude.com/crawling/bots.json | [Anthropic, updated 2026-04-07](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) [V] |
| Claude-SearchBot | Anthropic | Search index | Honoured | same | same [V] |
| Claude-User | Anthropic | User-triggered | Covered by "Anthropic's Bots respect…" | same | same [V] |
| anthropic-ai, Claude-Web | Anthropic | **Absent from the current doc (legacy)** | — | — | same [V] |
| Googlebot | Google | Search; also the control for AI Overviews and AI Mode | Obeys | Reverse DNS + JSON lists | [Google common crawlers, 2026-10-15](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers) [V] |
| Google-Extended | Google | **robots.txt token only, no UA.** Gemini training and grounding. "does not impact a site's inclusion in Google Search nor is it used as a ranking signal" | — | — | same [V] |
| Google-CloudVertexBot | Google | Crawls requested by site owners building Vertex AI agents | Obeys | — | same [V] |
| Google-Agent | Google | User-triggered agent; Chrome-like UA | "generally ignore robots.txt rules" | Experimental Web Bot Auth `agent.bot.goog` | [Google user-triggered fetchers, 2026-08-19](https://developers.google.com/search/docs/crawling-indexing/google-user-triggered-fetchers) [V] |
| PerplexityBot | Perplexity | Search index; "not used to crawl content for AI foundation models" | Recommends allowing it in robots.txt | perplexity.com/perplexitybot.json | [Perplexity bots, modified 2026-01-29](https://docs.perplexity.ai/guides/bots) [V] |
| Perplexity-User | Perplexity | User-triggered | "generally ignores robots.txt rules" | perplexity.com/perplexity-user.json | same [V] |
| Applebot / Applebot-Extended | Apple | Search (may also train) / **training-control token that "does not crawl webpages"** | Honoured; falls back to Googlebot rules if not named | Reverse DNS `*.applebot.apple.com` | [Apple](https://support.apple.com/en-us/119829) [V] |
| Meta-ExternalAgent / Meta-WebIndexer / Meta-ExternalFetcher | Meta | Training + indexing / Meta AI search ("cite and link") / user-triggered | Implied / implied / "may bypass robots.txt rules" | No IP list | [Meta crawlers](https://developers.facebook.com/docs/sharing/webmasters/web-crawlers/) [V] |
| Amazonbot / Amzn-SearchBot / Amzn-User | Amazon | Mixed, "may be used to train" / search, "does not crawl content for generative AI model training" / user-initiated | Honoured (`noarchive` means no training use) / honoured / "may not follow all robots.txt directives" | IP pages | [Amazonbot](https://developer.amazon.com/amazonbot) [V] |
| DuckAssistBot | DuckDuckGo | Real-time fetch for AI answers; "not used in any way to train AI models" | Honoured (72h) | duckassistbot.json | [DDG](https://duckduckgo.com/duckduckgo-help-pages/results/duckassistbot) [V] |
| MistralAI-User / -Index / -Training | Mistral | User / index / training | — | IP JSON for User and Index | [Mistral](https://docs.mistral.ai/robots) [V] |
| CCBot | Common Crawl | Open corpus | Honoured; warns of impostors | Reverse DNS `*.crawl.commoncrawl.org` | [Common Crawl](https://commoncrawl.org/ccbot) [V] |
| bingbot | Microsoft | Search, Copilot and grounding (no separate AI UA found) | — | — | [S] (SEJ, below) |

- **No first-party documentation found for:** Bytespider, TikTokSpider, the xAI/Grok tokens, DeepSeekBot, PetalBot/PanguBot, YouBot, cohere-ai. Their purposes come only from the community list [ai.robots.txt robots.json](https://raw.githubusercontent.com/ai-robots-txt/ai.robots.txt/main/robots.json) [V]. That list itself mislabels ChatGPT-User's compliance as "Yes", against OpenAI's own doc.
- **Microsoft** (bingbot; no separate AI UA): Bing's rewritten guidelines say "NOARCHIVE prevents content from being used in Copilot responses and grounding results", and NOCACHE limits Copilot to URL, title and snippet. Source: [SEJ (Matt G. Southern), 2026-02-27](https://www.searchenginejournal.com/bing-adds-geo-to-official-guidelines-expands-ai-abuse-definitions/568442) [S; Bing's own page did not render].

**robots.txt compliance and stealth crawling**

- **Cloudflare stealth-crawling test.** Source: [Cloudflare, 2025-08-04](https://blog.cloudflare.com/perplexity-is-using-stealth-undeclared-crawlers-to-evade-website-no-crawl-directives/) [V].
  - New, never-indexed domains with a full Disallow and WAF blocks still got answered by Perplexity.
  - Declared Perplexity traffic: 20–25M requests/day. Stealth traffic: 3–6M/day, using a generic Chrome/124 macOS UA and rotating IPs and ASNs.
  - Cloudflare delisted Perplexity as a verified bot.
  - Contrast: "ChatGPT-User fetched the robots file and stopped crawling when it was disallowed".
  - Perplexity's rebuttal ("Agents or Bots?") returned 403 [S].
- **Kim et al. (Duke), IMC '25.** About 3.9M requests to 36 sites from 130 self-declared bots. Source: [arXiv 2505.21733](https://arxiv.org/html/2505.21733v2) [V].
  - Compliance falls with stricter directives: crawl-delay 0.609, endpoint 0.310, disallow-all 0.307.
  - Named bots (crawl-delay / endpoint / disallow-all):
    - ChatGPT-User 0.910 / 0.131 / 1.000
    - PerplexityBot 0.933 / 0.897 / 0.202
    - Bytespider 0.398 / 0.000 / 0.000
    - Amazonbot 0.973 / 1.000 / 1.000
  - "less than 40%" of AI assistants and search crawlers re-check robots.txt within 168h.
- **TollBit scraper audit.** "None of the tested scrapers fetched the robots.txt file"; "All tested scrapers used current Chrome user-agents". Source: [TollBit, 2026-04-13](https://tollbit.com/blog/scraper-index-and-audit/) [V].
- **TollBit H1 2026.** About 15% of identified page-fetching agents in Europe reached disallowed URLs. TollBit "counts any request to a disallowed URL as a bypass". Source: [PPC Land, 2026-08-15](https://ppc.land/15-of-ai-page-fetchers-in-europe-reached-disallowed-urls-tollbit-finds/) [S].

**Cloudflare Radar and policy**

- **Crawl-to-refer ratios.** Source: [Cloudflare, 2025-08-29](https://blog.cloudflare.com/crawlers-click-ai-bots-training/) [V].

  | Operator | Jan 2025 | Jul 2025 |
  |---|---|---|
  | Anthropic | 286,930:1 | 38,066:1 |
  | OpenAI | 1,217:1 | 1,091:1 |
  | Perplexity | 54.6:1 | 194.8:1 |
  | Microsoft | 38.5:1 | 40.7:1 |
  | Google | 3.8:1 | 5.4:1 |

  - Purpose shares over 12 months: training 80%, search 18%, user actions 2%.
- **Radar 2025 Year in Review.** Source: [Cloudflare (Belson), 2025-12-15](https://blog.cloudflare.com/radar-2025-year-in-review/) [V].
  - AI bots other than Googlebot averaged 4.2% of HTML requests.
  - ChatGPT-User peaked at up to 16× its early-2025 level.
  - Anthropic's ratio reached up to 500,000:1.
  - Among the top-10k domains, GPTBot, ClaudeBot and CCBot had the most full-site disallows.
- **2025-07-01 default ("Content Independence Day").** "every new domain starts with the default of control"; more than 1M customers had already chosen the one-click block. Sources: [Cloudflare press release, 2025-07-01](https://www.cloudflare.com/press-releases/2025/cloudflare-just-changed-how-ai-crawlers-scrape-the-internet-at-large/); [Prince, 2025-07-01](https://blog.cloudflare.com/content-independence-day-no-ai-crawl-without-compensation/) [V].
- **2026-07-01 reclassification.** AI traffic is now split into **Search / Agent / Training**. From **2026-09-15**, new domains (and unchanged Free-tier sites) block Training and Agent "on the pages that display ads" while Search stays allowed. Mixed-purpose crawlers fall under "the most restrictive applicable rules". Sources: [Cloudflare, 2026-07-01](https://blog.cloudflare.com/content-independence-day-ai-options/); [Block AI bots docs, 2026-07-01](https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/) [V]. Whether the 2026-09-15 defaults took effect as described: [U].

**RFC 9309 (Robots Exclusion Protocol)**

Source for all bullets: [RFC 9309, Sept 2022](https://www.rfc-editor.org/rfc/rfc9309.txt) [V].
- **Group selection (§2.2.1).** Crawlers "find the group that matches the product token". Multiple matching groups "MUST be combined into one group". The `*` group is obeyed only "If no matching group exists".
- **Rule precedence (§2.2.2).** "The most specific match found MUST be used", meaning the match with the most octets. On a tie, "the "allow" rule SHOULD be used".
- **Special characters (§2.2.3).** `*` means "0 or more instances of any character"; `$` marks "the end of the match pattern".
- **Fetch status (§2.3.1.3–4).** A 4xx means the crawler "MAY access any resources". A 5xx or network error means "the crawler MUST assume complete disallow".
- **Limits.** Follow at least 5 redirects (§2.3.1.2); cache for no more than 24h (§2.4); parse at least 500 KiB (§2.5).

**Slop Detector code, compared with the above**

- `aiBotsBlockedByRobots()` applies the `*` group even when a bot has its own group. It ignores `Allow` and longest-match precedence, does not merge duplicate groups, and does not implement the `*` and `$` wildcards.
- `runAeoChecks()` treats *any* non-OK robots.txt fetch, or an error, as "allows all". For 5xx and network errors that is the opposite of RFC 9309.
- `BOT_UA` is `Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)`, which does not match OpenAI's documented GPTBot/1.4 string.
- Sources: `packages/core/src/aeo.ts` (local worktree, commit d37e91c) [V].

### Inferences
- `bot.notBlocked` probes a **training** crawler. Blocking it is a choice OpenAI documents as independent of search visibility ("Each setting is independent"). At answer time, the access that matters goes to OAI-SearchBot, PerplexityBot, Claude-SearchBot, Googlebot and bingbot (index), plus the user-triggered fetchers.
- Under Cloudflare's 2026 taxonomy, ChatGPT-User, Claude-User and Perplexity-User most likely fall into "Agent". If so, new ad-supported Cloudflare sites block them by default. That loss of answer-time access is worth surfacing.
- A no-JS HTTP read is still the right model for "what ChatGPT, Claude or Perplexity see at answer time". Googlebot and Applebot are exceptions, and the September 2026 OpenAI report should be re-tested.
- `robots.aiAllowed` treats a robots.txt that returns 5xx as a pass. RFC 9309 crawlers would instead treat the whole site as disallowed, so this is a false pass.

### Gaps
- No first-party statement from OpenAI, Anthropic or Perplexity on JS execution was found. The September 2026 OpenAI rendering claim is unverified.
- Bing's own guidelines page did not render, so Bing is covered only through SEJ.
- No first-party documentation exists for ByteDance, xAI, DeepSeek, Huawei, You.com or Cohere tokens.
- TollBit's primary quarterly figures were not opened.
- No managed-robots.txt adoption numbers after 2025 were found.

---

## 3. llms.txt: as of Oct 2026, does any major AI provider fetch or use /llms.txt? Should `site.llmsTxt` be down-weighted?

### Takeaway
No major AI search or answer provider has confirmed using llms.txt. Google Search states in writing that it ignores the file. Server logs show almost no retrieval-bot traffic to it, and correlation studies find no citation effect. The only real consumers are coding agents and docs tooling, plus Google's own Lighthouse audit, which in turn generates SEO-tool traffic. `site.llmsTxt` (7 points) should be made informational or reduced to ≤2 points, and validated against the **v2** spec (2026-08-10).

### Cited Findings

**The spec**

- **llms.txt v2.** Source: [llmstxt.org (Jeremy Howard; original 2024-09-03, v2 2026-08-10)](https://llmstxt.org/index.md) [V].
  - "An H1 with the name of the project or site. This is the only required section". A blockquote summary and H2 "file lists" of `[name](url): notes` items are optional.
  - Markdown twins go "either with `.md` appended (`page.html.md`) or with the extension replaced by `.md` (`page.md`)".
  - Discovery: `rel="alternate" type="text/markdown"` points to the markdown page, and `rel="describedby"` points to the llms.txt, via `<link>` or an HTTP `Link:` header.
  - "A file covers the URLs under its path … agents should use the most specific one".
  - v2 does **not** mention `/llms-full.txt` or `Accept` negotiation, and rejects `/.well-known/` on purpose.
  - Change log: [llmstxt.org/changes.md](https://llmstxt.org/changes.md) [V].
- **Standardization.** No IETF or W3C work was found. Source: [IETF Datatracker API query, 2026-10-19](https://datatracker.ietf.org/api/v1/doc/document/?format=json&type=draft&name__contains=llms) [V].
- **Lighthouse `llms-txt` audit.** Source: [Lighthouse source](https://raw.githubusercontent.com/GoogleChrome/lighthouse/main/core/audits/agentic/llms-txt.js) [V].
  - A 5xx or 429 scores 0; any other 4xx is not applicable.
  - Otherwise it passes only if all three hold:
    - an H1 matching `/^\s*#\s+.+/m`
    - a link matching `/\[.+\]\(.+\)/`
    - length ≥ 50 characters
  - It does not check Content-Type.
  - It shipped in Lighthouse v13.2.0 (2026-05-01) and was added to the default config in v13.3.0 (2026-05-07). Source: [Lighthouse releases API](https://api.github.com/repos/GoogleChrome/lighthouse/releases?per_page=12) [V].

**Provider statements**

- **Google Search.** Source: [Google, "Optimizing for generative AI features", updated 2026-07-10](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) [V].
  - "You don't need to create new machine readable files, AI text files, markup, or Markdown to appear in Google Search … as Google Search itself doesn't use them."
  - Creating LLMS.txt files for other systems "will neither harm nor help your site's visibility or rankings in Google Search, as Google Search ignores them."
- **John Mueller:**
  - April 2025: "To me, it's comparable to the keywords meta tag" [S] — [SEJ, 2025-04-17](https://www.searchenginejournal.com/google-says-llms-txt-comparable-to-keywords-meta-tag/544804/).
  - June 2025: "FWIW no AI system currently uses llms.txt" [S] — [SER, 2025-06-18](https://www.seroundtable.com/google-ai-llms-txt-39607.html).
  - June 2026: llms.txt "by design, can't trust what is here as a way of differentiating between different websites" [S] — [SEJ, 2026-06-15](https://www.searchenginejournal.com/googles-mueller-says-llms-txt-cant-help-llms-differentiate-sites/579304/).
- **Gary Illyes, reported July 2025:** Google doesn't support llms.txt and has no plans to. [U]
- **OpenAI, Anthropic, Perplexity, Microsoft:** no statement found that their crawlers or search use llms.txt (not found).
  - Claude Code 2.1.303 (npm, 2026-10-18) hard-codes `https://platform.claude.com/llms.txt` and `https://claude.com/docs/llms.txt` for its built-in docs agent. This was found by static inspection of the [npm tarball](https://registry.npmjs.org/@anthropic-ai/claude-code-linux-x64/-/claude-code-linux-x64-2.1.303.tgz) [V].

**Logs, correlation and adoption** (all industry data)

- **Ahrefs.** Source: [Ahrefs (Linehan), 2026-06-15](https://ahrefs.com/blog/llmstxt-study/) [V].
  - 137,210 domains; 28% publish llms.txt (an upper bound, because the sample is SEO-skewed).
  - **97% of those files got zero requests in May 2026.**
  - Share of requests by group: all AI bots 19.5%; AI coding/agentic tools **10.5%**; training crawlers 5.3%; **AI retrieval bots 1.1%**; SEO audit tools 21.7%.
  - Individual bots: GPTBot 4.51%, OAI-SearchBot 0.74%. Claude-Code is the second-ranked named AI bot.
- **SE Ranking.** About 300,000 domains, 10.13% adoption. Source: [SE Ranking (page dated 2026-10-15)](https://seranking.com/blog/llms-txt/) [V]; first reported by [SEJ, 2025-11-20](https://www.searchenginejournal.com/llms-txt-shows-no-clear-effect-on-ai-citations-based-on-300k-domains/561542/) [V].
  - "There's no correlation between AI citations and LLMs.txt"
  - "Removing this variable from our XGBoost model actually improved its accuracy."
- **C-SEO Bench "LLM Guidance".** The one method that occasionally helped (Retail +0.36 ranks) put an llms.txt-style summary *inside the document*. It does not validate a separate file. Source: [arXiv 2506.11097](https://arxiv.org/html/2506.11097v3) [V].
- **Astro de-adoption.** Astro removed its llms.txt files (PR #13538, around 2026-04-20): "these files get very little traffic." Source: [dacharycarey.com, 2026-05-04](https://dacharycarey.com/2026/05/04/astro-removed-llms-txt/) [S]. Direct probe on 2026-10-19: astro.build/llms.txt returns 404 [V].
- **Real files vary** (direct probes, 2026-10-19) [V]:
  - Served as `text/plain`: llmstxt.org, developers.cloudflare.com, vercel.com, platform.claude.com, mintlify.com/docs, react.dev, docs.netlify.com.
  - Served as `text/markdown`: docs.stripe.com, docs.github.com, docs.gitbook.com.
  - Stripe and platform.claude.com have **no blockquote**.
- **SPA soft-404s.** excalidraw.com/llms.txt and app.netlify.com/llms.txt return **200 text/html** SPA shells. These pass today's `llms.ok` rule. Direct probes, 2026-10-19 [V].

### Inferences
- Evidence for llms.txt affecting AI search or citation is negative, and evidence for coding-agent consumption is moderate. Score it 0–2 points and label it "agent/docs discoverability".
- A strict validator that requires `text/markdown`, a blockquote or exactly one H1 would fail Anthropic's, Stripe's, GitBook's and llmstxt.org's own files. Use v2 rules with Lighthouse parity.
- v2 path scoping means a root-only probe misses `/docs/llms.txt` deployments. v2 also adds `rel="describedby"` discovery.

### Gaps
- No primary statements found from OpenAI, Perplexity or Microsoft.
- The primary Illyes quote and the Google Search Central llms.txt add/remove episode (December 2025) are unverified.
- Use of llms.txt by Cursor @Docs, Copilot and MCP doc servers was not researched.

---

## 4. Machine-readable AI-usage preferences (IETF AIPREF, Cloudflare Content Signals, RSL 1.0, TDMRep, noai) and Google/Bing AI preview controls: status and what a checker should parse

### Takeaway
- **AIPREF** is still a pair of WG drafts: vocab-08 (2026-09-14) and attach-05 (2026-08-19). Both missed the WG's August 2026 milestone and the vocabulary is still churning. They define a robots.txt `Content-Usage:` rule and a `Content-Usage` HTTP header (an SF dictionary of `train-ai` / `ai-use` / `search` = `y`/`n`).
- **Cloudflare Content Signals** (`Content-Signal: search=yes, ai-train=no`) is the most widely deployed (3.8M+ managed domains in 2025) but has no formal versioned spec.
- **RSL 1.0** (2025-12-10) is a licensing pointer.
- **TDMRep** is a 2024 W3C CG report and the EU front-runner.
- No AI vendor documents honoring Content Signals, AIPREF, RSL or noai. OpenAI and Anthropic document robots.txt only.
- The controls with documented AI effect are Google's **`nosnippet` / `max-snippet`** (which govern direct input to AI Overviews and AI Mode) and Bing's **NOARCHIVE / NOCACHE** (Copilot).

### Cited Findings

**IETF AIPREF**

- **State.** Both drafts are "WG Document", intended Proposed Standard, IESG state "I-D Exists". Vocab was in WG Last Call from 2025-09-04 and returned to "WG Document" on 2025-11-03. Sources: [AIPREF documents](https://datatracker.ietf.org/wg/aipref/documents/); [vocab history](https://datatracker.ietf.org/doc/draft-ietf-aipref-vocab/history/) [V].
- **Milestones.** The vocab and attach drafts were to be "sent to the IESG for publication" in **Aug 2026**; both were missed. The chairs are Mark Nottingham and Suresh Krishnan. Source: [AIPREF about](https://datatracker.ietf.org/wg/aipref/about/) [V]. The original target was Aug 2025: [IETF blog, 2025-06-29](https://www.ietf.org/blog/ai-pref-progress/) [V].
- **draft-ietf-aipref-vocab-08** (Keller, Thomson; 14 Sep 2026). Source: [vocab-08](https://www.ietf.org/archive/id/draft-ietf-aipref-vocab-08.html) [V].
  - Status note: "DO NOT REFLECT CONSENSUS of the Working Group".
  - `train-ai`: "Using an asset to modify the learned parameters of a generative AI model".
  - `ai-use`: "Using an asset as input to a generative AI model, where the asset is not directly provided by the user".
  - `search`: "overrides any usage that falls into other categories".
  - Values are `y`/`n` in an RFC 9651 Dictionary. Unknown keys are ignored, and a parse failure makes all categories unknown.
  - Combining: "If any statement of preference indicates that the usage is disallowed, the result is that the usage is disallowed."
- **Vocabulary churn.**

  | Revision | Date | Categories |
  |---|---|---|
  | -02 | 2025-07-21 | `all` / `train-ai` / `train-genai` / `ai-use` / `search` |
  | -03 | 2025-09-05 | `bots` / `train-ai` / `train-genai` / `search` |
  | -05 | 2025-12-01 | `train-ai` / `search` |
  | -06 | 2026-04-28 | `train-ai` / `search` |
  | -08 | 2026-09-14 | `train-ai` / `ai-use` / `search` |

  Sources: [vocab-02](https://www.ietf.org/archive/id/draft-ietf-aipref-vocab-02.html), [vocab-03](https://www.ietf.org/archive/id/draft-ietf-aipref-vocab-03.html), [vocab-05](https://www.ietf.org/archive/id/draft-ietf-aipref-vocab-05.html), [vocab-06](https://www.ietf.org/archive/id/draft-ietf-aipref-vocab-06.html) [V].
- **draft-ietf-aipref-attach-05** (Illyes, Thomson; 19 Aug 2026; updates RFC 9309). Source: [attach-05](https://www.ietf.org/archive/id/draft-ietf-aipref-attach-05.html) [V].
  - ABNF: `content-usage = *WS "content-usage" *WS ":" *WS [ path-pattern 1*WS ] usage-pref EOL`.
  - Paths use longest-prefix matching. "Usage preferences apply only to those resources that can be crawled according to Allow/Disallow rules".
  - The HTTP `Content-Usage` header is an SF dictionary, e.g. `Content-Usage: train-ai=n`.
  - The draft defines **no precedence between header and robots.txt**; they are "intended to be complementary".
- **Adjacent individual drafts.** Seen in the Datatracker API (titles and dates only): `draft-romm-aipref-contentsignals-00`, "Vocabulary For Expressing Content Signals" (2026-04-04), and `draft-illyes-aipref-cbcp-04`, "Crawler best practices" (2026-10-11). [V metadata only]
- **Implementations.** None found. OpenAI, Anthropic and Google crawler docs mention only robots.txt. Sources: [OpenAI](https://developers.openai.com/api/docs/bots); [Anthropic](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) [V].

**Cloudflare Content Signals**

- **Policy text and adoption.** Source: [Cloudflare (Will Allen), 2025-09-24](https://blog.cloudflare.com/content-signals-policy/) [V].
  - "If a content-signal = no, you may not collect content for the corresponding use."
  - Definitions:
    - **search:** building a search index and providing search results.
    - **ai-input:** "inputting content into one or more AI models (e.g., retrieval augmented generation, grounding…)".
    - **ai-train:** "training or fine-tuning AI models".
  - Framed as express reservations under Art. 4 of EU Directive 2019/790.
  - "over 3.8 million domains"; the default is `search=yes, ai-train=no`, with no `ai-input` served.
- **Managed robots.txt now** (docs updated 2026-10-08). Source: [Managed robots.txt docs](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/) [V].
  - The managed line is `Content-signal: search=yes, ai-train=no, use=reference`. "content-use" is a test extension (`reference` = "Index, excerpt, and link back").
  - The managed block is **prepended** to the origin robots.txt.
- **Markdown for Agents responses** carry a permissive default `Content-Signal: ai-train=yes, search=yes, ai-input=yes` unless the origin sets one. This contradicts the managed robots.txt default. Source: [Markdown for Agents docs, 2026-10-09](https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/) [V].
- **News-publisher adoption** (8 of 505 news publishers): Content Signals 1.6%. Source: [IPTC MetaWatch](https://metawatch.iptc.org/ai-policy/) [V; undated "most recent crawl"].

**RSL**

- **RSL 1.0 spec.** RSL-SPEC-1.0, status "Recommendation", 2025-12-10. Source: [RSL 1.0 spec](https://rslstandard.org/rsl) [V].
  - Discovery:
    - robots.txt: `License: <absolute-URI>`, global or group-scoped.
    - HTTP: `Link: <…>; rel="license"`, with type `application/rsl+xml`.
    - HTML: `<link rel="license" type="application/rsl+xml">`.
    - RSS namespace.
  - Usage terms: `all`, `ai-all`, `ai-train`, `ai-input`, `ai-index`, `search`.
  - Clients "MUST honor the most restrictive combination of rights".
- **Supporters.** Cloudflare, Akamai, Creative Commons and IAB Tech Lab, plus publishers. No AI company commitment was found. Source: [RSL press release, 2025-12-10](https://rslstandard.org/press/rsl-1-specification-2025) [V].
- **Adoption.** The robots.txt `License` directive appears on 0.4% of 505 news publishers. Source: [IPTC MetaWatch](https://metawatch.iptc.org/ai-policy/) [V].

**TDMRep and the EU**

- **TDMRep CG Final Report** (2024-05-10): "not a W3C Standard". Source: [TDMRep](https://www.w3.org/community/reports/tdmrep/CG-FINAL-tdmrep-20240510/) [V].
  - Headers: `tdm-reservation: 1|0` and `tdm-policy`. Equivalent meta tags exist.
  - File: `/.well-known/tdmrep.json`.
  - Precedence: file < headers < HTML.
  - Adoption: meta tags 1.4%, file 1.2% of 505 publishers ([IPTC](https://metawatch.iptc.org/ai-policy/)) [V].
- **GPAI Code of Practice, Copyright Measure 1.3** (final 2025-07-10). Read from an unofficial mirror: [code-of-practice.ai](https://code-of-practice.ai/?section=copyright) [V].
  - Signatories follow robots.txt as "specified in … Request for Comments No. 9309".
  - They also follow "other appropriate machine-readable protocols" that are "adopted by international or European standardisation organisations, or are state-of-the-art… widely adopted".
- **Signatories** (Commission page, updated 2026-10-07): include Amazon, Anthropic, Google, Microsoft, Mistral AI, OpenAI and others. Meta is not listed. Source: [EC signatories](https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai) [V].
- **Commission consultation** on "generally-agreed state of the art TDM opt-out protocols": names robots.txt, TDMRep, C2PA TDM assertions, AI.txt, Spawning, JPEG Trust and others, but **not** AIPREF, Content Signals or RSL. Source: [EC consultation, updated 2025-12-01](https://digital-strategy.ec.europa.eu/en/faqs/stakeholder-consultation-ai-and-copyright-compliance) [V]. As of Oct 2026, no resulting list has been published (not found).
- **OLG Hamburg, Kneschke v LAION (5 U 104/24, Dec 2025).** The natural-language opt-out "lacked the necessary machine readability"; no formats were named. Source: [Freshfields, 2026-01-29](https://www.freshfields.com/en/our-thinking/blogs/technology-quotient/ai-training-copyright-part-2-text-and-data-mining-under-court-scrutiny-102mebl) [V; law-firm summary].

**noai and ai.txt**

- **img2dataset** skips images with `X-Robots-Tag: noai|noimageai|noindex|noimageindex` by default. Source: [README](https://github.com/rom1504/img2dataset) [V].
- **Google's supported robots directives** exclude noai and noimageai. Source: [Google robots meta spec, 2026-03-24](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag) [V].
- **Adoption:** noai 0.2% and ai.txt 0.8% of 505 publishers. Source: [IPTC](https://metawatch.iptc.org/ai-policy/) [V].

**Google and Bing AI controls**

- **`nosnippet`** applies "(at Google: web search, Google Images, Discover, AI Overviews, AI Mode)" and prevents use "as a direct input for AI Overviews and AI Mode". Source: [Google robots meta spec, updated 2026-03-24](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag) [V].
- **`max-snippet`** "will also limit how much of the content may be used as a direct input for AI Overviews and AI Mode"; `max-snippet:0` behaves like nosnippet. `data-nosnippet` excludes marked text. Same source [V].
- **Eligibility for AI features.** "a page must be indexed and eligible to be shown in Google Search with a snippet". Source: [Google AI features, updated 2025-12-10](https://developers.google.com/search/docs/appearance/ai-features) [V].
- **Search Console AI-features opt-out toggle** (2026-06-03; worldwide by 2026-08-31): "Sites that opt out will not receive traffic or impressions from our generative AI features". It has no robots.txt or meta equivalent, so it is **invisible to HTTP scanning**. Source: [Google (Loew), 2026-06-03, updated 2026-08-31](https://blog.google/products-and-platforms/products/search/new-controls-website-owners/) [V]. The UK CMA conduct requirement behind it: [S].
- **Bing:** "NOARCHIVE prevents content from being used in Copilot responses and grounding results"; NOCACHE limits Copilot to URL, title and snippet. Source: [SEJ, 2026-02-27](https://www.searchenginejournal.com/bing-adds-geo-to-official-guidelines-expands-ai-abuse-definitions/568442) [S].

### Inferences
- Only Google's and Bing's preview controls have documented effects on AI answers, so those alone justify a *scored* check. Everything else (AIPREF, Content Signals, RSL, TDMRep, noai, ai.txt) belongs in an informational "declared AI-usage policy" panel with conflict detection.
- A common conflict worth flagging: robots.txt allows GPTBot while `Content-Signal: ai-train=no`. OpenAI documents only robots.txt as its opt-out, so the crawl block is what actually works.
- The checker must parse robots.txt comments and case correctly. Cloudflare's policy comment block contains `# ai-train:` lines. Cloudflare also writes `Content-signal` with a lowercase "s" and prepends its managed group.

### Gaps
- Exactly which AIPREF revision re-added `ai-use` (-07 or -08) is unknown.
- Dutch and other EU case law is unresearched.
- The CMA primary text was not opened.
- No AI-vendor pledge to honor RSL, AIPREF or Content Signals was found as of Oct 2026.

---

## 5. Bot authentication and payments (Web Bot Auth, Cloudflare signed/verified agents, pay-per-crawl, x402): implications for `bot.notBlocked`

### Takeaway
- **Web Bot Auth:** the IETF chartered `webbotauth` on 2025-10-23. Its single adopted draft is `draft-ietf-webbotauth-httpsig-protocol-00` (2026-09-01), and both charter milestones were missed.
- **Deployed signers:** OpenAI's ChatGPT agent, Google-Agent (a subset of requests), Cloudflare's signed-agent cohort, and Visa/Mastercard agent payments.
- **Header-format split:** Cloudflare's verifier still requires the older quoted-string `Signature-Agent`, while the WG draft and Google use the dictionary form.
- **Verification is by IP, reverse DNS or signature.** A spoofed GPTBot UA from Slop Detector's IPs is "unverified" traffic, so the current probe measures how a site treats an *impostor*, not GPTBot.
- **Challenges are detectable from headers:**
  - `cf-mitigated: challenge` (Cloudflare)
  - `x-amzn-waf-action` with **HTTP 202** (AWS WAF challenge) or 405 (CAPTCHA)
- **402 responses identify paid access:** Cloudflare pay-per-crawl uses `crawler-price`; x402 v2 uses `PAYMENT-REQUIRED`.

### Cited Findings

**Web Bot Auth at the IETF**

- **Charter.** The WG was chartered 2025-10-23. Scope includes AI training crawlers and AI agents. It excludes "distinguishing non-participating bots from other clients". Milestones were standards-track specs to the IESG by 2026-04-30 and a BCP by 2026-08-31. Sources: [WG about](https://datatracker.ietf.org/wg/webbotauth/about/); [charter history](https://datatracker.ietf.org/doc/charter-ietf-webbotauth/history/) [V].
- **WG draft.** `draft-ietf-webbotauth-httpsig-protocol-00` (2026-09-01; Meunier of Cloudflare, Major of Google) replaces draft-meunier-web-bot-auth-architecture-05 and http-message-signatures-directory-05. Sources: [draft -00](https://datatracker.ietf.org/doc/draft-ietf-webbotauth-httpsig-protocol/00/); [Datatracker search](https://datatracker.ietf.org/doc/search?name=bot&sort=&rfcs=on&activedrafts=on&olddrafts=on) [V].
  - Mechanics:
    - Signatures use RFC 9421 HTTP Message Signatures.
    - `Signature-Agent` is an SF Dictionary (`sig1="https://…"`).
    - Required parameters: `created`, `expires`, `keyid` (a JWK SHA-256 thumbprint) and `tag="web-bot-auth"`.
    - The signature must cover `@authority` or `@target-uri`, plus `signature-agent`.
    - The key directory is at `/.well-known/http-message-signatures-directory`, served as `application/http-message-signatures-directory+json` and itself signed.
- **Cloudflare's verifier** (docs updated 2026-10-08). Source: [Cloudflare Web Bot Auth docs](https://developers.cloudflare.com/bots/reference/bot-verification/web-bot-auth/) [V].
  - It implements the older `…directory-03` / `…architecture-02` drafts.
  - `Signature-Agent` "must be a quoted string"; the dictionary form is listed as a failure.
  - Ed25519 only.
- **Google.** "A subset of requests made by the `Google-Agent`" are signed with `Signature-Agent: g="https://agent.bot.goog"`. "Not all Google user agents are using Web Bot Auth." Source: [Google, 2026-10-13](https://developers.google.com/crawling/docs/crawlers-fetchers/web-bot-auth) [V].
- **OpenAI.** The key directory at chatgpt.com has one Ed25519 key, with `"signature_agent": "https://chatgpt.com"` and `"purpose": "ai"`. Its `exp` corresponds to 2026-10-26 (computed). Source: [chatgpt.com key directory](https://chatgpt.com/.well-known/http-message-signatures-directory) [V]. OpenAI's own allowlisting help page returned 403 [U]; ChatGPT agent's signing is corroborated by [Cloudflare, 2025-08-04](https://blog.cloudflare.com/perplexity-is-using-stealth-undeclared-crawlers-to-evade-website-no-crawl-directives/) [V].
- **Cloudflare signed agents.** The first cohort was ChatGPT agent, Goose, Browserbase, Anchor Browser and Cloudflare Browser Rendering. Source: [Cloudflare, 2025-08-28](https://blog.cloudflare.com/signed-agents/) [V].
- **Payment networks.** Visa Trusted Agent Protocol, Mastercard Agent Pay and American Express build on Web Bot Auth. Source: [Cloudflare, 2025-10-24](https://blog.cloudflare.com/secure-agentic-commerce/) [V].
- **Other verifiers.**
  - AWS WAF: "Verified WBA bots will now be automatically allowed by default" (CloudFront). Source: [AWS, 2025-11-21](https://aws.amazon.com/about-aws/whats-new/2025/11/aws-waf-web-bot-auth-support) [V].
  - Akamai classes signed requests as "validated-bot". Source: [Akamai, 2025-11-10](https://www.akamai.com/blog/security/2025/nov/redefine-trust-web-bot-authentication) [V].
  - Vercel verifies bots by IP, rDNS and Web Bot Auth. Source: [Vercel bot management, 2026-09-10](https://vercel.com/docs/bot-protection) [V].
  - Vercel's verified directory lists `gptbot`, `oai-searchbot`, `chatgpt-user`, `chatgpt-operator`, `claude-user`, and `ora-bot`, which "Measures how well websites work for AI agents… on demand when someone requests a score". This is a precedent for a scorer registering as a verified bot. Same source [V].

**Verified-bot programs, spoofing and challenges**

- **Cloudflare verified-bots policy** (2026-10-08). Source: [Cloudflare verified-bots policy](https://developers.cloudflare.com/bots/concepts/bot/verified-bots/policy/) [V].
  - It requires "Honest self-identification" via Web Bot Auth, a published IP list plus a stable UA, or rDNS.
  - "Effective July 1, 2026, signed agents are classified as Verified".
  - New categories include Search, Agent and Training.
- **Fake-bot rules.** Cloudflare's "Fake Google Bot" and "Fake Bing or MSN Bot" managed rules check rDNS/IP behind the UA; **no GPTBot equivalent is documented**. Source: [Cloudflare fake-bot rules, 2026-05-05](https://developers.cloudflare.com/waf/troubleshooting/fake-bot-managed-rules/) [V].
- **Cloudflare challenges.** Detected via `cf-mitigated: challenge` ("the only valid value"); the content-type is `text/html`. Source: [Cloudflare challenge detection, 2026-05-05](https://developers.cloudflare.com/cloudflare-challenges/challenge-types/challenge-pages/detect-response/) [V].
- **AWS WAF.** A challenge returns `x-amzn-waf-action: challenge` with **HTTP 202**; a CAPTCHA returns `captcha` with HTTP 405. The interstitial page is sent only if `Accept` contains `text/html`. Source: [AWS WAF docs](https://docs.aws.amazon.com/waf/latest/developerguide/waf-captcha-and-challenge-actions.html) [V].
- **Vercel challenge mode** "prevents requests that falsely claim to be from a browser". Source: [Vercel](https://vercel.com/docs/bot-protection) [V]. A challenged response carries `X-Vercel-Mitigated: challenge` with 403 [S].

**Pay-per-crawl and x402**

- **Cloudflare pay per crawl.** "Pay per crawl is currently in closed beta." Source: [Cloudflare, 2026-07-28](https://developers.cloudflare.com/ai-crawl-control/features/pay-per-crawl/what-is-pay-per-crawl/) [V].
  - A 402 response carries `crawler-price: USD 0.01`. The crawler replies with `crawler-exact-price` or `crawler-max-price`, and a successful response carries `crawler-charged`. Payment headers must be covered by the Web Bot Auth signature. Source: [Cloudflare crawl pages, 2026-04-23](https://developers.cloudflare.com/ai-crawl-control/features/pay-per-crawl/use-pay-per-crawl-as-ai-owner/crawl-pages/) [V].
  - Error codes are listed at [Cloudflare error codes, 2026-04-23](https://developers.cloudflare.com/ai-crawl-control/features/pay-per-crawl/use-pay-per-crawl-as-ai-owner/error-codes/) [V].
- **x402 v2.** Base64-JSON headers `PAYMENT-REQUIRED` (server→client), `PAYMENT-SIGNATURE` (client→server) and `PAYMENT-RESPONSE`, with `x402Version: 2`. Sources: [x402 v2 HTTP transport](https://github.com/x402-foundation/x402/blob/main/specs/transports-v2/http.md) [V]; [x402 docs](https://docs.x402.org/core-concepts/http-402) [V].
  - v1 used `X-PAYMENT`. [S]
  - The x402 Foundation (Coinbase and Cloudflare) was announced 2025-09-23. Source: [Cloudflare blog](https://blog.cloudflare.com/x402/) [V].

**Slop Detector code and copy**

- `bot.notBlocked` passes on `bot.ok` (any 2xx) using `Accept: */*`. Source: `packages/core/src/aeo.ts` [V].
- The web copy says it "returns 2xx rather than a WAF challenge or 403 block". Source: `apps/web/functions/_posts.ts` [V].
- Consequences:
  - **False pass:** AWS WAF challenges return 202, and `cf-mitigated` is never checked.
  - **False fail:** sites that allow verified GPTBot but challenge unverified automation block the spoofed probe.

### Inferences
- Redesign `bot.notBlocked` as an honest, tri-state probe:
  - **Baseline:** a fetch with Slop Detector's own UA.
  - **Class probes:** search/agent-class probes that keep our identity and add a bot token. Do not impersonate OpenAI.
  - **Classification order:** challenge headers, then 402 (parse the price/scheme), then 401/403/451, then 429/5xx (inconclusive), then 2xx plus a content-similarity check against the baseline.
  - **Outcomes:** report "unknown" rather than "fail" when the baseline is also blocked. Report the vantage point (Workers egress vs local CLI).
- Optionally make Slop Detector a signed agent (key directory plus a `/bot` page). Keep one unsigned probe for scoring, and support both `Signature-Agent` formats.

### Gaps
- Anthropic, Perplexity (Comet) and OpenAI Atlas signing status: not found.
- What an *unsigned* request gets from a pay-per-crawl zone (402 with a price, or 403): not documented in the pages opened.
- Akamai and HUMAN block-page markers: [U].
- How Cloudflare treats a spoofed GPTBot specifically: not found.

---

## 6. Agentic browsers and in-page agent interfaces (Atlas, Comet, Gemini/Chrome, Claude in Chrome; WebMCP; NLWeb; ARD; A2A): what page properties do they rely on, and which deterministic "agent-operability" checks are justified?

### Takeaway
The strongest deterministic signal is Google's own **Lighthouse "Agentic Browsing" category**. It was introduced in v13.2.0 (2026-05-01), added to the default config in v13.3.0, and enabled in PageSpeed Insights in v13.4.1. Its audits:
- an "Accessibility for agents" subset of 33 axe rules (binary pass/fail)
- WebMCP registered tools, declarative form coverage, and schema validity
- llms.txt
- CLS layout stability
- an Agentic Resource Discovery (ARD) manifest (v13.5.0, 2026-09-18)

Chrome's docs state "Agents review the accessibility tree to identify interactive elements", and Playwright MCP drives pages through the accessibility tree.

WebMCP is a W3C CG draft (16 Oct 2026; `document.modelContext`) with origin trials in Chrome 149 and Edge 150. Its declarative form attributes are still explainer-stage.

OpenAI's reported "Atlas uses ARIA" guidance could not be verified (help center returned 403).

### Cited Findings

**Lighthouse Agentic Browsing**

- **Release timeline.** Source: [Lighthouse releases API](https://api.github.com/repos/GoogleChrome/lighthouse/releases?per_page=12) [V].
  - v13.2.0 (2026-05-01): "agentic: add new agentic browsing category"; webmcp-form-coverage, webmcp-registered-tools and webmcp-schema-validity audits; "config: implement llms.txt check for AI agents"; "enable and add new axe audits for agentic category".
  - v13.3.0 (2026-05-07): "New agentic browsing category added to default config".
  - v13.4.1 (2026-07-20): "Enabled Agentic Browsing category via PSI API"; WebMCP gatherers check `document.modelContext`.
  - v13.5.0 (2026-09-18): "ard-schema: add Agent Resource Discovery audit"; llms.txt and ARD grouped under "agent discovery".
- **Scoring.** The category is experimental and "based on proposed standards", made of deterministic audits. It reports a fractional pass ratio rather than a 0–100 score. Testing needs Chrome 150+. Source: [Chrome, agentic browsing scoring, 2026-05-05](https://developer.chrome.com/docs/lighthouse/agentic-browsing) [V].
- **`agent-accessibility-tree` audit.** Source: [Lighthouse source](https://raw.githubusercontent.com/GoogleChrome/lighthouse/main/core/audits/agentic/agent-accessibility-tree.js) [V].
  - Title: "Accessibility tree is well-formed". Description: "A well-formed accessibility tree helps AI agents to navigate and interact with the page."
  - It filters axe violations to 33 rule IDs:
    - **Naming:** `button-name`, `input-button-name`, `input-image-alt`, `label`, `link-name`, `select-name`, `document-title`, `svg-img-alt`, `aria-dialog-name`, `aria-input-field-name`, `aria-toggle-field-name`, `aria-tooltip-name`, `aria-treeitem-name`, `aria-command-name`.
    - **ARIA validity:** `aria-allowed-attr`, `aria-allowed-role`, `aria-conditional-attr`, `aria-prohibited-attr`, `aria-required-attr`, `aria-required-children`, `aria-required-parent`, `aria-roles`, `aria-text`, `aria-valid-attr`, `aria-valid-attr-value`, `aria-hidden-body`, `aria-hidden-focus`.
    - **Other:** `duplicate-id-aria`, `definition-list`, `table-duplicate-name`, `tabindex`, `autocomplete-valid`, `presentation-role-conflict`.
  - Scoring is `score: Number(items.length === 0)`, i.e. binary.
- **Chrome rationale.** "Agents review the accessibility tree to identify interactive elements"; missing labels can stop "users with visual disabilities and agents" completing a task. No specific agent is named. Source: [Chrome, Accessibility for agents, 2026-05-05](https://developer.chrome.com/docs/lighthouse/agentic-browsing/accessibility-for-agents) [V].
- **Layout stability.** "Visual stability ensures that agents can reliably interact with elements based on their position" (the audit is CLS). Source: [Chrome, 2026-05-05](https://developer.chrome.com/docs/lighthouse/agentic-browsing/layout-stability) [V].
- **"Forms missing declarative WebMCP"** flags `<form>`s without both `toolname` and `tooldescription`. "For now, this audit is informational." Source: [Chrome, 2026-05-05](https://developer.chrome.com/docs/lighthouse/agentic-browsing/forms-missing-declarative-webmcp) [V].
- **"Registered WebMCP tools"** lists declarative and imperative (`document.modelContext.registerTool`) tools. It is informational and warns at more than 40 tools. Source: [Chrome, 2026-09-21](https://developer.chrome.com/docs/lighthouse/agentic-browsing/registered-webmcp-tools) [V].
- **`ard-schema` audit.** Validates an Agentic Resource Discovery manifest at `/.well-known/ard.json` or via `rel="ard"`. Legacy `/.well-known/ai-catalog.json` and `rel="ai-catalog"` get Low severity. Scores: 0 on a validator error, 0.9 with warnings only, otherwise 1; "not applicable" if no signal and a 4xx. Source: [Lighthouse source](https://raw.githubusercontent.com/GoogleChrome/lighthouse/main/core/audits/agentic/ard-schema.js) [V].

**WebMCP, ARD, A2A, MCP and NLWeb**

- **WebMCP spec.** "Draft Community Group Report", **16 October 2026**, Web Machine Learning CG; editors Walderman (Microsoft), Sagar and Farolino (Google). Source: [WebMCP spec](https://webmachinelearning.github.io/webmcp/) [V].
  - The interface is `ModelContext` via **`document.modelContext`**, not `navigator.modelContext`. Methods: `registerTool(tool, options)`, `getTools(options)`, `executeTool(...)`. Events: `ontoolchange`, `ontoolactivated`, `ontoolcancel`.
  - It is gated by a "tools" Permissions-Policy feature (default `'self'`). Sites can disable it with `Permissions-Policy: tools=()`.
  - It includes a `consequentialHint` annotation.
  - The README says: "WebMCP is currently focused on the imperative" API, and the declarative API "is not part of the specification at this time". Source: [WebMCP README](https://github.com/webmachinelearning/webmcp) [V].
- **WebMCP declarative explainer.** Attributes `toolname`, `tooldescription` and `toolautosubmit` on `<form>`, and `toolparamdescription` on controls. Chromium is trialling "a loose version". Source: [declarative explainer](https://github.com/webmachinelearning/webmcp/blob/main/declarative-api-explainer.md) [V].
- **Implementation status.** Source: [implementation status](https://github.com/webmachinelearning/webmcp/blob/main/implementation-status.md) [V; undated].
  - "An Origin Trial is live in Chrome 149" (flag `about:flags#enable-webmcp-testing`).
  - "An Origin Trial is live in Edge 150".
  - Supported by ChatGPT Desktop; experimental in Brave Leo.
  - Firefox and Safari: only standards-position links.
- **Chrome early preview.** "WebMCP is available for early preview" (2026-02-10; Bandarra). Source: [Chrome blog](https://developer.chrome.com/blog/webmcp-epp) [V].
- **ARD.** Agentic Resource Discovery Specification v0.91, status "Proposal", 2026-08-26 (Bu of Google, R.V. Guha, Smith of Hugging Face). Source: [ARD spec](https://agenticresourcediscovery.org/spec/) [V].
  - Discovery:
    - `/.well-known/ard.json`
    - `<link rel="ard">`
    - robots.txt `Agentmap: <url>`
    - DNS SVCB records
  - Entries carry media types such as `application/mcp-server-card+json` and `application/a2a-agent-card+json`.
  - The legacy `/.well-known/ai-catalog.json` is acceptable.
- **A2A.** Latest release 1.0.0; Agent Card at **`/.well-known/agent-card.json`** (§8.2). Required fields: name, description, supportedInterfaces, version, capabilities, defaultInputModes, defaultOutputModes, skills. A2A has joined the Agentic AI Foundation. Source: [A2A spec](https://a2a-protocol.org/latest/specification/) [V].
- **MCP.** The roadmap (updated 2026-08-22; spec revision 2026-07-28) lists **no `.well-known` server-discovery deliverable**; "progressive discovery" is server-side. Source: [MCP roadmap](https://modelcontextprotocol.io/development/roadmap) [V]. No spec for `/.well-known/mcp.json` was found.
- **Mintlify's custom Link rels.** Mintlify docs send `rel="mcp-server-card"`, `"agent-card"`, `"api-catalog"` and `"agent-skills"` Link relations pointing to `/.well-known/…`. These are non-registered rels. Source: direct probe of mintlify.com/docs, 2026-10-19 [V].
- **NLWeb.** The repo moved to `nlweb-ai/NLWeb` ("Main reference implementation for NLWeb"). Created 2025-04-28, last push 2026-08-11, not archived, 6,256 stars, MIT license. Source: [GitHub API](https://api.github.com/repos/microsoft/NLWeb) [V]. 2026 production adoption: not found.

**Agent stacks and agentic browsers**

- **Playwright MCP:** "Uses Playwright's accessibility tree, not pixel-based input"; "No vision models needed". Vision is opt-in via `--caps=vision`. Source: [Playwright MCP README](https://github.com/microsoft/playwright-mcp) [V].
- **Claude in Chrome.** Source: [Claude blog, 2025-08-25 (updated)](https://claude.com/blog/claude-for-chrome) [V].
  - Piloted 2025-08-25; beta for all Max subscribers 2025-11-24; available to Pro, Team and Enterprise 2025-12-18.
  - Has site-level permissions and confirmations before "high-risk actions".
  - Blocked from financial-services, adult and pirated-content site categories.
- **Google-Agent:** user-triggered, with a full Chrome UA and experimental Web Bot Auth signing. Source: [Google, 2026-08-19](https://developers.google.com/search/docs/crawling-indexing/google-user-triggered-fetchers) [V].
- **ChatGPT Atlas:** OpenAI's publishers and developers FAQ (help.openai.com/en/articles/12627856) returned **403** to three separate fetch attempts, so the widely repeated "Atlas uses ARIA tags" guidance is [U]. Atlas traffic is reported "indistinguishable from standard Chrome traffic" [S] (HUMAN snippet).

### Inferences
- Several "agent-readiness" checks are justified because Google ships them as deterministic Lighthouse audits:
  - **Accessibility for agents** (the 33-rule axe subset).
  - **WebMCP declarative/imperative detection** (informational).
  - **ARD manifest validity** (informational).
  - **Layout stability.**
- Slop Detector already runs headless Chromium, so the 33-rule subset is cheap to add (axe-core). Its value is that it is actionable, overlaps WCAG work, and has Google's imprimatur. Evidence of *effect on agent task success* is indirect: accessibility-tree-based agents (Playwright MCP, WASP's axtree agents) plus Chrome's statement.
- WebMCP and ARD are proposal-stage, so report them only. Detect imperative tools by injecting an init-script shim on `document.modelContext.registerTool`, or via `getTools()` when the origin-trial flag is on. Detect declarative tools from `form[toolname][tooldescription]`.
- For #206: point discovery at ARD (which subsumes MCP server cards and A2A agent cards) and at A2A's `/.well-known/agent-card.json`. Drop `/.well-known/mcp.json`, for which no spec was found.

### Gaps
- No controlled study was found linking page accessibility to agent task success. The search budget ran out before arXiv sweeps on this were possible.
- OpenAI Atlas and Perplexity Comet site guidance: [U] / not found.
- Gemini in Chrome "auto browse" site guidance: not found.
- Whether Lighthouse's `layout-stability` threshold differs from standard CLS: not stated.

---

## 7. Content manipulation: hidden prompt injection and AI recommendation poisoning. How much evidence is there, do engines treat it as spam, and can a deterministic check be safe?

### Takeaway
Hidden-instruction attacks on LLM agents and answer engines are well documented in research and in the wild:
- **Research:** EIA (up to 70% PII theft with opacity-0 injections), Nestaas (2.5× recommendation lift on Bing Copilot).
- **In the wild:** Brave's Comet disclosures (white text, HTML comments, spoiler tags, faint text in screenshots); 17 arXiv papers with hidden "positive review only" prompts; Microsoft's 50+ "AI Recommendation Poisoning" prompts from 31 companies.

Engines treat it as spam. Google's spam policies now include "attempting to manipulate generative AI responses in Google Search", and Bing's February 2026 guidelines add a "Prompt Injection and AI Manipulation" section [S].

A deterministic detector is feasible if it requires hiding **and** an AI-addressed imperative lexicon together. Prefilled-prompt "Summarize with AI" links are the lowest-false-positive target.

### Cited Findings

**Research**

- **EIA (Liao et al., ICLR 2025).** Source: [arXiv 2409.11295](https://arxiv.org/abs/2409.11295), [HTML v5](https://arxiv.org/html/2409.11295v5) [V].
  - The injected element's CSS opacity defaults to 0, and screenshots before and after injection "can not be distinguished unless close examination".
  - Injections are hidden forms or mirrored elements carrying instructions in text or `aria-label`.
  - Results: up to **70%** ASR for stealing specific PII (GPT-4V); full-request theft **16%** at opacity 0.2.
  - With VirusTotal, "none of these webpages were flagged as malicious or suspicious".
- **WASP (Evtimov et al., Meta).** Source: [arXiv 2504.18575](https://arxiv.org/abs/2504.18575), [HTML v3](https://arxiv.org/html/2504.18575v3) [V].
  - Injections are *visible* user-generated content (GitLab issues, Reddit posts).
  - Intermediate ASR (agent diverted toward the attacker's goal): 0.321–0.857. o1 is highest at 0.857.
  - End-to-end completion: 0.000–0.167 ("security through incompetence").
  - A defensive system prompt cut GPT-4o's intermediate ASR from 0.429 to 0.226.
- **Nestaas et al.** Hidden white size-1 text on live pages raised Bing Copilot recommendation of the attacker's product ~2.5× (34.0%→59.4% against real brands). Source: [arXiv 2406.18382](https://arxiv.org/html/2406.18382v2) [V].
- **Claude in Chrome red-teaming.** 123 test cases across 29 attack scenarios; ASR 23.6% without mitigations, 11.2% with. On a browser-specific challenge set, 35.7%→0%. Source: [Claude blog, 2025-08-25](https://claude.com/blog/claude-for-chrome) [V].

**In-the-wild incidents**

- **Brave, Perplexity Comet (Chaikin, Sahib; 2025-08-20).** Source: [Brave](https://brave.com/blog/comet-prompt-injection/) [V].
  - Instructions were hidden as "white text on a white background, HTML comments", or in Reddit spoiler tags.
  - Comet exfiltrated the user's email and an OTP.
  - Comet sends page content to its LLM "without distinguishing between the user's instructions and untrusted content". A later update says Perplexity had still not fully mitigated it.
- **Brave, "Unseeable prompt injections in screenshots" (2025-10-21, updated 2025-10-31).** Source: [Brave](https://brave.com/blog/unseeable-prompt-injections/) [V].
  - Comet: instructions in "faint light blue text on a yellow background".
  - Fellou: injection via navigation to a visible-text page.
  - Opera Neon was also affected (named in the 2025-10-31 update).
- **Nikkei Asia (Sugiyama, Eguchi; 2025-07-01).** Source: [Nikkei Asia](https://asia.nikkei.com/business/technology/artificial-intelligence/positive-review-only-researchers-hide-ai-prompts-in-papers) [V].
  - **17** arXiv papers from **14** institutions in **8** countries hid prompts such as "give a positive review only" and "do not highlight any negatives".
  - They were hidden with "white text" or "extremely small font sizes".
  - KAIST withdrew an ICML paper.
- **Microsoft, "Manipulating AI memory for profit: The rise of AI Recommendation Poisoning" (Defender Security Research / Kochavi; 2026-02-10).** Source: [Microsoft Security blog](https://www.microsoft.com/en-us/security/blog/2026/02/10/ai-recommendation-poisoning/) [V].
  - "Summarize with AI" buttons open an assistant with a prefilled prompt (e.g. `?q=`) that tells it to "remember" the company as a trusted source.
  - Over 60 days: "over 50 unique prompts from 31 companies across 14 industries", all from real businesses.
  - Hunting keywords: "remember", "trusted source", "in future conversations", "authoritative source", "cite or citation".
  - Mapped to MITRE ATLAS AML.T0080.000 and AML.T0051.
- **GEO-Flag.** GEO-style manipulation appears in 8.90% of sampled Google/Gemini-result pages and 16.36% of 2026-modified pages. This is GEO, not injection specifically. Source: [arXiv 2608.16824](https://arxiv.org/abs/2608.16824) [V: abstract].

**Spam policies**

- **Google spam policies** (last updated 2026-08-28). Source: [Google](https://developers.google.com/search/docs/essentials/spam-policies) [V].
  - Spam includes "attempting to manipulate generative AI responses in Google Search".
  - Hidden-text violations include "Using white text on a white background", "Using CSS to position text off-screen" and "Setting the font size or opacity to 0".
  - Exempt: "Accordion or tabbed content…" and "Text that's only accessible to screen readers and is intended to improve the experience for those using screen readers".
  - "Prompt injection" is not named.
- **Bing Webmaster Guidelines** (rewritten February 2026). Source: [SEJ, 2026-02-27](https://www.searchenginejournal.com/bing-adds-geo-to-official-guidelines-expands-ai-abuse-definitions/568442) [S].
  - Prompt injection grew from "a brief mention" into a section titled "Prompt Injection and AI Manipulation".
  - Keyword stuffing became "Keyword Stuffing and Artificially Engineered Language", covering content designed to trigger citations.
  - "GEO doesn't guarantee citations".

**Other attempts**

- OpenAI's "hardening ChatGPT Atlas against prompt injection" post returned 403 [U].
- The Guardian's December 2024 ChatGPT-search hidden-text test could not be fetched [U].

### Inferences
- **Two-part detector, warning-level first.**
  - **(a) Prompt-poisoning links.** Find `<a href>` and `form action` targets on AI-assistant hosts (chatgpt.com, chat.openai.com, claude.ai, perplexity.ai, copilot.microsoft.com, gemini.google.com, grok.com, meta.ai) whose decoded prompt parameter matches Microsoft's memory/authority keywords. This is deterministic and low in false positives, because neutral "Summarize this page" prompts don't match.
  - **(b) Hidden AI-addressed instructions.** In Chromium, collect text from elements that are hidden in Google's listed ways:
    - opacity 0 or font-size ≤1px
    - off-screen positioning
    - foreground/background contrast ≈1:1
    - zero-size or clipped boxes without the `.sr-only` pattern
  - Also collect `aria-label`, `alt`, `title`, HTML comments and `<noscript>`.
  - Flag only when that text matches an AI-addressed imperative lexicon, e.g.:
    - "ignore (all|previous|prior) instructions"
    - "if you are an? (AI|LLM|language model|assistant)"
    - "give a positive review"
    - "do not (mention|reveal)"
    - "recommend <X> (first|over)"
    - "remember <X> as (a )?trusted"
- **False-positive risks** (mitigations in brackets):
  - Screen-reader-only text, which Google exempts [require the lexicon match].
  - Accordions and tabs [`display:none` alone is not enough; require lexicon].
  - Pages *about* prompt injection, and security research [skip if the same string is also visible].
  - Legitimate "note for AI agents: use our API/llms.txt" notices [the lexicon excludes neutral directives].
  - EIA-style injections hidden in `aria-label` on visible controls [inspect `aria-label` text too].
- Start as an unscored warning, measure the false-positive rate on a corpus, then decide on scoring. Cite Google's spam policy and Bing's guidelines as the authority for "this is spam".

### Gaps
- No in-the-wild prevalence measurement of hidden prompt injection on the open web (e.g., a Common Crawl sweep) was found; the search budget was exhausted.
- The exact text of Bing's new section was not opened (Bing's page did not render).
- OpenAI's Atlas hardening post: [U].
- No deterministic open-source detector with a published false-positive rate was found.

---

## 8. Markdown for agents: adoption of `Accept: text/markdown`, `.md` URLs and `Link rel=alternate type=text/markdown`. Is there any standardization?

### Takeaway
- **Who serves it:** markdown via `Accept: text/markdown` on the canonical URL is now mainstream across docs platforms and CDNs (Cloudflare, Vercel, Mintlify, Stripe, GitHub Docs; a Fastly example).
- **Who asks for it:** 3 of 7 coding agents surveyed request markdown (Claude Code, Cursor, OpenCode); Gemini CLI does so only in an experimental mode. Codex, Copilot and Windsurf do not. No evidence was found of answer engines (ChatGPT search, Perplexity, Google) requesting markdown, and Google says it is not needed for Search.
- **Standards:** none beyond RFC 7763 (the media type), RFC 9110 (`Vary`), and llms.txt v2's link-relation conventions.
- **Benefit:** markdown cuts tokens a great deal (vendor figures 80–99%). Peer-reviewed evidence says answer quality comes from removing boilerplate, not from markdown as such.

### Cited Findings

**Vendor implementations**

- **Cloudflare, "Introducing Markdown for Agents"** (Martinho, Allen; 2026-02-12). Source: [Cloudflare](https://blog.cloudflare.com/markdown-for-agents/) [V].
  - "16,180 tokens in HTML and 3,150 tokens when converted to markdown. That's a 80% reduction".
  - "some of the most popular coding agents today – like Claude Code and OpenCode – send these accept headers".
  - Beta on Pro, Business and Enterprise; not on Free.
- **Cloudflare docs** (updated 2026-10-09). Source: [Cloudflare docs](https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/) [V].
  - "`Vary` includes `Accept`" on converted responses.
  - Conversion limit 6 MiB.
  - **`x-markdown-tokens` is not mentioned in the current docs**, and live markdown responses on 2026-10-19 lacked it (direct probe [V]). Issue #206's acceptance criterion assumes this header.
- **Vercel, "Making agent-friendly pages with content negotiation"** (Cowan, Shah; 2026-02-03). Source: [Vercel](https://vercel.com/blog/making-agent-friendly-pages-with-content-negotiation) [V].
  - A ~500 KB HTML page becomes 3 KB of markdown, a "99.37% reduction".
  - The rewrite matches `text/markdown` anywhere in `Accept`.
  - Vercel also uses `<link rel=alternate>`.
  - Direct probe: **`vercel.com/index.md` returns 200 text/html (the 2.6 MB homepage)**, a soft-404 trap for `md.twin` [V].
- **Mintlify** (2026-01-29). Source: [Mintlify](https://www.mintlify.com/blog/context-for-agents) [V].
  - Negotiates on `Accept`.
  - Sends `Link: </llms.txt>; rel="llms-txt"`, `X-Llms-Txt`, and `X-Robots-Tag: noindex` on markdown responses.
  - Claims a "30x reduction".
- **Fastly** (Speek, 2026-05-28). Source: [Fastly](https://www.fastly.com/blog/give-ai-agents-markdown-they-actually-want) [V].
  - A Compute example, not a product feature.
  - "We also set `Vary: Accept, User-Agent`."

**`Vary` behaviour** (direct probes, 2026-10-19) [V]

| Site | `Vary: Accept` on HTML | `Vary: Accept` on markdown | Notes |
|---|---|---|---|
| Cloudflare | No (`accept-encoding` only) | Yes | |
| Vercel | No | Yes | |
| platform.claude.com | No | Yes | Sends `Link: <…/home.md>; rel="alternate"; type="text/markdown"` |
| Stripe docs | Yes | Yes | |
| GitHub Docs | Yes | Yes | Its `rel=alternate` points to `/api/article/body?pathname=…`, not a `.md` path |

**Clients**

- **Checkly survey** (Judis, 2026-02-19). Source: [Checkly](https://www.checklyhq.com/blog/state-of-ai-agent-content-negotation/) [V].

  | Agent | Requests markdown? | `Accept` / notes |
  |---|---|---|
  | Claude Code 2.1.38 | Yes | `text/markdown, text/html, */*` |
  | Cursor 2.4.28 | Yes | markdown first |
  | OpenCode 1.2.5 | Yes | markdown first |
  | OpenAI Codex | No | `text/html,…`; UA includes `ChatGPT-User/1.0` |
  | Gemini CLI 0.28.2 | No | `*/*` |
  | GitHub Copilot | No | `text/html,…` |
  | Windsurf | No | `*/*` |

- **Claude Code 2.1.303** WebFetch still sends `Accept:"text/markdown, text/html, */*"` with a `Claude-User` UA. Source: static inspection of the [npm tarball](https://registry.npmjs.org/@anthropic-ai/claude-code-linux-x64/-/claude-code-linux-x64-2.1.303.tgz) [V].
- **OpenCode** markdown mode sends `text/markdown;q=1.0, …`. Source: [opencode webfetch.ts, 2026-10-09](https://raw.githubusercontent.com/anomalyco/opencode/dev/packages/core/src/tool/plugin/webfetch.ts) [V].
- **Gemini CLI** experimental `directWebFetch` mode sends `text/markdown` first. Source: [gemini-cli web-fetch.ts, 2026-09-01](https://raw.githubusercontent.com/google-gemini/gemini-cli/main/packages/core/src/tools/web-fetch.ts) [V].

**Standards**

- **RFC 7763** (Mar 2016): `text/markdown`; "charset is REQUIRED"; extensions `.md`, `.markdown`. Source: [RFC 7763](https://www.rfc-editor.org/rfc/rfc7763.txt) [V].
- **RFC 9110 §12.5.5.** "An origin server SHOULD generate a Vary header field on a cacheable response when it wishes that response to be selectively reused…". Also: "Vary might be elided when an origin server considers variance in content selection to be less significant than Vary's performance impact on caching." Source: [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.txt) [V].
- **No IETF, W3C or WHATWG work** on markdown negotiation for agents was found. Source: [Datatracker API](https://datatracker.ietf.org/api/v1/doc/document/?format=json&type=draft&name__contains=llms) [V].
- **llms.txt v2** is the only convention document: `.md` / `.html.md` twins, plus `rel=alternate type=text/markdown` and `rel=describedby` links. Source: [llmstxt.org](https://llmstxt.org/index.md) [V].

**Quality evidence**

- **HtmlRAG (Tan et al., WWW 2025).** Source: [arXiv 2411.02959](https://arxiv.org/html/2411.02959v2) [V; table values transcribed by the fetch tool].
  - Llama-3.1-70B, HotpotQA exact match: vanilla HTML 28.00, plain text 41.00, markdown 39.00, cleaned HTML 42.25.
  - Raw HTML hurts; markdown ≈ plain text ≈ cleaned HTML.

### Inferences
- **`md.twin`** should pass via any of three routes, each validated:
  1. `Accept: text/markdown` on the canonical URL, using Claude Code's real header.
  2. The v2 `.md` / `.html.md` / `index.md` forms.
  3. The `rel=alternate` href.

  Validation: 2xx; `text/markdown` (or `text/plain` that sniffs as markdown); not HTML; differs from the HTML body; ≥ ~50 bytes. Do not require `x-markdown-tokens`.
- **`html.vary`** should be N/A when no negotiation is detected. When negotiation is detected, check `Vary` on the **markdown** variant. Penalising missing `Vary: Accept` on HTML would fail the reference implementations (Cloudflare, Vercel, platform.claude.com).
- Copy for these checks should say "agent readability / token efficiency", not "citability".

### Gaps
- ReadMe, Fern and Docusaurus plugin behaviour, and how common the `Link` header form is: not measured.
- Whether ChatGPT agent, Atlas or Perplexity send `Accept: text/markdown`: not found.

---

## 9. Structured data: is there controlled evidence that schema.org JSON-LD affects AI answer inclusion or citation, and what do Google, Microsoft and OpenAI officially say (2025–2026)?

### Takeaway
- **Controlled evidence:** the only large quasi-experiment found (Ahrefs, 1,885 pages, difference-in-differences) shows **no meaningful citation lift** from adding JSON-LD. AI Overviews fell −4.6% (significant); AI Mode (+2.4%) and ChatGPT (+2.2%) showed no significant change. A 2026 academic within-site analysis finds schema −5.3%, and SAGEO Arena finds structural-field optimisation gives only +2% citation.
- **Google:** "no special schema.org structured data" is needed, but markup must match visible content.
- **Microsoft:** the only engine asserting that schema helps its AI, with no published measurement.
- **OpenAI:** commerce docs rely on merchant product feeds and never mention schema.org.
- **Fetch-time agents:** a fetch test shows ChatGPT and Perplexity read JSON-LD as plain text, valid or not. Contradictory JSON-LD is therefore an accuracy risk, not a lever.

### Cited Findings

**Controlled and quasi-experimental evidence**

- **Ahrefs, "We Tracked 1,885 Pages Adding Schema. AI Citations Barely Moved."** (Linehan, 2026-05-11). Industry data, quasi-experiment. Source: [Ahrefs](https://ahrefs.com/blog/schema-ai-citations/) [V].
  - Difference-in-differences against matched control pages, 30 days before and after.
  - AI Overviews **−4.6%** (significant), AI Mode +2.4% and ChatGPT +2.2% (both indistinguishable from zero).
  - "Adding schema produced no major uplift in citations on any platform."
  - Caveats: only already-cited pages, a 30-day window, and Copilot not tested.
  - The same article reports that across 6M URLs, cited pages were "almost three times more likely to have JSON-LD", which is confounded correlation.
- **Chen & Koudas.** Schema.org markup +7.5% across sites but **−5.3% within site**. Source: [arXiv 2610.15033](https://arxiv.org/html/2610.15033v1) [V].
- **SAGEO Arena.** Optimising title, meta, headings and schema/JSON-LD gave retrieval +22% but citation rate only +2%. Source: [arXiv 2602.12187](https://arxiv.org/html/2602.12187v2) [V].
- **SE Ranking.** FAQ schema 3.6 vs 4.2 average citations; "schema alone does not significantly increase ChatGPT citation likelihood". Industry data. Source: [SE Ranking, 2025-11-24](https://seranking.com/blog/chatgpt-citation-factors/) [V].
- **Williams-Cook test.** A fictional address placed only in *invalid* JSON-LD was returned by both ChatGPT and Perplexity: "It does not matter if it is valid schema." Source: [Search Engine Roundtable (Schwartz), 2026-02-06](https://seroundtable.com/chatgpt-perplexity-structured-data-text-40862.html) [V report; original post not opened].
  - Conflicting reports exist (dejan.ai, Otterly) [U].
  - searchVIU (2025-12-02) found a price present only in JSON-LD was found by none of five systems at direct fetch [S, via AWR].

**Official statements**

- **Google, "AI features and your website"** (updated 2025-12-10). Source: [Google AI features](https://developers.google.com/search/docs/appearance/ai-features) [V].
  - "There are no additional requirements to appear in AI Overviews or AI Mode, nor other special optimizations necessary."
  - "There's also no special schema.org structured data that you need to add."
  - Recommends "Making sure your structured data matches the visible text on the page".
- **Google Search Central blog** (Mueller, 2025-05-21): "make sure that all the content in your markup is also visible on your web page". Source: [Google blog](https://developers.google.com/search/blog/2025/05/succeeding-in-ai-search) [V].
- **Microsoft Advertising** (2025-10-08). Source: [Microsoft Advertising](https://about.ads.microsoft.com/en/blog/post/october-2025/optimizing-your-content-for-inclusion-in-ai-search-answers) [V].
  - "Schema is a type of code that helps search engines and AI systems understand your content…"
  - "Don't hide important answers in tabs or expandable menus: AI systems may not render hidden content."
  - "While nothing guarantees selection…"
- **Fabrice Canel (SMX Munich, March 2025):** schema markup helps Microsoft's LLMs. Source: [Search Engine Land](https://searchengineland.com/microsoft-bing-copilot-use-schema-for-its-llms-453455) [S; page returned 403].
- **Bing AI Performance report** (2026-02-10). Source: [Bing](https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview) [V].
  - Covers Copilot citations and "Grounding queries".
  - "Clear headings, tables, and FAQ sections help surface key information"
  - "Support claims with evidence".
- **OpenAI:** commerce developer docs contain zero matches for "schema.org" or "structured data"; product data flows through merchant feeds (Agentic Commerce Protocol). Source: [OpenAI commerce llms-full.txt](https://developers.openai.com/commerce/llms-full.txt) [V].

### Inferences
- `geo.structuredKnowledge` (#205) should not reward JSON-LD *presence*. A defensible deterministic check is **JSON-LD hygiene**:
  - every `application/ld+json` block parses;
  - each has `@context` and `@type`;
  - key literal fields (name, headline, price, address, FAQ Q&A) appear as substrings of the no-JS visible text, per Google's "matches the visible text";
  - contradictions are flagged as an accuracy risk.
- Given Microsoft's claims and the Copilot gap in Ahrefs' test, a low weight (≤5% of the axis) or informational status is defensible.
- Drop the scoring of table and list counts: within-site and controlled evidence for them is null. Semantic HTML (headings, `<table>` with `<th>`, lists) has Bing guidance support only.

### Gaps
- No academic controlled test of LLM extraction accuracy with vs without JSON-LD was found.
- No Copilot-specific schema test was found.
- The primary Illyes and Sullivan statements on schema for AI were not captured.

---

## 10. Roadmap implications for Slop Detector: shipped-check verdicts, standards to reference (Oct 2026), and NEW / AMEND / CAVEAT items

### Takeaway
- **Evidence strongly supports** the fundamentals that decide whether answer engines may fetch, index and quote a page:
  - search bots and user-triggered fetchers are not blocked at the edge;
  - robots.txt allows the *search* tokens;
  - the page is indexed and snippet-eligible;
  - main text is present without JS.
- **Evidence weakly supports** the "optimisation" bonuses: llms.txt, the `.md` twin, `Vary: Accept` and GEO content levers. None has demonstrated citation impact.
- The biggest correctness problems are in the two largest-weight checks:
  - `bot.notBlocked` (25 points) spoofs a training crawler and misreads challenges.
  - `robots.aiAllowed` (20 points) penalises training opt-outs and is not RFC 9309-compliant.
- Highest-value new work:
  - an honest tri-state edge probe;
  - an AI preview-controls check;
  - RFC 9309 fetch semantics;
  - an AI-manipulation (hidden-instruction / prompt-poisoning) warning;
  - Lighthouse-aligned accessibility-for-agents.

### Cited Findings

**Standards and specs the AEO spec should reference (status as of 2026-10-19)**

| Area | Document (exact version) | Status | URL | Verified |
|---|---|---|---|---|
| robots.txt | RFC 9309, Robots Exclusion Protocol (Sept 2022) | Proposed Standard | https://www.rfc-editor.org/rfc/rfc9309 | [V] |
| Negotiation / caching | RFC 9110 HTTP Semantics §12.5.5 `Vary` (June 2022) | Internet Standard | https://www.rfc-editor.org/rfc/rfc9110 | [V] |
| Markdown media type | RFC 7763 `text/markdown` (Mar 2016) | Informational | https://www.rfc-editor.org/rfc/rfc7763 | [V] |
| AI usage vocabulary | draft-ietf-aipref-vocab-08 (14 Sep 2026) | WG Document, "DO NOT REFLECT CONSENSUS"; missed Aug 2026 IESG milestone | https://www.ietf.org/archive/id/draft-ietf-aipref-vocab-08.html | [V] |
| AI usage attachment | draft-ietf-aipref-attach-05 (19 Aug 2026): robots.txt `Content-Usage:` + HTTP `Content-Usage` | WG Document | https://www.ietf.org/archive/id/draft-ietf-aipref-attach-05.html | [V] |
| Content Signals | Cloudflare Content Signals Policy (2025-09-24). Managed robots adds test key `use=reference` (docs 2026-10-08) | Vendor policy (CC0); no versioned spec | https://blog.cloudflare.com/content-signals-policy/ ; https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/ | [V] |
| Licensing | RSL 1.0 (RSL-SPEC-1.0, 2025-12-10) | "Recommendation" (RSL Collective) | https://rslstandard.org/rsl | [V] |
| EU TDM opt-out | TDMRep CG Final Report (2024-05-10) | W3C CG report, not a standard | https://www.w3.org/community/reports/tdmrep/CG-FINAL-tdmrep-20240510/ | [V] |
| EU code | GPAI Code of Practice, Copyright chapter (final 2025-07-10) | Signed by OpenAI, Anthropic, Google, Microsoft, Amazon, Mistral and others (not Meta) | https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai (text via unofficial mirror https://code-of-practice.ai/?section=copyright) | [V] |
| Bot authentication | draft-ietf-webbotauth-httpsig-protocol-00 (2026-09-01), over RFC 9421 | WG draft (WG chartered 2025-10-23). Cloudflare implements older -02/-03 drafts | https://datatracker.ietf.org/doc/draft-ietf-webbotauth-httpsig-protocol/00/ ; https://developers.cloudflare.com/bots/reference/bot-verification/web-bot-auth/ | [V] |
| Paid crawl | Cloudflare pay per crawl (402 + `crawler-price`) | Closed beta (docs 2026-07-28) | https://developers.cloudflare.com/ai-crawl-control/features/pay-per-crawl/what-is-pay-per-crawl/ | [V] |
| Paid crawl | x402 v2 HTTP transport (`PAYMENT-REQUIRED`, etc.) | x402 Foundation spec | https://github.com/x402-foundation/x402/blob/main/specs/transports-v2/http.md | [V] |
| Challenges | Cloudflare `cf-mitigated: challenge`; AWS WAF `x-amzn-waf-action` (202/405) | Vendor docs | https://developers.cloudflare.com/cloudflare-challenges/challenge-types/challenge-pages/detect-response/ ; https://docs.aws.amazon.com/waf/latest/developerguide/waf-captcha-and-challenge-actions.html | [V] |
| llms.txt | llms.txt v2 (2026-08-10) | Community proposal | https://llmstxt.org/ | [V] |
| Markdown for agents | Cloudflare Markdown for Agents (docs 2026-10-09) | Vendor beta | https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/ | [V] |
| In-page agent tools | WebMCP (Draft CG Report, 16 Oct 2026; `document.modelContext`); declarative explainer (`toolname`, `tooldescription`, `toolautosubmit`, `toolparamdescription`) | CG draft; origin trials Chrome 149 / Edge 150 | https://webmachinelearning.github.io/webmcp/ ; https://github.com/webmachinelearning/webmcp/blob/main/declarative-api-explainer.md | [V] |
| Agent discovery | ARD v0.91 (2026-08-26): `/.well-known/ard.json`, `rel="ard"`, robots `Agentmap:` | "Proposal"; audited by Lighthouse 13.5.0 | https://agenticresourcediscovery.org/spec/ | [V] |
| Agent card | A2A 1.0.0: `/.well-known/agent-card.json` | Released (Agentic AI Foundation) | https://a2a-protocol.org/latest/specification/ | [V] |
| Agent-readiness tooling | Lighthouse Agentic Browsing category (v13.2.0+, 2026-05-01; ARD audit v13.5.0) | Experimental | https://developer.chrome.com/docs/lighthouse/agentic-browsing | [V] |
| Google AI controls | Robots meta spec: `nosnippet` / `max-snippet` apply to AI Overviews and AI Mode (2026-03-24); AI features doc (2025-12-10); GenAI optimization guide (2026-07-10) | Official docs | https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag ; https://developers.google.com/search/docs/appearance/ai-features ; https://developers.google.com/search/docs/fundamentals/ai-optimization-guide | [V] |
| Spam / AI manipulation | Google spam policies (2026-08-28); Bing Webmaster Guidelines (Feb 2026 rewrite) | Official | https://developers.google.com/search/docs/essentials/spam-policies ; https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a | [V] / [S] |
| Crawler registries | OpenAI, Anthropic, Perplexity, Google common crawlers and user-triggered fetchers, Apple, Meta, Amazon, DuckDuckGo, Mistral (see §2) | Operator docs | e.g. https://developers.openai.com/api/docs/bots ; https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers | [V] |

RFC 9421 (HTTP Message Signatures) and RFC 9651 (Structured Fields) are referenced normatively by the drafts above but were not opened in this session.

**Evidence verdicts on the shipped checks** (weights from `packages/core/src/aeo.ts`)

| Check (weight) | Verdict | Basis (sections above) |
|---|---|---|
| `html.reachable` (10) | **Well supported**: trivially necessary. | — |
| `bot.notBlocked` (25) | **Concept well supported; implementation weak.** | OpenAI and Perplexity say to allow search bots and their IP ranges (§2). Microsoft says don't hide content (§9). But the probe spoofs **GPTBot** (training; an "independent" setting), uses an outdated UA (`GPTBot/1.2` vs the documented `GPTBot/1.4` format), passes AWS WAF 202 challenges, ignores `cf-mitigated`, and is treated as unverified traffic (§5). |
| `robots.aiAllowed` (20) | **Supported for search tokens; unsupported for training tokens; parser non-compliant.** | OAI-SearchBot opt-out removes a site from ChatGPT search answers. Google-Extended "does not impact a site's inclusion in Google Search". Applebot-Extended "does not crawl" (§2). The web copy wrongly names GPTBot, ClaudeBot and Google-Extended as the "major AI crawlers" (`apps/web/functions/_posts.ts`). RFC 9309 deviations: group selection, Allow precedence, wildcards, 5xx = full disallow (§2). |
| `html.indexable` (15) | **Well supported.** | Google: "must be indexed and eligible to be shown in Google Search with a snippet" (§4). Gaps: misses the `none` directive, bot-specific meta (`googlebot`, `bingbot`) and UA-prefixed `X-Robots-Tag`. |
| `md.twin` (10) | **Moderate for coding agents; none for answer engines.** | Claude Code, Cursor and OpenCode request markdown; Codex and Copilot don't; Google: not needed (§8). The `.md`-only probe misses negotiation and is fooled by soft-404s (vercel.com/index.md). |
| `html.linkAlternate` (8) | **Weak–moderate.** | Recommended by llms.txt v2. No evidence found that agents follow it. Presence is not validated (§8). |
| `site.llmsTxt` (7) | **Weak for AI search and citation; moderate for coding agents.** | Google ignores it. 97% of files got zero requests and retrieval bots were 1.1% of requests. No correlation with citations. SPA soft-404s pass today (§3). |
| `html.vary` (5) | **Mis-specified.** | RFC 9110 makes `Vary` a conditional SHOULD. Reference implementations omit `Vary: Accept` on HTML (§8). |

### Inferences

**NEW candidates** (not covered by #205/#206), ranked by evidence strength × user value

**1. NEW: honest, tri-state edge-access probe (redesign of `bot.notBlocked`).** Evidence: **High** (vendor docs). Value: **High** (it fixes the 25-point check).
- *Implementation:* at most 3 sequential GETs with the same `Accept: text/html,…`.
  - **P0 baseline:** our own UA, e.g. `SlopDetector-AEO/1.x (+https://slop-detect.com/bot)`.
  - **P1:** a search-class probe (an OAI-SearchBot or PerplexityBot token appended to our identity). Do not send OpenAI's full UA string.
  - **P2 (optional):** an agent-class probe (ChatGPT-User / Claude-User token).
- *Classify each response, in order:*
  1. **Challenged:** `cf-mitigated: challenge`; `x-amzn-waf-action`; `x-vercel-mitigated` [S].
  2. **Paid:** a 402 with `crawler-price` (regex `^([A-Z]{3}) (\d+(\.\d+)?)$`) or `PAYMENT-REQUIRED` (base64 JSON, `x402Version`). Never send payment headers.
  3. **Blocked:** 401, 403 or 451.
  4. **Inconclusive:** 429, 5xx or timeout.
  5. **OK:** 2xx with similar content to P0 (title equality, text-length ratio, shingle similarity; thresholds are our own heuristic). A noindex that appears only in the bot response is cloaking.
- *Pass/fail:*
  - **Pass:** the search-class probe is OK.
  - **Fail:** P0 is OK but the AI probe is blocked or challenged, or materially different.
  - **Warn:** paid (402).
  - **Unknown** (not scored): P0 itself is blocked.
  - A training-class result is informational only.
  - Always report the vantage point (Workers egress or local CLI).
- *False-positive risks:* datacenter IP reputation; rate limits; dynamic content lowering similarity; real crawlers are verified by IP or signature and may be treated differently (state this in the result).
- *Specs:* the Cloudflare, AWS and Vercel docs and the x402 and pay-per-crawl docs in the standards table.

**2. NEW: AI preview-controls check ("snippet eligibility for AI answers").** Evidence: **High** (Google docs; Bing via SEJ [S]). Value: **High**. Implementation is trivial.
- *Implementation:* parse `<meta name="robots|googlebot|bingbot">` and `X-Robots-Tag`, including the `botname:` prefix and multiple header lines, for `nosnippet`, `max-snippet:N`, `noarchive`, `nocache`, `none`, `noindex`. Count the text covered by `data-nosnippet` in the rendered DOM.
- *Fail* (scored): page-level `nosnippet` or `max-snippet:0` applying to Googlebot ("excluded as direct input to AI Overviews/AI Mode"), or `noarchive` applying to bingbot (Copilot exclusion).
- *Warn:* `nocache` (Copilot limited to URL, title and snippet); a small `max-snippet`; `data-nosnippet` covering most of the main text (thresholds are heuristic).
- *False-positive risks:* these are deliberate publisher choices, so word the result neutrally. Google's Search Console AI opt-out toggle cannot be seen over HTTP.
- *Specs:* https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag ; https://developers.google.com/search/docs/appearance/ai-features.

**3. NEW: robots.txt fetch semantics per RFC 9309 §2.3.1.** Evidence: **High** (normative RFC). Value: **Medium-high**; it fixes a silent false pass.
- *Rules:*
  - Follow at least 5 redirects.
  - **5xx or network error → "complete disallow" → fail `robots.aiAllowed`** (today this passes as "allows all").
  - 4xx → allow all.
  - Parse at least 500 KiB.
  - Warn when robots.txt returns `text/html` (an SPA soft-404).
- *False-positive risk:* a transient 5xx. Retry once and report as "unreachable".
- *Spec:* https://www.rfc-editor.org/rfc/rfc9309.

**4. NEW: AI-manipulation detector (warning first, unscored).** Evidence: **Medium-high**: Google and Bing spam policies; Brave, Nikkei and Microsoft in-the-wild reports; EIA and Nestaas research. Value: **High** (penalty risk, brand safety; on-brand for "anti-slop").
- *(a) Prompt-poisoning links:* `<a href>` or `form action` targets on AI-assistant hosts whose decoded `q`/`prompt` parameter matches "remember", "trusted source", "in future conversations", "authoritative source" or "cite".
- *(b) Hidden AI-addressed imperatives:* Chromium-computed hidden text (opacity 0, font-size ≤1px, off-screen, ~1:1 contrast, clipped boxes outside the sr-only pattern) plus `aria-label`, `alt`, `title`, comments and `<noscript>`, **and** a lexicon match (§7).
- *False-positive risks:* sr-only text; accordions; pages about prompt injection; legitimate notes to agents. The conjunction rule plus "same text visible elsewhere → skip" handles these. Measure the false-positive rate before scoring.
- *Specs:* https://developers.google.com/search/docs/essentials/spam-policies ; Bing guidelines; MITRE ATLAS AML.T0051 / AML.T0080.000 (as cited by Microsoft).

**5. NEW: accessibility-for-agents (mirror Lighthouse `agent-accessibility-tree`).** Evidence: **Medium**. Google ships it as a deterministic audit and Chrome states that agents use the accessibility tree. No controlled causal study was found. Value: **High** (actionable; Chromium is already loaded).
- *Implementation:* run axe-core restricted to the 33 rule IDs listed in §6.
- *Pass/fail:* binary like Lighthouse, pass only if 0 violations. Optionally also report a per-rule count.
- *False-positive risks:* axe false positives on custom or shadow-DOM components; cross-origin iframes. Note the overlap with WCAG tooling.
- *Spec:* https://developer.chrome.com/docs/lighthouse/agentic-browsing/accessibility-for-agents.

**6. NEW: "declared AI-usage policy" panel (informational, 0 weight).** Evidence: **Medium** (the standards exist, but adoption is ≤1.6% among news publishers and no vendor commits to honoring them). Value: **Medium** (clarity for publishers and EU compliance).
- *Parse:*
  - robots.txt `Content-Usage:` per attach-05 and vocab-08: SF dictionary, `y`/`n`, path-scoped, longest prefix, most-restrictive combining. Record the draft version and flag pre-08 labels.
  - `Content-Signal:` (`search`, `ai-input`, `ai-train`, `use`).
  - RSL `License:`, a `Link` header, and `<link rel="license" type="application/rsl+xml">`. Require that type, to avoid Creative Commons false positives.
  - TDMRep `/.well-known/tdmrep.json`, `tdm-reservation` / `tdm-policy` headers and meta tags.
  - `noai` / `noimageai`; legacy `/ai.txt`.
- *Conflict messages:* e.g. robots allows GPTBot while `ai-train=no` → "OpenAI documents only robots.txt; add `User-agent: GPTBot / Disallow: /`". Flag Cloudflare's permissive default `Content-Signal` on markdown responses as "CDN default, not your choice".
- *Specs:* AIPREF drafts, Content Signals, RSL 1.0, TDMRep, GPAI Code (standards table).

**7. NEW: WebMCP detection (informational).** Evidence: **Low-medium** (CG draft and origin trials; Lighthouse audits it informationally). Value: **Medium** (early adopters).
- *Declarative:* count `form[toolname][tooldescription]` and `[toolparamdescription]` on controls.
- *Imperative:* inject an init-script shim on `document.modelContext.registerTool` to capture names and schemas, or call `getTools()` when Chrome ≥149 runs with the `enable-webmcp-testing` flag.
- *Report:* tool count and names; warn above 40 tools (Lighthouse's threshold). Note whether `Permissions-Policy: tools=()` is set.
- *False-positive risks:* low. Attribute names may change, since the declarative API is explainer-stage.
- *Specs:* https://webmachinelearning.github.io/webmcp/ ; the declarative explainer.

**8. NEW: freshness and date hygiene (advisory).** Evidence: **Medium-low**: controlled simulations (recent vs old timestamp OR 14.4 to ≫10k; an old date is worse than none), SE Ranking correlation (6.0 vs 3.6), and Bing's IndexNow guidance.
- *Implementation:* extract `dateModified` / `datePublished` from JSON-LD, `article:modified_time`, `<time datetime>` and `Last-Modified`.
- *Warn:* a visible date older than 24 months (heuristic); JSON-LD dates that conflict with visible dates.
- *Do not require dates:* "an old timestamp did worse than no timestamp".
- *False-positive risks:* evergreen documentation; `Last-Modified` set at deploy time.

**9. NEW (feature): Slop Detector as a transparent, optionally signed agent.**
- Publish `/bot` (purpose, on-demand single-URL fetches, contact).
- Optionally sign probes per Web Bot Auth: publish a key directory at `/.well-known/http-message-signatures-directory`. Use the quoted-string `Signature-Agent` for Cloudflare, with the dictionary form as an option for the WG draft and Google.
- Register with the Cloudflare and Vercel bot directories (`ora-bot` is a precedent).
- Keep one unsigned probe for scoring.
- Evidence: **Medium**. Value: **Low-medium**.

**AMEND #205** (GEO checks)

- **Fix the citations.**
  - Aggarwal "Statistics +30.6% to +37.0%": +30.6% is GEO-bench PAWC; ~37% is Perplexity Subjective Impression on n=200.
  - "+115.1% for rank 4–5": it is rank 5 only, measured with all sources optimized, and rank 1 was −30.3%.
  - Remove the Mind2Web "85–95% noise" claim; Mind2Web reports 1,135 elements/page and nothing like this.
  - Re-describe 2603.29979 (no CSR, SSR or JSON-LD testing) and 2603.09296 (JS rendering appears in a 10.1% technical-integrity bucket, with no subtype rates).
- **`html.tokenEfficiency`: strengthen and rescope** to "server-rendered main-text coverage" = main-text words in the no-JS HTTP response ÷ words in the rendered DOM.
  - Fail when coverage is low, e.g. CSR shells.
  - Drop the raw HTML-to-text byte ratio. It penalises inline SVG and CSS, JSON-LD and RSC payloads, and has no evidence behind it.
  - Support: Vercel; Chen & Koudas (11.5% of pages JS-dependent; Gemini −10.6% within-site); Microsoft ("AI systems may not render hidden content").
  - Note that Googlebot and Applebot render. Re-test the September 2026 OpenAI rendering report.
- **`geo.citationEvidence`: downgrade** to an advisory, capped "verifiable claims" signal (≤5% of the axis or informational). Never promise "+40%". Controlled replications are null or negative (C-SEO Bench 3/54; statistics negative in 19/24; Bajemon & Rochet null; Chen & Koudas outbound links no effect).
  - False-positive risks: prices, versions and dates matching number regexes; testimonial quotes, which the design axis already treats as slop.
- **`geo.structuredKnowledge`: change from presence to hygiene.** JSON-LD must parse, have `@context` and `@type`, and its key fields must match the visible text. Contradictions are an accuracy risk, since agents read JSON-LD as text. Do not score table or list counts (null evidence). Evidence: Ahrefs DiD (no lift; AI Overviews −4.6%), within-site −5.3%, and Google's "no special schema" plus "matches the visible text".

**AMEND #206** (protocol hardening)

- **llms.txt validation** per v2 (2026-08-10), with Lighthouse parity:
  - reject `text/html` or an HTML body;
  - accept `text/plain`, `text/markdown` or `text/x-markdown`;
  - require an H1, at least one `[..](..)` link and ≥50 bytes;
  - do **not** require a blockquote, a single H1 or `text/markdown`;
  - guard against soft-404s with a nonce sibling path (excalidraw.com and app.netlify.com are known false passes);
  - support path-scoped files and `rel="describedby"`.
  - `/llms-full.txt` is **not in the v2 spec**; treat it as informational only.
- **robots.aiAllowed tiering** (supported by OpenAI's "Each setting is independent", Google-Extended's Search exemption, and Cloudflare's 2026 Search/Agent/Training split):
  - **Scored:** search/index tokens (OAI-SearchBot, Claude-SearchBot, PerplexityBot, Googlebot, bingbot, Applebot, Amzn-SearchBot, Meta-WebIndexer, MistralAI-Index, DuckAssistBot).
  - **Warning:** user-triggered fetchers (ChatGPT-User, Claude-User, Perplexity-User, Meta-ExternalFetcher, Amzn-User, MistralAI-User, Google-Agent).
  - **Informational:** training tokens (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot, Meta-ExternalAgent, Bytespider and others).
  - Implement RFC 9309 group selection (a bot's own group overrides `*`), merge duplicate groups, longest-match Allow/Disallow, and the `*`/`$` wildcards.
  - Implement the documented fallbacks: Applebot follows Googlebot rules; Amzn-SearchBot follows other search bots.
- **Registry corrections:**
  - `anthropic-ai` and `Claude-Web` are legacy.
  - `Google-Extended` and `Applebot-Extended` are robots tokens only; no request will carry them as a UA.
  - `Amazonbot` is mixed-purpose; `GoogleOther` is not training-specific; `cohere-ai` purpose is disputed.
  - Add the missing tokens listed in §2. Flag tokens without first-party docs as "unverified".
  - Update docsUrls: platform.openai.com now 301s to developers.openai.com/api/docs/bots, and Anthropic's doc is now on support.claude.com.
  - #206's proposed additions (Google-CloudVertexBot, TikTokSpider, PanguBot, PetalBot) need purpose labels. Google-CloudVertexBot crawls on site-owner request for Vertex agents and is not an answer-engine bot. TikTokSpider's purpose is unclear.
- **Markdown for Agents:**
  - Accept negotiation on the canonical URL **and** the v2 `.md` / `.html.md` forms **and** the `rel=alternate` href, all with content validation.
  - **Do not require `x-markdown-tokens`.** It is absent from Cloudflare's current docs and from live responses.
  - Treat a `Content-Signal` header on a markdown response as Cloudflare's permissive default unless the origin set it.
- **Agent discovery (informational):**
  - Replace `/.well-known/mcp.json` (no spec found; the MCP roadmap of 2026-08-22 lists no `.well-known` discovery) with **ARD v0.91** (`/.well-known/ard.json`, `rel="ard"`, robots `Agentmap:`, legacy `ai-catalog.json`). Lighthouse 13.5.0 audits it, and it carries MCP server cards and A2A agent cards.
  - Keep A2A at `/.well-known/agent-card.json` (A2A 1.0.0, §8.2).

**CAVEAT items**

- **`site.llmsTxt`:** cut from 7 to ≤2 points or make it informational, labelled "agent/docs discoverability". It shows no AI-search or citation effect, Google ignores it, and AI retrieval bots made 1.1% of llms.txt requests.
- **`html.vary`:** make it conditional. N/A when the server does not negotiate; when it does, check `Vary` on the markdown variant. As written, it fails the Cloudflare, Vercel and Anthropic reference implementations.
- **`md.twin` + `html.linkAlternate` (18 points combined):** reframe as "agent readability / token efficiency". There is no answer-engine evidence. Consider reducing the combined weight, and validate the `linkAlternate` href.
- **`bot.notBlocked`:**
  - The label "GPTBot gets 2xx" and the web copy "rather than a WAF challenge" are inaccurate (202 challenges pass).
  - GPTBot is a training crawler.
  - The UA string is outdated.
  - Impersonating another operator conflicts with Cloudflare's "Honest self-identification" norm and with the anti-slop brand.
- **Tier naming and copy:** "AI-Ready" and "citability" overclaim. Bing: "GEO doesn't guarantee citations". Google: "no additional requirements… nor other special optimizations". Retrieval explains 32% of within-site citation variance and page features 2.8%. Present the axis as *eligibility* (fetchable, indexable, snippet-eligible, readable without JS), not as a citation predictor.
- **Defaults to surface:** Cloudflare's 2026-09-15 defaults block Agent-class bots on ad pages for new domains, and Free-tier sites that haven't changed settings. ChatGPT-User, Claude-User and Perplexity-User may therefore be blocked without the owner knowing. Whether this rollout happened: [U].

**Top NEW ranking (evidence strength × user value)**

| Rank | Item | Evidence | Value |
|---|---|---|---|
| 1 | Honest tri-state edge-access probe | High | High |
| 2 | AI preview-controls check | High | High |
| 3 | RFC 9309 robots fetch semantics | High | Med-High |
| 4 | AI-manipulation detector (warning) | Med-High | High |
| 5 | Accessibility-for-agents (Lighthouse 33-rule subset) | Medium | High |
| 6 | Declared AI-usage policy panel | Medium | Medium |
| 7 | WebMCP detection | Low-Med | Medium |
| 8 | Freshness hygiene | Med-Low | Medium |
| 9 | Signed-agent identity | Medium | Low-Med |

### Gaps
- **No controlled, live-engine study** shows that any page-level white-hat change increases AI citations. All "optimisation" weights rest on official guidance, simulation or correlation.
- **Not verified in this session:**
  - OpenAI Atlas ARIA guidance and the Atlas hardening post (403).
  - The exact text of Bing's "Prompt Injection and AI Manipulation" section.
  - Whether Cloudflare's 2026-09-15 defaults took effect.
  - Anthropic and Perplexity Web Bot Auth signing.
  - What an unsigned request gets from a pay-per-crawl zone.
- **Not found:**
  - In-the-wild prevalence of hidden prompt injection on the open web.
  - Controlled studies linking accessibility to agent task success.
  - Comet and Gemini-in-Chrome guidance for websites.
- **Unresolved conflicts:**
  - Grossman et al.'s finding that Google-Extended blocks are associated with lower AI Overview retrieval, vs Google's statement that Google-Extended doesn't affect Search. The study is correlational and possibly confounded.
  - Aggarwal (keyword stuffing −8%) vs Tian et al. (keyword stuffing best in simulation).
  - AutoGEO (simulated +36%) vs SAGEO Arena (−36% retrieval in a real pipeline).
