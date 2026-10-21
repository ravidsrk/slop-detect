// Craft-floor axis (F-00..F-09, issues #255..#264).
//
// Measures basic web engineering, responsive layout, contrast, and interaction
// hygiene on a 0-100 scale (HIGHER is better: 100 = no craft defects).
//
// HARD RULE (roadmap §3 / F-00): Craft-floor findings live in this separate
// catalogue and score. They MUST NEVER feed the design score, copy score, or
// Clean / Mild / Heavy tiers.

export interface CraftCheckMeta {
  id: string;
  label: string;
  weight: number;
  category: string;
  severity?: 'error' | 'warning' | 'info';
  status: 'active' | 'rising' | 'decaying' | 'historical' | 'retired' | 'experimental' | 'review';
  evidenceGrade: 'measured' | 'standard' | 'practitioner' | 'hypothesis';
  era: string;
  modelFamilies: string[];
  lastValidatedIn: string;
  likelihoodRatio: number | null;
  fpRate: number | null;
  fpRatePre2022: number | null;
  extract: (ctx: any) => any;
}

const GENERIC_LABELS = new Set([
  'learn more',
  'read more',
  'click here',
  'more',
  'here',
  'submit',
  'click',
]);

const PLACEHOLDER_ALT_NAMES = new Set(['image', 'photo', 'picture', 'placeholder']);

// Pure helper for F-02 (#257) mobile reflow failure evaluation.
export function evaluateMobileReflow(input: {
  viewportWidth?: number;
  scrollWidth?: number;
  bodyBg?: { r: number; g: number; b: number; a?: number } | null;
  elements?: Array<{
    tag?: string;
    text?: string;
    rect: { left: number; top: number; right: number; bottom: number; width: number; height: number };
    opacity?: number;
    bg?: { r: number; g: number; b: number; a?: number } | null;
    hasBorder?: boolean;
    inScrollableX?: boolean;
    inMarquee?: boolean;
    parentRect?: { left: number; right: number; overflowX?: string } | null;
    parentId?: string;
  }>;
}) {
  const vw = input.viewportWidth || 390;
  const sw = input.scrollWidth ?? vw;
  const bodyBg = input.bodyBg || { r: 255, g: 255, b: 255, a: 1 };
  const els = Array.isArray(input.elements) ? input.elements : [];

  const isExcludedTag = (tag?: string) =>
    /^(table|thead|tbody|tr|td|th|pre|code|canvas|svg)$/i.test(String(tag || ''));

  // Non-Observable Issue (NOI) filter (arXiv 2603.11535):
  // Drop elements with opacity <= 0.01, transparent bg with no text/border,
  // or background identical to body with no text/border.
  const isObservable = (el: any) => {
    if (typeof el.opacity === 'number' && el.opacity <= 0.01) return false;
    const hasText = Boolean(el.text && String(el.text).trim().length > 0);
    const hasBorder = Boolean(el.hasBorder);
    const bg = el.bg;
    const hasOpaqueBg = Boolean(bg && (bg.a ?? 1) >= 0.05);
    if (!hasOpaqueBg && !hasText && !hasBorder) return false;
    if (hasOpaqueBg && !hasText && !hasBorder && bodyBg) {
      const dr = Math.abs((bg.r ?? 255) - (bodyBg.r ?? 255));
      const dg = Math.abs((bg.g ?? 255) - (bodyBg.g ?? 255));
      const db = Math.abs((bg.b ?? 255) - (bodyBg.b ?? 255));
      if (Math.max(dr, dg, db) <= 3) return false;
    }
    return true;
  };

  const viewportProtrusions: string[] = [];
  const elementProtrusions: string[] = [];
  const collisions: string[] = [];

  const observableEls = els.filter((el) => {
    if (!el || !el.rect) return false;
    if (el.inScrollableX || el.inMarquee) return false;
    if (isExcludedTag(el.tag)) return false;
    return isObservable(el);
  });

  for (const el of observableEls) {
    if (el.rect.right > vw + 8) {
      viewportProtrusions.push((el.text || el.tag || 'element').slice(0, 40));
    }
    if (
      el.parentRect &&
      !/^(auto|scroll|hidden|clip)$/i.test(String(el.parentRect.overflowX || 'visible')) &&
      el.rect.right > el.parentRect.right + 4
    ) {
      elementProtrusions.push((el.text || el.tag || 'element').slice(0, 40));
    }
  }

  // Sibling text-bearing box collisions (> 4 px^2 overlap)
  const textBoxes = observableEls.filter((el) => el.text && String(el.text).trim().length > 0);
  for (let i = 0; i < textBoxes.length; i++) {
    for (let j = i + 1; j < textBoxes.length; j++) {
      const a = textBoxes[i];
      const b = textBoxes[j];
      if (a.parentId && b.parentId && a.parentId !== b.parentId) continue;
      const ox = Math.max(0, Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left));
      const oy = Math.max(0, Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top));
      if (ox > 2 && oy > 2 && ox * oy > 4) {
        collisions.push(`${String(a.text).slice(0, 20)} × ${String(b.text).slice(0, 20)}`);
      }
    }
  }

  const pageOverflowPx = Math.max(0, Math.round(sw - vw));
  // Page overflow triggers when > 8px AND either no elements were passed or at least one observable protrusion exists
  const pageOverflow =
    pageOverflowPx > 8 && (els.length === 0 || viewportProtrusions.length > 0);

  const subtypes: string[] = [];
  if (pageOverflow) subtypes.push('page_overflow');
  if (viewportProtrusions.length > 0) subtypes.push('viewport_protrusion');
  if (elementProtrusions.length > 0) subtypes.push('element_protrusion');
  if (collisions.length > 0) subtypes.push('element_collision');

  return {
    triggered: subtypes.length > 0,
    subtypes,
    pageOverflowPx,
    viewportProtrusions: viewportProtrusions.slice(0, 5),
    elementProtrusions: elementProtrusions.slice(0, 5),
    collisions: collisions.slice(0, 5),
  };
}

// Pure helper for F-03 (#258) keyboard focus indicator evaluation.
export function evaluateFocusIndicators(
  items: Array<{
    tag?: string;
    text?: string;
    hasVisibleFocusIndicator?: boolean;
    outlineWidth?: string | number;
    outlineStyle?: string;
    boxShadow?: string;
    borderChanged?: boolean;
    backgroundChanged?: boolean;
    hasPseudoFocusRing?: boolean;
    pseudoFocusRing?: boolean;
    afterFocusRing?: boolean;
    beforeFocusRing?: boolean;
  }>,
) {
  if (!Array.isArray(items) || items.length === 0) {
    return { triggered: false, probedCount: 0, missingFirst5: 0, missingCount: 0, missingRatio: 0 };
  }
  const hasIndicator = (x: any): boolean => {
    if (!x) return false;
    const hasPseudo = Boolean(
      x.hasPseudoFocusRing || x.pseudoFocusRing || x.afterFocusRing || x.beforeFocusRing,
    );
    if (hasPseudo) return true;
    if (typeof x.hasVisibleFocusIndicator === 'boolean') {
      return x.hasVisibleFocusIndicator;
    }
    const outlineStyle = String(x.outlineStyle ?? '').toLowerCase();
    const outlineWidth = parseFloat(String(x.outlineWidth ?? '0')) || 0;
    const hasOutline = outlineStyle !== '' && outlineStyle !== 'none' && outlineWidth > 0;
    const hasBoxShadow = Boolean(x.boxShadow && x.boxShadow !== 'none');
    const hasReplacement = hasBoxShadow || Boolean(x.borderChanged) || Boolean(x.backgroundChanged);
    return hasOutline || hasReplacement;
  };
  const capped = items.slice(0, 15);
  const first5 = capped.slice(0, 5);
  const missingFirst5 = first5.filter((x) => !hasIndicator(x)).length;
  const missingCount = capped.filter((x) => !hasIndicator(x)).length;
  const missingRatio = Math.round((missingCount / capped.length) * 100) / 100;
  // One missing visible focus indicator among the first five controls triggers (#258).
  const triggered = missingFirst5 >= 1 || (capped.length >= 2 && missingRatio >= 0.5);
  return {
    triggered,
    probedCount: capped.length,
    missingFirst5,
    missingCount,
    missingRatio,
    samples: capped
      .filter((x) => !hasIndicator(x))
      .slice(0, 5)
      .map((x) => x.text || x.tag || 'control'),
  };
}

// Pure helper for F-05 (#260) dead CTA evaluation.
export function evaluateDeadCtas(
  ctas: Array<{
    text?: string;
    href?: string | null;
    inHero?: boolean;
    urlChanged?: boolean;
    hashChanged?: boolean;
    domMutated?: boolean;
    dialogOpened?: boolean;
    focusMoved?: boolean;
    networkTriggered?: boolean;
    hasHandler?: boolean;
  }>,
) {
  if (!Array.isArray(ctas) || ctas.length === 0) {
    return {
      triggered: false,
      probedCount: 0,
      deadCount: 0,
      deadRatio: 0,
      heroCtaDead: false,
      placeholderHrefs: 0,
    };
  }
  const capped = ctas.slice(0, 12);
  let deadCount = 0;
  let heroCtaDead = false;
  let placeholderHrefs = 0;
  const deadSamples: string[] = [];

  for (const cta of capped) {
    const href = typeof cta.href === 'string' ? cta.href.trim() : null;
    const isPlaceholderHref = href === '#' || href === '' || /^javascript:\s*(?:void\(0\)|;)?$/i.test(href || '');
    if (isPlaceholderHref) placeholderHrefs++;

    const hadEffect = Boolean(
      cta.urlChanged ||
        cta.hashChanged ||
        cta.domMutated ||
        cta.dialogOpened ||
        cta.focusMoved ||
        cta.networkTriggered ||
        cta.hasHandler ||
        (href && !isPlaceholderHref),
    );
    if (!hadEffect) {
      deadCount++;
      if (cta.inHero) heroCtaDead = true;
      deadSamples.push((cta.text || href || 'CTA').slice(0, 40));
    }
  }

  const deadRatio = Math.round((deadCount / capped.length) * 100) / 100;
  const triggered = heroCtaDead || deadRatio >= 0.3;
  return {
    triggered,
    probedCount: capped.length,
    deadCount,
    deadRatio,
    heroCtaDead,
    placeholderHrefs,
    samples: deadSamples.slice(0, 5),
  };
}

// Pure helper for F-09 (#264) form empty-submit failure feedback.
export function evaluateFormFailureFeedback(
  probe:
    | {
        formPresent?: boolean;
        submittedEmpty?: boolean;
        submittedInvalid?: boolean;
        probed?: boolean;
        hasInvalidPseudo?: boolean;
        hasRequiredField?: boolean;
        nativeInvalid?: boolean;
        hasAriaInvalid?: boolean;
        hasInvalidAria?: boolean;
        hasVisibleErrorText?: boolean;
        visibleErrorCount?: number;
        errorMessageShown?: boolean;
        requestBlocked?: boolean;
        hasSubmitHandler?: boolean;
        preventedDefault?: boolean;
      }
    | null
    | undefined,
) {
  if (!probe || probe.formPresent === false) {
    return { triggered: false, status: 'na' as const, requestsMade: 0 };
  }
  const wasProbed = Boolean(probe.submittedEmpty || probe.submittedInvalid || probe.probed);
  if (!wasProbed) {
    // An unprobed form must be 'unknown' or 'na', NEVER 'pass' (#264).
    return {
      triggered: false,
      status: 'unknown' as const,
      reason: 'form_not_probed',
      requestsMade: 0,
    };
  }
  // required/pattern/aria-* alone are not a probe result. Pass only when the
  // probe observed native :invalid (hasInvalidPseudo / nativeInvalid) or another
  // explicit feedback signal. hasRequiredField must not count as feedback.
  const hasInvalidPseudo = Boolean(probe.hasInvalidPseudo || probe.nativeInvalid);
  const hasAriaInvalid = Boolean(probe.hasAriaInvalid || probe.hasInvalidAria);
  const hasVisibleErrorText = Boolean(
    probe.hasVisibleErrorText ||
      (probe.visibleErrorCount ?? 0) > 0 ||
      probe.errorMessageShown,
  );
  const hasHandler = Boolean(
    probe.requestBlocked || probe.hasSubmitHandler || probe.preventedDefault,
  );
  const hasFeedback =
    hasInvalidPseudo || hasAriaInvalid || hasVisibleErrorText || hasHandler;
  return {
    triggered: !hasFeedback,
    status: (hasFeedback ? 'pass' : 'fail') as 'pass' | 'fail',
    hasInvalidPseudo,
    hasAriaInvalid,
    hasVisibleErrorText,
    requestBlocked: Boolean(probe.requestBlocked),
    requestsMade: 0,
  };
}

// F-07 (#262): Optional axe-core adapter (off by default, never scored).
export function formatAxeReport(
  axeResults: {
    violations?: Array<{
      id: string;
      impact?: string | null;
      nodes?: unknown[];
      helpUrl?: string;
    }>;
  } | null | undefined,
  opts: { enabled?: boolean } = {},
) {
  if (!opts.enabled || !axeResults) return null;
  const violations = Array.isArray(axeResults.violations) ? axeResults.violations : [];
  return {
    enabled: true,
    scored: false,
    violationCount: violations.length,
    rules: violations.map((v) => ({
      ruleId: v.id,
      impact: v.impact || 'minor',
      nodeCount: Array.isArray(v.nodes) ? v.nodes.length : 0,
      helpUrl: v.helpUrl || '',
    })),
    disclaimer:
      'Automated axe-core findings only (partial coverage; does not establish WCAG conformance and never changes any score).',
  };
}

export const CRAFT_CHECKS: CraftCheckMeta[] = [
  {
    id: 'gray_on_color',
    label: 'Neutral grey text on a colored background',
    weight: 10,
    category: 'contrast',
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2024-gpt4',
    modelFamilies: ['generic-template'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible, parseColor, rgbToHsl, channelSpread, effectiveBackground } = ctx;
      let count = 0;
      const samples: Array<{ text: string; fgSpread: number; bgSpread: number }> = [];
      for (const el of visible) {
        if (!/^(P|SPAN|DIV|LI|A|SMALL|LABEL|H[1-6]|TD|TH)$/.test(el.tagName)) continue;
        let direct = '';
        for (const n of el.childNodes) if (n.nodeType === 3) direct += n.nodeValue;
        direct = direct.trim();
        if (direct.length < 3) continue;
        const cs = getComputedStyle(el);
        const fg = parseColor(cs.color);
        if (!fg || fg.a < 0.5) continue;
        const fgSpread = channelSpread(fg);
        const fgHsl = rgbToHsl(fg);
        if (!fgHsl || fgSpread >= 25 || fgHsl.l < 0.25 || fgHsl.l > 0.78) continue;
        const bg = effectiveBackground(el);
        if (!bg || bg._approx) continue;
        const bgSpread = channelSpread(bg);
        const bgHsl = rgbToHsl(bg);
        if (!bgHsl || bgSpread < 30 || bgHsl.s < 0.2) continue;
        count++;
        if (samples.length < 3) {
          samples.push({ text: direct.slice(0, 40), fgSpread, bgSpread });
        }
      }
      return { count, samples, triggered: count >= 3 };
    },
  },
  {
    id: 'wide_body_tracking',
    label: 'Wide letter-spacing on body text (>0.05em)',
    weight: 8,
    category: 'typography',
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2024-gpt4',
    modelFamilies: ['generic-template'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible } = ctx;
      let count = 0;
      const samples: Array<{ text: string; em: number }> = [];
      for (const el of visible) {
        if (!/^(P|LI|BLOCKQUOTE|DD)$/.test(el.tagName)) continue;
        const txt = (el.textContent || '').trim();
        if (txt.length < 60) continue;
        const cs = getComputedStyle(el);
        if (cs.textTransform === 'uppercase') continue;
        if (txt === txt.toUpperCase() && /[A-Z]/.test(txt)) continue;
        const fs = parseFloat(cs.fontSize);
        const ls = parseFloat(cs.letterSpacing);
        if (!fs || fs > 22 || Number.isNaN(ls) || ls <= 0) continue;
        const em = ls / fs;
        if (em > 0.05) {
          count++;
          if (samples.length < 3) {
            samples.push({ text: txt.slice(0, 40), em: Math.round(em * 1000) / 1000 });
          }
        }
      }
      return { count, samples, triggered: count >= 2 };
    },
  },
  {
    id: 'viewport_meta_missing',
    label: 'Missing responsive <meta name="viewport"> with width=device-width',
    weight: 15,
    category: 'viewport',
    status: 'active',
    evidenceGrade: 'standard',
    era: 'baseline',
    modelFamilies: [],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: () => {
      const meta = document.querySelector('meta[name="viewport" i]');
      const content = meta ? (meta.getAttribute('content') || '').trim() : '';
      const hasDeviceWidth = /width\s*=\s*device-width/i.test(content);
      return {
        present: Boolean(meta),
        content,
        triggered: !meta || !hasDeviceWidth,
      };
    },
  },
  {
    id: 'zoom_disabled',
    label: 'Pinch-to-zoom disabled via user-scalable=no or maximum-scale < 2',
    weight: 15,
    category: 'viewport',
    status: 'active',
    evidenceGrade: 'standard',
    era: 'baseline',
    modelFamilies: [],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: () => {
      const meta = document.querySelector('meta[name="viewport" i]');
      const content = meta ? (meta.getAttribute('content') || '').trim() : '';
      if (!content) return { content: '', triggered: false };
      const userScalableNo = /user-scalable\s*=\s*(?:no|0)\b/i.test(content);
      const maxScaleMatch = content.match(/maximum-scale\s*=\s*([0-9]+(?:\.[0-9]+)?)/i);
      const maxScale = maxScaleMatch ? parseFloat(maxScaleMatch[1]) : null;
      const triggered = userScalableNo || (maxScale !== null && maxScale < 2);
      return {
        content,
        userScalableNo,
        maxScale,
        triggered,
      };
    },
  },
  {
    id: 'mobile_reflow_failure',
    label: 'Horizontal overflow, protrusion, or text box collision (RLF taxonomy)',
    weight: 20,
    category: 'responsive',
    status: 'active',
    evidenceGrade: 'standard',
    era: 'baseline',
    modelFamilies: [],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible, parseColor } = ctx;
      const vw = window.innerWidth || 1280;
      const sw = document.documentElement ? document.documentElement.scrollWidth : vw;
      const bodyBg = parseColor(getComputedStyle(document.body).backgroundColor) || {
        r: 255,
        g: 255,
        b: 255,
        a: 1,
      };
      const viewportProtrusions: string[] = [];
      const elementProtrusions: string[] = [];
      const collisions: string[] = [];
      const textBoxes: Array<{ el: any; rect: any; parent: any; text: string }> = [];

      const hasScrollableAncestor = (el: any) => {
        let cur = el.parentElement;
        let g = 0;
        while (cur && g++ < 25) {
          const cs = getComputedStyle(cur);
          if (/^(auto|scroll|hidden|clip)$/i.test(cs.overflowX || '')) return true;
          if (cs.scrollSnapType && cs.scrollSnapType !== 'none') return true;
          if (/marquee/i.test(cur.className || '') || /marquee/i.test(cs.animationName || '')) {
            return true;
          }
          cur = cur.parentElement;
        }
        return false;
      };

      for (const el of visible) {
        if (/^(TABLE|THEAD|TBODY|TR|TD|TH|PRE|CODE|CANVAS|SVG)$/i.test(el.tagName)) continue;
        if (hasScrollableAncestor(el)) continue;
        const cs = getComputedStyle(el);
        const op = parseFloat(cs.opacity || '1');
        if (op <= 0.01) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;

        let directText = '';
        for (const n of el.childNodes) if (n.nodeType === 3) directText += n.nodeValue;
        directText = directText.trim();
        const bg = parseColor(cs.backgroundColor);
        const hasBorder =
          parseFloat(cs.borderTopWidth) > 0 ||
          parseFloat(cs.borderRightWidth) > 0 ||
          parseFloat(cs.borderBottomWidth) > 0 ||
          parseFloat(cs.borderLeftWidth) > 0;

        // NOI filter: skip invisible/unpainted boxes with no text or border
        const hasOpaqueBg = Boolean(bg && bg.a >= 0.05);
        if (!hasOpaqueBg && !directText && !hasBorder) continue;
        if (hasOpaqueBg && !directText && !hasBorder && bodyBg) {
          const dr = Math.abs(bg.r - bodyBg.r);
          const dg = Math.abs(bg.g - bodyBg.g);
          const db = Math.abs(bg.b - bodyBg.b);
          if (Math.max(dr, dg, db) <= 3) continue;
        }

        if (rect.right > vw + 8) {
          viewportProtrusions.push((directText || el.tagName).slice(0, 40));
        }
        const p = el.parentElement;
        if (p) {
          const pcs = getComputedStyle(p);
          if (!/^(auto|scroll|hidden|clip)$/i.test(pcs.overflowX || '')) {
            const pr = p.getBoundingClientRect();
            if (pr.width > 0 && rect.right > pr.right + 4) {
              elementProtrusions.push((directText || el.tagName).slice(0, 40));
            }
          }
        }
        if (directText.length > 0 && textBoxes.length < 80) {
          textBoxes.push({ el, rect, parent: el.parentElement, text: directText });
        }
      }

      for (let i = 0; i < textBoxes.length; i++) {
        for (let j = i + 1; j < textBoxes.length; j++) {
          const a = textBoxes[i];
          const b = textBoxes[j];
          if (a.parent !== b.parent) continue;
          const ox = Math.max(0, Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left));
          const oy = Math.max(0, Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top));
          if (ox > 2 && oy > 2 && ox * oy > 4) {
            collisions.push(`${a.text.slice(0, 20)} × ${b.text.slice(0, 20)}`);
          }
        }
      }

      const pageOverflowPx = Math.max(0, Math.round(sw - vw));
      const pageOverflow = pageOverflowPx > 8 && viewportProtrusions.length > 0;
      const subtypes: string[] = [];
      if (pageOverflow) subtypes.push('page_overflow');
      if (viewportProtrusions.length > 0) subtypes.push('viewport_protrusion');
      if (elementProtrusions.length > 0) subtypes.push('element_protrusion');
      if (collisions.length > 0) subtypes.push('element_collision');

      return {
        triggered: subtypes.length > 0,
        subtypes,
        pageOverflowPx,
        viewportProtrusions: viewportProtrusions.slice(0, 5),
        elementProtrusions: elementProtrusions.slice(0, 5),
        collisions: collisions.slice(0, 5),
      };
    },
  },
  {
    id: 'focus_indicator_missing',
    label: 'Interactive elements missing a visible keyboard focus indicator',
    weight: 12,
    category: 'interaction',
    status: 'active',
    evidenceGrade: 'standard',
    era: 'baseline',
    modelFamilies: [],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible } = ctx;
      const vh = window.innerHeight || 900;
      const focusables = visible
        .filter((el: any) => {
          if (!/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && !el.hasAttribute('tabindex')) {
            return false;
          }
          if (el.tagName === 'A' && !el.hasAttribute('href')) return false;
          if (el.disabled || el.getAttribute('tabindex') === '-1') return false;
          const r = el.getBoundingClientRect();
          return r.top < vh * 2 && r.width > 0 && r.height > 0;
        })
        .slice(0, 15);

      if (focusables.length === 0) {
        return { triggered: false, probedCount: 0, missingFirst5: 0, missingRatio: 0 };
      }

      // Check stylesheet rules for explicit outline: none / 0 without focus replacement.
      // A :focus::after / :focus::before ring applies only to elements that match
      // that rule's selector. One card rule must not clear every control on the page.
      let globalOutlineSuppressed = false;
      const pseudoFocusRingSelectors: string[] = [];
      try {
        for (const sheet of Array.from(document.styleSheets)) {
          let rules: any;
          try {
            rules = (sheet as CSSStyleSheet).cssRules;
          } catch {
            continue;
          }
          if (!rules) continue;
          for (const rule of Array.from(rules) as any[]) {
            const sel = String(rule.selectorText || '');
            const cssText = String(rule.cssText || '');
            if (/:focus(?:-visible)?::(?:after|before)/i.test(sel) && /outline|box-shadow|border/i.test(cssText)) {
              pseudoFocusRingSelectors.push(sel);
            }
            if (
              /:focus/.test(sel) &&
              /outline\s*:\s*(?:none|0(?:px)?)\b/i.test(cssText) &&
              !/box-shadow|border-color|ring/i.test(cssText)
            ) {
              globalOutlineSuppressed = true;
            }
          }
        }
      } catch {
        // ignore cross-origin stylesheet errors
      }

      const matchesPseudoFocusSelector = (el: any, sel: string) => {
        const chunks = String(sel).split(',');
        for (const chunk of chunks) {
          const base = chunk
            .replace(/::(?:before|after)\b/gi, '')
            .replace(/:focus-visible\b/gi, '')
            .replace(/:focus\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
          if (!base || base === '*') return true;
          try {
            if (typeof el.matches === 'function' && el.matches(base)) return true;
          } catch {
            // ignore a selector the browser cannot match
          }
        }
        return false;
      };

      let missingFirst5 = 0;
      let missingCount = 0;
      focusables.forEach((el: any, idx: number) => {
        const cs = getComputedStyle(el);
        let hasPseudoRing =
          el.getAttribute?.('data-pseudo-focus-ring') === 'true' ||
          pseudoFocusRingSelectors.some((sel) => matchesPseudoFocusSelector(el, sel));
        if (!hasPseudoRing) {
          try {
            const afterCs = getComputedStyle(el, '::after');
            const beforeCs = getComputedStyle(el, '::before');
            if (
              (afterCs && ((afterCs.boxShadow && afterCs.boxShadow !== 'none') || (afterCs.outlineStyle && afterCs.outlineStyle !== 'none' && parseFloat(afterCs.outlineWidth) > 0))) ||
              (beforeCs && ((beforeCs.boxShadow && beforeCs.boxShadow !== 'none') || (beforeCs.outlineStyle && beforeCs.outlineStyle !== 'none' && parseFloat(beforeCs.outlineWidth) > 0)))
            ) {
              hasPseudoRing = true;
            }
          } catch {}
        }
        const inlineOutlineNone =
          el.style && (el.style.outline === 'none' || el.style.outline === '0' || el.style.outlineWidth === '0px');
        const inlineHasReplacement =
          Boolean(el.style && ((el.style.boxShadow && el.style.boxShadow !== 'none') || el.style.borderColor));
        const classSuppressesFocus =
          /\bfocus:outline-none\b/.test(String(el.className || '')) &&
          !/\bfocus(?:-visible)?:ring\b|\bfocus(?:-visible)?:border\b|\bfocus(?:-visible)?:after:ring\b/.test(
            String(el.className || ''),
          );
        const noIndicator =
          !hasPseudoRing &&
          ((inlineOutlineNone && !inlineHasReplacement) ||
            classSuppressesFocus ||
            (globalOutlineSuppressed && cs.outlineStyle === 'none'));
        if (noIndicator) {
          missingCount++;
          if (idx < 5) missingFirst5++;
        }
      });

      const missingRatio = Math.round((missingCount / focusables.length) * 100) / 100;
      const triggered = missingFirst5 >= 1 || (focusables.length >= 2 && missingRatio >= 0.5);
      return {
        triggered,
        probedCount: focusables.length,
        missingFirst5,
        missingCount,
        missingRatio,
      };
    },
  },
  {
    id: 'content_stuck_hidden',
    label: 'Page content stuck at opacity 0 or visibility:hidden after load/scroll',
    weight: 10,
    category: 'motion',
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2025-v0',
    modelFamilies: [],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: () => {
      const stuck: string[] = [];
      const all = document.body ? document.body.querySelectorAll('p, h1, h2, h3, h4, li, section, article, div') : [];
      let checked = 0;
      for (const el of Array.from(all)) {
        if (checked++ > 1500) break;
        if (el.closest('details:not([open]), [hidden], [aria-hidden="true"], [role="tabpanel"][hidden], script, style, noscript, template')) {
          continue;
        }
        const tabpanel = el.closest('[role="tabpanel"]');
        if (tabpanel && tabpanel.id) {
          const tab = document.querySelector(`[aria-controls="${CSS.escape(tabpanel.id)}"]`);
          if (tab && tab.getAttribute('aria-selected') === 'false') continue;
        }
        let direct = '';
        for (const n of Array.from(el.childNodes) as any[]) {
          if (n.nodeType === 3) direct += n.nodeValue;
        }
        const words = direct.trim().split(/\s+/).filter(Boolean);
        if (words.length < 3) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none') continue;
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        const op = parseFloat(cs.opacity || '1');
        if (op <= 0.01 || cs.visibility === 'hidden') {
          stuck.push(direct.trim().slice(0, 60));
        }
      }
      return {
        count: stuck.length,
        samples: stuck.slice(0, 5),
        triggered: stuck.length >= 1,
      };
    },
  },
  {
    id: 'dead_cta_controls',
    label: 'Primary or repeated CTA controls produce no navigation or state change',
    weight: 10,
    category: 'interaction',
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2025-v0',
    modelFamilies: [],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible, inHero } = ctx;
      const vh = window.innerHeight || 900;
      const candidates = visible
        .filter((el: any) => {
          if (!/^(A|BUTTON)$/.test(el.tagName) && el.getAttribute('role') !== 'button') return false;
          if (el.disabled || el.getAttribute('aria-disabled') === 'true') return false;
          const r = el.getBoundingClientRect();
          if (r.top >= vh * 2 || r.width < 30 || r.height < 20) return false;
          const txt = (el.textContent || '').trim();
          if (!txt || txt.length > 50) return false;
          if (/delete|remove|logout|sign out/i.test(txt)) return false;
          const href = el.getAttribute('href') || '';
          if (/^(?:mailto:|tel:|javascript:)/i.test(href) && !/^javascript:\s*(?:void\(0\)|;)?$/i.test(href)) {
            return false;
          }
          if (el.hasAttribute('download')) return false;
          return true;
        })
        .slice(0, 12);

      if (candidates.length === 0) {
        return {
          triggered: false,
          probedCount: 0,
          deadCount: 0,
          deadRatio: 0,
          heroCtaDead: false,
          placeholderHrefs: 0,
        };
      }

      let deadCount = 0;
      let heroCtaDead = false;
      let placeholderHrefs = 0;
      const samples: string[] = [];

      for (const el of candidates) {
        const href = el.tagName === 'A' ? (el.getAttribute('href') ?? '').trim() : null;
        const isPlaceholder =
          href !== null && (href === '' || href === '#' || /^javascript:\s*(?:void\(0\)|;)?$/i.test(href));
        if (isPlaceholder) placeholderHrefs++;

        const hasInteractiveAttr =
          el.hasAttribute('onclick') ||
          el.hasAttribute('aria-controls') ||
          el.hasAttribute('aria-expanded') ||
          el.hasAttribute('aria-haspopup') ||
          el.hasAttribute('data-state') ||
          Boolean(el.closest('form'));

        const isDead =
          (el.tagName === 'A' && isPlaceholder && !hasInteractiveAttr) ||
          (el.tagName !== 'A' && !hasInteractiveAttr && el.getAttribute('data-dead-cta') === 'true');

        if (isDead) {
          deadCount++;
          if (inHero(el)) heroCtaDead = true;
          samples.push((el.textContent || '').trim().slice(0, 40));
        }
      }

      const deadRatio = Math.round((deadCount / candidates.length) * 100) / 100;
      const triggered = heroCtaDead || deadRatio >= 0.3;
      return {
        triggered,
        probedCount: candidates.length,
        deadCount,
        deadRatio,
        heroCtaDead,
        placeholderHrefs,
        samples: samples.slice(0, 5),
      };
    },
  },
  {
    id: 'reduced_motion_ignored',
    label: 'Continuous decorative animations remain active under prefers-reduced-motion: reduce',
    weight: 0,
    severity: 'info',
    category: 'motion',
    status: 'review',
    evidenceGrade: 'standard',
    era: 'baseline',
    modelFamilies: [],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible } = ctx;
      const reducedMatches =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let activeInfinite = 0;
      for (const el of visible) {
        const r = el.getBoundingClientRect();
        if (r.width < 48 && r.height < 48 && /spin|load/i.test(String(el.className || ''))) continue;
        if (el.getAttribute('role') === 'status' || el.getAttribute('aria-busy') === 'true') continue;
        const cs = getComputedStyle(el);
        const dur = parseFloat(cs.animationDuration || '0') * (cs.animationDuration?.includes('ms') ? 1 : 1000);
        if (
          cs.animationName &&
          cs.animationName !== 'none' &&
          cs.animationPlayState !== 'paused' &&
          (cs.animationIterationCount === 'infinite' || dur > 500)
        ) {
          activeInfinite++;
        }
      }
      return {
        reducedMotionQueried: reducedMatches,
        activeInfinite,
        severity: 'info',
        triggered: Boolean(reducedMatches && activeInfinite > 0),
      };
    },
  },
  {
    id: 'generic_control_labels',
    label: 'Ambiguous generic link/button accessible names ("learn more", "click here") or filename alt text',
    weight: 10,
    category: 'a11y',
    status: 'active',
    evidenceGrade: 'standard',
    era: 'baseline',
    modelFamilies: [],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible } = ctx;
      const genericLabels = new Set([
        'learn more',
        'read more',
        'click here',
        'more',
        'here',
        'get started',
        'submit',
        'go',
        'link',
        'button',
        'details',
        'view more',
        'see more',
      ]);
      const placeholderAltNames = new Set([
        'image',
        'photo',
        'picture',
        'graphic',
        'icon',
        'logo',
        'hero',
        'hero image',
        'banner',
        'screenshot',
        'placeholder',
        'untitled',
        'img',
        'pic',
        'avatar',
        'thumbnail',
      ]);
      const genericHits: Array<{ name: string; target: string }> = [];
      const badAlts: string[] = [];

      const getAccName = (el: any): string => {
        const ariaLabel = (el.getAttribute('aria-label') || '').trim();
        if (ariaLabel) return ariaLabel.toLowerCase();
        const labelledBy = (el.getAttribute('aria-labelledby') || '').trim();
        if (labelledBy) {
          const parts = labelledBy
            .split(/\s+/)
            .map((id: string) => document.getElementById(id)?.textContent?.trim() || '')
            .filter(Boolean);
          if (parts.length > 0) return parts.join(' ').toLowerCase();
        }
        const describedBy = (el.getAttribute('aria-describedby') || '').trim();
        const baseText = (el.textContent || '').trim().toLowerCase();
        if (describedBy) {
          const desc = describedBy
            .split(/\s+/)
            .map((id: string) => document.getElementById(id)?.textContent?.trim() || '')
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (desc) return `${baseText} ${desc}`.trim();
        }
        return baseText;
      };

      for (const el of visible) {
        if (el.tagName === 'IMG') {
          const alt = (el.getAttribute('alt') || '').trim();
          if (!alt) continue;
          const lowerAlt = alt.toLowerCase();
          const src = (el.getAttribute('src') || '').split('?')[0].split('/').pop() || '';
          if (
            placeholderAltNames.has(lowerAlt) ||
            (src && lowerAlt === src.toLowerCase()) ||
            /\.(?:png|jpe?g|webp|gif|svg|avif)$/i.test(alt)
          ) {
            badAlts.push(alt.slice(0, 40));
          }
          continue;
        }
        if (el.tagName === 'A' || el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
          const accName = getAccName(el);
          if (genericLabels.has(accName)) {
            const target = el.getAttribute('href') || el.getAttribute('data-action') || el.tagName;
            genericHits.push({ name: accName, target });
          }
        }
      }

      const distinctTargets = new Set(genericHits.map((h) => h.target)).size;
      const triggered = (genericHits.length >= 3 && distinctTargets >= 2) || badAlts.length > 0;
      return {
        genericCount: genericHits.length,
        distinctTargets,
        badAlts: badAlts.slice(0, 5),
        triggered,
      };
    },
  },
  {
    id: 'form_no_failure_feedback',
    label: 'Form submits empty with no invalid state or visible error feedback',
    weight: 10,
    category: 'interaction',
    status: 'active',
    evidenceGrade: 'practitioner',
    era: 'baseline',
    modelFamilies: [],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      if (ctx && ctx.formProbe) {
        const probe = ctx.formProbe;
        if (probe.formPresent === false) {
          return { triggered: false, status: 'na', requestsMade: 0 };
        }
        const wasProbed = Boolean(probe.submittedEmpty || probe.submittedInvalid || probe.probed);
        if (!wasProbed) {
          return {
            triggered: false,
            status: 'unknown',
            reason: 'form_not_probed',
            requestsMade: 0,
          };
        }
        const hasInvalidPseudo = Boolean(probe.hasInvalidPseudo || probe.nativeInvalid);
        const hasAriaInvalid = Boolean(probe.hasAriaInvalid || probe.hasInvalidAria);
        const hasVisibleErrorText = Boolean(
          probe.hasVisibleErrorText ||
            (probe.visibleErrorCount ?? 0) > 0 ||
            probe.errorMessageShown,
        );
        const hasHandler = Boolean(
          probe.requestBlocked || probe.hasSubmitHandler || probe.preventedDefault,
        );
        const hasFeedback =
          hasInvalidPseudo || hasAriaInvalid || hasVisibleErrorText || hasHandler;
        return {
          triggered: !hasFeedback,
          status: hasFeedback ? 'pass' : 'fail',
          hasInvalidPseudo,
          hasAriaInvalid,
          hasVisibleErrorText,
          requestBlocked: Boolean(probe.requestBlocked),
          requestsMade: 0,
        };
      }
      const form = document.querySelector('form');
      if (!form) return { triggered: false, status: 'na', requestsMade: 0 };
      const inputs = Array.from(
        form.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), textarea, select'),
      );
      if (inputs.length === 0) return { triggered: false, status: 'na', requestsMade: 0 };
      // Constraint attributes are not evidence. Pass only when this DOM was
      // probed and native :invalid matched, or a probed submit left visible
      // error text. Unprobed required / pattern / aria-required / aria-invalid
      // stays unknown.
      const nativeInvalid = inputs.some(
        (inp: any) => typeof inp.matches === 'function' && inp.matches(':invalid'),
      );
      const errEl = form.querySelector('[role="alert"], [aria-live], .error, [data-error]');
      const hasVisibleErrorText = Boolean(errEl && (errEl.textContent || '').trim().length > 0);
      const wasProbedAttr = form.getAttribute('data-probed-empty') === 'true';
      if (wasProbedAttr && nativeInvalid) {
        return {
          formPresent: true,
          hasInvalidPseudo: true,
          hasVisibleErrorText,
          status: 'pass',
          triggered: false,
          requestsMade: 0,
        };
      }
      if (wasProbedAttr && hasVisibleErrorText) {
        return {
          formPresent: true,
          hasInvalidPseudo: false,
          hasVisibleErrorText: true,
          status: 'pass',
          triggered: false,
          requestsMade: 0,
        };
      }
      if (!wasProbedAttr) {
        return {
          formPresent: true,
          status: 'unknown',
          reason: 'form_not_probed',
          triggered: false,
          requestsMade: 0,
        };
      }
      return {
        formPresent: true,
        hasInvalidPseudo: false,
        hasVisibleErrorText: false,
        status: 'fail',
        triggered: true,
        requestsMade: 0,
      };
    },
  },
];

export const CRAFT_CHECK_IDS = new Set(CRAFT_CHECKS.map((c) => c.id));

// Score craft-floor checks (0-100, HIGHER is better).
// Never feeds design score, copy score, or Clean/Mild/Heavy.
export function scoreCraft(
  rawResults: Record<string, any> | Array<any> | null | undefined,
  opts: { axeResults?: any; enableAxe?: boolean } = {},
) {
  if (!rawResults) {
    return {
      axis: 'craft' as const,
      evidence: [],
      score: 100,
      maxScore: 100,
      earnedWeight: 0,
      applicableWeight: 0,
      coverage: 0,
      checks: [],
      failed: [],
      advisories: [],
      a11y: opts.enableAxe ? { axe: formatAxeReport(opts.axeResults, { enabled: true }) } : undefined,
    };
  }

  const byId: Record<string, any> = Array.isArray(rawResults)
    ? Object.fromEntries(rawResults.map((r) => [r.id, r]))
    : rawResults;

  let earnedWeight = 0;
  let applicableWeight = 0;
  let measuredCount = 0;
  let applicableCount = 0;

  const checks = CRAFT_CHECKS.map((meta) => {
    const raw = byId[meta.id] || {};
    const isUnknown = raw.status === 'unknown' || Boolean(raw.error);
    const isNa = raw.status === 'na';
    const isInfoOrReview =
      raw.status === 'review' ||
      meta.weight === 0 ||
      meta.severity === 'info' ||
      meta.status === 'review';
    const triggered = Boolean(raw.triggered);

    let status: 'pass' | 'fail' | 'review' | 'unknown' | 'na' = 'pass';
    if (isUnknown) status = 'unknown';
    else if (isNa) status = 'na';
    else if (triggered && isInfoOrReview) status = 'review';
    else if (triggered) status = 'fail';
    else status = 'pass';

    if (!isNa && !isInfoOrReview) {
      applicableCount++;
      if (!isUnknown) {
        measuredCount++;
        applicableWeight += meta.weight;
        if (!triggered) {
          earnedWeight += meta.weight;
        }
      }
    }

    const { triggered: _t, ...evidence } = raw;
    return {
      id: meta.id,
      label: meta.label,
      weight: meta.weight,
      category: meta.category,
      severity: meta.severity || 'warning',
      lifecycleStatus: meta.status,
      evidenceGrade: meta.evidenceGrade,
      status,
      passed: status === 'pass',
      triggered,
      scoreDelta: status === 'fail' ? -meta.weight : 0,
      evidence,
    };
  });

  const score =
    applicableWeight > 0 ? Math.max(0, Math.min(100, Math.round((earnedWeight / applicableWeight) * 100))) : 100;
  const coverage =
    applicableCount > 0 ? Math.round((measuredCount / applicableCount) * 100) / 100 : 1;
  const failed = checks.filter((c) => c.status === 'fail');
  const advisories = checks.filter((c) => c.status === 'review');
  const evidence = checks
    .filter((c) => c.triggered)
    .map((c) => ({ id: c.id, label: c.label, status: c.status, evidence: c.evidence }));

  const a11y = opts.enableAxe
    ? { axe: formatAxeReport(opts.axeResults, { enabled: true }) }
    : undefined;

  return {
    axis: 'craft' as const,
    evidence,
    score,
    maxScore: 100,
    earnedWeight,
    applicableWeight,
    coverage,
    checks,
    failed,
    advisories,
    ...(a11y ? { a11y } : {}),
  };
}
