# slop-detect — Strategic Roadmap v2

> Where this project goes next, and why.
> Last updated: 2026-06-05 · Current version: v0.6.0
> Supersedes the v1 roadmap (preserved in git history). Grounded in the
> June 2026 deep-research pass — see "Research basis" at the bottom — and in
> our own calibration evidence (`CALIBRATION.md`).

---

## 1. The thesis (revised)

**Slop is the hook, not the product.**

Three research findings force the revision:

1. **The fixed visual fingerprint decays in ~6–18 months.** Signature-style
   detectors reliably degrade (antivirus, AI-text detectors), and the
   generators are being actively engineered to suppress the default look:
   Google's **DESIGN.md** standard (Apache-2.0, ~15k★, ships `lint`/`export`
   tooling) injects per-brand constraints into AI builders and agents — the
   design-world equivalent of malware polymorphism. The thing we detect is
   being standardized away.

2. **Absolute slop-grading is commoditized.** Impeccable (~34.7k★, free, OSS)
   owns the "most patterns" game; Sailop, aiwebsitedetector et al. fill the
   rest, all enumerating the same tells. A rule list is copyable in an
   afternoon. Meanwhile "slop" the meme peaked (2025 Word of the Year) — the
   attention is a **depreciating asset to harvest, not a moat to defend**.

3. **Our own evidence shows the fatal failure mode.** The detector scores
   Linear/Vercel as Heavy and Stripe as Mild — punishing a *style* as
   *provenance*, the exact false-positive trap that killed OpenAI's own AI-text
   classifier and discredited the text-detector industry (Stanford/Cell). An
   absolute "is this AI?" verdict cannot be made reliable; a **relative**
   question can.

So the strategy inverts:

> **Free, loud slop grader = acquisition channel (now, while attention peaks).**
> **Paid product = continuous design-system / brand-drift monitoring —
> "your non-designers and coding agents keep shipping to your site; we keep it
> on-brand and on-system" — sold to agencies and teams as recurring continuity.**
> **Technical posture: ride DESIGN.md, don't fight it.** Compliance with a
> site's *own declared system* is a relative signal that cannot decay and
> structurally cannot false-positive on great custom design.

---

## 2. The product ladder

```
acquire (free, peak-hype)          retain (paid, durable)
┌──────────────────────────┐       ┌──────────────────────────────────┐
│ slop grader (web/CLI/MCP)│  ───► │ monitored domains (built, v0.6)  │
│ leaderboard + directory  │       │ + design-system drift (NEW axis) │
│ badges + share cards     │       │ + agency multi-site dashboards   │
│ AEO axis (free funnel)   │       │ + white-label PDF reports        │
└──────────────────────────┘       │ + CI gate on system compliance   │
                                   └──────────────────────────────────┘
```

The continuity layer (watch/alerts/directory) shipped in v0.6.0. The missing
piece — and **the first deliverable of this roadmap** — is the relative axis
that makes monitoring worth paying for:

### P1 — The `system` axis: DESIGN.md compliance (NOW)

"Does this page honor its declared design system?" Parse a site's `DESIGN.md`
(Google Labs spec: YAML front-matter tokens — colors, typography, rounded,
spacing, components), compare against what the scanned page actually renders
(fonts in use, CTA/surface colors, radii), and report **drift** as named,
contestable signals. Ships in core (pure, zero-dep), CLI (`--design-md`), and
the web API. This:
- **fixes the Linear/Stripe false-positive class structurally** — a bespoke
  site checked against its own tokens scores *aligned*, not "slop";
- **cannot decay** — the reference point is per-customer, not a global fashion;
- **aligns us with the standard that would otherwise obsolete us**.

### P2 — Sell continuity to agencies (NEXT, 1–2 quarters)

The research is unambiguous about the indie buyer: **digital agencies** pay
recurring for white-label reports, scheduled multi-site audits, and drift
alerts ($29–$149/mo band; flat-rate beats per-site at 10–20 client sites).
Build: multi-domain dashboard, branded PDF export, drift-alert emails (the
pipeline shipped in v0.6), CI gate on `system` compliance. Open-core stays MIT
(Plausible/Sentry/Semgrep model); charge for continuity, collaboration, scale.
Realistic target: **$1–10K MRR within 12–18 months**, plus $800–4K/mo
well-structured GitHub Sponsors.

### P3 — Versioned community ruleset ("slop definitions") (ONGOING)

Keep the free fingerprint current on the **Semgrep registry model**:
community-contributed, versioned, months-cadence refresh; favor structural
tells (badge-above-H1, stripe borders) that outlast color fashion; track
DESIGN.md/builder updates as the leading decay indicator. Calibration
(`CALIBRATION.md`, labeled corpus, honest precision/recall) is **strategic**,
not housekeeping: signals-not-verdicts is the credibility model.

### P4 — Agent-loop depth (ONGOING)

The MCP server's job shifts from "scan after the fact" to "**the design-system
check inside the coding-agent loop** before it ships" — consuming the repo's
DESIGN.md. Workflow lock-in is the only durable distribution.

---

## 3. What we will NOT do (research-backed guardrails)

- **No ML/vision/LLM-judge as the core engine.** Per-call cost, OOD collapse
  (18–30% on current generators), and the false-positive credibility crisis.
  At most: an opt-in *pairwise* LLM critique layer; never the scoring authority.
- **No head-on AEO/citation-tracking business.** The monetizable core is owned
  by funded startups (Profound ~$1B) and Semrush/Ahrefs; our crawlability/
  llms.txt axis is the commoditized free slice — keep it as funnel only.
- **No "% AI" verdicts, ever.** Named rules, contestable signals, page-not-person.
- **No one-time licenses.** (Tailwind UI's collapse is the cautionary tale.)
  Recurring only.
- **No rule-count arms race with Impeccable.** Differentiate on continuity +
  compliance + workflow, not pattern count.
- **Engine stays MIT, free, offline-capable. Forever.** (Unchanged from v1.)

---

## 4. North-star metrics (revised)

| Metric | Why |
|---|---|
| Monitored domains (free → paid) | The business |
| Agencies on multi-site plans | The buyer the research says converts |
| Pages checked against a DESIGN.md | Adoption of the durable axis |
| Definitions version freshness / community rules merged | Anti-decay |
| Scans/week + leaderboard/directory traffic | Top of funnel (harvest the hype) |

---

## 5. Sequencing

| Move | Status |
|---|---|
| P1 `system` axis (core + CLI + API) | **In progress (this release)** |
| P2a Drift alerts on `system` axis via existing sweep | After P1 |
| P2b Agency dashboard + white-label PDF | Next quarter |
| P2c Pricing live ($29–$149/mo) | With P2b |
| P3 Community ruleset + calibration corpus growth | Ongoing |
| P4 MCP design-system mode | After P1 |

---

## Research basis (June 2026)

Deep-research pass across market, shelf-life, AEO, monetization, and technical
frontier. Key citations: DESIGN.md spec + adoption (github.com/google-labs-code/design.md);
Impeccable (impeccable.style); fingerprint-decay precedents (arXiv 2603.23146,
SentinelOne signature-vs-behavioral); false-positive precedent (Stanford/Cell
Liang & Zou; OpenAI classifier shutdown); MLLM-as-UI-judge limits (arXiv
2510.08783); AEO incumbency (Fortune: Profound $96M Series C; Semrush/Ahrefs AI
visibility); indie monetization (Plausible $1M-ARR write-up; Semgrep registry;
agency audit-tool pricing; Tailwind UI decline, devclass Jan 2026).
