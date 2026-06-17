/** @jsxRuntime automatic @jsxImportSource hono/jsx */
// GET /report/:domain — the printable agency client report (a Result variant).
//
// The agency deliverable: one focused page summarizing a domain's slop fingerprint,
// its design-system compliance (when monitored), what drifted, the triggered
// patterns, and the score history — rendered in the SAME editorial-instrument
// language as /score and /r (Newsreader / Libre Franklin / JetBrains Mono, the
// verdict palette, the 1.5px ink ledger rule), and styled for screen AND for
// printing to PDF (@media print), the indie-smart substitute for server-side PDF
// generation infrastructure (MNR-16).
//
// Public data only: the latest stored scan (d:/r: keys), the watch's PUBLIC view
// (publicWatch — never the subscriber email), and history. A domain with no data
// renders an honest, email-free empty state. Anti-slop by construction: flat 1px
// surfaces, no gradients, no slop fonts — it must pass its own detector.
//
// It composes the shared foundation rather than re-implementing it: _brand.ts
// tokens, _ui.tsx shell (Footer / SectionLedger / LogoLockup), _theme.ts color
// resolvers, and _result.tsx's buildResultView (the canonical engine-joined
// view-model that turns a slim scan into its triggered-pattern list). This file
// imports the foundation but does not edit it (foundation acceptance gate).

import { raw } from 'hono/html';
import {
  normalizeDomain,
  getLatestForDomain,
  getWatch,
  getHistory,
  publicWatch,
} from '../_shared.js';
import { BRAND_FONTS_HEAD, BRAND_CSS } from '../_brand.js';
import { Footer, SectionLedger, LogoLockup, UI_CSS } from '../_ui.js';
import { tierText, systemAxisColor } from '../_theme.js';
import { buildResultView } from '../_result.js';

const ORIGIN = 'https://slop-detect.com';

// Report-only styles. Light-first; everything references BRAND_CSS tokens so there
// is one source of truth. The @media print block is the PDF substitute: it flattens
// the paper to white and drops the one dark section (the footer band) to ink-on-
// white, since a printer should not flood a page with the dark register.
const REPORT_CSS = `
  .rpt-top{max-width:760px;margin:0 auto;padding:26px var(--pad-x) 0;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
  .rpt-print{font-family:var(--mono);font-size:12.5px;color:var(--text-3);background:var(--panel);border:1px solid var(--border-btn);border-radius:3px;padding:7px 14px;cursor:pointer;transition:var(--t)}
  .rpt-print:hover{border-color:var(--text);color:var(--text)}

  .rpt{max-width:760px;margin:0 auto;padding:6px var(--pad-x) 60px}
  .rpt-sec{padding:30px 0}
  .rpt-sec + .rpt-sec{border-top:1px solid var(--border-2)}
  .rpt-led{margin-bottom:16px}
  .rpt-h1{font-family:var(--serif);font-weight:500;font-size:clamp(32px,5vw,46px);line-height:1.0;letter-spacing:-0.02em;color:var(--text);margin:2px 0 8px;word-break:break-word}
  .rpt-meta{font-family:var(--mono);font-size:12.5px;color:var(--text-4)}

  /* the two summary cards: fingerprint + design-system compliance */
  .rpt-cards{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .rpt-cards.one{grid-template-columns:1fr}
  .rcard{border:1px solid var(--border);border-radius:8px;background:var(--panel);padding:20px 22px}
  .rcard-k{font-family:var(--mono);font-size:12px;color:var(--text-4);letter-spacing:0;margin-bottom:14px}
  .rcard-big{font-family:var(--serif);font-weight:500;font-size:56px;line-height:0.82;letter-spacing:-0.03em}
  .rcard-big small{font-family:var(--serif);font-size:22px;color:var(--text-6);letter-spacing:-0.01em}
  .rcard-sub{font-family:var(--mono);font-size:14px;font-weight:700;margin-top:12px}
  .rcard-note{font-family:var(--mono);font-size:12px;color:var(--text-4);line-height:1.6;margin-top:8px}
  .rcard-note code{background:var(--bg-2);border-radius:3px;padding:1px 5px}

  /* what drifted + triggered patterns — flat, print-legible lists */
  .rlist{list-style:none}
  .rlist li{display:flex;gap:10px;align-items:baseline;padding:9px 0;border-bottom:1px solid var(--row-inner);font-size:14.5px;color:var(--text-2);line-height:1.5}
  .rlist li:last-child{border-bottom:0}
  .rlist .rx{color:var(--heavy-text);font-family:var(--mono);flex:none}
  .rlist .rid{color:var(--text-5);font-family:var(--mono);font-size:12px}
  .rlist .rw{margin-left:auto;color:var(--heavy-text);font-family:var(--mono);font-size:13px;font-weight:700;flex:none;white-space:nowrap}

  /* history table */
  .rtable{border-collapse:collapse;width:100%;font-family:var(--mono);font-size:13px}
  .rtable caption{text-align:left}
  .rtable th{text-align:left;padding:9px 14px 9px 0;border-bottom:1.5px solid #181815;color:var(--text-4);font-weight:500;font-size:11.5px;white-space:nowrap}
  .rtable td{text-align:left;padding:9px 14px 9px 0;border-bottom:1px solid var(--row-inner);color:var(--text-2);white-space:nowrap}
  .rtable .rt-dim{color:var(--text-6)}

  .rpt-empty{font-family:var(--serif);font-style:italic;font-size:20px;color:var(--text-3);line-height:1.5;padding:8px 0}
  .rpt-empty a{color:var(--clean-text);text-decoration:underline}

  @media (max-width:560px){
    .rpt-cards{grid-template-columns:1fr}
  }

  /* the PDF substitute: paper prints white, the dark footer band drops to ink */
  @media print{
    body{background:#fff;color:#111}
    .rpt-top{padding-top:12px}
    .rpt-print{display:none}
    .rcard{border-color:#ccc;background:#fff}
    .rlist li,.rtable td{border-color:#ddd}
    .rtable th,.section-ledger{border-color:#111}
    a{color:#111}
    .ft{background:#fff;color:#444;border-top:1px solid #ccc}
    .ft-word,.ft-fp{color:#111}
    .ft-meta,.ft-repro,.ft-links a{color:#555}
    .ft .logo-mark svg path{stroke:#111}
  }
`;

// Wire the print button without an inline onclick attribute. No interpolation, so
// nothing hostile can reach it (and it stays under the page CSP).
const PRINT_SCRIPT = `(function(){var b=document.getElementById('rptPrint');if(b)b.addEventListener('click',function(){window.print();});})();`;

export async function onRequestGet({ params, request, env }) {
  const origin = new URL(request.url).origin;
  const domain = normalizeDomain(String(params.domain || ''));
  if (!domain) {
    return new Response('Invalid domain', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  let latest: any = null,
    watch: any = null,
    history: any[] = [];
  if (env.RESULTS) {
    [latest, watch, history] = await Promise.all([
      getLatestForDomain(env.RESULTS, domain).catch(() => null),
      getWatch(env.RESULTS, domain).catch(() => null),
      getHistory(env.RESULTS, domain).catch(() => []),
    ]);
  }

  const pub = watch ? publicWatch(watch, history) : null;
  const monitored = !!pub?.monitoring;
  const sys = pub?.system || null;
  const hasData = !!(latest || (history && history.length));
  const today = new Date().toISOString().slice(0, 10);

  // The triggered-pattern list comes from the shared Result view-model so the
  // report reads the same join (slim → engine metadata) the hub uses.
  const view = latest ? buildResultView(latest) : null;
  const tells = view
    ? [...(view.triggered || [])].sort((a, b) => (b.weight || 0) - (a.weight || 0)).slice(0, 12)
    : [];

  const fg = latest ? tierText(latest.tier) : 'var(--text-6)';
  const sysColor = sys ? systemAxisColor(sys.score) : 'var(--text-6)';

  const body = hasData ? (
    <>
      <section class="rpt-sec">
        <div class={`rpt-cards${monitored ? '' : ' one'}`}>
          <div class="rcard">
            <div class="rcard-k">design-slop fingerprint</div>
            <div class="rcard-big" style={`color:${fg}`}>
              {latest?.grade || '—'}
            </div>
            <div class="rcard-sub">
              {latest?.score}/100 · <span style={`color:${fg}`}>{latest?.tier || ''}</span>
            </div>
            <div class="rcard-note">
              {latest?.patternsFlagged}/{latest?.patternsTotal} patterns triggered
              {latest?.definitionsVersion ? ` · defs ${latest.definitionsVersion}` : ''}
            </div>
          </div>
          {monitored ? (
            <div class="rcard">
              <div class="rcard-k">design-system compliance</div>
              {sys ? (
                <>
                  <div class="rcard-big" style={`color:${sysColor}`}>
                    {sys.score}
                    <small>/100</small>
                  </div>
                  <div class="rcard-sub" style={`color:${sysColor}`}>
                    {sys.tier}
                  </div>
                  <div class="rcard-note">
                    vs its own DESIGN.md · higher is better
                    {sys.drifted ? ' · drifted' : ''}
                  </div>
                </>
              ) : (
                <>
                  <div class="rcard-big" style="color:var(--text-6)">
                    —
                  </div>
                  <div class="rcard-note">
                    Monitored, but no DESIGN.md declared yet. Opt in with{' '}
                    <code>{'POST /api/watch { system: true }'}</code>.
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </section>

      {sys && sys.drift && sys.drift.length ? (
        <section class="rpt-sec">
          <div class="rpt-led">
            <SectionLedger tag="" label="what drifted" />
          </div>
          <ul class="rlist">
            {sys.drift.map((d) => (
              <li>
                <span class="rx" aria-hidden="true">
                  ✗
                </span>
                <span>
                  {d.message || d.id} <span class="rid">({d.id})</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tells.length ? (
        <section class="rpt-sec">
          <div class="rpt-led">
            <SectionLedger tag="" label="triggered patterns" />
          </div>
          <ul class="rlist">
            {tells.map((t) => (
              <li>
                <span class="rx" aria-hidden="true">
                  ✗
                </span>
                <span>{t.label || t.short || t.id}</span>
                <span class="rw">+{t.weight}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {history && history.length ? (
        <section class="rpt-sec">
          <div class="rpt-led">
            <SectionLedger tag="" label="history" />
          </div>
          <table class="rtable">
            <caption class="sr-only">History of slop scores for {domain}</caption>
            <thead>
              <tr>
                <th scope="col">date</th>
                <th scope="col">grade</th>
                <th scope="col">slop score</th>
                <th scope="col">tier</th>
                <th scope="col">system</th>
              </tr>
            </thead>
            <tbody>
              {history
                .slice(-20)
                .reverse()
                .map((h) => {
                  const hc = tierText(h.tier);
                  return (
                    <tr>
                      <td>{String(h.createdAt || h.at || '').slice(0, 10)}</td>
                      <td style={`color:${hc}`}>{h.grade || '—'}</td>
                      <td>{h.score}/100</td>
                      <td style={`color:${hc}`}>{h.tier || ''}</td>
                      {h.sys ? (
                        <td style={`color:${systemAxisColor(h.sys.score)}`}>
                          {h.sys.score}/100 {h.sys.tier}
                        </td>
                      ) : (
                        <td class="rt-dim">—</td>
                      )}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </section>
      ) : null}
    </>
  ) : (
    <section class="rpt-sec">
      <p class="rpt-empty">
        No scan data for <strong>{domain}</strong> yet.{' '}
        <a href={`${origin}/?url=${encodeURIComponent(domain)}`}>Run a scan</a>, then revisit this
        report.
      </p>
    </section>
  );

  const doc = (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`Report: ${domain} · Slop Detector`}</title>
        <meta name="robots" content="noindex" />
        <link rel="canonical" href={`${ORIGIN}/report/${domain}`} />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        {raw(BRAND_FONTS_HEAD)}
        <style>{raw(BRAND_CSS + UI_CSS + REPORT_CSS)}</style>
      </head>
      <body class="report">
        <header class="rpt-top">
          <LogoLockup href={`${origin}/`} />
          <button id="rptPrint" class="rpt-print" type="button">
            print / save PDF
          </button>
        </header>
        <main class="rpt">
          <section class="rpt-sec">
            <div class="rpt-led">
              <SectionLedger tag="" label="client report" />
            </div>
            <h1 class="rpt-h1">{domain}</h1>
            <div class="rpt-meta">
              prepared {today} · slop-detect.com{monitored ? ' · monitored' : ''}
              {latest?.definitionsVersion ? ` · defs ${latest.definitionsVersion}` : ''}
            </div>
          </section>
          {body}
        </main>
        <Footer origin={origin} domain={domain} meta="a fingerprint, not a verdict · MIT" />
        <script>{raw(PRINT_SCRIPT)}</script>
      </body>
    </html>
  );

  return new Response('<!doctype html>' + doc.toString(), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=120',
    },
  });
}
