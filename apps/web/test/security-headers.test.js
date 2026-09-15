// Root middleware tests — security headers are added to Function-rendered HTML
// (which public/_headers does NOT cover) but not to JSON / image responses.

import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { onRequest } from '../functions/_middleware.ts';

function ctx(response) {
  return { next: async () => response };
}

function htmlResponse() {
  return new Response('<!doctype html><title>x</title>', {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function headersFileCsp() {
  const text = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
  const block = text.split(/^\//m).find((b) => b.startsWith('*\n'));
  const line = block.split('\n').find((l) => l.trim().startsWith('Content-Security-Policy:'));
  return line.split(':').slice(1).join(':').trim();
}

test('text/html Function responses get CSP, X-Frame-Options, nosniff, and HSTS', async () => {
  const html = new Response('<!doctype html><title>x</title>', {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
  const res = await onRequest(ctx(html));
  expect(res.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'self'");
  expect(res.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
  expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  expect(res.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
  expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  // Body and status survive the re-wrap.
  expect(res.status).toBe(200);
  expect(await res.text()).toContain('<!doctype html>');
});

test('JSON and image responses are left untouched', async () => {
  const json = new Response('{"ok":true}', {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  const jr = await onRequest(ctx(json));
  expect(jr.headers.get('Content-Security-Policy')).toBe(null);
  expect(jr.headers.get('X-Frame-Options')).toBe(null);

  const svg = new Response('<svg/>', {
    status: 200,
    headers: { 'Content-Type': 'image/svg+xml' },
  });
  const sr = await onRequest(ctx(svg));
  expect(sr.headers.get('Content-Security-Policy')).toBe(null);
});

test('a header a route set itself is not overridden', async () => {
  const html = new Response('<title>x</title>', {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
      'X-Frame-Options': 'DENY',
    },
  });
  const res = await onRequest(ctx(html));
  expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  // ...but the headers the route did NOT set are still added.
  expect(res.headers.get('Content-Security-Policy')).toBeTruthy();
});

test('middleware CSP is identical to the /* CSP in public/_headers (no drift)', async () => {
  const res = await onRequest(ctx(htmlResponse()));
  expect(res.headers.get('Content-Security-Policy')).toBe(headersFileCsp());
});

test("CSP pins form-action 'self' (every form posts same-origin)", async () => {
  const res = await onRequest(ctx(htmlResponse()));
  expect(res.headers.get('Content-Security-Policy')).toContain("form-action 'self'");
});

test('security.txt exists with a contact and a future expiry', () => {
  const text = readFileSync(new URL('../public/.well-known/security.txt', import.meta.url), 'utf8');
  const contacts = text.match(/^Contact: .+$/gm) ?? [];
  expect(contacts).toHaveLength(1);
  expect(contacts[0]).toBe(
    'Contact: https://github.com/ravidsrk/slop-detect/security/advisories/new'
  );
  const expires = text.match(/^Expires: (.+)$/m)?.[1];
  expect(expires, 'Expires field present').toBeTruthy();
  const exp = new Date(expires).getTime();
  expect(Number.isNaN(exp)).toBe(false);
  expect(exp).toBeGreaterThan(Date.now() + 30 * 24 * 3600 * 1000);
});
