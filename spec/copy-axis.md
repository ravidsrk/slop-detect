# Copy axis

The copy axis scores page prose for LLM-default writing tells and leaked generation artifacts. It runs as pure text analysis — no DOM, no browser — on text extracted by `extractTextContext()` from the scanned page.

Module: `packages/core/src/copyPatterns.ts`. Scoring: `scoreCopy()` and `scoreMultiPageCopy()` in `packages/core/src/index.ts`.

## Copy pattern catalogue

26 patterns. Each exposes `match(textCtx)` returning evidence with a boolean `triggered`. Rules in `review` status ship at weight 0 (`status: "review"`) and do not add points until promoted via the K-04 calibration gate.

| ID | Name | Weight | Detection summary |
|----|------|--------|-------------------|
| `buzzword_density` | AI buzzword density | 7 | ≥4 distinct buzzwords OR ≥3 hits with density ≥6 per 1000 words (era-tagged) |
| `em_dash_overload` | Em-dash overload | 2 | ≥4 true em-dashes (U+2014 only) with density ≥7/1000 words OR ≥8 U+2014 (decaying, co-occurrence gated) |
| `antithesis_construction` | "Not just X — it's Y" antithesis | 6 | ≥2 matches of "it's not just", "not only … but also", etc. |
| `bare_antithesis` | Bare antithesis ("Not X. Y." / "X, not Y.") | 0 | ≥3 matches of contrast templates ("It's not X. It's Y.", "Built for X, not Y.") (review) |
| `filler_openers` | Generic filler openers | 5 | ≥1 match ("In today's fast-paced world", "When it comes to", etc.) |
| `formulaic_closers` | Essay-style closers | 4 | ≥1 match in final 25% of blocks or ≥2 matches anywhere ("In conclusion", "Ultimately,") |
| `rule_of_three` | Rule-of-three adjective tricolons | 4 | ≥3 "word, word, and word" constructions with density ≥5/1000 words (co-occurrence gated) |
| `whether_youre` | "Whether you're X or Y" | 3 | ≥1 audience-spanning whether/or construction |
| `unicode_artifacts` | Invisible Unicode + math-alphanumeric artifacts (retired) | 0 | Retired aggregate superseded by `hidden_tag_characters`, `invisible_characters`, and `fake_bold_math_alnum` |
| `hidden_tag_characters` | Unicode Tags block (U+E0000–U+E007F) | 0 | Any character in the Unicode Tags block used for hidden prompt smuggling (review, artifact) |
| `invisible_characters` | Zero-width / soft-hyphen / bidi invisible chars | 0 | ≥2 in-word invisible characters outside French U+202F, emoji ZWJ, and Persian/Arabic ZWNJ (review, artifact) |
| `fake_bold_math_alnum` | Mathematical Alphanumeric Symbols (U+1D400–U+1D7FF) | 4 | ≥4 characters from Mathematical Alphanumeric Symbols used as fake bold/italic (active, artifact) |
| `emoji_bullet_headers` | Emoji-prefixed bullet/headers | 3 | ≥3 lines starting with marketing emoji (🚀 ✅ ✨ etc.) |
| `emoji_heading_ratio` | High emoji-prefixed heading ratio | 0 | ≥3 emoji headings and ≥30% of H1–H3 headings start with an emoji (review) |
| `chatbot_markup_leak` | Chatbot citation / markup token leak | 0 | Leaked `contentReference[oaicite:...]`, `cite turn0search0`, `[citation:N]`, `<antThinking>` (review, artifact) |
| `chatbot_reply_residue` | Unedited chatbot reply opener/closer | 0 | Conversational wrapper ("Certainly! Here's...", "Let me know if you'd like me to adjust") (review, artifact) |
| `ai_referral_utm_links` | AI chatbot referral UTM parameter in link | 0 | Outbound link carries `utm_source=chatgpt.com`, `perplexity`, `claude.ai`, etc. (review, artifact) |
| `unfilled_placeholders` | Unfilled template placeholder in visible copy | 0 | `[Insert Company Name]`, `[Your Brand]`, `{{company_name}}`, `acme.example.com`, `555-0199` (review, artifact) |
| `leaked_markdown` | Unrendered Markdown syntax in visible DOM text | 0 | Raw `**bold**`, `### Heading`, `[anchor](url)`, or triple-backtick fences in non-code text (review, artifact) |
| `structural_fake_social_proof` | Unverifiable vanity stats + generic testimonial cards | 0 | Co-occurrence of ≥2 vanity stat claims and ≥2 generic role-only attributions without links (review) |
| `announced_structure` | Self-announcing section structure | 0 | Meta-structural announcements ("In this section, we'll explore", "Here's what makes X different:") (review) |
| `restated_thesis_closer` | Final paragraph restates opening thesis | 0 | Closing paragraph has ≥35% content-word Jaccard overlap with opening paragraph (review) |
| `context_leak_copy` | Prompt instruction or persona leaked into copy | 0 | Copy echoes prompt persona ("As a B2B SaaS copywriter", "Target audience: decision-makers") (review, artifact) |
| `trailing_participial_clauses` | Trailing participial clauses ("— unlocking X") | 0 | ≥3 sentences ending with comma/em-dash + `-ing` buzzword clause (review) |
| `sentence_length_uniformity` | Abnormally uniform sentence length (low burstiness) | 0 | ≥10 prose sentences with coefficient of variation `CV < 0.25` (review) |
| `excess_vocabulary_log_odds` | Corpus excess vocabulary log-odds (Monroe et al. 2008) | 0 | Weighted log-odds z-score against transparent word-count fixture (review) |

## Prose length and language gates (C-01)

`scoreCopy()` enforces prose length and language gates before running statistical rules (`statistical: true`), while deterministic artifact checks (`statistical: false`) always run regardless of prose length or language:

- **Non-English prose** (`detectEnglishProse()` returns `isEnglish: false`): statistical rules are skipped (`status: "unknown"`, `gateReason: "non-english"`); artifact rules still run.
- **`< 150` prose words**: statistical rules are skipped (`status: "unknown"`, `gateReason: "insufficient_prose"`, `thin: true`); artifact rules still run.
- **`150–299` prose words**: statistical rules run at **half weight** (`weight × 0.5`) with `proseConfidence: "low"`.
- **`≥ 300` prose words**: statistical rules run at **full weight** with `proseConfidence: "high"`.

Formality, readability (Flesch-Kincaid), sentiment, and single-model perplexity are never scored (#278 C-15).

## Copy tier thresholds

| Tier | Score range |
|------|-------------|
| Clean | 0–7 |
| Mild | 8–19 |
| Heavy | 20+ |

Score = sum of effective copy-pattern weights after co-occurrence and overlap adjustments, clamped to 100.
