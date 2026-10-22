// #300 K-05: Pioneer regression fixtures (committed synthetic pioneer-archetype HTML fixtures, zero network).
// Runs the real buildPageScript() / pattern.extract(ctx) / extractTextContext() pipeline against
// committed HTML fixtures with full DOM structure and fails if any pioneer result is Heavy or if
// any extractor throws. Note: these fixtures are synthetic pioneer-archetype HTML pages (not
// archived captures of live stripe.com or linear.app); published self-scans and quarterly live
// delta runs stay parked for the browser-runner slice.

import { test, expect, describe } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  PATTERNS,
  buildPageScript,
  scorePatterns,
  scoreCopy,
  assemblePatternResults,
} from '@slop-detect/core';

function loadPioneerHtml(name) {
  return readFileSync(new URL(`./fixtures/pioneers/${name}.html`, import.meta.url), 'utf8');
}

function camelToKebab(s) {
  return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function kebabToCamel(s) {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function parseStyleString(styleStr = '') {
  const map = {};
  for (const part of String(styleStr).split(';')) {
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim().toLowerCase();
    const v = part.slice(idx + 1).trim();
    if (k) {
      map[k] = v;
      map[kebabToCamel(k)] = v;
    }
  }
  return map;
}

function matchesSingleSelector(el, sel) {
  const s = sel.trim();
  if (!s || !el || !el.tagName) return false;
  if (s === '*') return true;
  if (s === ':root') return el.tagName === 'HTML';
  // Handle simple attribute selectors like meta[name="viewport"], a[href], [role="button"], [class*="card"]
  const attrRe =
    /^([a-z0-9_-]+)?\[([a-z0-9_:-]+)(?:([*^$~|]?=)(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]$/i;
  const m = s.match(attrRe);
  if (m) {
    const [, tagPart, attrName, op, v1, v2, v3] = m;
    if (tagPart && el.tagName.toLowerCase() !== tagPart.toLowerCase()) return false;
    const rawVal = el.getAttribute(attrName);
    if (!op) return rawVal !== null;
    const target = v1 ?? v2 ?? v3 ?? '';
    if (rawVal === null) return false;
    if (op === '=') return rawVal === target;
    if (op === '*=') return rawVal.toLowerCase().includes(target.toLowerCase());
    if (op === '^=') return rawVal.toLowerCase().startsWith(target.toLowerCase());
    if (op === '$=') return rawVal.toLowerCase().endsWith(target.toLowerCase());
    return false;
  }
  if (s.startsWith('.')) {
    const cls = (el.getAttribute('class') || '').split(/\s+/);
    return cls.includes(s.slice(1));
  }
  if (s.startsWith('#')) {
    return el.getAttribute('id') === s.slice(1);
  }
  // Ignore pseudo-selectors like a[href]:not(...)
  if (s.includes(':')) {
    const base = s.split(':')[0];
    return base ? matchesSingleSelector(el, base) : false;
  }
  return el.tagName.toLowerCase() === s.toLowerCase();
}

function matchesSelectorList(el, selector) {
  if (!selector) return false;
  const parts = String(selector)
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  for (const part of parts) {
    if (part.startsWith(':scope')) continue;
    const tokens = part.split(/\s+/).filter((t) => t !== '>');
    if (tokens.length === 1) {
      if (matchesSingleSelector(el, tokens[0])) return true;
    } else if (tokens.length > 1) {
      if (!matchesSingleSelector(el, tokens[tokens.length - 1])) continue;
      let cur = el.parentElement;
      let idx = tokens.length - 2;
      while (cur && idx >= 0) {
        if (matchesSingleSelector(cur, tokens[idx])) idx--;
        cur = cur.parentElement;
      }
      if (idx < 0) return true;
    }
  }
  return false;
}

function buildDomFromHtml(html) {
  const voidTags = new Set(['meta', 'link', 'img', 'br', 'hr', 'input', 'source']);
  const allElements = [];

  class MockElement {
    constructor(tagName, attrs = {}, parent = null) {
      this.tagName = tagName.toUpperCase();
      this.nodeType = 1;
      this.attrs = {};
      for (const [k, v] of Object.entries(attrs)) {
        this.attrs[k.toLowerCase()] = v;
      }
      this.parentElement = parent;
      this.children = [];
      this.childNodes = [];
      this._textParts = [];
      this.inlineStyle = parseStyleString(this.attrs.style || '');
      this.style = {
        ...this.inlineStyle,
        getPropertyValue: (prop) => this.inlineStyle[camelToKebab(prop)] || '',
      };
      this.id = this.attrs.id || '';
      this.className = this.attrs.class || '';
      this.href = this.attrs.href || '';
      this.disabled = 'disabled' in this.attrs;
      const classTokens = String(this.className).split(/\s+/).filter(Boolean);
      this.classList = {
        contains: (c) => classTokens.includes(c),
        [Symbol.iterator]: () => classTokens[Symbol.iterator](),
      };
    }

    get textContent() {
      const own = this._textParts.join('');
      const childText = this.children.map((c) => c.textContent).join(' ');
      return [own, childText].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    }

    get innerText() {
      return this.textContent;
    }

    getAttribute(name) {
      const k = String(name).toLowerCase();
      return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null;
    }

    hasAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attrs, String(name).toLowerCase());
    }

    getBoundingClientRect() {
      const raw = this.attrs['data-rect'];
      if (raw) {
        const [left, top, width, height] = raw.split(',').map((n) => parseFloat(n) || 0);
        return {
          left,
          top,
          width,
          height,
          right: left + width,
          bottom: top + height,
          x: left,
          y: top,
        };
      }
      if (this.tagName === 'HTML' || this.tagName === 'BODY') {
        return {
          left: 0,
          top: 0,
          width: 1280,
          height: 1400,
          right: 1280,
          bottom: 1400,
          x: 0,
          y: 0,
        };
      }
      if (this.tagName === 'HEAD' || this.tagName === 'META' || this.tagName === 'TITLE') {
        return { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0 };
      }
      return { left: 80, top: 100, width: 600, height: 40, right: 680, bottom: 140, x: 80, y: 100 };
    }

    matches(sel) {
      return matchesSelectorList(this, sel);
    }

    closest(sel) {
      let cur = this;
      while (cur) {
        if (matchesSelectorList(cur, sel)) return cur;
        cur = cur.parentElement;
      }
      return null;
    }

    querySelectorAll(sel) {
      const results = [];
      const walk = (node) => {
        for (const child of node.children) {
          if (matchesSelectorList(child, sel)) results.push(child);
          walk(child);
        }
      };
      walk(this);
      return results;
    }

    querySelector(sel) {
      return this.querySelectorAll(sel)[0] || null;
    }

    getClientRects() {
      const r = this.getBoundingClientRect();
      return r.width > 0 && r.height > 0 ? [r] : [];
    }
  }

  const root = new MockElement('document');
  let current = root;
  const tagRe = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z0-9-]+)([^>]*?)(\/?)>|([^<]+)/g;
  let match;
  while ((match = tagRe.exec(html)) !== null) {
    if (match[0].startsWith('<!--')) continue;
    const [, closing, tagName, attrStr, selfClosing, textNode] = match;
    if (textNode !== undefined) {
      const cleaned = textNode
        .replace(/&amp;/g, '&')
        .replace(/&mdash;/g, '—')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleaned && current) {
        current._textParts.push(cleaned);
        current.childNodes.push({ nodeType: 3, textContent: cleaned, nodeValue: cleaned });
      }
      continue;
    }
    const lowerTag = tagName.toLowerCase();
    if (closing) {
      let p = current;
      while (p && p !== root && p.tagName.toLowerCase() !== lowerTag) {
        p = p.parentElement;
      }
      if (p && p !== root) current = p.parentElement || root;
      continue;
    }
    const attrs = {};
    const attrParse = /([a-zA-Z0-9_:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let am;
    while ((am = attrParse.exec(attrStr || '')) !== null) {
      attrs[am[1]] = am[2] ?? am[3] ?? am[4] ?? '';
    }
    const el = new MockElement(lowerTag, attrs, current === root ? null : current);
    current.children.push(el);
    current.childNodes.push(el);
    allElements.push(el);
    if (!selfClosing && !voidTags.has(lowerTag)) {
      current = el;
    }
  }

  const htmlEl = allElements.find((e) => e.tagName === 'HTML') || new MockElement('html');
  const headEl = allElements.find((e) => e.tagName === 'HEAD') || new MockElement('head');
  const bodyEl = allElements.find((e) => e.tagName === 'BODY') || new MockElement('body');
  const titleEl = allElements.find((e) => e.tagName === 'TITLE');

  const computeStyle = (el) => {
    const inherited = {};
    let cur = el;
    const chain = [];
    while (cur) {
      chain.unshift(cur);
      cur = cur.parentElement;
    }
    for (const node of chain) {
      if (node.inlineStyle?.fontFamily) inherited.fontFamily = node.inlineStyle.fontFamily;
      if (node.inlineStyle?.color) inherited.color = node.inlineStyle.color;
      if (node.inlineStyle?.colorScheme) inherited.colorScheme = node.inlineStyle.colorScheme;
    }
    const own = el?.inlineStyle || {};
    const isHidden = el?.tagName === 'HEAD' || el?.tagName === 'META' || el?.tagName === 'TITLE';
    const base = {
      display: isHidden ? 'none' : own.display || 'block',
      visibility: own.visibility || 'visible',
      opacity: own.opacity || '1',
      position: own.position || 'static',
      fontFamily: own.fontFamily || inherited.fontFamily || '-apple-system, sans-serif',
      fontSize: own.fontSize || '16px',
      fontWeight: own.fontWeight || '400',
      fontStyle: own.fontStyle || 'normal',
      lineHeight: own.lineHeight || '24px',
      letterSpacing: own.letterSpacing || '0px',
      textAlign: own.textAlign || 'left',
      textTransform: own.textTransform || 'none',
      color: own.color || inherited.color || 'rgb(17, 17, 17)',
      backgroundColor: own.backgroundColor || 'rgba(0, 0, 0, 0)',
      backgroundImage: own.backgroundImage || 'none',
      backgroundClip: own.backgroundClip || 'border-box',
      webkitBackgroundClip: own.webkitBackgroundClip || 'border-box',
      webkitTextFillColor: own.webkitTextFillColor || '',
      borderRadius: own.borderRadius || '0px',
      borderTopWidth: own.borderTopWidth || '0px',
      borderLeftWidth: own.borderLeftWidth || '0px',
      borderRightWidth: own.borderRightWidth || '0px',
      borderBottomWidth: own.borderBottomWidth || '0px',
      borderTopColor: own.borderTopColor || 'rgba(0, 0, 0, 0)',
      borderLeftColor: own.borderLeftColor || 'rgba(0, 0, 0, 0)',
      borderRightColor: own.borderRightColor || 'rgba(0, 0, 0, 0)',
      borderBottomColor: own.borderBottomColor || 'rgba(0, 0, 0, 0)',
      boxShadow: own.boxShadow || 'none',
      backdropFilter: own.backdropFilter || 'none',
      webkitBackdropFilter: own.webkitBackdropFilter || 'none',
      filter: own.filter || 'none',
      animationName: own.animationName || 'none',
      animationDuration: own.animationDuration || '0s',
      animationIterationCount: own.animationIterationCount || '1',
      transitionDuration: own.transitionDuration || '0s',
      transitionProperty: own.transitionProperty || 'none',
      transform: own.transform || 'none',
      gridTemplateColumns: own.gridTemplateColumns || 'none',
      gridColumnEnd: own.gridColumnEnd || 'auto',
      overflow: own.overflow || 'visible',
      overflowX: own.overflowX || 'visible',
      overflowY: own.overflowY || 'visible',
      textOverflow: own.textOverflow || 'clip',
      whiteSpace: own.whiteSpace || 'normal',
      outlineWidth: own.outlineWidth || '2px',
      outlineStyle: own.outlineStyle || 'auto',
      colorScheme: own.colorScheme || inherited.colorScheme || 'light',
      getPropertyValue(prop) {
        const k = kebabToCamel(prop);
        return this[k] ?? own[prop] ?? '';
      },
    };
    return base;
  };

  const fontAttr = bodyEl.getAttribute('data-fonts') || '';
  const loadedFaces = fontAttr
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean)
    .map((family) => ({ family, status: 'loaded' }));

  const doc = {
    title: titleEl ? titleEl.textContent : '',
    documentElement: Object.assign(htmlEl, {
      scrollWidth: 1280,
      clientWidth: 1280,
    }),
    head: headEl,
    body: Object.assign(bodyEl, {
      scrollHeight: 1400,
    }),
    fonts: loadedFaces,
    images: allElements.filter((e) => e.tagName === 'IMG'),
    styleSheets: [],
    querySelectorAll: (sel) => {
      if (sel === '*') return allElements;
      return root.querySelectorAll(sel);
    },
    querySelector: (sel) => root.querySelector(sel),
    elementFromPoint: () => bodyEl,
  };

  const win = {
    innerWidth: 1280,
    innerHeight: 800,
    getComputedStyle: computeStyle,
    matchMedia: () => ({ matches: false }),
  };

  return { doc, win, computeStyle, MockElement };
}

// Execute the real buildPageScript() (all PATTERNS.extract, CRAFT_CHECKS.extract, and extractTextContext)
// against a committed pioneer HTML fixture.
export function evaluatePioneerSnapshot(html, { extraPatterns = [] } = {}) {
  const { doc, win, computeStyle, MockElement } = buildDomFromHtml(html);
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  const prevGcs = globalThis.getComputedStyle;
  const prevEl = globalThis.Element;
  const prevCss = globalThis.CSS;
  const prevLoc = globalThis.location;

  globalThis.document = doc;
  globalThis.window = win;
  globalThis.getComputedStyle = computeStyle;
  globalThis.Element = MockElement;
  globalThis.CSS = { supports: () => true };
  globalThis.location = { href: 'https://pioneer.example/' };

  try {
    const script = buildPageScript();
    const raw = new Function(`return ${script}`)();
    for (const extra of extraPatterns) {
      raw.signals[extra.id] = extra.extract({
        visible: doc.querySelectorAll('*'),
      });
    }
    const { patterns, patternsErrored } = assemblePatternResults(raw.signals);
    const designResult = scorePatterns(patterns);
    const copyResult = scoreCopy(raw.textContext || {});
    return { raw, patterns, patternsErrored, designResult, copyResult };
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
    globalThis.getComputedStyle = prevGcs;
    globalThis.Element = prevEl;
    globalThis.CSS = prevCss;
    globalThis.location = prevLoc;
  }
}

describe('K-05 (#300): Pioneer HTML fixture regression suite (real page-script extractors)', () => {
  for (const pioneer of ['stripe', 'linear', 'vercel', 'rauno']) {
    test(`${pioneer}.html runs all real extractors with 0 errors and scores Clean (< 10) on design and copy axes`, () => {
      const html = loadPioneerHtml(pioneer);
      expect(html.length).toBeGreaterThan(800);
      const { patterns, patternsErrored, designResult, copyResult } = evaluatePioneerSnapshot(html);
      expect(patterns.length).toBe(PATTERNS.length);
      expect(patternsErrored).toBe(0);
      expect(designResult.tier).not.toBe('Heavy');
      expect(designResult.score).toBeLessThan(10);
      expect(designResult.tier).toBe('Clean');
      expect(copyResult.wordCount).toBeGreaterThan(40);
      expect(copyResult.score).toBeLessThan(8);
      expect(copyResult.tier).toBe('Clean');
    });
  }

  test('scores extracted textContext, so copy that would be Heavy is Heavy', () => {
    const pad = Array.from(
      { length: 40 },
      () =>
        'The ledger records each settlement in the database before the next batch window starts.'
    ).join(' ');
    const html = `<!doctype html><html><body>
      <main>
        <h1>Platform</h1>
        <p>In today's fast-paced world we leverage seamless robust tools to elevate and unlock a streamlined harness. It's not just a ledger, it's a platform. This isn't just software. Whether you're a founder or an operator, the product is ready. ${pad} In conclusion the system is complete.</p>
      </main>
    </body></html>`;
    const { copyResult, raw } = evaluatePioneerSnapshot(html);
    expect(raw.text).toBeUndefined();
    expect(raw.textContext.proseWordCount).toBeGreaterThanOrEqual(300);
    expect(copyResult.score).toBeGreaterThanOrEqual(20);
    expect(copyResult.tier).toBe('Heavy');
  });

  test('Linear (Inter only) and Vercel (Geist only) trigger real slop_fonts.extract with interOrGeistOnly=true and receive 0 points via slop_fonts_co_signal', () => {
    const linear = evaluatePioneerSnapshot(loadPioneerHtml('linear'));
    expect(linear.raw.signals.slop_fonts.triggered).toBe(true);
    expect(linear.raw.signals.slop_fonts.interOrGeistOnly).toBe(true);
    expect(linear.designResult.score).toBe(0);
    expect(linear.designResult.adjustments.some((a) => a.ruleId === 'slop_fonts_co_signal')).toBe(
      true
    );

    const vercel = evaluatePioneerSnapshot(loadPioneerHtml('vercel'));
    expect(vercel.raw.signals.slop_fonts.triggered).toBe(true);
    expect(vercel.raw.signals.slop_fonts.interOrGeistOnly).toBe(true);
    expect(vercel.designResult.score).toBe(0);
    expect(vercel.designResult.adjustments.some((a) => a.ruleId === 'slop_fonts_co_signal')).toBe(
      true
    );
  });

  test('fails if an extractor throws or if a page triggers Heavy slop patterns', () => {
    const heavyHtml = `<!doctype html>
      <html><body data-fonts="Space Grotesk" style="background-color: rgb(250, 246, 238); font-family: 'Space Grotesk', sans-serif;">
        <h1 data-rect="340,120,600,90" style="font-family: 'Space Grotesk', sans-serif; font-size: 76px; text-align: center; letter-spacing: -5px; background-image: linear-gradient(90deg, rgb(99, 102, 241), rgb(236, 72, 153)); -webkit-background-clip: text; background-clip: text;">
          Supercharge your next-generation AI workflow platform today
        </h1>
        <button data-rect="540,240,200,48" style="background-color: rgb(99, 102, 241); color: rgb(255,255,255); box-shadow: 0 10px 32px rgba(139, 92, 246, 0.6);">Get started</button>
      </body></html>`;
    const res = evaluatePioneerSnapshot(heavyHtml);
    expect(res.designResult.tier).toBe('Heavy');
    expect(res.designResult.score).toBeGreaterThanOrEqual(28);
  });

  test('keeps an outer list item, separates a line break, and caps the blocks array', () => {
    const paragraphs = Array.from(
      { length: 220 },
      (_, i) => `<p>Paragraph ${i} stays in the page text.</p>`
    ).join('');
    const html = `<!doctype html><html><body><main>
      <ul><li>Leverage the outer item<ul><li>nested only</li></ul></li></ul>
      <p>seamless<br>workflows</p>
      ${paragraphs}
    </main></body></html>`;
    const { raw } = evaluatePioneerSnapshot(html);
    const text = raw.textContext.text;
    expect(text).toContain('Leverage the outer item');
    expect(text).toContain('nested only');
    expect(text).toContain('seamless workflows');
    expect(text).toContain('Paragraph 219');
    expect(raw.textContext.blocks.length).toBeLessThanOrEqual(200);
    expect(raw.textContext.blocks.every((block) => block.text.length <= 400)).toBe(true);
    const late = raw.textContext.blockSpans.find((span) =>
      raw.textContext.text.slice(span.start, span.end).includes('Paragraph 219')
    );
    expect(late).toBeTruthy();
  });

  test('keeps div copy in order and still checks past the block preview cap', () => {
    const filler = `${'word '.repeat(90)}as an AI language model`;
    const html = `<!doctype html><html><body><main>
      <div class="chat"><div>As an AI language model I cannot fulfill this request</div></div>
      <div>In conclusion, welcome to the weekly planning desk.</div>
      <p>The first note assigns an owner.</p>
      <p>The second note names the date.</p>
      <p>The third note stays specific.</p>
      <p>${filler}</p>
    </main></body></html>`;
    const { raw, copyResult } = evaluatePioneerSnapshot(html);
    const text = raw.textContext.text;
    const chatAt = text.indexOf('cannot fulfill this request');
    const openAt = text.indexOf('In conclusion, welcome');
    const lateAt = text.indexOf('as an AI language model');
    expect(chatAt).toBeGreaterThanOrEqual(0);
    expect(openAt).toBeGreaterThan(chatAt);
    expect(lateAt).toBeGreaterThan(openAt);
    const chatSpan = raw.textContext.blockSpans.find((span) =>
      text.slice(span.start, span.end).includes('cannot fulfill this request')
    );
    expect(chatSpan.inChatDemo).toBe(true);
    const openSpan = raw.textContext.blockSpans.find((span) =>
      text.slice(span.start, span.end).includes('In conclusion, welcome')
    );
    expect(openSpan.inChatDemo).toBe(false);
    expect(raw.textContext.blockSpans.indexOf(openSpan)).toBeLessThan(
      raw.textContext.blockSpans.length - 2
    );
    const residue = copyResult.patterns.find((p) => p.id === 'chatbot_reply_residue');
    const closers = copyResult.patterns.find((p) => p.id === 'formulaic_closers');
    expect(residue.triggered).toBe(true);
    expect(residue.evidence.samples.join(' ')).not.toMatch(/cannot fulfill/i);
    expect(closers.triggered).toBe(false);
  });

  test('keeps nested headings and inline prose in one block', () => {
    const html = `<!doctype html><html><body><main>
      <dl><dd><p>Emoji item lives in the nested paragraph.</p></dd></dl>
      <figure><figcaption><h2>Nested heading</h2><p>Caption paragraph stays separate.</p></figcaption></figure>
      <div><span>The ledger records each</span> <em>settlement before the next</em> <a href="/batch">batch window opens today</a></div>
    </main></body></html>`;
    const { raw } = evaluatePioneerSnapshot(html);
    const ctx = raw.textContext;
    expect(ctx.headings).toContain('Nested heading');
    expect(ctx.paragraphs.some((p) => p.includes('Emoji item lives'))).toBe(true);
    expect(ctx.paragraphs.some((p) => p.includes('Caption paragraph stays separate'))).toBe(true);
    const joined = ctx.text;
    expect(joined.split('Emoji item lives in the nested paragraph').length - 1).toBe(1);
    expect(joined.split('Nested heading').length - 1).toBe(1);
    expect(ctx.proseWordCount).toBeGreaterThanOrEqual(8);
    const prose = ctx.blockSpans.filter((span) =>
      ctx.text.slice(span.start, span.end).includes('ledger records each')
    );
    expect(prose).toHaveLength(1);
  });

  test('keeps an inline quote or chat demo out of ordinary prose', () => {
    const html = `<!doctype html><html><body><main>
      <div><q>As an AI language model I cannot fulfill this request</q></div>
      <div>Intro copy <span class="message">my knowledge cutoff is January</span> and the outro stays here for the team.</div>
      <p>The ledger records each settlement before the next batch window opens today.</p>
    </main></body></html>`;
    const { raw, copyResult } = evaluatePioneerSnapshot(html);
    const text = raw.textContext.text;
    const quote = raw.textContext.blockSpans.find((span) =>
      text.slice(span.start, span.end).includes('cannot fulfill this request')
    );
    const demo = raw.textContext.blockSpans.find((span) =>
      text.slice(span.start, span.end).includes('knowledge cutoff')
    );
    expect(quote.inQuote).toBe(true);
    expect(demo.inChatDemo).toBe(true);
    const residue = copyResult.patterns.find((p) => p.id === 'chatbot_reply_residue');
    expect(residue.triggered).toBe(false);
  });

  test('counts prose across an inline quote instead of per fragment', () => {
    const html = `<!doctype html><html><body><main>
      <div><span>Alpha beta gamma</span> <q>As an AI language model</q> <em>delta epsilon zeta eta</em></div>
    </main></body></html>`;
    const { raw, copyResult } = evaluatePioneerSnapshot(html);
    expect(raw.textContext.proseWordCount).toBeGreaterThanOrEqual(8);
    const residue = copyResult.patterns.find((p) => p.id === 'chatbot_reply_residue');
    expect(residue.triggered).toBe(false);
  });

  test('does not count a chat demo or short labels around a block', () => {
    const demo = Array.from({ length: 150 }, () => 'alpha').join(' ');
    const html = `<!doctype html><html><body><main>
      <div><span class="message">${demo}</span></div>
      <div>Four word label here<p>The ledger records each settlement before the next batch window opens today for the team.</p>Four word label here</div>
    </main></body></html>`;
    const { raw } = evaluatePioneerSnapshot(html);
    expect(raw.textContext.proseWordCount).toBe(15);
  });
});
