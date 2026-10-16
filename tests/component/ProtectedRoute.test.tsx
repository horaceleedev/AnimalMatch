import type { ReactNode } from 'react';
import { Route, Routes, useLocation, type Location } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/DataStores', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../src/DataStores';
import { ProtectedRoute } from '../../src/routes/ProtectedRoute';
import { renderWithProviders, screen } from '../helpers/render';

const mockedUseAuth = vi.mocked(useAuth);

const makeAuthValue = (overrides: Partial<ReturnType<typeof useAuth>> = {}): ReturnType<typeof useAuth> => ({
  user: null,
  login: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn(),
  ...overrides,
});

const LoginLocationState = (): ReactNode => {
  const from = useLocation().state as Location | null;
  return (
    <>
      <span data-testid="from-pathname">{from?.pathname}</span>
      <span data-testid="from-search">{from?.search}</span>
    </>
  );
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated users to login and preserves the attempted location', () => {
    mockedUseAuth.mockReturnValue(makeAuthValue());

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginLocationState />} />
        <Route
          path="/protected"
          element={(
            <ProtectedRoute>
              <div>Secret content</div>
            </ProtectedRoute>
          )}
        />
      </Routes>,
      { route: '/protected?tab=details' },
    );

    expect(screen.getByTestId('from-pathname').textContent).toBe('/protected');
    expect(screen.getByTestId('from-search').textContent).toBe('?tab=details');
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument();
  });

  it('renders the child route when a user is authenticated', () => {
    mockedUseAuth.mockReturnValue(makeAuthValue({
      user: {
        avatar: '',
        collectionId: 'users',
        collectionName: 'users',
        created: '2026-01-01T00:00:00.000Z',
        email: 'demo@example.com',
        emailVisibility: true,
        id: 'user-1',
        name: 'Demo User',
        updated: '2026-01-01T00:00:00.000Z',
        username: 'demo',
        verified: true,
      },
    }));

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<div>Login screen</div>} />
        <Route
          path="/protected"
          element={(
            <ProtectedRoute>
              <div>Secret content</div>
            </ProtectedRoute>
          )}
        />
      </Routes>,
      { route: '/protected' },
    );

    expect(screen.getByText('Secret content')).toBeInTheDocument();
    expect(screen.queryByText('Login screen')).not.toBeInTheDocument();
  });
});