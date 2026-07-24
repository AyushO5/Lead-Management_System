// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    // Run test files serially — prevents concurrent DB access / email collisions
    fileParallelism: false,
    teardownTimeout: 10000,
  },
});
