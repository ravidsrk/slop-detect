// The `system` axis — DESIGN.md compliance ("does this page honor its declared
// design system?").
//
// WHY THIS AXIS EXISTS (Roadmap v2 P1): the absolute slop fingerprint decays as
// AI builders adopt per-brand constraints, and it false-positives on premium
// bespoke design (Linear/Stripe — see CALIBRATION.md). Compliance with a site's
// OWN declared tokens is a *relative* signal: it cannot decay (the reference is
// per-customer, not a global fashion) and it cannot punish great custom design.
// Higher is better, like the AEO axis — this measures alignment, not slop.
//
// Reference format: Google Labs DESIGN.md spec (github.com/google-labs-code/design.md,
// Apache-2.0, alpha): YAML front matter between `---` fences carries the
// normative tokens (colors, typography, rounded, spacing, components — with
// `{path.to.token}` cross-references); markdown prose follows. "The tokens are
// the normative values."
//
// Pure JS, zero deps. The YAML reader below is a deliberate SUBSET parser
// (nested maps + scalar leaves + comments — what the spec's token schema uses).
// It degrades gracefully: anything it can't read is skipped, and a file with no
// readable tokens yields null so the axis reports "no system declared" rather
// than inventing drift. Signals, never verdicts.

// ── Front-matter extraction ──────────────────────────────────────────────────
export function extractFrontMatter(text) {
  if (typeof text !== 'string') return null;
  const m = text.match(/^﻿?\s*---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  return m ? m[1] : null;
}

// Minimal YAML-subset reader: nested maps, scalar leaves, quoted/unquoted
// values, full-line + trailing comments. Arrays and multi-line scalars are
// skipped (not used by the DESIGN.md token schema).
function parseYamlSubset(src) {
  const root = {};
  // Stack of { indent, node } — current nesting path.
  const stack = [{ indent: -1, node: root }];
  for (const rawLine of src.split(/\r?\n/)) {
    if (!rawLine.trim() || /^\s*#/.test(rawLine)) continue;
    const indent = rawLine.match(/^ */)[0].length;
    const line = rawLine.trim();
    if (line.startsWith('- ')) continue; // arrays: out of scope, skip safely

    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    // Pop to the parent for this indentation level.
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].node;

    if (value === '') {
      const child = {};
      parent[key] = child;
      stack.push({ indent, node: child });
      continue;
    }
    // Quoted value: take the quoted content verbatim (protects "#1A1C1E").
    const q = value.match(/^(['"])(.*?)\1/);
    if (q) value = q[2];
    else {
      // Unquoted: strip a trailing comment (space + #).
      const c = value.search(/\s#/);
      if (c >= 0) value = value.slice(0, c).trim();
    }
    parent[key] = value;
  }
  return root;
}

// Resolve {path.to.token} references against the parsed tree (one pass, with a
// small chain allowance; unresolvable references stay as-is).
function resolveRefs(tree) {
  const lookup = (path) => {
    let node = tree;
    for (const part of path.split('.')) {
      if (!node || typeof node !== 'object') return undefined;
      node = node[part];
    }
    return typeof node === 'string' ? node : undefined;
  };
  const walk = (node) => {
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (v && typeof v === 'object') { walk(v); continue; }
      if (typeof v !== 'string') continue;
      let cur = v, hops = 0;
      while (hops++ < 4) {
        const m = cur.match(/^\{([\w.-]+)\}$/);
        if (!m) break;
        const resolved = lookup(m[1]);
        if (resolved === undefined || resolved === cur) break;
        cur = resolved;
      }
      node[k] = cur;
    }
  };
  walk(tree);
  return tree;
}

// Parse a DESIGN.md document into its token tree. Returns null when there is no
// readable front matter or no recognizable tokens (caller reports "no system").
export function parseDesignMd(text) {
  const fm = extractFrontMatter(text);
  if (!fm) return null;
  let tree;
  try { tree = resolveRefs(parseYamlSubset(fm)); } catch { return null; }
  const hasTokens = ['colors', 'typography', 'rounded', 'spacing', 'components']
    .some((k) => tree[k] && typeof tree[k] === 'object' && Object.keys(tree[k]).length > 0);
  if (!hasTokens) return null;
  return {
    name: typeof tree.name === 'string' ? tree.name : null,
    colors: tree.colors || {},
    typography: tree.typography || {},
    rounded: tree.rounded || {},
    spacing: tree.spacing || {},
    components: tree.components || {}
  };
}

// ── Token flattening ─────────────────────────────────────────────────────────
const GENERIC_FONTS = new Set([
  'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui',
  'ui-sans-serif', 'ui-serif', 'ui-monospace', 'ui-rounded', '-apple-system',
  'blinkmacsystemfont', 'apple color emoji', 'segoe ui emoji', 'segoe ui symbol',
  'noto color emoji', 'emoji', 'math'
]);

function normFont(name) {
  return String(name || '').replace(/['"]/g, '').trim().toLowerCase();
}

// First concrete (non-generic) family in a CSS font-family stack.
export function primaryFamily(stack) {
  for (const part of String(stack || '').split(',')) {
    const f = normFont(part);
    if (f && !GENERIC_FONTS.has(f)) return f;
  }
  return null;
}

// Parse a CSS color (hex 3/4/6/8, rgb()/rgba()) → [r,g,b] or null. oklch/named
// colors fall back to exact-string matching in the comparator.
export function parseCssColor(str) {
  const s = String(str || '').trim().toLowerCase();
  let m = s.match(/^#([0-9a-f]{3,4})$/);
  if (m) {
    const h = m[1];
    return [0, 1, 2].map((i) => parseInt(h[i] + h[i], 16));
  }
  m = s.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/);
  if (m) {
    const h = m[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  m = s.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return null;
}

function colorsMatch(a, b, tolerance = 10) {
  const ca = parseCssColor(a);
  const cb = parseCssColor(b);
  if (ca && cb) {
    return Math.abs(ca[0] - cb[0]) <= tolerance &&
           Math.abs(ca[1] - cb[1]) <= tolerance &&
           Math.abs(ca[2] - cb[2]) <= tolerance;
  }
  // Unparseable format (oklch, named): exact normalized string only.
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

// Flatten a parsed DESIGN.md into comparable sets: declared font families,
// palette colors (colors.* + component bg/text colors), and the rounded scale.
export function flattenDesignTokens(parsed) {
  const fonts = new Set();
  const colors = [];
  const radii = [];

  for (const t of Object.values(parsed.typography || {})) {
    const fam = typeof t === 'object' ? t.fontFamily : t;
    const f = typeof fam === 'string' ? primaryFamily(fam) || normFont(fam) : null;
    if (f) fonts.add(f);
  }
  const pushColor = (v) => { if (typeof v === 'string' && v.trim()) colors.push(v.trim()); };
  const walkColors = (node) => {
    for (const v of Object.values(node || {})) {
      if (v && typeof v === 'object') walkColors(v);
      else pushColor(v);
    }
  };
  walkColors(parsed.colors);
  for (const comp of Object.values(parsed.components || {})) {
    if (!comp || typeof comp !== 'object') continue;
    pushColor(comp.backgroundColor);
    pushColor(comp.textColor);
    const fam = comp.typography && typeof comp.typography === 'object'
      ? comp.typography.fontFamily : null;
    const f = typeof fam === 'string' ? primaryFamily(fam) || normFont(fam) : null;
    if (f) fonts.add(f);
  }
  for (const v of Object.values(parsed.rounded || {})) {
    const px = parseFloat(v);
    if (Number.isFinite(px)) radii.push(px);
  }
  return { fonts: [...fonts], colors, radii };
}

// ── In-page observation ──────────────────────────────────────────────────────
// Serialized into the page (fn.toString(), like extractTextContext) — must be
// fully self-contained: no closures over module scope.
export function extractSystemContext() {
  const out = { fonts: {}, ctas: [], surface: null, headings: [], radii: [] };
  const seenRadii = new Set();
  const visible = (el) => {
    if (!el.getClientRects || el.getClientRects().length === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const els = document.querySelectorAll('body *');
  let inspected = 0;
  for (const el of els) {
    if (inspected >= 2500) break;
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' ||
        tag === 'META' || tag === 'LINK' || tag === 'SVG' || tag === 'PATH') continue;
    if (!visible(el)) continue;
    inspected++;
    const cs = getComputedStyle(el);

    // Font tally: only elements carrying their own text.
    let hasText = false;
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && n.textContent.trim().length > 1) { hasText = true; break; }
    }
    if (hasText) {
      const fam = cs.fontFamily || '';
      out.fonts[fam] = (out.fonts[fam] || 0) + 1;
    }

    // Distinct corner radii (skip pills/circles — shape choices, not scale).
    const br = parseFloat(cs.borderTopLeftRadius);
    if (Number.isFinite(br) && br >= 3 && br <= 64 && !seenRadii.has(br)) {
      seenRadii.add(br);
      out.radii.push(br);
    }

    // CTA colors: visible buttons/links with a real background fill.
    if ((tag === 'A' || tag === 'BUTTON') && out.ctas.length < 30) {
      const bg = cs.backgroundColor || '';
      const a = bg.match(/rgba?\([^)]*?,\s*([\d.]+)\)$/);
      const opaque = bg && bg !== 'transparent' && (!a || parseFloat(a[1]) >= 0.5);
      if (opaque) {
        out.ctas.push({
          bg,
          text: (el.textContent || '').trim().slice(0, 40)
        });
      }
    }

    // Heading colors.
    if ((tag === 'H1' || tag === 'H2' || tag === 'H3') && out.headings.length < 12) {
      out.headings.push({ tag, color: cs.color, fontFamily: cs.fontFamily });
    }
  }
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
  out.surface = (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)') ? bodyBg : htmlBg;
  return out;
}

// ── Scoring ──────────────────────────────────────────────────────────────────
// Weighted checks like the AEO axis. Higher is better. Checks that cannot be
// evaluated (nothing declared, or nothing observed) are SKIPPED and excluded
// from the denominator — absence of data must never read as drift.
export const SYSTEM_CHECKS = [
  { id: 'fonts.declared',  weight: 35, label: 'Fonts in use are declared in the system' },
  { id: 'colors.cta',      weight: 30, label: 'CTA / button colors come from the palette' },
  { id: 'colors.surface',  weight: 15, label: 'Page surface color comes from the palette' },
  { id: 'colors.headings', weight: 10, label: 'Heading colors come from the palette' },
  { id: 'radii.scale',     weight: 10, label: 'Corner radii follow the declared scale' }
];

function tierForRatio(ratio) {
  if (ratio >= 0.8) return 'Aligned';
  if (ratio >= 0.5) return 'Drifting';
  return 'Off-system';
}

export function scoreSystemCompliance(parsed, observed) {
  if (!parsed) {
    return { axis: 'system', declared: false, score: null, tier: 'No system',
      message: 'No parseable DESIGN.md tokens — nothing to check against.', checks: [], drift: [] };
  }
  const tokens = flattenDesignTokens(parsed);
  const obs = observed || {};
  const checks = [];
  const drift = [];
  const push = (id, status, message, evidence) => {
    const def = SYSTEM_CHECKS.find((c) => c.id === id);
    checks.push({ ...def, status, message, evidence });
    if (status === 'fail') drift.push({ id, message, evidence });
  };

  // 1. Fonts: every meaningfully-used concrete family should be declared.
  {
    const tally = obs.fonts || {};
    const total = Object.values(tally).reduce((a, b) => a + b, 0);
    if (!tokens.fonts.length || !total) {
      push('fonts.declared', 'skip', !tokens.fonts.length
        ? 'no typography tokens declared' : 'no text observed');
    } else {
      const used = new Map(); // primary family -> count
      for (const [stack, n] of Object.entries(tally)) {
        const fam = primaryFamily(stack);
        if (fam) used.set(fam, (used.get(fam) || 0) + n);
      }
      // "Meaningful" = ≥10% of text elements, so one icon-font widget isn't drift.
      const undeclared = [...used.entries()]
        .filter(([fam, n]) => n / total >= 0.1 && !tokens.fonts.includes(fam))
        .map(([fam]) => fam);
      if (undeclared.length) {
        push('fonts.declared', 'fail',
          `font(s) in use but not in the system: ${undeclared.join(', ')}`,
          { undeclared, declared: tokens.fonts });
      } else {
        push('fonts.declared', 'pass', 'all primary fonts are declared', { declared: tokens.fonts });
      }
    }
  }

  // 2. CTA colors ∈ palette.
  {
    const ctas = obs.ctas || [];
    if (!tokens.colors.length || !ctas.length) {
      push('colors.cta', 'skip', !tokens.colors.length ? 'no color tokens declared' : 'no filled CTAs observed');
    } else {
      const off = ctas.filter((c) => !tokens.colors.some((t) => colorsMatch(t, c.bg)));
      if (off.length) {
        push('colors.cta', 'fail',
          `${off.length}/${ctas.length} CTA color(s) not in the palette`,
          { samples: off.slice(0, 4).map((c) => ({ bg: c.bg, text: c.text })) });
      } else {
        push('colors.cta', 'pass', `all ${ctas.length} CTA colors match the palette`);
      }
    }
  }

  // 3. Surface ∈ palette.
  {
    if (!tokens.colors.length || !obs.surface) {
      push('colors.surface', 'skip', !tokens.colors.length ? 'no color tokens declared' : 'no surface color observed');
    } else if (tokens.colors.some((t) => colorsMatch(t, obs.surface, 14))) {
      push('colors.surface', 'pass', 'surface color matches the palette');
    } else {
      push('colors.surface', 'fail', `surface ${obs.surface} is not in the palette`, { surface: obs.surface });
    }
  }

  // 4. Heading colors ∈ palette.
  {
    const hs = obs.headings || [];
    if (!tokens.colors.length || !hs.length) {
      push('colors.headings', 'skip', !tokens.colors.length ? 'no color tokens declared' : 'no headings observed');
    } else {
      const off = hs.filter((h) => !tokens.colors.some((t) => colorsMatch(t, h.color, 14)));
      if (off.length > hs.length / 2) {
        push('colors.headings', 'fail',
          `${off.length}/${hs.length} heading color(s) not in the palette`,
          { samples: off.slice(0, 3).map((h) => ({ tag: h.tag, color: h.color })) });
      } else {
        push('colors.headings', 'pass', 'heading colors match the palette');
      }
    }
  }

  // 5. Radii ∈ declared scale (±2px).
  {
    const radii = obs.radii || [];
    if (!tokens.radii.length || !radii.length) {
      push('radii.scale', 'skip', !tokens.radii.length ? 'no rounded tokens declared' : 'no rounded corners observed');
    } else {
      const off = radii.filter((r) => !tokens.radii.some((t) => Math.abs(t - r) <= 2));
      if (off.length > radii.length / 2) {
        push('radii.scale', 'fail',
          `radii off the declared scale: ${off.slice(0, 5).join(', ')}px`,
          { offScale: off.slice(0, 8), declared: tokens.radii });
      } else {
        push('radii.scale', 'pass', 'corner radii follow the declared scale');
      }
    }
  }

  const evaluated = checks.filter((c) => c.status !== 'skip');
  const maxScore = evaluated.reduce((s, c) => s + c.weight, 0);
  const got = evaluated.filter((c) => c.status === 'pass').reduce((s, c) => s + c.weight, 0);
  const ratio = maxScore ? got / maxScore : 1;

  return {
    axis: 'system',
    declared: true,
    name: parsed.name,
    score: Math.round(ratio * 100),       // 0–100, higher is better
    maxScore: 100,
    tier: maxScore ? tierForRatio(ratio) : 'No data',
    checksEvaluated: evaluated.length,
    checksSkipped: checks.length - evaluated.length,
    checks,
    drift
  };
}
