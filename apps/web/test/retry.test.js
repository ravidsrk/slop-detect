// T-26 (G-08): retry/backoff on external calls — Resend, fetchAllowedUrl,
// browser launch — all sharing withRetry. Every test injects a fake sleep,
// so no test waits on a real backoff (except one 50ms deadline test with a
// 50x timing margin).

import { test, expect, vi, beforeEach, afterEach } from 'vitest';

import { withRetry, backoffMs, sleepUntilAbort } from '../functions/_retry.ts';
import { sendEmail } from '../functions/_email.ts';
import { fetchAllowedUrl } from '../functions/_ssrf.ts';

const launchScript = vi.hoisted(() => ({ steps: [], calls: 0 }));

vi.mock('@cloudflare/puppeteer', () => ({
  default: {
    sessions: async () => [],
    connect: async () => {
      throw new Error('no connect in this test');
    },
    launch: async () => {
      launchScript.calls++;
      const step = launchScript.steps.shift();
      if (step instanceof Error) throw step;
      return { disconnect: async () => {}, close: async () => {} };
    },
  },
}));

// vi.mock is hoisted: _browser.ts binds to the scripted launch above.
import { acquireBrowser } from '../functions/_browser.ts';

const realFetch = globalThis.fetch;
let logged;
let logSpy;
let errorSpy;

beforeEach(() => {
  logged = [];
  logSpy = vi.spyOn(console, 'log').mockImplementation((line) => {
    if (typeof line === 'string' && line.startsWith('[slop-detect] ')) {
      logged.push(JSON.parse(line.slice('[slop-detect] '.length)));
    }
  });
  errorSpy = vi.spyOn(console, 'error').mockImplementation((line) => {
    if (typeof line === 'string' && line.startsWith('[slop-detect] ')) {
      logged.push(JSON.parse(line.slice('[slop-detect] '.length)));
    }
  });
  launchScript.steps = [];
  launchScript.calls = 0;
});

afterEach(() => {
  logSpy.mockRestore();
  errorSpy.mockRestore();
  globalThis.fetch = realFetch;
});

function fakeSleeper() {
  const sleeps = [];
  return { sleeps, sleep: async (ms) => void sleeps.push(ms) };
}

// ── withRetry unit ───────────────────────────────────────────────────────────

test('withRetry resolves first try without sleeping', async () => {
  const { sleeps, sleep } = fakeSleeper();
  let calls = 0;
  const out = await withRetry(
    async (attempt) => {
      calls++;
      expect(attempt).toBe(1);
      return 'ok';
    },
    { sleep }
  );
  expect(out).toBe('ok');
  expect(calls).toBe(1);
  expect(sleeps).toEqual([]);
});

test('withRetry backs off exponentially then succeeds (attempt numbers 1-based)', async () => {
  const { sleeps, sleep } = fakeSleeper();
  const seen = [];
  let calls = 0;
  const out = await withRetry(
    async (attempt) => {
      calls++;
      seen.push(attempt);
      if (calls < 3) throw new Error(`blip ${calls}`);
      return 'recovered';
    },
    { attempts: 3, baseMs: 250, maxMs: 2000, jitter: false, sleep }
  );
  expect(out).toBe('recovered');
  expect(seen).toEqual([1, 2, 3]);
  expect(sleeps).toEqual([250, 500]);
});

test('withRetry rethrows the LAST error unchanged after exhausting attempts', async () => {
  const { sleep } = fakeSleeper();
  const first = new Error('first');
  const last = new Error('last');
  const err = await withRetry(
    async (attempt) => {
      throw attempt === 1 ? first : last;
    },
    { attempts: 2, jitter: false, sleep }
  ).catch((e) => e);
  expect(err).toBe(last);
});

test('withRetry fails fast when retryIf says no (no sleep burned)', async () => {
  const { sleeps, sleep } = fakeSleeper();
  let calls = 0;
  const err = await withRetry(
    async () => {
      calls++;
      throw new Error('fatal');
    },
    { attempts: 5, sleep, retryIf: () => false }
  ).catch((e) => e);
  expect(err.message).toBe('fatal');
  expect(calls).toBe(1);
  expect(sleeps).toEqual([]);
});

test('backoff schedule caps at maxMs; jitter stays within [0, cap]', async () => {
  expect([1, 2, 3, 4, 5].map((a) => backoffMs(a, 1000, 1200))).toEqual([
    1000, 1200, 1200, 1200, 1200,
  ]);
  const { sleep } = fakeSleeper();
  const delays = [];
  await withRetry(
    async (attempt) => {
      if (attempt < 2) throw new Error('x');
      return true;
    },
    {
      attempts: 2,
      baseMs: 1000,
      jitter: true,
      random: () => 0.9999,
      sleep,
      onRetry: (_e, _a, d) => void delays.push(d),
    }
  );
  expect(delays).toHaveLength(1);
  expect(delays[0]).toBeGreaterThan(0);
  expect(delays[0]).toBeLessThanOrEqual(1000);
});

test('sleepUntilAbort resolves immediately on an already-aborted signal', async () => {
  const c = new AbortController();
  c.abort();
  // Would hang 10s with a naive sleep; must resolve now.
  await sleepUntilAbort(10_000, c.signal);
});

test('sleepUntilAbort resolves early when abort fires mid-sleep', async () => {
  const c = new AbortController();
  setTimeout(() => c.abort(), 5);
  const start = Date.now();
  await sleepUntilAbort(10_000, c.signal);
  expect(Date.now() - start).toBeLessThan(1000);
});

test('attempts: 1 is a single shot (escape hatch = old behavior)', async () => {
  const { sleeps, sleep } = fakeSleeper();
  let calls = 0;
  await expect(
    withRetry(
      async () => {
        calls++;
        throw new Error('nope');
      },
      { attempts: 1, sleep }
    )
  ).rejects.toThrow('nope');
  expect(calls).toBe(1);
  expect(sleeps).toEqual([]);
});

// ── Resend ───────────────────────────────────────────────────────────────────

const mailEnv = { RESEND_API_KEY: 'k', ALERT_FROM: 'a@b.com' };
const mail = { to: 'd@x.io', subject: 's', text: 't' };
const okMail = () => new Response(JSON.stringify({ id: 'em_1' }), { status: 200 });

test('sendEmail retries a 500 then succeeds (info retry line, no error line)', async () => {
  const { sleeps, sleep } = fakeSleeper();
  let calls = 0;
  const r = await sendEmail(
    mailEnv,
    mail,
    async () => (++calls === 1 ? new Response('blip', { status: 500 }) : okMail()),
    { sleep, jitter: false }
  );
  expect(r).toEqual({ sent: true, id: 'em_1' });
  expect(calls).toBe(2);
  expect(sleeps).toEqual([250]);
  const retries = logged.filter((l) => l.event === 'email_retry');
  expect(retries).toHaveLength(1);
  expect(retries[0].status).toBe(500);
  expect(logged.some((l) => l.level === 'error')).toBe(false);
});

test('sendEmail retries 429 and network exceptions, fails fast on 400', async () => {
  const { sleep } = fakeSleeper();
  // 429 -> success.
  let calls = 0;
  const r1 = await sendEmail(
    mailEnv,
    mail,
    async () => (++calls === 1 ? new Response('slow down', { status: 429 }) : okMail()),
    { sleep, jitter: false }
  );
  expect(r1.sent).toBe(true);
  expect(calls).toBe(2);
  // Exception -> success.
  calls = 0;
  const r2 = await sendEmail(
    mailEnv,
    mail,
    async () => {
      if (++calls === 1) throw new Error('socket hangup');
      return okMail();
    },
    { sleep, jitter: false }
  );
  expect(r2.sent).toBe(true);
  // 400 -> single attempt, same contract as before retries existed.
  calls = 0;
  const r3 = await sendEmail(
    mailEnv,
    mail,
    async () => {
      calls++;
      return new Response('bad address', { status: 400 });
    },
    { sleep }
  );
  expect(r3).toEqual({ sent: false, reason: 'http_400' });
  expect(calls).toBe(1);
});

test('sendEmail reuses one Idempotency-Key across retries (no duplicate sends)', async () => {
  const { sleep } = fakeSleeper();
  const keys = [];
  let calls = 0;
  const r = await sendEmail(
    mailEnv,
    mail,
    async (_url, init) => {
      keys.push(init.headers['Idempotency-Key']);
      return ++calls < 3 ? new Response('blip', { status: 500 }) : okMail();
    },
    { sleep, jitter: false }
  );
  expect(r.sent).toBe(true);
  expect(keys).toHaveLength(3);
  // Stable across attempts (fresh-per-attempt would defeat Resend's dedupe),
  // UUID-shaped (Resend's recommended format, <= 256 chars).
  expect(new Set(keys).size).toBe(1);
  expect(keys[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('sendEmail reports once after exhausting retries (no triple page)', async () => {
  const { sleeps, sleep } = fakeSleeper();
  let calls = 0;
  const r = await sendEmail(
    mailEnv,
    mail,
    async () => {
      calls++;
      return new Response('down', { status: 503 });
    },
    { sleep, jitter: false }
  );
  expect(r).toEqual({ sent: false, reason: 'http_503' });
  expect(calls).toBe(3);
  expect(sleeps).toEqual([250, 500]);
  expect(logged.filter((l) => l.event === 'email_retry')).toHaveLength(2);
  const finals = logged.filter((l) => l.event === 'email_send_failed');
  expect(finals).toHaveLength(1);
  expect(finals[0].status).toBe(503);
});

// ── fetchAllowedUrl ──────────────────────────────────────────────────────────

const MD_URL = 'https://example.com/DESIGN.md';

test('fetchAllowedUrl retries a network blip then returns the response', async () => {
  const { sleeps, sleep } = fakeSleeper();
  let calls = 0;
  globalThis.fetch = async () => {
    if (++calls === 1) throw new Error('connection reset');
    return new Response('# md', { status: 200 });
  };
  const res = await fetchAllowedUrl(MD_URL, {}, { sleep, jitter: false });
  expect(res?.ok).toBe(true);
  expect(calls).toBe(2);
  expect(sleeps).toEqual([200]);
});

test('fetchAllowedUrl retries a 500, returns other statuses as-is', async () => {
  const { sleep } = fakeSleeper();
  let calls = 0;
  globalThis.fetch = async () =>
    ++calls === 1 ? new Response('oops', { status: 500 }) : new Response('# md', { status: 200 });
  const res = await fetchAllowedUrl(MD_URL, {}, { sleep, jitter: false });
  expect(res?.ok).toBe(true);
  expect(calls).toBe(2);
  // A 404 is a definitive answer, not a blip: no retry.
  calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response('nope', { status: 404 });
  };
  const res404 = await fetchAllowedUrl(MD_URL, {}, { sleep });
  expect(res404?.status).toBe(404);
  expect(calls).toBe(1);
});

test('fetchAllowedUrl never retries an SSRF block (zero fetches)', async () => {
  const { sleeps, sleep } = fakeSleeper();
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response('x', { status: 200 });
  };
  const res = await fetchAllowedUrl('http://10.1.2.3/DESIGN.md', {}, { sleep });
  expect(res).toBeNull();
  expect(calls).toBe(0);
  expect(sleeps).toEqual([]);
});

test('fetchAllowedUrl restarts the redirect chain on retry (idempotent GET)', async () => {
  const { sleep } = fakeSleeper();
  const seen = [];
  globalThis.fetch = async (url) => {
    seen.push(url);
    if (url === MD_URL) return new Response('', { status: 302, headers: { location: '/b' } });
    if (seen.filter((u) => u !== MD_URL).length === 1) throw new Error('blip on /b');
    return new Response('# md', { status: 200 });
  };
  const res = await fetchAllowedUrl(MD_URL, {}, { sleep, jitter: false });
  expect(res?.ok).toBe(true);
  // Attempt 1: md -> 302 -> /b throws. Attempt 2 restarts at md (not /b).
  expect(seen).toEqual([MD_URL, 'https://example.com/b', MD_URL, 'https://example.com/b']);
});

test('fetchAllowedUrl backoff sleep ends at the deadline (no 200ms overshoot)', async () => {
  // Attempt 1 fails BEFORE the deadline (retryIf passes), so the 200ms
  // backoff starts — but the abort at 20ms must cut it short. Uses the REAL
  // default sleep wiring (no fake), with a stub that honors the signal like
  // production fetch. Without sleepUntilAbort this returns at ~200ms+.
  const seenAborted = [];
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    seenAborted.push(!!init?.signal?.aborted);
    if (init?.signal?.aborted) throw new DOMException('aborted', 'AbortError');
    throw new Error('blip before deadline');
  };
  const start = Date.now();
  const res = await fetchAllowedUrl(MD_URL, {}, { timeoutMs: 20, jitter: false });
  const elapsed = Date.now() - start;
  expect(res).toBeNull();
  expect(calls).toBe(2);
  expect(seenAborted).toEqual([false, true]);
  expect(elapsed).toBeLessThan(150);
});

test('fetchAllowedUrl treats timeoutMs as a TOTAL budget (no retry past deadline)', async () => {
  const { sleeps, sleep } = fakeSleeper();
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    await new Promise((r) => setTimeout(r, 50));
    throw new Error('too slow');
  };
  const res = await fetchAllowedUrl(MD_URL, {}, { timeoutMs: 1, sleep });
  expect(res).toBeNull();
  expect(calls).toBe(1);
  expect(sleeps).toEqual([]);
});

// ── browser launch ───────────────────────────────────────────────────────────

test('acquireBrowser retries a failed cold launch once, then succeeds', async () => {
  const { sleeps, sleep } = fakeSleeper();
  launchScript.steps = [new Error('session limit blip')];
  const { browser, reused } = await acquireBrowser({}, { sleep });
  expect(reused).toBe(false);
  expect(browser).toBeTruthy();
  expect(launchScript.calls).toBe(2);
  expect(sleeps).toHaveLength(1);
});

test('acquireBrowser surfaces the launch error after exhausting retries', async () => {
  const { sleeps, sleep } = fakeSleeper();
  launchScript.steps = [new Error('down 1'), new Error('down 2'), new Error('down 3')];
  const err = await acquireBrowser({}, { sleep, jitter: false }).catch((e) => e);
  expect(err.message).toBe('down 2');
  expect(launchScript.calls).toBe(2);
  expect(sleeps).toEqual([500]);
});
