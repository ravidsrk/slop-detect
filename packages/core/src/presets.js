// Named scoring presets.
//
// WHY: not every audience cares about the same tells. A marketing team wants to
// know if the *brand* reads as generic (fonts, purple, gradients), while a
// design-systems reviewer wants the full fingerprint, and a minimal/strict gate
// in CI wants only the highest-signal smoking guns. Presets let CLI + API
// callers select a curated subset/weighting without forking the ruleset.
//
// A preset is { id, label, description, include?, exclude?, only? } where:
//   only    — exact allow-list of pattern ids (overrides include/exclude)
//   include — category or id allow-list (default: all)
//   exclude — category or id deny-list (applied after include)
// Matching is by pattern `id` OR `category`.

export const PRESETS = {
  full: {
    id: 'full',
    label: 'Full fingerprint',
    description: 'All patterns at their default weights. The canonical score.'
  },
  strict: {
    id: 'strict',
    label: 'Strict',
    description: 'Only the highest-signal smoking guns (weight ≥ 5). Fewer ' +
      'false positives — good as a hard CI gate.',
    minWeight: 5
  },
  marketing: {
    id: 'marketing',
    label: 'Marketing / brand',
    description: 'Brand-surface tells a marketer can act on: fonts, colours, ' +
      'gradients, hero treatment. Skips structural/code-level signals.',
    include: ['fonts', 'colors', 'images', 'centered_hero', 'hero_eyebrow_pill', 'all_caps_labels']
  },
  minimal: {
    id: 'minimal',
    label: 'Minimal',
    description: 'The three most-cited dead-giveaways only: slop fonts, ' +
      'VibeCode purple, gradient text.',
    only: ['slop_fonts', 'purple_accent', 'gradient_text']
  }
};

function matches(pattern, list) {
  return list.includes(pattern.id) || list.includes(pattern.category);
}

// Filter a pattern array by a preset id (or a preset object). Unknown id →
// returns the full set unchanged (fail-open: never silently drop everything).
export function applyPreset(patterns, presetIdOrObj) {
  const preset = typeof presetIdOrObj === 'string'
    ? PRESETS[presetIdOrObj]
    : presetIdOrObj;
  if (!preset || preset.id === 'full') return patterns;

  let out = patterns;
  if (Array.isArray(preset.only)) {
    out = out.filter(p => preset.only.includes(p.id));
  } else {
    if (Array.isArray(preset.include)) out = out.filter(p => matches(p, preset.include));
    if (Array.isArray(preset.exclude)) out = out.filter(p => !matches(p, preset.exclude));
  }
  if (typeof preset.minWeight === 'number') {
    out = out.filter(p => p.weight >= preset.minWeight);
  }
  return out;
}

export function isPreset(id) {
  return Object.prototype.hasOwnProperty.call(PRESETS, id);
}
