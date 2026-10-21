// Site sampling and copy aggregation (W-06 / C-14 / #210).
// Pure functions. No browser. A static HTML extract is rendered:false.
// pre2022HeavyRate stays null until a real pre-2022 corpus is scored.

export const SITE_SAMPLE_DEFAULT = 5;
export const SITE_SAMPLE_MAX = 15;
export const SITE_MIN_VISIBLE_WORDS = 50;

export function normalizeSiteSampleSize(raw: number | undefined): number {
  if (raw == null || !Number.isInteger(raw)) return SITE_SAMPLE_DEFAULT;
  if (raw < 1) return SITE_SAMPLE_DEFAULT;
  return Math.min(SITE_SAMPLE_MAX, raw);
}

export function sameOrigin(a: string, b: string): boolean {
  try {
    const left = new URL(a);
    const right = new URL(b);
    return left.protocol === right.protocol && left.host === right.host;
  } catch {
    return false;
  }
}

export function canonicalPageUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    url.hash = '';
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.replace(/\/+$/, '');
    }
    return url.toString();
  } catch {
    return null;
  }
}

export interface SiteSample {
  origin: string;
  max: number;
  urls: string[];
  sources: Array<{ url: string; source: 'seed' | 'sitemap' | 'link' }>;
  rejectedOffOrigin: number;
  capped: boolean;
}

export function selectSiteSample(
  seed: string,
  opts: { sitemapUrls?: string[]; linkUrls?: string[]; max?: number } = {}
): SiteSample {
  const max = normalizeSiteSampleSize(opts.max);
  const origin = new URL(seed).origin;
  const ordered: SiteSample['sources'] = [];
  const seen = new Set<string>();
  let rejectedOffOrigin = 0;
  let capped = false;

  const push = (raw: string, source: 'seed' | 'sitemap' | 'link') => {
    const key = canonicalPageUrl(raw);
    if (!key) return;
    let url: URL;
    try {
      url = new URL(key);
    } catch {
      return;
    }
    if (url.origin !== origin) {
      rejectedOffOrigin += 1;
      return;
    }
    if (seen.has(key)) return;
    if (ordered.length >= max) {
      capped = true;
      return;
    }
    seen.add(key);
    ordered.push({ url: key, source });
  };

  push(seed, 'seed');
  for (const url of opts.sitemapUrls || []) push(url, 'sitemap');
  for (const url of opts.linkUrls || []) push(url, 'link');

  return {
    origin,
    max,
    urls: ordered.map((row) => row.url),
    sources: ordered,
    rejectedOffOrigin,
    capped,
  };
}

export function urlsFromSitemap(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml))) {
    const loc = match[1].replace(/&amp;/g, '&').trim();
    if (loc) out.push(loc);
  }
  return out;
}

export function urlsFromHtmlLinks(html: string, pageUrl: string): string[] {
  const out: string[] = [];
  const re = /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const href = (match[1] ?? match[2] ?? match[3] ?? '').trim();
    if (!href || href.startsWith('#')) continue;
    if (/^(mailto:|javascript:|tel:|data:)/i.test(href)) continue;
    try {
      out.push(new URL(href, pageUrl).toString());
    } catch {
      /* ignore malformed hrefs */
    }
  }
  return out;
}

async function readFetchedText(res: {
  ok?: boolean;
  text: () => Promise<string>;
}): Promise<string> {
  if (!res || res.ok === false) return '';
  const text = await res.text();
  return String(text || '').slice(0, 200_000);
}

export async function discoverSitePages(
  seed: string,
  fetchImpl: typeof fetch,
  opts: { max?: number; timeoutMs?: number } = {}
): Promise<SiteSample> {
  const max = normalizeSiteSampleSize(opts.max);
  const timeoutMs = opts.timeoutMs ?? 8000;
  const origin = new URL(seed).origin;
  const sitemapUrls: string[] = [];

  const fetchText = async (url: string) => {
    try {
      const res = await fetchImpl(url, {
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'follow',
        headers: { accept: 'text/html,application/xml,text/xml,text/plain,*/*' },
      });
      return readFetchedText(res);
    } catch {
      return '';
    }
  };

  const rootXml = await fetchText(new URL('/sitemap.xml', origin).toString());
  const locs = urlsFromSitemap(rootXml);
  sitemapUrls.push(...locs.filter((url) => !/\.xml($|\?)/i.test(url)));
  const nested = locs.filter((url) => /\.xml($|\?)/i.test(url)).slice(0, 2);
  for (const child of nested) {
    const inner = await fetchText(child);
    sitemapUrls.push(...urlsFromSitemap(inner).filter((url) => !/\.xml($|\?)/i.test(url)));
  }

  const seedHtml = await fetchText(seed);
  const links = seedHtml ? urlsFromHtmlLinks(seedHtml, seed) : [];
  return selectSiteSample(seed, { sitemapUrls, linkUrls: links, max });
}

export function stripHtml(value: string): string {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export interface HtmlCopyPage {
  url: string;
  text: string;
  headings: string[];
  paragraphs: string[];
  lang?: string;
}

export function htmlToCopyInput(html: string, url = 'page'): HtmlCopyPage {
  const withoutCode = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  const headings = [...withoutCode.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)].map((m) =>
    stripHtml(m[1])
  );
  const paragraphs = [...withoutCode.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) =>
    stripHtml(m[1])
  );
  const langMatch = withoutCode.match(/<html[^>]*\blang\s*=\s*["']?([a-zA-Z-]+)/i);
  return {
    url,
    text: stripHtml(withoutCode),
    headings: headings.filter(Boolean),
    paragraphs: paragraphs.filter(Boolean),
    lang: langMatch ? langMatch[1] : undefined,
  };
}

export async function collectSiteCopyPages(
  seed: string,
  fetchImpl: typeof fetch,
  opts: { max?: number; timeoutMs?: number; delayMs?: number } = {}
): Promise<{ plan: SiteSample; pages: HtmlCopyPage[] }> {
  const plan = await discoverSitePages(seed, fetchImpl, opts);
  const pages: HtmlCopyPage[] = [];
  for (let i = 0; i < plan.urls.length; i++) {
    if (i > 0 && opts.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, opts.delayMs));
    }
    const url = plan.urls[i];
    try {
      const res = await fetchImpl(url, {
        signal: AbortSignal.timeout(opts.timeoutMs ?? 8000),
        redirect: 'follow',
      });
      const html = await readFetchedText(res);
      if (!html) continue;
      pages.push(htmlToCopyInput(html, url));
    } catch {
      /* a failed page is omitted; an empty set is not a Clean score */
    }
  }
  return { plan, pages };
}

export function pageEligibleForSiteScore(page: {
  visibleWords?: number;
  hasH1?: boolean;
  hasMain?: boolean;
  hasSection?: boolean;
}): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if ((page.visibleWords ?? 0) < SITE_MIN_VISIBLE_WORDS) {
    reasons.push(`fewer than ${SITE_MIN_VISIBLE_WORDS} visible words`);
  }
  if (!(page.hasH1 || page.hasMain || page.hasSection)) {
    reasons.push('no h1, main, or section');
  }
  return { eligible: reasons.length === 0, reasons };
}

export interface TemplateFinding {
  pageUrl: string;
  patternId: string;
  domPath?: string | null;
}

export function dedupeTemplateFindings(findings: TemplateFinding[] = []): {
  counted: TemplateFinding[];
  suppressed: TemplateFinding[];
} {
  const seen = new Set<string>();
  const counted: TemplateFinding[] = [];
  const suppressed: TemplateFinding[] = [];
  for (const finding of findings) {
    const path = (finding.domPath || '').trim();
    if (!path) {
      counted.push(finding);
      continue;
    }
    const key = `${finding.patternId}::${path}`;
    if (seen.has(key)) {
      suppressed.push(finding);
      continue;
    }
    seen.add(key);
    counted.push(finding);
  }
  return { counted, suppressed };
}

export interface SitePageScore {
  url: string;
  score: number | null;
  tier: string | null;
  eligible: boolean;
  homepage?: boolean;
}

function designTier(score: number): 'Clean' | 'Mild' | 'Heavy' {
  if (score >= 28) return 'Heavy';
  if (score >= 10) return 'Mild';
  return 'Clean';
}

function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function aggregateSiteScores(pages: SitePageScore[] = []): {
  status: 'ok' | 'insufficient_pages';
  homepageScore: number | null;
  homepageTier: string | null;
  siteScore: number | null;
  siteTier: string | null;
  verdict: 'aligned' | 'mixed' | 'site-only' | 'insufficient';
  pre2022HeavyRate: null;
  pre2022HeavyRateStatus: 'unmeasured';
  eligiblePages: number;
  totalPages: number;
} {
  const eligible = pages.filter((page) => page.eligible && typeof page.score === 'number');
  const home = pages.find((page) => page.homepage) || pages[0] || null;
  const base = {
    homepageScore: home && typeof home.score === 'number' ? home.score : null,
    homepageTier:
      home && typeof home.score === 'number' ? home.tier || designTier(home.score) : null,
    pre2022HeavyRate: null as null,
    pre2022HeavyRateStatus: 'unmeasured' as const,
    eligiblePages: eligible.length,
    totalPages: pages.length,
  };
  if (eligible.length === 0) {
    return {
      ...base,
      status: 'insufficient_pages',
      siteScore: null,
      siteTier: null,
      verdict: 'insufficient',
    };
  }
  const siteScore = median(eligible.map((page) => page.score as number));
  const siteTier = designTier(siteScore);
  let verdict: 'aligned' | 'mixed' | 'site-only' = 'site-only';
  if (base.homepageTier) {
    verdict = base.homepageTier === siteTier ? 'aligned' : 'mixed';
  }
  return {
    ...base,
    status: 'ok',
    siteScore,
    siteTier,
    verdict,
  };
}

export function patternShares(
  findings: TemplateFinding[],
  eligibleUrls: string[]
): Array<{ patternId: string; pages: number; share: number }> {
  const allowed = new Set(eligibleUrls);
  const denom = eligibleUrls.length || 1;
  const byPattern = new Map<string, Set<string>>();
  for (const finding of findings) {
    if (!allowed.has(finding.pageUrl)) continue;
    if (!byPattern.has(finding.patternId)) byPattern.set(finding.patternId, new Set());
    byPattern.get(finding.patternId)!.add(finding.pageUrl);
  }
  return [...byPattern.entries()]
    .map(([patternId, urls]) => ({
      patternId,
      pages: urls.size,
      share: Number((urls.size / denom).toFixed(3)),
    }))
    .sort((a, b) => a.patternId.localeCompare(b.patternId));
}

export function buildRenderedSiteReport(results: any[] = []) {
  const findings: TemplateFinding[] = [];
  for (const result of results) {
    const patterns = Array.isArray(result?.patterns) ? result.patterns : [];
    for (const pattern of patterns) {
      if (!pattern?.triggered) continue;
      findings.push({
        pageUrl: result.finalUrl || result.url,
        patternId: pattern.id,
        domPath: pattern.evidence?.selector || pattern.evidence?.domPath || null,
      });
    }
  }
  const deduped = dedupeTemplateFindings(findings);
  const pages: SitePageScore[] = results.map((result, index) => ({
    url: result?.finalUrl || result?.url || `page-${index + 1}`,
    score: typeof result?.score === 'number' ? result.score : null,
    tier: result?.tier ?? null,
    eligible: typeof result?.score === 'number' && !result?.blocked && !result?.error,
    homepage: index === 0,
  }));
  const aggregate = aggregateSiteScores(pages);
  return {
    ...aggregate,
    rendered: true as const,
    wordGate: 'not-applied' as const,
    templateSuppressed: deduped.suppressed.length,
    patternShares: patternShares(
      deduped.counted,
      pages.filter((page) => page.eligible).map((page) => page.url)
    ),
  };
}

export function formatSiteSummary(report: {
  status: string;
  verdict?: string | null;
  siteScore?: number | null;
  siteTier?: string | null;
  homepageScore?: number | null;
  homepageTier?: string | null;
}): string {
  const rate = 'Pre-2022 Heavy rate: unmeasured.';
  if (report.status !== 'ok') {
    return `Site mode: ${report.status}. No site score. ${rate}`;
  }
  if (report.verdict === 'mixed') {
    return `Site verdict: mixed. Median ${report.siteScore} (${report.siteTier}) beside homepage ${report.homepageScore} (${report.homepageTier}). ${rate}`;
  }
  return `Site verdict: ${report.verdict}. Median ${report.siteScore} (${report.siteTier}) beside homepage ${report.homepageScore} (${report.homepageTier}). ${rate}`;
}
