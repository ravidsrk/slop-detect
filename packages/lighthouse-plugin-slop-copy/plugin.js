// Lighthouse Plugin: lighthouse-plugin-slop-copy (R-14 / #330).
//
// Scope constraint (per Lighthouse plugin handbook): Lighthouse plugins cannot
// gather custom computed-style artifacts; they only receive built-in artifacts
// such as MainDocumentContent, MetaElements, and LinkElements.
// Therefore this plugin explicitly audits the Copy axis, paste/chatbot
// artifacts (C-02, C-03, C-05, C-06), and HTML-level AEO checks ONLY. It never
// claims to evaluate the computed-style Design axis.

let coreMod;
try {
  coreMod = await import('@slop-detect/core');
} catch {
  const siteMod = await import('../core/src/site.ts');
  const aeoMod = await import('../core/src/aeo.ts');
  const copyMod = await import('../core/src/copyPatterns.ts');
  coreMod = {
    htmlToCopyInput: siteMod.htmlToCopyInput,
    parsePreviewDirectives: aeoMod.parsePreviewDirectives,
    detectPromptInjection: aeoMod.detectPromptInjection,
    scoreCopy(textCtx) {
      const ctx = textCtx || { text: '', headings: [], paragraphs: [], wordCount: 0 };
      const patterns = copyMod.COPY_PATTERNS.map((p) => {
        const ev = p.match(ctx);
        const triggered = Boolean(ev?.triggered);
        const isReview = p.weight === 0 || p.status === 'review' || p.status === 'retired';
        return {
          id: p.id,
          label: p.label,
          weight: p.weight,
          status: triggered ? (isReview ? 'review' : 'fail') : 'pass',
          triggered,
          evidence: ev,
        };
      });
      const score = Math.min(
        100,
        patterns.filter((p) => p.triggered && p.weight > 0).reduce((s, p) => s + p.weight, 0)
      );
      const tier = score >= 20 ? 'Heavy' : score >= 8 ? 'Mild' : 'Clean';
      return { score, tier, patterns };
    },
  };
}

const { htmlToCopyInput, scoreCopy, parsePreviewDirectives, detectPromptInjection } = coreMod;

export const PLUGIN_SCOPE_STATEMENT =
  'Audits visible page prose for default-template copy patterns, leaked chatbot citation/turn artifacts, and HTML-level AEO eligibility. Scope note: covers Copy + HTML-level AEO only; computed-style Design rules require full Slop Detector Chromium evaluation and are not available in a Lighthouse plugin.';

const ARTIFACT_PATTERN_IDS = new Set([
  'chatbot_markup_leak',
  'chatbot_reply_residue',
  'unfilled_placeholders',
  'leaked_markdown',
  'hidden_tag_characters',
  'invisible_characters',
]);

export function evaluateLighthouseCopy(artifacts = {}) {
  const html = String(artifacts.MainDocumentContent || '');
  const copyInput = htmlToCopyInput(html);
  const copyResult = scoreCopy(copyInput);

  const triggered = (copyResult.patterns || []).filter((p) => p.triggered);
  const artifactHits = triggered.filter((p) => ARTIFACT_PATTERN_IDS.has(p.id));

  // Lighthouse audit score is 0..1 where 1 is clean
  const copyLighthouseScore = Math.max(
    0,
    Math.min(1, +((100 - (copyResult.score || 0)) / 100).toFixed(2))
  );
  const artifactLighthouseScore = artifactHits.length === 0 ? 1 : 0;

  return {
    copyResult,
    triggered,
    artifactHits,
    copyLighthouseScore,
    artifactLighthouseScore,
  };
}

export function evaluateLighthouseHtmlAeo(artifacts = {}) {
  const html = String(artifacts.MainDocumentContent || '');
  const metaElements = Array.isArray(artifacts.MetaElements) ? artifacts.MetaElements : [];
  const linkElements = Array.isArray(artifacts.LinkElements) ? artifacts.LinkElements : [];

  const findings = [];

  // 1. html.indexable — check meta robots for noindex
  const metaRobots = metaElements
    .filter((m) => /^(?:robots|googlebot|bingbot)$/i.test(String(m?.name || '')))
    .map((m) => String(m?.content || '').toLowerCase());
  const htmlNoindex =
    /\bnoindex\b/i.test(
      (html.match(/<meta[^>]+name=["']?(?:robots|googlebot)["']?[^>]*>/gi) || []).join(' ')
    ) || metaRobots.some((c) => c.includes('noindex'));
  if (htmlNoindex) {
    findings.push({
      id: 'html.indexable',
      status: 'fail',
      message: 'Page contains a noindex meta robots directive.',
    });
  }

  // 2. ai.previewControls — nosnippet / max-snippet:0 / noarchive
  const preview = parsePreviewDirectives({}, html);
  if (preview.status === 'fail' || preview.status === 'warn') {
    findings.push({
      id: 'ai.previewControls',
      status: preview.status === 'fail' ? 'fail' : 'review',
      message: `Preview directives restrict snippet extraction (${(preview.engines?.google?.directives || []).join(', ') || 'restricted'}).`,
    });
  }

  // 3. html.linkAlternate — check for <link rel="alternate" type="text/markdown">
  const hasMdAlternate =
    linkElements.some(
      (l) =>
        String(l?.rel || '')
          .toLowerCase()
          .includes('alternate') && /text\/markdown/i.test(String(l?.type || l?.mimeType || ''))
    ) || /<link[^>]+type=["']?text\/markdown["']?[^>]*>/i.test(html);

  // 4. ai.manipulation — prompt injection in HTML comments / JSON-LD / hidden elements
  const injection = detectPromptInjection({ html, headers: {} });
  if (injection.detected) {
    findings.push({
      id: 'ai.manipulation',
      status: 'review',
      message: `Potential prompt-injection or hidden instruction surface (${injection.hits.length} hit(s)).`,
    });
  }

  const requiredFailed = findings.filter((f) => f.status === 'fail').length;
  const score = requiredFailed === 0 ? 1 : Math.max(0, +(1 - requiredFailed * 0.5).toFixed(2));

  return {
    score,
    hasMdAlternate,
    findings,
  };
}

export const SlopCopyAudit = {
  meta: {
    id: 'slop-copy-patterns',
    title: 'Prose avoids default-template copy patterns',
    failureTitle: 'Prose matches default-template copy patterns',
    description:
      'Checks visible page prose against the Slop Detector copy catalogue (buzzword density, antithesis constructions, filler openers, formulaic closers). Covers Copy axis only; computed-style Design rules are not evaluated.',
    requiredArtifacts: ['MainDocumentContent'],
  },
  audit(artifacts) {
    const { copyResult, triggered, copyLighthouseScore } = evaluateLighthouseCopy(artifacts);
    return {
      score: copyLighthouseScore,
      numericValue: copyResult.score,
      numericUnit: 'unitless',
      displayValue: `Copy slop score: ${copyResult.score}/100 (${copyResult.tier})`,
      details: {
        type: 'table',
        headings: [
          { key: 'id', itemType: 'text', text: 'Pattern ID' },
          { key: 'label', itemType: 'text', text: 'Pattern' },
          { key: 'status', itemType: 'text', text: 'Status' },
          { key: 'weight', itemType: 'numeric', text: 'Weight' },
        ],
        items: triggered.map((p) => ({
          id: p.id,
          label: p.label,
          status: p.status,
          weight: p.weight,
        })),
      },
    };
  },
};

export const SlopChatbotArtifactsAudit = {
  meta: {
    id: 'slop-chatbot-artifacts',
    title: 'No leaked chatbot citation markup, turn residue, or unfilled placeholders',
    failureTitle: 'Page contains leaked chatbot artifacts or unfilled placeholders',
    description:
      'Flags leaked oaicite/attributableIndex citation tokens (C-02), assistant turn framing (C-03), unfilled template brackets (C-05), and unrendered raw Markdown (C-06).',
    requiredArtifacts: ['MainDocumentContent'],
  },
  audit(artifacts) {
    const { artifactHits, artifactLighthouseScore } = evaluateLighthouseCopy(artifacts);
    return {
      score: artifactLighthouseScore,
      numericValue: artifactHits.length,
      numericUnit: 'unitless',
      displayValue:
        artifactHits.length === 0
          ? '0 paste artifacts'
          : `${artifactHits.length} paste artifact pattern(s) flagged`,
      details: {
        type: 'table',
        headings: [
          { key: 'id', itemType: 'text', text: 'Artifact ID' },
          { key: 'label', itemType: 'text', text: 'Description' },
        ],
        items: artifactHits.map((p) => ({
          id: p.id,
          label: p.label,
        })),
      },
    };
  },
};

export const SlopHtmlAeoAudit = {
  meta: {
    id: 'slop-html-aeo',
    title: 'HTML-level AEO eligibility (indexability, preview controls, manipulation hygiene)',
    failureTitle: 'HTML directives restrict search/answer-engine snippet eligibility',
    description:
      'Inspects MainDocumentContent for meta robots indexability, nosnippet/max-snippet:0 preview locks, text/markdown link alternates, and hidden prompt-injection surfaces.',
    requiredArtifacts: ['MainDocumentContent'],
  },
  audit(artifacts) {
    const res = evaluateLighthouseHtmlAeo(artifacts);
    return {
      score: res.score,
      numericValue: res.findings.length,
      numericUnit: 'unitless',
      displayValue:
        res.findings.length === 0
          ? 'Eligible (HTML checks passed)'
          : `${res.findings.length} HTML AEO finding(s)`,
      details: {
        type: 'table',
        headings: [
          { key: 'id', itemType: 'text', text: 'Check ID' },
          { key: 'status', itemType: 'text', text: 'Status' },
          { key: 'message', itemType: 'text', text: 'Finding' },
        ],
        items: res.findings,
      },
    };
  },
};

export const lighthousePluginSlopCopy = {
  audits: [
    {
      path: 'lighthouse-plugin-slop-copy/audits/slop-copy-patterns',
      implementation: SlopCopyAudit,
    },
    {
      path: 'lighthouse-plugin-slop-copy/audits/slop-chatbot-artifacts',
      implementation: SlopChatbotArtifactsAudit,
    },
    { path: 'lighthouse-plugin-slop-copy/audits/slop-html-aeo', implementation: SlopHtmlAeoAudit },
  ],
  category: {
    title: 'Slop Detector (Copy & HTML AEO)',
    description: PLUGIN_SCOPE_STATEMENT,
    auditRefs: [
      { id: 'slop-copy-patterns', weight: 3 },
      { id: 'slop-chatbot-artifacts', weight: 4 },
      { id: 'slop-html-aeo', weight: 3 },
    ],
  },
};

export default lighthousePluginSlopCopy;
