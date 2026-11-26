// Project-local init (W-08). Writes skill, MCP, and hook recipes into a
// directory the caller chooses. It does not write outside that directory and
// it does not submit anything to a registry or marketplace.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const INIT_PROVIDERS = ['claude', 'cursor', 'codex', 'copilot'] as const;
export type InitProvider = (typeof INIT_PROVIDERS)[number];

// Runs from the published packages, so it works without adding anything to the
// project. `slop-detect` (Playwright) is an optional peer of slop-detect-mcp and
// has to be named explicitly (#357, #359).
export const HOOK_COMMAND = 'npx -y -p slop-detect -p slop-detect-mcp slop-detect-hook';

// Commands earlier versions wrote. Re-running init replaces them: they exit 2
// when they can't scan (blocking Stop) and hide regressions from the agent.
export const LEGACY_HOOK_COMMANDS = [
  'node ./node_modules/slop-detect-mcp/hooks/scan-regression.mjs',
  'node ./node_modules/slop-detect-mcp/hooks/scan-local.mjs',
  'node packages/mcp/hooks/scan-local.mjs',
];

export const MCP_SERVER_ARGS = [
  '-y',
  '-p',
  'slop-detect',
  '-p',
  'slop-detect-mcp',
  'slop-detect-mcp',
  '--local',
];
const LEGACY_MCP_SERVER_ARGS = ['-y', 'slop-detect-mcp', '--local'];

// Hook commands wait for a browser scan; cap it so a hung dev server can't
// stall the agent for the default ten minutes.
const HOOK_TIMEOUT_SECONDS = 180;

// Default dev-server ports by framework, checked in order (Astro, SvelteKit
// and Remix also depend on Vite, so they come before it).
const DEV_SERVER_PORTS: Array<[string, number]> = [
  ['astro', 4321],
  ['@sveltejs/kit', 5173],
  ['@remix-run/dev', 5173],
  ['nuxt', 3000],
  ['next', 3000],
  ['gatsby', 8000],
  ['@angular/core', 4200],
  ['react-scripts', 3000],
  ['@11ty/eleventy', 8080],
  ['vite', 5173],
];

// Guess the local dev URL from the project's package.json. Returns null when
// it can't tell; init then leaves .slop/local-url unset rather than guessing.
export function detectLocalUrl(dir: string): string | null {
  try {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    for (const [name, port] of DEV_SERVER_PORTS) {
      if (deps[name]) return `http://127.0.0.1:${port}/`;
    }
  } catch {
    /* no package.json or unreadable */
  }
  return null;
}

const SKILL = `---
name: slop-detect
description: Score a local page for design-slop patterns and write a short avoid list. Use when editing a landing page in this project.
---

# slop-detect

Score the dev server with the local scanner. The hook command is \`${HOOK_COMMAND}\`.

Set the page URL in \`.slop/local-url\` or \`SLOP_LOCAL_URL\`; until one is set the hook does nothing. The first hook run records \`.slop/session-baseline.json\` and prints nothing. A later run reports only when the score rises or a new pattern appears: Claude sees the message and fixes it before stopping. If the scan can't run (dev server down, wrong port), the hook does not block; that is still not a Clean score.

The MCP server in \`.mcp.json\` runs \`slop-detect-mcp --local\` with the \`slop-detect\` scanner installed alongside. It does not call the hosted API.

\`slop-detect --brief result.json\` prints an avoid list of at most 120 words. \`slop-detect --fix-prompt\` still prints the long remediation prompt. This setup does not publish a score to a registry.
`;

const CODEX_NOTE = `Codex runs a hook only after you approve the hook file. The command does not call slop-detect.com. A blocked scan exits 2 and is not a Clean score.
`;

const CI_WORKFLOW = `# Slop Detect PR gate — points at a trusted deploy preview or static build.
# Never pass PR-controlled content into \`url\` on pull_request_target.
name: slop-detect
on:
  pull_request:
  workflow_dispatch:
    inputs:
      url:
        description: 'Preview URL to scan'
        required: true
jobs:
  slop-check:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - name: Run Slop Detect
        if: \${{ github.event.inputs.url != '' || vars.SLOP_PREVIEW_URL != '' }}
        uses: ravidsrk/slop-detect@v0.9.1
        with:
          url: \${{ github.event.inputs.url || vars.SLOP_PREVIEW_URL }}
          axes: design,copy
          design-md: auto
          fail-on: heavy
          share: 'false'
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
          args: MCP_SERVER_ARGS,
        },
      },
      hooks: {
        PostToolUse: [
          {
            matcher: 'Edit|Write|MultiEdit',
            hooks: [{ type: 'command', command: HOOK_COMMAND, timeout: HOOK_TIMEOUT_SECONDS }],
          },
        ],
        Stop: [
          { hooks: [{ type: 'command', command: HOOK_COMMAND, timeout: HOOK_TIMEOUT_SECONDS }] },
        ],
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
              args: MCP_SERVER_ARGS,
            },
          },
        },
        null,
        2
      )}\n`,
    },
  ];
  // Only write the dev URL when it is known (--local-url or detected). A wrong
  // default would make every hook run fail against a server that isn't there.
  if (opts.localUrl) files.push({ path: '.slop/local-url', contents: `${opts.localUrl}\n` });

  if (hooks && providers.has('claude')) {
    files.push({ path: '.claude/settings.local.json', contents: claudeSettings() });
  }
  if (providers.has('cursor')) {
    files.push({
      path: '.cursor/mcp.json',
      contents: `${JSON.stringify(
        {
          mcpServers: {
            'slop-detect': {
              command: 'npx',
              args: MCP_SERVER_ARGS,
            },
          },
        },
        null,
        2
      )}\n`,
    });
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
        {
          hooks: {
            Stop: [
              {
                hooks: [{ type: 'command', command: HOOK_COMMAND, timeout: HOOK_TIMEOUT_SECONDS }],
              },
            ],
          },
        },
        null,
        2
      )}\n`,
    });
    files.push({ path: '.codex/HOOKS.md', contents: CODEX_NOTE });
  }
  if (hooks && providers.has('copilot')) {
    files.push({
      path: '.github/hooks/slop-detect.json',
      contents: `${JSON.stringify(
        {
          version: 1,
          hooks: {
            postToolUse: [{ type: 'command', bash: HOOK_COMMAND }],
          },
        },
        null,
        2
      )}\n`,
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

function isLegacyHookEntry(entry: any): boolean {
  const command = hookCommandOf(entry);
  return !!command && LEGACY_HOOK_COMMANDS.includes(command.trim());
}

function mergeHookLists(existing: any, planned: any): any[] {
  const base = (Array.isArray(existing) ? existing : []).filter(
    (entry) => !isLegacyHookEntry(entry)
  );
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
    if (file.path.endsWith('.json')) {
      try {
        const left = JSON.parse(existing);
        const right = JSON.parse(file.contents);
        const merged = { ...right, ...left };
        if (right.mcpServers || left.mcpServers) {
          merged.mcpServers = { ...(right.mcpServers || {}), ...(left.mcpServers || {}) };
          const current = merged.mcpServers['slop-detect'];
          const legacy =
            current &&
            current.command === 'npx' &&
            JSON.stringify(current.args) === JSON.stringify(LEGACY_MCP_SERVER_ARGS);
          if ((!current || legacy) && right.mcpServers?.['slop-detect']) {
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
