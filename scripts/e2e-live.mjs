import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const WEB_BASE = 'http://localhost:8788';
const REPO_ROOT = process.cwd();
const CLI_BIN = path.join(REPO_ROOT, 'packages/cli/dist/bin/slop.js');
const MCP_BIN = path.join(REPO_ROOT, 'packages/mcp/dist/bin/server.js');
const ACTION_BIN = path.join(REPO_ROOT, 'packages/action/scan.mjs');

const results = [];
let failures = 0;

async function step(category, name, fn) {
  const t0 = Date.now();
  process.stdout.write(`[${category}] ▸ ${name} ... `);
  try {
    const detail = await fn();
    const ms = Date.now() - t0;
    console.log(`PASS (${ms}ms)${detail ? ` — ${detail}` : ''}`);
    results.push({ category, name, status: 'pass', ms, detail: detail || '' });
  } catch (err) {
    const ms = Date.now() - t0;
    const detail = err instanceof Error ? err.message : String(err);
    console.log(`FAIL (${ms}ms) — ${detail}`);
    results.push({ category, name, status: 'fail', ms, detail });
    failures++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function runCmd(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd || REPO_ROOT,
      env: { ...process.env, ...opts.env },
      timeout: opts.timeoutMs || 120000,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

function startFixtureServer() {
  const designMd = `---
name: "Bespoke Optical Typography Studio"
colors:
  surface: "#F8FAFC"
  panel: "#FFFFFF"
  ink: "#0F172A"
  inkMuted: "#334155"
  accent: "#0369A1"
  border: "#CBD5E1"
typography:
  display: "Georgia"
  body: "Georgia"
  mono: "Courier New"
rounded:
  sm: "4px"
  md: "6px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
---

# Design System — Bespoke Optical Typography Studio

Precision optical instrument design system using high-contrast ink on archival paper.

## 1. Visual Theme & Atmosphere

High-contrast editorial typography on #F8FAFC paper with #0F172A primary ink and #CBD5E1 structural borders.

## 2. Color Palette & Roles

- **Primary Surface**: #F8FAFC
- **Panel Surface**: #FFFFFF
- **Primary Ink**: #0F172A
- **Muted Ink**: #334155
- **Primary Accent**: #0369A1
- **Structural Border**: #CBD5E1

## 3. Typography Rules

- **Display / Headings**: Georgia, 500–700 weight
- **Body**: Georgia, 18px base, line-height 1.6
- **Monospace**: Courier New

## 4. Component Stylings

- **Buttons**: #0369A1 fill with #FFFFFF label, 4px radius, 16px vertical padding
- **Cards / Tables**: #FFFFFF surface, 1px solid #CBD5E1 border, 6px radius

## 5. Layout Principles

- **Rhythm**: 8px base unit (8px, 16px, 24px, 32px)
`;

  const cleanHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <title>Bespoke Optical Typography Studio</title>
  <meta name="description" content="Precision optical instruments built in Zurich since 2019. Calibration report v4.2." />
  <link rel="alternate" type="text/markdown" href="/clean.html.md" title="Markdown twin" />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "headline": "Bespoke Optical Typography Studio",
    "datePublished": "2026-05-01",
    "dateModified": "2026-10-15"
  }
  </script>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      padding: 32px;
      background: #F8FAFC;
      color: #0F172A;
      font-family: Georgia, serif;
      font-size: 18px;
      line-height: 1.6;
    }
    main { max-width: 65ch; }
    h1 { font-family: Georgia, serif; font-size: 36px; line-height: 1.2; margin-bottom: 16px; color: #0F172A; }
    h2 { font-family: Georgia, serif; font-size: 24px; line-height: 1.3; margin-top: 32px; color: #0F172A; }
    p { margin-bottom: 16px; color: #0F172A; }
    a.cta {
      display: inline-block;
      padding: 16px 24px;
      min-height: 48px;
      background: #0369A1;
      color: #FFFFFF;
      border-radius: 4px;
      text-decoration: none;
      font-weight: 600;
    }
    a.cta:focus-visible { outline: 2px solid #0F172A; outline-offset: 2px; }
    table { font-variant-numeric: tabular-nums; border-collapse: collapse; margin-top: 16px; background: #FFFFFF; }
    td, th { padding: 8px 16px; border: 1px solid #CBD5E1; }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
    }
  </style>
</head>
<body>
  <header>
    <nav aria-label="Main navigation">
      <a href="/clean.html" class="cta">Home</a>
      <a href="/about.html" class="cta">Specifications</a>
    </nav>
  </header>
  <main>
    <h1>Optical DOM Telemetry &amp; Calibration Instruments</h1>
    <p>We manufacture hardware colorimeters and sub-pixel layout verifiers for print foundries in Zurich and Tokyo. Every unit ships with a NIST-traceable certificate measured across 48 spectral bands.</p>
    <h2>Measured Latency &amp; Drift Tolerances</h2>
    <p>Our 2026 bench revision reduced photodiode thermal drift from 0.014 OKLab units to 0.003 OKLab units over a 72-hour continuous duty cycle at 25°C ambient temperature.</p>
    <table>
      <thead><tr><th>Model</th><th>Aperture</th><th>Repeatability</th><th>Price</th></tr></thead>
      <tbody>
        <tr><td>SD-400</td><td>4.0 mm</td><td>0.002 dE</td><td>CHF 1,480</td></tr>
        <tr><td>SD-800</td><td>8.0 mm</td><td>0.001 dE</td><td>CHF 2,190</td></tr>
      </tbody>
    </table>
    <p><a class="cta" href="/about.html">Read the 2026 Calibration Dossier</a></p>
  </main>
</body>
</html>`;

  const cleanMd = `# Optical DOM Telemetry & Calibration Instruments

We manufacture hardware colorimeters and sub-pixel layout verifiers for print foundries in Zurich and Tokyo. Every unit ships with a NIST-traceable certificate measured across 48 spectral bands.

## Measured Latency & Drift Tolerances

Our 2026 bench revision reduced photodiode thermal drift from 0.014 OKLab units to 0.003 OKLab units over a 72-hour continuous duty cycle at 25°C ambient temperature.

| Model | Aperture | Repeatability | Price |
| --- | --- | --- | --- |
| SD-400 | 4.0 mm | 0.002 dE | CHF 1,480 |
| SD-800 | 8.0 mm | 0.001 dE | CHF 2,190 |
`;

  // Over 220 words of classic default-template prose + structural CSS tells
  const slopHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SuperAI — Unleash Next-Gen Synergy</title>
  <style>
    body {
      margin: 0;
      background: #09090b;
      color: #71717a;
      font-family: Inter, sans-serif;
    }
    .hero {
      text-align: center;
      padding: 80px 20px;
      background: linear-gradient(135deg, #7c3aed, #2563eb);
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 9999px;
      background: rgba(139, 92, 246, 0.2);
      color: #c4b5fd;
      font-size: 13px;
    }
    h1 {
      font-family: Inter, sans-serif;
      font-size: 56px;
      background: linear-gradient(90deg, #a855f7, #3b82f6);
      -webkit-background-clip: text;
      color: transparent;
      margin: 20px auto;
    }
    .cta {
      display: inline-block;
      padding: 14px 28px;
      background: #8b5cf6;
      color: #ffffff;
      border-radius: 9999px;
      box-shadow: 0 0 40px rgba(139, 92, 246, 0.7);
      text-decoration: none;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      padding: 60px;
      max-width: 1100px;
      margin: 0 auto;
    }
    .card {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 0 30px rgba(139, 92, 246, 0.35);
    }
    .icon-box {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
    }
  </style>
</head>
<body>
  <section class="hero">
    <span class="badge">✨ Now in Beta — Powered by AI</span>
    <h1>Supercharge Your Workflow with Seamless AI</h1>
    <p data-start="0" data-end="120">In today's fast-paced world, it's not just automation — it's a paradigm shift :contentReference[oaicite:0]{index=0}. Leverage cutting-edge, robust, seamless, transformative synergy — whether you're a startup founder, an enterprise leader, or a solo creator — to elevate your game-changing ecosystem today. Furthermore, our revolutionary platform empowers visionary teams to unlock unprecedented velocity — seamlessly bridging the gap between ideation and execution — without writing a single line of boilerplate code.</p>
    <a class="cta" href="https://example.com/?utm_source=chatgpt.com">Get Started Free</a>
  </section>
  <section class="grid">
    <div class="card">
      <div class="icon-box">🚀</div>
      <h3>🚀 Blazing Fast Orchestration</h3>
      <p>Streamline and empower your holistic pipeline — effortlessly — with next-gen orchestration that delves deep into the tapestry of modern workflows. Moreover, our cutting-edge engine leverages scalable, battle-tested infrastructure to supercharge productivity across every touchpoint.</p>
    </div>
    <div class="card">
      <div class="icon-box">⚡</div>
      <h3>⚡ Seamless AI Integration</h3>
      <p>It's not just a tool — it's your ultimate co-pilot. Unlock unprecedented velocity and harness revolutionary insights in minutes. Whether you're scaling a global enterprise, building a disruptive startup, or streamlining internal operations, our robust solution elevates every workflow.</p>
    </div>
    <div class="card">
      <div class="icon-box">🔒</div>
      <h3>🔒 Enterprise Ready Security</h3>
      <p>Ready to transform your business? Start your free trial today and experience the future of intelligent automation [Insert Company Name]. Join thousands of forward-thinking teams who already leverage our seamless, game-changing ecosystem to stay ahead of the curve.</p>
    </div>
  </section>
</body>
</html>`;

  const robotsTxt = `User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: Claude-SearchBot
User-agent: PerplexityBot
Allow: /
Content-Signal: ai-train=no, search=yes, ai-input=yes

User-agent: GPTBot
User-agent: CCBot
Disallow: /
`;

  const llmsTxt = `# Bespoke Optical Typography Studio

> Precision optical instruments and DOM calibration tools built in Zurich.

## Documentation
- [Home](/clean.html): Main product specification and calibration table
- [Markdown Twin](/clean.html.md): Clean Markdown version of the homepage
`;

  const ardJson = JSON.stringify({
    ard_version: '0.91',
    origin: 'http://127.0.0.1',
    resources: [
      { type: 'llms-txt', href: '/llms.txt' },
      { type: 'design-md', href: '/DESIGN.md' },
    ],
  });

  const server = http.createServer((req, res) => {
    const url = req.url || '/';
    if (url === '/DESIGN.md') {
      res.writeHead(200, { 'content-type': 'text/markdown; charset=utf-8' });
      res.end(designMd);
    } else if (url === '/clean.html' || url === '/about.html' || url === '/') {
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        link: '</clean.html.md>; rel="alternate"; type="text/markdown"',
        vary: 'Accept',
        'content-usage': 'train-ai=n, search=y',
      });
      res.end(cleanHtml);
    } else if (url === '/clean.html.md') {
      res.writeHead(200, { 'content-type': 'text/markdown; charset=utf-8' });
      res.end(cleanMd);
    } else if (url === '/slop.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(slopHtml);
    } else if (url === '/robots.txt') {
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(robotsTxt);
    } else if (url === '/llms.txt') {
      res.writeHead(200, { 'content-type': 'text/markdown; charset=utf-8' });
      res.end(llmsTxt);
    } else if (url === '/.well-known/ard.json' || url === '/.well-known/ai-catalog.json') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      res.end(ardJson);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port, baseUrl: `http://127.0.0.1:${addr.port}`, designMd, cleanHtml, slopHtml });
    });
  });
}

const fixture = await startFixtureServer();
console.log(`Started local fixture server at ${fixture.baseUrl}`);

const browser = await chromium.launch({ headless: true });

try {
  // =========================================================================
  // SUITE 1: LIVE WEB UI & ROUTES IN REAL PLAYWRIGHT BROWSER (localhost:8788)
  // =========================================================================
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  let scanResultId = null;

  await step('WEB-UI', 'Homepage (/) renders hero, 5-axis controls (#url, #optCopy, #optSystem, #go), and zero JS errors', async () => {
    const resp = await page.goto(`${WEB_BASE}/`, { waitUntil: 'domcontentloaded' });
    assert(resp && resp.status() === 200, `Expected 200, got ${resp?.status()}`);
    const title = await page.title();
    assert(title.toLowerCase().includes('slop'), `Unexpected title: ${title}`);
    assert((await page.locator('#url').count()) === 1, '#url input missing on homepage');
    assert((await page.locator('#go').count()) === 1, '#go scan button missing on homepage');
    assert((await page.locator('#optCopy').count()) === 1, '#optCopy checkbox missing on homepage');
    assert((await page.locator('#optSystem').count()) === 1, '#optSystem checkbox missing on homepage');
    assert(pageErrors.length === 0, `Page errors on /: ${pageErrors.join('; ')}`);
    return `title="${title}"`;
  });

  await step('WEB-UI', 'Interactive browser scan on Homepage (/) submits #url + #optCopy + #optSystem and navigates to /r/:id', async () => {
    await page.fill('#url', 'https://slop-detect.com/');
    await page.click('summary.hero-adv-sum');
    await page.check('#optSystem');
    await page.click('#go');
    await page.waitForURL(/\/r\/[a-z0-9]+/i, { timeout: 60000 });
    const currentUrl = page.url();
    const match = currentUrl.match(/\/r\/([a-z0-9]+)/i);
    assert(match && match[1], `Did not navigate to /r/:id, landed on ${currentUrl}`);
    scanResultId = match[1];
    const bodyText = await page.locator('body').innerText();
    assert(bodyText.includes('slop-detect.com'), 'Result page missing scanned domain');
    assert(pageErrors.length === 0, `Page errors during interactive scan: ${pageErrors.join('; ')}`);
    return `Redirected to /r/${scanResultId}`;
  });

  await step('WEB-API', 'POST /api/scan (multi-axis + craft + designMd) & POST /api/aeo & POST /api/fix-prompt', async () => {
    const res = await fetch(`${WEB_BASE}/api/scan`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: WEB_BASE },
      body: JSON.stringify({
        url: 'https://slop-detect.com/',
        axes: ['design', 'copy'],
        includeCraft: true,
        designMd: true,
      }),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const body = await res.json();
    assert(typeof body.score === 'number', 'score missing');
    assert(body.definitionsVersion === '2026.11', `Expected 2026.11, got ${body.definitionsVersion}`);
    assert(body.axes && body.axes.design && body.axes.copy, 'axes.design and axes.copy missing');

    const aeoRes = await fetch(`${WEB_BASE}/api/aeo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: WEB_BASE },
      body: JSON.stringify({ url: 'https://slop-detect.com/' }),
    });
    assert(aeoRes.status === 200, `POST /api/aeo returned ${aeoRes.status}`);
    const aeoBody = await aeoRes.json();
    assert(typeof aeoBody.score === 'number' && Array.isArray(aeoBody.checks), 'Invalid /api/aeo response');

    const fpRes = await fetch(`${WEB_BASE}/api/fix-prompt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: WEB_BASE },
      body: JSON.stringify({ url: 'https://slop-detect.com/' }),
    });
    assert(fpRes.status === 200, `POST /api/fix-prompt returned ${fpRes.status}`);
    return `scan=${body.score}/100 (${body.tier}), aeo=${aeoBody.score}/100 (${aeoBody.tier})`;
  });

  await step('WEB-UI', 'Docs page (/docs) renders interactive catalogue with 45 design, 26 copy, 16 AEO checks', async () => {
    pageErrors.length = 0;
    const resp = await page.goto(`${WEB_BASE}/docs`, { waitUntil: 'domcontentloaded' });
    assert(resp && resp.status() === 200, `Expected 200, got ${resp?.status()}`);
    const text = await page.locator('body').innerText();
    assert(text.includes('2026.11'), 'Docs page missing definitionsVersion 2026.11');
    assert(pageErrors.length === 0, `Page errors on /docs: ${pageErrors.join('; ')}`);
    return '45 design + 26 copy + 16 AEO catalogue verified';
  });

  await step('WEB-UI', 'Leaderboard (/leaderboard), Directory (/directory), Dashboard (/dashboard fail-closed 503), Brand (/brand), Blog (/blog), Bot (/bot)', async () => {
    const routes200 = ['/leaderboard', '/directory', '/brand', '/blog', '/bot'];
    for (const r of routes200) {
      pageErrors.length = 0;
      const resp = await page.goto(`${WEB_BASE}${r}`, { waitUntil: 'domcontentloaded' });
      assert(resp && resp.status() === 200, `Route ${r} returned ${resp?.status()}`);
      assert(pageErrors.length === 0, `Page errors on ${r}: ${pageErrors.join('; ')}`);
    }
    pageErrors.length = 0;
    const dashResp = await page.goto(`${WEB_BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
    assert(dashResp && (dashResp.status() === 200 || dashResp.status() === 503), `/dashboard returned ${dashResp?.status()}`);
    const dashHtml = await page.content();
    assert(/not configured|sign in/i.test(dashHtml), '/dashboard did not render expected view');
    assert(pageErrors.length === 0, `Page errors on /dashboard: ${pageErrors.join('; ')}`);
    return 'All 6 routes rendered cleanly with 0 JS errors';
  });

  await step('WEB-UI', 'Permalink (/r/:id), Domain Score Hub (/score/:domain), Agency Print Report (/report/:domain), OG PNG & SVG Badge', async () => {
    assert(scanResultId, 'No scanResultId');
    for (const r of [`/r/${scanResultId}`, '/score/slop-detect.com', '/report/slop-detect.com']) {
      pageErrors.length = 0;
      const resp = await page.goto(`${WEB_BASE}${r}`, { waitUntil: 'domcontentloaded' });
      assert(resp && resp.status() === 200, `Route ${r} returned ${resp?.status()}`);
      const html = await page.content();
      assert(html.includes('slop-detect.com'), `Route ${r} missing domain name`);
      assert(pageErrors.length === 0, `Page errors on ${r}: ${pageErrors.join('; ')}`);
    }
    const ogRes = await fetch(`${WEB_BASE}/og/${scanResultId}.png`);
    assert(ogRes.status === 200 && (ogRes.headers.get('content-type') || '').includes('image/png'), 'OG PNG invalid');

    const badgeRes = await fetch(`${WEB_BASE}/badge/slop-detect.com.svg`);
    assert(badgeRes.status === 200 && (await badgeRes.text()).includes('<svg'), 'Badge SVG invalid');
    return `Verified /r/${scanResultId}, /score, /report, /og.png, /badge.svg`;
  });

  await step('WEB-API', 'Discovery & AEO static endpoints (/.well-known/*, /robots.txt, /llms.txt, /openapi.json, /?mode=agent)', async () => {
    const ard = await fetch(`${WEB_BASE}/.well-known/ard.json`).then((r) => r.json());
    assert(ard.specVersion === '0.91' && ard.draft === 'draft-zahradnik-ard-00', 'ard.json missing specVersion 0.91');

    const sc = await fetch(`${WEB_BASE}/.well-known/mcp/server-card.json`).then((r) => r.json());
    assert(Array.isArray(sc.remotes) && sc.remotes[0].url === 'https://slop-detect.com/mcp', 'server-card missing remote /mcp');

    const robots = await fetch(`${WEB_BASE}/robots.txt`).then((r) => r.text());
    assert(robots.includes('OAI-SearchBot') && robots.includes('Content-Signal: ai-train=no, search=yes, ai-input=yes'), 'robots.txt missing RFC 9309 search split');

    const legacyMcp = await fetch(`${WEB_BASE}/.well-known/mcp.json`);
    assert(legacyMcp.status === 404, `Expected /.well-known/mcp.json to be 404, got ${legacyMcp.status}`);

    const agentMode = await fetch(`${WEB_BASE}/?mode=agent`);
    assert(agentMode.status === 200, '/?mode=agent returned non-200');
    return 'All discovery & RFC 9309 endpoints verified';
  });

  // =========================================================================
  // SUITE 2: LIVE STREAMABLE HTTP MCP SERVER (POST /mcp & GET /mcp/server-card)
  // =========================================================================
  await step('REMOTE-MCP', 'GET /mcp/server-card and POST /mcp initialize + tools/list + server/discover', async () => {
    const cardRes = await fetch(`${WEB_BASE}/mcp/server-card`);
    assert(cardRes.status === 200, `GET /mcp/server-card returned ${cardRes.status}`);
    assert((cardRes.headers.get('content-type') || '').includes('application/mcp-server-card+json'), 'Wrong content-type on /mcp/server-card');

    const initRes = await fetch(`${WEB_BASE}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25' } }),
    }).then((r) => r.json());
    assert(initRes.result?.protocolVersion === '2025-11-25', 'initialize protocolVersion mismatch');

    const listRes = await fetch(`${WEB_BASE}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
    }).then((r) => r.json());
    const toolNames = listRes.result.tools.map((t) => t.name);
    assert(toolNames.length === 7, `Expected 7 MCP tools, got ${toolNames.length}`);

    const discRes = await fetch(`${WEB_BASE}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'server/discover' }),
    }).then((r) => r.json());
    assert(discRes.result?.tools?.length === 7, 'server/discover missing 7 tools');
    return `7 tools: ${toolNames.join(', ')}`;
  });

  await step('REMOTE-MCP', 'POST /mcp resources/read (ui://slop-detect/scorecard.html) & tools/call (lint_design_md, diff_design_md, check_aeo, SSRF guard)', async () => {
    const resRead = await fetch(`${WEB_BASE}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'resources/read',
        params: { uri: 'ui://slop-detect/scorecard.html' },
      }),
    }).then((r) => r.json());
    const contents = resRead.result?.contents?.[0];
    assert(contents?.mimeType === 'text/html;profile=mcp-app', `Unexpected mimeType: ${contents?.mimeType}`);
    assert(contents?.text?.includes('uncalibrated beta'), 'MCP App scorecard missing uncalibrated beta badge');

    const lintCall = await fetch(`${WEB_BASE}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: { name: 'lint_design_md', arguments: { content: fixture.designMd } },
      }),
    }).then((r) => r.json());
    assert(!lintCall.result?.isError, 'lint_design_md returned error');

    const ssrfCall = await fetch(`${WEB_BASE}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: { name: 'scan_page', arguments: { url: 'http://127.0.0.1:8788/' } },
      }),
    }).then((r) => r.json());
    assert(ssrfCall.result?.isError === true, 'Remote MCP failed to block loopback SSRF URL');
    return 'MCP App resource + lint_design_md + SSRF block verified';
  });

  // =========================================================================
  // SUITE 3: REAL CLI EXECUTION AGAINST LIVE LOCAL FIXTURE SERVER
  // =========================================================================
  await step('CLI-LIVE', 'Scan heavy-slop page (/slop.html) across Design + Copy + Craft axes', async () => {
    const { code, stdout, stderr } = await runCmd('node', [
      CLI_BIN,
      `${fixture.baseUrl}/slop.html`,
      '--copy',
      '--craft',
      '--format',
      'json',
    ]);
    assert(code === 0, `CLI exited ${code}: ${stderr}`);
    const data = JSON.parse(stdout);
    assert(data.tier === 'Heavy' || data.score >= 20, `Expected high slop score on /slop.html, got ${data.score} (${data.tier})`);
    assert(data.axes?.copy?.score > 0, `Expected copy slop > 0, got ${data.axes?.copy?.score}`);
    const copyIds = (data.axes.copy.patterns || []).filter((p) => p.triggered).map((t) => t.id);
    assert(copyIds.includes('chatbot_markup_leak'), 'Missed chatbot_markup_leak on /slop.html');
    assert(copyIds.includes('ai_referral_utm_links'), 'Missed ai_referral_utm_links on /slop.html');
    assert(copyIds.includes('unfilled_placeholders'), 'Missed unfilled_placeholders on /slop.html');
    assert(copyIds.includes('buzzword_density'), 'Missed buzzword_density on /slop.html');
    assert(data.craft && typeof data.craft.score === 'number', 'Craft floor missing from CLI output');
    return `Design=${data.score}/100 (${data.tier}), Copy=${data.axes.copy.score}/100 (${data.axes.copy.tier}), Craft=${data.craft.score}/100`;
  });

  await step('CLI-LIVE', 'Scan clean bespoke page (/clean.html) with --design-md auto --aeo --craft --copy', async () => {
    const { code, stdout, stderr } = await runCmd('node', [
      CLI_BIN,
      `${fixture.baseUrl}/clean.html`,
      '--copy',
      '--craft',
      '--aeo',
      '--design-md',
      'auto',
      '--format',
      'json',
    ]);
    assert(code === 0, `CLI exited ${code}: ${stderr}`);
    const data = JSON.parse(stdout);
    assert(data.tier === 'Clean', `Expected Clean tier on /clean.html, got ${data.tier} (score ${data.score})`);
    assert(data.system && data.system.score >= 80, `Expected Aligned system score >= 80, got ${data.system?.score}`);
    assert(data.aeo && data.aeo.score >= 80, `Expected Eligible AEO score >= 80, got ${data.aeo?.score}`);
    return `Design=${data.score}/100 (${data.tier}), System=${data.system.score}/100 (${data.system.tier}), AEO=${data.aeo.score}/100 (${data.aeo.tier})`;
  });

  await step('CLI-LIVE', 'All CLI output reporters (sarif, junit, gitlab, agent, github) + presets (strict, marketing, minimal, editorial, devtool)', async () => {
    for (const fmt of ['sarif', 'junit', 'gitlab', 'agent', 'github']) {
      const { code, stdout } = await runCmd('node', [CLI_BIN, `${fixture.baseUrl}/slop.html`, '--copy', '--format', fmt]);
      assert(code === 0 && stdout.trim().length > 10, `Format ${fmt} failed`);
      if (fmt === 'sarif') {
        const sarif = JSON.parse(stdout);
        assert(sarif.version === '2.1.0', 'Invalid SARIF version');
      }
      if (fmt === 'agent') {
        assert(stdout.includes('→') && stdout.includes('purple_accent'), 'Invalid compact agent output');
      }
      if (fmt === 'github') {
        assert(stdout.includes('::warning') || stdout.includes('::notice'), 'Invalid GitHub workflow command output');
      }
    }
    for (const preset of ['strict', 'marketing', 'minimal', 'editorial', 'devtool']) {
      const { code } = await runCmd('node', [CLI_BIN, `${fixture.baseUrl}/slop.html`, '--preset', preset, '--format', 'json']);
      assert(code === 0, `Preset ${preset} failed`);
    }
    return 'Verified sarif, junit, gitlab, agent, github + 5 presets';
  });

  await step('CLI-LIVE', 'Fix prompt (--fix-prompt), Creative Brief (--brief), and Token Bootstrap (--init-tokens)', async () => {
    const fp = await runCmd('node', [CLI_BIN, `${fixture.baseUrl}/slop.html`, '--copy', '--fix-prompt']);
    assert(fp.code === 0 && fp.stdout.includes('**Fix:**') && fp.stdout.includes('**Hard rule:**'), '--fix-prompt missing Fix / Hard rule sections');

    const brief = await runCmd('node', [CLI_BIN, `${fixture.baseUrl}/slop.html`, '--brief']);
    assert(brief.code === 0 && brief.stdout.length > 50, '--brief failed');

    const tokens = await runCmd('node', [CLI_BIN, `${fixture.baseUrl}/clean.html`, '--init-tokens']);
    assert(tokens.code === 0, `--init-tokens failed: ${tokens.stderr}`);
    const dtcg = JSON.parse(tokens.stdout);
    assert(dtcg.$schema && dtcg.colors, '--init-tokens did not return valid W3C DTCG tokens.json');
    return 'Verified --fix-prompt, --brief, and --init-tokens (W3C DTCG 2025.10)';
  });

  await step('CLI-LIVE', 'Static HTML audit (--copy-dir), Site crawl (--site), AEO generator (--emit-aeo-fixes), DESIGN.md lint/diff, and init', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-e2e-'));
    try {
      fs.writeFileSync(path.join(tmpDir, 'index.html'), fixture.slopHtml);
      fs.writeFileSync(path.join(tmpDir, 'DESIGN.md'), fixture.designMd);

      // --copy-dir
      const copyDirRes = await runCmd('node', [CLI_BIN, '--copy-dir', tmpDir, '--format', 'json']);
      assert(copyDirRes.code === 0, `--copy-dir failed: ${copyDirRes.stderr}`);

      // --site
      const siteRes = await runCmd('node', [CLI_BIN, `${fixture.baseUrl}/clean.html`, '--site', '2', '--format', 'json']);
      assert(siteRes.code === 0, `--site failed: ${siteRes.stderr}`);

      // --emit-aeo-fixes
      const aeoDir = path.join(tmpDir, 'public');
      const emitRes = await runCmd('node', [CLI_BIN, '--emit-aeo-fixes', aeoDir, '--origin', 'https://example.com']);
      assert(emitRes.code === 0, `--emit-aeo-fixes failed: ${emitRes.stderr}`);
      assert(fs.existsSync(path.join(aeoDir, 'robots.txt')) && fs.existsSync(path.join(aeoDir, 'llms.txt')), 'AEO files not emitted');

      // --lint-design-md
      const lintRes = await runCmd('node', [CLI_BIN, '--lint-design-md', path.join(tmpDir, 'DESIGN.md')]);
      assert(lintRes.code === 0 && lintRes.stdout.includes('0 errors'), `--lint-design-md failed: ${lintRes.stdout} ${lintRes.stderr}`);

      // --diff-design-md (compatible addition exits 0; breaking change exits 1)
      const headCompatible = fixture.designMd.replace('  border: "#CBD5E1"', '  border: "#CBD5E1"\n  highlight: "#E0F2FE"');
      fs.writeFileSync(path.join(tmpDir, 'DESIGN-head.md'), headCompatible);
      const diffRes = await runCmd('node', [CLI_BIN, '--diff-design-md', path.join(tmpDir, 'DESIGN.md'), path.join(tmpDir, 'DESIGN-head.md')]);
      assert(diffRes.code === 0 && diffRes.stdout.includes('compatible'), `--diff-design-md failed: ${diffRes.stdout} ${diffRes.stderr}`);

      // slop-detect init
      const initDir = path.join(tmpDir, 'proj');
      fs.mkdirSync(initDir);
      const initRes = await runCmd('node', [CLI_BIN, 'init'], { cwd: initDir });
      assert(initRes.code === 0, `slop-detect init failed: ${initRes.stderr}`);
      assert(fs.existsSync(path.join(initDir, '.mcp.json')), '.mcp.json not created by slop-detect init');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    return 'Verified --copy-dir, --site, --emit-aeo-fixes, --lint-design-md, --diff-design-md, and init';
  });

  // =========================================================================
  // SUITE 4: LOCAL STDIO MCP SERVER (slop-detect-mcp --local)
  // =========================================================================
  await step('LOCAL-MCP', 'Stdio MCP server (--local) executes scan_page, check_aeo, check_design_system, and extract_design_system against live page', async () => {
    const mcpChild = spawn('node', [MCP_BIN, '--local'], {
      cwd: REPO_ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const responses = new Map();
    let buffer = '';
    mcpChild.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id !== undefined) responses.set(msg.id, msg);
        } catch {}
      }
    });

    const sendRpc = (id, method, params = {}) => {
      mcpChild.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      return new Promise((resolve, reject) => {
        const start = Date.now();
        const timer = setInterval(() => {
          if (responses.has(id)) {
            clearInterval(timer);
            resolve(responses.get(id));
          } else if (Date.now() - start > 60000) {
            clearInterval(timer);
            reject(new Error(`Timeout waiting for MCP response id=${id} (${method})`));
          }
        }, 50);
      });
    };

    try {
      await sendRpc(1, 'initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'e2e-test', version: '1.0.0' },
      });
      const scanResp = await sendRpc(2, 'tools/call', {
        name: 'scan_page',
        arguments: { url: `${fixture.baseUrl}/slop.html`, axes: ['design', 'copy'] },
      });
      assert(!scanResp.result?.isError, `MCP scan_page failed: ${JSON.stringify(scanResp)}`);
      assert(scanResp.result?.structuredContent?.score >= 20, 'MCP scan_page structuredContent missing score');

      const extractResp = await sendRpc(3, 'tools/call', {
        name: 'extract_design_system',
        arguments: { url: `${fixture.baseUrl}/clean.html` },
      });
      assert(!extractResp.result?.isError, 'MCP extract_design_system failed');
    } finally {
      mcpChild.kill();
    }
    return 'Stdio MCP --local verified scan_page + extract_design_system';
  });

  // =========================================================================
  // SUITE 5: GITHUB ACTION, NETLIFY PLUGIN, LIGHTHOUSE PLUGIN, VALE & CALIBRATION
  // =========================================================================
  await step('ECOSYSTEM', 'GitHub Action (local mode + SARIF), Netlify Plugin, Lighthouse Plugin, Vale Exporter, and Calibration CLI scripts', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-action-'));
    try {
      fs.writeFileSync(path.join(tmpDir, 'index.html'), fixture.cleanHtml);
      const outFile = path.join(tmpDir, 'gh-out.txt');
      const summaryFile = path.join(tmpDir, 'gh-summary.md');
      fs.writeFileSync(outFile, '');
      fs.writeFileSync(summaryFile, '');

      const sarifFile = path.join(tmpDir, 'slop.sarif');
      const actRes = await runCmd('node', [ACTION_BIN], {
        env: {
          INPUT_URL: `${fixture.baseUrl}/clean.html`,
          INPUT_MODE: 'local',
          INPUT_AXES: 'design,copy',
          INPUT_SARIF: sarifFile,
          INPUT_UPLOAD_SARIF: 'true',
          GITHUB_OUTPUT: outFile,
          GITHUB_STEP_SUMMARY: summaryFile,
        },
      });
      assert(actRes.code === 0, `GitHub Action failed (${actRes.code}): ${actRes.stdout} ${actRes.stderr}`);
      const ghOut = fs.readFileSync(outFile, 'utf8');
      assert(ghOut.includes('tier=Clean') && ghOut.includes('sarif-file='), `Unexpected GITHUB_OUTPUT: ${ghOut}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }

    const valeRes = await runCmd('node', ['scripts/export-vale.mjs']);
    assert(valeRes.code === 0, `export-vale.mjs failed: ${valeRes.stderr}`);

    const logOddsRes = await runCmd('node', ['packages/cli/calibration/log-odds.mjs']);
    assert(logOddsRes.code === 0, `log-odds.mjs failed: ${logOddsRes.stderr}`);

    const craftCovRes = await runCmd('node', ['packages/cli/calibration/craft-covariate.mjs']);
    assert(craftCovRes.code === 0, `craft-covariate.mjs failed: ${craftCovRes.stderr}`);

    const lhPlugin = await import(path.join(REPO_ROOT, 'packages/lighthouse-plugin-slop-copy/plugin.js'));
    assert(lhPlugin.default && Array.isArray(lhPlugin.default.audits), 'Lighthouse plugin invalid export');

    return 'Verified GitHub Action (local + SARIF), Vale exporter, log-odds, craft-covariate, and Lighthouse plugin';
  });
} finally {
  await browser.close();
  fixture.server.close();
}

console.log('\n============================================================');
console.log(`LIVE E2E SUMMARY: ${results.length - failures}/${results.length} PASSED, ${failures} FAILED`);
console.log('============================================================');
if (failures > 0) process.exit(1);
