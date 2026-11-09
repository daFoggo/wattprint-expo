import { env } from '@/env';
import { authService, fetchApiToken, REFRESH_TOKEN_KEY, secureStorage } from '@/lib/auth-client';
import { createTokenProvider } from '@/lib/auth-token';
import { NetworkError } from '@/lib/errors';
import { createApiClient } from '@/lib/http';
import { removeLegacyAuthKeys } from '@/lib/legacy-auth-storage';
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

// The access token a sign-in just returned becomes the cached one, so the first API call does not
// rotate the refresh token again.
export function primeAccessToken(token: string): void {
  tokens.prime(token);
}

// Forget everything that belongs to the current user: the cached JWT and the query cache.
export function clearUserScope(): void {
  tokens.clear();
  queryClient.clear();
}

// The local cleanup, including the store, runs before the remote call, so a slow (offline) or failing
// sign-out never keeps the user on screen nor leaves the previous user's token or data for the next
// user; a failure still reaches the caller.
export async function signOutAndClear(): Promise<void> {
  clearUserScope();
  useAuthStore.getState().setSignedOut();
  await authService.signOut();
}

let expiring = false;

// Called when the API rejected a fresh token. One refresh through the token provider decides (and
// its new token stays cached, so later requests use it instead of rotating again): no session
// (null) signs the user out; a network or server failure must not (the app has to keep working
// offline). Not re-entrant: the provider's own null-token hook cannot start a second round.
export async function handleSessionExpired(): Promise<void> {
  if (expiring) return;
  expiring = true;
  try {
    if (await tokens.refresh()) return;
    await signOutAndClear().catch(() => undefined);
  } catch (error) {
    // Offline: keep the user signed in. Anything else (storage, contract) leaves no way to get a
    // token, so sign out locally instead of a "signed in" app where every request fails.
    if (!(error instanceof NetworkError)) {
      clearUserScope();
      useAuthStore.getState().setSignedOut();
      // Also forget the stored token, so the next launch does not start signed in with a dead token.
      try {
        await secureStorage.remove(REFRESH_TOKEN_KEY);
      } catch {
        // Best effort.
      }
    }
  } finally {
    expiring = false;
  }
}

// Start-up: a stored refresh token means signed in, without asking the server (works offline; the
// first API call refreshes, and a rejected token then signs the user out). No token, or an
// unreadable store, means signed out.
export async function bootstrapAuth(): Promise<void> {
  const { status, setSignedIn, setSignedOut } = useAuthStore.getState();
  if (status !== 'unknown') return;
  void removeLegacyAuthKeys(secureStorage);
  const stored = await authService.hasStoredSession().catch(() => false);
  // A sign-in or sign-out that finished while the store was being read wins.
  if (useAuthStore.getState().status !== 'unknown') return;
  if (stored) setSignedIn();
  else setSignedOut();
}

export const apiClient = createApiClient({
  baseUrl: env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1',
  getAccessToken: tokens.getToken,
  // A failure propagates: the client treats it as "unknown", only a null token ends the session.
  refreshAccessToken: () => tokens.refresh(),
  onSessionExpired: () => void handleSessionExpired(),
});
