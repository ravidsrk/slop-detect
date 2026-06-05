# slop-detect — 30-Day Buyer Validation Plan

> How we turn "this worked really well" into "this is a real product."
> Companion to [ROADMAP.md](ROADMAP.md). Where ROADMAP answers *what to build*,
> this answers the question we skipped: **who pays, why, and how we'll know.**
> Created: 2026-06-05 · Decision date: **2026-07-05**

---

## 0. Why this document exists

slop-detect passed the four tests most projects fail:

- **Detection is accurate** — scores match a designer's gut.
- **People shared it** — the viral loop fired without paid distribution.
- **It's useful to its own author** — real internal utility, not just a demo.
- **It came together** — the whole flywheel (CLI · web · core · MCP · Action ·
  skill · badges · OG cards) is built and shipping.

That is a rare four-for-four. The one thing missing is the only thing that makes
it a *product* instead of an excellent utility: **a buyer.** We have not yet
found the person who will pay, and we cannot reason our way to them. We have to
instrument the market and watch who raises a hand.

This plan is a **time-boxed experiment**, not a feature roadmap. It ends on a
**go / no-go decision date** with a pre-committed bar. "Could go serious" only
means something if there's a gate to walk through.

---

## 1. The honest diagnosis

The ROADMAP is excellent on OSS-growth mechanics and explicitly correct that
*"detection-only is commoditizing… pure detectors risk becoming free utilities."*
Then it spends ~90% of its energy making the free utility more viral and files
"who pays" into a single hedged bullet (P4.4) under *"we are NOT optimizing for
revenue."*

We built the entire flywheel **before** confirming anyone is standing where it
spins. The sequencing was backwards. The fix is not more detector features — the
detector is done enough. **Freeze it.** The next unit of work is a *demand
instrument*: something cheap that forces the market to reveal the buyer.

There's a tell already in the codebase: `packages/web/src` ships `free` / `pro`
/ `unlimited` API tiers wired into KV — we **built the meter** — while
`public/pricing.md` publicly promises *"no paid tiers, no seats, ever."* We
installed the cash register and then bolted the drawer shut. This plan decides
whether to open it.

---

## 2. The three buyer hypotheses

"Real product" is not one company — it's three, and the next 30 days look
completely different depending on which is true. We will not pick by intuition.
We will run **one instrument that tests all three at once** and let the market
pick.

### H1 — Sell to the tools *making* the slop (B2B, highest ceiling)
**Buyer:** v0 / Lovable / Bolt / Framer / Replit. **Pain:** their output all
looks identical; "everything looks AI-generated" is a churn and differentiation
risk *for them*. **Product:** a de-slop quality gate embedded in their
generation loop (our `core` + MCP are 80% of this already). **Evidence we're
right:** one builder takes a call after seeing themselves ranked publicly.
**Risk:** few buyers, long enterprise cycle, hard for a small team to source
without a warm opener — which the leaderboard manufactures.

### H2 — Sell *continuous prevention* to teams (self-serve SaaS, most testable)
**Buyer:** a growth / marketing lead at a Series A–B startup whose non-designers
(and agents) keep shipping to the marketing site. **Pain:** the site silently
regresses to slop between redesigns; nobody owns "does our site still look like
us." **Product:** monitored domains — pay to *remember and watch* a domain, with
"your score dropped from A to C this week" alerts. **Evidence we're right:**
N people put a work email on a watch list and/or pay. **Why this is the lead
horse:** the infra (scan + KV + badge + API tiers) is already 80% there, and it's
the cheapest willingness-to-pay test we can run.

### H3 — It's brilliant top-of-funnel, not the product (lead-gen)
**Buyer:** nobody pays for the tool; it feeds something else — a design
consultancy, a paid de-slop service, an audience/newsletter, or our own
reputation. **Evidence we're right:** the report spreads and converts attention,
but neither H1 nor H2 produces willingness to pay. **This is a legitimate
outcome** — chosen on purpose, not by default.

---

## 3. The instrument: the leaderboard, weaponized

ROADMAP files the leaderboard (P4.2) under *"opportunistic linkbait."* It is not
linkbait — it is the **single experiment that tests all three hypotheses at
once.**

**Ship: "The State of AI Design Slop — Mid 2026."** Scan ~300–500 of the top
YC / Product Hunt / SaaS landing pages, rank them by unified slop score, and —
where the provenance signal can tell — **name the builder** (v0 / Lovable /
Bolt / Framer). Publish a public, shareable report with a Hall of Clean and a
Hall of Slop. Then instrument it:

| Hook on the report | Tests | What a "yes" looks like |
|---|---|---|
| **"Claim & monitor your domain"** email capture | **H2** | Work emails on a watch list = your paying buyer, self-identified |
| **Naming v0 / Lovable / Bolt in the rankings** + a quiet "talk to us about your output quality" line | **H1** | A builder replies / takes a call — your warm opener, manufactured |
| **The report itself spreading** (OG cards, "scan your own site" CTA) | **H3** | Attention converts, but neither H1 nor H2 fires |

One artifact, three signals. Whoever leans in hardest **is the answer.** That is
how we convert "I genuinely don't know" into "the market told me."

---

## 4. The willingness-to-pay test: monitored domains

The cheapest possible test of H2, and we already have the infra:

- **Free** = scan once (today's behavior, unchanged — the MIT engine stays free
  forever per the ROADMAP guardrail).
- **Paid** = *remember and watch.* Track a domain over time, store the history,
  and alert on regression ("slop-detect: yourdomain.com dropped A → C, pattern
  `cream-bg` newly triggered").

This reuses scan + KV (already storing results & badges) + the existing `pro`
tier scaffolding. It is **days, not weeks.** Price it as a stake-in-the-ground
test, not a finished plan: **$12/mo per domain** (or $9/mo annual). The number
is a probe — the goal is to learn whether *anyone* pulls out a card, not to
optimize ARPU.

Critically, this does **not** violate the ROADMAP guardrail ("never feature-gate
the detection engine"). We are not charging for detection. We are charging for
**continuity** — exactly the axis the ROADMAP already named as the only
legitimate thing to monetize (the Snyk / Sentry / semgrep model).

`pricing.md` will need to change from "free, no tiers, ever" to "the **engine**
is free forever; **monitoring & history** is the paid layer." That edit is itself
part of the experiment.

---

## 5. The 30-day plan (week by week)

**Week 1 — Freeze & listen.**
- [ ] Freeze the detector. No new patterns, no new axes this month.
- [ ] **Talk to 8–10 people who shared it** — especially anyone who ran it on a
  *work* site. One question: *"Would you pay to keep a domain clean over time,
  and what would make that worth $X/mo?"* Their answers beat any roadmap.
- [ ] Pick the corpus for the leaderboard (YC W/S 2025–26 + Product Hunt
  top-of-week + a SaaS list). Lock the scan methodology + definitions version so
  the report is defensible and reproducible.

**Week 2 — Build the instrument.**
- [ ] Batch-scan the corpus (CLI already does batch; `--axes all` for the unified
  score). Store results.
- [ ] Build the report page: ranked table, Hall of Clean / Hall of Slop,
  builder-attribution column, methodology footnote, per-row "scan your own site"
  + OG share cards.
- [ ] Wire the two conversion hooks: **monitor-my-domain** email capture and the
  quiet **"talk to us"** line aimed at builders.

**Week 3 — Ship the WTP test + publish.**
- [ ] Ship **monitored domains** (free = scan once; paid = remember + alert).
  Update `pricing.md` to the "engine free / continuity paid" framing.
- [ ] Publish the report. Distribute where it already worked (the channels that
  drove the original sharing) + Show HN + the builders' own communities.
- [ ] Instrument everything: report views, share-card impressions, email
  captures, paid conversions, builder replies.

**Week 4 — Read the signal & decide.**
- [ ] Tally the gate (§6) against real numbers, not vibes.
- [ ] Do the 8–10 follow-up conversations with everyone who raised a hand.
- [ ] **Write the go / no-go decision on 2026-07-05.**

---

## 6. The decision gate (pre-committed, 2026-07-05)

We decide *before* we see the data so we can't move the goalposts. By the
decision date:

| Signal | Bar | Reads as |
|---|---|---|
| **H2 — paying buyer** | **≥ 5 paid monitored domains** *or* **≥ 50 work-email watch-list signups** | Go deep on self-serve SaaS. Build out monitoring, history, team dashboards. |
| **H1 — builder pull** | **≥ 1 AI-builder takes a real call** off the leaderboard | Pursue the B2B embed in parallel; it's the higher-ceiling company. |
| **H3 — attention only** | Report spreads (≥ prior viral peak) but **neither H1 nor H2 clears** | It's top-of-funnel. Deliberately point it at a consultancy / audience / adjacent paid product. |
| **None of the above** | No paid, no builder, no spread | The honest answer is "great portfolio piece." Stop investing; let it run as a calling card. |

**"Could go serious" cashes out here.** If H1 or H2 clears, the next 90 days are
a real build. If only H3, we choose the lane on purpose. If none, we stop with a
clear conscience and a hell of a portfolio piece — also a fine outcome.

---

## 7. What this plan deliberately does NOT do

- It does **not** add detector features. The engine is frozen for the month.
- It does **not** feature-gate detection. The MIT core / CLI stays free and
  offline-capable forever. We charge for *continuity*, never for *detection*.
- It does **not** position a slop score as a verdict on a person or company —
  "everyone uses AI now" stays the honest counter-narrative.
- It does **not** commit to a destination before the market reveals the buyer.
  The instrument picks; we don't.

---

## 8. The one-line version

> Stop building. Ship one weaponized leaderboard with a monitor-my-domain
> register attached, watch who pulls out a card or picks up the phone, and let
> that — not intuition — pick the company. Decide on 2026-07-05.
