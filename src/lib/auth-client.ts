import { expoClient } from '@better-auth/expo/client';
import { jwtClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

import { env } from '@/env';
import { NetworkError } from '@/lib/errors';

// Session and cookies live in SecureStore (expoClient); the JWT for FastAPI never does.
export const authClient = createAuthClient({
  baseURL: env.EXPO_PUBLIC_AUTH_URL ?? 'http://localhost:3000',
  plugins: [
    expoClient({ scheme: 'wattprint', storagePrefix: 'wattprint', storage: SecureStore }),
    jwtClient(),
  ],
});

// A fresh JWT for the FastAPI backend. null: the server rejected the session (401), so the user
// is signed out. Anything else that fails is a NetworkError and must not sign the user out.
export async function fetchApiToken(): Promise<string | null> {
  let result;
  try {
    result = await authClient.token();
  } catch (cause) {
    throw new NetworkError('Could not reach the auth service', { cause });
  }
  if (result.data?.token) return result.data.token;
  if (result.error?.status === 401) return null;
  throw new NetworkError('Could not get an API token', { cause: result.error });
}
