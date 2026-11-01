import { env } from '@/env';
import { authService, fetchApiToken } from '@/lib/auth-client';
import { createTokenProvider } from '@/lib/auth-token';
import { createApiClient } from '@/lib/http';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';

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
// previous user's token or data for the next user. The store is updated even when the remote call
// fails (the user is signed out locally either way); the failure still reaches the caller.
export async function signOutAndClear(): Promise<void> {
  clearUserScope();
  try {
    await authService.signOut();
  } finally {
    useAuthStore.getState().setSignedOut();
  }
}

// Called when the API rejected a fresh token. One refresh decides: no session (null) signs the user
// out; a network or server failure must not (the app has to keep working offline).
export async function handleSessionExpired(): Promise<void> {
  try {
    if (await authService.refreshAccessToken()) return;
  } catch {
    return;
  }
  await signOutAndClear().catch(() => undefined);
}

// Start-up: a stored refresh token means signed in, without asking the server (works offline; the
// first API call refreshes, and a rejected token then signs the user out). No token, or an
// unreadable store, means signed out.
export async function bootstrapAuth(): Promise<void> {
  const { status, setSignedIn, setSignedOut } = useAuthStore.getState();
  if (status !== 'unknown') return;
  const stored = await authService.hasStoredSession().catch(() => false);
  // A sign-in or sign-out that finished while the store was being read wins.
  if (useAuthStore.getState().status !== 'unknown') return;
  if (stored) setSignedIn();
  else setSignedOut();
}

export const apiClient = createApiClient({
  baseUrl: env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1',
  getAccessToken: tokens.getToken,
  refreshAccessToken: () => tokens.refresh().catch(() => null),
  onSessionExpired: () => void handleSessionExpired(),
});
