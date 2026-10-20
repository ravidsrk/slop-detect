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

test('leaderboard.json definitionsVersion matches engine DEFINITIONS_VERSION', () => {
  const leaderboard = JSON.parse(fs.readFileSync(LEADERBOARD_PATH, 'utf8'));
  expect(typeof DEFINITIONS_VERSION).toBe('string');
  expect(DEFINITIONS_VERSION.length).toBeGreaterThan(0);
  expect(leaderboard.definitionsVersion).toBe(DEFINITIONS_VERSION);
});
