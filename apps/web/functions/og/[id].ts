// GET /og/:id.png — 1200×630 share card as PNG.
//
// Renders the cardHtml() layout inside Cloudflare Browser Rendering and
// screenshots it. Cached in KV (og:<id>) so each result only renders once.
// Falls back to the static /og.png if anything goes wrong (a broken unfurl is
// worse than a generic one).

import puppeteer from '@cloudflare/puppeteer';
import { getResult, cardHtml } from '../_shared.js';

const OG_TTL = 60 * 60 * 24 * 30; // 30 days

export async function onRequestGet({ params, env, request }) {
  const id = String(params.id || '')
    .replace(/\.png$/i, '')
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 16);

  const pngHeaders = {
    'Content-Type': 'image/png',
    'Cache-Control': 'public, max-age=86400, s-maxage=2592000',
  };

  // 1. Serve cached PNG if present.
  if (env.RESULTS) {
    try {
      const cached = await env.RESULTS.get(`og:${id}`, 'arrayBuffer');
      if (cached) return new Response(cached, { headers: pngHeaders });
    } catch (_) {}
  }

  const slim = await getResult(env.RESULTS, id);
  if (!slim || !env.BROWSER) {
    return Response.redirect(new URL('/og.png', request.url).toString(), 302);
  }

  let browser;
  try {
    browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
    await page.setContent(cardHtml(slim), { waitUntil: 'networkidle0', timeout: 15000 });
    const buf = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: 1200, height: 630 },
    });

    // Cache for next time (best-effort).
    if (env.RESULTS) {
      try {
        await env.RESULTS.put(`og:${id}`, buf, { expirationTtl: OG_TTL });
      } catch (_) {}
    }

    return new Response(buf, { headers: pngHeaders });
  } catch (_) {
    return Response.redirect(new URL('/og.png', request.url).toString(), 302);
  } finally {
    try {
      await browser?.close();
    } catch (_) {}
  }
}
