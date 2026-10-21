// W-01 (#307): schema identity for a scan document. This is the JSON Schema
// major version (schemas/scan-result.v1.json). It is not a product version
// and it does not change a score.

export const SCAN_SCHEMA_VERSION = 1;

// Add schemaVersion when a runner omitted it. Nested AEO reports get the same
// stamp. The function mutates the object it is given and returns it.
export function stampScanResult<T>(doc: T): T {
  if (!doc || typeof doc !== 'object') return doc;
  if (Array.isArray(doc)) {
    for (const item of doc) stampScanResult(item);
    return doc;
  }
  const rec = doc as Record<string, any>;
  if (rec.schemaVersion == null) rec.schemaVersion = SCAN_SCHEMA_VERSION;
  if (rec.aeo && typeof rec.aeo === 'object') stampScanResult(rec.aeo);
  return doc;
}
