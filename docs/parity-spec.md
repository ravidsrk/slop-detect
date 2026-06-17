# slop-detect parity map and build spec (new editorial-instrument landing)

This document cross-maps the new design (`docs/design-extract.md`, the visual and
UX source of truth) against the existing product (`docs/old-product-inventory.md`,
the regression floor) and turns the result into an ordered, reviewable build plan.
It is FROZEN after merge: every downstream build task conforms to it, and reviewers
grade against it.

Read both source docs first. This spec does not restate them; it maps between them
and assigns work. Where this spec cites a design section it names the `##` heading
in `design-extract.md` (for example "Color tokens", "Components > Scan input").
Where it cites the floor it uses the MUST-NOT-REGRESS number (MNR-1 .. MNR-28) or a
route from the inventory route map.

Hard constraints carried into every acceptance criterion below:

- Reuse the engine (`@slop-detect/core`), the RESULTS KV data model, and the API
  contracts unchanged. This is a UX re-skin, not a rewrite.
- Dogfood guardrail: every served surface must PASS slop-detect's own detector.
  Design axis Clean, copy axis 0, no generic AI design tells. See `design-extract.md`
  > "Why this design passes its own detector". This is a graded acceptance point on
  every screen, not a nice-to-have.
- Do not name any reference competitor anywhere in code, copy, or assets.
- Mobile-first and responsive, plus a11y basics (focus-visible, contrast, reduced
  motion, semantic landmarks), are required on every surface. The export ships no
  `@media` queries and bare `outline:none`; closing that is in-scope GAP-FILL work.

## Treatment legend

Each old-product capability is assigned exactly one treatment. REDESIGN, GAP-FILL,
and NEW are the three required classes. PRESERVE is added for the non-visual data,
API, agent, and SEO surfaces that carry no theme: they are reused unchanged (or get
content/version edits only), so nothing in the floor is left unmapped.

| Code     | Meaning                                                                                          |
|----------|------------------------------------------------------------------------------------------------|
| REDESIGN | The design explicitly covers this surface. Rebuild it in the new language per cited sections.   |
| GAP-FILL | The old product ships it, the design is silent. Design-and-build it in the new language, full depth, and flag the chosen values as additions. |
| NEW      | The design introduces it, the old product lacks it. Build it fresh.                              |
| PRESERVE | Non-visual capability (data, API, agent, SEO, content). Reuse unchanged; edit content/version only. Still graded against its MNR obligation. |

## Part A: Parity matrix (old product to new design)

Every screen, route, flow, feature, and state in the floor, mapped to a treatment
and the build task that delivers it. No old-product capability is left unmapped.

### A1. Routes and rendered screens

| Old route / surface                          | Current behavior (floor)                                                            | Treatment | Design coverage                                                      | Build task           |
|----------------------------------------------|------------------------------------------------------------------------------------|-----------|---------------------------------------------------------------------|----------------------|
| `/` (index.html + index.ts)                  | Static dark hub, inline scan JS, agent-JSON negotiation, JSON-LD graph              | REDESIGN + PRESERVE | design "Screen inventory > 1. Landing"; agent JSON is data         | 02-home-landing      |
| `/index.md`                                  | Markdown twin of homepage                                                           | PRESERVE  | none (content twin; copy axis 0 applies)                              | 02-home-landing      |
| `/score/:domain`                             | Canonical per-domain hub (the spine)                                                | REDESIGN  | design "Screen inventory > 2. Result"                                | 03-score-hub         |
| `/r/:id`                                      | Shareable scan permalink, OG unfurl, radial-gradient card                           | REDESIGN + GAP-FILL | design folds into "2. Result"; expired state + canonical are gaps   | 04-result-permalink  |
| `/report/:domain`                            | Printable client report (noindex, print stylesheet)                                | REDESIGN + GAP-FILL | design folds into "2. Result"; print stylesheet design is a gap     | 05-printable-report  |
| `/leaderboard`                               | "State of AI Design Slop", generate-then-serve dataset                             | REDESIGN  | design "Screen inventory > 3. Leaderboard" (minus directory section) | 06-leaderboard       |
| `/directory`                                 | Opt-in catalogue, dofollow backlinks, ItemList JSON-LD, sort modes                  | REDESIGN  | design "3. Leaderboard > 6. Directory (opt-in only)", as a full page | 07-directory         |
| `/dashboard`                                 | Agency multi-domain view, magic-link session                                        | GAP-FILL  | design silent; re-skin in new language                                | 08-dashboard         |
| `/blog`, `/blog/:slug`, `/blog/:slug.md`     | Blog index, post HTML, raw Markdown twin                                            | GAP-FILL  | design silent; re-skin (article-card vocabulary exists)               | 09-blog              |
| `/docs` or `/methodology`                    | DOES NOT EXIST as a route today                                                     | NEW       | design "Screen inventory > 4. Docs"                                   | 10-docs-methodology  |
| `/brand`                                      | DOES NOT EXIST as a route today                                                     | NEW       | design "Screen inventory > 5. Brand" (the dogfood proof page)         | 11-brand-page        |
| `/badge/:domain.svg`                         | Self-rendered shields-style SVG badge                                               | REDESIGN  | design "Components > Live badge" + "Tier..logic > Badge colors"       | 12-badge-generator   |
| `/og/:id.png`                                | 1200x630 share card, radial-gradient background, static fallback                   | REDESIGN  | design silent on layout but "How tokens land" mandates re-theme       | 13-og-card           |
| `/compare`, `/compare/index.md`              | Static positioning / methodology page + twin                                       | GAP-FILL  | design silent; re-skin or fold toward /docs                           | 15-aux-rendered-pages|
| `/api/watch/confirm`                         | Renders an HTML "you're all set" confirmation page                                  | GAP-FILL  | design "Motion > confirmation micro-states"; full page is a gap       | 15-aux-rendered-pages|
| `/landing/*`                                 | 301 to `/` (retired light page + Hanken/Martian woff2)                              | PRESERVE  | keep redirect; drop retired page + its font binaries                  | 02-home-landing      |
| `favicon.svg` / `favicon.png` / `favicon-512.png` | Old dark scan-line mark                                                        | REDESIGN  | design "Logo lockup" + "Asset manifest"                               | 14-favicon-assets    |
| `og.png` (default) / `landing/og.*`          | Old-theme OG image                                                                  | REDESIGN  | design "How tokens land" (re-theme)                                   | 13-og-card           |

### A2. API and middleware (engine seam, reused unchanged)

All of these are PRESERVE: the rebuild reuses them as-is. They carry MNR obligations
but no visual theme. The only optional work is closing the test gap on the scan
contract (see optional task 17).

| Route / module          | Behavior (floor)                                                            | Treatment | MNR refs        |
|-------------------------|----------------------------------------------------------------------------|-----------|-----------------|
| `POST /api/scan`        | Headless scan, scoring, persistence, watch baseline                        | PRESERVE  | MNR-1..6, 28    |
| `POST /api/aeo`         | Fetch-based AEO axis, SSRF-guarded                                          | PRESERVE  | MNR-5, 23, 25   |
| `POST /api/fix-prompt`  | Fix prompt from result or URL (two modes)                                  | PRESERVE  | MNR-10          |
| `GET /api/patterns`     | Live pattern catalogue (count never hardcoded)                             | PRESERVE  | MNR-23          |
| `GET /api/stats`        | Aggregate score distribution                                               | PRESERVE  | MNR-21          |
| `GET /api/sites`        | Directory JSON mirror, sort + pending                                       | PRESERVE  | MNR-19          |
| `POST/GET /api/watch`   | Subscribe/unsubscribe/status, additive flags, claim ownership              | PRESERVE  | MNR-13, 14      |
| `POST /api/dashboard/link` | Magic-link request, anti-enumeration                                    | PRESERVE  | MNR-17          |
| `POST /api/cron/sweep`  | External-scheduler sweep, regression + drift alerts                        | PRESERVE  | MNR-15          |
| `/api/*` middleware     | CORS, rate limit, Turnstile, cost guard, kill switch                       | PRESERVE  | MNR-25          |

### A3. Agent, SEO, and discovery surface (content, reused unchanged)

PRESERVE. Re-themed only where they emit HTML; otherwise content/version edits only.
Version-drift and sitemap/canonical gaps are closed in task 16.

| Surface                                                                  | Treatment | Note                                                  | Build task            |
|--------------------------------------------------------------------------|-----------|------------------------------------------------------|-----------------------|
| `/?mode=agent` agent JSON view (index.ts agentView)                       | PRESERVE  | keep negotiation + capabilities; version from one source | 02-home-landing / 16 |
| `.well-known/*` (agent.json, agent-card.json, agent-skills, mcp, oauth)   | PRESERVE  | keep tool list (incl. check_design_system); version  | 16-seo-version        |
| `llms.txt`, `llms-full.txt`, `api/llms.txt`, `developers/llms.txt`        | PRESERVE  | agent docs; copy axis 0                                | 16-seo-version        |
| `api/patterns.md`                                                         | PRESERVE  | defs-version label must track DEFINITIONS_VERSION     | 16-seo-version        |
| `openapi.json`                                                            | PRESERVE  | version single-source                                 | 16-seo-version        |
| `robots.txt`, `sitemap.xml`, `schema-map.xml`                            | PRESERVE  | add /score, /docs, /brand to sitemap (discovery gap)  | 16-seo-version        |
| `pricing.md`, `privacy.md`, `auth.md`                                    | PRESERVE  | policy content; keep linked from footer/monitor       | 16-seo-version        |
| Homepage JSON-LD graph (Org, WebSite, SoftwareApplication, FAQ, Breadcrumb)| PRESERVE | re-emit in the rebuilt landing; softwareVersion test  | 02-home-landing       |
| `_headers` security headers + `_redirects`                              | PRESERVE  | keep nosniff/HSTS/CSP/Permissions-Policy; tighten CSP if inline JS drops | 02 / 16 |
| `leaderboard.json` generated artifact (not committed)                     | PRESERVE  | keep generate-then-serve split                        | 06-leaderboard        |

### A4. Scan-flow and page states (every state in the floor)

States are not separate routes but must each survive. Each maps to the task that owns
its screen, plus the cross-cutting GAP-FILL states the design omits (section A6).

| State (floor)                                                  | Where it lives           | Treatment | Build task          |
|---------------------------------------------------------------|--------------------------|-----------|---------------------|
| Scan loading ("Scanning...", status line, button disabled)     | homepage scan flow       | REDESIGN  | 02-home-landing     |
| Rate limited (429 friendly message)                            | homepage scan flow       | REDESIGN  | 02-home-landing     |
| Anti-bot / dead page (422 with hint, no fake Clean)            | homepage scan flow       | REDESIGN  | 02-home-landing     |
| Generic scan error / `data.error`                             | homepage scan flow       | GAP-FILL  | 02-home-landing     |
| Sharing unavailable (KV off, share:false) graceful omit        | homepage + result        | REDESIGN  | 02 / 03             |
| Result loading placeholder (domain "...", empty metric slots)  | /score, /r              | REDESIGN  | 03-score-hub        |
| Empty / clean states ("Nothing to fix", per-category checks)   | /score                  | REDESIGN  | 03-score-hub        |
| Expanded vs collapsed breakdown (caret, first dirty open)      | /score                  | REDESIGN  | 03-score-hub        |
| Confirmation micro-states (Share -> link copied, copy prompt)  | /score, /r, monitor     | REDESIGN  | 03 / 04 / 02        |
| Unknown domain 404 + scan CTA; invalid domain 400              | /score                  | REDESIGN  | 03-score-hub        |
| Expired/missing permalink 404 ("kept 90 days")                 | /r/:id                  | REDESIGN  | 04-result-permalink |
| Report no-data honest empty state (email-free, noindex)        | /report                 | REDESIGN  | 05-printable-report |
| Dashboard: signed-out, magic-link exchange, expired token, empty, not-configured 503, logout | /dashboard | GAP-FILL | 08-dashboard        |
| Directory empty state + pending (unscored) label               | /directory              | REDESIGN  | 07-directory        |
| Leaderboard "being generated" + live-counter threshold (>=50)  | /leaderboard            | REDESIGN  | 06-leaderboard      |
| Claim model: dofollow only after verified claim; unclaimed CTA | /score, /directory      | REDESIGN  | 03 / 07             |

### A5. Shared modules and primitives (the vocabulary)

The floor's shared brand system and UI primitives become the new shared foundation.
The export duplicates components inline; the rebuild centralizes them (design "How
tokens land": "Build the components above as shared TSX ... so [pages] render the
same nav, footer, scan input, leaderboard row, badge, and cards").

| Module / primitive (floor)                          | Treatment | New home                                  | Build task          |
|-----------------------------------------------------|-----------|-------------------------------------------|---------------------|
| `_brand.ts` (BRAND_FONTS_HEAD, BRAND_CSS, dark)     | REDESIGN  | rewritten, light-first tokens             | 00-foundation       |
| `tierColors` + engine `gradeForScore`/`verdictFor`  | REDESIGN  | centralized resolvers in new `_theme.ts`  | 00-foundation       |
| Header / brand mark / eyebrow registration chip      | REDESIGN  | shared Nav + LogoLockup + SectionLedger   | 01-shared-ui        |
| Score gauge (grade, score/100, tier pill, note)      | REDESIGN  | BigScore + ScoreTierBadge components       | 03 (composite) / 01 |
| Badge (shields-style SVG)                            | REDESIGN  | new two-segment badge, `_badge.tsx`        | 12-badge-generator  |
| Score-over-time chart (inline SVG)                   | REDESIGN  | Result charts in `_result.tsx`             | 03-score-hub        |
| Tables (history, rankings, directory rows)           | REDESIGN  | LeaderboardRow + reference-table styles    | 01 / 06 / 07 / 10   |
| Footer ("fingerprint, not a verdict", reproduce line)| REDESIGN  | shared Footer component                     | 01-shared-ui        |
| `_render.tsx` `cardHtml` (share card)               | REDESIGN  | moved to `_card.tsx`, re-themed            | 13-og-card          |
| `_render.tsx` escaping + `jsonForScript`            | PRESERVE  | unchanged                                  | 00 (kept)           |
| `_data.ts`, `_ssrf.ts`, `_util.ts`, `_session.ts`, `_email.ts`, `_alerts.ts`, `_sweep.ts`, `_report.ts`, `_posts.ts` | PRESERVE | unchanged | n/a |

### A6. Cross-cutting states the design omits (GAP-FILL, design "Gaps")

The export is silent on these. The chosen values are additions, owned by the
foundation and applied per screen. The design-extract "Gaps" section enumerates them.

| Gap (design "Gaps")                          | Decision                                                                 | Owned by            |
|----------------------------------------------|-------------------------------------------------------------------------|---------------------|
| 1. Responsive breakpoints + grid stacking    | Adopt the proposed defaults: `<=900px` collapse 3-up/2-up to 1 col, docs sidebar collapses, 4-axis to 2x2; `<=640px` hero clamp low end, 5-bar grid to 2-3 wide, analytics stack, nav condenses, keep `white-space:nowrap` on wordmark/buttons/scores | 00-foundation (tokens + helpers), each screen applies |
| 2. Focus / focus-visible ring                 | Add an ink or `#1FA85E` `:focus-visible` ring; never ship bare `outline:none` | 00-foundation       |
| 3. Active / disabled button + input states    | Define pressed (darken) + disabled (reduced contrast, `cursor:not-allowed`) | 00-foundation       |
| 4. Web error / blocked-scan / timeout state   | Design a Result error/retry state and a scan-flow error state            | 02 (scan) / 03 (Result) |
| 5. Transition durations / easing              | One subtle token: `--t: 140ms ease`                                       | 00-foundation       |
| 6. Formal spacing scale                       | Quantize the export's literal set to named 4px-based steps                | 00-foundation       |
| 7. Reduced-motion handling                    | `@media (prefers-reduced-motion: reduce)` disables chart draw + label-swap animation | 00-foundation, charts in 03 |
| 8. Dark-mode-by-preference                    | OUT OF SCOPE (net-new design). Light-first with intentional dark sections only. State explicitly; do not build. | n/a |
| 9. Flat wordmark vector                        | Not needed; mark SVG + live mono text is the lockup                       | 01-shared-ui        |
| 10. Asset coverage (OG, badge, social)         | Re-themed server-side, not extracted                                      | 12 / 13             |

### A7. MUST-NOT-REGRESS coverage map (all 28)

Every floor MNR item mapped to the task(s) that preserve it. Reviewers check this.

| MNR | Capability (abbrev)                                           | Preserved by             |
|-----|--------------------------------------------------------------|--------------------------|
| 1   | Scan -> score/tier/grade/verdict/pattern breakdown           | PRESERVE engine; surfaced by 03 |
| 2   | SSRF protection (target, redirects, DESIGN.md)               | PRESERVE (`_ssrf.ts`)    |
| 3   | Anti-bot / dead-page 422 with hint                           | PRESERVE; surfaced by 02 |
| 4   | Scoring presets (full/strict/marketing/minimal)             | PRESERVE engine          |
| 5   | Copy axis + system axis + AEO axis                           | PRESERVE; surfaced 03,10 |
| 6   | Optional screenshot + share:false (no-persist) for CI        | PRESERVE (`/api/scan`)   |
| 7   | Shareable permalink `/r/:id` (90d) + expired state           | 04-result-permalink      |
| 8   | Dynamic OG card + per-domain badge (cached, fallback)        | 13-og-card, 12-badge     |
| 9   | Share to X/LinkedIn, copy link, embed Markdown/HTML/URL       | 02, 03 (share+embed card) |
| 10  | Fix-prompt + one-click handoff (ChatGPT/Claude/Cursor)       | 02, 03 (fix card)        |
| 11  | `/score/:domain` hub (grade, axes, chart, percentile, etc.)  | 03-score-hub             |
| 12  | Claim model (dofollow only after verified) + empty state     | 03-score-hub, 07-directory |
| 13  | Subscribe/unsubscribe + additive flags + double opt-in + drift | 02 (monitor), 15 (confirm), PRESERVE watch |
| 14  | Public watch status, no email leakage                        | PRESERVE (`publicWatch`) |
| 15  | Cron sweep (regression + drift alerts, re-arm)               | PRESERVE (`/api/cron/sweep`) |
| 16  | Printable `/report/:domain` (print stylesheet, noindex, email-free) | 05-printable-report |
| 17  | Agency dashboard (magic-link, HMAC session, isolation, logout) | 08-dashboard           |
| 18  | Email via Resend with graceful degradation + redacting logs   | PRESERVE (`_email.ts`)   |
| 19  | Opt-in directory (dofollow, ItemList, sorts, pending, empty) + API mirror | 07-directory, PRESERVE `/api/sites` |
| 20  | Leaderboard (corpus aggregate, rankings, counter, generate-serve) | 06-leaderboard        |
| 21  | Global distribution, `/api/stats`, percentile, homepage headline | 06, 03, 02, PRESERVE stats |
| 22  | Blog (index, posts, Markdown twins) + content                | 09-blog                  |
| 23  | Live `/api/patterns` catalogue + `/api/aeo`                  | PRESERVE                 |
| 24  | Full agent + AEO + SEO surface + security headers + JSON-LD  | 16-seo-version, 02       |
| 25  | Protection stack (rate limit, Turnstile, origin, fail-closed, cap, kill switch) | PRESERVE middleware |
| 26  | Shared brand system + dogfood guardrail (every surface passes detector) | 00, 01, and graded on 02..15 |
| 27  | Product framing (fingerprint not verdict, lower is better, opt-in, double opt-in, positive leaderboard) | preserved in copy on 02,03,06,07 |
| 28  | RESULTS KV model (keys, TTLs) + derived rules (+8 / tier drop, +15 / fell-from-Aligned, sticky baselines, de-dup, reconciliation) | PRESERVE (`_data.ts`, engine) |

## Part B: Design-coverage cross-check (new design to build tasks)

The other direction: every screen and component the design specifies is represented
by a task. Nothing in `design-extract.md` is dropped.

### B1. The five screens

| Design screen (design "Screen and section inventory") | Maps to product route(s)                | Build task            |
|-------------------------------------------------------|-----------------------------------------|-----------------------|
| 1. Landing (`Landing.dc.html`, `/`)                   | `/`                                     | 02-home-landing       |
| 2. Result (`Result.dc.html`, `/r/<domain>`)           | `/score/:domain` (canonical) + `/r/:id` + `/report/:domain` | 03-score-hub (+ 04, 05) |
| 3. Leaderboard (`Leaderboard.dc.html`, `/leaderboard`)| `/leaderboard` + the directory section -> `/directory` | 06-leaderboard + 07-directory |
| 4. Docs (`Docs.dc.html`, `/docs`/`/methodology`)      | NEW route `/docs` (+ fold `/compare`)   | 10-docs-methodology   |
| 5. Brand (`Brand.dc.html`, `/brand`)                  | NEW route `/brand`                      | 11-brand-page         |

Note: the design treats the directory as a section inside the Leaderboard screen.
The product keeps `/directory` as its own route (MNR-19: distinct SEO surface, ItemList
JSON-LD, sort modes, API mirror). Decision: build `/directory` as a full page in the
design's directory-section language, and link it from the leaderboard.

### B2. The 38 components (design "Components")

Every component anatomy in the export, assigned to where it is built. Cross-screen
atoms go in the shared library (task 01). Result-only composites go in `_result.tsx`
(task 03). Brand-only and Docs-only composites go with their screen.

| Component (design "Components > ...")     | Built in                  | Owning task          |
|-------------------------------------------|---------------------------|----------------------|
| Navigation bar                             | `_ui.tsx`                 | 01-shared-ui         |
| Footer                                     | `_ui.tsx`                 | 01-shared-ui         |
| Logo lockup (mark + wordmark)              | `_ui.tsx`                 | 01-shared-ui         |
| Scan input (+ compact + monitor variants)  | `_ui.tsx`                 | 01-shared-ui         |
| Buttons (primary, outline, monitor CTA)    | `_ui.tsx`                 | 01-shared-ui         |
| Sample chip                                | `_ui.tsx`                 | 01-shared-ui         |
| Stats strip                                | `_ui.tsx`                 | 01-shared-ui         |
| Letter-avatar chip                         | `_ui.tsx`                 | 01-shared-ui         |
| Leaderboard row                            | `_ui.tsx`                 | 01-shared-ui         |
| Score-tier badge pill (compact readout)    | `_ui.tsx`                 | 01-shared-ui         |
| Live badge (inline-flex pill)              | `_ui.tsx` + `_badge.tsx`  | 01 (HTML) / 12 (SVG) |
| Monitor / continuity card                  | `_ui.tsx`                 | 01-shared-ui         |
| Code block                                 | `_ui.tsx`                 | 01-shared-ui         |
| Section ledger rule + eyebrow              | `_ui.tsx`                 | 01-shared-ui         |
| CTA section                                | `_ui.tsx` helper          | 01-shared-ui         |
| Big score display                          | `_result.tsx`             | 03-score-hub         |
| Category overview bars                      | `_result.tsx`             | 03-score-hub         |
| Expandable breakdown                        | `_result.tsx`             | 03-score-hub         |
| Four-axis strip                            | `_result.tsx`             | 03-score-hub         |
| System drift card + AEO checklist card     | `_result.tsx`             | 03-score-hub         |
| Charts: score-over-time, radar, neighbors, distribution | `_result.tsx` (distribution reused by 06) | 03-score-hub |
| Fix card                                   | `_result.tsx`             | 03-score-hub         |
| Share + embed card                         | `_result.tsx` (reused by 02) | 03-score-hub      |
| Teams / continuity section (Landing)       | page-local                | 02-home-landing      |
| Research / article cards (Landing)         | page-local                | 02-home-landing      |
| Voice samples (Brand)                      | page-local                | 11-brand-page        |
| Do / Don't cards (Brand)                   | page-local                | 11-brand-page        |
| Color swatch card (Brand)                  | page-local                | 11-brand-page        |
| Type specimen card (Brand)                 | page-local                | 11-brand-page        |
| Docs sidebar (sticky TOC)                  | page-local                | 10-docs-methodology  |
| Reference tables (Docs)                    | page-local                | 10-docs-methodology  |

All 38 component anatomies in the export are accounted for above (several are listed
as one row, for example the four charts and the three scan-input variants).

## Part C: Shared foundation spec

The foundation gates everything else. It replaces the dark Hanken/Martian theme with
the light editorial-instrument system and centralizes the components the export
duplicates inline. It is two ordered tasks: 00 (tokens, theme, resolvers) then 01
(shared component library). Below is exactly what they must export and provide.

### C1. `apps/web/functions/_brand.ts` (rewritten, not extended)

Per design "How the tokens and components should land in code", rewrite the file.
Keep the two export names so downstream interpolation keeps working.

`BRAND_FONTS_HEAD` must provide:

- The preconnect pair plus the exact Google Fonts link from design "Fonts and
  loading": `Newsreader` (ital,opsz,wght 0,6..72,400;500;600 and 1,6..72,400;500),
  `Libre Franklin` (400;500;600;700), `JetBrains Mono` (400;500;700), `display=swap`.
- Drop the Hanken Grotesk + Martian Mono link entirely. No Inter/Geist/Space Grotesk.

`BRAND_CSS` must provide:

- `:root` with `color-scheme:light` and the full token set from design "How tokens
  land" (the `--bg/--bg-2/--panel/--ink-deep/--border.../--text.../--clean/--mild/
  --heavy/--clean-text/--mild-text/--heavy-text/--system-text/--clean-dark` plus
  `--serif/--sans/--mono`). Values verbatim from design "Color tokens".
- Global reset (`* { box-sizing; margin; padding }`), `body{background:var(--bg);
  color:var(--text);font-family:var(--sans)}`, `a{color:inherit;text-decoration:none}`,
  `input{font-family:inherit}`, `::selection{background:#1FA85E;color:#fff}` per
  design "Fonts and loading > Global font setup".
- Type-scale custom properties or utility classes for the display/body/mono tokens
  in design "Type scale" (fluid `clamp()` display, the `score-numeral`, the mono
  ledger labels). Newsreader weight 500 for display, never for body.
- The signature section-ledger rule device (`border-top:1.5px solid #181815;
  padding-top:14px`) from design "Borders and rules", as a class.
- A spacing scale (GAP-FILL): named 4px-based steps quantizing the literal set in
  design "Spacing scale"; section horizontal padding `32px` constant.
- Radii tokens from design "Radii" (2/3/4/5/6/8/10/999/50%).
- Shadow policy: no colored or large-blur shadows (design "Shadows"); the only
  shadow is the badge `0 1px 2px rgba(0,0,0,0.1)`.
- A11y + motion GAP-FILLs (design "Gaps", section A6 above): a `:focus-visible`
  ring (replace bare `outline:none`), pressed + disabled button/input states, a
  single transition token `--t:140ms ease`, and `@media (prefers-reduced-motion)`.
- Responsive helpers (design "Responsive"): the `<=900px` and `<=640px` breakpoints
  and grid-stacking rules, since the export ships no `@media`.

### C2. `apps/web/functions/_theme.ts` (new) color and verdict resolvers

Centralize the maps in design "Tier, grade, and verdict logic" so the TSX pages, the
OG card generator, and the badge generator all read one source (design "How tokens
land" requires this). Re-export or wrap the engine's `gradeForScore`, `verdictFor`,
`GRADE_BANDS`. Must export:

- `tierFor(score)` -> Clean (<10) / Mild (10-27) / Heavy (>=28).
- `tierFill(tier)` -> `#1FA85E` / `#D89A2E` / `#C9402E`.
- `tierText(tier)` (the `Fg`) -> `#15824A` / `#9A6B12` / `#B23A2A`.
- `tierPillBg(tier)` -> the rgba status tints.
- `badgeColors(tier)` -> right-segment bg + ink from design "Badge colors".
- `systemAxisColor(score)` / `aeoAxisColor(score)` per design "Tier..logic".
- `chipPalette` (the six avatar colors) + `avatarColor(name)` deterministic hash.
- `gradeColorBucket(grade)` -> clean/mild/heavy.

`_render.tsx` keeps `escapeHtml`, `escapeXml`, `jsonForScript` unchanged; its
`tierColors` is rewritten to delegate to `_theme.ts` (so existing importers keep
working). `badgeSvg` moves to `_badge.tsx` (owned by task 12) and `cardHtml` moves to
`_card.tsx` (owned by task 13), so tasks 12 and 13 do not both edit `_render.tsx`.

### C3. `apps/web/functions/_ui.tsx` (new) shared component library

hono/jsx components (or shared style strings) so Landing, Result, Leaderboard,
Directory, Report, Docs, Brand render the same shell. Must export the cross-screen
set from Part B2: `Nav`, `Footer`, `LogoLockup` (light + dark variants), `ScanInput`
(hero + compact-rescan + leaderboard-CTA + dark-monitor variants), `Button`
(primary/outline/monitor), `SampleChip`, `StatsStrip`, `LetterAvatar`,
`LeaderboardRow`, `ScoreTierBadge`, `LiveBadge` (the inline-flex HTML pill),
`MonitorCard`, `CodeBlock`, `SectionLedger` (rule + eyebrow + mono label), and a
`Cta` helper. Each must render light-first, dogfood-clean markup. The `Nav` links
target `/leaderboard`, `/docs`, `/brand`, and github (design "Navigation bar"); the
current page's link is set to `#181815` with no hover.

Foundation acceptance gate: tasks 02..15 may import from `_ui.tsx`, `_theme.ts`, and
`_brand.ts` but must not edit them. A screen that needs a new shared component sends
it back to task 01 or keeps it page-local. This keeps the foundation a stable,
non-overlapping write target.

## Part D: Build tasks

Ordered. Foundation (00, 01) first; everything else depends on it. Each task is one
screen or area, kept small and reviewable. Tasks with disjoint file sets can run in
parallel; tasks that share a file are serialized (see the overlap table at the end of
this part). Headers are consistent: Slug, Treatment, Files, Depends on, Acceptance
criteria (design fidelity, functional parity, tests, dogfood + responsive + a11y).

The build commands for every task (from the floor): `bun install` at repo root,
`bun run --filter slop-detect-web test` (vitest) must stay green, `bun run --filter
slop-detect-web dev` for local check. Never npm. Commit on a feature branch, never
main; no Co-authored-by or generated-by trailers.

### Build task 00: foundation-tokens-theme

Slug: `foundation-tokens-theme`

Treatment: REDESIGN (the shared `_brand.ts` theme) + GAP-FILL (a11y/motion/responsive
tokens the export omits).

Files: `apps/web/functions/_brand.ts` (rewrite), `apps/web/functions/_theme.ts`
(new), `apps/web/functions/_render.tsx` (rewrite `tierColors` to delegate; relocate
`badgeSvg` -> `apps/web/functions/_badge.tsx`, `cardHtml` -> `apps/web/functions/
_card.tsx`; update their importers `badge/[domain].ts`, `og/[id].ts`),
`apps/web/test/landing.test.js` (update `BRAND_MARKS` only), new
`apps/web/test/brand-tokens.test.js`.

Depends on: nothing (this gates all others).

Acceptance criteria:

- Design fidelity: `_brand.ts` matches design "Fonts and loading", "Type scale",
  "Color tokens", "Spacing scale", "Radii", "Borders and rules", "Shadows",
  "Responsive", "Motion and interaction states", and "How tokens land". `:root` is
  `color-scheme:light`; paper `#F4F5F2`, ink `#181815`, accent green `#1FA85E` /
  `#15824A`; section-ledger rule present.
- Functional parity: keeps the `BRAND_FONTS_HEAD` and `BRAND_CSS` export names so the
  seven current importers keep compiling. `_theme.ts` reproduces every map in design
  "Tier, grade, and verdict logic" and wraps engine `gradeForScore`/`verdictFor`
  (MNR-1, MNR-26). `tierColors` still resolves for existing callers (MNR-26).
- Tests: `brand-tokens.test.js` asserts the new fonts present (Newsreader, Libre
  Franklin, JetBrains Mono), Hanken/Martian absent, `color-scheme:light`, a
  `:focus-visible` rule exists, no `background-clip:text`, and the five core hexes
  present. Update `landing.test.js` `BRAND_MARKS` (line 146) to the new shared marks
  (new fonts + new accent token + ledger device), so the /directory, /leaderboard,
  /report brand-unification tests assert the new identity. Do not touch
  `landing.test.js` lines 116-117 here (homepage font URL is task 02). All other
  test files stay green unchanged.
- Dogfood / responsive / a11y: tokens themselves encode the dodges in design "Why
  this design passes its own detector" (no slop fonts, no purple CTA, no gradient
  text, flat surfaces, 1px borders). The `:focus-visible` ring, disabled/active
  states, `--t` transition, reduced-motion media query, and `<=900px` / `<=640px`
  breakpoint helpers are all present in `BRAND_CSS` (design "Gaps" 1,2,3,5,7).

### Build task 01: shared-ui-library

Slug: `shared-ui-library`

Treatment: REDESIGN (centralize the inline-duplicated components into a shared lib).

Files: `apps/web/functions/_ui.tsx` (new). No other file is edited.

Depends on: 00.

Acceptance criteria:

- Design fidelity: exports the cross-screen components in Part B2 / Part C3, each
  matching its design "Components > ..." anatomy: Nav (sticky, translucent paper,
  `border-bottom`, github outline button, active-link rule), Footer (dark `#16170F`
  band, dark reticle + `#3FBE7A` dot + wordmark + mono meta), LogoLockup (light +
  dark, lowercase hyphenated monospace, `white-space:nowrap`), ScanInput (the four
  variants), Buttons (primary ink->green hover, outline, monitor CTA on dark),
  SampleChip, StatsStrip (colored numerals), LetterAvatar (deterministic from
  `_theme.ts` palette), LeaderboardRow (`16px 1fr auto`), ScoreTierBadge, LiveBadge,
  MonitorCard, CodeBlock (dark, the named syntax accents), SectionLedger, Cta.
- Functional parity: Nav links `/leaderboard`, `/docs`, `/brand`, github; Footer
  keeps "a fingerprint, not a verdict" + "Reproduce: npx slop-detect <domain>"
  framing (MNR-27, floor "Shared modules"). MonitorCard posts to `/api/watch` with
  additive flags only (MNR-13). LiveBadge + ScoreTierBadge read tiers from
  `_theme.ts` (MNR-8).
- Tests: new `apps/web/test/ui.test.js` rendering each component to a string and
  asserting its key marks (light tokens, no slop fonts, no gradient text, nav/footer
  links, monitor additive-flag JS shape mirroring the floor's
  `inline-scripts`/`landing` assertions). All existing tests stay green.
- Dogfood / responsive / a11y: every component renders dogfood-clean markup (design
  "Why this design passes its own detector"): no eyebrow pill (plain mono strings),
  no icon-top cards, no sparkles, ledger rule is structural not decorative. Nav,
  stats strip, footer, button rows, chip rows use `flex-wrap:wrap` (design
  "Responsive"). Interactive elements have visible `:focus-visible` and accessible
  names; the scan input has a labelled input and a submit button.

### Build task 02: home-landing

Slug: `home-landing`

Treatment: REDESIGN (design Landing) + PRESERVE (agent JSON, JSON-LD, scan flow) +
GAP-FILL (scan error state).

Files: `apps/web/public/index.html` (rewrite inline CSS to the new system; keep the
scan/monitor/share inline JS, JSON-LD graph, Turnstile), `apps/web/functions/index.ts`
(keep agent-JSON negotiation; version from one source), `apps/web/public/index.md`
(twin, copy refresh), `apps/web/public/_redirects` (keep `/landing/*` -> `/`; drop the
retired `public/landing/index.html` and its Hanken/Martian woff2), `apps/web/test/
landing.test.js` (lines 116-117 + content assertions).

Decision (stated, not silent): keep `/` as static `index.html` re-skinned to the new
system, because its scan-flow vanilla JS, JSON-LD, Turnstile, and agent negotiation
are substantial and low-value to port. The token values are mirrored from
`_brand.ts`; if `/` is later converted to a server-rendered function it can import
the shared foundation directly. Converting now is the alternative, higher-risk path
and is not recommended for this task.

Depends on: 00, 01.

Acceptance criteria:

- Design fidelity: rebuilds the nine Landing sections in design "Screen inventory >
  1. Landing": nav, centered serif hero ("Does your landing page look generated?"
  with italic "generated?"), scan form, reassurance line, three sample chips, stats
  strip, leaderboard preview (3-col board, backlinks to /score), "what the score
  measures" four-axis ledger, the dark teams/continuity band (design "Teams /
  continuity section"), research cards (design "Research / article cards"), CTA with
  the manifesto blockquote, footer. Centered hero is the one allowed centered layout
  (serif, per design "Why this design passes its own detector").
- Functional parity: preserves the full scan loop (MNR-1,3,9,10) including
  Turnstile, the 429 / 422-with-hint / generic-error states (MNR-3), the share+embed
  panel (Markdown/HTML/URL, MNR-9), the fix-prompt modal + one-click handoff with
  the long-prompt clipboard fallback (MNR-10), the `#monitor` form with additive
  list/system flags (MNR-13), and `monitorNudgeLink`. Keeps the agent JSON view at
  `/?mode=agent` and the JSON-LD graph (MNR-24). Keeps `check_design_system` in the
  surface. Rewrites the URL to `/r/:id` on success.
- Tests: `landing.test.js` stays green with these edits: lines 116-117 flip to assert
  Newsreader + Libre Franklin + JetBrains Mono present and Inter/Geist/Space Grotesk
  absent; the `#monitor`, additive-flag, dashboard-reachable, version-not-stale,
  softwareVersion-matches-package, agent-discovery, and nav/footer-link assertions
  must all still pass against the rebuilt page. `inline-scripts.test.js` stays green.
- Dogfood / responsive / a11y: the rebuilt homepage scores Clean on its own detector
  (design "Why this design passes its own detector"): solid-ink headings, no gradient
  text/backgrounds, no purple CTA, no eyebrow pill, real singular stats. Copy stays
  copy-axis-0 (dry, exact, no buzzwords, no "not just X it's Y", no filler openers).
  Hero clamps down at `<=640px`; the 3-up board and the editorial splits stack at
  `<=900px`. Scan input and monitor form are keyboard-operable with visible focus.

### Build task 03: score-hub

Slug: `score-hub`

Treatment: REDESIGN (design Result, the centerpiece) + GAP-FILL (Result error/retry
state).

Files: `apps/web/functions/score/[domain].tsx` (rewrite), `apps/web/functions/
_result.tsx` (new: the Result composite components, reused by tasks 04 and 05),
`apps/web/test/score.test.js` (keep green, extend), `apps/web/test/inline-scripts.test.js`
(keep green).

Depends on: 00, 01.

Acceptance criteria:

- Design fidelity: rebuilds the twelve Result sections in design "Screen inventory >
  2. Result" using the design "Components" anatomies: nav with inline rescan input,
  domain header (letter-avatar + mono domain + scanned-line + ScoreTierBadge), big
  score block (120px Newsreader numeral, `/100`, grade-tier, rank, italic verdict,
  right action column), category overview bars (five-up), expandable breakdown (caret,
  first dirty open, per-pattern evidence + weights), four-axis strip with polarity
  note, system drift card + AEO eight-check card, competitive analytics (score-over-
  time, radar, neighbors, distribution; all inline SVG, no chart library), fixes panel
  (why/fix/rule cards, copy-prompt button, CLI hint, clean empty state), share+embed
  card, monitor card. Big score, bars, charts use `_theme.ts` colors.
- Functional parity: preserves the `/score/:domain` hub contract (MNR-11): latest
  grade, axis chips (design always; copy/system when run), score-over-time chart when
  >=2 history points, peer percentile when >=5 sites, triggered patterns, re-scan to
  `/?url=`, this-scan to `/r/:id`, printable to `/report/:domain`, share to X, embed
  badge with copyable Markdown. Claim model intact (MNR-12): dofollow backlink only
  for a verified claim, claim CTA + no backlink otherwise, empty (never-scanned) 404
  with scan CTA, invalid domain 400. Loading placeholder and clean/empty states per
  design "Motion and interaction states". Reuses engine + `_data.ts` accessors
  unchanged (normalizeDomain, getLatestForDomain, getWatch, getHistory, getListing,
  publicWatch, percentileForScore). Keeps canonical + OG/Twitter meta + WebPage
  JSON-LD (MNR-24).
- Tests: `score.test.js` stays green (domain validation, unknown 404 + CTA, score
  render, claim vs listed, peer-percentile threshold, related links); extend it for
  the new loading and error/retry states. `inline-scripts.test.js` stays green
  (XSS-safe inline scripts, the breakdown toggle JS).
- Dogfood / responsive / a11y: the densest page must still score Clean (design "Why
  this design passes its own detector"): a 120px serif numeral against 11-13px mono
  labels is the intended dramatic hierarchy, not flat type; no gradient card
  backgrounds (this page replaces the old radial-gradient register). Charts respect
  `prefers-reduced-motion` (design "Gaps" 7). At `<=900px` the four-axis strip becomes
  2x2 and the analytics `1fr 1fr` stacks; at `<=640px` the five-category bar grid
  goes 2-3 wide. Breakdown carets are keyboard-operable with `aria-expanded`.

### Build task 04: result-permalink

Slug: `result-permalink`

Treatment: REDESIGN (design Result variant) + GAP-FILL (expired state, canonical).

Files: `apps/web/functions/r/[id].tsx` (rewrite), `apps/web/test/inline-scripts.test.js`
(keep green).

Depends on: 00, 01, 03 (imports `_result.tsx`).

Acceptance criteria:

- Design fidelity: renders the result card in the Result language (design "2. Result",
  "Big score display", "Share + embed card") by composing `_result.tsx`. Replaces the
  old radial-gradient card background with a flat surface (the floor flags the
  radial-gradient as a detector-flaggable pattern on share surfaces).
- Functional parity: preserves the shareable permalink (MNR-7): full result card,
  CTAs (scan your own site, domain history to `/score/:domain`, share on X), embed
  badge with copy. Missing/expired id returns the friendly 404 ("results kept 90
  days") with a new-scan CTA. OG/Twitter meta to `/og/:id.png` (MNR-8). Reuses
  `getResult` unchanged.
- Tests: `inline-scripts.test.js` stays green. Add a render test for the expired-404
  state and the canonical tag (closing the floor's SEO gaps: the permalink currently
  has no `rel=canonical`).
- Dogfood / responsive / a11y: card scores Clean, no gradient background (resolves the
  floor's deliberate-decision note on `/r` + OG gradients). Canonical points to
  `/score/:domain` to avoid diluting the hub (floor "Copy, SEO, meta" canonical gap).
  Card stacks cleanly on mobile; focus-visible on all CTAs.

### Build task 05: printable-report

Slug: `printable-report`

Treatment: REDESIGN (design Result variant) + GAP-FILL (print stylesheet in new type).

Files: `apps/web/functions/report/[domain].tsx` (rewrite), `apps/web/test/drift.test.js`
(keep green; it includes the report render + anti-slop check).

Depends on: 00, 01, 03 (imports `_result.tsx`).

Acceptance criteria:

- Design fidelity: renders the agency report in the Result language (design "2.
  Result"): brand header, the fingerprint grade/score/tier card, the design-system
  compliance card (when monitored), the "what drifted" list, triggered patterns, and
  the history table, all in Newsreader/Libre Franklin/JetBrains Mono. A `@media print`
  stylesheet styles the new palette for PDF (paper background prints as white).
- Functional parity: preserves the printable deliverable (MNR-16): screen + print
  stylesheet, `noindex`, never leaks the subscriber email (uses `publicWatch`),
  invalid domain 400, honest no-data empty state. Reuses normalizeDomain,
  getLatestForDomain, getWatch, getHistory, publicWatch unchanged.
- Tests: `drift.test.js` stays green: it asserts the report renders score, system
  baseline/current/drift, history, the no-data state, the `@media print` rule, and the
  anti-slop self-check (no Inter/Geist/Space Grotesk). The anti-slop regex still
  passes because the new fonts are none of those.
- Dogfood / responsive / a11y: report scores Clean; the print stylesheet drops the
  dark sections to ink-on-white. Table is readable at mobile width. History table has
  a caption / scope headers.

### Build task 06: leaderboard

Slug: `leaderboard`

Treatment: REDESIGN (design Leaderboard, minus the directory section).

Files: `apps/web/functions/leaderboard.tsx` (rewrite), `apps/web/test/leaderboard.test.js`
(keep green), `apps/web/test/landing.test.js` (the `/leaderboard wears the brand` case
passes against the new `BRAND_MARKS` from task 00).

Depends on: 00, 01.

Acceptance criteria:

- Design fidelity: rebuilds the Leaderboard sections in design "Screen inventory > 3.
  Leaderboard": mono eyebrow + H1 "The state of AI design slop", positioning
  paragraph, the "signal, not a verdict" + owner-gated disclaimer, inline stats row,
  the 10-bucket distribution histogram (design "Charts > Slop distribution"), cleanest-
  overall 2-col ranked list, by-category boards, and the scan CTA. Uses LeaderboardRow
  + StatsStrip + Cta from `_ui.tsx`.
- Functional parity: preserves the research page (MNR-20): corpus aggregate (slop
  share, avg, Clean/Mild/Heavy), the live counter shown only at >=50 scans, category
  and by-builder rankings with each name linking to its `/score` hub, and the
  generate-then-serve `/leaderboard.json` model (the "being generated" state when the
  file is absent or unscored). Live aggregate from `getStats(RESULTS)` (MNR-21). CTA
  routes into the monitoring funnel (`#monitor`).
- Tests: `leaderboard.test.js` stays green (headline, category and builder rankings,
  score-hub links, generating state, live-counter threshold, framing caveat, and the
  anti-slop checks: no Inter/Geist/Space Grotesk, no `background-clip:text`). The
  `landing.test.js` leaderboard brand case passes against the new marks.
- Dogfood / responsive / a11y: scores Clean; positive "Hall of Clean" framing, never a
  named hall of shame (MNR-27). The distribution histogram respects reduced-motion.
  2-col boards stack to 1 col at `<=900px`. Bars have accessible labels.

### Build task 07: directory

Slug: `directory`

Treatment: REDESIGN (design's directory section, built as a full page).

Files: `apps/web/functions/directory.tsx` (rewrite), `apps/web/test/sites.test.js`
(keep green), `apps/web/test/landing.test.js` (the `/directory wears the brand` case).

Depends on: 00, 01.

Acceptance criteria:

- Design fidelity: rebuilds the directory in design "3. Leaderboard > 6. Directory
  (opt-in only)" language: header with listed-count and "dofollow backlinks" note,
  the explainer, then owner-listed rows (rank, letter-avatar chip, name, domain,
  "listed <date>", score/grade). Uses the directory-row grid `26px 22px 1fr auto auto`
  from design "Layout, grid, and containers".
- Functional parity: preserves the opt-in catalogue (MNR-19): dofollow backlinks,
  ItemList JSON-LD, sort modes (`?sort=clean` default, `?sort=slop`), pending
  (unscored) entries sinking to the end and labelled "Pending", the empty state
  ("No sites listed yet... claim it"), and working with no RESULTS binding. Reuses
  listAllSites, tierColors, jsonForScript unchanged.
- Tests: `sites.test.js` stays green (dofollow, ItemList, empty state, pending label,
  and the anti-slop self-check: no slop fonts, no gradient text). The `landing.test.js`
  directory brand case passes against the new marks.
- Dogfood / responsive / a11y: scores Clean; opt-in only, never publishes an
  unrequested verdict (MNR-27). Rows stack readably at mobile width; the directory
  list is a semantic list with accessible row links.

### Build task 08: dashboard

Slug: `dashboard`

Treatment: GAP-FILL (design silent; re-skin the agency view in the new language).

Files: `apps/web/functions/dashboard.tsx` (rewrite), `apps/web/test/dashboard.test.js`
(keep green), `apps/web/test/inline-scripts.test.js` (keep green).

Depends on: 00, 01.

Acceptance criteria:

- Design fidelity: re-skins the dashboard to the new system. Login form uses the
  ScanInput/Button/SectionLedger vocabulary; the signed-in multi-domain list uses
  LeaderboardRow-like rows with tier-colored grades and mono flags. No new visual
  patterns are invented beyond the design's component set (this is a GAP-FILL, so
  values are chosen from the existing tokens, not net-new).
- Functional parity: preserves the agency dashboard (MNR-17): magic-link login,
  `?token=` exchange to a 30-day HMAC session cookie then 302 to clean `/dashboard`,
  `?logout=1`, the not-configured 503 (no SESSION_SECRET), strict ownership isolation
  (only the email's domains), the empty state, and the per-domain flags (regressed,
  drifted, unconfirmed, listed) + last-checked + report link. `noindex, no-store`.
  Reuses listWatchesByEmail, consumeDashboardToken, the `_session` helpers unchanged.
- Tests: `dashboard.test.js` stays green (session round-trip, cookie flags, single-use
  tokens, ownership isolation, logout, not-configured). `inline-scripts.test.js` stays
  green.
- Dogfood / responsive / a11y: scores Clean; the domain list stacks at mobile width;
  the login form is keyboard-operable with a labelled input and visible focus.

### Build task 09: blog

Slug: `blog`

Treatment: GAP-FILL (design silent; re-skin using the article-card vocabulary).

Files: `apps/web/functions/blog.tsx` (rewrite), `apps/web/functions/blog/[slug].tsx`
(rewrite; covers the `.md` twin route too), `apps/web/test/blog.test.js` (keep green).

Depends on: 00, 01.

Acceptance criteria:

- Design fidelity: index uses the design "Research / article cards" vocabulary
  (Newsreader titles, mono reference tags); a post renders prose in Libre Franklin
  with Newsreader headings and the design "Code block" for any code.
- Functional parity: preserves the blog (MNR-22): index newest-first with
  BlogPosting/Blog JSON-LD, post HTML via `mdToHtml` with BlogPosting JSON-LD and a
  `rel=alternate` to the `.md` twin, the `.md` route serving raw Markdown with
  `text/markdown`, and the unknown-slug 404. Content stays in `_posts.ts` unchanged.
- Tests: `blog.test.js` stays green (index links, JSON-LD, post HTML, `.md` twin
  headers, 404, `mdToHtml` escaping).
- Dogfood / responsive / a11y: scores Clean; copy stays copy-axis-0. Prose column is
  readable at mobile width; headings form a correct outline.

### Build task 10: docs-methodology

Slug: `docs-methodology`

Treatment: NEW (design Docs screen; the product has no /docs route) + GAP-FILL (fold
the static /compare positioning page toward it).

Files: `apps/web/functions/docs.tsx` (new; route `/docs`, alias `/methodology`),
`apps/web/functions/_ui.tsx` is imported read-only, new `apps/web/test/docs.test.js`,
`apps/web/public/_redirects` (optional `/methodology` -> `/docs` and `/compare`
handling), `apps/web/public/sitemap.xml` (add `/docs`; coordinate with task 16).

Depends on: 00, 01.

Acceptance criteria:

- Design fidelity: builds the fifteen Docs sections in design "Screen inventory > 4.
  Docs" with the `1240px` layout: a `212px` sticky sidebar TOC (design "Docs sidebar")
  + `760px` content. Intro, the four axes ledger table, install + CLI dark code blocks,
  AEO explainer + eight-check weighted table + "eating our own cooking" green callout,
  the system (DESIGN.md) axis + drift code block, web/REST API curl + endpoints table
  + auth-tiers, continuity endpoints table, programmatic JS block, presets table + MCP
  config, the CI GitHub Action YAML, the tiers-and-grades three-column reference
  (2px tier-colored top rules), and the "Empty is better than fake" closer with a scan
  button. Uses design "Reference tables" and "Code block".
- Functional parity: the methodology content reflects the live engine (axes,
  endpoints, presets, AEO checks, tiers) and the same `DEFINITIONS_VERSION` source
  (MNR-5, MNR-23). The endpoints table documents the real API surface. Nav across all
  pages already links methodology -> `/docs` (from task 01). Folds the `/compare`
  positioning content here or links it; keeps the `/compare` route working until
  redirected (floor route 73).
- Tests: new `docs.test.js` asserts the sticky sidebar TOC renders, the eight AEO
  checks and four axes appear, the tiers table shows Clean 0-9 / Mild 10-27 / Heavy
  28+, code blocks are present, and the anti-slop self-check passes (no slop fonts, no
  gradient text). All existing tests stay green.
- Dogfood / responsive / a11y: scores Clean; copy is copy-axis-0. At `<=900px` the
  sidebar collapses (design "Responsive"). The sidebar is a nav landmark with
  in-page anchors; code blocks have a language hint and are scrollable, not clipped.

### Build task 11: brand-page

Slug: `brand-page`

Treatment: NEW (design Brand screen; the product has no /brand route). This is the
dogfood proof page (it must score 0/100, A+, Clean).

Files: `apps/web/functions/brand.tsx` (new; route `/brand`), new
`apps/web/test/brand.test.js`, `apps/web/public/sitemap.xml` (add `/brand`;
coordinate with task 16).

Depends on: 00, 01.

Acceptance criteria:

- Design fidelity: builds the Brand sections in design "Screen inventory > 5. Brand"
  with `1120px` numbered ledger sections: hero ("A detector that refuses to look like
  the thing it detects." + "this page scores 0/100 . A+ . Clean"), `01 the mark`
  (reticle light + dark from `apps/web/public/landing/design/mark*.svg`), `02 the
  wordmark` (the lowercase/hyphenated/monospace rule), `03 color` (the five-swatch
  palette, "no purple anywhere" per design "Color swatch card"), `04 typography`
  (three type specimens, design "Type specimen card"), `05 voice` (three tier voice
  samples, design "Voice samples"), `06 the badge` (three LiveBadge examples + the
  markdown embed), `07 principles` (the do/don't cards, design "Do / Don't cards").
- Functional parity: this page introduces no engine dependency; it is the identity
  reference and the dogfood manifesto. It links to `/docs` and the scan flow. It
  states the framing (MNR-27) and the "Empty is better than fake" manifesto.
- Tests: new `brand.test.js` asserts the page renders the five swatches, the do/don't
  cards, three badge examples, and that it passes the anti-slop self-check most
  strictly of any page: no slop fonts, no gradient text, no purple as a CTA/accent
  (only the bounded six-color avatar palette may contain `#7A4D9A`), only the badge
  carries a shadow. Effectively a coded version of "this page scores Clean".
- Dogfood / responsive / a11y: this is THE proof surface, so it must score 0/100
  Clean (design "Why this design passes its own detector"). Ledger sections stack at
  mobile width; swatches and specimens reflow; color swatches expose their hex as
  text (not color-only).

### Build task 12: badge-generator

Slug: `badge-generator`

Treatment: REDESIGN (design Live badge + badge color table).

Files: `apps/web/functions/_badge.tsx` (the relocated + rewritten `badgeSvg`, moved
here by task 00), `apps/web/functions/badge/[domain].ts` (uses it), new
`apps/web/test/badge.test.js`.

Depends on: 00 (resolvers + relocation). No overlap with task 13.

Acceptance criteria:

- Design fidelity: the badge is the two-segment pill from design "Components > Live
  badge" + "Tier, grade, and verdict logic > Badge colors": dark left segment
  (`#16170F`, "slop"), tier-colored right segment (`grade . score`) using the badge
  color table (Clean `#1FA85E`/`#0A2A18`, Mild `#D89A2E`/`#3A2705`, Heavy
  `#C9402E`/`#FFFFFF`). JetBrains Mono, radius 4px. Drop the old shields linear-
  gradient overlay (it is a gradient tell).
- Functional parity: preserves the self-rendered badge (MNR-8): tier-colored value
  with grade and score, a neutral "no scan" badge when the domain has no result,
  cached 3 hours (BADGE_TTL), strips `.svg` and `www.`. No shields.io dependency.
- Tests: new `badge.test.js` (closing a floor test gap) asserts the SVG renders the
  two segments, the correct tier colors from `_theme.ts`, the no-scan fallback, and
  contains no `linearGradient`/gradient fill. All existing tests stay green.
- Dogfood / responsive / a11y: the badge is dogfood-clean (the only element allowed a
  shadow, `0 1px 2px rgba(0,0,0,0.1)`, per design "Shadows"). SVG has `role="img"`
  and an `aria-label`.

### Build task 13: og-card

Slug: `og-card`

Treatment: REDESIGN (re-theme the share card + static OG assets in the new palette).

Files: `apps/web/functions/_card.tsx` (the relocated + rewritten `cardHtml`, moved
here by task 00), `apps/web/functions/og/[id].ts` (uses it),
`apps/web/public/og.png` (regenerate), `apps/web/public/landing/og.svg` +
`apps/web/public/landing/og.png` (regenerate), new `apps/web/test/og-card.test.js`.

Depends on: 00 (resolvers + relocation). No overlap with task 12.

Acceptance criteria:

- Design fidelity: the 1200x630 card is re-themed to the new system (design "How
  tokens land": regenerate the OG card in the new palette and type). Flat paper or
  ink background, no radial-gradient (the floor flags the current radial-gradient as a
  detector-flaggable pattern). Newsreader numeral + grade in tier text color,
  JetBrains Mono labels, the verdict in italic Newsreader.
- Functional parity: preserves the dynamic OG card (MNR-8): serves the cached PNG from
  KV (`og:<id>`) when present, else screenshots `cardHtml` and caches 30 days, falls
  back to the static `/og.png` on any error or when RESULTS/BROWSER are missing. The
  static `og.png` fallback is regenerated to match.
- Tests: new `og-card.test.js` (closing a floor test gap) renders `cardHtml` to a
  string and asserts the new tokens, the tier color, and no `radial-gradient` /
  `linear-gradient`. All existing tests stay green.
- Dogfood / responsive / a11y: the card scores Clean (no gradient background),
  resolving the floor's open decision on the share-card gradient. Fixed-size raster,
  so responsive/focus criteria are n/a, but contrast of text on background must pass.

### Build task 14: favicon-assets

Slug: `favicon-assets`

Treatment: REDESIGN (swap to the new reticle favicon).

Files: `apps/web/public/favicon.svg` (replace with the new reticle from
`apps/web/public/landing/design/favicon.svg`), `apps/web/public/favicon.png`,
`apps/web/public/favicon-512.png` (regenerate from the SVG).

Depends on: 00 (palette only; otherwise independent, can run in parallel with screens).

Acceptance criteria:

- Design fidelity: favicon is the new reticle in a rounded paper tile (design "Logo
  lockup" + "Asset manifest"). Old dark scan-line mark removed.
- Functional parity: all three icon files exist and are referenced by the pages (the
  `_headers` and HTML `<link rel="icon">` continue to resolve).
- Tests: none required (no current favicon test); optionally assert the favicon link
  resolves in a smoke test. Existing tests stay green.
- Dogfood / responsive / a11y: the mark is the only custom glyph allowed (design "Why
  this design passes its own detector"); no icon font, no sparkle. PNG sizes cover
  retina + 512 for installable contexts.

### Build task 15: aux-rendered-pages

Slug: `aux-rendered-pages`

Treatment: GAP-FILL (re-skin the small rendered/static pages the screen tasks do not
cover: the watch-confirm page and the /compare positioning page).

Files: `apps/web/functions/api/watch/confirm.tsx` (re-skin the "you're all set"
page), `apps/web/public/compare/index.html` (re-skin inline) + `apps/web/public/
compare/index.md` (copy refresh), `apps/web/test/alerts.test.js` (keep green; it
covers the confirm flow).

Depends on: 00, 01.

Acceptance criteria:

- Design fidelity: the confirm page uses the new shell (Nav/Footer/SectionLedger) and
  the confirmation micro-state language (design "Motion and interaction states >
  confirmation micro-states"). The /compare page is re-skinned to the new tokens (or
  folds toward /docs per task 10's decision).
- Functional parity: the confirm route preserves the double-opt-in gate (MNR-13):
  consumes the single-use token (7-day TTL), sets `verified:true`, renders the success
  page; 503 no storage, 400 missing token, 410 expired/used, 404 watch gone. /compare
  keeps its positioning/methodology content and `.md` twin (floor route 73).
- Tests: `alerts.test.js` stays green (token confirm lifecycle). All other tests stay
  green.
- Dogfood / responsive / a11y: both pages score Clean and stack at mobile width; copy
  stays copy-axis-0.

### Build task 16: seo-version-consistency

Slug: `seo-version-consistency`

Treatment: PRESERVE (close the version-drift, sitemap, and canonical discovery gaps in
the agent/SEO surface).

Files: `apps/web/public/sitemap.xml` (add `/docs`, `/brand`, and a representative set
of `/score/:domain` hubs or a sitemap index), `apps/web/public/schema-map.xml`,
`apps/web/public/openapi.json`, `apps/web/public/.well-known/*` (version),
`apps/web/public/api/patterns.md` (defs label), `apps/web/public/robots.txt`,
`apps/web/public/llms.txt` + `llms-full.txt` + `api/llms.txt` + `developers/llms.txt`
(version/content), `apps/web/public/pricing.md`/`privacy.md`/`auth.md` (linked, copy).

Depends on: 10 and 11 (so `/docs` and `/brand` exist before they are added to the
sitemap). Does NOT touch `index.html` (task 02 owns the homepage version string).

Acceptance criteria:

- Design fidelity: none (these are data/content surfaces, not themed screens). Copy in
  the `.md` and `llms` files stays copy-axis-0.
- Functional parity: preserves the full agent + AEO + SEO surface (MNR-24): the five
  `.well-known` files keep the tool list including `check_design_system`, the
  `llms.txt` family and `api/patterns.md` and `openapi.json` stay valid, robots keeps
  `Content-Signal: ai-train=no` while allowing AI search crawlers, and the security
  headers in `_headers` are kept (tighten CSP if inline JS dropped). Closes the floor
  gaps: add `/score/:domain` hubs and the new `/docs` + `/brand` to the sitemap
  (discovery gap), and drive version strings from one source so the `0.7.0` / defs
  labels no longer drift (floor "Version drift risk").
- Tests: the `landing.test.js` agent-discovery test (every surface advertises
  `check_design_system`) and the softwareVersion-matches-package test stay green. Add
  a small test asserting the sitemap includes `/docs` and `/brand`.
- Dogfood / responsive / a11y: n/a (non-visual), except the `.md` twins and policy
  pages keep copy-axis-0.

### Optional task 17: api-scan-contract-test (hardening, non-blocking)

Slug: `api-scan-contract-test`

Treatment: PRESERVE (test-coverage hardening; not a re-skin item).

Files: new `apps/web/test/scan-contract.test.js`.

Depends on: nothing (independent; can run any time).

Acceptance criteria: adds a contract-shape test for `POST /api/scan` (the engine seam
the floor flags as untested: it needs the BROWSER binding, so test the response shape
with a mocked browser / injected page eval). Asserts score/tier/grade/verdict/
triggered/axes shape (MNR-1) and the 400/422/500/502 error contract (MNR-3). All
existing tests stay green. This is recommended but not required for parity.

### Overlap and parallelization table

Files written per task, so the coordinator can parallelize disjoint tasks and
serialize overlapping ones. Read-only imports (for example screens importing `_ui.tsx`)
are not overlaps.

| Task                     | Writes (primary files)                                                                 | Overlaps with        |
|--------------------------|---------------------------------------------------------------------------------------|----------------------|
| 00 foundation-tokens-theme | `_brand.ts`, `_theme.ts`, `_render.tsx`, `_badge.tsx`(new), `_card.tsx`(new), `badge/[domain].ts`(import), `og/[id].ts`(import), `landing.test.js`(BRAND_MARKS), `brand-tokens.test.js` | gates all; touches landing.test.js (also 02, 06, 07) -> 00 lands first |
| 01 shared-ui-library      | `_ui.tsx`, `ui.test.js`                                                                | none (after 00)      |
| 02 home-landing           | `public/index.html`, `functions/index.ts`, `public/index.md`, `_redirects`, `landing.test.js`(116-117 + content) | landing.test.js (00 first), _redirects (10) |
| 03 score-hub              | `score/[domain].tsx`, `_result.tsx`(new), `score.test.js`                              | _result.tsx consumed by 04, 05 |
| 04 result-permalink       | `r/[id].tsx`                                                                            | depends 03 (_result.tsx) |
| 05 printable-report       | `report/[domain].tsx`                                                                   | depends 03 (_result.tsx) |
| 06 leaderboard            | `leaderboard.tsx`                                                                       | landing.test.js case (00 first) |
| 07 directory              | `directory.tsx`                                                                         | landing.test.js case (00 first) |
| 08 dashboard              | `dashboard.tsx`                                                                         | none                 |
| 09 blog                   | `blog.tsx`, `blog/[slug].tsx`                                                          | none                 |
| 10 docs-methodology       | `docs.tsx`(new), `docs.test.js`, `_redirects`, `sitemap.xml`                          | _redirects (02), sitemap.xml (16) |
| 11 brand-page             | `brand.tsx`(new), `brand.test.js`, `sitemap.xml`                                       | sitemap.xml (16)     |
| 12 badge-generator        | `_badge.tsx`, `badge/[domain].ts`, `badge.test.js`                                     | none (00 relocated it) |
| 13 og-card                | `_card.tsx`, `og/[id].ts`, `og.png`, `landing/og.*`, `og-card.test.js`                | none (00 relocated it) |
| 14 favicon-assets         | `favicon.svg`, `favicon.png`, `favicon-512.png`                                        | none                 |
| 15 aux-rendered-pages     | `api/watch/confirm.tsx`, `compare/index.html`, `compare/index.md`                     | _redirects if used (coordinate with 02/10) |
| 16 seo-version-consistency| `sitemap.xml`, `schema-map.xml`, `openapi.json`, `.well-known/*`, `api/patterns.md`, `robots.txt`, `llms*.txt`, policy `.md` | sitemap.xml (10, 11); after 10, 11 |
| 17 api-scan-contract-test | `scan-contract.test.js`                                                                | none                 |

Recommended ordering: 00 -> 01 -> then 02, 03, 06, 07, 08, 09, 10, 11, 14 in parallel
(disjoint page files); 04 and 05 after 03; 12 and 13 after 00 (parallel with screens);
15 after 01 (coordinate `_redirects` and `sitemap.xml` writes); 16 last (after 10 and
11 so the sitemap can list the new routes). `sitemap.xml` is written by 10, 11, and 16:
serialize those three writes, or have 16 own the final sitemap and 10/11 only note the
addition. `_redirects` is written by 02, 10, 15: serialize or consolidate into 02.

## Frozen-decision summary

These choices are settled by this spec and should not be re-litigated downstream:

1. Full re-skin to the light editorial-instrument system; the dark Hanken/Martian
   theme is replaced, not layered (design "What this is: a full re-skin, not a tweak").
2. `_brand.ts` is rewritten keeping the `BRAND_FONTS_HEAD` / `BRAND_CSS` export names;
   color resolvers centralize in a new `_theme.ts`; components centralize in `_ui.tsx`.
3. Two NEW routes: `/docs` (methodology) and `/brand` (the dogfood proof page).
4. `/directory` stays its own route (built in the design's directory-section language);
   the leaderboard links to it.
5. `/` stays static `index.html`, re-skinned in place, to preserve its scan-flow JS,
   JSON-LD, Turnstile, and agent negotiation. Conversion to a function is a documented
   future option, not this rebuild.
6. Share surfaces (`/r`, `/og`) drop their radial-gradient backgrounds for flat
   surfaces, resolving the floor's deliberate-decision note.
7. Dark-mode-by-preference is out of scope (net-new design).
8. The engine, RESULTS KV model, all `/api/*` contracts, and the agent/SEO surface are
   reused unchanged; only their version strings and the sitemap/canonical gaps are
   touched.
9. Every served surface is graded against the dogfood guardrail (design Clean, copy
   axis 0); the `/brand` page is the strictest instance and must score 0/100.
10. No reference competitor is named anywhere.
