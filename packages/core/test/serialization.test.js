// Serialization-safety guard for the TypeScript build.
//
// The design patterns' `extract()` functions are stringified with .toString()
// and executed INSIDE the headless browser (see packages/cli/src/detector.js and
// packages/web/functions/api/scan.js). That only works if the compiled output is
// plain, self-contained browser JS — if tsc ever started injecting runtime
// helpers (tslib __awaiter/__spreadArray/…) into a function body, the serialized
// code would reference an undefined helper and blow up in the page.
//
// This imports the BUILT package (dist, what consumers serialize) and asserts no
// helper markers leak into any detector. It's the tripwire for the compiler
// settings in tsconfig.base.json (target ES2022, importHelpers:false).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PATTERNS } from 'slop-detect-core';

const HELPER_MARKERS =
  /\b(__awaiter|__generator|__spreadArray|__assign|__rest|__importDefault|__importStar|tslib)\b/;

test('design detectors compile to helper-free, serializable browser JS', () => {
  assert.ok(PATTERNS.length > 0, 'expected PATTERNS to be non-empty');
  for (const p of PATTERNS) {
    assert.equal(typeof p.extract, 'function', `pattern ${p.id} is missing extract()`);
    const src = p.extract.toString();
    assert.ok(
      !HELPER_MARKERS.test(src),
      `pattern "${p.id}" serializes with an injected TS helper — it will fail inside page.evaluate():\n${src.slice(0, 160)}`
    );
    // A serialized helper would also drop type-erased casts; sanity-check the
    // body is real source, not a stub.
    assert.ok(src.length > 20, `pattern "${p.id}" extract() body looks empty`);
  }
});
