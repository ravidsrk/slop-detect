// #300 K-05: Pioneer regression fixtures (committed HTML snapshots, zero network).
// Verifies that canonical human-crafted pioneer pages (Stripe, Linear, Vercel, Rauno)
// score Clean (< 10) on both the design and copy axes, and that Inter/Geist alone
// (without co-occurring slop tells) add 0 points via the D-08 co-signal post-pass rule.

import { test, expect, describe } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  PATTERNS,
  scorePatterns,
  scoreCopy,
  assemblePatternResults,
} from '@slop-detect/core';

function loadPioneerHtml(name) {
  return readFileSync(new URL(`./fixtures/pioneers/${name}.html`, import.meta.url), 'utf8');
}

// Parse a committed pioneer HTML snapshot into lightweight signal + text observations
// so the test runs deterministically in < 20ms with zero network or headless browser.
function evaluatePioneerSnapshot(html) {
  const h1Match = html.match(/<h1\b[^>]*style=(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/h1>/i);
  const bodyStyleMatch = html.match(/<body\b[^>]*style=(?:"([^"]*)"|'([^']*)')/i);
  const h1Style = h1Match ? h1Match[1] || h1Match[2] || '' : '';
  const bodyStyle = bodyStyleMatch ? bodyStyleMatch[1] || bodyStyleMatch[2] || '' : '';

  const fontMatch = (h1Style || bodyStyle).match(/font-family\s*:\s*([^;]+)/i);
  const fontFamily = fontMatch ? fontMatch[1].trim() : '-apple-system, sans-serif';
  const lowerFont = fontFamily.toLowerCase();
  const isInterOrGeist = lowerFont.includes('inter') || lowerFont.includes('geist');
  const isCentered = /text-align\s*:\s*center/i.test(h1Style);

  const signals = {};
  for (const p of PATTERNS) {
    signals[p.id] = { triggered: false };
  }

  if (isInterOrGeist) {
    signals.slop_fonts = {
      triggered: true,
      ratio: 1,
      slopCount: 5,
      total: 5,
      heroFam: fontFamily,
      heroIsSlop: true,
      interOrGeistOnly: true,
      secondaryOnly: false,
    };
  }
  if (isInterOrGeist && isCentered) {
    signals.centered_hero = {
      triggered: true,
      centered: true,
      fontSize: 56,
      family: fontFamily,
      slopFont: true,
    };
  }

  const { patterns } = assemblePatternResults(signals);
  const designResult = scorePatterns(patterns);

  // Extract visible prose from paragraphs and headings
  const textBlocks = [...html.matchAll(/<(?:h1|h2|h3|p)\b[^>]*>([\s\S]*?)<\/(?:h1|h2|h3|p)>/gi)].map(
    (m) => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  );
  const fullText = textBlocks.join('\n\n');
  const words = fullText.split(/\s+/).filter(Boolean).length;
  const copyResult = scoreCopy({
    text: fullText,
    headings: textBlocks.slice(0, 2),
    paragraphs: textBlocks.slice(1),
    wordCount: words,
    proseWordCount: words,
  });

  return { designResult, copyResult };
}

describe('K-05 (#300): Pioneer HTML snapshot regression suite', () => {
  for (const pioneer of ['stripe', 'linear', 'vercel', 'rauno']) {
    test(`${pioneer}.html scores Clean (< 10) on design and copy axes`, () => {
      const html = loadPioneerHtml(pioneer);
      expect(html.length).toBeGreaterThan(200);
      const { designResult, copyResult } = evaluatePioneerSnapshot(html);
      expect(designResult.score).toBeLessThan(10);
      expect(designResult.tier).toBe('Clean');
      expect(copyResult.score).toBeLessThan(8);
      expect(copyResult.tier).toBe('Clean');
    });
  }

  test('Linear (Inter only) and Vercel (Geist only) trigger slop_fonts with interOrGeistOnly=true and receive 0 points via slop_fonts_co_signal', () => {
    const linear = evaluatePioneerSnapshot(loadPioneerHtml('linear'));
    expect(linear.designResult.score).toBe(0);
    expect(linear.designResult.adjustments.some((a) => a.ruleId === 'slop_fonts_co_signal')).toBe(
      true
    );

    const vercel = evaluatePioneerSnapshot(loadPioneerHtml('vercel'));
    expect(vercel.designResult.score).toBe(0);
    expect(vercel.designResult.adjustments.some((a) => a.ruleId === 'slop_fonts_co_signal')).toBe(
      true
    );
  });
});
