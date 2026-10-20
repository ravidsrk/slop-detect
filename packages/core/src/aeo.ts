// AEO (Answer-Engine-Optimization) axis — technical eligibility for AI search
// and agent retrieval ("can search and user-action crawlers fetch, parse, and
// quote this page?").
//
// Pure JS, zero deps. `fetch` is injectable so this runs identically in Node
// (CLI), a Cloudflare Worker (web), or a test.

export const AEO_SCANNER_USER_AGENT = 'SlopDetector-AEO/1.0 (+https://slop-detect.com/bot)';

export interface AIBotEntry {
  name: string;
  uaPattern: string | RegExp;
  vendor: string;
  purpose: 'search' | 'user-action' | 'training';
  verifiedAt: string;
  docsUrl?: string;
  inheritsFrom?: string;
  robotsOnly?: boolean;
  legacy?: boolean;
}

// ── Purpose-Tiered 2026.10 AI & Search Bot Registry (FIX-14 #234) ────────────
export const AI_BOT_REGISTRY: AIBotEntry[] = [
  // Search & citation crawlers (scored in robots.searchAllowed)
  {
    name: 'OAI-SearchBot',
    uaPattern: 'OAI-SearchBot',
    vendor: 'OpenAI',
    purpose: 'search',
    verifiedAt: '2026-10-01',
    docsUrl: 'https://platform.openai.com/docs/bots',
  },
  {
    name: 'Claude-SearchBot',
    uaPattern: 'Claude-SearchBot',
    vendor: 'Anthropic',
    purpose: 'search',
    verifiedAt: '2026-10-01',
    docsUrl: 'https://support.anthropic.com/en/articles/8896518',
  },
  {
    name: 'PerplexityBot',
    uaPattern: 'PerplexityBot',
    vendor: 'Perplexity',
    purpose: 'search',
    verifiedAt: '2026-10-01',
    docsUrl: 'https://docs.perplexity.ai/guides/bots',
  },
  {
    name: 'Googlebot',
    uaPattern: 'Googlebot',
    vendor: 'Google',
    purpose: 'search',
    verifiedAt: '2026-10-01',
    docsUrl: 'https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers',
  },
  {
    name: 'bingbot',
    uaPattern: 'bingbot',
    vendor: 'Microsoft',
    purpose: 'search',
    verifiedAt: '2026-10-01',
    docsUrl: 'https://www.bing.com/webmasters/help/which-crawlers-does-bing-use-8c184ec0',
  },
  {
    name: 'Applebot',
    uaPattern: 'Applebot',
    vendor: 'Apple',
    purpose: 'search',
    verifiedAt: '2026-10-01',
    inheritsFrom: 'Googlebot',
    docsUrl: 'https://support.apple.com/en-us/119829',
  },
  {
    name: 'DuckAssistBot',
    uaPattern: 'DuckAssistBot',
    vendor: 'DuckDuckGo',
    purpose: 'search',
    verifiedAt: '2026-10-01',
  },
  {
    name: 'YouBot',
    uaPattern: 'YouBot',
    vendor: 'You.com',
    purpose: 'search',
    verifiedAt: '2026-10-01',
  },

  // User-triggered / agent fetchers (informational)
  {
    name: 'ChatGPT-User',
    uaPattern: 'ChatGPT-User',
    vendor: 'OpenAI',
    purpose: 'user-action',
    verifiedAt: '2026-10-01',
    docsUrl: 'https://platform.openai.com/docs/bots',
  },
  {
    name: 'Claude-User',
    uaPattern: 'Claude-User',
    vendor: 'Anthropic',
    purpose: 'user-action',
    verifiedAt: '2026-10-01',
    docsUrl: 'https://support.anthropic.com/en/articles/8896518',
  },
  {
    name: 'Perplexity-User',
    uaPattern: 'Perplexity-User',
    vendor: 'Perplexity',
    purpose: 'user-action',
    verifiedAt: '2026-10-01',
    docsUrl: 'https://docs.perplexity.ai/guides/bots',
  },
  {
    name: 'Meta-ExternalFetcher',
    uaPattern: 'meta-externalfetcher',
    vendor: 'Meta',
    purpose: 'user-action',
    verifiedAt: '2026-10-01',
  },
  {
    name: 'MistralAI-User',
    uaPattern: 'MistralAI-User',
    vendor: 'Mistral',
    purpose: 'user-action',
    verifiedAt: '2026-10-01',
  },

  // Training & corpus crawlers (informational, weight 0 — opting out of training is never penalized)
  {
    name: 'GPTBot',
    uaPattern: 'GPTBot',
    vendor: 'OpenAI',
    purpose: 'training',
    verifiedAt: '2026-10-01',
    docsUrl: 'https://platform.openai.com/docs/gptbot',
  },
  {
    name: 'ClaudeBot',
    uaPattern: 'ClaudeBot',
    vendor: 'Anthropic',
    purpose: 'training',
    verifiedAt: '2026-10-01',
    docsUrl: 'https://support.anthropic.com/en/articles/8896518',
  },
  {
    name: 'Google-Extended',
    uaPattern: 'Google-Extended',
    vendor: 'Google',
    purpose: 'training',
    verifiedAt: '2026-10-01',
    robotsOnly: true,
    docsUrl: 'https://developers.google.com/search/docs/crawling-indexing/google-extended',
  },
  {
    name: 'Applebot-Extended',
    uaPattern: 'Applebot-Extended',
    vendor: 'Apple',
    purpose: 'training',
    verifiedAt: '2026-10-01',
    robotsOnly: true,
    docsUrl: 'https://support.apple.com/en-us/119829',
  },
  {
    name: 'GoogleOther',
    uaPattern: 'GoogleOther',
    vendor: 'Google',
    purpose: 'training',
    verifiedAt: '2026-10-01',
  },
  {
    name: 'CCBot',
    uaPattern: 'CCBot',
    vendor: 'Common Crawl',
    purpose: 'training',
    verifiedAt: '2026-10-01',
    docsUrl: 'https://commoncrawl.org/ccbot',
  },
  {
    name: 'Bytespider',
    uaPattern: 'Bytespider',
    vendor: 'ByteDance',
    purpose: 'training',
    verifiedAt: '2026-10-01',
  },
  {
    name: 'DeepSeekBot',
    uaPattern: 'DeepSeekBot',
    vendor: 'DeepSeek',
    purpose: 'training',
    verifiedAt: '2026-10-01',
  },
  {
    name: 'Amazonbot',
    uaPattern: 'Amazonbot',
    vendor: 'Amazon',
    purpose: 'training',
    verifiedAt: '2026-10-01',
    docsUrl: 'https://developer.amazon.com/amazonbot',
  },
  {
    name: 'Meta-ExternalAgent',
    uaPattern: 'meta-externalagent',
    vendor: 'Meta',
    purpose: 'training',
    verifiedAt: '2026-10-01',
  },
  {
    name: 'cohere-ai',
    uaPattern: 'cohere-ai',
    vendor: 'Cohere',
    purpose: 'training',
    verifiedAt: '2026-10-01',
  },
  {
    name: 'AI2Bot',
    uaPattern: 'AI2Bot',
    vendor: 'Allen Institute',
    purpose: 'training',
    verifiedAt: '2026-10-01',
  },
  {
    name: 'Diffbot',
    uaPattern: 'Diffbot',
    vendor: 'Diffbot',
    purpose: 'training',
    verifiedAt: '2026-10-01',
  },
  {
    name: 'ImagesiftBot',
    uaPattern: 'ImagesiftBot',
    vendor: 'ImageSift',
    purpose: 'training',
    verifiedAt: '2026-10-01',
  },
  {
    name: 'Omgilibot',
    uaPattern: 'Omgilibot',
    vendor: 'Webz.io',
    purpose: 'training',
    verifiedAt: '2026-10-01',
  },

  // Legacy / deprecated bot tokens (flagged legacy)
  {
    name: 'anthropic-ai',
    uaPattern: 'anthropic-ai',
    vendor: 'Anthropic',
    purpose: 'training',
    verifiedAt: '2026-10-01',
    legacy: true,
  },
  {
    name: 'Claude-Web',
    uaPattern: 'Claude-Web',
    vendor: 'Anthropic',
    purpose: 'user-action',
    verifiedAt: '2026-10-01',
    legacy: true,
  },
  {
    name: 'Google-NotebookLM',
    uaPattern: 'Google-NotebookLM',
    vendor: 'Google',
    purpose: 'user-action',
    verifiedAt: '2026-10-01',
    legacy: true,
  },
];

export const AI_BOTS = AI_BOT_REGISTRY;

function uaMatches(ua: string, pattern: string | RegExp): boolean {
  if (typeof pattern === 'string') return ua.toLowerCase().includes(pattern.toLowerCase());
  return pattern.test(ua);
}

// Identify whether a User-Agent string belongs to a known AI crawler.
// Check more-specific tokens (e.g. Applebot-Extended) before shorter prefixes (Applebot).
export function detectAIBot(userAgent: string) {
  if (!userAgent) return { isBot: false, name: null, vendor: null, purpose: null, legacy: false };
  const sorted = [...AI_BOT_REGISTRY].sort(
    (a, b) => String(b.uaPattern).length - String(a.uaPattern).length
  );
  for (const entry of sorted) {
    if (uaMatches(userAgent, entry.uaPattern)) {
      return {
        isBot: true,
        name: entry.name,
        vendor: entry.vendor,
        purpose: entry.purpose,
        legacy: !!entry.legacy,
        robotsOnly: !!entry.robotsOnly,
      };
    }
  }
  return { isBot: false, name: null, vendor: null, purpose: null, legacy: false };
}

// ── Check catalogue (scored weights sum to 100; informational checks weight 0) ──
export const AEO_CHECKS = [
  {
    id: 'html.reachable',
    weight: 10,
    severity: 'required',
    status: 'active',
    evidenceGrade: 'spec-normative',
    era: 'evergreen',
    modelFamilies: ['all'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    label: 'Page is reachable over HTTP (HTML 2xx)',
  },
  {
    id: 'edge.access',
    weight: 20,
    severity: 'required',
    status: 'active',
    evidenceGrade: 'spec-normative',
    era: 'evergreen',
    modelFamilies: ['all'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    label: 'Edge/WAF allows automated retrieval without challenge or block',
  },
  {
    id: 'robots.searchAllowed',
    weight: 20,
    severity: 'required',
    status: 'active',
    evidenceGrade: 'spec-normative',
    era: 'evergreen',
    modelFamilies: ['all'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    label: 'robots.txt permits AI search & citation crawlers (RFC 9309)',
  },
  {
    id: 'html.indexable',
    weight: 12,
    severity: 'required',
    status: 'active',
    evidenceGrade: 'spec-normative',
    era: 'evergreen',
    modelFamilies: ['all'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    label: 'Page is indexable (no global noindex directive)',
  },
  {
    id: 'ai.previewControls',
    weight: 8,
    severity: 'required',
    status: 'active',
    evidenceGrade: 'spec-normative',
    era: 'evergreen',
    modelFamilies: ['all'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    label: 'Snippet & preview controls permit quoting across Google, Bing, and Apple',
  },
  {
    id: 'html.serverTextCoverage',
    weight: 15,
    severity: 'required',
    status: 'active',
    evidenceGrade: 'spec-normative',
    era: 'evergreen',
    modelFamilies: ['all'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    label: 'Server-rendered HTML contains primary page prose without JS',
  },
  {
    id: 'md.twin',
    weight: 6,
    severity: 'recommended',
    status: 'active',
    evidenceGrade: 'spec-normative',
    era: '2025-2026',
    modelFamilies: ['all'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    label: 'Validated Markdown twin served via negotiation or .md route',
  },
  {
    id: 'html.linkAlternate',
    weight: 3,
    severity: 'recommended',
    status: 'active',
    evidenceGrade: 'spec-normative',
    era: '2025-2026',
    modelFamilies: ['all'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    label: 'HTML advertises a valid Markdown twin (Link rel=alternate)',
  },
  {
    id: 'site.llmsTxt',
    weight: 2,
    severity: 'recommended',
    status: 'active',
    evidenceGrade: 'spec-normative',
    era: '2025-2026',
    modelFamilies: ['all'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    label: 'Valid /llms.txt published at site root (H1 + links, non-HTML)',
  },
  {
    id: 'html.vary',
    weight: 4,
    severity: 'recommended',
    status: 'active',
    evidenceGrade: 'spec-normative',
    era: 'evergreen',
    modelFamilies: ['all'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    label: 'Negotiated responses send Vary: Accept',
  },
  // Informational / review checks (weight 0)
  {
    id: 'ai.manipulation',
    weight: 0,
    severity: 'info',
    status: 'review',
    evidenceGrade: 'heuristic',
    era: '2025-2026',
    modelFamilies: ['all'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    label: 'No prompt injection, hidden instructions, or AI manipulation links',
  },
  {
    id: 'agent.operability',
    weight: 0,
    severity: 'info',
    status: 'review',
    evidenceGrade: 'spec-normative',
    era: 'evergreen',
    modelFamilies: ['all'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    label: 'Interactive controls have accessible names and no blocking overlays',
  },
  {
    id: 'agent.discovery',
    weight: 0,
    severity: 'info',
    status: 'review',
    evidenceGrade: 'spec-normative',
    era: '2025-2026',
    modelFamilies: ['all'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    label: 'Agent discovery endpoints (ARD, Agentmap, A2A agent-card, WebMCP)',
  },
  {
    id: 'ai.usagePolicy',
    weight: 0,
    severity: 'info',
    status: 'review',
    evidenceGrade: 'spec-normative',
    era: '2025-2026',
    modelFamilies: ['all'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    label: 'Machine-readable AI usage preferences (AIPREF Content-Usage, Content-Signal, TDMRep)',
  },
  {
    id: 'content.dates',
    weight: 0,
    severity: 'info',
    status: 'review',
    evidenceGrade: 'spec-normative',
    era: 'evergreen',
    modelFamilies: ['all'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    label: 'Publication and modification dates are valid and consistent across signals',
  },
  {
    id: 'jsonld.hygiene',
    weight: 0,
    severity: 'info',
    status: 'review',
    evidenceGrade: 'spec-normative',
    era: 'evergreen',
    modelFamilies: ['all'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    label: 'JSON-LD structured data parses cleanly and matches visible text',
  },
];

function pickCheck(id: string) {
  return AEO_CHECKS.find((c) => c.id === id)!;
}

export const MAX_HTML_BYTES = 2 * 1024 * 1024; // 2 MB

export async function readCapped(res: Response, maxBytes = MAX_HTML_BYTES): Promise<string> {
  if (!res.body || typeof res.body.getReader !== 'function') {
    const t = await res.text();
    return t.length > maxBytes ? t.slice(0, maxBytes) : t;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
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

function readBodyCapped(res: Response, maxBytes = MAX_HTML_BYTES, streamWhenOversized = false): Promise<string> {
  const cl = res.headers.get('content-length');
  if (cl && !streamWhenOversized) {
    const n = Number(cl);
    if (Number.isFinite(n) && n > maxBytes) return Promise.resolve('');
  }
  return readCapped(res, maxBytes);
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  fetchImpl: typeof fetch,
  isUrlAllowed?: (url: string) => boolean
): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
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
        current = new URL(res.headers.get('location')!, current).toString();
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

export function toMarkdownUrl(input: string): string {
  const u = new URL(input);
  const p = u.pathname.replace(/\/+$/, '');
  if (p.endsWith('.md')) return u.toString();
  u.pathname = p === '' ? '/index.md' : `${p}.md`;
  return u.toString();
}

// ── RFC 9309 robots.txt parser + A-09 Cloudflare Managed Detector (#234, #295) ──
export interface RobotsRule {
  type: 'allow' | 'disallow';
  pattern: string;
  line: number;
}

export interface ParsedRobotsTxt {
  groups: Map<string, RobotsRule[]>;
  sitemaps: string[];
  agentmaps: string[];
  contentSignals: Array<{ group: string[]; value: string }>;
  cloudflareManaged: boolean;
  legacyTokensUsed: string[];
}

function normalizeRobotsPath(p: string): string {
  // Normalize percent-encoding hex case and unreserved chars (~ = %7E) per RFC 9309
  return String(p || '/').replace(/%[0-9a-fA-F]{2}/g, (m) => {
    const code = parseInt(m.slice(1), 16);
    if (
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a) ||
      (code >= 0x30 && code <= 0x39) ||
      code === 0x2d ||
      code === 0x2e ||
      code === 0x5f ||
      code === 0x7e
    ) {
      return String.fromCharCode(code);
    }
    return m.toUpperCase();
  });
}

function robotsPatternMatches(pattern: string, targetPath: string): boolean {
  if (!pattern) return false;
  const normPat = normalizeRobotsPath(pattern);
  const normPath = normalizeRobotsPath(targetPath || '/');
  const anchoredEnd = normPat.endsWith('$');
  const raw = anchoredEnd ? normPat.slice(0, -1) : normPat;
  const escaped = raw
    .split('*')
    .map((seg) => seg.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  const re = new RegExp(`^${escaped}${anchoredEnd ? '$' : ''}`);
  return re.test(normPath);
}

export function parseRobotsTxt(robotsTxt: string): ParsedRobotsTxt {
  const groups = new Map<string, RobotsRule[]>();
  const sitemaps: string[] = [];
  const agentmaps: string[] = [];
  const contentSignals: Array<{ group: string[]; value: string }> = [];
  const legacyTokensUsed = new Set<string>();
  const legacySet = new Set(
    AI_BOT_REGISTRY.filter((b) => b.legacy).map((b) => b.name.toLowerCase())
  );

  const text = String(robotsTxt || '');
  const cloudflareManaged =
    /#\s*BEGIN\s+Cloudflare\s+Managed\s+content/i.test(text) ||
    /#\s*BEGIN\s+Cloudflare\s+Bot\s+Preference\s+Sync/i.test(text);

  const lines = text.split(/\r?\n/);
  let currentAgents: string[] = [];
  let currentHasRules = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/#.*$/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === 'user-agent') {
      if (currentHasRules) {
        currentAgents = [];
        currentHasRules = false;
      }
      const agent = value.toLowerCase();
      if (!currentAgents.includes(agent)) currentAgents.push(agent);
      if (!groups.has(agent)) groups.set(agent, []);
      if (legacySet.has(agent)) legacyTokensUsed.add(agent);
    } else if (field === 'allow' || field === 'disallow') {
      if (currentAgents.length === 0) continue;
      currentHasRules = true;
      for (const agent of currentAgents) {
        const list = groups.get(agent) || [];
        list.push({ type: field as 'allow' | 'disallow', pattern: value, line: i + 1 });
        groups.set(agent, list);
      }
    } else if (field === 'sitemap') {
      if (value) sitemaps.push(value);
    } else if (field === 'agentmap') {
      if (value) agentmaps.push(value);
    } else if (field === 'content-signal') {
      currentHasRules = true;
      contentSignals.push({ group: [...currentAgents], value });
    }
  }

  return {
    groups,
    sitemaps,
    agentmaps,
    contentSignals,
    cloudflareManaged,
    legacyTokensUsed: [...legacyTokensUsed],
  };
}

export function isBotAllowedByRobots(
  parsed: ParsedRobotsTxt,
  botName: string,
  pathname = '/'
): { allowed: boolean; matchedRule: RobotsRule | null; effectiveGroup: string } {
  const lower = botName.toLowerCase();
  let effectiveGroup = '*';
  let rules: RobotsRule[] | undefined;

  if (parsed.groups.has(lower)) {
    effectiveGroup = lower;
    rules = parsed.groups.get(lower);
  } else {
    const botMeta = AI_BOT_REGISTRY.find((b) => b.name.toLowerCase() === lower);
    if (botMeta?.inheritsFrom && parsed.groups.has(botMeta.inheritsFrom.toLowerCase())) {
      effectiveGroup = botMeta.inheritsFrom.toLowerCase();
      rules = parsed.groups.get(effectiveGroup);
    } else if (parsed.groups.has('*')) {
      effectiveGroup = '*';
      rules = parsed.groups.get('*');
    }
  }

  if (!rules || rules.length === 0) {
    return { allowed: true, matchedRule: null, effectiveGroup };
  }

  let bestRule: RobotsRule | null = null;
  let bestLen = -1;

  for (const r of rules) {
    if (r.pattern === '') {
      // Empty Disallow = allow all (length 0, doesn't block)
      continue;
    }
    if (robotsPatternMatches(r.pattern, pathname)) {
      const len = normalizeRobotsPath(r.pattern).length;
      if (len > bestLen) {
        bestLen = len;
        bestRule = r;
      } else if (len === bestLen && r.type === 'allow') {
        // RFC 9309 §2.2.2: Allow wins ties of equal pattern length!
        bestRule = r;
      }
    }
  }

  if (!bestRule) return { allowed: true, matchedRule: null, effectiveGroup };
  return { allowed: bestRule.type === 'allow', matchedRule: bestRule, effectiveGroup };
}

export function evaluateRobotsTxt(
  robotsTxt: string,
  pathname = '/',
  fetchInfo: { status?: number; contentType?: string; error?: string } = {}
) {
  const status = fetchInfo.status ?? 200;
  const ct = (fetchInfo.contentType || 'text/plain').toLowerCase();

  // RFC 9309 §2.3: 5xx or network error -> assume complete disallow
  if (fetchInfo.error || status >= 500) {
    return {
      fetchOutcome: 'unreachable_5xx' as const,
      searchAllowed: false,
      blocked: true,
      agents: ['*'],
      searchBlocked: AI_BOT_REGISTRY.filter((b) => b.purpose === 'search').map((b) =>
        b.name.toLowerCase()
      ),
      userActionBlocked: [],
      trainingBlocked: [],
      cloudflareManaged: false,
      cloudflareSearchCollateral: [],
      remediation: 'robots.txt returned 5xx or network error; per RFC 9309 §2.3 crawlers treat this as a temporary full disallow.',
      warning: null,
      legacyTokensUsed: [],
      agentmaps: [],
      contentSignals: [],
    };
  }

  // RFC 9309 §2.3: 4xx -> allow all
  if (status >= 400 && status < 500) {
    return {
      fetchOutcome: 'missing_4xx' as const,
      searchAllowed: true,
      blocked: false,
      agents: [],
      searchBlocked: [],
      userActionBlocked: [],
      trainingBlocked: [],
      cloudflareManaged: false,
      cloudflareSearchCollateral: [],
      remediation: null,
      warning: null,
      legacyTokensUsed: [],
      agentmaps: [],
      contentSignals: [],
    };
  }

  // 200 OK with text/html -> soft-404 HTML page served at /robots.txt
  if (ct.includes('text/html') && /<html|<!doctype html/i.test(robotsTxt)) {
    return {
      fetchOutcome: 'invalid_content_type' as const,
      searchAllowed: true,
      blocked: false,
      agents: [],
      searchBlocked: [],
      userActionBlocked: [],
      trainingBlocked: [],
      cloudflareManaged: false,
      cloudflareSearchCollateral: [],
      remediation: null,
      warning: 'robots.txt served with text/html Content-Type; ignored per RFC 9309',
      legacyTokensUsed: [],
      agentmaps: [],
      contentSignals: [],
    };
  }

  if (!robotsTxt || !robotsTxt.trim()) {
    return {
      fetchOutcome: 'ok' as const,
      searchAllowed: true,
      blocked: false,
      agents: [],
      searchBlocked: [],
      userActionBlocked: [],
      trainingBlocked: [],
      cloudflareManaged: false,
      cloudflareSearchCollateral: [],
      remediation: null,
      warning: null,
      legacyTokensUsed: [],
      agentmaps: [],
      contentSignals: [],
    };
  }

  const parsed = parseRobotsTxt(robotsTxt);
  const searchBlocked: string[] = [];
  const userActionBlocked: string[] = [];
  const trainingBlocked: string[] = [];
  const explicitlyBlockedAgents = new Set<string>();

  const wildcardCheck = isBotAllowedByRobots(parsed, '*', pathname);
  if (!wildcardCheck.allowed) {
    explicitlyBlockedAgents.add('*');
  }

  for (const bot of AI_BOT_REGISTRY) {
    const res = isBotAllowedByRobots(parsed, bot.name, pathname);
    if (!res.allowed) {
      const lower = bot.name.toLowerCase();
      if (res.effectiveGroup !== '*') explicitlyBlockedAgents.add(lower);
      if (bot.purpose === 'search') searchBlocked.push(lower);
      else if (bot.purpose === 'user-action') userActionBlocked.push(lower);
      else if (bot.purpose === 'training') trainingBlocked.push(lower);
    }
  }

  const cloudflareSearchCollateral = parsed.cloudflareManaged
    ? searchBlocked.filter((b) =>
        ['googlebot', 'bingbot', 'applebot', 'oai-searchbot', 'claude-searchbot', 'perplexitybot'].includes(b)
      )
    : [];

  const remediation =
    cloudflareSearchCollateral.length > 0
      ? `Cloudflare managed robots.txt or wildcard Disallow is blocking search crawlers (${cloudflareSearchCollateral.join(', ')}). Keep training bots in the managed block if desired, and add explicit Allow: / groups for search crawlers.`
      : searchBlocked.length > 0
        ? `Allow search crawlers (${searchBlocked.join(', ')}) in robots.txt so AI search engines can index and cite this page.`
        : null;

  const agents = [...explicitlyBlockedAgents];
  return {
    fetchOutcome: 'ok' as const,
    searchAllowed: searchBlocked.length === 0,
    blocked: agents.length > 0,
    agents,
    searchBlocked,
    userActionBlocked,
    trainingBlocked,
    cloudflareManaged: parsed.cloudflareManaged,
    cloudflareSearchCollateral,
    remediation,
    warning:
      parsed.legacyTokensUsed.length > 0
        ? `Deprecated bot token(s) in robots.txt: ${parsed.legacyTokensUsed.join(', ')}`
        : null,
    legacyTokensUsed: parsed.legacyTokensUsed,
    agentmaps: parsed.agentmaps,
    contentSignals: parsed.contentSignals,
  };
}

// Backward-compatible wrapper around evaluateRobotsTxt
export function aiBotsBlockedByRobots(robotsTxt: string, pathname = '/') {
  return evaluateRobotsTxt(robotsTxt, pathname);
}

// ── A-01 (#288): Per-engine snippet & preview controls parser ────────────────
export interface PreviewDirectivesResult {
  engines: {
    google: { status: 'pass' | 'warn' | 'fail'; directives: string[]; maxSnippet: number | null };
    bing: { status: 'pass' | 'warn' | 'fail'; directives: string[]; maxSnippet: number | null };
    apple: { status: 'pass' | 'warn' | 'fail'; directives: string[]; maxSnippet: number | null };
  };
  globalNoindex: boolean;
  nosnippetCharShare: number;
  status: 'pass' | 'warn' | 'fail';
  earnedWeight: number;
  maxWeight: 8;
  searchConsoleDisclosure: string;
}

export function parsePreviewDirectives(
  headers: Headers | Record<string, string>,
  htmlBody: string
): PreviewDirectivesResult {
  const getHeader = (name: string): string => {
    if (!headers) return '';
    if (typeof (headers as Headers).get === 'function') {
      return (headers as Headers).get(name) || '';
    }
    const lower = name.toLowerCase();
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === lower) return String(v || '');
    }
    return '';
  };

  const rawScopes: Record<'all' | 'google' | 'bing' | 'apple', string[]> = {
    all: [],
    google: [],
    bing: [],
    apple: [],
  };

  const addTokens = (scope: 'all' | 'google' | 'bing' | 'apple', content: string) => {
    for (const part of String(content || '').split(',')) {
      const tok = part.trim().toLowerCase();
      if (tok) rawScopes[scope].push(tok);
    }
  };

  // Parse X-Robots-Tag header (supports "googlebot: nosnippet" or unscoped "nosnippet, max-snippet:40")
  const xRobots = getHeader('x-robots-tag');
  if (xRobots) {
    const botPrefixMatch = xRobots.match(/^\s*(googlebot|bingbot|applebot|robots)\s*:\s*(.+)$/i);
    if (botPrefixMatch) {
      const bot = botPrefixMatch[1].toLowerCase();
      const scope =
        bot === 'googlebot' ? 'google' : bot === 'bingbot' ? 'bing' : bot === 'applebot' ? 'apple' : 'all';
      addTokens(scope, botPrefixMatch[2]);
    } else {
      addTokens('all', xRobots);
    }
  }

  // Parse <meta name="robots|googlebot|bingbot|applebot" content="...">
  const headSlice = String(htmlBody || '').slice(0, 100_000);
  const metaTags = headSlice.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of metaTags) {
    const nameMatch = tag.match(/\bname\s*=\s*["']([^"']+)["']/i);
    const contentMatch = tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i);
    if (!nameMatch || !contentMatch) continue;
    const name = nameMatch[1].trim().toLowerCase();
    const content = contentMatch[1];
    if (name === 'robots') addTokens('all', content);
    else if (name === 'googlebot' || name === 'googlebot-news') addTokens('google', content);
    else if (name === 'bingbot') addTokens('bing', content);
    else if (name === 'applebot') addTokens('apple', content);
  }

  const evalEngine = (engine: 'google' | 'bing' | 'apple') => {
    const combined = [...rawScopes.all, ...rawScopes[engine]];
    let maxSnippet: number | null = null;
    for (const tok of combined) {
      const m = tok.match(/^max-snippet\s*:\s*(-?\d+)$/);
      if (m) maxSnippet = parseInt(m[1], 10);
    }
    const hasHardBlock =
      combined.includes('nosnippet') ||
      combined.includes('none') ||
      combined.includes('noindex') ||
      maxSnippet === 0;
    const hasRestriction =
      !hasHardBlock &&
      ((maxSnippet !== null && maxSnippet > 0 && maxSnippet < 80) ||
        combined.includes('noarchive') ||
        combined.includes('nocache'));

    return {
      status: (hasHardBlock ? 'fail' : hasRestriction ? 'warn' : 'pass') as 'pass' | 'warn' | 'fail',
      directives: combined,
      maxSnippet,
    };
  };

  // Measure [data-nosnippet] character coverage share
  const visibleProse = stripHtmlToText(htmlBody);
  const nosnippetMatches: string[] =
    String(htmlBody || '').match(/<([a-z0-9]+)\b[^>]*\bdata-nosnippet\b[^>]*>([\s\S]*?)<\/\1>/gi) || [];
  const nosnippetChars = nosnippetMatches.reduce(
    (s: number, m: string) => s + stripHtmlToText(m).length,
    0
  );
  const nosnippetCharShare =
    visibleProse.length > 0 ? Number(Math.min(1, nosnippetChars / visibleProse.length).toFixed(3)) : 0;

  const google = evalEngine('google');
  const bing = evalEngine('bing');
  const apple = evalEngine('apple');
  if (nosnippetCharShare > 0.5 && google.status === 'pass') {
    google.status = 'warn';
  }

  const scoreFor = (st: 'pass' | 'warn' | 'fail', w: number) =>
    st === 'pass' ? w : st === 'warn' ? w * 0.5 : 0;
  const earnedWeight =
    scoreFor(google.status, 5) + scoreFor(bing.status, 2) + scoreFor(apple.status, 1);

  const globalNoindex =
    rawScopes.all.includes('noindex') || rawScopes.all.includes('none');

  const overallStatus: 'pass' | 'warn' | 'fail' =
    earnedWeight >= 7 ? 'pass' : earnedWeight >= 4 ? 'warn' : 'fail';

  return {
    engines: { google, bing, apple },
    globalNoindex,
    nosnippetCharShare,
    status: overallStatus,
    earnedWeight,
    maxWeight: 8,
    searchConsoleDisclosure:
      'Google AI Overviews and AI Mode use standard Googlebot snippet controls (nosnippet, max-snippet, data-nosnippet) and report clicks/impressions under Web search in Search Console.',
  };
}

function stripHtmlToText(html: string): string {
  return String(html || '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── A-06 (#292): AIPREF Content-Usage & Content-Signal parsers ───────────────
export function parseContentUsage(headerVal: string): {
  raw: string;
  preferences: Record<'train-ai' | 'ai-use' | 'search', 'y' | 'n' | 'unset'>;
  unknownLabels: string[];
} {
  const preferences: Record<'train-ai' | 'ai-use' | 'search', 'y' | 'n' | 'unset'> = {
    'train-ai': 'unset',
    'ai-use': 'unset',
    search: 'unset',
  };
  const unknownLabels: string[] = [];
  for (const item of String(headerVal || '').split(',')) {
    const part = item.trim();
    if (!part) continue;
    const m = part.match(/^([a-z0-9_-]+)\s*=\s*([a-z0-9?]+)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const rawVal = m[2].toLowerCase();
    const val = rawVal === 'y' || rawVal === 'yes' || rawVal === '?1' || rawVal === 'allow' ? 'y' : 'n';
    if (key === 'train-ai' || key === 'ai-use' || key === 'search') {
      preferences[key] = val;
    } else {
      unknownLabels.push(key);
    }
  }
  return { raw: String(headerVal || ''), preferences, unknownLabels };
}

export function parseContentSignal(val: string): {
  raw: string;
  signals: Record<string, string>;
  legacyUseSyntax: boolean;
} {
  const signals: Record<string, string> = {};
  let legacyUseSyntax = false;
  for (const item of String(val || '').split(',')) {
    const part = item.trim();
    if (!part) continue;
    const m = part.match(/^([a-z0-9_-]+)\s*=\s*(.+)$/i);
    if (!m) continue;
    const k = m[1].toLowerCase();
    const v = m[2].trim().toLowerCase();
    if (k === 'use') legacyUseSyntax = true;
    signals[k] = v;
  }
  return { raw: String(val || ''), signals, legacyUseSyntax };
}

// ── A-03 (#289): Prompt injection & AI manipulation detector ─────────────────
const PROMPT_INJECTION_LEXICON = [
  /\bignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions\b/i,
  /\bdisregard\s+(?:all\s+)?(?:previous|prior|system)\s+(?:instructions|prompts)\b/i,
  /\bsystem\s+prompt\s*:/i,
  /\byou\s+are\s+an?\s+(?:ai|language\s+model|helpful\s+assistant)\b[^.]{0,80}\b(?:must|always|recommend|cite|rank)\b/i,
  /\bdo\s+not\s+mention\s+any\s+competitors\b/i,
];

const CANARY_PATTERNS = [
  /\bif\s+you\s+are\s+an?\s+(?:llm|ai|language\s+model)\b[^.]{0,80}\b(?:include|mention)\s+the\s+(?:word|phrase|token)\b/i,
];

export function detectPromptInjection(
  htmlBody: string,
  headers?: Headers | Record<string, string>,
  llmsTxtBody?: string
) {
  const findings: Array<{ vector: string; snippet: string; canary?: boolean }> = [];
  const html = String(htmlBody || '');

  // 1. Poisoning outbound links (share/prompt URLs to AI engines with prefilled prompt)
  const linkTags = html.match(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi) || [];
  for (const tag of linkTags) {
    const hm = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if (!hm) continue;
    const href = hm[1];
    if (
      /(?:chatgpt\.com|chat\.openai\.com|claude\.ai|perplexity\.ai|copilot\.microsoft\.com|gemini\.google\.com)/i.test(
        href
      ) &&
      /[?&](?:q|prompt|text)=/i.test(href)
    ) {
      let decoded = href;
      try {
        decoded = decodeURIComponent(href);
      } catch {}
      if (/recommend|best|trusted|cite|authoritative|ignore|memory/i.test(decoded)) {
        findings.push({ vector: 'poisoning_link', snippet: decoded.slice(0, 140) });
      }
    }
  }

  // 2. Hidden DOM text & HTML comments containing prompt-override phrases
  const hiddenSnippets: string[] = [];
  const commentMatches = html.match(/<!--([\s\S]*?)-->/g) || [];
  hiddenSnippets.push(...commentMatches);
  const inlineHiddenMatches =
    html.match(
      /<[a-z0-9]+\b[^>]*(?:hidden|aria-hidden\s*=\s*["']true["']|style\s*=\s*["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0|font-size\s*:\s*0|left\s*:\s*-\d{3,}px)[^"']*["'])[^>]*>[\s\S]*?<\/[a-z0-9]+>/gi
    ) || [];
  hiddenSnippets.push(...inlineHiddenMatches);

  for (const snip of hiddenSnippets) {
    const text = snip.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const isCanary = CANARY_PATTERNS.some((re) => re.test(text));
    if (isCanary) {
      findings.push({ vector: 'hidden_text', snippet: text.slice(0, 140), canary: true });
    } else if (PROMPT_INJECTION_LEXICON.some((re) => re.test(text))) {
      findings.push({ vector: 'hidden_text', snippet: text.slice(0, 140), canary: false });
    }
  }

  // 3. Non-standard HTTP headers (X-AI-*, X-LLM-*, X-Prompt-*)
  if (headers) {
    const entries: Array<[string, string]> = [];
    if (typeof (headers as Headers).forEach === 'function') {
      (headers as Headers).forEach((v, k) => entries.push([k, v]));
    } else {
      for (const [k, v] of Object.entries(headers)) entries.push([k, String(v)]);
    }
    for (const [k, v] of entries) {
      if (/^x-(?:ai|llm|prompt|agent)-/i.test(k) || PROMPT_INJECTION_LEXICON.some((re) => re.test(v))) {
        findings.push({ vector: 'http_header', snippet: `${k}: ${v}`.slice(0, 140) });
      }
    }
  }

  // 4. JSON-LD and meta tag prompt injection
  const ldBlocks =
    html.match(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ||
    [];
  for (const blk of ldBlocks) {
    if (PROMPT_INJECTION_LEXICON.some((re) => re.test(blk))) {
      findings.push({ vector: 'jsonld_injection', snippet: blk.replace(/\s+/g, ' ').slice(0, 140) });
    }
  }

  // 5. /llms.txt imperative shell or prompt injection
  if (llmsTxtBody) {
    if (
      PROMPT_INJECTION_LEXICON.some((re) => re.test(llmsTxtBody)) ||
      /\b(?:curl|wget)\s+[^\n|]+\|\s*(?:sh|bash|zsh)\b/i.test(llmsTxtBody)
    ) {
      findings.push({
        vector: 'llms_txt_instruction',
        snippet: llmsTxtBody.replace(/\s+/g, ' ').slice(0, 140),
      });
    }
  }

  const activeFindings = findings.filter((f) => !f.canary);
  const canaries = findings.filter((f) => f.canary);
  return {
    triggered: activeFindings.length > 0,
    canaryOnly: activeFindings.length === 0 && canaries.length > 0,
    findings,
  };
}

// ── A-04 (#290): Lighthouse 13.5.0 33 axe rule IDs for agent operability ─────
export const LIGHTHOUSE_AGENT_AXE_RULES = [
  'accesskeys',
  'aria-allowed-attr',
  'aria-allowed-role',
  'aria-command-name',
  'aria-conditional-attr',
  'aria-deprecated-role',
  'aria-dialog-name',
  'aria-hidden-body',
  'aria-hidden-focus',
  'aria-input-field-name',
  'aria-meter-name',
  'aria-progressbar-name',
  'aria-prohibited-attr',
  'aria-required-attr',
  'aria-required-children',
  'aria-required-parent',
  'aria-roles',
  'aria-text',
  'aria-toggle-field-name',
  'aria-tooltip-name',
  'aria-treeitem-name',
  'aria-valid-attr-value',
  'aria-valid-attr',
  'button-name',
  'document-title',
  'duplicate-id-aria',
  'form-field-multiple-labels',
  'frame-title',
  'html-has-lang',
  'html-lang-valid',
  'image-alt',
  'input-button-name',
  'label',
] as const;

export function evaluateAgentOperability(htmlBody: string) {
  const html = String(htmlBody || '');
  const buttons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/gi) || [];
  const links = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) || [];
  const totalInteractive = buttons.length + links.length;
  let namedInteractive = 0;
  for (const el of [...buttons, ...links]) {
    const hasAria = /\baria-label(?:ledby)?\s*=\s*["'][^"']+["']/i.test(el);
    const hasTitle = /\btitle\s*=\s*["'][^"']+["']/i.test(el);
    const innerText = stripHtmlToText(el);
    if (hasAria || hasTitle || innerText.length > 0) namedInteractive++;
  }
  const accessibleNameRatio =
    totalInteractive > 0 ? Number((namedInteractive / totalInteractive).toFixed(3)) : 1;
  const emptyPriceShell = /<[^>]+class\s*=\s*["'][^"']*price[^"']*["'][^>]*>\s*<\/[^>]+>/i.test(html);
  const healthy = accessibleNameRatio >= 0.8 && !emptyPriceShell;
  return {
    healthy,
    accessibleNameRatio,
    totalInteractive,
    namedInteractive,
    emptyPriceShell,
    axeRuleCount: LIGHTHOUSE_AGENT_AXE_RULES.length,
  };
}

// ── Edge response classifier (FIX-13 #233) ───────────────────────────────────
export function classifyEdgeResponse(
  res: Response | null,
  body: string,
  baselineBody = ''
): {
  outcome: 'ok' | 'challenge' | 'captcha' | 'paid' | 'blocked' | 'inconclusive' | 'divergent-2xx';
  status: 'pass' | 'warn' | 'fail' | 'unknown';
  vendor: string | null;
  httpStatus: number | null;
} {
  if (!res) {
    return { outcome: 'inconclusive', status: 'unknown', vendor: null, httpStatus: null };
  }
  const st = res.status;
  const wafAction = (res.headers.get('x-amzn-waf-action') || '').toLowerCase();
  const cfMitigated = (res.headers.get('cf-mitigated') || '').toLowerCase();
  const crawlerPrice =
    res.headers.get('crawler-price') ||
    res.headers.get('x-crawler-price') ||
    res.headers.get('payment-required');

  if (st === 202 && wafAction === 'challenge') {
    return { outcome: 'challenge', status: 'fail', vendor: 'aws-waf', httpStatus: st };
  }
  if (st === 405 && wafAction === 'captcha') {
    return { outcome: 'captcha', status: 'fail', vendor: 'aws-waf', httpStatus: st };
  }
  if (cfMitigated.includes('challenge') || /<title>\s*Just a moment\.\.\.\s*<\/title>/i.test(body)) {
    return { outcome: 'challenge', status: 'fail', vendor: 'cloudflare', httpStatus: st };
  }
  if (st === 402 && crawlerPrice) {
    return { outcome: 'paid', status: 'warn', vendor: 'pay-per-crawl', httpStatus: st };
  }
  if (st === 401 || st === 403 || st === 451) {
    return { outcome: 'blocked', status: 'fail', vendor: null, httpStatus: st };
  }
  if (st === 429 || st >= 500) {
    return { outcome: 'inconclusive', status: 'unknown', vendor: null, httpStatus: st };
  }
  if (st >= 200 && st < 300) {
    if (
      baselineBody.length >= 200 &&
      body.length < baselineBody.length * 0.2 &&
      /access denied|forbidden|captcha|challenge/i.test(body)
    ) {
      return { outcome: 'divergent-2xx', status: 'fail', vendor: null, httpStatus: st };
    }
    return { outcome: 'ok', status: 'pass', vendor: null, httpStatus: st };
  }
  return { outcome: 'inconclusive', status: 'unknown', vendor: null, httpStatus: st };
}

// ── Markdown twin & /llms.txt validators (FIX-15 #206) ───────────────────────
export function validateMarkdownTwin(body: string, contentType: string): {
  valid: boolean;
  strippedLength: number;
  reason?: string;
} {
  const ct = String(contentType || '').toLowerCase();
  if (ct.includes('text/html')) {
    return { valid: false, strippedLength: 0, reason: 'html_content_type' };
  }
  const stripped = String(body || '')
    .replace(/^\uFEFF?\s*---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
    .replace(/```json\r?\n[\s\S]*?\r?\n```\s*$/i, '')
    .trim();
  if (/^\s*<!doctype html|^\s*<html\b/i.test(stripped)) {
    return { valid: false, strippedLength: stripped.length, reason: 'html_body' };
  }
  if (stripped.length < 50) {
    return { valid: false, strippedLength: stripped.length, reason: 'too_short' };
  }
  return { valid: true, strippedLength: stripped.length };
}

export function validateLlmsTxt(body: string, contentType: string): {
  valid: boolean;
  hasH1: boolean;
  linkCount: number;
  instructions: string[];
  reason?: string;
} {
  const ct = String(contentType || '').toLowerCase();
  if (ct.includes('text/html') || /^\s*<!doctype html|^\s*<html\b/i.test(body)) {
    return { valid: false, hasH1: false, linkCount: 0, instructions: [], reason: 'html_response' };
  }
  const trimmed = String(body || '').trim();
  const hasH1 = /^#\s+\S+/m.test(trimmed);
  const links = trimmed.match(/\[[^\]]+\]\([^)]+\)/g) || [];
  const instructions: string[] = [];
  for (const line of trimmed.split(/\r?\n/)) {
    if (
      /\b(?:curl|wget)\s+[^\n|]+\|\s*(?:sh|bash)\b/i.test(line) ||
      PROMPT_INJECTION_LEXICON.some((re) => re.test(line))
    ) {
      instructions.push(line.trim().slice(0, 120));
    }
  }
  if (trimmed.length < 50) {
    return { valid: false, hasH1, linkCount: links.length, instructions, reason: 'too_short' };
  }
  if (!hasH1) {
    return { valid: false, hasH1, linkCount: links.length, instructions, reason: 'missing_h1' };
  }
  if (links.length === 0) {
    return { valid: false, hasH1, linkCount: 0, instructions, reason: 'missing_links' };
  }
  return { valid: true, hasH1, linkCount: links.length, instructions };
}

function tierForEligibility(score: number): 'Eligible' | 'Partially Eligible' | 'Restricted' {
  if (score >= 80) return 'Eligible';
  if (score >= 50) return 'Partially Eligible';
  return 'Restricted';
}

function makeCheckResult(
  check: any,
  status: 'pass' | 'warn' | 'fail' | 'na' | 'unknown' | 'info',
  message: string,
  detail: Record<string, any> = {}
) {
  return {
    id: check.id,
    label: check.label,
    severity: check.severity,
    weight: check.weight,
    status,
    passed: status === 'pass' || status === 'warn' || status === 'info',
    message,
    detail,
  };
}

// ── Main AEO Check Runner ────────────────────────────────────────────────────
export async function runAeoChecks(
  input: string,
  opts: {
    fetchImpl?: typeof fetch;
    userAgent?: string;
    timeoutMs?: number;
    isUrlAllowed?: (url: string) => boolean;
    renderedWords?: number;
    vantagePoint?: string;
  } = {}
) {
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const userAgent = opts.userAgent || AEO_SCANNER_USER_AGENT;
  const timeoutMs = opts.timeoutMs || 10_000;
  const isUrlAllowed = opts.isUrlAllowed;
  const vantagePoint = opts.vantagePoint || 'scanner-origin';
  const start = Date.now();
  const url = new URL(input);
  const checks: any[] = [];

  // 1. html.reachable (P0 baseline fetch)
  let html: Response | null = null;
  let htmlBody = '';
  let htmlErr: string | null = null;
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
    // FIX-15: stream-read first MAX_HTML_BYTES of HTML even when Content-Length > 2 MB
    htmlBody = await readBodyCapped(html, MAX_HTML_BYTES, true);
  } catch (e) {
    htmlErr = e instanceof Error ? e.message : String(e);
  }
  const p0Class = classifyEdgeResponse(html, htmlBody);
  const htmlOk = !!(html && html.ok && p0Class.outcome === 'ok');
  checks.push(
    makeCheckResult(
      pickCheck('html.reachable'),
      htmlOk ? 'pass' : 'fail',
      htmlErr || `status ${html ? html.status : 'no response'}`,
      { httpStatus: html ? html.status : null }
    )
  );

  // 2. edge.access (FIX-13: P0 baseline + P1 search-class probe + P2 agent-class probe, no UA spoofing)
  let p1Res: Response | null = null;
  let p1Body = '';
  let p1Err: string | null = null;
  try {
    p1Res = await fetchWithTimeout(
      url.toString(),
      {
        headers: {
          'User-Agent': `${userAgent} SearchProbe/1.0`,
          Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
          'X-Slop-Detect-Probe': 'search',
        },
      },
      timeoutMs,
      fetchImpl,
      isUrlAllowed
    );
    p1Body = await readBodyCapped(p1Res, 256 * 1024);
  } catch (e) {
    p1Err = e instanceof Error ? e.message : String(e);
  }
  const p1Class = classifyEdgeResponse(p1Res, p1Body, htmlBody);

  // If P0 itself was blocked/challenged by edge WAF, scanner vantage point is blocked -> unknown
  let edgeStatus: 'pass' | 'warn' | 'fail' | 'unknown' = p1Class.status;
  let edgeMsg = '';
  if (!htmlOk && (p0Class.outcome === 'blocked' || p0Class.outcome === 'challenge' || p0Class.outcome === 'captcha')) {
    edgeStatus = p1Class.status === 'fail' ? 'fail' : 'unknown';
    edgeMsg = `Edge WAF blocked/challenged baseline request (${p0Class.outcome}, status ${p0Class.httpStatus})`;
  } else if (p1Class.outcome === 'ok') {
    edgeStatus = 'pass';
    edgeMsg = `Edge allowed search-class probe (${p1Class.httpStatus})`;
  } else if (p1Class.outcome === 'paid') {
    edgeStatus = 'warn';
    edgeMsg = `Edge returned HTTP 402 pay-per-crawl challenge`;
  } else if (p1Class.status === 'unknown') {
    edgeStatus = 'unknown';
    edgeMsg = p1Err || `Edge returned inconclusive status (${p1Class.httpStatus})`;
  } else {
    edgeStatus = 'fail';
    edgeMsg = `Edge blocked/challenged search probe (${p1Class.outcome}, status ${p1Class.httpStatus})`;
  }
  checks.push(
    makeCheckResult(pickCheck('edge.access'), edgeStatus, edgeMsg, {
      vantagePoint,
      p0: p0Class,
      p1: p1Class,
    })
  );

  // 3. robots.searchAllowed (FIX-14 + A-09)
  let robotsTxt = '';
  let robotsStatus = 404;
  let robotsCt = 'text/plain';
  let robotsErr: string | undefined;
  let robotsFetched = false;
  try {
    const r = await fetchWithTimeout(
      new URL('/robots.txt', url).toString(),
      { headers: { 'User-Agent': userAgent } },
      timeoutMs,
      fetchImpl,
      isUrlAllowed
    );
    robotsStatus = r.status;
    robotsCt = r.headers.get('content-type') || 'text/plain';
    if (r.ok) {
      robotsTxt = await readBodyCapped(r, MAX_HTML_BYTES, false);
      robotsFetched = true;
    }
  } catch (e) {
    robotsErr = e instanceof Error ? e.message : String(e);
  }
  const robotsVerdict = evaluateRobotsTxt(robotsTxt, url.pathname, {
    status: robotsStatus,
    contentType: robotsCt,
    error: robotsErr,
  });
  checks.push(
    makeCheckResult(
      pickCheck('robots.searchAllowed'),
      robotsVerdict.searchAllowed ? 'pass' : 'fail',
      !robotsVerdict.searchAllowed
        ? `robots.txt disallows search crawlers: ${robotsVerdict.searchBlocked.join(', ')}`
        : robotsVerdict.trainingBlocked.length > 0
          ? `robots.txt allows search crawlers (opts out of training: ${robotsVerdict.trainingBlocked.join(', ')})`
          : robotsFetched
            ? 'robots.txt allows AI search crawlers'
            : 'no robots.txt restrictions (allows all)',
      robotsVerdict
    )
  );

  // 4. html.indexable & 5. ai.previewControls (A-01)
  if (htmlOk && html) {
    const preview = parsePreviewDirectives(html.headers, htmlBody);
    const noindex =
      preview.globalNoindex ||
      preview.engines.google.directives.includes('noindex') ||
      preview.engines.bing.directives.includes('noindex');
    checks.push(
      makeCheckResult(
        pickCheck('html.indexable'),
        noindex ? 'fail' : 'pass',
        noindex ? 'page sets noindex directive' : 'no noindex directive',
        { globalNoindex: preview.globalNoindex }
      )
    );
    checks.push(
      makeCheckResult(
        pickCheck('ai.previewControls'),
        preview.status,
        preview.status === 'pass'
          ? 'snippet and preview controls allow quoting across Google, Bing, and Apple'
          : `snippet controls restrict previews (earned ${preview.earnedWeight}/8 pts)`,
        preview
      )
    );
  } else {
    // FIX-18: when html.reachable fails, page-dependent checks return 'na' (no cascade!)
    checks.push(makeCheckResult(pickCheck('html.indexable'), 'na', 'HTML not reachable — skipped'));
    checks.push(
      makeCheckResult(pickCheck('ai.previewControls'), 'na', 'HTML not reachable — skipped')
    );
  }

  // 6. html.serverTextCoverage (A-02)
  if (htmlOk) {
    const visibleText = stripHtmlToText(htmlBody);
    const noJsWords = visibleText ? visibleText.split(/\s+/).filter(Boolean).length : 0;
    const hasCsrShell = /<div\s+id=["'](?:root|app|__next)["']\s*>\s*<\/div>/i.test(htmlBody);
    if (typeof opts.renderedWords === 'number') {
      if (opts.renderedWords < 50) {
        checks.push(
          makeCheckResult(
            pickCheck('html.serverTextCoverage'),
            'na',
            `page has fewer than 50 rendered words (${opts.renderedWords}) — skipped`,
            { noJsWords, renderedWords: opts.renderedWords }
          )
        );
      } else {
        const covRatio = Number(Math.min(1, noJsWords / opts.renderedWords).toFixed(3));
        const covStatus = covRatio >= 0.8 ? 'pass' : covRatio >= 0.5 ? 'warn' : 'fail';
        checks.push(
          makeCheckResult(
            pickCheck('html.serverTextCoverage'),
            covStatus,
            `server HTML contains ${Math.round(covRatio * 100)}% of rendered words (${noJsWords}/${opts.renderedWords})`,
            { noJsWords, renderedWords: opts.renderedWords, ratio: covRatio }
          )
        );
      }
    } else {
      const covStatus = noJsWords >= 15 || !hasCsrShell ? 'pass' : 'fail';
      checks.push(
        makeCheckResult(
          pickCheck('html.serverTextCoverage'),
          covStatus,
          covStatus === 'pass'
            ? `server HTML contains ${noJsWords} words of readable text`
            : 'server HTML is an empty client-side CSR shell (< 15 words without JS)',
          { noJsWords, hasCsrShell }
        )
      );
    }
  } else {
    checks.push(
      makeCheckResult(pickCheck('html.serverTextCoverage'), 'na', 'HTML not reachable — skipped')
    );
  }

  // 7. md.twin & 8. html.linkAlternate & 10. html.vary (FIX-15)
  const mdUrl = toMarkdownUrl(url.toString());
  let advertisedHref: string | null = null;
  if (htmlOk && html) {
    const linkHeader = html.headers.get('link') || '';
    const linkHeaderMatch = linkHeader.match(/<([^>]+)>\s*;\s*rel=["']?alternate["']?[^>]*type=["']?text\/markdown["']?/i);
    if (linkHeaderMatch) advertisedHref = linkHeaderMatch[1];
    if (!advertisedHref) {
      const head = htmlBody.slice(0, 50_000);
      const linkTags = head.match(/<link\b[^>]+rel=["']alternate["'][^>]*>/gi) || [];
      for (const tag of linkTags) {
        if (/text\/markdown/i.test(tag)) {
          const hm = tag.match(/\bhref=["']([^"']+)["']/i);
          if (hm && hm[1].trim()) advertisedHref = hm[1].trim();
        }
      }
    }
  }

  let mdRes: Response | null = null;
  let mdBody = '';
  let negotiatedMarkdown = false;

  // Probe <url>.md or advertised href first
  const probeUrls = [
    ...(advertisedHref ? [new URL(advertisedHref, url).toString()] : []),
    mdUrl,
  ];
  for (const candidateUrl of [...new Set(probeUrls)]) {
    try {
      const r = await fetchWithTimeout(
        candidateUrl,
        { headers: { Accept: 'text/markdown', 'User-Agent': userAgent } },
        timeoutMs,
        fetchImpl,
        isUrlAllowed
      );
      if (r.ok) {
        const b = await readBodyCapped(r, MAX_HTML_BYTES, false);
        const ct = (r.headers.get('content-type') || '').toLowerCase();
        if (ct.startsWith('text/markdown') || ct.startsWith('text/x-markdown')) {
          mdRes = r;
          mdBody = b;
          negotiatedMarkdown = true;
          break;
        }
      } else if (!mdRes) {
        mdRes = r;
      }
    } catch {
      /* ignore */
    }
  }

  const mdCt = ((mdRes && mdRes.headers.get('content-type')) || '').toLowerCase();
  const twinCheck =
    mdRes && mdRes.ok && (mdCt.startsWith('text/markdown') || mdCt.startsWith('text/x-markdown'))
      ? validateMarkdownTwin(mdBody, mdCt)
      : { valid: false, strippedLength: 0, reason: 'missing' };

  checks.push(
    makeCheckResult(
      pickCheck('md.twin'),
      twinCheck.valid ? 'pass' : 'fail',
      twinCheck.valid
        ? `validated markdown twin at ${mdUrl} (${twinCheck.strippedLength} bytes)`
        : mdRes
          ? `no valid markdown twin (${mdRes.status}, ${mdCt || 'no content-type'})`
          : 'no markdown twin',
      twinCheck
    )
  );

  if (htmlOk) {
    const linkOk = Boolean(advertisedHref && twinCheck.valid);
    checks.push(
      makeCheckResult(
        pickCheck('html.linkAlternate'),
        linkOk ? 'pass' : 'fail',
        linkOk
          ? `Link rel=alternate type=text/markdown points to valid twin (${advertisedHref})`
          : advertisedHref
            ? `Link rel=alternate points to ${advertisedHref} but twin validation failed`
            : 'no markdown alternate advertised',
        { href: advertisedHref, twinValid: twinCheck.valid }
      )
    );
  } else {
    checks.push(
      makeCheckResult(pickCheck('html.linkAlternate'), 'na', 'HTML not reachable — skipped')
    );
  }

  // 9. site.llmsTxt (FIX-15)
  let llmsRes: Response | null = null;
  let llmsBody = '';
  try {
    llmsRes = await fetchWithTimeout(
      new URL('/llms.txt', url).toString(),
      { headers: { 'User-Agent': userAgent } },
      timeoutMs,
      fetchImpl,
      isUrlAllowed
    );
    if (llmsRes.ok) {
      llmsBody = await readBodyCapped(llmsRes, MAX_HTML_BYTES, false);
    }
  } catch {
    /* none */
  }
  const llmsCt = ((llmsRes && llmsRes.headers.get('content-type')) || '').toLowerCase();
  let llmsStatus: 'pass' | 'fail' | 'na' = 'na';
  let llmsMsg = 'no /llms.txt at site root (optional)';
  let llmsValidation: any = {};
  if (!llmsRes || llmsRes.status === 404 || llmsRes.status === 410) {
    llmsStatus = 'na';
  } else if (llmsRes.status >= 500 || llmsRes.status === 429) {
    llmsStatus = 'fail';
    llmsMsg = `/llms.txt returned ${llmsRes.status}`;
  } else if (llmsRes.ok) {
    llmsValidation = validateLlmsTxt(llmsBody, llmsCt);
    if (llmsValidation.valid) {
      llmsStatus = 'pass';
      llmsMsg = `/llms.txt valid (${llmsValidation.linkCount} links)`;
    } else {
      llmsStatus = 'fail';
      llmsMsg = `/llms.txt invalid (${llmsValidation.reason})`;
    }
  }
  checks.push(makeCheckResult(pickCheck('site.llmsTxt'), llmsStatus, llmsMsg, llmsValidation));

  // 10. html.vary (FIX-15: 'na' when site does not negotiate markdown and Vary: Accept is absent)
  if (htmlOk && html) {
    const vary = (html.headers.get('vary') || '').split(',').map((s) => s.trim().toLowerCase());
    const hasVaryAccept = vary.includes('accept') || vary.includes('*');
    const varyStatus = hasVaryAccept ? 'pass' : negotiatedMarkdown ? 'fail' : 'na';
    checks.push(
      makeCheckResult(
        pickCheck('html.vary'),
        varyStatus,
        hasVaryAccept
          ? 'Vary: Accept present'
          : negotiatedMarkdown
            ? 'Negotiated markdown twin served without Vary: Accept'
            : 'Site does not negotiate markdown — Vary: Accept not applicable',
        { hasVaryAccept, negotiatedMarkdown }
      )
    );
  } else {
    checks.push(makeCheckResult(pickCheck('html.vary'), 'na', 'HTML not reachable — skipped'));
  }

  // ── Weight-0 Informational Checks (A-03, A-04, A-05, A-06, A-07, A-10) ──────
  if (htmlOk && html) {
    const manip = detectPromptInjection(htmlBody, html.headers, llmsBody);
    checks.push(
      makeCheckResult(
        pickCheck('ai.manipulation'),
        manip.triggered ? 'info' : 'pass',
        manip.triggered
          ? `Detected ${manip.findings.length} potential prompt-manipulation signal(s)`
          : 'No prompt manipulation signals detected',
        manip
      )
    );

    const oper = evaluateAgentOperability(htmlBody);
    checks.push(
      makeCheckResult(
        pickCheck('agent.operability'),
        oper.healthy ? 'pass' : 'info',
        `Accessible name coverage: ${Math.round(oper.accessibleNameRatio * 100)}%`,
        oper
      )
    );

    const hasWebMcp = /navigator\.modelContext|<meta[^>]+name=["']webmcp["']/i.test(htmlBody);
    checks.push(
      makeCheckResult(
        pickCheck('agent.discovery'),
        'info',
        robotsVerdict.agentmaps.length > 0 || hasWebMcp
          ? 'Agent discovery signals advertised'
          : 'No optional agent discovery manifests advertised',
        { agentmaps: robotsVerdict.agentmaps, webMcp: hasWebMcp }
      )
    );

    const cuHeader = html.headers.get('content-usage') || '';
    const csHeader = html.headers.get('content-signal') || '';
    const parsedCu = cuHeader ? parseContentUsage(cuHeader) : null;
    const parsedCs = csHeader ? parseContentSignal(csHeader) : null;
    const policyConflict = Boolean(
      parsedCu &&
        parsedCu.preferences.search === 'y' &&
        !robotsVerdict.searchAllowed
    );
    checks.push(
      makeCheckResult(
        pickCheck('ai.usagePolicy'),
        'info',
        cuHeader || csHeader || robotsVerdict.contentSignals.length > 0
          ? 'Machine-readable AI usage preferences declared'
          : 'No explicit AIPREF Content-Usage or Content-Signal headers',
        {
          contentUsage: parsedCu,
          contentSignal: parsedCs,
          robotsContentSignals: robotsVerdict.contentSignals,
          policyConflict,
        }
      )
    );

    // A-07 content.dates & A-10 jsonld.hygiene
    const ldMatches =
      htmlBody.match(
        /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
      ) || [];
    let jsonLdValid = true;
    const datesFound: string[] = [];
    for (const blk of ldMatches) {
      const inner = blk.replace(/^<script[^>]*>|<\/script>$/gi, '').trim();
      try {
        const obj = JSON.parse(inner);
        if (!obj['@context'] || !obj['@type']) jsonLdValid = false;
        if (typeof obj.datePublished === 'string') datesFound.push(obj.datePublished);
        if (typeof obj.dateModified === 'string') datesFound.push(obj.dateModified);
      } catch {
        jsonLdValid = false;
      }
    }
    const lastMod = html.headers.get('last-modified');
    if (lastMod) datesFound.push(lastMod);

    checks.push(
      makeCheckResult(
        pickCheck('content.dates'),
        'info',
        datesFound.length > 0 ? `Found ${datesFound.length} date signal(s)` : 'No structured dates found',
        { datesFound }
      )
    );
    checks.push(
      makeCheckResult(
        pickCheck('jsonld.hygiene'),
        jsonLdValid ? 'pass' : 'info',
        ldMatches.length === 0
          ? 'No JSON-LD blocks present'
          : jsonLdValid
            ? 'JSON-LD parses cleanly'
            : 'JSON-LD syntax or @context/@type issue detected',
        { blocks: ldMatches.length, valid: jsonLdValid }
      )
    );
  } else {
    for (const infoId of [
      'ai.manipulation',
      'agent.operability',
      'agent.discovery',
      'ai.usagePolicy',
      'content.dates',
      'jsonld.hygiene',
    ]) {
      checks.push(makeCheckResult(pickCheck(infoId), 'na', 'HTML not reachable — skipped'));
    }
  }

  // Dynamic denominator (FIX-18): exclude 'na', 'unknown', 'info', and weight === 0 checks
  const applicable = checks.filter(
    (c) => c.weight > 0 && c.status !== 'na' && c.status !== 'unknown' && c.status !== 'info'
  );
  const earnedWeight = applicable.reduce(
    (s, c) => s + (c.status === 'pass' ? c.weight : c.status === 'warn' ? c.weight * 0.5 : 0),
    0
  );
  const applicableWeight = applicable.reduce((s, c) => s + c.weight, 0);
  const ratio = applicableWeight > 0 ? earnedWeight / applicableWeight : 0;
  const score = applicableWeight > 0 ? Math.round(ratio * 100) : 0;

  const passed = checks.filter((c) => c.status === 'pass');
  const failed = checks.filter((c) => c.status === 'fail');

  return {
    axis: 'aeo',
    url: url.toString(),
    mdUrl,
    vantagePoint,
    evidence: failed,
    score,
    maxScore: 100,
    earnedWeight,
    applicableWeight,
    ratio: Number(ratio.toFixed(3)),
    tier: tierForEligibility(score),
    requiredFailed: failed.filter((c) => c.severity === 'required').length,
    recommendedFailed: failed.filter((c) => c.severity === 'recommended').length,
    passed,
    failed,
    checks,
    durationMs: Date.now() - start,
  };
}
