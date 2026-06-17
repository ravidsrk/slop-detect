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
import { getStats } from './_data.js';
import { tierFor, tierFill, tierText } from './_theme.js';
import { BRAND_FONTS_HEAD, BRAND_CSS } from './_brand.js';
import { Nav, Footer, StatsStrip, LeaderboardRow, Cta, ScanInput, UI_CSS } from './_ui.js';

const ORIGIN = 'https://slop-detect.com';

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
  .lb-h1{font-family:var(--serif);font-weight:500;font-size:var(--fs-display-2);line-height:1.0;letter-spacing:-0.02em;color:var(--text);margin-bottom:18px}
  .lb-pos{font-size:var(--fs-lead);line-height:1.6;color:var(--text-2);max-width:66ch}
  .lb-pos strong{color:var(--text);font-weight:600}
  .lb-pos a{color:var(--text);border-bottom:1px solid var(--border-btn);padding-bottom:1px}
  .lb-pos a:hover{border-color:var(--text)}
  .lb-disc{margin-top:16px;font-size:14px;line-height:1.6;color:var(--text-4);max-width:66ch}
  .lb-live{font-family:var(--mono);font-size:13px;color:var(--text-4);margin:22px 0 4px}
  .lb-live strong{color:var(--text);font-weight:700}

  .lb-sec{padding:34px 0}
  .lb-sec-h{font-family:var(--serif);font-weight:500;font-size:var(--fs-h2-c);line-height:1.05;letter-spacing:-0.02em;color:var(--text)}
  .lb-sec-sub{margin-top:8px;font-size:14px;color:var(--text-4);max-width:62ch}

  /* distribution histogram */
  .hb-fig{margin:22px 0 0}
  .hb{display:grid;grid-template-columns:repeat(${BUCKETS},1fr);gap:7px;align-items:end}
  .hb-col{display:grid;grid-template-rows:18px ${BAR_MAX}px auto;align-items:end;justify-items:center;gap:6px}
  .hb-n{font-family:var(--mono);font-size:11px;color:var(--text-5);line-height:1}
  .hb-bar{width:100%;align-self:end;border-radius:3px 3px 0 0;min-height:2px;height:var(--h);animation:hb-grow .6s ease both}
  .hb-x{font-family:var(--mono);font-size:11px;color:var(--text-6);line-height:1}
  .hb-axis{display:flex;justify-content:space-between;margin-top:10px;font-family:var(--mono);font-size:11.5px;color:var(--text-5)}
  .hb-cap{margin-top:12px;font-size:13px;color:var(--text-4);max-width:62ch}
  @keyframes hb-grow{from{height:0}to{height:var(--h)}}

  /* the cleanest-overall + per-category 2-up boards */
  .lb-2col{display:grid;grid-template-columns:repeat(2,1fr);gap:6px 40px;margin-top:18px}
  .lb-boards{display:grid;grid-template-columns:repeat(2,1fr);gap:32px 40px;margin-top:20px}
  .lb-board-h{font-family:var(--mono);font-size:12px;font-weight:500;color:var(--text-3);letter-spacing:0;padding-bottom:8px;border-bottom:1px solid var(--border);margin-bottom:2px}
  .lb-board-h small{color:var(--text-5);font-weight:400}

  /* by-builder ledger table */
  .lb-tbl{border-collapse:collapse;width:100%;max-width:520px;margin-top:18px}
  .lb-tbl caption{text-align:left;font-family:var(--mono);font-size:11.5px;color:var(--text-5);padding-bottom:8px}
  .lb-tbl th,.lb-tbl td{text-align:left;padding:9px 14px 9px 0;font-size:14px;border-bottom:1px solid var(--row)}
  .lb-tbl th{font-family:var(--mono);font-size:11.5px;font-weight:500;color:var(--text-5)}
  .lb-tbl td:first-child{font-family:var(--mono);color:var(--text-2)}
  .lb-tbl td.lb-num,.lb-tbl th.lb-num{font-family:var(--mono);text-align:right;white-space:nowrap}

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
      <figcaption class="hb-cap">
        Slop scores across {scored} scanned pages, in ten bands. Lower is cleaner: Clean is
        0&ndash;9, Mild 10&ndash;27, Heavy 28+.
      </figcaption>
    </figure>
  );
}

// One ranked row — the domain links into its /score hub (history, re-scan, claim).
function Row({ s, rank, origin }: { s: any; rank: number; origin: string }) {
  return (
    <LeaderboardRow
      rank={rank}
      domain={s.domain}
      score={s.score}
      grade={s.grade}
      tier={s.tier}
      href={`${origin}/score/${s.domain}`}
    />
  );
}

// Cleanest overall: the top 10 across every category, a positive Hall of Clean.
function CleanestOverall({ sites, origin }: { sites: any[]; origin: string }) {
  const top = sites
    .slice()
    .sort((a, b) => a.score - b.score)
    .slice(0, 10);
  return (
    <ol class="lb-2col stack-900">
      {top.map((s, i) => (
        <Row s={s} rank={i + 1} origin={origin} />
      ))}
    </ol>
  );
}

// Per-category boards, cleanest-first within each, in a 2-up grid.
function CategoryBoards({ sites, origin }: { sites: any[]; origin: string }) {
  const groups: Record<string, any[]> = {};
  for (const s of sites) (groups[s.category || 'other'] ||= []).push(s);
  const keys = [
    ...CATEGORY_ORDER.filter((k) => groups[k]),
    ...Object.keys(groups).filter((k) => !CATEGORY_ORDER.includes(k)),
  ];
  return (
    <div class="lb-boards stack-900">
      {keys.map((k) => {
        const rows = groups[k].slice().sort((a, b) => a.score - b.score);
        return (
          <section aria-label={CATEGORY_NAMES[k] || k}>
            <h3 class="lb-board-h">
              {CATEGORY_NAMES[k] || k} <small>· {rows.length}</small>
            </h3>
            <ol>
              {rows.map((s, i) => (
                <Row s={s} rank={i + 1} origin={origin} />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
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
      <caption>Average slop score grouped by how the site was built.</caption>
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

  const generating = !data || !data.scored;
  const stats = data?.stats || {};
  const sites = (data?.sites || []).filter((s: any) => s.scored);
  const scored = data?.scored || sites.length;
  const def = data?.definitionsVersion || '2026.08';
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
        <title>The State of AI Design Slop · slop-detect</title>
        <meta
          name="description"
          content="A reproducible scan of well-known landing pages against the AI-design-slop fingerprint: how much of the web now looks AI-generated, and who's still clean."
        />
        <link rel="canonical" href={`${ORIGIN}/leaderboard`} />
        <meta property="og:title" content="The State of AI Design Slop" />
        <meta
          property="og:description"
          content="How much of the web now looks AI-generated: a reproducible scan of well-known landing pages."
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
            <p class="lb-eyebrow">/leaderboard · the state of slop</p>
            <h1 class="lb-h1">The state of AI design slop</h1>
            {generating ? (
              <p class="lb-pos">
                The latest scan is being generated; check back shortly. Meanwhile,{' '}
                <a href={`${origin}/`}>scan your own site</a>.
              </p>
            ) : (
              <p class="lb-pos">
                We scanned <strong>{scored}</strong> well-known landing pages across AI builders,
                SaaS, big tech, and a few deliberately plain classics, against the {def} fingerprint
                the CLI runs. <strong>{stats.slopShare}%</strong> carry detectable AI-design-slop
                tells (score 10 or higher); the cleanest pages below show it is a choice, not a
                default.
              </p>
            )}
            <p class="lb-disc">
              A slop score is a signal, not a verdict. Everyone uses AI now; this measures how
              generic a page reads, never the team behind it. The public directory is owner-gated: a
              site is listed only when its owner asks.
            </p>
          </div>
        </header>

        {hasData ? (
          <StatsStrip
            segments={[
              [{ n: scored.toLocaleString('en-US') }, ' pages scanned'],
              ['avg slop ', { n: stats.avgScore, color: tierText(tierFor(stats.avgScore)) }],
              [{ n: stats.cleanCount, color: '#15824A' }, ' Clean'],
              [{ n: stats.mildCount, color: '#9A6B12' }, ' Mild'],
              [{ n: stats.heavyCount, color: '#B23A2A' }, ' Heavy'],
            ]}
          />
        ) : null}

        <main class="lb-wrap">
          {showLive ? (
            <p class="lb-live">
              Across every page slop-detect has scored:{' '}
              <strong>{live.count.toLocaleString('en-US')}</strong> scans, average{' '}
              <strong>{live.avgScore}</strong>/100, {live.slopShare}% carry slop.
            </p>
          ) : null}

          {hasData ? (
            <>
              <section class="lb-sec" aria-labelledby="lb-dist">
                <h2 class="lb-sec-h" id="lb-dist">
                  Slop distribution
                </h2>
                <p class="lb-sec-sub">
                  Where the corpus falls on the 0&ndash;100 scale. Most pages cluster where AI
                  defaults land.
                </p>
                <Histogram sites={sites} scored={scored} />
              </section>

              <section class="lb-sec" aria-labelledby="lb-clean">
                <h2 class="lb-sec-h" id="lb-clean">
                  Cleanest overall
                </h2>
                <p class="lb-sec-sub">
                  The ten lowest scores in the corpus. Every name links to its score hub.
                </p>
                <CleanestOverall sites={sites} origin={origin} />
              </section>

              <section class="lb-sec" aria-labelledby="lb-cat">
                <h2 class="lb-sec-h" id="lb-cat">
                  By category
                </h2>
                <p class="lb-sec-sub">Cleanest first within each group.</p>
                <CategoryBoards sites={sites} origin={origin} />
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
            Methodology: each URL scanned once in a headless browser against the 27-pattern,
            weighted, deterministic AI-design-slop fingerprint (definitions {def}), {String(when)}.
            Reproduce any row: <code>npx slop-detect &lt;url&gt;</code>. A slop score is a
            fingerprint, not a verdict: everyone uses AI now, so it measures how generic the result
            reads, nothing about the team behind it.
          </p>
        </main>

        <Footer origin={origin} meta={`definitions ${def} · MIT`} />
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
