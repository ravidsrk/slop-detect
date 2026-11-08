// Configuration, assertion matrix, --only/--skip filters, and inline DOM waivers (#207).
//
// Models Lighthouse CI's assertion grammar (`off` | `warn` | `error` | `[level, { maxScore, minScore, reason }]`
// + `assertMatrix` URL routing), axe-core's `runOnly` (`--only` / `--skip` by ID or axis tag),
// and Impeccable-style inline `data-slop-ignore="<id>: <reason>"` waivers.

import { scorePatterns } from './design-score.js';
import { verdictFor } from './verdict.js';

export type AssertionLevel = 'off' | 'warn' | 'error';

export interface AssertionOptions {
  maxScore?: number;
  minScore?: number;
  reason?: string;
}

export type RawAssertionSpec = AssertionLevel | [AssertionLevel, AssertionOptions?];

export interface NormalizedAssertion {
  level: AssertionLevel;
  maxScore?: number;
  minScore?: number;
  reason: string;
}

export interface SlopRcMatrixEntry {
  matching: string;
  preset?: string;
  assertions?: Record<string, RawAssertionSpec>;
  waivers?: Record<string, string | { reason?: string }>;
}

export interface SlopRcConfig {
  preset?: string;
  assertions?: Record<string, RawAssertionSpec>;
  waivers?: Record<string, string | { reason?: string }>;
  assertMatrix?: SlopRcMatrixEntry[];
}

export interface InlineWaiver {
  id: string;
  reason: string;
  source: 'inline';
  selector?: string;
}

export function normalizeAssertionSpec(
  spec: RawAssertionSpec | undefined
): NormalizedAssertion | null {
  if (!spec) return null;
  if (typeof spec === 'string') {
    if (spec !== 'off' && spec !== 'warn' && spec !== 'error') {
      throw new Error(`Invalid assertion level: ${spec}`);
    }
    return { level: spec, reason: '' };
  }
  if (Array.isArray(spec) && spec.length >= 1) {
    const [level, opts] = spec;
    if (level !== 'off' && level !== 'warn' && level !== 'error') {
      throw new Error(`Invalid assertion level: ${String(level)}`);
    }
    return {
      level,
      maxScore: typeof opts?.maxScore === 'number' ? opts.maxScore : undefined,
      minScore: typeof opts?.minScore === 'number' ? opts.minScore : undefined,
      reason: typeof opts?.reason === 'string' ? opts.reason : '',
    };
  }
  throw new Error(`Invalid assertion specification: ${JSON.stringify(spec)}`);
}

export function parseSlopRc(
  raw: string | Record<string, any> | null | undefined
): SlopRcConfig | null {
  if (!raw) return null;
  const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error('.sloprc.json must be a JSON object');
  }
  // Validate top-level assertions
  if (obj.assertions && typeof obj.assertions === 'object') {
    for (const [, spec] of Object.entries(obj.assertions)) {
      normalizeAssertionSpec(spec as RawAssertionSpec);
    }
  }
  if (Array.isArray(obj.assertMatrix)) {
    for (const entry of obj.assertMatrix) {
      if (!entry || typeof entry.matching !== 'string') {
        throw new Error(
          'Each assertMatrix entry in .sloprc.json requires a string "matching" pattern'
        );
      }
      if (entry.assertions && typeof entry.assertions === 'object') {
        for (const [, spec] of Object.entries(entry.assertions)) {
          normalizeAssertionSpec(spec as RawAssertionSpec);
        }
      }
    }
  }
  return obj as SlopRcConfig;
}

function matchesUrlPattern(url: string, pattern: string): boolean {
  if (!pattern) return false;
  try {
    const re = new RegExp(pattern);
    if (re.test(url)) return true;
  } catch {
    // Fallback to glob-style matching
  }
  const globRe = new RegExp(
    '^' +
      pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.') +
      '$'
  );
  return globRe.test(url);
}

export function resolveSlopConfigForUrl(
  config: SlopRcConfig | null | undefined,
  url: string
): {
  preset?: string;
  assertions: Record<string, NormalizedAssertion>;
  waivers: Record<string, string>;
} {
  const assertions: Record<string, NormalizedAssertion> = {};
  const waivers: Record<string, string> = {};
  let preset = config?.preset;

  const applyLayer = (
    layerAssertions?: Record<string, RawAssertionSpec>,
    layerWaivers?: Record<string, string | { reason?: string }>
  ) => {
    if (layerAssertions && typeof layerAssertions === 'object') {
      for (const [k, rawSpec] of Object.entries(layerAssertions)) {
        const norm = normalizeAssertionSpec(rawSpec);
        if (norm) {
          assertions[k] = norm;
          if (norm.level === 'off') {
            waivers[k] = norm.reason || 'disabled via .sloprc.json assertions';
          }
        }
      }
    }
    if (layerWaivers && typeof layerWaivers === 'object') {
      for (const [k, rawReason] of Object.entries(layerWaivers)) {
        const reason =
          typeof rawReason === 'string'
            ? rawReason
            : typeof rawReason?.reason === 'string'
              ? rawReason.reason
              : 'waived via .sloprc.json';
        waivers[k] = reason;
      }
    }
  };

  if (config) {
    applyLayer(config.assertions, config.waivers);
    if (Array.isArray(config.assertMatrix)) {
      for (const entry of config.assertMatrix) {
        if (matchesUrlPattern(url || '', entry.matching)) {
          if (entry.preset) preset = entry.preset;
          applyLayer(entry.assertions, entry.waivers);
        }
      }
    }
  }

  return { preset, assertions, waivers };
}

export function parseOnlySkipList(raw: string | string[] | null | undefined): string[] {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : String(raw).split(',');
  return arr.map((s) => String(s).trim()).filter(Boolean);
}

const AXIS_TAGS = new Set(['design', 'copy', 'aeo', 'craft', 'system', 'provenance']);

export function shouldRunPatternOrAxis(
  id: string,
  axis: string,
  opts: { only?: string | string[] | null; skip?: string | string[] | null } = {}
): boolean {
  const onlyList = parseOnlySkipList(opts.only);
  const skipList = parseOnlySkipList(opts.skip);

  if (skipList.includes(id) || skipList.includes(axis)) {
    return false;
  }
  if (onlyList.length > 0) {
    const hasAxisFilter = onlyList.some((x) => AXIS_TAGS.has(x));
    const hasIdFilter = onlyList.some((x) => !AXIS_TAGS.has(x));
    if (hasAxisFilter && !onlyList.includes(axis) && !onlyList.includes(id)) {
      return false;
    }
    if (hasIdFilter && !onlyList.includes(id) && !onlyList.includes(axis)) {
      return false;
    }
  }
  return true;
}

// Page-side inline waiver extractor (serialized into buildPageScript).
export function extractInlineWaivers(): InlineWaiver[] {
  const out: InlineWaiver[] = [];
  const seen = new Set<string>();
  const add = (id: string, reason: string, selector?: string) => {
    const cleanId = String(id || '').trim();
    if (!cleanId) return;
    const key = `${cleanId}::${reason || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      id: cleanId,
      reason: String(reason || '').trim() || 'inline data-slop-ignore waiver',
      source: 'inline',
      ...(selector ? { selector } : {}),
    });
  };

  if (typeof document === 'undefined' || !document.querySelectorAll) return out;

  for (const el of Array.from(document.querySelectorAll('[data-slop-ignore]'))) {
    const rawAttr = el.getAttribute('data-slop-ignore') || '';
    const explicitReason = el.getAttribute('data-slop-reason') || '';
    const tag = el.tagName ? el.tagName.toLowerCase() : 'div';
    const sel = el.id ? `${tag}#${el.id}` : tag;
    for (const chunk of rawAttr.split(',')) {
      const trimmed = chunk.trim();
      if (!trimmed) continue;
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx !== -1) {
        const id = trimmed.slice(0, colonIdx).trim();
        const reason = trimmed.slice(colonIdx + 1).trim() || explicitReason;
        add(id, reason, sel);
      } else {
        add(trimmed, explicitReason, sel);
      }
    }
  }

  // Also scan HTML comments for <!-- slop-ignore <id>: <reason> --> or <!-- slop-detect-ignore <id>: <reason> -->
  try {
    const walker = document.createTreeWalker(document, 128 /* NodeFilter.SHOW_COMMENT */);
    let node: any;
    while ((node = walker.nextNode())) {
      const text = String(node.nodeValue || '').trim();
      const m = text.match(
        /^slop(?:-detect)?-(?:ignore|disable)\s+([a-z0-9_.,\s-]+?)(?::\s*(.+))?$/i
      );
      if (m) {
        const ids = m[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const reason = (m[2] || '').trim() || 'inline comment waiver';
        for (const id of ids) add(id, reason);
      }
    }
  } catch {
    // ignore comment walker errors in synthetic DOMs
  }

  return out;
}

export function applyConfigAndInlineWaivers(
  result: any,
  opts: {
    config?: SlopRcConfig | null;
    inlineWaivers?: InlineWaiver[] | null;
    noInlineIgnores?: boolean;
    only?: string | string[] | null;
    skip?: string | string[] | null;
  } = {}
) {
  if (!result || typeof result !== 'object') return result;

  const rawScore = typeof result.rawScore === 'number' ? result.rawScore : result.score;
  const resolved = resolveSlopConfigForUrl(opts.config, result.finalUrl || result.url || '');
  const existingWaivers: Array<{ id: string; source: string; reason: string }> = Array.isArray(
    result.waivedPatterns
  )
    ? [...result.waivedPatterns]
    : [];

  const waiverMap = new Map<
    string,
    { id: string; source: 'inline' | 'config' | 'design-md'; reason: string }
  >();
  for (const w of existingWaivers) {
    if (w && w.id) {
      waiverMap.set(w.id, {
        id: w.id,
        source: (w.source as any) || 'design-md',
        reason: w.reason || 'declared in DESIGN.md',
      });
    }
  }

  if (!opts.noInlineIgnores) {
    for (const [id, reason] of Object.entries(resolved.waivers)) {
      if (!waiverMap.has(id)) {
        waiverMap.set(id, { id, source: 'config', reason });
      }
    }
    if (Array.isArray(opts.inlineWaivers)) {
      for (const w of opts.inlineWaivers) {
        if (w && w.id && !waiverMap.has(w.id)) {
          waiverMap.set(w.id, {
            id: w.id,
            source: 'inline',
            reason: w.reason || 'inline data-slop-ignore waiver',
          });
        }
      }
    }
  }

  const onlyList = parseOnlySkipList(opts.only);
  const skipList = parseOnlySkipList(opts.skip);
  const hasFilters = onlyList.length > 0 || skipList.length > 0;
  const hasActiveWaivers = !opts.noInlineIgnores && waiverMap.size > 0;

  let patterns = Array.isArray(result.patterns) ? [...result.patterns] : [];
  if (hasFilters) {
    patterns = patterns.filter((p) => {
      const pAxis = p.category === 'provenance' ? 'provenance' : 'design';
      return shouldRunPatternOrAxis(p.id, pAxis, { only: onlyList, skip: skipList });
    });
  }

  const triggeredWaived: Array<{ id: string; source: string; reason: string }> = [];
  if (hasActiveWaivers) {
    patterns = patterns.map((p) => {
      const w = waiverMap.get(p.id);
      if (w && (p.triggered || p.waived)) {
        triggeredWaived.push(w);
        return {
          ...p,
          triggered: false,
          waived: true,
          waiverReason: w.reason,
          waiverSource: w.source,
        };
      }
      return p;
    });
  } else if (opts.noInlineIgnores) {
    // Restore any previously waived pattern that had rawTriggered or waived flag
    patterns = patterns.map((p) => {
      if (p.waived) {
        const copy = { ...p, triggered: true };
        delete copy.waived;
        delete copy.waiverReason;
        delete copy.waiverSource;
        return copy;
      }
      return p;
    });
  }

  // Recompute design score if waivers or filters modified the pattern list
  const rescored = scorePatterns(patterns);
  const nextResult: any = {
    ...result,
    rawScore,
    score: opts.noInlineIgnores ? rawScore : rescored.score,
    tier: rescored.tier,
    grade: rescored.grade,
    confidence: rescored.confidence,
    patternsFlagged: rescored.patternsFlagged,
    patternsTotal: rescored.patternsTotal,
    verdict: verdictFor(rescored.tier, rescored.patternsFlagged),
    patterns,
    waivedPatterns: opts.noInlineIgnores ? [] : triggeredWaived,
  };

  if (nextResult.axes?.design) {
    nextResult.axes = {
      ...nextResult.axes,
      design: {
        ...nextResult.axes.design,
        score: nextResult.score,
        tier: nextResult.tier,
        grade: nextResult.grade,
        patternsFlagged: nextResult.patternsFlagged,
        patternsTotal: nextResult.patternsTotal,
        patterns,
      },
    };
  }

  // Evaluate config assertions (levels warn / error, maxScore / minScore)
  const failures: Array<{ key: string; message: string }> = [];
  const warnings: Array<{ key: string; message: string }> = [];
  for (const [key, spec] of Object.entries(resolved.assertions)) {
    if (spec.level === 'off') continue;
    const bucket = spec.level === 'error' ? failures : warnings;

    if (key.startsWith('categories:')) {
      const cat = key.slice('categories:'.length);
      const axisScore =
        cat === 'design'
          ? nextResult.score
          : cat === 'copy'
            ? nextResult.axes?.copy?.score
            : cat === 'aeo'
              ? nextResult.aeo?.score
              : cat === 'system'
                ? nextResult.system?.score
                : cat === 'craft'
                  ? nextResult.craft?.score
                  : undefined;
      if (typeof axisScore === 'number') {
        if (typeof spec.maxScore === 'number' && axisScore > spec.maxScore) {
          bucket.push({
            key,
            message: `${key} score ${axisScore} exceeds maxScore ${spec.maxScore}`,
          });
        }
        if (typeof spec.minScore === 'number' && axisScore < spec.minScore) {
          bucket.push({
            key,
            message: `${key} score ${axisScore} is below minScore ${spec.minScore}`,
          });
        }
      }
      continue;
    }

    const pat = patterns.find((p) => p.id === key);
    if (pat && pat.triggered) {
      bucket.push({
        key,
        message: `Pattern "${key}" triggered (${spec.level})`,
      });
    }
  }

  if (Object.keys(resolved.assertions).length > 0) {
    nextResult.configAssertions = {
      passed: failures.length === 0,
      failures,
      warnings,
    };
  }

  return nextResult;
}
