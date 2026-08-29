// Serialization-safety guard for the TypeScript build.
//
// The design patterns' `extract()` functions are stringified with .toString()
// and executed INSIDE the headless browser (see packages/cli/src/detector.ts and
// apps/web/functions/api/scan.ts). That only works if the compiled output is
// plain, self-contained browser JS — if tsc ever started injecting runtime
// helpers (tslib __awaiter/__spreadArray/…) into a function body, the serialized
// code would reference an undefined helper and blow up in the page.
//
// This imports the BUILT package (dist, what consumers serialize) and asserts no
// helper markers leak into any detector. It's the tripwire for the compiler
// settings in tsconfig.base.json (target ES2022, importHelpers:false).
import { test, expect } from 'vitest';
import { PATTERNS } from '@slop-detect/core';

const HELPER_MARKERS =
  /\b(__awaiter|__generator|__spreadArray|__assign|__rest|__importDefault|__importStar|tslib)\b/;

test('design detectors compile to helper-free, serializable browser JS', () => {
  expect(PATTERNS.length > 0).toBeTruthy();
  for (const p of PATTERNS) {
    expect(typeof p.extract).toBe('function');
    const src = p.extract.toString();
    expect(HELPER_MARKERS.test(src)).toBe(false);
    // A serialized helper would also drop type-erased casts; sanity-check the
    // body is real source, not a stub.
    expect(src.length > 20).toBeTruthy();
  }
});
