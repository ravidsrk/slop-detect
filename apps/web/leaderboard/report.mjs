// Pure helpers for leaderboard/build.mjs. Kept out of the scanner script so
// tests can import them without launching a corpus scan.

// Node loads the built CLI. Bun loads the TypeScript source. Callers must
// catch this: a missing build is an error string, not an uncaught exception
// from importing packages/cli/src/detector.js (that file does not exist).
export async function loadLocalScanUrl() {
  const source = new URL('../../../packages/cli/src/detector.ts', import.meta.url);
  const dist = new URL('../../../packages/cli/dist/index.js', import.meta.url);
  const candidates = typeof globalThis.Bun !== 'undefined' ? [source, dist] : [dist];
  let lastErr;
  for (const url of candidates) {
    try {
      const mod = await import(url.href);
      if (typeof mod.scanUrl === 'function') return mod.scanUrl;
      lastErr = new Error(`no scanUrl export in ${url.pathname}`);
    } catch (e) {
      lastErr = e;
    }
  }
  const hint =
    typeof globalThis.Bun !== 'undefined'
      ? 'bun could not load packages/cli/src/detector.ts'
      : 'node needs the built CLI. Run `bun run --filter slop-detect build`, or run `bun apps/web/leaderboard/build.mjs --local`';
  throw new Error(`${hint} (${lastErr?.message || 'scanUrl not found'})`);
}

export function tierRank(t) {
  return { Clean: 0, Mild: 1, Heavy: 2 }[t] ?? 1;
}

// Rule ids that fired on one scan. Accepts the CLI/API shapes: a `patterns`
// array with `triggered`, or a `triggered` list of ids or {id} rows.
export function flaggedPatternIds(result) {
  if (!result || typeof result !== 'object') return [];
  if (Array.isArray(result.patterns)) {
    return result.patterns.filter((p) => p && p.triggered && p.id).map((p) => String(p.id));
  }
  if (Array.isArray(result.triggered)) {
    return result.triggered
      .map((p) => (typeof p === 'string' ? p : p && p.id))
      .filter(Boolean)
      .map(String);
  }
  if (Array.isArray(result.flaggedPatterns)) {
    return result.flaggedPatterns.filter(Boolean).map(String);
  }
  return [];
}

export function buildReport(sites, definitionsVersion) {
  const scored = sites.filter((s) => s.scored);
  const avg = (arr) =>
    arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;
  const slopCount = scored.filter((s) => s.tier !== 'Clean').length;

  const byBuilder = {};
  for (const s of scored) {
    (byBuilder[s.builtWith] ||= []).push(s.score);
  }
  const builders = Object.fromEntries(
    Object.entries(byBuilder).map(([k, v]) => [k, { count: v.length, avgScore: avg(v) }])
  );

  const byCategory = {};
  for (const s of scored) (byCategory[s.category] ||= []).push(s.score);
  const categories = Object.fromEntries(
    Object.entries(byCategory).map(([k, v]) => [k, { count: v.length, avgScore: avg(v) }])
  );

  const patternPrevalence = {};
  for (const s of scored) {
    for (const id of s.flaggedPatterns || []) {
      patternPrevalence[id] = (patternPrevalence[id] || 0) + 1;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    definitionsVersion,
    count: sites.length,
    scored: scored.length,
    stats: {
      avgScore: avg(scored.map((s) => s.score)),
      slopShare: scored.length ? Math.round((slopCount / scored.length) * 100) : null,
      cleanCount: scored.filter((s) => s.tier === 'Clean').length,
      mildCount: scored.filter((s) => s.tier === 'Mild').length,
      heavyCount: scored.filter((s) => s.tier === 'Heavy').length,
    },
    byBuilder: builders,
    byCategory: categories,
    patternPrevalence,
    sites: sites.slice().sort((a, b) => {
      if (!a.scored && !b.scored) return 0;
      if (!a.scored) return 1;
      if (!b.scored) return -1;
      return a.score - b.score || tierRank(a.tier) - tierRank(b.tier);
    }),
  };
}
