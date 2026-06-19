// REL-3 acceptance: font-dependent signals are stable with fonts.ready and unstable without it.
// Serves a local fixture — no third-party network.

import { test, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildPageScript, SCAN_PAGE_WAIT, waitFontsReadyInPage } from '@slop-detect/core';

const RUN = process.env.RUN_GOLDEN === '1';
const FIXTURE_DIR = fileURLToPath(new URL('./fixtures/', import.meta.url));
const HTML = readFileSync(`${FIXTURE_DIR}delayed-inter-font.html`, 'utf8');
const FONT = readFileSync(`${FIXTURE_DIR}inter-latin-400-normal.woff2`);

let server;
let baseUrl;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    if (req.url === '/inter.woff2') {
      // Slow font response so network-idle + 400ms settle finishes before Inter applies.
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'font/woff2' });
        res.end(FONT);
      }, 1200);
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}/`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function loadChromium() {
  const { chromium } = await import('playwright');
  return chromium;
}

async function scoreWithWaitProfile(page, { withFontsReady }) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
  if (withFontsReady) {
    // Current runner profile (REL-3): shared settle budget + bounded fonts.ready.
    await Promise.race([
      page
        .waitForLoadState('networkidle', { timeout: SCAN_PAGE_WAIT.networkIdleTimeoutMs })
        .catch(() => {}),
      new Promise((r) => setTimeout(r, SCAN_PAGE_WAIT.totalWaitCapMs)),
    ]);
    await page.waitForTimeout(SCAN_PAGE_WAIT.postNetworkSettleMs);
    await page.evaluate(waitFontsReadyInPage, SCAN_PAGE_WAIT.fontsReadyTimeoutMs);
  } else {
    // Legacy race: short settle after DOMContentLoaded, no fonts.ready — scores
    // before the deferred FontFace finishes loading on a slow response.
    await page.waitForTimeout(SCAN_PAGE_WAIT.postNetworkSettleMs);
  }
  const data = await page.evaluate(buildPageScript());
  return data.signals.slop_fonts;
}

test(
  'slop_fonts is stable when document.fonts.ready is awaited before scoring',
  { skip: !RUN, timeout: 60_000 },
  async () => {
    const chromium = await loadChromium();
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
      const sig = await scoreWithWaitProfile(page, { withFontsReady: true });
      expect(sig?.heroIsSlop).toBe(true);
      expect(sig?.triggered).toBe(true);
    } finally {
      await browser.close();
    }
  }
);

test(
  'slop_fonts is unstable without fonts.ready — scores before Inter is applied',
  { skip: !RUN, timeout: 60_000 },
  async () => {
    const chromium = await loadChromium();
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
      const sig = await scoreWithWaitProfile(page, { withFontsReady: false });
      expect(sig?.heroIsSlop).toBe(false);
      expect(sig?.triggered).toBe(false);
    } finally {
      await browser.close();
    }
  }
);
