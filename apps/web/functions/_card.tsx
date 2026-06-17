/** @jsxRuntime automatic @jsxImportSource hono/jsx */
// Share-card HTML (1200×630) — rasterized to PNG by /og/:id.png.
//
// Relocated here from _render.tsx by foundation task 00. The visual treatment is
// untouched — re-theming the OG card to the new light palette is task 13's job.
// Tier colors come from the centralized resolver in _theme.ts; escaping stays in
// _render.tsx.

import { raw } from 'hono/html';
import { escapeHtml } from './_render.js';
import { tierColors } from './_theme.js';

export function cardHtml(slim) {
  const c = tierColors(slim.tier);
  const tells = (slim.triggered || [])
    .slice(0, 4)
    .map((t) => t.short || t.label)
    .join(' · ');

  const CARD_CSS = `
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1200px;height:630px;overflow:hidden}
  body{
    background:radial-gradient(1200px 630px at 78% 22%, ${c.bg} 0%, #0a0a0b 60%);
    color:#f5f5f7;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",Arial,sans-serif;
    padding:64px 72px;display:flex;flex-direction:column;justify-content:space-between;
  }
  .top{display:flex;justify-content:space-between;align-items:flex-start}
  .brand{font-size:26px;font-weight:700;letter-spacing:-0.02em}
  .brand .slash{color:#5a5a62;font-weight:400}
  .defs{font-size:15px;color:#5a5a62;font-family:ui-monospace,Menlo,monospace}
  .mid{display:flex;align-items:center;gap:48px;margin-top:8px}
  .grade{font-size:240px;font-weight:800;line-height:.82;letter-spacing:-0.05em;color:${c.fg}}
  .meta{display:flex;flex-direction:column;gap:14px}
  .score{font-size:64px;font-weight:700;letter-spacing:-0.03em}
  .score small{font-size:30px;color:#8a8a92;font-weight:500}
  .tier{align-self:flex-start;font-size:24px;font-weight:700;padding:6px 20px;border-radius:999px;
        border:2px solid ${c.fg};color:${c.fg}}
  .flagged{font-size:20px;color:#8a8a92}
  .bottom{display:flex;flex-direction:column;gap:10px}
  .domain{font-size:30px;font-weight:600}
  .verdict{font-size:26px;color:#d4d4d8;max-width:1000px;line-height:1.3}
  .tells{font-size:17px;color:#6b6b73;font-family:ui-monospace,Menlo,monospace}
  .foot{font-size:18px;color:#5a5a62;margin-top:6px}
`;

  const brandTail = slim.patternsTotal
    ? escapeHtml(String(slim.patternsTotal)) + '&#8209;rule'
    : '';

  const doc = (
    <html>
      <head>
        <meta charset="utf-8" />
        <style>{raw(CARD_CSS)}</style>
      </head>
      <body>
        <div class="top">
          <div class="brand">
            {raw('slop&#8209;detect')}{' '}
            <span class="slash">{raw(`/ ${brandTail} AI&#8209;design fingerprint`)}</span>
          </div>
          <div class="defs">defs {slim.definitionsVersion || ''}</div>
        </div>
        <div class="mid">
          <div class="grade">{slim.grade}</div>
          <div class="meta">
            <div class="score">
              {slim.score}
              <small>/100</small>
            </div>
            <div class="tier">{slim.tier}</div>
            <div class="flagged">
              {slim.patternsFlagged}/{slim.patternsTotal} patterns triggered
            </div>
          </div>
        </div>
        <div class="bottom">
          <div class="domain">{slim.domain}</div>
          <div class="verdict">{slim.verdict || ''}</div>
          {tells ? <div class="tells">{tells}</div> : null}
          <div class="foot">slop-detect.com</div>
        </div>
      </body>
    </html>
  );

  return '<!doctype html>' + doc.toString();
}
