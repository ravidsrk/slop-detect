/** @jsxRuntime automatic @jsxImportSource hono/jsx */
// Result composite components — the shared body of the Result screen.
//
// The /score/:domain hub (task 03) is the canonical caller; the /r/:id permalink
// (task 04) and the printable /report/:domain (task 05) compose the SAME pieces so
// the three surfaces render one Result. Everything here is driven by the persisted
// "slim" scan record (see _data.ts > slimResult) joined to the engine's STATIC
// metadata (PATTERNS / FIXES / AEO_CHECKS): the slim keeps triggered patterns as
// { id, label, short, weight } but drops per-pattern evidence and the full pattern
// list, so the category bars, breakdown, radar, and fix cards are RECONSTRUCTED by
// joining the triggered ids back to the engine — never fabricated. Where a datum
// genuinely isn't persisted (per-scan AEO pass/fail, same-category neighbours), the
// dogfood rule wins: show the checklist or omit the chart, don't invent a number.
//
// Tokens come from _brand.ts (BRAND_CSS) and the shared shell from _ui.tsx; color
// is resolved through _theme.ts so every tier/grade hue has one source. Pages embed
// RESULT_CSS alongside BRAND_CSS + UI_CSS. This file imports the foundation but does
// not edit it (foundation acceptance gate).

import { PATTERNS, FIXES, AEO_CHECKS } from '@slop-detect/core';
import { jsonForScript } from './_render.js';
import { tierFill, tierText, tierPillBg, systemAxisColor } from './_theme.js';
import { LetterAvatar, ScoreTierBadge, LiveBadge, Button, SectionLedger } from './_ui.js';

// ── category taxonomy ─────────────────────────────────────────────────────────
// The five overview bars map the engine's pattern categories to the design's
// display names (design "Category overview bars" / Result inventory section 4).
const CATS = [
  { key: 'fonts', label: 'Type' },
  { key: 'colors', label: 'Color' },
  { key: 'layout', label: 'Layout' },
  { key: 'css', label: 'Effects' },
  { key: 'images', label: 'Imagery' },
];

// Precompute, once, the maximum slop weight each category can contribute and an
// id → pattern lookup, so the view-model join is O(triggered).
const CAT_MAX: Record<string, number> = {};
for (const p of PATTERNS as any[]) CAT_MAX[p.category] = (CAT_MAX[p.category] || 0) + p.weight;
const PATTERN_BY_ID = new Map((PATTERNS as any[]).map((p) => [p.id, p]));

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const firstSentence = (s: string) => {
  const t = String(s || '').trim();
  if (!t) return '';
  const m = t.match(/^.*?[.!?](?:\s|$)/);
  return (m ? m[0] : t).trim();
};

// ── view-model ──────────────────────────────────────────────────────────────
// Pure: turn a slim record into everything the components render. Exported so the
// permalink/report pages (and tests) can build the same model.
export function buildResultView(slim: any) {
  const triggered = (slim?.triggered || []).filter(Boolean);

  // Per-category rollup, in the fixed display order.
  const categories = CATS.map((c) => {
    const hits = triggered.filter((t: any) => PATTERN_BY_ID.get(t.id)?.category === c.key);
    const weight = hits.reduce((s: number, t: any) => s + (t.weight || 0), 0);
    const max = CAT_MAX[c.key] || 0;
    const ratio = max > 0 ? clamp01(weight / max) : 0;
    const tier = hits.length === 0 ? 'Clean' : ratio >= 0.5 ? 'Heavy' : 'Mild';
    return {
      key: c.key,
      label: c.label,
      flagged: hits.length,
      weight,
      cleanPct: Math.round((1 - ratio) * 100),
      cleanFraction: 1 - ratio,
      tier,
      patterns: hits
        .slice()
        .sort((a: any, b: any) => (b.weight || 0) - (a.weight || 0))
        .map((t: any) => ({
          id: t.id,
          label: t.label || t.short || t.id,
          short: t.short || '',
          weight: t.weight || 0,
          why: firstSentence(FIXES[t.id]?.problem || ''),
        })),
    };
  });

  // Fix cards: the heaviest design tells that have a remediation recipe.
  const fixes = triggered
    .filter((t: any) => FIXES[t.id])
    .slice()
    .sort((a: any, b: any) => (b.weight || 0) - (a.weight || 0))
    .map((t: any) => ({
      id: t.id,
      label: t.label || t.short || t.id,
      weight: t.weight || 0,
      why: FIXES[t.id].problem,
      fix: FIXES[t.id].fix,
      rule: FIXES[t.id].rule,
    }));

  return {
    triggered,
    categories,
    fixes,
    flaggedTotal: slim?.patternsFlagged ?? triggered.length,
    patternsTotal: slim?.patternsTotal ?? PATTERNS.length,
  };
}

// Assemble the copyable fix prompt from the triggered patterns' recipes. Built
// from the persisted ids + FIXES (the engine's buildFixPrompt needs the full
// pattern list + evidence, which the slim record does not keep).
export function assembleFixPrompt(slim: any, view: any) {
  const url = slim.finalUrl || slim.url || `https://${slim.domain}`;
  if (!view.fixes.length) {
    return `${slim.domain} scored ${slim.score}/100 (tier ${slim.tier}) on the AI-design-slop detector and triggered 0 of ${view.patternsTotal} patterns. Nothing to fix on the design axis.`;
  }
  const lines = [
    `# Landing page slop fix prompt`,
    ``,
    `${url} scored ${slim.score}/100 on the AI-design-slop detector — tier ${slim.tier} — triggering ${view.flaggedTotal} of ${view.patternsTotal} patterns. Reduce the score below 10 (Clean) by addressing each pattern below.`,
    ``,
    `## Issues to fix (highest weight first)`,
  ];
  view.fixes.forEach((f: any, i: number) => {
    lines.push(
      ``,
      `### ${i + 1}. ${f.label} (+${f.weight})`,
      ``,
      `Why this reads as AI-slop: ${f.why}`,
      ``,
      `Fix: ${f.fix}`,
      ``,
      `Hard rule: ${f.rule}`
    );
  });
  lines.push(
    ``,
    `Do not replace one slop pattern with another. Keep everything not listed above — it already passes.`
  );
  return lines.join('\n');
}

// ── result-level styles ───────────────────────────────────────────────────────
// Light-first; everything references BRAND_CSS tokens. Literal hexes appear only
// for the flat chart fills (rgba tints — never a gradient) the design names.
export const RESULT_CSS = `
  .result{max-width:1040px;margin:0 auto;padding:36px var(--pad-x) 0}
  .result-section{padding:34px 0}
  .result-section + .result-section{border-top:1px solid var(--border-2)}
  .rs-ledger{margin-bottom:16px}

  /* domain header */
  .rh{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
  .rh-id{display:flex;align-items:center;gap:12px;min-width:0}
  .rh-dom{font-family:var(--mono);font-size:20px;color:var(--text);word-break:break-all}
  .rh-scanned{font-family:var(--mono);font-size:12.5px;color:var(--text-4);margin-top:3px}
  .rh-spacer{flex:1}

  /* big score block */
  .bs{display:grid;grid-template-columns:1fr auto;gap:28px 40px;align-items:start;margin-top:8px}
  .bs-num{font-family:var(--serif);font-weight:500;font-size:var(--fs-score);line-height:0.8;letter-spacing:-0.03em;white-space:nowrap}
  .bs-num small{font-family:var(--serif);font-weight:500;font-size:42px;color:var(--text-6);letter-spacing:-0.02em}
  .bs-meta{margin-top:18px}
  .bs-gt{font-family:var(--mono);font-size:13px;color:var(--text-3)}
  .bs-grade{font-weight:700}
  .bs-rank{font-family:var(--mono);font-size:13px;color:var(--text-4);margin-top:4px}
  .bs-rank strong{color:var(--text-3);font-weight:700}
  .bs-verdict{font-family:var(--serif);font-style:italic;font-size:22px;line-height:1.32;color:var(--text-2);margin-top:16px;max-width:34ch}
  .bs-actions{display:flex;flex-direction:column;align-items:flex-end;gap:9px;font-family:var(--mono);font-size:13px}
  .bs-action{color:var(--text-3)}
  .bs-action:hover{color:var(--text)}

  /* category overview bars */
  .cbars{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}
  .cbar-track{height:8px;border-radius:4px;background:var(--track);overflow:hidden}
  .cbar-fill{height:100%;border-radius:4px}
  .cbar-name{font-family:var(--mono);font-size:12.5px;color:var(--text-2);margin-top:9px}
  .cbar-sub{font-family:var(--mono);font-size:11.5px;color:var(--text-4);margin-top:2px}

  /* expandable breakdown */
  .bd-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
  .bd-count{font-family:var(--mono);font-size:13px;color:var(--text-4)}
  .bd{border:1px solid var(--border);border-radius:8px;overflow:hidden;background:var(--panel)}
  .bd-row + .bd-row{border-top:1px solid var(--border-2)}
  .bd-toggle{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:transparent;border:0;cursor:pointer;padding:15px 18px;font:inherit;color:inherit}
  .bd-caret{font-family:var(--mono);font-size:12px;color:var(--text-4);width:12px;flex:none}
  .bd-cat{font-family:var(--serif);font-size:var(--fs-serif-row);color:var(--text);font-weight:500}
  .bd-pill{font-family:var(--mono);font-size:11px;font-weight:700;padding:2px 9px;border-radius:4px;letter-spacing:0.02em}
  .bd-n{font-family:var(--mono);font-size:12px;color:var(--text-4);margin-left:auto;white-space:nowrap}
  .bd-body{padding:2px 18px 14px 42px;display:none}
  .bd-row[data-open="1"] .bd-body{display:block}
  .bd-pat{display:grid;grid-template-columns:20px 1fr 44px;gap:8px;padding:11px 0;border-top:1px solid var(--row-inner)}
  .bd-pat:first-child{border-top:0}
  .bd-x{color:var(--heavy);font-family:var(--mono)}
  .bd-pl{font-size:15px;font-weight:600;color:var(--text)}
  .bd-ev{font-family:var(--mono);font-size:12px;color:var(--text-5);margin-top:3px}
  .bd-why{font-size:13px;color:var(--text-3);margin-top:4px;line-height:1.5}
  .bd-w{font-family:var(--mono);font-size:13px;font-weight:700;color:var(--heavy-text);text-align:right;white-space:nowrap}
  .bd-clean{padding:13px 18px 15px 42px;font-family:var(--mono);font-size:13px;color:var(--clean-text)}

  /* four-axis strip */
  .axis-note{font-family:var(--mono);font-size:12px;color:var(--text-4);margin-bottom:12px}
  .axes{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
  .axis{border:1px solid var(--border);border-radius:6px;background:var(--panel);padding:15px 16px}
  .axis-k{font-family:var(--mono);font-size:11.5px;color:var(--text-4)}
  .axis-v{font-family:var(--mono);font-size:17px;font-weight:700;margin-top:8px}
  .axis-t{font-family:var(--mono);font-size:12px;color:var(--text-4);margin-top:3px}

  /* system + AEO detail cards */
  .sa{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .sa-card{border:1px solid var(--border);border-radius:6px;background:var(--panel);padding:18px 20px}
  .sa-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:12px}
  .sa-title{font-family:var(--mono);font-size:12.5px;color:var(--text-3)}
  .sa-tier{font-family:var(--mono);font-size:13px;font-weight:700}
  .sa-ok{font-family:var(--mono);font-size:13px;color:var(--clean-text)}
  .sa-absent{font-family:var(--mono);font-size:13px;color:var(--text-4);line-height:1.6}
  .sa-drift{display:flex;gap:9px;padding:7px 0;border-top:1px solid var(--row-inner);font-size:13px;color:var(--text-2);line-height:1.5}
  .sa-drift:first-of-type{border-top:0}
  .sa-tag{font-family:var(--mono);font-size:11px;color:var(--mild-text);flex:none;margin-top:2px}
  .aeo-row{display:grid;grid-template-columns:16px 1fr 30px;gap:8px;align-items:baseline;padding:6px 0;border-top:1px solid var(--row-inner)}
  .aeo-row:first-of-type{border-top:0}
  .aeo-mark{font-family:var(--mono);font-size:13px}
  .aeo-label{font-family:var(--mono);font-size:12.5px;color:var(--text-2);line-height:1.4}
  .aeo-w{font-family:var(--mono);font-size:12px;color:var(--text-6);text-align:right}
  .aeo-foot{font-family:var(--mono);font-size:11.5px;color:var(--text-4);margin-top:11px;line-height:1.5}

  /* competitive analytics */
  .analytics{display:grid;grid-template-columns:1fr 1fr;gap:28px}
  .chart-card{border:1px solid var(--border);border-radius:6px;background:var(--panel);padding:16px 18px}
  .chart-h{font-family:var(--mono);font-size:12px;color:var(--text-4);margin-bottom:10px}
  .chart svg{display:block;width:100%;height:auto}
  .chart-delta{font-family:var(--mono);font-size:12px;margin-top:8px}
  .chart-cap{font-family:var(--mono);font-size:12px;color:var(--text-4);margin-top:8px}
  .chart-cap strong{color:var(--text-2)}

  /* fixes panel */
  .fixes{border:1px solid var(--border);border-radius:10px;background:var(--panel);padding:38px 36px}
  .fixes-h{font-family:var(--serif);font-weight:500;font-size:var(--fs-h3);line-height:1.05;letter-spacing:-0.02em;text-align:center;color:var(--text)}
  .fixes-sub{font-family:var(--mono);font-size:13px;color:var(--text-4);text-align:center;margin-top:8px}
  .fix{border:1px solid var(--border-2);border-radius:8px;background:var(--bg);padding:20px 22px;margin-top:18px}
  .fix-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:12px}
  .fix-label{font-family:var(--mono);font-size:14px;font-weight:600;color:var(--text)}
  .fix-x{color:var(--heavy)}
  .fix-w{font-family:var(--mono);font-size:13px;font-weight:700;color:var(--heavy-text);white-space:nowrap}
  .fix-grid{display:grid;grid-template-columns:46px 1fr;gap:6px 12px}
  .fix-k{font-family:var(--mono);font-size:12px}
  .fix-k.why{color:var(--mild-text)}
  .fix-k.fix{color:var(--clean-text)}
  .fix-k.rule{color:var(--text-4)}
  .fix-v{font-size:13.5px;color:var(--text-2);line-height:1.55}
  .fix-foot{display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:24px}
  .fix-cli{font-family:var(--mono);font-size:12.5px;color:var(--text-4)}
  .fixes-clean{text-align:center;font-family:var(--serif);font-style:italic;font-size:18px;color:var(--clean-text);padding:6px 0}

  /* share + embed */
  .se{display:grid;grid-template-columns:1fr 1fr;gap:18px}
  .se-card{border:1px solid var(--border);border-radius:10px;background:var(--panel);padding:24px 26px}
  .se-title{font-family:var(--mono);font-size:12px;color:var(--text-4);margin-bottom:14px}
  .se-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
  .se-badge{margin:0 0 14px}
  .se-md{margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;align-items:center}

  /* claim / listed */
  .claim{border:1px solid var(--border);border-radius:10px;background:var(--panel);padding:24px 26px}
  .claim-h{font-family:var(--serif);font-weight:500;font-size:21px;letter-spacing:-0.01em;color:var(--text);margin-bottom:8px}
  .claim p{font-size:14px;color:var(--text-2);line-height:1.6;max-width:62ch}
  .claim a{color:var(--clean-text);text-decoration:underline}
  .claim-form{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
  .claim-form input{flex:1;min-width:220px;background:var(--bg);border:1px solid var(--border-btn);border-radius:3px;color:var(--text);font-family:var(--mono);font-size:14px;padding:11px 14px}
  .claim-msg{margin-top:12px;font-family:var(--mono);font-size:13px;color:var(--text-3);min-height:1.2em}

  /* loading skeleton + error/retry (GAP-FILL states) */
  .rl-dom{display:flex;align-items:center;gap:12px;font-family:var(--mono);font-size:20px;color:var(--text-3)}
  .rl-dot{width:10px;height:10px;border-radius:var(--r-round);background:var(--neutral);flex:none}
  .rl-num{font-family:var(--serif);font-weight:500;font-size:var(--fs-score);line-height:0.8;color:var(--text-6);margin-top:8px}
  .rl-verdict{font-family:var(--serif);font-style:italic;font-size:20px;color:var(--text-4);margin-top:12px}
  .rl-slot{height:8px;border-radius:4px;background:var(--bg-2);margin-top:14px}
  .re{max-width:560px}
  .re-h{font-family:var(--serif);font-weight:500;font-size:var(--fs-h3);letter-spacing:-0.02em;color:var(--text)}
  .re-body{font-size:15px;color:var(--text-2);line-height:1.6;margin:12px 0 22px;max-width:60ch}
  .re-row{display:flex;gap:12px;flex-wrap:wrap}

  /* flash toast (copy/share confirmation) */
  .flash{position:fixed;bottom:26px;left:50%;transform:translateX(-50%);background:var(--text);color:var(--d-text);font-family:var(--mono);font-size:13px;padding:10px 18px;border-radius:4px;opacity:0;transition:opacity var(--t);pointer-events:none;z-index:60}
  .flash.show{opacity:1}

  /* chart draw: only when motion is welcome (GAP-FILL: reduced-motion, design Gaps 7) */
  @media (prefers-reduced-motion: no-preference){
    .chart-draw{stroke-dasharray:1200;stroke-dashoffset:1200;animation:resultDraw 900ms ease forwards}
    @keyframes resultDraw{to{stroke-dashoffset:0}}
  }

  @media (max-width:900px){
    .analytics{grid-template-columns:1fr}
    .axes{grid-template-columns:1fr 1fr}
    .sa{grid-template-columns:1fr}
    .se{grid-template-columns:1fr}
    .bs{grid-template-columns:1fr}
    .bs-actions{align-items:flex-start}
  }
  @media (max-width:640px){
    .result{padding-left:20px;padding-right:20px}
    .cbars{grid-template-columns:repeat(2,1fr)}
    .fixes{padding:26px 20px}
  }
`;

// ── inline progressive-enhancement script ──────────────────────────────────────
// One script for the whole Result: a flash toast, clipboard copy (badge markdown +
// the full fix prompt), share-to-X, the keyboard-operable breakdown toggles
// (aria-expanded), and the claim form POST. Hostile field values reach the script
// only through jsonForScript, so a value containing </script> comes out <-
// escaped and cannot break out of the element (see inline-scripts.test.js).
export function resultScript(opts: {
  shareText: string;
  shareUrl: string;
  fixPrompt?: string;
  badgeMd?: string;
  domain?: string;
  claim?: boolean;
}) {
  const j = jsonForScript;
  return `(function(){
  var flashEl=document.getElementById('flash');
  function flash(m){if(!flashEl)return;flashEl.textContent=m;flashEl.classList.add('show');setTimeout(function(){flashEl.classList.remove('show')},1700);}
  function copy(text,label,el,done){if(!navigator.clipboard){return;}navigator.clipboard.writeText(text).then(function(){flash('✓ '+label);if(el&&done){var o=el.textContent;el.textContent=done;setTimeout(function(){el.textContent=o},1700);}}).catch(function(){});}

  var SHARE_TEXT=${j(opts.shareText)};
  var SHARE_URL=${j(opts.shareUrl)};
  var sx=document.getElementById('shareX');
  if(sx)sx.addEventListener('click',function(){window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(SHARE_TEXT)+'&url='+encodeURIComponent(SHARE_URL),'_blank','noopener');});
  var sc=document.getElementById('copyLink');
  if(sc)sc.addEventListener('click',function(){copy(SHARE_URL,'link copied',sc,'link copied ✓');});

  var BADGE_MD=${j(opts.badgeMd || '')};
  var bm=document.getElementById('badgeMd');
  if(bm)bm.addEventListener('click',function(){copy(BADGE_MD,'copied',null);});
  var cb=document.getElementById('copyMd');
  if(cb)cb.addEventListener('click',function(){copy(BADGE_MD,'copied',cb,'copied ✓');});

  var FIX_PROMPT=${j(opts.fixPrompt || '')};
  var cf=document.getElementById('copyFix');
  if(cf)cf.addEventListener('click',function(){copy(FIX_PROMPT,'copied the fix prompt',cf,'copied the fix prompt ✓');});

  document.querySelectorAll('[data-toggle]').forEach(function(btn){
    btn.addEventListener('click',function(){
      var row=btn.closest('.bd-row');var open=row.getAttribute('data-open')==='1';
      row.setAttribute('data-open',open?'0':'1');
      btn.setAttribute('aria-expanded',open?'false':'true');
      var caret=btn.querySelector('.bd-caret');if(caret)caret.textContent=open?'▸':'▾';
    });
  });

  var clf=document.getElementById('claimForm');
  if(clf)clf.addEventListener('submit',function(e){
    e.preventDefault();
    var email=(document.getElementById('claimEmail')||{}).value;
    var msg=document.getElementById('claimMsg');
    if(msg)msg.textContent='Submitting…';
    fetch('/api/watch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({domain:${j(opts.domain || '')},email:(email||'').trim(),list:true})})
      .then(function(r){return r.json().catch(function(){return {};}).then(function(jb){return {ok:r.ok,b:jb};});})
      .then(function(res){if(msg)msg.textContent=res.ok?(res.b.note||'Check your email to confirm ownership and switch on the backlink.'):(res.b.error||'Could not submit. Try again.');})
      .catch(function(){if(msg)msg.textContent='Network error. Try again.';});
  });
})();`;
}

// ── components ──────────────────────────────────────────────────────────────

// 2. Domain header: letter-avatar + mono domain + scanned-line + tier badge pill.
export function DomainHeader({ slim, monitored = false }: { slim: any; monitored?: boolean }) {
  const scanned = (slim.createdAt || '').replace('T', ' ').slice(0, 16);
  const ms = slim.scanMs ? ` · ${(slim.scanMs / 1000).toFixed(1)}s` : '';
  return (
    <div class="rh">
      <div class="rh-id">
        <LetterAvatar name={slim.domain} size={30} />
        <div>
          <div class="rh-dom">{slim.domain}</div>
          <div class="rh-scanned">
            {scanned ? `scanned ${scanned} UTC` : 'scan on record'}
            {ms}
            {slim.definitionsVersion ? ` · defs ${slim.definitionsVersion}` : ''}
            {monitored ? ' · monitored' : ''}
          </div>
        </div>
      </div>
      <span class="rh-spacer" />
      <ScoreTierBadge tier={slim.tier} score={slim.score} grade={slim.grade} />
    </div>
  );
}

// 3. Big score block: the 120px serif numeral, grade·tier, rank, verdict, actions.
export function BigScore({
  slim,
  rank,
  origin = '',
}: {
  slim: any;
  rank?: { n: number; of: number; cleanerThanPct: number } | null;
  origin?: string;
}) {
  const fg = tierText(slim.tier);
  const actions = [
    { label: 'Fix with AI →', href: '#fixes' },
    { label: 'Get the badge →', href: '#embed' },
    { label: 'Rescan →', href: `${origin}/?url=${encodeURIComponent(slim.domain)}` },
    { label: 'Printable report →', href: `${origin}/report/${slim.domain}` },
    { label: 'This scan →', href: `${origin}/r/${slim.id}` },
  ];
  return (
    <div class="bs">
      <div>
        <div class="bs-num" style={`color:${fg}`}>
          {slim.score}
          <small>/100</small>
        </div>
        <div class="bs-meta">
          <div class="bs-gt">
            <span class="bs-grade" style={`color:${fg}`}>
              {slim.grade}
            </span>{' '}
            · {slim.tier} · {slim.patternsFlagged}/{slim.patternsTotal} patterns flagged
          </div>
          {rank ? (
            <div class="bs-rank">
              Cleaner than <strong>{rank.cleanerThanPct}%</strong> · rank <strong>#{rank.n}</strong>{' '}
              of {rank.of.toLocaleString('en-US')} scans
            </div>
          ) : null}
          {slim.verdict ? <p class="bs-verdict">{slim.verdict}</p> : null}
        </div>
      </div>
      <div class="bs-actions">
        <button class="bs-action" id="shareX" type="button">
          Share →
        </button>
        {actions.map((a) => (
          <a class="bs-action" href={a.href}>
            {a.label}
          </a>
        ))}
      </div>
    </div>
  );
}

// 4. Category overview: five status bars (fill width = clean %, color = tier).
export function CategoryBars({ categories }: { categories: any[] }) {
  return (
    <div class="cbars">
      {categories.map((c) => (
        <div>
          <div
            class="cbar-track"
            role="img"
            aria-label={`${c.label}: ${c.cleanPct}% clean${c.flagged ? `, ${c.flagged} flagged` : ''}`}
          >
            <div class="cbar-fill" style={`width:${c.cleanPct}%;background:${tierFill(c.tier)}`} />
          </div>
          <div class="cbar-name">{c.label}</div>
          <div class="cbar-sub">{c.flagged ? `+${c.weight} · ${c.flagged} flagged` : 'clean'}</div>
        </div>
      ))}
    </div>
  );
}

// 5. Expandable breakdown: one row per category; the first dirty category is open
// by default. Toggles are real <button>s with aria-expanded (keyboard-operable).
export function Breakdown({
  categories,
  flaggedTotal,
  patternsTotal,
}: {
  categories: any[];
  flaggedTotal: number;
  patternsTotal: number;
}) {
  let firstDirtyDone = false;
  return (
    <>
      <div class="bd-head">
        <SectionLedger tag="" label="the breakdown" />
        <span class="bd-count">
          {flaggedTotal} of {patternsTotal} patterns flagged
        </span>
      </div>
      <div class="bd">
        {categories.map((c) => {
          const open = c.flagged > 0 && !firstDirtyDone;
          if (open) firstDirtyDone = true;
          const id = `bd-${c.key}`;
          return (
            <div class="bd-row" data-open={open ? '1' : '0'}>
              <button
                class="bd-toggle"
                type="button"
                data-toggle
                aria-expanded={open ? 'true' : 'false'}
                aria-controls={id}
              >
                <span class="bd-caret" aria-hidden="true">
                  {open ? '▾' : '▸'}
                </span>
                <span class="bd-cat">{c.label}</span>
                <span
                  class="bd-pill"
                  style={`background:${tierPillBg(c.tier)};color:${tierText(c.tier)}`}
                >
                  {c.tier}
                </span>
                <span class="bd-n">{c.flagged ? `${c.flagged} flagged` : 'clean'}</span>
              </button>
              <div class="bd-body" id={id}>
                {c.patterns.length ? (
                  c.patterns.map((p: any) => (
                    <div class="bd-pat">
                      <span class="bd-x" aria-hidden="true">
                        ✗
                      </span>
                      <div>
                        <div class="bd-pl">{p.label}</div>
                        {p.short ? <div class="bd-ev">{p.short}</div> : null}
                        {p.why ? <div class="bd-why">{p.why}</div> : null}
                      </div>
                      <span class="bd-w">+{p.weight}</span>
                    </div>
                  ))
                ) : (
                  <div class="bd-clean">✓ clean, no tells in this category.</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// 6. Four-axis strip: design slop, copy slop, system, AEO + the polarity note.
export function AxisStrip({ slim }: { slim: any }) {
  const copy = slim.axes?.copy || null;
  const sys = slim.system || null;
  const cells = [
    {
      k: 'design slop',
      v: `${slim.score}/100`,
      t: slim.tier,
      color: tierText(slim.tier),
    },
    copy
      ? { k: 'copy slop', v: `${copy.score}/100`, t: copy.tier, color: tierText(copy.tier) }
      : { k: 'copy slop', v: 'not run', t: '', color: 'var(--text-4)' },
    sys
      ? {
          k: 'system · DESIGN.md',
          v: `${sys.score}/100`,
          t: sys.tier,
          color: systemAxisColor(sys.score),
        }
      : { k: 'system · DESIGN.md', v: 'none', t: 'no DESIGN.md', color: 'var(--text-4)' },
    { k: 'AEO · agent-readable', v: 'not run', t: 'scan to evaluate', color: 'var(--text-4)' },
  ];
  return (
    <>
      <div class="axis-note">slop: lower is better · system & AEO: higher is better</div>
      <div class="axes">
        {cells.map((c) => (
          <div class="axis">
            <div class="axis-k">{c.k}</div>
            <div class="axis-v" style={`color:${c.color}`}>
              {c.v}
            </div>
            {c.t ? <div class="axis-t">{c.t}</div> : null}
          </div>
        ))}
      </div>
    </>
  );
}

// 7. System drift card + AEO eight-check card. The system axis is persisted; AEO
// pass/fail is not, so the AEO card lists the eight checks (what AEO measures) and
// says it is evaluated on a fresh scan rather than faking ✓/✗.
export function SystemAeoCards({ slim }: { slim: any }) {
  const sys = slim.system || null;
  const sysTierColor = sys ? systemAxisColor(sys.score) : 'var(--text-4)';
  return (
    <div class="sa">
      <div class="sa-card">
        <div class="sa-head">
          <span class="sa-title">system · DESIGN.md drift</span>
          {sys ? (
            <span class="sa-tier" style={`color:${sysTierColor}`}>
              {sys.tier} · {sys.score}
            </span>
          ) : null}
        </div>
        {!sys ? (
          <p class="sa-absent">
            No DESIGN.md declared. Add a design system file to track drift between redesigns.
          </p>
        ) : (sys.drift || []).length === 0 ? (
          <p class="sa-ok">✓ aligned with its declared DESIGN.md, no drift.</p>
        ) : (
          (sys.drift || []).map((d: any) => (
            <div class="sa-drift">
              <span class="sa-tag">drift</span>
              <span>{d.message || d.id}</span>
            </div>
          ))
        )}
      </div>
      <div class="sa-card">
        <div class="sa-head">
          <span class="sa-title">AEO · agent-readable</span>
        </div>
        {(AEO_CHECKS as any[]).map((chk) => (
          <div class="aeo-row">
            <span class="aeo-mark" style="color:var(--text-6)" aria-hidden="true">
              ·
            </span>
            <span class="aeo-label">{chk.label}</span>
            <span class="aeo-w">+{chk.weight}</span>
          </div>
        ))}
        <p class="aeo-foot">
          Eight checks, weighted to 100. Evaluated live per scan. Run a fresh scan to see pass/fail.
        </p>
      </div>
    </div>
  );
}

// ── charts (inline SVG, no chart library) ──────────────────────────────────────

// Score over time: a flat tier-fill area + a 2px line; a delta label vs the first
// recorded scan. The line draws in only when motion is welcome.
function ScoreOverTime({ points }: { points: any[] }) {
  const W = 320,
    H = 110,
    padX = 6,
    padTop = 8,
    padBot = 16;
  const innerW = W - padX * 2,
    innerH = H - padTop - padBot;
  const n = points.length;
  const x = (i: number) => padX + (innerW * i) / (n - 1);
  const y = (s: number) => padTop + (innerH * Math.max(0, Math.min(100, s))) / 100;
  const line = points
    .map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`)
    .join(' ');
  const area = `${line} L${x(n - 1).toFixed(1)},${(H - padBot).toFixed(1)} L${padX},${(H - padBot).toFixed(1)} Z`;
  const last = points[n - 1];
  const first = points[0];
  const stroke = tierText(last.tier);
  const fill =
    last.tier === 'Heavy'
      ? 'rgba(201,64,46,0.10)'
      : last.tier === 'Mild'
        ? 'rgba(216,154,46,0.10)'
        : 'rgba(31,168,94,0.10)';
  const cleanY = y(10).toFixed(1);
  const delta = last.score - first.score;
  const deltaColor =
    delta < 0 ? 'var(--clean-text)' : delta > 0 ? 'var(--heavy-text)' : 'var(--text-4)';
  const deltaTxt =
    delta === 0
      ? 'no change since first scan'
      : `${delta < 0 ? '−' : '+'}${Math.abs(delta)} pts since first scan`;
  return (
    <div class="chart-card">
      <div class="chart-h">score over time</div>
      <div class="chart">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="slop score over time"
          preserveAspectRatio="none"
        >
          <line
            x1={padX}
            y1={cleanY}
            x2={W - padX}
            y2={cleanY}
            stroke="#D7D9D2"
            stroke-width="1"
            stroke-dasharray="3 4"
          />
          <path d={area} fill={fill} stroke="none" />
          <path
            class="chart-draw"
            d={line}
            fill="none"
            stroke={stroke}
            stroke-width="2"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
        </svg>
      </div>
      <div class="chart-delta" style={`color:${deltaColor}`}>
        {deltaTxt}
      </div>
    </div>
  );
}

// Cleanliness radar: a pentagon over the five categories. The "you" polygon is the
// per-category clean fraction; two guide rings frame it. No rank-average polygon —
// per-category corpus averages are not persisted, so it is omitted rather than faked.
function Radar({ categories, tier }: { categories: any[]; tier: string }) {
  const W = 220,
    H = 150,
    cx = W / 2,
    cy = H / 2 + 6,
    R = 56;
  const n = categories.length;
  const ptAt = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const ring = (r: number) =>
    categories
      .map((_, i) =>
        ptAt(i, r)
          .map((v) => v.toFixed(1))
          .join(',')
      )
      .join(' ');
  const you = categories
    .map((c, i) =>
      ptAt(i, R * clamp01(c.cleanFraction))
        .map((v) => v.toFixed(1))
        .join(',')
    )
    .join(' ');
  const stroke = tierText(tier);
  return (
    <div class="chart-card">
      <div class="chart-h">cleanliness radar</div>
      <div class="chart">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="per-category cleanliness radar">
          <polygon points={ring(R)} fill="none" stroke="#D7D9D2" stroke-width="1" />
          <polygon points={ring(R * 0.5)} fill="none" stroke="#E2E4DD" stroke-width="1" />
          <polygon
            class="chart-draw"
            points={you}
            fill="rgba(31,168,94,0.14)"
            stroke={stroke}
            stroke-width="2"
          />
          {categories.map((c, i) => {
            const [lx, ly] = ptAt(i, R + 12);
            return (
              <text
                x={lx.toFixed(1)}
                y={ly.toFixed(1)}
                fill="#9A9B8E"
                font-size="8"
                font-family="var(--mono)"
                text-anchor={lx < cx - 4 ? 'end' : lx > cx + 4 ? 'start' : 'middle'}
              >
                {c.label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// Slop distribution: a 10-bucket histogram with the domain's own bucket highlighted.
function Distribution({ dist, score, tier }: { dist: number[]; score: number; tier: string }) {
  const buckets = new Array(10).fill(0);
  let total = 0;
  for (let i = 0; i <= 100; i++) {
    const n = dist[i] || 0;
    buckets[Math.min(9, Math.floor(i / 10))] += n;
    total += n;
  }
  const max = Math.max(1, ...buckets);
  const mine = Math.min(9, Math.floor(score / 10));
  let worse = 0;
  for (let i = Math.round(score) + 1; i <= 100; i++) worse += dist[i] || 0;
  const cleanerThan = total ? Math.round((worse / total) * 100) : 0;
  const W = 320,
    H = 110,
    gap = 4,
    bw = (W - gap * 9) / 10;
  return (
    <div class="chart-card">
      <div class="chart-h">slop distribution</div>
      <div class="chart">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="distribution of slop scores across all scans"
        >
          {buckets.map((b, i) => {
            const h = Math.round((b / max) * (H - 10));
            return (
              <rect
                x={(i * (bw + gap)).toFixed(1)}
                y={(H - h).toFixed(1)}
                width={bw.toFixed(1)}
                height={h}
                rx="1"
                fill={i === mine ? tierFill(tier) : '#CDCFC8'}
              />
            );
          })}
        </svg>
      </div>
      <div class="chart-cap">
        cleaner than <strong>{cleanerThan}%</strong> of {total.toLocaleString('en-US')} scans
      </div>
    </div>
  );
}

// 8. Competitive analytics: the charts we can draw from persisted data. Each is
// conditional on having enough data; the section is omitted entirely when none are.
export function Analytics({
  history = [],
  dist,
  slim,
  categories,
}: {
  history?: any[];
  dist?: number[] | null;
  slim: any;
  categories: any[];
}) {
  const points = (history || []).filter((h) => typeof h.score === 'number').slice(-30);
  const totalScans = dist ? dist.reduce((s, n) => s + (n || 0), 0) : 0;
  const showTime = points.length >= 2;
  const showDist = !!dist && totalScans >= 5;
  return (
    <div class="analytics">
      {showTime ? <ScoreOverTime points={points} /> : null}
      <Radar categories={categories} tier={slim.tier} />
      {showDist ? (
        <Distribution dist={dist as number[]} score={slim.score} tier={slim.tier} />
      ) : null}
    </div>
  );
}

// 9. Fixes panel: a fix card (why/fix/rule) per heaviest tell, a copy-prompt button
// and the CLI hint; the clean empty state when nothing triggered.
export function FixesPanel({ fixes, domain }: { fixes: any[]; domain: string }) {
  return (
    <div class="fixes" id="fixes">
      <h2 class="fixes-h">You've seen the score. Now fix it.</h2>
      {fixes.length ? (
        <>
          <p class="fixes-sub">{fixes.length} tells, heaviest first.</p>
          {fixes.map((f) => (
            <div class="fix">
              <div class="fix-head">
                <span class="fix-label">
                  <span class="fix-x" aria-hidden="true">
                    ✗
                  </span>{' '}
                  {f.label}
                </span>
                <span class="fix-w">+{f.weight}</span>
              </div>
              <div class="fix-grid">
                <span class="fix-k why">why</span>
                <span class="fix-v">{f.why}</span>
                <span class="fix-k fix">fix</span>
                <span class="fix-v">{f.fix}</span>
                <span class="fix-k rule">rule</span>
                <span class="fix-v">{f.rule}</span>
              </div>
            </div>
          ))}
          <div class="fix-foot">
            <Button variant="primary" id="copyFix" label="Copy the full fix prompt" />
            <span class="fix-cli">npx slop-detect {domain} --fix</span>
          </div>
        </>
      ) : (
        <p class="fixes-clean">Nothing to fix, this page is already Clean. Keep it that way.</p>
      )}
    </div>
  );
}

// 10. Share + embed card: share buttons + the live badge preview, markdown snippet,
// and a copy button. The badge markdown is the clickable code block.
export function ShareEmbed({
  slim,
  origin,
  pageUrl,
}: {
  slim: any;
  origin: string;
  pageUrl: string;
}) {
  const badgeMd = `[![slop](${origin}/badge/${slim.domain}.svg)](${pageUrl})`;
  return (
    <div class="se" id="embed">
      <div class="se-card">
        <div class="se-title">share</div>
        <div class="se-row">
          <Button variant="outline" id="copyLink" label="Copy link" />
          <Button
            variant="outline"
            id="shareX2"
            label="Post on X"
            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}`}
            target="_blank"
          />
          <Button
            variant="outline"
            label="LinkedIn"
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`}
            target="_blank"
          />
        </div>
      </div>
      <div class="se-card">
        <div class="se-title">embed the live badge</div>
        <div class="se-badge">
          <LiveBadge tier={slim.tier} grade={slim.grade} score={slim.score} />
        </div>
        <pre class="cb cb-wrap" id="badgeMd" title="click to copy">
          <code>{badgeMd}</code>
        </pre>
        <div class="se-md">
          <Button variant="outline" id="copyMd" label="Copy markdown" />
          <span class="se-title" style="margin:0">
            live · re-scans periodically
          </span>
        </div>
      </div>
    </div>
  );
}

// Claim / backlink model (MNR-12): a listed domain gets a dofollow backlink; an
// unclaimed one gets the claim form and NO backlink. The claim form posts list:true
// to /api/watch (verify-by-email), the same contract the old page used.
export function ClaimPanel({
  slim,
  origin,
  claimed,
}: {
  slim: any;
  origin: string;
  claimed: boolean;
}) {
  if (claimed) {
    return (
      <div class="claim">
        <div class="claim-h">Listed in the directory</div>
        <p>
          This domain is claimed. It carries a dofollow backlink:{' '}
          <a href={`https://${slim.domain}`} rel="dofollow">
            {slim.domain}
          </a>
          . See it in the <a href={`${origin}/directory`}>directory</a>.
        </p>
      </div>
    );
  }
  return (
    <div class="claim">
      <div class="claim-h">Claim this page</div>
      <p>
        Own {slim.domain}? Verify by email to list it in the directory with a real dofollow backlink
        and get an alert if it ever drifts back into slop.
      </p>
      <form id="claimForm" class="claim-form" novalidate>
        <label class="sr-only" for="claimEmail">
          Email to verify ownership
        </label>
        <input
          id="claimEmail"
          type="email"
          inputmode="email"
          placeholder={`you@${slim.domain}`}
          required
        />
        <Button variant="primary" type="submit" label="Claim + list" />
      </form>
      <div id="claimMsg" class="claim-msg" role="status" aria-live="polite" />
    </div>
  );
}

// ── GAP-FILL states (design "Motion and interaction states") ──────────────────

// Loading placeholder: domain "…", a neutral dot, empty metric slots, "scanning…".
// Reusable by /r's design loading phase; reachable on /score via ?preview=loading.
export function ResultLoading({ domain }: { domain: string }) {
  return (
    <div class="result" aria-busy="true">
      <div class="result-section">
        <div class="rl-dom">
          <span class="rl-dot" aria-hidden="true" />
          {domain || '…'}
        </div>
        <div class="rl-num">…</div>
        <div class="rl-verdict">scanning…</div>
        <div class="rl-slot" style="width:60%" />
        <div class="rl-slot" style="width:42%" />
      </div>
    </div>
  );
}

// Error / retry (GAP-FILL: design Gaps 4): a blocked / timed-out / unavailable
// scoring path. Honest copy, a retry link, no fake Clean.
export function ResultError({
  domain,
  origin = '',
  message = 'We could not load this score right now.',
}: {
  domain: string;
  origin?: string;
  message?: string;
}) {
  return (
    <div class="result">
      <div class="result-section re">
        <SectionLedger tag="" label="error" />
        <h1 class="re-h" style="margin-top:14px">
          Score unavailable
        </h1>
        <p class="re-body">
          {message} The scoring engine is fine; this is a temporary read error. Retry, or run a
          fresh scan.
        </p>
        <div class="re-row">
          <Button variant="primary" href={`${origin}/score/${domain}`} label="Retry →" />
          <Button
            variant="outline"
            href={`${origin}/?url=${encodeURIComponent(domain)}`}
            label={`Rescan ${domain} →`}
          />
        </div>
      </div>
    </div>
  );
}
