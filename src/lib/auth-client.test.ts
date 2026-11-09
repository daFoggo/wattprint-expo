import * as SecureStore from 'expo-secure-store';

import { authService, fetchApiToken, REFRESH_TOKEN_KEY, secureStorage } from './auth-client';

jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }));
jest.mock('expo-auth-session', () => ({
  AuthRequest: jest.fn(),
  makeRedirectUri: () => 'wattprint://auth',
  Prompt: { Login: 'login' },
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const getItem = SecureStore.getItemAsync as jest.Mock;
const setItem = SecureStore.setItemAsync as jest.Mock;
const deleteItem = SecureStore.deleteItemAsync as jest.Mock;

describe('auth client', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses one SecureStore key under the wattprint prefix', () => {
    expect(REFRESH_TOKEN_KEY).toBe('wattprint.refresh-token');
    // SecureStore only accepts letters, digits, ".", "-" and "_" in keys.
    expect(REFRESH_TOKEN_KEY).toMatch(/^[A-Za-z0-9._-]+$/);
  });

  it('backs the storage with SecureStore', async () => {
    getItem.mockResolvedValue('r1');
    await expect(secureStorage.get('k')).resolves.toBe('r1');
    await secureStorage.set('k', 'v');
    await secureStorage.remove('k');
    expect(getItem).toHaveBeenCalledWith('k');
    expect(setItem).toHaveBeenCalledWith('k', 'v');
    expect(deleteItem).toHaveBeenCalledWith('k');
  });

  it('exports fetchApiToken as the service refresh (null without a stored session)', async () => {
    expect(fetchApiToken).toBe(authService.refreshAccessToken);
    getItem.mockResolvedValue(null);
    await expect(fetchApiToken()).resolves.toBeNull();
    expect(getItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);
  });
});
