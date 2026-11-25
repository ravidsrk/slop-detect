import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { DEFINITIONS_VERSION } from '@slop-detect/core';
import {
  detectVerifyTarget,
  findProjectDesignMd,
  formatDoctorReport,
  runDoctor,
} from '../src/doctor.ts';

const temps = [];
function makeTmp() {
  const dir = mkdtempSync(join(tmpdir(), 'slop-doctor-'));
  temps.push(dir);
  return dir;
}

afterEach(() => {
  while (temps.length) {
    const dir = temps.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe('slop-detect doctor & verify helpers', () => {
  it('detects valid DESIGN.md, .sloprc.json, MCP config, and matching baseline', () => {
    const dir = makeTmp();
    writeFileSync(
      join(dir, 'DESIGN.md'),
      `---\nspecVersion: "alpha"\nname: "Demo"\ncolors:\n  surface: "#F4F5F2"\n  ink: "#181815"\n  accent: "#1FA85E"\ntypography:\n  display: "Newsreader"\n  body: "Libre Franklin"\n---\n# Demo\n`
    );
    writeFileSync(join(dir, '.sloprc.json'), JSON.stringify({ preset: 'full' }));
    writeFileSync(join(dir, '.mcp.json'), JSON.stringify({ mcpServers: {} }));
    mkdirSync(join(dir, '.slop'), { recursive: true });
    writeFileSync(join(dir, '.slop', 'local-url'), 'http://127.0.0.1:4321/\n');
    writeFileSync(
      join(dir, '.slop', 'baseline.json'),
      JSON.stringify({ score: 4, definitionsVersion: DEFINITIONS_VERSION })
    );

    expect(findProjectDesignMd(dir)).toBe('DESIGN.md');
    expect(detectVerifyTarget(dir)).toBe('http://127.0.0.1:4321/');

    const report = runDoctor(dir);
    expect(report.definitionsVersion).toBe(DEFINITIONS_VERSION);
    expect(report.checks.find((c) => c.id === 'system.design_md')?.status).toBe('pass');
    expect(report.checks.find((c) => c.id === 'config.sloprc')?.status).toBe('pass');
    expect(report.checks.find((c) => c.id === 'agent.integration')?.status).toBe('pass');
    expect(report.checks.find((c) => c.id === 'baseline.ratchet')?.status).toBe('pass');

    const formatted = formatDoctorReport(report);
    expect(formatted).toContain('slop-detect doctor');
    expect(formatted).toContain('DESIGN.md contract');
  });

  it('flags broken .sloprc.json and stale baseline definitionsVersion', () => {
    const dir = makeTmp();
    writeFileSync(join(dir, '.sloprc.json'), '{not-valid-json');
    mkdirSync(join(dir, '.slop'), { recursive: true });
    writeFileSync(
      join(dir, '.slop', 'baseline.json'),
      JSON.stringify({ score: 8, definitionsVersion: '2025.01' })
    );

    const report = runDoctor(dir);
    expect(report.ok).toBe(false);
    expect(report.checks.find((c) => c.id === 'config.sloprc')?.status).toBe('fail');
    expect(report.checks.find((c) => c.id === 'baseline.ratchet')?.status).toBe('warn');
  });
});
