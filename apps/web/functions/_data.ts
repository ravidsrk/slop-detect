// The persistence layer: everything that reads or writes the RESULTS KV.
//
// Scan snapshots, monitored-domain "watches", double-opt-in + dashboard tokens,
// the per-domain history timeline, the global score distribution, and the opt-in
// public directory all live here. Pure scoring/percentile math that the KV
// functions lean on is kept alongside them (and unit-tested directly).
//
// Framework-agnostic: this is the layer the route handlers (and a future Hono
// app) call into, so it imports only the leaf utils, never anything presentational.
import { PATTERNS } from '@slop-detect/core';
import { domainOf, newId, tierRank } from './_util.js';

// ── pattern-category clean fractions (shared record + render) ────────────────
// The five overview bars / radar axes map engine pattern categories to display
// names. Order is stable — bumpCategoryStats and buildResultView both key off it.
export const PATTERN_CATEGORY_ORDER = ['fonts', 'colors', 'layout', 'css', 'images'] as const;

const CAT_MAX: Record<string, number> = {};
for (const p of PATTERNS as any[]) CAT_MAX[p.category] = (CAT_MAX[p.category] || 0) + p.weight;
const PATTERN_BY_ID = new Map((PATTERNS as any[]).map((p) => [p.id, p]));
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// Per-category clean fraction (0..1) for a slim record. Same formula as
// buildResultView's categories[].cleanFraction — one source of truth.
export function categoryCleanFractions(slim: any): Record<string, number> {
  const triggered = (slim?.triggered || []).filter(Boolean);
  const out: Record<string, number> = {};
  for (const key of PATTERN_CATEGORY_ORDER) {
    const hits = triggered.filter((t: any) => PATTERN_BY_ID.get(t.id)?.category === key);
    const weight = hits.reduce((s: number, t: any) => s + (t.weight || 0), 0);
    const max = CAT_MAX[key] || 0;
    const ratio = max > 0 ? clamp01(weight / max) : 0;
    out[key] = 1 - ratio;
  }
  return out;
}

const RESULT_TTL = 60 * 60 * 24 * 90; // 90 days
const DOMAIN_TTL = 60 * 60 * 24 * 90;
const BADGE_TTL = 60 * 60 * 3; // 3 hours

// ── KV persistence ───────────────────────────────────────────────────────────
// We store a slim snapshot — enough to render the permalink + card + badge,
// without bloating KV with full evidence blobs for clean patterns.
export function slimResult(data, id) {
  const triggered = (data.patterns || [])
    .filter((p) => p.triggered)
    .map((p) => ({ id: p.id, label: p.label, short: p.short, weight: p.weight }));
  const slim: any = {
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
    browserVersion: data.browserVersion || null,
    patternsErrored: data.patternsErrored || 0,
    triggered,
    createdAt: new Date().toISOString(),
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
        score: copy.score,
        tier: copy.tier,
        grade: copy.grade,
        patternsFlagged: copy.patternsFlagged,
        patternsTotal: copy.patternsTotal,
        thin: !!copy.thin,
        triggered: (copy.patterns || [])
          .filter((p) => p.triggered)
          .map((p) => ({ id: p.id, short: p.short, weight: p.weight })),
      },
    };
  }
  // System axis (Roadmap v2 P2a): persist a compact compliance summary so the
  // watch sweep can detect drift and the report page can render it. Only when
  // the axis actually ran against a parseable DESIGN.md.
  if (data.system && data.system.declared) {
    slim.system = {
      score: data.system.score,
      tier: data.system.tier,
      name: data.system.name || null,
      driftCount: (data.system.drift || []).length,
      drift: (data.system.drift || []).slice(0, 5).map((d) => ({ id: d.id, message: d.message })),
    };
  }
  return slim;
}

export async function saveResult(kv, slim) {
  if (!kv) return;
  await Promise.all([
    kv.put(`r:${slim.id}`, JSON.stringify(slim), { expirationTtl: RESULT_TTL }),
    kv.put(`d:${slim.domain}`, slim.id, { expirationTtl: DOMAIN_TTL }),
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
const WATCH_TTL = 60 * 60 * 24 * 365; // 1 year — a watch should outlive a scan
const HISTORY_CAP = 50; // keep the last N points per domain

// Slop score is 0–100, lower is better. A regression is the score getting
// meaningfully WORSE, or the tier dropping a band (Clean → Mild → Heavy).
const REGRESSION_SCORE_DELTA = 8;

export async function getWatch(kv, domain) {
  if (!kv || !domain) return null;
  const raw = await kv.get(`w:${domain}`);
  return raw ? JSON.parse(raw) : null;
}

export async function putWatch(kv, watch) {
  if (!kv) return;
  await kv.put(`w:${watch.domain}`, JSON.stringify(watch), { expirationTtl: WATCH_TTL });
}

// ── Double-opt-in verification tokens ─────────────────────────────────────────
// A token maps to a domain (wv:<token> → domain). The owner clicks a link
// carrying the token to set watch.verified=true. Tokens are single-use and
// expire; an unverified watch never receives alert email.
const VERIFY_TTL = 60 * 60 * 24 * 7; // 7 days to confirm

export async function issueWatchToken(kv, domain) {
  if (!kv || !domain) return null;
  const token = newId(32); // 32 url-safe chars ≈ 165 bits
  await kv.put(`wv:${token}`, domain, { expirationTtl: VERIFY_TTL });
  return token;
}

// Resolve + burn a token. Returns the domain it confirmed, or null if unknown/expired.
//
// NOTE: get-then-delete is not atomic, and Workers KV has no compare-and-delete
// primitive, so two requests racing the SAME token within the (eventually
// consistent) window can both succeed. We accept this — the blast radius is
// benign: re-confirming a watch just re-sets verified:true (idempotent), and a
// raced dashboard token only mints a second session for the SAME owner email.
// True hard single-use would require a Durable Object; not worth it for this.
export async function consumeWatchToken(kv, token) {
  if (!kv || !token) return null;
  const domain = await kv.get(`wv:${token}`);
  if (!domain) return null;
  await kv.delete(`wv:${token}`);
  return domain;
}

// ── Dashboard magic-link tokens (P2b) ────────────────────────────────────────
// dt:<token> → email. Single-use and short-lived: the link only has to survive
// the walk from inbox to browser; the durable credential is the signed session
// cookie it mints (see _session.js).
const DASHBOARD_TOKEN_TTL = 60 * 15; // 15 minutes

export async function issueDashboardToken(kv, email) {
  if (!kv || !email) return null;
  const token = newId(32);
  await kv.put(`dt:${token}`, email, { expirationTtl: DASHBOARD_TOKEN_TTL });
  return token;
}

// Single-use, with the same benign get-then-delete race caveat documented on
// consumeWatchToken (KV has no atomic CAS; a raced token re-mints only the same
// owner's session).
export async function consumeDashboardToken(kv, token) {
  if (!kv || !token) return null;
  const email = await kv.get(`dt:${token}`);
  if (!email) return null;
  await kv.delete(`dt:${token}`);
  return email;
}

// ── Email → domains index (COST-2) ───────────────────────────────────────────
// One KV key per owner email maps to the domains they monitor, so magic-link
// lookup is a single get instead of enumerating every watch. Written on
// subscribe, pruned on unsubscribe; listWatchesByEmail self-heals stale rows.
const EMAIL_INDEX_PREFIX = 'e:';

export async function emailHash(email: string): Promise<string> {
  const want = String(email).trim().toLowerCase();
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(want));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function emailIndexKey(email: string): Promise<string> {
  return `${EMAIL_INDEX_PREFIX}${await emailHash(email)}`;
}

// ── Per-recipient confirmation-email cap (anti email-bomb) ────────────────────
// /api/watch issues a double-opt-in email to a CALLER-SUPPLIED address, so the
// per-IP middleware limit alone lets one IP mail an arbitrary victim ~20×/min
// and burn sender reputation. Cap the SEND per recipient, keyed on the HASHED
// address (never store a raw email in a rate-limit key — same reason the index
// is hashed). Mirrors dashLinkAllowed in api/dashboard/link.ts. Fail CLOSED: if
// the counter store is missing or erroring we skip the send, because the abuse
// here is the outbound mail itself, so "store down" must mean "don't mail".
const WATCH_VERIFY_LIMIT = 3;
const WATCH_VERIFY_WINDOW_SEC = 60 * 60; // 3 confirmation emails per address per hour
export async function watchVerifyAllowed(kv, email) {
  if (!kv || !email) return false;
  try {
    const key = `rl:watchverify:${await emailHash(email)}`;
    const n = parseInt(await kv.get(key), 10) || 0;
    if (n >= WATCH_VERIFY_LIMIT) return false;
    await kv.put(key, String(n + 1), { expirationTtl: WATCH_VERIFY_WINDOW_SEC });
    return true;
  } catch {
    return false;
  }
}

// ── Per-IP OG card render cap ─────────────────────────────────────────────────
// GET /og/:id.png sits outside /api/* middleware but launches Chromium. Cap
// uncached renders per client IP. An in-isolate counter serializes concurrent
// requests in one Worker (KV get/put is not atomic). Missing RATE_LIMIT still
// honors the isolate cap; KV errors fail closed. Cross-isolate KV races are
// the same residual as watchVerifyAllowed / dashLinkAllowed — atomic counting
// needs a Durable Object (see #109).
export const OG_RENDER_LIMIT = 10;
export const OG_RENDER_WINDOW_SEC = 60;
const ogMem = new Map();
function ogMemIncrement(ip) {
  const now = Date.now();
  if (ogMem.size > 256) {
    for (const [k, v] of ogMem) if (now >= v.resetAt) ogMem.delete(k);
  }
  const key = ip || 'unknown';
  const cur = ogMem.get(key);
  if (!cur || now >= cur.resetAt) {
    ogMem.set(key, { count: 1, resetAt: now + OG_RENDER_WINDOW_SEC * 1000 });
    return 1;
  }
  cur.count += 1;
  return cur.count;
}
export async function ogRenderAllowed(kv, ip) {
  if (ogMemIncrement(ip) > OG_RENDER_LIMIT) return false;
  if (!kv) return true;
  try {
    const key = `rl:ogrender:${ip || 'unknown'}`;
    const n = parseInt(await kv.get(key), 10) || 0;
    if (n >= OG_RENDER_LIMIT) return false;
    await kv.put(key, String(n + 1), { expirationTtl: OG_RENDER_WINDOW_SEC });
    return true;
  } catch {
    return false;
  }
}

// Domains monitored by one email — one kv.get. Used by the magic-link endpoint
// where we only need a count, not full watch records.
export async function getEmailDomains(kv, email) {
  if (!kv || !email) return [];
  const key = await emailIndexKey(email);
  const raw = await kv.get(key);
  if (!raw) return [];
  try {
    const a = JSON.parse(raw);
    return Array.isArray(a) ? a.filter((d) => typeof d === 'string') : [];
  } catch {
    return [];
  }
}

export async function addToEmailIndex(kv, email, domain) {
  if (!kv || !email || !domain) return;
  const key = await emailIndexKey(email);
  const want = String(email).trim().toLowerCase();
  const domains = await getEmailDomains(kv, want);
  if (domains.includes(domain)) return;
  domains.push(domain);
  await kv.put(key, JSON.stringify(domains));
}

export async function removeFromEmailIndex(kv, email, domain) {
  if (!kv || !email || !domain) return;
  const key = await emailIndexKey(email);
  const want = String(email).trim().toLowerCase();
  const domains = (await getEmailDomains(kv, want)).filter((d) => d !== domain);
  if (domains.length) await kv.put(key, JSON.stringify(domains));
  else await kv.delete(key);
}

// All watches owned by one email — the agency dashboard's data. Case-normalized
// the same way the watch API stores emails (trimmed, lowercased).
export async function listWatchesByEmail(kv, email) {
  if (!kv || !email) return [];
  const want = String(email).trim().toLowerCase();
  const key = await emailIndexKey(want);
  const raw = await kv.get(key);

  // Index missing: fall back to a full scan once and rebuild the index so
  // pre-index watches self-heal without changing the one-get link lookup path.
  if (!raw) {
    const all = await listWatches(kv, { limit: 1000 });
    const mine = all.filter((w) => w && w.email === want);
    if (mine.length) {
      await kv.put(key, JSON.stringify(mine.map((w) => w.domain).filter(Boolean)));
    }
    return mine;
  }

  let domains: string[] = [];
  try {
    const a = JSON.parse(raw);
    domains = Array.isArray(a) ? a.filter((d) => typeof d === 'string') : [];
  } catch {
    domains = [];
  }

  const out = [];
  for (const domain of domains) {
    const w = await getWatch(kv, domain);
    if (w && w.email === want) out.push(w);
    else await removeFromEmailIndex(kv, want, domain);
  }
  return out;
}

// Enumerate watches for the monitoring sweep. Returns parsed watch records.
// `limit` caps work per sweep invocation (KV list is paginated; we keep it
// simple and bounded — grow into cursor paging if the watch set gets large).
export async function listWatches(kv, { limit = 200 } = {}) {
  if (!kv) return [];
  const res = await kv.list({ prefix: 'w:', limit });
  const out = [];
  for (const k of res.keys || []) {
    try {
      const raw = await kv.get(k.name);
      if (raw) out.push(JSON.parse(raw));
    } catch (_) {
      /* skip a corrupt record rather than abort the sweep */
    }
  }
  return out;
}

export async function deleteWatch(kv, domain) {
  if (!kv || !domain) return;
  await kv.delete(`w:${domain}`);
}

export async function getHistory(kv, domain) {
  if (!kv || !domain) return [];
  const raw = await kv.get(`h:${domain}`);
  if (!raw) return [];
  try {
    const a = JSON.parse(raw);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
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

// Build the compact timeline point a scan contributes. Shared by the always-on
// recorder and the watch-specific one so the two can never diverge.
function historyPoint(slim) {
  const p: any = {
    id: slim.id,
    score: slim.score,
    grade: slim.grade,
    tier: slim.tier,
    createdAt: slim.createdAt || new Date().toISOString(),
  };
  if (slim.system) p.sys = { score: slim.system.score, tier: slim.system.tier };
  return p;
}

// ── Global score distribution (peer percentile without KV enumeration) ────────
// One 101-bucket histogram (index = slop score 0..100, value = count), bumped
// once per persisted scan. Lets the score page answer "cleaner than X% of N
// scanned sites" and the homepage show live aggregate stats, without ever
// enumerating per-domain keys. Read-modify-write is not atomic in KV, so counts
// are approximate under heavy concurrency, which is fine for a percentile.
const STATS_DIST_KEY = 'stats:dist';
const STATS_CATCLEAN_KEY = 'stats:catclean';
// Marker: this domain has already contributed to the GLOBAL aggregates. One slot
// per domain so a re-scanned (or attacker-hammered) domain can't skew the public
// score distribution or per-category averages — see claimStatsContribution.
const STATS_CONTRIB_PREFIX = 'gs:';

type CatCleanStore = { cats: Record<string, { sum: number; n: number }>; count: number };

async function getCategoryCleanStore(kv: any): Promise<CatCleanStore> {
  if (!kv) return { cats: {}, count: 0 };
  const raw = await kv.get(STATS_CATCLEAN_KEY);
  if (!raw) return { cats: {}, count: 0 };
  try {
    const o = JSON.parse(raw);
    return {
      cats: o.cats && typeof o.cats === 'object' ? o.cats : {},
      count: Number(o.count) || 0,
    };
  } catch {
    return { cats: {}, count: 0 };
  }
}

export async function getCategoryCleanAverages(kv: any) {
  const store = await getCategoryCleanStore(kv);
  const averages: Record<string, number> = {};
  for (const [k, { sum, n }] of Object.entries(store.cats)) {
    if (n > 0) averages[k] = sum / n;
  }
  return { averages, count: store.count };
}

async function bumpCategoryStats(kv: any, slim: any) {
  if (!kv || !slim) return;
  const fracs = categoryCleanFractions(slim);
  const store = await getCategoryCleanStore(kv);
  for (const key of PATTERN_CATEGORY_ORDER) {
    if (!store.cats[key]) store.cats[key] = { sum: 0, n: 0 };
    store.cats[key].sum += fracs[key];
    store.cats[key].n += 1;
  }
  store.count += 1;
  await kv.put(STATS_CATCLEAN_KEY, JSON.stringify(store)); // durable: no TTL
}

export async function getScoreDistribution(kv) {
  const empty = () => new Array(101).fill(0);
  if (!kv) return empty();
  const raw = await kv.get(STATS_DIST_KEY);
  if (!raw) return empty();
  try {
    const a = JSON.parse(raw);
    return Array.isArray(a) && a.length === 101 ? a.map((n) => Number(n) || 0) : empty();
  } catch {
    return empty();
  }
}

async function bumpScoreStats(kv, score) {
  if (!kv || typeof score !== 'number' || !Number.isFinite(score)) return;
  const dist = await getScoreDistribution(kv);
  const i = Math.max(0, Math.min(100, Math.round(score)));
  dist[i] = (dist[i] || 0) + 1;
  await kv.put(STATS_DIST_KEY, JSON.stringify(dist)); // durable: no TTL
}

// Aggregate a distribution into the headline stats the UI shows. Tier bands
// match the engine: Clean 0..9, Mild 10..27, Heavy 28+.
export function summarizeStats(dist) {
  let count = 0,
    sum = 0,
    clean = 0,
    mild = 0,
    heavy = 0;
  for (let i = 0; i <= 100; i++) {
    const n = (dist && dist[i]) || 0;
    count += n;
    sum += i * n;
    if (i <= 9) clean += n;
    else if (i <= 27) mild += n;
    else heavy += n;
  }
  return {
    count,
    avgScore: count ? Math.round((sum / count) * 10) / 10 : 0,
    slopShare: count ? Math.round(((mild + heavy) / count) * 100) : 0,
    clean,
    mild,
    heavy,
  };
}

export async function getStats(kv) {
  return summarizeStats(await getScoreDistribution(kv));
}

// "Cleaner than X% of N sites": the share of scans scoring strictly WORSE
// (higher) than `score`. Lower slop score is cleaner, so a higher percentile is
// better. Returns { count, cleanerThanPct } (pct is null when there's no data).
export function percentileFromDistribution(dist, score) {
  let count = 0,
    worse = 0;
  const s = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  for (let i = 0; i <= 100; i++) {
    const n = (dist && dist[i]) || 0;
    count += n;
    if (i > s) worse += n;
  }
  return { count, cleanerThanPct: count ? Math.round((worse / count) * 100) : null };
}

export async function percentileForScore(kv, score) {
  return percentileFromDistribution(await getScoreDistribution(kv), score);
}

// Record EVERY persisted scan into the per-domain timeline + the global stats,
// regardless of whether the domain is monitored. This is what lets a public
// /score/<domain> page chart history and rank against peers. Watch
// baseline/regression stays in recordScanForWatch, layered on top; its own
// appendHistory call de-dupes against this one by scan id.
export async function recordScan(kv, slim) {
  if (!kv || !slim || !slim.domain) return;
  // The per-domain timeline records EVERY scan, but the global aggregates count
  // each domain once — otherwise re-scanning a single domain (a legitimate
  // redesign, or an attacker hammering /api/scan) would skew the public score
  // distribution, the per-category averages, and every other domain's percentile.
  const firstContribution = await claimStatsContribution(kv, slim.domain);
  await Promise.all([
    appendHistory(kv, slim.domain, historyPoint(slim)),
    ...(firstContribution ? [bumpScoreStats(kv, slim.score), bumpCategoryStats(kv, slim)] : []),
  ]);
}

// Claim a domain's single slot in the global aggregates. Returns true the first
// time a domain is recorded, false on every later scan of that domain. The
// marker is durable (no TTL): letting it expire would re-open the dedup, so an
// attacker could just wait out the window. Get-then-put is not atomic — a rare
// concurrent race double-counts one domain, which is harmless for an aggregate.
// On a KV error we fall back to counting (a lost dedup beats dropping a real
// first scan from the stats).
async function claimStatsContribution(kv, domain) {
  const key = `${STATS_CONTRIB_PREFIX}${domain}`;
  try {
    if (await kv.get(key)) return false;
    await kv.put(key, '1');
  } catch {
    return true;
  }
  return true;
}

// Decide whether `current` is a regression from `baseline`. Pure — unit-tested.
export function isRegression(baseline, current) {
  if (!baseline || !current) return false;
  if (tierRank(current.tier) > tierRank(baseline.tier)) return true;
  return current.score - baseline.score >= REGRESSION_SCORE_DELTA;
}

// System-axis drift (Roadmap v2 P2a). The system score is 0–100 HIGHER-IS-BETTER
// (alignment with the site's own DESIGN.md). A drift event is: the page is no
// longer Aligned, AND either it fell from an Aligned baseline or its score
// dropped meaningfully (≥15). A site that was never Aligned doesn't "drift" on
// every sweep — only on a real worsening. 'No system'/'No data' never drift.
const SYSTEM_DRIFT_DELTA = 15;
const SYSTEM_OK = new Set(['Aligned']);
const SYSTEM_BAD = new Set(['Drifting', 'Off-system']);

export function isSystemDrift(baseline, current) {
  if (!baseline || !current) return false;
  if (!SYSTEM_BAD.has(current.tier)) return false;
  if (SYSTEM_OK.has(baseline.tier)) return true;
  if (typeof baseline.score !== 'number' || typeof current.score !== 'number') return false;
  return baseline.score - current.score >= SYSTEM_DRIFT_DELTA;
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

  // History points carry a compact system reading when the axis ran, so the
  // report page can chart compliance over time alongside the slop score.
  const point = historyPoint(slim);
  await appendHistory(kv, slim.domain, point);

  // Establish the baseline on the first observed scan if registration happened
  // before any scan existed for the domain.
  if (watch.baselineScore == null) {
    watch.baselineScore = point.score;
    watch.baselineGrade = point.grade;
    watch.baselineTier = point.tier;
    watch.baselineId = point.id;
    watch.baselineAt = point.createdAt;
  }

  const baseline = {
    score: watch.baselineScore,
    grade: watch.baselineGrade,
    tier: watch.baselineTier,
  };
  const regressed = isRegression(baseline, point);

  watch.lastScore = point.score;
  watch.lastGrade = point.grade;
  watch.lastTier = point.tier;
  watch.lastId = point.id;
  watch.lastCheckedAt = point.createdAt;
  watch.regressed = regressed;
  // `notified` tracks whether we've already alerted for THIS regression so a
  // future cron/email job fires once per transition, not on every re-scan.
  if (!regressed) watch.notified = false;

  // System-axis tracking (P2a): same baseline/last/once-per-event pattern as the
  // slop score, but on the compliance reading. Only updates when the scan
  // actually ran the axis (slim.system present) so a designMd-less scan can't
  // erase system state.
  let systemDrift = false;
  if (slim.system) {
    if (watch.baselineSystemScore == null) {
      watch.baselineSystemScore = slim.system.score;
      watch.baselineSystemTier = slim.system.tier;
    }
    systemDrift = isSystemDrift(
      { score: watch.baselineSystemScore, tier: watch.baselineSystemTier },
      { score: slim.system.score, tier: slim.system.tier }
    );
    watch.lastSystemScore = slim.system.score;
    watch.lastSystemTier = slim.system.tier;
    watch.lastSystemAt = point.createdAt;
    watch.lastSystemDrift = slim.system.drift || [];
    watch.systemRegressed = systemDrift;
    if (!systemDrift) watch.systemNotified = false;
  }
  await putWatch(kv, watch);

  // Reconcile the derived directory row with the watch (the source of truth):
  // refresh it with the latest score if the domain is listed, or remove a stale
  // row if it was delisted but a previous delete didn't land. Best-effort —
  // never break a scan over the directory.
  try {
    if (watch.listed) await setListing(kv, slim);
    else await deleteListing(kv, slim.domain);
  } catch (_) {
    /* directory row is derived; reconciled on a later scan */
  }

  const summary: any = {
    watched: true,
    regressed,
    baseline,
    delta: point.score - baseline.score,
  };
  if (slim.system) {
    summary.system = {
      score: slim.system.score,
      tier: slim.system.tier,
      drifted: systemDrift,
    };
  }
  return summary;
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
    baseline:
      watch.baselineScore == null
        ? null
        : {
            score: watch.baselineScore,
            grade: watch.baselineGrade,
            tier: watch.baselineTier,
            id: watch.baselineId,
            at: watch.baselineAt,
          },
    last:
      watch.lastScore == null
        ? null
        : {
            score: watch.lastScore,
            grade: watch.lastGrade,
            tier: watch.lastTier,
            id: watch.lastId,
            at: watch.lastCheckedAt,
          },
    regressed: !!watch.regressed,
    // System axis (P2a): compliance monitoring state. Never includes the email.
    systemMonitoring: !!watch.system,
    system:
      watch.lastSystemScore == null
        ? null
        : {
            score: watch.lastSystemScore,
            tier: watch.lastSystemTier,
            at: watch.lastSystemAt,
            baseline:
              watch.baselineSystemScore == null
                ? null
                : {
                    score: watch.baselineSystemScore,
                    tier: watch.baselineSystemTier,
                  },
            drifted: !!watch.systemRegressed,
            drift: (watch.lastSystemDrift || []).map((d) => ({ id: d.id, message: d.message })),
          },
    history: (history || []).map((h) => ({
      score: h.score,
      grade: h.grade,
      tier: h.tier,
      at: h.createdAt,
      ...(h.sys ? { system: { score: h.sys.score, tier: h.sys.tier } } : {}),
    })),
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
const LISTING_TTL = 60 * 60 * 24 * 365; // 1 year

function listingMeta(record) {
  return {
    s: record.score,
    g: record.grade,
    tr: record.tier,
    id: record.id,
    t: (record.title || '').slice(0, 60),
    at: record.listedAt,
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
    updatedAt: new Date().toISOString(),
  };
  await kv.put(`l:${domain}`, JSON.stringify(record), {
    expirationTtl: LISTING_TTL,
    metadata: listingMeta(record),
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
  const sites = (res.keys || []).map((k) => {
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
      listedAt: m.at || null,
    };
  });
  return {
    sites,
    cursor: res.list_complete ? null : res.cursor || null,
    complete: !!res.list_complete,
  };
}

// Walk the directory (paginates internally), BOUNDED so a large catalogue can't
// turn a public page render into an unbounded KV scan / memory blowout. Stops at
// `max` listings (default 5000) — well above validation scale; revisit with a
// real index if the directory ever approaches it.
export async function listAllSites(kv, { max = 5000 } = {}) {
  const out = [];
  let cursor = null;
  do {
    const r = await listSites(kv, { limit: 1000, cursor });
    out.push(...r.sites);
    cursor = r.cursor;
  } while (cursor && out.length < max);
  return out.slice(0, max);
}

export { BADGE_TTL };
