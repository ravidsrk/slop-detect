/** @jsxRuntime automatic @jsxImportSource hono/jsx */
// GET /leaderboard — "The state of AI design slop", a reproducible research page.
//
// Reads the generated dataset (public/leaderboard.json, produced by
// leaderboard/build.mjs) at request time so regenerating the data needs no
// function redeploy (MNR-20). When the file is absent or unscored the page shows
// a "being generated" state. The live all-time counter comes from getStats(RESULTS)
// (MNR-21) and only appears once it reads as momentum (>= 50 scans).
//
// Editorial framing on purpose (MNR-27): a corpus aggregate, a 10-bucket
// distribution, a positive "Hall of Clean" (cleanest overall + cleanest per
// category), and a by-builder breakdown — never a named hall of shame. Every name
// links into its /score hub, closing the loop instead of dead-ending on the site.
//
// Built from the shared shell (_ui.tsx) on the light editorial-instrument system:
// no AI-default faces, no purple CTA, no gradient or background-clip text, flat 1px
// surfaces. This page must itself score Clean on the detector it reports.

import { raw } from 'hono/html';
import { DEFINITIONS_VERSION, PATTERNS } from '@slop-detect/core';
import { getStats, listAllSites } from './_data.js';
import { tierFor, tierFill, tierText } from './_theme.js';
import { BRAND_FONTS_HEAD, BRAND_CSS } from './_brand.js';
import { Nav, Footer, StatsStrip, LeaderboardRow, Cta, ScanInput, UI_CSS } from './_ui.js';

const ORIGIN = 'https://slop-detect.com';
const CALIBRATION_URL = 'https://github.com/ravidsrk/slop-detect/blob/main/CALIBRATION.md';

// Display names + order for the corpus categories (see leaderboard/corpus.json).
const CATEGORY_NAMES: Record<string, string> = {
  'ai-builder': 'AI builders',
  saas: 'SaaS & dev tools',
  bigtech: 'Big tech',
  classic: 'Classic, deliberately plain',
};
const CATEGORY_ORDER = ['classic', 'saas', 'bigtech', 'ai-builder'];

// The distribution is bucketed into ten 10-point bands; the last band catches
// 90..100. Each bar is tinted by the tier its band sits in (Clean / Mild / Heavy),
// so the chart reads left-to-right as clean -> heavy without any gradient.
const BUCKETS = 10;
const BAR_MAX = 140;

const PAGE_CSS = `
  .lb-wrap{max-width:1080px;margin:0 auto;padding:0 var(--pad-x)}
  .lb-head{padding:56px 0 26px}
  .lb-eyebrow{font-family:var(--mono);font-size:13px;color:var(--clean-text);margin-bottom:14px}
  .lb-h1{font-family:var(--serif);font-weight:500;font-size:var(--fs-display-2);line-height:1.12;letter-spacing:-0.02em;color:var(--text);margin-bottom:18px}
  .lb-pos{font-size:var(--fs-lead);line-height:1.6;color:var(--text-2);max-width:66ch}
  .lb-pos strong{color:var(--text);font-weight:600}
  .lb-pos a{color:var(--text);border-bottom:1px solid var(--border-btn);padding-bottom:1px}
  .lb-pos a:hover{border-color:var(--text)}
  .lb-disc{margin-top:16px;font-size:14px;line-height:1.6;color:var(--text-4);max-width:66ch}
  .lb-live{font-family:var(--mono);font-size:13px;color:var(--text-4);margin:22px 0 4px}
  .lb-live strong{color:var(--text);font-weight:700}

  .lb-sec{padding:34px 0}
  .lb-sec-h{font-family:var(--serif);font-weight:500;font-size:var(--fs-h2-c);line-height:1.18;letter-spacing:-0.02em;color:var(--text)}
  .lb-sec-sub{margin-top:8px;font-size:14px;color:var(--text-4);max-width:62ch}

  /* distribution histogram */
  .hb-fig{margin:22px 0 0}
  .hb{display:grid;grid-template-columns:repeat(${BUCKETS},1fr);gap:7px;align-items:end;list-style:none}
  .hb-col{display:grid;grid-template-rows:18px ${BAR_MAX}px auto;align-items:end;justify-items:center;gap:6px;cursor:pointer;padding:4px 2px;border-radius:3px;transition:background var(--t)}
  .hb-col:hover,.hb-col.active{background:var(--bg-2)}
  .hb-n{font-family:var(--mono);font-size:12px;color:var(--text-5);line-height:1}
  .hb-bar{width:100%;align-self:end;border-radius:3px 3px 0 0;min-height:2px;height:var(--h);animation:hb-grow .6s ease both}
  .hb-x{font-family:var(--mono);font-size:12px;color:var(--text-6);line-height:1}
  .hb-axis{display:flex;justify-content:space-between;margin-top:10px;font-family:var(--mono);font-size:12px;color:var(--text-5)}
  .hb-cap{margin-top:12px;font-size:13px;color:var(--text-4);max-width:62ch}
  @keyframes hb-grow{from{height:0}to{height:var(--h)}}

  /* interactive filter bar */
  .lb-controls{margin-top:16px;padding:12px 14px;background:var(--bg-2);border:1px solid var(--border);border-radius:6px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .lb-search{flex:1;min-width:210px;background:var(--panel);border:1px solid var(--border-btn);border-radius:3px;padding:8px 12px;font-family:var(--mono);font-size:13px;color:var(--text)}
  .lb-tiers{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
  .lb-tier-btn{font-family:var(--mono);font-size:12px;color:var(--text-3);background:var(--panel);border:1px solid var(--border-chip);border-radius:3px;padding:6px 11px;cursor:pointer;transition:var(--t)}
  .lb-tier-btn:hover{border-color:var(--text);color:var(--text)}
  .lb-tier-btn.active{background:var(--text);color:var(--d-text);border-color:var(--text)}
  .lb-compare-link{font-family:var(--mono);font-size:12px;color:var(--clean-text)}
  .lb-compare-link:hover{color:var(--text)}
  .lb-filter-row[hidden]{display:none}

  /* the cleanest-overall + per-category 2-up boards */
  .lb-2col{display:grid;grid-template-columns:repeat(2,1fr);gap:6px 40px;margin-top:18px}
  .lb-boards{display:grid;grid-template-columns:repeat(2,1fr);gap:32px 40px;margin-top:20px}
  .lb-board-h{font-family:var(--mono);font-size:12px;font-weight:500;color:var(--text-3);letter-spacing:0;padding-bottom:8px;border-bottom:1px solid var(--border);margin-bottom:2px}
  .lb-board-h small{font-size:12px;color:var(--text-4);font-weight:400}
  .lb-dir-pill{display:inline-block;font-family:var(--mono);font-size:12px;font-weight:500;color:var(--text-3);background:var(--bg-2);border:1px solid var(--border);border-radius:3px;padding:2px 8px;margin-left:10px;vertical-align:middle}

  /* by-builder ledger table */
  .lb-tbl{border-collapse:collapse;width:100%;max-width:520px;margin-top:18px}
  .lb-tbl caption{text-align:left;font-family:var(--mono);font-size:12px;color:var(--text-5);padding-bottom:8px}
  .lb-tbl th,.lb-tbl td{text-align:left;padding:9px 14px 9px 0;font-size:14px;border-bottom:1px solid var(--row)}
  .lb-tbl th{font-family:var(--mono);font-size:12px;font-weight:500;color:var(--text-5)}
  .lb-tbl td:first-child{font-family:var(--mono);color:var(--text-2)}
  .lb-tbl td.lb-num,.lb-tbl th.lb-num{font-family:var(--mono);text-align:right;white-space:nowrap}
  .lb-tbl tbody td.lb-num{background:#FFFFFF;padding-right:6px;padding-left:6px}

  /* CTA scan form */
  .lb-cta{padding:48px 0 8px}
  .lb-cta-form{max-width:520px;margin:22px auto 0}
  .lb-cta-note{margin-top:14px;text-align:center;font-family:var(--mono);font-size:13px;color:var(--text-4)}
  .lb-cta-note a{color:var(--text);border-bottom:1px solid var(--border-btn);padding-bottom:1px}
  .lb-cta-note a:hover{border-color:var(--text)}

  .lb-meth{margin:8px 0 8px;padding:26px 0 48px;font-size:13px;line-height:1.7;color:var(--text-4);max-width:72ch}
  .lb-meth code{font-family:var(--mono);color:var(--text-3)}

  @media(max-width:640px){
    .lb-head{padding-top:40px}
    .hb-col{grid-template-rows:18px 104px auto;gap:4px}
    .hb{gap:4px}
  }
  @media (prefers-reduced-motion: reduce){
    .hb-bar{animation:none}
  }
`;

// Fetch the generated dataset as a static asset at request time. Returns null on
// any failure so the page can fall back to the "being generated" state.
async function loadData(request: { url: string }) {
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

// Ten-bucket distribution over the scored sites' scores. Bucket i spans
// [i*10, i*10+9]; the final bucket also absorbs 100.
function distribution(sites: any[]) {
  const counts = new Array(BUCKETS).fill(0);
  for (const s of sites) {
    const i = Math.min(BUCKETS - 1, Math.floor(Math.max(0, Math.min(100, s.score)) / 10));
    counts[i] += 1;
  }
  return counts;
}

function Histogram({ sites, scored }: { sites: any[]; scored: number }) {
  const counts = distribution(sites);
  const max = Math.max(1, ...counts);
  return (
    <figure class="hb-fig">
      <ol
        class="hb"
        aria-label={`Slop-score distribution across ${scored} scanned pages, ten bands from clean to heavy`}
      >
        {counts.map((n, i) => {
          const lo = i * 10;
          const hi = i === BUCKETS - 1 ? 100 : lo + 9;
          const h = n === 0 ? 2 : Math.max(6, Math.round((n / max) * BAR_MAX));
          const band = tierFor(lo);
          return (
            <li
              class="hb-col"
              data-bucket={String(i)}
              data-lo={String(lo)}
              data-hi={String(hi)}
              title={`Click to filter scores ${lo}–${hi}`}
              aria-label={`Scores ${lo} to ${hi}: ${n} ${n === 1 ? 'page' : 'pages'}`}
            >
              <span class="hb-n" aria-hidden="true">
                {n || ''}
              </span>
              <span
                class="hb-bar"
                style={`--h:${h}px;background:${n === 0 ? 'var(--neutral)' : tierFill(band)}`}
                aria-hidden="true"
              />
              <span class="hb-x" aria-hidden="true">
                {lo}
              </span>
            </li>
          );
        })}
      </ol>
      <div class="hb-axis" aria-hidden="true">
        <span>clean</span>
        <span>heavy</span>
      </div>
      <figcaption class="hb-cap" id="hbCaption">
        Slop scores across {scored} scanned pages, in ten bands. Lower is cleaner: Clean is
        0&ndash;9, Mild 10&ndash;27, Heavy 28+. Click any band to filter the boards below.
      </figcaption>
    </figure>
  );
}

// One corpus or directory row — third-party grades and tiers are withheld unless
// the domain is an email-verified directory listing (FIX-04).
function Row({
  s,
  rank,
  origin,
  verified,
}: {
  s: any;
  rank: number;
  origin: string;
  verified?: any;
}) {
  if (verified) {
    return (
      <LeaderboardRow
        rank={rank}
        domain={s.domain}
        score={verified.score ?? s.score}
        grade={verified.grade ?? s.grade}
        tier={verified.tier ?? s.tier}
        href={`${origin}/score/${s.domain}`}
      />
    );
  }
  return (
    <li class="lr">
      <span class="lr-rank">·</span>
      <span class="lr-name">
        <a class="lr-dom" href={`${origin}/score/${s.domain}`}>
          {s.domain}
        </a>
      </span>
      <span class="lr-score">opt-in required</span>
    </li>
  );
}

// Per-pattern prevalence computed from leaderboard.json (FIX-04).
function PatternPrevalence({ sites, scored, data }: { sites: any[]; scored: number; data: any }) {
  const denom = Math.max(1, scored || sites.length);
  const totalFlagged = sites.reduce((acc, s) => acc + (Number(s.patternsFlagged) || 0), 0);
  const avgFlagged = Math.round((totalFlagged / denom) * 10) / 10;

  const bands = [
    { label: '0 patterns triggered', count: 0 },
    { label: '1–2 patterns triggered', count: 0 },
    { label: '3–4 patterns triggered', count: 0 },
    { label: '5+ patterns triggered', count: 0 },
  ];
  const byPatternId: Record<string, number> = {};
  if (data?.patternPrevalence && typeof data.patternPrevalence === 'object') {
    for (const [id, n] of Object.entries<any>(data.patternPrevalence)) {
      byPatternId[id] = Number(n) || 0;
    }
  }
  for (const s of sites) {
    const f = Number(s.patternsFlagged) || 0;
    if (f <= 0) bands[0].count += 1;
    else if (f <= 2) bands[1].count += 1;
    else if (f <= 4) bands[2].count += 1;
    else bands[3].count += 1;

    if (Array.isArray(s.patterns)) {
      for (const p of s.patterns) {
        if (p && p.id && p.triggered) byPatternId[p.id] = (byPatternId[p.id] || 0) + 1;
      }
    } else if (Array.isArray(s.flaggedPatterns)) {
      for (const id of s.flaggedPatterns) {
        if (id) byPatternId[String(id)] = (byPatternId[String(id)] || 0) + 1;
      }
    }
  }
  const perPatternRows = Object.entries(byPatternId).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <p class="lb-sec-sub">
        Mean patterns triggered per page: <strong>{avgFlagged}</strong> of {PATTERNS.length} rules (
        <a href={CALIBRATION_URL}>uncalibrated beta</a>).
      </p>
      <table class="lb-tbl">
        <caption>Per-pattern trigger density across {scored} corpus pages.</caption>
        <thead>
          <tr>
            <th scope="col">pattern band</th>
            <th scope="col" class="lb-num">
              pages
            </th>
            <th scope="col" class="lb-num">
              prevalence
            </th>
          </tr>
        </thead>
        <tbody>
          {bands.map((b) => (
            <tr>
              <td>{b.label}</td>
              <td class="lb-num">{b.count}</td>
              <td class="lb-num">{Math.round((b.count / denom) * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      {perPatternRows.length > 0 ? (
        <table class="lb-tbl">
          <caption>Per-pattern prevalence by rule ID across {scored} corpus pages.</caption>
          <thead>
            <tr>
              <th scope="col">pattern id</th>
              <th scope="col" class="lb-num">
                pages
              </th>
              <th scope="col" class="lb-num">
                prevalence
              </th>
            </tr>
          </thead>
          <tbody>
            {perPatternRows.map(([id, count]) => (
              <tr>
                <td>{id}</td>
                <td class="lb-num">{count}</td>
                <td class="lb-num">{Math.round((count / denom) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

// Per-category boards with aggregate statistics; third-party grades withheld unless verified.
function CategoryBoards({
  sites,
  origin,
  verifiedMap,
}: {
  sites: any[];
  origin: string;
  verifiedMap: Map<string, any>;
}) {
  const groups: Record<string, any[]> = {};
  for (const s of sites) (groups[s.category || 'other'] ||= []).push(s);
  const keys = [
    ...CATEGORY_ORDER.filter((k) => groups[k]),
    ...Object.keys(groups).filter((k) => !CATEGORY_ORDER.includes(k)),
  ];
  return (
    <>
      <div class="lb-controls" role="region" aria-label="Filter leaderboard rows">
        <input
          id="lbSearch"
          class="lb-search"
          type="search"
          placeholder="Filter domains (e.g. stripe, linear)…"
          aria-label="Filter domains"
        />
        <a class="lb-compare-link" href={`${origin}/compare`}>
          compare head-to-head →
        </a>
      </div>
      <div class="lb-boards stack-900" id="lbCategoryBoards">
        {keys.map((k) => {
          const rawRows = groups[k].slice();
          const catAvg =
            Math.round(
              (rawRows.reduce((sum, r) => sum + (Number(r.score) || 0), 0) /
                Math.max(1, rawRows.length)) *
                10
            ) / 10;
          const rows = rawRows.sort((a, b) =>
            String(a.domain || '').localeCompare(String(b.domain || ''))
          );
          return (
            <section aria-label={CATEGORY_NAMES[k] || k} data-cat-sec={k}>
              <h3 class="lb-board-h">
                {CATEGORY_NAMES[k] || k}{' '}
                <small>
                  · {rows.length} · avg {catAvg}/100 (uncalibrated beta)
                </small>
              </h3>
              <ol>
                {rows.map((s, i) => {
                  const v = verifiedMap.get(String(s.domain || '').toLowerCase());
                  return (
                    <div class="lb-filter-row" data-domain={String(s.domain || '').toLowerCase()}>
                      <Row s={s} rank={i + 1} origin={origin} verified={v} />
                    </div>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
    </>
  );
}

// By-builder rows; [] when there's no usable builder data. Tools, not teams —
// cleanest tool first.
function builderEntries(byBuilder: Record<string, any> | undefined) {
  return Object.entries<any>(byBuilder || {})
    .filter(([, v]) => v && v.avgScore != null)
    .sort((a, b) => a[1].avgScore - b[1].avgScore);
}

function BuilderTable({ entries }: { entries: [string, any][] }) {
  return (
    <table class="lb-tbl">
      <caption>Average slop score (uncalibrated beta) grouped by how the site was built.</caption>
      <thead>
        <tr>
          <th scope="col">built with</th>
          <th scope="col" class="lb-num">
            n
          </th>
          <th scope="col" class="lb-num">
            avg slop
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([name, v]) => (
          <tr>
            <td>{name}</td>
            <td class="lb-num">{v.count}</td>
            <td class="lb-num" style={`color:${tierText(tierFor(v.avgScore))}`}>
              {v.avgScore}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export async function onRequestGet({ request, env }: { request: { url: string }; env?: any }) {
  const origin = new URL(request.url).origin;
  const data = await loadData(request);
  const live = env?.RESULTS ? await getStats(env.RESULTS).catch(() => null) : null;
  const listedSites = env?.RESULTS ? await listAllSites(env.RESULTS).catch(() => []) : [];
  const verifiedMap = new Map<string, any>();
  for (const ls of listedSites || []) {
    if (ls && ls.domain && ls.listed !== false) {
      verifiedMap.set(String(ls.domain).toLowerCase(), ls);
    }
  }

  const generating = !data || !data.scored;
  const stats = data?.stats || {};
  const sites = (data?.sites || []).filter((s: any) => s.scored);
  const scored = data?.scored || sites.length;
  const def = data?.definitionsVersion || DEFINITIONS_VERSION;
  const when = data?.generatedAt ? new Date(data.generatedAt).toISOString().slice(0, 10) : '—';

  // The all-time live counter (every scan slop-detect has ever run, not just the
  // corpus) shows only once it reads as momentum rather than "0".
  const showLive = !!(live && live.count >= 50);
  const builders = generating ? [] : builderEntries(data.byBuilder);
  const hasData = !generating && sites.length > 0;

  const doc = (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>The State of Design Slop · slop-detect</title>
        <meta
          name="description"
          content="A reproducible scan of well-known landing pages against the design-slop fingerprint: aggregate default-template pattern prevalence across the web."
        />
        <link rel="canonical" href={`${ORIGIN}/leaderboard`} />
        <meta property="og:title" content="The State of Design Slop" />
        <meta
          property="og:description"
          content="Default-template pattern prevalence across a reproducible scan of well-known landing pages."
        />
        <meta property="og:url" content={`${ORIGIN}/leaderboard`} />
        <meta property="og:image" content={`${ORIGIN}/og.png`} />
        <meta name="twitter:card" content="summary_large_image" />
        {raw(BRAND_FONTS_HEAD)}
        <style>{raw(BRAND_CSS + UI_CSS + PAGE_CSS)}</style>
      </head>
      <body>
        <Nav origin={origin} current="/leaderboard" />

        <header class="lb-head">
          <div class="lb-wrap">
            <p class="lb-eyebrow">/leaderboard · the state of slop · uncalibrated beta</p>
            <h1 class="lb-h1">The state of design slop</h1>
            {generating ? (
              <p class="lb-pos">
                The latest scan is being generated; check back shortly. Meanwhile,{' '}
                <a href={`${origin}/`}>scan your own site</a>.
              </p>
            ) : (
              <p class="lb-pos">
                We scanned <strong>{scored}</strong> well-known landing pages across AI builders,
                SaaS, big tech, and a few deliberately plain classics, against the {def} fingerprint
                the CLI runs (<a href={CALIBRATION_URL}>uncalibrated beta</a>).{' '}
                <strong>{stats.slopShare}%</strong> carry detectable default-template tells (score
                10 or higher).
              </p>
            )}
            <p class="lb-disc">
              A slop score is a signal, not a verdict. This measures how generic a page reads, never
              the team behind it. Third-party grades and tiers are withheld unless the domain owner
              opts in via email-verified directory listing (
              <a href={`${origin}/directory`}>/directory</a>).
            </p>
          </div>
        </header>

        {hasData ? (
          <StatsStrip
            segments={[
              [{ n: scored.toLocaleString('en-US') }, ' pages scanned'],
              [
                'avg slop ',
                { n: stats.avgScore, color: tierText(tierFor(stats.avgScore)) },
                ' (uncalibrated beta)',
              ],
              [{ n: stats.cleanCount, color: 'var(--clean-text)' }, ' Clean'],
              [{ n: stats.mildCount, color: 'var(--mild-text)' }, ' Mild'],
              [{ n: stats.heavyCount, color: 'var(--heavy-text)' }, ' Heavy'],
            ]}
          />
        ) : null}

        <main class="lb-wrap">
          {showLive ? (
            <p class="lb-live">
              Across every page slop-detect has scored:{' '}
              <strong>{live.count.toLocaleString('en-US')}</strong> scans, average{' '}
              <strong>{live.avgScore}</strong>/100 (uncalibrated beta), {live.slopShare}% carry
              slop.
            </p>
          ) : null}

          {hasData ? (
            <>
              <section class="lb-sec" aria-labelledby="lb-dist">
                <h2 class="lb-sec-h" id="lb-dist">
                  Slop distribution
                </h2>
                <p class="lb-sec-sub">
                  Where the corpus falls on the 0&ndash;100 scale. Most pages cluster where
                  default-template styles land.
                </p>
                <Histogram sites={sites} scored={scored} />
              </section>

              <section class="lb-sec" aria-labelledby="lb-prev">
                <h2 class="lb-sec-h" id="lb-prev">
                  Per-pattern prevalence <span class="lb-dir-pill">Aggregate statistics</span>
                </h2>
                <PatternPrevalence sites={sites} scored={scored} data={data} />
              </section>

              <section class="lb-sec" aria-labelledby="lb-cat">
                <h2 class="lb-sec-h" id="lb-cat">
                  By category <span class="lb-dir-pill">Aggregate stats · opt-in grades only</span>
                </h2>
                <p class="lb-sec-sub">
                  Category averages and corpus domains. Individual third-party grades are shown only
                  for email-verified directory listings.
                </p>
                <CategoryBoards sites={sites} origin={origin} verifiedMap={verifiedMap} />
              </section>

              {builders.length > 0 ? (
                <section class="lb-sec" aria-labelledby="lb-builder">
                  <h2 class="lb-sec-h" id="lb-builder">
                    By builder
                  </h2>
                  <p class="lb-sec-sub">
                    Average slop score grouped by how the site was built. Tools, not teams.
                  </p>
                  <BuilderTable entries={builders} />
                </section>
              ) : null}
            </>
          ) : null}

          <section class="lb-cta">
            <Cta
              heading="Don't see your site?"
              body="Scan any URL against the same fingerprint. It is free and runs in a headless browser."
            />
            <div class="lb-cta-form">
              <ScanInput
                variant="leaderboard"
                action={`${origin}/score`}
                id="scan-leaderboard"
                label="Scan"
              />
            </div>
            <p class="lb-cta-note">
              Already clean? <a href={`${origin}/#monitor`}>Keep it that way with monitoring</a>.
            </p>
          </section>

          <p class="lb-meth">
            Methodology: each URL scanned once in a headless browser against the {PATTERNS.length}
            -pattern, weighted, deterministic design-slop fingerprint (definitions {def},{' '}
            <a href={CALIBRATION_URL}>uncalibrated beta</a>), {String(when)}. Reproduce any row:{' '}
            <code>npx slop-detect &lt;url&gt;</code>. A slop score is a fingerprint, not a verdict:
            it measures how generic the result reads, nothing about the team behind it.
          </p>
        </main>

        <Footer origin={origin} meta={`definitions ${def} · MIT`} />
        <script>
          {raw(`(function(){
  var search=document.getElementById('lbSearch');
  var rows=Array.prototype.slice.call(document.querySelectorAll('.lb-filter-row'));
  var tierBtns=Array.prototype.slice.call(document.querySelectorAll('[data-tier-filter]'));
  var hbCols=Array.prototype.slice.call(document.querySelectorAll('.hb-col[data-bucket]'));
  if(!rows.length)return;
  var activeTier='all';
  var activeBand=null;
  function apply(){
    var q=(search&&search.value?search.value:'').trim().toLowerCase();
    rows.forEach(function(r){
      var dom=r.getAttribute('data-domain')||'';
      var tier=r.getAttribute('data-tier')||'';
      var sc=parseFloat(r.getAttribute('data-score')||'0');
      var okDom=!q||dom.indexOf(q)!==-1;
      var okTier=activeTier==='all'||tier===activeTier;
      var okBand=!activeBand||(sc>=activeBand.lo&&sc<=activeBand.hi);
      r.hidden=!(okDom&&okTier&&okBand);
    });
  }
  if(search)search.addEventListener('input',apply);
  tierBtns.forEach(function(b){
    b.addEventListener('click',function(){
      activeTier=b.getAttribute('data-tier-filter')||'all';
      tierBtns.forEach(function(x){x.classList.toggle('active',x===b);});
      apply();
    });
  });
  hbCols.forEach(function(c){
    c.addEventListener('click',function(){
      var lo=parseFloat(c.getAttribute('data-lo')||'0');
      var hi=parseFloat(c.getAttribute('data-hi')||'100');
      if(activeBand&&activeBand.lo===lo){
        activeBand=null;
        hbCols.forEach(function(x){x.classList.remove('active');});
      }else{
        activeBand={lo:lo,hi:hi};
        hbCols.forEach(function(x){x.classList.toggle('active',x===c);});
      }
      apply();
    });
  });
})();`)}
        </script>
      </body>
    </html>
  );

  const html =
    '<!doctype html><!-- impeccable-disable low-contrast -- tierText() tokens pinned by ui.test.js -->' +
    doc.toString();

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=600',
    },
  });
}
