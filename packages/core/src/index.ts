// @slop-detect/core — public entry point.
//
// This package is the pure, runtime-agnostic detection engine. It does NOT
// know how to fetch a page (no Playwright, no Puppeteer, no fetch). Callers
// (`slop-detect`, `slop-detect-web`, or your own integration) are
// responsible for opening the page in a browser, running the per-pattern
// `detect()` callback inside that page's context, then assembling a result.
//
// See packages/cli/src/detector.ts and apps/web/functions/api/scan.ts
// for the two reference runners.

export { PATTERNS } from './patterns.js';
export {
  COPY_PATTERNS,
  CHATBOT_MARKUP_REGISTRY,
  AI_REFERRAL_SOURCES,
  BUZZWORDS_BY_ERA,
  detectEnglishProse,
  computeFightinWordsLogOdds,
  computeVocabularyDrift,
  evaluateWatchListCandidate,
} from './copyPatterns.js';
export {
  extractTextContext,
  CONFUSABLE_MAP,
  buildNormalizedTextView,
  extractOriginalSpan,
} from './text.js';
export {
  createColorHelpers,
  parseColor,
  parseColorRaw,
  rgbToHsl,
  rgbToOklab,
  rgbToOklch,
  deltaEOklab,
  extractColorStrings,
  extractGradientStops,
  isPurple,
  isDark,
  isMidGrey,
  isNeutral,
  relativeLuminance,
  contrastRatio,
  apcaContrast,
  channelSpread,
} from './color.js';
export { createVisibilityHelpers } from './visibility.js';
export {
  isSlopFont,
  isPrimarySlopFont,
  isSecondarySlopFont,
  isAccentSerif,
  resolveRenderedFont,
  SLOP_FONT_PREFIXES,
  PRIMARY_SLOP_FONT_PREFIXES,
  SECONDARY_SLOP_FONT_PREFIXES,
  ACCENT_SERIF_PREFIXES,
} from './fonts.js';
export {
  CRAFT_CHECKS,
  CRAFT_CHECK_IDS,
  scoreCraft,
  evaluateMobileReflow,
  evaluateFocusIndicators,
  evaluateDeadCtas,
  evaluateFormFailureFeedback,
  formatAxeReport,
} from './craft.js';
export {
  splitByDomain,
  assertNotHeldOut,
  computeLikelihoodRatio,
  clopperPearson95,
  computeHumanOrderStatisticThreshold,
  clipLogLR,
  canPromoteRule,
  computeCoOccurrenceConfidence,
  extractMadeWith,
  DEFAULT_KITS,
  evaluateDefaultKits,
  HUMAN_TYPICALITY_REFERENCE,
  computeDesignTypicality,
} from './calibration.js';
export { FIXES, buildFixPrompt, formatEvidence } from './fixes.js';
export {
  gradeForScore,
  verdictFor,
  GRADE_BANDS,
  VERDICTS,
  gradeForScore as scoreToGrade,
  verdictFor as buildVerdict,
} from './verdict.js';
export { compileRule, compileRules, validateRule } from './rules.js';
export { PRESETS, applyPreset, isPreset } from './presets.js';
export {
  AI_BOTS,
  AI_BOT_REGISTRY,
  AEO_CHECKS,
  AEO_SCANNER_USER_AGENT,
  detectAIBot,
  aiBotsBlockedByRobots,
  parseRobotsTxt,
  evaluateRobotsTxt,
  parsePreviewDirectives,
  parseContentUsage,
  parseContentSignal,
  detectPromptInjection,
  toMarkdownUrl,
  runAeoChecks,
  runAeoChecks as scoreAeo,
  readCapped,
  MAX_HTML_BYTES,
} from './aeo.js';
export {
  parseDesignMd,
  parseDtcgTokens,
  extractFrontMatter,
  extractSystemContext,
  flattenDesignTokens,
  scoreSystemCompliance,
  scoreSystemCompliance as checkDesignSystem,
  scoreSystemCompliance as scoreSystem,
  generateDesignMd,
  extractDtcgTokens,
  lintDesignMd,
  diffDesignMd,
  applyDesignSystemWaivers,
  computeOklabHistogramDistance,
  buildSystemTokenDiff,
  primaryFamily,
  parseCssColor,
  SYSTEM_CHECKS,
} from './system.js';
export {
  buildPageScript,
  esbuildNamePolyfills,
  detectBlocked,
  type PageScriptData,
  type BlockedResult,
  type BuildPageScriptOptions,
  type DetectBlockedContext,
} from './page-script.js';
export { SCAN_PAGE_WAIT, waitFontsReadyInPage } from './runner-wait.js';
export {
  assemblePatternResults,
  type PatternSignal,
  type AssembledPatternResults,
  type FindingStatus,
} from './result-assembly.js';

import { gradeForScore, verdictFor } from './verdict.js';
import { COPY_PATTERNS, detectEnglishProse } from './copyPatterns.js';
import { PATTERNS } from './patterns.js';
import { CRAFT_CHECKS, CRAFT_CHECK_IDS, scoreCraft } from './craft.js';
import {
  computeCoOccurrenceConfidence,
  evaluateDefaultKits,
  computeDesignTypicality,
} from './calibration.js';
import { applyPreset } from './presets.js';
import { buildPageScript, detectBlocked, type BuildPageScriptOptions } from './page-script.js';
import { assemblePatternResults } from './result-assembly.js';

// Honest self-identification User-Agent strings (#294 A-08).
export const SCANNER_USER_AGENT = 'SlopDetector/0.8.0 (+https://slop-detect.com/bot)';

// Known axes. `design` is the original fingerprint; `copy` is the text axis
// (#08); `craft` is the floor accessibility/rendering axis (#255 F-00, never
// feeds design/copy/unified score or tier).
export const AXES = ['design', 'copy', 'craft'];

// Per-axis tier thresholds. design keeps its historical bands. copy is scored on
// its own 0-100 scale (sum of triggered copy-pattern weights, clamped).
const AXIS_TIERS = {
  design: { mild: 10, heavy: 28 },
  copy: { mild: 8, heavy: 20 },
};

function tierFor(axis: string, score: number) {
  const t = (AXIS_TIERS as any)[axis] || AXIS_TIERS.design;
  return score >= t.heavy ? 'Heavy' : score >= t.mild ? 'Mild' : 'Clean';
}

// Versioned "slop definitions". Bump when patterns are added / removed /
// re-weighted so historical scores stay comparable and a re-score drift is
// explainable (rule change vs. site change).
export const DEFINITIONS_VERSION = '2026.11';

const PATTERNS_BY_ID = new Map<string, any>(PATTERNS.map((p: any) => [p.id, p]));

export interface ScoreAdjustment {
  ruleId: string;
  targetPatternId: string;
  delta: number;
  reason: string;
  sharedNodes?: string[];
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
    id: 'slop_fonts_centered_hero_cap',
    description:
      'Cap combined contribution of slop_fonts + centered_hero at <= 8 points (FIX-07)',
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
    id: 'slop_fonts_co_signal',
    description:
      'Inter/Geist alone or secondary slop fonts alone require at least one other triggered design signal (D-08)',
    apply(patterns, effectiveWeights) {
      const sf = patterns.find((p) => p.id === 'slop_fonts' && p.triggered);
      if (!sf) return [];
      const wSf = effectiveWeights.get('slop_fonts') ?? 0;
      if (wSf <= 0) return [];
      const ev = sf.evidence || {};
      const requiresCoSignal = ev.secondaryOnly === true || ev.interOrGeistOnly === true;
      if (!requiresCoSignal) return [];
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
      'Deduplicate score contribution when two triggered patterns cite identical DOM nodeIds (FIX-19)',
    apply(patterns, effectiveWeights) {
      const adjustments: ScoreAdjustment[] = [];
      const triggeredWithNodes = patterns.filter(
        (p) =>
          p.triggered &&
          Array.isArray(p.evidence?.nodeIds) &&
          p.evidence.nodeIds.length > 0
      );
      for (let i = 0; i < triggeredWithNodes.length; i++) {
        for (let j = i + 1; j < triggeredWithNodes.length; j++) {
          const a = triggeredWithNodes[i];
          const b = triggeredWithNodes[j];
          const nodesA = new Set<string>(a.evidence.nodeIds);
          const sharedNodes = (b.evidence.nodeIds as string[]).filter((n) => nodesA.has(n));
          if (sharedNodes.length === 0) continue;
          const wA = effectiveWeights.get(a.id) ?? 0;
          const wB = effectiveWeights.get(b.id) ?? 0;
          const target = wA >= wB ? b : a;
          const targetWeight = effectiveWeights.get(target.id) ?? 0;
          if (targetWeight > 0) {
            effectiveWeights.set(target.id, 0);
            adjustments.push({
              ruleId: 'overlapping_evidence_dedup',
              targetPatternId: target.id,
              delta: -targetWeight,
              reason: `Overlapping DOM evidence with ${target.id === a.id ? b.id : a.id}`,
              sharedNodes,
            });
          } else {
            adjustments.push({
              ruleId: 'overlapping_evidence_dedup',
              targetPatternId: target.id,
              delta: 0,
              reason: `Overlapping DOM evidence with ${target.id === a.id ? b.id : a.id}`,
              sharedNodes,
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
  opts: { postPassRules?: PostPassRule[]; coOccurrenceStats?: Record<string, any> } = {}
) {
  // Exclude craft checks if ever passed into scorePatterns (F-00 hard rule).
  const designInputs = (patternResults || []).filter((p) => !CRAFT_CHECK_IDS.has(p?.id));

  const enriched = designInputs.map((p) => {
    const def = PATTERNS_BY_ID.get(p.id);
    const ruleStatus = p.ruleStatus || (def ? def.status : undefined) || 'active';
    const hasError = Boolean(p.evidence?.error || p.status === 'unknown');
    const isReview =
      p.status === 'review' ||
      p.weight === 0 ||
      ruleStatus === 'review' ||
      ruleStatus === 'experimental' ||
      ruleStatus === 'retired';
    const status = hasError
      ? 'unknown'
      : p.triggered
        ? isReview
          ? 'review'
          : 'fail'
        : 'pass';
    return {
      ...p,
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
  const tier = tierFor('design', clamped);
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
    definitionsVersion: DEFINITIONS_VERSION,
  };
}

// ── Copy axis ────────────────────────────────────────────────────────────────
// Run the copy-slop patterns over an extracted text context. Pure: no DOM, no
// browser. `textCtx` is what extractTextContext() returns.
export function scoreCopy(textCtx: any, _opts: Record<string, any> = {}) {
  const ctx = textCtx || { text: '', headings: [], paragraphs: [], wordCount: 0 };
  const text = String(ctx.text || '');
  const wordCount =
    typeof ctx.wordCount === 'number'
      ? ctx.wordCount
      : text
        ? text.split(/\s+/).filter(Boolean).length
        : 0;
  const proseWordCount =
    typeof ctx.proseWordCount === 'number' ? ctx.proseWordCount : wordCount;

  // C-01 (#265): Language gate and prose length gate.
  const langInfo = detectEnglishProse(text, ctx.lang);
  const isNonEnglish = !langInfo.isEnglish && wordCount >= 15;
  const isShortProse = proseWordCount < 150;
  const isMediumProse = proseWordCount >= 150 && proseWordCount < 300;
  const thin = isShortProse || isNonEnglish;
  const weightMultiplier = isMediumProse ? 0.5 : 1;
  const proseConfidence = isNonEnglish
    ? 'non_english'
    : isShortProse
      ? 'insufficient_prose'
      : isMediumProse
        ? 'low'
        : 'high';

  const patterns = COPY_PATTERNS.map((p: any) => {
    const isStatistical = p.statistical !== false;
    let ev: any;
    let status: 'fail' | 'review' | 'unknown' | 'pass' = 'pass';
    let triggered = false;

    if (isStatistical && isNonEnglish) {
      ev = {
        triggered: false,
        skipped: true,
        gateReason: 'non-english',
        lang: langInfo.lang,
      };
      status = 'unknown';
    } else if (isStatistical && isShortProse) {
      ev = {
        triggered: false,
        skipped: true,
        gateReason: 'insufficient_prose',
        proseWordCount,
      };
      status = 'unknown';
    } else {
      try {
        ev = p.match(ctx);
      } catch (e: any) {
        ev = { triggered: false, error: e.message };
      }
      triggered = !!ev?.triggered;
      const isReviewRule =
        p.weight === 0 ||
        p.status === 'review' ||
        p.status === 'experimental' ||
        p.status === 'retired';
      status = ev?.error
        ? 'unknown'
        : triggered
          ? isReviewRule
            ? 'review'
            : 'fail'
          : 'pass';
    }

    return {
      id: p.id,
      label: p.label,
      short: p.short,
      axis: 'copy',
      category: p.category,
      weight: p.weight,
      statistical: isStatistical,
      status,
      ruleStatus: p.status || 'active',
      evidenceGrade: p.evidenceGrade ?? null,
      era: p.era ?? null,
      modelFamilies: p.modelFamilies ?? [],
      lastValidatedIn: p.lastValidatedIn ?? DEFINITIONS_VERSION,
      likelihoodRatio: p.likelihoodRatio ?? null,
      fpRate: p.fpRate ?? null,
      fpRatePre2022: null,
      coOccurrenceOnly: !!p.coOccurrenceOnly,
      triggered,
      evidence: ev,
    };
  });

  // Effective weights with C-01 half-weight for 150-299 words, K-04 0-weight for review/unknown,
  // C-07 co-occurrence requirement for decaying rules (em_dash_overload, rule_of_three),
  // and FIX-19 overlap deduplication.
  const effectiveWeights = new Map<string, number>();
  for (const p of patterns) {
    if (p.status === 'fail' && p.triggered && p.weight > 0) {
      const mult = p.statistical ? weightMultiplier : 1;
      effectiveWeights.set(p.id, p.weight * mult);
    } else {
      effectiveWeights.set(p.id, 0);
    }
  }

  const adjustments: ScoreAdjustment[] = [];
  const allTriggered = patterns.filter((p) => p.triggered);

  // C-07: coOccurrenceOnly patterns contribute 0 points when no other copy pattern triggered.
  for (const p of patterns) {
    if (p.triggered && p.coOccurrenceOnly) {
      const w = effectiveWeights.get(p.id) ?? 0;
      if (allTriggered.length <= 1 && w > 0) {
        effectiveWeights.set(p.id, 0);
        adjustments.push({
          ruleId: 'copy_co_occurrence_gate',
          targetPatternId: p.id,
          delta: -w,
          reason: `${p.id} is a decaying co-occurrence signal and contributes 0 points in isolation`,
        });
      }
    }
  }

  // FIX-19: deduplicate overlapping nodeIds across copy patterns.
  const withNodes = patterns.filter(
    (p) => p.triggered && Array.isArray(p.evidence?.nodeIds) && p.evidence.nodeIds.length > 0
  );
  for (let i = 0; i < withNodes.length; i++) {
    for (let j = i + 1; j < withNodes.length; j++) {
      const a = withNodes[i];
      const b = withNodes[j];
      const nodesA = new Set<string>(a.evidence.nodeIds);
      const sharedNodes = (b.evidence.nodeIds as string[]).filter((n) => nodesA.has(n));
      if (sharedNodes.length === 0) continue;
      const wA = effectiveWeights.get(a.id) ?? 0;
      const wB = effectiveWeights.get(b.id) ?? 0;
      const target = wA >= wB ? b : a;
      const targetWeight = effectiveWeights.get(target.id) ?? 0;
      effectiveWeights.set(target.id, 0);
      adjustments.push({
        ruleId: 'overlapping_evidence_dedup',
        targetPatternId: target.id,
        delta: -targetWeight,
        reason: `Overlapping DOM evidence with ${target.id === a.id ? b.id : a.id}`,
        sharedNodes,
      });
    }
  }

  let raw = 0;
  for (const p of patterns) {
    raw += effectiveWeights.get(p.id) ?? 0;
  }
  const score = Math.min(100, Math.round(raw));
  const tier = tierFor('copy', score);
  const triggered = patterns.filter((p) => p.triggered);

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

  return {
    axis: 'copy',
    evidence,
    score,
    tier,
    grade: gradeForScore(score),
    patternsFlagged: triggered.length,
    patternsTotal: patterns.length,
    wordCount,
    proseWordCount,
    lang: langInfo.lang,
    isEnglish: langInfo.isEnglish,
    proseConfidence,
    thin,
    adjustments,
    patterns,
  };
}

// ── Multi-page site copy aggregation (#277 C-14) ─────────────────────────────
export interface MultiPageCopyInput {
  url?: string;
  text: string;
  lang?: string;
  headings?: string[];
  paragraphs?: string[];
  links?: Array<{ href: string; text?: string }>;
  attributes?: Array<{ attr: string; value: string }>;
}

export function scoreMultiPageCopy(
  pages: Array<string | MultiPageCopyInput> = [],
  opts: { minQualifyingPages?: number; boilerplateThreshold?: number } = {}
) {
  const minPages = opts.minQualifyingPages ?? 5;
  const boilerThreshold = opts.boilerplateThreshold ?? 0.5;
  const normalizedPages: MultiPageCopyInput[] = (pages || []).map((p, idx) =>
    typeof p === 'string' ? { url: `page-${idx + 1}`, text: p } : p
  );

  // Step 1: Run deterministic artifact patterns BEFORE boilerplate stripping.
  const artifactPatterns = COPY_PATTERNS.filter((p: any) => p.statistical === false);
  const artifactFindings: Array<{ pageUrl: string; patternId: string; evidence: any }> = [];
  for (let i = 0; i < normalizedPages.length; i++) {
    const pg = normalizedPages[i];
    const pageUrl = pg.url || `page-${i + 1}`;
    const fullCtx = {
      text: pg.text || '',
      headings: pg.headings || [],
      paragraphs: pg.paragraphs || [],
      links: pg.links || [],
      attributes: pg.attributes || [],
      wordCount: (pg.text || '').split(/\s+/).filter(Boolean).length,
      proseWordCount: (pg.text || '').split(/\s+/).filter(Boolean).length,
      lang: pg.lang,
    };
    for (const ap of artifactPatterns) {
      try {
        const ev = ap.match(fullCtx);
        if (ev && ev.triggered) {
          artifactFindings.push({ pageUrl, patternId: ap.id, evidence: ev });
        }
      } catch {}
    }
  }

  // Step 2: Strip boilerplate blocks/sentences that appear on >50% of other pages.
  const splitChunks = (txt: string) =>
    String(txt || '')
      .split(/\n{2,}|(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

  const pageChunks = normalizedPages.map((pg) => splitChunks(pg.text));
  const chunkPageSets = new Map<string, Set<number>>();
  pageChunks.forEach((chunks, pageIdx) => {
    for (const c of chunks) {
      const key = c.toLowerCase().replace(/\s+/g, ' ');
      if (key.length < 15) continue;
      if (!chunkPageSets.has(key)) chunkPageSets.set(key, new Set());
      chunkPageSets.get(key)!.add(pageIdx);
    }
  });

  const otherPageDenom = Math.max(1, normalizedPages.length - 1);
  const strippedPages = normalizedPages.map((pg, pageIdx) => {
    if (normalizedPages.length < 2) return { ...pg, strippedText: pg.text || '', strippedCount: 0 };
    const chunks = pageChunks[pageIdx];
    let strippedCount = 0;
    const kept = chunks.filter((c) => {
      const key = c.toLowerCase().replace(/\s+/g, ' ');
      if (key.length < 15) return true;
      const pagesWithChunk = chunkPageSets.get(key);
      const otherHits = pagesWithChunk
        ? [...pagesWithChunk].filter((idx) => idx !== pageIdx).length
        : 0;
      if (otherHits / otherPageDenom > boilerThreshold) {
        strippedCount++;
        return false;
      }
      return true;
    });
    return {
      ...pg,
      strippedText: kept.join('\n\n'),
      strippedCount,
    };
  });

  // Step 3: Score each page after boilerplate removal; filter to >=150 English prose words.
  const pageResults = strippedPages.map((pg, idx) => {
    const words = pg.strippedText.split(/\s+/).filter(Boolean).length;
    const res = scoreCopy({
      text: pg.strippedText,
      headings: pg.headings || [],
      paragraphs: pg.paragraphs || [],
      links: pg.links || [],
      attributes: pg.attributes || [],
      wordCount: words,
      proseWordCount: words,
      lang: pg.lang,
    });
    return {
      url: pg.url || `page-${idx + 1}`,
      strippedChunks: pg.strippedCount,
      proseWordCount: words,
      isEnglish: res.isEnglish,
      qualifies: words >= 150 && res.isEnglish,
      result: res,
    };
  });

  const qualifying = pageResults.filter((p) => p.qualifies);
  if (qualifying.length < minPages) {
    return {
      status: 'insufficient_pages',
      qualifyingPages: qualifying.length,
      requiredPages: minPages,
      totalPages: normalizedPages.length,
      score: null,
      tier: null,
      mildOrAboveShare: null,
      percentiles: null,
      artifactFindings,
      pages: pageResults,
    };
  }

  const sortedScores = qualifying.map((q) => q.result.score).sort((a, b) => a - b);
  const pct = (q: number) => {
    const pos = (sortedScores.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sortedScores[base + 1] !== undefined) {
      return Number((sortedScores[base] + rest * (sortedScores[base + 1] - sortedScores[base])).toFixed(2));
    }
    return sortedScores[base];
  };

  const p10 = pct(0.1);
  const p50 = pct(0.5);
  const p90 = pct(0.9);
  const mildOrAboveCount = qualifying.filter(
    (q) => q.result.tier === 'Mild' || q.result.tier === 'Heavy'
  ).length;
  const mildOrAboveShare = Number((mildOrAboveCount / qualifying.length).toFixed(3));
  const aggScore = Math.round(p50);

  return {
    status: 'ok',
    qualifyingPages: qualifying.length,
    requiredPages: minPages,
    totalPages: normalizedPages.length,
    score: aggScore,
    tier: tierFor('copy', aggScore),
    mildOrAboveShare,
    percentiles: { p10, p50, p90 },
    artifactFindings,
    pages: pageResults,
  };
}

// ── Multi-axis aggregator ─────────────────────────────────────────────────────
// Combine per-axis scoring summaries into one unified result.
// Craft, AEO, and System axes NEVER feed unifiedScore or unifiedTier (F-00 hard rule).
export function combineAxes(axisSummaries: Record<string, any> = {}) {
  const SCORED_UNIFIED_AXES = new Set(['design', 'copy']);
  const present = Object.keys(axisSummaries || {}).filter(
    (k) => SCORED_UNIFIED_AXES.has(k) && axisSummaries[k]
  );
  const scores = present.map((k) => axisSummaries[k].score || 0);
  if (scores.length === 0) {
    return {
      unifiedScore: 0,
      unifiedTier: 'Clean',
      unifiedGrade: gradeForScore(0),
      axesScored: [],
    };
  }
  const max = Math.max(...scores);
  const dirtyAxes = present.filter((k) => (axisSummaries[k].tier || 'Clean') !== 'Clean').length;
  // +6 per additional dirty axis beyond the first.
  const penalty = Math.max(0, dirtyAxes - 1) * 6;
  const unified = Math.min(100, max + penalty);

  // Unified tier uses the design bands (the canonical 0-9 / 10-27 / 28+ scale).
  const unifiedTier = tierFor('design', unified);

  return {
    unifiedScore: unified,
    unifiedTier,
    unifiedGrade: gradeForScore(unified),
    axesScored: present,
    dirtyAxes,
  };
}

// ── Programmatic convenience wrappers ────────────────────────────────────────

/**
 * Pattern subset for a preset. `getPatterns('strict')` filters the built-in
 * PATTERNS; the legacy `getPatterns(patterns, 'strict')` form (= applyPreset)
 * still works.
 */
export function getPatterns(presetOrPatterns?: any, preset?: any) {
  if (Array.isArray(presetOrPatterns)) return applyPreset(presetOrPatterns, preset);
  return applyPreset(PATTERNS, presetOrPatterns);
}

/**
 * Build the page-evaluate script. Accepts `(patterns, opts)` as documented, or
 * the legacy `(opts)` form. The copy-axis text context is always extracted;
 * `includeSystem` adds the DESIGN.md observation pass.
 */
export function buildPageEvaluateScript(
  patternsOrOpts?: any[] | (BuildPageScriptOptions & { includeCopy?: boolean }),
  opts: BuildPageScriptOptions & { includeCopy?: boolean } = {}
): string {
  if (Array.isArray(patternsOrOpts)) {
    return buildPageScript({ ...opts, patterns: patternsOrOpts });
  }
  return buildPageScript({ ...(patternsOrOpts || {}), ...opts });
}

function normalizeAxes(axes?: string[] | 'all') {
  const VALID = ['design', 'copy', 'craft'];
  if (axes === 'all') return [...VALID];
  if (!Array.isArray(axes) || axes.length === 0) return ['design'];
  const out = axes.filter((a) => VALID.includes(a));
  if (!out.includes('design')) out.unshift('design');
  return [...new Set(out)];
}

export interface AssembleScanResultOptions {
  url?: string;
  finalUrl?: string;
  /** `['design']` (default), `['design','copy']`, `['design','copy','craft']`, or `'all'`. */
  axes?: string[] | 'all';
  /** Pattern subset to score against (defaults to every built-in pattern). */
  patterns?: Array<{ id: string }>;
  /** Named preset applied after `patterns` (default `full`). */
  preset?: string;
}

/**
 * Turn the object returned by `page.evaluate(buildPageEvaluateScript(...))`
 * into a scored scan result: top-level design score/tier/grade/verdict,
 * per-pattern rows, optional copy axis + craft axis + unified score, and a `blocked`
 * result (score null) when the page looks like a bot wall / empty render —
 * mirroring the CLI and `POST /api/scan` shapes.
 */
export function assembleScanResult(raw: any, opts: AssembleScanResultOptions = {}) {
  const isPageData = !!raw && typeof raw === 'object' && 'signals' in raw;
  const data = isPageData ? raw : { signals: raw || {} };
  const url = opts.url || data.url;

  if (isPageData) {
    const blocked = detectBlocked(data, {
      extractedPatterns: Object.keys(data.signals || {}).length,
    });
    if (blocked) {
      return {
        url,
        finalUrl: opts.finalUrl || data.url,
        title: data.title,
        h1: data.h1Text,
        blocked: true,
        error: blocked.reason,
        code: blocked.code,
        hint: blocked.hint,
        evidence: [],
        score: null,
        tier: null,
        grade: null,
        patternsFlagged: 0,
        patternsTotal: PATTERNS.length,
        patterns: [],
        patternsErrored: 0,
        definitionsVersion: DEFINITIONS_VERSION,
      };
    }
  }

  const { patterns: all, patternsErrored } = assemblePatternResults(data.signals || {});
  let selected = all;
  if (Array.isArray(opts.patterns)) {
    const ids = new Set(opts.patterns.map((p) => p && p.id));
    selected = all.filter((p) => ids.has(p.id));
  }
  const preset = opts.preset || 'full';
  const scored = applyPreset(selected, preset);
  const scoring = scorePatterns(scored);

  const craftSummary = data.craftSignals ? scoreCraft(data.craftSignals) : null;
  const kitMatches = evaluateDefaultKits(data.signals || {});

  const result: Record<string, any> = {
    url,
    finalUrl: opts.finalUrl || data.url,
    title: data.title,
    h1: data.h1Text,
    h1Font: data.h1Font,
    preset,
    ...scoring,
    patterns: scored,
    patternsErrored,
    madeWith: data.madeWith || null,
    kitMatches,
  };

  if (craftSummary) {
    result.craft = craftSummary;
  }

  const reqAxes = normalizeAxes(opts.axes);
  if (reqAxes.includes('copy') || reqAxes.includes('craft')) {
    const axes: Record<string, any> = {
      design: {
        axis: 'design',
        evidence: scoring.evidence,
        score: scoring.score,
        tier: scoring.tier,
        grade: scoring.grade,
        patternsFlagged: scoring.patternsFlagged,
        patternsTotal: scoring.patternsTotal,
        patterns: scored,
      },
    };
    if (reqAxes.includes('copy')) {
      axes.copy = scoreCopy(data.textContext || {});
    }
    if (reqAxes.includes('craft') && craftSummary) {
      axes.craft = craftSummary;
    }
    result.axes = axes;
    if (axes.copy) {
      Object.assign(result, combineAxes({ design: axes.design, copy: axes.copy }));
    }
  }
  if (data.systemContext) result.systemContext = data.systemContext;
  return result;
}
