import * as SecureStore from 'expo-secure-store';

import { env } from '@/env';
import { createAuthService, type AuthStorage } from '@/lib/auth-service';

// The refresh token is the only secret that is stored, in SecureStore under one key (the
// `wattprint` prefix). The access JWT stays in memory (`createTokenProvider`) and never lands here.
export const REFRESH_TOKEN_KEY = 'wattprint.refresh-token';

export const secureStorage: AuthStorage = {
  get: (key) => SecureStore.getItemAsync(key),
  set: (key, value) => SecureStore.setItemAsync(key, value),
  remove: (key) => SecureStore.deleteItemAsync(key),
};

export const authService = createAuthService({
  baseUrl: env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1',
  storage: secureStorage,
  storageKey: REFRESH_TOKEN_KEY,
});

// A fresh access JWT for the API. null: no session (nothing stored, or the server rejected the
// refresh token), so the user is signed out. A failure that proves nothing (network, 5xx) is a
// NetworkError and must not sign the user out.
export const fetchApiToken = authService.refreshAccessToken;
