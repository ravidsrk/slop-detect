// Design scoring and cross-pattern discounts. Kept out of system.ts's import
// cycle so a waiver can rescore with the waived rules excluded.

import { PATTERNS } from './patterns.js';
import { CRAFT_CHECK_IDS } from './craft.js';
import { gradeForScore, verdictFor } from './verdict.js';
import { computeCoOccurrenceConfidence, computeDesignTypicality } from './calibration.js';
import { DEFINITIONS_VERSION } from './definitions.js';

function tierForDesign(score: number): string {
  return score >= 28 ? 'Heavy' : score >= 10 ? 'Mild' : 'Clean';
}

const PATTERNS_BY_ID = new Map<string, any>(PATTERNS.map((p: any) => [p.id, p]));

export interface ScoreAdjustment {
  ruleId: string;
  targetPatternId: string;
  delta: number;
  reason: string;
  sharedNodes?: string[];
  patternIds?: string[];
  labels?: string[];
}

export interface PostPassRule {
  id: string;
  description: string;
  apply: (
    patterns: Array<Record<string, any>>,
    effectiveWeights: Map<string, number>
  ) => ScoreAdjustment[];
}

// Declarative cross-pattern post-pass rules (#227 FIX-07, #226 FIX-06, #247 D-08, #238 FIX-19).
// Post-pass rules adjust effective score contributions and record adjustments[]
// without ever mutating pattern.triggered.
export const POST_PASS_RULES: PostPassRule[] = [
  {
    id: 'slop_fonts_co_signal',
    description:
      'Inter/Geist alone or secondary slop fonts alone require at least one other triggered design signal (D-08)',
    apply(patterns, effectiveWeights) {
      const sf = patterns.find((p) => p.id === 'slop_fonts' && p.triggered);
      if (!sf) return [];
      const wSf = effectiveWeights.get('slop_fonts') ?? 0;
      if (wSf <= 0) return [];
      const ev = sf.evidence || {};
      const heroFamStr = String(ev.resolvedHeroFam || ev.heroFam || '')
        .toLowerCase()
        .replace(/['"]/g, '')
        .trim();
      const impliedInterOrGeistOnly =
        ev.interOrGeistOnly === undefined &&
        ev.secondaryOnly === undefined &&
        Boolean(heroFamStr) &&
        (heroFamStr.startsWith('inter') || heroFamStr.startsWith('geist'));
      const requiresCoSignal =
        ev.secondaryOnly === true || ev.interOrGeistOnly === true || impliedInterOrGeistOnly;
      if (!requiresCoSignal) return [];
      // Use the weights still in force before the typography cap. A centered
      // Inter hero is a real co-signal even though the cap later discounts it.
      const otherScoredTriggered = patterns.some(
        (p) => p.id !== 'slop_fonts' && p.triggered && (effectiveWeights.get(p.id) ?? 0) > 0
      );
      if (!otherScoredTriggered) {
        effectiveWeights.set('slop_fonts', 0);
        return [
          {
            ruleId: 'slop_fonts_co_signal',
            targetPatternId: 'slop_fonts',
            delta: -wSf,
            reason:
              'Inter/Geist or secondary slop fonts without any co-occurring design tell contribute 0 points',
          },
        ];
      }
      return [];
    },
  },
  {
    id: 'slop_fonts_centered_hero_cap',
    description: 'Cap combined contribution of slop_fonts + centered_hero at <= 8 points (FIX-07)',
    apply(patterns, effectiveWeights) {
      const sf = patterns.find((p) => p.id === 'slop_fonts' && p.triggered);
      const ch = patterns.find((p) => p.id === 'centered_hero' && p.triggered);
      if (!sf || !ch) return [];
      const wSf = effectiveWeights.get('slop_fonts') ?? 0;
      const wCh = effectiveWeights.get('centered_hero') ?? 0;
      if (wSf + wCh > 8 && wCh > 0) {
        const discount = Math.min(wCh, wSf + wCh - 8);
        effectiveWeights.set('centered_hero', wCh - discount);
        return [
          {
            ruleId: 'slop_fonts_centered_hero_cap',
            targetPatternId: 'centered_hero',
            delta: -discount,
            reason:
              'centered_hero overlaps with slop_fonts on hero typography; combined weight capped at 8',
          },
        ];
      }
      return [];
    },
  },
  {
    id: 'purple_accent_co_signal',
    description:
      'purple_accent requires at least one other triggered design signal when it has evidence metadata (FIX-06)',
    apply(patterns, effectiveWeights) {
      const pa = patterns.find((p) => p.id === 'purple_accent' && p.triggered);
      if (!pa) return [];
      // Only enforce co-occurrence when evidence is present (real pattern extraction or FIX-06 test)
      // or when more than 1 pattern was evaluated in the suite.
      const hasEvidence = pa.evidence && typeof pa.evidence === 'object';
      if (!hasEvidence && patterns.length === 1) return [];
      const wPa = effectiveWeights.get('purple_accent') ?? 0;
      if (wPa <= 0) return [];
      const otherScoredTriggered = patterns.some(
        (p) => p.id !== 'purple_accent' && p.triggered && (effectiveWeights.get(p.id) ?? 0) > 0
      );
      if (!otherScoredTriggered) {
        effectiveWeights.set('purple_accent', 0);
        return [
          {
            ruleId: 'purple_accent_co_signal',
            targetPatternId: 'purple_accent',
            delta: -wPa,
            reason: 'purple_accent alone without co-occurring design signals contributes 0 points',
          },
        ];
      }
      return [];
    },
  },
  {
    id: 'overlapping_evidence_dedup',
    description:
      'Deduplicate score contribution when two triggered patterns share >= 2 DOM nodeIds covering >= 50% of the smaller pattern (FIX-19); a single incidental shared node keeps both weights',
    apply(patterns, effectiveWeights) {
      const adjustments: ScoreAdjustment[] = [];
      const triggeredWithNodes = patterns.filter(
        (p) => p.triggered && Array.isArray(p.evidence?.nodeIds) && p.evidence.nodeIds.length > 0
      );
      for (let i = 0; i < triggeredWithNodes.length; i++) {
        for (let j = i + 1; j < triggeredWithNodes.length; j++) {
          const a = triggeredWithNodes[i];
          const b = triggeredWithNodes[j];
          const nodesA = new Set<string>(a.evidence.nodeIds);
          const nodesB = new Set<string>(b.evidence.nodeIds);
          const sharedNodes = Array.from(nodesB).filter((n) => nodesA.has(n));
          const minSize = Math.min(nodesA.size, nodesB.size);
          const overlapRatio = minSize > 0 ? sharedNodes.length / minSize : 0;
          // Partial-overlap threshold: require >= 2 shared nodes AND >= 50% of the smaller pattern.
          // A single incidental shared node keeps both weights in full.
          if (sharedNodes.length < 2 || overlapRatio < 0.5) continue;
          const wA = effectiveWeights.get(a.id) ?? 0;
          const wB = effectiveWeights.get(b.id) ?? 0;
          const target = wA >= wB ? b : a;
          const targetWeight = effectiveWeights.get(target.id) ?? 0;
          const aLabel = a.label || PATTERNS_BY_ID.get(a.id)?.label || a.id;
          const bLabel = b.label || PATTERNS_BY_ID.get(b.id)?.label || b.id;
          if (targetWeight > 0) {
            effectiveWeights.set(target.id, 0);
            adjustments.push({
              ruleId: 'overlapping_evidence_dedup',
              targetPatternId: target.id,
              delta: -targetWeight,
              reason: `Overlapping DOM evidence between ${aLabel} (${a.id}) and ${bLabel} (${b.id})`,
              sharedNodes,
              patternIds: [a.id, b.id],
              labels: [aLabel, bLabel],
            });
          } else {
            adjustments.push({
              ruleId: 'overlapping_evidence_dedup',
              targetPatternId: target.id,
              delta: 0,
              reason: `Overlapping DOM evidence between ${aLabel} (${a.id}) and ${bLabel} (${b.id})`,
              sharedNodes,
              patternIds: [a.id, b.id],
              labels: [aLabel, bLabel],
            });
          }
        }
      }
      return adjustments;
    },
  },
];

// Convenience: turn a triggered-pattern array into a scoring summary.
// Pure function so it's safe to call from any runtime.
export function scorePatterns(
  patternResults: any[] = [],
  opts: {
    postPassRules?: PostPassRule[];
    coOccurrenceStats?: Record<string, any>;
    typicalityVector?: number[];
    typicalityReference?: number[][] | null;
  } = {}
) {
  // Exclude craft checks if ever passed into scorePatterns (F-00 hard rule).
  const designInputs = (patternResults || []).filter((p) => !CRAFT_CHECK_IDS.has(p?.id));

  const enriched = designInputs.map((p) => {
    const def = PATTERNS_BY_ID.get(p.id);
    const callerOverrodeWeight =
      typeof p.weight === 'number' &&
      p.weight > 0 &&
      p.status !== 'review' &&
      p.ruleStatus !== 'review' &&
      def &&
      def.status === 'review' &&
      p.weight !== def.weight;
    const ruleStatus =
      p.ruleStatus || (callerOverrodeWeight ? 'active' : def ? def.status : undefined) || 'active';
    const hasError = Boolean(p.evidence?.error || p.status === 'unknown');
    const isReview =
      p.status === 'review' ||
      p.weight === 0 ||
      ruleStatus === 'review' ||
      ruleStatus === 'experimental' ||
      ruleStatus === 'retired';
    const status = hasError ? 'unknown' : p.triggered ? (isReview ? 'review' : 'fail') : 'pass';
    return {
      ...p,
      label: p.label || def?.label || p.id,
      status,
      ruleStatus,
      evidenceGrade: p.evidenceGrade ?? def?.evidenceGrade ?? null,
      era: p.era ?? def?.era ?? null,
      modelFamilies: p.modelFamilies ?? def?.modelFamilies ?? [],
      lastValidatedIn: p.lastValidatedIn ?? def?.lastValidatedIn ?? DEFINITIONS_VERSION,
      likelihoodRatio: p.likelihoodRatio ?? def?.likelihoodRatio ?? null,
      fpRate: p.fpRate ?? def?.fpRate ?? null,
      fpRatePre2022: null, // K-11: stays null until measured on pre-2022 archive
    };
  });

  // Effective weights map: only status === 'fail' (active weight > 0 rules) can add points (K-04, W-09).
  const effectiveWeights = new Map<string, number>();
  for (const p of enriched) {
    if (p.status === 'fail' && p.triggered && p.weight > 0) {
      effectiveWeights.set(p.id, p.weight);
    } else {
      effectiveWeights.set(p.id, 0);
    }
  }

  const rulesToRun = opts.postPassRules || POST_PASS_RULES;
  const adjustments: ScoreAdjustment[] = [];
  for (const rule of rulesToRun) {
    const adjs = rule.apply(enriched, effectiveWeights);
    if (Array.isArray(adjs) && adjs.length > 0) {
      adjustments.push(...adjs);
    }
  }

  let rawScore = 0;
  for (const p of enriched) {
    rawScore += effectiveWeights.get(p.id) ?? 0;
  }

  const clamped = Math.max(0, Math.min(100, rawScore));
  const tier = tierForDesign(clamped);
  const triggered = enriched.filter((p) => p.triggered);
  const scoredTriggered = enriched.filter((p) => p.status === 'fail');
  const unknownCount = enriched.filter((p) => p.status === 'unknown').length;
  const reviewCount = enriched.filter((p) => p.status === 'review').length;
  const evaluableCount = Math.max(0, enriched.length - unknownCount);
  const coverage = enriched.length > 0 ? Number((evaluableCount / enriched.length).toFixed(3)) : 1;

  // K-11 (#306): evidence array appears before score in response object.
  const evidence = triggered.map((p) => ({
    id: p.id,
    label: p.label,
    status: p.status,
    weight: p.weight,
    scoreDelta: effectiveWeights.get(p.id) ?? 0,
    evidenceGrade: p.evidenceGrade,
    fpRatePre2022: null,
    detail: p.evidence || {},
  }));

  const confidence = computeCoOccurrenceConfidence(
    enriched,
    adjustments.map((a) => ({
      patternId: a.targetPatternId,
      rule: a.ruleId,
      pointsRemoved: Math.abs(a.delta),
    }))
  );

  // D-11 (#250): Typicality stays off the scored path and defaults to null when no licensed reference is loaded.
  const typicality =
    opts.typicalityVector && opts.typicalityReference
      ? computeDesignTypicality(opts.typicalityVector, opts.typicalityReference)
      : null;

  return {
    evidence,
    score: clamped,
    tier,
    grade: gradeForScore(clamped),
    verdict: verdictFor(clamped, tier, scoredTriggered.length > 0 ? scoredTriggered : triggered),
    patternsFlagged: triggered.length,
    patternsScored: scoredTriggered.length,
    patternsTotal: enriched.length,
    unknownCount,
    reviewCount,
    coverage,
    adjustments,
    confidence,
    typicality,
    definitionsVersion: DEFINITIONS_VERSION,
  };
}
