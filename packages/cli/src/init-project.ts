// Project-local init (W-08). Writes skill, MCP, and hook recipes into a
// directory the caller chooses. It does not write outside that directory and
// it does not submit anything to a registry or marketplace.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const INIT_PROVIDERS = ['claude', 'cursor', 'codex', 'copilot'] as const;
export type InitProvider = (typeof INIT_PROVIDERS)[number];

export const HOOK_COMMAND = 'node ./node_modules/slop-detect-mcp/hooks/scan-regression.mjs';

const SKILL = `---
name: slop-detect
description: Score a local page for design-slop patterns and write a short avoid list. Use when editing a landing page in this project.
---

# slop-detect

Score the dev server with the local scanner. The hook command is \`${HOOK_COMMAND}\`.

Set the page URL in \`.slop/local-url\` or \`SLOP_LOCAL_URL\`. The first hook run records \`.slop/session-baseline.json\` and prints nothing. A later run prints only when the score rises or a new pattern appears. A blocked scan exits 2. That exit is not a Clean score.

The MCP server in \`.mcp.json\` starts \`slop-detect-mcp --local\`. It does not call the hosted API.

\`slop-detect --brief result.json\` prints an avoid list of at most 120 words. \`slop-detect --fix-prompt\` still prints the long remediation prompt. This setup does not publish a score to a registry.
`;

const CODEX_NOTE = `Codex runs a hook only after you approve the hook file. The command does not call slop-detect.com. A blocked scan exits 2 and is not a Clean score.
`;

const CI_WORKFLOW = `# Recipe only. workflow_dispatch does not score a page by itself.
# Point a job at a trusted preview URL when you want a gate.
# A missing URL is not a Clean score.
# This file does not submit the action to a marketplace.
name: slop-detect
on:
  workflow_dispatch:
jobs:
  note:
    runs-on: ubuntu-latest
    steps:
      - name: Recipe
        run: |
          echo "Use ravidsrk/slop-detect/packages/action with a trusted preview URL."
          echo "A missing URL is not a Clean score."
          echo "This file does not submit the action to the GitHub Marketplace."
`;

export interface InitPlanOptions {
  providers?: string[];
  scope?: string;
  ci?: string | null;
  hooks?: boolean;
  localUrl?: string;
}

export function parseProviders(raw: string | undefined): InitProvider[] {
  if (!raw || !raw.trim()) return [...INIT_PROVIDERS];
  const list = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const bad = list.filter((item) => !(INIT_PROVIDERS as readonly string[]).includes(item));
  if (bad.length) {
    throw new Error(
      `Unknown init provider: ${bad.join(', ')}. Options: ${INIT_PROVIDERS.join(', ')}.`
    );
  }
  return [...new Set(list)] as InitProvider[];
}

function claudeSettings(): string {
  return `${JSON.stringify(
    {
      mcpServers: {
        'slop-detect': {
          command: 'npx',
          args: ['-y', 'slop-detect-mcp', '--local'],
        },
      },
      hooks: {
        PostToolUse: [
          {
            matcher: 'Edit|Write|MultiEdit',
            hooks: [{ type: 'command', command: HOOK_COMMAND }],
          },
        ],
        Stop: [{ hooks: [{ type: 'command', command: HOOK_COMMAND }] }],
      },
    },
    null,
    2
  )}\n`;
}

export function planInitFiles(
  opts: InitPlanOptions = {}
): Array<{ path: string; contents: string }> {
  if (opts.scope && opts.scope !== 'project') {
    throw new Error(
      'init writes into the project directory only. Pass --scope=project. It does not write to the home directory.'
    );
  }
  const providers = new Set(
    opts.providers?.length ? parseProviders(opts.providers.join(',')) : INIT_PROVIDERS
  );
  const hooks = opts.hooks !== false;
  const files: Array<{ path: string; contents: string }> = [
    { path: '.claude/skills/slop-detect/SKILL.md', contents: SKILL },
    {
      path: '.mcp.json',
      contents: `${JSON.stringify(
        {
          mcpServers: {
            'slop-detect': {
              command: 'npx',
              args: ['-y', 'slop-detect-mcp', '--local'],
            },
          },
        },
        null,
        2
      )}\n`,
    },
    { path: '.slop/local-url', contents: `${opts.localUrl || 'http://127.0.0.1:3000/'}\n` },
  ];

  if (hooks && providers.has('claude')) {
    files.push({ path: '.claude/settings.local.json', contents: claudeSettings() });
  }
  if (hooks && providers.has('cursor')) {
    files.push({
      path: '.cursor/hooks.json',
      contents: `${JSON.stringify(
        { version: 1, hooks: { stop: [{ command: HOOK_COMMAND }] } },
        null,
        2
      )}\n`,
    });
  }
  if (hooks && providers.has('codex')) {
    files.push({
      path: '.codex/hooks.json',
      contents: `${JSON.stringify(
        { hooks: { Stop: [{ hooks: [{ type: 'command', command: HOOK_COMMAND }] }] } },
        null,
        2
      )}\n`,
    });
    files.push({ path: '.codex/HOOKS.md', contents: CODEX_NOTE });
  }
  if (hooks && providers.has('copilot')) {
    files.push({
      path: '.github/hooks/slop-detect.json',
      contents: `${JSON.stringify({ command: HOOK_COMMAND }, null, 2)}\n`,
    });
  }
  if (opts.ci === 'github') {
    files.push({ path: '.github/workflows/slop-detect.yml', contents: CI_WORKFLOW });
  }
  return files;
}

export interface InitWriteResult {
  written: string[];
  unchanged: string[];
  skipped: string[];
}

function commandAlreadyPresent(existing: string, planned: string): boolean {
  return existing.includes(HOOK_COMMAND) && planned.includes(HOOK_COMMAND);
}

function hookCommandOf(entry: any): string | null {
  if (!entry || typeof entry !== 'object') return null;
  if (typeof entry.command === 'string') return entry.command;
  if (Array.isArray(entry.hooks)) {
    for (const inner of entry.hooks) {
      if (inner && typeof inner.command === 'string') return inner.command;
    }
  }
  return null;
}

function mergeHookLists(existing: any, planned: any): any[] {
  const base = Array.isArray(existing) ? existing.slice() : [];
  if (!Array.isArray(planned)) return base;
  for (const item of planned) {
    const command = hookCommandOf(item);
    if (command && JSON.stringify(base).includes(command)) continue;
    base.push(item);
  }
  return base;
}

// Keep every event the project already configured. Append the planned command
// on that event when it is not already there.
function mergeHooks(existing: any, planned: any): any {
  const out: Record<string, any> =
    existing && typeof existing === 'object' && !Array.isArray(existing) ? { ...existing } : {};
  if (!planned || typeof planned !== 'object') return out;
  for (const [event, plannedList] of Object.entries(planned)) {
    out[event] = mergeHookLists(out[event], plannedList);
  }
  return out;
}

export function applyInitPlan(
  dir: string,
  files: Array<{ path: string; contents: string }>
): InitWriteResult {
  const result: InitWriteResult = { written: [], unchanged: [], skipped: [] };
  for (const file of files) {
    const target = join(dir, file.path);
    mkdirSync(dirname(target), { recursive: true });
    if (!existsSync(target)) {
      writeFileSync(target, file.contents);
      result.written.push(file.path);
      continue;
    }
    const existing = readFileSync(target, 'utf8');
    if (existing === file.contents) {
      result.unchanged.push(file.path);
      continue;
    }
    if (file.path.endsWith('.json') && commandAlreadyPresent(existing, file.contents)) {
      result.unchanged.push(file.path);
      continue;
    }
    if (file.path.endsWith('.json')) {
      try {
        const left = JSON.parse(existing);
        const right = JSON.parse(file.contents);
        const merged = { ...right, ...left };
        if (right.mcpServers || left.mcpServers) {
          merged.mcpServers = { ...(right.mcpServers || {}), ...(left.mcpServers || {}) };
          if (!merged.mcpServers['slop-detect'] && right.mcpServers?.['slop-detect']) {
            merged.mcpServers['slop-detect'] = right.mcpServers['slop-detect'];
          }
        }
        if (right.hooks) {
          merged.hooks = mergeHooks(left.hooks, right.hooks);
        }
        const next = `${JSON.stringify(merged, null, 2)}\n`;
        if (next === existing) result.unchanged.push(file.path);
        else {
          writeFileSync(target, next);
          result.written.push(file.path);
        }
        continue;
      } catch {
        result.skipped.push(file.path);
        continue;
      }
    }
    result.skipped.push(file.path);
  }
  return result;
}
