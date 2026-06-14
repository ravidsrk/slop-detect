// Barrel for the Pages Functions' shared helpers.
//
// The implementation used to live here as one ~800-line file mixing four
// unrelated concerns. It's now split by concern, and this file just re-exports
// them so existing imports (`from '../_shared.js'`) keep working unchanged:
//
//   _util.js    — ids, domain normalization, email check, tier ranking
//   _ssrf.js    — the scan-URL SSRF guard (private/loopback/internal blocking)
//   _data.js    — RESULTS KV: results, watches, tokens, history, stats, listings
//   _render.js  — tier colors, badge SVG, share-card HTML, HTML/XML escaping
//
// Prefer importing from the specific module in new code; this barrel is kept for
// the existing call sites and convenience.
export * from './_util.js';
export * from './_ssrf.js';
export * from './_data.js';
export * from './_render.js';
