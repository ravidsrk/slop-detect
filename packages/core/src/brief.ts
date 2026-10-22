// Short avoid list and before/after diff (W-07). Additive to buildFixPrompt.
// The long remediation prompt stays the default. This text is at most 120 words.

export const AVOID_LIST_WORD_CAP = 120;

export function countWords(text: string): number {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function scanCouldNotScore(result: any): boolean {
  return !result || result.blocked || result.error || typeof result.score !== 'number';
}

export function triggeredPatterns(result: any): any[] {
  if (!result) return [];
  const design = Array.isArray(result.patterns) ? result.patterns : [];
  const copy =
    result.axes && result.axes.copy && Array.isArray(result.axes.copy.patterns)
      ? result.axes.copy.patterns
      : [];
  const seen = new Set<string>();
  const out: any[] = [];
  for (const pattern of [...design, ...copy]) {
    if (!pattern?.triggered || pattern.waived || !pattern.id || seen.has(pattern.id)) continue;
    seen.add(pattern.id);
    out.push(pattern);
  }
  return out;
}

export function firstSample(pattern: any): string {
  const evidence = pattern?.evidence || {};
  const candidates: unknown[] = [];
  if (Array.isArray(evidence.samples) && evidence.samples.length)
    candidates.push(evidence.samples[0]);
  if (typeof evidence.sample === 'string') candidates.push(evidence.sample);
  if (Array.isArray(evidence.matches) && evidence.matches.length) {
    const match = evidence.matches[0];
    candidates.push(typeof match === 'string' ? match : match?.text || match?.sample);
  }
  if (typeof evidence.text === 'string') candidates.push(evidence.text);
  if (typeof evidence.value === 'string') candidates.push(evidence.value);
  const raw =
    candidates.find((item) => String(item || '').trim()) ||
    pattern?.label ||
    pattern?.id ||
    'sample';
  return String(raw).replace(/\s+/g, ' ').trim();
}

function clip(text: string, max: number): string {
  const clean = text.replace(/"/g, "'");
  if (clean.length <= max) return clean;
  return clean.slice(0, max).trim();
}

export function buildAvoidList(result: any): string {
  if (scanCouldNotScore(result)) {
    return 'Scan could not run. This is not a Clean score.';
  }
  const patterns = triggeredPatterns(result);
  const intro = `Avoid list for ${result.url || 'this page'} (${result.score}/100 ${result.tier || 'unknown'}).`;
  if (patterns.length === 0) {
    return `${intro}\nNo triggered patterns.\nRe-scan after the edit.`;
  }
  const samples = patterns.map((pattern) => ({
    id: String(pattern.id),
    sample: clip(firstSample(pattern), 40),
  }));
  const render = (style: 'full' | 'short' | 'id', withFrame: boolean) => {
    const lines = samples.map((row) => {
      if (style === 'id') return row.id;
      if (style === 'short') return `${row.id}: ${row.sample}`;
      return `Do not use ${row.id} ("${row.sample}").`;
    });
    if (!withFrame) return lines.join('\n');
    return [intro, ...lines, 'Re-scan after the edit.'].join('\n');
  };
  for (const style of ['full', 'short', 'id'] as const) {
    const framed = render(style, true);
    if (countWords(framed) <= AVOID_LIST_WORD_CAP) return framed;
    const bare = render(style, false);
    if (countWords(bare) <= AVOID_LIST_WORD_CAP) return bare;
  }
  return samples.map((row) => row.id).join('\n');
}

function matchedKitIds(result: any): string[] {
  const kits = Array.isArray(result?.kitMatches) ? result.kitMatches : [];
  return kits.filter((kit: any) => kit && kit.matched && kit.id).map((kit: any) => String(kit.id));
}

export function diffScanFindings(
  before: any,
  after: any
): {
  removed: string[];
  added: string[];
  kitsAdded: string[];
  kitsRemoved: string[];
  text: string;
} {
  const beforeIds = triggeredPatterns(before).map((pattern) => String(pattern.id));
  const afterIds = triggeredPatterns(after).map((pattern) => String(pattern.id));
  const beforeSet = new Set(beforeIds);
  const afterSet = new Set(afterIds);
  const removed = beforeIds.filter((id) => !afterSet.has(id));
  const added = afterIds.filter((id) => !beforeSet.has(id));
  const beforeKits = new Set(matchedKitIds(before));
  const afterKits = matchedKitIds(after);
  const kitsRemoved = [...beforeKits].filter((id) => !afterKits.includes(id));
  const kitsAdded = afterKits.filter((id) => !beforeKits.has(id));
  let text = [
    `Removed: ${removed.length ? removed.join(', ') : 'none'}.`,
    `Added: ${added.length ? added.join(', ') : 'none'}.`,
    `Kits now matched: ${kitsAdded.length ? kitsAdded.join(', ') : 'none'}.`,
    `Kits no longer matched: ${kitsRemoved.length ? kitsRemoved.join(', ') : 'none'}.`,
  ].join(' ');
  if (countWords(text) > AVOID_LIST_WORD_CAP) {
    text = `Removed ${removed.length}. Added ${added.length}. Kits added ${kitsAdded.length}. Kits removed ${kitsRemoved.length}.`;
  }
  return { removed, added, kitsAdded, kitsRemoved, text };
}

function axisScore(result: any, axis: string): number | null {
  if (axis === 'design') return typeof result?.score === 'number' ? result.score : null;
  const value = result?.axes?.[axis]?.score;
  return typeof value === 'number' ? value : null;
}

// Refuse a comparison when the definitions versions differ. A mismatch is an
// error, not a score delta. Environment differences are reported and do not
// erase the numeric delta.
export function compareScans(
  baseline: any,
  current: any,
  opts: { maxDelta?: number } = {}
): {
  comparable: boolean;
  error: string | null;
  delta: number | null;
  copyDelta: number | null;
  patternsAdded: string[];
  patternsResolved: string[];
  regression: boolean;
  environmentDiff: boolean;
  text: string;
} {
  const left = baseline?.definitionsVersion;
  const right = current?.definitionsVersion;
  const empty = {
    patternsAdded: [] as string[],
    patternsResolved: [] as string[],
    regression: false,
    environmentDiff: false,
    copyDelta: null as number | null,
  };
  if (!left || !right || left !== right) {
    return {
      ...empty,
      comparable: false,
      error:
        'definitionsVersion mismatch. Re-score the baseline before comparing. This is not a score delta.',
      delta: null,
      text: 'definitionsVersion mismatch. Re-score the baseline before comparing. This is not a score delta.',
    };
  }
  if (scanCouldNotScore(baseline) || scanCouldNotScore(current)) {
    return {
      ...empty,
      comparable: false,
      error: 'Scan could not run. This is not a Clean score.',
      delta: null,
      text: 'Scan could not run. This is not a Clean score.',
    };
  }
  const beforeIds = triggeredPatterns(baseline).map((pattern) => String(pattern.id));
  const afterIds = triggeredPatterns(current).map((pattern) => String(pattern.id));
  const beforeSet = new Set(beforeIds);
  const afterSet = new Set(afterIds);
  const patternsResolved = beforeIds.filter((id) => !afterSet.has(id));
  const patternsAdded = afterIds.filter((id) => !beforeSet.has(id));
  const delta = current.score - baseline.score;
  const beforeCopy = axisScore(baseline, 'copy');
  const afterCopy = axisScore(current, 'copy');
  const copyDelta = beforeCopy == null || afterCopy == null ? null : afterCopy - beforeCopy;
  const maxDelta = Number.isInteger(opts.maxDelta) ? (opts.maxDelta as number) : 0;
  const regression = delta > maxDelta || patternsAdded.length > 0;
  const environmentDiff =
    JSON.stringify(baseline.environment || null) !== JSON.stringify(current.environment || null);
  const parts = [
    `Score ${baseline.score} → ${current.score} (${delta >= 0 ? '+' : ''}${delta}).`,
    `Added: ${patternsAdded.length ? patternsAdded.join(', ') : 'none'}.`,
    `Resolved: ${patternsResolved.length ? patternsResolved.join(', ') : 'none'}.`,
  ];
  if (copyDelta != null) parts.push(`Copy ${copyDelta >= 0 ? '+' : ''}${copyDelta}.`);
  if (environmentDiff) parts.push('Environment differs.');
  return {
    comparable: true,
    error: null,
    delta,
    copyDelta,
    patternsAdded,
    patternsResolved,
    regression,
    environmentDiff,
    text: parts.join(' '),
  };
}

export function regressionAgainstBaseline(
  baseline: { score?: number; patterns?: string[]; definitionsVersion?: string } | null | undefined,
  current: any
): { establish: boolean; silent: boolean; worse: boolean; text: string } {
  if (scanCouldNotScore(current)) {
    return {
      establish: false,
      silent: false,
      worse: true,
      text: 'Scan could not run. This is not a Clean score.',
    };
  }
  if (
    baseline?.definitionsVersion &&
    current?.definitionsVersion &&
    baseline.definitionsVersion !== current.definitionsVersion
  ) {
    return {
      establish: true,
      silent: false,
      worse: false,
      text: `Definitions ${baseline.definitionsVersion} → ${current.definitionsVersion}. This is a rescore, not a regression.`,
    };
  }
  const patterns = triggeredPatterns(current).map((pattern) => String(pattern.id));
  if (!baseline || typeof baseline.score !== 'number') {
    return { establish: true, silent: true, worse: false, text: '' };
  }
  const before = new Set(baseline.patterns || []);
  const added = patterns.filter((id) => !before.has(id));
  const scoreUp = current.score > baseline.score;
  if (!scoreUp && added.length === 0) {
    return { establish: false, silent: true, worse: false, text: '' };
  }
  const parts: string[] = [];
  if (scoreUp) parts.push(`Score ${baseline.score} → ${current.score}.`);
  if (added.length) parts.push(`New patterns: ${added.join(', ')}.`);
  return { establish: false, silent: false, worse: true, text: parts.join(' ') };
}
