// GET /r/:id — server-rendered shareable result permalink.
//
// Crawler-friendly (full HTML, no JS needed): OG/Twitter meta point at the
// PNG card (/og/:id.png) so the link unfurls with a big grade image. The page
// also works for humans — full result + a "scan your own site" CTA that closes
// the viral loop (see UX.md, Flow D).

import { getResult, tierColors, escapeHtml } from '../_shared.js';

export async function onRequestGet({ params, env, request }) {
  const id = String(params.id || '').replace(/[^a-z0-9]/gi, '').slice(0, 16);
  const slim = await getResult(env.RESULTS, id);
  const origin = new URL(request.url).origin;

  if (!slim) {
    return new Response(notFoundHtml(origin), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  return new Response(resultHtml(slim, origin), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    }
  });
}

function resultHtml(s, origin) {
  const c = tierColors(s.tier);
  const ogImg = `${origin}/og/${s.id}.png`;
  const pageUrl = `${origin}/r/${s.id}`;
  const domain = escapeHtml(s.domain);
  const title = `${domain} scored ${s.grade} (${s.score}/100) on the AI-slop detector`;
  const desc = escapeHtml(s.verdict || `${s.patternsFlagged}/${s.patternsTotal} AI-design-slop patterns triggered.`);
  const badgeMd = `[![slop](${origin}/badge/${domain}.svg)](${pageUrl})`;

  const tells = (s.triggered || []).map(t => `
      <li><span class="x">✗</span> ${escapeHtml(t.label)} <span class="w">+${t.weight}</span></li>`).join('');

  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${desc}">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${ogImg}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${pageUrl}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${ogImg}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<style>
  :root{--bg:#0a0a0b;--panel:#121214;--border:#232327;--text:#f5f5f7;--muted:#8a8a92;--dim:#5a5a62;--accent:#d4d4d8;--fg:${c.fg}}
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:var(--bg);color:var(--text)}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",Arial,sans-serif;font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased;min-height:100vh}
  a{color:#60a5fa;text-decoration:none}a:hover{text-decoration:underline}
  code,.mono{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace}
  .wrap{max-width:680px;margin:0 auto;padding:40px 24px 80px}
  .brand{font-size:15px;font-weight:600;letter-spacing:-0.01em;margin-bottom:28px}
  .brand .slash{color:var(--dim);font-weight:400}
  .card{background:radial-gradient(700px 400px at 85% 0%, ${c.bg} 0%, var(--panel) 70%);border:1px solid var(--border);border-radius:14px;padding:30px 30px 26px}
  .domain{font-size:15px;color:var(--muted);word-break:break-all;margin-bottom:4px}
  .ttl{font-size:18px;font-weight:500;margin-bottom:22px}
  .row{display:flex;align-items:center;gap:24px}
  .grade{font-size:96px;font-weight:800;line-height:.85;letter-spacing:-0.04em;color:var(--fg)}
  .col{display:flex;flex-direction:column;gap:8px}
  .score{font-size:34px;font-weight:700;letter-spacing:-0.02em}
  .score small{font-size:18px;color:var(--muted);font-weight:500}
  .scale-note{font-size:11px;color:var(--dim);margin-top:-2px}
  .tier{align-self:flex-start;font-size:14px;font-weight:700;padding:3px 13px;border-radius:999px;border:1.5px solid var(--fg);color:var(--fg)}
  .flagged{font-size:13px;color:var(--muted)}
  .verdict{margin-top:22px;font-size:18px;color:var(--accent);line-height:1.4}
  .tells{margin-top:22px}
  .tells h3{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--dim);margin-bottom:10px}
  .tells ul{list-style:none;display:flex;flex-direction:column;gap:6px}
  .tells li{font-size:14px;display:flex;align-items:center;gap:10px}
  .tells .x{color:#f87171}.tells .w{margin-left:auto;color:#f87171;font-size:12px}
  .cta{margin-top:26px;display:flex;gap:10px;flex-wrap:wrap}
  .btn{display:inline-block;background:var(--text);color:#000;border:0;border-radius:8px;padding:11px 20px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}
  .btn.ghost{background:transparent;color:var(--text);border:1px solid var(--border)}
  .btn:hover{opacity:.85}
  .embed{margin-top:30px}
  .embed h3{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--dim);margin-bottom:10px}
  .embed-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
  .badge-prev{height:20px}
  .snippet-wrap{position:relative;margin-top:10px}
  .embed pre{margin:0;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px 64px 12px 14px;font-family:ui-monospace,monospace;font-size:12px;color:var(--muted);white-space:pre-wrap;overflow-wrap:anywhere;cursor:pointer}
  .embed pre:hover{border-color:var(--dim)}
  .copy-snip{position:absolute;top:8px;right:8px;background:var(--panel-2);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit}
  .copy-snip:hover{border-color:var(--accent)}
  .meta{margin-top:30px;font-size:12px;color:var(--dim);line-height:1.7}
  .flash{position:fixed;bottom:26px;left:50%;transform:translateX(-50%);background:#4ade80;color:#003314;padding:9px 18px;border-radius:8px;font-weight:600;font-size:13px;opacity:0;transition:opacity .2s;pointer-events:none}
  .flash.show{opacity:1}
  @media(max-width:520px){.grade{font-size:72px}.row{gap:16px}}
</style></head><body>
<div class="wrap">
  <div class="brand"><a href="/" style="color:inherit">slop&#8209;detect</a> <span class="slash">/ shared result</span></div>
  <div class="card">
    <div class="domain">${escapeHtml(s.finalUrl || s.url)}</div>
    ${s.title ? `<div class="ttl">${escapeHtml(s.title)}</div>` : '<div class="ttl"></div>'}
    <div class="row">
      <div class="grade">${escapeHtml(s.grade)}</div>
      <div class="col">
        <div class="score">${s.score}<small>/100</small></div>
        <div class="scale-note">slop score · lower is better</div>
        <div class="tier">${escapeHtml(s.tier)}</div>
        <div class="flagged">${s.patternsFlagged}/${s.patternsTotal} patterns triggered</div>
      </div>
    </div>
    <div class="verdict">${escapeHtml(s.verdict || '')}</div>
    ${tells ? `<div class="tells"><h3>Triggered patterns</h3><ul>${tells}</ul></div>` : ''}
  </div>

  <div class="cta">
    <a class="btn" href="/">Scan your own site →</a>
    <a class="btn ghost" href="/score/${encodeURIComponent(s.domain)}">${escapeHtml(s.domain)} history →</a>
    <button class="btn ghost" id="shareX">Share on X</button>
  </div>

  <div class="embed">
    <h3>Embed this badge</h3>
    <div class="embed-row">
      <img class="badge-prev" src="/badge/${domain}.svg" alt="slop badge">
      <span style="font-size:13px;color:var(--muted)">live · re-scans periodically</span>
    </div>
    <div class="snippet-wrap">
      <pre id="badgeMd">${escapeHtml(badgeMd)}</pre>
      <button class="copy-snip" id="copyBadge">Copy</button>
    </div>
  </div>

  <div class="meta">
    Scanned ${escapeHtml((s.createdAt || '').replace('T',' ').slice(0,16))} UTC ·
    definitions ${escapeHtml(s.definitionsVersion || 'n/a')} ·
    <a href="/">slop-detect.com</a>
  </div>
</div>
<div class="flash" id="flash">✓ Copied</div>
<script>
  const flash=(m)=>{const f=document.getElementById('flash');f.textContent='✓ '+m;f.classList.add('show');setTimeout(()=>f.classList.remove('show'),1500)};
  const copy=async(t,m)=>{try{await navigator.clipboard.writeText(t);flash(m)}catch(e){}};
  const badgeText=document.getElementById('badgeMd').textContent;
  document.getElementById('badgeMd').addEventListener('click',()=>copy(badgeText,'Badge copied'));
  document.getElementById('copyBadge').addEventListener('click',()=>copy(badgeText,'Badge copied'));
  document.getElementById('shareX').addEventListener('click',()=>{
    const text=${JSON.stringify(`${s.domain} scored ${s.grade} (${s.score}/100) on the AI-design-slop detector. ${s.verdict || ''}`)};
    const u='https://twitter.com/intent/tweet?text='+encodeURIComponent(text)+'&url='+encodeURIComponent(${JSON.stringify(pageUrl)});
    window.open(u,'_blank','noopener');
  });
</script>
</body></html>`;
}

function notFoundHtml(origin) {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Result not found — slop-detect</title>
<style>body{background:#0a0a0b;color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}a{color:#60a5fa}.b{max-width:420px;padding:24px}h1{font-size:22px;margin-bottom:10px}p{color:#8a8a92;margin-bottom:18px}.btn{display:inline-block;background:#f5f5f7;color:#000;border-radius:8px;padding:11px 20px;font-weight:600;text-decoration:none}</style>
</head><body><div class="b"><h1>Result expired or not found</h1><p>Shared results are kept for 90 days. This one may have expired.</p><a class="btn" href="${origin}/">Run a new scan →</a></div></body></html>`;
}
