/** @jsxRuntime automatic @jsxImportSource hono/jsx */
// GET /brand — the identity system, and the dogfood proof page.
//
// slop-detect scores how generated a landing page looks. So the page that ships
// its identity has to score zero on that same scan. This route is built as the
// proof: every choice below (Newsreader + Libre Franklin + JetBrains Mono, ink
// going to green on the CTA, flat 1px surfaces, the 1.5px ink ledger as the only
// ruled device, the single flat shadow on the badge) is the rule it would flag the
// absence of. It must score 0/100, A+, Clean.
//
// It reuses the foundation only: tokens from _brand.ts, color resolvers from
// _theme.ts, and the shared components from _ui.tsx. No engine dependency — this
// is the identity reference and the "Empty is better than fake" manifesto. It
// links to /docs and the scan flow, and keeps the MNR-27 framing in the footer.

import { raw } from 'hono/html';
import {
  UI_CSS,
  Nav,
  Footer,
  LogoLockup,
  ScanInput,
  LiveBadge,
  ScoreTierBadge,
  CodeBlock,
  SectionLedger,
} from './_ui.js';
import { BRAND_FONTS_HEAD, BRAND_CSS } from './_brand.js';
import { chipPalette } from './_theme.js';

const ORIGIN = 'https://slop-detect.com';

// Brand-page layout only. Everything visual rides the shared tokens; literal
// values appear here only for layout (grids, the 1120px column) and the two
// tinted do/don't pairs that BRAND_CSS does not expose as variables.
const PAGE_CSS = `
  .brand{max-width:1120px;margin:0 auto;padding:0 var(--pad-x)}

  /* hero */
  .hero{padding:72px 0 20px}
  .hero h1{font-family:var(--serif);font-weight:500;font-size:var(--fs-display-1);line-height:0.98;letter-spacing:-0.02em;color:var(--text);max-width:17ch}
  .hero-score{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:22px}
  .hero-score .mono{font-family:var(--mono);font-size:13px;color:var(--text-4)}
  .hero-lead{margin-top:20px;max-width:62ch}

  /* a numbered ledger section */
  .sec{padding-top:56px}
  .sec-h{font-family:var(--serif);font-weight:500;font-size:var(--fs-h3);line-height:1.1;letter-spacing:-0.01em;color:var(--text);margin-top:14px}
  .sec-body{margin-top:10px;max-width:64ch}

  /* 01 the mark */
  .marks{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-top:24px}
  .mark-card{border:1px solid var(--border);border-radius:8px;padding:34px;display:flex;flex-direction:column;align-items:center;gap:18px}
  .mark-light{background:var(--panel)}
  .mark-dark{background:var(--ink-deep);border-color:var(--ink-deep)}
  .mark-cap{font-family:var(--mono);font-size:12px;color:var(--text-4)}
  .mark-dark .mark-cap{color:var(--d-text-3)}
  .notes{margin-top:20px;display:flex;flex-wrap:wrap;gap:10px 26px;font-family:var(--mono);font-size:12.5px;color:var(--text-3)}
  .notes span{white-space:nowrap}

  /* 02 the wordmark */
  .wm-specimen{margin-top:24px;border:1px solid var(--border);border-radius:8px;background:var(--panel);padding:36px 34px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
  .wm-mark{display:inline-flex;line-height:0}
  .wm-word{font-family:var(--mono);font-weight:700;font-size:clamp(30px,5vw,46px);letter-spacing:-0.01em;color:var(--text);white-space:nowrap}
  .wm-rules{margin-top:22px;display:grid;gap:8px;max-width:64ch}
  .wm-rule{display:grid;grid-template-columns:18px 1fr;gap:10px;align-items:baseline;font-size:15px;color:var(--text-2)}
  .wm-rule .y{font-family:var(--mono);color:var(--clean-text)}
  .wm-uses{margin-top:22px;display:flex;align-items:center;gap:18px;flex-wrap:wrap}
  .wm-use-dark{display:inline-flex;background:var(--ink-deep);border-radius:6px;padding:12px 16px}

  /* 03 color */
  .swatches{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-top:24px}
  .sw{background:var(--panel);border:1px solid var(--border);border-radius:8px;overflow:hidden}
  .sw-block{height:96px}
  .sw-meta{padding:13px 14px 15px}
  .sw-name{font-family:var(--mono);font-weight:700;font-size:13px;color:var(--text)}
  .sw-hex{font-family:var(--mono);font-size:12px;color:var(--text-4);margin-top:3px}
  .sw-role{font-size:13px;color:var(--text-3);margin-top:7px;line-height:1.4}

  /* the bounded data-avatar palette: the only place purple appears */
  .purple-note{margin-top:28px;border-top:1px solid var(--border-2);padding-top:20px}
  .dpal-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px}
  .dpal{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:12px;color:var(--text-4);border:1px solid var(--border);border-radius:6px;padding:6px 10px 6px 6px;background:var(--panel)}
  .dpal-chip{width:20px;height:20px;border-radius:5px;flex:none}

  /* 04 typography */
  .specimens{margin-top:24px;display:grid;gap:14px}
  .spec{display:grid;grid-template-columns:160px 1fr;gap:24px;align-items:baseline;border:1px solid var(--border);border-radius:8px;background:var(--panel);padding:26px 28px}
  .spec-meta{font-family:var(--mono);font-size:12px;color:var(--text-4);line-height:1.7}
  .spec-meta b{display:block;font-weight:700;color:var(--text)}
  .spec-serif{font-family:var(--serif);font-weight:500;font-size:34px;line-height:1.05;letter-spacing:-0.02em;color:var(--text)}
  .spec-sans{font-size:18px;line-height:1.55;color:var(--text-2)}
  .spec-mono{font-family:var(--mono);font-size:16px;color:var(--text);line-height:1.7}

  /* 05 voice */
  .voices{margin-top:24px;display:grid;gap:18px}
  .voice-s{border-left:3px solid var(--neutral);padding:2px 0 2px 18px}
  .voice-tier{font-family:var(--mono);font-size:12px;font-weight:700;letter-spacing:0.02em}
  .voice-q{font-family:var(--serif);font-style:italic;font-size:19px;line-height:1.4;color:var(--text);margin-top:7px}

  /* 06 the badge */
  .badges{margin-top:24px;display:flex;gap:16px;flex-wrap:wrap;align-items:center}
  .embed{margin-top:24px;max-width:760px}
  .embed-cap{font-family:var(--mono);font-size:12px;color:var(--text-4);margin-bottom:8px}

  /* 07 principles */
  .cards{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:24px}
  .card{border-radius:8px;padding:26px 28px}
  .card-do{background:#E9F4EE;border:1px solid #A9D8BD}
  .card-dont{background:#F7E9E5;border:1px solid #E0B6AE}
  .card-h{font-family:var(--mono);font-size:13px;font-weight:700;letter-spacing:0.04em}
  .card-do .card-h{color:#15824A}
  .card-dont .card-h{color:#B23A2A}
  .card ul{list-style:none;margin-top:14px;display:grid;gap:10px}
  .card li{display:grid;grid-template-columns:18px 1fr;gap:10px;align-items:baseline;font-size:15px;line-height:1.45}
  .card-do li{color:#1f3a2b}
  .card-dont li{color:#5a2b24}
  .card li .lead-glyph{font-family:var(--mono)}
  .card-do .lead-glyph{color:#15824A}
  .card-dont .lead-glyph{color:#B23A2A}

  /* closer */
  .close{padding:64px 0 80px;text-align:center}
  .close h2{font-family:var(--serif);font-weight:500;font-size:var(--fs-h2-a);line-height:1.02;letter-spacing:-0.02em;color:var(--text)}
  .close-body{margin:12px auto 22px;max-width:54ch}
  .close-scan{max-width:440px;margin:0 auto}
  .close-docs{margin-top:16px;font-family:var(--mono);font-size:13px}
  .close-docs a{color:var(--clean-text);border-bottom:1px solid var(--border-2);padding-bottom:1px}
  .close-docs a:hover{border-color:var(--clean-text)}
  .manifesto{font-family:var(--serif);font-style:italic;font-size:var(--fs-quote-lg);line-height:1.3;color:var(--text-3);margin-top:34px;max-width:30ch;margin-left:auto;margin-right:auto}

  @media(max-width:760px){
    .marks{grid-template-columns:1fr}
    .swatches{grid-template-columns:1fr 1fr}
    .spec{grid-template-columns:1fr;gap:10px}
    .cards{grid-template-columns:1fr}
    .brand{padding-left:20px;padding-right:20px}
  }
`;

// The five core brand colors, named on the Brand page. The hex is rendered as
// TEXT (not color-only) so the swatch reads without color perception.
const CORE_SWATCHES = [
  { name: 'paper', hex: '#F4F5F2', role: 'Page surface. Cool neutral, never cream.' },
  { name: 'ink', hex: '#181815', role: 'Text and the mark on light. Near-black.' },
  { name: 'clean', hex: '#1FA85E', role: 'Clean tier, the verdict dot, the accent.' },
  { name: 'mild', hex: '#D89A2E', role: 'Mild tier. The warning amber.' },
  { name: 'heavy', hex: '#C9402E', role: 'Heavy tier. The slop red.' },
];

// Three voice samples, one per tier. The voice is a senior designer reading the
// page back to you: dry, specific, a little funny. Copy axis stays 0 (no
// buzzwords, no antithesis cliché, no font/color brand names in prose).
const VOICE = [
  {
    tier: 'Clean',
    fill: '#1FA85E',
    text: '#15824A',
    quote:
      'Clean. Real type, honest spacing, a layout that knows what it is for. Nothing to fix here.',
  },
  {
    tier: 'Mild',
    fill: '#D89A2E',
    text: '#9A6B12',
    quote:
      'Mild. Mostly considered, but the gradient hero and the three icon cards are reflexes, not decisions.',
  },
  {
    tier: 'Heavy',
    fill: '#C9402E',
    text: '#B23A2A',
    quote:
      'Heavy. A default sans, a glowing call-to-action, an aurora blob, a centered headline. It reads like the tool that made it, not the company that shipped it.',
  },
];

const DO = [
  'Show the product. Screenshot the real thing.',
  'Use real type and let it set the rhythm.',
  'Let whitespace carry the hierarchy.',
  'State the score plainly, good or bad.',
  'Cite the source. Link the method.',
];

const DONT = [
  'Add a gradient so it feels expensive.',
  'Reach for the default font stack.',
  'Color the main button for the vibe.',
  'Decorate an empty section to fill it.',
  'Use a sparkle glyph to signal AI.',
];

// The markdown embed snippet, tokenized for the dark code block.
const EMBED_MD =
  '<span class="t-cmt">&lt;!-- paste into any README or page --&gt;</span>\n' +
  '[![slop-detect](<span class="t-str">https://slop-detect.com/badge/yourdomain.com</span>)]' +
  '(<span class="t-str">https://slop-detect.com/score/yourdomain.com</span>)';

function Swatch({ name, hex, role }) {
  return (
    <div class="sw">
      <div class="sw-block" style={`background:${hex}`} aria-hidden="true" />
      <div class="sw-meta">
        <div class="sw-name">{name}</div>
        <div class="sw-hex">{hex}</div>
        <div class="sw-role">{role}</div>
      </div>
    </div>
  );
}

function Specimen({ meta, family, weights, children, kind }) {
  return (
    <div class="spec">
      <div class="spec-meta">
        <b>{family}</b>
        {meta}
        <br />
        {weights}
      </div>
      <div class={`spec-${kind}`}>{children}</div>
    </div>
  );
}

export async function onRequestGet({ request }) {
  const origin = new URL(request.url).origin;

  const doc = (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Brand · slop-detect</title>
        <meta
          name="description"
          content="The slop-detect identity system: the scan-reticle mark, the wordmark, the five-color palette, the type, the voice, and the badge. The detector's own page, built to score Clean."
        />
        <link rel="canonical" href={`${ORIGIN}/brand`} />
        <meta property="og:title" content="slop-detect · brand" />
        <meta
          property="og:description"
          content="A detector that refuses to look like the thing it detects. The identity system, built to score 0/100."
        />
        <meta property="og:url" content={`${ORIGIN}/brand`} />
        <meta property="og:image" content={`${ORIGIN}/og.png`} />
        {raw(BRAND_FONTS_HEAD)}
        <style>{raw(BRAND_CSS + UI_CSS + PAGE_CSS)}</style>
      </head>
      <body>
        <Nav origin={origin} current="/brand" />

        <main class="brand">
          {/* hero */}
          <section class="hero" aria-labelledby="hero-h">
            <p class="mono-eyebrow">/brand · the identity system</p>
            <h1 id="hero-h">A detector that refuses to look like the thing it detects.</h1>
            <div class="hero-score">
              <ScoreTierBadge tier="Clean" score={0} grade="A+" />
              <span class="mono">this page scores 0/100 · A+ · Clean</span>
            </div>
            <p class="hero-lead lead">
              slop-detect scores how generated a landing page looks. So the identity that ships it
              has to score zero on its own scan. Below is that identity, and the reasons it passes.
            </p>
          </section>

          {/* 01 the mark */}
          <section class="sec" aria-labelledby="s01">
            <SectionLedger tag="01" label="the mark" />
            <h2 id="s01" class="sec-h">
              One drawn shape, one verdict dot.
            </h2>
            <p class="sec-body body">
              The mark is a scan reticle: four viewfinder brackets around a single green dot, the
              verdict. It is the only drawn shape in the system. Anything else that looks like an
              icon is a Unicode glyph, because an icon font would itself trip the detector.
            </p>
            <div class="marks">
              <div class="mark-card mark-light">
                <img
                  src="/landing/design/mark.svg"
                  width="64"
                  height="64"
                  alt="The slop-detect reticle mark on paper"
                />
                <span class="mark-cap">on paper · #F4F5F2</span>
              </div>
              <div class="mark-card mark-dark">
                <img
                  src="/landing/design/mark-dark.svg"
                  width="64"
                  height="64"
                  alt="The slop-detect reticle mark on ink"
                />
                <span class="mark-cap">on ink · #16170F</span>
              </div>
            </div>
            <div class="notes">
              <span>Keep the dot the verdict green.</span>
              <span>Never fill the brackets.</span>
              <span>No gradient, no glow.</span>
              <span>Minimum size 16px.</span>
            </div>
          </section>

          {/* 02 the wordmark */}
          <section class="sec" aria-labelledby="s02">
            <SectionLedger tag="02" label="the wordmark" />
            <h2 id="s02" class="sec-h">
              Lowercase, hyphenated, monospace.
            </h2>
            <p class="sec-body body">
              The wordmark is the mark plus the literal string set in JetBrains Mono, 700, tracking
              -0.01em. It is written the way you would type it into a terminal, because that is what
              it is: a command, not a brand name.
            </p>
            <div class="wm-specimen">
              <span class="wm-mark">
                <img src="/landing/design/mark.svg" width="46" height="46" alt="" />
              </span>
              <span class="wm-word">slop-detect</span>
            </div>
            <div class="wm-rules">
              <div class="wm-rule">
                <span class="y">do</span>
                <span>Always lowercase. Always hyphenated: slop-detect.</span>
              </div>
              <div class="wm-rule">
                <span class="y">do</span>
                <span>Always JetBrains Mono at 700. Never a serif, never a sans.</span>
              </div>
              <div class="wm-rule">
                <span class="y">do</span>
                <span>Render it as the mark plus live text, so it stays crisp and selectable.</span>
              </div>
            </div>
            <div class="wm-uses">
              <LogoLockup href={`${origin}/`} size={26} label="slop-detect wordmark on light" />
              <span class="wm-use-dark">
                <LogoLockup
                  href={`${origin}/`}
                  dark={true}
                  size={26}
                  label="slop-detect wordmark on dark"
                />
              </span>
            </div>
          </section>

          {/* 03 color */}
          <section class="sec" aria-labelledby="s03">
            <SectionLedger tag="03" label="color" />
            <h2 id="s03" class="sec-h">
              Five colors. No purple anywhere.
            </h2>
            <p class="sec-body body">
              Cool paper, near-black ink, and the three verdict hues. Green is clean, amber is mild,
              red is heavy. Color is never decoration here; it always encodes a score. Each swatch
              prints its hex, so the palette reads without relying on color alone.
            </p>
            <div class="swatches">
              {CORE_SWATCHES.map((s) => (
                <Swatch name={s.name} hex={s.hex} role={s.role} />
              ))}
            </div>
            <div class="purple-note">
              <p class="body" style="max-width:64ch">
                Purple appears exactly once in the whole system, as one of six letter-avatar
                backgrounds. It is data, never a button, accent, or brand color. A purple
                call-to-action is the loudest tell the detector knows, so it lives nowhere near one.
              </p>
              <div class="dpal-row" aria-label="The bounded six-color letter-avatar palette">
                {chipPalette.map((hex) => (
                  <span class="dpal">
                    <span class="dpal-chip" style={`background:${hex}`} aria-hidden="true" />
                    {hex}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* 04 typography */}
          <section class="sec" aria-labelledby="s04">
            <SectionLedger tag="04" label="typography" />
            <h2 id="s04" class="sec-h">
              Three faces, each with a job.
            </h2>
            <p class="sec-body body">
              Newsreader carries display and voice, and is never used for body. Libre Franklin
              carries all prose. JetBrains Mono carries anything that reads as data, a label, a
              score, or code. All three load from Google Fonts.
            </p>
            <div class="specimens">
              <Specimen
                family="Newsreader"
                meta=" · display & voice, serif"
                weights="500 · italic 400 / 500"
                kind="serif"
              >
                Does your landing page look generated?
              </Specimen>
              <Specimen
                family="Libre Franklin"
                meta=" · body & UI, grotesque"
                weights="400 · 500 · 600 · 700"
                kind="sans"
              >
                A score is a fingerprint, not a verdict. Everyone uses AI now; this measures how
                generic the result reads, nothing about the team behind it.
              </Specimen>
              <Specimen
                family="JetBrains Mono"
                meta=" · data, code & labels"
                weights="400 · 500 · 700"
                kind="mono"
              >
                0/100 · A+ · Clean · npx slop-detect yourdomain.com
              </Specimen>
            </div>
          </section>

          {/* 05 voice */}
          <section class="sec" aria-labelledby="s05">
            <SectionLedger tag="05" label="voice" />
            <h2 id="s05" class="sec-h">
              Critique the page, never the person.
            </h2>
            <p class="sec-body body">
              A score reads the page, not the team behind it. The voice is a senior designer reading
              the page back to you: dry, specific, and a little funny. Same register at every tier.
            </p>
            <div class="voices">
              {VOICE.map((v) => (
                <div class="voice-s" style={`border-left-color:${v.fill}`}>
                  <span class="voice-tier" style={`color:${v.text}`}>
                    {v.tier}
                  </span>
                  <p class="voice-q">{v.quote}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 06 the badge */}
          <section class="sec" aria-labelledby="s06">
            <SectionLedger tag="06" label="the badge" />
            <h2 id="s06" class="sec-h">
              A score you can embed.
            </h2>
            <p class="sec-body body">
              The badge is two segments: a dark slop label and the tier-colored grade and score. It
              is the one element in the system allowed a shadow, a flat 1px one, because it has to
              read on top of someone else's page.
            </p>
            <div class="badges">
              <LiveBadge tier="Clean" grade="A+" score={0} />
              <LiveBadge tier="Mild" grade="C" score={24} />
              <LiveBadge tier="Heavy" grade="D" score={41} />
            </div>
            <div class="embed">
              <p class="embed-cap">Markdown embed</p>
              <CodeBlock
                html={EMBED_MD}
                label="Markdown to embed the slop-detect badge"
                wrap={true}
              />
            </div>
          </section>

          {/* 07 principles */}
          <section class="sec" aria-labelledby="s07">
            <SectionLedger tag="07" label="principles" />
            <h2 id="s07" class="sec-h">
              What keeps this page clean.
            </h2>
            <p class="sec-body body">
              The same rules the detector checks for, stated as a habit. Empty is better than fake.
            </p>
            <div class="cards">
              <div class="card card-do">
                <div class="card-h">do</div>
                <ul>
                  {DO.map((d) => (
                    <li>
                      <span class="lead-glyph" aria-hidden="true">
                        →
                      </span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div class="card card-dont">
                <div class="card-h">don't</div>
                <ul>
                  {DONT.map((d) => (
                    <li>
                      <span class="lead-glyph" aria-hidden="true">
                        ✗
                      </span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* closer: the scan flow + the manifesto */}
          <section class="close" aria-labelledby="close-h">
            <h2 id="close-h">See if your page looks generated.</h2>
            <p class="close-body lead">One scan, about eight seconds, no signup.</p>
            <div class="close-scan">
              <ScanInput variant="hero" action="/score" id="brand-scan" />
            </div>
            <p class="close-docs">
              <a href={`${origin}/docs`}>How the score works ↗</a>
            </p>
            <blockquote class="manifesto">
              Empty is better than fake. Show the product, don't decorate around it.
            </blockquote>
          </section>
        </main>

        <Footer origin={origin} />
      </body>
    </html>
  );

  const html = '<!doctype html>' + doc.toString();

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=3600',
    },
  });
}
