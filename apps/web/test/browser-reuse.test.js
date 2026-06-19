// REL-1: shared browser acquire/release reuses idle sessions via connect().

import { test, expect, vi, beforeEach } from 'vitest';

const mock = vi.hoisted(() => ({
  idleSessionId: null,
  sessionsError: null,
  connectError: null,
  launchError: null,
  calls: { sessions: 0, connect: 0, launch: 0, disconnect: 0, close: 0 },
}));

function makeBrowser() {
  return {
    newPage: async () => ({}),
    disconnect: async () => {
      mock.calls.disconnect++;
    },
    close: async () => {
      mock.calls.close++;
    },
  };
}

vi.mock('@cloudflare/puppeteer', () => ({
  default: {
    sessions: async () => {
      mock.calls.sessions++;
      if (mock.sessionsError) throw mock.sessionsError;
      if (!mock.idleSessionId) return [];
      return [{ sessionId: mock.idleSessionId, startTime: Date.now() }];
    },
    connect: async (_binding, sessionId) => {
      mock.calls.connect++;
      if (mock.connectError) throw mock.connectError;
      return { ...makeBrowser(), sessionId };
    },
    launch: async () => {
      mock.calls.launch++;
      if (mock.launchError) throw mock.launchError;
      return makeBrowser();
    },
  },
}));

import { acquireBrowser, releaseBrowser } from '../functions/_browser.ts';

beforeEach(() => {
  mock.idleSessionId = null;
  mock.sessionsError = null;
  mock.connectError = null;
  mock.launchError = null;
  mock.calls = { sessions: 0, connect: 0, launch: 0, disconnect: 0, close: 0 };
});

test('acquireBrowser connects to an idle session without launching', async () => {
  mock.idleSessionId = 'warm-sess-42';
  const { browser, reused } = await acquireBrowser({});
  expect(reused).toBe(true);
  expect(mock.calls.sessions).toBe(1);
  expect(mock.calls.connect).toBe(1);
  expect(mock.calls.launch).toBe(0);
  expect(browser).toBeTruthy();
});

test('acquireBrowser launches when no idle session is available', async () => {
  const { browser, reused } = await acquireBrowser({});
  expect(reused).toBe(false);
  expect(mock.calls.sessions).toBe(1);
  expect(mock.calls.connect).toBe(0);
  expect(mock.calls.launch).toBe(1);
  expect(browser).toBeTruthy();
});

test('acquireBrowser launches when connect to idle session fails', async () => {
  mock.idleSessionId = 'stale-sess';
  mock.connectError = new Error('session gone');
  const { reused } = await acquireBrowser({});
  expect(reused).toBe(false);
  expect(mock.calls.connect).toBe(1);
  expect(mock.calls.launch).toBe(1);
});

test('releaseBrowser disconnects instead of closing', async () => {
  const { browser } = await acquireBrowser({});
  await releaseBrowser(browser);
  expect(mock.calls.disconnect).toBe(1);
  expect(mock.calls.close).toBe(0);
});
