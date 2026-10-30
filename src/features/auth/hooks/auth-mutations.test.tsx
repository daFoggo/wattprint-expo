import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ApiError } from '@/lib/errors';

import { authClient } from '@/lib/auth-client';
import { signOutAndClear } from '@/lib/session';

import { useSignIn } from './use-sign-in';
import { useSignOut } from './use-sign-out';
import { useSignUp } from './use-sign-up';

jest.mock('@/lib/auth-client', () => ({
  authClient: { signIn: { email: jest.fn() }, signUp: { email: jest.fn() } },
}));
jest.mock('@/lib/session', () => ({ signOutAndClear: jest.fn() }));

const signInEmail = authClient.signIn.email as unknown as jest.Mock;
const signUpEmail = authClient.signUp.email as unknown as jest.Mock;
const mockSignOut = signOutAndClear as unknown as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false, gcTime: Infinity } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => jest.clearAllMocks());

describe('useSignIn', () => {
  it('resolves with the Better Auth data', async () => {
    signInEmail.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const { result } = await renderHook(() => useSignIn(), { wrapper });

    await act(() =>
      result.current.mutateAsync({ email: 'a@example.com', password: 'password123' }),
    );

    expect(signInEmail).toHaveBeenCalledWith({ email: 'a@example.com', password: 'password123' });
  });

  it('rejects with an ApiError carrying the status for a wrong password', async () => {
    signInEmail.mockResolvedValue({
      data: null,
      error: { status: 401, message: 'Invalid email or password' },
    });
    const { result } = await renderHook(() => useSignIn(), { wrapper });

    await act(() => result.current.mutate({ email: 'a@example.com', password: 'wrong-password' }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error).toMatchObject({ status: 401 });
  });
});

describe('useSignUp', () => {
  it('sends email, password and name', async () => {
    signUpEmail.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const { result } = await renderHook(() => useSignUp(), { wrapper });
    const input = { email: 'a@example.com', password: 'password123', name: 'An' };

    await act(() => result.current.mutateAsync(input));

    expect(signUpEmail).toHaveBeenCalledWith(input);
  });

  it('surfaces an already-used email as an ApiError', async () => {
    signUpEmail.mockResolvedValue({
      data: null,
      error: {
        status: 422,
        code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
        message: 'User already exists',
      },
    });
    const { result } = await renderHook(() => useSignUp(), { wrapper });

    await act(() =>
      result.current.mutate({ email: 'a@example.com', password: 'password123', name: 'An' }),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ status: 422, message: 'User already exists' });
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
