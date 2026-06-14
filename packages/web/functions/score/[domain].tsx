/** @jsxRuntime automatic @jsxImportSource hono/jsx */
// GET /score/:domain — the canonical per-domain score hub.
//
// One public, crawlable page per scanned domain: the latest slop grade, the axes
// that ran, a score-over-time chart, where the domain ranks among all scanned
// sites, and the loop controls (re-scan, claim + monitor, share). Every scan now
// records a timeline point and bumps the global distribution (see recordScan in
// _shared.js), so this page works for ANY scanned domain, not only monitored ones.
//
// Visibility model: the page is public for everyone (it is just the score, which
// /r and /report already expose). The dofollow backlink to the site is the
// incentive to CLAIM: it appears only once the owner verifies via the monitor
// form (POST /api/watch { list:true }). Unclaimed domains show a claim CTA and no
// dofollow link, so we never hand SEO juice to an arbitrary URL.
//
// Anti-slop by construction: the shared brand system (flat panels, cold-blue
// accent, no gradients/glows), so the page passes the detector it represents.

import { raw } from 'hono/html';
import {
  normalizeDomain,
  getLatestForDomain,
  getWatch,
  getHistory,
  getListing,
  publicWatch,
  percentileForScore,
  tierColors,
} from '../_shared.js';
import { BRAND_FONTS_HEAD, BRAND_CSS } from '../_brand.js';

const ORIGIN = 'https://slop-detect.com';

// ── score-over-time chart (inline SVG, no deps, no gradients) ─────────────────
// score 0 at top (cleaner), 100 at bottom (sloppier). The dashed guide marks the
// Clean/Mild boundary (10). Drawn only when there are at least two points.
function chartPoints(history) {
  return (history || []).filter((h) => typeof h.score === 'number').slice(-30);
}

function ChartSvg({ pts }) {
  const W = 640,
    H = 140,
    padX = 8,
    padTop = 10,
    padBot = 22;
  const innerW = W - padX * 2,
    innerH = H - padTop - padBot;
  const x = (i) => padX + (innerW * i) / (pts.length - 1);
  const y = (s) => padTop + (innerH * Math.max(0, Math.min(100, s))) / 100;
  const line = pts
    .map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`)
    .join(' ');
  const cleanY = y(10).toFixed(1);
  return (
    <svg
      class="chart"
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
        stroke="var(--border-2)"
        stroke-width="1"
        stroke-dasharray="3 4"
      ></line>
      <text
        x={padX}
        y={(Number(cleanY) - 4).toFixed(1)}
        fill="var(--dim)"
        font-size="9"
        font-family="var(--mono)"
      >
        clean ≤10
      </text>
      <path
        d={line}
        fill="none"
        stroke="var(--accent)"
        stroke-width="1.5"
        stroke-linejoin="round"
        stroke-linecap="round"
      ></path>
      {pts.map((p, i) => {
        const c = tierColors(p.tier);
        const last = i === pts.length - 1;
        return (
          <circle
            cx={x(i).toFixed(1)}
            cy={y(p.score).toFixed(1)}
            r={last ? 3.6 : 2.2}
            fill={c.fg}
          ></circle>
        );
      })}
    </svg>
  );
}

function AxisChip({ label, score, tier, suffix = '/100' }) {
  const c = tierColors(tier);
  return (
    <div class="axis">
      <div class="axis-k">{label}</div>
      <div class="axis-v" style={`color:${c.fg}`}>
        {score}
        <small>{suffix}</small>
      </div>
      <div class="axis-t" style={`color:${c.fg}`}>
        {tier || ''}
      </div>
    </div>
  );
}

export async function onRequestGet({ params, request, env }) {
  const origin = new URL(request.url).origin;
  const domain = normalizeDomain(String(params.domain || ''));
  if (!domain) {
    return new Response('Invalid domain', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  let latest = null,
    watch = null,
    history = [],
    listing = null,
    pct = null;
  if (env.RESULTS) {
    [latest, watch, history, listing] = await Promise.all([
      getLatestForDomain(env.RESULTS, domain).catch(() => null),
      getWatch(env.RESULTS, domain).catch(() => null),
      getHistory(env.RESULTS, domain).catch(() => []),
      getListing(env.RESULTS, domain).catch(() => null),
    ]);
    if (latest) pct = await percentileForScore(env.RESULTS, latest.score).catch(() => null);
  }
  const pub = watch ? publicWatch(watch, history) : null;
  const claimed = !!listing;

  // ── empty state ────────────────────────────────────────────────────────────
  if (!latest) {
    const emptyCss = `
  body{padding:48px 20px}.wrap{max-width:680px;margin:0 auto}
  h1{font-size:26px;font-weight:700;letter-spacing:-0.02em;margin:6px 0}
  .empty{color:var(--muted);margin:18px 0 26px}
  .btn{display:inline-block;background:var(--text);color:#000;border-radius:8px;padding:11px 20px;font-weight:600;text-decoration:none}
`;
    const emptyDoc = (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>{`${domain} · slop score · slop-detect`}</title>
          <meta
            name="description"
            content={`No slop scan recorded for ${domain} yet. Scan it to score how AI-generated its landing page looks.`}
          />
          <link rel="canonical" href={`${ORIGIN}/score/${domain}`} />
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
          {raw(BRAND_FONTS_HEAD)}
          <style>{raw(BRAND_CSS + emptyCss)}</style>
        </head>
        <body>
          <div class="wrap">
            <div class="eyebrow">
              <span class="reg">§score</span>
              <span class="reg-label">domain record</span>
            </div>
            <h1>{domain}</h1>
            <p class="empty">No scan recorded for this domain yet.</p>
            <a class="btn" href={`${origin}/?url=${encodeURIComponent(domain)}`}>
              Scan {domain} →
            </a>
          </div>
        </body>
      </html>
    );
    return new Response('<!doctype html>' + emptyDoc.toString(), {
      status: 404,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
      },
    });
  }

  const c = tierColors(latest.tier);
  const ogImg = `${origin}/og/${latest.id}.png`;
  const pageUrl = `${ORIGIN}/score/${domain}`;
  const title = `${domain} scored ${latest.grade} (${latest.score}/100) on the AI-slop detector`;
  const desc =
    latest.verdict ||
    `${latest.patternsFlagged}/${latest.patternsTotal} AI-design-slop patterns triggered.`;

  const showPeer = !!(pct && pct.count >= 5 && pct.cleanerThanPct != null);

  // axes that actually ran
  const axes = [<AxisChip label="design" score={latest.score} tier={latest.tier} />];
  if (latest.axes && latest.axes.copy) {
    const cp = latest.axes.copy;
    axes.push(<AxisChip label="copy" score={cp.score} tier={cp.tier} />);
  }
  if (latest.system) {
    axes.push(<AxisChip label="system" score={latest.system.score} tier={latest.system.tier} />);
  }

  const pts = chartPoints(history);
  const tells = (latest.triggered || []).slice(0, 10);

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': pageUrl,
    url: pageUrl,
    name: title,
    description: desc,
    isPartOf: { '@type': 'WebSite', name: 'Slop Detector', url: ORIGIN },
    about: { '@type': 'Thing', name: `${domain} AI-design-slop score` },
    dateModified: latest.createdAt || undefined,
  });

  const shareText = `${domain} scored ${latest.grade} (${latest.score}/100) on the AI-design-slop detector. ${latest.verdict || ''}`;
  const SCRIPT = `
  const flash=(m)=>{const f=document.getElementById('flash');f.textContent='✓ '+m;f.classList.add('show');setTimeout(()=>f.classList.remove('show'),1600)};
  const copy=async(t,m)=>{try{await navigator.clipboard.writeText(t);flash(m)}catch(e){}};
  const bm=document.getElementById('badgeMd');
  if(bm)bm.addEventListener('click',()=>copy(bm.textContent,'Badge copied'));
  const sx=document.getElementById('shareX');
  if(sx)sx.addEventListener('click',()=>{
    const text=${JSON.stringify(shareText)};
    window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(text)+'&url='+encodeURIComponent(${JSON.stringify(pageUrl)}),'_blank','noopener');
  });
  const cf=document.getElementById('claimForm');
  if(cf)cf.addEventListener('submit',async(e)=>{
    e.preventDefault();
    const email=document.getElementById('claimEmail').value.trim();
    const msg=document.getElementById('claimMsg');
    msg.textContent='Submitting…';
    try{
      const r=await fetch('/api/watch',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({domain:${JSON.stringify(domain)},email,list:true})});
      const j=await r.json().catch(()=>({}));
      msg.textContent=r.ok?(j.note||'Check your email to confirm and switch on alerts.'):(j.error||'Could not submit. Try again.');
    }catch(_){msg.textContent='Network error. Try again.';}
  });
`;

  const PAGE_CSS = `
  body{padding:40px 20px 80px}
  .wrap{max-width:680px;margin:0 auto}
  .brand{font-size:14px;font-weight:600;margin-bottom:22px}
  .brand .slash{color:var(--dim);font-weight:400}
  h1{font-size:26px;font-weight:700;letter-spacing:-0.02em;margin:6px 0 2px;word-break:break-all}
  h1 a{color:inherit;text-decoration:underline;text-decoration-color:var(--border-2)}
  .meta{color:var(--dim);font-size:12.5px;font-family:var(--mono);margin-bottom:22px}
  .hero{display:flex;align-items:center;gap:26px;background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:26px 28px}
  .grade{font-size:92px;font-weight:800;line-height:.82;letter-spacing:-0.04em;font-family:var(--mono);color:${c.fg}}
  .hmeta{display:flex;flex-direction:column;gap:7px}
  .score{font-size:32px;font-weight:700;letter-spacing:-0.02em;font-family:var(--mono)}
  .score small{font-size:17px;color:var(--muted);font-weight:500}
  .tier{align-self:flex-start;font-size:13px;font-weight:700;padding:3px 13px;border-radius:999px;border:1.5px solid ${c.fg};color:${c.fg}}
  .flagged{font-size:12.5px;color:var(--muted)}
  .verdict{margin:20px 2px 0;font-size:17px;color:var(--text-2);line-height:1.45}
  .peer{margin:14px 2px 0;font-size:14px;color:var(--muted)}.peer strong{color:var(--text)}
  .axes{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0 4px}
  .axis{flex:1;min-width:120px;background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:14px 16px}
  .axis-k{font-family:var(--mono);font-size:10.5px;color:var(--dim);text-transform:uppercase;letter-spacing:.05em}
  .axis-v{font-size:26px;font-weight:700;font-family:var(--mono);margin-top:6px;letter-spacing:-0.02em}
  .axis-v small{font-size:13px;color:var(--dim)}
  .axis-t{font-size:12px;font-weight:600;margin-top:2px}
  h2{font-size:13px;font-weight:700;font-family:var(--mono);text-transform:uppercase;letter-spacing:.05em;color:var(--dim);margin:30px 0 10px}
  .chartwrap{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:14px}
  .chart{width:100%;height:140px;display:block}
  .actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:24px}
  .btn{display:inline-block;background:var(--text);color:#000;border:0;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;text-decoration:none}
  .btn.ghost{background:transparent;color:var(--text);border:1px solid var(--border-2)}
  .btn:hover{opacity:.88}
  .tells{list-style:none;margin-top:4px}
  .tells li{padding:7px 0;border-bottom:1px solid var(--bg-2);font-size:14px;display:flex;align-items:center;gap:10px}
  .tells .x{color:var(--red)}.tells .w{margin-left:auto;color:var(--red);font-size:12px;font-family:var(--mono)}
  .claim{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:20px 22px;margin-top:30px}
  .claim.claimed{border-color:var(--border-2)}
  .claim-h{font-weight:700;font-size:15px;margin-bottom:6px}
  .claim p{color:var(--muted);font-size:13.5px;line-height:1.5}
  .claim a{color:var(--accent)}
  .claimform{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}
  .claimform input{flex:1;min-width:200px;background:var(--bg-2);border:1px solid var(--border-2);border-radius:8px;padding:10px 13px;color:var(--text);font-family:var(--mono);font-size:13px}
  .claimform button{background:var(--accent);color:var(--accent-ink);border:0;border-radius:8px;padding:10px 18px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit}
  .claim-msg{margin-top:10px;font-size:13px;color:var(--text-2)}
  .embed{margin-top:30px}
  .embed-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
  .embed pre{margin:10px 0 0;background:var(--bg-2);border:1px solid var(--border);border-radius:8px;padding:12px 14px;font-family:var(--mono);font-size:12px;color:var(--muted);white-space:pre-wrap;overflow-wrap:anywhere;cursor:pointer}
  footer{margin-top:36px;font-family:var(--mono);font-size:11.5px;color:var(--dim);line-height:1.7}
  footer a{color:var(--muted)}
  .flash{position:fixed;bottom:26px;left:50%;transform:translateX(-50%);background:var(--green);color:#003314;padding:9px 18px;border-radius:8px;font-weight:600;font-size:13px;opacity:0;transition:opacity .2s;pointer-events:none}
  .flash.show{opacity:1}
  @media(max-width:520px){.grade{font-size:68px}.hero{gap:16px;padding:20px}}
`;

  const doc = (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>{title}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc} />
        <meta property="og:image" content={ogImg} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content={pageUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={desc} />
        <meta name="twitter:image" content={ogImg} />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <script type="application/ld+json">{raw(jsonLd)}</script>
        {raw(BRAND_FONTS_HEAD)}
        <style>{raw(BRAND_CSS + PAGE_CSS)}</style>
      </head>
      <body>
        <div class="wrap">
          <div class="brand">
            <a href="/" style="color:inherit">
              {raw('slop&#8209;detect')}
            </a>{' '}
            <span class="slash">/ score</span>
          </div>
          <div class="eyebrow">
            <span class="reg">§score</span>
            <span class="reg-label">domain record</span>
          </div>
          <h1>
            {claimed ? (
              <a href={`https://${domain}`} rel="dofollow">
                {domain}
              </a>
            ) : (
              domain
            )}
          </h1>
          <div class="meta">
            last scan {(latest.createdAt || '').replace('T', ' ').slice(0, 16)} UTC · defs{' '}
            {latest.definitionsVersion || 'n/a'}
            {pub?.monitoring ? ' · monitored' : ''}
          </div>

          <section class="hero">
            <div class="grade">{latest.grade}</div>
            <div class="hmeta">
              <div class="score">
                {latest.score}
                <small>/100</small>
              </div>
              <div class="tier">{latest.tier}</div>
              <div class="flagged">
                {latest.patternsFlagged}/{latest.patternsTotal} patterns triggered · lower is better
              </div>
            </div>
          </section>
          {latest.verdict ? <div class="verdict">{latest.verdict}</div> : null}
          {showPeer ? (
            <div class="peer">
              Cleaner than <strong>{pct.cleanerThanPct}%</strong> of{' '}
              {pct.count.toLocaleString('en-US')} scans on record
            </div>
          ) : null}

          <div class="axes">{axes}</div>

          {pts.length >= 2 ? (
            <>
              <h2>Score over time</h2>
              <div class="chartwrap">
                <ChartSvg pts={pts} />
              </div>
            </>
          ) : null}

          <div class="actions">
            <a class="btn" href={`${origin}/?url=${encodeURIComponent(domain)}`}>
              Re-scan
            </a>
            <a class="btn ghost" href={`${origin}/r/${latest.id}`}>
              This scan
            </a>
            <a class="btn ghost" href={`${origin}/report/${domain}`}>
              Printable report
            </a>
            <button class="btn ghost" id="shareX">
              Share
            </button>
          </div>

          {tells.length ? (
            <>
              <h2>Triggered patterns</h2>
              <ul class="tells">
                {tells.map((t) => (
                  <li>
                    <span class="x">✗</span> {t.label || t.short || t.id}{' '}
                    <span class="w">+{t.weight}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {claimed ? (
            <div class="claim claimed">
              <div class="claim-h">
                Listed in the <a href={`${origin}/directory`}>directory</a>
              </div>
              <p>
                This domain is claimed and monitored. It carries a dofollow backlink:{' '}
                <a href={`https://${domain}`} rel="dofollow">
                  {domain}
                </a>
                .
              </p>
            </div>
          ) : (
            <div class="claim">
              <div class="claim-h">Claim this page</div>
              <p>
                Own {domain}? Verify by email to list it in the directory (a real dofollow backlink)
                and get an alert if it ever drifts back into slop.
              </p>
              <form id="claimForm" class="claimform" novalidate>
                <input
                  id="claimEmail"
                  type="email"
                  inputmode="email"
                  placeholder={`you@${domain}`}
                  required
                />
                <button type="submit">Claim + monitor</button>
              </form>
              <div id="claimMsg" class="claim-msg"></div>
            </div>
          )}

          <div class="embed">
            <h2>Embed the live badge</h2>
            <div class="embed-row">
              <img
                src={`${origin}/badge/${domain}.svg`}
                alt={`slop badge for ${domain}`}
                height="20"
              />
              <span style="font-size:13px;color:var(--muted)">live · re-scans periodically</span>
            </div>
            <pre id="badgeMd">{`[![slop](${origin}/badge/${domain}.svg)](${pageUrl})`}</pre>
          </div>

          <footer>
            Scores are deterministic, named checks: a fingerprint, not a verdict. Reproduce: npx
            slop-detect {domain} · <a href={`${origin}/`}>slop-detect.com</a>
          </footer>
        </div>
        <div class="flash" id="flash">
          ✓ Copied
        </div>
        <script>{raw(SCRIPT)}</script>
      </body>
    </html>
  );

  return new Response('<!doctype html>' + doc.toString(), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=120' },
  });
}
