# FastAPI JWT auth migration (report)

Date: 2026-11-01. Branch: `feat/fastapi-jwt-auth` (from `feat/better-auth` at `8734c8a`). Supersedes the Better Auth part of
`docs/superpowers/reports/2026-10-30-better-auth-integration.md`; backend contract is in `wattprint-fastapi` (`/auth/*`, `/users/me`).

## Status

Code, tests and docs are done; Better Auth is removed. Gates on 2026-11-01: `pnpm check` passed (eslint 0 warnings, tsc, jest 59 suites / 493 tests), `pnpm format:check` passed,
`npx expo-doctor` 19/20: the failing check (4 packages one patch behind the SDK: expo, expo-dev-client, expo-router,
react-native-screens) concerns versions this change did not touch. Not verified on a device or emulator.

## What exists

- `src/lib/auth-service.ts` (+ test): pure, dependency-injected (`baseUrl`, async `storage`, `fetchFn`); `signUp`, `signIn`,
  `refreshAccessToken`, `signOut`, `hasStoredSession`. Refresh is single-flight, rotated token persisted before return, 401 removes
  the stored token and returns null, network error or 5xx throws `NetworkError` and keeps it, a sign-out during a refresh is not
  overwritten (epoch guard).
- `src/lib/auth-client.ts`: SecureStore storage, key `wattprint.refresh-token`, `authService`, `fetchApiToken`.
- `src/stores/auth-store.ts`: in-memory `unknown | signedIn | signedOut` plus user.
- `src/lib/session.ts`: `signOutAndClear`, `handleSessionExpired` (one refresh), `bootstrapAuth`; `src/hooks/use-session-gate.ts` reads the store.
- `src/features/auth`: hooks call the service and update the store; `auth-error.ts` keeps only `authErrorKey` (401 and 409 keys).
- Removed: `better-auth`, `@better-auth/expo`, `EXPO_PUBLIC_AUTH_URL`, `toAuthError`.

## Review outcome

No reviewer run is recorded for this change.

## Decisions and deviations

- `toAuthError` was deleted instead of adapted: the service throws `ApiError` or `NetworkError` itself (my call; `lib` cannot import a feature).
- The sign-in access token is not handed to `createTokenProvider`, so the first API call after sign-in does one extra refresh (rotation is
  safe; seeding the provider would change `auth-token.ts`, which was meant to stay unchanged).
- Sign-in removes a just-stored refresh token when `/users/me` fails, so there is no half session.
- `useSessionGate` clears the user scope only when a signed-in session ends or its user changes, not when a session begins (sign-out already cleared it).
- `handleSessionExpired` on a retried 401 refreshes once more and discards that access token; the rotated refresh token is persisted, so it is harmless.
- Offline start with a stored token is signed in without contacting the server, as before.

## Not verified

On a device or emulator: sign-up, sign-in, relaunch (stored session), token expiry after 15 min, sign-out, offline start, `adb reverse tcp:8000`
or LAN IP reachability, SecureStore on Android. No run against the live FastAPI stack was done from the app.

## Deferred

Phone verification: `docs/superpowers/backlog/2026-10-25-auth-session-store.md`.

## Next

Run the app against `wattprint-fastapi` (`docker compose up`), `adb reverse tcp:8000 tcp:8000`, `npx expo start --dev-client`.
