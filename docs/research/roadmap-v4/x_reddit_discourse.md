# X (Twitter) and Reddit practitioner discourse, 2025-01-01 to 2026-10-19: AI design and copy tells, detector criticism, AEO and llms.txt evidence, tool reception, and second-order slop

Research date: 2026-10-19. These notes extend `practitioner_discourse_x_hn.md`, which verified only two X posts and could not reach Reddit. They cover only what that file lacked, plus confirmations and contradictions of it.

**Method.** Every X post below was retrieved through the Scrape Creators X post scraper. The search endpoint returns the same full post object, with text, timestamp and counts, as the single-tweet endpoint. Long-form X Articles came back with their full article body. Every Reddit post and comment was retrieved through the Scrape Creators Reddit search or post-comments scrapers, and LinkedIn and Bluesky through their scrapers. Hacker News items come from the free Algolia and Firebase APIs.

**Verification tags**
- [SC-X], [SC-R], [SC-LI], [SC-BS]: fetched by the X, Reddit, LinkedIn or Bluesky scraper. Author, date, text and counts are verbatim from the payload.
- [HN-API]: HN Algolia or Firebase API.
- [WF]: WebFetch. The text is extracted by a summarizing tool, so headings and quoted strings are reliable but descriptions may be paraphrased.
- [2nd]: secondary only, for example a WebSearch summary or a post relaying a study.
- [NV]: not verified.

**Engagement notation**
- X: L / RT / Rp / Q / V = likes / reposts / replies / quotes / views. BM = bookmarks, where useful.
- Reddit: score = net upvotes as returned by the API; "ratio" = upvote ratio. Posts with a low ratio can show a score of 0 even with 100+ comments. Comment scores are given in parentheses.

**Scrape Creators budget**
- 75 calls in total, 74 credits charged. The balance went from 32,608 to 32,534; one LinkedIn search returned "Internal Server Error" and was not charged.
- Breakdown by tool:

| Tool | Calls |
|---|---|
| twitter_search_posts | 36 |
| twitter_user_tweets | 3 |
| reddit_search | 18 |
| reddit_post_comments | 12 |
| linkedin_search_posts | 2 |
| bluesky_user_posts | 2 |
| threads_search | 2 |

- Also used, at no credit cost: 10 WebSearch calls, 3 WebFetch calls, and the HN Algolia and Firebase APIs.

**Limits**
- X search is Google-indexed and misses much. Long, multi-term queries often returned 0 posts.
- X replies cannot be enumerated, so pushback in reply threads is not captured.
- Reddit's `top` sort ignored relevance (3 calls wasted). `subreddit:` with relevance sort worked.
- Threads returned no posts for two queries.
- User timelines return roughly 100 "most popular" posts, mostly old, so they yielded little.

## Q1. Which specific tells are practitioners naming on X and Reddit in 2025–2026, which are new relative to the shipped and filed lists, and how often are they repeated or upvoted?

### Takeaway
The most-repeated and most-upvoted complaints are still clusters slop-detect already ships or has filed:
- cards everywhere and nested cards
- pills and eyebrow labels
- glows and glassmorphism
- purple-blue gradients
- Lucide or emoji icon tiles
- a fixed set of fonts

The two most-upvoted examples are an r/ClaudeAI thread listing these (763 upvotes, Sep 2026) and the "you can spot a Claude-built app… it's the fonts" thread (338, Jun 2026).

X and Reddit also surface about 20 tells that are not in the shipped or filed lists. Most are deterministically detectable, but most rest on one or two sources. The best-supported are:
- emoji-prefixed console logs (625-upvote top comment)
- the "light grey commentary" under CTAs and section closers ("by far the biggest giveaway", 163K-view X Article)
- status dots and "live" badges
- the accent stripe moving from the card's left edge to its top
- duplicated nav menus
- non-concentric radii
- the floating chat bubble
- analogous-hue "homogenous goo"
- `curl … | sh` hero snippets
- GPT-6-era "tilted phone, sage green, poetic headlines"

### Cited Findings

**A. Long-form X Articles and posts that enumerate tells**

*@yuwen_lu_, "Signs of vibe coded UI" (X Article), 2026-04-06 — 270 L / 30 RT / 15 Rp / 13 Q / 73,315 V* — [X](https://x.com/yuwen_lu_/status/2041187936738447565) [SC-X]
- "Claude no longer generates purple gradients, I’m so glad we are past that. AI’s design quality has been improving in general, but I still see plenty of bad patterns in vibe-coded UIs."
- Color, "Homogenous goo": "AI models tend to generate colors that are mushed together. A cyan icon in a sky blue box, wrapped in a card of a different shade of blue, with a slightly transparent minty blue border." (NEW)
- Icon tiles: "Wherever you usually put a visual asset, you see a font awesome icon or an emoji wrapped in a small colored box." (filed as #196)
- Chat widget: "the bottom right chat icon is a dead giveaway that it is AI-generated." (NEW)
- Serif: "AI models, especially Claude, seem to love them nowadays. Now many AI-generated websites have a Serif hero section, almost as if it’s Claude’s perception of “elegant” design." It names Instrument Serif and DM Serif, and adds "other AI models’ outputs do not include this feature as much as Claude".
- Glass: "This, in my opinion, is becoming the new purple gradient… If this texture is paired with a gradient background and a 1px, light border, I’m mostly certain that it is AI." (shipped as `glassmorphism`; the co-occurrence is new)
- Stripe: "the green border… is also a know [sic] vibe coding pattern. It shows up because both a `border-left` and a `border-radius` are applied to the container." (shipped as `accent_stripe`)
- Nesting and motion: "AI has the tendency to create nested layouts, e.g. cards within cards." Also: "The appear animation for all of the cards is slow and distracting… it gets buggy when we scroll down but the cards do not appear in viewport." The second ties to #197 and to a "stuck content" defect.
- Credit to Impeccable: "using an agent skill like impeccable might get you halfway there."
- @pbakaus quote-posted it on 2026-04-07: "there's a few in here that I didn't have on the radar (will add). Glassmorphism, emojis and serif fonts are tricky, because they *can* work - they're just usually over-, or badly used." (48 L / 8,805 V; the quoted status is the yuwen article) — [X](https://x.com/pbakaus/status/2041369057300218213) [SC-X]

*@dickiebush, "How To Write, Build, And Deploy Beautiful Landing Pages With AI (Without An Ounce Of AI Slop)" (X Article), 2026-09-16 — 461 L / 40 RT / 27 Rp / 4 Q / 163,177 V* — [X](https://x.com/dickiebush/status/2100205836677079183) [SC-X]
- He rebuilt the page "from the purple slop version" generated by Claude, the "dreaded “Claude Slop” landing page".
- Fonts: "Large serif headlines with a few words italicized (usually in an accent color)", over "Plain sans-serif body text".
- Colors: "The color purple" / "With a gradient to blue". Purple was still present in a Claude-generated page in Sep 2026.
- Textures: "Rounded corners on buttons", "Soft shadows behind floating boxes", "Super faint borders around everything", "Pill-shaped labels placed above headlines".
- Format: "Centered headline · Subtitle · Two buttons · A row of 3 stats · 3 “feature cards” · Testimonial · CTA · FAQ" (list items joined).
- NEW: "Lastly, these are by far the biggest giveaway of an AI landing page. They just love to sneak in these little “light grey commentary” elements underneath buttons and to close out major sections."
- Copy: the "5 patterns that make writing scream “AI wrote this”" are "Unnecessary contrast framing", "Excessive usage of “the rule of 3”", "Intangible language", "Throat-clearing" and "AI buzzwords".
  - Intangible examples: "A world of possibility", "A completely new life", "Your fullest potential".

*@PrajwalTomar_, 2026-09-16, on GPT-6 Astra — 607 L / 41 RT / 52 Rp / 163,567 V* — [X](https://x.com/PrajwalTomar_/status/2100230252182360313) [SC-X]
- "First attempt was typical AI slop. Tilted phone, sage green, poetic headlines." (NEW, GPT-6-era defaults)

*@pbakaus (Impeccable), 2026-05-29 — 1,028 L / 69 RT / 65 Rp / 16 Q / 104,582 V* — [X](https://x.com/pbakaus/status/2060208540992880794) [SC-X]
- "We measured it across thousands of generations: 74% of pages used the cream AI-default background, 76% reached for extreme letter-spacing, 90%+ failed the contrast floor."

*@ycombinator, 2026-08-07 — 395 L / 42 RT / 39 Rp / 119,371 V* — [X](https://x.com/ycombinator/status/2085735073848901684) [SC-X]
- A Design Review episode with Paper's founder that will "break down the most common AI design tells… and explain why the biggest risk for founders isn't moving too slow, it's shipping something that looks like everyone else."

**B. Reddit threads, by engagement**

*r/ClaudeAI, "How are people actually getting Claude to build beautiful UIs instead of generic AI slop?" (u/kozmikadam, 2026-09-28; score 763, ratio 0.96, 161 comments)* — [Reddit](https://www.reddit.com/r/ClaudeAI/comments/1ws9oix/how_are_people_actually_getting_claude_to_build/) [SC-R]
- OP's list: "cards everywhere / random gradients / glows / huge border radiuses / Lucide icons everywhere / pills and badges for no reason / generic spacing / generic dashboards that all look the same", and "the same 4 cards + gradient + purple glow again."

*r/ClaudeAI, "You can spot a Claude-built app instantly. It’s the fonts." (u/Adrien-G, 2026-06-18; 338, ratio 0.88, 139 comments)* — [Reddit](https://www.reddit.com/r/ClaudeAI/comments/1u95x9l/you_can_spot_a_claudebuilt_app_instantly_its_the/) [SC-R]
- OP: "1/ Inter everywhere… 2/ A geometric sans for headings, stuff like Space Grotesk or Manrope… 3/ A serif when it wants to look elegant, Playfair Display or Lora… 4/ JetBrains Mono / Fira Code the moment there’s any code or a “techy” vibe."
  - This answers the prior notes' gap "JetBrains Mono: no source found".
- u/IllustriousTip6904 (32): "bloated Tailwind CSS, overuse of tags and cards, side of card highlight, overall b2b saas slop".
- u/MaddyMagpies (8): "Subtitles in all caps with expanded spacing placed above titles inside each module. That's an instant tell."
- u/alittlepogchamp (4): "one thing I see often is the current date on the top left of whatever main screen." (NEW, dashboards)
- The subreddit bot's auto-generated TL;DR after 80 comments (bot-written, not a human comment) lists "The infamous side-of-card highlight (which is apparently migrating to the top now)", "Overuse of tags, cards, and status dots", "All-caps subtitles with extra spacing above titles" and "pill-shaped containers everywhere" — [comment](https://www.reddit.com/r/ClaudeAI/comments/1u95x9l/comment/ose1sm9/) [SC-R]

*r/webdev, "How do you know that it’s coded by AI?" (u/justathe, 2025-11-06; 201, ratio 0.90, 217 comments)*
- OP: "I do know it seems to love purple and has a weird obsession with making things seem like they’re glowing sometimes." — [Reddit](https://www.reddit.com/r/webdev/comments/1oq9yin/how_do_you_know_that_its_coded_by_ai/) [SC-R]
- u/Buttonwalls (625, top comment): "emojis in console logs" — [comment](https://www.reddit.com/r/webdev/comments/1oq9yin/comment/nnhrs0o/)
- u/m0rpeth (204): "// 🔥 fire the event"
- u/Top-Print144 (20): `console.log("⭐ Deploy")`
- u/spurkle (382): "Comments, usually without context. // Call the stop function"
- u/brain_wrinkler (53): "more than 1 comment in the code to describe functionality that doesn't need describing."
- u/aschmelyun (24): "Purple and blue gradients, emojis in button text, excessive amount of white space, random animations in odd places."
- u/apf6 (85): "the big clue is lack of intention… large sections of content that are beautifully laid out, but the actual information being communicated is useless or redundant."

*r/webdev, "Curious - as a developer, how can you tell if the app is vibecoded or not?" (u/StandupSnoozer, 2026-03-30; score 0, ratio 0.46, 128 comments)* — [Reddit](https://www.reddit.com/r/webdev/comments/1s7xwlw/curious_as_a_developer_how_can_you_tell_if_the/) [SC-R]
- OP: "Initially, I thought I could identify based on the UI - you know the purples and the violets and gradients. But recently, some apps are really well done."
- u/No-Aioli-4656 (6): "colored borders around cards and icons on every goddamn element. If you use the sparkle icon, I’ll peg your work as ai, been right damn near 100% of the time."
- u/monkeymad2 (4): "With access to the source code it’s easy - look for any agentic markdown files like CLAUDE.md". This points to a possible provenance probe.
- u/ArtistJames1313 (12): "From a UI perspective I don't think it's that easy anymore if you're just looking at the page."

*r/web_design, "What makes a ui look AI generated ?" (u/youceftazerty, 2026-09-19; score 0, ratio 0.375, 30 comments)* — [Reddit](https://www.reddit.com/r/web_design/comments/1wkwns6/what_makes_a_ui_look_ai_generated/) [SC-R]
- u/childDuckling (32, top): "https://impeccable.style/slop/"
  - Reply, u/Nerwesta: "The 'Side-card tabs' (with the badly made coloured borders) and 'Massive icons' examples are what I encountered like 4 times today".
- u/callingbrisk (8): "giveaways like non-concentric border radii." (NEW)
- u/DrPooTash (14): "Eyebrow text"
- u/witness_smile (7): "typical AI fonts and AI colors (dark mode with purple primary color), putting way too much clutter, neon badges in the hero section for no reason, overly using transitions"
- u/ThatGreenAlien (3): "Em Dashes (—) especially when used in lieu of a blank space like an empty table cell. Emojis instead of icon sets. Purple Gradients. Icon and Text on every button. Edit: another good one is random monospaced fonts" (several NEW)
- u/neoqueto (1): "worthless status indicators, a jumble of buttons."
- u/doppingtest (1): "Icons that don't quite match tone/weight — like a chunky filled icon next to three outline ones" and "Cards for everything."
- u/Sea-Zombie-5384 (1): "Lots of super tiny fonts you can't read without a magnifying glass next to huge bold ones. And then they're all one long single-page scroll."
- u/Willing-Pirate2599 (1, 2026-10-05): "the overuse of that gradient border card style gives it away every time".
- u/blackroseseason (1): "the worst attempt at making the liquid glass look with a purple or orange accent with the most generic sans serif or alternately, skinny serifs"

*r/vibecoding, "Someone just told me my site looks vibe coded. Does it?" (u/DogC, 2026-06-09; 4, ratio 0.56, 137 comments)* — [Reddit](https://www.reddit.com/r/vibecoding/comments/1u1fago/someone_just_told_me_my_site_looks_vibe_coded/) [SC-R]
- u/Inevitable_Butthole (34): "Those cards and font i see on every vibed site."
  - Reply, u/FinalFantasiesGG (20): "Those cards are 1000% vibe coding style."
- u/Main-Lifeguard-6739 (18): "the main problem is that it's way too long and not on point"
- u/VihmaVillu (11): "2 menus why?"
  - Reply, u/NoAdsDude (9): "3 menus lol" (NEW: duplicated nav)
- u/d15gu15e (2): "No hero image needs to 3845x4363 and also not 7.4mb" (NEW, craft)

*Smaller threads*
- r/webdev (2026-07-27; 29 comments), a freelancer fixing vibe-coded SaaS: "I get this projects with blue purple gradient, rocket emojis, Hero Section and the logo with the same font." — [Reddit](https://www.reddit.com/r/webdev/comments/1v7xnn2/ai_made_my_earning_double_as_a_developer/) [SC-R]
- r/lovable, "How do you stop AI-built websites from looking AI-built?" (2026-06-05; 7; 20 comments): "Nice cards, nice spacing, nice rounded corners, but not always much personality." — [Reddit](https://www.reddit.com/r/lovable/comments/1txecyk/how_do_you_stop_aibuilt_websites_from_looking/) [SC-R]
- r/EntrepreneurRideAlong, "Every time I see a vibecoded landing page they instantly lose trust" (2026-07-06; 0; 9 comments) — [Reddit](https://www.reddit.com/r/EntrepreneurRideAlong/comments/1uoufos/every_time_i_see_a_vibecoded_landing_page_they/) [SC-R]
  - "Extra round edges, neon lights almost everywhere, IOS like windows with some moving charts and numbers"
  - "it just makes up some fake numbers like 'trusted by 1,200 customers'"

**C. Satire and the reference catalogue Reddit points to**
- HN, "Every fucking website: 2026 edition" (op.tngl.io; 122 pts, 33 comments, 2026-08-14) — [HN](https://news.ycombinator.com/item?id=49302737) [HN-API]
  - The page's own title is "Every Fucking Website — Slop Edition" — [page](https://op.tngl.io/every-fucking-website/) [WF]
  - It parodies:
    - "logo that looks like an asshole v0.0.1" (a version tag in the logo)
    - "Live status that means literally nothing"
    - a serif headline with "random italicised text" and "instrument serif"
    - the em dash as a "load-bearing cornerstone"
    - stats "Three · Words · I guess"
    - "Secondary CTA nobody clicks →"
    - a `curl … | sh` install line with a Copy button
    - "Trusted by... six companies from the same YC cohort" over "LOGO" placeholders
- Comments [HN-API]:
  - noman-land: "This needs bluish dark mode with accent color and pills with a little rounded colored border on just the left side."
  - JK-Swizzle: "It is missing the fade in on scroll."
  - devin: "Missing a flashy nonsense ASCII art animation."
  - m132: "It's not a Claude generated website without at least one `backdrop-filter: blur(1000px)` element that slows older machines to a crawl"
  - addandsubtract: "filled with random garbage stats that no one cares about."
- Impeccable's "slop gallery and catalog", the link in the top r/web_design reply above — [impeccable.style/slop](https://impeccable.style/slop/) [WF; headings verbatim, descriptions paraphrased by the fetch tool]
  - Gallery headings include "Side-Tab Cards", "Cardocalypse", "Copy-Paste Layouts", "Massive Icons", "Redundant UX Writing" and "Modal Abuse".
  - Catalog entries not in slop-detect's shipped or filed lists:
    - "Decorative grid-line background"
    - "Hairline border with wide shadow"
    - "Repeating-gradient stripes"
    - "Rough SVG illustrations"
    - "Radial-gradient background halo"
    - "Cards flush against the scroller edge"
    - "Unbalanced opening columns"
    - "Pulsing status dot"
    - "Decorative blinking cursor"
    - "Auto-scrolling marquee"
    - "Images that move on hover"
    - "Content stuck waiting to appear"
    - "Jagged image masks"
    - "Calling things 'theater'" (a copy tell)
    - "Same text repeated inside one container"
    - "Font/Color/Radius/Font size outside DESIGN.md"
  - The page reports 65 entries: 59 detector rules and 6 design-review patterns. The fetch tool counted 67 section headings, so the totals don't fully agree.

**D. Fonts**

Practitioners now name Manrope, Playfair Display, Lora, JetBrains Mono and Fira Code (the r/ClaudeAI thread above), DM Serif and Instrument Serif (@yuwen_lu_).
- @digitlartifacts, 2026-09-04 (23 L / 3,021 V): "Almost every time a friend shows me their Claude designed app and asks for feedback the headline style is instrument serif or similar." — [X](https://x.com/digitlartifacts/status/2095820419085332617) [SC-X]
- @alessio_joseph, 2026-03-06 (5,132 L / 277 RT / 251,508 V / 1,118 BM) — [X](https://x.com/alessio_joseph/status/2030023944137552159) [SC-X]
  - A satirical "BREAKING" meme that attributes the quote to figure skater Alysa Liu: "startups must stop using instrument serif for everything if they want to differentiate from the market. it's well beyond hypersaturation and results in immediate disqualification from the taste discourse".
  - Treat it as a measure of resonance, not as a real quote.

**E. Claims in filed issues, checked against X and Reddit**
- **#202 "Sarah Chen" names: partly supported, but for fiction, not testimonials.**
  - r/ClaudeAI, "What's with Claude AI only ever using the last name Chen?" (2025-01-01; 58; 41 comments): "Without fail, Claude sonnet ALWAYS uses Chen. Sarah Chen. Theresa Chen. James Chen… Sometimes I'll get Martinez as well" — [Reddit](https://www.reddit.com/r/ClaudeAI/comments/1hqvzzs/whats_with_claude_ai_only_ever_using_the_last/) [SC-R]
  - r/ClaudeAI, "Sarah Chen/Rebecca Chen" (2025-06-26; 4; 7 comments): "Each of the characters has been a doctor or scientist" — [Reddit](https://www.reddit.com/r/ClaudeAI/comments/1ll4lqa/sarah_chenrebecca_chen/) [SC-R]
  - Pre-window context: "Who is Sarah Chen?" (2024-10-27; 37): "About 2/3 of all sci-fi themed short stories I let Sonnet generate have Sarah Chen as the main character." — [Reddit](https://www.reddit.com/r/ClaudeAI/comments/1gdgc3x/who_is_sarah_chen/) [SC-R]
  - An X search for "Sarah Chen" plus testimonials returned 0 posts [SC-X].
- **#197 motion monoculture: partly supported by generic complaints.** These include "fade in on scroll" (HN parody comment), "random animations in odd places" (r/webdev, 24), "overly using transitions" (r/web_design, 7), and @yuwen_lu_'s slow or buggy reveals.
  - No X or Reddit post was found criticising Aceternity or Magic UI by name.
  - Instead, those libraries appear in high-bookmark recommendation lists:
    - @himanshubuildss, 2026-10-11: 889 L / 1,817 BM, lists "ui.aceternity.com - 200+ animated React and Tailwind components" and "magicui.design" — [X](https://x.com/himanshubuildss/status/2109130327277142377) [SC-X]
    - @He1s_Sammy, 2026-10-16: 75 L — [X](https://x.com/He1s_Sammy/status/2111067471398535537) [SC-X]
  - An X search for "fade in on scroll" plus AI returned 0 posts.
- **#196 fake terminal: only the HN parody's `curl … | sh` block supports it.** A Reddit search found no macOS traffic-light terminal complaints [SC-R].

**F. Tells NEW relative to the shipped list and filed issues #196–#202, with deterministic detectability**

"Mentions" counts independent authors found in this sample; the best engagement is shown in brackets.

| # | Tell (status vs lists) | Mentions [best engagement], dates | Deterministic? Detection sketch | FP risk |
|---|---|---|---|---|
| 1 | Emoji-prefixed `console.*` messages / emoji in code comments (NEW, runtime/code surface) | 4 [625-upvote top comment, r/webdev 2025-11-06; 204; 87] | Yes: Playwright `page.on('console')` plus a scan of inline scripts for `console.\w+\(\s*["'\`]\p{Extended_Pictographic}` | Moderate: u/Driky (14) "Have been using emoji at the start of log messages… for 5/7 years"; u/SpartanG01 (22) |
| 2 | "Light grey commentary" under CTAs and closing sections (AMEND #202: generalise `risk_reversal_triad`) | 1 [@dickiebush 163K V, 2026-09-16]; partial: HN parody "Secondary CTA nobody clicks →" | Yes: a text node ≤14px with low contrast directly after a button group or at section end, counted per page | Moderate: legitimate checkout reassurance |
| 3 | Status dots / "Live" badges (NEW; or #197) | 4 [neoqueto; r/ClaudeAI bot summary; HN parody; Impeccable "Pulsing status dot"] | Yes: a ≤12px circle, green fill, `@keyframes` ping/pulse, next to "Live/Online/Operational/Now in beta" | Moderate: real status UIs |
| 4 | Accent stripe migrating from the left edge to the top (AMEND `accent_stripe`) | 4 [bot summary of 80 comments, 2026-06-18; u/IllustriousTip6904 32; HN noman-land; @yuwen_lu_] | Yes: a rounded card with a colored `border-top` or `border-left` ≥2px that differs from the other sides | Low–moderate |
| 5 | Floating bottom-right chat bubble (NEW) | 1 [@yuwen_lu_ "dead giveaway", 73K V] | Yes: `position:fixed`, bottom/right ≤32px, 50% radius, chat SVG, and no known vendor script (Intercom, Crisp, Drift) | Moderate |
| 6 | "Homogenous goo": analogous-hue stacking of icon, tile, card and border (NEW) | 1 [@yuwen_lu_] | Yes: ≥3 nested layers within about ±20° hue, plus an alpha border | Moderate |
| 7 | Duplicated or triplicated nav menus (NEW, craft) | 2 [r/vibecoding 11 & 9, 2026-06-09] | Yes: ≥2 visible link groups whose hrefs overlap ≥70% | Low–moderate |
| 8 | Non-concentric nested radii (NEW, craft) | 1 [r/web_design 8, 2026-09-19] | Yes: nested rounded boxes where inner radius ≥ outer radius − padding | Moderate: humans err too |
| 9 | Icon + text on every button; emoji in button text (NEW / AMEND `emoji_bullet_headers` to cover CTAs) | 2 [r/webdev 24; r/web_design 3] | Yes: share of buttons containing both an SVG and text, and emoji in button or link text | High (icon+text); low–moderate (emoji) |
| 10 | Em dash used as an empty table-cell placeholder (NEW, copy/markup) | 1 [r/web_design 3] | Yes: a `td` or `dd` whose text is exactly "—" | Moderate–high: long-standing typographic convention |
| 11 | `curl … \| sh` hero install block with Copy button; "v0.0.1" version tag in logo (AMEND #196) | 2 [HN parody 122 pts plus walrus01 comment, 2026-08-14] | Yes: `pre`/`code` matching `curl[^|]+\|\s*(sh\|bash)` near a copy button; `\bv\d+\.\d+(\.\d+)?\b` in a header logo | High for developer tools |
| 12 | "Tilted phone, sage green, poetic headlines" (NEW, GPT-6 Astra watchlist) | 1 [607 L / 163K V, 2026-09-16] | Partial: a device-frame image with a `rotate()` transform; sage hue band on a cream ground. Poetic headlines need semantics | Moderate–high |
| 13 | Oversized or uncompressed hero image (NEW, craft/perf) | 1 [r/vibecoding 2] | Yes: natural width ÷ rendered width > 2.5, or > 1 MB | Low |
| 14 | Today's date shown top-left on dashboards (NEW, dashboards only) | 1 [r/ClaudeAI 4] | Partial: text matching today's date in the top-left quadrant | Moderate |
| 15 | Mixed icon weights or sets (NEW) | 1 [r/web_design 1] | Yes: within one component group, a mix of fill and stroke or stroke-width variance | Moderate |
| 16 | Tiny micro-text next to huge display text; "one long single-page scroll" (AMEND `flat_type_hierarchy` / #198 page length) | 3 [r/vibecoding 18 "way too long"; r/web_design 1; Impeccable "Tiny interface text"] | Yes: share of text nodes <12px; max÷min font-size ratio; scroll height per 1,000 words | Low–moderate |
| 17 | Decorative grid-line background; hairline border + wide shadow; repeating-gradient stripes; jagged image masks (NEW) | 1 [Impeccable catalog, cited by Reddit's 32-upvote reply] | Yes: repeating gradients with small `background-size`; `border:1px` with shadow blur ≥24px on the same element; `mask`/`clip-path` with many vertices | Moderate |
| 18 | Content stuck hidden after its entrance animation fails (AMEND #197 into a craft defect) | 2 [@yuwen_lu_; Impeccable "Content stuck waiting to appear"] | Yes: after a full scroll and a timeout, text-bearing elements still at opacity 0 or hidden | Low: it is a bug |
| 19 | Fabricated proof numbers ("trusted by 1,200 customers", "Trusted by… six companies") (AMEND #202 fake-proof) | 3 [r/EntrepreneurRideAlong; HN parody/TacticalCoder; addandsubtract] | Partial: regex `trusted by [\d,]+` plus `stat_banner`. Truth is not checkable | Moderate |
| 20 | Agent files exposed (CLAUDE.md, AGENTS.md, .cursorrules) (NEW provenance probe) | 1 [r/webdev 4, "with access to the source code"] | Yes: HEAD `/CLAUDE.md`, `/AGENTS.md`, `/.cursorrules` | Low as provenance; it says nothing about slop |
| 21 | "Calling things 'theater'" (NEW copy, watchlist) | 1 [Impeccable catalog only] | Yes: `\b\w+ theater\b` density | Moderate |
| 22 | Font list additions: Manrope, Playfair Display, Lora, JetBrains Mono, Fira Code, DM Serif, Instrument Serif (AMEND `slop_fonts`) | 5+ [r/ClaudeAI post 338; @yuwen_lu_; @digitlartifacts; @alessio_joseph 5,132 L] | Yes (computed `font-family`) | High: the top reply (341) objects; see Q2 |

### Inferences
- **What X and Reddit add over HN.** The new material is not a new monoculture but a long tail of component-level and craft-defect tells (rows 1–19). The popular aggregate complaints map onto shipped patterns (`icon_card_grid`, `nested_cards`, `hero_eyebrow_pill`, `glassmorphism`, `colored_glows`, `purple_accent`, `slop_fonts`), which suggests the shipped core is well aligned with lay perception.
- **Craft defects are model-agnostic.** Rows 7, 8, 13, 16 and 18 (duplicate nav, non-concentric radii, oversized images, tiny text, stuck content) are defects rather than styles. That makes them less exposed to the "pioneer" false-positive critique in Q2, and they persist across model eras. Bakaus reports that "90%+ failed the contrast floor".
- **Highest value per false positive for a deterministic roadmap:**
  - row 2 (CTA grey microcopy)
  - row 3 (status dots)
  - row 4 (`accent_stripe` covering top stripes)
  - row 18 (stuck content)
  - row 1 (console emoji, as a separate "build artifact" signal)
  - row 9b (emoji in CTAs)
- **Watchlist only.** Rows 10–12 and 21–22 should stay at low weight or on a watchlist until there is lift data. Each is single-source or carries a high false-positive risk.
- **Purple is not fully gone.** @dickiebush's Claude-generated page in Sep 2026 still had it, and r/lovable reported it in May 2026 (Q5). Meanwhile @yuwen_lu_ (Apr 2026) says Claude stopped generating it. Down-weight purple, don't retire it, and make it model- and tool-conditional.

### Gaps
- None of the new tells has prevalence or lift data. Every engagement figure measures resonance, not accuracy.
- I could not find the "viral tweet" about `border-left` plus `border-radius` that @yuwen_lu_ refers to. WebSearch and X search returned nothing.
- No X or Reddit evidence was found for marquees, Aceternity or Magic UI by name, macOS traffic-light terminals, or the "Sarah Chen" name list in *testimonials* specifically.
- Reddit comment pages were read only up to the first page (about 15–20 top-level comments per thread).

## Q2. What criticisms of AI-slop detectors, "AI shaming" and leaderboards appear, including false positives on high-craft sites, pioneer vs clone and evasion, and what would make a detector credible to these critics?

### Takeaway
The single most-upvoted reaction to a tell list in this sample defends the fonts. "These were popular fonts way before Claude entered the scene, and idgaf, I’m still gonna use em" (341) outscored the post it replied to (338).

Practitioners repeatedly argue four things:
- **Defaults predate AI.** They cite Bootstrap and Squarespace templates, Cloudflare's dashboard and Perplexity's branding.
- **Human work gets misread as AI.** One example is a human-designed dashboard with a 0.37 upvote ratio on "is this AI?".
- **Lay "tells" contradict each other.** Misalignment is cited as evidence both of AI and of a human hand.
- **Evasion is trivial.** Wikipedia's list became a 923K-view skill, and slop-detect's own pre-title evades its caps check by being lowercased.

Credibility, in critics' terms, means:
- measuring the *absence of decisions* rather than a style
- stacked signals rather than single ones
- surviving a "pioneer and template" test set
- not penalising good, free, performant fonts

### Cited Findings

**A. "Popular for a reason": the font and default backlash** (r/ClaudeAI, 2026-06-18, the 338-score thread) — [Reddit](https://www.reddit.com/r/ClaudeAI/comments/1u95x9l/you_can_spot_a_claudebuilt_app_instantly_its_the/) [SC-R]
- u/gold_tiara (341): "These were popular fonts way before Claude entered the scene, and idgaf, I’m still gonna use em."
  - Reply, u/Cookiest (73): "It also helps with load times. There's a reason these are everywhere. They're free, business licensed."
  - Reply, u/ChrisRogers67 (14): "These posts about “this looks vibe coded cuz the fonts” only make sense to devs. End users won’t ever know the difference"
- u/besse (10): "you can spot a Claude-built app where *no* design or editorial input has been provided… just like the “em-dash”, Claude uses elements that it learnt from, so by definition, those choices existed before Claude."
- u/lamiller0622 (20): "I can smell a “default” Claude project from a mile away, but thats more of a signal of how much the user played a role in the design or not."
- u/alittlepogchamp (4): "I went on google fonts and picked manrope myself. Now my project is slop."
- u/og_adhd (1): "JetBrains Mono is the only OpenSource mono space font where every glyph is visually discernible from every other glyph. It’s simply a good font"
- The bot TL;DR: "you're not spotting a 'Claude-built' app, you're spotting a low-effort app… this is just the 2026 version of every website looking like a Bootstrap or Squarespace template."

**B. False positives on human, template and pioneer designs**
- r/web_design, "Is this design ai generated?" (2026-07-24; score 0, ratio 0.37, 18 comments) — [Reddit](https://www.reddit.com/r/web_design/comments/1v5iocm/is_this_design_ai_generated/) [SC-R]
  - The OP flagged a dashboard "made by a designer using the Hugeicons icon pack" because it "immediately gave me that AI generated UI vibe".
  - u/FunkMunki (48): "Looks like a generic dashboard design. Could be AI, but it could not be AI."
    - Reply, u/Xiten (4): "Yea, this is like identical to Cloudflare’s dashboard."
  - u/seamore555 (21): "Likely a template".
  - Contradictory heuristics:
    - u/LimoenRoodsteen (2): "the dashboard grid is not alligned. I don't think AI does that."
    - u/hdubfour (1): "The mis-alignment… leads me to think that it may be AI".
    - u/midnitefox (1): "ai cannot, on its own, create such high component consistency."
- The pioneer lineage of a "tell", from @digitlartifacts (2026-09-04): Instrument Serif's revival "reached peak tech design bubble influence after @Smith_Diction used it for the @perplexity_ai branding and thousands of copycats emerged from there. More recently Claude picked it up as default headline font" — [X](https://x.com/digitlartifacts/status/2095820419085332617) [SC-X]
- @hobdaydesign (2025-10-16; 11 L): "there isn't another good condensed editorial serif on Google Fonts. If you want that feeling, and you want it for free, Instrument Serif is your only choice." — [X](https://x.com/hobdaydesign/status/1978840769407365427) [SC-X]
- A human-made showcase site with the 2026 "AI cluster": @OnePageLove (2026-09-13) featured a one-pager with "elegant serif typography, a soft cream palette… Typeface: Instrument Serif, PT Mono", credited to a named designer and studio — [X](https://x.com/OnePageLove/status/2099107914522718443) [SC-X]
- Bootstrap analogies:
  - u/ibopm (157), r/web_design (2026-08-30): "This is similar to when Bootstrap came out and every website started looking exactly the same. The good designers still used Bootstrap a lot, but they designed and customized all the components themselves." — [Reddit](https://www.reddit.com/r/web_design/comments/1w2308l/designer_in_our_company_regressed_too_much_with/) [SC-R]
  - u/TheRealBejeezus (5), r/ClaudeAI: "The generic sloppy UI you describe is what you get from most recent UX grads, too, AI or not." — [Reddit](https://www.reddit.com/r/ClaudeAI/comments/1ws9oix/how_are_people_actually_getting_claude_to_build/) [SC-R]
- Craft-reputation context for pioneers: @saranormous's X Article "Taste" (2025-06-03; 1,912 L / 366,310 V): "Linear's waitlist converted massively because every pixel whispered competence." — [X](https://x.com/saranormous/status/1929982495644365161) [SC-X]

**C. Pioneer cloning at scale, which turns pioneer looks into clone looks**
- @gregisenberg (2026-05-06; 3,519 L / 331 RT / 142 Rp / 516,007 V): "Don't create a design system from scratch. Find a brand you love. Linear, Stripe, Vercel, whatever resonates. Study it. Use ChatGPT or Claude to help you extract the design language into your own design.md file." — [X](https://x.com/gregisenberg/status/2052110589682749869) [SC-X]
- @techNmak (2026-04-06; 113 L): "VoltAgent just open-sourced 55 ready-to-use DESIGN[.]md files extracted from real websites - Claude, Vercel, Linear, Stripe, Notion, Figma, Supabase, Raycast, Cursor, Spotify, Apple, and dozens more." — [X](https://x.com/techNmak/status/2041050738563125533) [SC-X]
- The same repo was recommended on r/ClaudeAI, u/omeraplak (15).
- u/mitterb (145), r/ClaudeAI (2026-09-28): "find a website you want to replicate from dribble or awwwards.com and then ask Claude to replicate X website's layout with your brand colors and identity." — [Reddit](https://www.reddit.com/r/ClaudeAI/comments/1ws9oix/how_are_people_actually_getting_claude_to_build/) [SC-R]

**D. Self-censorship and "AI shaming"**
- u/Due-Horse-5446 (87), r/webdev: "ive started removing checkmarks from cli just to not make it look like its ai slop" — [Reddit](https://www.reddit.com/r/webdev/comments/1oq9yin/how_do_you_know_that_its_coded_by_ai/) [SC-R]
- u/SpartanG01 (22): "As someone who has been doing this for fun for like 25 years I am quite annoyed the reputation AI has given this lol."
- r/web_design, on em dashes:
  - u/Nerwesta (3): "Em Dashes are huge redflags nowadays, sadly so for people genuinely using it."
  - u/orlock (4): "As a typography nerd, you'll pull my emdash from my cold dead hands." — [Reddit](https://www.reddit.com/r/web_design/comments/1wkwns6/what_makes_a_ui_look_ai_generated/) [SC-R]
  - This contrasts with the prior notes' finding that Wikipedia now files em dashes under "historical" indicators. Lay perception lags model behaviour, so false-positive harm persists.
- r/webdev, "Portfolio Feedback" (2026-01-31; 10; 29 comments): "it is incredibly hard to make a dark mode website that doesn't look vibe-coded... Good thing I don't like the color purple that much" — [Reddit](https://www.reddit.com/r/webdev/comments/1qs35d7/portfolio_feedback/) [SC-R]
- r/vibecoding (2026-06-13; 62 comments): "I often see people fry others for vibecoding an app" — [Reddit](https://www.reddit.com/r/vibecoding/comments/1u4m21a/how_to_make_a_vibecoded_app_look_not_vibecoded/) [SC-R]
- r/vibecoding, "Link me your website and Ill tell you if it looks vibe-coded" (2026-09-03; 115 comments) — [Reddit](https://www.reddit.com/r/vibecoding/comments/1w6ia1d/link_me_your_website_and_ill_tell_you_if_it_looks/) [SC-R]
  - The OP offers only "a one word answer based strictly off vibes", adding: "'looks vibe coded' doesn't necessarily mean it looks bad".
  - This is crowd adjudication without evidence, the practice critics object to.
- Sceptics of tell-spotting, r/webdev 2025-11-06:
  - u/discosoc (41): "Most of the 'tells' aren't really anything other than stuff devs don't do themselves."
  - u/dave8271 (13): "most people who claim to be able to accurate discern between AI and human output aren't nearly as good at that task as they think and are… just going on 'vibes.'" — [Reddit](https://www.reddit.com/r/webdev/comments/1oq9yin/how_do_you_know_that_its_coded_by_ai/) [SC-R]

**E. Gaming and evasion: published lists become avoidance skills**
- @blader (2026-01-18; 5,541 L / 287 RT / 215 Rp / 119 Q / 923,353 V): "it's really handy that wikipedia went and collated a detailed list of 'signs of ai writing'. so much so that you can just tell your LLM to ... not do that. i asked claude code to read that article, and create a skill to avoid all of them." — [X](https://x.com/blader/status/2013015738622284156) [SC-X]
- @rubenhassid (2026-03-08; 7,093 L / 766 RT / 747,475 V): "Read my anti-AI writing style file first. It contains every known pattern of AI writing I want to avoid… Step 1. Go to Wikipedia. Step 2. Search 'Signs of AI writing.' Step 3. Copy the entire page." — [X](https://x.com/rubenhassid/status/2030667540389634534) [SC-X]
- u/getSchmade (4), r/vibecoding (2026-06-07): "a banned list: no purple gradients, no glassmorphism, no centered-hero-with-two-buttons. The banned list does the most work — the model knows exactly what the generic AI site looks like" — [Reddit](https://www.reddit.com/r/vibecoding/comments/1tyr2mc/how_do_people_actually_vibe_code_good_looking/) [SC-R]
- Evasion of slop-detect itself: on HN, Piotr Migdał (`stared`) suggested its own pre-title escapes detection if made lowercase (Q4) [HN-API].

**F. "Does it matter?": trust versus indifference**
- u/astropolymath (4): "The people complaining that your site is vibe coded are not your customers." — [Reddit](https://www.reddit.com/r/vibecoding/comments/1u1fago/someone_just_told_me_my_site_looks_vibe_coded/) [SC-R]
- Counterpoint, r/lovable (2026-04-16; 16 comments): "Lost a customer to a competitor today. The Reason? Our site doesn't look 'Polished' enough." — [Reddit](https://www.reddit.com/r/lovable/comments/1sn9582/lost_a_customer_to_a_competitor_today_the_reason/) [SC-R]
- Counterpoint, r/EntrepreneurRideAlong: "we started to notice that 'vibecoded websites show fake numbers' so instead of proving that you're credible, you'll also have to prove that whatever you provided is real" — [Reddit](https://www.reddit.com/r/EntrepreneurRideAlong/comments/1uoufos/every_time_i_see_a_vibecoded_landing_page_they/) [SC-R]
- r/web_design (2026-08-30; 541, ratio 0.96, 86 comments), a talented designer's output after he leaned on Claude: "Every single design and component we make these days looks exactly like a vibe-coded website made by a 15yo." — [Reddit](https://www.reddit.com/r/web_design/comments/1w2308l/designer_in_our_company_regressed_too_much_with/) [SC-R]
  - Dissent, u/tourqski (1): "If it's getting approved and shipped to production then it seems what he's doing is working and you're just bothered by your personal taste."

**G. Criticism aimed at detectors themselves**
- X searches for "AI slop" detector false positive and for "AI shaming" design both returned 0 posts [SC-X].
- The only direct critique of a design-slop detector found anywhere in this sample is the HN thread on slop-detect.com (Q4).
- An LLM-judged competitor pre-empts the criticism in its launch post, r/SEO_tool_dev (2026-09-29; 4; 8 comments): "you might have spent 3 weeks writing every word on the page and still get your AI slope score > 80. Is the tool against AI content? No, it's against poor content." — [Reddit](https://www.reddit.com/r/SEO_tool_dev/comments/1wtcyew/ai_slop_detector_for_your_website_content/) [SC-R]

### Inferences
**What critics would accept, in their own terms**
1. **Frame the score as "unauthored defaults", never as "AI-made".** "a signal of how much the user played a role in the design" (20); "you're spotting a low-effort app" (bot summary).
2. **Treat no single font or punctuation mark as dispositive.** Fonts drew 341 upvotes of pushback; em dashes were "sadly" penalised. Fonts belong only in co-occurrence.
3. **Publish a "pioneer and template" regression set** that the detector must not flag "Heavy". It should include:
   - Cloudflare's dashboard
   - Perplexity's branding
   - Linear, Stripe and Vercel
   - One Page Love and Awwwards human sites with cream, serif and mono
   - Bootstrap-era pages
   - Pattern-level false-positive rates should be reported against it.
4. **Prefer craft defects and provenance markers**, which are not taste claims, over style matches.
5. **Make evasion costly.** Avoid checks that a cosmetic change defeats, such as an eyebrow evading `all_caps_labels` by being lowercase. Score structure and distribution as well.

**Consequences for the roadmap**
- Because published lists become avoidance skills within weeks (923K and 747K views), a detector's public spec doubles as an evasion manual. That is acceptable if the product is the fix workflow (`fix_prompt`), but detection recall will decay faster than the release cycle.
- No leaderboard or "hall of shame" backlash was found on X or Reddit. Crowd "vibe check" threads (115 comments) are common and accepted there. That still doesn't argue for public third-party rankings, given the harm norms recorded in the prior notes.

### Gaps
- There was no X or Reddit discussion of Krebs's Show HN gallery, VibeCheck, or any design-detector false-positive case. X reply threads were not reachable.
- No legal or ethical complaint against design detectors was found.
- No measured false-positive rate exists from these communities; everything is anecdote.

## Q3. What do SEO/AEO practitioners report, with numbers, about llms.txt fetches, AI crawler and referral traffic, markdown twins and structured data in 2026?

### Takeaway
**llms.txt.** Large-sample data discussed on r/SEO in 2026 consistently shows it is almost never fetched:
- Ahrefs, 137K domains: 97% of files got zero requests in May 2026. Named AI tools were 19.5% of the remaining fetches, led by GPTBot and Claude-Code.
- Otterly: 84 of 62.1K AI-bot hits.
- SE Ranking, 300K domains: no citation impact.

John Mueller, posting on Reddit, now on record in primary form: "it's purely speculative for now (the file has existed for years, yet none of the AI systems use it…)".

There is one high-profile contradiction on X. Marc Lou says OpenAI and Anthropic "used llms.txt heavily" on TrustMRR, n=1M+ bot hits, without published method.

**Referral measurement** proved fragile in Oct 2026. A GPT-6 bug stripped `utm_source=chatgpt.com` and the referrer from about Oct 8–15. Tracked ChatGPT visits fell about 60% within a day; one panel reported −37%. Similarweb's Sep 1 reclassification of Google AI Mode moved Gen-AI numbers by 60–70% for big sites.

**Markdown twins and content negotiation** are recommended by builders, for example Zeno Rocha's checklist at 180K views. "GEO" draws snake-oil framing.

### Cited Findings

**A. Large-sample llms.txt studies, as discussed on r/SEO**
- *"We Analyzed 137K Sites: 97% of llms.txt Files Never Get Read"* (u/WebLinkr, 2026-06-15; 80, ratio 0.93, 106 comments; links to Ahrefs) — [Reddit](https://www.reddit.com/r/SEO/comments/1u6iqna/we_analyzed_137k_sites_97_of_llmstxt_files_never/) [SC-R]
  - "28% of the 137K domains using Ahrefs Web Analytics publish an llms.txt file."
  - "97% of those files received zero traffic in May 2026."
  - "96% of the requests that did reach llms.txt files came from bots."
  - "19.5% of fetches came from named AI tools… GPTBot is top and Claude-Code is second."
  - "12% of fetches come from the industry studying itself."
  - "Zero requests came from AI bots for llms.txt files that don’t exist."
  - "The Chrome Lighthouse llms.txt audit produced roughly 1 in 1,000 fetches."
  - Comments:
    - u/Tomdv2 (13): "it took robots.txt nearly 28 years to be adopted as an internet standard. llms.txt was proposed a little under 2 years ago."
    - u/Tomdv2 (10): "none of the major LLMs have adopted the standard, but several large companies have implemented LLMs.txt (including Cloudflare, Vercel, etc). Does it provide any value now? No."
    - u/jachcemmatnickspace (16): "Linkedin people with GEO AI EXPERT in their bio talk about llms.txt are even more full of shit"
    - u/50_cal (5): a client said "let's do it anyway, maybe we can be in that 3%".
- *"SE Ranking: LLMS.txt does nothing - 300,000 domains analyzed"* (2026-03-30; 71; 66 comments) — [Reddit](https://www.reddit.com/r/SEO/comments/1s7q0zq/se_ranking_llmstxt_does_nothing_300000_domains/) [SC-R]
  - "LLMs.txt doesn’t impact how AI systems see or cite your content today."
  - Reposted 2026-06-22 (42; 26 comments) — [Reddit](https://www.reddit.com/r/SEO/comments/1uclth8/does_llmstxt_impact_your_ai_visibility_and/) [SC-R]
- *Otterly AI study*, relayed in a comment by u/WebLinkr (2026-04-27): "Total AI bot visits to the site: 62,100+ / Total AI bot visits to /llms.txt: 84 / Share… ~0.1%" and "llms.txt performed 3x worse than average pages" — [comment](https://www.reddit.com/r/SEO/comments/1srvco1/comment/oim14sk/) [SC-R; the study itself is 2nd]

**B. Google, in primary form on Reddit**
- u/johnmu, John Mueller's Reddit account, r/SEO "LLMs.txt: Google saying two different things?" (2026-05-31; thread 77, ratio 0.94, 67 comments) — [Reddit](https://www.reddit.com/r/SEO/comments/1tsugib/llmstxt_google_saying_two_different_things/) [SC-R]
  - (19 upvotes): "I don't think anyone knows - it's purely speculative for now (the file has existed for years, yet none of the AI systems use it -- what does it mean?). I like the WebMCP approach, as well as the commerce integrations… Of course, all of this assumes that the most basic agentic optimization is in place, namely: don't block agents. I think that hurdle will be the biggest, for most sites."
  - (55 upvotes): "When an AI platform that brings you clients complains that it needs the file for your site, then I'd recommend taking the time to create one. (Aside, if you use an LLM to create the file for you, doesn't that mean the LLM could just ... create it for itself too?)"
  - This confirms in primary form the "purely speculative" quote that the prior notes held only secondhand.
- u/jasonhamrick (22), same thread: "Lighthouse means Google is now checking whether your website has a file that helps AI agents understand what your business does… You don't need LLMs.txt to provide signals for LLM citations. You might need LLMs.txt to provide signals to agentic browsers."
- r/SEO, "Is llms.txt file a scam?" (2026-04-21; 16, ratio 0.77, 83 comments) — [Reddit](https://www.reddit.com/r/SEO/comments/1srvco1/is_llmstxt_file_a_scam/) [SC-R]
  - u/legionxstudios (14), reporting a Google Toronto session: "Their answer is no, LLM.txt is not needed or required."
    - Reply, u/johnmu (4): "I hope they're right ..."
  - u/Lucifer_x7 (39): "Yes to the title"
  - u/BusyBusinessPromos (15): "It's not supported by any AI so it's only a scam if you try to sell it as a service"
    - Reply, u/Nyodrax (3): "Anthropic looks for it, allegedly"

**C. Practitioner logs (anecdotes), same "scam?" thread**
- u/jeffreySJ (2): "I set one up on a client site and had it added to the sitemap (llms don't look for it but they'll crawl it if you out it in front of them). I can confirm it has been crawled by the models including chatgpt, perplexity, and Claude. I have no proof yet it led to any benefit"
- u/Enargo (2): "LLMs.txt was never queried even once."
- u/Bravo_247 (1): "Every page receives bot traffic including robots.txt and sitemap. But no bot has crawled my llms.txt so far. And yes it's mentioned in the robots.txt."
- u/ARCreef (1), on hosting soft-404s: "NGinx intercepts the page often on servers like wpengine and issue #2 is wordpress php redirects it often to your root homepage… If you open in a browser and dont see a wall of txt or you get a 404 then its not actually set up"
- u/NHRADeuce (1): "You can literally add a blank llms.txt file and get the same results. Plus you satisfy the check on automated site audits and you can tell the higher ups that you have one." This is a direct critique of presence-only audit checks.

**D. Contrarian and pro-llms.txt data on X**
- @marclou (2026-08-13; 390 L / 16 RT / 63 Rp / 4 Q / 63,513 V / 469 BM): "AI bots data for TrustMRR: - OpenAI and Anthropic used llms.txt heavily to answer users, index pages, and train their models. - Markdown pages are crawled 50% of the time; AI bots still use HTML. - /mcp is the page that ChatGPT/Claude crawl the most to answer users. n=1M+ AI bots in the last 30 days" — [X](https://x.com/marclou/status/2087872366898827510) [SC-X]
  - No method or classification rules were published. Lou's X bio lists his analytics product DataFa.st. The replies were not retrievable.
- Lou was quote-posting @zenorocha, Resend CEO (2026-08-12; 1,139 L / 56 RT / 77 Rp / 20 Q / 179,972 V / 1,672 BM): "how to make your site readable by ai agents: 1. add an llms.txt so search tools stop guessing urls 2. check your server logs, not your analytics 3. serve a markdown version of every page 4. support content negotiation headers 5. rethink your JS-only widgets" — [X](https://x.com/zenorocha/status/2087547759083901252) [SC-X, as the embedded quoted post]
- @marclou (2026-07-13; 561 L / 57 Rp / 118,161 V): "AI labs started indexing, training, and serving my new *.md files… I asked ChatGPT to check {{startup_markdown_URL}}, and it couldn't because of 'cache missed' or '400 timeout fetching'. So I added all 8,831 URLs to the sitemap.xml and added the following headers: 'Content-Type': 'text/plain; charset=utf-8' 'Content-Disposition': 'inline' I can't tell if this helped, but 24 hours later, ChatGPT was able to fetch them properly" — [X](https://x.com/marclou/status/2076687096279171344) [SC-X]
- @marclou (2026-07-22; 203 L / 48 Rp / 27,752 V): "AI bot traffic on TrustMRR in the last 30 days: 🤖 850K+ visits 🧑‍💻 4.25x human traffic 🧠 Meta dominates LLM training (87%) 🔎 OpenAI makes 2x crawls than Google for indexing 🙋 ChatGPT crawls my site 20X more than other assistants to answer user questions" — [X](https://x.com/marclou/status/2079948839050739909) [SC-X]
- @jeremyphoward (2025-03-18; 897 L / 118,388 V): "My proposed llms.txt standard really has got a huge amount of momentum in recent weeks… including the good folks at @StripeDev" — [X](https://x.com/jeremyphoward/status/1901796294257225857) [SC-X]
- @WriteSonic (2026-07-16; 2 L): "Does LLMs.txt help you get cited by AI engines? According to our data: not directly. It helps agents navigate your site, docs, and APIs better." — [X](https://x.com/WriteSonic/status/2077644660143755552) [SC-X]
- @grok's own reply (2026-10-01): "An llms.txt file is public markdown that summarizes a site and links key pages for context. I can examine it like any other text when relevant, but it is not a rule set or system prompt that controls my conclusions" — [X](https://x.com/grok/status/2105580208413720662) [SC-X]
  - A separate @grok reply on the same day refers to "Ignoring the llms.txt bias material", which suggests a site tried to steer its assessment via llms.txt. The context is unclear — [X](https://x.com/grok/status/2105509851077972386) [SC-X]

**E. Markdown for agents and content negotiation in practice**
- @chris_nectiv, Chris Long of Nectiv (2026-09-28; 82 L / 15,983 V / 150 BM): "SEOs, your competitors may be covertly switching their content from HTML to markdown for AI agents. You can analyze by auditing their Accept Headers." — [X](https://x.com/chris_nectiv/status/2104585839674265696) [SC-X]
- Publishers ship llms text for books, e.g. @philipkiely (2026-08-31; 545 L / 32,541 V): "The full text of Inference Engineering is now available to LLMs everywhere… 3,000 tokens | links to each chapter… 70,000 tokens | full text" — [X](https://x.com/philipkiely/status/2094545309393424848) [SC-X]

**F. AI referral measurement in Oct 2026**
- Cedric Huesler, Adobe (LinkedIn, 2026-10-14; 586 likes / 73 comments) — [LinkedIn](https://www.linkedin.com/posts/cedrichuesler_chatgpt-didnt-stop-sending-visitors-it-activity-7515970265852588033-KwRS) [SC-LI]
  - "GPT-6 opens links with window(.)open(url, “_blank”, “noopener,noreferrer”) and drops ?utm_source=chatgpt(.)com."
  - On about 500 pages: "ChatGPT: −31k visits a day. Direct: +26k a day on the same pages."
  - Earlier tests, two separate bullets in his recap:
    - "Oct 6: tested Eric Wu’s 'direct is secretly AI' idea across ~600 brands. It was real but rare, and showed up mostly on docs and help pages."
    - "Oct 10: asked how much of direct SEO/GEO teams can claim. It’s about 1–2 extra visits for every 10 you can track."
- Cedric Huesler, follow-up (2026-10-15; 632 likes / 79 comments) — [LinkedIn](https://www.linkedin.com/posts/cedrichuesler_relieved-it-was-a-bug-chatgpt-is-tagging-activity-7516558431894376448-7aEs) [SC-LI]
  - "Relieved. It was a bug… Thu Oct 8, ~2pm PT: GPT-6 stops adding the tag. ChatGPT visits we could attribute drop to about a third of normal within hours… tagged ChatGPT clicks were back to roughly 95–100%… Keep counting the UTM, not the referrer. The referrer is still missing on most ChatGPT clicks"
  - Comment from Glenn Gabe: "I'm not seeing that change at all yet across paid or free accounts."
- Lily Ray (LinkedIn, 2026-10-15; 446 / 60): "Turns out the UTM parameter issue was just a glitch that OpenAI is already fixing." — [LinkedIn](https://www.linkedin.com/posts/lily-ray-44755615_turns-out-the-utm-parameter-issue-was-just-activity-7516578495402024961-6iU6) [SC-LI]
  - Comment from MV Braverman: "They need to remove it from links inside generated content though…"
  - Comment from Mordy Oberstein: "Yes! All 4 clicks are back!"
- Tomek Rudzki, Peec AI (2026-10-16; 282 / 47) — [LinkedIn](https://www.linkedin.com/posts/tomekrudzki_chatgpt-fixed-the-utm-issue-a-quick-recap-activity-7516790295091490816-gPtU) [SC-LI]
  - "reported traffic from ChatGPT to websites dropped by 37% (based on a panel of a few hundred domains)."
  - Comment from Chee L.: "only inline text links are fixed, links within the pills do not contain utm tracking".
- Jordan Koene (2026-10-15; 137 / 47) gave a timeline: "April 2025: OpenAI introduced UTM tracking for ChatGPT Search referrals. June 2025: ChatGPT expanded UTM tagging… May 2026: GA4 introduced its AI Assistant channel… October 2026: GPT-6 appears to reverse course" — [LinkedIn](https://www.linkedin.com/posts/jordankoene_oops-they-did-it-again-chatgpt-rolls-activity-7516313432439304192-zmnN) [SC-LI]
- Thomas Peham (2026-10-16; 59 / 27): "ChatGPT seemed to have increased the number of hyperlinks on brand mentions… Those links don't have any UTM" — [LinkedIn](https://www.linkedin.com/posts/thomaspeham_the-seogeo-community-is-currently-going-activity-7516736278336540672-fRa6) [SC-LI]
- @aleyda, Aleyda Solis (2026-09-23; 71 L / 8,350 V): "@Similarweb reclassified its traffic from 'Gen AI' to 'Organic Search' on September 1st… For many of the top sites… YouTube, Reddit, Facebook, it has been a 60-70% drop in Gen AI traffic (which is still a fraction of organic search)." — [X](https://x.com/aleyda/status/2102841125535138093) [SC-X]
- Relayed SE Ranking data, from @VaibhavSisinty (2026-06-06; 28 L): "SE Ranking analyzed 101,574 sites… Claude's referral traffic grew 386% (Jan–Apr 2026)… Claude is still only 1.40% of all AI referral traffic. ChatGPT sits at 78%." — [X](https://x.com/VaibhavSisinty/status/2063180786896122298) [SC-X; the study is 2nd]
- Search Engine Journal on Bluesky (2026-10-01; 9 likes), seen in Mueller's feed: "Google Gemini added UTM parameters to links, giving SEOs better numbers for measuring AI traffic" — [Bluesky](https://bsky.app/profile/sejournal.bsky.social/post/3mwstmpajho2z) [SC-BS; the exact parameter value is NV]

**G. Client-side rendering, robots and audit myths**
- r/lovable, "Lovable vibe coded websites are tanking in SEO and AI Search" (2026-02-10; 32 comments): "I looked at how Googlebot and OpenAI’s bot see my homepage. It was basically empty… connected the app to Prerender Io… Now crawlers can see all 67 pages of my site instead of 5, even with JS rendering disabled." — [Reddit](https://www.reddit.com/r/lovable/comments/1r15af7/lovable_vibe_coded_websites_are_tanking_in_seo/) [SC-R]
- r/SEO, "Question about AI crawlers and robots.txt" (2026-10-15; 19; 56 comments): clients' ChatGPT-made "AI slop reports are telling me I need to go in and individually allow each different AI crawler in robots.txt (OAI-SearchBot for example). Thing is, all crawlers are allowed on their sites" — [Reddit](https://www.reddit.com/r/SEO/comments/1x6nul6/question_about_ai_crawlers_and_robotstxt/) [SC-R]
- Agent-readiness scores used as marketing: @Theta_Network (2026-09-21; 484 L / 128 RT / 432,942 V): "Theta EdgeCloud is now 100% AI agent native… Check our score: isitagentready.com/www.thetaedgecloud.com" — [X](https://x.com/Theta_Network/status/2102046921787347103) [SC-X]
  - u/CorrectMeasurement72 on r/SEO: "Cloudflare just launched a handy tester (isitagentready.com), and a working llms.txt is one of the signals it checks." — [Reddit](https://www.reddit.com/r/SEO/comments/1tsugib/llmstxt_google_saying_two_different_things/) [SC-R]

**H. GEO as snake oil, and structured data**
- r/SEO, "The Verge: A notoriously anti-SEO publication appears to call GEO BS" (2026-04-06; 79; 51 comments) — [Reddit](https://www.reddit.com/r/SEO/comments/1sdzh4h/the_verge_a_notoriously_antiseo_publication/) [SC-R; The Verge itself is 2nd]
  - It quotes The Verge's "new openings for spammers, snake oil salesmen, and well-meaning but misinformed practitioners".
  - It also quotes Britney Muller on "AI-pilled SEOs… setting a dangerous precedent that they can influence AI in ways that are simply not true".
- r/SEO, "GEO hype busted" (2026-03-11; 19; 26 comments), quoting uSERP's Jeremy Moser via Digiday: "If a GEO service does not openly tell you that success in AI visibility is 80 percent good fundamental SEO, they are selling you snake oil" — [Reddit](https://www.reddit.com/r/SEO/comments/1rr9g04/geo_hype_busted_how_it_differs_and_how_it_doesnt/) [SC-R]
- @Hobo_Web, Shaun Anderson (2026-10-16; 38 L): "The entire paper is basically an LLM book report on my August 2025 book, Strategic AI SEO, with a 'GEO' sticker slapped on the cover." — [X](https://x.com/Hobo_Web/status/2111205037607186747) [SC-X]
- Structured data, contested:
  - u/Funfroglegs (2): "I find schemas and well thought of website structure to be far more efficient for ai visibility than anything else" — [Reddit](https://www.reddit.com/r/SEO/comments/1srvco1/is_llmstxt_file_a_scam/) [SC-R]
  - u/WebLinkr (1): "confirmation bias myths like llms, schema, EEAT, pagespeed, techstack are so popular" (same thread).
  - r/SEO on Yoast's NLWeb schema aggregation (2026-03-11): "Is it important or is this just more SEO snake oil?" — [Reddit](https://www.reddit.com/r/SEO/comments/1rra72u/nlweb_yoast_seo/) [SC-R]

### Inferences
**AEO axis**
- **`site.llmsTxt`.** Keep it informational and unweighted toward citations, and validate rather than check presence.
  - A blank file "satisfies the check on automated site audits" (NHRADeuce), so require non-trivial markdown structure.
  - Reject HTML soft-404s and redirects to the homepage (ARCreef).
  - Note whether the file is sitemap-linked (jeffreySJ, Marc Lou).
  - Mueller's "speculative" and Ahrefs's "97% zero traffic" support the "neutral when missing" stance from the prior notes.
- **`bot.notBlocked` and `robots.aiAllowed` matter most.** Mueller: "don't block agents… that hurdle will be the biggest". But don't require explicit per-bot `Allow:` lines when wildcard rules already allow them; the r/SEO "AI slop reports" thread shows that myth spreading.
- **`md.twin` matches practitioner advice:** Zeno Rocha's 5 steps, Chris Long's Accept-header audits, and Lou's ".md files" experience.
  - Add evidence fields: twin URLs listed in the sitemap, `Content-Type` (`text/markdown` or `text/plain`), and `Vary: Accept`.
- **Never imply traffic outcomes.** Practitioner attribution broke twice in six weeks (the GPT-6 UTM bug and Similarweb's reclassification).
- **Client-side rendering is the vibe-coding-specific failure.** "It was basically empty" for a Lovable site to Googlebot and OpenAI's crawler. An HTML-without-JS reachability check (`html.reachable` or `html.indexable`) is the highest-value AEO check for this audience.

**Copy axis**
- `utm_source=chatgpt.com` in in-content links remains a valid AI-assisted-content artifact. MV Braverman: "They need to remove it from links inside generated content".
- Its recall may fall because brand-mention links now carry no tag (Peham, Jaffray).
- Gemini has started tagging too, so add Gemini's parameter once its value is verified.

### Gaps
- Marc Lou's "used llms.txt heavily" lacks a method, and its 63 replies were not retrievable. I could not reconcile it with the Ahrefs and Otterly data; it may count sitemap-linked fetches or tool-driven ChatGPT-User fetches.
- No primary Ahrefs, SE Ranking or Otterly report was opened here; they are only relayed on Reddit and X. The prior and sibling AEO notes may cover them.
- No 2026 practitioner number on structured-data impact for AI citations was found on X or Reddit.

## Q4. How were slop-detect.com and comparable tools received (engagement, objections, feature requests)?

### Takeaway
**slop-detect.com** has almost no community footprint. Its one Show-HN-style post ("Does your landing page look generated?", 2026-09-06) drew 3 points and 3 comments. X, Reddit and web searches found no other mentions. All three comments were objections:
- the site scores itself "A+ 0/100" despite visible 2026 chrome (a middle-dot pre-title and hairlines)
- lowercasing the pre-title would evade detection
- a "100% AI" page was rated not generated (a false negative)

**Adjacent tools** got far more engagement, almost all of it for *prevention and fix* workflows rather than scores:
- Google Stitch's DESIGN.md: 18.8M and 6.9M views
- Thariq's Anthropic skills article: 7.0M views
- Hallmark: 854K
- the frontend-design plugin: 498K
- Impeccable: 1K-like launches, and "game changer" on Reddit (141) alongside "website is atrocious" (56)

### Cited Findings

**A. slop-detect.com**
- HN, "Does your landing page look generated?" (url https://slop-detect.com/; submitted by `stared`, 2026-09-06; 3 points, 3 comments) — [HN](https://news.ycombinator.com/item?id=49584813) [HN-API]
  - The submitter's HN profile links p.migdal.pl and quesma.com/blog, so `stared` is Piotr Migdał [HN-API].
  - Comments:
    - sunrunner: "slop-detect.com gets an A+ 0/100 when given its own domain to analyse. Interesting."
    - stared: "An interesting catch! Maybe it suffices to make this pre-title 'the ai-design-slop fingerprint · defs 2026.09' lowercase. In any case, from what I see what is AI aesthetics on the website: pre-title and horizontal lines."
    - murzynalbinos: "So, the page I’ve generated 100% using AI is being flagged as not generated by AI, even though the page itself looks like a typical AI-generated page."
- Searches with no results:
  - X: "slop-detect" and "slop-detect.com" both returned 0 posts [SC-X].
  - Reddit: "slop-detect.com" returned 0 posts [SC-R].
  - WebSearch: "slop-detect.com" returned nothing from the domain [2nd].
- Name collisions in search results [2nd]:
  - an npm package `slop-detector`, an MCP server that scores creative writing — [jsDelivr](https://cdn.jsdelivr.net/npm/slop-detector@1.2.0/README.md)
  - Chrome extensions named "Slop Detector" and "Slopdetector" — [Chrome Web Store](https://chromewebstore.google.com/detail/dfhgdfcioikcindgajgomkicfcfajall)
  - a "slop-detector" Claude skill — [claudeskills.info](https://claudeskills.info/skills/athola/claude-night-market/slop-detector/)

**B. Impeccable (Paul Bakaus)**
- v1.1 (2026-03-04; 1,576 L / 81 RT / 52 Rp / 150,547 V): "gives you the language to make AI-generated frontends suck less." — [X](https://x.com/pbakaus/status/2029334353894162720) [SC-X]
- v2 (2026-04-15; 937 L / 58 RT / 38 Rp / 66,476 V / 1,360 BM) — [X](https://x.com/pbakaus/status/2044505743144194514) [SC-X]
  - "CLI: npx impeccable detect. Scans your code *without need for an LLM* for 25 anti-patterns… Puppeteer-backed live URL scanning, CI-ready JSON output"
  - "Chrome extension. One-click detection on any page"
  - "an internal eval framework that… measures how much the output collapses into monoculture. The biggest unlock: an anti-attractor procedure that forces the model to enumerate and reject its reflex defaults"
- v3.5 (2026-05-29; 1,028 L / 104,582 V): "A rebuilt anti-pattern detector… 14 new rules, 41 total." It also published the generation metrics in Q1-A — [X](https://x.com/pbakaus/status/2060208540992880794) [SC-X]
- @johnmaeda (2026-06-22; 38 L / 17,523 V): "Impeccable… now ships inside the new GitHub Copilot app" — [X](https://x.com/johnmaeda/status/2069171206935494772) [SC-X]
- Reddit:
  - u/ChaseVsGodzilla (141), r/ClaudeAI 2026-09-28: "Give impeccable a try, it’s been a game changer for me"
    - Reply, u/Responsible-Slide-26 (56): "IMO the Impeccable website is atrocious… It has all the classic signs of tasteless design… 5 buttons, 10 icons, text all over the place." The same commenter later conceded the author "seems to have some serious skill". — [Reddit](https://www.reddit.com/r/ClaudeAI/comments/1ws9oix/how_are_people_actually_getting_claude_to_build/) [SC-R]
  - The bot TL;DR there: "Try impeccable.style. This tool was mentioned repeatedly as a game-changer for getting better UI."
  - The impeccable.style/slop link was the top r/web_design reply (32), and a link in the r/ClaudeAI fonts thread (12).

**C. Anthropic frontend-design skill and plugin**
- @trq212, Thariq of Anthropic (2025-11-13; 3,230 L / 220 RT / 116 Rp / 497,507 V): "We've released a new frontend-design plugin for Claude Code." — [X](https://x.com/trq212/status/1989061937590837678) [SC-X]
- @nityeshaga (2025-11-14; 2,253 L / 337,047 V): "it's just one file with 42 lines of instructions… that's all it takes to prevent claude from generating 'ai slop' frontend." — [X](https://x.com/nityeshaga/status/1989323006288830687) [SC-X]
- @theo (2026-01-23; 428 L): "it helps a lot (and helps Opus the most by far)" — [X](https://x.com/theo/status/2014501094911807712) [SC-X]
- @trq212's X Article "Lessons from Building Claude Code: How We Use Skills" (2026-03-17; 16,428 L / 2,256 RT / 389 Rp / 536 Q / 7,025,574 V): "The frontend design skill is a great example — it was built by one of the engineers at Anthropic by iterating with customers on improving Claude’s design taste, avoiding classic patterns like the Inter font and purple gradients." — [X](https://x.com/trq212/status/2033949937936085378) [SC-X]
- Objections:
  - @pbakaus (2026-05-03): "this is 2026 AI slop. ironically, in part introduced by anthrophic's frontend-design skill" (see Q5).
  - @pbakaus (2026-05-29): "many popular design skills, including Impeccable and Anthropic's frontend-design, weren't actually very good at...design".
  - r/ClaudeAI (2026-07-20; 31; 13 comments): "Claude start to read its default frontend-design skill file, but it look very default and after lot of artifact all start to look same" — [Reddit](https://www.reddit.com/r/ClaudeAI/comments/1v1v713/any_good_claude_frontenddesign_skills/) [SC-R]

**D. Google Stitch and the open DESIGN.md spec (google-labs-code)**
- @stitchbygoogle (2026-03-18; 41,177 L / 4,672 RT / 985 Rp / 2,274 Q / 18,770,620 V): "Meet the new Stitch, your vibe design partner… 📐 Design Systems and DESIGN.md" — [X](https://x.com/stitchbygoogle/status/2034332847893574080) [SC-X]
- @GoogleAI (same day; 5,514 L / 20,124,785 V) — [X](https://x.com/GoogleAI/status/2034332963811344738) [SC-X]
- @stitchbygoogle (2026-04-21; 18,103 L / 1,966 RT / 203 Rp / 323 Q / 6,863,380 V): "we’re open-sourcing the draft specification for DESIGN.md… agents know exactly what a color is for and can even validate their choices against WCAG accessibility rules." — [X](https://x.com/stitchbygoogle/status/2046624729403142320) [SC-X]
- @stitchbygoogle (2026-04-23; 2,945 L / 195,644 V): "DESIGN.md to Design System… Token Support" — [X](https://x.com/stitchbygoogle/status/2047356036890427448) [SC-X]
- @PawelHuryn (2026-03-19; 3,015 L / 604,767 V): "Google just shipped DESIGN.md — a portable, agent-readable design system file. That's the real announcement." — [X](https://x.com/PawelHuryn/status/2034583837351526763) [SC-X]
- @MengTo (2026-04-25; 598 L / 69,146 V): "DESIGN.md gives designers, developers, and agents one standard way to describe how a product should look" — [X](https://x.com/MengTo/status/2047917199655149791) [SC-X]
- Critique, @bbssppllvv (2026-03-19; 7 L): "generating 3 colors and a tiny type scale is not a design system. That’s why so much of the output looks the same: cheap, generic, template-like." — [X](https://x.com/bbssppllvv/status/2034648972766146687) [SC-X]
- r/vibecoding (2026-06-06; 66, ratio 0.92, 125 comments): "I tried everything - Stitch with antigravity, claude, Codex… all sites look cheap, vibe-coded or unprofessional" — [Reddit](https://www.reddit.com/r/vibecoding/comments/1tyr2mc/how_do_people_actually_vibe_code_good_looking/) [SC-R]

**E. Wikipedia "Signs of AI writing"**
- On X its reception is mainly as an evasion source: @blader (923,353 V) and @rubenhassid (747,475 V), Q2-E [SC-X]. HN reception is in the prior notes.

**F. Other prevention skills**
- @nutlope (2026-05-19; 5,356 L / 448 RT / 175 Rp / 854,016 V): "Introducing Hallmark! An open source design skill to make beautiful UIs and landing pages by default." — [X](https://x.com/nutlope/status/2056754959819915459) [SC-X]
- @petergyang (2026-08-05; 2,149 L / 317,474 V): "My last open-source skill, /no-ai-slop, clearly hit a nerve with 4K GitHub stars." — [X](https://x.com/petergyang/status/2085006701984698712) [SC-X]

**G. slopcop (Adrian Krebs) and VibeCheck (vibecheck.fail)**
- X searches for "slopcop", "adriankrebs design slop" and "vibecheck.fail" returned only unrelated posts, such as a different "slop cop" PR bot and generic "vibe check" posts. No Reddit thread was found [SC-X/SC-R]. Their reception is HN-only (prior notes).

**H. Other scorers seen on Reddit and Product Hunt**
- An LLM-judged "AI Slop detector for your website content" (aeo-copilot.com; r/SEO_tool_dev 2026-09-29; 4; 8 comments): "Jev answers small yes-or-no questions about each piece… Those answers make up the 14 tells… 'Fix them all' gives your AI agent the list as a Markdown file." — [Reddit](https://www.reddit.com/r/SEO_tool_dev/comments/1wtcyew/ai_slop_detector_for_your_website_content/) [SC-R]
- "Vibe or Not", Product Hunt crowd voting: "no AI detector… human judgment and pure internet instinct"; the counts were unlabeled — [Product Hunt](https://www.producthunt.com/p/vibe-or-not/vibe-or-not) [WF]

**I. Feature requests and workflow asks**
- The OP of the r/ClaudeAI 763-score thread: "Claude builds the page → opens the app → looks at the actual rendered UI → realizes that an illustration/icon/banner/etc. would improve it → … takes another screenshot → critiques the result → iterates until the UI actually looks polished."
- r/ClaudeAI (2026-05-03; 80; 29 comments): "We really need a website to stop these models from churning out identical code" — [Reddit](https://www.reddit.com/r/ClaudeAI/comments/1t2wsmj/are_there_any_good_websites_that_showcase/) [SC-R]
- Impeccable's catalog has DESIGN.md-conformance rules: "Font outside DESIGN.md", "Color outside DESIGN.md", "Radius outside DESIGN.md" [WF].

### Inferences
- **Fix slop-detect's credibility issues before any launch push.** The only public reception raises three things a critic can check in seconds:
  - a self-score of 0/100 while using a middle-dot pre-title and hairline rules, which Anthropic's 2026 list (prior notes) calls template chrome
  - case-based evasion
  - a false negative on an AI page
- **What the market rewards.** The top adoption signals go to:
  - skills and specs that change generation (Stitch, Hallmark, Anthropic, Impeccable)
  - public scores that serve as badges (isitagentready at 433K views)
- **Where slop-detect is best placed:**
  - a CI and MCP *verifier* for those generators, for example checking DESIGN.md conformance and failing PRs on craft defects
  - an AEO-readiness badge
  - not a standalone "is it AI?" judge
- **The direct competitor reaches users where they build.** Impeccable's detector is a free CLI with 41 rules and a Chrome extension, and it ships inside GitHub Copilot. slop-detect's differentiators remain the AEO axis, versioned definitions and the copy axis, but none of these surfaced in community discussion.

### Gaps
- slop-detect.com had no X or Reddit presence to measure, so engagement beyond the 3-point HN post is unknown.
- GitHub star counts for Impeccable and others are not refreshed here; the prior notes have Oct 2026 counts.
- Lovable, v0 and Bolt official X posts about theming were not found by the Google-indexed X search.

## Q5. What are vendors and builders changing in generators' default themes, and what is the next fingerprint ("second-order slop")?

### Takeaway
**What vendors changed.**
- Anthropic says its skill steers Claude away from "the Inter font and purple gradients".
- Impeccable now uses "anti-attractors", per-model rules and "129 hand-curated anchors".
- Google ships DESIGN.md with WCAG validation.
- shadcn/cli v4 adds "presets… better control over the defaults".
- Lovable users fix the look by uploading a design system.

**The new defaults.**
- Pioneer Paul Bakaus calls the result "2026 AI slop… in part introduced by anthrophic's frontend-design skill… (fraunces for editorial anyone? warm brown italics?)".
- He measured 74% cream backgrounds and 76% extreme letter-spacing, with 90%+ failing the contrast floor.
- Other observers name glassmorphism ("the new purple gradient"), serif-italic heroes (Instrument Serif, the "first clear casualty"), GPT-6's "tilted phone, sage green, poetic headlines", and the accent stripe moving to the top.

**The next fingerprint is less a palette than a supply chain.** The same component marketplaces (21st.dev, Aceternity, Magic UI, shadcnblocks), prompt galleries, and DESIGN.md clones of Linear, Stripe and Vercel feed every generator. Generators also keep regressing to defaults despite steering.

### Cited Findings

**A. Vendor and toolmaker steering statements**
- Anthropic, via @trq212 (2026-03-17; 7,025,574 V): the frontend skill was built "avoiding classic patterns like the Inter font and purple gradients" — [X](https://x.com/trq212/status/2033949937936085378) [SC-X]
- @pbakaus (2026-05-03; 340 L / 11 RT / 39 Rp / 10 Q / 51,785 V / 447 BM) — [X](https://x.com/pbakaus/status/2050766371081081133) [SC-X]
  - "this is 2026 AI slop. ironically, in part introduced by anthrophic's frontend-design skill, which replaced one set of model defaults...with another (fraunces for editorial anyone? warm brown italics?)"
  - "i've started experimenting with 'anti-attractors' for fonts/colors that attempt to branch out from the defaults (now part of impeccable)"
- @pbakaus (2026-05-29) — [X](https://x.com/pbakaus/status/2060208540992880794) [SC-X]
  - "So we started fixing slop systematically, specific to each model… The biggest jump is in GPT-5.5 and Codex."
  - "Greenfield, it seeds a fresh palette from 129 hand-curated anchors so every cold start doesn't drift to the same safe colors."
- Google Stitch (2026-04-21): DESIGN.md lets agents "validate their choices against WCAG accessibility rules" — [X](https://x.com/stitchbygoogle/status/2046624729403142320) [SC-X]
- @shadcn (2026-03-06; 6,718 L / 527 RT / 188 Rp / 103 Q / 556,649 V / 5,206 BM): "shadcn/cli v4… shadcn/skills, presets, dry-run, monorepo and more. If you're using shadcn/ui with coding agents or need better control over the defaults, this is for you." — [X](https://x.com/shadcn/status/2029974151427989567) [SC-X]
- Context, @rauchg (2025-10-09; 5,710 L / 351,209 V): "As of today, @shadcn is the most popular design system on @github ⭐, surpassing Material UI and Ant Design." — [X](https://x.com/rauchg/status/1976383911724044554) [SC-X]
- Lovable, user report r/lovable (2026-05-15; 7; 13 comments) — [Reddit](https://www.reddit.com/r/lovable/comments/1tdw9yc/how_i_fixed_the_aibuilt_this_look_on_my_lovable/) [SC-R]
  - "the landing page looks like AI built it, especially with the purple gradients… prompted Lovable to 'make it more premium,' 'less templated,'… Nothing landed. Lovable just kept producing variations of the same defaults… What worked: uploading a design system to Lovable."

**B. The new defaults named in 2026**
- Editorial serif and cream:
  - @pbakaus's "fraunces for editorial… warm brown italics" and "74%… cream".
  - @dickiebush: "Large serif headlines with a few words italicized (usually in an accent color)".
  - @yuwen_lu_: "a Serif hero section, almost as if it’s Claude’s perception of 'elegant' design".
  - @digitlartifacts: "Instrument serif might be the first clear casualty of AI accelerated design trend saturation and devaluation." — [X](https://x.com/digitlartifacts/status/2095820419085332617) [SC-X]
- Prompt marketplaces encode the cluster. @viktoroddy (2026-04-08) promotes a prompt bundle ("Access ALL prompts for stunning animated websites in one click"). Its sample "RECREATION PROMPT" specifies "a warm cream color palette" and "Instrument Serif (italic only) -- used for italic accent text in the About section" — [X](https://x.com/viktoroddy/status/2041919103489716728) [SC-X]
- Glass: "This, in my opinion, is becoming the new purple gradient" (@yuwen_lu_, 2026-04-06).
- GPT-6 Astra: "Tilted phone, sage green, poetic headlines" (@PrajwalTomar_, 2026-09-16) — [X](https://x.com/PrajwalTomar_/status/2100230252182360313) [SC-X]
- The accent stripe moving to the top: "side-of-card highlight (which is apparently migrating to the top now)" (r/ClaudeAI bot summary, 2026-06-18) [SC-R]
- An "editorial" escape that still reads as AI: r/lovable (2026-06-05): "I eventually pulled it back into more of a modern editorial direction… But now I’m wondering if I’ve just ended up with another AI-looking website, just slightly nicer." — [Reddit](https://www.reddit.com/r/lovable/comments/1txecyk/how_do_you_stop_aibuilt_websites_from_looking/) [SC-R]
- Terminal and TUI sameness: r/ClaudeAI (2026-09-04; 12): "Every landing page, app and TUI look the same." — [Reddit](https://www.reddit.com/r/ClaudeAI/comments/1w7j8e5/how_i_design_with_ai/) [SC-R]
- Neobrutalism recommended as the escape. @kloss_xyz's X Article "why you suck at vibe coding" (2026-02-01; 1,200 L / 1,017,301 V): "Neobrutalism - raw, bold, intentionally unpolished… Stands out because everything else looks the same." It also recommends "Icons: Lucide React" and calls shadcn "the dominant choice" — [X](https://x.com/kloss_xyz/status/2018097344345223455) [SC-X]

**C. Old defaults persist in some tools, contradicting a clean "purple is dead" story**
- @dickiebush (2026-09-16): a Claude-generated page with "The color purple / With a gradient to blue".
- r/lovable (2026-05-15): "purple gradients".
- r/webdev (2026-07-27): "blue purple gradient, rocket emojis" [SC-X/SC-R].
- Contrast with @yuwen_lu_ (2026-04-06): "Claude no longer generates purple gradients".

**D. Generators regress to defaults despite steering**
- r/ClaudeAI, "Few months of /frontend-design + ui-ux-pro-max-skill + custom system prompts. AI-generated landing pages still look generic." (2026-05-02; 24; 29 comments) — [Reddit](https://www.reddit.com/r/ClaudeAI/comments/1t24gan/few_months_of_frontenddesign_uiuxpromaxskill/) [SC-R]
  - "First output came back with a gradient mesh background, a glassmorphic card, three feature pills, and a CTA button with a glow… Aesthetically it was 2023 SaaS template #4. We iterated 18 times… By prompt 13… Claude reintroduced the glassmorphic card I'd killed in prompt 5."
- r/ClaudeAI (2026-05-13; 26 comments): "The more I try to work on it, the more 'AI style' it becomes… I bought an admin template I liked, uploaded it and asked it to literally use the file that I uploaded. It created an absolutely atrocious version of its own." — [Reddit](https://www.reddit.com/r/ClaudeAI/comments/1tbwnzx/how_to_make_claude_code_designs_not_look_ai/) [SC-R]
- r/vibecoding (2025-11-12; 98; 72 comments), five builders asked for a Windows 95 page: "Base44 - 1/10 - Text prompt only… delivers... nothing Windows 95. Modern site with gray cards." — [Reddit](https://www.reddit.com/r/vibecoding/comments/1ovgu5a/i_asked_5_ais_to_build_something_that_shouldnt/) [SC-R]
- u/kukiofficial, r/vibecoding (2026-06-06): "i had reference images for claude and stitch but they just didnt gaf about the images and did what they want" — [Reddit](https://www.reddit.com/r/vibecoding/comments/1tyr2mc/how_do_people_actually_vibe_code_good_looking/) [SC-R]

**E. The new supply chains of sameness**
- @himanshubuildss (2026-10-11; 889 L / 118 RT / 67,215 V / 1,817 BM): "Your AI isn't bad at design. It has just never seen good design." The list includes:
  - "600+ award-winning prompts"
  - "21st.dev - community component marketplace that plugs into agents via MCP"
  - "ui.aceternity.com"
  - "magicui.design"
  - "shadcnblocks.com - 2,000+ pre-built section blocks"
  - "designmd.ai - design systems as markdown your agent can read"
  - [X](https://x.com/himanshubuildss/status/2109130327277142377) [SC-X]
- r/ClaudeAI (2026-10-07): "Use prebuilt components from 21st.dev instead of letting Claude invent them… Defaults are why AI sites all look the same" — [Reddit](https://www.reddit.com/r/ClaudeAI/comments/1x0bhlb/fck_claude_design_heres_how_i_actually_got_good/) [SC-R]
- r/vibecoding (2026-09-18; 509; 161 comments): "UI: Untitled UI React. I don't want AI to come out with a whole design from scratch… use an actual component library." — [Reddit](https://www.reddit.com/r/vibecoding/comments/1wjydgz/i_vibecoded_for_2_years_heres_the_stack_i_use/) [SC-R]
- DESIGN.md clones of pioneers: @gregisenberg (516K V) and VoltAgent's 55 files (Q2-C).

**F. Claude Design: hype, then "better slop"**
- @Hesamation (2026-04-17; 8,600 L / 580 RT / 2,888,294 V): "watching Figma, a $10B UX design monopoly, melt down with a single Claude tweet." — [X](https://x.com/Hesamation/status/2045177065150841091) [SC-X]
- r/ClaudeAI "This cannot be real. I cannot believe my eyes" (2026-04-20; 1,732; 411 comments): "Absolutely cooked with Claude design!" — [Reddit](https://www.reddit.com/r/ClaudeAI/comments/1sqpb2f/this_cannot_be_real_i_cannot_believe_my_eyes/) [SC-R]
- @ifOnlyKantala (2026-10-01; 18 L): "Looks good, AI slop but better AI slop." — [X](https://x.com/ifOnlyKantala/status/2105657305194954953) [SC-X]
- @somewheresy (2026-10-17; 15 L): "Claude design has been CoT’ed out" — [X](https://x.com/somewheresy/status/2111461441392005416) [SC-X]
- r/ClaudeAI (2026-10-07): "My first website was built with Claude Design and zero direction, and it looked like every other AI site." — [Reddit](https://www.reddit.com/r/ClaudeAI/comments/1x0bhlb/fck_claude_design_heres_how_i_actually_got_good/) [SC-R]

**G. The pattern beyond web pages**
- @0xMovez's X Article on motion design (2026-09-27; 9,552 L / 969 RT / 3,661,286 V): "Most people who try motion design with Opus 5.5 end up with the same video: centered text on a gradient, everything fading in, a logo at the end." — [X](https://x.com/0xMovez/status/2104216919033192746) [SC-X]

**H. Rising quality, and so rising false-negative risk**
- r/web_design (2026-10-13; 62; 77 comments): "I am not talking about AI slop websites; I am talking about recent tools that produce sites looking as if they were created by designers like us, which only need minor modifications" — [Reddit](https://www.reddit.com/r/web_design/comments/1x4vnyz/is_refusing_to_use_ai_just_a_matter_of_ego_or_a/) [SC-R]
- Prevalence context: r/web_design (2026-04-27; 29) relayed a Stanford, Imperial and Internet Archive study estimating about 35% of new sites by mid-2025 were AI-generated or AI-assisted — [Reddit](https://www.reddit.com/r/web_design/comments/1sxcce8/researchers_working_with_data_from_the_internet/) [SC-R]; [Slashdot](https://tech.slashdot.org/story/26/04/27/2123224/study-finds-a-third-of-new-websites-are-ai-generated) [2nd]

### Inferences
**The next fingerprint, ranked by evidence**
1. **Editorial serif-italic accent with a warm cream or brown ground, extreme tracking and mono labels.** Evidence: Bakaus's measured 74% and 76%, plus @dickiebush, @yuwen_lu_ and @digitlartifacts. This confirms the prior notes' `hero_accent_word` and `editorial_broadsheet_kit` proposals, and adds tracking as a co-signal. Bakaus's 76% "extreme letter-spacing" supports raising the weight of the shipped `crushed_tracking` and `wide_body_tracking`.
2. **Glassmorphism plus a gradient ground plus a 1px light border, as a co-occurrence rule** (yuwen "mostly certain").
3. **GPT-6-era watchlist:** tilted device mockups, sage green, poetic headlines.
4. **The accent stripe moving from the left edge to the top**, and status dots or "live" badges.
5. **Component-marketplace sameness.** This is not catchable by style rules; it needs structural fingerprints of popular blocks (21st.dev, Aceternity, Magic UI, shadcnblocks), or the distributional "sameness" metrics of #198.

**Pioneer clones will grow.** Through DESIGN.md extraction ("Linear, Stripe, Vercel… extract the design language"), "Linear-style" pages will increasingly *be* AI output that looks like a pioneer. Style-only scoring then can't separate pioneer from clone. That argues for:
- provenance markers (prior notes)
- craft defects, which persist: 90%+ contrast failures, stuck content, overflow
- a DESIGN.md-conformance mode, the way Impeccable and Stitch frame it: "Font/Color/Radius outside DESIGN.md"

Under that framing, a site isn't "slop" for matching Linear. It is non-conformant if it ignores its own declared system.

**Roadmap deltas from this file**
- NEW: rows 2, 3, 5, 7, 8 and 18 of Q1-F, at low-to-moderate weight
- NEW: a separate `build_artifacts` signal for console emoji and exposed agent files
- AMEND `accent_stripe`: include top and bottom stripes
- AMEND `slop_fonts`: add Manrope, Playfair Display, Lora, DM Serif, JetBrains Mono and Fira Code, in co-occurrence only
- AMEND #197: re-scope toward "stuck content" and "status-dot pulse"
- AMEND #202: generalise to CTA grey microcopy and "trusted by N"; keep names fiction-only evidenced
- AMEND `purple_accent`: make it model- and tool-conditional rather than retired
- AEO: validated llms.txt; a no-JS reachability check; markdown-twin evidence fields; no traffic claims
- Credibility: a pioneer and template regression set; fix slop-detect.com's self-score and the lowercase evasion of the caps check

### Gaps
- No official Lovable, v0, Bolt or Cursor X post about changing *default* themes was found. The X search is Google-indexed, and the queries for "Lovable design systems" and "v0 design systems" returned only third-party posts. Lovable's design-systems rollout is evidenced only by user reports and a third-party page.
- Google Stitch's own default aesthetic, and whether DESIGN.md output converges, has no measurement beyond @bbssppllvv's one critique.
- No quantitative data exists on how quickly new defaults spread, apart from Bakaus's internal metrics, whose method is unpublished.
