import { test, expect, describe } from 'vitest';
import {
  aggregateSiteScores,
  buildAeoFixFiles,
  buildAvoidList,
  buildRenderedSiteReport,
  countWords,
  dedupeTemplateFindings,
  diffScanFindings,
  discoverSitePages,
  readFetchedText,
  evaluateRobotsTxt,
  formatAgentReport,
  formatDefaultReport,
  formatGithubReport,
  formatGitlabReport,
  formatJunitReport,
  htmlToCopyInput,
  pageEligibleForSiteScore,
  regressionAgainstBaseline,
  scoreSiteCopy,
  selectSiteSample,
  validateLlmsTxt,
} from '@slop-detect/core';

function prose(n) {
  const parts = [];
  for (let i = 0; i < 12; i++) {
    parts.push(
      `Page ${n} section ${i} explains how the team reviews the deploy, checks the logs, and writes down the owner before the next change ships to production.`
    );
  }
  parts.push(
    'Primary navigation lists Product Pricing Docs and Login for every page on this marketing site.'
  );
  return parts.join(' ');
}

describe('site sample and copy aggregate', () => {
  test('keeps the seed, prefers the sitemap, and drops other origins', () => {
    const sample = selectSiteSample('https://example.com/home', {
      max: 5,
      sitemapUrls: ['https://example.com/docs', 'https://other.example/nope'],
      linkUrls: ['https://example.com/about', 'https://example.com/docs'],
    });
    expect(sample.urls).toEqual([
      'https://example.com/home',
      'https://example.com/docs',
      'https://example.com/about',
    ]);
    expect(sample.rejectedOffOrigin).toBe(1);
    expect(sample.sources.map((row) => row.source)).toEqual(['seed', 'sitemap', 'link']);
  });

  test('caps the sample at 15 and at the requested size', () => {
    const links = Array.from({ length: 20 }, (_, i) => `https://example.com/p${i}`);
    const capped = selectSiteSample('https://example.com/', { max: 3, linkUrls: links });
    expect(capped.urls).toHaveLength(3);
    expect(capped.capped).toBe(true);
    expect(
      selectSiteSample('https://example.com/', { max: 99, linkUrls: links }).urls.length
    ).toBeLessThanOrEqual(15);
  });

  test('discovers sitemap and same-origin links without a browser', async () => {
    const pages = {
      'https://example.com/sitemap.xml':
        '<urlset><loc>https://example.com/docs</loc><loc>https://evil.test/no</loc></urlset>',
      'https://example.com/': '<a href="/pricing">Pricing</a><a href="mailto:a@b.c">mail</a>',
    };
    const fetchImpl = async (url) => ({
      ok: true,
      text: async () => pages[String(url)] || '',
    });
    const plan = await discoverSitePages('https://example.com/', fetchImpl, { max: 5 });
    expect(plan.urls).toContain('https://example.com/');
    expect(plan.urls).toContain('https://example.com/docs');
    expect(plan.urls).toContain('https://example.com/pricing');
    expect(plan.urls.some((url) => url.includes('evil.test'))).toBe(false);
  });

  test('a redirect keeps the final origin and a rejected sitemap body does not throw', async () => {
    const fetchImpl = async (url) => {
      const href = String(url);
      if (href.endsWith('/sitemap.xml')) {
        return {
          ok: true,
          text: async () => {
            throw new Error('sitemap body failed');
          },
        };
      }
      if (href === 'https://example.com/start') {
        return {
          ok: true,
          url: 'https://www.example.com/start',
          text: async () => '<a href="/pricing">Pricing</a>',
        };
      }
      return { ok: true, text: async () => '' };
    };
    const plan = await discoverSitePages('https://example.com/start', fetchImpl, { max: 5 });
    expect(plan.urls[0]).toBe('https://www.example.com/start');
    expect(plan.urls).toContain('https://www.example.com/pricing');
    expect(plan.urls.some((url) => url.startsWith('https://example.com/'))).toBe(false);
  });

  test('readFetchedText stops at 200_000 characters and cancels the rest', async () => {
    const chunk = new TextEncoder().encode('x'.repeat(50_000));
    let reads = 0;
    let cancelled = false;
    const text = await readFetchedText({
      ok: true,
      body: {
        getReader: () => ({
          read: async () => {
            reads += 1;
            if (reads > 8) return { done: true };
            return { done: false, value: chunk };
          },
          cancel: async () => {
            cancelled = true;
          },
        }),
      },
    });
    expect(text.length).toBe(200_000);
    expect(reads).toBe(4);
    expect(cancelled).toBe(true);
  });

  test('eligibility needs 50 words and a structural element', () => {
    expect(pageEligibleForSiteScore({ visibleWords: 49, hasH1: true }).eligible).toBe(false);
    expect(pageEligibleForSiteScore({ visibleWords: 50, hasH1: false }).eligible).toBe(false);
    expect(pageEligibleForSiteScore({ visibleWords: 50, hasMain: true }).eligible).toBe(true);
  });

  test('a shared template selector counts once', () => {
    const deduped = dedupeTemplateFindings([
      { pageUrl: 'https://example.com/', patternId: 'purple_accent', domPath: 'header > a' },
      { pageUrl: 'https://example.com/docs', patternId: 'purple_accent', domPath: 'header > a' },
      { pageUrl: 'https://example.com/docs', patternId: 'purple_accent', domPath: 'main > a' },
      { pageUrl: 'https://example.com/', patternId: 'slop_fonts' },
      { pageUrl: 'https://example.com/docs', patternId: 'slop_fonts' },
    ]);
    expect(deduped.counted).toHaveLength(4);
    expect(deduped.suppressed).toHaveLength(1);
  });

  test('an AI homepage beside clean docs is mixed, not Heavy', () => {
    const report = aggregateSiteScores([
      { url: 'https://example.com/', score: 40, tier: 'Heavy', eligible: true, homepage: true },
      { url: 'https://example.com/docs', score: 0, tier: 'Clean', eligible: true },
      { url: 'https://example.com/guide', score: 2, tier: 'Clean', eligible: true },
      { url: 'https://example.com/blog', score: 1, tier: 'Clean', eligible: true },
      { url: 'https://example.com/about', score: 0, tier: 'Clean', eligible: true },
    ]);
    expect(report.verdict).toBe('mixed');
    expect(report.siteTier).not.toBe('Heavy');
    expect(report.pre2022HeavyRate).toBeNull();
    expect(report.homepageTier).toBe('Heavy');
  });

  test('rendered site report dedupes and does not invent a pre-2022 rate', () => {
    const report = buildRenderedSiteReport([
      {
        url: 'https://example.com/',
        score: 40,
        tier: 'Heavy',
        patterns: [{ id: 'purple_accent', triggered: true, evidence: { selector: 'header > a' } }],
      },
      {
        url: 'https://example.com/docs',
        score: 0,
        tier: 'Clean',
        patterns: [{ id: 'purple_accent', triggered: true, evidence: { selector: 'header > a' } }],
      },
    ]);
    expect(report.templateSuppressed).toBe(1);
    expect(report.patternShares).toEqual([{ patternId: 'purple_accent', pages: 1, share: 0.5 }]);
    expect(report.wordGate).toBe('not-applied');
    expect(report.pre2022HeavyRate).toBeNull();
    expect(report.verdict).toBe('mixed');
  });

  test('static HTML copy aggregate reports insufficient pages and an unmeasured rate', () => {
    const html = `<html lang="en"><script>secret token</script><h1>Hello</h1><p>${prose(1)}</p></html>`;
    const page = htmlToCopyInput(html, 'one.html');
    expect(page.text).not.toMatch(/secret token/);
    expect(page.headings).toEqual(['Hello']);
    const tooFew = scoreSiteCopy([prose(1), prose(2), prose(3)]);
    expect(tooFew.status).toBe('insufficient_pages');
    expect(tooFew.score).toBeNull();
    expect(tooFew.rendered).toBe(false);
    expect(tooFew.pre2022HeavyRate).toBeNull();
    const enough = scoreSiteCopy([prose(1), prose(2), prose(3), prose(4), prose(5)]);
    expect(enough.status).toBe('ok');
    expect(typeof enough.score).toBe('number');
    expect(enough.pre2022HeavyRateStatus).toBe('unmeasured');
  });
});

describe('avoid list and diff', () => {
  test('names every triggered pattern in at most 120 words', () => {
    const pages = [1, 2, 3, 4, 5].map((n) => ({
      url: `https://example.com/${n}`,
      score: 30 + n,
      tier: 'Heavy',
      patterns: [
        {
          id: 'numbered_steps',
          triggered: true,
          label: 'Numbered steps',
          evidence: { samples: [`SEC 0.${n}`] },
        },
        {
          id: 'purple_accent',
          triggered: true,
          label: 'Purple accent',
          evidence: { samples: ['#6366f1'] },
        },
      ],
    }));
    for (const page of pages) {
      const text = buildAvoidList(page);
      expect(countWords(text)).toBeLessThanOrEqual(120);
      expect(text).toMatch(/numbered_steps/);
      expect(text).toMatch(/purple_accent/);
      expect(text).toMatch(/SEC 0\./);
      expect(text).toMatch(/#6366f1/);
    }
    const blocked = buildAvoidList({ blocked: true, score: null });
    expect(blocked).toMatch(/not a Clean score/);
  });

  test('diff lists removed patterns and a newly matched kit', () => {
    const before = {
      patterns: [{ id: 'numbered_steps', triggered: true, evidence: { samples: ['SEC 0.1'] } }],
      kitMatches: [],
    };
    const after = {
      patterns: [{ id: 'purple_accent', triggered: true, evidence: { samples: ['#6366f1'] } }],
      kitMatches: [{ id: 'claude-opus-5.5-default', matched: true }],
    };
    const diff = diffScanFindings(before, after);
    expect(diff.removed).toEqual(['numbered_steps']);
    expect(diff.added).toEqual(['purple_accent']);
    expect(diff.kitsAdded).toEqual(['claude-opus-5.5-default']);
    expect(diff.text).toMatch(/numbered_steps/);
    expect(diff.text).toMatch(/claude-opus-5\.5-default/);
    expect(countWords(diff.text)).toBeLessThanOrEqual(120);
  });

  test('a regression hook stays silent when the score and patterns do not change', () => {
    const current = {
      score: 4,
      tier: 'Clean',
      patterns: [{ id: 'purple_accent', triggered: false }],
    };
    expect(regressionAgainstBaseline(null, current).silent).toBe(true);
    expect(regressionAgainstBaseline({ score: 4, patterns: [] }, current).silent).toBe(true);
    const worse = regressionAgainstBaseline(
      { score: 4, patterns: [] },
      { score: 40, tier: 'Heavy', patterns: [{ id: 'purple_accent', triggered: true }] }
    );
    expect(worse.silent).toBe(false);
    expect(worse.text).toMatch(/40/);
    expect(worse.text).toMatch(/purple_accent/);
  });
});

describe('reporters and AEO starter files', () => {
  const heavy = {
    url: 'https://example.com/',
    score: 42,
    tier: 'Heavy',
    patterns: [
      {
        id: 'purple_accent',
        label: 'Purple accent',
        weight: 8,
        status: 'fail',
        triggered: true,
        evidence: { selector: '.cta', samples: ['#6366f1'] },
      },
      {
        id: 'eyebrow_label',
        label: 'Eyebrow',
        weight: 0,
        status: 'review',
        triggered: true,
        evidence: { samples: ['SEC 0.1'] },
      },
    ],
  };

  test('agent output is one line per finding and much shorter than the long report', () => {
    const agent = formatAgentReport(heavy);
    const lines = agent.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^purple_accent \.cta: #6366f1 → /);
    expect(formatAgentReport({ blocked: true, score: null })).toMatch(/not a Clean score/);
    expect(agent.length).toBeLessThanOrEqual(Math.floor(formatDefaultReport(heavy).length * 0.25));
  });

  test('github, junit, and gitlab keep review findings out of the error channel', () => {
    const github = formatGithubReport(heavy);
    expect(github).toMatch(/::error title=purple_accent::/);
    expect(github).toMatch(/::warning title=eyebrow_label::/);
    expect(github).not.toMatch(/\n\n/);
    const junit = formatJunitReport(heavy);
    expect(junit).toMatch(/<failure /);
    expect(junit).toMatch(/<skipped message="review"/);
    const gitlab = JSON.parse(formatGitlabReport(heavy));
    expect(gitlab.map((row) => row.severity)).toEqual(['major', 'info']);
    expect(gitlab[0].fingerprint).toBe(JSON.parse(formatGitlabReport(heavy))[0].fingerprint);
  });

  test('AEO starter files are stable, valid, and do not allow each bot', () => {
    const first = buildAeoFixFiles({ origin: 'https://example.com', siteName: 'Example' });
    const second = buildAeoFixFiles({ origin: 'https://example.com', siteName: 'Example' });
    expect(first).toEqual(second);
    const allowLines = first['robots.txt']
      .split('\n')
      .filter((line) => /^allow\s*:/i.test(line.trim()));
    expect(allowLines).toEqual(['Allow: /']);
    expect(first['robots.txt']).not.toMatch(/^Allow: \/.*\nUser-agent: GPTBot/m);
    const robots = evaluateRobotsTxt(first['robots.txt']);
    expect(robots.searchAllowed).toBe(true);
    expect(robots.trainingBlocked).toContain('gptbot');
    expect(robots.warning).toBeNull();
    const llms = validateLlmsTxt(first['llms.txt'], 'text/plain');
    expect(llms.valid).toBe(true);
    expect(first['llms.txt'].startsWith('# Example')).toBe(true);
    expect(first['ard.json']).toMatch(/Starter agent discovery record/);
    expect(first['link-headers.txt']).toMatch(/Link: </);
    expect(first['link-headers.txt']).not.toMatch(/^Vary:/m);
  });
});
