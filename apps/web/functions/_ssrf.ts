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
const PRIVATE_HOSTNAMES = new Set(['localhost', 'ip6-localhost', 'ip6-loopback']);

function isPrivateIPv4(host) {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (m.slice(1).some((o) => Number(o) > 255)) return false;
  return (
    a === 0 || // 0.0.0.0/8 "this network"
    a === 10 || // 10.0.0.0/8 private
    a === 127 || // 127.0.0.0/8 loopback
    (a === 169 && b === 254) || // 169.254.0.0/16 link-local (cloud metadata)
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 private
    (a === 192 && b === 168) || // 192.168.0.0/16 private
    (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 CGNAT
    a >= 224 // 224.0.0.0/4 multicast + 240/4 reserved
  );
}

function isPrivateIPv6(host) {
  // URL hostnames keep IPv6 in brackets for the authority but `.hostname`
  // strips them; accept both. Lowercase, drop any zone id.
  let h = host.replace(/^\[/, '').replace(/\]$/, '').split('%')[0].toLowerCase();
  if (h === '::1' || h === '::') return true; // loopback / unspecified
  if (h.startsWith('fc') || h.startsWith('fd')) return true; // fc00::/7 unique-local
  if (h.startsWith('fe8') || h.startsWith('fe9') || h.startsWith('fea') || h.startsWith('feb'))
    return true; // fe80::/10 link-local
  // IPv4-mapped (::ffff:a.b.c.d) and the deprecated IPv4-compatible (::a.b.c.d,
  // ::/96) forms — re-check the embedded v4 against the IPv4 rules. CRITICAL:
  // `new URL()` HEX-normalizes the embedded address (`[::ffff:169.254.169.254]`
  // → `[::ffff:a9fe:a9fe]`), so a dotted-decimal-only check is bypassed. Decode
  // the trailing 32 bits from hex words too.
  const v4 = embeddedIPv4(h);
  if (v4) return isPrivateIPv4(v4);
  return false;
}

// Decode the IPv4 embedded in an IPv4-mapped/compatible IPv6 address, handling
// both the dotted form (`::ffff:1.2.3.4`) and the hex form WHATWG `new URL()`
// produces (`::ffff:0102:0304`). Returns "a.b.c.d" or null.
function embeddedIPv4(h) {
  let m = h.match(/^::(?:ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (m) return m[1];
  m = h.match(/^::(?:ffff:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (m) {
    const hi = parseInt(m[1], 16);
    const lo = parseInt(m[2], 16);
    return `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
  }
  return null;
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
  const blocked =
    PRIVATE_HOSTNAMES.has(host) ||
    host.endsWith('.localhost') ||
    host.endsWith('.internal') ||
    host.endsWith('.local') ||
    isPrivateIPv4(host) ||
    ((host.includes(':') || /^\[.*\]$/.test(parsed.host)) && isPrivateIPv6(host));

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

// Worker-side fetch with manual redirect following and per-hop SSRF re-checks.
// Mirrors packages/core/src/aeo.ts fetchWithTimeout so a public DESIGN.md URL
// cannot 302 to cloud metadata or RFC-1918. Returns null when blocked, timed
// out, or too many hops — callers treat that as "unreachable".
export async function fetchAllowedUrl(url, init = {}, { timeoutMs = 8000, maxHops = 6 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
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
      return res;
    }
    return null;
  } catch (_) {
    return null;
  } finally {
    clearTimeout(t);
  }
}
