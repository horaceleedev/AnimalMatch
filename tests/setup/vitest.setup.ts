import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// NOTE(ADW): This was a total pain to figure out: Ant Designs responsive hooks
// call `window.matchMedia`, which jsdom does not provide with the browser-like shape they expect.
// This mock should (TM) prevent errors in tests using ant components.
const installMatchMedia = () => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string): MediaQueryList => ({
      addEventListener: () => {},
      addListener: () => {},
      dispatchEvent: () => false,
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: () => {},
      removeListener: () => {},
    }),
  });
};

installMatchMedia();

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.restoreAllMocks();
  installMatchMedia();
});
