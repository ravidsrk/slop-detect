# slop-detect — Strategic Roadmap

> Where this open-source project goes next, and why.
> Last updated: 2026-05-28 · Current version: v0.1.2

This roadmap is grounded in a mid-2026 landscape scan of the AI-design-slop space
and a study of how shareable dev-tool OSS projects grow and sustain themselves.
It is opinionated on purpose. See [Appendix: Research basis](#appendix-research-basis).

> **Now reading this differently.** The flywheel below is built and shipping —
> but it was sequenced before we confirmed a buyer. The immediate priority is no
> longer "build the next phase"; it's a time-boxed experiment to find who pays.
> See **[VALIDATION.md](VALIDATION.md)** — a 30-day buyer-validation plan with a
> pre-committed go / no-go gate (decision date 2026-07-05). This roadmap resumes
> once the market has picked the lane.

---

## 1. The thesis

slop-detect today is a **detector**: it scores a landing page against a fixed
16-rule fingerprint. That is a good wedge, but the research is unambiguous about
two pressures:

1. **A static fingerprint is a depreciating asset.** The patterns Adrian Krebs
   catalogued are early-2026 artifacts. As guardrails spread (Google's
   `DESIGN.md` standard, anti-slop skills like Hallmark, design-system features
   in v0/Lovable/Bolt) and as the aesthetic mean moves (bento grids, aurora
   gradients, generative UI), **the defaults shift every few months**. A fixed
   16-rule list will decay.

2. **Detection-only is commoditizing.** There are now ~20+ named slop tools.
   The commercial leader (Sailop) productized *prevention + remediation +
   templates*. Pure detectors risk becoming free utilities.

So the strategy is a deliberate two-part position:

> **Be the neutral, open measurement standard for design slop — the
> "Lighthouse for design taste" — and make the score travel.**
>
> Win on (a) a **continuously-updated, versioned, community-sourced ruleset**
> ("slop definitions", like virus definitions) so currency is the moat, and
> (b) **distribution surfaces** (shareable score cards, embeddable badges, a
> GitHub Action / PR check, an MCP server) so the score embeds itself into
> developer workflow and social feeds.

Everything below serves that thesis.

---

## 2. North-star metrics

| Metric | Why it matters |
|---|---|
| **Scans / week** (web + API + CLI + action) | Core usage; top of every funnel |
| **Badges embedded in the wild** | Self-replicating backlink loop |
| **Score cards shared** (OG image views) | Viral coefficient |
| **Community rules merged** | Ruleset currency = the moat |
| **Repos running `slop-detect-action`** | Workflow stickiness |
| **GitHub stars / npm weekly downloads** | Credibility + discovery |

We are NOT optimizing for revenue in the near term. Revenue is a Phase 4
question and is deliberately structured to never compromise the OSS core.

---

## 3. Phased plan

### Phase 1 — Make the score travel (distribution primitives)

*Theme: every scan should produce something shareable and embeddable.
These are the highest-leverage, lowest-cost moves in the whole roadmap.*

- **P1.1 — Shareable score card + OG image** (`#01`)
  Persist each scan to a short URL (`slop-detect.com/r/<id>`) that renders an
  auto-generated OG image: big letter grade + score + a punchy one-liner verdict.
  This is the #1 viral primitive every grader tool relies on.
- **P1.2 — Embeddable badge** (`#02`)
  `slop-detect.com/badge/<domain>.svg` returning a live "slop: A · 6/100" badge,
  plus copy-paste HTML/Markdown/React snippets. Submit as a first-party
  shields.io service badge for discovery.
- **P1.3 — Letter grades + tier polish** (`#03`)
  Add an A–F letter grade layer on top of the 0–100 score (graders that spread
  all use a memorable letter). Keep numeric score as source of truth.

### Phase 2 — Embed into the workflow (CI + agents)

*Theme: move from one-off scans to recurring, in-workflow checks.*

- **P2.1 — `slop-detect-action` GitHub Action** (`#04`)
  Marketplace-listed action: scan deploy-preview URLs, post a **sticky PR
  comment** with score + diff vs. baseline, set a **status check** with a
  configurable `fail-under` threshold. Optionally update the README badge.
- **P2.2 — Public REST API with rate-limited tiers** (`#05`)
  Formalize `/api/scan` + `/api/fix-prompt` as a documented public API with
  per-key rate limits. Free tier generous; keys for bulk/embedded use.
- **P2.3 — MCP server** (`#06`)
  Ship `slop-detect-mcp` so Cursor / Claude Code / Windsurf agents can
  self-audit a page before shipping. Complements the existing agent skill.

### Phase 3 — Keep the ruleset current (the moat)

*Theme: turn a fixed fingerprint into a living, versioned, community standard.*

- **P3.1 — Versioned "slop definitions"** (`#07`)
  Version and date the ruleset (e.g. `definitions@2026.06`). Surface which
  definition version produced a score. Establish a changelog for pattern changes.
- **P3.2 — Declarative rule format + contribution flow** (`#08`)
  Define a declarative rule schema (the eslint/semgrep playbook) so contributing
  a 17th/18th pattern is low-friction. Web + PR contribution paths, attribution,
  named presets (`strict`, `marketing`, `minimal`).
- **P3.3 — New-pattern tracking** (`#09`)
  Add emerging 2026 patterns (bento-grid walls, aurora/mesh gradients,
  generative-UI tells) and retire/down-weight decayed ones. This is recurring
  maintenance, not a one-off.
- **P3.4 — AI-builder provenance signal** (`#10`)
  Optional companion signal: "likely built with v0 / Lovable / Bolt / Framer".
  Owns an SEO-rich keyword space and pairs uniquely with the genericness score
  ("built with Lovable AND scores 78/100").

### Phase 4 — Expand the surface & sustain (franchise + funding)

*Theme: grow beyond visual design and fund the OSS core — without betraying it.*

- **P4.1 — Multi-axis slop score (design + copy + code)** (`#11`)
  Add deterministic **copy-slop** (em-dash overload, "delve", "in today's
  fast-paced world", rule-of-three, "unlock/elevate/seamless") and a **code-slop**
  hook. One page → three sub-scores → one unified slop score. Reuses the existing
  scoring architecture.
- **P4.2 — Data-journalism leaderboard** (`#12`)
  Periodically scan a famous corpus ("Top 500 YC / SaaS landing pages ranked by
  AI slop"), publish a public leaderboard + "Hall of Clean / Hall of Slop". Pure
  linkbait that rides the "slop is Word of the Year" zeitgeist.
- **P4.3 — `DESIGN.md` compliance mode** (`#13`)
  As Google's `DESIGN.md` standard spreads, audit "does this page honor its
  declared design system, or regress to defaults?" Aligns us with the standard
  rather than against it.
- **P4.4 — Sustainability: Pro tier + sponsors** (`#14`)
  Keep the engine MIT and offline-capable forever. Monetize **continuity,
  collaboration, scale, and compliance** only: historical tracking + regression
  alerts (Pro ~$9–19/mo), team dashboards (~$49–99/mo), white-label agency PDF
  reports, and GitHub Sponsors / Open Collective for goodwill.

---

## 4. Prioritization (leverage vs. effort)

| Move | Leverage | Effort | When |
|---|---|---|---|
| P1.1 Score card + OG image | 🔴 High | Low | **Now** |
| P1.2 Embeddable badge | 🔴 High | Low | **Now** |
| P1.3 Letter grades | 🟡 Med | Low | **Now** |
| P2.1 GitHub Action | 🔴 High | Med | Next |
| P3.2 Declarative rules + contribution | 🔴 High | Med | Next |
| P2.3 MCP server | 🟡 Med | Low | Next |
| P3.1 Versioned definitions | 🟡 Med | Low | Next |
| P2.2 Public API tiers | 🟡 Med | Med | Later |
| P3.3 New-pattern tracking | 🟡 Med | Recurring | Ongoing |
| P3.4 Provenance signal | 🟡 Med | Med | Later |
| P4.1 Multi-axis slop | 🟢 Strategic | High | Later |
| P4.2 Data-journalism leaderboard | 🔴 High | Med | Opportunistic |
| P4.3 DESIGN.md mode | 🟢 Strategic | Med | Later |
| P4.4 Pro tier / sponsors | 🟢 Strategic | Med | Phase 4 |

**Recommended next sprint:** P1.1 + P1.2 + P1.3 (the distribution primitives) —
they compound, they're cheap, and they make every existing scan more valuable.

---

## 5. Guardrails (what we will NOT do)

- We will **not** feature-gate the detection engine. `slop-detect-core` and the
  CLI stay MIT, free, and offline-capable forever. Trust is the asset.
- We will **not** position a slop score as a verdict on a person or company. It
  is one signal among many ("everyone uses AI now" is a strong, correct
  counter-narrative — overclaiming gets us dunked on).
- We will **not** let the ruleset go stale. A decayed fingerprint is worse than
  no fingerprint. Currency > cleverness.
- We will **not** become a fixer-template store (that lane is taken). We are the
  neutral, open *measurement* standard.

---

## Appendix: Research basis

This roadmap synthesizes two research streams (May 2026):

**Landscape** — "AI slop" is mainstream (Merriam-Webster 2025 Word of the Year;
the "Slop Rebellion"). Adrian Krebs's ~1,400-page Playwright study (67% carry AI
fingerprints) is the defining artifact and our methodological baseline. Sailop is
the commercial leader (298-rule engine, rule-injection CLI, paid templates, MCP).
Provenance detectors (aiwebsitedetector.com et al.) own a separate SEO space.
Google's `DESIGN.md` (open-sourced Apr 2026, 14K★) plus anti-slop skills will
reduce raw slop over time — making *currency* the moat. "Slop" is generalizing
into a 3-axis franchise: design / copy / code.

**Growth** — Every viral grader (HubSpot Website Grader, securityheaders.com,
Mozilla Observatory, Lighthouse, websitecarbon.com) wins on the same loop:
*free instant value → a memorable grade → a shareable/embeddable artifact →
a leaderboard/shame dynamic*. Badges (shields.io) and CI integration
(Lighthouse CI) are the two proven distribution flywheels. Monetization that
respects OSS (Snyk/Sentry/semgrep model): keep the engine free, charge for
continuity, collaboration, scale, and compliance.
