// Shared retry-with-backoff for external calls (T-26 / G-08).
//
// One policy, three users: Resend sends (_email.ts), SSRF-guarded fetches
// (_ssrf.ts fetchAllowedUrl), and browser launches (_browser.ts). Workers
// budgets cap us: each retry burns a subrequest and wall-clock, so defaults
// stay small (2-3 attempts, sub-second backoff). Full jitter on every sleep
// so a fleet-wide blip doesn't retry in lockstep.
//
// Deliberately NOT retried (documented, not overlooked):
// - ERROR_WEBHOOK posts (_report.ts): fire-and-forget by design; the console
//   line is the durable record, and retrying a page risks duplicate alerts.
// - page.goto navigation: the 25s timeout is already generous; a retry would
//   double user-visible latency on a target that is usually just down.
// - SSRF blocks / 4xx / exhausted hops: deterministic, fail fast.

export type RetryOptions = {
  /** Total attempts including the first (default 3). */
  attempts?: number;
  /** First backoff in ms; doubles per retry (default 250). */
  baseMs?: number;
  /** Backoff cap in ms (default 2000). */
  maxMs?: number;
  /** Full jitter: sleep uniform(0, backoff) instead of exact backoff (default true). */
  jitter?: boolean;
  /** Return false to fail fast on non-retryable errors (default: always retry). */
  retryIf?: (err: unknown, attempt: number) => boolean;
  /** Injectable sleep (tests pass a fake; default uses setTimeout). */
  sleep?: (ms: number) => Promise<void>;
  /** Injectable randomness for jitter (tests pass () => 0.5; default Math.random). */
  random?: () => number;
  /** Called before each retry sleep (attempt is 1-based, the one that failed). */
  onRetry?: (err: unknown, attempt: number, delayMs: number) => void;
};

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function backoffMs(attempt: number, baseMs: number, maxMs: number): number {
  return Math.min(maxMs, baseMs * 2 ** (attempt - 1));
}

/**
 * Run fn until it resolves or attempts run out. fn receives the 1-based
 * attempt number. The final error is rethrown unchanged (no wrapping).
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const attempts = Math.max(1, opts.attempts ?? 3);
  const baseMs = opts.baseMs ?? 250;
  const maxMs = opts.maxMs ?? 2000;
  const jitter = opts.jitter ?? true;
  const retryIf = opts.retryIf ?? (() => true);
  const sleep = opts.sleep ?? defaultSleep;
  const random = opts.random ?? Math.random;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt >= attempts || !retryIf(err, attempt)) throw err;
      const cap = backoffMs(attempt, baseMs, maxMs);
      const delay = jitter ? Math.floor(random() * (cap + 1)) : cap;
      opts.onRetry?.(err, attempt, delay);
      await sleep(delay);
    }
  }
  throw lastErr;
}
