import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockLocation = { state: '/videos' as string | null };

// The simplest test is a normal jsdom test, without a real browser env.

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useLocation: () => mockLocation,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../src/DataStores', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../src/DataStores';
import { renderWithProviders, screen, userEvent, waitFor } from '../helpers/render';
import { LoginPage } from '../../src/routes/LoginPage';

const mockedUseAuth = vi.mocked(useAuth);
// This helper gives us an auth shaped object, we override as needed.
const makeAuthValue = (overrides: Partial<ReturnType<typeof useAuth>> = {}): ReturnType<typeof useAuth> => ({
  user: null,
  login: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn(),
  ...overrides,
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.state = '/videos';
  });

  // This is an example of a normal component test in jsdom, rather than a real browser.
  // We mock the auth hook and the router hooks, render the page, fill in the form, and check the user-visible outcome.
  it('submits credentials and navigates to the original destination', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue(makeAuthValue({ login }));

    renderWithProviders(<LoginPage />);

    // userEvent is the usual way to model real user interactions like typing and clicking.
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Username or email address'), 'demo-user');
    await user.type(screen.getByPlaceholderText('Password'), 'hunter2');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    // can use waitFor when the component updates after async work.
    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('demo-user', 'hunter2');
      expect(mockNavigate).toHaveBeenCalledWith('/videos');
    });
  });

  // A second test in the same file is usually where we cover an alternative path or failure case for the same component.
  it('shows an error message when login fails', async () => {
    const login = vi.fn().mockRejectedValue(new Error('boom'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockedUseAuth.mockReturnValue(makeAuthValue({ login }));

    renderWithProviders(<LoginPage />);

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Username or email address'), 'demo-user');
    await user.type(screen.getByPlaceholderText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('An unexpected error occurred')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
