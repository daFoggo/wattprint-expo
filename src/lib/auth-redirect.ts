// Keycloak redirects the system browser to `wattprint://auth?code=...`. expo-auth-session reads that
// URL itself; the router must not treat it as a route (there is none), so send it to the app root.
// Needs a dev client or a release build: Expo Go's `exp://` URL is not a registered redirect.
export function redirectAuthReturn(path: string): string {
  return /^([a-z][a-z0-9+.-]*:\/\/)?\/?auth(\?|\/|$)/i.test(path) ? '/' : path;
}
