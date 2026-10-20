# Copy axis, deep pass: academic and technical evidence usable deterministically on short marketing copy (2025 to Oct 2026)

Research date: 2026-10-20. Scope: work that is new relative to `docs/research/roadmap-v4/copy_axis_text_slop.md` (v4 copy notes) and `citation_audit.md`, with priority on Jul to Oct 2026.

**Tags.**
- **[V]** means I opened the primary source this session and the quoted number appears there. Most arXiv items were read from the arXiv abstract page. Where I also read the full text (arXiv HTML, or PDF text extracted with pypdf), the entry says so.
- **[U]** means unverified: a secondary source, or a number I could not find in the primary text.
- **Evidence grades** follow K-02: measured, standard, practitioner, hypothesis.
- **Heuristic** marks any threshold I propose. None of them comes from a source.

**Integrity notes from this pass.**
- A search-engine summary said Academ-AI found "Regenerate response" in "58 cases, 11.6%". The current v2 PDF says **61 cases, "8% of the dataset"** (§3.1.5), and Table 1 gives **(7.9)**. The snippet was stale or wrong. I use the PDF numbers.
- A blog attributed a "3× more often" figure for "Not just X but Y" to Pangram. The blog returned 403 and I found no Pangram primary source, so it is excluded.
- The arXiv API (`export.arxiv.org`) returned HTTP 429 after the first ~12 queries. Later discovery used web search plus direct arXiv abstract, HTML and PDF fetches. Some 2026 papers on exact-phrase residue or short-text limits may therefore have been missed (see Gaps).

---

## 1. Source log

### A. Commercial and web content (closest register to landing pages)

**A1. Madler, "SlopShape: Identifying AI-Generated Commercial Web Content"**
- arXiv [2609.15369](https://arxiv.org/abs/2609.15369), v1 2026-09-14, v3 2026-09-28. Preprint. The author operates Sitefire, a commercial GEO product (competing-interest statement).
- I read the full text (HTML) and the instrument JSON from the release repo [pulse-energy-eu/slopshape](https://github.com/pulse-energy-eu/slopshape). [V]
- **Corpus:** 2,250 pre-ChatGPT human B2B company blog posts from 268 domains (Wayback, 2008–2022, filtered to 600–2,500 words). 11,250 "AI mirrors" from five models (gpt-5.4, claude-sonnet-4.6, gemini-3-flash, deepseek, kimi), each written from a reverse-engineered brief (§3).
- **Features:** 203 features, 176 of them structural, applied by an LLM (gemini-3.6-flash). Human gold validation: human-human κ 0.939, mean human-model κ 0.951 (Table 9).
- **Detection (Table 3, held-out companies):**

  | Feature set | Macro-F1 |
  |---|---|
  | Structural only | 97.0 |
  | Style only (27 features) | 88.1 |
  | All features | 98.0 |
  | Core-only (9 features) | 90.1 |
  | Word-level baselines (stylometric+XGB, ModernBERT, TF-IDF) | 99.3–100.0 |

- **After rewording by the generating model (Table 4):** structural 96.1, style 87.1.
- **Core values (Table 6, human–AI gap, direction):**

  | Feature value | Direction | Gap |
  |---|---|---|
  | Conclusion = "restated thesis or reframe" | AI | 0.650 |
  | Functional stage "summary or synthesis" present | AI | 0.609 |
  | "External participation pathway" absent | AI | 0.592 |
  | "Legacy-versus-modern contrast" = no | human | 0.497 |
  | "Thesis before first unit" = no | human | 0.419 |
  | Freshness = "modern or next-generation framing" | AI | 0.360 |
  | Credibility = "confident institutional explanation" | AI | 0.347 |
  | Stage "mechanism explanation" | AI | 0.285 |
  | Temporal reference "historical date or period" | human | 0.283 |
  | Length "short, under 800 words" | human | 0.274 |

- §6 calls the AI shape "the tidy, self-announcing blog post". Its examples: "In this post, we'll cover why onboarding stalls, three fixes that work…"; "Paper checklists were built for a slower era."; "In short, structured onboarding saves time."
- **Rarity:** human mean rarity percentile 0.835 vs AI 0.436, Cohen's d 1.80 (Table 7).
- **Limitations (§9):**
  - Single-pass generation only; humanizer tools not tested.
  - The human/AI period confound is acknowledged.
  - The features are LLM-applied, not deterministic.
- **Licence (repo LICENSE):** code is under PolyForm Noncommercial. The instrument and prompts are "all rights reserved", published "for verification and audit", with "reuse beyond verification … on request". slop-detect must not copy the instrument text. Ideas can be re-implemented independently, with citation.

**A2. Russell, Rajendhran, Pham, Iyyer & Wieting, "StoryScope: Investigating idiosyncrasies in AI fiction"**
- arXiv [2604.03136](https://arxiv.org/abs/2604.03136), v1 2026-04-03, v6 2026-08-10. [V, abstract]
- 61,608 stories. Narrative features alone reach "93.2% macro-F1 for human vs. AI detection". "AI stories over-explain themes and favor tidy, single-track plots." Human stories "exhibit greater diversity."
- This is the method A1 replicates. It is fiction, so it is cited only as precedent.

**A3. He, Ardi, Govindan & Madhyastha, "DeGenTWeb: A First Look at LLM-dominant Websites"**
- arXiv [2605.00087](https://arxiv.org/abs/2605.00087), 2026-04-30, "in submission". The predecessor is an IMC 2025 poster, [2507.13933](https://arxiv.org/abs/2507.13933). [V, full PDF text]
- **Page filtering pipeline (§2.1):**
  - Chromium render, then Trafilatura main-content extraction.
  - Keep only "English content with 200 or more tokens".
  - Exclude pages where "more than half the page content is found on other pages on the same site", using Rabin-fingerprint chunk dedup.
  - Apply a relaxed Dolma quality filter.
- **Why aggregate:** Binoculars "accuracy drops from 96% on text with 256 tokens to 80% on text with 128 tokens" (citing [29]).
- **Site-level aggregation (§3):** the 10th–90th percentiles of per-page scores go into a linear SVM. Accuracy "starting from 86.9% with 1 page/site, and converges at 98.7% with 15 pages/site".
- **False-positive rate on pre-ChatGPT Common Crawl sites:** 0.29% of 35,856 sites. Without page filtering 12.9%; with filtering 0.30% (§3).
- **Prevalence:**
  - 6.0% (5,643/94,908) of Common Crawl sites are LLM-dominant, rising "from 2.1% in the second half of 2022 to 29.4%" in early 2025.
  - 15.4% of sites in Bing how-to results.
  - 78.8% of LLM-dominant sites have a clear financial incentive (55.8% for others), with "a surge in businesses (service and SaaS sites)".

**A4. Pew Research Center, "Methodology: AI content" (Data Labs, 2026-08-20)**
- [pewresearch.org](https://www.pewresearch.org/data-labs/2026/08/20/methodology-ai-content/) [V]
- "We randomly sampled 10,000 English-language pages from each of the 49 crawls created between January 2021 and July 2026."
- Detector: Open Pangram (`editlens_Llama-3.2-3B`), threshold ≥0.2. Agreement with Pangram 3.3 is 96%, κ 0.61.
- "35% of pages in the July 2026 crawl with post-ChatGPT publication dates show signs of AI authorship."
- The methodology page does not contain the .com vs .edu/.gov split that press coverage reports (TechBriefly: ~10% vs ~1%) [U].
- Caveat from the page: Open Pangram "has a higher false-positive rate on pages created before AI use was common."

**A5. Dolezal, Alam, Graham & Bohacek, "The Impact of AI-Generated Text on the Internet"**
- arXiv [2604.26965](https://arxiv.org/abs/2604.26965), 2026-04-14. [V, abstract]
- "by mid-2025, roughly 35% of newly published websites were classified as AI-generated or AI-assisted, up from zero before ChatGPT's launch."
- More AI text correlates "negatively with semantic diversity and positively with the prevalence of positive sentiment". There was no significant evidence for lower stylistic diversity.

**A6. Russell et al., "AI use in American newspapers is widespread, uneven, and rarely disclosed"**
- arXiv [2510.18774](https://arxiv.org/abs/2510.18774), ACL 2026 camera-ready (v4, 2026-04-26). [V, abstract]
- 186K articles; "approximately 9% of newly-published articles are either partially or fully AI-generated" (Pangram).
- Opinion pieces are 6.4× more likely to contain AI content.

**A7. Meguellati et al., "LLM-Generated Ads: From Personalization Parity to Persuasion Superiority"**
- arXiv [2512.03373](https://arxiv.org/abs/2512.03373), 2025-12-03. [V, abstract]
- Personalized ads reached parity, "51.1% vs. 48.9%, p > 0.05".
- Persuasion-principle ads were preferred, "59.1% preference rate (vs. 40.9%, p < 0.001)".
- Even after "a 21.2 percentage point detection penalty" when participants identified AI origin, AI ads still won.

### B. Lexical drift and excess vocabulary (Kobak, Liang, Geng and Juzek & Ward follow-ups)

**B1. Lee, "An LLM-Associated Register Shift in Korean Journal Abstracts: A Morphology-Aware Excess-Vocabulary Study, 2018–2026"**
- arXiv [2609.07447](https://arxiv.org/abs/2609.07447), 2026-09-07, working paper. Data on Zenodo. [V, abstract + PDF text]
- 398,296 KCI abstracts. Korean shows "nothing in 2023, onset in late 2024". The word 시사하다 ("suggest") appears in "21.4% of 2026 abstracts against 5.3% expected".
- The lower bound on LLM-processed abstracts is 3.5%, 10.5% and 16.1% for 2024–2026. "Placebo floors are 0.1–2.2 points."
- "Tested translation routes do not explain it."
- "In the same articles' English abstracts the excess appears a year earlier." Marker turnover is "consistent with model generations".
- PDF §1: "English markers of the 2024 model generation recede in 2026 as their Korean counterparts do."
- Takeaway: excess vocabulary is language-specific and turns over by model generation.

**B2. Rudnicka & Juzek, "Beyond 'AI Language': The case for the idiolectal nature of LLM output"**
- arXiv [2608.06589](https://arxiv.org/abs/2608.06589), 2026-08-06, book-chapter submission. [V, PDF text]
- Cohorts: 2024 (Improta et al. data: GPT-3.5, GPT-4o, Claude-3.5-Haiku, Llama, Mistral) vs a 2026 regeneration with the same prompts (Claude-Haiku-4.5, Gemini-3-Flash, GPT-5.4-Mini, Mistral-Nemo, OLMo-3-7B, Qwen3-14B).
- **PC1 separates the cohorts** (§5). "Five of the six models of the 2026 cohort returned negative PC1 scores … all six 2024 models returned positive scores."
  - Words loading on the 2026 style: "because, truth, real, is, they, most, are, do, uncertainty, when, not, but, than". The authors read this as a "direct and argumentative register … contrastive markers (but, not, than)".
  - The 2024 style is "a formal, hedged, nominalised academic register".
- **Contractions (Table 6.1, per million words):**

  | Model | Per million words |
  |---|---|
  | Claude-Haiku-4.5 | 30,611.9 |
  | GPT-5.4-Mini | 1,235.9 |
  | GPT-4o | 1,085.1 |
  | GPT-3.5 | 120.2 |

  - Negation contractions: 2026 mean 3,139.2 vs 2024 mean 96.7 per million, "approximately 32:1". Excluding Claude-Haiku-4.5, the 2026 mean is 857.3.
- "Rather than fading, safety disclaimers intensify in the Claude lineage (highest in Claude-4.5 Haiku: 46%) whilst sharply dropping in the GPT lineage (GPT-5.4 Mini: 0.2%) … Refusal rates are virtually zero for all models."

**B3. Hubarava & Ineichen, "Accelerated Drift of Scientific Prose in the LLM Era: Evidence from an Interrupted Time-Series Analysis"**
- arXiv [2610.26008](https://arxiv.org/abs/2610.26008), 2026-10-19, EMNLP 2026. [V, abstract]
- "some lexical markers accelerate persistently, while others rise and then recede."
- Their recommendation: monitor writing "as a multidimensional, evolving system rather than through a fixed set of LLM-associated markers."

**B4. Geng, Dong & Poibeau, "Beyond Via: Analysis and Estimation of the Impact of Large Language Models in Academic Papers"**
- arXiv [2603.25638](https://arxiv.org/abs/2603.25638), v2 2026-04-02. [V, abstract]
- New shifts: "beyond" and "via" rising in titles; "the" and "of" falling in abstracts. "current classifiers struggle to accurately determine which specific model generated a given text"; real-world usage is "heterogeneous and dynamic".

**B5. Kousha & Thelwall, "How much are LLMs changing the language of academic papers after ChatGPT? A multi-database and full text analysis"**
- arXiv [2509.09596](https://arxiv.org/abs/2509.09596), v2 2026-03-11. [V, abstract]
- From 2022 to 2024: "delve (+1,500%), underscore (+1,000%), and intricate (+700%)".
- **Co-occurrence:** in 2024, "underscore strongly correlated with pivotal (0.449) and delve (0.311)", compared with 0.032 and 0.018 in 2022.

**B6. Juzek & Ward, "Word Overuse and Alignment in Large Language Models: The Influence of Learning from Human Feedback"**
- arXiv [2508.01930](https://arxiv.org/abs/2508.01930), ECML-PKDD BIAS 2025 workshop. [V, abstract]
- Links overuse to learning from human feedback (RLHF/DPO) on Llama. Participants "systematically prefer text variants that include certain words."

**B7. "After Delve in Tech" (anonymous personal demo; arXiv metadata snapshot 2026-09-28)**
- [eshwarpotturi.github.io/after-delve](https://eshwarpotturi.github.io/after-delve/). Practitioner, not peer-reviewed. [V, page]
- Method: Kobak-style excess, 2019–2022 baseline, 736K cs/eess abstracts.
- "Delve" reached ~21× baseline in January 2024 and is below baseline by 2026.
- A 2026 set ("collapses", "persists", "reframes") reached 11.8% of abstracts in August 2026. "structurally" rose from 12 to 143 per 10,000 abstracts.
- The page itself calls the model link "an inference".

### C. Punctuation and formatting mechanism (em dash, markdown)

**C1. Freeburg, "The Last Fingerprint: How Markdown Training Shapes LLM Prose"**
- arXiv [2603.27006](https://arxiv.org/abs/2603.27006), 2026-03-27. Single-author preprint. [V, full HTML]
- Design: 12 models, 10,000 words per model per condition. Human baseline: "eight published essays … (57,232 words total)", "weighted mean … 3.23 per 1,000 words (median 3.83; range 0.33–17.12)" (§5.1).
- **Em dashes per 1,000 words, unconstrained → under markdown suppression (Table 1 / §5.2):**

  | Model | Unconstrained | Suppressed |
  |---|---|---|
  | GPT-4.1 | 10.62 | 9.10 |
  | Claude Opus 4.6 | 9.09 | 0.19 |
  | DeepSeek V3 | 6.95 | 5.41 |
  | Gemini 2.5 Pro | 3.53 | 0.00 |
  | GPT-5.4 | 1.43 | 0.29 |
  | Llama | 0.0 | 0.0 |

- In long-form output GPT-4.1 "reaches 14.03 per 1,000 words unconstrained and retains 6.97 even under explicit em dash prohibition".
- "The prose-constrained instruction eliminates or nearly eliminates overt markdown features across all twelve models."
- The author warns that human rates vary "a 50× range" and that the finding is "not that LLMs uniformly 'overuse' em dashes".

**C2. Liu, "Self-Training Doesn't Flatten Language — It Restructures It: Surface Markers Amplify While Deep Syntax Dies"**
- arXiv [2605.20602](https://arxiv.org/abs/2605.20602), 2026-05-20. [V, abstract]
- Small models (GPT-2 to Pythia-2.8B) under recursive self-training: "Surface markers (discourse connectives, hedges, em-dashes) rise, while mid- and deep-syntactic structures … collapse." This is a mechanism paper, not about deployed chat models.

### D. Detection robustness, humanizers and Unicode attacks

**D1. Shill & Nandi, "Attacking Only Half the Data: Two-Sided Evaluation of AI-Text Detector Robustness"**
- arXiv [2610.18151](https://arxiv.org/abs/2610.18151), 2026-10-13, ARR submission. [V, full HTML]
- Human text "is routinely modified through grammar correction, formatting, or invisible character insertion."
- "At a threshold set to 1% FPR of clean human documents, attacked human text is flagged at up to 100%."
- On DetectRL, under zero-width insertion, "log-likelihood and log-rank flag every one of the 1,440 human documents" (Table 13).
- **Sanitization (§4.7):** "Zero-width and whitespace attacks are fully recoverable, and homoglyphs only with a matching table. Word substitutions are not recoverable."
  - Recipe: strip zero-width characters, fold a curated table of 47 confusables (Table 18), then apply NFKC.
  - The full UTS #39 table "raises false accusations on clean human text for four of nine detectors".

**D2. Perrone & Romano, "ARB: A Matched Authorship-Rewriting Benchmark Dataset for AI-Text Detector Evaluation"**
- arXiv [2607.29539](https://arxiv.org/abs/2607.29539), 2026-07-31. [V, abstract]
- At TPR@1%FPR, FastDetectGPT and Binoculars detect 91.2% and 93.5% of direct LLM text, "but only 30.8% and 15.1% of human text an LLM had rewritten".
- Detectors keep 78.3% and 83.0% recall when LLM text is rewritten by the same model.

**D3. Maier, Zaiss & Bayer, "Beating the Style Detector: Three Hours of Agentic Research on the AI-Text Arms Race"**
- arXiv [2605.02620](https://arxiv.org/abs/2605.02620), 2026-05-04. [V, abstract]
- "GPT-5.5 detection is mostly a length confound while Opus detection is a genuine stylistic signature."
- Given 20 feedback iterations against a frozen detector, "an Opus agent flips two of five held-out test mimics to the human half-space."

**D4. Pudasaini et al., "Why AI-Generated Text Detection Fails: Evidence from Explainable AI Beyond Benchmark Accuracy"**
- arXiv [2603.23146](https://arxiv.org/abs/2603.23146), v2 2026-04-22. [V, abstract]
- "the features that are most discriminative on in-domain data are also the features most susceptible to domain shift, formatting variation, and text-length effects."
- A search snippet attributed to it: false negatives most often at 14 words, false positives at 34 words [U; not in the abstract].

**D5. Baidya et al., "Detecting the Machine: A Comprehensive Benchmark of AI-Generated Text Detectors Across Architectures, Domains, and Adversarial Conditions"**
- arXiv [2603.17522](https://arxiv.org/abs/2603.17522), 2026-03-18. [V, abstract]
- "Perplexity-based methods exhibit polarity inversion, with modern LLM outputs showing lower perplexity than human text." "No method generalizes robustly across domains and LLM sources."

**D6. Stowe & Patil, "Spotlights and Blindspots: Evaluating Machine-Generated Text Detection"**
- arXiv [2604.16607](https://arxiv.org/abs/2604.16607), 2026-04. [V, abstract]
- "overall poor performance on novel human-written texts in high-risk domains."

**D7. Zhao et al., "A Measurement Perspective on Benchmarking LLM-Generated Text Detectors using Item Response Theory"**
- arXiv [2610.24972](https://arxiv.org/abs/2610.24972), 2026-10-18. [V, abstract]
- 32K texts, 14 detectors. "domain and text length further contribute to benchmark heterogeneity."
- A 2,088-text subset (6.5%) "largely preserves the comparative detector-performance patterns". This is a method precedent for a compact K-05 or K-01 regression subset.

**D8. Microsoft Security, "ASCII smuggling crosses over from AI prompt injection to phishing evasion" (2026-09-03)**
- [Microsoft Security blog](https://www.microsoft.com/en-us/security/blog/2026/09/03/ascii-smuggling-crosses-over-from-ai-prompt-injection-to-phishing-evasion/) [V]
- Tags block "U+E0000 to U+E007F". U+E0020 was inserted inside lure words in a phishing campaign: about 21,000 hits on 2026-02-08 rose to >1.3M the next day, peaking >2.3M on 2026-02-11.
- Advice: "normalize before you match". Treat tag characters as a strong anomaly; the only routine exception is the England, Scotland and Wales flag emoji.

**D9. Graves, "Reverse CAPTCHA: Evaluating LLM Susceptibility to Invisible Unicode Instruction Injection"**
- arXiv [2603.00164](https://arxiv.org/abs/2603.00164), 2026-02-26. [V, abstract]
- "OpenAI models decode zero-width binary; Anthropic models prefer Unicode Tags."

**D10. Aiersilan, Yousefi & Pless, "On Seeding Watermarks to Detect Verbatim LLM Copy-Paste Responses"**
- arXiv [2605.16336](https://arxiv.org/abs/2605.16336), AIES 2026. [V, abstract]
- An input-side watermark hidden in the Tags block that "survives common copy-paste channels". It needs the prompt author's cooperation, so it does not apply to third-party page scanning. Relevant only as a reason tag characters may appear in pasted text.

### E. False positives and fairness

**E1. Park, Jeong & Kim, "Style as a Confound: False Positives in AI Detection of Non-Native Academic Writing"**
- arXiv [2608.26710](https://arxiv.org/abs/2608.26710), EMNLP 2026. [V, abstract + HTML; table cells were not extractable]
- 135,389 pairs of non-native manuscripts and their native-edited versions (2018–2025), 13 detectors.
- "FPRs for human-written texts varied widely, from 0.0% to 100.0%." "the same edits increased AI scores in some detectors but decreased them in others." "score changes correlated with the extent of editing."
- Full text (§4.1): "Detectors based on token statistics exhibited the highest false positive rates … zero-shot likelihood-based detectors maintained an FPR close to zero."

**E2. Al Ali, Helcl & Libovický, "Different Time, Different Language: Revisiting the Bias Against Non-Native Speakers in GPT Detectors"**
- arXiv [2602.05769](https://arxiv.org/abs/2602.05769), EACL 2026 SRW. [V, abstract]
- For Czech: "the perplexity of texts from non-native speakers … is not lower than that of native speakers"; "no systematic bias". This is counter-evidence to Liang 2023, but only for modern detectors and Czech.

**E3. Saha & Feizi, "Almost AI, Almost Human: The Challenge of Detecting AI-Polished Writing"**
- arXiv [2502.15666](https://arxiv.org/abs/2502.15666), v2 2025-05-05. [V, abstract]
- 14.7K samples, 12 detectors. "detectors frequently flag even minimally polished text as AI-generated."

**E4. Originality.ai, "Does AI Translation Impact AI Detection?" (vendor blog, 2026-06-07)**
- [originality.ai](https://originality.ai/blog/ai-translation-impact-ai-detection-study) [V page; vendor, own detector]
- 498 human samples. False-positive rate 0.40% on the English originals.
- Direct translation: 2.21% (Spanish), 0.40% (Portuguese).
- Round-trip EN→ES→EN 28.02%; EN→PT→EN 27.84%.

**E5. Miklian & Katsos, "'That's AI Slop, You Bot!' Studying Accusations, Evidence, and Credibility in Online Discourse Towards LLM-Generated Comments"**
- arXiv [2606.12073](https://arxiv.org/abs/2606.12073), 2026-06-10. [V, abstract]
- 25M HN and Reddit comments. "The slop frame now constitutes 94 percent of pejorative mentions."
- A matched-control test found "prose features that statistically distinguish AI from human text do not predict which human text gets accused as AI."

### F. Chatbot-artifact leakage, and a non-text "slop" definition

**F1. Glynn, "Academ-AI: documenting the undisclosed use of generative artificial intelligence in academic publishing"**
- arXiv [2411.15218](https://arxiv.org/abs/2411.15218), v2 2025-11-15. [V, PDF text]
- Table 1 (n = 768 suspected cases), regex and share of cases:
  - "Knowledge update" `\b(update|cutoff)\b`: 337 (43.9)
  - "Certainly, here…": 258 (33.6)
  - "Important to note": 107 (13.9)
  - Second person: 87 (11.3)
  - "Regenerate response": (7.9)
  - Self-identification as AI: 52 (6.8)
  - "The user": 34 (4.4)
- §3.1.5: "In 61 cases, comprising 8% of the dataset, authors seem to have accidentally copied the button label."
- The denominator is a curated set of *suspected* cases, so these are not prevalence rates.

**F2. Oh et al., "Science or Slop?: Benchmarking and Mitigating Scientific Slop in AI-Generated Papers"**
- arXiv [2610.00531](https://arxiv.org/abs/2610.00531), 2026-09-30. [V, abstract]
- Defines "scientific slop" through six measures across "Structure, Argument, and Artifacts". Paired detection is 85.9%, versus 68.7% for Binoculars.
- "direct slop-aware prompting triggers reward hacking."

**F3. Chakrabarty, Laban & Wu, "Can AI writing be salvaged? Mitigating Idiosyncrasies and Improving Human-AI Alignment in the Writing Process through Edits" (the LAMP taxonomy)**
- arXiv [2409.14509](https://arxiv.org/abs/2409.14509), CHI 2025. [V, abstract]
- A "seven-category taxonomy (e.g. clichés, unnecessary exposition)" built from 1,057 paragraphs edited by professional writers. "none of the LLMs … outperform each other in terms of writing quality."
- SlopShape (A1) uses this as its rewording protocol.

---

## 2. What is new compared with the v4 notes

1. **The first commercial-web replication of a human-vs-AI structure study (A1, SlopShape).**
   - v4 noted that "no corpus or study compares human landing pages with LLM- or AI-builder-generated landing pages". That is still true for *landing pages*. B2B blog posts are now covered, with 2026 models (gpt-5.4, claude-sonnet-4.6, gemini-3-flash).
   - Discourse *structure* beats *style* (97.0 vs 88.1) and survives rewording (96.1).
   - Several of its core values have plausible deterministic surface proxies: announced structure, restated-thesis closers, legacy-vs-modern framing, "next-generation" freshness claims, and the absence of concrete dates.

2. **Site-level aggregation and boilerplate filtering are measured, not assumed (A3, DeGenTWeb).**
   - Page filtering cut site-level FPR from 12.9% to 0.30%.
   - Accuracy rose from 86.9% (1 page) to 98.7% (15 pages).
   - This is direct evidence for C-01's extraction rules and for a multi-page copy verdict.

3. **Base rates for K-01 (A3–A6).** AI text is now common in the very population slop-detect scans:
   - Pew: 35% of dated pages in July 2026.
   - Dolezal: ~35% of new sites by mid-2025.
   - DeGenTWeb: 78.8% of LLM-dominant sites are commercial, with a "surge in businesses (service and SaaS sites)".

   A contemporary "premium human" stratum (K-01 (b)) will be contaminated. False-positive rates must come from pre-2022 captures.

4. **Mechanism and per-model rates for the em dash (C1).**
   - Human mean is 3.23 per 1,000 words (range 0.33–17.12). GPT-5.4 is at 1.43. GPT-4.1 is at 10.62 (14.03 in long form).
   - The shipped comment in `copyPatterns.ts:164` ("~1 em-dash per 150 words is human; LLMs hit 1 per 40-60") is unsourced. Its LLM figure (17–25 per 1,000) exceeds every unconstrained short-form rate in C1, and C1's own human range overlaps it.

5. **Generational style shift (B2, B1, B3, B7).**
   - 2026 models write a "direct and argumentative register" with contrastive "but, not, than" and far more contractions. The formal, nominalised 2024 register is fading.
   - Lexical markers turn over by model generation, in English and in Korean.
   - This makes "formal / no contractions" an anti-signal. It also suggests contrastive constructions (C-08) are *rising*, not decaying.

6. **Invisible-character evidence cuts both ways (D1, D8, D9).**
   - Zero-width insertion is a humanizer and evasion attack that is also applied to human text. Tag-block characters are a 2026 prompt-injection and phishing vector.
   - Neither is evidence of LLM *authorship*.
   - "Normalize before you match" is now an explicit, measured recommendation. Without it, any regex-based copy rule can be evaded by inserting a ZWSP inside a word.

7. **New false-positive vectors (E1, E3, E4).**
   - Professional editing shifts detector scores in either direction.
   - Minimal AI polish gets flagged.
   - Round-trip machine translation raised a vendor detector's false-positive rate from 0.40% to ~28%.
   - The non-native bias finding is detector-specific; E2 found none for modern Czech detectors.

8. **Residue numbers corrected (F1).**
   - "Regenerate response" is 8% (61 of 768) of *curated suspected cases*. "Certainly, here…" is 33.6% and knowledge-update phrases 43.9% of that set.
   - B2 confirms refusals are "virtually zero" in 2026 models. Safety disclaimers diverge by lineage: Claude-Haiku-4.5 46%, GPT-5.4-Mini 0.2%.

---

## 3. Candidate roadmap items

Relation codes refer to v4 `REPORT.md`. Every item below ships at weight 0 under K-04 unless stated otherwise.

### CA-01 Normalize-before-match preprocessing for all copy rules (infrastructure)
- **Logic:** before any copy regex, build a normalized text view:
  1. Record, then strip, U+200B, U+200C, U+200D, U+2060, U+FEFF and U+E0000–U+E007F. Keep emoji ZWJ sequences and flag tag sequences for display only.
  2. Collapse whitespace runs.
  3. Fold a *small curated* confusables table (Latin↔Cyrillic/Greek lookalikes). Do not use full UTS #39, which raised false positives in D1.
  4. Apply NFKC to the matching view only. Keep the original text for evidence spans, and map offsets back.
- **Grade:** measured (D1 §4.7; D8 is standard practice).
- **False-positive risk:** NFKC folds fullwidth CJK punctuation and ligatures. Apply it only to the matching view. Arabic-script and Indic text needs U+200C, so stripping it from the *matching view* is fine but it must not be counted as an artifact there (see CA-02).
- **Acceptance:**
  - A fixture with `inno​vative` and Cyrillic `а` in "seаmless" triggers the same buzzword hits as the clean text.
  - Byte-identical evidence spans are reported against the original.
  - No change in hits on the pre-2022 control.
- **Relation:** part of C-01. A prerequisite for #201, C-08 and every phrase registry (C-02, C-03, C-05).

### CA-02 Split `unicode_artifacts` into three findings, none claiming authorship
- **Logic:**
  - **(a) `hidden_tag_characters`:** any U+E0000–U+E007F code point that is not part of a valid emoji tag sequence (U+1F3F4, tag characters, then U+E007F). Tier: Warning. Label it "hidden instruction characters (prompt-injection or smuggling vector)".
  - **(b) `invisible_characters`:** U+200B, U+2060 or U+FEFF inside a word token (between two letters). U+200D counts only when not between emoji code points. U+200C counts only when not adjacent to Arabic-script, Indic or Persian letters. Fire at ≥ 2 in-word hits (heuristic). Label: "invisible characters in text (often humanizer or paste residue)".
  - **(c) `fake_bold_math_alnum`:** keep as shipped (≥ 4).
  - Drop `narrowNbsp >= 1` as a trigger. Record it as an evidence field only.
- **Grade:** standard/measured for the attack mechanism (D1, D8, D9). Hypothesis for prevalence on landing pages.
- **False-positive risks:**
  - Flag emoji (handled).
  - Persian and Indic ZWNJ (handled).
  - French typography U+202F (no longer a trigger).
  - CMS soft-hyphen and ZWSP line-break hacks in long URLs. Exclude matches inside `a[href]` text that looks like a URL.
- **Acceptance:**
  - Fixtures 🏴󠁧󠁢󠁳󠁣󠁴󠁿, 👩‍💻, a Persian paragraph and a French "10 000 €" are silent.
  - A paragraph with a Tags-block payload fires (a).
  - 0 hits from (a) on the pre-2022 control.
- **Relation:** amends the shipped `unicode_artifacts` (v4 §7 CAVEAT). Complements v4 candidate #9 `mixed_script_homoglyph`, which can reuse CA-01's confusables table.

### CA-03 `announced_structure` (self-announcing opener)
- **Logic:** in the first two prose blocks of the main content (after C-01 extraction; skip the hero H1 and its subhead), match meta-discourse that announces what the page will cover:
  - `/\b(?:in this (?:post|article|guide|page)|below|here(?:'|’)s what)\b[^.!?]{0,40}\b(?:we(?:'|’)ll|we will|you(?:'|’)ll|you will)\s+(?:cover|explore|learn|walk through|look at|break down|discover)\b/i`
  - `/\bby the end of this (?:post|article|guide)\b/i`
  - Fire on 1 hit and report it as Suggestion tier.
- **Grade:** measured, *but on B2B blog posts with LLM-applied features* (A1: "Thesis before first unit" gap 0.419; the paper's own example sentence). For landing pages it is a hypothesis: hero copy rarely uses "in this post".
- **False-positive risks:**
  - Human blog and docs pages legitimately preview their structure. Docs and tutorials do it by convention.
  - Legal pages ("This policy describes…") are excluded by C-01.
  - The rule mostly applies to `/blog/*` routes, not the homepage.
- **Acceptance:**
  - Likelihood ratio ≥ 3 on K-01 stratum (c) vs (a), using blog routes only.
  - No firing on K-05 pioneer docs pages, such as Stripe Docs intros.
  - Otherwise it stays an evidence field.
- **Relation:** extends `filler_openers`. A new rule under K-04.

### CA-04 Re-scope `formulaic_closers` from a phrase list to a position-aware "restated-thesis closer"
- **Logic:**
  - Only the *last* prose block or the last two paragraphs before the footer or CTA count.
  - Match summary markers at the sentence start: `In short|In summary|In conclusion|Ultimately|The bottom line|To sum up|At the end of the day|All in all`.
  - Add a cheap restatement proxy: ≥ 50% of the content words in the closing sentence also appear in the H1 or the first prose sentence (heuristic).
  - Fire when the marker and the restatement co-occur.
- **Grade:**
  - The *structure* is measured (A1: "restated thesis or reframe" gap 0.650, the largest core value; "summary or synthesis" stage 0.609; both AI-leaning in 2026 models).
  - The *phrases* are standard-but-decaying (Wikipedia "historical", per v4).
  - The overlap proxy is a hypothesis.
- **False-positive risks:**
  - Human essays and long-form posts conclude by convention.
  - Landing pages often end with a CTA restating the value proposition, which is genre-native.
  - Restrict the rule to blog/article routes, or require ≥ 300 prose words (C-01).
- **Acceptance:** the Gettysburg-style human-essay fixture and the pre-2022 control blog sample stay below the Suggestion tier. The likelihood ratio is measured on K-01.
- **Relation:** *qualifies C-07*. Mark the closer *phrases* "historical", but keep a structural closer rule "active/experimental", because A1 shows the closing-summary stage is still produced by 2026 frontier models.

### CA-05 `legacy_vs_modern_frame` and next-generation freshness claims (evidence field, not a rule)
- **Logic:**
  - Count co-occurrence within one section of a legacy cue (`legacy|outdated|traditional|old way|manual|spreadsheets?|clunky|built for a (?:slower|different) era|stuck in the past`) and a modern cue (`modern|next[- ]gen(?:eration)?|future[- ]proof|AI[- ]native|for today(?:'|’)s`).
  - Separately count freshness claims (`next-generation|future-proof|modern`).
  - Report counts per 1,000 prose words.
- **Grade:** measured on blog posts (A1: legacy/modern contrast gap 0.497; "modern or next-generation framing" 0.360). For landing pages it is a hypothesis: "replace your legacy tool" is the native positioning genre of SaaS pages (v4 §2 "genre misalignment").
- **False-positive risk:** **high** on human SaaS pages. It would replicate the `buzzword_density` problem.
- **Acceptance:** stays an evidence field unless K-01 shows a likelihood ratio ≥ 3 *within* stratum-matched SaaS pages. Expected outcome: it never promotes.
- **Relation:** feeds the #201 log-odds pipeline as candidate bigrams, and the K-07 craft check.

### CA-06 Concrete-specificity counter-signal (`time_and_number_anchors`)
- **Logic:** count explicit historical dates or periods (`\b(?:19|20)\d{2}\b` outside the copyright footer; "since 20xx"; "founded in"; month-year), named-person quotes with attribution, and specific numbers with units. Report density.
- **Use:** never adds to the slop score. Used in K-01 analysis to test whether low specificity co-varies with slop hits, and possibly as a mitigating note ("page cites concrete dates and figures").
- **Grade:**
  - Measured on blogs (A1: "historical date or period" is human-leaning, gap 0.283).
  - A5 found more positive sentiment with more AI text (correlational).
  - For landing pages it is a hypothesis.
- **False-positive risk:** none for scoring, since it carries no weight. Risk of rewarding fabricated numbers; AI pages also emit fake stats (see #202 structural signals).
- **Acceptance:** reported in CALIBRATION.md v2 as a covariate with a CI.
- **Relation:** K-01 and K-07.

### CA-07 Multi-page copy verdict with cross-page boilerplate removal
- **Logic:** when `--crawl` or the site audit scans N pages:
  1. Chunk each page's C-01 prose (for example, sentence shingles).
  2. Drop chunks appearing on > 50% of the other scanned pages (DeGenTWeb's rule).
  3. Drop pages with < 150 English prose words (heuristic; DeGenTWeb used ≥ 200 Falcon tokens for a model detector).
  4. Compute per-page copy hits, then report the site-level distribution (share of pages at Mild or above, 10th–90th percentiles) rather than the worst page.
  5. Show a site-level copy verdict only when ≥ 5 qualifying pages exist (heuristic).
- **Grade:** measured as a method (A3: FPR 12.9% → 0.30% with filtering; accuracy 86.9% at 1 page → 98.7% at 15 pages). These numbers are for Binoculars plus an SVM, not slop-detect's rules. They justify the design, not a specific threshold.
- **False-positive risks:** sites with a few long human pages and many templated ones. The cross-page dedup removes template text first.
- **Acceptance:**
  - On the pre-2022 control, the site-level Heavy rate is ≤ the page-level Heavy rate.
  - Removing nav, footer and the CTA band via dedup changes no artifact-tier (C-02/C-03) hit.
- **Relation:** C-01 (extraction), #210 (multi-page crawl / pool), K-01 (site-level stratum), K-06 (population framing).

### CA-08 Em-dash rule recalibration (amend the shipped `em_dash_overload`)
- **Logic:**
  - Replace the unsourced code comment with C1's numbers.
  - Keep the C-07 halving and co-occurrence requirement.
  - Count U+2014 only. The `\s–\s` en-dash branch is not supported by any source read here; make it an evidence field.
  - Raise the absolute-count branch so it needs ≥ 300 prose words (C-01), because C1's human range reaches 17.12 per 1,000.
  - Tag the rule with model families "Claude (unconstrained), GPT-4.1/4o era, DeepSeek" and `status: decaying` for current ChatGPT (C1: GPT-5.4 at 1.43).
- **Grade:** measured (C1, but the human baseline is only 8 essays and 57K words; Czuma ×2 in v4 gives population human drift).
- **False-positive risks:** literary, journalistic and editorial human copy. Humans range up to 17.12 per 1,000 (C1) and rose in Congress and medRxiv (v4).
- **Acceptance:** the pre-2022 control false-positive rate at Suggestion tier is ≤ 5% (v4 target). The comment cites C1.
- **Relation:** C-07 (strengthened), K-03 lifecycle tags.

### CA-09 Lexicon governance additions for #201
- **Logic:** in the #201 pipeline (Fightin' Words z ≥ 3, ≥ 3 sites):
  - **(a)** Re-derive per *model generation*. B1 and B3 both show rise-and-recede marker turnover.
  - **(b)** Add a co-occurrence feature: count of *distinct* lexicon hits per page. B5 shows LLM terms now co-occur (underscore–pivotal r 0.449 in 2024 vs 0.032 in 2022). Distinct-term count beats raw density for per-page use. The shipped `distinct >= 4` branch already does this.
  - **(c)** Keep a "watch list" of rising academic-register terms ("collapses", "persists", "reframes", "structurally", "survives"; B7, practitioner). Admit them only if they clear z ≥ 3 on *marketing* pages.
  - **(d)** Lexicons are per language. Non-English pages get none (B1: the Korean markers are morphological, appeared a year later than English, and are not translations).
- **Grade:** measured (B1, B3, B5); practitioner (B7).
- **False-positive risks:** importing academic terms into the marketing register (v4 genre-misalignment warning).
- **Acceptance:**
  - The committed script shows each term's z, site count and era tag.
  - The B7 watch-list terms never ship without a marketing-corpus z.
- **Relation:** #201, K-03, K-09, C-01 language gate.

### CA-10 Anti-signals: never score these (policy, fairness)
- **Policy:** the copy axis must not use any of these as AI evidence:
  - (i) absence of contractions or a formal register (B2: the 2026 cohort is contraction-heavy; GPT-5.4-Mini is lower than Claude-Haiku-4.5 by about 25×);
  - (ii) lexical diversity, word length or readability (E1/E3 editing and polish effects; D4 length and format sensitivity; v4 TOEFL mechanism);
  - (iii) "positive sentiment" or promotional tone alone (A5 is correlational; the genre is native to landing pages);
  - (iv) perplexity-like predictability (D5: polarity inversion).
- **Grade:** measured (B2, D4, D5, E1, E3).
- **Acceptance:** a lint test asserts that no copy pattern reads TTR, readability, sentiment or contraction counts in its `triggered` expression.
- **Relation:** #200 (constrains `sentence_length_uniformity` and nominalization density), K-06.

### CA-11 Translated and AI-polished human strata for K-01
- **Logic:** add two K-01 control sub-strata built from pre-2022 human pages:
  - **(t)** the same pages round-tripped through machine translation (EN→ES→EN) and also directly translated from a non-English pre-2022 original;
  - **(p)** the same pages "lightly polished" by a current LLM (single pass, instruction "fix grammar only").
  - Report the per-pattern false-positive rate on each.
- **Grade:** measured precedent (E4 vendor: round-trip FPR 0.40% → ~28%; E3: minimal polish flagged; E1: editing confound).
- **Acceptance:**
  - CALIBRATION.md v2 reports (t) and (p) separately.
  - No pattern is promoted (K-04) if its Heavy false-positive rate on (t) exceeds 2× that on the untouched control (heuristic).
- **Relation:** K-01, K-04, K-06. It answers the brief's "translated sites" risk directly.

### CA-12 Residue registry additions (amend C-03 and C-05)
- **Logic:** add sentence-anchored UI-chrome residue:
  - `/\bRegenerate response\b/i` (F1 Table 1);
  - `/^\s*ChatGPT said:\s*$/m` and `/^\s*You said:\s*$/m`, which are ChatGPT share-page transcript labels. This is **[U]**: the strings were not verified in a source this session, so the rule must be dated and verified before shipping.
  - Keep the "Certainly, here…" form already in v4.
  - Make "the user" a Suggestion-tier evidence field only (F1: 4.4% of suspected cases; it is also common human product copy).
- **Grade:** measured (F1, curated academic cases, not web prevalence).
- **False-positive risks:**
  - AI-product demo transcripts (C-03 container exclusion).
  - Docs pages about ChatGPT.
- **Acceptance:** C-03 fixtures pass; zero hits on the pre-2022 control.
- **Relation:** C-03, and C-02's dated registry.

---

## 4. v4 items the new evidence strengthens or weakens

| v4 item | Effect | Evidence |
|---|---|---|
| **C-01** gating and extraction | **Strengthens.** Add CA-01 normalization and CA-07 cross-page dedup. Text length is a named confound in D3, D4 and D7. Boilerplate filtering cut FPR 12.9% → 0.30% (A3). | A3, D1, D3, D4, D7 |
| **C-01** language gate (artifacts-only for non-English) | **Strengthens.** Excess vocabulary exists in Korean but is language-specific and lagged (B1). Round-trip translation inflates detector FPR (E4). | B1, E4 |
| **C-02 / C-03** artifact registries | **Strengthens precision; prevalence is unknown.** Refusals are "virtually zero" in 2026 models (B2), so C-03 refusal phrases are near-historical. Keep them, since precision is high. Add CA-12. | B2, F1 |
| **C-07** em-dash halving | **Strengthens** (CA-08). GPT-5.4 is at 1.43 per 1,000, below the human mean of 3.23. The signal is now mostly Claude-unconstrained, GPT-4.1 and DeepSeek. | C1 |
| **C-07** `formulaic_closers` "historical" | **Weakens in part.** The phrases are decaying, but the closing-restatement *structure* is the top AI-leaning value in 2026 models (gap 0.650). Re-scope per CA-04 rather than retire. | A1 |
| **C-08** extend `antithesis_construction` | **Strengthens; mark it "rising".** The 2026 cohort's style loads on "not, but, than" (B2). The construction persists across generations, unlike the vocabulary. | B2 (plus Antislop in v4) |
| **C-09** emoji refresh | **No new evidence.** Still single-model (WaPo, gpt-4o). | — |
| **#200** stylometry | **Weakens nominalization density as a 2026 signal.** The 2024 cohort was "nominalised"; the 2026 cohort is "direct and argumentative" (B2). Reinhart's GPT-4o effect may be generation-bound. Participial clauses get no new evidence. Keep #200 at weight 0 and require per-generation re-measurement. Add CA-10's contraction ban. | B2, B3 |
| **#200** "structure > style" direction | **New direction.** Discourse-structure signals beat style and survive rewording (A1, A2). Deterministic proxies (CA-03, CA-04) are the only zero-LLM route; their validity on landing pages is unmeasured. | A1, A2 |
| **#201** lexicon pipeline | **Strengthens the method; adds governance** (CA-09). Marker turnover by generation (B1, B3, B7). Co-occurrence is stronger post-2023 (B5). Same-model rewording keeps detection (D2) but cross-human rewriting does not, so lexical hits on AI-polished human copy are expected (E3). | B1, B3, B5, B7, D2, E3 |
| **#202** structural fake-proof only | **Strengthens.** Ad and testimonial prose is not separable by humans (A7 parity 51.1% vs 48.9%, consistent with Meng et al. in v4). | A7 |
| **K-01** calibration strata | **Strengthens and amends.** Contemporary human pages are heavily contaminated (A3, A4, A5: ~35% of new or dated pages). The false-positive rate must come from pre-2022 captures. Add the CA-11 translated and polished strata. Report site-level metrics (CA-07). D7's IRT subset is a precedent for a compact regression set. | A3–A5, D7, E1, E3, E4 |
| **K-03** lifecycle (`rising`, `decaying`) | **Strengthens.** Rise-and-recede markers (B3); generation turnover (B1, B2, B7); "delve" below baseline by 2026 (B7, practitioner). | B1–B3, B7 |
| **K-04** weight-0 gate | **Strengthens.** The most discriminative in-domain features are the most domain- and length-fragile (D4). | D4 |
| **K-06** harm-avoiding language | **Strengthens.** Accusations do not track real AI features (E5). Detector FPR on human text ranges 0–100% (E1). Polished and translated human text gets flagged (E3, E4). | E1, E3, E4, E5 |
| v4 "Adversarial" caveat (rules trivially evaded) | **Strengthens, with nuance.** Character-level evasion is reversible (CA-01). Word substitution is not (D1). Agentic self-revision flips detectors in 20 iterations (D3). Slop-aware prompting causes reward hacking (F2). Keep positioning the copy axis as self-audit. | D1, D3, F2 |
| v4 `unicode_artifacts` false-positive caveat | **Confirmed, and partly superseded by CA-02.** Invisible-character insertion is applied to human text too (D1). The Tags block is an injection vector (D8, D9) worth its own non-authorship finding. | D1, D8, D9 |

---

## Gaps

- No study yet measures any of these features on **landing pages** specifically. A1 is B2B blog posts; A3–A5 are whole sites or pages via model detectors.
- A1's features are LLM-applied. CA-03 to CA-06 are my deterministic proxies and are unvalidated. A1's instrument cannot be reused without the author's permission.
- I found no 2026 measurement of chatbot-residue phrase prevalence on the open web, and no measurement of Tags-block or zero-width prevalence on crawled pages.
- I found no 2026 paper on short-text (under 150 words) detection limits beyond D4's [U] snippet and A3's citation of Binoculars dropping from 96% to 80% (256 → 128 tokens).
- I could not extract E1's per-detector table cells, because they are math-rendered.
- Not opened: Mady et al. 2026 (cited by D2's search snippet), Pangram's EditLens paper, and the Graphite 2026 report.
- The arXiv API rate limit (HTTP 429) cut systematic date-sorted sweeps short. A follow-up sweep for Jul–Oct 2026 should query `abs:"AI-generated" AND abs:(website OR marketing OR landing)` and `abs:(zero-width OR homoglyph)`.
