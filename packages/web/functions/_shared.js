// Shared helpers for the Pages Functions: result IDs, KV persistence, the
// share-card layout (used by both /r/:id and /og/:id.png), and badge SVG.
//
// Pure-ish: no Cloudflare-specific imports here so it's easy to reason about.

// ── IDs ─────────────────────────────────────────────────────────────────────
// Short, URL-safe, collision-resistant enough for a public scanner.
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
export function newId(len = 8) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let s = '';
  for (let i = 0; i < len; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return s;
}

export function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return String(url || '').replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]; }
}

const RESULT_TTL = 60 * 60 * 24 * 90;  // 90 days
const DOMAIN_TTL = 60 * 60 * 24 * 90;
const BADGE_TTL  = 60 * 60 * 3;         // 3 hours

// ── KV persistence ───────────────────────────────────────────────────────────
// We store a slim snapshot — enough to render the permalink + card + badge,
// without bloating KV with full evidence blobs for clean patterns.
export function slimResult(data, id) {
  const triggered = (data.patterns || [])
    .filter(p => p.triggered)
    .map(p => ({ id: p.id, label: p.label, short: p.short, weight: p.weight }));
  return {
    id,
    url: data.url,
    finalUrl: data.finalUrl,
    domain: domainOf(data.finalUrl || data.url),
    title: data.title || null,
    h1: data.h1 || null,
    score: data.score,
    tier: data.tier,
    grade: data.grade,
    verdict: data.verdict,
    patternsFlagged: data.patternsFlagged,
    patternsTotal: data.patternsTotal,
    definitionsVersion: data.definitionsVersion || null,
    triggered,
    createdAt: new Date().toISOString()
  };
}

export async function saveResult(kv, slim) {
  if (!kv) return;
  await Promise.all([
    kv.put(`r:${slim.id}`, JSON.stringify(slim), { expirationTtl: RESULT_TTL }),
    kv.put(`d:${slim.domain}`, slim.id, { expirationTtl: DOMAIN_TTL })
  ]);
}

export async function getResult(kv, id) {
  if (!kv || !id) return null;
  const raw = await kv.get(`r:${id}`);
  return raw ? JSON.parse(raw) : null;
}

export async function getLatestForDomain(kv, domain) {
  if (!kv || !domain) return null;
  const id = await kv.get(`d:${domain}`);
  return id ? getResult(kv, id) : null;
}

// ── Tier → color ──────────────────────────────────────────────────────────────
export function tierColors(tier) {
  switch (tier) {
    case 'Clean': return { fg: '#4ade80', bg: '#0b2014', label: '#bbf7d0' };
    case 'Mild':  return { fg: '#fbbf24', bg: '#241a06', label: '#fde68a' };
    case 'Heavy': return { fg: '#f87171', bg: '#240c0c', label: '#fecaca' };
    default:      return { fg: '#8a8a92', bg: '#161618', label: '#d4d4d8' };
  }
}

// ── Badge SVG (shields-style, self-rendered so we don't depend on shields.io) ─
export function badgeSvg(domain, slim) {
  const label = 'slop';
  const score = slim ? slim.score : '?';
  const grade = slim ? slim.grade : '—';
  const tier  = slim ? slim.tier  : 'Unknown';
  const c = tierColors(tier);

  const value = slim ? `${grade} · ${score}` : 'no scan';
  // Rough text-width estimate (monospace-ish, 6.6px/char + padding).
  const labelW = 38;
  const valueW = Math.max(46, value.length * 6.8 + 16);
  const total = labelW + valueW;
  const fill = slim ? c.fg : '#8a8a92';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="20" role="img" aria-label="${label}: ${value}">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${total}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelW}" height="20" fill="#1a1a1d"/>
    <rect x="${labelW}" width="${valueW}" height="20" fill="${fill}"/>
    <rect width="${total}" height="20" fill="url(#s)"/>
  </g>
  <g text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelW / 2}" y="14" fill="#fff">${label}</text>
    <text x="${labelW + valueW / 2}" y="14" fill="#0a0a0b" font-weight="bold">${escapeXml(value)}</text>
  </g>
</svg>`;
}

// ── Share-card HTML (1200×630) — rendered to PNG by /og/:id.png ───────────────
export function cardHtml(slim) {
  const c = tierColors(slim.tier);
  const domain = escapeHtml(slim.domain);
  const verdict = escapeHtml(slim.verdict || '');
  const tells = (slim.triggered || []).slice(0, 4).map(t => escapeHtml(t.short || t.label)).join(' · ');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1200px;height:630px;overflow:hidden}
  body{
    background:radial-gradient(1200px 630px at 78% 22%, ${c.bg} 0%, #0a0a0b 60%);
    color:#f5f5f7;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",Arial,sans-serif;
    padding:64px 72px;display:flex;flex-direction:column;justify-content:space-between;
  }
  .top{display:flex;justify-content:space-between;align-items:flex-start}
  .brand{font-size:26px;font-weight:700;letter-spacing:-0.02em}
  .brand .slash{color:#5a5a62;font-weight:400}
  .defs{font-size:15px;color:#5a5a62;font-family:ui-monospace,Menlo,monospace}
  .mid{display:flex;align-items:center;gap:48px;margin-top:8px}
  .grade{font-size:240px;font-weight:800;line-height:.82;letter-spacing:-0.05em;color:${c.fg}}
  .meta{display:flex;flex-direction:column;gap:14px}
  .score{font-size:64px;font-weight:700;letter-spacing:-0.03em}
  .score small{font-size:30px;color:#8a8a92;font-weight:500}
  .tier{align-self:flex-start;font-size:24px;font-weight:700;padding:6px 20px;border-radius:999px;
        border:2px solid ${c.fg};color:${c.fg}}
  .flagged{font-size:20px;color:#8a8a92}
  .bottom{display:flex;flex-direction:column;gap:10px}
  .domain{font-size:30px;font-weight:600}
  .verdict{font-size:26px;color:#d4d4d8;max-width:1000px;line-height:1.3}
  .tells{font-size:17px;color:#6b6b73;font-family:ui-monospace,Menlo,monospace}
  .foot{font-size:18px;color:#5a5a62;margin-top:6px}
  </style></head><body>
    <div class="top">
      <div class="brand">slop&#8209;detect <span class="slash">/ 16&#8209;rule AI&#8209;design fingerprint</span></div>
      <div class="defs">defs ${escapeHtml(slim.definitionsVersion || '')}</div>
    </div>
    <div class="mid">
      <div class="grade">${escapeHtml(slim.grade)}</div>
      <div class="meta">
        <div class="score">${slim.score}<small>/100</small></div>
        <div class="tier">${escapeHtml(slim.tier)}</div>
        <div class="flagged">${slim.patternsFlagged}/${slim.patternsTotal} patterns triggered</div>
      </div>
    </div>
    <div class="bottom">
      <div class="domain">${domain}</div>
      <div class="verdict">${verdict}</div>
      ${tells ? `<div class="tells">${tells}</div>` : ''}
      <div class="foot">slop-detect.com</div>
    </div>
  </body></html>`;
}

// ── escaping ──────────────────────────────────────────────────────────────────
export function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
export function escapeXml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
  }[c]));
}

export { BADGE_TTL };
