// Flat ESLint config for the slop-detect monorepo.
//
// One config, three runtimes. The packages do not share a global environment:
//   • core / cli / mcp / action  → Node (ESM)
//   • web/functions              → Cloudflare Workers (fetch, Response, URL,
//                                   crypto, caches…) plus node:* via
//                                   nodejs_compat (those are imports, not
//                                   globals, so only the Worker globals matter)
//   • *.test.js                  → Node + node:test
//
// Formatting is owned by Prettier, so eslint-config-prettier is applied last to
// switch off every stylistic rule that would fight it. ESLint here is for
// *correctness* (undefined vars, unreachable code, bad regex), not style.
import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  // Never lint generated, vendored, or static-asset trees.
  {
    ignores: [
      'node_modules/**',
      '**/dist/**',
      '**/build/**',
      'packages/web/public/**',
      'assets-raw/**',
      'package-lock.json',
    ],
  },

  js.configs.recommended,

  // Default: Node ESM (core, cli, mcp, action, calibration, root scripts).
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      // Surface unused code as a warning, not a hard error, so the gate can be
      // adopted incrementally without turning CI red. Underscore-prefixed args
      // and caught errors are intentional throwaways.
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-constant-condition': ['error', { checkLoops: false }],
      // Empty `catch {}` is a deliberate best-effort-swallow idiom throughout
      // the codebase (KV reads, optional parsing). Allow it; flag other empties.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },

  // Cloudflare Workers runtime for the Pages Functions.
  {
    files: ['packages/web/functions/**/*.js'],
    languageOptions: {
      globals: { ...globals.node, ...globals.worker, ...globals.browser },
    },
  },

  // In-browser evaluation modules. These export detector functions that are
  // serialized and executed inside the headless Chromium page (via puppeteer
  // page.evaluate / the scan Worker), so document/window/getComputedStyle are
  // defined at runtime even though the file is authored as a Node ESM module.
  {
    files: ['packages/core/src/**/*.js', 'packages/cli/src/detector.js', 'packages/cli/bin/*.js'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },

  // Test files also get the node:test harness via imports; just ensure Node env.
  {
    files: ['**/test/**/*.js', '**/*.test.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Must come last: disable all formatting rules so Prettier is the only
  // authority on layout.
  prettier,
];
