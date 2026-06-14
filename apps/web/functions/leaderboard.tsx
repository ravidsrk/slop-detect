/** @jsxRuntime automatic @jsxImportSource hono/jsx */
// GET /leaderboard — "The State of AI Design Slop", a reproducible research page.
//
// Reads the generated dataset (public/leaderboard.json, produced by
// leaderboard/build.mjs) at request time so regenerating the data needs no
// function redeploy. Editorial framing on purpose: a headline aggregate stat +
// a positive, NAMED "Hall of Clean" + a by-builder breakdown — NOT a named hall
// of shame (consistent with the opt-in directory + the ROADMAP guardrail: a
// fingerprint, not a verdict on any company).
//
// Anti-slop by construction: no Inter/Geist, no gradient text, no VibeCode
// purple — this page should itself score Clean.

import { raw } from 'hono/html';
import { tierColors, getStats } from './_shared.js';
import { BRAND_FONTS_HEAD, BRAND_CSS } from './_brand.js';

const ORIGIN = 'https://slop-detect.com';

// Display names + order for the corpus categories (see leaderboard/corpus.json).
const CATEGORY_NAMES = {
  'ai-builder': 'AI builders',
  saas: 'SaaS & dev tools',
  bigtech: 'Big tech',
  classic: 'Classic, deliberately plain',
};
const CATEGORY_ORDER = ['ai-builder', 'saas', 'bigtech', 'classic'];

const PAGE_CSS = `
  body{padding:48px 20px 80px}
  .wrap{max-width:760px;margin:0 auto}
  h1{font-size:32px;font-weight:700;letter-spacing:-0.02em;margin:2px 0 14px}
  h2{font-size:20px;font-weight:700;letter-spacing:-0.01em;margin:36px 0 6px}
  .lead{font-size:19px;color:var(--text-2);max-width:62ch}
  .lead strong{color:var(--text)}
  .note{color:var(--muted);font-size:14px;margin-bottom:12px;max-width:62ch}
  .livestat{font-family:var(--mono);font-size:13px;color:var(--muted);margin:14px 0 4px}
  .livestat strong{color:var(--text)}
  .rows{list-style:none;margin-top:8px}
  .r{display:grid;grid-template-columns:24px 34px 78px 1fr;gap:12px;align-items:baseline;padding:11px 2px;border-bottom:1px solid var(--bg-2)}
  .rank{font-family:var(--mono);font-size:12px;color:var(--dim);text-align:right}
  .g{font-family:var(--mono);font-weight:700;font-size:14px;border:1px solid;border-radius:5px;text-align:center;padding:1px 0}
  .sc{font-family:var(--mono);color:var(--text-2);font-size:13px}
  .sc small{color:var(--dim);font-size:11px}
  .dom{font-weight:600;text-decoration:none;border-bottom:1px solid var(--border-2);padding-bottom:1px}
  .dom:hover{border-color:var(--text)}
  .scan{font-family:var(--mono);font-size:11.5px;color:var(--dim);text-decoration:none;white-space:nowrap}
  table{border-collapse:collapse;margin-top:8px;width:100%;max-width:420px}
  th,td{text-align:left;padding:7px 14px 7px 0;font-size:14px;border-bottom:1px solid var(--bg-2)}
  th{color:var(--dim);font-weight:500;font-family:var(--mono);font-size:11.5px}
  td:nth-child(3),th:nth-child(3),td:nth-child(2),th:nth-child(2){font-family:var(--mono)}
  .cta{margin:40px 0;padding:18px 20px;background:var(--accent-soft);border:1px solid var(--border-2);border-radius:10px}
  .cta a{color:var(--text);border-bottom:1px solid var(--border-2);text-decoration:none}
  .cta a:hover{border-color:var(--text)}
  .meth{margin-top:40px;color:var(--dim);font-size:13px;max-width:64ch}
  .meth code{font-family:var(--mono);color:var(--muted)}
  footer{margin-top:32px;font-family:var(--mono);font-size:11.5px;color:var(--dim)}
  footer a{color:var(--muted)}
  @media(max-width:560px){.r{grid-template-columns:34px 64px 1fr}.rank{display:none}}
`;

async function loadData(request) {
  try {
    const res = await fetch(new URL('/leaderboard.json', request.url), {
      cf: { cacheTtl: 300 },
    } as any);
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

// One ranked row. The domain links into its score hub (history, re-scan, claim),
// closing the loop instead of dead-ending on the external site.
function RankRow({ s, rank, origin }) {
  const c = tierColors(s.tier);
  return (
    <li class="r">
      <span class="rank">{rank}</span>
      <span class="g" style={`color:${c.fg};border-color:${c.fg}`}>
        {s.grade}
      </span>
      <span class="sc">
        {s.score}
        <small>/100</small>
      </span>
      <span class="d">
        <a class="dom" href={`${origin}/score/${s.domain}`}>
          {s.domain}
        </a>
      </span>
    </li>
  );
}

// Group scored sites by category and render each as a cleanest-first ranking.
function CategorySections({ sites, origin }) {
  const groups = {};
  for (const s of sites)
    (groups[s.category || 'other'] = groups[s.category || 'other'] || []).push(s);
  const keys = [
    ...CATEGORY_ORDER.filter((k) => groups[k]),
    ...Object.keys(groups).filter((k) => !CATEGORY_ORDER.includes(k)),
  ];
  return (
    <>
      {keys.map((k) => (
        <>
          <h2>{CATEGORY_NAMES[k] || k}</h2>
          <ol class="rows">
            {groups[k]
              .slice()
              .sort((a, b) => a.score - b.score)
              .map((s, i) => (
                <RankRow s={s} rank={i + 1} origin={origin} />
              ))}
          </ol>
        </>
      ))}
    </>
  );
}

// Rows of the by-builder table; [] when there's no usable builder data.
function builderEntries(byBuilder) {
  return Object.entries<any>(byBuilder || {})
    .filter(([, v]) => v && v.avgScore != null)
    .sort((a, b) => b[1].avgScore - a[1].avgScore);
}

function BuilderRows({ entries }) {
  return (
    <>
      {entries.map(([name, v]) => {
        const tier = v.avgScore >= 28 ? 'Heavy' : v.avgScore >= 10 ? 'Mild' : 'Clean';
        const c = tierColors(tier);
        return (
          <tr>
            <td>{name}</td>
            <td>{v.count}</td>
            <td style={`color:${c.fg}`}>{v.avgScore}</td>
          </tr>
        );
      })}
    </>
  );
}

export async function onRequestGet({ request, env }) {
  const origin = new URL(request.url).origin;
  const data = await loadData(request);
  const live = env?.RESULTS ? await getStats(env.RESULTS).catch(() => null) : null;

  const generating = !data || !data.scored;
  const stats = data?.stats || {};
  const sites = (data?.sites || []).filter((s) => s.scored);
  const when = data?.generatedAt ? new Date(data.generatedAt).toISOString().slice(0, 10) : '—';

  // Live counter across every scan slop-detect has run (not just the corpus),
  // shown only once it reads as momentum rather than "0".
  const showLive = !!(live && live.count >= 50);

  const builders = generating ? [] : builderEntries(data.byBuilder);

  const doc = (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>The State of AI Design Slop · slop-detect</title>
        <meta
          name="description"
          content="A reproducible scan of well-known landing pages against the AI-design-slop fingerprint: how much of the web now looks AI-generated, and who's still clean."
        />
        <link rel="canonical" href={`${ORIGIN}/leaderboard`} />
        <meta property="og:title" content="The State of AI Design Slop" />
        <meta
          property="og:description"
          content="How much of the web now looks AI-generated — a reproducible scan of well-known landing pages."
        />
        <meta property="og:url" content={`${ORIGIN}/leaderboard`} />
        <meta property="og:image" content={`${ORIGIN}/og.png`} />
        {raw(BRAND_FONTS_HEAD)}
        <style>{raw(BRAND_CSS + PAGE_CSS)}</style>
      </head>
      <body>
        <div class="wrap">
          <div class="eyebrow">
            <span class="reg">{raw('&sect;rpt')}</span>
            <span class="reg-label">the report</span>
          </div>
          <h1>The State of AI Design Slop</h1>

          {generating ? (
            <p class="lead">
              The latest report is being generated {raw('&mdash;')} check back shortly. In the
              meantime, <a href={`${origin}/`}>scan your own site</a>.
            </p>
          ) : (
            <p class="lead">
              <strong>{stats.slopShare}%</strong> of {data.scored} well-known landing pages we
              scanned carry detectable AI-design-slop tells (score {raw('&ge;')} 10). Average score{' '}
              <strong>{stats.avgScore}</strong>/100. {stats.cleanCount} Clean {raw('&middot;')}{' '}
              {stats.mildCount} Mild {raw('&middot;')} {stats.heavyCount} Heavy.
            </p>
          )}

          {showLive && (
            <p class="livestat">
              Across every page slop-detect has scored:{' '}
              <strong>{live.count.toLocaleString('en-US')}</strong> scans, average{' '}
              <strong>{live.avgScore}</strong>/100, {live.slopShare}% carry slop.
            </p>
          )}

          <div class="cta">
            Wondering about your own site? <a href={`${origin}/`}>Scan it free</a> {raw('&middot;')}{' '}
            keep it clean over time with <a href={`${origin}/#monitor`}>monitoring</a>.
          </div>

          {!generating && sites.length > 0 && (
            <>
              <p class="note">
                Cleanest first within each category. Every name links to its score hub.
              </p>
              <CategorySections sites={sites} origin={origin} />
            </>
          )}

          {!generating && builders.length > 0 && (
            <>
              <h2>By builder</h2>
              <p class="note">
                Average slop score grouped by how the site was built. Tools, not teams.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Built with</th>
                    <th>n</th>
                    <th>avg score</th>
                  </tr>
                </thead>
                <tbody>
                  <BuilderRows entries={builders} />
                </tbody>
              </table>
            </>
          )}

          <p class="meth">
            Methodology: each URL scanned once in a headless browser against the 27-pattern,
            weighted, deterministic AI-design-slop fingerprint (definitions{' '}
            {data?.definitionsVersion || '2026.09'}), {String(when)}. Reproduce any row:{' '}
            <code>{'npx slop-detect <url>'}</code>. A slop score is a{' '}
            <em>fingerprint, not a verdict</em> {raw('&mdash;')} everyone uses AI now; this measures
            how generic the result reads, nothing about the team behind it.
          </p>

          <footer>
            <a href={`${origin}/`}>slop-detect.com</a> {raw('&middot;')}{' '}
            <a href={`${origin}/directory`}>directory</a> {raw('&middot;')}{' '}
            <a href="https://github.com/ravidsrk/slop-detect">source</a>
          </footer>
        </div>
      </body>
    </html>
  );

  const html = '<!doctype html>' + doc.toString();

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=600',
    },
  });
}
