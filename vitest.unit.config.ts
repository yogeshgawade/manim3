import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'unit',
    environment: 'jsdom',
    include: ['tests/phase1/**/*.test.ts', 'tests/phase2/**/*.test.ts'],
    exclude: ['tests/visual/**'],
    setupFiles: ['tests/setup.ts'],
  },
});
