import { env } from '@/env';
import { authClient, fetchApiToken } from '@/lib/auth-client';
import { createTokenProvider } from '@/lib/auth-token';
import { createApiClient } from '@/lib/http';
import { queryClient } from '@/lib/query-client';

const tokens = createTokenProvider({
  fetchToken: async () => {
    const token = await fetchApiToken();
    // The auth service rejected the session: confirm it and sign out, instead of sending
    // token-less requests that FastAPI answers with 401 forever.
    if (!token) void handleSessionExpired();
    return token;
  },
});

// Forget everything that belongs to the current user: the cached JWT and the query cache.
export function clearUserScope(): void {
  tokens.clear();
  queryClient.clear();
}

// The local cleanup runs before the remote call, so a slow or failing sign-out can never leave the
// previous user's token or data for the next user. A remote failure still reaches the caller.
export async function signOutAndClear(): Promise<void> {
  clearUserScope();
  await authClient.signOut();
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
