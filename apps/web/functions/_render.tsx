/** @jsxRuntime automatic @jsxImportSource hono/jsx */
// Presentation helpers: HTML/XML escaping and the JSON-for-<script> serializer.
//
// The tier→color resolver now lives in _theme.ts; this file re-exports `tierColors`
// so existing callers (`import { tierColors } from '../_shared.js'`) keep working
// unchanged. The self-rendered badge SVG moved to _badge.tsx (owned by task 12) and
// the share-card HTML moved to _card.tsx (owned by task 13), so those restyle tasks
// do not have to touch this file.

// Re-export the centralized tier color resolver for the existing call sites.
export { tierColors } from './_theme.js';

// ── escaping ──────────────────────────────────────────────────────────────────
export function escapeHtml(s) {
  return String(s == null ? '' : s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c]
  );
}

export function escapeXml(s) {
  return String(s == null ? '' : s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[c]
  );
}

// Serialize a value as JSON that is safe to embed inside an HTML <script> — both
// inline JS (`const x = ${jsonForScript(v)}`) and JSON-LD blocks. JSON.stringify
// does NOT escape `<`, so a value containing `</script>` (or `<!--`) would break
// out of the element and become live markup. Escaping `<`/`>`/`&` to their \u
// forms (still valid JSON and JS) closes that, plus the U+2028 / U+2029 JS line
// separators (legal in JSON strings but not in JS source).
const LINE_SEP = new RegExp(String.fromCharCode(0x2028), 'g');
const PARA_SEP = new RegExp(String.fromCharCode(0x2029), 'g');
export function jsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(LINE_SEP, '\\u2028')
    .replace(PARA_SEP, '\\u2029');
}
