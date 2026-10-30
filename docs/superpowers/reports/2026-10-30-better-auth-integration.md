# Better Auth integration (report)

Date: 2026-10-30. Spec: `docs/superpowers/specs/2026-10-30-better-auth-integration-design.md`. Plan:
`docs/superpowers/plans/2026-10-30-better-auth-integration.md`. Branches: `feat/better-auth` (this repo),
`feat/better-auth-jwt` (`wattprint-fastapi`).

## What was built

- **Auth service (FastAPI repo, `auth/`)**: `jwt()` plugin (issuer `BETTER_AUTH_URL`, audience `API_AUDIENCE`, payload name, email,
  emailVerified), `better-auth` and `@better-auth/expo` pinned to 1.7.14, compose wiring, README.
- **FastAPI**: `get_current_user` verifies the Bearer JWT with `PyJWKClient` (EdDSA, `iss`, `aud`, `exp`, `sub`); 12 new tests.
- **App**: `src/lib/auth-client.ts` (`expoClient` + `jwtClient`, `fetchApiToken`), `src/lib/auth-token.ts` (in-memory JWT
  cache), `src/lib/session.ts` (`apiClient`, `signOutAndClear`, `handleSessionExpired`), `src/features/auth` (schemas, hooks,
  error mapping), `src/screens/auth` (sign-in, sign-up), routes `(auth)` and `(app)` with `Stack.Protected`, sign-out in settings,
  en and vi strings.

## Verified (real output)

- FastAPI: `uv run pytest` 14 passed; `uv run ruff check app tests` clean (pre-existing ruff errors remain in `alembic/env.py`).
- End to end with `docker compose up --build -d`: `GET /api/auth/jwks` returned an Ed25519 key; sign-up through
  `/api/auth/sign-up/email`, then `GET /api/auth/token` with the session token returned a JWT whose claims were `sub`, `name`,
  `email`, `emailVerified`, `iss=http://localhost:3000`, `aud=wattprint-api`; `GET /api/v1/me` with it returned 200 and the user,
  and without a token 401. The `jwks` table was created by the existing `npm run migrate` on start.
- App: `pnpm check` (eslint 0 warnings, tsc, jest 56 suites / 459 tests) and `pnpm format:check` pass.
- `npx expo-doctor`: 19/20; the failing check (11 packages out of date) also fails without these changes.

## Not verified

- **Nothing was run on the phone.** `adb devices` listed no device when this was attempted, so sign-up on the device, relaunch
  while signed in, offline launch, wrong-password message, sign-out and user switch, and the logcat check are still to do
  (see "Device verification" in `AGENTS.md`).
- Whether `authClient.useSession()` stops reporting `isPending` quickly when the app launches offline (the splash is held until
  it does) is unverified.
- `@better-auth/expo` 1.7.14 on Expo SDK 58 compiles and unit tests pass, but its runtime behaviour on a device is unverified.
- Cleartext `http://localhost` from the dev build through `adb reverse` is unverified.

## Docs changed

`docs/client-state.md`, `docs/data-fetching.md`, `docs/architecture.md`, `docs/design-system.md` (route paths), `README.md`,
`AGENTS.md`, and the `wattprint-base` skill. The FastAPI `README.md` was updated in its own repo.
