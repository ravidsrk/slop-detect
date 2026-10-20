# Practitioner discourse, deep pass: Aug–Oct 2026

Research date: 2026-10-20. This file extends `../roadmap-v4/practitioner_discourse_x_hn.md` and `../roadmap-v4/x_reddit_discourse.md`. It covers only items those files lack, which I checked by grepping both files for every HN item ID, URL and handle used below. Where an item confirms or contradicts a v4 finding, the v4 item ID (D-xx, C-xx, K-xx, A-xx, S-xx, FIX-xx) is named.

## Method and tags

**Tags**
- **[V]** verified: retrieved by me from a primary API or scraper payload, with the text quoted verbatim from that payload. Sources were the HN Algolia `items`/`search` API, the Scrape Creators X, Reddit and LinkedIn scrapers, curl of the original page, or the Wayback Machine.
- **[U]** unverified or secondary: a WebFetch summary, a WebSearch snippet, or a claim relayed by a third party.

**Engagement notation**
- HN: pts / comments, for the story.
- X: L / RT / Rp / Q / BM / V.
- Reddit: score (comments). Post scores from search are often 0 for low-ratio posts, so I give `upvote_ratio` where I fetched it.
- LinkedIn: likes / comments.

**Budget**
- Scrape Creators: 23 credits, taking the balance from 32,079 to 32,056.
  - 11 X searches
  - 5 Reddit searches
  - 2 Reddit comment pages
  - 1 LinkedIn search
  - 1 Threads search, which returned 0 posts
- Free calls: about 40 HN Algolia calls, 4 WebFetch, 2 WebSearch (extended), and 4 `POST /api/scan` calls to slop-detect.com, rate-limited at 3/min.

**Limits**
- X search is Google-indexed and returned mostly older or viral how-to posts. It found almost no Aug–Oct reply-level discourse.
- Bluesky has no keyword search in the toolset, so I did not reach it. Threads returned nothing.
- HN dominates this pass because it is the only fully searchable, date-filterable source. Treat the overall weighting as HN-heavy.
- Engagement counts measure resonance, not accuracy.

**Model context for Aug–Oct 2026 quotes**
- Claude Opus 5.5 shipped on Sep 22, 2026. Practitioners date it from that day: @flxrnc's X Article says "Since Opus 5.5 launched on September 22" [V].
- GPT-6 Astra, GPT-6/6.1 Sol and Luna, Claude Fable 5.1 and DeepSeek 4.1 Flash are the other models named in these quotes.
- "Claude Design" is Anthropic's design canvas, launched Apr 17, 2026 (@claudeai, 64.5M V) [V].

---

## 1. Source log

### 1A. Hacker News: the high-signal threads (all new relative to v4)

**H1. "Tells of a Slop UI"** (2026-09-27; 386 pts / 244 comments). [HN](https://news.ycombinator.com/item?id=49867038) → [blog](https://hereticpleb.vercel.app/blog/10-tells-of-slop), now redirecting to godobject.dev [V].

The blog's ten headings, verbatim from a Wayback copy [V]:
1. "Gradients. Gradients Everywhere."
2. "Rainbow Vomit."
3. "Pulsing Badges"
4. "Finger Nail Cards."
5. "Emoji Slop"
6. "Misaligned Stuff."
7. "Font Selection"
8. "Redundant Text Due To Chat Context."
9. "Glassmorphism"
10. "Generic Taglines And Unnecessary Hype"

Key lines from the post:
- "Slop Cannons LOVE purple for some reason"
- "It doesn't follow the 70-30-10 rule. It just adds colours all over the place."
- "it adds these pulsing badges on everything … CAN SOMEONE TELL ME WHAT AN INACTIVE STUDENT LOOKS LIKE??"
- "It's usually Inter, or if you have a website even remotely programming-related, you get JetBrains Mono."
- "It adds these // whenever anything close to tech is mentioned."
- "It added text saying 'Built with Hugo. Written from Neovim' … YOU CAN PRACTICALLY SMELL THE PROMPT"
- "It doesn't go for any other design language(except brutalism, and for brutalism all of them look the EXACT same)."
- "Every H1 is followed by a greyish subtitle that says something like: 'Experience the power of task management…'"
- Closing: "This website is vibe coded; it looks cute tho. It's just that these people don't put ANY effort into making it even look mildly good."

Comments [V]:
- **ronbenton:** "A bunch of these patterns are things that real human designers have been using for a while (with the exception of emojis everywhere). This is like how some people assume an em dash automatically means AI generated text."
- **vmg12:** "Your list is missing all caps. I think overuse of all-caps is one of the biggest tells that a ui was vibe coded."
  - **msdz:** "Added 'bonus' points if it's overused small caps. Related (not all need be in caps): header, 'eyebrow', h1, description, footer all saying the same thing."
  - **efilife:** "all caps with letter-spacing ALWAYS and usually with a monospace font"
- **bbg2401:** "Something missing from the list of tells is overuse (or even any use at all) of the middle dot (·)." This confirms D-04's middle-dot sub-signal.
  - **needfish:** "Jetbrains Mono seems far from boring in my eyes though. It's for code and it's annoying me quite a bit when I see it in big H1 sizes."
- **xz18r:** "maybe seeing monospace fonts where none are necessary triggers me now."
  - **nananana9:** "Monospace fonts are dead to me."
- **jd7h:** "I'm really pissed off that my favorite web design style Brutalism is now an AI slop smell. They already took my em-dash! … Stuff I'm missing in the list: 'Claude beige' and 'Claude anthracite grey'."
- **czhu12** posted a vibe-coded page; the replies follow.
  - **dawnerd:** "Not bad but the section numbering gives it away now. Also something cloudflare has."
  - **quirino:** "I find this style of 'heavy dark borders/shadows' one of the ugliest recent trends on the web."
  - **Anon1096:** "This appears to be pretty close to the 'brutalist' aesthetic mentioned in the article. Things like drop shadows on boxes are the opposite of the 'fingernail' boxes and you very rarely saw them pre-AI."
  - **thiht:** "It's been a trend for years before AI... I remember the Balenciaga website being one of the first big names doing it in like... 2018?"
  - **nswizzle31:** "SO MUCH TEXT. Just sections and sections of header + subheader + bullet list composed of header + subheader + paragraphs."
  - **demibabs:** "still looks exactly like a million vibe coded sites. Good aesthetic, just overused."
- **xavdid:** "It doesn't mention the most annoying tell- content that fades in as you scroll down a page."
  - **dawnerd:** "Sad thing is that was a trope of bad web design way before AI."
- **unholiness:** "IMO a single 'Main Thing // Detail' is fun and fine … I see a ton of 'Home // Our Work // Donate // About Us' which has beome cringy."
- **tlahtinen** (2026-09-28): "Less than a year later I am embarrassed how Claude it looks - blinking dot in the corner, double // separating header text, the font choices... now I see the same patterns everywhere."
- **demibabs:** "'Your files never leave your browser/device'. Any vibe coded site that deals with files and works client-side feels an INCESSANT need to inform you of this fact. Definitely seems like the same kind of context leakage."
- **arshxyz:** "For some reason slop UI labels always refer to the user in second person. Solid tell when something says 'Needs You' instead of 'Requires Attention'"
- **65:** "The most obvious tell is the 'No this. No that.' copy which you find everywhere."
- **wxw:** "Some of these are a bit outdated for newer models. I find the most consistent tells are often just excessive descriptive text and a lack of visual hierarchy."
- **WorldMaker:** "I've seen a couple companies already change their design standards to 'best in class Tailwind designs from Claude, use this prompt file/Agent file/skill file combo for all UX work' … The worst part is these glassification Tailwind heavy slop almost universally fail WCAG guidelines"
- **pointillism:** "my agents.md says 'If I see 'indigo-500' anywhere in your code I will fucking kill you.'" This connects to v4's `isPurple()`-misses-indigo-500 finding.
- **anothermathbozo:** "Every time someone puts precise language to what makes ai slop sloppy it feels like frontier labs get an ever clearer RL target."
- **diwank:** "watch this turn into a skill and become a popular meme on X..."
- **dpark:** "I've seen several of these 'slop design' critiques lately. They don't seem to be coming from people with strong design skills."
- **pdpi:** "Can we please stop with the 'AI = Slop' rhetoric? … 'Slop' just means something is low-quality and of poor craftsmanship, irrespective of who or what made it."
- **docheinestages:** "I just can't fathom how a multi-billion dollar company like Cloudflare could forego their design standards." The reply from **jasonvorhe**: "leading with some numbering that never goes beyond 01, round buttons, round input elements … some kind of terminal window that doesn't resemble any terminal UI I've ever seen."

**H2. "Cloudflare Quick Tunnels"** (2026-09-18; 844 pts / 316 comments). [HN](https://news.ycombinator.com/item?id=49754785) → try.cloudflare.com [V]

This is the first case I found of a major infrastructure brand's own landing page being widely called AI slop.
- **cub-creature:** "I swear if I see one more 'pill-badge callout -> header -> subtitle' with gradient background and hover-cards landing page I'm going to crash out"
- **rozab:** "Broken layouts, trios of random uppercase words sprinkled around."
- **rplnt:** "The first subtitle with the font color almost matching the background."
- **skhameneh:** "Well, they just re-vibed it. Went from the most generic Claude 4.6 era to today's models, quality wise."
- **PufPufPuf:** "Group of three cards, each with a left-aligned icon, heading and subheading stacked -- that's the m-dash of web design."
- **ruuda:** "'Traffic rides Cloudflare's network' Oh, hello Claude."
  - **tefkah:** "Claude has a habit of always talking in an overly active voice, sort of personifying subjects"
- **tefkah** (49765151): "1. the blinking 'now with JSON output for coding agents'. It loves to create these blinking badges 2. 'Some text, and then <Text in a different color>' … The small all-caps 'built for the agent era' eyebrow. Once you start noticing this it's EVERYWHERE - The 01 02 03 list. If you have access to Claude you should try have it generate a landing page for a tech product. It will almost always look like this."
- **kqp:** "I can see it's very standard corpo-aesthetic, uses callouts for the sake of callouts … but corpo websites were doing all that long before AI."

**H3. "Prompting Claude Opus 5.5"** (Anthropic docs; 2026-09-28; 207 pts / 227 comments). [HN](https://news.ycombinator.com/item?id=49874728). The doc text is in 1B.
- **nananana9:** "I'll give you the first 5% of the prompt for free: 'Don't use purple-blue-pink gradients, neon glow, aurora effects, monospace fonts, em-dashes, emojis, over-rounded corners, pill-shaped buttons, random tags and indicators, random sparkles, futuristic grids and orbital lines, centered everything, gradient text on headlines, 'how it works' followed by 1.2.3. section, fake testimonials, every paragraph ending in a punchy one-liner, all cap headings…'" [V]
- **epihelix:** "in response to 'avoid a generic AI look', enforce the exact opposite of that user prompt and literally choose a generic AI look." [V]
- **emsixteen:** "I can't help but wonder how people are expected to be able to describe something that they probably have difficulty putting in to words." [V]

**H4. "How our vibe coded website looks like a designer made it"** (railcode.dev; 2026-09-29; 138 pts / 77 comments). [HN](https://news.ycombinator.com/item?id=49901973) [V]
- **phoronixrly:** "And it still carries some of the cliche features of LLM-'designed' sites."
- **slopinthebag:** "Your site looks like an AI made it. Now there is an actually easy fix: just replace the glass panels and tabs with something that actually fits the rest of the aesthetic."
  - **preommr:** "Where is this glass? … That's not really glass." This is crowd disagreement on the same element.
- **jjcm:** "a lot of their early attemps are early gpt outputs or claude design outputs … 0->1 that doesn't result in purple gradients or claude brown is very much possible now."
- **shikck200:** "A shell html page, that uses a shittonne of javascript, and obviously does not even include the static content per page load." This supports A-02.
- **nexo-v1:** "the more vague the prompt is, the more 'AI‑generated' the end result looks."
- **MisterMunchkin:** "My current strategy is to have a sub agent pretend to be a hackernews reader who hates AI slop. It then goes through the whole UI and removes all the slop."
- **ch4s3:** "my taste lines up with fable's training quite a bit. Now my app looks like ai anyway." This is a pioneer-convergence anecdote.

**H5. "Show HN: Training a model to identify AI web content from structure alone"** (Sitefire, YC W26; arXiv 2609.15369; 2026-09-22; 74 pts / 28 comments). [HN](https://news.ycombinator.com/item?id=49800566) [V]

This is an adjacent commercial detector. It is copy-structure based and uses an LLM pipeline.
- **evantbyrne:** "Immediately saw false positives on content written before ChatGPT."
  - **jochenmadler** (author): "77% of the AI posts close that way, but so do 12% of the human ones."
- **jminnl:** "on my 100% hand written blog it comes up as 50% 'likely human written with AI assistance'."
- **asdff:** "I'd rather see this sort of thing done deterministically with actual code vs lossy human english prompts and a dependency on token spend to a single third party."
- **bryanrasmussen:** "to really determine if you are able to identify AI slop then it should be determined if you misidentify human slop as AI slop."

**H6. Other HN comments, Aug–Oct 2026** [V]
- **lanewinfield** (2026-08-26; [49451580](https://news.ycombinator.com/item?id=49451580)): "ALL CAPS subheaders - a light beige background - burnt sienna anchor and/or highlight text - a '• LIVE' (or really any pulsing • symbol with an ALL CAPS follow-up) - tons of variation in font sizes (this one has 15 different text sizes!) - more typically, a lot of overexplaining ...you know it's vibe'd, specifically with Claude!"
- **stlwtt** (2026-09-04; [49568370](https://news.ycombinator.com/item?id=49568370)): "the beige or unreadable neon hax0r dark mode theme, that console looking font with three different sizes and tiny headings, formatting vomit with italics/bolding every other word, useless cards/animated colored dots, scrolling text, excess boilerplate text on every surface, useless generated tags/categories/chips everywhere … the problem is being able to recognize a carbon copy Claude/Codex design in <5 seconds. At that point I can't help but assume it's just slop"
- **dzink** (2026-09-28; [49884440](https://news.ycombinator.com/item?id=49884440)): "I ran multiple experiments with models the past few weeks for generating designs and 80% of the time they use Fraunces if no selection is provided. … It's the new em-dash." Also, in [49881488](https://news.ycombinator.com/item?id=49881488): "qwen and Glm and Claude produce the same design and font for the same 'design a gorgeous website' prompt."
- **bargainbin** (2026-09-02; [49533455](https://news.ycombinator.com/item?id=49533455)): "That model is eyebrow crazy, every section of the output has them. Even comprehensive design skills like impeccable miss filtering them out (it only detects 'eyebrow chips' and not the prolific barrage of basic eyebrows.)"
- **Wpnx330** (2026-08-14; [49294522](https://news.ycombinator.com/item?id=49294522)): Impeccable is "a CLI that scans HTML/CSS/JSX for 59 deterministic anti-pattern rules … there are like 5 common fonts ai's use … every llm 'reasons' themselves into using the same choices so the sites all look the same."
- **amanzi** (2026-08-12): "Lots of cards with hover effects, icons in square boxes, the button shapes and behaviours, and just the general look and feel has Claude written all over it."
- **anony-123** (2026-08-31): "the landing page is having gradients, pills, badges which looks vibe coded AI slop :)"
- **radius89** (2026-09-26, quoting a critic): "the colors, the cards, the 'x people online' pill, all just scream llm-ism, which makes me less likely to trust it."
- **chinathrow** (2026-09-28): "The beige coloring with the bright green 'recently updated' label somehow triggered my 'this template is made by Claude' instinct."
- **GPerson** (2026-09-19): "The beige / slightly faded Claude design trend is atrocious."
- **wormius** (2026-10-11): "the overuse of cards everywhere, and abusing my favorite color schemes (tokyo-night, dracula style), really irritates me"
- **dofm** (2026-09-10): "Very very small fonts is one of the things that annoys me most"
- **my002** (2026-09-10): "Looks like very typical Claude Design output to me … It's kind of like seeing Bootstrap websites everywhere when that was at its peak."
- **flexagoon** (2026-10-09): "It's not AI slop, it's just bland design with corporate speak that the AI got trained on. There are plenty of pre-LLM sites just like that (most shadcn websites, for example)"
- **traviswingo** (2026-09-10): "Who cares if the site is LLM generated? Did you care before when you saw the same Wordpress theme repeatedly, or Bootstrap layouts?"
- **interleave** (2026-09-19, in the 1,902-pt / 962-comment "AI-generated posters" thread, [49764791](https://news.ycombinator.com/item?id=49764791)): "the process and decisions depicted are human. And still you're reaction is 'it's slop'. … Is that maybe what we need to see to believe that a human (me n this case) was involved meaningfully?" The author then rebuilt the page around the raw Claude Code transcript.
- **pedrobalsadev** (2026-08-25): "I was getting frustrated with coding agents not being able to consistently follow a design system. It usually worked fine at the beginning of a project, but as the project grew, things started to drift."
- **haarshsingh**, Show HN "Kobra – a Shadcn alternative" (2026-09-15): "most agents default to the same Next.js / Tailwind / shadcn stack … has almost become synonymous with AI slop atp … [Kobra] also uses the new shadcn/lint library to help your agents maintain consistency."
- **sunrunner** (2026-09-06; [49584837](https://news.ycombinator.com/item?id=49584837)): "slop-detect.com gets an A+ 0/100 when given its own domain to analyse." This is already in v4 and is listed here for completeness.

**H7. HN on AEO and agent-readiness** (titles and points [V]; contents not opened unless noted)
- "Show HN: Ax-check.com – Can agents use your product?" (2026-09-17; 38 pts / 41 comments). [HN](https://news.ycombinator.com/item?id=49744416) [V]
  - Author **0x63_Problems**: "In actual agent traffic data, we've seen that the key pages are the homepage, llms.txt, pricing, and the docs site … content negotiation for Markdown is legitimately helpful for agents."
  - **xena:** "As someone that works for a company that gets a 100% score on ax-check, all the effort I've put into making it accessible for agents has not 10xed the growth numbers like I was told it would."
  - **eliaspro:** "Nice! This should help in making my stuff as inaccessible as possible to agents."
- "We put llms.txt on 83 websites. In 12 weeks OpenAI's crawler read it 7 times" (ezy.ai; 2026-08-13; 3 pts) [V title].
- "Llms.txt: agent-optimization wishful thinking" (phpied.com; 2026-09-30; 3 pts) [V title].
- Four llms.txt prompt-injection items:
  - "Everyone is hilariously prompt-injecting AI via llms.txt and you aren't" (installmap; 2026-09-23)
  - "Researchers trick Fortune-500 AI agents into running arbitrary code via llms.txt" (Tom's Hardware; 2026-09-02)
  - "What llms.txt files tell AI agents (beware)" (2026-10-14)
  - "Stripe LLMS.txt with note to install latest" (2026-08-29)
  - All are [V titles]; contents unread [U].

### 1B. Vendor primary source

**Anthropic, "Prompting Claude Opus 5.5": section "Frontend design defaults"** (live doc, fetched 2026-10-20) [V]. [docs](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5#frontend-design-defaults)
> "Asked for frontend work without design direction, Claude Opus 5.5 falls back on a few default styles, and a general instruction such as "avoid a generic AI look" mostly swaps one default for another. It responds well to instructions that name specific patterns to avoid, as in the following example. Work iteratively: check which styles the first result used instead, and extend the list if needed."
>
> "Output a vanilla HTML/CSS personal website with placeholder data. Do not use a cream or off-white background, italic accent words in headlines, numbered "01/02/03" section labels, monospace labels, or pill-shaped buttons."

This is the first vendor-published statement naming the *current* (post-Sep-22) default kit. v4 relied on the older frontend-design SKILL.md. The doc is the strongest single source for D-03 (`hero_accent_word`), D-04 (`template_chrome_2026` mono labels), D-06 (`editorial_cream_kit`) and the `numbered_steps` amendment. It also describes the fix workflow (name patterns, regenerate, re-check), which is what `fix_prompt` plus a re-scan delivers.

### 1C. Blogs and articles

- **Piotr Migdał, Quesma: "Opus 5.5 is the first model whose design doesn't look like AI slop"** (2026-10-07; HN 5 pts) [U, WebFetch summary]. The post says GPT-6 Astra picked up "beige background, numbers like `05`" and has "Some AI design slop". v4 already cites this post; listed here only because Migdał also submitted slop-detect.com to HN.
- **railcode.dev, "How our vibe coded website looks like a designer made it"**: see H4.
- **Maya Brennan, "How to de-slopify your designs"** (UX Collective, Sep 30, 2026). Only the LinkedIn promotion was seen; see 1E.

### 1D. Reddit [V]

- **r/website, "How can I make my Website look less 'vibe coded'?"** (u/Revolutionary_Mine29, 2026-09-28; 42 comments; ratio 0.14). [link](https://www.reddit.com/r/website/comments/1ws7w44/how_can_i_make_my_website_look_less_vibe_coded/)
  - OP: "Whenever I code a website, no matter if I use AI or not, I immediately get called out for 'vibe coding' it."
  - **dhdyxuebebkalsockfn:** "right away, dark background with red accent is the biggest vibe coded sign; same with the font choices"
  - **Superb-Snow-5734:** "'Vibe coded' usually doesn't mean a site was made with AI. It usually means the design feels assembled from generic patterns without enough product-specific decisions."
  - **Far-Pomelo-1483:** "Create a no ai design tells skill."
  - **RSMxsmanic:** "It does essentially nothing with JavaScript turned off."
  - **wolle271:** "'it looks vibecoded' is just a useless claim, just ignore it."
- **r/ArtificialInteligence, "How can you tell if a website was vibe-coded / AI-generated?"** (u/New-Trash6966, 2026-10-07; 16 comments; ratio 0.2). [link](https://www.reddit.com/r/ArtificialInteligence/comments/1wzvnbv/how_can_you_tell_if_a_website_was_vibecoded/)
  - OP: "I'm not looking for a tool that claims 'this website is 87% AI-generated.' I'm more interested in practical ways to investigate a website and make a reasonable judgment."
  - **chewiedev** (10): "Or, are you fishing for input on what to tell your AI Agent to avoid so your work isn't doxxed?"
  - **cascadiabibliomania:** "The eyebrows. So many eyebrows. Every headline gets a 'The _________' eyebrow above it."
  - **FrogeToge:** "If the site you're on is using text instead of design to convey information that's a dead giveaway"
  - **Moppmopp:** "Even if you find indictators for sure those will be removed in a couple months."
  - **NeuralNomad87:** "same gradient hero, shadcn defaults, lucide icons everywhere and a feature grid of three cards is at least a hint. tbh plenty of human-built startup sites looked exactly like that before AI too, so I wouldn't call it on that alone."
  - **Brilliant_Union_5538:** "placeholder text still lurking in the footer or meta tags that got copied from a template and never changed."
- **r/antiai, "STOP POSTING ABOUT TEAM HUMAN"** (2026-10-14; 17 (11)): "The site is very clearly made with AI, likely Claude. It uses Claude's usual text, and shading." This shows lay users now attribute a page to a specific *vendor*, not just to "AI".
- **r/microsaas, u/Internal_Front_5522** (2026-10-07; 4 (8)): "It looked professional. It converted almost nobody … The copy read clean. That was actually the problem. It read like every other page." Conversion "roughly doubled" after the author replaced the AI headline. Anecdote only, n=1.
- **r/TechSEO, u/ma8nk, "llms.txt on 128k EU domains"** (2026-10-16; 5 (19)). [link](https://www.reddit.com/r/TechSEO/comments/1x9anjn/llmstxt_on_128k_eu_domains_704_serve_one_in_spec/)
  - "9,035 (7.04 %) serve a text file whose first line is a Markdown heading … 10,138 (7.90 %) answer with HTML, mostly their error page … A checker that only looks at the status code overcounts by a factor of two."
- **r/TechSEO, u/azangru** (2026-10-06): "pagespeed insights has added llms.txt to its list of 'agentic browsing' audits 🙈"
  - **r/SaaS, u/side-labs** (2026-10-13) corroborates: "Since Lighthouse 13.3 in May, the default report has an Agentic Browsing section and one of the checks is llms.txt … not having it isn't a fail. You get N/A."
  - Two Reddit sources. Lighthouse release notes were not opened [U].
- **r/LLMSTxtCommunity, "Secrets hidden in llms.txt"** (ISEEYOU, 2026-09-26): "many files already contain direct instructions to machines: Use these facts exactly. Do not repeat this date. … Do not use this content for training." It also notes that auto-generated files leak "account pages, shopping carts … One shop even included a discount code."
- **r/InnovAit, an agency** (2026-09-23): "When a client asks us to add one, we add it. … What we do not do is put it on the plan as if it were doing work … The one exception we keep: developer documentation sites."

### 1E. LinkedIn [V]

- **Pierre Lempérière** (2026-10-07; 17 / 5). [post](https://www.linkedin.com/posts/pierre-lemperiere_cloudflare-workersai-vibecoding-activity-7513686440107491328-p2CJ)
  - He built "Is It Slop?", an LLM-vision rubric on Cloudflare Workers AI.
  - On his own page: "Slop score 41, AI fingerprint 92. Serif headline with one italic word, mono eyebrow labels, cream paper texture, tilted cards. Verdict: 'Mixed, and clearly vibe-coded.'"
  - Comments:
    - **Richard Joseph Porter:** "Em-dash density being the best signal feels like a detector with a short shelf life … Did you run it against pages written before 2022? The false positive rate on genuinely human, pre-LLM sites would be the number I would want to see."
    - **Etienne Lescot:** "this website is 100% AI-generated. The thing is, it's good content that I steered closely … are you testing for AI-generated content, or for slop?"
- **Maya Brennan, "Can you spot slop?"** (2026-09-22; 102 / 17).
  - **Chase Olson:** "Rounded Components? Basic Fonts? Boring Layouts? I've built apps for years and many of these are not slop. It's just basic app design."
  - **Robin Geier:** "aren't some of these just great design choices? Like I personally love Glassmorphism."
- **Maya Brennan, de-slopify guide promo** (2026-09-30; 70 / 16).
  - **Jim Kultgen:** "When you make the 'maya-anti-ai-slop' skill I will be the first user."
- **Dan Nguyen** (2026-09-28; 19 / 1), quoting his co-founder: "Question every word/feature/button/label the LLM spits out and throw everything away if you don't have an immediate answer for 'why does this exist?' … Devs see these sites and notice things are LLM generated."
- **Hank Wu** (2026-10-12; 48 / 7).
  - **Aaron xie:** "Default template typography and component libraries give it away long before the actual copy does."

### 1F. X [V]

- **@matsugfx** (Matt, shadcndesign; 2026-10-14; 68 L / 1 RT / 4 Rp / 1 Q / 189 BM / 6,369 V). [X](https://x.com/matsugfx/status/2110324089709539368). X Article "Building and managing design systems in the AI era":
  - "Ask one for a pricing section and it may change your Button's radius on the way … A lock only works when something enforces it. A line in a prompt saying 'please don't touch the buttons' gets lost once the conversation runs long, while a linter that fails keeps failing. Put the rules in a lint config the project runs, and have the agent run it after every change so it catches its own drift."
- **@SRKDAN** (2026-10-16; 1 L / 134 V): "AI-built websites all look the same right now. Purple gradient, Inter, three cards. The fix people keep sharing is a small skill file you drop into Claude, Cursor or Codex." Low reach, but it shows the "old" fingerprint still circulates as the lay definition.
- **@nateherk** (2026-08-22; 299 L / 1,178 BM / 258,920 V). X Article on a "/scrollcraft" skill: "Most AI-built websites look fine until you have seen ten of them because the hero, feature cards, and subtle fade-in animations all start blending together."
- **@anshuc** (2026-08-29; 62 L / 13,960 V): "Astra is impressive, but frontend designers are definitely not cooked. OpenAI hasn't solved slop yet … The copy on the page is still pretty cringe."
- **@hahnbeelee** (Mintlify; 2026-09-17; 428 L / 1,248 BM / 173,662 V). X Article: "In July 2026, they [agents] accounted for 66% of measured web traffic across documentation powered by Mintlify." This is vendor-reported, docs-only [V quote; figure U].

### 1G. Adjacent tools seen in discourse (new to v4 unless noted)

| Tool | What it is | Source | Note |
|---|---|---|---|
| **Was It Vibed?** (wasitvibed.com) | "46 patterns", "Deterministic pattern matching, not an AI classifier"; categories CSS Architecture / HTML Quality / Copy / AI Aesthetic / Meta & Infrastructure / Framework Defaults; signals include "Numbered Section Markers", "Eyebrow Labels", "AI Builder Provenance", "Wrong Copyright Year", "Source Maps in Production"; outputs % + verdict + "a saved, shareable public report link that can appear on the leaderboard and in search engines" | HN 2026-09-07 (2 pts); site via WebFetch [U] | **Closest direct competitor to slop-detect's design axis.** Its public, search-indexed leaderboard is the harm pattern v4 K-06 warns against. |
| **SiteTell** | rule set for "AI-generic" copy; exports PDF/CSV/JSON "to drop into your agent" | Show HN 2026-09-08 (1 pt) [V] | Fix-export-to-agent pattern |
| **Is It Slop?** (Lempérière) | LLM-vision 8-question rubric, ~0.04¢/scan | LinkedIn [V] | Non-deterministic; critics asked for pre-2022 FP rate |
| **Sitefire slop-checker** | structure classifier, arXiv 2609.15369 | HN [V] | FP complaints on human blogs |
| **Marquee** (marquee.page) | "AI landing pages that don't look like AI" | HN 2026-10-16; Reddit [V] | Generator that brands itself anti-slop |
| **Kobra** | shadcn replacement using shadcn/lint | Show HN [V] | Kit-level escape |
| **DS Manager** (shadcndesign) | design-system canvas with "Lint locks that agents have to respect" | @matsugfx [V] | Lint-gate demand |
| **deslop-skills**, **anti-ai-slop**, **FeedHive ai-slop-detector** (120 writing patterns) | skills/detectors | HN titles [V] | FeedHive is already in v4 |

### 1H. Spot-check: slop-detect on community-labelled pages (my scans, 2026-10-20) [V]

| Page | Community label | slop-detect result | Triggered patterns (evidence) |
|---|---|---|---|
| try.cloudflare.com | "slop" (HN 844-pt thread, dozens of comments) | **18 / Mild / B**, 5 of 27 flagged ([result](https://slop-detect.com/r/3a8yg5uf)) | `gradient_backgrounds` (5 elements), `all_caps_labels` (samples "SEC 0.1", "SEC 0.2", "SEC 0.3"), `icon_card_grid` (group of 3), `numbered_steps` (run 3), `nested_cards` (9). The h1 font is "STK Bureau", so `slop_fonts` did not fire. |
| railcode.dev | mixed ("still looks vibe coded" × 4 vs "clean, tasteful" × 3) | **15 / Mild / B**, 4 of 27 ([result](https://slop-detect.com/r/6qdxhtm9)) | `gradient_backgrounds`, `colored_glows` (2), `all_caps_labels` (13; samples are button labels "Get started →"), `icon_card_grid` (7) |
| godobject.dev (the "10 tells" author's self-described vibe-coded blog) | author says "vibe coded; it looks cute" | **11 / Mild / B+**, 2 of 27 ([result](https://slop-detect.com/r/0y7kukr7)) | `slop_fonts` (47 of 48 elements), `all_caps_labels` (samples "October", "September": date labels, a likely false positive) |
| slop-detect.com | HN commenter (v4): 0/100 despite 2026 chrome | **0 / Clean / A+**, 0 of 27 ([result](https://slop-detect.com/r/jnqqn004)) | none. The h1 renders in Newsreader (serif). Still unchanged since the v4 critique; see FIX-09/D-04 |

Reading. The page HN most loudly called slop in this period lands **Mild**. The tells commenters named are the blinking badge, the pill-badge → header → subtitle sequence, the two-tone headline, personified copy and low-contrast subtitle. None of them is a shipped pattern, or none fired. This single case is consistent with v4's "38.5% tier accuracy" finding. It argues for adding a crowd-labelled set to K-01, not for re-weighting from n=1.

---

## 2. Emerging tells, Aug–Oct 2026

Rule: a tell counts as **multi-source** only with ≥ 2 *independent* authors in different threads or venues. Multiple comments on the same page count once.

| # | Tell | Independent sources | Status vs shipped/v4 | Deterministic hook |
|---|---|---|---|---|
| T1 | **The Opus-5.5-era default kit as a named set**: cream/off-white ground, italic accent word in the headline, "01/02/03" section labels, monospace labels, pill buttons | **Anthropic doc (vendor primary)**; Lempérière ("Serif headline with one italic word, mono eyebrow labels, cream paper texture"); lanewinfield (beige, burnt sienna); jd7h ("Claude beige"); GPerson; chinathrow; jjcm ("claude brown") | **Upgrades evidence** for D-03, D-04, D-06 and the `numbered_steps` amend from practitioner to vendor-confirmed | Co-occurrence of existing and proposed signals (see N-03) |
| T2 | **Pulsing / blinking status badge or dot** ("• LIVE", "active", "verified", "now with JSON output…") | godobject blog; tefkah (Cloudflare); lanewinfield; stlwtt ("animated colored dots"); tlahtinen ("blinking dot in the corner"); radius89 critic ("'x people online' pill") | v4 **D-10 watchlist, marked single-source**. Now ≥ 5 independent sources, so promote to experimental | `@keyframes` on opacity/scale/box-shadow with infinite iteration, applied to an element ≤ 12 px or a pill containing a short status word |
| T3 | **"//" separator chrome** ("Home // Our Work", "Main // Detail") | godobject; tlahtinen; unholiness; Gualdrapo (uses it himself) | **New** | Text nodes outside `code`/`pre` matching `\s//\s` in nav, headings, eyebrows or breadcrumbs |
| T4 | **Eyebrow over every heading**, not only pills ("The ___" eyebrows, tracked caps, often mono) | bargainbin (Impeccable misses plain eyebrows); cascadiabibliomania; tefkah; msdz; efilife ("all caps with letter-spacing ALWAYS and usually with a monospace font") | v4 **FIX-09** (`eyebrow_label`). Adds that the *ratio* of headings with an eyebrow matters, and that Impeccable has a gap here | Share of h2/h3 with an eyebrow-like sibling ≥ 0.6 |
| T5 | **Zero-padded section codes** ("01", "05", "SEC 0.1") | Anthropic doc; tefkah; dawnerd; jasonvorhe ("numbering that never goes beyond 01"); Quesma (v4) | v4 `numbered_steps` amend. The Cloudflare scan shows that `numbered_steps` *does* catch "SEC 0.x", but **`all_caps_labels` double-counts the same text** | Deduplicate overlapping evidence across patterns |
| T6 | **Chat-context leakage in copy**: "Built with Hugo. Written from Neovim", "Your files never leave your browser/device", "one campus. one app." | godobject; demibabs; weakfish ("chat context leaking through"); unholiness ("thinking tokens leaking into the main text") | Partly v4 **C-03** `chatbot_reply_residue`. This is a *page-copy* variant | Phrase families: `never leave(s)? your (browser\|device)`, `^Built with \w+`, `Written (in\|from) \w+` in hero or footer; low weight |
| T7 | **Meaningless multi-hue chips and tags** ("rainbow vomit", "trios of random uppercase words", "random tags and indicators") | godobject; stlwtt; rozab; nananana9 | **New** (`gradient_letter_avatars` is adjacent) | ≥ 6 pill or badge elements with ≥ 4 distinct hues (OKLCH ΔH > 30°) and no shared semantic class |
| T8 | **Monospace at display size** (JetBrains Mono H1s) | godobject; needfish; xz18r; nananana9; efilife | v4 D-04 covers only ≤ 13 px mono labels. **New size band** | `h1`/`h2` computed family is monospace, outside code-centric preset |
| T9 | **Text overload**: header + subheader + bullets, repeated; "overexplaining" | nswizzle31; wxw; FrogeToge; whakahere; lanewinfield; VCFundedGenYer; godobject (grey subtitle) | Partly v4 grey-microcopy item. The density framing is **new** | Words per section above the fold, plus sections with an h + p + ul triple ≥ N (heuristic; needs K-01) |
| T10 | **Type-scale sprawl / tiny type** ("15 different text sizes") | lanewinfield; dofm; specproc (posters); stlwtt ("three different sizes and tiny headings") | v4 **S-04** and the shipped `flat_type_hierarchy`. This is a craft defect, framed better as one | Count distinct computed font sizes in the visible viewport; flag body text < 12 px |
| T11 | **Two-tone or italic accent headline** | tefkah ("<Text in a different color>"); Anthropic ("italic accent words"); Lempérière; nananana9 ("gradient text on headlines") | v4 **D-03**. Also extend it to *color-only* accent spans | `h1` containing a span with different color or italic, ≤ 3 words |
| T12 | **Fraunces as default display serif** | dzink ("80% of the time … the new em-dash"); Bakaus (v4); Lempérière (serif plus italic) | v4 **D-08** amend. The 80% figure is anecdotal (n unknown) | Rendered-face check (D-08) |
| T13 | **Neobrutalist hard-shadow kit as second-order slop** | godobject ("for brutalism all of them look the EXACT same"); jd7h; quirino; Anon1096 | **New**. It inverts the Feb 2026 advice (v4: @kloss_xyz recommended neobrutalism as the escape) | `box-shadow` with blur 0, offset ≥ 3 px, dark color, on ≥ 4 cards, plus border ≥ 2 px. **Watchlist** given FP risk (Gumroad, Figma, Balenciaga per alfirous and thiht) |
| T14 | **Personified active-voice copy** ("Traffic rides…", "The URL goes everywhere") | ruuda, tefkah and rgoulter all on one page | **Single-source** (one page). Watchlist, not deterministic-friendly | none yet |
| T15 | **Second-person UI labels** ("Needs You") | arshxyz | **Single-source** | none |
| T16 | **Dark ground plus single red accent; dev-theme palettes** (Tokyo Night, Dracula) | dhdyxuebebkalsockfn (red); wormius (Tokyo Night / Dracula) | Two different palettes, so **single-source each**. Relates to v4 D-10 ("vermilion single accents on near-black") | palette-distance match; watchlist |
| T17 | **Fade-in on scroll / page-load body animation** | xavdid; bob1029; arnon ("the animations give it away"); @nateherk ("subtle fade-in animations") | v4 #197 and F-04. Now **≥ 4 sources** | `IntersectionObserver` + opacity 0 at rest (F-04) |
| T18 | **Three-card icon row** ("the m-dash of web design") | PufPufPuf; amanzi; NeuralNomad87; @SRKDAN | Shipped `icon_card_grid`. Confirms it, no change | — |

**What the old fingerprint still means to lay users.** Purple gradient, Inter and three cards are still the *lay* definition: @SRKDAN, wbnns (em dashes), roundabout-host (Inter, rounded corners, gradients). Practitioners, though, now describe a *vendor-specific* kit: "Claude beige", "Claude Design output", "Claude 4.6 era". Lay users have also started naming the vendor, as in r/antiai's "likely Claude". This suggests reporting a *kit attribution* (for example "matches Opus-5.5 default kit: 4/5") is more legible to users than a generic score. That fits v4 D-01's `madeWith[]` philosophy of describing without punishing.

---

## 3. User needs and feature requests, ranked by frequency in this sample

These are counts of distinct authors across venues (HN, Reddit, X, LinkedIn) who state or clearly imply the need. They are not representative.

| Rank | Need | Distinct authors | Representative evidence | Existing slop-detect surface |
|---|---|---|---|---|
| 1 | **"Tell me what to change": named, page-specific avoid-lists and fix guidance** | 11 | Anthropic doc ("name specific patterns to avoid … check which styles the first result used instead"); nananana9's avoid-prompt; Revolutionary_Mine29; Far-Pomelo-1483 ("no ai design tells skill"); Jim Kultgen; @SRKDAN; @nateherk; minimaxir ("tell LLMs/agents 'no.'"); MisterMunchkin (anti-slop subagent); Hank Wu; Art9681 ("examples of what a good UI looks like") | MCP `fix_prompt` (generic today, per v4) |
| 2 | **Evidence and investigation, not a "% AI" verdict; published false-positive rates** | 7 | New-Trash6966 ("not looking for a tool that claims … 87% AI-generated"); Richard Joseph Porter ("pre-2022 … false positive rate"); Etienne Lescot ("AI-generated content, or … slop?"); bryanrasmussen; evantbyrne; jminnl; asdff ("done deterministically") | Score-first UI; K-02 and K-05 in v4 |
| 3 | **Enforced design-system conformance: lint locks in CI and agent loops** | 6 | @matsugfx ("a linter that fails keeps failing"); pedrobalsadev (drift); haarshsingh (shadcn/lint); WorldMaker (company-wide Claude design standards); John Farrell (LinkedIn: "automatic verification and approvals"); jamesponddotco (designer-made system that Claude must follow) | `--fail-on`, GitHub Action, S-01…S-06 |
| 4 | **Reference and before/after examples** | 5 | Art9681; chasd00 (blind test: "give that to a group of designers, say it's AI generated"); hekker (screenshots as inspiration); Hank Wu (5 reference sites); rubenhassid (getdesign.md, older) | none |
| 5 | **Agent-readiness checks that reflect real agent paths** (homepage → llms.txt → pricing → docs; markdown negotiation; no login wall) | 4 | ax-check author; ma8nk (soft-404 overcount); azangru and side-labs (Lighthouse agentic audit); agency on r/InnovAit (docs-only value) | AEO axis; v4 A-02, A-05 |
| 6 | **Craft and accessibility framing over taste** | 4 | WorldMaker ("almost universally fail WCAG"); tensor; elaus ("it does actually decrease usability"); specproc | v4 F-00…F-07 |
| 7 | **Provenance or process disclosure as a trust signal** | 2 | interleave (transcript as proof of human involvement); Etienne Lescot | v4 D-01 `madeWith[]` |

**Implication.** The top need is not detection. It is the loop Anthropic itself prescribes: name the patterns, regenerate, check what replaced them. slop-detect is already a deterministic namer of patterns, so packaging that loop is the closest fit between product and demand found in this pass.

---

## 4. Criticisms and trust risks

1. **"Defaults predate AI"** is still the dominant objection. It appeared from 12 distinct authors in this sample:
   - ronbenton, hnlmorg, qoez/vallerie (Bootstrap, jQuery UI), api, kqp, deanc, thiht (Balenciaga 2018 brutalism), flexagoon ("most shadcn websites"), traviswingo, NeuralNomad87, Chase Olson, Robin Geier
   - The trust risk is the same as v4's: style matches read as accusations.
   - New: it now extends to the *2026* kit, with brutalism, fingernail cards (tapvt: "they're useful for subtly indicating state") and glassmorphism (Robin Geier) all defended.
2. **Big brands are now vibe-coding their own pages.** Cloudflare (H2) and IBM (absoluteunit1: "Had to double check that this was the actual IBM domain") are examples, and WorldMaker reports companies adopting "best in class Tailwind designs from Claude" as standards.
   - **Risk to v4 K-05:** a "pioneer" regression set built from *live* brand homepages decays. v4's critic-sourced pioneer list explicitly includes "Cloudflare's dashboard".
   - **Mitigation:** dated Wayback snapshots (N-10).
3. **Publishing tells creates an RL target and an evasion manual.** anothermathbozo, diwank, Moppmopp and chewiedev ("so your work isn't doxxed") all say so, and Anthropic's own doc confirms that negative instructions just swap the default. This matches v4's 6–18-month decay finding. Detection recall will keep falling unless the product's value is the fix loop and craft checks.
4. **Adjacent detectors are failing publicly on false positives:**
   - Sitefire: "Immediately saw false positives on content written before ChatGPT"; "50% … on my 100% hand written blog".
   - Is It Slop?: commenters demanded a pre-2022 FP rate.
   - YouTube and Kurzgesagt (v4).
   - Critics have converged on one test: the false-positive rate on pre-LLM human pages. A tool that publishes this number first gains credibility.
5. **"AI vs slop" conflation.** pdpi, Etienne Lescot, wongarsu and Superb-Snow-5734 ("doesn't mean a site was made with AI") all raise it. slop-detect's copy should consistently say "unauthored defaults" (v4 K-06), never "AI-made".
6. **Credential gap.** dpark: critiques "don't seem to be coming from people with strong design skills". A detector authored by non-designers inherits this. Mitigations:
   - craft and WCAG checks with external authority
   - per-rule citations (K-02)
7. **Indifference.** ookblah, uxcolumbo, CompoundEyes and BellacosePlayer argue the public doesn't care. Counter-evidence frames the value as **trust and conversion**, not taste:
   - stlwtt ("recognize a carbon copy … in <5 seconds … assume it's just slop")
   - radius89's critic ("makes me less likely to trust it")
   - Internal_Front_5522 (conversion anecdote)
   - Dan Nguyen ("people just skip it")
8. **Competitor harm pattern.** Was It Vibed? publishes shareable reports "on the leaderboard and in search engines". If slop-detect adds public galleries, it inherits the harm critique. v4 K-06 already recommends against public third-party rankings, and this is a live example to cite.
9. **Crowd disagreement on the same element** (railcode "glass panels": slopinthebag vs preommr). Even practitioners disagree on what counts as a tell. Co-occurrence thresholds and evidence display matter more than any single rule.
10. **Self-consistency** (v4 FIX-09/D-04). Still open: see 1H for today's self-scan.

---

## 5. Candidate roadmap items

**Evidence grades**
- **practitioner**: ≥ 2 independent practitioner sources, or a vendor primary.
- **vendor**: a vendor primary doc.
- **hypothesis**: single-source or inferred.

Every new detector should ship at weight 0 behind v4's K-04 experimental gate until it shows K-01 lift.

| ID | Title | What to build | Evidence | False-positive risks | Acceptance criteria | Relation |
|---|---|---|---|---|---|---|
| **N-01** | Promote `pulsing_status_badge` from watchlist | Detect an element ≤ 12 px (or a pill containing ≤ 3 words matching `live\|active\|online\|new\|beta\|verified\|now`) with an infinite CSS animation on opacity, scale or box-shadow, or an animated `::before`/`::after` dot. Report count and samples. | practitioner (6 independent; T2) | Real status pages (statuspage.io, Vercel and GitHub status), live-stream badges, chat presence. Exempt when ≥ 1 badge is driven by a known status-provider script, or the page `<title>` matches /status/ | Fixtures fire for a Claude-style "• LIVE" pill and a pulsing hero dot. A status-page fixture and a reduced-motion-respecting single dot do not. Weight 0 until K-01 lift. | Replaces the v4 **D-10** sub-item. Feeds **D-04** |
| **N-02** | `slash_separator_chrome` sub-signal | Count ` // ` separators in nav, h1–h3, eyebrows and breadcrumbs, excluding `code`, `pre` and `.hljs`. Fires at ≥ 2 occurrences. | practitioner (4; T3) | Developer blogs and terminal-themed brands; URL-like text ("https://"); comment syntax in prose | URL and code fixtures don't fire. A "Home // Work // About" nav fires. | Add as the **6th sub-signal of D-04** `template_chrome_2026` (cluster threshold stays ≥ 3) |
| **N-03** | `default_kit_match` (vendor-named kits) | A cluster that reports which **named kit** a page matches. First kit: Anthropic's Opus 5.5 list — cream/off-white ground (D-06 branch), italic or color accent word in the h1 (D-03, extended to color-only spans), 01/02/03 labels (`numbered_steps`), monospace labels (D-04), pill buttons (≥ 60% of CTAs with radius ≥ height/2). Output `kitMatch: {id:"claude-opus-5.5-default", hits:4, of:5, source:<doc URL>}`. Kits are versioned data, not code. | **vendor** + practitioner (T1) | Editorial human sites (cream plus serif), Stripe-style pill CTAs, numbered docs. Mitigate with a ≥ 4/5 threshold, the editorial preset suppression from D-06, and reporting as attribution *before* any scoring | The Anthropic example prompt's output (generated without the avoid line) hits ≥ 4/5. The v4 pioneer set hits ≤ 2/5. Each kit entry carries a source URL and date. | Unifies **D-03/D-04/D-06** under one explainable output. Complements **D-01** `madeWith[]` (provenance) with a *style* attribution. Each kit carries K-03 lifecycle metadata. |
| **N-04** | `fix_prompt` v2: "name the patterns, then re-check" | Generate the avoid-list from *this page's triggered evidence*, in Anthropic's recommended form ("Do not use …" naming concrete patterns and samples, e.g. "Do not use 'SEC 0.1'-style section codes"). Add `slop-detect diff <before> <after>` (or MCP `rescan`) that reports **which patterns disappeared and which new defaults replaced them** (from N-03 kit matches). | **vendor** (Anthropic's documented workflow) + practitioner (rank-1 need, 11 authors) | Over-specific avoid-lists can push generators into the *next* kit. The diff makes that visible rather than hiding it | On 5 fixture pages the prompt names every triggered pattern with ≥ 1 sample. The diff on a regenerated page lists removed patterns and newly matched kits. Output is ≤ 120 words. | Upgrades the existing MCP **`fix_prompt`**; directly serves **R-09** ("the verifier generators call") |
| **N-05** | Evidence-first report and FP rate on pre-2022 pages | Reorder CLI, API and web output so triggered evidence (samples, counts) comes before the score. Publish a **per-pattern false-positive rate on a pre-2022 Wayback set** on `/api/patterns` and in the spec. | practitioner (7 authors; rank-2 need) | None for the reorder. Risk is low Wayback coverage for some sites | `/api/patterns` returns `fpRatePre2022` per pattern with n. The web result shows ≥ 3 evidence samples above the fold. | Implements part of **K-02/K-05/K-06**. Answers the exact question critics asked of the Is It Slop? and Sitefire tools |
| **N-06** | `display_mono_heading` | Fire when the h1 or h2 rendered face is monospace at ≥ 24 px outside a code or devtool context (no `pre`/`code` in hero, no `terminal` preset). | practitioner (5; T8) | Developer-tool brands (including slop-detect.com's own monospace brand), terminal-aesthetic portfolios | slop-detect.com's own result is computed and published. Weight 0 in the devtool preset. | Extends **D-04** (mono labels ≤ 13 px) and **D-08** |
| **N-07** | `chip_rainbow` | ≥ 6 badge, pill or tag elements in the viewport with ≥ 4 distinct hues (OKLCH ΔH > 30°), each with ≤ 3 words. | practitioner (4; T7) | Category-colored blogs, GitHub-label-like UIs, dashboards. Restrict to marketing landings via the existing preset | A tag-cloud blog fixture doesn't fire. A Claude-style hero with "NEW / BETA / AI / FAST" chips fires. | Sits beside `gradient_letter_avatars` and `ai_sparkle_badges` |
| **N-08** | `context_leak_copy` (copy axis) | Phrase families on visible copy: "never leave(s) your browser/device", "Built with <tool>." and "Written in/from <editor>" in hero or footer, "No X. No Y." sequences (C-08), and "one <noun>. one <noun>." lowercase taglines. | practitioner (4; T6) | Privacy-first tools that genuinely process locally (honest claim); "Built with Astro" badges | Each family has ≥ 3 positive and ≥ 3 human-negative fixtures. Weight 0 until lift. | Copy-axis sibling of **C-03** `chatbot_reply_residue`; extends **C-08** |
| **N-09** | Brutalist hard-shadow kit | `box-shadow` with blur 0, offset ≥ 3 px and a dark color on ≥ 4 card-like elements, plus border ≥ 2 px. | practitioner (4; T13), but FP-heavy | Gumroad, Figma marketing, Balenciaga, intentional neobrutalism libraries (neobrutalism.dev) | Experimental only. Report the hit rate on the v4 pioneer set before any weight. | Second-order slop. Add to the **D-10** watchlist |
| **N-10** | Dated pioneer snapshots | Freeze the K-05 pioneer and human set as Wayback snapshots dated ≤ 2022-11-30, plus a separate "brand-live" set re-scanned quarterly to *measure* drift, not to assert cleanliness. | practitioner (Cloudflare, IBM and WorldMaker reports) | — | The pioneer set is reproducible offline. A quarterly report shows the brand-live score delta. | Amends **K-05**, **K-09** |
| **N-11** | Crowd-labelled calibration slice | Harvest dated HN and Reddit "does this look vibe coded / slop" threads with ≥ 20 comments into a labelled set, with fields for majority label, dissent count and date. First rows: try.cloudflare.com (slop, 2026-09-18), railcode.dev (mixed). | hypothesis (method), practitioner (labels) | Crowd labels are noisy and taste-driven (railcode dissent). Use them as one stratum, never the sole ground truth | ≥ 50 rows with thread URLs. Report tier agreement separately from the curated set. | Feeds **K-01** protocol v2 |
| **N-12** | `site.llmsTxt` validity v2 | (a) Reject HTML bodies and soft-404s served with 200, and require a first line `# ` per the llmstxt.org spec. (b) Flag **instruction-like content** ("ignore previous", "you must", "install", shell commands, "do not use this content for training") as an informational `llmsTxt.instructions[]` and **never** as a positive. | practitioner (ma8nk 128k-domain crawl: 7.90% HTML with 200; ISEEYOU; four HN injection items) | Legit "Do not use for training" licensing notes. Report them neutrally as `usagePolicy`, not as manipulation | A fixture serving HTML with 200 fails validity. A fixture with "run `curl … \| sh`" is surfaced under `instructions[]`. No score increase from llms.txt presence alone. | Amends v4 `site.llmsTxt`. Instruction flags feed **A-03** `ai.manipulation` and **A-06** `ai.usagePolicy` |
| **N-13** | Lighthouse "Agentic Browsing" crosswalk | Map AEO checks to the Lighthouse 13.3+ Agentic Browsing audits (including llms.txt, which reports N/A when missing) and show "Lighthouse says / we say" for overlapping checks. | hypothesis (two Reddit posts; release notes not opened) | Divergent definitions confuse users. Show both and explain the difference | Release notes verified first. The crosswalk table is published in the spec, and no check contradicts Lighthouse without a documented reason. | Extends **K-08** (crosswalk + cross-tool agreement) to the AEO axis |
| **N-14** | DESIGN.md lint-lock gate | `slop-detect check --design DESIGN.md --fail-on drift`: fail CI when rendered tokens (radius, primary color, fonts, type scale) deviate from the declared system. Emit a machine-readable diff an agent can consume after each change ("run it after every change"). | practitioner (6 authors; rank-3 need) | Intentional one-off marketing pages. Support a waiver block with `reason` (shadcn/lint precedent, per v4 citation audit) | Fixture repo whose agent edit changes Button radius fails with a token-level diff. A waived page passes with the reason echoed. | Operationalises **S-01…S-06** and **S-03**. Ships via the **R-05** Action and the MCP |
| **N-15** | Deduplicate overlapping evidence | When `numbered_steps` and `all_caps_labels` (or a future `eyebrow_label`) fire on the same text nodes, count the points once and show both labels. | practitioner (observed in my scan: "SEC 0.1" fired both) | — | Cloudflare fixture: the "SEC 0.x" nodes add weight once. | Correctness fix; pairs with **FIX-09** |

### Items I would *not* add, and why
- **Personified active voice (T14), second-person labels (T15), dev-theme palettes (T16).** Each is single-source or rests on one page. Keep them on the watchlist with no detector work.
- **"Text overload" as a scored pattern (T9).** It has many sources, but no threshold is defensible without lift data, and long human docs pages would trip it. Collect `wordsAboveFold` and `sectionTriples` as unscored telemetry for K-01 first.
- **An LLM-vision "is it slop" mode.** Users in H5 and 1E asked for determinism and FP rates. The LLM-based competitors drew the FP criticism. This matches v4 C-11's caution.

---

## Gaps
- Bluesky was not searched (no keyword endpoint), and Threads returned 0. X coverage of Aug–Oct reply threads is thin because Google indexes viral how-to posts, not critique.
- No official Lovable, v0 or Bolt announcement of new default templates in Aug–Oct 2026 was found. WebSearch surfaced only undated third-party comparisons [U].
- Several items are unverified: the Lighthouse 13.3 "Agentic Browsing" llms.txt audit (two Reddit sources), Mintlify's 66% agent-traffic figure (vendor claim) and wasitvibed's methodology (WebFetch summary).
- The slop-detect scans in 1H are n=4 spot-checks under the anonymous tier, not a calibration.
- No mention of slop-detect.com was found anywhere in Aug–Oct 2026 beyond the already-known 3-point HN post. The product still has no community footprint to measure.
