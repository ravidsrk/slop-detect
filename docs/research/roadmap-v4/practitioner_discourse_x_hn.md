# Practitioner discourse (X, Hacker News, Reddit, blogs), 2025–2026: AI design and copy slop, slop detectors, AEO and llms.txt

Research date: 2026-10-19. HN points and comment counts are as of that date, pulled from the HN Algolia and Firebase APIs.

Verification tags used below:
- **[opened]**: I opened the page, or its raw file or API, and read the content.
- **[API]**: verified through an API, meaning the HN Algolia/Firebase APIs, the GitHub REST API and code search (authenticated), or the api.fxtwitter.com mirror. I used the mirror for X posts because x.com needs a login.
- **[2nd]**: secondary source only, meaning a search-result summary or another page quoting it.
- **[title]**: only the title and date were seen, through an HN listing.
- **[NV]**: could not verify.

Limits on this research:
- The shared web-search budget ran out partway through the work, so some threads stop at secondary sources.
- Reddit was unreachable: its JSON search returned non-JSON, and web search surfaced no r/webdev threads.
- The Guardian blocked fetching.

## Q1. Which tells are practitioners calling out in 2025–2026 that the shipped or filed lists don't cover, and which of them can be detected deterministically?

### Takeaway
The best-evidenced uncovered tells fall into three groups:
1. **Builder provenance markers.** These are deterministic and close to conclusive, for example a Lovable badge or v0's `generator` meta tag.
2. **2026 "template chrome" that Anthropic itself now lists as AI tells.** Examples are a single accent word in the headline, "→"-suffixed CTAs, middle-dot meta strings, mono micro-labels, one radius with one soft shadow on every card, and the cream/serif/clay or near-black/acid-accent palettes.
3. **Chatbot citation and URL artifacts in copy,** such as `utm_source=chatgpt.com` and `oaicite`.

Several items on the brief's example list have no 2025–2026 practitioner source at all: grain/noise overlays, border-beam/shimmer, "© 2024" footers, "Built with ❤️", and dead dark-mode toggles.

### Cited Findings

**A. Builder provenance markers (deterministic)**
- A community field guide flags footer fingerprints: "a default favicon, and, near-conclusively, a generator attribution left in: 'Built with v0', 'Built on Lovable'". It rates them "strong for attribution links and default favicons."
  - On code-level fingerprints it says "shadcn `@/components/ui/*` imports and Geist point to v0; a Vite scaffold with visible Supabase boilerplate points to Bolt; a `lovable.dev` meta tag or 'Built on Lovable' badge is conclusive; Material Symbols instead of Lucide points to Gemini-generated output."
  - Source: febbhav/signs-of-ai-design README; repo created 2026-07-22, 27★ — [GitHub](https://github.com/febbhav/signs-of-ai-design) [opened]
- The Wappalyzer-lineage open fingerprint database (enthec/webappanalyzer) has deterministic fingerprints for some builders — [l.json](https://raw.githubusercontent.com/enthec/webappanalyzer/main/src/technologies/l.json) [opened 2026-10-19]
  - **Lovable**: meta `author=lovable`; DOM `link[href*='/lovable-uploads/']`; script src matching `\.lovable\.app/`; JS global `LOV_SELECTOR_SCRIPT_VERSION`; cookie `lovable-preview-mode`.
  - **Base44**: meta `apple-mobile-web-app-title=base44`.
  - There are no entries for v0 or bolt.new.
  - Collision risk: `meta generator="Bolt"` belongs to **Bolt CMS**, not bolt.new.
- I checked a live Lovable site from a Show HN dated 2026-02-22: https://crosspassion.lovable.app [opened via curl 2026-10-19]. Its head contains:
  - `<meta name="twitter:site" content="@Lovable" />`
  - an OG image hosted at `storage.googleapis.com/gpt-engineer-file-uploads/...`
  - inline CSS for `#lovable-badge`, which is the "Edit with Lovable" badge.
- GitHub code search on 2026-10-19 [API] returned these approximate totals:
  - `generator: 'v0.app'` in `layout.tsx`: ≈14,400 files. This is v0's default Next.js metadata and renders as `<meta name="generator" content="v0.app">`.
  - "Created with v0" in `layout.tsx`: ≈3,992.
  - `cdn.gpteng.co/gptengineer.js` in `index.html`: ≈33,600.
  - `lovable-tagger` in `package.json`: ≈78,336.
  - These are GitHub's rough counts for source code. They don't show how often the markers survive into production.
- Not found: any source for `data-v0` attributes, or for `data-lov-id` appearing in production HTML. Whether lovable-tagger output ships to prod is unverified.

**B. A single accent word in the hero headline (the "hero font mix")**
- Krebs's Design Slop Cop has a pattern, "Hero font mix", defined as "One hero word set apart with a second font, an italic, or a different color" — [README](https://raw.githubusercontent.com/AdrianKrebs/ai-design-checker/main/README.md) [opened]
- His blog post, dated Apr 20, 2026, names "a serif italic accent word in an otherwise Inter hero" — [adriankrebs.ch](https://www.adriankrebs.ch/blog/design-slop/) [opened]
- Anthropic's frontend-design SKILL.md (repo last pushed 2026-10-09) says: "Avoid these default typographic treatments; they are the commonest tells of a generated page: Accenting just a single word or phrase in a headline, like putting one word in italic/bold or a different color. Using all caps for labels. Adding unnecessary typographic labels above content." — [anthropics/skills](https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md) [opened]
- The signs-of-ai-design guide describes "a single serif-italic accent word dropped inside a sans headline. The universal 'tasteful AI startup' hero of 2025 and 2026". It rates this "Reliability: moderate. Status: active, rising." — [GitHub](https://github.com/febbhav/signs-of-ai-design) [opened]
- impeccable's deterministic rule pack includes the rule IDs `italic-serif-display` and `accent-bold` — [rules.rs](https://github.com/pbakaus/impeccable/blob/main/crates/core/src/checks/rules.rs) [API]
- Our own repo already computes `accentSerifItalicCount` inside `slop_fonts`, but only for italic serifs. Accent words set apart by color, weight or a second sans aren't covered (`packages/core/src/patterns.ts:76`, `fonts.ts`) [repo].

**C. Anthropic's own 2026 "calibration" list of AI-design clusters**

The current SKILL.md says "For calibration, AI-generated design right now clusters around some traits" — [SKILL.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md) [opened]. The traits it lists:
1. "a warm cream background (near #F4F1EA) with a high-contrast serif display and a terracotta or warm-clay accent (often near #D97757 — Anthropic's own Claude-interaction accent, so on a user's brief it reads as a tell)".
2. "a near-black background with a single bright acid-green or vermilion accent".
3. "a broadsheet-style layout with hairline rules, zero border-radius, and dense newspaper-like columns".
4. "the SaaS-card kit: content chopped into identical rounded cards, one border-radius on everything regardless of hierarchy, the same soft grey shadow (rgba(0,0,0,.1)) under each, and gradient washes as decoration".
5. "template chrome", which covers:
   - "a tracked-out ALL-CAPS eyebrow label above every heading"
   - "meta strings joined with middle dots ('A · B · C')"
   - "labels built as 'WORD — fragment' with a spaced em dash"
   - "tinted near-black (#0B0B0B, #111) standing in for black"
   - "a monospace face for small data labels"
   - "a '→' appended to link and button text"

The same file adds:
- "fade-and-slide-up entrances on each section and hover transitions on every card are the generic default and read as AI-generated".
- Numbered markers (01 / 02 / 03) are appropriate "only if the content actually is a sequence".
- "a big number with a small label, supporting stats, and a gradient accent is the default treatment".

**D. One radius and one soft shadow on everything**
- signs-of-ai-design, "rounded-2xl everything": "One large border radius (16 to 24 pixels) applied to every card, input, button, and image". It attributes the cause to "shadcn's default radius plus the learned association of soft with modern" [opened].
- HN user dematz, on the Krebs thread: "a big unmentioned one is a grid of rounded rects https://correctarity.com/roundedrects" (2026-04-22) — [HN](https://news.ycombinator.com/item?id=47864393) [API]
- HN user roundabout-host, in "Ask HN: How can you tell a site/app is vibe coded?" (Aug 2026): "Often there is the Inter font. Corners are usually quite rounded, there are lots of gradients. Also, I sometimes see weird descriptions of what a particular UI element does, even though it's obvious." — [HN](https://news.ycombinator.com/item?id=49290499) [API]
- prg.sh (Oct 26, 2025) lists "Rounded corners on everything and faint, uniform shadows" and "Subtle fades and hover effects" — [prg.sh](https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website) [opened]
- impeccable rule IDs include `rounded-card` and `border-accent-on-rounded` [API].
- Counter-evidence for 2026: in the AI-design-convergence study, the AI outputs' largest corner radius was **0px**, against a human median of 50px — [study](https://ai-design-convergence.vercel.app) [opened]

**E. "→"-suffixed CTAs and the "Lucide five"**
- Anthropic SKILL.md: "a '→' appended to link and button text" [opened].
- signs-of-ai-design: "Lucide (shadcn's default icon set) with the same recurring picks across unrelated products: Sparkles for AI, Zap for fast, Shield for secure, Check for benefits, BarChart3 for analytics, ArrowRight on every call to action" [opened].

**F. Monospace used as decoration**
- Anthropic SKILL.md: "a monospace face for small data labels" [opened].
- signs-of-ai-design: "Monospace as decoration", rated "Reliability: moderate" [opened].

**G. Bounce and elastic easing**
- signs-of-ai-design: "Bounce and elastic easing" (moderate) [opened].
- impeccable rule `bounce-easing` [API].

**H. The cookie-cutter page order**
- signs-of-ai-design: "hero, logo wall, three-card features, testimonial carousel, stats row, pricing table, FAQ, footer with a repeated call to action". It also claims "One 2026 analysis found about half of indie SaaS pricing pages following an identical nine-element template"; that analysis is unsourced in the README [NV].
- vibecheck.fail lists "Hero-stat-FAQ scaffolding" and "Card grid syndrome" among its checks — [vibecheck.fail](https://www.vibecheck.fail/) [opened]
- vibe-coded.lol is a parody: "Every vibe-coded website is the same page with different words" (HN, 207 pts, 2025-10-17). HN user hshdhdhehd: "About us: Some blurb about how we are passionate about startups, love our customers etc. No business name, human names or contact info though." — [HN](https://news.ycombinator.com/item?id=45622944) [API]
- OpenAI's "Designing delightful front ends with GPT-5.4" (submitted to HN 2026-03-21) says:
  - "Default: no cards"
  - rejects the "Generic SaaS card grid as the first impression"
  - "Avoid pill clusters, stat strips, icon rows, boxed promos, schedule snippets"
  - Source: [OpenAI](https://developers.openai.com/blog/designing-delightful-frontends-with-gpt-5-4) [opened]

**I. Page-length inflation**
- HN user yieldcrv (2026-09-14): "I associate beige or purple extremely long landing pages with vibe coded … A Claude design template masqueraded as a w[ebsite]" — [HN comment](https://news.ycombinator.com/item?id=49700993) [API]
- signs-of-ai-design, "Monotonous spacing": "generous whitespace with no rhythm variation: six screens of scroll for two thousand words" [opened].
- OpenAI's GPT-5.4 guide recommends constraints such as "one H1, a limited number of sections, two typefaces, one accent color, and one primary CTA above the fold" [opened].

**J. Chatbot citation and URL artifacts in copy (deterministic)**
- Wikipedia's "Signs of AI writing" has a `utm_source=` citation section. Its examples include `[oai_citation:0‡wellington.scoop.co.nz](…&utm_source=chatgpt.com)`. Source: raw wikitext, oldid 1380884756, Oct 2026 — [Wikipedia](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) [opened]
- The same page lists markup bugs by vendor:
  - ChatGPT: `:contentReference[oaicite:0]{index=0}`, `oai_citation`, `citeturn0search0`, `turn0image0`, `{"attribution":{"attributableIndex":"X-Y"}}`, and pasted citation-pill text such as "ISO+3".
  - Gemini: `[cite: 1]`, `[span_1](start_span)`.
  - Grok: `grok_card`.
  - Perplexity: `[attached_file:1]`, `[web:1]`.
  - DeepSeek: `【85†L261-269】`.
- HN user zahlman (2026-08-20): "Those who use ChatGPT for research should be advised that it will add `?utm_source=chatgpt.com` to the URLs it provides you. Make sure to edit that away if you don't want people to know." — [HN](https://news.ycombinator.com/item?id=49381324) [API]
- Algolia returned 29 HN comments containing `utm_source=chatgpt.com` links [API].
- Our `unicode_artifacts` pattern only checks zero-width, NBSP, narrow-NBSP and math-alphanumeric characters. It catches none of the artifacts above (`packages/core/src/copyPatterns.ts:287–322`) [repo].

**K. Status of the other examples in the brief**

*Fonts*
- Design Slop Cop's "Templated display fonts" pattern covers "Space Grotesk, Instrument Serif, Geist, Syne, or Fraunces used as the page default" [opened].
- Anthropic's Nov 2025 post admits "You still tend to converge on common choices (Space Grotesk, for example) across generations" [opened].
- HN user dannypovolotski (2026-06-24): "the website with its' Instrument Serif font Claudism is kind of a turn off" — [HN](https://news.ycombinator.com/item?id=48665055) [API]
- In the convergence study, Lovable and Figma Make both used **Fraunces** [opened].
- Our `SLOP_FONT_PREFIXES` list lacks Syne, and Fraunces appears only in `ACCENT_SERIF_PREFIXES` (`fonts.ts`) [repo].
- JetBrains Mono: no source found.

*Gradient orbs and blobs*
- signs-of-ai-design lists them (moderate). This overlaps the shipped `aurora_mesh_gradient` and `colored_glows` patterns [opened].

*3D, plastic and Corporate-Memphis illustrations*
- OpenAI: "Prefer in-situ photography over abstract gradients or fake 3D objects" [opened].
- signs-of-ai-design: "Plastic illustrations and generated headshots" [opened].
- HN user arjie (2026-07-27): "illustrations being a grungy version of Corporate Memphis is 100% downstream of Anthropic dominating the current conversation" — [HN](https://news.ycombinator.com/item?id=49074457) [API]
- This is stylistic. Detecting it would need image analysis, so it isn't deterministic.

*Default shadcn theme*
- Krebs's blog lists "shadcn/ui" as a CSS pattern [opened].
- signs-of-ai-design: "The untouched shadcn card" [opened].
- HN user jjani (2025-04-01): "I feel like the majority of shadcn users doesn't tweak it whatsoever" — [HN](https://news.ycombinator.com/item?id=43542803) [API]
- A search summary attributed prevalence figures to Krebs's report: "untouched shadcn/ui defaults (23.5%)" and "gradient-heavy hero backgrounds (28%)". The URL returned **404** on 2026-10-19 — [report URL](https://www.adriankrebs.ch/design-slop-report.html) [NV]
- Counterpoint from HN user bobthepanda: shadcn "is a common stack… I don't think that by itself is going to be a good validation of AI slop" — [HN](https://news.ycombinator.com/item?id=47864949) [API]

*Other examples from the brief*

| Example | Evidence found | Status |
|---|---|---|
| Default favicon | signs-of-ai-design ("strong") | [opened]; no second source found |
| "Most Popular" three-tier pricing | signs-of-ai-design ("weak alone") | [opened]; single source |
| "Get Started" plus ghost secondary CTA | signs-of-ai-design ("weak alone") | [opened]; single source |
| Title Case everywhere | signs-of-ai-design (weak); Wikipedia: "In section headings, AI chatbots strongly tend to capitalize all main words." | [opened] |
| Explanatory microcopy for obvious UI | HN roundabout-host (above); Quesma's Oct 7, 2026 review of GPT-6 Astra's output: "Some Captain Obvious statements" — [Quesma](https://quesma.com/blog/invisible-cities-one-shot/) | [opened] |

No 2025–2026 practitioner source was found for:
- grain/noise overlays
- border-beam or shimmer buttons
- "© 2024" stale footers
- "Built with ❤️"
- dark-mode toggles that do nothing
- default OG images (Lovable's defaults are unconfirmed: a third-party guide says the template ships no OG tags, and the live site had a custom OG image)

### Inferences

**Deterministic and near-conclusive.** These all come from meta tags, attribute or asset hosts, JS globals, cookies, code strings and favicon hashes:
- builder markers (v0 `generator`, `#lovable-badge`, `@Lovable` twitter:site, `gpt-engineer-file-uploads`, `/lovable-uploads/`, `gptengineer.js`, Base44 meta)
- chatbot citation artifacts

**Deterministic but stylistic.** These are read from computed CSS or the DOM, and each means little alone:
- hero accent word
- "→" CTAs
- middle-dot meta strings
- mono micro-labels
- uniform radius and shadow
- zero-radius hairline broadsheet layout
- bounce easing
- page length
- template section order

**Not deterministic.** These would need image analysis or semantics:
- plastic or 3D illustrations
- generated headshots
- "explanatory microcopy"

**Provenance is not slop.** A polished site built in Lovable would still carry the markers. This argues for a separate provenance flag rather than adding weight to the slop score.

### Gaps
- X/Twitter coverage is thin. Only two posts were verified verbatim through the mirror; see Q2.
- Reddit was unreachable, so no r/webdev or r/web_design threads could be cited.
- Per-pattern prevalence figures from Krebs's report couldn't be verified (404).
- There is no measured false-positive rate for any of the 2026 "template chrome" tells.

## Q2. "Second-order slop": what are model vendors and builders doing to steer away from the old fingerprint, and what new monocultures does that create?

### Takeaway
By late 2025 both Anthropic and OpenAI were explicitly steering their models away from Inter and purple. Anthropic coined "distributional convergence". By October 2026, Anthropic's own skill file lists the *new* defaults its model drifts to, including its own Claude accent #D97757.

An August 2026 measurement of five AI tools found warm grounds, serif display faces, letterspaced caps, 0px radius and very high grid adherence, with no Inter, no purple and no rounded-card grids. The 2024 fingerprint that Slop Detector's 27 patterns encode is therefore decaying, and a 2026 "editorial or terminal" monoculture is replacing it.

### Cited Findings

**Adam Wathan's apology for indigo**
- Wathan posted on X on Aug 7, 2025 (17:37 UTC): "I'd like to formally apologize for making every button in Tailwind UI `bg-indigo-500` five years ago, leading to every AI generated UI on earth also being indigo." — [x.com/adamwathan](https://x.com/adamwathan/status/1953510802159219096) [API via api.fxtwitter.com]
- Engagement: 22,281 likes, 1,089 reposts, 405 replies and 1,503,917 views.
- Secondary coverage dates the post to Aug 7, 2025 — [aibase](https://news.aibase.com/zh/news/20365) [2nd]

**ui.sh**
- ui.sh describes itself as "Agent skills for interface builders" and "A collection of expertly crafted, task-oriented prompts and workflows for building UIs that don't suck." — [ui.sh](https://ui.sh) [opened]
- A search summary attributes it to Wathan and Steve Schoger, saying it aims to stop agents producing the same generic landing page [2nd].

**Anthropic's "Improving frontend design through Skills" (Nov 12, 2025)**
- Authors: Prithvi Rajasekaran, Justin Wei and Alexander Bricken of Anthropic's Applied AI team — [claude.com](https://www.claude.com/blog/improving-frontend-design-through-skills) [opened]
- It names the problem "distributional convergence" and explains it this way:
  - "During sampling, models predict tokens based on statistical patterns in training data."
  - "Safe design choices–those that work universally and offend no one–dominate web training data."
  - "Without direction, Claude samples from this high-probability center."
- Its prompt bans "Inter, Roboto, Open Sans, Lato, default system fonts" and "Clichéd color schemes (particularly purple gradients on white backgrounds)".
- It warns: "You still tend to converge on common choices (Space Grotesk, for example) across generations."
- The same post also lists Space Grotesk as a "good" choice, which is internally inconsistent.

**The Claude Code plugin wording**
- HN users quote the plugin text "NEVER converge on common choices (Space Grotesk, for example) across generations." (htrp, 2026-04-17; alwillis, 2026-01-04) — [HN](https://news.ycombinator.com/item?id=47807706) [API]

**Anthropic's SKILL.md, Oct 2026**
- The current file names the new clusters: cream + serif + clay; near-black + acid-green or vermilion; broadsheet with hairline rules and 0 radius; the SaaS-card kit; and template chrome. Full quotes are in Q1-C — [SKILL.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md) [opened]

**Claude Design**
- Launch (Apr 17, 2026): HN 1,235 pts and 762 comments — [HN](https://news.ycombinator.com/item?id=47806725) [API]
- Top comment, from ossa-ma: "it will absolutely converge to the norm and homogeneity (you see it everywhere now, just scroll on ShowHN and take a look at the UIs)" [API]
- Ryan Mather (@Flomerboy, Anthropic), Apr 17, 2026: "My tips for getting the best results out of Claude Design! … 1. Set up your design system and your core screens. An hour of setup and refinement here is worth it". The post had 8,679 likes and 1,545,190 views — [x.com/flomerboy](https://x.com/flomerboy/status/2045162321589252458) [API via fxtwitter]

**OpenAI's GPT-5.4 front-end guide (submitted to HN 2026-03-21; no date on the page)**
- It says to "avoid default stacks (Inter, Roboto, Arial, system)" and to avoid "purple-on-white defaults" and "purple bias or dark mode bias".
- It also says "Default: no cards" and "low and medium reasoning levels often lead to stronger front-end results".
- It recommends Playwright self-verification and ships a `frontend-skill` — [OpenAI](https://developers.openai.com/blog/designing-delightful-frontends-with-gpt-5-4) [opened]
- The page doesn't mention the Aug 2025 GPT-5 guide [opened].

**Anti-slop skills (GitHub API, 2026-10-19)**

| Repo | Stars | Note |
|---|---|---|
| Leonxlnx/taste-skill | 99,135★ | "art direction, reference images and a browser check instead of generic AI pages" |
| pbakaus/impeccable | 82,943★ | |
| Nutlope/hallmark | 30,374★ | |
| anthropics/skills | 182,126★ | |

[API]
- Hallmark "runs fifty-seven slop-test gates plus a pre-emit self-critique, and refuses the on-distribution defaults every LLM was trained into" — [README](https://github.com/Nutlope/hallmark) [opened]
- HN reception of Hallmark was 7 pts (2026-07-26) — [HN](https://news.ycombinator.com/item?id=49058547) [API]
  - loopmonster: "every one screams of being AI generated … practically identical".
  - aleksiy123: "Has anyone got this or impeccable or any other to actually work? For me it still pretty much looks like slop."

**The AI-design-convergence study (Aug 2026; author not named)**
- Sample: 945 award-winning human sites, from Awwwards, Httpster, One Page Love, Land-book, recent.design and SaaS Landing Page, compared against one identical brief given to five AI tools. The tools were Claude Design, Replit, Codex, Lovable and Figma Make; only three outputs were measurable — [study](https://ai-design-convergence.vercel.app) [opened]
- Method: 14 computed features, measured in headless Chromium at 1440×900.
- Distances: the median pairwise distance between human sites was 4.45, while AI outputs were 1.91–3.53 apart.
- Typicality scores: Claude Design 2.16, Replit 2.34, median human site 3.01, Codex 3.30.
- "Four of five outputs used a warm brass accent on a warm ground with a serif display face and uppercase letterspaced labels. Two of them (Lovable and Figma Make) both used Fraunces. No output used Inter, a purple gradient, or a rounded-card grid."
- Human median vs AI output:

| Measure | Human median | AI output |
|---|---|---|
| Largest corner radius | 50px | 0px |
| Grid adherence | 0.62 | 0.78–0.92 |
| Distinct type sizes | 8 | 10–13 |

- The author acknowledges that n=3 measurable outputs is small.
- HN reception: 2 pts — [HN](https://news.ycombinator.com/item?id=49173472) [API]

**Further evidence of the shift**
- signs-of-ai-design: "Purple gradients were the canonical UI tell of 2024 and are already migrating toward cream palettes and italic serif heroes". It also describes an "Emerald fallback": "When a prompt bans purple, models cascade to emerald (#10B981)." [opened]
- "Ask HN: What's with the Wargames-like UX lately?" (Apr 15, 2026). The OP: "For a while, anything with a purple gradient was likely a claude inspired design". harrisonpage: "for a while Claude was doing purple-tinged UIs and now it's making retro-terminal designs" — [HN](https://news.ycombinator.com/item?id=47774003) [API]
- The OP of the Aug 2026 Ask HN on spotting vibe-coded sites listed "Black background, green and orange gradients, same font" — [HN](https://news.ycombinator.com/item?id=49290499) [API]
- Quesma (Oct 7, 2026, Piotr Migdał) says GPT-6 Astra's beige background and `05`-style numbering were borrowed from the Claude visualization style. It also finds Astra still has "Some AI design slop" — [Quesma](https://quesma.com/blog/invisible-cities-one-shot/) [opened]
- HN user matsemann: "These designs are now the trend, though. So they will influence how human designed/built websites also look." — [HN](https://news.ycombinator.com/item?id=47865558) [API]
- Related HN titles [title]:
  - "Brainless: Shadcn components that look like Claude Code, Codex and Grok", 128 pts, 2026-07-15 — [HN](https://news.ycombinator.com/item?id=48926085)
  - "Shadcn/UI now defaults to Base UI instead of Radix", 282 pts, 2026-07-05 — [HN](https://news.ycombinator.com/item?id=48791328)
  - "'Vibe Design' with Stitch" (Google blog), 2026-03-18 — [HN](https://news.ycombinator.com/item?id=47429153)

### Inferences
- The fingerprint lifecycle runs on a 6–12-month cycle: a tell gets named publicly (Wathan, Aug 2025), vendors ban it (Anthropic Nov 2025, OpenAI Mar 2026), and models move to the next-most-probable default. Patterns such as `purple_accent`, Inter-centred `slop_fonts` and `centered_hero` are losing recall on 2026 output, and the cream/serif, broadsheet and terminal looks are not well covered.
- Anthropic, by naming #D97757, #F4F1EA and the "→"/middle-dot/mono-label chrome, has handed us a vendor-authored list of current defaults. Note that the signs-of-ai-design guide may have drawn on Anthropic's skill, so these two sources are not fully independent.
- Detector-gated generation is now mainstream. Hallmark's 57 gates and impeccable's 59 deterministic rules mean pages will increasingly pass fixed CSS checks while staying homogeneous. Distributional and sameness metrics (#198) gain value over time.

### Gaps
- v0, Lovable and Bolt design-system and theme features, and Google Stitch's positioning, weren't researched because the search budget was exhausted.
- I didn't open the Aug 2025 OpenAI GPT-5 front-end prompting guide.
- I have no primary source for ui.sh's authorship.

## Q3. Copy discourse: em dashes, "it's not X, it's Y", "delve", Wikipedia's "Signs of AI writing", LinkedIn, and new 2026 copy tells

### Takeaway
The em dash has gone from flagship tell to *historical* indicator. OpenAI suppressed it (GPT-5.1 and Altman's Nov 2025 post). Wikipedia now files "Overuse of em dashes (2022–September 2026)" under historical indicators and says only Claude still exceeds professional writers.

The 2026 copy tells practitioners cite are different:
- era-specific vocabulary (GPT-6: "quietly", "steady", "dependable", "matters"…)
- short 8–20-word sentences with only periods and commas
- Markdown residue
- chatbot citation and `utm_source` artifacts

The negation pivot ("It's not X, it's Y") remains the most-discussed pattern. Human backlash, with people now avoiding em dashes or capital letters to dodge accusations, is itself a major theme.

### Cited Findings

**Em dashes**
- Altman posted the "small-but-happy win" on Nov 14, 2025: ChatGPT now follows custom instructions not to use em dashes. Users posted screenshots of continued use — [Storyboard18](https://www.storyboard18.com/digital/sam-altman-celebrates-no-em-dash-update-sparks-online-debate-among-chatgpt-users-84245.htm); [AOL/Business Insider](https://www.aol.com/news/sam-altman-says-openai-fix-133235171.html) [2nd]
- Ars Technica's headline "Forget AGI–Sam Altman celebrates ChatGPT following em dash formatting rules" was on HN 2025-11-16 — [HN](https://news.ycombinator.com/item?id=45944717) [title]
- Wikipedia's raw wikitext (Oct 2026) [opened] — [Wikipedia](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing):
  - The section "Overuse of em dashes (2022–September 2026)" now sits under **Historical indicators**.
  - "some AI companies have attempted to make their newer chatbots suppress their use, most notably OpenAI's GPT-5.1."
  - "A July 2026 study found that of contemporary models only Claude used em dashes more than professional writers, and ChatGPT used them less." The citation is The Economist, "How to spot AI writing", 30 July 2026 — [Economist](https://www.economist.com/culture/2026/07/30/how-to-spot-ai-writing) [2nd, via Wikipedia]
  - "latest AI models of late (September 2026 and onward) have more and more often been found to be hard coded to not use em dashes at all … commas and periods are more likely now than even human text, and now that has become its own sign of AI writing." Wikipedia tags this claim **{{citation needed}}** (Oct 2026).
- HN threads on em dashes [API]:
  - "New accounts on HN more likely to use em-dashes" (marginalia.nu, 2026-02-25): 717 pts and 598 comments. d4mi3n: "I'm still salty that I can't use em-dashes anymore for fear of my writing being flagged as AI generated." marginalia_nu posted word skews for new accounts, such as "built" at 10.93% vs 2.11% (p=2.1e-10). The data is at github.com/vlofgren/hn-green-clankers — [HN](https://news.ycombinator.com/item?id=47152085)
  - "Hacker News em dash user leaderboard pre-ChatGPT": 377 pts, 2025-08-30 — [HN](https://news.ycombinator.com/item?id=45071722)
  - "Em dashes are amazing": 391 pts, 2026-07-24 — [HN](https://news.ycombinator.com/item?id=49034747)
  - "Human writers have always used the em dash" (The Ringer): 129 pts, 2025-09-12 — [HN](https://news.ycombinator.com/item?id=45226150)
  - "Why do AI models use so many em-dashes?" (seangoedecke.com): 98 pts, 2025-11-02 — [HN](https://news.ycombinator.com/item?id=45788327)
- TechRadar, "The days of the em dash being a ChatGPT giveaway are over — it's time to bring it back" — [TechRadar](https://www.techradar.com/ai-platforms-assistants/chatgpt/the-days-of-the-em-dash-being-a-chatgpt-giveaway-are-over-its-time-to-bring-it-back) [title; undated]

**Vocabulary by model era**
- Wikipedia groups AI vocabulary by model era and says "The words that LLMs overuse have changed over time"; "delve" "was famously overused by ChatGPT in 2023 and early 2024" and then declined [opened].
  - GPT-5 era (mid-2025 to mid-2026): "emphasizing, enhance, highlighting, showcasing", plus canned notability language.
  - GPT-6 era (mid-2026 onward): "challenge, clearer, dependable, echoed, foster, leverage, matters, multifaceted, practical, prioritize, quietly, steady, universally (with much more period and comma usage and shorter sentences around a strict 8–20 word limit)".
  - The GPT-6 list cites a product review (intellectualead.com), so its sourcing is weak.
- As of October 2026, Wikipedia says the most common signs of new AI text include "Markdown presence" [opened].

**"It's not X, it's Y"**
- Wikipedia's "Negative parallelisms" section says the construction is "common among human writers" but "stereotypically an 'AI sign'", with forms "Not only … but …", "It is not just …, it's …" and "no …, no …, just …" [opened].
- "It's Not Just X. It's Y" (Cybernetic Forests newsletter): HN 180 pts and 146 comments, 2026-05-31 — [HN](https://news.ycombinator.com/item?id=48350149) [API]
  - The top comment quotes the article: "if we publicly shame people whose text looks like it might have been written by a machine … people stop writing in ways that they internalize as 'AI writing' out of fear of false detection, it sends a signal that your language for reasoning must be policed".
  - Baader-Meinhof: "these AI idioms … They're like watermarks for text."
- Related titles [title]:
  - The Guardian (2026-04-15): "ChatGPT's latest stylistic quirk is sinister, infuriating – and everywhere", about "it's not X, it's Y" — [HN](https://news.ycombinator.com/item?id=47787458). The body couldn't be fetched.
  - "Ask HN: How can I avoid the 'It's not just X, it's Y' writing" (2026-02-25) — [HN](https://news.ycombinator.com/item?id=47153145)

**Wikipedia's page on HN and tools built from it**
- "Wikipedia: Signs of AI Writing" drew 61 pts and 17 comments (2025-07-27). That is modest, not viral, on HN — [HN](https://news.ycombinator.com/item?id=44700558) [API]
- Spin-offs [title]:
  - "Wikipedia Signs of AI writing: a Vale ruleset" (2026-01-21) — [HN](https://news.ycombinator.com/item?id=46709386)
  - A Wikipedia-signs quiz (2026-02-07) — [HN](https://news.ycombinator.com/item?id=46925384)
- blader/humanizer, a Claude Code skill that strips these signs, has 58,323★ [API].
- FeedHive/ai-slop-detector ("120 patterns that make writing read like AI slop", 2026-10-12) has 79★ [API].

**Counter-signals from humans**
- "Ask HN: What's with the forced lower-casing texts?" (2026-09-22): "Are we all trying so hard not to look and be labeled AI-generated?" — [HN](https://news.ycombinator.com/item?id=49798523) [API]
- HN user helloplanets: typos are now "a signal of humanity", and "Several artists who have an 'AI-ish' style have been wrongfully crucified for using AI" — [HN](https://news.ycombinator.com/item?id=48350149) [API]

**LinkedIn**
- LinkedIn added a "Seems like AI slop" button (TechCrunch, Jul 30, 2026). It gives LinkedIn a signal to tune its classifiers, which reduce slop in recommendations from outside a user's network.
  - Authors get private dashboard flags when posts "may seem inauthentic due to heavy AI use".
  - The CPO, Hari Srinivasan, said: "AI slop is a top priority for all of us."
  - The article mentions no safeguards against false positives — [TechCrunch](https://techcrunch.com/2026/07/30/linkedin-adds-a-button-to-report-ai-generated-slop/) [opened]
- A follow-up says "LinkedIn's 'Seems Like AI Slop' button drops views by 40%" (Yahoo Finance; HN 2026-08-26) — [HN](https://news.ycombinator.com/item?id=49446983) [title; NV]

**Other**
- "Genre glitches and unexpected promotional phrases as a sign of AI writing" (jilltxt.net, 2026-05-26) — [HN](https://news.ycombinator.com/item?id=48279750) [title]
- The HN search for "delve" is dominated by the Delve (YC) fake-compliance scandal ("Delve – Fake Compliance as a Service", 836 pts, 2026-03-19) — [HN](https://news.ycombinator.com/item?id=47444319) [API]. This is not about the vocabulary tell.

### Inferences
- `em_dash_overload` is the shipped copy pattern most at risk.
  - The tell is now model-specific: it fires on Claude but not current ChatGPT.
  - The public backlash is very large (threads of 717, 391 and 377 points).
  - The obvious replacements are an inverted signal (low punctuation diversity) and #200's sentence-length uniformity, now with a concrete 8–20-word band from Wikipedia.
- Era-specific word lists mean `buzzword_density` needs versioned lexicons. "delve" is a 2023-era tell; "quietly", "steady" and "matters" are 2026-era ones.
- Chatbot citation artifacts are the copy-side equivalent of builder markers. They are cheap, near-zero false-positive, and clearly not covered today.

### Gaps
- The Economist study's methods weren't read.
- The Wikipedia GPT-6 claims rest on weak sources or carry {{citation needed}}.
- No source was found for LinkedIn "broetry" in 2025–2026.
- No X posts on copy tells were verified beyond the coverage of Altman's post.

## Q4. Criticism of AI-slop detectors and "AI shaming": false positives, pioneer vs clone, accusations, gaming, leaderboards and risk

### Takeaway
HN treats design-slop *data* as interesting (Krebs's corpus post: 333 pts) but pushes back hard on several points:
- false positives on fonts and devices that predate AI ("popular for a reason", "rule of three was good writing advice", "Gettysburg Address flagged 17 patterns")
- the pioneer vs clone problem ("peak Bootstrap", "2010s startup sites", Linear/Raycast)
- detection as policing

The community's own field guide says outright: "Do not use this list to harass people." Prevention skills built on deterministic gates, with tens of thousands of stars, are both the main evasion vector and the clearest sign of what users actually want: fixes, not scores.

### Cited Findings

**Krebs, "Scoring Show HN submissions for AI design patterns"**
- HN 333 pts and 235 comments, 2026-04-22 — [HN](https://news.ycombinator.com/item?id=47864393) [API]. The blog post is dated Apr 20, 2026 — [blog](https://www.adriankrebs.ch/blog/design-slop/) [opened]
- Results: 1,590 sites scored. High (4+ patterns) 22% (347), Medium (2–3) 32% (508), Low (0–1) 46% (735).
- Accuracy: "manual QA suggested about 5–10% false positives". The author calls the sites "uninspired" rather than "bad" and says the detection is not a judgment of quality.
- Inconsistencies: the methodology says ~1,400 sites but the results say 1,590. The README's thresholds also differ (5+ High, 3–4 Medium) [opened].
- Comments [API]:
  - simonw: "the substance of the post is about visual design traits common with AI-generated frontends, which is a much more interesting conversation".
  - tptacek: "I think AI-generated look-feel and web design is basically fine, and that the real problem is that so much of the substance of these submissions is vibe-coded."
  - michaelcampbell, on the blog's claim that "colored left borders are almost as reliable a sign … as em-dashes": "so, n=1 plus Baader-Meinhof?"
  - nottorp: most tech project sites "have looked the same to me for years".
  - flexagoon: "Nooo please don't ruin great fonts by associating them with low effort vibecoding … they are popular for a reason" — [HN](https://news.ycombinator.com/item?id=47865795)
  - bstsb: "lots of these are used by AI because they're good … maybe i'm an LLM too" — [HN](https://news.ycombinator.com/item?id=47866164)
  - bobthepanda: shadcn "by itself is [not] going to be a good validation of AI slop".

**"Slop Cop" (awnist.com), a prose-pattern checker as described in the comments**
- HN 252 pts and 160 comments, 2026-04-17 — [HN](https://news.ycombinator.com/item?id=47806845) [API]
- trane_project: "I pasted a blog that I wrote myself and flagged hundreds of patterns … there are simply too many false positives".
- 3eb7988a1663: the Gettysburg Address got "17 patterns identified out of only 305 words".
- red_admiral: "The rule of three was actually good and common writing advice in the pre-LLM era".
- furyofantares: "Removing the aesthetic tells from LLM-generated text won't fix the fact that there's nobody home".

**Pioneer vs clone**
- On vibe-coded.lol (207 pts) — [HN](https://news.ycombinator.com/item?id=45622944) [API]:
  - SeanAnderson: "Someone didn't live through peak Bootstrap and it shows".
  - lispisok: "These alleged vibe coded websites look identical to all the tech startup websites of the 2010s."
- signs-of-ai-design: the dark-glow look "is the 'Linear style' that Linear, Raycast, and Reflect built by hand from around 2019 … A dark glowing SaaS page alone proves nothing about authorship" [opened].
- In the Claude Design thread, ljm traces homogeneity back to Web 2.0 and Bootstrap — [HN](https://news.ycombinator.com/item?id=47806725) [API]

**Harm and harassment norms**
- signs-of-ai-design: "Do not use this list to harass people. Identifying AI involvement in a design is not evidence of low effort, deception, or bad work, and misidentifying a human designer's work as AI causes real harm." It also advises "Stack signs, never single ones" and "Judge the absence of decisions, not the presence of a style" [opened].
- Wikipedia's "Ineffective indicators" section: "False accusations of AI use can drive away new editors and foster an atmosphere of suspicion." It lists perfect grammar, mixed registers, "bland" prose, "fancy" prose and isolated transition words as ineffective. It also warns that treating the signs as the problem "could just make detection harder" [opened].
- Related HN titles [title]:
  - "People Getting Falsely Accused of Using AI to Write" (NYMag, 2026-05-31) — [HN](https://news.ycombinator.com/item?id=48344992)
  - "YouTube's AI slop detector incorrectly targets Kurzgesagt" (Dexerto, 2026-08-07) — [HN](https://news.ycombinator.com/item?id=49213990)
  - "I was accused of using AI in my dissertation but I wrote it all myself" (BBC, 2026-08-11) — [HN](https://news.ycombinator.com/item?id=49255069)

**"Name and shame" vs user-side filtering**
- "Show HN: Tropes.fyi – Name and shame AI writing" got only 5 pts (2026-02-20) — [HN](https://news.ycombinator.com/item?id=47088813) [API]
- Kagi's community-driven SlopStop, a user-side filter, got 589 pts and 264 comments (2025-11-13) — [HN](https://news.ycombinator.com/item?id=45919067) [API]
- "Ask HN: How can you tell…": sjacob asks "If you can't tell, does it matter?" [API]

**Gaming and evasion**
- impeccable is "a CLI that scans HTML/CSS/JSX for 59 deterministic anti-pattern rules … zero-offset dark glows on text, 1px borders paired with 40px shadow blur, Inter/Roboto/Geist as the default 'tasteful' font" (HN user Wpnx330, Aug 2026) — [HN](https://news.ycombinator.com/item?id=49290499) [API]
- Rule IDs in its rule pack include `ai-color-palette`, `dark-glow`, `hero-eyebrow-chip`, `icon-tile-stack`, `kicker-above-heading`, `tracked-caps`, `side-tab`, `dash-prefix` and `bounce-easing` [API].
- Hallmark runs 57 gates [opened]. HN users say such pages still look like slop (Q2) [API].
- HN user Baader-Meinhof: "Companies will eventually train their models to be undetectable" [API].
- The "Antislop" paper (arXiv 2510.15061; HN 120 pts, 2025-10-23) is a framework for eliminating repetitive LLM patterns — [HN](https://news.ycombinator.com/item?id=45683897) [title]
- vibecheck.fail's framing: "grades the vibe, not the toolchain … We don't care who typed the code" [opened].

### Inferences
- The community separates **"defaults" (acceptable to measure)** from **"authorship accusations" (harmful)**. Slop Detector's copy ("AI-design-slop fingerprint", "Heavy") should stay on the defaults side: per-pattern evidence, stacked-signal language, no "AI-generated" verdicts.
- Public leaderboards that name third parties get a poor reception (Tropes.fyi: 5 pts). Opt-in filtering (Kagi) and aggregate data (Krebs) are welcomed.
- `rule_of_three` and `em_dash_overload` are the shipped patterns most exposed to the "great human writing gets flagged" critique.

### Gaps
- No legal cases or threats against design-slop detectors were found.
- The thoughtbot post "Your vibe coded website is going to get you fined" (2026-07-03) wasn't opened; it is likely about accessibility law — [HN](https://news.ycombinator.com/item?id=48771997) [title]
- No discussion was found of Krebs's public Show HN gallery being seen as harassment, either positively or negatively.

## Q5. AEO and llms.txt in practice: usage by AI providers, markdown twins, crawler traffic, referral measurement, and "GEO snake oil"

### Takeaway
Practitioner consensus by late 2026 has several parts:
- No major AI provider has documented *using* llms.txt.
- Bots *fetching* it proves nothing (the cats.txt experiment).
- Google contradicts itself: Search says it isn't needed, while Lighthouse 13.3 (May 2026) added a scored llms.txt audit under an experimental "Agentic Browsing" category.
- AI referrals are roughly 0.3–1% of site traffic.
- Markdown-for-agents via `Accept: text/markdown` became a Cloudflare platform feature in Feb 2026.

"GEO" claims draw strong scepticism ("astrology", "net-negative").

### Cited Findings

**Google's position**
- John Mueller, June 2025 on Bluesky: "FWIW no AI system currently uses llms.txt". He compared the file to the keywords meta tag — [SERoundtable](https://seroundtable.com/google-ai-llms-txt-39607.html) [2nd]. Mark Williams-Cook quotes him too [opened].
- Gary Illyes, July 2025 Search Central Live: Google doesn't support llms.txt [2nd].
- Other reported Google moves [2nd]:
  - A Google Search Central guide on May 15, 2026 reportedly told site owners to ignore the file.
  - Mueller reportedly called it "purely speculative for now" on Reddit in June 2026.
  - Google briefly added llms.txt to some of its developer docs in Dec 2025 — [Omnius](https://www.omnius.so/industry-updates/google-adds-llms-txt-to-docs-after-publicly-dismissing-it); [SEJ](https://searchenginejournal.com/googles-llms-txt-guidance-depends-on-which-product-you-ask/575431/)

**Lighthouse 13.3 "Agentic Browsing" (May 2026)**
- The category has six audits; three are scored (accessibility tree, CLS, llms.txt) and three WebMCP audits are informational — [DebugBear](https://www.debugbear.com/blog/lighthouse-agentic-browsing); [The Decoder](https://the-decoder.com/google-tests-websites-for-llms-txt-and-agent-compatibility/) [2nd; not opened]
- The llms.txt audit checks that the file exists, has an H1, has enough length, has links, and returns no server errors.
- A missing file drops out of the calculation; only a malformed file costs points.
- It doesn't check per-page markdown twins.

**The cats.txt experiment**
- Mark Williams-Cook, "How cats.txt showed llms.txt evidence is GEO astrology" (Aug 4, 2026) — [Substack](https://markwilliamscook.substack.com/p/how-catstxt-showed-llmstxt-evidence) [opened]
- He published a fake standard. PerplexityBot, GPTBot, ClaudeBot and Googlebot fetched it. Google indexed it, AI Overviews repeated invented details from it, and ChatGPT said it "can potentially help you rank".
- His conclusion: the same four observations would happen for any text file. llms.txt is "low-risk to add but should not be sold as a proven lever".
- He reports that an Ahrefs study of 100,000 domains found crawlers largely ignore the file [2nd within opened].
- HN: 4 pts, 2026-08-29 — [HN](https://news.ycombinator.com/item?id=49494245) [API]

**Practitioner logs and adoption**
- HN user graemep (2026-05-23): "If I look at the logs of sites that Anthropic crawls (and in some cases references in answers) and there are no requests for llms.txt" — [HN](https://news.ycombinator.com/item?id=48246404) [API]
- The maintainer of the "most-installed llms.txt plugin for WordPress" added logging of AI-bot access (2025-07-05). No results were found — [HN](https://news.ycombinator.com/item?id=44474480) [API]
- "Ask HN: Is the web for machines (/llm.txt) the one we wished we had as humans?" (36 pts, 57 comments, 2026-06-05) — [HN](https://news.ycombinator.com/item?id=48410589) [API]
  - rickette: "Does any of the LLM providers actually use llms.txt?"
  - skywalqer: "Why didn't they place it in .well-known? Also, I couldn't find a website that has it."
  - mohamedkoubaa: "It just hasn't been gamed yet".
  - ahriad: "We broke the web so badly for humans that we had to build a clean web for machines".
- "I crawled 1,500 sites: 30% block AI bots, 0.2% use llms.txt" (websiteaiscore.com, 2026-01-15). The OP says ~30% block GPTBot "via legacy robots.txt rules or old security plugins (often without the owner knowing)" — [HN](https://news.ycombinator.com/item?id=46632157) [API; article not opened]
- "Ask HN: Anyone using llms.txt on blogs?" (2025-08-01). skeptrune (Mintlify) claims "the boost in SEO/GEO traffic"; codegeek says ChatGPT said it doesn't use it — [HN](https://news.ycombinator.com/item?id=44759462) [API]
- An HN-posted AEO grader segments AI bots into "Data for Training / Search Indexes / User Interactions" and scores "/llms.txt available" as 0/1 (2025-10-27) — [HN](https://news.ycombinator.com/item?id=45718768) [API]

**Markdown for agents**
- "Cloudflare adds real-time Markdown rendering for AI agents" (48 pts, 2026-02-13) — [HN](https://news.ycombinator.com/item?id=46997526) [API]
  - conartist6: "they're not working for the people using the agents, they're working to serve the agents".
- Vercel's "A proposal for inline LLM instructions in HTML based on llms.txt" (2025-08-20) — [HN](https://news.ycombinator.com/item?id=44963512) [title]
- Our `md.twin` check already sends `Accept: text/markdown` and also checks `Link rel=alternate` and `Vary` (`packages/core/src/aeo.ts:519, 362, 197`) [repo].

**AI referral traffic** [2nd; search summaries only]
- SE Ranking (2026): AI platforms are ≈0.32% of all website traffic, up from 0.02% in 2024. ChatGPT is 74.78% of AI referrals — [SE Ranking](https://seranking.com/blog/ai-traffic-research-study/)
- Ahrefs (Mar 2026; 74,752 sites): AI chatbots sent 0.28% of total web traffic — [Ahrefs](https://ahrefs.com/blog?p=196969)
- Conductor, via Rise at Seven: 0.1–2.8% by industry, average ≈1.08% — [Rise at Seven](https://riseatseven.com/blog/aeo-ai-search-statistics/)
- BrightEdge, via Mezha (~Sep 2026): ChatGPT is 95% of AI-service traffic — [Mezha](https://mezha.ua/en/news/chatgpt-dominates-ai-web-traffic-315565/)
- The studies use different denominators.

**GEO scepticism**
- On a16z's "GEO over SEO" (HN 70 pts, 2025-05-30) — [HN](https://news.ycombinator.com/item?id=44133279) [API]:
  - edwin: in ~800 consumer queries, "Google's new 'AI Mode' and ChatGPT gave the same top recommendation only ~47% of the time".
  - kurtoid: "SEO and it's related fields are a net-negative for the Internet".
  - jameslk: "the fleeting era where AI models are not entirely corrupted by marketing".
- "Reddit is the #1 most cited source across every major AI search platform" (2026-04-06) — [HN](https://news.ycombinator.com/item?id=47667978) [title]
- Crawler-load discourse [title]:
  - "Devs say AI crawlers dominate traffic, forcing blocks on entire countries" (Ars, 360 pts, 2025-03-25) — [HN](https://news.ycombinator.com/item?id=43476337)
  - "AI crawlers, fetchers are blowing up websites; Meta, OpenAI are worst offenders" (231 pts, 2025-08-21) — [HN](https://news.ycombinator.com/item?id=44971487)

### Inferences
- Slop Detector's AEO axis is on solid ground when it frames itself as *readiness*: reachability, robots policy, server-rendered HTML, a markdown twin. It is on weak ground if it implies llms.txt drives citations or traffic.
- The Lighthouse audit gives a concrete external spec for llms.txt *validity*, and treats a missing file as neutral.
- Robots checks should tell training-bot blocks apart from search and user-fetch blocks. Blocking only GPTBot is a legitimate stance, not an AEO failure.

### Gaps
- Lighthouse's audit details, Google's May 2026 guide and the Ahrefs 100k-domain study were seen only in secondary summaries.
- No primary server-log study of llms.txt fetches was found.
- Reddit r/SEO threads were unreachable.

## Q6. Community datasets and viral tools in this space (2025–2026), with reception metrics

### Takeaway
Data journalism about design slop goes viral (Krebs: 333 pts; vibe-coded.lol: 207 pts). Detector tool launches mostly don't: slopcop and vibecheck Show HNs drew 2–5 pts, and signs-of-ai-design has 27★. Prevention and "humanizer" skills dominate adoption, at 30K–99K★. Direct deterministic competitors exist: Design Slop Cop (14 patterns, 165 labels), impeccable's detector (59 rules), vibecheck.fail (45+ signals) and Hallmark (57 gates).

### Cited Findings

**Design slop: detectors, data and guides**

| Item | Key facts | Reception | Status |
|---|---|---|---|
| **Design Slop Cop** (Adrian Krebs; MIT; Playwright) | 14 deterministic patterns. Score = round(100 × flagged/14). "Manual verification across ~150 labeled sites suggests ~5–10% false positives". 165 labels shipped; has a Show HN gallery and an eval script — [README](https://raw.githubusercontent.com/AdrianKrebs/ai-design-checker/main/README.md) | Corpus post 333 pts/235 c; tool Show HNs 2026-05-05 (2 pts), 2026-07-02 (2 pts), 2026-07-07 (5 pts) | [opened]; HN [API]. Repo stars not retrievable: the GitHub API returned null. slopcop.adriankrebs.ch didn't respond on 2026-10-19 [NV] |
| **vibecheck.fail** (creator linked as @NOTONKETAMINE) | 45+ signals in 5 categories; Puppeteer; full-page screenshot; 0–100 score | HN 4 pts, 2026-04-17 — [HN](https://news.ycombinator.com/item?id=47811823) | [opened] |
| **impeccable** (pbakaus) | Rust detector crate (`crates/detect`) plus rule pack | 82,943★ | [API] |
| **Hallmark** (Nutlope) | 57 gates, 21 themes | 30,374★; HN 7 pts | [API] |
| **taste-skill** | | 99,135★ | [API] |
| **signs-of-ai-design** | CC BY-SA field guide (web, images, video, logos, decks, copy) with reliability and status labels; includes a `design-rules.md` | 27★; HN 2 pts (2026-07-26) | [opened/API] |
| **vibe-coded.lol** parody | | 207 pts/117 c (2025-10-17) | [API] |
| **AI-design-convergence study** (Aug 2026) | 945-site human baseline across 14 features | HN 2 pts | [opened] |
| "Launch HN: Design Arena (YC S25) – Head-to-head AI benchmark for aesthetics" | | 74 pts (2025-08-12) — [HN](https://news.ycombinator.com/item?id=44878257) | [title] |
| VibeScan, "Detect AI-Generated Websites and Security Issues" | | 2 pts (2025-11-12) — [HN](https://news.ycombinator.com/item?id=45894681) | [title] |
| "Five things make agent-built UI look generic" (tailthemes.com) | | 2026-08-22 — [HN](https://news.ycombinator.com/item?id=49398493) | [title] |

**Writing slop and adjacent tools**

| Item | Reception | Status |
|---|---|---|
| Slop Cop (awnist; prose) | 252 pts | [API] |
| Kagi SlopStop | 589 pts | [API] |
| Marginalia em-dash/new-accounts study (with SQLite dataset hn-green-clankers) | 717 pts | [API] |
| HN pre-ChatGPT em-dash leaderboard | 377 pts | [API] |
| Tropes.fyi | 5 pts | [API] |
| humanizer | 58,323★ | [API] |
| FeedHive ai-slop-detector | 79★ | [API] |
| isitslop.xyz | 5 pts (2026-06-15) | [title] |
| "Show HN: Tracking how much of the HN front page is AI-generated" | 4 pts (2026-07-05) — [HN](https://news.ycombinator.com/item?id=48791976) | [title] |

**Vendor and X context**
- The Claude Design launch drew 1,235 pts [API].
- Wathan's indigo post had 1.5M views; Ryan Mather's Claude Design tips had 1.55M views [API via fxtwitter].

### Inferences
- Slop Detector competes most directly with Design Slop Cop, which covers the same ground with fewer patterns, and with impeccable's detector, which has huge reach because it bundles prevention.
- Our differentiators are breadth (27+9+8), the AEO axis, versioned definitions, MCP integration and the `fix_prompt` tool.
- Reception data suggests leading with corpus reports and "fix" workflows rather than with the score alone.

### Gaps
- GitHub stars for Krebs's repo, and any stars or installs for vibecheck, weren't retrievable.
- Browser extensions of the "Is this site vibe-coded?" kind weren't found.
- X engagement for detector launches wasn't measured beyond the two posts above.

## Roadmap implications

### Takeaway
1. Add a **provenance flag**, kept off the slop score, and **chatbot citation artifacts**. These are the cheapest, most deterministic wins.
2. Add the 2026 "template chrome" patterns that Anthropic now lists itself.
3. Re-weight decaying tells: purple, Inter, em dash.
4. Ship per-category presets (#207), stacked-signal language and opt-in-only galleries to avoid AI-shaming backlash.

### Cited Findings

**NEW candidates, ranked by evidence strength × user value**

1. **NEW `builder_provenance` (informational flag, not scored)**
   - Evidence:
     - Field guide calls these markers "conclusive" [opened].
     - Wappalyzer-DB Lovable and Base44 fingerprints [opened].
     - Live `#lovable-badge` and `@Lovable` meta on a lovable.app site [opened].
     - GitHub code search: ≈14.4k `generator: 'v0.app'`; ≈33.6k `gptengineer.js`; ≈78k `lovable-tagger` [API].
     - Sources: [signs-of-ai-design](https://github.com/febbhav/signs-of-ai-design); [webappanalyzer](https://raw.githubusercontent.com/enthec/webappanalyzer/main/src/technologies/l.json)
   - Detection:
     - meta generator matching `^v0(\.app|\.dev)?`
     - meta description "Created with v0"
     - title "v0 App"
     - `#lovable-badge`, or `a[href*="lovable.dev"]` in a fixed-position badge
     - meta twitter:site `@Lovable` or `@lovable_dev`
     - asset URLs containing `gpt-engineer-file-uploads`, `/lovable-uploads/` or `cdn.gpteng.co/gptengineer.js`
     - `window.LOV_SELECTOR_SCRIPT_VERSION`
     - cookie `lovable-preview-mode`
     - meta `apple-mobile-web-app-title=base44`
     - favicon hash against known scaffold defaults; this part is single-source
   - False-positive risk: low for "built with X". **Do not** map `generator="Bolt"` to bolt.new, because it is Bolt CMS. The reputational risk is high if this is shown as "slop", so present it as provenance.
2. **NEW `hero_accent_word`**, generalizing `accentSerifItalicCount`
   - Evidence: Anthropic SKILL.md ("commonest tells"); Krebs's "Hero font mix"; signs-of-ai-design ("active, rising"); impeccable `italic-serif-display`/`accent-bold` [opened/API].
   - Detection: inside the H1, a descendant span of ≤3 words whose computed font-family, font-style, color or background-clip:text differs from its H1 parent.
   - False-positive risk: moderate. It's an old editorial device, so give it low weight and require co-occurrence.
3. **NEW `editorial_broadsheet_kit`** (the 2026 monoculture)
   - Evidence:
     - Anthropic cluster #3: "hairline rules, zero border-radius, dense newspaper-like columns".
     - Convergence study: AI outputs had 0px max radius vs a 50px human median, and grid adherence of 0.78–0.92 vs 0.62.
     - signs-of-ai-design: italic serif and cream "rising".
     - HN "Claudism" and "beige … extremely long landing pages".
     - Sources: [SKILL.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md); [study](https://ai-design-convergence.vercel.app)
   - Detection: page-wide max border-radius of 0 on buttons and cards, plus ≥N 1px solid hairline borders, plus a serif display H1, plus ≥3 letterspaced uppercase labels.
   - False-positive risk: high for real news and editorial sites, so gate it behind #207 presets.
4. **NEW `uniform_radius_shadow`** (the "SaaS-card kit")
   - Evidence: Anthropic cluster #4; signs-of-ai-design "rounded-2xl everything"; HN dematz "grid of rounded rects"; HN roundabout-host; prg.sh "faint, uniform shadows"; impeccable `rounded-card`.
   - Detection: ≥80% of visible cards, buttons, inputs and images share one border-radius ≥12px, and ≥70% of card box-shadows are identical low-alpha grey (≈rgba(0,0,0,.1)).
   - False-positive risk: moderate, since design systems legitimately unify radius. Check for no hierarchy, for example the same radius on chips and on modals.
5. **NEW `chatbot_citation_artifacts`** (copy)
   - Evidence:
     - Wikipedia's utm_source and markup-bug sections.
     - HN zahlman: "edit that away if you don't want people to know".
     - 29 HN comments containing `utm_source=chatgpt.com` [opened/API].
     - Sources: [Wikipedia](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing); [HN](https://news.ycombinator.com/item?id=49381324)
   - Detection: regex over hrefs for `utm_source=(chatgpt\.com|openai|copilot\.com|perplexity)`, and over visible text for `oaicite`, `contentReference\[`, `oai_citation`, `citeturn\d`, `turn\d+(search|image)\d+`, `\[cite: ?\d+\]`, `【\d+†`, `\[web:\d+\]`, `grok_card` and `\w\+\d\b` citation pills.
   - False-positive risk: very low for the text artifacts. It is low to moderate for utm links: a human may paste a ChatGPT-sourced link, though that is still AI-assisted.
6. **NEW `template_page_order`** (a composite of existing detectors)
   - Evidence: signs-of-ai-design's page skeleton; vibecheck "Hero-stat-FAQ scaffolding"; vibe-coded.lol (207 pts); prg.sh; OpenAI "Default: no cards… avoid stat strips".
   - Detection: order the detected section types (centered_hero → logo bar (#196) → icon_card_grid → testimonials (#202) → stat_banner → pricing → faq_accordion → CTA footer) and score how closely they align with the canonical sequence.
   - False-positive risk: moderate, because it is also standard SaaS conversion layout. It is valuable for explainability.
7. **NEW `post_purple_accent`** (emerald, acid-green, vermilion or clay as the single accent, especially on near-black)
   - Evidence: Anthropic clusters #1 and #2; signs-of-ai-design "Emerald fallback (#10B981)"; Ask HN "Black background, green and orange gradients"; Ask HN on the Wargames/retro-terminal look [opened/API].
   - Detection: hue bucket of the CTA and link accent color (emerald ≈160°, acid green ≈75–90°, vermilion ≈10–20°, clay #D97757) combined with background luminance under 0.05 or a cream ground.
   - False-positive risk: high, since green is used for finance and success states. Give it low weight and require co-occurrence.
8. **NEW `default_shadcn_tokens`**
   - Evidence: Krebs's blog lists shadcn/ui; signs-of-ai-design "untouched shadcn card"; HN jjani "majority … doesn't tweak it". The 23.5% prevalence figure is [NV]. Counter-evidence: HN bobthepanda.
   - Detection: `:root` custom properties exactly matching shadcn's published default palettes (zinc, slate or neutral; HSL in v3, OKLCH in v4) and default `--radius`. I didn't verify these values in this research.
   - False-positive risk: moderate. Frame it as "untheme'd defaults".
9. **NEW `arrow_suffix_ctas`**
   - Evidence: Anthropic ("'→' appended to link and button text"); signs-of-ai-design ("ArrowRight on every call to action").
   - Detection: ≥60% of buttons and CTA links end with →/↗/», or contain `svg.lucide-arrow-right`.
   - False-positive risk: high, since Stripe-style pioneers use this. Give it low weight.
10. **NEW `mono_micro_labels`**
    - Evidence: Anthropic ("monospace face for small data labels"); signs-of-ai-design "Monospace as decoration".
    - Detection: ≥4 non-code elements (not inside `code`, `pre` or `kbd`) at ≤13px with a monospace computed family, usually uppercase or tracked.
    - False-positive risk: high for dev tools, **including slop-detect.com's own brand**.
11. *(Lower priority)* **NEW `bounce_elastic_easing`**
    - Evidence: signs-of-ai-design; impeccable `bounce-easing`.
    - Detection: a CSS `cubic-bezier` with y1 or y2 outside [0,1] on transitions or animations. JS spring physics can't be detected this way.
    - False-positive risk: moderate.

**AMEND**

*Design patterns*
- **AMEND `slop_fonts`**
  - Add **Syne** (Krebs) and **Fraunces** as primary display fonts (Krebs; the convergence study found Fraunces in Lovable and Figma Make output).
  - Down-weight Inter as a decaying tell (Anthropic Nov 2025 and OpenAI Mar 2026 ban it; none of the five convergence outputs used it).
  - Account for the font backlash (HN flexagoon, bstsb).
- **AMEND `purple_accent`**: mark it "decaying since Aug 2025".
  - Wathan's post had 1.5M views.
  - The field guide calls the purple-to-cream shift "active but migrating".
  - None of the five convergence outputs used purple.
- **AMEND `cream_default_bg`**: add co-occurrence with a clay/terracotta (#D97757) or brass/amber accent plus a serif display. Sources: Anthropic cluster #1; convergence study ("warm brass accent on a warm ground"); field guide ("active, rising").
- **AMEND `numbered_steps`**: confirm it catches zero-padded section markers ("01 / 02 / 03", "05"). Sources: Anthropic SKILL.md; Quesma on Claude-style `05` numbering.

*Copy patterns*
- **AMEND `em_dash_overload`**: lower the weight and require co-occurrence.
  - Wikipedia moved it to "Historical indicators (2022–September 2026)".
  - The Economist (Jul 2026, via Wikipedia) found only Claude exceeds professional writers.
  - GPT-5.1 suppresses em dashes, and Altman announced the change on Nov 14, 2025.
  - The human backlash is large (717/391/377-pt threads).
- **AMEND `rule_of_three`**: raise the density threshold and require co-occurrence. Evidence: Slop Cop thread ("good and common writing advice"; Gettysburg flagged 17×).
- **AMEND `buzzword_density`**: version the lexicons by era. Add GPT-5 words (emphasizing, enhance, highlighting, showcasing) and GPT-6 words (quietly, steady, dependable, matters, clearer, practical, prioritize, multifaceted, echoed, universally). Retire "delve"-era weight (Wikipedia; GPT-6 sourcing is weak).

*Filed issues*
- **AMEND #196**: add the specific "Lucide five" icon set (field guide).
  - Fake-terminal evidence is stronger now: field guide "fake terminal hero"; HN "retro-terminal designs"; "Brainless" shadcn-as-Claude-Code components (128 pts).
  - Fake logo bars: the field guide says "strong when the logos are fabricated".
- **AMEND #197**: Anthropic itself states "fade-and-slide-up entrances on each section and hover transitions on every card … read as AI-generated". Add uniform card hover (the same translateY plus shadow `:hover` rule on all cards). prg.sh corroborates ("Subtle fades and hover effects").
- **AMEND #198**: use the convergence study's 945-site human baselines as concrete thresholds: grid adherence median 0.62, distinct type sizes median 8, max radius median 50px, plus section-padding discipline and painted-area colour.
  - Add page-length inflation, meaning scroll height per 1,000 words (HN yieldcrv; field guide "six screens of scroll for two thousand words").
- **AMEND #199**: no new practitioner evidence found. OpenAI's "dark mode bias" line is only tangential.
- **AMEND #200**: add a sentence-length band of "8–20 words" and a **punctuation-diversity** metric, since output with only periods and commas is the post-em-dash sign. Source: Wikipedia, which tags this {{citation needed}}.
- **AMEND #202**:
  - Add "About us" boilerplate with no names, address or contact (HN hshdhdhehd; field guide's "We are a team of passionate developers building the future of X").
  - Generalize middle-dot meta strings ("A · B · C") beyond the "No credit card required" triad (Anthropic SKILL.md; Krebs's stat-banner example "10K+ users · 99.9% uptime · 4.9★").
  - Fabricated trust chrome, such as compliance badges, is "strong when checkable" (field guide).
- **AMEND #207**: strongly supported.
  - Pioneer vs clone comments: "peak Bootstrap"; "2010s startup sites"; Linear/Raycast "built by hand from around 2019"; matsemann "influence how human designed sites look".
  - Editorial and news sites need a preset before `editorial_broadsheet_kit` ships.

*AEO checks*
- **AMEND AEO `site.llmsTxt`**: validate structure the way Lighthouse 13.3 does (H1, length, links, server errors), and treat a missing file as **neutral**. Label it "speculative: no AI provider has documented using it", citing Mueller and Williams-Cook. Lighthouse details are [2nd].
- **AMEND AEO `robots.aiAllowed`**: segment bots by purpose (training, search, user fetch) so that GPTBot-only blocks aren't penalised. Evidence: the HN AEO-grader output, and websiteaiscore's "accidental blockade" of GPTBot by ~30% of sites.
- **No change to `md.twin`**: we already negotiate `Accept: text/markdown`, which matches Cloudflare's Feb 2026 approach. Optionally add an informational check for Vercel's inline `<script type="text/llms.txt">` proposal [title].

**CAVEAT**

- **CAVEAT: accusation harm.**
  - Evidence: field guide ("Do not use this list to harass people … misidentifying a human designer's work as AI causes real harm"); Wikipedia's "Ineffective indicators"; Cybernetic Forests (180 pts) on shaming policing language; HN on artists "wrongfully crucified"; the lowercase-evasion Ask HN.
  - Response: never output "AI-generated". Say "matches N AI-default patterns", show evidence and confidence per pattern, and add an appeal or "intentional choice" annotation in DESIGN.md.
- **CAVEAT: public leaderboards and galleries.**
  - Evidence: "name and shame" Tropes.fyi got 5 pts; user-side Kagi SlopStop got 589 pts; LinkedIn's button has no stated safeguards, and a reported 40% reach drop shows labels have material consequences.
  - Response: aggregate reports and opt-in or self-submitted galleries only. No third-party "Heavy" hall of shame.
- **CAVEAT: tell decay and the arms race.**
  - Evidence: vendor bans (Anthropic, OpenAI); Wikipedia's "Historical indicators"; the convergence study; Quesma's "first model whose design doesn't look like AI slop".
  - Response: give every pattern a status (active, rising or decaying) with a date, the way the field guide and Wikipedia do. Re-validate quarterly on a fresh corpus such as the Show HN feed, and publish retired patterns.
- **CAVEAT: gaming by gate-running skills.**
  - Evidence: impeccable (59 rules), Hallmark (57 gates), humanizer (58K★). HN users say gated output still "looks like slop".
  - Response: invest in distributional and sameness metrics (#198, `template_page_order`) that fixed-threshold evasion can't easily satisfy. Keep `fix_prompt` and DESIGN.md as the product's centre, since adoption shows users want fixes.
- **CAVEAT: AEO overclaiming.**
  - Evidence: AI referrals ≈0.28–0.32% of traffic [2nd]; cats.txt shows "fetch ≠ use"; HN calls SEO/GEO "net-negative".
  - Response: frame AEO as *readiness*, never as traffic or citation uplift.
- **CAVEAT: dogfooding.**
  - Anthropic's 2026 clusters include "near-black background with a single bright acid-green … accent", "tinted near-black (#0B0B0B, #111)" and "a monospace face for small data labels". These overlap the slop-detect.com brand ("dark, monospace").
  - Response: run all new patterns on our own site before shipping.

### Inferences
- **Ranking rationale.**
  - Items 1 and 5 combine near-zero false positives with deterministic markup and high user demand ("was this vibe-coded?").
  - Items 2–4 close the 2026 blind spot, using a model vendor's own list plus a measured study.
  - Items 6–8 reuse existing detectors or tokens and give actionable fixes.
  - Items 9–11 are well-sourced but carry high false-positive risk, so they belong at low weight.
- **Source independence.** The Anthropic SKILL.md and signs-of-ai-design (Jul 2026) may not be independent, because the guide cites related work. Krebs's tool, the convergence study, OpenAI's guide and HN comments are independent of both.

### Gaps
- **Single source only, so no NEW proposal:** three-tier "Most Popular" pricing; "Get Started" + "Learn More" pairs; default favicons; Title Case everywhere (the field guide plus Wikipedia's prose observation is borderline).
- **No source found at all:** grain/noise overlays; border-beam/shimmer; "© 2024" footers; "Built with ❤️"; dead dark-mode toggles; default OG images; `data-v0` attributes; `data-lov-id` in production.
- **Unverified false-positive rates:** none of the NEW candidates has a measured rate. Krebs's labelled set (165 labels) and the convergence study's 945-site human baseline are the obvious calibration corpora.
- **Not researched (search budget exhausted):** Reddit and X discourse beyond two verified posts; v0, Lovable and Bolt theming features; Google Stitch.
