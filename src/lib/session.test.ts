import { NetworkError } from '@/lib/errors';
import { queryClient } from '@/lib/query-client';
import { z } from 'zod';

import { authService, fetchApiToken } from '@/lib/auth-client';
import { removeLegacyAuthKeys } from '@/lib/legacy-auth-storage';
import { useAuthStore } from '@/stores/auth-store';

import {
  apiClient,
  bootstrapAuth,
  primeAccessToken,
  clearUserScope,
  handleSessionExpired,
  signOutAndClear,
} from './session';

jest.mock('@/lib/auth-client', () => ({
  authService: { signOut: jest.fn(), hasStoredSession: jest.fn() },
  secureStorage: { marker: 'secure-storage' },
  fetchApiToken: jest.fn(),
}));

const signOut = authService.signOut as unknown as jest.Mock;
jest.mock('@/lib/legacy-auth-storage', () => ({ removeLegacyAuthKeys: jest.fn() }));

const hasStoredSession = authService.hasStoredSession as unknown as jest.Mock;
const mockFetchApiToken = fetchApiToken as unknown as jest.Mock;
// handleSessionExpired refreshes through the token provider, which calls fetchApiToken.
const refresh = mockFetchApiToken;

function jwt(secondsFromNow: number): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'HS256' })}.${b64({ exp: Math.floor(Date.now() / 1000) + secondsFromNow })}.sig`;
}

const ok = (body: unknown, status = 200) =>
  Promise.resolve({ status, ok: status < 400, text: () => Promise.resolve(JSON.stringify(body)) });

describe('signOutAndClear', () => {
  beforeEach(() => {
    signOut.mockReset().mockResolvedValue(undefined);
    useAuthStore.setState({ status: 'signedIn', user: null });
    jest.spyOn(queryClient, 'clear').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('signs out, drops the cached token and clears the query cache', async () => {
    mockFetchApiToken.mockReset().mockResolvedValue(jwt(900));
    await apiClient.request('/me', { schema: z.object({}), auth: true }).catch(() => undefined);
    const calls = mockFetchApiToken.mock.calls.length;

    await signOutAndClear();
    await apiClient.request('/me', { schema: z.object({}), auth: true }).catch(() => undefined);

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(mockFetchApiToken.mock.calls.length).toBe(calls + 1);
  });

  it('still clears local state when the remote sign-out fails', async () => {
    signOut.mockRejectedValue(new Error('offline'));
    await expect(signOutAndClear()).rejects.toThrow('offline');
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
  });
});

describe('handleSessionExpired', () => {
  beforeEach(() => {
    signOut.mockReset().mockResolvedValue(undefined);
    refresh.mockReset();
    useAuthStore.setState({ status: 'signedIn', user: null });
    jest.spyOn(queryClient, 'clear').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('signs out when the refresh finds no session (null)', async () => {
    refresh.mockResolvedValue(null);
    await handleSessionExpired();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('keeps the user signed in when the refresh works', async () => {
    refresh.mockResolvedValue(jwt(900));
    await handleSessionExpired();
    expect(signOut).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('signedIn');
  });

  it('keeps the user signed in on a network failure', async () => {
    refresh.mockRejectedValue(new NetworkError('offline'));
    await handleSessionExpired();
    expect(signOut).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('signedIn');
  });

  it('signs out locally, without a server call, on an unexpected error (storage, contract)', async () => {
    refresh.mockRejectedValue(new Error('keystore unreadable'));
    await handleSessionExpired();
    expect(signOut).not.toHaveBeenCalled();
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedOut', user: null });
  });

  it('does not loop: a null refresh asks the server once, then signs out once', async () => {
    refresh.mockResolvedValue(null);
    await handleSessionExpired();
    await new Promise((resolve) => setImmediate(resolve));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('caches the refreshed token, so the next request does not rotate again', async () => {
    const fresh = jwt(900);
    refresh.mockResolvedValue(fresh);
    await handleSessionExpired();
    expect(refresh).toHaveBeenCalledTimes(1);

    const fetchMock = jest.fn(() => ok({ id: 'u1' }));
    global.fetch = fetchMock as unknown as typeof fetch;
    await apiClient.request('/me', { schema: z.object({ id: z.string() }) });

    expect(refresh).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      { headers: Record<string, string> },
    ];
    expect(init.headers.Authorization).toBe(`Bearer ${fresh}`);
  });
});

describe('primeAccessToken', () => {
  it('lets the first request use the sign-in token without fetching another', async () => {
    clearUserScope();
    refresh.mockReset();
    const token = jwt(900);
    const fetchMock = jest.fn(() => ok({ id: 'u1' }));
    global.fetch = fetchMock as unknown as typeof fetch;

    primeAccessToken(token);
    await apiClient.request('/me', { schema: z.object({ id: z.string() }) });

    expect(refresh).not.toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      { headers: Record<string, string> },
    ];
    expect(init.headers.Authorization).toBe(`Bearer ${token}`);
  });
});

describe('bootstrapAuth', () => {
  beforeEach(() => {
    hasStoredSession.mockReset();
    refresh.mockReset();
    useAuthStore.setState({ status: 'unknown', user: null });
  });

  it('removes the legacy keys once at start', async () => {
    hasStoredSession.mockResolvedValue(false);
    await bootstrapAuth();
    expect(removeLegacyAuthKeys).toHaveBeenCalledWith({ marker: 'secure-storage' });
  });

  it('is signed in when a refresh token is stored, without calling the server', async () => {
    hasStoredSession.mockResolvedValue(true);
    await bootstrapAuth();
    expect(useAuthStore.getState().status).toBe('signedIn');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('is signed out when nothing is stored', async () => {
    hasStoredSession.mockResolvedValue(false);
    await bootstrapAuth();
    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('is signed out when the store cannot be read', async () => {
    hasStoredSession.mockRejectedValue(new Error('keystore'));
    await bootstrapAuth();
    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('does not overwrite a status that was set while it was reading', async () => {
    hasStoredSession.mockImplementation(async () => {
      useAuthStore.getState().setSignedOut();
      return true;
    });
    await bootstrapAuth();
    expect(useAuthStore.getState().status).toBe('signedOut');
  });
});

describe('apiClient', () => {
  const schema = z.object({ id: z.string() });
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    mockFetchApiToken.mockReset();
    refresh.mockReset();
    signOut.mockReset().mockResolvedValue(undefined);
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(queryClient, 'clear').mockImplementation(() => undefined);
    return signOutAndClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it('sends the JWT as a Bearer token', async () => {
    const token = jwt(900);
    mockFetchApiToken.mockResolvedValue(token);
    fetchMock.mockReturnValue(ok({ id: 'u1' }));

    await expect(apiClient.request('/me', { schema })).resolves.toEqual({ id: 'u1' });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe(`Bearer ${token}`);
  });

  it('refreshes the JWT once on 401 and retries with the new one', async () => {
    const stale = jwt(900);
    const fresh = jwt(1800);
    mockFetchApiToken.mockResolvedValueOnce(stale).mockResolvedValueOnce(fresh);
    fetchMock
      .mockReturnValueOnce(ok({ detail: 'Invalid or expired token' }, 401))
      .mockReturnValueOnce(ok({ id: 'u1' }));

    await expect(apiClient.request('/me', { schema })).resolves.toEqual({ id: 'u1' });

    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe(`Bearer ${fresh}`);
  });

  it('does not sign out when the refresh fails because the network is down', async () => {
    mockFetchApiToken
      .mockResolvedValueOnce(jwt(900))
      .mockRejectedValueOnce(new NetworkError('offline'));
    refresh.mockRejectedValue(new NetworkError('offline'));
    fetchMock.mockReturnValue(ok({ detail: 'Invalid or expired token' }, 401));
    signOut.mockClear();

    await expect(apiClient.request('/me', { schema })).rejects.toMatchObject({ status: 401 });
    await new Promise((resolve) => setImmediate(resolve));

    expect(signOut).not.toHaveBeenCalled();
    // The token for the request, then one refresh that failed: no second refresh with the same
    // stored refresh token (the spent-token replay would revoke the session).
    expect(mockFetchApiToken).toHaveBeenCalledTimes(2);
  });
});

describe('user scope', () => {
  const schema = z.object({ id: z.string() });
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    mockFetchApiToken.mockReset();
    refresh.mockReset();
    signOut.mockReset().mockResolvedValue(undefined);
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(queryClient, 'clear').mockImplementation(() => undefined);
    clearUserScope();
    (queryClient.clear as jest.Mock).mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it('clears the token and the query cache before the remote sign-out finishes', async () => {
    let finish!: () => void;
    signOut.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));

    const pending = signOutAndClear();
    expect(queryClient.clear).toHaveBeenCalledTimes(1);

    finish();
    await pending;
  });

  it('clearUserScope drops the cached token and the query cache', async () => {
    mockFetchApiToken.mockResolvedValue(jwt(900));
    fetchMock.mockImplementation(() => ok({ id: 'u1' }));
    await apiClient.request('/me', { schema });
    const fetched = mockFetchApiToken.mock.calls.length;

    clearUserScope();
    await apiClient.request('/me', { schema });

    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(mockFetchApiToken.mock.calls.length).toBe(fetched + 1);
  });

  it('signs the user out when the refresh finds no session while fetching a token', async () => {
    mockFetchApiToken.mockResolvedValue(null);
    refresh.mockResolvedValue(null);
    fetchMock.mockImplementation(() => ok({ detail: 'Not authenticated' }, 401));

    await expect(apiClient.request('/me', { schema })).rejects.toMatchObject({ status: 401 });
    await new Promise((resolve) => setImmediate(resolve));

    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
