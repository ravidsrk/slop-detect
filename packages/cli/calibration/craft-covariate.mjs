#!/usr/bin/env node
// K-07 (#302) — Offline Craft-Covariate Analysis & `time_and_number_anchors` Specificity Oracle
//
// IMPORTANT GOVERNANCE NOTE:
// `time_and_number_anchors` is evaluated EXCLUSIVELY offline inside the calibration
// pipeline as a specificity covariate. It is intentionally NEVER shipped as a live
// scoring rule in `@slop-detect/core` because an agent or template author could
// trivially game a live rule by inserting arbitrary years or numbers (Goodhart's Law).
//
// Usage:
//   node packages/cli/calibration/craft-covariate.mjs [--input <results.json>] [--json] [--self-test]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const YEAR_RE = /\b(?:19[7-9]\d|20[0-3]\d)\b/g;
const ISO_DATE_RE = /\b20\d\d-(?:0[1-9]|1[0-2])(?:-[0-3]\d)?\b/g;
const CURRENCY_RE = /(?:[$€£¥]\s?\d[\d,]*(?:\.\d+)?|\b\d[\d,]*(?:\.\d+)?\s*(?:USD|EUR|GBP|JPY)\b)/gi;
const UNIT_RE =
  /\b\d+(?:\.\d+)?\s*(?:ms|ns|us|µs|s|sec|min|hr|kb|mb|gb|tb|mib|gib|hz|khz|mhz|ghz|px|rem|mm|cm|g|kg|bps|kbps|mbps|gbps|rps|qps|%)\b/gi;
const SEMVER_RE = /\bv?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\b/g;

/**
 * Compute the offline-only `time_and_number_anchors` specificity covariate on body text.
 * @param {string} text
 */
export function computeTimeAndNumberAnchors(text) {
  const raw = typeof text === 'string' ? text : '';
  const words = raw
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const wordCount = words.length;

  const years = raw.match(YEAR_RE) || [];
  const isoDates = raw.match(ISO_DATE_RE) || [];
  const currencies = raw.match(CURRENCY_RE) || [];
  const units = raw.match(UNIT_RE) || [];
  const semvers = raw.match(SEMVER_RE) || [];

  const totalAnchors =
    years.length + isoDates.length + currencies.length + units.length + semvers.length;
  const anchorsPer100Words =
    wordCount > 0 ? Number(((totalAnchors / wordCount) * 100).toFixed(3)) : 0;
  // Saturating specificity index in [0, 1] where 6+ anchors per 100 words approaches 1.0
  const specificityIndex = Number((1 - Math.exp(-anchorsPer100Words / 3.0)).toFixed(4));

  return {
    covariateId: 'time_and_number_anchors',
    offlineOnly: true,
    wordCount,
    totalAnchors,
    anchorsPer100Words,
    specificityIndex,
    breakdown: {
      years: years.length,
      isoDates: isoDates.length,
      currencies: currencies.length,
      units: units.length,
      semvers: semvers.length,
    },
  };
}

/**
 * Compute visual & structural craft covariates from a calibration scan record.
 * Approximates Hasler-Süsstrunk colourfulness, edge/border density, and whitespace ratio.
 * @param {Record<string, any>} record
 */
export function computeVisualStructuralCovariates(record = {}) {
  const colourfulness =
    typeof record.colourfulness === 'number'
      ? record.colourfulness
      : typeof record.metrics?.colourfulness === 'number'
        ? record.metrics.colourfulness
        : 0.32;
  const edgeDensity =
    typeof record.edgeDensity === 'number'
      ? record.edgeDensity
      : typeof record.metrics?.edgeDensity === 'number'
        ? record.metrics.edgeDensity
        : 0.14;
  const whitespaceRatio =
    typeof record.whitespaceRatio === 'number'
      ? record.whitespaceRatio
      : typeof record.metrics?.whitespaceRatio === 'number'
        ? record.metrics.whitespaceRatio
        : 0.48;

  return {
    colourfulness: Number(colourfulness.toFixed(4)),
    edgeDensity: Number(edgeDensity.toFixed(4)),
    whitespaceRatio: Number(whitespaceRatio.toFixed(4)),
  };
}

function rankWithTies(values) {
  const indexed = values.map((v, idx) => ({ v: Number(v) || 0, idx }));
  indexed.sort((a, b) => a.v - b.v);
  const ranks = new Array(values.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) j++;
    const avgRank = (i + j + 2) / 2;
    for (let k = i; k <= j; k++) ranks[indexed[k].idx] = avgRank;
    i = j + 1;
  }
  return ranks;
}

/**
 * Compute Spearman rank correlation coefficient rho in [-1, 1].
 * @param {number[]} xs
 * @param {number[]} ys
 */
export function spearmanRho(xs, ys) {
  if (!Array.isArray(xs) || !Array.isArray(ys) || xs.length !== ys.length || xs.length < 2) {
    return 0;
  }
  const rx = rankWithTies(xs);
  const ry = rankWithTies(ys);
  const n = xs.length;
  const meanX = (n + 1) / 2;
  const meanY = (n + 1) / 2;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = rx[i] - meanX;
    const dy = ry[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : Number((num / den).toFixed(4));
}

/**
 * Evaluate K-07 craft covariates across a list of calibration records.
 * @param {Array<Record<string, any>>} records
 */
export function evaluateCraftCovariateReport(records = []) {
  const enriched = records.map((rec) => {
    const anchors = computeTimeAndNumberAnchors(rec.text || rec.bodyText || '');
    const visual = computeVisualStructuralCovariates(rec);
    return {
      url: rec.url || rec.id || 'unknown',
      stratum: rec.stratum || 'a',
      designScore: Number(rec.designScore ?? rec.score ?? 0),
      copyScore: Number(rec.copyScore ?? rec.axes?.copy?.score ?? 0),
      anchors,
      visual,
    };
  });

  const designScores = enriched.map((r) => r.designScore);
  const copyScores = enriched.map((r) => r.copyScore);
  const specificity = enriched.map((r) => r.anchors.specificityIndex);
  const colourfulness = enriched.map((r) => r.visual.colourfulness);
  const edgeDensity = enriched.map((r) => r.visual.edgeDensity);
  const whitespaceRatio = enriched.map((r) => r.visual.whitespaceRatio);

  const byStratum = {};
  for (const r of enriched) {
    if (!byStratum[r.stratum]) {
      byStratum[r.stratum] = {
        count: 0,
        meanDesignScore: 0,
        meanCopyScore: 0,
        meanAnchorsPer100Words: 0,
        meanSpecificityIndex: 0,
      };
    }
    const bucket = byStratum[r.stratum];
    bucket.count += 1;
    bucket.meanDesignScore += r.designScore;
    bucket.meanCopyScore += r.copyScore;
    bucket.meanAnchorsPer100Words += r.anchors.anchorsPer100Words;
    bucket.meanSpecificityIndex += r.anchors.specificityIndex;
  }
  for (const s of Object.keys(byStratum)) {
    const b = byStratum[s];
    b.meanDesignScore = Number((b.meanDesignScore / b.count).toFixed(2));
    b.meanCopyScore = Number((b.meanCopyScore / b.count).toFixed(2));
    b.meanAnchorsPer100Words = Number((b.meanAnchorsPer100Words / b.count).toFixed(3));
    b.meanSpecificityIndex = Number((b.meanSpecificityIndex / b.count).toFixed(4));
  }

  return {
    protocolVersion: '2026.11-K07',
    sampleSize: enriched.length,
    offlineOnlyCovariates: ['time_and_number_anchors', 'colourfulness', 'edgeDensity', 'whitespaceRatio'],
    correlations: {
      designScore_vs_specificityIndex_rho: spearmanRho(designScores, specificity),
      copyScore_vs_specificityIndex_rho: spearmanRho(copyScores, specificity),
      designScore_vs_colourfulness_rho: spearmanRho(designScores, colourfulness),
      designScore_vs_edgeDensity_rho: spearmanRho(designScores, edgeDensity),
      designScore_vs_whitespaceRatio_rho: spearmanRho(designScores, whitespaceRatio),
    },
    byStratum,
    records: enriched,
  };
}

const SYNTHETIC_CALIBRATION_FIXTURES = [
  {
    url: 'https://linear.app',
    stratum: 'p',
    designScore: 6,
    copyScore: 0,
    colourfulness: 0.18,
    edgeDensity: 0.21,
    whitespaceRatio: 0.56,
    text: 'Linear 2026 release v2.14.0 reduces sync latency to 14ms p99 across 25,000 issues ($8/user/month). Shipped 2026-03-15.',
  },
  {
    url: 'https://stripe.com',
    stratum: 'p',
    designScore: 4,
    copyScore: 0,
    colourfulness: 0.29,
    edgeDensity: 0.19,
    whitespaceRatio: 0.52,
    text: 'Stripe API version 2026-02-28 processes $1.4T annually at 99.999% uptime with 120ms median authorization latency.',
  },
  {
    url: 'https://craft-studio.example',
    stratum: 'a',
    designScore: 3,
    copyScore: 2,
    colourfulness: 0.22,
    edgeDensity: 0.16,
    whitespaceRatio: 0.61,
    text: 'Model 04 machined in 2025 from 6061-T6 aluminum (24.2g, 9.4mm grip, $42 USD). Batch 2026-01.',
  },
  {
    url: 'https://v0-default-saas.example',
    stratum: 'b',
    designScore: 39,
    copyScore: 24,
    colourfulness: 0.54,
    edgeDensity: 0.09,
    whitespaceRatio: 0.37,
    text: 'Supercharge your workflow with our seamless next-generation platform. Unlock effortless productivity and transform your journey today.',
  },
  {
    url: 'https://lovable-ai-gateway.example',
    stratum: 'b',
    designScore: 44,
    copyScore: 29,
    colourfulness: 0.61,
    edgeDensity: 0.08,
    whitespaceRatio: 0.34,
    text: 'Unleash the power of modern AI orchestration. Built for modern teams to delve into a seamless landscape of innovation.',
  },
  {
    url: 'https://shadcn-default-template.example',
    stratum: 't',
    designScore: 26,
    copyScore: 14,
    colourfulness: 0.41,
    edgeDensity: 0.12,
    whitespaceRatio: 0.42,
    text: 'Everything you need to scale your business effortlessly. Simple pricing for teams of all sizes.',
  },
];

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(
      'Usage: node packages/cli/calibration/craft-covariate.mjs [--input <file.json>] [--json] [--self-test]'
    );
    process.exit(0);
  }

  let records = SYNTHETIC_CALIBRATION_FIXTURES;
  const inputIdx = args.indexOf('--input');
  if (inputIdx >= 0 && args[inputIdx + 1]) {
    const raw = JSON.parse(fs.readFileSync(path.resolve(args[inputIdx + 1]), 'utf8'));
    records = Array.isArray(raw) ? raw : raw.records || raw.results || [];
  }

  const report = evaluateCraftCovariateReport(records);

  if (args.includes('--self-test')) {
    if (report.correlations.copyScore_vs_specificityIndex_rho >= 0) {
      console.error('Expected negative correlation between copyScore and specificityIndex');
      process.exit(1);
    }
  }

  if (args.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log('# K-07 Craft-Covariate & Specificity Oracle Report');
  console.log(`Sample size: ${report.sampleSize}`);
  console.log(
    `Spearman rho (designScore vs time_and_number_anchors): ${report.correlations.designScore_vs_specificityIndex_rho}`
  );
  console.log(
    `Spearman rho (copyScore   vs time_and_number_anchors): ${report.correlations.copyScore_vs_specificityIndex_rho}`
  );
  console.log('\nStratum summary:');
  for (const [stratum, stats] of Object.entries(report.byStratum)) {
    console.log(
      `  [${stratum}] n=${stats.count} | design=${stats.meanDesignScore} | copy=${stats.meanCopyScore} | anchors/100w=${stats.meanAnchorsPer100Words} | specificity=${stats.meanSpecificityIndex}`
    );
  }
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main();
}
