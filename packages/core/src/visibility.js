// Visible-element collection. Skips display:none, visibility:hidden, opacity:0,
// elements smaller than 4px in either dimension, and elements positioned
// completely off-screen.

export function createVisibilityHelpers() {
  function isVisible(el) {
    if (!el || !(el instanceof Element)) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (parseFloat(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    return true;
  }

  function getVisible(root, max) {
    root = root || document.body;
    max = max || 4000;
    const out = [];
    const all = root.querySelectorAll('*');
    for (let i = 0; i < all.length && out.length < max; i++) {
      if (isVisible(all[i])) out.push(all[i]);
    }
    return out;
  }

  function inViewport(el) {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0 && r.left < window.innerWidth && r.right > 0;
  }

  function inHero(el) {
    const r = el.getBoundingClientRect();
    return r.top < 900 && r.top > -100;
  }

  return { isVisible, getVisible, inViewport, inHero };
}
