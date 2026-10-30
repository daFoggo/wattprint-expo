import { NetworkError } from '@/lib/errors';

import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';

import { authClient, fetchApiToken } from './auth-client';

jest.mock('better-auth/react', () => {
  const token = jest.fn();
  return { createAuthClient: jest.fn(() => ({ token })) };
});
jest.mock('better-auth/client/plugins', () => ({ jwtClient: () => ({ id: 'jwt' }) }));
jest.mock('@better-auth/expo/client', () => ({ expoClient: jest.fn(() => ({ id: 'expo' })) }));
jest.mock('expo-secure-store', () => ({ __esModule: true, marker: 'secure-store' }));

const mockToken = authClient.token as unknown as jest.Mock;
const mockExpoClient = expoClient as unknown as jest.Mock;
const mockCreateAuthClient = createAuthClient as unknown as jest.Mock;

describe('auth client', () => {
  beforeEach(() => mockToken.mockReset());

  it('stores the session in SecureStore under the wattprint scheme and prefix', () => {
    expect(authClient).toBeDefined();
    expect(mockExpoClient).toHaveBeenCalledWith(
      expect.objectContaining({
        scheme: 'wattprint',
        storagePrefix: 'wattprint',
        storage: expect.objectContaining({ marker: 'secure-store' }),
      }),
    );
  });

  it('points at the local auth service when EXPO_PUBLIC_AUTH_URL is unset', () => {
    expect(mockCreateAuthClient).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: 'http://localhost:3000' }),
    );
  });

  describe('fetchApiToken', () => {
    it('returns the JWT', async () => {
      mockToken.mockResolvedValue({ data: { token: 'jwt-1' }, error: null });
      await expect(fetchApiToken()).resolves.toBe('jwt-1');
    });

    it('returns null when the server rejects the session (401)', async () => {
      mockToken.mockResolvedValue({ data: null, error: { status: 401, message: 'Unauthorized' } });
      await expect(fetchApiToken()).resolves.toBeNull();
    });

    it('throws NetworkError on a server error', async () => {
      mockToken.mockResolvedValue({ data: null, error: { status: 500, message: 'boom' } });
      await expect(fetchApiToken()).rejects.toBeInstanceOf(NetworkError);
    });

    it('throws NetworkError when the request itself fails', async () => {
      mockToken.mockRejectedValue(new TypeError('Network request failed'));
      await expect(fetchApiToken()).rejects.toBeInstanceOf(NetworkError);
    });
  });
});
