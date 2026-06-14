// AEO (Answer-Engine-Optimization) axis — "can AI engines actually read & cite
// this page?". This is the network-readability complement to the design/copy
// slop axes: a page can look perfectly human-written and STILL be invisible to
// ChatGPT/Claude/Perplexity because it blocks their crawlers, serves JS soup, or
// publishes no machine-readable twin.
//
// The axis is graded so a plain, well-behaved marketing site can reach the top
// tier without adopting any specific tool: the markdown-twin / llms.txt checks
// are RECOMMENDED bonuses, while "AI crawlers aren't blocked" and "the page is
// indexable" are the REQUIRED fundamentals. The AI-bot registry and weighted
// conformance model are adapted from upstream open-source AEO work — see NOTICE
// for full attribution.
//
// Pure JS, zero deps. `fetch` is injectable so this runs identically in Node
// (CLI), a Cloudflare Worker (web), or a test. The CALLER is responsible for
// SSRF validation before passing a URL in (web uses validateScanUrl()).

// ── AI Agent Registry ────────────────────────────────────────────────────────
// `purpose` distinguishes training crawlers from on-demand search/answer
// fetchers — the latter are the ones that decide whether your page gets *cited*
// in an AI answer. Registry derived from upstream open-source AEO work
// (see NOTICE).
export const AI_BOTS = [
  {
    name: 'GPTBot',
    uaPattern: 'GPTBot',
    vendor: 'OpenAI',
    purpose: 'training',
    docsUrl: 'https://platform.openai.com/docs/gptbot',
  },
  {
    name: 'ChatGPT-User',
    uaPattern: 'ChatGPT-User',
    vendor: 'OpenAI',
    purpose: 'user-action',
    docsUrl: 'https://platform.openai.com/docs/bots',
  },
  {
    name: 'OAI-SearchBot',
    uaPattern: 'OAI-SearchBot',
    vendor: 'OpenAI',
    purpose: 'search',
    docsUrl: 'https://platform.openai.com/docs/bots',
  },
  {
    name: 'ClaudeBot',
    uaPattern: 'ClaudeBot',
    vendor: 'Anthropic',
    purpose: 'training',
    docsUrl: 'https://support.anthropic.com/en/articles/8896518',
  },
  { name: 'anthropic-ai', uaPattern: 'anthropic-ai', vendor: 'Anthropic', purpose: 'training' },
  { name: 'Claude-Web', uaPattern: 'Claude-Web', vendor: 'Anthropic', purpose: 'user-action' },
  {
    name: 'Claude-SearchBot',
    uaPattern: 'Claude-SearchBot',
    vendor: 'Anthropic',
    purpose: 'search',
    docsUrl: 'https://support.anthropic.com/en/articles/8896518',
  },
  {
    name: 'Claude-User',
    uaPattern: 'Claude-User',
    vendor: 'Anthropic',
    purpose: 'user-action',
    docsUrl: 'https://support.anthropic.com/en/articles/8896518',
  },
  {
    name: 'PerplexityBot',
    uaPattern: 'PerplexityBot',
    vendor: 'Perplexity',
    purpose: 'search',
    docsUrl: 'https://docs.perplexity.ai/guides/bots',
  },
  {
    name: 'Perplexity-User',
    uaPattern: 'Perplexity-User',
    vendor: 'Perplexity',
    purpose: 'user-action',
    docsUrl: 'https://docs.perplexity.ai/guides/bots',
  },
  {
    name: 'Google-Extended',
    uaPattern: 'Google-Extended',
    vendor: 'Google',
    purpose: 'training',
    docsUrl: 'https://developers.google.com/search/docs/crawling-indexing/google-extended',
  },
  { name: 'GoogleOther', uaPattern: 'GoogleOther', vendor: 'Google', purpose: 'training' },
  {
    name: 'Applebot-Extended',
    uaPattern: 'Applebot-Extended',
    vendor: 'Apple',
    purpose: 'training',
    docsUrl: 'https://support.apple.com/en-us/119829',
  },
  { name: 'cohere-ai', uaPattern: 'cohere-ai', vendor: 'Cohere', purpose: 'training' },
  {
    name: 'CCBot',
    uaPattern: 'CCBot',
    vendor: 'Common Crawl',
    purpose: 'training',
    docsUrl: 'https://commoncrawl.org/ccbot',
  },
  { name: 'Bytespider', uaPattern: 'Bytespider', vendor: 'ByteDance', purpose: 'training' },
  { name: 'DeepSeekBot', uaPattern: 'DeepSeekBot', vendor: 'DeepSeek', purpose: 'training' },
  {
    name: 'Amazonbot',
    uaPattern: 'Amazonbot',
    vendor: 'Amazon',
    purpose: 'training',
    docsUrl: 'https://developer.amazon.com/amazonbot',
  },
  { name: 'YouBot', uaPattern: 'YouBot', vendor: 'You.com', purpose: 'search' },
  { name: 'Diffbot', uaPattern: 'Diffbot', vendor: 'Diffbot', purpose: 'training' },
  { name: 'ImagesiftBot', uaPattern: 'ImagesiftBot', vendor: 'ImageSift', purpose: 'training' },
  { name: 'Omgilibot', uaPattern: 'Omgilibot', vendor: 'Webz.io', purpose: 'training' },
  { name: 'DuckAssistBot', uaPattern: 'DuckAssistBot', vendor: 'DuckDuckGo', purpose: 'search' },
  {
    name: 'Meta-ExternalAgent',
    uaPattern: 'meta-externalagent',
    vendor: 'Meta',
    purpose: 'training',
  },
  {
    name: 'Meta-ExternalFetcher',
    uaPattern: 'meta-externalfetcher',
    vendor: 'Meta',
    purpose: 'user-action',
  },
  {
    name: 'MistralAI-User',
    uaPattern: 'MistralAI-User',
    vendor: 'Mistral',
    purpose: 'user-action',
  },
  { name: 'AI2Bot', uaPattern: 'AI2Bot', vendor: 'Allen Institute', purpose: 'training' },
];

function uaMatches(ua, pattern) {
  if (typeof pattern === 'string') return ua.toLowerCase().includes(pattern.toLowerCase());
  return pattern.test(ua);
}

// Identify whether a User-Agent string belongs to a known AI crawler.
export function detectAIBot(userAgent) {
  if (!userAgent) return { isBot: false, name: null, vendor: null, purpose: null };
  for (const entry of AI_BOTS) {
    if (uaMatches(userAgent, entry.uaPattern)) {
      return { isBot: true, name: entry.name, vendor: entry.vendor, purpose: entry.purpose };
    }
  }
  return { isBot: false, name: null, vendor: null, purpose: null };
}

// ── Check catalogue ──────────────────────────────────────────────────────────
// Weighted like the slop axes. `severity: required` checks are the fundamentals
// every site should pass; `recommended` are the markdown-twin/llms.txt bonuses
// that push a site from "readable" to "optimised". Total weight = 100.
export const AEO_CHECKS = [
  { id: 'html.reachable', weight: 10, severity: 'required', label: 'Page is reachable (HTML 2xx)' },
  {
    id: 'bot.notBlocked',
    weight: 25,
    severity: 'required',
    label: 'AI crawlers are not blocked (GPTBot gets 2xx)',
  },
  {
    id: 'robots.aiAllowed',
    weight: 20,
    severity: 'required',
    label: 'robots.txt does not Disallow AI crawlers',
  },
  {
    id: 'html.indexable',
    weight: 15,
    severity: 'required',
    label: 'Page is indexable (no noindex)',
  },
  { id: 'md.twin', weight: 10, severity: 'recommended', label: 'Markdown twin served at <url>.md' },
  {
    id: 'html.linkAlternate',
    weight: 8,
    severity: 'recommended',
    label: 'HTML advertises the markdown twin (Link rel=alternate)',
  },
  {
    id: 'site.llmsTxt',
    weight: 7,
    severity: 'recommended',
    label: '/llms.txt published at the site root',
  },
  {
    id: 'html.vary',
    weight: 5,
    severity: 'recommended',
    label: 'HTML sends Vary: Accept (content-negotiation aware)',
  },
];

const DEFAULT_UA = 'SlopDetector-AEO/1.0 (+https://slop-detect.com)';
const BOT_UA = 'Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)';

function pickCheck(id) {
  return AEO_CHECKS.find((c) => c.id === id);
}

// Read a response body with a hard byte cap so a hostile/huge target page can't
// exhaust memory (AEO only inspects <head>/meta/robots-ish prefixes). Streams and
// stops at the cap rather than buffering the whole body via res.text().
const MAX_HTML_BYTES = 2 * 1024 * 1024; // 2 MB
async function readCapped(res, maxBytes = MAX_HTML_BYTES) {
  if (!res.body || typeof res.body.getReader !== 'function') {
    const t = await res.text();
    return t.length > maxBytes ? t.slice(0, maxBytes) : t;
  }
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
    if (total >= maxBytes) {
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
      break;
    }
  }
  const merged = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    merged.set(c, off);
    off += c.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(merged.subarray(0, maxBytes));
}

async function fetchWithTimeout(url, init, timeoutMs, fetchImpl, isUrlAllowed) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // SSRF: when the caller supplies an allow-check, follow redirects MANUALLY
    // and re-validate every hop's Location. The default redirect:'follow' would
    // happily chase a public URL that 302s to an internal host (cloud metadata,
    // RFC-1918), defeating a one-shot pre-flight check. Without a check
    // (Node/CLI use), keep the simple auto-follow.
    if (typeof isUrlAllowed !== 'function') {
      return await fetchImpl(url, { ...init, signal: controller.signal, redirect: 'follow' });
    }
    let current = String(url);
    for (let hop = 0; hop < 6; hop++) {
      if (!isUrlAllowed(current)) {
        const e: any = new Error('blocked: redirect to a disallowed host');
        e.code = 'ssrf_blocked';
        throw e;
      }
      const res = await fetchImpl(current, {
        ...init,
        signal: controller.signal,
        redirect: 'manual',
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        current = new URL(res.headers.get('location'), current).toString();
        continue;
      }
      return res;
    }
    const e: any = new Error('blocked: too many redirects');
    e.code = 'too_many_redirects';
    throw e;
  } finally {
    clearTimeout(t);
  }
}

// Map a URL to its conventional markdown twin: /a/b → /a/b.md, / → /index.md.
export function toMarkdownUrl(input) {
  const u = new URL(input);
  let p = u.pathname.replace(/\/+$/, '');
  if (p.endsWith('.md')) return u.toString();
  u.pathname = p === '' ? '/index.md' : `${p}.md`;
  return u.toString();
}

// Parse robots.txt and decide whether ANY known AI bot is disallowed from the
// page path. Honors the wildcard (*) group too — a blanket `Disallow: /` under
// `User-agent: *` blocks AI crawlers just as effectively as naming them.
export function aiBotsBlockedByRobots(robotsTxt, pathname) {
  if (!robotsTxt) return { blocked: false, agents: [] };
  const path = pathname || '/';
  const lines = robotsTxt.split(/\r?\n/);
  // Build agent → [disallow rules] groups.
  const groups = [];
  let current = null;
  for (const raw of lines) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (field === 'user-agent') {
      if (current && current.hasRules) {
        groups.push(current);
        current = null;
      }
      if (!current) current = { agents: [], disallow: [], hasRules: false };
      current.agents.push(value.toLowerCase());
    } else if (field === 'disallow' && current) {
      current.hasRules = true;
      current.disallow.push(value);
    } else if (field === 'allow' && current) {
      current.hasRules = true;
    }
  }
  if (current) groups.push(current);

  const aiNames = AI_BOTS.map((b) => b.name.toLowerCase());
  const blockedAgents = [];
  for (const g of groups) {
    const targetsAI = g.agents.some((a) => a === '*' || aiNames.includes(a));
    if (!targetsAI) continue;
    const blocksPath = g.disallow.some((d) => {
      if (d === '') return false; // empty Disallow = allow all
      return path.startsWith(d) || d === '/';
    });
    if (blocksPath) {
      for (const a of g.agents) {
        if (a === '*' || aiNames.includes(a)) blockedAgents.push(a);
      }
    }
  }
  return { blocked: blockedAgents.length > 0, agents: [...new Set(blockedAgents)] };
}

function htmlHasNoindex(headers, body) {
  const xRobots = (headers.get('x-robots-tag') || '').toLowerCase();
  if (xRobots.includes('noindex')) return true;
  // <meta name="robots" content="noindex"> in the first chunk of HTML.
  const m = body.slice(0, 50_000).match(/<meta[^>]+name=["']robots["'][^>]*>/i);
  if (m && /noindex/i.test(m[0])) return true;
  return false;
}

function htmlAdvertisesTwin(headers, body) {
  const link = headers.get('link') || '';
  if (/rel=["']?alternate["']?/i.test(link) && /type=["']?text\/markdown["']?/i.test(link))
    return true;
  // Also accept an in-document <link rel="alternate" type="text/markdown">.
  const head = body.slice(0, 50_000);
  const m = head.match(/<link[^>]+rel=["']alternate["'][^>]*>/gi) || [];
  return m.some((tag) => /text\/markdown/i.test(tag));
}

function tierFor(ratio) {
  if (ratio >= 0.8) return 'AI-Ready';
  if (ratio >= 0.5) return 'Partial';
  return 'Invisible';
}

function result(check, passed, message) {
  return {
    id: check.id,
    label: check.label,
    severity: check.severity,
    weight: check.weight,
    passed,
    message,
  };
}

// Run the AEO axis against a live URL. Returns a report shaped like the slop
// scan (score/maxScore/tier/passed/failed) so the CLI/web/mcp render it the same
// way. `opts.fetchImpl` defaults to global fetch; `opts.timeoutMs` per request.
export async function runAeoChecks(
  input,
  opts: {
    fetchImpl?: typeof fetch;
    userAgent?: string;
    timeoutMs?: number;
    isUrlAllowed?: (url: string) => boolean;
  } = {}
) {
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const userAgent = opts.userAgent || DEFAULT_UA;
  const timeoutMs = opts.timeoutMs || 10_000;
  // Optional SSRF allow-check (the web layer passes one built on validateScanUrl)
  // so redirects can't escape to internal hosts. Local/CLI use omits it.
  const isUrlAllowed = opts.isUrlAllowed;
  const start = Date.now();
  const url = new URL(input);
  const checks = [];

  // 1. HTML reachable (as a normal browser).
  let html = null,
    htmlBody = '',
    htmlErr = null;
  try {
    html = await fetchWithTimeout(
      url.toString(),
      {
        headers: { 'User-Agent': userAgent, Accept: 'text/html,application/xhtml+xml,*/*;q=0.8' },
      },
      timeoutMs,
      fetchImpl,
      isUrlAllowed
    );
    htmlBody = await readCapped(html);
  } catch (e) {
    htmlErr = e instanceof Error ? e.message : String(e);
  }
  const htmlOk = !!(html && html.ok);
  checks.push(
    result(
      pickCheck('html.reachable'),
      htmlOk,
      htmlErr || `status ${html ? html.status : 'no response'}`
    )
  );

  // 2. AI crawler not blocked — fetch as GPTBot and require a 2xx (catches WAFs,
  //    Cloudflare bot-fight, and 403/429 cloaking that hides you from AI search).
  let bot = null,
    botErr = null;
  try {
    bot = await fetchWithTimeout(
      url.toString(),
      {
        headers: { 'User-Agent': BOT_UA, Accept: '*/*' },
      },
      timeoutMs,
      fetchImpl,
      isUrlAllowed
    );
    await bot.text();
  } catch (e) {
    botErr = e instanceof Error ? e.message : String(e);
  }
  const botOk = !!(bot && bot.ok);
  checks.push(
    result(
      pickCheck('bot.notBlocked'),
      botOk,
      botOk
        ? `GPTBot received ${bot.status}`
        : botErr || `GPTBot received ${bot ? bot.status : 'no response'} — likely blocked`
    )
  );

  // 3. robots.txt allows AI bots.
  let robotsTxt = '',
    robotsFetched = false;
  try {
    const r = await fetchWithTimeout(
      new URL('/robots.txt', url).toString(),
      {
        headers: { 'User-Agent': userAgent },
      },
      timeoutMs,
      fetchImpl,
      isUrlAllowed
    );
    if (r.ok) {
      robotsTxt = await r.text();
      robotsFetched = true;
    }
  } catch {
    /* no robots.txt = allow all */
  }
  const robotsVerdict = aiBotsBlockedByRobots(robotsTxt, url.pathname);
  checks.push(
    result(
      pickCheck('robots.aiAllowed'),
      !robotsVerdict.blocked,
      robotsVerdict.blocked
        ? `robots.txt disallows: ${robotsVerdict.agents.join(', ')}`
        : robotsFetched
          ? 'robots.txt does not block AI crawlers'
          : 'no robots.txt (allows all)'
    )
  );

  // 4. Indexable (no noindex via header or meta).
  if (htmlOk) {
    const noindex = htmlHasNoindex(html.headers, htmlBody);
    checks.push(
      result(
        pickCheck('html.indexable'),
        !noindex,
        noindex ? 'page sets noindex (AI engines skip noindex pages)' : 'no noindex directive'
      )
    );
  } else {
    checks.push(result(pickCheck('html.indexable'), false, 'HTML not reachable — cannot verify'));
  }

  // 5. Markdown twin at <url>.md (RECOMMENDED — content-negotiation convention).
  const mdUrl = toMarkdownUrl(url.toString());
  let md = null;
  try {
    md = await fetchWithTimeout(
      mdUrl,
      {
        headers: { Accept: 'text/markdown', 'User-Agent': userAgent },
      },
      timeoutMs,
      fetchImpl,
      isUrlAllowed
    );
    await md.text();
  } catch {
    /* no twin */
  }
  const mdCt = ((md && md.headers.get('content-type')) || '').toLowerCase();
  const mdOk = !!(md && md.ok && mdCt.startsWith('text/markdown'));
  checks.push(
    result(
      pickCheck('md.twin'),
      mdOk,
      mdOk
        ? `markdown twin at ${mdUrl}`
        : md
          ? `no markdown twin (${md.status}, ${mdCt || 'no content-type'})`
          : 'no markdown twin'
    )
  );

  // 6. HTML advertises the twin via Link rel=alternate (RECOMMENDED).
  if (htmlOk) {
    const adv = htmlAdvertisesTwin(html.headers, htmlBody);
    checks.push(
      result(
        pickCheck('html.linkAlternate'),
        adv,
        adv ? 'Link rel=alternate type=text/markdown present' : 'no markdown alternate advertised'
      )
    );
  } else {
    checks.push(result(pickCheck('html.linkAlternate'), false, 'HTML not reachable'));
  }

  // 7. /llms.txt published (RECOMMENDED).
  let llms = null;
  try {
    llms = await fetchWithTimeout(
      new URL('/llms.txt', url).toString(),
      {
        headers: { 'User-Agent': userAgent },
      },
      timeoutMs,
      fetchImpl,
      isUrlAllowed
    );
    await llms.text();
  } catch {
    /* none */
  }
  const llmsOk = !!(llms && llms.ok);
  checks.push(
    result(
      pickCheck('site.llmsTxt'),
      llmsOk,
      llmsOk ? '/llms.txt found' : 'no /llms.txt at site root'
    )
  );

  // 8. HTML Vary: Accept (RECOMMENDED — signals content-negotiation awareness).
  if (htmlOk) {
    const vary = (html.headers.get('vary') || '').split(',').map((s) => s.trim().toLowerCase());
    const ok = vary.includes('accept');
    checks.push(
      result(
        pickCheck('html.vary'),
        ok,
        ok ? 'Vary: Accept present' : 'Vary does not include Accept'
      )
    );
  } else {
    checks.push(result(pickCheck('html.vary'), false, 'HTML not reachable'));
  }

  const passed = checks.filter((c) => c.passed);
  const failed = checks.filter((c) => !c.passed);
  const score = passed.reduce((s, c) => s + c.weight, 0);
  const maxScore = checks.reduce((s, c) => s + c.weight, 0);
  const ratio = maxScore ? score / maxScore : 0;

  return {
    axis: 'aeo',
    url: url.toString(),
    mdUrl,
    score,
    maxScore,
    ratio,
    tier: tierFor(ratio),
    requiredFailed: failed.filter((c) => c.severity === 'required').length,
    recommendedFailed: failed.filter((c) => c.severity === 'recommended').length,
    passed,
    failed,
    checks,
    durationMs: Date.now() - start,
  };
}
