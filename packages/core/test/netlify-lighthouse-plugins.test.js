import { describe, it, expect, vi } from 'vitest';
import { onPostBuild, evaluateNetlifyGate } from '../../netlify-plugin-slop-detect/index.js';
import {
  lighthousePluginSlopCopy,
  SlopCopyAudit,
  SlopChatbotArtifactsAudit,
  SlopHtmlAeoAudit,
} from '../../lighthouse-plugin-slop-copy/plugin.js';

describe('R-12: netlify-plugin-slop-detect', () => {
  it('passes Clean pages and reports status via utils.status.show', async () => {
    const show = vi.fn();
    const failBuild = vi.fn();
    const res = await onPostBuild({
      inputs: {
        url: 'https://deploy-preview-42--example.netlify.app',
        failOn: 'heavy',
        failUnderScore: 27,
      },
      utils: { status: { show }, build: { failBuild } },
      scanImpl: async () => ({
        score: 4,
        tier: 'Clean',
        grade: 'A',
        patterns: [],
      }),
    });

    expect(res.passed).toBe(true);
    expect(show).toHaveBeenCalledTimes(1);
    expect(failBuild).not.toHaveBeenCalled();
  });

  it('calls utils.build.failBuild when Heavy tier or failUnderScore is breached', async () => {
    const show = vi.fn();
    const failBuild = vi.fn();
    const res = await onPostBuild({
      inputs: {
        url: 'https://deploy-preview-42--example.netlify.app',
        failOn: 'heavy',
        failUnderScore: 20,
      },
      utils: { status: { show }, build: { failBuild } },
      scanImpl: async () => ({
        score: 34,
        tier: 'Heavy',
        grade: 'D',
        patterns: [{ id: 'slop_fonts', triggered: true }],
      }),
    });

    expect(res.passed).toBe(false);
    expect(show).toHaveBeenCalledTimes(1);
    expect(failBuild).toHaveBeenCalledTimes(1);
    expect(failBuild.mock.calls[0][0]).toMatch(/exceeded failUnderScore cap of 20/);
  });

  it('never treats a blocked or failed scan as Clean', () => {
    const gate = evaluateNetlifyGate({ blocked: true, code: 'waf_challenge' }, { failOn: 'heavy' });
    expect(gate.passed).toBe(false);
    expect(gate.couldNotRun).toBe(true);
  });
});

describe('R-14: lighthouse-plugin-slop-copy', () => {
  it('exports valid Lighthouse category and audits scoped to Copy + HTML AEO only', () => {
    expect(lighthousePluginSlopCopy.category.title).toContain('Copy & HTML AEO');
    expect(lighthousePluginSlopCopy.category.description).toContain(
      'computed-style Design rules require full Slop Detector Chromium evaluation'
    );
    expect(lighthousePluginSlopCopy.audits.map((a) => a.implementation.meta.id)).toEqual([
      'slop-copy-patterns',
      'slop-chatbot-artifacts',
      'slop-html-aeo',
    ]);
  });

  it('executes Copy, Chatbot Artifacts, and HTML AEO audits on MainDocumentContent', () => {
    const sloppyHtml = `
      <!doctype html>
      <html lang="en">
      <head><meta name="robots" content="nosnippet"></head>
      <body>
        <p>In today's fast-paced digital world, it's not just a tool, it's a paradigm shift. Not only does it seamlessly leverage synergy, but also it empowers holistic transformation. Whether you're a startup or an enterprise, delve into the realm of bespoke solutions. :contentReference[oaicite:1]{index=1} [Insert Company Name] ${'We build software for teams across the globe. '.repeat(25)}</p>
      </body>
      </html>
    `;
    const copyAudit = SlopCopyAudit.audit({ MainDocumentContent: sloppyHtml });
    expect(copyAudit.numericValue).toBeGreaterThan(0);
    expect(copyAudit.score).toBeLessThan(1);

    const artifactAudit = SlopChatbotArtifactsAudit.audit({ MainDocumentContent: sloppyHtml });
    expect(artifactAudit.score).toBe(0);

    const aeoAudit = SlopHtmlAeoAudit.audit({ MainDocumentContent: sloppyHtml });
    expect(aeoAudit.score).toBeLessThan(1);
  });
});
