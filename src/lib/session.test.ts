import { NetworkError } from '@/lib/errors';
import { queryClient } from '@/lib/query-client';
import { z } from 'zod';

import { authClient, fetchApiToken } from '@/lib/auth-client';

import { apiClient, handleSessionExpired, signOutAndClear } from './session';

jest.mock('@/lib/auth-client', () => ({
  authClient: { signOut: jest.fn(), getSession: jest.fn() },
  fetchApiToken: jest.fn(),
}));

const signOut = authClient.signOut as unknown as jest.Mock;
const getSession = authClient.getSession as unknown as jest.Mock;
const mockFetchApiToken = fetchApiToken as unknown as jest.Mock;

function jwt(secondsFromNow: number): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'EdDSA' })}.${b64({ exp: Math.floor(Date.now() / 1000) + secondsFromNow })}.sig`;
}

const ok = (body: unknown, status = 200) =>
  Promise.resolve({ status, ok: status < 400, text: () => Promise.resolve(JSON.stringify(body)) });

describe('signOutAndClear', () => {
  beforeEach(() => {
    signOut.mockReset().mockResolvedValue({ data: { success: true }, error: null });
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
    signOut.mockReset().mockResolvedValue({ data: null, error: null });
    getSession.mockReset();
    jest.spyOn(queryClient, 'clear').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('signs out when the server has no session any more', async () => {
    getSession.mockResolvedValue({ data: null, error: null });
    await handleSessionExpired();
    expect(getSession).toHaveBeenCalledWith({ query: { disableCookieCache: true } });
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('signs out when the server answers 401', async () => {
    getSession.mockResolvedValue({ data: null, error: { status: 401, message: 'no' } });
    await handleSessionExpired();
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('keeps the user signed in when the session is still alive', async () => {
    getSession.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    await handleSessionExpired();
    expect(signOut).not.toHaveBeenCalled();
  });

  it('keeps the user signed in on a network failure', async () => {
    getSession.mockRejectedValue(new NetworkError('offline'));
    await handleSessionExpired();
    expect(signOut).not.toHaveBeenCalled();
  });

  it('keeps the user signed in on a server error', async () => {
    getSession.mockResolvedValue({ data: null, error: { status: 503, message: 'down' } });
    await handleSessionExpired();
    expect(signOut).not.toHaveBeenCalled();
  });
});

describe('apiClient', () => {
  const schema = z.object({ id: z.string() });
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    mockFetchApiToken.mockReset();
    getSession.mockReset();
    signOut.mockReset().mockResolvedValue({ data: null, error: null });
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
    getSession.mockRejectedValue(new NetworkError('offline'));
    fetchMock.mockReturnValue(ok({ detail: 'Invalid or expired token' }, 401));
    signOut.mockClear();

    await expect(apiClient.request('/me', { schema })).rejects.toMatchObject({ status: 401 });
    await new Promise((resolve) => setImmediate(resolve));

    expect(signOut).not.toHaveBeenCalled();
  });
});
