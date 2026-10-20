// The deterministic AI-design-slop patterns (v0.9.0 - v0.11.0, DEFINITIONS_VERSION 2026.11).
//
// Active scored rules + K-04 weight-0 review rules. Every pattern carries K-03
// lifecycle metadata (status, evidenceGrade, era, modelFamilies, lastValidatedIn,
// likelihoodRatio, fpRate, fpRatePre2022).
//
// Each pattern's extract(ctx) function is stringified and executed inside the
// browser via buildPageScript(), so it must be 100% self-contained.

export const PATTERNS = [
  // ── 1. SLOP FONTS (D-08 + FIX-20) ─────────────────────────────────────────
  {
    id: 'slop_fonts',
    label: 'AI-default font stack (Inter / Geist / Space Grotesk / Syne / Fraunces)',
    short: 'Slop fonts',
    category: 'fonts',
    weight: 8,
    status: 'decaying',
    evidenceGrade: 'practitioner',
    era: '2024-gpt4',
    modelFamilies: ['v0', 'cursor', 'lovable', 'bolt'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible, isSlopFont, isAccentSerif, resolveRenderedFont, h1 } = ctx;
      const primaryPrefixes = [
        'inter',
        'geist',
        'space grotesk',
        'space-grotesk',
        'plus jakarta sans',
        'plus-jakarta',
        'plus jakarta',
        'dm sans',
        'dm-sans',
        'outfit',
        'sora',
        'syne',
        'fraunces',
        'general sans',
        'general-sans',
        'satoshi',
        'cal sans',
        'cal-sans',
        'switzer',
        'clash display',
        'clash-display',
      ];
      const secondaryPrefixes = [
        'manrope',
        'playfair display',
        'playfair',
        'lora',
        'dm serif',
        'dm-serif',
        'instrument serif',
        'instrument-serif',
        'jetbrains mono',
        'jetbrains-mono',
        'fira code',
        'fira-code',
      ];
      const resolveFam = (fam) => {
        if (typeof resolveRenderedFont === 'function') return resolveRenderedFont(fam);
        if (!fam) return '';
        return String(fam).toLowerCase().replace(/['"]/g, '').split(',')[0].trim();
      };
      const isPrimary = (fam) => {
        const r = resolveFam(fam);
        return Boolean(r && primaryPrefixes.some((p) => r.startsWith(p)));
      };
      const isSecondary = (fam) => {
        const r = resolveFam(fam);
        return Boolean(r && secondaryPrefixes.some((p) => r.startsWith(p)));
      };
      let slopCount = 0,
        primaryCount = 0,
        secondaryCount = 0,
        interOrGeistCount = 0,
        total = 0,
        accentSerifWords = 0;
      const seen = new Set();
      for (const el of visible) {
        if (!el.textContent || !el.textContent.trim()) continue;
        const cs = getComputedStyle(el);
        const fam = cs.fontFamily;
        if (!fam || seen.has(el)) continue;
        seen.add(el);
        total++;
        const resolved = resolveFam(fam);
        const slop =
          typeof resolveRenderedFont === 'function' ? isSlopFont(resolved) : isSlopFont(fam);
        if (slop) {
          slopCount++;
          if (isPrimary(fam)) primaryCount++;
          else if (isSecondary(fam)) secondaryCount++;
          if (resolved.startsWith('inter') || resolved.startsWith('geist')) {
            interOrGeistCount++;
          }
        }
        if (isAccentSerif(fam) && /italic|oblique/.test(cs.fontStyle)) {
          accentSerifWords++;
        }
      }
      const heroRawFam = h1 ? getComputedStyle(h1).fontFamily : '';
      const heroFam = resolveFam(heroRawFam) || heroRawFam;
      const heroIsSlop =
        typeof resolveRenderedFont === 'function' ? isSlopFont(heroFam) : isSlopFont(heroRawFam);
      const heroIsPrimary = isPrimary(heroRawFam);
      const ratio = total ? slopCount / total : 0;
      const secondaryOnly = slopCount > 0 && primaryCount === 0 && !heroIsPrimary;
      const interOrGeistOnly =
        slopCount > 0 &&
        interOrGeistCount === slopCount &&
        (!heroIsSlop || heroFam.startsWith('inter') || heroFam.startsWith('geist'));
      // FIX-20: accentSerifWords > 0 removed from triggered; kept as evidence only.
      return {
        slopCount,
        primaryCount,
        secondaryCount,
        total,
        ratio: +ratio.toFixed(3),
        heroIsSlop,
        heroFam: heroRawFam || heroFam,
        resolvedHeroFam: heroFam,
        secondaryOnly,
        interOrGeistOnly,
        accentSerifItalicCount: accentSerifWords,
        triggered: heroIsSlop || ratio >= 0.45,
      };
    },
  },

  // ── 2. VIBECODE PURPLE (FIX-06: OKLCH window, weight 4, decaying) ─────────
  {
    id: 'purple_accent',
    label: 'VibeCode Purple — filled indigo/violet CTAs',
    short: 'Vibe purple',
    category: 'colors',
    weight: 4,
    status: 'decaying',
    evidenceGrade: 'practitioner',
    era: '2024-gpt4',
    modelFamilies: ['v0', 'cursor', 'bolt', 'lovable'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible, parseColor, isPurple, extractColorStrings } = ctx;
      let purpleEls = 0,
        filledCtas = 0;
      const samples = [];
      for (const el of visible) {
        const cs = getComputedStyle(el);
        const bg = parseColor(cs.backgroundColor);
        const bgImg = cs.backgroundImage || '';
        const border = parseColor(cs.borderColor);
        let purp = false,
          gradPurp = false;
        if (isPurple(bg)) purp = true;
        if (isPurple(border) && parseFloat(cs.borderWidth) > 0) purp = true;
        if (bgImg.includes('gradient')) {
          const tokens =
            typeof extractColorStrings === 'function'
              ? extractColorStrings(bgImg)
              : bgImg.match(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/gi) || [];
          for (const c of tokens) {
            if (isPurple(parseColor(c))) {
              gradPurp = true;
              break;
            }
          }
          if (gradPurp) purp = true;
        }
        if (!purp) continue;
        purpleEls++;
        const cls = (el.className || '') + '';
        const isCta = /^(A|BUTTON)$/.test(el.tagName) || /btn|button|cta/i.test(cls);
        if (!isCta) continue;
        if (/outline|ghost/i.test(cls)) continue;
        const filled = (bg && bg.a >= 0.5 && isPurple(bg)) || (gradPurp && (!bg || bg.a < 0.1));
        if (filled) {
          filledCtas++;
          if (samples.length < 2) samples.push({ tag: el.tagName, bg: cs.backgroundColor });
        }
      }
      return { purpleEls, filledCtas, samples, triggered: filledCtas >= 1 };
    },
  },

  // ── 3. GRADIENT TEXT ──────────────────────────────────────────────────────
  {
    id: 'gradient_text',
    label: 'Hero gradient text (background-clip:text)',
    short: 'Gradient text',
    category: 'colors',
    weight: 6,
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2024-gpt4',
    modelFamilies: ['v0', 'cursor', 'bolt', 'lovable'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible, h1 } = ctx;
      let count = 0;
      let heroHasGradient = false;
      for (const el of visible) {
        const cs = getComputedStyle(el);
        const clip = (cs as any).webkitBackgroundClip || cs.backgroundClip;
        if (clip === 'text' && /gradient\(/.test(cs.backgroundImage || '')) {
          count++;
          if (el === h1) heroHasGradient = true;
        }
      }
      if (h1 && !heroHasGradient) {
        const cs = getComputedStyle(h1);
        const clip = (cs as any).webkitBackgroundClip || cs.backgroundClip;
        if (clip === 'text' && /gradient\(/.test(cs.backgroundImage || '')) {
          heroHasGradient = true;
        }
      }
      return { count, heroHasGradient, triggered: count > 0 || heroHasGradient };
    },
  },

  // ── 4. GRADIENT-HEAVY BACKGROUNDS (FIX-10: area ratio >= 0.15 + >= 2 sections)
  {
    id: 'gradient_backgrounds',
    label: 'Gradient-heavy backgrounds (≥15% viewport across ≥2 sections)',
    short: 'Gradient bgs',
    category: 'colors',
    weight: 4,
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2024-gpt4',
    modelFamilies: ['v0', 'bolt', 'lovable'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible, extractGradientStops } = ctx;
      let n = 0,
        conic = 0,
        totalArea = 0;
      const sectionSet = new Set();
      const samples = [];
      const vw = Math.max(1, window.innerWidth || 1280);
      const vh = Math.max(1, window.innerHeight || 800);
      const vpArea = vw * vh;

      for (const el of visible) {
        const cs = getComputedStyle(el);
        const bgImg = cs.backgroundImage || '';
        if (!/gradient\(/i.test(bgImg)) continue;

        let hasOpaqueStop = false;
        if (typeof extractGradientStops === 'function') {
          const stops = extractGradientStops(bgImg);
          hasOpaqueStop = stops.some((st) => !st.unknown && st.color && st.color.a > 0.05);
        } else {
          const rgba = bgImg.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*([\d.]+))?\s*\)/g);
          hasOpaqueStop = !rgba;
          if (rgba) {
            for (const r of rgba) {
              const a = r.match(/,\s*([\d.]+)\s*\)/);
              if (!a || parseFloat(a[1]) > 0.05) {
                hasOpaqueStop = true;
                break;
              }
            }
          }
        }
        if (!hasOpaqueStop) continue;

        n++;
        if (/conic-gradient/i.test(bgImg)) conic++;
        const r =
          typeof el.getBoundingClientRect === 'function'
            ? el.getBoundingClientRect()
            : { width: 400, height: 200 };
        const area = Math.max(0, Math.min(vw, r.width || 0)) * Math.max(0, Math.min(vh, r.height || 0));
        totalArea += area;
        const sec =
          (typeof el.closest === 'function' &&
            el.closest('section, header, footer, article, main > div, body > div')) ||
          el.parentElement ||
          el;
        sectionSet.add(sec);
        if (samples.length < 3) {
          samples.push({ tag: el.tagName, areaRatio: +(area / vpArea).toFixed(3) });
        }
      }

      const gradientAreaRatio = Math.min(1, +(totalArea / vpArea).toFixed(3));
      const sections = sectionSet.size;
      const triggered = gradientAreaRatio >= 0.15 && sections >= 2;
      return {
        gradientAreaRatio,
        sections,
        elements: n,
        bgElements: n,
        conic,
        samples,
        triggered,
      };
    },
  },

  // ── 5. ACCENT STRIPE (D-07: >= 2px, top/left/bottom, distinct color, callout exclusion)
  {
    id: 'accent_stripe',
    label: 'Colored top/left/bottom card borders (the AI em-dash)',
    short: 'Accent stripe',
    category: 'layout',
    weight: 6,
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2025-v0',
    modelFamilies: ['claude', 'v0', 'cursor'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible, parseColor, deltaEOklab } = ctx;
      let stripeCards = 0;
      const sides: string[] = [];
      for (const el of visible) {
        const role =
          typeof el.getAttribute === 'function'
            ? (el.getAttribute('role') || '').toLowerCase()
            : '';
        if (role === 'alert' || role === 'note' || role === 'status') continue;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (r.width < 100 || r.height < 60) continue;
        const widths = {
          top: parseFloat(cs.borderTopWidth) || 0,
          left: parseFloat(cs.borderLeftWidth) || 0,
          right: parseFloat(cs.borderRightWidth) || 0,
          bottom: parseFloat(cs.borderBottomWidth) || 0,
        };
        const colors = {
          top: parseColor(cs.borderTopColor),
          left: parseColor(cs.borderLeftColor),
          right: parseColor(cs.borderRightColor),
          bottom: parseColor(cs.borderBottomColor),
        };
        const radius = parseFloat(cs.borderRadius) || 0;
        const colorDiffers = (sideCol: any, otherSideKeys: Array<'top' | 'left' | 'right' | 'bottom'>) => {
          if (!sideCol || sideCol.a <= 0.3) return false;
          for (const k of otherSideKeys) {
            if (widths[k] > 0 && colors[k] && colors[k].a > 0.1) {
              if (typeof deltaEOklab === 'function') {
                if (deltaEOklab(sideCol, colors[k]) <= 0.02) return false;
              } else if (
                Math.abs(sideCol.r - colors[k].r) <= 5 &&
                Math.abs(sideCol.g - colors[k].g) <= 5 &&
                Math.abs(sideCol.b - colors[k].b) <= 5
              ) {
                return false;
              }
            }
          }
          return true;
        };

        const topStripe =
          widths.top >= 2 &&
          Math.max(widths.left, widths.right, widths.bottom) < widths.top - 1 &&
          radius > 0 &&
          colorDiffers(colors.top, ['left', 'right', 'bottom']);
        const leftStripe =
          widths.left >= 2 &&
          Math.max(widths.top, widths.right, widths.bottom) < widths.left - 1 &&
          colorDiffers(colors.left, ['top', 'right', 'bottom']);
        const bottomStripe =
          widths.bottom >= 2 &&
          Math.max(widths.top, widths.left, widths.right) < widths.bottom - 1 &&
          radius > 0 &&
          colorDiffers(colors.bottom, ['top', 'left', 'right']);

        if (topStripe || leftStripe || bottomStripe) {
          stripeCards++;
          if (sides.length < 5) {
            sides.push(topStripe ? 'top' : leftStripe ? 'left' : 'bottom');
          }
        }
      }
      return { stripeCards, sides, triggered: stripeCards >= 2 };
    },
  },

  // ── 6. GLASSMORPHISM ──────────────────────────────────────────────────────
  {
    id: 'glassmorphism',
    label: 'Glassmorphism (backdrop-filter blur on translucent layers)',
    short: 'Glass',
    category: 'css',
    weight: 4,
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2024-gpt4',
    modelFamilies: ['bolt', 'v0', 'lovable'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible, parseColor } = ctx;
      let glassCount = 0;
      for (const el of visible) {
        const cs = getComputedStyle(el);
        const filter = cs.backdropFilter || (cs as any).webkitBackdropFilter || '';
        if (!/blur\(/.test(filter)) continue;
        const bg = parseColor(cs.backgroundColor);
        if (bg && bg.a > 0 && bg.a < 0.8) {
          glassCount++;
        }
      }
      return { glassCount, triggered: glassCount >= 2 };
    },
  },

  // ── 7. COLORED GLOWS (FIX-05 colour tokens) ───────────────────────────────
  {
    id: 'colored_glows',
    label: 'Big colored box-shadow glows (purple/blue/pink)',
    short: 'Colored glows',
    category: 'css',
    weight: 4,
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2024-gpt4',
    modelFamilies: ['v0', 'bolt', 'lovable'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible, parseColor, isPurple, extractColorStrings } = ctx;
      let glowCount = 0;
      for (const el of visible) {
        const cs = getComputedStyle(el);
        const shadow = cs.boxShadow || '';
        if (!shadow || shadow === 'none') continue;
        const blurMatch = shadow.match(/\s(\d+(?:\.\d+)?)px\s/g) || [];
        const maxBlur = Math.max(0, ...blurMatch.map((b) => parseFloat(b)));
        if (maxBlur < 24) continue;
        const colors =
          typeof extractColorStrings === 'function'
            ? extractColorStrings(shadow)
            : shadow.match(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/gi) || [];
        for (const c of colors) {
          const col = parseColor(c);
          if (!col || col.a < 0.1) continue;
          if (isPurple(col)) {
            glowCount++;
            break;
          }
          const max = Math.max(col.r, col.g, col.b),
            min = Math.min(col.r, col.g, col.b);
          if ((max - min > 60 || (col.oklch && col.oklch.C >= 0.1)) && col.a > 0.2) {
            glowCount++;
            break;
          }
        }
      }
      return { glowCount, triggered: glowCount >= 1 };
    },
  },

  // ── 8. CENTERED HERO ──────────────────────────────────────────────────────
  {
    id: 'centered_hero',
    label: 'Centered hero in generic sans (Inter-style)',
    short: 'Centered hero',
    category: 'layout',
    weight: 4,
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2024-gpt4',
    modelFamilies: ['v0', 'cursor', 'lovable', 'bolt'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { h1, isSlopFont } = ctx;
      if (!h1) return { triggered: false, h1Found: false };
      const cs = getComputedStyle(h1);
      const fontSize = parseFloat(cs.fontSize);
      let centered = cs.textAlign === 'center';
      if (!centered && h1.parentElement) {
        const pcs = getComputedStyle(h1.parentElement);
        if (pcs.textAlign === 'center') centered = true;
      }
      if (!centered) {
        try {
          const parent = h1.parentElement || document.body;
          let scaled = false;
          for (let el = h1, d = 0; el && d < 25; el = el.parentElement, d++) {
            const acs = getComputedStyle(el);
            if (acs.transform && acs.transform !== 'none') scaled = true;
            if ((acs as any).zoom !== undefined && (acs as any).zoom !== '' && String((acs as any).zoom) !== '1')
              scaled = true;
            if (scaled) break;
          }
          if (scaled)
            return {
              triggered: false,
              fontSize,
              centered,
              slopFont: isSlopFont(cs.fontFamily),
              family: cs.fontFamily,
            };
          const r = h1.getBoundingClientRect();
          const pr = parent.getBoundingClientRect();
          const pbox = getComputedStyle(parent);
          const num = (v: any) => parseFloat(v) || 0;
          const cL = pr.left + num(pbox.paddingLeft) + num(pbox.borderLeftWidth);
          const cR = pr.right - num(pbox.paddingRight) - num(pbox.borderRightWidth);
          const contentW = cR - cL;
          const gapL = r.left - cL;
          const gapR = cR - r.right;
          const elCx = r.left + r.width / 2;
          const cCx = (cL + cR) / 2;
          if (contentW > 0 && gapL > 2 && gapR > 2 && Math.abs(elCx - cCx) / contentW < 0.12)
            centered = true;
        } catch {}
      }
      const big = fontSize >= 28;
      const slopFont = isSlopFont(cs.fontFamily);
      const triggered = centered && big && slopFont;
      return { triggered, fontSize, centered, slopFont, family: cs.fontFamily };
    },
  },

  // ── 9. HERO EYEBROW PILL ──────────────────────────────────────────────────
  {
    id: 'hero_eyebrow_pill',
    label: 'Eyebrow pill above hero ("Now in beta" / "New")',
    short: 'Eyebrow pill',
    category: 'layout',
    weight: 5,
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2024-gpt4',
    modelFamilies: ['v0', 'lovable', 'bolt'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { h1 } = ctx;
      if (!h1) return { triggered: false };
      const h1Rect = h1.getBoundingClientRect();
      const candidates = Array.from(document.querySelectorAll('a, div, span, button'));
      const pillKeywords =
        /\b(new|beta|now in|introducing|announcing|just shipped|v\d+|launching|coming soon|early access|whats new|just landed|just dropped)\b/i;
      for (const el of candidates) {
        const r = el.getBoundingClientRect();
        if (r.bottom > h1Rect.top || r.bottom < h1Rect.top - 250) continue;
        if (r.width < 40 || r.width > 500 || r.height > 80) continue;
        const cs = getComputedStyle(el);
        const radius = parseFloat(cs.borderRadius);
        if (!radius || radius < r.height / 3) continue;
        const txt = (el.textContent || '').trim();
        if (txt.length < 2 || txt.length > 80) continue;
        const elCenter = r.left + r.width / 2;
        const h1Center = h1Rect.left + h1Rect.width / 2;
        if (Math.abs(elCenter - h1Center) > h1Rect.width / 2) continue;
        if (pillKeywords.test(txt) || /✨|🚀|⚡/.test(txt)) {
          return { triggered: true, text: txt.slice(0, 60), radius };
        }
      }
      return { triggered: false };
    },
  },

  // ── 10a. ALL-CAPS LABELS (FIX-09: retired in favour of eyebrow_label) ─────
  {
    id: 'all_caps_labels',
    label: 'All-caps section labels (retired — replaced by eyebrow_label)',
    short: 'All-caps (retired)',
    category: 'fonts',
    weight: 0,
    status: 'retired',
    evidenceGrade: 'practitioner',
    era: '2024-gpt4',
    modelFamilies: ['v0', 'cursor'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: () => {
      return { count: 0, samples: [], retired: true, replacedBy: 'eyebrow_label', triggered: false };
    },
  },

  // ── 10b. EYEBROW LABEL (FIX-09: replaces all_caps_labels, weight 3) ───────
  {
    id: 'eyebrow_label',
    label: 'Tracked or uppercase eyebrow labels above ≥60% of section headings',
    short: 'Eyebrow labels',
    category: 'fonts',
    weight: 3,
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2025-v0',
    modelFamilies: ['v0', 'cursor', 'claude', 'lovable'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible } = ctx;
      const headings = visible.filter((el: any) => /^(H2|H3)$/.test(el.tagName));
      const targetHeadings =
        headings.length > 0 ? headings : visible.filter((el: any) => el.tagName === 'H1');
      if (targetHeadings.length === 0) {
        return {
          eyebrowCount: 0,
          headingCount: 0,
          ratio: 0,
          samples: [],
          nodeIds: [],
          triggered: false,
        };
      }

      const samples: Array<{ text: string; mode: string }> = [];
      const nodeIds: string[] = [];
      let matchedHeadings = 0;

      for (const h of targetHeadings) {
        const hr = h.getBoundingClientRect();
        let foundForHeading = false;
        for (const el of visible) {
          if (el === h || /^(H[1-6]|BUTTON|NAV|FOOTER|TABLE|TR|TD|TH)$/.test(el.tagName)) continue;
          if (typeof el.closest === 'function' && el.closest('nav, footer, button, table')) continue;
          const r = el.getBoundingClientRect();
          // Must sit within 48px above the heading
          if (r.bottom > hr.top + 8 || r.bottom < hr.top - 48) continue;
          if (Math.abs(r.left - hr.left) > 300 && Math.abs(r.left + r.width / 2 - (hr.left + hr.width / 2)) > 200) {
            continue;
          }
          const txt = (el.textContent || '').trim();
          if (!txt || txt.length < 2 || txt.length > 50) continue;
          const words = txt.split(/\s+/).filter(Boolean);
          if (words.length === 0 || words.length > 6) continue;
          const cs = getComputedStyle(el);
          const fs = parseFloat(cs.fontSize) || 16;
          if (fs > 14) continue;
          const ls = parseFloat(cs.letterSpacing) || 0;
          const tracked = fs > 0 && ls / fs >= 0.06;
          const transformCaps = cs.textTransform === 'uppercase';
          const sourceCaps = txt === txt.toUpperCase() && /[A-Z]{2,}/.test(txt);
          if (!tracked && !transformCaps && !sourceCaps) continue;

          foundForHeading = true;
          const mode = transformCaps ? 'transform' : sourceCaps ? 'source' : 'tracked';
          if (samples.length < 5) samples.push({ text: txt.slice(0, 35), mode });
          const nid = `${el.tagName.toLowerCase()}:${Math.round(r.top)}:${txt.slice(0, 20)}`;
          if (!nodeIds.includes(nid)) nodeIds.push(nid);
          break;
        }
        if (foundForHeading) matchedHeadings++;
      }

      const ratio = +(matchedHeadings / targetHeadings.length).toFixed(3);
      return {
        eyebrowCount: matchedHeadings,
        headingCount: targetHeadings.length,
        ratio,
        samples,
        nodeIds,
        triggered: targetHeadings.length >= 1 && ratio >= 0.6,
      };
    },
  },

  // ── 11. PERMA DARK MODE ───────────────────────────────────────────────────
  {
    id: 'perma_dark_mode',
    label: 'Perma dark mode + medium-grey body text',
    short: 'Perma dark',
    category: 'colors',
    weight: 4,
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2024-gpt4',
    modelFamilies: ['v0', 'bolt', 'cursor'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { parseColor, isDark, isMidGrey } = ctx;
      const cand = [];
      cand.push(parseColor(getComputedStyle(document.documentElement).backgroundColor));
      cand.push(parseColor(getComputedStyle(document.body).backgroundColor));
      const topWrappers = Array.from(document.body.children).slice(0, 8);
      for (const w of topWrappers) {
        try {
          const r = w.getBoundingClientRect();
          if (r.width >= window.innerWidth * 0.8 && r.height >= window.innerHeight * 0.5) {
            cand.push(parseColor(getComputedStyle(w).backgroundColor));
          }
        } catch {}
      }
      try {
        const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
        if (el) cand.push(parseColor(getComputedStyle(el).backgroundColor));
      } catch {}

      let bodyBg = null;
      for (const c of cand) {
        if (c && c.a >= 0.5) {
          bodyBg = c;
          break;
        }
      }
      const dark = isDark(bodyBg);
      if (!dark) return { triggered: false, bodyDark: false };
      const ps = document.querySelectorAll('p, li, span');
      let greys = 0,
        total = 0;
      for (const p of ps) {
        const cs = getComputedStyle(p);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const txt = (p.textContent || '').trim();
        if (txt.length < 6) continue;
        total++;
        if (isMidGrey(parseColor(cs.color))) greys++;
        if (total >= 200) break;
      }
      const ratio = total ? greys / total : 0;
      const triggered = dark && (ratio >= 0.3 || total >= 5);
      return {
        bodyDark: true,
        greyParas: greys,
        totalParas: total,
        ratio: +ratio.toFixed(2),
        triggered,
      };
    },
  },

  // ── 12. ICON-CARD GRID (#196 boxedTiles evidence) ─────────────────────────
  {
    id: 'icon_card_grid',
    label: 'Identical feature cards with icon on top',
    short: 'Icon cards',
    category: 'layout',
    weight: 4,
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2024-gpt4',
    modelFamilies: ['v0', 'lovable', 'bolt', 'cursor'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible, parseColor } = ctx;
      const byParent = new Map();
      let boxedTiles = 0;
      for (const el of visible) {
        const parent = el.parentElement;
        if (!parent) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 150 || r.width > 600 || r.height < 100 || r.height > 600) continue;
        const icon = el.querySelector(
          ':scope > svg, :scope > img, :scope > div > svg, :scope > div > img',
        );
        if (!icon) continue;
        const ir = icon.getBoundingClientRect();
        if (ir.width > 80 || ir.height > 80) continue;
        if (ir.top > r.top + r.height * 0.4) continue;
        if (icon.parentElement && icon.parentElement !== el && typeof getComputedStyle === 'function') {
          try {
            const wEl = icon.parentElement;
            const wr = wEl.getBoundingClientRect();
            const wcs = getComputedStyle(wEl);
            const wBg = typeof parseColor === 'function' ? parseColor(wcs.backgroundColor) : null;
            if (
              wr.width >= 32 &&
              wr.width <= 56 &&
              parseFloat(wcs.borderRadius) >= 6 &&
              wBg &&
              wBg.a > 0.05
            ) {
              boxedTiles++;
            }
          } catch {}
        }
        if (!byParent.has(parent)) byParent.set(parent, []);
        byParent.get(parent).push({ el, width: r.width });
      }
      let maxGroup = 0;
      for (const siblings of byParent.values()) {
        const byWidth = new Map();
        for (const s of siblings) {
          const key = Math.round(s.width / 20);
          if (!byWidth.has(key)) byWidth.set(key, []);
          byWidth.get(key).push(s.el);
        }
        for (const arr of byWidth.values()) if (arr.length > maxGroup) maxGroup = arr.length;
      }
      return { maxGroupSize: maxGroup, boxedTiles, triggered: maxGroup >= 3 };
    },
  },

  // ── 13. NUMBERED STEPS (FIX-19 nodeIds) ───────────────────────────────────
  {
    id: 'numbered_steps',
    label: 'Numbered "1 · 2 · 3" step sequences',
    short: 'Numbered steps',
    category: 'layout',
    weight: 3,
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2024-gpt4',
    modelFamilies: ['v0', 'claude', 'lovable'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible } = ctx;
      const numberPat = /^(?:step\s*)?(\d{1,2})(?:[.):]|\s*[—-])?\s*/i;
      const parents = new Map();
      for (const el of visible) {
        if (typeof el.closest === 'function' && el.closest('table, nav')) continue;
        const txt = (el.textContent || '').trim();
        const m = txt.match(numberPat);
        if (!m) continue;
        const n = parseInt(m[1], 10);
        if (n < 1 || n > 9) continue;
        if (!el.parentElement) continue;
        const key = el.parentElement;
        if (!parents.has(key)) parents.set(key, { numbers: new Set(), count: 0, nodeIds: [] });
        const group = parents.get(key);
        group.numbers.add(n);
        group.count += 1;
        const r =
          typeof el.getBoundingClientRect === 'function'
            ? el.getBoundingClientRect()
            : { top: 0 };
        const tag = el.tagName ? el.tagName.toLowerCase() : 'div';
        group.nodeIds.push(`${tag}:${Math.round(r.top || 0)}:${txt.slice(0, 20)}`);
      }
      let bestRun = 0;
      let bestNodeIds: string[] = [];
      for (const { numbers: set, count, nodeIds } of parents.values()) {
        if (count > 6) continue;
        if (set.has(1) && set.has(2) && set.has(3)) {
          const run = 3 + (set.has(4) ? 1 : 0) + (set.has(5) ? 1 : 0);
          if (run > bestRun) {
            bestRun = run;
            bestNodeIds = nodeIds;
          }
        }
      }
      return { bestRun, nodeIds: bestNodeIds, triggered: bestRun >= 3 };
    },
  },

  // ── 14. STAT BANNER ───────────────────────────────────────────────────────
  {
    id: 'stat_banner',
    label: 'Big-number stat banner ("10k+", "99.9%", "$2M+")',
    short: 'Stat banner',
    category: 'layout',
    weight: 3,
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2024-gpt4',
    modelFamilies: ['v0', 'lovable', 'bolt'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible } = ctx;
      const statPat = /^\$?\d+[.,]?\d*\s*[KMB%+]?\+?$/i;
      const candidates = [];
      for (const el of visible) {
        const cs = getComputedStyle(el);
        const fs = parseFloat(cs.fontSize);
        if (fs < 28) continue;
        const txt = (el.textContent || '').trim();
        if (txt.length > 12 || !statPat.test(txt)) continue;
        candidates.push({ el, top: el.getBoundingClientRect().top, txt });
      }
      candidates.sort((a, b) => a.top - b.top);
      let bestCluster = 0;
      for (let i = 0; i < candidates.length; i++) {
        let n = 1;
        for (let j = i + 1; j < candidates.length; j++) {
          if (Math.abs(candidates[j].top - candidates[i].top) < 80) n++;
        }
        if (n > bestCluster) bestCluster = n;
      }
      return { clusterSize: bestCluster, triggered: bestCluster >= 3 };
    },
  },

  // ── 15. FAQ ACCORDION ─────────────────────────────────────────────────────
  {
    id: 'faq_accordion',
    label: 'FAQ accordion in the lower half',
    short: 'FAQ',
    category: 'layout',
    weight: 2,
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2024-gpt4',
    modelFamilies: ['v0', 'lovable', 'bolt'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: () => {
      const details = document.querySelectorAll('details');
      let count = 0;
      const pageHeight = document.documentElement.scrollHeight;
      for (const d of details) {
        const r = d.getBoundingClientRect();
        const absTop = r.top + window.scrollY;
        if (absTop < pageHeight * 0.4) continue;
        count++;
      }
      let textFaq = false;
      const h = document.querySelectorAll('h1,h2,h3');
      for (const el of h) {
        const t = (el.textContent || '').trim().toLowerCase();
        if (t === 'faq' || t === 'frequently asked questions' || t.startsWith('faq')) {
          textFaq = true;
          break;
        }
      }
      return {
        detailsCount: count,
        hasFaqHeading: textFaq,
        triggered: count >= 3 || (textFaq && count >= 1),
      };
    },
  },

  // ── 16. GRADIENT-LETTER AVATARS ───────────────────────────────────────────
  {
    id: 'gradient_letter_avatars',
    label: 'Gradient-letter avatars (testimonial slop)',
    short: 'Letter avatars',
    category: 'images',
    weight: 5,
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2024-gpt4',
    modelFamilies: ['v0', 'lovable', 'bolt'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible } = ctx;
      let count = 0;
      const samples = [];
      for (const el of visible) {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (r.width < 28 || r.width > 96) continue;
        if (Math.abs(r.width - r.height) > 8) continue;
        const radius = parseFloat(cs.borderRadius);
        if (radius < r.width / 3) continue;
        const bg = cs.backgroundImage || '';
        const bgColor = cs.backgroundColor;
        const hasGradient = /gradient\(/.test(bg);
        const hasSolidColor =
          bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent';
        if (!hasGradient && !hasSolidColor) continue;
        const txt = (el.textContent || '').trim();
        if (txt.length < 1 || txt.length > 3) continue;
        if (!/^[A-Za-z]{1,3}$/.test(txt)) continue;
        if (el.querySelector('img, svg[data-photo]')) continue;
        count++;
        if (samples.length < 3) samples.push({ initials: txt, size: Math.round(r.width) });
      }
      return { count, samples, triggered: count >= 2 };
    },
  },

  // ── 17. BENTO-GRID WALL (2026.07) ─────────────────────────────────────────
  {
    id: 'bento_grid',
    label: 'Bento-grid wall — mixed-span rounded card grid',
    short: 'Bento grid',
    category: 'layout',
    weight: 4,
    author: 'slop-detect',
    since: '2026.07',
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2025-v0',
    modelFamilies: ['v0', 'lovable', 'bolt', 'cursor'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible } = ctx;
      let best = { children: 0, spanVariety: 0, rounded: 0 };
      for (const el of visible) {
        const cs = getComputedStyle(el);
        if (cs.display !== 'grid') continue;
        const cols = (cs.gridTemplateColumns || '').split(' ').filter(Boolean).length;
        if (cols < 2) continue;
        const kids = Array.from(el.children) as Element[];
        if (kids.length < 4) continue;
        const spans = new Set();
        let rounded = 0,
          sized = 0;
        for (const k of kids) {
          const kr = k.getBoundingClientRect();
          if (kr.width < 80 || kr.height < 60) continue;
          sized++;
          const kcs = getComputedStyle(k);
          const gc = (kcs.gridColumn || '').toString();
          const m = gc.match(/span\s+(\d+)/i);
          spans.add(m ? parseInt(m[1], 10) : 1);
          if (parseFloat(kcs.borderRadius) >= 12) rounded++;
        }
        if (sized < 4) continue;
        const score = { children: sized, spanVariety: spans.size, rounded };
        if (rounded >= 4 && spans.size >= 2 && sized > best.children) best = score;
      }
      return {
        ...best,
        triggered: best.rounded >= 4 && best.spanVariety >= 2 && best.children >= 5,
      };
    },
  },

  // ── 18. AURORA / MESH GRADIENT BLOBS (2026.07) ────────────────────────────
  {
    id: 'aurora_mesh_gradient',
    label: 'Aurora / mesh gradient blobs (blurred glowing backdrop)',
    short: 'Aurora blobs',
    category: 'css',
    weight: 5,
    author: 'slop-detect',
    since: '2026.07',
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2025-v0',
    modelFamilies: ['v0', 'lovable', 'bolt'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible } = ctx;
      let blobs = 0;
      const samples = [];
      const vw = window.innerWidth,
        vh = window.innerHeight;
      for (const el of visible) {
        const cs = getComputedStyle(el);
        const bgImg = cs.backgroundImage || '';
        const isGrad =
          /(radial|conic)-gradient\(/.test(bgImg) ||
          (/linear-gradient\(/.test(bgImg) &&
            parseFloat(
              ((cs.filter && cs.filter.match(/blur\(([\d.]+)px\)/)?.[1]) || 0) as unknown as string,
            ) > 0);
        if (!isGrad) continue;
        const blurM = (cs.filter || '').match(/blur\(([\d.]+)px\)/);
        const blur = blurM ? parseFloat(blurM[1]) : 0;
        const radius = parseFloat(cs.borderRadius) || 0;
        const r = el.getBoundingClientRect();
        const big = r.width >= vw * 0.25 && r.height >= vh * 0.2;
        const orby =
          radius >= Math.min(r.width, r.height) * 0.4 ||
          cs.borderRadius === '50%' ||
          /9999px/.test(cs.borderRadius);
        const positioned = cs.position === 'absolute' || cs.position === 'fixed';
        if (blur >= 24 && big) {
          blobs++;
        } else if (positioned && orby && big && /(radial|conic)-gradient/.test(bgImg)) {
          blobs++;
        } else continue;
        if (samples.length < 3) samples.push({ blur: Math.round(blur), radius: cs.borderRadius });
      }
      return { blobs, samples, triggered: blobs >= 2 };
    },
  },

  // ── 19. AI-SPARKLE BADGES (2026.07) ───────────────────────────────────────
  {
    id: 'ai_sparkle_badges',
    label: 'AI-sparkle badges (✨ / Sparkles "magic" tells)',
    short: 'AI sparkles',
    category: 'images',
    weight: 3,
    author: 'slop-detect',
    since: '2026.07',
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2025-v0',
    modelFamilies: ['v0', 'lovable', 'bolt', 'cursor'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible } = ctx;
      const sparkleEmoji = /[\u2728\u2729\u2734\u2735]|\uD83C\uDF1F|\uD83E\uDE84/;
      const magicWord = /\b(ai|magic|generate|powered by ai|with ai|smart)\b/i;
      let emojiHits = 0,
        svgHits = 0;
      const samples = [];
      for (const el of visible) {
        const txt = (el.textContent || '').trim();
        if (txt && txt.length <= 40 && sparkleEmoji.test(txt) && el.children.length <= 1) {
          emojiHits++;
          if (samples.length < 3) samples.push(txt.slice(0, 30));
          continue;
        }
        const attrs = (
          (el.getAttribute &&
            (el.getAttribute('class') || '') +
              ' ' +
              (el.getAttribute('aria-label') || '') +
              ' ' +
              (el.getAttribute('data-icon') || '')) ||
          ''
        ).toLowerCase();
        if (/sparkle|sparkles|magic-wand|wand-sparkles/.test(attrs)) {
          const near = (el.closest('button, a, label, [role="button"]') || el).textContent || '';
          svgHits += magicWord.test(near) ? 1 : 0.5;
        }
      }
      const total = emojiHits + svgHits;
      return {
        emojiHits,
        svgHits,
        samples,
        triggered: total >= 1 && (emojiHits >= 1 || svgHits >= 1),
      };
    },
  },

  // ── 20. CREAM DEFAULT BACKGROUND (2026.08) ────────────────────────────────
  {
    id: 'cream_default_bg',
    label: 'Cream / beige default page background',
    short: 'Cream bg',
    category: 'colors',
    weight: 7,
    author: 'impeccable',
    since: '2026.08',
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2026-opus4.6',
    modelFamilies: ['claude', 'v0', 'cursor'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { parseColor } = ctx;
      function isCream(c: any) {
        if (!c || c.a < 0.5) return false;
        if (Math.min(c.r, c.g, c.b) < 209) return false;
        if (!(c.r >= c.g && c.g >= c.b)) return false;
        const warmth = c.r - c.b;
        return warmth >= 6 && warmth <= 48;
      }
      const bodyBg = parseColor(getComputedStyle(document.body).backgroundColor);
      const htmlBg = parseColor(getComputedStyle(document.documentElement).backgroundColor);
      let surface = bodyBg && bodyBg.a >= 0.5 ? bodyBg : htmlBg;
      if (
        !surface ||
        surface.a < 0.5 ||
        (!isCream(surface) && Math.min(surface.r, surface.g, surface.b) >= 250)
      ) {
        const wrappers = Array.from(document.body.children).slice(0, 8);
        for (const w of wrappers) {
          try {
            const r = w.getBoundingClientRect();
            if (r.width >= window.innerWidth * 0.8 && r.height >= window.innerHeight * 0.5) {
              const wc = parseColor(getComputedStyle(w).backgroundColor);
              if (wc && wc.a >= 0.5 && isCream(wc)) {
                surface = wc;
                break;
              }
            }
          } catch {}
        }
      }
      const cream = isCream(surface);
      const hex = surface
        ? '#' +
          [surface.r, surface.g, surface.b]
            .map((v) => Math.round(v).toString(16).padStart(2, '0'))
            .join('')
        : null;
      return { surface: hex, triggered: cream };
    },
  },

  // ── 21. WASHED-OUT GREY BODY TEXT (FIX-08: dark bg + informational APCA) ──
  {
    id: 'low_contrast_text',
    label: 'Washed-out grey body text (below WCAG AA contrast floor)',
    short: 'Low contrast',
    category: 'colors',
    weight: 7,
    author: 'impeccable',
    since: '2026.08',
    status: 'active',
    evidenceGrade: 'standard',
    era: '2025-v0',
    modelFamilies: ['v0', 'cursor', 'bolt', 'lovable'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const {
        visible,
        parseColor,
        contrastRatio,
        apcaContrast,
        channelSpread,
        effectiveBackground,
      } = ctx;
      const BODY = /^(p|li|span|dd|blockquote|figcaption|small)$/i;
      let fails = 0,
        checked = 0;
      const samples = [];
      const seen = new Set();
      for (const el of visible) {
        if (seen.has(el)) continue;
        if (!BODY.test(el.tagName)) continue;
        if (el.closest('a, button, [role="button"], nav, header')) continue;
        const direct = (Array.from(el.childNodes) as ChildNode[])
          .filter((n) => n.nodeType === 3)
          .map((n) => (n.textContent || '').trim())
          .join(' ')
          .trim();
        if (direct.length < 20) continue;
        seen.add(el);
        const cs = getComputedStyle(el);
        const fontSize = parseFloat(cs.fontSize) || 16;
        if (fontSize >= 24) continue;
        const fg = parseColor(cs.color);
        if (!fg || fg.a < 0.5) continue;
        const bg = effectiveBackground(el);
        if (!bg || bg._approx) continue;
        // FIX-08: bgLum < 0.6 guard removed so dark-mode low contrast (e.g. zinc-500 on zinc-950)
        // is evaluated with WCAG 2 contrast math alongside light-mode low contrast.
        if (channelSpread(fg) >= 40) continue;
        checked++;
        const ratio = contrastRatio(fg, bg);
        const apcaLc = typeof apcaContrast === 'function' ? apcaContrast(fg, bg) : null;
        if (ratio < 4.5) {
          fails++;
          if (samples.length < 3) {
            samples.push({
              text: direct.slice(0, 30),
              ratio: +ratio.toFixed(2),
              floor: 4.5,
              apcaLc,
            });
          }
        }
        if (checked >= 400) break;
      }
      const ratioFail = checked ? fails / checked : 0;
      const triggered = checked >= 4 && fails >= 4 && ratioFail >= 0.25;
      return {
        fails,
        checked,
        ratioFail: +ratioFail.toFixed(3),
        samples,
        apcaNote: 'APCA, a candidate method; the WCAG 3 draft leaves the contrast measure undetermined',
        triggered,
      };
    },
  },

  // ── 22. CRUSHED LETTER-SPACING (2026.08) ──────────────────────────────────
  {
    id: 'crushed_tracking',
    label: 'Crushed letter-spacing on display type',
    short: 'Crushed tracking',
    category: 'fonts',
    weight: 5,
    author: 'impeccable',
    since: '2026.08',
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2025-v0',
    modelFamilies: ['v0', 'claude', 'cursor'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible } = ctx;
      let count = 0;
      const samples = [];
      for (const el of visible) {
        const txt = (el.textContent || '').trim();
        if (txt.length < 3 || txt.length > 80) continue;
        const cs = getComputedStyle(el);
        const fontSize = parseFloat(cs.fontSize) || 16;
        if (fontSize < 28) continue;
        const ls = parseFloat(cs.letterSpacing);
        if (isNaN(ls)) continue;
        const em = ls / fontSize;
        if (em <= -0.05) {
          count++;
          if (samples.length < 3) {
            samples.push({ text: txt.slice(0, 30), em: +em.toFixed(3), px: +ls.toFixed(1) });
          }
        }
      }
      return { count, samples, triggered: count >= 1 };
    },
  },

  // ── 23. OVERSIZED HERO H1 (2026.08) ───────────────────────────────────────
  {
    id: 'oversized_hero_h1',
    label: 'Oversized hero headline (long sentence at display size)',
    short: 'Oversized H1',
    category: 'fonts',
    weight: 4,
    author: 'impeccable',
    since: '2026.08',
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2025-v0',
    modelFamilies: ['v0', 'claude', 'lovable'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { h1 } = ctx;
      if (!h1) return { triggered: false };
      const cs = getComputedStyle(h1);
      const fontSize = parseFloat(cs.fontSize) || 0;
      const text = (h1.textContent || '').trim();
      const triggered = fontSize >= 72 && text.length >= 40;
      return {
        fontSize: Math.round(fontSize),
        chars: text.length,
        text: text.slice(0, 60),
        triggered,
      };
    },
  },

  // ── 24. NESTED CARDS (2026.08) ────────────────────────────────────────────
  {
    id: 'nested_cards',
    label: 'Cards nested inside cards',
    short: 'Nested cards',
    category: 'layout',
    weight: 4,
    author: 'impeccable',
    since: '2026.08',
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2025-v0',
    modelFamilies: ['v0', 'lovable', 'bolt'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible } = ctx;
      const SKIP =
        /^(input|select|textarea|img|video|canvas|picture|pre|code|svg|button|a|nav|li)$/i;
      function isCardLike(el: any) {
        const tag = el.tagName.toLowerCase();
        if (SKIP.test(tag)) return false;
        const cs = getComputedStyle(el);
        if (cs.position === 'absolute' || cs.position === 'fixed') return false;
        const cls = (el.getAttribute('class') || '').toLowerCase();
        if (/(dropdown|popover|tooltip|menu|modal|dialog|overlay)/.test(cls)) return false;
        if ((el.textContent || '').trim().length < 10) return false;
        const r = el.getBoundingClientRect();
        if (r.width < 50 || r.height < 30) return false;
        const hasShadow = cs.boxShadow && cs.boxShadow !== 'none';
        const hasBorder =
          parseFloat(cs.borderTopWidth) > 0 ||
          parseFloat(cs.borderLeftWidth) > 0 ||
          /\bborder\b/.test(cls);
        const radius = parseFloat(cs.borderRadius) || 0;
        const hasRadius = radius > 0;
        const bg = cs.backgroundColor;
        const hasBg = bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
        return (hasShadow || hasBorder) && (hasRadius || hasBg);
      }
      function inTransformedFrame(el: any) {
        let a = el.parentElement,
          g = 0;
        while (a && g++ < 20) {
          const cs = getComputedStyle(a);
          if (cs.transform !== 'none' || cs.perspective !== 'none') return true;
          a = a.parentElement;
        }
        return false;
      }
      const cards = [];
      for (const el of visible) {
        try {
          if (isCardLike(el)) cards.push(el);
        } catch {}
      }
      const cardSet = new Set(cards);
      let nested = 0;
      const samples = [];
      for (const el of cards) {
        let anc = el.parentElement,
          hasCardAncestor = false;
        let guard = 0;
        while (anc && guard++ < 30) {
          if (cardSet.has(anc)) {
            hasCardAncestor = true;
            break;
          }
          anc = anc.parentElement;
        }
        if (!hasCardAncestor) continue;
        let containsCard = false;
        for (const other of cards) {
          if (other !== el && el.contains(other)) {
            containsCard = true;
            break;
          }
        }
        if (containsCard) continue;
        if (inTransformedFrame(el)) continue;
        nested++;
        if (samples.length < 3) {
          samples.push((el.getAttribute('class') || el.tagName.toLowerCase()).slice(0, 40));
        }
      }
      return { nested, samples, triggered: nested >= 3 };
    },
  },

  // ── 25. FLAT TYPE HIERARCHY (2026.08) ─────────────────────────────────────
  {
    id: 'flat_type_hierarchy',
    label: 'Flat type hierarchy (sizes too close together)',
    short: 'Flat hierarchy',
    category: 'fonts',
    weight: 3,
    author: 'impeccable',
    since: '2026.08',
    status: 'active',
    evidenceGrade: 'practitioner',
    era: '2025-v0',
    modelFamilies: ['v0', 'bolt'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible } = ctx;
      const TEXTY = /^(h1|h2|h3|h4|h5|h6|p|span|a|li|td|th|label|button|div)$/i;
      const sizes = new Set<number>();
      for (const el of visible) {
        if (!TEXTY.test(el.tagName)) continue;
        const txt = (el.textContent || '').trim();
        if (txt.length < 2) continue;
        const fs = Math.round(parseFloat(getComputedStyle(el).fontSize));
        if (fs >= 8 && fs < 200) sizes.add(fs);
      }
      const arr = [...sizes];
      if (arr.length < 3) return { distinct: arr.length, triggered: false };
      const ratio = Math.max(...arr) / Math.min(...arr);
      return {
        distinct: arr.length,
        ratio: +ratio.toFixed(2),
        min: Math.min(...arr),
        max: Math.max(...arr),
        triggered: ratio < 2.0,
      };
    },
  },

  // ── 26. SCAFFOLD DEFAULTS UNEDITED (D-02, weight 0 under K-04) ────────────
  {
    id: 'scaffold_defaults_unedited',
    label: 'Unfinished page — scaffold defaults left unedited',
    short: 'Scaffold defaults',
    category: 'layout',
    weight: 0,
    proposedWeight: 10,
    tier: 'Warning',
    status: 'review',
    evidenceGrade: 'practitioner',
    era: '2025-v0',
    modelFamilies: ['lovable', 'nextjs-scaffold'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: () => {
      const hits: string[] = [];
      const title = (document.title || '').trim();
      if (title === 'Create Next App') {
        hits.push('title="Create Next App"');
      }
      const descEl = document.querySelector('meta[name="description" i]');
      const desc = descEl ? (descEl.getAttribute('content') || '').trim() : '';
      if (desc === 'Lovable Generated Project' || desc === 'Generated by create next app') {
        hits.push(`meta[name=description]="${desc}"`);
      }
      const ogImgEl = document.querySelector('meta[property="og:image" i]');
      const ogImg = ogImgEl ? (ogImgEl.getAttribute('content') || '').trim() : '';
      if (ogImg === 'https://lovable.dev/opengraph-image-p98pqg.png') {
        hits.push('og:image="https://lovable.dev/opengraph-image-p98pqg.png"');
      }
      const bodyTxt = document.body ? document.body.textContent || '' : '';
      if (bodyTxt.includes('To get started, edit the page.tsx file')) {
        hits.push('text="To get started, edit the page.tsx file"');
      }
      return {
        hits,
        triggered: hits.length > 0,
      };
    },
  },

  // ── 27. HERO ACCENT WORD (D-03, weight 0 under K-04) ──────────────────────
  {
    id: 'hero_accent_word',
    label: 'Single inline accent span/italic/color word inside H1',
    short: 'Hero accent word',
    category: 'fonts',
    weight: 0,
    status: 'review',
    evidenceGrade: 'practitioner',
    era: '2026-opus4.6',
    modelFamilies: ['claude', 'v0', 'cursor'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { h1, parseColor, deltaEOklab } = ctx;
      if (!h1) return { triggered: false };
      const h1Text = (h1.textContent || '').trim();
      const h1Words = h1Text.split(/\s+/).filter(Boolean);
      if (h1Words.length < 2) return { triggered: false };
      const h1Cs = getComputedStyle(h1);
      const h1Fam = (h1Cs.fontFamily || '').split(',')[0].replace(/['"]/g, '').trim().toLowerCase();
      const h1Style = h1Cs.fontStyle || 'normal';
      const h1Color = parseColor(h1Cs.color);
      const inlineDescendants = h1.querySelectorAll('span, em, i, strong, b, mark, a');
      for (const child of Array.from(inlineDescendants) as any[]) {
        const cText = (child.textContent || '').trim();
        const cWords = cText.split(/\s+/).filter(Boolean);
        if (cWords.length === 0 || cWords.length > 3 || cWords.length >= h1Words.length) continue;
        const cCs = getComputedStyle(child);
        const differedBy: string[] = [];
        const cFam = (cCs.fontFamily || '').split(',')[0].replace(/['"]/g, '').trim().toLowerCase();
        if (cFam && h1Fam && cFam !== h1Fam) differedBy.push('fontFamily');
        if ((cCs.fontStyle || 'normal') !== h1Style) differedBy.push('fontStyle');
        const clip = (cCs as any).webkitBackgroundClip || cCs.backgroundClip;
        if (clip === 'text' && /gradient\(/i.test(cCs.backgroundImage || '')) {
          differedBy.push('gradientClip');
        }
        const cColor = parseColor(cCs.color);
        if (cColor && h1Color) {
          const de = typeof deltaEOklab === 'function' ? deltaEOklab(cColor, h1Color) : 0;
          const isPlainLink =
            child.tagName === 'A' &&
            child.hasAttribute('href') &&
            differedBy.length === 0 &&
            /underline/i.test(cCs.textDecorationLine || cCs.textDecoration || '');
          if (de > 0.05 && !isPlainLink) {
            differedBy.push('color');
          }
        }
        if (differedBy.length > 0) {
          return {
            h1Text: h1Text.slice(0, 80),
            accentText: cText.slice(0, 40),
            differedBy,
            triggered: true,
          };
        }
      }
      return { triggered: false };
    },
  },

  // ── 28. TEMPLATE CHROME 2026 (D-04, weight 0 under K-04) ──────────────────
  {
    id: 'template_chrome_2026',
    label: '2026 template micro-chrome bundle (≥3 of 6 sub-signals)',
    short: '2026 chrome',
    category: 'layout',
    weight: 0,
    status: 'review',
    evidenceGrade: 'practitioner',
    era: '2026-opus4.6',
    modelFamilies: ['claude', 'v0', 'cursor'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible } = ctx;
      let middleDotMeta = 0;
      let totalCtas = 0;
      let arrowCtas = 0;
      let pillCtas = 0;
      let smallMonoLabels = 0;
      let wordEmdashFragment = 0;
      let trackedEyebrows = 0;
      let doubleSlashChrome = 0;

      const headings = visible.filter((el: any) => /^(H2|H3)$/.test(el.tagName));

      for (const el of visible) {
        const tag = el.tagName;
        if (/^(CODE|PRE|SCRIPT|STYLE)$/.test(tag)) continue;
        if (typeof el.closest === 'function' && el.closest('code, pre, .hljs')) continue;
        const txt = (el.textContent || '').trim();
        if (!txt) continue;
        const cs = getComputedStyle(el);

        // (1) Middle-dot metadata strings outside footer
        if (
          txt.length <= 90 &&
          el.children.length <= 2 &&
          !(typeof el.closest === 'function' && el.closest('footer')) &&
          /\S\s+[·•]\s+\S/.test(txt)
        ) {
          middleDotMeta++;
        }

        // (2) CTAs ending in arrows + pill button tracking
        const cls = String(el.className || '');
        const isCta = /^(A|BUTTON)$/.test(tag) || /btn|button|cta/i.test(cls);
        if (isCta && txt.length <= 45) {
          const r = el.getBoundingClientRect();
          if (r.width >= 40 && r.height >= 24) {
            totalCtas++;
            const hasArrowText = /[→↗»]\s*$/.test(txt);
            const hasArrowSvg = Boolean(
              typeof el.querySelector === 'function' &&
                el.querySelector('svg[class*="arrow"], svg[data-icon*="arrow"]'),
            );
            if (hasArrowText || hasArrowSvg) arrowCtas++;
            const rad = parseFloat(cs.borderRadius) || 0;
            if (rad >= r.height / 2) pillCtas++;
          }
        }

        // (3) Small monospace labels <= 13px
        const fs = parseFloat(cs.fontSize) || 16;
        const fam = (cs.fontFamily || '').toLowerCase();
        if (
          fs <= 13 &&
          txt.length <= 60 &&
          /monospace|mono|jetbrains|fira code|consolas|menlo|courier/.test(fam)
        ) {
          smallMonoLabels++;
        }

        // (4) "WORD — fragment" labels
        if (txt.length <= 80 && /\b[A-Z]{2,}\s+[—–-]\s+\S/.test(txt)) {
          wordEmdashFragment++;
        }

        // (6) Double-slash "//" chrome in nav, headings, eyebrows, breadcrumbs (not URLs)
        if (
          (/^(NAV|H1|H2|H3)$/.test(tag) ||
            /eyebrow|breadcrumb/i.test(cls) ||
            /breadcrumb/i.test(el.getAttribute?.('aria-label') || '')) &&
          /\s\/\/\s/.test(txt) &&
          !/https?:\/\//i.test(txt)
        ) {
          doubleSlashChrome++;
        }
      }

      // (5) Tracked eyebrows above h2/h3
      for (const h of headings) {
        const hr = h.getBoundingClientRect();
        for (const el of visible) {
          if (el === h) continue;
          const r = el.getBoundingClientRect();
          if (r.bottom <= hr.top + 8 && r.bottom >= hr.top - 48) {
            const cs = getComputedStyle(el);
            const fs = parseFloat(cs.fontSize) || 16;
            const ls = parseFloat(cs.letterSpacing) || 0;
            if (fs <= 14 && (cs.textTransform === 'uppercase' || (fs > 0 && ls / fs >= 0.06))) {
              trackedEyebrows++;
              break;
            }
          }
        }
      }

      const subSignals = {
        middle_dot_meta: middleDotMeta >= 2,
        arrow_ctas: totalCtas >= 2 && arrowCtas / totalCtas >= 0.6,
        small_mono_labels: smallMonoLabels >= 4,
        word_emdash_fragment: wordEmdashFragment >= 2,
        tracked_eyebrows: headings.length > 0 && trackedEyebrows / headings.length >= 0.6,
        double_slash_chrome: doubleSlashChrome >= 2,
      };
      const hits = Object.values(subSignals).filter(Boolean).length;
      const pillButtons = totalCtas >= 2 && pillCtas / totalCtas >= 0.6;
      return {
        hits,
        subSignals,
        pillButtons,
        triggered: hits >= 3,
      };
    },
  },

  // ── 29. UNIFORM RADIUS & SHADOW (D-05, weight 0 under K-04) ───────────────
  {
    id: 'uniform_radius_shadow',
    label: 'Single border-radius (≥12px) and identical neutral shadow across ≥3 size classes',
    short: 'Uniform radius/shadow',
    category: 'css',
    weight: 0,
    status: 'review',
    evidenceGrade: 'hypothesis',
    era: '2025-v0',
    modelFamilies: ['v0', 'lovable', 'bolt'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible, parseColor, channelSpread, extractColorStrings } = ctx;
      const radiusCounts = new Map<number, { count: number; sizeClasses: Set<string> }>();
      const shadowCounts = new Map<string, number>();
      let totalComponents = 0;
      let totalShadowed = 0;

      for (const el of visible) {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (r.width < 30 || r.height < 20) continue;
        const tl = Math.round(parseFloat(cs.borderTopLeftRadius || cs.borderRadius) || 0);
        const tr = Math.round(parseFloat(cs.borderTopRightRadius || cs.borderRadius) || 0);
        const br = Math.round(parseFloat(cs.borderBottomRightRadius || cs.borderRadius) || 0);
        const bl = Math.round(parseFloat(cs.borderBottomLeftRadius || cs.borderRadius) || 0);
        if (tl <= 0 || tl !== tr || tl !== br || tl !== bl) continue;

        totalComponents++;
        const area = r.width * r.height;
        const sizeClass = area < 4000 ? 'chip' : area <= 60000 ? 'card' : 'modal';
        const entry = radiusCounts.get(tl) || { count: 0, sizeClasses: new Set<string>() };
        entry.count++;
        entry.sizeClasses.add(sizeClass);
        radiusCounts.set(tl, entry);

        const shadow = cs.boxShadow || '';
        if (shadow && shadow !== 'none') {
          const cols =
            typeof extractColorStrings === 'function'
              ? extractColorStrings(shadow)
              : shadow.match(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/gi) || [];
          const col = cols.length > 0 ? parseColor(cols[0]) : null;
          if (col && channelSpread(col) < 30 && col.a > 0 && col.a <= 0.15) {
            totalShadowed++;
            shadowCounts.set(shadow, (shadowCounts.get(shadow) || 0) + 1);
          }
        }
      }

      let dominantRadius = 0;
      let dominantCount = 0;
      let dominantSizeClasses = 0;
      for (const [rad, info] of radiusCounts.entries()) {
        if (info.count > dominantCount) {
          dominantRadius = rad;
          dominantCount = info.count;
          dominantSizeClasses = info.sizeClasses.size;
        }
      }

      let maxShadowCount = 0;
      for (const c of shadowCounts.values()) {
        if (c > maxShadowCount) maxShadowCount = c;
      }

      const radiusShare = totalComponents > 0 ? +(dominantCount / totalComponents).toFixed(3) : 0;
      const shadowShare = totalShadowed > 0 ? +(maxShadowCount / totalShadowed).toFixed(3) : 0;
      const triggered =
        totalComponents >= 8 &&
        dominantRadius >= 12 &&
        radiusShare >= 0.8 &&
        dominantSizeClasses >= 3 &&
        totalShadowed >= 3 &&
        shadowShare >= 0.7;

      return {
        totalComponents,
        dominantRadius,
        radiusShare,
        dominantSizeClasses,
        shadowShare,
        triggered,
      };
    },
  },

  // ── 30. EDITORIAL CREAM KIT (D-06, weight 0 under K-04) ───────────────────
  {
    id: 'editorial_cream_kit',
    label: 'Warm-editorial cream + serif + terracotta/brass or broadsheet hairline kit',
    short: 'Editorial kit',
    category: 'colors',
    weight: 0,
    status: 'review',
    evidenceGrade: 'practitioner',
    era: '2026-opus4.6',
    modelFamilies: ['claude'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible, h1, parseColor, deltaEOklab, rgbToOklch, isAccentSerif } = ctx;
      const bodyBg =
        parseColor(getComputedStyle(document.body).backgroundColor) ||
        parseColor(getComputedStyle(document.documentElement).backgroundColor);
      const h1Fam = h1 ? getComputedStyle(h1).fontFamily : '';
      const hasSerifH1 = Boolean(
        h1 && (isAccentSerif(h1Fam) || /\bserif\b/i.test(h1Fam) && !/sans-serif/i.test(h1Fam)),
      );

      // Cream branch: surface within ΔE_OK <= 0.05 of #F4F1EA + serif H1 + terracotta (#D97757) or brass accent
      const nearCream =
        bodyBg && typeof deltaEOklab === 'function' ? deltaEOklab(bodyBg, '#F4F1EA') <= 0.05 : false;
      let hasTerracottaOrBrass = false;
      let maxButtonCardRadius = 0;
      let hairlineRules = document.querySelectorAll('hr').length;
      let trackedLabels = 0;

      for (const el of visible) {
        const cs = getComputedStyle(el);
        const bg = parseColor(cs.backgroundColor);
        const fg = parseColor(cs.color);
        for (const col of [bg, fg]) {
          if (!col || col.a < 0.3) continue;
          if (typeof deltaEOklab === 'function' && deltaEOklab(col, '#D97757') <= 0.05) {
            hasTerracottaOrBrass = true;
          } else if (typeof rgbToOklch === 'function') {
            const lch = rgbToOklch(col);
            if (lch && lch.h >= 35 && lch.h <= 85 && lch.C >= 0.08 && lch.L >= 0.45 && lch.L <= 0.78) {
              hasTerracottaOrBrass = true;
            }
          }
        }
        if (/^(BUTTON|A)$/.test(el.tagName) || /card|btn/i.test(String(el.className || ''))) {
          const rad = parseFloat(cs.borderRadius) || 0;
          if (rad > maxButtonCardRadius) maxButtonCardRadius = rad;
        }
        if (
          parseFloat(cs.borderTopWidth) === 1 ||
          parseFloat(cs.borderBottomWidth) === 1
        ) {
          hairlineRules++;
        }
        const fs = parseFloat(cs.fontSize) || 16;
        const ls = parseFloat(cs.letterSpacing) || 0;
        if (fs <= 14 && cs.textTransform === 'uppercase' && ls > 0.5) {
          trackedLabels++;
        }
      }

      const creamBranch = Boolean(nearCream && hasSerifH1 && hasTerracottaOrBrass);
      const broadsheetBranch = Boolean(
        hasSerifH1 && maxButtonCardRadius === 0 && hairlineRules >= 6 && trackedLabels >= 3,
      );
      return {
        creamBranch,
        broadsheetBranch,
        hasSerifH1,
        hairlineRules,
        trackedLabels,
        triggered: creamBranch || broadsheetBranch,
      };
    },
  },

  // ── 31. TEMPLATE PAGE ORDER (D-09, weight 0 / report-only) ────────────────
  {
    id: 'template_page_order',
    label: 'Canonical 8-section landing-page sequence order',
    short: 'Page order',
    category: 'layout',
    weight: 0,
    status: 'review',
    evidenceGrade: 'practitioner',
    era: '2025-v0',
    modelFamilies: ['v0', 'lovable', 'bolt', 'cursor'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: () => {
      const canonical = [
        'hero',
        'logo_bar',
        'features',
        'testimonials',
        'stats',
        'pricing',
        'faq',
        'cta_footer',
      ];
      const rawSections = Array.from(
        document.querySelectorAll('main > section, body > section, main > div, body > header, body > footer'),
      );
      const roles: string[] = [];
      rawSections.forEach((sec: any, idx: number) => {
        const txt = (sec.textContent || '').toLowerCase();
        const tag = sec.tagName.toLowerCase();
        let role = '';
        if (idx === 0 || sec.querySelector('h1')) role = 'hero';
        else if (/trusted by|backed by|logos/i.test(txt) && sec.querySelectorAll('img, svg').length >= 4)
          role = 'logo_bar';
        else if (/frequently asked|\bfaq\b/i.test(txt) || sec.querySelectorAll('details').length >= 2)
          role = 'faq';
        else if (/pricing|\$\d+\s*\/\s*(?:mo|month|yr)/i.test(txt)) role = 'pricing';
        else if (/testimonial|what .* say|loved by/i.test(txt)) role = 'testimonials';
        else if (/\b99\.9%|\b\d+k\+|\b\d+m\+/i.test(txt)) role = 'stats';
        else if (tag === 'footer' || /ready to get started|start your free/i.test(txt)) role = 'cta_footer';
        else if (sec.querySelector('h2, h3')) role = 'features';
        if (role && roles[roles.length - 1] !== role) roles.push(role);
      });

      // Levenshtein distance between roles[] and canonical[]
      const m = roles.length;
      const n = canonical.length;
      const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
      for (let i = 0; i <= m; i++) dp[i][0] = i;
      for (let j = 0; j <= n; j++) dp[0][j] = j;
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          const cost = roles[i - 1] === canonical[j - 1] ? 0 : 1;
          dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
      }
      const editDistance = dp[m][n];
      const normalizedDistance = +(editDistance / Math.max(m, n, 1)).toFixed(3);
      return {
        roles,
        canonical,
        editDistance,
        normalizedDistance,
        triggered: roles.length >= 5 && normalizedDistance <= 0.375,
      };
    },
  },

  // ── 32. PULSING STATUS BADGE (D-12, weight 0 under K-04) ──────────────────
  {
    id: 'pulsing_status_badge',
    label: 'Infinite pulsing "Live / Active / Beta" status dot on marketing copy',
    short: 'Pulsing badge',
    category: 'css',
    weight: 0,
    status: 'review',
    evidenceGrade: 'practitioner',
    era: '2025-v0',
    modelFamilies: ['v0', 'lovable', 'bolt'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible } = ctx;
      const title = (document.title || '').toLowerCase();
      if (/\bstatus\b/.test(title)) {
        return { exempt: 'status-title', count: 0, triggered: false };
      }
      if (
        document.querySelector(
          'script[src*="statuspage.io"], script[src*="instatus"], script[src*="betteruptime"]',
        )
      ) {
        return { exempt: 'status-provider', count: 0, triggered: false };
      }

      const badgeWords = /\b(live|active|online|new|beta|verified|now)\b/i;
      let count = 0;
      const samples: string[] = [];

      for (const el of visible) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const cls = String(el.className || '');
        const isInfinite =
          (cs.animationIterationCount === 'infinite' &&
            cs.animationName !== 'none' &&
            cs.animationPlayState !== 'paused') ||
          /\banimate-(?:ping|pulse)\b/.test(cls);
        if (!isInfinite) continue;

        const isSmallDot = r.width <= 12 && r.height <= 12;
        const container = isSmallDot ? el.parentElement || el : el;
        const txt = (container.textContent || '').trim();
        const words = txt.split(/\s+/).filter(Boolean);
        if (words.length >= 1 && words.length <= 4 && badgeWords.test(txt)) {
          count++;
          if (samples.length < 3) samples.push(txt.slice(0, 30));
        }
      }

      return { count, samples, triggered: count >= 1 };
    },
  },

  // ── 33. DISPLAY MONO HEADING (D-14, weight 0 under K-04) ──────────────────
  {
    id: 'display_mono_heading',
    label: 'Monospace H1/H2 heading at display size (≥24px) outside devtool context',
    short: 'Mono heading',
    category: 'fonts',
    weight: 0,
    status: 'review',
    evidenceGrade: 'practitioner',
    era: '2026-opus4.6',
    modelFamilies: ['claude', 'cursor'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible, resolveRenderedFont, inHero } = ctx;
      const hasCodeInHero = visible.some(
        (el: any) => /^(PRE|CODE)$/.test(el.tagName) && typeof inHero === 'function' && inHero(el),
      );
      if (hasCodeInHero) {
        return { exempt: 'code-in-hero', triggered: false };
      }
      const monoRe =
        /\b(monospace|ui-monospace|jetbrains\s*mono|fira\s*code|geist\s*mono|ibm\s*plex\s*mono|space\s*mono|source\s*code\s*pro|sf\s*mono|menlo|consolas|courier)\b/i;
      const hits: Array<{ tag: string; family: string; fontSize: number }> = [];
      for (const el of visible) {
        if (!/^(H1|H2)$/.test(el.tagName)) continue;
        const cs = getComputedStyle(el);
        const fs = parseFloat(cs.fontSize) || 0;
        if (fs < 24) continue;
        const rendered =
          typeof resolveRenderedFont === 'function'
            ? resolveRenderedFont(cs.fontFamily)
            : cs.fontFamily || '';
        if (monoRe.test(rendered) || monoRe.test(cs.fontFamily || '')) {
          hits.push({ tag: el.tagName, family: rendered || cs.fontFamily, fontSize: Math.round(fs) });
        }
      }
      return { hits, triggered: hits.length > 0 };
    },
  },

  // ── 34. CHIP RAINBOW (D-15, weight 0 under K-04) ──────────────────────────
  {
    id: 'chip_rainbow',
    label: 'Multi-hue badge/pill/tag rainbow (≥6 chips across ≥4 hues separated by >30°)',
    short: 'Chip rainbow',
    category: 'colors',
    weight: 0,
    status: 'review',
    evidenceGrade: 'practitioner',
    era: '2025-v0',
    modelFamilies: ['v0', 'lovable', 'bolt'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible, parseColor, rgbToOklch } = ctx;
      const hues: number[] = [];
      let chipCount = 0;

      for (const el of visible) {
        if (/^(NAV|HEADER|FOOTER|UL|OL)$/.test(el.tagName)) continue;
        if (typeof el.closest === 'function' && el.closest('nav')) continue;
        const r = el.getBoundingClientRect();
        if (r.height < 16 || r.height > 40 || r.width < 30 || r.width > 220) continue;
        const txt = (el.textContent || '').trim();
        const words = txt.split(/\s+/).filter(Boolean);
        if (words.length === 0 || words.length > 3) continue;
        const cs = getComputedStyle(el);
        const rad = parseFloat(cs.borderRadius) || 0;
        if (rad < 4) continue;
        const col = parseColor(cs.backgroundColor) || parseColor(cs.borderColor) || parseColor(cs.color);
        if (!col || col.a < 0.1) continue;
        const lch = typeof rgbToOklch === 'function' ? rgbToOklch(col) : col.oklch;
        if (!lch || lch.C < 0.04) continue;
        chipCount++;
        hues.push(lch.h);
      }

      // Greedy cluster hues with >= 30 deg separation
      const distinctHues: number[] = [];
      for (const h of hues) {
        const farEnough = distinctHues.every((dh) => {
          const diff = Math.abs(h - dh) % 360;
          const angularDist = diff > 180 ? 360 - diff : diff;
          return angularDist > 30;
        });
        if (farEnough) distinctHues.push(Math.round(h));
      }

      return {
        chipCount,
        distinctHueCount: distinctHues.length,
        distinctHues,
        triggered: chipCount >= 6 && distinctHues.length >= 4,
      };
    },
  },

  // ── 35. FAKE MACOS TERMINAL (#196, weight 0 under K-04) ───────────────────
  {
    id: 'fake_macos_terminal',
    label: 'Decorative macOS traffic-light window chrome above a code/text block',
    short: 'Fake terminal',
    category: 'layout',
    weight: 0,
    status: 'review',
    evidenceGrade: 'practitioner',
    era: '2025-v0',
    modelFamilies: ['v0', 'bolt', 'lovable', 'cursor'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible } = ctx;
      let count = 0;
      for (const el of visible) {
        if (!el.children || el.children.length < 3) continue;
        const kids = Array.from(el.children) as any[];
        let circles = 0;
        for (const k of kids.slice(0, 5)) {
          const kr = k.getBoundingClientRect();
          if (kr.width >= 6 && kr.width <= 16 && Math.abs(kr.width - kr.height) <= 2) {
            const kcs = getComputedStyle(k);
            if (parseFloat(kcs.borderRadius) >= kr.width * 0.4) {
              circles++;
            }
          }
        }
        if (circles >= 3) {
          const container = el.parentElement;
          if (container && container.querySelector('pre, code, [class*="mono"]')) {
            count++;
          }
        }
      }
      return { count, triggered: count >= 1 };
    },
  },

  // ── 36. FAKE LOGO BAR (#196, weight 0 under K-04) ─────────────────────────
  {
    id: 'fake_logo_bar',
    label: 'Placeholder or duplicate-asset logo bar ("Trusted by" generic SVG/text row)',
    short: 'Fake logo bar',
    category: 'images',
    weight: 0,
    status: 'review',
    evidenceGrade: 'practitioner',
    era: '2025-v0',
    modelFamilies: ['v0', 'lovable', 'bolt'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible } = ctx;
      const nodeIds: string[] = [];
      let placeholderLogos = 0;
      let duplicateLogoRows = 0;

      for (const el of visible) {
        if (!el.children || el.children.length < 4 || el.children.length > 12) continue;
        const kids = Array.from(el.children) as any[];
        const srcs: string[] = [];
        let genericItems = 0;

        for (const k of kids) {
          const txt = (k.textContent || '').trim();
          if (/^(?:logo|company|brand|partner|acme|corp)\s*\d*$/i.test(txt)) {
            placeholderLogos++;
            genericItems++;
          }
          const img = k.querySelector?.('img');
          if (img) {
            const src = img.getAttribute('src') || '';
            if (src) srcs.push(src);
          } else if (k.querySelector?.('svg') && txt.length >= 2 && txt.length <= 20) {
            genericItems++;
          }
        }

        const uniqueSrcs = new Set(srcs);
        if ((srcs.length >= 4 && uniqueSrcs.size < srcs.length) || genericItems >= 4) {
          duplicateLogoRows++;
          const r = el.getBoundingClientRect();
          nodeIds.push(`logobar:${Math.round(r.top || 0)}`);
        }
      }

      return {
        placeholderLogos,
        duplicateLogoRows,
        nodeIds,
        triggered: placeholderLogos >= 2 || duplicateLogoRows >= 1,
      };
    },
  },

  // ── 37. INFINITE MARQUEE TICKER (#197, weight 0 under K-04) ───────────────
  {
    id: 'infinite_marquee_ticker',
    label: 'Infinite linear horizontal marquee ticker with duplicated child sequence',
    short: 'Marquee ticker',
    category: 'css',
    weight: 0,
    status: 'review',
    evidenceGrade: 'practitioner',
    era: '2025-v0',
    modelFamilies: ['v0', 'lovable', 'bolt'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible } = ctx;
      let tickers = 0;
      for (const el of visible) {
        const cs = getComputedStyle(el);
        const cls = String(el.className || '');
        const isInfiniteLinear =
          (cs.animationIterationCount === 'infinite' &&
            cs.animationTimingFunction === 'linear' &&
            cs.animationName !== 'none') ||
          /marquee|ticker/i.test(cls) ||
          /marquee|ticker/i.test(cs.animationName || '');
        if (!isInfiniteLinear) continue;
        const kids = Array.from(el.children || []) as any[];
        if (kids.length >= 2) {
          const texts = kids.map((k) => (k.textContent || '').trim() || k.innerHTML?.slice(0, 60) || '');
          const unique = new Set(texts.filter(Boolean));
          if (texts.length >= 2 && unique.size <= Math.ceil(texts.length / 2)) {
            tickers++;
          }
        }
      }
      return { tickers, triggered: tickers >= 1 };
    },
  },

  // ── 38. FADE-UP MONOCULTURE (#197, weight 0 under K-04) ───────────────────
  {
    id: 'fade_up_monoculture',
    label: 'At-rest fade-up entrance monoculture (≥6 below-fold elements at opacity 0 + translateY)',
    short: 'Fade-up monoculture',
    category: 'css',
    weight: 0,
    status: 'review',
    evidenceGrade: 'practitioner',
    era: '2025-v0',
    modelFamilies: ['v0', 'lovable', 'bolt', 'cursor'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: () => {
      const vh = window.innerHeight || 800;
      const all = document.body ? document.body.querySelectorAll('section *, main *') : [];
      let count = 0;
      const sections = new Set();
      let checked = 0;
      for (const el of Array.from(all) as any[]) {
        if (checked++ > 1200) break;
        const r = el.getBoundingClientRect();
        if (r.top < vh) continue;
        const cs = getComputedStyle(el);
        const op = parseFloat(cs.opacity || '1');
        if (op > 0.01) continue;
        const tr = cs.transform || '';
        const matrixMatch = tr.match(/matrix\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,\s*([+-]?\d+(?:\.\d+)?)\)/);
        const translateYMatch = tr.match(/translateY\(\s*([+-]?\d+(?:\.\d+)?)px\)/i);
        const ty = matrixMatch
          ? parseFloat(matrixMatch[1])
          : translateYMatch
            ? parseFloat(translateYMatch[1])
            : 0;
        if (ty >= 8 && ty <= 60) {
          count++;
          const sec = el.closest('section, article, main > div') || el.parentElement;
          if (sec) sections.add(sec);
        }
      }
      return {
        count,
        sectionCount: sections.size,
        triggered: count >= 6 && sections.size >= 3,
      };
    },
  },

  // ── 39. CURSOR SPOTLIGHT GRADIENT (#197, weight 0 under K-04) ─────────────
  {
    id: 'cursor_spotlight_gradient',
    label: 'Cursor-tracking radial-gradient spotlight overlay (--mouse-x / --mouse-y)',
    short: 'Cursor spotlight',
    category: 'css',
    weight: 0,
    status: 'review',
    evidenceGrade: 'practitioner',
    era: '2025-v0',
    modelFamilies: ['v0', 'cursor', 'bolt'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: () => {
      const varRe = /--(?:mouse-x|mouse-y|spotlight-x|spotlight-y|cursor-x|cursor-y)\b/i;
      let hits = 0;
      const all = document.querySelectorAll('[style], [class*="spotlight"]');
      for (const el of Array.from(all)) {
        const st = el.getAttribute('style') || '';
        if (varRe.test(st)) hits++;
      }
      if (hits === 0) {
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
              if (varRe.test(String(rule.cssText || ''))) {
                hits++;
                break;
              }
            }
          }
        } catch {}
      }
      return { hits, triggered: hits >= 1 };
    },
  },

  // ── 40. UNIFORM CARD HOVER (#197, weight 0 under K-04) ────────────────────
  {
    id: 'uniform_card_hover',
    label: 'Identical transform/box-shadow hover transition tuple across ≥4 cards',
    short: 'Uniform hover',
    category: 'css',
    weight: 0,
    status: 'review',
    evidenceGrade: 'practitioner',
    era: '2025-v0',
    modelFamilies: ['v0', 'lovable', 'bolt'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { visible } = ctx;
      const tuples = new Map<string, number>();
      for (const el of visible) {
        const r = el.getBoundingClientRect();
        if (r.width < 150 || r.height < 80) continue;
        const cs = getComputedStyle(el);
        const dur = cs.transitionDuration || '0s';
        if (dur === '0s' || dur === '0ms') continue;
        const prop = cs.transitionProperty || '';
        if (!/transform|box-shadow|all/i.test(prop)) continue;
        const key = `${prop}|${dur}|${cs.transitionTimingFunction || ''}`;
        tuples.set(key, (tuples.get(key) || 0) + 1);
      }
      let maxCount = 0;
      let dominantTuple = '';
      for (const [k, c] of tuples.entries()) {
        if (c > maxCount) {
          maxCount = c;
          dominantTuple = k;
        }
      }
      return {
        maxCount,
        dominantTuple,
        triggered: maxCount >= 4,
      };
    },
  },

  // ── 41. SECTION TEMPLATE REPETITION (#198, weight 0 under K-04) ───────────
  {
    id: 'section_template_repetition',
    label: 'Repeated top-level section structural template signature (≥3 identical sections)',
    short: 'Section repetition',
    category: 'layout',
    weight: 0,
    status: 'review',
    evidenceGrade: 'hypothesis',
    era: '2025-v0',
    modelFamilies: ['v0', 'lovable', 'bolt'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: () => {
      const sections = Array.from(document.querySelectorAll('main > section, body > section, main > div'));
      if (sections.length === 0) {
        return {
          sectionCount: 0,
          repeatedShare: 0,
          maxSignatureCount: 0,
          paddingCV: 0,
          referenceMedians: { gridAdherence: 0.62, distinctTypeSizes: 8, maxRadiusPx: 50 },
          triggered: false,
        };
      }
      const sigCounts = new Map<string, number>();
      const paddings: number[] = [];

      for (const sec of sections as any[]) {
        const cs = getComputedStyle(sec);
        const disp = cs.display || 'block';
        const cols = disp === 'grid' ? (cs.gridTemplateColumns || '').split(' ').filter(Boolean).length : 1;
        const childBucket = Math.min(6, sec.children ? sec.children.length : 0);
        const sig = `${disp}:${cols}:${childBucket}`;
        sigCounts.set(sig, (sigCounts.get(sig) || 0) + 1);
        const pt = parseFloat(cs.paddingTop) || 0;
        if (pt > 0) paddings.push(pt);
      }

      let maxSignatureCount = 0;
      let repeatedSections = 0;
      for (const c of sigCounts.values()) {
        if (c > maxSignatureCount) maxSignatureCount = c;
        if (c >= 3) repeatedSections += c;
      }

      let paddingCV = 0;
      if (paddings.length >= 2) {
        const mean = paddings.reduce((s, v) => s + v, 0) / paddings.length;
        if (mean > 0) {
          const sd = Math.sqrt(
            paddings.reduce((s, v) => s + (v - mean) * (v - mean), 0) / paddings.length,
          );
          paddingCV = +(sd / mean).toFixed(3);
        }
      }

      const repeatedShare = +(repeatedSections / sections.length).toFixed(3);
      return {
        sectionCount: sections.length,
        repeatedShare,
        maxSignatureCount,
        paddingCV,
        referenceMedians: { gridAdherence: 0.62, distinctTypeSizes: 8, maxRadiusPx: 50 },
        triggered: maxSignatureCount >= 3 && repeatedShare >= 0.5,
      };
    },
  },

  // ── 42. UNTHEMED BROWSER SURFACES (#199, weight 0 under K-04) ─────────────
  {
    id: 'unthemed_browser_surfaces',
    label: 'Dark page missing color-scheme: dark or dynamic counters missing tabular-nums',
    short: 'Unthemed surfaces',
    category: 'css',
    weight: 0,
    status: 'review',
    evidenceGrade: 'standard',
    era: '2025-v0',
    modelFamilies: ['v0', 'bolt', 'lovable', 'cursor'],
    lastValidatedIn: '2026.11',
    likelihoodRatio: null,
    fpRate: null,
    fpRatePre2022: null,
    extract: (ctx) => {
      const { parseColor, relativeLuminance } = ctx;
      const rootEl = document.documentElement;
      const rootCs = rootEl ? getComputedStyle(rootEl) : ({} as any);
      const bodyCs = document.body ? getComputedStyle(document.body) : ({} as any);
      const surfaceCol = parseColor(bodyCs.backgroundColor) || parseColor(rootCs.backgroundColor);
      const surfaceLum = surfaceCol ? relativeLuminance(surfaceCol) : 1;
      const colorScheme = String(rootCs.colorScheme || '').toLowerCase();
      const missingColorSchemeDark = Boolean(
        surfaceCol && surfaceCol.a >= 0.5 && surfaceLum < 0.08 && !colorScheme.includes('dark'),
      );

      // Sub-signal B: dynamic counters or numeric tables (>= 3 numeric cols) without tabular-nums
      // Static prices like "$49" do NOT trigger B.
      let missingTabularNums = 0;
      const counterEls = document.querySelectorAll(
        '[data-counter], [data-target], [data-count], [class*="counter"], [class*="odometer"]',
      );
      for (const el of Array.from(counterEls)) {
        const txt = (el.textContent || '').trim();
        if (!/\d/.test(txt)) continue;
        const cs = getComputedStyle(el);
        const fvn = String(cs.fontVariantNumeric || '').toLowerCase();
        const ffs = String(cs.fontFeatureSettings || '').toLowerCase();
        if (!fvn.includes('tabular-nums') && !ffs.includes('tnum')) {
          missingTabularNums++;
        }
      }

      const tables = document.querySelectorAll('table');
      for (const tbl of Array.from(tables)) {
        const firstRow = tbl.querySelector('tbody tr, tr');
        if (!firstRow) continue;
        const cells = Array.from(firstRow.querySelectorAll('td'));
        const numCells = cells.filter((c) => /^\s*[$€£+-]?\d[\d,.%]*\s*$/.test(c.textContent || ''));
        if (numCells.length >= 3) {
          const cs = getComputedStyle(numCells[0]);
          const fvn = String(cs.fontVariantNumeric || '').toLowerCase();
          const ffs = String(cs.fontFeatureSettings || '').toLowerCase();
          if (!fvn.includes('tabular-nums') && !ffs.includes('tnum')) {
            missingTabularNums++;
          }
        }
      }

      return {
        missingColorSchemeDark,
        missingTabularNums,
        surfaceLum: +surfaceLum.toFixed(4),
        colorScheme: colorScheme || 'normal',
        triggered: missingColorSchemeDark || missingTabularNums > 0,
      };
    },
  },
];
