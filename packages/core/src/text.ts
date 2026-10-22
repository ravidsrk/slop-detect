// Serializable in-page text extractor (FIX-12 #232, C-01 #265) +
// Normalize-before-match text view with offset map (C-12 #275).
//
// extractTextContext() is stringified and injected into the page via
// buildPageScript(), so it MUST be 100% self-contained (no module closures).

export function extractTextContext() {
  var root = document.querySelector('main, article, [role="main"]') || document.body;
  if (!root) {
    return {
      text: '',
      headings: [],
      paragraphs: [],
      blocks: [],
      blockSpans: [],
      proseWordCount: 0,
      wordCount: 0,
      hiddenBlocks: 0,
      lang: '',
      links: [],
      attributes: [],
      testimonials: [],
    };
  }

  var SKIP_TAGS =
    /^(NAV|FOOTER|HEADER|SCRIPT|STYLE|NOSCRIPT|SVG|CODE|PRE|KBD|SAMP|TEXTAREA|TEMPLATE)$/i;
  var BLOCK_TAGS = /^(P|H1|H2|H3|H4|H5|H6|LI|DT|DD|BLOCKQUOTE|FIGCAPTION)$/i;
  var PROSE_TAGS = /^(P|LI|BLOCKQUOTE|DD)$/i;
  var hiddenBlocks = 0;

  function isElementHidden(el: any): boolean {
    var cur = el;
    var guard = 0;
    while (cur && cur.nodeType === 1 && guard++ < 40) {
      if (SKIP_TAGS.test(cur.tagName)) return true;
      if (cur.hasAttribute('hidden') || cur.getAttribute('aria-hidden') === 'true') return true;
      if (cur.tagName !== 'SUMMARY') {
        var parentDetails =
          cur.parentElement && cur.parentElement.closest
            ? cur.parentElement.closest('details:not([open])')
            : null;
        if (parentDetails) return true;
      }
      var idCls = ((cur.id || '') + ' ' + (cur.className || '')).toLowerCase();
      if (/\b(?:cookie-banner|cookie-consent|consent-banner|gdpr-banner)\b/.test(idCls))
        return true;
      var cs = getComputedStyle(cur);
      if (
        cs.display === 'none' ||
        cs.visibility === 'hidden' ||
        cs.visibility === 'collapse' ||
        parseFloat(cs.opacity || '1') <= 0.01
      ) {
        return true;
      }
      cur = cur.parentElement;
    }
    return false;
  }

  function extractCleanNodeText(node: any, ownOnly?: boolean): string {
    if (!node) return '';
    if (node.nodeType === 3) {
      return (node.nodeValue || '').replace(/\u00AD/g, '');
    }
    if (node.nodeType !== 1) return '';
    if (SKIP_TAGS.test(node.tagName)) return '';
    if (node.hasAttribute('hidden') || node.getAttribute('aria-hidden') === 'true') {
      if ((node.textContent || '').trim()) hiddenBlocks++;
      return '';
    }
    if (node.tagName === 'DETAILS' && !node.hasAttribute('open')) {
      var sum = node.querySelector('summary');
      return sum ? extractCleanNodeText(sum) : '';
    }
    var cs = getComputedStyle(node);
    if (
      cs.display === 'none' ||
      cs.visibility === 'hidden' ||
      cs.visibility === 'collapse' ||
      parseFloat(cs.opacity || '1') <= 0.01
    ) {
      if ((node.textContent || '').trim()) hiddenBlocks++;
      return '';
    }
    var out = '';
    var kids = node.childNodes;
    for (var i = 0; i < kids.length; i++) {
      var kid = kids[i];
      // A list item or quote keeps its own words. Nested candidates are
      // scored separately, so their text is not folded into the parent.
      if (ownOnly && kid && kid.nodeType === 1 && /^(P|LI|BLOCKQUOTE)$/.test(kid.tagName)) {
        if (out && !/\s$/.test(out)) out += ' ';
        continue;
      }
      if (kid && kid.nodeType === 1 && (kid.tagName === 'BR' || BLOCK_TAGS.test(kid.tagName))) {
        if (out && !/\s$/.test(out)) out += ' ';
      }
      out += extractCleanNodeText(kid, ownOnly);
    }
    return out;
  }

  var vh = window.innerHeight || 900;
  var blocks: Array<{
    tag: string;
    text: string;
    wordCount: number;
    inHero: boolean;
    inFooter: boolean;
    inQuote: boolean;
    inChatDemo: boolean;
    nodeId: string;
    start: number;
    end: number;
  }> = [];
  var blockSpans: Array<{
    tag: string;
    start: number;
    end: number;
    inHero: boolean;
    inFooter: boolean;
    inQuote: boolean;
    inChatDemo: boolean;
  }> = [];
  var headings: string[] = [];
  var paragraphs: string[] = [];
  var proseWordCount = 0;
  var textParts: string[] = [];
  var joinedLen = 0;
  var BLOCK_LIMIT = 200;
  var BLOCK_TEXT_LIMIT = 400;
  var SPAN_LIMIT = 2000;
  var CANDIDATE = /^(H1|H2|H3|H4|H5|H6|P|LI|DT|DD|BLOCKQUOTE|FIGCAPTION)$/;

  function contextFlags(el: any) {
    var rect = el.getBoundingClientRect ? el.getBoundingClientRect() : { top: 0 };
    var anc = el.closest
      ? el.closest(
          '[class*="chat"], [class*="message"], [class*="bubble"], [class*="transcript"], [class*="conversation"], [class*="demo"]'
        )
      : null;
    return {
      inHero: rect.top < vh * 0.9,
      inFooter: Boolean(el.closest && el.closest('footer, [role="contentinfo"]')),
      inQuote: Boolean(el.closest && el.closest('blockquote, q')),
      inChatDemo: Boolean(anc),
      top: Math.round(rect.top || 0),
    };
  }

  function appendPart(rawTxt: string) {
    var start = joinedLen;
    if (textParts.length) {
      joinedLen += 2;
      start = joinedLen;
    }
    textParts.push(rawTxt);
    joinedLen += rawTxt.length;
    return { start: start, end: joinedLen };
  }

  function emitPiece(tag: string, rawTxt: string, el: any) {
    if (!rawTxt) return;
    var wList = rawTxt.split(/\s+/).filter(Boolean);
    var wc = wList.length;
    var flags = contextFlags(el);
    var span = appendPart(rawTxt);
    if (blockSpans.length < SPAN_LIMIT) {
      blockSpans.push({
        tag: tag,
        start: span.start,
        end: span.end,
        inHero: flags.inHero,
        inFooter: flags.inFooter,
        inQuote: flags.inQuote,
        inChatDemo: flags.inChatDemo,
      });
    }
    if (blocks.length < BLOCK_LIMIT) {
      var stored = rawTxt.slice(0, BLOCK_TEXT_LIMIT);
      blocks.push({
        tag: tag,
        text: stored,
        wordCount: stored.split(/\s+/).filter(Boolean).length,
        inHero: flags.inHero,
        inFooter: flags.inFooter,
        inQuote: flags.inQuote,
        inChatDemo: flags.inChatDemo,
        nodeId: tag + ':' + flags.top + ':' + rawTxt.slice(0, 20),
        start: span.start,
        end: span.end,
      });
    }
    if (/^(h1|h2|h3|h4|li|dt)$/.test(tag) && headings.length < 200) {
      headings.push(rawTxt.slice(0, 200));
    }
    if (tag === 'p' && paragraphs.length < 200) {
      paragraphs.push(rawTxt.slice(0, 400));
    }
    if ((PROSE_TAGS.test(tag) || tag === 'div') && wc >= 8 && !flags.inChatDemo) {
      proseWordCount += wc;
    }
  }

  function walkNestedCandidates(node: any) {
    if (!node || node.nodeType !== 1 || isElementHidden(node)) return;
    if (SKIP_TAGS.test(node.tagName)) return;
    if (CANDIDATE.test(node.tagName)) {
      walk(node);
      return;
    }
    var kids = node.childNodes;
    for (var i = 0; i < kids.length; i++) {
      if (kids[i] && kids[i].nodeType === 1) walkNestedCandidates(kids[i]);
    }
  }

  function walk(node: any) {
    if (!node || node.nodeType !== 1) return;
    if (isElementHidden(node)) {
      if ((node.textContent || '').trim()) hiddenBlocks++;
      return;
    }
    if (SKIP_TAGS.test(node.tagName)) return;
    if (CANDIDATE.test(node.tagName)) {
      var ownOnly = node.tagName === 'LI' || node.tagName === 'BLOCKQUOTE';
      var rawTxt = extractCleanNodeText(node, ownOnly)
        .replace(/[ \t]+/g, ' ')
        .trim();
      emitPiece(node.tagName.toLowerCase(), rawTxt, node);
      if (!ownOnly) return;
      var nested = node.childNodes;
      for (var n = 0; n < nested.length; n++) {
        var kid = nested[n];
        if (!kid || kid.nodeType !== 1) continue;
        if (/^(P|LI|BLOCKQUOTE)$/.test(kid.tagName)) walk(kid);
        else walkNestedCandidates(kid);
      }
      return;
    }
    var buf = '';
    var kids = node.childNodes;
    for (var c = 0; c < kids.length; c++) {
      var child = kids[c];
      if (!child) continue;
      if (child.nodeType === 3) {
        if (child.nodeValue) buf += child.nodeValue;
      } else if (child.nodeType === 1) {
        flushBuf();
        walk(child);
      }
    }
    flushBuf();
    function flushBuf() {
      var piece = buf
        .replace(/[ \t]+/g, ' ')
        .replace(/\s*\n\s*/g, '\n')
        .trim();
      buf = '';
      if (piece) emitPiece('div', piece, node);
    }
  }

  walk(root);

  // Page text stays the full candidate text. Preview blocks stay capped.
  // blockSpans point into that text so a copy check can read past the cap.
  var text = textParts.join('\n\n');
  if (!text && !isElementHidden(root)) {
    text = extractCleanNodeText(root).trim();
  }
  var allWords = text ? text.split(/\s+/).filter(Boolean) : [];
  if (proseWordCount === 0 && allWords.length > 0 && blocks.length === 0) {
    proseWordCount = allWords.length;
  }

  // Collect links for C-04 (ai_referral_utm_links) and C-02
  var links: Array<{ href: string; text: string }> = [];
  var aEls = document.querySelectorAll('a[href]');
  for (var aIdx = 0; aIdx < aEls.length && links.length < 300; aIdx++) {
    var aEl = aEls[aIdx] as any;
    var href = aEl.getAttribute('href') || '';
    if (href) {
      links.push({ href: href, text: (aEl.textContent || '').trim().slice(0, 100) });
    }
  }

  // Collect attributes (href, src, srcset, data-*) for C-02 markup leaks
  var attributes: Array<{ tag: string; attr: string; value: string }> = [];
  var allEls = root.querySelectorAll('*');
  for (var eIdx = 0; eIdx < allEls.length && eIdx < 1000 && attributes.length < 300; eIdx++) {
    var domEl = allEls[eIdx] as any;
    if (!domEl.attributes) continue;
    for (var atIdx = 0; atIdx < domEl.attributes.length; atIdx++) {
      var at = domEl.attributes[atIdx];
      if (!at || !at.name || !at.value) continue;
      if (/^(?:href|src|srcset|data-[a-z0-9_-]+)$/i.test(at.name)) {
        if (at.value.length >= 4 && at.value.length <= 500) {
          attributes.push({ tag: domEl.tagName.toLowerCase(), attr: at.name, value: at.value });
        }
      }
    }
  }

  var lang = (document.documentElement && document.documentElement.getAttribute('lang')) || '';

  return {
    text: text.slice(0, 200000),
    headings: headings,
    paragraphs: paragraphs,
    blocks: blocks,
    blockSpans: blockSpans,
    proseWordCount: proseWordCount,
    wordCount: allWords.length,
    hiddenBlocks: hiddenBlocks,
    lang: lang.trim(),
    links: links,
    attributes: attributes,
  };
}

// ── C-12 (#275): Normalize-before-match text view + offset map ───────────────
// Curated 47-entry Latin <-> Cyrillic / Greek homoglyph confusable map.
export const CONFUSABLE_MAP: Record<string, string> = {
  '\u0430': 'a', // Cyrillic small a
  '\u0435': 'e', // Cyrillic small ie
  '\u043E': 'o', // Cyrillic small o
  '\u0440': 'p', // Cyrillic small er
  '\u0441': 'c', // Cyrillic small es
  '\u0443': 'y', // Cyrillic small u
  '\u0445': 'x', // Cyrillic small ha
  '\u0456': 'i', // Cyrillic small byelorussian-ukrainian i
  '\u0458': 'j', // Cyrillic small je
  '\u0455': 's', // Cyrillic small dze
  '\u04BB': 'h', // Cyrillic small shha
  '\u0501': 'd', // Cyrillic small komi de
  '\u051B': 'q', // Cyrillic small qa
  '\u051D': 'w', // Cyrillic small we
  '\u0410': 'A', // Cyrillic capital A
  '\u0412': 'B', // Cyrillic capital VE
  '\u0421': 'C', // Cyrillic capital ES
  '\u0415': 'E', // Cyrillic capital IE
  '\u041D': 'H', // Cyrillic capital EN
  '\u0406': 'I', // Cyrillic capital I
  '\u0408': 'J', // Cyrillic capital JE
  '\u041A': 'K', // Cyrillic capital KA
  '\u041C': 'M', // Cyrillic capital EM
  '\u041E': 'O', // Cyrillic capital O
  '\u0420': 'P', // Cyrillic capital ER
  '\u0405': 'S', // Cyrillic capital DZE
  '\u0422': 'T', // Cyrillic capital TE
  '\u0425': 'X', // Cyrillic capital HA
  '\u04AE': 'Y', // Cyrillic capital straight U
  '\u03B1': 'a', // Greek small alpha
  '\u03B5': 'e', // Greek small epsilon
  '\u03B9': 'i', // Greek small iota
  '\u03BA': 'k', // Greek small kappa
  '\u03BD': 'v', // Greek small nu
  '\u03BF': 'o', // Greek small omicron
  '\u03C1': 'p', // Greek small rho
  '\u03C4': 't', // Greek small tau
  '\u03C5': 'u', // Greek small upsilon
  '\u03C7': 'x', // Greek small chi
  '\u0391': 'A', // Greek capital Alpha
  '\u0392': 'B', // Greek capital Beta
  '\u0395': 'E', // Greek capital Epsilon
  '\u0397': 'H', // Greek capital Eta
  '\u0399': 'I', // Greek capital Iota
  '\u039A': 'K', // Greek capital Kappa
  '\u039C': 'M', // Greek capital Mu
  '\u039D': 'N', // Greek capital Nu
  '\u039F': 'O', // Greek capital Omicron
  '\u03A1': 'P', // Greek capital Rho
  '\u03A4': 'T', // Greek capital Tau
  '\u03A7': 'X', // Greek capital Chi
};

export interface NormalizedTextView {
  original: string;
  normalized: string;
  /** Maps each code unit index in `normalized` to its start index in `original`. */
  normToOrigStart: number[];
  /** Maps each code unit index in `normalized` to its end index (exclusive) in `original`. */
  normToOrigEnd: number[];
  confusablesFolded: number;
  invisiblesStripped: number;
}

export function buildNormalizedTextView(input: string): NormalizedTextView {
  const original = String(input || '');
  const normChars: string[] = [];
  const normToOrigStart: number[] = [];
  const normToOrigEnd: number[] = [];
  let confusablesFolded = 0;
  let invisiblesStripped = 0;

  let i = 0;
  let lastWasSpace = false;
  while (i < original.length) {
    const cp = original.codePointAt(i)!;
    const charLen = cp > 0xffff ? 2 : 1;
    const rawCh = original.slice(i, i + charLen);
    const origStart = i;
    const origEnd = i + charLen;
    i += charLen;

    // Strip zero-width & Tag characters (U+200B..U+200D, U+2060, U+FEFF, U+00AD, U+E0000..U+E007F)
    if (
      cp === 0x200b ||
      cp === 0x200c ||
      cp === 0x200d ||
      cp === 0x2060 ||
      cp === 0xfeff ||
      cp === 0x00ad ||
      (cp >= 0xe0000 && cp <= 0xe007f)
    ) {
      invisiblesStripped++;
      // Attach stripped invisible span to previous emitted character's end if adjacent
      if (normToOrigEnd.length > 0 && !lastWasSpace) {
        normToOrigEnd[normToOrigEnd.length - 1] = origEnd;
      }
      continue;
    }

    // Collapse horizontal whitespace runs (preserve \n for line-based rules)
    if (rawCh === ' ' || rawCh === '\t' || cp === 0x00a0 || cp === 0x202f) {
      if (lastWasSpace) {
        if (normToOrigEnd.length > 0) {
          normToOrigEnd[normToOrigEnd.length - 1] = origEnd;
        }
        continue;
      }
      normChars.push(' ');
      normToOrigStart.push(origStart);
      normToOrigEnd.push(origEnd);
      lastWasSpace = true;
      continue;
    }
    lastWasSpace = false;

    // Fold confusables, then apply NFKC
    let mapped = CONFUSABLE_MAP[rawCh];
    if (mapped) {
      confusablesFolded++;
    } else {
      mapped = rawCh.normalize('NFKC');
    }

    for (let k = 0; k < mapped.length; k++) {
      normChars.push(mapped[k]);
      normToOrigStart.push(origStart);
      normToOrigEnd.push(origEnd);
    }
  }

  return {
    original,
    normalized: normChars.join(''),
    normToOrigStart,
    normToOrigEnd,
    confusablesFolded,
    invisiblesStripped,
  };
}

// Extract the byte-identical original span corresponding to [normStart, normEnd) in `view.normalized`.
export function extractOriginalSpan(
  view: NormalizedTextView,
  normStart: number,
  normEnd: number
): string {
  if (!view || normEnd <= normStart || view.normToOrigStart.length === 0) return '';
  const clampedStart = Math.max(0, Math.min(view.normToOrigStart.length - 1, normStart));
  const clampedEnd = Math.max(0, Math.min(view.normToOrigEnd.length - 1, normEnd - 1));
  const origStart = view.normToOrigStart[clampedStart];
  const origEnd = view.normToOrigEnd[clampedEnd];
  return view.original.slice(origStart, origEnd);
}
