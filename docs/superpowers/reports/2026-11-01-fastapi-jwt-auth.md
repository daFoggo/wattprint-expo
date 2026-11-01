# FastAPI JWT auth migration (report)

Date: 2026-11-01. Branch: `feat/fastapi-jwt-auth` (from `8734c8a`). Replaces the previous external auth service; backend contract is in `wattprint-fastapi` (`/auth/*`, `/users/me`).

## Status

Code, tests and docs are done; the previous external auth service is removed. Gates on 2026-11-01: `pnpm check` passed (eslint 0 warnings, tsc, jest 59 suites / 493 tests), `pnpm format:check` passed,
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
- Removed: the previous provider's client packages, the separate auth URL env var, `toAuthError`.

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

## Fixes after review (2026-11-01)

- `signOut` waits for an in-flight refresh and logs out with the newest token; a throwing `storage.remove` still lets the server logout
  run, then the error is rethrown. A refresh that finishes after a sign-in or sign-out is discarded (its spare token is logged out)
  and retried once with the stored token, so a caller that joined the old request gets a token for the current session.
- A refresh that throws (offline, 30 s timeout) no longer fires `onSessionExpired` (`http.ts`: only null or an `ApiError` 401 does) and
  no second refresh with the same stored token follows.
- `handleSessionExpired` refreshes through the token provider (the new token stays cached) and is not re-entrant.
- `signIn` and `signUp` hooks prime the provider (`primeAccessToken`, `prime` in `auth-token.ts`).
- `signIn` logs the new token out when `/users/me` fails and throws a plain `Error`, never a 401 `ApiError`.
- i18n key `auth.errors.inactiveUser` (en, vi) for the backend 400 "Inactive user".
- Tests use a fake server with single-use refresh tokens and family revocation (`src/lib/auth-service.test.ts`).
- Deferred (no code): refresh token lost if SecureStore fails after a successful rotation; cleanup of legacy SecureStore
  entries; `handleSessionExpired` swallowing keystore errors. The backend will add a short reuse grace window separately.

## Deferred

Phone verification: `docs/superpowers/backlog/2026-10-25-auth-session-store.md`.

## Next

Run the app against `wattprint-fastapi` (`docker compose up`), `adb reverse tcp:8000 tcp:8000`, `npx expo start --dev-client`.

## Final cleanup (2026-11-01, branch `chore/auth-final`)

- A rotated refresh token that storage refused to save is kept in memory (source of truth), written again on the next call, and the
  spent token is never replayed; sign-out uses it too (`src/lib/auth-service.ts`, tests with a single-use fake server).
- `handleSessionExpired`: offline keeps the session; any other unexpected error signs out locally (no server call).
- `removeLegacyAuthKeys` (`src/lib/legacy-auth-storage.ts`) deletes the old client's SecureStore keys (`wattprint_cookie`,
  `wattprint_session_data`, with their chunks) at bootstrap. Key names were read from the package copy in the pnpm store, because
  `pnpm remove` had already pruned `node_modules`; its plugin for the last login method was not configured, so no such key exists.
- Obsolete docs about the previous provider (plan, spec, report of 2026-10-30) were deleted; the old packages are gone from
  `package.json`, the lockfile and `node_modules`.
