import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'bin/slop': 'bin/slop.ts',
  },
  format: ['esm', 'cjs'],
  dts: {
    entry: 'src/index.ts',
    compilerOptions: {
      composite: false,
    },
  },
  sourcemap: true,
  clean: true,
  treeshake: true,
  noExternal: ['@slop-detect/core'],
  target: 'node20',
  outDir: 'dist',
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' };
  },
});
