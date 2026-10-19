# Design axis (Axis 01) and DESIGN.md system axis (Axis 03): research evidence for Slop Detector roadmap v4

Status as of 2026-10-19. These notes complete the interrupted design-axis research. They synthesize the seven staged sub-reports (`/tmp/roadmap-v4/design-subreports/01`–`07`), apply the corrections in `citation_audit.md`, and use the code facts in `implementation_status_map.md`. The repo was read at commit `d37e91c` and not modified. Load-bearing items were re-verified in this session.

**Verification tags (used on every bullet):**
- **[RV]**: re-verified in this session on 2026-10-19 by opening or querying the primary source.
- **[SV]**: verified (opened) by a sub-researcher. The URL is the one they opened. It was not re-opened here.
- **[SEC]**: secondary source only.
- **[UNV]**: could not be verified.
- **[CALC]**: my own computation from the linked inputs. It is reproducible.
- **[REPO]**: read from `ravidsrk/slop-detect` at `d37e91c`.

**Re-verified in this session:**
- Identity (ID, title, authors, date, venue comment) of all 42 arXiv IDs cited below, through the [arXiv API](https://export.arxiv.org/api/query?id_list=2609.38183,2608.12518,2510.13914,2508.20410,2607.22928,2608.27902,2610.21185,2610.11539,2603.13036,2601.02430): a 40-ID batch plus a second query for [2403.13139 and 2406.07016](https://export.arxiv.org/api/query?id_list=2403.13139,2406.07016). All 42 matched the sub-reports.
- Body numbers in arXiv 2609.38183, 2608.12518, 2510.13914v2 and 2508.20410.
- The Web Almanac 2025 Generative AI chapter, Adrian Krebs's design-slop post, and the Goree et al. CHI 2021 bibliographic record.
- The `lovable-tagger` source, shadcn/ui v4 `data-slot` attributes and the Wappalyzer rules.
- Live generator markers on framer.com and webflow.com.
- The Tailwind v4.3.3 theme and compiler output.
- CSS Color 4 and 5 serialization rules.
- Chrome usage counters for 2026-10-17.
- The licences of AIM, design.md, css-analyzer, Impeccable, shadcn/ui, APTED and the UIClip weights.
- The Impeccable rule registry.

**Conflicts resolved:**
1. **A11yn.** The v2 numbers (2026-09-07) differ from those quoted in sub-report 05, which appear to be v1. Use v2.
2. **arXiv 2608.12518.** The two framings measure different things. "68% vs 40%" means any compatibility issue. "67.5% vs 36.7%" means cross-device-only failures. Both are correct.
3. **Goree CHI 2021.** The identity is confirmed through Crossref. The 32% and 44% figures rest only on sub-report 01's reading of the authors' PDF, and sub-report 07 could not open it.
4. **Impeccable prevalence figures.** The repo's "~74%", "~76%" and "90%+" figures attributed to Impeccable were not found in Impeccable's registry, its README, or a web search. Treat them as [UNV].
5. **faq_accordion attribution.** It does not appear in Krebs's published pattern list as fetched today, so the attribution is [UNV].
6. **gradient_letter_avatars attribution.** Per the citation audit it does not appear in Meng To's skill files, so the attribution is [UNV].

**Citation-audit errors not to repeat:**
- Do not attribute SCS/CRR/RLI to TaoD2C or EfficientUICoder.
- Design2Code has no IoU metric. Its metrics, like TreeBLEU, need a reference page.
- WebSight HTML is smaller and shallower than real HTML, which contradicts the div-soup claim.
- UICoder (SwiftUI) has no overlap analysis.
- Sketch2Code makes no boilerplate claim.
- Anderson et al. covers idea homogenization only.
- Helmlab does not support Oklab ΔE thresholds.
- One ΔE_OK JND is 0.02, not 0.035.
- DTCG 2025.10 is a Final Community Group Report, not a W3C Standard.
- The current matcher is a per-channel maximum, not Manhattan distance.
- Miniukovich & De Angeli's "Computation of Interface Aesthetics" is CHI 2015.
- APCA is not in the WCAG 3 draft.
- Krebs's tiers count how many of 16 patterns fire (High/Medium/Low). They are not Heavy/Mild.

---

## Q1. Which 2024–2026 papers measure the quality or homogenization of LLM/AI-generated UIs and websites, and which of their metrics are deterministic and computable from one rendered page at headless-Chromium cost?

### Takeaway
Homogenization of AI-built websites is now measured directly by five 2026 preprints. All of them measure it at corpus level, using embedding similarity (DINOv3/UIClip), Vendi scores, or tree edit distance between pages. That requires a reference corpus and learned models, so none ports directly to a zero-LLM single-page scorer.

The single-page, deterministic metrics with published evidence are few:
- **Cross-device breakage:** 68% of MLLM-generated pages vs 40% of human pages, with a deterministic detector at precision 0.917 and recall 0.889.
- **WebCoderBench's rule-based visual checks.**
- **DesignBench's defect categories.**

The best descriptive data on 2026 builder defaults comes from 73 Lovable-built sites:
- Inter is the body font on 50%, and Playfair Display is the heading font on 35%.
- 66% have dark heroes.
- The modal layout is a hero over a card grid (29%).
- Accents are warm/earth or trust-blue. Purple is not mentioned.

### Cited Findings

#### Direct measurements of AI-website homogenization (2026)
- **One Tool, One Taste?** (Boussioux, Zhao, Cho; arXiv 2609.38183, 2026-08-05) [RV].
  - Corpus: "73 promotional websites created by graduate students with Lovable". The grading rubric rewarded "creative and original design that avoids generic AI aesthetics".
  - Six clusters take "64 of 73 sites (88%)". The largest, Card-Grid, is "the cohort's default at 21 sites (29%)".
  - "48 heroes (66%) are dark and 25 (34%) light". "on average 63% of screen area is neutral".
  - Body text: "Inter (36, 50%), with DM Sans second (9, 12%)". Headings: "Playfair Display (24 sites, 35%) and Cormorant Garamond (12, 17%)".
  - Accents: "warm/earth tones (28) and trust-blue (11) dominate". Purple, violet and indigo are not mentioned in the text read.
  - Similarity: median nearest-neighbour similarity is 49 index points, against a mean pairwise similarity of 22.8. The order-2 Vendi score is 12.0.
  - Method: DINOv3 embeddings, then "UMAP projection followed by HDBSCAN density clustering".
  - "hero regions on their own are markedly less convergent than whole pages".
  - Limits: "Our cohort is one class, one recommended platform, one model generation". An external human anchor is planned but does not exist yet.
  - Source: [arXiv HTML](https://arxiv.org/html/2609.38183). Sub-report 01 also reports adjusted mutual information with business sector of 0.20 and 0.26. I did not find those values in the text I read, so they are [SV] only.
- **Design Theater** (K. Imteyaz, K. Imteyaz, Rajpal, Shaikh, Muller, Savage; arXiv 2607.22928, accepted at AAAI/AIES) [RV identity and venue; SV numbers].
  - Setup: 24 tasks, 120 interfaces, five tools (ChatGPT, Claude, Firebase Studio, v0, Bolt).
  - Tools explained design decisions they did not build: "over 25% of user-facing design rationales" were not implemented, and 34% for functional requirements. "four of five tools" implemented "6% or fewer functional principles".
  - Between-tool distances: visual (UIClip embeddings) mean 0.137; colour (CIELCh histograms with Earth Mover's Distance) mean 31.9, the most variable dimension; layout (tree edit distance) mean 0.196.
  - Source: [arXiv](https://arxiv.org/abs/2607.22928).
- **LandingAgent** (Baek et al.; arXiv 2608.27902, 2026-08-28) [RV identity; SV numbers].
  - Builds 438 human landing pages from Common Crawl, labelled with 13 section roles (8.0 sections per page on average).
  - Layout diversity (DINOv3) with direct prompting: 0.26 for gemini-2.5-pro and 0.28 for gpt-5. Their agent reaches 0.36–0.37.
  - "Direct Prompting repeats hero layouts, visual assets, and section order."
  - Source: [arXiv](https://arxiv.org/abs/2608.27902).
- **Mine, Sample, Render** (Triaridis, Sharp, Jojic; arXiv 2610.21185, 2026-10-15) [RV identity; SV numbers].
  - "LLM-generated webpages tend to collapse to a very specific look and design structure."
  - GPT-5.5 Vendi diversity from the prompt alone is 2.158 (text) and 2.446 (image). With their method it rises to 3.956 and 4.116.
  - Source: [arXiv](https://arxiv.org/abs/2610.21185).
- **Design Creativity Bench** (Rusia, Bhole, Gupta, Dey; arXiv 2610.11539 v2, 2026-10-14) [RV identity; SV numbers].
  - 15 models and 2,400 designs. Originality is 0.592 between models vs 0.764 between humans and models. Creative range is 0.581 for models vs 0.902 for humans.
  - Conflict of interest: the authors are at Kombai, a vendor of AI UI tools. The arXiv comment links its commercial leaderboard.
  - Source: [arXiv](https://arxiv.org/abs/2610.11539).
- **Interrogating Design Homogenization in Web Vibe Coding** (Shin et al., UW/MSR; arXiv 2603.13036, 2026-03-13) [RV identity; SV content].
  - Conceptual, with no measurements.
  - Describes the default look as "minimalist whitespace, standard sans-serif typography, and predictable hero images", and names Tailwind and Bootstrap as drivers.
  - Source: [arXiv](https://arxiv.org/abs/2603.13036).
- **Enabling Creative Exploration for Vibe Design Agents** (arXiv 2609.15078 v3) [RV identity; SV abstract]: "repeated generations often converge on similar visual directions". Source: [arXiv](https://arxiv.org/abs/2609.15078).
- **Pre-AI precedent: Goree, Doosti, Crandall, Su, "Investigating the Homogenization of Web Design: A Mixed-Methods Approach"** (CHI 2021, pp. 1–14).
  - [RV] bibliographic record via [Crossref](https://api.crossref.org/works/10.1145/3411764.3445156) and [DOI](https://doi.org/10.1145/3411764.3445156).
  - [SV] from the authors' PDF (sub-report 01):
    - "Color distance declines 32% between 2008 and 2019. Layout distance declines 44% from 2010 to 2019."
    - CNN distance fell 30% from 2007 to 2019.
    - 227,802 images of 10,482 websites.
    - Layout was compared with XY-tree tree edit distance, and colour with CIELCh histograms and Earth Mover's Distance.
    - Bootstrap was the library most associated with similar layouts.
  - Not on arXiv: an arXiv title search returned no record [RV].
- **Idea-level homogenization, not UI:**
  - Anderson, Shah, Kreminski (C&C 2024; [arXiv 2402.01536](https://arxiv.org/abs/2402.01536)) [RV identity]: with 36 participants, "different users tended to produce less semantically distinct ideas with ChatGPT" [SV].
  - Wadinambiarachchi et al. (CHI 2024; [arXiv 2403.11164](https://arxiv.org/abs/2403.11164)) [RV identity]: N=60, and AI support "leads to higher fixation on an initial example" [SV].

#### Benchmarks of LLM-generated frontends: failure modes
- **Design2Code** (Si et al., NAACL 2025; [arXiv 2403.03163](https://arxiv.org/abs/2403.03163)) [RV identity and current title].
  - 484 real pages. On the harder set, models "fail to generate 30% - 40% of the block elements" [SV].
  - Its metrics (Block-Match, position, CIEDE2000 text colour) compare against a reference page and contain no IoU ([citation audit](https://arxiv.org/html/2403.03163)).
- **DCGen** (FSE 2025; [arXiv 2406.16386](https://arxiv.org/abs/2406.16386)) [RV identity]: three failure types, "element omission, element distortion, and element misarrangement" [SV].
- **Interaction2Code** (ASE 2025, per the arXiv comment; [arXiv 2411.03292](https://arxiv.org/abs/2411.03292)) [RV identity and venue; SV numbers].
  - 127 pages and 374 interactions.
  - Failure (b), "element exists but does nothing", has a usability rate of 6.93%. Failures (a) and (j) have 0%.
  - Hover is excluded as "trivial". Focus, responsiveness and animation are not evaluated.
- **DesignBench** ([arXiv 2506.06251](https://arxiv.org/abs/2506.06251), v3 2026-03-15) [RV identity; SV numbers].
  - 900 samples across 6 issue categories: occlusion, crowding, text overlap, alignment, colour/contrast and overflow. Alignment is the most common at 42.2%.
  - Issue-detection accuracy is only 0.2714.
  - Code is rarely split into components: React 0.24%, Vue 5%, Angular 19%.
- **WebGen-Bench** ([arXiv 2505.03733](https://arxiv.org/abs/2505.03733)) [RV identity; SV numbers]: 647 tests. The best agent reaches 27.8% (Bolt.diy with DeepSeek-R1). Its functional score is 21.1, and appearance is graded by GPT-4o.
- **ArtifactsBench** (Tencent; [arXiv 2507.04952](https://arxiv.org/abs/2507.04952)) [RV identity; SV numbers]: 1,825 tasks rendered with Playwright at one 1024×768 viewport (no mobile). An MLLM judge scores them, with 94.4% ranking consistency with WebDev Arena.
- **FrontendBench** ([arXiv 2506.13832](https://arxiv.org/abs/2506.13832)) [RV identity; SV numbers]: 148 prompt–test pairs. Pass rates run from 66.89% to 83.11%.
- **WebCoderBench** ([arXiv 2601.02430](https://arxiv.org/abs/2601.02430), v3 2026-07-31) [RV identity; SV content].
  - 1,572 real requirements and 24 metrics across 9 perspectives.
  - Its **rule-based** checks include card structure and styling consistency, icon consistency, alignment, largest blank area, colour harmony, placeholder-image misuse, resource loading, and **horizontal overflow in an emulated mobile viewport**.
  - It treats consistency as *quality*.
- **Does It Render Everywhere?** (Guo, Xiao, Sun, Huo; [arXiv 2608.12518](https://arxiv.org/html/2608.12518), 2026-08-12) [RV].
  - Prevalence: "68% of generated webpages exhibit at least one compatibility issue" (139 of 203), against "24 incompatible webpages out of 60, yielding a failure rate of 40%" for human pages.
  - Cross-device-only failures: 67.5% generated vs 36.7% human. Cross-browser-only failures: 1.0% generated.
  - Root causes among the 139 broken pages: missing viewport meta 46.0% (64), missing flexible wrapping 29.5% (41), hard-coded dimensions 19.4% (27), hard-coded image size 10.1% (14).
  - Symptoms: shrink-to-fit 42.1%, overflow 23.1%, page-level failures overall 88.3%.
  - Its detector, XCompat, is "a deterministic offline analysis over pre-captured renderings", with precision 0.917, recall 0.889 and F1 0.903.
  - Eight generators were tested, including Cursor and v0.dev. Input is a screenshot (screenshot-to-code).
- **UI-Bench** (Jung, Garcinuno, Mateega; [arXiv 2508.20410](https://arxiv.org/html/2508.20410)) [RV].
  - 194 experts, 300 sites, 4,075 blinded pairwise matches. The question was "Which project would you be more likely to deliver to a client?"
  - Win rates: Orchids 67.5%, Figma Make 57.1%, Lovable 54.8%, Bolt 48.9%, v0 41.2%, Replit 38.9%.
  - "Lower performers converged on generic templates", with "call-to-action buttons colored in a generic blue repeated across several websites" and "repetitive card grids". Winning tools had "distinctive typography systems, coherent color programs, higher-quality imagery".
  - No inter-rater agreement is reported. The sites are "to be released soon".
- **SWE-WebDevBench** ([arXiv 2605.04637](https://arxiv.org/abs/2605.04637)) [RV identity; SV numbers]: six builder platforms. "No platform exceeds 65% Security Score". There are no responsive or accessibility metrics.
- **A11yn** ([arXiv 2510.13914v2](https://arxiv.org/html/2510.13914v2), updated 2026-09-07) [RV].
  - IR_Axe is "the ratio of WVS [weighted violation score] to the total number of DOM elements".
  - Table 2: GPT-5.1 0.13, Gemini 3 Pro 0.24, Claude Sonnet 4.6 0.45, base Qwen2.5-Coder-7B 0.40, A11yn 0.05.
  - The [v1 abstract](https://arxiv.org/abs/2510.13914v1) said "lowering the Inaccessibility Rate by 60% over the base model". The GPT-4.1 and Claude Sonnet 4 figures in sub-report 05 are not in v2.
- **Roadmap v3's two citations, re-checked:**
  - TaoD2C-Bench ([arXiv 2610.10374](https://arxiv.org/abs/2610.10374)) [RV identity] is about industrial design-to-code fidelity: 2,861 designs and an alignment F1 of 23.30.
  - EfficientUICoder (FSE 2026; [arXiv 2509.12159](https://arxiv.org/abs/2509.12159)) [RV identity] is token compression.
  - Neither defines SCS, CRR or RLI ([citation audit](https://arxiv.org/html/2610.10374); [SV](https://arxiv.org/html/2509.12159)).
- **Arenas:**
  - WebDev Arena is "constrained to Next.js-based React applications" in one file. 26% of votes are ties, about 18% are "both bad", and it publishes no style-bias analysis ([arena.ai blog](https://arena.ai/blog/webdev-arena)) [SV].
  - Design Arena weights each vote equally "with no filtering or editorial adjustment", so it has no style control ([designarena.ai/about](https://designarena.ai/about)) [SV].

#### Which of these metrics are deterministic and single-page computable

| Metric (source) | Needs a reference page or corpus? | Needs an ML model? | Computable in headless Chromium at scan time? |
|---|---|---|---|
| Cross-device overflow and shrink-to-fit ([2608.12518](https://arxiv.org/html/2608.12518)) | No | No (deterministic) | Yes: one extra mobile-viewport layout pass |
| Mobile horizontal overflow ([WebCoderBench](https://arxiv.org/abs/2601.02430)) | No | No | Yes |
| Placeholder or broken media, resource loading ([WebCoderBench](https://arxiv.org/abs/2601.02430)) | No | No | Yes |
| Card and icon consistency ([WebCoderBench](https://arxiv.org/abs/2601.02430)) | No | No | Yes, but defined as quality, not slop |
| Occlusion, overlap and overflow categories ([DesignBench](https://arxiv.org/abs/2506.06251)) | No | Detection in the paper is by MLLM | Partly: overlap and overflow are geometric |
| Block-Match, position, CIEDE2000 text colour ([Design2Code](https://arxiv.org/abs/2403.03163)); TreeBLEU ([WebCode2M](https://arxiv.org/abs/2404.06369)) | **Yes**, a reference page | No | No, not for a single page |
| DINOv3/UIClip similarity, Vendi score, inter-page tree edit distance ([2609.38183](https://arxiv.org/html/2609.38183), [2607.22928](https://arxiv.org/abs/2607.22928), [2610.21185](https://arxiv.org/abs/2610.21185)) | **Yes**, a corpus | Yes (embeddings) | No, not zero-LLM; offline calibration only |
| MLLM judge scores ([ArtifactsBench](https://arxiv.org/abs/2507.04952), [WebGen-Bench](https://arxiv.org/abs/2505.03733)) | No | Yes | No; optional off-by-default use only |

### Inferences
- **Convergence is real but corpus-level.** A single page can only be scored on features whose *prevalence differs* between AI-built and human pages. That makes per-feature likelihood ratios measured on a calibration corpus (#213) the right bridge from the literature to the score. Embedding-cluster membership is not.
- **The 2026 Lovable cohort contradicts a purple-centric fingerprint and partly supports others.** Purple is not mentioned there, colour was the least convergent dimension in Design Theater, and UI-Bench names "generic blue" CTAs. The cohort's defaults (Inter body, Playfair/Cormorant headings, dark hero, neutral canvas, card-grid hero) overlap with the shipped `slop_fonts`, `perma_dark_mode` and `icon_card_grid`. It is one class on one platform, with no human baseline.
- **Scan the full page.** "Hero regions on their own are markedly less convergent than whole pages", so detectors that only look above the fold understate convergence.
- **AI-differential evidence exists for mobile breakage only.** Mobile breakage is the only failure with a measured AI-vs-human difference (68% vs 40%), and it comes from screenshot-to-code generation, not prompt-to-landing-page builders. That gap in the study design matters before weighting it as a fingerprint.
- **Consistency is treated as good design.** WebCoderBench and DesignBench treat consistency and alignment as *quality*. Rules that penalise uniformity, such as #198's card-entropy rule, contradict the benchmark literature unless they are framed as template fingerprints and calibrated.

### Gaps
- There is still no same-metric AI-vs-human homogeneity comparison on landing pages. Boussioux's human anchor is planned, not done, and Design Creativity Bench is vendor-authored.
- No published style-bias analysis exists for WebDev Arena or Design Arena.
- No study measures motion, hover or focus states, `prefers-reduced-motion`, `tabular-nums` or unthemed browser surfaces in AI output. Sub-reports 01 and 05 searched and found none.
- Unreleased datasets: UI-Bench sites ("to be released soon"), Design Theater interfaces, Boussioux's 73 sites and LandingBench's 438 pages. I did not check release status beyond the papers.
- Goree's 32% and 44% figures could not be re-read in this session. ACM DL returned 403 and the paper is not on arXiv.

---

## Q2. Which computational-aesthetics metrics have validated correlation with human judgments, what do they cost to compute, and are any suitable for the Clean/Mild/Heavy score or only for reporting?

### Takeaway
Two metric families have solid web validation:
- **Colourfulness:** Hasler–Süsstrunk alone reaches r = .71 against website colourfulness ratings, and a full model reaches r = .88.
- **Visual complexity/clutter:** Reinecke's model reaches r = .80, and Miniukovich & De Angeli explain R² .43–.51 of aesthetics ratings.

Symmetry and balance barely track human judgments on desktop web: r from −.01 to −.16, and Reinecke & Gajos dropped them as perceptually invalid. Ngo's layout measures were validated on only 6 layouts.

None of these metrics has been validated as an AI-provenance signal. They are cheap to compute (single-pass pixel statistics on one screenshot, or arithmetic on DOM boxes), but they belong in a **report-only feature vector for calibration (#213)**, not in the Clean/Mild/Heavy weights.

### Cited Findings
- **Hasler & Süsstrunk 2003** ([PDF](https://infoscience.epfl.ch/record/33994/files/HaslerS03.pdf)) [SV] (pre-2024 classic).
  - Formula: rg = R − G, yb = ½(R + G) − B, and **M̂(3) = σ_rgyb + 0.3·μ_rgyb**, where σ_rgyb = √(σ_rg² + σ_yb²) and μ_rgyb = √(μ_rg² + μ_yb²).
  - "the correlation of M̂(3) with the experimental data is equal to 95.3%" (20 viewers, 84 natural images).
  - Category thresholds: not 0, slightly 15, moderately 33, averagely 45, quite 59, highly 82, extremely 109.
- **Reinecke, Yeh, Miratrix, Mardiko, Zhao, Liu, Gajos, CHI 2013** ([PDF](https://iis.seas.harvard.edu/papers/2013/reinecke13aesthetics.pdf)) [SV] (pre-2024 classic).
  - Data: 450 sites rated by 548 volunteers at 500 ms exposure.
  - Colourfulness model r = .88 (R² .78), with Hasler alone at r = .71. Complexity model r = .80 (R² .65).
  - Single metrics: X-Y-cut leaves r = .5; quadtree leaves only r = .28.
  - Symmetry, balance and equilibrium were "weak but significant" and pruned from the model.
  - The area coefficients are printed as ".000", so the complexity model cannot be rebuilt exactly.
- **Reinecke & Gajos, CHI 2014** ([PDF](https://kgajos.seas.harvard.edu/papers/reinecke14visual.pdf)) [SV] (pre-2024 classic).
  - 2.4M ratings from 39,975 people on 430 sites. Conditional R² .47 vs marginal R² .07.
  - Quadtree symmetry and balance "did not correspond to our perceptual judgments".
  - The dataset link now returns 404, per sub-report 06 [SV].
- **Miniukovich & De Angeli, "Computation of Interface Aesthetics", CHI 2015** ([DOI](https://doi.org/10.1145/2702123.2702575); numbers from the [Trento thesis](https://iris.unitn.it/retrieve/4428babf-9533-4673-b270-55d7adbd29f9/aesthetics_thesis_v1.2.12_final_1.pdf)) [SV] (pre-2024 classic).
  - Data: 300 screenshots of 75 sites rated by 62 participants. Inter-rater reliability ICC2k = .77 (150 ms) and .85 (4 s).
  - Pearson r with aesthetics (150 ms / 4 s):
    - clutter −.30/−.48
    - colour range .56/.33
    - figure-ground contrast .51/.37
    - contour congestion −.46/−.37
    - symmetry −.16/−.11
    - grid quality −.22/−.22
    - white space −.15/−.01
  - Higher symmetry and grid scores mean less ordered layouts.
  - Model R² = .49 (150 ms) and .43 (4 s).
  - In the mobile study, "users did value symmetry in mobile GUIs".
- **Aalto Interface Metrics (AIM)** ([repo](https://github.com/aalto-ui/aim); [metrics.json](https://raw.githubusercontent.com/aalto-ui/aim/aim2/metrics.json)).
  - MIT licence, default branch aim2, last push 2023-06-11, 66 stars [RV].
  - Implemented metrics include [SV]:
    - m4 contour density, m5 figure-ground contrast, m6 contour congestion
    - m7 subband entropy, m8 feature congestion
    - m15 Hasler–Süsstrunk colourfulness, m17 distinct HSV values
    - m19 RGB per dynamic cluster, m21 grid quality, m22 white space
  - It is a Python backend that takes screenshots with Selenium. The README says "certain metrics are extremely CPU intensive". No runtimes are published [SV].
- **Ngo & Byrne 2001** ([PDF](https://zbc.uz.zgora.pl/repozytorium/Content/58776/download)) [SV].
  - Formulas: balance BM = 1 − (|BM_v| + |BM_h|)/2; simplicity SMM = 3/(n_vap + n_hap + n); economy ECM = 1/n_size; density DM = 1 − 2|0.5 − Σa_i/a_frame|.
  - Validated on only **6 layouts** with median ratings and no correlation coefficient.
  - The 2003 *Information Sciences* version is bibliographically verified but paywalled ([DOI](https://doi.org/10.1016/S0020-0255(02)00404-8); citation audit).
- **What Makes a Visualization Image Complex?** (IEEE VIS 2025; [arXiv 2510.08332](https://arxiv.org/abs/2510.08332)) [RV identity; SV numbers]. These are charts, not webpages.
  - Data: 1,800 images and 349 participants. The PLS model reaches R² 0.41.
  - Coefficients: edge density .36, named-colour count (merged at ΔE ≤ 14) .28, feature congestion .08.
- **2026 AI-specific evidence (abstracts only):**
  - Vardar & Gümüş, *Electronics* 15(15):3458 ([DOI](https://doi.org/10.3390/electronics15153458)) [SEC: Crossref abstract]: 12 UIs and 62 participants. Raw AI UIs had the highest perceived complexity and 63.10% task accuracy, and metric–outcome correlations were "weak to moderate".
  - The same authors on posters, *Applied Sciences* 16(8):3669 ([DOI](https://doi.org/10.3390/app16083669)) [SEC]: padding ratio separated human from diffusion compositions at KS 0.76, Cohen's d 1.365, ROC-AUC 0.99. The direction of the difference is not stated.
- **Not found:** any study measuring colourfulness, whitespace, symmetry or complexity on v0, Lovable, Bolt or Cursor landing pages (sub-report 02) [SV].
- **Unverified numbers:**
  - Rosenholtz 2007 feature congestion validation ([DOI](https://doi.org/10.1167/7.2.17)) [UNV].
  - Zheng et al. CHI 2009 r values ([MSR page](https://microsoft.com/en-us/research/?p=693099)) [UNV].
  - ViCRAM, which reports only a "strong correlation" ([DOI](https://doi.org/10.1016/j.ijhcs.2020.102523)) [SEC].
  - Riegler & Holzmann 2018 ([DOI](https://doi.org/10.1093/iwc/iwy008)) [UNV].

### Inferences
- **Suitability table.** Cost estimates are mine, not published; inputs are one viewport screenshot at about 1280×800 or DOM boxes.

| Metric | Validated against humans? | Inputs | Estimated cost | Recommended use |
|---|---|---|---|---|
| Hasler–Süsstrunk M̂(3), with img/video/canvas boxes masked | Yes (r = .71 on websites) | Pixels | One pass, under 50 ms | Report and calibration feature; corroborates `gradient_*` and `aurora_*` |
| Dominant colour clusters in Oklab (≥0.1% of pixels, AIM m17 cutoff) | Yes (r = .61 with complexity, −.47 with aesthetics; AVI 2014) | Pixels | k-means or bucketing on a downsampled image, under 100 ms | Report; palette-size feature shared with #203 |
| Edge density (Canny), quality-70 JPEG bytes per pixel | Yes (clutter factor; edge density .36 in VIS 2025) | Pixels | Under 100 ms | Report |
| Feature congestion, subband entropy (AIM m7, m8) | Weak alone (feature congestion R² .11) | Pixels | Heavy; needs downsampling | Skip, or offline only |
| White-space ratio (union of DOM boxes) | Weak (r −.15 / −.01) | DOM boxes | Under 10 ms | Report |
| Grid quality G1–G4 (AIM m21, 2 px tolerance) | Modest (r −.22) | DOM boxes | Under 10 ms | Report; #198 template-regularity evidence |
| Ngo BM/EM/ECM/SMM; quadtree symmetry | Not perceptually valid on desktop web | DOM boxes | Under 10 ms | Fingerprint feature only after #213 lift; never cite as "aesthetics" |
| X-Y-cut leaves | Yes (r = .5 with complexity) | DOM boxes or screenshot | Under 50 ms | Report |

- **None should enter the Clean/Mild/Heavy score yet.** All of them correlate with *aesthetics or complexity*, not with *AI provenance*. The over-flagging problem is premium sites scoring as slop, and a craft-correlated metric would tend to push polished human sites the same way. Use them as covariates when calibrating: if slop score rises with "polish", the weights are penalising craft.
- **Runtime is not the constraint.** The rest of a scan dominates. The engineering constraint is that the page-eval script must be self-contained (AGENTS.md). Decoding the screenshot in-page via `createImageBitmap` and `OffscreenCanvas` (sub-report 02) avoids Node image dependencies.

### Gaps
- No published runtimes exist for AIM or any metric in a headless browser. The estimates above are mine.
- No human-rated *landing-page* aesthetics dataset is currently downloadable under a clear licence. The Reinecke and LabintheWild links return 404 and Webthetics was not found (sub-report 06).
- Rosenholtz, Zheng, ViCRAM and Riegler validation numbers could not be verified (paywalled or blocked).

---

## Q3. What prevalence base rates exist for the CSS and font features the shipped rules flag, and which shipped rules therefore carry high false-positive risk on the general web? (Includes a per-rule evidence table for all 27 shipped design rules.)

### Takeaway
Most shipped rules test features that were already common before ChatGPT:
- gradients on 75–77% of pages (2020–2022)
- backdrop-filter on 16.7% of Chrome page loads in Oct 2022, now 38.4%
- border-radius 85.7%, box-shadow 81.7%, text-transform 72.5% and letter-spacing 69.2% of page loads
- contrast failures on about 70% of sites, and low-contrast text on 83.9% of WebAIM home pages

The 2025 Web Almanac Generative AI chapter "tested for surges in gradients, shadows, and specific fonts, but found no statistically significant increases". Purple and indigo-500 use grew from about 0.02–0.03% to about 0.5% of pages, but stayed flat at "around 2% of Tailwind pages". That growth tracks Tailwind adoption (0.49% → 7.90% of mobile origins, Oct 2022 → Sep 2026). Inter sits at only about 1.4–1.5% of pages, so `slop_fonts` is specific on the general web but fires on premium SaaS (Linear, Vercel).

First-party data shows four premium sites over-flagged. A code reading plus my computation finds three engine-level defects:
- `isPurple()` misses Tailwind v3 `indigo-500`.
- The colour regexes cannot read Tailwind v4 `oklch()`/`oklab()` values.
- `centered_hero` double-counts the font signal.

### Cited Findings

#### Web-scale base rates
- **Fonts, Web Almanac** ([2024](https://almanac.httparchive.org/en/2024/fonts), [2025](https://almanac.httparchive.org/en/2025/fonts), [2022](https://almanac.httparchive.org/en/2022/fonts)) [SV; the 2024 Inter figure was independently confirmed by sub-reports 01 and 07].
  - Inter: 1.0% desktop and 1.1% mobile in 2024 ("The meteoric rise of Inter…"). In 2025 it is "roughly 1.4-1.5% of pages". It is not mentioned in 2022.
  - Geist is not reported in any edition.
  - system-ui: about 9.7% desktop and 9.3% mobile (2025), up from 4.0% and 3.6% (2022).
  - Google Fonts: about 54% desktop and 47% mobile (2025).
- **CSS, Web Almanac** ([2020](https://almanac.httparchive.org/en/2020/css), [2021](https://almanac.httparchive.org/en/2021/css), [2022](https://almanac.httparchive.org/en/2022/css)) [SV]. There is no CSS chapter after 2022.
  - Gradients: "used in 75% of pages" (2020); 77% desktop and 76% mobile (2021); linear-gradient 76% and radial 15% (2022).
  - backdrop-filter: 6% of pages (2020).
  - Custom properties: 43% (2022).
  - animation 77% and transition 85% of pages (2022).
- **Chrome Platform Status usage counters** (share of page loads; [CSS](https://chromestatus.com/data/csspopularity) and [feature](https://chromestatus.com/data/featurepopularity) JSON, values dated 2026-10-17) [RV].
  - CSS properties:
    - border-radius 85.71%, box-shadow 81.74%
    - text-transform 72.46%, letter-spacing 69.18%
    - background-clip 66.05%, backdrop-filter 38.38%, mask-image 30.60%
    - text-wrap 24.18%, color-scheme 23.51%, font-variant-numeric 9.42%
  - Features:
    - PrefersReducedMotionMediaFeature 57.48%, PrefersColorSchemeMediaFeature 45.39%
    - CSSColorMixFunction 19.35%, TextWrapBalance 2.97%, CSSLightDark 2.09%
  - There is no counter for `background-clip: text` specifically; only padding, content and border values are counted.
  - backdrop-filter history [SV, from the same endpoint's timeline]: 0.71% (Jun 2019) → 16.74% (Oct 2022, before ChatGPT) → 26.89% (Jul 2025) → 36.86% (Oct 2026 monthly mean). It jumped from 10.0% to 16.0% between Aug and Sep 2022.
  - Caveat: page loads are not pages. Whether a parsed-but-unapplied property counts is unverified (sub-report 07).
- **Generative AI chapter, Web Almanac 2025** (Liebel, Vekaria, Pagel; published 2026/01/15; [chapter](https://almanac.httparchive.org/en/2025/generative-ai)) [RV].
  - "Their use rose from 0.02% (purple) and 0.03% (indigo-500) in Q3 2022 to 0.49% (purple) and 0.54% (indigo-500) in Q4 2025".
  - On Tailwind pages, both lines fluctuate "around 2% of Tailwind pages".
  - "We also tested for surges in gradients, shadows, and specific fonts, but found no statistically significant increases."
  - Method caveat: "Our analysis relied solely on CSS variables… our figures represent a conservative estimate."
- **Technology prevalence, HTTP Archive tech report** ([API](https://cdn.httparchive.org/v1/adoption); Sep 2026; mobile/desktop share of origins) [SV].
  - Tailwind 7.90% / 8.12%, up from 0.49% / 0.68% in Oct 2022.
  - shadcn/ui 1.32% / 1.35%.
  - Next.js 4.63% / 4.93%, Vercel 1.85% / 2.03%, Webflow 0.69% / 0.98%, Framer Sites 0.133% / 0.189%.
  - Lovable 0.067% / 0.040% (5,812 mobile origins; tracked since 2025-12).
  - Bolt and v0 are not tracked.
  - W3Techs puts Tailwind on "0.3% of all websites" ([W3Techs](https://w3techs.com/technologies/details/cs-tailwind)) [SV]. Its denominator differs.
- **Per-site CSS value counts, Project Wallace "The CSS Selection 2026"** ([report](https://projectwallace.com/the-css-selection/2026); 100k+ homepages; authored CSS strings) [SV]: median unique colours 164, font sizes 47, font families 12, box-shadows 17. oklch is used by 1.89% of sites. There are no border-radius statistics.
- **Accessibility base rates:**
  - [Almanac 2025](https://almanac.httparchive.org/en/2025/accessibility) [SV]: about 70% of sites fail colour contrast, and "67% of sites explicitly removed default focus outlines". prefers-color-scheme is on about 13% of sites.
  - [WebAIM Million 2026](https://webaim.org/projects/million/) [SV]: low-contrast text on 83.9% of home pages.

#### First-party calibration evidence (this repo)
- **June scans** ([CALIBRATION.md](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/CALIBRATION.md); [corpus.json](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/packages/cli/calibration/corpus.json)) [REPO]:
  - Linear: Heavy 36.
  - Vercel: Heavy 29.
  - Stripe: Mild 23. `purple_accent` fired on the "brand blurple #533afd".
  - Supabase: Clean 8, with `gradient_backgrounds` firing on "37 elements!".
- **The file's own diagnosis** [REPO]: "`gradient_backgrounds` no longer discriminates **anything**", and `icon_card_grid`, `numbered_steps`, `stat_banner`, `centered_hero`, `perma_dark_mode` and `nested_cards` "are common to *every* modern marketing site".
- **Sept re-run** [REPO]: 5/13 = 38.5% accuracy. Linear 19, Vercel 17, Stripe 19. Supabase 8 → 20 and lovable.dev 9 → 15 regressed into Mild, and bolt.new rose to Heavy 31 against a Mild label.
- **Krebs's study, the source of rules 1–15** ([post](https://www.adriankrebs.ch/blog/design-slop/), 2026-04-20) [RV].
  - "A headless browser loads each site (Playwright)", and "Every pattern is a deterministic CSS or DOM check". Screenshots and LLM judging were deliberately not used.
  - False positives are self-reported: "my manual QA run verified it's maybe 5-10%".
  - Tiers over 1,590 submissions: High (4+ patterns) 22% (347), Medium (2–3) 32% (508), Low (0–1) 46% (735).
  - "A single pattern doesn't necessarily make a site AI-generated."
  - **No per-pattern prevalence is published.**
  - His listed items include "shadcn/ui", "emoji-icon navs" and "certain font pairings", which are not shipped. **They do not include an FAQ accordion.**

#### Engine-level defects that change false-positive and false-negative behaviour
- **`isPurple()` hue window.** It is HSL hue 240–295° with s ≥ 0.35 ([color.ts L60–64](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/packages/core/src/color.ts#L60-L64)) [REPO]. Run on Tailwind palettes [CALC, using the repo's own `rgbToHsl`/`isPurple` code]:
  - Returns **false for Tailwind v3 `indigo-500` #6366f1** (HSL hue 238.7°). That is the exact colour the Almanac measured and the one Adam Wathan apologised for ([post via mirror](https://x.com/adamwathan/status/1953510802159219096)) [SV].
  - Returns true for indigo-600 (243.4°) and all violet and purple shades.
  - Returns false for blue-500/600 (217–221°).
- **Brand colour vs framework default.** In OKLCH, Stripe's #533afd sits at hue 277.4° and Tailwind indigo-500/600 at 277.0–277.1° [CALC, Ottosson matrices]. So no hue window can separate this brand blurple from the framework default.
- **Tailwind v4 colours are serialized as `oklch()`/`oklab()`.**
  - Tailwind v4.3.3 declares its palette as `oklch()` (286 `oklch(` tokens in [theme.css](https://cdn.jsdelivr.net/npm/tailwindcss@4.3.3/theme.css)). Its compiler emits ``color-mix(in oklab, ${e} ${i}, transparent)`` for opacity modifiers ([tailwindcss-4.3.3 dist/lib.js](https://registry.npmjs.org/tailwindcss/-/tailwindcss-4.3.3.tgz)) [RV].
  - CSS Color 4: "The serialized form of oklch() and oklab() values is derived from the computed value and uses the oklab() or oklch() forms", with L serialized as a 0–1 number ([CSS Color 4 CRD, 9 Oct 2026](https://www.w3.org/TR/css-color-4/)) [RV].
  - CSS Color 5: for color-mix(), "the computed value is the mixed color, in the specified mixing color space" ([CSS Color 5 WD, 13 Sep 2026](https://www.w3.org/TR/css-color-5/)) [RV].
  - The shipped colour extractors are regexes for `rgb()`/hex only, so they cannot read these values [REPO]:
    - `purple_accent` gradient stops ([patterns.ts L104](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/packages/core/src/patterns.ts#L104))
    - `gradient_backgrounds` transparency filter, which treats unparsed stops as opaque (`hasOpaqueStop = !rgba`, [L175–176](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/packages/core/src/patterns.ts#L175-L176))
    - `colored_glows`, which skips any shadow string without "rgb" ([L274](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/packages/core/src/patterns.ts#L274)) and extracts only `rgb()`/hex colours ([L279](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/packages/core/src/patterns.ts#L279))
    - `effectiveBackground` gradient stops, which fall back to white ([color.ts L126](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/packages/core/src/color.ts#L126))
  - Solid fills are fine: `parseColor` normalizes through a canvas `fillStyle`, which accepts any CSS colour ([color.ts L12–27](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/packages/core/src/color.ts#L12-L27)) [REPO].
  - Scale: `color-mix()` runs on 19.35% of Chrome page loads [RV].
  - I could not run Chromium here (missing system libraries on the aarch64 host), so Chromium's actual serialization was **not empirically re-tested**. The claims above rest on the spec text plus the code.
- **Font signal counted twice.** `centered_hero` only triggers when the H1 is "set in a slop font" ([spec/patterns.md](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/spec/patterns.md)). So a centered Inter or Geist H1 always fires `slop_fonts` (8) and `centered_hero` (4): 12 points from one font choice [REPO].
- **`low_contrast_text` skips dark backgrounds.** The code has `if (bgLum < 0.6) continue; // light backgrounds only` ([patterns.ts L967](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/packages/core/src/patterns.ts#L967)) [REPO; citation audit].
- **`slop_fonts` reads the declared family.** It inspects the first family in the computed stack, not the rendered face ([fonts.ts](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/packages/core/src/fonts.ts)) [REPO].
  - The list covers 13 families, not just Inter and Geist: Space Grotesk, Instrument Serif, General Sans, Satoshi, Plus Jakarta Sans, Manrope, DM Sans, Cal Sans, Switzer and Clash Display.
  - Its comment "dm sans // shadcn/ui default" is unverified.
  - Tailwind v4's own default `--font-sans` is a system stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, …`) ([theme.css](https://cdn.jsdelivr.net/npm/tailwindcss@4.3.3/theme.css)) [RV]. So Inter and Geist come from scaffolds and templates, not from the framework.
- **Unverified prevalence claims in the repo.** `patterns.ts` and `spec/patterns.md` cite "~74%" (cream), "~76%" (crushed tracking) and "90%+" (low contrast) "per Impeccable data" [REPO]. Impeccable's rule registry has no prevalence fields ([registry.rs, main, 2026-10-19](https://github.com/pbakaus/impeccable/blob/main/crates/foundation/src/registry.rs)) [RV]. A GitHub code search for "prevalence" in the repo returns 0 hits, and a web search found nothing [RV]. **[UNV].**
- **Impeccable's own slop/quality split.** The registry tags 31 rules `slop` and 32 `quality` (my parse) [RV].
  - `gray-on-color`, `wide-tracking`, `text-overflow` and `line-length` are **quality**, not slop.
  - Tagged slop: `overused-font`, `gradient-text`, `ai-color-palette` ("Purple/violet gradients and cyan-on-dark…"), `side-tab` ("Thick colored border on one side of a card — the most recognizable tell of AI-generated UIs"), `cream-palette`, `nested-cards`, `dark-glow`, `radial-halo`, `radial-spotlight-glow`, `marquee`, `icon-tile-stack`, `italic-serif-display`, `hero-eyebrow-chip`, `kicker-above-heading`, `numbered-section-labels`, `monotonous-spacing`, `oversized-h1` and `extreme-negative-tracking` ([registry.rs](https://github.com/pbakaus/impeccable/blob/main/crates/foundation/src/registry.rs)).
  - Its flat-hierarchy rule is "less than 1.25× at every step", not slop-detect's "max/min < 2.0".
  - Impeccable is Apache-2.0 and was last pushed 2026-10-19 [RV].

#### Per-rule evidence table (the 27 rules in `patterns.ts` at d37e91c; no other rules exist there [REPO])
Key: FP risk is my rating for false positives on human-made pages (H high, M medium, L low). Weights are from [spec/patterns.md](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/spec/patterns.md).

| Rule (wt) | Supporting evidence | Contradicting / weakening evidence | Missing | FP risk |
|---|---|---|---|---|
| `slop_fonts` (8) | Inter 50% body, Playfair 35% and Cormorant 17% headings in the Lovable cohort ([2609.38183](https://arxiv.org/html/2609.38183)) [RV]; v0 and create-next-app default to Geist (sub-report 04, [create-next-app template](https://github.com/vercel/next.js/tree/canary/packages/create-next-app/templates/app-tw/ts/app)) [SV]; Krebs lists "Inter for most text" [RV]; Impeccable `overused-font` [RV] | Inter is only about 1.4–1.5% of pages (good specificity), but the Almanac found no significant font surge [RV]; fires on Linear (Inter) and Vercel (Geist, their own font) [REPO] | Geist and Manrope/DM Sans/Satoshi base rates; per-font AI-vs-human lift | M (H on premium SaaS) |
| `purple_accent` (8) | Almanac purple and indigo-500 0.02–0.03% → 0.49–0.54% of pages [RV]; Wathan post [SV]; Impeccable `ai-color-palette` [RV]; Krebs "purple palette" [RV] | Flat at about 2% of Tailwind pages, so it tracks Tailwind [RV]; no purple in the 2026 Lovable cohort, where trust-blue (11) and warm/earth (28) dominate [RV]; UI-Bench "generic blue" CTAs [RV]; colour is the least convergent dimension ([2607.22928](https://arxiv.org/abs/2607.22928)) [SV]; Stripe blurple fired [REPO]; misses v3 indigo-500 [CALC] | AI-vs-human CTA hue distribution | H (brand blurples), with false negatives on v3 indigo-500 |
| `gradient_text` (6) | Impeccable `gradient-text` ("a common AI tell, especially on headings and metrics") [RV] | None measured | Base rate of `background-clip:text` (no Chrome counter) [RV] | M (unknown) |
| `gradient_backgrounds` (4) | Krebs lists "gradients" [RV] | 75–77% of pages used gradients before LLMs [SV]; Almanac found no gradient surge [RV]; Supabase had 37 elements [REPO]; oklch stops are treated as opaque [REPO] | Area or salience-based variant | **H** |
| `accent_stripe` (6) | Impeccable `side-tab` "the most recognizable tell" [RV]; Krebs "colored card borders" [RV] | None measured | Prevalence; human docs callouts and alerts use left borders (my inference) | M |
| `glassmorphism` (4) | Krebs lists it [RV] | backdrop-filter on 16.74% of page loads in Oct 2022 (before ChatGPT), 38.38% now [SV/RV]; Apple Liquid Glass (iOS 26, 2025) as a trend confound (sub-report 07) [SV] | Area or salience variant | H |
| `colored_glows` (4) | Impeccable `dark-glow` [RV]; Krebs "colored glows/shadows" [RV] | Almanac found no shadow surge [RV]; box-shadow on 81.7% of page loads [RV]; misses Tailwind v4 `oklab()` shadow colours [REPO] | Prevalence of coloured vs neutral shadows | M (with false negatives on Tailwind v4) |
| `centered_hero` (4) | Krebs "centered hero headlines" [RV] | Needs a slop font, so it double-counts `slop_fonts` [REPO]; "common to every modern marketing site" [REPO] | Base rate | **H** |
| `hero_eyebrow_pill` (5) | Krebs "badges above H1s" [RV]; Impeccable `hero-eyebrow-chip` [RV] | Keyword gate already removed the Linear and Vercel false positives [REPO] | Prevalence | L–M |
| `all_caps_labels` (3) | Krebs "all-caps headings" [RV]; Impeccable `kicker-above-heading` [RV] | text-transform 72.5% and letter-spacing 69.2% of page loads (values not split) [RV] | Value-level base rate | H |
| `perma_dark_mode` (4) | 66% dark heroes in the Lovable cohort [RV]; Krebs "permanent dark mode" [RV] | No human baseline for dark-by-default; fired on Linear [REPO]; devtools sites are legitimately dark | Dark-by-default base rate | M–H |
| `icon_card_grid` (4) | Krebs "Identical feature cards, each with an icon on top" (citation audit); Card-Grid was the largest cluster (29%) [RV]; UI-Bench "repetitive card grids" [RV]; Impeccable `icon-tile-stack` [RV] | Fired on Linear, Vercel, Stripe and Supabase [REPO]; WebCoderBench rewards card consistency [SV]; grouping bug at patterns.ts:539, fixed only on unmerged 355f588 ([status map](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/packages/core/src/patterns.ts#L539)) [REPO] | Base rate | **H** |
| `numbered_steps` (3) | Krebs [RV]; LandingAgent's "section order" repetition [SV]; Impeccable `numbered-section-labels` (a different shape) [RV] | Fired on Linear and Vercel [REPO]; the table/nav fix is unmerged [REPO] | Base rate | H |
| `stat_banner` (3) | Krebs "stat rows" [RV] | Fired on Stripe [REPO] | Base rate | M |
| `faq_accordion` (2) | None found | Not in Krebs's list as fetched today [RV], so the attribution is [UNV] | `<details>` usage is not in the Almanac [SV] | M |
| `gradient_letter_avatars` (5) | Meng To's "fake avatars" is a general rule (citation audit) | "Gradient-letter avatars" are not in Meng To's files (citation audit); the repo's attribution to a "May 2026 tutorial" is [UNV] | Prevalence | L–M |
| `bento_grid` (4) | None found (added 2026.07 with no source) | Bento layouts predate AI tools (my inference; unsourced) | Any evidence | M |
| `aurora_mesh_gradient` (5) | Impeccable `radial-halo` and `radial-spotlight-glow` [RV] | None measured | Prevalence | L–M |
| `ai_sparkle_badges` (3) | None measured | Legitimate on real AI products (inference) | Any evidence | L |
| `cream_default_bg` (7) | Impeccable `cream-palette` (rule text only) [RV]; warm/earth accents in the Lovable cohort [RV] | The "~74%" figure is [UNV]; weight 7 rests on no measured data | Base rate | M |
| `low_contrast_text` (7) | Contrast is the top automated failure in LLM output (Q5) | 83.9% of human home pages fail ([WebAIM](https://webaim.org/projects/million/)) [SV]; LLM code had fewer contrast issues than human code (−49% for GPT-4o; [2503.15885](https://arxiv.org/abs/2503.15885)) [SV]; the "90%+" figure is [UNV]; dark backgrounds are skipped [REPO] | AI-vs-human differential | **H** as a fingerprint |
| `crushed_tracking` (5) | Impeccable `extreme-negative-tracking` [RV] | The "~76%" figure is [UNV]; fired on Vercel [REPO] | Negative-tracking base rate | M |
| `gray_on_color` (4) | Impeccable port [REPO] | Impeccable tags it **quality**, not slop [RV] | Prevalence | L (defect rule) |
| `oversized_hero_h1` (4) | Impeccable `oversized-h1` [RV] | None measured | Prevalence | L–M |
| `nested_cards` (4) | Impeccable `nested-cards` [RV] | Fired on Linear [REPO] | Prevalence | M |
| `wide_body_tracking` (3) | Impeccable port | Impeccable tags it **quality** [RV] | — | L (defect rule) |
| `flat_type_hierarchy` (3) | Impeccable `flat-type-hierarchy` [RV] | The shipped definition (max/min < 2.0) differs from Impeccable's (< 1.25× at every step) [RV/REPO] | Validation of either threshold | M (unknown) |

### Inferences
- **Presence-only rules on common features carry little information.** Box-shadow, radius, gradients, backdrop-filter, uppercase and letter-spacing are all near-universal. Their AI-vs-human likelihood ratios are probably close to 1 unless salience is measured: hero area share, hue, placement, or repetition across sections. Supabase's 37 gradient elements show how presence counts saturate.
- **Compare within the same stack.** The Almanac's Tailwind-normalized flat line is the strongest single argument that `purple_accent` and `slop_fonts` measure *stack defaults*, not AI. Calibrate them within stack (Tailwind or shadcn pages vs Tailwind or shadcn pages), and report a "made-with" provenance field (Q4) as a covariate.
- **Fix the engine before tuning weights.** The oklch/oklab extractor gap biases every Tailwind v4 page in two directions at once. It hides purple gradients and coloured glows, and it inflates `gradient_backgrounds`. Re-measuring #213 before fixing it would calibrate against a moving target.
- **Calibrate tiers against a false-positive target.** Brooks et al. set thresholds to flag ≤1% of pre-March-2022 articles ([arXiv 2410.08044](https://arxiv.org/abs/2410.08044)) [SV], and Pew found about 1% of pre-ChatGPT pages flagged ([Pew](https://www.pewresearch.org/data-labs/2026/08/20/methodology-ai-content/)) [SV]. Sample-size consequences [CALC]:
  - With zero false positives in 200 control pages, the 95% upper bound is still about 1.5% (rule of three, 3/n).
  - Estimating a 1% false-positive rate to ±0.5% needs about 1,520 pages (n = 1.96²·0.01·0.99/0.005²).
  - So #213's 200 URLs can rank patterns but cannot certify a false-positive rate.

### Gaps
- No base rates exist for:
  - Geist
  - dark-by-default surfaces
  - border-radius value distributions
  - share of `uppercase` labels and negative letter-spacing values
  - `<details>` use
  - coloured vs neutral shadows
  - `background-clip:text`
  - section-level patterns (bento grids, eyebrow pills, numbered steps, stat rows, FAQ)

  Searched: Almanac 2020–2025, Chrome counters, Wallace (sub-report 07 and this session).
- Krebs published no per-pattern prevalence for his 1,590 pages. The slopcop site was unreachable to the citation auditor.
- Chromium serialization of Tailwind v4 colours was not empirically tested here. The browser could not launch on this host.
- The Chrome counters' handling of parsed-but-unapplied properties is unverified.

---

## Q4. Which generator and template provenance markers are deterministic and near-zero-false-positive, and should they be scored or reported separately as "made-with" provenance?

### Takeaway
Several markers are deterministic, survive into production HTML, and are near-zero-false-positive for "made with X":
- Framer's `<meta name="generator" content="Framer …">` plus `data-framer-*` attributes.
- Webflow's generator meta plus `html[data-wf-site]`.
- Lovable's scaffold meta, Open Graph image, `/lovable-uploads/` paths and `cdn.gpteng.co/gptengineer.js`.
- v0's `generator: 'v0.app'` metadata. It was observed in v0-synced repos; how often deployed v0 sites carry it is unknown.
- create-next-app scaffold strings.
- shadcn/ui v4 `data-slot="card-header"`-style attributes and default theme variables.
- Exact Tailwind v4 palette strings.
- Magic UI and Aceternity class signatures.

`data-lov-id` is **not** a production marker. It came from older dev-mode builds of `lovable-tagger`, and the current version tags only through the React dev runtime. No runtime marker for Bolt was found. Wappalyzer's shadcn/ui rule keys on `--destructive-foreground`, which current shadcn themes no longer define (sub-report 04).

Because these tools are also used by humans at scale (Tailwind on 7.9% of origins, shadcn on 1.3%), report provenance as a separate `madeWith[]` field. Use it as a covariate for #207 and as a stratifier for #213, and do not score it. The one exception worth a small weight is "unedited scaffold" leftovers, such as the "Lovable Generated Project" description. Those indicate an unfinished page rather than AI as such.

### Cited Findings
- **Wappalyzer definitions** ([enthec/webappanalyzer](https://github.com/enthec/webappanalyzer), raw `src/technologies/*.json`, fetched 2026-10-19) [RV]:
  - Webflow: meta `generator: Webflow`, DOM `html[data-wf-site]`, JS `Webflow`.
  - Framer Sites: JS `__framer_importFromPackage`, scriptSrc `framerusercontent\.com`.
  - Lovable: meta `author: lovable`, DOM `link[href*='/lovable-uploads/']`, JS `LOV_SELECTOR_SCRIPT_VERSION`, scriptSrc `\.lovable\.app/`, cookie `lovable-preview-mode`, DNS TXT `lovable_verification=`.
  - shadcn/ui: only `css: ["--destructive-foreground"]`.
  - Base44: meta `apple-mobile-web-app-title: base44`.
  - Vercel: headers `x-vercel-id` and `x-vercel-cache`.
  - **No entries** for v0 or Bolt.new. The only "Bolt" entries are "Bolt CMS" and "Bolt Payments".
- **Live homepages, 2026-10-19** [RV]:
  - framer.com serves `<meta name="generator" content="Framer ec94ad0">`, 3,106 `data-framer-*` attributes and `framerusercontent.com` assets.
  - webflow.com serves `<meta content="Webflow" name="generator"/>` plus `data-wf-page`/`data-wf-site`.
  - These are the vendors' own sites, used as a check that the markers exist; I did not crawl customer sites.
- **lovable-tagger** ([npm](https://www.npmjs.com/package/lovable-tagger); MIT; latest 1.3.5, published 2026-09-25) [RV]:
  - Version 1.1.7 contains the attribute names `data-lov-id`, `data-lov-name`, `data-component-path`, `data-component-line`, `data-component-file`, `data-component-name` and `data-component-content` ([1.1.7 dist](https://unpkg.com/lovable-tagger@1.1.7/dist/index.js)).
  - Version 1.3.5 has **no** `data-` attribute strings. It overrides `react/jsx-dev-runtime` (`jsxDEV`) and stores source info under `Symbol.for("__jsxSource__")` and `window.sourceElementMap` ([1.3.5 dist](https://unpkg.com/lovable-tagger@1.3.5/dist/index.js)).
  - Because `jsxDEV` is used only in development builds, production builds carry no tagger markers (my inference from the code).
  - Lovable projects enable it only under `mode === 'development' && componentTagger()` ([huggingface/ai-deadlines vite.config](https://github.com/huggingface/ai-deadlines)) [SV].
- **Lovable scaffold `index.html`** ([example repo](https://github.com/darkhorse00512/ydy-React-tailwindCss)) [SV]:
  - `<meta name="description" content="Lovable Generated Project" />` and `<meta name="author" content="Lovable" />`.
  - `og:image` = `https://lovable.dev/opengraph-image-p98pqg.png` and `twitter:site` = `@lovable_dev`.
  - The `cdn.gpteng.co/gptengineer.js` script, with "DO NOT REMOVE" comment.
  - Whether Vite keeps that comment in production builds is unknown.
- **v0** ([MarcDelon/JaDa](https://github.com/MarcDelon/JaDa), [gitguti/wc-ai](https://github.com/gitguti/wc-ai)) [SV]: `app/layout.tsx` metadata has `generator: 'v0.app'`. Next.js renders `generator` as `<meta name="generator" content="…">` ([Next.js docs](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)) [SV]. Fonts use `Geist({ subsets: ["latin"] })` [SV]. v0.app's own homepage shows `data-v0-prompt-prehydration` [RV], but that is the tool's site, not a generated site.
- **create-next-app** ([template](https://github.com/vercel/next.js/tree/canary/packages/create-next-app/templates/app-tw/ts/app)) [SV]: `title: "Create Next App"`, `description: "Generated by create next app"`, Geist and Geist_Mono variables, the text "To get started, edit the page.tsx file", and `--background: #ffffff; --foreground: #171717;`.
- **shadcn/ui v4 components** ([button.tsx](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/button.tsx), [card.tsx](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/card.tsx); MIT; 125,935 stars) [RV]:
  - Rendered attributes: `data-slot="button"`, `data-slot="badge"`, and `data-slot="card"`, `card-header`, `card-title`, `card-description`, `card-action`, `card-content`, `card-footer`.
  - These are component JSX, so they reach production DOM (my inference from the source).
  - Default theme ([theming docs](https://ui.shadcn.com/docs/theming)) [SV]: `--radius: 0.625rem`, `--background: oklch(1 0 0)`, `--foreground: oklch(0.145 0 0)`, `--primary: oklch(0.205 0 0)`, `--destructive: oklch(0.577 0.245 27.325)`.
- **Tailwind v4 palette strings** ([theme.css](https://cdn.jsdelivr.net/npm/tailwindcss@4.3.3/theme.css)) [RV]: for example `--color-indigo-500: oklch(58.5% 0.233 277.117)`, `--color-violet-500: oklch(60.6% 0.25 292.717)`, `--color-zinc-950: oklch(14.1% 0.005 285.823)`, and radius tokens `--radius-lg: 0.5rem` and `--radius-2xl: 1rem`.
- **Component-library signatures** [SV]:
  - Magic UI marquee: `animate-marquee` with `[--duration:40s] [--gap:1rem]` ([magicui registry](https://magicui.design/r/marquee.json); [repo](https://github.com/magicuidesign/magicui)).
  - Magic UI shimmer button: `animate-shimmer-slide`.
  - Aceternity Spotlight: `<svg class="animate-spotlight … h-[169%] w-[138%] …" viewBox="0 0 3787 2842">` ([component page](https://ui.aceternity.com/components/spotlight)).
- **Bolt:** `.bolt/config.json` `{"template": "bolt-vite-react-ts"}` exists in repos but is not served; **no runtime DOM marker was found** ([example](https://github.com/kyryl-opens-ml/no-ocr)) [SV].
- **Precedents for fingerprints and near-duplicates:**
  - Bijmans et al., USENIX Security 2021 ([PDF](https://www.usenix.org/system/files/sec21-bijmans.pdf)) [SV]: exact-string phishing-kit fingerprints matched 1,504 domains, of which 61 were removed because "a fingerprint not being specific enough" (about 4.1%).
  - Manku, Jain, Das Sarma, WWW 2007 ([PDF](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/33026.pdf)) [SV]: 64-bit SimHash with "k = 3… precision and recall near 0.75", but for text near-duplicates (counters and ads), not templates with new copy.
  - Henzinger, SIGIR 2006 ([abstract](https://research-explorer.ista.ac.at/record/11929)) [SV]: "neither of the algorithms works well for finding near-duplicate pairs on the same site".
  - Gibson et al., WWW 2005 ([PDF](https://ra.ethz.ch/cdstore/www2005/docs/p830.pdf)) [SV]: templates are "40–50% of the total bytes on the web".
  - Jain et al., USENIX Security 2022 ([arXiv 2106.09820](https://arxiv.org/abs/2106.09820)) [RV identity; SV numbers]: on natural images at N = 500k, false-positive rates were dHash 0.16% (T = 4) and PDQ 0.11% (T = 70), and FPR grows with database size.
  - Meta's PDQ README: match distance ≤31 and quality threshold ≤49 ([README](https://github.com/facebook/ThreatExchange/blob/main/pdq/README.md)) [SV].
  - PhishIntention ([PDF](https://www.usenix.org/system/files/sec22-liu-ruofan.pdf)) [SV]: lab FPR 10⁻³ but 6.7% false alerts in the field.

### Inferences
- **Marker strength tiers** (my classification):

| Tier | Markers | Meaning |
|---|---|---|
| A: exact, vendor-emitted, production | Framer generator meta and `data-framer-*`; Webflow generator meta and `data-wf-site`; Lovable `meta author=Lovable`, `/lovable-uploads/`, `gptengineer.js`, Lovable OG image; `meta generator^="v0"`; Base44 app-title meta | "made with X" |
| B: scaffold left unedited | "Lovable Generated Project", "Create Next App" / "Generated by create next app", the create-next-app body text | "unfinished scaffold": a craft flag, plus an AEO negative because the share card is the builder's generic image |
| C: library or framework defaults | shadcn v4 `data-slot` compound names (`card-header`, `card-action`); ≥80% of shadcn `:root` variables exactly equal to a base-colour preset (threshold is my proposal); exact Tailwind v4 palette strings on CTAs; Magic UI and Aceternity class signatures (≥2 distinct, proposal) | "uses default kit X". Used by humans too. |

- **Do not score tiers A or C.** Scoring them would penalise every human Framer, Webflow, shadcn or Tailwind user, which is the pioneer-vs-clone problem in a new form. Their value is:
  1. Explaining a score ("12 of 27 points come from patterns shipped by default in shadcn/Tailwind templates").
  2. Stratifying #213, with a positive set of A-tier pages and a premium-human set with no defaults.
  3. Conditioning #207 confidence.
- **Template-clone hashing is research-grade.** SimHash or dHash against a bundled reference set of starter templates has no published false-positive rate for landing pages. Ship it only as report-only, behind "≥2 of {structural, visual, signature} agree" (sub-report 04).

### Gaps
- No runtime markers were found for Bolt, Replit Agent or Same.new. v0 marker prevalence on deployed sites is unknown.
- Whether Vite production builds keep the Lovable "DO NOT REMOVE" HTML comment is untested. BuiltWith counts were not checked.
- shadcn's `data-slot` naming may collide with other libraries that use `data-slot` (for example `data-slot="icon"`). Only the shadcn-specific compound names should count. Collisions were not measured.

---

## Q5. What do accessibility and responsive-design studies of AI-generated UIs find, which deterministic checks are justified, and which duplicate axe or Lighthouse?

### Takeaway
- **Contrast is everywhere, so it does not discriminate.** It is the dominant automated failure in LLM output (80–89% of violations), and it is equally dominant on the human web (83.9% of home pages).
- **LLM code beats human code on basics** such as alt text and labels.
- **Focus, keyboard and skip-link support fail heavily** when prompts don't ask for them.
- **Cross-device breakage is the only AI-differential deterministic finding:** 68% vs 40%, with a missing viewport meta tag behind 46% of AI failures.

Justified deterministic checks:
- viewport meta present and zoom not disabled
- reflow and overflow at 320/390 px
- a dynamic focus-indicator test
- target size at 24 px (but low prevalence, 4%)
- a reduced-motion emulation diff

The axe parity rules (label, button-name, link-name, image-alt, region, landmark) duplicate axe-core and Lighthouse, so they should be optional. These belong on a separate craft-floor/quality axis. Only viewport and reflow have shown AI-differential prevalence.

### Cited Findings
- **LLM vs human code:** Suh et al., "Human or LLM?" ([arXiv 2503.15885](https://arxiv.org/abs/2503.15885)) [RV identity; SV numbers].
  - Naive LLM inaccessibility rates "(0.347 and 0.348 vs. 0.425)" for human code.
  - "Contrast Issues… comprising 80% of all violations".
  - GPT-4o cut contrast issues by "nearly 49%" vs human code, but added ARIA violations.
- **Guriţă & Vatavu, W4A '25** ([DOI](https://doi.org/10.1145/3744257.3744266)) [SV, full PDF].
  - 80 generated UIs. Expert violation rate was 58.0% with an accessibility-agnostic prompt vs 19.0% with an accessibility-oriented one.
  - Agnostic vs oriented: landmarks 11% vs 94%, skip links 0% vs 100%, **focus indicators 56% vs 98%**, average touch target 32 px vs 44 px.
  - Both prompt styles "excelled" on 1.4.3 contrast in automated testing. There were reflow challenges.
- **Calò, Gurita, De Russis, CHI EA '26** ([DOI](https://doi.org/10.1145/3772363.3799364)) [SV]: "541 semantic violations that pass automated checks" across 300 UIs, led by generic buttons (27%) and vague links (26%).
- **CodeA11y, CHI '25** ([arXiv 2502.10884](https://arxiv.org/abs/2502.10884)) [RV identity; SV]: Copilot "failed to ensure adequate contrast between the hover color and background".
- **AIMAC** (GAAD Foundation and ServiceNow; [aimac.ai](https://aimac.ai)) [SV]. Share of LLM pages with at least one error: low contrast 86.9%, empty links 18.3%, missing labels 15.3%, **target size 4.0%**, empty buttons 3.9%.
- **Microsoft A11y LLM Eval** ([report](https://microsoft.github.io/a11y-llm-eval-report)) [SV]: "89.1% of axe WCAG failures" were colour contrast, and the overall control pass rate was 12%.
- **WebAccessBench** ([whitepaper](https://conesible.de/wab/whitepaper_webaccessbench.pdf); not peer-reviewed) [SV]: AI output had about 6.77–11.05 errors per 100 DOM elements vs about 4.06 for WebAIM 2025. Flagship models' more "visually stylized outputs" raise the number of issues detected.
- **A11yn v2** ([arXiv HTML](https://arxiv.org/html/2510.13914v2)) [RV]: GPT-5.1 0.13, Gemini 3 Pro 0.24, Claude Sonnet 4.6 0.45 (weighted axe violations per DOM element).
- **Cross-device study** ([arXiv 2608.12518](https://arxiv.org/html/2608.12518)) [RV]: 68% vs 40%; root causes missing viewport meta 46.0%, missing flex wrap 29.5%, hard-coded dimensions 19.4%; overflow 23.1%.
- **WebAIM Million 2025 → 2026** ([2026](https://webaim.org/projects/million/), [2025](https://webaim.org/projects/million/2025)) [SV]:
  - Pages with detected failures: 94.8% → 95.9%.
  - Average errors per page: 51 → 56.1.
  - Low contrast: 79.1% → 83.9%.
  - React and Next.js pages had fewer errors (−22.5% and −27.1% in 2026).
  - On AI, WebAIM only speculates that trends "likely reflect… 'vibe coding'".
- **Web Almanac 2025 accessibility** ([chapter](https://almanac.httparchive.org/en/2025/accessibility)) [SV]:
  - "67% of sites explicitly removed default focus outlines".
  - `:focus-visible` on about 25% of sites; `prefers-reduced-motion` on 49.99% (desktop) and 50.55% (mobile).
  - Zoom restricted on 19% of mobile and 21% of desktop sites.
- **Chrome counters, 2026-10-17** [RV]: PrefersReducedMotionMediaFeature on 57.48% of page loads; `color-scheme` property 23.51%; `font-variant-numeric` 9.42% ([feature](https://chromestatus.com/data/featurepopularity), [CSS](https://chromestatus.com/data/csspopularity)).
- **Normative basis** ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)) [SV]:
  - Level AA: 1.4.10 Reflow (320 CSS px), 1.4.4 Resize text, 2.4.7 Focus Visible, 2.4.11 Focus Not Obscured (Minimum), 2.5.8 Target Size (Minimum) at 24×24 with a spacing exception, 1.4.12 Text Spacing.
  - Level AAA: 2.3.3 Animation from Interactions, 2.4.13 Focus Appearance, 2.5.5 Target Size at 44×44.
  - Failure technique F78 covers `outline:none` with no replacement indicator.
- **axe-core and Lighthouse** [SV]:
  - axe-core is MPL-2.0 ([repo](https://github.com/dequelabs/axe-core)). It claims "on average 57% of WCAG issues automatically", and WCAG 2.2 rules including `target-size` are "disabled by default" ([rule-descriptions](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)). It has no rules for reflow, focus visibility or reduced motion.
  - Lighthouse weights `meta-viewport`, `label`, `button-name` and `image-alt` at 10, and `color-contrast` and `link-name` at 7 ([scoring](https://developer.chrome.com/docs/lighthouse/accessibility/scoring)).
- **Impeccable's framing** [SV for local files; RV registry]:
  - Its README splits detector rules into "AI slop" vs "general design quality".
  - Its registry tags `text-overflow`, `line-length`, `gray-on-color` and `wide-tracking` as quality.
  - It says "A clean detector run is evidence, not proof of visual or accessibility quality" ([craft-floor.md](https://github.com/pbakaus/impeccable/blob/skill-v4.6.0/skill/reference/craft-floor.md); [registry.rs](https://github.com/pbakaus/impeccable/blob/main/crates/foundation/src/registry.rs)).

### Inferences
- **Checks justified by evidence, with exact definitions:**
  1. **`viewport_meta_missing` / `zoom_disabled`.**
     - Definition: fire when no `meta[name=viewport]` has `width=device-width`. Separately, `user-scalable=no` or `maximum-scale < 2` fails SC 1.4.4, matching axe `meta-viewport`.
     - Evidence: 46.0% root cause; 19–21% of the web restricts zoom.
     - False positives: near zero.
  2. **`mobile_reflow_overflow`.**
     - Definition: emulate an `isMobile` viewport at 390×844 (informative) and 320 px wide (SC 1.4.10, normative). Fire if `document.scrollingElement.scrollWidth − innerWidth > 8`, or if a visible element has `getBoundingClientRect().right > innerWidth + 8`.
     - Exclusions: elements inside an ancestor with `overflow-x` of auto, scroll, hidden or clip; marquee or scroll-snap tracks; `table`, `pre`, `canvas`, maps (WCAG's two-dimensional exception).
     - False positives: off-canvas drawers, decorative bleed. The human failure rate in the source study is high (36.7% device-only, n = 60).
  3. **`focus_indicator_missing`.**
     - Definition: send real Tab presses to the first N = 20 focusables. Compare computed `outline-*`, `box-shadow`, `border-color`, `background-color` and `text-decoration` before and after focus, with a pixel-diff fallback on the element's box plus 4 px. Fire if any of the first 5 focusables, or ≥30% of all tested, show no change.
     - A static `outline:none` scan would over-flag, since 67% of the web removes outlines.
  4. **`target_size_minimum`.**
     - Definition: run axe's `target-size` explicitly, or measure boxes under 24×24 with the 24 px spacing circle, excluding inline links.
     - Prevalence in LLM pages is only 4.0%, so it gives low lift.
  5. **`reduced_motion_ignored`** (a modifier on #197).
     - Definition: inventory `document.getAnimations()`, then reload with `reducedMotion: 'reduce'` emulated. Fire if non-essential infinite or transform/opacity animations still run.
     - It is AAA-adjacent, so report it as informational.
- **Axe parity rules duplicate axe and Lighthouse.** Offer them as an optional `--a11y axe` integration (MPL-2.0 is fine to call, not vendor) rather than re-implementing them.
- **Separate axis for the craft floor.** Contrast, focus, targets and reflow are defects on human sites too, and Impeccable tags the overflow, line-length and grey-on-colour rules as quality. Put them on an "A11y / craft floor" axis scored like Lighthouse (pass/fail weighted by severity). Only viewport and reflow have AI-differential evidence. Even those come from screenshot-to-code studies, so give them weight in the slop score only after #213 shows lift on builder-made landing pages.
- **`low_contrast_text` (weight 7).** It is the single largest weak-discrimination contributor and a candidate to move to the quality axis, or at least to cut weight once #213 data exists.

### Gaps
- Not found:
  - Bolt-specific audits
  - category-level axe or Lighthouse breakdowns for Lovable or v0 output
  - measured AI rates for hover states, reduced-motion support or text-spacing resilience
  - absolute axe runtime figures (AccessLint claims only "12× faster than axe-core at median"; [benches](https://www.accesslint.com/core/benches/)) [SV]
- The Aljedaani W4A '24 numbers ([DOI](https://doi.org/10.1145/3677846.3677854)) are secondary only, because ACM returned 403 [SEC].

---

## Q6. What do learned UI quality models (UIClip etc.) imply for an optional, off-by-default model-based signal?

### Takeaway
No learned model or public dataset labels "AI slop". Each predicts something else:
- generic design quality: UIClip and AUV-Bench
- synthetic defects: UIClip's JitterWeb
- conversion outcomes: WiserUI-Bench
- professional preference: UI-Bench

UIClip weights are MIT-licensed and small (151M parameters, CPU-feasible). It scores "well-designed" on pairs of a page and its own damaged copy, at 75.12% accuracy, but only 57.89% on real app screens. CLIP priors "erroneously associated… dark, unreadable backgrounds with better design".

LLM judges show strong position bias, leniency (+0.808 on a 1–5 scale) and near-chance pairwise accuracy. Human inter-rater agreement itself is low (α ≈ 0.37).

Any model-based signal must therefore be **optional, off by default, and offline**. Its job is to be a "craft" covariate for calibration (#213), revealing when the slop score is penalising polish. It must never be part of the Clean/Mild/Heavy score.

### Cited Findings
- **UIClip** (Wu, Peng, Li, Swearngin, Bigham, Nichols; [arXiv 2404.12500](https://arxiv.org/abs/2404.12500); UIST 2024 per the project page) [RV identity; SV numbers].
  - JitterWeb is "a synthetic dataset of 2.3 million examples". BetterApp has 892 human-rated pairs from 12 designers, with Krippendorff's α = 0.37.
  - Best pairwise accuracy is 75.12%. On real app screens it drops to 57.89%. GPT-4V scored 51.58%.
  - The HF model cards say MIT for both variants ([model card](https://huggingface.co/biglab/uiclip_jitteredwebsites-2-224-paraphrased_webpairs_humanpairs)) [RV]. The base `openai/clip-vit-base-patch32` card says deployed use "is currently out of scope" [SV].
- **UICrit** (Duan et al., UIST 2024; [arXiv 2407.08850](https://arxiv.org/abs/2407.08850)) [RV identity].
  - 3,059 critiques on 983 mobile UIs. Fleiss' κ 0.30 and 0.31. Only 13.1% of Gemini comments were valid [SV].
  - Licence CC BY 4.0 ([dataset](https://github.com/google-research-datasets/uicrit)) [SV].
- **DesignRepair** (ICSE 2025 per the arXiv comment; [arXiv 2411.01606](https://arxiv.org/abs/2411.01606)) [RV identity and venue; SV numbers].
  - Detection is done by GPT-4 over Playwright-extracted DOM data. On 127 v0 issues it reaches 92.1% recall and 87.3% precision, against 32.3% and 55.4% for the rule-based UIS-Hunter.
  - Code is Apache-2.0.
- **WiserUI-Bench** (ACL 2026 Main; [arXiv 2505.05026](https://arxiv.org/abs/2505.05026)) [RV identity; SV numbers]. Its labels are A/B conversion winners. o1 scores 16.56% when the winner is shown first and 97.78% when it is second. Licence CC BY-NC-SA 4.0.
- **AUV-Bench** ([arXiv 2609.34854](https://arxiv.org/abs/2609.34854)) [RV identity; SV numbers]. About 1,395 web UIs rated by 44 designers. Single-rater α 0.368 and ICC(1,3) 0.637. GPT-5.4 inflation is +0.808. Data licence "other".
- **MLLM as a UI Judge** ([arXiv 2510.08783](https://arxiv.org/abs/2510.08783)) [RV identity; SV numbers]: Pearson 0.69–0.73 on absolute ratings, but only about 52–60% on pairwise choices.
- **WebDevJudge** ([arXiv 2510.18560](https://arxiv.org/abs/2510.18560)) [RV identity; SV numbers]: the best judge agrees with humans 70.34% of the time, against 84.56% human–human agreement.
- **PerceptUI** ([arXiv 2606.05697](https://arxiv.org/abs/2606.05697)) [RV identity; SV numbers]: zero-shot judges reach a rank correlation of about 0.41–0.44 with LabintheWild aesthetics ratings.
- **Duan, Warner, Li, Hartmann, "Generating Automatic Feedback on UI Mockups with Large Language Models"** ([arXiv 2403.13139](https://arxiv.org/abs/2403.13139); arXiv comment "To appear at ACM CHI 2024") [RV identity and venue; SV numbers]: GPT-4 precision 0.603 against 0.829 for humans, and it over-applies guidelines.

### Inferences
- **Proposed optional harness, with no scan-time model.** For example `bun run calibrate --oracle uiclip`, offline:
  1. Compute UIClip "well-designed" scores for each #213 corpus page.
  2. Report the Spearman correlation between slop score and UIClip score within each label stratum.
  3. A positive correlation among human-labelled pages means the detector is penalising craft.
  - Keep model weights out of the npm packages. Download them on demand, and record the model ID and hash in the report.
- **Licences.** UIClip weights (MIT) and UICrit (CC BY 4.0, with attribution) are usable. WiserUI-Bench (NC-SA) is internal research only. AUV-Bench and Design Arena data are unclear. API-model labelling is subject to provider terms; UIClip's authors note that provider terms "prohibit using their model outputs to train other models" [SV].
- **LLM judges are a poor slop oracle.** Their biases point toward polished and dark looks (the CLIP prior) and toward whichever item is shown second. Use blinded human pairwise labels with three or more raters and Bradley–Terry aggregation, following UI-Bench and AUV-Bench, as #213's ground truth. Use model scores only as covariates.

### Gaps
- No study scores v0 or Lovable output with UIClip, and UIClip's training code was not found (sub-report 06).
- No study tests whether judges prefer gradient-heavy or "modern SaaS" styling.

---

## Q7. Design-system consistency: which metrics exist for token adherence (DTCG 2025.10, OKLab/CIEDE2000 thresholds, spacing and type scales, radii), and how do Tailwind v4 oklch() computed colours and color-mix() affect matching?

### Takeaway
Deterministic adherence metrics have a clear industry precedent:
- stylelint coverage rules: Primer, Polaris, stylelint-scales, declaration-strict-value
- Figma Check designs, which separates an exact "Match" from a near-value suggestion
- Project Wallace uniqueness ratios, with web percentiles

The colour threshold should be **ΔE_OK 0.02**, the CSS Color 4 JND. For comparison, ΔE2000's JND is 2 and CIE76's is about 2.3.

The shipped matcher is a per-channel ±10 sRGB tolerance, an L∞ distance. By my computation it accepts up to ΔE_OK 0.145 near black (about 7 JNDs) and rejects sub-JND shifts as small as 0.0018 on yellow.

Tailwind v4 makes this worse. Its palette is `oklch()` and its opacity modifiers compile to `color-mix(in oklab, …)`. Per CSS Color 4 and 5, computed values serialize as `oklch()`/`oklab()`, which `parseCssColor()` cannot parse. Matching then falls back to an exact string match, so even an identical colour fails when DESIGN.md writes `oklch(58.5% …)` and the browser serializes `oklch(0.585 …)`.

Two token formats are relevant:
- **DTCG 2025.10:** a stable Final Community Group Report, not a W3C Standard, with Format, Color and Resolver modules. Colour values are objects, references can use `$ref`, and it gives no ΔE guidance.
- **google-labs-code/design.md:** version "alpha", with 11 lint rules. Its elevation section has no token schema.

### Cited Findings
- **Perceptual thresholds:**
  - CSS Color 4 ([CRD 9 Oct 2026](https://www.w3.org/TR/css-color-4/)) [SV; citation audit; date RV]: "let JND be 0.02". Because Oklab lightness runs 0 to 1, "one JND is 100 times smaller" than ΔE2000's 2. "ΔEOK is simply the Euclidean distance in Oklab color space."
  - Ottosson, per css-color-4 PR #10063, "considers the scale of the _a_ and _b_ coordinates a mistake"; they "should be roughly doubled" ([public-css-archive](https://lists.w3.org/Archives/Public/public-css-archive/2024Mar/0369.html)) [SV].
  - "ΔE*ab ≈ 2.3 corresponds to a JND" refers to **CIE76**, not CIEDE2000 ([Wikipedia: Color difference](https://en.wikipedia.org/wiki/Color_difference)) [SV].
- **The shipped matcher in Oklab terms** [CALC, from [system.ts L218–229](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/packages/core/src/system.ts#L218-L229) and Ottosson's matrices]:
  - Worst case accepted at a ±10 cube corner: #000000 ΔE_OK 0.1448; #0f172a 0.0505; #3b82f6 0.0338; #6366f1 0.0334; #ffffff 0.0301.
  - Smallest single-channel shift of 11 that gets rejected: #facc15 ΔE_OK 0.0018; #22c55e 0.0026; #3b82f6 0.0072.
  - This confirms sub-report 03's arithmetic exactly.
- **Tailwind v3 vs v4 for the same named colour** [CALC; [v4 theme.css](https://cdn.jsdelivr.net/npm/tailwindcss@4.3.3/theme.css)]: ΔE_OK is 0.019–0.035 between a v3 hex shade and its v4 oklch shade (indigo-500 0.027, indigo-600 0.032, violet-600 0.034, blue-500 0.019).
- **Code facts** [REPO]:
  - `parseCssColor()` handles only hex, `rgb()` and `hsl()` ([L173](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/packages/core/src/system.ts#L173)). Anything else, such as oklch or named colours, gets an "exact normalized string only" match ([L228](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/packages/core/src/system.ts#L228)).
  - The CTA opacity regex reads alpha only from `rgba()`, so semi-transparent `oklab(… / 0.5)` CTAs count as opaque ([L323](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/packages/core/src/system.ts#L323)).
  - Radius tokens go through `parseFloat`, so `0.5rem` becomes 0.5 px ([L264](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/packages/core/src/system.ts#L264)).
  - Only `borderTopLeftRadius` between 3 and 64 px is sampled ([L314](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/packages/core/src/system.ts#L314)).
  - `spec/system.md` claims "CIELAB `ΔE ≤ 12`" and "`ΔE ≤ 14`" ([L22–24](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/spec/system.md)), but no ΔE code exists. The implementation status map says the same.
- **Serialization facts** [RV]:
  - CSS Color 4: computed oklch()/oklab() values keep that notation, with L serialized as a 0–1 number. For the legacy sRGB forms (hex, `rgb()`, `hsl()`, named), "the corresponding sRGB value is used", which serializes as `rgb()`/`rgba()`.
  - CSS Color 5: color-mix() computes to "the mixed color, in the specified mixing color space" ([CSS Color 5](https://www.w3.org/TR/css-color-5/)).
  - Tailwind 4.3.3 emits ``color-mix(in oklab, ${e} ${i}, transparent)`` for opacity modifiers ([tarball](https://registry.npmjs.org/tailwindcss/-/tailwindcss-4.3.3.tgz)).
  - Chrome: `color-mix()` on 19.35% of page loads ([feature counters](https://chromestatus.com/data/featurepopularity)).
- **DTCG 2025.10** ([Format](https://www.designtokens.org/TR/2025.10/format/), [Color](https://www.designtokens.org/TR/2025.10/color/), [Resolver](https://www.designtokens.org/TR/2025.10/resolver/)) [SV; citation audit verified status and colour objects].
  - Status: "Final Community Group Report", 28 Oct 2025, "considered stable", "not a W3C Standard nor is it on the W3C Standards Track". `tr.designtokens.org/format/` now redirects to the drafts, so pin `/TR/2025.10/`.
  - Files: `.tokens`/`.tokens.json`, media type `application/design-tokens+json`.
  - Tokens and types: a token is an object with `$value`. `$type` is resolved from the token itself, then from a referenced token, then from the closest parent group. Tools "MUST NOT attempt to guess the type".
  - Names: token and group names must not contain `{`, `}` or `.`, and must not begin with `$`.
  - References: curly-brace `{group.token}` and JSON Pointer `$ref` (which tools "MUST support"). Circular references are an error.
  - Groups: `$root` and `$extends`.
  - Value constraints: dimension units are only `px` or `rem`; duration units only `ms` or `s`; `fontWeight` is 1–1000 or named aliases.
  - Colour: `colorSpace` and `components` are required, alpha defaults to 1, and the `hex` fallback is 6-digit. 14 colour spaces are listed, including oklch and display-p3. There is **no ΔE guidance**.
  - Resolver: `.resolver.json` with sets, modifiers, `resolutionOrder` and `default`.
- **Tool support** [SV]:
  - Style Dictionary added 2025.10 structured colours in v5.3.0 (2026-02-09), dimension objects in v5.4.0, and durations in v5.7.0 (2026-10-16) ([docs](https://styledictionary.com/info/dtcg/)).
  - Tokens Studio defaults to its "legacy format" ([docs](https://docs.tokens.studio/manage-settings/token-format)).
  - Penpot exports the Tokens Studio flavour, "not DTCG 2025.10" ([thread](https://community.penpot.app/t/token-export-is-tokens-studio-format-not-dtcg-2025-10/10544)).
- **google-labs-code/design.md** ([repo](https://github.com/google-labs-code/design.md), [spec](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md)): Apache-2.0, 28,421 stars, last pushed 2026-10-16 [RV]. Per sub-report 03 [SV]:
  - "The DESIGN.md format is at version `alpha`."
  - Tokens go in YAML front matter or in fenced `yaml` blocks per section.
  - Colours accept any CSS colour string, including `oklch()`, `oklab()` and `color-mix(in srgb, …)`. "All color values are internally converted to sRGB for WCAG contrast checking."
  - Dimension units: px, em, rem.
  - Elevation has no token schema.
  - The CLI offers `lint`, `diff` and `export --format dtcg`.
  - 11 lint rules: `broken-ref` (error), `missing-primary`, `contrast-ratio` (4.5:1 on component background/text), `orphaned-tokens`, `missing-typography`, `section-order`, `unknown-key`, `token-like-ignored`, `token-summary`, `missing-sections`, `omitted-rules`.
- **Adherence tooling precedent** [SV]:
  - `@primer/stylelint-config`: rules `primer/colors`, `primer/spacing`, `primer/typography`, `primer/borders` and `primer/box-shadow` ([repo](https://github.com/primer/stylelint-config)).
  - stylelint-polaris: "promote Polaris Design System adoption and coverage" ([README](https://raw.githubusercontent.com/Shopify/polaris/main/stylelint-polaris/README.md)).
  - stylelint-scales: rules for font-sizes, line-heights, radii, space and z-indices; "You and the designers should define the scales together" ([repo](https://github.com/signal-noise/stylelint-scales)).
  - `scale-unlimited/declaration-strict-value` ([repo](https://github.com/AndyOGo/stylelint-declaration-strict-value)).
  - Figma Check designs: "labeled as a **Match** when the value exactly matches an existing variable", and "does not use LLMs" ([help](https://help.figma.com/hc/en-us/articles/39592284074263-Check-designs-in-Figma)).
  - Impeccable has its own `design-system-font` and `design-system-font-size` quality rules ([registry.rs](https://github.com/pbakaus/impeccable/blob/main/crates/foundation/src/registry.rs)) [RV].
  - Project Wallace css-analyzer: MIT, last pushed 2026-10-15 [RV]. It computes `uniquenessRatio = size / total` per value collection [SV] ([repo](https://github.com/projectwallace/css-analyzer)).
  - Project Wallace css-design-tokens is **EUPL-1.2** (copyleft), so do not vendor it ([repo](https://github.com/projectwallace/css-design-tokens)) [SV].
  - Prior art for #204: dembrandt and design-extract already ship DTCG and DESIGN.md extraction plus MCP servers (citation audit).
- **Scales** [SV]:
  - IBM Carbon spacing uses "multiples of two, four, and eight" (2/4/8/12/16/24/32/40/48/64/80/96/160 px) ([Carbon](https://carbondesignsystem.com/elements/spacing/overview/)).
  - A modular type scale is a ratio-based sequence ([Tim Brown, A List Apart, 2011](https://alistapart.com/article/more-meaningful-typography/); pre-2024 classic).
- **Academic violation detection** [SV unless noted]:
  - GVT (ICSE 2018; [arXiv 1802.04732](https://arxiv.org/abs/1802.04732)) [RV identity]: 98% precision and 96% recall on synthetic violations.
  - UIS-Hunter (ICSE 2021; [program page](https://2021.icse-conferences.org/details/icse-2021-papers/87/)): precision 0.81 and recall 0.90 on Android, but only 32.3% recall on v0 web issues (via DesignRepair).
  - Mehta et al. 2026 ([arXiv 2607.20690](https://arxiv.org/abs/2607.20690)) [RV identity]: injected-violation method over about 10,000 generated pages.
- **Unverified:** a "375-site token drift audit" (40.4% average coverage) [SEC/UNV; source returned 403].

### Inferences
- **Tolerance policy.** Write this into `spec/system.md` (DTCG gives no guidance):
  - Convert both declared and computed values to Oklab. Accept every CSS Color 4 notation (`oklch`, `oklab`, `lab`, `lch`, `color(srgb|display-p3 …)`, `hwb`, `none`, percentages, `/ alpha`).
  - **Match** at ΔE_OK ≤ 0.02. **Near-miss** at 0.02 < ΔE_OK ≤ 0.05; the 0.05 bound is heuristic. **Off-palette** above 0.05.
  - Report near-misses separately, following Figma's Match vs suggestion split, and count them as half-credit or zero by product choice.
  - Compare alpha separately, within ±0.02.
  - Because v3 and v4 shades of the same name differ by 0.019–0.035, a v3 hex DESIGN.md scanned against a v4 site will mostly land in near-miss. That is the correct, explainable outcome; the current outcome is total drift.
  - Optional refinement: weight a and b by 2 (Ottosson), documented as a deviation from CSS Color 4.
- **Computed-value collection.** Collect raw computed strings in the page, as now, and do all parsing in Node with one shared CSS Color 4 parser. Use the same parser for the design axis. The canvas `fillStyle` route works in the page but clips to 8-bit sRGB. That is acceptable for ΔE ≈ 0.02 (quantization is about 0.002–0.004 ΔE_OK; my estimate) but loses P3 colours.
- **Spacing and type scales are heuristics, not evidence-backed thresholds.** The ±1 px spacing match on 4/8 grids and the ±8% type-scale band have only precedent, no validation. Express adherence as a coverage ratio scored with the existing `tierForRatio` cut-offs (0.8 / 0.5), and calibrate on fixtures with injected violations (the GVT and Mehta method).
- **Wallace's authored-CSS percentiles are only an upper bound** for rendered-value inflation (for example, median font sizes 47). Authored strings over-count, since `1.2em` and `120%` are counted separately.

### Gaps
- There is no formal psychophysical study of ΔE_OK JNDs on displays. The 0.02 figure is CSS Color 4's rescaling of ΔE2000's 2 plus informal tests ([Keith Cirkel](https://www.keithcirkel.co.uk/whats-my-jnd/)) [SV].
- Unchecked: whether `design.md export --format dtcg` emits 2025.10 colour objects or hex strings, and the exact `$type` strings for gradient and typography (sub-report 03).
- Chromium's serialization of Tailwind v4 colours was not empirically tested on this host (see Q3).

---

## Q8. Roadmap implications: a verdict for each of #196, #197, #198, #199, #203, #204, #207 and #208, with evidence and acceptance-criteria changes, plus NEW candidate items

### Takeaway
- **#203 and #204** are the best-evidenced design and system items. Keep them, with amended acceptance criteria. #203 is a P0 correctness fix, because the oklch exact-string fallback produces false drift on Tailwind v4 sites.
- **#207** is strongly supported by the evidence and should land before any new weighted rules.
- **#196 and #197** are practitioner-backed only. Relabel them, re-scope them to deterministic and dynamic definitions, and ship new rules at weight 0 until #213 shows lift.
- **#198** should be re-scoped. Drop `div_soup_ratio`. Treat the layout geometry metrics as report-only template-regularity features, and move collision/overflow to a quality axis.
- **#199** should be amended. Base rates show that missing `tabular-nums` and `color-scheme` are the norm on human sites, and APCA is informational only.
- **#208** is a DX feature. Keep it and relabel it as not research-backed.
- **New, highest-value additions:**
  - a CSS Color 4 colour-parsing fix across both axes
  - an OKLCH-based purple definition
  - a separate `madeWith` provenance field
  - viewport and reflow checks on a quality axis
  - a report-only computational-aesthetics vector for calibration

### Cited Findings
**Evidence by issue.** Sources are as cited in Q1–Q7. Issue bodies are from `/tmp/roadmap-v4/issue-NNN.json`.

- **#196 (Potemkin UI tells).** The issue proposes `boxed_lucide_icons`, `fake_macos_terminal`, `dead_shell_interactions` and `fake_logo_bar` at weight 4 each.
  - Icon tiles: practitioner rules only. Meng To's "A rounded-square icon tile sits above every feature heading" (citation audit), Impeccable's `icon-tile-stack` ("every generator outputs this exact shape") [RV], and Krebs's icon-topped cards [RV]. Together these largely duplicate the shipped `icon_card_grid` [REPO].
  - Fake terminals: no source of any kind (citation audit). The nearest practitioner rule is Impeccable's `blinking-cursor` [RV].
  - Dead interactions: Interaction2Code's failure type "element exists but does nothing" [SV] and Design Theater's claimed-but-unbuilt functionality [SV]. Both measure generated *interactive apps*, not landing-page footers. There are no prevalence data for `href="#"`.
  - Logo bars: Meng To's "duplicated logos" (citation audit). Placeholder company names are unsourced.
  - Sketch2Code citation: fabricated (citation audit).
- **#197 (motion monoculture).**
  - No benchmark measures motion in AI output; they either exclude animation or judge it with an MLLM [SV].
  - Practitioner backing: Meng To's "Motion theater… identical reveals, marquee… no reduced-motion path" (citation audit), and Impeccable's `marquee` and `bounce-easing` slop rules [RV].
  - Base rates: animation 77% and transition 85% of pages (2022) [SV]. Reduced-motion media query on about 50% of pages [SV] and 57.48% of page loads [RV].
  - Library signatures are exact strings [SV]: Magic UI `animate-marquee` `[--duration:40s]`, and Aceternity `animate-spotlight` `viewBox="0 0 3787 2842"`.
  - TaoD2C citation: fabricated (citation audit).
- **#198 (layout entropy / TreeBLEU).**
  - Convergence is measured, but at corpus level only (Q1).
  - Single-page geometry metrics are weakly validated: grid quality r −.22, symmetry r −.01 to −.16, and Reinecke & Gajos dropped symmetry. Ngo's measures were validated on 6 layouts (Q2).
  - Consistency is rewarded by WebCoderBench and misalignment is the defect in DesignBench [SV].
  - `div_soup_ratio` is contradicted: WebSight synthetic HTML "average[s] 647 tokens, 19 tags, and a DOM depth of 5", far smaller than real pages (citation audit).
  - Collision and overflow are real *defect* categories: DesignBench's occlusion, text overlap and overflow; overflow on 23.1% of pages in 2608.12518 [RV]; Impeccable's `text-overflow` (quality) [RV].
  - Impeccable's `monotonous-spacing` slop rule [RV] and Meng To's "identical vertical padding" (citation audit) back the spacing-monotony idea as practitioner rules.
- **#199 (browser surfaces / tabular-nums / APCA).**
  - The Impeccable browser-surfaces quote is verbatim; `color-scheme` is slop-detect's own extrapolation (citation audit).
  - Base rates: `color-scheme` property on 23.51% and `font-variant-numeric` on 9.42% of page loads [RV]. Missing tabular numerals is therefore the default on the human web.
  - APCA is not in the WCAG 3 draft (citation audit).
  - The zinc example already fails WCAG 2 at 4.12:1; the real gap is that `low_contrast_text` skips dark backgrounds (citation audit; [L967](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/packages/core/src/patterns.ts#L967)).
  - Contrast fails on 83.9% of human home pages [SV].
- **#203 (Oklab ΔE plus spacing and type scales).**
  - Evidence: CSS Color 4 JND 0.02 [SV]; serialization rules [RV]; Tailwind v4 oklch palette and color-mix output [RV]; the code gap [REPO]; my matcher arithmetic [CALC]; v3/v4 same-name ΔE of 0.019–0.035 [CALC].
  - Defects: `spec/system.md`'s CIELAB claim is false [REPO], and the rem radius bug [REPO].
  - Helmlab citation: fabricated (citation audit).
- **#204 (DTCG 2025.10 and DESIGN.md extraction).**
  - DTCG facts as in Q7 [SV]. Tool lag: Tokens Studio legacy default, Penpot, Style Dictionary v5.7.0 [SV].
  - design.md is alpha with 11 lint rules and a DTCG export [SV]. Competitors dembrandt and design-extract (citation audit). Wallace's css-design-tokens is EUPL-1.2 [SV].
  - DESIGN.md has no shadow, motion or z-index tokens, so those checks need DTCG input [SV].
- **#207 (co-occurrence confidence, presets, waivers).**
  - Krebs: "A single pattern doesn't necessarily make a site AI-generated" [RV].
  - The cluster over-fire in CALIBRATION.md [REPO].
  - The Almanac's null result and Tailwind-tracking purple [RV].
  - Correlated detectors: Brooks et al.'s two detectors agreed on only 45 of 156 and 96 flags [SV].
  - `centered_hero` structurally double-counts `slop_fonts` [REPO].
  - Waivers: Impeccable `ignore-value` takes an *optional* reason (citation audit). HN critique: "blame most of them on TailwindUI and shadcn" (citation audit).
- **#208 (selectors, bounding boxes, annotated screenshots).**
  - Precedents for located violations: GVT and UIS-Hunter report violation locations [SV], and Figma Check designs points at layers [SV].
  - VisualWebBench and Design2Code are only loosely relevant (citation audit).
  - Today `--screenshot` only adds a base64 viewport PNG ([status map](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/packages/cli/src/detector.ts#L402-L405)) [REPO].

### Inferences

#### Verdicts and acceptance-criteria changes

| Issue | Verdict | Acceptance-criteria changes |
|---|---|---|
| **#196** | **RELABEL** (practitioner-backed) **+ RE-SCOPE** | (1) Fix the `icon_card_grid` parent-grouping bug first (unmerged 355f588). (2) Fold `boxed_lucide_icons` into `icon_card_grid` as an evidence field (tile size 32–56 px, radius ≥ 6 px, tinted background) instead of a new weight. (3) Replace the static `dead_shell_interactions` with the dynamic `dead_cta_controls` (N8 below). (4) Ship `fake_macos_terminal` and `fake_logo_bar` at **weight 0** (evidence only) until #213 shows lift; suggested promotion bar is P(trigger\|AI)/P(trigger\|human) ≥ 3 with a non-zero AI count, my proposal. (5) Remove the `research:backed` label and the Sketch2Code citation. (6) Add a hard criterion: none of the new rules fires on the premium human set (Linear, Vercel, Stripe, Supabase) or the pre-2022 control. |
| **#197** | **RELABEL** (practitioner-backed) **+ AMEND** | (1) Detect motion from `document.getAnimations()` plus computed `animation-name`, `animation-iteration-count` and transforms, not class-name regexes. (2) Marquee: an infinite linear animation translating a track whose children contain ≥2 identical sequences. Its Magic UI or Aceternity signature counts as provenance (N11). (3) Scroll fade-up: before any scroll, count below-the-fold elements with computed opacity ≤0.01 and translateY 8–60 px; fire at ≥6 across ≥3 sections. This needs no scroll simulation, consistent with the issue's own criterion. (4) Cursor spotlight: radial-gradient overlays that read `--mouse-x`/`--mouse-y` (or similar) custom properties. (5) Reduced motion: re-run with `reducedMotion:'reduce'` and report persisting motion as a modifier (N10). (6) Drop the TaoD2C citation. All three rules ship at weight 0 until lift data exists. |
| **#198** | **RE-SCOPE** | (1) Drop `div_soup_ratio`; its evidence is contradicted. (2) Drop the TreeBLEU and Design2Code framing, which is reference-based. (3) Re-scope `symmetric_section_monotony` and `uniform_card_box_entropy` into one report-only `section_template_repetition` (N5), labelled as a template fingerprint and explicitly *not* validated aesthetics. (4) Move `bounding_box_collision` to the quality axis as `text_overflow_collision`, with exemptions for intentional overlaps (positioned decorations, `z-index` layers, `aria-hidden`). (5) Output raw metrics (grid quality G1–G4, Ngo BM/EM, padding CV) as evidence. (6) Mark every threshold (0.04, 0.12, IoU 0.08) as a heuristic pending #213. |
| **#199** | **AMEND / RE-SCOPE** | (1) Extend `low_contrast_text` to dark backgrounds using WCAG 2 math. (2) Report `apcaLc` alongside `wcagRatio` as **informational only**, worded as "APCA, a candidate method; not in the current WCAG 3 draft". (3) `unthemed_browser_surfaces`, heuristic A (dark surface without `color-scheme: dark`): ship at weight 0 and test on the premium human set first. (4) Heuristic B (`tabular-nums`): restrict to numerals that change at runtime (counters or tickers, detected by text mutation within 3 s) or tables with ≥3 numeric columns; otherwise report-only. (5) Consider moving `low_contrast_text` and `gray_on_color` to the quality axis, since Impeccable itself tags `gray-on-color` as quality. |
| **#203** | **KEEP (P0) + AMEND** | (1) Parse every CSS Color 4 notation and colour-mix result, including `none`, percentages and `/ alpha`, in system.ts **and** in the design-axis regexes (N1). (2) Use ΔE_OK with Match ≤ 0.02, near-miss 0.02–0.05 (reported separately) and off-palette > 0.05. Replace the issue's "0.035 ≈ 1 JND" (citation audit). (3) Fixtures: token `oklch(58.5% 0.233 277.117)` vs computed `oklch(0.585 0.233 277.117)` must be a Match (it fails today). Token `#4f46e5` vs computed v4 indigo-600 must be a near-miss (ΔE_OK 0.032 [CALC]). A semi-transparent `oklab(…/0.5)` CTA must not count as opaque. (4) Fix radii: convert rem and em, and check all four corners. (5) Align `spec/system.md` with the code; the CIELAB ΔE ≤ 12/14 claim is false. (6) `spacing.scale` and `typography.scale` report coverage ratios with `tierForRatio`. Thresholds (±1 px, ±8%, 75%) are labelled heuristics, and the checks skip `clamp()`/viewport-unit values. (7) Swap Helmlab for CSS Color 4 and Ottosson, and rename "Manhattan" to "per-channel L∞". |
| **#204** | **KEEP + AMEND** | (1) Pin links to `/TR/2025.10/` and say "W3C Community Group Final Report", not "W3C standard". (2) The parser handles object colour `$value` (`colorSpace`, `components`, `alpha`, `hex`), `{alias}` and `$ref` JSON Pointers, `$root`, `$extends`, and group `$type` inheritance. Circular references and invalid names are errors. Tools "MUST NOT" guess types. (3) A lenient import mode for Tokens Studio legacy files (and Penpot exports), flagged as non-conformant. (4) `--extract-tokens` output must round-trip through Style Dictionary ≥ 5.7 or a DTCG schema validator in CI. (5) Lint parity: reuse design.md rule names (`broken-ref`, `contrast-ratio`, `orphaned-tokens`, …) for overlapping checks. (6) Do not vendor EUPL-1.2 code from Wallace's css-design-tokens. (7) Note the overlap with dembrandt and design-extract in the issue. |
| **#207** | **KEEP (raise priority; land before new weighted rules) + AMEND** | (1) Define "strong tells" by measured lift on #213, not by fiat. (2) Estimate pairwise co-occurrence on the human control and discount correlated pairs. Make `centered_hero` independent of `slop_fonts` (drop the slop-font requirement) or cap the pair at 8 combined. (3) Presets become weight profiles with documented rationale, not just filters (today presets only filter; [presets.ts](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/packages/core/src/presets.ts)). (4) Use `madeWith` (N11) as a conditioning covariate; for example, structural tells on a Framer or Webflow template count as template conventions. (5) Waivers record an optional `reason`; making it mandatory is a product choice. (6) Measurable criterion: Heavy false-positive rate ≤ 2% on the premium-human set plus the pre-2022 control, reported with a confidence interval (Q3 sample-size note). |
| **#208** | **KEEP (DX) + RELABEL** (not research-backed) | (1) Locations also cover DESIGN.md drift items (offending CTA, surface, heading). (2) Inject the overlay only **after** all DOM and pixel measurements, and remove it before any pixel metric (N13), so annotations cannot contaminate scoring. (3) At most 5 locations per pattern. Selectors prefer `id` or `data-*` attributes, falling back to an `nth-of-type` path. (4) Off by default, and warn that annotated screenshots may contain personal data. (5) Feed SARIF `region` and `logicalLocations` (#211). |

#### NEW candidate items
Priorities: P0 = correctness, ship next; P1 = high value, low risk; P2 = experimental at weight 0; P3 = research or later. Thresholds marked "heuristic" are my proposals, pending #213.

| ID | Axis | Exact deterministic definition | Evidence | False-positive risk | Priority |
|---|---|---|---|---|---|
| **N1 `css_color4_parsing`** (engine fix) | 01 + 03 | Replace the rgb/hex-only regexes ([patterns.ts L104](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/packages/core/src/patterns.ts#L104), L175–176, L274, L279; [color.ts L126](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/packages/core/src/color.ts#L126); [system.ts L187, L323](https://github.com/ravidsrk/slop-detect/blob/d37e91c18a55ad901106d41828b318bdac27fa15/packages/core/src/system.ts#L187)) with a tokenizer for `rgb`, `hsl`, `hwb`, `lab`, `lch`, `oklab`, `oklch` and `color()`, with `none` and `/ alpha`. Acceptance: Tailwind v4 fixtures (`bg-indigo-500`, `bg-indigo-500/50`, `shadow-indigo-500/50`, a from/to gradient) produce the same triggers as their v3 hex equivalents | CSS Color 4 and 5 serialization [RV]; Tailwind 4.3.3 theme and compiler [RV]; color-mix on 19.35% of page loads [RV]; Tailwind on 7.9% of origins [SV] | None (correctness). It removes false positives (opaque-gradient inflation) and false negatives (glows, purple gradients) | **P0** |
| **N2 `purple_accent` hue redefinition** | 01 | Classify in OKLCH: hue 268°–310°, C ≥ 0.10, L 0.35–0.80 (heuristic), replacing HSL 240–295°. It includes Tailwind indigo, violet and purple, v3 and v4 (277°, 293°, 302–304°), and excludes blue-500/600 (260–263°) [CALC]. Lower the weight and require co-occurrence (#207) | Almanac purple/indigo-500 [RV]; HSL misses #6366f1 [CALC]; Stripe blurple at 277.4° [CALC] | Still H for brand blurples, which no hue rule can avoid. Hence co-occurrence and provenance conditioning | P1 |
| **N3 `framework_default_accent`** (provenance, not scored) | 01 (madeWith) | Primary CTA background within ΔE_OK ≤ 0.02 of a Tailwind v3 or v4 default 500/600 shade (blue, indigo, violet, purple) or shadcn's default `--primary` → `madeWith += "tailwind-default-accent"` | Almanac: indigo-500 variable on 0.54% of pages, about 2% of Tailwind pages [RV]; UI-Bench "generic blue" [RV]; Wathan [SV] | Every Tailwind user who keeps the defaults, so report only | P1 |
| **N4 `serif_display_inter_body`** (evidence field on `slop_fonts`) | 01 | h1/h2 primary computed family ∈ {Playfair Display, Cormorant Garamond, Cormorant, Fraunces, Instrument Serif} **and** ≥60% of `p`/`li` text elements' primary family ∈ {Inter, DM Sans}. Confirm the faces are loaded via `document.fonts` (status `loaded`) | Lovable cohort: Playfair 35% and Cormorant 17% headings, Inter 50% and DM Sans 12% body [RV]; Impeccable `italic-serif-display` [RV]; Krebs "certain font pairings" [RV] | Editorial, hospitality and luxury human sites. Adds specificity, not coverage, since `slop_fonts` already fires on ≥60% Inter | P2 |
| **N5 `section_template_repetition`** (report-only; replaces #198's two rules) | 01 | For each top-level section with height ≥ 180 px, take a signature: display type, grid or flex column count, child count bucket (1, 2–3, 4–6, 7+), and the dominant card tuple (border-radius, padding rounded to 4 px, box-shadow present). Score = share of sections whose signature occurs ≥3 times. Also output the padding coefficient of variation and AIM-style grid quality G1–G4 | Hero-only less convergent than full page [RV]; LandingAgent "repeats… section order" [SV]; Impeccable `monotonous-spacing` [RV]; contradicted by WebCoderBench and DesignBench treating consistency as quality [SV] | H on design-system-driven human sites, so weight 0 until lift | P3 |
| **N6 `mobile_reflow_overflow`** | Quality / craft floor | As defined in Q5 item 2 (390×844 informative, 320 px normative; overflow > 8 px; listed exemptions) | 68% vs 40%, overflow 23.1% [RV]; WebCoderBench mobile overflow [SV]; WCAG 1.4.10 [SV] | Human rate is high (36.7%), so not a fingerprint | P1 |
| **N7 `viewport_meta_missing` / `zoom_disabled`** | Quality / craft floor | As defined in Q5 item 1 | 46.0% of AI failures [RV]; zoom restricted on 19–21% of the web [SV]; axe `meta-viewport` and Lighthouse weight 10 [SV] | Near zero (a true defect) | P1 |
| **N8 `dead_cta_controls`** (replaces #196 static heuristic) | 01 (weight 0) or quality | For up to 12 visible CTA-like elements (`a` or `button` with text ≤ 40 characters and a filled background or `role=button`) in the first two viewports: intercept navigation (Playwright route abort), click, and watch 500 ms for a URL or hash change, any DOM mutation, a dialog or popup, a focus move, or a network request. It is dead if none occurs. Fire if the primary hero CTA is dead or ≥30% of CTAs are dead (heuristic). Record static `href` of `#`, empty or `javascript:` as evidence | Interaction2Code (b) [SV]; Design Theater [SV]; WebGen-Bench functional 21.1 [SV] | Handlers that only fire analytics (counted as network, so alive); consent overlays; side effects, which interception mitigates | P2 |
| **N9 `focus_indicator_missing`** | Quality / craft floor | As defined in Q5 item 3 | SC 2.4.7 and F78 [SV]; W4A '25 56% vs 98% [SV]; 67% of sites remove outlines [SV] | Indicators drawn by pseudo-elements or `:focus-within` parents; the pixel-diff fallback mitigates | P2 |
| **N10 `reduced_motion_ignored`** (modifier) | 01 (#197) or quality | As defined in Q5 item 5 | Reduced-motion query on about 50% of pages and 57.48% of page loads [SV/RV]; Meng To "no reduced-motion path" (citation audit) | Essential motion (spinners under 48 px exempt) | P2 |
| **N11 `madeWith[]` provenance** (separate output, never scored) | New output field | The tier A and C markers in Q4: generator metas, `data-framer-*`, `html[data-wf-site]`, Lovable meta/OG/uploads/gptengineer, `meta generator^="v0"`, Base44 meta, shadcn v4 `data-slot` compound names, shadcn default-theme match (≥80% of `:root` variables exact; heuristic), Tailwind v4 palette strings, Magic UI and Aceternity signatures | Wappalyzer rules [RV]; live markers [RV]; lovable-tagger analysis [RV]; shadcn source [RV]; scaffolds [SV] | None for "made with X". Not evidence of AI | **P1** |
| **N12 `scaffold_defaults_unedited`** | 01 (small weight) and AEO | Any of: `meta[name=description][content="Lovable Generated Project"]`, `og:image` = `https://lovable.dev/opengraph-image-p98pqg.png`, `<title>Create Next App</title>`, `meta[name=description][content="Generated by create next app"]`, the body text "To get started, edit the page.tsx file" | Scaffold sources [SV] | Near zero for "unedited scaffold". Being unfinished is not AI-specific | P1 |
| **N13 `aesthetics_vector`** (report-only) | Calibration output | Hasler–Süsstrunk M̂(3) with media masked; Oklab dominant-colour count (clusters ≥0.1% of pixels); Canny edge density; JPEG-70 bytes per pixel; DOM white-space ratio; grid quality G1–G4 (2 px tolerance); X-Y-cut leaf count. All on one downsampled viewport screenshot plus DOM boxes | Q2 validations [SV] | Not scored, so not applicable | P3 |
| **N14 `template_clone`** (report-only; needs a reference set) | madeWith | A 64-bit SimHash over 4-gram shingles of (tag + sorted class tokens) for the first ~256 above-the-fold element nodes, plus dHash or PDQ of the hero crop (PDQ quality gate ≥ 50). Compare against a versioned set of starter-template hashes in `spec/`. Emit only when ≥2 of {structural, visual, signature} agree | Manku k=3 [SV]; Jain et al. FPR [SV]; PDQ README [SV]; PhishIntention lab-to-field gap [SV] | Unknown for landing pages; paid template marketplaces will match | P3 |
| **S1 `colors.*` ΔE_OK two-band matching** | 03 | As in the Q7 tolerance policy | Q7 | Low | **P0** (#203) |
| **S2 `coverage.<class>`** | 03 | For each property class (text, background and border colour; font-size; line-height; letter-spacing; margin, padding and gap; border-radius on all 4 corners; box-shadow), the share of visible elements whose computed value matches a declared token, both by count and by area. Skip user-agent defaults and cross-origin iframes. Tier with `tierForRatio` (0.8 / 0.5) | Primer, Polaris, stylelint-scales, Figma Check designs [SV] | User-agent styles and third-party widgets (excluded); fluid type | P1 (extends #203) |
| **S3 `typography.styles` / `typography.inflation`** | 03 | Composite tuple match (family, size ±0.5 px, line-height ratio ±0.05, letter-spacing ±0.25 px; heuristics). Inflation = distinct rendered sizes, rounded to 0.5 px, divided by declared sizes | stylelint-scales [SV]; Wallace font-size p50 47 (upper bound) [SV]; Impeccable `design-system-font-size` [RV] | `clamp()` and viewport units | P2 |
| **S4 `contrast.component-pairs`** | 03 | The rendered equivalent of design.md's `contrast-ratio` lint rule: for each matched component, text vs effective background ≥ 4.5:1 | design.md lint source [SV] | Image backgrounds (skipped) | P2 |
| **S5 `elevation.shadows` / `motion.tokens`** | 03 (DTCG only) | Parse computed `box-shadow` layers against DTCG shadow tokens (same layer count; offsets and blur ±1 px; colour ΔE_OK ≤ 0.02). Parse `transition`/`animation` durations and easings against `duration` and `cubicBezier` tokens | DTCG §9 [SV]; DESIGN.md has no such tokens [SV] | Tailwind's transparent zero ring layers (strip them) | P3 (needs #204) |
| **S6 `tokens.unused` (info) / `tokens.deprecated-in-use` (warn)** | 03 | Share of declared tokens never observed, informational only. Separately, rendered values matching only `$deprecated` tokens | design.md `orphaned-tokens` [SV]; DTCG `$deprecated` [SV] | A landing page legitimately uses only a subset | P3 |
| **S7 system parser fixes** | 03 | Fenced `yaml` blocks; unitless `spacing`; rem and em radii; four-corner radii; spec/system.md accuracy | design.md spec [SV]; code [REPO] | None | **P0** |
| **C1 calibration protocol** (for #213) | All | Three sets: (a) a pre-Nov-2022 Wayback control (fonts judged as declared), (b) a contemporary premium human set, (c) a builder positive set stratified by `madeWith`. Report each pattern's likelihood ratio with a CI. Set the Heavy threshold at ≤1–2% FPR on (a)+(b). State that 200 URLs cannot certify FPR | Brooks et al. [SV]; Pew [SV]; Kobak excess-over-baseline ([arXiv 2406.07016](https://arxiv.org/abs/2406.07016)) [SV]; Ainsworth et al. find "at most only 17.9%" of composite mementos temporally coherent and complete ([PDF](https://hvdsomp.info/papers/Papers/2015/ht15-ainsworth-submission.pdf)) [SV] | Archive replay damage (drop captures missing CSS) | P1 |
| **C2 shipped-rule hygiene** | 01 | (a) Remove or source the "~74%", "~76%" and "90%+" claims. (b) Fix the `faq_accordion` (Krebs) and `gradient_letter_avatars` (Meng To) attributions. (c) Align `flat_type_hierarchy` with a stated definition (Impeccable uses < 1.25× per step). (d) Make `gradient_backgrounds` salience-based (≥15% of viewport area across ≥2 sections, heuristic) or drop it as a standalone rule, as CALIBRATION.md itself proposes | Q3 table | Reduces false positives | P1 |

#### Sequencing implication
1. N1 and S1/S7 (#203), so measurements are correct.
2. #207, with N11 as a covariate.
3. #213 measurement using the C1 protocol and the N13 vector.
4. Promote experimental rules (#196, #197, N4, N5, N8) only on measured lift.

Put the quality-axis items (N6, N7, N9) in a craft-floor axis that does not feed Clean/Mild/Heavy.

### Gaps
- Lift data does not exist for any proposed rule. Every promotion decision depends on #213.
- No prevalence data exist for fake terminals, `href="#"` footers, placeholder company names, scroll fade-ups, marquees or cursor spotlights in AI-built vs human pages (Q1 and the citation audit).
- How Chromium serializes Tailwind v4 computed colours, and the end-to-end behaviour of N1, must be confirmed with a real browser fixture. It could not be run on this host.
- Whether builder-hosted production sites (`*.lovable.app`, v0 deployments) keep the A/B-tier markers at scale is unmeasured. A crawl of the HTTP Archive Lovable origins (5,812 mobile) would answer it.
