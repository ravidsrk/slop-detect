// Self-contained SARIF writer for the GitHub Action.
// The action cannot import @slop-detect/core on a marketplace runner.
// Help text is the pattern label. Source lines are not invented.
// The canonical report with remediation text lives in packages/core.

function fingerprint(value) {
  let hash = 2166136261;
  const text = String(value);
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function oneLine(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildActionSarif(results = []) {
  const list = Array.isArray(results) ? results : [results];
  const runs = [];
  for (const page of list) {
    if (!page) continue;
    const uri = page.finalUrl || page.url || 'unscanned';
    const rules = new Map();
    const sarifResults = [];
    const unscored = page.blocked || page.error || typeof page.score !== 'number';
    if (unscored) {
      rules.set('scan', {
        id: 'scan',
        name: 'scan',
        shortDescription: { text: 'scan' },
        help: { markdown: 'Scan could not run. This is not a Clean score.' },
        defaultConfiguration: { level: 'error' },
        properties: { axis: 'scan' },
      });
      sarifResults.push({
        ruleId: 'scan',
        level: 'error',
        message: { text: 'Scan could not run. This is not a Clean score.' },
        locations: [{ physicalLocation: { artifactLocation: { uri } } }],
        partialFingerprints: { primaryLocationLineHash: fingerprint(`scan|${uri}`) },
      });
    } else {
      const design = Array.isArray(page.patterns) ? page.patterns : [];
      const copy = Array.isArray(page.axes?.copy?.patterns) ? page.axes.copy.patterns : [];
      for (const pattern of [...design, ...copy]) {
        if (!pattern?.id) continue;
        const level =
          pattern.status === 'review' || pattern.weight === 0
            ? 'warning'
            : pattern.weight >= 6
              ? 'error'
              : 'warning';
        if (!rules.has(pattern.id)) {
          const label = pattern.label || pattern.id;
          rules.set(pattern.id, {
            id: pattern.id,
            name: pattern.short || label,
            shortDescription: { text: oneLine(label) },
            help: { markdown: String(label) },
            defaultConfiguration: { level },
            properties: { axis: pattern.axis || 'design', weight: pattern.weight },
          });
        }
        if (!pattern.triggered) continue;
        const selector =
          pattern?.evidence?.selector ||
          pattern?.evidence?.domPath ||
          pattern?.locations?.[0]?.selector ||
          '';
        const location = { physicalLocation: { artifactLocation: { uri } } };
        if (selector) location.logicalLocations = [{ fullyQualifiedName: selector }];
        sarifResults.push({
          ruleId: pattern.id,
          level,
          message: { text: oneLine(`${pattern.label || pattern.id} (+${pattern.weight})`) },
          locations: [location],
          partialFingerprints: { primaryLocationLineHash: fingerprint(`${pattern.id}|${uri}`) },
        });
      }
    }
    runs.push({
      automationDetails: { id: `slop-detect/${fingerprint(uri)}` },
      properties: { category: uri },
      tool: {
        driver: {
          name: 'slop-detect',
          informationUri: 'https://slop-detect.com',
          rules: [...rules.values()],
        },
      },
      results: sarifResults,
    });
  }
  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs,
  };
}
