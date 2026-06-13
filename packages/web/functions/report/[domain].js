// GET /report/:domain — a print-friendly client report (Roadmap v2 P2b-lite).
//
// The agency deliverable: one page summarizing a domain's slop score, its
// design-system compliance (when monitored), score history, and drift items —
// styled for screen AND for printing to PDF (@media print), which is the
// indie-smart substitute for server-side PDF generation infrastructure.
//
// Public data only: latest stored scan (d:/r: keys), the watch's PUBLIC view
// (publicWatch — never the email), and history. A domain with no data renders
// an honest empty state. Anti-slop by construction, like /directory.

import {
  normalizeDomain,
  getLatestForDomain,
  getWatch,
  getHistory,
  publicWatch,
  tierColors,
  escapeHtml
} from '../_shared.js';
import { BRAND_FONTS_HEAD, BRAND_CSS } from '../_brand.js';

const ORIGIN = 'https://slop-detect.com';

function sysColors(tier) {
  if (tier === 'Aligned') return { fg: '#4ade80' };
  if (tier === 'Drifting') return { fg: '#fbbf24' };
  if (tier === 'Off-system') return { fg: '#f87171' };
  return { fg: '#8a8a92' };
}

function historyRows(history) {
  return history.slice(-20).reverse().map((h) => {
    const c = tierColors(h.tier);
    const sys = h.system
      ? `<td style="color:${sysColors(h.system.tier).fg}">${h.system.score}/100 ${escapeHtml(h.system.tier)}</td>`
      : '<td class="dim">—</td>';
    return `<tr>
      <td>${escapeHtml(String(h.at || '').slice(0, 10))}</td>
      <td><span style="color:${c.fg}">${escapeHtml(h.grade || '—')}</span></td>
      <td>${h.score}/100</td>
      <td style="color:${c.fg}">${escapeHtml(h.tier || '')}</td>
      ${sys}
    </tr>`;
  }).join('');
}

export async function onRequestGet({ params, request, env }) {
  const origin = new URL(request.url).origin;
  const domain = normalizeDomain(String(params.domain || ''));
  if (!domain) {
    return new Response('Invalid domain', { status: 400, headers: { 'Content-Type': 'text/plain' } });
  }

  let latest = null, watch = null, history = [];
  if (env.RESULTS) {
    [latest, watch, history] = await Promise.all([
      getLatestForDomain(env.RESULTS, domain).catch(() => null),
      getWatch(env.RESULTS, domain).catch(() => null),
      getHistory(env.RESULTS, domain).catch(() => [])
    ]);
  }
  const pub = watch ? publicWatch(watch, history) : null;
  const hasData = !!(latest || (history && history.length));

  const c = tierColors(latest?.tier);
  const sys = pub?.system || null;
  const sc = sysColors(sys?.tier);
  const today = new Date().toISOString().slice(0, 10);

  const scoreBlock = latest ? `
    <section class="grid">
      <div class="card">
        <div class="k">design-slop fingerprint</div>
        <div class="big" style="color:${c.fg}">${escapeHtml(latest.grade || '—')}</div>
        <div class="sub">${latest.score}/100 · <span style="color:${c.fg}">${escapeHtml(latest.tier || '')}</span></div>
        <div class="note">${latest.patternsFlagged}/${latest.patternsTotal} patterns triggered · defs ${escapeHtml(latest.definitionsVersion || '')}</div>
      </div>
      <div class="card">
        <div class="k">design-system compliance</div>
        ${sys ? `
        <div class="big" style="color:${sc.fg}">${sys.score}<small>/100</small></div>
        <div class="sub" style="color:${sc.fg}">${escapeHtml(sys.tier)}</div>
        <div class="note">vs its own DESIGN.md · higher is better${sys.drifted ? ' · <strong>drifted</strong>' : ''}</div>
        ` : `
        <div class="big dim">—</div>
        <div class="note">Not monitored against a DESIGN.md yet. Opt in via
          <code>POST /api/watch { system: true }</code>.</div>
        `}
      </div>
    </section>` : '';

  const driftBlock = sys && sys.drift && sys.drift.length ? `
    <h2>What drifted</h2>
    <ul class="drift">
      ${sys.drift.map((d) => `<li><span class="x">✗</span> ${escapeHtml(d.message)} <span class="dim">(${escapeHtml(d.id)})</span></li>`).join('')}
    </ul>` : '';

  const histBlock = history.length ? `
    <h2>History</h2>
    <table>
      <thead><tr><th>date</th><th>grade</th><th>slop score</th><th>tier</th><th>system</th></tr></thead>
      <tbody>${historyRows(history)}</tbody>
    </table>` : '';

  const tellsBlock = latest?.triggered?.length ? `
    <h2>Triggered patterns</h2>
    <ul class="drift">
      ${latest.triggered.slice(0, 10).map((t) => `<li><span class="x">✗</span> ${escapeHtml(t.label || t.short || t.id)} <span class="dim">(+${t.weight})</span></li>`).join('')}
    </ul>` : '';

  const body = hasData
    ? scoreBlock + driftBlock + tellsBlock + histBlock
    : `<p class="empty">No scan data for <strong>${escapeHtml(domain)}</strong> yet.
       <a href="${origin}/">Run a scan</a>, then revisit this report.</p>`;

  const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Report: ${escapeHtml(domain)} · slop-detect</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${ORIGIN}/report/${escapeHtml(domain)}">
${BRAND_FONTS_HEAD}
<style>${BRAND_CSS}
  body{padding:48px 20px 80px}
  .wrap{max-width:720px;margin:0 auto}
  h1{font-size:28px;font-weight:700;letter-spacing:-0.02em;margin:2px 0 2px}
  h2{font-size:17px;font-weight:700;margin:30px 0 8px}
  .meta{color:var(--dim);font-size:12.5px;font-family:var(--mono);margin-bottom:24px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .card{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:18px}
  .k{font-family:var(--mono);font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px}
  .big{font-size:44px;font-weight:800;line-height:1;font-family:var(--mono);letter-spacing:-0.03em}
  .big small{font-size:18px;color:var(--dim)}
  .sub{font-size:16px;font-weight:600;margin-top:6px}
  .note{color:var(--muted);font-size:12.5px;margin-top:8px}
  .dim{color:var(--dim)}
  .drift{list-style:none}
  .drift li{padding:7px 0;border-bottom:1px solid var(--bg-2);font-size:14.5px}
  .x{color:var(--red);margin-right:6px}
  table{border-collapse:collapse;width:100%;font-size:13px}
  th,td{text-align:left;padding:7px 12px 7px 0;border-bottom:1px solid var(--bg-2)}
  th{color:var(--dim);font-weight:500;font-family:var(--mono);font-size:11px}
  td{font-family:var(--mono)}
  .empty{color:var(--muted);padding:24px 0}
  footer{margin-top:36px;font-family:var(--mono);font-size:11.5px;color:var(--dim)}
  footer a{color:var(--muted)}
  .printbtn{float:right;font-size:12px;font-family:var(--mono);color:var(--muted);background:none;border:1px solid var(--border-2);border-radius:6px;padding:5px 12px;cursor:pointer}
  .printbtn:hover{color:var(--text);border-color:var(--muted)}
  @media(max-width:560px){.grid{grid-template-columns:1fr}}
  @media print{
    body{background:#fff;color:#111;padding:0}
    .card{border-color:#ccc;background:#fff}
    .printbtn{display:none}
    th,td,.drift li{border-color:#ddd}
    footer,a{color:#555}
  }
</style></head><body><div class="wrap">
  <button class="printbtn" onclick="window.print()">print / save PDF</button>
  <div class="eyebrow"><span class="reg">&sect;cli</span><span class="reg-label">client report</span></div>
  <h1>${escapeHtml(domain)}</h1>
  <div class="meta">prepared ${today} · slop-detect.com${pub?.monitoring ? ' · monitored' : ''}</div>
  ${body}
  <footer>Scores are deterministic, named checks — a fingerprint, not a verdict.
    Live score hub: <a href="${origin}/score/${escapeHtml(domain)}">slop-detect.com/score/${escapeHtml(domain)}</a><br>
    Reproduce: <a href="${origin}/">slop-detect.com</a> · npx slop-detect ${escapeHtml(domain)}</footer>
</div></body></html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=120' }
  });
}
