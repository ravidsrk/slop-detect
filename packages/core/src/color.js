// Color parsing + classification helpers.
//
// Designed to be serialized to the page-side IIFE, so everything inside
// createColorHelpers() must be self-contained — no Node imports, no closures
// over outside state.

export function createColorHelpers() {
  const _canvas = document.createElement('canvas');
  _canvas.width = _canvas.height = 1;
  const _ctx = _canvas.getContext('2d', { willReadFrequently: true });

  function parseColor(str) {
    if (!str) return null;
    const s = String(str).trim();
    if (!s || s === 'transparent' || s === 'none') return null;
    if (/^rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/.test(s)) return null;
    try {
      _ctx.clearRect(0, 0, 1, 1);
      _ctx.fillStyle = '#000';
      _ctx.fillStyle = s;
      _ctx.fillRect(0, 0, 1, 1);
      const d = _ctx.getImageData(0, 0, 1, 1).data;
      return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
    } catch (e) {
      return null;
    }
  }

  function rgbToHsl(c) {
    if (!c) return null;
    const r = c.r / 255,
      g = c.g / 255,
      b = c.b / 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h = 0,
      s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return { h: h * 360, s, l, a: c.a };
  }

  // The "VibeCode Purple" zone: indigo-violet hues with meaningful saturation.
  // Excludes near-grey purples and near-transparent fills.
  function isPurple(c) {
    if (!c || c.a < 0.25) return false;
    const hsl = rgbToHsl(c);
    if (!hsl) return false;
    return hsl.h >= 240 && hsl.h <= 295 && hsl.s >= 0.35 && hsl.l > 0.15 && hsl.l < 0.85;
  }

  function isDark(c) {
    if (!c) return false;
    const hsl = rgbToHsl(c);
    return hsl ? hsl.l < 0.25 : false;
  }

  function isMidGrey(c) {
    if (!c) return false;
    const hsl = rgbToHsl(c);
    if (!hsl) return false;
    return hsl.s < 0.15 && hsl.l > 0.35 && hsl.l < 0.75;
  }

  // ── WCAG contrast primitives ──────────────────────────────────────────────
  // Ported from Impeccable's shared/color.mjs (Apache-2.0). Reimplemented
  // against our {r,g,b,a} shape. Used by low_contrast_text + gray_on_color.

  // Relative luminance per WCAG 2.x. Expects 0-255 channels.
  function relativeLuminance(c) {
    if (!c) return 0;
    const lin = [c.r, c.g, c.b].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  }

  // WCAG contrast ratio between two parsed colors (1.0 .. 21.0).
  function contrastRatio(c1, c2) {
    const l1 = relativeLuminance(c1);
    const l2 = relativeLuminance(c2);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  // Channel spread — cheap chroma proxy. >= threshold reads as "tinted".
  function channelSpread(c) {
    if (!c) return 0;
    return Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
  }

  // Neutral = near-grey/black/white/transparent. Impeccable uses spread < 30.
  function isNeutral(c) {
    if (!c || c.a < 0.05) return true;
    return channelSpread(c) < 30;
  }

  // Walk up the ancestor chain to find the first opaque background color an
  // element actually sits on (its own bg, else the nearest painted ancestor,
  // else white as the document default). Returns a parsed color.
  function effectiveBackground(el) {
    let node = el;
    let guard = 0;
    while (node && node.nodeType === 1 && guard++ < 40) {
      const cs = getComputedStyle(node);
      const bg = parseColor(cs.backgroundColor);
      if (bg && bg.a >= 0.5) return bg;
      // A gradient/image background: approximate with its first solid stop.
      const img = cs.backgroundImage || '';
      if (img && img !== 'none' && /gradient|url\(/.test(img)) {
        const stop = img.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/);
        if (stop) {
          const sc = parseColor(stop[0]);
          if (sc && sc.a >= 0.5) return sc;
        }
        // Unknown gradient — bail to white so we don't crash, but flag low conf.
        return { r: 255, g: 255, b: 255, a: 1, _approx: true };
      }
      node = node.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  }

  return {
    parseColor,
    rgbToHsl,
    isPurple,
    isDark,
    isMidGrey,
    relativeLuminance,
    contrastRatio,
    channelSpread,
    isNeutral,
    effectiveBackground,
  };
}
