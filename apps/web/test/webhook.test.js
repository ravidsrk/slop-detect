import { test, expect } from 'vitest';
import {
  buildWatchWebhook,
  shouldDeliver,
  validateWebhookUrl,
  watchEventKind,
} from '../functions/_webhook.ts';

test('webhook URLs must be https and public', () => {
  expect(validateWebhookUrl('https://hooks.example.com/slack').ok).toBe(true);
  expect(validateWebhookUrl('http://hooks.example.com/slack').ok).toBe(false);
  expect(validateWebhookUrl('https://localhost/hook').ok).toBe(false);
  expect(validateWebhookUrl('https://169.254.169.254/latest').ok).toBe(false);
});

test('a definitions change is a rescore and delivery stops when the watch is off', () => {
  const payload = buildWatchWebhook({
    domain: 'example.com',
    previous: { score: 4, tier: 'Clean', definitionsVersion: '2026.10' },
    current: { score: 40, tier: 'Heavy', definitionsVersion: '2026.11' },
    permalink: 'https://slop-detect.com/r/abc',
    at: '2026-10-21T00:00:00.000Z',
  });
  expect(payload.event).toBe('rescored');
  expect(payload.json.domain).toBe('example.com');
  expect(payload.json.previous.score).toBe(4);
  expect(payload.json.current.score).toBe(40);
  expect(payload.json.permalink).toBe('https://slop-detect.com/r/abc');
  expect(payload.json.at).toBe('2026-10-21T00:00:00.000Z');
  expect(payload.json.email).toBeUndefined();
  expect(payload.slack).toEqual({ text: payload.slack.text });
  expect(payload.discord).toEqual({ content: payload.slack.text });
  expect(payload.slack.text).toMatch(/design-slop score/);
  expect(payload.slack.text).not.toMatch(/fingerprint/);
  expect(
    watchEventKind(
      { score: 4, tier: 'Clean', definitionsVersion: '2026.11' },
      { score: 20, tier: 'Clean', definitionsVersion: '2026.11' }
    )
  ).toBe('regression');
  expect(shouldDeliver(null)).toBe(false);
  expect(shouldDeliver({ removed: true })).toBe(false);
  expect(shouldDeliver({ unsubscribed: true })).toBe(false);
  expect(shouldDeliver({ disabled: true })).toBe(false);
  expect(shouldDeliver({ domain: 'example.com' })).toBe(true);
});
