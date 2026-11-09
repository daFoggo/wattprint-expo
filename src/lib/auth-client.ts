import { AuthRequest, makeRedirectUri, Prompt } from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';

import { env } from '@/env';
import { createAuthService, oidcEndpoints, type AuthStorage } from '@/lib/auth-service';

// Only does something on web; native completes the session through the redirect URL.
WebBrowser.maybeCompleteAuthSession();

// The refresh token is the only secret that is stored, in SecureStore under one key (the
// `wattprint` prefix). The access token stays in memory (`createTokenProvider`) and never lands here.
export const REFRESH_TOKEN_KEY = 'wattprint.refresh-token';

// Public client of the `wattprint` realm (keycloak/realm in wattprint-fastapi): PKCE, no secret.
export const KEYCLOAK_CLIENT_ID = 'wattprint-mobile';

export const secureStorage: AuthStorage = {
  get: (key) => SecureStore.getItemAsync(key),
  set: (key, value) => SecureStore.setItemAsync(key, value),
  remove: (key) => SecureStore.deleteItemAsync(key),
};

// A production build has no localhost fallback: cleartext to localhost would fail on Android anyway.
if (env.EXPO_PUBLIC_APP_ENV === 'production' && !env.EXPO_PUBLIC_KEYCLOAK_URL) {
  throw new Error('EXPO_PUBLIC_KEYCLOAK_URL is required in production');
}
const issuer = env.EXPO_PUBLIC_KEYCLOAK_URL ?? 'http://localhost:11095/realms/wattprint';

// Must be registered in the realm client (`wattprint://auth`).
const redirectUri = makeRedirectUri({ scheme: 'wattprint', path: 'auth' });

async function promptLogin() {
  const request = new AuthRequest({
    clientId: KEYCLOAK_CLIENT_ID,
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
    usePKCE: true,
    // Skips Keycloak's own login form: the realm signs users in with Google.
    extraParams: { kc_idp_hint: 'google' },
    // Without it Keycloak's browser SSO cookie would sign the previous user straight back in.
    prompt: Prompt.Login,
  });
  const result = await request.promptAsync(oidcEndpoints(issuer));
  if (result.type === 'error') {
    throw new Error(result.error?.description ?? result.error?.message ?? 'Sign-in failed');
  }
  // cancel, dismiss, locked: the user backed out.
  if (result.type !== 'success' || !request.codeVerifier) return null;
  return { code: result.params.code, codeVerifier: request.codeVerifier, redirectUri };
}

export const authService = createAuthService({
  apiUrl: env.EXPO_PUBLIC_API_URL ?? 'http://localhost:11093/api/v1',
  issuer,
  clientId: KEYCLOAK_CLIENT_ID,
  storage: secureStorage,
  storageKey: REFRESH_TOKEN_KEY,
  prompt: promptLogin,
});

// A fresh access token for the API. null: no session (nothing stored, or Keycloak rejected the
// refresh token), so the user is signed out. A failure that proves nothing (network, 5xx) is a
// NetworkError and must not sign the user out.
export const fetchApiToken = authService.refreshAccessToken;
