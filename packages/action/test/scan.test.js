import { test, expect, afterEach } from 'vitest';
import {
  noticeIfPullRequestTarget,
  PULL_REQUEST_TARGET_NOTICE,
  buildScanPayload,
  emitPatternWarnings,
  reportBody,
} from '../scan.mjs';

const realWrite = process.stdout.write.bind(process.stdout);
let captured = '';

afterEach(() => {
  process.stdout.write = realWrite;
  captured = '';
});

function captureStdout() {
  process.stdout.write = (chunk) => {
    captured += String(chunk);
    return true;
  };
}

test('noticeIfPullRequestTarget emits a GitHub notice on pull_request_target', () => {
  captureStdout();
  expect(noticeIfPullRequestTarget('pull_request_target')).toBe(true);
  expect(captured).toBe(`::notice::${PULL_REQUEST_TARGET_NOTICE}\n`);
});

test('noticeIfPullRequestTarget is silent on pull_request', () => {
  captureStdout();
  expect(noticeIfPullRequestTarget('pull_request')).toBe(false);
  expect(captured).toBe('');
});

test('buildScanPayload includes axes, preset, designMd, and share options only when configured', () => {
  expect(buildScanPayload('https://example.com')).toEqual({ url: 'https://example.com' });
  expect(
    buildScanPayload('https://example.com', {
      axes: 'all',
      preset: 'strict',
      designMd: 'auto',
      share: 'false',
    })
  ).toEqual({
    url: 'https://example.com',
    axes: ['design', 'copy'],
    preset: 'strict',
    designMd: true,
    share: false,
  });
});

test('emitPatternWarnings emits ::warning annotations for triggered patterns and system drift', () => {
  captureStdout();
  const count = emitPatternWarnings({
    url: 'https://acme.example',
    patterns: [{ id: 'slop_fonts', label: 'AI default fonts', weight: 8, triggered: true }],
    axes: {
      copy: {
        patterns: [
          { id: 'buzzword_density', label: 'AI buzzword density', weight: 7, triggered: true },
        ],
      },
    },
    system: {
      drift: [{ id: 'fonts.declared', message: 'undeclared font: inter' }],
    },
  });
  expect(count).toBe(3);
  expect(captured).toContain('::warning title=Slop Pattern (slop_fonts)::');
  expect(captured).toContain('::warning title=Slop Pattern (buzzword_density)::');
  expect(captured).toContain('::warning title=DESIGN.md Drift (fonts.declared)::');
});

test('reportBody renders 4-axis summary rows when copy, system, and AEO are present', () => {
  const md = reportBody(
    'https://slop-detect.com',
    {
      id: 'abc123',
      grade: 'A',
      score: 4,
      tier: 'Clean',
      patternsFlagged: 0,
      patternsTotal: 27,
      verdict: 'Clean design.',
      definitionsVersion: '2026.09',
      axes: {
        copy: { score: 7, grade: 'A-', tier: 'Clean', patternsFlagged: 1, patternsTotal: 9 },
      },
      system: { declared: true, score: 92, tier: 'Aligned', drift: [] },
      aeo: { score: 85, maxScore: 100, tier: 'AI-Ready', failed: [] },
    },
    { mode: 'grade', passed: true, reason: 'Grade A is at least as good as B.' },
    { withMarker: true }
  );
  expect(md).toContain('<!-- slop-detect-action -->');
  expect(md).toContain('**Design Slop** (lower is better)');
  expect(md).toContain('**Copy Slop** (lower is better)');
  expect(md).toContain('**System (`DESIGN.md`)** (higher is better)');
  expect(md).toContain('**AEO Readiness** (higher is better)');
});
