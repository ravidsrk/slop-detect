// Commands that finish without Playwright: static copy, avoid list, diff,
// reporters, and AEO starter files.

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  buildAeoFixFiles,
  buildAvoidList,
  buildRenderedSiteReport,
  collectSiteCopyPages,
  countWords,
  diffScanFindings,
  discoverSitePages,
  formatAgentReport,
  formatGithubReport,
  formatGitlabReport,
  formatJunitReport,
  htmlToCopyInput,
  isReportFormat,
  scoreSiteCopy,
} from '@slop-detect/core';
import { buildSarifReport } from './detector.js';

const SKIP_DIRS = new Set(['node_modules', '.git']);
const HTML_CAP = 40;

export function listHtmlFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (current: string) => {
    for (const name of readdirSync(current)) {
      if (SKIP_DIRS.has(name)) continue;
      const path = join(current, name);
      const info = statSync(path);
      if (info.isDirectory()) walk(path);
      else if (/\.html?$/i.test(name)) out.push(path);
    }
  };
  walk(dir);
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

export function readCopyDir(dir: string) {
  const files = listHtmlFiles(dir);
  const truncated = files.length > HTML_CAP;
  const chosen = files.slice(0, HTML_CAP);
  const pages = chosen.map((path) =>
    htmlToCopyInput(readFileSync(path, 'utf8'), relative(dir, path))
  );
  const report = scoreSiteCopy(pages);
  return {
    ...report,
    files: chosen.map((path) => relative(dir, path)),
    truncated,
    rendered: false as const,
  };
}

export function formatScanDocument(result: any, format: string): string {
  if (!isReportFormat(format)) {
    throw new Error(
      `Unknown --format ${format}. Options: agent, github, sarif, junit, gitlab, json.`
    );
  }
  if (format === 'json') return JSON.stringify(result, null, 2);
  if (format === 'sarif')
    return JSON.stringify(buildSarifReport(Array.isArray(result) ? result : [result]), null, 2);
  if (format === 'agent') return formatAgentReport(result);
  if (format === 'github') return formatGithubReport(result);
  if (format === 'junit') return formatJunitReport(result);
  return formatGitlabReport(result);
}

export function readJsonFile(path: string): any {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export async function siteCopyReport(url: string, max: number) {
  const { plan, pages } = await collectSiteCopyPages(url, fetch, { max, delayMs: 200 });
  if (pages.length === 0) {
    return {
      ok: false as const,
      message: 'Scan could not run. This is not a Clean score. No HTML pages were fetched.',
    };
  }
  return { ok: true as const, report: { ...scoreSiteCopy(pages), sample: plan } };
}

export async function discoverRenderedSite(url: string, max: number): Promise<string[]> {
  const plan = await discoverSitePages(url, fetch, { max, timeoutMs: 8000 });
  return plan.urls;
}

export function siteSummaryDocument(results: any[]) {
  return buildRenderedSiteReport(results);
}

export function writeAeoFixes(dir: string, opts: { origin?: string; siteName?: string }) {
  const files = buildAeoFixFiles(opts);
  mkdirSync(dir, { recursive: true });
  for (const [name, contents] of Object.entries(files)) {
    writeFileSync(join(dir, name), contents);
  }
  return Object.keys(files).sort();
}

export function avoidListWithinCap(result: any): { text: string; words: number } {
  const text = buildAvoidList(result);
  return { text, words: countWords(text) };
}

export function diffSavedScans(before: any, after: any) {
  return diffScanFindings(before, after);
}

export function pathExists(path: string): boolean {
  return existsSync(path);
}
