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

// ── SSRF guard ────────────────────────────────────────────────────────────────
// The scanner loads arbitrary user-supplied URLs in a real headless browser and
// returns reconstructed page content (title, h1, text, screenshot). Without a
// host allow/deny check that's a server-side request forgery primitive: a caller
// could point us at cloud metadata (169.254.169.254), loopback, or RFC-1918
// hosts and read internal responses back. We can't DNS-resolve before navigation
// in the Workers runtime, so we block by hostname shape: literal private/loopback
// IPs (v4 + v6) and obviously-internal names. Public hostnames pass through.
//
// Returns a normalized https URL string on success, or { error, status } to
// return verbatim to the caller.
const PRIVATE_HOSTNAMES = new Set([
  'localhost', 'ip6-localhost', 'ip6-loopback'
]);

function isPrivateIPv4(host) {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (m.slice(1).some(o => Number(o) > 255)) return false;
  return (
    a === 0 ||                          // 0.0.0.0/8 "this network"
    a === 10 ||                         // 10.0.0.0/8 private
    a === 127 ||                        // 127.0.0.0/8 loopback
    (a === 169 && b === 254) ||         // 169.254.0.0/16 link-local (cloud metadata)
    (a === 172 && b >= 16 && b <= 31) ||// 172.16.0.0/12 private
    (a === 192 && b === 168) ||         // 192.168.0.0/16 private
    (a === 100 && b >= 64 && b <= 127) ||// 100.64.0.0/10 CGNAT
    a >= 224                            // 224.0.0.0/4 multicast + 240/4 reserved
  );
}

function isPrivateIPv6(host) {
  // URL hostnames keep IPv6 in brackets for the authority but `.hostname`
  // strips them; accept both. Lowercase, drop any zone id.
  let h = host.replace(/^\[/, '').replace(/\]$/, '').split('%')[0].toLowerCase();
  if (h === '::1' || h === '::') return true;              // loopback / unspecified
  if (h.startsWith('fc') || h.startsWith('fd')) return true; // fc00::/7 unique-local
  if (h.startsWith('fe8') || h.startsWith('fe9') ||
      h.startsWith('fea') || h.startsWith('feb')) return true; // fe80::/10 link-local
  // IPv4-mapped (::ffff:a.b.c.d) — re-check the embedded v4.
  const mapped = h.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

export function validateScanUrl(raw) {
  if (!raw || typeof raw !== 'string') return { error: 'url is required', status: 400 };
  let url = raw.trim();
  // Reject an explicit non-http(s) scheme outright (file:, data:, ftp:, gopher:…)
  // rather than blindly prepending https:// and producing a confusing host.
  const scheme = url.match(/^([a-z][a-z0-9+.-]*):/i);
  if (scheme && !/^https?$/i.test(scheme[1])) {
    return { error: 'Only http(s) URLs can be scanned', status: 400 };
  }
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  let parsed;
  try { parsed = new URL(url); } catch { return { error: 'Invalid URL', status: 400 }; }

  // Only http/https reach the browser. (new URL accepts file:, data:, etc.)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { error: 'Only http(s) URLs can be scanned', status: 400 };
  }

  const host = parsed.hostname.toLowerCase();
  const blocked =
    PRIVATE_HOSTNAMES.has(host) ||
    host.endsWith('.localhost') ||
    host.endsWith('.internal') ||
    host.endsWith('.local') ||
    isPrivateIPv4(host) ||
    (host.includes(':') || /^\[.*\]$/.test(parsed.host)) && isPrivateIPv6(host);

  if (blocked) {
    return { error: 'That host is not allowed (private, loopback, or internal address)', status: 400 };
  }

  return { url };
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
  const slim = {
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
  // Multi-axis (#08): persist a compact copy-axis summary + unified headline so
  // permalinks/OG cards can show it. Only when the copy axis was actually run.
  if (data.axes && data.axes.copy) {
    const copy = data.axes.copy;
    slim.unifiedScore = data.unifiedScore;
    slim.unifiedTier = data.unifiedTier;
    slim.unifiedGrade = data.unifiedGrade;
    slim.axes = {
      design: { score: data.score, tier: data.tier, grade: data.grade },
      copy: {
        score: copy.score, tier: copy.tier, grade: copy.grade,
        patternsFlagged: copy.patternsFlagged, patternsTotal: copy.patternsTotal,
        thin: !!copy.thin,
        triggered: (copy.patterns || []).filter(p => p.triggered)
          .map(p => ({ id: p.id, short: p.short, weight: p.weight }))
      }
    };
  }
  return slim;
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
      <div class="brand">slop&#8209;detect <span class="slash">/ ${slim.patternsTotal ? escapeHtml(String(slim.patternsTotal)) + '&#8209;rule' : ''} AI&#8209;design fingerprint</span></div>
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
