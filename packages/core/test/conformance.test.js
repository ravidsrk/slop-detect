// V1-00 (#331) — Cross-Surface Conformance Suite
//
// Verifies that `spec/conformance.json`, `schemas/scan-result.v1.json`,
// `spec/patterns.md`, `spec/aeo.md`, and the K-01/K-07/K-09/#201 calibration
// artifacts stay in lockstep with `@slop-detect/core`.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  PATTERNS,
  COPY_PATTERNS,
  CRAFT_CHECKS,
  AEO_CHECKS,
  SYSTEM_CHECKS,
  DEFINITIONS_VERSION,
  SCAN_SCHEMA_VERSION,
  scorePatterns,
  parseDesignMd,
  applyDesignSystemWaivers,
  stampScanResult,
} from '@slop-detect/core';
import {
  computeTimeAndNumberAnchors,
  evaluateCraftCovariateReport,
} from '../../cli/calibration/craft-covariate.mjs';
import { computeMonroeLogOdds } from '../../cli/calibration/log-odds.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const conformance = JSON.parse(readFileSync(resolve(ROOT, 'spec/conformance.json'), 'utf8'));
const scanSchema = JSON.parse(readFileSync(resolve(ROOT, 'schemas/scan-result.v1.json'), 'utf8'));
const promptPanel = JSON.parse(
  readFileSync(resolve(ROOT, 'packages/cli/calibration/prompt-panel.json'), 'utf8')
);

describe('V1-00 (#331) Cross-Surface Conformance Suite', () => {
  it('matches DEFINITIONS_VERSION, SCAN_SCHEMA_VERSION, and catalogue counts', () => {
    expect(conformance.definitionsVersion).toBe(DEFINITIONS_VERSION);
    expect(conformance.scanSchemaVersion).toBe(SCAN_SCHEMA_VERSION);
    expect(conformance.counts.designPatterns).toBe(PATTERNS.length);
    expect(conformance.counts.copyPatterns).toBe(COPY_PATTERNS.length);
    expect(conformance.counts.craftChecks).toBe(CRAFT_CHECKS.length);
    expect(conformance.counts.aeoChecks).toBe(AEO_CHECKS.length);
    expect(conformance.counts.systemChecks).toBe(SYSTEM_CHECKS.length);
  });

  for (const vec of conformance.vectors) {
    it(`evaluates conformance vector "${vec.id}" deterministically`, () => {
      const scored = scorePatterns(vec.patterns);
      const stamped = stampScanResult({ ...scored, patterns: vec.patterns });

      const expectedSchemaVersion =
        scanSchema.properties?.schemaVersion?.const ??
        scanSchema.$defs?.scoredScanResult?.properties?.schemaVersion?.const ??
        SCAN_SCHEMA_VERSION;
      expect(stamped.schemaVersion).toBe(expectedSchemaVersion);
      expect(stamped.definitionsVersion).toBe(DEFINITIONS_VERSION);

      // K-11 key ordering: evidence precedes score
      const keys = Object.keys(scored);
      expect(keys.indexOf('evidence')).toBeLessThan(keys.indexOf('score'));

      if (vec.designMd) {
        const parsed = parseDesignMd(vec.designMd);
        expect(parsed).not.toBeNull();
        const waived = applyDesignSystemWaivers({ ...scored, patterns: vec.patterns }, parsed);
        expect(waived.rawScore).toBe(vec.expected.rawScore);
        expect(waived.rawTier).toBe(vec.expected.rawTier);
        expect(waived.score).toBe(vec.expected.score);
        expect(waived.tier).toBe(vec.expected.tier);
        expect(waived.waivedPatterns.map((w) => w.id)).toEqual(vec.expected.waivedPatternIds);
      } else {
        expect(scored.score).toBe(vec.expected.score);
        expect(scored.tier).toBe(vec.expected.tier);
        expect(scored.patternsFlagged).toBe(vec.expected.patternsFlagged);
        expect(scored.patternsScored).toBe(vec.expected.patternsScored);
        if (typeof vec.expected.reviewCount === 'number') {
          expect(scored.reviewCount).toBe(vec.expected.reviewCount);
        }
        expect(scored.adjustments.map((a) => a.ruleId)).toEqual(vec.expected.adjustmentRuleIds);
      }
    });
  }

  it('validates K-09 prompt-panel.json (40 prompts = 8 verticals x 5 styles)', () => {
    expect(promptPanel.definitionsVersion).toBe(DEFINITIONS_VERSION);
    expect(promptPanel.verticals.length).toBe(8);
    expect(promptPanel.promptStyles.length).toBe(5);
    expect(promptPanel.prompts.length).toBe(40);
    expect(promptPanel.tellHalfLifeTable.length).toBeGreaterThanOrEqual(8);

    const byVertical = new Map();
    const byStyle = new Map();
    for (const p of promptPanel.prompts) {
      byVertical.set(p.vertical, (byVertical.get(p.vertical) || 0) + 1);
      byStyle.set(p.style, (byStyle.get(p.style) || 0) + 1);
    }
    for (const v of promptPanel.verticals) {
      expect(byVertical.get(v.id)).toBe(5);
    }
    for (const s of promptPanel.promptStyles) {
      expect(byStyle.get(s.id)).toBe(8);
    }
  });

  it('validates K-07 offline time_and_number_anchors covariate and #201 Monroe log-odds', () => {
    const specific = computeTimeAndNumberAnchors(
      'Released 2026-03-15 in v2.14.0 with 14ms p99 latency at $18/month.'
    );
    const vague = computeTimeAndNumberAnchors(
      'Supercharge your workflow with our seamless next-generation platform.'
    );
    expect(specific.offlineOnly).toBe(true);
    expect(specific.totalAnchors).toBeGreaterThanOrEqual(4);
    expect(vague.totalAnchors).toBe(0);
    expect(specific.specificityIndex).toBeGreaterThan(vague.specificityIndex);

    const covReport = evaluateCraftCovariateReport([
      {
        url: 'https://a.example',
        stratum: 'a',
        designScore: 2,
        copyScore: 0,
        text: 'v1.2.0 14ms $19 2026-01-10',
      },
      {
        url: 'https://b.example',
        stratum: 'b',
        designScore: 38,
        copyScore: 22,
        text: 'Seamless effortless journey',
      },
    ]);
    expect(covReport.correlations.designScore_vs_specificityIndex_rho).toBe(-1);

    const logOdds = computeMonroeLogOdds(
      ['Supercharge your seamless workflow today', 'Seamless workflow for modern teams'],
      ['14ms p99 latency in v2.14.0 release', 'SHA-256 signature verification in C99']
    );
    expect(logOdds.topOverrepresentedInTarget[0].zScore).toBeGreaterThan(0);
  });
});
