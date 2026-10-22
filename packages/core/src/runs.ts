// Aggregate repeated scans (W-10). The aggregate is a separate field.
// It does not replace the patterns of any one run, and it is not a Clean
// score when a run could not be scored.

export const RUNS_MIN = 1;
export const RUNS_MAX = 5;

function designTier(score: number): string {
  return score >= 28 ? 'Heavy' : score >= 10 ? 'Mild' : 'Clean';
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function aggregateRuns(runs: any[] = [], method: 'median' | 'pessimistic' = 'median') {
  if (method !== 'median' && method !== 'pessimistic') {
    return {
      ok: false,
      message: '--aggregate must be median or pessimistic.',
      aggregatedScore: null,
    };
  }
  if (!Array.isArray(runs) || runs.length === 0) {
    return {
      ok: false,
      message: 'Scan could not run. This is not a Clean score.',
      aggregatedScore: null,
    };
  }
  const versions = [
    ...new Set(runs.map((run) => run?.definitionsVersion).filter((version) => version)),
  ];
  if (versions.length > 1) {
    return {
      ok: false,
      comparable: false,
      message: 'definitionsVersion mismatch. These runs are not one score.',
      definitionsVersions: versions,
      aggregatedScore: null,
    };
  }
  if (runs.some((run) => !run || run.blocked || run.error || typeof run.score !== 'number')) {
    return {
      ok: false,
      message: 'Scan could not run. This is not a Clean score.',
      aggregatedScore: null,
    };
  }
  const scores = runs.map((run) => run.score as number);
  const aggregatedScore = method === 'pessimistic' ? Math.max(...scores) : median(scores);
  const environments = runs.map((run) => run.environment || null);
  const environmentDiff = new Set(environments.map((env) => JSON.stringify(env))).size > 1;
  return {
    ok: true,
    method,
    runs: scores.length,
    scores,
    spread: Math.max(...scores) - Math.min(...scores),
    aggregatedScore,
    tier: designTier(aggregatedScore),
    definitionsVersion: versions[0] || null,
    environmentDiff,
    environments,
  };
}
