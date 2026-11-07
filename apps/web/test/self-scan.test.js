import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFINITIONS_VERSION } from '@slop-detect/core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SELF_SCAN_PATH = path.join(HERE, '..', 'public', 'self-scan.json');
const LANDING_PATH = path.join(HERE, '..', 'public', 'index.html');

describe('Self-scan dogfood audit (FIX-17 #236, K-05 #300)', () => {
  it('ships a live 5-axis self-scan artifact at /self-scan.json scoring Clean across all axes', () => {
    expect(fs.existsSync(SELF_SCAN_PATH)).toBe(true);
    const selfScan = JSON.parse(fs.readFileSync(SELF_SCAN_PATH, 'utf8'));
    expect(selfScan.url).toBe('https://slop-detect.com/');
    expect(selfScan.definitionsVersion).toBe(DEFINITIONS_VERSION);
    expect(selfScan.score).toBeLessThanOrEqual(9);
    expect(selfScan.tier).toBe('Clean');
    expect(selfScan.axes?.copy?.score).toBe(0);
    expect(selfScan.axes?.copy?.tier).toBe('Clean');
    expect(selfScan.axes?.craft?.score).toBeGreaterThanOrEqual(90);
    expect(selfScan.system?.tier).toBe('Aligned');
    expect(selfScan.system?.score).toBeGreaterThanOrEqual(80);
    expect(selfScan.aeo?.tier).toBe('Eligible');
    expect(selfScan.aeo?.score).toBeGreaterThanOrEqual(80);
  });

  it('links to /self-scan.json from index.html and includes aria-live on #flash', () => {
    const html = fs.readFileSync(LANDING_PATH, 'utf8');
    expect(html).toContain('href="/self-scan.json"');
    expect(html).toMatch(/id="flash"[^>]*role="status"[^>]*aria-live="polite"/);
  });
});
