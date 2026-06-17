/** @jsxRuntime automatic @jsxImportSource hono/jsx */
// GET /dashboard — the agency multi-domain view (Roadmap v2 P2b), re-skinned to
// the light editorial-instrument system (parity-spec build task 08, GAP-FILL).
//
// One email, many client domains: every watch owned by the signed-in address,
// with slop grade, design-system drift, status flags, and a per-domain client
// report link. Auth is the magic-link flow: /api/dashboard/link emails a
// single-use token; landing here with ?token= exchanges it for an HMAC-signed
// HttpOnly cookie (_session). No cookie → a login form. ?logout=1 → cookie
// cleared. No SESSION_SECRET → a 503 "not configured" page.
//
// Re-skin only: it reuses the shared foundation (Nav, Footer, SectionLedger,
// LetterAvatar from _ui; the tier resolver from _theme; the light tokens from
// _brand) — no net-new visual patterns. The login form rides the ScanInput
// `.scan` row + ink→green `.scan-go` button vocabulary; the domain list rides
// the LeaderboardRow vocabulary (avatar chip + mono + tier-colored grade). The
// data/auth seam (listWatchesByEmail, consumeDashboardToken, the _session
// helpers) is reused unchanged (MNR-17).
//
// Privacy: the page shows only the signed-in owner's own email and domains —
// never anyone else's. noindex, no-store.

import { raw } from 'hono/html';
import { listWatchesByEmail, consumeDashboardToken } from './_shared.js';
import { signSession, sessionEmail, sessionCookie, clearSessionCookie } from './_session.js';
import { BRAND_FONTS_HEAD, BRAND_CSS } from './_brand.js';
import { UI_CSS, Nav, Footer, SectionLedger, LetterAvatar } from './_ui.js';
import { tierText } from './_theme.js';

// Page-local layout only (the foundation gate forbids editing _ui/_theme/_brand,
// and this screen is design-silent GAP-FILL). Every value references a brand
// token; the login row and the domain rows reuse the shared `.scan`/avatar atoms.
const DASH_CSS = `
  .dash-wrap{max-width:960px;margin:0 auto;padding:56px var(--pad-x) 80px}
  .dash-head{margin-bottom:24px}
  .dash-h{font-family:var(--serif);font-weight:500;font-size:var(--fs-h2-c);line-height:1.05;letter-spacing:-0.02em;color:var(--text);margin-top:14px}
  .dash-sub{margin-top:12px;max-width:62ch}

  /* signed-in: the meta bar */
  .dash-bar{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px 18px;
    font-family:var(--mono);font-size:13px;color:var(--text-4);margin:18px 0 2px}
  .dash-bar b{color:var(--text);font-weight:500}
  .dash-bar .att{color:var(--heavy-text)}
  .dash-signout{color:var(--text-4);border-bottom:1px solid var(--border-btn);padding-bottom:1px}
  .dash-signout:hover{color:var(--text);border-color:var(--text)}

  /* login: the ScanInput row, email variant (no https:// prefix) */
  .scan-login{max-width:440px;margin-top:6px}
  .scan-login:focus-within{border-color:var(--clean-text)}
  .scan-login .scan-input{font-size:14px}
  .scan-login .scan-go{font-size:13px}
  .dash-msg{display:none;margin-top:14px;font-size:13px;color:var(--text-3);line-height:1.55;max-width:52ch}
  .dash-msg.show{display:block}
  .dash-msg.ok{color:var(--clean-text)}
  .dash-msg.err{color:var(--heavy-text)}
  .dash-note{display:block;margin-top:20px;font-family:var(--mono);font-size:12px;color:var(--text-4);line-height:1.7;max-width:58ch}
  .dash-note a{color:var(--text-3);border-bottom:1px solid var(--border-btn)}
  .dash-note a:hover{color:var(--text)}

  /* signed-in: the domain list — LeaderboardRow-like rows */
  .dlist{list-style:none;margin-top:8px;border-top:1px solid var(--row)}
  .drow{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 16px;padding:14px 2px;border-bottom:1px solid var(--row)}
  .drow:hover{background:var(--bg-2)}
  .drow-id{display:flex;align-items:center;gap:9px;min-width:0;flex:1 1 220px}
  .drow-dom{font-family:var(--mono);font-size:14px;font-weight:500;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .drow-id:hover .drow-dom{color:var(--clean-text)}
  .drow-metric{font-family:var(--mono);font-size:13px;color:var(--text-3);white-space:nowrap}
  .drow-grade{font-weight:700}
  .drow-sys{font-family:var(--mono);font-size:12px;white-space:nowrap}
  .drow-flags{display:flex;gap:9px;flex-wrap:wrap;font-family:var(--mono);font-size:11.5px;color:var(--text-4)}
  .drow-flags .bad{color:var(--heavy-text)}
  .drow-check{font-family:var(--mono);font-size:11.5px;color:var(--text-6);white-space:nowrap}
  .drow-rep{font-family:var(--mono);font-size:12px;color:var(--text-4);white-space:nowrap;margin-left:auto}
  .drow-rep:hover{color:var(--text)}
  .dash-empty{padding:26px 2px;color:var(--text-3);border-top:1px solid var(--row)}
  .dash-empty a{color:var(--text);border-bottom:1px solid var(--border-btn)}
  .dash-fine{margin-top:24px;font-family:var(--mono);font-size:11.5px;color:var(--text-4);line-height:1.7;max-width:66ch}

  @media (max-width:640px){
    .dash-wrap{padding-left:20px;padding-right:20px;padding-top:40px}
    .drow-check{display:none}
    .drow-rep{margin-left:0}
  }
`;

// Inline progressive-enhancement script for the login form. Kept as a raw string
// (its `=>` arrows and `+` concatenation must not be HTML-escaped). Posts the
// email to /api/dashboard/link, which is anti-enumeration: the response is
// identical whether or not the address owns any watches. Guarded for syntactic
// validity by inline-scripts.test.js (Cursor Bugbot, PR #26).
const LOGIN_SCRIPT = `
  const f=document.getElementById('loginForm'),b=document.getElementById('loginGo'),m=document.getElementById('loginMsg');
  f.addEventListener('submit',async(e)=>{e.preventDefault();
    b.disabled=true;b.textContent='Sending…';m.className='dash-msg mono show';m.textContent='Requesting link…';
    try{
      const r=await fetch('/api/dashboard/link',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:document.getElementById('loginEmail').value.trim()})});
      const d=await r.json();
      if(!r.ok)throw new Error(d.message||d.error||('HTTP '+r.status));
      m.className='dash-msg mono show ok';m.textContent=d.message;
    }catch(err){m.className='dash-msg mono show err';m.textContent='✗ '+err.message;}
    finally{b.disabled=false;b.textContent='Email me a link';}
  });
`;

// System (DESIGN.md) axis tier → a brand text hue. The watch stores a tier label
// (Aligned / Drifting / Off-system), not a numeric score, so this maps the label
// onto the existing verdict tokens rather than re-deriving a color.
function systemTierColor(tier) {
  if (tier === 'Aligned') return 'var(--clean-text)';
  if (tier === 'Drifting') return 'var(--mild-text)';
  if (tier === 'Off-system') return 'var(--heavy-text)';
  return 'var(--text-4)';
}

function Layout({ origin, title, children }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`${title} · slop-detect`}</title>
        <meta name="robots" content="noindex, nofollow" />
        {raw(BRAND_FONTS_HEAD)}
        <style>{raw(BRAND_CSS + UI_CSS + DASH_CSS)}</style>
      </head>
      <body>
        <Nav origin={origin} />
        {children}
        <Footer origin={origin} />
      </body>
    </html>
  );
}

function page(origin, title, inner, { status = 200, headers = {} } = {}) {
  const html =
    '<!doctype html>' +
    (
      <Layout origin={origin} title={title}>
        {inner}
      </Layout>
    ).toString();
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

function NotConfiguredView() {
  return (
    <main class="dash-wrap" id="main">
      <div class="dash-head">
        <SectionLedger label="dashboard" />
        <h1 class="dash-h">Dashboard not configured</h1>
      </div>
      <p class="dash-sub lead">
        Sign-in needs SESSION_SECRET and an email provider set in the environment (see
        PRODUCTION.md). Monitoring itself works without it.
      </p>
    </main>
  );
}

function LoginView({ origin, note }) {
  return (
    <main class="dash-wrap" id="main">
      <div class="dash-head">
        <SectionLedger label="dashboard" />
        <h1 class="dash-h">Sign in to your dashboard</h1>
      </div>
      <p class="dash-sub lead">
        One view across every domain you monitor: slop grade, design-system drift, and client
        reports. We email a single-use link, no password.
      </p>
      {note ? (
        <p class="dash-msg show err" style="max-width:440px">
          {note}
        </p>
      ) : null}
      {/* ScanInput `.scan` row, email variant: ink-bordered field + ink→green submit. */}
      <form class="scan scan-login" id="loginForm">
        <label class="sr-only" for="loginEmail">
          Email address
        </label>
        <input
          id="loginEmail"
          class="scan-input"
          type="email"
          placeholder="you@company.com"
          autocomplete="email"
          inputmode="email"
          spellcheck="false"
          required
        />
        <button class="scan-go" type="submit" id="loginGo">
          Email me a link
        </button>
      </form>
      <p class="dash-msg mono" id="loginMsg" role="status" aria-live="polite" />
      <p class="dash-note">
        Not monitoring anything yet? <a href={`${origin}/#monitor`}>Start with one domain</a>. It
        takes an email and a domain name.
      </p>
      <script>{raw(LOGIN_SCRIPT)}</script>
    </main>
  );
}

function Row({ w, origin }) {
  const checked = w.lastCheckedAt ? String(w.lastCheckedAt).slice(0, 10) : '—';
  const flags = [
    w.regressed ? <span class="bad">regressed</span> : null,
    w.systemRegressed ? <span class="bad">drifted</span> : null,
    !w.verified ? <span>unconfirmed</span> : null,
    w.listed ? <span>listed</span> : null,
  ].filter(Boolean);
  return (
    <li class="drow">
      <a class="drow-id" href={`${origin}/score/${encodeURIComponent(w.domain)}`}>
        <LetterAvatar name={w.domain} size={20} />
        <span class="drow-dom">{w.domain}</span>
      </a>
      {w.lastScore == null ? (
        <span class="drow-metric" style="color:var(--text-6)">
          no scan yet
        </span>
      ) : (
        <span class="drow-metric">
          <span class="drow-grade" style={`color:${tierText(w.lastTier)}`}>
            {w.lastGrade || '—'}
          </span>{' '}
          {w.lastScore}/100
        </span>
      )}
      <span class="drow-sys" style={`color:${systemTierColor(w.lastSystemTier)}`}>
        {w.lastSystemTier ? w.lastSystemTier : w.system ? 'awaiting sweep' : 'off'}
      </span>
      <span class="drow-flags">{flags.length ? flags : <span>ok</span>}</span>
      <span class="drow-check">{checked}</span>
      <a class="drow-rep" href={`${origin}/report/${encodeURIComponent(w.domain)}`}>
        report →
      </a>
    </li>
  );
}

function DashboardView({ origin, email, watches }) {
  const drifted = watches.filter((w) => w.regressed || w.systemRegressed).length;
  return (
    <main class="dash-wrap" id="main">
      <div class="dash-head">
        <SectionLedger label="dashboard" />
        <h1 class="dash-h">Your domains</h1>
      </div>
      <div class="dash-bar">
        <span>
          <b>{email}</b> · {watches.length} domain{watches.length === 1 ? '' : 's'}
          {drifted ? (
            <>
              {' · '}
              <span class="att">
                {drifted} need{drifted === 1 ? 's' : ''} attention
              </span>
            </>
          ) : null}
        </span>
        <a class="dash-signout" href={`${origin}/dashboard?logout=1`}>
          sign out
        </a>
      </div>
      {watches.length ? (
        <ul class="dlist" role="list">
          {watches.map((w) => (
            <Row w={w} origin={origin} />
          ))}
        </ul>
      ) : (
        <p class="dash-empty">
          No monitored domains on this address yet.{' '}
          <a href={`${origin}/#monitor`}>Add the first one</a>.
        </p>
      )}
      <p class="dash-fine">
        Daily sweeps re-scan each verified domain; drift and regression email you once per event.
        Print any client report from its page.
      </p>
    </main>
  );
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const origin = url.origin;

  // Configured-off: no session secret ⇒ the dashboard can't mint sessions. 503,
  // same safe-off contract as /api/dashboard/link (MNR-17, floor states).
  if (!env.SESSION_SECRET) {
    return page(origin, 'Dashboard', <NotConfiguredView />, { status: 503 });
  }

  // Sign out.
  if (url.searchParams.get('logout') === '1') {
    return page(origin, 'Signed out', <LoginView origin={origin} note="" />, {
      headers: { 'Set-Cookie': clearSessionCookie() },
    });
  }

  // Magic-link exchange: burn the token, mint the session, land clean (the
  // redirect strips the token from the URL/history).
  const token = url.searchParams.get('token');
  if (token) {
    const email = env.RESULTS ? await consumeDashboardToken(env.RESULTS, token) : null;
    if (!email) {
      return page(
        origin,
        'Link expired',
        <LoginView
          origin={origin}
          note="That sign-in link has expired or was already used. Request a fresh one."
        />
      );
    }
    const session = await signSession(email, env.SESSION_SECRET);
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${origin}/dashboard`,
        'Set-Cookie': sessionCookie(session),
        'Cache-Control': 'no-store',
      },
    });
  }

  // Cookie session.
  const email = await sessionEmail(request, env.SESSION_SECRET);
  if (!email) return page(origin, 'Sign in', <LoginView origin={origin} note="" />);

  // Strict ownership isolation: only the domains owned by this email.
  const watches = env.RESULTS ? await listWatchesByEmail(env.RESULTS, email) : [];
  watches.sort((a, b) => String(a.domain).localeCompare(String(b.domain)));
  return page(
    origin,
    'Dashboard',
    <DashboardView origin={origin} email={email} watches={watches} />
  );
}
