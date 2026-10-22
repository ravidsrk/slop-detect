#!/usr/bin/env node
// Session baseline hook. The first scored run records .slop/session-baseline.json
// and prints nothing. A later run prints only when the score rises or a new
// pattern appears. A blocked scan exits 2. That exit is not a Clean score.
// This command does not call slop-detect.com.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const target = process.argv[2] || process.env.SLOP_LOCAL_URL || readLocalUrl();
if (!target) {
  process.stderr.write(
    'Set SLOP_LOCAL_URL, .slop/local-url, or pass a URL. Scan could not run. This is not a Clean score. This hook does not call slop-detect.com.\n'
  );
  process.exit(2);
}

const here = dirname(fileURLToPath(import.meta.url));
const scanner = join(here, 'scan-local.mjs');
const child = spawnSync(process.execPath, [scanner, target], { encoding: 'utf8' });
if (child.status !== 0) {
  process.stderr.write(child.stderr || 'Scan could not run. This is not a Clean score.\n');
  process.exit(2);
}

let result;
try {
  result = JSON.parse(child.stdout);
} catch {
  process.stderr.write('Scan could not run. This is not a Clean score.\n');
  process.exit(2);
}

const { importCore } = await import('./import-core.mjs');
const { regressionAgainstBaseline, triggeredPatterns } = await importCore();
if (!result || result.blocked || result.error || typeof result.score !== 'number') {
  process.stderr.write('Scan could not run. This is not a Clean score.\n');
  process.exit(2);
}

const baselinePath =
  process.env.SLOP_BASELINE_PATH || join(process.cwd(), '.slop', 'session-baseline.json');
let baseline = null;
if (existsSync(baselinePath)) {
  try {
    baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
  } catch {
    baseline = null;
  }
}

const decision = regressionAgainstBaseline(baseline, result);
if (decision.establish) {
  mkdirSync(dirname(baselinePath), { recursive: true });
  writeFileSync(
    baselinePath,
    `${JSON.stringify(
      {
        score: result.score,
        tier: result.tier,
        patterns: triggeredPatterns(result).map((pattern) => pattern.id),
        definitionsVersion: result.definitionsVersion || null,
      },
      null,
      2
    )}\n`
  );
  if (!decision.silent && decision.text) process.stdout.write(`${decision.text}\n`);
  process.exit(0);
}
if (decision.silent) process.exit(0);
process.stdout.write(`${decision.text}\n`);
process.exit(decision.worse ? 1 : 0);

function readLocalUrl() {
  try {
    return readFileSync(join(process.cwd(), '.slop', 'local-url'), 'utf8').trim();
  } catch {
    return '';
  }
}
