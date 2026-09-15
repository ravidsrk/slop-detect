// Parity guard for the shared page-script assembler + detectBlocked heuristics.
// Both runners import these from @slop-detect/core; if either runner's wiring or
// the shared implementation drifts, this snapshot + unit suite fails.

import { test, expect, describe } from 'vitest';
import { buildPageScript, esbuildNamePolyfills, detectBlocked, PATTERNS } from '@slop-detect/core';

// ── buildPageScript snapshots ────────────────────────────────────────────────
test('buildPageScript default (design + copy, no system axis)', () => {
  const script = buildPageScript();
  expect(script).toMatchSnapshot();
  // Structural invariants both runners rely on.
  expect(script.startsWith('(() => {')).toBe(true);
  expect(script.endsWith('})();')).toBe(true);
  // Every esbuild __name helper referenced by serialized extractors must be
  // declared (bundlers dedup the name: __name in prod, __name2 in dev — T-40).
  for (const ref of script.match(/\b__name\d*\b/g) ?? []) {
    expect(script).toContain(`const ${ref} = (fn) => fn;`);
  }
  expect(script).toContain('const ctx = {');
  expect(script).toContain('extractTextContext');
  expect(script).not.toContain('extractSystemContext');
  for (const p of PATTERNS) {
    expect(script).toContain(`signals[${JSON.stringify(p.id)}]`);
  }
});

// ── esbuildNamePolyfills (T-40: `wrangler pages dev` broke scans) ────────────
describe('esbuildNamePolyfills', () => {
  test('derives every deduplicated helper name from bundled source', () => {
    const bundled =
      'var x = __name2((c) => c.a, "x"); var y = __name((c) => c.b, "y"); var z = __name2((c) => c.c, "z");';
    const out = esbuildNamePolyfills(bundled);
    expect(out).toContain('const __name = (fn) => fn;');
    expect(out).toContain('const __name2 = (fn) => fn;');
    // Deduped: one declaration per name even when referenced twice.
    expect(out.match(/const __name2 = /g)).toHaveLength(1);
  });

  test('emits nothing when the source references no helpers', () => {
    expect(esbuildNamePolyfills('(() => { return 1; })();')).toBe('');
  });
});

test('buildPageScript with includeSystem injects system axis extractor', () => {
  const script = buildPageScript({ includeSystem: true });
  expect(script).toMatchSnapshot();
  expect(script).toContain('extractSystemContext');
});

// ── detectBlocked heuristics ─────────────────────────────────────────────────
describe('detectBlocked', () => {
  const richSignals = Object.fromEntries(
    PATTERNS.slice(0, 4).map((p) => [p.id, { triggered: false, count: 1 }])
  );

  const healthyPage = {
    title: 'Acme — Build faster',
    h1Text: 'Ship without the slop',
    visibleCount: 120,
    signals: richSignals,
  };

  test('returns null for a normally-rendered marketing page', () => {
    expect(detectBlocked(healthyPage)).toBeNull();
    expect(
      detectBlocked(healthyPage, { url: 'https://acme.test', finalUrl: 'https://acme.test' })
    ).toBeNull();
  });

  test('flags Cloudflare challenge interstitials', () => {
    const blocked = detectBlocked({ ...healthyPage, title: 'Just a moment...' });
    expect(blocked?.code).toBe('cloudflare_challenge');
    expect(blocked?.reason).toMatch(/Cloudflare bot challenge/);
  });

  test('flags access-denied titles on sparse pages', () => {
    const blocked = detectBlocked({
      title: 'Access Denied',
      h1Text: '',
      visibleCount: 5,
      signals: {},
    });
    expect(blocked?.code).toBe('access_blocked');
  });

  test('does not flag access-denied titles when the page has plenty of content', () => {
    expect(
      detectBlocked({
        ...healthyPage,
        title: 'Access Denied — staging preview',
        visibleCount: 50,
      })
    ).toBeNull();
  });

  test('flags empty pages with no title or h1', () => {
    const blocked = detectBlocked({ title: '', h1Text: '', visibleCount: 0, signals: {} });
    expect(blocked?.code).toBe('empty_page');
  });

  test('flags sparse DOM when fewer than 4 patterns return evidence', () => {
    const blocked = detectBlocked({
      title: 'Hello',
      h1Text: 'World',
      visibleCount: 50,
      signals: { one: { triggered: false, n: 1 } },
    });
    expect(blocked?.code).toBe('empty_page');
  });

  test('flags sparse DOM when visible element count is below 10', () => {
    const blocked = detectBlocked({
      title: 'Hello',
      h1Text: 'World',
      visibleCount: 3,
      signals: richSignals,
    });
    expect(blocked?.code).toBe('empty_page');
  });

  test('sparse-but-titled pages get an honest reason, not "no title, no H1" (T-14)', () => {
    const blocked = detectBlocked({
      title: 'Example Domain',
      h1Text: 'Example Domain',
      visibleCount: 4,
      signals: richSignals,
    });
    expect(blocked?.code).toBe('empty_page');
    expect(blocked.reason).toMatch(/too little content/);
    expect(blocked.reason).not.toMatch(/no title/);
    const blank = detectBlocked({ title: '', h1Text: '', visibleCount: 0, signals: {} });
    expect(blank.reason).toMatch(/no title, no H1/);
  });

  test('dense-but-uncharacterizable pages are not called "sparse" (T-14)', () => {
    const blocked = detectBlocked({
      title: 'Hello',
      h1Text: 'World',
      visibleCount: 50,
      signals: { one: { triggered: false, n: 1 } },
    });
    expect(blocked?.code).toBe('empty_page');
    expect(blocked.reason).toMatch(/could not characterize/);
    expect(blocked.reason).not.toMatch(/sparse/i);
  });
});
