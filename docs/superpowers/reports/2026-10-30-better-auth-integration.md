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
- App: `pnpm check` (eslint 0 warnings, tsc, jest 57 suites / 470 tests) and `pnpm format:check` pass.
- `npx expo-doctor`: 19/20; the failing check (11 packages out of date) also fails without these changes.

## Review fixes (Opus whole-branch review)

Fixed with a failing test first: the already-used email code (`USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`, checked against the
running service); the navigator no longer unmounts on a session refetch and the splash no longer waits on a slow auth host
(`useSessionGate`, 3 s cap); a `/token` 401 now signs out; the previous user's JWT and queries are cleared before the remote
sign-out and whenever the user id changes. Deferred minors: offline sign-in shows the raw English fetch error, a sign-out
failure is not shown, the FastAPI key cache has no TTL, and `API_AUDIENCE` has no default outside compose. Accepted: a network
failure while refreshing the JWT surfaces as a non-retried 401 (the user stays signed in).

## Emulator verification (2026-10-30, `Medium_Phone_API_37.0`, user chose it instead of the phone)

Dev build `com.dafoggo.wattprint.dev` already installed, Metro `--dev-client`, `adb reverse` for 8081, 3000 and 8000, docker
stack running. Observed:

- Cold start signed out: first showed "Page not found" (a signed-out `/` matched only the guarded tab). Fixed by
  `src/app/(auth)/index.tsx` redirecting to sign-in; relaunch then showed the sign-in screen.
- Sign-up with name, email and password: landed on the Home tab; the user exists in `auth."user"`.
- `adb shell am force-stop` and relaunch: still signed in. Same with the auth container stopped (connection refused): tabs
  shown, no sign-in flash.
- A temporary `apiClient.request('/me')` call on Home (removed, not committed) returned the signed-in user, and the FastAPI log
  showed `GET /api/v1/me 200`.
- Settings, Sign out: back on the sign-in screen. Wrong password: "Wrong email or password". Correct password: Home again.
- `logcat ReactNativeJS` had no `E` lines.

## Not verified

- **Not run on the physical phone** (not connected). The emulator is x86; behaviour on the Pixel 8a (ARM) is unchecked.
- Already-used email and offline sign-in on the device (the duplicate code was checked against the service with `curl`, the
  messages are unit-tested).
- A launch where the auth host accepts the connection but never answers (the splash cap is 3 s, unit-tested only).
- Cleartext `http://localhost` worked on the emulator through `adb reverse`; the phone is unchecked.
