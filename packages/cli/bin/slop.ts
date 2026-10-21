#!/usr/bin/env node
// Slop Detector CLI
//
// Usage:
//   slop-detector <url> [<url2> ...] [--json] [--screenshot]
//
// Scores any URL against the AI-design-slop fingerprint and emits a
// pretty terminal report or a machine-readable JSON blob.

import { readFileSync } from 'node:fs';
import {
  scanUrl,
  scanRemote,
  aeoRemote,
  loadDesignMd,
  loadAxeSource,
  buildSarifReport,
  exitCodeForScanResults,
} from '../src/index.js';
import type { ScanOptions } from '../src/index.js';
import {
  isPreset,
  PRESETS,
  PATTERNS,
  DEFINITIONS_VERSION,
  GRADE_BANDS,
  runAeoChecks,
  buildFixPrompt,
  generateDesignMd,
  extractDtcgTokens,
  lintDesignMd,
  diffDesignMd,
  stampScanResult,
} from '@slop-detect/core';

const CLI_VERSION = '0.8.0';
const args = process.argv.slice(2);
const urls = [];
const flags = {
  json: false,
  sarif: false,
  fixPrompt: false,
  initDesignMd: false,
  initTokens: false,
  lintDesignMd: null as string | null,
  diffDesignMd: null as [string, string] | null,
  a11y: false,
  screenshot: false,
  verbose: false,
  preset: 'full',
  axes: ['design'],
  failOn: null as string | null,
  failUnderScore: null as number | null,
  failUnderLabel: null as string | null,
  aeo: false,
  remote: false,
  api: null as string | null,
  designMd: null as string | null,
  timeout: null as number | null,
};

// Exit codes live in exitCodeForScanResults: 0 scored, 1 over the gate, 2 could
// not scan. Exit 2 is never a Clean score.
const VALID_FAIL_ON = ['mild', 'heavy'];

// Parse --fail-under <grade|score> into a max allowed slop score (0..100).
function parseFailUnder(raw: string | undefined): { maxScore: number; label: string } | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  const upper = trimmed.toUpperCase();
  const band = (GRADE_BANDS || []).find((b: any) => b.grade.toUpperCase() === upper);
  if (band) return { maxScore: band.max, label: band.grade };
  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    if (n >= 0 && n <= 100) return { maxScore: n, label: `${n}/100` };
  }
  return null;
}

const VALID_AXES = ['design', 'copy', 'craft'];
function parseAxes(val) {
  if (!val) return null;
  if (val === 'all') return [...VALID_AXES];
  const list = val
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const bad = list.filter((a) => !VALID_AXES.includes(a));
  if (bad.length) return { error: bad };
  const out = [...new Set(list)];
  if (!out.includes('design')) out.unshift('design');
  return out;
}

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--json' || a === '-j') flags.json = true;
  else if (a === '--sarif') flags.sarif = true;
  else if (a === '--fix-prompt' || a === '--fix') flags.fixPrompt = true;
  else if (a === '--init-design-md') flags.initDesignMd = true;
  else if (a === '--init-tokens') flags.initTokens = true;
  else if (a === '--a11y') flags.a11y = true;
  else if (a === '--lint-design-md' || a.startsWith('--lint-design-md=')) {
    const val = a.startsWith('--lint-design-md=') ? a.slice('--lint-design-md='.length) : args[++i];
    if (!val || val.startsWith('--')) {
      console.error('--lint-design-md needs a local DESIGN.md path.');
      process.exit(2);
    }
    flags.lintDesignMd = val;
  } else if (a === '--diff-design-md') {
    const base = args[++i];
    const head = args[++i];
    if (!base || !head || base.startsWith('--') || head.startsWith('--')) {
      console.error('--diff-design-md needs two local paths: <base> <head>.');
      process.exit(2);
    }
    flags.diffDesignMd = [base, head];
  } else if (a === '--screenshot') flags.screenshot = true;
  else if (a === '--verbose' || a === '-v') flags.verbose = true;
  else if (a === '--version' || a === '-V') {
    console.log(`slop-detect ${CLI_VERSION} (defs ${DEFINITIONS_VERSION})`);
    process.exit(0);
  } else if (a === '--copy') flags.axes = [...new Set([...flags.axes, 'copy'])];
  else if (a === '--craft') flags.axes = [...new Set([...flags.axes, 'craft'])];
  else if (a === '--aeo') flags.aeo = true;
  else if (a === '--remote') flags.remote = true;
  else if (a === '--api' || a.startsWith('--api=')) {
    flags.api = a.startsWith('--api=') ? a.slice('--api='.length) : args[++i];
    if (!flags.api || flags.api.startsWith('--')) {
      console.error('--api needs a base URL value (e.g. --api https://slop-detect.com).');
      process.exit(2);
    }
    flags.remote = true; // a custom API endpoint implies remote scanning
  } else if (a === '--design-md' || a.startsWith('--design-md=')) {
    const val = a.startsWith('--design-md=') ? a.slice('--design-md='.length) : args[++i];
    if (!val) {
      console.error(
        '--design-md needs a value: a file path, a URL, or "auto" (looks for <origin>/DESIGN.md).'
      );
      process.exit(2);
    }
    flags.designMd = val;
  } else if (a === '--axes' || a.startsWith('--axes=')) {
    const val = a.startsWith('--axes=') ? a.slice('--axes='.length) : args[++i];
    const parsed: any = parseAxes(val);
    if (!parsed || parsed.error) {
      console.error(
        `Invalid --axes value: ${val}. Options: ${VALID_AXES.join(', ')} (comma-separated) or "all".`
      );
      process.exit(2);
    }
    flags.axes = parsed;
  } else if (a === '--fail-on' || a.startsWith('--fail-on=')) {
    const val = (
      a.startsWith('--fail-on=') ? a.slice('--fail-on='.length) : args[++i] || ''
    ).toLowerCase();
    if (!VALID_FAIL_ON.includes(val)) {
      console.error(
        `Invalid --fail-on value: ${val || '(none)'}. Options: ${VALID_FAIL_ON.join(', ')}.`
      );
      process.exit(2);
    }
    flags.failOn = val === 'mild' ? 'Mild' : 'Heavy';
  } else if (a === '--fail-under' || a.startsWith('--fail-under=')) {
    const val = a.startsWith('--fail-under=') ? a.slice('--fail-under='.length) : args[++i];
    const parsed = parseFailUnder(val);
    if (!parsed) {
      console.error(
        `Invalid --fail-under value: ${val || '(none)'}. Expected a letter grade (A+, A, A-, B+, B, B-, C+, C, C-, D+, D, F) or a max slop score (0-100).`
      );
      process.exit(2);
    }
    flags.failUnderScore = parsed.maxScore;
    flags.failUnderLabel = parsed.label;
  } else if (a === '--timeout' || a.startsWith('--timeout=')) {
    const raw = a.startsWith('--timeout=') ? a.slice('--timeout='.length) : args[++i];
    const val = Number(raw);
    if (
      raw == null ||
      String(raw).startsWith('--') ||
      !Number.isFinite(val) ||
      !Number.isInteger(val) ||
      val <= 0
    ) {
      console.error('--timeout needs a positive integer (milliseconds), e.g. --timeout 30000.');
      process.exit(2);
    }
    flags.timeout = val;
  } else if (a === '--help' || a === '-h') {
    help();
    process.exit(0);
  } else if (a === '--preset' || a === '-p') {
    const val = args[++i];
    if (!val || !isPreset(val)) {
      console.error(`Unknown preset: ${val}. Options: ${Object.keys(PRESETS).join(', ')}`);
      process.exit(2);
    }
    flags.preset = val;
  } else if (a.startsWith('--preset=')) {
    const val = a.slice('--preset='.length);
    if (!isPreset(val)) {
      console.error(`Unknown preset: ${val}. Options: ${Object.keys(PRESETS).join(', ')}`);
      process.exit(2);
    }
    flags.preset = val;
  } else if (a.startsWith('--')) {
    console.error(`Unknown flag: ${a}`);
    process.exit(2);
  } else urls.push(a);
}

function readLocalText(path: string, flagName: string) {
  try {
    return readFileSync(path, 'utf8');
  } catch (e) {
    console.error(`Could not read ${path} for ${flagName}: ${e.message}`);
    process.exit(2);
  }
}

if (flags.lintDesignMd && flags.diffDesignMd) {
  console.error('Pass either --lint-design-md or --diff-design-md, not both.');
  process.exit(2);
}

if (flags.lintDesignMd || flags.diffDesignMd) {
  if (urls.length) {
    console.error(
      '--lint-design-md and --diff-design-md read local DESIGN.md files and do not take a URL.'
    );
    process.exit(2);
  }
  if (flags.lintDesignMd) {
    const lint = lintDesignMd(readLocalText(flags.lintDesignMd, '--lint-design-md'));
    if (flags.json) console.log(JSON.stringify(lint, null, 2));
    else {
      console.log(
        `DESIGN.md ${lint.valid ? 'valid' : 'invalid'} (specVersion ${lint.specVersion}, ${lint.errors.length} errors, ${lint.warnings.length} warnings)`
      );
      for (const issue of lint.issues) {
        console.log(
          `  ${issue.severity} ${issue.ruleId}${issue.path ? ` ${issue.path}` : ''}: ${issue.message}`
        );
      }
      if (!lint.issues.length) console.log('  No issues.');
    }
    process.exit(lint.valid ? 0 : 1);
  }
  const [basePath, headPath] = flags.diffDesignMd;
  const diff = diffDesignMd(
    readLocalText(basePath, '--diff-design-md'),
    readLocalText(headPath, '--diff-design-md')
  );
  if (flags.json) console.log(JSON.stringify(diff, null, 2));
  else {
    console.log(
      `DESIGN.md diff: ${diff.breaking ? 'breaking' : 'compatible'} (${diff.added.length} added, ${diff.removed.length} removed, ${diff.changed.length} changed)`
    );
    for (const row of diff.added) console.log(`  added ${row.path} = ${row.value}`);
    for (const row of diff.removed) console.log(`  removed ${row.path} = ${row.value}`);
    for (const row of diff.changed)
      console.log(`  changed ${row.path}: ${row.before} → ${row.after}`);
    if (!diff.added.length && !diff.removed.length && !diff.changed.length) {
      console.log('  No token changes.');
    }
  }
  process.exit(diff.breaking ? 1 : 0);
}

if (urls.length === 0) {
  help();
  process.exit(2);
}

if (flags.timeout && flags.remote) {
  console.error(
    '--timeout applies to local Playwright navigation only; drop --remote or omit --timeout.'
  );
  process.exit(2);
}

if (flags.initDesignMd && flags.remote) {
  console.error(
    '--init-design-md requires local DOM token extraction; drop --remote to generate DESIGN.md.'
  );
  process.exit(2);
}

if (flags.initTokens && flags.remote) {
  console.error(
    '--init-tokens requires local DOM token extraction; drop --remote to generate tokens.json.'
  );
  process.exit(2);
}

if (flags.initDesignMd && flags.initTokens) {
  console.error(
    '--init-design-md and --init-tokens both write the extracted system to stdout. Pass only one.'
  );
  process.exit(2);
}

if (flags.a11y && flags.remote) {
  console.error(
    '--a11y runs axe-core in the local browser. It never changes a score. Drop --remote.'
  );
  process.exit(2);
}

// Normalize bare hostnames the way the web UI does: `slop-detect example.com`
// should Just Work. Prepend https:// when no http(s) scheme is present. An
// explicit non-http(s) scheme (file:, ftp:…) is rejected — we only scan pages.
for (let i = 0; i < urls.length; i++) {
  const u = urls[i].trim();
  const scheme = u.match(/^([a-z][a-z0-9+.-]*):/i);
  if (scheme && !/^https?$/i.test(scheme[1])) {
    console.error(`Only http(s) URLs can be scanned: ${u}`);
    process.exit(2);
  }
  urls[i] = /^https?:\/\//i.test(u) ? u : 'https://' + u;
}

function help() {
  // Generate the pattern list from core so it never drifts from what ships.
  const patternLines = PATTERNS.map((p, i) => {
    const n = String(i + 1).padStart(2, ' ');
    const short = p.short || p.id;
    // Use the longer label as the description, unless it just repeats the short
    // name or is too long for one line.
    const desc = p.label && p.label.length <= 52 && p.label !== short ? p.label : '';
    const line = `  ${n}. ${short.padEnd(20, ' ')}` + (desc ? ` — ${desc}` : '');
    return `${line} (w${p.weight})`;
  }).join('\n');

  console.log(`
Slop Detector — score landing pages against ${PATTERNS.length} AI-design-slop patterns (defs ${DEFINITIONS_VERSION})

Usage:
  slop-detect <url> [<url2> ...] [options]

Options:
  --json, -j          Emit JSON instead of pretty output
  --sarif             Emit SARIF 2.1.0 report for GitHub Code Scanning
  --fix-prompt, --fix Emit the opinionated markdown remediation prompt
  --init-design-md    Extract live DOM tokens and generate a starter DESIGN.md
  --init-tokens       Extract live DOM tokens and write a DTCG tokens.json
  --lint-design-md <file>
                      Lint a local DESIGN.md (broken refs, contrast, orphans).
                      No URL and no browser. Exits 1 when the file has errors.
  --diff-design-md <base> <head>
                      Diff two local DESIGN.md files. Exits 1 when the diff
                      removes or changes a token.
  --a11y              Optional axe-core report. Off by default. Local browser
                      only. Never changes Clean/Mild/Heavy, craft, or the gate.
                      Requires the optional axe-core package.
  --screenshot        Include a base64 hero screenshot in JSON output
  --verbose, -v       Show evidence details for every triggered pattern
  --preset, -p <p>    Scoring preset: full (default), strict, marketing, minimal
  --axes <list>       Axes to score: design (default), copy, craft. Comma-separated or "all"
  --copy              Also score the copy axis
  --craft             Also score the craft-floor axis (never feeds Clean/Mild/Heavy)
  --aeo               Add the AEO axis: can AI engines (ChatGPT/Claude/Perplexity)
                      actually read & cite this page? (network checks, no browser)
  --remote            Scan via the slop-detect.com API instead of a local browser
                      (no Playwright/Chromium install needed). Honors SLOP_API_KEY.
  --api <url>         Use a custom API base (implies --remote). Env: SLOP_API
  --design-md <src>   System axis: check the page against its declared design
                      system (DESIGN.md spec). <src> = file path, URL, or "auto"
                      (looks for <origin>/DESIGN.md). Reports drift, not slop —
                      higher is better.
  --fail-on <tier>    Exit 1 if any scored page is at/above tier: mild | heavy.
                      A blocked or errored scan exits 2, with or without this flag.
                      Exit 2 means the scan could not run. It is not a Clean score.
  --fail-under <g|n>  Exit non-zero (1) if any page's grade/score is worse than <g|n>
                      (e.g. --fail-under B or --fail-under 15).
  --timeout <ms>      Local Playwright navigation timeout in ms (default 30000)
  --version, -V       Print CLI and definitions version
  --help, -h          Show this help

Examples:
  slop-detect https://news.ycombinator.com
  slop-detect https://aura.build https://lovable.dev --verbose
  slop-detect https://example.com --copy             # design + copy slop
  slop-detect https://example.com --fix-prompt       # generate LLM remediation prompt
  slop-detect https://example.com --init-design-md > DESIGN.md
  slop-detect https://example.com --init-tokens > tokens.json
  slop-detect --lint-design-md ./DESIGN.md
  slop-detect --diff-design-md ./base/DESIGN.md ./head/DESIGN.md
  slop-detect https://mysite.com --fail-on heavy     # CI gate: fail on heavy slop
  slop-detect https://mysite.com --fail-under B      # CI gate: require at least grade B

The ${PATTERNS.length} patterns scored:
${patternLines}

Tier thresholds:
  Clean: 0-9   ·   Mild: 10-27   ·   Heavy: 28+
`);
}

// ── ANSI colors ──────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  grey: '\x1b[90m',
};

function tierStyle(tier) {
  if (tier === 'Heavy') return C.red;
  if (tier === 'Mild') return C.yellow;
  return C.green;
}

function emoji(tier) {
  if (tier === 'Heavy') return '🔴';
  if (tier === 'Mild') return '🟡';
  return '🟢';
}

function waivedNote(result) {
  if (!Array.isArray(result.waivedPatterns) || result.waivedPatterns.length === 0) return '';
  return `  ${C.grey}(raw ${result.rawScore} · ${result.waivedPatterns.length} waived by DESIGN.md)${C.reset}`;
}

function renderPretty(result) {
  // Blocked / dead-page result has no tier and no patterns to render.
  if (result.blocked) {
    console.log();
    console.log(`${C.bold}${result.url}${C.reset}`);
    if (result.title) console.log(`${C.grey}${result.title}${C.reset}`);
    console.log();
    console.log(`  ${C.yellow}⚠ Cannot score${C.reset}  ·  ${C.grey}${result.code}${C.reset}`);
    console.log(`  ${result.error}`);
    if (result.hint) console.log(`  ${C.grey}${result.hint}${C.reset}`);
    console.log();
    return;
  }

  const ts = tierStyle(result.tier);
  console.log();
  console.log(`${C.bold}${result.url}${C.reset}`);
  if (result.title) console.log(`${C.grey}${result.title}${C.reset}`);
  if (result.h1) console.log(`${C.grey}H1: "${result.h1}"${C.reset}`);
  console.log();

  // Multi-axis: show the unified headline + per-axis breakdown.
  // Craft is a separate floor (higher is better) and has no Clean/Mild/Heavy tier.
  const scoredAxes = result.axes
    ? Object.fromEntries(Object.entries(result.axes).filter(([name]) => name !== 'craft'))
    : null;
  const multi = scoredAxes && scoredAxes.copy;
  if (multi) {
    const ut = tierStyle(result.unifiedTier);
    console.log(
      `  ${emoji(result.unifiedTier)} ${ut}${C.bold}${result.unifiedTier}${C.reset}` +
        `  ·  ${C.bold}${result.unifiedGrade}${C.reset}` +
        `  ·  unified ${C.bold}${result.unifiedScore}${C.reset}/100` +
        `  ${C.grey}(${Object.keys(scoredAxes).length} axes)${C.reset}`
    );
    console.log();
    for (const name of Object.keys(scoredAxes)) {
      const ax = scoredAxes[name];
      const ax_ts = tierStyle(ax.tier);
      const note = ax.thin ? `${C.grey} (too little copy to judge)${C.reset}` : '';
      console.log(
        `  ${emoji(ax.tier)} ${C.bold}${name.padEnd(7)}${C.reset} ${ax_ts}${ax.tier.padEnd(6)}${C.reset}` +
          `  ${ax.grade.padEnd(3)}  score ${C.bold}${String(ax.score).padStart(3)}${C.reset}/100` +
          `  ${String(ax.patternsFlagged).padStart(2)}/${ax.patternsTotal} flagged${note}`
      );
    }
    if (Array.isArray(result.waivedPatterns) && result.waivedPatterns.length) {
      console.log(
        `  ${C.grey}DESIGN.md waived ${result.waivedPatterns.length} declared pattern(s); raw design score ${result.rawScore}.${C.reset}`
      );
    }
    console.log();
  } else {
    console.log(
      `  ${emoji(result.tier)} ${ts}${C.bold}${result.tier}${C.reset}` +
        `  ·  ${C.bold}${result.grade || '?'}${C.reset}` +
        `  ·  score ${C.bold}${result.score}${C.reset}/100` +
        `  ·  ${C.bold}${result.patternsFlagged}${C.reset}/${result.patternsTotal} patterns triggered` +
        waivedNote(result)
    );
    if (result.verdict) console.log(`  ${C.grey}${result.verdict}${C.reset}`);
    console.log();
  }

  // Design-axis pattern detail (always shown — it's the primary fingerprint).
  // Declared DESIGN.md waivers stay out of the triggered list.
  const flagged = result.patterns.filter((p) => p.triggered && !p.waived);
  const waivedRows = result.patterns.filter((p) => p.waived);
  const clean = result.patterns.filter((p) => !p.triggered);

  if (flagged.length) {
    console.log(`${C.bold}Triggered:${C.reset}`);
    for (const p of flagged) {
      console.log(`  ${C.red}✗${C.reset} ${p.label}  ${C.grey}(+${p.weight})${C.reset}`);
      if (flags.verbose) {
        const ev = { ...p.evidence };
        delete ev.triggered;
        console.log(`      ${C.grey}${JSON.stringify(ev).slice(0, 200)}${C.reset}`);
      }
    }
    console.log();
  }

  if (clean.length && !flags.json) {
    console.log(`${C.dim}Clean:${C.reset}`);
    const names = clean.map((p) => p.short).join(', ');
    console.log(`  ${C.dim}${names}${C.reset}`);
    console.log();
  }

  if (result.craft) {
    const craft = result.craft;
    console.log(
      `  ${C.bold}craft${C.reset}   score ${C.bold}${craft.score}${C.reset}/100` +
        `  ${C.grey}(floor · does not change ${result.tier})${C.reset}`
    );
    const failed = craft.failed || [];
    if (failed.length) {
      console.log(`${C.bold}Craft floor:${C.reset}`);
      for (const p of failed) {
        console.log(`  ${C.red}✗${C.reset} ${p.label}  ${C.grey}(${p.weight})${C.reset}`);
      }
    }
    console.log();
  }

  if (waivedRows.length) {
    console.log(`${C.bold}Waived by DESIGN.md:${C.reset}`);
    const reasons = new Map((result.waivedPatterns || []).map((w) => [w.id, w.reason]));
    for (const p of waivedRows) {
      console.log(
        `  ${C.grey}·${C.reset} ${p.label}  ${C.grey}${reasons.get(p.id) || ''}${C.reset}`
      );
    }
    console.log();
  }

  const axe = result.a11y && result.a11y.axe;
  if (axe && axe.enabled) {
    const count = typeof axe.violationCount === 'number' ? axe.violationCount : 0;
    console.log(
      `  ${C.bold}a11y${C.reset}   axe ${C.bold}${count}${C.reset} violations` +
        `  ${C.grey}(separate · does not change the score)${C.reset}`
    );
    if (axe.error) console.log(`  ${C.yellow}⚠ ${axe.error}${C.reset}`);
    const rules = Array.isArray(axe.rules) ? axe.rules : [];
    for (const rule of rules.slice(0, 15)) {
      console.log(
        `  ${C.grey}·${C.reset} ${rule.ruleId}  ${C.grey}(${rule.impact}, ${rule.nodeCount} nodes)${C.reset}`
      );
    }
    if (rules.length > 15) {
      console.log(`  ${C.grey}… ${rules.length - 15} more in --json${C.reset}`);
    }
    if (axe.disclaimer) console.log(`  ${C.grey}${axe.disclaimer}${C.reset}`);
    console.log();
  }

  // Copy axis detail.
  if (result.axes && result.axes.copy && !result.axes.copy.thin) {
    const cflag = result.axes.copy.patterns.filter((p) => p.triggered);
    if (cflag.length) {
      console.log(`${C.bold}Copy slop:${C.reset}`);
      for (const p of cflag) {
        console.log(`  ${C.red}✗${C.reset} ${p.label}  ${C.grey}(+${p.weight})${C.reset}`);
        if (flags.verbose) {
          const ev = { ...p.evidence };
          delete ev.triggered;
          console.log(`      ${C.grey}${JSON.stringify(ev).slice(0, 200)}${C.reset}`);
        }
      }
      console.log();
    }
  }
}

function aeoTierStyle(tier) {
  if (tier === 'Eligible' || tier === 'AI-Ready') return C.green;
  if (tier === 'Partially Eligible' || tier === 'Partial') return C.yellow;
  return C.red;
}
function aeoEmoji(tier) {
  if (tier === 'Eligible' || tier === 'AI-Ready') return '🟢';
  if (tier === 'Partially Eligible' || tier === 'Partial') return '🟡';
  return '🔴';
}

function renderAeo(aeo) {
  const ts = aeoTierStyle(aeo.tier);
  console.log(
    `  ${aeoEmoji(aeo.tier)} ${C.bold}AEO    ${C.reset} ${ts}${String(aeo.tier).padEnd(20)}${C.reset}` +
      `  score ${C.bold}${String(aeo.score).padStart(3)}${C.reset}/${aeo.maxScore}` +
      `  ${C.grey}(${aeo.passed.length}/${aeo.checks.length} checks · ${aeo.durationMs}ms)${C.reset}`
  );
  console.log(`  ${C.grey}Can this page be fetched and read?${C.reset}`);
  console.log();
  const failed = aeo.failed;
  if (failed.length) {
    console.log(`${C.bold}AEO issues:${C.reset}`);
    for (const c of failed) {
      const sev = c.severity === 'required' ? C.red : C.yellow;
      console.log(
        `  ${sev}✗${C.reset} ${c.label}  ${C.grey}(${c.severity}, -${c.weight})${C.reset}`
      );
      if (flags.verbose) console.log(`      ${C.grey}${c.message}${C.reset}`);
    }
    console.log();
  }
  const passed = aeo.passed;
  if (passed.length && !flags.json) {
    console.log(`${C.dim}AEO passed:${C.reset}`);
    console.log(`  ${C.dim}${passed.map((c) => c.id).join(', ')}${C.reset}`);
    console.log();
  }
}

function systemTierStyle(tier) {
  if (tier === 'Aligned') return C.green;
  if (tier === 'Drifting') return C.yellow;
  if (tier === 'Off-system') return C.red;
  return C.grey;
}
function systemEmoji(tier) {
  if (tier === 'Aligned') return '🟢';
  if (tier === 'Drifting') return '🟡';
  if (tier === 'Off-system') return '🔴';
  return '⚪';
}

function renderSystem(sys) {
  if (!sys.declared) {
    console.log(`  ${C.grey}⚪ system  — ${sys.message}${C.reset}\n`);
    return;
  }
  const ts = systemTierStyle(sys.tier);
  const name = sys.name ? ` ${C.grey}(${sys.name})${C.reset}` : '';
  console.log(
    `  ${systemEmoji(sys.tier)} ${C.bold}system ${C.reset} ${ts}${sys.tier.padEnd(10)}${C.reset}` +
      `  score ${C.bold}${String(sys.score).padStart(3)}${C.reset}/100` +
      `  ${C.grey}(${sys.checksEvaluated} checks · ${sys.checksSkipped} skipped)${C.reset}${name}`
  );
  console.log(`  ${C.grey}Does this page honor its declared design system?${C.reset}`);
  console.log();
  if (sys.drift.length) {
    console.log(`${C.bold}Drift:${C.reset}`);
    for (const d of sys.drift) {
      console.log(`  ${C.red}✗${C.reset} ${d.message}  ${C.grey}(${d.id})${C.reset}`);
      if (flags.verbose && d.evidence) {
        console.log(`      ${C.grey}${JSON.stringify(d.evidence).slice(0, 200)}${C.reset}`);
      }
    }
    console.log();
  }
}

if (
  flags.designMd &&
  flags.remote &&
  flags.designMd !== 'auto' &&
  !/^https?:\/\//i.test(flags.designMd)
) {
  console.error(
    '--design-md with --remote requires "auto" or an http(s) URL; drop --remote to use a local file path.'
  );
  process.exit(2);
}

const machineOutput =
  flags.json || flags.sarif || flags.fixPrompt || flags.initDesignMd || flags.initTokens;

// ── Main ────────────────────────────────────────────────────────────────────
(async () => {
  if (flags.a11y) {
    try {
      await loadAxeSource();
    } catch (e) {
      console.error(e.message || String(e));
      process.exit(2);
    }
  }
  const results = [];
  for (const url of urls) {
    try {
      const scanOpts: ScanOptions = {
        screenshot: flags.screenshot,
        preset: flags.preset,
        axes: flags.axes,
        api: flags.api,
        timeout: flags.timeout || undefined,
        includeSystem: flags.initDesignMd || flags.initTokens || undefined,
        a11y: flags.a11y || undefined,
      };
      if (flags.designMd && !flags.remote) {
        const loaded = await loadDesignMd(flags.designMd, url);
        if (loaded) scanOpts.designMd = loaded.text;
        else if (!machineOutput)
          console.error(
            `${C.grey}No DESIGN.md found for ${url} (auto) — skipping the system axis.${C.reset}`
          );
      } else if (flags.designMd && flags.remote) {
        scanOpts.designMd = flags.designMd;
      }
      const r = flags.remote ? await scanRemote(url, scanOpts) : await scanUrl(url, scanOpts);
      if (flags.aeo) {
        try {
          r.aeo = flags.remote
            ? await aeoRemote(url, { api: flags.api })
            : await runAeoChecks(url, { timeoutMs: 12000 });
        } catch (e) {
          r.aeo = { error: e.message };
        }
      }
      results.push(r);
      if (!machineOutput) {
        renderPretty(r);
        if (r.system) renderSystem(r.system);
        if (r.aeo && !r.aeo.error) renderAeo(r.aeo);
        else if (r.aeo && r.aeo.error)
          console.log(`  ${C.yellow}⚠ AEO check failed: ${r.aeo.error}${C.reset}\n`);
      }
    } catch (err) {
      const errResult = stampScanResult({ url, error: err.message });
      results.push(errResult);
      if (!machineOutput) {
        console.error(`\n${C.red}${C.bold}✗ ${url}${C.reset}`);
        console.error(`  ${C.red}${err.message}${C.reset}\n`);
      }
    }
  }
  if (flags.initDesignMd) {
    const docs = results.map((r) => {
      if (r.error || r.blocked) return `# Error scanning ${r.url}: ${r.error || r.code}`;
      let host = 'Site';
      try {
        host = new URL(r.finalUrl || r.url).hostname.replace(/^www\./, '');
      } catch {}
      return generateDesignMd(r.systemContext || {}, {
        name: r.title || host,
        url: r.finalUrl || r.url,
      });
    });
    console.log(docs.join('\n\n'));
  } else if (flags.initTokens) {
    const docs = results.map((r) => {
      if (r.error || r.blocked) return { url: r.url, error: r.error || r.code };
      let host = 'Site';
      try {
        host = new URL(r.finalUrl || r.url).hostname.replace(/^www\./, '');
      } catch {}
      return extractDtcgTokens(r.systemContext || {}, { name: r.title || host });
    });
    console.log(JSON.stringify(docs.length === 1 ? docs[0] : docs, null, 2));
  } else if (flags.fixPrompt) {
    const prompts = results.map((r) =>
      r.error || r.blocked
        ? `# Cannot build fix prompt for ${r.url}\n\n${r.error || r.code}`
        : buildFixPrompt(r)
    );
    console.log(prompts.join('\n\n---\n\n'));
  } else if (flags.sarif) {
    console.log(JSON.stringify(buildSarifReport(results), null, 2));
  } else if (flags.json) {
    console.log(
      JSON.stringify(stampScanResult(results.length === 1 ? results[0] : results), null, 2)
    );
  }

  // ── CI gate (--fail-on / --fail-under) ──────────────────────────────────────
  // 0 scored, 1 over the gate, 2 could not scan. An unscannable page wins over
  // the gate so an outage is never reported as a finding or as Clean.
  const exitCode = exitCodeForScanResults(results, {
    failOn: flags.failOn,
    failUnderScore: flags.failUnderScore,
  });

  // Summary if multiple URLs
  if (urls.length > 1 && !machineOutput) {
    console.log(`${C.bold}━━━ Summary ━━━${C.reset}`);
    for (const r of results) {
      if (r.blocked) {
        console.log(
          `  ${C.yellow}⚠ blocked${C.reset}  ${C.grey}${r.code.padEnd(20)}${C.reset}  ${r.url}`
        );
      } else if (r.error) {
        console.log(`  ${C.red}error${C.reset}  ${r.url}`);
      } else {
        const sumScore = r.axes && r.axes.copy ? r.unifiedScore : r.score;
        const sumTier = r.axes && r.axes.copy ? r.unifiedTier : r.tier;
        const sts = tierStyle(sumTier);
        console.log(
          `  ${emoji(sumTier)} ${sts}${sumTier.padEnd(6)}${C.reset}  ` +
            `score ${C.bold}${String(sumScore).padStart(3)}${C.reset}/100  ` +
            `${String(r.patternsFlagged).padStart(2)}/${r.patternsTotal} patterns  ` +
            `${C.grey}${r.url}${C.reset}`
        );
      }
    }
    console.log();
  }

  // Tell the user why we're failing (only when gating + actually failing, and
  // not in machine-output mode where stdout must stay a clean document).
  if (exitCode === 2) {
    console.error(`${C.red}${C.bold}✗ Scan could not run. This is not a Clean score.${C.reset}`);
  } else if (flags.failOn && exitCode === 1 && !machineOutput) {
    console.error(
      `${C.red}${C.bold}✗ --fail-on ${flags.failOn.toLowerCase()}: one or more pages failed the gate.${C.reset}`
    );
  } else if (flags.failUnderScore != null && exitCode === 1 && !machineOutput) {
    console.error(
      `${C.red}${C.bold}✗ --fail-under ${flags.failUnderLabel}: one or more pages failed the gate.${C.reset}`
    );
  }
  process.exit(exitCode);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
