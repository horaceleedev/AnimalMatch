import { defineConfig, mergeConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

import viteConfig from './vite.config';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
    css: true,
    exclude: ['dist/**', 'tests/e2e/**'],
    globals: true,
    include: ['tests/browser/**/*.browser.{test,spec}.{ts,tsx}'],
    setupFiles: ['./tests/setup/browser.setup.ts'],
  },
}));
