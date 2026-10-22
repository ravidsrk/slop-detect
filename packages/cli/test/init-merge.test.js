import { test, expect } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyInitPlan, planInitFiles, HOOK_COMMAND } from '../src/init-project.ts';

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
  expect(again.match(/scan-regression\.mjs/g)).toHaveLength(2);
  const cursorAgain = JSON.parse(readFileSync(join(dir, '.cursor/hooks.json'), 'utf8'));
  expect(cursorAgain.hooks.stop).toHaveLength(2);
});
