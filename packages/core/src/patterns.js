// The deterministic AI-design-slop patterns.
//
// 15 from Adrian Krebs's April 2026 study (adriankrebs.ch/blog/design-slop)
//  1. slop_fonts            — Inter / Space Grotesk / Geist / Instrument Serif
//  2. purple_accent         — "VibeCode Purple" on filled CTAs
//  3. gradient_text         — Hero H1 with background-clip:text + gradient
//  4. gradient_backgrounds  — ≥5 elements with CSS gradients
//  5. accent_stripe         — Colored top/left card borders ("the AI em-dash")
//  6. glassmorphism         — backdrop-filter blur on translucent layers
//  7. colored_glows         — Big colored box-shadows (purple/blue glow)
//  8. centered_hero         — Hero H1 centered, generic sans, large
//  9. hero_eyebrow_pill     — "Now in beta" / "New" pill above H1
// 10. all_caps_labels       — Repeated text-transform:uppercase section labels
// 11. perma_dark_mode       — Dark BG + medium-grey body text
// 12. icon_card_grid        — 3+ identical feature cards w/ icon on top
// 13. numbered_steps        — "1 · 2 · 3" sequence headings
// 14. stat_banner           — "10k+", "99.9%" big-number row
// 15. faq_accordion         — <details> or accordion grid in lower half
//
// Plus 1 contributed by Meng To (May 2026 27-min tutorial):
// 16. gradient_letter_avatars — Testimonial avatars as gradient + initial
//
// 2026.07 — emerging tells as AI builders converged on new defaults:
// 17. bento_grid           — Apple-keynote mixed-span rounded card wall
// 18. aurora_mesh_gradient — Blurred glowing radial/conic gradient blobs
// 19. ai_sparkle_badges    — ✨ / lucide "Sparkles" "AI magic" tells
//
// Each pattern returns { triggered, evidence, weight }. The orchestrator sums
// weights for the final 0-100 score.

export const PATTERNS = [

  // ── 1. SLOP FONTS ─────────────────────────────────────────────────────────
  {
    id: 'slop_fonts',
    label: 'AI-default font stack (Inter / Geist / Space Grotesk)',
    short: 'Slop fonts',
    category: 'fonts',
    weight: 8,
    extract: (ctx) => {
      const { visible, isSlopFont, isAccentSerif, h1 } = ctx;
      let slopCount = 0, total = 0, accentSerifWords = 0;
      const seen = new Set();
      for (const el of visible) {
        if (!el.textContent || !el.textContent.trim()) continue;
        const fam = getComputedStyle(el).fontFamily;
        if (!fam || seen.has(el)) continue;
        seen.add(el);
        total++;
        if (isSlopFont(fam)) slopCount++;
        if (isAccentSerif(fam) && /italic|oblique/.test(getComputedStyle(el).fontStyle)) {
          accentSerifWords++;
        }
      }
      const heroFam = h1 ? getComputedStyle(h1).fontFamily : '';
      const heroIsSlop = isSlopFont(heroFam);
      const ratio = total ? slopCount / total : 0;
      return {
        slopCount, total, ratio: +ratio.toFixed(3),
        heroIsSlop, heroFam,
        accentSerifItalicCount: accentSerifWords,
        triggered: heroIsSlop || ratio >= 0.6 || accentSerifWords > 0
      };
    }
  },

  // ── 2. VIBECODE PURPLE ────────────────────────────────────────────────────
  {
    id: 'purple_accent',
    label: 'VibeCode Purple — filled indigo/violet CTAs',
    short: 'Vibe purple',
    category: 'colors',
    weight: 8,
    extract: (ctx) => {
      const { visible, parseColor, isPurple } = ctx;
      let purpleEls = 0, filledCtas = 0;
      const samples = [];
      for (const el of visible) {
        const cs = getComputedStyle(el);
        const bg = parseColor(cs.backgroundColor);
        const bgImg = cs.backgroundImage || '';
        const border = parseColor(cs.borderColor);
        let purp = false, gradPurp = false;
        if (isPurple(bg)) purp = true;
        if (isPurple(border) && parseFloat(cs.borderWidth) > 0) purp = true;
        if (bgImg.includes('gradient')) {
          const m = bgImg.match(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/gi) || [];
          for (const c of m) { if (isPurple(parseColor(c))) { gradPurp = true; break; } }
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
    }
  },

  // ── 3. GRADIENT TEXT ──────────────────────────────────────────────────────
  {
    id: 'gradient_text',
    label: 'Hero gradient text (background-clip:text)',
    short: 'Gradient text',
    category: 'colors',
    weight: 6,
    extract: (ctx) => {
      const { visible, h1 } = ctx;
      let count = 0;
      let heroHasGradient = false;
      for (const el of visible) {
        const cs = getComputedStyle(el);
        const clip = cs.webkitBackgroundClip || cs.backgroundClip;
        if (clip === 'text' && /gradient\(/.test(cs.backgroundImage || '')) {
          count++;
          if (el === h1) heroHasGradient = true;
        }
      }
      if (h1 && !heroHasGradient) {
        const cs = getComputedStyle(h1);
        const clip = cs.webkitBackgroundClip || cs.backgroundClip;
        if (clip === 'text' && /gradient\(/.test(cs.backgroundImage || '')) {
          heroHasGradient = true;
        }
      }
      return { count, heroHasGradient, triggered: count > 0 || heroHasGradient };
    }
  },

  // ── 4. GRADIENT-HEAVY BACKGROUNDS ─────────────────────────────────────────
  {
    id: 'gradient_backgrounds',
    label: 'Gradient-heavy backgrounds (5+ elements)',
    short: 'Gradient bgs',
    category: 'colors',
    weight: 4,
    extract: (ctx) => {
      const { visible } = ctx;
      let n = 0, conic = 0;
      for (const el of visible) {
        const cs = getComputedStyle(el);
        const bgImg = cs.backgroundImage || '';
        if (/gradient\(/.test(bgImg)) {
          // Skip near-transparent gradient stacks.
          const rgba = bgImg.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*([\d.]+))?\s*\)/g);
          let hasOpaqueStop = !rgba;
          if (rgba) {
            for (const r of rgba) {
              const a = r.match(/,\s*([\d.]+)\s*\)/);
              if (!a || parseFloat(a[1]) > 0.05) { hasOpaqueStop = true; break; }
            }
          }
          if (hasOpaqueStop) {
            n++;
            if (/conic-gradient/.test(bgImg)) conic++;
          }
        }
      }
      return { bgElements: n, conic, triggered: n >= 5 };
    }
  },

  // ── 5. ACCENT STRIPE ──────────────────────────────────────────────────────
  {
    id: 'accent_stripe',
    label: 'Colored top/left card borders (the AI em-dash)',
    short: 'Accent stripe',
    category: 'layout',
    weight: 6,
    extract: (ctx) => {
      const { visible, parseColor } = ctx;
      let stripeCards = 0;
      for (const el of visible) {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (r.width < 100 || r.height < 60) continue;
        const widths = {
          top: parseFloat(cs.borderTopWidth),
          left: parseFloat(cs.borderLeftWidth),
          right: parseFloat(cs.borderRightWidth),
          bottom: parseFloat(cs.borderBottomWidth)
        };
        const colors = {
          top: parseColor(cs.borderTopColor),
          left: parseColor(cs.borderLeftColor)
        };
        // Top stripe: top border ≥3px AND distinct color AND other borders thin
        const otherMax = Math.max(widths.left, widths.right, widths.bottom);
        const topStripe = widths.top >= 3 && otherMax < widths.top - 1 && colors.top && colors.top.a > 0.3;
        const leftStripe = widths.left >= 3
          && Math.max(widths.top, widths.right, widths.bottom) < widths.left - 1
          && colors.left && colors.left.a > 0.3;
        if (topStripe || leftStripe) stripeCards++;
      }
      return { stripeCards, triggered: stripeCards >= 2 };
    }
  },

  // ── 6. GLASSMORPHISM ──────────────────────────────────────────────────────
  {
    id: 'glassmorphism',
    label: 'Glassmorphism (backdrop-filter blur on translucent layers)',
    short: 'Glass',
    category: 'css',
    weight: 4,
    extract: (ctx) => {
      const { visible, parseColor } = ctx;
      let glassCount = 0;
      for (const el of visible) {
        const cs = getComputedStyle(el);
        const filter = cs.backdropFilter || cs.webkitBackdropFilter || '';
        if (!/blur\(/.test(filter)) continue;
        const bg = parseColor(cs.backgroundColor);
        if (bg && bg.a > 0 && bg.a < 0.8) {
          glassCount++;
        }
      }
      return { glassCount, triggered: glassCount >= 1 };
    }
  },

  // ── 7. COLORED GLOWS ──────────────────────────────────────────────────────
  {
    id: 'colored_glows',
    label: 'Big colored box-shadow glows (purple/blue/pink)',
    short: 'Colored glows',
    category: 'css',
    weight: 4,
    extract: (ctx) => {
      const { visible, parseColor, isPurple } = ctx;
      let glowCount = 0;
      for (const el of visible) {
        const cs = getComputedStyle(el);
        const shadow = cs.boxShadow || '';
        if (shadow === 'none' || !shadow.includes('rgb')) continue;
        // Glow heuristic: large blur radius, colored (non-grey) shadow color.
        const blurMatch = shadow.match(/\s(\d+(?:\.\d+)?)px\s/g) || [];
        const maxBlur = Math.max(0, ...blurMatch.map(b => parseFloat(b)));
        if (maxBlur < 24) continue;
        const colors = shadow.match(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/gi) || [];
        for (const c of colors) {
          const col = parseColor(c);
          if (!col || col.a < 0.1) continue;
          // Colored: clearly non-grey hue
          if (isPurple(col)) { glowCount++; break; }
          const max = Math.max(col.r, col.g, col.b), min = Math.min(col.r, col.g, col.b);
          if ((max - min) > 60 && col.a > 0.2) { glowCount++; break; }
        }
      }
      return { glowCount, triggered: glowCount >= 1 };
    }
  },

  // ── 8. CENTERED HERO ──────────────────────────────────────────────────────
  {
    id: 'centered_hero',
    label: 'Centered hero in generic sans (Inter-style)',
    short: 'Centered hero',
    category: 'layout',
    weight: 4,
    extract: (ctx) => {
      const { h1, isSlopFont } = ctx;
      if (!h1) return { triggered: false, h1Found: false };
      const cs = getComputedStyle(h1);
      const fontSize = parseFloat(cs.fontSize);
      // textAlign may be inherited from parent; also check parent's textAlign
      // and whether the H1 itself is roughly centered within its container.
      let centered = cs.textAlign === 'center';
      if (!centered && h1.parentElement) {
        const pcs = getComputedStyle(h1.parentElement);
        if (pcs.textAlign === 'center') centered = true;
      }
      if (!centered) {
        // Geometric check: bbox center within 12% of parent container center
        try {
          const r = h1.getBoundingClientRect();
          const pr = (h1.parentElement || document.body).getBoundingClientRect();
          const elCx = r.left + r.width / 2;
          const prCx = pr.left + pr.width / 2;
          if (pr.width > 0 && Math.abs(elCx - prCx) / pr.width < 0.12) centered = true;
        } catch {}
      }
      // Lowered from 36 → 28 to catch v0.dev (32px) and modern smaller AI-tool heroes.
      const big = fontSize >= 28;
      const slopFont = isSlopFont(cs.fontFamily);
      const triggered = centered && big && slopFont;
      return { triggered, fontSize, centered, slopFont, family: cs.fontFamily };
    }
  },

  // ── 9. HERO EYEBROW PILL ──────────────────────────────────────────────────
  {
    id: 'hero_eyebrow_pill',
    label: 'Eyebrow pill above hero ("Now in beta" / "New")',
    short: 'Eyebrow pill',
    category: 'layout',
    weight: 5,
    extract: (ctx) => {
      const { h1, parseColor } = ctx;
      if (!h1) return { triggered: false };
      const h1Rect = h1.getBoundingClientRect();
      // Look for small rounded pill elements within ~200px above the H1.
      const candidates = Array.from(document.querySelectorAll('a, div, span, button'));
      const pillKeywords = /\b(new|beta|now in|introducing|announcing|just shipped|v\d+|launching|coming soon|early access|whats new|just landed|just dropped)\b/i;
      for (const el of candidates) {
        const r = el.getBoundingClientRect();
        // Must be above H1, within 250px
        if (r.bottom > h1Rect.top || r.bottom < h1Rect.top - 250) continue;
        if (r.width < 40 || r.width > 500 || r.height > 80) continue;
        const cs = getComputedStyle(el);
        const radius = parseFloat(cs.borderRadius);
        // Pill = high border-radius relative to height
        if (!radius || radius < r.height / 3) continue;
        const txt = (el.textContent || '').trim();
        if (txt.length < 2 || txt.length > 80) continue;
        // Horizontal alignment: roughly centered with h1
        const elCenter = r.left + r.width / 2;
        const h1Center = h1Rect.left + h1Rect.width / 2;
        if (Math.abs(elCenter - h1Center) > h1Rect.width / 2) continue;
        if (pillKeywords.test(txt) || /✨|🚀|⚡/.test(txt)) {
          return { triggered: true, text: txt.slice(0, 60), radius };
        }
        // Even without keyword: a small rounded pill directly above a centered hero
        // is still highly slop-coded
        if (txt.length < 40 && (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.borderWidth !== '0px')) {
          return { triggered: true, text: txt.slice(0, 60), radius, weak: true };
        }
      }
      return { triggered: false };
    }
  },

  // ── 10. ALL-CAPS LABELS ───────────────────────────────────────────────────
  {
    id: 'all_caps_labels',
    label: 'All-caps section labels (text-transform:uppercase)',
    short: 'All-caps',
    category: 'fonts',
    weight: 3,
    extract: (ctx) => {
      const { visible } = ctx;
      let count = 0;
      const samples = [];
      for (const el of visible) {
        const cs = getComputedStyle(el);
        if (cs.textTransform !== 'uppercase') continue;
        const txt = (el.textContent || '').trim();
        if (txt.length < 3 || txt.length > 40) continue;
        const ls = parseFloat(cs.letterSpacing);
        // Section labels usually have positive letter-spacing
        if (isNaN(ls) || ls < 0.5) continue;
        count++;
        if (samples.length < 3) samples.push(txt.slice(0, 30));
      }
      return { count, samples, triggered: count >= 2 };
    }
  },

  // ── 11. PERMA DARK MODE ───────────────────────────────────────────────────
  {
    id: 'perma_dark_mode',
    label: 'Perma dark mode + medium-grey body text',
    short: 'Perma dark',
    category: 'colors',
    weight: 4,
    extract: (ctx) => {
      const { parseColor, isDark, isMidGrey } = ctx;
      // Sample multiple sources: html, body, and the largest near-fullscreen
      // wrapper element (many modern AI sites paint bg on a flex-wrap div, not
      // body itself).
      const cand = [];
      cand.push(parseColor(getComputedStyle(document.documentElement).backgroundColor));
      cand.push(parseColor(getComputedStyle(document.body).backgroundColor));
      // Walk a few top-level wrappers; pick the largest fully-visible element
      // and sample its bg.
      const topWrappers = Array.from(document.body.children).slice(0, 8);
      for (const w of topWrappers) {
        try {
          const r = w.getBoundingClientRect();
          if (r.width >= window.innerWidth * 0.8 && r.height >= window.innerHeight * 0.5) {
            cand.push(parseColor(getComputedStyle(w).backgroundColor));
          }
        } catch {}
      }
      // Also sample a single mid-viewport pixel by checking element at point.
      try {
        const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
        if (el) cand.push(parseColor(getComputedStyle(el).backgroundColor));
      } catch {}

      // Find the first non-transparent dark colour.
      let bodyBg = null;
      for (const c of cand) {
        if (c && c.a >= 0.5) { bodyBg = c; break; }
      }
      const dark = isDark(bodyBg);
      if (!dark) return { triggered: false, bodyDark: false };
      const ps = document.querySelectorAll('p, li, span');
      let greys = 0, total = 0;
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
      // Either: dark + lots of mid-grey body text (≥30%) OR just very dark page (a
      // dark site is itself a strong slop signal even if text is white).
      const triggered = dark && (ratio >= 0.3 || total >= 5);
      return {
        bodyDark: true, greyParas: greys, totalParas: total, ratio: +ratio.toFixed(2),
        triggered
      };
    }
  },

  // ── 12. ICON-CARD GRID ────────────────────────────────────────────────────
  {
    id: 'icon_card_grid',
    label: 'Identical feature cards with icon on top',
    short: 'Icon cards',
    category: 'layout',
    weight: 4,
    extract: (ctx) => {
      const { visible } = ctx;
      // Look for siblings that have similar shape + an SVG/img as their first
      // significant child.
      const groups = new Map();
      for (const el of visible) {
        const parent = el.parentElement;
        if (!parent) continue;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (r.width < 150 || r.width > 600 || r.height < 100 || r.height > 600) continue;
        // First descendant svg or img positioned at top
        const icon = el.querySelector(':scope > svg, :scope > img, :scope > div > svg, :scope > div > img');
        if (!icon) continue;
        const ir = icon.getBoundingClientRect();
        if (ir.width > 80 || ir.height > 80) continue;
        if (ir.top > r.top + r.height * 0.4) continue; // icon not at top
        // Group by parent + rough width bucket
        const key = parent.tagName + ':' + Math.round(r.width / 20);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(el);
      }
      let maxGroup = 0;
      for (const arr of groups.values()) if (arr.length > maxGroup) maxGroup = arr.length;
      return { maxGroupSize: maxGroup, triggered: maxGroup >= 3 };
    }
  },

  // ── 13. NUMBERED STEPS ────────────────────────────────────────────────────
  {
    id: 'numbered_steps',
    label: 'Numbered "1 · 2 · 3" step sequences',
    short: 'Numbered steps',
    category: 'layout',
    weight: 3,
    extract: (ctx) => {
      const { visible } = ctx;
      // Find groups of sibling elements where the leading numeric label
      // increments (1,2,3) or contains "Step 1/2/3".
      const numberPat = /^(?:step\s*)?(\d{1,2})(?:[.):]|\s*[—-])?\s*/i;
      const parents = new Map();
      for (const el of visible) {
        const txt = (el.textContent || '').trim();
        const m = txt.match(numberPat);
        if (!m) continue;
        const n = parseInt(m[1], 10);
        if (n < 1 || n > 9) continue;
        // Pull the inner numbered child specifically
        if (!el.parentElement) continue;
        const key = el.parentElement;
        if (!parents.has(key)) parents.set(key, new Set());
        parents.get(key).add(n);
      }
      let bestRun = 0;
      for (const set of parents.values()) {
        if (set.has(1) && set.has(2) && set.has(3)) {
          let run = 3 + (set.has(4) ? 1 : 0) + (set.has(5) ? 1 : 0);
          if (run > bestRun) bestRun = run;
        }
      }
      return { bestRun, triggered: bestRun >= 3 };
    }
  },

  // ── 14. STAT BANNER ───────────────────────────────────────────────────────
  {
    id: 'stat_banner',
    label: 'Big-number stat banner ("10k+", "99.9%", "$2M+")',
    short: 'Stat banner',
    category: 'layout',
    weight: 3,
    extract: (ctx) => {
      const { visible } = ctx;
      // A row of 3-5 large-font numeric tokens
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
      // Cluster by top position
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
    }
  },

  // ── 15. FAQ ACCORDION ─────────────────────────────────────────────────────
  {
    id: 'faq_accordion',
    label: 'FAQ accordion in the lower half',
    short: 'FAQ',
    category: 'layout',
    weight: 2,
    extract: (ctx) => {
      const details = document.querySelectorAll('details');
      let count = 0;
      const pageHeight = document.documentElement.scrollHeight;
      for (const d of details) {
        const r = d.getBoundingClientRect();
        const absTop = r.top + window.scrollY;
        if (absTop < pageHeight * 0.4) continue;
        count++;
      }
      // Also detect "FAQ" heading + question-shaped siblings
      let textFaq = false;
      const h = document.querySelectorAll('h1,h2,h3');
      for (const el of h) {
        const t = (el.textContent || '').trim().toLowerCase();
        if (t === 'faq' || t === 'frequently asked questions' || t.startsWith('faq')) {
          textFaq = true; break;
        }
      }
      return { detailsCount: count, hasFaqHeading: textFaq, triggered: count >= 3 || (textFaq && count >= 1) };
    }
  },

  // ── 16. GRADIENT-LETTER AVATARS (Meng's contribution) ─────────────────────
  {
    id: 'gradient_letter_avatars',
    label: 'Gradient-letter avatars (testimonial slop)',
    short: 'Letter avatars',
    category: 'images',
    weight: 5,
    extract: (ctx) => {
      const { visible } = ctx;
      // Pattern: small (~40-72px) round element, gradient background, contains
      // exactly 1-2 letters as text content, near other testimonial-like text.
      let count = 0;
      const samples = [];
      for (const el of visible) {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (r.width < 28 || r.width > 96) continue;
        if (Math.abs(r.width - r.height) > 8) continue; // must be roughly square
        const radius = parseFloat(cs.borderRadius);
        // Circular or pill-shaped
        if (radius < r.width / 3) continue;
        const bg = cs.backgroundImage || '';
        const bgColor = cs.backgroundColor;
        const hasGradient = /gradient\(/.test(bg);
        const hasSolidColor = bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent';
        if (!hasGradient && !hasSolidColor) continue;
        // Contains exactly 1-2 letters (initials)
        const txt = (el.textContent || '').trim();
        if (txt.length < 1 || txt.length > 3) continue;
        if (!/^[A-Za-z]{1,3}$/.test(txt)) continue;
        // No img child (would be a real photo)
        if (el.querySelector('img, svg[data-photo]')) continue;
        count++;
        if (samples.length < 3) samples.push({ initials: txt, size: Math.round(r.width) });
      }
      return { count, samples, triggered: count >= 2 };
    }
  },

  // ── 17. BENTO-GRID WALL (2026.07) ─────────────────────────────────────────
  // The Apple-keynote "bento box": a CSS grid of heavily-rounded cards at mixed
  // column/row spans. Every AI builder ships a bento section now; a wall of 5+
  // rounded grid children with varied spans is a strong template tell.
  {
    id: 'bento_grid',
    label: 'Bento-grid wall — mixed-span rounded card grid',
    short: 'Bento grid',
    category: 'layout',
    weight: 4,
    author: 'slop-detect',
    since: '2026.07',
    extract: (ctx) => {
      const { visible } = ctx;
      let best = { children: 0, spanVariety: 0, rounded: 0 };
      for (const el of visible) {
        const cs = getComputedStyle(el);
        if (cs.display !== 'grid') continue;
        // Needs an explicit multi-column template to be a "bento", not a 1-col stack.
        const cols = (cs.gridTemplateColumns || '').split(' ').filter(Boolean).length;
        if (cols < 2) continue;
        const kids = Array.from(el.children);
        if (kids.length < 4) continue;
        const spans = new Set();
        let rounded = 0, sized = 0;
        for (const k of kids) {
          const kr = k.getBoundingClientRect();
          if (kr.width < 80 || kr.height < 60) continue;
          sized++;
          const kcs = getComputedStyle(k);
          // Column span via grid-column or explicit span keyword.
          const gc = (kcs.gridColumn || '').toString();
          const m = gc.match(/span\s+(\d+)/i);
          spans.add(m ? parseInt(m[1], 10) : 1);
          if (parseFloat(kcs.borderRadius) >= 12) rounded++;
        }
        if (sized < 4) continue;
        // Bento = several rounded cards + at least two distinct column spans
        // (the asymmetry that defines the look). A uniform 3-col grid is just a
        // normal grid and is already partly covered by icon_card_grid.
        const score = { children: sized, spanVariety: spans.size, rounded };
        if (rounded >= 4 && spans.size >= 2 && sized > best.children) best = score;
      }
      return {
        ...best,
        triggered: best.rounded >= 4 && best.spanVariety >= 2 && best.children >= 5
      };
    }
  },

  // ── 18. AURORA / MESH GRADIENT BLOBS (2026.07) ────────────────────────────
  // The v0/Lovable hero backdrop: large absolutely-positioned divs with a
  // radial/conic gradient, big blur, and high border-radius — soft glowing
  // "aurora" blobs floating behind the fold. Distinct from gradient_backgrounds
  // (which counts any gradient) because it keys on the blurred-blob treatment.
  {
    id: 'aurora_mesh_gradient',
    label: 'Aurora / mesh gradient blobs (blurred glowing backdrop)',
    short: 'Aurora blobs',
    category: 'css',
    weight: 5,
    author: 'slop-detect',
    since: '2026.07',
    extract: (ctx) => {
      const { visible } = ctx;
      let blobs = 0;
      const samples = [];
      const vw = window.innerWidth, vh = window.innerHeight;
      for (const el of visible) {
        const cs = getComputedStyle(el);
        const bgImg = cs.backgroundImage || '';
        const isGrad = /(radial|conic)-gradient\(/.test(bgImg) ||
          (/linear-gradient\(/.test(bgImg) && parseFloat(cs.filter && cs.filter.match(/blur\(([\d.]+)px\)/)?.[1] || 0) > 0);
        if (!isGrad) continue;
        // Big blur is the signature — either a CSS filter:blur or a heavy radius
        // making a soft orb.
        const blurM = (cs.filter || '').match(/blur\(([\d.]+)px\)/);
        const blur = blurM ? parseFloat(blurM[1]) : 0;
        const radius = parseFloat(cs.borderRadius) || 0;
        const r = el.getBoundingClientRect();
        const big = r.width >= vw * 0.25 && r.height >= vh * 0.2;
        const orby = radius >= Math.min(r.width, r.height) * 0.4 || cs.borderRadius === '50%' || /9999px/.test(cs.borderRadius);
        const positioned = cs.position === 'absolute' || cs.position === 'fixed';
        if (blur >= 24 && big) { blobs++; }
        else if (positioned && orby && big && /(radial|conic)-gradient/.test(bgImg)) { blobs++; }
        else continue;
        if (samples.length < 3) samples.push({ blur: Math.round(blur), radius: cs.borderRadius });
      }
      return { blobs, samples, triggered: blobs >= 2 };
    }
  },

  // ── 19. AI-SPARKLE BADGES (2026.07) ───────────────────────────────────────
  // The generative-UI tell: a ✨/Sparkles glyph used to label something as
  // "AI-powered" — emoji in a button/eyebrow, or the lucide "Sparkles" SVG next
  // to a CTA or input. Near-universal on AI-builder landing pages in 2026.
  {
    id: 'ai_sparkle_badges',
    label: 'AI-sparkle badges (✨ / Sparkles "magic" tells)',
    short: 'AI sparkles',
    category: 'images',
    weight: 3,
    author: 'slop-detect',
    since: '2026.07',
    extract: (ctx) => {
      const { visible } = ctx;
      // Sparkle emoji range: ✨ (U+2728), 🌟 (U+1F31F), ⭐ used as "AI magic".
      const sparkleEmoji = /[\u2728\u2729\u2734\u2735]|\uD83C\uDF1F|\uD83E\uDE84/;
      // "AI magic" copy that co-occurs with the glyph.
      const magicWord = /\b(ai|magic|generate|powered by ai|with ai|smart)\b/i;
      let emojiHits = 0, svgHits = 0;
      const samples = [];
      for (const el of visible) {
        // Only leaf-ish small elements to avoid double-counting wrappers.
        const txt = (el.textContent || '').trim();
        if (txt && txt.length <= 40 && sparkleEmoji.test(txt) && el.children.length <= 1) {
          emojiHits++;
          if (samples.length < 3) samples.push(txt.slice(0, 30));
          continue;
        }
        // lucide/heroicons "sparkles" — class or data attr or aria-label.
        const attrs = ((el.getAttribute && (el.getAttribute('class') || '') + ' ' +
          (el.getAttribute('aria-label') || '') + ' ' +
          (el.getAttribute('data-icon') || '')) || '').toLowerCase();
        if (/sparkle|sparkles|magic-wand|wand-sparkles/.test(attrs)) {
          // Bonus confidence if it sits near AI copy.
          const near = (el.closest('button, a, label, [role="button"]') || el).textContent || '';
          svgHits += magicWord.test(near) ? 1 : 0.5;
        }
      }
      const total = emojiHits + svgHits;
      return { emojiHits, svgHits, samples, triggered: total >= 1 && (emojiHits >= 1 || svgHits >= 1) };
    }
  }
];
