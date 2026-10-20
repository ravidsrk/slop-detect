# Design axis, academic sources: deep pass beyond the v4 notes (2026-10-20)

Scope: arXiv, CHI, UIST, ASE, W4A and related venues on AI-generated UI and web front-ends, homogenization, computational aesthetics, accessibility defects in LLM pages, UI critique, detection of machine-generated web content, and how to calibrate heuristic detectors. This pass builds on `docs/research/roadmap-v4/design_axis_ui_evidence.md` (the "v4 notes") and `REPORT.md`, and does not repeat them.

Integrity conventions:
- **[V]**: I downloaded the full text (arXiv HTML, or the PDF for non-arXiv items) and the quoted string or number appears literally in it. Section and table locations are given.
- **[U]**: secondary or unconfirmed (a search snippet, or a figure I could not reconcile).
- **Inference**: my own reasoning, never attributed to a source.
- Thresholds marked **heuristic** are proposals, not values from any source.

Every arXiv ID below was fetched from `arxiv.org/html/<id>` on 2026-10-20, apart from 2605.00087 (PDF) and the CHI EA paper (Politecnico di Torino repository PDF).

---

## 1. Source log

### A. Homogenization and convergence of generated UIs. Four v4 [SV] entries upgraded to [V], one new

**A1. Design Theater: Evaluating the Gap Between User-Facing Design Reasoning and Implementation in Generative UI Tools.** K. Imteyaz et al. arXiv [2607.22928](https://arxiv.org/html/2607.22928). Status: in v4, now upgraded [SV]→[V].
- Table 3, "Pairwise tool similarity by sub-metric, averaged across 24 tasks" [V]:
  - DHI-Visual: mean 0.137, range 0.119 (Claude–v0) to 0.151 (ChatGPT–Firebase).
  - DHI-Color: mean 31.9, range 20.6 (Claude–v0) to 39.7 (Bolt–ChatGPT).
  - DHI-Layout: mean 0.196, range 0.181 (Bolt–Claude) to 0.211 (Claude–ChatGPT).
- Abstract [V]: "roughly 25% of user-facing design reasoning is not implemented", "34% for functional requirements", and "four of the five tools implementing 6% or fewer functional principles".
- **New, important caveat** (Limitations) [V]: "DHI also lacks a human-designed reference distribution, meaning our results describe convergence among the evaluated tools rather than…". The paper shows tools converging on each other. It does **not** show that they converge more than human sites do.
- Tools were constrained to "HTML, CSS, and JavaScript … excluding component libraries", and the authors say this "may reduce output variation" [V].

**A2. LandingAgent / LandingBench.** Baek et al. arXiv [2608.27902](https://arxiv.org/html/2608.27902). Status: in v4, upgraded [SV]→[V].
- §3 [V]: "LandingBench contains 438 pages covering 13 section-role labels, with average 8.0 annotated sections per page".
- Table 3 [V]: diversity under Direct Prompting is 0.26 (gemini-2.5-pro) and 0.28 (gpt-5). LandingAgent reaches 0.36 and 0.37.
- Fig. 4 caption [V]: "Direct Prompting repeats hero layouts, visual assets, and section order".
- **New, Table 12** [V]: primary colour hue across the 438 human Common Crawl landing pages:
  - "Blue / Purple 211 48.2", "Red / Orange 121 27.6", "Black / Dark 33 7.5", "Green 30 6.8".
  - The pages are 90.6% "High-polish" and 47.0% "Late-stage".
  - Caveat: "Brand metadata is extracted using Claude Sonnet 4.6 … Color hue is derived from the primary palette hex value". Blue and purple are merged, so this table cannot separate purple from blue.
- §B prompt text [V] names "Generic Tailwind centered hero with 2 buttons" as a critic rejection reason. It is a prompt string, not a measurement.

**A3. Mine–Sample–Render.** Triaridis, Sharp, Jojic. arXiv [2610.21185](https://arxiv.org/html/2610.21185). Status: in v4, upgraded [SV]→[V].
- §4 [V]: "LLM-generated webpages tend to collapse to a very specific look and design structure (Figure 4)".
- Table 2 [V], Vendi score over 10 generations per prompt:
  - GPT-5.5 prompt-only: 2.158 (text), 2.446 (image).
  - MSR (WebSight): 3.956 and 4.116.
  - MSR (Design2Code): 3.273 and 3.457.
  - Kimi K2.6 prompt-only: 2.426 and 3.150.
- Method [V]: diversity is measured with DINOv2 screenshot embeddings and with text-embedding-3-large on structure-only HTML.
- **Inference:** about 2.2–2.4 effective distinct designs per 10 samples means that one prompt gives a near-deterministic look. Cheap attribute sampling (MSR) roughly doubles that, which is direct evidence that **the convergence can be removed at generation time**.

**A4. Design Creativity Bench.** Rusia et al. (Kombai). arXiv [2610.11539v2](https://arxiv.org/html/2610.11539). Status: in v4, upgraded [SV]→[V].
- §4 [V]: "originality is 0.592 (95% CI [0.582, 0.602]) over 15,840 unique model–model pairs, compared with 0.764 [0.751, 0.778] for 2,400 human–model pairs".
- §4 [V]: creative range is "0.581 (95% CI [0.567, 0.597]), against 0.902 [0.884, 0.919]" for human pairs.
- Conflict of interest confirmed [V]: "All authors are affiliated with Kombai Inc., which develops AI products for UI design".

**A5. Interrogating Design Homogenization in Web Vibe Coding.** Shin et al. (MSR internship). arXiv [2603.13036](https://arxiv.org/html/2603.13036). Status: in v4, upgraded [SV]→[V].
- §3 [V]: "a globally average aesthetic characterized by minimalist whitespace, standard sans-serif typography, and predictable hero images".
- It names Bootstrap and Tailwind as pre-AI drivers [V]. The paper is conceptual and contains no measurements [V].

**A6. Enabling Creative Exploration for Vibe Design Agents.** Bui, Evangelopoulos, Benard (**Google Labs**). arXiv [2609.15078v3](https://arxiv.org/html/2609.15078), 2026-10-12. Status: in v4 at abstract level only; the full text adds new production-scale facts.
- Intro [V]: "In UI generation, repeated requests often produce similar default palettes, typography, and compositions."
- Table 1 [V]: baseline theme coverage is "1 option" per prompt. Under sampling, mean options rise to 2.10, 2.59, 2.84 and 2.87 as candidate temperature increases. Screenshot similarity falls from 0.6560 to 0.5844.
- Table 4 caption [V]: "All five baseline runs select light mode, sage-green seed colors, and Newsreader headings" for the prompt "Design the home screen for a meditation app".
- §4.4 [V]: "a randomized production study. Over nearly two months, it covers 3.39 million tasks and 719,882 projects". Diversification is therefore **already deployed at production scale by a major builder vendor**.
- §4.5 [V]: "The platform upgraded its generator during the study". The baseline itself shifted mid-study.

**A7. Pattern over Pixels: Measuring Pattern Completion Bias in Multimodal Code Generation.** Nguyen, Chaparro, Mastropaolo (William & Mary). ASE '26. arXiv [2608.03691](https://arxiv.org/html/2608.03691). Status: **NEW**.
- Abstract [V]: from 30 Design2Code pages they build "1,440 evaluated screenshots". With one element in a repeated pattern perturbed, "Mean bias rate reaches 69.78% on card-width perturbations and 80.22% on text font-size perturbations, while mean accuracy is only 21.17% and 7.89%". "Flash- 3.0 reaches 96.11% bias on text."
- Fig. 1 [V]: the model "computes the correct ratio … then discards its own calculation to 'match the others.'"
- Relevance (inference): this is a mechanism for over-uniform repeated components, which `uniform_radius_shadow` (D-05) relies on. The task, however, is screenshot-to-code fill-in, not text-to-page, and the paper has no human-page comparison.

**A8. Does AI-Assisted Development Homogenize Software?** arXiv [2610.24093](https://arxiv.org/html/2610.24093), 2026-10-16. Status: **NEW**, a negative control from the code domain.
- Abstract [V]: 50 OSS projects across pre-LLM, LLM and agentic eras. "Results show no consistent evidence of increased similarity as semantic and syntactic similarity decreased significantly in Java … while Python showed no significant differences."
- Relevance: homogenization is not automatic for every artifact. The UI evidence above is specific to one-shot generation.

### B. Defects and quality of generated pages

**B1. Measuring the Semantic Accessibility Gap in LLM-Generated Web UIs.** Calò, Gurita, De Russis. CHI EA '26, DOI [10.1145/3772363.3799364](https://doi.org/10.1145/3772363.3799364). Full text from the [PoliTo repository](https://iris.polito.it/handle/11583/3008330). Not on arXiv. Status: **NEW**.
- Abstract [V]: "Analyzing 300 UIs produced by three commercial models, we identify 541 semantic violations across six fault types". The LLM-judge recall on injected faults is "80–92%".
- §3 [V]: "generic button labels and vague link text are the two most prevalent categories … (27% and 26%, respectively). Buttons labeled 'Submit' or 'Click' … 'Read more' or 'Learn more'". "Poor alt text follows at 20%, with ARIA issues (14%) and generic form labels (12%)".
- **Internal inconsistency [V]:**
  - Fig. 1a prints counts of 296, 286, 217, 157 and 130, which sum to 1,086, not 541.
  - Fig. 1b prints per-generator values of 0.3, 1.5 and 1.8 violations per UI, which average about 1.2, against "nearly two" in the text.
  - Use only the category ranking, not the absolute numbers.
- Generators: Claude Sonnet-4, Gemini-2.5-flash and GPT-4o [V, footnote 2]. The study has **no human-site comparison**.

**B2. VideoVIBE: A Video-Grounded Diagnostic Benchmark for One-Shot Interactive Website Generation.** Xu et al. arXiv [2608.09573](https://arxiv.org/html/2608.09573). Status: **NEW**.
- [V]: "6,338 manually verified failure events … four top-level dimensions, twelve evaluation subdimensions, and thirty fine-grained failure modes". The pages come from seven generators.
- Distribution of the 1,752 questions [V, App. E]:
  - Visual & Motion Fidelity 33.7%, including Motion Quality 16.3% and Visual Hierarchy 12.8%.
  - Structural & Temporal Coherence 21.8%, including Layout Integrity 9.0%.
  - Functional Executability 18.4%.
- Failure modes defined in Table 5 [V] include:
  - "Occlusion and layer conflict";
  - "Responsive adaptation failure";
  - "Page content rendering failure … appearing blank, missing";
  - "Broken media resource";
  - "Missing failure feedback";
  - "Redundant interface element".
- Caveat [V]: "Recordings containing at least one observable failure are retained". These are failure-mode shares, not prevalence, and there is no human baseline.

**B3. A Heuristic Approach to Localize CSS Properties for Responsive Layout Failures (LocaliCSS).** arXiv [2605.25476](https://arxiv.org/html/2605.25476). Status: **NEW**.
- §2 [V], the five RLF types after ReDeCheck: Element Collision, Element Protrusion, Viewport Protrusion, Wrapping Elements and Small-Range Failure.
- §2 [V]: "RLFs are prone to a special type of false positives known as Non-Observable Issues (NOIs) … if it is transparent or contains the same colour as root element … the viewport protrusion will not be visible".
- Results [V]: localization reaches "45.2% (Top-1) to 92.86% (Top-7)".

**B4. Deception at Scale: Deceptive Designs in 1K LLM-Generated Ecommerce Components.** arXiv [2502.13499v2](https://arxiv.org/html/2502.13499), CHI '26. Status: **NEW**.
- Abstract [V]: "1,296 LLM-generated web components … 55.8% of components contained at least one deceptive design, and 30.6% contained two or more".
- §3.2.1 [V], comparing against Mathur et al.'s 11K human ecommerce sites: "In human-designed websites, social engineering accounted for over 90% of deceptive designs … these sites used more varied urgency cues such as low-stock messages … The percentage of interface interference and forced action was very low on human-designed websites, but much higher in LLM-generated components."

**B5. Krauß et al., ChatGPT and deceptive design in webshops.** arXiv [2411.03108v2](https://arxiv.org/html/2411.03108), CHI '25 format. Status: **NEW** (2024).
- Abstract [V]: "all 20 generated websites contained at least one DD pattern (mean: 5, max: 9)".
- §4 [V]: under business-goal prompts, ChatGPT added "(Fake) Discounts, Visual Prominence, Endorsement/Testimonials and Limited Time Message", plus "countdown-timers".

**B6. Comparing the Quality of Code Generated by Vibe Coding Tools.** da Mota, Gama. SBES 2026. arXiv [2608.16302](https://arxiv.org/html/2608.16302). Status: **NEW**, low relevance.
- [V]: nine apps (Lovable, v0, Replit), analysed with SonarQube. "Lovable concentrates issues of lower severity but presents a substantially higher density of code smells per KLOC".
- These are source-level findings and cannot be observed from a rendered page.

**B7. Agentic Web Accessibility Auditing.** arXiv [2609.09379v2](https://arxiv.org/html/2609.09379). Status: **NEW**.
- Abstract [V]: across 250 page–criterion records from expert audits of 11 scholarly platforms, "Agents recover 67 of 78 reported positive cases (86% recall), compared with 36% for axe-core … at lower precision (56%)".

**B8. AesCode.** Microsoft et al. arXiv [2610.18860](https://arxiv.org/html/2610.18860). Status: **NEW**, marginal.
- Its rewards use "Six deterministic verifiers [that] read the rendered DOM and screenshot", including "Boundary: in-canvas fraction of overflowing elements" (App. D1) [V].
- "canvas overflow persists" as a residual failure (§5) [V].
- The domain is slides, posters and dashboards, not landing pages.

**B9. SchemaGUI.** arXiv [2608.22390](https://arxiv.org/html/2608.22390). Status: **NEW**, marginal.
- [V]: LLMs suffer "severe coordinate drift in dense grids and multi-region compositions". Qwen3.5 Geometry score runs from 67.05% (4B) to 75.30% (27B).

### C. DESIGN.md and conformance

**C1. GUIDE: Designer-in-the-loop Authoring of Conformant Generative User Interfaces.** arXiv [2609.21285](https://arxiv.org/html/2609.21285), cs.HC, 2026-09-18. Status: **NEW**.
- It uses Google's `design.md` format (footnote link to `github.com/google-labs-code/design.md`) [V].
- §4 [V], nearest-neighbour app-identity accuracy on held-out AMEX screens: tuned encoder "96.7%", "91.8% for untuned NaFlex, 77.0% for color histograms, and 70.1% for SWD".
- Screen provenance reaches 82.4% and design interpolation 72.7% [V]. Most of the gain comes "between 1 and 3 references" [V].
- In a study with 12 practitioners, participants preferred aligned outputs over "a strong baseline using exemplars and a model-generated design.md" [V].

### D. Detection of machine-generated web content, and calibration methodology

**D1. DeGenTWeb: A First Look at LLM-dominant Websites.** He, Ardi, Govindan, Madhyastha (USC). arXiv [2605.00087](https://arxiv.org/abs/2605.00087), cs.NI, 2026-04-30. Status: **NEW**. All of the following were read in the PDF [V]:
- **The need for a low false-positive rate:** "when aiming for a false positive rate (FPR) of even 1%, Binoculars detects only 70% of LLM-generated text".
- **Site-level aggregation:** "average accuracy … starting from 86.9% with 1 page/site, and converges at 98.7% with 15 pages/site".
- **Pre-ChatGPT control:** "applied it to 35,856 randomly sampled sites with only page samples archived before ChatGPT's launch. It classified only 0.29% of sites as LLM-dominant, providing an approximate upper bound on our FPR".
- **Eligibility filtering:** "FPR without page filtering is 12.9%, as compared to 0.30% with filtering". The filters are a relaxed Dolma quality filter, for example "Fewer than 50 or more than 100,000 words".
- **Prevalence:** "up from 2.1% in late 2022 to 29.4% in early 2025". "Sites which sell goods and services are much more likely to be LLM-dominant".
- **Decay with newer models (§5):** "detection accuracy degrades when newer LLMs are used". The authors report a "strong negative correlation" with Artificial Analysis Intelligence Index score; the coefficient symbol is garbled in the PDF text, and the magnitude reads 0.88. "the average Binoculars score grows from 0.89 with Sonnet 4 to a more human-like 0.96 with Sonnet 4.6".

**D2. The Impact of AI-Generated Text on the Internet.** arXiv [2604.26965](https://arxiv.org/html/2604.26965). Status: **NEW**.
- Abstract [V]: "by mid-2025, roughly 35% of newly published websites were classified as AI-generated or AI-assisted, up from zero before ChatGPT's launch". This uses Pangram v3 on Internet Archive samples.
- **Negative finding [V]:** "We do not, however, find statistically significant evidence supporting the hypothesis that an increased rate of AI-generated text on the internet decreases factual accuracy or stylistic diversity". Stylistic diversity was measured as char-3-gram Jaccard (§Methods).
- App. robustness [V]: "For texts of 1–10 words, Binoculars achieved a true positive rate (TPR) of 61.6% with a false positive rate (FPR) of 35%", and for 11–50 words "TPR: 96.6% and FPR: 17.9%". Binoculars showed a large drop "when AI-generated text was embedded in HTML".

**D3. SlopShape: Identifying AI-Generated Commercial Web Content.** Madler (Sitefire). arXiv [2609.15369v3](https://arxiv.org/html/2609.15369). Status: **NEW**.
- Abstract [V]: "2,250 pre-ChatGPT human blog posts from 268 company domains against 11,250 AI mirrors from five frontier models". Structural features give "97.0 macro-F1 on held-out companies … (96.1) when every AI post is reworded". Attribution is "68.6% … against a 16.7% chance rate".
- §6, Table 6 [V], the core AI-leaning values:
  - "restated thesis or reframe" conclusion (gap 0.650);
  - a "summary or synthesis" stage (0.609);
  - no "External Participation Pathway" (0.592);
  - "modern or next-generation framing" (0.360);
  - "confident institutional explanation" (0.347).
- Human-leaning values [V]: "Legacy-versus-Modern Contrast: no" and "historical date or period".
- Rarity, §6 / Table 7 [V]: "mean Euclidean distance to its 25 nearest neighbors in the z-scored structural feature space … converted to a percentile". The human mean percentile is 0.835 against 0.436 for AI (Cohen's d 1.80). "rarity alone separates the classes at AUC 0.898".
- Limitations §9 [V]:
  - The features are applied by an LLM ("LLM-run end to end").
  - The AI posts are synthetic mirrors ("single-pass generation").
  - "Publication-year confound (inherent). Our human posts predate ChatGPT and mirrors were generated in August 2026, so publication period and authorship are confounded."

**D4. Robust Detection of LLM-Generated Text under Contamination.** Li, Chakraborty, Tewari (UMich Stats). arXiv [2609.29935](https://arxiv.org/html/2609.29935). Status: **NEW**.
- Abstract [V]: "a collection of clipped likelihood-ratio tests achieves vanishing worst-case errors". Clipping is proposed "as a simple modification of existing statistical detectors".
- App. D.3 [V], the protocol:
  - "Thresholds are chosen using human calibration texts only … sort their scores … This allows at most [k] false positives in calibration".
  - "We keep the whole group in the same split to prevent related texts from appearing in both fitting and testing".
  - "Test FPR may differ from the calibration target. We therefore report achieved FPR".

**D5. ARB: A Matched Authorship-Rewriting Benchmark.** arXiv [2607.29539](https://arxiv.org/html/2607.29539). Status: **NEW**.
- Abstract [V]: at "TPR@1%FPR", FastDetectGPT and Binoculars "detected 91.2% and 93.5% of direct LLM text, but only 30.8% and 15.1% of human text an LLM had rewritten".

**D6. Breaking the Generator Barrier.** arXiv [2604.13692](https://arxiv.org/html/2604.13692). Status: **NEW**, context only.
- Abstract [V]: "Reliance on generator-specific artifacts is inherently unstable, since new models emerge rapidly".

### E. Searched; nothing usable found
- **No study of human ability to tell AI-built websites from human-built ones** (extended web search) [U-negative].
- **No 2025–2026 study validating a webpage-screenshot complexity or aesthetics metric** against human ratings. The newest web-specific validation remains Reinecke 2013 and Miniukovich 2015, both already in v4.
- **No arXiv work attributing HTML or CSS output to a specific model.** Code stylometry work (for example [2506.17323](https://arxiv.org/abs/2506.17323)) covers C and Python [U].
- The UK National Centre for AI post claiming Pangram had "34%" recall on GPT-5.4 returned 403 to fetching, so it is **not cited** (search snippet only).

---

## 2. What is new compared with the v4 notes
1. **DeGenTWeb (D1)** is the first measured, web-specific calibration evidence:
   - a pre-ChatGPT Common Crawl control at about 36k sites (0.29% FPR);
   - an eligibility filter that cuts FPR from 12.9% to 0.30%;
   - site-level aggregation (86.9%→98.7%);
   - measured decay with newer models.

   v4's K-01 cites Brooks and Pew for the control idea but has no web-site evidence that filtering and aggregation carry most of the FPR control.
2. **The calibration-protocol mechanics in D4 and D5:**
   - an order-statistic threshold set on human-only calibration data;
   - splits grouped to prevent leakage (by site, in our case);
   - reporting achieved rather than target FPR;
   - TPR@1%FPR as the primary endpoint;
   - clipped likelihood-ratio aggregation.

   K-01 and K-04 state the goals but not these mechanics.
3. **Production-scale vendor diversification (A6, Google Labs):** 3.39M tasks and 719,882 projects with explicit theme sampling. v4's decay argument relied on prompt guides (Anthropic, OpenAI); this is the first measured deployment. MSR (A3) shows the same effect offline.
4. **Design Theater's own caveat (A1):** it has no human reference distribution. v4 used its DHI as homogenization evidence without this limit.
5. **A human landing-page hue base rate (A2, Table 12):** "Blue / Purple" covers 48.2% of 438 polished human landing pages. It is weak (LLM-extracted, with merged classes) but is the only human landing-page palette distribution found.
6. **Mechanistic evidence for over-uniform repeated components (A7, ASE '26).**
7. **Semantic accessibility defects in LLM UIs (B1, CHI EA '26).** Generic button and link labels dominate. The paper's figures are internally inconsistent.
8. **A dynamic failure taxonomy for vibe-coded pages (B2):** 6,338 verified failures across 30 modes.
9. **The standard RLF taxonomy plus the NOI false-positive class (B3)**, both relevant to F-02.
10. **Deceptive design (B4, B5):** LLMs over-use interface interference compared with humans, while **humans** use urgency and social proof more. This argues against using urgency or testimonial cues as AI tells.
11. **GUIDE (C1):** a deterministic colour-histogram baseline identifies a design system 77.0% of the time against 96.7% for a tuned encoder, a ceiling for pure token matching on the DESIGN.md axis.
12. **SlopShape (D3):**
    - structural copy features survive rewording;
    - a kNN "rarity percentile" with AUC 0.898;
    - an explicitly acknowledged publication-year confound that also threatens a pre-2022 design control.
13. **Negative controls:**
    - no significant decline in web stylistic diversity (D2);
    - no increase in code similarity (A8);
    - short-text detection is unreliable (D2: 1–10 words, FPR 35% for Binoculars).
14. **Four v4 [SV] entries are upgraded to [V] with exact table locations:** A1, A2, A3 and A4. A5 (identity and quote) is also re-verified.

---

## 3. Candidate roadmap items

Evidence grades follow K-02: measured, standard, practitioner, hypothesis.

### 3.1 Site mode: multi-page aggregation with an eligibility gate
- **Build:**
  - `slop-detect <url> --site N` samples up to N same-origin pages, from the sitemap first and same-origin links second. Default N is 5 and maximum 15 (**heuristic**; D1 converges at 15).
  - Per pattern, report the share of eligible pages that fire.
  - Template-level patterns (header, footer, global CSS) are deduplicated by DOM-path hash, so a layout shared across pages counts once.
  - Pages enter the score only when eligible: at least 50 visible words (from D1's filter list) and at least one rendered `h1`, `main` or `section` (**heuristic**).
  - The site verdict is the median of page scores and is reported beside the homepage score.
- **Evidence:** measured for text detection (D1: 86.9%→98.7% accuracy; FPR 12.9%→0.30% with filtering); hypothesis for design patterns.
- **False-positive risks:**
  - Shared templates double-count unless deduplicated.
  - Docs and blog subpages dilute the score.
  - Crawl cost and scan-rate limits apply (the paced-scan note in AGENTS.md).
- **Acceptance criteria:**
  - On the K-01 human strata, site-mode Heavy FPR is at most homepage-only FPR.
  - A fixture site with an AI homepage and human docs pages yields "mixed" rather than Heavy.
  - Rate limits are honoured.
- **Links:** extends #210 (static distribution and crawl) and K-01; reuses the C-01 gating idea for design.

### 3.2 Calibration protocol mechanics, as an amendment to K-01 and K-04
- **Build:** in `scripts/calibrate`:
  1. Split K-01 strata into tuning, calibration and test sets **grouped by registrable domain**, so no subpages leak across splits (D4).
  2. Set the Heavy threshold as the ⌈(1−α)·n⌉-th order statistic of **human-only** calibration scores, with α = 1% (D4, D5).
  3. Publish achieved test FPR with a Clopper–Pearson interval next to the target (D4).
  4. Report TPR@1%FPR per builder cohort as the headline (D5) and AUROC as secondary.
  5. Clip each pattern's log-likelihood-ratio contribution to [−c, +c], with c = ln 10 (**heuristic**), so no single rule decides Heavy (D4's clipped LR tests).
  6. Use a pre-30-Nov-2022 Common Crawl or Wayback control sampled at site level, as in D1 (35,856 sites), and **keep stratum (b)**, the contemporary human set, mandatory. SlopShape (D3, §9) shows that an era-only control confounds authorship with period. For design this is worse, because styles trend.
- **Evidence:** standard (statistics) and measured (D1, D4, D5).
- **False-positive risks:**
  - n is small: with 200 human sites, α = 1% allows only 2 calibration false positives. The arithmetic matches v4's.
  - Wayback CSS loss (v4).
- **Acceptance criteria:**
  - CALIBRATION.md v2 reports target and achieved FPR, the split seed and domain grouping, and per-rule clipped LRs.
  - A CI test asserts that no single rule's maximum contribution can move a page across the Heavy boundary.
- **Links:** strengthens K-01, K-04 and #213.

### 3.3 Tell half-life tracking: a fixed prompt panel, re-generated quarterly
- **Build:**
  - A frozen panel of about 40 landing-page prompts (**heuristic** size) is run each quarter through current builders (v0, Lovable, Bolt, Stitch, Claude, GPT) with 3 seeds each.
  - Scan the outputs and track each pattern's hit rate and likelihood ratio against stratum (b) over time.
  - Set a pattern to `decaying` when its LR falls below 2 for two consecutive quarters, and to `historical` below 1.2 (**heuristic**).
  - Also record per-prompt **within-builder Vendi-like diversity** offline. Embeddings are allowed here because this is calibration, not scoring.
- **Evidence:** measured that detectors decay as generators update (D1 §5: Binoculars 0.89→0.96 from Sonnet 4 to 4.6). Measured that vendors diversify in production (A6) and that cheap sampling doubles diversity (A3).
- **False-positive risks:** none to users, since this is an offline process. The risk is panel staleness.
- **Acceptance criteria:**
  - A dated quarterly table of pattern hit rates by builder.
  - Lifecycle status changes are driven only by the table.
- **Links:** makes K-09 and K-03 quantitative; replaces anecdote-driven decay calls such as C-07 and D-08 "Inter decaying".

### 3.4 Design typicality percentile (report-only, offline-calibrated)
- **Build:**
  - Assemble the deterministic feature vector the engine already computes: the 27 pattern raw metrics plus the v4 Q2 aesthetics covariates (colourfulness, palette size, edge density, grid quality).
  - z-score it against the K-01 human reference set and compute the mean Euclidean distance to the k = 25 nearest neighbours (D3's recipe), converted to a percentile.
  - Report "typicality" in JSON only. Never add it to the score.
- **Evidence:** measured for text structure (D3: human 0.835 vs AI 0.436, AUC 0.898); hypothesis for design.
- **False-positive risks:**
  - Bootstrap-era and Tailwind-template human sites are also typical; Goree 2021 shows homogenization predates AI (v4).
  - The reference set must ship as a small static vectors file, with licence review.
- **Acceptance criteria:**
  - K-01 reports the AUC of typicality on held-out data.
  - Promotion to any weight follows K-04.
- **Links:** an alternative to v3 #198 (layout entropy / TreeBLEU, which needs a reference page); complements K-07.

### 3.5 Amend F-02 with the responsive-layout-failure taxonomy and an NOI filter
- **Build:** at 320 CSS px and 390×844, beyond scroll-width overflow, detect:
  - **Viewport Protrusion:** an element whose right edge exceeds `innerWidth + 8`.
  - **Element Protrusion:** a child box exceeding its non-scrolling parent by more than 4 px (**heuristic**).
  - **Element Collision:** sibling text-bearing boxes intersecting by more than 4 px² that did not intersect at 1280 px (**heuristic**).
  - Drop **Non-Observable Issues**: protruding elements with opacity at or below 0.01, a transparent background with no text, or the same computed colour as `body` (B3).
- **Evidence:** standard taxonomy (B3, after ReDeCheck). Measured as an AI failure category (v4's Guo et al.; B2 "Responsive adaptation failure", "Occlusion and layer conflict").
- **False-positive risks:**
  - Intentional overlap (hero art, badges on cards): require both boxes to contain text.
  - Carousels: v4 exclusions already apply.
- **Acceptance criteria:**
  - Fixtures cover each RLF type, plus an NOI fixture (transparent overflow) that must **not** fire.
  - No firing on the K-05 pioneer set at 390 px.
- **Links:** extends F-02.

### 3.6 `generic_control_labels` on the craft-floor axis only
- **Build:**
  - Fire when at least 3 links or buttons share an accessible name, case-folded and trimmed, from {"learn more", "read more", "click here", "more", "here", "submit", "click"} **and** point to at least 2 distinct `href`s or actions, with no `aria-label`, `aria-labelledby` or `aria-describedby` that disambiguates them (thresholds **heuristic**).
  - Separately, flag `img[alt]` whose alt is exactly "image", "photo", "picture" or "placeholder", or equals the file name.
- **Evidence:**
  - Measured as the top semantic defect classes in LLM UIs, with generic buttons 27% and vague links 26% (B1). The absolute counts are unreliable; see §1 B1.
  - Standard: WCAG 2.4.4 Link Purpose. I did not open the WCAG technique page, so no technique ID is cited.
  - There is **no** AI-versus-human differential.
- **False-positive risks:** high base rate on human sites ("Learn more" is ubiquitous). That is why this belongs on the defect axis and never in Clean/Mild/Heavy.
- **Acceptance criteria:**
  - Fixtures pass.
  - The results report through F-00 only.
  - The K-01 likelihood ratio is published but not used.
- **Links:** extends F-00 and F-07; overlaps axe `link-name` only for empty names, so it does not duplicate axe.

### 3.7 Extend F-05 (dead controls) to form feedback
- **Build:**
  - For the first visible `form` that has a submit control, submit it empty with network requests intercepted (v4 F-05 harness).
  - Fire when there is no `:invalid` state, no `aria-invalid`, no new visible text within 1 s and no blocked request. That is the "Missing failure feedback" mode.
- **Evidence:** measured as a recurring failure mode (B2, Table 5). Design Theater (A1): "four of the five tools implementing 6% or fewer functional principles", including "error prevention and recovery". There is no human baseline.
- **False-positive risks:**
  - Forms that are progressively enhanced only after consent.
  - Newsletter forms that silently no-op by design.
- **Acceptance criteria:** fixtures pass; no firing on the K-05 set.
- **Links:** extends F-05 (and #196 as re-scoped in v4).

### 3.8 DESIGN.md axis: optional reference-screen conformance, off by default
- **Build:**
  - When DESIGN.md lists reference screenshots (or `--ref <url>` is passed), compute a deterministic Oklab colour-histogram distance between the scanned page and the references as a report-only conformance hint.
  - Document its ceiling: 77.0% app identity for colour histograms against 96.7% for a tuned encoder (C1).
  - Any learned encoder stays CLI-only and opt-in, with weights fetched on demand (the K-07 policy).
- **Evidence:** measured (C1, on AMEX mobile screens, not landing pages).
- **False-positive risks:** dark versus light pages of the same brand, and image-heavy heroes.
- **Acceptance criteria:**
  - Same-site pages score closer than cross-site pages on 20 brand pairs, at a rate of at least 75% (**heuristic**, close to C1's histogram baseline).
- **Links:** complements S-01 and S-02. It does **not** replace token coverage, since C1 shows token-free histograms are a weak but non-zero signal.

### 3.9 Watchlist only: deterministic proxies for structural copy tells
- **Build:** at weight 0, on prose blocks that pass C-01, detect:
  - a "we'll cover / in this post" structure announcement before the first `h2`;
  - "legacy vs modern" framing (for example "the old way", "built for a slower era", "next-generation");
  - a closing block that restates the h1 claim (token Jaccard with the h1 ≥ 0.5, **heuristic**).
- **Evidence:** measured in D3, but by an LLM-applied instrument on **blog posts** against synthetic mirrors, with an era confound. Zero-LLM proxies are a hypothesis.
- **False-positive risks:** marketing copywriting conventions. Landing pages are not blog posts.
- **Acceptance criteria:** the K-01 likelihood ratio is at least 3 before any promotion, per K-04.
- **Links:** sits beside C-08 and C-10. It supports v4's "structure over vocabulary" direction without adding a model.

---

## 4. v4 items that the new evidence strengthens or weakens

| v4 item | Direction | Why (sources) |
|---|---|---|
| **K-01 calibration protocol** | **Strengthened, and amended** | D1 shows web-scale feasibility of a pre-ChatGPT control (0.29% FPR on 35,856 sites) and that filtering carries most of the FPR control (12.9%→0.30%). D3's publication-year confound shows that stratum (b), a contemporary human set, is **mandatory**, not optional. See §3.2. |
| **K-04 experimental gate (LR ≥ 3)** | Strengthened | D4 offers a principled form (clipped LR tests) and a threshold rule (an order statistic on human-only data); D5 sets TPR@1%FPR as the norm. |
| **K-09 quarterly re-validation / K-03 lifecycle** | **Strongly strengthened** | D1 §5 measures detector decay as models update. A6 shows a builder vendor already diversifying themes in production (3.39M tasks), and A3 shows prompt-level diversification nearly doubling Vendi. Make it quantitative (§3.3). |
| **K-06 harm-avoiding language** | Strengthened | D5: on LLM-*rewritten* human text, detectors fall to 15–31% TPR at 1% FPR, so authorship is not binary. D1: "detectors … perform much worse than advertised" at low FPR. |
| **C-01 gating / C-11 defer model detector** | Strengthened | D2: Binoculars on 1–10-word texts reaches TPR 61.6% at FPR 35%, and degrades when the text is HTML-embedded. Landing-page copy is short, so keep statistics gated and the model detector deferred. |
| **D-05 `uniform_radius_shadow`** | Mechanism strengthened; fingerprint still unproven | A7: MLLMs regress to the repeated pattern (69.78% and 80.22% bias). There is still no human-page uniformity baseline, so keep weight 0 until K-01. |
| **D-06 `editorial_cream_kit`, D-04 `template_chrome_2026`** | Weakened (shorter expected half-life) | A6: the default theme for a prompt (for example "sage-green … Newsreader") changes once a vendor samples themes. Style kits move faster than v4 assumed. Keep them at weight 0 and track them with §3.3. |
| **`purple_accent` (shipped)** | Weakened further | A2 Table 12: "Blue / Purple" is the primary hue on 48.2% of 438 polished *human* landing pages. Merged classes and LLM extraction keep this suggestive only. A1: colour is the *most* variable dimension between tools (DHI-Color range 20.6–39.7). |
| **Homogenization as a headline claim (REPORT §design)** | Qualified | A1 states it has no human reference distribution. A8 finds no increase in code similarity, and D2 finds no significant loss of web stylistic diversity. A3, A4 and A6 support *within-prompt* convergence of one-shot generation, not web-wide homogenization. Word claims as "one-shot defaults converge", not "the web is homogenizing". |
| **#202 hallucinated testimonials (v4 re-scope)** | Re-scope confirmed | B4: human ecommerce sites use social proof and urgency **more** than LLM components. B5 shows ChatGPT adds fake testimonials only under business-goal prompts. Keep only structural placeholder signals (placeholder avatar hosts and unfilled names via C-05); do not score urgency or testimonials as AI tells. |
| **F-02 `mobile_reflow_overflow`** | Strengthened and amended | B3 supplies a standard RLF taxonomy and the NOI false-positive class. B2 lists "Responsive adaptation failure" and "Occlusion and layer conflict" as verified failure modes. See §3.5. |
| **F-05 `dead_cta_controls`** | Strengthened | B2's "Missing failure feedback" and Feature Execution share of 10.7%; A1's near-absent functional principles. See §3.7. |
| **F-07 `--a11y axe`** | Scope note | B7: axe-core recall is 36% on expert-audited criteria. B1: semantic defects pass axe. Keep axe as a separate optional report; do not claim WCAG coverage. Add §3.6 as a cheap semantic complement. |
| **S-01 / S-02 DESIGN.md conformance** | Strengthened (format), with a bounded expectation | C1 adopts Google's `design.md` in an academic GenUI system. Deterministic colour histograms reach 77.0% design-identity accuracy, so token coverage gives a useful but incomplete signal. See §3.8. |
| **v3 #198 layout entropy / TreeBLEU** | Still unsupported as a single-page rule | No new source computes layout entropy as a single-page AI signal. A2 and A3 use embedding diversity over *sets* of pages. §3.4 (a typicality percentile) is the closest defensible substitute. |

**Gaps that remain:**
- No AI-versus-human differential exists for any design rule in a peer-reviewed source. Human comparisons appear only for cross-device failure (v4: Guo et al.) and deceptive-design mix (B4).
- No human-detection study exists for AI-built websites.
- No 2025–2026 validation of a webpage aesthetics metric exists.
