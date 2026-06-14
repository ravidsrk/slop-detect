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
  try {
    parsed = new URL(url);
  } catch {
    return { error: 'Invalid URL', status: 400 };
  }

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
