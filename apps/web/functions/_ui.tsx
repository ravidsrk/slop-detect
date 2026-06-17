/** @jsxRuntime automatic @jsxImportSource hono/jsx */
// Shared component library for the server-rendered pages.
//
// The export duplicates the same nav, footer, lockup, scan input, chips, rows,
// badges, and the monitor card inline on every screen. This centralizes the
// cross-screen set (parity-spec Part B2 / C3) so Landing, Result, Leaderboard,
// Directory, Report, Docs, and Brand render ONE shell. Pages embed `UI_CSS`
// alongside `BRAND_CSS` (from _brand.ts) and compose these components; they must
// not edit this file (foundation acceptance gate). Tier/avatar colors come from
// the centralized resolvers in _theme.ts — color is the product, one source.
//
// Dogfood by construction (design "Why this design passes its own detector"):
// no AI-default faces, no purple CTA (primary is ink->green; purple is only ever
// a letter-avatar data swatch), no gradient or background-clip text, flat 1px
// surfaces, the 1.5px ink ledger is the only ruled device, eyebrows are plain
// mono strings (never a pill), and the copy register stays dry (copy axis 0).
// Every surface built from these parts must itself score Clean.

import { raw } from 'hono/html';
import { tierFill, tierText, badgeColors, avatarColor } from './_theme.js';

const GITHUB = 'https://github.com/ravidsrk/slop-detect';

// ── the scan reticle (mark.svg / mark-dark.svg, inlined so the lockup is
// self-contained and renders without a second request). Light: ink brackets +
// Clean-green dot; dark: paper brackets + the brighter on-dark green dot. ───────
function reticle(size: number, dark: boolean) {
  const stroke = dark ? '#F4F5F2' : '#181815';
  const dot = dark ? '#3FBE7A' : '#1FA85E';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">` +
    `<path d="M3 8 V3.5 H7.5" stroke="${stroke}" stroke-width="1.6" stroke-linecap="square"/>` +
    `<path d="M16.5 3.5 H21 V8" stroke="${stroke}" stroke-width="1.6" stroke-linecap="square"/>` +
    `<path d="M21 16 V20.5 H16.5" stroke="${stroke}" stroke-width="1.6" stroke-linecap="square"/>` +
    `<path d="M7.5 20.5 H3 V16" stroke="${stroke}" stroke-width="1.6" stroke-linecap="square"/>` +
    `<circle cx="12" cy="12" r="2.4" fill="${dot}"/></svg>`
  );
}

// Self-contained monitor form script (design "Monitor / continuity card"). Posts
// to /api/watch with ADDITIVE opt-ins only: a flag is SENT only when its box is
// checked, so an unchecked box means "leave it as-is" (the watch API preserves
// omitted flags) rather than an explicit `false` that would delist / disable on a
// resubmit (Bugbot #12 — turning a feature off is the unsubscribe path, not this
// form). Defines its own `$`/`esc` so it doesn't depend on page globals.
const MONITOR_SCRIPT = `(function(){
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const f = $('watchForm');
  if (!f) return;
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('watchGo'), msg = $('watchMsg');
    const domain = $('watchDomain').value.trim();
    const email = $('watchEmail').value.trim();
    if (!domain || !email) return;
    btn.disabled = true; btn.textContent = 'Setting up…';
    msg.className = 'mon-msg show'; msg.textContent = 'Registering monitor…';
    try {
      const r = await fetch('/api/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain, email,
          ...($('watchSystem').checked ? { system: true } : {}),
          ...($('watchList').checked ? { list: true } : {})
        })
      });
      const data = await r.json();
      if (!r.ok || data.error) throw new Error(data.message || data.error || ('HTTP ' + r.status));
      const dom = data.domain || domain;
      const bits = ['<b>' + esc(dom) + '</b> is registered.'];
      if (data.verificationSent) bits.push('Check your inbox to confirm and switch alerts on.');
      bits.push('<a href="/report/' + encodeURIComponent(dom) + '">client report</a> · <a href="/dashboard">all your domains</a>');
      msg.className = 'mon-msg show ok';
      msg.innerHTML = bits.join(' ');
    } catch (err) {
      msg.className = 'mon-msg show err';
      msg.textContent = '✗ ' + err.message;
    } finally {
      btn.disabled = false; btn.textContent = 'Monitor';
    }
  });
})();`;

// ── component styles ───────────────────────────────────────────────────────────
// Light-first; references the BRAND_CSS tokens so there is one source of truth.
// Literal hexes appear only where a token does not exist (the translucent nav
// fill, the live-badge segments, and the code-block syntax accents).
export const UI_CSS = `
  .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

  /* logo lockup — lowercase, hyphenated, monospace; "it's a command you type" */
  .logo{display:inline-flex;align-items:center;gap:8px;white-space:nowrap}
  .logo-mark{display:inline-flex;line-height:0}
  .logo-word{font-family:var(--mono);font-weight:700;font-size:var(--fs-wordmark);letter-spacing:-0.01em;color:var(--text);white-space:nowrap}
  .logo-word-dark{color:var(--d-text)}

  /* navigation bar — sticky, translucent paper, 1px hairline under it */
  .nav{position:sticky;top:0;z-index:50;background:rgba(244,245,242,0.92);border-bottom:1px solid var(--border)}
  .nav-inner{max-width:1080px;margin:0 auto;padding:13px var(--pad-x);display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
  .nav-links{display:flex;align-items:center;gap:18px;flex-wrap:wrap}
  .nav-link{font-family:var(--mono);font-size:13px;color:var(--text-3)}
  .nav-link:hover{color:var(--text)}
  .nav-link-active{color:var(--text)}
  .nav-gh{font-family:var(--mono);font-size:13px;color:var(--text);border:1px solid var(--border-btn);padding:6px 12px;border-radius:2px}
  .nav-gh:hover{border-color:var(--text)}

  /* footer — the dark band */
  .ft{background:var(--ink-deep);color:var(--d-text-3);padding:44px var(--pad-x)}
  .ft-inner{max-width:1080px;margin:0 auto;display:flex;justify-content:space-between;align-items:flex-start;gap:20px;flex-wrap:wrap}
  .ft-id{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .ft-word{font-family:var(--mono);font-weight:700;font-size:var(--fs-wordmark);letter-spacing:-0.01em;color:var(--d-text)}
  .ft-meta{font-family:var(--mono);font-size:12px;color:var(--text-4)}
  .ft-links{display:flex;gap:16px;flex-wrap:wrap;font-family:var(--mono);font-size:12px}
  .ft-links a{color:var(--d-text-3)}
  .ft-links a:hover{color:var(--d-text)}
  .ft-note{max-width:1080px;margin:16px auto 0;display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap}
  .ft-fp{font-family:var(--serif);font-style:italic;font-size:15px;color:var(--d-text-3)}
  .ft-repro{font-family:var(--mono);font-size:12px;color:var(--text-4)}

  /* scan input — the primary action; one bordered row, no slop styling */
  .scan{display:flex;align-items:stretch;overflow:hidden;background:var(--panel);border:1px solid var(--text);border-radius:4px}
  .scan-prefix{display:inline-flex;align-items:center;font-family:var(--mono);font-size:15px;color:var(--mild-text);padding-left:14px}
  .scan-input{flex:1;min-width:0;border:0;background:transparent;font-family:var(--mono);font-size:15px;color:var(--text);padding:13px 12px}
  .scan-input::placeholder{color:var(--text-5)}
  .scan-go{border:0;cursor:pointer;background:var(--text);color:var(--d-text);font-family:var(--mono);font-size:14px;padding:0 22px;white-space:nowrap;transition:var(--t)}
  .scan-go:hover{background:var(--clean-text)}
  .scan-rescan{border-color:var(--border-btn);border-radius:3px}
  .scan-rescan .scan-prefix,.scan-rescan .scan-input{font-size:13px}
  .scan-rescan .scan-input{padding:8px 10px}
  .scan-rescan .scan-go{font-size:13px;padding:0 16px}
  .scan-leaderboard .scan-prefix,.scan-leaderboard .scan-input,.scan-leaderboard .scan-go{font-size:14px}
  .scan-monitor{background:var(--ink-deeper);border-color:var(--d-border-2)}
  .scan-monitor .scan-input{color:var(--d-text)}
  .scan-monitor .scan-prefix{color:var(--mild)}
  .scan-monitor .scan-go{background:var(--clean);color:#0A2A18;font-weight:700}
  .scan-monitor .scan-go:hover{background:var(--clean-dark)}

  /* buttons */
  .btn{display:inline-flex;align-items:center;justify-content:center;font-family:var(--mono);font-weight:500;line-height:1;border:1px solid transparent;border-radius:3px;cursor:pointer;text-align:center;transition:var(--t)}
  .btn-primary{background:var(--text);color:var(--d-text);font-size:14px;padding:14px 24px}
  .btn-primary:hover{background:var(--clean-text)}
  .btn-outline{background:transparent;color:var(--text);border-color:var(--border-btn);font-size:14px;padding:13px 24px}
  .btn-outline:hover{border-color:var(--text)}
  .btn-monitor{background:var(--clean);color:#0A2A18;font-weight:700;font-size:13px;padding:12px 22px}
  .btn-monitor:hover{background:var(--clean-dark)}
  .btn-full{width:100%}

  /* sample chip */
  .chip{display:inline-flex;align-items:center;gap:7px;white-space:nowrap;font-family:var(--mono);font-size:12.5px;color:var(--text-2);border:1px solid var(--border-chip);border-radius:var(--r-pill);padding:5px 13px}
  .chip:hover{border-color:var(--text)}
  .chip-dot{width:7px;height:7px;border-radius:var(--r-round);flex:none}

  /* stats strip */
  .stats{border-top:1px solid var(--border);border-bottom:1px solid var(--border);background:var(--bg-2);padding:18px var(--pad-x);display:flex;justify-content:center;align-items:baseline;flex-wrap:wrap;gap:10px;font-family:var(--mono);font-size:13px;color:var(--text-3)}
  .stats-num{font-weight:500;color:var(--text)}
  .stats-mid{color:var(--border-btn)}

  /* letter-avatar chip */
  .av{display:inline-flex;align-items:center;justify-content:center;flex:none;color:var(--panel);font-family:var(--mono);font-weight:700;border-radius:5px}

  /* leaderboard row */
  .lr{display:grid;grid-template-columns:16px 1fr auto;align-items:center;gap:12px;padding:9px 4px;border-bottom:1px solid var(--row)}
  .lr:hover{background:var(--bg-2)}
  .lr-rank{font-family:var(--mono);font-size:12px;color:var(--text-6);text-align:right}
  .lr-name{display:flex;align-items:center;gap:9px;min-width:0}
  .lr-dom{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text)}
  .lr-score{font-family:var(--mono);font-size:13px;color:var(--text-3);white-space:nowrap}
  .lr-grade{font-weight:700}

  /* score-tier badge pill (compact readout) */
  .stb{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:6px;background:var(--panel);padding:5px 11px;font-family:var(--mono);font-size:13px}
  .stb-dot{width:8px;height:8px;border-radius:var(--r-round);flex:none}
  .stb-tier{font-weight:700;letter-spacing:0.02em}
  .stb-meta{color:var(--text-3)}

  /* live badge — the only element with a shadow */
  .live-badge{display:inline-flex;font-family:var(--mono);font-weight:700;font-size:12px;border-radius:4px;overflow:hidden;box-shadow:var(--shadow-badge)}
  .lb-l{background:#16170F;color:#F4F5F2;padding:3px 8px}
  .lb-r{padding:3px 8px}

  /* monitor / continuity card — dark panel */
  .mon{background:var(--ink-deep);color:var(--d-text-2);border-radius:10px;padding:40px 36px;text-align:center}
  .mon-inner{max-width:560px;margin:0 auto}
  .mon-eyebrow{font-family:var(--mono);font-size:13px;color:var(--clean-dark);margin-bottom:12px}
  .mon-h{font-family:var(--serif);font-weight:500;font-size:var(--fs-h2-static);line-height:1.05;letter-spacing:-0.02em;color:var(--d-text)}
  .mon-body{color:var(--d-text-3);margin:12px 0 22px}
  .mon-form{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
  .mon-form input{flex:1;min-width:200px;background:var(--ink-deeper);border:1px solid var(--d-border-2);border-radius:4px;color:var(--d-text);font-family:var(--mono);font-size:14px;padding:12px 14px}
  .mon-form input::placeholder{color:var(--d-text-4)}
  .mon-opts{display:flex;gap:18px;flex-wrap:wrap;justify-content:center;margin-top:14px;font-family:var(--mono);font-size:12.5px;color:var(--d-text-3)}
  .mon-opt{display:inline-flex;align-items:center;gap:7px;cursor:pointer}
  .mon-msg{margin-top:14px;font-family:var(--mono);font-size:13px;min-height:1.2em}
  .mon-msg.ok{color:var(--clean-dark)}
  .mon-msg.err{color:var(--heavy)}
  .mon-msg a{color:var(--d-text);text-decoration:underline}
  .mon-fine{margin-top:16px;font-family:var(--mono);font-size:11.5px;color:var(--d-text-4)}
  .mon-fine a{color:var(--d-text-3);text-decoration:underline}

  /* code block — dark, with the named syntax accents */
  .cb{background:#16170F;border-radius:6px;padding:18px 20px;overflow:auto}
  .cb code{font-family:var(--mono);font-size:12.5px;line-height:1.85;color:#C9CABF;white-space:pre;word-break:break-all}
  .cb-wrap code{white-space:pre-wrap}
  .t-cmt{color:#6E6F63}
  .t-cmt2{color:#7E7F72}
  .t-cmd{color:#3FBE7A}
  .t-str{color:#E5B05A}
  .t-key{color:#7FB5E6}
  .t-kw{color:#C77DBB}

  /* section ledger — the 1.5px ink rule + plain mono eyebrow (no pill) */
  .ledger-tag{font-family:var(--mono);font-size:12px;font-weight:500;color:var(--clean-text);margin-right:10px}

  /* cta */
  .cta{text-align:center}
  .cta-h{font-family:var(--serif);font-weight:500;font-size:var(--fs-h2-a);line-height:1.02;letter-spacing:-0.02em;color:var(--text)}
  .cta-body{margin:12px auto 22px;max-width:60ch}
  .cta-row{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
  .cta-manifesto{font-family:var(--serif);font-style:italic;font-size:var(--fs-quote-lg);line-height:1.3;color:var(--text-3);margin-top:28px}

  @media(max-width:640px){
    .nav-inner{padding-left:20px;padding-right:20px}
    .ft,.stats{padding-left:20px;padding-right:20px}
    .mon{padding:32px 22px}
  }
`;

// ── components ───────────────────────────────────────────────────────────────

// Logo lockup: reticle mark + the `slop-detect` wordmark. Light or dark variant.
export function LogoLockup({ href = '/', dark = false, size = 22, label = 'slop-detect home' }) {
  return (
    <a class="logo" href={href} aria-label={label}>
      <span class="logo-mark">{raw(reticle(size, dark))}</span>
      <span class={dark ? 'logo-word logo-word-dark' : 'logo-word'}>slop-detect</span>
    </a>
  );
}

// Navigation bar. `current` is the active path (e.g. '/leaderboard'); its link is
// inked with no hover and marked aria-current. `rescan` opts the compact
// scan-another-domain input in (the Result nav). `origin` prefixes the hrefs.
export function Nav({ origin = '', current = '', rescan = false }) {
  const links = [
    { href: '/leaderboard', label: 'leaderboard' },
    { href: '/docs', label: 'docs' },
    { href: '/brand', label: 'brand' },
  ];
  return (
    <nav class="nav" aria-label="Primary">
      <div class="nav-inner">
        <LogoLockup href={`${origin}/`} />
        {rescan ? <ScanInput variant="rescan" id="nav-rescan" label="Scan" /> : null}
        <div class="nav-links">
          {links.map((l) => {
            const active = current === l.href;
            return (
              <a
                class={active ? 'nav-link nav-link-active' : 'nav-link'}
                href={`${origin}${l.href}`}
                aria-current={active ? 'page' : undefined}
              >
                {l.label}
              </a>
            );
          })}
          <a class="nav-gh" href={GITHUB} target="_blank" rel="noopener noreferrer">
            github ↗
          </a>
        </div>
      </div>
    </nav>
  );
}

// Footer: the dark band. Keeps the two framing lines (MNR-27): the fingerprint
// disclaimer and the reproduce-it-yourself command.
export function Footer({ origin = '', domain = '<domain>', meta = '© 2026 · MIT' }) {
  const links = [
    { href: '/leaderboard', label: 'leaderboard' },
    { href: '/docs', label: 'docs' },
    { href: '/directory', label: 'directory' },
    { href: '/privacy.md', label: 'privacy' },
  ];
  return (
    <footer class="ft">
      <div class="ft-inner">
        <div class="ft-id">
          <span class="logo-mark">{raw(reticle(20, true))}</span>
          <span class="ft-word">slop-detect</span>
          <span class="ft-meta">{meta}</span>
        </div>
        <div class="ft-links">
          {links.map((l) => (
            <a href={`${origin}${l.href}`}>{l.label}</a>
          ))}
          <a href={GITHUB} target="_blank" rel="noopener noreferrer">
            github ↗
          </a>
        </div>
      </div>
      <div class="ft-note">
        <span class="ft-fp">A fingerprint, not a verdict.</span>
        <span class="ft-repro">Reproduce: npx slop-detect {domain}</span>
      </div>
    </footer>
  );
}

// Scan input. Variants: 'hero' (default), 'rescan' (compact result-nav), and
// 'leaderboard' (CTA) ride the light row; 'monitor' inverts for a dark card.
// A bordered row: non-interactive https:// prefix, a labelled text input, an
// attached submit button. Defaults GET to /score so it works without JS.
export function ScanInput({
  variant = 'hero',
  action = '/score',
  method = 'get',
  name = 'domain',
  value = '',
  placeholder = 'yourdomain.com',
  label = 'Scan',
  id,
}) {
  const inputId = id || `scan-${variant}`;
  return (
    <form
      class={`scan scan-${variant}`}
      action={action}
      method={method}
      role="search"
      aria-label="Scan a domain for AI-design slop"
    >
      <span class="scan-prefix" aria-hidden="true">
        https://
      </span>
      <label class="sr-only" for={inputId}>
        Domain to scan
      </label>
      <input
        id={inputId}
        class="scan-input"
        name={name}
        type="text"
        value={value}
        placeholder={placeholder}
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        inputmode="url"
        required
      />
      <button class="scan-go" type="submit">
        {label}
      </button>
    </form>
  );
}

// Button. `primary` (ink->green), `outline`, or `monitor` (green CTA on dark).
// Renders an <a> when `href` is given, else a <button>.
export function Button({
  variant = 'primary',
  href,
  label,
  type = 'button',
  id,
  full = false,
  target,
  rel,
  children,
}: {
  variant?: string;
  href?: string;
  label?: any;
  type?: string;
  id?: string;
  full?: boolean;
  target?: string;
  rel?: string;
  children?: any;
}) {
  const cls = `btn btn-${variant}${full ? ' btn-full' : ''}`;
  const content = children ?? label;
  const relAttr = rel || (target === '_blank' ? 'noopener noreferrer' : undefined);
  if (href) {
    return (
      <a class={cls} href={href} target={target} rel={relAttr}>
        {content}
      </a>
    );
  }
  return (
    <button class={cls} type={type} id={id}>
      {content}
    </button>
  );
}

// Sample chip: a pill with a tier dot + a `domain · grade` label, linking to a
// Result. Pass an explicit `label` to override the composed one.
export function SampleChip({ href = '#', domain, grade, tier = 'Clean', label }) {
  return (
    <a class="chip" href={href}>
      <span class="chip-dot" style={`background:${tierFill(tier)}`} aria-hidden="true" />
      <span>{label || `${domain} · ${grade}`}</span>
    </a>
  );
}

// Stats strip: a centered mono band of real, singular stats (never an invented
// 4-up banner). `segments` is an array of clauses; a clause is a string or an
// array of tokens, where a token is a string (plain) or `{ n, color }` (a
// colored numeral). Clauses are separated by a middot.
export function StatsStrip({ segments = [] }: { segments?: any[] }) {
  const clauses = segments.map((s) => (Array.isArray(s) ? s : [s]));
  return (
    <div class="stats">
      {clauses.map((tokens, i) => (
        <>
          {i > 0 ? (
            <span class="stats-mid" aria-hidden="true">
              ·
            </span>
          ) : null}
          <span>
            {tokens.map((t) =>
              typeof t === 'object' && t !== null ? (
                <b class="stats-num" style={t.color ? `color:${t.color}` : undefined}>
                  {t.n}
                </b>
              ) : (
                t
              )
            )}
          </span>
        </>
      ))}
    </div>
  );
}

// Letter-avatar chip: a rounded square whose background is chosen deterministically
// from the six-color chip palette by name hash (avatarColor). Decorative — the
// name is always rendered as text alongside it.
export function LetterAvatar({ name = '', size = 20 }) {
  const initial = String(name).trim().charAt(0).toUpperCase() || '·';
  return (
    <span
      class="av"
      style={`background:${avatarColor(name)};width:${size}px;height:${size}px;font-size:${Math.round(size * 0.5)}px`}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}

// Leaderboard row: a `16px 1fr auto` grid link — rank, name (avatar + truncated
// domain), score then grade in its tier text color.
export function LeaderboardRow({ rank, domain, score, grade, tier = 'Clean', href = '#' }) {
  return (
    <a class="lr" href={href}>
      <span class="lr-rank">{rank}</span>
      <span class="lr-name">
        <LetterAvatar name={domain} size={20} />
        <span class="lr-dom">{domain}</span>
      </span>
      <span class="lr-score">
        {score}{' '}
        <span class="lr-grade" style={`color:${tierText(tier)}`}>
          {grade}
        </span>
      </span>
    </a>
  );
}

// Score-tier badge pill (compact readout): a bordered chip with a tier dot,
// the uppercase TIER in its text color, and `score grade`.
export function ScoreTierBadge({ tier = 'Clean', score, grade }) {
  return (
    <span class="stb">
      <span class="stb-dot" style={`background:${tierFill(tier)}`} aria-hidden="true" />
      <span class="stb-tier" style={`color:${tierText(tier)}`}>
        {String(tier).toUpperCase()}
      </span>
      <span class="stb-meta">
        {score} {grade}
      </span>
    </span>
  );
}

// Live badge (the inline-flex HTML pill): dark "slop" segment + a tier-colored
// `grade · score` segment. The SVG twin lives in _badge.tsx. Colors from _theme.
export function LiveBadge({ tier = 'Clean', grade, score }) {
  const c = badgeColors(tier);
  return (
    <span class="live-badge" role="img" aria-label={`slop-detect: ${grade} · ${score}`}>
      <span class="lb-l">slop</span>
      <span class="lb-r" style={`background:${c.bg};color:${c.ink}`}>
        {grade} · {score}
      </span>
    </span>
  );
}

// Monitor / continuity card: the dark CTA panel. Posts to /api/watch with
// additive opt-ins (see MONITOR_SCRIPT). Keeps the honest fine print.
export function MonitorCard({ domain }) {
  const target = domain || 'your domain';
  return (
    <section class="mon" id="monitor" aria-labelledby="mon-h">
      <div class="mon-inner">
        <p class="mon-eyebrow">monitoring</p>
        <h2 id="mon-h" class="mon-h">
          Keep {target} on-system between redesigns.
        </h2>
        <p class="mon-body">
          A daily re-scan, and a regression or design-drift email the moment a redesign slips back
          into slop. Scanning stays free; this remembers a domain over time.
        </p>
        <form class="mon-form" id="watchForm" novalidate>
          <label class="sr-only" for="watchDomain">
            Domain to monitor
          </label>
          <input
            id="watchDomain"
            type="text"
            value={domain || ''}
            placeholder="your-site.com"
            autocomplete="off"
            spellcheck="false"
            required
          />
          <label class="sr-only" for="watchEmail">
            Email for alerts
          </label>
          <input
            id="watchEmail"
            type="email"
            placeholder="you@company.com"
            autocomplete="email"
            required
          />
          <button id="watchGo" class="btn btn-monitor" type="submit">
            Monitor
          </button>
        </form>
        <div class="mon-opts">
          <label class="mon-opt" for="watchSystem">
            <input type="checkbox" id="watchSystem" checked />
            also watch DESIGN.md drift
          </label>
          <label class="mon-opt" for="watchList">
            <input type="checkbox" id="watchList" />
            list in the public directory
          </label>
        </div>
        <p class="mon-msg" id="watchMsg" role="status" aria-live="polite" />
        <p class="mon-fine">
          double opt-in · $29–$149/mo · engine stays MIT & free forever ·{' '}
          <a href="/privacy.md">privacy</a>
        </p>
      </div>
      <script>{raw(MONITOR_SCRIPT)}</script>
    </section>
  );
}

// Code block: dark surface, JetBrains Mono. Pass `html` for pre-tokenized markup
// using the .t-cmt/.t-cmd/.t-str/.t-key/.t-kw accent spans, or `code` for a plain
// (escaped) snippet. `wrap` switches from horizontal scroll to wrapping.
export function CodeBlock({ html, code = '', label, wrap = false }) {
  return (
    <pre class={wrap ? 'cb cb-wrap' : 'cb'} aria-label={label}>
      <code>{html ? raw(html) : code}</code>
    </pre>
  );
}

// Section ledger: the signature 1.5px ink rule above a plain mono eyebrow + label
// (structural hierarchy, never a decorative pill). The rule lives in BRAND_CSS.
export function SectionLedger({ tag, label }) {
  return (
    <div class="section-ledger">
      {tag ? <span class="ledger-tag">{tag}</span> : null}
      <span class="ledger-label">{label}</span>
    </div>
  );
}

// CTA section: a fluid serif heading, a body line, a primary + outline button
// row, and (on Landing) the manifesto blockquote. `primary`/`secondary` are
// `{ href, label }`.
export function Cta({ heading, body, primary, secondary, manifesto }) {
  return (
    <section class="cta">
      <h2 class="cta-h">{heading}</h2>
      {body ? <p class="cta-body lead">{body}</p> : null}
      {primary || secondary ? (
        <div class="cta-row">
          {primary ? <Button variant="primary" href={primary.href} label={primary.label} /> : null}
          {secondary ? (
            <Button variant="outline" href={secondary.href} label={secondary.label} />
          ) : null}
        </div>
      ) : null}
      {manifesto ? <blockquote class="cta-manifesto">{manifesto}</blockquote> : null}
    </section>
  );
}
