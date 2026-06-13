// Declarative slop-rule format + compiler.
//
// WHY: a static fingerprint decays. The moat is a continuously-updated,
// community-sourced ruleset (the eslint/semgrep playbook). Hand-writing an
// imperative `extract(ctx)` browser function for every new pattern is high
// friction and easy to get wrong. A declarative rule lets a contributor
// describe *what* makes an element sloppy (selector + computed-style / text
// conditions + a trigger threshold) and have it compile to the exact same
// `{ id, label, short, category, weight, extract }` pattern object the runners
// already understand.
//
// SERIALIZATION CONSTRAINT: both runners (cli/src/detector.js and
// web/functions/api/scan.js) do `pattern.extract.toString()` and inject the
// source into the page via page.evaluate(). So a compiled `extract` MUST be
// fully self-contained — it cannot close over module-scope variables, because
// .toString() drops the closure. We satisfy this by string-templating the rule
// spec (as a JSON literal) AND the generic evaluator INTO the function body,
// then building it with `new Function('ctx', source)`. The result stringifies
// to a standalone function that runs in any page context with only `ctx`.

// ── The generic in-page evaluator (emitted as source text) ──────────────────
//
// This is written as a plain string (not a real function we reference) so it
// can be inlined verbatim into every compiled extract. It reads `__spec` and
// `ctx` from the surrounding generated scope. Keep it dependency-free and
// browser-safe (no Node globals, no optional chaining on undefined ctx fields
// that may be absent in older runners).
const EVALUATOR_SOURCE = `
  function __match(el, spec) {
    var cs;
    try { cs = getComputedStyle(el); } catch (e) { return false; }
    var conds = spec.when || [];
    for (var i = 0; i < conds.length; i++) {
      var c = conds[i];

      // Text conditions
      if (c.text) {
        var t = (el.textContent || '').trim();
        if (c.text.minLen != null && t.length < c.text.minLen) return false;
        if (c.text.maxLen != null && t.length > c.text.maxLen) return false;
        if (c.text.matches && !(new RegExp(c.text.matches, c.text.flags || '')).test(t)) return false;
        if (c.text.notMatches && (new RegExp(c.text.notMatches, c.text.flags || '')).test(t)) return false;
        continue;
      }

      // Semantic colour/font checks via ctx helpers (purple, dark, midGrey, slopFont)
      if (c.semantic) {
        var prop = c.style || 'color';
        var val = cs[prop];
        if (c.semantic === 'purple') { if (!ctx.isPurple(ctx.parseColor(val))) return false; continue; }
        if (c.semantic === 'dark')   { if (!ctx.isDark(ctx.parseColor(val)))   return false; continue; }
        if (c.semantic === 'midGrey'){ if (!ctx.isMidGrey(ctx.parseColor(val)))return false; continue; }
        if (c.semantic === 'slopFont'){ if (!ctx.isSlopFont(val))              return false; continue; }
        return false;
      }

      // Computed-style conditions
      if (c.style) {
        var raw = cs[c.style];
        if (raw == null) return false;
        if (c.equals != null && raw !== c.equals) return false;
        if (c.includes != null && String(raw).indexOf(c.includes) === -1) return false;
        if (c.matches && !(new RegExp(c.matches, c.flags || '')).test(String(raw))) return false;
        if (c.oneOf && c.oneOf.indexOf(raw) === -1) return false;
        if (c.gte != null || c.lte != null) {
          var num = parseFloat(raw);
          if (isNaN(num)) return false;
          if (c.gte != null && num < c.gte) return false;
          if (c.lte != null && num > c.lte) return false;
        }
        continue;
      }
    }
    return true;
  }

  function __scopeEls(spec) {
    if (spec.scope && spec.scope.selector) {
      try { return Array.prototype.slice.call(document.querySelectorAll(spec.scope.selector)); }
      catch (e) { return []; }
    }
    // default: the visible-element set the runner already computed
    var els = ctx.visible || [];
    if (spec.scope && spec.scope.heroOnly && ctx.inHero) {
      els = els.filter(function (e) { try { return ctx.inHero(e); } catch (_) { return false; } });
    }
    return els;
  }

  var __els = __scopeEls(__spec);
  var __count = 0, __samples = [], __total = __els.length;
  for (var __i = 0; __i < __els.length; __i++) {
    if (__match(__els[__i], __spec)) {
      __count++;
      if (__samples.length < 3) {
        var __s = (__els[__i].textContent || '').trim().slice(0, 40);
        if (__s) __samples.push(__s);
      }
    }
  }
  var __trig = __spec.trigger || { minCount: 1 };
  var __triggered = false;
  if (__trig.minCount != null && __count >= __trig.minCount) __triggered = true;
  if (__trig.minRatio != null && __total > 0 && (__count / __total) >= __trig.minRatio) __triggered = true;
  return { count: __count, total: __total, samples: __samples, triggered: __triggered };
`;

// Valid top-level categories (kept in sync with the imperative patterns).
const VALID_CATEGORIES = new Set(['fonts', 'colors', 'layout', 'css', 'images', 'copy']);

// ── Validation ──────────────────────────────────────────────────────────────
// Returns an array of human-readable problems. Empty array = valid.
export function validateRule(rule) {
  const errs = [];
  if (!rule || typeof rule !== 'object') return ['rule must be an object'];
  if (!rule.id || !/^[a-z0-9_]+$/.test(rule.id)) errs.push('id required, lowercase snake_case');
  if (!rule.label) errs.push('label required');
  if (!rule.short) errs.push('short required');
  if (typeof rule.weight !== 'number' || rule.weight < 0 || rule.weight > 40) {
    errs.push('weight required (number 0–40)');
  }
  if (rule.category && !VALID_CATEGORIES.has(rule.category)) {
    errs.push(`category must be one of: ${[...VALID_CATEGORIES].join(', ')}`);
  }
  const d = rule.detect;
  if (!d || typeof d !== 'object') {
    errs.push('detect block required');
  } else {
    if (!Array.isArray(d.when) || d.when.length === 0)
      errs.push('detect.when must be a non-empty array');
    if (d.trigger && d.trigger.minCount == null && d.trigger.minRatio == null) {
      errs.push('detect.trigger needs minCount or minRatio');
    }
  }
  return errs;
}

// ── Compiler ─────────────────────────────────────────────────────────────────
// Turn a declarative rule into the imperative pattern object the runners use.
// Throws on an invalid rule (fail fast — a broken rule must never silently
// score 0 for every page).
export function compileRule(rule) {
  const errs = validateRule(rule);
  if (errs.length) {
    throw new Error(`Invalid slop rule "${rule && rule.id}": ${errs.join('; ')}`);
  }

  // Embed the detect spec as a JSON literal, then the evaluator source. The
  // resulting function is fully self-contained → safe to .toString() + inject.
  const specLiteral = JSON.stringify(rule.detect);
  const body = `var __spec = ${specLiteral};\n${EVALUATOR_SOURCE}`;
  // eslint-disable-next-line no-new-func
  const extract = new Function('ctx', body);

  return {
    id: rule.id,
    label: rule.label,
    short: rule.short,
    category: rule.category || 'layout',
    weight: rule.weight,
    // Provenance — surfaced in metadata so contributors get attribution.
    declarative: true,
    author: rule.author || null,
    since: rule.since || null,
    extract,
  };
}

// Compile a list, in order. Mixed lists (some declarative, some already
// imperative pattern objects) are allowed: anything with a function `extract`
// is passed through untouched; anything with a `detect` block is compiled.
export function compileRules(rules) {
  return rules.map((r) => (typeof r.extract === 'function' ? r : compileRule(r)));
}
