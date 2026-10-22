// Workspace installs resolve @slop-detect/core. The published tarball depends
// on slop-detect-core, which is the name core's prepack publishes.
export async function importCore() {
  try {
    return await import('@slop-detect/core');
  } catch (scopedError) {
    try {
      return await import('slop-detect-core');
    } catch {
      throw scopedError;
    }
  }
}
