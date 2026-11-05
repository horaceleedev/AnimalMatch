import { App as AntApp } from 'antd';
import type { ComponentRenderOptions } from 'vitest-browser-react';
import { render } from 'vitest-browser-react';
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

type BrowserRenderOptions = Omit<ComponentRenderOptions, 'wrapper'> & {
  route?: string;
};

// A plain <MemoryRouter> isn't enough for components that use data-router-only
// hooks like useBlocker, so tests render through a real data router instead.
export const renderWithProviders = (
  ui: ReactElement,
  { route = '/', ...options }: BrowserRenderOptions = {},
) => {
  const router = createMemoryRouter(
    [{ path: '*', element: <AntApp>{ui}</AntApp> }],
    { initialEntries: [route], future: { v7_relativeSplatPath: true } },
  );

  return render(<RouterProvider router={router} future={{ v7_startTransition: true }} />, options);
};
