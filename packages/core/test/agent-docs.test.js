// The docs coding agents read must match the code (#362, #365). These are the
// claims that drifted before: tool lists, file paths, versions, and how to
// verify a change.

import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MCP_TOOL_NAMES } from '../src/index.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));

describe('agent-facing docs', () => {
  it('every surface that lists the MCP tools lists all of them', () => {
    for (const rel of [
      'AGENTS.md',
      'apps/web/public/llms.txt',
      'skills/slop-detect/SKILL.md',
      'packages/mcp/README.md',
      'docs/AGENT_INTEGRATIONS.md',
    ]) {
      const text = read(rel);
      for (const name of MCP_TOOL_NAMES) expect(text, `${rel} lists ${name}`).toContain(name);
    }
  });

  it('no doc or config uses the bare npx --local command that cannot load slop-detect (#357)', () => {
    const files = [
      'AGENTS.md',
      'README.md',
      'apps/web/public/llms.txt',
      'skills/slop-detect/SKILL.md',
      'packages/mcp/README.md',
      'packages/mcp/hooks/README.md',
      'docs/AGENT_INTEGRATIONS.md',
      'docs/BUILDER_RECIPES.md',
      'docs/openai-app-review-cases.json',
      'plugins/slop-detect/.mcp.json',
    ];
    for (const rel of files) {
      const text = read(rel).replace(/A bare `npx -y slop-detect-mcp --local`/g, '');
      expect(text, rel).not.toMatch(/npx -y slop-detect-mcp --local/);
      expect(text, rel).not.toMatch(/"-y", "slop-detect-mcp", "--local"/);
    }
  });

  it('ARCHITECTURE.md only names files that exist', () => {
    const doc = read('docs/ARCHITECTURE.md');
    const names = [...doc.matchAll(/([a-z][\w.-]*\.(?:ts|tsx|mjs|js|json))/g)].map((m) => m[1]);
    const tracked = new Set(
      fs
        .readdirSync(path.join(ROOT, 'packages/core/src'))
        .concat(fs.readdirSync(path.join(ROOT, 'packages/cli/src')))
        .concat(fs.readdirSync(path.join(ROOT, 'apps/web/functions/api')))
    );
    const coreFiles = [...doc.matchAll(/├── ([\w-]+\.ts)|└── ([\w-]+\.ts)/g)].map(
      (m) => m[1] || m[2]
    );
    expect(coreFiles.length).toBeGreaterThan(5);
    for (const file of coreFiles)
      expect(tracked.has(file), `${file} in ARCHITECTURE.md`).toBe(true);
    expect(doc).not.toContain('page-eval.ts');
    expect(names.length).toBeGreaterThan(0);
  });

  it('AGENTS.md says how to verify a change, and when production deploys', () => {
    const agents = read('AGENTS.md');
    const pkg = json('package.json');
    for (const script of ['verify', 'test:golden', 'lint']) {
      expect(pkg.scripts[script], `root script ${script}`).toBeTruthy();
      expect(agents).toContain(`bun run ${script}`);
    }
    expect(pkg.scripts.verify).toMatch(/lint/);
    expect(pkg.scripts.verify).toMatch(/typecheck/);
    expect(pkg.scripts.verify).toMatch(/test/);
    expect(agents).not.toMatch(/deploys to Cloudflare Pages on tag\./);
    expect(agents).toMatch(/after every green `ci` run on `main`/);
    expect(read('.github/workflows/deploy.yml')).toMatch(/workflow_run:[\s\S]*branches: \[main\]/);
    expect(agents).toContain('buildPageScript');
    expect(read('CONTRIBUTING.md')).toContain('bun run verify');
  });

  it('plugin, marketplace and packages share one version; the skill digest is current', () => {
    const version = json('packages/core/package.json').version;
    expect(json('plugins/slop-detect/.claude-plugin/plugin.json').version).toBe(version);
    const marketplace = json('.claude-plugin/marketplace.json');
    expect(marketplace.metadata.version).toBe(version);
    expect(marketplace.plugins[0].version).toBe(version);
    const skill = read('skills/slop-detect/SKILL.md');
    const digest = `sha256:${createHash('sha256').update(skill).digest('hex')}`;
    expect(json('apps/web/public/.well-known/agent-skills/index.json').skills[0].digest).toBe(
      digest
    );
  });

  it('research snapshots are marked as such and carry no pasted agent briefs', () => {
    const dir = path.join(ROOT, 'docs/research');
    const files = [];
    for (const sub of fs.readdirSync(dir)) {
      const full = path.join(dir, sub);
      if (fs.statSync(full).isDirectory()) {
        for (const f of fs.readdirSync(full)) if (f.endsWith('.md')) files.push(path.join(full, f));
      }
    }
    expect(files.length).toBeGreaterThan(10);
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      expect(text, file).toContain('Snapshot, not maintained.');
      expect(text, file).not.toMatch(/## Investigation brief/);
      expect(text, file).not.toMatch(/\/home\/repos\//);
    }
  });
});
