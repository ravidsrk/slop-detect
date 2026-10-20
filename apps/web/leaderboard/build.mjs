#!/usr/bin/env node
// Build the "State of AI Design Slop" dataset (public/leaderboard.json) by
// scanning the curated corpus via the live API. Throttled to respect the
// anonymous per-IP scan limit, with backoff on 429. Writes incrementally so a
// partial run still produces usable data.
//
//   node apps/web/leaderboard/build.mjs
//   bun apps/web/leaderboard/build.mjs --local
//   node apps/web/leaderboard/build.mjs --local
//     # node cannot import detector.ts. Build the CLI first:
//     #   bun run --filter slop-detect build
//   SLOP_API=https://staging.example node apps/web/leaderboard/build.mjs
//   SLOP_API_KEY=sk_live_... node ...   # a key lifts the per-IP throttle
//
// Output shape: { generatedAt, definitionsVersion, count, scored, stats,
//                 byBuilder, byCategory, patternPrevalence,
//                 sites:[{domain,score,grade,tier,flaggedPatterns,...}] }

import { readFileSync, writeFileSync } from 'node:fs';
import { DEFINITIONS_VERSION } from '@slop-detect/core';
import { buildReport, flaggedPatternIds, loadLocalScanUrl } from './report.mjs';

const args = process.argv.slice(2);
const local = args.includes('--local');

const API = process.env.SLOP_API || 'https://slop-detect.com';
const KEY = process.env.SLOP_API_KEY || null;
const SPACING_MS = local ? 0 : KEY ? 1500 : 21000; // no key → ~3/min anon limit
const OUT = process.env.LEADERBOARD_OUT
  ? new URL(process.env.LEADERBOARD_OUT, 'file:///')
  : new URL('../public/leaderboard.json', import.meta.url);
const corpus = JSON.parse(readFileSync(new URL('./corpus.json', import.meta.url)));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let localScanUrl = null;
if (local) {
  try {
    localScanUrl = await loadLocalScanUrl();
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.exit(1);
  }
}

async function scan(url, attempt = 0) {
  if (local) {
    try {
      return await localScanUrl(url, { axes: ['design'] });
    } catch (e) {
      return { error: e.message || String(e), code: e.code };
    }
  }
  const headers = { 'Content-Type': 'application/json' };
  if (KEY) headers['X-API-Key'] = KEY;
  let res;
  try {
    res = await fetch(`${API}/api/scan`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url }),
    });
  } catch (e) {
    return { error: `network: ${e.message}` };
  }
  if (res.status === 429 && attempt < 4) {
    const wait = 60000 * (attempt + 1);
    process.stderr.write(`  429 — backing off ${wait / 1000}s\n`);
    await sleep(wait);
    return scan(url, attempt + 1);
  }
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) return { error: data.error || `HTTP ${res.status}`, code: data.code };
  return data;
}

const sites = [];
let i = 0;
for (const entry of corpus.sites) {
  i++;
  const domain = entry.url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');
  process.stderr.write(`[${i}/${corpus.sites.length}] ${domain} … `);
  const r = await scan(entry.url);
  if (r.error) {
    process.stderr.write(`skip (${r.code || r.error})\n`);
    sites.push({
      domain,
      url: entry.url,
      builtWith: entry.builtWith,
      category: entry.category,
      scored: false,
      reason: r.code || r.error,
    });
  } else {
    process.stderr.write(`${r.grade} ${r.score} (${r.tier})\n`);
    sites.push({
      domain,
      url: entry.url,
      builtWith: entry.builtWith,
      category: entry.category,
      scored: true,
      score: r.score,
      grade: r.grade,
      tier: r.tier,
      patternsFlagged: r.patternsFlagged,
      flaggedPatterns: flaggedPatternIds(r),
      resultUrl: r.resultUrl || null,
    });
  }

  // Incremental write so an interrupted run still leaves a usable artifact.
  writeFileSync(OUT, JSON.stringify(buildReport(sites, DEFINITIONS_VERSION), null, 2) + '\n');
  if (i < corpus.sites.length && SPACING_MS > 0) await sleep(SPACING_MS);
}

process.stderr.write(`\nDone. Wrote ${OUT.pathname}\n`);
