#!/usr/bin/env node
// Slop Detector CLI
//
// Usage:
//   slop-detector <url> [<url2> ...] [--json] [--screenshot]
//
// Scores any URL against the 16-rule AI-design-slop fingerprint and emits a
// pretty terminal report or a machine-readable JSON blob.

import { scanUrl } from '../src/detector.js';
import { isPreset, PRESETS } from 'slop-detect-core';

const args = process.argv.slice(2);
const urls = [];
const flags = { json: false, screenshot: false, verbose: false, preset: 'full' };

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--json' || a === '-j') flags.json = true;
  else if (a === '--screenshot') flags.screenshot = true;
  else if (a === '--verbose' || a === '-v') flags.verbose = true;
  else if (a === '--help' || a === '-h') { help(); process.exit(0); }
  else if (a === '--preset' || a === '-p') {
    const val = args[++i];
    if (!val || !isPreset(val)) {
      console.error(`Unknown preset: ${val}. Options: ${Object.keys(PRESETS).join(', ')}`);
      process.exit(1);
    }
    flags.preset = val;
  } else if (a.startsWith('--preset=')) {
    const val = a.slice('--preset='.length);
    if (!isPreset(val)) {
      console.error(`Unknown preset: ${val}. Options: ${Object.keys(PRESETS).join(', ')}`);
      process.exit(1);
    }
    flags.preset = val;
  } else if (a.startsWith('--')) { console.error(`Unknown flag: ${a}`); process.exit(1); }
  else urls.push(a);
}

if (urls.length === 0) {
  help();
  process.exit(1);
}

function help() {
  console.log(`
Slop Detector — score landing pages against 16 AI-design-slop patterns

Usage:
  slop-detector <url> [<url2> ...] [options]

Options:
  --json, -j        Emit JSON instead of pretty output
  --screenshot      Include a base64 hero screenshot in JSON output
  --verbose, -v     Show evidence details for every triggered pattern
  --preset, -p <p>  Scoring preset: full (default), strict, marketing, minimal
  --help, -h        Show this help

Examples:
  slop-detector https://news.ycombinator.com
  slop-detector https://aura.build https://lovable.dev --verbose
  slop-detector https://example.com --json > result.json

The 16 patterns scored:
   1. Slop fonts            — Inter / Geist / Space Grotesk
   2. VibeCode Purple       — filled indigo CTAs
   3. Gradient text         — hero H1 background-clip:text
   4. Gradient backgrounds  — 5+ gradient elements
   5. Accent stripe         — colored top/left card borders
   6. Glassmorphism         — backdrop blur on translucent layers
   7. Colored glows         — big colored box-shadows
   8. Centered hero         — centered + big + slop font
   9. Eyebrow pill          — "Now in beta" / "New" above H1
  10. All-caps labels       — uppercase section labels
  11. Perma dark mode       — dark BG + mid-grey body text
  12. Icon cards            — 3+ identical feature cards
  13. Numbered steps        — 1/2/3 sequences
  14. Stat banner           — "10k+", "99.9%" cluster
  15. FAQ accordion         — <details> in lower half
  16. Letter avatars        — gradient-initial testimonial avatars

Tier thresholds:
  Clean: 0-9   ·   Mild: 10-27   ·   Heavy: 28+
`);
}

// ── ANSI colors ──────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', grey: '\x1b[90m'
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
  console.log(`  ${emoji(result.tier)} ${ts}${C.bold}${result.tier}${C.reset}` +
    `  ·  ${C.bold}${result.grade || '?'}${C.reset}` +
    `  ·  score ${C.bold}${result.score}${C.reset}/100` +
    `  ·  ${C.bold}${result.patternsFlagged}${C.reset}/${result.patternsTotal} patterns triggered`);
  if (result.verdict) console.log(`  ${C.grey}${result.verdict}${C.reset}`);
  console.log();

  const flagged = result.patterns.filter(p => p.triggered);
  const clean = result.patterns.filter(p => !p.triggered);

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
    const names = clean.map(p => p.short).join(', ');
    console.log(`  ${C.dim}${names}${C.reset}`);
    console.log();
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
(async () => {
  const results = [];
  for (const url of urls) {
    try {
      const r = await scanUrl(url, { screenshot: flags.screenshot, preset: flags.preset });
      results.push(r);
      if (!flags.json) renderPretty(r);
    } catch (err) {
      const errResult = { url, error: err.message };
      results.push(errResult);
      if (!flags.json) {
        console.error(`\n${C.red}${C.bold}✗ ${url}${C.reset}`);
        console.error(`  ${C.red}${err.message}${C.reset}\n`);
      }
    }
  }
  if (flags.json) {
    console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
  }
  // Summary if multiple URLs
  if (urls.length > 1 && !flags.json) {
    console.log(`${C.bold}━━━ Summary ━━━${C.reset}`);
    for (const r of results) {
      if (r.blocked) {
        console.log(`  ${C.yellow}⚠ blocked${C.reset}  ${C.grey}${r.code.padEnd(20)}${C.reset}  ${r.url}`);
      } else if (r.error) {
        console.log(`  ${C.red}error${C.reset}  ${r.url}`);
      } else {
        const ts = tierStyle(r.tier);
        console.log(`  ${emoji(r.tier)} ${ts}${r.tier.padEnd(6)}${C.reset}  ` +
          `score ${C.bold}${String(r.score).padStart(3)}${C.reset}/100  ` +
          `${String(r.patternsFlagged).padStart(2)}/16 patterns  ` +
          `${C.grey}${r.url}${C.reset}`);
      }
    }
    console.log();
  }
})().catch(e => { console.error(e); process.exit(1); });
