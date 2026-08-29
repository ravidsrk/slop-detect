// Flat ESLint config for the slop-detect monorepo.
//
// Mixed JS + TS, several runtimes. The packages do not share a global env:
//   • core (TypeScript)          → Node ESM, plus DOM for the in-page detectors
//   • cli / mcp / action (JS)     → Node ESM
//   • web/functions (JS)          → Cloudflare Workers (fetch, Response, URL,
//                                   crypto, caches…) plus node:* via nodejs_compat
//   • *.test.{js,ts}              → Node + node:test
//
// Formatting is owned by Prettier, so eslint-config-prettier is applied last to
// switch off every stylistic rule that would fight it. ESLint here is for
// *correctness* (undefined vars, unreachable code, bad regex), not style.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

const unusedVars = ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }];

export default tseslint.config(
  // Never lint generated, vendored, or static-asset trees.
  {
    ignores: [
      'node_modules/**',
      '**/dist/**',
      '**/build/**',
      'apps/web/public/**',
      'assets-raw/**',
      'package-lock.json',
    ],
  },

  js.configs.recommended,

  // JavaScript: Node ESM (cli, mcp, action, calibration, web/functions, scripts).
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': unusedVars,
      'no-constant-condition': ['error', { checkLoops: false }],
      // Empty `catch {}` is a deliberate best-effort-swallow idiom throughout
      // the codebase (KV reads, optional parsing). Allow it; flag other empties.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },

  // TypeScript + TSX (core/cli/mcp packages, web/jsx views). Scope
  // typescript-eslint's recommended rules to .ts/.tsx only so its parser/rules
  // never touch the JS files.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended],
    languageOptions: {
      // core's detector modules run in the headless browser; DOM globals are
      // declared via tsconfig `lib`, and the compiler — not eslint — checks them.
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      // TypeScript resolves identifiers; core no-undef double-reports + can't see
      // ambient/lib globals. Off for TS, per typescript-eslint guidance.
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': unusedVars,
      // The engine is mid-migration to strict types; `any` is allowed for now and
      // ramped down per-module (see MIGRATION.md). Keep correctness rules on.
      '@typescript-eslint/no-explicit-any': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Style, not correctness — and the JS half of the repo doesn't enforce
      // these either. `var` is intentional in the in-page serialized detectors
      // (text.ts/rules.ts run inside the browser), so leave it alone.
      'no-var': 'off',
      'prefer-const': 'off',
    },
  },

  // Cloudflare Workers runtime for the Pages Functions (now TypeScript). For .ts
  // the compiler resolves globals (no-undef is off above); these globals also
  // cover any remaining .js and keep the worker env explicit.
  {
    files: ['apps/web/functions/**/*.{js,ts,tsx}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.worker, ...globals.browser },
    },
  },

  // In-browser evaluation JS modules (the CLI's Puppeteer runner). These export
  // functions serialized + executed inside the headless page, so document/window/
  // getComputedStyle are defined at runtime. (core's equivalents are .ts above.)
  {
    files: ['packages/cli/src/detector.ts', 'packages/cli/bin/*.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },

  // Test files also get the node:test harness via imports; just ensure Node env.
  {
    files: ['**/test/**/*.{js,ts}', '**/*.test.{js,ts}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Must come last: disable all formatting rules so Prettier is the only
  // authority on layout.
  prettier
);
