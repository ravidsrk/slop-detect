// Skill-efficacy benchmark harness (R-13 #329: `slop-detect bench`).
//
// Evaluates N briefs × {skillOff, skillOn} scan results with pinned definitions
// and Chromium metadata, computing deterministic per-brief score deltas,
// per-pattern prevalence deltas with Clopper-Pearson 95% confidence intervals,
// and byte-identical TSV / JSON exports. Never claims authorship (K-06).

import { DEFINITIONS_VERSION } from './definitions.js';
import { clopperPearson95 } from './calibration.js';

export interface BenchPair {
  briefId: string;
  skillName?: string;
  skillOff: any;
  skillOn: any;
}

export interface BenchPatternDelta {
  id: string;
  offHits: number;
  onHits: number;
  totalBriefs: number;
  offRate: number;
  onRate: number;
  deltaRate: number;
  offCi95: { lower: number; upper: number };
  onCi95: { lower: number; upper: number };
}

export interface BenchReport {
  definitionsVersion: string;
  chromiumVersion: string;
  skillName: string;
  briefCount: number;
  meanOffScore: number;
  meanOnScore: number;
  meanScoreDelta: number;
  medianScoreDelta: number;
  pairs: Array<{
    briefId: string;
    offScore: number;
    onScore: number;
    scoreDelta: number;
    offTier: string;
    onTier: string;
    removedPatterns: string[];
    addedPatterns: string[];
  }>;
  patternDeltas: BenchPatternDelta[];
  framingNote: string;
}

export function evaluateSkillBenchmark(
  pairs: BenchPair[],
  opts: { skillName?: string; chromiumVersion?: string; definitionsVersion?: string } = {}
): BenchReport {
  const defs = opts.definitionsVersion || DEFINITIONS_VERSION;
  const skillName = opts.skillName || pairs[0]?.skillName || 'design-skill';
  const chromiumVersion =
    opts.chromiumVersion ||
    pairs[0]?.skillOn?.browserVersion ||
    pairs[0]?.skillOff?.browserVersion ||
    'pinned';

  const n = pairs.length;
  const pairRows: BenchReport['pairs'] = [];
  const patternCounts = new Map<string, { off: number; on: number }>();

  for (const p of pairs) {
    const offScore = Number(p.skillOff?.score ?? 0);
    const onScore = Number(p.skillOn?.score ?? 0);
    const offPats = new Set<string>(
      (Array.isArray(p.skillOff?.patterns) ? p.skillOff.patterns : [])
        .filter((x: any) => x && x.triggered)
        .map((x: any) => String(x.id))
    );
    const onPats = new Set<string>(
      (Array.isArray(p.skillOn?.patterns) ? p.skillOn.patterns : [])
        .filter((x: any) => x && x.triggered)
        .map((x: any) => String(x.id))
    );

    const allIds = new Set<string>([
      ...(Array.isArray(p.skillOff?.patterns)
        ? p.skillOff.patterns.map((x: any) => String(x.id))
        : []),
      ...(Array.isArray(p.skillOn?.patterns)
        ? p.skillOn.patterns.map((x: any) => String(x.id))
        : []),
    ]);
    for (const id of allIds) {
      const rec = patternCounts.get(id) || { off: 0, on: 0 };
      if (offPats.has(id)) rec.off++;
      if (onPats.has(id)) rec.on++;
      patternCounts.set(id, rec);
    }

    const removedPatterns = [...offPats].filter((id) => !onPats.has(id)).sort();
    const addedPatterns = [...onPats].filter((id) => !offPats.has(id)).sort();

    pairRows.push({
      briefId: p.briefId,
      offScore,
      onScore,
      scoreDelta: onScore - offScore,
      offTier: String(p.skillOff?.tier || 'Clean'),
      onTier: String(p.skillOn?.tier || 'Clean'),
      removedPatterns,
      addedPatterns,
    });
  }

  pairRows.sort((a, b) => a.briefId.localeCompare(b.briefId));

  const meanOffScore =
    n > 0 ? Math.round((pairRows.reduce((s, r) => s + r.offScore, 0) / n) * 100) / 100 : 0;
  const meanOnScore =
    n > 0 ? Math.round((pairRows.reduce((s, r) => s + r.onScore, 0) / n) * 100) / 100 : 0;
  const meanScoreDelta = Math.round((meanOnScore - meanOffScore) * 100) / 100;

  const sortedDeltas = pairRows.map((r) => r.scoreDelta).sort((a, b) => a - b);
  const medianScoreDelta =
    n === 0
      ? 0
      : n % 2 === 1
        ? sortedDeltas[(n - 1) / 2]
        : Math.round(((sortedDeltas[n / 2 - 1] + sortedDeltas[n / 2]) / 2) * 100) / 100;

  const patternDeltas: BenchPatternDelta[] = [...patternCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, counts]) => {
      const offRate = n > 0 ? Math.round((counts.off / n) * 1000) / 1000 : 0;
      const onRate = n > 0 ? Math.round((counts.on / n) * 1000) / 1000 : 0;
      const deltaRate = Math.round((onRate - offRate) * 1000) / 1000;
      const [offLow, offHigh] = clopperPearson95(counts.off, Math.max(1, n));
      const [onLow, onHigh] = clopperPearson95(counts.on, Math.max(1, n));
      return {
        id,
        offHits: counts.off,
        onHits: counts.on,
        totalBriefs: n,
        offRate,
        onRate,
        deltaRate,
        offCi95: {
          lower: Math.round(offLow * 1000) / 1000,
          upper: Math.round(offHigh * 1000) / 1000,
        },
        onCi95: {
          lower: Math.round(onLow * 1000) / 1000,
          upper: Math.round(onHigh * 1000) / 1000,
        },
      };
    });

  return {
    definitionsVersion: defs,
    chromiumVersion,
    skillName,
    briefCount: n,
    meanOffScore,
    meanOnScore,
    meanScoreDelta,
    medianScoreDelta,
    pairs: pairRows,
    patternDeltas,
    framingNote:
      'Benchmark rows report deterministic default-pattern count and score deltas across matched briefs, never authorship.',
  };
}

export function formatBenchTsv(report: BenchReport): string {
  const header = [
    'skill',
    'definitions_version',
    'chromium_version',
    'brief_id',
    'off_score',
    'on_score',
    'score_delta',
    'off_tier',
    'on_tier',
    'removed_patterns',
    'added_patterns',
  ].join('\t');
  const rows = report.pairs.map((p) =>
    [
      report.skillName,
      report.definitionsVersion,
      report.chromiumVersion,
      p.briefId,
      String(p.offScore),
      String(p.onScore),
      String(p.scoreDelta),
      p.offTier,
      p.onTier,
      p.removedPatterns.join(',') || '-',
      p.addedPatterns.join(',') || '-',
    ].join('\t')
  );
  return [header, ...rows].join('\n') + '\n';
}
