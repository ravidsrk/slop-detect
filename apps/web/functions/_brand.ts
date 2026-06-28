// Shared brand identity for server-rendered pages (/score, /directory,
// /leaderboard, /report, /dashboard, /blog) so they read as the SAME product as
// the landing page: the light editorial-instrument register — Newsreader serif
// display, Libre Franklin body, JetBrains Mono data voice, near-black ink on cool
// paper, and the verdict scale (green / amber / red) carrying every score.
//
// One source of truth: pages embed BRAND_FONTS_HEAD and BRAND_CSS instead of
// hand-rolling tokens. The names are kept stable so the seven current importers
// keep compiling; the values are the new light system (see docs/design-extract.md).
//
// Dogfood by construction: no AI-default faces, no purple CTA, no gradient text or
// gradient surfaces, flat 1px-bordered cards, and the structural 1.5px ink ledger
// rule as the only ruled device. This file must itself score Clean on the detector.

export const BRAND_FONTS_HEAD = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=Libre+Franklin:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">`;

export const BRAND_CSS = `
  :root{
    color-scheme:light;
    /* surfaces + dark register */
    --bg:#F4F5F2; --bg-2:#EEF0EB; --panel:#FBFBF9; --panel-2:#FBFBF9;
    --ink-deep:#16170F; --ink-deeper:#0F0F0B;
    /* borders + hairlines (light) */
    --border:#DBDDD6; --border-2:#E4E6DF; --row:#E7E8E2; --row-inner:#EDEEE8;
    --border-btn:#C9CBC3; --border-chip:#D7D9D2; --track:#E2E4DD; --neutral:#CDCFC8;
    /* ink tints on light, high contrast first. text-4/5 darkened to clear WCAG
       AA (4.5:1) on the paper AND the tinted code-panel backgrounds, where the
       old values measured 3.5-3.7:1 — the slop detector's own low-contrast-text
       axis flags that. text-6 stays as the single faint, decorative-only tone. */
    --text:#181815; --text-2:#3A3B33; --text-3:#46473F; --text-4:#565750;
    --text-5:#5E5F57; --text-6:#9A9B8E;
    /* verdict core hues (fills + dots) */
    --clean:#1FA85E; --mild:#D89A2E; --heavy:#C9402E;
    /* verdict text hues — nudged to actually clear AA 4.5:1 on paper (were 4.3-4.4) */
    --clean-text:#11703F; --mild-text:#835A0E; --heavy-text:#B23A2A;
    --system-text:#2C6E8F; --clean-dark:#3FBE7A;
    /* ink tints on the dark register */
    --d-text:#F4F5F2; --d-text-2:#C9CABF; --d-text-3:#B6B7AC; --d-text-4:#8A8B7E;
    --d-border:#2A2B22; --d-border-2:#3A3B30;
    /* families: serif display, grotesque body, mono data voice */
    --serif:'Newsreader',Georgia,'Times New Roman',serif;
    --sans:'Libre Franklin',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    --mono:'JetBrains Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace;
    /* legacy aliases so pre-rebuild pages keep resolving until their restyle task */
    --accent:#1FA85E; --accent-soft:rgba(31,168,94,0.10); --accent-ink:#0A2A18;
    --muted:#6E6F63; --dim:#9A9B8E;
    --green:#1FA85E; --yellow:#D89A2E; --red:#C9402E;
    /* spacing scale (GAP-FILL): named 4px-based steps quantizing the export's set */
    --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-5:20px; --sp-6:24px;
    --sp-7:28px; --sp-8:32px; --sp-10:40px; --sp-12:48px; --sp-14:56px;
    --sp-16:64px; --sp-20:80px; --sp-24:96px;
    --pad-x:32px;
    /* radii */
    --r-1:2px; --r-2:3px; --r-3:4px; --r-4:5px; --r-5:6px; --r-6:8px; --r-7:10px;
    --r-pill:999px; --r-round:50%;
    /* type sizes */
    --fs-display-hero:clamp(44px,6.2vw,88px);
    --fs-display-1:clamp(40px,5.4vw,76px);
    --fs-display-2:clamp(38px,5vw,64px);
    --fs-display-3:clamp(38px,5vw,60px);
    --fs-h2-a:clamp(30px,4vw,52px);
    --fs-h2-b:clamp(28px,3.6vw,42px);
    --fs-h2-c:clamp(26px,3.2vw,38px);
    --fs-h2-static:32px; --fs-h3:28px; --fs-serif-row:21px;
    --fs-score:120px; --fs-quote-lg:clamp(20px,2.4vw,26px);
    --fs-lead:19px; --fs-body:16px; --fs-body-sm:14px; --fs-body-xs:13px;
    --fs-wordmark:15px; --fs-mono:13px; --fs-mono-label:11px; --fs-code:12.5px;
    /* one subtle motion token (GAP-FILL) */
    --t:140ms ease;
    /* the only allowed shadow — the live badge */
    --shadow-badge:0 1px 2px rgba(0,0,0,0.1);
  }

  *{margin:0;padding:0;box-sizing:border-box}
  html{-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
  body{background:var(--bg);color:var(--text);font-family:var(--sans);line-height:1.6}
  a{color:inherit;text-decoration:none}
  input{outline:none;font-family:inherit}
  ::selection{background:#1FA85E;color:#fff}

  /* ── type scale ─────────────────────────────────────────────────────────── */
  /* Newsreader weight 500 for display, never for body; Libre Franklin for prose;
     JetBrains Mono for any data, label, score, or code. */
  .serif{font-family:var(--serif)}
  .mono{font-family:var(--mono)}
  .display-hero{font-family:var(--serif);font-weight:500;font-size:var(--fs-display-hero);line-height:0.98;letter-spacing:-0.02em;color:var(--text)}
  .display{font-family:var(--serif);font-weight:500;line-height:1.0;letter-spacing:-0.02em;color:var(--text)}
  .score-numeral{font-family:var(--serif);font-weight:500;font-size:var(--fs-score);line-height:0.8;letter-spacing:-0.03em}
  .voice{font-family:var(--serif);font-style:italic;line-height:1.3}
  .mono-eyebrow{font-family:var(--mono);font-size:var(--fs-mono);color:var(--clean-text);letter-spacing:0}
  .mono-label{font-family:var(--mono);font-size:var(--fs-mono-label);color:var(--text-4);letter-spacing:0}
  .lead{font-size:var(--fs-lead);line-height:1.6;color:var(--text-2)}

  /* ── the signature section-ledger rule device ──────────────────────────── */
  /* A 1.5px ink top rule above a mono label. Structural print-grade hierarchy,
     not a decorative accent stripe (which the detector flags). */
  .section-ledger{border-top:1.5px solid #181815;padding-top:14px}
  .section-ledger .mono-label,.ledger-label{font-family:var(--mono);font-size:12px;font-weight:500;color:var(--text-4);letter-spacing:0}

  /* ── focus, press, and disabled states (GAP-FILL: a11y) ─────────────────── */
  /* Never ship a bare outline:none. A keyboard focus ring on every focusable. */
  :focus-visible{outline:2px solid #1FA85E;outline-offset:2px;border-radius:2px}
  button:active,a.btn:active{filter:brightness(0.92)}
  button:disabled,button[disabled],input:disabled,input[disabled]{
    opacity:0.5;cursor:not-allowed;filter:saturate(0.7);
  }

  /* ── motion (GAP-FILL) ──────────────────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce){
    *,*::before,*::after{
      animation-duration:0.001ms !important;animation-iteration-count:1 !important;
      transition-duration:0.001ms !important;scroll-behavior:auto !important;
    }
  }

  /* ── responsive helpers (GAP-FILL: the export ships no @media) ───────────── */
  /* Opt-in stacking classes the rebuilt screens apply to their grids. */
  @media (max-width:900px){
    .stack-900{grid-template-columns:1fr !important}
    .axes-900{grid-template-columns:1fr 1fr !important}
    .nowrap{white-space:nowrap}
  }
  @media (max-width:640px){
    .stack-640{grid-template-columns:1fr !important}
    .bars-640{grid-template-columns:repeat(2,1fr) !important}
    .pad-640{padding-left:20px !important;padding-right:20px !important}
  }

  /* ── legacy eyebrow chip kept renderable until pages migrate to the ledger ── */
  .eyebrow{display:flex;align-items:center;gap:10px;margin-bottom:10px}
  .eyebrow .reg{font-family:var(--mono);font-size:12px;color:var(--clean-text);letter-spacing:0}
  .eyebrow .reg-label{font-family:var(--mono);font-size:11.5px;color:var(--text-4);letter-spacing:0}`;
