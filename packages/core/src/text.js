// Serializable in-page text extractor for the copy-slop axis.
//
// Like the design-pattern extracts, this function is stringified and injected
// into the page via page.evaluate() so it runs in the DOM context. It returns a
// plain text-context object that the (Node/Worker-side) copy patterns consume.
// Keep it self-contained: no closures over module scope, browser-safe only.
//
// We deliberately read RENDERED text (innerText-ish) from the main content
// region, skipping nav/footer/script/style chrome, so buzzword density reflects
// the actual marketing prose rather than menu labels.
export function extractTextContext() {
  function visibleText(root) {
    if (!root) return '';
    // innerText respects visibility + line breaks; fall back to textContent.
    var t = root.innerText != null ? root.innerText : root.textContent;
    return (t || '').replace(/\u00AD/g, ''); // strip soft hyphens
  }

  // Prefer <main> / <article> / role=main, else body minus obvious chrome.
  var main = document.querySelector('main, article, [role="main"]') || document.body;

  // Clone so we can strip chrome without touching the live page.
  var clone = main.cloneNode(true);
  var strip = clone.querySelectorAll('nav, footer, header, script, style, noscript, svg, code, pre, [aria-hidden="true"]');
  for (var i = 0; i < strip.length; i++) {
    if (strip[i].parentNode) strip[i].parentNode.removeChild(strip[i]);
  }

  var text = visibleText(clone).trim();

  // Headings + paragraph-ish blocks for structural copy tells (emoji bullets).
  var headings = [];
  var hs = clone.querySelectorAll('h1, h2, h3, h4, li, dt');
  for (var j = 0; j < hs.length && headings.length < 200; j++) {
    var ht = (hs[j].innerText || hs[j].textContent || '').trim();
    if (ht) headings.push(ht.slice(0, 200));
  }
  var paragraphs = [];
  var ps = clone.querySelectorAll('p');
  for (var k = 0; k < ps.length && paragraphs.length < 200; k++) {
    var pt = (ps[k].innerText || ps[k].textContent || '').trim();
    if (pt) paragraphs.push(pt.slice(0, 400));
  }

  var words = text ? text.split(/\s+/).filter(Boolean) : [];

  return {
    text: text.slice(0, 200000),  // cap to keep payloads sane
    headings: headings,
    paragraphs: paragraphs,
    wordCount: words.length
  };
}
