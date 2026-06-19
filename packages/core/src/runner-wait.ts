// Shared page-settle timing for every scan runner (web Puppeteer + CLI Playwright).
// Both runners MUST use these constants so CLI vs web scores the same page with
// the same wait budget. REL-3: also await document.fonts.ready (bounded) before
// page.evaluate so font-dependent patterns don't race fallback fonts.

/** Unified wait profile — web waitForNetworkIdle + CLI networkidle share this budget. */
export const SCAN_PAGE_WAIT = {
  /** Puppeteer idleTime / minimum quiet period before "network idle". */
  networkIdleMs: 500,
  /** Max time to wait for network idle before giving up. */
  networkIdleTimeoutMs: 6000,
  /** Hard cap on the entire post-navigation settle phase (raced with network idle). */
  totalWaitCapMs: 7000,
  /** Extra settle after network idle before fonts.ready. */
  postNetworkSettleMs: 400,
  /** Max time to wait for document.fonts.ready before scoring anyway. */
  fontsReadyTimeoutMs: 5000,
} as const;

/**
 * Evaluated in-page (Puppeteer/Playwright page.evaluate) after navigation settle.
 * Mirrors functions/og/[id].ts — bounded wait so a hung font load can't block forever.
 */
export async function waitFontsReadyInPage(timeoutMs: number): Promise<void> {
  if (!document.fonts?.ready) return;
  await Promise.race([
    document.fonts.ready,
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}
