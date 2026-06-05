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

// ── Monitored domains (willingness-to-pay test — see VALIDATION.md) ───────────
// A "watch" remembers a domain so we can detect when it regresses to slop
// between redesigns ("your score dropped A → C this week"). This is the paid
// CONTINUITY layer: scanning stays free forever; remembering + alerting is the
// thing teams would pay for. Stored in the same RESULTS KV:
//   w:<domain>  → watch record (email, baseline, last-seen, regressed flag)
//   h:<domain>  → capped array of {id,score,grade,tier,createdAt} history points
//
// NOTE: this is a deliberately small validation prototype. Scheduled re-scans
// (Cron Trigger) and the actual email send are the documented follow-ups; what
// ships here is enough to capture intent + emails and prove regression detection
// works on real scan data.
const WATCH_TTL   = 60 * 60 * 24 * 365;  // 1 year — a watch should outlive a scan
const HISTORY_CAP = 50;                   // keep the last N points per domain

// Slop score is 0–100, lower is better. A regression is the score getting
// meaningfully WORSE, or the tier dropping a band (Clean → Mild → Heavy).
const REGRESSION_SCORE_DELTA = 8;
const TIER_RANK = { Clean: 0, Mild: 1, Heavy: 2 };
export function tierRank(tier) {
  return TIER_RANK[tier] != null ? TIER_RANK[tier] : 1;
}

// Strict-enough domain validation for a public signup form: a registrable
// hostname (letters/digits/hyphen labels + a TLD), no scheme/path/port. Returns
// the normalized bare domain (lowercased, www-stripped) or null.
export function normalizeDomain(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let d = raw.trim().toLowerCase();
  if (/[\s/\\@]/.test(d.replace(/^https?:\/\//, ''))) {
    // strip a leading scheme but reject embedded paths/spaces/credentials
    d = d.replace(/^https?:\/\//, '').split('/')[0];
  }
  d = d.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\.$/, '');
  if (d.length < 4 || d.length > 253) return null;
  // labels: 1–63 chars, alphanumeric + internal hyphens; final label (TLD) ≥2 alpha.
  if (!/^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(d)) return null;
  return d;
}

// Pragmatic email check — good enough to reject typos/garbage at the form, not
// a full RFC 5322 parser (which over-rejects real addresses).
export function isValidEmail(s) {
  if (!s || typeof s !== 'string') return false;
  const e = s.trim();
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

export async function getWatch(kv, domain) {
  if (!kv || !domain) return null;
  const raw = await kv.get(`w:${domain}`);
  return raw ? JSON.parse(raw) : null;
}

export async function putWatch(kv, watch) {
  if (!kv) return;
  await kv.put(`w:${watch.domain}`, JSON.stringify(watch), { expirationTtl: WATCH_TTL });
}

export async function deleteWatch(kv, domain) {
  if (!kv || !domain) return;
  await kv.delete(`w:${domain}`);
}

export async function getHistory(kv, domain) {
  if (!kv || !domain) return [];
  const raw = await kv.get(`h:${domain}`);
  if (!raw) return [];
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a : []; }
  catch { return []; }
}

async function appendHistory(kv, domain, point) {
  if (!kv) return [];
  const hist = await getHistory(kv, domain);
  // De-dupe by scan id so re-saving the same scan doesn't pad the timeline.
  if (hist.length && hist[hist.length - 1].id === point.id) return hist;
  hist.push(point);
  const capped = hist.slice(-HISTORY_CAP);
  await kv.put(`h:${domain}`, JSON.stringify(capped), { expirationTtl: WATCH_TTL });
  return capped;
}

// Decide whether `current` is a regression from `baseline`. Pure — unit-tested.
export function isRegression(baseline, current) {
  if (!baseline || !current) return false;
  if (tierRank(current.tier) > tierRank(baseline.tier)) return true;
  return (current.score - baseline.score) >= REGRESSION_SCORE_DELTA;
}

// Called from the scan handler after a result is persisted. If the scanned
// domain is being watched, append a history point, refresh last-seen, set the
// baseline if it was never established, and recompute the regressed flag.
// Returns a compact monitoring summary to fold into the scan response (so the
// UI can show "monitored · regressed A → C"), or null if the domain isn't watched.
export async function recordScanForWatch(kv, slim) {
  if (!kv || !slim || !slim.domain) return null;
  const watch = await getWatch(kv, slim.domain);
  if (!watch) return null;

  const point = {
    id: slim.id,
    score: slim.score,
    grade: slim.grade,
    tier: slim.tier,
    createdAt: slim.createdAt || new Date().toISOString()
  };
  await appendHistory(kv, slim.domain, point);

  // Establish the baseline on the first observed scan if registration happened
  // before any scan existed for the domain.
  if (watch.baselineScore == null) {
    watch.baselineScore = point.score;
    watch.baselineGrade = point.grade;
    watch.baselineTier  = point.tier;
    watch.baselineId    = point.id;
    watch.baselineAt    = point.createdAt;
  }

  const baseline = {
    score: watch.baselineScore, grade: watch.baselineGrade, tier: watch.baselineTier
  };
  const regressed = isRegression(baseline, point);

  watch.lastScore = point.score;
  watch.lastGrade = point.grade;
  watch.lastTier  = point.tier;
  watch.lastId    = point.id;
  watch.lastCheckedAt = point.createdAt;
  watch.regressed = regressed;
  // `notified` tracks whether we've already alerted for THIS regression so a
  // future cron/email job fires once per transition, not on every re-scan.
  if (!regressed) watch.notified = false;
  await putWatch(kv, watch);

  // Reconcile the derived directory row with the watch (the source of truth):
  // refresh it with the latest score if the domain is listed, or remove a stale
  // row if it was delisted but a previous delete didn't land. Best-effort —
  // never break a scan over the directory.
  try {
    if (watch.listed) await setListing(kv, slim);
    else await deleteListing(kv, slim.domain);
  } catch (_) { /* directory row is derived; reconciled on a later scan */ }

  return {
    watched: true,
    regressed,
    baseline,
    delta: point.score - baseline.score
  };
}

// Public-facing view of a watch — never leaks the subscriber's email.
export function publicWatch(watch, history) {
  if (!watch) return null;
  return {
    domain: watch.domain,
    monitoring: true,
    listed: !!watch.listed,
    plan: watch.plan || 'trial',
    createdAt: watch.createdAt,
    baseline: watch.baselineScore == null ? null : {
      score: watch.baselineScore, grade: watch.baselineGrade,
      tier: watch.baselineTier, id: watch.baselineId, at: watch.baselineAt
    },
    last: watch.lastScore == null ? null : {
      score: watch.lastScore, grade: watch.lastGrade,
      tier: watch.lastTier, id: watch.lastId, at: watch.lastCheckedAt
    },
    regressed: !!watch.regressed,
    history: (history || []).map(h => ({
      score: h.score, grade: h.grade, tier: h.tier, at: h.createdAt
    }))
  };
}

// ── Public directory of scanned sites (opt-in — see VALIDATION.md) ────────────
// A site is listed ONLY when its owner opts in via the claim/monitor flow
// (POST /api/watch { list: true }) — never from an anonymous scan, so we never
// publish a verdict on a company that didn't ask to be there (a ROADMAP
// guardrail). Listed sites get a real (dofollow) backlink from /directory: the
// catalogue ranks in search, links out to each site, and the backlink is the
// incentive that drives owners to claim + monitor.
//
// Storage (RESULTS KV): l:<domain> → full listing record, with a compact display
// summary in the key's METADATA so the directory enumerates in one list() call
// without a per-row read.
const LISTING_TTL = 60 * 60 * 24 * 365;  // 1 year

function listingMeta(record) {
  return {
    s: record.score, g: record.grade, tr: record.tier,
    id: record.id, t: (record.title || '').slice(0, 60), at: record.listedAt
  };
}

export async function getListing(kv, domain) {
  if (!kv || !domain) return null;
  const raw = await kv.get(`l:${domain}`);
  return raw ? JSON.parse(raw) : null;
}

// Create or refresh a listing from a slim scan result. Preserves the original
// listedAt across refreshes so the directory can show "listed since".
export async function setListing(kv, slim) {
  if (!kv || !slim?.domain) return null;
  const domain = slim.domain;
  const existing = await getListing(kv, domain);
  const record = {
    domain,
    url: `https://${domain}`,
    score: slim.score ?? null,
    grade: slim.grade ?? null,
    tier: slim.tier ?? null,
    id: slim.id ?? existing?.id ?? null,
    title: slim.title ?? existing?.title ?? null,
    verdict: slim.verdict ?? existing?.verdict ?? null,
    listedAt: existing?.listedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await kv.put(`l:${domain}`, JSON.stringify(record), {
    expirationTtl: LISTING_TTL,
    metadata: listingMeta(record)
  });
  return record;
}

export async function deleteListing(kv, domain) {
  if (!kv || !domain) return;
  await kv.delete(`l:${domain}`);
}

// Enumerate the directory from KV list metadata (cheap — no per-row get).
// Returns { sites, cursor, complete }. `cursor` paginates the raw KV scan.
export async function listSites(kv, { limit = 200, cursor = null } = {}) {
  if (!kv) return { sites: [], cursor: null, complete: true };
  const res = await kv.list({ prefix: 'l:', limit, cursor: cursor || undefined });
  const sites = (res.keys || []).map(k => {
    const m = k.metadata || {};
    const domain = k.name.replace(/^l:/, '');
    return {
      domain,
      url: `https://${domain}`,
      score: m.s ?? null,
      grade: m.g ?? null,
      tier: m.tr ?? null,
      id: m.id ?? null,
      title: m.t || null,
      listedAt: m.at || null
    };
  });
  return {
    sites,
    cursor: res.list_complete ? null : (res.cursor || null),
    complete: !!res.list_complete
  };
}

// Walk the whole directory (paginates internally). Fine at validation scale.
export async function listAllSites(kv) {
  const out = [];
  let cursor = null;
  do {
    const r = await listSites(kv, { limit: 1000, cursor });
    out.push(...r.sites);
    cursor = r.cursor;
  } while (cursor);
  return out;
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
