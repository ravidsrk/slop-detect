// Shared component library (functions/_ui.tsx) tests.
//
// Each component is rendered to a string and asserted on its key marks: the light
// editorial-instrument tokens, dogfood-clean markup (no slop fonts, no gradient or
// background-clip text, no purple CTA, flat 1px surfaces), the nav/footer links and
// framing, and the monitor card's additive-flag JS shape — mirroring the floor's
// landing.test.js / inline-scripts.test.js assertions. hono/jsx components are
// plain functions; calling one returns a node whose .toString() renders it.

import { test, expect } from 'vitest';
import {
  UI_CSS,
  Nav,
  Footer,
  LogoLockup,
  ScanInput,
  Button,
  SampleChip,
  StatsStrip,
  LetterAvatar,
  LeaderboardRow,
  ScoreTierBadge,
  LiveBadge,
  MonitorCard,
  CodeBlock,
  SectionLedger,
  Cta,
} from '../functions/_ui.tsx';
import { BRAND_CSS, BRAND_FONTS_HEAD } from '../functions/_brand.ts';
import { tierFill, tierText, badgeColors, avatarColor } from '../functions/_theme.ts';

const r = (node) => node.toString();
const SHEET = BRAND_CSS + UI_CSS;

// Pull the (single) executable inline <script> body out of a rendered component.
function inlineScript(html) {
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  return m ? m[1] : '';
}

// ── stylesheet hygiene: the shared styles must themselves score Clean ──────────
test('UI_CSS loads no AI-default font faces; brand faces are present', () => {
  expect(/Inter|Geist|Space Grotesk/.test(UI_CSS), 'no slop faces in UI_CSS').toBe(false);
  expect(/Inter|Geist|Space\+Grotesk/.test(BRAND_FONTS_HEAD), 'no slop faces requested').toBe(
    false
  );
  expect(BRAND_FONTS_HEAD).toMatch(/Newsreader/);
  expect(BRAND_FONTS_HEAD).toMatch(/Libre\+Franklin/);
  expect(BRAND_FONTS_HEAD).toMatch(/JetBrains\+Mono/);
});

test('UI_CSS has no gradient or background-clip text (solid ink only)', () => {
  expect(/background-clip\s*:\s*text/i.test(UI_CSS)).toBe(false);
  expect(/-webkit-background-clip\s*:\s*text/i.test(UI_CSS)).toBe(false);
  expect(/gradient\(/i.test(UI_CSS), 'flat surfaces, no gradient layers').toBe(false);
});

test('shared styles are light-first with no purple CTA', () => {
  expect(SHEET).toMatch(/color-scheme:\s*light/);
  expect(UI_CSS).toMatch(/var\(--panel\)/);
  // purple #7A4D9A is a letter-avatar data swatch only (inline via _theme), never a CTA
  expect(UI_CSS.includes('#7A4D9A'), 'no purple in the stylesheet').toBe(false);
});

test('flat surfaces: 1px borders, and the badge is the only shadow', () => {
  expect(UI_CSS).toMatch(/1px solid/);
  expect((UI_CSS.match(/box-shadow/g) || []).length, 'exactly one shadow').toBe(1);
  expect(UI_CSS).toMatch(/box-shadow:var\(--shadow-badge\)/);
});

// ── logo lockup ────────────────────────────────────────────────────────────────
test('LogoLockup is lowercase, hyphenated, monospace, with light + dark variants', () => {
  const light = r(LogoLockup({ href: '/' }));
  expect(light).toContain('slop-detect');
  expect(light).not.toContain('Slop-Detect');
  expect(light).toContain('class="logo-word"');
  expect(light).toContain('#1FA85E'); // clean-green dot on light
  const dark = r(LogoLockup({ dark: true }));
  expect(dark).toContain('logo-word-dark');
  expect(dark).toContain('#3FBE7A'); // brighter dot on dark
  expect(dark).toContain('#F4F5F2'); // paper brackets on dark
  expect(UI_CSS).toMatch(/\.logo-word\{[^}]*white-space:nowrap/);
});

// ── navigation bar ───────────────────────────────────────────────────────────
test('Nav links leaderboard/docs/brand/github and inks the active link', () => {
  const nav = r(Nav({ origin: 'https://slop-detect.com', current: '/docs' }));
  expect(nav).toMatch(/href="https:\/\/slop-detect\.com\/leaderboard"/);
  expect(nav).toMatch(/href="https:\/\/slop-detect\.com\/docs"/);
  expect(nav).toMatch(/href="https:\/\/slop-detect\.com\/brand"/);
  expect(nav).toContain('github.com/ravidsrk/slop-detect');
  expect(nav).toContain('class="nav-gh"'); // github outline button
  expect(nav).toMatch(/nav-link nav-link-active/); // active link rule
  expect(nav).toMatch(/aria-current="page"/);
});

test('Nav is sticky, translucent paper, with a hairline border-bottom', () => {
  expect(UI_CSS).toMatch(/\.nav\{[^}]*position:sticky/);
  expect(UI_CSS).toMatch(/\.nav\{[^}]*background:rgba\(244,245,242/);
  expect(UI_CSS).toMatch(/\.nav\{[^}]*border-bottom:1px solid var\(--border\)/);
});

test('Nav can carry the compact rescan input (Result nav)', () => {
  expect(r(Nav({ rescan: true }))).toContain('scan-rescan');
});

// ── footer ───────────────────────────────────────────────────────────────────
test('Footer keeps the framing lines and the dark register', () => {
  const ft = r(Footer({ origin: '', domain: 'bolt.new' }));
  expect(ft).toContain('A fingerprint, not a verdict.');
  expect(ft).toContain('Reproduce: npx slop-detect bolt.new');
  expect(ft).toContain('#3FBE7A'); // dark reticle dot
  expect(ft).toContain('slop-detect'); // wordmark
  expect(ft).toContain('github.com/ravidsrk/slop-detect');
  expect(UI_CSS).toMatch(/\.ft\{[^}]*background:var\(--ink-deep\)/);
  expect(BRAND_CSS).toMatch(/--ink-deep:#16170F/); // the dark band hex
});

test('Footer default reproduce string uses a <domain> placeholder', () => {
  expect(r(Footer({}))).toContain('Reproduce: npx slop-detect &lt;domain&gt;');
});

// ── scan input (four variants) ─────────────────────────────────────────────────
test('ScanInput renders all four variants, each with a labelled input + submit', () => {
  for (const v of ['hero', 'rescan', 'leaderboard', 'monitor']) {
    const s = r(ScanInput({ variant: v }));
    expect(s, v).toContain(`scan-${v}`);
    expect(s, v).toMatch(/<label class="sr-only" for="scan-/);
    expect(s, v).toMatch(/<input[^>]*id="scan-/);
    expect(s, v).toMatch(/<button class="scan-go" type="submit">/);
    expect(s, v).toContain('https://'); // mono prefix
  }
});

test('ScanInput hero has the yourdomain placeholder and search semantics', () => {
  const s = r(ScanInput({}));
  expect(s).toContain('placeholder="yourdomain.com"');
  expect(s).toMatch(/role="search"/);
  expect(s).toMatch(/aria-label="Scan a domain/);
});

// ── buttons ──────────────────────────────────────────────────────────────────
test('Button variants: primary ink->green, outline, monitor green-on-dark', () => {
  expect(r(Button({ variant: 'primary', label: 'Scan' }))).toMatch(
    /<button class="btn btn-primary"/
  );
  expect(r(Button({ variant: 'outline', href: '/x', label: 'More' }))).toMatch(
    /<a class="btn btn-outline" href="\/x"/
  );
  expect(r(Button({ variant: 'monitor', label: 'Monitor' }))).toContain('btn-monitor');
  expect(UI_CSS).toMatch(/\.btn-primary\{[^}]*background:var\(--text\)/);
  expect(UI_CSS).toMatch(/\.btn-primary:hover\{background:var\(--clean-text\)\}/);
  expect(UI_CSS).toMatch(/\.btn-monitor\{[^}]*background:var\(--clean\)/);
});

test('Button renders <a> with href and <button> without', () => {
  expect(r(Button({ href: '/a', label: 'x' })).startsWith('<a ')).toBe(true);
  expect(r(Button({ label: 'x' })).startsWith('<button ')).toBe(true);
});

// ── sample chip ──────────────────────────────────────────────────────────────
test('SampleChip shows a tier dot and a domain · grade label', () => {
  const c = r(
    SampleChip({ href: '/score/bolt.new', domain: 'bolt.new', grade: 'D+', tier: 'Heavy' })
  );
  expect(c).toContain('bolt.new · D+');
  expect(c).toContain(tierFill('Heavy')); // #C9402E dot
  expect(c).toMatch(/class="chip"/);
});

// ── stats strip ──────────────────────────────────────────────────────────────
test('StatsStrip colors the numerals and separates clauses with a middot', () => {
  const out = r(
    StatsStrip({
      segments: [
        '12,067 pages scanned',
        ['median slop score ', { n: 31, color: tierText('Mild') }],
        [{ n: '18%', color: tierText('Clean') }, ' score Clean'],
      ],
    })
  );
  expect(out).toContain('12,067 pages scanned');
  expect(out).toContain(tierText('Mild')); // median in mild-text
  expect(out).toContain(tierText('Clean')); // clean percent in clean-text
  expect(out).toContain('stats-mid');
});

// ── letter-avatar ────────────────────────────────────────────────────────────
test('LetterAvatar is deterministic from the _theme palette', () => {
  const a = r(LetterAvatar({ name: 'bolt.new' }));
  expect(a).toBe(r(LetterAvatar({ name: 'bolt.new' }))); // stable per name
  expect(a).toContain(avatarColor('bolt.new'));
  expect(a).toContain('>B<'); // initial, uppercased
});

// ── leaderboard row ──────────────────────────────────────────────────────────
test('LeaderboardRow is a 16px 1fr auto grid with the grade in its tier color', () => {
  const row = r(
    LeaderboardRow({
      rank: 1,
      domain: 'stripe.com',
      score: 4,
      grade: 'A',
      tier: 'Clean',
      href: '/score/stripe.com',
    })
  );
  expect(row).toContain('stripe.com');
  expect(row).toContain('lr-grade');
  expect(row).toContain(tierText('Clean'));
  expect(UI_CSS).toMatch(/grid-template-columns:16px 1fr auto/);
});

// ── score-tier badge ─────────────────────────────────────────────────────────
test('ScoreTierBadge shows the uppercase tier in its text color plus score grade', () => {
  const b = r(ScoreTierBadge({ tier: 'Mild', score: 18, grade: 'C+' }));
  expect(b).toContain('MILD');
  expect(b).toContain(tierText('Mild'));
  expect(b).toContain(tierFill('Mild'));
  expect(b).toContain('18 C+');
});

// ── live badge ───────────────────────────────────────────────────────────────
test('LiveBadge: dark slop segment + tier-colored grade · score segment', () => {
  const lb = r(LiveBadge({ tier: 'Heavy', grade: 'D', score: 41 }));
  expect(lb).toContain('>slop<');
  expect(lb).toContain('D · 41');
  const c = badgeColors('Heavy');
  expect(lb).toContain(`background:${c.bg};color:${c.ink}`); // tier-colored right segment
  expect(lb).toMatch(/class="lb-l">slop</); // dark left segment
  expect(UI_CSS).toMatch(/\.lb-l\{background:#16170F/); // its dark band hex
  expect(UI_CSS).toMatch(/box-shadow:var\(--shadow-badge\)/); // the only shadow
});

// ── monitor card (additive-flag JS shape, MNR-13) ──────────────────────────────
test('MonitorCard posts /api/watch with additive opt-in flags only', () => {
  const js = inlineScript(r(MonitorCard({ domain: 'bolt.new' })));
  expect(js).toContain("fetch('/api/watch'");
  // additive: a flag is SENT only when its box is checked (mirrors landing.test.js)
  expect(
    /watchSystem'\)\.checked \? \{ system: true \}/.test(js),
    'system opt-in only when checked'
  ).toBe(true);
  expect(
    /watchList'\)\.checked \? \{ list: true \}/.test(js),
    'list opt-in only when checked'
  ).toBe(true);
  // never sent unconditionally — that would delist/disable on resubmit (Bugbot #12)
  expect(/system:\s*\$\('watchSystem'\)\.checked/.test(js)).toBe(false);
  expect(/list:\s*\$\('watchList'\)\.checked/.test(js)).toBe(false);
  // the inline script must be valid JS (mirrors inline-scripts.test.js)
  expect(() => new Function(js)).not.toThrow();
});

test('MonitorCard is a dark card with a labelled form and honest fine print', () => {
  const html = r(MonitorCard({ domain: 'bolt.new' }));
  for (const id of ['watchForm', 'watchDomain', 'watchEmail', 'watchSystem', 'watchList']) {
    expect(html, id).toContain(`id="${id}"`);
  }
  expect(html).toContain('Keep bolt.new on-system'); // heading targets the domain
  expect(html).toMatch(/double opt-in/i);
  expect(html).toMatch(/MIT/);
  expect(html).toContain('href="/privacy.md"');
  expect(html).toMatch(/<label class="sr-only" for="watchDomain"/);
  expect(html).toMatch(/<label class="sr-only" for="watchEmail"/);
  expect(UI_CSS).toMatch(/\.mon\{[^}]*background:var\(--ink-deep\)/);
});

// ── code block ───────────────────────────────────────────────────────────────
test('CodeBlock is dark and ships the named syntax accents', () => {
  const cb = r(
    CodeBlock({ html: '<span class="t-kw">import</span> <span class="t-cmd">slop</span>' })
  );
  expect(cb).toContain('class="cb"');
  expect(cb).toContain('t-kw'); // pre-tokenized html passes through
  expect(UI_CSS).toMatch(/\.cb\{[^}]*background:#16170F/);
  for (const hex of ['#3FBE7A', '#E5B05A', '#7FB5E6', '#C77DBB', '#6E6F63']) {
    expect(UI_CSS, `accent ${hex}`).toContain(hex);
  }
});

test('CodeBlock escapes a plain code snippet', () => {
  expect(r(CodeBlock({ code: 'npx slop-detect <domain>' }))).toContain(
    'npx slop-detect &lt;domain&gt;'
  );
});

// ── section ledger ───────────────────────────────────────────────────────────
test('SectionLedger uses the 1.5px ink rule with a plain mono label (no pill)', () => {
  const s = r(SectionLedger({ tag: '§ 01', label: 'the mark' }));
  expect(s).toContain('section-ledger');
  expect(s).toContain('the mark');
  expect(s).toContain('§ 01');
  expect(BRAND_CSS).toMatch(/\.section-ledger\{border-top:1\.5px solid #181815/);
  expect(s).not.toContain('border-radius'); // not a rounded eyebrow pill
});

// ── cta ──────────────────────────────────────────────────────────────────────
test('Cta renders a serif heading, a primary+outline row, and the manifesto', () => {
  const c = r(
    Cta({
      heading: 'Scan your site',
      body: 'It takes a few seconds.',
      primary: { href: '/', label: 'Scan' },
      secondary: { href: '/docs', label: 'Read the method' },
      manifesto: 'Empty is better than fake.',
    })
  );
  expect(c).toContain('Scan your site');
  expect(c).toContain('btn-primary');
  expect(c).toContain('btn-outline');
  expect(c).toContain('Empty is better than fake.');
  expect(c).toContain('cta-manifesto');
});

// ── cross-cutting dogfood: no component leaks a slop tell ───────────────────────
test('no rendered component hardcodes a slop font or gradient text', () => {
  const all = [
    Nav({ current: '/' }),
    Footer({}),
    LogoLockup({}),
    ScanInput({}),
    Button({ label: 'x' }),
    SampleChip({ domain: 'a.com', grade: 'A' }),
    StatsStrip({ segments: ['x'] }),
    LetterAvatar({ name: 'a' }),
    LeaderboardRow({ rank: 1, domain: 'a.com', score: 1, grade: 'A' }),
    ScoreTierBadge({ tier: 'Clean', score: 1, grade: 'A' }),
    LiveBadge({ tier: 'Clean', grade: 'A', score: 1 }),
    MonitorCard({ domain: 'a.com' }),
    CodeBlock({ code: 'x' }),
    SectionLedger({ label: 'x' }),
    Cta({ heading: 'x' }),
  ]
    .map(r)
    .join('\n');
  expect(/Inter|Geist|Space Grotesk/.test(all)).toBe(false);
  expect(/background-clip\s*:\s*text/i.test(all)).toBe(false);
  expect(/gradient\(/i.test(all)).toBe(false);
});
