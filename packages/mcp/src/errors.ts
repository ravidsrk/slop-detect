// Local-mode scan errors come straight from Playwright, with a multi-line
// "Call log" an agent can't act on. Map the common ones to one line that says
// what failed and what to do next (#360).

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function describeScanError(err: unknown, url: string): string {
  const raw = err && (err as Error).message ? String((err as Error).message) : String(err);
  // Already written for an agent (missing optional package, file:// AEO, …).
  if (raw.startsWith('Local scanning needs') || raw.startsWith('check_aeo needs')) return raw;

  const firstLine = raw
    .split('\n')[0]
    .replace(/^page\.goto:\s*/, '')
    .trim();
  let origin = url;
  let host = url;
  let port = '';
  try {
    const parsed = new URL(url);
    origin = parsed.origin === 'null' ? url : parsed.origin;
    host = parsed.hostname;
    port = parsed.port;
  } catch {
    /* keep the raw url */
  }

  const net = firstLine.match(/net::(ERR_[A-Z0-9_]+)/);
  if (net) {
    const code = net[1];
    if (code === 'ERR_CONNECTION_REFUSED') {
      return `Nothing is listening at ${origin} (connection refused). Start the dev server, or fix the port, then scan again.`;
    }
    if (code === 'ERR_NAME_NOT_RESOLVED') {
      return `The host ${host} does not resolve (DNS lookup failed). Check the URL.`;
    }
    if (code === 'ERR_UNSAFE_PORT') {
      return `Chromium refuses to load port ${port || '(unknown)'} because browsers treat it as unsafe. Serve the page on another port, such as 3000 or 8080.`;
    }
    if (code === 'ERR_CONNECTION_TIMED_OUT' || code === 'ERR_TIMED_OUT') {
      return `${origin} did not respond (timed out). Check that the server is up and reachable from this machine.`;
    }
    if (code === 'ERR_FILE_NOT_FOUND') {
      return `File not found: ${url}. Check the file:// path.`;
    }
    if (code === 'ERR_ABORTED') {
      return `Loading ${url} was aborted (the server may have sent a download or closed the connection).`;
    }
    if (code.startsWith('ERR_CERT') || code.startsWith('ERR_SSL')) {
      return `TLS error loading ${origin} (${code}). Fix the certificate, or use http:// for a local dev server.`;
    }
    return `Chromium could not load ${url} (${code}).`;
  }
  if (/Cannot navigate to invalid URL/i.test(raw)) {
    return `Not a valid URL: "${url}". Pass an absolute http(s):// URL or a file:// path.`;
  }
  if (/Timeout \d+ms exceeded|TimeoutError/i.test(raw)) {
    return `${url} did not finish loading in time. Check that the page loads in a browser, then scan again.`;
  }
  if (/Executable doesn't exist|browserType\.launch|playwright install/i.test(raw)) {
    return `Chromium for Playwright isn't installed or can't start here. Run: npx playwright install --with-deps chromium. (${clip(firstLine, 160)})`;
  }
  return clip(firstLine, 240);
}
