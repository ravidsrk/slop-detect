// Shared MCP contract (#361), fix prompt wording (#364), and the product
// version constant. Both MCP servers import these, so the tests live here.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  AVOID_LIST_WORD_CAP,
  COPY_PATTERNS,
  FIX_PROMPT_PASSING_LIST_CAP,
  MCP_PROMPTS,
  MCP_TOOLS,
  MCP_TOOL_NAMES,
  PATTERNS,
  PRESETS,
  SCANNER_USER_AGENT,
  SLOP_DETECT_VERSION,
  buildAvoidListFromPatterns,
  buildFixPrompt,
  buildGenericAvoidList,
  buildMcpFixPrompt,
  countWords,
  formatEvidence,
  renderMcpPrompt,
  validateMcpToolArguments,
} from '../src/index.ts';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

describe('version', () => {
  it('SLOP_DETECT_VERSION tracks the package version and feeds the user agent', () => {
    expect(SLOP_DETECT_VERSION).toBe(pkg.version);
    expect(SCANNER_USER_AGENT).toBe(`SlopDetector/${pkg.version} (+https://slop-detect.com/bot)`);
  });
});

describe('MCP tool registry', () => {
  it('lists every tool once, with strict schemas and documented parameters', () => {
    expect(MCP_TOOLS.map((t) => t.name)).toEqual([...MCP_TOOL_NAMES]);
    for (const tool of MCP_TOOLS) {
      expect(tool.inputSchema.additionalProperties).toBe(false);
      expect(tool.annotations.title).toBe(tool.title);
      expect(tool.description).not.toMatch(/AI-generated/i);
      for (const spec of Object.values(tool.inputSchema.properties))
        expect(spec.description).toBeTruthy();
    }
    const preset = MCP_TOOLS.find((t) => t.name === 'scan_page').inputSchema.properties.preset.enum;
    expect(preset).toEqual(Object.keys(PRESETS));
  });

  it('every prompt renders and names the tools it uses', () => {
    for (const prompt of MCP_PROMPTS) {
      const rendered = renderMcpPrompt(prompt.name, { url: 'https://a.example' });
      expect(rendered.messages[0].content.text).toContain('https://a.example');
    }
    expect(renderMcpPrompt('refactor-to-design-system', { url: 'x' })).not.toBeNull();
    expect(renderMcpPrompt('nope', {})).toBeNull();
  });
});

describe('validateMcpToolArguments', () => {
  const ok = (name, args) => {
    const r = validateMcpToolArguments(name, args);
    expect(r.ok, JSON.stringify(r)).toBe(true);
    return r.args;
  };
  const bad = (name, args) => {
    const r = validateMcpToolArguments(name, args);
    expect(r.ok).toBe(false);
    return r.message;
  };

  it('names missing and unknown arguments', () => {
    expect(bad('scan_page', {})).toMatch(/Missing required argument "url" for scan_page/);
    expect(bad('lint_design_md', { design: 'x' })).toMatch(
      /Unknown argument "design".*Valid arguments: design_md/
    );
    expect(bad('diff_design_md', { base_design_md: 'x' })).toMatch(/"head_design_md"/);
    expect(bad('scan_page', { url: 'https://x.example', preset: 'nextjs' })).toMatch(
      /preset" must be one of: full, strict, marketing, minimal, editorial, devtool/
    );
    expect(bad('scan_page', { url: 'https://x.example', axes: ['design', 'vibes'] })).toMatch(
      /axes/
    );
    expect(bad('scan_page', 'https://x.example')).toMatch(/JSON object/);
  });

  it('accepts the parameter names either server used before (#361)', () => {
    expect(ok('lint_design_md', { content: 'md' })).toEqual({ design_md: 'md' });
    expect(ok('diff_design_md', { base: 'a', head: 'b' })).toEqual({
      base_design_md: 'a',
      head_design_md: 'b',
    });
    expect(ok('check_design_system', { url: 'https://x.example', designMd: true })).toEqual({
      url: 'https://x.example',
      design_md_url: 'auto',
    });
    expect(ok('scan_page', { url: 'https://x.example', copy: true }).axes).toEqual([
      'design',
      'copy',
    ]);
    expect(ok('scan_page', { url: 'https://x.example', axes: 'all' }).axes).toEqual([
      'design',
      'copy',
      'craft',
    ]);
    expect(ok('scan_page', { url: 'https://x.example', axes: ['copy'] }).axes).toEqual([
      'design',
      'copy',
    ]);
    expect(ok('fix_prompt', { mode: 'avoid' })).toEqual({ brief: true });
    expect(
      ok('fix_prompt', { patterns: [{ id: 'bento_grid' }, 'bento_grid', 'gradient_text'] }).patterns
    ).toEqual(['bento_grid', 'gradient_text']);
  });

  it('needs a source for tools that can work from several', () => {
    expect(bad('fix_prompt', {})).toMatch(/Pass one of "url", "scan_id", "patterns"/);
    expect(bad('check_design_system', {})).toMatch(/"url", "scan_id"/);
    expect(bad('extract_design_system', { format: 'dtcg' })).toMatch(
      /"url", "scan_id", "observed"/
    );
    expect(ok('fix_prompt', { brief: true })).toEqual({ brief: true });
  });

  it('trims URLs but keeps DESIGN.md text as written', () => {
    expect(ok('scan_page', { url: '  https://x.example  ' }).url).toBe('https://x.example');
    const text = '---\nname: X\n---\n';
    expect(ok('lint_design_md', { design_md: text }).design_md).toBe(text);
  });
});

function fullResult(triggeredIds, score, tier) {
  const mark = (p) => ({
    id: p.id,
    label: p.label,
    weight: p.weight,
    status: triggeredIds.includes(p.id) ? 'fail' : 'pass',
    triggered: triggeredIds.includes(p.id),
    evidence: {},
  });
  return {
    url: 'https://example.com/',
    title: 'Example',
    score,
    tier,
    patterns: PATTERNS.map(mark),
    axes: { copy: { score: 0, tier: 'Clean', patterns: COPY_PATTERNS.map(mark) } },
  };
}

describe('buildFixPrompt (#364)', () => {
  it('a Clean page with one finding gets optional polish, not a "< 10" goal it already meets', () => {
    const prompt = buildFixPrompt(fullResult(['bento_grid'], 4, 'Clean'));
    expect(prompt).toMatch(/already under the Clean threshold/);
    expect(prompt).toMatch(/optional polish/);
    expect(prompt).not.toMatch(/reduce that score/);
    expect(prompt).toMatch(/## Optional polish/);
    expect(prompt.length).toBeLessThanOrEqual(5000);
  });

  it('a Mild page keeps the goal and caps the passing list', () => {
    const prompt = buildFixPrompt(
      fullResult(['purple_accent', 'gradient_text', 'bento_grid'], 14, 'Mild')
    );
    expect(prompt).toMatch(/reduce that score to \*\*< 10 \(Clean tier\)\*\*/);
    const named =
      prompt
        .split('## Currently passing')[1]
        .split('---')[0]
        .match(/^- \*\*/gm) || [];
    expect(named.length).toBe(FIX_PROMPT_PASSING_LIST_CAP);
    expect(prompt).toMatch(/…and \d+ more currently-passing patterns/);
  });

  it('a prompt built from pattern IDs has no score lines and no "undefined"', () => {
    const { text, structured } = buildMcpFixPrompt({ patterns: ['bento_grid', 'gradient_text'] });
    expect(text).toMatch(/without a page scan, so there's no score yet/);
    expect(text).not.toMatch(/undefined/);
    expect(text).toMatch(/URL: \(not scanned\)/);
    expect(structured).toMatchObject({ mode: 'fix', triggeredCount: 2, score: null, tier: null });
  });

  it('re-scanning is local-first: no curl to the hosted API', () => {
    const prompt = buildFixPrompt(fullResult(['bento_grid'], 14, 'Mild'));
    expect(prompt).not.toMatch(/curl -sX POST https:\/\/slop-detect\.com\/api\/scan/);
    expect(prompt).toMatch(/npx slop-detect https:\/\/example\.com\//);
    expect(prompt).toMatch(/--local/);
  });

  it('nothing triggered: says so, with or without a score', () => {
    expect(buildFixPrompt(fullResult([], 0, 'Clean'))).toMatch(/nothing to fix/);
    expect(buildFixPrompt({ patterns: [] })).toMatch(/nothing to fix yet/);
  });
});

describe('avoid lists and evidence', () => {
  it('the generic avoid list needs no scan and stays within the word cap', () => {
    const text = buildGenericAvoidList();
    expect(text).toMatch(/^Generic avoid list \(no page scanned\)/);
    expect(countWords(text)).toBeLessThanOrEqual(AVOID_LIST_WORD_CAP);
    expect(text).toMatch(/slop_fonts/);
    expect(text).not.toMatch(/Scan could not run/);
  });

  it('an avoid list from pattern IDs says it has no score', () => {
    const text = buildAvoidListFromPatterns(['bento_grid', 'not_a_real_pattern']);
    expect(text).toMatch(/built without a scan/);
    expect(text).toMatch(/Do not use bento_grid/);
    expect(text).toMatch(/not_a_real_pattern/);
    expect(countWords(text)).toBeLessThanOrEqual(AVOID_LIST_WORD_CAP);
  });

  it('object evidence samples render as fields, not [object Object]', () => {
    const text = formatEvidence({
      id: 'purple_accent',
      triggered: true,
      evidence: { purpleEls: 2, filledCtas: 1, samples: [{ tag: 'A', bg: 'rgb(139, 92, 246)' }] },
    });
    expect(text).toMatch(/tag A, bg rgb\(139, 92, 246\)/);
    expect(text).not.toMatch(/\[object Object\]/);
  });
});
