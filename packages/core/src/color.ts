// Color parsing + classification helpers (CSS Color 4 + Oklab / OKLCH + WCAG 2 / APCA).
//
// Designed to be serialized to the page-side IIFE, so everything inside
// createColorHelpers() must be self-contained — no Node imports, no closures
// over outside state.

export function createColorHelpers() {
  let _ctx: any = null;
  try {
    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      const _canvas = document.createElement('canvas');
      _canvas.width = _canvas.height = 1;
      _ctx = _canvas.getContext('2d', { willReadFrequently: true });
    }
  } catch (e) {
    _ctx = null;
  }

  const NAMED_COLORS: Record<string, [number, number, number, number]> = {
    black: [0, 0, 0, 1],
    white: [255, 255, 255, 1],
    red: [255, 0, 0, 1],
    green: [0, 128, 0, 1],
    lime: [0, 255, 0, 1],
    blue: [0, 0, 255, 1],
    yellow: [255, 255, 0, 1],
    cyan: [0, 255, 255, 1],
    aqua: [0, 255, 255, 1],
    magenta: [255, 0, 255, 1],
    fuchsia: [255, 0, 255, 1],
    silver: [192, 192, 192, 1],
    gray: [128, 128, 128, 1],
    grey: [128, 128, 128, 1],
    maroon: [128, 0, 0, 1],
    olive: [128, 128, 0, 1],
    purple: [128, 0, 128, 1],
    teal: [0, 128, 128, 1],
    navy: [0, 0, 128, 1],
    orange: [255, 165, 0, 1],
    indigo: [75, 0, 130, 1],
    violet: [238, 130, 238, 1],
    pink: [255, 192, 203, 1],
    rebeccapurple: [102, 51, 153, 1],
    coral: [255, 127, 80, 1],
    gold: [255, 215, 0, 1],
    crimson: [220, 20, 60, 1],
  };

  function srgbToLinear(u: number): number {
    const abs = Math.abs(u);
    const res = abs <= 0.04045 ? abs / 12.92 : Math.pow((abs + 0.055) / 1.055, 2.4);
    return u < 0 ? -res : res;
  }

  function linearToSrgb(u: number): number {
    const abs = Math.abs(u);
    const res = abs <= 0.0031308 ? 12.92 * abs : 1.055 * Math.pow(abs, 1 / 2.4) - 0.055;
    return u < 0 ? -res : res;
  }

  function clampByte(v: number): number {
    return Math.max(0, Math.min(255, Math.round(v)));
  }

  function clamp01(v: number): number {
    return Math.max(0, Math.min(1, v));
  }

  function linearSrgbToOklab(lr: number, lg: number, lb: number) {
    const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
    const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
    const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
    const l_ = Math.cbrt(l);
    const m_ = Math.cbrt(m);
    const s_ = Math.cbrt(s);
    const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
    const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
    const b = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
    return { L, a, b };
  }

  function oklabToLinearSrgb(L: number, a: number, b: number) {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;
    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;
    const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
    return [lr, lg, lb];
  }

  function oklabToOklch(lab: { L: number; a: number; b: number }) {
    const C = Math.hypot(lab.a, lab.b);
    const h = C < 1e-6 ? 0 : ((Math.atan2(lab.b, lab.a) * 180) / Math.PI + 360) % 360;
    return { L: lab.L, C, h };
  }

  function oklchToOklab(L: number, C: number, h: number) {
    const rad = (h * Math.PI) / 180;
    return {
      L,
      a: C * Math.cos(rad),
      b: C * Math.sin(rad),
    };
  }

  function buildFromSrgb(r: number, g: number, b: number, a: number) {
    const lr = srgbToLinear(r / 255);
    const lg = srgbToLinear(g / 255);
    const lb = srgbToLinear(b / 255);
    const oklab = linearSrgbToOklab(lr, lg, lb);
    const oklch = oklabToOklch(oklab);
    return {
      r: clampByte(r),
      g: clampByte(g),
      b: clampByte(b),
      a: clamp01(a),
      oklab,
      oklch,
    };
  }

  function buildFromOklab(L: number, a: number, b: number, alpha: number, exactOklch?: any) {
    const [lr, lg, lb] = oklabToLinearSrgb(L, a, b);
    const r = clampByte(linearToSrgb(lr) * 255);
    const g = clampByte(linearToSrgb(lg) * 255);
    const bl = clampByte(linearToSrgb(lb) * 255);
    const oklab = { L, a, b };
    const oklch = exactOklch || oklabToOklch(oklab);
    return {
      r,
      g,
      b: bl,
      a: clamp01(alpha),
      oklab,
      oklch,
    };
  }

  function parseAngle(tok: string): number | null {
    if (!tok) return null;
    const t = tok.trim().toLowerCase();
    if (t === 'none') return 0;
    const m = t.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(deg|rad|grad|turn)?$/);
    if (!m) return null;
    const v = parseFloat(m[1]);
    const unit = m[2] || 'deg';
    let deg = v;
    if (unit === 'rad') deg = (v * 180) / Math.PI;
    else if (unit === 'grad') deg = v * 0.9;
    else if (unit === 'turn') deg = v * 360;
    return ((deg % 360) + 360) % 360;
  }

  function parseAlpha(tok: string | undefined): number | null {
    if (tok === undefined || tok === '') return 1;
    const t = tok.trim().toLowerCase();
    if (t === 'none') return 0;
    if (t.endsWith('%')) {
      const n = parseFloat(t.slice(0, -1));
      return Number.isNaN(n) ? null : clamp01(n / 100);
    }
    const n = parseFloat(t);
    return Number.isNaN(n) ? null : clamp01(n);
  }

  function parseNumOrPct(tok: string, pctScale: number): number | null {
    if (!tok) return null;
    const t = tok.trim().toLowerCase();
    if (t === 'none') return 0;
    if (t.endsWith('%')) {
      const n = parseFloat(t.slice(0, -1));
      return Number.isNaN(n) ? null : (n / 100) * pctScale;
    }
    const n = parseFloat(t);
    return Number.isNaN(n) ? null : n;
  }

  // Split function body into [channelTokens, alphaToken]
  function splitFnArgs(body: string): { channels: string[]; alpha?: string } | null {
    const slashIdx = findTopLevelChar(body, '/');
    let mainPart = body;
    let alphaPart: string | undefined;
    if (slashIdx !== -1) {
      mainPart = body.slice(0, slashIdx).trim();
      alphaPart = body.slice(slashIdx + 1).trim();
      if (!alphaPart || findTopLevelChar(alphaPart, '/') !== -1) return null;
    }
    const hasComma = findTopLevelChar(mainPart, ',') !== -1;
    let tokens: string[];
    if (hasComma) {
      tokens = splitTopLevel(mainPart, ',').map((s) => s.trim()).filter(Boolean);
      if (tokens.length === 4 && alphaPart === undefined) {
        alphaPart = tokens[3];
        tokens = tokens.slice(0, 3);
      }
    } else {
      tokens = mainPart.trim().split(/\s+/).filter(Boolean);
    }
    return { channels: tokens, alpha: alphaPart };
  }

  function findTopLevelChar(s: string, ch: string): number {
    let depth = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '(') depth++;
      else if (c === ')') depth = Math.max(0, depth - 1);
      else if (c === ch && depth === 0) return i;
    }
    return -1;
  }

  function splitTopLevel(s: string, sep: string): string[] {
    const out: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '(') depth++;
      else if (c === ')') depth = Math.max(0, depth - 1);
      else if (c === sep && depth === 0) {
        out.push(s.slice(start, i));
        start = i + 1;
      }
    }
    out.push(s.slice(start));
    return out;
  }

  function hslToRgb01(h: number, s: number, l: number): [number, number, number] {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0,
      g = 0,
      b = 0;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return [r + m, g + m, b + m];
  }

  function hwbToRgb01(h: number, w: number, bl: number): [number, number, number] {
    if (w + bl >= 1) {
      const grey = w / (w + bl);
      return [grey, grey, grey];
    }
    const [r, g, b] = hslToRgb01(h, 1, 0.5);
    const f = 1 - w - bl;
    return [r * f + w, g * f + w, b * f + w];
  }

  // CIE Lab (D50) -> XYZ (D50) -> XYZ (D65 via Bradford) -> linear sRGB
  function cieLabToLinearSrgb(L: number, a: number, b: number): [number, number, number] {
    const fy = (L + 16) / 116;
    const fx = a / 500 + fy;
    const fz = fy - b / 200;
    const eps = 216 / 24389;
    const kappa = 24389 / 27;
    const xr = fx * fx * fx > eps ? fx * fx * fx : (116 * fx - 16) / kappa;
    const yr = L > kappa * eps ? Math.pow((L + 16) / 116, 3) : L / kappa;
    const zr = fz * fz * fz > eps ? fz * fz * fz : (116 * fz - 16) / kappa;
    // D50 reference white
    const X50 = xr * 0.96422;
    const Y50 = yr * 1.0;
    const Z50 = zr * 0.82521;
    return xyzD50ToLinearSrgb(X50, Y50, Z50);
  }

  function xyzD50ToLinearSrgb(X50: number, Y50: number, Z50: number): [number, number, number] {
    // Bradford D50 -> D65
    const X = 0.9555766 * X50 - 0.0230393 * Y50 + 0.0631636 * Z50;
    const Y = -0.0282895 * X50 + 1.0099416 * Y50 + 0.0210077 * Z50;
    const Z = 0.0122982 * X50 - 0.020483 * Y50 + 1.3299098 * Z50;
    return xyzD65ToLinearSrgb(X, Y, Z);
  }

  function xyzD65ToLinearSrgb(X: number, Y: number, Z: number): [number, number, number] {
    const lr = 3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
    const lg = -0.969266 * X + 1.8760108 * Y + 0.041556 * Z;
    const lb = 0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;
    return [lr, lg, lb];
  }

  // Parse any CSS Color 4 string, preserving transparent (a=0) for color-mix()
  function parseColorRaw(str: any): any {
    if (!str) return null;
    if (typeof str === 'object' && typeof str.r === 'number') {
      if (str.oklab && str.oklch) return str;
      return buildFromSrgb(str.r, str.g, str.b, str.a ?? 1);
    }
    const s = String(str).trim();
    if (!s || s === 'none' || s.toLowerCase() === 'currentcolor' || s.toLowerCase() === 'inherit') {
      return null;
    }
    const lower = s.toLowerCase();
    if (lower === 'transparent') {
      return { r: 0, g: 0, b: 0, a: 0, oklab: { L: 0, a: 0, b: 0 }, oklch: { L: 0, C: 0, h: 0 } };
    }
    if (NAMED_COLORS[lower]) {
      const [r, g, b, a] = NAMED_COLORS[lower];
      return buildFromSrgb(r, g, b, a);
    }

    // Hex: #rgb, #rgba, #rrggbb, #rrggbbaa
    const hex = s.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
    if (hex) {
      const h = hex[1];
      if (h.length === 3 || h.length === 4) {
        const r = parseInt(h[0] + h[0], 16);
        const g = parseInt(h[1] + h[1], 16);
        const b = parseInt(h[2] + h[2], 16);
        const a = h.length === 4 ? parseInt(h[3] + h[3], 16) / 255 : 1;
        return buildFromSrgb(r, g, b, a);
      }
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
      return buildFromSrgb(r, g, b, a);
    }

    // Function syntax: fn(body)
    const fnMatch = s.match(/^([a-zA-Z][a-zA-Z0-9-]*)\(([\s\S]*)\)$/);
    if (fnMatch) {
      const fn = fnMatch[1].toLowerCase();
      const body = fnMatch[2].trim();
      // Reject unclosed nested parens
      let depth = 0;
      for (let i = 0; i < body.length; i++) {
        if (body[i] === '(') depth++;
        else if (body[i] === ')') {
          depth--;
          if (depth < 0) return null;
        }
      }
      if (depth !== 0) return null;

      if (fn === 'rgb' || fn === 'rgba') {
        const parsed = splitFnArgs(body);
        if (!parsed || parsed.channels.length !== 3) return null;
        const r = parseNumOrPct(parsed.channels[0], 255);
        const g = parseNumOrPct(parsed.channels[1], 255);
        const b = parseNumOrPct(parsed.channels[2], 255);
        const a = parseAlpha(parsed.alpha);
        if (r === null || g === null || b === null || a === null) return null;
        return buildFromSrgb(r, g, b, a);
      }

      if (fn === 'hsl' || fn === 'hsla') {
        const parsed = splitFnArgs(body);
        if (!parsed || parsed.channels.length !== 3) return null;
        const h = parseAngle(parsed.channels[0]);
        const sPct = parseNumOrPct(parsed.channels[1], 1);
        const lPct = parseNumOrPct(parsed.channels[2], 1);
        const a = parseAlpha(parsed.alpha);
        if (h === null || sPct === null || lPct === null || a === null) return null;
        // Require % on saturation/lightness in hsl() unless 'none'
        if (
          parsed.channels[1].trim().toLowerCase() !== 'none' &&
          !parsed.channels[1].trim().endsWith('%')
        )
          return null;
        if (
          parsed.channels[2].trim().toLowerCase() !== 'none' &&
          !parsed.channels[2].trim().endsWith('%')
        )
          return null;
        const [r01, g01, b01] = hslToRgb01(h, clamp01(sPct), clamp01(lPct));
        return buildFromSrgb(r01 * 255, g01 * 255, b01 * 255, a);
      }

      if (fn === 'hwb') {
        if (findTopLevelChar(body, ',') !== -1) return null; // hwb() is space-separated only in CSS Color 4
        const parsed = splitFnArgs(body);
        if (!parsed || parsed.channels.length !== 3) return null;
        const h = parseAngle(parsed.channels[0]);
        const w = parseNumOrPct(parsed.channels[1], 1);
        const bl = parseNumOrPct(parsed.channels[2], 1);
        const a = parseAlpha(parsed.alpha);
        if (h === null || w === null || bl === null || a === null) return null;
        const [r01, g01, b01] = hwbToRgb01(h, Math.max(0, w), Math.max(0, bl));
        return buildFromSrgb(r01 * 255, g01 * 255, b01 * 255, a);
      }

      if (fn === 'oklab') {
        if (findTopLevelChar(body, ',') !== -1) return null;
        const parsed = splitFnArgs(body);
        if (!parsed || parsed.channels.length !== 3) return null;
        const L = parseNumOrPct(parsed.channels[0], 1);
        const aCh = parseNumOrPct(parsed.channels[1], 0.4);
        const bCh = parseNumOrPct(parsed.channels[2], 0.4);
        const alpha = parseAlpha(parsed.alpha);
        if (L === null || aCh === null || bCh === null || alpha === null) return null;
        return buildFromOklab(clamp01(L), aCh, bCh, alpha);
      }

      if (fn === 'oklch') {
        if (findTopLevelChar(body, ',') !== -1) return null;
        const parsed = splitFnArgs(body);
        if (!parsed || parsed.channels.length !== 3) return null;
        const L = parseNumOrPct(parsed.channels[0], 1);
        const C = parseNumOrPct(parsed.channels[1], 0.4);
        const h = parseAngle(parsed.channels[2]);
        const alpha = parseAlpha(parsed.alpha);
        if (L === null || C === null || h === null || alpha === null) return null;
        const clampedL = clamp01(L);
        const clampedC = Math.max(0, C);
        const lab = oklchToOklab(clampedL, clampedC, h);
        return buildFromOklab(lab.L, lab.a, lab.b, alpha, { L: clampedL, C: clampedC, h });
      }

      if (fn === 'lab') {
        if (findTopLevelChar(body, ',') !== -1) return null;
        const parsed = splitFnArgs(body);
        if (!parsed || parsed.channels.length !== 3) return null;
        const L = parseNumOrPct(parsed.channels[0], 100);
        const aCh = parseNumOrPct(parsed.channels[1], 125);
        const bCh = parseNumOrPct(parsed.channels[2], 125);
        const alpha = parseAlpha(parsed.alpha);
        if (L === null || aCh === null || bCh === null || alpha === null) return null;
        const [lr, lg, lb] = cieLabToLinearSrgb(Math.max(0, L), aCh, bCh);
        const oklab = linearSrgbToOklab(lr, lg, lb);
        return buildFromOklab(oklab.L, oklab.a, oklab.b, alpha);
      }

      if (fn === 'lch') {
        if (findTopLevelChar(body, ',') !== -1) return null;
        const parsed = splitFnArgs(body);
        if (!parsed || parsed.channels.length !== 3) return null;
        const L = parseNumOrPct(parsed.channels[0], 100);
        const C = parseNumOrPct(parsed.channels[1], 150);
        const h = parseAngle(parsed.channels[2]);
        const alpha = parseAlpha(parsed.alpha);
        if (L === null || C === null || h === null || alpha === null) return null;
        const rad = (h * Math.PI) / 180;
        const aCh = Math.max(0, C) * Math.cos(rad);
        const bCh = Math.max(0, C) * Math.sin(rad);
        const [lr, lg, lb] = cieLabToLinearSrgb(Math.max(0, L), aCh, bCh);
        const oklab = linearSrgbToOklab(lr, lg, lb);
        return buildFromOklab(oklab.L, oklab.a, oklab.b, alpha);
      }

      if (fn === 'color') {
        if (findTopLevelChar(body, ',') !== -1) return null;
        const parsed = splitFnArgs(body);
        if (!parsed || parsed.channels.length !== 4) return null;
        const space = parsed.channels[0].toLowerCase();
        const c1 = parseNumOrPct(parsed.channels[1], 1);
        const c2 = parseNumOrPct(parsed.channels[2], 1);
        const c3 = parseNumOrPct(parsed.channels[3], 1);
        const alpha = parseAlpha(parsed.alpha);
        if (c1 === null || c2 === null || c3 === null || alpha === null) return null;
        let lr = 0,
          lg = 0,
          lb = 0;
        if (space === 'srgb') {
          lr = srgbToLinear(c1);
          lg = srgbToLinear(c2);
          lb = srgbToLinear(c3);
        } else if (space === 'srgb-linear') {
          lr = c1;
          lg = c2;
          lb = c3;
        } else if (space === 'display-p3') {
          const pr = srgbToLinear(c1);
          const pg = srgbToLinear(c2);
          const pb = srgbToLinear(c3);
          // Linear Display-P3 -> Linear sRGB
          lr = 1.2249401 * pr - 0.2249402 * pg;
          lg = -0.0420569 * pr + 1.0420571 * pg;
          lb = -0.0196376 * pr - 0.0786361 * pg + 1.0982735 * pb;
        } else if (space === 'a98-rgb') {
          const toLinA98 = (u: number) => (u < 0 ? -Math.pow(-u, 563 / 256) : Math.pow(u, 563 / 256));
          const ar = toLinA98(c1),
            ag = toLinA98(c2),
            ab = toLinA98(c3);
          const X = 0.576669 * ar + 0.1855582 * ag + 0.1882286 * ab;
          const Y = 0.297345 * ar + 0.6273636 * ag + 0.0752915 * ab;
          const Z = 0.0270314 * ar + 0.0706889 * ag + 0.9913375 * ab;
          [lr, lg, lb] = xyzD65ToLinearSrgb(X, Y, Z);
        } else if (space === 'rec2020') {
          const alpha2020 = 1.09929682680944;
          const beta2020 = 0.018053968510807;
          const toLin2020 = (u: number) => {
            const abs = Math.abs(u);
            const v = abs < beta2020 * 4.5 ? abs / 4.5 : Math.pow((abs + alpha2020 - 1) / alpha2020, 1 / 0.45);
            return u < 0 ? -v : v;
          };
          const rr = toLin2020(c1),
            rg = toLin2020(c2),
            rb = toLin2020(c3);
          const X = 0.636958 * rr + 0.1446169 * rg + 0.168881 * rb;
          const Y = 0.2627002 * rr + 0.6779981 * rg + 0.0593017 * rb;
          const Z = 0.0 * rr + 0.0280727 * rg + 1.0609851 * rb;
          [lr, lg, lb] = xyzD65ToLinearSrgb(X, Y, Z);
        } else if (space === 'prophoto-rgb') {
          const toLinPP = (u: number) => {
            const abs = Math.abs(u);
            const v = abs <= 16 / 512 ? abs / 16 : Math.pow(abs, 1.8);
            return u < 0 ? -v : v;
          };
          const pr = toLinPP(c1),
            pg = toLinPP(c2),
            pb = toLinPP(c3);
          const X50 = 0.7977605 * pr + 0.1351858 * pg + 0.0313493 * pb;
          const Y50 = 0.2880711 * pr + 0.7118432 * pg + 0.0000857 * pb;
          const Z50 = 0.0 * pr + 0.0 * pg + 0.8251046 * pb;
          [lr, lg, lb] = xyzD50ToLinearSrgb(X50, Y50, Z50);
        } else if (space === 'xyz' || space === 'xyz-d65') {
          [lr, lg, lb] = xyzD65ToLinearSrgb(c1, c2, c3);
        } else if (space === 'xyz-d50') {
          [lr, lg, lb] = xyzD50ToLinearSrgb(c1, c2, c3);
        } else {
          return null;
        }
        const oklab = linearSrgbToOklab(lr, lg, lb);
        return buildFromOklab(oklab.L, oklab.a, oklab.b, alpha);
      }

      if (fn === 'color-mix') {
        const parts = splitTopLevel(body, ',').map((p) => p.trim());
        if (parts.length !== 3) return null;
        const spaceMatch = parts[0].match(
          /^in\s+(oklab|oklch|srgb|srgb-linear|display-p3|lab|lch|hsl|hwb)(?:\s+(shorter|longer|increasing|decreasing)\s+hue)?$/i,
        );
        if (!spaceMatch) return null;
        const mixSpace = spaceMatch[1].toLowerCase();

        const parseMixItem = (itemStr: string) => {
          const pctMatch = itemStr.match(/^(.*?)\s+([+-]?(?:\d+\.?\d*|\.\d+)%)\s*$/);
          if (pctMatch) {
            const col = parseColorRaw(pctMatch[1].trim());
            const pct = parseFloat(pctMatch[2]) / 100;
            if (!col || Number.isNaN(pct) || pct < 0 || pct > 1) return null;
            return { col, pct };
          }
          const leadPct = itemStr.match(/^\s*([+-]?(?:\d+\.?\d*|\.\d+)%)\s+(.*)$/);
          if (leadPct) {
            const col = parseColorRaw(leadPct[2].trim());
            const pct = parseFloat(leadPct[1]) / 100;
            if (!col || Number.isNaN(pct) || pct < 0 || pct > 1) return null;
            return { col, pct };
          }
          const col = parseColorRaw(itemStr.trim());
          if (!col) return null;
          return { col, pct: null as number | null };
        };

        const item1 = parseMixItem(parts[1]);
        const item2 = parseMixItem(parts[2]);
        if (!item1 || !item2) return null;
        let p1 = item1.pct;
        let p2 = item2.pct;
        if (p1 === null && p2 === null) {
          p1 = 0.5;
          p2 = 0.5;
        } else if (p1 === null) {
          p1 = 1 - p2!;
        } else if (p2 === null) {
          p2 = 1 - p1;
        }
        const sumP = p1 + p2;
        if (sumP <= 0) return null;
        const alphaMultiplier = sumP < 1 ? sumP : 1;
        p1 = p1 / sumP;
        p2 = p2 / sumP;

        const c1 = item1.col;
        const c2 = item2.col;
        const a1 = c1.a;
        const a2 = c2.a;
        const outAlpha = (p1 * a1 + p2 * a2) * alphaMultiplier;
        // Premultiplied weights per CSS Color 4 §3.4
        const w1 = p1 * a1 + p2 * a2 > 0 ? (p1 * a1) / (p1 * a1 + p2 * a2) : p1;
        const w2 = 1 - w1;

        if (mixSpace === 'oklch') {
          const L = w1 * c1.oklch.L + w2 * c2.oklch.L;
          const C = w1 * c1.oklch.C + w2 * c2.oklch.C;
          let h1 = c1.oklch.h;
          let h2 = c2.oklch.h;
          if (c1.oklch.C < 1e-5 || a1 === 0) h1 = h2;
          if (c2.oklch.C < 1e-5 || a2 === 0) h2 = h1;
          let dh = h2 - h1;
          if (dh > 180) dh -= 360;
          if (dh < -180) dh += 360;
          const h = ((h1 + w2 * dh) % 360 + 360) % 360;
          const lab = oklchToOklab(L, C, h);
          return buildFromOklab(lab.L, lab.a, lab.b, outAlpha, { L, C, h });
        }

        if (mixSpace === 'srgb') {
          const r = w1 * c1.r + w2 * c2.r;
          const g = w1 * c1.g + w2 * c2.g;
          const b = w1 * c1.b + w2 * c2.b;
          return buildFromSrgb(r, g, b, outAlpha);
        }

        // Default / oklab / other Rectangular spaces approximated in Oklab
        const L = w1 * c1.oklab.L + w2 * c2.oklab.L;
        const a = w1 * c1.oklab.a + w2 * c2.oklab.a;
        const b = w1 * c1.oklab.b + w2 * c2.oklab.b;
        return buildFromOklab(L, a, b, outAlpha);
      }

      return null;
    }

    // Fallback to browser canvas only for exotic named CSS colors not in NAMED_COLORS
    if (_ctx && /^[a-zA-Z]+$/.test(s)) {
      try {
        _ctx.clearRect(0, 0, 1, 1);
        _ctx.fillStyle = '#000';
        _ctx.fillStyle = s;
        if (_ctx.fillStyle !== '#000000' && _ctx.fillStyle !== '#000') {
          _ctx.fillRect(0, 0, 1, 1);
          const d = _ctx.getImageData(0, 0, 1, 1).data;
          if (d[3] > 0) return buildFromSrgb(d[0], d[1], d[2], d[3] / 255);
        }
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  function parseColor(str: any) {
    const c = parseColorRaw(str);
    if (!c || c.a === 0) return null;
    return c;
  }

  function rgbToOklab(c: any) {
    if (!c) return null;
    if (c.oklab) return c.oklab;
    const lr = srgbToLinear((c.r ?? 0) / 255);
    const lg = srgbToLinear((c.g ?? 0) / 255);
    const lb = srgbToLinear((c.b ?? 0) / 255);
    return linearSrgbToOklab(lr, lg, lb);
  }

  function rgbToOklch(c: any) {
    if (!c) return null;
    if (c.oklch) return c.oklch;
    const lab = rgbToOklab(c);
    return lab ? oklabToOklch(lab) : null;
  }

  function deltaEOklab(c1: any, c2: any): number {
    const l1 = typeof c1 === 'string' ? rgbToOklab(parseColorRaw(c1)) : rgbToOklab(c1);
    const l2 = typeof c2 === 'string' ? rgbToOklab(parseColorRaw(c2)) : rgbToOklab(c2);
    if (!l1 || !l2) return Infinity;
    return Math.hypot(l1.L - l2.L, l1.a - l2.a, l1.b - l2.b);
  }

  // Extract all CSS Color 4 color tokens from gradients, box-shadow, etc.
  function extractColorStrings(cssValue: string): string[] {
    if (!cssValue || cssValue === 'none') return [];
    const results: string[] = [];
    const s = String(cssValue);
    const fnNames = /^(color-mix|oklch|oklab|lab|lch|color|rgba?|hsla?|hwb)$/i;
    let i = 0;
    while (i < s.length) {
      if (s[i] === '#') {
        const m = s.slice(i).match(/^#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/);
        if (m) {
          results.push(m[0]);
          i += m[0].length;
          continue;
        }
      }
      const idMatch = s.slice(i).match(/^([a-zA-Z][a-zA-Z0-9-]*)\(/);
      if (idMatch) {
        const fnName = idMatch[1];
        const openIdx = i + fnName.length;
        let depth = 0;
        let endIdx = -1;
        for (let j = openIdx; j < s.length; j++) {
          if (s[j] === '(') depth++;
          else if (s[j] === ')') {
            depth--;
            if (depth === 0) {
              endIdx = j;
              break;
            }
          }
        }
        if (endIdx !== -1 && fnNames.test(fnName)) {
          results.push(s.slice(i, endIdx + 1));
          i = endIdx + 1;
          continue;
        }
        // If it's a wrapper function like linear-gradient(...), step into its opening paren
        i = openIdx + 1;
        continue;
      }
      i++;
    }
    return results;
  }

  // Extract gradient stops with unknown-stop tracking (FIX-05 / FIX-10).
  // Unparseable stops are returned with unknown: true and NEVER treated as opaque.
  function extractGradientStops(bgImage: string): Array<{ raw: string; color: any; unknown: boolean }> {
    if (!bgImage || bgImage === 'none' || !/gradient\(/i.test(bgImage)) return [];
    const stops: Array<{ raw: string; color: any; unknown: boolean }> = [];
    const tokens = extractColorStrings(bgImage);
    for (const raw of tokens) {
      const col = parseColorRaw(raw);
      if (!col) {
        stops.push({ raw, color: null, unknown: true });
      } else {
        stops.push({ raw, color: col.a > 0 ? col : null, unknown: false });
      }
    }
    // Check if gradient contains unparseable color-like functions or CSS var() stops (e.g. broken oklch/color-mix, var(--x))
    const brokenMatch = bgImage.match(/\b(?:oklch|oklab|color-mix|color|lab|lch|rgba?|hsla?|hwb|var)\([^)]*\)/gi) || [];
    for (const cand of brokenMatch) {
      if (!tokens.includes(cand) && !parseColorRaw(cand)) {
        stops.push({ raw: cand, color: null, unknown: true });
      }
    }
    return stops;
  }

  function rgbToHsl(c: any) {
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

  // FIX-06: OKLCH purple window (L in [0.35, 0.80], C >= 0.10, h in [268, 310], a >= 0.25).
  // Separates Tailwind blue-500/600 (h ~ 260-263 deg) from indigo-500 (h ~ 277 deg) and violet-500 (h ~ 293 deg).
  function isPurple(c: any): boolean {
    if (!c || (c.a !== undefined && c.a < 0.25)) return false;
    const lch = rgbToOklch(c);
    if (!lch) return false;
    return lch.L >= 0.35 && lch.L <= 0.8 && lch.C >= 0.1 && lch.h >= 268 && lch.h <= 310;
  }

  function isDark(c: any) {
    if (!c) return false;
    const hsl = rgbToHsl(c);
    return hsl ? hsl.l < 0.25 : false;
  }

  function isMidGrey(c: any) {
    if (!c) return false;
    const hsl = rgbToHsl(c);
    if (!hsl) return false;
    return hsl.s < 0.15 && hsl.l > 0.35 && hsl.l < 0.75;
  }

  // ── WCAG contrast primitives + APCA informational contrast ────────────────
  // Ported from Impeccable's shared/color.mjs (Apache-2.0). Reimplemented
  // against our {r,g,b,a} shape. Used by low_contrast_text + gray_on_color.

  // Relative luminance per WCAG 2.x. Expects 0-255 channels.
  function relativeLuminance(c: any) {
    if (!c) return 0;
    const lin = [c.r, c.g, c.b].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  }

  // WCAG contrast ratio between two parsed colors (1.0 .. 21.0).
  function contrastRatio(c1: any, c2: any) {
    const l1 = relativeLuminance(c1);
    const l2 = relativeLuminance(c2);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  // FIX-08: Informational APCA-W3 Lc contrast value. Never gates triggered.
  function apcaContrast(fg: any, bg: any): number {
    if (!fg || !bg) return 0;
    const sRGBtoY = (c: any) => {
      const r = Math.pow((c.r ?? 0) / 255, 2.4);
      const g = Math.pow((c.g ?? 0) / 255, 2.4);
      const b = Math.pow((c.b ?? 0) / 255, 2.4);
      const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
      return y < 0.022 ? y + Math.pow(0.022 - y, 1.414) : y;
    };
    const Ytxt = sRGBtoY(fg);
    const Ybg = sRGBtoY(bg);
    if (Math.abs(Ybg - Ytxt) < 0.0005) return 0;
    const SAPC =
      Ybg > Ytxt
        ? (Math.pow(Ybg, 0.56) - Math.pow(Ytxt, 0.57)) * 1.14
        : (Math.pow(Ybg, 0.65) - Math.pow(Ytxt, 0.62)) * 1.14;
    if (Math.abs(SAPC) < 0.1) return 0;
    const Lc = SAPC > 0 ? (SAPC - 0.027) * 100 : (SAPC + 0.027) * 100;
    return Math.round(Lc * 10) / 10;
  }

  // Channel spread — cheap chroma proxy. >= threshold reads as "tinted".
  function channelSpread(c: any) {
    if (!c) return 0;
    return Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
  }

  // Neutral = near-grey/black/white/transparent. Impeccable uses spread < 30.
  function isNeutral(c: any) {
    if (!c || c.a < 0.05) return true;
    return channelSpread(c) < 30;
  }

  // Walk up the ancestor chain to find the first opaque background color an
  // element actually sits on (its own bg, else the nearest painted ancestor,
  // else white as the document default). Returns a parsed color.
  function effectiveBackground(el: any) {
    let node = el;
    let guard = 0;
    while (node && node.nodeType === 1 && guard++ < 40) {
      const cs = getComputedStyle(node);
      const bg = parseColor(cs.backgroundColor);
      if (bg && bg.a >= 0.5) return bg;
      const img = cs.backgroundImage || '';
      if (img && img !== 'none' && /gradient|url\(/.test(img)) {
        if (/url\(/i.test(img)) {
          return { ...buildFromSrgb(255, 255, 255, 1), _approx: true, _image: true };
        }
        const stops = extractGradientStops(img);
        const solidStop = stops.find((st) => !st.unknown && st.color && st.color.a >= 0.5);
        if (solidStop) return solidStop.color;
        return { ...buildFromSrgb(255, 255, 255, 1), _approx: true };
      }
      node = node.parentElement;
    }
    return buildFromSrgb(255, 255, 255, 1);
  }

  return {
    parseColor,
    parseColorRaw,
    rgbToOklab,
    rgbToOklch,
    deltaEOklab,
    extractColorStrings,
    extractGradientStops,
    rgbToHsl,
    isPurple,
    isDark,
    isMidGrey,
    relativeLuminance,
    contrastRatio,
    apcaContrast,
    channelSpread,
    isNeutral,
    effectiveBackground,
  };
}

const _sharedColorHelpers = createColorHelpers();
export const parseColor = _sharedColorHelpers.parseColor;
export const parseColorRaw = _sharedColorHelpers.parseColorRaw;
export const rgbToHsl = _sharedColorHelpers.rgbToHsl;
export const rgbToOklab = _sharedColorHelpers.rgbToOklab;
export const rgbToOklch = _sharedColorHelpers.rgbToOklch;
export const deltaEOklab = _sharedColorHelpers.deltaEOklab;
export const extractColorStrings = _sharedColorHelpers.extractColorStrings;
export const extractGradientStops = _sharedColorHelpers.extractGradientStops;
export const isPurple = _sharedColorHelpers.isPurple;
export const isDark = _sharedColorHelpers.isDark;
export const isMidGrey = _sharedColorHelpers.isMidGrey;
export const relativeLuminance = _sharedColorHelpers.relativeLuminance;
export const contrastRatio = _sharedColorHelpers.contrastRatio;
export const apcaContrast = _sharedColorHelpers.apcaContrast;
export const channelSpread = _sharedColorHelpers.channelSpread;
export const isNeutral = _sharedColorHelpers.isNeutral;
