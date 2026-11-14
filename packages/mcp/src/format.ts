// The text an agent reads back from each tool. The formatters live in
// @slop-detect/core so the npm server and the hosted endpoint print the same
// summaries; these names are kept for existing importers.

export {
  formatScanSummary as formatScan,
  formatAeoSummary as formatAeo,
  formatSystemSummary as formatSystem,
  formatScanFailure,
  formatDesignMdLint,
  formatDesignMdDiff,
  compactScanResult,
  compactAeoReport,
} from '@slop-detect/core';
