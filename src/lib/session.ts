import { env } from '@/env';
import { authClient, fetchApiToken } from '@/lib/auth-client';
import { createTokenProvider } from '@/lib/auth-token';
import { createApiClient } from '@/lib/http';
import { queryClient } from '@/lib/query-client';

const tokens = createTokenProvider({ fetchToken: fetchApiToken });

// Local sign-out cleanup runs even when the remote call fails, so the next user never sees the
// previous user's token or cached data. The remote failure still reaches the caller.
export async function signOutAndClear(): Promise<void> {
  try {
    await authClient.signOut();
  } finally {
    tokens.clear();
    queryClient.clear();
  }
}

// Called when the API rejected a fresh token. Only a server that says "no session" signs the user
// out; a network or server failure must not (the app has to keep working offline).
export async function handleSessionExpired(): Promise<void> {
  try {
    const { data, error } = await authClient.getSession({ query: { disableCookieCache: true } });
    if (data) return;
    if (error && error.status !== 401) return;
  } catch {
    return;
  }
  await signOutAndClear().catch(() => undefined);
}

export const apiClient = createApiClient({
  baseUrl: env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1',
  getAccessToken: tokens.getToken,
  refreshAccessToken: () => tokens.refresh().catch(() => null),
  onSessionExpired: () => void handleSessionExpired(),
});
