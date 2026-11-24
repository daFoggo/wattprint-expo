# Spec (lane M): a URL scheme per build, the public realm by default

Record: wattprint-web docs/debt.md, 2026-11-22 public domains mobile R1.

- Goal: with dev, preview and production installed, Keycloak's redirect opens the build that asked; a dev build
  without `.env` signs in against the real issuer.
- Requirements:
  1. `scripts/app-identity.js` `urlScheme(env)`: development `wattprint-dev`, preview `wattprint-preview`, production
     `wattprint`; `app.config.ts` sets `scheme` from it.
  2. `auth-client.ts` builds the redirect from the running build's scheme (`Constants.expoConfig.scheme`):
     `<scheme>://auth`.
  3. Realm client `wattprint-mobile` allows `wattprint://auth`, `wattprint-dev://auth`, `wattprint-preview://auth`
     (redirect and post-logout), in `wattprint-backend/keycloak/realm` and on the running Keycloak.
  4. `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_KEYCLOAK_URL` default to the public API and realm when unset or empty (the
     backend's Keycloak issues tokens for its public issuer only); the localhost fallbacks and the production-only
     throw go.
- Areas of concern: Expo Go (`exp://`) still cannot sign in (unchanged, documented). `Constants.expoConfig.scheme` may
  be an array in Expo's type; app.config sets a string.
