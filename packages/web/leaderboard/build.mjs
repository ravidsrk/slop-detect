#!/usr/bin/env node
// Build the "State of AI Design Slop" dataset (public/leaderboard.json) by
// scanning the curated corpus via the live API. Throttled to respect the
// anonymous per-IP scan limit, with backoff on 429. Writes incrementally so a
// partial run still produces usable data.
//
//   node packages/web/leaderboard/build.mjs
//   SLOP_API=https://staging.example node packages/web/leaderboard/build.mjs
//   SLOP_API_KEY=sk_live_... node ...   # a key lifts the per-IP throttle
//
// Output shape: { generatedAt, definitionsVersion, count, scored, stats,
//                 byBuilder, byCategory, sites:[{domain,score,grade,tier,...}] }

import { readFileSync, writeFileSync } from 'node:fs';

const API = process.env.SLOP_API || 'https://slop-detect.com';
const KEY = process.env.SLOP_API_KEY || null;
const SPACING_MS = KEY ? 1500 : 21000; // no key → ~3/min anon limit
const OUT = new URL('../public/leaderboard.json', import.meta.url);
const corpus = JSON.parse(readFileSync(new URL('./corpus.json', import.meta.url)));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function scan(url, attempt = 0) {
  const headers = { 'Content-Type': 'application/json' };
  if (KEY) headers['X-API-Key'] = KEY;
  let res;
  try {
    res = await fetch(`${API}/api/scan`, { method: 'POST', headers, body: JSON.stringify({ url }) });
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

function tierRank(t) { return { Clean: 0, Mild: 1, Heavy: 2 }[t] ?? 1; }

const sites = [];
let i = 0;
for (const entry of corpus.sites) {
  i++;
  const domain = entry.url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  process.stderr.write(`[${i}/${corpus.sites.length}] ${domain} … `);
  const r = await scan(entry.url);
  if (r.error) {
    process.stderr.write(`skip (${r.code || r.error})\n`);
    sites.push({ domain, url: entry.url, builtWith: entry.builtWith, category: entry.category, scored: false, reason: r.code || r.error });
  } else {
    process.stderr.write(`${r.grade} ${r.score} (${r.tier})\n`);
    sites.push({
      domain, url: entry.url, builtWith: entry.builtWith, category: entry.category,
      scored: true, score: r.score, grade: r.grade, tier: r.tier,
      patternsFlagged: r.patternsFlagged, resultUrl: r.resultUrl || null
    });
  }

  // Incremental write so an interrupted run still leaves a usable artifact.
  writeFileSync(OUT, JSON.stringify(buildReport(sites, corpus), null, 2) + '\n');
  if (i < corpus.sites.length) await sleep(SPACING_MS);
}

process.stderr.write(`\nDone. Wrote ${OUT.pathname}\n`);

function buildReport(sites, corpus) {
  const scored = sites.filter((s) => s.scored);
  const avg = (arr) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null);
  const slopCount = scored.filter((s) => s.tier !== 'Clean').length;

  const byBuilder = {};
  for (const s of scored) {
    (byBuilder[s.builtWith] ||= []).push(s.score);
  }
  const builders = Object.fromEntries(Object.entries(byBuilder).map(([k, v]) => [k, { count: v.length, avgScore: avg(v) }]));

  const byCategory = {};
  for (const s of scored) (byCategory[s.category] ||= []).push(s.score);
  const categories = Object.fromEntries(Object.entries(byCategory).map(([k, v]) => [k, { count: v.length, avgScore: avg(v) }]));

  return {
    generatedAt: new Date().toISOString(),
    definitionsVersion: scored[0]?.score != null ? '2026.08' : '2026.08',
    count: sites.length,
    scored: scored.length,
    stats: {
      avgScore: avg(scored.map((s) => s.score)),
      slopShare: scored.length ? Math.round((slopCount / scored.length) * 100) : null,
      cleanCount: scored.filter((s) => s.tier === 'Clean').length,
      mildCount: scored.filter((s) => s.tier === 'Mild').length,
      heavyCount: scored.filter((s) => s.tier === 'Heavy').length
    },
    byBuilder: builders,
    byCategory: categories,
    // Sorted cleanest-first; the page leads with the Hall of Clean.
    sites: sites.slice().sort((a, b) => {
      if (!a.scored && !b.scored) return 0;
      if (!a.scored) return 1;
      if (!b.scored) return -1;
      return a.score - b.score || tierRank(a.tier) - tierRank(b.tier);
    })
  };
}
