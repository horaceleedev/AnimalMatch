/* eslint-disable react-refresh/only-export-components */
import { render, type RenderOptions } from '@testing-library/react';
import { App as AntApp } from 'antd';
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

type AppRenderOptions = Omit<RenderOptions, 'wrapper'> & {
  route?: string;
};

// A plain <MemoryRouter> isn't enough for components that use data-router-only
// hooks like useBlocker, so tests render through a real data router instead.
export const renderWithProviders = (
  ui: ReactElement,
  { route = '/', ...options }: AppRenderOptions = {},
) => {
  const router = createMemoryRouter(
    [{ path: '*', element: <AntApp>{ui}</AntApp> }],
    { initialEntries: [route], future: { v7_relativeSplatPath: true } },
  );

  return render(<RouterProvider router={router} future={{ v7_startTransition: true }} />, options);
};

export { default as userEvent } from '@testing-library/user-event';
export * from '@testing-library/react';
