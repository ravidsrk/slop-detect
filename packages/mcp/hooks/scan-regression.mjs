#!/usr/bin/env node
// Session regression hook (bin: slop-detect-hook) for Claude Code, Cursor and
// Codex, and a small CLI for terminals and CI. It scans the local dev server
// named by SLOP_LOCAL_URL, .slop/local-url or the first argument. The first
// scored run records .slop/session-baseline.json; later runs report only when
// the score rises or a new pattern appears. It never calls slop-detect.com.
//
// As a hook (JSON on stdin), exit codes follow what the agent can act on (#359):
//   regression            → exit 2, message on stderr (Claude sees it; Stop is
//                           blocked once so the agent can fix it)
//   regression, Stop again → exit 0 with a user-visible systemMessage (no loop)
//   scan could not run    → exit 0 (Stop adds a user-visible systemMessage)
//   no URL configured     → exit 0, silent
//   non-UI file edited    → exit 0, no scan
// From a terminal: 0 ok · 1 regression (text on stdout) · 2 could not run.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  firstLine,
  hookEvent,
  hookTarget,
  isStopEvent,
  readHookInput,
  stopAlreadyContinued,
  touchesUi,
} from './hook-input.mjs';

const input = await readHookInput();
const asHook = !!input;
const event = hookEvent(input);
const cwd = (input && typeof input.cwd === 'string' && input.cwd) || process.cwd();

function finish(code, { stdout = '', stderr = '' } = {}) {
  if (stdout) process.stdout.write(stdout.endsWith('\n') ? stdout : `${stdout}\n`);
  if (stderr) process.stderr.write(stderr.endsWith('\n') ? stderr : `${stderr}\n`);
  process.exit(code);
}

function cannotRun(reason) {
  const text = `slop-detect: scan could not run (${reason}). This is not a Clean score.`;
  if (!asHook) finish(2, { stderr: text });
  if (isStopEvent(event)) finish(0, { stdout: JSON.stringify({ systemMessage: text }) });
  finish(0);
}

const target = hookTarget(process.argv, process.env, cwd);
if (!target) {
  if (asHook) finish(0);
  finish(2, {
    stderr:
      'Set SLOP_LOCAL_URL, .slop/local-url, or pass a URL. Scan could not run. This is not a Clean score. This hook does not call slop-detect.com.',
  });
}
if (asHook && event === 'PostToolUse' && !touchesUi(input)) finish(0);

const here = dirname(fileURLToPath(import.meta.url));
// SLOP_HOOK_SCANNER swaps the scanner for a stub in tests.
const scanner = process.env.SLOP_HOOK_SCANNER || join(here, 'scan-local.mjs');
const child = spawnSync(process.execPath, [scanner, target], {
  cwd,
  encoding: 'utf8',
  input: '',
  maxBuffer: 64 * 1024 * 1024,
});
if (child.error) cannotRun(child.error.message);
if (child.status !== 0) {
  cannotRun(firstLine(child.stderr).replace(/^Scan could not run\. This is not a Clean score\.\s*/, '') || `scanner exited ${child.status}`);
}

let result;
try {
  result = JSON.parse(child.stdout);
} catch {
  cannotRun('the scanner printed no scan JSON');
}
if (!result || result.blocked || result.error || typeof result.score !== 'number') {
  cannotRun((result && result.error) || 'the page produced no score');
}

const { importCore } = await import('./import-core.mjs');
const { regressionAgainstBaseline, triggeredPatterns } = await importCore();

const baselinePath =
  process.env.SLOP_BASELINE_PATH || join(cwd, '.slop', 'session-baseline.json');
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
  if (!asHook && !decision.silent && decision.text) finish(0, { stdout: decision.text });
  finish(0);
}
if (decision.silent || !decision.worse) {
  if (!asHook && decision.text) finish(0, { stdout: decision.text });
  finish(0);
}

if (!asHook) finish(1, { stdout: decision.text });
const message = `slop-detect: ${decision.text} Fix the new patterns, or say why they are intended. (Scanned ${target}.)`;
if (isStopEvent(event) && stopAlreadyContinued(input)) {
  finish(0, { stdout: JSON.stringify({ systemMessage: message }) });
}
finish(2, { stderr: message });
