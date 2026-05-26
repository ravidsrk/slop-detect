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
    const r = c.r / 255, g = c.g / 255, b = c.b / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
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

  return { parseColor, rgbToHsl, isPurple, isDark, isMidGrey };
}
