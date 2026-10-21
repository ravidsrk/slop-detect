// Local scanning for agent loops (W-03). The hosted API rejects loopback, so
// `slop-detect-mcp --local` drives the Playwright runner in the slop-detect
// package and never calls slop-detect.com. Playwright stays an optional peer:
// the default server is still the HTTP client.

import {
  AEO_CHECKS,
  buildFixPrompt,
  COPY_PATTERNS,
  CRAFT_CHECKS,
  DEFINITIONS_VERSION,
  PATTERNS,
  PRESETS,
  runAeoChecks,
  stampScanResult,
  SYSTEM_CHECKS,
} from '@slop-detect/core';

const API_HOSTS = new Set(['slop-detect.com', 'www.slop-detect.com']);

export interface LocalScanOptions {
  axes?: string[];
  preset?: string;
  designMd?: string | boolean;
}

interface DesignMdLoad {
  text: string;
  from: string;
}

interface LocalCli {
  scanUrl: (url: string, opts?: Record<string, unknown>) => Promise<any>;
  loadDesignMd?: (source: string, pageUrl: string) => Promise<DesignMdLoad | null>;
}

let mode = false;
let override: LocalCli | null = null;
let loaderOverride: (() => Promise<LocalCli>) | null = null;

export function isLocalMode() {
  return mode;
}

export function setLocalMode(on: boolean) {
  mode = on;
}

export function resetLocalMode() {
  mode = false;
  override = null;
  loaderOverride = null;
}

export function useLocalCliForTests(cli: LocalCli) {
  mode = true;
  override = cli;
}

export function setCliLoaderForTests(loader: () => Promise<LocalCli>) {
  mode = true;
  loaderOverride = loader;
}

// `--local` or SLOP_DETECT_LOCAL=1. The hosted API stays the default.
export function localModeRequested(
  argv: string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env
) {
  if (argv.includes('--local')) return true;
  const flag = env.SLOP_DETECT_LOCAL;
  return flag === '1' || flag === 'true';
}

export function isLoopbackOrFile(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol === 'file:') return true;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
  if (host.endsWith('.localhost')) return true;
  return false;
}

export function isHostedApiUrl(raw: string) {
  try {
    const url = new URL(raw, 'https://slop-detect.com');
    return API_HOSTS.has(url.hostname.toLowerCase()) && url.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

export function localScannerMissingMessage(detail: string) {
  return (
    'Local scanning needs the optional slop-detect package (Playwright). ' +
    `Install it beside slop-detect-mcp, then start with --local. (${detail})`
  );
}

async function loadCli(): Promise<LocalCli> {
  if (override) return override;
  try {
    if (loaderOverride) return await loaderOverride();
    const spec = 'slop-detect';
    return await import(spec);
  } catch (err) {
    const detail = err && (err as Error).message ? (err as Error).message : String(err);
    if (detail.includes('optional slop-detect package'))
      throw err instanceof Error ? err : new Error(detail);
    throw new Error(localScannerMissingMessage(detail));
  }
}

function assertNotHostedApi(url: string) {
  if (isHostedApiUrl(url)) {
    throw new Error(`Local mode does not call ${url}`);
  }
}

// Block fetches of the hosted API. Page fetches, including a page that is
// itself served by slop-detect.com, stay allowed: those are the document,
// not POST /api/scan.
function guardedFetch(input: any, init?: any) {
  const href =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input && typeof input.url === 'string'
          ? input.url
          : String(input);
  assertNotHostedApi(href);
  return fetch(input, init);
}

function lifecycle(entry: any, extra: Record<string, unknown> = {}) {
  return {
    id: entry.id,
    label: entry.label,
    short: entry.short ?? null,
    category: entry.category || extra.category || null,
    weight: entry.weight,
    since: entry.since || extra.since || null,
    status: entry.status || 'active',
    evidenceGrade: entry.evidenceGrade ?? null,
    era: entry.era ?? null,
    modelFamilies: entry.modelFamilies ?? [],
    lastValidatedIn: entry.lastValidatedIn ?? null,
    likelihoodRatio: entry.likelihoodRatio ?? null,
    fpRate: entry.fpRate ?? null,
    fpRatePre2022: entry.fpRatePre2022 ?? null,
    ...extra,
  };
}

// Same catalogue shape as GET /api/patterns, read from the engine in-process.
export function localCatalogue() {
  const patterns = (PATTERNS as any[]).map((p) => lifecycle(p, { since: p.since || 'baseline' }));
  const copyPatterns = (COPY_PATTERNS as any[]).map((p) =>
    lifecycle(p, { category: p.category || 'copy', since: p.since || '2026.08' })
  );
  const aeoChecks = (AEO_CHECKS as any[]).map((c) =>
    lifecycle(c, {
      severity: c.severity || 'recommended',
      required: c.severity === 'required',
    })
  );
  const systemChecks = (SYSTEM_CHECKS as any[]).map((c) => lifecycle(c));
  const craftChecks = (CRAFT_CHECKS as any[]).map((c) => lifecycle(c));
  return {
    version: DEFINITIONS_VERSION,
    count: patterns.length,
    patterns,
    copyCount: copyPatterns.length,
    copyPatterns,
    aeoCount: aeoChecks.length,
    aeoChecks,
    systemCount: systemChecks.length,
    systemChecks,
    craftCount: craftChecks.length,
    craftChecks,
    presets: Object.keys(PRESETS),
    source: 'local-engine',
  };
}

export async function localScan(url: string, opts: LocalScanOptions = {}) {
  assertNotHostedApi(url);
  const cli = await loadCli();
  if (typeof cli.scanUrl !== 'function') {
    throw new Error(localScannerMissingMessage('slop-detect did not export scanUrl'));
  }
  const scanOpts: Record<string, unknown> = {};
  if (opts.axes) scanOpts.axes = opts.axes;
  if (opts.preset) scanOpts.preset = opts.preset;
  if (opts.designMd === true || (typeof opts.designMd === 'string' && opts.designMd !== '')) {
    if (typeof cli.loadDesignMd !== 'function') {
      throw new Error(localScannerMissingMessage('slop-detect did not export loadDesignMd'));
    }
    const source = opts.designMd === true ? 'auto' : opts.designMd;
    const loaded = await cli.loadDesignMd(source, url);
    if (loaded && loaded.text) scanOpts.designMd = loaded.text;
  }
  return stampScanResult(await cli.scanUrl(url, scanOpts));
}

export async function localAeo(url: string) {
  assertNotHostedApi(url);
  if (url.startsWith('file:')) {
    throw new Error(
      'check_aeo needs an http(s) URL. A file:// page has no crawler response to check.'
    );
  }
  return stampScanResult(await runAeoChecks(url, { fetchImpl: guardedFetch as typeof fetch }));
}

export async function localFixPrompt(url: string, opts: LocalScanOptions = {}) {
  const result = await localScan(url, opts);
  if (!result || result.blocked || result.error || typeof result.score !== 'number') {
    const reason = result && result.error ? result.error : 'The page produced no score.';
    throw new Error(`Scan could not run. This is not a Clean score. ${reason}`);
  }
  return buildFixPrompt(result);
}
