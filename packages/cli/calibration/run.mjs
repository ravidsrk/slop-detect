#!/usr/bin/env node
// Calibration runner. Scans the labeled corpus and reports how well the detector
// agrees with human labels — the thing you need to state a defensible accuracy
// number (the deep-review gap #8).
//
//   node packages/cli/calibration/run.mjs            # scan via the public API (no browser)
//   node packages/cli/calibration/run.mjs --local    # scan locally (needs Playwright)
//   node packages/cli/calibration/run.mjs --check     # exit 1 if any CONFIRMED label mismatches
//   node packages/cli/calibration/run.mjs --json out.json
//
// Accuracy is computed ONLY over rows with a confirmed `label`. Rows with
// label:null are printed as predictions for a human to confirm and promote.

import { readFileSync, writeFileSync } from 'node:fs';
import { scanRemote, scanUrl } from '../src/detector.js';

const args = process.argv.slice(2);
const local = args.includes('--local');
const check = args.includes('--check');
const jsonIdx = args.indexOf('--json');
const jsonOut = jsonIdx >= 0 ? args[jsonIdx + 1] : null;

const corpus = JSON.parse(readFileSync(new URL('./corpus.json', import.meta.url)));
const entries = corpus.entries || [];

const scan = (url) =>
  local ? scanUrl(url, { axes: ['design'] }) : scanRemote(url, { axes: ['design'] });

const TIERS = ['Clean', 'Mild', 'Heavy'];
const pad = (s, n) => String(s).padEnd(n);

const rows = [];
let labeled = 0,
  correct = 0;
const confusion = {}; // expected -> predicted -> count
for (const t of TIERS) confusion[t] = { Clean: 0, Mild: 0, Heavy: 0 };

console.log(
  `\nCalibration · defs ${corpus.definitionsVersion} · ${local ? 'local' : 'remote'} · ${entries.length} urls\n`
);
console.log(`${pad('url', 38)} ${pad('expect', 7)} ${pad('predict', 7)} ${pad('score', 6)} ok`);
console.log('-'.repeat(70));

for (const e of entries) {
  let predicted = 'ERROR',
    score = '-',
    ok = '';
  try {
    const r = await scan(e.url);
    predicted = r.tier;
    score = r.score;
    if (e.label) {
      labeled++;
      const hit = predicted === e.label;
      if (hit) correct++;
      confusion[e.label][predicted] = (confusion[e.label][predicted] || 0) + 1;
      ok = hit ? '✓' : '✗ MISS';
    } else {
      ok = '· (unlabeled)';
    }
  } catch (err) {
    ok = `! ${err.message?.slice(0, 30)}`;
  }
  rows.push({ url: e.url, expected: e.label, predicted, score, builtWith: e.builtWith });
  console.log(
    `${pad(e.url.replace(/^https?:\/\//, ''), 38)} ${pad(e.label || '—', 7)} ${pad(predicted, 7)} ${pad(score, 6)} ${ok}`
  );
}

const accuracy = labeled ? correct / labeled : 0;
console.log('-'.repeat(70));
console.log(
  `\nLabeled: ${labeled}  ·  Correct: ${correct}  ·  Accuracy: ${(accuracy * 100).toFixed(1)}%`
);
console.log('\nConfusion (rows = expected, cols = predicted):');
console.log(`${pad('', 8)}${TIERS.map((t) => pad(t, 7)).join('')}`);
for (const exp of TIERS) {
  console.log(`${pad(exp, 8)}${TIERS.map((p) => pad(confusion[exp][p] || 0, 7)).join('')}`);
}

const unlabeled = rows.filter((r) => !r.expected && r.predicted !== 'ERROR');
if (unlabeled.length) {
  console.log('\nPredictions awaiting a human label (promote into corpus.json):');
  for (const r of unlabeled) console.log(`  ${r.predicted.padEnd(6)} ${r.score}\t${r.url}`);
}

const report = {
  definitionsVersion: corpus.definitionsVersion,
  mode: local ? 'local' : 'remote',
  labeled,
  correct,
  accuracy,
  rows,
  confusion,
};
if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${jsonOut}`);
}

// In --check mode, a confirmed-label miss is a regression → fail.
if (check) {
  const misses = rows.filter(
    (r) => r.expected && r.predicted !== 'ERROR' && r.predicted !== r.expected
  );
  if (misses.length) {
    console.error(`\n✗ ${misses.length} confirmed-label mismatch(es).`);
    process.exit(1);
  }
}
console.log('');
