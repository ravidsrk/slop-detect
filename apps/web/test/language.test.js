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
import { DomainHeader, BigScore, AxisStrip, Analytics } from '../functions/_result.tsx';
import { badgeSvg } from '../functions/_badge.tsx';
import { setListing, saveResult } from '../functions/_data.ts';
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

  test('/leaderboard and /score/[domain] show grade/tier only when domain is an email-verified directory listing', async () => {
    const kv = makeKv();
    await setListing(kv, {
      domain: 'cal.com',
      listed: true,
      score: 19,
      grade: 'B',
      tier: 'Mild',
      title: 'Cal.com',
      listedAt: '2026-09-15T00:00:00.000Z',
    });

    await withFetch(
      async () => new Response(JSON.stringify(LEADERBOARD_FIXTURE), { status: 200 }),
      async () => {
        // 1. Leaderboard shows cal.com grade because it opted in, but withholds resend.com and clerk.com.
        const lbHtml = await (
          await getLeaderboard({
            request: { url: 'https://slop-detect.com/leaderboard' },
            env: { RESULTS: kv },
          })
        ).text();
        expect(lbHtml).toMatch(/cal\.com[\s\S]{0,280}>B</);
        const unverifiedRows = [...lbHtml.matchAll(/<li class="lr">[\s\S]*?<\/li>/g)]
          .map((m) => m[0])
          .filter((r) => r.includes('resend.com') || r.includes('clerk.com'));
        expect(unverifiedRows.length).toBe(2);
        for (const r of unverifiedRows) {
          expect(r).toMatch(/opt-in required/i);
          expect(r).not.toMatch(/>(A\+|A-|A|B\+|B-|B|C|D\+|D|F)</);
        }

        // 2. Score page for unverified corpus domain (resend.com) withholds grade and tier.
        const resendScoreHtml = await (
          await getScore({
            request: { url: 'https://slop-detect.com/score/resend.com' },
            env: { RESULTS: kv },
            params: { domain: 'resend.com' },
          })
        ).text();
        expect(resendScoreHtml).toMatch(/withheld until the domain owner opts in/i);
        expect(resendScoreHtml).toMatch(/class="bs-num"[^>]*>—</);
        expect(resendScoreHtml).not.toMatch(/resend\.com — Slop Score \d+/);
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

        // User scan result shows full score, grade, tier, and "uncalibrated beta" linked to CALIBRATION.md.
        expect(html).toMatch(/uncalibrated beta/i);
        expect(html).toContain('https://github.com/ravidsrk/slop-detect/blob/main/CALIBRATION.md');
        expect(html).toMatch(/class="bs-num"[^>]*>16<small>\/100<\/small>/);

        // Peer block shows aggregate category statistics and does not print grades/tiers for named corpus peers.
        expect(html).toMatch(/Category aggregate/i);
        const peerLinks = [...html.matchAll(/<a class="nb-row"[\s\S]*?<\/a>/g)]
          .map((m) => m[0])
          .filter((p) => !p.includes('cal.com'));
        expect(peerLinks.length).toBeGreaterThan(0);
        for (const peerHtml of peerLinks) {
          expect(peerHtml).toMatch(/opt-in required/i);
          expect(peerHtml).not.toMatch(/\b(Clean|Mild|Heavy)\b/);
          expect(peerHtml).not.toMatch(/>(A\+|A-|A|B\+|B-|B|C|D\+|D|F)</);
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
    const svg = badgeSvg({ score: 12, grade: 'B+', tier: 'Mild' });
    expect(svg).toMatch(/uncalibrated beta/i);

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

    const mcpAeo = formatAeo({
      url: 'https://example.com',
      aeo: {
        score: 80,
        grade: 'A-',
        tier: 'AEO-Ready',
        verdict: 'Ready',
        passed: 6,
        total: 8,
        checks: [],
      },
    });
    expect(mcpAeo).toMatch(/uncalibrated beta/i);

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

    const scanApiSrc = readFileSync(join(ROOT, 'apps/web/functions/api/scan.ts'), 'utf8');
    expect(scanApiSrc).toMatch(/calibration:\s*['"]uncalibrated-beta['"]/);
  });
});
