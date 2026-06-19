import { test, expect } from 'vitest';
import { SCAN_PAGE_WAIT } from '@slop-detect/core';

test('SCAN_PAGE_WAIT matches the unified web/CLI settle profile', () => {
  expect(SCAN_PAGE_WAIT.networkIdleMs).toBe(500);
  expect(SCAN_PAGE_WAIT.networkIdleTimeoutMs).toBe(6000);
  expect(SCAN_PAGE_WAIT.totalWaitCapMs).toBe(7000);
  expect(SCAN_PAGE_WAIT.postNetworkSettleMs).toBe(400);
  expect(SCAN_PAGE_WAIT.fontsReadyTimeoutMs).toBe(5000);
});
