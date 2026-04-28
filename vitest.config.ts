import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    css: true,
    environment: 'jsdom',
    exclude: ['dist/**', 'tests/e2e/**'],
    globals: true,
    include: [
      'tests/unit/**/*.{test,spec}.{ts,tsx}',
      'tests/component/**/*.{test,spec}.{ts,tsx}',
    ],
    setupFiles: ['./tests/setup/vitest.setup.ts'],
  },
}));
