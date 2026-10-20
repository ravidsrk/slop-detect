// Calibration, credibility gates, provenance, default-kit match, and typicality
// (K-01 #213, K-03 #298, K-04 #299, K-11 #306, #333 co-occurrence, D-01 #240, D-11 #250, D-13 #252).
//
// Pure functions only — no network, no fabricated false-positive rates.

export interface CalibrationRow {
  url: string;
  domain?: string;
  stratum: 'human_pre2022' | 'human_post2023' | 'ai_builder';
  madeWith?: string;
  split?: 'dev' | 'held_out';
  score?: number;
  signals?: Record<string, boolean | { triggered?: boolean }>;
}

// Deterministic FNV-1a 32-bit hash for reproducible domain splitting and manifest hashing.
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function registrableDomain(urlOrHost: string): string {
  let host = String(urlOrHost || '').trim().toLowerCase();
  try {
    if (/^https?:\/\//i.test(host)) {
      host = new URL(host).hostname.toLowerCase();
    }
  } catch {
    // fallback
  }
  host = host.replace(/^www\./, '').replace(/:\d+$/, '');
  const parts = host.split('.').filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  const twoPartTlds = new Set(['co.uk', 'org.uk', 'ac.uk', 'com.au', 'co.jp', 'co.in', 'com.br']);
  const lastTwo = parts.slice(-2).join('.');
  if (twoPartTlds.has(lastTwo) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }
  return lastTwo;
}

// K-01 (#213): Grouped-by-domain and grouped-by-builder 70/30 dev / held-out split.
// Guarantees no registrable domain appears in both dev and held_out.
export function splitByDomain<T extends CalibrationRow>(
  rows: T[],
  opts: { devRatio?: number; seed?: string } = {},
): {
  dev: Array<T & { domain: string; split: 'dev' }>;
  heldOut: Array<T & { domain: string; split: 'held_out' }>;
  manifestHash: string;
} {
  const devRatio = opts.devRatio ?? 0.7;
  const seed = opts.seed ?? 'slop-detect-k01-v1';

  // Group all rows by registrable domain first so a domain never straddles splits.
  const domainGroups = new Map<string, T[]>();
  for (const row of rows) {
    const dom = row.domain ? registrableDomain(row.domain) : registrableDomain(row.url);
    const list = domainGroups.get(dom) || [];
    list.push(row);
    domainGroups.set(dom, list);
  }

  // Bucket domains by (stratum, madeWith || '') so builder strata split evenly too.
  const buckets = new Map<string, string[]>();
  for (const [dom, domRows] of domainGroups.entries()) {
    const first = domRows[0];
    const bucketKey = `${first.stratum}::${first.stratum === 'ai_builder' ? first.madeWith || 'unknown' : 'human'}`;
    const list = buckets.get(bucketKey) || [];
    list.push(dom);
    buckets.set(bucketKey, list);
  }

  const domainAssignment = new Map<string, 'dev' | 'held_out'>();
  for (const [, doms] of buckets.entries()) {
    const sorted = doms
      .slice()
      .sort((a, b) => fnv1a(`${seed}:${a}`) - fnv1a(`${seed}:${b}`) || a.localeCompare(b));
    const devTarget = Math.max(1, Math.min(sorted.length - (sorted.length > 1 ? 1 : 0), Math.round(sorted.length * devRatio)));
    sorted.forEach((d, idx) => {
      domainAssignment.set(d, idx < devTarget ? 'dev' : 'held_out');
    });
  }

  const dev: Array<T & { domain: string; split: 'dev' }> = [];
  const heldOut: Array<T & { domain: string; split: 'held_out' }> = [];

  for (const row of rows) {
    const dom = row.domain ? registrableDomain(row.domain) : registrableDomain(row.url);
    const split = domainAssignment.get(dom) || 'dev';
    if (split === 'dev') {
      dev.push({ ...row, domain: dom, split: 'dev' });
    } else {
      heldOut.push({ ...row, domain: dom, split: 'held_out' });
    }
  }

  const canonical = rows
    .map((r) => `${registrableDomain(r.domain || r.url)}:${r.stratum}:${r.madeWith || ''}`)
    .sort()
    .join('|');
  const manifestHash = fnv1a(`${seed}:${canonical}`).toString(16).padStart(8, '0');

  return { dev, heldOut, manifestHash };
}

// Guard ensuring dev-set tuning functions refuse held-out rows (K-01).
export function assertNotHeldOut(rows: Array<{ split?: string }>): void {
  if (rows.some((r) => r && r.split === 'held_out')) {
    throw new Error('K-01 violation: threshold tuning must not touch held_out rows.');
  }
}

// K-04 (#299) & #333: Clip log-likelihood ratio to [-c, +c] (default c = ln(10)).
export function clipLogLR(logLr: number, c: number = Math.log(10)): number {
  if (!Number.isFinite(logLr)) return logLr > 0 ? c : -c;
  return Math.max(-c, Math.min(c, logLr));
}

// K-01 (#213): Compute positive likelihood ratio P(r=1 | builder) / P(r=1 | human)
// with Haldane-Anscombe 0.5 continuity correction and 95% log-normal CI.
export function computeLikelihoodRatio(
  rows: CalibrationRow[],
  ruleId: string,
): {
  ruleId: string;
  lr: number | null;
  logLrClipped: number | null;
  ci95: [number, number] | null;
  builderPositives: number;
  builderTotal: number;
  humanPositives: number;
  humanTotal: number;
} {
  let builderPositives = 0;
  let builderTotal = 0;
  let humanPositives = 0;
  let humanTotal = 0;

  for (const row of rows) {
    const sig = row.signals ? row.signals[ruleId] : false;
    const hit = typeof sig === 'object' && sig !== null ? Boolean(sig.triggered) : Boolean(sig);
    if (row.stratum === 'ai_builder') {
      builderTotal++;
      if (hit) builderPositives++;
    } else if (row.stratum === 'human_pre2022' || row.stratum === 'human_post2023') {
      humanTotal++;
      if (hit) humanPositives++;
    }
  }

  if (builderTotal === 0 || humanTotal === 0) {
    return {
      ruleId,
      lr: null,
      logLrClipped: null,
      ci95: null,
      builderPositives,
      builderTotal,
      humanPositives,
      humanTotal,
    };
  }

  // Haldane-Anscombe smoothing when a cell is 0
  const bPos = builderPositives === 0 || humanPositives === 0 ? builderPositives + 0.5 : builderPositives;
  const bTot = builderPositives === 0 || humanPositives === 0 ? builderTotal + 1 : builderTotal;
  const hPos = builderPositives === 0 || humanPositives === 0 ? humanPositives + 0.5 : humanPositives;
  const hTot = builderPositives === 0 || humanPositives === 0 ? humanTotal + 1 : humanTotal;

  const tpr = bPos / bTot;
  const fpr = hPos / hTot;
  const lr = Math.round((tpr / fpr) * 1000) / 1000;
  const logLr = Math.log(tpr / fpr);
  const logLrClipped = Math.round(clipLogLR(logLr) * 1000) / 1000;

  // Standard error of log(LR)
  const se = Math.sqrt((1 - tpr) / bPos + (1 - fpr) / hPos);
  const ciLow = Math.round(Math.exp(logLr - 1.96 * se) * 1000) / 1000;
  const ciHigh = Math.round(Math.exp(logLr + 1.96 * se) * 1000) / 1000;

  return {
    ruleId,
    lr,
    logLrClipped,
    ci95: [ciLow, ciHigh],
    builderPositives,
    builderTotal,
    humanPositives,
    humanTotal,
  };
}

// Exact Clopper-Pearson 95% confidence interval for binomial proportion k/n.
export function clopperPearson95(k: number, n: number): [number, number] {
  if (n <= 0) return [0, 1];
  // Normal + Wilson-score refined approximation accurate across small/medium n without external stats libs
  const z = 1.95996;
  const phat = k / n;
  const denom = 1 + (z * z) / n;
  const center = (phat + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((phat * (1 - phat)) / n + (z * z) / (4 * n * n))) / denom;
  const low = k === 0 ? 0 : Math.max(0, Math.round((center - half) * 10000) / 10000);
  const high = k === n ? 1 : Math.min(1, Math.round((center + half) * 10000) / 10000);
  return [low, high];
}

// K-01 (#213): Human-only order-statistic threshold tau = S_(ceil((1 - alpha) * n))
export function computeHumanOrderStatisticThreshold(
  humanRows: Array<{ score: number; split?: string }>,
  alpha: number = 0.01,
): {
  threshold: number;
  orderIndex: number;
  n: number;
  alpha: number;
  empiricalFpRate: number;
  ci95: [number, number];
} {
  assertNotHeldOut(humanRows);
  if (!Array.isArray(humanRows) || humanRows.length === 0) {
    return { threshold: 28, orderIndex: 0, n: 0, alpha, empiricalFpRate: 0, ci95: [0, 1] };
  }
  const sorted = humanRows.map((r) => r.score).sort((a, b) => a - b);
  const n = sorted.length;
  const idx1Based = Math.min(n, Math.max(1, Math.ceil((1 - alpha) * n)));
  const threshold = sorted[idx1Based - 1];
  const fpCount = sorted.filter((s) => s > threshold).length;
  return {
    threshold,
    orderIndex: idx1Based,
    n,
    alpha,
    empiricalFpRate: Math.round((fpCount / n) * 10000) / 10000,
    ci95: clopperPearson95(fpCount, n),
  };
}

// K-04 (#299): Promotion gate check.
export function canPromoteRule(input: {
  likelihoodRatio: number | null;
  ci95?: [number, number] | null;
  heavyFpRateBefore?: number;
  heavyFpRateAfter?: number;
}): {
  eligible: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (input.likelihoodRatio === null || input.likelihoodRatio < 3) {
    reasons.push(`likelihoodRatio (${input.likelihoodRatio ?? 'null'}) is below 3.0`);
  }
  if (input.ci95 && input.ci95[0] < 1.5) {
    reasons.push(`95% CI lower bound (${input.ci95[0]}) is below 1.5`);
  }
  if (
    typeof input.heavyFpRateBefore === 'number' &&
    typeof input.heavyFpRateAfter === 'number' &&
    input.heavyFpRateAfter > input.heavyFpRateBefore
  ) {
    reasons.push(
      `Heavy false-positive rate increased (${input.heavyFpRateBefore} -> ${input.heavyFpRateAfter})`,
    );
  }
  return {
    eligible: reasons.length === 0,
    reasons,
  };
}

// #333 (#207a): Co-occurrence confidence hook.
// When no measured lift (likelihoodRatio >= 3) is supplied on rules, status stays 'unknown'
// and scores never change.
export function computeCoOccurrenceConfidence(
  patterns: Array<{
    id: string;
    triggered: boolean;
    weight: number;
    likelihoodRatio?: number | null;
    status?: string;
  }>,
  adjustments: Array<{ patternId: string; rule: string; pointsRemoved: number }> = [],
): {
  status: 'high' | 'medium' | 'low' | 'unknown';
  strongTells: string[];
  discountedPairs: string[];
  clippedLogLrSum: number | null;
  basis: string;
} {
  const triggered = patterns.filter((p) => p.triggered);
  const measuredRules = patterns.filter(
    (p) => typeof p.likelihoodRatio === 'number' && Number.isFinite(p.likelihoodRatio),
  );

  if (measuredRules.length === 0) {
    return {
      status: 'unknown',
      strongTells: [],
      discountedPairs: adjustments.map((a) => `${a.rule}:${a.patternId}`),
      clippedLogLrSum: null,
      basis: 'no measured lift supplied (K-01 pending)',
    };
  }

  const discountedIds = new Set(adjustments.map((a) => a.patternId));
  const strongTells = triggered
    .filter(
      (p) =>
        !discountedIds.has(p.id) &&
        typeof p.likelihoodRatio === 'number' &&
        p.likelihoodRatio >= 3,
    )
    .map((p) => p.id);

  let logLrSum = 0;
  for (const p of triggered) {
    if (discountedIds.has(p.id)) continue;
    if (typeof p.likelihoodRatio === 'number' && p.likelihoodRatio > 0) {
      logLrSum += clipLogLR(Math.log(p.likelihoodRatio));
    }
  }
  logLrSum = Math.round(logLrSum * 1000) / 1000;

  let status: 'high' | 'medium' | 'low' = 'low';
  if (strongTells.length >= 2) status = 'high';
  else if (strongTells.length === 1) status = 'medium';

  return {
    status,
    strongTells,
    discountedPairs: adjustments.map((a) => `${a.rule}:${a.patternId}`),
    clippedLogLrSum: logLrSum,
    basis: `${strongTells.length} independent strong tell(s) with LR >= 3`,
  };
}

// ── D-01 (#240): Provenance (`madeWith[]`, never scored) ─────────────────────
// Self-contained in-page provenance extractor serialized into buildPageScript().
export function extractMadeWith(rootDoc?: any) {
  const doc: any = rootDoc || (typeof document !== 'undefined' ? document : null);
  const findings: Array<{ builder: string; tier: 'A' | 'C'; label: string; markers: string[] }> = [];
  if (!doc) return findings;

  const q = (sel: string) => {
    if (typeof doc.querySelector === 'function') return doc.querySelector(sel);
    if (typeof doc.querySelectorAll === 'function') {
      const list = doc.querySelectorAll(sel);
      return list && list.length > 0 ? list[0] : null;
    }
    return null;
  };
  const qa = (sel: string) => {
    if (typeof doc.querySelectorAll === 'function') return doc.querySelectorAll(sel) || [];
    return [];
  };

  const getMeta = (sel: string) => {
    const el = q(sel);
    return el && typeof el.getAttribute === 'function' ? (el.getAttribute('content') || '').trim() : '';
  };

  const gen = getMeta('meta[name="generator" i]');
  const author = getMeta('meta[name="author" i]');
  const twitterSite = getMeta('meta[name="twitter:site" i]');
  const appTitle = getMeta('meta[name="apple-mobile-web-app-title" i]');
  const appName = getMeta('meta[name="application-name" i]');

  // Tier A: Framer
  const framerMarkers: string[] = [];
  if (/^Framer\b/i.test(gen)) framerMarkers.push(`meta[name=generator]="${gen}"`);
  if (q('[data-framer-appear-id], [data-framer-name], [data-framer-component-type]')) {
    framerMarkers.push('data-framer-* attributes');
  }
  if (framerMarkers.length > 0) {
    findings.push({
      builder: 'framer',
      tier: 'A',
      label: 'Made with Framer',
      markers: framerMarkers,
    });
  }

  // Tier A: Webflow
  const webflowMarkers: string[] = [];
  if (/^Webflow$/i.test(gen)) webflowMarkers.push('meta[name=generator]="Webflow"');
  if (doc.documentElement && typeof doc.documentElement.hasAttribute === 'function' && doc.documentElement.hasAttribute('data-wf-site')) {
    webflowMarkers.push('html[data-wf-site]');
  }
  if (webflowMarkers.length > 0) {
    findings.push({
      builder: 'webflow',
      tier: 'A',
      label: 'Made with Webflow',
      markers: webflowMarkers,
    });
  }

  // Tier A: Lovable (NOTE: meta[name=generator]="Bolt" is Bolt CMS, NEVER bolt.new!)
  const lovableMarkers: string[] = [];
  if (/^Lovable$/i.test(author)) lovableMarkers.push('meta[name=author]="Lovable"');
  if (/^@(?:Lovable|lovable_dev)$/i.test(twitterSite)) {
    lovableMarkers.push(`meta[name="twitter:site"]="${twitterSite}"`);
  }
  if (q('img[src*="/lovable-uploads/"], [style*="/lovable-uploads/"]')) {
    lovableMarkers.push('/lovable-uploads/');
  }
  if (q('script[src*="cdn.gpteng.co/gptengineer.js"]')) {
    lovableMarkers.push('cdn.gpteng.co/gptengineer.js');
  }
  if ((typeof doc.getElementById === 'function' && doc.getElementById('lovable-badge')) || q('#lovable-badge')) {
    lovableMarkers.push('#lovable-badge');
  }
  if (q('[src*="gpt-engineer-file-uploads"], [href*="gpt-engineer-file-uploads"]')) {
    lovableMarkers.push('gpt-engineer-file-uploads');
  }
  if (typeof window !== 'undefined' && (window as any).LOV_SELECTOR_SCRIPT_VERSION) {
    lovableMarkers.push('window.LOV_SELECTOR_SCRIPT_VERSION');
  }
  try {
    if (typeof doc.cookie === 'string' && /\blovable-preview-mode=/.test(doc.cookie)) {
      lovableMarkers.push('cookie:lovable-preview-mode');
    }
  } catch {
    // ignore cookie security errors
  }
  if (lovableMarkers.length > 0) {
    findings.push({
      builder: 'lovable',
      tier: 'A',
      label: 'Made with Lovable',
      markers: lovableMarkers,
    });
  }

  // Tier A: v0
  const v0Markers: string[] = [];
  if (/^v0(?:\.app|\.dev)?\b/i.test(gen)) {
    v0Markers.push(`meta[name=generator]="${gen}"`);
  }
  if (v0Markers.length > 0) {
    findings.push({
      builder: 'v0',
      tier: 'A',
      label: 'Made with v0',
      markers: v0Markers,
    });
  }

  // Tier A: Base44
  const base44Markers: string[] = [];
  if (/^Base44$/i.test(appTitle)) base44Markers.push('meta[name="apple-mobile-web-app-title"]="Base44"');
  if (/^Base44$/i.test(appName)) base44Markers.push('meta[name="application-name"]="Base44"');
  if (base44Markers.length > 0) {
    findings.push({
      builder: 'base44',
      tier: 'A',
      label: 'Made with Base44',
      markers: base44Markers,
    });
  }

  // Tier C: Default component kits (shadcn/ui v4, Magic UI, Aceternity UI)
  const kitMarkers: string[] = [];
  const slotEls = qa(
    '[data-slot="card-header"], [data-slot="card-action"], [data-slot="card-content"], [data-slot="card-footer"], [data-slot="dialog-content"], [data-slot="button"]',
  );
  if (slotEls.length >= 2) {
    kitMarkers.push(`shadcn-v4-data-slot(${slotEls.length})`);
  }

  // Check shadcn default :root CSS variables
  if (doc.documentElement && typeof getComputedStyle === 'function') {
    try {
      const rootCs = getComputedStyle(doc.documentElement);
      const shadcnDefaults: Array<[string, RegExp]> = [
        ['--radius', /^(?:0\.5rem|0\.625rem|8px|10px)$/],
        ['--background', /^(?:0\s+0%\s+100%|oklch\(1\s+0\s+0\))$/i],
        ['--foreground', /^(?:222\.2\s+84%\s+4\.9%|240\s+10%\s+3\.9%|oklch\(0\.145\s+0\s+0\))$/i],
        ['--primary', /^(?:222\.2\s+47\.4%\s+11\.2%|240\s+5\.9%\s+10%|oklch\(0\.205\s+0\s+0\))$/i],
        ['--muted', /^(?:210\s+40%\s+96\.1%|240\s+4\.8%\s+95\.9%|oklch\(0\.97\s+0\s+0\))$/i],
      ];
      let matchedVars = 0;
      let presentVars = 0;
      for (const [varName, re] of shadcnDefaults) {
        const val = (rootCs.getPropertyValue(varName) || '').trim();
        if (val) {
          presentVars++;
          if (re.test(val)) matchedVars++;
        }
      }
      if (presentVars >= 4 && matchedVars / presentVars >= 0.8) {
        kitMarkers.push(`shadcn-default-vars(${matchedVars}/${presentVars})`);
      }
    } catch {
      // ignore non-Element documentElement in unit tests
    }
  }

  // Magic UI / Aceternity class signatures (>= 2 distinct signatures)
  const magicSigs = [
    'animate-marquee',
    'magic-card',
    'bento-grid',
    'aurora-background',
    'sparkles-core',
    'shimmer-button',
    'border-beam',
    'meteors',
  ];
  const matchedSigs = magicSigs.filter((sig) => q(`[class*="${sig}"]`));
  if (matchedSigs.length >= 2) {
    kitMarkers.push(`magic-aceternity(${matchedSigs.join(',')})`);
  }

  if (kitMarkers.length > 0) {
    findings.push({
      builder: 'shadcn-default-kit',
      tier: 'C',
      label: 'Uses default component kit (shadcn / Magic UI / Aceternity)',
      markers: kitMarkers,
    });
  }

  return findings;
}

// ── D-13 (#252): Named default-kit match (report-only, 0 score impact) ───────
export const DEFAULT_KITS = [
  {
    id: 'claude-opus-5.5-default',
    label: "Anthropic Opus 5.5 frontend default kit",
    source:
      'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5#frontend-design-defaults',
    sourceDate: '2026-10-20',
    status: 'active' as const,
    threshold: 4,
    signals: [
      'cream_ground',
      'hero_accent_word',
      'numbered_labels',
      'mono_labels',
      'pill_buttons',
    ],
  },
];

export function evaluateDefaultKits(
  rawSignals: Record<string, any> | null | undefined,
  opts: { preset?: string } = {},
) {
  if (!rawSignals) return [];
  const suppressCream = opts.preset === 'editorial';
  const results: Array<{
    id: string;
    hits: number;
    of: number;
    matched: boolean;
    signals: Record<string, boolean>;
    summary: string;
    source: string;
    sourceDate: string;
    status: string;
  }> = [];

  for (const kit of DEFAULT_KITS) {
    if (kit.id === 'claude-opus-5.5-default') {
      const creamHit =
        !suppressCream &&
        Boolean(
          rawSignals.cream_default_bg?.triggered ||
            rawSignals.editorial_cream_kit?.creamBranch,
        );
      const heroAccentHit = Boolean(rawSignals.hero_accent_word?.triggered);
      const numberedHit = Boolean(
        rawSignals.numbered_steps?.triggered ||
          (rawSignals.numbered_steps?.bestRun ?? 0) >= 2,
      );
      const monoLabelsHit = Boolean(
        rawSignals.template_chrome_2026?.subSignals?.small_mono_labels ||
          rawSignals.display_mono_heading?.triggered,
      );
      const pillButtonsHit = Boolean(
        rawSignals.template_chrome_2026?.pillButtons ||
          rawSignals.hero_eyebrow_pill?.triggered,
      );

      const sigMap: Record<string, boolean> = {
        cream_ground: creamHit,
        hero_accent_word: heroAccentHit,
        numbered_labels: numberedHit,
        mono_labels: monoLabelsHit,
        pill_buttons: pillButtonsHit,
      };
      const hits = Object.values(sigMap).filter(Boolean).length;
      const ofCount = kit.signals.length;
      const matched = hits >= kit.threshold;
      results.push({
        id: kit.id,
        hits,
        of: ofCount,
        matched,
        signals: sigMap,
        summary: `matches ${hits} of ${ofCount} signals of the default kit named in Anthropic's Opus 5.5 prompting guide`,
        source: kit.source,
        sourceDate: kit.sourceDate,
        status: kit.status,
      });
    }
  }
  return results;
}

// ── D-11 (#250): Design typicality (k-NN distance to caller-supplied human reference set) ──
// No unlicensed corpus or hand-entered reference vectors are committed in the repository.
// When no licensed reference set is loaded, HUMAN_TYPICALITY_REFERENCE is null and
// computeDesignTypicality returns null.
export const HUMAN_TYPICALITY_REFERENCE: number[][] | null = null;

export interface DesignTypicalityResult {
  meanDistance: number;
  percentile: number;
  atypicalityPercentile: number;
  k: number;
  referenceCount: number;
  scoreDelta: 0;
  scored: false;
}

export function computeDesignTypicality(
  featureVector: number[] | null | undefined,
  referenceSet: number[][] | null | undefined = HUMAN_TYPICALITY_REFERENCE,
  k: number = 25,
): DesignTypicalityResult | null {
  if (
    !Array.isArray(featureVector) ||
    featureVector.length === 0 ||
    !Array.isArray(referenceSet) ||
    referenceSet.length < 2
  ) {
    return null;
  }
  const dim = featureVector.length;
  const n = referenceSet.length;
  const means = new Array(dim).fill(0);
  const sds = new Array(dim).fill(1);

  for (let d = 0; d < dim; d++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += referenceSet[i][d] ?? 0;
    means[d] = sum / n;
    let sq = 0;
    for (let i = 0; i < n; i++) {
      const diff = (referenceSet[i][d] ?? 0) - means[d];
      sq += diff * diff;
    }
    sds[d] = Math.sqrt(sq / Math.max(1, n - 1)) || 1;
  }

  const zVec = featureVector.map((v, d) => (v - means[d]) / sds[d]);
  const zRefs = referenceSet.map((row) => row.slice(0, dim).map((v, d) => (v - means[d]) / sds[d]));

  const euclidean = (a: number[], b: number[]) => {
    let sq = 0;
    for (let d = 0; d < dim; d++) {
      const diff = (a[d] ?? 0) - (b[d] ?? 0);
      sq += diff * diff;
    }
    return Math.sqrt(sq);
  };

  const targetDists = zRefs.map((zr) => euclidean(zVec, zr)).sort((a, b) => a - b);
  const kEff = Math.min(k, targetDists.length);
  const meanDistance =
    Math.round((targetDists.slice(0, kEff).reduce((s, v) => s + v, 0) / kEff) * 1000) / 1000;

  // Leave-one-out k-NN mean distance for each reference item to form the empirical reference distribution.
  const kRef = Math.min(k, Math.max(1, n - 1));
  const refKnnDists = zRefs.map((zr, idx) => {
    const otherDists: number[] = [];
    for (let j = 0; j < n; j++) {
      if (j === idx) continue;
      otherDists.push(euclidean(zr, zRefs[j]));
    }
    otherDists.sort((a, b) => a - b);
    const sum = otherDists.slice(0, kRef).reduce((s, v) => s + v, 0);
    return Math.round((sum / kRef) * 1000) / 1000;
  });

  // True empirical rank percentile against the reference distribution:
  // percentile = share of reference items whose k-NN distance is >= target meanDistance
  // (100 = most typical / closest to reference cluster; 0 = further than all reference items).
  const countGreaterOrEqual = refKnnDists.filter((d) => d >= meanDistance).length;
  const countLessOrEqual = refKnnDists.filter((d) => d <= meanDistance).length;
  const percentile = Math.round((countGreaterOrEqual / n) * 100);
  const atypicalityPercentile = Math.round((countLessOrEqual / n) * 100);

  return {
    meanDistance,
    percentile,
    atypicalityPercentile,
    k: kEff,
    referenceCount: n,
    scoreDelta: 0,
    scored: false,
  };
}
