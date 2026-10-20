// scan.mjs — the entire Slop Detect GitHub Action, in one Node 20 module.
//
// Why a single zero-dependency script: composite actions run on the runner's
// own Node, and the runner ships Node 20 (built-in global fetch). By avoiding
// @actions/core / @actions/github we don't have to bundle or commit
// node_modules — the action checks out and runs as-is.
//
// Flow: read inputs → POST the URL to /api/scan → write step outputs + job
// summary → (in a PR) upsert a sticky comment → apply the fail-under gate and
// exit non-zero if the page is too sloppy.

import { appendFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

// GitHub Actions workflow commands. ::error:: surfaces in the run's annotations
// and is the conventional way for a step to flag a failure.
const log = (msg) => process.stdout.write(`${msg}\n`);
const ghError = (msg) => log(`::error::${msg}`);
const ghWarning = (msg, title = '') =>
  log(title ? `::warning title=${title}::${msg}` : `::warning::${msg}`);
const ghNotice = (msg) => log(`::notice::${msg}`);

// SEC-4: surface misconfiguration risk when running on pull_request_target.
export const PULL_REQUEST_TARGET_NOTICE =
  'pull_request_target runs with a write-scoped token even for fork PRs. ' +
  'Pass only a trusted, workflow-derived deploy-preview URL in `url` — never a value from PR-controlled content. ' +
  'Grant least privilege: permissions: pull-requests: write only.';

export function noticeIfPullRequestTarget(eventName = process.env.GITHUB_EVENT_NAME || '') {
  if (eventName !== 'pull_request_target') return false;
  ghNotice(PULL_REQUEST_TARGET_NOTICE);
  return true;
}

export function buildScanPayload(url, opts = {}) {
  const payload = { url };
  const rawAxes = String(opts.axes || '').trim();
  if (rawAxes) {
    if (rawAxes === 'all') payload.axes = ['design', 'copy'];
    else {
      const list = rawAxes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (list.length > 0 && !(list.length === 1 && list[0] === 'design')) {
        payload.axes = list;
      }
    }
  }
  const preset = String(opts.preset || '').trim();
  if (preset && preset !== 'full') payload.preset = preset;
  const designMd = String(opts.designMd || '').trim();
  if (designMd) {
    payload.designMd = designMd === 'auto' || designMd === 'true' ? true : designMd;
  }
  if (opts.share === false || String(opts.share).trim() === 'false') {
    payload.share = false;
  }
  return payload;
}

export function emitPatternWarnings(result) {
  const designTriggered = (result?.patterns || []).filter((p) => p.triggered);
  const copyTriggered = (result?.axes?.copy?.patterns || []).filter((p) => p.triggered);
  const target = result?.finalUrl || result?.url || '';
  let count = 0;
  for (const p of [...designTriggered, ...copyTriggered]) {
    ghWarning(
      `${p.label || p.id} (+${p.weight})${target ? ` on ${target}` : ''}`,
      `Slop Pattern (${p.id})`
    );
    count++;
  }
  for (const d of result?.system?.drift || []) {
    ghWarning(`${d.message}${target ? ` on ${target}` : ''}`, `DESIGN.md Drift (${d.id})`);
    count++;
  }
  return count;
}

// Fail fast with a clear annotation. Used for any unrecoverable problem so we
// never post a misleading comment off a broken/empty scan.
function die(msg) {
  ghError(msg);
  process.exit(1);
}

// Append a single output line to $GITHUB_OUTPUT. We use the simple `name=value`
// form (values here are single-line: score, grade, tier, short verdict, url).
function setOutput(name, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return; // running locally without the runner — skip silently
  appendFileSync(file, `${name}=${value ?? ''}\n`);
}

// Append markdown to the job summary panel.
function writeSummary(markdown) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  appendFileSync(file, markdown);
}

// ---------------------------------------------------------------------------
// Grade ranking — keep in lockstep with packages/core/src/verdict.js GRADE_BANDS.
// Core only emits a subset (A+, A, A-, B+, B, B-, C, D+, D, F) today, but we
// list the full conventional ladder so a future re-band (e.g. adding C-, C+)
// still compares correctly. Lower index = better grade.
// ---------------------------------------------------------------------------
const GRADE_RANK = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];

function gradeRank(grade) {
  const idx = GRADE_RANK.indexOf(String(grade).trim().toUpperCase());
  // Unknown grade → treat as worst so we err on the side of flagging.
  return idx === -1 ? GRADE_RANK.length : idx;
}

// Is `fail-under` a letter grade rather than a number? Matches A+ … F.
function isLetterGrade(value) {
  return /^[A-F][+-]?$/i.test(String(value).trim());
}

// ---------------------------------------------------------------------------
// Scan the URL via the public API.
// ---------------------------------------------------------------------------
async function scan(apiBase, url, opts = {}) {
  const endpoint = `${apiBase.replace(/\/+$/, '')}/api/scan`;
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const apiKey = opts.apiKey || process.env.SLOP_API_KEY || '';
  if (apiKey) headers['x-api-key'] = apiKey;
  const payload = buildScanPayload(url, opts);

  let res;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch (err) {
    die(`Could not reach slop-detect API at ${endpoint}: ${err.message}`);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    die(`slop-detect API returned a non-JSON response (HTTP ${res.status}).`);
  }

  // The API returns { error } with a 4xx/5xx for bad input or browser failures.
  if (!res.ok || data?.error) {
    die(`Scan failed (HTTP ${res.status}): ${data?.error || 'unknown error'}`);
  }

  // Sanity check we actually got a scored result.
  if (typeof data.score !== 'number' || (payload.share !== false && !data.id)) {
    die('Scan response was missing a score/id — refusing to report partial data.');
  }

  return data;
}

// AEO is a separate, optional audit. Its failure must not abort the design
// scan, but a requested audit that silently vanishes from the report is
// misleading — so every failure path emits a ::warning and returns null.
export async function scanAeo(apiBase, url, opts = {}) {
  const endpoint = `${apiBase.replace(/\/+$/, '')}/api/aeo`;
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const apiKey = opts.apiKey || process.env.SLOP_API_KEY || '';
  if (apiKey) headers['x-api-key'] = apiKey;
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const warn = (reason) => {
    ghWarning(`AEO audit was requested but could not run: ${reason}`, 'AEO audit skipped');
    return null;
  };
  let res;
  try {
    res = await fetchImpl(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url }),
    });
  } catch (err) {
    return warn(`could not reach ${endpoint} (${err?.message || err})`);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    // handled below
  }
  if (!res.ok || !data || data.error) {
    return warn(`HTTP ${res.status}${data?.error ? ` — ${data.error}` : ''}`);
  }
  if (typeof data.score !== 'number') {
    return warn('response was missing a numeric score');
  }
  return data;
}

// ---------------------------------------------------------------------------
// Threshold gate. Returns { passed, reason } given the result + fail-under.
// ---------------------------------------------------------------------------
export function evaluateThreshold(result, failUnder) {
  const raw = String(failUnder ?? '').trim();

  // Empty → report-only, always passes.
  if (raw === '') {
    return { passed: true, mode: 'report-only', reason: 'No threshold set — report only.' };
  }

  if (result?.error || result?.blocked) {
    return {
      passed: false,
      mode: 'failed-scan',
      reason: result.error
        ? `Scan error: ${result.error}`
        : `Scan blocked (${result.code || 'blocked'}).`,
    };
  }

  const effectiveScore =
    typeof result.unifiedScore === 'number' ? result.unifiedScore : result.score;
  const effectiveGrade = result.unifiedGrade || result.grade;

  if (isLetterGrade(raw)) {
    const wanted = raw.toUpperCase();
    const got = String(effectiveGrade).toUpperCase();
    // Higher rank index = worse grade. Page fails when its grade is strictly
    // worse than the requested floor.
    const passed = gradeRank(got) <= gradeRank(wanted);
    return {
      passed,
      mode: 'grade',
      reason: passed
        ? `Grade ${got} is at least as good as ${wanted}.`
        : `Grade ${got} is worse than the required ${wanted}.`,
    };
  }

  const limit = Number(raw);
  if (Number.isNaN(limit)) {
    // Not empty, not a grade, not a number — misconfiguration. Fail loudly.
    return {
      passed: false,
      mode: 'invalid',
      reason: `fail-under "${raw}" is neither a number nor a letter grade (A+ … F).`,
    };
  }

  // Score is 0–100, LOWER is better. Fail when slop score exceeds the limit.
  const passed = effectiveScore <= limit;
  return {
    passed,
    mode: 'score',
    reason: passed
      ? `Score ${effectiveScore} is within the limit of ${limit}.`
      : `Score ${effectiveScore} exceeds the limit of ${limit}.`,
  };
}

// ---------------------------------------------------------------------------
// Markdown builders (shared by job summary + PR comment).
// ---------------------------------------------------------------------------
const STICKY_MARKER = '<!-- slop-detect-action -->';

function triggeredTable(result) {
  const designTriggered = (result.patterns || []).filter((p) => p.triggered);
  const copyTriggered = (result.axes?.copy?.patterns || []).filter((p) => p.triggered);
  const triggered = [...designTriggered, ...copyTriggered];
  if (triggered.length === 0) {
    return '_No slop patterns triggered — clean._';
  }
  const rows = triggered
    .map((p) => `| ${p.label || p.id} | ${p.axis || 'design'} | +${p.weight} |`)
    .join('\n');
  return ['| Pattern | Axis | Weight |', '| --- | :---: | ---: |', rows].join('\n');
}

export function reportBody(apiBase, result, gate, { withMarker } = {}) {
  const base = apiBase.replace(/\/+$/, '');
  const ogUrl = result.id ? `${base}/og/${result.id}.png` : null;
  const resultUrl = result.resultUrl || (result.id ? `${base}/r/${result.id}` : base);
  const gateLine =
    gate.mode === 'report-only'
      ? '📊 **Report only** — no threshold set.'
      : gate.passed
        ? `✅ **Pass** — ${gate.reason}`
        : `❌ **Fail** — ${gate.reason}`;

  const extraAxesRows = [];
  if (result.axes?.copy) {
    const c = result.axes.copy;
    extraAxesRows.push(
      `| **Copy Slop** (lower is better) | ${c.score}/100 (${c.grade || '?'}) | ${c.tier} | ${c.patternsFlagged}/${c.patternsTotal} flagged |`
    );
  }
  if (result.system?.declared) {
    const s = result.system;
    extraAxesRows.push(
      `| **System (\`DESIGN.md\`)** (higher is better) | ${s.score}/100 | ${s.tier} | ${s.drift?.length || 0} drift |`
    );
  }
  if (result.aeo && typeof result.aeo.score === 'number') {
    const a = result.aeo;
    extraAxesRows.push(
      `| **AEO Readiness** (higher is better) | ${a.score}/${a.maxScore || 100} | ${a.tier} | ${a.failed?.length || 0} failed |`
    );
  }

  const lines = [
    withMarker ? STICKY_MARKER : null,
    `### 🛁 Slop Detect — Grade ${result.unifiedGrade || result.grade}`,
    '',
    ogUrl ? `[![slop card](${ogUrl})](${resultUrl})` : null,
    ogUrl ? '' : null,
    '| Axis | Score | Tier | Signals |',
    '| :--- | :---: | :---: | :---: |',
    `| **Design Slop** (lower is better) | **${result.score}/100** (${result.grade}) | ${result.tier} | ${result.patternsFlagged}/${result.patternsTotal} flagged |`,
    ...extraAxesRows,
    '',
    `> _${result.verdict}_`,
    '',
    gateLine,
    '',
    '<details><summary>Patterns triggered</summary>',
    '',
    triggeredTable(result),
    '',
    '</details>',
    '',
    result.id ? `🔗 [Full result](${resultUrl})` : null,
    result.id ? '' : null,
    `<sub>Scanned by [slop-detect](https://slop-detect.com) · defs ${result.definitionsVersion}</sub>`,
  ];
  return lines.filter((l) => l !== null).join('\n');
}

// ---------------------------------------------------------------------------
// Sticky PR comment via the GitHub REST API (direct fetch, no octokit).
// ---------------------------------------------------------------------------
function readPrNumber() {
  // Only pull_request / pull_request_target carry a PR number in the payload.
  const event = process.env.GITHUB_EVENT_NAME || '';
  if (event !== 'pull_request' && event !== 'pull_request_target') return null;

  const path = process.env.GITHUB_EVENT_PATH;
  if (!path) return null;
  try {
    const payload = JSON.parse(readFileSync(path, 'utf8'));
    return payload?.pull_request?.number || payload?.number || null;
  } catch {
    return null;
  }
}

async function gh(apiUrl, token, pathname, init = {}) {
  const res = await fetch(`${apiUrl}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  return res;
}

async function upsertStickyComment(token, repo, prNumber, body) {
  const apiUrl = process.env.GITHUB_API_URL || 'https://api.github.com';
  const [owner, name] = repo.split('/');
  const base = `/repos/${owner}/${name}/issues/${prNumber}/comments`;

  // 1) Look for our existing comment by the hidden marker.
  let existingId = null;
  try {
    const listRes = await gh(apiUrl, token, `${base}?per_page=100`);
    if (listRes.ok) {
      const comments = await listRes.json();
      const mine = comments.find((c) => (c.body || '').includes(STICKY_MARKER));
      if (mine) existingId = mine.id;
    } else {
      log(`Could not list PR comments (HTTP ${listRes.status}); will try to create a new one.`);
    }
  } catch (err) {
    log(`Listing PR comments failed: ${err.message}`);
  }

  // 2) PATCH the existing one, or POST a fresh comment.
  try {
    if (existingId) {
      const res = await gh(apiUrl, token, `/repos/${owner}/${name}/issues/comments/${existingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        log(`Updated sticky comment #${existingId}.`);
        return;
      }
      log(`Failed to update comment (HTTP ${res.status}); posting a new one.`);
    }
    const res = await gh(apiUrl, token, base, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
    if (res.ok) {
      log('Posted sticky comment.');
    } else {
      // A failed comment shouldn't fail the whole action — the gate is what matters.
      log(`Could not post PR comment (HTTP ${res.status}).`);
    }
  } catch (err) {
    log(`Posting PR comment failed: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const url = (process.env.INPUT_URL || '').trim();
  const failUnder = process.env.INPUT_FAIL_UNDER || '';
  const apiBase = (process.env.INPUT_API_BASE || 'https://slop-detect.com').trim();
  const axes = (process.env.INPUT_AXES || 'design').trim();
  const preset = (process.env.INPUT_PRESET || 'full').trim();
  const designMd = (process.env.INPUT_DESIGN_MD || '').trim();
  const aeoEnabled = (process.env.INPUT_AEO || 'false').trim() === 'true';
  const apiKey = (process.env.INPUT_API_KEY || process.env.SLOP_API_KEY || '').trim();
  const share = (process.env.INPUT_SHARE || 'true').trim() !== 'false';
  const commentEnabled = (process.env.INPUT_COMMENT || 'true').trim() === 'true';
  const token = process.env.GITHUB_TOKEN || '';

  if (!url) die('Input "url" is required.');

  noticeIfPullRequestTarget();

  log(`Scanning ${url} via ${apiBase} …`);
  const result = await scan(apiBase, url, { axes, preset, designMd, apiKey, share });
  if (aeoEnabled) {
    const aeo = await scanAeo(apiBase, url, { apiKey });
    if (aeo) result.aeo = aeo;
  }
  const resultUrl =
    result.resultUrl || (result.id ? `${apiBase.replace(/\/+$/, '')}/r/${result.id}` : '');

  // Emit GitHub Actions annotations for triggered patterns & drift.
  emitPatternWarnings(result);

  // Outputs for downstream steps.
  setOutput('score', result.score);
  setOutput('grade', result.grade);
  setOutput('tier', result.tier);
  setOutput('verdict', result.verdict);
  setOutput('copy-score', result.axes?.copy?.score ?? '');
  setOutput('unified-score', result.unifiedScore ?? result.score);
  setOutput('system-score', result.system?.score ?? '');
  setOutput('aeo-score', result.aeo?.score ?? '');
  setOutput('result-url', resultUrl);

  // Evaluate the gate before writing the report so the report reflects pass/fail.
  const gate = evaluateThreshold(result, failUnder);

  // Job summary — same markdown as the comment but without the sticky marker.
  writeSummary(`${reportBody(apiBase, result, gate, { withMarker: false })}\n`);

  log(
    `Result: grade ${result.grade}, score ${result.score}/100, tier ${result.tier}${resultUrl ? ` → ${resultUrl}` : ''}`
  );

  // Sticky PR comment, if applicable.
  const prNumber = readPrNumber();
  const repo = process.env.GITHUB_REPOSITORY || '';
  if (commentEnabled && prNumber && token && repo.includes('/')) {
    await upsertStickyComment(
      token,
      repo,
      prNumber,
      reportBody(apiBase, result, gate, { withMarker: true })
    );
  } else if (commentEnabled && prNumber && !token) {
    log('Comment requested but no github-token available — skipping PR comment.');
  }

  // Apply the gate.
  if (gate.passed) {
    ghNotice(`Slop check passed: ${gate.reason}`);
    process.exit(0);
  } else {
    ghError(`Slop check failed: ${gate.reason}`);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => die(`Unexpected error: ${err?.stack || err?.message || err}`));
}
