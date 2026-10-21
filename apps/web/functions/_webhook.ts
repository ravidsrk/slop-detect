// Watch webhook payloads. Pure builders only.
// The domain sweep still sends email. This module does not POST, retry, or
// disable a subscription after a failed delivery.

import { validateScanUrl } from './_ssrf.js';

export function validateWebhookUrl(raw) {
  if (!raw || typeof raw !== 'string') return { ok: false, error: 'Webhook URL is required.' };
  const trimmed = raw.trim();
  if (!/^https:\/\//i.test(trimmed)) return { ok: false, error: 'Webhook URL must be https.' };
  const checked = validateScanUrl(trimmed);
  if (checked.error) return { ok: false, error: checked.error };
  return { ok: true, url: checked.url };
}

export function watchEventKind(previous, current) {
  const left = previous?.definitionsVersion;
  const right = current?.definitionsVersion;
  if (left && right && left !== right) return 'rescored';
  const prevTier = previous?.tier;
  const nextTier = current?.tier;
  if (prevTier && nextTier && prevTier !== nextTier) return 'tier_change';
  if (
    typeof previous?.score === 'number' &&
    typeof current?.score === 'number' &&
    current.score > previous.score
  ) {
    return 'regression';
  }
  return 'unchanged';
}

export function buildWatchWebhook(input) {
  const event = watchEventKind(input?.previous, input?.current);
  const at = input?.at || new Date().toISOString();
  const permalink = input?.permalink || '';
  const previous = {
    score: typeof input?.previous?.score === 'number' ? input.previous.score : null,
    tier: input?.previous?.tier || null,
    definitionsVersion: input?.previous?.definitionsVersion || null,
  };
  const current = {
    score: typeof input?.current?.score === 'number' ? input.current.score : null,
    tier: input?.current?.tier || null,
    definitionsVersion: input?.current?.definitionsVersion || null,
  };
  const json = {
    event,
    domain: input?.domain || '',
    previous,
    current,
    permalink,
    at,
  };
  const text =
    `${json.domain}: design-slop score ${previous.score} → ${current.score} (${previous.tier} → ${current.tier}). ${event}. ${permalink}`.trim();
  return { event, json, slack: { text }, discord: { content: text } };
}

export function shouldDeliver(subscription) {
  if (!subscription) return false;
  if (subscription.removed || subscription.unsubscribed || subscription.disabled) return false;
  return true;
}
