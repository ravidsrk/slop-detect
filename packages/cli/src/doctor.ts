// Local setup diagnostics (`slop-detect doctor`) and target auto-detection for
// `slop-detect verify`. Read-only checks over the project directory + Playwright
// runtime so humans and coding agents can confirm their loop works in <1 second.

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { DEFINITIONS_VERSION, lintDesignMd, parseSlopRc } from '@slop-detect/core';
import { detectLocalUrl } from './init-project.js';

export type DoctorStatus = 'pass' | 'warn' | 'fail';

export interface DoctorCheck {
  id: string;
  label: string;
  status: DoctorStatus;
  detail: string;
  fix?: string;
}

export interface DoctorReport {
  ok: boolean;
  cwd: string;
  definitionsVersion: string;
  nodeVersion: string;
  checks: DoctorCheck[];
}

export function findProjectDesignMd(cwd: string): string | null {
  const candidates = ['DESIGN.md', 'public/DESIGN.md', 'docs/DESIGN.md'];
  for (const rel of candidates) {
    const abs = join(cwd, rel);
    if (existsSync(abs)) return rel;
  }
  return null;
}

export function detectVerifyTarget(cwd: string): string | null {
  const envUrl = String(process.env.SLOP_LOCAL_URL || '').trim();
  if (envUrl) return envUrl;
  const localUrlFile = join(cwd, '.slop', 'local-url');
  if (existsSync(localUrlFile)) {
    try {
      const text = readFileSync(localUrlFile, 'utf8').trim();
      if (text) return text;
    } catch {
      // fall through
    }
  }
  return detectLocalUrl(cwd);
}

export function runDoctor(cwd: string = process.cwd()): DoctorReport {
  const root = resolve(cwd);
  const checks: DoctorCheck[] = [];

  // 1. Node runtime
  const major = Number(process.versions.node.split('.')[0] || 0);
  checks.push({
    id: 'runtime.node',
    label: 'Node.js runtime',
    status: major >= 20 ? 'pass' : 'fail',
    detail: `Node ${process.version} (definitions ${DEFINITIONS_VERSION})`,
    ...(major < 20 ? { fix: 'Upgrade to Node.js >= 20.0.0.' } : {}),
  });

  // 2. Headless Chromium
  let execPath = '';
  let chromiumFound = false;
  try {
    execPath = chromium.executablePath();
    chromiumFound = Boolean(execPath && existsSync(execPath));
  } catch {
    chromiumFound = false;
  }
  checks.push({
    id: 'runtime.chromium',
    label: 'Playwright Chromium',
    status: chromiumFound ? 'pass' : 'fail',
    detail: chromiumFound ? `installed (${execPath})` : 'Chromium binary not installed',
    ...(chromiumFound ? {} : { fix: 'Run: npx playwright@1.65.0 install chromium' }),
  });

  // 3. DESIGN.md contract
  const designMdRel = findProjectDesignMd(root);
  if (designMdRel) {
    try {
      const lint = lintDesignMd(readFileSync(join(root, designMdRel), 'utf8'));
      checks.push({
        id: 'system.design_md',
        label: 'DESIGN.md contract',
        status: lint.valid ? (lint.warnings.length ? 'warn' : 'pass') : 'fail',
        detail: `${designMdRel}: ${lint.valid ? 'valid' : 'invalid'} (${lint.errors.length} errors, ${lint.warnings.length} warnings)`,
        ...(!lint.valid
          ? { fix: `Fix lint errors: npx slop-detect --lint-design-md ${designMdRel}` }
          : {}),
      });
    } catch (err: any) {
      checks.push({
        id: 'system.design_md',
        label: 'DESIGN.md contract',
        status: 'fail',
        detail: `${designMdRel}: could not read (${err?.message || err})`,
      });
    }
  } else {
    checks.push({
      id: 'system.design_md',
      label: 'DESIGN.md contract',
      status: 'warn',
      detail: 'No DESIGN.md found in project root or public/',
      fix: 'Bootstrap one from your live page: npx slop-detect <url> --init-design-md > DESIGN.md',
    });
  }

  // 4. .sloprc.json
  const slopRcPath = join(root, '.sloprc.json');
  if (existsSync(slopRcPath)) {
    try {
      parseSlopRc(readFileSync(slopRcPath, 'utf8'));
      checks.push({
        id: 'config.sloprc',
        label: '.sloprc.json',
        status: 'pass',
        detail: 'valid project configuration',
      });
    } catch (err: any) {
      checks.push({
        id: 'config.sloprc',
        label: '.sloprc.json',
        status: 'fail',
        detail: `invalid JSON/schema: ${err?.message || err}`,
        fix: 'Fix syntax or invalid keys in .sloprc.json.',
      });
    }
  } else {
    checks.push({
      id: 'config.sloprc',
      label: '.sloprc.json',
      status: 'pass',
      detail: 'not present (using defaults)',
    });
  }

  // 5. Agent MCP + Hooks integration
  const agentFiles = [
    '.mcp.json',
    '.cursor/mcp.json',
    '.claude/settings.json',
    '.github/hooks/slop-detect.json',
    '.slop/local-url',
  ].filter((rel) => existsSync(join(root, rel)));
  const detectedUrl = detectVerifyTarget(root);
  checks.push({
    id: 'agent.integration',
    label: 'Coding-agent integration',
    status: agentFiles.length > 0 ? 'pass' : 'warn',
    detail:
      agentFiles.length > 0
        ? `configured (${agentFiles.join(', ')})${detectedUrl ? ` · target ${detectedUrl}` : ''}`
        : `no MCP or hook files found${detectedUrl ? ` · detected dev URL ${detectedUrl}` : ''}`,
    ...(agentFiles.length === 0 ? { fix: 'Run: npx slop-detect init' } : {}),
  });

  // 6. Baseline ratchet
  const baselinePath = join(root, '.slop', 'baseline.json');
  if (existsSync(baselinePath)) {
    try {
      const base = JSON.parse(readFileSync(baselinePath, 'utf8'));
      const ver = base?.definitionsVersion;
      const matches = ver === DEFINITIONS_VERSION;
      checks.push({
        id: 'baseline.ratchet',
        label: 'Regression baseline',
        status: matches ? 'pass' : 'warn',
        detail: matches
          ? `.slop/baseline.json (score ${base.score ?? '?'}, defs ${ver})`
          : `.slop/baseline.json uses defs ${ver || 'unknown'} (current: ${DEFINITIONS_VERSION})`,
        ...(!matches
          ? { fix: 'Re-record baseline: npx slop-detect <url> --save-baseline .slop/baseline.json' }
          : {}),
      });
    } catch (err: any) {
      checks.push({
        id: 'baseline.ratchet',
        label: 'Regression baseline',
        status: 'fail',
        detail: `.slop/baseline.json is unreadable: ${err?.message || err}`,
        fix: 'Re-record baseline: npx slop-detect <url> --save-baseline .slop/baseline.json',
      });
    }
  } else {
    checks.push({
      id: 'baseline.ratchet',
      label: 'Regression baseline',
      status: 'pass',
      detail: 'not present (optional — create with --save-baseline .slop/baseline.json)',
    });
  }

  const ok = checks.every((c) => c.status !== 'fail');
  return {
    ok,
    cwd: root,
    definitionsVersion: DEFINITIONS_VERSION,
    nodeVersion: process.version,
    checks,
  };
}

export function formatDoctorReport(report: DoctorReport): string {
  const icon = (s: DoctorStatus) => (s === 'pass' ? '✓' : s === 'warn' ? '!' : '✗');
  const lines = [
    `slop-detect doctor · defs ${report.definitionsVersion} · ${report.ok ? 'READY' : 'ISSUES FOUND'}`,
    `project: ${report.cwd}`,
    '',
  ];
  for (const c of report.checks) {
    lines.push(`  ${icon(c.status)} ${c.label.padEnd(26)} ${c.detail}`);
    if (c.fix) lines.push(`      → ${c.fix}`);
  }
  return lines.join('\n');
}
