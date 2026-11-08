// Netlify Build Plugin for Slop Detector (R-12 / #328).
//
// Runs during onPostBuild (or onSuccess), scores the deploy preview or static
// publish directory against the Slop Detector engine, surfaces a structured
// summary via utils.status.show, and halts the build via utils.build.failBuild
// when the configured threshold is breached.

export function evaluateNetlifyGate(result, inputs = {}) {
  if (!result || result.error || result.blocked || typeof result.score !== 'number') {
    return {
      passed: false,
      couldNotRun: true,
      reason:
        result?.error ||
        (result?.blocked ? `Scan blocked (${result.code || 'blocked'})` : null) ||
        'Scan could not run. This is not a Clean score.',
    };
  }

  const effectiveScore =
    typeof result.unifiedScore === 'number' ? result.unifiedScore : result.score;
  const effectiveTier =
    result.tier || (effectiveScore >= 28 ? 'Heavy' : effectiveScore >= 10 ? 'Mild' : 'Clean');

  const rawCap = inputs.failUnderScore;
  if (rawCap !== undefined && rawCap !== null && String(rawCap).trim() !== '') {
    const cap = Number(rawCap);
    if (!Number.isNaN(cap) && effectiveScore > cap) {
      return {
        passed: false,
        couldNotRun: false,
        reason: `Slop score ${effectiveScore}/100 (${effectiveTier}) exceeded failUnderScore cap of ${cap}.`,
      };
    }
  }

  const failOn = String(inputs.failOn ?? 'heavy')
    .trim()
    .toLowerCase();
  if (failOn === 'heavy' && (effectiveScore >= 28 || effectiveTier === 'Heavy')) {
    return {
      passed: false,
      couldNotRun: false,
      reason: `Page scored ${effectiveScore}/100 (Heavy tier, >= 28) with failOn="heavy".`,
    };
  }
  if (
    failOn === 'mild' &&
    (effectiveScore >= 10 || effectiveTier === 'Mild' || effectiveTier === 'Heavy')
  ) {
    return {
      passed: false,
      couldNotRun: false,
      reason: `Page scored ${effectiveScore}/100 (${effectiveTier} tier, >= 10) with failOn="mild".`,
    };
  }

  return {
    passed: true,
    couldNotRun: false,
    reason: `Page scored ${effectiveScore}/100 (${effectiveTier}) — within threshold.`,
  };
}

async function defaultScan(targetUrl, inputs = {}) {
  const apiBase = String(inputs.apiBase || 'https://slop-detect.com').replace(/\/+$/, '');
  const axes = Array.isArray(inputs.axes)
    ? inputs.axes
    : String(inputs.axes || 'design,copy')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
  const payload = {
    url: targetUrl,
    axes,
    preset: inputs.preset || 'full',
  };
  if (inputs.designMd) {
    payload.designMd = inputs.designMd === 'auto' ? true : inputs.designMd;
  }
  const res = await fetch(`${apiBase}/api/scan`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function onPostBuild({ inputs = {}, constants = {}, utils = {}, scanImpl } = {}) {
  const targetUrl =
    inputs.url ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.DEPLOY_URL ||
    constants.PUBLISH_DIR ||
    '';

  if (!targetUrl) {
    const msg = 'No target URL or PUBLISH_DIR available. Scan could not run.';
    utils?.build?.failBuild?.(msg);
    return { passed: false, reason: msg };
  }

  const runner = scanImpl || defaultScan;
  let result;
  try {
    result = await runner(targetUrl, inputs);
  } catch (err) {
    const msg = `Scan could not run: ${err?.message || err}`;
    utils?.build?.failBuild?.(msg);
    return { passed: false, reason: msg };
  }

  const gate = evaluateNetlifyGate(result, inputs);
  const scoreLabel =
    typeof result?.score === 'number' ? `${result.score}/100 (${result.tier || 'scored'})` : 'n/a';
  const triggered = [
    ...((result?.patterns || []).filter((p) => p.triggered).map((p) => p.id) || []),
    ...((result?.axes?.copy?.patterns || []).filter((p) => p.triggered).map((p) => p.id) || []),
  ];

  utils?.status?.show?.({
    title: gate.passed
      ? `Slop Detect: ${result.tier || 'Clean'} (${scoreLabel})`
      : `Slop Detect failed: ${scoreLabel}`,
    summary: gate.reason,
    text: triggered.length
      ? `Triggered patterns: ${triggered.join(', ')}`
      : 'No scored default-template patterns triggered.',
  });

  if (!gate.passed) {
    utils?.build?.failBuild?.(gate.reason);
  }

  return { passed: gate.passed, reason: gate.reason, result };
}

export const onSuccess = onPostBuild;

export default { onPostBuild, onSuccess, evaluateNetlifyGate };
