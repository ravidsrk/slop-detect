import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSlopWasm, DEFINITIONS_VERSION } from '../src/index.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const WASM_PATH = path.join(ROOT, 'target/wasm32-unknown-unknown/release/slop_wasm.wasm');
const hasWasm = fs.existsSync(WASM_PATH);

describe('loadSlopWasm universal WebAssembly bridge', () => {
  it.skipIf(!hasWasm)(
    'loads slop_wasm.wasm and matches core scoring, lint, fix_prompt, and extract',
    async () => {
      const bytes = fs.readFileSync(WASM_PATH);
      const engine = await loadSlopWasm(bytes);

      expect(engine.version().definitionsVersion).toBe(DEFINITIONS_VERSION);
      expect(engine.parseColor('#1FA85E')).toMatchObject({ r: 31, g: 168, b: 94 });

      const lint = engine.lintDesignMd(
        '---\nname: Test\nspecVersion: alpha\ncolors:\n  bg: "#F4F5F2"\n  ink: "#181815"\ncomponents:\n  card:\n    backgroundColor: "{colors.bg}"\n    textColor: "{colors.ink}"\n---\n'
      );
      expect(lint.valid).toBe(true);

      const fix = engine.fixPrompt({ patterns: ['bento_grid', 'gradient_text'], brief: true });
      expect(fix.mode).toBe('avoid');
      expect(fix.text).toContain('bento_grid');

      const extracted = engine.extractDesignSystem(
        {
          surface: 'rgb(244, 245, 242)',
          headings: [{ color: 'rgb(24, 24, 21)', fontFamily: 'Newsreader' }],
          ctas: [{ bg: 'rgb(31, 168, 94)', color: 'rgb(24, 24, 21)' }],
          fonts: { 'Newsreader, serif': 5 },
          radii: [4],
        },
        { name: 'Editorial Paper' }
      );
      expect(extracted.designMd).toContain('Editorial Paper');
      expect(extracted.dtcg.$schema).toContain('2025.10');
    }
  );
});
