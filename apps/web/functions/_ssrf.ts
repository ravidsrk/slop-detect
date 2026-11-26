// SSRF guard for the scanner.
//
// The scanner loads arbitrary user-supplied URLs in a real headless browser and
// returns reconstructed page content (title, h1, text, screenshot). Without a
// host allow/deny check that's a server-side request forgery primitive: a caller
// could point us at cloud metadata (169.254.169.254), loopback, or RFC-1918
// hosts and read internal responses back. We can't DNS-resolve before navigation
// in the Workers runtime, so we block by hostname shape: literal private/loopback
// IPs (v4 + v6) and obviously-internal names. Public hostnames pass through.
//
// validateScanUrl returns a normalized https URL string on success, or
// { error, status } to return verbatim to the caller.
import { withRetry, sleepUntilAbort } from './_retry.js';

const PRIVATE_HOSTNAMES = new Set([
  'localhost',
  'ip6-localhost',
  'ip6-loopback',
  'metadata.goog',
  'metadata.google.internal',
  'instance-data',
]);

function isPrivateIPv4(host) {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b, c] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (m.slice(1).some((o) => Number(o) > 255)) return false;
  return (
    a === 0 || // 0.0.0.0/8 "this network"
    a === 10 || // 10.0.0.0/8 private
    a === 127 || // 127.0.0.0/8 loopback
    (a === 169 && b === 254) || // 169.254.0.0/16 link-local (cloud metadata)
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 private
    (a === 192 && b === 0 && (c === 0 || c === 2)) || // 192.0.0.0/24 & 192.0.2.0/24 TEST-NET-1
    (a === 192 && b === 168) || // 192.168.0.0/16 private
    (a === 198 && (b === 18 || b === 19)) || // 198.18.0.0/15 benchmarking
    (a === 198 && b === 51 && c === 100) || // 198.51.100.0/24 TEST-NET-2
    (a === 203 && b === 0 && c === 113) || // 203.0.113.0/24 TEST-NET-3
    (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 CGNAT
    a >= 224 // 224.0.0.0/4 multicast + 240/4 reserved
  );
}

// Parse an IPv6 literal (with or without brackets, compressed ::, or trailing
// dotted IPv4) into 8 16-bit unsigned integers, or null if malformed.
function parseIPv6Groups(host) {
  let h = host.replace(/^\[/, '').replace(/\]$/, '').split('%')[0].toLowerCase();
  // Convert trailing dotted-decimal IPv4 (e.g. ::ffff:127.0.0.1) to two hex groups.
  const v4Tail = h.match(/^(.*:)(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4Tail) {
    const octs = v4Tail.slice(2).map(Number);
    if (octs.some((o) => o > 255)) return null;
    const hi = ((octs[0] << 8) | octs[1]).toString(16);
    const lo = ((octs[2] << 8) | octs[3]).toString(16);
    h = `${v4Tail[1]}${hi}:${lo}`;
  }
  const halves = h.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - (left.length + right.length);
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 0)) return null;
  const full = halves.length === 2 ? [...left, ...new Array(missing).fill('0'), ...right] : left;
  if (full.length !== 8) return null;
  const groups = [];
  for (const part of full) {
    if (!/^[0-9a-f]{1,4}$/.test(part)) return null;
    groups.push(parseInt(part, 16));
  }
  return groups;
}

function groupsToIPv4(hi, lo) {
  return `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
}

function isPrivateIPv6(host) {
  const g = parseIPv6Groups(host);
  if (!g) return true; // Fail closed on unparseable IPv6-shaped literal
  const allZeroPrefix6 =
    g[0] === 0 && g[1] === 0 && g[2] === 0 && g[3] === 0 && g[4] === 0 && g[5] === 0;
  // :: (unspecified) and ::1 (loopback)
  if (allZeroPrefix6 && g[6] === 0 && (g[7] === 0 || g[7] === 1)) return true;
  // fc00::/7 unique-local
  if ((g[0] & 0xfe00) === 0xfc00) return true;
  // fe80::/10 link-local
  if ((g[0] & 0xffc0) === 0xfe80) return true;
  // ff00::/8 multicast
  if ((g[0] & 0xff00) === 0xff00) return true;
  // 100::/64 discard-only
  if (g[0] === 0x0100 && g[1] === 0 && g[2] === 0 && g[3] === 0) return true;
  // ::/96 IPv4-compatible (including single-group [::100] = 0.0.1.0)
  if (allZeroPrefix6) return isPrivateIPv4(groupsToIPv4(g[6], g[7]));
  // ::ffff:0:0/96 IPv4-mapped
  if (g[0] === 0 && g[1] === 0 && g[2] === 0 && g[3] === 0 && g[4] === 0 && g[5] === 0xffff) {
    return isPrivateIPv4(groupsToIPv4(g[6], g[7]));
  }
  // ::ffff:0:0:0/96 SIIT IPv4-translated
  if (g[0] === 0 && g[1] === 0 && g[2] === 0 && g[3] === 0 && g[4] === 0xffff && g[5] === 0) {
    return isPrivateIPv4(groupsToIPv4(g[6], g[7]));
  }
  // 64:ff9b::/96 well-known NAT64 prefix
  if (g[0] === 0x0064 && g[1] === 0xff9b && g[2] === 0 && g[3] === 0 && g[4] === 0 && g[5] === 0) {
    return isPrivateIPv4(groupsToIPv4(g[6], g[7]));
  }
  // 64:ff9b:1::/48 local-use NAT64 prefix
  if (g[0] === 0x0064 && g[1] === 0xff9b && g[2] === 0x0001) return true;
  // 2002::/16 6to4 (embedded IPv4 in groups 1..2)
  if (g[0] === 0x2002) return isPrivateIPv4(groupsToIPv4(g[1], g[2]));
  // 2001:db8::/32 documentation prefix
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true;
  return false;
}

export function validateScanUrl(raw) {
  if (!raw || typeof raw !== 'string') return { error: 'url is required', status: 400 };
  let url = raw.trim();
  // Reject an explicit non-http(s) scheme outright (file:, data:, ftp:, gopher:…)
  // rather than blindly prepending https:// and producing a confusing host.
  // Allow bare `host:port` (e.g. `example.com:8080`) where `:` is followed by digits.
  const scheme = url.match(/^([a-z][a-z0-9+.-]*):(?!\d+(?:\/|$))/i);
  if (scheme && !/^https?$/i.test(scheme[1])) {
    return { error: 'Only http(s) URLs can be scanned', status: 400 };
  }
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { error: 'Invalid URL', status: 400 };
  }

  // Only http/https reach the browser. (new URL accepts file:, data:, etc.)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { error: 'Only http(s) URLs can be scanned', status: 400 };
  }

  // Strip any trailing dot(s): `localhost.`, `foo.internal.`, and
  // `svc.cluster.local.` are fully-qualified DNS names that resolve identically
  // to their dot-free form, but `new URL()` PRESERVES the root dot on names (it
  // only normalizes it away for IP literals). Without this, the exact-match set
  // and the `.endsWith('.internal'/'.local'/'.localhost')` suffix checks below
  // all miss the trailing-dot variant — an SSRF allow-list bypass to internal
  // services. Also hardens the IPv4 path if a runtime keeps the dot on a literal.
  const host = parsed.hostname.toLowerCase().replace(/\.+$/, '');
  const isIPv6Literal = host.includes(':') || /^\[.*\]$/.test(parsed.host);
  const isSingleLabel = !isIPv6Literal && !host.includes('.');
  const blocked =
    !host ||
    isSingleLabel ||
    PRIVATE_HOSTNAMES.has(host) ||
    host.endsWith('.localhost') ||
    host.endsWith('.internal') ||
    host.endsWith('.local') ||
    host.endsWith('.localdomain') ||
    host.endsWith('.home.arpa') ||
    host.endsWith('.lan') ||
    host.endsWith('.corp') ||
    isPrivateIPv4(host) ||
    (isIPv6Literal && isPrivateIPv6(host));

  if (blocked) {
    return {
      error: 'That host is not allowed (private, loopback, or internal address)',
      status: 400,
    };
  }

  return { url };
}

// Boolean form of validateScanUrl for per-hop redirect checks (SSRF). True only
// for a public, scannable http(s) URL.
export function isAllowedUrl(raw) {
  return !validateScanUrl(raw).error;
}

// Normalize a host for same-site comparison: lowercase, strip the trailing
// root dot and a leading `www.`. `apple.com` and `www.apple.com` are the same
// site; `example.com.` (FQDN form) is too.
export function normalizeSiteHost(host) {
  return String(host || '')
    .toLowerCase()
    .replace(/\.+$/, '')
    .replace(/^www\./, '');
}

function hostOf(urlOrHost) {
  try {
    return new URL(urlOrHost).hostname;
  } catch {
    return String(urlOrHost || '');
  }
}

// Same-site redirect check for browser navigation: the final host is the
// requested host, its www/apex twin, or a subdomain of it (or vice-versa).
// Ordinary apex→www and apex→app redirects are how the public web works and
// must not be refused as "private/internal"; a hop to an unrelated registrable
// domain is a different site than the caller asked to scan, so it still is.
// This is NOT the SSRF check — callers must also require isAllowedUrl(final),
// which is what blocks private/loopback/metadata destinations.
export function isSameSiteRedirect(requested, final) {
  const a = normalizeSiteHost(hostOf(requested));
  const b = normalizeSiteHost(hostOf(final));
  if (!a || !b) return false;
  return a === b || b.endsWith('.' + a) || a.endsWith('.' + b);
}

// Worker-side fetch with manual redirect following and per-hop SSRF re-checks.
// Mirrors packages/core/src/aeo.ts fetchWithTimeout so a public DESIGN.md URL
// cannot 302 to cloud metadata or RFC-1918. Returns null when blocked, timed
// out, or too many hops — callers treat that as "unreachable".
//
// Retry (T-26): one retry on network errors, timeouts, and 429/5xx. All
// attempts share the single deadline above, so timeoutMs stays a TOTAL
// budget: retryIf fails fast once the controller aborts, and the backoff
// sleep itself resolves early on abort (sleepUntilAbort) so a sleep that
// starts just before the deadline can't run ~200ms past it and launch a
// doomed fetch. Blocks, other statuses, and exhausted hops return normally
// and are never retried. A retry restarts the redirect chain from the
// original URL: safe for idempotent callers (today: the GET-only DESIGN.md
// fetch in scan.ts).
export async function fetchAllowedUrl(
  url,
  init = {},
  { timeoutMs = 8000, maxHops = 6, attempts = 2, sleep, jitter }: any = {}
) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await withRetry(
      async () => {
        let current = String(url);
        for (let hop = 0; hop < maxHops; hop++) {
          if (!isAllowedUrl(current)) return null;
          const res = await fetch(current, {
            ...init,
            signal: controller.signal,
            redirect: 'manual',
          });
          if (res.status >= 300 && res.status < 400) {
            const loc = res.headers.get('location');
            if (!loc) return res;
            current = new URL(loc, current).toString();
            continue;
          }
          if (res.status === 429 || res.status >= 500) {
            throw new Error(`fetchAllowedUrl retryable status ${res.status}`);
          }
          return res;
        }
        return null;
      },
      {
        attempts,
        baseMs: 200,
        sleep: sleep ?? ((ms) => sleepUntilAbort(ms, controller.signal)),
        jitter,
        retryIf: () => !controller.signal.aborted,
      }
    );
  } catch (_) {
    return null;
  } finally {
    clearTimeout(t);
  }
}
