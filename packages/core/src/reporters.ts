// Reporter matrix (W-02). One layer over a scan result.
// `agent` is one line per triggered finding. Review findings stay warnings.
// A blocked result is not printed as a passing case.

import { FIXES } from './fixes.js';
import { firstSample, scanCouldNotScore, triggeredPatterns } from './brief.js';

function fixFor(
  id: string
): { rule?: string; problem?: string; fix?: string; alternatives?: string[] } | undefined {
  return (
    FIXES as Record<
      string,
      { rule?: string; problem?: string; fix?: string; alternatives?: string[] }
    >
  )[id];
}

export const REPORT_FORMATS = ['agent', 'github', 'sarif', 'junit', 'gitlab', 'json'] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

export function isReportFormat(value: string): value is ReportFormat {
  return (REPORT_FORMATS as readonly string[]).includes(value);
}

function asList(result: any): any[] {
  return Array.isArray(result) ? result : [result];
}

function selectorOf(pattern: any): string {
  const evidence = pattern?.evidence || {};
  if (typeof evidence.selector === 'string' && evidence.selector.trim())
    return evidence.selector.trim();
  if (typeof evidence.domPath === 'string' && evidence.domPath.trim())
    return evidence.domPath.trim();
  if (Array.isArray(evidence.selectors) && evidence.selectors[0])
    return String(evidence.selectors[0]);
  return '-';
}

function oneLine(text: string): string {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function fixRule(pattern: any): string {
  const rule = fixFor(pattern?.id)?.rule || pattern?.label || pattern?.id || 'review the finding';
  return oneLine(rule);
}

export function formatDefaultReport(result: any): string {
  const blocks: string[] = [];
  for (const page of asList(result)) {
    if (scanCouldNotScore(page)) {
      blocks.push(`Scan could not run for ${page?.url || 'this page'}. This is not a Clean score.`);
      continue;
    }
    blocks.push(
      `Slop Detector report\nscore ${page.score}\ntier ${page.tier}\nurl ${page.url || ''}`
    );
    for (const pattern of triggeredPatterns(page)) {
      const fix = fixFor(pattern.id);
      const problem = fix?.problem || pattern.label || '';
      const recipe = fix?.fix || '';
      const alts = (fix?.alternatives || []).join('\n');
      blocks.push(
        [pattern.label || pattern.id, problem, recipe, alts, JSON.stringify(pattern.evidence || {})]
          .filter(Boolean)
          .join('\n')
      );
    }
  }
  return blocks.join('\n\n');
}

export function formatAgentReport(result: any): string {
  const lines: string[] = [];
  for (const page of asList(result)) {
    if (scanCouldNotScore(page)) {
      lines.push('Scan could not run. This is not a Clean score.');
      continue;
    }
    for (const pattern of triggeredPatterns(page)) {
      const message = oneLine(firstSample(pattern));
      lines.push(`${pattern.id} ${selectorOf(pattern)}: ${message} → ${fixRule(pattern)}`);
    }
  }
  return lines.join('\n');
}

function githubLevel(pattern: any): 'error' | 'warning' | 'notice' {
  if (pattern?.status === 'unknown') return 'notice';
  if (pattern?.status === 'review' || pattern?.weight === 0) return 'warning';
  return pattern?.weight >= 6 ? 'error' : 'warning';
}

export function formatGithubReport(result: any): string {
  const lines: string[] = [];
  for (const page of asList(result)) {
    if (scanCouldNotScore(page)) {
      lines.push('::error::Scan could not run. This is not a Clean score.');
      continue;
    }
    const titleUrl = page.finalUrl || page.url || '';
    for (const pattern of triggeredPatterns(page)) {
      const level = githubLevel(pattern);
      const message = oneLine(`${pattern.label || pattern.id}: ${firstSample(pattern)}`);
      lines.push(`::${level} title=${pattern.id}::${titleUrl} ${message}`);
    }
  }
  return lines.join('\n');
}

function xmlEscape(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatJunitReport(result: any): string {
  const cases: string[] = [];
  let failures = 0;
  let skipped = 0;
  for (const page of asList(result)) {
    const name = page?.finalUrl || page?.url || 'page';
    if (scanCouldNotScore(page)) {
      failures += 1;
      cases.push(
        `  <testcase name="scan" classname="${xmlEscape(name)}"><failure message="Scan could not run. This is not a Clean score."/></testcase>`
      );
      continue;
    }
    const patterns = Array.isArray(page.patterns) ? page.patterns : [];
    const copy =
      page.axes && page.axes.copy && Array.isArray(page.axes.copy.patterns)
        ? page.axes.copy.patterns
        : [];
    for (const pattern of [...patterns, ...copy]) {
      if (!pattern?.id) continue;
      const open = `  <testcase name="${xmlEscape(pattern.id)}" classname="${xmlEscape(name)}">`;
      if (pattern.status === 'review' || pattern.status === 'unknown') {
        skipped += 1;
        cases.push(`${open}<skipped message="${xmlEscape(pattern.status)}"/></testcase>`);
      } else if (pattern.triggered) {
        failures += 1;
        cases.push(
          `${open}<failure message="${xmlEscape(oneLine(firstSample(pattern)))}" type="${xmlEscape(pattern.status || 'fail')}"/></testcase>`
        );
      } else {
        cases.push(`${open}</testcase>`);
      }
    }
  }
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<testsuite name="slop-detect" tests="${cases.length}" failures="${failures}" skipped="${skipped}">`,
    ...cases,
    `</testsuite>`,
  ].join('\n');
}

function fingerprint(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function formatGitlabReport(result: any): string {
  const rows: any[] = [];
  for (const page of asList(result)) {
    if (scanCouldNotScore(page)) {
      const path = page?.url || 'unscanned';
      rows.push({
        description: 'Scan could not run. This is not a Clean score.',
        check_name: 'scan',
        fingerprint: fingerprint(`scan|${path}`),
        severity: 'critical',
        location: { path, lines: { begin: 1 } },
      });
      continue;
    }
    const path = page.finalUrl || page.url || 'page';
    for (const pattern of triggeredPatterns(page)) {
      const severity =
        pattern.status === 'review' || pattern.weight === 0
          ? 'info'
          : pattern.weight >= 6
            ? 'major'
            : 'minor';
      rows.push({
        description: oneLine(`${pattern.label || pattern.id}: ${firstSample(pattern)}`),
        check_name: pattern.id,
        fingerprint: fingerprint(`${pattern.id}|${path}`),
        severity,
        location: { path, lines: { begin: 1 } },
      });
    }
  }
  return JSON.stringify(rows, null, 2);
}

// A blocked or errored page could not be scanned. A fixture that already lists
// pattern ids without a numeric score is still a findings document. An empty
// document with no score is not a Clean result.
function sarifUnscored(page: any): boolean {
  if (!page || page.blocked || page.error) return true;
  if (typeof page.score === 'number') return false;
  const design = Array.isArray(page.patterns) && page.patterns.some((pattern: any) => pattern?.id);
  const copy =
    Array.isArray(page.axes?.copy?.patterns) &&
    page.axes.copy.patterns.some((pattern: any) => pattern?.id);
  const drift = Array.isArray(page.system?.drift) && page.system.drift.length > 0;
  const checks = Array.isArray(page.aeo?.checks) && page.aeo.checks.length > 0;
  const failed = Array.isArray(page.aeo?.failed) && page.aeo.failed.length > 0;
  return !(design || copy || drift || checks || failed);
}

function helpMarkdown(id: string, fallback: string): string {
  const fix = fixFor(id);
  if (!fix) return fallback || id;
  const parts = [fix.problem, fix.fix, fix.rule].filter((part) => typeof part === 'string' && part);
  if (Array.isArray(fix.alternatives) && fix.alternatives.length) {
    parts.push(fix.alternatives.map((item) => `- ${item}`).join('\n'));
  }
  return parts.join('\n\n') || fallback || id;
}

function selectorOfPattern(pattern: any): string {
  return (
    pattern?.evidence?.selector ||
    pattern?.evidence?.domPath ||
    pattern?.locations?.[0]?.selector ||
    ''
  );
}

function sarifResult(ruleId: string, uri: string, level: string, text: string, selector = '') {
  const location: any = { physicalLocation: { artifactLocation: { uri } } };
  if (selector) location.logicalLocations = [{ fullyQualifiedName: selector }];
  return {
    ruleId,
    level,
    message: { text: oneLine(text) },
    locations: [location],
    partialFingerprints: { primaryLocationLineHash: fingerprint(`${ruleId}|${uri}`) },
  };
}

function ensureRule(rules: Map<string, any>, id: string, name: string, help: string, props: any) {
  if (rules.has(id)) return;
  rules.set(id, {
    id,
    name,
    shortDescription: { text: oneLine(name) },
    help: { markdown: help },
    defaultConfiguration: { level: props.level || 'warning' },
    properties: props,
  });
}

// SARIF 2.1.0. One run per page URL. Fingerprints are pattern id plus URL.
// Locations are the page URL. A selector, when the scan already has one, is a
// logical location. This report does not invent a source line.
export function buildSarifReport(results: any[] = []) {
  const list = Array.isArray(results) ? results : [results];
  const runs: any[] = [];
  for (const page of list) {
    if (!page) continue;
    const uri = page.finalUrl || page.url || 'unscanned';
    const rules = new Map<string, any>();
    const sarifResults: any[] = [];
    if (sarifUnscored(page)) {
      ensureRule(rules, 'scan', 'scan', 'Scan could not run. This is not a Clean score.', {
        level: 'error',
        axis: 'scan',
      });
      sarifResults.push(
        sarifResult('scan', uri, 'error', 'Scan could not run. This is not a Clean score.')
      );
    } else {
      const design = Array.isArray(page.patterns) ? page.patterns : [];
      const copy = Array.isArray(page.axes?.copy?.patterns) ? page.axes.copy.patterns : [];
      for (const pattern of [...design, ...copy]) {
        if (!pattern?.id) continue;
        const level =
          pattern.status === 'review' || pattern.weight === 0
            ? 'warning'
            : pattern.weight >= 6
              ? 'error'
              : 'warning';
        ensureRule(
          rules,
          pattern.id,
          pattern.short || pattern.label || pattern.id,
          helpMarkdown(pattern.id, pattern.label || pattern.id),
          {
            level,
            axis: pattern.axis || 'design',
            category: pattern.category || pattern.axis || 'design',
            weight: pattern.weight,
          }
        );
        if (!pattern.triggered || pattern.waived) continue;
        sarifResults.push(
          sarifResult(
            pattern.id,
            uri,
            level,
            `${pattern.label || pattern.id} (+${pattern.weight}) triggered on ${uri}`,
            selectorOfPattern(pattern)
          )
        );
      }
      for (const drift of Array.isArray(page.system?.drift) ? page.system.drift : []) {
        const ruleId = `system.${drift.id}`;
        ensureRule(rules, ruleId, drift.id, drift.message || `DESIGN.md compliance: ${drift.id}`, {
          level: 'warning',
          axis: 'system',
          category: 'system',
        });
        sarifResults.push(sarifResult(ruleId, uri, 'warning', drift.message || ruleId));
      }
      const aeoChecks = Array.isArray(page.aeo?.checks)
        ? page.aeo.checks
        : Array.isArray(page.aeo?.failed)
          ? page.aeo.failed
          : [];
      for (const check of aeoChecks) {
        if (!check?.id || (check.status !== 'fail' && check.status !== 'warn')) continue;
        const ruleId = `aeo.${check.id}`;
        const level =
          check.status === 'fail' && check.severity === 'required' ? 'error' : 'warning';
        ensureRule(
          rules,
          ruleId,
          check.label || check.id,
          check.message || check.label || check.id,
          {
            level,
            axis: 'aeo',
            category: 'aeo',
          }
        );
        sarifResults.push(sarifResult(ruleId, uri, level, check.message || ruleId));
      }
    }
    runs.push({
      automationDetails: { id: `slop-detect/${fingerprint(uri)}` },
      properties: { category: uri },
      tool: {
        driver: {
          name: 'slop-detect',
          informationUri: 'https://slop-detect.com',
          rules: [...rules.values()],
        },
      },
      results: sarifResults,
    });
  }
  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs,
  };
}
