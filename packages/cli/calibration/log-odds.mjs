#!/usr/bin/env node
// #201 — Reproducible Monroe et al. (2008) "Fightin' Words" Dirichlet-Prior Log-Odds Pipeline
//
// Computes informative Dirichlet-prior log-odds ratios and z-scores for unigrams,
// bigrams, and trigrams contrasting Stratum `b` (prompt-generated default pages)
// against Stratum `a` / `p` (independent hand-crafted & pioneer controls).
//
// Reference:
//   Monroe, B. L., Colaresi, M. P., & Quinn, K. M. (2008). Fightin' words:
//   Lexical feature selection and evaluation for identifying the content of
//   political conflict. Political Analysis, 16(4), 372-403.
//
// Usage:
//   node packages/cli/calibration/log-odds.mjs [--input <corpus-texts.json>] [--top 20] [--json] [--self-test]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'your',
  'you',
  'are',
  'our',
  'all',
  'can',
  'more',
  'into',
  'have',
  'will',
  'not',
  'but',
  'out',
  'use',
  'one',
  'get',
  'any',
  'how',
  'per',
  'via',
]);

/**
 * Tokenize a document into lowercase words and extract 1..maxN n-grams.
 * @param {string} text
 * @param {{ maxN?: number, dropUnigramStopwords?: boolean }} opts
 */
export function tokenizeNgrams(text, opts = {}) {
  const maxN = opts.maxN ?? 3;
  const dropStop = opts.dropUnigramStopwords ?? true;
  const words = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ''))
    .filter((w) => w.length >= 2 && !/^\d+$/.test(w));

  const ngrams = [];
  for (let i = 0; i < words.length; i++) {
    if (!dropStop || !STOPWORDS.has(words[i])) {
      ngrams.push(words[i]);
    }
    for (let n = 2; n <= maxN; n++) {
      if (i + n <= words.length) {
        ngrams.push(words.slice(i, i + n).join(' '));
      }
    }
  }
  return ngrams;
}

/**
 * Compute Monroe et al. (2008) Dirichlet-prior log-odds ratio with z-scores.
 *
 * Let y_{iw} be the count of n-gram w in corpus i in {target, reference},
 * and alpha_w be the background Dirichlet prior pseudo-count.
 *
 *   delta_w = log( (y_{1w} + alpha_w) / (n_1 + alpha_0 - y_{1w} - alpha_w) )
 *           - log( (y_{2w} + alpha_w) / (n_2 + alpha_0 - y_{2w} - alpha_w) )
 *   sigma^2_w = 1 / (y_{1w} + alpha_w) + 1 / (y_{2w} + alpha_w)
 *   z_w = delta_w / sqrt(sigma^2_w)
 *
 * @param {string[]} targetDocs - Stratum `b` (prompt-generated default pages)
 * @param {string[]} referenceDocs - Stratum `a` / `p` (hand-crafted & pioneer controls)
 * @param {{ priorScale?: number, minCount?: number, maxN?: number, topK?: number }} opts
 */
export function computeMonroeLogOdds(targetDocs = [], referenceDocs = [], opts = {}) {
  const priorScale = opts.priorScale ?? 1.0;
  const minCount = opts.minCount ?? 2;
  const maxN = opts.maxN ?? 3;
  const topK = opts.topK ?? 25;

  const countsTarget = new Map();
  const countsRef = new Map();
  let nTarget = 0;
  let nRef = 0;

  for (const doc of targetDocs) {
    for (const ng of tokenizeNgrams(doc, { maxN })) {
      countsTarget.set(ng, (countsTarget.get(ng) || 0) + 1);
      nTarget++;
    }
  }
  for (const doc of referenceDocs) {
    for (const ng of tokenizeNgrams(doc, { maxN })) {
      countsRef.set(ng, (countsRef.get(ng) || 0) + 1);
      nRef++;
    }
  }

  const vocab = new Set([...countsTarget.keys(), ...countsRef.keys()]);
  const totalTokens = Math.max(1, nTarget + nRef);
  const vocabSize = Math.max(1, vocab.size);
  const alpha0 = priorScale * vocabSize;

  const entries = [];
  for (const term of vocab) {
    const y1 = countsTarget.get(term) || 0;
    const y2 = countsRef.get(term) || 0;
    if (y1 + y2 < minCount) continue;

    // Informative empirical background prior proportional to pooled frequency
    const pooledShare = (y1 + y2) / totalTokens;
    const alphaW = Math.max(0.05, alpha0 * pooledShare);

    const num1 = y1 + alphaW;
    const den1 = Math.max(1e-6, nTarget + alpha0 - y1 - alphaW);
    const num2 = y2 + alphaW;
    const den2 = Math.max(1e-6, nRef + alpha0 - y2 - alphaW);

    const delta = Math.log(num1 / den1) - Math.log(num2 / den2);
    const variance = 1 / num1 + 1 / num2;
    const zScore = delta / Math.sqrt(variance);

    entries.push({
      term,
      ngramOrder: term.split(' ').length,
      targetCount: y1,
      referenceCount: y2,
      priorAlpha: Number(alphaW.toFixed(4)),
      logOddsRatio: Number(delta.toFixed(4)),
      zScore: Number(zScore.toFixed(4)),
    });
  }

  entries.sort((a, b) => b.zScore - a.zScore);

  return {
    method: 'Monroe-Colaresi-Quinn-2008-Dirichlet-Log-Odds',
    targetDocCount: targetDocs.length,
    referenceDocCount: referenceDocs.length,
    targetTokenCount: nTarget,
    referenceTokenCount: nRef,
    vocabSize: vocab.size,
    topOverrepresentedInTarget: entries.slice(0, topK),
    topOverrepresentedInReference: [...entries].sort((a, b) => a.zScore - b.zScore).slice(0, topK),
    allTerms: entries,
  };
}

const DEFAULT_STRATUM_B_DOCS = [
  'Supercharge your workflow with our seamless next-generation AI platform. Unlock effortless productivity and transform your journey today.',
  'Unleash the power of modern orchestration. Built for modern teams to delve into a seamless landscape of innovation and elevate every interaction.',
  'Supercharge your developer experience with effortless deployment. Unlock the future of cloud workflows and streamline your journey.',
  'Built for modern teams seeking seamless collaboration. Unleash next-generation insights and elevate your productivity without friction.',
  'Transform your journey with our all-in-one platform. Delve into effortless automation and supercharge your team today.',
];

const DEFAULT_STRATUM_AP_DOCS = [
  'Linear v2.14.0 reduces state sync p99 latency to 14ms across 25,000 issues. Self-hosted runner binaries verify SHA-256 signatures before execution.',
  'Stripe API 2026-02-28 settles ACH debit batches in two banking days with idempotency keys and webhook HMAC-SHA256 verification.',
  'Model 04 mechanical pencil machined from 6061-T6 aluminum bar stock with 9.4mm knurled grip, 24.2g total mass, and brass 0.5mm chuck.',
  'libschema-c validates JSON Schema Draft 2020-12 at 3.4 GB/s on AVX2 using a fixed arena allocator with zero heap allocations.',
  'WardSync synchronizes HL7 FHIR R4 Encounter resources with Epic and Cerner over mTLS with 99.95% inpatient uptime SLA.',
];

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(
      'Usage: node packages/cli/calibration/log-odds.mjs [--input <corpus-texts.json>] [--top 20] [--json] [--self-test]'
    );
    process.exit(0);
  }

  let targetDocs = DEFAULT_STRATUM_B_DOCS;
  let referenceDocs = DEFAULT_STRATUM_AP_DOCS;
  const inputIdx = args.indexOf('--input');
  if (inputIdx >= 0 && args[inputIdx + 1]) {
    const raw = JSON.parse(fs.readFileSync(path.resolve(args[inputIdx + 1]), 'utf8'));
    targetDocs = raw.targetDocs || raw.stratumB || DEFAULT_STRATUM_B_DOCS;
    referenceDocs = raw.referenceDocs || raw.stratumA || DEFAULT_STRATUM_AP_DOCS;
  }

  const topIdx = args.indexOf('--top');
  const topK = topIdx >= 0 && args[topIdx + 1] ? parseInt(args[topIdx + 1], 10) : 15;

  const report = computeMonroeLogOdds(targetDocs, referenceDocs, { topK });

  if (args.includes('--self-test')) {
    const topTerms = report.topOverrepresentedInTarget.map((e) => e.term);
    if (!topTerms.includes('seamless') && !topTerms.includes('supercharge')) {
      console.error('Self-test failed: expected seamless/supercharge in top target terms');
      process.exit(1);
    }
  }

  if (args.includes('--json')) {
    const { allTerms: _omit, ...summary } = report;
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log('# Monroe et al. (2008) Fightin\' Words Dirichlet Log-Odds Report (#201)');
  console.log(
    `Target docs (Stratum b): ${report.targetDocCount} (${report.targetTokenCount} n-grams) | Reference docs (Strata a/p): ${report.referenceDocCount} (${report.referenceTokenCount} n-grams)`
  );
  console.log('\nTop overrepresented n-grams in Stratum b (default-template copy):');
  for (const row of report.topOverrepresentedInTarget) {
    console.log(
      `  z=${row.zScore.toFixed(2).padStart(6)} | log-odds=${row.logOddsRatio.toFixed(2).padStart(6)} | b=${String(row.targetCount).padStart(2)} vs a/p=${String(row.referenceCount).padStart(2)} | "${row.term}"`
    );
  }
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main();
}
