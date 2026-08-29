import { test, expect } from 'vitest';
import { evaluateThreshold } from '../scan.mjs';

test('empty fail-under is report-only and always passes', () => {
  const r = evaluateThreshold({ score: 99, grade: 'F', blocked: true, error: 'nope' }, '');
  expect(r.passed).toBe(true);
  expect(r.mode).toBe('report-only');
});

test('numeric fail-under fails when score exceeds the limit (lower is better)', () => {
  expect(evaluateThreshold({ score: 10, grade: 'B' }, '9').passed).toBe(false);
  expect(evaluateThreshold({ score: 9, grade: 'A-' }, '9').passed).toBe(true);
  expect(evaluateThreshold({ score: 0, grade: 'A+' }, '0').passed).toBe(true);
});

test('letter-grade fail-under fails when the page grades worse', () => {
  expect(evaluateThreshold({ score: 12, grade: 'B-' }, 'B').passed).toBe(false);
  expect(evaluateThreshold({ score: 8, grade: 'A' }, 'B').passed).toBe(true);
  expect(evaluateThreshold({ score: 22, grade: 'C' }, 'B').mode).toBe('grade');
});

test('invalid fail-under fails closed', () => {
  const r = evaluateThreshold({ score: 0, grade: 'A+' }, 'bogus');
  expect(r.passed).toBe(false);
  expect(r.mode).toBe('invalid');
});

test('error and blocked scans fail the gate when a threshold is set', () => {
  expect(evaluateThreshold({ error: 'timeout' }, '27').passed).toBe(false);
  expect(evaluateThreshold({ error: 'timeout' }, '27').mode).toBe('failed-scan');
  expect(evaluateThreshold({ blocked: true, code: 'cloudflare_challenge' }, 'heavy').passed).toBe(
    false
  );
  expect(evaluateThreshold({ blocked: true, code: 'cloudflare_challenge' }, 'B').passed).toBe(
    false
  );
});
