// GET /dashboard — the agency multi-domain view (Roadmap v2 P2b).
//
// One email, many client domains: every watch owned by the signed-in address,
// with slop grade, design-system tier, drift status, and a per-domain client
// report link. Auth is the magic-link flow: /api/dashboard/link emails a
// single-use token; landing here with ?token= exchanges it for an HMAC-signed
// HttpOnly cookie (_session.js). No cookie → a login form. ?logout=1 → cookie
// cleared. Configured-off without SESSION_SECRET.
//
// Privacy: the page shows only the signed-in owner's own email and domains —
// never anyone else's. noindex.

import { listWatchesByEmail, consumeDashboardToken, tierColors, escapeHtml } from './_shared.js';
import { signSession, sessionEmail, sessionCookie, clearSessionCookie } from './_session.js';
import { BRAND_FONTS_HEAD, BRAND_CSS } from './_brand.js';

function sysColors(tier) {
  if (tier === 'Aligned') return '#4ade80';
  if (tier === 'Drifting') return '#fbbf24';
  if (tier === 'Off-system') return '#f87171';
  return '#6f7689';
}

function page(origin, title, inner, extraHeaders = {}) {
  const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · slop-detect</title>
<meta name="robots" content="noindex">${BRAND_FONTS_HEAD}
<style>${BRAND_CSS}
  body{padding:48px 20px 80px}
  .wrap{max-width:860px;margin:0 auto}
  h1{font-size:28px;font-weight:700;letter-spacing:-0.02em;margin:2px 0 6px}
  .sub{color:var(--muted);font-size:15px;max-width:62ch;margin-bottom:22px}
  .bar{display:flex;justify-content:space-between;align-items:center;gap:10px;
       font-family:var(--mono);font-size:12px;color:var(--dim);margin-bottom:10px}
  .bar a{color:var(--muted);text-decoration:none;border-bottom:1px solid var(--border-2)}
  .bar a:hover{color:var(--text)}
  table{border-collapse:collapse;width:100%}
  th,td{text-align:left;padding:11px 14px 11px 0;border-bottom:1px solid var(--bg-2);font-size:14px}
  th{color:var(--dim);font-weight:500;font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
  td.mono{font-family:var(--mono);font-size:13px}
  .dom{font-weight:600;text-decoration:none;border-bottom:1px solid var(--border-2);padding-bottom:1px}
  .dom:hover{border-color:var(--text)}
  .g{font-family:var(--mono);font-weight:700;font-size:13px;border:1px solid;border-radius:5px;padding:1px 8px}
  .pill{font-family:var(--mono);font-size:11.5px;border:1px solid;border-radius:999px;padding:2px 10px;white-space:nowrap}
  .flag{font-family:var(--mono);font-size:11px;color:var(--dim)}
  .flag.bad{color:var(--red)}
  .rep{font-family:var(--mono);font-size:11.5px;color:var(--dim);text-decoration:none;white-space:nowrap}
  .rep:hover{color:var(--text)}
  .empty{padding:26px 0;color:var(--muted)}
  .empty a{color:var(--text)}
  .login{max-width:440px;background:var(--panel);border:1px solid var(--border-2);border-radius:12px;padding:18px;margin-top:8px}
  .login:focus-within{border-color:var(--accent)}
  .login .row{display:flex;gap:8px}
  .login input{flex:1;background:var(--bg);border:1px solid var(--border);border-radius:8px;
    color:var(--text);font-size:15px;padding:10px 12px;outline:none;font-family:var(--mono)}
  .login input::placeholder{color:var(--dim)}
  .login button{background:var(--accent);color:var(--accent-ink);border:0;border-radius:8px;
    padding:10px 20px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit}
  .login button:disabled{opacity:.5;cursor:wait}
  .msg{display:none;margin-top:10px;padding:10px 12px;border-radius:8px;border:1px solid var(--border);
    background:var(--bg);font-size:13.5px;color:var(--text-2);line-height:1.5}
  .msg.show{display:block}
  .msg.err{border-color:var(--red);color:var(--red)}
  .fine{margin-top:14px;font-size:12.5px;color:var(--dim);line-height:1.55;max-width:60ch}
  .fine a{color:var(--muted)}
  footer{margin-top:34px;font-family:var(--mono);font-size:11.5px;color:var(--dim)}
  footer a{color:var(--muted)}
  @media(max-width:640px){.hide-sm{display:none}}
</style></head><body><div class="wrap">
  <div class="eyebrow"><span class="reg">&sect;dash</span><span class="reg-label">the dashboard</span></div>
  ${inner}
  <footer><a href="${origin}/">scan</a> &middot; <a href="${origin}/#monitor">add a domain</a> &middot;
    <a href="${origin}/directory">directory</a> &middot; <a href="${origin}/privacy.md">privacy</a></footer>
</div></body></html>`;
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

function loginView(origin, note) {
  return `
  <h1>Sign in to your dashboard</h1>
  <p class="sub">One view across every domain you monitor: slop grade, design-system
    drift, and client reports. We email you a single-use link — no password.</p>
  ${note ? `<div class="msg show err" style="max-width:440px">${escapeHtml(note)}</div>` : ''}
  <form class="login" id="loginForm">
    <div class="row">
      <input id="loginEmail" type="email" placeholder="you@company.com" autocomplete="email" required>
      <button type="submit" id="loginGo">Email me a link</button>
    </div>
    <div class="msg" id="loginMsg"></div>
  </form>
  <p class="fine">Not monitoring anything yet? <a href="${origin}/#monitor">Start with one domain</a> —
    it takes an email and a domain name.</p>
  <script>
  const f=document.getElementById('loginForm'),b=document.getElementById('loginGo'),m=document.getElementById('loginMsg');
  f.addEventListener('submit',async(e)=>{e.preventDefault();
    b.disabled=true;b.textContent='Sending…';m.className='msg show';m.textContent='Requesting link…';
    try{
      const r=await fetch('/api/dashboard/link',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:document.getElementById('loginEmail').value.trim()})});
      const d=await r.json();
      if(!r.ok)throw new Error(d.message||d.error||('HTTP '+r.status));
      m.className='msg show';m.textContent=d.message;
    }catch(err){m.className='msg show err';m.textContent='✗ '+err.message;}
    finally{b.disabled=false;b.textContent='Email me a link';}
  });
  </script>`;
}

function row(w, origin) {
  const c = tierColors(w.lastTier);
  const sc = sysColors(w.lastSystemTier);
  const slop =
    w.lastScore == null
      ? '<span class="flag">no scan yet</span>'
      : `<span class="g" style="color:${c.fg};border-color:${c.fg}">${escapeHtml(w.lastGrade || '—')}</span>
       <span class="mono" style="color:${c.fg}"> ${w.lastScore}/100</span>`;
  const sys = w.lastSystemTier
    ? `<span class="pill" style="color:${sc};border-color:${sc}">${escapeHtml(w.lastSystemTier)}</span>`
    : `<span class="flag">${w.system ? 'awaiting sweep' : 'off'}</span>`;
  const flags = [
    w.regressed ? '<span class="flag bad">regressed</span>' : '',
    w.systemRegressed ? '<span class="flag bad">drifted</span>' : '',
    !w.verified ? '<span class="flag">unconfirmed</span>' : '',
    w.listed ? '<span class="flag">listed</span>' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const checked = w.lastCheckedAt ? String(w.lastCheckedAt).slice(0, 10) : '—';
  return `<tr>
    <td><a class="dom" href="https://${escapeHtml(w.domain)}">${escapeHtml(w.domain)}</a></td>
    <td>${slop}</td>
    <td>${sys}</td>
    <td>${flags || '<span class="flag">ok</span>'}</td>
    <td class="mono hide-sm">${escapeHtml(checked)}</td>
    <td><a class="rep" href="${origin}/report/${encodeURIComponent(w.domain)}">report&nbsp;&rarr;</a></td>
  </tr>`;
}

function dashboardView(origin, email, watches) {
  const drifted = watches.filter((w) => w.regressed || w.systemRegressed).length;
  const rows = watches.length
    ? `<table>
        <thead><tr><th>domain</th><th>slop</th><th>system</th><th>status</th><th class="hide-sm">last check</th><th></th></tr></thead>
        <tbody>${watches.map((w) => row(w, origin)).join('')}</tbody>
      </table>`
    : `<p class="empty">No monitored domains on this address yet.
        <a href="${origin}/#monitor">Add the first one</a>.</p>`;
  return `
  <h1>Your domains</h1>
  <div class="bar">
    <span>${escapeHtml(email)} &middot; ${watches.length} domain${watches.length === 1 ? '' : 's'}${drifted ? ` &middot; ${drifted} needing attention` : ''}</span>
    <a href="${origin}/dashboard?logout=1">sign out</a>
  </div>
  ${rows}
  <p class="fine">Daily sweeps re-scan each verified domain; drift and regression email
    you once per event. Print any client report straight from its page.</p>`;
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const origin = url.origin;

  if (!env.SESSION_SECRET) {
    return page(
      origin,
      'Dashboard',
      `
      <h1>Dashboard not configured</h1>
      <p class="sub">Sign-in requires SESSION_SECRET (and the email provider) to be set —
        see PRODUCTION.md. Monitoring itself works without it.</p>`
    );
  }

  // Sign out.
  if (url.searchParams.get('logout') === '1') {
    return page(origin, 'Signed out', loginView(origin, ''), {
      'Set-Cookie': clearSessionCookie(),
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
        loginView(origin, 'That sign-in link has expired or was already used. Request a fresh one.')
      );
    }
    const session = await signSession(email, env.SESSION_SECRET);
    return new Response(null, {
      status: 302,
      headers: { Location: `${origin}/dashboard`, 'Set-Cookie': sessionCookie(session) },
    });
  }

  // Cookie session.
  const email = await sessionEmail(request, env.SESSION_SECRET);
  if (!email) return page(origin, 'Sign in', loginView(origin, ''));

  const watches = env.RESULTS ? await listWatchesByEmail(env.RESULTS, email) : [];
  watches.sort((a, b) => String(a.domain).localeCompare(String(b.domain)));
  return page(origin, 'Dashboard', dashboardView(origin, email, watches));
}
