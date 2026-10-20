// K-06 & FIX-04 guardrails:
// 1. User-facing product strings never claim a page or its author is AI-made.
// 2. Leaderboard, score pages, and result-page peer blocks never print a tier or
//    grade for a third-party domain without email-verified directory opt-in, and
//    every score carries the literal "uncalibrated beta" label.

import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { VERDICTS, verdictFor } from '../../../packages/core/src/verdict.ts';
import { onRequestGet as getLeaderboard } from '../functions/leaderboard.tsx';
import { onRequestGet as getScore } from '../functions/score/[domain].tsx';
import { onRequestGet as getResultPage } from '../functions/r/[id].tsx';
import { DomainHeader, BigScore, AxisStrip, Analytics } from '../functions/_result.tsx';
import { badgeSvg } from '../functions/_badge.tsx';
import { setListing, saveResult, putWatch } from '../functions/_data.ts';
import { formatScan, formatAeo, formatSystem } from '../../../packages/mcp/src/format.ts';

const ROOT = resolve(import.meta.dirname, '../../..');
const LEADERBOARD_FIXTURE = JSON.parse(
  readFileSync(join(ROOT, 'apps/web/public/leaderboard.json'), 'utf8')
);

export const BANNED_PHRASES = [
  { label: 'AI-generated', re: /\bAI-generated\b/i },
  { label: 'AI generated', re: /\bAI generated\b/i },
  { label: 'looks AI', re: /\blooks AI\b/i },
  { label: 'assembly line', re: /\bassembly line\b/i },
  { label: 'not generated', re: /\bnot generated\b/i },
  { label: 'detect AI', re: /\bdetect AI\b/i },
];

function walkFiles(dir, extRe = /\.(ts|tsx|js|mjs|md|html|json)$/) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walkFiles(full, extRe));
    } else if (extRe.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

export function scanTextForBannedPhrases(text, fileLabel = '<inline>') {
  const violations = [];
  const lines = String(text).split('\n');
  lines.forEach((line, idx) => {
    for (const { label, re } of BANNED_PHRASES) {
      if (re.test(line)) {
        violations.push(`${fileLabel}:${idx + 1}: banned phrase "${label}" in: ${line.trim()}`);
      }
    }
  });
  return violations;
}

function makeKv() {
  const store = new Map();
  const meta = new Map();
  return {
    async get(k) {
      return store.has(k) ? store.get(k) : null;
    },
    async getWithMetadata(k) {
      return {
        value: store.has(k) ? store.get(k) : null,
        metadata: meta.get(k) || null,
      };
    },
    async put(k, v, opts) {
      store.set(k, v);
      if (opts && opts.metadata) meta.set(k, opts.metadata);
    },
    async delete(k) {
      store.delete(k);
      meta.delete(k);
    },
    async list({ prefix = '', cursor } = {}) {
      const keys = [];
      for (const k of store.keys()) {
        if (k.startsWith(prefix)) {
          keys.push({ name: k, metadata: meta.get(k) || undefined });
        }
      }
      return { keys, list_complete: true, cursor: undefined };
    },
  };
}

function withFetch(impl, fn) {
  const orig = globalThis.fetch;
  globalThis.fetch = impl;
  return Promise.resolve(fn()).finally(() => {
    globalThis.fetch = orig;
  });
}

describe('K-06: product copy never claims a page or its author is AI-made', () => {
  test('user-facing product files contain zero banned authorship claims', () => {
    // Allowlist: quoted research under docs/ and spec/ may contain those phrases;
    // product copy (including every .html, .md, and .txt under apps/web/public) may not.
    const ALLOWLIST_PREFIXES = ['docs/', 'spec/'];
    const rawFiles = [
      join(ROOT, 'packages/core/src/verdict.ts'),
      join(ROOT, 'packages/core/src/fixes.ts'),
      join(ROOT, 'packages/core/src/patterns.ts'),
      join(ROOT, 'packages/core/src/fonts.ts'),
      ...walkFiles(join(ROOT, 'apps/web/public'), /\.(html|md|txt)$/),
      ...walkFiles(join(ROOT, 'apps/web/functions')),
      ...walkFiles(join(ROOT, 'skills')),
      ...walkFiles(join(ROOT, 'packages/mcp/src')),
      ...walkFiles(join(ROOT, 'packages/cli/bin')),
      ...walkFiles(join(ROOT, 'packages/cli/src')),
    ];
    const productFiles = rawFiles.filter((f) => {
      const rel = relative(ROOT, f);
      return !ALLOWLIST_PREFIXES.some((prefix) => rel.startsWith(prefix));
    });

    const violations = [];
    for (const file of productFiles) {
      const rel = relative(ROOT, file);
      const content = readFileSync(file, 'utf8');
      violations.push(...scanTextForBannedPhrases(content, rel));
    }

    expect(violations, violations.join('\n')).toEqual([]);
  });

  test('verdict strings describe default-template pattern overlap, never authorship', () => {
    for (const tier of ['Clean', 'Mild', 'Heavy']) {
      const pool = VERDICTS[tier];
      expect(Array.isArray(pool) && pool.length > 0).toBe(true);
      for (const line of pool) {
        expect(scanTextForBannedPhrases(line, `VERDICTS.${tier}`)).toEqual([]);
        expect(line).toMatch(/default-template patterns/i);
      }
      const picked = verdictFor(15, tier, ['ai_default_font']);
      expect(scanTextForBannedPhrases(picked, `verdictFor(${tier})`)).toEqual([]);
    }
  });

  test('scanner rejects banned authorship phrases when present', () => {
    expect(scanTextForBannedPhrases('This page looks AI-generated').length).toBeGreaterThan(0);
    expect(scanTextForBannedPhrases('Straight off the AI assembly line.').length).toBeGreaterThan(
      0
    );
    expect(scanTextForBannedPhrases('Crafted, not generated.').length).toBeGreaterThan(0);
    expect(scanTextForBannedPhrases('Tool to detect AI pages.').length).toBeGreaterThan(0);
  });
});

describe('FIX-04: no third-party grade/tier without opt-in & uncalibrated beta labels', () => {
  test('/leaderboard renders aggregate statistics from leaderboard.json and withholds grades/tiers for all unverified third-party corpus domains', async () => {
    await withFetch(
      async () => new Response(JSON.stringify(LEADERBOARD_FIXTURE), { status: 200 }),
      async () => {
        const res = await getLeaderboard({
          request: { url: 'https://slop-detect.com/leaderboard' },
          env: {},
        });
        expect(res.status).toBe(200);
        const html = await res.text();

        // Aggregate statistics & per-pattern prevalence are present.
        expect(html).toMatch(/Slop distribution/i);
        expect(html).toMatch(/Per-pattern prevalence/i);
        expect(html).not.toMatch(/Click any band/);
        expect(html).not.toMatch(/data-score=/);
        expect(html).not.toMatch(/data-bucket=/);
        expect(html).toMatch(/patterns triggered/i);
        expect(html).toMatch(/uncalibrated beta/i);
        expect(html).toContain('https://github.com/ravidsrk/slop-detect/blob/main/CALIBRATION.md');

        // Named corpus sites (cal.com, resend.com, clerk.com, bolt.new, stripe.com, etc.)
        // must not appear with a tier or grade on any leaderboard row.
        const rowMatches = [...html.matchAll(/<li class="lr">[\s\S]*?<\/li>/g)].map((m) => m[0]);
        expect(rowMatches.length).toBeGreaterThan(0);
        for (const rowHtml of rowMatches) {
          expect(rowHtml).toMatch(/opt-in required/i);
          expect(rowHtml).not.toMatch(/\b(Clean|Mild|Heavy)\b/);
          expect(rowHtml).not.toMatch(/lr-grade/);
          expect(rowHtml).not.toMatch(/>(A\+|A-|A|B\+|B-|B|C|D\+|D|F)</);
        }

        for (const named of ['cal.com', 'resend.com', 'clerk.com', 'bolt.new']) {
          const namedRow = rowMatches.find((r) => r.includes(named));
          expect(namedRow, `expected corpus row for ${named}`).toBeTruthy();
          expect(namedRow).not.toMatch(/\b(Clean|Mild|Heavy)\b/);
          expect(namedRow).not.toMatch(/>(A\+|A-|A|B\+|B-|B|C|D\+|D|F)</);
        }
      }
    );
  });

  test('/leaderboard renders a per-rule table when the dataset stores flagged pattern ids', async () => {
    const fixture = {
      generatedAt: '2026-10-20T00:00:00.000Z',
      definitionsVersion: '2026.10',
      count: 2,
      scored: 2,
      stats: { avgScore: 8, slopShare: 50, cleanCount: 1, mildCount: 1, heavyCount: 0 },
      byBuilder: {},
      byCategory: {},
      patternPrevalence: { slop_fonts: 2, gradient_text: 1 },
      sites: [
        {
          domain: 'alpha.example',
          category: 'saas',
          scored: true,
          score: 4,
          grade: 'A',
          tier: 'Clean',
          patternsFlagged: 1,
          flaggedPatterns: ['slop_fonts'],
        },
        {
          domain: 'beta.example',
          category: 'saas',
          scored: true,
          score: 12,
          grade: 'B+',
          tier: 'Mild',
          patternsFlagged: 2,
          flaggedPatterns: ['slop_fonts', 'gradient_text'],
        },
      ],
    };
    await withFetch(
      async () => new Response(JSON.stringify(fixture), { status: 200 }),
      async () => {
        const html = await (
          await getLeaderboard({
            request: { url: 'https://slop-detect.com/leaderboard' },
            env: {},
          })
        ).text();
        expect(html).toMatch(/Per-pattern prevalence by rule ID/);
        expect(html).toContain('slop_fonts');
        expect(html).toContain('gradient_text');
        expect(html).not.toMatch(/data-score=/);
        expect(html).not.toMatch(/Click any band/);
      }
    );
  });

  test('/leaderboard and /score/[domain] show grade/tier only when domain is an email-verified directory listing', async () => {
    const kv = makeKv();
    const calSlim = {
      id: 'cal00001',
      url: 'https://cal.com/',
      finalUrl: 'https://cal.com/',
      domain: 'cal.com',
      score: 19,
      grade: 'B',
      tier: 'Mild',
      title: 'Cal.com',
      verdict: verdictFor(19, 'Mild', []),
      patternsFlagged: 3,
      patternsTotal: 27,
      triggered: [],
      createdAt: '2026-09-15T00:00:00.000Z',
    };
    await saveResult(kv, calSlim);
    await setListing(kv, {
      ...calSlim,
      listed: true,
      listedAt: '2026-09-15T00:00:00.000Z',
    });
    await putWatch(kv, {
      domain: 'cal.com',
      listed: true,
      verified: true,
      email: 'owner@cal.com',
    });

    // Case A: saveResult + setListing for a domain (stripe.com) with NO watch record at all.
    const stripeSlim = {
      id: 'stp00001',
      url: 'https://stripe.com/',
      finalUrl: 'https://stripe.com/',
      domain: 'stripe.com',
      score: 19,
      grade: 'B',
      tier: 'Mild',
      title: 'Stripe',
      verdict: verdictFor(19, 'Mild', []),
      patternsFlagged: 4,
      patternsTotal: 27,
      triggered: [{ id: 'slop_fonts', label: 'Default font', weight: 8 }],
      createdAt: '2026-09-15T00:00:00.000Z',
    };
    await saveResult(kv, stripeSlim);
    await setListing(kv, {
      ...stripeSlim,
      listed: true,
      listedAt: '2026-09-15T00:00:00.000Z',
    });

    // Case B: saveResult + setListing + putWatch({ listed: true, verified: false }) for clerk.com.
    const clerkSlim = {
      id: 'clk00001',
      url: 'https://clerk.com/',
      finalUrl: 'https://clerk.com/',
      domain: 'clerk.com',
      score: 46,
      grade: 'F',
      tier: 'Heavy',
      title: 'Clerk',
      verdict: verdictFor(46, 'Heavy', []),
      patternsFlagged: 6,
      patternsTotal: 27,
      triggered: [{ id: 'slop_fonts', label: 'Default font', weight: 8 }],
      createdAt: '2026-09-15T00:00:00.000Z',
    };
    await saveResult(kv, clerkSlim);
    await setListing(kv, {
      ...clerkSlim,
      listed: true,
      listedAt: '2026-09-15T00:00:00.000Z',
    });
    await putWatch(kv, {
      domain: 'clerk.com',
      email: 'unverified@clerk.com',
      listed: true,
      verified: false,
    });

    await withFetch(
      async () => new Response(JSON.stringify(LEADERBOARD_FIXTURE), { status: 200 }),
      async () => {
        // 1. Score page for KV hit + setListing with NO watch (stripe.com) withholds score, grade, and tier.
        const stripeScoreHtml = await (
          await getScore({
            request: { url: 'https://slop-detect.com/score/stripe.com' },
            env: { RESULTS: kv },
            params: { domain: 'stripe.com' },
          })
        ).text();
        expect(stripeScoreHtml).not.toMatch(/scored [A-F][+-]? \(\d+\/100\)/);
        expect(stripeScoreHtml).not.toMatch(/19<small>\/100<\/small>/);
        expect(stripeScoreHtml).not.toMatch(/class="bs-grade"/);
        expect(stripeScoreHtml).not.toMatch(/class="stb-tier"/);
        expect(stripeScoreHtml).not.toMatch(/class="bd-pill"/);
        expect(stripeScoreHtml).not.toMatch(/\b(Clean|Mild|Heavy)\b/);
        expect(stripeScoreHtml).toMatch(/withheld until the domain owner opts in/i);
        expect(stripeScoreHtml).toMatch(/class="bs-num"[^>]*>—</);
        expect(stripeScoreHtml).toMatch(/Category aggregate/i);

        // 2. Score page for KV hit + setListing + putWatch({ listed: true, verified: false }) (clerk.com) withholds score, grade, and tier.
        const clerkScoreHtml = await (
          await getScore({
            request: { url: 'https://slop-detect.com/score/clerk.com' },
            env: { RESULTS: kv },
            params: { domain: 'clerk.com' },
          })
        ).text();
        expect(clerkScoreHtml).not.toMatch(/scored [A-F][+-]? \(\d+\/100\)/);
        expect(clerkScoreHtml).not.toMatch(/46<small>\/100<\/small>/);
        expect(clerkScoreHtml).not.toMatch(/class="bs-grade"/);
        expect(clerkScoreHtml).not.toMatch(/class="stb-tier"/);
        expect(clerkScoreHtml).not.toMatch(/class="bd-pill"/);
        expect(clerkScoreHtml).not.toMatch(/\b(Clean|Mild|Heavy)\b/);
        expect(clerkScoreHtml).toMatch(/withheld until the domain owner opts in/i);
        expect(clerkScoreHtml).toMatch(/class="bs-num"[^>]*>—</);
        expect(clerkScoreHtml).toMatch(/Category aggregate/i);

        // 3. Score page for unverified corpus domain (resend.com) withholds score, grade, and tier.
        const resendScoreHtml = await (
          await getScore({
            request: { url: 'https://slop-detect.com/score/resend.com' },
            env: { RESULTS: kv },
            params: { domain: 'resend.com' },
          })
        ).text();
        expect(resendScoreHtml).toMatch(/withheld until the domain owner opts in/i);
        expect(resendScoreHtml).toMatch(/class="bs-num"[^>]*>—</);
        expect(resendScoreHtml).not.toMatch(/scored [A-F][+-]? \(\d+\/100\)/);
        expect(resendScoreHtml).not.toMatch(/class="bs-grade"/);

        // 4. Score page for email-verified directory listing (cal.com) DOES render score, grade, and tier,
        //    while withholding grades for unverified peers (including stripe.com which has setListing but no watch).
        const calScoreHtml = await (
          await getScore({
            request: { url: 'https://slop-detect.com/score/cal.com' },
            env: { RESULTS: kv },
            params: { domain: 'cal.com' },
          })
        ).text();
        expect(calScoreHtml).toMatch(/class="bs-num"[^>]*>19<small>\/100<\/small>/);
        expect(calScoreHtml).toMatch(/class="bs-grade"[^>]*>B</);
        expect(calScoreHtml).toMatch(/class="stb-tier"[^>]*>MILD</);
        const calPeerLinks = [...calScoreHtml.matchAll(/<a class="nb-row"[\s\S]*?<\/a>/g)].map(
          (m) => m[0]
        );
        expect(calPeerLinks.length).toBeGreaterThan(0);
        for (const peerHtml of calPeerLinks) {
          expect(peerHtml).toMatch(/opt-in required/i);
          expect(peerHtml).not.toMatch(/class="nb-grade"/);
        }

        // 5. Leaderboard shows cal.com grade because it has a verified watch, but withholds resend.com, stripe.com, and clerk.com.
        const lbHtml = await (
          await getLeaderboard({
            request: { url: 'https://slop-detect.com/leaderboard' },
            env: { RESULTS: kv },
          })
        ).text();
        expect(lbHtml).toMatch(/cal\.com[\s\S]{0,280}>B</);
        const calRow = lbHtml.match(/<a class="lr"[\s\S]*?cal\.com[\s\S]*?<\/a>/);
        expect(calRow, 'verified cal.com row').toBeTruthy();
        expect(calRow[0]).toMatch(/class="lr-rank"[\s\S]{0,40}·/);
        expect(calRow[0]).not.toMatch(/sr-only">#</);
        const unverifiedRows = [...lbHtml.matchAll(/<li class="lr">[\s\S]*?<\/li>/g)]
          .map((m) => m[0])
          .filter(
            (r) => r.includes('resend.com') || r.includes('clerk.com') || r.includes('stripe.com')
          );
        expect(unverifiedRows.length).toBe(3);
        for (const r of unverifiedRows) {
          expect(r).toMatch(/opt-in required/i);
          expect(r).not.toMatch(/>(A\+|A-|A|B\+|B-|B|C|D\+|D|F)</);
        }

        // 6. /r/:id for scans the user ran still shows the full result.
        const rStripeHtml = await (
          await getResultPage({
            request: { url: 'https://slop-detect.com/r/stp00001' },
            env: { RESULTS: kv },
            params: { id: 'stp00001' },
          })
        ).text();
        expect(rStripeHtml).toMatch(/class="bs-num"[^>]*>19<small>\/100<\/small>/);
        expect(rStripeHtml).toMatch(/class="bs-grade"[^>]*>B</);
      }
    );
  });

  test('result page peer block shows aggregate category statistics only and user scan result shows uncalibrated beta', async () => {
    const kv = makeKv();
    const userSlim = {
      id: 'usr12345',
      url: 'https://cal.com/',
      finalUrl: 'https://cal.com/',
      domain: 'cal.com',
      score: 16,
      grade: 'B',
      tier: 'Mild',
      verdict: verdictFor(16, 'Mild', []),
      patternsFlagged: 3,
      patternsTotal: 27,
      triggered: [],
      createdAt: '2026-09-15T12:00:00.000Z',
    };
    await saveResult(kv, userSlim);

    // 1. Shareable result of a scan the user just ran (/r/:id) shows full score, grade, tier, and "uncalibrated beta" linked to CALIBRATION.md.
    const rRes = await getResultPage({
      request: { url: 'https://slop-detect.com/r/usr12345' },
      env: { RESULTS: kv },
      params: { id: 'usr12345' },
    });
    expect(rRes.status).toBe(200);
    const rHtml = await rRes.text();
    expect(rHtml).toMatch(/uncalibrated beta/i);
    expect(rHtml).toContain('https://github.com/ravidsrk/slop-detect/blob/main/CALIBRATION.md');
    expect(rHtml).toMatch(/class="bs-num"[^>]*>16<small>\/100<\/small>/);
    expect(rHtml).toMatch(/class="bs-grade"[^>]*>B</);

    // 2. Public /score/[domain] peer block shows aggregate category statistics and does not print grades/tiers for named corpus peers.
    await withFetch(
      async () => new Response(JSON.stringify(LEADERBOARD_FIXTURE), { status: 200 }),
      async () => {
        const res = await getScore({
          request: { url: 'https://slop-detect.com/score/cal.com' },
          env: { RESULTS: kv },
          params: { domain: 'cal.com' },
        });
        expect(res.status).toBe(200);
        const html = await res.text();

        expect(html).toMatch(/uncalibrated beta/i);
        expect(html).toContain('https://github.com/ravidsrk/slop-detect/blob/main/CALIBRATION.md');
        expect(html).toMatch(/Category aggregate/i);
        const peerLinks = [...html.matchAll(/<a class="nb-row"[\s\S]*?<\/a>/g)].map((m) => m[0]);
        expect(peerLinks.length).toBeGreaterThan(0);
        for (const peerHtml of peerLinks) {
          expect(peerHtml).toMatch(/opt-in required/i);
          expect(peerHtml).not.toMatch(/\b(Clean|Mild|Heavy)\b/);
          expect(peerHtml).not.toMatch(/class="nb-grade"/);
        }
      }
    );

    // Direct _result.tsx component render check with third-party peers in neighbors:
    const headerHtml = DomainHeader({
      slim: userSlim,
      monitored: false,
    }).toString();
    const bigHtml = BigScore({
      slim: userSlim,
      origin: 'https://slop-detect.com',
    }).toString();
    const axisHtml = AxisStrip({
      slim: userSlim,
    }).toString();
    const analyticsHtml = Analytics({
      history: [{ t: 1700000000000, s: 16 }],
      slim: userSlim,
      categories: [],
      catAvg: {},
      catAvgCount: 0,
      neighbors: {
        category: 'SaaS & dev tools',
        avgScore: 25.8,
        totalCount: 8,
        rows: [
          { rank: 1, domain: 'cal.com', score: 19, grade: 'B', tier: 'Mild', listed: false },
          { rank: 2, domain: 'resend.com', score: 42, grade: 'F', tier: 'Heavy', listed: false },
          { rank: 3, domain: 'clerk.com', score: 46, grade: 'F', tier: 'Heavy', listed: false },
          {
            rank: 4,
            domain: 'my-own-site.example',
            score: 16,
            grade: 'B',
            tier: 'Mild',
            you: true,
          },
        ],
      },
      origin: 'https://slop-detect.com',
    }).toString();

    expect(headerHtml).toMatch(/uncalibrated beta/i);
    expect(bigHtml).toMatch(/uncalibrated beta/i);
    expect(axisHtml).toMatch(/uncalibrated beta/i);
    expect(analyticsHtml).toMatch(/uncalibrated beta/i);
    expect(analyticsHtml).not.toMatch(/cal\.com[\s\S]{0,120}>B</);
    expect(analyticsHtml).not.toMatch(/resend\.com[\s\S]{0,120}>F</);
    expect(analyticsHtml).not.toMatch(/clerk\.com[\s\S]{0,120}>F</);
  });

  test('badge SVG, MCP text formatters, and scan API response mark every score uncalibrated beta', () => {
    const svg = badgeSvg('ex.com', { score: 12, grade: 'B+', tier: 'Mild' });
    expect(svg).toMatch(/<text[^>]*>B\+ · 12<\/text>/);
    expect(svg).toMatch(/<text[^>]*>uncalibrated beta<\/text>/i);
    expect(svg).toContain(
      'href="https://github.com/ravidsrk/slop-detect/blob/main/CALIBRATION.md"'
    );

    const mcpScan = formatScan({
      url: 'https://example.com',
      finalUrl: 'https://example.com/',
      score: 12,
      grade: 'B+',
      tier: 'Mild',
      verdict: verdictFor('Mild', 'https://example.com/'),
      patternsFlagged: 2,
      patternsTotal: 27,
      patterns: [],
    });
    expect(mcpScan).toMatch(/uncalibrated beta/i);
    expect(mcpScan).toContain('https://github.com/ravidsrk/slop-detect/blob/main/CALIBRATION.md');

    const mcpAeo = formatAeo({
      url: 'https://example.com',
      score: 80,
      maxScore: 100,
      tier: 'AI-Ready',
      requiredFailed: 0,
      recommendedFailed: 2,
      failed: [],
      passed: [],
    });
    expect(mcpAeo).toMatch(/uncalibrated beta/i);
    expect(mcpAeo).toContain('https://github.com/ravidsrk/slop-detect/blob/main/CALIBRATION.md');

    const mcpSystem = formatSystem({
      url: 'https://example.com',
      system: {
        declared: true,
        score: 90,
        grade: 'A',
        tier: 'Aligned',
        verdict: 'Aligned',
        passed: 3,
        total: 3,
        checks: [],
        drift: [],
      },
    });
    expect(mcpSystem).toMatch(/uncalibrated beta/i);
    expect(mcpSystem).toContain('https://github.com/ravidsrk/slop-detect/blob/main/CALIBRATION.md');

    const scanApiSrc = readFileSync(join(ROOT, 'apps/web/functions/api/scan.ts'), 'utf8');
    expect(scanApiSrc).toMatch(/calibration:\s*['"]uncalibrated-beta['"]/);
  });
});
