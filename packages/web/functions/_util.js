// Small, dependency-free helpers shared across the Pages Functions: id
// generation, domain extraction/normalization, email validation, tier ranking.
//
// This is the leaf of the shared-module graph — it imports nothing else in the
// package, so _data.js / _render.js / _ssrf.js can all depend on it without
// risking an import cycle through the _shared.js barrel.

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
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return String(url || '')
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];
  }
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
  d = d
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\.$/, '');
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

// Slop score is 0–100, lower is better. Tier bands rank Clean < Mild < Heavy so
// a regression check can compare them. Unknown tiers fall in the middle.
const TIER_RANK = { Clean: 0, Mild: 1, Heavy: 2 };
export function tierRank(tier) {
  return TIER_RANK[tier] != null ? TIER_RANK[tier] : 1;
}
