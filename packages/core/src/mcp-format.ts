// What an agent reads back from the MCP tools, shared by the npm/stdio server
// and the hosted endpoint. Text results are short summaries (#358): the useful
// part of a scan is the triggered patterns, not the full document. Structured
// results keep the schema-required fields plus triggered patterns, so a scan
// fits well under the 10,000-token warning that MCP clients such as Claude
// Code show. A scan that couldn't score is reported as an error (#360).

import { formatEvidence, buildFixPrompt } from './fixes.js';
import {
  scanCouldNotScore,
  buildAvoidList,
  buildGenericAvoidList,
  buildAvoidListFromPatterns,
} from './brief.js';
import { PATTERNS } from './patterns.js';
import { COPY_PATTERNS } from './copyPatterns.js';
import { generateDesignMd, extractDtcgTokens } from './system.js';

export const MCP_CALIBRATION_URL =
  'https://github.com/ravidsrk/slop-detect/blob/main/CALIBRATION.md';

// Triggered patterns listed per axis in the text summary; the structured
// result keeps all of them.
export const MCP_SUMMARY_PATTERN_LIMIT = 12;

function clipText(text: unknown, max: number): string {
  const clean = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

function isTriggered(p: any): boolean {
  return !!(p && p.triggered && !p.waived);
}

function byWeight(a: any, b: any): number {
  return (b.weight || 0) - (a.weight || 0);
}

function evidenceText(p: any): string | null {
  const text = formatEvidence(p) || p?.detail || null;
  return text ? clipText(text, 300) : null;
}

export function isMcpScanFailure(result: any): boolean {
  return scanCouldNotScore(result);
}

// One short error for a page that couldn't be scored. Says why and what to do.
export function formatScanFailure(result: any, fallbackUrl?: string): string {
  const target = (result && (result.finalUrl || result.url)) || fallbackUrl || 'the page';
  const code = result && result.code ? ` (${result.code})` : '';
  const reason = clipText((result && result.error) || 'The scan produced no score.', 240);
  const hint = result && result.hint ? ` ${clipText(result.hint, 240)}` : '';
  return `Scan could not score ${target}${code}: ${reason}${hint} This is not a Clean result.`;
}

// Scored patterns get one line each (heaviest first). Weight-0 review rules add
// no points, so they share one line instead of crowding out the real findings.
function patternLines(patterns: any[]): string[] {
  const scored = patterns.filter((p) => (p.weight || 0) > 0);
  const review = patterns.filter((p) => !((p.weight || 0) > 0));
  const lines = scored.slice(0, MCP_SUMMARY_PATTERN_LIMIT).map((p) => {
    const evidence = evidenceText(p);
    return `- ${p.id} (+${p.weight}) ${clipText(p.label || p.short || p.id, 60)}${evidence ? ` — ${clipText(evidence, 150)}` : ''}`;
  });
  const rest = scored.length - MCP_SUMMARY_PATTERN_LIMIT;
  if (rest > 0)
    lines.push(`- …and ${rest} more (all triggered patterns are in the structured result)`);
  if (review.length) {
    lines.push(
      `- Review-only signals (weight 0, no points): ${review.map((p) => p.id).join(', ')}`
    );
  }
  return lines;
}

function craftOf(result: any): any {
  return result?.craft || result?.axes?.craft || null;
}

function systemLine(sys: any): string | null {
  if (!sys) return null;
  if (!sys.declared) {
    return `DESIGN.md: no system declared (${clipText(sys.message || 'no parseable DESIGN.md tokens', 160)}).`;
  }
  const drift = Array.isArray(sys.drift) ? sys.drift : [];
  const driftText = drift.length
    ? `; ${drift.length} drift signal${drift.length === 1 ? '' : 's'}: ${drift
        .slice(0, 5)
        .map((d: any) => d.id)
        .join(', ')}`
    : '; no drift';
  return `DESIGN.md compliance: ${sys.score}/100 · ${sys.tier} (higher is better)${driftText}.`;
}

export function scanTriggeredIds(result: any): string[] {
  const design = (result?.patterns || []).filter(isTriggered);
  const copy = (result?.axes?.copy?.patterns || []).filter(isTriggered);
  return [...new Set([...design, ...copy].map((p: any) => String(p.id)))];
}

export function formatScanSummary(result: any, opts: { scanId?: string } = {}): string {
  const lines: string[] = [];
  const url = result.finalUrl || result.url;
  lines.push(`Scanned ${url}${result.title ? ` — "${clipText(result.title, 80)}"` : ''}`);
  lines.push(
    `Design: ${result.score}/100 · ${result.tier}${result.grade ? ` · grade ${result.grade}` : ''} (lower is better; Clean 0–9, Mild 10–27, Heavy 28+)`
  );
  if (typeof result.unifiedScore === 'number' && result.unifiedScore !== result.score) {
    lines.push(
      `Unified (design + copy): ${result.unifiedScore}/100 · ${result.unifiedTier || result.tier}`
    );
  }
  if (result.verdict) lines.push(`Verdict: ${clipText(result.verdict, 200)}`);
  if (result.preset && result.preset !== 'full') {
    lines.push(`Preset: ${result.preset} (filters design patterns only)`);
  }

  const design = (result.patterns || []).filter(isTriggered).sort(byWeight);
  const designTotal =
    typeof result.patternsTotal === 'number'
      ? result.patternsTotal
      : (result.patterns || []).length;
  lines.push(
    design.length
      ? `Triggered design patterns (${design.length} of ${designTotal}):`
      : `No design patterns triggered (0 of ${designTotal}).`
  );
  lines.push(...patternLines(design));

  const copy = result.axes && result.axes.copy;
  if (copy && typeof copy.score === 'number') {
    const triggered = (copy.patterns || []).filter(isTriggered).sort(byWeight);
    const total =
      typeof copy.patternsTotal === 'number' ? copy.patternsTotal : (copy.patterns || []).length;
    lines.push(
      `Copy: ${copy.score}/100 · ${copy.tier} (lower is better)` +
        (triggered.length
          ? `; triggered (${triggered.length} of ${total}):`
          : `; no copy patterns triggered (0 of ${total}).`)
    );
    lines.push(...patternLines(triggered));
  }

  const craft = craftOf(result);
  if (craft && typeof craft.score === 'number') {
    const failed = (Array.isArray(craft.failed) ? craft.failed : []).map((f: any) => f.id);
    lines.push(
      `Craft floor: ${craft.score}/100 (separate; never changes the design score)` +
        (failed.length
          ? `; ${failed.length} defect(s): ${failed.slice(0, 6).join(', ')}`
          : '; no defects')
    );
  }
  const sys = systemLine(result.system);
  if (sys) lines.push(sys);

  const ids = scanTriggeredIds(result);
  if (opts.scanId) {
    lines.push(
      `scan_id: ${opts.scanId} — pass it to fix_prompt, check_design_system or extract_design_system to reuse this scan; full document: slop://scan/${opts.scanId}`
    );
  } else if (ids.length) {
    lines.push(
      `Next: fix_prompt with patterns ${JSON.stringify(ids.slice(0, 12))} builds the remediation prompt without another scan.`
    );
  }
  lines.push(
    `Uncalibrated beta; scores measure overlap with template defaults, not authorship: ${MCP_CALIBRATION_URL}`
  );
  return lines.join('\n');
}

const SCAN_SCALARS = [
  'schemaVersion',
  'definitionsVersion',
  'url',
  'finalUrl',
  'title',
  'h1',
  'h1Font',
  'score',
  'tier',
  'grade',
  'verdict',
  'patternsFlagged',
  'patternsScored',
  'patternsTotal',
  'unifiedScore',
  'unifiedTier',
  'unifiedGrade',
  'rawScore',
  'preset',
  'calibration',
  'coverage',
  'blocked',
  'error',
  'code',
  'hint',
];

function compactPattern(p: any) {
  const out: Record<string, any> = {
    id: p.id,
    label: p.label || p.short || p.id,
    status: p.status || (p.triggered ? 'fail' : 'pass'),
    triggered: !!p.triggered,
  };
  if (typeof p.weight === 'number') out.weight = p.weight;
  if (p.waived) out.waived = true;
  if (Array.isArray(p.locations) && p.locations.length > 0) {
    const selectors = p.locations
      .filter((l: any) => l && typeof l.selector === 'string' && l.selector.trim())
      .slice(0, 2)
      .map((l: any) => ({ selector: clipText(l.selector, 80) }));
    if (selectors.length > 0) out.locations = selectors;
  }
  const evidence = evidenceText(p);
  if (evidence) out.detail = evidence;
  return out;
}

function compactSystem(sys: any) {
  if (!sys || typeof sys !== 'object') return undefined;
  const out: Record<string, any> = { declared: !!sys.declared };
  for (const key of [
    'name',
    'source',
    'score',
    'tier',
    'checksEvaluated',
    'checksSkipped',
    'message',
  ]) {
    if (sys[key] !== undefined) out[key] = sys[key];
  }
  out.drift = (Array.isArray(sys.drift) ? sys.drift : []).map((d: any) => ({
    id: d.id,
    message: clipText(d.message, 240),
  }));
  return out;
}

function compactCraft(craft: any) {
  if (!craft || typeof craft !== 'object') return undefined;
  const out: Record<string, any> = {};
  for (const key of ['score', 'tier', 'scored'])
    if (craft[key] !== undefined) out[key] = craft[key];
  out.failed = (Array.isArray(craft.failed) ? craft.failed : []).map((f: any) => ({
    id: f.id,
    label: f.label,
    ...(typeof f.weight === 'number' ? { weight: f.weight } : {}),
    ...(f.message ? { message: clipText(f.message, 200) } : {}),
  }));
  return out;
}

// Schema-valid scan document trimmed to what an agent acts on.
export function compactScanResult(result: any, opts: { scanId?: string } = {}) {
  const out: Record<string, any> = {};
  for (const key of SCAN_SCALARS) if (result?.[key] !== undefined) out[key] = result[key];
  out.patterns = (result?.patterns || []).filter((p: any) => p && p.triggered).map(compactPattern);
  if (result?.axes && typeof result.axes === 'object') {
    const axes: Record<string, any> = {};
    for (const [name, axis] of Object.entries<any>(result.axes)) {
      if (!axis || typeof axis !== 'object') continue;
      if (name === 'craft') {
        axes.craft = compactCraft(axis);
        continue;
      }
      const entry: Record<string, any> = {};
      for (const key of ['score', 'tier', 'grade', 'patternsFlagged', 'patternsTotal']) {
        if (axis[key] !== undefined) entry[key] = axis[key];
      }
      if (Array.isArray(axis.patterns)) {
        entry.patterns = axis.patterns.filter((p: any) => p && p.triggered).map(compactPattern);
      }
      axes[name] = entry;
    }
    out.axes = axes;
  }
  if (result?.craft) out.craft = compactCraft(result.craft);
  const sys = compactSystem(result?.system);
  if (sys) out.system = sys;
  if (Array.isArray(result?.kitMatches)) {
    const matched = result.kitMatches.filter((k: any) => k && k.matched).map((k: any) => k.id);
    if (matched.length) out.kitMatches = matched;
  }
  if (result?.environment) out.environment = result.environment;
  if (opts.scanId) out.scanId = opts.scanId;
  out.detail = 'summary';
  return out;
}

// ── AEO ──────────────────────────────────────────────────────────────────────

function aeoChecks(report: any): any[] {
  if (Array.isArray(report?.checks)) return report.checks;
  return [...(report?.failed || []), ...(report?.passed || [])];
}

function aeoFailed(report: any): any[] {
  if (Array.isArray(report?.failed)) return report.failed;
  return aeoChecks(report).filter((c) => c && (c.status === 'fail' || c.passed === false));
}

export function formatAeoSummary(report: any): string {
  const max = report.maxScore || 100;
  const failed = aeoFailed(report);
  const total = aeoChecks(report).length || failed.length;
  const lines = [
    `AEO for ${report.url}: ${report.score}/${max} · ${report.tier} (higher is better; Eligible 80+, Partially Eligible 50–79, Restricted below 50)`,
  ];
  if (failed.length) {
    lines.push(`Failed checks (${failed.length} of ${total}):`);
    for (const c of failed) {
      const severity = c.severity ? `${c.severity}, ` : '';
      const weight = typeof c.weight === 'number' ? `-${c.weight}` : '';
      lines.push(
        `- ${c.id || c.label} (${severity}${weight}) ${clipText(c.message || c.label, 200)}`
      );
    }
  } else {
    lines.push(`All ${total} checks passed.`);
  }
  lines.push(
    `Uncalibrated beta; the scanner uses its own user agent, not vendor crawlers: ${MCP_CALIBRATION_URL}`
  );
  return lines.join('\n');
}

export function compactAeoReport(report: any) {
  const out: Record<string, any> = {};
  for (const key of [
    'schemaVersion',
    'axis',
    'definitionsVersion',
    'url',
    'mdUrl',
    'score',
    'maxScore',
    'tier',
    'requiredFailed',
    'recommendedFailed',
  ]) {
    if (report?.[key] !== undefined) out[key] = report[key];
  }
  if (!out.axis) out.axis = 'aeo';
  out.checks = aeoChecks(report).map((c) => ({
    id: c.id,
    label: c.label,
    severity: c.severity,
    weight: c.weight,
    status: c.status,
    passed: c.passed,
    ...(c.message ? { message: clipText(c.message, 240) } : {}),
  }));
  return out;
}

// ── DESIGN.md system axis ────────────────────────────────────────────────────

export function formatSystemSummary(result: any): string {
  const sys = result && result.system;
  if (!sys) {
    return 'No DESIGN.md result in this scan. Pass design_md_url ("auto" or a URL) so the scan checks the declared system.';
  }
  if (!sys.declared) {
    return [
      'DESIGN.md: no system declared.',
      clipText(sys.message || 'No parseable DESIGN.md tokens were found for this page.', 240),
      'To enable this check, publish a DESIGN.md (Google Labs format: YAML front matter with colors, typography, rounded and components tokens) at the site root, or pass design_md_url pointing at one.',
    ].join('\n');
  }
  const drift = Array.isArray(sys.drift) ? sys.drift : [];
  const lines = [
    `DESIGN.md compliance${sys.name ? ` for "${clipText(sys.name, 60)}"` : ''}: ${sys.score}/100 · ${sys.tier} (higher is better; Aligned 80+, Drifting 50–79, Off-system below 50)`,
  ];
  if (sys.source) lines.push(`DESIGN.md: ${sys.source}`);
  if (typeof sys.checksEvaluated === 'number') {
    lines.push(
      `Checks: ${sys.checksEvaluated} evaluated, ${sys.checksSkipped ?? 0} skipped (missing data skips; it is never drift)`
    );
  }
  if (drift.length) {
    lines.push(`Drift (${drift.length}):`);
    for (const d of drift.slice(0, 15)) lines.push(`- ${d.id}: ${clipText(d.message, 200)}`);
  } else {
    lines.push('No drift: the page matches its declared system.');
  }
  lines.push(
    `These are named, contestable checks against the tokens the site itself declares. Uncalibrated beta: ${MCP_CALIBRATION_URL}`
  );
  return lines.join('\n');
}

export function systemStructured(result: any, opts: { scanId?: string } = {}) {
  const sys = compactSystem(result && result.system) || {
    declared: false,
    message: 'No DESIGN.md result in this scan.',
    drift: [],
  };
  return opts.scanId ? { ...sys, scanId: opts.scanId } : sys;
}

// ── DESIGN.md lint / diff ────────────────────────────────────────────────────

export function formatDesignMdLint(lint: any): string {
  const errors = lint?.errors || [];
  const warnings = lint?.warnings || [];
  const issues = lint?.issues || [];
  const lines = [
    `DESIGN.md lint: ${lint?.valid ? 'valid' : 'invalid'}`,
    `specVersion: ${lint?.specVersion || 'unknown'}`,
    `errors: ${errors.length}`,
    `warnings: ${warnings.length}`,
  ];
  if (!issues.length) lines.push('  • No issues.');
  for (const issue of issues) {
    const where = issue.path ? ` (${issue.path})` : '';
    lines.push(`  • ${issue.severity} ${issue.ruleId}${where}: ${issue.message}`);
  }
  lines.push(
    '',
    'Static check only. It does not score a page and does not change Clean, Mild, or Heavy.'
  );
  return lines.join('\n');
}

export function formatDesignMdDiff(diff: any): string {
  const added = diff?.added || [];
  const removed = diff?.removed || [];
  const changed = diff?.changed || [];
  const lines = [
    `DESIGN.md diff: ${diff?.breaking ? 'breaking' : 'compatible'}`,
    `added: ${added.length}`,
    `removed: ${removed.length}`,
    `changed: ${changed.length}`,
  ];
  if (!added.length && !removed.length && !changed.length) lines.push('  • No token changes.');
  for (const row of added) lines.push(`  • added ${row.path} = ${row.value}`);
  for (const row of removed) lines.push(`  • removed ${row.path} = ${row.value}`);
  for (const row of changed) lines.push(`  • changed ${row.path}: ${row.before} → ${row.after}`);
  lines.push('', 'A removed or changed token is breaking. This diff does not rescore a page.');
  return lines.join('\n');
}

// ── fix_prompt ───────────────────────────────────────────────────────────────

const CATALOGUE = new Map<string, any>(
  [...(PATTERNS as any[]), ...(COPY_PATTERNS as any[])].map((p) => [p.id, p])
);

// Pattern-only input for buildFixPrompt: catalogue labels and weights, no
// score, no URL.
export function patternsOnlyResult(ids: string[]) {
  return {
    patterns: ids.map((id) => {
      const entry = CATALOGUE.get(id);
      return {
        id,
        label: entry?.label || id,
        short: entry?.short,
        weight: typeof entry?.weight === 'number' ? entry.weight : 0,
        status: 'fail',
        triggered: true,
      };
    }),
  };
}

export interface FixPromptSource {
  result?: any;
  patterns?: string[];
  brief?: boolean;
  scanId?: string;
}

export function buildMcpFixPrompt(source: FixPromptSource): {
  text: string;
  structured: Record<string, any>;
} {
  const brief = source.brief === true;
  let text: string;
  let triggered: string[] = [];
  let score: number | null = null;
  let tier: string | null = null;
  if (source.result) {
    triggered = scanTriggeredIds(source.result);
    score = typeof source.result.score === 'number' ? source.result.score : null;
    tier = typeof source.result.tier === 'string' ? source.result.tier : null;
    text = brief ? buildAvoidList(source.result) : buildFixPrompt(source.result);
  } else if (source.patterns && source.patterns.length) {
    triggered = source.patterns.slice();
    text = brief
      ? buildAvoidListFromPatterns(source.patterns)
      : buildFixPrompt(patternsOnlyResult(source.patterns));
  } else {
    text = buildGenericAvoidList();
  }
  const structured: Record<string, any> = {
    mode:
      brief || (!source.result && !(source.patterns && source.patterns.length)) ? 'avoid' : 'fix',
    triggeredCount: triggered.length,
    patterns: triggered,
    score,
    tier,
    chars: text.length,
  };
  if (source.scanId) structured.scanId = source.scanId;
  return { text, structured };
}

// ── extract_design_system ────────────────────────────────────────────────────

export function hostnameLabel(rawUrl: unknown): string | null {
  try {
    return new URL(String(rawUrl)).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function buildMcpDesignSystem(opts: {
  observed: any;
  name?: string;
  url?: string;
  format?: string;
}): { text: string; structured: Record<string, any> } {
  const format = opts.format || 'design_md';
  const name = opts.name || hostnameLabel(opts.url) || 'Site Design System';
  const designMd = generateDesignMd(opts.observed || {}, { name, url: opts.url });
  const dtcgTokens = extractDtcgTokens(opts.observed || {}, { name });
  const structured: Record<string, any> = {
    format,
    name,
    designMdChars: designMd.length,
    dtcgTokenGroups: Object.keys(dtcgTokens).filter((k) => !k.startsWith('$')),
  };
  let text: string;
  if (format === 'dtcg') {
    text = JSON.stringify(dtcgTokens, null, 2);
    structured.dtcgTokens = dtcgTokens;
  } else if (format === 'both') {
    text = `Extracted DESIGN.md (${designMd.length} chars) and DTCG 2025.10 tokens for "${name}". See structuredContent.designMd and structuredContent.dtcgTokens.\n\n${designMd}`;
    structured.designMd = designMd;
    structured.dtcgTokens = dtcgTokens;
  } else {
    text = designMd;
    structured.designMd = designMd;
  }
  return { text, structured };
}

// Observed tokens from a scan made with design_md_url / designMd.
export function observedTokensOf(result: any): any | null {
  const ctx = result && result.systemContext;
  return ctx && typeof ctx === 'object' ? ctx : null;
}
