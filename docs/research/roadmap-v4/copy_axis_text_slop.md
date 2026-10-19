# Copy axis: deterministic (zero-LLM) detection of AI "slop" in landing-page copy: 2024–2026 evidence, failure modes, calibration

Verification tags: **[V]** = opened and read in this session (2026-10-19). **[S]** = secondary source only (search snippet, a quote in another outlet, or a citation inside Wikipedia). **[NV]** = could not verify. The web-search budget ran out near the end of the session, so a few final checks were not run. They are listed under Gaps. The shipped Copy patterns referenced below were read directly from `packages/core/src/copyPatterns.ts` in this repo.

## 1. What do the 2025–2026 papers that define or measure "slop" find, and which of their metrics are deterministic and computable on a 300–1,500-word landing page?

### Takeaway
The one paper that directly operationalizes "slop" (Shaib et al., Sept 2025) reports three things. Expert annotators barely agree on a binary slop label (pairwise κ −0.12 to 0.11). LLM judges perform at chance (κ ≈ 0). The best deterministic feature set (syntax only) reaches just AUROC 0.64–0.68. The deterministic measures that can run on a single page are:
- lexical over-representation ratios (Antislop / slop-forensics)
- syntactic POS templates
- compression ratio
- verbosity and readability
- a subjectivity lexicon

Most of these were built as corpus-level measures. Compression ratio, templatedness, verbosity and word complexity were not significant predictors of human slop judgments.

### Cited Findings
**Shaib, Chakrabarty, Garcia-Olano & Wallace, "Measuring AI 'Slop' in Text" (arXiv 2509.19163, v1 2025-09-23; v3 read)**
- The taxonomy was built from 19 expert survey responses. It has 15 codes under three themes:
  - Information Utility: density, relevance.
  - Information Quality: factuality, bias/subjectivity.
  - Style Quality: structure (repetition + templatedness), coherence, and tone (including fluency, verbosity and word complexity).
  - [Shaib et al. 2025](https://arxiv.org/abs/2509.19163) [V]
- Data:
  - 150 news articles, about 871 words on average, with human and AI versions from Russell et al. 2025.
  - 100 MS MARCO QA responses, about 55 words, from Llama-4 Scout, OLMo-2-13B, Mistral-7B, GPT-4o and Gemma-2-27B.
  - [Shaib et al. 2025](https://arxiv.org/abs/2509.19163) [V]
- Human agreement on the binary "slop" label:
  - Cohen's κ was −0.12, 0.11 and 0.01 across annotator pairs. Gwet's AC1 was 0.07, 0.21 and 0.16. About 34–36% of items were labeled slop.
  - Theme-level Krippendorff α_MASI was 0.37 for Information Utility and Style Quality, and 0.44 for Information Quality.
  - Code-level AC1: factuality 0.75, bias 0.73, density 0.55, coherence 0.51.
  - [Shaib et al. 2025](https://arxiv.org/abs/2509.19163) [V]
- LLM judges, zero-shot binary slop:
  - GPT-5: κ = 0.01 (precision 0.38, recall 0.12). DeepSeek-V3: κ = −0.01. o3-mini: κ = 0.03.
  - GPT-5 span extraction reached about P 0.14 / R 0.11. A fine-tuned Qwen-7B reached 0.32 / 0.30.
  - [Shaib et al. 2025](https://arxiv.org/abs/2509.19163) [V]
- Automatic feature sets:
  - Syntax-only features did best: logistic regression AUROC 0.64 (±0.06), PCA+LDA 0.68 (±0.09). The authors say standard text metrics "fail to capture annotator preferences."
  - The lexical set contained hapax/dis legomena ratios, word-length distribution, punctuation rates and letter-frequency deviations.
  - The syntactic set contained POS distributions, dependency relations, parse depth, voice, NP complexity, sentence-initial POS, branching factor and conjunction count.
  - [Shaib et al. 2025, Tables 16–17](https://arxiv.org/abs/2509.19163) [V]
- Table 16 maps each dimension to its automatic metric:

  | Dimension | Automatic metric |
  |---|---|
  | Density | surprisal (needs a language model) |
  | Bias | subjectivity lexicon (Wiebe et al. 2004) |
  | Repetition | compression ratios |
  | Templatedness | templates-per-token |
  | Fluency | UniEval |
  | Verbosity | counts of words, sentences and paragraphs |
  | Word complexity | Gunning Fog |
  | Relevance, factuality, coherence, tone | no automatic metric |

  - Marked significant: density, relevance, bias, coherence, tone.
  - Not significant: repetition (compression ratio), templatedness, fluency, verbosity, word complexity.
  - The authors note that "three of the five codes significant" lack reliable automatic metrics, and conclude that fully automated, scalable measurement "remains an open challenge."
  - Extraction caveat: one pass of the text said all seven codes were significant positive predictors in the pooled regression, with Relevance β = 0.06, Density 0.05 and Tone 0.05 strongest. That differs from the Table 16 flags. Treat the per-code significance claims as approximate.
  - [Shaib et al. 2025](https://arxiv.org/abs/2509.19163) [V]

**Paech, Roush, Goldfeder & Shwartz-Ziv, "Antislop" (arXiv 2510.15061, 2025-10-16; the antislop-sampler README says it was accepted at ICLR 2026)**
- Method:
  - The over-representation ratio is ρ(p) = f_LLM(p) / f_human(p).
  - Each model produced 2,000 outputs from Reddit creative-writing prompts.
  - Human baselines: wordfreq for single words; Reddit creative writing plus Project Gutenberg for bigrams and trigrams, with stop-words removed.
  - A pattern must occur in at least 3 independent prompts.
  - Each model's fingerprint is its top 120 words plus top 40 bigrams/trigrams.
  - [Paech et al. 2025](https://arxiv.org/abs/2510.15061) [V]
- Magnitudes, for gemma-3-12b: "elara" 85,513×, "unsettlingly" 3,833×, "shimmered" 2,882×, and the trigram "heart hammered ribs" 1,192×.
  - "It's not X, it's Y" constructions are 6.3× more prevalent than in human writing in some models.
  - Across 67 models, "flickered" is in the top-word list for 98.5% of models and "voice barely whisper" for 68.7%.
  - Fingerprints cluster within model families.
  - The authors say slop lists are domain-specific and that professional writing would show different patterns.
  - [Paech et al. 2025](https://arxiv.org/abs/2510.15061) [V]
- Supporting repos and benchmark:
  - **slop-forensics** (MIT, 374 stars) counts per-model words, bigrams and trigrams with common words and numbers filtered out. It emits `slop_list.json` and companion files plus a "Slop Index" whose formula the README does not give, and builds PHYLIP parsimony trees of models. The README names no human baseline. [sam-paech/slop-forensics](https://github.com/sam-paech/slop-forensics) [V]
  - **antislop-sampler** (Apache-2.0) says its phrase list was "largely auto-generated" from an LLM story dataset and is "not well curated." `regex_bans` was added 2024-10-13, aimed at "not x, but y" phrasing. [sam-paech/antislop-sampler](https://github.com/sam-paech/antislop-sampler) [V]
  - **EQ-Bench:** the legacy v2 "Slop" metric "measures words that are typically over-used by LLMs," with the list built by counting word frequency in generated stories. In v3 the slop score is only a user-adjustable penalty slider and is not part of the Elo scoring. [EQ-Bench About](https://eqbench.com/about.html) [V]

**Shaib, Elazar, Li & Wallace, "Detection and Measurement of Syntactic Templates in Generated Text" (EMNLP 2024; arXiv 2407.00211)**
- Definitions:
  - Templates are repeated POS-tag n-grams (spaCy, the 36-tag Penn Treebank set), with n from 4 to 8 and n = 6 mostly reported.
  - Template rate is the share of texts containing at least one template. Templates-per-token is the length-normalized version.
  - CR-POS is the gzip compression ratio of POS-tagged text.
  - [Shaib et al. 2024](https://arxiv.org/abs/2407.00211) [V]
- Table 3 (n = 500 per dataset), order Rotten Tomatoes / Cochrane / CNN-DM:
  - Human references: CR-POS 5.31 / 5.63 / 5.33; template rate 46.4% / 83.3% / 36.0%.
  - Models: CR-POS 5.66–7.82; template rate 74.0–99.7%.
  - GPT-4o: CR-POS 6.11 / 6.12 / 5.71; template rate 98.2% / 95.7% / 91.0%.
  - [Shaib et al. 2024](https://arxiv.org/abs/2407.00211) [V]
- 76% of templates in model text appear in pre-training data, versus 35% for human text, and templates survive RLHF.
  - Example template: DT JJ NN IN DT JJ NN ("a romantic comedy about a corporate executive").
  - No minimum length is given. Template measures are confounded by length; Rotten Tomatoes references average 25.1 tokens, while GPT-4o outputs average 203.5.
  - [Shaib et al. 2024](https://arxiv.org/abs/2407.00211) [V]

**Shaib et al., "Standardizing the Measurement of Text Diversity" (arXiv 2403.00553; v1 2024-03-01, revised 2026-02-18)**
- Fast compression ratios capture much of the information in slow n-gram-overlap homogeneity scores.
- The authors recommend reporting compression ratio, self-repetition of long n-grams, Self-BLEU and BERTScore, which are only weakly correlated with each other.
- [Shaib et al.](https://arxiv.org/abs/2403.00553) [V]
- The `diversity` package (Apache-2.0) exposes `compression_ratio(texts, algorithm='gzip')`, where "higher = more repetitive."
  - Most functions take a list of texts, so they are corpus-level.
  - `match_patterns(text, patterns)` is the single-text function.
  - The README gives no length guidance.
  - [cshaib/diversity](https://github.com/cshaib/diversity) [V]

**Sun, Yin, Xu, Kolter & Liu, "Idiosyncrasies in Large Language Models" (arXiv 2502.12150, 2025-02-17)**
- Source attribution across ChatGPT, Claude, Grok, Gemini and DeepSeek reaches 97.1% (5-way) with fine-tuned embeddings.
  - TF-IDF plus logistic regression reaches 85.5% on chat models.
  - Shuffling words still gives 88.9%; shuffling letters drops it to 39.1%.
  - **Markdown formatting elements alone give 73.1% (chat).**
  - The first token alone gives about 50%.
  - After rewriting: paraphrase 91.4%, translation 91.8%, summarization 58.1%.
  - [Sun et al. 2025](https://arxiv.org/abs/2502.12150) [V]
- Characteristic markers by model:
  - ChatGPT: "such as," "certainly," "overall"; often opens with "certainly" or "below is"; bolds key points in enumerations and uses headers.
  - Claude: "here," "according to," "based on"; often uses no bold or headers.
  - Gemini: uses italics more.
  - [Sun et al. 2025](https://arxiv.org/abs/2502.12150) [V]

### Inferences
- **Deterministic and computable on one page:**
  - Weighted lexical over-representation, using a shipped ratio table from a baseline corpus.
  - Matching against a pre-mined inventory of AI-frequent POS templates. This needs a JS POS tagger and an AI-page template inventory; templates-per-token per page.
  - Verbosity counts, readability (Gunning Fog), subjectivity-lexicon density, gzip compression ratio.
  - **Not deterministic:** surprisal (needs a language model); relevance, coherence, factuality and tone (need human or LLM judgment).
- On landing pages, the subjectivity lexicon and promotional density are expected by genre, so they are poor discriminators (see Q2).
- Compression ratio and template rate were validated mainly at the corpus level, and Shaib 2025 found them non-significant against human slop labels. Treat them as research features, not shipped patterns.
- Inter-annotator κ near zero means a "slop" verdict on copy is not a well-defined ground truth. The copy axis should report evidence spans per pattern, not a binary "slop / not slop."
- Sun et al.'s result that formatting alone (markdown) attributes chat-model output with 73% accuracy supports treating leaked chat formatting as a strong signal (see Q5).

### Gaps
- Per-feature-set AUROC by domain (news vs QA) in Shaib 2025 is only in figures (14–15) that could not be read.
- The EQ-Bench v3/Longform slop-score formula and per-model slop values were not found on the About page.
- None of these metrics has been evaluated on landing pages or marketing copy.

## 2. Which lexical/syntactic features carry the most signal in short marketing-register text, and what do studies of press releases, product/ad copy, job postings, reviews and web pages show?

### Takeaway
No peer-reviewed study isolates landing-page copy. The nearest registers show the following:
- **Corporate press releases** have the highest measured population-level LLM share of any domain (up to ~24% of text by late 2023).
- **Job postings** show more adoption at young and small firms.
- **AI fake product reviews** are indistinguishable from real ones at the text level (humans 50.8%).
- Grammatical tells (present participial clauses, nominalizations) are the largest-effect deterministic features in Reinhart et al. They were measured on ~500-word chunks across news, blogs, academic, fiction, spoken and TV registers, not marketing copy.
- Word-overuse is a "genre misalignment" phenomenon. Promotional vocabulary, which marks AI text on Wikipedia, is the norm on landing pages.

### Cited Findings
**Liang et al., "The Widespread Adoption of Large Language Model-Assisted Writing Across Society" (arXiv 2502.09747, 2025-02-13; window Jan 2022–Sep 2024)**
- Consumer complaints: ~18% LLM-assisted (15.3% Aug 2023 → 17.7% Aug 2024).
- Corporate press releases: "up to 24%."
  - Newswire: 24.3% in Dec 2023, then 23.8% through Sep 2024. PRNewswire: 16.4%.
  - 537,413 releases via NewsAPI (PRNewswire, PRWeb, Newswire). Science & Tech was about 16.8% by Q4 2023.
- UN press releases: 13.7% in Q3 2024.
- [Liang et al. 2025](https://arxiv.org/abs/2502.09747) [V]
- Job postings: Revelio Labs/LinkedIn data, 304,270,122 postings from Jan 2021 to Oct 2023.
  - About 3–4% overall; 5–10% in small firms (Engineering and Sales near 10%).
  - By founding year: after 2015, 14.1%; 2010–2015, 10.2%; 1980–2000, 7.2%; pre-1980, 4.0%.
  - Below-median firm size: 11.1% vs 6.2%.
  - [Liang et al. 2025](https://arxiv.org/abs/2502.09747) [V]
- Method and caveats:
  - Population-level estimation, fitted on 2021 data (2019 for UN releases), with population-level error under 3.3%.
  - The authors call the estimates a "lower bound." They cannot detect heavily human-edited text or models that closely imitate human writing.
  - Non-English text is not covered.
  - Adoption "stabilized by late 2023 and remained steady through 2024."
  - [Liang et al. 2025](https://arxiv.org/abs/2502.09747) [V]
- The underlying framework, Liang et al. ICML 2024 "Monitoring AI-Modified Content at Scale" (arXiv 2403.07183), uses maximum-likelihood estimation over expert-written and AI-generated reference texts at the **corpus level**. It notes trends "too subtle to detect at the individual level" and estimates 6.5–16.9% of peer-review text at four venues as substantially LLM-modified. [Liang et al. 2024](https://arxiv.org/abs/2403.07183) [V]

**Reinhart et al., "Do LLMs write like humans? Variation in grammatical and rhetorical styles" (PNAS 2025; arXiv 2410.16107)**
- Corpus:
  - HAP-E: 8,290 human–LLM text sets (66,320 chunks) across academic, news, fiction, spoken, blogs and TV/movie scripts.
  - Each LLM continued a ~500-word human chunk.
  - Models: GPT-4o, GPT-4o mini, and Llama 3 8B/70B in base and instruct versions.
  - [Reinhart et al. 2025](https://arxiv.org/abs/2410.16107) [V]
- LLM-to-human rate ratios:

  | Feature | Ratio | Effect size (GPT-4o) |
  |---|---|---|
  | Present participial clauses | 2–5× in instruction-tuned models; 5.3× in GPT-4o | d = 1.38 |
  | Nominalizations | 1.5–2×; 2.1× in GPT-4o | d = 1.23 |
  | "That" clauses as subjects | 2.6× | d = 0.77 |
  | Phrasal coordination | 1.9× | d = 0.81 |
  | Agentless passives | about 0.5× | |

  - GPT-4o avoids clausal coordination, while Llama overuses it. GPT-4o overuses downtoners, while Llama avoids them.
  - Base models are close to human rates.
  - [Reinhart et al. 2025](https://arxiv.org/abs/2410.16107) [V]
- Classification on ~66 Biber features (random forest):
  - Human vs one specific LLM: 93–98% accuracy, including across the HAP-E and COCA-based CAP corpora.
  - 7-way: 66% (chance about 14%). 4.2% of LLM texts were classified as human; 9.8% of human texts as LLM.
  - Generalization to M4 arXiv abstracts generated by GPT-3.5 dropped sharply; classifiers trained on Llama base outputs reached only 50%.
  - [Reinhart et al. 2025](https://arxiv.org/abs/2410.16107) [V]
- Word overuse:
  - GPT-4o: camaraderie 162×, tapestry 155×, intricate 119×, underscore 107×, amidst 100×, palpable 95×.
  - The authors frame this as **genre misalignment**: such words are unremarkable in fiction but unconventional in news and academic text. LLMs "do not vary their style with context" as humans do.
  - [Reinhart et al. 2025](https://arxiv.org/abs/2410.16107) [V]

**Other register and genre evidence**
- Muñoz-Ortiz, Gómez-Rodríguez & Vilares (Artificial Intelligence Review 57:265, 2024; arXiv 2308.09067), on news text:
  - "Human texts exhibit more scattered sentence length distributions, more variety of vocabulary."
  - LLM text uses more numbers, symbols, auxiliaries and pronouns, and shows less negative emotion.
  - Human–LLM differences exceed differences among LLMs.
  - [Muñoz-Ortiz et al.](https://arxiv.org/abs/2308.09067) [V]
- Russell, Karpinska & Iyyer (ACL 2025): on 300 non-fiction articles, the majority vote of five annotators who frequently use LLMs misclassified only 1 of 300.
  - They stayed robust to paraphrasing and "humanization."
  - They relied mostly on "AI vocabulary," plus formality, originality and clarity.
  - [Russell et al. 2025](https://aclanthology.org/2025.acl-long.267/) [V]
- Meng et al., "Large Language Models as 'Hidden Persuaders': Fake Product Reviews are Indistinguishable to Humans and Machines" (arXiv 2506.13313, 2025-06-16):
  - Humans averaged "50.8% accuracy overall."
  - LLMs did as poorly or worse.
  - Humans show a scepticism bias toward positive reviews.
  - [Meng et al. 2025](https://arxiv.org/abs/2506.13313) [V]
- Ghosh, "Machine Generated Product Advertisements: Benchmarking LLMs Against Human Performance" (arXiv 2412.19610, 2024-12-27):
  - 100 products; Gemma 2B, LLaMA, GPT-2 and ChatGPT 4 compared with human descriptions on sentiment, readability, persuasiveness, SEO, clarity, emotional appeal and CTA.
  - "ChatGPT 4 performs the best." The abstract gives no numeric human-vs-AI gaps.
  - [Ghosh 2024](https://arxiv.org/abs/2412.19610) [V]
- Wikipedia "Promotional and advertisement-like language":
  - Words to watch include "boasts a," "vibrant," "rich," "profound," "enhancing," "showcasing," "exemplifies," "commitment to," "nestled," "in the heart of," "groundbreaking," "renowned," "featuring" and "diverse array."
  - It warns: "Not all promotional or spammy writing is AI-generated."
  - Older LLMs (GPT-4) were more blatantly positive; newer ones are "more subtly positive and tend to avoid obviously superlative statements like 'the best.'"
  - [Wikipedia: Signs of AI writing, rev. 1380884756, 2026-10-18](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) [V]
- Rettberg, "Genre glitches and unexpected promotional phrases as a sign of AI writing" (2026-05-13):
  - Defines a "genre glitch" as text that "suddenly switches genre."
  - Examples: ad-like food copy inside an NYT inflation story, and travel-marketing phrasing in a federal court filing.
  - The post addresses only non-promotional genres.
  - [Rettberg 2026](https://jilltxt.net/genre-glitches-and-unexpected-promotional-phrases-as-a-sign-of-ai-writing/) [V]
- Sussman & Carter (WWW '25 Companion; arXiv 2504.19556): positive tweets about Trump rose from 28.6% (2020) to 45.9% (2024), and neutral fell from 54.8% to 39.8%. The text was not directly labeled as AI. [Sussman & Carter 2025](https://arxiv.org/abs/2504.19556) [V]
- Ahrefs (May 2025) ran its own detector on 900,000 English pages first seen in April 2025:
  - 74.2% contained some AI content: 2.5% "pure AI," 71.7% mixed.
  - 25.8% were "pure human."
  - This is a vendor detector with no independent validation. [Ahrefs](https://ahrefs.com/blog/what-percentage-of-new-content-is-ai-generated/) [S]

### Inferences
- Press releases are the closest validated register to landing pages, and they show the highest population-level LLM share measured anywhere (~24%). Young and small firms adopt most (job postings from firms founded after 2015: 14.1%).
  - The scanner's core audience is startup and vibe-coded pages, so it faces a **high base rate**. Precision of strong signals will be high there, but so will the share of "AI-influenced human" copy.
- Reinhart's "genre misalignment" framing is the key calibration principle. What discriminates is register that is **foreign to landing pages**, not promotional vocabulary, which is native to them. Foreign registers include:
  - essay register: ", ensuring …" participial tails, nominalization stacks, "In today's fast-paced world"
  - chat register: emoji bullets, leaked markdown, "Certainly!"
  - Promotional adjectives should get low weight unless the weights are derived against a human *marketing* baseline (see Q3).
- Grammatical features from Reinhart (participial clauses d = 1.38, nominalizations d = 1.23) carry the largest published effect sizes. They were measured on ~500-word prose chunks and work best as a multi-feature classifier. Single-feature thresholds on a 300-word page will be far weaker.
- Fake-review text is indistinguishable from real reviews (50.8%). Synthetic testimonials (#202) should be detected structurally, not from testimonial prose.

### Gaps
- No corpus or study compares human landing pages with LLM- or AI-builder-generated landing pages, and no effect sizes exist for marketing-copy features.
- The Graphite 2025 study (reported in search as "52% of new articles AI-generated as of May 2025") was not opened, and no primary URL was retrieved.
- The SSRN paper by Tanvir Ahmed comparing GPT-4o and human ad copy (120 pairs) surfaced in search but was not opened.
- The Ghosh 2024 per-metric numbers are not in the abstract.

## 3. How fast do lexical tells drift (delve, em dash, model families), and what principled method and baseline corpus should periodically re-derive weights?

### Takeaway
The two most famous tells inverted within about 12–18 months.
- **"Delve"** fell sharply after publicity in early 2024 and appeared in only 1 in 1,000 GPT-4o chats by July 2025.
- **The em dash** went from under 10% to over 50% of GPT-4o responses (mid-2024 → summer 2025). GPT-5.1 (Nov 2025) began honoring "no em dash" instructions. By July 2026 an Economist study found ChatGPT used "markedly fewer" em dashes than any other writer, and only Claude used more than humans.
- Human-written public text is drifting toward AI style at the same time: em-dash prevalence is rising in congressional press releases and medRxiv preprints.

Weights therefore need periodic re-derivation, tagged by model family, against a pre-ChatGPT human baseline from the *same register*. Fightin' Words log-odds with an informative Dirichlet prior suits this. Kobak-style δ/r excess monitoring can track the drift of the human baseline.

### Cited Findings
**"Delve" and vocabulary decay**
- Geng & Trotta, "Human-LLM Coevolution: Evidence from Academic Writing" (Findings of ACL 2025; arXiv 2502.09606, 2025-02-13):
  - The frequency of "delve" in arXiv abstracts "dropped markedly" soon after the word was publicized in early 2024.
  - LLM-favored words such as "significant" kept rising.
  - The authors attribute this to writers adapting, by selecting or editing LLM output. They say this coevolution makes detection harder, while word-frequency analysis remains viable for population estimates.
  - [Geng & Trotta 2025](https://arxiv.org/abs/2502.09606) [V, abstract only; the PDF text could not be extracted]
- Juzek & Ward, "Why Does ChatGPT 'Delve' So Much?" (COLING 2025; arXiv 2412.11385, 2024-12-16): identifies 21 focal words (e.g., delve, intricate, underscore). It finds no evidence that architecture, algorithms or training data cause the overuse; RLHF is "plausibly involved." [Juzek & Ward 2025](https://arxiv.org/abs/2412.11385) [V]
- The Washington Post's ChatGPT style analysis (2025-11-13; read via the Boston Globe republication):
  - Data: 328,744 gpt-4o messages of at least 10 words, from 37,929 publicly shared conversations (May 2024–July 2025). The Post discloses a content partnership with OpenAI.
  - "Delve" occurred in "only 1 in 1,000 chats" in July 2025.
  - ChatGPT "curbed" ensure, various, crucial, significant and approach. It uses "core" five times more than a year earlier, and "modern" appeared in more than 8% of messages in July 2025.
  - Contractions rose: "you're" or "it's" appear in almost a third of chats.
  - "Not just X, but Y" appeared in 6% of chats in July 2025.
  - Emojis: 70% of messages contained at least one by July 2025. ✅ was used 11× more than by humans, and 🧠 and 🔹 10× more. At least a quarter of 2025 messages contained 🧠 or ✅.
  - Em dash: "A year ago, fewer than 1 in 10 ChatGPT responses used an em dash … by summer, more than half of its responses included an em dash."
  - [Boston Globe / Washington Post, 2025-11-13](https://www.bostonglobe.com/2025/11/13/business/chatgpt-writing-style-clues/) [V]. The [original WaPo page](https://www.washingtonpost.com/technology/interactive/2025/how-detect-chatgpt-em-dash/) returned 403.
- Wikipedia's dated "AI vocabulary" eras (the page says these are "not hard cutoffs"):
  - 2023–mid-2024 (GPT-4): Additionally, boasts, bolstered, crucial, delve, emphasizing, enduring, garner, intricate, interplay, key, landscape, meticulously, pivotal, underscore, tapestry, testament, valuable, vibrant.
  - Mid-2024–mid-2025 (GPT-4o): align with, bolstered, crucial, emphasizing, enhance, enduring, fostering, highlighting, pivotal, showcasing, underscore, vibrant.
  - Mid-2025–mid-2026 (GPT-5): emphasizing, enhance, highlighting, showcasing.
  - Mid-2026 on (GPT-6): challenge, clearer, dependable, echoed, foster, leverage, matters, multifaceted, practical, prioritize, quietly, steady, universally, with "much more period and comma usage and shorter sentences around a strict 8–20 word limit."
  - "delve" "dropped off sharply in 2025."
  - Grok overuses "causal," "empirical" and "correlate," and still overuses "underscore" as of 2026.
  - The page's own guidance: "a word being overused by AI does *not* imply that its synonyms are also overused."
  - An editor comment requires that each word's overuse be "corroborated by at least one reliable, non-pop-science external source."
  - **Sourcing caveat:** the GPT-6 list is sourced to a product-review blog (intellectualead.com, 2026-09-10), which is weak.
  - [Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) [V, raw wikitext]

**Em dash trajectory**
- OpenAI default behaviour: Ars Technica (Benj Edwards, 2025-11-14) quotes Sam Altman, two days after the GPT-5.1 release: "Small-but-happy win: If you tell ChatGPT not to use em-dashes in your custom instructions, it finally does what it's supposed to do!" This was a change in instruction-following, not in the default. [Ars Technica](https://arstechnica.com/ai/2025/11/forget-agi-sam-altman-celebrates-chatgpt-finally-following-em-dash-formatting-rules/) [V]
- The Economist, "How to spot AI writing" (2026-07-30):
  - ChatGPT, Claude, Gemini and Grok wrote versions of Economist articles; the corpus was 55,940 sentences and 1.2m words.
  - "Today only Claude uses more em-dashes than human writers." ChatGPT uses "markedly fewer than any other writer in our study."
  - LLMs "use fewer commas and semicolons than humans" and hardly any parentheses, and "and" is their most overused word.
  - Read via [Daring Fireball quote, 2026-08-11](https://daringfireball.net/linked/2026/08/11/) and Wikipedia's citation. The original is paywalled at [economist.com](https://www.economist.com/culture/2026/07/30/how-to-spot-ai-writing). [S]
- Wikipedia (em-dash section titled "2022–September 2026"):
  - "AI-generated em dashes are usually surrounded by spaces."
  - The sign "is most useful when taken in combination with other indicators."
  - A claim that models from September 2026 are "hard coded to not use em dashes at all," making heavy comma and period use its own sign, is tagged {{citation needed}} (Oct 2026).
  - [Wikipedia](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) [V]
- **Human baseline drifting:** Czuma, "The em-dash em-beds in Congress" (arXiv 2608.05889, 2026-08-06):
  - 146,239 press releases from 480 offices.
  - Unspaced prose em-dashes were 0.10–0.12 per 1,000 characters in 2021–2024 and 0.217 in 2025.
  - The share of releases containing one rose from about 13% to 24.8%.
  - Frequency ratio 1.55 (95% CI 1.28–1.93); hyphen density was stable.
  - "The em-dash remains a population-level marker, not a per-release authorship detector."
  - The preregistered validation gate was breached, so the result is exploratory.
  - The paper counts *unspaced* dashes because AP style uses spaced dashes. That conflicts with Wikipedia's "usually surrounded by spaces."
  - [Czuma 2026a](https://arxiv.org/abs/2608.05889) [V]
- Czuma, "Em-ergence of the em-dash" (arXiv 2606.29540, 2026-06-28):
  - 69,632 medRxiv preprints; em-dash prevalence in Discussion sections rose from 4.23% to 11.58% (+7.35 pp; OR 2.96).
  - By year: about 4% through 2023, 8.0% in 2024, 20.3% in 2025.
  - The author calls it "a population-level indicator, not a per-paper detector."
  - [Czuma 2026b](https://arxiv.org/abs/2606.29540) [V]

**Model-family differences**
- Sun et al.: ChatGPT uses "certainly," "overall" and "such as" and bolds lists with headers; Claude uses "according to" and "based on" with little bold; Gemini uses italics. [Sun et al. 2025](https://arxiv.org/abs/2502.12150) [V]
- Reinhart et al.: GPT-4o and Llama-instruct deviate in *opposite* directions on clausal coordination and downtoners. [Reinhart et al.](https://arxiv.org/abs/2410.16107) [V]
- Antislop: fingerprints cluster within families across 67 models. [Paech et al.](https://arxiv.org/abs/2510.15061) [V]

**Re-derivation methods**
- Kobak, González-Márquez, Horvát & Lause, "Delving into LLM-assisted writing in biomedical publications through excess vocabulary" (Science Advances 11(27), 2025-07-02; arXiv 2406.07016):
  - Counterfactual frequency q = p₋₂ + 2·max(p₋₂ − p₋₃, 0), extrapolated from 2021–2022 and deliberately excluding 2023.
  - Measures: gap δ = p − q, which highlights frequent words, and ratio r = p/q, which highlights rare words.
  - A word counts as excess if δ > 0.01 or log r exceeds a frequency-scaled threshold. The analysis covers words with frequency above 10⁻⁴ (26.7K words).
  - 2024 had 454 excess words, versus a 2021 COVID peak of 190. 379 were style words: 66% verbs, 14% adjectives.
  - Rare words: delves r = 28.0, underscores 13.8, showcasing 10.7. Common words: potential δ = 0.052, findings 0.041, crucial 0.037.
  - Lower bound: at least 13.5% of 2024 abstracts (up to 40% in some subcorpora).
  - [Kobak et al. 2025](https://arxiv.org/abs/2406.07016) [V]
- Monroe, Colaresi & Quinn, "Fightin' Words: Lexical Feature Selection and Evaluation for Identifying the Content of Political Conflict" (Political Analysis 16(4):372–403, 2008; DOI 10.1093/pan/mpn018):
  - The abstract emphasizes "Bayesian shrinkage and regularization." [Cambridge Core](https://www.cambridge.org/core/journals/political-analysis/article/fightin-words-lexical-feature-selection-and-evaluation-for-identifying-the-content-of-political-conflict/81B3703230D21620B81EB6E2266C7A66) [V]
  - The tidylo implementation describes "posterior log odds ratios, assuming a multinomial model with a Dirichlet prior." The weighted values "are also z-scores for the log odds"; they account for sampling error, so terms seen few times get less certainty. The default prior is empirical Bayes, "estimated from the data itself," and an uninformative prior is also available. [tidylo vignette](https://archive.linux.duke.edu/cran/web/packages/tidylo/vignettes/tidylo.html) [V]
- Baseline choices in the literature:
  - Liang 2025 fits on 2021 data (2019 for UN). [Liang et al. 2025](https://arxiv.org/abs/2502.09747) [V]
  - Kobak extrapolates from 2021–2022. [Kobak et al.](https://arxiv.org/abs/2406.07016) [V]
  - Czuma uses 2021–2022. [Czuma 2026a](https://arxiv.org/abs/2608.05889) [V]
  - Wikipedia: "ChatGPT launched publicly on November 30, 2022," and text added before then "can be ruled out as AI-generated." [Wikipedia](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) [V]

**Goodhart pressure on published tells**
- "Humanizer" (blader/humanizer; MIT; 58.3k stars) is an agent skill built on Wikipedia's Signs of AI writing guide. It rewrites text to remove 26 patterns, including "Not X but Y," "Forced triads," "Dashes as the universal connector," "Overused AI words" and "Chatbot residue." [blader/humanizer](https://github.com/blader/humanizer) [V]
- Wikipedia itself warns: "Please do not merely treat these signs as the problems to be fixed; that could just make detection harder." [Wikipedia](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) [V]

### Inferences
- **Observed half-life:** publicized stylistic tells lose most of their value in about 12–18 months. Three forces drive this: vendors patch them (em dash), users avoid them (delve), and tooling scrubs them (Humanizer). Each word or pattern weight should carry an "era/family" tag, and weights should be refreshed at least every 6 months (each `DEFINITIONS_VERSION`).
- **Suggested re-derivation pipeline** (my design; not validated in any source):
  - **H:** human landing pages captured before 2022-11-30 (Common Crawl or Wayback snapshots). Prefer ≤2021, because GPT-3 copywriting tools predate ChatGPT (unverified; see Gaps).
  - **A:** 2025–2026 pages from AI builders, optionally split by model family (A_k) by prompting each family with identical briefs.
  - **Background prior:** a large general English frequency list (e.g., wordfreq, as Antislop uses).
  - Compute Fightin' Words z-scores per unigram, bigram and trigram. Keep terms with z ≥ 3 (starting point) that occur on at least 3 independent sites, mirroring Antislop's "≥3 independent prompts."
  - Use clipped log-odds as weights.
  - Run Kobak δ/r year-over-year on fresh *human* marketing pages to detect baseline drift.
  - Publish model-family sub-lists.
- Because human writing is converging on AI style (coevolution; em dashes rising in Congress and medRxiv), thresholds should be re-set against a target false-positive rate on a **recent** human sample, not only the 2022 baseline. Otherwise false positives on human pages rise every year.
- Em dash: the shipped `em_dash_overload` threshold is ≥7 per 1,000 words, or ≥8 total. Czuma's 2025 congressional average of 0.217 per 1,000 characters is roughly 1.3 per 1,000 words (assuming ~6 characters per word; my arithmetic). The shipped threshold is about 5× that population average, which is reasonable. The signal is now mostly diagnostic of Claude and of 2025-era GPT-4o, not of current ChatGPT.

### Gaps
- No 2025–2026 data on drift in Kimi, DeepSeek or Gemini vocabulary in marketing register. DeepSeek is covered only through its citation artifacts (Q5).
- EQ-Bench per-model slop scores were not retrieved.
- The Economist's methodology could not be read; only the quoted findings were.
- Wikipedia's GPT-6 vocabulary and the September 2026 "hard-coded no em dash" claim are weakly sourced or uncited.
- **Not verified (search budget exhausted):** the launch dates of GPT-3-based copywriting tools (Copy.ai, Jasper/Jarvis) before ChatGPT. If they predate 2022, landing-page baselines from 2021–2022 may already be contaminated.

## 4. What are the documented false-positive, fairness and short-text risks, and how should a deterministic copy scorer communicate uncertainty?

### Takeaway
The documented risks fall into four groups:
- **Non-native writers.** The canonical fairness result (Liang et al. 2023) shows that low-perplexity, lexically simple writing by non-native writers triggers false positives (61.22% average false-positive rate on TOEFL essays).
- **Homogenized human writing.** AI assistance homogenizes non-Western writers toward Western style (Agarwal et al. CHI 2025), so legitimately AI-assisted human copy will match AI fingerprints.
- **Fragile detectors.** Detectors break under trivial attacks (RAID).
- **Short text.** Short texts raise false positives; Turnitin raised its minimum from 150 to 300 words.

A deterministic scorer should:
- gate statistical patterns on text length and language
- tier patterns by confidence (definitive artifacts vs. stylistic tendencies)
- show evidence spans
- never claim authorship

### Cited Findings
**Non-native writers**
- Liang, Yuksekgonul, Mao, Wu & Zou, "GPT detectors are biased against non-native English writers" (Patterns 2023; arXiv 2304.02819):
  - Seven detectors; 91 TOEFL essays vs 88 US 8th-grade essays.
  - Average false-positive rate on TOEFL essays was 61.22%. 19.78% (18/91) were flagged by all seven detectors, and 97.80% (89/91) by at least one. The US essays averaged 5.19%.
  - Prompting the TOEFL essays to "enhance word choices" cut the false-positive rate to 11.77%. Prompting the US essays to "simplify word choices" raised it to 56.65%.
  - Flagged essays had significantly lower perplexity. The authors advise against using detectors in "evaluative or educational settings."
  - [Liang et al. 2023](https://arxiv.org/abs/2304.02819) [V]
- Counter-evidence claimed by detector vendors:
  - Binoculars reports 99.67% accuracy on both original and grammar-corrected EssayForum ESL essays, with closely overlapping score distributions. [Hans et al. 2024](https://arxiv.org/abs/2401.12070) [V]
  - Pangram's technical report claims it "is not biased against nonnative English speakers," but the abstract gives no figures. [Emi & Spero 2024](https://arxiv.org/abs/2402.14873) [V]
  - Turnitin reports the L1/L2 difference in false-positive rate as "small, and not statistically significant" for documents of at least 300 words. [Turnitin blog](https://www.turnitin.ca/blog/new-research-turnitin-s-ai-detector-shows-no-statistically-significant-bias-against-english-language-learners) [S]

**AI assistance homogenizes human writing**
- Agarwal, Naaman & Vashistha, "AI Suggestions Homogenize Writing Toward Western Styles and Diminish Cultural Nuances" (CHI 2025; arXiv 2409.11360):
  - 118 participants (60 Indian, 58 American) and 472 essays, with GPT-4o suggestions. 12,015 suggestions were shown and 12.3% accepted.
  - Acceptance rate: Indians 25% vs Americans 19% (p < 0.001).
  - Indian–American essay similarity rose from 0.48 to 0.54 with AI (d = −0.44).
  - A nationality classifier's accuracy fell from 90.6% to 83.5% (email task: 82.9% to 60%).
  - The type-token-ratio gap between groups (d = −0.41 without AI) disappeared with AI.
  - The first food suggestion was always pizza or sushi; the first festival suggestion was always Christmas.
  - [Agarwal et al. 2025](https://arxiv.org/abs/2409.11360) [V]
- Padmakumar & He, "Does Writing with Language Models Reduce Content Diversity?" (ICLR 2024; arXiv 2309.05196): writing with InstructGPT, but not GPT-3, produced a statistically significant reduction in diversity, driven by model-contributed text. This was measured as cross-author homogenization. [Padmakumar & He 2024](https://arxiv.org/abs/2309.05196) [V]

**Robustness and adversarial attacks**
- Dugan et al., RAID (ACL 2024; arXiv 2405.07940):
  - More than 6 million generations, 11 models, 8 domains, 11 attacks, 4 decoding strategies.
  - Accuracy at 5% false-positive rate without attack: Originality 85.0, Binoculars 79.6, RADAR 70.9, GPTZero 66.5, GLTR 62.6.
  - Homoglyph attack: Originality fell to 9.3 and Binoculars to 37.7. Synonym swap: Binoculars fell to 43.5.
  - A repetition penalty "decreases accuracy by up to 32 points." Changing generator, decoding or repetition penalty can introduce "up to 95+% error rate."
  - [Dugan et al. 2024](https://arxiv.org/abs/2405.07940) [V]
- Memorized text: in Binoculars, the US Constitution scored 0.7600 (machine side; threshold 0.901), and 3 of 11 famous human texts landed on the machine side. [Hans et al. 2024](https://arxiv.org/abs/2401.12070) [V]

**Short text and position effects**
- Turnitin (Annie Chechitelli, 2023-05-23):
  - The minimum was raised "from 150 to 300 words … our accuracy increases with a little more text."
  - "a higher incidence of false positives in the first few or last few sentences of a document."
  - Document-level false-positive rate is under 1% only "for documents with over 20% of AI writing," based on an 800,000-document pre-GPT test. Sentence-level false-positive rate is about 4%.
  - [Turnitin blog](https://www.turnitin.com/blog/ai-writing-detection-update-from-turnitins-chief-product-officer) [V via curl]
- Other short-text evidence, from search summaries only:
  - DetectRL: zero-shot detectors improve as test texts get longer.
  - MGTBench: about 200 words usually enough for near-best F1.
  - M4: shortening from 1,000 to 125 characters cut accuracy by 4.5 points.
  - [DetectRL](https://arxiv.org/abs/2410.23746), [MGTBench](https://arxiv.org/abs/2303.14822), [M4](https://arxiv.org/abs/2305.14902) [S]
  - The JAIR 2025 survey by Fraser, Dawkins & Kiritchenko does not state length thresholds in its abstract. [Fraser et al.](https://arxiv.org/abs/2406.15583) [V]

**Human agreement ceiling**
- Expert binary slop κ ranged from −0.12 to 0.11, and LLM judges reached κ = 0.01. [Shaib et al. 2025](https://arxiv.org/abs/2509.19163) [V]

**Practitioner caveats**
- Wikipedia:
  - "Not all text featuring these indicators is AI-generated."
  - The list is "descriptive, not prescriptive."
  - It lists ineffective indicators: perfect grammar, "bland" or "robotic" prose, "fancy" formal prose ("Only specific words are overused"), transition words alone ("Additionally," "Notably"), unsourced content, and bizarre or correct wikitext.
  - [Wikipedia](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) [V]
- A Vale lint ruleset built from the Wikipedia page (Christian Miles, 2025-12-08) uses three tiers:
  - **Error:** "Definite AI artifacts – chatbot phrases, technical glitches, placeholders, tracking URLs."
  - **Warning:** "Likely AI patterns – hedging clusters, knowledge cutoff references, enumeration style."
  - **Suggestion:** "Suspicious but common in human writing – vocabulary, transitions, passive voice."
  - Stray-Markdown detection was dropped because Vale cannot restrict matches to non-Markdown contexts.
  - [ammil industries](https://ammil.industries/signs-of-ai-writing-a-vale-ruleset/) [V]
- The Binoculars README: "We also strongly caution against using Binoculars (or any detector) without human supervision." It also says the tool is more proficient in English. [ahans30/Binoculars](https://github.com/ahans30/Binoculars) [V]
- Liang 2025 does not cover non-English text. [Liang et al. 2025](https://arxiv.org/abs/2502.09747) [V]

### Inferences
- **Do not use lexical-diversity or "simplicity" features** (type-token ratio, hapax ratio, low readability-grade penalties) as slop signals. They reproduce the perplexity mechanism that falsely flags non-native writers (Liang 2023). The Agarwal result also shows that AI assistance erases the type-token-ratio gap, so such features would penalize non-native founders who legitimately use AI help.
- **Uncertainty UX (suggested):**
  1. Extract "main-content prose": `p`/`li`/`blockquote` blocks of at least 8 words, excluding nav, footer, cookie, legal and privacy text. Legal and boilerplate text behaves like memorized text, as the Binoculars Constitution result shows.
  2. Statistical and density patterns (buzzword, em-dash, rule-of-three, #200 stylometry) run fully at ≥300 words of prose, run at low confidence or half weight at 150–299, and return "insufficient text" below 150.
  3. Artifact patterns (Q5) are exempt from length gating.
  4. Use an English gate (`<html lang>` plus an English function-word share). Non-English pages run artifact patterns only.
  5. Assign a confidence tier to every pattern, mirroring Vale (definitive / likely / stylistic), and show it in the UI.
  6. Down-weight the hero and footer, following Turnitin's finding of more false positives in the first and last sentences.
  7. Publish per-pattern false-positive rates measured on a held-out human landing-page set.
- **Framing:** report "matches N AI-slop fingerprint patterns," never "written by AI." Every population-level study cited here (Kobak, Liang, Czuma ×2) explicitly disclaims per-document attribution.

### Gaps
- No study measures false-positive rates of deterministic stylometric rules on marketing copy or landing pages.
- No fairness study covers landing pages or startup copy by non-native founders.
- The Turnitin L1/L2 study and the ETS GRE fairness study were not opened; ETS is [S] via [ets.org transcript](https://www.ets.org/aera-ncme-conference/transcript/yang-jiang.html).
- Binoculars' accuracy-by-length values are only in a figure.

## 5. Which deterministic "copy-paste artifact" tells are near-zero-false-positive on public web pages, with in-the-wild evidence and exact matching rules?

### Takeaway
Wikipedia's "Signs of AI writing" (rev. 1380884756, last edited 2026-10-18) documents a family of chatbot **markup leaks** with exact strings and first-seen dates, and calls them "an unambiguous indicator that the text originated with AI." It also documents AI-referral UTM parameters, conversation residue and placeholders. One confirmed high-profile web instance exists: "oaicite" in the White House MAHA report's citation URLs (May 2025). Amazon listings with ChatGPT refusal text (Jan 2024) are documented only in secondary sources.

These artifacts work at any text length and in any language. They are robust to stylistic drift because they come from careless pasting, not style. Their main false-positive source is pages that *discuss* the artifacts, which can be excluded with DOM context: code, pre and quote elements, and href-only matching for UTMs.

### Cited Findings
**Markup leaks (Wikipedia, "Internal formatting and reference markup bugs", WP:OAICITE)**
All exact strings in this table were read from the raw wikitext. Wikipedia's framing: "LLM output sometimes exposes its internal formatting metadata, which is an unambiguous indicator that the text originated with AI." [Wikipedia](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) [V]

| Source | Exact strings | Dates and notes |
|---|---|---|
| ChatGPT | `:contentReference[oaicite:0]{index=0}`; `oai_citation` and `[oai_citation:0‡IMDb](https://…?utm_source=chatgpt.com)` | |
| ChatGPT | `citeturn0search0` "(surrounded by Unicode points in the Private Use Area)", with the number "increasing as the text progresses"; also `turn0image0`, `iturn0image0turn0image1…`, `citeturn0news0`, `citeturn1file0`, and rarely `<ref name="0search12">` | **First observed February 2025** |
| ChatGPT | JSON `({"attribution":{"attributableIndex":"1009-1"}})`, including a curly-quote variant in a French example | |
| ChatGPT | Source-chip residue: `Example+1`, `Wikipedia+1`, `IT Governance+3ISO+3ISO+3` | Example dated Nov 2025 |
| Gemini | `[cite: 1]`, `[cite: 3, 12, 13]`, `[span_1](start_span)`, `[span_1](end_span)` | |
| Grok | `<grok-card data-id="e8ff4f" data-type="citation_card">` and `[](grok_render_citation_card_json={"cardIds":["3bb883"]})` | |
| DeepSeek | Lenticular brackets with dagger, e.g., `【85†L261-269】`, `【29†L582-L589】`, `【854140639155648†L119-L123】` | "As of June 2025"; specific to DeepSeek and its derivatives |
| Perplexity | `[attached_file:1]`, `[web:1]`, and `ppl-ai-file-upload` in Amazon S3 URLs | "As of fall 2025" |
| Unclassified | `:::writing{variant="document" id="68427"}` (random 5-digit id), often with closing `:::`; also localized, e.g., `:::écriture{variante="document" id="28471"}` | "As of June 1, 2026" |

**AI-referral UTM parameters (Wikipedia "utm_source=")**
- "ChatGPT may add the UTM parameters `utm_source=openai` or `utm_source=chatgpt.com` … Microsoft Copilot may add `utm_source=copilot.com` … Grok uses `referrer=grok.com`. Other LLMs, such as Gemini or Claude, use UTM parameters less often."
- "While this near-definitively proves ChatGPT's involvement, … it doesn't prove, on its own, that ChatGPT also generated the writing."
- Exception noted: "Google has occasionally indexed URLs containing this parameter."
- [Wikipedia](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) [V]
- OpenAI's Publishers FAQ (search snippet): "ChatGPT automatically includes the UTM parameter utm_source=chatgpt.com in referral URLs." [OpenAI Help](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq) [S; direct fetch returned 403]

**Conversation residue**
- Collaborative communication. Words to watch: "I hope this helps," "Of course!," "Certainly!," "You're absolutely right!," "Would you like...," "is there anything else," "let me know," "more detailed breakdown," "here is a." [Wikipedia](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) [V]
- These are filed under "Historical indicators" ("much less frequent in newer models"):
  - Knowledge cutoffs (2022–2023): "Up to my last training update," "as of my last knowledge update."
  - Didactic disclaimers (Nov 2022–2024): "it's important/critical/crucial to note/remember/consider," "worth noting," "may vary."
  - Section summaries: "In summary," "In conclusion," "Overall."
  - Prompt refusal: "as an AI language model," "as a large language model," "I'm sorry." The page notes "Outright refusals have become increasingly rare."
  - [Wikipedia](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) [V]
- Placeholders (WP:AIPLACEHOLDER):
  - Bracketed fields: "[Your Name]," "[Describe the specific section or content…]," "[Article Title 1]," "[Your Email Address]," "[Join Date]," "(Add your channel URL here)."
  - Token placeholders: "INSERT_SOURCE_URL_30," "SOURCE_PUBLISHER," "PASTE_SPOTIFY_TRACK_URL_HERE."
  - Date placeholders: "2025-xx-xx," "2025-XX-XX," "2022-11-XX."
  - Caveat: non-LLM templates also contain blanks.
  - [Wikipedia](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) [V]
- Markdown (WP:AIMARKDOWN): `**bold**` asterisks, `##` headings, ```` ``` ```` fenced blocks, `---`/`***`/`___` thematic breaks, `[Example](example.com)` links. Caveat: "Markdown *alone* is not such a strong indicator"; faulty wikitext mixed with Markdown is strong evidence. [Wikipedia](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) [V]

**In-the-wild evidence**
- White House MAHA report: PolitiFact (2025-05-30), citing the Washington Post, reports that "some citations included 'oaicite' in their URLs." At least seven citations were problematic, four with titles of papers that don't exist. [PolitiFact](https://politifact.com/article/2025/may/30/MAHA-report-AI-fake-citations/) [V]
- Amazon (Jan 2024): new listings carried refusal text referencing OpenAI's use policy in product titles, reported by Futurism and relayed by MetaFilter and Digital Information World. [MetaFilter](https://metafilter.com/202136/I-cannot-post-this-link-it-goes-against-OpenAI-Use-Policy); [Digital Information World](https://www.digitalinformationworld.com/2024/01/new-product-listings-on-amazon-causes.html) [S]
- Scholarly papers: "As an AI language model" and "Regenerate response" appeared in "hundreds of papers across various fields," including top-quartile Scopus journals.
  - Strzelecki's study, "'As of my last knowledge update': How is content generated by ChatGPT infiltrating scientific papers published in premier journals?", Learned Publishing, 2024-12-24. [Univ. of Economics in Katowice news, 2025-04-25](https://www.ue.katowice.pl/en/university/news/article/nature-highlights-research-findings-of-our-scholar-prof-artur-strzelecki.html) [V]
  - The Wiley article returned 403. [Wiley](https://onlinelibrary.wiley.com/doi/full/10.1002/leap.1650) [S]
- Community signal: the HN thread "Wikipedia: Signs of AI Writing" (2025-07-27) drew 61 points and 17 comments. [HN item 44700558](https://news.ycombinator.com/item?id=44700558) [V via HN Algolia API]

### Inferences
Exact matching rules (suggested). Run them on **visible text nodes** and on **attribute values** (`href`, `src`, `srcset`, `data-*`). Exclude descendants of `code, pre, kbd, samp, textarea, script, style`. Treat a hit inside `blockquote`/`q` as a lower tier.
- **ChatGPT markup:**
  - `/contentReference\[oaicite:\d+\]\{index=\d+\}/`
  - `/\boaicite\b/` (this also catches URL-embedded cases like MAHA)
  - `/\boai_citation(?::\d+)?/`
  - `/\bcite(?:turn\d+(?:search|news|image|file)\d+)+/`
  - bare `/\bturn\d+(?:search|news|image|file)\d+\b/`
  - `/[{(]\s*["“]attribution["”]\s*:\s*\{\s*["“]attributableIndex["”]\s*:\s*["“]\d+-\d+["”]/`
  - Optional PUA characters (`[-]`) may sit between tokens. **Do not** flag PUA characters alone, because icon fonts use the PUA.
- **Gemini:** `/\[cite:\s*\d+(?:\s*,\s*\d+)*\]/`; `/\[span_\d+\]\((?:start|end)_span\)/`.
- **Grok:** DOM query for an element named `grok-card`, or text `/grok_render_citation_card_json/`.
- **DeepSeek:** `/【\d+†L\d+(?:-L?\d+)?】/u`.
- **Perplexity:** `/\[(?:attached_file|web):\d+\]/`; `/ppl-ai-file-upload/` in URLs.
- **Writing-canvas leak:** `/:::\s*\p{L}+\{\s*\p{L}+=["“]document["”]\s+id=["“]\d{4,6}["”]\s*\}/u`.
- **Source-chip residue** (`Wikipedia+1`): medium confidence only. Product names like "Google+1" exist, so require a chained form `/\+\d[A-Z]/` or at least 2 hits.
- **UTM:** parse each `a[href]` URL. Flag `utm_source ∈ {chatgpt.com, openai, copilot.com}` or `referrer=grok.com`. Match **hrefs only**, never prose, so SEO articles explaining ChatGPT referral tracking don't fire. Per Wikipedia, this proves AI-assisted *sourcing*, not AI *writing*, so give it a lower weight than markup leaks.
- **Residue** (sentence-anchored, high-specificity phrases only):
  - `/^\s*(?:Certainly|Of course|Absolutely|Sure)[!,]\s+(?:here(?:['’]s| is| are)|I(?:['’]d| would| can))/im`
  - `/\bI hope (?:this|that) helps\b/i`
  - `/\bAs an AI(?: language)? model\b|\bAs a large language model\b/i`
  - `/\b(?:as of|up to) my (?:last )?(?:knowledge|training) (?:update|cut-?off)\b/i`
  - `/\bWould you like me to\b/i`
  - `/\bI(?:['’]m| am) sorry, but I (?:can(?:no|['’])t|am unable to)\b/i`
  - `/\bI cannot fulfill (?:this|that) request\b/i`
  - `/\bYou['’]re absolutely right!/i`
  - Avoid generic "let me know" and "here is a," which carry high false-positive risk on contact sections.
  - **Main false-positive risk:** landing pages for AI chat products that show demo transcripts. Exclude containers whose role, aria-label or class indicates chat/message/bubble/transcript/demo, and require the hit to sit in `h1–h3` or prose outside such containers.
- **Placeholders:**
  - `/\[(?:Your|Insert|Add|Enter)\s[^\]\n]{1,40}\]/i`
  - `/\[(?:Company|Product|Brand|Business|Client|Customer|Founder|Startup) Name\]/i`
  - `/\((?:Add|Insert) [^)]{1,40} here\)/i`
  - `/\b(?:INSERT|PASTE)_[A-Z0-9_]+\b/`
  - `/\b20\d\d-[Xx]{2}-[Xx]{2}\b/`
  - Unrendered `/\{\{\s*[A-Za-z_][\w.]*\s*\}\}/` (after JS hydration)
  - False-positive risks: theme or template demo pages and docs about templating. Label the finding "unfinished copy," since placeholders are not exclusively AI.
- **Leaked markdown** (visible text only):
  - paired `**…**` or `__…__` around 1–80 non-newline characters
  - a text line starting `/^#{1,6}\s+\S/m` inside a non-heading element
  - `/\[[^\]\n]{1,80}\]\((?:https?:\/\/|www\.|\/)[^)\s]{1,200}\)/`
  - a standalone `---`/`***`/`___` text node
  - Trigger at ≥2 hits, or 1 hit of each of 2 kinds. Slop Detector has rendered-DOM context, which the Vale author lacked, so it can do what Vale could not.
- These artifacts are mostly **legacy or decaying** (refusals and knowledge cutoffs are 2022–2023 era) or **product-version-specific** (citation formats change). Keep a dated registry and add new formats as Wikipedia documents them, e.g., the `:::writing` leak first seen June 2026.

### Gaps
- No measurement exists of how often any of these artifacts appears on landing pages or vibe-coded sites.
- No verified evidence for `utm_source=perplexity` or Claude-specific UTMs; Wikipedia says Gemini and Claude use UTMs "less often."
- The exact Private Use Area code points around `citeturn…` are not given on the page.
- The Futurism Amazon article itself was not opened.

## 6. What do zero-shot detectors (Binoculars, Fast-DetectGPT, DetectGPT) and commercial technical reports imply for an optional, off-by-default model-based signal?

### Takeaway
Model-based detectors are stronger than any deterministic feature set on long English text, with 79.6–85.0% accuracy at 5% false-positive rate on RAID without attacks. They are still brittle under homoglyph and synonym attacks, decoding changes and newer models, and their authors caution against unsupervised use. They need multi-GB models (2×7B for Binoculars; 2.7B for Fast-DetectGPT; 0.4B for a DeBERTa classifier), which cannot run in the Cloudflare edge runtime. The product's default should stay feature-based. A local, CLI-only, opt-in plugin is defensible if its output is reported separately and never merged into the 0–100 score.

### Cited Findings
- **Binoculars** (Hans et al., ICML 2024; arXiv 2401.12070):
  - Detects "over 90% of generated samples from ChatGPT (and other LLMs)" at "a false positive rate of 0.01%," with no training data.
  - Uses Falcon-7B and Falcon-7B-Instruct; global threshold 0.901; 512-token default evaluation.
  - Reported 92% detection on GPT-3 and 89.57% on GPT-4 Open Orca samples at the global threshold. A separate March 2024 test reported only 41.86% accuracy on GPT-4 Open Orca samples; I did not reconcile the two.
  - Low recall in low-resource languages.
  - [Hans et al. 2024](https://arxiv.org/abs/2401.12070) [V]
  - Code is BSD-3-Clause. The README says "for academic purposes only and should not be considered as a consumer product" and "strongly caution[s] against using Binoculars (or any detector) without human supervision." [ahans30/Binoculars](https://github.com/ahans30/Binoculars) [V]
- **Fast-DetectGPT** (Bao et al., ICLR 2024; arXiv 2310.05130): uses conditional probability curvature; "surpasses DetectGPT by a relative around 75%," and "accelerates the detection process by a factor of 340." [Bao et al.](https://arxiv.org/abs/2310.05130) [V]
  - Repository: MIT license; the local demo defaults to gpt-neo-2.7B, with gpt-j-6B suggested for better accuracy; experiments ran on one 80 GB A100. [baoguangsheng/fast-detect-gpt](https://github.com/baoguangsheng/fast-detect-gpt) [V]
- **RAID:** see Q4 for numbers. Originality 85.0 drops to 9.3 under homoglyphs; Binoculars 79.6 drops to 37.7. [Dugan et al. 2024](https://arxiv.org/abs/2405.07940) [V]
- **Pangram** (Emi & Spero, arXiv 2402.14873, Feb 2024, v3 Jul 2024): commercial and closed. Claims "over 38 times lower error rates" than competitors and "hard negative mining with synthetic mirrors." [Pangram tech report](https://arxiv.org/abs/2402.14873) [V]
- **desklib/ai-text-detector-v1.01:** MIT license; fine-tuned `microsoft/deberta-v3-large`, 0.4B parameters (F32), English only, example `max_len=768`. The model card claims it "currently leads the RAID Benchmark." [Hugging Face](https://huggingface.co/desklib/ai-text-detector-v1.01) [V card; leaderboard claim NV, because the RAID leaderboard URL returned 404]
- **Linear probing** (Quaremba et al., arXiv 2608.24780, 2026-08-25): "simple linear probes outperform a wide range of detectors." Reports +11 AUC out of domain and near-peak performance with fewer than 100 training samples. Code at gerritq/mgt_probes. It still needs an LLM forward pass, and model size is not given in the abstract. [Quaremba et al. 2026](https://arxiv.org/abs/2608.24780) [V]
- **Humans vs detectors:** expert human annotators outperformed most commercial and open-source detectors. [Russell et al. 2025](https://aclanthology.org/2025.acl-long.267/) [V] LLM-as-judge slop labeling was at chance (κ ≈ 0). [Shaib et al. 2025](https://arxiv.org/abs/2509.19163) [V]

### Inferences
- At the 5% false-positive operating point RAID reports, a public scanner would wrongly flag about 1 in 20 human pages. Combined with documented bias, memorization and short-text problems, a model score should never feed the slop tier.
- **Plugin design (suggested):**
  - CLI and MCP only; never edge. A `--detector <module>` interface returns `{model, version, score, threshold, calibratedFPR}`.
  - English only, ≥300 words of prose, with boilerplate excluded.
  - Shown as a separate "model-based estimate (experimental)" panel with the README-style human-supervision caveat.
  - Off by default and never cached into public scan results.
- **Practical candidates:**
  - desklib DeBERTa (MIT, 0.4B) is the lightest permissively licensed option. Its leaderboard claim is unverified.
  - Fast-DetectGPT (MIT, 2.7B scoring model) is a training-free zero-shot alternative.
  - Binoculars (BSD-3 code, 2×7B) is the most accurate zero-shot option but too heavy for most users.
  - Commercial APIs (Pangram, GPTZero, Originality) would break the zero-LLM and privacy posture. Only allow them with a user-supplied key, if at all.

### Gaps
- The Falcon-7B and gpt-neo license terms were not checked in this session.
- The current RAID leaderboard standings could not be verified (the URL returned 404).
- No published evaluation of any detector on landing pages.
- Binoculars' per-length performance is only in a figure.

## 7. Roadmap implications

### Takeaway
The strongest new evidence supports two things:
- **Artifact-class patterns:** chatbot markup leaks, conversation residue, AI-referral UTMs, placeholders, leaked markdown. They are near-zero false-positive, length-independent and language-independent, and resistant to stylistic drift.
- **A calibration layer:** length and language gating, confidence tiers, a population-level framing, and periodic log-odds re-derivation against a marketing-register baseline.

Most shipped and filed *stylistic* patterns remain directionally supported but are decaying (em dash, delve, formulaic closers) and are being actively scrubbed by popular tooling (Humanizer, 58.3k stars).

### Cited Findings
- Markup leaks are "an unambiguous indicator." UTM parameters "near-definitively" prove ChatGPT involvement in sourcing. [Wikipedia](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) [V]
- In-the-wild oaicite in a government report. [PolitiFact](https://politifact.com/article/2025/may/30/MAHA-report-AI-fake-citations/) [V]
- Emoji, "not just X but Y" and em-dash rates for gpt-4o. [Boston Globe/WaPo](https://www.bostonglobe.com/2025/11/13/business/chatgpt-writing-style-clues/) [V]
- "It's not X, it's Y" at 6.3× human. [Paech et al.](https://arxiv.org/abs/2510.15061) [V]
- Turnitin's 300-word minimum and first/last-sentence false positives. [Turnitin](https://www.turnitin.com/blog/ai-writing-detection-update-from-turnitins-chief-product-officer) [V]
- Three-tier confidence precedent. [Vale ruleset](https://ammil.industries/signs-of-ai-writing-a-vale-ruleset/) [V]
- Population-level-only disclaimers. [Kobak](https://arxiv.org/abs/2406.07016), [Liang 2025](https://arxiv.org/abs/2502.09747), [Czuma 2026a](https://arxiv.org/abs/2608.05889) [V]
- Homoglyph attack efficacy. [RAID](https://arxiv.org/abs/2405.07940) [V]
- Shipped `unicode_artifacts` triggers on any U+200B/U+200C/U+200D/U+2060/U+FEFF (`zeroWidth >= 1`) or any U+202F (`narrowNbsp >= 1`). [packages/core/src/copyPatterns.ts](packages/core/src/copyPatterns.ts) [V, read in repo]

### Inferences

**Ranked NEW candidates (evidence strength × user value)**

| Rank | Label | Candidate | Evidence | User value |
|---|---|---|---|---|
| 1 | NEW | `chatbot_markup_leak` | Very strong | High |
| 2 | NEW | `chatbot_reply_residue` | Strong | High |
| 3 | NEW | Copy-axis gating + confidence tiers (infrastructure) | Strong | High |
| 4 | NEW | `ai_referral_utm_links` | Strong (sourcing, not writing) | Medium-high |
| 5 | NEW | `leaked_markdown` | Medium | High |
| 6 | NEW | `unfilled_placeholders` | Medium | High |
| 7 | NEW (extends shipped `emoji_bullet_headers`) | Emoji refresh | Medium | Medium |
| 8 | NEW (extends shipped `antithesis_construction`) | "It's not X, it's Y" / negation cascade | Medium | Medium |
| 9 | NEW | `mixed_script_homoglyph` | Weak (prevalence unknown) | Low-medium |
| 10 | NEW (research only) | Template/compression features | Weak | Low |

**1. NEW `chatbot_markup_leak`**
- Features: the regex families in Q5 (ChatGPT oaicite/contentReference/oai_citation/citeturn/turnNsearchN/attributableIndex; Gemini `[cite: N]`/`[span_N](start_span)`; Grok `grok-card`/`grok_render_citation_card_json`; DeepSeek `【N†Lx-y】`; Perplexity `[attached_file:N]`/`[web:N]`/`ppl-ai-file-upload`; `:::writing{variant="document" id="NNNNN"}`).
- Scope: visible text plus attribute values, excluding `code/pre/kbd/samp/textarea`.
- Threshold: 1 hit. Minimum length: none. Language: any.
- Suggested weight: 8–10, the "Error" tier. Include matched spans and a "remove the pasted citation markup" fix prompt.
- False-positive risk: pages that document these strings (Wikipedia mirrors, SEO and AI-writing blogs, Slop Detector's own docs and spec). Mitigate with code-element exclusion, plus a meta-discussion downgrade when ≥3 artifact families appear in prose alongside words like "artifact," "tell" or "sign."
- Durability: high, though formats rotate. Keep a dated registry.

**2. NEW `chatbot_reply_residue`**
- Features: the anchored phrase regexes in Q5 ("Certainly! Here's…", "I hope this helps", "As an AI language model", "as of my last knowledge update", "Would you like me to", "I'm sorry, but I can't", "I cannot fulfill this request", "You're absolutely right!").
- Threshold: 1 hit outside chat-demo containers.
- Weight: about 6, the "Error" tier for refusal and knowledge-cutoff phrases, "Warning" for "Would you like me to."
- Minimum length: none.
- False-positive risk: AI-assistant product pages with demo transcripts and testimonials quoting chat. Exclude role, aria or class `chat|message|bubble|transcript|conversation|demo`, and `blockquote/q`.
- Note that Wikipedia marks refusals and knowledge-cutoff phrases as historical (2022–2023). Prevalence is decaying, but precision stays high.

**3. NEW copy-axis gating and confidence tiers (infrastructure, not a pattern)**
- Main-content prose extraction excludes nav, footer, legal and cookie text.
- Word thresholds: <150 words returns "insufficient text" for statistical patterns; 150–299 is low confidence or half weight; ≥300 is full. Based on Turnitin's 300-word minimum and the ~500-word chunks behind Reinhart's effect sizes.
- English gate via `lang` plus function-word share; non-English pages get artifacts only.
- Confidence tier per pattern: Error = artifacts; Warning = residue, UTM, placeholders, markdown; Suggestion = stylistic.
- Per-pattern false-positive rates published from a held-out human landing-page set.
- High user value because it directly cuts false positives on short or legitimate human pages.

**4. NEW `ai_referral_utm_links`**
- Parse `a[href]` and flag `utm_source=chatgpt.com|openai|copilot.com` or `referrer=grok.com`. Do not match prose.
- Threshold: 1 link. Weight about 3–4 ("Warning"), labeled "links copied from an AI assistant."
- Per Wikipedia, this proves AI-assisted sourcing, not authorship.
- False-positive risk: rare Google-indexed URLs carrying the parameter.
- Minimum length: none.

**5. NEW `leaked_markdown`**
- Features: literal paired `**…**`/`__…__`, a line-initial `#{1,6} ` inside non-heading elements, `[text](url)` in visible text, and standalone `---` lines. Code elements excluded.
- Threshold: ≥2 hits, or 2 different kinds. Weight about 4–5.
- Evidence: Wikipedia's Markdown section; Sun et al.'s finding that markdown elements alone attribute chat models with 73.1% accuracy.
- False-positive risk: markdown-editor or dev-tool pages demonstrating syntax outside `<code>`. Downgrade when "Markdown" is mentioned ≥2 times.
- Minimum length: none.

**6. NEW `unfilled_placeholders`**
- Features: the bracket, token, date and `{{var}}` regexes in Q5.
- Threshold: 1 unambiguous hit, e.g., `[Your Company]` or `[Insert …]`, or 2 generic hits. Weight about 5. Label it "unfinished copy," since placeholders are not exclusively AI.
- False-positive risk: theme marketplace demos and templating docs.
- Minimum length: none.

**7. NEW (extends shipped `emoji_bullet_headers`)**
- Add 🧠 U+1F9E0, 🔹 U+1F539 (WaPo: 10× human) and 📌 U+1F4CC (Wikipedia example "#### 📌 Key facts") to the lead-emoji class. ✅ is already present (11× human).
- Add a page-level ratio: emoji-led headings or list items ≥30% of ≥6 items (starting point; calibrate).
- False-positive risk: playful consumer brands. Single-model evidence (gpt-4o, 2024–2025); likely to drift.

**8. NEW (extends shipped `antithesis_construction`)**
- The shipped regexes cover "not just," "isn't just," "not only … but also," "more than just" and "this is (not) about," but **not** the bare "It's not X, it's Y." That is the form Antislop measured at 6.3× human, and Wikipedia lists "It's not …, it's …" and "no …, no …, just …."
- Add:
  - `/\b(?:it|this|that)(?:['’]s| is) not\b[^.?!]{1,60}[,;—–]\s*(?:it|this|that)(?:['’]s| is)\b/i`
  - `/\bno\s+[^.!?\n]{1,30}[.,]\s*no\s+[^.!?\n]{1,30}[.,]\s*(?:just|only|simply)\b/i`
- Threshold: ≥2 per page. "No contracts. No fees. Just X." is classic human ad copy, so a single hit has high false-positive risk.

**9. NEW `mixed_script_homoglyph`** (evasion residue; lower rank)
- Flag tokens that mix `\p{Script=Latin}` with `\p{Script=Cyrillic}` or `\p{Script=Greek}` letters inside one word. Threshold ≥2 tokens. Exclude standalone symbols (μ, Δ, π, Ω, λ).
- Evidence: RAID shows homoglyphs are the most damaging detector attack (Originality 85.0 → 9.3).
- No prevalence data on landing pages, and Humanizer rewrites prose rather than inserting homoglyphs, so its value is uncertain.

**10. NEW (research only) site-level template and compression features**
- POS-template rate and gzip compression ratio computed across *all pages of a site*, i.e., the corpus level the metrics were validated at, compared against an AI-builder template inventory.
- Not for per-page scoring: Shaib 2025 found compression ratio and templatedness non-significant against human slop labels, and both are length-confounded.

**AMEND #200 (RLHF stylometry)**
- *Strengthens:*
  - Reinhart quantifies the participial-clause effect: instruction-tuned models 2–5×, GPT-4o 5.3× (d = 1.38), the largest effect among the reported grammatical features. Nominalizations: 1.5–2×, GPT-4o 2.1× (d = 1.23).
  - Muñoz-Ortiz finds "more scattered sentence length distributions" in human news text.
- *Weakens or qualifies:*
  - Effects are model- and version-specific: base models look human, Llama and GPT-4o deviate in opposite directions on clausal coordination and downtoners, and classifiers trained on 2024 models generalized poorly to GPT-3.5 text.
  - Reinhart did **not** report hedge multipliers. Wikipedia lists "didactic disclaimers"/hedges as *historical* (2022–2024) and transitions alone as *ineffective*, so drop or down-weight "hedge stacks."
  - Padmakumar & He measure **cross-author** homogenization, not within-document burstiness, so they do not directly support a per-page low-burstiness metric.
  - Sentence-length *mean* evidence conflicts: Economist 2026 says LLMs write longer sentences with fewer commas and semicolons, while Wikipedia's weakly sourced GPT-6 note says shorter 8–20-word sentences. Use dispersion (coefficient of variation) rather than mean, on paragraph prose with ≥15–20 sentences.
  - Shaib 2025's best syntax-only set reached only AUROC 0.64–0.68 against human slop labels.
- *Implementation:* participial clauses can be approximated deterministically with `/,\s+\w+ing\b/` after a clause, e.g., ", ensuring…", ", highlighting…", ", making it…". Nominalizations can be approximated with suffix rules (-tion/-ment/-ness/-ity/-ance/-ence). Validate both against a POS-tagged sample first.

**AMEND #201 (log-odds excess-vocabulary weights)**
- Kobak's list comes from biomedical abstracts: 379 style words, 66% verbs. Reinhart frames overuse as genre misalignment, and Antislop says lists are domain-specific. **Re-derive on marketing-register corpora**; do not import academic lists.
- Use Fightin' Words (Dirichlet-prior log-odds z-scores, as tidylo documents) for weights, and Kobak δ/r with a 2021–2022 counterfactual to monitor drift.
- Per-document word-list scoring is *not* what Kobak or Liang validated; they are explicitly population-level. Treat the per-page output as density evidence.
- Drift data for decay weights:
  - "delve" at 1/1,000 chats by July 2025.
  - ChatGPT curbed ensure, various, crucial, significant and approach; added "core" (5×) and "modern" (>8% of messages).
  - Wikipedia era lists for GPT-4o and GPT-5 (enhance, highlighting, showcasing, emphasizing).
  - Grok-specific words: causal, empirical, correlate, underscore.
- Do not expand lists via synonyms (Wikipedia: overuse "does *not* imply that its synonyms are also overused").
- Adopt Wikipedia's evidence bar: each term needs at least one reliable non-pop-science source or a corpus z-score.
- Expect Goodhart decay because published lists feed Humanizer-style scrubbers.

**AMEND #202 (synthetic testimonials and personas, risk-reversal triads, headline formulas)**
- Testimonial *prose* cannot be classified: humans scored 50.8% on LLM fake reviews, and LLMs did no better (Meng et al. 2025). Detection must rely on structural tells (persona-name lists, duplicated templates, missing company or role attribution, stock avatars).
- Liang 2025 shows young and small firms adopt most, which supports a higher prior for startup pages.
- No academic evidence was found for risk-reversal triads or SaaS headline formulas. They remain practitioner-only; ship them at the "Suggestion" tier.

**CAVEATs**
- **Population vs per-page:** Kobak, Liang and Czuma ×2 all disclaim per-document attribution. Brand the copy axis as "AI-slop fingerprint density," never "AI-written."
- **No stable ground truth:** expert slop κ is −0.12 to 0.11, and LLM judges are at κ ≈ 0. Show evidence spans; avoid a binary "slop" verdict for copy.
- **Genre:** promotional vocabulary is native to landing pages. Wikipedia's puffery tell and Rettberg's genre glitch are about genre *mismatch*. Without a human-marketing baseline, `buzzword_density` will systematically flag human marketing copy; "innovative," "comprehensive," "robust" and "dynamic" are in the shipped list.
- **Drift (shipped `em_dash_overload`):** the em dash is now diagnostic mainly of Claude and 2025-era GPT-4o, since current ChatGPT uses "markedly fewer than any other writer." Human em-dash use is rising (Congress 24.8% of releases in 2025; medRxiv 20.3%). Spacing is not a reliable discriminator: Wikipedia says AI dashes are usually spaced, while Czuma treats unspaced dashes as the signal in AP-style text. Plan a decay schedule.
- **Drift (shipped `formulaic_closers`):** "In summary / In conclusion / Overall" is now a Wikipedia *historical* indicator (older LLMs). Lower its weight over time.
- **Drift (shipped `buzzword_density`):** "delve," "tapestry" and "testament" are legacy GPT-4-era terms. Wikipedia's mid-2026 "leverage/foster" claims are weakly sourced; do not raise their weights on that basis.
- **Fairness:** never add lexical-diversity or simplicity features, because they replicate the TOEFL false-positive mechanism. Expect AI-assisted non-native founders to match more patterns (Agarwal: 25% vs 19% acceptance; type-token gap erased). Phrase findings as fixable style, not misconduct.
- **Short text:** apply the gating in item 3. Weight hero and footer copy lower, following Turnitin's first/last-sentence false-positive finding.
- **Adversarial:** deterministic stylistic rules are trivially evaded (RAID attacks; Humanizer). Position the copy axis as self-audit and quality linting, not adversarial detection. Artifacts stay robust because they come from careless pasting.
- **Shipped `unicode_artifacts` false positives** (from reading the code):
  - `zeroWidth >= 1` counts U+200D. That character appears in every ZWJ emoji sequence (e.g., 👩‍💻, 🏳️‍🌈), which are common on landing pages.
  - It also counts U+200C, which is orthographically required in Persian and used in Indic scripts.
  - `narrowNbsp >= 1` fires on U+202F, which French typography and some locale number formats use (my inference; not verified in a source this session).
  - I found no source this session supporting U+202F or ZWJ as LLM tells.
  - Suggested fix: ignore U+200D between emoji code points, ignore U+200C next to Arabic-script or Indic letters, gate U+202F by language, and require ≥2 hits.
- **Calibration protocol** (suggested): before shipping any NEW pattern, run it on two sets:
  - (a) ≥1,000 human landing pages captured before 2022-11-30, preferably ≤2021, to measure false-positive rate.
  - (b) ≥1,000 2025–2026 AI-builder pages, to measure hit rate.
  - Target ≤0.5% false-positive rate for "Error"-tier artifacts and ≤5% for "Suggestion"-tier stylistic patterns.
  - Record the results per `DEFINITIONS_VERSION` in `spec/patterns.md`.

### Gaps
- No landing-page-specific corpus or prevalence data exists for any candidate. All thresholds above are starting points to calibrate, not evidence-derived values.
- Not verified this session (search budget exhausted): whether GPT-3 copywriting tools predate ChatGPT, which affects baseline cut-off choice; the Graphite study; current RAID leaderboard standings; Falcon-7B and gpt-neo license terms.
- No source was found on the prevalence of homoglyph or zero-width "humanizer" evasion on real web pages.
- No source was found on Kimi or DeepSeek stylistic (non-artifact) tells.
