// Monitoring sweep — re-scan watched domains and alert on a NEW regression.
//
// Pure orchestration: all I/O (listing watches, scanning, persisting, sending)
// is injected, so the decision logic is unit-tested without KV/browser/email.
//
// How it stays correct:
//   • Only VERIFIED watches are processed (double-opt-in consent gate).
//   • Re-scanning a watched domain runs recordScanForWatch inside the scan,
//     which updates history + recomputes `regressed` and resets `notified=false`
//     when the page is healthy again.
//   • We alert only when regressed && verified && !notified, then set
//     notified=true — so each regression pages the owner exactly once, and a
//     recovery re-arms it.

export async function monitorSweep({ watches, scanDomain, getWatch, putWatch, sendAlert, max = 50 }) {
  const summary = { considered: 0, scanned: 0, alerted: 0, skippedUnverified: 0, errors: 0 };
  let processed = 0;

  for (const w of watches || []) {
    if (processed >= max) break;
    if (!w || !w.domain) continue;
    if (!w.verified) { summary.skippedUnverified++; continue; }
    processed++;
    summary.considered++;
    try {
      // Re-scan — this updates the watch (history + regressed flag) as a side
      // effect via recordScanForWatch on the scan path.
      await scanDomain(w.domain);
      summary.scanned++;

      const fresh = await getWatch(w.domain);
      if (fresh && fresh.regressed && fresh.verified && !fresh.notified) {
        const res = await sendAlert(fresh);
        if (res && res.sent) {
          fresh.notified = true;
          await putWatch(fresh);
          summary.alerted++;
        }
      }
    } catch (_) {
      summary.errors++;
    }
  }
  return summary;
}
