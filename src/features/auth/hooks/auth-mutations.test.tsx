import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ApiError } from '@/lib/errors';

import { authService } from '@/lib/auth-client';
import { signOutAndClear } from '@/lib/session';
import { useAuthStore } from '@/stores/auth-store';

import { useSignIn } from './use-sign-in';
import { useSignOut } from './use-sign-out';
import { useSignUp } from './use-sign-up';

jest.mock('@/lib/auth-client', () => ({
  authService: { signIn: jest.fn(), signUp: jest.fn() },
}));
jest.mock('@/lib/session', () => ({ signOutAndClear: jest.fn() }));

const signIn = authService.signIn as unknown as jest.Mock;
const signUp = authService.signUp as unknown as jest.Mock;
const mockSignOut = signOutAndClear as unknown as jest.Mock;
const user = { id: 'u1', email: 'a@example.com', full_name: 'An', is_active: true };

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

    await act(() =>
      result.current.mutateAsync({ email: 'a@example.com', password: 'password123' }),
    );

    expect(signIn).toHaveBeenCalledWith({ email: 'a@example.com', password: 'password123' });
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedIn', user });
  });

  it('rejects with the ApiError of a wrong password and stays signed out', async () => {
    signIn.mockRejectedValue(new ApiError(401, 'Incorrect email or password', {}));
    const { result } = await renderHook(() => useSignIn(), { wrapper });

    await act(() => result.current.mutate({ email: 'a@example.com', password: 'wrong-password' }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error).toMatchObject({ status: 401 });
    expect(useAuthStore.getState().status).toBe('signedOut');
  });
});

describe('useSignUp', () => {
  it('sends email, password and name, then signs the user in', async () => {
    signUp.mockResolvedValue({ accessToken: 'a', user });
    const { result } = await renderHook(() => useSignUp(), { wrapper });
    const input = { email: 'a@example.com', password: 'password123', name: 'An' };

    await act(() => result.current.mutateAsync(input));

    expect(signUp).toHaveBeenCalledWith(input);
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedIn', user });
  });

  it('surfaces an already registered email as an ApiError', async () => {
    signUp.mockRejectedValue(new ApiError(409, 'Email already registered', {}));
    const { result } = await renderHook(() => useSignUp(), { wrapper });

    await act(() =>
      result.current.mutate({ email: 'a@example.com', password: 'password123', name: 'An' }),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({
      status: 409,
      message: 'Email already registered',
    });
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
