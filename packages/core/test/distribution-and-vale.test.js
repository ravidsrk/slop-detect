import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateValeStyleFiles } from '../../../scripts/export-vale.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');

const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(readText(rel));

describe('R-01, R-02, R-03, R-05, R-06, R-08, R-09..R-14, W-05, K-04 distribution & governance', () => {
  it('R-02 & R-10: validates packages/mcp/server.json, domain auth file, Dockerfile, and publish.yml step', () => {
    const rootPkg = readJson('package.json');
    const serverJson = readJson('packages/mcp/server.json');

    expect(serverJson.$schema).toBe(
      'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json'
    );
    expect(serverJson.name).toBe('com.slop-detect/slop-detect');
    expect(serverJson.version).toBe(rootPkg.version);
    expect(serverJson.repository).toEqual({
      url: 'https://github.com/ravidsrk/slop-detect',
      source: 'github',
      subfolder: 'packages/mcp',
    });
    expect(serverJson.packages).toEqual([
      {
        registryType: 'npm',
        identifier: 'slop-detect-mcp',
        version: rootPkg.version,
        transport: { type: 'stdio' },
      },
    ]);
    expect(serverJson.remotes).toEqual([
      {
        type: 'streamable-http',
        url: 'https://slop-detect.com/mcp',
      },
    ]);

    const authFile = readText('apps/web/public/.well-known/mcp-registry-auth').trim();
    expect(authFile).toMatch(/^v=MCPv1;\s*k=ed25519;\s*p=[A-Za-z0-9+/=]+$/);

    const dockerfile = readText('packages/mcp/Dockerfile');
    expect(dockerfile).toContain('FROM node:22-slim');
    expect(dockerfile).toContain(
      'org.opencontainers.image.source="https://github.com/ravidsrk/slop-detect"'
    );
    expect(dockerfile).toContain('org.opencontainers.image.licenses="MIT"');
    expect(dockerfile).toContain('ENTRYPOINT ["slop-detect-mcp"]');

    const publishYml = readText('.github/workflows/publish.yml');
    expect(publishYml).toContain('Publish slop-detect-mcp to Official MCP Registry');
    expect(publishYml).toContain('mcp-publisher publish');
  });

  it('R-01 & R-03: validates Claude Code marketplace, plugin manifest, hooks, and SKILL.md frontmatter/parity', () => {
    const marketplace = readJson('.claude-plugin/marketplace.json');
    expect(marketplace.name).toBe('slop-detect');
    expect(marketplace.plugins).toHaveLength(1);
    expect(marketplace.plugins[0].name).toBe('slop-detect');
    expect(marketplace.plugins[0].source).toBe('./plugins/slop-detect');

    const claudePlugin = readJson('plugins/slop-detect/.claude-plugin/plugin.json');
    expect(claudePlugin.name).toBe('slop-detect');
    expect(claudePlugin.skills).toBe('./skills');
    expect(claudePlugin.mcpServers).toBe('./.mcp.json');
    expect(claudePlugin.hooks).toBe('./hooks/hooks.json');

    const mcpJson = readJson('plugins/slop-detect/.mcp.json');
    expect(mcpJson.mcpServers['slop-detect'].args).toContain('--local');

    const hooksJson = readJson('plugins/slop-detect/hooks/hooks.json');
    expect(hooksJson.hooks.PostToolUse[0].matcher).toBe('Write|Edit|MultiEdit');
    expect(hooksJson.hooks.PostToolUse[0].hooks[0].command).toContain('scan-local.mjs');

    const rootSkill = readText('skills/slop-detect/SKILL.md');
    const pluginSkill = readText('plugins/slop-detect/skills/slop-detect/SKILL.md');
    expect(pluginSkill).toBe(rootSkill);

    const fmMatch = rootSkill.match(/^---\n([\s\S]*?)\n---/);
    expect(fmMatch).not.toBeNull();
    const fm = fmMatch[1];
    const nameMatch = fm.match(/^name:\s*(.+)$/m);
    const descMatch = fm.match(/^description:\s*(.+)$/m);
    expect(nameMatch[1].trim()).toBe('slop-detect');
    expect(nameMatch[1].trim().length).toBeLessThanOrEqual(64);
    expect(nameMatch[1].trim()).toMatch(/^[a-z0-9-]+$/);
    expect(descMatch[1].trim().length).toBeLessThanOrEqual(1024);

    // Offline CLI first + explicit data egress statement + live count authority
    expect(rootSkill).toContain('GET https://slop-detect.com/api/patterns');
    expect(rootSkill).toContain('default local runner');
    expect(rootSkill).toContain('data leave the machine');
    expect(rootSkill).not.toMatch(/AI-generated/i);
  });

  it('R-06, R-08, R-10: validates Agent Plugins 1.0 manifests, OpenAI review cases, and apm.yml', () => {
    const rootPlugin = readJson('plugin.json');
    const cursorPlugin = readJson('.cursor-plugin/plugin.json');
    expect(cursorPlugin).toEqual(rootPlugin);
    expect(rootPlugin.schemaVersion).toBe('1.0.0');
    expect(rootPlugin.skills).toEqual(['./skills/slop-detect/SKILL.md']);
    expect(rootPlugin.mcpServers['slop-detect-remote'].url).toBe('https://slop-detect.com/mcp');
    expect(rootPlugin.extensions['com.openai'].privacyPolicyUrl).toBe(
      'https://slop-detect.com/privacy.md'
    );
    expect(rootPlugin.extensions['com.openai'].termsOfUseUrl).toBe(
      'https://slop-detect.com/terms.md'
    );

    const challenge = readText('apps/web/public/.well-known/openai-apps-challenge').trim();
    expect(challenge).toContain('openai-apps-verification=');

    const reviewCases = readJson('docs/openai-app-review-cases.json');
    expect(reviewCases.positiveCases).toHaveLength(5);
    expect(reviewCases.negativeCases).toHaveLength(3);
    expect(reviewCases.positiveCases.map((c) => c.expectedTool)).toEqual([
      'scan_page',
      'check_aeo',
      'check_design_system',
      'fix_prompt',
      'lint_design_md',
    ]);

    const apmYml = readText('apm.yml');
    expect(apmYml).toContain('name: slop-detect');
    expect(apmYml).toContain('skills/slop-detect/SKILL.md');
    expect(apmYml).toContain('mcp: packages/mcp/server.json');
  });

  it('R-05: validates root action.yml parity with packages/action/action.yml', () => {
    const rootAction = readText('action.yml');
    const pkgAction = readText('packages/action/action.yml');

    expect(rootAction).toContain("icon: 'shield'");
    expect(rootAction).toContain('packages/action/scan.mjs');
    for (const input of [
      'url:',
      'mode:',
      'static-dir:',
      'baseline-url:',
      'fail-on-regression:',
      'fail-under:',
      'api-base:',
      'axes:',
      'preset:',
      'design-md:',
      'aeo:',
      'sarif:',
      'upload-sarif:',
    ]) {
      expect(rootAction).toContain(input);
    }
    // Every output in packages/action/action.yml must also exist in root action.yml
    const outputsSection = pkgAction.split('outputs:')[1].split('runs:')[0];
    const outputNames = [...outputsSection.matchAll(/^ {2}([a-z-]+):/gm)].map((m) => m[1]);
    expect(outputNames.length).toBeGreaterThanOrEqual(8);
    for (const outName of outputNames) {
      expect(rootAction).toContain(`  ${outName}:`);
    }
  });

  it('R-09, R-11, R-12, R-13: validates recipes and benchmark artifacts', () => {
    for (const docPath of [
      'docs/GENERATOR_RECIPES.md',
      'docs/BUILDER_RECIPES.md',
      'docs/DEPLOY_GATES.md',
      'docs/benchmarks/README.md',
      'docs/benchmarks/bench-results.tsv',
    ]) {
      const content = readText(docPath);
      expect(content.length).toBeGreaterThan(100);
      expect(content).not.toMatch(/this page is AI-generated/i);
    }
    const tsvLines = readText('docs/benchmarks/bench-results.tsv').trim().split('\n');
    expect(tsvLines.length).toBeGreaterThanOrEqual(5);
    const headers = tsvLines[0].split('\t');
    expect(headers).toContain('median_wall_ms');
    expect(headers).toContain('peak_rss_mb');
    expect(headers).toContain('median_output_tokens');
  });

  it('W-05: verifies zero drift between scripts/export-vale.mjs and styles/SlopDetect/', () => {
    const generated = generateValeStyleFiles();
    expect(generated.size).toBe(13);

    for (const [name, expectedContent] of generated.entries()) {
      const diskPath = path.join(ROOT, 'styles', 'SlopDetect', name);
      expect(fs.existsSync(diskPath), `Missing styles/SlopDetect/${name}`).toBe(true);
      expect(fs.readFileSync(diskPath, 'utf8')).toBe(expectedContent);
    }

    const meta = JSON.parse(generated.get('meta.json'));
    const errorFiles = meta.exportedRules.filter((r) => r.level === 'error').map((r) => r.file);
    expect(errorFiles).toEqual([
      'ChatbotMarkupLeak.yml',
      'ChatbotReplyResidue.yml',
      'UnfilledPlaceholders.yml',
      'LeakedMarkdown.yml',
    ]);

    const excludedIds = meta.excludedRules.map((r) => r.id);
    expect(excludedIds).toContain('em_dash_overload');
    expect(excludedIds).toContain('sentence_length_uniformity');
    expect(excludedIds).toContain('excess_vocabulary_log_odds');
  });

  it('K-04: validates issue and PR templates enforce held-out LR >= 3.0 and pioneer regression gate', () => {
    const issueTpl = readText('.github/ISSUE_TEMPLATE/new_pattern.md');
    const prTpl = readText('.github/PULL_REQUEST_TEMPLATE.md');

    expect(issueTpl).toContain('LR >= 3.0');
    expect(issueTpl).toContain('Clopper-Pearson');
    expect(issueTpl).toContain('deltaHeavyFpr <= 0');
    expect(issueTpl).toContain('weight: 0');

    expect(prTpl).toContain('LR >= 3.0');
    expect(prTpl).toContain('Clopper-Pearson');
    expect(prTpl).toContain('Heavy FPR delta');
    expect(prTpl).toContain('K-06');
  });
});
