/* eslint-disable react-refresh/only-export-components */
import { render, type RenderOptions } from '@testing-library/react';
import { App as AntApp } from 'antd';
import type { PropsWithChildren, ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

type TestProvidersProps = PropsWithChildren<{
  route?: string;
}>;

const TestProviders = ({ children, route = '/' }: TestProvidersProps) => (
  <MemoryRouter
    future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    initialEntries={[route]}
  >
    <AntApp>{children}</AntApp>
  </MemoryRouter>
);

type AppRenderOptions = Omit<RenderOptions, 'wrapper'> & {
  route?: string;
};

export const renderWithProviders = (
  ui: ReactElement,
  { route = '/', ...options }: AppRenderOptions = {},
) => render(ui, {
  wrapper: ({ children }) => <TestProviders route={route}>{children}</TestProviders>,
  ...options,
});

export { default as userEvent } from '@testing-library/user-event';
export * from '@testing-library/react';
