// Detector orchestrator. Serializes lib helpers + pattern extract functions
// into a single page-side IIFE, runs once via page.evaluate(), aggregates
// results, computes a 0-100 score.

import { chromium } from 'playwright';
import {
  PATTERNS,
  createColorHelpers,
  createVisibilityHelpers,
  isSlopFont,
  isAccentSerif,
  SLOP_FONT_PREFIXES,
  ACCENT_SERIF_PREFIXES,
  scorePatterns
} from 'slop-detect-core';

function buildPageScript() {
  const patternCalls = PATTERNS.map(p => `
    try {
      signals[${JSON.stringify(p.id)}] = (${p.extract.toString()})(ctx);
    } catch (e) {
      signals[${JSON.stringify(p.id)}] = { triggered: false, error: e.message };
    }`).join('\n');

  return `(() => {
    ${createColorHelpers.toString()}
    ${createVisibilityHelpers.toString()}
    ${isSlopFont.toString()}
    ${isAccentSerif.toString()}
    const SLOP_FONT_PREFIXES = ${JSON.stringify(SLOP_FONT_PREFIXES)};
    const ACCENT_SERIF_PREFIXES = ${JSON.stringify(ACCENT_SERIF_PREFIXES)};

    const colorHelpers = createColorHelpers();
    const visHelpers = createVisibilityHelpers();
    const visible = visHelpers.getVisible(document.body, 4000);

    // Find the dominant H1 — first visible H1 in document order.
    let h1 = null;
    for (const el of document.querySelectorAll('h1')) {
      if (visHelpers.isVisible(el)) { h1 = el; break; }
    }

    const ctx = {
      visible,
      h1,
      parseColor: colorHelpers.parseColor,
      rgbToHsl: colorHelpers.rgbToHsl,
      isPurple: colorHelpers.isPurple,
      isDark: colorHelpers.isDark,
      isMidGrey: colorHelpers.isMidGrey,
      isSlopFont,
      isAccentSerif,
      SLOP_FONT_PREFIXES,
      ACCENT_SERIF_PREFIXES,
      isVisible: visHelpers.isVisible,
      inHero: visHelpers.inHero,
      inViewport: visHelpers.inViewport
    };

    const signals = {};
    ${patternCalls}

    return {
      title: document.title,
      url: location.href,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      docHeight: document.documentElement.scrollHeight,
      h1Text: h1 ? h1.textContent.trim().slice(0, 120) : null,
      h1Font: h1 ? getComputedStyle(h1).fontFamily : null,
      visibleCount: visible.length,
      signals
    };
  })();`;
}

export async function scanUrl(url, opts = {}) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 SlopDetector/1.0 (+https://github.com/yourname/slop-detector)',
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  let result;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: opts.timeout || 30000 });
    // Give CSS / fonts / above-fold images a moment to settle
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);

    const data = await page.evaluate(buildPageScript());

    // Build the structured result on the Node side.
    const patterns = PATTERNS.map(p => {
      const sig = data.signals[p.id] || { triggered: false };
      return {
        id: p.id,
        label: p.label,
        short: p.short,
        category: p.category,
        weight: p.weight,
        triggered: !!sig.triggered,
        evidence: sig
      };
    });

    const scoring = scorePatterns(patterns);

    result = {
      url,
      finalUrl: data.url,
      title: data.title,
      h1: data.h1Text,
      h1Font: data.h1Font,
      ...scoring,
      patterns
    };

    if (opts.screenshot) {
      const buf = await page.screenshot({ fullPage: false });
      result.screenshot = buf.toString('base64');
    }
  } finally {
    await browser.close();
  }
  return result;
}
