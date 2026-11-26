// Shared helpers for the agent hooks. Claude Code, Cursor and Codex pass one
// JSON object on stdin; a manual run (terminal, CI) has none. The hooks behave
// differently in the two cases: as a hook they never block on a condition the
// agent can't fix (#359); from a terminal they keep CLI exit codes.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export async function readHookInput({ idleMs = 300, maxMs = 3000 } = {}) {
  if (process.stdin.isTTY) return null;
  return new Promise((resolve) => {
    let data = '';
    let settled = false;
    let timer = setTimeout(finish, idleMs);
    const hardStop = setTimeout(finish, maxMs);
    function finish() {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(hardStop);
      process.stdin.removeAllListeners('data');
      process.stdin.pause();
      let parsed = null;
      try {
        parsed = data.trim() ? JSON.parse(data) : null;
      } catch {
        parsed = null;
      }
      resolve(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null);
    }
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
      // Input has started: wait for the writer to close stdin (bounded by maxMs).
      clearTimeout(timer);
      timer = setTimeout(finish, maxMs);
    });
    process.stdin.on('end', finish);
    process.stdin.on('error', finish);
  });
}

export function hookEvent(input) {
  if (!input) return null;
  return String(input.hook_event_name || input.event || '') || null;
}

export function isStopEvent(event) {
  return ['Stop', 'SubagentStop', 'stop'].includes(event);
}

// Claude Code sets stop_hook_active when it is already continuing because a
// stop hook blocked; Cursor counts loops instead.
export function stopAlreadyContinued(input) {
  return !!(input && (input.stop_hook_active === true || Number(input.loop_count) > 0));
}

export function readLocalUrl(cwd) {
  try {
    return readFileSync(join(cwd, '.slop', 'local-url'), 'utf8').trim();
  } catch {
    return '';
  }
}

export function hookTarget(argv, env, cwd) {
  return (argv[2] || env.SLOP_LOCAL_URL || readLocalUrl(cwd) || '').trim();
}

// PostToolUse fires for every edit; only edits that can change the rendered
// UI/styles/templates are worth a browser scan (skip pure backend .ts/.js/.md).
const UI_EXTENSIONS = new Set([
  '.html',
  '.htm',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.pcss',
  '.styl',
  '.jsx',
  '.tsx',
  '.vue',
  '.svelte',
  '.astro',
  '.mdx',
  '.liquid',
  '.njk',
  '.hbs',
  '.ejs',
  '.erb',
  '.twig',
]);

export function touchesUi(input) {
  const toolInput = (input && input.tool_input) || {};
  const path = String(toolInput.file_path || toolInput.path || '');
  if (!path) return true;
  const base = path.split(/[\\/]/).pop().toLowerCase();
  if (base === 'design.md' || base === 'tokens.json' || base.startsWith('tailwind.config')) {
    return true;
  }
  const dot = base.lastIndexOf('.');
  return dot >= 0 && UI_EXTENSIONS.has(base.slice(dot));
}

export function firstLine(text) {
  return (
    String(text || '')
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean) || ''
  );
}
