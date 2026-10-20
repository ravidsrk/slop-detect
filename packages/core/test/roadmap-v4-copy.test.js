// Comprehensive unit tests for Roadmap v4 Copy Axis:
// #231 FIX-11, #232 FIX-12, #265 C-01, #266 C-02, #267 C-03, #268 C-04, #269 C-05,
// #270 C-06, #271 C-07, #272 C-08, #273 C-09, #275 C-12, #276 C-13, #277 C-14,
// #278 C-15, #279 C-16, #200, #201, #202.

import { test, expect, describe } from 'vitest';
import {
  COPY_PATTERNS,
  scoreCopy,
  scoreMultiPageCopy,
  detectEnglishProse,
  computeFightinWordsLogOdds,
  computeVocabularyDrift,
  evaluateWatchListCandidate,
  buildNormalizedTextView,
  extractOriginalSpan,
} from '@slop-detect/core';

const LONG_PROSE_PADDING =
  'We connect directly to your production Postgres database and stream row-level changes over a dedicated TLS tunnel. ' +
  'Engineers configure alert thresholds in versioned YAML files, test rules locally against staging snapshots, and deploy changes through standard pull requests. ' +
  'Every query plan is logged with microsecond latency histograms so on-call teams can isolate slow joins before customers notice any degradation. ' +
  'Backups run hourly to object storage in three availability zones with automated point-in-time recovery verification every morning. ';

describe('#231 FIX-11: Unicode artifacts split + French U+202F exclusion', () => {
  test('French narrow no-break spaces (U+202F) before punctuation never trigger unicode_artifacts or invisible_characters', () => {
    const french =
      'Pourquoi choisir notre plateforme\u202F? Voici trois raisons\u202F: la vitesse\u202F; la sécurité\u202F! ' +
      '«\u202FNous avons réduit nos coûts de moitié\u202F» déclare notre client principal. ' +
      LONG_PROSE_PADDING +
      LONG_PROSE_PADDING;
    const res = scoreCopy({ text: french, proseWordCount: 320, wordCount: 320 });
    expect(res.patterns.find((p) => p.id === 'unicode_artifacts').triggered).toBe(false);
    expect(res.patterns.find((p) => p.id === 'invisible_characters').triggered).toBe(false);
  });

  test('hidden_tag_characters catches U+E0000..U+E007F tag smuggling and fake_bold_math_alnum catches U+1D400 letters', () => {
    const tagged = 'Normal visible sentence\u{E0041}\u{E0042}\u{E0043} with hidden tags.';
    const resTag = scoreCopy({ text: tagged, proseWordCount: 20, wordCount: 20 });
    // Artifact patterns run even on < 150 prose words!
    const tagPat = resTag.patterns.find((p) => p.id === 'hidden_tag_characters');
    expect(tagPat.triggered).toBe(true);
    expect(tagPat.status).toBe('review');
    expect(tagPat.weight).toBe(0);
    expect(resTag.evidence.find((e) => e.id === 'hidden_tag_characters').scoreDelta).toBe(0);

    const mathBold = 'Check out \uD835\uDDD4\uD835\uDDD6\uD835\uDDE0\uD835\uDDD8 today.';
    const resMath = scoreCopy({ text: mathBold, proseWordCount: 10, wordCount: 10 });
    expect(resMath.patterns.find((p) => p.id === 'fake_bold_math_alnum').triggered).toBe(true);
  });
});

describe('#265 C-01: Prose length and language gates', () => {
  const buzzwordHeavy =
    "In today's fast-paced world, we leverage seamless, robust, transformative, cutting-edge, holistic, bespoke, unparalleled synergy to empower teams. " +
    "It's not just a tool — it's a revolution. Not only does it scale, but also it elevates every workflow.";

  test('< 150 prose words skips statistical rules (status: unknown) while still running artifact rules', () => {
    const textWithArtifact = `${buzzwordHeavy} Visit https://example.com?utm_source=chatgpt.com and [Insert Company Name].`;
    const res = scoreCopy({
      text: textWithArtifact,
      wordCount: 50,
      proseWordCount: 50,
      links: [{ href: 'https://example.com?utm_source=chatgpt.com', text: 'link' }],
    });
    expect(res.thin).toBe(true);
    expect(res.proseConfidence).toBe('insufficient_prose');
    const buzz = res.patterns.find((p) => p.id === 'buzzword_density');
    expect(buzz.triggered).toBe(false);
    expect(buzz.status).toBe('unknown');

    // Deterministic artifact rules still fire!
    const utm = res.patterns.find((p) => p.id === 'ai_referral_utm_links');
    const placeholder = res.patterns.find((p) => p.id === 'unfilled_placeholders');
    expect(utm.triggered).toBe(true);
    expect(placeholder.triggered).toBe(true);
  });

  test('150-299 prose words halves statistical rule weights vs >= 300 prose words full weight', () => {
    const mediumRes = scoreCopy({
      text: buzzwordHeavy + ' ' + LONG_PROSE_PADDING,
      wordCount: 200,
      proseWordCount: 200,
    });
    const fullRes = scoreCopy({
      text: buzzwordHeavy + ' ' + LONG_PROSE_PADDING + ' ' + LONG_PROSE_PADDING,
      wordCount: 350,
      proseWordCount: 350,
    });
    expect(mediumRes.proseConfidence).toBe('low');
    expect(fullRes.proseConfidence).toBe('high');
    expect(mediumRes.score).toBeLessThan(fullRes.score);
    expect(mediumRes.score).toBeGreaterThan(0);
  });

  test('non-English pages skip English statistical rules and run artifact checks only', () => {
    const spanish =
      'Nuestra plataforma permite a los equipos de ingeniería gestionar bases de datos distribuidas con copias de seguridad automáticas cada hora y latencia mínima en todas las regiones del mundo. ' +
      'Conecta tu repositorio hoy mismo para empezar a desplegar sin configuraciones manuales complicadas. ' +
      '[Insert Company Name] contentReference[oaicite:0]{index=0}';
    const langCheck = detectEnglishProse(spanish, 'es');
    expect(langCheck.isEnglish).toBe(false);

    const res = scoreCopy({ text: spanish, lang: 'es', wordCount: 200, proseWordCount: 200 });
    expect(res.isEnglish).toBe(false);
    expect(res.patterns.find((p) => p.id === 'buzzword_density').status).toBe('unknown');
    expect(res.patterns.find((p) => p.id === 'chatbot_markup_leak').triggered).toBe(true);
    expect(res.patterns.find((p) => p.id === 'unfilled_placeholders').triggered).toBe(true);
  });
});

describe('#266 C-02..#270 C-06, #272 C-08, #273 C-09, #276 C-13, #279 C-16, #200, #202: Copy patterns', () => {
  test('C-02 chatbot_markup_leak, C-03 chatbot_reply_residue, C-04 ai_referral_utm_links, C-05 unfilled_placeholders, C-06 leaked_markdown', () => {
    const sample =
      "Certainly! Here's a compelling hero section for your landing page:\n\n" +
      '### Unlock Growth for [Insert Company Name]\n\n' +
      'We build **scalable** tools for [Your Industry] teams :contentReference[oaicite:1]{index=1}. ' +
      'See [our docs](https://acme.example.com/docs) for details.\n' +
      "Let me know if you'd like me to adjust the tone!";
    const res = scoreCopy({
      text: sample,
      wordCount: 80,
      proseWordCount: 80,
      links: [{ href: 'https://vendor.test/pricing?utm_source=chatgpt.com', text: 'Pricing' }],
    });
    expect(res.patterns.find((p) => p.id === 'chatbot_markup_leak').triggered).toBe(true);
    expect(res.patterns.find((p) => p.id === 'chatbot_reply_residue').triggered).toBe(true);
    expect(res.patterns.find((p) => p.id === 'ai_referral_utm_links').triggered).toBe(true);
    expect(res.patterns.find((p) => p.id === 'unfilled_placeholders').triggered).toBe(true);
    expect(res.patterns.find((p) => p.id === 'leaked_markdown').triggered).toBe(true);
  });

  test('C-07 decay re-weighting: em_dash_overload has weight 2, counts U+2014 only (not en-dash), and requires co-occurrence', () => {
    const emPat = COPY_PATTERNS.find((p) => p.id === 'em_dash_overload');
    expect(emPat.weight).toBe(2);
    expect(emPat.status).toBe('decaying');

    // En-dashes (U+2013) in numeric ranges must NOT trigger em_dash_overload
    const enDashText =
      'Open Monday \u2013 Friday from 9:00 \u2013 17:00 for teams of 10 \u2013 50 people across 2020 \u2013 2026 in 5 \u2013 10 regions. ' +
      LONG_PROSE_PADDING +
      LONG_PROSE_PADDING;
    const enRes = scoreCopy({ text: enDashText, wordCount: 320, proseWordCount: 320 });
    expect(enRes.patterns.find((p) => p.id === 'em_dash_overload').triggered).toBe(false);

    // Isolated em_dash_overload triggers but contributes 0 points without co-occurring copy pattern
    const isolatedEm =
      'We ship software \u2014 fast \u2014 for small clinics \u2014 every day \u2014 without downtime \u2014 across ten states \u2014 with real support \u2014 and clear pricing \u2014 always. ' +
      LONG_PROSE_PADDING +
      LONG_PROSE_PADDING;
    const isoRes = scoreCopy({ text: isolatedEm, wordCount: 320, proseWordCount: 320 });
    expect(isoRes.patterns.find((p) => p.id === 'em_dash_overload').triggered).toBe(true);
    expect(isoRes.score).toBe(0);
    expect(isoRes.adjustments.some((a) => a.ruleId === 'copy_co_occurrence_gate')).toBe(true);
  });

  test('C-08 bare_antithesis, C-09 emoji_heading_ratio, C-13 announced_structure & restated_thesis_closer, C-16 context_leak_copy, #200, #202', () => {
    const paragraphs = [
      'In this article, we will explore distributed postgres replication for modern platform engineering teams that require deterministic failover.',
      "Here's what makes our platform different: it's not a wrapper, it's a database. No bloat, no lock-in, just speed. Your data never leaves your browser.",
      'Our engine processes events, unlocking real-time analytics. It syncs state across regions, empowering global teams. It validates schemas automatically, streamlining every deployment.',
      'In conclusion, distributed postgres replication for modern platform engineering teams delivers deterministic failover across every region.',
    ];
    const text = paragraphs.join('\n\n') + '\n\n' + LONG_PROSE_PADDING;
    const res = scoreCopy({
      text,
      headings: [
        'Distributed postgres replication for modern platform engineering teams',
        '🚀 Deploy Faster',
        '✨ Scale Globally',
        '⚡ Zero Config',
        '🔥 Real-time Sync',
        '💡 Smart Alerts',
      ],
      paragraphs,
      attributes: [{ attr: 'src', value: 'https://i.pravatar.cc/150?img=3' }],
      wordCount: 350,
      proseWordCount: 350,
    });
    expect(res.patterns.find((p) => p.id === 'bare_antithesis').triggered).toBe(true);
    expect(res.patterns.find((p) => p.id === 'emoji_heading_ratio').triggered).toBe(true);
    expect(res.patterns.find((p) => p.id === 'announced_structure').triggered).toBe(true);
    expect(res.patterns.find((p) => p.id === 'restated_thesis_closer').triggered).toBe(true);
    expect(res.patterns.find((p) => p.id === 'context_leak_copy').triggered).toBe(true);
    expect(res.patterns.find((p) => p.id === 'trailing_participial_clauses').triggered).toBe(true);
    expect(res.patterns.find((p) => p.id === 'structural_fake_social_proof').triggered).toBe(true);
  });
});

describe('#275 C-12: Unicode confusables & zero-width normalization pre-pass', () => {
  test('catches buzzwords obfuscated with Cyrillic homoglyphs and soft hyphens and extracts original raw span', () => {
    // 'lеvеrаgе' with Cyrillic е (U+0435) and а (U+0430), plus 's\u00ADeamless' with soft hyphen
    const obfuscated =
      'We l\u0435v\u0435r\u0430g\u0435 s\u00ADeamless, r\u043Ebust, tr\u0430nsformative, cutting-\u0435dge solutions. ' +
      LONG_PROSE_PADDING +
      LONG_PROSE_PADDING;
    const view = buildNormalizedTextView(obfuscated);
    expect(view.normalized).toContain('leverage seamless, robust, transformative, cutting-edge');
    const idx = view.normalized.indexOf('leverage');
    const orig = extractOriginalSpan(view, idx, idx + 'leverage'.length);
    expect(orig).toBe('l\u0435v\u0435r\u0430g\u0435');

    const res = scoreCopy({ text: obfuscated, wordCount: 320, proseWordCount: 320 });
    const buzz = res.patterns.find((p) => p.id === 'buzzword_density');
    expect(buzz.triggered).toBe(true);
  });
});

describe('#277 C-14: Multi-page site copy aggregation + boilerplate removal', () => {
  test('runs artifact checks before boilerplate stripping, strips shared >50% boilerplate, and requires >= 5 qualifying pages', () => {
    const sharedNav =
      'In today’s fast-paced world, we leverage seamless, robust, transformative, cutting-edge solutions across all pages?utm_source=chatgpt.com.';
    const makeUniqueProse = (i) =>
      Array.from(
        { length: 8 },
        (_, s) =>
          `On service node ${i} shard ${s}, we connect directly to your production Postgres database and stream row-level changes over a dedicated TLS tunnel with deterministic latency histograms for on-call engineers.`
      ).join(' ');
    const makePage = (i) => ({
      url: `https://site.example/page-${i}`,
      text: `${sharedNav}\n\n${makeUniqueProse(i)}`,
      links: [{ href: 'https://site.example/?utm_source=chatgpt.com', text: 'Nav' }],
    });

    const tooFew = scoreMultiPageCopy([makePage(1), makePage(2), makePage(3)]);
    expect(tooFew.status).toBe('insufficient_pages');
    expect(tooFew.artifactFindings.length).toBeGreaterThan(0);

    const fivePages = scoreMultiPageCopy([
      makePage(1),
      makePage(2),
      makePage(3),
      makePage(4),
      makePage(5),
    ]);
    expect(fivePages.status).toBe('ok');
    expect(fivePages.qualifyingPages).toBe(5);
    // Because sharedNav appeared on 100% (>50%) of pages, it was stripped before statistical scoring!
    expect(fivePages.pages[0].strippedChunks).toBeGreaterThanOrEqual(1);
    expect(fivePages.score).toBe(0);
    expect(fivePages.tier).toBe('Clean');
    expect(fivePages.percentiles).toEqual({ p10: 0, p50: 0, p90: 0 });
  });
});

describe('#201 & #278 C-15: Monroe Fightin Words log-odds pipeline & permanently banned signals', () => {
  test('computeFightinWordsLogOdds and computeVocabularyDrift compute reproducible z-scores without hand-made tier lists', () => {
    const aiPages = [
      { domain: 'a1.test', text: 'delve tapestry delve tapestry delve tapestry delve tapestry delve' },
      { domain: 'a2.test', text: 'delve tapestry delve tapestry delve tapestry delve tapestry delve' },
      { domain: 'a3.test', text: 'delve tapestry delve tapestry delve tapestry delve tapestry delve' },
    ];
    const humanPages = [
      { domain: 'h1.test', text: 'database query latency index replica snapshot wal checkpoint' },
      { domain: 'h2.test', text: 'database query latency index replica snapshot wal checkpoint' },
      { domain: 'h3.test', text: 'database query latency index replica snapshot wal checkpoint' },
    ];
    const ranked = computeFightinWordsLogOdds(aiPages, humanPages, { minZ: 1.5, minSites: 3 });
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].term).toBe('delve');
    expect(ranked[0].zScore).toBeGreaterThan(1.5);

    const drift = computeVocabularyDrift(aiPages, humanPages, ['delve', 'tapestry']);
    expect(drift.deltas.delve).toBeGreaterThan(0);
    expect(drift.meanDelta).toBeGreaterThan(0);

    const watch = evaluateWatchListCandidate({
      term: 'delve',
      independentDomains: ['a1.test', 'a2.test', 'a3.test'],
      likelihoodRatio: 4.5,
    });
    expect(watch.admitted).toBe(true);
  });

  test('C-15: formality, readability, sentiment, and perplexity are never in COPY_PATTERNS', () => {
    const ids = COPY_PATTERNS.map((p) => p.id).join(' ');
    expect(ids).not.toMatch(/formality|readability|flesch|sentiment|perplexity/i);
  });
});
