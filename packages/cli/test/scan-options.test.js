import { test, expect } from 'vitest';
import { shouldIncludeSystem } from '../src/index.ts';

test('includeSystem remains a public ScanOptions field and enables extraction', () => {
  expect(shouldIncludeSystem({})).toBe(false);
  expect(shouldIncludeSystem({ includeSystem: true })).toBe(true);
  expect(shouldIncludeSystem({ includeSystem: false })).toBe(false);
});

test('designMd still implies system extraction', () => {
  expect(shouldIncludeSystem({ designMd: 'tokens: {}' })).toBe(true);
  expect(shouldIncludeSystem({ designMd: 'tokens: {}', includeSystem: false })).toBe(true);
});
