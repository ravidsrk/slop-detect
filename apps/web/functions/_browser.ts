// Shared Cloudflare Browser Rendering acquire/release seam.
//
// @cloudflare/puppeteer@1.1.0 exposes sessions()/connect()/launch() on the
// default export. Prefer connecting to an idle warm session (no connectionId)
// before cold-launching; release via disconnect() so the session stays warm.

import puppeteer from '@cloudflare/puppeteer';

const DEFAULT_KEEP_ALIVE_MS = 60_000;

export type AcquiredBrowser = {
  browser: Awaited<ReturnType<typeof puppeteer.launch>>;
  /** true when connect() reused an idle session instead of launch(). */
  reused: boolean;
};

function isScanDisabled(env: { SCAN_DISABLED?: string }) {
  return env.SCAN_DISABLED === '1' || env.SCAN_DISABLED === 'true';
}

/** True when browser rendering is paused (kill switch). */
export { isScanDisabled };

/**
 * Connect to a free warm session when one exists, otherwise launch a new one.
 * Requires @cloudflare/puppeteer sessions()/connect() (v1.1.0+).
 */
export async function acquireBrowser(
  binding: Parameters<typeof puppeteer.launch>[0],
  options: { keep_alive?: number } = {}
): Promise<AcquiredBrowser> {
  const keepAlive = options.keep_alive ?? DEFAULT_KEEP_ALIVE_MS;

  if (typeof puppeteer.sessions === 'function') {
    const sessions = await puppeteer.sessions(binding);
    const idle = sessions.find((s) => !s.connectionId);
    if (idle) {
      try {
        const browser = await puppeteer.connect(binding, idle.sessionId);
        return { browser, reused: true };
      } catch (_) {
        // Session may have closed between sessions() and connect(); fall through.
      }
    }
  }

  const browser = await puppeteer.launch(binding, { keep_alive: keepAlive });
  return { browser, reused: false };
}

/** Drop the worker connection but keep the browser session warm for reuse. */
export async function releaseBrowser(
  browser: { disconnect?: () => Promise<void>; close?: () => Promise<void> } | null | undefined
): Promise<void> {
  if (!browser) return;
  try {
    if (typeof browser.disconnect === 'function') {
      await browser.disconnect();
    } else {
      await browser.close?.();
    }
  } catch (_) {}
}
