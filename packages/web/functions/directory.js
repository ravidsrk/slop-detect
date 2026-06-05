// GET /directory — the public, crawlable catalogue of opt-in scanned sites.
//
// Server-rendered (so search engines index it) listing of every domain whose
// owner opted in via the claim/monitor flow (POST /api/watch { list:true }).
// Each row links OUT to the original site with a real (dofollow) backlink — the
// catalogue ranks for "is <site> AI slop", sends link equity to listed sites,
// and the backlink is the incentive that pulls owners into the claim + monitor
// funnel (see VALIDATION.md).
//
// Anti-slop by construction: no Inter/Geist, no gradient text, no VibeCode
// purple, no glows — this page should itself score Clean on slop-detect.

import { listAllSites, tierColors, escapeHtml } from './_shared.js';

const ORIGIN = 'https://slop-detect.com';

function row(site, origin) {
  const c = tierColors(site.tier);
  const grade = site.grade || '—';
  const score = site.score == null ? 'pending' : `${site.score}`;
  // A listed-but-not-yet-scored domain has tier null — it IS listed, only the
  // score is pending, so don't mislabel it "Unlisted".
  const tier = site.tier || 'Pending';
  const title = site.title ? `<span class="ti">${escapeHtml(site.title)}</span>` : '';
  // The dofollow backlink — a plain <a href> with no rel. This is the gift.
  const out = `<a class="dom" href="https://${escapeHtml(site.domain)}">${escapeHtml(site.domain)}</a>`;
  const scanLink = site.id
    ? `<a class="scan" href="${origin}/r/${escapeHtml(site.id)}">scan&nbsp;&rarr;</a>`
    : '';
  return `<li class="r">
    <span class="g" style="color:${c.fg};border-color:${c.fg}">${escapeHtml(grade)}</span>
    <span class="sc">${escapeHtml(score)}<small>${site.score == null ? '' : '/100'}</small></span>
    <span class="t" style="color:${c.fg}">${escapeHtml(tier)}</span>
    <span class="d">${out}${title}</span>
    ${scanLink}
  </li>`;
}

function jsonLd(sites, origin) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'slop-detect — directory of scanned sites',
    description: 'Opt-in catalogue of sites scored against the AI-design-slop fingerprint.',
    numberOfItems: sites.length,
    itemListElement: sites.slice(0, 200).map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://${s.domain}`,
      name: s.domain
    }))
  });
}

export async function onRequestGet({ request, env }) {
  const origin = new URL(request.url).origin;
  const sort = new URL(request.url).searchParams.get('sort') === 'slop' ? 'slop' : 'clean';

  let sites = [];
  if (env.RESULTS) {
    sites = await listAllSites(env.RESULTS).catch(() => []);
  }
  sites.sort((a, b) => {
    const sa = a.score == null ? Infinity : a.score;
    const sb = b.score == null ? Infinity : b.score;
    return sort === 'slop' ? sb - sa : sa - sb;
  });

  const other = sort === 'slop' ? 'clean' : 'slop';
  const otherLabel = sort === 'slop' ? 'cleanest first' : 'sloppiest first';

  const rows = sites.length
    ? sites.map(s => row(s, origin)).join('\n')
    : `<li class="empty">No sites listed yet. Scan your site, then
        <a href="${origin}/">claim it</a> to appear here with a backlink.</li>`;

  const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Directory — sites scored for AI design slop · slop-detect</title>
<meta name="description" content="An opt-in catalogue of websites scored against the ${''}AI-design-slop fingerprint. Each listed site links out, ranked by how generic its design reads.">
<link rel="canonical" href="${ORIGIN}/directory">
<meta property="og:title" content="Directory of sites scored for AI design slop">
<meta property="og:description" content="Opt-in catalogue of sites ranked by the AI-design-slop fingerprint.">
<meta property="og:url" content="${ORIGIN}/directory">
<meta property="og:image" content="${ORIGIN}/og.png">
<script type="application/ld+json">${jsonLd(sites, origin)}</script>
<style>
  :root{color-scheme:dark}
  *{margin:0;padding:0;box-sizing:border-box}
  body{
    background:#0a0a0b;color:#e7e7ea;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
    line-height:1.5;padding:48px 20px 80px;
  }
  .wrap{max-width:820px;margin:0 auto}
  a{color:inherit}
  header{border-bottom:1px solid #232327;padding-bottom:20px;margin-bottom:8px}
  .kick{font-family:ui-monospace,Menlo,monospace;font-size:12px;letter-spacing:.04em;color:#6b6b73;text-transform:uppercase}
  h1{font-size:30px;font-weight:650;letter-spacing:-0.01em;margin:6px 0 8px}
  .sub{color:#a1a1aa;font-size:15px;max-width:60ch}
  .sub a{color:#e7e7ea;text-decoration:underline;text-underline-offset:2px}
  .bar{display:flex;justify-content:space-between;align-items:center;
       font-family:ui-monospace,Menlo,monospace;font-size:12.5px;color:#8a8a92;
       padding:14px 2px 8px}
  .bar a{color:#e7e7ea;text-decoration:none;border-bottom:1px solid #3a3a40;padding-bottom:1px}
  ol{list-style:none}
  .r{display:grid;grid-template-columns:34px 78px 64px 1fr auto;gap:12px;align-items:baseline;
     padding:13px 2px;border-bottom:1px solid #18181b;font-size:15px}
  .g{font-family:ui-monospace,Menlo,monospace;font-weight:700;font-size:14px;
     border:1px solid;border-radius:5px;text-align:center;padding:1px 0}
  .sc{font-family:ui-monospace,Menlo,monospace;color:#d4d4d8;font-size:14px}
  .sc small{color:#6b6b73;font-size:11px}
  .t{font-family:ui-monospace,Menlo,monospace;font-size:12.5px}
  .d{min-width:0;overflow:hidden}
  .dom{font-weight:550;text-decoration:none;border-bottom:1px solid #3a3a40;padding-bottom:1px}
  .dom:hover{border-color:#e7e7ea}
  .ti{display:block;color:#71717a;font-size:12.5px;margin-top:2px;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .scan{font-family:ui-monospace,Menlo,monospace;font-size:12px;color:#8a8a92;text-decoration:none;white-space:nowrap}
  .scan:hover{color:#e7e7ea}
  .empty{padding:28px 2px;color:#8a8a92}
  .empty a{color:#e7e7ea}
  footer{margin-top:28px;font-family:ui-monospace,Menlo,monospace;font-size:12px;color:#5a5a62}
  footer a{color:#8a8a92}
  @media(max-width:560px){
    .r{grid-template-columns:30px 1fr auto;gap:8px}
    .t,.scan{display:none}
  }
</style>
</head><body><div class="wrap">
  <header>
    <div class="kick">slop-detect / directory</div>
    <h1>Sites scored for AI design slop</h1>
    <p class="sub">An opt-in catalogue. Owners <a href="${origin}/">claim their domain</a>
      to appear here &mdash; with a live badge and a link back to their site.
      Detection is free; listing is a choice.</p>
  </header>
  <div class="bar">
    <span>${sites.length} site${sites.length === 1 ? '' : 's'} &middot; ${escapeHtml(sort)} first</span>
    <a href="${origin}/directory?sort=${other}">sort: ${otherLabel}</a>
  </div>
  <ol>${rows}</ol>
  <footer>
    Listed by opt-in only. <a href="${origin}/">Scan a site</a> &middot;
    <a href="https://github.com/ravidsrk/slop-detect">source</a>
  </footer>
</div></body></html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=120, s-maxage=300'
    }
  });
}
