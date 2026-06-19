// Shared scan-result assembly — pattern rows + error surfacing (DM-1).
// Pure: no browser, no fetch. Both runners call this after page.evaluate.

import { PATTERNS } from './patterns.js';

export interface PatternSignal {
  triggered?: boolean;
  error?: string;
  [key: string]: unknown;
}

export interface AssembledPatternResults {
  patterns: Array<{
    id: string;
    label: string;
    short: string;
    category: string;
    weight: number;
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
  const patterns = PATTERNS.map((p) => {
    const sig = signals[p.id] || { triggered: false };
    if (sig.error) patternsErrored++;
    return {
      id: p.id,
      label: p.label,
      short: p.short,
      category: p.category,
      weight: p.weight,
      triggered: !!sig.triggered,
      evidence: sig,
    };
  });
  return { patterns, patternsErrored };
}
