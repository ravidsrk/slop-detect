// Root middleware tests — security headers are added to Function-rendered HTML
// (which public/_headers does NOT cover) but not to JSON / image responses.

import { test, expect } from 'vitest';
import { onRequest } from '../functions/_middleware.ts';

function ctx(response) {
  return { next: async () => response };
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
