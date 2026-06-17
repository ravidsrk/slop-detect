import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.{ts,js}'],
    environment: 'node',
    // Golden fixtures cold-start Chromium on first run; 5s default flakes locally.
    testTimeout: 60_000,
  },
});
