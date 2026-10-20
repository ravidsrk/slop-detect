// Shared scan-result assembly — pattern rows + error surfacing (DM-1).
// Pure: no browser, no fetch. Both runners call this after page.evaluate.

import { PATTERNS } from './patterns.js';

export interface PatternSignal {
  triggered?: boolean;
  error?: string;
  [key: string]: unknown;
}

export type FindingStatus = 'fail' | 'review' | 'unknown' | 'pass';

export interface AssembledPatternResults {
  patterns: Array<{
    id: string;
    label: string;
    short: string;
    category: string;
    weight: number;
    status: FindingStatus;
    ruleStatus?: string;
    evidenceGrade?: string;
    era?: string;
    modelFamilies?: string[];
    lastValidatedIn?: string;
    likelihoodRatio?: number | null;
    fpRate?: number | null;
    fpRatePre2022?: number | null;
    triggered: boolean;
    evidence: PatternSignal;
  }>;
  patternsErrored: number;
}

/** Build per-pattern rows from page-eval signals and count extractor failures. */
export function assemblePatternResults(
  signals: Record<string, PatternSignal> = {}
): AssembledPatternResults {
  let patternsErrored = 0;
  const patterns = PATTERNS.map((p: any) => {
    const sig = signals[p.id] || { triggered: false };
    if (sig.error) patternsErrored++;
    const triggered = !!sig.triggered;
    const isReviewRule =
      p.weight === 0 ||
      p.status === 'review' ||
      p.status === 'experimental' ||
      p.status === 'retired';
    const status: FindingStatus = sig.error
      ? 'unknown'
      : triggered
        ? isReviewRule
          ? 'review'
          : 'fail'
        : 'pass';
    return {
      id: p.id,
      label: p.label,
      short: p.short,
      category: p.category,
      weight: p.weight,
      status,
      ruleStatus: p.status || 'active',
      evidenceGrade: p.evidenceGrade ?? null,
      era: p.era ?? null,
      modelFamilies: p.modelFamilies ?? [],
      lastValidatedIn: p.lastValidatedIn ?? null,
      likelihoodRatio: p.likelihoodRatio ?? null,
      fpRate: p.fpRate ?? null,
      fpRatePre2022: p.fpRatePre2022 ?? null,
      triggered,
      evidence: sig,
    };
  });
  return { patterns, patternsErrored };
}
