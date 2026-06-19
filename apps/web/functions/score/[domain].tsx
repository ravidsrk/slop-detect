/** @jsxRuntime automatic @jsxImportSource hono/jsx */
// GET /score/:domain — the canonical per-domain score hub (the spine).
//
// One public, crawlable Result per scanned domain: the latest grade, the axes that
// ran, the breakdown, the competitive analytics, the fixes, and the loop controls
// (re-scan, claim + monitor, share, embed). Every scan records a timeline point and
// bumps the global distribution (recordScan in _data.ts), so this page works for
// ANY scanned domain, not only monitored ones.
//
// The visible shell + composites come from the shared foundation: _brand.ts tokens,
// _ui.tsx shell (Nav / Footer / MonitorCard), and _result.tsx (the Result body,
// reused by /r and /report). This page only fetches the persisted record, derives
// the rank, and composes — it does not re-implement components or re-style tokens.
//
// Claim model (MNR-12): the dofollow backlink to the site is the incentive to CLAIM.
// It appears only once the owner verifies via the claim form (POST /api/watch
// { list:true }). Unclaimed domains show the claim form and no backlink, so we never
// hand SEO juice to an arbitrary URL. Anti-slop by construction (flat light system).

import { raw } from 'hono/html';
import {
  normalizeDomain,
  getLatestForDomain,
  getWatch,
  getHistory,
  getListing,
  publicWatch,
  getScoreDistribution,
  getCategoryCleanAverages,
  percentileFromDistribution,
  jsonForScript,
} from '../_shared.js';
import { BRAND_FONTS_HEAD, BRAND_CSS } from '../_brand.js';
import { Nav, Footer, MonitorCard, SectionLedger, UI_CSS } from '../_ui.js';
import {
  RESULT_CSS,
  buildResultView,
  assembleFixPrompt,
  resultScript,
  DomainHeader,
  BigScore,
  CategoryBars,
  Breakdown,
  AxisStrip,
  SystemAeoCards,
  Analytics,
  FixesPanel,
  ShareEmbed,
  ClaimPanel,
  ResultLoading,
  ResultError,
} from '../_result.js';

const ORIGIN = 'https://slop-detect.com';
const CSS = BRAND_CSS + UI_CSS + RESULT_CSS;

const CATEGORY_NAMES: Record<string, string> = {
  'ai-builder': 'AI builders',
  saas: 'SaaS & dev tools',
  bigtech: 'Big tech',
  classic: 'Classic, deliberately plain',
};

async function loadLeaderboard(request: { url: string }) {
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

function buildNeighbors(lbData: any, domain: string) {
  const sites = lbData?.sites;
  if (!Array.isArray(sites)) return null;
  const me = sites.find((s: any) => s.domain === domain && s.scored);
  if (!me) return null;
  const siblings = sites.filter((s: any) => s.category === me.category && s.scored);
  if (siblings.length < 2) return null;
  const sorted = siblings.slice().sort((a: any, b: any) => a.score - b.score);
  const myIdx = sorted.findIndex((s: any) => s.domain === domain);
  const myRank = myIdx + 1;
  const WINDOW = 6;
  // Always include the current domain. Top 6 when it ranks there; otherwise the
  // five cleanest peers plus you at your true category rank.
  const window =
    myRank <= WINDOW ? sorted.slice(0, WINDOW) : [...sorted.slice(0, WINDOW - 1), sorted[myIdx]];
  const categoryLabel = CATEGORY_NAMES[me.category] || me.category;
  return {
    categoryLabel,
    rows: window.map((s: any) => ({
      rank: sorted.findIndex((x: any) => x.domain === s.domain) + 1,
      name: s.title || s.domain,
      domain: s.domain,
      score: s.score,
      grade: s.grade,
      tier: s.tier,
      you: s.domain === domain,
    })),
  };
}

// Shared document shell. `head` is the per-state <head> content; `script` is the
// optional inline progressive-enhancement JS.
function Doc({
  head,
  noindex = false,
  origin = '',
  domain = '',
  rescan = false,
  children,
  script = null,
}: {
  head?: any;
  noindex?: boolean;
  origin?: string;
  domain?: string;
  rescan?: boolean;
  children?: any;
  script?: any;
}) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        {head}
        {noindex ? <meta name="robots" content="noindex" /> : null}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        {raw(BRAND_FONTS_HEAD)}
        <style>{raw(CSS)}</style>
      </head>
      <body>
        <Nav origin={origin} current="" rescan={rescan} />
        <main>{children}</main>
        <Footer origin={origin} domain={domain} meta="a fingerprint, not a verdict · MIT" />
        <div class="flash" id="flash" role="status" aria-live="polite" />
        {script ? <script>{raw(script)}</script> : null}
      </body>
    </html>
  );
}

function htmlResponse(node: any, { status = 200, cache = 'public, max-age=120' } = {}) {
  return new Response('<!doctype html>' + node.toString(), {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': cache },
  });
}

export async function onRequestGet({ params, request, env }) {
  const origin = new URL(request.url).origin;
  const preview = new URL(request.url).searchParams.get('preview');
  const domain = normalizeDomain(String(params.domain || ''));

  if (!domain) {
    return new Response('Invalid domain', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // ── GAP-FILL preview states (design "Motion and interaction states") ─────────
  // /score is server-rendered from KV, so these never appear for resolved data;
  // they are reachable via ?preview= for QA / screenshot capture and are the same
  // components /r's design loading phase and the scan-failure path reuse.
  if (preview === 'loading') {
    const node = (
      <Doc
        head={<title>{`${domain} · scanning · slop-detect`}</title>}
        noindex
        origin={origin}
        domain={domain}
      >
        <ResultLoading domain={domain} />
      </Doc>
    );
    return htmlResponse(node, { status: 200, cache: 'no-store' });
  }
  if (preview === 'error') {
    const node = (
      <Doc
        head={<title>{`${domain} · score unavailable · slop-detect`}</title>}
        noindex
        origin={origin}
        domain={domain}
      >
        <ResultError domain={domain} origin={origin} />
      </Doc>
    );
    return htmlResponse(node, { status: 200, cache: 'no-store' });
  }

  // ── error / retry state (GAP-FILL): scoring store unavailable ────────────────
  // RESULTS binding missing is a misconfiguration, not "never scanned" — surface an
  // honest retry state rather than a misleading "no scan recorded" 404.
  if (!env.RESULTS) {
    const node = (
      <Doc
        head={<title>{`${domain} · score unavailable · slop-detect`}</title>}
        noindex
        origin={origin}
        domain={domain}
      >
        <ResultError
          domain={domain}
          origin={origin}
          message="Scoring is temporarily unavailable."
        />
      </Doc>
    );
    return htmlResponse(node, { status: 503, cache: 'no-store' });
  }

  const [latest, watch, history, listing, dist, catClean, lbData] = await Promise.all([
    getLatestForDomain(env.RESULTS, domain).catch(() => null),
    getWatch(env.RESULTS, domain).catch(() => null),
    getHistory(env.RESULTS, domain).catch(() => []),
    getListing(env.RESULTS, domain).catch(() => null),
    getScoreDistribution(env.RESULTS).catch(() => null),
    getCategoryCleanAverages(env.RESULTS).catch(() => ({ averages: {}, count: 0 })),
    loadLeaderboard(request).catch(() => null),
  ]);
  const pub = watch ? publicWatch(watch, history) : null;
  const claimed = !!listing;

  // ── empty state: never-scanned domain (404 + scan CTA) ───────────────────────
  if (!latest) {
    const node = (
      <Doc
        head={
          <>
            <title>{`${domain} · slop score · slop-detect`}</title>
            <meta
              name="description"
              content={`No slop scan recorded for ${domain} yet. Scan it to score how AI-generated its landing page looks.`}
            />
            <link rel="canonical" href={`${ORIGIN}/score/${domain}`} />
          </>
        }
        origin={origin}
        domain={domain}
      >
        <div class="result">
          <div class="result-section re">
            <SectionLedger tag="" label="domain record" />
            <h1 class="re-h" style="margin-top:14px">
              {domain}
            </h1>
            <p class="re-body">No scan recorded for this domain yet.</p>
            <div class="re-row">
              <a class="btn btn-primary" href={`${origin}/?url=${encodeURIComponent(domain)}`}>
                Scan {domain} →
              </a>
            </div>
          </div>
        </div>
      </Doc>
    );
    return htmlResponse(node, { status: 404, cache: 'public, max-age=60' });
  }

  // ── full result ──────────────────────────────────────────────────────────────
  const view = buildResultView(latest);
  const neighbors = buildNeighbors(lbData, domain);
  let catAvg: number[] | null = null;
  if (catClean.count >= 5) {
    const mapped = view.categories.map((c) => catClean.averages[c.key]);
    if (mapped.every((v) => typeof v === 'number' && Number.isFinite(v))) catAvg = mapped;
  }
  const pageUrl = `${ORIGIN}/score/${domain}`;
  const ogImg = `${origin}/og/${latest.id}.png`;
  const title = `${domain} scored ${latest.grade} (${latest.score}/100) on the AI-slop detector`;
  const desc =
    latest.verdict ||
    `${latest.patternsFlagged}/${latest.patternsTotal} AI-design-slop patterns triggered.`;

  // Peer rank, derived from the same distribution that backs the percentile. Shown
  // only once the corpus is large enough to be meaningful (>= 5 scans).
  const pct = dist
    ? percentileFromDistribution(dist, latest.score)
    : { count: 0, cleanerThanPct: null };
  let rank: { n: number; of: number; cleanerThanPct: number } | null = null;
  if (pct.count >= 5 && pct.cleanerThanPct != null) {
    const worse = Math.round((pct.count * pct.cleanerThanPct) / 100);
    rank = {
      n: Math.max(1, Math.min(pct.count, pct.count - worse)),
      of: pct.count,
      cleanerThanPct: pct.cleanerThanPct,
    };
  }

  const jsonLd = jsonForScript({
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
  const badgeMd = `[![slop](${origin}/badge/${domain}.svg)](${pageUrl})`;
  const script = resultScript({
    shareText,
    shareUrl: pageUrl,
    fixPrompt: assembleFixPrompt(latest, view),
    badgeMd,
    domain,
    claim: !claimed,
  });

  const head = (
    <>
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
      <script type="application/ld+json">{raw(jsonLd)}</script>
    </>
  );

  const node = (
    <Doc head={head} origin={origin} domain={domain} rescan script={script}>
      <div class="result">
        <section class="result-section">
          <DomainHeader slim={latest} monitored={!!pub?.monitoring} />
          <BigScore slim={latest} rank={rank} origin={origin} />
        </section>

        <section class="result-section">
          <div class="rs-ledger">
            <SectionLedger tag="" label="category overview" />
          </div>
          <CategoryBars categories={view.categories} />
        </section>

        <section class="result-section">
          <Breakdown
            categories={view.categories}
            flaggedTotal={view.flaggedTotal}
            patternsTotal={view.patternsTotal}
          />
        </section>

        <section class="result-section">
          <div class="rs-ledger">
            <SectionLedger tag="" label="the four axes" />
          </div>
          <AxisStrip slim={latest} />
        </section>

        <section class="result-section">
          <div class="rs-ledger">
            <SectionLedger tag="" label="system & aeo detail" />
          </div>
          <SystemAeoCards slim={latest} />
        </section>

        <section class="result-section">
          <div class="rs-ledger">
            <SectionLedger tag="" label="competitive analytics" />
          </div>
          <Analytics
            history={history}
            dist={dist}
            slim={latest}
            categories={view.categories}
            catAvg={catAvg}
            catAvgCount={catClean.count}
            neighbors={neighbors}
            origin={origin}
          />
        </section>

        <section class="result-section">
          <FixesPanel fixes={view.fixes} domain={domain} />
        </section>

        <section class="result-section">
          <ShareEmbed slim={latest} origin={origin} pageUrl={pageUrl} />
        </section>

        <section class="result-section">
          <ClaimPanel slim={latest} origin={origin} claimed={claimed} />
        </section>

        <section class="result-section">
          <MonitorCard domain={domain} />
        </section>
      </div>
    </Doc>
  );

  return htmlResponse(node, { status: 200, cache: 'public, max-age=120' });
}
