#!/usr/bin/env node
// Slop Detector CLI
//
// Usage:
//   slop-detector <url> [<url2> ...] [--json] [--screenshot]
//
// Scores any URL against the AI-design-slop fingerprint and emits a
// pretty terminal report or a machine-readable JSON blob.

import { scanUrl, scanRemote, aeoRemote, loadDesignMd, buildSarifReport } from '../src/index.js';
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
} from '@slop-detect/core';

const CLI_VERSION = '0.8.0';
const args = process.argv.slice(2);
const urls = [];
const flags = {
  json: false,
  sarif: false,
  fixPrompt: false,
  initDesignMd: false,
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

// Tier severity ordering for --fail-on. A scan exits non-zero when its tier is
// at or above the requested threshold. 'blocked'/'error' always count as failures
// regardless of threshold (you asked us to gate, we couldn't even score).
const TIER_RANK = { Clean: 0, Mild: 1, Heavy: 2 };
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

const VALID_AXES = ['design', 'copy'];
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
  else if (a === '--screenshot') flags.screenshot = true;
  else if (a === '--verbose' || a === '-v') flags.verbose = true;
  else if (a === '--version' || a === '-V') {
    console.log(`slop-detect ${CLI_VERSION} (defs ${DEFINITIONS_VERSION})`);
    process.exit(0);
  } else if (a === '--copy') flags.axes = ['design', 'copy'];
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
  --screenshot        Include a base64 hero screenshot in JSON output
  --verbose, -v       Show evidence details for every triggered pattern
  --preset, -p <p>    Scoring preset: full (default), strict, marketing, minimal
  --axes <list>       Axes to score: design (default), copy. Comma-separated or "all"
  --copy              Shorthand for --axes design,copy
  --aeo               Add the AEO axis: can AI engines (ChatGPT/Claude/Perplexity)
                      actually read & cite this page? (network checks, no browser)
  --remote            Scan via the slop-detect.com API instead of a local browser
                      (no Playwright/Chromium install needed). Honors SLOP_API_KEY.
  --api <url>         Use a custom API base (implies --remote). Env: SLOP_API
  --design-md <src>   System axis: check the page against its declared design
                      system (DESIGN.md spec). <src> = file path, URL, or "auto"
                      (looks for <origin>/DESIGN.md). Reports drift, not slop —
                      higher is better.
  --fail-on <tier>    Exit non-zero (1) if any page scores at/above tier: mild | heavy.
                      A blocked or errored scan also exits 1. Use this to gate CI.
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
  const multi = result.axes && result.axes.copy;
  if (multi) {
    const ut = tierStyle(result.unifiedTier);
    console.log(
      `  ${emoji(result.unifiedTier)} ${ut}${C.bold}${result.unifiedTier}${C.reset}` +
        `  ·  ${C.bold}${result.unifiedGrade}${C.reset}` +
        `  ·  unified ${C.bold}${result.unifiedScore}${C.reset}/100` +
        `  ${C.grey}(${result.axes ? Object.keys(result.axes).length : 1} axes)${C.reset}`
    );
    console.log();
    for (const name of Object.keys(result.axes)) {
      const ax = result.axes[name];
      const ax_ts = tierStyle(ax.tier);
      const note = ax.thin ? `${C.grey} (too little copy to judge)${C.reset}` : '';
      console.log(
        `  ${emoji(ax.tier)} ${C.bold}${name.padEnd(7)}${C.reset} ${ax_ts}${ax.tier.padEnd(6)}${C.reset}` +
          `  ${ax.grade.padEnd(3)}  score ${C.bold}${String(ax.score).padStart(3)}${C.reset}/100` +
          `  ${String(ax.patternsFlagged).padStart(2)}/${ax.patternsTotal} flagged${note}`
      );
    }
    console.log();
  } else {
    console.log(
      `  ${emoji(result.tier)} ${ts}${C.bold}${result.tier}${C.reset}` +
        `  ·  ${C.bold}${result.grade || '?'}${C.reset}` +
        `  ·  score ${C.bold}${result.score}${C.reset}/100` +
        `  ·  ${C.bold}${result.patternsFlagged}${C.reset}/${result.patternsTotal} patterns triggered`
    );
    if (result.verdict) console.log(`  ${C.grey}${result.verdict}${C.reset}`);
    console.log();
  }

  // Design-axis pattern detail (always shown — it's the primary fingerprint).
  const flagged = result.patterns.filter((p) => p.triggered);
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
  if (tier === 'AI-Ready') return C.green;
  if (tier === 'Partial') return C.yellow;
  return C.red;
}
function aeoEmoji(tier) {
  if (tier === 'AI-Ready') return '🟢';
  if (tier === 'Partial') return '🟡';
  return '🔴';
}

function renderAeo(aeo) {
  const ts = aeoTierStyle(aeo.tier);
  console.log(
    `  ${aeoEmoji(aeo.tier)} ${C.bold}AEO    ${C.reset} ${ts}${aeo.tier.padEnd(10)}${C.reset}` +
      `  score ${C.bold}${String(aeo.score).padStart(3)}${C.reset}/${aeo.maxScore}` +
      `  ${C.grey}(${aeo.passed.length}/${aeo.checks.length} checks · ${aeo.durationMs}ms)${C.reset}`
  );
  console.log(`  ${C.grey}Can AI engines read & cite this page?${C.reset}`);
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

const machineOutput = flags.json || flags.sarif || flags.fixPrompt || flags.initDesignMd;

// ── Main ────────────────────────────────────────────────────────────────────
(async () => {
  const results = [];
  for (const url of urls) {
    try {
      const scanOpts: ScanOptions = {
        screenshot: flags.screenshot,
        preset: flags.preset,
        axes: flags.axes,
        api: flags.api,
        timeout: flags.timeout || undefined,
        includeSystem: flags.initDesignMd || undefined,
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
      const errResult = { url, error: err.message };
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
    console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
  }

  // ── CI gate (--fail-on / --fail-under) ──────────────────────────────────────
  // Determine the exit code BEFORE the summary so the summary can annotate it.
  // A result fails the gate if: it errored, it was blocked (couldn't score), or
  // its effective tier/score ranks worse than the threshold.
  let exitCode = 0;
  if (flags.failOn) {
    const threshold = TIER_RANK[flags.failOn];
    const failed = results.some((r) => {
      if (r.error || r.blocked) return true;
      const tier = r.axes && r.axes.copy ? r.unifiedTier : r.tier;
      return (TIER_RANK[tier] ?? 0) >= threshold;
    });
    if (failed) exitCode = 1;
  }
  if (flags.failUnderScore != null) {
    const maxAllowed = flags.failUnderScore;
    const failed = results.some((r) => {
      if (r.error || r.blocked) return true;
      const score = r.axes && r.axes.copy ? r.unifiedScore : r.score;
      return typeof score !== 'number' || score > maxAllowed;
    });
    if (failed) exitCode = 1;
  }

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
  if (flags.failOn && exitCode !== 0 && !machineOutput) {
    console.error(
      `${C.red}${C.bold}✗ --fail-on ${flags.failOn.toLowerCase()}: one or more pages failed the gate.${C.reset}`
    );
  }
  if (flags.failUnderScore != null && exitCode !== 0 && !machineOutput) {
    console.error(
      `${C.red}${C.bold}✗ --fail-under ${flags.failUnderLabel}: one or more pages failed the gate.${C.reset}`
    );
  }
  process.exit(exitCode);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
