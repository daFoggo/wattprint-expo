import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ApiError } from '@/lib/errors';

import { authService } from '@/lib/auth-client';
import { primeAccessToken, signOutAndClear } from '@/lib/session';
import { useAuthStore } from '@/stores/auth-store';

import { useSignIn } from './use-sign-in';
import { useSignOut } from './use-sign-out';

jest.mock('@/lib/auth-client', () => ({ authService: { signIn: jest.fn() } }));
jest.mock('@/lib/session', () => ({ signOutAndClear: jest.fn(), primeAccessToken: jest.fn() }));

const signIn = authService.signIn as unknown as jest.Mock;
const mockSignOut = signOutAndClear as unknown as jest.Mock;
const user = { id: 'u1', email: 'a@example.com', full_name: 'An', is_active: true, roles: [] };

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false, gcTime: Infinity } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ status: 'signedOut', user: null });
});

describe('useSignIn', () => {
  it('signs in and puts the user in the auth store', async () => {
    signIn.mockResolvedValue({ accessToken: 'a', user });
    const { result } = await renderHook(() => useSignIn(), { wrapper });

    await act(() => result.current.mutateAsync());

    expect(primeAccessToken).toHaveBeenCalledWith('a');
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedIn', user });
  });

  it('stays signed out when the user closes the browser', async () => {
    signIn.mockResolvedValue(null);
    const { result } = await renderHook(() => useSignIn(), { wrapper });

    await act(() => result.current.mutateAsync());

    expect(primeAccessToken).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('rejects with the ApiError of the backend and stays signed out', async () => {
    signIn.mockRejectedValue(new ApiError(409, 'Email belongs to another account', {}));
    const { result } = await renderHook(() => useSignIn(), { wrapper });

    await act(() => result.current.mutate());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ status: 409 });
    expect(useAuthStore.getState().status).toBe('signedOut');
  });
});

describe('useSignOut', () => {
  it('runs the sign-out cleanup once', async () => {
    mockSignOut.mockResolvedValue(undefined);
    const { result } = await renderHook(() => useSignOut(), { wrapper });

    await act(() => result.current.mutateAsync());

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
