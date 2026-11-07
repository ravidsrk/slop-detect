// Monitoring sweep — re-scan watched domains and alert on a NEW regression.
//
// Pure orchestration: all I/O (listing watches, scanning, persisting, sending)
// is injected, so the decision logic is unit-tested without KV/browser/email.
//
// How it stays correct:
//   • Only VERIFIED watches are processed (double-opt-in consent gate).
//   • Re-scanning a watched domain runs recordScanForWatch inside the scan,
//     which updates history + recomputes `regressed` / `systemRegressed` and
//     resets the matching `notified` flag when the page is healthy again.
//   • Each alert fires once per event and a recovery re-arms it:
//       slop regression  → regressed && !notified         → sendAlert
//       system drift     → systemRegressed && !systemNotified → sendDriftAlert
//     (Roadmap v2 P2a: the system-drift alert is the agency value proposition.)
//
// `scanDomain` receives the WHOLE watch so the caller can request the system
// axis only for watches that opted into it (watch.system).

export async function monitorSweep({
  watches,
  scanDomain,
  getWatch,
  putWatch,
  sendAlert,
  sendDriftAlert,
  sendWebhook,
  max = 50,
}: any) {
  const summary = {
    considered: 0,
    scanned: 0,
    alerted: 0,
    driftAlerted: 0,
    webhookSent: 0,
    skippedUnverified: 0,
    errors: 0,
  };
  let processed = 0;

  for (const w of watches || []) {
    if (processed >= max) break;
    if (!w || !w.domain) continue;
    if (!w.verified) {
      summary.skippedUnverified++;
      continue;
    }
    processed++;
    summary.considered++;
    try {
      // Re-scan — this updates the watch (history + regression flags) as a side
      // effect via recordScanForWatch on the scan path.
      await scanDomain(w);
      summary.scanned++;

      const fresh = await getWatch(w.domain);
      if (!fresh || !fresh.verified) continue;
      let dirty = false;

      if (fresh.regressed && !fresh.notified) {
        const res = await sendAlert(fresh);
        if (res && res.sent) {
          fresh.notified = true;
          dirty = true;
          summary.alerted++;
        }
        if (typeof sendWebhook === 'function' && fresh.webhookUrl && !fresh.webhookDisabled) {
          try {
            const wh = await sendWebhook(fresh, 'slop_regression');
            if (wh && wh.sent) {
              fresh.webhookFailures = 0;
              summary.webhookSent++;
            } else {
              fresh.webhookFailures = (fresh.webhookFailures || 0) + 1;
              if (fresh.webhookFailures >= 5) fresh.webhookDisabled = true;
            }
            dirty = true;
          } catch {
            fresh.webhookFailures = (fresh.webhookFailures || 0) + 1;
            if (fresh.webhookFailures >= 5) fresh.webhookDisabled = true;
            dirty = true;
          }
        }
      }
      if (typeof sendDriftAlert === 'function' && fresh.systemRegressed && !fresh.systemNotified) {
        const res = await sendDriftAlert(fresh);
        if (res && res.sent) {
          fresh.systemNotified = true;
          dirty = true;
          summary.driftAlerted++;
        }
        if (typeof sendWebhook === 'function' && fresh.webhookUrl && !fresh.webhookDisabled) {
          try {
            const wh = await sendWebhook(fresh, 'system_drift');
            if (wh && wh.sent) {
              fresh.webhookFailures = 0;
              summary.webhookSent++;
            } else {
              fresh.webhookFailures = (fresh.webhookFailures || 0) + 1;
              if (fresh.webhookFailures >= 5) fresh.webhookDisabled = true;
            }
            dirty = true;
          } catch {
            fresh.webhookFailures = (fresh.webhookFailures || 0) + 1;
            if (fresh.webhookFailures >= 5) fresh.webhookDisabled = true;
            dirty = true;
          }
        }
      }
      if (dirty) await putWatch(fresh);
    } catch (_) {
      summary.errors++;
    }
  }
  return summary;
}
