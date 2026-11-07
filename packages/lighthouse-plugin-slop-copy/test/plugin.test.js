import { describe, it, expect } from 'vitest';
import {
  lighthousePluginSlopCopy,
  PLUGIN_SCOPE_STATEMENT,
  SlopCopyAudit,
  SlopChatbotArtifactsAudit,
  SlopHtmlAeoAudit,
} from '../plugin.js';

describe('lighthouse-plugin-slop-copy', () => {
  it('explicitly states Copy + HTML-level AEO scope and excludes computed-style Design rules', () => {
    expect(lighthousePluginSlopCopy.category.description).toBe(PLUGIN_SCOPE_STATEMENT);
    expect(lighthousePluginSlopCopy.category.description).toMatch(/Copy \+ HTML-level AEO only/);
    expect(lighthousePluginSlopCopy.category.description).toMatch(/computed-style Design rules/);
    expect(lighthousePluginSlopCopy.audits).toHaveLength(3);
  });

  it('flags leaked chatbot markup and unfilled placeholders in SlopChatbotArtifactsAudit', () => {
    const html = `
      <!doctype html>
      <html lang="en">
      <body>
        <main>
          <p>Welcome to [Company Name]! :contentReference[oaicite:0]{index=0}</p>
          <p>As an AI language model, I hope this helps! Let me know if you need more.</p>
        </main>
      </body>
      </html>
    `;
    const res = SlopChatbotArtifactsAudit.audit({ MainDocumentContent: html });
    expect(res.score).toBe(0);
    expect(res.numericValue).toBeGreaterThanOrEqual(2);
    const ids = res.details.items.map((i) => i.id);
    expect(ids).toContain('chatbot_markup_leak');
    expect(ids).toContain('unfilled_placeholders');
  });

  it('scores prose copy patterns and HTML-level AEO checks from MainDocumentContent', () => {
    const cleanHtml = `
      <!doctype html>
      <html lang="en">
      <head>
        <link rel="alternate" type="text/markdown" href="/index.md">
      </head>
      <body>
        <main>
          <h1>Postgres connection pooling on bare metal</h1>
          <p>${'We benchmarked transaction pooling across 64 PgBouncer worker processes under a 12,000 RPS OLTP workload with 4ms p99 latency. '.repeat(12)}</p>
        </main>
      </body>
      </html>
    `;
    const copyRes = SlopCopyAudit.audit({ MainDocumentContent: cleanHtml });
    expect(copyRes.score).toBe(1);
    expect(copyRes.numericValue).toBe(0);

    const aeoRes = SlopHtmlAeoAudit.audit({ MainDocumentContent: cleanHtml });
    expect(aeoRes.score).toBe(1);

    const restrictedHtml = `
      <!doctype html>
      <html>
      <head>
        <meta name="robots" content="noindex, nosnippet">
      </head>
      <body><p>Blocked snippet page</p></body>
      </html>
    `;
    const blockedAeo = SlopHtmlAeoAudit.audit({ MainDocumentContent: restrictedHtml });
    expect(blockedAeo.score).toBeLessThan(1);
    expect(blockedAeo.details.items.map((i) => i.id)).toContain('html.indexable');
    expect(blockedAeo.details.items.map((i) => i.id)).toContain('ai.previewControls');
  });
});
