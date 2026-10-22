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
    description: 'All patterns at their default weights. The canonical score.',
  },
  strict: {
    id: 'strict',
    label: 'Strict',
    description:
      'Only the highest-signal smoking guns (weight ≥ 5). Fewer ' +
      'false positives — good as a hard CI gate.',
    minWeight: 5,
  },
  marketing: {
    id: 'marketing',
    label: 'Marketing / brand',
    description:
      'Brand-surface tells a marketer can act on: fonts, colours, ' +
      'gradients, hero treatment. Skips structural/code-level signals.',
    include: [
      'fonts',
      'colors',
      'images',
      'centered_hero',
      'hero_eyebrow_pill',
      'all_caps_labels',
      'eyebrow_label',
    ],
  },
  minimal: {
    id: 'minimal',
    label: 'Minimal',
    description:
      'The three most-cited dead-giveaways only: slop fonts, ' + 'VibeCode purple, gradient text.',
    only: ['slop_fonts', 'purple_accent', 'gradient_text'],
  },
  editorial: {
    id: 'editorial',
    label: 'Editorial / publication',
    description:
      'Suppresses warm-cream and serif editorial kit signals on genuine editorial publications (D-06, D-13).',
    exclude: ['cream_default_bg', 'editorial_cream_kit'],
  },
  devtool: {
    id: 'devtool',
    label: 'Developer tool / CLI docs',
    description:
      'Suppresses monospace heading and dark-mode signals on developer and CLI documentation sites (D-14).',
    exclude: ['display_mono_heading', 'perma_dark_mode'],
  },
};

function matches(pattern, list) {
  return list.includes(pattern.id) || list.includes(pattern.category);
}

// Filter a pattern array by a preset id (or a preset object). Unknown id →
// returns the full set unchanged (fail-open: never silently drop everything).
export function applyPreset(patterns, presetIdOrObj) {
  const preset = typeof presetIdOrObj === 'string' ? PRESETS[presetIdOrObj] : presetIdOrObj;
  if (!preset || preset.id === 'full') return patterns;

  let out = patterns;
  if (Array.isArray(preset.only)) {
    out = out.filter((p) => preset.only.includes(p.id));
  } else {
    if (Array.isArray(preset.include)) out = out.filter((p) => matches(p, preset.include));
    if (Array.isArray(preset.exclude)) out = out.filter((p) => !matches(p, preset.exclude));
  }
  if (typeof preset.minWeight === 'number') {
    out = out.filter((p) => p.weight >= preset.minWeight);
  }
  return out;
}

export function isPreset(id) {
  return Object.prototype.hasOwnProperty.call(PRESETS, id);
}

// Presets filter the design catalogue. They do not change copy, craft, AEO,
// or DESIGN.md scores. Callers must say so instead of ignoring those axes.
export function presetCoverage(presetId: string, axes: string[] = ['design']) {
  const id = presetId || 'full';
  const requested = [...new Set((axes || []).filter(Boolean))];
  if (!requested.length) requested.push('design');
  if (id === 'full' || !Object.prototype.hasOwnProperty.call(PRESETS, id)) {
    return { applied: requested, notApplied: [] as string[], warning: null as string | null };
  }
  const applied = requested.includes('design') ? ['design'] : [];
  const notApplied = requested.filter((axis) => axis !== 'design');
  return {
    applied,
    notApplied,
    warning: notApplied.length
      ? `Preset ${id} was not applied to: ${notApplied.join(', ')}.`
      : null,
  };
}

export function presetProfiles() {
  return Object.values(PRESETS).map((preset: any) => ({
    id: preset.id,
    label: preset.label,
    description: preset.description,
    design: preset.only
      ? { only: preset.only }
      : preset.include
        ? { include: preset.include }
        : preset.exclude
          ? { exclude: preset.exclude }
          : typeof preset.minWeight === 'number'
            ? { minWeight: preset.minWeight }
            : { weights: 'default' },
    copy: preset.id === 'full' ? 'unchanged' : 'not-applied',
    aeo: preset.id === 'full' ? 'unchanged' : 'not-applied',
    system: preset.id === 'full' ? 'unchanged' : 'not-applied',
    craft: 'never-scored',
  }));
}
