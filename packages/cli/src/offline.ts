// Commands that finish without Playwright: static copy, avoid list, diff,
// reporters, and AEO starter files.

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
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

export function writeBaseline(path: string, result: any) {
  if (!result || result.blocked || result.error || typeof result.score !== 'number') {
    throw new Error('Scan could not run. This is not a Clean score.');
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`);
}

export function pathExists(path: string): boolean {
  return existsSync(path);
}

const MIME_BY_EXT: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

export function isLocalTarget(target: string): boolean {
  if (/^file:\/\//i.test(target)) {
    try {
      const p = fileURLToPath(target);
      return existsSync(p) && (statSync(p).isDirectory() || /\.html?$/i.test(p));
    } catch {
      return false;
    }
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(target)) return false;
  return existsSync(target) && (statSync(target).isDirectory() || /\.html?$/i.test(target));
}

export async function startStaticTargetServer(target: string): Promise<{
  url: string;
  urls: string[];
  close: () => Promise<void>;
}> {
  const fsTarget = /^file:\/\//i.test(target) ? fileURLToPath(target) : resolve(target);
  if (!existsSync(fsTarget)) {
    throw new Error(`Local target does not exist: ${target}`);
  }
  const info = statSync(fsTarget);
  const rootDir = info.isDirectory() ? fsTarget : dirname(fsTarget);
  const entryPath = info.isDirectory() ? '/' : '/' + relative(rootDir, fsTarget);

  const server = createServer((req, res) => {
    try {
      const u = new URL(req.url || '/', 'http://127.0.0.1');
      const decoded = decodeURIComponent(u.pathname);
      let candidate = resolve(rootDir, '.' + decoded);
      if (!candidate.startsWith(rootDir)) {
        res.writeHead(403, { 'content-type': 'text/plain' });
        res.end('Forbidden');
        return;
      }
      if (existsSync(candidate) && statSync(candidate).isDirectory()) {
        candidate = join(candidate, 'index.html');
      } else if (!existsSync(candidate) && existsSync(candidate + '.html')) {
        candidate = candidate + '.html';
      }
      if (!existsSync(candidate) || !statSync(candidate).isFile()) {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('Not found');
        return;
      }
      const ext = extname(candidate).toLowerCase();
      const ct = MIME_BY_EXT[ext] || 'application/octet-stream';
      const body = readFileSync(candidate);
      res.writeHead(200, { 'content-type': ct });
      res.end(body);
    } catch {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('Server error');
    }
  });

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', () => resolveListen());
  });
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;
  const htmlFiles = info.isDirectory() ? listHtmlFiles(rootDir) : [fsTarget];
  const urls = htmlFiles.map((f) => {
    const rel = relative(rootDir, f).replace(/\\/g, '/');
    return rel === 'index.html' ? `${baseUrl}/` : `${baseUrl}/${rel}`;
  });
  return {
    url: `${baseUrl}${entryPath}`,
    urls: urls.length > 0 ? urls : [`${baseUrl}${entryPath}`],
    close: () =>
      new Promise<void>((resolveClose) => {
        server.close(() => resolveClose());
      }),
  };
}
