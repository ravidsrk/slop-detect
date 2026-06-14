/** @jsxRuntime automatic @jsxImportSource hono/jsx */
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

import { raw } from 'hono/html';
import { listAllSites, tierColors } from './_shared.js';
import { BRAND_FONTS_HEAD, BRAND_CSS } from './_brand.js';

const ORIGIN = 'https://slop-detect.com';

const PAGE_CSS = `
  body{padding:48px 20px 80px}
  .wrap{max-width:820px;margin:0 auto}
  header{border-bottom:1px solid var(--border);padding-bottom:20px;margin-bottom:8px}
  h1{font-size:30px;font-weight:700;letter-spacing:-0.02em;margin:2px 0 8px}
  .sub{color:var(--muted);font-size:15px;max-width:60ch}
  .sub a{color:var(--text);text-decoration:underline;text-underline-offset:2px}
  .bar{display:flex;justify-content:space-between;align-items:center;
       font-family:var(--mono);font-size:12px;color:var(--dim);
       padding:14px 2px 8px}
  .bar a{color:var(--text-2);text-decoration:none;border-bottom:1px solid var(--border-2);padding-bottom:1px}
  .bar a:hover{color:var(--text)}
  ol{list-style:none}
  .r{display:grid;grid-template-columns:34px 78px 64px 1fr auto;gap:12px;align-items:baseline;
     padding:13px 2px;border-bottom:1px solid var(--bg-2);font-size:15px}
  .g{font-family:var(--mono);font-weight:700;font-size:14px;
     border:1px solid;border-radius:5px;text-align:center;padding:1px 0}
  .sc{font-family:var(--mono);color:var(--text-2);font-size:13px}
  .sc small{color:var(--dim);font-size:11px}
  .t{font-family:var(--mono);font-size:12px}
  .d{min-width:0;overflow:hidden}
  .dom{font-weight:600;text-decoration:none;border-bottom:1px solid var(--border-2);padding-bottom:1px}
  .dom:hover{border-color:var(--text)}
  .ti{display:block;color:var(--dim);font-size:12.5px;margin-top:2px;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .scan{font-family:var(--mono);font-size:11.5px;color:var(--dim);text-decoration:none;white-space:nowrap}
  .scan:hover{color:var(--text)}
  .empty{padding:28px 2px;color:var(--muted)}
  .empty a{color:var(--text)}
  footer{margin-top:28px;font-family:var(--mono);font-size:11.5px;color:var(--dim)}
  footer a{color:var(--muted)}
  @media(max-width:560px){
    .r{grid-template-columns:30px 1fr auto;gap:8px}
    .t,.scan{display:none}
  }
`;

function Row({ site, origin }) {
  const c = tierColors(site.tier);
  const grade = site.grade || '—';
  const score = site.score == null ? 'pending' : `${site.score}`;
  // A listed-but-not-yet-scored domain has tier null — it IS listed, only the
  // score is pending, so don't mislabel it "Unlisted".
  const tier = site.tier || 'Pending';
  return (
    <li class="r">
      <span class="g" style={`color:${c.fg};border-color:${c.fg}`}>
        {grade}
      </span>
      <span class="sc">
        {score}
        <small>{site.score == null ? '' : '/100'}</small>
      </span>
      <span class="t" style={`color:${c.fg}`}>
        {tier}
      </span>
      <span class="d">
        {/* The dofollow backlink — a plain <a href> with no rel. This is the gift. */}
        <a class="dom" href={`https://${site.domain}`}>
          {site.domain}
        </a>
        {site.title ? <span class="ti">{site.title}</span> : null}
      </span>
      {site.id ? (
        <a class="scan" href={`${origin}/r/${site.id}`}>
          {raw('scan&nbsp;&rarr;')}
        </a>
      ) : null}
    </li>
  );
}

function jsonLd(sites) {
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
      name: s.domain,
    })),
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
    // Pending (unscored) entries always sink to the end, in both sort modes.
    if (a.score == null && b.score == null) return 0;
    if (a.score == null) return 1;
    if (b.score == null) return -1;
    return sort === 'slop' ? b.score - a.score : a.score - b.score;
  });

  const other = sort === 'slop' ? 'clean' : 'slop';
  const otherLabel = sort === 'slop' ? 'cleanest first' : 'sloppiest first';

  const doc = (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Directory — sites scored for AI design slop · slop-detect</title>
        <meta
          name="description"
          content="An opt-in catalogue of websites scored against the AI-design-slop fingerprint. Each listed site links out, ranked by how generic its design reads."
        />
        <link rel="canonical" href={`${ORIGIN}/directory`} />
        <meta property="og:title" content="Directory of sites scored for AI design slop" />
        <meta
          property="og:description"
          content="Opt-in catalogue of sites ranked by the AI-design-slop fingerprint."
        />
        <meta property="og:url" content={`${ORIGIN}/directory`} />
        <meta property="og:image" content={`${ORIGIN}/og.png`} />
        <script type="application/ld+json">{raw(jsonLd(sites))}</script>
        {raw(BRAND_FONTS_HEAD)}
        <style>{raw(BRAND_CSS + PAGE_CSS)}</style>
      </head>
      <body>
        <div class="wrap">
          <header>
            <div class="eyebrow">
              <span class="reg">{raw('&sect;dir')}</span>
              <span class="reg-label">the directory</span>
            </div>
            <h1>Sites scored for AI design slop</h1>
            <p class="sub">
              An opt-in catalogue. Owners <a href={`${origin}/`}>claim their domain</a> to appear
              here {raw('&mdash;')} with a live badge and a link back to their site. Detection is
              free; listing is a choice.
            </p>
          </header>
          <div class="bar">
            <span>
              {sites.length} site{sites.length === 1 ? '' : 's'} {raw('&middot;')} {sort} first
            </span>
            <a href={`${origin}/directory?sort=${other}`}>sort: {otherLabel}</a>
          </div>
          <ol>
            {sites.length ? (
              sites.map((s) => <Row site={s} origin={origin} />)
            ) : (
              <li class="empty">
                No sites listed yet. Scan your site, then <a href={`${origin}/`}>claim it</a> to
                appear here with a backlink.
              </li>
            )}
          </ol>
          <footer>
            Listed by opt-in only. <a href={`${origin}/`}>Scan a site</a> {raw('&middot;')}{' '}
            <a href="https://github.com/ravidsrk/slop-detect">source</a>
          </footer>
        </div>
      </body>
    </html>
  );

  return new Response('<!doctype html>' + doc.toString(), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=120, s-maxage=300',
    },
  });
}
