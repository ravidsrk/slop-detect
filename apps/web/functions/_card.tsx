/** @jsxRuntime automatic @jsxImportSource hono/jsx */
// Share-card HTML (1200×630) — rasterized to PNG by /og/:id.png.
//
// Re-themed for build task 13 to the light editorial-instrument system: flat
// cool-paper surface (no radial/linear gradient — the detector flags gradient
// surfaces), a Newsreader score numeral and grade in the tier's text hue, JetBrains
// Mono labels, and the verdict set in italic Newsreader. Tier colors come from the
// centralized resolver in _theme.ts and the font <link> from _brand.ts, so the card
// reads as the same product as every other surface and dogfoods its own detector.

import { raw } from 'hono/html';
import { escapeHtml } from './_render.js';
import { tierColors } from './_theme.js';
import { BRAND_FONTS_HEAD } from './_brand.js';

// The scan-reticle mark (light variant: ink brackets, Clean-green dot). Inlined so
// the rasterized card needs no extra asset fetch. Source: landing/design/mark.svg.
const RETICLE = `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M3 8 V3.5 H7.5" stroke="#181815" stroke-width="1.6" stroke-linecap="square"/>
  <path d="M16.5 3.5 H21 V8" stroke="#181815" stroke-width="1.6" stroke-linecap="square"/>
  <path d="M21 16 V20.5 H16.5" stroke="#181815" stroke-width="1.6" stroke-linecap="square"/>
  <path d="M7.5 20.5 H3 V16" stroke="#181815" stroke-width="1.6" stroke-linecap="square"/>
  <circle cx="12" cy="12" r="2.4" fill="#1FA85E"/>
</svg>`;

export function cardHtml(slim) {
  const c = tierColors(slim.tier);
  const tier = String(slim.tier || '');
  const tells = (slim.triggered || [])
    .slice(0, 4)
    .map((t) => t.short || t.label)
    .join('  ·  ');

  const CARD_CSS = `
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1200px;height:630px;overflow:hidden}
  body{
    background:#F4F5F2;
    color:#181815;
    font-family:'Libre Franklin',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
    padding:60px 72px;display:flex;flex-direction:column;justify-content:space-between;
  }
  .serif{font-family:'Newsreader',Georgia,'Times New Roman',serif}
  .mono{font-family:'JetBrains Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace}

  /* masthead: the logo lockup + a mono defs stamp */
  .top{display:flex;justify-content:space-between;align-items:center}
  .brand{display:flex;align-items:center;gap:14px}
  .brand svg{display:block}
  .word{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:27px;font-weight:700;
        letter-spacing:-0.01em;color:#181815;white-space:nowrap}
  .tail{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:15px;color:#6E6F63}
  .defs{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:15px;color:#6E6F63}

  /* the reading */
  .mid{display:flex;flex-direction:column;gap:22px}
  .subject{display:flex;align-items:center;gap:14px}
  .dot{width:14px;height:14px;border-radius:50%;background:${c.fill}}
  .domain{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:30px;font-weight:500;
          letter-spacing:-0.01em;color:#181815}
  .reading{display:flex;align-items:flex-end;gap:56px}
  .scoreblock{display:flex;align-items:flex-end;gap:16px}
  .score{font-family:'Newsreader',Georgia,serif;font-weight:500;font-size:188px;line-height:0.78;
         letter-spacing:-0.03em;color:${c.fg}}
  .unit{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:44px;font-weight:400;
        color:#9A9B8E;margin-bottom:24px}
  .meta{display:flex;flex-direction:column;gap:16px;padding-bottom:18px}
  .grade{font-family:'Newsreader',Georgia,serif;font-weight:500;font-size:96px;line-height:0.78;
         letter-spacing:-0.03em;color:${c.fg}}
  .pill{align-self:flex-start;display:flex;align-items:center;gap:10px;
        border:1px solid #DBDDD6;border-radius:6px;background:#FBFBF9;padding:8px 16px}
  .pill .tierlabel{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:18px;
                   font-weight:700;letter-spacing:0.02em;color:${c.fg}}
  .flagged{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:17px;color:#6E6F63}

  /* verdict — Newsreader italic voice */
  .verdict{font-family:'Newsreader',Georgia,serif;font-style:italic;font-weight:400;font-size:31px;
           line-height:1.3;color:#3A3B33;max-width:1010px}

  /* footer — the signature 1.5px ink ledger rule above a mono line */
  .foot{border-top:1.5px solid #181815;padding-top:14px;display:flex;justify-content:space-between;
        align-items:baseline}
  .foot .mono{font-size:18px;color:#46473F;letter-spacing:0}
  .foot .tells{font-size:15px;color:#7E7F72;max-width:760px;text-align:right;
               white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
`;

  const brandTail = slim.patternsTotal
    ? escapeHtml(String(slim.patternsTotal)) + '&#8209;rule AI&#8209;design fingerprint'
    : 'AI&#8209;design fingerprint';

  const doc = (
    <html>
      <head>
        <meta charset="utf-8" />
        {raw(BRAND_FONTS_HEAD)}
        <style>{raw(CARD_CSS)}</style>
      </head>
      <body>
        <div class="top">
          <div class="brand">
            {raw(RETICLE)}
            <span class="word">slop-detect</span>
            <span class="tail">{raw('/ ' + brandTail)}</span>
          </div>
          <div class="defs">{slim.definitionsVersion ? `defs ${slim.definitionsVersion}` : ''}</div>
        </div>

        <div class="mid">
          <div class="subject">
            <span class="dot"></span>
            <span class="domain">{slim.domain}</span>
          </div>
          <div class="reading">
            <div class="scoreblock">
              <span class="score">{slim.score}</span>
              <span class="unit">/100</span>
            </div>
            <div class="meta">
              <span class="grade">{slim.grade}</span>
              <span class="pill">
                <span class="dot"></span>
                <span class="tierlabel">{tier.toUpperCase()}</span>
              </span>
              <span class="flagged">
                {slim.patternsFlagged}/{slim.patternsTotal} patterns flagged
              </span>
            </div>
          </div>
          {slim.verdict ? <div class="verdict">{slim.verdict}</div> : null}
        </div>

        <div class="foot">
          <span class="mono">slop-detect.com</span>
          {tells ? <span class="mono tells">{tells}</span> : null}
        </div>
      </body>
    </html>
  );

  return '<!doctype html>' + doc.toString();
}
