// The `system` axis — DESIGN.md & DTCG 2025.10 tokens.json compliance
// ("does this page honor its declared design system?").
//
// Reference formats:
// 1. Google Labs DESIGN.md spec (github.com/google-labs-code/design.md, Apache-2.0, alpha):
//    YAML front matter between `---` fences OR a ```yaml ... ``` fenced block.
// 2. W3C Design Tokens Community Group (DTCG) Format Module 2025.10 (`tokens.json`).

import { parseColor, deltaEOklab, contrastRatio, isPurple, isDark } from './color.js';

export const DESIGN_MD_SPEC_VERSION = 'alpha';

// ── Front-matter extraction (#203: YAML frontmatter OR ```yaml fenced block) ──
export function extractFrontMatter(text: string): string | null {
  if (typeof text !== 'string') return null;
  const m = text.match(/^\uFEFF?\s*---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (m) return m[1];
  const fenced = text.match(/```(?:yaml|yml)\r?\n([\s\S]*?)\r?\n```/i);
  return fenced ? fenced[1] : null;
}

// Minimal YAML-subset reader: nested maps, scalar leaves, quoted/unquoted
// values, full-line + trailing comments.
function parseYamlSubset(src: string): Record<string, any> {
  const root: Record<string, any> = {};
  const stack: Array<{ indent: number; node: Record<string, any> }> = [{ indent: -1, node: root }];
  for (const rawLine of src.split(/\r?\n/)) {
    if (!rawLine.trim() || /^\s*#/.test(rawLine)) continue;
    const indent = (rawLine.match(/^ */) || [''])[0].length;
    const line = rawLine.trim();
    if (line.startsWith('- ')) continue;

    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line
      .slice(0, idx)
      .trim()
      .replace(/^['"]|['"]$/g, '');
    let value = line.slice(idx + 1).trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].node;

    if (value === '') {
      const child: Record<string, any> = {};
      parent[key] = child;
      stack.push({ indent, node: child });
      continue;
    }
    const q = value.match(/^(['"])(.*?)\1/);
    if (q) value = q[2];
    else {
      const c = value.search(/\s#/);
      if (c >= 0) value = value.slice(0, c).trim();
    }
    parent[key] = value;
  }
  return root;
}

interface RefResolutionInfo {
  brokenRefs: Array<{ from: string; ref: string; reason: 'missing' | 'cycle' }>;
  referencedPaths: Set<string>;
}

function resolveRefsWithDiagnostics(tree: Record<string, any>): RefResolutionInfo {
  const brokenRefs: Array<{ from: string; ref: string; reason: 'missing' | 'cycle' }> = [];
  const referencedPaths = new Set<string>();

  const lookup = (path: string): any => {
    let node: any = tree;
    for (const part of path.split('.')) {
      if (!node || typeof node !== 'object') return undefined;
      node = node[part];
    }
    return typeof node === 'string' || typeof node === 'number' ? String(node) : undefined;
  };

  const walk = (node: Record<string, any>, prefix = '') => {
    for (const k of Object.keys(node)) {
      const fullPath = prefix ? `${prefix}.${k}` : k;
      const v = node[k];
      if (v && typeof v === 'object') {
        walk(v, fullPath);
        continue;
      }
      if (typeof v !== 'string') continue;
      let cur = v;
      const visited = new Set<string>([fullPath]);
      let hops = 0;
      while (hops++ < 8) {
        const m = cur.match(/^\{([\w.-]+)\}$/);
        if (!m) break;
        const targetPath = m[1];
        referencedPaths.add(targetPath);
        if (visited.has(targetPath)) {
          brokenRefs.push({ from: fullPath, ref: targetPath, reason: 'cycle' });
          break;
        }
        visited.add(targetPath);
        const resolved = lookup(targetPath);
        if (resolved === undefined) {
          brokenRefs.push({ from: fullPath, ref: targetPath, reason: 'missing' });
          break;
        }
        cur = resolved;
      }
      node[k] = cur;
    }
  };
  walk(tree);
  return { brokenRefs, referencedPaths };
}

// Parse a DESIGN.md document into its token tree.
export function parseDesignMd(text: string): Record<string, any> | null {
  const fm = extractFrontMatter(text);
  if (!fm) return null;
  let tree: Record<string, any>;
  try {
    tree = parseYamlSubset(fm);
    resolveRefsWithDiagnostics(tree);
  } catch {
    return null;
  }
  const hasTokens = [
    'colors',
    'typography',
    'rounded',
    'spacing',
    'components',
    'shadows',
    'boxShadow',
  ].some((k) => tree[k] && typeof tree[k] === 'object' && Object.keys(tree[k]).length > 0);
  if (!hasTokens) return null;
  return {
    name: typeof tree.name === 'string' ? tree.name : null,
    specVersion: typeof tree.specVersion === 'string' ? tree.specVersion : DESIGN_MD_SPEC_VERSION,
    colors: tree.colors || {},
    typography: tree.typography || {},
    rounded: tree.rounded || {},
    spacing: tree.spacing || {},
    shadows: tree.shadows || tree.boxShadow || {},
    components: tree.components || {},
  };
}

// ── Length & CSS Color helpers (#203) ────────────────────────────────────────
export function parseLengthPx(val: unknown, rootPx = 16): number | null {
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (typeof val !== 'string') return null;
  const s = val.trim().toLowerCase();
  if (!s) return null;
  // Skip fluid / viewport-relative units (#283 S-04)
  if (/clamp\(|calc\(|vw|vh|vmin|vmax|%|ch|ex/.test(s)) return null;
  const remMatch = s.match(/^(-?\d*\.?\d+)\s*(rem|em)$/);
  if (remMatch) return parseFloat(remMatch[1]) * rootPx;
  const pxMatch = s.match(/^(-?\d*\.?\d+)\s*(?:px)?$/);
  if (pxMatch) return parseFloat(pxMatch[1]);
  return null;
}

export function parseLineHeightRatio(val: unknown, fontSizePx: number | null): number | null {
  if (val === undefined || val === null) return null;
  const s = String(val).trim().toLowerCase();
  if (!s || s === 'normal') return null;
  if (s.endsWith('%')) {
    const pct = parseFloat(s);
    return Number.isFinite(pct) ? pct / 100 : null;
  }
  if (s.endsWith('px') || s.endsWith('rem') || s.endsWith('em')) {
    const px = parseLengthPx(s);
    if (px !== null && fontSizePx && fontSizePx > 0) return px / fontSizePx;
    return null;
  }
  const num = parseFloat(s);
  if (!Number.isFinite(num)) return null;
  // Unitless line-height ratio (e.g. 1.5) vs pixel value (> 4)
  if (num > 4 && fontSizePx && fontSizePx > 0) return num / fontSizePx;
  return num;
}

// Parse any CSS Color 4 string to [r, g, b] using the shared FIX-05 parser.
export function parseCssColor(str: unknown): [number, number, number] | null {
  if (typeof str !== 'string' || !str.trim()) return null;
  const c = parseColor(str);
  if (!c) return null;
  return [Math.round(c.r), Math.round(c.g), Math.round(c.b)];
}

export interface ColorComparison {
  status: 'match' | 'near-miss' | 'off-palette';
  deltaE: number;
  deltaAlpha: number;
}

// Compare two CSS colors in Oklab (#203):
// ΔE_OK <= 0.02 (and |Δalpha| <= 0.02) -> match
// 0.02 < ΔE_OK <= 0.05 -> near-miss
// ΔE_OK > 0.05 -> off-palette
export function compareSystemColors(declaredStr: unknown, observedStr: unknown): ColorComparison {
  const ca = typeof declaredStr === 'string' ? parseColor(declaredStr) : null;
  const cb = typeof observedStr === 'string' ? parseColor(observedStr) : null;
  if (ca && cb) {
    const dE = deltaEOklab(ca, cb);
    const dA = Math.abs((ca.a ?? 1) - (cb.a ?? 1));
    if (dE <= 0.02 && dA <= 0.02) {
      return { status: 'match', deltaE: Number(dE.toFixed(4)), deltaAlpha: Number(dA.toFixed(4)) };
    }
    if (dE <= 0.05 && dA <= 0.05) {
      return {
        status: 'near-miss',
        deltaE: Number(dE.toFixed(4)),
        deltaAlpha: Number(dA.toFixed(4)),
      };
    }
    return {
      status: 'off-palette',
      deltaE: Number(dE.toFixed(4)),
      deltaAlpha: Number(dA.toFixed(4)),
    };
  }
  const exact =
    String(declaredStr || '')
      .trim()
      .toLowerCase() ===
    String(observedStr || '')
      .trim()
      .toLowerCase();
  return {
    status: exact ? 'match' : 'off-palette',
    deltaE: exact ? 0 : 1,
    deltaAlpha: 0,
  };
}

function colorsMatch(a: unknown, b: unknown, maxDeltaE = 0.02): boolean {
  const cmp = compareSystemColors(a, b);
  return cmp.deltaE <= maxDeltaE && cmp.deltaAlpha <= 0.02;
}

function bestColorComparison(
  palette: string[],
  observedStr: string
): { best: ColorComparison; token: string | null } {
  let best: ColorComparison = { status: 'off-palette', deltaE: Infinity, deltaAlpha: 1 };
  let bestToken: string | null = null;
  for (const tok of palette) {
    const cmp = compareSystemColors(tok, observedStr);
    if (cmp.deltaE < best.deltaE) {
      best = cmp;
      bestToken = tok;
    }
  }
  return { best, token: bestToken };
}

// ── Token flattening ─────────────────────────────────────────────────────────
const GENERIC_FONTS = new Set([
  'sans-serif',
  'serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-sans-serif',
  'ui-serif',
  'ui-monospace',
  'ui-rounded',
  '-apple-system',
  'blinkmacsystemfont',
  'apple color emoji',
  'segoe ui emoji',
  'segoe ui symbol',
  'noto color emoji',
  'emoji',
  'math',
]);

function normFont(name: unknown): string {
  return String(name || '')
    .replace(/['"]/g, '')
    .trim()
    .toLowerCase();
}

export function primaryFamily(stack: unknown): string | null {
  for (const part of String(stack || '').split(',')) {
    const f = normFont(part);
    if (f && !GENERIC_FONTS.has(f)) return f;
  }
  return null;
}

export interface TypographyStyleToken {
  name: string;
  fontFamily: string | null;
  fontSize: number | null;
  lineHeight: number | null;
  letterSpacing: number | null;
  fontWeight: number | null;
}

export function flattenDesignTokens(parsed: Record<string, any>) {
  const fonts = new Set<string>();
  const colors: string[] = [];
  const radii: number[] = [];
  const spacing: number[] = [];
  const fontSizes: number[] = [];
  const lineHeights: number[] = [];
  const letterSpacings: number[] = [];
  const shadows: string[] = [];
  const typographyStyles: TypographyStyleToken[] = [];

  for (const [styleKey, t] of Object.entries<any>(parsed?.typography || {})) {
    if (t && typeof t === 'object') {
      const fam =
        typeof t.fontFamily === 'string'
          ? primaryFamily(t.fontFamily) || normFont(t.fontFamily)
          : null;
      if (fam) fonts.add(fam);
      const fs = parseLengthPx(t.fontSize);
      if (fs !== null && !fontSizes.includes(fs)) fontSizes.push(fs);
      const lh = parseLineHeightRatio(t.lineHeight, fs);
      if (lh !== null && !lineHeights.includes(lh)) lineHeights.push(lh);
      const ls = t.letterSpacing !== undefined ? parseLengthPx(t.letterSpacing, fs || 16) : null;
      if (ls !== null && !letterSpacings.includes(ls)) letterSpacings.push(ls);
      const fw = t.fontWeight !== undefined ? parseFloat(String(t.fontWeight)) : null;
      if (fam || fs !== null || lh !== null || ls !== null) {
        typographyStyles.push({
          name: styleKey,
          fontFamily: fam,
          fontSize: fs,
          lineHeight: lh,
          letterSpacing: ls,
          fontWeight: Number.isFinite(fw) ? fw : null,
        });
      }
    } else if (typeof t === 'string') {
      const px = parseLengthPx(t);
      if (px !== null) {
        if (!fontSizes.includes(px)) fontSizes.push(px);
      } else {
        const f = primaryFamily(t) || normFont(t);
        if (f) fonts.add(f);
      }
    }
  }

  const pushColor = (v: unknown) => {
    if (typeof v === 'string' && v.trim()) colors.push(v.trim());
  };
  const walkColors = (node: any) => {
    for (const v of Object.values(node || {})) {
      if (v && typeof v === 'object') walkColors(v);
      else pushColor(v);
    }
  };
  walkColors(parsed?.colors);

  for (const comp of Object.values<any>(parsed?.components || {})) {
    if (!comp || typeof comp !== 'object') continue;
    pushColor(comp.backgroundColor);
    pushColor(comp.textColor);
    pushColor(comp.borderColor);
    const fam =
      comp.typography && typeof comp.typography === 'object' ? comp.typography.fontFamily : null;
    const f = typeof fam === 'string' ? primaryFamily(fam) || normFont(fam) : null;
    if (f) fonts.add(f);
  }

  const walkLengths = (node: any, out: number[]) => {
    for (const v of Object.values<any>(node || {})) {
      if (v && typeof v === 'object') walkLengths(v, out);
      else {
        const px = parseLengthPx(v);
        if (px !== null && Number.isFinite(px) && !out.includes(px)) out.push(px);
      }
    }
  };
  walkLengths(parsed?.rounded, radii);
  walkLengths(parsed?.spacing, spacing);

  for (const v of Object.values<any>(parsed?.shadows || {})) {
    if (typeof v === 'string' && v.trim()) shadows.push(v.trim());
  }

  return {
    fonts: [...fonts],
    colors,
    radii,
    spacing,
    fontSizes,
    lineHeights,
    letterSpacings,
    shadows,
    typographyStyles,
  };
}

// ── In-page observation ──────────────────────────────────────────────────────
// Serialized into the page (fn.toString()) — must be fully self-contained.
export function extractSystemContext() {
  const out: Record<string, any> = {
    fonts: {},
    ctas: [],
    surface: null,
    headings: [],
    radii: [],
    spacings: [],
    fontSizes: [],
    typographyStyles: [],
    componentPairs: [],
  };
  const seenRadii = new Set<number>();
  const seenSpacings = new Set<number>();
  const seenFontSizes = new Set<number>();
  const visible = (el: Element) => {
    if (!el.getClientRects || el.getClientRects().length === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const parsePx = (v: string, rootPx = 16): number | null => {
    if (!v) return null;
    const s = v.trim().toLowerCase();
    if (/clamp\(|calc\(|vw|vh/.test(s)) return null;
    const rem = s.match(/^(-?\d*\.?\d+)\s*(rem|em)$/);
    if (rem) return parseFloat(rem[1]) * rootPx;
    const px = s.match(/^(-?\d*\.?\d+)\s*(?:px)?$/);
    if (px) return parseFloat(px[1]);
    return null;
  };
  const els = document.querySelectorAll('body *');
  let inspected = 0;
  for (const el of els) {
    if (inspected >= 2500) break;
    const tag = el.tagName;
    if (
      tag === 'SCRIPT' ||
      tag === 'STYLE' ||
      tag === 'NOSCRIPT' ||
      tag === 'META' ||
      tag === 'LINK' ||
      tag === 'SVG' ||
      tag === 'PATH'
    )
      continue;
    if (!visible(el)) continue;
    inspected++;
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const area = Math.max(1, Math.round(rect.width * rect.height));

    let hasText = false;
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && (n.textContent || '').trim().length > 1) {
        hasText = true;
        break;
      }
    }
    if (hasText) {
      const fam = cs.fontFamily || '';
      out.fonts[fam] = (out.fonts[fam] || 0) + 1;
      const inlineStyle = el.getAttribute('style') || '';
      const isFluid = /clamp\(|vw|vh/.test(inlineStyle);
      const fs = parsePx(cs.fontSize);
      if (fs !== null && fs > 0 && !isFluid) {
        const roundedFs = Math.round(fs * 2) / 2;
        if (!seenFontSizes.has(roundedFs)) {
          seenFontSizes.add(roundedFs);
          out.fontSizes.push(roundedFs);
        }
        const lhPx = parsePx(cs.lineHeight, fs);
        const lhRatio = lhPx !== null && fs > 0 ? Number((lhPx / fs).toFixed(2)) : null;
        const lsPx = cs.letterSpacing === 'normal' ? 0 : parsePx(cs.letterSpacing, fs);
        if (out.typographyStyles.length < 40) {
          out.typographyStyles.push({
            tag,
            fontFamily: fam,
            fontSize: roundedFs,
            lineHeight: lhRatio,
            letterSpacing: lsPx ?? 0,
            area,
          });
        }
      }
    }

    // All 4 corner radii (#203)
    const corners = [
      cs.borderTopLeftRadius,
      cs.borderTopRightRadius,
      cs.borderBottomRightRadius,
      cs.borderBottomLeftRadius,
    ];
    for (const c of corners) {
      const br = parsePx(c);
      if (br !== null && Number.isFinite(br) && br >= 3 && br <= 64 && !seenRadii.has(br)) {
        seenRadii.add(br);
        out.radii.push(br);
      }
    }

    // Spacing values (#203)
    const spaceProps = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft, cs.gap];
    for (const sp of spaceProps) {
      const px = parsePx(sp);
      if (px !== null && px > 0 && px <= 160 && !seenSpacings.has(px)) {
        seenSpacings.add(px);
        out.spacings.push(px);
      }
    }

    if ((tag === 'A' || tag === 'BUTTON') && out.ctas.length < 30) {
      const bg = cs.backgroundColor || '';
      const a = bg.match(/rgba?\([^)]*?,\s*([\d.]+)\)$/);
      const opaque =
        bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)' && (!a || parseFloat(a[1]) >= 0.5);
      if (opaque) {
        const hasBgImage = Boolean(cs.backgroundImage && cs.backgroundImage !== 'none');
        out.ctas.push({
          bg,
          color: cs.color,
          hasBgImage,
          area,
          text: (el.textContent || '').trim().slice(0, 40),
        });
        out.componentPairs.push({
          tag,
          fg: cs.color,
          bg,
          hasBgImage,
          text: (el.textContent || '').trim().slice(0, 40),
        });
      }
    }

    if ((tag === 'H1' || tag === 'H2' || tag === 'H3') && out.headings.length < 12) {
      out.headings.push({
        tag,
        color: cs.color,
        fontFamily: cs.fontFamily,
        fontSize: parsePx(cs.fontSize),
        area,
      });
    }
  }
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
  out.surface = bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' ? bodyBg : htmlBg;
  return out;
}

// ── Scoring & S-01 Coverage ──────────────────────────────────────────────────
export const SYSTEM_CHECKS = [
  {
    id: 'fonts.declared',
    weight: 25,
    status: 'active',
    evidenceGrade: 'spec-normative',
    era: 'evergreen',
    modelFamilies: ['all'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    label: 'Fonts in use are declared in the system',
  },
  {
    id: 'colors.cta',
    weight: 20,
    status: 'active',
    evidenceGrade: 'spec-normative',
    era: 'evergreen',
    modelFamilies: ['all'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    label: 'CTA / button colors come from the palette (Oklab ΔE ≤ 0.02)',
  },
  {
    id: 'colors.surface',
    weight: 10,
    status: 'active',
    evidenceGrade: 'spec-normative',
    era: 'evergreen',
    modelFamilies: ['all'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    label: 'Page surface color comes from the palette (Oklab ΔE ≤ 0.02)',
  },
  {
    id: 'colors.headings',
    weight: 10,
    status: 'active',
    evidenceGrade: 'spec-normative',
    era: 'evergreen',
    modelFamilies: ['all'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    label: 'Heading colors come from the palette (Oklab ΔE ≤ 0.02)',
  },
  {
    id: 'radii.scale',
    weight: 10,
    status: 'active',
    evidenceGrade: 'spec-normative',
    era: 'evergreen',
    modelFamilies: ['all'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    label: 'Corner radii across all 4 corners follow the declared scale (±2px)',
  },
  {
    id: 'spacing.scale',
    weight: 10,
    status: 'active',
    evidenceGrade: 'spec-normative',
    era: 'evergreen',
    modelFamilies: ['all'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    label: 'Rendered spacing values follow the declared spacing scale (±1px)',
  },
  {
    id: 'typography.scale',
    weight: 10,
    status: 'active',
    evidenceGrade: 'spec-normative',
    era: 'evergreen',
    modelFamilies: ['all'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    label: 'Rendered font sizes follow the declared type scale (±0.5px)',
  },
  {
    id: 'typography.styles',
    weight: 5,
    status: 'active',
    evidenceGrade: 'spec-normative',
    era: 'evergreen',
    modelFamilies: ['all'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    label: 'Composite typography tuples match declared style definitions',
  },
  {
    id: 'contrast.componentPairs',
    weight: 0,
    status: 'review',
    evidenceGrade: 'spec-normative',
    era: 'evergreen',
    modelFamilies: ['all'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    label: 'Component foreground/background pairs meet ≥ 4.5:1 WCAG contrast',
  },
];

export const SYSTEM_TOKEN_CLASSES = [
  'textColor',
  'backgroundColor',
  'borderColor',
  'fontSize',
  'lineHeight',
  'letterSpacing',
  'spacing',
  'borderRadius',
  'boxShadow',
] as const;

function tierForCoverage(countRatio: number, areaRatio?: number): string {
  if (typeof areaRatio === 'number') {
    if (countRatio >= 0.85 && areaRatio >= 0.8) return 'Aligned';
    if (countRatio >= 0.6 && areaRatio >= 0.55) return 'Drifting';
    return 'Off-system';
  }
  if (countRatio >= 0.8) return 'Aligned';
  if (countRatio >= 0.5) return 'Drifting';
  return 'Off-system';
}

export function scoreSystemCompliance(parsed: any, observed: any) {
  if (!parsed) {
    return {
      axis: 'system',
      declared: false,
      evidence: [],
      score: null,
      tier: 'No system',
      message: 'No parseable DESIGN.md tokens — nothing to check against.',
      checks: [],
      drift: [],
      nearMisses: [],
      coverage: null,
      typeScaleInflation: null,
    };
  }
  const tokens = flattenDesignTokens(parsed);
  const obs = observed || {};
  const checks: any[] = [];
  const drift: any[] = [];
  const nearMisses: any[] = [];

  const push = (id: string, status: string, message: string, evidence?: any) => {
    const def = SYSTEM_CHECKS.find((c) => c.id === id);
    checks.push({ ...def, status, message, evidence });
    if (status === 'fail') drift.push({ id, message, evidence });
  };

  // 1. Fonts
  {
    const tally = obs.fonts || {};
    const total = Object.values<number>(tally).reduce((a, b) => a + b, 0);
    if (!tokens.fonts.length || !total) {
      push(
        'fonts.declared',
        'skip',
        !tokens.fonts.length ? 'no typography tokens declared' : 'no text observed'
      );
    } else {
      const used = new Map<string, number>();
      for (const [stack, n] of Object.entries<number>(tally)) {
        const fam = primaryFamily(stack);
        if (fam) used.set(fam, (used.get(fam) || 0) + n);
      }
      const undeclared = [...used.entries()]
        .filter(([fam, n]) => n / total >= 0.1 && !tokens.fonts.includes(fam))
        .map(([fam]) => fam);
      if (undeclared.length) {
        push(
          'fonts.declared',
          'fail',
          `font(s) in use but not in the system: ${undeclared.join(', ')}`,
          { undeclared, declared: tokens.fonts }
        );
      } else {
        push('fonts.declared', 'pass', 'all primary fonts are declared', {
          declared: tokens.fonts,
        });
      }
    }
  }

  // 2. CTA colors ∈ palette (Oklab ΔE <= 0.02 match, 0.02..0.05 near-miss, >0.05 off-palette)
  {
    const ctas = obs.ctas || [];
    if (!tokens.colors.length || !ctas.length) {
      push(
        'colors.cta',
        'skip',
        !tokens.colors.length ? 'no color tokens declared' : 'no filled CTAs observed'
      );
    } else {
      const off: any[] = [];
      for (const c of ctas) {
        const { best, token } = bestColorComparison(tokens.colors, c.bg);
        if (best.status === 'near-miss') {
          nearMisses.push({
            checkId: 'colors.cta',
            observed: c.bg,
            closestToken: token,
            deltaE: best.deltaE,
          });
        } else if (best.status === 'off-palette') {
          off.push({ ...c, closestToken: token, deltaE: best.deltaE });
        }
      }
      if (off.length) {
        push('colors.cta', 'fail', `${off.length}/${ctas.length} CTA color(s) not in the palette`, {
          samples: off.slice(0, 4).map((c) => ({ bg: c.bg, text: c.text, deltaE: c.deltaE })),
        });
      } else {
        push('colors.cta', 'pass', `all ${ctas.length} CTA colors match the palette`);
      }
    }
  }

  // 3. Surface ∈ palette (Oklab)
  {
    if (!tokens.colors.length || !obs.surface) {
      push(
        'colors.surface',
        'skip',
        !tokens.colors.length ? 'no color tokens declared' : 'no surface color observed'
      );
    } else {
      const { best, token } = bestColorComparison(tokens.colors, obs.surface);
      if (best.status === 'near-miss') {
        nearMisses.push({
          checkId: 'colors.surface',
          observed: obs.surface,
          closestToken: token,
          deltaE: best.deltaE,
        });
        push('colors.surface', 'pass', 'surface color is a near-miss to the palette', {
          surface: obs.surface,
          closestToken: token,
          deltaE: best.deltaE,
        });
      } else if (best.status === 'match') {
        push('colors.surface', 'pass', 'surface color matches the palette');
      } else {
        push('colors.surface', 'fail', `surface ${obs.surface} is not in the palette`, {
          surface: obs.surface,
          deltaE: best.deltaE,
        });
      }
    }
  }

  // 4. Heading colors ∈ palette (Oklab)
  {
    const hs = obs.headings || [];
    if (!tokens.colors.length || !hs.length) {
      push(
        'colors.headings',
        'skip',
        !tokens.colors.length ? 'no color tokens declared' : 'no headings observed'
      );
    } else {
      const off: any[] = [];
      for (const h of hs) {
        const { best, token } = bestColorComparison(tokens.colors, h.color);
        if (best.status === 'near-miss') {
          nearMisses.push({
            checkId: 'colors.headings',
            observed: h.color,
            closestToken: token,
            deltaE: best.deltaE,
          });
        } else if (best.status === 'off-palette') {
          off.push({ ...h, deltaE: best.deltaE });
        }
      }
      if (off.length > hs.length / 2) {
        push(
          'colors.headings',
          'fail',
          `${off.length}/${hs.length} heading color(s) not in the palette`,
          {
            samples: off.slice(0, 3).map((h) => ({ tag: h.tag, color: h.color, deltaE: h.deltaE })),
          }
        );
      } else {
        push('colors.headings', 'pass', 'heading colors match the palette');
      }
    }
  }

  // 5. Radii ∈ declared scale (±2px)
  {
    const radii = obs.radii || [];
    if (!tokens.radii.length || !radii.length) {
      push(
        'radii.scale',
        'skip',
        !tokens.radii.length ? 'no rounded tokens declared' : 'no rounded corners observed'
      );
    } else {
      const off = radii.filter((r: number) => !tokens.radii.some((t) => Math.abs(t - r) <= 2));
      if (off.length > radii.length / 2) {
        push(
          'radii.scale',
          'fail',
          `radii off the declared scale: ${off.slice(0, 5).join(', ')}px`,
          { offScale: off.slice(0, 8), declared: tokens.radii }
        );
      } else {
        push('radii.scale', 'pass', 'corner radii follow the declared scale');
      }
    }
  }

  // 6. Spacing scale (#203: ±1px tolerance)
  {
    const spacings = obs.spacings || [];
    if (!tokens.spacing.length || !spacings.length) {
      push(
        'spacing.scale',
        'skip',
        !tokens.spacing.length ? 'no spacing tokens declared' : 'no spacing values observed'
      );
    } else {
      const off = spacings.filter((s: number) => !tokens.spacing.some((t) => Math.abs(t - s) <= 1));
      if (off.length > spacings.length / 2) {
        push(
          'spacing.scale',
          'fail',
          `spacing values off the declared scale: ${off.slice(0, 5).join(', ')}px`,
          { offScale: off.slice(0, 8), declared: tokens.spacing }
        );
      } else {
        push('spacing.scale', 'pass', 'spacing values follow the declared scale');
      }
    }
  }

  // 7. Typography scale (#203: ±0.5px tolerance) + S-04 scale inflation ratio
  let typeScaleInflation: number | null = null;
  {
    const fontSizes = obs.fontSizes || [];
    if (tokens.fontSizes.length > 0 && fontSizes.length > 0) {
      const distinctObs = new Set(fontSizes.map((s: number) => Math.round(s * 2) / 2)).size;
      const distinctDec = new Set(tokens.fontSizes.map((s: number) => Math.round(s * 2) / 2)).size;
      typeScaleInflation = distinctDec > 0 ? Number((distinctObs / distinctDec).toFixed(2)) : null;
    }
    if (!tokens.fontSizes.length || !fontSizes.length) {
      push(
        'typography.scale',
        'skip',
        !tokens.fontSizes.length
          ? 'no typography fontSize tokens declared'
          : 'no font sizes observed'
      );
    } else {
      const off = fontSizes.filter(
        (fs: number) => !tokens.fontSizes.some((t) => Math.abs(t - fs) <= 0.5)
      );
      if (off.length > fontSizes.length / 2) {
        push(
          'typography.scale',
          'fail',
          `font sizes off the declared scale: ${off.slice(0, 5).join(', ')}px`,
          { offScale: off.slice(0, 8), declared: tokens.fontSizes, typeScaleInflation }
        );
      } else {
        push('typography.scale', 'pass', 'font sizes follow the declared scale', {
          declared: tokens.fontSizes,
          typeScaleInflation,
        });
      }
    }
  }

  // 8. Composite typography styles (#283 S-04)
  {
    const obsStyles = obs.typographyStyles || [];
    const decStyles = tokens.typographyStyles.filter((s) => s.fontSize !== null);
    if (!decStyles.length || !obsStyles.length) {
      push(
        'typography.styles',
        'skip',
        !decStyles.length
          ? 'no composite typography styles declared'
          : 'no composite typography styles observed'
      );
    } else {
      const matchesStyle = (obsItem: any, dec: TypographyStyleToken) => {
        if (dec.fontFamily) {
          const obsFam = primaryFamily(obsItem.fontFamily) || normFont(obsItem.fontFamily);
          if (obsFam && obsFam !== dec.fontFamily) return false;
        }
        if (dec.fontSize !== null && typeof obsItem.fontSize === 'number') {
          if (Math.abs(obsItem.fontSize - dec.fontSize) > 0.5) return false;
        }
        if (dec.lineHeight !== null && typeof obsItem.lineHeight === 'number') {
          if (Math.abs(obsItem.lineHeight - dec.lineHeight) > 0.05) return false;
        }
        if (dec.letterSpacing !== null && typeof obsItem.letterSpacing === 'number') {
          if (Math.abs(obsItem.letterSpacing - dec.letterSpacing) > 0.25) return false;
        }
        return true;
      };
      const unmatched = obsStyles.filter(
        (item: any) => !decStyles.some((dec) => matchesStyle(item, dec))
      );
      if (unmatched.length > obsStyles.length / 2) {
        push(
          'typography.styles',
          'fail',
          `${unmatched.length}/${obsStyles.length} text styles do not match any declared composite typography tuple`,
          { samples: unmatched.slice(0, 4) }
        );
      } else {
        push('typography.styles', 'pass', 'composite typography styles match declared tuples');
      }
    }
  }

  // 9. Component contrast pairs (#284 S-05, weight 0 / review)
  {
    const pairs = obs.componentPairs || [];
    if (!pairs.length) {
      push('contrast.componentPairs', 'skip', 'no component foreground/background pairs observed');
    } else {
      const hasImagePair = pairs.some((p: any) => p.hasBgImage);
      const failing: any[] = [];
      for (const pair of pairs) {
        if (pair.hasBgImage) continue;
        const fg = parseColor(pair.fg);
        const bg = parseColor(pair.bg);
        if (fg && bg) {
          const cr = contrastRatio(fg, bg);
          if (cr < 4.5) {
            failing.push({ ...pair, ratio: Number(cr.toFixed(2)) });
          }
        }
      }
      if (failing.length > 0) {
        push(
          'contrast.componentPairs',
          'review',
          `${failing.length} component pair(s) fall below 4.5:1 contrast`,
          { failing: failing.slice(0, 5) }
        );
      } else if (hasImagePair) {
        push(
          'contrast.componentPairs',
          'unknown',
          'component background uses an image; static contrast cannot be verified',
          { imageBackedCount: pairs.filter((p: any) => p.hasBgImage).length }
        );
      } else {
        push('contrast.componentPairs', 'pass', 'all component pairs meet ≥ 4.5:1 contrast');
      }
    }
  }

  // S-01 (#280): Compute dual count-ratio and area-weighted coverage across 9 token classes.
  const coverage = computeClassCoverage(tokens, obs);

  const evaluated = checks.filter(
    (c) => c.status !== 'skip' && c.status !== 'unknown' && c.weight > 0
  );
  const maxScore = evaluated.reduce((s, c) => s + c.weight, 0);
  const got = evaluated.filter((c) => c.status === 'pass').reduce((s, c) => s + c.weight, 0);
  const ratio = maxScore ? got / maxScore : 1;

  return {
    axis: 'system',
    declared: true,
    name: parsed.name,
    evidence: drift,
    score: Math.round(ratio * 100),
    maxScore: 100,
    tier: maxScore ? tierForCoverage(ratio) : 'No data',
    checksEvaluated: evaluated.length,
    checksSkipped: checks.length - evaluated.length,
    checks,
    drift,
    nearMisses,
    coverage,
    typeScaleInflation,
  };
}

function computeClassCoverage(
  tokens: ReturnType<typeof flattenDesignTokens>,
  obs: Record<string, any>
) {
  const classes: Record<string, any> = {};
  const explicitSamples = obs.classSamples || {};

  const evalClass = (
    className: string,
    items: Array<{ matched: boolean; nearMiss?: boolean; area?: number }>
  ) => {
    if (!items.length) {
      classes[className] = {
        countRatio: null,
        areaRatio: null,
        matchedCount: 0,
        nearMissCount: 0,
        totalCount: 0,
        matchedArea: 0,
        totalArea: 0,
        tier: 'No data',
      };
      return;
    }
    let matchedCount = 0;
    let nearMissCount = 0;
    let matchedArea = 0;
    let totalArea = 0;
    for (const it of items) {
      const a = typeof it.area === 'number' && it.area > 0 ? it.area : 1;
      totalArea += a;
      if (it.matched) {
        matchedCount++;
        matchedArea += a;
      } else if (it.nearMiss) {
        nearMissCount++;
        matchedCount += 0.5;
        matchedArea += a * 0.5;
      }
    }
    const countRatio = Number((matchedCount / items.length).toFixed(3));
    const areaRatio = totalArea > 0 ? Number((matchedArea / totalArea).toFixed(3)) : countRatio;
    classes[className] = {
      countRatio,
      areaRatio,
      matchedCount,
      nearMissCount,
      totalCount: items.length,
      matchedArea,
      totalArea,
      tier: tierForCoverage(countRatio, areaRatio),
    };
  };

  for (const cls of SYSTEM_TOKEN_CLASSES) {
    if (Array.isArray(explicitSamples[cls])) {
      const items = explicitSamples[cls].map((sample: any) => {
        if (typeof sample.matched === 'boolean') return sample;
        if (cls === 'textColor' || cls === 'backgroundColor' || cls === 'borderColor') {
          const { best } = bestColorComparison(tokens.colors, sample.value);
          return {
            matched: best.status === 'match',
            nearMiss: best.status === 'near-miss',
            area: sample.area,
          };
        }
        if (cls === 'fontSize') {
          const px = parseLengthPx(sample.value);
          return {
            matched: px !== null && tokens.fontSizes.some((t) => Math.abs(t - px) <= 0.5),
            area: sample.area,
          };
        }
        if (cls === 'lineHeight') {
          const r = parseLineHeightRatio(sample.value, sample.fontSize || 16);
          return {
            matched: r !== null && tokens.lineHeights.some((t) => Math.abs(t - r) <= 0.05),
            area: sample.area,
          };
        }
        if (cls === 'letterSpacing') {
          const px = parseLengthPx(sample.value);
          return {
            matched: px !== null && tokens.letterSpacings.some((t) => Math.abs(t - px) <= 0.25),
            area: sample.area,
          };
        }
        if (cls === 'spacing') {
          const px = parseLengthPx(sample.value);
          return {
            matched: px !== null && tokens.spacing.some((t) => Math.abs(t - px) <= 1),
            area: sample.area,
          };
        }
        if (cls === 'borderRadius') {
          const px = parseLengthPx(sample.value);
          return {
            matched: px !== null && tokens.radii.some((t) => Math.abs(t - px) <= 2),
            area: sample.area,
          };
        }
        if (cls === 'boxShadow') {
          return {
            matched: tokens.shadows.includes(String(sample.value || '').trim()),
            area: sample.area,
          };
        }
        return { matched: false, area: sample.area };
      });
      evalClass(cls, items);
      continue;
    }

    // Synthesize from standard observed fields when classSamples is not supplied
    if (cls === 'textColor') {
      const hs = (obs.headings || []).map((h: any) => {
        const { best } = bestColorComparison(tokens.colors, h.color);
        return {
          matched: best.status === 'match',
          nearMiss: best.status === 'near-miss',
          area: h.area || 1,
        };
      });
      evalClass(cls, tokens.colors.length ? hs : []);
    } else if (cls === 'backgroundColor') {
      const bgs = [
        ...(obs.surface ? [{ bg: obs.surface, area: 1000 }] : []),
        ...(obs.ctas || []).map((c: any) => ({ bg: c.bg, area: c.area || 100 })),
      ].map((item) => {
        const { best } = bestColorComparison(tokens.colors, item.bg);
        return {
          matched: best.status === 'match',
          nearMiss: best.status === 'near-miss',
          area: item.area,
        };
      });
      evalClass(cls, tokens.colors.length ? bgs : []);
    } else if (cls === 'fontSize') {
      const fsItems = (obs.fontSizes || []).map((fs: number) => ({
        matched: tokens.fontSizes.some((t) => Math.abs(t - fs) <= 0.5),
        area: 1,
      }));
      evalClass(cls, tokens.fontSizes.length ? fsItems : []);
    } else if (cls === 'spacing') {
      const spItems = (obs.spacings || []).map((s: number) => ({
        matched: tokens.spacing.some((t) => Math.abs(t - s) <= 1),
        area: 1,
      }));
      evalClass(cls, tokens.spacing.length ? spItems : []);
    } else if (cls === 'borderRadius') {
      const rItems = (obs.radii || []).map((r: number) => ({
        matched: tokens.radii.some((t) => Math.abs(t - r) <= 2),
        area: 1,
      }));
      evalClass(cls, tokens.radii.length ? rItems : []);
    } else {
      evalClass(cls, []);
    }
  }

  const activeClasses = Object.values(classes).filter((c: any) => c.totalCount > 0);
  const overallCountRatio = activeClasses.length
    ? Number(
        (
          activeClasses.reduce((s: number, c: any) => s + c.countRatio, 0) / activeClasses.length
        ).toFixed(3)
      )
    : null;
  const overallAreaRatio = activeClasses.length
    ? Number(
        (
          activeClasses.reduce((s: number, c: any) => s + c.areaRatio, 0) / activeClasses.length
        ).toFixed(3)
      )
    : null;

  return {
    classes,
    overallCountRatio,
    overallAreaRatio,
  };
}

// ── S-02 (#281): DESIGN.md static linter + PR diff check ─────────────────────
export interface DesignMdLintIssue {
  ruleId: 'broken-ref' | 'contrast-ratio' | 'orphaned-tokens' | 'spec-version-mismatch';
  severity: 'error' | 'warning';
  message: string;
  path?: string;
}

export function lintDesignMd(text: string): {
  valid: boolean;
  specVersion: string;
  errors: DesignMdLintIssue[];
  warnings: DesignMdLintIssue[];
  issues: DesignMdLintIssue[];
} {
  const fm = extractFrontMatter(text);
  const errors: DesignMdLintIssue[] = [];
  const warnings: DesignMdLintIssue[] = [];
  if (!fm) {
    errors.push({
      ruleId: 'broken-ref',
      severity: 'error',
      message: 'No parseable YAML front matter or ```yaml block found in DESIGN.md.',
    });
    return { valid: false, specVersion: DESIGN_MD_SPEC_VERSION, errors, warnings, issues: errors };
  }

  const tree = parseYamlSubset(fm);
  const declaredSpecVersion =
    typeof tree.specVersion === 'string' ? tree.specVersion : DESIGN_MD_SPEC_VERSION;
  if (declaredSpecVersion !== DESIGN_MD_SPEC_VERSION) {
    warnings.push({
      ruleId: 'spec-version-mismatch',
      severity: 'warning',
      path: 'specVersion',
      message: `DESIGN.md declares specVersion "${declaredSpecVersion}", expected "${DESIGN_MD_SPEC_VERSION}".`,
    });
  }

  const { brokenRefs, referencedPaths } = resolveRefsWithDiagnostics(tree);
  for (const br of brokenRefs) {
    errors.push({
      ruleId: 'broken-ref',
      severity: 'error',
      path: br.from,
      message:
        br.reason === 'cycle'
          ? `Circular token reference "{${br.ref}}" at "${br.from}".`
          : `Unresolved token reference "{${br.ref}}" at "${br.from}".`,
    });
  }

  // Rule 2: contrast-ratio (< 4.5:1 on component foreground/background pairs)
  for (const [compName, comp] of Object.entries<any>(tree.components || {})) {
    if (!comp || typeof comp !== 'object') continue;
    const bgStr = comp.backgroundColor || comp.background;
    const fgStr = comp.textColor || comp.color;
    if (bgStr && fgStr) {
      const bg = parseColor(String(bgStr));
      const fg = parseColor(String(fgStr));
      if (bg && fg) {
        const cr = contrastRatio(fg, bg);
        if (cr < 4.5) {
          errors.push({
            ruleId: 'contrast-ratio',
            severity: 'error',
            path: `components.${compName}`,
            message: `Component "${compName}" foreground (${fgStr}) on background (${bgStr}) has contrast ${cr.toFixed(2)}:1 (< 4.5:1 WCAG AA minimum).`,
          });
        }
      }
    }
  }

  // Rule 3: orphaned-tokens (tokens declared in colors/rounded/spacing never referenced when components exist)
  const hasComponents =
    tree.components &&
    typeof tree.components === 'object' &&
    Object.keys(tree.components).length > 0;
  if (hasComponents && referencedPaths.size > 0) {
    const checkOrphans = (groupKey: string, node: any, prefix: string) => {
      for (const [k, v] of Object.entries<any>(node || {})) {
        const full = `${prefix}.${k}`;
        if (v && typeof v === 'object') checkOrphans(groupKey, v, full);
        else if (!referencedPaths.has(full)) {
          warnings.push({
            ruleId: 'orphaned-tokens',
            severity: 'warning',
            path: full,
            message: `Token "${full}" is declared in ${groupKey} but never referenced by any component.`,
          });
        }
      }
    };
    checkOrphans('colors', tree.colors, 'colors');
  }

  const issues = [...errors, ...warnings];
  return {
    valid: errors.length === 0,
    specVersion: declaredSpecVersion,
    errors,
    warnings,
    issues,
  };
}

export function diffDesignMd(baseText: string, headText: string) {
  const baseFm = extractFrontMatter(baseText);
  const headFm = extractFrontMatter(headText);
  const baseTree = baseFm ? resolveRefsForDiff(parseYamlSubset(baseFm)) : {};
  const headTree = headFm ? resolveRefsForDiff(parseYamlSubset(headFm)) : {};

  const flattenLeaves = (node: any, prefix = '', out: Record<string, string> = {}) => {
    for (const [k, v] of Object.entries<any>(node || {})) {
      const p = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object') flattenLeaves(v, p, out);
      else out[p] = String(v);
    }
    return out;
  };

  const bLeaves = flattenLeaves(baseTree);
  const hLeaves = flattenLeaves(headTree);
  const added: Array<{ path: string; value: string }> = [];
  const removed: Array<{ path: string; value: string }> = [];
  const changed: Array<{ path: string; before: string; after: string }> = [];

  for (const [k, v] of Object.entries(hLeaves)) {
    if (!(k in bLeaves)) added.push({ path: k, value: v });
    else if (bLeaves[k] !== v) changed.push({ path: k, before: bLeaves[k], after: v });
  }
  for (const [k, v] of Object.entries(bLeaves)) {
    if (!(k in hLeaves)) removed.push({ path: k, value: v });
  }

  return {
    added,
    removed,
    changed,
    breaking: removed.length > 0 || changed.length > 0,
  };
}

function resolveRefsForDiff(tree: Record<string, any>) {
  resolveRefsWithDiagnostics(tree);
  return tree;
}

// ── S-03 (#282): Token-scoped design-slop waivers when DESIGN.md supplied ────
export function applyDesignSystemWaivers(scanResult: Record<string, any>, parsedDesignMd: any) {
  if (!scanResult || !parsedDesignMd) return scanResult;
  const tokens = flattenDesignTokens(parsedDesignMd);

  const hasPurpleToken = tokens.colors.some((c) => {
    const parsed = parseColor(c);
    return parsed ? isPurple(parsed) : false;
  });
  const hasDarkSurfaceToken = tokens.colors.some((c) => {
    const parsed = parseColor(c);
    return parsed ? isDark(parsed) : false;
  });
  const hasCreamSurfaceToken = tokens.colors.some((c) => {
    const parsed = parseColor(c);
    if (!parsed) return false;
    return parsed.r >= 235 && parsed.g >= 230 && parsed.b >= 215 && parsed.r - parsed.b >= 6;
  });
  const hasRadiiScale = tokens.radii.length > 0;

  const waivedPatterns: Array<{
    id: string;
    reason: string;
    declaredToken: string;
    originalWeight: number;
  }> = [];

  const updatedPatterns = (scanResult.patterns || []).map((p: any) => {
    if (!p.triggered) return p;
    if (p.id === 'purple_accent' && hasPurpleToken) {
      const tok = tokens.colors.find((c) => {
        const pc = parseColor(c);
        return pc ? isPurple(pc) : false;
      })!;
      waivedPatterns.push({
        id: p.id,
        reason: `Primary purple accent (${tok}) is explicitly declared in DESIGN.md`,
        declaredToken: tok,
        originalWeight: p.weight,
      });
      return { ...p, waived: true, status: 'review' };
    }
    if (
      (p.id === 'slop_fonts' || p.id === 'centered_hero' || p.id === 'display_mono_heading') &&
      tokens.fonts.length > 0
    ) {
      const heroFam = primaryFamily(p.evidence?.heroFam || p.evidence?.family || '');
      const matchingFont = tokens.fonts.find((f) => (heroFam ? f === heroFam : true));
      if (matchingFont) {
        waivedPatterns.push({
          id: p.id,
          reason: `Font family "${matchingFont}" is explicitly declared in DESIGN.md typography`,
          declaredToken: matchingFont,
          originalWeight: p.weight,
        });
        return { ...p, waived: true, status: 'review' };
      }
    }
    if (p.id === 'perma_dark_mode' && hasDarkSurfaceToken) {
      const tok = tokens.colors.find((c) => {
        const pc = parseColor(c);
        return pc ? isDark(pc) : false;
      })!;
      waivedPatterns.push({
        id: p.id,
        reason: `Dark surface token (${tok}) is explicitly declared in DESIGN.md`,
        declaredToken: tok,
        originalWeight: p.weight,
      });
      return { ...p, waived: true, status: 'review' };
    }
    if ((p.id === 'cream_default_bg' || p.id === 'editorial_cream_kit') && hasCreamSurfaceToken) {
      const tok = tokens.colors.find((c) => {
        const pc = parseColor(c);
        return pc ? pc.r >= 235 && pc.g >= 230 && pc.b >= 215 && pc.r - pc.b >= 6 : false;
      })!;
      waivedPatterns.push({
        id: p.id,
        reason: `Warm cream surface (${tok}) is explicitly declared in DESIGN.md`,
        declaredToken: tok,
        originalWeight: p.weight,
      });
      return { ...p, waived: true, status: 'review' };
    }
    if (p.id === 'uniform_radius_shadow' && hasRadiiScale) {
      waivedPatterns.push({
        id: p.id,
        reason: `Border-radius scale (${tokens.radii.join(', ')}px) is explicitly declared in DESIGN.md`,
        declaredToken: tokens.radii.join(','),
        originalWeight: p.weight,
      });
      return { ...p, waived: true, status: 'review' };
    }
    return p;
  });

  const rawScore = scanResult.score ?? 0;
  const rawTier = scanResult.tier ?? 'Clean';
  const waivedPoints = waivedPatterns.reduce((s, w) => s + w.originalWeight, 0);
  const waivedScore = Math.max(0, rawScore - waivedPoints);
  const waivedTier = waivedScore >= 28 ? 'Heavy' : waivedScore >= 10 ? 'Mild' : 'Clean';

  return {
    ...scanResult,
    rawScore,
    rawTier,
    score: waivedScore,
    tier: waivedTier,
    waivedScore,
    waivedTier,
    waivedPatterns,
    patterns: updatedPatterns,
  };
}

// ── S-07 (#286): Optional reference-screen Oklab histogram distance ──────────
export function computeOklabHistogramDistance(
  referenceColors: string[],
  observedColors: string[]
): { distance: number | null; matchedShare: number | null; scored: false } {
  const refParsed = (referenceColors || []).map((c) => parseColor(c)).filter(Boolean);
  const obsParsed = (observedColors || []).map((c) => parseColor(c)).filter(Boolean);
  if (!refParsed.length || !obsParsed.length) {
    return { distance: null, matchedShare: null, scored: false };
  }
  let totalMinDe = 0;
  let matched = 0;
  for (const obs of obsParsed) {
    let minDe = Infinity;
    for (const ref of refParsed) {
      const d = deltaEOklab(obs!, ref!);
      if (d < minDe) minDe = d;
    }
    totalMinDe += minDe;
    if (minDe <= 0.05) matched++;
  }
  return {
    distance: Number((totalMinDe / obsParsed.length).toFixed(4)),
    matchedShare: Number((matched / obsParsed.length).toFixed(3)),
    scored: false,
  };
}

// ── #204: DTCG 2025.10 tokens.json parser & extractor ────────────────────────
export interface ParseDtcgOptions {
  lenient?: boolean;
}

function dtcgColorValueToCss(val: any): string | null {
  if (typeof val === 'string') return val.trim();
  if (!val || typeof val !== 'object') return null;
  if (
    typeof val.hex === 'string' &&
    val.hex.trim() &&
    (val.alpha === undefined || val.alpha === 1)
  ) {
    return val.hex.trim();
  }
  const space = String(val.colorSpace || 'srgb').toLowerCase();
  const comps = Array.isArray(val.components) ? val.components : [];
  if (comps.length < 3) return typeof val.hex === 'string' ? val.hex.trim() : null;
  const alpha = typeof val.alpha === 'number' ? val.alpha : 1;
  const c0 = comps[0] === 'none' ? 0 : Number(comps[0]);
  const c1 = comps[1] === 'none' ? 0 : Number(comps[1]);
  const c2 = comps[2] === 'none' ? 0 : Number(comps[2]);
  if (space === 'oklch') {
    return `oklch(${c0} ${c1} ${c2}${alpha < 1 ? ` / ${alpha}` : ''})`;
  }
  if (space === 'oklab') {
    return `oklab(${c0} ${c1} ${c2}${alpha < 1 ? ` / ${alpha}` : ''})`;
  }
  if (space === 'srgb') {
    // DTCG 2025.10 srgb components are 0..1 floats (or 0..255 in lenient files)
    const scale = c0 <= 1 && c1 <= 1 && c2 <= 1 && (c0 > 0 || c1 > 0 || c2 > 0) ? 255 : 1;
    const r = Math.round(c0 * scale);
    const g = Math.round(c1 * scale);
    const b = Math.round(c2 * scale);
    return alpha < 1 ? `rgba(${r}, ${g}, ${b}, ${alpha})` : `rgb(${r}, ${g}, ${b})`;
  }
  return `color(${space} ${c0} ${c1} ${c2}${alpha < 1 ? ` / ${alpha}` : ''})`;
}

function dtcgDimensionToCss(val: any): string | null {
  if (typeof val === 'number') return `${val}px`;
  if (typeof val === 'string') return val.trim();
  if (val && typeof val === 'object' && typeof val.value === 'number') {
    const unit = val.unit || 'px';
    return `${val.value}${unit}`;
  }
  return null;
}

export function parseDtcgTokens(
  input: string | Record<string, any>,
  opts: ParseDtcgOptions = {}
): Record<string, any> | null {
  let raw: Record<string, any>;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;
    try {
      raw = JSON.parse(trimmed);
    } catch {
      try {
        raw = parseYamlSubset(trimmed);
      } catch {
        return null;
      }
    }
  } else if (input && typeof input === 'object') {
    raw = JSON.parse(JSON.stringify(input));
  } else {
    return null;
  }

  const errors: Array<{ code: string; path: string; message: string }> = [];
  let nonConformant = false;

  // Resolve $extends on groups first
  const resolveNodeByPath = (pathStr: string): any => {
    const clean = pathStr
      .replace(/^#\//, '')
      .replace(/\//g, '.')
      .replace(/^\{|\}$/g, '');
    let cur: any = raw;
    for (const seg of clean.split('.').filter(Boolean)) {
      if (!cur || typeof cur !== 'object') return undefined;
      cur = cur[seg];
    }
    return cur;
  };

  const applyGroupExtends = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (typeof node.$extends === 'string') {
      const baseGroup = resolveNodeByPath(node.$extends);
      if (baseGroup && typeof baseGroup === 'object') {
        for (const [k, v] of Object.entries(baseGroup)) {
          if (k.startsWith('$')) continue;
          if (!(k in node)) node[k] = JSON.parse(JSON.stringify(v));
        }
      } else {
        errors.push({
          code: 'broken-ref',
          path: node.$extends,
          message: `Unresolved $extends reference "${node.$extends}".`,
        });
      }
    }
    for (const [k, v] of Object.entries(node)) {
      if (!k.startsWith('$') && v && typeof v === 'object') applyGroupExtends(v);
    }
  };
  applyGroupExtends(raw);

  // Collect flat token map: path -> { type, rawValue }
  const flatTokens = new Map<string, { type: string; value: any; ref?: string }>();

  const walkDtcg = (node: any, pathParts: string[], inheritedType?: string) => {
    if (!node || typeof node !== 'object') return;
    const currentType = typeof node.$type === 'string' ? node.$type : inheritedType;

    // Check if this node is a token ($value or $ref, or lenient value)
    const hasDollarValue = '$value' in node || '$ref' in node;
    const hasLenientValue = !hasDollarValue && opts.lenient && 'value' in node;
    if (hasLenientValue) nonConformant = true;

    if (hasDollarValue || hasLenientValue) {
      const tokenPath = pathParts.join('.');
      const val = '$value' in node ? node.$value : node.value;
      const ref = typeof node.$ref === 'string' ? node.$ref : undefined;
      const tokType =
        currentType ||
        (typeof node.type === 'string' ? ((nonConformant = true), node.type) : undefined) ||
        inferTokenType(pathParts, val);
      if (!currentType && !node.$type) {
        if (opts.lenient) nonConformant = true;
      }
      flatTokens.set(tokenPath, { type: tokType || 'unknown', value: val, ref });
      return;
    }

    for (const [k, v] of Object.entries(node)) {
      if (k === '$root' && v && typeof v === 'object') {
        walkDtcg(v, pathParts, currentType);
        continue;
      }
      if (k.startsWith('$')) continue;
      if (/[{}.]/.test(k)) {
        errors.push({
          code: 'invalid-name',
          path: [...pathParts, k].join('.'),
          message: `Invalid DTCG token/group name "${k}" (must not contain '{', '}', or '.').`,
        });
        if (!opts.lenient) continue;
        nonConformant = true;
      }
      walkDtcg(v, [...pathParts, k], currentType);
    }
  };

  walkDtcg(raw, []);

  // Resolve aliases ({group.token} and $ref: "#/group/token/$value") with cycle detection
  const resolveTokenValue = (path: string, visited = new Set<string>()): any => {
    const entry = flatTokens.get(path);
    if (!entry) return undefined;
    if (visited.has(path)) {
      errors.push({
        code: 'cycle',
        path,
        message: `Circular token alias involving "${path}".`,
      });
      return undefined;
    }
    visited.add(path);

    let targetPath: string | null = null;
    if (typeof entry.ref === 'string') {
      targetPath = entry.ref
        .replace(/^#\//, '')
        .replace(/\/\$value$/, '')
        .replace(/\//g, '.');
    } else if (typeof entry.value === 'string') {
      const m = entry.value.trim().match(/^\{([^{}]+)\}$/);
      if (m) targetPath = m[1];
    }

    if (targetPath) {
      if (!flatTokens.has(targetPath)) {
        errors.push({
          code: 'broken-ref',
          path,
          message: `Unresolved token alias "${targetPath}" referenced by "${path}".`,
        });
        return undefined;
      }
      return resolveTokenValue(targetPath, visited);
    }
    return entry.value;
  };

  const colors: Record<string, string> = {};
  const typography: Record<string, any> = {};
  const rounded: Record<string, string> = {};
  const spacing: Record<string, string> = {};
  const shadows: Record<string, string> = {};
  const components: Record<string, any> = {};

  for (const [path, entry] of flatTokens.entries()) {
    const resolved = resolveTokenValue(path);
    if (resolved === undefined) continue;
    const t = entry.type;
    const shortKey = path.replace(/\./g, '_');

    if (t === 'color') {
      const css = dtcgColorValueToCss(resolved);
      if (css) colors[shortKey] = css;
      else if (opts.lenient && typeof resolved === 'string') {
        nonConformant = true;
        colors[shortKey] = resolved;
      }
    } else if (t === 'fontFamily') {
      const fam = Array.isArray(resolved) ? resolved.join(', ') : String(resolved);
      typography[shortKey] = { fontFamily: fam };
    } else if (t === 'typography' && resolved && typeof resolved === 'object') {
      typography[shortKey] = {
        fontFamily: Array.isArray(resolved.fontFamily)
          ? resolved.fontFamily.join(', ')
          : resolved.fontFamily,
        fontSize: dtcgDimensionToCss(resolved.fontSize) ?? resolved.fontSize,
        lineHeight: resolved.lineHeight,
        letterSpacing: dtcgDimensionToCss(resolved.letterSpacing) ?? resolved.letterSpacing,
        fontWeight: resolved.fontWeight,
      };
    } else if (t === 'dimension') {
      const dim = dtcgDimensionToCss(resolved);
      if (dim) {
        if (/radius|rounded|corner/i.test(path)) rounded[shortKey] = dim;
        else if (/font|size|text/i.test(path)) {
          typography[shortKey] = { ...(typography[shortKey] || {}), fontSize: dim };
        } else {
          spacing[shortKey] = dim;
        }
      }
    } else if (t === 'shadow') {
      shadows[shortKey] = typeof resolved === 'string' ? resolved : JSON.stringify(resolved);
    }
  }

  return {
    name:
      typeof raw.$name === 'string'
        ? raw.$name
        : typeof raw.name === 'string'
          ? raw.name
          : 'DTCG Tokens',
    specVersion: '2025.10',
    dtcg: true,
    nonConformant,
    errors,
    colors,
    typography,
    rounded,
    spacing,
    shadows,
    components,
  };
}

function inferTokenType(pathParts: string[], val: any): string | undefined {
  const joined = pathParts.join('.').toLowerCase();
  if (val && typeof val === 'object' && ('colorSpace' in val || 'components' in val))
    return 'color';
  if (/color|surface|ink|primary|accent|bg|background/.test(joined)) return 'color';
  if (/font|family/.test(joined)) return 'fontFamily';
  if (/radius|rounded/.test(joined)) return 'dimension';
  if (/space|spacing|gap|padding/.test(joined)) return 'dimension';
  return undefined;
}

// ── DESIGN.md & DTCG generators (#332) ───────────────────────────────────────
function toHexColor(str: unknown): string {
  const rgb = parseCssColor(str);
  if (!rgb) return String(str || '').trim();
  return (
    '#' +
    rgb
      .map((n) =>
        Math.max(0, Math.min(255, Math.round(n)))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
      .toUpperCase()
  );
}

export function extractDtcgTokens(
  observed: any = {},
  opts: { name?: string } = {}
): Record<string, any> {
  const md = generateDesignMd(observed, opts);
  const parsed = parseDesignMd(md);
  const tokens = parsed
    ? flattenDesignTokens(parsed)
    : { colors: [], fonts: [], radii: [], spacing: [] };
  const hexToSrgb = (hex: string) => {
    const rgb = parseCssColor(hex) || [0, 0, 0];
    return {
      colorSpace: 'srgb',
      components: rgb.map((c) => Number((c / 255).toFixed(4))),
      hex,
    };
  };
  const colorsGroup: Record<string, any> = { $type: 'color' };
  if (parsed?.colors) {
    for (const [k, v] of Object.entries<string>(parsed.colors)) {
      colorsGroup[k] = { $value: hexToSrgb(toHexColor(v)) };
    }
  }
  const typographyGroup: Record<string, any> = { $type: 'fontFamily' };
  if (parsed?.typography) {
    for (const [k, v] of Object.entries<any>(parsed.typography)) {
      if (v?.fontFamily) typographyGroup[k] = { $value: v.fontFamily };
    }
  }
  const roundedGroup: Record<string, any> = { $type: 'dimension' };
  if (parsed?.rounded) {
    for (const [k, v] of Object.entries<any>(parsed.rounded)) {
      const px = parseLengthPx(v) ?? 0;
      roundedGroup[k] = { $value: { value: px, unit: 'px' } };
    }
  }
  return {
    $name: opts.name || 'Site Design System',
    colors: colorsGroup,
    typography: typographyGroup,
    rounded: roundedGroup,
  };
}

export function buildSystemTokenDiff(systemResult: any, waivers: any[] = []) {
  return {
    score: systemResult?.score ?? null,
    tier: systemResult?.tier ?? 'No system',
    drift: systemResult?.drift || [],
    nearMisses: systemResult?.nearMisses || [],
    coverage: systemResult?.coverage || null,
    waivedPatterns: waivers.map((w) => ({
      id: w.id,
      reason: w.reason,
      declaredToken: w.declaredToken,
    })),
  };
}

export function generateDesignMd(
  observed: any = {},
  opts: { name?: string; url?: string } = {}
): string {
  const obs = observed || {};
  const name = opts.name || 'Site Design System';

  const tally = obs.fonts || {};
  const totalFonts = Object.values<number>(tally).reduce((a, b) => a + b, 0);
  const famCounts = new Map<string, number>();
  for (const [stack, count] of Object.entries<number>(tally)) {
    const fam = primaryFamily(stack);
    if (fam) famCounts.set(fam, (famCounts.get(fam) || 0) + count);
  }
  const sortedFonts = [...famCounts.entries()]
    .filter(([, n]) => !totalFonts || n / totalFonts >= 0.05)
    .sort((a, b) => b[1] - a[1])
    .map(([fam]) => fam);

  const h1Fam =
    (Array.isArray(obs.headings) &&
      obs.headings[0]?.fontFamily &&
      primaryFamily(obs.headings[0].fontFamily)) ||
    sortedFonts[0] ||
    'system-ui';
  const bodyFam = sortedFonts[0] || h1Fam;
  const extraFonts = sortedFonts.filter((f) => f !== h1Fam && f !== bodyFam);

  const surfaceHex = obs.surface ? toHexColor(obs.surface) : '#FFFFFF';
  const headingHex =
    Array.isArray(obs.headings) && obs.headings[0]?.color
      ? toHexColor(obs.headings[0].color)
      : '#181815';
  const ctaHexes: string[] = [];
  for (const c of obs.ctas || []) {
    if (!c?.bg) continue;
    const hx = toHexColor(c.bg);
    if (hx && !ctaHexes.some((existing) => colorsMatch(existing, hx, 0.015))) {
      ctaHexes.push(hx);
    }
  }
  const primaryCta = ctaHexes[0] || headingHex;
  const extraHeadingHexes: string[] = [];
  for (const h of Array.isArray(obs.headings) ? obs.headings.slice(1) : []) {
    if (!h?.color) continue;
    const hx = toHexColor(h.color);
    if (
      hx &&
      !colorsMatch(headingHex, hx, 0.015) &&
      !extraHeadingHexes.some((existing) => colorsMatch(existing, hx, 0.015))
    ) {
      extraHeadingHexes.push(hx);
    }
  }

  const radii = Array.isArray(obs.radii)
    ? [
        ...new Set<number>(
          obs.radii
            .map((r: number) => Math.round(Number(r)))
            .filter((r: number) => Number.isFinite(r))
        ),
      ].sort((a, b) => a - b)
    : [];
  const radiusKeys = ['sm', 'md', 'lg', 'xl', '2xl', '3xl'];

  const colorLines = [
    `  surface: "${surfaceHex}"`,
    `  ink: "${headingHex}"`,
    `  primary: "${primaryCta}"`,
    ...ctaHexes.slice(1).map((hx, idx) => `  accent_${idx + 1}: "${hx}"`),
    ...extraHeadingHexes.map((hx, idx) => `  ink_${idx + 2}: "${hx}"`),
  ];

  const typoLines = [
    `  h1:`,
    `    fontFamily: "${h1Fam}"`,
    `  body:`,
    `    fontFamily: "${bodyFam}"`,
    ...extraFonts.map((f, idx) => `  font_${idx + 1}:\n    fontFamily: "${f}"`),
  ];

  const roundedLines = (radii.length ? radii : [4, 8]).map(
    (r, i) => `  ${radiusKeys[i] || `r${i + 1}`}: ${r}px`
  );

  return `---
name: "${name.replace(/"/g, '\\"')}"
colors:
${colorLines.join('\n')}
typography:
${typoLines.join('\n')}
rounded:
${roundedLines.join('\n')}
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
---

# ${name} — Design System (\`DESIGN.md\`)

${opts.url ? `Extracted from live DOM tokens at \`${opts.url}\`.\n\n` : ''}## Normative Tokens

- **Surface**: \`${surfaceHex}\`
- **Primary / Ink**: \`${headingHex}\`
- **CTA Accent**: \`${primaryCta}\`
- **Typography**: Heading \`${h1Fam}\`, Body \`${bodyFam}\`
- **Corner Radius Scale**: ${(radii.length ? radii : [4, 8]).map((r) => `${r}px`).join(', ')}

Verify alignment anytime with:

\`\`\`bash
npx slop-detect ${opts.url || '<url>'} --design-md ./DESIGN.md
\`\`\`
`;
}
