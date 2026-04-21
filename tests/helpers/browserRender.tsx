/* eslint-disable react-refresh/only-export-components */
import { App as AntApp } from 'antd';
import type { ComponentRenderOptions } from 'vitest-browser-react';
import { render } from 'vitest-browser-react';
import type { PropsWithChildren, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

type TestProvidersProps = PropsWithChildren<{
  route?: string;
}>;

const TestProviders = ({ children, route = '/' }: TestProvidersProps) => (
  <MemoryRouter
    future={{ v7_relativeSplatPath: true, v7_startTransition: true }} // squash some react router 6 warnings
    initialEntries={[route]}
  >
    <AntApp>{children}</AntApp>
  </MemoryRouter>
);

type BrowserRenderOptions = Omit<ComponentRenderOptions, 'wrapper'> & {
  route?: string;
};

export const renderWithProviders = (
  ui: ReactNode,
  { route = '/', ...options }: BrowserRenderOptions = {},
) => render(ui, {
  wrapper: ({ children }) => <TestProviders route={route}>{children}</TestProviders>,
  ...options,
});
