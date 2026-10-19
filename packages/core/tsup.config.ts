import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/patterns.ts',
    'src/fonts.ts',
    'src/color.ts',
    'src/system.ts',
    'src/aeo.ts',
    'src/fixes.ts',
  ],
  format: ['esm', 'cjs'],
  splitting: false,
  dts: {
    compilerOptions: {
      composite: false,
    },
  },
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: 'node20',
});
