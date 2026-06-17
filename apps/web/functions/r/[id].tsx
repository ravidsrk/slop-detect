/** @jsxRuntime automatic @jsxImportSource hono/jsx */
// GET /r/:id — the shareable scan permalink (one frozen scan snapshot).
//
// A link people paste into Slack/X: it unfurls with the /og/:id.png card (MNR-8)
// and, for humans who click through, renders the full Result in the shared design
// language by COMPOSING _result.tsx — the same components the /score hub and the
// /report deliverable use, so the three surfaces are one Result, not three skins.
//
// Two redesign/gap-fill moves over the old page:
//  - The old card sat on a radial-gradient tinted by tier. That is exactly the kind
//    of background the engine flags, so the share surface failed its own detector.
//    The composed components use flat 1px panels (BRAND/UI/RESULT_CSS), no gradient.
//  - The permalink carried no rel=canonical, so a domain's many /r/:id snapshots
//    diluted SEO against its single /score hub. We now canonicalize each permalink
//    to /score/:domain. The live embed badge + its markdown also point at the hub
//    (the badge is "live · re-scans periodically"; a frozen /r is the wrong target),
//    while the human Share/Copy-link actions share this permalink with its snapshot
//    card. Reuses getResult unchanged; missing/expired id → friendly 90-day 404.

import { raw } from 'hono/html';
import { getResult } from '../_shared.js';
import { BRAND_FONTS_HEAD, BRAND_CSS } from '../_brand.js';
import { Nav, Footer, SectionLedger, UI_CSS } from '../_ui.js';
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
  FixesPanel,
  ShareEmbed,
} from '../_result.js';

const ORIGIN = 'https://slop-detect.com';
const CSS = BRAND_CSS + UI_CSS + RESULT_CSS;

// Shared document shell — same nav/footer chrome as the score hub. `head` is the
// per-state <head>; `script` is the optional inline progressive-enhancement JS.
function Doc({
  head,
  origin = '',
  domain = '',
  rescan = false,
  children,
  script = null,
}: {
  head?: any;
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

function htmlResponse(node: any, { status = 200, cache = 'public, max-age=300' } = {}) {
  return new Response('<!doctype html>' + node.toString(), {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': cache },
  });
}

export async function onRequestGet({ params, env, request }) {
  const origin = new URL(request.url).origin;
  const id = String(params.id || '')
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 16);
  const slim = id ? await getResult(env.RESULTS, id) : null;

  // ── missing / expired permalink (MNR-7: 90-day retention, friendly state) ─────
  // A bad id or a snapshot past its 90-day TTL. No canonical here — we have no
  // domain to point at — and noindex so dead permalinks never enter the index.
  if (!slim) {
    const node = (
      <Doc
        head={
          <>
            <title>Result expired or not found · slop-detect</title>
            <meta name="robots" content="noindex" />
          </>
        }
        origin={origin}
        rescan
      >
        <div class="result">
          <div class="result-section re">
            <SectionLedger tag="" label="shared result" />
            <h1 class="re-h" style="margin-top:14px">
              Result expired or not found
            </h1>
            <p class="re-body">
              Shared scan results are kept for 90 days. This one has expired, or the link is wrong.
              Run a fresh scan to get a new permalink and share card.
            </p>
            <div class="re-row">
              <a class="btn btn-primary" href={`${origin}/`}>
                Run a new scan →
              </a>
              <a class="btn btn-outline" href={`${origin}/leaderboard`}>
                See the leaderboard →
              </a>
            </div>
          </div>
        </div>
      </Doc>
    );
    return htmlResponse(node, { status: 404, cache: 'public, max-age=300' });
  }

  // ── resolved snapshot ─────────────────────────────────────────────────────────
  const view = buildResultView(slim);
  const domain = slim.domain;
  const pageUrl = `${origin}/r/${slim.id}`; // this permalink — the human share artifact
  const hubUrl = `${ORIGIN}/score/${domain}`; // canonical hub — SEO + the live badge target
  const ogImg = `${origin}/og/${slim.id}.png`;
  const title = `${domain} scored ${slim.grade} (${slim.score}/100) on the AI-slop detector`;
  const desc =
    slim.verdict ||
    `${slim.patternsFlagged}/${slim.patternsTotal} AI-design-slop patterns triggered.`;

  // The displayed badge markdown (ShareEmbed builds the same string from hubUrl) and
  // the copy-button payload must match, so both consolidate backlinks on the hub.
  const badgeMd = `[![slop](${origin}/badge/${domain}.svg)](${hubUrl})`;
  const shareText = `${domain} scored ${slim.grade} (${slim.score}/100) on the AI-design-slop detector. ${slim.verdict || ''}`;
  const script = resultScript({
    shareText,
    shareUrl: pageUrl,
    fixPrompt: assembleFixPrompt(slim, view),
    badgeMd,
    domain,
  });

  const head = (
    <>
      <title>{title}</title>
      <meta name="description" content={desc} />
      {/* canonical → the per-domain hub, so snapshots don't dilute it (floor SEO gap) */}
      <link rel="canonical" href={hubUrl} />
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
    </>
  );

  const node = (
    <Doc head={head} origin={origin} domain={domain} rescan script={script}>
      <div class="result">
        <section class="result-section">
          <DomainHeader slim={slim} />
          <BigScore slim={slim} rank={null} origin={origin} />
          {/* the MNR-7 permalink CTAs BigScore doesn't carry (share-on-X is in the
              hero action column + the share card below) */}
          <div class="re-row" style="margin-top:26px">
            <a class="btn btn-primary" href={`${origin}/`}>
              Scan your own site →
            </a>
            <a class="btn btn-outline" href={`${origin}/score/${domain}`}>
              {domain} history →
            </a>
          </div>
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
          <AxisStrip slim={slim} />
        </section>

        <section class="result-section">
          <FixesPanel fixes={view.fixes} domain={domain} />
        </section>

        <section class="result-section">
          <ShareEmbed slim={slim} origin={origin} pageUrl={hubUrl} />
        </section>
      </div>
    </Doc>
  );

  return htmlResponse(node, { status: 200, cache: 'public, max-age=300' });
}
