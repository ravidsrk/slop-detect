// Page-side script assembler + anti-bot heuristics shared by every runner.
// Pure functions only — no Playwright/Puppeteer/fetch. Callers launch a browser,
// navigate, then evaluate the string returned by buildPageScript().

import { PATTERNS } from './patterns.js';
import { createColorHelpers } from './color.js';
import { createVisibilityHelpers } from './visibility.js';
import { isSlopFont, isAccentSerif, SLOP_FONT_PREFIXES, ACCENT_SERIF_PREFIXES } from './fonts.js';
import { extractTextContext } from './text.js';
import { extractSystemContext } from './system.js';

export interface PageScriptData {
  title?: string;
  h1Text?: string;
  visibleCount?: number;
  signals?: Record<string, { triggered?: boolean; error?: string; [key: string]: unknown }>;
  url?: string;
}

export interface BlockedResult {
  code: string;
  reason: string;
  hint: string;
}

export interface BuildPageScriptOptions {
  includeSystem?: boolean;
}

/** Runner context passed alongside page data; reserved for future boundary checks. */
export interface DetectBlockedContext {
  url?: string;
  finalUrl?: string;
}

// ── Anti-bot / dead-page heuristics ─────────────────────────────────────────
// Reconciled from apps/web/functions/api/scan.ts (web copy): fuller comments,
// patternsWithEvidence computed before empty-page check, richer user hints.
export function detectBlocked(
  data: PageScriptData | null | undefined,
  _ctx?: DetectBlockedContext
): BlockedResult | null {
  const title = (data?.title || '').trim();
  const h1 = (data?.h1Text || '').trim();
  const visibleCount = data?.visibleCount || 0;
  const signals = data?.signals || {};
  // Count how many patterns returned ANY non-empty evidence — proxy
  // for "did the page actually render meaningful DOM?".
  const patternsWithEvidence = Object.values(signals).filter((s) => {
    if (!s || typeof s !== 'object') return false;
    const keys = Object.keys(s).filter((k) => k !== 'triggered' && k !== 'error');
    return keys.length > 0;
  }).length;

  // Cloudflare's interstitial keeps an empty <title> long enough that we
  // sometimes capture it, but more commonly the title is "Just a moment...".
  const cfMarkers = [
    'Just a moment...',
    'Attention Required! | Cloudflare',
    'Please Wait... | Cloudflare',
    'Access denied | Cloudflare',
    'Sorry, you have been blocked',
  ];
  if (cfMarkers.some((m) => title.includes(m))) {
    return {
      code: 'cloudflare_challenge',
      reason: 'Site is behind a Cloudflare bot challenge — cannot score automatically.',
      hint: 'Try a different URL, or use the `slop-detect` CLI locally with a real browser session.',
    };
  }

  // Other anti-bot vendors
  if (/access denied|forbidden|akamai/i.test(title) && visibleCount < 20) {
    return {
      code: 'access_blocked',
      reason: `Site refused the scan (title: "${title.slice(0, 80)}")`,
      hint: 'The target is blocking automated requests. Try the CLI from your machine.',
    };
  }

  // Empty / dead page (no title, no h1, no visible content) — usually means
  // the page never finished rendering inside the headless runtime, OR the site
  // is gating content behind a JS auth wall. ChatGPT/Cursor/etc do this.
  const noContent = !title && !h1;
  const sparseDom = visibleCount < 10 || patternsWithEvidence < 4;
  if (noContent || sparseDom) {
    return {
      code: 'empty_page',
      reason: 'Target page rendered no scannable content (no title, no H1, or empty DOM).',
      hint: 'The site likely requires sign-in, uses heavy client-side hydration, or blocks headless browsers. Try a public marketing URL instead.',
    };
  }

  return null;
}

// ── Page-side script assembler ──────────────────────────────────────────────
// Reconciled from scan.ts: includes the esbuild __name polyfill required when
// wrangler bundles named pattern extractors (harmless no-op for Playwright CLI).
export function buildPageScript(opts: BuildPageScriptOptions = {}): string {
  const patternCalls = PATTERNS.map(
    (p) => `
    try {
      signals[${JSON.stringify(p.id)}] = (${p.extract.toString()})(ctx);
    } catch (e) {
      signals[${JSON.stringify(p.id)}] = { triggered: false, error: e.message };
    }`
  ).join('\n');

  return `(() => {
    // Polyfill esbuild's __name helper (wrangler bundles named fns wrapped with it).
    const __name = (fn) => fn;
    ${createColorHelpers.toString()}
    ${createVisibilityHelpers.toString()}
    ${isSlopFont.toString()}
    ${isAccentSerif.toString()}
    const SLOP_FONT_PREFIXES = ${JSON.stringify(SLOP_FONT_PREFIXES)};
    const ACCENT_SERIF_PREFIXES = ${JSON.stringify(ACCENT_SERIF_PREFIXES)};

    const colorHelpers = createColorHelpers();
    const visHelpers = createVisibilityHelpers();
    const visible = visHelpers.getVisible(document.body, 4000);

    let h1 = null;
    for (const el of document.querySelectorAll('h1')) {
      if (visHelpers.isVisible(el)) { h1 = el; break; }
    }

    const ctx = {
      visible, h1,
      parseColor: colorHelpers.parseColor,
      rgbToHsl: colorHelpers.rgbToHsl,
      isPurple: colorHelpers.isPurple,
      isDark: colorHelpers.isDark,
      isMidGrey: colorHelpers.isMidGrey,
      relativeLuminance: colorHelpers.relativeLuminance,
      contrastRatio: colorHelpers.contrastRatio,
      channelSpread: colorHelpers.channelSpread,
      effectiveBackground: colorHelpers.effectiveBackground,
      isSlopFont, isAccentSerif,
      SLOP_FONT_PREFIXES, ACCENT_SERIF_PREFIXES,
      // inHero is consumed by the declarative rules engine for heroOnly specs.
      // isVisible / inViewport / isNeutral were never consumed by any pattern,
      // so they are omitted (the visible array is already pre-filtered).
      inHero: visHelpers.inHero
    };

    const signals = {};
    ${patternCalls}

    // Copy axis: extract page text in-DOM (scored caller-side by scoreCopy).
    const extractTextContext = ${extractTextContext.toString()};
    let textContext = null;
    try { textContext = extractTextContext(); } catch (e) { textContext = { error: e.message }; }

    // System axis: observe fonts/colors/radii (scored caller-side).
    let systemContext = null;
    ${
      opts.includeSystem
        ? `
    const extractSystemContext = ${extractSystemContext.toString()};
    try { systemContext = extractSystemContext(); } catch (e) { systemContext = { error: e.message }; }
    `
        : ''
    }

    return {
      title: document.title,
      url: location.href,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      docHeight: document.documentElement.scrollHeight,
      h1Text: h1 ? h1.textContent.trim().slice(0, 120) : null,
      h1Font: h1 ? getComputedStyle(h1).fontFamily : null,
      visibleCount: visible.length,
      signals,
      textContext,
      systemContext
    };
  })();`;
}
