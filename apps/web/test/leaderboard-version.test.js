// FIX-02 (#222): guard against definitionsVersion drift between the engine
// (@slop-detect/core DEFINITIONS_VERSION) and the committed leaderboard dataset
// (apps/web/public/leaderboard.json).

import { test, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFINITIONS_VERSION } from '@slop-detect/core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LEADERBOARD_PATH = path.join(HERE, '..', 'public', 'leaderboard.json');

test('leaderboard.json records the definitions version its rows were scored under', () => {
  const leaderboard = JSON.parse(fs.readFileSync(LEADERBOARD_PATH, 'utf8'));
  expect(typeof DEFINITIONS_VERSION).toBe('string');
  expect(DEFINITIONS_VERSION.length).toBeGreaterThan(0);
  // Rows were measured under 2026.10. A later engine bump must not relabel
  // those scores. Re-score the corpus before setting rescored to true.
  expect(leaderboard.definitionsVersion).toBe('2026.10');
  expect(leaderboard.measuredDefinitionsVersion).toBe(leaderboard.definitionsVersion);
  expect(leaderboard.rescored).toBe(false);
});

test('leaderboard.json stores triggered rule ids for the prevalence table', () => {
  const leaderboard = JSON.parse(fs.readFileSync(LEADERBOARD_PATH, 'utf8'));
  const scored = (leaderboard.sites || []).filter((s) => s.scored);
  expect(scored.length).toBeGreaterThan(0);
  const fromSites = {};
  for (const site of scored) {
    expect(Array.isArray(site.flaggedPatterns)).toBe(true);
    expect(site.flaggedPatterns.length).toBe(site.patternsFlagged);
    for (const id of site.flaggedPatterns) {
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      fromSites[id] = (fromSites[id] || 0) + 1;
    }
  }
  expect(leaderboard.patternPrevalence).toEqual(fromSites);
  expect(Object.keys(fromSites).length).toBeGreaterThan(0);
});
