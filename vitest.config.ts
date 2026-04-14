import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/phase1/**/*.test.ts', 'tests/phase2/**/*.test.ts', 'tests/phase3/**/*.test.ts', 'tests/phase4/**/*.test.ts', 'tests/phase5/**/*.test.ts', 'tests/phase7/**/*.test.ts'],
    exclude: ['tests/visual/**'],
    setupFiles: ['tests/setup.ts'],
  },
});
