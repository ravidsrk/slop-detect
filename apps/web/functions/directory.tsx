/** @jsxRuntime automatic @jsxImportSource hono/jsx */
// GET /directory — the public, crawlable catalogue of opt-in scanned sites.
//
// Server-rendered (so search engines index it) listing of every domain whose
// owner opted in via the claim/monitor flow (POST /api/watch { list:true }).
// Each row links OUT to the original site with a real (dofollow) backlink — the
// catalogue ranks for "is <site> AI slop", sends link equity to listed sites,
// and the backlink is the incentive that pulls owners into the claim + monitor
// funnel (see VALIDATION.md). Opt-in only: the directory never publishes an
// unrequested verdict on a company (MNR-27).
//
// Rebuilt as a full page in the design's "3. Leaderboard > 6. Directory (opt-in
// only)" language: the shared nav/footer shell, the 1.5px ink section-ledger,
// then owner-listed rows on the directory grid `26px 22px 1fr auto auto`
// (rank, letter-avatar chip, name + domain, "listed <date>", score/grade).
//
// Anti-slop by construction: it composes the shared _ui components and the light
// BRAND_CSS tokens — no Inter/Geist, no gradient text, no VibeCode purple, flat
// 1px surfaces — so this page itself scores Clean on slop-detect.

import { raw } from 'hono/html';
import { listAllSites, tierColors, jsonForScript } from './_shared.js';
import { BRAND_FONTS_HEAD, BRAND_CSS } from './_brand.js';
import { Nav, Footer, LetterAvatar, ScanInput, SectionLedger, UI_CSS } from './_ui.js';

const ORIGIN = 'https://slop-detect.com';

const PAGE_CSS = `
  .wrap{max-width:760px;margin:0 auto;padding:52px var(--pad-x) 0}
  h1{font-family:var(--serif);font-weight:500;font-size:var(--fs-h2-a);line-height:1.02;
     letter-spacing:-0.02em;color:var(--text);margin:14px 0 0}
  .dir-count{font-family:var(--mono);font-size:13px;color:var(--text-4);margin-top:16px}
  .dir-count strong{color:var(--text);font-weight:700}
  .dir-explain{max-width:60ch;margin-top:10px}

  .dir-bar{display:flex;justify-content:space-between;align-items:baseline;gap:12px;
     font-family:var(--mono);font-size:12px;color:var(--text-4);margin:30px 0 2px}
  .dir-bar a{color:var(--text-3);border-bottom:1px solid var(--border)}
  .dir-bar a:hover{color:var(--text);border-color:var(--text)}

  ol.dir{list-style:none}
  .dir-row{display:grid;grid-template-columns:26px 22px 1fr auto auto;gap:14px;
     align-items:center;padding:11px 4px;border-bottom:1px solid var(--row)}
  .dir-row:hover{background:var(--bg-2)}
  .dir-rank{font-family:var(--mono);font-size:12px;color:var(--text-6);text-align:right}
  .dir-name{min-width:0;display:flex;flex-direction:column;gap:1px}
  .dir-link{font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .dir-link:hover{text-decoration:underline;text-underline-offset:2px}
  .dir-dom{font-family:var(--mono);font-size:12px;color:var(--text-5);
     overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .dir-listed{font-family:var(--mono);font-size:11.5px;color:var(--text-6);white-space:nowrap;text-align:right}
  .dir-score{font-family:var(--mono);font-size:13px;color:var(--text-3);white-space:nowrap}
  .dir-score:hover .dir-sc{color:var(--text)}
  .dir-grade{font-weight:700}
  .dir-pending{font-family:var(--mono);font-size:12px;color:var(--text-6);white-space:nowrap}

  .dir-empty{padding:30px 4px;color:var(--text-4);font-size:var(--fs-body);border-bottom:1px solid var(--row)}
  .dir-empty a{color:var(--text);border-bottom:1px solid var(--border)}
  .dir-empty a:hover{border-color:var(--text)}

  .dir-add{margin:48px 0 80px;border-top:1.5px solid var(--text);padding-top:22px}
  .dir-add-h{font-family:var(--serif);font-weight:500;font-size:var(--fs-h2-c);
     line-height:1.05;letter-spacing:-0.02em;color:var(--text)}
  .dir-add-body{color:var(--text-2);margin:8px 0 18px;max-width:54ch}
  .dir-add .scan{max-width:440px}

  @media (max-width:560px){
    .wrap{padding-top:36px}
    .dir-row{grid-template-columns:22px 1fr auto;gap:10px}
    .dir-rank,.dir-listed{display:none}
  }
`;

// Listing dates arrive as ISO strings from KV metadata (listedAt). Format them by
// slicing the date part — no Date object, so it's deterministic and TZ-free.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatListed(iso) {
  if (typeof iso !== 'string' || iso.length < 10) return null;
  const mon = MONTHS[parseInt(iso.slice(5, 7), 10) - 1];
  const day = parseInt(iso.slice(8, 10), 10);
  const year = iso.slice(0, 4);
  if (!mon || !day || !/^\d{4}$/.test(year)) return null;
  return `${mon} ${day}, ${year}`;
}

// One directory row on the `26px 22px 1fr auto auto` grid. The domain link is the
// dofollow backlink (a plain <a href> with no rel — the gift). The score/grade
// readout links to the per-domain score hub, closing the re-scan loop. A listed-
// but-not-yet-scored domain shows "Pending", never "Unlisted" — it IS listed.
function Row({ site, rank, origin }) {
  const c = tierColors(site.tier);
  const name = site.title || site.domain;
  const listed = formatListed(site.listedAt);
  const scored = site.score != null;
  return (
    <li class="dir-row">
      <span class="dir-rank">{rank}</span>
      <LetterAvatar name={site.domain} size={20} />
      <span class="dir-name">
        <a class="dir-link" href={`https://${site.domain}`}>
          {name}
        </a>
        {site.title ? <span class="dir-dom">{site.domain}</span> : null}
      </span>
      <span class="dir-listed">{listed ? `listed ${listed}` : ''}</span>
      {scored ? (
        <a
          class="dir-score"
          href={`${origin}/score/${site.domain}`}
          aria-label={`${site.domain}: slop score ${site.score}, grade ${site.grade || '—'}`}
        >
          <span class="dir-sc">{site.score}</span>{' '}
          <span class="dir-grade" style={`color:${c.fg}`}>
            {site.grade || '—'}
          </span>
        </a>
      ) : (
        <span class="dir-pending">Pending</span>
      )}
    </li>
  );
}

// ItemList JSON-LD so the catalogue is machine-readable for search/AEO crawlers.
function jsonLd(sites) {
  return jsonForScript({
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
  const url = new URL(request.url);
  const origin = url.origin;
  const sort = url.searchParams.get('sort') === 'slop' ? 'slop' : 'clean';

  // Works with no RESULTS binding: an unconfigured environment renders the empty
  // state rather than erroring.
  let sites = [];
  if (env?.RESULTS) {
    sites = await listAllSites(env.RESULTS).catch(() => []);
  }
  sites.sort((a, b) => {
    // Pending (unscored) entries always sink to the end, in both sort modes.
    if (a.score == null && b.score == null) return 0;
    if (a.score == null) return 1;
    if (b.score == null) return -1;
    return sort === 'slop' ? b.score - a.score : a.score - b.score;
  });

  const n = sites.length;
  const other = sort === 'slop' ? 'clean' : 'slop';
  const otherLabel = sort === 'slop' ? 'cleanest first' : 'sloppiest first';
  const sortLabel = sort === 'slop' ? 'sloppiest first' : 'cleanest first';

  const doc = (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Directory — sites scored for AI design slop · slop-detect</title>
        <meta
          name="description"
          content="An opt-in catalogue of websites scored against the AI-design-slop fingerprint. Each listed site links out with a dofollow backlink, ranked by how generic its design reads."
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
        <style>{raw(BRAND_CSS + UI_CSS + PAGE_CSS)}</style>
      </head>
      <body>
        <Nav origin={origin} />
        <main class="wrap">
          <SectionLedger tag="/directory" label="opt-in only" />
          <h1>The directory</h1>
          <p class="dir-count">
            <strong>{n}</strong> site{n === 1 ? '' : 's'} listed {raw('&middot;')} dofollow
            backlinks
          </p>
          <p class="lead dir-explain">
            Owners opt in to appear here. Scanning is free; listing is a choice. Each row links to
            the live site and to its score over time.
          </p>

          {n > 0 ? (
            <div class="dir-bar">
              <span>{sortLabel}</span>
              <a href={`${origin}/directory?sort=${other}`}>sort: {otherLabel}</a>
            </div>
          ) : null}

          <ol class="dir">
            {n > 0 ? (
              sites.map((s, i) => <Row site={s} rank={i + 1} origin={origin} />)
            ) : (
              <li class="dir-empty">
                No sites listed yet. <a href={`${origin}/`}>Scan a site</a>, then claim it to appear
                here with a backlink.
              </li>
            )}
          </ol>

          <section class="dir-add" aria-labelledby="dir-add-h">
            <h2 class="dir-add-h" id="dir-add-h">
              Don't see your site?
            </h2>
            <p class="dir-add-body">
              Scan it, then opt in from the result to list it here with a backlink.
            </p>
            <ScanInput variant="leaderboard" id="dir-scan" label="Scan" />
          </section>
        </main>
        <Footer origin={origin} />
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
