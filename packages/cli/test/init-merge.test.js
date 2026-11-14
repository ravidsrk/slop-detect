import { test, expect } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  applyInitPlan,
  detectLocalUrl,
  planInitFiles,
  HOOK_COMMAND,
  LEGACY_HOOK_COMMANDS,
  MCP_SERVER_ARGS,
} from '../src/init-project.ts';

test('init merges each hook event and keeps existing commands', () => {
  const dir = mkdtempSync(join(tmpdir(), 'slop-hooks-'));
  mkdirSync(join(dir, '.claude'), { recursive: true });
  mkdirSync(join(dir, '.cursor'), { recursive: true });
  writeFileSync(
    join(dir, '.claude/settings.local.json'),
    `${JSON.stringify(
      {
        hooks: {
          PostToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo keep-me' }] }],
          Stop: [{ hooks: [{ type: 'command', command: 'echo stop-keep' }] }],
        },
      },
      null,
      2
    )}\n`
  );
  writeFileSync(
    join(dir, '.cursor/hooks.json'),
    `${JSON.stringify(
      {
        version: 1,
        hooks: {
          stop: [{ command: 'echo cursor-keep' }],
          beforeSubmit: [{ command: 'echo before' }],
        },
      },
      null,
      2
    )}\n`
  );

  const planned = planInitFiles({ providers: ['claude', 'cursor'], hooks: true });
  applyInitPlan(
    dir,
    planned.filter(
      (file) => file.path.endsWith('settings.local.json') || file.path.endsWith('hooks.json')
    )
  );

  const claude = JSON.parse(readFileSync(join(dir, '.claude/settings.local.json'), 'utf8'));
  const posted = JSON.stringify(claude.hooks.PostToolUse);
  const stopped = JSON.stringify(claude.hooks.Stop);
  expect(posted).toMatch(/echo keep-me/);
  expect(posted).toContain(HOOK_COMMAND);
  expect(posted.match(new RegExp(HOOK_COMMAND.replace(/[.*]/g, '\\$&'), 'g'))).toHaveLength(1);
  expect(stopped).toMatch(/echo stop-keep/);
  expect(stopped).toContain(HOOK_COMMAND);

  const cursor = JSON.parse(readFileSync(join(dir, '.cursor/hooks.json'), 'utf8'));
  expect(cursor.hooks.beforeSubmit[0].command).toBe('echo before');
  expect(cursor.hooks.stop.map((hook) => hook.command)).toEqual(['echo cursor-keep', HOOK_COMMAND]);

  applyInitPlan(
    dir,
    planned.filter(
      (file) => file.path.endsWith('settings.local.json') || file.path.endsWith('hooks.json')
    )
  );
  const again = readFileSync(join(dir, '.claude/settings.local.json'), 'utf8');
  expect(again.match(/slop-detect-hook/g)).toHaveLength(2);
  const cursorAgain = JSON.parse(readFileSync(join(dir, '.cursor/hooks.json'), 'utf8'));
  expect(cursorAgain.hooks.stop).toHaveLength(2);
});

test('init hooks run from the published packages, with a timeout (#357, #359)', () => {
  expect(HOOK_COMMAND).toBe('npx -y -p slop-detect -p slop-detect-mcp slop-detect-hook');
  const planned = planInitFiles({ providers: ['claude'], hooks: true });
  const settings = JSON.parse(
    planned.find((f) => f.path === '.claude/settings.local.json').contents
  );
  for (const event of ['PostToolUse', 'Stop']) {
    const hook = settings.hooks[event][0].hooks[0];
    expect(hook.command).toBe(HOOK_COMMAND);
    expect(hook.timeout).toBeGreaterThan(0);
  }
  const mcp = JSON.parse(planned.find((f) => f.path === '.mcp.json').contents);
  expect(mcp.mcpServers['slop-detect'].args).toEqual(MCP_SERVER_ARGS);
  expect(MCP_SERVER_ARGS.join(' ')).toContain('-p slop-detect -p slop-detect-mcp');
});

test('init writes .slop/local-url only when the URL is known', () => {
  expect(planInitFiles({}).some((f) => f.path === '.slop/local-url')).toBe(false);
  const withUrl = planInitFiles({ localUrl: 'http://127.0.0.1:4321/' });
  expect(withUrl.find((f) => f.path === '.slop/local-url').contents).toBe(
    'http://127.0.0.1:4321/\n'
  );
});

test('detectLocalUrl reads the framework from package.json', () => {
  const cases = [
    [{ devDependencies: { astro: '^5', vite: '^6' } }, 'http://127.0.0.1:4321/'],
    [{ dependencies: { next: '15' } }, 'http://127.0.0.1:3000/'],
    [{ devDependencies: { '@sveltejs/kit': '2', vite: '6' } }, 'http://127.0.0.1:5173/'],
    [{ devDependencies: { vite: '6' } }, 'http://127.0.0.1:5173/'],
    [{ dependencies: { express: '5' } }, null],
  ];
  for (const [pkg, expected] of cases) {
    const dir = mkdtempSync(join(tmpdir(), 'slop-detect-url-'));
    writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg));
    expect(detectLocalUrl(dir), JSON.stringify(pkg)).toBe(expected);
  }
  expect(detectLocalUrl(mkdtempSync(join(tmpdir(), 'slop-no-pkg-')))).toBeNull();
});

test('re-running init replaces the hook and MCP entries older versions wrote', () => {
  const dir = mkdtempSync(join(tmpdir(), 'slop-legacy-'));
  mkdirSync(join(dir, '.claude'), { recursive: true });
  writeFileSync(
    join(dir, '.claude/settings.local.json'),
    `${JSON.stringify(
      {
        mcpServers: {
          'slop-detect': { command: 'npx', args: ['-y', 'slop-detect-mcp', '--local'] },
        },
        hooks: {
          PostToolUse: [
            {
              matcher: 'Edit|Write|MultiEdit',
              hooks: [{ type: 'command', command: LEGACY_HOOK_COMMANDS[0] }],
            },
            { matcher: 'Bash', hooks: [{ type: 'command', command: 'echo keep-me' }] },
          ],
          Stop: [
            { hooks: [{ type: 'command', command: 'node packages/mcp/hooks/scan-local.mjs' }] },
          ],
        },
      },
      null,
      2
    )}\n`
  );
  applyInitPlan(
    dir,
    planInitFiles({ providers: ['claude'], hooks: true }).filter((f) =>
      f.path.endsWith('settings.local.json')
    )
  );
  const text = readFileSync(join(dir, '.claude/settings.local.json'), 'utf8');
  for (const legacy of LEGACY_HOOK_COMMANDS) expect(text).not.toContain(legacy);
  expect(text).toContain('echo keep-me');
  expect(text.match(/slop-detect-hook/g)).toHaveLength(2);
  expect(JSON.parse(text).mcpServers['slop-detect'].args).toEqual(MCP_SERVER_ARGS);
});
