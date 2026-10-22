// Exit codes for a scan run. See schemas/README.md.
// 0 — every page produced a score. A Heavy score stays 0 unless --fail-on
//     or --fail-under asked for a gate.
// 1 — a scored page is over that gate.
// 2 — the scan could not run (blocked, navigation error, empty page, bad
//     invocation). Never treat this as a clean page.

const TIER_RANK: Record<string, number> = { Clean: 0, Mild: 1, Heavy: 2 };

export interface ScanExitFlags {
  failOn?: string | null;
  failUnderScore?: number | null;
}

export function exitCodeForScanResults(results: any[] | any, flags: ScanExitFlags = {}): 0 | 1 | 2 {
  const list = Array.isArray(results) ? results : [results];
  if (
    list.length === 0 ||
    list.some((r) => !r || r.error || r.blocked || r.runSummary?.ok === false)
  )
    return 2;

  let exitCode: 0 | 1 = 0;
  if (flags.failOn) {
    const threshold = TIER_RANK[flags.failOn];
    const failed = list.some((r) => {
      const tier = r.axes && r.axes.copy ? r.unifiedTier : r.tier;
      return (TIER_RANK[tier] ?? 0) >= threshold;
    });
    if (failed) exitCode = 1;
  }
  if (flags.failUnderScore != null) {
    const maxAllowed = flags.failUnderScore;
    const failed = list.some((r) => {
      const score = r.axes && r.axes.copy ? r.unifiedScore : r.score;
      return typeof score !== 'number' || score > maxAllowed;
    });
    if (failed) exitCode = 1;
  }
  return exitCode;
}
