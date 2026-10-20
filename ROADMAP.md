# Slop Detector: Roadmap v4

> **Deterministic, zero-LLM checks for the AI-generated web**, run in real headless Chromium across four axes (Design, Copy, `DESIGN.md` system compliance, AEO eligibility), with a craft-floor axis on the way.
>
> Live site: **[slop-detect.com](https://slop-detect.com)** · CLI: `npx slop-detect <url>` · MCP: `npx -y slop-detect-mcp` · Action: `ravidsrk/slop-detect/packages/action@v0.8.0`
>
> Roadmap v4, 2026-10-20. It replaces v3, which is preserved in git history. Every item below is a GitHub issue tracked in [#336](https://github.com/ravidsrk/slop-detect/issues/336) and labelled [`roadmap:v4`](https://github.com/ravidsrk/slop-detect/issues?q=label%3Aroadmap%3Av4), with an evidence grade, a priority and a release milestone. Research basis: [`docs/research/roadmap-v4/`](docs/research/roadmap-v4/REPORT.md) (19 Oct audit) and [`docs/research/roadmap-v4-deep/`](docs/research/roadmap-v4-deep/) (20 Oct deep pass).

**The short version.** Earn trust before adding tells. Fix what the shipped engine measures wrongly, prove the score against a held-out calibration corpus, and only then promote new rules. New rules enter at weight 0 and earn points through measured lift. The unit of progress changes from "patterns added" to "patterns validated".

---

## 1. Where we are

**Shipped (v0.8.0, definitions `2026.10` since [#217](https://github.com/ravidsrk/slop-detect/pull/217)).**
- **Engine:** 27 design rules, 9 copy rules, 5 `DESIGN.md` checks and 8 AEO checks. The engine ships in `slop-detect-core` on npm, which is imported as `@slop-detect/core` inside the monorepo.
- **Surfaces:** the hosted scanner and API at slop-detect.com, the npm CLI, the MCP server (4 tools, 2 prompts, 2 resources, stdio only), the GitHub Action (step summary and annotations), badges, monitoring sign-ups (waitlist) and a verified-only directory.

**Honest baseline.** These numbers set the priorities.
- **Calibration:** 13 hand-labelled sites, 0 of them Heavy, scoring **5/13 (38.5%)** tier accuracy ([CALIBRATION.md](CALIBRATION.md)).
- **Reach** (all retrieved 2026-10-20, [github_ecosystem.md §2](docs/research/roadmap-v4-deep/github_ecosystem.md)):
  - GitHub: 14 stars.
  - npm: about 705 CLI and 29 MCP downloads a month.
  - Directories: listed on skills.sh with 2 installs and a Snyk "Warn"; not listed on the MCP Registry, Glama, GitHub Marketplace or any awesome list.
- **Code status:** almost nothing in the v4 report was implemented before this roadmap ([code_status_audit.md](docs/research/roadmap-v4-deep/code_status_audit.md)). The most urgent gap the audit found is that the npm `production` environment has no protection rules.

## 2. What the research says

Only verified sources are used. Every claim below links to the note that quotes it. The v3 §2 "research foundation" is retired: an audit of its 123 claims found **16 fabricated and 38 needing correction** ([REPORT.md](docs/research/roadmap-v4/REPORT.md#roadmap-v3-cites-real-papers-for-findings-they-never-report)).

**The old fingerprint is decaying, by design of the generators.**
- Anthropic and OpenAI now steer their models away from Inter, purple gradients and card grids ([REPORT](docs/research/roadmap-v4/REPORT.md#new-checks-should-favour-artifacts-provenance-and-defects-over-taste)).
- Anthropic's *Prompting Claude Opus 5.5* guide now names the *next* default kit: cream backgrounds, italic accent words, "01/02/03" section labels, monospace labels and pill buttons. It also warns that asking a model to avoid a generic look just swaps one default for another ([discourse_deep.md 1B](docs/research/roadmap-v4-deep/discourse_deep.md); [doc](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5#frontend-design-defaults)).
- Google Labs already samples themes in production, over 3.39M tasks and 719,882 projects ([arXiv 2609.15078](https://arxiv.org/html/2609.15078)). So style tells have short half-lives and must be re-measured every quarter.

**What survives is evidence that does not depend on taste:**
- **Paste artifacts:** chatbot citation markup, residue and placeholders.
- **Provenance:** builder markers and unedited scaffolds, which are reported but never scored.
- **Craft defects:** 68% of MLLM-generated pages broke across devices against 40% of human pages ([Guo et al.](https://arxiv.org/html/2608.12518)).
- **Conformance to a site's own declared `DESIGN.md`.**
- **AEO eligibility failures** that crawler operators document themselves.

**Calibration methods now exist for the web.**
- DeGenTWeb ([arXiv 2605.00087](https://arxiv.org/abs/2605.00087)) shows that:
  - filtering out ineligible pages cut site-level false positives from 12.9% to 0.30%;
  - aggregating across pages lifted accuracy from 86.9% (one page) to 98.7% (15 pages);
  - a pre-ChatGPT control of 35,856 sites bounds the false-positive rate.
- Contemporary "human" pages are contaminated, so false-positive rates must come from pre-2022 captures, with a contemporary human stratum kept as a check ([design_arxiv.md §3.2](docs/research/roadmap-v4-deep/design_arxiv.md)).

**Copy statistics are weak; structure and artifacts are stronger.**
- SlopShape ([arXiv 2609.15369](https://arxiv.org/abs/2609.15369)) finds discourse *structure* separates B2B blog posts better than style (97.0 vs 88.1 macro-F1). Its features are applied by an LLM, though, so our zero-LLM proxies stay at weight 0.
- The em dash no longer discriminates for current ChatGPT: humans average 3.23 per 1,000 words against GPT-5.4's 1.43 ([arXiv 2603.27006](https://arxiv.org/abs/2603.27006)).
- Formality, readability and sentiment must never be scored ([copy_arxiv.md CA-10](docs/research/roadmap-v4-deep/copy_arxiv.md)).

**AEO is about eligibility, not citation-worthiness.**
- Controlled replications of 2023 GEO "optimisations" mostly find no effect, and page features explain little of which pages get cited ([REPORT](docs/research/roadmap-v4/REPORT.md#roadmap-v3-cites-real-papers-for-findings-they-never-report)).
- What operators do document is the access rules: crawler purpose tokens, preview controls (Google, Bing and Apple), JavaScript rendering, and prompt-injection spam policies ([aeo_deep.md](docs/research/roadmap-v4-deep/aeo_deep.md)).
- About 70% of 15.3K in-the-wild prompt injections sit in non-rendered HTML, many of them in `X-AI`/`X-LLM` headers and JSON-LD ([arXiv 2604.27202](https://arxiv.org/abs/2604.27202)).

**Where slop-detect stands against Impeccable.**
- Impeccable (771,577 npm downloads a month) now scans live URLs too, so headless Chromium is no longer a differentiator.
- Ours is a calibrated score with tiers, the AEO axis, the CI/API surface and the no-install hosted scanner ([github_ecosystem.md](docs/research/roadmap-v4-deep/github_ecosystem.md)).
- A google/design.md issue (#181) asks for exactly what `check_design_system` already does: rendered-page `DESIGN.md` conformance.

**What users ask for**, in order ([discourse_deep.md §3](docs/research/roadmap-v4-deep/discourse_deep.md)):
1. Page-specific "what to change" guidance (11 authors).
2. Evidence and a published false-positive rate on pre-2022 pages rather than a "% AI" verdict (7).
3. Design-system lint gates in CI (6).

The most common objection is still that "these defaults predate AI" (12 authors).

## 3. Principles

1. **Eligibility and defects over taste.** Report provenance; never score it. Craft defects get their own axis and never feed Clean/Mild/Heavy.
2. **Weight 0 until proven.** Every new or changed style rule ships at weight 0 with a `review` status. It is promoted only at a definitions bump, once the held-out calibration set shows a likelihood ratio of at least 3 and no worse Heavy false-positive rate ([K-04](https://github.com/ravidsrk/slop-detect/issues/299)).
3. **Never say "AI-generated".** Say "matches N AI-default patterns", with evidence and confidence ([K-06](https://github.com/ravidsrk/slop-detect/issues/301)). No third-party grades are published without opt-in ([FIX-04](https://github.com/ravidsrk/slop-detect/issues/224)).
4. **Measure on held-out data.** Splits are grouped by domain, and the held-out set is locked before any tuning. Published false-positive rates and promotion gates use only the held-out set ([K-01](https://github.com/ravidsrk/slop-detect/issues/213)).
5. **Versioned, comparable scores.** Any change that can move a score bumps `DEFINITIONS_VERSION`, re-scores the corpus and publishes the deltas. Scores from different versions are never compared without re-scoring.
6. **Verified sources only.** Issues carry `evidence:measured`, `evidence:standard`, `evidence:practitioner` or `evidence:hypothesis`. The `research:backed` label is retired.

## 4. Release plan

The order follows from dependencies:
- **Supply chain first:** every release flows through `publish.yml`.
- **Correctness before calibration:** the colour-parsing gaps bias every Tailwind v4 page.
- **Calibration before promotion:** without lift data, every new rule is a hypothesis.
- **v1.0 is gated on measured criteria, not a date.**

<!-- RELEASE_TABLE:START -->
| Release | Theme | Exit gate | Issues |
|---|---|---|---|
| **v0.8.1** (6) | No new rules; stop overclaiming | `NPM_TOKEN` deleted; docs-claims test green; no third-party grade without opt-in | FIX-01 [#221](https://github.com/ravidsrk/slop-detect/issues/221), FIX-02 [#222](https://github.com/ravidsrk/slop-detect/issues/222), FIX-03 [#223](https://github.com/ravidsrk/slop-detect/issues/223), FIX-04 [#224](https://github.com/ravidsrk/slop-detect/issues/224), K-02 [#297](https://github.com/ravidsrk/slop-detect/issues/297), K-06 [#301](https://github.com/ravidsrk/slop-detect/issues/301) |
| **v0.9.0** (42) | Fix what the engine measures wrongly; weight-0 plumbing | Tailwind v4 parity fixtures green; pioneer suite shows no Heavy; self-scan published; AEO changelog with re-scored aggregates | FIX-05 [#225](https://github.com/ravidsrk/slop-detect/issues/225), FIX-06 [#226](https://github.com/ravidsrk/slop-detect/issues/226), FIX-07 [#227](https://github.com/ravidsrk/slop-detect/issues/227), FIX-08 [#228](https://github.com/ravidsrk/slop-detect/issues/228), FIX-09 [#229](https://github.com/ravidsrk/slop-detect/issues/229), FIX-10 [#230](https://github.com/ravidsrk/slop-detect/issues/230), FIX-11 [#231](https://github.com/ravidsrk/slop-detect/issues/231), FIX-12 [#232](https://github.com/ravidsrk/slop-detect/issues/232), FIX-13 [#233](https://github.com/ravidsrk/slop-detect/issues/233), FIX-14 [#234](https://github.com/ravidsrk/slop-detect/issues/234), FIX-15 [#206](https://github.com/ravidsrk/slop-detect/issues/206), FIX-16 [#235](https://github.com/ravidsrk/slop-detect/issues/235), FIX-17 [#236](https://github.com/ravidsrk/slop-detect/issues/236), FIX-18 [#237](https://github.com/ravidsrk/slop-detect/issues/237), FIX-19 [#238](https://github.com/ravidsrk/slop-detect/issues/238), FIX-20 [#239](https://github.com/ravidsrk/slop-detect/issues/239), D-01 [#240](https://github.com/ravidsrk/slop-detect/issues/240), D-02 [#241](https://github.com/ravidsrk/slop-detect/issues/241), D-08 [#247](https://github.com/ravidsrk/slop-detect/issues/247), C-01 [#265](https://github.com/ravidsrk/slop-detect/issues/265), C-02 [#266](https://github.com/ravidsrk/slop-detect/issues/266), C-03 [#267](https://github.com/ravidsrk/slop-detect/issues/267), C-04 [#268](https://github.com/ravidsrk/slop-detect/issues/268), C-05 [#269](https://github.com/ravidsrk/slop-detect/issues/269), C-06 [#270](https://github.com/ravidsrk/slop-detect/issues/270), C-07 [#271](https://github.com/ravidsrk/slop-detect/issues/271), C-12 [#275](https://github.com/ravidsrk/slop-detect/issues/275), C-15 [#278](https://github.com/ravidsrk/slop-detect/issues/278), A-01 [#288](https://github.com/ravidsrk/slop-detect/issues/288), A-02 [#205](https://github.com/ravidsrk/slop-detect/issues/205), A-08 [#294](https://github.com/ravidsrk/slop-detect/issues/294), A-09 [#295](https://github.com/ravidsrk/slop-detect/issues/295), K-03 [#298](https://github.com/ravidsrk/slop-detect/issues/298), K-04 [#299](https://github.com/ravidsrk/slop-detect/issues/299), K-05 [#300](https://github.com/ravidsrk/slop-detect/issues/300), K-10 [#305](https://github.com/ravidsrk/slop-detect/issues/305), W-01 [#307](https://github.com/ravidsrk/slop-detect/issues/307), R-01 [#317](https://github.com/ravidsrk/slop-detect/issues/317), R-02 [#318](https://github.com/ravidsrk/slop-detect/issues/318), R-03 [#319](https://github.com/ravidsrk/slop-detect/issues/319), R-10 [#326](https://github.com/ravidsrk/slop-detect/issues/326), #203 [#203](https://github.com/ravidsrk/slop-detect/issues/203) |
| **v0.10.0** (54) | Held-out calibration results; new rules at weight 0; workflow | Per-pattern likelihood ratios with CIs; Heavy FPR measured on the held-out set; weights change only from data | D-03 [#242](https://github.com/ravidsrk/slop-detect/issues/242), D-04 [#243](https://github.com/ravidsrk/slop-detect/issues/243), D-05 [#244](https://github.com/ravidsrk/slop-detect/issues/244), D-07 [#246](https://github.com/ravidsrk/slop-detect/issues/246), D-12 [#251](https://github.com/ravidsrk/slop-detect/issues/251), D-13 [#252](https://github.com/ravidsrk/slop-detect/issues/252), D-14 [#253](https://github.com/ravidsrk/slop-detect/issues/253), D-15 [#254](https://github.com/ravidsrk/slop-detect/issues/254), F-00 [#255](https://github.com/ravidsrk/slop-detect/issues/255), F-01 [#256](https://github.com/ravidsrk/slop-detect/issues/256), F-02 [#257](https://github.com/ravidsrk/slop-detect/issues/257), C-08 [#272](https://github.com/ravidsrk/slop-detect/issues/272), C-09 [#273](https://github.com/ravidsrk/slop-detect/issues/273), C-13 [#276](https://github.com/ravidsrk/slop-detect/issues/276), C-14 [#277](https://github.com/ravidsrk/slop-detect/issues/277), C-16 [#279](https://github.com/ravidsrk/slop-detect/issues/279), S-01 [#280](https://github.com/ravidsrk/slop-detect/issues/280), S-02 [#281](https://github.com/ravidsrk/slop-detect/issues/281), S-03 [#282](https://github.com/ravidsrk/slop-detect/issues/282), S-08 [#287](https://github.com/ravidsrk/slop-detect/issues/287), A-03 [#289](https://github.com/ravidsrk/slop-detect/issues/289), A-04 [#290](https://github.com/ravidsrk/slop-detect/issues/290), A-05 [#291](https://github.com/ravidsrk/slop-detect/issues/291), A-10 [#296](https://github.com/ravidsrk/slop-detect/issues/296), K-01 [#213](https://github.com/ravidsrk/slop-detect/issues/213), K-07 [#302](https://github.com/ravidsrk/slop-detect/issues/302), K-08 [#303](https://github.com/ravidsrk/slop-detect/issues/303), K-11 [#306](https://github.com/ravidsrk/slop-detect/issues/306), W-02 [#308](https://github.com/ravidsrk/slop-detect/issues/308), W-03 [#309](https://github.com/ravidsrk/slop-detect/issues/309), W-06 [#312](https://github.com/ravidsrk/slop-detect/issues/312), W-07 [#313](https://github.com/ravidsrk/slop-detect/issues/313), W-08 [#314](https://github.com/ravidsrk/slop-detect/issues/314), W-09 [#315](https://github.com/ravidsrk/slop-detect/issues/315), W-10 [#316](https://github.com/ravidsrk/slop-detect/issues/316), R-04 [#320](https://github.com/ravidsrk/slop-detect/issues/320), R-05 [#321](https://github.com/ravidsrk/slop-detect/issues/321), R-09 [#325](https://github.com/ravidsrk/slop-detect/issues/325), R-11 [#327](https://github.com/ravidsrk/slop-detect/issues/327), #196 [#196](https://github.com/ravidsrk/slop-detect/issues/196), #197 [#197](https://github.com/ravidsrk/slop-detect/issues/197), #198 [#198](https://github.com/ravidsrk/slop-detect/issues/198), #199 [#199](https://github.com/ravidsrk/slop-detect/issues/199), #200 [#200](https://github.com/ravidsrk/slop-detect/issues/200), #202 [#202](https://github.com/ravidsrk/slop-detect/issues/202), #204 [#204](https://github.com/ravidsrk/slop-detect/issues/204), #207 [#207](https://github.com/ravidsrk/slop-detect/issues/207), #207a [#333](https://github.com/ravidsrk/slop-detect/issues/333), #207b [#334](https://github.com/ravidsrk/slop-detect/issues/334), #208 [#208](https://github.com/ravidsrk/slop-detect/issues/208), #209 [#209](https://github.com/ravidsrk/slop-detect/issues/209), #210 [#210](https://github.com/ravidsrk/slop-detect/issues/210), #212 [#212](https://github.com/ravidsrk/slop-detect/issues/212), #213b [#335](https://github.com/ravidsrk/slop-detect/issues/335) |
| **v0.11.0** (25) | Promotions and demotions from data; craft checks; distribution | Every scored rule has a measured likelihood ratio; first quarterly re-validation published | D-06 [#245](https://github.com/ravidsrk/slop-detect/issues/245), D-09 [#248](https://github.com/ravidsrk/slop-detect/issues/248), D-11 [#250](https://github.com/ravidsrk/slop-detect/issues/250), F-03 [#258](https://github.com/ravidsrk/slop-detect/issues/258), F-04 [#259](https://github.com/ravidsrk/slop-detect/issues/259), F-05 [#260](https://github.com/ravidsrk/slop-detect/issues/260), F-06 [#261](https://github.com/ravidsrk/slop-detect/issues/261), F-07 [#262](https://github.com/ravidsrk/slop-detect/issues/262), F-08 [#263](https://github.com/ravidsrk/slop-detect/issues/263), F-09 [#264](https://github.com/ravidsrk/slop-detect/issues/264), S-04 [#283](https://github.com/ravidsrk/slop-detect/issues/283), S-05 [#284](https://github.com/ravidsrk/slop-detect/issues/284), S-07 [#286](https://github.com/ravidsrk/slop-detect/issues/286), A-06 [#292](https://github.com/ravidsrk/slop-detect/issues/292), A-07 [#293](https://github.com/ravidsrk/slop-detect/issues/293), K-09 [#304](https://github.com/ravidsrk/slop-detect/issues/304), W-04 [#310](https://github.com/ravidsrk/slop-detect/issues/310), R-06 [#322](https://github.com/ravidsrk/slop-detect/issues/322), R-07 [#323](https://github.com/ravidsrk/slop-detect/issues/323), R-08 [#324](https://github.com/ravidsrk/slop-detect/issues/324), R-12 [#328](https://github.com/ravidsrk/slop-detect/issues/328), R-13 [#329](https://github.com/ravidsrk/slop-detect/issues/329), #201 [#201](https://github.com/ravidsrk/slop-detect/issues/201), #204b [#332](https://github.com/ravidsrk/slop-detect/issues/332), #211 [#211](https://github.com/ravidsrk/slop-detect/issues/211) |
| **v1.0.0** (1) | Stable contract | ≥ 1,520 held-out human controls; Heavy FPR ≤ 2% (95% CI); schema frozen; runnable conformance suite | V1-00 [#331](https://github.com/ravidsrk/slop-detect/issues/331) |
| **Backlog** (5) | Watchlists and deferred work | — | D-10 [#249](https://github.com/ravidsrk/slop-detect/issues/249), C-10 [#274](https://github.com/ravidsrk/slop-detect/issues/274), S-06 [#285](https://github.com/ravidsrk/slop-detect/issues/285), W-05 [#311](https://github.com/ravidsrk/slop-detect/issues/311), R-14 [#330](https://github.com/ravidsrk/slop-detect/issues/330) |
<!-- RELEASE_TABLE:END -->

**Critical path to v0.9.0** ([dependency graph](docs/research/roadmap-v4-deep/code_status_audit.md#dependency-graph-what-must-land-before-what)):
1. [FIX-01](https://github.com/ravidsrk/slop-detect/issues/221).
2. [K-02](https://github.com/ravidsrk/slop-detect/issues/297) and [K-06](https://github.com/ravidsrk/slop-detect/issues/301).
3. [FIX-05](https://github.com/ravidsrk/slop-detect/issues/225) together with [FIX-06](https://github.com/ravidsrk/slop-detect/issues/226).
4. The cross-pattern post-pass ([FIX-07](https://github.com/ravidsrk/slop-detect/issues/227)).
5. [FIX-12](https://github.com/ravidsrk/slop-detect/issues/232) and [C-01](https://github.com/ravidsrk/slop-detect/issues/265).
6. [A-08](https://github.com/ravidsrk/slop-detect/issues/294), then [FIX-13](https://github.com/ravidsrk/slop-detect/issues/233), [FIX-14](https://github.com/ravidsrk/slop-detect/issues/234), [FIX-15](https://github.com/ravidsrk/slop-detect/issues/206), [A-01](https://github.com/ravidsrk/slop-detect/issues/288), [A-02](https://github.com/ravidsrk/slop-detect/issues/205) and [FIX-18](https://github.com/ravidsrk/slop-detect/issues/237).
7. [K-03](https://github.com/ravidsrk/slop-detect/issues/298), then [K-04](https://github.com/ravidsrk/slop-detect/issues/299).
8. [K-05](https://github.com/ravidsrk/slop-detect/issues/300).

[W-01](https://github.com/ravidsrk/slop-detect/issues/307) (the scan-result schema) gates most of v0.10.0, so it starts during v0.9.0.

## 5. Tracks

Each table lists the track's issues. Status, file:line evidence, thresholds and acceptance criteria live in each issue.

<!-- TRACK_TABLES:START -->
### Correctness fixes (FIX)

| ID | Item | Release | Priority | Evidence | Issue |
|---|---|---|---|---|---|
| FIX-01 | Harden npm publishing: OIDC trusted publishing, protected production environment, delete NPM_TOKEN | v0.8.1 | P0 | standard | [#221](https://github.com/ravidsrk/slop-detect/issues/221) |
| FIX-02 | Publish definitions 2026.10 score deltas and regenerate the leaderboard (follow-up to #217) | v0.8.1 | P0 | standard | [#222](https://github.com/ravidsrk/slop-detect/issues/222) |
| FIX-03 | Correct false and stale claims; make the docs-claims test derive counts instead of pinning them | v0.8.1 | P0 | standard | [#223](https://github.com/ravidsrk/slop-detect/issues/223) |
| FIX-04 | No third-party grades without opt-in (leaderboard, peers); label scores "uncalibrated beta" | v0.8.1 | P0 | practitioner | [#224](https://github.com/ravidsrk/slop-detect/issues/224) |
| #203 | DESIGN.md colour matching in Oklab (ΔE_OK) plus spacing and type-scale coverage | v0.9.0 | P0 | standard | [#203](https://github.com/ravidsrk/slop-detect/issues/203) |
| FIX-05 | Shared CSS Color 4 parser: gradient stops, shadows, effectiveBackground, system.ts (with FIX-06) | v0.9.0 | P0 | standard | [#225](https://github.com/ravidsrk/slop-detect/issues/225) |
| FIX-06 | Classify purple in OKLCH, halve purple_accent weight and mark it decaying | v0.9.0 | P0 | standard | [#226](https://github.com/ravidsrk/slop-detect/issues/226) |
| FIX-12 | Extract copy from the live DOM, not a detached clone | v0.9.0 | P0 | standard | [#232](https://github.com/ravidsrk/slop-detect/issues/232) |
| FIX-13 | Rebuild bot.notBlocked as a tri-state edge.access probe (no vendor UA impersonation) | v0.9.0 | P0 | standard | [#233](https://github.com/ravidsrk/slop-detect/issues/233) |
| FIX-14 | robots.txt: RFC 9309 parser, purpose-tiered robots.searchAllowed, 2026.10 bot registry | v0.9.0 | P0 | standard | [#234](https://github.com/ravidsrk/slop-detect/issues/234) |
| FIX-15 | llms.txt v2 validation, multi-route validated markdown twin, conditional Vary | v0.9.0 | P0 | standard | [#206](https://github.com/ravidsrk/slop-detect/issues/206) |
| FIX-18 | AEO applicability scoring and v0.9 weights (earned / applicable; no cascade on unreachable pages) | v0.9.0 | P0 | standard | [#237](https://github.com/ravidsrk/slop-detect/issues/237) |
| FIX-07 | Cross-pattern scoring post-pass; cap slop_fonts + centered_hero at 8 points | v0.9.0 | P1 | standard | [#227](https://github.com/ravidsrk/slop-detect/issues/227) |
| FIX-08 | Extend low_contrast_text to dark backgrounds (WCAG 2 math; APCA info-only) | v0.9.0 | P1 | standard | [#228](https://github.com/ravidsrk/slop-detect/issues/228) |
| FIX-09 | Replace all_caps_labels with eyebrow_label (case-independent, ratio of headings with eyebrows) | v0.9.0 | P1 | practitioner | [#229](https://github.com/ravidsrk/slop-detect/issues/229) |
| FIX-10 | Gradient salience rule for gradient_backgrounds | v0.9.0 | P1 | practitioner | [#230](https://github.com/ravidsrk/slop-detect/issues/230) |
| FIX-11 | Split unicode_artifacts into 3 non-authorship findings (tag chars, in-word invisibles, fake bold) | v0.9.0 | P1 | standard | [#231](https://github.com/ravidsrk/slop-detect/issues/231) |
| FIX-16 | Reframe the AEO axis as eligibility: rename tiers, remove citation/traffic promises | v0.9.0 | P1 | standard | [#235](https://github.com/ravidsrk/slop-detect/issues/235) |
| FIX-17 | Dogfood: publish slop-detect.com's full self-scan; fix its own robots.txt and discovery files | v0.9.0 | P1 | practitioner | [#236](https://github.com/ravidsrk/slop-detect/issues/236) |
| FIX-19 | Count overlapping evidence once across patterns | v0.9.0 | P1 | practitioner | [#238](https://github.com/ravidsrk/slop-detect/issues/238) |
| FIX-20 | Stop scoring a single italic accent-serif word as slop_fonts (move to hero_accent_word) | v0.9.0 | P1 | practitioner | [#239](https://github.com/ravidsrk/slop-detect/issues/239) |

### Design axis (D)

| ID | Item | Release | Priority | Evidence | Issue |
|---|---|---|---|---|---|
| D-01 | madeWith[] provenance field (reported, never scored) | v0.9.0 | P1 | practitioner | [#240](https://github.com/ravidsrk/slop-detect/issues/240) |
| D-02 | scaffold_defaults_unedited (unfinished page warning) | v0.9.0 | P1 | practitioner | [#241](https://github.com/ravidsrk/slop-detect/issues/241) |
| D-08 | slop_fonts: confirm the rendered face via document.fonts; refresh the list | v0.9.0 | P1 | practitioner | [#247](https://github.com/ravidsrk/slop-detect/issues/247) |
| D-13 | default_kit_match: report which vendor-named default kit a page matches | v0.10.0 | P1 | practitioner | [#252](https://github.com/ravidsrk/slop-detect/issues/252) |
| #196 | Potemkin UI tells at weight 0: fake terminal, fake logo bar; icon tiles as icon_card_grid evidence | v0.10.0 | P2 | practitioner | [#196](https://github.com/ravidsrk/slop-detect/issues/196) |
| #197 | Motion monoculture at weight 0, detected from getAnimations() and computed styles | v0.10.0 | P2 | practitioner | [#197](https://github.com/ravidsrk/slop-detect/issues/197) |
| D-03 | hero_accent_word (weight 0) | v0.10.0 | P2 | practitioner | [#242](https://github.com/ravidsrk/slop-detect/issues/242) |
| D-04 | template_chrome_2026 cluster (weight 0), incl. // separators | v0.10.0 | P2 | practitioner | [#243](https://github.com/ravidsrk/slop-detect/issues/243) |
| D-05 | uniform_radius_shadow (weight 0) | v0.10.0 | P2 | practitioner | [#244](https://github.com/ravidsrk/slop-detect/issues/244) |
| D-07 | accent_stripe: bottom borders, 2 px threshold, colour difference, alert exclusion | v0.10.0 | P2 | practitioner | [#246](https://github.com/ravidsrk/slop-detect/issues/246) |
| D-12 | pulsing_status_badge (weight 0) | v0.10.0 | P2 | practitioner | [#251](https://github.com/ravidsrk/slop-detect/issues/251) |
| D-14 | display_mono_heading (weight 0) | v0.10.0 | P2 | practitioner | [#253](https://github.com/ravidsrk/slop-detect/issues/253) |
| #198 | section_template_repetition (report-only), replacing layout entropy / TreeBLEU / div_soup_ratio | v0.10.0 | P3 | hypothesis | [#198](https://github.com/ravidsrk/slop-detect/issues/198) |
| #199 | unthemed_browser_surfaces at weight 0 (#199b); dark-background contrast split to FIX-08 | v0.10.0 | P3 | practitioner | [#199](https://github.com/ravidsrk/slop-detect/issues/199) |
| D-15 | chip_rainbow (weight 0) | v0.10.0 | P3 | practitioner | [#254](https://github.com/ravidsrk/slop-detect/issues/254) |
| D-06 | editorial_cream_kit (weight 0; editorial preset suppresses) | v0.11.0 | P2 | practitioner | [#245](https://github.com/ravidsrk/slop-detect/issues/245) |
| D-09 | template_page_order (report-only) | v0.11.0 | P3 | practitioner | [#248](https://github.com/ravidsrk/slop-detect/issues/248) |
| D-11 | Design typicality percentile vs the human reference set (report-only) | v0.11.0 | P3 | hypothesis | [#250](https://github.com/ravidsrk/slop-detect/issues/250) |
| D-10 | Experimental watchlist behind --experimental: hard shadows, goo, chat bubble, dev-theme palettes | Backlog | P3 | hypothesis | [#249](https://github.com/ravidsrk/slop-detect/issues/249) |

### Craft-floor axis (F)

| ID | Item | Release | Priority | Evidence | Issue |
|---|---|---|---|---|---|
| F-00 | Craft-floor axis: a separate defect score that never feeds Clean/Mild/Heavy | v0.10.0 | P1 | hypothesis | [#255](https://github.com/ravidsrk/slop-detect/issues/255) |
| F-01 | viewport_meta_missing / zoom_disabled | v0.10.0 | P1 | standard | [#256](https://github.com/ravidsrk/slop-detect/issues/256) |
| F-02 | Mobile reflow failures with the RLF taxonomy and a non-observable-issue filter | v0.10.0 | P1 | standard | [#257](https://github.com/ravidsrk/slop-detect/issues/257) |
| F-03 | focus_indicator_missing (real Tab presses) | v0.11.0 | P2 | standard | [#258](https://github.com/ravidsrk/slop-detect/issues/258) |
| F-04 | content_stuck_hidden (scroll-reveal content that never appears) | v0.11.0 | P2 | practitioner | [#259](https://github.com/ravidsrk/slop-detect/issues/259) |
| F-05 | dead_cta_controls with side-effect-free click probing | v0.11.0 | P2 | hypothesis | [#260](https://github.com/ravidsrk/slop-detect/issues/260) |
| F-06 | reduced_motion_ignored (info only) | v0.11.0 | P2 | practitioner | [#261](https://github.com/ravidsrk/slop-detect/issues/261) |
| F-07 | Optional axe-core report (--a11y axe), separate and off by default | v0.11.0 | P3 | standard | [#262](https://github.com/ravidsrk/slop-detect/issues/262) |
| F-08 | generic_control_labels (craft floor only) | v0.11.0 | P3 | standard | [#263](https://github.com/ravidsrk/slop-detect/issues/263) |
| F-09 | Forms with no failure feedback (extends F-05 harness) | v0.11.0 | P3 | hypothesis | [#264](https://github.com/ravidsrk/slop-detect/issues/264) |

### Copy axis (C)

| ID | Item | Release | Priority | Evidence | Issue |
|---|---|---|---|---|---|
| C-01 | Copy gating: prose extraction, length and language gates, Error/Warning/Suggestion tiers | v0.9.0 | P0 | hypothesis | [#265](https://github.com/ravidsrk/slop-detect/issues/265) |
| C-02 | chatbot_markup_leak (dated registry) | v0.9.0 | P1 | practitioner | [#266](https://github.com/ravidsrk/slop-detect/issues/266) |
| C-03 | chatbot_reply_residue (+ Regenerate response, share-page labels) | v0.9.0 | P1 | practitioner | [#267](https://github.com/ravidsrk/slop-detect/issues/267) |
| C-04 | ai_referral_utm_links | v0.9.0 | P1 | practitioner | [#268](https://github.com/ravidsrk/slop-detect/issues/268) |
| C-05 | unfilled_placeholders | v0.9.0 | P1 | practitioner | [#269](https://github.com/ravidsrk/slop-detect/issues/269) |
| C-06 | leaked_markdown | v0.9.0 | P1 | practitioner | [#270](https://github.com/ravidsrk/slop-detect/issues/270) |
| C-07 | Decay re-weighting: em dash recalibration, position-aware closers, era tags | v0.9.0 | P1 | hypothesis | [#271](https://github.com/ravidsrk/slop-detect/issues/271) |
| C-12 | Normalize-before-match text view for every copy rule | v0.9.0 | P1 | hypothesis | [#275](https://github.com/ravidsrk/slop-detect/issues/275) |
| C-15 | Anti-signal policy: never score formality, readability, sentiment or perplexity | v0.9.0 | P1 | hypothesis | [#278](https://github.com/ravidsrk/slop-detect/issues/278) |
| #202 | Structural fake social proof at weight 0 (placeholder avatars, repeated images, anonymous testimonials) | v0.10.0 | P2 | practitioner | [#202](https://github.com/ravidsrk/slop-detect/issues/202) |
| C-08 | Extend antithesis_construction with bare contrastive forms (status: rising) | v0.10.0 | P2 | hypothesis | [#272](https://github.com/ravidsrk/slop-detect/issues/272) |
| C-14 | Multi-page copy verdict with cross-page boilerplate removal | v0.10.0 | P2 | hypothesis | [#277](https://github.com/ravidsrk/slop-detect/issues/277) |
| #200 | Stylometric copy features at weight 0 (participial clauses, sentence-length dispersion) | v0.10.0 | P3 | hypothesis | [#200](https://github.com/ravidsrk/slop-detect/issues/200) |
| C-09 | Emoji refresh: new lead-emoji set and a ratio rule | v0.10.0 | P3 | hypothesis | [#273](https://github.com/ravidsrk/slop-detect/issues/273) |
| C-13 | Structural copy proxies at weight 0: announced structure, restated-thesis closer, legacy-vs-modern | v0.10.0 | P3 | hypothesis | [#276](https://github.com/ravidsrk/slop-detect/issues/276) |
| C-16 | context_leak_copy at weight 0 (chat-context phrases in page copy) | v0.10.0 | P3 | practitioner | [#279](https://github.com/ravidsrk/slop-detect/issues/279) |
| #201 | Excess-vocabulary weights from a reproducible log-odds pipeline | v0.11.0 | P2 | hypothesis | [#201](https://github.com/ravidsrk/slop-detect/issues/201) |
| C-10 | Copy watchlist: punctuation diversity, sentence band, mixed-script homoglyph tokens | Backlog | P3 | hypothesis | [#274](https://github.com/ravidsrk/slop-detect/issues/274) |

### DESIGN.md system axis (S)

| ID | Item | Release | Priority | Evidence | Issue |
|---|---|---|---|---|---|
| S-01 | DESIGN.md coverage.<class> conformance ratios | v0.10.0 | P1 | standard | [#280](https://github.com/ravidsrk/slop-detect/issues/280) |
| S-02 | Build on @google/design.md lint/diff; answer design.md #181 | v0.10.0 | P1 | standard | [#281](https://github.com/ravidsrk/slop-detect/issues/281) |
| S-03 | Declared DESIGN.md intent waives matching design patterns | v0.10.0 | P1 | practitioner | [#282](https://github.com/ravidsrk/slop-detect/issues/282) |
| S-08 | DESIGN.md lint-lock CI gate with a token-level diff for agents | v0.10.0 | P1 | practitioner | [#287](https://github.com/ravidsrk/slop-detect/issues/287) |
| #204 | DTCG 2025.10 tokens.json as DESIGN.md input (#204a) | v0.10.0 | P2 | standard | [#204](https://github.com/ravidsrk/slop-detect/issues/204) |
| #204b | Design-system extraction: --extract-tokens and MCP extract_design_system | v0.11.0 | P2 | standard | [#332](https://github.com/ravidsrk/slop-detect/issues/332) |
| S-04 | typography.styles composite match and type-scale inflation | v0.11.0 | P2 | hypothesis | [#283](https://github.com/ravidsrk/slop-detect/issues/283) |
| S-05 | contrast.component-pairs (rendered equivalent of design.md contrast-ratio) | v0.11.0 | P2 | standard | [#284](https://github.com/ravidsrk/slop-detect/issues/284) |
| S-07 | Optional reference-screen conformance (Oklab colour histogram), off by default | v0.11.0 | P3 | hypothesis | [#286](https://github.com/ravidsrk/slop-detect/issues/286) |
| S-06 | DTCG shadow and motion tokens; unused and deprecated tokens | Backlog | P3 | standard | [#285](https://github.com/ravidsrk/slop-detect/issues/285) |

### AEO eligibility axis (A)

| ID | Item | Release | Priority | Evidence | Issue |
|---|---|---|---|---|---|
| A-01 | ai.previewControls: Google, Bing and Apple snippet and archive directives | v0.9.0 | P1 | standard | [#288](https://github.com/ravidsrk/slop-detect/issues/288) |
| A-02 | html.serverTextCoverage: main text without JavaScript vs rendered | v0.9.0 | P1 | standard | [#205](https://github.com/ravidsrk/slop-detect/issues/205) |
| A-08 | Transparent scanner identity: /bot page and one user agent; defer request signing | v0.9.0 | P1 | standard | [#294](https://github.com/ravidsrk/slop-detect/issues/294) |
| A-09 | Detect Cloudflare-managed robots.txt blocks that also remove a site from Search | v0.9.0 | P2 | standard | [#295](https://github.com/ravidsrk/slop-detect/issues/295) |
| A-03 | ai.manipulation warning: poisoning links, hidden text, X-AI/X-LLM headers and JSON-LD (weight 0) | v0.10.0 | P1 | standard | [#289](https://github.com/ravidsrk/slop-detect/issues/289) |
| A-04 | agent.operability: Lighthouse accessibility-tree subset plus overlay signals (information only) | v0.10.0 | P2 | standard | [#290](https://github.com/ravidsrk/slop-detect/issues/290) |
| A-05 | Agent discovery parity: ARD, ai-catalog and A2A card, with pinned Lighthouse parity | v0.10.0 | P2 | standard | [#291](https://github.com/ravidsrk/slop-detect/issues/291) |
| A-10 | JSON-LD hygiene: parses, has @context/@type, literals match visible text (at most 5% of the axis) | v0.10.0 | P3 | standard | [#296](https://github.com/ravidsrk/slop-detect/issues/296) |
| A-06 | ai.usagePolicy panel: AIPREF (3 labels), Content-Signal incl. use=, RSL, TDMRep, ai.txt | v0.11.0 | P2 | standard | [#292](https://github.com/ravidsrk/slop-detect/issues/292) |
| A-07 | Machine-readable date presence and consistency (no age threshold) | v0.11.0 | P3 | hypothesis | [#293](https://github.com/ravidsrk/slop-detect/issues/293) |

### Calibration and credibility (K)

| ID | Item | Release | Priority | Evidence | Issue |
|---|---|---|---|---|---|
| K-02 | Replace research:backed with evidence-grade labels; rewrite ROADMAP §2 from verified sources | v0.8.1 | P0 | standard | [#297](https://github.com/ravidsrk/slop-detect/issues/297) |
| K-06 | Harm-avoiding language across UI, API, CLI, MCP and the skill | v0.8.1 | P0 | practitioner | [#301](https://github.com/ravidsrk/slop-detect/issues/301) |
| K-04 | Experimental gate: new rules ship at weight 0; promotion only on measured lift | v0.9.0 | P0 | standard | [#299](https://github.com/ravidsrk/slop-detect/issues/299) |
| K-05 | Pioneer regression suite on dated snapshots plus a published self-scan | v0.9.0 | P0 | practitioner | [#300](https://github.com/ravidsrk/slop-detect/issues/300) |
| K-03 | Rule lifecycle metadata served by /api/patterns | v0.9.0 | P1 | practitioner | [#298](https://github.com/ravidsrk/slop-detect/issues/298) |
| K-10 | Definitions-version integrity in watch history, caches and comparisons | v0.9.0 | P1 | practitioner | [#305](https://github.com/ravidsrk/slop-detect/issues/305) |
| K-01 | Calibration protocol v2: strata, anchored tier labels, held-out split, likelihood ratios | v0.10.0 | P0 | standard | [#213](https://github.com/ravidsrk/slop-detect/issues/213) |
| K-11 | Evidence-first output and per-pattern pre-2022 false-positive rates on /api/patterns | v0.10.0 | P1 | practitioner | [#306](https://github.com/ravidsrk/slop-detect/issues/306) |
| K-08 | Crosswalk to other rule sets and Lighthouse Agentic Browsing | v0.10.0 | P2 | practitioner | [#303](https://github.com/ravidsrk/slop-detect/issues/303) |
| K-07 | Craft-covariate oracle (offline): is the score penalising craft? | v0.10.0 | P3 | hypothesis | [#302](https://github.com/ravidsrk/slop-detect/issues/302) |
| K-09 | Quarterly re-validation and a tell half-life panel | v0.11.0 | P1 | practitioner | [#304](https://github.com/ravidsrk/slop-detect/issues/304) |
| V1-00 | v1.0 release gate: frozen schema, runnable conformance suite, measured Heavy FPR | v1.0.0 | P1 | standard | [#331](https://github.com/ravidsrk/slop-detect/issues/331) |

### Developer workflow: CLI, MCP, CI (W)

| ID | Item | Release | Priority | Evidence | Issue |
|---|---|---|---|---|---|
| W-01 | Versioned scan-result JSON Schema (v1) | v0.9.0 | P1 | standard | [#307](https://github.com/ravidsrk/slop-detect/issues/307) |
| #207 | .sloprc.json config, --only/--skip and inline waivers with reasons (#207c) | v0.10.0 | P1 | practitioner | [#207](https://github.com/ravidsrk/slop-detect/issues/207) |
| #207a | Co-occurrence confidence: strong tells defined by measured lift | v0.10.0 | P1 | practitioner | [#333](https://github.com/ravidsrk/slop-detect/issues/333) |
| #209 | Baseline ratcheting: base-vs-PR score diff with version-safe comparisons | v0.10.0 | P1 | practitioner | [#209](https://github.com/ravidsrk/slop-detect/issues/209) |
| #210 | Static build directory scanning and multi-page crawl | v0.10.0 | P1 | practitioner | [#210](https://github.com/ravidsrk/slop-detect/issues/210) |
| #212 | MCP server v2 remainder: outputSchema, aeo resource, tests, icons | v0.10.0 | P1 | standard | [#212](https://github.com/ravidsrk/slop-detect/issues/212) |
| W-02 | Reporter matrix: --format agent, github, sarif, junit, gitlab, json | v0.10.0 | P1 | practitioner | [#308](https://github.com/ravidsrk/slop-detect/issues/308) |
| W-03 | Local scanning in the MCP server for agent loops | v0.10.0 | P1 | practitioner | [#309](https://github.com/ravidsrk/slop-detect/issues/309) |
| W-06 | Site mode: multi-page sampling with an eligibility gate and template dedup | v0.10.0 | P1 | hypothesis | [#312](https://github.com/ravidsrk/slop-detect/issues/312) |
| W-07 | fix_prompt v2: page-specific avoid list plus before/after diff | v0.10.0 | P1 | practitioner | [#313](https://github.com/ravidsrk/slop-detect/issues/313) |
| W-08 | slop-detect init: one-command setup of skill, MCP and agent hooks | v0.10.0 | P1 | practitioner | [#314](https://github.com/ravidsrk/slop-detect/issues/314) |
| W-09 | review and unknown result statuses (non-scoring and unmeasurable findings) | v0.10.0 | P1 | practitioner | [#315](https://github.com/ravidsrk/slop-detect/issues/315) |
| #207b | Presets as documented weight profiles across all axes | v0.10.0 | P2 | practitioner | [#334](https://github.com/ravidsrk/slop-detect/issues/334) |
| #208 | Per-pattern locations (selector + rect) and an opt-in annotated screenshot | v0.10.0 | P2 | practitioner | [#208](https://github.com/ravidsrk/slop-detect/issues/208) |
| #213b | Watch webhooks (Slack, Discord, JSON) for drift events | v0.10.0 | P2 | hypothesis | [#335](https://github.com/ravidsrk/slop-detect/issues/335) |
| W-10 | Determinism and environment pinning (--runs, recorded env) | v0.10.0 | P2 | practitioner | [#316](https://github.com/ravidsrk/slop-detect/issues/316) |
| #211 | SARIF for code scanning: fingerprints, per-URL categories, FIXES help, AEO results | v0.11.0 | P2 | standard | [#211](https://github.com/ravidsrk/slop-detect/issues/211) |
| W-04 | Deterministic AEO fix-file generator (--emit-aeo-fixes) | v0.11.0 | P2 | standard | [#310](https://github.com/ravidsrk/slop-detect/issues/310) |
| W-05 | Vale style export of copy rules | Backlog | P3 | practitioner | [#311](https://github.com/ravidsrk/slop-detect/issues/311) |

### Distribution (R)

| ID | Item | Release | Priority | Evidence | Issue |
|---|---|---|---|---|---|
| R-01 | Agent Skills / skills.sh: verified installs, frontmatter CI, clear the Snyk warning | v0.9.0 | P1 | standard | [#317](https://github.com/ravidsrk/slop-detect/issues/317) |
| R-02 | Publish slop-detect-mcp to the official MCP Registry | v0.9.0 | P1 | standard | [#318](https://github.com/ravidsrk/slop-detect/issues/318) |
| R-03 | Claude Code plugin and marketplace (skill + MCP, then hooks) | v0.9.0 | P1 | standard | [#319](https://github.com/ravidsrk/slop-detect/issues/319) |
| R-10 | Directory hygiene: Glama listing, awesome lists, APM snippet, package naming | v0.9.0 | P1 | standard | [#326](https://github.com/ravidsrk/slop-detect/issues/326) |
| R-04 | Remote MCP endpoint at slop-detect.com/mcp (stateless Streamable HTTP) | v0.10.0 | P1 | standard | [#320](https://github.com/ravidsrk/slop-detect/issues/320) |
| R-05 | GitHub Marketplace Action repo with a local-Chromium mode | v0.10.0 | P1 | standard | [#321](https://github.com/ravidsrk/slop-detect/issues/321) |
| R-09 | Positioning: the verifier generators call; launch with the calibration report | v0.10.0 | P1 | practitioner | [#325](https://github.com/ravidsrk/slop-detect/issues/325) |
| R-11 | Builder recipes for Lovable, v0, claude.ai and ChatGPT via the remote MCP | v0.10.0 | P2 | standard | [#327](https://github.com/ravidsrk/slop-detect/issues/327) |
| R-06 | Agent Plugins 1.0 manifest, Cursor marketplace and install deeplinks | v0.11.0 | P2 | standard | [#322](https://github.com/ravidsrk/slop-detect/issues/322) |
| R-07 | MCP Apps score card (text/html;profile=mcp-app) with a text fallback | v0.11.0 | P2 | standard | [#323](https://github.com/ravidsrk/slop-detect/issues/323) |
| R-08 | OpenAI ChatGPT/Codex plugin: skills-only first, then remote MCP | v0.11.0 | P2 | standard | [#324](https://github.com/ravidsrk/slop-detect/issues/324) |
| R-12 | Deploy gates: Vercel deployment-checks recipe and a Netlify build plugin | v0.11.0 | P2 | standard | [#328](https://github.com/ravidsrk/slop-detect/issues/328) |
| R-13 | Skill-efficacy benchmark (slop-detect bench) with published results | v0.11.0 | P2 | practitioner | [#329](https://github.com/ravidsrk/slop-detect/issues/329) |
| R-14 | lighthouse-plugin-slop-copy (copy axis + HTML-level AEO only) | Backlog | P3 | standard | [#330](https://github.com/ravidsrk/slop-detect/issues/330) |

<!-- TRACK_TABLES:END -->

## 6. Definitions policy

- **When to bump:** any change that can move a score bumps `DEFINITIONS_VERSION`: a weight, a promotion or demotion, a lexicon refresh, or a parser fix.
- **What every bump includes:**
  - the calibration corpus re-scored, with a delta report;
  - `/api/patterns` serving rule statuses and counts dynamically (never hard-coded; see AGENTS.md);
  - the definitions version stored in caches and watch history.
- **Quarterly re-validation** ([K-09](https://github.com/ravidsrk/slop-detect/issues/304)): a fixed prompt panel is re-run through current builders, and lifecycle statuses (`rising`, `active`, `decaying`, `historical`) are driven by the measured likelihood ratios.

## 7. Dropped or re-scoped from v3

| v3 item | Outcome | Why |
|---|---|---|
| `div_soup_ratio`, TreeBLEU, Block-Match, layout IoU (#198) | Dropped; replaced by report-only `section_template_repetition` and a typicality percentile | The cited sources contradict it, or the metrics need a reference page |
| `geo.citationEvidence` (#205) | Dropped | Controlled replications find no citation effect |
| CV < 0.24 burstiness threshold, hedge/transition stack (#200) | Dropped | Fabricated threshold; the cited paper contradicts it |
| Hand-made vocabulary tiers (#201) | Replaced by a reproducible log-odds pipeline | Kobak's own data contradict the tiers |
| "Sarah Chen" persona list (#202) | Dropped; structural fake-proof signals kept | No measured frequency; humans use urgency and social proof more than LLM components |
| `/.well-known/mcp.json` discovery (#206) | Replaced by ARD/ai-catalog parity | No spec defines it |
| "AI-Ready" / citation-worthiness framing | Renamed to eligibility tiers ([FIX-16](https://github.com/ravidsrk/slop-detect/issues/235)) | Overclaims the evidence |
| `research:backed` label | Replaced by `evidence:*` grades ([K-02](https://github.com/ravidsrk/slop-detect/issues/297)) | 6 of the 14 `research:backed` issues lose the label or must be re-scoped |

## 8. Research basis

- [`docs/research/roadmap-v4/REPORT.md`](docs/research/roadmap-v4/REPORT.md): the v4 audit of v3, an issue-by-issue verdict and the full item definitions.
- [`docs/research/roadmap-v4-deep/`](docs/research/roadmap-v4-deep/): the 2026-10-20 deep pass.
  - [`code_status_audit.md`](docs/research/roadmap-v4-deep/code_status_audit.md): status of every item against the code, plus the dependency graph.
  - [`design_arxiv.md`](docs/research/roadmap-v4-deep/design_arxiv.md): design-axis papers.
  - [`copy_arxiv.md`](docs/research/roadmap-v4-deep/copy_arxiv.md): copy-axis papers.
  - [`aeo_deep.md`](docs/research/roadmap-v4-deep/aeo_deep.md): AEO standards and papers.
  - [`discourse_deep.md`](docs/research/roadmap-v4-deep/discourse_deep.md): X, HN and Reddit discussion.
  - [`github_ecosystem.md`](docs/research/roadmap-v4-deep/github_ecosystem.md): competitors and distribution.
- Every claim in those notes is marked [V] (opened and confirmed) or [U] (unconfirmed). Standards-parity tests should pin a version and record `verifiedAt`, because two v4 claims about standards changed within a day.
