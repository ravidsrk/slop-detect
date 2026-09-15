// Fix-prompt modal keyboard behavior (T-20) — executable browser regression test.
//
// Runs the REAL homepage (apps/web/public/index.html) served over loopback
// with mocked /api/scan + /api/fix-prompt, then drives the keyboard path a
// user takes: scan → open modal → Tab/Shift+Tab/Escape. Gated behind
// RUN_GOLDEN=1 like the other Chromium tests (see golden.test.js); the
// browser-free unit job skips it, and landing.test.js keeps a presence pin.
import { test, expect } from 'vitest';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const RUN = process.env.RUN_GOLDEN === '1';

const SCAN = {
  url: 'https://probe.test',
  finalUrl: 'https://probe.test/',
  score: 30,
  tier: 'Heavy',
  grade: 'D',
  verdict: 'AI slop detected.',
  patternsFlagged: 1,
  patternsTotal: 27,
  patterns: [{ id: 'slop_fonts', label: 'Slop fonts', weight: 8, triggered: true, evidence: {} }],
};

function serve() {
  const html = readFileSync(
    new URL('../../../apps/web/public/index.html', import.meta.url),
    'utf8'
  );
  const server = createServer((req, res) => {
    if (req.url === '/api/scan' && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(SCAN));
    } else if (req.url === '/api/fix-prompt' && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'text/plain' }).end('FIX PROMPT TEXT HERE');
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' }).end(html);
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const MODAL_BTNS = ['openChatGPT', 'openClaude', 'openCursor', 'copyBtn', 'closeBtn'];

test(
  'fix modal traps Tab, wraps, returns focus, and ignores stray Escape',
  { skip: !RUN, timeout: 60_000 },
  async () => {
    const server = await serve();
    try {
      const browser = await chromium.launch();
      try {
        const page = await browser.newPage();
        // No captcha in tests: without window.turnstile the page skips the
        // token poll (which otherwise burns 6s+ waiting on the real
        // challenges host) and submits untokened, like a no-JS fallback.
        await page.route('**/challenges.cloudflare.com/**', (r) => r.abort());
        await page.goto(`http://127.0.0.1:${server.address().port}/`, {
          waitUntil: 'domcontentloaded',
        });
        await page.fill('#url', 'probe.test');
        await page.click('#go');
        await page.waitForSelector('#fixPromptBtn');
        await page.click('#fixPromptBtn');
        await page.waitForSelector('#modalBg.show');

        const activeId = () =>
          page.evaluate(() => document.activeElement && document.activeElement.id);
        const insideModal = () =>
          page.evaluate(() => !!document.activeElement?.closest?.('#modalBg .modal'));

        // Initial focus moves into the modal.
        expect(await insideModal()).toBe(true);
        // Forward Tab cycles the 5 buttons, never escaping.
        const seen = new Set();
        for (let i = 0; i < 10; i++) {
          await page.keyboard.press('Tab');
          expect(await insideModal()).toBe(true);
          seen.add(await activeId());
        }
        expect([...seen].sort()).toEqual([...MODAL_BTNS].sort());
        // Backward Tab wraps too.
        await page.keyboard.press('Shift+Tab');
        expect(await insideModal()).toBe(true);
        // Focus lost outside (clipboard-fallback shape) is pulled back in.
        await page.evaluate(() => document.activeElement.blur());
        await page.keyboard.press('Tab');
        expect(await insideModal()).toBe(true);
        // Escape closes and returns focus to the invoker.
        await page.keyboard.press('Escape');
        expect(await page.evaluate(() => document.getElementById('modalBg').className)).toBe(
          'modal-bg'
        );
        expect(await activeId()).toBe('fixPromptBtn');
        // Stray Escape with the modal closed steals nothing.
        await page.evaluate(() => document.getElementById('url').focus());
        await page.keyboard.press('Escape');
        expect(await activeId()).toBe('url');
      } finally {
        await browser.close();
      }
    } finally {
      server.close();
    }
  }
);
